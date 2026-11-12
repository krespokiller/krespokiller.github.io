export interface Experience {
  company: string;
  role: string;
  dates: string;
  /** Optional clarification rendered next to the period, e.g. "Parallel project". */
  note?: string;
  location: string;
  /** One-line summary shown while the row is collapsed. */
  summary?: string;
  description: string[];
  tags?: string[];
  /** Public, verifiable links for the role (product site, store listing). */
  links?: { label: string; href: string }[];
}
