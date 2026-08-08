import { useState, useMemo } from 'react';
import collectionData from '../data/collection.json';

const TRAIT_CATEGORIES = ['Background', 'Body', 'Head', 'Back', 'Clothing', 'Eyes', 'Tier'];

export default function CollectionPage() {
  const [genSearch, setGenSearch] = useState('');
  const [raritySearch, setRaritySearch] = useState('');
  
  // Keep track of which traits are selected: { "Background": ["Obsidian", "Blue"], "Body": ["Red"] }
  const [selectedTraits, setSelectedTraits] = useState({});
  // Keep track of which trait accordion is open
  const [openCategories, setOpenCategories] = useState({
    Background: false,
    Body: false,
    Head: false,
    Back: false,
    Clothing: false,
    Eyes: false,
    Tier: false,
  });

  // Extract all unique trait values for the sidebar checkboxes
  const traitOptions = useMemo(() => {
    const options = {};
    TRAIT_CATEGORIES.forEach((cat) => {
      options[cat] = new Set();
    });

    collectionData.forEach((item) => {
      TRAIT_CATEGORIES.forEach((cat) => {
        if (item.attributes[cat]) {
          options[cat].add(item.attributes[cat]);
        }
      });
    });

    // Convert sets to sorted arrays
    const sortedOptions = {};
    Object.keys(options).forEach((cat) => {
      sortedOptions[cat] = Array.from(options[cat]).sort();
    });
    return sortedOptions;
  }, []);

  const toggleCategory = (cat) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleTraitChange = (category, value) => {
    setSelectedTraits((prev) => {
      const currentSelected = prev[category] || [];
      if (currentSelected.includes(value)) {
        // Remove it
        return {
          ...prev,
          [category]: currentSelected.filter((v) => v !== value),
        };
      } else {
        // Add it
        return {
          ...prev,
          [category]: [...currentSelected, value],
        };
      }
    });
  };

  // Filter the items based on search and selected traits
  const filteredItems = useMemo(() => {
    return collectionData.filter((item) => {
      // 1. Generation Number Search (Assuming Generation maps to token ID or is part of name)
      if (genSearch && !item.id.toString().includes(genSearch)) {
        return false;
      }

      // 2. Rarity Number Search (Assuming Rarity maps to Tier number)
      if (raritySearch) {
        const tierString = item.attributes['Tier'] || '';
        // E.g., if tierString is "Tier 1", checking if it includes the rarity search
        if (!tierString.includes(raritySearch)) {
          return false;
        }
      }

      // 3. Trait Checkboxes
      for (const cat of TRAIT_CATEGORIES) {
        const selectedInCat = selectedTraits[cat];
        if (selectedInCat && selectedInCat.length > 0) {
          if (!selectedInCat.includes(item.attributes[cat])) {
            return false;
          }
        }
      }

      return true;
    });
  }, [genSearch, raritySearch, selectedTraits]);

  return (
    <div className="collection-page">
      <div className="collection-page__sidebar">
        <h2 className="collection-sidebar__title">Filters</h2>
        
        <div className="collection-filter-group">
          <label className="collection-filter-label" htmlFor="gen-search">
            Generation Number
          </label>
          <input
            id="gen-search"
            className="collection-filter-input"
            type="number"
            placeholder="e.g. 1"
            value={genSearch}
            onChange={(e) => setGenSearch(e.target.value)}
          />
        </div>

        <div className="collection-filter-group">
          <label className="collection-filter-label" htmlFor="rarity-search">
            Rarity Number
          </label>
          <input
            id="rarity-search"
            className="collection-filter-input"
            type="number"
            placeholder="e.g. 1"
            value={raritySearch}
            onChange={(e) => setRaritySearch(e.target.value)}
          />
        </div>

        <div className="collection-traits">
          <h3 className="collection-traits__title">Traits</h3>
          {TRAIT_CATEGORIES.map((cat) => (
            <div key={cat} className={`trait-accordion ${openCategories[cat] ? 'trait-accordion--open' : ''}`}>
              <button
                type="button"
                className="trait-accordion__trigger"
                onClick={() => toggleCategory(cat)}
              >
                <span>{cat}</span>
                <span className="trait-accordion__icon">{openCategories[cat] ? '−' : '+'}</span>
              </button>
              
              {openCategories[cat] && (
                <div className="trait-accordion__content">
                  {traitOptions[cat].map((val) => {
                    const isChecked = (selectedTraits[cat] || []).includes(val);
                    return (
                      <label key={val} className="trait-checkbox-label">
                        <input
                          type="checkbox"
                          className="trait-checkbox-input"
                          checked={isChecked}
                          onChange={() => handleTraitChange(cat, val)}
                        />
                        <span className="trait-checkbox-text">{val}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="collection-page__main">
        <div className="collection-page__header">
          <h1 className="collection-page__title">IMPLINGz Collection</h1>
          <p className="collection-page__count">{filteredItems.length} items found</p>
        </div>
        
        <div className="collection-grid">
          {filteredItems.map((item) => (
            <div key={item.id} className="collection-card">
              <div className="collection-card__image-wrap">
                <img
                  className="collection-card__image"
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                />
              </div>
              <div className="collection-card__info">
                <p className="collection-card__id">#{item.id}</p>
                <h3 className="collection-card__name">{item.name}</h3>
                <p className="collection-card__tier">{item.attributes.Tier}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
