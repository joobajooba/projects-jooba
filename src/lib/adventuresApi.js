export const ADVENTURES_API =
  'https://jitkwbatwymqtlzxiyil.supabase.co/functions/v1/adventures';
export const KEEP_REPLACEMENT_API =
  'https://jitkwbatwymqtlzxiyil.supabase.co/functions/v1/keep-replacement';

const SESSION_STORAGE_KEY = 'implingz-adventure-sessions';

let sessionAuth = {
  walletAddress: '',
  signMessageAsync: null,
};

export function setAdventureSessionAuth({ walletAddress, signMessageAsync }) {
  sessionAuth = {
    walletAddress: String(walletAddress || '').toLowerCase(),
    signMessageAsync: signMessageAsync || null,
  };
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'The adventure service is unavailable.');
  }
  return data;
}

function readJsonStore(key) {
  const fromLocal = (() => {
    try {
      return JSON.parse(window.localStorage.getItem(key) || '{}');
    } catch {
      return {};
    }
  })();
  const fromSession = (() => {
    try {
      return JSON.parse(window.sessionStorage.getItem(key) || '{}');
    } catch {
      return {};
    }
  })();
  return { ...fromSession, ...fromLocal };
}

function writeJsonStore(key, value) {
  const encoded = JSON.stringify(value);
  window.localStorage.setItem(key, encoded);
  window.sessionStorage.removeItem(key);
}

function readStoredSecrets() {
  return readJsonStore(SESSION_STORAGE_KEY);
}

export function getSessionSecret(sessionId) {
  return readStoredSecrets()[sessionId] || '';
}

export function storeSessionSecret(sessionId, secret) {
  const secrets = readStoredSecrets();
  secrets[sessionId] = secret;
  writeJsonStore(SESSION_STORAGE_KEY, secrets);
}

export function clearSessionSecret(sessionId) {
  const secrets = readStoredSecrets();
  delete secrets[sessionId];
  writeJsonStore(SESSION_STORAGE_KEY, secrets);
}

export function normalizeAdventurePartyIds(partyTokenIds) {
  return [...new Set((Array.isArray(partyTokenIds) ? partyTokenIds : []).map((id) => String(id)))].slice(
    0,
    5
  );
}

export function buildAdventureStartMessage({ walletAddress, partyTokenIds, nonce }) {
  const party = normalizeAdventurePartyIds(partyTokenIds).join(', ');
  return [
    'IMPLINGz Adventure Start',
    '',
    `Wallet: ${String(walletAddress || '').toLowerCase()}`,
    `Party: ${party}`,
    `Nonce: ${nonce}`,
  ].join('\n');
}

export function buildAdventureControlMessage({ walletAddress, sessionId, action, nonce }) {
  return [
    'IMPLINGz Adventure Control',
    '',
    `Wallet: ${String(walletAddress || '').toLowerCase()}`,
    `Session: ${sessionId}`,
    `Action: ${action}`,
    `Nonce: ${nonce}`,
  ].join('\n');
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
  return {
    events: data.events ?? [],
    payouts: data.payouts ?? [],
  };
}

export async function requestAdventureChallenge(walletAddress, extra = {}) {
  return readResponse(
    await fetch(ADVENTURES_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'challenge', walletAddress, ...extra }),
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

async function ownerProof(action, sessionId) {
  const walletAddress = sessionAuth.walletAddress;
  if (!walletAddress || !sessionAuth.signMessageAsync) {
    throw new Error('Connect the adventure wallet to continue this session.');
  }

  const challenge = await requestAdventureChallenge(walletAddress, { sessionId, intent: action });
  if (!challenge.nonce) throw new Error('Could not start wallet verification.');

  const message =
    challenge.message ||
    buildAdventureControlMessage({
      walletAddress,
      sessionId,
      action,
      nonce: challenge.nonce,
    });
  if (!String(message).trim()) throw new Error('Could not prepare a wallet signature.');

  const signature = await sessionAuth.signMessageAsync({
    account: walletAddress,
    message,
  });

  return {
    walletAddress,
    nonce: challenge.nonce,
    signature,
  };
}

const OWNER_PROOF_ACTIONS = new Set([
  'discard',
  'abandon',
  'mint-voucher',
  'mark-minted',
  'prompt',
  'submit-hash',
]);

async function sessionAction(action, sessionId, extra = {}) {
  const secret = getSessionSecret(sessionId);
  const body = {
    action,
    sessionId,
    ...extra,
  };

  if (secret) {
    body.secret = secret;
  } else if (OWNER_PROOF_ACTIONS.has(action)) {
    Object.assign(body, await ownerProof(action, sessionId));
  } else {
    return null;
  }

  return readResponse(
    await fetch(ADVENTURES_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

export async function fetchKeepReplacement(walletAddress, { signal } = {}) {
  const url = new URL(KEEP_REPLACEMENT_API);
  if (walletAddress) url.searchParams.set('wallet', walletAddress);
  return readResponse(await fetch(url, { signal }));
}

export async function requestKeepReplacementMint(walletAddress) {
  return readResponse(
    await fetch(KEEP_REPLACEMENT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress }),
    })
  );
}
