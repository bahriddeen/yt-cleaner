import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, LogOut, Clock, Sparkles } from 'lucide-react';
import type { Platform } from '@/types';
import { PLATFORMS, PLATFORM_META } from '@/types';
import { ProgressRing } from '@/components/ProgressRing';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { Button } from '@/components/ui/button';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useSettings } from '@/hooks/useSettings';
import { useStatus } from '@/hooks/useStatus';
import { useCountdown } from '@/hooks/useCountdown';
import { sendMessage } from '@/services/messaging';
import { formatCountdown } from '@/utils/date';
import { quoteForDay } from '@/utils/quotes';
import { localDateKey } from '@/utils/date';
import { AuroraBackground } from './components/AuroraBackground';
import { playChime } from './components/chime';

/** Reads the platform this overlay is blocking from the URL (`?platform=…`). */
function resolvePlatform(): Platform {
  const raw = new URLSearchParams(location.search).get('platform');
  return PLATFORMS.includes(raw as Platform) ? (raw as Platform) : 'instagram';
}

/** Tells the content script to leave Instagram. */
function requestCloseInstagram(): void {
  window.parent.postMessage(
    { source: 'aperture-overlay', action: 'close-instagram' },
    '*',
  );
}

export function BlockOverlay() {
  const platform = resolvePlatform();
  const { settings } = useSettings();
  const { status } = useStatus(platform);
  const remainingMs = useCountdown();
  const [confirming, setConfirming] = useState(false);
  const [granting, setGranting] = useState(false);
  const firstBtnRef = useRef<HTMLButtonElement>(null);
  const chimed = useRef(false);

  // Gentle chime once, if enabled.
  useEffect(() => {
    if (settings?.playSound && !chimed.current) {
      chimed.current = true;
      playChime();
    }
  }, [settings?.playSound]);

  // Move focus into the dialog for keyboard users.
  useEffect(() => {
    firstBtnRef.current?.focus();
  }, []);

  if (!settings || !status) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background" />
    );
  }

  const quote = settings.showMotivationalQuote
    ? quoteForDay(localDateKey())
    : null;
  const overrideMinutes = settings.overrideMinutes;

  const doOverride = async (): Promise<void> => {
    setGranting(true);
    await sendMessage({ type: 'GRANT_OVERRIDE', platform });
    // The background broadcasts STATUS_CHANGED (blocked=false); the content
    // script removes this overlay. No further action needed here.
  };

  const onOverrideClick = (): void => {
    if (settings.confirmBeforeOverride) setConfirming(true);
    else void doOverride();
  };

  return (
    <ThemeProvider theme={settings.theme} accent={settings.accent}>
      <main className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-background px-6 text-foreground">
        <AuroraBackground />

        <motion.section
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="glass-strong relative z-10 w-full max-w-md rounded-4xl p-8 text-center shadow-elevated sm:p-10"
        >
          <div className="mx-auto mb-6 inline-flex animate-fade-in items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Daily limit reached
          </div>

          <ProgressRing
            progress={1}
            size={196}
            strokeWidth={14}
            tone="danger"
            className="mx-auto"
          >
            <div className="flex flex-col items-center">
              <div className="flex items-baseline gap-1 text-3xl font-semibold tracking-tight">
                <AnimatedNumber value={status.viewedCount} />
                <span className="text-muted-foreground">/</span>
                <span>{status.limit}</span>
              </div>
              <span className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                Views
              </span>
            </div>
          </ProgressRing>

          <h1
            className="mt-7 text-balance text-2xl font-semibold tracking-tight"
            aria-live="polite"
          >
            You&rsquo;ve reached today&rsquo;s {PLATFORM_META[platform].name} limit.
          </h1>

          {quote && (
            <p className="mx-auto mt-3 max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
              {quote}
            </p>
          )}

          <div className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-muted/60 px-4 py-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Resets in</span>
            <span className="font-semibold tabular-nums tracking-tight">
              {formatCountdown(remainingMs)}
            </span>
          </div>

          <div className="mt-8 flex flex-col gap-2.5">
            <Button
              ref={firstBtnRef}
              variant="accent"
              size="lg"
              onClick={requestCloseInstagram}
              className="w-full"
            >
              <LogOut className="h-4 w-4" />
              Close {PLATFORM_META[platform].name}
            </Button>
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="secondary"
                onClick={onOverrideClick}
                disabled={granting}
              >
                <Clock className="h-4 w-4" />
                {overrideMinutes}-min override
              </Button>
              <Button
                variant="outline"
                onClick={() => chrome.runtime.openOptionsPage()}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </div>
          </div>
        </motion.section>

        <AnimatePresence>
          {confirming && (
            <OverrideConfirm
              minutes={overrideMinutes}
              busy={granting}
              onCancel={() => setConfirming(false)}
              onConfirm={doOverride}
            />
          )}
        </AnimatePresence>
      </main>
    </ThemeProvider>
  );
}

/** Confirmation dialog shown before granting a temporary override. */
function OverrideConfirm({
  minutes,
  busy,
  onCancel,
  onConfirm,
}: {
  minutes: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 px-6 backdrop-blur-md"
      role="alertdialog"
      aria-modal="true"
      aria-label="Confirm temporary override"
    >
      <motion.div
        initial={{ scale: 0.95, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 8 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="glass-strong w-full max-w-sm rounded-3xl p-6 text-center shadow-elevated"
      >
        <h2 className="text-lg font-semibold">Take a {minutes}-minute break from the block?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Instagram will unblock for {minutes} minutes. This is logged in your
          override history — use it intentionally.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Stay focused
          </Button>
          <Button variant="accent" onClick={onConfirm} disabled={busy}>
            {busy ? 'Unlocking…' : `Unlock ${minutes}m`}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
