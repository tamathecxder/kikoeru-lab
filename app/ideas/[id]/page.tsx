import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getIdeaById } from '@/lib/ideas/queries';
import type { ScoreBreakdown } from '@/lib/ai/scoring';
import { EffortBadge, UrgencyBadge } from '@/components/idea-card';
import { StatusControl } from '@/components/status-control';

export const dynamic = 'force-dynamic';

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-foreground">{value ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

const COMPONENT_ROWS: { key: keyof ScoreBreakdown['weighted']; label: string }[] = [
  { key: 'engagement', label: 'Engagement' },
  { key: 'pain_intensity', label: 'Pain intensity' },
  { key: 'willingness_to_pay', label: 'Willingness to pay' },
  { key: 'recency', label: 'Recency' },
  { key: 'feasibility', label: 'Feasibility' },
];

function ScoreBreakdownTable({ breakdown }: { breakdown: ScoreBreakdown }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Component</th>
            <th className="px-3 py-2 text-right font-medium">Score</th>
            <th className="px-3 py-2 text-right font-medium">Weight</th>
            <th className="px-3 py-2 text-right font-medium">Weighted</th>
          </tr>
        </thead>
        <tbody>
          {COMPONENT_ROWS.map(({ key, label }) => (
            <tr key={key} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-2">{label}</td>
              <td className="px-3 py-2 text-right tabular-nums">{breakdown[key]}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{breakdown.weights[key]}</td>
              <td className="px-3 py-2 text-right tabular-nums">{breakdown.weighted[key].toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function IdeaDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idea = await getIdeaById(id);
  if (!idea) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to dashboard
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <h1 className="text-xl font-semibold leading-snug">{idea.pain_point}</h1>
        <UrgencyBadge score={idea.urgency_score} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <EffortBadge effort={idea.effort} />
        {idea.raw_posts && (
          <a
            href={idea.raw_posts.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {idea.raw_posts.source}: {idea.raw_posts.title} ↗
          </a>
        )}
      </div>

      <div className="mt-6">
        <StatusControl id={idea.id} status={idea.status} />
      </div>

      <dl className="mt-8 grid gap-6 sm:grid-cols-2">
        <Field label="Target user" value={idea.target_user} />
        <Field label="Existing workaround" value={idea.existing_workaround} />
        <Field label="Solution pitch" value={idea.solution_pitch} />
        <Field label="MVP scope" value={idea.mvp_scope} />
        <Field label="Portfolio value" value={idea.portfolio_value} />
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Suggested stack</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {idea.suggested_stack.length > 0 ? (
              idea.suggested_stack.map((tech) => (
                <span key={tech} className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  {tech}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </dd>
        </div>
      </dl>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium">
          Urgency breakdown <span className="text-muted-foreground">({idea.urgency_score}/100)</span>
        </h2>
        {idea.score_breakdown ? (
          <ScoreBreakdownTable breakdown={idea.score_breakdown} />
        ) : (
          <p className="text-sm text-muted-foreground">No breakdown recorded.</p>
        )}
      </section>
    </main>
  );
}
