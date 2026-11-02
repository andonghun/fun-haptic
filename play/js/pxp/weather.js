// Weather lab: a little figure under twelve skies. ◀▶ changes the weather, R2 turns it up, L2 opens an umbrella,
// △ calls lightning. Each sky has its own touch: drops tap, snow whispers, blizzards gust from one side,
// fog swells, leaves and petals land, fireflies and shooting stars flicker through the auto-haptics.
import { effects, rnd, clamp, hud } from './common.js';
import { PX, drawFigure } from '../px.js';
import { IN } from '../input.js';
import { DS, TRG } from '../ds.js';
import { H } from '../haptics.js';
import { SND } from '../sound.js';
import { Light } from '../feel.js';
import { UI } from '../ui.js';
import { t } from '../i18n.js';

const FLOOR = 158, STRIKE = effects['lightning/lightning-strike'], STROKES = [0.76, 1.04, 1.26];
const SKY = [
  {id:'rain', fx:'weather/rain', drops:1, umbrella:true, bolt:true, bed:[['highpass', 2400], ['lowpass', 500]], light:[30, 60, 150]},
  {id:'storm', fx:'weather/storm', drops:1.4, umbrella:true, bolt:true, auto:0.9, bed:[['highpass', 2000], ['lowpass', 260]], light:[40, 40, 110]},
  {id:'snow', fx:'weather/snow', flakes:1, umbrella:true, bed:[['highpass', 5000], ['lowpass', 300]], light:[160, 190, 230]},
  {id:'blizzard', fx:'weather/blizzard', flakes:2.5, gust:1, bed:[['bandpass', 700], ['lowpass', 220]], light:[180, 210, 255]},
  {id:'fog', fx:'weather/fog', swell:1, bed:[['lowpass', 260]], light:[90, 100, 120]},
  {id:'leaves', fx:'weather/falling-leaves', land:1, gust:0.3, bed:[['bandpass', 900]], light:[230, 140, 50]},
  {id:'blossoms', fx:'weather/cherry-blossoms', land:0.7, gust:0.2, bed:[['bandpass', 1200]], light:[255, 160, 200]},
  {id:'fireflies', fx:'weather/fireflies', auto:1.4, bed:[['bandpass', 3800]], light:[180, 230, 90]},
  {id:'aurora', fx:'weather/aurora', wave:1, bed:[['lowpass', 180]], light:[60, 230, 170]},
  {id:'stars', fx:'weather/shooting-stars', auto:1.6, bed:[['lowpass', 140]], light:[120, 120, 255]},
  {id:'rays', fx:'weather/god-rays', wave:0.5, bed:[['bandpass', 600]], light:[255, 210, 140]},
  {id:'clouds', fx:'weather/clouds', gust:0.15, bed:[['lowpass', 400]], light:[150, 180, 220]}
].filter(s => effects[s.fx]);
const C = {cloth:PX.hex('#2f9e86'), cloth2:PX.hex('#1f6b5c'), rim:PX.hex('#9fe8d4'), pole:PX.hex('#2a2430')};

