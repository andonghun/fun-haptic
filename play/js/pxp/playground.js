// Playground: a side-scrolling pixel field with straw dummies. Walk, run, dash and jump across eight surfaces — every step,
// skid and landing is felt — and beat the dummies up with swords, hammer and spear (scripted pixelfx moves, hit-stop and all),
// or shoot them with pistol, SMG and bow (adaptive triggers). △ toggles rain.
import { effects, rnd, clamp, hud } from './common.js';
import { PX } from '../px.js';
import { posed, poseAt, lerpPose, Target, READY, STAND, hex } from '../../../vendor/pixelfx/src/core/index.js';
import { IN } from '../input.js';
import { DS, TRG } from '../ds.js';
import { H } from '../haptics.js';
import { SND } from '../sound.js';
import { Feel, Light, SURF_RGB } from '../feel.js';
import { UI } from '../ui.js';
import { t } from '../i18n.js';

const W = 320, HH = 180, FLOOR = 148, WORLD = 1400;
const ZONES = [[0, 'grass'], [220, 'wood'], [380, 'metal'], [520, 'stone'], [720, 'gravel'], [860, 'snow'], [1020, 'water'], [1120, 'sand']];
const zoneAt = x => { let k = ZONES[0][1]; for(const [x0, key] of ZONES) if(x >= x0) k = key; return k; };
const DUMMIES = [300, 470, 640, 800, 960, 1250];
const GRAV = 760, WALK = 62, RUN = 128, DASH = 330, JUMP = 250;

// ---- weapons: melee ones play a pixelfx move (pose track + slash effect + scripted hits) -----------------------------
const MELEE = {
  sword:  {light:'melee/sword-slash', heavy:'melee/double-slash', weapon:'sword'},
  hammer: {light:'melee/hammer-smash', heavy:'melee/heavy-cleave', weapon:'hammer'},
  spear:  {light:'melee/thrust', heavy:'melee/spear-sweep', weapon:'spear'},
  fists:  {light:'melee/uppercut', heavy:'melee/uppercut', weapon:null}
};
const LIST = ['fists', 'sword', 'hammer', 'spear', 'pistol', 'smg', 'bow'];
const ICON = {fists:'👊', sword:'🗡️', hammer:'🔨', spear:'🔱', pistol:'🔫', smg:'💥', bow:'🏹'};
const AIM = {...READY, weapon:'pistol', crouch:3, lean:2, fx:18, fy:-28, sa:0, bx:12, by:-25, ffx:11, fbx:-9};
const KICK = {...AIM, lean:0, fx:16, fy:-33, sa:-0.45, by:-28};
const BOW_REST = {...READY, weapon:'bow', sa:-0.4, fx:12, fy:-20, bx:6, by:-17};
const BOW_AIM = {...BOW_REST, crouch:3, lean:1, fx:18, fy:-28, sa:0, bx:10, by:-27, nocked:true, ffx:11, fbx:-9};
const BOW_DRAWN = {...BOW_AIM, crouch:4, lean:-2, fx:18, bx:-3, by:-29, pull:true};
const BOW_LOOSED = {...BOW_AIM, crouch:3, lean:2, fx:19, bx:-9, by:-32, nocked:false, pull:false};

