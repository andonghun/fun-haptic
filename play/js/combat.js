// Combat: player health/dodge, weapons (sword, pistol, machine gun, bow, longbow, axe), aiming (stick/mouse + gyro),
// enemies (grunt, gunner, drone, brute), projectiles, hit feedback. Every weapon has its own trigger effect and haptic signature.
import * as THREE from 'three';
import { spawn } from './assets.js';
import { IN } from './input.js';
import { DS, TRG } from './ds.js';
import { H } from './haptics.js';
import { SND } from './sound.js';
import { Feel, Light } from './feel.js';
import { E, Cam, FX, Time, clamp, lerp, damp } from './engine.js';
import { UI, Save, $ } from './ui.js';
import { t } from './i18n.js';

const rnd = (a, b) => a + Math.random()*(b - a);
const later = (ms, f) => setTimeout(f, ms);
const DEG = Math.PI/180;
const v3 = () => new THREE.Vector3();
const panAt = p => Cam.panOf(p.x, p.z);

// ---------------------------------------------------------------- shared state
export const C = {
  ents: [], projs: [], world: null, player: null, root: null,
  hp: 5, maxHp: 5, inv: 0, dodgeT: 0, dodgeCd: 0, lastDodge: -9, dead: false,
  stats: null, onDeath: null, onKill: null, arsenal: null, aiming: false, aimRay: new THREE.Ray(), aimPoint: v3(), camDist: 7.5,
  init(world, player, o = {}){
    this.world = world; this.player = player; this.root = world.group; this.ents = []; this.projs = [];
    this.maxHp = this.hp = o.hp || 5; this.inv = 0; this.dead = false; this.dodgeT = 0; this.dodgeCd = 0;
    this.stats = {shots:0, hits:0, kills:0, parries:0, deflects:0, dmgTaken:0, bulls:0, multi:0};
    this.onDeath = o.onDeath || null; this.onKill = o.onKill || null; this.camDist = o.camDist || 7.5;
    this.arsenal = new Arsenal(o.weapons || []); this.hud();
    $('hHearts').style.display = ''; $('hWeap').style.display = this.arsenal.list.length ? '' : 'none';
  },
  dispose(){ this.arsenal && this.arsenal.dispose(); this.arsenal = null; this.ents = []; this.projs = []; $('hHearts').style.display = 'none'; $('hWeap').style.display = 'none'; $('hRet').style.display = 'none'; DS.out.players = 0; DS.out.trigL = TRG.off(); DS.out.trigR = TRG.off(); Cam.side = 0; Cam.fov = 50; },
  hud(){ $('hHearts').innerHTML = '<span class="heart">♥</span>'.repeat(Math.max(0, this.hp)) + '<span class="heart off">♥</span>'.repeat(Math.max(0, this.maxHp - this.hp)); },
  // ---- player damage
  hurt(dmg, from){
    if(this.dead || this.inv > 0) return false;
    this.hp -= dmg; this.inv = 1.0; this.stats.dmgTaken += dmg; this.hud();
    const p = this.player.p, side = from ? clamp(-panAt(from)*1, -1, 1)*-1 : 0, pan = from ? panAt(from) : 0;
    SND.tone({f:220, fEnd:60, dur:0.35, gain:0.25, type:'sawtooth'}); SND.noise({f:300, dur:0.2, gain:0.25}); SND.play('ehurt', {rate:0.7, gain:0.6});
    H.pulse(230, 1.4, 0.05, pan); H.pulse(42, 1.7, 0.35); for(let i = 0; i < 4; i++) H.pulse(120 - i*15, 1.0 - i*0.2, 0.06, pan*(i % 2 ? 0.4 : 1), 0.09 + i*0.06);
    Light.flash([255, 20, 20], 500); Cam.shake(0.25); vignette();
    if(from){ const dx = p.x - from.x, dz = p.z - from.z; this.player.dash(dx, dz, 7, 0.14); }
    if(this.hp <= 0){ this.dead = true; this.player.locked = true; this.player.setAnim('death', {once:true}); Feel.fall(); later(1400, () => this.onDeath && this.onDeath()); }
    return true;
  },
  heal(n){ this.hp = Math.min(this.maxHp, this.hp + n); this.hud(); SND.notes([660, 880, 1320], 0.07, {gain:0.08, pad:true}); H.pulse(300, 0.6, 0.05); H.pulse(450, 0.6, 0.05, 0, 0.08); Light.flash([80, 255, 140], 300); },
  // ---- per frame (called by the stage)
  update(dt, live){
    const P = this.player;
    this.inv = Math.max(0, this.inv - dt); this.dodgeCd -= dt;
    if(live && !this.dead){
      // dodge roll: i-frames, short dash
      if(IN.pressed('dodge') && this.dodgeCd <= 0 && P.ground){
        const ix = P.input ? P.input.x : 0, iz = P.input ? P.input.z : 0, f = Cam.fwd();
        const dx = Math.hypot(ix, iz) > 0.2 ? ix : -f[0], dz = Math.hypot(ix, iz) > 0.2 ? iz : -f[1];
        P.dash(dx, dz, 10, 0.3); this.inv = Math.max(this.inv, 0.32); this.dodgeCd = 0.55; this.lastDodge = performance.now();
        P.setAnim('jump', {restart:true, speed:2}); P.animHold = 0.3;
        SND.noise({f:500, fEnd:2400, q:0.8, dur:0.25, att:0.03, gain:0.18}); for(let i = 0; i < 6; i++) H.pulse(90 + i*15, 0.5, 0.04, clamp((dx*Cam.right()[0] + dz*Cam.right()[1])*(i/5*2 - 1), -1, 1), i*0.035);
      }
      this.arsenal.update(dt);
    }
    // player LEDs: lit = hearts left (out of 5); mic LED blinks when low
    DS.out.players = [0, 0x04, 0x0a, 0x0e, 0x1b, 0x1f][clamp(Math.ceil(this.hp/this.maxHp*5), 0, 5)];
    DS.out.mic = this.hp === 1 && Math.floor(performance.now()/400) % 2 === 0;
    for(const e of this.ents) e.update(dt, live);
    this.ents = this.ents.filter(e => !e.gone);
    for(const p of this.projs) p.update(dt);
    this.projs = this.projs.filter(p => !p.gone);
  },
  // ray vs entity spheres → nearest hit {e, t, point}
  raycast(ray, maxT = 80, filter){
    let best = null; const c = v3(), tmp = v3();
    for(const e of this.ents){ if(!e.alive || (filter && !filter(e))) continue;
      c.copy(e.pos).y += e.h; tmp.subVectors(c, ray.origin); const tc = tmp.dot(ray.direction); if(tc < 0) continue;
      const d2 = tmp.lengthSq() - tc*tc, r2 = e.r*e.r; if(d2 > r2) continue; const th = tc - Math.sqrt(r2 - d2);
      if(th < maxT && (!best || th < best.t)) best = {e, t:th, point:ray.at(th, v3())}; }
    return best;
  },
  // entities within radius of a point
  near(p, r, filter){ return this.ents.filter(e => e.alive && (!filter || filter(e)) && Math.hypot(e.pos.x - p.x, e.pos.z - p.z) < r + e.r && Math.abs(e.pos.y + e.h - p.y) < 2.2); },
  add(e){ this.ents.push(e); return e; },
  handPos(out = v3()){ return this.arsenal ? this.arsenal.handPos(out) : out.copy(this.player.p).setY(this.player.p.y + 1.1); }
};

function vignette(){ const v = $('hVig'); v.classList.remove('on'); void v.offsetWidth; v.classList.add('on'); }
function hitMarker(kill){ const r = $('hHit'); r.classList.remove('on', 'kill'); void r.offsetWidth; r.classList.add('on'); if(kill) r.classList.add('kill'); }

