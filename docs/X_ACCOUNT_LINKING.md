# X (Twitter) account linking – steps

This describes how to link a user’s X account to their wallet so the profile shows a **verified** X link (authentic user, not someone else’s username).

## What’s already in the app

- **Profile editor:** Under “Username” there is a **Connect to X** button.
- **OAuth start:** Clicking it (with `VITE_X_CLIENT_ID` set) redirects the user to X’s OAuth 2.0 authorize page with PKCE. Scopes used: `users.read`, `tweet.read`.
- **Callback route:** After the user approves, X redirects to `/auth/x/callback?code=...&state=...`. The app validates `state` and clears session storage; the **token exchange and saving the X user id** are left for you to implement.

## Steps to complete account linking with the X API

### 1. Create an app in the X Developer Portal

1. Go to [developer.x.com](https://developer.x.com) and sign in.
2. In the **Developer Console**, create a **Project** and an **App** (or use an existing app).
3. In the app’s **Settings**:
   - Turn on **OAuth 2.0**.
   - Set **Callback URL / Redirect URI** to your app’s callback, e.g.  
     `https://yourdomain.com/auth/x/callback`  
     For local dev: `http://localhost:5173/auth/x/callback` (or your dev port).
   - You can add up to 10 callback URLs (e.g. dev + prod).
4. In **Keys and tokens**, copy the **OAuth 2.0 Client ID**.  
   For a **public client** (e.g. SPA), you use **only** the Client ID and PKCE (no Client Secret).  
   For a **confidential client** (e.g. server), you also get a Client Secret and use it when exchanging the code for a token.

### 2. Set the Client ID in the app

- In the project root, create or edit `.env`:
  - `VITE_X_CLIENT_ID=your_oauth2_client_id`
- Restart the dev server so Vite picks up the env.
- The “Connect to X” button will then redirect to X instead of opening the docs.

### 3. Implement the token exchange and user lookup

After the user is sent back to `/auth/x/callback` with `?code=...&state=...`:

1. **Validate `state`** (already done in the app) and read `code` from the URL.
2. **Exchange the code for tokens**  
   - **Public client (SPA):**  
     `POST https://api.twitter.com/2/oauth2/token`  
     Body (form):  
     `grant_type=authorization_code`, `code=...`, `redirect_uri=...` (same as used in the authorize request), `code_verifier=...` (from session storage; the app stored it before redirecting).  
     No Client Secret; PKCE proves the client.
   - **Confidential client (backend):**  
     Same request from your backend, and include Basic auth with Client ID and Client Secret (see X docs).
3. **Get the authenticated user**  
   - Use the **access token** from the previous response:  
     `GET https://api.twitter.com/2/users/me`  
     Header: `Authorization: Bearer <access_token>`
   - The response includes the X **user id** (and username). Store the **id** in your DB; it’s stable and proves the account.
4. **Link to the wallet**  
   - You have the wallet from session storage (`x_oauth_wallet`).  
   - Save in your DB: “this wallet is linked to this X user id”.  
   - Only allow one X account per wallet (and optionally one wallet per X account) so it’s clear who owns the link.

### 4. Store the X user id in your database

- Add a column to your user table, e.g. `x_twitter_id TEXT` (nullable).
- When the callback completes the exchange and gets `users/me`, update the row for the current wallet:  
  `UPDATE user_data SET x_twitter_id = :id WHERE wallet_address = :wallet`.
- Expose this via your existing API (e.g. Supabase `updateUserProfile` or a small backend/Edge Function that accepts the X user id only after you’ve verified the token and `users/me`).

### 5. Show “X linked” on the profile

- When loading a profile, if `x_twitter_id` (and optionally username from X) is set, show the X handle as a verified link (e.g. “X | @handle” linking to `https://x.com/username`) instead of static text.

## Why this is “authentic” and not someone else’s username

- The user signs in **on X** and approves your app. X then gives you an **access token** only for that user.
- Calling `GET /2/users/me` with that token returns **that** user’s id and username. You store the **id** (and optionally the handle) and associate it with the wallet.
- So the link is “this wallet connected their real X account”; nobody can claim another person’s handle without logging into that X account.

## References

- [OAuth 2.0 Authorization Code with PKCE – X](https://developer.x.com/en/docs/authentication/oauth-2-0/authorization-code)
- [User lookup – X API](https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users-me)
