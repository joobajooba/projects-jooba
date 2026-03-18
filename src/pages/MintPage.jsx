import { useCallback, useMemo, useState } from 'react';
import MintSlotMachine from '../components/MintSlotMachine';

export default function MintPage() {
  const reelCount = 7;
  const itemCount = 12;

  const [isSigning, setIsSigning] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinId, setSpinId] = useState(0);
  const [targets, setTargets] = useState(Array.from({ length: reelCount }, () => 0));
  const [statusMessage, setStatusMessage] = useState('Ready to mint.');
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [mintResultsTargets, setMintResultsTargets] = useState(null);

  const traitTargets = useMemo(() => targets, [targets]);

  const traitCategories = useMemo(
    () => ['Background', 'Furr', 'Eyes', 'Mouth', 'Hat', 'Clothing', 'Sound Pack'],
    []
  );

  const traitLabelsByCategory = useMemo(() => {
    // Placeholder trait names until you add real trait metadata / images.
    return traitCategories.map((category) =>
      Array.from({ length: itemCount }, (_, i) => `${category} #${i + 1}`)
    );
  }, [traitCategories, itemCount]);

  const startSpin = useCallback((nextTargets) => {
    setTargets(nextTargets);
    setIsSpinning(true);
    setSpinId((id) => id + 1);
    setStatusMessage('Generating your traits...');
  }, []);

  const handleMintClick = useCallback(async () => {
    if (isSigning || isSpinning) return;

    // Placeholder: replace this with your real contract call + signature flow.
    setIsSigning(true);
    setStatusMessage('Awaiting signature...');

    await new Promise((r) => setTimeout(r, 1200));

    const nextTargets = Array.from({ length: reelCount }, () =>
      Math.floor(Math.random() * itemCount)
    );

    setIsSigning(false);
    setShowResultsModal(false);
    setMintResultsTargets(null);
    startSpin(nextTargets);
  }, [isSigning, isSpinning, itemCount, reelCount, startSpin]);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto">
      <div className="p-6 flex flex-col h-full min-h-0">
        <h1 className="text-xl font-semibold text-gray-100 mb-4 shrink-0">Mint</h1>

        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-6 px-2">
          <MintSlotMachine
            reelCount={reelCount}
            itemCount={itemCount}
            spinning={isSpinning}
            targets={traitTargets}
            spinId={spinId}
            durationMs={5600}
            onComplete={() => {
              setIsSpinning(false);
              setStatusMessage('Done! (Mock) Your traits landed.');
              setMintResultsTargets(targets);
              setShowResultsModal(true);
            }}
          />

          <div className="flex flex-col items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleMintClick}
              disabled={isSigning || isSpinning}
              className="w-full max-w-md px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-base border border-indigo-500 transition-colors"
            >
              {isSigning ? 'Signing...' : isSpinning ? 'Minting...' : 'Mint (demo)'}
            </button>
            <p className="text-sm text-gray-300 text-center">{statusMessage}</p>
          </div>
        </div>
      </div>

      {showResultsModal && mintResultsTargets && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          aria-modal="true"
          role="dialog"
          onClick={() => setShowResultsModal(false)}
        >
          <div
            className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-6 max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center">
              {/* Placeholder preview image until you have real minted assets */}
              <img
                src="/bops.png"
                alt="Minted NFT preview"
                className="w-full max-w-xs h-auto object-contain rounded-lg"
              />
              <h2 className="text-gray-100 font-semibold text-lg mt-4">
                Your Minted Traits
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {traitCategories.map((category, idx) => {
                const chosenIndex = mintResultsTargets?.[idx] ?? 0;
                const label = traitLabelsByCategory?.[idx]?.[chosenIndex] ?? `${category} #${chosenIndex + 1}`;
                return (
                  <div
                    key={category}
                    className="rounded-lg border border-gray-700 bg-gray-900/40 p-3"
                  >
                    <p className="text-gray-400 text-sm font-medium">{category}</p>
                    <p className="text-gray-100 font-semibold text-base">{label}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setShowResultsModal(false)}
                className="px-5 py-2 rounded-lg bg-gray-600 text-gray-100 font-medium hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

