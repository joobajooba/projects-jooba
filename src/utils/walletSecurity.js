/**
 * Wallet Security Utilities
 * Provides functions to verify wallet ownership and secure operations
 */

import { verifyMessage } from 'viem';
import { useAccount } from 'wagmi';

/**
 * Generate a message for the user to sign
 * This proves they own the wallet
 */
export function generateAuthMessage(walletAddress, timestamp) {
  return `Sign this message to authenticate with j00ba.xyz\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\n\nThis signature proves you own this wallet.`;
}

/**
 * Verify a wallet signature
 * @param {string} address - The wallet address
 * @param {string} message - The message that was signed
 * @param {string} signature - The signature to verify
 * @returns {Promise<boolean>} - True if signature is valid
 */
export async function verifyWalletSignature(address, message, signature) {
  try {
    const recoveredAddress = await verifyMessage({
      address: address,
      message: message,
      signature: signature
    });
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Validate Ethereum address format
 */
export function isValidEthereumAddress(address) {
  if (!address || typeof address !== 'string') return false;
  return /^0x[a-fA-F0-9]{40}$/i.test(address);
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input, maxLength = 100) {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength).replace(/[<>]/g, '');
}

/**
 * Validate URL
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Validate NFT metadata structure
 */
export function isValidNFTMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return false;
  
  // Check for required fields
  if (metadata.attributes && !Array.isArray(metadata.attributes)) return false;
  
  // Validate attributes structure
  if (metadata.attributes) {
    return metadata.attributes.every(attr => 
      attr && 
      (attr.trait_type || attr.traitType || attr.name) &&
      attr.value !== undefined
    );
  }
  
  return true;
}