// ---------------------------------------------------------------- feel helpers
export const Hit = {
  clang(pan = 0, k = 1){ const i = SND.play('metal', {rate:0.7*rnd(0.95, 1.05), gain:0.9*k, pan:pan*0.5}); H.play(SND.hapOf('metal', Math.max(0, i)), 0.75, 1.8*k, pan); H.pulse(420, 1.4*k, 0.03, pan); H.pulse(60, 1.3*k, 0.15, pan*0.5); SND.noise({type:'highpass', f:5000, dur:0.12, gain:0.2*k}); },
  flesh(pan = 0, k = 1){ SND.play('ehurt', {rate:rnd(0.9, 1.1), gain:0.6*k, pan:pan*0.5}); H.pulse(110, 1.2*k, 0.09, pan); H.pulse(300, 0.8*k, 0.025, pan); },
  thunk(pan = 0, k = 1){ const i = SND.play('wood', {rate:0.8, gain:0.9*k, pan:pan*0.5}); H.play(SND.hapOf('wood', Math.max(0, i)), 0.8, 1.6*k, pan); H.pulse(70, 1.1*k, 0.12, pan); },
  kill(pos){ const pan = panAt(pos); SND.play('edestroy', {gain:0.8, pan:pan*0.5}); H.play(SND.hapOf('edestroy', 0), 1, 1.6, pan); H.pulse(340, 1.3, 0.03, pan); H.pulse(55, 1.5, 0.22, pan*0.5);
    FX.burst(pos.clone().setY(pos.y + 1), {n:26, color:0xffb347, size:0.1, up:4, speed:4, life:0.9}); FX.burst(pos.clone().setY(pos.y + 1), {n:10, color:0x333333, size:0.14, up:3, speed:2.5, life:1.1}); Light.flash([255, 160, 60], 200); }
};

// ---------------------------------------------------------------- enemies
const ENEMY = {
  grunt:  {model:'soldier', tint:0xff9a9a, hp:4, r:0.55, h:0.75, speed:2.7, reach:1.7, wind:0.55, dmg:1, cd:1.3},
  gunner: {model:'soldier', tint:0x9ac0ff, hp:3, r:0.55, h:0.75, speed:2.4, range:[7, 12], wind:0.8, dmg:1, cd:2.6},
  drone:  {model:'drone', hp:2, r:0.6, h:0, speed:3.2, range:[6, 11], wind:0.9, dmg:1, cd:3.2, fly:2.4},
  brute:  {model:'soldier', tint:0xc89cff, hp:30, r:1.4, h:2.0, speed:1.9, reach:4.6, wind:1.0, dmg:2, cd:3.2, height:4.4}
};
export class Enemy {
  constructor(type, x, z, o = {}){
    const d = this.d = {...ENEMY[type], ...o}; this.type = type; this.hp = this.maxHp = d.hp; this.r = d.r; this.h = d.h; this.alive = true; this.gone = false;
    const g = C.world.groundAt(x, z).h; this.pos = new THREE.Vector3(x, d.fly ? g + d.fly : g, z); this.vel = v3();
    this.m = spawn(d.model, {height:d.height || (d.fly ? 1.0 : 1.5), tint:d.tint}); this.m.root.position.copy(this.pos); C.root.add(this.m.root);
    this.m.ready.then(() => { this.m.play('idle'); this.mats = []; this.m.root.traverse(n => { if(n.isMesh){ n.material = n.material.clone(); this.mats.push(n.material); } }); });
    this.state = 'chase'; this.t = rnd(0.5, 1.5); this.cd = rnd(0.5, 1.5); this.stun = 0; this.flash = 0; this.face = 0; this.hitBy = new Set(); this.bob = Math.random()*6;
    // health bar
    this.bar = new THREE.Group(); const bg = new THREE.Sprite(new THREE.SpriteMaterial({color:0x000000, opacity:0.5, transparent:true, depthTest:false}));
    bg.scale.set(1.0, 0.1, 1); this.fg = new THREE.Sprite(new THREE.SpriteMaterial({color:0xff5566, depthTest:false})); this.fg.center.set(0, 0.5); this.fg.position.x = -0.5; this.fg.scale.set(1, 0.1, 1);
    this.bar.add(bg, this.fg); this.bar.visible = false; this.bar.renderOrder = 10; C.root.add(this.bar);
  }
  get dist(){ return Math.hypot(C.player.p.x - this.pos.x, C.player.p.z - this.pos.z); }
  telegraph(){ this.flash = Math.max(this.flash, 0.01); const d = this.dist; if(d < 9){ const pan = panAt(this.pos), k = 1 - d/9; H.pulse(85, 0.25 + 0.45*k, 0.05, pan); H.pulse(85, 0.25 + 0.45*k, 0.05, pan, 0.12); } SND.tone({f:180, fEnd:120, dur:0.25, gain:0.05, type:'square', pan:panAt(this.pos)*0.6}); }
  damage(dmg, dir, kind){
    if(!this.alive) return;
    this.hp -= dmg; this.flash = 0.12; this.bar.visible = true; this.fg.scale.x = Math.max(0, this.hp/this.maxHp); this.fg.position.x = -0.5;
    if(dir){ const k = kind === 'sword' || kind === 'axe' ? 5 : 2.5; this.vel.x += dir.x*k; this.vel.z += dir.z*k; }
    if(kind !== 'parry' && this.state === 'wind' && (kind === 'sword' || kind === 'axe')) { this.state = 'chase'; this.cd = 0.8; }      // interrupt
    C.stats.hits++; hitMarker(this.hp <= 0);
    if(this.hp <= 0) this.die();
  }
  die(){
    this.alive = false; this.state = 'dead'; this.bar.visible = false; C.stats.kills++; Hit.kill(this.pos);
    if(this.m.has && this.m.has('die')) this.m.once('die'); this.deadT = 0; C.onKill && C.onKill(this);
  }
  stunFor(s){ this.stun = s; this.state = 'chase'; this.m.play('idle'); }
  update(dt, live){
    const d = this.d, P = C.player, dx = P.p.x - this.pos.x, dz = P.p.z - this.pos.z, dist = Math.hypot(dx, dz) || 1;
    this.m.update(dt);
    if(this.state === 'dead'){ this.deadT += dt; if(this.deadT > 1.1){ this.m.root.position.y -= dt*1.5; if(this.deadT > 2){ C.root.remove(this.m.root); C.root.remove(this.bar); this.gone = true; } }
      if(d.fly){ this.pos.y = Math.max(C.world.groundAt(this.pos.x, this.pos.z).h, this.pos.y - dt*6); this.m.root.position.copy(this.pos); this.m.root.rotation.z += dt*6; } return; }
    // knockback, separation
    this.pos.x += this.vel.x*dt; this.pos.z += this.vel.z*dt; this.vel.multiplyScalar(Math.exp(-dt*8));
    for(const o of C.ents){ if(o === this || !o.alive) continue; const ox = this.pos.x - o.pos.x, oz = this.pos.z - o.pos.z, od = Math.hypot(ox, oz), m = this.r + o.r; if(od < m && od > 1e-4){ this.pos.x += ox/od*(m - od)*0.5; this.pos.z += oz/od*(m - od)*0.5; } }
    C.world.resolve(this.pos, this.r); if(C.world.bounds){ const b = C.world.bounds; this.pos.x = clamp(this.pos.x, b.x0, b.x1); this.pos.z = clamp(this.pos.z, b.z0, b.z1); }
    const g = C.world.groundAt(this.pos.x, this.pos.z).h; this.bob += dt*2;
    this.pos.y = d.fly ? damp(this.pos.y, g + d.fly + Math.sin(this.bob)*0.3, 3, dt) : g;
    if(this.stun > 0){ this.stun -= dt; this.m.root.rotation.z = Math.sin(this.stun*20)*0.08; this.place(dt); return; } else this.m.root.rotation.z = 0;
    if(!live || C.dead){ this.place(dt); return; }
    this.cd -= dt;
    const want = Math.atan2(dx, dz); let df = want - this.face; df = Math.atan2(Math.sin(df), Math.cos(df)); this.face += df*Math.min(1, dt*(this.state === 'wind' ? 2 : 8));
    if(this.state === 'chase'){
      let mv = 0, sx = 0;
      if(d.reach){ if(dist > d.reach*0.85) mv = 1; if(dist < d.reach && this.cd <= 0 && Math.abs(df) < 0.6){ this.state = 'wind'; this.t = d.wind; this.telegraph(); this.m.play('idle'); } }
      else { const [lo, hi] = d.range; if(dist > hi) mv = 1; else if(dist < lo) mv = -0.8; sx = Math.sin(this.bob*0.7)*0.6;
        if(this.cd <= 0 && dist < hi + 4){ this.state = 'wind'; this.t = d.wind; this.telegraph(); this.aimAt = P.p.clone().setY(P.p.y + 1); this.laser(true); } }
      if(mv || sx){ const sp = d.speed*(mv < 0 ? 0.7 : 1); this.pos.x += (dx/dist*mv + dz/dist*sx)*sp*dt; this.pos.z += (dz/dist*mv - dx/dist*sx)*sp*dt; if(!d.fly) this.m.play(d.speed > 2.5 && mv > 0 ? 'run' : 'walk'); }
      else if(!d.fly) this.m.play('idle');
    } else if(this.state === 'wind'){
      this.t -= dt; this.flash = Math.max(this.flash, 0.05);
      if(this.aimAt && this.laserMesh){ this.aimAt.lerp(P.p.clone().setY(P.p.y + 1), dt*2.5); this.updLaser(); }
      if(this.t <= 0){ this.strike(dist); this.state = 'chase'; this.cd = d.cd*rnd(0.85, 1.2); this.laser(false); }
    }
    this.place(dt);
  }
  place(dt){
    const r = this.m.root; r.position.copy(this.pos); r.rotation.y = this.face; if(this.d.fly) r.position.y += 0;
    this.bar.position.set(this.pos.x, this.pos.y + (this.d.height || 1.5)*(this.d.fly ? 0.9 : 1) + 0.35, this.pos.z);
    this.flash = Math.max(0, this.flash - dt);
    if(this.mats) for(const m of this.mats){ if(!m.emissive) continue; m.emissive.setRGB(this.state === 'wind' ? 0.6 + Math.sin(performance.now()/40)*0.3 : this.flash > 0 ? 1 : 0, this.flash > 0 && this.state !== 'wind' ? 1 : 0, this.flash > 0 && this.state !== 'wind' ? 1 : 0); }
  }
  laser(on){
    if(on && !this.laserMesh){ this.laserMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6, 1, true), new THREE.MeshBasicMaterial({color:0xff3040, transparent:true, opacity:0.75, blending:THREE.AdditiveBlending, depthWrite:false})); C.root.add(this.laserMesh); this.updLaser(); }
    if(!on && this.laserMesh){ C.root.remove(this.laserMesh); this.laserMesh = null; }
  }
  muzzle(){ return this.pos.clone().setY(this.pos.y + (this.d.fly ? 0 : 1.05)).add(new THREE.Vector3(Math.sin(this.face)*0.5, 0, Math.cos(this.face)*0.5)); }
  updLaser(){ const a = this.muzzle(), b = this.aimAt, m = this.laserMesh, len = a.distanceTo(b); m.position.copy(a).lerp(b, 0.5); m.scale.set(1, len, 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); m.material.opacity = 0.4 + Math.random()*0.5; }
  strike(dist){
    const d = this.d, P = C.player, pan = panAt(this.pos);
    if(d.reach){
      if(!this.m.ok) {} else this.m.once('attack', () => this.m.play('idle'), {speed:1.6});
      SND.play('eattack', {gain:0.7, pan:pan*0.5}); SND.noise({f:900, fEnd:300, q:0.7, dur:0.2, gain:0.15});
      if(this.type === 'brute'){ this.slam(); return; }
      if(dist < d.reach + 0.4) resolveMelee(this, d.dmg);
      else H.noise({f:300, dur:0.12, gain:0.25, pan});
    } else {
      const from = this.muzzle(), dir = this.aimAt.clone().sub(from).normalize();
      SND.play('blaster', {rate:0.7, gain:0.5, pan:pan*0.5}); H.pulse(150, 0.4, 0.05, pan);
      C.projs.push(new Proj({kind:'orb', pos:from, vel:dir.multiplyScalar(13), team:'enemy', dmg:d.dmg, r:0.28, src:this}));
    }
  }
  slam(){
    const P = C.player, c = this.pos.clone().add(new THREE.Vector3(Math.sin(this.face)*2.4, 0, Math.cos(this.face)*2.4));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 4.5, 40), new THREE.MeshBasicMaterial({color:0xffaa55, transparent:true, opacity:0.6, side:THREE.DoubleSide, depthWrite:false}));
    ring.rotation.x = -Math.PI/2; ring.position.copy(c).setY(c.y + 0.08); C.root.add(ring);
    later(80, () => { C.root.remove(ring); });
    SND.play('heavy', {rate:0.7, gain:1}); H.play(SND.hapOf('heavy', 0), 0.7, 2.2); H.pulse(32, 1.8, 0.6); for(let i = 0; i < 6; i++) H.pulse(60 - i*4, 1.3*Math.pow(0.75, i), 0.1, i % 2 ? 0.9 : -0.9, 0.06 + i*0.07);
    Cam.shake(0.5); FX.burst(c.clone().setY(c.y + 0.1), {n:30, color:0xc8b49a, size:0.15, up:3, speed:6, life:0.8});
    if(Math.hypot(P.p.x - c.x, P.p.z - c.z) < 4.6 && P.p.y - c.y < 0.7) C.hurt(this.d.dmg, this.pos);
  }
}
// melee hit on the player: dodge i-frames → perfect dodge; guard facing the attacker → block or parry
function resolveMelee(e, dmg){
  const P = C.player, sw = C.arsenal && C.arsenal.cur && C.arsenal.cur.id === 'sword' ? C.arsenal.cur : null;
  const now = performance.now(), pan = panAt(e.pos);
  if(C.inv > 0 && now - C.lastDodge < 400){ if(now - C.lastDodge < 220) perfectDodge(e); return; }
  if(sw && sw.guard){
    const toE = Math.atan2(e.pos.x - P.p.x, e.pos.z - P.p.z); let df = toE - P.face; df = Math.atan2(Math.sin(df), Math.cos(df));
    if(Math.abs(df) < 1.3){
      if(now - sw.guardAt < 220){ // parry
        C.stats.parries++; e.stunFor(1.8); Time.slow(0.25, 0.55); Hit.clang(pan, 1.4); H.pulse(900, 1.2, 0.03, pan); H.pulse(35, 1.7, 0.5, 0, 0.05);
        SND.notes([1568, 2093], 0.05, {gain:0.08, type:'triangle'}); Light.flash([255, 255, 255], 300); Cam.shake(0.18); UI.toast(t('parry'), 900);
        FX.burst(P.p.clone().setY(P.p.y + 1.2).lerp(e.pos.clone().setY(e.pos.y + 1.2), 0.4), {n:22, color:0xfff2b0, size:0.07, up:2, speed:6, life:0.4, gravity:2});
      } else { Hit.clang(pan, 0.9); e.vel.set(Math.sin(P.face)*4, 0, Math.cos(P.face)*4); P.dash(-Math.sin(P.face), -Math.cos(P.face), 4, 0.1); Cam.shake(0.08); }
      return;
    }
  }
  C.hurt(dmg, e.pos);
}
function perfectDodge(e){ Time.slow(0.3, 0.7); SND.noise({f:3000, fEnd:600, dur:0.5, gain:0.15}); SND.tone({f:200, fEnd:90, dur:0.6, gain:0.08}); for(let i = 0; i < 5; i++) H.pulse(70, 0.6, 0.12, 0, i*0.14); Light.flash([140, 90, 255], 700); UI.toast(t('perfect_dodge'), 900); }

