// Third-person character: walk/run by stick tilt, jump + hover jets (hold jump while falling), surface-aware footsteps.
import * as THREE from 'three';
import { spawn } from './assets.js';
import { IN } from './input.js';
import { Cam, clamp, damp, FX } from './engine.js';
import { Feel } from './feel.js';
import { H } from './haptics.js';
import { SND } from './sound.js';

const WALK = 3.0, RUN = 6.2, GRAV = 24, JUMP = 8.4, HOVER_T = 0.9;

export class Player {
  constructor(world){
    this.w = world; this.m = spawn('player'); world.add(this.m.root);
    this.p = new THREE.Vector3(); this.v = new THREE.Vector3(); this.face = 0; this.ground = true; this.key = 'grass';
    this.coyote = 0; this.buf = 0; this.hover = 0; this.hoverT = 0; this.stepAcc = 0; this.foot = 0; this.air = 0; this.safe = new THREE.Vector3(); this.locked = false; this.anim = '';
    this.jet = new THREE.PointLight(0x66ccff, 0, 4); this.m.root.add(this.jet); this.jet.position.y = 0.2;
  }
  place(x, y, z, face = 0){ this.p.set(x, y, z); this.v.set(0, 0, 0); this.face = face; this.safe.copy(this.p); this.m.root.position.copy(this.p); this.m.root.rotation.y = face; Cam.snap(this.p.clone().setY(y + 1.2)); }
  setAnim(n, o){ if(this.anim === n && !(o && o.restart)) return; this.anim = n; this.m.play(n, o); }
  update(dt){
    const w = this.w;
    // --- move input relative to camera
    let ix = 0, iz = 0, mag = 0;
    if(!this.locked){ const f = Cam.fwd(), r = Cam.right(); ix = f[0]*(-IN.my) + r[0]*IN.mx; iz = f[1]*(-IN.my) + r[1]*IN.mx; mag = Math.min(1, Math.hypot(ix, iz)); if(mag > 0){ ix /= mag; iz /= mag; } }
    const water = this.key === 'water';
    const want = mag < 0.05 ? 0 : (mag > 0.85 ? RUN : WALK*clamp(mag/0.85, 0.35, 1))*(water ? 0.65 : 1), acc = this.ground ? 14 : 5;
    this.v.x = damp(this.v.x, ix*want, acc, dt); this.v.z = damp(this.v.z, iz*want, acc, dt);
    const spd = Math.hypot(this.v.x, this.v.z);
    if(spd > 0.3) this.face = Math.atan2(this.v.x, this.v.z);
    // --- jump / hover
    this.buf = IN.pressed('jump') && !this.locked ? 0.12 : Math.max(0, this.buf - dt);
    this.coyote = this.ground ? 0.12 : this.coyote - dt;
    if(this.buf > 0 && this.coyote > 0){ this.v.y = JUMP; this.ground = false; this.coyote = 0; this.buf = 0; this.hoverT = HOVER_T; this.cut = false; Feel.jump(false); this.setAnim('jump', {restart:true, speed:1.3}); }
    if(!this.ground && !IN.b.jump && this.v.y > 3 && !this.cut){ this.v.y *= 0.5; this.cut = true; }
    const hovering = !this.ground && IN.b.jump && this.v.y < 0.5 && this.hoverT > 0 && !this.locked;
    if(hovering){ this.hoverT -= dt; this.v.y = Math.max(this.v.y, -0.8); this.jetFx(dt); } else this.hov = 0;
    this.jet.intensity = hovering ? 2 + Math.random() : 0;
    // --- integrate
    const prevY = this.p.y;
    this.v.y = Math.max(-30, this.v.y - GRAV*dt*(hovering ? 0.15 : 1));
    const nx = this.p.x + this.v.x*dt, nz = this.p.z + this.v.z*dt;
    const gN = w.groundAt(nx, nz, this.p.y);
    if(gN.r && gN.h > this.p.y + 0.6){ /* wall-like step: blocked */ this.v.x = this.v.z = 0; }
    else { this.p.x = nx; this.p.z = nz; }
    w.resolve(this.p, 0.4);
    if(w.bounds){ const b = w.bounds; this.p.x = clamp(this.p.x, b.x0, b.x1); this.p.z = clamp(this.p.z, b.z0, b.z1); }
    this.p.y += this.v.y*dt;
    const g = w.groundAt(this.p.x, this.p.z, Math.max(prevY, this.p.y));
    if(g.r && this.p.y <= g.h + 0.02 && this.v.y <= 0.01){
      if(!this.ground && this.air > 0.12){ const k = clamp(-this.v.y/16, 0.15, 1.4); Feel.land(k, g.key); if(k > 0.7) Cam.shake(0.08*k); FX.burst(this.p.clone().setY(g.h + 0.05), {n:8, color:0xddd6c8, size:0.07, up:1.2, speed:2, life:0.5}); this.stepAcc = 0; }
      this.p.y = g.h; this.v.y = 0; this.ground = true; this.air = 0; this.key = g.key; this.hoverT = HOVER_T;
      if(g.key !== 'water') this.safe.copy(this.p);
    } else if(g.r && this.ground && this.p.y - g.h < 0.35 && this.v.y <= 0){ this.p.y = g.h; this.v.y = 0; this.key = g.key; }       // stick to ramps / small steps down
    else { this.ground = false; this.air += dt; }
    if(this.p.y < w.fallY){ if(w.fallFx === 'splash') Feel.splash(); else Feel.fall(); this.place(this.safe.x, this.safe.y + 0.5, this.safe.z, this.face); Cam.shake(0.2); return; }
    // --- footsteps
    if(this.ground && spd > 0.4){
      this.stepAcc += spd*dt; const stride = spd > 4.6 ? 1.55 : 1.05;
      if(this.stepAcc >= stride){ this.stepAcc -= stride; this.foot ^= 1; Feel.step(this.key, this.foot === 0, false, clamp(0.55 + spd/RUN*0.6, 0.6, 1.15)); }
    } else if(spd <= 0.4) this.stepAcc = 0.75;
    // --- animation + model
    this.animHold = Math.max(0, (this.animHold || 0) - dt);
    if(!this.locked && this.animHold <= 0){
      if(!this.ground){ if(this.anim !== 'jump') this.setAnim('jump', {speed:0.6}); }
      else if(spd > 4.4) this.setAnim('run', {speed:spd/5.5});
      else if(spd > 0.35) this.setAnim('walk', {speed:Math.max(0.6, spd/2.4)});
      else this.setAnim('idle');
    }
    this.m.update(dt);
    const r = this.m.root; r.position.copy(this.p);
    let d = this.face - r.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); r.rotation.y += d*Math.min(1, dt*14);
  }
  // Hover jets: fast alternating left/right buzz like little thrusters under each hand.
  jetFx(dt){
    this.hov = (this.hov || 0) + dt;
    if(this.hov > 0.045){ this.hov = 0; this._s = !this._s; H.pulse(this._s ? 180 : 150, 0.45, 0.04, this._s ? -0.7 : 0.7);
      SND.noise({type:'highpass', f:2500 + Math.random()*1500, dur:0.06, gain:0.05});
      FX.burst(this.p.clone().setY(this.p.y + 0.05), {n:1, color:0x88ddff, size:0.06, up:-2, speed:0.5, life:0.25, gravity:0}); }
  }
}
