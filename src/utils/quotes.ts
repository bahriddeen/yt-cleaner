/** Motivational lines shown on the block overlay. */
export const MOTIVATIONAL_QUOTES: readonly string[] = [
  'Every scroll you avoid today is time invested in your future.',
  'The feed will still be there tomorrow. Your attention is yours today.',
  'You just bought yourself back some time. Spend it well.',
  'Presence over feeds. You chose presence.',
  'Small boundaries, compounding into a calmer mind.',
  'The best highlight reel is the life you live offline.',
  'Discipline is choosing what you want most over what you want now.',
  'You closed the loop. Go make something.',
] as const;

/** Deterministically picks a quote for a given day so it stays stable. */
export function quoteForDay(dateKey: string): string {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  const idx = hash % MOTIVATIONAL_QUOTES.length;
  return MOTIVATIONAL_QUOTES[idx] ?? MOTIVATIONAL_QUOTES[0]!;
}
