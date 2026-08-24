import { createClient } from "npm:@supabase/supabase-js@2";
import { createPublicClient, defineChain, http, verifyMessage } from "npm:viem";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const SIGNATURE_PATTERN = /^0x[a-fA-F0-9]{130}$/;
const NONCE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION_COLUMNS =
  "id,wallet_address,party_token_ids,status,hashes_checked,winning_nonce,winning_hash,dungeon_seed,mint_deadline,minted_token_id,xp_awarded,lives,started_at,ended_at,updated_at";
const ADVENTURE_LIVES = 5;
const IMPLINGZ_ADDRESS = "0x81D2D1f0e92285CdD22Aa3cbc6956B6E1724d029";
const BANNED_WALLETS = new Set([
  "0x6a69c91eab620fe31ff6cd30b3a00edfb347e32b",
  "0xfc8d2794f75dc008fe0fba2d585aeb49ab4b68a1",
]);
const LEVELS = [
  { level: 1, xp: 0, slots: 1 },
  { level: 2, xp: 300, slots: 2 },
  { level: 3, xp: 900, slots: 3 },
  { level: 4, xp: 2200, slots: 4 },
  { level: 5, xp: 4500, slots: 5 },
  { level: 6, xp: 8000, slots: 5 },
  { level: 7, xp: 13000, slots: 5 },
  { level: 8, xp: 20000, slots: 5 },
  { level: 9, xp: 30000, slots: 5 },
  { level: 10, xp: 45000, slots: 5 },
];
const ROBINHOOD_CHAIN = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
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

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

function progressFromXp(xp = 0) {
  const safeXp = Math.max(0, Number(xp) || 0);
  let current = LEVELS[0];
  for (const row of LEVELS) {
    if (safeXp >= row.xp) current = row;
  }
  return { xp: safeXp, level: current.level, slots: current.slots };
}

function decorateAccount(account: Record<string, unknown> | null, walletAddress = "") {
  const progress = progressFromXp(Number(account?.xp ?? 0));
  return {
    ...account,
    wallet_address: account?.wallet_address ?? walletAddress,
    ...progress,
  };
}

function normalizePartyTokenIds(partyTokenIds: unknown) {
  if (!Array.isArray(partyTokenIds)) return [] as string[];
  return [...new Set(partyTokenIds.map((id) => String(id)))].slice(0, 5);
}

function startMessage(payload: { walletAddress: string; partyTokenIds: string[]; nonce: string }) {
  return [
    "IMPLINGz Adventure Start",
    "",
    `Wallet: ${payload.walletAddress.toLowerCase()}`,
    `Party: ${payload.partyTokenIds.join(", ")}`,
    `Nonce: ${payload.nonce}`,
  ].join("\n");
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

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const secretKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!secretKey || !supabaseUrl) return json({ error: "Adventure service is not configured." }, 500);
  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = await request.json();
    const action = String(body.action ?? "");
    const walletAddress = String(body.walletAddress ?? "").toLowerCase();
    if (!ADDRESS_PATTERN.test(walletAddress)) return json({ error: "Invalid wallet address." }, 400);
    if (BANNED_WALLETS.has(walletAddress)) {
      return json({ error: "This wallet cannot use Adventures." }, 403);
    }

    async function ensureAccount() {
      const { data, error } = await supabase
        .from("adventurer_accounts")
        .select("*")
        .eq("wallet_address", walletAddress)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;
      const { data: created, error: createError } = await supabase
        .from("adventurer_accounts")
        .insert({ wallet_address: walletAddress, xp: 0, level: 1 })
        .select("*")
        .single();
      if (createError) throw createError;
      return created;
    }

    if (action === "challenge") {
      await ensureAccount();
      const nonce = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const partyTokenIds = normalizePartyTokenIds(body.partyTokenIds);
      const { error } = await supabase.from("adventure_challenges").upsert(
        { wallet_address: walletAddress, nonce, expires_at: expiresAt },
        { onConflict: "wallet_address" },
      );
      if (error) throw error;
      return json({
        nonce,
        expiresAt,
        ...(partyTokenIds.length ? { message: startMessage({ walletAddress, partyTokenIds, nonce }) } : {}),
      });
    }

    if (action === "start") {
      const partyTokenIds = normalizePartyTokenIds(body.partyTokenIds);
      const nonce = String(body.nonce ?? "");
      const signature = String(body.signature ?? "");
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

      const client = createPublicClient({
        chain: ROBINHOOD_CHAIN,
        transport: http("https://rpc.mainnet.chain.robinhood.com"),
      });
      for (const tokenId of partyTokenIds) {
        const owner = await client.readContract({
          address: IMPLINGZ_ADDRESS,
          abi: ERC721_OWNER_ABI,
          functionName: "ownerOf",
          args: [BigInt(tokenId)],
        });
        if (String(owner).toLowerCase() !== walletAddress) {
          return json({ error: `This wallet does not own IMPLINGZ #${tokenId}.` }, 403);
        }
      }

      const account = decorateAccount(await ensureAccount(), walletAddress);
      const { data: activeSessions, error: activeError } = await supabase
        .from("adventure_sessions")
        .select("party_token_ids,status")
        .eq("wallet_address", walletAddress)
        .in("status", ["running", "found"]);
      if (activeError) throw activeError;
      const liveCount = (activeSessions ?? []).length;
      if (liveCount >= account.slots) {
        return json({
          error: `Level ${account.level} can run ${account.slots} adventure${account.slots === 1 ? "" : "s"} at a time.`,
          account: { ...account, active_adventures: liveCount },
        }, 409);
      }
      const usedTokenIds = new Set(
        (activeSessions ?? []).flatMap((row) => row.party_token_ids ?? []).map((id) => String(id)),
      );
      if (partyTokenIds.some((id) => usedTokenIds.has(String(id)))) {
        return json({ error: "That IMPLINGZ is already on another adventure." }, 409);
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
          lives: ADVENTURE_LIVES,
        })
        .select(SESSION_COLUMNS)
        .single();
      if (sessionError) throw sessionError;

      await supabase.from("adventure_challenges").delete().eq("wallet_address", walletAddress);
      await supabase
        .from("adventurer_accounts")
        .update({ active_adventures: liveCount + 1, updated_at: new Date().toISOString() })
        .eq("wallet_address", walletAddress);

      return json({
        account: { ...account, active_adventures: liveCount + 1 },
        session,
        secret,
      });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Adventure start failed." }, 500);
  }
});
