import { LOW_SCORE } from '@/lib/ideas/format';
import type { ScoreBreakdown as Breakdown } from '@/lib/ai/scoring';

const BREAKDOWN_ROWS: { key: keyof Breakdown['weighted']; label: string }[] = [
  { key: 'engagement', label: 'engagement' },
  { key: 'pain_intensity', label: 'pain intensity' },
  { key: 'willingness_to_pay', label: 'willingness to pay' },
  { key: 'recency', label: 'recency' },
  { key: 'feasibility', label: 'feasibility' },
];

/**
 * Score breakdown as a plain label — number list with 2px bars (not a chart).
 * Components below LOW_SCORE (30) switch to the --low color, the one exception
 * to accent-sparing. Reads the top-level breakdown fields, not `weighted`.
 */
export function ScoreBreakdown({
  breakdown,
  urgencyScore,
}: {
  breakdown: Breakdown | null;
  urgencyScore: number;
}) {
  return (
    <div>
      <p className="font-sans text-[11px] tracking-[0.09em] text-muted lowercase">
        score breakdown — {urgencyScore}/100
      </p>
      {breakdown ? (
        <ul className="mt-3 space-y-3 font-serif text-[16px] text-text">
          {BREAKDOWN_ROWS.map(({ key, label }) => {
            const value = breakdown[key];
            const low = value < LOW_SCORE;
            return (
              <li key={key}>
                <div className="flex items-baseline gap-2">
                  <span>{label}</span>
                  <span className="text-muted">—</span>
                  <span
                    className="font-sans text-[13px] tabular-nums"
                    style={{ color: low ? 'var(--low)' : 'var(--muted)' }}
                  >
                    {value}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-[2px]"
                  style={{
                    width: `${value}%`,
                    background: low ? 'var(--low)' : 'var(--accent)',
                    opacity: low ? 1 : 0.5,
                  }}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 font-serif text-[16px] text-muted">no breakdown recorded</p>
      )}
    </div>
  );
}
