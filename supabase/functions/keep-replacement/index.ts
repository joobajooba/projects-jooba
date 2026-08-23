import {
  createPublicClient,
  defineChain,
  http,
} from "npm:viem";
import { privateKeyToAccount } from "npm:viem/accounts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const IMPLINGZ_ADDRESS = "0x81D2D1f0e92285CdD22Aa3cbc6956B6E1724d029";
const KEEP_V1_ADDRESS = "0x639061b01ab4261b4283a0AC9D3bB8B99013Bad4";
const KEEP_V2_ADDRESS = "0x51eA8743109F1b9C70C9d1a9A56cCaA5C2877ee9";
const ROBINHOOD_RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
const REPLACEMENT = {
  wallet: "0xe1f381e1e7a32c75ac64fcfcb1c453628a1a5166",
  v1TokenId: 1947,
  miniBoss: "Bun Bun",
  seedHex: "0x0000244dc2ac4374ecf0f30773fb2415c5773b24c32df3f962f2533ffd54f060",
};
const ROBINHOOD_CHAIN = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [ROBINHOOD_RPC_URL] } },
});
const KEEP_V2_ABI = [
  {
    type: "function",
    name: "mintCursor",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "isAllowed",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "seedUsed",
    stateMutability: "view",
    inputs: [{ name: "seed", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
] as const;
const SEED_ABI = [
  {
    type: "function",
    name: "seedOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
] as const;
const BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

function chainClient() {
  const rpc = Deno.env.get("ROBINHOOD_RPC_URL")?.trim() || ROBINHOOD_RPC_URL;
  return createPublicClient({ chain: ROBINHOOD_CHAIN, transport: http(rpc) });
}

function keepV2Address() {
  return (Deno.env.get("DUNGEON_KEEP_V2_ADDRESS") || KEEP_V2_ADDRESS) as `0x${string}`;
}

function seedToHex(value: bigint) {
  return `0x${value.toString(16).padStart(64, "0")}`;
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

async function nextV2MintId(client: ReturnType<typeof chainClient>, keep: `0x${string}`) {
  let id = Number(
    await client.readContract({
      address: keep,
      abi: KEEP_V2_ABI,
      functionName: "mintCursor",
    }),
  );
  if (!Number.isFinite(id) || id < 1) id = 1;
  while (id <= 2222) {
    try {
      await client.readContract({
        address: keep,
        abi: KEEP_V2_ABI,
        functionName: "ownerOf",
        args: [BigInt(id)],
      });
      id += 1;
    } catch {
      return id;
    }
  }
  return 0;
}

async function replacementMintStatus(walletAddress = "") {
  const wallet = String(walletAddress || "").toLowerCase();
  if (wallet !== REPLACEMENT.wallet) return { replacement: null };

  const keepV1 = KEEP_V1_ADDRESS as `0x${string}`;
  const keepV2 = keepV2Address();
  const client = chainClient();
  const v1Seed = (await client.readContract({
    address: keepV1,
    abi: SEED_ABI,
    functionName: "seedOf",
    args: [BigInt(REPLACEMENT.v1TokenId)],
  })) as bigint;
  const seedHex = seedToHex(v1Seed);
  if (seedHex !== REPLACEMENT.seedHex) {
    return {
      replacement: {
        ...REPLACEMENT,
        seed: seedHex,
        previewUrl: `/api/dungeon-preview?seed=${encodeURIComponent(REPLACEMENT.seedHex)}&format=png&tokenId=${REPLACEMENT.v1TokenId}`,
        nextTokenId: 0,
        mintable: false,
        alreadyMinted: false,
        reason: "On-chain seed for keep #1947 did not match the reserved voucher.",
        contractAddress: keepV2,
      },
    };
  }

  const used = await client.readContract({
    address: keepV2,
    abi: KEEP_V2_ABI,
    functionName: "seedUsed",
    args: [v1Seed],
  });
  const paused = await client.readContract({
    address: keepV2,
    abi: KEEP_V2_ABI,
    functionName: "paused",
  });
  const nextTokenId = await nextV2MintId(client, keepV2);
  const allowed = nextTokenId
    ? await client.readContract({
        address: keepV2,
        abi: KEEP_V2_ABI,
        functionName: "isAllowed",
        args: [BigInt(nextTokenId)],
      })
    : false;
  const impBalance = await client.readContract({
    address: IMPLINGZ_ADDRESS as `0x${string}`,
    abi: BALANCE_ABI,
    functionName: "balanceOf",
    args: [wallet as `0x${string}`],
  });

  const alreadyMinted = Boolean(used);
  let mintable = false;
  let reason = "";
  if (alreadyMinted) reason = "This Bun Bun replacement has already been minted.";
  else if (paused) reason = "V2 minting is paused.";
  else if (impBalance === 0n) reason = "This wallet needs an IMPLINGz to mint.";
  else if (!nextTokenId) reason = "The restored collection is sold out.";
  else if (allowed) reason = `Waiting so this mint does not take honest keep #${nextTokenId}.`;
  else mintable = true;

  return {
    replacement: {
      wallet: REPLACEMENT.wallet,
      v1TokenId: REPLACEMENT.v1TokenId,
      miniBoss: REPLACEMENT.miniBoss,
      seed: seedHex,
      previewUrl: `/api/dungeon-preview?seed=${encodeURIComponent(seedHex)}&format=png&tokenId=${REPLACEMENT.v1TokenId}`,
      nextTokenId,
      mintable,
      alreadyMinted,
      reason,
      contractAddress: keepV2,
    },
  };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const wallet = url.searchParams.get("wallet")?.toLowerCase() ?? "";
      if (wallet && !ADDRESS_PATTERN.test(wallet)) return json({ error: "Invalid wallet address." }, 400);
      return json(await replacementMintStatus(wallet));
    }

    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

    const body = await request.json();
    const walletAddress = String(body.walletAddress ?? "").toLowerCase();
    if (!ADDRESS_PATTERN.test(walletAddress)) return json({ error: "Invalid wallet address." }, 400);

    const status = await replacementMintStatus(walletAddress);
    const replacement = status.replacement;
    if (!replacement) return json({ error: "No replacement keep is reserved for this wallet." }, 404);
    if (replacement.alreadyMinted) return json({ error: replacement.reason }, 409);
    if (!replacement.mintable) {
      return json({ error: replacement.reason || "This replacement cannot be minted yet." }, 409);
    }

    const deadline = Math.floor(Date.now() / 1000) + 15 * 60;
    const voucher = {
      wallet: replacement.wallet,
      seed: replacement.seed,
      deadline,
    };
    const message = `IMPLINGz Dungeon Mint\n${voucher.wallet}\n${voucher.seed}\n${voucher.deadline}`;
    const signerKey = normalizePrivateKey(Deno.env.get("DUNGEON_MINT_SIGNER_KEY"));
    if (!signerKey) return json({ error: "Mint signer is not configured." }, 500);
    const account = privateKeyToAccount(signerKey);
    const signature = await account.signMessage({ message });
    return json({
      voucher,
      message,
      signature,
      contractAddress: replacement.contractAddress,
      previewUrl: replacement.previewUrl,
      nextTokenId: replacement.nextTokenId,
    });
  } catch (error) {
    console.error("keep-replacement error", error);
    return json({ error: "The replacement mint service is temporarily unavailable." }, 500);
  }
});
