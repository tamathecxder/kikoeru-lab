import { getIdeas, getLatestRunAt, getWeeklyHeardCount } from '@/lib/ideas/queries';
import { formatDayMonth, formatUtcTime } from '@/lib/ideas/format';
import { EFFORTS, IDEA_STATUSES, type Effort, type IdeaFilters, type IdeaStatus } from '@/lib/ideas/types';
import { FilterBar } from '@/components/filter-bar';
import { IdeaRow } from '@/components/idea-row';
import { SiteFooter } from '@/components/site-footer';

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

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = parseFilters(await searchParams);
  const [ideas, weekly, lastRun] = await Promise.all([getIdeas(filters), getWeeklyHeardCount(), getLatestRunAt()]);

  const today = formatDayMonth(new Date());
  const listened = formatUtcTime(lastRun);

  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-10 py-14">
      <header className="flex items-baseline justify-between">
        <span className="font-serif text-[22px] lowercase">
          kikoeru <span className="text-muted">lab</span>
        </span>
        <span className="font-sans text-[11px] tracking-[0.09em] text-muted">
          {today}&nbsp;·&nbsp;{weekly} heard this week
        </span>
      </header>

      <div className="mt-[60px]">
        <FilterBar filters={filters} />
      </div>

      <section className="mt-10 flex-1">
        {ideas.length === 0 ? (
          <p className="py-32 text-center font-serif text-[19px] text-muted">nothing heard yet</p>
        ) : (
          <ul className="divide-y divide-line">
            {ideas.map((idea) => (
              <li key={idea.id}>
                <IdeaRow idea={idea} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <SiteFooter meta={listened ? `last listened ${listened}` : undefined} />
    </main>
  );
}
