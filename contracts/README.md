# Dungeon contracts and $DERP pot

Robinhood Chain id `4663`. Gas is **ETH**, not $DERP.
$DERP token: `0x6543b7746ca744c4bb2198191e71f40ff04c41b9`

## Product loop

1. Start an adventure on j00ba.xyz with owned IMPLINGz.
2. Prompts can award wallet XP. A small $DERP drip may come from a funded pot.
3. A winning hash can be minted as a Lost Keep, or walked away from.
4. Minting is a free voucher mint. The player signs the keep contract and pays ETH gas.
5. Supply is 4444. Chapter 1 ends when keep 4444 is minted.
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

## Deploy

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

This deploys `DungeonKeep` and `DerpRewards` only. Transfers are unrestricted so OpenSea / Seaport can list and trade. On-chain royalty is 8% EIP-2981 to the creator wallet.

Then set on the Adventures edge function and Vercel:

- `DUNGEON_KEEP_ADDRESS`
- `DERP_REWARDS_ADDRESS`
- `VITE_DUNGEON_KEEP_ADDRESS`
- `SITE_URL` — `https://j00ba.xyz`

After deploy, open the collection on OpenSea and confirm logo, description, and creator fees.

## Fund the $DERP pot

Adventure drips only send $DERP already sitting in `DerpRewards`. OpenSea keep sales pay the seller in ETH / WETH. They do not auto-convert to $DERP.

OpenSea creator earnings on IMPLINGz (and later on keeps) still arrive as ETH on `0x53391bf6931E3a8d829029b2a7640f3213cF6C94`.

1. Swap some of those earnings to $DERP.
2. Approve the `DerpRewards` contract, then call `fund(amount)`.
3. Drips of 20–40 $DERP during adventures are sent from this pot. If it is empty, drops are skipped.

Do not mint $DERP. The token has no mint function.
