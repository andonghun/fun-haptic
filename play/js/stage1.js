// Stage 1 — "Underfoot": find six treasures by touch. Each treasure is hidden on a different surface;
// a haptic "heartbeat" gets faster and stronger as you get close and comes from the side it is on.
import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { spawn } from './assets.js';
import { surfaceTexture, surfaceMaterial } from './textures.js';
import { E, Cam, FX, clamp, lerp } from './engine.js';
import { IN } from './input.js';
import { Feel, Light, SURF_RGB } from './feel.js';
import { H } from './haptics.js';
import { SND } from './sound.js';
import { DS } from './ds.js';
import { UI, $ } from './ui.js';
import { t } from './i18n.js';

const rnd = (a, b) => a + Math.random()*(b - a);
const TIME_STAR = 180;

// ground plane with holes cut out (ponds/rivers): an alpha map hides the grass where water sits
function baseGround(w, x0, z0, x1, z1, key, holes){
  w.slab(x0, z0, x1, z1, 0, key, {visible:false, pri:0});
  const W = x1 - x0, D = z1 - z0, c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 1024, 1024); g.fillStyle = '#000';
  holes.forEach(([a, b, cc, d]) => g.fillRect((a - x0)/W*1024, (b - z0)/D*1024, (cc - a)/W*1024, (d - b)/D*1024));
  const am = new THREE.CanvasTexture(c);
  const mat = surfaceMaterial(key, W, D, 4); mat.alphaMap = am; mat.alphaTest = 0.5;
  const geo = new THREE.PlaneGeometry(W, D); geo.rotateX(-Math.PI/2);
  const m = new THREE.Mesh(geo, mat); m.position.set((x0 + x1)/2, 0, (z0 + z1)/2); m.receiveShadow = true; w.add(m);
  // the land continues past the playable area (fog hides the far edge); walls keep the player inside
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), surfaceMaterial(key, 420, 420, 6)); outer.rotation.x = -Math.PI/2; outer.position.set((x0 + x1)/2, -0.62, (z0 + z1)/2); outer.receiveShadow = true; w.add(outer);
  [[x0, z0, x1, z0 + 0.01], [x0, z1 - 0.01, x1, z1], [x0, z0, x0 + 0.01, z1], [x1 - 0.01, z0, x1, z1]].forEach(([a, b, c2, d]) => {   // grassy berm along the border
    const bm = new THREE.Mesh(new THREE.BoxGeometry(Math.max(1.2, c2 - a), 1.2, Math.max(1.2, d - b)), mat.clone()); bm.material.alphaMap = null; bm.material.alphaTest = 0; bm.position.set((a + c2)/2, -0.62, (b + d)/2); bm.receiveShadow = true; w.add(bm); });
  w.bounds = {x0:x0 + 0.8, x1:x1 - 0.8, z0:z0 + 0.8, z1:z1 - 0.8};
}
function waterBody(w, x0, z0, x1, z1, time){
  w.slab(x0, z0, x1, z1, -0.32, 'water', {visible:false, cut:true});
  const bed = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.2, z1 - z0), surfaceMaterial('sand', x1 - x0, z1 - z0, 3)); bed.position.set((x0 + x1)/2, -0.45, (z0 + z1)/2); bed.receiveShadow = true; w.add(bed);
  const tex = surfaceTexture('water'); tex.repeat.set((x1 - x0)/5, (z1 - z0)/5);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({map:tex, color:0xa8d8ff, roughness:0.12, metalness:0.1, transparent:true, opacity:0.78, depthWrite:false}));
  s.rotation.x = -Math.PI/2; s.position.set((x0 + x1)/2, -0.1, (z0 + z1)/2); w.add(s);
  w.onUpdate((dt, tt) => { tex.offset.x = tt*0.02; tex.offset.y = Math.sin(tt*0.3)*0.05; });
}

