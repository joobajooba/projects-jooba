const SOCIAL_LINKS = [
  {
    label: 'X (Twitter)',
    href: 'https://x.com/StudioRookus',
    icon: 'x',
  },
  {
    label: 'Discord',
    href: 'https://discord.gg/3Q45eK33QX',
    icon: 'discord',
  },
];

function SocialIcon({ type }) {
  if (type === 'x') {
    return (
      <svg className="c-useful-links__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 4l7.2 9.6L4 20h2.2l5.4-6.3 4.4 6.3H20l-7.6-10.1L19.6 4h-2.2l-5 5.8L8.4 4H4Z" />
      </svg>
    );
  }

  return (
    <svg className="c-useful-links__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.028C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.461-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 13.107 13.107 0 0 1-1.872-.893.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.077.077 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.061 0a.077.077 0 0 1 .079.01c.12.099.246.198.373.292a.077.077 0 0 1-.007.128 12.301 12.301 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.363 1.225 1.994a.077.077 0 0 0 .084.029 19.876 19.876 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.029zM8.02 15.33c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.419 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.419 0 1.333-.946 2.419-2.157 2.419z" />
    </svg>
  );
}

export default function UsefulLinksPage() {
  return (
    <section className="c-useful-links-page" aria-label="Useful Links">
      <h1 className="c-useful-links-page__title">Useful Links</h1>
      <ul className="c-useful-links__list">
        {SOCIAL_LINKS.map((link) => (
          <li key={link.label}>
            <a
              className="c-useful-links__link"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
            >
              <SocialIcon type={link.icon} />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
