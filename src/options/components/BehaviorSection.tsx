import type { DeepPartialSettings, Settings } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/utils/cn';
import { SettingGroup, SettingRow } from './SettingRow';

interface Props {
  settings: Settings;
  update: (patch: DeepPartialSettings) => Promise<void>;
}

const THRESHOLDS = [25, 50, 75, 90, 100];

/** Behaviour: blocking, ambience and notification preferences. */
export function BehaviorSection({ settings, update }: Props) {
  const toggleThreshold = (t: number): void => {
    const set = new Set(settings.notifyThresholds);
    set.has(t) ? set.delete(t) : set.add(t);
    void update({ notifyThresholds: [...set].sort((a, b) => a - b) });
  };

  return (
    <div className="space-y-6">
      <SettingGroup
        title="When the limit is reached"
        description="How Aperture behaves once you hit your daily limit."
      >
        <SettingRow
          title="Block the site"
          htmlFor="block"
          description="Show the full-screen block overlay after the limit."
          control={
            <Switch
              id="block"
              checked={settings.blockAfterLimit}
              onCheckedChange={(v) => void update({ blockAfterLimit: v })}
            />
          }
        />
        <SettingRow
          title="Blur the background"
          htmlFor="blur"
          description="Softly blur the page behind the overlay."
          control={
            <Switch
              id="blur"
              checked={settings.blurBackground}
              onCheckedChange={(v) => void update({ blurBackground: v })}
            />
          }
        />
        <SettingRow
          title="Motivational message"
          htmlFor="quote"
          description="Show an encouraging line on the block screen."
          control={
            <Switch
              id="quote"
              checked={settings.showMotivationalQuote}
              onCheckedChange={(v) => void update({ showMotivationalQuote: v })}
            />
          }
        />
        <SettingRow
          title="Confirm before override"
          htmlFor="confirm-override"
          description="Ask for confirmation before a temporary unlock."
          control={
            <Switch
              id="confirm-override"
              checked={settings.confirmBeforeOverride}
              onCheckedChange={(v) => void update({ confirmBeforeOverride: v })}
            />
          }
        />
        <SettingRow
          title="Override length"
          htmlFor="override-minutes"
          description={`A temporary unlock lasts ${settings.overrideMinutes} minutes.`}
        >
          <div className="w-12 rounded-xl bg-muted py-1.5 text-center text-sm font-semibold tabular-nums">
            {settings.overrideMinutes}m
          </div>
        </SettingRow>
        <div className="pb-5">
          <Slider
            id="override-minutes"
            aria-label="Override length in minutes"
            min={1}
            max={30}
            step={1}
            value={settings.overrideMinutes}
            onChange={(v) => void update({ overrideMinutes: v })}
          />
        </div>
      </SettingGroup>

      <SettingGroup
        title="Notifications"
        description="Gentle nudges as you approach your limit."
      >
        <SettingRow
          title="Enable notifications"
          htmlFor="notifications"
          description="System notifications at the thresholds you choose."
          control={
            <Switch
              id="notifications"
              checked={settings.notificationsEnabled}
              onCheckedChange={(v) => void update({ notificationsEnabled: v })}
            />
          }
        />
        <SettingRow
          title="Play a sound"
          htmlFor="sound"
          description="A soft chime when you reach the limit."
          control={
            <Switch
              id="sound"
              checked={settings.playSound}
              onCheckedChange={(v) => void update({ playSound: v })}
            />
          }
        />
        <div className="py-4">
          <p className="mb-2.5 text-sm font-medium">Notify me at</p>
          <div className="flex flex-wrap gap-2">
            {THRESHOLDS.map((t) => {
              const active = settings.notifyThresholds.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={active}
                  disabled={!settings.notificationsEnabled}
                  onClick={() => toggleThreshold(t)}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-sm font-medium transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:opacity-40',
                    active
                      ? 'bg-accent text-accent-foreground shadow-soft'
                      : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t}%
                </button>
              );
            })}
          </div>
        </div>
      </SettingGroup>
    </div>
  );
}
