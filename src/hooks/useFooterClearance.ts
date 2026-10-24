import { useEffect, useState, type RefObject } from 'react';

/** Reserve the full footer height while visible, so scrolling never moves the launcher. */
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
      const visible = bounds.top < window.innerHeight && bounds.bottom > 0;
      const navigationClearance = parseFloat(getComputedStyle(footer).marginBottom) || 0;
      const next = visible ? Math.max(0, bounds.height + navigationClearance + gap - baseline) : 0;
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
