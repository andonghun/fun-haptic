// Bow: R2 is the string. Resistance ramps up as you pull (adaptive trigger), the limbs creak in your hands,
// at full draw your arms start to tremble, and letting go snaps the string with a kick that rings left-right.
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
import { ground, prop, treeRing, Target, raycastTargets, Sfx, rnd, later } from './common.js';

function bowModel(){
  const g = new THREE.Group(), L = 0.34, wood = new THREE.MeshStandardMaterial({color:0x7a4a24, roughness:0.6});
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, -L, 0.02), new THREE.Vector3(0, 0, -0.17), new THREE.Vector3(0, L, 0.02));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.012, 8), wood));
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.09, 8), new THREE.MeshStandardMaterial({color:0x2e2018})); grip.position.z = -0.085; g.add(grip);
  const sm = new THREE.MeshBasicMaterial({color:0xf0f0f0}), s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 1, 4), sm), s2 = s1.clone(); g.add(s1, s2);
  const arrow = new THREE.Group(), shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.7, 6), new THREE.MeshStandardMaterial({color:0x9a6a3a})); shaft.rotation.x = Math.PI/2; arrow.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.04, 8), new THREE.MeshStandardMaterial({color:0xcfd6de, metalness:0.9, roughness:0.3})); tip.rotation.x = -Math.PI/2; tip.position.z = -0.37; arrow.add(tip);
  const fl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.001, 0.06), new THREE.MeshStandardMaterial({color:0xff5d6e})); fl.position.z = 0.3; arrow.add(fl); const f2 = fl.clone(); f2.rotation.z = Math.PI/2; arrow.add(f2);
  g.add(arrow); g.userData = {s1, s2, arrow, L}; return g;
}
function flyingArrow(){ const a = new THREE.Group(), s = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 6), new THREE.MeshStandardMaterial({color:0x9a6a3a})); s.rotation.x = Math.PI/2; a.add(s);
  const f = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.003, 0.12), new THREE.MeshStandardMaterial({color:0xff5d6e})); f.position.z = 0.33; a.add(f); const f2 = f.clone(); f2.rotation.z = Math.PI/2; a.add(f2); a.traverse(n => n.castShadow = true); return a; }

