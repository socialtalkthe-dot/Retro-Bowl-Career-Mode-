export type RetroSound =
  | 'click'
  | 'beep'
  | 'beep2'
  | 'throw'
  | 'tackle'
  | 'kick'
  | 'post'
  | 'bounce'
  | 'audible'
  | 'audience_fg'
  | 'audience_dis'
  | 'audience_idle'
  | 'oof1'
  | 'oof2'
  | 'oof3'
  | 'success'
  | 'error'
  | 'purchase'
  | 'starrating'
  | 'drink'
  | 'timeout'
  | 'brass1'
  | 'brass2'
  | 'brass3'
  | 'brass4';

const SOUND_FILES: Record<RetroSound, string> = {
  click: '/retrobowl/snd_click.ogg',
  beep: '/retrobowl/snd_beep.ogg',
  beep2: '/retrobowl/snd_beep2.ogg',
  throw: '/retrobowl/snd_throw.ogg',
  tackle: '/retrobowl/snd_tackle.ogg',
  kick: '/retrobowl/snd_kick.ogg',
  post: '/retrobowl/snd_post.ogg',
  bounce: '/retrobowl/snd_bounce.ogg',
  audible: '/retrobowl/snd_audible.ogg',
  audience_fg: '/retrobowl/snd_audience_fg.ogg',
  audience_dis: '/retrobowl/snd_audience_dis.ogg',
  audience_idle: '/retrobowl/snd_audience_idle.ogg',
  oof1: '/retrobowl/snd_oof1.ogg',
  oof2: '/retrobowl/snd_oof2.ogg',
  oof3: '/retrobowl/snd_oof3.ogg',
  success: '/retrobowl/snd_success.ogg',
  error: '/retrobowl/snd_error.ogg',
  purchase: '/retrobowl/snd_purchase.ogg',
  starrating: '/retrobowl/snd_starrating.ogg',
  drink: '/retrobowl/snd_drink.ogg',
  timeout: '/retrobowl/snd_timeout.ogg',
  brass1: '/retrobowl/snd_co_brass1.ogg',
  brass2: '/retrobowl/snd_co_brass2.ogg',
  brass3: '/retrobowl/snd_co_brass3.ogg',
  brass4: '/retrobowl/snd_co_brass4.ogg',
};

class RetroAudioEngine {
  private muted = false;
  private volume = 0.65;
  private ctx: AudioContext | null = null;
  private buffers: Map<RetroSound, AudioBuffer> = new Map();
  private loading: Map<RetroSound, Promise<void>> = new Map();
  private htmlPool: Map<RetroSound, HTMLAudioElement> = new Map();
  private crowdSource: AudioBufferSourceNode | null = null;
  private crowdGain: GainNode | null = null;
  private crowdAudioEl: HTMLAudioElement | null = null;
  private preloaded = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        this.ctx = new Ctx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockAndPreload() {
    if (this.preloaded) {
      this.ensureContext();
      return;
    }
    this.preloaded = true;
    const ctx = this.ensureContext();
    if (!ctx) return;
    (Object.keys(SOUND_FILES) as RetroSound[]).forEach((key) => {
      void this.loadBuffer(key);
    });
  }

  private async loadBuffer(sound: RetroSound): Promise<void> {
    if (this.buffers.has(sound)) return;
    const existing = this.loading.get(sound);
    if (existing) return existing;

    const task = (async () => {
      try {
        const ctx = this.ensureContext();
        if (!ctx) return;
        const res = await fetch(SOUND_FILES[sound]);
        if (!res.ok) return;
        const arr = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arr);
        this.buffers.set(sound, decoded);
      } catch {
        // Fallback to HTMLAudioElement on decode errors
      }
    })();

    this.loading.set(sound, task);
    return task;
  }

  public isMuted() {
    return this.muted;
  }

  public setMuted(m: boolean) {
    this.muted = m;
    if (this.crowdGain && this.ctx) {
      this.crowdGain.gain.setValueAtTime(m ? 0 : 0.14, this.ctx.currentTime);
    }
    if (this.crowdAudioEl) {
      this.crowdAudioEl.muted = m;
    }
  }

  public toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public play(sound: RetroSound, volScale = 1) {
    if (this.muted) return;
    const targetVol = Math.max(0, Math.min(1, this.volume * volScale));
    const ctx = this.ensureContext();
    if (!this.preloaded) {
      this.unlockAndPreload();
    }

    const buf = this.buffers.get(sound);
    if (ctx && buf) {
      try {
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = buf;
        gain.gain.value = targetVol;
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start(0);
        return;
      } catch {
        // Fallback below
      }
    }

    try {
      const src = SOUND_FILES[sound];
      if (!src) return;
      let base = this.htmlPool.get(sound);
      if (!base) {
        base = new Audio(src);
        base.preload = 'auto';
        this.htmlPool.set(sound, base);
      }
      const instance = base.cloneNode() as HTMLAudioElement;
      instance.volume = targetVol;
      instance.play().catch(() => {});
      void this.loadBuffer(sound);
    } catch {
      // Safe no-op
    }
  }

  public async startCrowdAmbience() {
    this.unlockAndPreload();
    const ctx = this.ensureContext();
    if (ctx) {
      await this.loadBuffer('audience_idle');
      const buf = this.buffers.get('audience_idle');
      if (buf) {
        this.stopCrowdAmbience();
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = buf;
        src.loop = true;
        gain.gain.value = this.muted ? 0 : 0.14;
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start(0);
        this.crowdSource = src;
        this.crowdGain = gain;
        return;
      }
    }

    try {
      if (!this.crowdAudioEl) {
        this.crowdAudioEl = new Audio(SOUND_FILES.audience_idle);
        this.crowdAudioEl.loop = true;
      }
      this.crowdAudioEl.volume = 0.14;
      this.crowdAudioEl.muted = this.muted;
      this.crowdAudioEl.play().catch(() => {});
    } catch {
      // Ignore
    }
  }

  public stopCrowdAmbience() {
    if (this.crowdSource) {
      try {
        this.crowdSource.stop();
      } catch {
        // Ignore
      }
      this.crowdSource = null;
      this.crowdGain = null;
    }
    if (this.crowdAudioEl) {
      this.crowdAudioEl.pause();
      this.crowdAudioEl.currentTime = 0;
    }
  }

  public playOof() {
    const picks: RetroSound[] = ['oof1', 'oof2', 'oof3'];
    this.play(picks[Math.floor(Math.random() * picks.length)], 0.9);
  }

  public playBrass() {
    const picks: RetroSound[] = ['brass1', 'brass2', 'brass3', 'brass4'];
    this.play(picks[Math.floor(Math.random() * picks.length)], 0.65);
  }

  public playTouchdown() {
    this.play('audience_fg', 0.95);
    setTimeout(() => this.playBrass(), 140);
  }
}

export const retroAudio = new RetroAudioEngine();
