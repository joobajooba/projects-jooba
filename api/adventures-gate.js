import { createHmac, timingSafeEqual } from 'crypto';
import { verifyMessage } from 'viem';

const COOKIE_NAME = 'adventures_gate';
const COOKIE_SECRET = process.env.ADVENTURES_GATE_SECRET || 'j00ba-adventures-gate-v3';
/** Keep in sync with src/lib/adventuresChapter.js */
const ADVENTURES_CHAPTER1_OPENS_AT_MS = Date.parse('2026-08-22T20:00:00.000Z');
const ALLOWED_WALLETS = [
  '0xfe9d3889b5e36b3216a756e0c752220dbf24dac8',
  '0xb05b214b21801c18b40be098782f32970d29cea1',
];
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const SIGNATURE_PATTERN = /^0x[a-fA-F0-9]{130}$/;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function isChapter1Open(now = Date.now()) {
  return Number(now) >= ADVENTURES_CHAPTER1_OPENS_AT_MS;
}

function readCookie(request, name) {
  const header = request.headers.cookie;
  if (!header) return '';

  for (const part of header.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === name) {
      return decodeURIComponent(rawValue.join('=') || '');
    }
  }

  return '';
}

function tokensMatch(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function hmacValue(value) {
  return createHmac('sha256', COOKIE_SECRET).update(String(value)).digest('hex');
}

function isAllowedWallet(address) {
  if (isChapter1Open()) return true;
  const wallet = String(address || '').toLowerCase();
  return ALLOWED_WALLETS.some((allowed) => tokensMatch(wallet, allowed));
}

function expectedToken(wallet) {
  return hmacValue(`adventures-unlocked:${wallet}`);
}

function isUnlocked(request) {
  if (isChapter1Open()) return true;
  const cookie = readCookie(request, COOKIE_NAME);
  return ALLOWED_WALLETS.some((wallet) => tokensMatch(cookie, expectedToken(wallet)));
}

function accessMessage(nonce) {
  return `IMPLINGz Adventures Access\n${nonce}`;
}

function makeChallenge() {
  const issuedAt = String(Date.now());
  return `${issuedAt}.${hmacValue(`challenge:${issuedAt}`)}`;
}

function challengeValid(nonce) {
  const [issuedAt, signature] = String(nonce || '').split('.');
  if (!issuedAt || !signature) return false;
  if (!tokensMatch(signature, hmacValue(`challenge:${issuedAt}`))) return false;
  const age = Date.now() - Number(issuedAt);
  return Number.isFinite(age) && age >= 0 && age <= CHALLENGE_TTL_MS;
}

function setUnlockCookie(response, walletAddress) {
  const parts = [
    `${COOKIE_NAME}=${expectedToken(walletAddress)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=86400',
  ];

  if (process.env.VERCEL) {
    parts.push('Secure');
  }

  response.setHeader('Set-Cookie', parts.join('; '));
}

function parseBody(request) {
  let body = request.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      body = {};
    }
  }
  return body && typeof body === 'object' ? body : {};
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  const chapterOpen = isChapter1Open();

  if (request.method === 'GET') {
    return response.status(200).json({ unlocked: isUnlocked(request), chapterOpen });
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const body = parseBody(request);
  const action = String(body.action || 'unlock');

  if (action === 'challenge') {
    return response.status(200).json({ nonce: makeChallenge(), chapterOpen });
  }

  if (action !== 'unlock') {
    return response.status(400).json({ unlocked: false, error: 'Unknown action.' });
  }

  if (chapterOpen) {
    return response.status(200).json({ unlocked: true, chapterOpen: true });
  }

  const walletAddress = String(body.walletAddress || '').toLowerCase();
  const nonce = String(body.nonce || '');
  const signature = String(body.signature || '');

  if (!ADDRESS_PATTERN.test(walletAddress) || !isAllowedWallet(walletAddress)) {
    return response.status(403).json({ unlocked: false, error: 'This wallet cannot open Adventures.' });
  }
  if (!challengeValid(nonce) || !SIGNATURE_PATTERN.test(signature)) {
    return response.status(401).json({ unlocked: false, error: 'The access signature expired. Try again.' });
  }

  const signatureValid = await verifyMessage({
    address: walletAddress,
    message: accessMessage(nonce),
    signature,
  });

  if (!signatureValid) {
    return response.status(401).json({ unlocked: false, error: 'Wallet signature verification failed.' });
  }

  setUnlockCookie(response, walletAddress);
  return response.status(200).json({ unlocked: true, chapterOpen: false });
}
