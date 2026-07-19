'use client';

import { useEffect, useState } from 'react';

export const TOAST_EVENT = 'kikoeru:toast';

/** Fire a toast from anywhere on the client. */
export function toast(message: string): void {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message } }));
}

/**
 * One global toast. Bottom-right, 11px lowercase, --surface on --line, radius 2px,
 * no icon, no color. Auto-dismisses after 2s.
 */
export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function onToast(e: Event) {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      setMessage(detail.message);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), 2000);
    }
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      clearTimeout(timer);
    };
  }, []);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-[2px] border border-line bg-surface px-3 py-2 font-sans text-[11px] lowercase tracking-[0.09em] text-text">
      {message}
    </div>
  );
}
