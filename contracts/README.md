# Dungeon contracts and $DERP pot

Robinhood Chain id `4663`. Gas is **ETH**, not $DERP.
$DERP token: `0x6543b7746ca744c4bb2198191e71f40ff04c41b9`

## Product loop

1. Start an adventure on j00ba.xyz with owned IMPLINGz.
2. Prompts can award wallet XP. A small $DERP drip may come from a funded pot.
3. A winning hash can be minted as an Imp Keep, or walked away from.
4. Minting is a free voucher mint. The player signs the keep contract and pays ETH gas.
5. Supply is 2222. Chapter 1 ends when keep 2222 is minted.
6. OpenSea reads `tokenURI` / `contractURI` and shows the revealed dungeon.
7. Holders list and trade keeps on OpenSea in ETH / WETH.

`KeepMarket.sol` is unused. Do not deploy it for this route.

## Deploy the $DERP pot only

This does **not** deploy DungeonKeep. It deploys `DerpRewards` on Robinhood Chain and sets the hot wallet as operator.

```bash
forge script script/DeployDerpRewards.s.sol:DeployDerpRewards --rpc-url robinhood --broadcast
```

Required env:

- `DEPLOYER_PRIVATE_KEY` — deployer wallet with ETH on Robinhood Chain (`4663`)

Hardcoded in the script:

- `$DERP` token — `0x6543b7746ca744c4bb2198191e71f40ff04c41b9`
- hot wallet operator — `0x50f7838FA05B3B53722BdA926b84bB9cA6EDF791`

After broadcast, copy the `DerpRewards` address and set these on the Adventures edge function:

- `DERP_REWARDS_ADDRESS` — pot contract
- `DERP_OPERATOR_PRIVATE_KEY` — DERP HOT private key (never commit this)

## Deploy Imp Keeps (required for adventure minting)

This is the contract players call from Adventures. Do not deploy `KeepMarket`.

```bash
forge test
forge script script/DeployDungeonKeep.s.sol:DeployDungeonKeep --rpc-url robinhood --broadcast
```

Required env:

- `DEPLOYER_PRIVATE_KEY` — wallet with ETH on Robinhood Chain (`4663`)

Optional env (defaults in the script):

- `MINT_SIGNER` — defaults to hot wallet `0x50f7838FA05B3B53722BdA926b84bB9cA6EDF791`
- `DUNGEON_BASE_URI` — defaults to `https://j00ba.xyz/api/keep/`
- `DUNGEON_CONTRACT_URI` — defaults to `https://j00ba.xyz/api/keep-collection`

Royalty receiver is hardcoded to `0x53391bf6931E3a8d829029b2a7640f3213cF6C94` at 8% EIP-2981.

The mint signer **private key** must be set on the Adventures edge function as `DUNGEON_MINT_SIGNER_KEY`. That key’s address must equal `mintSigner` on the contract.

After broadcast, copy the `DungeonKeep` address and set:

Vercel:

- `VITE_DUNGEON_KEEP_ADDRESS` — `0x639061b01ab4261b4283a0AC9D3bB8B99013Bad4`
- `DUNGEON_KEEP_ADDRESS` — same
- `SITE_URL` — `https://j00ba.xyz`

Adventures edge function:

- `DUNGEON_KEEP_ADDRESS` — `0x639061b01ab4261b4283a0AC9D3bB8B99013Bad4`
- `DUNGEON_MINT_SIGNER_KEY` — private key of `0x53391bf6931E3a8d829029b2a7640f3213cF6C94`

Live Imp Keeps (Robinhood 4663): `0x639061b01ab4261b4283a0AC9D3bB8B99013Bad4`
Deploy tx: `0xd409cb4738f885e5d50b5b4d276d098915bb3c28564b1368a2d807dbacf63b54`

Then redeploy the site. Find a keep in Adventures and use Mint dungeon — the wallet pays ETH gas only.

## Deploy DungeonKeep + DerpRewards together

```bash
forge script script/Deploy.s.sol:Deploy --rpc-url robinhood --broadcast
```

Required env:

- `DEPLOYER_PRIVATE_KEY` — wallet with ETH on Robinhood Chain
- `MINT_SIGNER` — address that will sign dungeon mint vouchers
- `DERP_TOKEN` — `0x6543b7746ca744c4bb2198191e71f40ff04c41b9`
- `DUNGEON_BASE_URI` — `https://j00ba.xyz/api/keep/`
- `DUNGEON_CONTRACT_URI` — `https://j00ba.xyz/api/keep-collection`
- `CREATOR_WALLET` — `0x53391bf6931E3a8d829029b2a7640f3213cF6C94`

After deploy, open the collection on OpenSea and confirm logo, description, and creator fees.

## Fund the $DERP pot

Adventure drips only send $DERP already sitting in `DerpRewards`. OpenSea keep sales pay the seller in ETH / WETH. They do not auto-convert to $DERP.

OpenSea creator earnings on IMPLINGz (and later on keeps) still arrive as ETH on `0x53391bf6931E3a8d829029b2a7640f3213cF6C94`.

1. Swap some of those earnings to $DERP.
2. Approve the `DerpRewards` contract, then call `fund(amount)`.
3. Drips of 20–40 $DERP during adventures are sent from this pot. If it is empty, drops are skipped.

Do not mint $DERP. The token has no mint function.
