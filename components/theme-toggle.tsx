'use client';

import { useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';

// Read the current theme from the <html data-theme> the pre-paint script set.
// useSyncExternalStore avoids setState-in-effect and hydration tearing.
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function apply(next: Theme): void {
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem('kikoeru-theme', next);
  } catch {
    // ignore storage failures (private mode, etc.)
  }
}

/**
 * Footer theme toggle. Two lowercase text buttons — no sun/moon icon — that set
 * data-theme on <html> and persist to localStorage. Not yet placed in any page.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(subscribe, getSnapshot, () => 'light');

  return (
    <div className="flex items-center gap-3 text-[11px] lowercase tracking-[0.09em]">
      {(['light', 'dark'] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => apply(t)}
          aria-pressed={theme === t}
          className={theme === t ? 'text-text' : 'text-muted'}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
