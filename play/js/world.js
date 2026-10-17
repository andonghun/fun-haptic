// Walkable world built from surface patches (flat slabs and ramps) + circle colliders.
import * as THREE from 'three';
import { surfaceMaterial } from './textures.js';

export class World {
  constructor(){ this.group = new THREE.Group(); this.rects = []; this.cols = []; this.updaters = []; this.fallY = -8; }
  // flat slab: top at h. o.key = surface, o.thick, o.visible=false for invisible walkable areas
  slab(x0, z0, x1, z1, h, key, o = {}){
    const r = {x0:Math.min(x0, x1), x1:Math.max(x0, x1), z0:Math.min(z0, z1), z1:Math.max(z0, z1), h, key, cut:!!o.cut, pri:o.pri ?? this.rects.length};
    this.rects.push(r);
    if(o.visible !== false){
      const w = r.x1 - r.x0, d = r.z1 - r.z0, th = o.thick ?? Math.max(0.3, h + 1);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, th, d), o.mat || surfaceMaterial(key, w, d, o.tile || 4));
      m.position.set((r.x0 + r.x1)/2, h - th/2, (r.z0 + r.z1)/2); m.receiveShadow = true; m.castShadow = !!o.cast; this.group.add(m); r.mesh = m;
    }
    return r;
  }
  // round slab (islands, pads)
  disc(cx, cz, rad, h, key, o = {}){
    const r = {x0:cx - rad, x1:cx + rad, z0:cz - rad, z1:cz + rad, h, key, circle:{cx, cz, r:rad}, pri:o.pri ?? this.rects.length}; this.rects.push(r);
    if(o.visible !== false){ const th = o.thick ?? Math.max(0.3, h + 1), mat = o.mat || surfaceMaterial(key, rad*2, rad*2, o.tile || 4);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad*(o.taper ?? 1), th, o.seg || 48), mat); m.position.set(cx, h - th/2, cz); m.receiveShadow = true; m.castShadow = !!o.cast; this.group.add(m); r.mesh = m; }
    return r;
  }
  // ramp along z or x from h0 to h1
  ramp(x0, z0, x1, z1, h0, h1, key, axis = 'z', o = {}){
    const r = {x0:Math.min(x0, x1), x1:Math.max(x0, x1), z0:Math.min(z0, z1), z1:Math.max(z0, z1), key, axis, a0:axis === 'z' ? z0 : x0, a1:axis === 'z' ? z1 : x1, h0, h1, pri:o.pri ?? this.rects.length};
    this.rects.push(r);
    const len = Math.abs(r.a1 - r.a0), wid = axis === 'z' ? r.x1 - r.x0 : r.z1 - r.z0, dh = h1 - h0, L = Math.hypot(len, dh), th = 0.25;
    const m = new THREE.Mesh(new THREE.BoxGeometry(axis === 'z' ? wid : L, th, axis === 'z' ? L : wid), surfaceMaterial(key, axis === 'z' ? wid : L, axis === 'z' ? L : wid, o.tile || 4));
    m.position.set((r.x0 + r.x1)/2, (h0 + h1)/2 - th/2, (r.z0 + r.z1)/2);
    const ang = Math.atan2(dh, (r.a1 - r.a0));
    if(axis === 'z') m.rotation.x = -ang; else m.rotation.z = ang;
    m.receiveShadow = true; this.group.add(m); r.mesh = m; return r;
  }
  // ground under (x,z) for something currently at height y (ignores slabs more than `step` above y)
  // o.cut on a slab hides every lower-priority patch under it (ponds, rivers cut into the base ground)
  groundAt(x, z, y = 1e9, step = 0.6){
    let best = null, bh = -1e9, cut = -1;
    const inside = r => !(x < r.x0 || x > r.x1 || z < r.z0 || z > r.z1) && !(r.circle && Math.hypot(x - r.circle.cx, z - r.circle.cz) > r.circle.r);
    for(const r of this.rects) if(r.cut && r.pri > cut && inside(r)) cut = r.pri;
    for(const r of this.rects){
      if(r.pri < cut || !inside(r)) continue;
      let h = r.h; if(r.axis){ const a = r.axis === 'z' ? z : x, t = Math.max(0, Math.min(1, (a - r.a0)/(r.a1 - r.a0))); h = r.h0 + (r.h1 - r.h0)*t; }
      if(h > y + step) continue;
      if(h > bh || (best && h === bh && r.pri > best.pri)){ bh = h; best = r; }
    }
    return best ? {h:bh, key:best.key, r:best} : {h:-100, key:null, r:null};
  }
  collider(x, z, r, o = {}){ const c = {x, z, r, h:o.h ?? 99, y0:o.y0 ?? -99}; this.cols.push(c); return c; }
  // push a circle (radius rad) out of colliders
  resolve(p, rad){
    for(const c of this.cols){ if(p.y > c.y0 + c.h || p.y + 1.5 < c.y0) continue; const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + rad;
      if(d < m && d > 1e-5){ p.x = c.x + dx/d*m; p.z = c.z + dz/d*m; } }
  }
  add(o){ this.group.add(o); return o; }
  onUpdate(f){ this.updaters.push(f); }
  update(dt, t){ this.updaters.forEach(f => f(dt, t)); }
}
