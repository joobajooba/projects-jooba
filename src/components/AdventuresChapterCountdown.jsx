import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ADVENTURES_CHAPTER1_OPENS_AT_MS,
  chapter1CountdownParts,
  padCountdownUnit,
} from '../lib/adventuresChapter';

function chapter1OpensLabel() {
  const date = new Date(ADVENTURES_CHAPTER1_OPENS_AT_MS);
  if (Number.isNaN(date.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hh = padCountdownUnit(date.getUTCHours());
  const mm = padCountdownUnit(date.getUTCMinutes());
  return `Opens ${hh}:${mm} UTC · ${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function AdventuresChapterCountdown() {
  const [parts, setParts] = useState(() => chapter1CountdownParts());

  useEffect(() => {
    const tick = () => setParts(chapter1CountdownParts());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (parts.closed) {
    return (
      <div className="home-countdown" aria-live="polite">
        <p className="home-countdown__title">Adventures Chapter 1</p>
        <p className="home-countdown__live">Paused</p>
      </div>
    );
  }

  if (parts.open) {
    return (
      <div className="home-countdown" aria-live="polite">
        <p className="home-countdown__title">Adventures Chapter 1</p>
        <p className="home-countdown__live">Now live</p>
        <Link className="home-countdown__link" to="/adventures">
          Enter Adventures
        </Link>
      </div>
    );
  }

  return (
    <div
      className="home-countdown"
      aria-live="polite"
      aria-label={`Adventures Chapter 1 opens in ${parts.hours} hours, ${parts.minutes} minutes, ${parts.seconds} seconds`}
    >
      <p className="home-countdown__title">Adventures Chapter 1</p>
      <div className="home-countdown__clock">
        <div className="home-countdown__unit">
          <span className="home-countdown__value">{padCountdownUnit(parts.hours)}</span>
          <span className="home-countdown__label">Hrs</span>
        </div>
        <span className="home-countdown__sep" aria-hidden="true">
          :
        </span>
        <div className="home-countdown__unit">
          <span className="home-countdown__value">{padCountdownUnit(parts.minutes)}</span>
          <span className="home-countdown__label">Minutes</span>
        </div>
        <span className="home-countdown__sep" aria-hidden="true">
          :
        </span>
        <div className="home-countdown__unit">
          <span className="home-countdown__value">{padCountdownUnit(parts.seconds)}</span>
          <span className="home-countdown__label">Seconds</span>
        </div>
      </div>
      <p className="home-countdown__meta">{chapter1OpensLabel()}</p>
    </div>
  );
}
