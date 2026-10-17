// Hub island: portals to each stage, a few surfaces to play with, buddy bots, sea.
import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { spawn } from './assets.js';
import { surfaceTexture } from './textures.js';
import { E, Cam, FX, clamp } from './engine.js';
import { IN } from './input.js';
import { Feel, Light } from './feel.js';
import { H } from './haptics.js';
import { SND } from './sound.js';
import { UI, Save, $ } from './ui.js';
import { t } from './i18n.js';

export const STAGES = [
  {id:'st1', icon:'👣', color:0x7ee0a0, need:0, ready:true},
  {id:'st2', icon:'⚔️', color:0xff8a7a, need:2, ready:false},
  {id:'st3', icon:'🎯', color:0xffc86b, need:4, ready:false},
  {id:'st4', icon:'🏹', color:0x9fe06b, need:6, ready:false},
  {id:'st5', icon:'🪓', color:0x8fd8ff, need:8, ready:false},
  {id:'st6', icon:'⛈️', color:0xb59bff, need:10, ready:false},
  {id:'st7', icon:'👑', color:0xffe27a, need:14, ready:false}
];

function iconSprite(emoji, color){
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 20, 128, 128, 124); gr.addColorStop(0, '#ffffffee'); gr.addColorStop(0.7, '#' + color.toString(16).padStart(6, '0') + 'cc'); gr.addColorStop(1, '#00000000');
  g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
  g.font = '130px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emoji, 128, 138);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthWrite:false})); s.scale.set(1.5, 1.5, 1); return s;
}

