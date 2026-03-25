const TEAM_MEMBERS = [
  {
    id: 'j00ba',
    name: 'J00BA',
    role: 'Founder / Artist / Dev',
    imageSrc: '/team-j00ba.png',
    imageAlt: 'J00BA profile artwork',
  },
  {
    id: 'okidokie',
    name: 'OkiDokie',
    role: 'Sound Engineer',
    imageSrc: '/team-okidokie.png',
    imageAlt: 'OkiDokie profile artwork',
  },
  {
    id: 'insert-1',
    name: 'Insert Name',
    role: 'Insert Name',
    colorClass: 'bg-cyan-400',
  },
  {
    id: 'insert-2',
    name: 'Insert Name',
    role: 'Insert Name',
    colorClass: 'bg-indigo-400',
  },
  {
    id: 'insert-3',
    name: 'Insert Name',
    role: 'Insert Name',
    colorClass: 'bg-amber-400',
  },
];

function TeamCard({ member, size = 'lg' }) {
  const boxSizeClass = size === 'sm' ? 'w-48 h-48' : 'w-64 h-64';
  const nameClass = size === 'sm' ? 'mt-4 text-xl' : 'mt-5 text-2xl';
  const roleClass = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={`${boxSizeClass} rounded-2xl overflow-hidden border border-gray-700 bg-gray-900/70 shadow-[0_20px_50px_rgba(0,0,0,0.35)]`}
      >
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
      <h2 className={`${nameClass} font-semibold text-gray-100`}>{member.name}</h2>
      <p className={`mt-1 ${roleClass} uppercase tracking-[0.2em] text-gray-400`}>{member.role}</p>
    </div>
  );
}

export default function TeamPage() {
  const topRowMembers = TEAM_MEMBERS.slice(0, 2);
  const bottomRowMembers = TEAM_MEMBERS.slice(2);

  return (
    <div className="flex-1 overflow-auto">
      <div className="min-h-full px-6 py-10 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-7xl flex flex-col items-center gap-12">
          <div className="w-full max-w-4xl flex flex-col items-center gap-8">
            <h1 className="text-2xl font-semibold text-gray-100 underline underline-offset-8 decoration-gray-500">
              The Team
            </h1>
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-6 justify-items-center">
              {topRowMembers.map((member) => (
                <TeamCard key={member.id} member={member} size="lg" />
              ))}
            </div>
          </div>

          <div className="w-full flex flex-col items-center gap-8">
            <h2 className="text-2xl font-semibold text-gray-100 underline underline-offset-8 decoration-gray-500">
              Board Members
            </h2>
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-6 justify-items-center">
              {bottomRowMembers.map((member) => (
                <TeamCard key={member.id} member={member} size="sm" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
