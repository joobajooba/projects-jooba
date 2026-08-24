import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyMessage } from "npm:viem";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const SIGNATURE_PATTERN = /^0x[a-fA-F0-9]{130}$/;
const NONCE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMPLINGZ_CONTRACT = "0x81D2D1f0e92285CdD22Aa3cbc6956B6E1724d029";
const ROBINHOOD_RPC = "https://rpc.mainnet.chain.robinhood.com";
const BLOCKSCOUT_API = "https://robinhoodchain.blockscout.com/api/v2";
const BLOCKSCOUT_HEADERS = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; j00ba.xyz/community-profiles)",
};
const OWNER_OF_SELECTOR = "0x6352211e";
const PROFILE_COLUMNS =
  "wallet_address,nickname,bio,avatar_token_id,total_implingz,tier_1_count,tier_2_count,tier_3_count,created_at,updated_at";
const IMPLING_TIERS =
  "13211211121111113112111111111211321111112211112221211121211212211112113211111111111112211121122311111111111111221123131113121211211211212211212311111111112111111122111122122211211213111112113211211211111211121111311222211111322112211121212111211111121211111111111221111111112121111212211121112211121211221112112111221111312112213112211212121112121211122321211111111112213111112112121211221211112211111111122112221122211112111211111111123131111222112111312111112211311111121111212121121121121212122211121111111211112211112121211211112111211212112111112111222111211311112111123111111111112111111211211212113111121212111113122111312212122211211111221111121211111221211112121221111221321212111111212121111232111211211111112311211111111111221111232211113111121122121122211121111111121111211122111112112111221111111112311111311111222113121211112121111111211132213121221213313113111111122222111111121111112211121121122212221111112223113111111112111122111211111112121111211113121111211111122112122211311111132122211111111111111111121111112111111111112121111211121111111211112121112111111211113211223123321111221211131111122221211211121112311122212111311122321121311111132121112132113121111122111113122211122111111112211111231321121112112111111211211211111111111111112312111112111123111112111123213111111112111111111231112121211311111112112221121211212111122321121311111111112212121111121121122122212211111113112231111211122211112121131121112121112111111111112211111111111111112112212112111112111111111121111111122122111111121113111111211113111113111312122211221213121121111122111112211111312221111211112112211111111121112111111112112111111212212111111122111111111212111111111112112111113123211212111112121111111111211211111111131111112111113211112211111111211111311112211111211111131111121211112123211111111321111311111111111111111122111112212211112122112121311111122111112221311111111111211221211113122112112121112112222111321221111111211221111111111211111111131121111121113111211123312111111222211112111211111222211111211111111112221111111111121111111211211111121131233111121122112121122122111113111113221113221211111112112112122111121111111121122121111111111121232112322121111112111111111112122213211221111112121111121111311221";

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: CORS_HEADERS,
  });
}

function canonicalMessage(profile: {
  walletAddress: string;
  nickname: string;
  bio: string;
  avatarTokenId: string | null;
  nonce: string;
}) {
  return `IMPLINGz Community Profile\n${JSON.stringify(profile)}`;
}

function emptyCounts() {
  return { total_implingz: 0, tier_1_count: 0, tier_2_count: 0, tier_3_count: 0 };
}

function floorFromImpzCount(impzCount = 0) {
  const count = Math.max(0, Number(impzCount) || 0);
  if (count >= 20) return { xp: 900, level: 3 };
  if (count >= 10) return { xp: 300, level: 2 };
  return { xp: 0, level: 1 };
}

function levelFromXp(xp = 0) {
  const safeXp = Math.max(0, Number(xp) || 0);
  if (safeXp >= 45000) return 10;
  if (safeXp >= 30000) return 9;
  if (safeXp >= 20000) return 8;
  if (safeXp >= 13000) return 7;
  if (safeXp >= 8000) return 6;
  if (safeXp >= 4500) return 5;
  if (safeXp >= 2200) return 4;
  if (safeXp >= 900) return 3;
  if (safeXp >= 300) return 2;
  return 1;
}

