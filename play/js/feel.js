// The game's "touch vocabulary": every event = sound (speakers) + haptic (hands) + lightbar.
import { H } from './haptics.js';
import { SND } from './sound.js';
import { DS } from './ds.js';

const rnd = (a, b) => a + Math.random()*(b - a);
const later = (ms, f) => setTimeout(f, ms);

export const Light = {
  base: [40, 110, 255], fl: null,
  flash(rgb, ms = 160){ this.fl = {rgb, until:performance.now() + ms}; },
  update(now){ const c = this.fl && now < this.fl.until ? this.fl.rgb : this.base; DS.out.rgb = c.map(v => Math.max(0, Math.min(255, Math.round(v)))); }
};
export const SURF_RGB = {metal:[150,175,210], wood:[200,120,50], grass:[60,200,70], snow:[225,238,255], stone:[180,180,190], water:[40,140,255], gravel:[170,150,120], sand:[230,200,130]};

export const Feel = {
  // Footstep: real recording on the speakers + the same recording converted to a haptic,
  // left foot → left coil, right foot → right coil, heel then toe (two hits 70 ms apart).
  step(key, left, heavy = false, k = 1){
    const p = rnd(0.92, 1.08), v = (heavy ? 1.5 : 1)*k, pan = left ? -0.85 : 0.85;
    Light.flash(SURF_RGB[key] || [255,255,255], 120);
    if(key === 'gravel' || key === 'sand'){
      const n = key === 'gravel' ? 7 : 4;
      for(let i = 0; i < n; i++){ const t = i*0.017 + Math.random()*0.01; SND.noise({t, type:'highpass', f:key === 'gravel' ? rnd(2400, 4400) : rnd(1500, 2500), dur:0.035, gain:0.22*v, pan:pan*0.3}); }
      SND.noise({type:'lowpass', f:500, dur:0.1, gain:0.2*v});
      for(let i = 0; i < n; i++) H.noise({t:i*0.02, f:rnd(200, 350), q:1.2, dur:0.03, gain:0.9*v, pan});
      H.pulse(70, 0.6*v, 0.08, pan);
      return;
    }
    if(key === 'water'){
      SND.noise({f:600, fEnd:2300, q:1.2, dur:0.38, att:0.02, gain:0.3*v, pan:pan*0.3}); SND.tone({f:500*p, fEnd:950, dur:0.13, gain:0.08*v}); SND.tone({t:0.07, f:720*p, fEnd:1250, dur:0.12, gain:0.06*v});
      H.noise({f:90, fEnd:260, q:1, dur:0.4, att:0.03, gain:0.8*v, pan}); H.pulse(140, 0.5*v, 0.25, pan); H.pulse(230, 0.4*v, 0.08, pan, 0.08); H.pulse(280, 0.3*v, 0.07, pan*0.6, 0.17);
      return;
    }
    const i = SND.play(key, {rate:p, gain:0.75*v, pan:pan*0.25});
    if(i < 0){ H.pulse(90, 0.8*v, 0.12, pan); return; }
    const hb = SND.hapOf(key, i);
    H.play(hb, p, 1.6*v, pan);
    if(!heavy) H.play(hb, p*1.2, 0.8*v, pan*0.6, 0.07);
  },
  jump(double){ SND.play('jump', {rate:double ? 1.3 : 1, gain:0.55}); H.play(SND.hapOf('jump', 0), double ? 1.3 : 1, 1.0, 0); H.pulse(double ? 160 : 110, 0.7, 0.09);
    if(double) SND.noise({type:'highpass', f:1800, dur:0.12, gain:0.12}); },
  land(k, key){                                   // k: 0..1.4 by fall speed
    SND.play('land', {rate:1.1 - k*0.2, gain:0.4 + k*0.3}); H.play(SND.hapOf('land', 0), 1.1 - k*0.2, 1.0 + k, 0);
    H.pulse(46, 0.6 + k*0.8, 0.1 + k*0.2); if(key) this.step(key, true, true, 0.5 + k*0.4);
  },
  coin(pan = 0, n = 0){ SND.play('coin', {gain:0.55, rate:1 + n*0.06, pan, pad:true}); H.pulse(840 + n*40, 0.7, 0.022, pan); H.pulse(1180 + n*40, 0.6, 0.025, pan, 0.055); Light.flash([255,215,60], 160); },
  // UI: tiny crisp ticks so menus feel physical
  uiMove(){ SND.tone({f:1400, dur:0.03, gain:0.05, type:'triangle', pad:true}); H.pulse(420, 0.35, 0.018); },
  uiSelect(){ SND.notes([880, 1320], 0.05, {gain:0.07, type:'triangle', dur:0.1, pad:true}); H.pulse(300, 0.8, 0.03); H.pulse(140, 0.6, 0.06, 0, 0.03); },
  uiBack(){ SND.tone({f:600, fEnd:350, dur:0.1, gain:0.06, type:'triangle', pad:true}); H.pulse(200, 0.5, 0.04); },
  uiError(){ SND.tone({f:180, dur:0.18, gain:0.1, type:'square'}); H.pulse(60, 0.9, 0.14); H.pulse(60, 0.9, 0.14, 0, 0.18); },
  // two-hand sweep used to test/teach left vs right
  sweep(){ for(let i = 0; i < 10; i++){ const p = -1 + i*2/9; H.pulse(120 + i*12, 0.8, 0.06, p, i*0.06); } SND.notes([523, 659, 784, 1047], 0.12, {gain:0.08}); },
  portal(k, pan){ H.tone(55 + k*40, 0.08 + k*0.22, 0.12, pan); },
  enterPortal(){ SND.noise({f:300, fEnd:4000, q:0.8, dur:0.9, att:0.3, gain:0.25}); SND.notes([392, 523, 784, 1047], 0.09, {gain:0.08}); for(let i = 0; i < 12; i++) H.pulse(60 + i*25, 0.4 + i*0.06, 0.06, Math.sin(i*1.3)*0.8, i*0.05); H.pulse(40, 1.5, 0.5, 0, 0.62); Light.flash([180,120,255], 900); },
  // treasure radar "heartbeat": k = closeness 0..1, pan = direction relative to the camera
  ping(k, pan){ const a = 0.18 + 0.75*k*k; H.pulse(70 + 90*k, a, 0.07, pan); H.pulse(50 + 60*k, a*0.7, 0.09, pan*0.8, 0.13);
    if(k > 0.55) SND.tone({f:420 + 500*k, dur:0.05, gain:0.04 + 0.06*k, pan:pan*0.6, type:'sine', pad:true}); },
  // digging texture per surface; k = how hard you rub (0..1)
  dig(key, k, pan = 0){
    const g = 0.25 + 0.6*k;
    if(key === 'snow'){ H.noise({f:rnd(160, 240), q:0.8, dur:0.06, gain:g, pan}); SND.noise({pad:true, type:'highpass', f:3000, dur:0.06, gain:0.08*g}); }
    else if(key === 'gravel' || key === 'stone'){ for(let i = 0; i < 3; i++) H.pulse(rnd(220, 420), g*0.8, 0.02, pan, i*0.018); SND.noise({pad:true, type:'highpass', f:rnd(2500, 4500), dur:0.04, gain:0.08*g}); }
    else if(key === 'metal'){ H.pulse(rnd(300, 380), g*0.7, 0.03, pan); SND.tone({pad:true, f:rnd(1800, 2400), dur:0.06, gain:0.03*g}); }
    else if(key === 'wood'){ H.pulse(rnd(140, 200), g*0.8, 0.04, pan); SND.noise({pad:true, f:900, q:2, dur:0.05, gain:0.08*g}); }
    else if(key === 'water'){ H.noise({f:rnd(80, 140), dur:0.12, gain:g, pan}); SND.noise({pad:true, f:rnd(700, 1400), q:1.4, dur:0.1, gain:0.08*g}); }
    else { H.noise({f:rnd(110, 170), q:0.7, dur:0.07, gain:g, pan}); SND.noise({pad:true, f:rnd(400, 900), q:0.8, dur:0.07, gain:0.07*g}); }
  },
  reveal(pan = 0){
    SND.play('break', {gain:0.7, rate:1.15}); H.play(SND.hapOf('break', 0), 1.1, 1.6, pan);
    later(160, () => { SND.notes([523, 659, 784, 1047, 1319], 0.07, {gain:0.1, type:'triangle'}); for(let i = 0; i < 9; i++) H.pulse(240 + i*45, 0.55, 0.03, i % 2 ? 0.7 : -0.7, i*0.05); });
    later(600, () => { H.pulse(55, 1.3, 0.25); SND.play('coin', {gain:0.6, rate:1.3}); });
    Light.flash([255,215,80], 900);
  },
  star(i){ SND.notes([659 + i*120, 988 + i*160], 0.06, {gain:0.12, type:'triangle'}); H.pulse(200 + i*80, 1.0, 0.05); H.pulse(60, 1.0 + i*0.2, 0.2, 0, 0.04); Light.flash([255,220,80], 300); },
  fanfare(){ SND.notes([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.11, {gain:0.12, type:'triangle', dur:0.28}); for(let i = 0; i < 16; i++) H.pulse(140 + i*22, 0.9, 0.06, Math.sin(i)*0.9, i*0.07); H.pulse(45, 1.5, 0.6, 0, 1.2); },
  fall(){ SND.play('fall', {gain:0.6}); for(let i = 0; i < 12; i++) H.pulse(150 - i*7, 0.12 + i*0.03, 0.08, rnd(-0.5, 0.5), i*0.07); },
  splash(k = 1){ SND.noise({f:500, fEnd:2500, q:0.8, dur:0.6, att:0.02, gain:0.35*k}); H.noise({f:80, fEnd:300, dur:0.5, gain:1.0*k}); H.pulse(50, 1.2*k, 0.25); }
};
