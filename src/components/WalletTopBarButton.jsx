import { useEffect, useRef, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { useWalletDisplayCurrency } from '../hooks/useWalletDisplayCurrency';
import { useWalletMenuBalance } from '../hooks/useWalletMenuBalance';
import { useWalletProfile } from '../hooks/useWalletProfile';
import WalletAccountMenu from './WalletAccountMenu';
import WalletNftAvatarModal from './WalletNftAvatarModal';
import WalletUsernameModal from './WalletUsernameModal';

function IconChevronDown() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function WalletTopBarButton() {
  return (
    <ConnectButton.Custom>
      {(ctx) => <WalletTopBarInner {...ctx} />}
    </ConnectButton.Custom>
  );
}

function WalletTopBarInner({ account, chain, mounted, openConnectModal, openChainModal }) {
  const pillRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [nftPickerOpen, setNftPickerOpen] = useState(false);
  const { disconnect } = useDisconnect();
  const {
    username,
    profilePictureUrl,
    needsUsername,
    saveUsername,
    saveProfilePictureUrl,
    saveError,
    setSaveError,
    refresh,
  } = useWalletProfile(account?.address);

  const { currencyId, setCurrencyId } = useWalletDisplayCurrency();
  const { text: rpcBalanceText } = useWalletMenuBalance(account?.address, currencyId);
  const hasNativeDisplay =
    currencyId === 'eth' &&
    typeof account?.displayBalance === 'string' &&
    account.displayBalance.trim().length > 0;
  const menuBalanceText = hasNativeDisplay ? account.displayBalance : rpcBalanceText;

  const avatarSrc =
    profilePictureUrl ||
    account?.ensAvatar ||
    (account?.address ? `https://avatar.vercel.sh/${account.address}?size=128` : '');

  const toggleMenu = () => {
    if (!account) {
      setMenuOpen((v) => !v);
      return;
    }
    if (chain?.unsupported) {
      openChainModal();
      return;
    }
    if (needsUsername) return;
    setMenuOpen((v) => !v);
  };

  useEffect(() => {
    if (!account) setMenuOpen(false);
  }, [account]);

  if (!mounted) {
    return <div className="app-wallet-pill app-wallet-pill--placeholder" aria-hidden />;
  }

  if (!account) {
    return (
      <>
        <button
          type="button"
          ref={pillRef}
          className="app-wallet-pill app-wallet-pill--connect"
          onClick={toggleMenu}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          Sign in
        </button>
        <WalletAccountMenu
          open={menuOpen}
          anchorRef={pillRef}
          onClose={() => setMenuOpen(false)}
          address={null}
          onSignIn={openConnectModal}
        />
      </>
    );
  }

  const balanceText = menuBalanceText;

  return (
    <>
      <button
        type="button"
        ref={pillRef}
        className="app-wallet-pill"
        onClick={toggleMenu}
        title={chain?.unsupported ? 'Wrong network' : 'Wallet menu'}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        <span className="app-wallet-pill-chain">
          {chain?.hasIcon && chain.iconUrl ? (
            <img
              alt=""
              src={chain.iconUrl}
              width={18}
              height={18}
              className="app-wallet-pill-chain-img"
              style={{ background: chain.iconBackground }}
            />
          ) : (
            <span className="app-wallet-pill-chain-fallback" />
          )}
        </span>
        <span className="app-wallet-pill-balance">{balanceText}</span>
        <span className="app-wallet-pill-divider" aria-hidden />
        <span className="app-wallet-pill-avatar-wrap">
          <img className="app-wallet-pill-avatar" src={avatarSrc} alt="" width={24} height={24} />
        </span>
        <IconChevronDown />
      </button>
      <WalletUsernameModal
        open={needsUsername}
        address={account.address}
        ensName={account.ensName}
        saveUsername={saveUsername}
        saveError={saveError}
        setSaveError={setSaveError}
        onComplete={() => refresh()}
        onUseDifferentWallet={() => {
          disconnect();
          setSaveError(null);
        }}
      />
      <WalletAccountMenu
        open={menuOpen && !needsUsername}
        anchorRef={pillRef}
        onClose={() => setMenuOpen(false)}
        address={account.address}
        avatarUrl={avatarSrc}
        username={username}
        displayBalance={balanceText}
        chainIconUrl={chain?.hasIcon ? chain.iconUrl : undefined}
        chainIconBg={chain?.iconBackground}
        onSignIn={openConnectModal}
        onAvatarClick={() => {
          setMenuOpen(false);
          setNftPickerOpen(true);
        }}
        currencyId={currencyId}
        onCurrencyChange={setCurrencyId}
      />
      <WalletNftAvatarModal
        open={nftPickerOpen}
        address={account.address}
        onClose={() => setNftPickerOpen(false)}
        onPick={async (url) => {
          await saveProfilePictureUrl(url);
          refresh();
        }}
      />
    </>
  );
}
