const TEAM_MEMBERS = [
  {
    name: 'J00BA',
    role: 'WEB3 / ART / Game Dev',
    imageSrc: '/team-j00ba.png',
    imageAlt: 'J00BA character artwork',
  },
  {
    name: 'Melvolio',
    role: 'Game Dev / Server',
    imageSrc: '/team-melvolio.png',
    imageAlt: 'Melvolio character artwork',
  },
];

export default function TeamPage() {
  return (
    <section className="c-team-page" aria-label="The Team">
      <div className="c-team-grid">
        {TEAM_MEMBERS.map((member) => (
          <article key={member.name} className="c-team-card">
            <img className="c-team-card__image" src={member.imageSrc} alt={member.imageAlt} loading="lazy" />
            <h2 className="c-team-card__name">{member.name}</h2>
            <p className="c-team-card__role">{member.role}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
