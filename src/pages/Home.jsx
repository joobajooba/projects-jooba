export default function Home() {
  return (
    <main className="home-main">
      <div className="home-welcome-panel">
        <h1 className="home-welcome-title">Welcome to the Sanctuary of J00BA</h1>
        <p className="home-welcome-text">
          Web3 sparked something in me—the desire to learn a powerful, evolving toolset and use it to build fun, meaningful projects for real communities. This platform is the result of that journey: a place where creativity, competition, and community come together.
        </p>
        <p className="home-welcome-text">
          To interact with the games, connect your wallet, create your profile, and appear on the leaderboards, you must hold at least one asset from one of the following projects:
        </p>
        <ul className="home-welcome-projects">
          <li>🔥 Not A Punks Cult</li>
          <li className="home-welcome-bops">
            <img src="/npc_logo.png" alt="NPC Logo" className="home-npc-logo" />
            Bops
          </li>
        </ul>
        <p className="home-welcome-text">
          Holding an asset acts as your access pass, linking your on-chain identity to your in-platform profile. Once connected, you can play games, earn points, track your progress, and compete against other community members.
        </p>
        <p className="home-welcome-text">
          This project was built to provide a consistent interaction layer for Web3 communities—a shared space where members can return regularly, have fun, and compete in friendly ways. The goal is to strengthen communities through playful competition, recognizable profiles, and ongoing engagement, all powered by Web3 ownership.
        </p>
      </div>
      <div className="home-image-wrap">
        <img src="/9419_Home.png" alt="9419 Home" className="home-image" />
      </div>
    </main>
  );
}
