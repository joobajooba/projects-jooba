import { ConnectButton } from '@rainbow-me/rainbowkit';

function IconChevronDown() {
  return (
    <svg className="app-wallet-pill-chevron" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function WalletTopBarButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openConnectModal, openAccountModal, openChainModal }) => {
        if (!mounted) {
          return <div className="app-wallet-pill app-wallet-pill--placeholder" aria-hidden />;
        }

        if (!account) {
          return (
            <button
              type="button"
              className="app-wallet-pill app-wallet-pill--connect"
              onClick={openConnectModal}
            >
              Connect wallet
            </button>
          );
        }

        const balanceText = account.displayBalance ?? '—';
        const avatarSrc =
          account.ensAvatar ?? `https://avatar.vercel.sh/${account.address}?size=64`;

        const onPillClick = () => {
          if (chain?.unsupported) openChainModal();
          else openAccountModal();
        };

        return (
          <button
            type="button"
            className="app-wallet-pill"
            onClick={onPillClick}
            title={chain?.unsupported ? 'Wrong network' : 'Wallet menu'}
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
        );
      }}
    </ConnectButton.Custom>
  );
}