// ---------------------------------------------------------------- projectiles
const MAT = {};
export class Proj {
  constructor(o){
    Object.assign(this, {grav:0, life:4, r:0.12, dmg:1, gone:false, stuck:false, hit:new Set()}, o);
    if(this.kind === 'orb'){ this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.r, 12, 8), MAT.orb || (MAT.orb = new THREE.MeshBasicMaterial({color:0xff4060}))); this.glow = new THREE.PointLight(0xff4060, 3, 4); this.mesh.add(this.glow); }
    else if(this.kind === 'arrow'){ this.mesh = makeArrow(); }
    else if(this.kind === 'tracer'){ this.mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6, 1, true), new THREE.MeshBasicMaterial({color:0xffe9a0, transparent:true, opacity:0.9, blending:THREE.AdditiveBlending, depthWrite:false})); }
    this.mesh.position.copy(this.pos); C.root.add(this.mesh);
  }
  update(dt){
    if(this.kind === 'tracer'){ this.life -= dt; this.mesh.material.opacity = Math.max(0, this.life/0.08); if(this.life <= 0){ this.gone = true; C.root.remove(this.mesh); } return; }
    this.life -= dt; if(this.life <= 0){ this.gone = true; C.root.remove(this.mesh); return; }
    if(this.stuck) return;
    const steps = 3;
    for(let s = 0; s < steps; s++){
      const h = dt/steps; this.vel.y -= this.grav*h; if(this.kind === 'arrow' && C.wind) this.vel.addScaledVector(C.wind, h); this.pos.addScaledVector(this.vel, h);
      if(this.team === 'player'){
        for(const e of C.ents){ if(!e.alive || this.hit.has(e)) continue; const c = e.pos.clone(); c.y += e.h; if(c.distanceTo(this.pos) < e.r + this.r){ this.hit.add(e); this.onEnt(e); if(this.gone || this.stuck) break; } }
      } else {
        const P = C.player, c = P.p.clone(); c.y += 0.9;
        const sw = C.arsenal && C.arsenal.cur && C.arsenal.cur.id === 'sword' ? C.arsenal.cur : null;
        if(c.distanceTo(this.pos) < 0.9 + this.r){
          if(sw && sw.guard){ // deflect back
            const to = this.src && this.src.alive ? this.src.pos.clone().setY(this.src.pos.y + this.src.h) : this.pos.clone().add(this.vel.clone().multiplyScalar(-1));
            this.vel = to.sub(this.pos).normalize().multiplyScalar(22); this.team = 'player'; this.dmg = 2; C.stats.deflects++;
            Hit.clang(panAt(this.pos), 1.1); H.pulse(1200, 0.9, 0.02); UI.toast(t('deflect'), 700); this.mesh.material = MAT.orbP || (MAT.orbP = new THREE.MeshBasicMaterial({color:0x60d0ff})); if(this.glow) this.glow.color.set(0x60d0ff);
          } else if(C.hurt(this.dmg, this.pos)){ this.kill(); return; }
          else if(C.inv > 0 && performance.now() - C.lastDodge < 220 && this.src) perfectDodge(this.src);
        }
      }
      const gh = C.world.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.5).h;
      if(this.pos.y < gh){ this.pos.y = gh; if(this.kind === 'arrow'){ this.stuck = true; this.life = 3; Hit.thunk(panAt(this.pos), 0.4); } else { this.kill(); return; } }
      if(this.onStep && this.onStep(this)) return;
    }
    this.mesh.position.copy(this.pos);
    if(this.kind === 'arrow' && !this.stuck) this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.vel.clone().normalize());
  }
  onEnt(e){
    const dir = this.vel.clone().setY(0).normalize();
    if(this.kind === 'arrow'){ Hit.thunk(panAt(e.pos), 0.9); e.damage(this.dmg, dir, 'arrow', this); if(e.alive && e.type !== 'target'){ this.kill(); } else { this.stuck = true; this.life = 2; } }
    else { Hit.flesh(panAt(e.pos), 0.9); e.damage(this.dmg, dir, 'orb'); this.kill(); }
  }
  kill(){ this.gone = true; C.root.remove(this.mesh); FX.burst(this.pos.clone(), {n:8, color:this.team === 'player' ? 0x60d0ff : 0xff4060, size:0.05, up:1, speed:2, life:0.3}); }
}
function makeArrow(){
  const g = new THREE.Group(), shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.9, 6), MAT.shaft || (MAT.shaft = new THREE.MeshStandardMaterial({color:0x8a5a32, roughness:0.8})));
  shaft.rotation.x = Math.PI/2; g.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 8), MAT.tip || (MAT.tip = new THREE.MeshStandardMaterial({color:0xc8d0da, metalness:0.9, roughness:0.3}))); tip.rotation.x = Math.PI/2; tip.position.z = 0.5; g.add(tip);
  const fl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.005, 0.16), MAT.fl || (MAT.fl = new THREE.MeshStandardMaterial({color:0xff5d6e}))); fl.position.z = -0.38; g.add(fl); const f2 = fl.clone(); f2.rotation.z = Math.PI/2; g.add(f2);
  g.traverse(n => { if(n.isMesh) n.castShadow = true; }); return g;
}

