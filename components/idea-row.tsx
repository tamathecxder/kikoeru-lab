import Link from 'next/link';

import { effortLabel, sourceLabel, urgencyOpacity } from '@/lib/ideas/format';
import type { Idea } from '@/lib/ideas/types';

/**
 * A single line in the list. No card, no border box, no badge, no number — the
 * urgency shows only as the opacity of a small accent dot.
 */
export function IdeaRow({ idea }: { idea: Idea }) {
  const meta = [
    idea.target_user,
    effortLabel(idea.effort),
    idea.raw_posts ? sourceLabel(idea.raw_posts.source, idea.raw_posts.url) : null,
  ].filter(Boolean);

  return (
    <Link href={`/ideas/${idea.id}`} className="group block py-[19px] transition-opacity hover:opacity-70">
      <div className="flex gap-4">
        <span
          aria-hidden
          className="mt-[11px] h-[5px] w-[5px] shrink-0 rounded-full bg-accent"
          style={{ opacity: urgencyOpacity(idea.urgency_score) }}
        />
        <div className="min-w-0">
          <p className="font-serif text-[19px] leading-[1.55] tracking-[0.01em] text-text">{idea.pain_point}</p>
          <p className="mt-2 font-sans text-[11px] tracking-[0.09em] text-muted">
            {meta.map((m, i) => (
              <span key={i}>
                {i > 0 && <span>&nbsp;·&nbsp;</span>}
                {m}
              </span>
            ))}
          </p>
        </div>
      </div>
    </Link>
  );
}
