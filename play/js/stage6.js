// Stage 6 — "The Storm": survive 100 s on a hilltop in the rain with every weapon.
// Rain patters on both hands; before lightning strikes you feel static crackle build up — move!
import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { E, Cam, FX, clamp } from './engine.js';
import { IN } from './input.js';
import { Light } from './feel.js';
import { H } from './haptics.js';
import { SND } from './sound.js';
import { UI, $ } from './ui.js';
import { t } from './i18n.js';
import { C, Enemy } from './combat.js';
import { deco, torch } from './arena.js';

const rnd = (a, b) => a + Math.random()*(b - a);
const SURVIVE = 100;

export function makeStage6(G){
  const w = new World(); w.fallY = -6; const root = w.group;
  w.disc(0, 0, 70, -1.5, 'grass', {thick:1, tile:6});
  w.disc(0, 0, 18, 0.3, 'grass', {thick:2.5, taper:1.25, tile:5});
  w.disc(0, 0, 7, 0.45, 'stone', {thick:0.4, tile:3});
  w.slab(-18, -2, -9, 2, 0.33, 'wood', {thick:0.3, tile:3});
  [[-5, -5], [5, -5], [-5, 5], [5, 5]].forEach(([x, z], i) => deco(w, i % 2 ? 'columnBroken' : 'column', x, z, {col:0.45, rot:0, height:2.6}));
  for(let i = 0; i < 18; i++){ const a = Math.random()*6.28, r = rnd(11, 16.5); deco(w, 'tree', Math.cos(a)*r, Math.sin(a)*r, {height:rnd(3, 5), col:0.45}); }
  for(let i = 0; i < 40; i++){ const a = Math.random()*6.28, r = rnd(24, 60); deco(w, 'tree', Math.cos(a)*r, Math.sin(a)*r, {height:rnd(4, 7)}); }
  torch(w, -2.5, 6.5, 2); torch(w, 2.5, -6.5, 2);
  // rain: a cloud of falling points that follows the camera
  const N = 5000, pos = new Float32Array(N*3); for(let i = 0; i < N; i++){ pos[i*3] = rnd(-30, 30); pos[i*3 + 1] = rnd(0, 26); pos[i*3 + 2] = rnd(-30, 30); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.Points(rg, new THREE.PointsMaterial({color:0xaabbdd, size:0.09, transparent:true, opacity:0.55, depthWrite:false})); rain.frustumCulled = false; root.add(rain);
  const bolt = new THREE.PointLight(0xccd8ff, 0, 120); bolt.position.set(0, 30, 0); root.add(bolt);
  const player = new Player(w);
  const st = {time:0, done:false, ended:false, spawnT:2, drop:0, strikeT:5, strikes:[], struck:0, flash:0};
  const later = (ms, f) => setTimeout(() => { if(!st.ended) f(); }, ms);
  function hud(){
    $('hTitle').textContent = t('st6');
    const left = Math.max(0, SURVIVE - st.time); $('hSub').textContent = t('survive', {s:Math.ceil(left)});
    $('hRight').innerHTML = `☠ ${C.stats.kills} · ⚡ ${st.struck}`;
    $('hCtl').innerHTML = `${UI.key('attack')} ${t('ctl_attack')} · <span class="key">R2</span> ${t('ctl_fire')} · <span class="key">L2</span> ${t('ctl_aim')}/${t('ctl_guard')} · <span class="key">◀▶</span> ${t('ctl_swap')} · ${UI.key('dodge')} ${t('ctl_dodge')}`;
  }
  function spawn(){
    const alive = C.ents.filter(e => e.alive).length; if(alive >= 6) return;
    const a = Math.random()*6.28, r = 14, type = Math.random() < 0.45 ? 'drone' : (Math.random() < 0.6 ? 'grunt' : 'gunner');
    C.add(new Enemy(type, Math.cos(a)*r, Math.sin(a)*r, type === 'drone' ? {range:[6, 12]} : {}));
  }
  // lightning: telegraph ring + rising static on both hands, then the strike
  function lightning(){
    const p = player.p, x = clamp(p.x + rnd(-3, 3), -16, 16), z = clamp(p.z + rnd(-3, 3), -16, 16), y = w.groundAt(x, z).h + 0.06;
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.3, 40), new THREE.MeshBasicMaterial({color:0x9fc8ff, transparent:true, opacity:0.8, side:THREE.DoubleSide, depthWrite:false})); ring.rotation.x = -Math.PI/2; ring.position.set(x, y, z); root.add(ring);
    const fill = new THREE.Mesh(new THREE.CircleGeometry(2.0, 40), new THREE.MeshBasicMaterial({color:0x6aa0ff, transparent:true, opacity:0.15, depthWrite:false})); fill.rotation.x = -Math.PI/2; fill.position.set(x, y, z); root.add(fill);
    const s = {x, z, t:1.6, ring, fill}; st.strikes.push(s);
    for(let i = 0; i < 14; i++){ const k = i/13; H.noise({t:i*0.1, f:200 + 600*k, q:2, dur:0.05, gain:0.08 + 0.4*k, pan:Cam.panOf(x, z)}); SND.noise({t:i*0.1, type:'highpass', f:3000 + 3000*k, dur:0.04, gain:0.02 + 0.06*k}); }
  }
  function strike(s){
    root.remove(s.ring); root.remove(s.fill); st.flash = 0.35; bolt.position.set(s.x, 30, s.z);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 40, 6), new THREE.MeshBasicMaterial({color:0xeef4ff})); beam.position.set(s.x, 20, s.z); root.add(beam); later(120, () => root.remove(beam));
    FX.burst(new THREE.Vector3(s.x, w.groundAt(s.x, s.z).h + 0.1, s.z), {n:40, color:0xcfe0ff, size:0.08, up:6, speed:6, life:0.6});
    const d = Math.hypot(player.p.x - s.x, player.p.z - s.z), pan = Cam.panOf(s.x, s.z);
    SND.noise({f:2000, fEnd:200, q:0.5, dur:0.25, gain:0.6}); SND.tone({f:60, fEnd:28, dur:2.2, gain:0.35, type:'sawtooth', t:0.05}); SND.noise({type:'lowpass', f:200, dur:2.5, att:0.1, gain:0.4, t:0.08});
    H.pulse(500, 1.5, 0.03, pan); H.pulse(30, 1.7, 1.0, 0, 0.05); for(let i = 0; i < 8; i++) H.pulse(rnd(26, 45), 1.2*Math.pow(0.8, i), 0.2, rnd(-0.8, 0.8), 0.15 + i*0.1);
    Cam.shake(0.35); Light.flash([230, 240, 255], 250);
    if(d < 2.3 && C.hurt(1, new THREE.Vector3(s.x, 0, s.z))) st.struck++;
    C.ents.forEach(e => { if(e.alive && Math.hypot(e.pos.x - s.x, e.pos.z - s.z) < 2.6) e.damage(3, null, 'lightning'); });
  }
  function finish(){ if(st.ended) return; st.ended = true; G.finishStage({id:'st6', time:st.time, got:[true, st.struck === 0, C.stats.kills >= 15], goals:[t('s6_star1'), t('s6_star2', {n:st.struck}), t('s6_star3', {n:C.stats.kills})]}); }
  function fail(){ if(st.ended) return; st.ended = true; G.failStage({id:'st6', note:t('survived', {s:Math.floor(st.time)}), goals:[t('s6_star1'), t('s6_star2', {n:st.struck}), t('s6_star3', {n:C.stats.kills})]}); }
  let rainBed = null, rainBed2 = null;
  return {
    id:'st6', world:w, player,
    enter(){
      E.setWorld(root); E.setSky(0x0d1424, 0x2b3550, 0x151a22, 0x1d2536); E.scene.fog.near = 12; E.scene.fog.far = 70;
      E.sun.intensity = 0.5; E.hemi.intensity = 0.55;
      player.place(0, 0.45, 3, Math.PI); Cam.yaw = 0; Cam.pitch = 0.4; Cam.dist = 7.5; Cam.ground = (x, z) => w.groundAt(x, z).h;
      C.init(w, player, {hp:6, weapons:['sword', 'pistol', 'bow', 'axe'], camDist:7.5, onDeath:fail}); Light.base = [60, 80, 160]; hud();
      UI.toast(t('st6') + '\n' + t('s6_intro'), 4200);
      rainBed = SND.bed({type:'highpass', f:1800, q:0.3}); rainBed.set(0.3, 2); rainBed2 = SND.bed({type:'lowpass', f:380, lfo:0.05}); rainBed2.set(0.2, 2);
    },
    exit(){ st.ended = true; C.dispose(); rainBed && rainBed.stop(); rainBed2 && rainBed2.stop(); E.sun.intensity = 2.6; E.hemi.intensity = 1.2; },
    update(dt, time, live){
      w.update(dt, time); player.locked = !live || C.dead;
      player.update(dt); C.update(dt, live);
      const r = Math.hypot(player.p.x, player.p.z); if(r > 17){ player.p.x *= 17/r; player.p.z *= 17/r; }
      // rain visuals + haptic patter
      const p = rg.attributes.position.array, cx = Cam.cur.x, cz = Cam.cur.z;
      for(let i = 0; i < N; i++){ p[i*3 + 1] -= dt*22; if(p[i*3 + 1] < 0){ p[i*3 + 1] += 26; p[i*3] = cx + rnd(-30, 30); p[i*3 + 2] = cz + rnd(-30, 30); } }
      rg.attributes.position.needsUpdate = true;
      st.drop += dt*28; while(st.drop >= 1){ st.drop--; if(Math.random() < 0.88) H.pulse(rnd(260, 520), rnd(0.06, 0.18), rnd(0.015, 0.03), rnd(-1, 1)); else H.pulse(rnd(110, 160), rnd(0.25, 0.4), 0.05, rnd(-1, 1)); }
      st.flash = Math.max(0, st.flash - dt); bolt.intensity = st.flash > 0 ? 40*Math.random() : 0;
      if(live && !st.done && !C.dead){
        st.time += dt;
        st.spawnT -= dt; if(st.spawnT <= 0){ st.spawnT = clamp(4.2 - st.time*0.025, 1.6, 4.2); spawn(); }
        st.strikeT -= dt; if(st.strikeT <= 0){ st.strikeT = rnd(4.5, 7.5); lightning(); }
        if(st.time >= SURVIVE){ st.done = true; C.ents.forEach(e => e.alive && e.die()); UI.toast(t('s6_clear'), 2500); later(2200, finish); }
      }
      for(const s of st.strikes){ s.t -= dt; s.fill.material.opacity = 0.15 + 0.45*(1 - s.t/1.6); if(s.t <= 0) strike(s); }
      st.strikes = st.strikes.filter(s => s.t > 0);
      hud();
      Cam.target.set(player.p.x, player.p.y + 1.1, player.p.z);
      Cam.update(dt, live ? {x:IN.lx + IN.mouseDX*0.08, y:IN.ly + IN.mouseDY*0.06} : null);
      E.followSun(player.p);
    },
    debug:{st}
  };
}