// ---------------------------------------------------------------- weapons
function procModel(id){
  const g = new THREE.Group();
  if(id === 'bow' || id === 'longbow'){
    // limbs curve forward (+Z) in the vertical plane; the string runs tip→nock→tip and the nock is pulled back (-Z) by the draw
    const L = id === 'longbow' ? 0.95 : 0.65, bend = id === 'longbow' ? 0.32 : 0.26, wood = new THREE.MeshStandardMaterial({color:id === 'longbow' ? 0x5b3a1e : 0x9a6232, roughness:0.7});
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, -L, 0), new THREE.Vector3(0, 0, bend*2), new THREE.Vector3(0, L, 0));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.03, 8), wood));
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 8), new THREE.MeshStandardMaterial({color:0x3a2a20})); grip.position.z = bend; g.add(grip);
    const sm = new THREE.MeshBasicMaterial({color:0xf2f2f2}), s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 4), sm), s2 = s1.clone(); g.add(s1, s2);
    g.userData.str = [s1, s2]; g.userData.L = L; g.userData.bend = bend;
    const ar = makeArrow(); ar.visible = false; g.add(ar); g.userData.arrow = ar;
  } else if(id === 'axe'){
    const wood = new THREE.MeshStandardMaterial({color:0x6b4226, roughness:0.8}), steel = new THREE.MeshStandardMaterial({color:0xbfe6ff, metalness:0.8, roughness:0.2, emissive:0x1a4a6a});
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.85, 8), wood); h.position.y = 0.2; g.add(h);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.36), steel); head.position.set(0, 0.52, 0.16); g.add(head);
    const edge = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16, 1, false, 0, Math.PI), steel); edge.rotation.z = Math.PI/2; edge.position.set(0, 0.52, 0.32); g.add(edge);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.12), steel); back.position.set(0, 0.52, -0.05); g.add(back);
  }
  g.traverse(n => { if(n.isMesh) n.castShadow = true; }); return g;
}

class Weapon {
  constructor(id, o = {}){ this.id = id; this.o = o; this.obj = new THREE.Group(); this.holdRot = new THREE.Euler(); this.swing = new THREE.Euler(); }
  trig(){ return {L:TRG.off(), R:TRG.off()}; }
  equip(){} unequip(){} update(){} hud(){ return ''; }
}
const ICON = {sword:'⚔️', pistol:'🔫', mg:'💥', bow:'🏹', longbow:'🎯', axe:'🪓'};

