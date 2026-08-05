const SECTIONS = [
  {
    title: 'Introduction',
    body: "IMPLINGz is a fully on-chain generative pixel art NFT collection, with every character hand-drawn by me in Aseprite. This project has been an opportunity to apply everything I've learned over the past year of smart contract development while exploring a completely new art style. Building IMPLINGz has been both a technical challenge and a creative journey, combining on-chain development with hand-crafted pixel art.",
  },
  {
    title: 'The Plans',
    body: 'IMPLINGz is more than just a collection of artwork. Each NFT will soon unlock functionality on this website, allowing holders to make use of their IMPLINGz in new ways as the project evolves. My goal is to continue expanding the collection and webpage with engaging on-chain features while creating additional value for holders, including community-focused royalty initiatives.',
  },
  {
    title: 'The Team',
    body: 'IMPLINGz is currently a solo-developed passion project. Every aspect, from the artwork and smart contracts to the website and future features, is being built by me as I continue learning and improving my skills. I truly appreciate the patience, support, and feedback from the community. Every suggestion helps shape the future of the project, and my goal is to make IMPLINGz a fun, rewarding, and worthwhile experience for everyone involved.',
  },
];

export default function InfoPage() {
  return (
    <div className="info-page">
      <div className="info-page__inner">
        <h1 className="info-page__title">Info</h1>
        <div className="info-sections">
          {SECTIONS.map((section) => (
            <section key={section.title} className="info-section">
              <h2 className="info-section__title">{section.title}</h2>
              <p className="info-section__body">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
