// Rain: drops tap randomly on both palms. R2 turns the rain up (light drizzle → downpour), L2 opens an umbrella —
// the drops become deeper, denser drumming on the canopy and drip from its edge (controller speaker).
// △ calls thunder: a white flash, then a roll that travels across your hands. Walk with the left stick to splash.
import * as THREE from 'three';
import { E, FX, clamp, damp } from '../engine.js';
import { FP } from '../fp.js';
import { IN } from '../input.js';
import { DS, TRG } from '../ds.js';
import { H } from '../haptics.js';
import { SND } from '../sound.js';
import { Feel, Light } from '../feel.js';
import { UI, $ } from '../ui.js';
import { t } from '../i18n.js';
import { ground, prop, treeRing, rnd, later } from './common.js';

function umbrella(){
  const g = new THREE.Group(), cloth = new THREE.MeshStandardMaterial({color:0x2a5fd0, emissive:0x0d2a66, roughness:0.6, side:THREE.DoubleSide});
  const can = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.32, 12, 1, true), cloth); can.position.y = 0.62; g.add(can);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.8, 6), new THREE.MeshStandardMaterial({color:0x222222, metalness:0.6})); shaft.position.y = 0.4; g.add(shaft);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12, Math.PI), new THREE.MeshStandardMaterial({color:0x3a2a20})); hook.position.y = 0.0; hook.rotation.z = Math.PI; g.add(hook);
  g.userData.can = can; return g;
}

