import { getIdeas, getLatestRunAt, getWeeklyHeardCount } from '@/lib/ideas/queries';
import { formatDayMonth, formatUtcTime } from '@/lib/ideas/format';
import { EFFORTS, IDEA_STATUSES, type Effort, type IdeaFilters, type IdeaStatus } from '@/lib/ideas/types';
import { FilterBar } from '@/components/filter-bar';
import { IdeaList } from '@/components/idea-list';
import { SiteFooter } from '@/components/site-footer';
import { ThemeToggle } from '@/components/theme-toggle';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function parseFilters(sp: SearchParams): IdeaFilters {
  const status =
    typeof sp.status === 'string' && (IDEA_STATUSES as readonly string[]).includes(sp.status)
      ? (sp.status as IdeaStatus)
      : undefined;
  const effort =
    typeof sp.effort === 'string' && (EFFORTS as readonly string[]).includes(sp.effort)
      ? (sp.effort as Effort)
      : undefined;
  return { status, effort };
}

export default async function IdeasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = parseFilters(await searchParams);
  const [ideas, weekly, lastRun] = await Promise.all([getIdeas(filters), getWeeklyHeardCount(), getLatestRunAt()]);

  const today = formatDayMonth(new Date());
  const listened = formatUtcTime(lastRun);

  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-10 py-14">
      <header className="flex items-baseline justify-between gap-6">
        <span className="font-serif text-[22px] lowercase">
          kikoeru <span className="text-muted">lab</span>
        </span>
        <div className="flex items-baseline gap-6 font-sans text-[11px] tracking-[0.09em] text-muted">
          <span>
            {today}&nbsp;·&nbsp;{weekly} heard this week
          </span>
          <ThemeToggle />
        </div>
      </header>

      <div className="mt-[60px]">
        <FilterBar filters={filters} />
      </div>

      <section className="mt-10 flex-1">
        {ideas.length === 0 ? (
          <p className="py-32 text-center font-serif text-[19px] text-muted">nothing heard yet</p>
        ) : (
          <IdeaList ideas={ideas} />
        )}
      </section>

      <SiteFooter meta={listened ? `last listened ${listened}` : undefined} />
    </main>
  );
}
