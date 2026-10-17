// First-person rig: look (right stick / mouse / optional gyro), optional walking with head bob,
// a view-model group that rides with the camera, and a recoil spring.
import * as THREE from 'three';
import { E, clamp, damp } from './engine.js';
import { IN } from './input.js';
import { DS } from './ds.js';
import { Save } from './ui.js';

const DEG = Math.PI/180;
export const FP = {
  yaw: 0, pitch: 0, pos: new THREE.Vector3(0, 1.6, 0), eye: 1.6, vm: new THREE.Group(), kick: 0, kickV: 0, yawKick: 0, roll: 0,
  bob: 0, bobAmt: 0, moving: false, gyro: false, fov: 70, fovCur: 70, speed: 3.2, ground: () => 0, bounds: null,
  attach(){ const c = E.camera; if(c.parent !== E.scene) E.scene.add(c); if(this.vm.parent !== c) c.add(this.vm); },
  reset(x, z, yaw = 0, pitch = 0){ this.pos.set(x, this.ground(x, z) + this.eye, z); this.yaw = yaw; this.pitch = pitch; this.kick = this.kickV = this.yawKick = 0; this.vm.clear(); this.vm.position.set(0, 0, 0); this.vm.rotation.set(0, 0, 0); this.fov = this.fovCur = 70; },
  recoil(up, side = 0){ this.kickV += up; this.yawKick += side; },
  // returns {moved, speed} for footstep timing
  update(dt, o = {}){
    const look = o.look !== false;
    if(look){
      this.yaw -= (IN.lx*2.2*dt + (IN.mouseDX || 0)*0.0022);
      this.pitch = clamp(this.pitch - (IN.ly*1.7*dt + (IN.mouseDY || 0)*0.0022), -1.35, 1.35);
      // gyro: turn/tilt the controller to aim (always on when o.gyro, otherwise only while L2 is held)
      if(DS.connected && Save.get('gyro', true) && (o.gyro || (o.gyroAim && IN.l2 > 0.3))){
        const g = DS.s.gyro, dz = v => Math.abs(v) < 1.0 ? 0 : v;
        this.yaw += dz(g[1])*DEG*dt*1.2; this.pitch = clamp(this.pitch + dz(g[0])*DEG*dt*1.2*(IN.invertY ? -1 : 1), -1.35, 1.35);
      }
    }
    let moved = 0;
    if(o.move){
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      let mx = fx*(-IN.my) + rx*IN.mx, mz = fz*(-IN.my) + rz*IN.mx; const m = Math.min(1, Math.hypot(mx, mz));
      if(m > 0.05){ const n = Math.hypot(mx, mz) || 1; mx /= n; mz /= n; const sp = (o.speed || this.speed)*m*(IN.b.l1 ? 1.7 : 1);
        const nx = this.pos.x + mx*sp*dt, nz = this.pos.z + mz*sp*dt; this.pos.x = nx; this.pos.z = nz; moved = sp; }
      if(this.bounds){ const b = this.bounds; this.pos.x = clamp(this.pos.x, b.x0, b.x1); this.pos.z = clamp(this.pos.z, b.z0, b.z1); }
      const gy = this.ground(this.pos.x, this.pos.z) + this.eye + (o.yOff || 0); this.pos.y = damp(this.pos.y, gy, 14, dt);
    }
    // head bob (vertical + slight sway) proportional to speed
    this.bobAmt = damp(this.bobAmt, Math.min(1, moved/4), 8, dt); this.bob += moved*dt*2.1;
    // recoil spring
    this.kick += this.kickV*dt; this.kickV += (-this.kick*90 - this.kickV*14)*dt; this.yawKick = damp(this.yawKick, 0, 10, dt);
    const c = E.camera;
    c.position.set(this.pos.x, this.pos.y + Math.abs(Math.sin(this.bob))*0.05*this.bobAmt, this.pos.z);
    c.rotation.set(this.pitch + this.kick, this.yaw + this.yawKick, Math.sin(this.bob)*0.012*this.bobAmt + this.roll, 'YXZ');
    this.fovCur = damp(this.fovCur, this.fov, 10, dt); if(Math.abs(c.fov - this.fovCur) > 0.01){ c.fov = this.fovCur; c.updateProjectionMatrix(); }
    // view model sway
    this.vm.position.x = damp(this.vm.position.x, -(IN.lx || 0)*0.015 + Math.sin(this.bob)*0.012*this.bobAmt, 8, dt);
    this.vm.position.y = damp(this.vm.position.y, Math.abs(Math.cos(this.bob))*-0.012*this.bobAmt, 8, dt);
    return {moved};
  },
  dir(out = new THREE.Vector3()){ return E.camera.getWorldDirection(out); },
  ray(){ const r = new THREE.Raycaster(); r.setFromCamera(new THREE.Vector2(0, 0), E.camera); return r; },
  // -1..1: where a world point sits left/right of the view (for haptic panning)
  panOf(p){ const d = new THREE.Vector3().subVectors(p, E.camera.position), r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); const l = d.length() || 1; return clamp(d.dot(r)/l*1.2, -1, 1); }
};
