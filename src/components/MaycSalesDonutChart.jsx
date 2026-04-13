/**
 * Donut chart for two-segment counts (M1 vs M2 Mutant Ape sales).
 * Uses SVG only (no chart library).
 */
export default function MaycSalesDonutChart({ m1, m2 }) {
  const sum = m1 + m2;
  const r = 40;
  const stroke = 15;
  const c = 2 * Math.PI * r;
  const size = (r + stroke + 4) * 2;
  const cx = size / 2;
  const cy = size / 2;

  if (sum === 0) {
    return (
      <div className="studio-nft-donut studio-nft-donut--empty">
        <p className="studio-nft-donut-empty-msg">
          No M1 or M2 sales classified in the fetched 2026 OpenSea events (check trait data on events or
          try again later).
        </p>
      </div>
    );
  }

  const len1 = (m1 / sum) * c;
  const len2 = (m2 / sum) * c;

  return (
    <div className="studio-nft-donut">
      <svg
        className="studio-nft-donut-svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Mutant Ape sales 2026: ${m1} M1, ${m2} M2, out of ${sum} classified`}
      >
        <g transform={`translate(${cx},${cy}) rotate(-90)`}>
          <circle
            className="studio-nft-donut-track"
            cx={0}
            cy={0}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeDasharray={`${len1} ${c}`}
            strokeDashoffset={0}
          />
          <circle
            className="studio-nft-donut-seg-m2"
            cx={0}
            cy={0}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeDasharray={`${len2} ${c}`}
            strokeDashoffset={-len1}
          />
        </g>
        <text className="studio-nft-donut-center-n" x={cx} y={cy - 2} textAnchor="middle">
          {sum}
        </text>
        <text className="studio-nft-donut-center-l" x={cx} y={cy + 14} textAnchor="middle">
          sales
        </text>
      </svg>
      <ul className="studio-nft-donut-legend">
        <li>
          <span className="studio-nft-donut-swatch studio-nft-donut-swatch--m1" aria-hidden />
          <span>M1 Mutant</span>
          <strong>{m1}</strong>
        </li>
        <li>
          <span className="studio-nft-donut-swatch studio-nft-donut-swatch--m2" aria-hidden />
          <span>M2 Mutant</span>
          <strong>{m2}</strong>
        </li>
      </ul>
    </div>
  );
}