// ---- world backdrop: sky + far hills + surface strip, prebuilt once ------------------------------------------------
const PAL = {
  grass:['#3d7a34', '#4f9a3c', '#6dbb4f', '#2c5a26'], wood:['#7a4a24', '#9a6232', '#b67a40', '#4a2c14'], metal:['#5a6476', '#7d889a', '#a8b2c2', '#3a404c'],
  stone:['#5d5a66', '#76737f', '#8d8a96', '#43404c'], gravel:['#6f6355', '#8c7d6a', '#a89880', '#4c4238'], snow:['#c9d6e6', '#e4edf7', '#ffffff', '#9fb0c6'],
  water:['#2a5a8a', '#3a78b0', '#6aa8dc', '#1c3c60'], sand:['#b8945a', '#d4b070', '#ecd096', '#8c6c3c']
};
function buildWorld(){
  const bg = new Uint32Array(WORLD*HH), sky = PX.backdrop('sky', 320, HH), C = k => PAL[k].map(h => hex(h));
  const hillA = hex('#1f1c33'), hillB = hex('#2a2545');
  for(let x = 0; x < WORLD; x++){
    const hA = 112 - Math.round(10*Math.sin(x*0.011) + 6*Math.sin(x*0.031 + 1)), hB = 128 - Math.round(7*Math.sin(x*0.017 + 2) + 4*Math.sin(x*0.05));
    const key = zoneAt(x), c = C(key);
    for(let y = 0; y < HH; y++){
      let col = sky[y*320 + (x % 320)];
      if(y > hA) col = hillA; if(y > hB) col = hillB;
      if(y >= FLOOR){ const gy = y - FLOOR, r = ((x*7 + y*13) ^ (x >> 2)*3) & 15;
        if(key === 'water' && gy < 3) col = gy === 0 ? c[2] : c[1];
        else if(gy === 0) col = c[2];
        else if(key === 'wood') col = (x % 16 === 0 || gy % 6 === 5) ? c[3] : (r < 3 ? c[2] : c[1]);
        else if(key === 'metal') col = (x % 20 === 0 || gy % 10 === 9) ? c[3] : ((x + gy) % 7 === 0 ? c[2] : c[1]);
        else if(key === 'stone') col = ((gy - 1) % 6 === 5 || (x + ((gy/6 | 0) % 2)*8) % 16 === 0) ? c[3] : (r < 2 ? c[2] : c[1]);
        else col = r < 2 ? c[2] : r < 5 ? c[0] : gy > 20 ? c[3] : c[1];
      }
      bg[y*WORLD + x] = col;
    }
  }
  // signposts with surface colours every zone start
  return bg;
}