class Sword extends Weapon {
  constructor(){ super('sword'); const m = spawn('sword', {height:1.05}); this.obj.add(m.root); this.combo = 0; this.t = 0; this.cur = null; this.queued = false; this.guard = false; this.guardAt = 0; this.trail = null; }
  trig(){ return {L:TRG.feedback(2, 7), R:TRG.off()}; }                // L2 guard feels like pushing against a shield
  update(dt){
    const P = C.player, wasG = this.guard; this.guard = IN.l2 > 0.4 && !this.cur;
    if(this.guard && !wasG){ this.guardAt = performance.now(); H.pulse(160, 0.6, 0.04); SND.tone({f:900, dur:0.05, gain:0.06, type:'triangle', pad:true}); }
    P.speedMul = this.guard ? 0.45 : (this.cur ? 0.35 : 1);
    if(this.guard){ const f = Cam.fwd(); P.faceLock = Math.atan2(f[0], f[1]); } else if(!this.cur) P.faceLock = null;
    if(IN.pressed('attack')){ if(!this.cur) this.start(0); else if(this.t > this.cur.dur*0.45) this.queued = true; }
    if(this.cur){
      this.t += dt; const s = this.cur, k = clamp(this.t/s.dur, 0, 1);
      if(this.t >= s.active[0] && this.t <= s.active[1]) this.hitScan(s);
      const e = Math.sin(k*Math.PI);                                   // swing pose
      this.swing.set(s.ax*e, s.ay*(k - 0.5)*2, s.az*e);
      if(this.trail){ this.trail.material.opacity = Math.max(0, 0.55*(1 - k)); }
      if(this.t >= s.dur){ if(this.queued && this.combo < 2){ this.start(this.combo + 1); } else { this.cur = null; this.combo = 0; P.faceLock = null; this.swing.set(0, 0, 0); } }
    }
    this.holdRot.set(this.guard ? -0.2 : 0.9, 0, this.guard ? 1.45 : 0.15);
  }
  start(i){
    const S = [{dur:0.32, active:[0.07, 0.19], dmg:1, arc:-1, ax:0.6, ay:1.6, az:0.3, range:2.5, ang:1.1},
               {dur:0.32, active:[0.07, 0.19], dmg:1, arc:1, ax:0.6, ay:-1.6, az:-0.3, range:2.5, ang:1.1},
               {dur:0.5, active:[0.14, 0.28], dmg:2, arc:0, ax:-2.2, ay:0, az:0, range:2.9, ang:0.8}][i];
    this.cur = S; this.combo = i; this.t = 0; this.queued = false; this.hitSet = new Set();
    const P = C.player; let tgt = null, bd = 4.5;                       // soft lock to the nearest enemy in front
    for(const e of C.ents){ if(!e.alive || e.type === 'target') continue; const d = Math.hypot(e.pos.x - P.p.x, e.pos.z - P.p.z); if(d < bd){ bd = d; tgt = e; } }
    if(tgt){ P.faceLock = Math.atan2(tgt.pos.x - P.p.x, tgt.pos.z - P.p.z); if(bd > 2.2) P.dash(tgt.pos.x - P.p.x, tgt.pos.z - P.p.z, 8, 0.12); }
    else if(P.input && Math.hypot(P.input.x, P.input.z) > 0.2) P.faceLock = Math.atan2(P.input.x, P.input.z);
    P.setAnim('punch', {restart:true, speed:i === 2 ? 1.4 : 2.1}); P.animHold = S.dur;
    // swish: the haptic sweeps across your hands in the direction of the blade
    SND.noise({f:i === 2 ? 500 : 900, fEnd:i === 2 ? 1600 : 3200, q:1.4, dur:S.dur*0.7, att:0.04, gain:0.22});
    for(let j = 0; j < 6; j++){ const p = S.arc === 0 ? 0 : S.arc*(-1 + j*0.4); H.pulse(i === 2 ? 70 + j*8 : 120 + j*18, 0.35 + j*0.05, 0.04, p, 0.02 + j*0.025); }
    if(i === 2) H.pulse(45, 0.8, 0.15, 0, 0.12);
    this.makeTrail(S);
  }
  makeTrail(S){
    if(this.trail) C.root.remove(this.trail);
    // ring arc centred on +X; horizontal swings lie flat, the overhead chop stands up. rotation.y = face - 90 deg turns +X to the facing.
    const P = C.player, geo = new THREE.RingGeometry(0.6, S.range, 24, 1, -S.ang, S.ang*2); if(S.arc !== 0) geo.rotateX(-Math.PI/2);
    this.trail = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color:S.arc === 0 ? 0xffe9a0 : 0xbfe6ff, transparent:true, opacity:0.55, side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending}));
    this.trail.position.copy(P.p).setY(P.p.y + (S.arc === 0 ? 0.6 : 0.95));
    this.trail.rotation.y = (P.faceLock ?? P.face) - Math.PI/2;
    C.root.add(this.trail); const tr = this.trail; later(S.dur*1000 + 60, () => { if(this.trail === tr){ C.root.remove(tr); this.trail = null; } });
  }
  hitScan(S){
    const P = C.player;
    for(const e of C.ents){ if(!e.alive || this.hitSet.has(e)) continue;
      const dx = e.pos.x - P.p.x, dz = e.pos.z - P.p.z, d = Math.hypot(dx, dz); if(d > S.range + e.r) continue; if(Math.abs(e.pos.y + e.h - (P.p.y + 1)) > 1.8 + e.h) continue;
      let df = Math.atan2(dx, dz) - P.face; df = Math.atan2(Math.sin(df), Math.cos(df)); if(Math.abs(df) > S.ang + 0.25) continue;
      this.hitSet.add(e); const pan = panAt(e.pos), heavy = S.dmg > 1;
      if(e.type === 'target' || e.armored){ Hit.clang(pan, heavy ? 1.3 : 1); } else { Hit.clang(pan, heavy ? 1.1 : 0.75); Hit.flesh(pan, 0.6); }
      Time.stop(heavy ? 90 : 55); Cam.shake(heavy ? 0.14 : 0.07); Light.flash([255, 240, 200], 90);
      FX.burst(e.pos.clone().setY(e.pos.y + e.h), {n:heavy ? 18 : 10, color:0xfff1c0, size:0.06, up:2, speed:5, life:0.35, gravity:3});
      e.damage(S.dmg, new THREE.Vector3(dx/d, 0, dz/d), 'sword');
    }
  }
  unequip(){ this.cur = null; this.guard = false; C.player.speedMul = 1; C.player.faceLock = null; }
}

class Gun extends Weapon {   // pistol + machine gun
  constructor(id){ super(id); this.mg = id === 'mg'; const m = spawn(this.mg ? 'repeater' : 'blaster', {height:this.mg ? 0.42 : 0.36}); m.root.rotation.y = Math.PI; this.obj.add(m.root);
    this.mag = this.mg ? 999 : 8; this.ammo = this.mag; this.reload = 0; this.armed = true; this.rate = 0; this.heat = 0; this.over = 0; this.flash = new THREE.PointLight(0xffd27a, 0, 6); this.obj.add(this.flash); this.spread = 0; }
  trig(){ if(this.mg) return {L:TRG.feedback(1, 2), R:this.over > 0 ? TRG.feedback(0, 8) : TRG.vibration(2, 6, 26)};
    return {L:TRG.feedback(1, 2), R:this.reload > 0 ? TRG.off() : TRG.weapon(4, 6, 8)}; }    // pistol: break-point "click"
  update(dt){
    this.flash.intensity = Math.max(0, this.flash.intensity - dt*60); this.holdRot.set(0, 0, 0); this.swing.x = damp(this.swing.x, 0, 14, dt);
    if(this.reload > 0){ this.reload -= dt; if(this.reload <= 0){ this.ammo = this.mag; C.arsenal.refreshTrig(); SND.tone({f:900, dur:0.04, gain:0.07, type:'square', pad:true}); H.pulse(500, 0.8, 0.02); H.pulse(140, 0.9, 0.05, 0, 0.03); C.arsenal.hudUpd(); } return; }
    if(this.mg){
      this.over = Math.max(0, this.over - dt); if(this.over <= 0 && this.wasOver){ this.wasOver = false; C.arsenal.refreshTrig(); }
      this.heat = Math.max(0, this.heat - dt*(IN.r2 > 0.35 ? 0.15 : 0.5));
      if(this.over > 0){ this.hiss = (this.hiss || 0) + dt; if(this.hiss > 0.12){ this.hiss = 0; H.noise({f:rnd(150, 260), dur:0.1, gain:0.25}); SND.noise({type:'highpass', f:4000, dur:0.12, gain:0.08, pad:true}); } return; }
      this.rate -= dt;
      if(IN.r2 > 0.35 && this.rate <= 0){ this.rate = 1/11; this.fire(); this.heat += 0.055; if(this.heat >= 1){ this.over = 1.8; this.wasOver = true; this.heat = 0.6; C.arsenal.refreshTrig(); SND.noise({type:'highpass', f:3000, dur:0.8, gain:0.12}); UI.toast(t('overheat'), 900); } }
      this.spread = IN.r2 > 0.35 ? Math.min(0.06, this.spread + dt*0.05) : Math.max(0, this.spread - dt*0.2);
      C.arsenal.hudUpd();
    } else {
      if(IN.r2 < 0.3) this.armed = true;
      if(this.armed && IN.r2 > 0.62){ this.armed = false; if(this.ammo > 0){ this.fire(); this.ammo--; C.arsenal.hudUpd(); if(this.ammo === 0) this.startReload(); } else this.startReload(); }
      if(IN.pressed('r1') && this.ammo < this.mag) this.startReload();
    }
  }
  startReload(){ if(this.reload > 0) return; this.reload = 1.1; C.arsenal.refreshTrig(); SND.tone({f:500, dur:0.05, gain:0.07, type:'square', pad:true}); SND.noise({pad:true, type:'highpass', f:3000, dur:0.06, gain:0.08}); H.pulse(380, 0.7, 0.02); later(500, () => { SND.tone({f:700, dur:0.04, gain:0.07, type:'square', pad:true}); H.pulse(300, 0.6, 0.02); }); }
  fire(){
    const A = C.arsenal, from = A.handPos(), dir = A.aimDir(from, this.spread + (C.aiming ? 0 : 0.012));
    const ray = new THREE.Ray(from, dir), hit = C.raycast(ray, 90), end = hit ? hit.point : from.clone().addScaledVector(dir, 60);
    const len = from.distanceTo(end), tr = new Proj({kind:'tracer', pos:from.clone().lerp(end, 0.5), vel:v3(), life:0.08, team:'none'}); tr.mesh.scale.set(1, len, 1); tr.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); C.projs.push(tr);
    this.flash.intensity = 6; this.swing.x = -0.35; C.stats.shots++;
    if(this.mg){ SND.play('repeater', {rate:rnd(0.95, 1.08), gain:0.45}); H.pulse(260, 0.7, 0.025, (C.stats.shots % 2 ? -0.4 : 0.4)); H.pulse(80, 1.1, 0.06); Cam.shake(0.025); Cam.pitch = clamp(Cam.pitch - 0.004, Cam.minPitch, Cam.maxPitch); }
    else { SND.play('blaster', {rate:rnd(0.95, 1.05), gain:0.8}); SND.noise({type:'highpass', f:2500, dur:0.08, gain:0.25}); H.pulse(330, 1.3, 0.03); H.pulse(52, 1.6, 0.25); H.pulse(130, 1.0, 0.1); Cam.shake(0.07); Cam.pitch = clamp(Cam.pitch - 0.02, Cam.minPitch, Cam.maxPitch); Light.flash([255, 200, 120], 70); }
    if(hit){ const e = hit.e, pan = panAt(e.pos); if(e.type === 'target') Hit.thunk(pan, 0.5); else Hit.flesh(pan, 0.6); H.pulse(600, 0.5, 0.015, pan, 0.03);
      FX.burst(hit.point, {n:6, color:0xffe2a0, size:0.04, up:1.5, speed:3, life:0.25}); e.damage(this.mg ? 1 : 2, dir.clone().setY(0).normalize(), 'bullet', {point:hit.point, dir}); }
  }
  hud(){ return this.mg ? `<i class="heat" style="width:${(this.heat*100).toFixed(0)}%;background:${this.over > 0 ? '#ff5566' : ''}"></i>` : (this.reload > 0 ? '…' : `${this.ammo}/${this.mag}`); }
}

