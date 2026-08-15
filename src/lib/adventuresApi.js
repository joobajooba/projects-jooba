export const ADVENTURES_API =
  'https://jitkwbatwymqtlzxiyil.supabase.co/functions/v1/adventures';

const SESSION_STORAGE_KEY = 'implingz-adventure-sessions';

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'The adventure service is unavailable.');
  }
  return data;
}

function readStoredSecrets() {
  try {
    return JSON.parse(window.sessionStorage.getItem(SESSION_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getSessionSecret(sessionId) {
  return readStoredSecrets()[sessionId] || '';
}

export function storeSessionSecret(sessionId, secret) {
  const secrets = readStoredSecrets();
  secrets[sessionId] = secret;
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(secrets));
}

export function clearSessionSecret(sessionId) {
  const secrets = readStoredSecrets();
  delete secrets[sessionId];
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(secrets));
}

export function buildAdventureStartMessage({ walletAddress, partyTokenIds, nonce }) {
  return `IMPLINGz Adventure Start\n${JSON.stringify({
    walletAddress: walletAddress.toLowerCase(),
    partyTokenIds,
    nonce,
  })}`;
}

export async function fetchAdventurerAccount(walletAddress, { signal } = {}) {
  const url = new URL(ADVENTURES_API);
  if (walletAddress) url.searchParams.set('wallet', walletAddress);
  const data = await readResponse(await fetch(url, { signal }));
  return data;
}

export async function fetchAdventureBoard({ signal } = {}) {
  const url = new URL(ADVENTURES_API);
  url.searchParams.set('board', '1');
  const data = await readResponse(await fetch(url, { signal }));
  return data.events ?? [];
}

export async function requestAdventureChallenge(walletAddress) {
  return readResponse(
    await fetch(ADVENTURES_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'challenge', walletAddress }),
    })
  );
}

export async function startAdventureSession({
  walletAddress,
  partyTokenIds,
  nonce,
  signature,
}) {
  const data = await readResponse(
    await fetch(ADVENTURES_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        walletAddress,
        partyTokenIds,
        nonce,
        signature,
      }),
    })
  );

  if (data.session?.id && data.secret) {
    storeSessionSecret(data.session.id, data.secret);
  }

  return data;
}

async function sessionAction(action, sessionId, extra = {}) {
  const secret = getSessionSecret(sessionId);
  if (!secret) throw new Error('This adventure session is no longer available in this browser.');

  return readResponse(
    await fetch(ADVENTURES_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        sessionId,
        secret,
        ...extra,
      }),
    })
  );
}

export function resolveAdventurePrompt(sessionId, { encounterIndex, optionKey }) {
  return sessionAction('prompt', sessionId, { encounterIndex, optionKey });
}

export function reportMiningProgress(sessionId, hashesChecked) {
  return sessionAction('mine-progress', sessionId, { hashesChecked });
}

export function submitWinningHash(sessionId, { nonce, hash }) {
  return sessionAction('submit-hash', sessionId, { nonce, hash });
}

export function discardFoundDungeon(sessionId) {
  return sessionAction('discard', sessionId);
}

export function requestDungeonMint(sessionId) {
  return sessionAction('mint-voucher', sessionId);
}

export function markDungeonMinted(sessionId, tokenId) {
  return sessionAction('mark-minted', sessionId, { tokenId });
}

export function abandonAdventure(sessionId) {
  return sessionAction('abandon', sessionId);
}
