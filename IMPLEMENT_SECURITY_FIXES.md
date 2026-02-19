# Step-by-Step Security Implementation Guide

## ⚠️ CRITICAL: Your Database Has Security Vulnerabilities

Based on the audit, here are the immediate actions needed:

## Phase 1: Database Security (Do This First) 🔴

### Step 1: Fix RLS Policies
1. Open Supabase Dashboard → SQL Editor
2. Run `SECURITY_FIXES.sql` 
3. **VERIFY** policies are correct:
   ```sql
   SELECT tablename, policyname, cmd, roles 
   FROM pg_policies 
   WHERE schemaname = 'public' 
   ORDER BY tablename, cmd;
   ```

### Step 2: Test Security
After running fixes, test:
- ❌ Try updating another user's profile (should fail)
- ❌ Try inserting Wordle game for different wallet (should fail)
- ✅ Update your own profile (should work)
- ✅ Insert your own Wordle game (should work)

## Phase 2: Application Security (Do This Next) 🟡

### Step 1: Add Wallet Signature Verification

**Update Profile.jsx:**
```javascript
import { verifyWalletSignature, generateAuthMessage } from '../utils/walletSecurity';

// Before any database update, verify wallet ownership
const verifyOwnership = async () => {
  const message = generateAuthMessage(address, Date.now());
  // Request signature from wallet
  const signature = await signMessage({ message });
  const isValid = await verifyWalletSignature(address, message, signature);
  if (!isValid) {
    throw new Error('Wallet signature verification failed');
  }
  return true;
};

// Use before updates
await verifyOwnership();
await supabase.from('users').update(...);
```

### Step 2: Add Input Validation

**Update all input handlers:**
```javascript
import { sanitizeInput, isValidUrl, isValidEthereumAddress } from '../utils/walletSecurity';

// Validate before saving
const sanitizedUsername = sanitizeInput(username, 50);
if (!sanitizedUsername) {
  alert('Invalid username');
  return;
}

// Validate URLs
if (imageUrl && !isValidUrl(imageUrl)) {
  alert('Invalid URL');
  return;
}
```

### Step 3: Add Rate Limiting

**Create Supabase Edge Function or use Netlify Functions:**
```javascript
// netlify/functions/rate-limit.js
const rateLimit = new Map();

export const handler = async (event) => {
  const wallet = event.headers['x-wallet-address'];
  const key = `update_${wallet}`;
  const count = rateLimit.get(key) || 0;
  
  if (count >= 10) {
    return { statusCode: 429, body: 'Rate limit exceeded' };
  }
  
  rateLimit.set(key, count + 1);
  setTimeout(() => rateLimit.delete(key), 60000); // 1 minute
  
  return { statusCode: 200 };
};
```

## Phase 3: Monitoring & Maintenance 🟢

### Step 1: Enable Supabase Audit Logs
- Go to Supabase Dashboard → Settings → Audit Logs
- Enable logging for all tables
- Set up alerts for suspicious activity

### Step 2: Add Security Headers
**Update `netlify.toml`:**
```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Strict-Transport-Security = "max-age=31536000"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.alchemy.com;"
```

### Step 3: Regular Security Reviews
- Weekly: Review database logs
- Monthly: Audit RLS policies
- Quarterly: Penetration testing

## Current Security Status

### ✅ What's Good:
- Using Supabase (handles SQL injection protection)
- RLS is enabled on tables
- Using HTTPS (Netlify)
- Environment variables for secrets

### ❌ What Needs Fixing:
- RLS policies are too permissive
- No wallet signature verification
- No rate limiting
- Limited input validation
- Storage policies allow public uploads

## Risk Assessment

**Current Risk Level: 🔴 HIGH**

**Attack Scenarios:**
1. Attacker modifies any user's profile → **POSSIBLE** (RLS allows it)
2. Attacker inserts fake game results → **POSSIBLE** (no verification)
3. Attacker uploads malicious files → **POSSIBLE** (public uploads)
4. Attacker impersonates wallets → **POSSIBLE** (no signature verification)
5. DoS attack via spam → **POSSIBLE** (no rate limiting)

**After Fixes:**
- Risk Level: 🟢 LOW
- All above attacks → **BLOCKED**

## Timeline

- **Today:** Fix RLS policies (30 minutes)
- **This Week:** Add signature verification (2-3 hours)
- **This Week:** Add rate limiting (2-3 hours)
- **Next Week:** Add monitoring (1-2 hours)

**Total Time:** ~8-10 hours to implement all critical fixes
