import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useSyncWalletToSupabase } from './hooks/useSyncWalletToSupabase';
import { EditProfileProvider } from './context/EditProfileContext';
import { UserProvider } from './context/UserContext';
import ProfileDropdown from './components/ProfileDropdown';
import EditProfilePanel from './components/EditProfilePanel';
import Home from './pages/Home';
import Games from './pages/Games';
import Wordle from './pages/Wordle';
import Connections from './pages/Connections';
import Profile2 from './pages/Profile2';
import Test from './pages/Test';
import './index.css';

export default function App() {
  const { pathname } = useLocation();
  const isTestPage = pathname === '/test';

  // Automatically sync connected wallet to Supabase
  useSyncWalletToSupabase();
  const { isConnected } = useAccount();

  return (
    <UserProvider>
      <EditProfileProvider>
        {!isTestPage && (
          <nav className="navbar">
            <div className="navbar-links">
              <NavLink to="/" end>Home</NavLink>
              <NavLink to="/ape-projects/">APE-Projects</NavLink>
              <NavLink to="/games/">Games</NavLink>
              <NavLink to="/profile2/">Profile</NavLink>
            </div>
            <div className="navbar-right">
              <ConnectButton />
              {isConnected && <ProfileDropdown />}
            </div>
          </nav>
        )}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/games/" element={<Games />} />
          <Route path="/games/wordle" element={<Wordle />} />
          <Route path="/games/connections" element={<Connections />} />
          <Route path="/ape-projects/" element={<main className="games-main"><p>APE-Projects</p></main>} />
          <Route path="/profile/" element={<Navigate to="/profile2/" replace />} />
          <Route path="/profile2/" element={<Profile2 />} />
          <Route path="/test" element={<Test />} />
        </Routes>
        {!isTestPage && <EditProfilePanel />}
      </EditProfileProvider>
    </UserProvider>
  );
}