export function makePlayground(stage){
  const world = buildWorld(), view = new Uint32Array(W*HH);
  const P = {x:60, y:0, vx:0, vy:0, face:1, ground:true, phase:0, step:0, foot:0, dash:0, dashCd:0, air:0, ghosts:[], skid:0};
  const targets = DUMMIES.map((x, i) => { const g = new Target(x, 11 + i); g.hits = 0; return g; });
  let wi = 1, cam = 0, freeze = 0, shake = 0, shakeA = 0, atk = null, armed = true, rate = 0, gun = null, bow = {draw:0, peak:0, creak:0, trem:0}, arrows = [], rain = null, rainDrop = 0, combo = 0, hits = 0, kick = 0;
  const cur = () => LIST[wi];
  const trig = () => {
    const w = cur(); DS.out.trigL = TRG.off();
    DS.out.trigR = w === 'pistol' ? TRG.weapon(4, 6, 8) : w === 'smg' ? TRG.vibration(2, 7, 26) : w === 'bow' ? TRG.ramp(1, 1, 8) : TRG.feedback(4, w === 'hammer' ? 8 : 5);
  };
  const panX = x => clamp((x - cam - 160)/150, -1, 1);
  const nearest = (dir, range) => { let best = null, bd = 1e9; for(const g of targets){ const d = (g.x - P.x)*dir; if(d > 4 && d < range && d < bd){ bd = d; best = g; } } return best; };

  function hitTarget(g, h, kind){
    g.hit({push:(h.push ?? 2)*P.face*(g.x > P.x ? 1 : -1)*Math.sign(P.face), straw:h.straw ?? 10, y:h.y ?? -26, flash:0.06});
    g.hits++; hits++;
    const pan = panX(g.x), amp = clamp((h.amp ?? 1)*0.45 + (h.stop ?? 0)*4, 0.5, 1.5);
    freeze = Math.max(freeze, h.stop ?? 0); shake = Math.max(shake, h.shake ?? 0.1); shakeA = h.amp ?? 1;
    H.pulse(420, Math.min(1.4, amp), 0.025, pan); H.pulse(46, amp, 0.12 + (h.stop ?? 0)*2, pan*0.7); if((h.stop ?? 0) >= 0.18) H.pulse(30, amp*0.8, 0.35, 0, 0.04);
    if(kind === 'blade'){ SND.play('metal', {gain:0.7, rate:rnd(0.75, 0.9), pan}); SND.noise({f:900, dur:0.08, gain:0.25, pan}); }
    else if(kind === 'blunt'){ SND.play('heavy', {gain:0.8, rate:0.8, pan}); SND.play('wood', {gain:0.8, rate:0.6, pan}); }
    else if(kind === 'arrow'){ SND.play('wood', {gain:0.9, rate:0.75, pan}); H.play(SND.hapOf('wood', 0), 0.8, 1.3, pan); }
    else { SND.play('ehurt', {gain:0.5, rate:rnd(0.9, 1.2), pan}); SND.play('wood', {gain:0.4, rate:1.2, pan}); }
    Light.flash([255, 230, 190], 90);
  }

  // ---- melee: start a pixelfx move at the hero ----
  function attack(heavy){
    const m = MELEE[cur()], id = heavy ? m.heavy : m.light, mod = effects[id];
    const fx = PX.createFx(mod, {x:P.x, y:FLOOR + P.y, flip:P.face < 0});
    const k = mod.act.poses; atk = {mod, fx, t:k[0][0], end:k[k.length - 1][0], hi:0, w:0, reach:mod.act.target.x + 18, x0:P.x, kind:cur() === 'hammer' ? 'blunt' : cur() === 'fists' ? 'blunt' : 'blade'};
    P.vx = 0;
  }
  function updateAttack(dt){
    const a = atk, prev = a.t; a.t += dt; if(a.t >= 0) a.fx.update(prev < 0 ? a.t : dt);
    const hs = a.mod.act.hits;
    while(a.w < hs.length && hs[a.w].t - 0.2 <= a.t){ a.w++; for(let j = 0; j < 5; j++) H.pulse(80 + j*25, 0.15 + j*0.06, 0.04, (-0.6 + j*0.3)*P.face, j*0.035); SND.noise({f:500, fEnd:2600, q:1.2, dur:0.2, att:0.12, gain:0.16}); }
    while(a.hi < hs.length && hs[a.hi].t <= a.t){ const h = hs[a.hi++]; let any = false;
      for(const g of targets){ const d = (g.x - P.x)*P.face; if(d > -6 && d < a.reach){ hitTarget(g, h, a.kind); any = true; } }
      if(!any){ H.noise({f:260, dur:0.1, gain:0.2}); } }
    if(a.t >= a.end){ const q = poseAt(a.mod.act.poses, a.end); P.x += (q.x ?? 0)*P.face; atk = null; }
  }

  // ---- guns / bow ----
  function shoot(kindSmg){
    const mx = P.x + 28*P.face, my = FLOOR + P.y - 32;
    if(!kindSmg) stage.fx(effects['projectiles/muzzle-pistol'], {x:mx - 0*P.face, y:FLOOR + P.y, height:32, flip:P.face < 0});
    kick = 1;
    const g = nearest(P.face, 300);
    if(kindSmg){ H.pulse(220, 0.85, 0.022, (rate*100 | 0) % 2 ? -0.4 : -0.1); H.pulse(70, 1.1, 0.06); SND.noise({type:'highpass', f:1500, dur:0.04, gain:0.6}); SND.noise({type:'lowpass', f:1100, dur:0.15, gain:0.45}); SND.tone({f:130, fEnd:45, dur:0.12, gain:0.35}); }
    else { H.pulse(330, 1.4, 0.03); H.pulse(48, 1.6, 0.26); H.pulse(130, 1.0, 0.1); SND.noise({type:'highpass', f:1500, dur:0.05, gain:0.8}); SND.noise({type:'lowpass', f:800, dur:0.3, gain:0.7}); SND.tone({f:110, fEnd:40, dur:0.22, gain:0.55}); SND.noise({type:'bandpass', f:420, q:0.4, dur:1.0, att:0.02, gain:0.12, t:0.03}); Light.flash([255, 210, 140], 70); }
    setTimeout(() => { SND.tone({pad:true, f:rnd(3100, 3700), fEnd:2600, dur:0.1, gain:0.14, type:'triangle'}); }, 280);
    if(g){ const d = Math.abs(g.x - P.x), delay = d/2400*1000;
      setTimeout(() => { stage.fx(effects['impacts/hit-spark'], {x:g.x - 8*P.face, y:FLOOR, height:28, flip:P.face < 0, seed:(Math.random()*99) | 0}); hitTarget(g, {push:kindSmg ? 0.8 : 2, straw:kindSmg ? 3 : 10, amp:kindSmg ? 0.5 : 1, stop:kindSmg ? 0 : 0.04, y:-30}, 'bullet'); }, delay); }
  }
  function loose(k){
    const fx = PX.createFx(effects['projectiles/arrow'], {x:P.x + 30*P.face, y:FLOOR + P.y - 28, flip:P.face < 0});
    arrows.push({fx, x:P.x + 30*P.face, y:FLOOR + P.y - 28, vx:(260 + 420*k)*P.face, vy:-30*(1 - k), dir:P.face});
    const kk = 0.6 + 0.55*k;
    SND.tone({f:220, fEnd:95, dur:0.45, gain:0.2, type:'triangle'}); SND.noise({f:900, fEnd:2600, q:1, dur:0.35, gain:0.2*k}); SND.tone({pad:true, f:180, fEnd:120, dur:0.3, gain:0.14, type:'sawtooth'});
    H.pulse(380, 1.4, 0.03); H.pulse(42, 1.6*kk, 0.5); H.pulse(95, 1.2*kk, 0.2, 0, 0.025);
    for(let i = 0; i < 10; i++) H.pulse(150 - i*6, 0.95*kk*Math.pow(0.72, i), 0.045, i % 2 ? -0.75 : 0.75, 0.07 + i*0.046);
    DS.out.trigR = TRG.vibration(0, 8, 70); setTimeout(trig, 170);
  }

  // ---- hero pose ----
  function pose(dt){
    const w = cur(), sp = Math.abs(P.vx);
    if(atk) return poseAt(atk.mod.act.poses, Math.max(atk.mod.act.poses[0][0], atk.t));
    if(w === 'bow'){ const k = bow.draw; return bow.loosedT > 0 ? BOW_LOOSED : k > 0.02 ? lerpPose(BOW_AIM, BOW_DRAWN, k) : BOW_REST; }
    if(w === 'pistol' || w === 'smg'){ const q = kick > 0.5 ? KICK : AIM; if(sp > 5 || !P.ground) return {...q, ...legs(sp)}; return q; }
    const wp = MELEE[w].weapon, base = wp ? {...READY, weapon:wp, sa:-0.85, fx:12, fy:-21} : {...READY};
    if(!P.ground) return {...base, crouch:-1, lean:2, ffx:6, ffy:-8, fbx:-4, fby:-6, fy:base.fy - 4};
    if(P.dash > 0) return {...base, crouch:5, lean:8, ffx:12, fbx:-12, fby:-6, ghost:1};
    if(sp < 3) return P.land > 0 ? {...base, crouch:6} : base;
    return {...base, ...legs(sp)};
  }
  function legs(sp){
    const run = sp > 90, s = Math.sin(P.phase), c = Math.cos(P.phase), str = run ? 9 : 6;
    return {ffx:2 + s*str, fbx:2 - s*str, ffy:-4 - Math.max(0, c)*(run ? 6 : 3), fby:-4 - Math.max(0, -c)*(run ? 6 : 3), crouch:run ? 3 : 1, lean:run ? 5 : 1};
  }
  function drawHero(F, q){
    const r = posed(q), X = Math.round(P.x - cam + (q.x ?? 0)*P.face), Y = Math.round(FLOOR + P.y + (q.y ?? 0)), m = P.face < 0, Wd = F.w, Hd = F.h;
    // shadow
    const hw = 9 - Math.min(6, Math.round(-P.y/10)); for(let x = -hw; x <= hw; x++){ const px = Math.round(P.x - cam) + x, i = FLOOR*Wd + px; if(px >= 0 && px < Wd) F.color[i] = (F.color[i] & 0xffffff) | (110 << 24); }
    for(const g of P.ghosts){ const gr = posed(g.q), gx = Math.round(g.x - cam), k = 0.5*(1 - g.age/0.3); for(let i = 0; i < gr.n; i += 1){ const px = m ? gx - gr.xs[i] - 1 : gx + gr.xs[i], py = Math.round(FLOOR + g.y) + gr.ys[i]; if(px < 0 || py < 0 || px >= Wd || py >= Hd) continue; const j = py*Wd + px, d = F.light[j]; F.light[j] = (255 << 24) | (Math.min(255, ((d >>> 16) & 255) + 255*k) << 16) | (Math.min(255, ((d >>> 8) & 255) + 180*k) << 8) | Math.min(255, (d & 255) + 120*k); } }
    for(let i = 0; i < r.n; i++){ const px = m ? X - r.xs[i] - 1 : X + r.xs[i], py = Y + r.ys[i]; if(px >= 0 && py >= 0 && px < Wd && py < Hd) F.color[py*Wd + px] = r.color[i]; }
  }

  return {
    id:'playground',
    enter(){
      stage.clear(); stage.auto.enabled = false; stage.bg = view; trig(); Light.base = SURF_RGB.grass.map(v => v*0.5);
      stage.paintBack = p => { const F = stage.frame; for(const g of targets) g.draw(F.color, F.w, F.h, -cam, FLOOR, false); this._q && drawHero(F, this._q); };
      stage.paint = p => { const F = stage.frame; if(atk && atk.t >= 0){ atk.fx.draw(F, 'back'); atk.fx.draw(F, 'front'); } for(const a of arrows) a.fx.draw(F, 'front'); for(const g of targets) g.drawStraw(F.color, F.w, F.h, -cam, FLOOR, false); };
      UI.toast(t('pg_tip'), 5200);
    },
    exit(){ stage.paint = stage.paintBack = null; stage.clear(); stage.frame.ox = 0; if(gun){ gun = null; } if(rain) rain = null; DS.out.trigL = TRG.off(); DS.out.trigR = TRG.off(); stage.shake = [0, 0]; stage.setBg('ground', 150); },
    update(dt, live){
      // hit-stop: the world holds still for a few frames on a solid hit
      if(freeze > 0){ freeze -= dt; this._q = pose(0); this.camera(dt); return; }
      const w = cur();
      if(live){
        if(IN.pressed('wnext') || IN.pressed('r1')){ wi = (wi + 1) % LIST.length; swap(); }
        if(IN.pressed('wprev') || IN.pressed('l1')){ wi = (wi - 1 + LIST.length) % LIST.length; swap(); }
        if(IN.pressed('interact')){ if(rain){ stage.remove(rain); rain = null; } else rain = stage.fx(effects['weather/rain'], {x:160, y:FLOOR + 22, keep:true, density:0.8}); SND.notes(rain ? [392, 523] : [523, 392], 0.08, {gain:0.06, pad:true}); }
      }
      // movement
      const mx = live && !atk && !(w === 'bow' && bow.draw > 0.1) ? IN.mx : 0, run = Math.abs(mx) > 0.85;
      const want = Math.abs(mx) < 0.12 ? 0 : Math.sign(mx)*(run ? RUN : WALK*clamp(Math.abs(mx)/0.85, 0.4, 1));
      if(mx && !atk) P.face = Math.sign(mx);
      P.dashCd -= dt;
      if(live && IN.pressed('dodge') && P.dashCd <= 0 && !atk){ P.dash = 0.18; P.dashCd = 0.45;
        for(let j = 0; j < 7; j++) H.pulse(90 + j*20, 0.4 + j*0.06, 0.04, clamp((-1 + j*0.33)*P.face, -1, 1), j*0.025);
        SND.noise({f:500, fEnd:3000, q:0.8, dur:0.28, att:0.02, gain:0.3}); stage.fx(effects['impacts/heavy-landing'] || effects['spawn/poof'], {x:P.x - 6*P.face, y:FLOOR, flip:P.face < 0, light:0.4}); }
      if(P.dash > 0){ P.dash -= dt; P.vx = DASH*P.face; P.ghosts.push({q:this._q || STAND, x:P.x, y:P.y, age:0}); }
      else { const prevV = P.vx; P.vx += (want - P.vx)*Math.min(1, dt*(P.ground ? 12 : 4));
        // skidding to a halt from a run scrapes the floor
        if(P.ground && Math.abs(prevV) > 100 && Math.abs(want) < 10 && P.skid <= 0){ P.skid = 0.25; Feel.step(zoneAt(P.x), P.face < 0, true, 0.8); H.noise({f:200, dur:0.22, gain:0.45, pan:0}); } }
      P.skid -= dt; P.ghosts.forEach(g => g.age += dt); P.ghosts = P.ghosts.filter(g => g.age < 0.3);
      if(live && IN.pressed('jump') && P.ground && !atk){ P.vy = -JUMP; P.ground = false; Feel.jump(false); }
      if(!P.ground){ P.vy += GRAV*dt; P.y += P.vy*dt; P.air += dt;
        if(P.y >= 0){ const k = clamp(P.vy/420, 0.2, 1.3); P.y = 0; P.vy = 0; P.ground = true; P.land = 0.12; Feel.land(k, zoneAt(P.x)); stage.fx(effects['impacts/heavy-landing'], {x:P.x, y:FLOOR, light:0.3*k}); shake = 0.08*k; shakeA = 1; P.step = 0; } }
      P.land = Math.max(0, (P.land || 0) - dt);
      P.x = clamp(P.x + P.vx*dt, 10, WORLD - 10);
      // footsteps follow the stride
      const sp = Math.abs(P.vx);
      if(P.ground && sp > 5 && P.dash <= 0){ P.phase += sp*dt*(sp > 90 ? 0.11 : 0.15); P.step += sp*dt;
        const stride = sp > 90 ? 34 : 22; if(P.step >= stride){ P.step -= stride; P.foot ^= 1; Feel.step(zoneAt(P.x), P.foot === 0, false, sp > 90 ? 1.15 : 0.8); } }
      else if(sp <= 5) P.step = 12;
      if(P.dash > 0 && Math.random() < dt*30) H.noise({f:rnd(150, 260), dur:0.04, gain:0.3, pan:0});
      // weapons
      if(atk) updateAttack(dt);
      else if(live){
        if(MELEE[w]){ if(IN.pressed('attack')) attack(false); if(IN.r2 < 0.3) armed = true; if(armed && IN.r2 > 0.85){ armed = false; attack(true); } }
        else if(w === 'pistol'){ if(IN.r2 < 0.3) armed = true; if(armed && IN.r2 > 0.62){ armed = false; shoot(false); } if(IN.pressed('attack')) shoot(false); }
        else if(w === 'smg'){ const firing = IN.r2 > 0.35 || IN.b.attack;
          if(firing){ if(!gun) gun = stage.fx(effects['projectiles/muzzle-smg'], {x:P.x + 28*P.face, y:FLOOR + P.y, height:32, flip:P.face < 0, keep:true}); gun.options.x = P.x + 28*P.face; gun.options.y = FLOOR + P.y; gun.options.flip = P.face < 0;
            rate -= dt; if(rate <= 0){ rate = 1/12; shoot(true); } }
          else if(gun){ gun.stop(); const g = gun; setTimeout(() => stage.remove(g), 400); gun = null; } }
        else if(w === 'bow'){ const r = IN.r2; bow.loosedT = Math.max(0, (bow.loosedT || 0) - dt);
          if(r > bow.peak) bow.peak = r; bow.draw += (r - bow.draw)*Math.min(1, dt*(r > bow.draw ? 6 : 30));
          const k = bow.draw;
          if(r > 0.06){ bow.creak += dt; if(bow.creak > 0.19 - 0.12*k){ bow.creak = 0; H.pulse(56 + k*60 + rnd(-6, 6), 0.12 + 0.55*k*k, 0.08, rnd(-0.4, 0.4)); if(Math.random() < 0.4) SND.noise({pad:true, f:rnd(300, 700), q:4, dur:0.07, gain:0.1*k}); } }
          if(k > 0.94){ bow.trem += dt; if(bow.trem > 0.032){ bow.trem = 0; H.pulse(30 + rnd(0, 6), 0.45, 0.035, (Math.random() < 0.5 ? -1 : 1)*0.45); } }
          if(bow.peak > 0.4 && r < bow.peak - 0.28){ loose(bow.peak); bow.peak = 0; bow.draw = 0; bow.loosedT = 0.3; }
          if(r < 0.04) bow.peak = 0; }
      }
      kick = Math.max(0, kick - dt*8);
      // arrows
      for(const a of arrows){ a.vy += 120*dt; a.x += a.vx*dt; a.y += a.vy*dt; a.fx.options.x = a.x; a.fx.options.y = a.y; a.fx.update(dt);
        for(const g of targets){ if(Math.abs(g.x - a.x) < 8 && a.y > FLOOR - 50){ a.dead = true; stage.fx(effects['impacts/hit-spark'], {x:g.x - 8*a.dir, y:FLOOR, height:FLOOR - a.y, flip:a.dir < 0}); hitTarget(g, {push:2.4, straw:14, amp:1.2, stop:0.07, y:a.y - FLOOR}, 'arrow'); break; } }
        if(a.y > FLOOR || a.x < 0 || a.x > WORLD) a.dead = true; }
      arrows = arrows.filter(a => !a.dead);
      targets.forEach(g => g.step(dt));
      // rain on top, felt as drops
      if(rain){ rain.options.x = cam + 160; rainDrop += dt*40; while(rainDrop >= 1){ rainDrop--; H.pulse(rnd(260, 520), rnd(0.06, 0.18), rnd(0.012, 0.03), rnd(-1, 1)); } }
      this._q = pose(dt);
      this.camera(dt);
      const key = zoneAt(P.x); if(key !== this._zone){ this._zone = key; UI.zone(t('surf_' + key), SURF_RGB[key]); Light.base = SURF_RGB[key].map(v => v*0.5); }
      hud(`${ICON[w]} ${t('w_' + w)}`, t('surf_' + key), `${t('hits')} ${hits}`,
        `${t('ctl_move')} · ${UI.key('jump')} ${t('ctl_jump')} · ${UI.key('dodge')} ${t('pg_dash')} · ${UI.key('attack')}/<span class="key">R2</span> ${t('pg_attack')} · <span class="key">L1 R1</span> ${t('pg_weapon')} · ${UI.key('interact')} ${t('x_rain')}`);
    },
    camera(dt){
      cam += (clamp(P.x - 160 + P.face*30, 0, WORLD - W) - cam)*Math.min(1, dt*6); const c = Math.round(cam);
      for(let y = 0; y < HH; y++) view.set(world.subarray(y*WORLD + c, y*WORLD + c + W), y*W);
      stage.frame.ox = c;                                  // effects live in world space; the painter subtracts the camera
      if(shake > 0){ shake -= dt; stage.shake = [Math.round(Math.sin(shake*90)*shakeA), Math.round(Math.cos(shake*70)*shakeA*0.6)]; } else stage.shake = [0, 0];
      cam = c;
    }
  };
  function swap(){ if(gun){ gun.stop(); gun = null; } bow.draw = 0; bow.peak = 0; trig(); SND.play('swap', {gain:0.7, pad:true}); H.play(SND.hapOf('swap', 0), 1, 1.0); H.pulse(500, 0.7, 0.02); UI.toast(`${ICON[cur()]} ${t('w_' + cur())}`, 700); }
}
