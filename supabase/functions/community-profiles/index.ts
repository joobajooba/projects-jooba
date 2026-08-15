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
const IMPLINGZ_CONTRACT = "0x81d2d1f0e92285cdd22aa3cbc6956b6e1724d029";
const ROBINHOOD_RPC = "https://rpc.mainnet.chain.robinhood.com";
const BLOCKSCOUT_API = "https://robinhoodchain.blockscout.com/api/v2";
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

async function fetchOwnedTokenIds(walletAddress: string) {
  const url = new URL(`${BLOCKSCOUT_API}/tokens/${IMPLINGZ_CONTRACT}/instances`);
  url.searchParams.set("holder_address_hash", walletAddress);
  const tokenIds = new Set<string>();

  for (let page = 0; page < 50; page += 1) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Blockscout returned ${response.status}.`);

    const data = await response.json();
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

async function countWalletHoldings(walletAddress: string) {
  return countTiersFromTokenIds(await fetchOwnedTokenIds(walletAddress));
}

async function verifyAvatarOwnership(walletAddress: string, tokenId: string | null) {
  if (!tokenId) return true;

  const numericTokenId = BigInt(tokenId);
  if (numericTokenId < 1n || numericTokenId > 2222n) return false;

  const encodedTokenId = numericTokenId.toString(16).padStart(64, "0");
  const response = await fetch(ROBINHOOD_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

      const profiles = [];
      for (const profile of data ?? []) {
        if ((profile.total_implingz ?? 0) > 0) {
          profiles.push(profile);
          continue;
        }

        const counts = await countWalletHoldings(profile.wallet_address);
        if (counts.total_implingz === 0) {
          profiles.push({ ...profile, ...counts });
          continue;
        }

        const { data: updated, error: updateError } = await supabase
          .from("community_profiles")
          .update(counts)
          .eq("wallet_address", profile.wallet_address)
          .select(PROFILE_COLUMNS)
          .single();
        if (updateError) throw updateError;
        profiles.push({
          ...updated,
        });
      }

      const wallets = profiles.map((profile) => profile.wallet_address);
      const accountByWallet = new Map();
      if (wallets.length > 0) {
        const { data: accounts, error: accountError } = await supabase
          .from("adventurer_accounts")
          .select("wallet_address,xp,level,active_adventures")
          .in("wallet_address", wallets);
        if (accountError) throw accountError;
        for (const account of accounts ?? []) {
          accountByWallet.set(account.wallet_address, account);
        }
      }

      return json({
        profiles: profiles.map((profile) => ({
          ...profile,
          xp: accountByWallet.get(profile.wallet_address)?.xp ?? 0,
          level: accountByWallet.get(profile.wallet_address)?.level ?? 1,
          active_adventures: accountByWallet.get(profile.wallet_address)?.active_adventures ?? 0,
        })),
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

    const counts = await countWalletHoldings(walletAddress);
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
    await supabase.from("adventurer_accounts").upsert(
      { wallet_address: walletAddress, updated_at: new Date().toISOString() },
      { onConflict: "wallet_address", ignoreDuplicates: true },
    );
    return json({ profile });
  } catch (error) {
    console.error("community-profiles error", error);
    return json({ error: "The community profile service is temporarily unavailable." }, 500);
  }
});
