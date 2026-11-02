// Shared bits for pixel experiences: effect loading, gun sounds, HUD helpers.
import { effects, categories } from '../../../vendor/pixelfx/src/fx/index.js';
import { H } from '../haptics.js';
import { SND } from '../sound.js';
import { $ } from '../ui.js';

export { effects, categories };
export const rnd = (a, b) => a + Math.random()*(b - a);
export const later = (ms, f) => setTimeout(f, ms);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const W = 320, HGT = 180, FLOOR = 150;

export const Sfx = {
  gunshot(big = true, pan = -0.4){
    SND.noise({type:'highpass', f:1500, dur:0.05, gain:big ? 0.8 : 0.7, pan});
    SND.noise({type:'lowpass', f:big ? 800 : 1100, dur:big ? 0.3 : 0.2, gain:big ? 0.7 : 0.5, pan});
    SND.tone({f:big ? 110 : 130, fEnd:40, dur:big ? 0.22 : 0.15, gain:big ? 0.55 : 0.4, pan});
    SND.noise({type:'bandpass', f:420, q:0.4, dur:big ? 1.1 : 0.7, att:0.02, gain:0.12, t:0.03});
  },
  casing(){ later(300, () => { SND.noise({pad:true, type:'bandpass', f:rnd(4200, 5200), q:6, dur:0.025, gain:0.12}); later(90, () => SND.noise({pad:true, type:'bandpass', f:rnd(4200, 5200), q:6, dur:0.02, gain:0.06})); }); },
  click(){ SND.tone({pad:true, f:1800, dur:0.03, gain:0.12, type:'square'}); H.pulse(500, 0.6, 0.015); }
};
export function hud(title, sub, right, ctl){ $('hTitle').textContent = title; $('hSub').innerHTML = sub || ''; $('hRight').innerHTML = right || ''; $('hCtl').innerHTML = ctl || ''; }
