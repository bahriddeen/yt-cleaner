import { useEffect, useMemo, useState } from 'react';
import {
  Settings2,
  Flame,
  Clock,
  Timer,
  RotateCcw,
  Unlock,
  Hourglass,
  Gauge,
} from 'lucide-react';
import type { Platform } from '@/types';
import { PLATFORM_META } from '@/types';
import { ProgressRing } from '@/components/ProgressRing';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { StatCard } from '@/components/StatCard';
import { PlatformSwitcher } from '@/components/PlatformSwitcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/misc';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useSettings } from '@/hooks/useSettings';
import { useStatus } from '@/hooks/useStatus';
import { useAllStatus } from '@/hooks/useAllStatus';
import { useStatistics } from '@/hooks/useStatistics';
import { useActivePlatform } from '@/hooks/useActivePlatform';
import { useCountdown } from '@/hooks/useCountdown';
import { sendMessage } from '@/services/messaging';
import { formatCountdown, localDateKey } from '@/utils/date';
import { formatDuration, ratio } from '@/utils/format';
import { PopupSkeleton } from './components/PopupSkeleton';

export function App() {
  const activePlatform = useActivePlatform();
  const [platform, setPlatform] = useState<Platform>(activePlatform);
  // Follow the active tab once it resolves (only before the user overrides).
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!touched) setPlatform(activePlatform);
  }, [activePlatform, touched]);

  const { settings } = useSettings();
  const { status, loading } = useStatus(platform);
  const { statuses } = useAllStatus();
  const { stats } = useStatistics(platform);
  const remainingMs = useCountdown();
  const [confirmReset, setConfirmReset] = useState(false);

  const todayTimeMs = useMemo(() => {
    const key = localDateKey();
    return stats?.dailySeries.find((d) => d.date === key)?.timeOnPlatformMs ?? 0;
  }, [stats]);

  if (loading || !status || !settings) return <PopupSkeleton />;

  const progress = ratio(status.viewedCount, status.limit);
  const openOptions = (): void => {
    void chrome.runtime.openOptionsPage();
  };
  const choosePlatform = (p: Platform): void => {
    setTouched(true);
    setPlatform(p);
    setConfirmReset(false);
  };

  const resetCounter = async (): Promise<void> => {
    await sendMessage({ type: 'RESET_TODAY', platform });
    setConfirmReset(false);
  };
  const grantOverride = async (): Promise<void> => {
    await sendMessage({ type: 'GRANT_OVERRIDE', platform });
  };

  return (
    <ThemeProvider theme={settings.theme} accent={settings.accent}>
      <div className="w-[380px] bg-background text-foreground">
        <header className="flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/60 shadow-glow">
              <Gauge className="h-4 w-4 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">Aperture</p>
              <p className="text-[11px] text-muted-foreground">
                {PLATFORM_META[platform].name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {status.overrideActive && <Badge variant="warning">Override</Badge>}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Open settings"
              onClick={openOptions}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Platform switcher */}
        <div className="px-5 pt-4">
          <PlatformSwitcher
            value={platform}
            onChange={choosePlatform}
            statuses={statuses}
          />
        </div>

        {/* Hero ring */}
        <section className="flex flex-col items-center px-5 pb-2 pt-4">
          <ProgressRing progress={progress} size={182} strokeWidth={13}>
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                {status.blocked ? 'Reached' : 'Remaining'}
              </span>
              <AnimatedNumber
                value={status.blocked ? 0 : status.remaining}
                className="text-5xl font-semibold tracking-tight"
              />
              <span className="text-xs text-muted-foreground">
                {status.viewedCount} of {status.limit} used
              </span>
            </div>
          </ProgressRing>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
            <Hourglass className="h-3.5 w-3.5" />
            Resets in
            <span className="font-semibold tabular-nums text-foreground">
              {formatCountdown(remainingMs)}
            </span>
          </div>
        </section>

        {/* Stats grid */}
        <section className="grid grid-cols-2 gap-2.5 px-5 pt-3">
          <StatCard
            index={0}
            icon={<Timer />}
            label="Time saved"
            value={formatDuration(stats?.timeSavedMs ?? 0)}
            tone="success"
            hint="estimated"
          />
          <StatCard
            index={1}
            icon={<Flame />}
            label="Current streak"
            value={`${stats?.currentStreak ?? 0}d`}
            tone="accent"
            hint={`best ${stats?.bestStreak ?? 0}d`}
          />
          <StatCard
            index={2}
            icon={<Clock />}
            label={`Today on ${PLATFORM_META[platform].name}`}
            value={formatDuration(todayTimeMs)}
          />
          <StatCard
            index={3}
            icon={<Gauge />}
            label="Daily limit"
            value={status.limit}
            hint={`${status.viewedCount} viewed`}
          />
        </section>

        {/* Quick actions */}
        <section className="grid grid-cols-2 gap-2.5 px-5 py-4">
          {confirmReset ? (
            <>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={resetCounter}>
                Confirm reset
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setConfirmReset(true)}>
                <RotateCcw className="h-4 w-4" />
                Reset counter
              </Button>
              <Button
                variant={status.blocked ? 'accent' : 'secondary'}
                onClick={grantOverride}
              >
                <Unlock className="h-4 w-4" />
                {settings.overrideMinutes}-min unlock
              </Button>
            </>
          )}
          <Button variant="outline" className="col-span-2" onClick={openOptions}>
            <Settings2 className="h-4 w-4" />
            Open dashboard & settings
          </Button>
        </section>

        <footer className="animate-fade-in border-t border-border px-5 py-3 text-center text-[11px] text-muted-foreground">
          {status.blocked
            ? `${PLATFORM_META[platform].name} limit reached — enjoy the time back.`
            : 'Scroll with intention. You’ve got this.'}
        </footer>
      </div>
    </ThemeProvider>
  );
}
