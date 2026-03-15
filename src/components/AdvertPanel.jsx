import { useState, useEffect } from 'react';

const ADVERT_SLIDES = [
  { src: '/advert-notapunkscult.png', alt: 'Not a Punks Cult', href: 'https://opensea.io/collection/not-a-punks-cult' },
  { src: '/advert-demon-bros.png', alt: 'Demon Bros Gang', href: 'https://opensea.io/collection/demon-bros-gang' },
];

export default function AdvertPanel() {
  const [advertSlideIndex, setAdvertSlideIndex] = useState(0);
  const [pendingAdvertUrl, setPendingAdvertUrl] = useState(null);

  useEffect(() => {
    if (ADVERT_SLIDES.length <= 1) return;
    const id = setInterval(() => {
      setAdvertSlideIndex((i) => (i + 1) % ADVERT_SLIDES.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <aside
        className="flex-shrink-0 h-full bg-gray-900/80 border-l-2 border-gray-800 overflow-hidden flex flex-col -ml-px"
        style={{ width: '15%' }}
        aria-label="Advert"
      >
        <div className="relative w-full h-full min-h-0 overflow-hidden">
          <div
            className="flex h-full transition-transform duration-500 ease-in-out"
            style={{ width: `${ADVERT_SLIDES.length * 100}%`, transform: `translateX(-${(100 / ADVERT_SLIDES.length) * advertSlideIndex}%)` }}
          >
            {ADVERT_SLIDES.map((slide) => (
              <div
                key={slide.src}
                className="flex-shrink-0 flex items-center justify-center h-full"
                style={{ width: `${100 / ADVERT_SLIDES.length}%` }}
              >
                {slide.href ? (
                  <button
                    type="button"
                    onClick={() => setPendingAdvertUrl(slide.href)}
                    className="w-full h-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset cursor-pointer border-0 bg-transparent p-0"
                  >
                    <img
                      src={slide.src}
                      alt={slide.alt}
                      className="w-full h-full object-contain object-center pointer-events-none"
                    />
                  </button>
                ) : (
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    className="w-full h-full object-contain object-center"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>
      {pendingAdvertUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" aria-modal="true" role="dialog" onClick={() => setPendingAdvertUrl(null)}>
          <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-6 max-w-md mx-4 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-gray-100 font-medium mb-2">This URL will take you to OpenSea</p>
            <p className="text-indigo-400 text-sm break-all mb-6">{pendingAdvertUrl}</p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  window.open(pendingAdvertUrl, '_blank', 'noopener,noreferrer');
                  setPendingAdvertUrl(null);
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => setPendingAdvertUrl(null)}
                className="px-4 py-2 rounded-lg bg-gray-600 text-gray-100 font-medium hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
