import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'adventures_gate';
const COOKIE_SECRET = process.env.ADVENTURES_GATE_SECRET || 'j00ba-adventures-gate-v1';

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

function expectedToken() {
  return createHmac('sha256', COOKIE_SECRET).update('adventures-unlocked').digest('hex');
}

function tokensMatch(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isUnlocked(request) {
  return tokensMatch(readCookie(request, COOKIE_NAME), expectedToken());
}

function expectedPassword() {
  return process.env.ADVENTURES_GATE_PASSWORD || [0, 1, 0, 1].map(String).join('');
}

function passwordMatches(submitted) {
  return tokensMatch(submitted, expectedPassword());
}

function setUnlockCookie(response) {
  const parts = [
    `${COOKIE_NAME}=${expectedToken()}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
  ];

  if (process.env.VERCEL) {
    parts.push('Secure');
  }

  response.setHeader('Set-Cookie', parts.join('; '));
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method === 'GET') {
    return response.status(200).json({ unlocked: isUnlocked(request) });
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  let body = request.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      body = {};
    }
  }

  const password = typeof body?.password === 'string' ? body.password : '';

  if (!passwordMatches(password)) {
    return response.status(401).json({ unlocked: false, error: 'Incorrect password.' });
  }

  setUnlockCookie(response);
  return response.status(200).json({ unlocked: true });
}
