// Pistol and rifle on an outdoor range. Pistol: R2 breaks with a "click" halfway (weapon trigger effect), sharp recoil,
// slide snaps back, casing tinkles out of the controller speaker. Rifle: the trigger itself vibrates while you hold it,
// and if you fire too long it overheats — the trigger locks stiff until it cools.
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
import { ground, prop, treeRing, Target, raycastTargets, Sfx, ejectCasing, rnd, later } from './common.js';

function rangeSet(root){
  ground(root, 'grass', 300, 300, {tile:6, y:-0.01});
  ground(root, 'sand', 30, 60, {z:-30, tile:5});
  ground(root, 'wood', 6, 3, {z:1, y:0.01, tile:2.5});
  const wood = new THREE.MeshStandardMaterial({color:0x7a4f2c, roughness:0.85});
  const bench = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.7), wood); bench.position.set(0, 1.0, -0.55); bench.castShadow = bench.receiveShadow = true; root.add(bench);
  [-1.5, 1.5].forEach(x => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.6), wood); l.position.set(x, 0.5, -0.55); root.add(l); });
  // berm behind the targets
  const berm = new THREE.Mesh(new THREE.BoxGeometry(34, 5, 4), new THREE.MeshStandardMaterial({color:0x8a6e4b, roughness:1})); berm.position.set(0, 2.5, -62); berm.receiveShadow = true; root.add(berm);
  [-15, 15].forEach(x => { const s = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 60), new THREE.MeshStandardMaterial({color:0x7d6446, roughness:1})); s.position.set(x, 1.5, -32); s.receiveShadow = true; root.add(s); });
  treeRing(root, 40, 40, 90, {h0:5, h1:9});
  for(let i = 0; i < 6; i++) prop(root, 'tree', (i < 3 ? -1 : 1)*rnd(17, 24), 0, -rnd(5, 55), {height:rnd(4, 7)});
}

function pistolModel(){
  const g = new THREE.Group(), dark = new THREE.MeshStandardMaterial({color:0x2a2d33, metalness:0.7, roughness:0.35}), grip = new THREE.MeshStandardMaterial({color:0x3b2d22, roughness:0.8});
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.036, 0.2), dark); slide.position.set(0, 0.03, -0.05); g.add(slide);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.022, 0.16), new THREE.MeshStandardMaterial({color:0x1d1f23, metalness:0.5, roughness:0.5})); frame.position.set(0, 0.005, -0.03); g.add(frame);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.11, 0.045), grip); handle.position.set(0, -0.05, 0.03); handle.rotation.x = 0.28; g.add(handle);
  const tg = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 12, Math.PI), dark); tg.rotation.set(0, Math.PI/2, Math.PI); tg.position.set(0, -0.012, -0.01); g.add(tg);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.008, 0.006), new THREE.MeshBasicMaterial({color:0xff8a3a})); sight.position.set(0, 0.052, -0.14); g.add(sight);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({color:0xffd27a, transparent:true, opacity:0})); flash.position.set(0, 0.03, -0.18); g.add(flash);
  const light = new THREE.PointLight(0xffc070, 0, 6); light.position.copy(flash.position); g.add(light);
  g.userData = {slide, flash, light}; return g;
}
function rifleModel(){
  const g = new THREE.Group(), dark = new THREE.MeshStandardMaterial({color:0x2b2f35, metalness:0.6, roughness:0.4}), tan = new THREE.MeshStandardMaterial({color:0x6b5a44, roughness:0.8});
  const recv = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.32), dark); recv.position.set(0, 0.02, -0.05); g.add(recv);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.36, 10), dark); barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.03, -0.38); g.add(barrel);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.22), tan); hand.position.set(0, 0.015, -0.3); g.add(hand);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.2), tan); stock.position.set(0, 0, 0.2); g.add(stock);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.11, 0.05), dark); mag.position.set(0, -0.06, -0.07); mag.rotation.x = 0.2; g.add(mag);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.04), tan); grip.position.set(0, -0.05, 0.05); grip.rotation.x = 0.3; g.add(grip);
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.14, 12), dark); scope.rotation.x = Math.PI/2; scope.position.set(0, 0.075, -0.05); g.add(scope);
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.2, 10), new THREE.MeshBasicMaterial({color:0xff4010, transparent:true, opacity:0})); glow.rotation.x = Math.PI/2; glow.position.set(0, 0.03, -0.45); g.add(glow);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({color:0xffd27a, transparent:true, opacity:0})); flash.position.set(0, 0.03, -0.58); g.add(flash);
  const light = new THREE.PointLight(0xffc070, 0, 7); light.position.copy(flash.position); g.add(light);
  g.userData = {flash, light, glow}; return g;
}

