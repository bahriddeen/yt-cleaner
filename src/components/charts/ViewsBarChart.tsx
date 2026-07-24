import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import type { DayRollup } from '@/types';
import { weekdayLabel, monthDayLabel } from '@/utils/date';

/**
 * Daily views as a rounded bar chart with a dashed limit reference line. Bars
 * turn danger-coloured on days the limit was reached. Colours come from CSS
 * variables so the chart tracks the active theme + accent.
 */
export function ViewsBarChart({
  data,
  limit,
  granularity = 'week',
}: {
  data: DayRollup[];
  limit: number;
  granularity?: 'week' | 'month';
}) {
  const chartData = data.map((d) => ({
    label: granularity === 'week' ? weekdayLabel(d.date) : monthDayLabel(d.date),
    views: d.totalViews,
    reached: d.limitReached,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          interval={granularity === 'month' ? 4 : 0}
        />
        {limit > 0 && (
          <ReferenceLine
            y={limit}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
        )}
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
          contentStyle={{
            borderRadius: 12,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--surface))',
            color: 'hsl(var(--foreground))',
            fontSize: 12,
            boxShadow: '0 8px 24px rgb(0 0 0 / 0.12)',
          }}
          labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
        />
        <Bar
          dataKey="views"
          radius={[6, 6, 6, 6]}
          maxBarSize={28}
          isAnimationActive={false}
        >
          {chartData.map((d, i) => (
            <Cell
              key={i}
              fill={d.reached ? 'hsl(var(--danger))' : 'hsl(var(--accent))'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
