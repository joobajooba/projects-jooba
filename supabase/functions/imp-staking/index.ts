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
  "id,wallet_address,canvas_id,duration_id,duration_days,imp_contract,imp_token_id,imp_body,imp_tier,imp_image,keeps,aligned_count,keep_count,estimated_payout,modifiers,canvas_image,status,started_at,unlocks_at,ended_at,created_at";
const BASE_IMPCOIN_PER_DAY = 10;
const KEEP_PAIR_BONUS = 0.18;
const KEEP_ALIGNMENT_BONUS = 0.32;
const TIER_BONUS: Record<string, number> = { "Tier 1": 1, "Tier 2": 1.12, "Tier 3": 1.28 };
const DURATIONS: Record<string, { days: number; multiplier: number }> = {
  "7d": { days: 7, multiplier: 1 },
  "14d": { days: 14, multiplier: 1.12 },
  "30d": { days: 30, multiplier: 1.28 },
  "90d": { days: 90, multiplier: 1.5 },
  "180d": { days: 180, multiplier: 1.8 },
  "365d": { days: 365, multiplier: 2.25 },
};
const CANVASES: Record<string, { keepCount: number; multiplier: number; keepSlots: string[] }> = {
  pair: { keepCount: 1, multiplier: 1, keepSlots: ["right"] },
  cross: { keepCount: 4, multiplier: 1.12, keepSlots: ["north", "east", "south", "west"] },
  nine: { keepCount: 8, multiplier: 1.25, keepSlots: ["nw", "north", "ne", "west", "east", "sw", "south", "se"] },
};
const ALIGNMENTS: Record<string, string[]> = {
  Red: ["underworld", "volcano", "desert"],
  Green: ["plains", "mossy", "forgotten_ruins"],
  Khaki: ["mossy", "mushroom", "forgotten_ruins"],
  Blue: ["clouds", "icy", "storm", "limestone"],
  Cyan: ["clouds", "storm", "icy"],
  Purple: ["shortcake", "dreamcore", "void", "lunar"],
  Pink: ["shortcake", "dreamcore", "lunar"],
  Silver: ["castle", "the_vault", "void"],
  Gold: ["desert", "castle", "the_vault"],
  Diamond: ["void", "lunar", "dreamcore"],
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

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

function canonicalStakeMessage(payload: Record<string, unknown>) {
  return `IMPLINGz ImpCoin Stake\n${JSON.stringify(payload)}`;
}

function isAligned(body: string, tileset: string) {
  return (ALIGNMENTS[body] ?? []).includes(String(tileset || "").toLowerCase());
}

function estimatePayout(body: string, tier: string, canvasId: string, durationId: string, keeps: KeepInput[]) {
  const canvas = CANVASES[canvasId];
  const duration = DURATIONS[durationId];
  const alignedCount = keeps.filter((keep) => isAligned(body, String(keep.tileset || ""))).length;
  const keepMultiplier = 1 + KEEP_PAIR_BONUS * keeps.length + KEEP_ALIGNMENT_BONUS * alignedCount;
  const payout = Math.round(
    BASE_IMPCOIN_PER_DAY *
      duration.days *
      duration.multiplier *
      canvas.multiplier *
      keepMultiplier *
      (TIER_BONUS[tier] || 1),
  );
  return {
    alignedCount,
    keepCount: keeps.length,
    payout,
    modifiers: {
      durationMultiplier: duration.multiplier,
      canvasMultiplier: canvas.multiplier,
      keepMultiplier,
      tierMultiplier: TIER_BONUS[tier] || 1,
    },
  };
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
      return json({
        balance: Number(balance?.balance ?? 0),
        lifetimeEarned: Number(balance?.lifetime_earned ?? 0),
        stakes: stakes ?? [],
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
      const durationId = String(body.durationId ?? "");
      const canvas = CANVASES[canvasId];
      const duration = DURATIONS[durationId];
      const impTokenId = String(body.impTokenId ?? "");
      const keeps = Array.isArray(body.keeps) ? (body.keeps as KeepInput[]) : [];
      if (!canvas || !duration) return json({ error: "Choose a canvas and lock length." }, 400);
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
          durationId,
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
          tileset: String(keep.tileset || "").toLowerCase().slice(0, 48),
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
      const estimate = estimatePayout(bodyColor, tier, canvasId, durationId, normalizedKeeps);
      const startedAt = new Date();
      const unlocksAt = new Date(startedAt.getTime() + duration.days * 24 * 60 * 60 * 1000);
      const canvasImage = String(body.canvasImage || "");
      const storedImage = canvasImage.startsWith("data:image/") && canvasImage.length <= 350000 ? canvasImage : "";

      const { data: stake, error: insertError } = await supabase
        .from("imp_stakes")
        .insert({
          wallet_address: walletAddress,
          canvas_id: canvasId,
          duration_id: durationId,
          duration_days: duration.days,
          imp_contract: IMPLINGZ_ADDRESS.toLowerCase(),
          imp_token_id: impTokenId,
          imp_body: bodyColor,
          imp_tier: tier,
          imp_image: String(body.impImage || "").slice(0, 500),
          keeps: normalizedKeeps,
          aligned_count: estimate.alignedCount,
          keep_count: estimate.keepCount,
          estimated_payout: estimate.payout,
          modifiers: estimate.modifiers,
          canvas_image: storedImage || null,
          stake_signature: signature,
          status: "active",
          started_at: startedAt.toISOString(),
          unlocks_at: unlocksAt.toISOString(),
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

      return json({ stake });
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

      const unlocked = new Date(stake.unlocks_at).getTime() <= Date.now();
      if (action === "claim" && !unlocked) {
        return json({ error: "This lock has not finished yet." }, 400);
      }
      if (action === "unstake" && unlocked) {
        return json({ error: "This lock is finished. Claim the ImpCoin instead of forfeiting it." }, 400);
      }

      const nextStatus = action === "claim" ? "claimed" : "forfeited";
      const { data: updated, error: updateError } = await supabase
        .from("imp_stakes")
        .update({ status: nextStatus, ended_at: new Date().toISOString() })
        .eq("id", stakeId)
        .eq("status", "active")
        .select(STAKE_COLUMNS)
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated) return json({ error: "This stake is no longer active." }, 400);

      await supabase.from("imp_staked_tokens").delete().eq("stake_id", stakeId);

      if (action === "claim") {
        const payout = Number(updated.estimated_payout ?? 0);
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
        return json({ stake: updated, balance: nextBalance, lifetimeEarned: nextLifetime, payout });
      }

      return json({ stake: updated, forfeited: updated.estimated_payout });
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
