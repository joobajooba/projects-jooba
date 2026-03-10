import { Link } from 'react-router-dom';

function GameTile({ title, description, to }) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 16,
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(255,255,255,0.05)',
        textDecoration: 'none',
        color: 'rgba(255,255,255,0.92)',
        maxWidth: 340,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.02em' }}>{title}</div>
      <div style={{ fontSize: 13, opacity: 0.78, lineHeight: 1.35 }}>{description}</div>
    </Link>
  );
}

export default function GamesPage() {
  return (
    <div className="app-main-inner">
      <h1>Games</h1>
      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        <GameTile
          title="Wordle"
          description="Guess the hidden 5-letter word in 6 tries."
          to="/games/wordle"
        />
      </div>
    </div>
  );
}

