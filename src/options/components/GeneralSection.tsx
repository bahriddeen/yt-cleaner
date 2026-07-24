import { useState } from 'react';
import type { ContentType, DeepPartialSettings, Platform, Settings } from '@/types';
import { PLATFORM_META } from '@/types';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { PlatformSwitcher } from '@/components/PlatformSwitcher';
import { LIMIT_RANGE, PLATFORM_SURFACES } from '@/config/surfaces';
import { getAdapter } from '@/content/platforms';
import { SettingGroup, SettingRow } from './SettingRow';

interface Props {
  settings: Settings;
  update: (patch: DeepPartialSettings) => Promise<void>;
}

/** Per-platform tracking configuration: enable, limit, surfaces, cleaner. */
export function GeneralSection({ settings, update }: Props) {
  const [platform, setPlatform] = useState<Platform>('instagram');
  const cfg = settings.platforms[platform];
  const name = PLATFORM_META[platform].name;
  const range = LIMIT_RANGE[platform];
  const surfaces = PLATFORM_SURFACES[platform];
  const hideTargets = getAdapter(platform).hideTargets;

  const patch = (p: Partial<typeof cfg>): void => {
    void update({ platforms: { [platform]: p } });
  };

  const toggleSurface = (type: ContentType): void => {
    const set = new Set(cfg.countSurfaces);
    set.has(type) ? set.delete(type) : set.add(type);
    patch({ countSurfaces: [...set] });
  };

  const toggleHidden = (id: string): void => {
    const set = new Set(cfg.hidden);
    set.has(id) ? set.delete(id) : set.add(id);
    patch({ hidden: [...set] });
  };

  return (
    <div className="space-y-6">
      <PlatformSwitcher value={platform} onChange={setPlatform} />

      <SettingGroup
        title={`${name} limit`}
        description={`Track and limit your daily viewing on ${name}.`}
      >
        <SettingRow
          title={`Track ${name}`}
          htmlFor="platform-enabled"
          description={`Turn off to stop counting and blocking on ${name}.`}
          control={
            <Switch
              id="platform-enabled"
              checked={cfg.enabled}
              onCheckedChange={(v) => patch({ enabled: v })}
            />
          }
        />
        <SettingRow
          title="Views per day"
          htmlFor="daily-limit"
          description="Resets automatically at local midnight."
        >
          <div className="w-14 rounded-xl bg-accent/10 py-1.5 text-center text-lg font-semibold tabular-nums text-accent">
            {cfg.dailyLimit}
          </div>
        </SettingRow>
        <div className="pb-5">
          <Slider
            id="daily-limit"
            aria-label={`Daily view limit for ${name}`}
            min={range.min}
            max={range.max}
            step={range.step}
            value={cfg.dailyLimit}
            onChange={(v) => patch({ dailyLimit: v })}
          />
          <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
            <span>{range.min}</span>
            <span>{range.max}</span>
          </div>
        </div>
      </SettingGroup>

      {surfaces.length > 1 && (
        <SettingGroup
          title="What to count"
          description="Choose which surfaces contribute to your daily count."
        >
          {surfaces.map((s) => (
            <SettingRow
              key={s.type}
              title={s.label}
              htmlFor={`surface-${s.type}`}
              description={s.description}
              control={
                <Switch
                  id={`surface-${s.type}`}
                  checked={cfg.countSurfaces.includes(s.type)}
                  onCheckedChange={() => toggleSurface(s.type)}
                />
              }
            />
          ))}
        </SettingGroup>
      )}

      {hideTargets.length > 0 && (
        <SettingGroup
          title={`Clean up ${name}`}
          description="Hide distracting surfaces entirely, even before the limit."
        >
          {hideTargets.map((t) => (
            <SettingRow
              key={t.id}
              title={t.label}
              htmlFor={`hide-${t.id}`}
              description={t.description}
              control={
                <Switch
                  id={`hide-${t.id}`}
                  checked={cfg.hidden.includes(t.id)}
                  onCheckedChange={() => toggleHidden(t.id)}
                />
              }
            />
          ))}
        </SettingGroup>
      )}
    </div>
  );
}
