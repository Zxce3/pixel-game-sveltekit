import type { TerrainType } from './types';

/**
 * Tiny synthesised sound kit (WebAudio, no asset files).
 * The AudioContext is created on the first user gesture via unlock().
 */
class Sfx {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private ambient: AudioBufferSourceNode | null = null;
    private noiseBuf: AudioBuffer | null = null;
    muted = false;

    unlock(): void {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') void this.ctx.resume();
            return;
        }
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 1;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 2;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; } // brown-ish noise
        this.startAmbient();
    }

    setMuted(m: boolean): void {
        this.muted = m;
        if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
    }

    private startAmbient(): void {
        if (!this.ctx || !this.master || !this.noiseBuf || this.ambient) return;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        src.loop = true;
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 420;
        const g = this.ctx.createGain();
        g.gain.value = 0.05;
        const lfo = this.ctx.createOscillator(); // slow swell, like distant waves
        const lfoGain = this.ctx.createGain();
        lfo.frequency.value = 0.12;
        lfoGain.gain.value = 0.025;
        lfo.connect(lfoGain).connect(g.gain);
        src.connect(lp).connect(g).connect(this.master);
        src.start();
        lfo.start();
        this.ambient = src;
    }

    private tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, to?: number): void {
        if (!this.ctx || !this.master) return;
        const t = this.ctx.currentTime + when;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(this.master);
        o.start(t);
        o.stop(t + dur + 0.02);
    }

    private noise(dur: number, freq: number, q: number, vol: number, type: BiquadFilterType = 'bandpass'): void {
        if (!this.ctx || !this.master || !this.noiseBuf) return;
        const t = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        src.playbackRate.value = 1 + Math.random() * 0.4;
        const f = this.ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq * (0.9 + Math.random() * 0.2);
        f.Q.value = q;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f).connect(g).connect(this.master);
        src.start(t, Math.random());
        src.stop(t + dur + 0.02);
    }

    step(terrain?: TerrainType): void {
        switch (terrain) {
            case 'R': case 'S': this.noise(0.16, 700, 1.2, 0.5); break;   // splashy
            case 'B': this.noise(0.09, 2400, 0.7, 0.35, 'highpass'); break; // sand
            case 'H': this.noise(0.06, 1400, 2, 0.4); break;               // gravel
            case 'F': this.noise(0.08, 900, 1.5, 0.4); break;              // leaves
            default: this.noise(0.07, 500, 1, 0.45);                       // grass
        }
    }
    bump(): void { this.tone(110, 0.12, 'square', 0.06, 0, 70); }
    discover(): void { this.tone(660, 0.12, 'sine', 0.07, 0.03); this.tone(990, 0.14, 'sine', 0.05, 0.1); }
    newMap(): void { [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.07, i * 0.07)); }
    click(): void { this.tone(820, 0.05, 'square', 0.03); }
}

export const sfx = new Sfx();
