// Shared pieces for combat stages: arena builders, wave runner, torches.
import * as THREE from 'three';
import { spawn } from './assets.js';
import { C, Enemy } from './combat.js';
import { UI, $ } from './ui.js';
import { SND } from './sound.js';
import { H } from './haptics.js';
import { t } from './i18n.js';

const rnd = (a, b) => a + Math.random()*(b - a);

export function deco(w, k, x, z, o = {}){ const m = spawn(k, o); m.root.position.set(x, w.groundAt(x, z).h + (o.y || 0), z); m.root.rotation.y = o.rot ?? Math.random()*6.28; w.add(m.root); if(o.col) w.collider(x, z, o.col); return m; }

// flickering torch (light + flame)
export function torch(w, x, z, h = 2.2){
  const g = new THREE.Group(); g.position.set(x, w.groundAt(x, z).h, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, h, 8), new THREE.MeshStandardMaterial({color:0x3b2a1e})); pole.position.y = h/2; pole.castShadow = true; g.add(pole);
  const fl = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 10), new THREE.MeshBasicMaterial({color:0xffb347})); fl.position.y = h + 0.22; g.add(fl);
  const li = new THREE.PointLight(0xff9a40, 6, 9, 1.6); li.position.y = h + 0.3; g.add(li); w.add(g); w.collider(x, z, 0.2);
  const seed = Math.random()*10; w.onUpdate((dt, tt) => { const f = 0.75 + 0.25*Math.sin(tt*13 + seed) * Math.sin(tt*7.3 + seed*2); li.intensity = 5*f + 1; fl.scale.set(1, 0.8 + f*0.4, 1); });
  return g;
}

// ring of walls around a circular arena
export function ringWall(w, R, n, key = 'wall', o = {}){
  for(let i = 0; i < n; i++){ const a = i/n*Math.PI*2, x = Math.cos(a)*R, z = Math.sin(a)*R; if(o.gap && o.gap(a)) continue;
    const m = spawn(key, {height:o.height || 2.2}); m.root.position.set(x, w.groundAt(x, z).h, z); m.root.rotation.y = -a + Math.PI/2; m.root.scale.x = o.sx || 1.9; w.add(m.root); }
}

// Wave runner: each wave = {intro, spawn:[[type, n]], ...}. Calls onDone when the last wave is cleared.
export class Waves {
  constructor(defs, o = {}){ this.defs = defs; this.i = -1; this.left = 0; this.t = 1.2; this.o = o; this.done = false; this.active = []; }
  get total(){ return this.defs.length; }
  update(dt){
    if(this.done) return;
    this.active = this.active.filter(e => e.alive);
    if(this.i >= 0 && this.active.length === 0 && this.t <= 0 && !this.pendingSpawn){
      if(this.i + 1 >= this.defs.length){ this.done = true; this.o.onDone && this.o.onDone(); return; }
      this.t = 2.4; this.o.onCleared && this.o.onCleared(this.i);
    }
    if(this.t > 0){ this.t -= dt; if(this.t <= 0) this.next(); }
  }
  next(){
    this.i++; const d = this.defs[this.i]; if(!d) return;
    UI.toast((this.o.label ? this.o.label(this.i) + '\n' : '') + (d.intro || ''), d.introMs || 3200);
    SND.notes([392, 523, 659], 0.1, {gain:0.07, type:'triangle'}); H.pulse(80, 0.8, 0.15);
    this.o.onWave && this.o.onWave(this.i, d);
    this.pendingSpawn = true;
    setTimeout(() => {
      const P = C.player.p, list = [];
      d.spawn.forEach(([type, n, opt]) => { for(let k = 0; k < n; k++) list.push([type, opt]); });
      list.forEach(([type, opt], k) => {
        const a = (this.o.spawnAngle ? this.o.spawnAngle(k, list.length) : Math.random()*Math.PI*2), R = this.o.spawnR || rnd(10, 13);
        let x = Math.cos(a)*R, z = Math.sin(a)*R; if(Math.hypot(x - P.x, z - P.z) < 6){ x = -x; z = -z; }
        setTimeout(() => { const e = C.add(new Enemy(type, x, z, opt)); this.active.push(e); SND.noise({f:600, fEnd:200, dur:0.3, gain:0.1}); }, k*220);
      });
      setTimeout(() => { this.pendingSpawn = false; }, list.length*220 + 100);
    }, d.delay ?? 1200);
  }
  remaining(){ return this.active.filter(e => e.alive).length; }
}