class Bow extends Weapon {
  constructor(id){ super(id); this.long = id === 'longbow'; this.mdl = procModel(id); this.obj.add(this.mdl); this.draw = 0; this.peak = 0; this.creak = 0; this.trem = 0; this.cool = 0; }
  trig(){ return {L:TRG.feedback(1, 2), R:this.long ? TRG.ramp(0, 3, 8) : TRG.ramp(1, 1, 8)}; }    // the string gets heavier the further you pull
  update(dt){
    const r = IN.r2; this.cool -= dt;
    const target = this.cool > 0 ? 0 : r; this.draw = damp(this.draw, target, target > this.draw ? 7 : 30, dt);
    if(this.draw > this.peak) this.peak = this.draw;
    const k = this.draw;
    if(k > 0.08){ C.forceAim = true; this.creak += dt; const per = (this.long ? 0.17 : 0.2) - 0.11*k;
      if(this.creak > per){ this.creak = 0; H.pulse((this.long ? 46 : 60) + k*55 + rnd(-6, 6), 0.12 + (this.long ? 0.6 : 0.45)*k*k, 0.08, rnd(-0.4, 0.4)); if(Math.random() < 0.45) SND.noise({f:rnd(300, 700), q:4, dur:0.06, gain:0.08*k, pad:true}); } }
    else C.forceAim = false;
    if(k > 0.93){ this.trem += dt; if(this.trem > 0.032){ this.trem = 0; H.pulse(30 + rnd(0, 6), 0.45, 0.035, (Math.random() < 0.5 ? -1 : 1)*0.45); } }
    if(this.peak > 0.35 && r < this.peak - 0.28){ this.shoot(this.peak); this.peak = 0; this.draw = 0; this.cool = 0.35; }
    if(r < 0.05) this.peak = Math.min(this.peak, 0.05);
    const U = this.mdl.userData, L = U.L, nock = new THREE.Vector3(0, 0, -k*0.5);
    [[new THREE.Vector3(0, L, 0), U.str[0]], [new THREE.Vector3(0, -L, 0), U.str[1]]].forEach(([tip, m]) => { m.position.copy(tip).lerp(nock, 0.5); m.scale.y = tip.distanceTo(nock); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nock.clone().sub(tip).normalize()); });
    U.arrow.visible = k > 0.05 && this.cool <= 0; U.arrow.position.set(0, 0, nock.z + 0.45); U.arrow.rotation.set(0, 0, 0);
    this.holdRot.set(0, 0, 0);
  }
  shoot(k){
    const A = C.arsenal, from = A.handPos(), dir = A.aimDir(from, (1 - k)*0.02), sp = (this.long ? 26 : 18) + (this.long ? 48 : 34)*k;
    C.projs.push(new Proj({kind:'arrow', pos:from, vel:dir.multiplyScalar(sp), grav:this.long ? 4.5 : 7, team:'player', dmg:Math.round((this.long ? 2 : 1) + (this.long ? 4 : 2)*k), r:0.12, life:5, power:k}));
    C.stats.shots++; const kk = 0.6 + 0.5*k;
    SND.tone({f:this.long ? 150 : 220, fEnd:this.long ? 70 : 110, dur:0.4, gain:0.18, type:'triangle'}); SND.noise({f:800, fEnd:2500, q:1, dur:0.35, gain:0.18*k});
    H.pulse(360, 1.4, 0.03); H.pulse(this.long ? 38 : 50, (this.long ? 1.6 : 1.3)*kk, this.long ? 0.55 : 0.35); H.pulse(95, 1.2*kk, 0.2, 0, 0.025);
    for(let i = 0; i < (this.long ? 10 : 6); i++) H.pulse(150 - i*6, 0.9*kk*Math.pow(0.72, i), 0.045, i % 2 ? -0.75 : 0.75, 0.07 + i*0.046);
    Cam.shake(this.long ? 0.12*k : 0.05*k); Light.flash([255, 210, 140], 120);
    DS.out.trigR = TRG.vibration(0, 8, 70); later(170, () => C.arsenal && C.arsenal.refreshTrig());
  }
  unequip(){ C.forceAim = false; }
}