export function makeBow(){
  const root = new THREE.Group();
  ground(root, 'grass', 300, 300, {tile:6, y:-0.01});
  ground(root, 'gravel', 4, 4, {z:0.5, tile:2.5});
  treeRing(root, 50, 35, 100, {h0:5, h1:10});
  for(let i = 0; i < 10; i++) prop(root, 'tree', (i < 5 ? -1 : 1)*rnd(12, 26), 0, -rnd(0, 60), {height:rnd(4, 8)});
  const targets = [[0, -10], [-5, -18], [5, -26], [-2, -38], [6, -50]].map(([x, z], i) => new Target(root, 'hay', x, z, {r:0.42, stack:i >= 3}));
  const flags = [prop(root, 'flag', -3, 0, -4, {rot:0, height:1.8}), prop(root, 'flag', 3, 0, -4, {rot:0, height:1.8})];
  const bow = bowModel(), U = bow.userData;
  const st = {draw:0, peak:0, creak:0, trem:0, cool:0, shots:0, hits:0, bulls:0, arrows:[]};
  const pos = new THREE.Vector3(-0.12, -0.07, -0.55);
  function shoot(k){
    st.shots++; const dir = FP.dir(), from = E.camera.position.clone().addScaledVector(dir, 0.6);
    const a = flyingArrow(); a.position.copy(from); root.add(a); const v = dir.multiplyScalar(18 + 48*k); st.arrows.push({a, v, life:5, stuck:false});
    const kk = 0.6 + 0.55*k;
    SND.tone({f:220, fEnd:95, dur:0.45, gain:0.2, type:'triangle'}); SND.noise({f:900, fEnd:2600, q:1, dur:0.35, gain:0.2*k}); SND.tone({pad:true, f:180, fEnd:120, dur:0.3, gain:0.14, type:'sawtooth'});
    H.pulse(380, 1.4, 0.03); H.pulse(42, 1.6*kk, 0.5); H.pulse(95, 1.2*kk, 0.2, 0, 0.025);
    for(let i = 0; i < 10; i++) H.pulse(150 - i*6, 0.95*kk*Math.pow(0.72, i), 0.045, i % 2 ? -0.75 : 0.75, 0.07 + i*0.046);   // string ringing
    FP.recoil(0.05*k); Light.flash([255, 210, 140], 120);
    DS.out.trigR = TRG.vibration(0, 8, 70); later(170, trig);
  }
  const trig = () => { DS.out.trigL = TRG.feedback(3, 3); DS.out.trigR = TRG.ramp(1, 1, 8); };
  function hud(){
    $('hTitle').textContent = t('x_bow'); $('hSub').textContent = '';
    $('hRight').innerHTML = `${t('hits')} ${st.hits}/${st.shots} · ${t('bulls')} ${st.bulls}`;
    $('hCtl').innerHTML = `<span class="key">R2</span> ${t('x_draw')} · ${UI.key('pause')} ${t('menu')}`;
  }
  return {
    id:'bow',
    enter(){
      E.setWorld(root); E.setSky(0x5aa0e8, 0xf3e7c8, 0x9fb08a, 0xe8e2cc); E.scene.fog.near = 60; E.scene.fog.far = 200;
      FP.attach(); FP.ground = () => 0; FP.reset(0, 1, 0, -0.03); FP.vm.add(bow); bow.position.copy(pos); bow.rotation.set(0, 0, -0.18); bow.scale.setScalar(0.85); trig();
      Light.base = [120, 255, 120]; UI.toast(t('x_bow_tip'), 4200); hud();
    },
    exit(){ DS.out.trigL = TRG.off(); DS.out.trigR = TRG.off(); FP.vm.remove(bow); },
    update(dt, time, live){
      targets.forEach(tg => tg.update(dt));
      flags.forEach(f => f.root.rotation.z = Math.sin(time*5)*0.03);
      st.cool -= dt;
      const r = live ? IN.r2 : 0, target = st.cool > 0 ? 0 : r; st.draw = damp(st.draw, target, target > st.draw ? 6 : 30, dt);
      const k = st.draw; if(k > st.peak) st.peak = k;
      if(k > 0.06){ st.creak += dt; if(st.creak > 0.19 - 0.12*k){ st.creak = 0; H.pulse(56 + k*60 + rnd(-6, 6), 0.12 + 0.55*k*k, 0.08, rnd(-0.4, 0.4)); if(Math.random() < 0.4) SND.noise({pad:true, f:rnd(300, 700), q:4, dur:0.07, gain:0.1*k}); } }
      if(k > 0.94){ st.trem += dt; if(st.trem > 0.032){ st.trem = 0; H.pulse(30 + rnd(0, 6), 0.45, 0.035, (Math.random() < 0.5 ? -1 : 1)*0.45); } }
      if(st.peak > 0.3 && r < st.peak - 0.28){ shoot(st.peak); st.peak = 0; st.draw = 0; st.cool = 0.45; }
      if(r < 0.04) st.peak = Math.min(st.peak, 0.04);
      FP.fov = 70 - k*22; FP.roll = k > 0.94 ? Math.sin(time*40)*0.002 : 0;
      FP.update(dt, {look:live, gyroAim:false, gyro:k > 0.1});
      // string + arrow + bow pose follow the draw
      const nock = new THREE.Vector3(0, 0, 0.02 + k*0.3);
      [[new THREE.Vector3(0, U.L, 0.02), U.s1], [new THREE.Vector3(0, -U.L, 0.02), U.s2]].forEach(([tip, m]) => { m.position.copy(tip).lerp(nock, 0.5); m.scale.y = tip.distanceTo(nock); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nock.clone().sub(tip).normalize()); });
      U.arrow.visible = st.cool <= 0; U.arrow.position.set(0, 0, nock.z - 0.33);
      bow.position.set(pos.x + k*0.05, pos.y + k*0.03, pos.z + k*0.04); bow.rotation.z = -0.18 + k*0.15;
      // arrows in flight
      for(const o of st.arrows){
        if(o.stuck){ o.life -= dt; if(o.life <= 0){ root.remove(o.a); o.gone = true; } continue; }
        o.life -= dt; const prev = o.a.position.clone(); o.v.y -= 6*dt; o.a.position.addScaledVector(o.v, dt); o.a.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), o.v.clone().normalize());
        const seg = o.a.position.clone().sub(prev), len = seg.length(), rc = new THREE.Raycaster(prev, seg.normalize(), 0, len + 0.4);
        const meshes = []; const own = new Map(); targets.forEach(tg => tg.meshes().forEach(m => { meshes.push(m); own.set(m, tg); }));
        const h = rc.intersectObjects(meshes, false)[0];
        if(h){ o.stuck = true; o.life = 8; o.a.position.copy(h.point); const tg = own.get(h.object), ring = tg.hit(h.point), pan = FP.panOf(h.point); st.hits++;
          Sfx.thunk(pan, 1.1); H.pulse(70, 1.0, 0.12, pan); FX.burst(h.point, {n:10, color:0xe7c56a, size:0.04, up:1.5, speed:2, life:0.5});
          if(ring > 0.75){ st.bulls++; SND.notes([1319, 1760, 2093], 0.06, {gain:0.07, type:'triangle', pad:true}); H.pulse(900, 0.8, 0.02, pan, 0.06); UI.toast(t('bullseye'), 700); } }
        else if(o.a.position.y < 0.02){ o.stuck = true; o.life = 4; o.a.position.y = 0.02; Sfx.thunk(FP.panOf(o.a.position), 0.3); }
        else if(o.life <= 0){ root.remove(o.a); o.gone = true; }
      }
      st.arrows = st.arrows.filter(o => !o.gone);
      hud();
    }
  };
}
