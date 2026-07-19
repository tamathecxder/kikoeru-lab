import { ThemeToggle } from '@/components/theme-toggle';

/**
 * The one footer. The kanji ("to be heard") appears here and nowhere else in
 * the whole app. `meta` is an optional right-side line, e.g. "last listened …".
 */
export function SiteFooter({ meta }: { meta?: string }) {
  return (
    <footer className="mt-24 flex items-center justify-between border-t border-line pt-6">
      <span className="text-[13px] text-muted">聞こえる</span>
      <div className="flex items-center gap-6">
        {meta && <span className="font-sans text-[11px] tracking-[0.09em] text-muted">{meta}</span>}
        <ThemeToggle />
      </div>
    </footer>
  );
}
