import { cn } from '@/utils/cn';

/**
 * A compact metric tile: icon, label, prominent value and optional hint.
 * Used throughout the popup dashboard and options statistics.
 *
 * Entrance uses a CSS animation (fill-mode `both`) rather than a JS-timed one
 * so a staggered `index` delay can never leave the tile stuck invisible if the
 * component remounts. Reduced-motion is honoured globally in globals.css.
 */
export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = 'default',
  className,
  index = 0,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'accent' | 'success' | 'warning';
  className?: string;
  index?: number;
}) {
  const toneClass = {
    default: 'text-foreground',
    accent: 'text-accent',
    success: 'text-success',
    warning: 'text-warning',
  }[tone];

  return (
    <div
      className={cn('glass animate-fade-in-up rounded-2xl p-4', className)}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={cn('mt-2 text-2xl font-semibold tracking-tight', toneClass)}>
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}