export function makeGuns(rifle){
  const root = new THREE.Group(); rangeSet(root);
  const targets = [];
  if(rifle){
    [[-6, -14], [-2, -18], [3, -16], [7, -20], [-9, -26], [0, -30], [9, -34], [-4, -40], [5, -46]].forEach(([x, z]) => targets.push(new Target(root, 'steel', x, z, {r:0.4, square:Math.random() < 0.4})));
  } else {
    [[-3.5, -7], [0, -9], [3.5, -7]].forEach(([x, z]) => targets.push(new Target(root, 'board', x, z, {r:0.45})));
    [[-6, -16], [-2, -18], [2.5, -17], [6.5, -15]].forEach(([x, z]) => targets.push(new Target(root, 'steel', x, z, {r:0.3})));
    targets.push(new Target(root, 'board', 0, -25, {r:0.6, move:{ax:5, sp:0.7}}));
  }
  const gun = rifle ? rifleModel() : pistolModel(), U = gun.userData;
  const st = {mag:rifle ? 30 : 12, ammo:rifle ? 30 : 12, reload:0, armed:true, rate:0, heat:0, over:0, hiss:0, ads:0, shots:0, hits:0, bulls:0, burst:0};
  const restPos = new THREE.Vector3(rifle ? 0.15 : 0.13, rifle ? -0.15 : -0.12, rifle ? -0.42 : -0.42), adsPos = new THREE.Vector3(0, rifle ? -0.105 : -0.085, rifle ? -0.34 : -0.36);
  let kick = 0, slideK = 0;
  const trig = () => { DS.out.trigL = TRG.feedback(2, 2);
    DS.out.trigR = st.reload > 0 ? TRG.off() : rifle ? (st.over > 0 ? TRG.feedback(0, 8) : TRG.vibration(2, 7, 28)) : (st.ammo > 0 ? TRG.weapon(4, 6, 8) : TRG.feedback(2, 1)); };
  function fire(){
    st.shots++; st.ammo--; kick = 1; slideK = 1; U.flash.material.opacity = 1; U.light.intensity = 8; U.flash.rotation.z = Math.random()*6;
    const {ray, hit, target} = raycastTargets(targets);
    if(rifle){
      Sfx.gunshot(false); SND.noise({type:'highpass', f:3000, dur:0.03, gain:0.25});
      H.pulse(220, 0.85, 0.022, (st.burst++ % 2) ? -0.35 : 0.35); H.pulse(70, 1.2, 0.06); H.noise({f:160, dur:0.03, gain:0.4});
      FP.recoil(0.06 + Math.min(0.05, st.burst*0.002), rnd(-0.012, 0.012)); st.heat += 0.028;
    } else {
      Sfx.gunshot(true);
      H.pulse(330, 1.4, 0.03); H.pulse(48, 1.6, 0.26); H.pulse(130, 1.0, 0.1); H.pulse(600, 0.5, 0.012, 0.3, 0.07);   // shot, body, slide snapping back
      FP.recoil(0.42, rnd(-0.03, 0.03)); Light.flash([255, 210, 140], 70);
    }
    Sfx.casing(); ejectCasing(root);
    if(hit){
      const p = hit.point, pan = FP.panOf(p); FX.burst(p, {n:8, color:target && target.kind === 'steel' ? 0xffe2a0 : 0xd9c08a, size:0.03, up:1.5, speed:2.5, life:0.35});
      if(target){ st.hits++; const ring = target.hit(p, rifle ? 0.5 : 1); if(target.kind === 'steel'){ later(clamp(p.distanceTo(E.camera.position)*3, 20, 200), () => Sfx.clank(pan, rifle ? 0.6 : 1)); }
        else { Sfx.thunk(pan, 0.7); if(ring > 0.8){ st.bulls++; SND.notes([1319, 1760], 0.05, {gain:0.06, type:'triangle', pad:true}); H.pulse(900, 0.7, 0.02, pan, 0.05); } } }
    }
    if(st.ammo <= 0) startReload();
  }
  function startReload(){
    if(st.reload > 0 || st.ammo === st.mag) return; st.reload = rifle ? 1.6 : 1.2; trig();
    // mag out · mag in · slide/bolt release — each one a click in the speaker and a tick in the hands
    SND.tone({pad:true, f:700, dur:0.05, gain:0.12, type:'square'}); H.pulse(240, 0.6, 0.03);
    later(st.reload*450, () => { SND.tone({pad:true, f:520, dur:0.06, gain:0.14, type:'square'}); SND.noise({pad:true, type:'highpass', f:2500, dur:0.05, gain:0.12}); H.pulse(160, 1.0, 0.05); });
    later(st.reload*850, () => { SND.tone({pad:true, f:1100, dur:0.04, gain:0.14, type:'square'}); SND.noise({pad:true, type:'highpass', f:4000, dur:0.04, gain:0.12}); H.pulse(420, 1.1, 0.025); H.pulse(110, 0.8, 0.05, 0, 0.02); });
  }
  function hud(){
    $('hTitle').textContent = t(rifle ? 'x_rifle' : 'x_pistol');
    $('hSub').innerHTML = st.reload > 0 ? t('reloading') : `${'▮'.repeat(Math.min(st.ammo, rifle ? 30 : 12))}<span style="opacity:.25">${'▮'.repeat(Math.max(0, st.mag - st.ammo))}</span>`;
    $('hRight').innerHTML = `${t('hits')} ${st.hits}/${st.shots}${rifle ? '' : ' · ' + t('bulls') + ' ' + st.bulls}${rifle ? `<div class="bar" style="width:160px"><i style="width:${Math.min(100, st.heat*100)}%;background:${st.over > 0 ? '#ff5566' : ''}"></i></div>` : ''}`;
    $('hCtl').innerHTML = `<span class="key">R2</span> ${t('ctl_fire')} · <span class="key">L2</span> ${t('ctl_aim')} · ${UI.key('interact')} ${t('reload')} · ${UI.key('pause')} ${t('menu')}`;
  }
  return {
    id: rifle ? 'rifle' : 'pistol',
    enter(){
      E.setWorld(root); E.setSky(0x4a90de, 0xe2eefa, 0xa8b89a, 0xdbe8f2); E.scene.fog.near = 60; E.scene.fog.far = 200;
      FP.attach(); FP.ground = () => 0; FP.reset(0, 0.6, 0, -0.02); FP.vm.add(gun); gun.position.copy(restPos); trig();
      Light.base = rifle ? [255, 120, 40] : [255, 200, 90];
      UI.toast(t(rifle ? 'x_rifle_tip' : 'x_pistol_tip'), 4200); hud();
    },
    exit(){ DS.out.trigL = TRG.off(); DS.out.trigR = TRG.off(); FP.vm.remove(gun); },
    update(dt, time, live){
      targets.forEach(tg => tg.update(dt));
      FP.fov = 70 - st.ads*(rifle ? 30 : 18);
      FP.update(dt, {look:live, gyroAim:true});
      if(live){
        st.ads = damp(st.ads, IN.l2 > 0.3 ? 1 : 0, 12, dt);
        if(st.reload > 0){ st.reload -= dt; if(st.reload <= 0){ st.ammo = st.mag; trig(); } }
        else if(rifle){
          st.over = Math.max(0, st.over - dt); if(st.wasOver && st.over <= 0){ st.wasOver = false; trig(); }
          st.heat = Math.max(0, st.heat - dt*(IN.r2 > 0.3 ? 0.12 : 0.45)); if(IN.r2 < 0.3) st.burst = 0;
          if(st.over > 0){ st.hiss += dt; if(st.hiss > 0.1){ st.hiss = 0; H.noise({f:rnd(140, 240), dur:0.1, gain:0.22}); SND.noise({pad:true, type:'highpass', f:4500, dur:0.1, gain:0.1}); } }
          else { st.rate -= dt; if(IN.r2 > 0.35 && st.rate <= 0){ st.rate = 1/11; fire(); if(st.heat >= 1){ st.over = 2; st.wasOver = true; st.heat = 0.7; trig(); SND.noise({type:'highpass', f:3000, dur:0.9, gain:0.12}); UI.toast(t('overheat'), 900); } } }
        } else {
          if(IN.r2 < 0.3) st.armed = true;
          if(st.armed && IN.r2 > 0.62){ st.armed = false; if(st.ammo > 0) fire(); else { Sfx.dryClick(); } }
        }
        if(IN.pressed('interact')) startReload();
      }
      // view model: ADS blend, recoil kick, slide
      kick = damp(kick, 0, rifle ? 22 : 14, dt); slideK = damp(slideK, 0, 25, dt);
      gun.position.lerpVectors(restPos, adsPos, st.ads); gun.rotation.y = (1 - st.ads)*0.06; gun.position.z += kick*(rifle ? 0.035 : 0.06); gun.rotation.x = kick*(rifle ? 0.08 : 0.35);
      gun.position.y -= st.reload > 0 ? Math.sin(Math.min(1, (1 - st.reload/(rifle ? 1.6 : 1.2)))*Math.PI)*0.12 : 0; gun.rotation.z = st.reload > 0 ? 0.5*Math.sin(Math.min(1, (1 - st.reload/(rifle ? 1.6 : 1.2)))*Math.PI) : 0;
      if(U.slide) U.slide.position.z = -0.05 + slideK*0.04;
      U.flash.material.opacity = damp(U.flash.material.opacity, 0, 40, dt); U.light.intensity = damp(U.light.intensity, 0, 40, dt);
      if(U.glow) U.glow.material.opacity = Math.min(0.9, st.heat*0.9);
      hud();
    }
  };
}
