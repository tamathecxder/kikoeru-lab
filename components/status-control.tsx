'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import { movedMessage, statusLabel } from '@/lib/ideas/format';
import { IDEA_STATUSES, type IdeaStatus } from '@/lib/ideas/types';
import { toast } from '@/components/toast-host';

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
      toast(movedMessage(next));
      router.refresh();
    } catch {
      setError('couldn’t save just now');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 font-sans text-[11px] tracking-[0.09em]">
      {IDEA_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          disabled={pending}
          onClick={() => update(s)}
          aria-pressed={s === current}
          className={cn(
            'rounded-[2px] border px-2.5 py-1 lowercase transition-colors disabled:opacity-50',
            s === current ? 'border-muted text-text' : 'border-line text-muted hover:border-muted',
          )}
        >
          {statusLabel(s)}
        </button>
      ))}
      {error && <span className="text-muted">{error}</span>}
    </div>
  );
}
