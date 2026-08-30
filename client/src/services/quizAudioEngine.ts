/**
 * QuizAudioEngine
 * Procedural Web Audio API sound synthesizer for interactive quizzes.
 *
 * Characteristics:
 *   - 0 external MP3 / audio assets
 *   - 0 network requests, immune to institutional firewalls
 *   - 0ms latency synthesis via Web Audio Oscillators + Gain envelopes
 *   - Auto-resumes AudioContext on user interaction
 *   - Volume and Mute controls
 */

class QuizAudioEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private volume: number = 0.4; // Default master volume (0.0 to 1.0)
  private hasInitializedListener: boolean = false;

  constructor() {
    this.setupAutoUnlock();
  }

  /**
   * Set up window listeners to automatically unlock AudioContext on first user gesture.
   */
  private setupAutoUnlock() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      this.ensureContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      // Remove listeners once unlocked
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    if (!this.hasInitializedListener) {
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
      window.addEventListener('touchstart', unlock, { once: true });
      this.hasInitializedListener = true;
    }
  }

  private ensureContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Play Correct Answer Sound
   * Upward arpeggio: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
   * If streak >= 3, adds a shimmering high overtone harmonic.
   */
  public playCorrect(streak: number = 0) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const noteDuration = 0.08;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = streak >= 3 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + i * noteDuration);

      const noteVol = this.volume * 0.45;
      gain.gain.setValueAtTime(0.001, now + i * noteDuration);
      gain.gain.exponentialRampToValueAtTime(noteVol, now + i * noteDuration + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (i + 1.2) * noteDuration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * noteDuration);
      osc.stop(now + (i + 1.5) * noteDuration);
    });

    // Special sparkle overlay for big streaks (🔥 >= 3)
    if (streak >= 3) {
      setTimeout(() => {
        this.playStreakBonus();
      }, 250);
    }
  }

  /**
   * Play Streak Bonus Sound
   * Shimmering harmonic chime
   */
  private playStreakBonus() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [1318.51, 1567.98, 2093.0]; // E6, G6, C7
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.001, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(this.volume * 0.3, now + idx * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.35);
    });
  }

  /**
   * Play Incorrect Answer Sound
   * Low, gentle descending buzz
   */
  public playIncorrect() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now); // A3
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.25); // Down to C3

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.35, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  /**
   * Play Countdown Tick Sound (Woodblock click)
   * Used for last 5 seconds of the question timer
   */
  public playTick(isLastSecond: boolean = false) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isLastSecond ? 1200 : 880, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(this.volume * (isLastSecond ? 0.4 : 0.2), now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Play Launch / Game Start Sound
   * Energizing ascending chime
   */
  public playStart() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [392, 523.25, 659.25, 783.99]; // G4, C5, E5, G5

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.001, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(this.volume * 0.4, now + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.3);
    });
  }

  /**
   * Play Podium Victory Fanfare
   * Triad fanfare with uplifting rhythm
   */
  public playPodium() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const fanfareNotes = [
      { freq: 523.25, time: 0, dur: 0.12 },     // C5
      { freq: 523.25, time: 0.15, dur: 0.12 },  // C5
      { freq: 523.25, time: 0.30, dur: 0.12 },  // C5
      { freq: 659.25, time: 0.45, dur: 0.25 },  // E5
      { freq: 783.99, time: 0.75, dur: 0.45 },  // G5
      { freq: 1046.5, time: 1.25, dur: 0.8 },   // C6 (triumph)
    ];

    fanfareNotes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0.001, now + time);
      gain.gain.linearRampToValueAtTime(this.volume * 0.5, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur + 0.05);
    });
  }
}

export const quizAudio = new QuizAudioEngine();
