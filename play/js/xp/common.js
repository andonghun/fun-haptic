// Shared bits for the experiences: outdoor set, shooting-range targets, gunshot sounds, casings.
import * as THREE from 'three';
import { E, FX } from '../engine.js';
import { spawn } from '../assets.js';
import { surfaceMaterial } from '../textures.js';
import { SND } from '../sound.js';
import { H } from '../haptics.js';
import { FP } from '../fp.js';

export const rnd = (a, b) => a + Math.random()*(b - a);
export const later = (ms, f) => setTimeout(f, ms);

export function ground(root, key, w, d, o = {}){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), surfaceMaterial(key, w, d, o.tile || 4)); m.rotation.x = -Math.PI/2; m.position.set(o.x || 0, o.y || 0, o.z || 0); m.receiveShadow = true; root.add(m); return m;
}
export function prop(root, k, x, y, z, o = {}){ const m = spawn(k, o); m.root.position.set(x, y, z); m.root.rotation.y = o.rot ?? Math.random()*6.28; root.add(m.root); return m; }
export function treeRing(root, n, r0, r1, o = {}){ for(let i = 0; i < n; i++){ const a = o.a0 != null ? o.a0 + Math.random()*(o.a1 - o.a0) : Math.random()*6.28, r = rnd(r0, r1); prop(root, 'tree', Math.cos(a)*r + (o.cx || 0), 0, Math.sin(a)*r + (o.cz || 0), {height:rnd(o.h0 || 4, o.h1 || 7), frost:o.frost}); } }

// ---------------------------------------------------------------- targets
let ringTex = null;
function ringTexture(){ if(ringTex) return ringTex; const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  ['#f4f1e8', '#e33b3b', '#f4f1e8', '#e33b3b', '#ffd25e'].forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(128, 128, 126 - i*25, 0, 7); g.fill(); });
  g.strokeStyle = '#0005'; g.lineWidth = 2; for(let i = 0; i < 5; i++){ g.beginPath(); g.arc(128, 128, 126 - i*25, 0, 7); g.stroke(); } ringTex = new THREE.CanvasTexture(c); ringTex.colorSpace = THREE.SRGBColorSpace; return ringTex; }

// kind: 'board' (paper ring target on a post), 'steel' (swinging metal plate — rings when hit), 'hay' (bale with a face; arrows stick)
export class Target {
  constructor(root, kind, x, z, o = {}){
    this.kind = kind; this.root = root; this.g = new THREE.Group(); this.g.position.set(x, 0, z); root.add(this.g); this.r = o.r || (kind === 'steel' ? 0.35 : 0.55); this.h = o.h ?? (kind === 'hay' ? 0.9 : 1.4);
    this.swing = 0; this.swingV = 0; this.base = new THREE.Vector3(x, 0, z); this.t = Math.random()*6; this.o = o; this.hits = 0;
    const wood = new THREE.MeshStandardMaterial({color:0x6b4426, roughness:0.85});
    if(kind === 'steel'){
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.07), wood); frame.position.y = this.h + this.r + 0.25; this.g.add(frame);
      [-0.52, 0.52].forEach(px => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, this.h + this.r + 0.25, 0.07), wood); leg.position.set(px, (this.h + this.r + 0.25)/2, 0); leg.castShadow = true; this.g.add(leg); });
      this.pivot = new THREE.Group(); this.pivot.position.y = this.h + this.r + 0.22; this.g.add(this.pivot);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4), new THREE.MeshStandardMaterial({color:0x333333})); chain.position.y = -0.1; this.pivot.add(chain);
      this.face = new THREE.Mesh(o.square ? new THREE.BoxGeometry(this.r*1.8, this.r*1.8, 0.03) : new THREE.CylinderGeometry(this.r, this.r, 0.03, 28), new THREE.MeshStandardMaterial({color:0xd8dde4, metalness:0.6, roughness:0.35}));
      if(!o.square) this.face.rotation.x = Math.PI/2; this.face.position.y = -0.22 - this.r; this.face.castShadow = true; this.pivot.add(this.face);
      this.center = () => this.face.getWorldPosition(new THREE.Vector3());
    } else if(kind === 'hay'){
      const bale = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 0.8), new THREE.MeshStandardMaterial({color:0xd8b45a, roughness:1})); bale.position.y = 0.5; bale.castShadow = true; bale.receiveShadow = true; this.g.add(bale);
      if(o.stack){ const b2 = bale.clone(); b2.position.y = 1.5; this.g.add(b2); this.h = 1.5; }
      this.face = new THREE.Mesh(new THREE.CircleGeometry(this.r, 32), new THREE.MeshStandardMaterial({map:ringTexture(), roughness:0.9})); this.face.position.set(0, this.h, 0.41); this.g.add(this.face);
      this.body = bale; this.center = () => this.face.getWorldPosition(new THREE.Vector3());
    } else {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, this.h, 0.08), wood); post.position.y = this.h/2; post.castShadow = true; this.g.add(post);
      this.pivot = new THREE.Group(); this.pivot.position.y = this.h; this.g.add(this.pivot);
      const back = new THREE.Mesh(new THREE.BoxGeometry(this.r*2.2, this.r*2.2, 0.04), new THREE.MeshStandardMaterial({color:0xc9a77a})); back.position.z = -0.03; this.pivot.add(back);
      this.face = new THREE.Mesh(new THREE.CircleGeometry(this.r, 32), new THREE.MeshStandardMaterial({map:ringTexture(), roughness:0.9})); this.pivot.add(this.face);
      this.center = () => this.face.getWorldPosition(new THREE.Vector3());
    }
    this.g.rotation.y = o.yaw ?? 0;
  }
  meshes(){ return [this.face, this.body].filter(Boolean); }
  // returns ring score 0..1 (1 = bullseye) for a world hit point
  ring(p){ const c = this.center(), d = p.clone().sub(c); const n = new THREE.Vector3(0, 0, 1).applyQuaternion(this.face.getWorldQuaternion(new THREE.Quaternion())); if(this.kind !== 'steel' || this.o.square) {} d.addScaledVector(n, -d.dot(n)); return Math.max(0, 1 - d.length()/this.r); }
  hit(p, power = 1){ this.hits++; this.swingV += (this.kind === 'steel' ? 9 : 4)*power; return this.ring(p); }
  update(dt){
    this.t += dt;
    if(this.o.move){ const m = this.o.move; this.g.position.x = this.base.x + Math.sin(this.t*m.sp)*m.ax; }
    if(this.pivot){ this.swingV += (-this.swing*(this.kind === 'steel' ? 30 : 60) - this.swingV*(this.kind === 'steel' ? 1.2 : 6))*dt; this.swing += this.swingV*dt; this.pivot.rotation.x = -this.swing*0.25; }
  }
}
export function raycastTargets(targets, extra = []){
  const r = FP.ray(), meshes = [], own = new Map();
  targets.forEach(tg => tg.meshes().forEach(m => { meshes.push(m); own.set(m, tg); }));
  const hits = r.intersectObjects(meshes.concat(extra), false); if(!hits.length) return {ray:r.ray, hit:null};
  return {ray:r.ray, hit:hits[0], target:own.get(hits[0].object)};
}

