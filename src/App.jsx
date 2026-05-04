import WalletTopBarButton from './components/WalletTopBarButton';

export default function App() {
  return (
    <div className="app-only-shell">
      <div className="app-only-toprow">
        <div className="app-only-wallet">
          <WalletTopBarButton connectLabel="Connect wallet" />
        </div>
      </div>
    </div>
  );
}
