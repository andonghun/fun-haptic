/* 미니 봇 어드벤처 — 3D 플랫포머 모드. index.html 의 햅틱/오디오/입력 인프라를 그대로 사용한다.
   효과음: sounds/game/*.ogg (Kenney Starter-Kit-3D-Platformer, CC0/MIT) + 합성음. 자세한 출처는 sounds/game/CREDITS.txt */
(() => {
const FILES = ['coin', 'jump', 'land', 'break', 'fall'];
const GH = {coin:[260,700], jump:[95,300], land:[55,260], break:[120,420], fall:[70,200]};   // 소리→햅틱 변환: [저역 캐리어, 첫 타격 클릭]
const gdec = new WeakMap(); let graw = null;
async function gLoad(ctx){
  if(gdec.has(ctx)) return; const m = {}; gdec.set(ctx, m);
  try{ graw = graw || await Promise.all(FILES.map(f => fetch('sounds/game/' + f + '.ogg').then(r => r.arrayBuffer())));
    for(let i = 0; i < FILES.length; i++){ const snd = await ctx.decodeAudioData(graw[i].slice(0)); m[FILES[i]] = {snd, hap: makeHaptic(ctx, snd, GH[FILES[i]][0], GH[FILES[i]][1])}; }
  }catch(e){ console.warn('game sfx', e); }
}
// 소리(컨트롤러 스피커 또는 PC) + 같은 파일에서 변환한 햅틱(좌우 팬)
function sfx(name, o = {}){
  const rate = o.rate || 1, pan = o.pan || 0, A = audioOut(); gLoad(A.ctx);
  const e = (gdec.get(A.ctx) || {})[name]; if(e && o.vol !== 0) playBuf(A.ctx, e.snd, A.dest, rate, (o.vol == null ? 0.8 : o.vol));
  const hg = o.hap == null ? 1.4 : o.hap; if(!hg) return;
  if(hx.on) hx.send({t:'gsample', k:name, r:rate, g:hg, p:pan}); else if(hap.ready && e) playHapPan(e.hap, rate, hg, pan);
}
const synth = () => audioOut();
const jingle = (notes, step, type, gain) => { const a = synth(); notes.forEach((f, i) => tn(a, {t:i*step, f, dur:0.2, gain:gain || 0.16, type:type || 'triangle'})); };

/* ---------- 월드 ---------- */
const G = new THREE.Group(); G.visible = false; scene.add(G);
const PLAT = [];     // {minx,maxx,minz,maxz,top,key,mesh,mover}
function mkPlat(cx, top, cz, w, d, key, mover){
  const c = SURF_COLOR[key], mat = new THREE.MeshStandardMaterial({color:new THREE.Color(c[0]/255, c[1]/255, c[2]/255), roughness:key === 'metal' ? 0.35 : 0.85, metalness:key === 'metal' ? 0.5 : 0});
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, d), mat); mesh.position.set(cx, top - 0.8, cz); G.add(mesh);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.12, d + 0.1), new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.6})); edge.position.set(0, 0.8, 0); mesh.add(edge);
  const p = {w, d, top, key, mesh, mover, cx, cz, px:cx, dx:0, minx:cx - w/2, maxx:cx + w/2, minz:cz - d/2, maxz:cz + d/2}; PLAT.push(p); return p;
}
const LV = [
  mkPlat(0, 0, 0, 12, 12, 'metal'), mkPlat(0, 0, -13, 4, 14, 'wood'), mkPlat(0, 0, -29, 16, 16, 'grass'),
  mkPlat(6, 1, -41, 4, 4, 'stone'), mkPlat(10, 2.5, -46, 4, 4, 'stone'), mkPlat(5, 4, -51, 4, 4, 'stone'),
  mkPlat(0, 4, -58, 5, 5, 'wood', {axis:'x', amp:5, sp:0.7}),
  mkPlat(0, 4, -72, 16, 16, 'snow'),
  mkPlat(0, 11, -87, 9, 9, 'metal'), mkPlat(0, 11, -97, 3, 3, 'stone'), mkPlat(0, 11, -107, 12, 12, 'stone')
];
const SPRING = {x:0, z:-77, base:4, r:1.3}, CHECK = [{x:0, y:0.2, z:-22, got:false}, {x:0, y:4.2, z:-66, got:false}, {x:0, y:11.2, z:-84, got:false}];
const SHIP = {x:0, y:11, z:-107, r:3.2};
(() => {                                  // 스프링 / 체크포인트 / 우주선 / 배경 장식
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 0.4, 20), new THREE.MeshStandardMaterial({color:0xff4d6d, emissive:0x551020})); sp.position.set(SPRING.x, SPRING.base + 0.2, SPRING.z); G.add(sp); SPRING.mesh = sp;
  CHECK.forEach(c => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.4, 4), new THREE.MeshStandardMaterial({color:0x888888, emissive:0x111111})); f.position.set(c.x + 2.5, c.y + 0.7, c.z); G.add(f); c.mesh = f; });
  const ship = new THREE.Group(), hull = new THREE.Mesh(new THREE.SphereGeometry(2.2, 20, 14), new THREE.MeshStandardMaterial({color:0xdde6f5, metalness:0.4, roughness:0.3})); hull.scale.y = 0.7;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 12, 0, 6.3, 0, 1.6), new THREE.MeshStandardMaterial({color:0x4da3ff, emissive:0x113355, transparent:true, opacity:0.8})); dome.position.y = 0.8;
  ship.add(hull, dome); ship.position.set(SHIP.x, SHIP.y + 1.6, SHIP.z); G.add(ship); SHIP.mesh = ship;
  for(let i = 0; i < 70; i++){ const s = new THREE.Mesh(new THREE.SphereGeometry(0.15 + Math.random()*0.25, 6, 4), new THREE.MeshBasicMaterial({color:0xffffff})); s.position.set((Math.random()-0.5)*160, Math.random()*50 - 10, -Math.random()*170 + 20); G.add(s); }
})();
const coinMat = new THREE.MeshStandardMaterial({color:0xffd33d, metalness:0.8, roughness:0.25, emissive:0x553d00});
const COINS = [], CRATES = [], ENEMIES = [], LOST = [];
function addCoin(x, y, z){ const m = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16), coinMat); m.rotation.x = Math.PI/2; const g = new THREE.Group(); g.add(m); g.position.set(x, y, z); G.add(g); const c = {g, x, y, z, got:false}; COINS.push(c); return c; }
[[0,0.9,-4],[0,0.9,-7],[0,0.9,-10],[0,0.9,-13],[0,0.9,-16],[0,0.9,-19],[-4,0.9,-27],[-4,0.9,-30],[4,0.9,-30],[4,0.9,-33],[6,1.9,-41],[10,3.4,-46],[5,4.9,-51],[0,4.9,-58],[-3,4.9,-70],[3,4.9,-70],[-3,4.9,-76],[3,4.9,-76],[0,6.5,-77],[0,9,-83],[0,12,-88],[0,12,-97],[-3,12,-104],[3,12,-104]].forEach(c => addCoin(...c));
function addCrate(x, top, z){ const m = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), new THREE.MeshStandardMaterial({color:0xb8864a, roughness:0.9})); m.position.set(x, top + 0.65, z); G.add(m); CRATES.push({m, x, y:top, z, alive:true}); }
[[-5,0,-26],[-2,0,-33],[5,0,-26],[-6,0,-34],[-4,4,-68],[4,4,-68],[6,4,-76]].forEach(c => addCrate(...c));
function addEnemy(cx, top, cz, range){ const g = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({color:0xe0405a, roughness:0.5})); body.position.y = 0.6; g.add(body);
  [-0.25, 0.25].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({color:0xffffff})); e.position.set(x, 0.75, 0.6); g.add(e); });
  [[0,1.3,0],[0.7,0.6,0],[-0.7,0.6,0]].forEach(p => { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 6), new THREE.MeshStandardMaterial({color:0xffe0e0})); sp.position.set(...p); g.add(sp); });
  G.add(g); ENEMIES.push({g, cx, top, cz, range, t:Math.random()*6, alive:true, x:cx, y:top, z:cz}); }
