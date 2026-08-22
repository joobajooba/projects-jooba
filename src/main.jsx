import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import '@rainbow-me/rainbowkit/styles.css';
import App from './App';
import ProfilePage from './pages/ProfilePage';
import CommunityPage from './pages/CommunityPage';
import HallOfFamePage from './pages/HallOfFamePage';
import CommunityProfilePage from './pages/CommunityProfilePage';
import HomePage from './pages/HomePage';
import InfoPage from './pages/InfoPage';
import AdventuresGatePage from './pages/AdventuresGatePage';
import StakingGatePage from './pages/StakingGatePage';
import CollectionPage from './pages/CollectionPage';
import TheDungeonPage from './pages/TheDungeonPage';
import OfficialLinksPage from './pages/OfficialLinksPage';
import FaqsPage from './pages/FaqsPage';
import { wagmiConfig } from './walletConfig';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          theme={darkTheme({
            accentColor: '#b8ff2e',
            accentColorForeground: '#111',
            borderRadius: 'small',
          })}
        >
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />}>
                <Route index element={<HomePage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="community" element={<CommunityPage />} />
                <Route path="community/hall-of-fame" element={<HallOfFamePage />} />
                <Route path="community/:walletAddress" element={<CommunityProfilePage />} />
                <Route path="info" element={<InfoPage />} />
                <Route path="adventures" element={<AdventuresGatePage />} />
                <Route path="staking" element={<StakingGatePage />} />
                <Route path="collection" element={<CollectionPage />} />
                <Route path="the-dungeon" element={<TheDungeonPage />} />
                <Route path="official-links" element={<OfficialLinksPage />} />
                <Route path="faqs" element={<FaqsPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
