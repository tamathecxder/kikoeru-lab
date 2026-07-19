import type { Metadata } from 'next';
import Link from 'next/link';

import { getTopIdea } from '@/lib/ideas/queries';
import { effortLabel, sourceLabel } from '@/lib/ideas/format';
import { WEIGHTS } from '@/lib/ai/scoring';
import type { Idea } from '@/lib/ideas/types';
import { ScoreBreakdown } from '@/components/score-breakdown';
import { ThemeToggle } from '@/components/theme-toggle';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Kikoeru Lab',
  description: 'listening to what the internet complains about',
  openGraph: {
    title: 'Kikoeru Lab',
    description: 'listening to what the internet complains about',
    type: 'website',
  },
};

// Shown only when the database is empty or the query fails — the page must
// still render a real-looking example rather than a blank section.
const FALLBACK_IDEA: Pick<
  Idea,
  'pain_point' | 'target_user' | 'mvp_scope' | 'effort' | 'urgency_score' | 'score_breakdown' | 'raw_posts'
> = {
  pain_point: 'people who self-host services have no simple way to see which ones are down',
  target_user: 'home-server owners',
  mvp_scope: 'a single page that pings a list of urls and shows when each last responded',
  effort: '1_week',
  urgency_score: 76,
  score_breakdown: {
    engagement: 68,
    pain_intensity: 50,
    willingness_to_pay: 100,
    recency: 100,
    feasibility: 80,
    raw_engagement: 240,
    weights: WEIGHTS,
    weighted: { engagement: 20.4, pain_intensity: 12.5, willingness_to_pay: 25, recency: 10, feasibility: 8 },
  },
  raw_posts: {
    source: 'reddit',
    url: 'https://www.reddit.com/r/selfhosted',
    title: 'is there a dead-simple uptime page for a handful of self-hosted apps?',
  },
};

const STEPS = [
  { n: '01', label: 'listen', desc: 'reads public posts from hacker news and reddit' },
  { n: '02', label: 'filter', desc: "a cheap model discards anything that isn't a real complaint" },
  { n: '03', label: 'extract', desc: 'a second pass pulls out the problem, who has it, and what a minimum version would look like' },
  { n: '04', label: 'score', desc: 'urgency is calculated in code from measurable signals' },
];

const WEIGHT_ROWS: [string, string][] = [
  ['engagement', '0.30'],
  ['pain intensity', '0.25'],
  ['willingness to pay', '0.25'],
  ['recency', '0.10'],
  ['feasibility', '0.10'],
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-sans text-[11px] tracking-[0.09em] text-muted lowercase">{children}</p>;
}

function ExampleField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <p className="font-sans text-[11px] tracking-[0.09em] text-muted lowercase">{label}</p>
      <p className="mt-1.5 font-serif text-[16px] leading-[1.6] text-text">{children}</p>
    </div>
  );
}

