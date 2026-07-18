'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import { statusLabel } from '@/lib/ideas/format';
import { IDEA_STATUSES, type IdeaStatus } from '@/lib/ideas/types';

export function StatusControl({ id, status }: { id: string; status: IdeaStatus }) {
  const router = useRouter();
  const [current, setCurrent] = useState<IdeaStatus>(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(next: IdeaStatus) {
    if (next === current || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/ideas/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setCurrent(next);
      router.refresh();
    } catch {
      setError('Update failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {IDEA_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          disabled={pending}
          onClick={() => update(s)}
          aria-pressed={s === current}
          className={cn(
            'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50',
            s === current
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          {statusLabel(s)}
        </button>
      ))}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
