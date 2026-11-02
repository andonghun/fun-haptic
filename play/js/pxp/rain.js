// Rain: pixel rain whose density follows R2; drops tap your palms (faster and harder as it pours).
// L2 opens an umbrella over the little hero — the drops turn into deeper drumming on the canopy.
// △ calls lightning: a sigil charges (static crackles up through your hands), then three strokes slam down.
import { effects, rnd, clamp, FLOOR, hud } from './common.js';
import { PX } from '../px.js';
import { IN } from '../input.js';
import { DS, TRG } from '../ds.js';
import { H } from '../haptics.js';
import { SND } from '../sound.js';
import { Light } from '../feel.js';
import { UI } from '../ui.js';
import { t } from '../i18n.js';

const RAIN = effects['weather/rain'], STRIKE = effects['lightning/lightning-strike'];
const STROKES = [0.76, 1.04, 1.26];
const C = {cloth:PX.hex('#2a5fd0'), cloth2:PX.hex('#1d3f94'), rim:PX.hex('#8fb4ff'), pole:PX.hex('#2a2430')};

export function makeRain(stage){
  let rain = null, beds = [], hv = null, strike = null, strikeX = 0, si = 0;
  const st = {I:0.3, drop:0, open:0, drip:0};
  return {
    id:'rain',
    enter(){
      stage.setBg('sky', FLOOR); stage.clear(); stage.auto.enabled = false;
      rain = stage.fx(RAIN, {x:160, y:FLOOR + 20, keep:true, density:0.3});
      stage.paint = p => {                                     // hero + umbrella
        const ac = PX.stockActor(1); p.place(160, FLOOR); PX.drawActor(p, ac); p.place(0, 0);
        const o = st.open; if(o < 0.05) return;
        const top = FLOOR - 30 - Math.round(o*8), r = Math.round(4 + o*16);
        p.line(164, FLOOR - 14, 164, top, C.pole);
        for(let dx = -r; dx <= r; dx++){ const yy = top - Math.round(Math.sqrt(Math.max(0, r*r - dx*dx))*0.45); p.line(164 + dx, yy, 164 + dx, top, (dx/2 | 0) % 2 ? C.cloth : C.cloth2); p.dot(164 + dx, yy, C.rim); }
      };
      DS.out.trigR = TRG.ramp(0, 1, 5); DS.out.trigL = TRG.feedback(3, 4); Light.base = [30, 50, 110];
      beds = [SND.bed({type:'highpass', f:2400, q:0.3}), SND.bed({type:'lowpass', f:500, lfo:0.07}), SND.bed({type:'bandpass', f:1100, q:0.8})];
      hv = H.voice({f:180, q:0.6}); UI.toast(t('x_rain_tip'), 4200);
    },
    exit(){ stage.paint = null; beds.forEach(b => b.stop()); hv && hv.stop(); stage.clear(); DS.out.trigL = TRG.off(); DS.out.trigR = TRG.off(); },
    update(dt, live){
      const I = st.I = live ? 0.12 + 0.88*IN.r2 : st.I, open = st.open += ((live && IN.l2 > 0.3 ? 1 : 0) - st.open)*Math.min(1, dt*8);
      rain.options.density = 0.15 + 1.7*I;
      // drops on palms vs drumming on the canopy
      st.drop += dt*(8 + 70*I);
      while(st.drop >= 1){ st.drop--;
        if(Math.random() < open) H.pulse(rnd(70, 120), rnd(0.25, 0.55)*(0.6 + 0.6*I), rnd(0.03, 0.05), rnd(-0.3, 0.3));
        else if(Math.random() < 0.88) H.pulse(rnd(260, 520), rnd(0.07, 0.22)*(0.5 + 0.7*I), rnd(0.012, 0.03), rnd(-1, 1));
        else H.pulse(rnd(110, 170), rnd(0.3, 0.5)*(0.5 + 0.7*I), 0.05, rnd(-1, 1)); }
      hv.set((0.05 + 0.12*I)*(1 - open*0.6), 160 + 60*I, 0);
      beds[0].set((0.08 + 0.35*I)*(1 - open*0.4), 0.2); beds[1].set(0.08 + 0.2*I, 0.4); beds[2].set(open*(0.1 + 0.35*I), 0.1);
      if(open > 0.6){ st.drip += dt*(1 + 3*I); if(st.drip > 1){ st.drip = 0; SND.tone({pad:true, f:rnd(900, 1500), fEnd:rnd(500, 700), dur:0.05, gain:0.08}); } }
      // lightning
      if(live && IN.pressed('interact') && !strike){ strikeX = Math.round(rnd(60, 260)); strike = stage.fx(STRIKE, {x:strikeX, y:FLOOR + 2}); si = 0; }
      if(strike){
        const tt = strike.t, pan = clamp((strikeX - 160)/140, -1, 1);
        if(tt < STROKES[0] && Math.random() < dt*(10 + 30*tt)){ const k = tt/STROKES[0]; H.noise({f:200 + 600*k, q:2, dur:0.05, gain:0.08 + 0.45*k, pan}); SND.noise({type:'highpass', f:3000 + 3000*k, dur:0.04, gain:0.02 + 0.07*k, pan:pan*0.6}); }
        while(si < STROKES.length && tt >= STROKES[si]){ const k = [1, 0.8, 0.55][si++];
          H.pulse(500, 1.4*k, 0.03, pan); H.pulse(30, 1.7*k, 0.6*k + 0.2, pan*0.5); for(let i = 0; i < 6; i++) H.noise({t:0.1 + i*0.12, f:rnd(35, 70), q:0.7, dur:0.22, gain:1.0*k*Math.pow(0.82, i), pan:-1 + i*0.4});
          SND.noise({f:2500, fEnd:200, q:0.5, dur:0.3, gain:0.6*k, pan:pan*0.6}); SND.tone({f:58, fEnd:28, dur:2.2*k, gain:0.35*k, type:'sawtooth'}); SND.noise({type:'lowpass', f:180, dur:2.8*k, att:0.08, gain:0.5*k, t:0.05});
          Light.flash([235, 240, 255], 200); stage.shake = [Math.round(rnd(-2, 2)), 1]; setTimeout(() => stage.shake = [0, 0], 120); }
        if(strike.done()){ stage.remove(strike); strike = null; }
      }
      Light.base = [30 + 30*I, 50 + 40*I, 110 + 80*I];
      hud(t('x_rain'), `${t('x_rain_int')} ${Math.round(I*100)}%${open > 0.5 ? ' · ☂' : ''}`, '', `<span class="key">R2</span> ${t('x_rain_r2')} · <span class="key">L2</span> ${t('x_rain_l2')} · ${UI.key('interact')} ${t('x_thunder')} · ${UI.key('pause')} ${t('menu')}`);
    }
  };
}
