import { Sun, Moon, Monitor, Check } from 'lucide-react';
import type { AccentColor, DeepPartialSettings, Settings, ThemeMode } from '@/types';
import { Segmented } from '@/components/ui/segmented';
import { cn } from '@/utils/cn';
import { SettingGroup, SettingRow } from './SettingRow';

interface Props {
  settings: Settings;
  update: (patch: DeepPartialSettings) => Promise<void>;
}

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: React.ReactNode }[] =
  [
    { value: 'light', label: 'Light', icon: <Sun className="h-3.5 w-3.5" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="h-3.5 w-3.5" /> },
    { value: 'system', label: 'System', icon: <Monitor className="h-3.5 w-3.5" /> },
  ];

const ACCENTS: { value: AccentColor; label: string; hsl: string }[] = [
  { value: 'violet', label: 'Violet', hsl: '258 89% 63%' },
  { value: 'blue', label: 'Blue', hsl: '217 91% 60%' },
  { value: 'emerald', label: 'Emerald', hsl: '158 74% 42%' },
  { value: 'rose', label: 'Rose', hsl: '347 89% 60%' },
  { value: 'amber', label: 'Amber', hsl: '32 95% 52%' },
  { value: 'cyan', label: 'Cyan', hsl: '189 94% 43%' },
];

/** Appearance: theme mode and accent colour. */
export function AppearanceSection({ settings, update }: Props) {
  return (
    <div className="space-y-6">
      <SettingGroup title="Theme" description="Match your system or pick a mode.">
        <SettingRow
          title="Colour scheme"
          description="Applies to the popup, settings and block screen."
        >
          <div className="w-[260px]">
            <Segmented
              aria-label="Theme"
              value={settings.theme}
              options={THEME_OPTIONS}
              onChange={(v) => void update({ theme: v })}
            />
          </div>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Accent" description="A splash of colour that’s yours.">
        <div className="py-5">
          <div
            role="radiogroup"
            aria-label="Accent colour"
            className="flex flex-wrap gap-3"
          >
            {ACCENTS.map((a) => {
              const selected = settings.accent === a.value;
              return (
                <button
                  key={a.value}
                  role="radio"
                  aria-checked={selected}
                  aria-label={a.label}
                  onClick={() => void update({ accent: a.value })}
                  className={cn(
                    'group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-transform hover:scale-105',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  )}
                  style={
                    {
                      background: `hsl(${a.hsl})`,
                      '--tw-ring-color': `hsl(${a.hsl})`,
                    } as React.CSSProperties
                  }
                >
                  {selected && <Check className="h-5 w-5 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      </SettingGroup>
    </div>
  );
}
