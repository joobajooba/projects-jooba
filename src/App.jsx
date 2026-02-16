import { ConnectButton } from '@rainbow-me/rainbowkit';
import './index.css';

export default function App() {
  return (
    <>
      <nav className="navbar">
        <div className="navbar-links">
          <a href="/">Home</a>
          <a href="/ape-projects/">APE-Projects</a>
          <a href="/games/">Games</a>
          <a href="/profile/">Profile</a>
        </div>
        <ConnectButton />
      </nav>
      <main className="home-main">
        <div className="home-content" />
        <div className="home-image-wrap">
          <img src="/Yuga_9419_heart.jpg" alt="Yuga 9419 heart" className="home-image" />
        </div>
      </main>
    </>
  );
}
