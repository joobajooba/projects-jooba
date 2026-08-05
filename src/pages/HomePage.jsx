export default function HomePage() {
  return (
    <div className="home-page">
      <div className="home-titles">
        <img
          className="home-banner"
          src="/implingz-banner.png"
          alt="IMPLINGZ"
          draggable="false"
        />
        <img
          className="home-frame"
          src="/implingz-frame.png"
          alt=""
          draggable="false"
        />
      </div>

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
