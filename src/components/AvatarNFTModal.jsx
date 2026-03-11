import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import AvatarNFTSelector from './AvatarNFTSelector';

export default function AvatarNFTModal({ isOpen, onClose, value, onSelect, onSelectNft }) {
  if (!isOpen) return null;

  const handleSelect = (nft) => {
    if (onSelectNft) {
      onSelectNft(nft);
    } else {
      onSelect(nft?.image);
    }
    onClose();
  };

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
          <h2 id="avatar-modal-title" className="text-lg font-semibold text-gray-100">
            Select NFT avatar
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-auto min-h-0">
          <AvatarNFTSelector
            value={typeof value === 'string' ? value : value?.image}
            onChange={handleSelect}
            variant="modal"
          />
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