addEnemy(0, 0, -30, 5); addEnemy(-3, 0, -24, 4); addEnemy(0, 4, -70, 5); addEnemy(0, 4, -66, 4); addEnemy(0, 11, -88, 3);
function addLost(x, top, z){ const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({color:0x6ee7ff, emissive:0x0a3a4a, roughness:0.4});
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), m); b.position.y = 0.45; const h = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), m); h.position.y = 1.0;
  const an = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), m); an.position.y = 1.5; g.add(b, h, an); g.position.set(x, top, z); G.add(g); LOST.push({g, x, y:top, z, got:false, fx:x, fz:z, k:LOST.length}); }
addLost(6, 0, -33); addLost(-6, 4, -76); addLost(0, 11, -89);

/* ---------- 플레이어 ---------- */
const P = {x:0, y:0, z:2, vx:0, vz:0, vy:0, ground:true, plat:null, coyote:0, jumps:0, spinT:0, spinCd:0, pound:false, hp:3, inv:0, coins:0, bots:0, t:0, acc:0, foot:0, face:Math.PI, cut:false, prev:{}, fallSnd:false, state:'play', cp:{x:0, y:0, z:2}, flash:0, flashC:[255,255,255], hum:0, trail:0, g:new THREE.Group(), spin:0};
(() => { const w = new THREE.MeshStandardMaterial({color:0xf2f4f8, roughness:0.4}), b = new THREE.MeshStandardMaterial({color:0x4da3ff, emissive:0x0a2a55, roughness:0.3});
  const body = new THREE.Mesh(THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.42, 0.5, 6, 14) : new THREE.CylinderGeometry(0.42, 0.42, 1.3, 14), w); body.position.y = 0.75;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.26, 0.3), b); visor.position.set(0, 1.0, 0.34);
  const an = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.35, 6), w); an.position.y = 1.5; const ball = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), b); ball.position.y = 1.7;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.9, 8), b); arm.rotation.z = Math.PI/2; arm.position.y = 0.8; arm.visible = false; P.armMesh = arm;
  P.g.add(body, visor, an, ball, arm); G.add(P.g); })();

