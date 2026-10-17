// Stage 2 — "Way of the Sword": a torch-lit colosseum. Learn combo, guard (L2 resistance), parry and deflect.
import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { E, Cam } from './engine.js';
import { IN } from './input.js';
import { Light } from './feel.js';
import { SND } from './sound.js';
import { UI, $ } from './ui.js';
import { t } from './i18n.js';
import { C } from './combat.js';
import { Waves, torch, deco, ringWall } from './arena.js';

export function makeStage2(G){
  const w = new World(); w.fallY = -6; const root = w.group;
  w.disc(0, 0, 60, -0.05, 'sand', {thick:1, tile:6});
  w.disc(0, 0, 16, 0.12, 'stone', {thick:0.4, tile:3.5});
  w.disc(0, 0, 4, 0.18, 'metal', {thick:0.2, seg:32, tile:2});
  w.bounds = {x0:-15.2, x1:15.2, z0:-15.2, z1:15.2}; w.collider(0, 0, 0.01);
  ringWall(w, 17.2, 26, 'wallHigh', {height:3.2, sx:1.6});
  for(let i = 0; i < 8; i++){ const a = i/8*Math.PI*2 + 0.2; torch(w, Math.cos(a)*14.4, Math.sin(a)*14.4, 2.4); }
  for(let i = 0; i < 12; i++){ const a = i/12*Math.PI*2; deco(w, 'banner', Math.cos(a)*16.1, Math.sin(a)*16.1, {rot:-a - Math.PI/2, height:2.6}); }
  deco(w, 'rack', -6, -13.5, {rot:0}); deco(w, 'rack', 6, -13.5, {rot:0}); deco(w, 'statue', 0, -15.6, {rot:0, height:3.4});
  // bounding clamp is circular-ish: keep inside radius 15
  const player = new Player(w); player.noJump = false;
  const st = {time:0, done:false, ended:false};
  const waves = new Waves([
    {intro:t('s2_w1'), spawn:[['grunt', 2]], introMs:4200},
    {intro:t('s2_w2'), spawn:[['grunt', 3, {cd:1.0}]], introMs:5200},
    {intro:t('s2_w3'), spawn:[['gunner', 2], ['grunt', 1]], introMs:5200},
    {intro:t('s2_w4'), spawn:[['grunt', 3, {speed:3}], ['gunner', 2]], introMs:3000}
  ], {label:i => t('wave', {n:i + 1, m:4}), onDone:() => { st.done = true; setTimeout(finish, 1800); }, spawnR:12});
  function hud(){
    $('hTitle').textContent = t('st2');
    $('hSub').textContent = waves.i >= 0 ? t('wave', {n:Math.min(waves.i + 1, 4), m:4}) + ' · ' + t('enemies_left', {n:waves.remaining()}) : '';
    $('hCtl').innerHTML = `${UI.key('attack')} ${t('ctl_attack')} · <span class="key">L2</span> ${t('ctl_guard')} · ${UI.key('dodge')} ${t('ctl_dodge')} · ${UI.key('jump')} ${t('ctl_jump')}`;
  }
  function finish(){ if(st.ended) return; st.ended = true; const s = C.stats;
    G.finishStage({id:'st2', time:st.time, got:[true, s.parries >= 3, s.dmgTaken <= 2], goals:[t('s2_star1'), t('s2_star2', {n:s.parries}), t('s2_star3', {n:s.dmgTaken})]}); }
  function fail(){ if(st.ended) return; st.ended = true; G.failStage({id:'st2', goals:[t('s2_star1'), t('s2_star2', {n:C.stats.parries}), t('s2_star3', {n:C.stats.dmgTaken})]}); }
  let crowd = null;
  return {
    id:'st2', world:w, player,
    enter(){
      E.setWorld(root); E.setSky(0x2b2350, 0xff9d6b, 0x4a3a40, 0xd88a6a); E.scene.fog.near = 30; E.scene.fog.far = 110;
      player.place(0, 0.18, 6, Math.PI); Cam.yaw = 0; Cam.pitch = 0.42; Cam.dist = 8; Cam.ground = (x, z) => w.groundAt(x, z).h;
      C.init(w, player, {hp:5, weapons:['sword'], camDist:8, onDeath:fail});
      Light.base = [255, 120, 60]; hud(); UI.toast(t('st2') + '\n' + t('s2_intro'), 3000);
      crowd = SND.bed({type:'bandpass', f:700, q:0.5, lfo:0.2}); crowd.set(0.12, 2);
    },
    exit(){ C.dispose(); crowd && crowd.stop(); },
    update(dt, time, live){
      w.update(dt, time); player.locked = !live || C.dead;
      if(live && !st.done) st.time += dt;
      player.update(dt);
      // keep inside the round arena
      const r = Math.hypot(player.p.x, player.p.z); if(r > 15){ player.p.x *= 15/r; player.p.z *= 15/r; }
      C.update(dt, live); if(live) waves.update(dt);
      hud();
      Cam.target.set(player.p.x, player.p.y + 1.1, player.p.z);
      Cam.update(dt, live ? {x:IN.lx + IN.mouseDX*0.08, y:IN.ly + IN.mouseDY*0.06} : null);
      E.followSun(player.p);
    },
    debug:{waves, st}
  };
}
