import { useEffect, useState } from 'react';

/**
 * Tracks which page section is currently in view so a navigation bar can
 * highlight the matching link. A single IntersectionObserver watches the
 * middle band of the viewport; the first section crossing that band wins.
 *
 * Callers must pass a stable `sectionIds` array (e.g. a module-level
 * constant) so the observer is created once per mount.
 */
export const useActiveSection = (sectionIds: string[]): string | null => {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
        // When nothing crosses the band (hero at the top, gaps between
        // sections) the last known section stays highlighted to avoid
        // flicker while scrolling.
      },
      // Only the middle band activates a section; headings stay readable
      // while the highlight moves.
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );

    elements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, [sectionIds]);

  return activeId;
};
