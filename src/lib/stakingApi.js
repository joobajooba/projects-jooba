export const STAKING_API = 'https://jitkwbatwymqtlzxiyil.supabase.co/functions/v1/imp-staking';

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'The staking service is unavailable.');
  }
  return data;
}

export function buildStakeMessage({ walletAddress, canvasId, impTokenId, keepKeys, nonce }) {
  return `IMPLINGz ImpCoin Stake\n${JSON.stringify({
    walletAddress: walletAddress.toLowerCase(),
    action: 'stake',
    canvasId,
    impTokenId: String(impTokenId),
    keepKeys,
    nonce,
  })}`;
}

export function buildStakeControlMessage({ walletAddress, action, stakeId, nonce }) {
  return `IMPLINGz ImpCoin Stake\n${JSON.stringify({
    walletAddress: walletAddress.toLowerCase(),
    action,
    stakeId,
    nonce,
  })}`;
}

export async function fetchStakingState(walletAddress, { signal } = {}) {
  const url = new URL(STAKING_API);
  if (walletAddress) url.searchParams.set('wallet', walletAddress);
  return readResponse(await fetch(url, { signal }));
}

export async function requestStakeChallenge(walletAddress) {
  return readResponse(
    await fetch(STAKING_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'challenge', walletAddress }),
    })
  );
}

export async function submitStake(payload) {
  return readResponse(
    await fetch(STAKING_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stake', ...payload }),
    })
  );
}

export async function submitStakeControl({ action, walletAddress, stakeId, nonce, signature }) {
  return readResponse(
    await fetch(STAKING_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, walletAddress, stakeId, nonce, signature }),
    })
  );
}
