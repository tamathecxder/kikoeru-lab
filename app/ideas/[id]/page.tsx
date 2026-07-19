import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getIdeaById } from '@/lib/ideas/queries';
import { LOW_SCORE, sourceLabel } from '@/lib/ideas/format';
import type { ScoreBreakdown } from '@/lib/ai/scoring';
import { NotesField } from '@/components/notes-field';
import { SiteFooter } from '@/components/site-footer';
import { StatusControl } from '@/components/status-control';

export const dynamic = 'force-dynamic';

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-9">
      <p className="font-sans text-[11px] tracking-[0.09em] text-muted lowercase">{label}</p>
      <div className="mt-2 font-serif text-[16px] leading-[1.7] text-text">{children}</div>
    </div>
  );
}

const BREAKDOWN_ROWS: { key: keyof ScoreBreakdown['weighted']; label: string }[] = [
  { key: 'engagement', label: 'engagement' },
  { key: 'pain_intensity', label: 'pain intensity' },
  { key: 'willingness_to_pay', label: 'willingness to pay' },
  { key: 'recency', label: 'recency' },
  { key: 'feasibility', label: 'feasibility' },
];

export default async function IdeaDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idea = await getIdeaById(id);
  if (!idea) notFound();

  const b = idea.score_breakdown;

  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-10 py-14">
      <Link href="/" className="font-sans text-[11px] tracking-[0.09em] text-muted lowercase hover:opacity-70">
        ← back
      </Link>

      <h1 className="mt-10 font-serif text-[24px] leading-[1.5] text-text">{idea.pain_point}</h1>

      <div className="mt-6">
        <StatusControl id={idea.id} status={idea.status} />
      </div>

      <Section label="target user">{idea.target_user}</Section>
      <Section label="existing workaround">
        {idea.existing_workaround ?? <span className="text-muted">—</span>}
      </Section>
      <Section label="solution pitch">{idea.solution_pitch}</Section>
      <Section label="mvp scope">{idea.mvp_scope}</Section>
      <Section label="suggested stack">
        {idea.suggested_stack.length > 0 ? idea.suggested_stack.join(', ') : <span className="text-muted">—</span>}
      </Section>
      <Section label="portfolio value">{idea.portfolio_value}</Section>

      <div className="mt-9">
        <p className="font-sans text-[11px] tracking-[0.09em] text-muted lowercase">
          score breakdown — {idea.urgency_score}/100
        </p>
        {b ? (
          <ul className="mt-3 space-y-3 font-serif text-[16px] text-text">
            {BREAKDOWN_ROWS.map(({ key, label }) => {
              const value = b[key];
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

      {idea.raw_posts && (
        <Section label="source">
          <a
            href={idea.raw_posts.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-70"
          >
            {sourceLabel(idea.raw_posts.source, idea.raw_posts.url)} — {idea.raw_posts.title} ↗
          </a>
        </Section>
      )}

      <div className="mt-9">
        <p className="font-sans text-[11px] tracking-[0.09em] text-muted lowercase">notes</p>
        <div className="mt-2">
          <NotesField id={idea.id} initial={idea.notes} />
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
