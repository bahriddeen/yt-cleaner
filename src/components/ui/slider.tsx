import { cn } from '@/utils/cn';
import { ratio } from '@/utils/format';

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  id?: string;
  'aria-label'?: string;
}

/**
 * Range slider built on a native `<input type="range">` for free keyboard and
 * screen-reader support, restyled with a filled track and accent thumb.
 */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  id,
  ...aria
}: SliderProps) {
  const pct = ratio(value - min, max - min) * 100;
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        'aperture-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-input outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
      style={{
        background: `linear-gradient(to right, hsl(var(--accent)) ${pct}%, hsl(var(--input)) ${pct}%)`,
      }}
      {...aria}
    />
  );
}
