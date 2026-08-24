import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseUnits,
  verifyMessage,
} from "npm:viem";
import { privateKeyToAccount } from "npm:viem/accounts";
import { IMP_TIER_DIGITS } from "./impTiers.ts";

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
const HASH_PREFIX = "0000";
const HASH_NEXT_NIBBLE_MAX = 5;
const MINE_PAYLOAD_PREFIX = "implingz-dungeon";
const TIER_HASH_RATES = { 1: 3, 2: 6, 3: 12 } as const;
const MINE_TICK_MS = 16;
const MINE_RATE_SLACK = 1.5;
const XP_PROMPT_SUCCESS = 15;
const XP_PROMPT_FAIL = 5;
const XP_DUNGEON_FOUND = 40;
const XP_DUNGEON_MINTED = 80;
const XP_DUNGEON_DISCARDED = 15;
const ADVENTURES_CHAPTER1_OPENS_AT_MS = Date.parse("2026-08-24T18:05:00.000Z");
const ADVENTURES_CLOSED = false;
const ADVENTURES_TESTER_WALLETS = new Set([
  "0xfe9d3889b5e36b3216a756e0c752220dbf24dac8",
  "0xb05b214b21801c18b40be098782f32970d29cea1",
]);
const KEEP_V2_ADDRESS = "0x51eA8743109F1b9C70C9d1a9A56cCaA5C2877ee9";
const BANNED_WALLETS = new Set([
  "0x6a69c91eab620fe31ff6cd30b3a00edfb347e32b",
  "0xfc8d2794f75dc008fe0fba2d585aeb49ab4b68a1",
]);
const IMPLINGZ_ADDRESS = "0x81D2D1f0e92285CdD22Aa3cbc6956B6E1724d029";
const ERC721_OWNER_ABI = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
] as const;
const DERP_DRIP_CHANCE = 0.2;
const DERP_DRIP_MIN = 20;
const DERP_DRIP_MAX = 40;
const DERP_DECIMALS = 18;
const ROBINHOOD_RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
const ROBINHOOD_CHAIN = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [ROBINHOOD_RPC_URL] } },
});
const DERP_REWARDS_ABI = [
  {
    type: "function",
    name: "drip",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "potBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;
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
const MAX_LEVEL = 10;
const ENCOUNTER_DC_PAIRS = [
  [10, 8], [13, 9], [11, 14], [12, 13], [7, 10], [12, 8], [11, 9], [8, 10], [13, 7], [10, 8],
  [14, 9], [11, 10], [12, 9], [13, 8], [10, 12], [11, 7], [13, 9], [8, 14], [12, 8], [10, 9],
  [11, 8], [9, 10], [7, 12], [10, 8], [8, 12], [13, 11], [9, 11], [12, 10], [14, 8], [10, 7],
  [9, 13], [8, 10], [11, 9], [10, 12], [11, 8], [10, 13], [9, 14], [10, 11], [12, 8], [7, 11],
  [9, 13], [8, 10], [14, 9], [10, 12], [13, 8], [11, 9], [12, 8], [10, 7], [8, 13], [9, 11],
  [8, 10], [10, 14], [9, 8], [12, 10], [11, 8], [7, 10], [13, 11], [8, 9], [12, 10], [11, 13],
  [9, 12], [10, 8], [11, 9], [8, 12], [13, 7], [9, 12], [10, 11], [8, 10], [12, 9], [10, 8],
  [9, 11], [10, 12], [11, 13], [10, 8], [14, 9], [8, 11], [10, 7], [9, 13], [10, 8], [9, 8],
  [12, 8], [10, 7], [9, 11], [10, 8], [8, 10], [11, 7], [13, 8], [12, 9], [10, 8], [11, 9],
  [12, 10], [8, 9], [11, 7], [9, 10], [10, 8], [11, 9], [10, 12], [11, 8], [10, 13], [9, 14],
  [8, 10], [7, 12], [8, 10], [9, 11], [8, 13],
] as const;
const ENCOUNTERS = ENCOUNTER_DC_PAIRS.map(([dcA, dcB]) => ({
  options: [
    { key: "A", dc: dcA },
    { key: "B", dc: dcB },
  ],
}));

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

function progressFromXp(xp = 0) {
  const safeXp = Math.max(0, Number(xp) || 0);
  let current = LEVELS[0];
  for (const row of LEVELS) {
    if (safeXp >= row.xp) current = row;
  }
  const next =
    current.level >= MAX_LEVEL
      ? null
      : LEVELS.find((row) => row.level === current.level + 1) ?? null;
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

function normalizePartyTokenIds(partyTokenIds: unknown) {
  if (!Array.isArray(partyTokenIds)) return [] as string[];
  return [...new Set(partyTokenIds.map((id) => String(id)))].slice(0, 5);
}

function controlMessage(payload: {
  walletAddress: string;
  sessionId: string;
  action: string;
  nonce: string;
}) {
  return [
    "IMPLINGz Adventure Control",
    "",
    `Wallet: ${payload.walletAddress.toLowerCase()}`,
    `Session: ${payload.sessionId}`,
    `Action: ${payload.action}`,
    `Nonce: ${payload.nonce}`,
  ].join("\n");
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

function isWinningHash(hash: string) {
  const hex = String(hash).toLowerCase();
  if (!hex.startsWith(HASH_PREFIX)) return false;
  const extra = Number.parseInt(hex.charAt(HASH_PREFIX.length) || "f", 16);
  return Number.isFinite(extra) && extra <= HASH_NEXT_NIBBLE_MAX;
}

function chainClient() {
  const rpc = Deno.env.get("ROBINHOOD_RPC_URL")?.trim() || ROBINHOOD_RPC_URL;
  return createPublicClient({ chain: ROBINHOOD_CHAIN, transport: http(rpc) });
}

function partyTokenIdsOf(session: { party_token_ids?: unknown }) {
  return Array.isArray(session.party_token_ids)
    ? session.party_token_ids.map((id) => String(id))
    : [];
}

function hashesPerTickForParty(tokenIds: string[]) {
  return tokenIds.reduce((total, id) => {
    const index = Number(id) - 1;
    const digit = Number.parseInt(IMP_TIER_DIGITS.charAt(index) || "1", 10);
    const tier = digit === 3 ? 3 : digit === 2 ? 2 : 1;
    return total + TIER_HASH_RATES[tier];
  }, 0);
}

function maxAllowedNonce(session: { party_token_ids?: unknown; started_at?: string | null }) {
  const rate = Math.max(1, hashesPerTickForParty(partyTokenIdsOf(session)));
  const started = Date.parse(String(session.started_at ?? ""));
  const elapsedMs = Number.isFinite(started) ? Math.max(0, Date.now() - started) : 0;
  const ticks = Math.max(1, elapsedMs / MINE_TICK_MS) * MINE_RATE_SLACK;
  return BigInt(Math.floor(rate * ticks));
}

async function verifyPartyOwnership(walletAddress: string, partyTokenIds: string[]) {
  if (partyTokenIds.length === 0) {
    return { ok: false as const, error: "Select at least one IMPLINGZ.", status: 400 };
  }
  const client = chainClient();
  const wallet = walletAddress.toLowerCase();
  for (const tokenId of partyTokenIds) {
    try {
      const owner = await client.readContract({
        address: IMPLINGZ_ADDRESS,
        abi: ERC721_OWNER_ABI,
        functionName: "ownerOf",
        args: [BigInt(tokenId)],
      });
      if (String(owner).toLowerCase() !== wallet) {
        return {
          ok: false as const,
          error: `This wallet does not own IMPLINGZ #${tokenId}.`,
          status: 403,
        };
      }
    } catch {
      return {
        ok: false as const,
        error: `IMPLINGZ #${tokenId} ownership could not be verified.`,
        status: 403,
      };
    }
  }
  return { ok: true as const };
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

function normalizePrivateKey(raw: string | undefined | null): `0x${string}` | null {
  if (!raw) return null;
  let key = String(raw).trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'")) ||
    (key.startsWith("`") && key.endsWith("`"))
  ) {
    key = key.slice(1, -1).trim();
  }
  key = key.replace(/^\s*(hex:|key:|private[_ ]?key:)\s*/i, "");
  const labeled = key.match(/(?:^|[=:\s])(?:0x)?([0-9a-fA-F]{64})(?:\s|$)/);
  if (labeled?.[1]) return `0x${labeled[1]}`;
  key = key.replace(/[\s\u0000-\u001f]+/g, "");
  while (key.toLowerCase().startsWith("0x")) key = key.slice(2);
  if (/^[0-9a-fA-F]{64}$/.test(key)) return `0x${key}`;
  return null;
}

let cachedOperator: ReturnType<typeof privateKeyToAccount> | null | undefined;

function operatorAccount() {
  if (cachedOperator !== undefined) return cachedOperator;
  const sources = [
    ["DERP_OPERATOR_PRIVATE_KEY", Deno.env.get("DERP_OPERATOR_PRIVATE_KEY")],
    ["DUNGEON_MINT_SIGNER_KEY", Deno.env.get("DUNGEON_MINT_SIGNER_KEY")],
  ] as const;
  for (const [name, raw] of sources) {
    const key = normalizePrivateKey(raw);
    if (!key) {
      if (raw?.trim()) {
        console.error(`derp key ${name} unusable (len=${String(raw).trim().length})`);
      }
      continue;
    }
    try {
      cachedOperator = privateKeyToAccount(key);
      if (name !== "DERP_OPERATOR_PRIVATE_KEY") {
        console.log(`derp drips using ${name} because DERP_OPERATOR_PRIVATE_KEY is invalid`);
      }
      return cachedOperator;
    } catch (error) {
      console.error(`derp key ${name} rejected`, String(error));
    }
  }
  cachedOperator = null;
  return null;
}

function keepContractAddress() {
  return Deno.env.get("DUNGEON_KEEP_V2_ADDRESS") || KEEP_V2_ADDRESS;
}

function adventuresPausedFor(wallet = "") {
  if (ADVENTURES_CLOSED) return true;
  if (Date.now() >= ADVENTURES_CHAPTER1_OPENS_AT_MS) return false;
  return !ADVENTURES_TESTER_WALLETS.has(String(wallet).toLowerCase());
}

function openSeaItemUrl(tokenId: number) {
  return `https://opensea.io/item/robinhood/${keepContractAddress()}/${tokenId}`;
}

function openSeaCollectionUrl() {
  return `https://opensea.io/assets/robinhood/${keepContractAddress()}`;
}

async function refreshOpenSeaMetadata(tokenId: number) {
  try {
    const headers: Record<string, string> = { accept: "application/json" };
    const apiKey = Deno.env.get("OPENSEA_API_KEY")?.trim();
    if (apiKey) headers["x-api-key"] = apiKey;
    await fetch(
      `https://api.opensea.io/api/v2/chain/robinhood/contract/${keepContractAddress()}/nfts/${tokenId}/refresh`,
      { method: "POST", headers },
    );
  } catch (error) {
    console.error("opensea refresh failed", error);
  }
}

async function sendDerpDrip(rewardsAddress: string, to: string, amount: number) {
  try {
    const account = operatorAccount();
    if (!account) return null;
    const rpc = Deno.env.get("ROBINHOOD_RPC_URL")?.trim() || ROBINHOOD_RPC_URL;
    const publicClient = createPublicClient({ chain: ROBINHOOD_CHAIN, transport: http(rpc) });
    const walletClient = createWalletClient({
      account,
      chain: ROBINHOOD_CHAIN,
      transport: http(rpc),
    });
    const wei = parseUnits(String(amount), DERP_DECIMALS);
    const balance = await publicClient.readContract({
      address: rewardsAddress as `0x${string}`,
      abi: DERP_REWARDS_ABI,
      functionName: "potBalance",
    });
    if (balance < wei) return { status: "skipped_empty_pot" as const, txHash: null };

    const hash = await walletClient.writeContract({
      address: rewardsAddress as `0x${string}`,
      abi: DERP_REWARDS_ABI,
      functionName: "drip",
      args: [to as `0x${string}`, wei],
    });
    await publicClient.waitForTransactionReceipt({ hash, timeout: 8_000 });
    return { status: "sent" as const, txHash: hash };
  } catch (error) {
    console.error("derp drip send failed", String(error));
    return null;
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (ADVENTURES_CLOSED && request.method === "POST") {
    return json({ error: "Adventures are paused." }, 503);
  }

  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const secretKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!secretKey || !supabaseUrl) return json({ error: "Adventure service is not configured." }, 500);

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  function floorFromImpzCount(impzCount = 0) {
    const count = Math.max(0, Number(impzCount) || 0);
    if (count >= 20) return progressFromXp(900);
    if (count >= 10) return progressFromXp(300);
    return progressFromXp(0);
  }

  async function holdingsFloorFor(walletAddress: string) {
    const { data: profile, error: profileError } = await supabase
      .from("community_profiles")
      .select("total_implingz")
      .eq("wallet_address", walletAddress)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile) return floorFromImpzCount(profile.total_implingz);

    const { data: snap, error: snapError } = await supabase
      .from("impz_holder_xp_snapshot")
      .select("floor_xp, floor_level")
      .eq("wallet_address", walletAddress)
      .maybeSingle();
    if (snapError) throw snapError;
    return progressFromXp(Math.max(0, Number(snap?.floor_xp ?? 0)));
  }

  /** Apply Impz holdings floor (10+ L2, 20+ L3) without lowering earned XP. */
  async function applyHoldingsFloor(account: Record<string, unknown>) {
    const walletAddress = String(account.wallet_address ?? "").toLowerCase();
    const floor = await holdingsFloorFor(walletAddress);
    const currentXp = Math.max(0, Number(account.xp ?? 0));
    if (currentXp >= floor.xp) return account;
    const { data, error } = await supabase
      .from("adventurer_accounts")
      .update({
        xp: floor.xp,
        level: floor.level,
        updated_at: new Date().toISOString(),
      })
      .eq("wallet_address", walletAddress)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async function countActiveSessions(walletAddress: string) {
    const { count, error } = await supabase
      .from("adventure_sessions")
      .select("id", { count: "exact", head: true })
      .eq("wallet_address", walletAddress)
      .in("status", ["running", "found"]);
    if (error) throw error;
    return Number(count ?? 0);
  }

  async function syncActiveAdventures(account: Record<string, unknown>) {
    const walletAddress = String(account.wallet_address ?? "").toLowerCase();
    const live = await countActiveSessions(walletAddress);
    if (Number(account.active_adventures ?? 0) === live) return account;
    const { data, error } = await supabase
      .from("adventurer_accounts")
      .update({
        active_adventures: live,
        updated_at: new Date().toISOString(),
      })
      .eq("wallet_address", walletAddress)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async function ensureAccount(walletAddress: string) {
    const { data, error } = await supabase
      .from("adventurer_accounts")
      .select("*")
      .eq("wallet_address", walletAddress)
      .maybeSingle();
    if (error) throw error;
    if (data) return syncActiveAdventures(await applyHoldingsFloor(data));

    const floor = await holdingsFloorFor(walletAddress);
    const { data: created, error: createError } = await supabase
      .from("adventurer_accounts")
      .insert({
        wallet_address: walletAddress,
        xp: floor.xp,
        level: floor.level,
      })
      .select("*")
      .single();
    if (createError) throw createError;
    return syncActiveAdventures(created);
  }

  async function persistProgress(walletAddress: string, xpDelta: number, activeDelta = 0) {
    const account = await ensureAccount(walletAddress);
    const nextXp = Math.max(0, Number(account.xp ?? 0) + xpDelta);
    const progress = progressFromXp(nextXp);
    const nextActive = await countActiveSessions(walletAddress);
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

  async function loadSessionById(sessionId: string) {
    const { data, error } = await supabase
      .from("adventure_sessions")
      .select(SESSION_COLUMNS)
      .eq("id", sessionId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function consumeChallenge(walletAddress: string, nonce: string) {
    const { data: challenge, error: challengeError } = await supabase
      .from("adventure_challenges")
      .select("nonce,expires_at")
      .eq("wallet_address", walletAddress)
      .eq("nonce", nonce)
      .maybeSingle();
    if (challengeError) throw challengeError;
    if (!challenge || new Date(challenge.expires_at).getTime() <= Date.now()) return false;
    await supabase.from("adventure_challenges").delete().eq("wallet_address", walletAddress);
    return true;
  }

  async function authorizeSession(body: Record<string, unknown>, action: string) {
    const sessionId = String(body.sessionId ?? "");
    const secret = String(body.secret ?? "");
    if (sessionId && secret) {
      return loadSession(sessionId, secret);
    }

    const walletAddress = String(body.walletAddress ?? "").toLowerCase();
    const nonce = String(body.nonce ?? "");
    const signature = String(body.signature ?? "");
    if (!sessionId || !ADDRESS_PATTERN.test(walletAddress) || !NONCE_PATTERN.test(nonce) || !SIGNATURE_PATTERN.test(signature)) {
      return null;
    }

    const owned = await loadSessionById(sessionId);
    if (!owned || String(owned.wallet_address).toLowerCase() !== walletAddress) return null;
    if (!(await consumeChallenge(walletAddress, nonce))) return null;

    const signatureValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message: controlMessage({ walletAddress, sessionId, action, nonce }),
      signature: signature as `0x${string}`,
    });
    if (!signatureValid) return null;
    return owned;
  }

  async function persistDripPayment(
    dripId: string,
    paid: { status: "sent" | "skipped_empty_pot"; txHash: string | null },
  ) {
    const { data, error } = await supabase
      .from("derp_drips")
      .update({ status: paid.status, tx_hash: paid.txHash })
      .eq("id", dripId)
      .select("id,amount,status,tx_hash")
      .single();
    if (error) throw error;
    return data;
  }

  async function settlePendingDrips(walletAddress: string) {
    const rewardsAddress = Deno.env.get("DERP_REWARDS_ADDRESS")?.trim() ?? "";
    if (!ADDRESS_PATTERN.test(rewardsAddress) || !operatorAccount()) return [] as Array<{
      id: string;
      amount: number;
      status: string;
      tx_hash: string | null;
    }>;

    const { data: pending, error } = await supabase
      .from("derp_drips")
      .select("id,wallet_address,amount,status,tx_hash")
      .eq("wallet_address", walletAddress)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(8);
    if (error) throw error;

    const settled = [];
    for (const drip of pending ?? []) {
      const paid = await sendDerpDrip(rewardsAddress, drip.wallet_address, Number(drip.amount));
      if (!paid) break;
      settled.push(await persistDripPayment(drip.id, paid));
    }
    return settled;
  }

  async function maybeDrip(walletAddress: string, sessionId: string) {
    const settled = await settlePendingDrips(walletAddress);
    if (Math.random() >= DERP_DRIP_CHANCE) {
      return settled.find((drip) => drip.status === "sent") ?? settled.at(-1) ?? null;
    }

    const amount = DERP_DRIP_MIN + Math.floor(Math.random() * (DERP_DRIP_MAX - DERP_DRIP_MIN + 1));
    const rewardsAddress = Deno.env.get("DERP_REWARDS_ADDRESS")?.trim() ?? "";
    const configured = ADDRESS_PATTERN.test(rewardsAddress);
    const { data, error } = await supabase
      .from("derp_drips")
      .insert({
        wallet_address: walletAddress,
        session_id: sessionId,
        amount,
        status: configured ? "pending" : "skipped_empty_pot",
      })
      .select("id,amount,status,tx_hash")
      .single();
    if (error) throw error;
    if (!configured) return data;

    const paid = await sendDerpDrip(rewardsAddress, walletAddress, amount);
    if (!paid) return data;
    return persistDripPayment(data.id, paid);
  }

  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      if (url.searchParams.get("board") === "1") {
        const { data, error } = await supabase
          .from("adventure_sessions")
          .select("id,wallet_address,status,winning_hash,dungeon_seed,minted_token_id,party_token_ids,xp_awarded,started_at,ended_at,updated_at")
          .order("updated_at", { ascending: false })
          .limit(20);
        if (error) throw error;
        const { data: payouts, error: payoutsError } = await supabase
          .from("derp_drips")
          .select("id,wallet_address,session_id,amount,tx_hash,created_at")
          .eq("status", "sent")
          .order("created_at", { ascending: false })
          .limit(40);
        if (payoutsError) throw payoutsError;
        return json({ events: data ?? [], payouts: payouts ?? [] });
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
      return json({
        account,
        sessions: sessions ?? [],
        drip: null,
      });
    }

    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

    const body = await request.json();
    const action = String(body.action ?? "");

    if (action === "challenge" || action === "start") {
      if (adventuresPausedFor(String(body.walletAddress ?? ""))) {
        return json({ error: "Adventures open shortly. Keep minting resumes until all 2222 are minted." }, 503);
      }
    }

    if (action === "challenge") {
      const walletAddress = String(body.walletAddress ?? "").toLowerCase();
      if (!ADDRESS_PATTERN.test(walletAddress)) return json({ error: "Invalid wallet address." }, 400);
      await ensureAccount(walletAddress);
      const nonce = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const partyTokenIds = normalizePartyTokenIds(body.partyTokenIds);
      const sessionId = String(body.sessionId ?? "");
      const intent = String(body.intent ?? "");
      const { error } = await supabase.from("adventure_challenges").upsert(
        { wallet_address: walletAddress, nonce, expires_at: expiresAt },
        { onConflict: "wallet_address" },
      );
      if (error) throw error;
      const message = partyTokenIds.length
        ? startMessage({ walletAddress, partyTokenIds, nonce })
        : sessionId && intent
          ? controlMessage({ walletAddress, sessionId, action: intent, nonce })
          : "";
      return json({ nonce, expiresAt, ...(message ? { message } : {}) });
    }

    if (action === "start") {
      const walletAddress = String(body.walletAddress ?? "").toLowerCase();
      const partyTokenIds = normalizePartyTokenIds(body.partyTokenIds);
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
      if (BANNED_WALLETS.has(walletAddress)) {
        return json({ error: "This wallet cannot use Adventures." }, 403);
      }

      const owned = await verifyPartyOwnership(walletAddress, partyTokenIds);
      if (!owned.ok) return json({ error: owned.error }, owned.status);

      const account = decorateAccount(await ensureAccount(walletAddress), walletAddress);
      const { data: activeSessions, error: activeError } = await supabase
        .from("adventure_sessions")
        .select("party_token_ids,status")
        .eq("wallet_address", walletAddress)
        .in("status", ["running", "found"]);
      if (activeError) throw activeError;
      const liveCount = (activeSessions ?? []).length;
      if (liveCount >= account.slots) {
        const waitingKeeps = (activeSessions ?? []).filter((row) => row.status === "found").length;
        return json({
          error: waitingKeeps
            ? `Level ${account.level} can run ${account.slots} adventure${account.slots === 1 ? "" : "s"} at a time. Mint or flee a found keep to free a slot.`
            : `Level ${account.level} can run ${account.slots} adventure${account.slots === 1 ? "" : "s"} at a time.`,
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
      const nextAccount = decorateAccount(await persistProgress(walletAddress, 0, 1), walletAddress);
      return json({ account: nextAccount, session, secret });
    }

    const session = await authorizeSession(body, action);
    if (!session) return json({ error: "This adventure session is invalid." }, 401);
    if (adventuresPausedFor(session.wallet_address)) {
      return json({ error: "Adventures open shortly. Keep minting resumes until all 2222 are minted." }, 503);
    }

    if (action === "prompt") {
      if (!["running", "found"].includes(session.status)) {
        return json({ error: "This adventure is no longer exploring." }, 409);
      }
      const livesRemaining = Number(session.lives ?? ADVENTURE_LIVES);
      if (livesRemaining <= 0) {
        return json({ error: "This adventure has no lives remaining." }, 409);
      }
      const encounterIndex = Number(body.encounterIndex);
      const optionKey = String(body.optionKey ?? "");
      const encounter = ENCOUNTERS[encounterIndex];
      const option = encounter?.options.find((row) => row.key === optionKey);
      if (!encounter || !option) return json({ error: "Unknown encounter choice." }, 400);

      const roll = rollD20();
      const succeeded = roll === 20 || (roll !== 1 && roll >= option.dc);
      const xpAwarded = succeeded ? XP_PROMPT_SUCCESS : XP_PROMPT_FAIL;
      const nextLives = succeeded ? livesRemaining : Math.max(0, livesRemaining - 1);
      const defeated = !succeeded && nextLives <= 0;
      const now = new Date().toISOString();

      await supabase.from("adventure_prompt_results").insert({
        session_id: session.id,
        encounter_index: encounterIndex,
        option_key: optionKey,
        roll,
        succeeded,
        xp_awarded: xpAwarded,
      });
      const sessionPatch: Record<string, unknown> = {
        xp_awarded: Number(session.xp_awarded ?? 0) + xpAwarded,
        lives: nextLives,
        updated_at: now,
      };
      if (defeated) {
        sessionPatch.status = "abandoned";
        sessionPatch.ended_at = now;
      }
      const { data: updatedSession, error: promptSessionError } = await supabase
        .from("adventure_sessions")
        .update(sessionPatch)
        .eq("id", session.id)
        .select(SESSION_COLUMNS)
        .single();
      if (promptSessionError) throw promptSessionError;

      const account = decorateAccount(
        await persistProgress(session.wallet_address, xpAwarded, defeated ? -1 : 0),
        session.wallet_address,
      );
      const drip = await maybeDrip(session.wallet_address, session.id);
      return json({
        account,
        session: updatedSession,
        roll,
        succeeded,
        dc: option.dc,
        xpAwarded,
        lives: nextLives,
        defeated,
        drip,
      });
    }

    if (action === "mine-progress") {
      if (!["running", "found"].includes(session.status)) {
        return json({ error: "This adventure is no longer mining." }, 409);
      }
      const current = Number(session.hashes_checked ?? 0);
      const allowed = Number(maxAllowedNonce(session));
      const extra = Math.min(
        250_000,
        Math.max(0, Number(body.hashesChecked) || 0),
        Math.max(0, allowed - current),
      );
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
      return json({
        session: data,
        drip: null,
      });
    }

    if (action === "submit-hash") {
      if (session.status !== "running") return json({ error: "This adventure already found a dungeon." }, 409);
      const nonce = String(body.nonce ?? "");
      if (!/^[0-9]{1,16}$/.test(nonce)) return json({ error: "Invalid mining nonce." }, 400);
      const owned = await verifyPartyOwnership(session.wallet_address, partyTokenIdsOf(session));
      if (!owned.ok) return json({ error: owned.error }, owned.status);
      let nonceValue: bigint;
      try {
        nonceValue = BigInt(nonce);
      } catch {
        return json({ error: "Invalid mining nonce." }, 400);
      }
      if (nonceValue > maxAllowedNonce(session)) {
        return json({
          error: "That find arrived faster than this party could mine. Keep exploring.",
        }, 400);
      }
      const expectedHash = await sha256Hex(`${MINE_PAYLOAD_PREFIX}:${session.id}:${nonce}`);
      if (!isWinningHash(expectedHash)) {
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
      const owned = await verifyPartyOwnership(session.wallet_address, partyTokenIdsOf(session));
      if (!owned.ok) return json({ error: owned.error }, owned.status);
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
      const signerKey = normalizePrivateKey(Deno.env.get("DUNGEON_MINT_SIGNER_KEY"));
      if (signerKey) {
        const account = privateKeyToAccount(signerKey);
        signature = await account.signMessage({ message });
      }
      const contractAddress = keepContractAddress();
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
      if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > 2222) {
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
      await refreshOpenSeaMetadata(tokenId);
      return json({
        account,
        session: data,
        openSeaItemUrl: openSeaItemUrl(tokenId),
        openSeaCollectionUrl: openSeaCollectionUrl(),
      });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    console.error("adventures error", error);
    return json({ error: "The adventure service is temporarily unavailable." }, 500);
  }
});
