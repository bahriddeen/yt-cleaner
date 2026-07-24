/**
 * Plays a soft, two-note chime using the Web Audio API — no bundled asset.
 * Deliberately gentle (sine tones, quick fade) so it feels calming, not alarming.
 */
export function playChime(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25]; // C5, E5

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.14;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.95);
    });

    window.setTimeout(() => void ctx.close(), 1200);
  } catch {
    /* audio blocked or unsupported — silent fallback */
  }
}