const hudEl = document.createElement('div');
hudEl.style.cssText = 'position:fixed;right:20px;top:14px;z-index:5;display:none;background:rgba(18,22,31,.85);border:1px solid #4da3ff;border-radius:12px;padding:10px 16px;font-size:18px;font-weight:700;text-align:right';
const toastEl = document.createElement('div');
toastEl.style.cssText = 'position:fixed;left:360px;right:0;top:18%;z-index:6;text-align:center;font-size:26px;font-weight:800;color:#fff;text-shadow:0 2px 12px #000;pointer-events:none;opacity:0;transition:opacity .25s;white-space:pre-line';
document.body.append(hudEl, toastEl); let toastT = null;
function toast(t, ms){ toastEl.textContent = t; toastEl.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => toastEl.style.opacity = 0, ms || 1800); }
function hud(){ hudEl.innerHTML = '🪙 ' + P.coins + ' / ' + COINS.length + ' &nbsp; 🤖 ' + P.bots + ' / ' + LOST.length + ' &nbsp; ' + '❤'.repeat(P.hp) + '<span style="opacity:.3">' + '❤'.repeat(3 - P.hp) + '</span>'; }
const fl = (c, t) => { P.flashC = c; P.flash = t || 0.25; };
const lpg = (s, w, ms) => lp(s, w, ms);

