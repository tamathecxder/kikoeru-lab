import Link from 'next/link';

import { cn } from '@/lib/utils';
import { effortLabel, statusLabel } from '@/lib/ideas/format';
import { EFFORTS, IDEA_STATUSES, type Effort, type IdeaFilters, type IdeaStatus } from '@/lib/ideas/types';

function href(filters: IdeaFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.effort) params.set('effort', filters.effort);
  const q = params.toString();
  return q ? `/?${q}` : '/';
}

function Chip({ label, active, target }: { label: string; active: boolean; target: string }) {
  return (
    <Link
      href={target}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition-colors',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </Link>
  );
}

export function FilterBar({ filters }: { filters: IdeaFilters }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-14 text-xs uppercase tracking-wide text-muted-foreground">Status</span>
        <Chip label="All" active={!filters.status} target={href({ effort: filters.effort })} />
        {IDEA_STATUSES.map((s: IdeaStatus) => (
          <Chip
            key={s}
            label={statusLabel(s)}
            active={filters.status === s}
            target={href({ status: s, effort: filters.effort })}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-14 text-xs uppercase tracking-wide text-muted-foreground">Effort</span>
        <Chip label="All" active={!filters.effort} target={href({ status: filters.status })} />
        {EFFORTS.map((e: Effort) => (
          <Chip
            key={e}
            label={effortLabel(e)}
            active={filters.effort === e}
            target={href({ status: filters.status, effort: e })}
          />
        ))}
      </div>
    </div>
  );
}
