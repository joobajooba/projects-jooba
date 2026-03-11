/**
 * X (Twitter) OAuth 2.0 with PKCE – start flow and build callback redirect URI.
 */

const X_AUTH_SCOPE = 'users.read tweet.read';
const X_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';

function generateRandomString(length = 43) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let s = '';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) s += chars[arr[i] % chars.length];
  return s;
}

function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function startXAuth(walletAddress) {
  const clientId = import.meta.env.VITE_X_CLIENT_ID?.trim();
  if (!clientId) {
    console.warn('VITE_X_CLIENT_ID not set');
    return false;
  }
  const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/auth/x/callback` : '';
  const state = generateRandomString(32);
  const codeVerifier = generateRandomString(64);
  const codeChallenge = base64UrlEncode(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
  );

  sessionStorage.setItem('x_oauth_state', state);
  sessionStorage.setItem('x_oauth_code_verifier', codeVerifier);
  sessionStorage.setItem('x_oauth_wallet', walletAddress || '');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: X_AUTH_SCOPE,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  window.location.href = `${X_AUTH_URL}?${params.toString()}`;
  return true;
}