function countTiersFromTokenIds(tokenIds: Iterable<string>) {
  const counts = emptyCounts();

  for (const tokenId of tokenIds) {
    const numericId = Number(tokenId);
    if (!Number.isInteger(numericId) || numericId < 1 || numericId > IMPLING_TIERS.length) {
      continue;
    }

    const tier = IMPLING_TIERS[numericId - 1];
    counts.total_implingz += 1;
    if (tier === "1") counts.tier_1_count += 1;
    if (tier === "2") counts.tier_2_count += 1;
    if (tier === "3") counts.tier_3_count += 1;
  }

  return counts;
}

function tokenContract(item: { token?: { address_hash?: string; address?: string } } | null) {
  return String(item?.token?.address_hash || item?.token?.address || "").toLowerCase();
}

async function fetchJson(url: string) {
  const response = await fetch(url, { headers: BLOCKSCOUT_HEADERS });
  if (!response.ok) throw new Error(`Blockscout returned ${response.status}.`);
  return response.json();
}

async function fetchOwnedFromInstances(walletAddress: string) {
  const url = new URL(`${BLOCKSCOUT_API}/tokens/${IMPLINGZ_CONTRACT}/instances`);
  url.searchParams.set("holder_address_hash", walletAddress);
  const tokenIds = new Set<string>();

  for (let page = 0; page < 50; page += 1) {
    const data = await fetchJson(url.toString());
    for (const item of data.items ?? []) {
      if (item?.id) tokenIds.add(String(item.id));
    }
    if (!data.next_page_params) break;
    for (const [key, value] of Object.entries(data.next_page_params)) {
      if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  return tokenIds;
}

async function fetchOwnedFromInventory(walletAddress: string) {
  const url = new URL(`${BLOCKSCOUT_API}/addresses/${walletAddress}/nft`);
  url.searchParams.set("type", "ERC-721");
  const contract = IMPLINGZ_CONTRACT.toLowerCase();
  const tokenIds = new Set<string>();

  for (let page = 0; page < 50; page += 1) {
    const data = await fetchJson(url.toString());
    for (const item of data.items ?? []) {
      if (tokenContract(item) === contract && item?.id) tokenIds.add(String(item.id));
    }
    if (!data.next_page_params) break;
    for (const [key, value] of Object.entries(data.next_page_params)) {
      if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  return tokenIds;
}

async function fetchOwnedFromTransfers(walletAddress: string) {
  const owned = new Set<string>();
  const wallet = walletAddress.toLowerCase();

  for (let page = 1; page <= 50; page += 1) {
    const url = new URL("https://robinhoodchain.blockscout.com/api");
    url.searchParams.set("module", "account");
    url.searchParams.set("action", "tokennfttx");
    url.searchParams.set("contractaddress", IMPLINGZ_CONTRACT);
    url.searchParams.set("address", walletAddress);
    url.searchParams.set("page", String(page));
    url.searchParams.set("offset", "100");
    url.searchParams.set("sort", "asc");
    const data = await fetchJson(url.toString());
    if (!Array.isArray(data.result) || data.message !== "OK") {
      throw new Error("Blockscout transfer inventory is unavailable.");
    }
    const rows = data.result;
    if (rows.length === 0) break;

    for (const row of rows) {
      const tokenId = String(row.tokenID ?? "");
      if (!tokenId) continue;
      if (String(row.to || "").toLowerCase() === wallet) owned.add(tokenId);
      if (String(row.from || "").toLowerCase() === wallet) owned.delete(tokenId);
    }
    if (rows.length < 100) break;
  }

  return owned;
}

async function fetchOwnedTokenIds(walletAddress: string) {
  const lookups = [fetchOwnedFromInstances, fetchOwnedFromInventory, fetchOwnedFromTransfers];
  let lastError: unknown = null;
  let sawSuccess = false;
  let empty = new Set<string>();

  for (const lookup of lookups) {
    try {
      const tokenIds = await lookup(walletAddress);
      sawSuccess = true;
      if (tokenIds.size > 0) return tokenIds;
      empty = tokenIds;
    } catch (error) {
      lastError = error;
    }
  }

  if (!sawSuccess) throw lastError ?? new Error("Could not load wallet IMPLINGz.");
  return empty;
}

async function countWalletHoldings(walletAddress: string) {
  return countTiersFromTokenIds(await fetchOwnedTokenIds(walletAddress));
}

function holdingsUnchanged(
  profile: { total_implingz?: number; tier_1_count?: number; tier_2_count?: number; tier_3_count?: number },
  counts: ReturnType<typeof emptyCounts>,
) {
  return (
    Number(profile.total_implingz ?? 0) === counts.total_implingz &&
    Number(profile.tier_1_count ?? 0) === counts.tier_1_count &&
    Number(profile.tier_2_count ?? 0) === counts.tier_2_count &&
    Number(profile.tier_3_count ?? 0) === counts.tier_3_count
  );
}

async function mapPool<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, worker));
  return results;
}

async function verifyAvatarOwnership(walletAddress: string, tokenId: string | null) {
  if (!tokenId) return true;

  const numericTokenId = BigInt(tokenId);
  if (numericTokenId < 1n || numericTokenId > 2222n) return false;

  const encodedTokenId = numericTokenId.toString(16).padStart(64, "0");
  const response = await fetch(ROBINHOOD_RPC, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; j00ba.xyz/community-profiles)",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [
        {
          to: IMPLINGZ_CONTRACT,
          data: `${OWNER_OF_SELECTOR}${encodedTokenId}`,
        },
        "latest",
      ],
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.result) return false;

  return `0x${result.result.slice(-40)}`.toLowerCase() === walletAddress;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const secretKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!secretKey || !supabaseUrl) {
    return json({ error: "Profile service is not configured." }, 500);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function applyHoldingsFloor(walletAddress: string, impzCount: number) {
    const floor = floorFromImpzCount(impzCount);
    const { data: account, error } = await supabase
      .from("adventurer_accounts")
      .select("xp,level")
      .eq("wallet_address", walletAddress)
      .maybeSingle();
    if (error) throw error;

    const currentXp = Math.max(0, Number(account?.xp ?? 0));
    const nextXp = Math.max(currentXp, floor.xp);
    const nextLevel = levelFromXp(nextXp);
    if (account && currentXp === nextXp && Number(account.level ?? 1) === nextLevel) return;

    if (!account) {
      const { error: insertError } = await supabase.from("adventurer_accounts").insert({
        wallet_address: walletAddress,
        xp: nextXp,
        level: nextLevel,
      });
      if (insertError) throw insertError;
      return;
    }

    const { error: updateError } = await supabase
      .from("adventurer_accounts")
      .update({
        xp: nextXp,
        level: nextLevel,
        updated_at: new Date().toISOString(),
      })
      .eq("wallet_address", walletAddress);
    if (updateError) throw updateError;
  }

  try {
    if (request.method === "GET") {
      const requestUrl = new URL(request.url);
      const wallet = requestUrl.searchParams.get("wallet")?.toLowerCase();
      let query = supabase
        .from("community_profiles")
        .select(PROFILE_COLUMNS)
        .order("created_at", { ascending: true });

      if (wallet) {
        if (!ADDRESS_PATTERN.test(wallet)) return json({ error: "Invalid wallet address." }, 400);
        query = query.eq("wallet_address", wallet);
      }

      const { data, error } = await query;
      if (error) throw error;

      // List views must stay fast. Live Blockscout refresh is only for a single wallet.
      const refreshed = wallet
        ? await mapPool(data ?? [], 1, async (profile) => {
            try {
              const counts = await countWalletHoldings(profile.wallet_address);
              await applyHoldingsFloor(profile.wallet_address, counts.total_implingz);
              if (holdingsUnchanged(profile, counts)) return { ...profile, ...counts };
              const { data: updated, error: updateError } = await supabase
                .from("community_profiles")
                .update(counts)
                .eq("wallet_address", profile.wallet_address)
                .select(PROFILE_COLUMNS)
                .single();
              if (updateError) throw updateError;
              return updated;
            } catch (lookupError) {
              console.error("implingz holdings refresh failed", profile.wallet_address, lookupError);
              try {
                await applyHoldingsFloor(profile.wallet_address, Number(profile.total_implingz ?? 0));
              } catch (floorError) {
                console.error("holdings floor failed", profile.wallet_address, floorError);
              }
              return profile;
            }
          })
        : (data ?? []);

      const wallets = refreshed.map((profile) => profile.wallet_address);
      const accountByWallet = new Map();
      if (wallets.length > 0) {
        const { data: accounts, error: accountError } = await supabase
          .from("adventurer_accounts")
          .select("wallet_address,xp,level,active_adventures,created_at")
          .in("wallet_address", wallets);
        if (accountError) throw accountError;
        for (const account of accounts ?? []) {
          accountByWallet.set(String(account.wallet_address).toLowerCase(), account);
        }
      }

      return json({
        profiles: refreshed.map((profile) => {
          const account = accountByWallet.get(String(profile.wallet_address).toLowerCase());
          return {
            ...profile,
            xp: account?.xp ?? 0,
            level: account?.level ?? 1,
            active_adventures: account?.active_adventures ?? 0,
            created_at: profile.created_at ?? account?.created_at ?? null,
          };
        }),
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed." }, 405);
    }

    const body = await request.json();
    const action = String(body.action ?? "");
    const walletAddress = String(body.walletAddress ?? "").toLowerCase();

    if (!ADDRESS_PATTERN.test(walletAddress)) {
      return json({ error: "Invalid wallet address." }, 400);
    }

    if (action === "challenge") {
      const nonce = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const { error } = await supabase.from("profile_challenges").upsert(
        {
          wallet_address: walletAddress,
          nonce,
          expires_at: expiresAt,
        },
        { onConflict: "wallet_address" },
      );
      if (error) throw error;
      return json({ nonce, expiresAt });
    }

    if (action !== "save") {
      return json({ error: "Unknown action." }, 400);
    }

    const nickname = String(body.nickname ?? "").trim().slice(0, 24);
    const bio = String(body.bio ?? "").trim().slice(0, 240);
    const avatarTokenId = body.avatarTokenId ? String(body.avatarTokenId) : null;
    const nonce = String(body.nonce ?? "");
    const signature = String(body.signature ?? "");

    if (!NONCE_PATTERN.test(nonce) || !SIGNATURE_PATTERN.test(signature)) {
      return json({ error: "Invalid profile signature request." }, 400);
    }

    const { data: challenge, error: challengeError } = await supabase
      .from("profile_challenges")
      .select("nonce,expires_at")
      .eq("wallet_address", walletAddress)
      .eq("nonce", nonce)
      .maybeSingle();

    if (challengeError) throw challengeError;
    if (!challenge || new Date(challenge.expires_at).getTime() <= Date.now()) {
      return json({ error: "The signing request expired. Please try saving again." }, 401);
    }

    const signedProfile = { walletAddress, nickname, bio, avatarTokenId, nonce };
    const signatureValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message: canonicalMessage(signedProfile),
      signature: signature as `0x${string}`,
    });

    if (!signatureValid) {
      return json({ error: "Wallet signature verification failed." }, 401);
    }

    if (!(await verifyAvatarOwnership(walletAddress, avatarTokenId))) {
      return json({ error: "The selected profile IMPLINGZ is not held by this wallet." }, 403);
    }

    let counts = emptyCounts();
    try {
      counts = await countWalletHoldings(walletAddress);
    } catch (lookupError) {
      console.error("implingz holdings lookup failed", lookupError);
      const { data: existing } = await supabase
        .from("community_profiles")
        .select("total_implingz,tier_1_count,tier_2_count,tier_3_count")
        .eq("wallet_address", walletAddress)
        .maybeSingle();
      if (existing) {
        counts = {
          total_implingz: Number(existing.total_implingz ?? 0),
          tier_1_count: Number(existing.tier_1_count ?? 0),
          tier_2_count: Number(existing.tier_2_count ?? 0),
          tier_3_count: Number(existing.tier_3_count ?? 0),
        };
      }
    }
    await supabase.from("profile_challenges").delete().eq("wallet_address", walletAddress);

    const { data: profile, error: profileError } = await supabase
      .from("community_profiles")
      .upsert(
        {
          wallet_address: walletAddress,
          nickname,
          bio,
          avatar_token_id: avatarTokenId ? Number(avatarTokenId) : null,
          ...counts,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "wallet_address" },
      )
      .select(PROFILE_COLUMNS)
      .single();

    if (profileError) throw profileError;
    await applyHoldingsFloor(walletAddress, counts.total_implingz);
    return json({ profile });
  } catch (error) {
    console.error("community-profiles error", error);
    return json({ error: "The community profile service is temporarily unavailable." }, 500);
  }
});
