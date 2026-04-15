let audioCtx = null;
const STORAGE_KEY = 'jooba:sounds-muted';

function getCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

function readStoredMute() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

let pageSoundsMuted = readStoredMute();

export function isPageSoundsMuted() {
  return pageSoundsMuted;
}

export function setPageSoundsMuted(nextMuted) {
  pageSoundsMuted = Boolean(nextMuted);
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, pageSoundsMuted ? '1' : '0');
  } catch {}
}

/** Short mechanical-style tick; skipped when user prefers reduced motion. */
export function playClickSound() {
  if (typeof window === 'undefined') return;
  if (pageSoundsMuted) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;

  const ctx = getCtx();
  if (!ctx) return;

  const run = () => {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2400, t0);
    osc.frequency.exponentialRampToValueAtTime(520, t0 + 0.026);
    gain.gain.setValueAtTime(0.00001, t0);
    gain.gain.linearRampToValueAtTime(0.1, t0 + 0.0012);
    gain.gain.exponentialRampToValueAtTime(0.00001, t0 + 0.042);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.048);
  };

  if (ctx.state === 'suspended') {
    ctx.resume().then(run).catch(() => {});
  } else {
    run();
  }
}
