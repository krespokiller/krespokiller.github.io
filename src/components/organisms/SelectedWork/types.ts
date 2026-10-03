/**
 * Shape of a Selected Work case study. This mirrors the `work.cards` array
 * in `src/const/locales/{en,es}.json` — both language files must keep this
 * exact shape (links/URLs included) with per-language strings only.
 */
export interface WorkLink {
  label: string;
  href: string;
  ariaLabel: string;
}

export interface WorkMetric {
  value: string;
  label: string;
}

export interface WorkCardData {
  eyebrow: string;
  /** Optional italic footnote (e.g. "Parallel project"); null when unused. */
  note: string | null;
  title: string;
  summary: string;
  bullets: string[];
  /** Headline number statement; null renders no metric block. */
  metric: WorkMetric | null;
  links: WorkLink[];
  /** Tech chips — each entry should exist in ICON_MAP or render text-only. */
  tags: string[];
}
