export interface Experience {
  company: string;
  role: string;
  dates: string;
  /** Optional clarification rendered next to the period, e.g. "Parallel project". */
  note?: string;
  location: string;
  description: string[];
  tags?: string[];
}
