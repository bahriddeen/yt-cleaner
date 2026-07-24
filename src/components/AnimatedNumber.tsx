import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Counts up to `value` with an easing curve. Respects reduced-motion by
 * snapping instantly. Purely presentational.
 */
export function AnimatedNumber({
  value,
  duration = 0.9,
  format = (n) => Math.round(n).toString(),
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration, reduce]);

  return <span className={className}>{format(display)}</span>;
}