// ---------------------------------------------------------------- sounds
export const Sfx = {
  gunshot(big = false){
    SND.noise({type:'highpass', f:1500, dur:0.05, gain:big ? 0.8 : 0.9});
    SND.noise({type:'lowpass', f:big ? 700 : 1100, dur:big ? 0.32 : 0.22, gain:big ? 0.8 : 0.6});
    SND.tone({f:big ? 90 : 120, fEnd:40, dur:big ? 0.3 : 0.2, gain:big ? 0.7 : 0.5});
    SND.noise({type:'bandpass', f:420, q:0.4, dur:big ? 1.3 : 0.9, att:0.02, gain:0.14, t:0.03});   // range echo
  },
  casing(i = 0){ later(260 + i*30, () => { SND.tone({pad:true, f:rnd(3100, 3700), fEnd:2600, dur:0.1, gain:0.16, type:'triangle'}); later(110, () => SND.tone({pad:true, f:rnd(3300, 3900), dur:0.06, gain:0.07, type:'triangle'})); }); },
  clank(pan = 0, k = 1){ const i = SND.play('metal', {rate:rnd(0.85, 1.0), gain:0.9*k, pan}); H.play(SND.hapOf('metal', Math.max(0, i)), 0.9, 1.0*k, pan); SND.tone({f:rnd(900, 1300), dur:0.9, gain:0.08*k, pan}); },
  thunk(pan = 0, k = 1){ const i = SND.play('wood', {rate:0.75, gain:0.9*k, pan}); H.play(SND.hapOf('wood', Math.max(0, i)), 0.8, 1.2*k, pan); },
  dryClick(){ SND.tone({pad:true, f:1800, dur:0.03, gain:0.12, type:'square'}); H.pulse(500, 0.6, 0.015); }
};

// brass casing that flies out to the right and tumbles
export function ejectCasing(root){
  const c = E.camera, m = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.035, 8), new THREE.MeshStandardMaterial({color:0xd8a948, metalness:0.9, roughness:0.3}));
  const p = new THREE.Vector3(0.1, -0.06, -0.6).applyMatrix4(c.matrixWorld); m.position.copy(p); root.add(m);
  const v = new THREE.Vector3(rnd(1.2, 2), rnd(1.5, 2.4), rnd(-0.3, 0.3)).applyQuaternion(c.quaternion);
  let life = 1.2; const spin = rnd(10, 20);
  const step = () => { life -= 0.016; v.y -= 9.8*0.016; m.position.addScaledVector(v, 0.016); m.rotation.x += spin*0.016; m.rotation.z += spin*0.6*0.016;
    if(m.position.y < 0.02){ m.position.y = 0.02; v.y *= -0.3; v.x *= 0.6; v.z *= 0.6; }
    if(life > 0) requestAnimationFrame(step); else root.remove(m); };
  requestAnimationFrame(step);
}
