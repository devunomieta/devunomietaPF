/**
 * Subtle synthesized sound chime using Web Audio API (Zero external audio asset dependency).
 * Compliant with modern browser autoplay policies.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a high-fidelity subtle melodic chime for notifications.
 */
export function playNotificationChime(severity: "info" | "success" | "warning" | "critical" = "info") {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Frequencies tailored to severity
    let freq1 = 587.33; // D5
    let freq2 = 880.0;  // A5
    if (severity === "critical") {
      freq1 = 440.0; // A4
      freq2 = 554.37; // C#5
    } else if (severity === "success") {
      freq1 = 523.25; // C5
      freq2 = 659.25; // E5
    }

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    osc1.frequency.setValueAtTime(freq1, now);
    osc1.frequency.exponentialRampToValueAtTime(freq2, now + 0.12);

    osc2.frequency.setValueAtTime(freq2, now + 0.08);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.08);

    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  } catch (err) {
    // Audio context may be restricted by user agent before gesture
  }
}
