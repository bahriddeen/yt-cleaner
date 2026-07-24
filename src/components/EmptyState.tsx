import { motion } from 'framer-motion';

/**
 * Beautiful empty state — a soft illustrated glyph, a title and supporting
 * copy. Used before any data exists (fresh install) and in empty charts.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent [&>svg]:h-7 [&>svg]:w-7">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        {description && (
          <p className="mx-auto max-w-[240px] text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </motion.div>
  );
}
