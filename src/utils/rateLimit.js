/**
 * Rate Limiting Utility
 * Simple client-side rate limiting to prevent abuse
 * Note: For production, implement server-side rate limiting
 */

const rateLimitStore = new Map();

/**
 * Check if an operation is allowed based on rate limit
 * @param {string} key - Unique key for the operation (e.g., 'profile_update_0x123...')
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - True if allowed, false if rate limited
 */
export function checkRateLimit(key, maxAttempts = 10, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  // Reset if window expired
  if (now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  // Check if limit exceeded
  if (record.count >= maxAttempts) {
    return false;
  }

  // Increment count
  record.count++;
  return true;
}

/**
 * Get remaining attempts for a rate limit key
 * @param {string} key - Rate limit key
 * @returns {number} - Remaining attempts (0 if rate limited)
 */
export function getRemainingAttempts(key, maxAttempts = 10) {
  const record = rateLimitStore.get(key);
  if (!record) return maxAttempts;
  
  const now = Date.now();
  if (now > record.resetAt) return maxAttempts;
  
  return Math.max(0, maxAttempts - record.count);
}

/**
 * Clear rate limit for a key (useful for testing or manual reset)
 * @param {string} key - Rate limit key
 */
export function clearRateLimit(key) {
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits() {
  rateLimitStore.clear();
}
