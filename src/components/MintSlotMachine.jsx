import { useEffect, useMemo, useRef, useState } from 'react';

function TraitPlaceholder({ label, theme }) {
  return (
    <div
      className={`w-full h-full flex items-center justify-center ${theme.placeholderBg} ${theme.placeholderText}`}
    >
      <span className="text-sm sm:text-base font-semibold tracking-wide">{label}</span>
    </div>
  );
}

function SlotReel({
  reelIndex,
  items,
  spinning,
  targetIndex,
  spinId,
  onReelSettled,
  theme,
  itemHeightPx = 84,
  visibleItems = 3,
  cycles = 7,
  durationMs = 2600,
}) {
  const itemCount = items.length;
  const viewportHeightPx = itemHeightPx * visibleItems;

  const [posIndex, setPosIndex] = useState(0);
  const [animate, setAnimate] = useState(false);

  const extendedItems = useMemo(() => {
    // Enough repeats so we never run out while spinning.
    const repeatCount = cycles + 5;
    const blocks = [];
    for (let r = 0; r < repeatCount; r++) blocks.push(...items);
    return blocks;
  }, [items, cycles]);

  useEffect(() => {
    if (!spinning) return;
    if (itemCount === 0) return;
    if (targetIndex == null) return;

    const centerOffset = Math.floor(visibleItems / 2); // 1 for visibleItems=3
    const topMod =
      (targetIndex - centerOffset + itemCount) % itemCount;
    const steps = cycles * itemCount + topMod;

    // Reset instantly without animation, then animate to the target.
    setAnimate(false);
    setPosIndex(0);

    const raf = requestAnimationFrame(() => {
      setAnimate(true);
      setPosIndex(steps);
    });

    const t = window.setTimeout(() => {
      setAnimate(false);
      onReelSettled?.(reelIndex, targetIndex);
    }, durationMs + 50);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [
    spinning,
    targetIndex,
    spinId,
    itemCount,
    reelIndex,
    visibleItems,
    cycles,
    durationMs,
    onReelSettled,
  ]);

  return (
    <div
      className="relative w-16 sm:w-20 flex-shrink-0 rounded-xl border border-gray-700 bg-gray-800/40 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
      style={{ height: viewportHeightPx }}
      aria-label={`Trait reel ${reelIndex + 1}`}
    >
      <div
        style={{
          transform: `translateY(${-posIndex * itemHeightPx}px)`,
          transition: animate ? `transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none',
          willChange: animate ? 'transform' : 'auto',
        }}
      >
        {extendedItems.map((item, idx) => (
          <div key={`${item.label}-${idx}`} style={{ height: itemHeightPx }}>
            <TraitPlaceholder label={item.label} theme={theme} />
          </div>
        ))}
      </div>

      {/* center highlight */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: 0,
          right: 0,
          top: itemHeightPx * Math.floor(visibleItems / 2),
          height: itemHeightPx,
          borderTop: `1px solid ${theme.borderRgba}`,
          borderBottom: `1px solid ${theme.borderRgba}`,
          boxShadow: `0 0 0 1px ${theme.ringInsetRgba} inset`,
        }}
      />
    </div>
  );
}

export default function MintSlotMachine({
  reelCount = 7,
  itemCount = 12,
  spinning,
  targets,
  spinId,
  onComplete,
  durationMs = 2600,
}) {
  const reels = useMemo(() => {
    // Placeholder "trait items" (swap later with real asset images + metadata-driven targets).
    return Array.from({ length: reelCount }, (_, reelIndex) =>
      Array.from({ length: itemCount }, (_, i) => ({
        label: `T${reelIndex + 1}-${i + 1}`,
      }))
    );
  }, [reelCount, itemCount]);

  const columnLabels = useMemo(
    () => ['BG', 'Fur', 'Eyes', 'Mouth', 'Head', 'Clothes', 'MP'],
    []
  );

  const themeByReelIndex = useMemo(() => {
    // Color scheme you requested:
    // 1 -> light blue, 2 -> purple, 3 -> gold (repeats every 3 reels).
    const lightBlue = {
      placeholderBg: 'bg-sky-900/40',
      placeholderText: 'text-sky-100',
      headerText: 'text-sky-200',
      borderRgba: 'rgba(56,189,248,0.85)',
      ringInsetRgba: 'rgba(56,189,248,0.18)',
    };
    const purple = {
      placeholderBg: 'bg-purple-900/40',
      placeholderText: 'text-purple-100',
      headerText: 'text-purple-200',
      borderRgba: 'rgba(168,85,247,0.88)',
      ringInsetRgba: 'rgba(168,85,247,0.18)',
    };
    const gold = {
      placeholderBg: 'bg-amber-900/40',
      placeholderText: 'text-amber-100',
      headerText: 'text-amber-200',
      borderRgba: 'rgba(245,158,11,0.92)',
      ringInsetRgba: 'rgba(245,158,11,0.2)',
    };

    return (reelIndex) => {
      const group = reelIndex % 3;
      if (group === 0) return lightBlue;
      if (group === 1) return purple;
      return gold;
    };
  }, []);

  const [settledCount, setSettledCount] = useState(0);
  const didCompleteSpinIdRef = useRef(null);

  useEffect(() => {
    if (!spinning) {
      setSettledCount(0);
      didCompleteSpinIdRef.current = null;
    }
  }, [spinning]);

  const handleReelSettled = (reelIndex, settledTargetIndex) => {
    setSettledCount((c) => c + 1);
  };

  useEffect(() => {
    if (!spinning) return;
    if (settledCount === reelCount) {
      if (didCompleteSpinIdRef.current === spinId) return;
      didCompleteSpinIdRef.current = spinId;
      onComplete?.(targets ?? []);
    }
  }, [settledCount, reelCount, spinning, onComplete, targets, spinId]);

  return (
    <div className="flex gap-6 items-center justify-center w-full overflow-x-auto">
      {reels.map((items, reelIndex) => {
        const label = columnLabels[reelIndex] ?? `T${reelIndex + 1}`;
        const theme = themeByReelIndex(reelIndex);

        return (
          <div key={reelIndex} className="flex flex-col items-center flex-shrink-0">
            <div
              className={`text-xs sm:text-sm font-semibold tracking-wide mb-2 text-center ${theme.headerText}`}
            >
              {label}
            </div>
            <SlotReel
              reelIndex={reelIndex}
              items={items}
              spinning={spinning}
              targetIndex={targets?.[reelIndex] ?? null}
              spinId={spinId}
              onReelSettled={handleReelSettled}
              theme={theme}
              itemHeightPx={110}
              visibleItems={3}
              durationMs={durationMs}
            />
          </div>
        );
      })}
    </div>
  );
}

