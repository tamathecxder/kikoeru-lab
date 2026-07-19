'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { movedMessage } from '@/lib/ideas/format';
import { IDEA_STATUSES, type Idea, type IdeaStatus } from '@/lib/ideas/types';
import { IdeaRow } from '@/components/idea-row';
import { toast } from '@/components/toast-host';

function isEditable(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  return !!node && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA');
}

export function IdeaList({ ideas }: { ideas: Idea[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const rowsRef = useRef<(HTMLLIElement | null)[]>([]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? ideas.filter(
        (i) => i.pain_point.toLowerCase().includes(q) || i.target_user.toLowerCase().includes(q),
      )
    : ideas;

  const sel = filtered.length === 0 ? -1 : Math.min(selected, filtered.length - 1);

  async function setStatus(idea: Idea, status: IdeaStatus) {
    if (idea.status === status) return;
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(String(res.status));
      toast(movedMessage(status));
      router.refresh();
    } catch {
      toast('couldn’t save just now');
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isEditable(e.target)) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === 'j') {
        e.preventDefault();
        setSelected((s) => Math.min(filtered.length - 1, s + 1));
      } else if (e.key === 'k') {
        e.preventDefault();
        setSelected((s) => Math.max(0, s - 1));
      } else if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'Escape') {
        (document.activeElement as HTMLElement | null)?.blur();
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const idea = filtered[sel];
        if (idea) void setStatus(idea, IDEA_STATUSES[Number(e.key) - 1]);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // filtered/sel are derived from state+props; re-bind when they change.
  }, [filtered, sel]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sel >= 0) rowsRef.current[sel]?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  return (
    <div>
      <input
        ref={searchRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="search…"
        aria-label="search"
        className="mb-8 w-full border-b border-line bg-transparent pb-2 font-sans text-[13px] text-text placeholder:text-muted focus:outline-none focus-visible:outline-none"
      />

      {filtered.length === 0 ? (
        <p className="py-24 text-center font-serif text-[19px] text-muted">nothing heard yet</p>
      ) : (
        <ul className="divide-y divide-line">
          {filtered.map((idea, i) => (
            <li key={idea.id} ref={(el) => { rowsRef.current[i] = el; }}>
              <IdeaRow idea={idea} selected={i === sel} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
