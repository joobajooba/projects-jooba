import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyMessage } from "npm:viem";
import { privateKeyToAccount } from "npm:viem/accounts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const SIGNATURE_PATTERN = /^0x[a-fA-F0-9]{130}$/;
const NONCE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION_COLUMNS =
  "id,wallet_address,party_token_ids,status,hashes_checked,winning_nonce,winning_hash,dungeon_seed,mint_deadline,minted_token_id,xp_awarded,started_at,ended_at,updated_at";
const HASH_PREFIX = "0000";
const MINE_PAYLOAD_PREFIX = "implingz-dungeon";
const XP_PROMPT_SUCCESS = 25;
const XP_PROMPT_FAIL = 8;
const XP_DUNGEON_FOUND = 100;
const XP_DUNGEON_MINTED = 200;
const XP_DUNGEON_DISCARDED = 40;
const DERP_DRIP_CHANCE = 0.04;
const LEVELS = [
  { level: 1, xp: 0, slots: 1 },
  { level: 2, xp: 500, slots: 2 },
  { level: 3, xp: 1500, slots: 3 },
  { level: 4, xp: 4000, slots: 4 },
  { level: 5, xp: 8000, slots: 5 },
];
const ENCOUNTERS = [
  { options: [{ key: "A", dc: 10 }, { key: "B", dc: 8 }] },
  { options: [{ key: "A", dc: 13 }, { key: "B", dc: 9 }] },
  { options: [{ key: "A", dc: 11 }, { key: "B", dc: 14 }] },
  { options: [{ key: "A", dc: 12 }, { key: "B", dc: 13 }] },
  { options: [{ key: "A", dc: 7 }, { key: "B", dc: 10 }] },
];

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

function progressFromXp(xp = 0) {
  const safeXp = Math.max(0, Number(xp) || 0);
  let current = LEVELS[0];
  for (const row of LEVELS) {
    if (safeXp >= row.xp) current = row;
  }
  const next = LEVELS.find((row) => row.level === current.level + 1) ?? null;
  return {
    xp: safeXp,
    level: current.level,
    slots: current.slots,
    nextLevelXp: next?.xp ?? null,
  };
}

function decorateAccount(account: Record<string, unknown> | null, walletAddress = "") {
  const progress = progressFromXp(Number(account?.xp ?? 0));
  return {
    wallet_address: account?.wallet_address ?? walletAddress,
    xp: progress.xp,
    level: progress.level,
    active_adventures: Number(account?.active_adventures ?? 0),
    slots: progress.slots,
    nextLevelXp: progress.nextLevelXp,
    created_at: account?.created_at ?? null,
    updated_at: account?.updated_at ?? null,
  };
}

