# How to Use NFT Metadata

## Setup Complete! ✅

Metadata is now automatically saved when you select an NFT. Here's how to use it:

## 1. Run the Database Migration

First, run the SQL file to add metadata columns:
```sql
-- Run: supabase/migrations/add-nft-metadata-columns.sql in Supabase SQL Editor
```

## 2. Access Metadata in Your Code

### Example: Get Background Trait

```javascript
import { getTraitValue } from '../utils/nftMetadata';

// In your component
const background = getTraitValue(slotMetadata[0], "Background");
// Returns: "Blue", "Red", "Green", etc. or null

if (background === "Blue") {
  // Do something for blue background
  playAudio("/audio/blue.mp3");
}
```

### Example: Get All Traits

```javascript
import { getAllTraits } from '../utils/nftMetadata';

const traits = getAllTraits(slotMetadata[0]);
// Returns: { Background: "Blue", Hat: "Wizard", ... }

console.log(traits.Background); // "Blue"
console.log(traits.Hat); // "Wizard"
```

### Example: Check if NFT Has Trait

```javascript
import { hasTrait } from '../utils/nftMetadata';

// Check if has Background trait
if (hasTrait(slotMetadata[0], "Background")) {
  // Has background trait
}

// Check if Background is specifically "Blue"
if (hasTrait(slotMetadata[0], "Background", "Blue")) {
  // Background is Blue
  playBlueAudio();
}
```

## 3. Metadata Structure

The metadata stored looks like this:

```javascript
{
  attributes: [
    { trait_type: "Background", value: "Blue" },
    { trait_type: "Hat", value: "Wizard" },
    { trait_type: "Eyes", value: "Angry" }
  ],
  name: "Cool NFT #123",
  description: "A cool NFT",
  tokenId: "123",
  contractAddress: "0x...",
  rawMetadata: { /* full original metadata */ }
}
```

## 4. Available State Variables

In `Profile.jsx`, you now have access to:

- `slotMetadata` - Array of metadata for each NFT slot `[metadata1, metadata2, ...]`
- `profilePictureMetadata` - Metadata for the profile picture NFT

## 5. Example: Trait-Based Audio

```javascript
import { getTraitValue } from '../utils/nftMetadata';

// When displaying NFT slot
{slotMetadata.map((metadata, index) => {
  if (!metadata) return null;
  
  const background = getTraitValue(metadata, "Background");
  const audioUrl = background ? `/audio/backgrounds/${background.toLowerCase()}.mp3` : null;
  
  return (
    <div key={index}>
      <img src={slotUrls[index]} />
      {audioUrl && (
        <audio src={audioUrl} controls />
      )}
    </div>
  );
})}
```

## Next Steps

1. ✅ Metadata is automatically saved when selecting NFTs
2. ✅ Run the SQL migration to add database columns
3. ✅ Use the utility functions to extract traits
4. 🎵 Create your trait-to-audio mapping (see TRAIT_AUDIO_SETUP.md)
5. 🎵 Build your audio player component
