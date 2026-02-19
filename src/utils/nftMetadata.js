/**
 * Utility functions for working with NFT metadata
 */

/**
 * Extract a specific trait value from NFT metadata
 * @param {Object} metadata - NFT metadata object (from database)
 * @param {string} traitType - The trait type to extract (e.g., "Background", "Hat")
 * @returns {string|null} - The trait value or null if not found
 */
export function getTraitValue(metadata, traitType) {
  if (!metadata || !metadata.attributes) return null;
  
  const attributes = metadata.attributes || [];
  const trait = attributes.find(attr => 
    attr.trait_type === traitType || 
    attr.traitType === traitType ||
    attr.name === traitType
  );
  
  return trait?.value || null;
}

/**
 * Get all traits from NFT metadata as a key-value object
 * @param {Object} metadata - NFT metadata object
 * @returns {Object} - Object with trait types as keys and values as values
 */
export function getAllTraits(metadata) {
  if (!metadata || !metadata.attributes) return {};
  
  const traits = {};
  const attributes = metadata.attributes || [];
  
  attributes.forEach(attr => {
    const key = attr.trait_type || attr.traitType || attr.name;
    if (key) {
      traits[key] = attr.value;
    }
  });
  
  return traits;
}

/**
 * Check if NFT has a specific trait
 * @param {Object} metadata - NFT metadata object
 * @param {string} traitType - The trait type to check
 * @param {string} value - The value to check for (optional)
 * @returns {boolean}
 */
export function hasTrait(metadata, traitType, value = null) {
  const traitValue = getTraitValue(metadata, traitType);
  if (traitValue === null) return false;
  if (value === null) return true;
  return traitValue === value;
}

/**
 * Get NFT name/title from metadata
 * @param {Object} metadata - NFT metadata object
 * @returns {string|null}
 */
export function getNFTName(metadata) {
  return metadata?.name || metadata?.title || null;
}

/**
 * Get NFT description from metadata
 * @param {Object} metadata - NFT metadata object
 * @returns {string|null}
 */
export function getNFTDescription(metadata) {
  return metadata?.description || null;
}