/* ---------- 이벤트 (소리 + 햅틱) ---------- */
function ev_jump(dbl){ sfx('jump', {rate:dbl ? 1.35 : 1, vol:0.7, hap:1.1}); hapPulseP(dbl ? 160 : 110, 0.8, 0.09, 0); if(dbl) nz(synth(), {type:'highpass', f:1800, dur:0.12, gain:0.18}); }
function ev_land(vy){
  const k = clamp(-vy/20, 0.25, 1.4); sfx('land', {rate:1.1 - k*0.2, vol:0.55 + k*0.3, hap:1.1 + k});
  hapPulse(48, 0.7 + k, 0.1 + k*0.18); if(k > 0.6) lpg(255, 200, 80);
}
function ev_coin(c){
  sfx('coin', {vol:0.7, hap:0.7, pan:clamp((c.x - P.x)/3, -1, 1)}); hapPulseP(840, 0.75, 0.022, 0); at(55, () => hapPulseP(1180, 0.65, 0.025, 0)); fl([255,215,60], 0.2); evt('coin');
}
function ev_spin(){
  const a = synth(); nz(a, {f:700, fEnd:2600, q:1.5, dur:0.3, att:0.05, gain:0.3}); tn(a, {f:180, fEnd:420, dur:0.25, gain:0.08});
  for(let i = 0; i < 9; i++) at(i*38, () => hapPulseP(80 + i*12, 0.55 + 0.04*i, 0.05, Math.sin(i*0.9 - 0.6)*0.9));          // 몸을 한 바퀴 돌며 좌→우→좌로 휘감는 진동
}
function ev_crate(c){
  sfx('break', {vol:0.9, hap:2.0, pan:clamp((c.x - P.x)/3, -1, 1)}); hapPulseP(70, 1.2, 0.14, 0);
  for(let i = 0; i < 5; i++) at(40 + i*45, () => hapPulseP(rnd(220, 480), 0.4 - i*0.05, 0.02, rnd(-1, 1)));                    // 파편
  fl([200,140,70], 0.25); evt('crate');
}
function ev_pop(e){
  const a = synth(); tn(a, {f:520, fEnd:90, dur:0.18, gain:0.3, type:'square'}); nz(a, {f:900, dur:0.1, gain:0.2});
  hapPulseP(340, 1.3, 0.03, 0); hapPulseP(100, 1.4, 0.14, 0); at(60, () => hapPulseP(180, 0.7, 0.07, rnd(-0.6, 0.6))); fl([255,100,120], 0.2); evt('pop');
}
function ev_hurt(side){
  const a = synth(); tn(a, {f:200, fEnd:60, dur:0.35, gain:0.35, type:'sawtooth'}); nz(a, {f:300, dur:0.2, gain:0.3});
  hapPulseP(220, 1.4, 0.05, side); hapPulse(42, 1.7, 0.35); for(let i = 0; i < 4; i++) at(90 + i*60, () => hapPulseP(120 - i*15, 1.0 - i*0.2, 0.06, side*(i%2 ? 0.4 : -0.4)));
  lpg(255, 255, 160); fl([255,30,30], 0.6);
}
function ev_pound(){ const a = synth(); tn(a, {f:300, fEnd:80, dur:0.3, gain:0.25}); for(let i = 0; i < 6; i++) at(i*28, () => hapPulseP(60 + i*8, 0.5 + 0.1*i, 0.05, i%2 ? 0.5 : -0.5)); }
function ev_slam(){
  sfx('land', {rate:0.7, vol:1, hap:2.2}); hapPulseP(400, 1.5, 0.03, 0); hapPulse(32, 1.7, 0.55);
  for(let i = 0; i < 5; i++) at(60 + i*70, () => { hapPulseP(70 - i*6, 1.2*Math.pow(0.7, i), 0.12, i%2 ? 0.9 : -0.9); });                  // 충격파가 좌우로 퍼짐
  lpg(255, 255, 250); fl([255,255,255], 0.35); evt('slam');
}
function ev_spring(){
  const a = synth(); tn(a, {f:180, fEnd:900, dur:0.35, gain:0.25, type:'triangle'}); tn(a, {t:0.05, f:360, fEnd:1500, dur:0.25, gain:0.12, type:'sine'});
  hapPulse(36, 1.6, 0.4); for(let i = 0; i < 6; i++) at(40 + i*55, () => hapPulseP(70 + i*28, 0.9 - i*0.08, 0.08, i%2 ? -0.6 : 0.6));
  fl([255,100,160], 0.4); evt('spring');
}
function ev_rescue(){
  jingle([523, 659, 784, 1047, 1319], 0.08, 'triangle', 0.2);
  for(let i = 0; i < 9; i++) at(i*55, () => hapPulseP(220 + i*40, 0.6, 0.035, i%2 ? 0.7 : -0.7));                                      // 신나서 간질간질
  hapPulse(60, 1.0, 0.18); fl([110,231,255], 0.7); evt('rescue');
}
function ev_check(){ jingle([392, 523, 659], 0.09, 'sine', 0.16); hapPulseP(300, 0.9, 0.05, 0); hapPulse(70, 1.0, 0.15); fl([120,255,150], 0.5); }
function ev_fall(){ sfx('fall', {vol:0.8, hap:0}); for(let i = 0; i < 14; i++) at(i*70, () => hapPulseP(150 - i*7, 0.12 + i*0.025, 0.08, rnd(-0.5, 0.5))); }   // 떨어질수록 낮고 거세지는 울림
function ev_respawn(){ hapPulse(40, 1.5, 0.3); jingle([330, 262], 0.12, 'sine', 0.14); fl([255,255,255], 0.4); }
function ev_win(){
  jingle([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.11, 'triangle', 0.22);
  for(let i = 0; i < 18; i++) at(i*70, () => hapPulseP(140 + i*22, 1.0, 0.06, Math.sin(i)*0.9)); at(1300, () => hapPulse(45, 1.7, 0.6));
}

/* ---------- 게임 루프 ---------- */
function respawn(){
  P.x = P.cp.x; P.y = P.cp.y; P.z = P.cp.z; P.vx = P.vz = P.vy = 0; P.fallSnd = false; P.pound = false; P.inv = 1.5; ev_respawn(); toast('다시 힘내요!', 1000);
}
function platUnder(x, z, y0, y1){            // y0(이전 높이)에서 y1로 내려오며 닿는 가장 높은 발판
  let best = null;
  for(const p of PLAT){ if(x < p.minx - 0.25 || x > p.maxx + 0.25 || z < p.minz - 0.25 || z > p.maxz + 0.25) continue;
    if(y0 >= p.top - 0.05 && y1 <= p.top && (!best || p.top > best.top)) best = p; }
  return best;
}
function reset(){
  P.x = 0; P.y = 0; P.z = 2; P.vx = P.vz = P.vy = 0; P.hp = 3; P.coins = 0; P.bots = 0; P.t = 0; P.state = 'play'; P.cp = {x:0, y:0, z:2}; P.pound = false; P.fallSnd = false; P.inv = 0;
  COINS.forEach(c => { c.got = false; c.g.visible = true; }); CRATES.forEach(c => { c.alive = true; c.m.visible = true; }); ENEMIES.forEach(e => { e.alive = true; e.g.visible = true; });
  LOST.forEach(l => { l.got = false; l.g.position.set(l.x, l.y, l.z); }); CHECK.forEach(c => { c.got = false; c.mesh.material.color.setHex(0x888888); c.mesh.material.emissive.setHex(0x111111); });
  P.ground = true; camTheta = 0; camPhi = 1.0; camR = 11; hud();
}
const btnPrev = {};
const edge = (k, v) => { const e = v && !btnPrev[k]; btnPrev[k] = v; return e; };
let savedBg = null;
function gameUpdate(dt, now){
  const B = S.btn; P.t += P.state === 'play' ? dt : 0; const dz = v => Math.abs(v) < 0.15 ? 0 : v;
  const eJump = edge('x', !!B.cross), eSpin = edge('s', !!B.square), ePound = edge('o', !!B.circle), eOpt = edge('opt', !!B.options);
  camTheta -= dz(S.rx)*dt*2.4; camPhi = clamp(camPhi + dz(S.ry)*dt*1.1, 0.4, 1.4);
  // 움직이는 발판
  PLAT.forEach(p => { if(!p.mover) return; const nx = p.cx + Math.sin(now/1000*p.mover.sp)*p.mover.amp; p.dx = nx - p.px; p.px = nx; p.mesh.position.x = nx; p.minx = nx - p.w/2; p.maxx = nx + p.w/2; });
  if(P.state === 'win'){ if(eJump || eOpt){ reset(); toast('다시 시작!', 900); } P.g.rotation.y += dt*4; placeCam(); fx.color = [255,215,80]; return; }
  // 이동
  const sx = dz(S.lx), sy = dz(S.ly), m = Math.min(1, Math.hypot(sx, sy));
  const fwd = [-Math.sin(camTheta), -Math.cos(camTheta)], rgt = [Math.cos(camTheta), -Math.sin(camTheta)];
  let mx = fwd[0]*(-sy) + rgt[0]*sx, mz = fwd[1]*(-sy) + rgt[1]*sx; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
  const topSpeed = m*(4.6 + S.r2*3.4 + (B.l1 ? 2 : 0)), ac = P.ground ? 14 : 5;
  if(!P.pound && P.state === 'play'){ P.vx += (mx*topSpeed - P.vx)*Math.min(1, dt*ac); P.vz += (mz*topSpeed - P.vz)*Math.min(1, dt*ac); }
  else if(P.pound){ P.vx = P.vz = 0; }
  const spd = Math.hypot(P.vx, P.vz); if(spd > 0.5 && !P.pound) P.face = Math.atan2(P.vx, P.vz);
  // 점프 (코요테 타임, 이단 점프, 가변 높이)
  P.coyote = P.ground ? 0.12 : P.coyote - dt;
  if(eJump && !P.pound){
    if(P.coyote > 0){ P.vy = 10.8; P.ground = false; P.coyote = 0; P.jumps = 1; P.cut = false; ev_jump(false); P.plat = null; }
    else if(P.jumps < 2){ P.vy = 9.4; P.jumps = 2; P.cut = false; ev_jump(true); fl([180,220,255], 0.15); }
  }
  if(!B.cross && P.vy > 4.5 && !P.cut && !P.ground){ P.vy *= 0.55; P.cut = true; }
  // 회전 공격 / 내려찍기
  P.spinCd -= dt; P.spinT = Math.max(0, P.spinT - dt);
  if(eSpin && P.spinCd <= 0 && !P.pound){ P.spinT = 0.42; P.spinCd = 0.7; ev_spin(); }
  if(ePound && !P.ground && !P.pound){ P.pound = true; P.vy = -25; ev_pound(); }
  P.armMesh.visible = P.spinT > 0; if(P.spinT > 0) P.g.rotation.y += dt*Math.PI*2/0.42; else P.g.rotation.y = P.face;
  // 물리
  const y0 = P.y; P.vy = Math.max(-34, P.vy - 28*dt);
  P.x += P.vx*dt; P.z += P.vz*dt; P.y += P.vy*dt;
  if(P.plat && P.ground){ P.x += P.plat.dx; }
  if(P.vy <= 0){
    const hit = platUnder(P.x, P.z, y0, P.y);
    if(hit){
      const wasAir = !P.ground, vyHit = P.vy; P.y = hit.top; P.vy = 0; P.ground = true; P.plat = hit; P.jumps = 0; P.fallSnd = false;
      if(wasAir){ if(P.pound){ P.pound = false; ev_slam(); slamHit(); } else if(vyHit < -5) ev_land(vyHit); else stepFx(hit.key, false, true); }
    } else { P.ground = false; P.plat = null; }
  } else { P.ground = false; P.plat = null; }
  // 발소리 (표면별) + 움직이는 발판 진동
  if(P.ground && spd > 0.6){ P.acc += spd*dt; const stride = spd > 6.5 ? 1.7 : 1.2; if(P.acc >= stride){ P.acc -= stride; P.foot ^= 1; stepFx(P.plat.key, false, P.foot === 0); } } else if(spd <= 0.6) P.acc = 0.7;
  if(P.ground && P.plat && P.plat.mover){ P.hum += dt; if(P.hum > 0.1){ P.hum = 0; hapPulseP(58, 0.16, 0.09, clamp(P.plat.dx*40, -0.5, 0.5)); } }
  if(P.pound){ P.trail += dt; if(P.trail > 0.04){ P.trail = 0; hapPulseP(50 + rnd(0, 20), 0.35, 0.05, rnd(-0.4, 0.4)); } }
  // 추락
  if(P.y < -3 && P.vy < -12 && !P.fallSnd){ P.fallSnd = true; ev_fall(); }
  if(P.y < -16) respawn();
  // 아이템
  for(const c of COINS){ if(c.got) continue; c.g.rotation.y += dt*3; if(Math.hypot(c.x - P.x, c.z - P.z) < 1.05 && Math.abs(c.y - (P.y + 0.8)) < 1.3){ c.got = true; c.g.visible = false; P.coins++; ev_coin(c); hud(); } }
  const reach = P.spinT > 0 ? 2.5 : P.pound ? 0.8 : 0.9;
  for(const c of CRATES){ if(!c.alive) continue; if(Math.hypot(c.x - P.x, c.z - P.z) < reach + 0.6 && Math.abs(c.y - P.y) < 1.4 && (P.spinT > 0 || (P.pound && P.vy < -10))){ crateBreak(c); } }
  for(const e of ENEMIES){ if(!e.alive) continue;
    e.t += dt; const off = Math.sin(e.t*0.9)*e.range; e.x = e.cx + off; e.z = e.cz; e.y = e.top; e.g.position.set(e.x, e.y + Math.abs(Math.sin(e.t*5))*0.15, e.z); e.g.rotation.y = Math.cos(e.t*0.9) > 0 ? Math.PI/2 : -Math.PI/2;
    const dxz = Math.hypot(e.x - P.x, e.z - P.z), dy = P.y - e.y;
    if(dxz < (P.spinT > 0 ? 2.4 : 1.1) && dy > -1 && dy < 1.6){
      if(P.spinT > 0 || P.pound || (P.vy < -3 && dy > 0.7)){ e.alive = false; e.g.visible = false; ev_pop(e); if(!P.pound && P.vy < 0 && P.spinT <= 0) P.vy = 9; }
      else if(P.inv <= 0){ P.hp--; P.inv = 1.4; const side = clamp((P.x - e.x)*0.8, -1, 1); P.vx = side*7; P.vy = 7; P.ground = false; P.plat = null; ev_hurt(side); hud(); if(P.hp <= 0){ P.hp = 3; hud(); respawn(); } }
    } }
  P.inv = Math.max(0, P.inv - dt);
  if(Math.hypot(SPRING.x - P.x, SPRING.z - P.z) < SPRING.r && P.y <= SPRING.base + 0.5 && P.y >= SPRING.base - 0.3 && P.vy <= 0){ P.vy = 23; P.ground = false; P.plat = null; P.jumps = 1; ev_spring(); SPRING.mesh.scale.y = 0.4; }
  SPRING.mesh.scale.y += (1 - SPRING.mesh.scale.y)*Math.min(1, dt*8);
  for(const c of CHECK){ if(!c.got && Math.hypot(c.x + 2.5 - P.x, c.z - P.z) < 2 && Math.abs(c.y - P.y) < 1.5){ c.got = true; P.cp = {x:c.x, y:c.y - 0.2, z:c.z}; c.mesh.material.color.setHex(0x44ff88); c.mesh.material.emissive.setHex(0x116633); ev_check(); toast('체크포인트!', 900); } }
  LOST.forEach((l, i) => {
    if(!l.got){ l.g.rotation.y += dt*2; l.g.position.y = l.y + Math.abs(Math.sin(now/300 + i))*0.25; if(Math.hypot(l.x - P.x, l.z - P.z) < 1.4 && Math.abs(l.y - P.y) < 1.5){ l.got = true; P.bots++; ev_rescue(); toast('잃어버린 봇을 구했어요! ' + P.bots + ' / ' + LOST.length, 1500); hud(); } }
    else { const k = 1.6 + P.bots*0, tx = P.x - Math.sin(P.face)*k*(1 + LOST.filter((q, j) => j < i && q.got).length*0.8), tz = P.z - Math.cos(P.face)*k*(1 + LOST.filter((q, j) => j < i && q.got).length*0.8); l.fx += (tx - l.fx)*Math.min(1, dt*4); l.fz += (tz - l.fz)*Math.min(1, dt*4); l.g.position.set(l.fx, Math.max(P.plat ? P.plat.top : P.y, P.y) + Math.abs(Math.sin(now/180 + i))*0.2, l.fz); l.g.rotation.y = P.face; }
  });
  SHIP.mesh.rotation.y += dt*0.5;
  if(Math.hypot(SHIP.x - P.x, SHIP.z - P.z) < SHIP.r && Math.abs(SHIP.y - P.y) < 2.5 && P.state === 'play'){
    if(P.bots >= LOST.length){ P.state = 'win'; ev_win(); const sec = P.t.toFixed(1); toast('🚀 우주선 수리 완료!\n시간 ' + sec + '초 · 코인 ' + P.coins + '/' + COINS.length + '\n✕ 다시 하기', 99999); }
    else if(!P._warn || now - P._warn > 2500){ P._warn = now; toast('봇 ' + P.bots + ' / ' + LOST.length + ' — 아직 못 구한 봇이 있어요!', 1800); hapPulse(50, 0.9, 0.15); }
  }
  // 카메라 · 라이트바 · 표시
  P.g.position.set(P.x, P.y, P.z); P.g.visible = P.inv <= 0 || Math.floor(now/80)%2 === 0;
  camTarget.x += (P.x - camTarget.x)*Math.min(1, dt*8); camTarget.y += (P.y + 1.4 - camTarget.y)*Math.min(1, dt*5); camTarget.z += (P.z - camTarget.z)*Math.min(1, dt*8); placeCam();
  const sc = P.plat ? SURF_COLOR[P.plat.key] : [60,60,80]; P.flash = Math.max(0, P.flash - dt);
  fx.color = P.flash > 0 ? P.flashC : sc.map(c => c*0.3);
}
function slamHit(){
  CRATES.forEach(c => { if(c.alive && Math.hypot(c.x - P.x, c.z - P.z) < 3.8 && Math.abs(c.y - P.y) < 1.5) crateBreak(c); });
  ENEMIES.forEach(e => { if(e.alive && Math.hypot(e.x - P.x, e.z - P.z) < 3.8 && Math.abs(e.y - P.y) < 1.5){ e.alive = false; e.g.visible = false; ev_pop(e); } });
}
function crateBreak(c){
  c.alive = false; c.m.visible = false; ev_crate(c);
  for(let i = 0; i < 3; i++) at(i*70, () => { P.coins++; sfx('coin', {rate:1 + i*0.12, vol:0.5, hap:0.5, pan:(i - 1)*0.5}); hapPulseP(900 + i*140, 0.6, 0.02, (i - 1)*0.6); hud(); });
}

modes.game = {
  name:'🤖 미니 봇 어드벤처', desc:'잃어버린 봇 3마리를 구해 우주선을 고치세요. 왼쪽 스틱 이동 · 오른쪽 스틱 시점 · ✕ 점프(공중에서 한 번 더) · □ 회전 공격 · ○ 공중 내려찍기 · R2 대시(깊게 누를수록 빠름) · OPTIONS 재시작. 소리와 진동은 모두 장면별로 다릅니다 — HD 햅틱을 켜고 스피커 볼륨도 올려 보세요.',
  enter(){
    out.trigL = TRG.off(); out.trigR = TRG.feedback(2, 2); pad.visible = false; G.visible = true; hudEl.style.display = 'block'; savedBg = scene.background; scene.background = new THREE.Color(0x14204a);
    audioOut(); gLoad(audioOut().ctx); reset(); camTarget.set(P.x, P.y + 1.4, P.z); placeCam();
    toast('잃어버린 봇 3마리를 찾아\n우주선까지 데려가세요!', 3200);
  },
  exit(){ G.visible = false; pad.visible = true; hudEl.style.display = 'none'; toastEl.style.opacity = 0; scene.background = savedBg; camTarget.set(0, 0, 0); camR = 30; camPhi = 0.9; camTheta = 0; placeCam(); },
  update: gameUpdate,
  info(){ return '코인 ' + P.coins + '  봇 ' + P.bots + '  시간 ' + P.t.toFixed(1); }
};
const b = document.createElement('button'); b.textContent = modes.game.name; b.dataset.k = 'game'; b.onclick = () => setMode('game'); b.style.gridColumn = '1 / -1'; document.getElementById('modes').prepend(b);
window.__game = {P, COINS, CRATES, ENEMIES, LOST};
if(location.hash === '#mode=game') setMode('game');
})();
