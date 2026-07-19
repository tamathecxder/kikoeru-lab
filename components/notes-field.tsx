'use client';

import { useState } from 'react';

/** Serif notes textarea, no border except the bottom rule. Autosaves on blur. */
export function NotesField({ id, initial }: { id: string; initial: string | null }) {
  const [value, setValue] = useState(initial ?? '');
  const [saved, setSaved] = useState(initial ?? '');

  async function save() {
    if (value === saved) return;
    try {
      const res = await fetch(`/api/ideas/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notes: value }),
      });
      if (res.ok) setSaved(value);
    } catch {
      // leave unsaved; blur again to retry
    }
  }

  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      placeholder="notes…"
      rows={3}
      aria-label="notes"
      className="w-full resize-none border-0 border-b border-line bg-transparent py-2 font-serif text-[16px] leading-[1.7] text-text placeholder:text-muted focus:outline-none focus-visible:outline-none"
    />
  );
}
