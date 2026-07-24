import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Tone = 'accent' | 'success' | 'warning' | 'danger';

export interface ProgressRingProps {
  /** Progress from 0 to 1. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
  /** Colour of the progress arc. Defaults to accent; danger when full. */
  tone?: Tone | 'auto';
}

/** Chooses a tone from progress when `tone="auto"`. */
function autoTone(p: number): Tone {
  if (p >= 1) return 'danger';
  if (p >= 0.9) return 'warning';
  return 'accent';
}

const TONE_VAR: Record<Tone, string> = {
  accent: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
};

/**
 * A circular progress ring with an animated arc and a soft track. The arc uses
 * `strokeDashoffset` animation; motion is disabled under reduced-motion.
 */
export function ProgressRing({
  progress,
  size = 200,
  strokeWidth = 14,
  className,
  children,
  tone = 'auto',
}: ProgressRingProps) {
  const reduce = useReducedMotion();
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);
  const resolvedTone: Tone = tone === 'auto' ? autoTone(clamped) : tone;
  const color = `hsl(${TONE_VAR[resolvedTone]})`;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduce ? offset : circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 1, ease: [0.16, 1, 0.3, 1] }
          }
          style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
