// Pistol: the "Pistol shots" move, but every shot waits for your R2 — the trigger breaks with a click halfway,
// the gun kicks, the round crosses the floor and the straw target rocks. Three rounds, then he lowers and reloads.
// Machine gun: hold R2 — the trigger itself vibrates, a burst pours out at 12 rounds a second and chews the wall;
// keep firing and it overheats: the trigger goes stiff and the barrel hisses until it cools.
import { effects, rnd, clamp, FLOOR, hud, Sfx, later } from './common.js';
import { PX, ActHaptic, drawFigure } from '../px.js';
import { IN } from '../input.js';
import { DS, TRG } from '../ds.js';
import { H } from '../haptics.js';
import { SND } from '../sound.js';
import { Light } from '../feel.js';
import { UI } from '../ui.js';
import { t } from '../i18n.js';

const SHOTS_MOD = effects['moves/pistol-shots'], SHOTS = [0.14, 0.42, 0.7];

export function makePistol(stage){
  let act = null, ah = null, gate = 0.1, i = 0, armed = true, prevT = -1, shots = 0, hits = 0;
  const X = 50;
  const fresh = () => { if(act) stage.remove(act); act = stage.act(SHOTS_MOD, {x:X, y:FLOOR, manual:true}); ah = new ActHaptic(SHOTS_MOD, {pan:0.55, cat:'gun'}); gate = 0.1; i = 0; prevT = act.t; trig(); };
  const trig = () => { DS.out.trigL = TRG.off(); DS.out.trigR = i < 3 && act && act.t < 0.12 + (i ? SHOTS[i - 1] + 0.26 : 0) + 1 ? TRG.weapon(4, 6, 8) : TRG.feedback(2, 1); };
  return {
    id:'pistol',
    enter(){ stage.setBg('ground', FLOOR); stage.clear(); stage.auto.enabled = false; fresh(); Light.base = [255, 200, 90]; UI.toast(t('x_pistol_tip'), 4200); },
    exit(){ stage.clear(); DS.out.trigR = TRG.off(); },
    update(dt, live){
      if(live && IN.r2 < 0.3) armed = true;
      if(live && armed && IN.r2 > 0.62){ armed = false; if(i < 3 && act.t >= gate - 0.02){ gate = SHOTS[i] + 0.26; i++; if(i === 3) gate = Infinity; } else Sfx.click(); }
      const step = Math.max(0, Math.min(dt, gate - act.t)); act.update(act.frozen ? dt : step);
      const tt = act.t;
      SHOTS.forEach(s => { if(prevT < s && tt >= s){ shots++; Sfx.gunshot(true, -0.5); Sfx.casing(); H.pulse(330, 1.4, 0.03, -0.3); H.pulse(48, 1.6, 0.26); H.pulse(130, 1.0, 0.1); H.pulse(600, 0.5, 0.012, -0.2, 0.07); Light.flash([255, 210, 140], 70); } });
      const before = ah.i; ah.tick(act); hits += ah.i - before; prevT = tt;
      trig();
      if(tt >= SHOTS_MOD.meta.duration - 0.05){ fresh(); SND.tone({pad:true, f:700, dur:0.05, gain:0.12, type:'square'}); H.pulse(240, 0.6, 0.03); later(250, () => { SND.tone({pad:true, f:1100, dur:0.04, gain:0.14, type:'square'}); H.pulse(420, 1.0, 0.025); }); }
      hud(t('x_pistol'), '▮'.repeat(3 - i) + '<span style="opacity:.25">' + '▮'.repeat(i) + '</span>', `${t('hits')} ${hits}/${shots}`, `<span class="key">R2</span> ${t('ctl_fire')} · ${UI.key('pause')} ${t('menu')}`);
    }
  };
}

const SMG = effects['projectiles/muzzle-smg'], IMPACT = effects['impacts/bullet-impact'];
export function makeSmg(stage){
  let gun = null, imp = 0, rate = 0, heat = 0, over = 0, hiss = 0, burst = 0, shots = 0;
  const MX = 70, WALL = 262;
  const trig = () => { DS.out.trigL = TRG.off(); DS.out.trigR = over > 0 ? TRG.feedback(0, 8) : TRG.vibration(2, 7, 28); };
  return {
    id:'rifle',
    enter(){
      stage.setBg('ground', FLOOR); stage.clear(); stage.auto.enabled = false; trig(); Light.base = [255, 120, 40];
      const AIM = {...PX.READY, weapon:'pistol', crouch:3, lean:2, fx:18, fy:-28, sa:0, bx:12, by:-25, ffx:11, fbx:-9}, KICK = {...AIM, lean:0, fx:16, fy:-33, sa:-0.45, by:-28};
      stage.paintBack = p => drawFigure(stage.frame, MX - 28, FLOOR, gun && rate > 1/24 ? KICK : AIM);
      stage.paint = p => {
        p.rect(WALL, FLOOR - 70, 40, 70, PX.hex('#3b3550')); p.rect(WALL, FLOOR - 70, 2, 70, PX.hex('#5b5079'));
        const hb = Math.round(heat*38); p.rect(MX - 40, FLOOR - 60, 40, 4, PX.hex('#1a1724')); if(hb) p.rect(MX - 39, FLOOR - 59, hb, 2, over > 0 ? PX.hex('#ff4d5e') : PX.hex('#ffc23d')); };
      UI.toast(t('x_rifle_tip'), 4200);
    },
    exit(){ stage.paint = stage.paintBack = null; stage.clear(); DS.out.trigR = TRG.off(); },
    update(dt, live){
      over = Math.max(0, over - dt); if(over <= 0 && heat >= 1) heat = 0.7;
      const firing = live && IN.r2 > 0.35 && over <= 0;
      heat = Math.max(0, heat - dt*(firing ? 0 : 0.45));
      if(firing && !gun) gun = stage.fx(SMG, {x:MX, y:FLOOR, height:32, keep:true});
      if(!firing && gun){ gun.stop(); const g = gun; setTimeout(() => stage.remove(g), 400); gun = null; burst = 0; }
      if(firing){ rate -= dt; if(rate <= 0){ rate = 1/12; shots++; burst++; heat += 0.028;
        Sfx.gunshot(false, -0.6); H.pulse(220, 0.85, 0.022, burst % 2 ? -0.5 : -0.2); H.pulse(70, 1.2, 0.06, -0.3); H.noise({f:160, dur:0.03, gain:0.4, pan:-0.4});
        if(burst % 2 === 0) Sfx.casing();
        imp += 1; if(imp >= 2){ imp = 0; const y = FLOOR - Math.round(rnd(12, 40)); stage.fx(IMPACT, {x:WALL - 2, y:FLOOR, height:FLOOR - y, seed:(Math.random()*999) | 0});
          setTimeout(() => { H.pulse(rnd(260, 380), 0.45, 0.02, 0.8); SND.play('metal', {gain:0.25, rate:rnd(1.1, 1.4), pan:0.7}); }, 60); }
        if(heat >= 1){ over = 2; trig(); SND.noise({type:'highpass', f:3000, dur:0.9, gain:0.12}); UI.toast(t('overheat'), 900); } } }
      if(over > 0){ hiss += dt; if(hiss > 0.1){ hiss = 0; H.noise({f:rnd(140, 240), dur:0.1, gain:0.22, pan:-0.4}); SND.noise({pad:true, type:'highpass', f:4500, dur:0.1, gain:0.1}); } }
      trig();
      hud(t('x_rifle'), '', `${shots}`, `<span class="key">R2</span> ${t('ctl_fire')} · ${UI.key('pause')} ${t('menu')}`);
    }
  };
}
