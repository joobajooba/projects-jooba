import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import ProfilePage from './pages/ProfilePage';
import HomePage from './pages/HomePage';
import InfoPage from './pages/InfoPage';
import AdventuresPage from './pages/AdventuresPage';
import CollectionPage from './pages/CollectionPage';
import TheDungeonPage from './pages/TheDungeonPage';
import OfficialLinksPage from './pages/OfficialLinksPage';
import FaqsPage from './pages/FaqsPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<HomePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="info" element={<InfoPage />} />
          <Route path="adventures" element={<AdventuresPage />} />
          <Route path="collection" element={<CollectionPage />} />
          <Route path="the-dungeon" element={<TheDungeonPage />} />
          <Route path="official-links" element={<OfficialLinksPage />} />
          <Route path="faqs" element={<FaqsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
