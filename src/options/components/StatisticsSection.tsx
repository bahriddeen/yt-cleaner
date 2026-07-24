import { useRef, useState } from 'react';
import {
  BarChart3,
  Flame,
  Timer,
  Repeat,
  Trophy,
  Download,
  Upload,
  Clock,
  Layers,
} from 'lucide-react';
import type { ImportPayload, Platform, Settings } from '@/types';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { PlatformSwitcher } from '@/components/PlatformSwitcher';
import { EmptyState } from '@/components/EmptyState';
import { ViewsBarChart } from '@/components/charts/ViewsBarChart';
import { TypeSplitChart } from '@/components/charts/TypeSplitChart';
import { SettingGroup } from './SettingRow';
import { useStatistics } from '@/hooks/useStatistics';
import { sendMessage } from '@/services/messaging';
import { downloadJson, readJsonFile } from '@/utils/file';
import { formatDuration } from '@/utils/format';

type Range = 'week' | 'month';

interface Props {
  settings: Settings;
}

/** Statistics dashboard: per-platform KPIs, charts, and data export/import. */
export function StatisticsSection({ settings }: Props) {
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [range, setRange] = useState<Range>('week');
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { stats } = useStatistics(platform);
  const limit = settings.platforms[platform].dailyLimit;

  const hasData =
    stats !== null &&
    stats.dailySeries.some((d) => d.totalViews > 0 || d.timeOnPlatformMs > 0);

  const windowSize = range === 'week' ? 7 : 30;
  const series = (stats?.dailySeries ?? []).slice(-windowSize);

  const rangeTotals = series.reduce(
    (acc, d) => {
      acc.views += d.totalViews;
      acc.feed += d.byType.feed;
      acc.reel += d.byType.reel;
      acc.story += d.byType.story;
      return acc;
    },
    { views: 0, feed: 0, reel: 0, story: 0 },
  );

  const exportData = async (): Promise<void> => {
    const payload = await sendMessage({ type: 'EXPORT_DATA' });
    downloadJson(`aperture-export-${payload.exportedAt}.json`, payload);
    setMessage('Exported your data.');
  };

  const onImportFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const payload = await readJsonFile<ImportPayload>(file);
      await sendMessage({ type: 'IMPORT_DATA', payload });
      setMessage('Settings imported successfully.');
    } catch {
      setMessage('That file could not be imported.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <PlatformSwitcher value={platform} onChange={setPlatform} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard index={0} icon={<Timer />} label="Time saved" value={formatDuration(stats?.timeSavedMs ?? 0)} tone="success" hint="estimated" />
        <StatCard index={1} icon={<Flame />} label="Current streak" value={`${stats?.currentStreak ?? 0}d`} tone="accent" />
        <StatCard index={2} icon={<Trophy />} label="Best streak" value={`${stats?.bestStreak ?? 0}d`} />
        <StatCard index={3} icon={<Clock />} label="Avg. session" value={formatDuration(stats?.averageSessionMs ?? 0)} />
        <StatCard index={4} icon={<Clock />} label="Longest session" value={formatDuration(stats?.longestSessionMs ?? 0)} />
        <StatCard index={5} icon={<Repeat />} label="Views / session" value={(stats?.averageViewsPerSession ?? 0).toFixed(1)} />
        <StatCard index={6} icon={<BarChart3 />} label="This week" value={stats?.weekViews ?? 0} />
        <StatCard index={7} icon={<BarChart3 />} label="This month" value={stats?.monthViews ?? 0} />
      </div>

      <SettingGroup title="Views over time">
        <div className="py-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="w-[200px]">
              <Segmented
                aria-label="Chart range"
                value={range}
                options={[
                  { value: 'week', label: 'Week' },
                  { value: 'month', label: 'Month' },
                ]}
                onChange={setRange}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {rangeTotals.views} views this {range}
            </span>
          </div>
          {hasData ? (
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <ViewsBarChart data={series} limit={limit} granularity={range} />
              </div>
              <div className="flex flex-col items-center gap-2 sm:w-40">
                <TypeSplitChart
                  byType={{ feed: rangeTotals.feed, reel: rangeTotals.reel, story: rangeTotals.story }}
                />
                <div className="flex flex-wrap justify-center gap-3 text-[11px] text-muted-foreground">
                  <LegendDot color="hsl(var(--accent))" label="Feed" />
                  <LegendDot color="hsl(var(--accent) / 0.45)" label="Reels" />
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Layers />}
              title="No activity yet"
              description="Once you start browsing, your daily views will appear here."
            />
          )}
        </div>
      </SettingGroup>

      <SettingGroup title="Your data" description="Everything is stored locally on this device.">
        <div className="flex flex-wrap items-center gap-3 py-5">
          <Button variant="secondary" onClick={exportData}>
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Import settings
          </Button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onImportFile} />
          {message && <span className="text-xs text-muted-foreground">{message}</span>}
        </div>
      </SettingGroup>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}