export function makeWeather(stage){
  let i = 0, sky = null, fx = null, beds = [], voice = null, strike = null, sx = 0, si = 0, acc = 0, ph = 0, gust = 0, gustPan = 0, drip = 0;
  const st = {I:0.4, open:0};
  function load(){
    if(fx) stage.remove(fx); beds.forEach(b => b.stop()); beds = [];
    sky = SKY[i]; fx = stage.fx(effects[sky.fx], {x:160, y:FLOOR + 12, keep:true, density:0.6});
    stage.setBg('sky', FLOOR);
    beds = sky.bed.map(([type, f]) => SND.bed({type, f, q:type === 'bandpass' ? 0.6 : 0.7, lfo:sky.gust ? 0.15 : 0.05}));
    stage.auto.enabled = !!sky.auto; stage.auto.gain = sky.auto || 1; stage.auto.cat = 'weather'; stage.auto.sound = false; stage.auto.peak = 0.02;
    Light.base = sky.light; UI.zone(t('wx_' + sky.id), sky.light);
    SND.notes([523, 659], 0.06, {gain:0.05, pad:true}); H.pulse(300, 0.4, 0.03);
  }
  return {
    id:'weather',
    enter(){
      stage.clear(); load(); voice = H.voice({f:160, q:0.6});
      DS.out.trigR = TRG.ramp(0, 1, 5); DS.out.trigL = TRG.feedback(3, 4);
      stage.paint = p => {
        drawFigure(stage.frame, 160, FLOOR, st.open > 0.3 ? {...PX.READY, fx:6, fy:-30, bx:4, by:-28} : {...PX.READY});
        const o = st.open; if(o < 0.05) return;
        const top = FLOOR - 50 - Math.round(o*8), r = Math.round(4 + o*18);
        p.line(166, FLOOR - 28, 166, top, C.pole);
        for(let dx = -r; dx <= r; dx++){ const yy = top - Math.round(Math.sqrt(Math.max(0, r*r - dx*dx))*0.45); p.line(166 + dx, yy, 166 + dx, top, (dx/2 | 0) % 2 ? C.cloth : C.cloth2); p.dot(166 + dx, yy, C.rim); }
      };
      UI.toast(t('wx_tip'), 4600);
    },
    exit(){ stage.paint = null; beds.forEach(b => b.stop()); voice && voice.stop(); stage.auto.enabled = false; stage.auto.sound = true; stage.auto.stop(); stage.clear(); DS.out.trigL = TRG.off(); DS.out.trigR = TRG.off(); },
    update(dt, live){
      if(live){
        if(IN.pressed('right') || IN.pressed('wnext') || IN.pressed('r1')){ i = (i + 1) % SKY.length; load(); }
        if(IN.pressed('left') || IN.pressed('wprev') || IN.pressed('l1')){ i = (i - 1 + SKY.length) % SKY.length; load(); }
      }
      const I = st.I = live ? 0.15 + 0.85*IN.r2 : st.I;
      st.open += ((live && IN.l2 > 0.3 && sky.umbrella ? 1 : 0) - st.open)*Math.min(1, dt*8);
      const open = st.open;
      fx.options.density = 0.15 + 1.7*I; fx.update(dt*(sky.id === 'rain' ? 0 : 0.6*I));     // stage advances it too; extra speed when cranked
      // drops on palms / drumming on the canopy
      if(sky.drops){ acc += dt*(8 + 70*I)*sky.drops;
        while(acc >= 1){ acc--;
          if(Math.random() < open) H.pulse(rnd(70, 120), rnd(0.25, 0.55)*(0.6 + 0.6*I), rnd(0.03, 0.05), rnd(-0.3, 0.3));
          else if(Math.random() < 0.88) H.pulse(rnd(260, 520), rnd(0.08, 0.24)*(0.5 + 0.7*I), rnd(0.012, 0.03), rnd(-1, 1));
          else H.pulse(rnd(110, 170), rnd(0.3, 0.5)*(0.5 + 0.7*I), 0.05, rnd(-1, 1)); } }
      // snow: feather-light ticks; under an umbrella they turn into soft pats
      if(sky.flakes){ acc += dt*(4 + 26*I)*sky.flakes;
        while(acc >= 1){ acc--; if(Math.random() < open) H.pulse(rnd(90, 140), rnd(0.12, 0.25), 0.05, rnd(-0.3, 0.3)); else H.pulse(rnd(400, 650), rnd(0.04, 0.12)*(0.6 + I), 0.015, rnd(-1, 1)); } }
      // leaves and petals landing one by one
      if(sky.land && Math.random() < dt*(1.2 + 4*I)*sky.land){ const p = rnd(-1, 1); H.pulse(rnd(160, 240), rnd(0.15, 0.35), 0.03, p); H.pulse(rnd(70, 100), 0.12, 0.06, p, 0.02); SND.noise({type:'bandpass', f:rnd(1500, 3000), q:2, dur:0.05, gain:0.03 + 0.04*I, pan:p*0.6}); }
      // gusts sweep from one side to the other
      if(sky.gust){ gust -= dt; if(gust <= 0){ gust = rnd(1.2, 3.5)/(0.5 + I); gustPan = Math.random() < 0.5 ? -1 : 1;
          for(let k = 0; k < 8; k++) H.noise({t:k*0.07, f:rnd(80, 150), q:0.6, dur:0.25, gain:(0.15 + 0.45*I)*sky.gust*Math.sin((k + 1)/9*Math.PI), pan:gustPan*(1 - k/4)});
          SND.noise({type:'bandpass', f:rnd(300, 700), q:0.4, dur:1.2, att:0.4, gain:(0.06 + 0.12*I)*sky.gust, pan:gustPan*0.6}); } }
      // slow swells: fog, aurora, god rays
      ph += dt*(0.4 + 0.8*I);
      const swell = sky.swell ? (0.12 + 0.2*I)*(0.6 + 0.4*Math.sin(ph)) : 0, wave = sky.wave ? (0.1 + 0.25*I)*sky.wave*(0.5 + 0.5*Math.sin(ph*0.7)) : 0;
      const base = sky.drops ? (0.05 + 0.12*I)*(1 - open*0.6) : sky.flakes ? 0.03 + 0.06*I : 0;
      voice.set(base + swell + wave, sky.swell ? 70 : sky.wave ? 55 + 30*Math.sin(ph*0.5) : 170 + 60*I, sky.wave ? Math.sin(ph*0.6) : 0);
      beds.forEach((b, k) => b.set((k === 0 ? 0.08 + 0.32*I : 0.06 + 0.18*I)*(sky.drops && k === 0 ? 1 - open*0.4 : 1), 0.3));
      if(open > 0.6 && sky.drops){ drip += dt*(1 + 3*I); if(drip > 1){ drip = 0; SND.tone({pad:true, f:rnd(900, 1500), fEnd:rnd(500, 700), dur:0.05, gain:0.08}); } }
      if(stage.auto.enabled) stage.auto.update(dt);
      // lightning (rain / storm only)
      if(live && sky.bolt && IN.pressed('interact') && !strike){ sx = Math.round(rnd(50, 270)); strike = stage.fx(STRIKE, {x:sx, y:FLOOR + 2}); si = 0; }
      if(strike){
        const tt = strike.t, pan = clamp((sx - 160)/140, -1, 1);
        if(tt < STROKES[0] && Math.random() < dt*(10 + 30*tt)){ const k = tt/STROKES[0]; H.noise({f:200 + 600*k, q:2, dur:0.05, gain:0.1 + 0.5*k, pan}); SND.noise({type:'highpass', f:3000 + 3000*k, dur:0.04, gain:0.02 + 0.07*k, pan:pan*0.6}); }
        while(si < STROKES.length && tt >= STROKES[si]){ const k = [1, 0.8, 0.55][si++];
          H.pulse(500, 1.4*k, 0.03, pan); H.pulse(30, 1.7*k, 0.6*k + 0.2, pan*0.5); for(let n = 0; n < 6; n++) H.noise({t:0.1 + n*0.12, f:rnd(35, 70), q:0.7, dur:0.22, gain:1.0*k*Math.pow(0.82, n), pan:-1 + n*0.4});
          SND.noise({f:2500, fEnd:200, q:0.5, dur:0.3, gain:0.6*k, pan:pan*0.6}); SND.tone({f:58, fEnd:28, dur:2.2*k, gain:0.35*k, type:'sawtooth'}); SND.noise({type:'lowpass', f:180, dur:2.8*k, att:0.08, gain:0.5*k, t:0.05});
          Light.flash([235, 240, 255], 200); stage.shake = [Math.round(rnd(-2, 2)), 1]; setTimeout(() => stage.shake = [0, 0], 120); }
        if(strike.done()){ stage.remove(strike); strike = null; }
      }
      hud(t('wx_' + sky.id), `${i + 1} / ${SKY.length} · ${t('x_rain_int')} ${Math.round(I*100)}%${open > 0.5 ? ' · ' + t('x_rain_l2') : ''}`, '',
        `<span class="key">◀▶</span> ${t('wx_change')} · <span class="key">R2</span> ${t('wx_more')}${sky.umbrella ? ` · <span class="key">L2</span> ${t('x_rain_l2')}` : ''}${sky.bolt ? ` · ${UI.key('interact')} ${t('x_thunder')}` : ''} · ${UI.key('pause')} ${t('menu')}`);
    }
  };
}
