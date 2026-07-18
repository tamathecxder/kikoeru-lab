import Link from 'next/link';

import { cn } from '@/lib/utils';
import { effortLabel, urgencyTone } from '@/lib/ideas/format';
import type { Idea } from '@/lib/ideas/types';
import { StatusControl } from '@/components/status-control';

const URGENCY_CLASSES: Record<ReturnType<typeof urgencyTone>, string> = {
  high: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

export function UrgencyBadge({ score }: { score: number }) {
  return (
    <span className={cn('rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums', URGENCY_CLASSES[urgencyTone(score)])}>
      {score}
    </span>
  );
}

export function EffortBadge({ effort }: { effort: Idea['effort'] }) {
  return (
    <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
      {effortLabel(effort)}
    </span>
  );
}

export function IdeaCard({ idea }: { idea: Idea }) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/ideas/${idea.id}`} className="font-medium leading-snug text-card-foreground hover:underline">
          {idea.pain_point}
        </Link>
        <UrgencyBadge score={idea.urgency_score} />
      </div>

      <p className="text-sm text-muted-foreground">
        <span className="text-foreground/70">For:</span> {idea.target_user}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <EffortBadge effort={idea.effort} />
        {idea.raw_posts && (
          <a
            href={idea.raw_posts.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {idea.raw_posts.source} source ↗
          </a>
        )}
        <Link href={`/ideas/${idea.id}`} className="text-xs text-muted-foreground hover:text-foreground">
          details →
        </Link>
      </div>

      <div className="border-t border-border pt-3">
        <StatusControl id={idea.id} status={idea.status} />
      </div>
    </article>
  );
}
