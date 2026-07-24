import { useState } from 'react';
import { Bug, TriangleAlert } from 'lucide-react';
import type { DeepPartialSettings, Settings } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { sendMessage } from '@/services/messaging';
import { SettingGroup, SettingRow } from './SettingRow';

interface Props {
  settings: Settings;
  update: (patch: DeepPartialSettings) => Promise<void>;
}

/** Advanced: debug mode and destructive data reset. */
export function AdvancedSection({ settings, update }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const resetAll = async (): Promise<void> => {
    await sendMessage({ type: 'RESET_ALL' });
    setConfirming(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  };

  return (
    <div className="space-y-6">
      <SettingGroup
        title="Developer"
        description="Tools for calibrating detection on the live page."
      >
        <SettingRow
          title="Debug mode"
          htmlFor="debug"
          description="Show an on-page heads-up display of what the tracker is counting on Instagram."
          control={
            <Switch
              id="debug"
              checked={settings.debugMode}
              onCheckedChange={(v) => void update({ debugMode: v })}
            />
          }
        />
        {settings.debugMode && (
          <div className="flex items-start gap-2 py-4 text-xs text-muted-foreground">
            <Bug className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p>
              Open Instagram in a tab to see the debug overlay in the bottom-left
              corner. It shows the current route, counted total and recent
              detection events.
            </p>
          </div>
        )}
      </SettingGroup>

      <SettingGroup
        title="Danger zone"
        description="These actions cannot be undone."
      >
        <div className="py-5">
          {done ? (
            <p className="text-sm text-success">All data has been reset.</p>
          ) : confirming ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-4">
              <div className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                <p className="text-sm">
                  This will permanently erase your settings, counts, statistics
                  and history. Are you sure?
                </p>
              </div>
              <div className="flex gap-2.5">
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={resetAll}>
                  Erase everything
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setConfirming(true)}>
              <TriangleAlert className="h-4 w-4 text-danger" />
              Reset all data
            </Button>
          )}
        </div>
      </SettingGroup>
    </div>
  );
}