export function makeStage1(G){
  const w = new World(); w.fallY = -6; const root = w.group;
  const POND = [10, -2, 32, 18], RIVER = [-40, 12, -6, 18];
  baseGround(w, -40, -40, 40, 42, 'grass', [POND, RIVER]);
  waterBody(w, ...POND); waterBody(w, ...RIVER);
  // sand rim around the pond
  [[8, -4, 34, -2], [8, 18, 34, 20], [8, -2, 10, 18], [32, -2, 34, 18]].forEach(r => w.slab(...r, 0.03, 'sand', {thick:0.2, tile:3}));
  // gravel paths
  [[-1.8, 4, 1.8, 40], [-12, -1.8, -1.8, 1.8], [1.8, -1.8, 8, 1.8], [-1.8, -26, 1.8, -1.8], [1.8, -20, 12, -16.4]].forEach(r => w.slab(...r, 0.04, 'gravel', {thick:0.2, tile:2.5}));
  // stone plaza (west) with ruins
  w.slab(-34, -12, -12, 6, 0.2, 'stone', {thick:0.4, tile:3});
  // snowfield (north-east)
  w.slab(12, -38, 38, -12, 0.12, 'snow', {thick:0.3, tile:4});
  // old wooden deck (north)
  w.slab(-10, -38, 6, -26, 0.38, 'wood', {thick:0.5, tile:3.2});
  // boardwalk across the pond
  w.slab(19.5, -6, 22.5, 22, 0.36, 'wood', {thick:0.3, tile:3});
  // iron bridge over the river
  w.ramp(-24, 8.4, -20, 10.6, 0.02, 0.62, 'metal', 'z'); w.slab(-24, 10.6, -20, 19.4, 0.62, 'metal', {thick:0.25, tile:3}); w.ramp(-24, 19.4, -20, 21.6, 0.62, 0.02, 'metal', 'z');
  const post = (x, z, h = 1.4) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, h, 8), new THREE.MeshStandardMaterial({color:0x6b4426, roughness:0.9})); p.position.set(x, -0.1 + h/2 - 0.5, z); p.castShadow = true; root.add(p); };
  for(let z = -4; z <= 20; z += 4){ post(19.5, z); post(22.5, z); }
  const railM = new THREE.MeshStandardMaterial({color:0x8d99a8, metalness:0.85, roughness:0.3});
  for(const x of [-24.1, -19.9]){ const rl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 8.8), railM); rl.position.set(x, 1.55, 15); rl.castShadow = true; root.add(rl);
    for(let z = 11; z <= 19; z += 2){ const pp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.08), railM); pp.position.set(x, 1.1, z); root.add(pp); } }

  // treasures: one per surface, randomised inside its area
  const AREAS = [
    {key:'grass', r:[-36, 22, -14, 36]}, {key:'stone', r:[-31, -10, -15, 4]}, {key:'snow', r:[14, -36, 36, -14]},
    {key:'water', r:[12, 1, 17.5, 16]}, {key:'wood', r:[-9, -37, 5, -27]}, {key:'metal', r:[-23.4, 11.2, -20.6, 18.8]}
  ];
  const treasures = AREAS.map(a => { const x = rnd(a.r[0], a.r[2]), z = rnd(a.r[1], a.r[3]); return {key:a.key, x, z, found:false, prog:0}; });
  const clear = (x, z, d) => treasures.every(tr => Math.hypot(tr.x - x, tr.z - z) > d) && Math.hypot(x, z - 33) > 5;

  // decorations
  const deco = (k, x, z, o = {}) => { if(o.keep !== true && !clear(x, z, 2.2)) return null; const m = spawn(k, o); m.root.position.set(x, w.groundAt(x, z).h, z); m.root.rotation.y = o.rot ?? Math.random()*6.28; root.add(m.root); if(o.col) w.collider(x, z, o.col); return m; };
  for(let i = 0; i < 46; i++){ const x = rnd(-38, 38), z = rnd(-38, 40), g = w.groundAt(x, z); if(g.key !== 'grass' || Math.abs(x) < 4) continue; deco('tree', x, z, {col:0.45, height:rnd(2.8, 4.4)}); }
  for(let i = 0; i < 22; i++){ const x = rnd(13, 37), z = rnd(-37, -13); deco('tree', x, z, {col:0.45, height:rnd(2.6, 4), frost:true}); }
  [[-30, -9], [-30, 3], [-16, -9], [-16, 3], [-23, -10.5], [-23, 4.5]].forEach(([x, z], i) => deco(i % 3 === 2 ? 'columnBroken' : 'column', x, z, {col:0.4, rot:0}));
  deco('statue', -23, -3, {height:2.8, col:0.7, rot:Math.PI/2});
  deco('banner', -9.5, -27, {rot:0}); deco('banner', 5.5, -27, {rot:0});
  for(let i = 0; i < 140; i++){ const x = rnd(-38, 38), z = rnd(-38, 40); if(w.groundAt(x, z).key === 'grass') deco(Math.random() < 0.5 ? 'grass' : 'grassSmall', x, z, {shadow:false, keep:true}); }
  // forest ring outside the playable area (silhouette + hides the edge)
  for(let i = 0; i < 120; i++){ const a = Math.random()*6.28, r = rnd(46, 80), x = Math.cos(a)*r, z = 1 + Math.sin(a)*r; const m = spawn('tree', {height:rnd(4, 7.5), shadow:false}); m.root.position.set(x, -0.62, z); m.root.rotation.y = Math.random()*6.28; root.add(m.root); }
  [[-90, -60, 26], [70, -95, 34], [110, 20, 30], [-110, 50, 28], [20, 110, 24]].forEach(([x, z, r]) => { const h = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), new THREE.MeshStandardMaterial({color:0x5f9a52, roughness:1})); h.scale.y = 0.35; h.position.set(x, -4, z); root.add(h); });
  const clouds = []; for(let i = 0; i < 8; i++){ const c = spawn('cloud', {height:rnd(2.5, 4.5), shadow:false}); c.root.position.set(rnd(-60, 60), rnd(18, 28), rnd(-60, 60)); root.add(c.root); clouds.push(c); }
  // exit portal (behind spawn), opens after 3 treasures
  const exitG = new THREE.Group(); exitG.position.set(0, 0.04, 38); root.add(exitG);
  const exitRing = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.09, 12, 48), new THREE.MeshStandardMaterial({color:0x8fffc8, emissive:0x8fffc8, emissiveIntensity:0.2})); exitRing.rotation.x = Math.PI/2; exitG.add(exitRing);
  const exitBeam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 6, 32, 1, true), new THREE.MeshBasicMaterial({color:0x8fffc8, transparent:true, opacity:0, side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending})); exitBeam.position.y = 3; exitG.add(exitBeam);

  const player = new Player(w);
  const st = {time:0, found:0, ping:0, zoneKey:null, zoneT:0, digT:0, bird:3, flake:0, done:false, exitOpen:false, celebrate:0};
  let streamBed = null, windBed = null;
  const nearest = () => { let best = null, bd = 1e9; treasures.forEach(tr => { if(tr.found) return; const d = Math.hypot(player.p.x - tr.x, player.p.z - tr.z); if(d < bd){ bd = d; best = tr; } }); return [best, bd]; };

  function hud(){
    $('hTitle').textContent = t('st1'); $('hSub').textContent = t('s1_goal', {n:st.found, m:treasures.length});
    $('hCtl').innerHTML = `${UI.key('jump')} ${t('ctl_jump')} · ${UI.key('pause')} ☰`;
  }
  function reveal(tr){
    tr.found = true; st.found++; st.hold = true; player.locked = true; player.setAnim('yes', {once:true, restart:true});
    setTimeout(() => { if(!st.done) st.hold = false; }, 1400);
    const h = w.groundAt(tr.x, tr.z).h, pos = new THREE.Vector3(tr.x, h + 0.1, tr.z);
    Feel.reveal(Cam.panOf(tr.x, tr.z)); Cam.shake(0.12);
    FX.burst(pos, {n:30, color:0xffd25e, size:0.09, up:5, speed:3, life:1.2}); FX.burst(pos, {n:14, color:new THREE.Color(...(SURF_RGB[tr.key] || [200,200,200]).map(v => v/255)).getHex(), size:0.1, up:3, speed:2.5});
    const tro = spawn('trophy', {height:0.8}); tro.root.position.copy(pos); root.add(tro.root); tr.obj = tro; tr.rise = 0;
    UI.toast(t('s1_found', {n:st.found, m:treasures.length}), 2000); hud();
    if(st.found === 3 && treasures.length > 3){ st.exitOpen = true; setTimeout(() => { UI.toast(t('s1_exit_open'), 2600); SND.notes([523, 784], 0.12, {gain:0.08}); }, 2100); }
    if(st.found === treasures.length){ st.done = true; st.celebrate = 3.2; setTimeout(() => { st.hold = true; player.setAnim('dance', {restart:true}); Feel.fanfare(); }, 1500); }
  }
  function finish(){
    G.finishStage({id:'st1', time:st.time, got:[st.found >= 3, st.found >= 6, st.found >= 6 && st.time <= TIME_STAR], goals:[t('s1_star1'), t('s1_star2'), t('s1_star3')]});
  }

  return {
    id: 'st1', world: w, player,
    enter(){
      E.setWorld(root); E.setSky(0x4a90de, 0xd9ecfa, 0x93ad8e, 0xd6e7f2); E.scene.fog.near = 45; E.scene.fog.far = 140;
      player.place(0, 0.05, 33, Math.PI); Cam.yaw = 0; Cam.pitch = 0.36; Cam.dist = 7.5; Cam.ground = (x, z) => w.groundAt(x, z).h;
      hud(); UI.toast(t('s1_intro'), 4200); Light.base = [40, 110, 255];
      streamBed = SND.bed({type:'bandpass', f:1400, q:0.6, lfo:0.4}); windBed = SND.bed({type:'lowpass', f:300, lfo:0.07});
    },
    exit(){ streamBed && streamBed.stop(); windBed && windBed.stop(); },
    update(dt, time, live){
      w.update(dt, time); player.locked = !!st.hold || !live;
      if(live && !st.done) st.time += dt;
      clouds.forEach((c, i) => { c.root.position.x += dt*(0.3 + i*0.05); if(c.root.position.x > 70) c.root.position.x = -70; });
      player.update(dt);
      if(!live){ Cam.target.set(player.p.x, player.p.y + 1.1, player.p.z); Cam.update(dt, null); E.followSun(player.p); return; }
      const p = player.p;
      // surface name when you step onto something new
      if(player.ground && player.key !== st.zoneKey){ st.zoneT += dt; if(st.zoneT > 0.25){ st.zoneKey = player.key; st.zoneT = 0; UI.zone(t('surf_' + player.key), SURF_RGB[player.key] || [255,255,255]); } } else st.zoneT = 0;
      // treasure radar
      const [tr, d] = nearest();
      let k = 0;
      if(tr){
        k = clamp(1 - d/24, 0, 1); const period = d > 24 ? 2.2 : lerp(1.45, 0.2, Math.pow(k, 1.25));
        st.ping += dt;
        if(st.ping > period && !tr.digging){ st.ping = 0; Feel.ping(k, Cam.panOf(tr.x, tr.z)); const so = $('hSonar'); so.classList.remove('ping'); void so.offsetWidth; so.style.borderColor = `rgba(255,210,94,${0.25 + 0.75*k})`; so.classList.add('ping'); }
        Light.base = [lerp(40, 255, k), lerp(110, 190, k), lerp(255, 40, k)];
      } else Light.base = [255, 200, 60];
      // digging
      const canDig = tr && d < 1.7 && player.ground && !st.hold;
      if(canDig){
        UI.prompt(DS.connected ? '🖐 ' + t('s1_dig_ds') : t('s1_dig_other', {b:UI.glyph('interact')}));
        let add = 0, k2 = 0;
        if(DS.connected && IN.touchDown && IN.touchRub > 0.04){ add = IN.touchRub*dt*0.85; k2 = IN.touchRub; }
        if(IN.pressed('interact')){ add += 0.14; k2 = Math.max(k2, 0.8); }
        if(add > 0){
          tr.prog = Math.min(1, tr.prog + add); tr.digging = true; st.digT += dt;
          if(st.digT > 0.075 || IN.pressed('interact')){ st.digT = 0; Feel.dig(tr.key, k2, Cam.panOf(tr.x, tr.z)*0.4);
            FX.burst(new THREE.Vector3(tr.x, w.groundAt(tr.x, tr.z).h + 0.05, tr.z), {n:3, color:new THREE.Color(...(SURF_RGB[tr.key] || [180,160,120]).map(v => v/255)).getHex(), size:0.07, up:2.5, speed:1.5, life:0.6}); }
          player.face = Math.atan2(tr.x - p.x, tr.z - p.z); player.animHold = 0.3; if(player.anim !== 'punch') player.setAnim('punch', {speed:1.6});
          $('hBarW').style.display = ''; $('hBar').style.width = (tr.prog*100).toFixed(0) + '%';
          if(tr.prog >= 1){ $('hBarW').style.display = 'none'; reveal(tr); }
        } else if(tr.digging){ tr.digging = false; }
      } else { UI.prompt(null); $('hBarW').style.display = tr && tr.prog > 0 && d < 3 ? '' : 'none'; if(tr) tr.digging = false; }
      // found trophies rise and spin
      treasures.forEach(o => { if(o.obj && o.rise < 1){ o.rise = Math.min(1, o.rise + dt*1.5); o.obj.root.position.y = w.groundAt(o.x, o.z).h + 0.1 + Math.sin(o.rise*Math.PI*0.5)*1.2; } if(o.obj) o.obj.root.rotation.y += dt*2; });
      // exit portal
      exitRing.rotation.z += dt*(st.exitOpen ? 1.5 : 0.2); exitRing.material.emissiveIntensity = st.exitOpen ? 1.6 : 0.2; exitBeam.material.opacity = st.exitOpen ? 0.12 + Math.sin(time*3)*0.03 : 0;
      if(st.exitOpen && !st.done && Math.hypot(p.x - 0, p.z - 38) < 1.5){ UI.prompt(`${UI.glyph('interact')}  ${t('to_hub')}`); if(IN.pressed('interact')) { st.done = true; finish(); } }
      if(st.celebrate > 0){ st.celebrate -= dt; if(st.celebrate <= 0) finish(); }
      // ambience
      const dRiver = Math.max(0, Math.abs(p.z - 15) - 3), dPond = Math.max(0, Math.hypot(Math.max(0, Math.abs(p.x - 21) - 11), Math.max(0, Math.abs(p.z - 8) - 10)));
      streamBed && streamBed.set(0.32*clamp(1 - Math.min(p.x < -6 ? dRiver : 99, dPond)/14, 0, 1)*0.9 + 0.02, 0.4);
      const inSnow = player.key === 'snow'; windBed && windBed.set(inSnow ? 0.3 : 0.05, 0.8);
      if(inSnow){ st.flake += dt; if(st.flake > 0.05){ st.flake = 0; FX.burst(new THREE.Vector3(p.x + rnd(-6, 6), p.y + rnd(4, 7), p.z + rnd(-6, 6)), {n:1, color:0xffffff, size:0.05, up:-1, speed:0.4, life:3, gravity:0.4}); } }
      st.bird -= dt; if(st.bird < 0){ st.bird = rnd(2.5, 7); const f = rnd(2200, 3400), pan = rnd(-0.8, 0.8); for(let i = 0; i < 3; i++) SND.tone({t:i*0.09, f:f*(1 + i*0.08), fEnd:f*1.25, dur:0.07, gain:0.025, pan}); }
      Cam.target.set(p.x, p.y + 1.1, p.z);
      Cam.update(dt, {x:IN.lx + IN.mouseDX*0.08, y:IN.ly + IN.mouseDY*0.06});
      E.followSun(p);
    },
    debugTreasures: () => treasures
  };
}
