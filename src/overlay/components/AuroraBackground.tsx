import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * A slow, drifting aurora made of blurred accent-tinted blobs over a deep
 * base. Motion pauses under reduced-motion (blobs stay static). Purely
 * decorative — `aria-hidden`.
 */
export function AuroraBackground() {
  const reduce = useReducedMotion();

  const blob = (delay: number) =>
    reduce
      ? {}
      : {
          animate: {
            x: [0, 40, -30, 0],
            y: [0, -30, 20, 0],
            scale: [1, 1.15, 0.95, 1],
          },
          transition: {
            duration: 22,
            delay,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-surface" />
      <motion.div
        {...blob(0)}
        className="absolute -left-24 top-[-10%] h-[520px] w-[520px] rounded-full blur-[120px]"
        style={{ background: 'hsl(var(--accent) / 0.45)' }}
      />
      <motion.div
        {...blob(2)}
        className="absolute right-[-15%] top-[10%] h-[460px] w-[460px] rounded-full blur-[130px]"
        style={{ background: 'hsl(var(--accent) / 0.3)' }}
      />
      <motion.div
        {...blob(4)}
        className="absolute bottom-[-20%] left-[20%] h-[500px] w-[500px] rounded-full blur-[140px]"
        style={{ background: 'hsl(280 80% 60% / 0.28)' }}
      />
      {/* Subtle grain/vignette for depth. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 120% at 50% 30%, transparent 40%, hsl(var(--background) / 0.6) 100%)',
        }}
      />
    </div>
  );
}