export function makeHub(G){
  const w = new World(); w.fallY = -1.6; w.fallFx = 'splash';
  const root = w.group;
  // sea
  const seaTex = surfaceTexture('water'); seaTex.repeat.set(70, 70);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({map:seaTex, color:0x9fd0ff, roughness:0.18, metalness:0.15}));
  sea.rotation.x = -Math.PI/2; sea.position.y = -0.35; sea.receiveShadow = true; root.add(sea);
  // island
  w.disc(0, 0, 27, -0.15, 'water', {visible:false});
  w.disc(0, 0, 22.5, 0.02, 'sand', {thick:3, taper:1.2});
  w.disc(0, 0, 19, 0.25, 'grass', {thick:3.2, taper:1.12});
  w.disc(0, 0, 5.5, 0.4, 'stone', {thick:0.5, tile:3});
  // pier (south) and iron bridge to an islet (east)
  w.slab(-1.6, 18, 1.6, 34, 0.42, 'wood', {thick:0.3, tile:3.2});
  for(let z = 20; z <= 34; z += 3.5) for(const x of [-1.5, 1.5]){ const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.6, 8), new THREE.MeshStandardMaterial({color:0x6b4426, roughness:0.9})); post.position.set(x, -0.2, z); post.castShadow = true; root.add(post); }
  w.ramp(19, -1.6, 21, 1.6, 0.25, 0.7, 'metal', 'x'); w.slab(21, -1.6, 29.5, 1.6, 0.7, 'metal', {thick:0.3, tile:3.2}); w.ramp(29.5, -1.6, 31.5, 1.6, 0.7, 0.25, 'metal', 'x');
  for(const z of [-1.7, 1.7]){ const rail = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.08, 0.08), new THREE.MeshStandardMaterial({color:0x8a96a6, metalness:0.8, roughness:0.3})); rail.position.set(25.25, 1.5, z); root.add(rail); w.collider(25.25 - 6, z*1.15, 0.01); }
  w.disc(36, 0, 5.5, 0.25, 'grass', {thick:3, taper:1.15}); w.disc(36, 0, 6.6, 0.02, 'sand', {thick:2.6, taper:1.2});
  // snowy knoll (north-west) for a 5th texture right in the hub
  w.disc(-15, -6, 3.6, 0.55, 'snow', {thick:0.6, seg:40});
  // decorations
  const deco = (k, x, z, s = {}) => { const m = spawn(k, s); m.root.position.set(x, w.groundAt(x, z).h, z); m.root.rotation.y = s.rot ?? Math.random()*6.28; root.add(m.root); if(s.col) w.collider(x, z, s.col); return m; };
  const treeSpots = [[-17, 6], [-12, 13], [-6, 17], [7, 16.5], [13, 12], [17, 5], [16, -9], [-18, -1], [-9, -16], [9, -16.5], [-14, -12.5], [14, -13.5], [3, -18], [-3, -18.3]];
  treeSpots.forEach(([x, z]) => deco('tree', x, z, {col:0.45, height:3 + Math.random()*1.4}));
  [[-4.4, -2.6], [4.4, -2.6], [-1.7, -4.9], [1.7, -4.9]].forEach(([x, z]) => deco('column', x, z, {col:0.35, rot:0, height:1.9}));
  deco('banner', -5.6, 1.2, {rot:Math.PI/2}); deco('banner', 5.6, 1.2, {rot:-Math.PI/2});
  const trophy = deco('trophy', 36, 0, {height:1.1, col:0.5});
  deco('statue', -15, -6, {height:2.4, col:0.6, rot:0.6});
  for(let i = 0; i < 70; i++){ const a = Math.random()*6.28, r = 7 + Math.random()*11, x = Math.cos(a)*r, z = Math.sin(a)*r; if(Math.abs(x) < 2.5 && z > 15) continue; deco(Math.random() < 0.5 ? 'grass' : 'grassSmall', x, z, {shadow:false}); }
  const clouds = []; for(let i = 0; i < 9; i++){ const c = spawn('cloud', {height:2 + Math.random()*2.5, shadow:false}); const a = i/9*6.28, r = 40 + Math.random()*30; c.root.position.set(Math.cos(a)*r, 14 + Math.random()*10, Math.sin(a)*r); root.add(c.root); clouds.push({c, a, r, sp:0.01 + Math.random()*0.015}); }
  // buddies
  const buddies = [[-3.2, -0.6, 0.6], [3.1, 0.4, -0.9], [-1.2, -3.2, 0.2]].map(([x, z, r]) => { const b = spawn('buddy'); b.root.position.set(x, 0.4, z); b.root.rotation.y = r; root.add(b.root); b.ready.then(() => b.play('idle')); w.collider(x, z, 0.4); return {b, x, z, hop:0, cd:0}; });
  // portals
  const portals = STAGES.map((s, i) => {
    const a = -Math.PI*0.86 + i*(Math.PI*0.72/(STAGES.length - 1)), x = Math.cos(a)*12, z = Math.sin(a)*12;
    w.disc(x, z, 1.7, 0.5, 'stone', {thick:0.6, seg:32});
    const col = new THREE.Color(s.color), g = new THREE.Group(); g.position.set(x, 0.5, z); root.add(g);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.09, 12, 48), new THREE.MeshStandardMaterial({color:col, emissive:col, emissiveIntensity:1.6})); ring.rotation.x = Math.PI/2; ring.position.y = 0.05; g.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 7, 32, 1, true), new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0.13, side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending})); beam.position.y = 3.5; g.add(beam);
    const icon = iconSprite(s.icon, s.color); icon.position.y = 2.6; g.add(icon);
    const light = new THREE.PointLight(col, 4, 6); light.position.y = 1.2; g.add(light);
    const label = document.createElement('div'); label.className = 'portal-label'; $('labels').appendChild(label);
    return {...s, x, z, g, ring, beam, icon, light, label, a};
  });
  const player = new Player(w);
  let hum = 0, near = null, wasNear = null, seaBed = null, buddyT = 0;

  function refresh(){
    const total = Save.total();
    portals.forEach(p => {
      p.open = p.ready && total >= p.need; const st = Save.stars(p.id).filter(Boolean).length;
      p.label.innerHTML = `${t(p.id)}<small>${p.ready ? (p.open ? '★'.repeat(st) + '☆'.repeat(3 - st) : t('locked', {n:p.need})) : t('soon')}</small>`;
      p.ring.material.emissiveIntensity = p.open ? 1.6 : 0.25; p.beam.material.opacity = p.open ? 0.13 : 0.04; p.light.intensity = p.open ? 4 : 0.6; p.icon.material.opacity = p.open ? 1 : 0.45;
    });
    $('hTitle').textContent = t('title'); $('hSub').innerHTML = `★ ${total} / ${STAGES.length*3}`;
    $('hRight').innerHTML = '';
    $('hCtl').innerHTML = `${UI.key('jump')} ${t('ctl_jump')} · ${UI.key('interact')} ${t('ctl_enter')} · ${UI.key('pause')} ☰`;
  }
  const S = {
    id: 'hub', world: w, player,
    enter(from){
      E.setWorld(root); E.setSky(0x3d8be0, 0xd3e9fb, 0x8db0c6, 0xcfe4f6); E.scene.fog.near = 70; E.scene.fog.far = 260;
      const back = portals.find(p => p.id === from);
      if(back) player.place(back.x*0.75, 0.5, back.z*0.75, Math.atan2(-back.x, -back.z) + Math.PI);
      else player.place(0, 0.4, 3, Math.PI);
      Cam.yaw = back ? Math.atan2(-back.x, -back.z) : 0; Cam.pitch = 0.38; Cam.dist = 8;
      Cam.ground = (x, z) => w.groundAt(x, z).h;
      $('labels').style.display = ''; refresh(); Light.base = [40, 110, 255];
      seaBed = SND.bed({type:'lowpass', f:520, lfo:0.11}); seaBed.set(0.25, 1.5);
    },
    exit(){ $('labels').style.display = 'none'; if(seaBed) seaBed.stop(); },
    update(dt, time, live){
      w.update(dt, time);
      seaTex.offset.x = time*0.008; seaTex.offset.y = time*0.005;
      clouds.forEach(o => { o.a += o.sp*dt; o.c.root.position.x = Math.cos(o.a)*o.r; o.c.root.position.z = Math.sin(o.a)*o.r; });
      trophy.root.rotation.y += dt*0.8;
      portals.forEach((p, i) => { p.ring.rotation.z += dt*(p.open ? 1.2 : 0.2); p.icon.position.y = 2.6 + Math.sin(time*2 + i)*0.12; p.beam.material.opacity = (p.open ? 0.11 : 0.04) + (p.open ? Math.sin(time*3 + i)*0.03 : 0); });
      player.locked = !live;
      player.update(dt);
      // buddies hop happily when you come close
      buddies.forEach(o => { o.b.update(dt); o.cd -= dt; const d = Math.hypot(player.p.x - o.x, player.p.z - o.z);
        o.b.root.rotation.y += (Math.atan2(player.p.x - o.x, player.p.z - o.z) - o.b.root.rotation.y)*Math.min(1, dt*3)*(d < 6 ? 1 : 0);
        if(d < 2.2 && o.cd <= 0 && live){ o.cd = 2.5; o.hop = 0.001; o.b.once('jump', () => o.b.play('idle')); const pan = Cam.panOf(o.x, o.z); H.pulse(260, 0.5, 0.04, pan); H.pulse(380, 0.4, 0.04, pan, 0.09); SND.notes([880, 1175], 0.08, {gain:0.06, type:'square', pan}); }
        if(o.hop > 0){ o.hop += dt; const k = o.hop/0.6; o.b.root.position.y = 0.4 + Math.max(0, Math.sin(Math.min(1, k)*Math.PI))*0.6; if(k >= 1) o.hop = 0; } });
      // portal proximity: hum gets stronger and pans toward the portal
      near = null; let best = 1e9;
      portals.forEach(p => { const d = Math.hypot(player.p.x - p.x, player.p.z - p.z); if(d < best){ best = d; near = p; } });
      if(live && near && best < 4.5){ hum += dt; const k = clamp(1 - best/4.5, 0, 1); if(hum > 0.2 - 0.1*k){ hum = 0; if(near.open) Feel.portal(k, Cam.panOf(near.x, near.z)); } Light.base = near.open ? [(near.color >> 16)*0.8, ((near.color >> 8) & 255)*0.8, (near.color & 255)*0.8] : [40, 40, 60]; }
      else Light.base = [40, 110, 255];
      const on = live && near && best < 1.6;
      if(on){ UI.prompt(near.open ? `${UI.glyph('interact')}  ${t(near.id)}` : (near.ready ? t('locked', {n:near.need}) : t('soon'))); if(near !== wasNear){ if(near.open) H.pulse(300, 0.7, 0.04); } }
      else UI.prompt(null);
      wasNear = on ? near : null;
      if(on && IN.pressed('interact')){ if(near.open) G.enterStage(near.id); else Feel.uiError(); }
      if(seaBed) seaBed.set(0.12 + 0.35*clamp((Math.hypot(player.p.x, player.p.z) - 12)/12, 0, 1), 0.5);
      // labels over portals
      const v = new THREE.Vector3(), cam = E.camera;
      portals.forEach(p => { v.set(p.x, 4.0, p.z).project(cam); const vis = v.z < 1 && Math.hypot(player.p.x - p.x, player.p.z - p.z) < 26; p.label.style.display = vis ? '' : 'none';
        if(vis){ p.label.style.left = ((v.x + 1)/2*innerWidth) + 'px'; p.label.style.top = ((1 - v.y)/2*innerHeight) + 'px'; } });
      Cam.target.set(player.p.x, player.p.y + 1.1, player.p.z);
      if(!live){ Cam.yaw += dt*0.06; }
      Cam.update(dt, live ? {x:IN.lx + IN.mouseDX*0.08, y:IN.ly + IN.mouseDY*0.06} : null);
      E.followSun(player.p);
    },
    refresh
  };
  return S;
}
