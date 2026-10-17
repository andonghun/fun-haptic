// Tilt tray: tilt the controller and three balls (steel, wood, rubber) roll around a tray you hold.
// Each ball's rolling texture follows its position from your left hand to your right; walls and collisions knock.
// Flick the controller upward to toss them — they float, then land with a thud. (No gyro → left stick tilts.)
import * as THREE from 'three';
import { E, FX, clamp, damp } from '../engine.js';
import { FP } from '../fp.js';
import { IN } from '../input.js';
import { DS, TRG } from '../ds.js';
import { H } from '../haptics.js';
import { SND } from '../sound.js';
import { Light } from '../feel.js';
import { UI, $ } from '../ui.js';
import { t } from '../i18n.js';
import { ground, prop, rnd } from './common.js';

const R = 6.4, S = 0.075;     // tray radius in physics units, physics→metres scale
const MAT = {
  steel:{r:0.62, col:0xd6dde6, metal:0.95, rough:0.15, roll:[200, 34], bank:'metal', rest:0.55, k:1.0},
  wood: {r:0.75, col:0xb07a43, metal:0, rough:0.7, roll:[95, 14], bank:'wood', rest:0.45, k:1.1},
  rubber:{r:0.68, col:0xff5d6e, metal:0, rough:0.9, roll:[60, 8], bank:'land', rest:0.78, k:0.8}
};
export function makeTilt(){
  const root = new THREE.Group();
  ground(root, 'wood', 30, 30, {tile:3});
  const wall = new THREE.Mesh(new THREE.BoxGeometry(30, 8, 0.3), new THREE.MeshStandardMaterial({color:0xe9e2d4, roughness:1})); wall.position.set(0, 4, -6); root.add(wall);
  const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.4), new THREE.MeshStandardMaterial({color:0x6b4a2e, roughness:0.7})); table.position.set(0, 0.76, -0.9); table.receiveShadow = true; root.add(table);
  const lamp = new THREE.PointLight(0xfff0d8, 12, 8, 1.5); lamp.position.set(0.6, 2.6, -0.4); lamp.castShadow = true; root.add(lamp);
  const tray = new THREE.Group(); tray.position.set(0, 1.0, -0.58); tray.scale.setScalar(S); root.add(tray);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.4, R + 0.6, 0.4, 48), new THREE.MeshStandardMaterial({color:0x2a3242, roughness:0.4, metalness:0.3})); base.position.y = -0.2; base.receiveShadow = true; tray.add(base);
  const felt = new THREE.Mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshStandardMaterial({color:0x1f6b4a, roughness:1})); felt.rotation.x = -Math.PI/2; felt.position.y = 0.01; felt.receiveShadow = true; tray.add(felt);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R + 0.3, 0.35, 10, 64), new THREE.MeshStandardMaterial({color:0x8a6a44, roughness:0.5})); rim.rotation.x = Math.PI/2; rim.position.y = 0.25; tray.add(rim);
  const balls = Object.entries(MAT).map(([k, m], i) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(m.r, 24, 16), new THREE.MeshStandardMaterial({color:m.col, metalness:m.metal, roughness:m.rough})); mesh.castShadow = true; tray.add(mesh);
    return {k, m, mesh, x:(i - 1)*2.5, z:0, y:0, vx:0, vz:0, vy:0, cd:0, voice:null, bed:null, q:new THREE.Quaternion()};
  });
  const st = {base:null, air:0};
  function impact(b, v, kind){
    const pan = clamp(b.x/R, -1, 1), a = clamp(v/9, 0.15, 1.3), m = b.m;
    const i = SND.play(m.bank, {rate:(kind === 'ball' ? 1.3 : 1)*rnd(0.95, 1.05), gain:0.6*a, pan, pad:true});
    H.play(SND.hapOf(m.bank, Math.max(0, i)), kind === 'ball' ? 1.3 : 1, 1.5*a*m.k, pan); H.pulse(kind === 'floor' ? 60 : 140, 0.7*a, 0.06, pan);
    if(a > 0.6) Light.flash([255, 230, 180], 80);
  }
  function hud(){
    $('hTitle').textContent = t('x_tilt'); $('hSub').textContent = DS.connected ? t('x_tilt_sub') : t('x_tilt_stick'); $('hRight').innerHTML = '';
    $('hCtl').innerHTML = `${DS.connected ? `<span class="key">CREATE</span> ${t('x_recenter')} · ` : ''}${UI.key('pause')} ${t('menu')}`;
  }
  return {
    id:'tilt',
    enter(){
      E.setWorld(root); E.setSky(0x6d7d94, 0xd8d0c0, 0x6a5a48, 0xd8d0c0); E.scene.fog.near = 20; E.scene.fog.far = 60;
      FP.attach(); FP.ground = () => 0; FP.reset(0, 0, 0, -0.8);
      DS.out.trigL = TRG.off(); DS.out.trigR = TRG.off(); Light.base = [60, 200, 140]; st.base = null;
      balls.forEach(b => { b.voice = H.voice({f:b.m.roll[0], q:0.8, tone:0.4}); b.bed = SND.bed({type:'bandpass', f:b.m.roll[0]*6, q:1.2, pad:true}); });
      UI.toast(t('x_tilt_tip'), 4500); hud();
    },
    exit(){ balls.forEach(b => { b.voice && b.voice.stop(); b.bed && b.bed.stop(); }); },
    update(dt, time, live){
      FP.update(dt, {look:false});
      // gravity in the tray's frame: the controller's accelerometer (minus nothing — it IS gravity + your flicks)
      let ac = [0, 1, 0];
      if(DS.connected && DS.s.t){ ac = DS.s.accel; if(!st.base || IN.pressed('back')) st.base = ac.slice(); ac = [ac[0] - st.base[0], ac[1], ac[2] - st.base[2]]; }
      else ac = [IN.mx*0.5, 1, IN.my*0.5];
      if(!live) ac = [0, 1, 0];
      const G = 45, gx = -ac[0]*G, gy = -ac[1]*G, gz = -ac[2]*G, n = Math.max(1, Math.ceil(dt/0.006)), h = dt/n;
      for(let s = 0; s < n; s++){
        for(const b of balls){ const m = b.m, lim = R - m.r;
          b.cd -= h; b.vx += gx*h; b.vy += gy*h; b.vz += gz*h;
          const f = Math.exp(-(b.y <= 0.001 ? 0.7 : 0.05)*h); b.vx *= f; b.vz *= f;
          b.x += b.vx*h; b.y += b.vy*h; b.z += b.vz*h;
          if(b.y < 0){ b.y = 0; if(b.vy < -1.5){ if(b.cd < 0){ impact(b, -b.vy, 'floor'); b.cd = 0.05; } b.vy = -b.vy*m.rest; } else b.vy = 0; }
          if(b.y > 16){ b.y = 16; if(b.vy > 0) b.vy *= -0.5; }
          const d = Math.hypot(b.x, b.z);
          if(d > lim){ const nx = b.x/d, nz = b.z/d; b.x = nx*lim; b.z = nz*lim; const vn = b.vx*nx + b.vz*nz;
            if(vn > 0){ b.vx -= (1 + m.rest)*vn*nx; b.vz -= (1 + m.rest)*vn*nz; if(vn > 1.6 && b.cd < 0){ impact(b, vn, 'wall'); b.cd = 0.05; } } }
        }
        for(let i = 0; i < balls.length; i++) for(let j = i + 1; j < balls.length; j++){
          const p = balls[i], q = balls[j], dx = q.x - p.x, dz = q.z - p.z, dy = q.y - p.y, d = Math.hypot(dx, dy, dz), md = p.m.r + q.m.r;
          if(d < md && d > 1e-4){ const nx = dx/d, ny = dy/d, nz = dz/d, push = (md - d)/2; p.x -= nx*push; p.z -= nz*push; q.x += nx*push; q.z += nz*push;
            const rel = (q.vx - p.vx)*nx + (q.vy - p.vy)*ny + (q.vz - p.vz)*nz;
            if(rel < 0){ p.vx += rel*nx*0.9; p.vy += rel*ny*0.9; p.vz += rel*nz*0.9; q.vx -= rel*nx*0.9; q.vy -= rel*ny*0.9; q.vz -= rel*nz*0.9;
              if(-rel > 1.4 && p.cd < 0 && q.cd < 0){ impact(p.m.k > q.m.k ? p : q, -rel, 'ball'); p.cd = q.cd = 0.05; } } }
        }
      }
      // visuals + continuous rolling texture per ball
      let air = 0;
      balls.forEach(b => {
        b.mesh.position.set(b.x, b.m.r + b.y, b.z);
        const sp = Math.hypot(b.vx, b.vz), on = b.y < 0.06, lvl = on ? clamp((sp - 0.3)/12, 0, 1) : 0; if(!on) air++;
        const ax = new THREE.Vector3(b.vz, 0, -b.vx); if(sp > 0.01){ ax.normalize(); b.mesh.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(ax, sp*dt/b.m.r)); }
        const pan = clamp(b.x/R, -1, 1);
        b.voice.set(lvl*1.1*b.m.k, b.m.roll[0] + sp*b.m.roll[1], pan);
        b.bed.set(lvl*0.35, 0.05); b.bed.freq(b.m.roll[0]*5 + sp*60);
      });
      // tray follows the controller's tilt a little so you can see what you feel
      tray.rotation.x = damp(tray.rotation.x, clamp(-ac[2]*0.6, -0.4, 0.4), 10, dt); tray.rotation.z = damp(tray.rotation.z, clamp(ac[0]*0.6, -0.4, 0.4), 10, dt);
      Light.base = air ? [255, 255, 255] : [60, 200, 140];
      hud();
    }
  };
}
