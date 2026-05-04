import WalletTopBarButton from './components/WalletTopBarButton';

export default function App() {
  return (
    <div className="app-blank-shell">
      <header className="app-blank-topbar" aria-label="Top bar">
        <WalletTopBarButton />
      </header>
      <main className="app-blank-main" aria-label="Content" />
    </div>
  );
}
