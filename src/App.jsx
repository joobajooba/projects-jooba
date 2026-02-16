import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Routes, Route, NavLink } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useSyncWalletToSupabase } from './hooks/useSyncWalletToSupabase';
import ProfileDropdown from './components/ProfileDropdown';
import Home from './pages/Home';
import Games from './pages/Games';
import Profile from './pages/Profile';
import './index.css';

export default function App() {
  // Automatically sync connected wallet to Supabase
  useSyncWalletToSupabase();
  const { isConnected } = useAccount();

  return (
    <>
      <nav className="navbar">
        <div className="navbar-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/ape-projects/">APE-Projects</NavLink>
          <NavLink to="/games/">Games</NavLink>
          <NavLink to="/profile/">Profile</NavLink>
        </div>
        <div className="navbar-right">
          {isConnected && <ProfileDropdown />}
          <ConnectButton />
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/games/" element={<Games />} />
        <Route path="/ape-projects/" element={<main className="games-main"><p>APE-Projects</p></main>} />
        <Route path="/profile/" element={<Profile />} />
      </Routes>
    </>
  );
}
