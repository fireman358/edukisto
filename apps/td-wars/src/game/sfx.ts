/**
 * Audio 100 % synthétisé (WebAudio), sans aucun fichier.
 *
 * Tout passe par un `masterGain` unique : le volume et la coupure sont donc
 * instantanés et s'appliquent aussi aux nœuds déjà programmés.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private masterVol = 0.8;
  private sfxOn = true;
  private musicOn = true;
  private musicPlaying = false;
  private musicNodes = new Set<{ osc: OscillatorNode; gain: GainNode }>();
  private musicStopTimer = 0;

  get sfxEnabled(): boolean {
    return this.sfxOn;
  }

  get musicEnabled(): boolean {
    return this.musicOn;
  }

  setSfxEnabled(on: boolean): void {
    this.sfxOn = on;
  }

  setMusicEnabled(on: boolean): void {
    this.musicOn = on;
    if (!on) this.stopMusic();
    else if (!this.musicPlaying) this.startMusic();
  }

  /** setTimeout qui ne casse pas hors navigateur (harnais d'équilibrage). */
  private later(fn: () => void, ms: number): number {
    if (typeof window === 'undefined') return 0;
    return window.setTimeout(fn, ms);
  }

  private cancel(id: number): void {
    if (typeof window !== 'undefined') window.clearTimeout(id);
  }

  private ensure(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.masterVol;
        this.master.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private note(ctx: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, vol: number, pan = 0) {
    const master = this.master;
    if (!master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const p = ctx.createStereoPanner();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    g.gain.setValueAtTime(0, ctx.currentTime + start);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
    p.pan.setValueAtTime(pan, ctx.currentTime);
    osc.connect(g).connect(p).connect(master);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur + 0.05);
    const entry = { osc, gain: g };
    this.musicNodes.add(entry);
    // purge : sans ça, chaque cycle de 8 s laissait ~58 nœuds pour toujours
    osc.onended = () => {
      this.musicNodes.delete(entry);
      try {
        osc.disconnect();
        g.disconnect();
        p.disconnect();
      } catch {
        /* déjà déconnecté */
      }
    };
  }

  startMusic() {
    if (this.musicPlaying || !this.musicOn) return;
    const ctx = this.ensure();
    if (!ctx) return;
    this.musicPlaying = true;
    this.playMarchCycle(ctx);
  }

  stopMusic() {
    this.musicPlaying = false;
    this.cancel(this.musicStopTimer);
    const ctx = this.ctx;
    if (ctx) {
      for (const n of this.musicNodes) {
        try {
          n.gain.gain.cancelScheduledValues(ctx.currentTime);
          n.gain.gain.setValueAtTime(0, ctx.currentTime);
          n.osc.stop(ctx.currentTime + 0.05);
        } catch {
          /* déjà arrêté */
        }
      }
    }
    this.musicNodes.clear();
  }

  /** Coupe proprement le contexte quand l'onglet passe en arrière-plan. */
  suspend() {
    this.stopMusic();
    void this.ctx?.suspend();
  }

  /** Reprise après retour au premier plan (le contexte a pu être suspendu). */
  resume() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.musicOn) this.startMusic();
  }

  setVolume(v: number) {
    this.masterVol = Math.max(0, Math.min(1, Number.isFinite(v) ? v : this.masterVol));
    if (this.master) this.master.gain.value = this.masterVol;
  }

  get volume(): number {
    return this.masterVol;
  }

  private playMarchCycle(ctx: AudioContext) {
    if (!this.musicPlaying) return;
    // Marche héroïque originale : mineur, ostinato cordes, fanfare cuivres.
    // Gamme : La mineur naturelle. Aucune séquence existante.
    const N = (semi: number) => 220 * Math.pow(2, semi / 12); // base A3
    // ostinato rythmique (croches) : A A E E
    const ostinato = [0, 0, 7, 7, 0, 0, 12, 7];
    const ostDur = 0.18;
    for (let i = 0; i < 16; i++) {
      const s = i * ostDur;
      this.note(ctx, N(ostinato[i % 8]), s, ostDur * 0.9, 'sawtooth', 0.05, -0.4);
    }
    // fanfare cuivres : motif original (tierce montante + quarte, résolution)
    const fanfare: [number, number, number][] = [
      [0, 0.0, 0.5], [3, 0.25, 0.5], [7, 0.5, 0.5], [12, 0.75, 1.0],
      [8, 2.0, 0.4], [7, 2.4, 0.4], [5, 2.8, 0.9],
      [0, 3.6, 0.4], [3, 3.85, 0.4], [7, 4.1, 0.4], [10, 4.35, 1.2],
      [12, 5.6, 0.5], [10, 6.0, 0.5], [7, 6.4, 0.5], [3, 6.8, 1.2],
    ];
    for (const [semi, start, dur] of fanfare) {
      this.note(ctx, N(semi), start, dur, 'square', 0.07, 0.3);
      this.note(ctx, N(semi - 12), start, dur, 'square', 0.04, 0.3);
    }
    // timpani : La grave martelé
    for (const t of [0, 0.75, 2.0, 3.6, 5.6]) {
      this.note(ctx, N(-24), t, 0.35, 'sine', 0.14, 0);
      this.note(ctx, N(-24) * 1.01, t, 0.35, 'sine', 0.1, 0);
    }
    this.musicStopTimer = this.later(() => {
      if (this.musicPlaying) this.playMarchCycle(ctx);
    }, 8000);
  }

  private saberNodes: { osc: OscillatorNode; osc2: OscillatorNode; gain: GainNode; lfo: OscillatorNode } | null = null;

  startSaberHum() {
    if (!this.sfxOn || this.saberNodes) return;
    const ctx = this.ensure();
    const master = this.master;
    if (!ctx || !master) return;
    // hum du sabrelaser : deux oscillateurs désaccordés (battement) + LFO
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 92;
    osc2.type = 'sawtooth';
    osc2.frequency.value = 93.5;
    lfo.type = 'sine';
    lfo.frequency.value = 6;
    lfoGain.gain.value = 4;
    // enveloppe de 8 ms : plus de clic à l'allumage
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.008);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfoGain.connect(osc2.frequency);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(master);
    osc.start();
    osc2.start();
    lfo.start();
    this.saberNodes = { osc, osc2, gain, lfo };
  }

  saberSwing(speed: number) {
    if (!this.sfxOn) return;
    const ctx = this.ensure();
    const master = this.master;
    if (!ctx || !master) return;
    // swing : balayage de fréquence proportionnel au mouvement du curseur
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    const base = 140 + Math.min(400, speed * 3);
    osc.frequency.setValueAtTime(base, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, base * 0.4), ctx.currentTime + 0.18);
    g.gain.setValueAtTime(0.09, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(g).connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  stopSaberHum() {
    const ctx = this.ctx;
    if (!ctx || !this.saberNodes) return;
    const { osc, osc2, gain, lfo } = this.saberNodes;
    try {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      // release de 20 ms au lieu d'une coupure sèche
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.02);
      osc.stop(ctx.currentTime + 0.06);
      osc2.stop(ctx.currentTime + 0.06);
      lfo.stop(ctx.currentTime + 0.06);
    } catch {
      /* déjà arrêté */
    }
    this.saberNodes = null;
  }

  tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.12, slide = 0) {
    if (!this.sfxOn) return;
    const ctx = this.ensure();
    const master = this.master;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide !== 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + dur);
    }
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g).connect(master);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  shoot() { this.tone(880, 0.06, 'square', 0.05, -300); }
  laser() { this.tone(1400, 0.1, 'sawtooth', 0.05, -900); }
  boom() { this.tone(120, 0.25, 'triangle', 0.14, -60); }
  build() { this.tone(520, 0.09, 'sine', 0.1, 200); }
  error() { this.tone(160, 0.15, 'square', 0.08, -40); }
  leak() { this.tone(220, 0.35, 'sawtooth', 0.12, -160); }
  waveStart() {
    this.tone(330, 0.12, 'triangle', 0.1, 120);
    this.later(() => this.tone(440, 0.14, 'triangle', 0.1, 160), 120);
  }
  victory() {
    [523, 659, 784, 1047].forEach((f, i) => this.later(() => this.tone(f, 0.22, 'triangle', 0.12), i * 140));
  }
  defeat() {
    [392, 330, 262, 196].forEach((f, i) => this.later(() => this.tone(f, 0.3, 'sawtooth', 0.1), i * 180));
  }
}
