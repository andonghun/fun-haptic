// Footsteps: walk (first person) down a path of eight surfaces. Every step is a real recording on the speakers
// and the same recording as a haptic — left foot in the left hand, right foot in the right, heel then toe.
import * as THREE from 'three';
import { E, FX, clamp, damp } from '../engine.js';
import { FP } from '../fp.js';
import { IN } from '../input.js';
import { DS, TRG } from '../ds.js';
import { H } from '../haptics.js';
import { SND } from '../sound.js';
import { Feel, Light, SURF_RGB } from '../feel.js';
import { surfaceMaterial } from '../textures.js';
import { UI, $ } from '../ui.js';
import { t } from '../i18n.js';
import { ground, prop, treeRing, rnd } from './common.js';

const PATH = ['grass', 'wood', 'metal', 'gravel', 'snow', 'stone', 'sand', 'water'];
const SEG = 9, W = 7;

export function makeWalk(){
  const root = new THREE.Group();
  ground(root, 'grass', 300, 300, {tile:6, y:-0.02});
  const zOf = i => -i*SEG;
  PATH.forEach((k, i) => {
    const z0 = zOf(i), y = k === 'water' ? -0.25 : (k === 'wood' || k === 'metal' ? 0.18 : 0.02);
    if(k === 'water'){
      const bed = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, SEG), surfaceMaterial('sand', W, SEG, 3)); bed.position.set(0, -0.34, z0 - SEG/2); root.add(bed);
      const wv = new THREE.Mesh(new THREE.PlaneGeometry(W, SEG), new THREE.MeshStandardMaterial({color:0x5aa8e0, transparent:true, opacity:0.6, roughness:0.1, metalness:0.2})); wv.rotation.x = -Math.PI/2; wv.position.set(0, -0.08, z0 - SEG/2); root.add(wv);
    } else { const m = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, SEG), surfaceMaterial(k, W, SEG, 3)); m.position.set(0, y - 0.1, z0 - SEG/2); m.receiveShadow = true; root.add(m); }
    // a little sign at the start of each surface
    const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d'); g.fillStyle = '#1b2333'; g.fillRect(0, 0, 256, 96); g.fillStyle = `rgb(${SURF_RGB[k].join(',')})`; g.fillRect(0, 84, 256, 12);
    g.fillStyle = '#fff'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.fillText(t('surf_' + k), 128, 60);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.52), new THREE.MeshBasicMaterial({map:tex})); sign.position.set(W/2 + 0.5, 1.6, z0 - 0.3); sign.rotation.y = -0.5; root.add(sign);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.06), new THREE.MeshStandardMaterial({color:0x6b4426})); post.position.set(W/2 + 0.5, 0.7, z0 - 0.3); root.add(post);
    if(k === 'snow') for(let j = 0; j < 6; j++) prop(root, 'tree', (j % 2 ? 1 : -1)*rnd(4.5, 7), 0, z0 - rnd(1, SEG - 1), {height:rnd(2.5, 4), frost:true});
    if(k === 'metal'){ const railM = new THREE.MeshStandardMaterial({color:0x8d99a8, metalness:0.6, roughness:0.4}); [-W/2, W/2].forEach(x => { const rl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, SEG), railM); rl.position.set(x, 1.15, z0 - SEG/2); root.add(rl); }); }
  });
  treeRing(root, 50, 10, 80, {cz:-36, h0:4, h1:8});
  const ground_ = (x, z) => { const i = Math.floor(-z/SEG); const k = PATH[clamp(i, 0, PATH.length - 1)]; return k === 'water' ? -0.25 : (k === 'wood' || k === 'metal') ? 0.18 : 0.02; };
  const keyAt = z => PATH[clamp(Math.floor(-z/SEG), 0, PATH.length - 1)];
  const st = {step:0, foot:0, key:null, vy:0, y:0, air:false};
  function hud(){
    $('hTitle').textContent = t('x_walk'); $('hSub').textContent = t('surf_' + (st.key || 'grass')); $('hRight').innerHTML = '';
    $('hCtl').innerHTML = `${t('ctl_move')} · <span class="key">L1</span> ${t('x_run')} · ${UI.key('jump')} ${t('ctl_jump')} · ${UI.key('pause')} ${t('menu')}`;
  }
  return {
    id:'walk',
    enter(){
      E.setWorld(root); E.setSky(0x4a90de, 0xd9ecfa, 0x93ad8e, 0xd6e7f2); E.scene.fog.near = 30; E.scene.fog.far = 120;
      FP.attach(); FP.ground = ground_; FP.bounds = {x0:-W/2 + 0.4, x1:W/2 - 0.4, z0:-PATH.length*SEG + 0.5, z1:3}; FP.reset(0, 2, 0, -0.12);
      DS.out.trigL = TRG.off(); DS.out.trigR = TRG.off(); Light.base = SURF_RGB.grass; UI.toast(t('x_walk_tip'), 4200); hud();
    },
    exit(){ FP.bounds = null; },
    update(dt, time, live){
      // jump: simple vertical offset on top of the rig
      if(live && IN.pressed('jump') && !st.air){ st.vy = 4.2; st.air = true; Feel.jump(false); }
      if(st.air){ st.vy -= 14*dt; st.y += st.vy*dt; if(st.y <= 0){ st.y = 0; st.air = false; const k = clamp(-st.vy/6, 0.3, 1.2); Feel.land(k, keyAt(E.camera.position.z)); st.step = 0; } }
      const {moved} = FP.update(dt, {look:live, move:live, speed:2.4, yOff:st.y});
      const key = keyAt(E.camera.position.z);
      if(key !== st.key){ st.key = key; UI.zone(t('surf_' + key), SURF_RGB[key]); Light.base = SURF_RGB[key].map(v => v*0.6); }
      if(!st.air && moved > 0.3){ st.step += moved*dt; const stride = moved > 3.2 ? 1.5 : 1.05; if(st.step >= stride){ st.step -= stride; st.foot ^= 1; Feel.step(key, st.foot === 0, false, clamp(0.6 + moved/5, 0.7, 1.15)); } }
      else if(moved <= 0.3) st.step = 0.7;
      if(key === 'snow' && Math.random() < dt*12) FX.burst(new THREE.Vector3(E.camera.position.x + rnd(-5, 5), 5, E.camera.position.z + rnd(-6, 2)), {n:1, color:0xffffff, size:0.03, up:-0.8, speed:0.3, life:4, gravity:0.3});
      hud();
    }
  };
}
