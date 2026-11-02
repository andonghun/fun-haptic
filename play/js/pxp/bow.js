// Bow: the "Arrow shot" move scrubbed by R2. Pulling the trigger raises and draws the bow (the trigger gets heavier
// the further you pull — that's the string), limbs creak in your hands, full draw makes your arms tremble, and letting go
// snaps the string: kick, ringing left-right, and the thud of the arrow landing in the straw target a moment later.
import { effects, rnd, FLOOR, hud } from './common.js';
import { ActHaptic } from '../px.js';
import { IN } from '../input.js';
import { DS, TRG } from '../ds.js';
import { H } from '../haptics.js';
import { SND } from '../sound.js';
import { Light } from '../feel.js';
import { UI } from '../ui.js';
import { t } from '../i18n.js';

const MOD = effects['moves/arrow-shot'];
const LOOSE = MOD.act.poses[3][0];

export function makeBow(stage){
  let act = null, ah = null, from = 0, peak = 0, loosed = false, creak = 0, trem = 0, shots = 0;
  const fresh = () => { if(act) stage.remove(act); act = stage.act(MOD, {x:16, y:FLOOR, manual:true}); ah = new ActHaptic(MOD, {pan:0.7, cat:'arrow'}); from = act.t; peak = 0; loosed = false; };
  return {
    id:'bow',
    enter(){ stage.setBg('ground', FLOOR); stage.clear(); stage.auto.enabled = false; fresh(); DS.out.trigL = TRG.off(); DS.out.trigR = TRG.ramp(1, 1, 8); Light.base = [120, 255, 120]; UI.toast(t('x_bow_tip'), 4200); },
    exit(){ stage.clear(); DS.out.trigR = TRG.off(); },
    update(dt, live){
      const r = live ? IN.r2 : 0;
      if(!loosed){
        if(r > peak) peak = r;
        const target = from + (LOOSE - 0.01 - from)*peak;                 // scrub forward with the draw
        if(target > act.t) act.update(Math.min(target - act.t, dt*3));
        const k = peak;
        if(r > 0.06){ creak += dt; if(creak > 0.19 - 0.12*k){ creak = 0; H.pulse(56 + k*60 + rnd(-6, 6), 0.12 + 0.55*k*k, 0.08, rnd(-0.6, 0)); if(Math.random() < 0.4) SND.noise({pad:true, f:rnd(300, 700), q:4, dur:0.07, gain:0.1*k}); } }
        if(k > 0.94 && r > 0.9){ trem += dt; if(trem > 0.032){ trem = 0; H.pulse(30 + rnd(0, 6), 0.45, 0.035, (Math.random() < 0.5 ? -1 : 1)*0.45); } stage.shake = [Math.random() < 0.3 ? 1 : 0, 0]; } else stage.shake = [0, 0];
        if(peak > 0.55 && r < peak - 0.25){ loosed = true; shots++; stage.shake = [0, 0]; const kk = 0.6 + 0.55*peak;
          SND.tone({f:220, fEnd:95, dur:0.45, gain:0.2, type:'triangle'}); SND.noise({f:900, fEnd:2600, q:1, dur:0.35, gain:0.2*peak}); SND.tone({pad:true, f:180, fEnd:120, dur:0.3, gain:0.14, type:'sawtooth'});
          H.pulse(380, 1.4, 0.03); H.pulse(42, 1.6*kk, 0.5); H.pulse(95, 1.2*kk, 0.2, 0, 0.025);
          for(let i = 0; i < 10; i++) H.pulse(150 - i*6, 0.95*kk*Math.pow(0.72, i), 0.045, i % 2 ? -0.75 : 0.75, 0.07 + i*0.046);
          DS.out.trigR = TRG.vibration(0, 8, 70); setTimeout(() => DS.out.trigR = TRG.ramp(1, 1, 8), 170); Light.flash([255, 210, 140], 120); }
        else if(r < 0.04 && peak > 0.05 && peak <= 0.55){ fresh(); }
      } else {
        act.update(dt); ah.tick(act);
        if(act.t >= MOD.meta.duration - 0.05 && r < 0.1) fresh();
      }
      hud(t('x_bow'), '', `${shots}`, `<span class="key">R2</span> ${t('x_draw')} · ${UI.key('pause')} ${t('menu')}`);
    }
  };
}