export function makeRain(){
  const root = new THREE.Group();
  ground(root, 'grass', 300, 300, {tile:6, y:-0.01});
  ground(root, 'stone', 6, 60, {z:-10, y:0.005, tile:3});
  // puddles
  const puddles = [[0.4, -3, 1.4], [-1.2, -9, 1.1], [1.5, -15, 1.6], [-0.6, -22, 1.2]].map(([x, z, r]) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 28), new THREE.MeshStandardMaterial({color:0x6d8094, roughness:0.08, metalness:0.7, transparent:true, opacity:0.55})); m.rotation.x = -Math.PI/2; m.position.set(x, 0.012, z); root.add(m); return {x, z, r}; });
  treeRing(root, 60, 8, 60, {h0:4, h1:8});
  const lamp = new THREE.Group(); lamp.position.set(3.4, 0, -6); root.add(lamp);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4, 8), new THREE.MeshStandardMaterial({color:0x1d2228, metalness:0.6})); pole.position.y = 2; lamp.add(pole);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({color:0xffe2a0})); bulb.position.set(-0.4, 3.9, 0); lamp.add(bulb);
  const ll = new THREE.PointLight(0xffd59a, 10, 14, 1.4); ll.position.copy(bulb.position); lamp.add(ll);
  // rain streaks (line segments) around the camera
  const N = 3000, P = new Float32Array(N*6); const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(P, 3));
  for(let i = 0; i < N; i++){ const x = rnd(-20, 20), y = rnd(0, 18), z = rnd(-20, 20); P.set([x, y, z, x, y + 0.35, z], i*6); }
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({color:0xa9bfd8, transparent:true, opacity:0.5})); rain.frustumCulled = false; root.add(rain);
  const bolt = new THREE.DirectionalLight(0xd8e4ff, 0); bolt.position.set(-30, 50, -40); root.add(bolt);
  const umb = umbrella();
  const st = {I:0.4, drop:0, open:0, flash:0, step:0, foot:0, drip:0, thunder:0};
  let bedHiss = null, bedLow = null, bedUmb = null, hv = null;
  const trig = () => { DS.out.trigR = TRG.ramp(0, 1, 5); DS.out.trigL = TRG.feedback(3, 4); };
  function thunder(){
    if(st.thunder > 0) return; st.thunder = 3; st.flash = 0.5; Light.flash([235, 240, 255], 300);
    const dly = rnd(300, 900);
    later(dly, () => {
      SND.noise({type:'lowpass', f:180, dur:3.2, att:0.08, gain:0.6}); SND.tone({f:55, fEnd:30, dur:2.6, gain:0.35, type:'sawtooth'}); SND.noise({f:900, fEnd:150, q:0.5, dur:0.5, gain:0.25});
      H.pulse(500, 1.0, 0.03); H.pulse(30, 1.6, 0.9);
      for(let i = 0; i < 16; i++) H.noise({t:0.1 + i*0.13, f:rnd(35, 70), q:0.7, dur:0.25, gain:1.1*Math.pow(0.86, i), pan:-1 + i*2/15});   // the roll travels left → right
    });
  }
  function hud(){
    $('hTitle').textContent = t('x_rain'); $('hSub').textContent = `${t('x_rain_int')} ${Math.round(st.I*100)}%${st.open > 0.5 ? ' · ☂' : ''}`; $('hRight').innerHTML = '';
    $('hCtl').innerHTML = `<span class="key">R2</span> ${t('x_rain_r2')} · <span class="key">L2</span> ${t('x_rain_l2')} · ${UI.key('interact')} ${t('x_thunder')} · ${t('ctl_move')} · ${UI.key('pause')} ${t('menu')}`;
  }
  return {
    id:'rain',
    enter(){
      E.setWorld(root); E.setSky(0x1a2232, 0x3d4a5e, 0x1e252e, 0x2a3442); E.scene.fog.near = 6; E.scene.fog.far = 45; E.sun.intensity = 0.35; E.hemi.intensity = 0.5;
      FP.attach(); FP.ground = () => 0; FP.bounds = {x0:-2.6, x1:2.6, z0:-38, z1:4}; FP.reset(0, 2, 0, -0.08); FP.vm.add(umb); umb.position.set(0.05, -1.2, -0.25); umb.visible = false; trig();
      Light.base = [30, 50, 110]; UI.toast(t('x_rain_tip'), 4500); hud();
      bedHiss = SND.bed({type:'highpass', f:2400, q:0.3}); bedLow = SND.bed({type:'lowpass', f:500, lfo:0.07}); bedUmb = SND.bed({type:'bandpass', f:1100, q:0.8});
      hv = H.voice({f:180, q:0.6});
    },
    exit(){ DS.out.trigL = TRG.off(); DS.out.trigR = TRG.off(); FP.vm.remove(umb); FP.bounds = null; [bedHiss, bedLow, bedUmb].forEach(b => b && b.stop()); hv && hv.stop(); E.sun.intensity = 2.6; E.hemi.intensity = 1.2; },
    update(dt, time, live){
      const I = st.I = live ? 0.15 + 0.85*IN.r2 : st.I, open = st.open = damp(st.open, live && IN.l2 > 0.3 ? Math.min(1, IN.l2*1.2) : 0, 8, dt);
      const {moved} = FP.update(dt, {look:live, move:live, speed:2.2});
      // umbrella pose: rises and opens with L2
      umb.visible = open > 0.03; umb.position.set(0.32, -1.25 + open*1.2, -0.35); umb.rotation.z = 0.32 - open*0.12; umb.userData.can.scale.set(0.2 + 0.8*open, 1, 0.2 + 0.8*open);
      // streaks fall + wrap around the camera; heavier rain = faster and denser look
      const p = rg.attributes.position.array, cx = E.camera.position.x, cz = E.camera.position.z, sp = 14 + 10*I;
      for(let i = 0; i < N; i++){ const o = i*6; p[o + 1] -= sp*dt; p[o + 4] -= sp*dt; if(p[o + 1] < 0){ const x = cx + rnd(-20, 20), z = cz + rnd(-20, 20), y = 18; p[o] = p[o + 3] = x; p[o + 2] = p[o + 5] = z; p[o + 1] = y; p[o + 4] = y + 0.25 + 0.3*I; } }
      rg.attributes.position.needsUpdate = true; rain.material.opacity = 0.2 + 0.5*I;
      // haptics: individual drops on palms (open air) vs drumming on the canopy (umbrella)
      st.drop += dt*(8 + 70*I);
      while(st.drop >= 1){ st.drop--;
        if(Math.random() < open){ H.pulse(rnd(70, 120), rnd(0.25, 0.55)*(0.6 + 0.6*I), rnd(0.03, 0.05), rnd(-0.3, 0.3)); }
        else if(Math.random() < 0.88){ H.pulse(rnd(260, 520), rnd(0.07, 0.22)*(0.5 + 0.7*I), rnd(0.012, 0.03), rnd(-1, 1)); }
        else H.pulse(rnd(110, 170), rnd(0.3, 0.5)*(0.5 + 0.7*I), 0.05, rnd(-1, 1));
      }
      hv.set((0.05 + 0.12*I)*(1 - open*0.6), 160 + 60*I, 0);                 // fine hiss under it all
      bedHiss.set((0.08 + 0.35*I)*(1 - open*0.4), 0.2); bedLow.set(0.08 + 0.2*I, 0.4); bedUmb.set(open*(0.1 + 0.35*I), 0.1);
      if(open > 0.6){ st.drip += dt*(1 + 3*I); if(st.drip > 1){ st.drip = 0; SND.tone({pad:true, f:rnd(900, 1500), fEnd:rnd(500, 700), dur:0.05, gain:0.08}); } }
      // splashy footsteps (puddles = water)
      if(moved > 0.3){ st.step += moved*dt; if(st.step > 1.0){ st.step = 0; st.foot ^= 1; const pos = E.camera.position, inP = puddles.some(q => Math.hypot(pos.x - q.x, pos.z - q.z) < q.r); Feel.step(inP ? 'water' : 'stone', st.foot === 0, false, inP ? 1 : 0.8); } }
      if(live && IN.pressed('interact')) thunder();
      st.thunder = Math.max(0, st.thunder - dt); st.flash = Math.max(0, st.flash - dt); bolt.intensity = st.flash > 0 ? (Math.random() < 0.6 ? 6 : 0) : 0;
      if(st.flash > 0) E.setSky(0x8090b0, 0xb0c0e0, 0x404858, 0x7080a0); else E.setSky(0x1a2232, 0x3d4a5e, 0x1e252e, 0x2a3442);
      Light.base = [30 + 30*I, 50 + 40*I, 110 + 80*I];
      if(Math.random() < dt*25*I) FX.burst(new THREE.Vector3(E.camera.position.x + rnd(-4, 4), 0.02, E.camera.position.z + rnd(-6, 1)), {n:2, color:0xbcd0e8, size:0.025, up:1.2, speed:0.6, life:0.25});
      hud();
    }
  };
}
