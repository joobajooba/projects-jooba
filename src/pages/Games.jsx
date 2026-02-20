import { useNavigate } from 'react-router-dom';

export default function Games() {
  const navigate = useNavigate();

  return (
    <main className="games-main">
      <div className="games-container">
        <div className="games-box-outer">
          <div className="games-box" onClick={() => navigate('/games/wordle')} style={{ cursor: 'pointer' }}>
            <span className="games-box-title">Wordle</span>
            <div className="games-box-image-wrap">
              <img src="/wordle.png" alt="Wordle" className="games-box-image" />
            </div>
          </div>
        </div>
        <div className="games-box-outer">
          <div className="games-box" onClick={() => navigate('/games/connections')} style={{ cursor: 'pointer' }}>
            <span className="games-box-title">Connections</span>
            <div className="games-box-image-wrap">
              <img src="/9419_Connections.png" alt="9419 Connections" className="games-box-image" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
