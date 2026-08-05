export default function HomePage() {
  return (
    <div className="home-page">
      <img
        className="home-banner"
        src="/implingz-banner.png"
        alt="IMPLINGZ"
        draggable="false"
      />

      <div className="home-walker" aria-hidden="true">
        <img
          className="home-walker__sprite"
          src="/impling-walk.gif"
          alt=""
          draggable="false"
        />
      </div>
    </div>
  );
}