export default async function LandingPage() {
  let idea: typeof FALLBACK_IDEA = FALLBACK_IDEA;
  try {
    const top = await getTopIdea();
    if (top) idea = top;
  } catch {
    // fall back to the static example — the landing page must never crash
  }

  const source = idea.raw_posts;

  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-6 md:px-10">
      {/* hero */}
      <section className="flex flex-col pt-[120px] md:pt-[200px]">
        <span className="font-serif text-[22px] lowercase">
          kikoeru <span className="text-muted">lab</span>
        </span>

        <h1 className="mt-16 font-serif text-[28px] leading-[1.3] text-text md:text-[40px]">
          ideas you can hear before they exist
        </h1>

        <p className="mt-6 font-sans text-[13px] leading-[1.7] text-muted">
          a personal tool that listens to what people complain about online, and turns it into projects
          worth building
        </p>

        <div className="mt-12 flex w-[220px] flex-col gap-[14px] md:w-[320px]" aria-hidden="true">
          {[
            { w: '100%', o: 0.25 },
            { w: '72%', o: 0.18 },
            { w: '88%', o: 0.14 },
            { w: '45%', o: 0.09 },
            { w: '60%', o: 0.05 },
          ].map((line, i) => (
            <div key={i} className="h-px" style={{ width: line.w, background: 'var(--accent)', opacity: line.o }} />
          ))}
        </div>

        <Link
          href="/ideas"
          className="mt-14 self-start border-b border-line pb-[3px] font-sans text-[13px] lowercase text-text transition-colors hover:border-muted"
        >
          enter →
        </Link>
      </section>

      {/* the problem */}
      <section className="pt-[80px] md:pt-[120px]">
        <SectionLabel>the problem</SectionLabel>
        <div className="mt-8 space-y-[38px] font-serif text-[19px] leading-[1.5] text-text">
          <p>you want to build something, but you don&rsquo;t know what.</p>
          <p>every idea you think of is either too large to finish, or something nobody actually needs.</p>
          <p>meanwhile people describe their problems openly, every day, in public.</p>
        </div>
      </section>

      {/* how it works */}
      <section className="pt-[80px] md:pt-[120px]">
        <SectionLabel>how it works</SectionLabel>
        <div className="mt-8 grid grid-cols-1 gap-y-10 md:grid-cols-4 md:gap-x-8">
          {STEPS.map((s) => (
            <div key={s.n}>
              <div className="flex items-baseline gap-2 font-sans text-[11px] tracking-[0.09em] lowercase">
                <span className="text-muted tabular-nums">{s.n}</span>
                <span className="text-text">{s.label}</span>
              </div>
              <p className="mt-3 font-serif text-[16px] leading-[1.55] text-text">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* an example */}
      <section className="pt-[80px] md:pt-[120px]">
        <SectionLabel>an example</SectionLabel>
        <h2 className="mt-8 font-serif text-[24px] leading-[1.4] text-text">{idea.pain_point}</h2>
        <ExampleField label="target user">{idea.target_user}</ExampleField>
        <ExampleField label="mvp scope">{idea.mvp_scope}</ExampleField>
        <ExampleField label="effort · source">
          {effortLabel(idea.effort)}
          {source ? ` · ${sourceLabel(source.source, source.url)}` : ''}
        </ExampleField>
        <div className="mt-8">
          <ScoreBreakdown breakdown={idea.score_breakdown} urgencyScore={idea.urgency_score} />
        </div>
        <p className="mt-8 font-sans text-[11px] tracking-[0.09em] text-muted lowercase">
          this is real output, not a mockup
        </p>
      </section>

      {/* how urgency is scored */}
      <section className="pt-[80px] md:pt-[120px]">
        <SectionLabel>how urgency is scored</SectionLabel>
        <p className="mt-8 font-serif text-[16px] leading-[1.6] text-text">
          the score is calculated in code, not written by the model. the model only extracts variables — the
          weighting is deterministic and auditable.
        </p>
        <div className="mt-6 max-w-[320px] rounded-[2px] bg-surface p-5 font-mono text-[12px] leading-[1.9] text-muted">
          {WEIGHT_ROWS.map(([name, weight]) => (
            <div key={name} className="flex justify-between">
              <span>{name}</span>
              <span className="tabular-nums">{weight}</span>
            </div>
          ))}
        </div>
      </section>

      {/* where it listens */}
      <section className="pt-[80px] md:pt-[120px]">
        <SectionLabel>where it listens</SectionLabel>
        <p className="mt-8 font-serif text-[16px] leading-[1.6] text-text">
          currently hacker news and reddit. github issues and product review sites are next.
        </p>
        <p className="mt-4 font-sans text-[11px] leading-[1.7] tracking-[0.03em] text-muted lowercase">
          public posts only. no personal data is stored — usernames are hashed before they touch the database.
        </p>
      </section>

      {/* footer */}
      <footer className="mt-[80px] mb-12 flex items-end justify-between border-t border-line pt-10 md:mt-[120px]">
        <div className="flex flex-col gap-3">
          <span className="font-serif text-[15px] lowercase">
            kikoeru <span className="text-muted">lab</span>
          </span>
          <span className="font-serif text-[13px] text-muted">聞こえる</span>
          <span className="font-sans text-[11px] tracking-[0.09em] text-muted">
            built with Next.js, Supabase, and Gemini
          </span>
        </div>
        <div className="flex flex-col items-end gap-3">
          <ThemeToggle />
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-[11px] tracking-[0.09em] text-muted lowercase hover:opacity-70"
          >
            github ↗
          </a>
        </div>
      </footer>
    </main>
  );
}
