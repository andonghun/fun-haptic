// Stage 4 — "Archer's Valley": bow and longbow. The trigger IS the string (ramp resistance), full draw trembles,
// release kicks. Wind pushes arrows; you feel each gust on the side it blows from and see it on the flags.
import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { E, Cam, clamp } from './engine.js';
import { IN } from './input.js';
import { Light } from './feel.js';
import { H } from './haptics.js';
import { SND } from './sound.js';
import { UI, $ } from './ui.js';
import { t } from './i18n.js';
import { C, Target, Enemy } from './combat.js';
import { deco } from './arena.js';

const rnd = (a, b) => a + Math.random()*(b - a);

export function makeStage4(G){
  const w = new World(); w.fallY = -6; const root = w.group;
  w.slab(-80, -110, 80, 40, 0, 'grass', {thick:1, tile:6});
  w.slab(-5, 4, 5, 11, 0.9, 'stone', {thick:1.2, tile:3});              // shooting platform (raised)
  w.ramp(-1.5, 11, 1.5, 15, 0.9, 0.02, 'stone', 'z');
  w.bounds = {x0:-4.6, x1:4.6, z0:4.4, z1:10.6};
  // hills with targets on top at several distances
  const hills = [[-14, -22, 7, 2.2], [10, -34, 8, 3.2], [-6, -50, 10, 4.5], [18, -64, 9, 6], [-22, -78, 11, 7.5]];
  hills.forEach(([x, z, r, h]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), new THREE.MeshStandardMaterial({color:0x6aa65a, roughness:1})); m.scale.y = h/r; m.position.set(x, 0, z); m.receiveShadow = true; m.castShadow = true; root.add(m); w.disc(x, z, r*0.55, h*0.92, 'grass', {visible:false}); });
  for(let i = 0; i < 60; i++){ const x = rnd(-70, 70), z = rnd(-105, -12); if(Math.abs(x) < 8 && z > -20) continue; deco(w, 'tree', x, z, {height:rnd(3.5, 7.5)}); }
  for(let i = 0; i < 12; i++) deco(w, 'tree', (i % 2 ? 1 : -1)*rnd(9, 25), rnd(0, 35), {height:rnd(3.5, 6)});
  const flags = [deco(w, 'flag', -4.5, 4.6, {rot:0, height:2}), deco(w, 'flag', 4.5, 4.6, {rot:0, height:2}), deco(w, 'flag', 10, -34, {rot:0, height:2, y:3.2}), deco(w, 'flag', -6, -50, {rot:0, height:2, y:4.5})];
  const player = new Player(w); player.noJump = true;
  const st = {time:0, round:-1, phaseT:3, done:false, ended:false, spawned:[], left:0, gust:0, windT:0, longHit:false};
  const wind = new THREE.Vector3();
  const later = (ms, f) => setTimeout(() => { if(!st.ended) f(); }, ms);
  const add = e => { C.add(e); st.spawned.push(e); return e; };
  const onHill = (i, dx = 0) => { const [x, z, , h] = hills[i]; return [x + dx, z]; };
  const ROUNDS = [
    {intro:t('s4_r1'), weapon:0, wind:0, run(){ [[-3, -14], [4, -18], [-14, -22], [0, -26], [8, -22]].forEach(([x, z], i) => later(i*400, () => add(new Target(x, z, {hidden:true, delay:0.01, size:0.85})))); st.left = 5; }},
    {intro:t('s4_r2'), weapon:1, wind:2.2, run(){ [onHill(1), onHill(2), onHill(3), onHill(4)].forEach(([x, z], i) => later(i*500, () => add(new Target(x, z, {hidden:true, delay:0.01, size:1.1})))); st.left = 4; }},
    {intro:t('s4_r3'), weapon:0, wind:1.4, run(){ for(let i = 0; i < 3; i++) later(i*900, () => add(new Target(rnd(-10, 10), -rnd(18, 30), {hidden:true, delay:0.01, move:{ax:rnd(5, 9), sp:rnd(0.5, 0.9)}})));
      for(let i = 0; i < 3; i++) later(2400 + i*900, () => add(new Enemy('drone', rnd(-12, 12), -rnd(14, 22), {range:[12, 18], cd:4.2}))); st.left = 6; }}
  ];
  function setWind(max){ const a = Math.random() < 0.5 ? -1 : 1; wind.set(a*rnd(max*0.5, max), 0, 0); C.wind = wind; flags.forEach(f => f.root.rotation.y = wind.x > 0 ? -Math.PI/2 : Math.PI/2); }
  function nextRound(){
    st.round++; if(st.round >= ROUNDS.length){ st.done = true; later(1600, finish); return; }
    const R = ROUNDS[st.round]; C.arsenal.select(R.weapon, st.round === 0); setWind(R.wind); st.windMax = R.wind;
    UI.toast(t('round', {n:st.round + 1, m:ROUNDS.length}) + '\n' + R.intro, 4600); SND.notes([523, 659, 784], 0.1, {gain:0.07, type:'triangle'}); st.spawned = []; later(2400, () => R.run());
  }
  function hud(){
    $('hTitle').textContent = t('st4');
    $('hSub').textContent = st.round >= 0 && st.round < ROUNDS.length ? `${t('round', {n:st.round + 1, m:ROUNDS.length})} · ${st.spawned.filter(e => !e.alive && !e.expired).length} / ${st.left}` : '';
    const wv = wind.x; $('hRight').innerHTML = wv ? `${t('wind')} ${wv < 0 ? '◀' : ''}${'━'.repeat(Math.max(1, Math.round(Math.abs(wv))))}${wv > 0 ? '▶' : ''} · ${t('bulls')} ${C.stats.bulls}` : `${t('bulls')} ${C.stats.bulls}`;
    $('hCtl').innerHTML = `<span class="key">R2</span> ${t('s4_draw')} · <span class="key">L2</span> ${t('ctl_aim')} · <span class="key">◀▶</span> ${t('ctl_swap')}`;
  }
  function finish(){ if(st.ended) return; st.ended = true; G.finishStage({id:'st4', time:st.time, got:[true, C.stats.bulls >= 3, st.longHit], goals:[t('s4_star1'), t('s4_star2', {n:C.stats.bulls}), t('s4_star3')]}); }
  function fail(){ if(st.ended) return; st.ended = true; G.failStage({id:'st4', goals:[t('s4_star1'), t('s4_star2', {n:C.stats.bulls}), t('s4_star3')]}); }
  return {
    id:'st4', world:w, player,
    enter(){
      E.setWorld(root); E.setSky(0x5aa0e8, 0xf3e7c8, 0x9fb08a, 0xe8e2cc); E.scene.fog.near = 70; E.scene.fog.far = 220;
      player.place(0, 0.9, 8, Math.PI); Cam.yaw = 0; Cam.pitch = 0.2; Cam.dist = 6; Cam.ground = (x, z) => w.groundAt(x, z).h;
      C.init(w, player, {hp:5, weapons:['bow', 'longbow'], camDist:6, onDeath:fail, onKill:(e) => { if(e.type === 'target' && Math.hypot(e.pos.x - player.p.x, e.pos.z - player.p.z) > 50) st.longHit = true; }});
      Light.base = [120, 255, 120]; hud(); UI.toast(t('st4') + '\n' + t('s4_intro'), 3200); st.phaseT = 3.4;
    },
    exit(){ st.ended = true; C.wind = null; C.dispose(); },
    update(dt, time, live){
      w.update(dt, time); player.locked = !live || C.dead;
      if(live && !st.done) st.time += dt;
      player.update(dt); C.update(dt, live);
      if(live && !st.done){
        if(st.phaseT > 0){ st.phaseT -= dt; if(st.phaseT <= 0) nextRound(); }
        else if(st.round >= 0 && st.spawned.length >= st.left && st.spawned.every(e => !e.alive)) st.phaseT = 2.2;
        // wind changes every ~9 s; each gust is felt on the side it comes from
        st.windT += dt; if(st.windMax && st.windT > 9){ st.windT = 0; setWind(st.windMax); SND.noise({type:'lowpass', f:600, dur:1.2, att:0.4, gain:0.2}); }
        st.gust -= dt; if(wind.x && st.gust <= 0){ st.gust = rnd(0.5, 1.4); const from = wind.x > 0 ? -0.9 : 0.9, k = Math.abs(wind.x)/3;
          for(let i = 0; i < 4; i++) H.noise({t:i*0.06, f:rnd(90, 160), q:0.6, dur:0.18, gain:0.12 + 0.25*k, pan:from}); SND.noise({type:'bandpass', f:rnd(300, 600), q:0.4, dur:0.8, att:0.3, gain:0.05 + 0.08*k, pan:from*0.6}); }
      }
      flags.forEach(f => f.root.rotation.z = Math.sin(time*6 + f.root.position.x)*0.04*Math.abs(wind.x));
      hud();
      Cam.target.set(player.p.x, player.p.y + 1.25, player.p.z);
      Cam.update(dt, live ? {x:IN.lx + IN.mouseDX*0.08, y:IN.ly + IN.mouseDY*0.06} : null);
      E.followSun(player.p);
    },
    debug:{st}
  };
}