class Axe extends Weapon {
  constructor(){ super('axe'); this.mdl = procModel('axe'); this.obj.add(this.mdl); this.st = 'hand'; this.fly = null; this.armed = true; this.chop = 0; }
  trig(){ return {L:this.st === 'recall' ? TRG.vibration(0, 4, 40) : TRG.feedback(1, 2), R:this.st === 'hand' ? TRG.weapon(3, 5, 7) : TRG.off()}; }
  update(dt){
    const P = C.player;
    if(IN.r2 < 0.3) this.armed = true;
    if(this.st === 'hand'){
      this.obj.visible = true;
      if(this.armed && IN.r2 > 0.7){ this.armed = false; this.throw(); }
      if(IN.pressed('attack') && this.chop <= 0) this.melee();
      this.chop -= dt; const k = clamp(this.chop/0.4, 0, 1); this.swing.set(-Math.sin(k*Math.PI)*2, 0, 0); this.holdRot.set(0.5, 0, 0);
      return;
    }
    this.obj.visible = false; const f = this.fly; f.t += dt; f.spin += dt*(this.st === 'stuck' ? 0 : 28);
    if(this.st === 'out'){
      const step = f.dir.clone().multiplyScalar(38*dt); f.pos.add(step); f.dist += step.length(); f.tk += dt;
      if(f.tk > 0.034){ f.tk = 0; H.pulse(75 + 30*Math.sin(f.t*20), 0.5 - 0.2*clamp(f.t/0.6, 0, 1), 0.05, Math.sin(f.spin*0.5)*0.9); }
      for(const e of C.ents){ if(!e.alive || f.hit.has(e)) continue; const c = e.pos.clone(); c.y += e.h; if(c.distanceTo(f.pos) < e.r + 0.45){ f.hit.add(e); this.impact(e); if(this.st !== 'out') break; } }
      const gh = C.world.groundAt(f.pos.x, f.pos.z, f.pos.y + 0.5).h;
      if(this.st === 'out' && (f.dist > 26 || f.pos.y < gh + 0.1)){ if(f.pos.y < gh + 0.1) f.pos.y = gh + 0.3; this.stick(null); }
    } else if(this.st === 'stuck'){
      f.tk += dt; if(f.tk > 0.13){ f.tk = 0; H.pulse(175, 0.1, 0.07, rnd(-0.3, 0.3)); }
      if(f.on && f.on.alive) f.pos.copy(f.on.pos).setY(f.on.pos.y + f.on.h);
      if(IN.b.interact){ this.st = 'recall'; f.t = 0; f.from = f.pos.clone(); f.hit = new Set(); f.dur = clamp(f.from.distanceTo(P.p)/28, 0.45, 1.0); C.arsenal.refreshTrig(); SND.noise({f:200, fEnd:900, q:0.8, dur:f.dur, att:f.dur*0.8, gain:0.18}); }
    } else if(this.st === 'recall'){
      if(!IN.b.interact && f.t < f.dur*0.5){ this.st = 'stuck'; C.arsenal.refreshTrig(); }
      const u = clamp(f.t/f.dur, 0, 1), e2 = u*u, hand = C.arsenal.handPos(), side = new THREE.Vector3(Math.cos(Cam.yaw), 0, -Math.sin(Cam.yaw)).multiplyScalar(f.from.distanceTo(hand)*0.25);
      const mid = f.from.clone().lerp(hand, 0.5).add(side).setY(Math.max(f.from.y, hand.y) + 1.5);
      f.pos.copy(f.from).multiplyScalar((1 - e2)*(1 - e2)).addScaledVector(mid, 2*(1 - e2)*e2).addScaledVector(hand, e2*e2);   // quadratic bezier
      f.tk += dt; if(f.tk > 0.045){ f.tk = 0; H.pulse(55 + 150*u*u, 0.18 + 0.85*u*u, 0.06, panAt(f.pos)); }
      for(const e of C.ents){ if(!e.alive || f.hit.has(e)) continue; const c = e.pos.clone(); c.y += e.h; if(c.distanceTo(f.pos) < e.r + 0.55){ f.hit.add(e); Hit.clang(panAt(e.pos), 0.9); e.damage(2, f.pos.clone().sub(f.from).setY(0).normalize(), 'axe'); Time.stop(40); if(e.type !== 'pillar') C.stats.multi = Math.max(C.stats.multi || 0, [...f.hit].filter(x => x.type !== 'pillar').length); } }
      if(u >= 1) this.caught();
    }
    f.mesh.position.copy(f.pos); f.mesh.rotation.set(f.spin, f.yaw, this.st === 'stuck' ? 0.4 : 0, 'YXZ');
  }
  throw(){
    const A = C.arsenal, from = A.handPos(), dir = A.aimDir(from, 0);
    const mesh = procModel('axe'); C.root.add(mesh);
    this.fly = {pos:from.clone(), dir, dist:0, t:0, tk:0, spin:0, hit:new Set(), mesh, yaw:Math.atan2(dir.x, dir.z)}; this.st = 'out'; C.arsenal.refreshTrig(); C.stats.shots++;
    H.pulse(280, 1.1, 0.03); H.pulse(70, 1.3, 0.18); H.pulse(500, 0.5, 0.05, 0.3, 0.04); SND.noise({f:400, fEnd:1800, q:1, dur:0.35, gain:0.25}); SND.tone({f:180, fEnd:90, dur:0.2, gain:0.1});
    C.player.setAnim('punch', {restart:true, speed:2}); C.player.animHold = 0.3;
  }
  impact(e){
    const pan = panAt(e.pos); Hit.clang(pan, 1.2); H.pulse(38, 1.7, 0.4, pan*0.5); H.pulse(120, 1.3, 0.14, pan, 0.03); Cam.shake(0.12); Time.stop(70);
    e.damage(e.type === 'pillar' ? 1 : 3, this.fly.dir.clone().setY(0).normalize(), 'axe');
    if(e.alive || e.type === 'pillar') this.stick(e); else { /* keeps flying through */ }
  }
  stick(e){ this.st = 'stuck'; this.fly.t = 0; this.fly.on = e; SND.play('heavy', {rate:1.4, gain:0.5}); const pan = panAt(this.fly.pos); H.pulse(380, 1.2, 0.03, pan); H.pulse(45, 1.2, 0.3, pan*0.5); [60, 120, 190].forEach((d, i) => H.pulse(210, 0.6/(i + 1), 0.05, i % 2 ? -0.5 : 0.5, d/1000)); C.arsenal.refreshTrig(); }
  caught(){ C.root.remove(this.fly.mesh); this.fly = null; this.st = 'hand'; C.arsenal.refreshTrig(); H.pulse(300, 1.4, 0.04); H.pulse(55, 1.7, 0.3); H.pulse(75, 1.0, 0.16, 0, 0.085); SND.play('heavy', {rate:1.6, gain:0.9, pad:true}); Light.flash([180, 230, 255], 250); Cam.shake(0.08); }
  melee(){
    this.chop = 0.4; const P = C.player; SND.noise({f:400, fEnd:1500, q:1.2, dur:0.25, gain:0.2}); for(let j = 0; j < 4; j++) H.pulse(70 + j*10, 0.5, 0.04, 0, j*0.03);
    P.setAnim('punch', {restart:true, speed:1.6}); P.animHold = 0.4;
    later(150, () => { for(const e of C.ents){ if(!e.alive) continue; const dx = e.pos.x - P.p.x, dz = e.pos.z - P.p.z, d = Math.hypot(dx, dz); let df = Math.atan2(dx, dz) - P.face; df = Math.atan2(Math.sin(df), Math.cos(df));
      if(d < 2.6 + e.r && Math.abs(df) < 1.0){ Hit.clang(panAt(e.pos), 1.2); Time.stop(80); Cam.shake(0.12); e.damage(2, new THREE.Vector3(dx/d, 0, dz/d), 'axe'); } } });
  }
  unequip(){ if(this.fly){ C.root.remove(this.fly.mesh); this.fly = null; } this.st = 'hand'; }
  hud(){ return this.st === 'hand' ? '' : `${UI.glyph('interact')}`; }
}

const MAKERS = {sword:() => new Sword(), pistol:() => new Gun('pistol'), mg:() => new Gun('mg'), bow:() => new Bow('bow'), longbow:() => new Bow('longbow'), axe:() => new Axe()};

// ---------------------------------------------------------------- arsenal: weapon switching, aiming, hand attachment
class Arsenal {
  constructor(ids){
    this.list = ids.map(id => MAKERS[id]()); this.i = 0; this.cur = null; this.hand = null; this.holder = new THREE.Group(); C.root.add(this.holder);
    this.list.forEach(w => { w.obj.visible = false; this.holder.add(w.obj); });
    C.player.m.ready.then(() => { C.player.m.root.traverse(n => { if(!this.hand && (n.name === 'Palm2R' || /hand.?r$|palm.*r$/i.test(n.name))) this.hand = n; }); });
    this.buildHud(); if(this.list.length) this.select(0, true);
  }
  buildHud(){ $('hWeap').innerHTML = this.list.map((w, i) => `<div class="wslot" data-i="${i}"><span>${ICON[w.id]}</span><b>${t('w_' + w.id)}</b><em></em></div>`).join('') + (this.list.length > 1 ? `<div class="whint"><span class="key">◀</span><span class="key">▶</span></div>` : ''); }
  hudUpd(){ document.querySelectorAll('#hWeap .wslot').forEach((el, i) => { el.classList.toggle('on', i === this.i); el.querySelector('em').innerHTML = this.list[i].hud(); }); }
  select(i, quiet){
    if(this.cur){ this.cur.unequip(); this.cur.obj.visible = false; }
    this.i = (i + this.list.length) % this.list.length; this.cur = this.list[this.i]; this.cur.obj.visible = true; this.cur.equip(); this.refreshTrig(); this.hudUpd();
    if(!quiet){ SND.play('swap', {gain:0.7, pad:true}); H.play(SND.hapOf('swap', 0), 1, 1.0); H.pulse(500, 0.7, 0.02); H.pulse(220, 0.7, 0.04, 0, 0.05); UI.toast(`${ICON[this.cur.id]} ${t('w_' + this.cur.id)}`, 700); }
  }
  refreshTrig(){ if(!this.cur) return; const tr = this.cur.trig(); DS.out.trigL = tr.L; DS.out.trigR = tr.R; }
  handPos(out = v3()){ if(this.hand){ this.hand.getWorldPosition(out); return out; } const P = C.player; return out.set(P.p.x + Math.cos(P.face)*0.35 + Math.sin(P.face)*0.35, P.p.y + 1.05, P.p.z - Math.sin(P.face)*0.35 + Math.cos(P.face)*0.35); }
  // direction from `from` toward what the camera centre looks at, with optional random spread and soft aim assist
  aimDir(from, spread){
    const cam = E.camera, d = new THREE.Vector3(); cam.getWorldDirection(d); const ray = new THREE.Ray(cam.position.clone().addScaledVector(d, Cam.distCur*0.9), d);
    let target = ray.at(60, v3()); const hit = C.raycast(ray, 90); if(hit) target = hit.point;
    else { let best = null, bs = 0.06; for(const e of C.ents){ if(!e.alive) continue; const c = e.pos.clone(); c.y += e.h; const to = c.clone().sub(cam.position).normalize(), s = 1 - to.dot(d); if(s < bs && c.distanceTo(cam.position) < 45){ bs = s; best = c; } } if(best) target = best; }
    const dir = target.sub(from).normalize(); if(spread){ dir.x += rnd(-spread, spread); dir.y += rnd(-spread, spread)*0.6; dir.z += rnd(-spread, spread); dir.normalize(); } return dir;
  }
  update(dt){
    const P = C.player;
    if(this.list.length > 1){ if(IN.pressed('wnext')) this.select(this.i + 1); if(IN.pressed('wprev')) this.select(this.i - 1); }
    const ranged = this.cur && this.cur.id !== 'sword';
    C.aiming = ranged && (IN.l2 > 0.3 || C.forceAim);
    Cam.side = C.aiming ? 1.15 : 0; Cam.dist = C.aiming ? 3.6 : C.camDist; Cam.fov = C.aiming ? (this.cur.id === 'longbow' ? 36 : 42) : 50;
    if(ranged){ if(C.aiming){ const f = Cam.fwd(); P.faceLock = Math.atan2(f[0], f[1]); P.speedMul = 0.5; } else { P.faceLock = null; P.speedMul = 1; } }
    // gyro aim: turn/tilt the controller for fine aiming
    if(C.aiming && DS.connected && Save.get('gyro', true)){ const g = DS.s.gyro, dz = v => Math.abs(v) < 1.2 ? 0 : v;
      Cam.yaw += dz(g[1])*DEG*dt*1.1; Cam.pitch = clamp(Cam.pitch - dz(g[0])*DEG*dt*1.1*(IN.invertY ? -1 : 1), Cam.minPitch, Cam.maxPitch); }
    $('hRet').style.display = C.aiming ? '' : 'none';
    if(this.cur) this.cur.update(dt);
    // weapon follows the right hand; orientation follows the body + weapon pose
    if(this.cur){ const o = this.cur.obj; this.handPos(o.position); o.rotation.set(0, P.m.root.rotation.y, 0, 'YXZ');
      if(C.aiming && ranged){ const d = new THREE.Vector3(); E.camera.getWorldDirection(d); o.rotation.set(-Math.asin(clamp(d.y, -1, 1)), Math.atan2(d.x, d.z), this.cur.id.includes('bow') ? -0.25 : 0, 'YXZ'); }
      o.rotateX(this.cur.holdRot.x + this.cur.swing.x); o.rotateY(this.cur.swing.y); o.rotateZ(this.cur.holdRot.z + this.cur.swing.z); }
    this.hudUpd();
  }
  dispose(){ this.list.forEach(w => w.unequip()); C.root.remove(this.holder); }
}

