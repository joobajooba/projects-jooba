const STROKE_M1 = 'rgba(172, 198, 142, 0.95)';
const STROKE_M2 = 'rgba(95, 122, 78, 0.95)';
const STROKE_EMPTY = 'rgba(120, 140, 100, 0.35)';

/**
 * Donut chart for two-segment counts (M1 vs M2 Mutant Ape sales).
 * Uses SVG only (no chart library). Explicit stroke colors so global CSS cannot hide the ring.
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
        <svg
          className="studio-nft-donut-svg"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label="Mutant Ape M1 versus M2 sales in 2026: no classified sales yet"
        >
          <g transform={`translate(${cx},${cy}) rotate(-90)`}>
            <circle
              cx={0}
              cy={0}
              r={r}
              fill="none"
              stroke={STROKE_EMPTY}
              strokeWidth={stroke}
              strokeDasharray={`${c * 0.92} ${c}`}
              strokeLinecap="round"
            />
          </g>
          <text className="studio-nft-donut-center-n" x={cx} y={cy - 2} textAnchor="middle">
            0
          </text>
          <text className="studio-nft-donut-center-l" x={cx} y={cy + 14} textAnchor="middle">
            M1+M2
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
        <p className="studio-nft-donut-empty-msg">
          No M1/M2-classified sales in this OpenSea sample (events may omit traits, or there were no M1/M2
          sales in 2026 on OpenSea yet). Totals below still count all sale events in the time window.
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
            stroke={STROKE_M1}
            strokeWidth={stroke}
            strokeDasharray={`${len1} ${c}`}
            strokeDashoffset={0}
            strokeLinecap="butt"
          />
          <circle
            className="studio-nft-donut-seg-m2"
            cx={0}
            cy={0}
            r={r}
            fill="none"
            stroke={STROKE_M2}
            strokeWidth={stroke}
            strokeDasharray={`${len2} ${c}`}
            strokeDashoffset={-len1}
            strokeLinecap="butt"
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
