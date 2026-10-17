// Game audio on the default output device (speakers/headphones), plus the sample bank that the haptic vocabulary reuses.
import { H } from './haptics.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const R = 'assets/sfx/';
const BANK = {
  wood:  [0,1,2,3,4].map(i => `footstep_wood_00${i}.ogg`),
  grass: [0,1,2,3,4].map(i => `footstep_grass_00${i}.ogg`),
  snow:  [0,1,2,3,4].map(i => `footstep_snow_00${i}.ogg`),
  stone: [0,1,2,3,4].map(i => `footstep_concrete_00${i}.ogg`),
  metal: [0,1,2,3,4].map(i => `impactPlate_light_00${i}.ogg`),
  coin: ['coin.ogg'], jump: ['jump.ogg'], land: ['land.ogg'], break: ['break.ogg'], fall: ['fall.ogg'],
  blaster: ['blaster.ogg'], repeater: ['blaster_repeater.ogg'], eattack: ['enemy_attack.ogg'], edestroy: ['enemy_destroy.ogg'], ehurt: ['enemy_hurt.ogg'], swap: ['weapon_change.ogg'], heavy: ['impact_heavy.ogg']
};
// haptic conversion per bank: [carrier Hz, onset click Hz]
export const HAPF = {wood:[105,300], grass:[75,230], snow:[85,270], stone:[68,380], metal:[190,520], coin:[260,700], jump:[95,300], land:[55,260], break:[120,420], fall:[70,200],
  blaster:[70,420], repeater:[85,380], eattack:[90,300], edestroy:[60,260], ehurt:[110,340], swap:[160,600], heavy:[45,220]};

export const SND = {
  ctx: null, master: null, sfx: null, amb: null, buf: {}, hap: {}, vol: 0.8, ready: false,
  beds: [], padOn: true, padBus: null,
  init(){
    if(this.ctx) return;
    const c = this.ctx = new AudioContext({latencyHint:'interactive'});
    this.master = c.createGain(); this.master.gain.value = this.vol;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(c.destination);
    this.sfx = c.createGain(); this.sfx.connect(this.master); this.amb = c.createGain(); this.amb.gain.value = 0.7; this.amb.connect(this.master);
    this.load();
  },
  // Everything plays on the PC output. Sounds tagged {pad:true} (things happening "in your hands": pickups, clicks,
  // reloads, bowstring, UI ticks) go to the DualSense speaker instead when HD haptics are on (shared 4-ch context, ch1+ch2).
  attachPad(){
    if(!H.hd || !H.merger || this.padBus) return;
    const c = H.ctx, g = c.createGain(), comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 5;
    g.gain.value = this.vol*1.4; g.connect(comp); comp.connect(H.merger, 0, 0); comp.connect(H.merger, 0, 1); this.padBus = g;
  },
  get padActive(){ return this.padOn && !!this.padBus; },
  target(o){ return o.pad && this.padActive ? {c:H.ctx, dest:this.padBus} : {c:this.ctx, dest:this.pan(o.pan || 0)}; },
  unlock(){ this.init(); if(this.ctx.state === 'suspended') this.ctx.resume(); },
  setVolume(v){ this.vol = v; if(this.master) this.master.gain.value = v; if(this.padBus) this.padBus.gain.value = v*1.4; },
  async load(){
    await Promise.all(Object.entries(BANK).map(async ([k, files]) => {
      this.buf[k] = await Promise.all(files.map(f => fetch(R + f).then(r => r.arrayBuffer()).then(a => this.ctx.decodeAudioData(a)).catch(() => null)));
    }));
    this.ready = true;
  },
  // haptic version of a sample, built on first use
  hapOf(k, i){ const b = this.buf[k] && this.buf[k][i]; if(!b) return null; const key = k + i; if(!this.hap[key]) this.hap[key] = H.fromSound(b, HAPF[k][0], HAPF[k][1]); return this.hap[key]; },
  pan(p){ const s = this.ctx.createStereoPanner(); s.pan.value = clamp(p, -1, 1); s.connect(this.sfx); return s; },
  // play a bank sample (random variant unless i given); returns the variant index so the haptic can match it
  play(k, o = {}){
    if(!this.ctx || !this.buf[k]) return -1;
    const list = this.buf[k], i = o.i != null ? o.i : (Math.random()*list.length) | 0, b = list[i]; if(!b) return i;
    const {c, dest} = this.target(o), s = c.createBufferSource(), g = c.createGain(); s.buffer = b; s.playbackRate.value = o.rate || 1; g.gain.value = o.gain == null ? 0.8 : o.gain;
    s.connect(g).connect(dest); s.start(c.currentTime + (o.t || 0)); return i;
  },
  tone(o){
    if(!this.ctx) return; const {c, dest} = this.target(o), t0 = c.currentTime + (o.t || 0), dur = o.dur || 0.15, os = c.createOscillator(), g = c.createGain();
    os.type = o.type || 'sine'; os.frequency.setValueAtTime(o.f, t0); if(o.fEnd) os.frequency.exponentialRampToValueAtTime(o.fEnd, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(o.gain || 0.2, t0 + (o.att || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    os.connect(g).connect(dest); os.start(t0); os.stop(t0 + dur + 0.02);
  },
  nb: null,
  noiseBuf(){ if(!this.nb){ const c = this.ctx; this.nb = c.createBuffer(1, c.sampleRate*2, c.sampleRate); const d = this.nb.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1; } return this.nb; },   // AudioBuffers work in any context
  noise(o){
    if(!this.ctx) return; const {c, dest} = this.target(o), t0 = c.currentTime + (o.t || 0), dur = o.dur || 0.1;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf(); src.loop = true;
    const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q || 1; f.frequency.setValueAtTime(o.f || 1000, t0); if(o.fEnd) f.frequency.exponentialRampToValueAtTime(o.fEnd, t0 + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(o.gain || 0.3, t0 + (o.att || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(dest); src.start(t0, Math.random()*1.5); src.stop(t0 + dur + 0.02);
  },
  notes(list, step, o = {}){ list.forEach((f, i) => this.tone({...o, f, t:(o.t || 0) + i*step, dur:o.dur || 0.22})); },
  // continuous filtered-noise bed (wind, stream, rain); returns a handle with set(gain)
  bed(o){
    this.init(); const c = this.ctx, src = c.createBufferSource(); src.buffer = this.noiseBuf(); src.loop = true;
    const rec = {o, level:0, dead:false};
    const f = c.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.value = o.f || 800; f.Q.value = o.q || 0.7;
    const g = c.createGain(); g.gain.value = 0; src.connect(f).connect(g).connect(this.amb); src.start();
    let lfo = null; if(o.lfo){ lfo = c.createOscillator(); const lg = c.createGain(); lfo.frequency.value = o.lfo; lg.gain.value = (o.f || 800)*0.3; lfo.connect(lg).connect(f.frequency); lfo.start(); }
    Object.assign(rec, {
      set:(v, tc = 0.3) => { rec.level = v; g.gain.setTargetAtTime(v, c.currentTime, tc); },
      kill:() => { try{ src.stop(); if(lfo) lfo.stop(); }catch(e){} rec.dead = true; },
      stop:() => { rec.dead = true; g.gain.setTargetAtTime(0, c.currentTime, 0.2); setTimeout(() => { try{ src.stop(); if(lfo) lfo.stop(); }catch(e){} }, 1200); }});
    this.beds.push(rec); return rec;
  }
};
