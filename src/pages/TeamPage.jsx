const TEAM_MEMBERS = [
  {
    name: 'J00BA',
    role: 'Founder / Artist / Dev',
    imageSrc: '/team-j00ba.png',
    imageAlt: 'J00BA profile artwork',
  },
  {
    name: 'OkiDoki',
    role: 'Sound Engineer',
    imageSrc: '/team-okidokie.png',
    imageAlt: 'OkiDoki profile artwork',
  },
  {
    name: 'IBEKS',
    role: 'Community Manager',
    colorClass: 'bg-cyan-400',
  },
];

function TeamCard({ member }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-64 h-64 rounded-2xl overflow-hidden border border-gray-700 bg-gray-900/70 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        {member.imageSrc ? (
          <img
            src={member.imageSrc}
            alt={member.imageAlt}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full ${member.colorClass}`} aria-label={`${member.name} placeholder`} />
        )}
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-gray-100">{member.name}</h2>
      <p className="mt-1 text-sm uppercase tracking-[0.2em] text-gray-400">{member.role}</p>
    </div>
  );
}

export default function TeamPage() {
  const [featuredMember, ...otherMembers] = TEAM_MEMBERS;

  return (
    <div className="flex-1 overflow-auto">
      <div className="min-h-full px-6 py-10 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-7xl flex flex-col items-center gap-12">
          <TeamCard member={featuredMember} />
          <div className="w-full flex flex-wrap items-start justify-center gap-10 xl:gap-16">
            {otherMembers.map((member) => (
              <TeamCard key={member.name} member={member} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
