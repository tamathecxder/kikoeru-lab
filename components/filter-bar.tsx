import Link from 'next/link';

import { cn } from '@/lib/utils';
import { effortLabel, statusLabel } from '@/lib/ideas/format';
import { EFFORTS, IDEA_STATUSES, type Effort, type IdeaFilters, type IdeaStatus } from '@/lib/ideas/types';

function href(filters: IdeaFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.effort) params.set('effort', filters.effort);
  const q = params.toString();
  return q ? `/ideas?${q}` : '/ideas';
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-[26px] gap-y-3">
      <span className="w-14 shrink-0 text-muted">{label}</span>
      {children}
    </div>
  );
}

export function FilterBar({ filters }: { filters: IdeaFilters }) {
  return (
    <div className="flex flex-col gap-y-4 font-sans text-[11px] tracking-[0.09em]">
      <Row label="status">
        <Item label="all" active={!filters.status} target={href({ effort: filters.effort })} />
        {IDEA_STATUSES.map((s: IdeaStatus) => (
          <Item key={s} label={statusLabel(s)} active={filters.status === s} target={href({ status: s, effort: filters.effort })} />
        ))}
      </Row>
      <Row label="effort">
        <Item label="all" active={!filters.effort} target={href({ status: filters.status })} />
        {EFFORTS.map((e: Effort) => (
          <Item key={e} label={effortLabel(e)} active={filters.effort === e} target={href({ status: filters.status, effort: e })} />
        ))}
      </Row>
    </div>
  );
}
