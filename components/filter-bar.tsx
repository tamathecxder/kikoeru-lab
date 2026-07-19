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

function Item({ label, active, target }: { label: string; active: boolean; target: string }) {
  return (
    <Link
      href={target}
      className={cn(
        'pb-[5px] transition-opacity hover:opacity-70',
        active ? 'border-b border-text text-text' : 'text-muted',
      )}
    >
      {label}
    </Link>
  );
}

export function FilterBar({ filters }: { filters: IdeaFilters }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-y-4 font-sans text-[11px] tracking-[0.09em]">
      <div className="flex flex-wrap items-center gap-x-[26px] gap-y-3">
        <Item label="all" active={!filters.status} target={href({ effort: filters.effort })} />
        {IDEA_STATUSES.map((s: IdeaStatus) => (
          <Item key={s} label={statusLabel(s)} active={filters.status === s} target={href({ status: s, effort: filters.effort })} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-[26px] gap-y-3">
        <Item label="all" active={!filters.effort} target={href({ status: filters.status })} />
        {EFFORTS.map((e: Effort) => (
          <Item key={e} label={effortLabel(e)} active={filters.effort === e} target={href({ status: filters.status, effort: e })} />
        ))}
      </div>
    </div>
  );
}