// ---------------------------------------------------------------- shooting targets (boards on posts)
let boardTex = null;
function targetTexture(){ if(boardTex) return boardTex; const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  ['#ffffff', '#e8413c', '#ffffff', '#e8413c', '#ffd25e'].forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(128, 128, 124 - i*25, 0, 7); g.fill(); }); boardTex = new THREE.CanvasTexture(c); boardTex.colorSpace = THREE.SRGBColorSpace; return boardTex; }
export class Target {
  constructor(x, z, o = {}){
    this.type = 'target'; this.alive = true; this.gone = false; this.hp = o.hp || 1; this.r = o.size || 0.7; this.h = o.y ?? 1.5; this.o = o; this.hitBy = new Set();
    const g = C.world.groundAt(x, z).h; this.pos = new THREE.Vector3(x, g, z); this.base = this.pos.clone(); this.t = Math.random()*6; this.up = 0; this.popT = o.delay || 0;
    this.g = new THREE.Group(); this.g.position.copy(this.pos); C.root.add(this.g);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, this.h, 8), new THREE.MeshStandardMaterial({color:0x6b4426})); post.position.y = this.h/2; post.castShadow = true;
    this.board = new THREE.Mesh(new THREE.CylinderGeometry(this.r, this.r, 0.08, 32), [new THREE.MeshStandardMaterial({color:0x8a5a32}), new THREE.MeshStandardMaterial({map:targetTexture()}), new THREE.MeshStandardMaterial({map:targetTexture()})]);
    this.board.rotation.x = Math.PI/2; this.board.position.y = this.h; this.board.castShadow = true;
    this.pivot = new THREE.Group(); this.pivot.add(post, this.board); this.g.add(this.pivot); this.pivot.rotation.x = o.hidden ? -Math.PI/2 : 0; this.up = o.hidden ? 0 : 1;
    this.face = o.face ?? 0;
  }
  damage(dmg, dir, kind, info){
    if(!this.alive || this.up < 0.9) return;
    // score by distance from the bullseye in the board plane
    let ring = 0; const p = info && info.point; if(p){ const c = this.pos.clone(); c.y += this.h; const n = new THREE.Vector3(Math.sin(this.g.rotation.y), 0, Math.cos(this.g.rotation.y)); const off = p.clone().sub(c); off.addScaledVector(n, -off.dot(n)); ring = off.length()/this.r; }
    const bull = p && ring < 0.22;
    this.alive = false; C.stats.hits++; if(bull) C.stats.bulls++; hitMarker(true);
    const pan = panAt(this.pos); Hit.thunk(pan, bull ? 1.3 : 0.9); if(bull){ SND.notes([1319, 1760], 0.05, {gain:0.08, type:'triangle'}); H.pulse(900, 0.9, 0.02, pan, 0.05); UI.toast(t('bullseye'), 600); }
    FX.burst(this.pos.clone().setY(this.pos.y + this.h), {n:bull ? 22 : 12, color:bull ? 0xffd25e : 0xc89a6a, size:0.07, up:2.5, speed:3, life:0.6});
    this.fall = 0; C.onKill && C.onKill(this, {bull, kind});
  }
  update(dt){
    this.t += dt;
    if(this.popT > 0){ this.popT -= dt; if(this.popT <= 0 && this.o.hidden){ this.raising = true; SND.tone({f:300, fEnd:600, dur:0.12, gain:0.05}); H.pulse(140, 0.35, 0.05, panAt(this.pos)); } }
    if(this.raising){ this.up = Math.min(1, this.up + dt*5); this.pivot.rotation.x = -(1 - this.up)*Math.PI/2; if(this.up >= 1) this.raising = false; }
    if(this.o.move){ const m = this.o.move; this.pos.x = this.base.x + Math.sin(this.t*m.sp)*m.ax; this.pos.z = this.base.z + Math.sin(this.t*m.sp)*(m.az || 0); this.g.position.copy(this.pos); }
    this.g.rotation.y = this.face;
    if(!this.alive){ this.fall += dt*6; this.pivot.rotation.x = -Math.min(1, this.fall)*Math.PI/2; if(this.fall > 4){ C.root.remove(this.g); this.gone = true; } }
    if(this.o.life){ this.o.life -= dt; if(this.o.life <= 0 && this.alive){ this.alive = false; this.fall = 0; this.expired = true; } }
  }
}

// breakable pillar (ice canyon)
export class Pillar {
  constructor(x, z, o = {}){
    this.type = 'pillar'; this.alive = true; this.gone = false; this.hp = o.hp || 1; this.r = 0.9; this.h = 1.6; this.armored = true;
    const g = C.world.groundAt(x, z).h; this.pos = new THREE.Vector3(x, g, z);
    this.mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 3.4, 7), new THREE.MeshStandardMaterial({color:0xbfe8ff, roughness:0.15, metalness:0.1, transparent:true, opacity:0.85, emissive:0x2a5a7a}));
    this.mesh.position.set(x, g + 1.7, z); this.mesh.castShadow = true; C.root.add(this.mesh); this.col = C.world.collider(x, z, 0.9);
  }
  damage(dmg){ if(!this.alive) return; this.hp -= dmg; this.mesh.material.emissive.set(0x80d0ff); setTimeout(() => this.mesh.material.emissive.set(0x2a5a7a), 80);
    if(this.hp <= 0){ this.alive = false; const pan = panAt(this.pos); SND.play('break', {rate:0.8, gain:1, pan:pan*0.5}); H.play(SND.hapOf('break', 0), 0.8, 2.0, pan); SND.noise({type:'highpass', f:3000, dur:0.5, gain:0.25});
      for(let i = 0; i < 6; i++) H.pulse(rnd(250, 600), 0.5, 0.02, rnd(-1, 1), 0.03 + i*0.04); FX.burst(this.pos.clone().setY(this.pos.y + 1.5), {n:40, color:0xcff0ff, size:0.12, up:5, speed:5, life:1.2});
      C.root.remove(this.mesh); this.col.r = 0; this.gone = true; C.stats.kills++; C.onKill && C.onKill(this); } }
  update(){}
}
