import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getIdeaById } from '@/lib/ideas/queries';
import { sourceLabel } from '@/lib/ideas/format';
import { NotesField } from '@/components/notes-field';
import { ScoreBreakdown } from '@/components/score-breakdown';
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

export default async function IdeaDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idea = await getIdeaById(id);
  if (!idea) notFound();

  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-10 py-14">
      <Link href="/ideas" className="font-sans text-[11px] tracking-[0.09em] text-muted lowercase hover:opacity-70">
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
        <ScoreBreakdown breakdown={idea.score_breakdown} urgencyScore={idea.urgency_score} />
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
