import { useEffect, useState, type RefObject } from 'react';

/** Stay fixed in the viewport until the launcher reaches the content/footer boundary. */
export function useFooterClearance(anchor: RefObject<HTMLElement | null>, gap = 16) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const footer = document.querySelector<HTMLElement>('[data-site-footer]');
    if (!footer) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const element = anchor.current;
      if (!element) return;
      const baseline = parseFloat(getComputedStyle(element).bottom) || 0;
      const bounds = footer.getBoundingClientRect();
      // Clamp only at the actual boundary, never when the footer first enters view.
      // Once clamped, the launcher stays at the same position in the document.
      const next = Math.max(0, window.innerHeight - bounds.top + gap - baseline);
      setOffset(previous => Math.abs(previous - next) < 0.5 ? previous : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(footer);
    observer.observe(document.body);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [anchor, gap]);
  return offset;
}
