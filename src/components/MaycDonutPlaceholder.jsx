/** Visible grey ring while OpenSea sale events are loading. */
export default function MaycDonutPlaceholder() {
  const r = 40;
  const stroke = 15;
  const c = 2 * Math.PI * r;
  const size = (r + stroke + 4) * 2;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="studio-nft-donut studio-nft-donut--placeholder" aria-busy="true">
      <svg
        className="studio-nft-donut-svg studio-nft-donut-svg--pulse"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
        <g transform={`translate(${cx},${cy}) rotate(-90)`}>
          <circle
            cx={0}
            cy={0}
            r={r}
            fill="none"
            stroke="rgba(140, 165, 115, 0.45)"
            strokeWidth={stroke}
            strokeDasharray={`${c * 0.25} ${c}`}
            strokeLinecap="round"
          />
        </g>
        <text className="studio-nft-donut-center-n" x={cx} y={cy + 6} textAnchor="middle">
          …
        </text>
      </svg>
      <p className="studio-nft-donut-placeholder-caption">Fetching sale events…</p>
    </div>
  );
}
