import { ConnectButton } from '@rainbow-me/rainbowkit';
import FBXViewer from './FBXViewer';
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
      <main>
        <FBXViewer />
      </main>
    </>
  );
}
