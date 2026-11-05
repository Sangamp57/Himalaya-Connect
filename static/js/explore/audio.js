/* Tiny generated interface tones — no audio assets, no autoplay. */
export class SoundEngine {
  constructor(enabled = false) {
    this.enabled = Boolean(enabled);
    this.context = null;
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    if (this.enabled) this.ensureContext();
  }

  ensureContext() {
    if (!this.enabled) return null;
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      this.context = new AudioContext();
    }
    if (this.context.state === "suspended") this.context.resume().catch(() => {});
    return this.context;
  }

  tone(frequency, duration = 0.16, type = "sine", volume = 0.04, delay = 0) {
    if (!this.enabled) return;
    const context = this.ensureContext();
    if (!context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  click() {
    this.tone(520, 0.08, "sine", 0.025);
  }

  focus() {
    this.tone(392, 0.11, "sine", 0.028);
    this.tone(587, 0.16, "sine", 0.02, 0.06);
  }

  success() {
    this.tone(523, 0.14, "sine", 0.035);
    this.tone(659, 0.16, "sine", 0.032, 0.1);
    this.tone(784, 0.24, "sine", 0.025, 0.2);
  }

  error() {
    this.tone(220, 0.16, "triangle", 0.025);
  }

  card() {
    this.tone(698, 0.12, "sine", 0.03);
    this.tone(880, 0.2, "sine", 0.024, 0.09);
  }
}
