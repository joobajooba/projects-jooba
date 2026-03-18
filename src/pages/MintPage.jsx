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

  const traitTargets = useMemo(() => targets, [targets]);

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
            durationMs={2600}
            onComplete={() => {
              setIsSpinning(false);
              setStatusMessage('Done! (Mock) Your traits landed.');
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
    </div>
  );
}

