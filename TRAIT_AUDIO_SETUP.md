# NFT Trait-Based Audio Playback Setup

## Overview
Play different MP3 files based on NFT traits (e.g., background types).

## Architecture Components

### 1. **Trait Extraction**
NFTs from Alchemy/OpenSea include metadata with traits/attributes:
```javascript
nft.rawMetadata?.attributes // Array of {trait_type, value}
// Example: [{trait_type: "Background", value: "Blue"}, ...]
```

### 2. **Trait-to-Audio Mapping**
Create a configuration file mapping traits to MP3 URLs:

**`src/config/traitAudioMap.js`**
```javascript
export const traitAudioMap = {
  // Background trait → MP3 file
  "Background": {
    "Blue": "/audio/backgrounds/blue.mp3",
    "Red": "/audio/backgrounds/red.mp3",
    "Green": "/audio/backgrounds/green.mp3",
    "Purple": "/audio/backgrounds/purple.mp3",
    "Orange": "/audio/backgrounds/orange.mp3"
  },
  // Can add more trait types
  "Hat": {
    "Wizard": "/audio/hats/wizard.mp3",
    "Party": "/audio/hats/party.mp3"
  }
};
```

### 3. **Audio Storage Options**

**Option A: Public folder (simplest)**
- Place MP3s in `public/audio/backgrounds/`
- Accessible at `/audio/backgrounds/blue.mp3`

**Option B: Supabase Storage**
- Upload to Supabase Storage bucket
- Get public URLs, store in config

**Option C: CDN/Cloud Storage**
- AWS S3, Cloudflare R2, etc.
- Store URLs in config

### 4. **Implementation Steps**

#### Step 1: Extract traits when NFT is selected
```javascript
// In Profile.jsx or NFTSelector.jsx
const getTraitValue = (nft, traitType) => {
  const attributes = nft.rawMetadata?.attributes || 
                     nft.metadata?.attributes || 
                     [];
  const trait = attributes.find(attr => 
    attr.trait_type === traitType || 
    attr.traitType === traitType
  );
  return trait?.value || null;
};

// When NFT is selected
const handleNFTSelect = async (imageUrl, nftData) => {
  const background = getTraitValue(nftData, "Background");
  // Save NFT with metadata for later use
  await saveNFTToSlot(imageUrl, nftData);
};
```

#### Step 2: Store NFT metadata with slot URLs
**Database schema addition:**
```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS nft_slot_1_metadata JSONB,
ADD COLUMN IF NOT EXISTS nft_slot_2_metadata JSONB,
ADD COLUMN IF NOT EXISTS nft_slot_3_metadata JSONB,
ADD COLUMN IF NOT EXISTS nft_slot_4_metadata JSONB,
ADD COLUMN IF NOT EXISTS nft_slot_5_metadata JSONB;
```

#### Step 3: Create Audio Player Component
**`src/components/TraitAudioPlayer.jsx`**
```javascript
import { useEffect, useRef, useState } from 'react';
import { traitAudioMap } from '../config/traitAudioMap';

export default function TraitAudioPlayer({ nftMetadata, traitType = "Background" }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!nftMetadata) return;

    const attributes = nftMetadata.rawMetadata?.attributes || 
                       nftMetadata.metadata?.attributes || [];
    const trait = attributes.find(attr => 
      attr.trait_type === traitType || 
      attr.traitType === traitType
    );

    if (!trait || !traitAudioMap[traitType]) return;

    const audioUrl = traitAudioMap[traitType][trait.value];
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
    }
  }, [nftMetadata, traitType]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="trait-audio-player">
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <button onClick={togglePlay}>
        {isPlaying ? '⏸️ Pause' : '▶️ Play'}
      </button>
    </div>
  );
}
```

#### Step 4: Integrate into Profile Page
```javascript
// In Profile.jsx
import TraitAudioPlayer from '../components/TraitAudioPlayer';

// Store NFT metadata when selected
const [slotMetadata, setSlotMetadata] = useState([null, null, null, null, null]);

const handleSlotNFTSelect = async (imageUrl, slotIndex, nftData) => {
  // Save image URL
  await saveSlotImage(imageUrl, slotIndex);
  // Store metadata for audio
  setSlotMetadata(prev => {
    const next = [...prev];
    next[slotIndex] = nftData;
    return next;
  });
};

// In render, add audio player for each slot
{slotMetadata.map((metadata, i) => (
  metadata && (
    <TraitAudioPlayer 
      key={i} 
      nftMetadata={metadata} 
      traitType="Background"
    />
  )
))}
```

### 5. **Alternative: Auto-play on hover/select**
```javascript
// Auto-play when NFT slot is hovered/clicked
const handleSlotHover = (slotIndex) => {
  const metadata = slotMetadata[slotIndex];
  if (metadata) {
    const audioUrl = getAudioUrlFromTrait(metadata, "Background");
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  }
};
```

### 6. **File Structure**
```
public/
  audio/
    backgrounds/
      blue.mp3
      red.mp3
      green.mp3
      purple.mp3
      orange.mp3

src/
  components/
    TraitAudioPlayer.jsx
  config/
    traitAudioMap.js
```

## Database Updates Needed

```sql
-- Add metadata columns for each slot
ALTER TABLE users
ADD COLUMN IF NOT EXISTS nft_slot_1_metadata JSONB,
ADD COLUMN IF NOT EXISTS nft_slot_2_metadata JSONB,
ADD COLUMN IF NOT EXISTS nft_slot_3_metadata JSONB,
ADD COLUMN IF NOT EXISTS nft_slot_4_metadata JSONB,
ADD COLUMN IF NOT EXISTS nft_slot_5_metadata JSONB;
```

## Considerations

1. **MP3 File Size**: Keep files small (< 1MB) for web performance
2. **Browser Autoplay**: Most browsers block autoplay - require user interaction
3. **Multiple Audio**: Only play one at a time or use Web Audio API for mixing
4. **Caching**: Browser will cache MP3s after first load
5. **Fallback**: Handle missing traits/audio gracefully

## Next Steps

1. Create `traitAudioMap.js` config file
2. Add metadata storage to database
3. Update NFT selection to save metadata
4. Create TraitAudioPlayer component
5. Add audio files to `public/audio/`
6. Integrate player into Profile page
