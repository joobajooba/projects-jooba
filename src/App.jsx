import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Routes, Route, NavLink } from 'react-router-dom';
import { useSyncWalletToSupabase } from './hooks/useSyncWalletToSupabase';
import Home from './pages/Home';
import Games from './pages/Games';
import './index.css';

export default function App() {
  // Automatically sync connected wallet to Supabase
  useSyncWalletToSupabase();

  return (
    <>
      <nav className="navbar">
        <div className="navbar-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/ape-projects/">APE-Projects</NavLink>
          <NavLink to="/games/">Games</NavLink>
          <NavLink to="/profile/">Profile</NavLink>
        </div>
        <ConnectButton />
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/games/" element={<Games />} />
        <Route path="/ape-projects/" element={<main className="games-main"><p>APE-Projects</p></main>} />
        <Route path="/profile/" element={<main className="games-main"><p>Profile</p></main>} />
      </Routes>
    </>
  );
}
