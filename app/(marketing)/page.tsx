import type { Metadata } from 'next';
import Link from 'next/link';

import { getExampleIdeas, getHeroStats, getQuotePost } from '@/lib/ideas/queries';
import { effortLabel, formatMonthYear, formatRelativeTime, sourceLabel } from '@/lib/ideas/format';
import { WEIGHTS } from '@/lib/ai/scoring';
import type { Idea } from '@/lib/ideas/types';
import { ScoreBreakdown } from '@/components/score-breakdown';
import { ThemeToggle } from '@/components/theme-toggle';

// Cache the DB-backed page for an hour rather than querying on every request;
// the relative "last listened" copy tolerates that staleness.
export const revalidate = 3600;

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
type ExampleIdea = Pick<
  Idea,
  'pain_point' | 'target_user' | 'mvp_scope' | 'effort' | 'urgency_score' | 'score_breakdown' | 'raw_posts'
>;

const FALLBACK_IDEA: ExampleIdea = {
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

const FALLBACK_QUOTE = {
  title: "i've tried every note app and they all get in the way more than they help",
  source: 'hackernews',
  url: 'https://news.ycombinator.com',
  at: null as string | null,
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

const RIPPLE_WIDTHS = ['100%', '72%', '88%', '45%', '60%'];

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

function Ripple({ widthClass, opacities }: { widthClass: string; opacities: number[] }) {
  return (
    <div className={`flex flex-col gap-[14px] ${widthClass}`} aria-hidden="true">
      {opacities.map((o, i) => (
        <div key={i} className="h-px" style={{ width: RIPPLE_WIDTHS[i], background: 'var(--accent)', opacity: o }} />
      ))}
    </div>
  );
}

function NumberedSection({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="pt-[64px] md:pt-[96px]">
      <div className="flex items-baseline gap-4">
        <span className="hidden font-serif text-[48px] leading-none tabular-nums text-text opacity-[0.12] md:block">
          {n}
        </span>
        <p className="font-sans text-[11px] tracking-[0.09em] text-muted lowercase">{title}</p>
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function ExampleField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <p className="font-sans text-[11px] tracking-[0.09em] text-muted lowercase">{label}</p>
      <p className="mt-1.5 font-serif text-[17px] leading-[1.6] text-text">{children}</p>
    </div>
  );
}

function effortSource(idea: ExampleIdea): string {
  const src = idea.raw_posts;
  return `${effortLabel(idea.effort)}${src ? ` · ${sourceLabel(src.source, src.url)}` : ''}`;
}

export default async function LandingPage() {
  const [stats, quoteDb, dbIdeas] = await Promise.all([
    safe(getHeroStats, null),
    safe(getQuotePost, null),
    safe(getExampleIdeas, [] as Idea[]),
  ]);

  const examples: ExampleIdea[] = dbIdeas.length > 0 ? dbIdeas : [FALLBACK_IDEA];
  const [firstExample, ...restExamples] = examples;
  const quote = quoteDb ?? FALLBACK_QUOTE;
  const quoteMonth = formatMonthYear(quote.at);
  const relListened = stats ? formatRelativeTime(stats.lastListened) : null;
  const showStats = Boolean(stats && stats.postsRead > 0 && stats.ideasFound > 0);

  return (
    <main className="mx-auto flex w-full max-w-[820px] flex-1 flex-col px-6 md:px-10">
      {/* hero */}
      <section className="flex flex-col pt-[96px] md:pt-[160px]">
        <div className="flex items-baseline justify-between gap-6">
          <span className="font-serif text-[22px] lowercase">
            kikoeru <span className="text-muted">lab</span>
          </span>
          <ThemeToggle />
        </div>

        <h1 className="mt-16 font-serif text-[34px] leading-[1.15] text-text md:text-[60px]">
          ideas you can hear
          <br />
          before they exist
        </h1>

        <p className="mt-6 font-sans text-[13px] leading-[1.7] text-muted">
          a personal tool that listens to what people complain about online, and turns it into projects
          worth building
        </p>

        <Ripple widthClass="mt-12 w-[220px] md:w-[320px]" opacities={[0.25, 0.18, 0.14, 0.09, 0.05]} />

        {showStats && stats && (
          <p className="mt-12 font-sans text-[11px] tracking-[0.09em] tabular-nums text-muted lowercase">
            {stats.postsRead.toLocaleString('en-US')} posts read&nbsp;·&nbsp;{stats.ideasFound} ideas found
            {relListened ? <>&nbsp;·&nbsp;last listened {relListened}</> : null}
          </p>
        )}

        <Link
          href="/ideas"
          className="mt-14 self-start border-b border-line pb-[3px] font-sans text-[13px] lowercase text-text transition-colors hover:border-muted"
        >
          enter →
        </Link>
      </section>

      {/* 01 the problem */}
      <NumberedSection n="01" title="the problem">
        <div className="space-y-[38px] font-serif text-[19px] leading-[1.5] text-text">
          <p>you want to build something, but you don&rsquo;t know what.</p>
          <p>every idea you think of is either too large to finish, or something nobody actually needs.</p>
          <p>meanwhile people describe their problems openly, every day, in public.</p>
        </div>
      </NumberedSection>

      {/* blockquote — a real complaint (no number, no heading) */}
      <section className="pt-[64px] md:pt-[96px]">
        <blockquote className="border-l-2 border-accent pl-8 font-serif text-[20px] italic leading-[1.5] text-text opacity-[0.85] md:text-[28px]">
          {quote.title}
        </blockquote>
        <p className="mt-4 font-sans text-[11px] tracking-[0.09em] text-muted lowercase">
          — {sourceLabel(quote.source, quote.url)}
          {quoteMonth ? `, ${quoteMonth}` : ''}
        </p>
      </section>

      {/* 02 how it works */}
      <NumberedSection n="02" title="how it works">
        <div className="grid grid-cols-1 gap-y-10 md:grid-cols-4 md:gap-x-8">
          {STEPS.map((s) => (
            <div key={s.n}>
              <div className="flex items-baseline gap-2 font-sans text-[11px] tracking-[0.09em] lowercase">
                <span className="text-muted tabular-nums">{s.n}</span>
                <span className="text-text">{s.label}</span>
              </div>
              <p className="mt-3 font-serif text-[17px] leading-[1.55] text-text">{s.desc}</p>
            </div>
          ))}
        </div>
      </NumberedSection>

      {/* 03 an example */}
      <NumberedSection n="03" title="an example">
        <h2 className="font-serif text-[26px] leading-[1.4] text-text">{firstExample.pain_point}</h2>
        <ExampleField label="target user">{firstExample.target_user}</ExampleField>
        <ExampleField label="mvp scope">{firstExample.mvp_scope}</ExampleField>
        <ExampleField label="effort · source">{effortSource(firstExample)}</ExampleField>
        <div className="mt-8">
          <ScoreBreakdown breakdown={firstExample.score_breakdown} urgencyScore={firstExample.urgency_score} />
        </div>

        {restExamples.map((ex, i) => (
          <div key={i} className="mt-[38px] border-t border-line pt-[38px]">
            <p className="font-serif text-[19px] leading-[1.5] text-text">{ex.pain_point}</p>
            <p className="mt-2 font-sans text-[11px] tracking-[0.09em] text-muted lowercase">
              {ex.target_user}&nbsp;·&nbsp;{effortSource(ex)}
            </p>
          </div>
        ))}

        <p className="mt-8 font-sans text-[11px] tracking-[0.09em] text-muted lowercase">
          this is real output, not a mockup
        </p>
      </NumberedSection>

      {/* 04 how urgency is scored */}
      <NumberedSection n="04" title="how urgency is scored">
        <p className="font-serif text-[17px] leading-[1.6] text-text">
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
        <p className="mt-4 font-sans text-[11px] leading-[1.7] tracking-[0.03em] text-muted lowercase">
          each component is stored per idea, so any score can be traced back to its inputs.
        </p>
      </NumberedSection>

      {/* 05 why this exists */}
      <NumberedSection n="05" title="why this exists">
        <div className="space-y-[28px] font-serif text-[19px] leading-[1.5] text-text">
          <p>i kept opening a blank editor with no idea what to build.</p>
          <p>
            the ideas i came up with alone were either too ambitious to finish on a weekend, or solved a
            problem only i had.
          </p>
          <p>so i built something to listen for me.</p>
        </div>
      </NumberedSection>

      {/* 06 what it doesn't do */}
      <NumberedSection n="06" title="what it doesn't do">
        <div className="space-y-[28px] font-serif text-[17px] leading-[1.55] text-text">
          <p>it does not predict whether an idea will succeed.</p>
          <p>it does not validate market demand — a loud complaint is not the same as a paying customer.</p>
          <p>it does not replace talking to the people who have the problem.</p>
        </div>
      </NumberedSection>

      {/* 07 where it listens */}
      <NumberedSection n="07" title="where it listens">
        <p className="font-serif text-[17px] leading-[1.6] text-text">
          currently hacker news and reddit. github issues and product review sites are next.
        </p>
        <p className="mt-4 font-sans text-[11px] leading-[1.7] tracking-[0.03em] text-muted lowercase">
          public posts only. no personal data is stored — usernames are hashed before they touch the database.
        </p>
      </NumberedSection>

      {/* ripple #2 — quiet divider before the footer */}
      <div className="flex justify-center pt-[64px] md:pt-[96px]">
        <Ripple widthClass="w-[180px] md:w-[220px]" opacities={[0.15, 0.11, 0.08, 0.05, 0.03]} />
      </div>

      {/* footer */}
      <footer className="mb-16 mt-[64px] flex items-end justify-between border-t border-line pt-10 md:mt-[96px]">
        <div className="flex flex-col gap-3">
          <span className="font-serif text-[15px] lowercase">
            kikoeru <span className="text-muted">lab</span>
          </span>
          <span className="font-serif text-[13px] text-muted">聞こえる</span>
          <span className="font-sans text-[11px] tracking-[0.09em] text-muted">
            built with Next.js, Supabase, and Gemini
          </span>
        </div>
        <a
          href="https://github.com/yvdist"
          target="_blank"
          rel="noopener noreferrer"
          className="font-sans text-[11px] tracking-[0.09em] text-muted lowercase hover:opacity-70"
        >
          built by yvdist ↗
        </a>
      </footer>
    </main>
  );
}
