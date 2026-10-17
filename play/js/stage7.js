// Stage 7 — "Final Battle": a giant. Phase 1 parry its sweeps and dodge its slams; phase 2 it armours up —
// shoot the two glowing cores with gun or bow; phase 3 it rages and calls lightning. Every weapon is available.
import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { E, Cam, FX, Time, clamp } from './engine.js';
import { IN } from './input.js';
import { Light, Feel } from './feel.js';
import { H } from './haptics.js';
import { SND } from './sound.js';
import { UI, $ } from './ui.js';
import { t } from './i18n.js';
import { C, Enemy, Hit } from './combat.js';
import { deco, torch, ringWall } from './arena.js';

const rnd = (a, b) => a + Math.random()*(b - a);

class Core {   // weak point riding on the boss's shoulder
  constructor(boss, side){ this.type = 'core'; this.boss = boss; this.side = side; this.alive = true; this.gone = false; this.hp = 4; this.r = 0.55; this.h = 0; this.pos = new THREE.Vector3();
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), new THREE.MeshStandardMaterial({color:0x80e0ff, emissive:0x40c0ff, emissiveIntensity:2})); C.root.add(this.mesh);
    this.light = new THREE.PointLight(0x60d0ff, 3, 5); this.mesh.add(this.light); }
  damage(dmg){ if(!this.alive) return; this.hp -= dmg; this.mesh.material.emissive.set(0xffffff); setTimeout(() => this.mesh.material.emissive.set(0x40c0ff), 70);
    const pan = Cam.panOf(this.pos.x, this.pos.z); Hit.clang(pan, 0.8); H.pulse(900, 0.8, 0.02, pan);
    if(this.hp <= 0){ this.alive = false; C.root.remove(this.mesh); Hit.kill(this.pos); FX.burst(this.pos.clone(), {n:30, color:0x80e0ff, size:0.09, up:4, speed:5, life:0.9}); this.gone = true; } }
  update(){ const b = this.boss, f = b.face, s = this.side; this.pos.set(b.pos.x + Math.cos(f)*1.1*s, b.pos.y + 3.6, b.pos.z - Math.sin(f)*1.1*s); this.mesh.position.copy(this.pos); this.mesh.scale.setScalar(1 + Math.sin(performance.now()/150)*0.08); }
}

