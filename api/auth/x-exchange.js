import { createClient } from '@supabase/supabase-js';

/**
 * Server-side X OAuth token exchange and Supabase update.
 * Called by the /auth/x/callback page to avoid CORS (Twitter blocks browser token requests).
 *
 * POST body: { code, code_verifier, wallet, redirect_uri }
 * Env: VITE_X_CLIENT_ID, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { code, code_verifier, wallet, redirect_uri } = body || {};
    if (!code || !code_verifier || !wallet || !redirect_uri) {
      return new Response(
        JSON.stringify({ error: 'Missing code, code_verifier, wallet, or redirect_uri' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const clientId = process.env.VITE_X_CLIENT_ID?.trim();
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'Server: VITE_X_CLIENT_ID not set' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        code_verifier: code_verifier,
        client_id: clientId,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return new Response(
        JSON.stringify({ error: 'Token exchange failed', details: errText }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'No access token from X' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const meRes = await fetch('https://api.twitter.com/2/users/me?user.fields=username', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!meRes.ok) {
      return new Response(
        JSON.stringify({ error: 'Could not load X user' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const meData = await meRes.json();
    const xId = meData.data?.id;
    const xUsername = meData.data?.username ?? null;
    if (!xId) {
      return new Response(
        JSON.stringify({ error: 'X user data missing' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Server: Supabase not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const normalizedWallet = String(wallet).toLowerCase();
    const { error: updateError } = await supabase
      .from('user_data')
      .upsert(
        { wallet_address: normalizedWallet, x_twitter_id: xId, x_username: xUsername },
        { onConflict: 'wallet_address' }
      );

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to save X link', details: updateError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, username: xUsername }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
