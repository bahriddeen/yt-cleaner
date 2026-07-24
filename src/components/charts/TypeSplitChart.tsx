import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { ContentType } from '@/types';

/**
 * A compact donut showing the feed vs reels split. Uses accent + a secondary
 * hue derived from CSS variables.
 */
export function TypeSplitChart({
  byType,
  size = 120,
}: {
  byType: Record<ContentType, number>;
  size?: number;
}) {
  const data = [
    { name: 'Feed', value: byType.feed, color: 'hsl(var(--accent))' },
    { name: 'Reels', value: byType.reel, color: 'hsl(var(--accent) / 0.45)' },
    { name: 'Stories', value: byType.story, color: 'hsl(var(--muted-foreground) / 0.5)' },
  ].filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={total > 0 ? data : [{ name: 'empty', value: 1, color: 'hsl(var(--muted))' }]}
            dataKey="value"
            innerRadius={size * 0.32}
            outerRadius={size * 0.46}
            paddingAngle={total > 0 ? 3 : 0}
            stroke="none"
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            {(total > 0 ? data : [{ color: 'hsl(var(--muted))' }]).map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold">{total}</span>
        <span className="text-[10px] text-muted-foreground">views</span>
      </div>
    </div>
  );
}
