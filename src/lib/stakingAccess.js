export const STAKING_TESTER_WALLET = '0xfe9d3889b5e36b3216a756e0c752220dbf24dac8';

export const STAKING_TESTER_WALLETS = [
  STAKING_TESTER_WALLET,
  '0xb05b214b21801c18b40be098782f32970d29cea1',
];

export function isStakingTesterWallet(address) {
  return STAKING_TESTER_WALLETS.includes(String(address || '').toLowerCase());
}

export function buildStakingAccessMessage(nonce) {
  return `IMPLINGz Staking Access\n${nonce}`;
}

export async function fetchStakingAccess() {
  const response = await fetch('/api/staking-gate', { credentials: 'same-origin' });
  const data = await response.json().catch(() => ({}));
  return Boolean(response.ok && data.unlocked);
}
