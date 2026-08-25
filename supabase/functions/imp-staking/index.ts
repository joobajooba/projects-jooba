import { createClient } from "npm:@supabase/supabase-js@2";
import { createPublicClient, defineChain, http, verifyMessage } from "npm:viem";
import { impBody, impTier } from "./impTraits.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const SIGNATURE_PATTERN = /^0x[a-fA-F0-9]{130}$/;
const NONCE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMPLINGZ_ADDRESS = "0x81D2D1f0e92285CdD22Aa3cbc6956B6E1724d029";
const KEEP_V1_ADDRESS = "0x639061b01ab4261b4283a0AC9D3bB8B99013Bad4";
const KEEP_V2_ADDRESS = "0x51eA8743109F1b9C70C9d1a9A56cCaA5C2877ee9";
const ALLOWED_KEEP_CONTRACTS = new Set([
  KEEP_V1_ADDRESS.toLowerCase(),
  KEEP_V2_ADDRESS.toLowerCase(),
]);
const ROBINHOOD_RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
const ROBINHOOD_CHAIN = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [ROBINHOOD_RPC_URL] } },
});
const ERC721_OWNER_ABI = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
] as const;
const STAKE_COLUMNS =
  "id,wallet_address,canvas_id,duration_id,duration_days,imp_contract,imp_token_id,imp_body,imp_tier,imp_image,keeps,aligned_count,keep_count,estimated_payout,modifiers,canvas_image,status,started_at,unlocks_at,ended_at,created_at,daily_rate,last_accrued_at,has_robins_lair";
const BASE_IMPCOIN_PER_DAY = 5;
const ALIGNMENT_BONUS_PER_KEEP = 2;
const ROBINS_LAIR_MULTIPLIER = 1.5;
const ROBINS_LAIR_TILESET = "robins_lair";
const VOID_MULTIPLIER = 1.25;
const VOID_TILESET = "void";
const ALIGN_ALL_BODIES = new Set(["Gold", "Diamond"]);
const CANVASES: Record<string, { keepCount: number; keepSlots: string[] }> = {
  pair: { keepCount: 1, keepSlots: ["right"] },
  cross: { keepCount: 4, keepSlots: ["north", "east", "south", "west"] },
  nine: { keepCount: 8, keepSlots: ["nw", "north", "ne", "west", "east", "sw", "south", "se"] },
};
const ALIGNMENTS: Record<string, string[]> = {
  Red: ["underworld", "volcano", "the_vault"],
  Green: ["plains", "forgotten_ruins", "mushroom"],
  Khaki: ["desert", "limestone", "plains"],
  Blue: ["icy", "clouds", "storm"],
  Cyan: ["mossy", "storm", "icy"],
  Purple: ["dreamcore", "shortcake", "mushroom"],
  Pink: ["mushroom", "shortcake", "underworld"],
  Silver: ["lunar", "castle", "limestone"],
};

type KeepInput = {
  id?: string;
  contract?: string;
  slot?: string;
  image?: string;
  tileset?: string;
  biome?: string;
  name?: string;
};

