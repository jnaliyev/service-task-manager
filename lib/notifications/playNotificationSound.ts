let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  const AudioContextClass =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) return null;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

function playOscillator(ctx: AudioContext) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  oscillator.frequency.setValueAtTime(880, now);
  oscillator.frequency.setValueAtTime(1174.66, now + 0.08);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

  oscillator.start(now);
  oscillator.stop(now + 0.42);
}

export async function unlockNotificationSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  console.log("[notification sound] context state:", ctx.state);

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch (error) {
      console.error("[notification sound] failed:", error);
      return;
    }
  }

  console.log("[notification sound] audio unlocked");
}

export function playNotificationSound() {
  console.log("[notification sound] trying to play");

  void (async () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      console.log("[notification sound] context state:", ctx.state);

      if (ctx.state === "suspended") {
        await ctx.resume();
        console.log("[notification sound] context state:", ctx.state);
      }

      playOscillator(ctx);
      console.log("[notification sound] played");
    } catch (error) {
      console.error("[notification sound] failed:", error);
    }
  })();
}
