import { cn } from '@/utils/cn';

/**
 * A labelled settings row: title + description on the left, control on the
 * right. Associates the control with its label for screen readers when an
 * `htmlFor` is provided.
 */
export function SettingRow({
  title,
  description,
  htmlFor,
  control,
  className,
  children,
}: {
  title: string;
  description?: string;
  htmlFor?: string;
  control?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="max-w-md space-y-0.5">
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-foreground"
        >
          {title}
        </label>
        {description && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {control && <div className="shrink-0">{control}</div>}
      {children}
    </div>
  );
}

/** A titled group of setting rows inside a card. */
export function SettingGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-elevated overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="divide-y divide-border px-6">{children}</div>
    </section>
  );
}