function startMessage(payload: { walletAddress: string; partyTokenIds: string[]; nonce: string }) {
  return `IMPLINGz Adventure Start\n${JSON.stringify(payload)}`;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function rollD20() {
  const bytes = new Uint8Array(1);
  crypto.getRandomValues(bytes);
  return (bytes[0] % 20) + 1;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const secretKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!secretKey || !supabaseUrl) return json({ error: "Adventure service is not configured." }, 500);

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function ensureAccount(walletAddress: string) {
    const { data, error } = await supabase
      .from("adventurer_accounts")
      .select("*")
      .eq("wallet_address", walletAddress)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;

    const { data: created, error: createError } = await supabase
      .from("adventurer_accounts")
      .insert({ wallet_address: walletAddress })
      .select("*")
      .single();
    if (createError) throw createError;
    return created;
  }

  async function persistProgress(walletAddress: string, xpDelta: number, activeDelta = 0) {
    const account = await ensureAccount(walletAddress);
    const nextXp = Math.max(0, Number(account.xp ?? 0) + xpDelta);
    const progress = progressFromXp(nextXp);
    const nextActive = Math.max(0, Number(account.active_adventures ?? 0) + activeDelta);
    const { data, error } = await supabase
      .from("adventurer_accounts")
      .update({
        xp: nextXp,
        level: progress.level,
        active_adventures: nextActive,
        updated_at: new Date().toISOString(),
      })
      .eq("wallet_address", walletAddress)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async function loadSession(sessionId: string, secret: string) {
    const { data, error } = await supabase
      .from("adventure_sessions")
      .select(`${SESSION_COLUMNS},secret_hash`)
      .eq("id", sessionId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const secretHash = await sha256Hex(secret);
    if (secretHash !== data.secret_hash) return null;
    const { secret_hash: _secretHash, ...session } = data;
    return session;
  }

  async function maybeDrip(walletAddress: string, sessionId: string) {
    if (Math.random() >= DERP_DRIP_CHANCE) return null;
    const amount = 5 + Math.floor(Math.random() * 6);
    const { data, error } = await supabase
      .from("derp_drips")
      .insert({
        wallet_address: walletAddress,
        session_id: sessionId,
        amount,
        status: Deno.env.get("DERP_REWARDS_ADDRESS") ? "pending" : "skipped_empty_pot",
      })
      .select("id,amount,status")
      .single();
    if (error) throw error;
    return data;
  }

  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      if (url.searchParams.get("board") === "1") {
        const { data, error } = await supabase
          .from("adventure_sessions")
          .select("id,wallet_address,status,winning_hash,dungeon_seed,party_token_ids,xp_awarded,started_at,ended_at,updated_at")
          .order("updated_at", { ascending: false })
          .limit(20);
        if (error) throw error;
        return json({ events: data ?? [] });
      }

      const wallet = url.searchParams.get("wallet")?.toLowerCase() ?? "";
      if (wallet && !ADDRESS_PATTERN.test(wallet)) return json({ error: "Invalid wallet address." }, 400);

      if (!wallet) {
        const { data, error } = await supabase
          .from("adventurer_accounts")
          .select("*")
          .order("xp", { ascending: false })
          .limit(100);
        if (error) throw error;
        return json({ accounts: (data ?? []).map((row) => decorateAccount(row, row.wallet_address)) });
      }

      const account = decorateAccount(await ensureAccount(wallet), wallet);
      const { data: sessions, error } = await supabase
        .from("adventure_sessions")
        .select(SESSION_COLUMNS)
        .eq("wallet_address", wallet)
        .in("status", ["running", "found"])
        .order("started_at", { ascending: false });
      if (error) throw error;
      return json({ account, sessions: sessions ?? [] });
    }

    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

    const body = await request.json();
    const action = String(body.action ?? "");

    if (action === "challenge") {
      const walletAddress = String(body.walletAddress ?? "").toLowerCase();
      if (!ADDRESS_PATTERN.test(walletAddress)) return json({ error: "Invalid wallet address." }, 400);
      await ensureAccount(walletAddress);
      const nonce = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const { error } = await supabase.from("adventure_challenges").upsert(
        { wallet_address: walletAddress, nonce, expires_at: expiresAt },
        { onConflict: "wallet_address" },
      );
      if (error) throw error;
      return json({ nonce, expiresAt });
    }

    if (action === "start") {
      const walletAddress = String(body.walletAddress ?? "").toLowerCase();
      const partyTokenIds = Array.isArray(body.partyTokenIds)
        ? [...new Set(body.partyTokenIds.map((id: unknown) => String(id)))].slice(0, 3)
        : [];
      const nonce = String(body.nonce ?? "");
      const signature = String(body.signature ?? "");

      if (!ADDRESS_PATTERN.test(walletAddress)) return json({ error: "Invalid wallet address." }, 400);
      if (partyTokenIds.length === 0) return json({ error: "Select at least one IMPLINGZ." }, 400);
      if (!NONCE_PATTERN.test(nonce) || !SIGNATURE_PATTERN.test(signature)) {
        return json({ error: "Invalid adventure signature request." }, 400);
      }

      const { data: challenge, error: challengeError } = await supabase
        .from("adventure_challenges")
        .select("nonce,expires_at")
        .eq("wallet_address", walletAddress)
        .eq("nonce", nonce)
        .maybeSingle();
      if (challengeError) throw challengeError;
      if (!challenge || new Date(challenge.expires_at).getTime() <= Date.now()) {
        return json({ error: "The signing request expired. Start the adventure again." }, 401);
      }

      const signatureValid = await verifyMessage({
        address: walletAddress as `0x${string}`,
        message: startMessage({ walletAddress, partyTokenIds, nonce }),
        signature: signature as `0x${string}`,
      });
      if (!signatureValid) return json({ error: "Wallet signature verification failed." }, 401);

      const account = decorateAccount(await ensureAccount(walletAddress), walletAddress);
      if (account.active_adventures >= account.slots) {
        return json({
          error: `Level ${account.level} can run ${account.slots} adventure${account.slots === 1 ? "" : "s"} at a time.`,
          account,
        }, 409);
      }

      const secret = randomSecret();
      const secretHash = await sha256Hex(secret);
      const { data: session, error: sessionError } = await supabase
        .from("adventure_sessions")
        .insert({
          wallet_address: walletAddress,
          secret_hash: secretHash,
          party_token_ids: partyTokenIds,
          status: "running",
        })
        .select(SESSION_COLUMNS)
        .single();
      if (sessionError) throw sessionError;

      await supabase.from("adventure_challenges").delete().eq("wallet_address", walletAddress);
      const nextAccount = decorateAccount(await persistProgress(walletAddress, 0, 1), walletAddress);
      return json({ account: nextAccount, session, secret });
    }

    const sessionId = String(body.sessionId ?? "");
    const secret = String(body.secret ?? "");
    if (!sessionId || !secret) return json({ error: "Adventure session credentials are required." }, 400);
    const session = await loadSession(sessionId, secret);
    if (!session) return json({ error: "This adventure session is invalid." }, 401);

    if (action === "prompt") {
      if (session.status !== "running") return json({ error: "This adventure is no longer exploring." }, 409);
      const encounterIndex = Number(body.encounterIndex);
      const optionKey = String(body.optionKey ?? "");
      const encounter = ENCOUNTERS[encounterIndex];
      const option = encounter?.options.find((row) => row.key === optionKey);
      if (!encounter || !option) return json({ error: "Unknown encounter choice." }, 400);

      const roll = rollD20();
      const succeeded = roll === 20 || (roll !== 1 && roll >= option.dc);
      const xpAwarded = succeeded ? XP_PROMPT_SUCCESS : XP_PROMPT_FAIL;

      await supabase.from("adventure_prompt_results").insert({
        session_id: session.id,
        encounter_index: encounterIndex,
        option_key: optionKey,
        roll,
        succeeded,
        xp_awarded: xpAwarded,
      });
      await supabase
        .from("adventure_sessions")
        .update({ xp_awarded: Number(session.xp_awarded ?? 0) + xpAwarded, updated_at: new Date().toISOString() })
        .eq("id", session.id);

      const account = decorateAccount(await persistProgress(session.wallet_address, xpAwarded), session.wallet_address);
      const drip = await maybeDrip(session.wallet_address, session.id);
      return json({
        account,
        roll,
        succeeded,
        dc: option.dc,
        xpAwarded,
        drip,
      });
    }

    if (action === "mine-progress") {
      if (!["running", "found"].includes(session.status)) {
        return json({ error: "This adventure is no longer mining." }, 409);
      }
      const extra = Math.min(250_000, Math.max(0, Number(body.hashesChecked) || 0));
      const { data, error } = await supabase
        .from("adventure_sessions")
        .update({
          hashes_checked: Number(session.hashes_checked ?? 0) + extra,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id)
        .select(SESSION_COLUMNS)
        .single();
      if (error) throw error;
      return json({ session: data });
    }

    if (action === "submit-hash") {
      if (session.status !== "running") return json({ error: "This adventure already found a dungeon." }, 409);
      const nonce = String(body.nonce ?? "");
      if (!/^\d{1,16}$/.test(nonce)) return json({ error: "Invalid mining nonce." }, 400);
      const expectedHash = await sha256Hex(`${MINE_PAYLOAD_PREFIX}:${session.id}:${nonce}`);
      if (!expectedHash.startsWith(HASH_PREFIX)) {
        return json({ error: "That hash does not meet the dungeon difficulty." }, 400);
      }
      if (body.hash && String(body.hash).toLowerCase() !== expectedHash) {
        return json({ error: "Submitted hash does not match the verified digest." }, 400);
      }

      const { data, error } = await supabase
        .from("adventure_sessions")
        .update({
          status: "found",
          winning_nonce: nonce,
          winning_hash: expectedHash,
          dungeon_seed: expectedHash,
          xp_awarded: Number(session.xp_awarded ?? 0) + XP_DUNGEON_FOUND,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id)
        .select(SESSION_COLUMNS)
        .single();
      if (error) throw error;

      const account = decorateAccount(
        await persistProgress(session.wallet_address, XP_DUNGEON_FOUND),
        session.wallet_address,
      );
      const drip = await maybeDrip(session.wallet_address, session.id);
      return json({ account, session: data, drip });
    }

    if (action === "discard") {
      if (session.status !== "found") {
        return json({ error: "Only a found dungeon preview can be walked away from." }, 409);
      }
      const discardedNonce = Number(session.winning_nonce ?? 0);
      const { data, error } = await supabase
        .from("adventure_sessions")
        .update({
          status: "running",
          winning_nonce: null,
          winning_hash: null,
          dungeon_seed: null,
          mint_deadline: null,
          xp_awarded: Number(session.xp_awarded ?? 0) + XP_DUNGEON_DISCARDED,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id)
        .select(SESSION_COLUMNS)
        .single();
      if (error) throw error;
      const account = decorateAccount(
        await persistProgress(session.wallet_address, XP_DUNGEON_DISCARDED),
        session.wallet_address,
      );
      return json({
        account,
        session: data,
        nextNonce: Number.isFinite(discardedNonce) ? discardedNonce + 1 : 0,
        xpAwarded: XP_DUNGEON_DISCARDED,
      });
    }

    if (action === "abandon") {
      if (!["running", "found"].includes(session.status)) {
        return json({ error: "This adventure has already ended." }, 409);
      }
      const { data, error } = await supabase
        .from("adventure_sessions")
        .update({
          status: "abandoned",
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id)
        .select(SESSION_COLUMNS)
        .single();
      if (error) throw error;
      const account = decorateAccount(
        await persistProgress(session.wallet_address, 0, -1),
        session.wallet_address,
      );
      return json({ account, session: data });
    }

    if (action === "mint-voucher") {
      if (session.status !== "found" || !session.dungeon_seed) {
        return json({ error: "Find a dungeon before minting." }, 409);
      }
      const deadline = Math.floor(Date.now() / 1000) + 15 * 60;
      const seed = String(session.dungeon_seed).startsWith("0x")
        ? String(session.dungeon_seed)
        : `0x${session.dungeon_seed}`;
      const voucher = {
        wallet: session.wallet_address,
        seed,
        deadline,
      };
      const message = `IMPLINGz Dungeon Mint\n${voucher.wallet}\n${voucher.seed}\n${voucher.deadline}`;
      let signature = "";
      const signerKey = Deno.env.get("DUNGEON_MINT_SIGNER_KEY");
      if (signerKey) {
        const account = privateKeyToAccount(signerKey as `0x${string}`);
        signature = await account.signMessage({ message });
      }
      const contractAddress = Deno.env.get("DUNGEON_KEEP_ADDRESS") || "";
      await supabase
        .from("adventure_sessions")
        .update({ mint_deadline: new Date(deadline * 1000).toISOString(), updated_at: new Date().toISOString() })
        .eq("id", session.id);

      return json({
        voucher,
        message,
        signature,
        contractAddress,
        previewUrl: `/api/dungeon-preview?seed=${encodeURIComponent(session.dungeon_seed)}&format=png`,
      });
    }

    if (action === "mark-minted") {
      if (session.status !== "found") return json({ error: "This dungeon cannot be marked minted." }, 409);
      const tokenId = Number(body.tokenId);
      if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > 4444) {
        return json({ error: "Invalid minted token id." }, 400);
      }
      const { data, error } = await supabase
        .from("adventure_sessions")
        .update({
          status: "minted",
          minted_token_id: tokenId,
          ended_at: new Date().toISOString(),
          xp_awarded: Number(session.xp_awarded ?? 0) + XP_DUNGEON_MINTED,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id)
        .select(SESSION_COLUMNS)
        .single();
      if (error) throw error;
      const account = decorateAccount(
        await persistProgress(session.wallet_address, XP_DUNGEON_MINTED, -1),
        session.wallet_address,
      );
      return json({ account, session: data });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    console.error("adventures error", error);
    return json({ error: "The adventure service is temporarily unavailable." }, 500);
  }
});
