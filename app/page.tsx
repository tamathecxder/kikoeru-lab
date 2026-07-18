import { getIdeas } from '@/lib/ideas/queries';
import { EFFORTS, IDEA_STATUSES, type Effort, type IdeaFilters, type IdeaStatus } from '@/lib/ideas/types';
import { FilterBar } from '@/components/filter-bar';
import { IdeaCard } from '@/components/idea-card';

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
  const ideas = await getIdeas(filters);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Kikoeru Lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Project ideas mined from real user pain points, ranked by urgency.
        </p>
      </header>

      <div className="mb-6">
        <FilterBar filters={filters} />
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        {ideas.length} idea{ideas.length === 1 ? '' : 's'}
      </p>

      {ideas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No ideas match these filters yet. Run the ingest job to populate the dashboard.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </main>
  );
}
