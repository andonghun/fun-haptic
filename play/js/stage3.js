// Stage 3 — "Shooting Range": pistol (R2 break-point click) on pop-up and sliding targets, then the machine gun
// (vibrating trigger, overheat makes the trigger go stiff) against a drone swarm.
import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { E, Cam } from './engine.js';
import { IN } from './input.js';
import { Light } from './feel.js';
import { SND } from './sound.js';
import { UI, $ } from './ui.js';
import { t } from './i18n.js';
import { C, Target, Enemy } from './combat.js';
import { deco } from './arena.js';

const rnd = (a, b) => a + Math.random()*(b - a);

export function makeStage3(G){
  const w = new World(); w.fallY = -6; const root = w.group;
  w.slab(-60, -70, 60, 40, 0, 'grass', {thick:1, tile:6});
  w.slab(-7, 3, 7, 12, 0.15, 'wood', {thick:0.4, tile:3});            // firing deck
  w.slab(-40, -48, 40, -2, 0.03, 'sand', {thick:0.2, tile:5});         // range floor
  w.slab(-1.2, 12, 1.2, 20, 0.05, 'gravel', {thick:0.2, tile:2.5});
  w.bounds = {x0:-6.6, x1:6.6, z0:3.4, z1:11.6};
  // fences + sandbags
  const fenceM = new THREE.MeshStandardMaterial({color:0x8a5a32, roughness:0.85});
  for(let x = -7; x <= 7; x += 1.75){ const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), fenceM); p.position.set(x, 0.7, 3.1); p.castShadow = true; root.add(p); }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.1, 0.12), fenceM); rail.position.set(0, 1.05, 3.1); root.add(rail);
  for(let i = 0; i < 9; i++) deco(w, 'block', -40 + i*10, -47, {rot:0, height:0.9});
  for(let i = 0; i < 14; i++) deco(w, 'tree', rnd(-55, 55), rnd(-65, -50), {height:rnd(4, 7)});
  for(let i = 0; i < 10; i++){ const s = i < 5 ? -1 : 1; deco(w, 'tree', s*rnd(12, 30), rnd(-2, 30), {height:rnd(3.5, 6)}); }
  deco(w, 'flag', -6.5, 11.5, {rot:0}); deco(w, 'flag', 6.5, 11.5, {rot:0}); deco(w, 'rack', 0, 11.8, {rot:Math.PI});
  const player = new Player(w); player.noJump = true;
  const st = {time:0, round:-1, phaseT:2, left:0, done:false, ended:false, spawned:[], pistolShots:0, pistolHits:0};
  const ROUNDS = [
    {intro:t('s3_r1'), weapon:0, run(){ for(let i = 0; i < 8; i++){ const x = rnd(-14, 14), z = -rnd(10, 26); later(i*1500, () => add(new Target(x, z, {hidden:true, delay:0.01, life:5}))); } st.left = 8; }},
    {intro:t('s3_r2'), weapon:0, run(){ for(let i = 0; i < 6; i++){ const z = -rnd(12, 30); later(i*1700, () => add(new Target(rnd(-6, 6), z, {hidden:true, delay:0.01, move:{ax:rnd(5, 12), sp:rnd(0.6, 1.2)}, life:7}))); } st.left = 6; }},
    {intro:t('s3_r3'), weapon:1, run(){ for(let i = 0; i < 9; i++) later(i*600, () => add(new Enemy('drone', rnd(-16, 16), -rnd(14, 26), {range:[9, 16], cd:3.6}))); st.left = 9; }}
  ];
  const later = (ms, f) => setTimeout(() => { if(!st.ended) f(); }, ms);
  function add(e){ C.add(e); st.spawned.push(e); return e; }
  function nextRound(){
    st.round++; if(st.round >= ROUNDS.length){ st.done = true; later(1600, finish); return; }
    const R = ROUNDS[st.round]; C.arsenal.select(R.weapon, st.round === 0); UI.toast(t('round', {n:st.round + 1, m:ROUNDS.length}) + '\n' + R.intro, 4200);
    SND.notes([523, 659, 784], 0.1, {gain:0.07, type:'triangle'}); st.spawned = []; later(2200, () => R.run());
  }
  function hud(){
    $('hTitle').textContent = t('st3');
    const resolved = st.spawned.filter(e => !e.alive).length;
    $('hSub').textContent = st.round >= 0 && st.round < ROUNDS.length ? `${t('round', {n:st.round + 1, m:ROUNDS.length})} · ${resolved} / ${st.left}` : '';
    const acc = C.stats.shots ? Math.round(C.stats.hits/C.stats.shots*100) : 0;
    $('hRight').innerHTML = `🎯 ${C.stats.hits} · ${t('accuracy')} ${acc}% · ${t('bulls')} ${C.stats.bulls}`;
    $('hCtl').innerHTML = `<span class="key">R2</span> ${t('ctl_fire')} · <span class="key">L2</span> ${t('ctl_aim')} · <span class="key">◀▶</span> ${t('ctl_swap')} · ${UI.key('r1')} ${t('reload')}`;
  }
  function finish(){ if(st.ended) return; st.ended = true; const s = C.stats, acc = s.shots ? s.hits/s.shots : 0;
    G.finishStage({id:'st3', time:st.time, got:[true, acc >= 0.6, s.bulls >= 5], goals:[t('s3_star1'), t('s3_star2', {n:Math.round(acc*100)}), t('s3_star3', {n:s.bulls})]}); }
  function fail(){ if(st.ended) return; st.ended = true; G.failStage({id:'st3', goals:[t('s3_star1'), t('s3_star2', {n:0}), t('s3_star3', {n:C.stats.bulls})]}); }
  return {
    id:'st3', world:w, player,
    enter(){
      E.setWorld(root); E.setSky(0x3d8be0, 0xe0eefa, 0xa8b89a, 0xdbe8f2); E.scene.fog.near = 60; E.scene.fog.far = 180;
      player.place(0, 0.15, 8, Math.PI); Cam.yaw = 0; Cam.pitch = 0.22; Cam.dist = 6; Cam.ground = (x, z) => w.groundAt(x, z).h;
      C.init(w, player, {hp:5, weapons:['pistol', 'mg'], camDist:6, onDeath:fail}); Light.base = [255, 200, 80]; hud();
      UI.toast(t('st3') + '\n' + t('s3_intro'), 3000); st.phaseT = 3.2;
    },
    exit(){ st.ended = true; C.dispose(); },
    update(dt, time, live){
      w.update(dt, time); player.locked = !live || C.dead;
      if(live && !st.done) st.time += dt;
      player.update(dt); C.update(dt, live);
      if(live && !st.done){
        if(st.phaseT > 0){ st.phaseT -= dt; if(st.phaseT <= 0) nextRound(); }
        else if(st.round >= 0 && st.spawned.length >= st.left && st.spawned.every(e => !e.alive)){ st.phaseT = 2.2; }
      }
      hud();
      Cam.target.set(player.p.x, player.p.y + 1.25, player.p.z);
      Cam.update(dt, live ? {x:IN.lx + IN.mouseDX*0.08, y:IN.ly + IN.mouseDY*0.06} : null);
      E.followSun(player.p);
    },
    debug:{st}
  };
}