type StakeRow = Record<string, unknown> & {
  id: string;
  wallet_address: string;
  status: string;
  imp_contract: string;
  imp_token_id: string;
  keeps: KeepInput[] | null;
  daily_rate?: number | string;
  last_accrued_at?: string;
  started_at?: string;
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

function canonicalStakeMessage(payload: Record<string, unknown>) {
  return `IMPLINGz ImpCoin Stake\n${JSON.stringify(payload)}`;
}

function tilesetSlug(tileset: string) {
  return String(tileset || "").toLowerCase();
}

function isRobinsLair(tileset: string) {
  return tilesetSlug(tileset) === ROBINS_LAIR_TILESET;
}

function isVoidKeep(tileset: string) {
  return tilesetSlug(tileset) === VOID_TILESET;
}

function isAligned(body: string, tileset: string) {
  const slug = tilesetSlug(tileset);
  if (!slug) return false;
  if (ALIGN_ALL_BODIES.has(body)) return true;
  return (ALIGNMENTS[body] ?? []).includes(slug);
}

function dailyRateFor(alignedCount: number, hasRobinsLair: boolean, hasVoid: boolean) {
  const raw =
    (BASE_IMPCOIN_PER_DAY + ALIGNMENT_BONUS_PER_KEEP * alignedCount) *
    (hasRobinsLair ? ROBINS_LAIR_MULTIPLIER : 1) *
    (hasVoid ? VOID_MULTIPLIER : 1);
  return Math.round(raw * 10000) / 10000;
}

function pendingFromStake(stake: StakeRow, now = Date.now()) {
  if (stake.status !== "active") return 0;
  const last = new Date(String(stake.last_accrued_at || stake.started_at || "")).getTime();
  const rate = Number(stake.daily_rate ?? 0);
  if (!Number.isFinite(last) || !Number.isFinite(rate) || rate <= 0) return 0;
  return Math.max(0, Math.floor((rate * (now - last)) / 86_400_000));
}

function estimateStake(body: string, keeps: KeepInput[]) {
  const alignedCount = keeps.filter((keep) => isAligned(body, String(keep.tileset || ""))).length;
  const hasRobinsLair = keeps.some((keep) => isRobinsLair(String(keep.tileset || "")));
  const hasVoid = keeps.some((keep) => isVoidKeep(String(keep.tileset || "")));
  const dailyRate = dailyRateFor(alignedCount, hasRobinsLair, hasVoid);
  return {
    alignedCount,
    keepCount: keeps.length,
    hasRobinsLair,
    hasVoid,
    dailyRate,
    modifiers: {
      base: BASE_IMPCOIN_PER_DAY,
      alignmentBonusPerKeep: ALIGNMENT_BONUS_PER_KEEP,
      alignedCount,
      robinsLairMultiplier: hasRobinsLair ? ROBINS_LAIR_MULTIPLIER : 1,
      voidMultiplier: hasVoid ? VOID_MULTIPLIER : 1,
      dailyRate,
    },
  };
}

function withPending(stake: StakeRow, now = Date.now()) {
  const pending = pendingFromStake(stake, now);
  const hasVoid = (stake.keeps ?? []).some((keep) => isVoidKeep(String(keep.tileset || "")));
  return { ...stake, pending, estimated_payout: pending, has_void: hasVoid };
}

async function ownerOf(contract: string, tokenId: string) {
  const client = createPublicClient({
    chain: ROBINHOOD_CHAIN,
    transport: http(ROBINHOOD_RPC_URL),
  });
  return String(
    await client.readContract({
      address: contract as `0x${string}`,
      abi: ERC721_OWNER_ABI,
      functionName: "ownerOf",
      args: [BigInt(tokenId)],
    }),
  ).toLowerCase();
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const secretKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!secretKey || !supabaseUrl) {
    return json({ error: "Staking service is not configured." }, 500);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function consumeChallenge(walletAddress: string, nonce: string, signature: string, message: string) {
    if (!NONCE_PATTERN.test(nonce) || !SIGNATURE_PATTERN.test(signature)) {
      throw Object.assign(new Error("Invalid stake signature request."), { status: 400 });
    }
    const { data: challenge, error: challengeError } = await supabase
      .from("imp_stake_challenges")
      .select("nonce,expires_at")
      .eq("wallet_address", walletAddress)
      .eq("nonce", nonce)
      .maybeSingle();
    if (challengeError) throw challengeError;
    if (!challenge || new Date(challenge.expires_at).getTime() <= Date.now()) {
      throw Object.assign(new Error("The signing request expired. Try again."), { status: 401 });
    }
    const signatureValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    if (!signatureValid) {
      throw Object.assign(new Error("Wallet signature verification failed."), { status: 401 });
    }
    await supabase.from("imp_stake_challenges").delete().eq("wallet_address", walletAddress);
  }

  async function creditImpCoin(walletAddress: string, payout: number) {
    if (payout <= 0) {
      const { data: current } = await supabase
        .from("imp_coin_balances")
        .select("balance,lifetime_earned")
        .eq("wallet_address", walletAddress)
        .maybeSingle();
      return {
        balance: Number(current?.balance ?? 0),
        lifetimeEarned: Number(current?.lifetime_earned ?? 0),
      };
    }
    const { data: current } = await supabase
      .from("imp_coin_balances")
      .select("balance,lifetime_earned")
      .eq("wallet_address", walletAddress)
      .maybeSingle();
    const nextBalance = Number(current?.balance ?? 0) + payout;
    const nextLifetime = Number(current?.lifetime_earned ?? 0) + payout;
    const { error: balanceError } = await supabase.from("imp_coin_balances").upsert(
      {
        wallet_address: walletAddress,
        balance: nextBalance,
        lifetime_earned: nextLifetime,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "wallet_address" },
    );
    if (balanceError) throw balanceError;
    return { balance: nextBalance, lifetimeEarned: nextLifetime };
  }

  async function stillOwned(walletAddress: string, stake: StakeRow) {
    try {
      const impOwner = await ownerOf(stake.imp_contract, stake.imp_token_id);
      if (impOwner !== walletAddress) return false;
      for (const keep of stake.keeps ?? []) {
        const keepOwner = await ownerOf(String(keep.contract), String(keep.id));
        if (keepOwner !== walletAddress) return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  async function slashStake(stake: StakeRow) {
    await supabase
      .from("imp_stakes")
      .update({ status: "slashed", ended_at: new Date().toISOString() })
      .eq("id", stake.id)
      .eq("status", "active");
    await supabase.from("imp_staked_tokens").delete().eq("stake_id", stake.id);
  }

  try {
    if (request.method === "GET") {
      const wallet = new URL(request.url).searchParams.get("wallet")?.toLowerCase() || "";
      if (!ADDRESS_PATTERN.test(wallet)) return json({ error: "A valid wallet address is required." }, 400);
      const [{ data: balance }, { data: stakes, error: stakeError }] = await Promise.all([
        supabase.from("imp_coin_balances").select("balance,lifetime_earned").eq("wallet_address", wallet).maybeSingle(),
        supabase
          .from("imp_stakes")
          .select(STAKE_COLUMNS)
          .eq("wallet_address", wallet)
          .order("started_at", { ascending: false }),
      ]);
      if (stakeError) throw stakeError;
      const now = Date.now();
      const decorated: ReturnType<typeof withPending>[] = [];
      for (const row of (stakes ?? []) as StakeRow[]) {
        if (row.status === "active" && !(await stillOwned(wallet, row))) {
          await slashStake(row);
          decorated.push(withPending({ ...row, status: "slashed" }, now));
          continue;
        }
        decorated.push(withPending(row, now));
      }
      return json({
        balance: Number(balance?.balance ?? 0),
        lifetimeEarned: Number(balance?.lifetime_earned ?? 0),
        stakes: decorated,
      });
    }

    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

    const body = await request.json();
    const action = String(body.action ?? "");
    const walletAddress = String(body.walletAddress ?? "").toLowerCase();
    if (!ADDRESS_PATTERN.test(walletAddress)) return json({ error: "Invalid wallet address." }, 400);

    if (action === "challenge") {
      const nonce = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const { error } = await supabase.from("imp_stake_challenges").upsert(
        { wallet_address: walletAddress, nonce, expires_at: expiresAt },
        { onConflict: "wallet_address" },
      );
      if (error) throw error;
      return json({ nonce, expiresAt });
    }

    const nonce = String(body.nonce ?? "");
    const signature = String(body.signature ?? "");

    if (action === "stake") {
      const canvasId = String(body.canvasId ?? "");
      const canvas = CANVASES[canvasId];
      const impTokenId = String(body.impTokenId ?? "");
      const keeps = Array.isArray(body.keeps) ? (body.keeps as KeepInput[]) : [];
      if (!canvas) return json({ error: "Choose a canvas." }, 400);
      if (!/^\d+$/.test(impTokenId)) return json({ error: "Choose an Imp to stake." }, 400);
      if (keeps.length !== canvas.keepCount) {
        return json({ error: `This canvas needs ${canvas.keepCount} Keep${canvas.keepCount === 1 ? "" : "s"}.` }, 400);
      }

      const keepKeys = keeps.map((keep) => `${String(keep.contract || "").toLowerCase()}:${String(keep.id)}`);
      await consumeChallenge(
        walletAddress,
        nonce,
        signature,
        canonicalStakeMessage({
          walletAddress,
          action: "stake",
          canvasId,
          impTokenId,
          keepKeys,
          nonce,
        }),
      );

      const slots = new Set<string>();
      const seenKeeps = new Set<string>();
      const normalizedKeeps: KeepInput[] = [];
      for (const keep of keeps) {
        const slot = String(keep.slot || "");
        const contract = String(keep.contract || "").toLowerCase();
        const tokenId = String(keep.id || "");
        if (!canvas.keepSlots.includes(slot) || slots.has(slot)) {
          return json({ error: "Keep slots on this canvas are invalid." }, 400);
        }
        if (!ALLOWED_KEEP_CONTRACTS.has(contract) || !/^\d+$/.test(tokenId)) {
          return json({ error: "One of the selected Keeps is not from IMPLINGz Keeps." }, 400);
        }
        const key = `${contract}:${tokenId}`;
        if (seenKeeps.has(key)) return json({ error: "The same Keep cannot fill two slots." }, 400);
        slots.add(slot);
        seenKeeps.add(key);
        normalizedKeeps.push({
          id: tokenId,
          contract,
          slot,
          image: String(keep.image || "").slice(0, 500),
          tileset: tilesetSlug(String(keep.tileset || "")).slice(0, 48),
          biome: String(keep.biome || "").slice(0, 48),
          name: String(keep.name || `Keep #${tokenId}`).slice(0, 64),
        });
      }

      const impOwner = await ownerOf(IMPLINGZ_ADDRESS, impTokenId);
      if (impOwner !== walletAddress) {
        return json({ error: "This wallet does not hold the selected Imp." }, 403);
      }
      for (const keep of normalizedKeeps) {
        const keepOwner = await ownerOf(String(keep.contract), String(keep.id));
        if (keepOwner !== walletAddress) {
          return json({ error: `This wallet does not hold ${keep.name}.` }, 403);
        }
      }

      const bodyColor = impBody(impTokenId);
      const tier = impTier(impTokenId);
      const estimate = estimateStake(bodyColor, normalizedKeeps);
      const startedAt = new Date();
      const canvasImage = String(body.canvasImage || "");
      const storedImage = canvasImage.startsWith("data:image/") && canvasImage.length <= 350000 ? canvasImage : "";

      const { data: stake, error: insertError } = await supabase
        .from("imp_stakes")
        .insert({
          wallet_address: walletAddress,
          canvas_id: canvasId,
          duration_id: "open",
          duration_days: 1,
          imp_contract: IMPLINGZ_ADDRESS.toLowerCase(),
          imp_token_id: impTokenId,
          imp_body: bodyColor,
          imp_tier: tier,
          imp_image: String(body.impImage || "").slice(0, 500),
          keeps: normalizedKeeps,
          aligned_count: estimate.alignedCount,
          keep_count: estimate.keepCount,
          estimated_payout: 0,
          modifiers: estimate.modifiers,
          canvas_image: storedImage || null,
          stake_signature: signature,
          status: "active",
          started_at: startedAt.toISOString(),
          unlocks_at: startedAt.toISOString(),
          daily_rate: estimate.dailyRate,
          last_accrued_at: startedAt.toISOString(),
          has_robins_lair: estimate.hasRobinsLair,
        })
        .select(STAKE_COLUMNS)
        .single();
      if (insertError) throw insertError;

      const tokenRows = [
        {
          contract: IMPLINGZ_ADDRESS.toLowerCase(),
          token_id: impTokenId,
          stake_id: stake.id,
          kind: "imp",
        },
        ...normalizedKeeps.map((keep) => ({
          contract: String(keep.contract),
          token_id: String(keep.id),
          stake_id: stake.id,
          kind: "keep",
        })),
      ];
      const { error: lockError } = await supabase.from("imp_staked_tokens").insert(tokenRows);
      if (lockError) {
        await supabase.from("imp_stakes").delete().eq("id", stake.id);
        if (String(lockError.message || "").includes("duplicate") || lockError.code === "23505") {
          return json({ error: "One of these NFTs is already staked." }, 409);
        }
        throw lockError;
      }

      return json({ stake: withPending(stake as StakeRow) });
    }

    if (action === "unstake" || action === "claim") {
      const stakeId = String(body.stakeId ?? "");
      if (!stakeId) return json({ error: "A stake id is required." }, 400);
      await consumeChallenge(
        walletAddress,
        nonce,
        signature,
        canonicalStakeMessage({
          walletAddress,
          action,
          stakeId,
          nonce,
        }),
      );

      const { data: stake, error: stakeError } = await supabase
        .from("imp_stakes")
        .select(STAKE_COLUMNS)
        .eq("id", stakeId)
        .eq("wallet_address", walletAddress)
        .maybeSingle();
      if (stakeError) throw stakeError;
      if (!stake || stake.status !== "active") {
        return json({ error: "This stake is no longer active." }, 400);
      }

      const owned = await stillOwned(walletAddress, stake as StakeRow);
      if (!owned) {
        await slashStake(stake as StakeRow);
        return json({
          error: "An NFT left this wallet. Pending ImpCoin from that stake was burned.",
        }, 409);
      }

      const now = new Date();
      const payout = pendingFromStake(stake as StakeRow, now.getTime());
      const credited = await creditImpCoin(walletAddress, payout);

      if (action === "claim") {
        const { data: updated, error: updateError } = await supabase
          .from("imp_stakes")
          .update({ last_accrued_at: now.toISOString(), estimated_payout: 0 })
          .eq("id", stakeId)
          .eq("status", "active")
          .select(STAKE_COLUMNS)
          .maybeSingle();
        if (updateError) throw updateError;
        if (!updated) return json({ error: "This stake is no longer active." }, 400);
        return json({
          stake: withPending(updated as StakeRow, now.getTime()),
          payout,
          ...credited,
        });
      }

      const { data: updated, error: updateError } = await supabase
        .from("imp_stakes")
        .update({ status: "unstaked", ended_at: now.toISOString(), estimated_payout: payout })
        .eq("id", stakeId)
        .eq("status", "active")
        .select(STAKE_COLUMNS)
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated) return json({ error: "This stake is no longer active." }, 400);
      await supabase.from("imp_staked_tokens").delete().eq("stake_id", stakeId);
      return json({
        stake: withPending(updated as StakeRow, now.getTime()),
        payout,
        ...credited,
      });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 0);
    if (status >= 400 && status < 500) {
      return json({ error: (error as Error).message }, status);
    }
    console.error("imp-staking error", error);
    return json({ error: "The staking service is temporarily unavailable." }, 500);
  }
});
