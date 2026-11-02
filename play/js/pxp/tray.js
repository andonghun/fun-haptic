// Treasure tray: a tray seen from above, held in your hands. Tilt the controller (or the left stick / WASD) and a steel,
// a wooden and a rubber ball roll around — you feel each one rolling under the hand it is nearest. Open the chest
// (□ / R2 / click) and coins pour out and rain down onto the tray: every landing is a little tap where it lands,
// so a handful feels like a patter. Roll coins into the pocket to collect them. Flick the controller up (or ✕) to toss.
import { effects, rnd, clamp, hud } from './common.js';
import { PX } from '../px.js';
import { IN } from '../input.js';
import { DS, TRG } from '../ds.js';
import { H } from '../haptics.js';
import { SND } from '../sound.js';
import { Light } from '../feel.js';
import { UI } from '../ui.js';
import { t } from '../i18n.js';

const CX = 160, CY = 104, RX = 128, RY = 60;                  // tray ellipse in screen px (top-down, slightly squashed)
const POCKET = {x:CX, y:CY + RY - 14, r:8};
const MAT = {
  steel:{r:7, col:['#3a4250', '#8d98aa', '#dfe7f2'], f:200, df:34, bank:'metal', rest:0.5, k:1.0, mass:1.6},
  wood:{r:8, col:['#5a3418', '#9a6232', '#d8a868'], f:95, df:14, bank:'wood', rest:0.42, k:1.1, mass:1.1},
  rubber:{r:7, col:['#6a1a24', '#d84a5c', '#ff9aa6'], f:60, df:8, bank:'land', rest:0.78, k:0.8, mass:0.8},
  coin:{r:4, col:['#7a5410', '#e0a830', '#fff0a0'], f:260, df:20, bank:'coin', rest:0.35, k:0.5, mass:0.3}
};
export function makeTray(stage){
  let objs = [], base = null, chest = null, chestCd = 0, collected = 0, flash = 0, prevAy = 0, tossCd = 0, voices = [];
  const hexes = {}; const hx = c => hexes[c] || (hexes[c] = PX.hex(c));
  function addBall(kind, x, y){ const o = {kind, m:MAT[kind], x, y, z:0, vx:0, vy:0, vz:0, cd:0}; objs.push(o); return o; }
  function inside(o){ const dx = (o.x - CX)/(RX - o.m.r), dy = (o.y - CY)/(RY - o.m.r*0.6); return dx*dx + dy*dy; }
  function impact(o, v, kind){
    const pan = clamp((o.x - CX)/RX, -1, 1), a = clamp(v/120, 0.12, 1.3), m = o.m;
    if(o.kind === 'coin'){ H.pulse(rnd(320, 420), 0.35 + 0.5*a, 0.02, pan); H.pulse(140, 0.25*a, 0.03, pan, 0.01); SND.play('coin', {gain:0.12 + 0.2*a, rate:rnd(1.6, 2.1), pan, pad:true}); return; }
    const i = SND.play(m.bank, {rate:(kind === 'ball' ? 1.3 : 1)*rnd(0.95, 1.05), gain:0.5*a, pan, pad:true});
    H.play(SND.hapOf(m.bank, Math.max(0, i)), kind === 'ball' ? 1.3 : 1, 1.4*a*m.k, pan); H.pulse(kind === 'floor' ? 60 : 140, 0.7*a, 0.06, pan);
  }
  function openChest(){
    if(chestCd > 0) return; chestCd = 1.6;
    chest = stage.fx(effects['pickups/chest-open'], {x:CX, y:CY - RY + 4, light:0.7});
    SND.play('swap', {gain:0.6, rate:0.7}); H.pulse(70, 1.0, 0.18); H.pulse(260, 0.6, 0.03, 0, 0.02);
    // coins burst out, arc up and rain down across the tray: each one lands with its own tap
    const n = 14 + (Math.random()*6 | 0);
    for(let k = 0; k < n; k++) setTimeout(() => { const o = addBall('coin', CX + rnd(-10, 10), CY - RY + 18); const a = rnd(0, Math.PI*2), sp = rnd(30, 120);
      o.vx = Math.cos(a)*sp; o.vy = Math.abs(Math.sin(a))*sp*0.8 + 20; o.z = 6; o.vz = rnd(140, 220); }, 280 + k*45);
    Light.flash([255, 210, 80], 400);
  }
  return {
    id:'tray',
    enter(){
      stage.clear(); stage.auto.enabled = false; stage.setBg(PX.hex('#0e1213')); objs = []; collected = 0; base = null;
      addBall('steel', CX - 40, CY); addBall('wood', CX, CY - 10); addBall('rubber', CX + 40, CY);
      voices = objs.map(o => ({o, v:H.voice({f:o.m.f, q:0.8, tone:0.4}), b:SND.bed({type:'bandpass', f:o.m.f*6, q:1.2, pad:true})}));
      DS.out.trigL = TRG.off(); DS.out.trigR = TRG.weapon(3, 5, 5); Light.base = [60, 200, 140];
      stage.paintBack = p => {
        // tray: rim, felt, pocket
        p.ellipse(CX, CY + 4, RX + 10, RY + 9, hx('#05070a')); p.ellipse(CX, CY, RX + 9, RY + 8, hx('#8a6a44')); p.ellipse(CX, CY - 1, RX + 6, RY + 5, hx('#b08a5a'));
        p.ellipse(CX, CY, RX + 1, RY + 1, hx('#164e38')); p.ellipse(CX, CY - 2, RX - 6, RY - 5, hx('#1d6b4a'));
        p.ellipse(POCKET.x, POCKET.y, POCKET.r + 2, POCKET.r*0.6 + 2, hx('#0a2a1e')); p.ellipse(POCKET.x, POCKET.y, POCKET.r, POCKET.r*0.6, flash > 0 ? hx('#fff0a0') : hx('#05110c'));
        // shadows, then objects sorted by depth; things in the air cast a smaller, offset shadow
        const sorted = objs.slice().sort((a, b) => a.y - b.y);
        for(const o of sorted){ const s = Math.max(1, o.m.r - o.z*0.05); p.ellipse(Math.round(o.x + o.z*0.15), Math.round(o.y + o.m.r*0.4 + o.z*0.1), s, Math.max(1, s*0.45), hx('#0b2a1f')); }
        for(const o of sorted){ const c = o.m.col, x = Math.round(o.x), y = Math.round(o.y - o.z*0.6), r = o.m.r;
          if(o.kind === 'coin'){ const w = Math.max(1, Math.round(r*Math.abs(Math.cos(o.spin || 0)))); p.ellipse(x, y, w, r, hx(c[0])); p.ellipse(x, y, Math.max(1, w - 1), r - 1, hx(c[1])); p.dot(x - (w > 2 ? 1 : 0), y - 2, hx(c[2])); }
          else { p.disc(x, y, r, hx(c[0]), 1); p.disc(x - 1, y - 1, r - 1, hx(c[1]), 1); p.disc(x - Math.round(r*0.35), y - Math.round(r*0.4), Math.max(1, Math.round(r*0.3)), hx(c[2]), 1); } }
      };
      UI.toast(t('tr_tip'), 4600);
    },
    exit(){ stage.paintBack = null; voices.forEach(x => { x.v.stop(); x.b.stop(); }); stage.clear(); DS.out.trigR = TRG.off(); },
    update(dt, live){
      // tilt: the accelerometer is gravity plus your flicks; without one, the left stick / WASD / mouse
      let gx = 0, gy = 0, flick = 0;
      if(DS.connected && DS.s.t){ const a = DS.s.accel; if(!base || IN.pressed('back')) base = a.slice(); gx = (a[0] - base[0]); gy = (a[2] - base[2]); flick = (a[1] - prevAy); prevAy = a[1]; }
      if(Math.abs(IN.mx) > 0.05 || Math.abs(IN.my) > 0.05){ gx = IN.mx*0.5; gy = IN.my*0.5; }
      if(!live){ gx = gy = 0; }
      const G = 520; chestCd -= dt; tossCd -= dt; flash = Math.max(0, flash - dt);
      if(live && (IN.pressed('attack') || IN.pressed('interact') || (IN.r2 > 0.7 && !this._r2))) openChest(); this._r2 = IN.r2 > 0.7;
      if(live && tossCd <= 0 && (IN.pressed('jump') || flick > 0.9)){ tossCd = 0.6; objs.forEach(o => { if(o.z < 1) o.vz = rnd(150, 260)/o.m.mass*0.8 + 60; }); H.pulse(55, 1.2, 0.15); SND.noise({f:400, fEnd:1500, dur:0.25, gain:0.15}); }
      const n = Math.max(1, Math.ceil(dt/0.006)), h = dt/n;
      for(let s = 0; s < n; s++){
        for(const o of objs){ const m = o.m; o.cd -= h; o.spin = (o.spin || 0) + h*(4 + Math.hypot(o.vx, o.vy)*0.1);
          o.vx += gx*G*h; o.vy += gy*G*h;
          const fr = Math.exp(-(o.z <= 0.01 ? (o.kind === 'coin' ? 2.2 : 0.7) : 0.05)*h); o.vx *= fr; o.vy *= fr;
          o.x += o.vx*h; o.y += o.vy*h;
          if(o.z > 0 || o.vz > 0){ o.vz -= 900*h; o.z += o.vz*h; if(o.z <= 0){ o.z = 0; if(o.vz < -60){ if(o.cd < 0){ impact(o, -o.vz*0.6, 'floor'); o.cd = 0.04; } o.vz = -o.vz*m.rest*(o.kind === 'coin' ? 0.6 : 1); } else o.vz = 0; } }
          const d = inside(o);
          if(d > 1){ const k = 1/Math.sqrt(d); o.x = CX + (o.x - CX)*k; o.y = CY + (o.y - CY)*k;
            const nx = (o.x - CX)/RX, ny = (o.y - CY)/RY, nl = Math.hypot(nx, ny) || 1, ux = nx/nl, uy = ny/nl, vn = o.vx*ux + o.vy*uy;
            if(vn > 0){ o.vx -= (1 + m.rest)*vn*ux; o.vy -= (1 + m.rest)*vn*uy; if(vn > 30 && o.cd < 0 && o.z < 2){ impact(o, vn, 'wall'); o.cd = 0.05; } } }
          if(o.kind === 'coin' && o.z < 1 && Math.hypot(o.x - POCKET.x, (o.y - POCKET.y)/0.6) < POCKET.r){ o.gone = true; collected++; flash = 0.15;
            stage.fx(effects['pickups/collect-burst'] || effects['ui/coin-collect'], {x:POCKET.x, y:POCKET.y, light:0.6}); SND.play('coin', {gain:0.5, rate:1 + Math.min(0.6, collected*0.03)});
            H.pulse(900, 0.6, 0.02, 0); H.pulse(1200, 0.5, 0.025, 0, 0.05); Light.flash([255, 215, 60], 160); }
        }
        objs = objs.filter(o => !o.gone);
        for(let a = 0; a < objs.length; a++) for(let b = a + 1; b < objs.length; b++){
          const p = objs[a], q = objs[b]; if(Math.abs(p.z - q.z) > 6) continue;
          const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy), md = p.m.r + q.m.r;
          if(d < md && d > 1e-4){ const nx = dx/d, ny = dy/d, push = (md - d)/2; p.x -= nx*push; p.y -= ny*push; q.x += nx*push; q.y += ny*push;
            const rel = (q.vx - p.vx)*nx + (q.vy - p.vy)*ny;
            if(rel < 0){ const ip = -(1.8*rel)/(1/p.m.mass + 1/q.m.mass); p.vx -= ip/p.m.mass*nx; p.vy -= ip/p.m.mass*ny; q.vx += ip/q.m.mass*nx; q.vy += ip/q.m.mass*ny;
              if(-rel > 25 && p.cd < 0 && q.cd < 0){ impact(p.m.mass > q.m.mass ? p : q, -rel, 'ball'); p.cd = q.cd = 0.05; } } }
        }
      }
      // rolling: one voice per ball, following it between your hands
      for(const x of voices){ const o = x.o, sp = Math.hypot(o.vx, o.vy), on = o.z < 1, lvl = on ? clamp((sp - 4)/120, 0, 1) : 0, pan = clamp((o.x - CX)/RX, -1, 1);
        x.v.set(lvl*1.1*o.m.k, o.m.f + sp*o.m.df*0.08, pan); x.b.set(lvl*0.3, 0.05); x.b.freq(o.m.f*5 + sp*4); }
      // coins rattle faintly while sliding
      for(const o of objs) if(o.kind === 'coin' && o.z < 1 && Math.hypot(o.vx, o.vy) > 40 && Math.random() < dt*6) H.pulse(rnd(300, 450), 0.12, 0.012, clamp((o.x - CX)/RX, -1, 1));
      const coins = objs.filter(o => o.kind === 'coin').length;
      hud(t('x_tray'), `${t('tr_collected')} ${collected}${coins ? ' · ' + t('tr_on_tray') + ' ' + coins : ''}`, '',
        `${DS.connected ? t('tr_tilt_pad') : t('tr_tilt_keys')} · ${UI.key('attack')}/<span class="key">R2</span> ${t('tr_open')} · ${UI.key('jump')} ${t('tr_toss')} · ${UI.key('pause')} ${t('menu')}`);
    }
  };
}
