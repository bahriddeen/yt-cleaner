import { Instagram, Twitter, Youtube } from 'lucide-react';
import type { LiveStatus, Platform } from '@/types';
import { PLATFORMS, PLATFORM_META } from '@/types';
import { Segmented } from '@/components/ui/segmented';

const ICONS: Record<Platform, React.ReactNode> = {
  instagram: <Instagram className="h-3.5 w-3.5" />,
  x: <Twitter className="h-3.5 w-3.5" />,
  youtube: <Youtube className="h-3.5 w-3.5" />,
};

/**
 * Segmented control for switching the focused platform. Optionally shows a
 * small dot on platforms that are currently blocked.
 */
export function PlatformSwitcher({
  value,
  onChange,
  statuses,
}: {
  value: Platform;
  onChange: (p: Platform) => void;
  statuses?: Record<Platform, LiveStatus> | null;
}) {
  return (
    <Segmented
      aria-label="Platform"
      value={value}
      onChange={onChange}
      options={PLATFORMS.map((p) => ({
        value: p,
        label: PLATFORM_META[p].name,
        icon: (
          <span className="relative">
            {ICONS[p]}
            {statuses?.[p]?.blocked && (
              <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-danger" />
            )}
          </span>
        ),
      }))}
    />
  );
}
