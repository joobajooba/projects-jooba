import { useEffect, useRef, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { useApeChainBalanceDisplay } from '../hooks/useApeChainBalanceDisplay';
import { useEthMainnetBalanceDisplay } from '../hooks/useEthMainnetBalanceDisplay';
import { useWalletProfile } from '../hooks/useWalletProfile';
import WalletAccountMenu from './WalletAccountMenu';
import WalletNftAvatarModal from './WalletNftAvatarModal';
import WalletUsernameModal from './WalletUsernameModal';

function IconChevronDown() {
  return (
    <span className="app-wallet-pill-chevron" aria-hidden>
      <svg
        className="app-wallet-pill-chevron-svg"
        viewBox="0 0 10 10"
        width="6"
        height="6"
        aria-hidden
        focusable="false"
      >
        <path d="M2 3.25L5 6.75L8 3.25H2Z" fill="currentColor" />
      </svg>
    </span>
  );
}

export default function WalletTopBarButton({ connectLabel = 'Sign in' }) {
  return (
    <ConnectButton.Custom>
      {(ctx) => <WalletTopBarInner {...ctx} connectLabel={connectLabel} />}
    </ConnectButton.Custom>
  );
}

function WalletTopBarInner({ account, chain, mounted, openConnectModal, openChainModal, connectLabel }) {
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

  const { text: ethBalanceText, onEthereumMainnet } = useEthMainnetBalanceDisplay(
    account?.address,
    account?.displayBalance
  );
  const { text: apeBalanceText } = useApeChainBalanceDisplay(account?.address);
  const menuBalanceText = ethBalanceText;
  const balanceTitle = onEthereumMainnet ? undefined : 'Switch to Ethereum to see your ETH balance';

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
          {connectLabel}
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
        title={
          chain?.unsupported ? 'Wrong network' : !onEthereumMainnet ? balanceTitle : 'Wallet menu'
        }
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        <span className="app-wallet-pill-chain">
          {chain?.hasIcon && chain.iconUrl ? (
            <img
              alt=""
              src={chain.iconUrl}
              width={14}
              height={14}
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
          <img className="app-wallet-pill-avatar" src={avatarSrc} alt="" width={17} height={17} />
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
        balanceHint={balanceTitle}
        apeDisplayBalance={apeBalanceText}
        apeBalanceHint="Native ApeCoin (APE) on ApeChain (not Ethereum)"
        chainIconUrl={chain?.hasIcon ? chain.iconUrl : undefined}
        chainIconBg={chain?.iconBackground}
        onSignIn={openConnectModal}
        onAvatarClick={() => {
          setMenuOpen(false);
          setNftPickerOpen(true);
        }}
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
