// Stage 5 — "Ice Canyon": the axe. Throw (R2 click) to shatter ice pillars, hold △ to call it back —
// it curves home through everything in its way, and you feel it coming closer until it smacks into your hand.
import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { E, Cam, FX } from './engine.js';
import { IN } from './input.js';
import { Light } from './feel.js';
import { H } from './haptics.js';
import { SND } from './sound.js';
import { UI, $ } from './ui.js';
import { t } from './i18n.js';
import { C, Enemy, Pillar } from './combat.js';
import { deco } from './arena.js';

const rnd = (a, b) => a + Math.random()*(b - a);

export function makeStage5(G){
  const w = new World(); w.fallY = -6; const root = w.group;
  w.slab(-7, -96, 7, 14, 0.05, 'snow', {thick:1, tile:4});
  // canyon walls
  const iceM = new THREE.MeshStandardMaterial({color:0xcfe6f5, roughness:0.35, metalness:0.05, emissive:0x10202c});
  for(let z = 12; z > -100; z -= 8){ for(const s of [-1, 1]){ const h = rnd(9, 15), m = new THREE.Mesh(new THREE.BoxGeometry(rnd(5, 8), h, 8.4), iceM); m.position.set(s*(7 + 2.5 + rnd(0, 1)), h/2 - 0.5, z - 4); m.rotation.y = rnd(-0.08, 0.08); m.castShadow = true; m.receiveShadow = true; root.add(m); } }
  // ledges for gunners in section 3
  w.slab(-6.8, -52, -3.6, -44, 2.6, 'stone', {thick:3, tile:3}); w.slab(3.6, -58, 6.8, -50, 2.6, 'stone', {thick:3, tile:3});
  for(let i = 0; i < 26; i++) deco(w, 'tree', (Math.random() < 0.5 ? -1 : 1)*rnd(5.6, 6.6), rnd(-94, 10), {height:rnd(2.4, 3.6), frost:true});
  const player = new Player(w);
  // gates: ice walls that block the canyon until a section is cleared
  const gates = [-14, -38, -62, -88].map(z => { const m = new THREE.Mesh(new THREE.BoxGeometry(14, 4.5, 0.8), new THREE.MeshStandardMaterial({color:0xa8dcff, transparent:true, opacity:0.55, roughness:0.1, emissive:0x1a4060})); m.position.set(0, 2.2, z); root.add(m); return {z, m, open:false}; });
  const st = {time:0, sec:-1, done:false, ended:false, spawned:[], gateZ:-14};
  const later = (ms, f) => setTimeout(() => { if(!st.ended) f(); }, ms);
  const add = e => { C.add(e); st.spawned.push(e); return e; };
  const SECTIONS = [
    {intro:t('s5_s1'), run(){ [[-3, -10], [0, -11.5], [3, -10]].forEach(([x, z]) => add(new Pillar(x, z))); }},
    {intro:t('s5_s2'), run(){ for(let i = 0; i < 4; i++) add(new Enemy('grunt', rnd(-1, 1), -24 - i*2.4, {speed:2.2})); add(new Pillar(-4.5, -33)); add(new Pillar(4.5, -33)); }},
    {intro:t('s5_s3'), run(){ add(new Enemy('gunner', -5.2, -48, {range:[0, 40], speed:0, cd:3})); add(new Enemy('gunner', 5.2, -54, {range:[0, 40], speed:0, cd:3.4})); add(new Pillar(0, -56)); add(new Pillar(-3, -59)); add(new Pillar(3, -59)); }},
    {intro:t('s5_s4'), run(){ for(let i = 0; i < 5; i++) add(new Enemy('grunt', rnd(-4, 4), -70 - rnd(0, 12))); add(new Enemy('gunner', -3, -84)); add(new Enemy('gunner', 3, -84)); }}
  ];
  function nextSection(){
    st.sec++; if(st.sec >= SECTIONS.length){ st.done = true; later(1500, finish); return; }
    const S = SECTIONS[st.sec]; st.spawned = []; UI.toast(S.intro, 4200); S.run();
  }
  function openGate(i){
    const g = gates[i]; if(!g || g.open) return; g.open = true; root.remove(g.m);
    SND.play('break', {rate:0.6, gain:1}); H.pulse(40, 1.6, 0.6); for(let k = 0; k < 8; k++) H.pulse(rnd(200, 600), 0.6, 0.02, rnd(-1, 1), k*0.04);
    FX.burst(new THREE.Vector3(0, 2, g.z), {n:60, color:0xcff0ff, size:0.14, up:5, speed:6, life:1.3}); Cam.shake(0.3);
  }
  function hud(){
    $('hTitle').textContent = t('st5');
    $('hSub').textContent = st.sec >= 0 && st.sec < SECTIONS.length ? t('section', {n:st.sec + 1, m:SECTIONS.length}) + ' · ' + t('enemies_left', {n:st.spawned.filter(e => e.alive).length}) : '';
    $('hCtl').innerHTML = `<span class="key">R2</span> ${t('s5_throw')} · <span class="key">L2</span> ${t('ctl_aim')} · ${UI.key('interact')} ${t('ctl_recall')} · ${UI.key('attack')} ${t('s5_chop')} · ${UI.key('dodge')} ${t('ctl_dodge')}`;
  }
  function finish(){ if(st.ended) return; st.ended = true; G.finishStage({id:'st5', time:st.time, got:[true, (C.stats.multi || 0) >= 2, st.time <= 240], goals:[t('s5_star1'), t('s5_star2'), t('s5_star3')]}); }
  function fail(){ if(st.ended) return; st.ended = true; G.failStage({id:'st5', goals:[t('s5_star1'), t('s5_star2'), t('s5_star3')]}); }
  let windBed = null;
  return {
    id:'st5', world:w, player,
    enter(){
      E.setSky(0x6d8fb8, 0xe6f0fa, 0xc8d6e2, 0xdce8f2); E.setWorld(root); E.scene.fog.near = 25; E.scene.fog.far = 95;
      player.place(0, 0.05, 8, Math.PI); Cam.yaw = 0; Cam.pitch = 0.35; Cam.dist = 7.5; Cam.ground = (x, z) => w.groundAt(x, z).h;
      C.init(w, player, {hp:5, weapons:['axe'], camDist:7.5, onDeath:fail}); Light.base = [140, 210, 255]; hud();
      UI.toast(t('st5') + '\n' + t('s5_intro'), 3200); later(3300, nextSection);
      windBed = SND.bed({type:'lowpass', f:420, lfo:0.08}); windBed.set(0.22, 2);
    },
    exit(){ st.ended = true; C.dispose(); windBed && windBed.stop(); },
    update(dt, time, live){
      w.update(dt, time); player.locked = !live || C.dead;
      if(live && !st.done) st.time += dt;
      // the next gate is a wall until its section is cleared
      const gate = gates.find(g => !g.open); w.bounds = {x0:-6.2, x1:6.2, z0:gate ? gate.z + 0.9 : -95, z1:12};
      player.update(dt); C.update(dt, live);
      if(live && st.sec >= 0 && !st.done && st.spawned.length && st.spawned.every(e => !e.alive) && !st.wait){ st.wait = true; openGate(st.sec); later(1600, () => { st.wait = false; nextSection(); }); }
      if(player.key === 'snow' && Math.random() < dt*3) FX.burst(new THREE.Vector3(player.p.x + rnd(-6, 6), player.p.y + 6, player.p.z + rnd(-6, 6)), {n:1, color:0xffffff, size:0.05, up:-1, speed:0.4, life:3, gravity:0.4});
      hud();
      Cam.target.set(player.p.x, player.p.y + 1.1, player.p.z);
      Cam.update(dt, live ? {x:IN.lx + IN.mouseDX*0.08, y:IN.ly + IN.mouseDY*0.06} : null);
      E.followSun(player.p);
    },
    debug:{st}
  };
}
