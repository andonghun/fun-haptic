// Unified input: DualSense (WebHID) > standard Gamepad API pad > keyboard + mouse.
// Logical buttons: jump, attack, dodge, interact, l1, r1, pause, up, down, left, right, back.
import { DS } from './ds.js';
import { H } from './haptics.js';

const keys = new Set(); let mouse = {dx:0, dy:0, l:false, r:false, locked:false};
addEventListener('keydown', e => { keys.add(e.code); if(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault(); IN.source = IN.source === 'ds' && DS.connected ? 'ds' : 'kb'; if(!DS.connected) IN.source = 'kb'; });
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
addEventListener('mousemove', e => { if(mouse.locked){ mouse.dx += e.movementX; mouse.dy += e.movementY; } });
addEventListener('mousedown', e => { if(e.button === 0) mouse.l = true; if(e.button === 2) mouse.r = true; });
addEventListener('mouseup', e => { if(e.button === 0) mouse.l = false; if(e.button === 2) mouse.r = false; });
document.addEventListener('pointerlockchange', () => { mouse.locked = !!document.pointerLockElement; });
addEventListener('contextmenu', e => { if(mouse.locked) e.preventDefault(); });

const DEAD = 0.14, dz = v => Math.abs(v) < DEAD ? 0 : (v - Math.sign(v)*DEAD)/(1 - DEAD);
const NAMES = ['jump', 'attack', 'dodge', 'interact', 'l1', 'r1', 'pause', 'up', 'down', 'left', 'right', 'back', 'touch', 'wprev', 'wnext'];

export const IN = {
  source: 'kb',           // 'ds' | 'pad' | 'kb' — used to show the right button glyphs
  mx:0, my:0, lx:0, ly:0, l2:0, r2:0, b:{}, prev:{}, touchRub:0, touchDown:false,
  sens: 1, invertY: false,
  pressed(n){ return !!this.b[n] && !this.prev[n]; },
  released(n){ return !this.b[n] && !!this.prev[n]; },
  lockMouse(el){ if(this.source === 'kb' && el.requestPointerLock){ try{ const p = el.requestPointerLock(); if(p && p.catch) p.catch(() => {}); }catch(e){} } },
  _tp: [null, null],
  poll(dt){
    this.prev = {...this.b}; const b = {}; NAMES.forEach(n => b[n] = false);
    let mx = 0, my = 0, lx = 0, ly = 0, l2 = 0, r2 = 0;
    // gamepads (skip the DualSense itself when it is driven over WebHID)
    let pad = null;
    for(const g of (navigator.getGamepads ? navigator.getGamepads() : [])){ if(g && g.connected && !(DS.connected && /054c|dualsense|wireless controller/i.test(g.id))){ pad = g; break; } }
    H.pad = pad;
    if(pad && pad.mapping === 'standard'){
      const B = i => pad.buttons[i] && pad.buttons[i].pressed, ax = pad.axes;
      const any = pad.buttons.some(x => x.pressed) || ax.some(v => Math.abs(v) > 0.3);
      if(any && !DS.connected) this.source = 'pad';
      mx = dz(ax[0] || 0); my = dz(ax[1] || 0); lx = dz(ax[2] || 0); ly = dz(ax[3] || 0);
      l2 = pad.buttons[6] ? pad.buttons[6].value : 0; r2 = pad.buttons[7] ? pad.buttons[7].value : 0;
      b.jump = B(0); b.dodge = B(1); b.attack = B(2); b.interact = B(3); b.l1 = B(4); b.r1 = B(5); b.back = B(8); b.pause = B(9);
      b.up = B(12); b.down = B(13); b.left = B(14); b.right = B(15); b.wprev = b.left; b.wnext = b.right;
    }
    if(DS.connected){
      const s = DS.s, B = s.b;
      if(Object.values(B).some(Boolean) || Math.abs(s.lx) > 0.3 || Math.abs(s.ly) > 0.3) this.source = 'ds';
      mx = dz(s.lx); my = dz(s.ly); lx = dz(s.rx); ly = dz(s.ry); l2 = s.l2; r2 = s.r2;
      b.jump = B.cross; b.dodge = B.circle; b.attack = B.square; b.interact = B.tri; b.l1 = B.l1; b.r1 = B.r1; b.pause = B.options; b.back = B.create;
      b.up = B.up; b.down = B.down; b.left = B.left; b.right = B.right; b.touch = B.tpad; b.wprev = B.left; b.wnext = B.right;
      // touchpad rubbing speed (pixels/frame normalised) — used for digging
      let rub = 0, down = false;
      s.touch.forEach((t, i) => { if(t.down){ down = true; const p = this._tp[i]; if(p) rub += Math.hypot(t.x - p.x, t.y - p.y); this._tp[i] = {x:t.x, y:t.y}; } else this._tp[i] = null; });
      this.touchDown = down; this.touchRub = Math.min(1, rub/(60*Math.max(dt*60, 0.5)));
    } else { this.touchDown = false; this.touchRub = 0; }
    // keyboard + mouse
    const K = c => keys.has(c);
    if(keys.size || mouse.l || mouse.r || mouse.dx || mouse.dy){
      const kx = (K('KeyD') ? 1 : 0) - (K('KeyA') ? 1 : 0), ky = (K('KeyS') ? 1 : 0) - (K('KeyW') ? 1 : 0);
      if(kx || ky){ const n = Math.hypot(kx, ky); mx = kx/n; my = ky/n; }
      const ax = (K('ArrowRight') ? 1 : 0) - (K('ArrowLeft') ? 1 : 0), ay = (K('ArrowDown') ? 1 : 0) - (K('ArrowUp') ? 1 : 0);
      if(ax) lx = ax; if(ay) ly = ay*0.7;
      b.jump = b.jump || K('Space'); b.dodge = b.dodge || K('ShiftLeft') || K('ShiftRight'); b.attack = b.attack || K('KeyJ') || (mouse.locked && mouse.l);
      b.interact = b.interact || K('KeyE'); b.l1 = b.l1 || K('KeyQ'); b.r1 = b.r1 || K('KeyR'); b.pause = b.pause || K('Escape') || K('KeyP');
      b.up = b.up || K('ArrowUp') || K('KeyW'); b.down = b.down || K('ArrowDown') || K('KeyS'); b.left = b.left || K('ArrowLeft') || K('KeyA'); b.right = b.right || K('ArrowRight') || K('KeyD');
      b.back = b.back || K('Backspace'); b.ok = K('Enter') || K('Space'); b.wprev = b.wprev || K('KeyZ'); b.wnext = b.wnext || K('KeyC') || K('Tab');
      if((mouse.locked && mouse.r) || K('KeyG')) l2 = 1; if(K('KeyF') || (mouse.locked && mouse.l)) r2 = 1;
      if(this.source === 'kb' && K('KeyE')){ this.touchRub = 0.8; this.touchDown = true; }
    }
    this.mouseDX = mouse.dx*this.sens; this.mouseDY = mouse.dy*this.sens*(this.invertY ? -1 : 1); mouse.dx = mouse.dy = 0;
    if(this.invertY) ly = -ly;
    Object.assign(this, {mx, my, lx:lx*this.sens, ly, l2, r2}); b.ok = b.ok || b.jump; this.b = b;
  },
  glyph(n){
    const G = {ds:{jump:'✕', attack:'□', dodge:'○', interact:'△', l1:'L1', r1:'R1', pause:'OPTIONS', touch:'TOUCHPAD', back:'CREATE'},
               pad:{jump:'A', attack:'X', dodge:'B', interact:'Y', l1:'LB', r1:'RB', pause:'START', touch:'Y', back:'BACK'},
               kb:{jump:'Space', attack:'J', dodge:'Shift', interact:'E', l1:'Q', r1:'R', pause:'Esc', touch:'E', back:'Backspace'}};
    return (G[this.source] || G.kb)[n] || n;
  }
};