export function makeStage7(G){
  const w = new World(); w.fallY = -6; const root = w.group;
  w.disc(0, 0, 60, -0.05, 'stone', {thick:1, tile:6});
  w.disc(0, 0, 19, 0.12, 'metal', {thick:0.4, tile:4});
  w.disc(0, 0, 6, 0.16, 'stone', {thick:0.2, tile:3});
  ringWall(w, 20.3, 30, 'wallHigh', {height:4, sx:1.6});
  for(let i = 0; i < 10; i++){ const a = i/10*Math.PI*2; torch(w, Math.cos(a)*17.5, Math.sin(a)*17.5, 2.8); }
  for(let i = 0; i < 14; i++){ const a = i/14*Math.PI*2; deco(w, 'banner', Math.cos(a)*19.4, Math.sin(a)*19.4, {rot:-a - Math.PI/2, height:3}); }
  const player = new Player(w);
  const st = {time:0, phase:0, done:false, ended:false, cores:[], adds:0, strikeT:6, strikes:[], parryBoss:0};
  const later = (ms, f) => setTimeout(() => { if(!st.ended) f(); }, ms);
  let boss = null;

  function makeBoss(){
    boss = new Enemy('brute', 0, -9, {hp:60, speed:2.0, cd:2.6});
    const base = boss.damage.bind(boss), strike = boss.strike.bind(boss);
    boss.damage = (dmg, dir, kind) => {
      if(boss.armored){ Hit.clang(Cam.panOf(boss.pos.x, boss.pos.z), 0.7); SND.tone({f:2400, dur:0.08, gain:0.05}); return; }
      base(kind === 'axe' && st.phase === 2 ? dmg*2 : dmg, dir ? dir.clone().multiplyScalar(0.15) : null, kind);
      bossBar();
    };
    // close range: a sweeping punch you can parry (big stagger); farther: the ground slam (dodge or jump)
    boss.strike = dist => {
      if(dist < 3.6){ SND.play('eattack', {rate:0.6, gain:1}); boss.m.once('attack', () => boss.m.play('idle'), {speed:1.2});
        const before = C.stats.parries; resolveSweep(); if(C.stats.parries > before){ st.parryBoss++; boss.stunFor(2.6); UI.toast(t('s7_stagger'), 1200); } }
      else strike(dist);
    };
    C.add(boss); boss.m.ready.then(() => boss.m.play('idle'));
  }
  function resolveSweep(){
    // reuse the melee resolution by faking reach; guard/parry/dodge rules apply
    const tmp = boss.d.reach; boss.d.reach = 3.6; boss.d.dmg = 2;
    const P = C.player, sw = C.arsenal.cur && C.arsenal.cur.id === 'sword' ? C.arsenal.cur : null, now = performance.now();
    const d = Math.hypot(P.p.x - boss.pos.x, P.p.z - boss.pos.z);
    if(d > 4.2) { H.noise({f:200, dur:0.2, gain:0.4}); boss.d.reach = tmp; return; }
    if(C.inv > 0 && now - C.lastDodge < 400){ boss.d.reach = tmp; return; }
    if(sw && sw.guard && now - sw.guardAt < 260){ C.stats.parries++; Time.slow(0.25, 0.6); Hit.clang(0, 1.6); H.pulse(35, 1.7, 0.6, 0, 0.05); Light.flash([255, 255, 255], 300); Cam.shake(0.25); boss.d.reach = tmp; return; }
    if(sw && sw.guard){ Hit.clang(0, 1.2); C.hurt(1, boss.pos); boss.d.reach = tmp; return; }
    C.hurt(2, boss.pos); boss.d.reach = tmp;
  }
  function bossBar(){ $('hBossBar').style.width = (Math.max(0, boss.hp)/boss.maxHp*100) + '%'; }
  function setArmor(on){
    boss.armored = on;
    if(boss.mats) boss.mats.forEach(m => { m.color.set(on ? 0x8890a8 : 0xc89cff); m.metalness = on ? 0.8 : 0; });
    if(on){ st.cores = [new Core(boss, 1), new Core(boss, -1)]; st.cores.forEach(c => C.add(c)); }
  }
  function phaseCheck(){
    if(!boss) return;
    if(st.phase === 0 && boss.hp <= 40){ st.phase = 1; setArmor(true); boss.stunFor(1.2); UI.toast(t('s7_p2'), 4200); SND.play('heavy', {rate:0.5, gain:1}); H.pulse(30, 1.7, 0.8); Cam.shake(0.4);
      for(let i = 0; i < 2; i++) later(1500 + i*600, () => C.add(new Enemy('gunner', (i ? 1 : -1)*12, 8))); }
    if(st.phase === 1 && st.cores.length && st.cores.every(c => !c.alive)){ st.phase = 2; setArmor(false); boss.stunFor(3); boss.d.speed = 2.8; boss.d.cd = 1.8; boss.d.wind = 0.8;
      UI.toast(t('s7_p3'), 4200); Feel.enterPortal(); Light.base = [255, 40, 60]; }
    if(boss.hp <= 0 && !st.done){ st.done = true; Time.slow(0.2, 1.6); UI.toast(t('s7_win'), 3000); later(1800, () => { player.setAnim('dance', {restart:true}); Feel.fanfare(); }); later(4800, finish); C.ents.forEach(e => e.alive && e !== boss && e.die && e.die()); }
  }
  function lightning(){
    const p = player.p, x = clamp(p.x + rnd(-2.5, 2.5), -18, 18), z = clamp(p.z + rnd(-2.5, 2.5), -18, 18), y = w.groundAt(x, z).h + 0.06;
    const ring = new THREE.Mesh(new THREE.CircleGeometry(2.1, 40), new THREE.MeshBasicMaterial({color:0xff6a6a, transparent:true, opacity:0.2, depthWrite:false})); ring.rotation.x = -Math.PI/2; ring.position.set(x, y, z); root.add(ring);
    st.strikes.push({x, z, t:1.5, ring});
    for(let i = 0; i < 13; i++){ const k = i/12; H.noise({t:i*0.1, f:200 + 600*k, q:2, dur:0.05, gain:0.08 + 0.4*k, pan:Cam.panOf(x, z)}); }
  }
  function hud(){
    $('hTitle').textContent = t('st7'); $('hSub').textContent = '';
    $('hCtl').innerHTML = `${UI.key('attack')} ${t('ctl_attack')} · <span class="key">L2</span> ${t('ctl_guard')}/${t('ctl_aim')} · <span class="key">R2</span> ${t('ctl_fire')} · <span class="key">◀▶</span> ${t('ctl_swap')} · ${UI.key('dodge')} ${t('ctl_dodge')} · ${UI.key('jump')} ${t('ctl_jump')}`;
  }
  function finish(){ if(st.ended) return; st.ended = true; G.finishStage({id:'st7', time:st.time, got:[true, st.parryBoss >= 2, C.hp >= 3], goals:[t('s7_star1'), t('s7_star2', {n:st.parryBoss}), t('s7_star3')]}); }
  function fail(){ if(st.ended) return; st.ended = true; G.failStage({id:'st7', goals:[t('s7_star1'), t('s7_star2', {n:st.parryBoss}), t('s7_star3')]}); }
  let drone = null;
  return {
    id:'st7', world:w, player,
    enter(){
      E.setWorld(root); E.setSky(0x120a1e, 0x5a2240, 0x1a1020, 0x3a1830); E.scene.fog.near = 25; E.scene.fog.far = 90; E.sun.intensity = 1.4;
      player.place(0, 0.16, 10, Math.PI); Cam.yaw = 0; Cam.pitch = 0.4; Cam.dist = 9; Cam.ground = (x, z) => w.groundAt(x, z).h;
      C.init(w, player, {hp:6, weapons:['sword', 'pistol', 'mg', 'bow', 'axe'], camDist:9, onDeath:fail}); Light.base = [180, 60, 255]; hud();
      $('hBoss').style.display = ''; $('hBossName').textContent = t('s7_boss');
      makeBoss(); bossBar(); UI.toast(t('st7') + '\n' + t('s7_intro'), 4200);
      drone = SND.bed({type:'lowpass', f:120, lfo:0.3}); drone.set(0.25, 2);
    },
    exit(){ st.ended = true; $('hBoss').style.display = 'none'; C.dispose(); drone && drone.stop(); E.sun.intensity = 2.6; },
    update(dt, time, live){
      w.update(dt, time); player.locked = !live || (C.dead && !st.done);
      if(live && !st.done) st.time += dt;
      player.update(dt); C.update(dt, live);
      const r = Math.hypot(player.p.x, player.p.z); if(r > 18.4){ player.p.x *= 18.4/r; player.p.z *= 18.4/r; }
      st.cores.forEach(c => c.alive && c.update());
      if(live && !st.done){ phaseCheck(); if(boss) bossBar();
        if(st.phase === 2){ st.strikeT -= dt; if(st.strikeT <= 0){ st.strikeT = rnd(3.5, 5.5); lightning(); } }
        // the giant's footsteps shake the floor — felt more the closer it is
        if(boss && boss.alive && boss.state === 'chase'){ boss._step = (boss._step || 0) + dt; if(boss._step > 0.62){ boss._step = 0; const k = clamp(1 - boss.dist/22, 0, 1); H.pulse(38, 0.25 + 0.9*k, 0.12, Cam.panOf(boss.pos.x, boss.pos.z)*0.6); SND.play('heavy', {rate:0.55, gain:0.15 + 0.4*k}); if(k > 0.6) Cam.shake(0.04*k); } }
      }
      for(const s of st.strikes){ s.t -= dt; s.ring.material.opacity = 0.2 + 0.5*(1 - s.t/1.5); if(s.t <= 0){ root.remove(s.ring); const d = Math.hypot(player.p.x - s.x, player.p.z - s.z);
        SND.noise({f:2000, fEnd:200, q:0.5, dur:0.25, gain:0.6}); SND.tone({f:60, fEnd:28, dur:1.6, gain:0.3, type:'sawtooth'}); H.pulse(500, 1.5, 0.03); H.pulse(30, 1.7, 0.8, 0, 0.05); Cam.shake(0.3); Light.flash([255, 200, 200], 200);
        FX.burst(new THREE.Vector3(s.x, w.groundAt(s.x, s.z).h + 0.1, s.z), {n:30, color:0xffb0b0, size:0.08, up:6, speed:6, life:0.6});
        if(d < 2.2) C.hurt(1, new THREE.Vector3(s.x, 0, s.z)); } }
      st.strikes = st.strikes.filter(s => s.t > 0);
      hud();
      Cam.target.set(player.p.x, player.p.y + 1.2, player.p.z);
      Cam.update(dt, live ? {x:IN.lx + IN.mouseDX*0.08, y:IN.ly + IN.mouseDY*0.06} : null);
      E.followSun(player.p);
    },
    debug:{st, get boss(){ return boss; }}
  };
}
