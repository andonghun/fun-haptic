// Pixel stage: a low-res pixelfx frame drawn to a canvas, plus "auto-haptics" — every frame we measure how much
// light the effects put out, where (left↔right) and how warm it is, and turn sudden jumps into hits and steady glow
// into a hum. That gives every one of the library's effects a feel without hand-authoring each one.
import { createFrame, clearFrame, composite, backdrop, createFx, createAct, painterFor, actBounds, hex, drawActor, stockActor, posed, READY } from '../../vendor/pixelfx/src/core/index.js';
import { H } from './haptics.js';
import { SND } from './sound.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// paint the rigged hero in a pose with his feet at (x, y) in frame pixels
export function drawFigure(F, x, y, pose, flip = false){ const r = posed(pose); for(let i = 0; i < r.n; i++){ const px = flip ? x - r.xs[i] - 1 : x + r.xs[i], py = y + r.ys[i]; if(px >= 0 && py >= 0 && px < F.w && py < F.h) F.color[py*F.w + px] = r.color[i]; } }
export const PX = { READY, createFx, createAct, backdrop, painterFor, actBounds, hex, drawActor, stockActor };

export class Stage {
  constructor(canvas, w = 320, h = 180, o = {}){
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.items = []; this.bgKind = o.bg || 'ground'; this.groundY = o.groundY ?? Math.round(h*0.83);
    this.resize(w, h); this.auto = o.auto !== false ? new AutoHaptic(this) : null; this.shake = [0, 0]; this.overlay = null; this.underlay = null;
  }
  resize(w, h){
    this.w = w; this.h = h; this.cv.width = w; this.cv.height = h;
    this.frame = createFrame(w, h); this.img = this.ctx.createImageData(w, h); this.setBg(this.bgKind);
  }
  setBg(kind, groundY){ this.bgKind = kind; if(groundY != null) this.groundY = groundY; this.bg = typeof kind === 'number' ? kind : backdrop(kind, this.w, this.h, this.groundY); }
  // add a one-shot or looping effect (mod = an effect module). Returns the live instance.
  fx(mod, o = {}){ const f = createFx(mod, o); this.items.push({kind:'fx', f, o}); return f; }
  act(mod, o = {}){ const a = createAct(mod, o); this.items.push({kind:'act', f:a, o}); return a; }
  remove(f){ this.items = this.items.filter(it => it.f !== f); }
  clear(){ this.items = []; }
  update(dt){
    for(const it of this.items){ if(it.o.paused || it.o.manual) continue; it.f.update(it.o.dtScale ? dt*it.o.dtScale : dt); }
    this.items = this.items.filter(it => it.o.keep || it.kind === 'act' || !it.f.done());
  }
  draw(){
    const F = this.frame; clearFrame(F);
    if(this.paintBack){ const p = painterFor(F); p.place(0, 0); this.paintBack(p); }
    for(const it of this.items) if(it.kind === 'fx') it.f.draw(F, 'back');
    for(const it of this.items) if(it.kind === 'act') it.f.draw(F, it.o.drawOpts);
    for(const it of this.items) if(it.kind === 'fx') it.f.draw(F, 'front');
    if(this.paint){ const p = painterFor(F); p.place(0, 0); this.paint(p); }
    if(this.auto) this.auto.measure(F);
    composite(F, this.img.data, this.bg);
    let sx = this.shake[0], sy = this.shake[1];
    for(const it of this.items) if(it.kind === 'act'){ const s = it.f.shake; sx += s[0]; sy += s[1]; }
    const c = this.ctx; c.fillStyle = '#000'; if(sx || sy) c.fillRect(0, 0, this.w, this.h);
    if(this.underlay) this.underlay(c);
    c.putImageData(this.img, sx, sy);
    if(this.overlay) this.overlay(c);
    this.lastShake = [sx, sy];
  }
}

// ---------------------------------------------------------------------------------------------------
export class AutoHaptic {
  constructor(stage){ this.s = stage; this.e = 0; this.es = 0; this.cd = 0; this.voice = null; this.gain = 1; this.sound = true; this.peak = 0.02; this.enabled = true; }
  measure(F){
    const w = F.w, h = F.h, C = F.color, L = F.light; let E = 0, X = 0, R = 0, B = 0;
    for(let y = 0; y < h; y += 2){ const row = y*w; for(let x = (y >> 1) & 1; x < w; x += 2){ const i = row + x;
      const l = L[i], c = C[i]; let e = 0, r = 0, b = 0;
      if(l){ const lr = l & 255, lg = (l >>> 8) & 255, lb = (l >>> 16) & 255; e += (lr + lg + lb)/765; r += lr; b += lb; }
      if(c){ const a = (c >>> 24)/255, cr = c & 255, cg = (c >>> 8) & 255, cb = (c >>> 16) & 255; const ce = a*(0.2 + 0.8*(cr + cg + cb)/765)*0.35; e += ce; r += cr*ce; b += cb*ce; }
      if(e){ E += e; X += e*x; R += r; B += b; } } }
    const n = (w*h)/4, e = Math.log1p(E/n*180)/3;        // log scale: a candle ~0.2, a campfire ~0.6, a big blast ~0.9, a nuke ~1.4
    this.raw = e; this.pan = E > 0 ? clamp((X/E)/w*2 - 1, -1, 1) : 0; this.warm = R + B > 0 ? (R - B)/(R + B) : 0;
  }
  update(dt){
    if(!this.enabled || this.raw == null) return;
    const e = this.raw*this.gain, d = e - this.es; this.peak = Math.max(this.peak*Math.exp(-dt*0.3), e, 0.02);
    this.es += (e - this.es)*Math.min(1, dt*10); this.cd -= dt;
    const freq = clamp(110 - this.warm*60, 45, 220);
    // onset → a hit whose size follows the jump
    if(d > 0.06 + this.peak*0.1 && this.cd <= 0){
      const k = clamp(d*2.4, 0.15, 1.5); this.cd = 0.07 + 0.06*Math.min(1, k);
      H.pulse(freq*1.8 + 120, Math.min(1.4, k*0.9), 0.025, this.pan);
      H.pulse(freq*(k > 0.8 ? 0.6 : 1), k, 0.07 + 0.25*Math.min(1, k), this.pan);
      if(this.sound) autoSound(k, this.pan, this.warm, this.cat);
    }
    // steady glow / flicker → a hum that follows the effect across your hands
    if(!this.voice) this.voice = H.voice({f:freq, q:0.8, tone:0.5});
    const flick = Math.min(1, Math.abs(d)*3);
    this.voice.set(clamp(this.es*0.4 + flick*0.3, 0, 0.6)*Math.min(1, this.gain), freq, this.pan);
  }
  stop(){ if(this.voice){ this.voice.stop(); this.voice = null; } }
}

// generic sound for an onset, flavoured by category when known
function autoSound(k, pan, warm, cat){
  const p = pan*0.7, g = Math.min(1, k);
  if(cat === 'explosions' || cat === 'impacts'){ SND.play(k > 0.8 ? 'heavy' : 'break', {gain:0.5 + 0.4*g, rate:k > 0.8 ? 0.7 : 1.1, pan:p}); SND.noise({type:'lowpass', f:300, dur:0.3 + 0.6*g, gain:0.4*g, pan:p}); return; }
  if(cat === 'lightning'){ SND.noise({f:2500, fEnd:300, q:0.5, dur:0.25, gain:0.45*g, pan:p}); SND.tone({f:70, fEnd:35, dur:0.8*g, gain:0.25*g, type:'sawtooth'}); return; }
  if(cat === 'ice'){ for(let i = 0; i < 4; i++) SND.tone({t:i*0.03, f:2400 + Math.random()*1800, dur:0.12, gain:0.05*g, pan:p, type:'triangle'}); SND.noise({type:'highpass', f:4000, dur:0.25, gain:0.15*g, pan:p}); return; }
  if(cat === 'water'){ SND.noise({f:600, fEnd:2000, q:1, dur:0.3, gain:0.3*g, pan:p}); return; }
  if(cat === 'projectiles'){ SND.play('blaster', {gain:0.5*g, rate:0.9 + Math.random()*0.2, pan:p}); return; }
  if(cat === 'pickups' || cat === 'ui'){ SND.play('coin', {gain:0.4, rate:1 + Math.random()*0.3, pan:p}); return; }
  if(cat === 'melee'){ SND.noise({f:900, fEnd:2600, q:1.4, dur:0.18, gain:0.25*g, pan:p}); SND.play('metal', {gain:0.5*g, rate:0.8, pan:p}); return; }
  SND.noise({type:'lowpass', f:warm > 0 ? 500 : 1400, dur:0.15 + 0.4*g, gain:0.3*g, pan:p});
}

// Hand-authored feel for character acts: every scripted hit (with its freeze, shake and push) becomes a haptic hit,
// and a rising swish leads into it. Call tick(act) every frame.
export class ActHaptic {
  constructor(mod, o = {}){ this.hits = (mod.act && mod.act.hits || []).slice().sort((a, b) => a.t - b.t); this.i = 0; this.w = 0; this.last = -1e9; this.pan = o.pan ?? 0.6; this.cat = o.cat; this.heavy = o.heavy || 1; }
  tick(act){
    const t = act.t; if(t < this.last - 0.05){ this.i = 0; this.w = 0; } this.last = t;
    // wind-up swish 0.22 s before each hit
    while(this.w < this.hits.length && this.hits[this.w].t - 0.22 <= t){ const h = this.hits[this.w++]; if(t - h.t > 0.1) continue;
      for(let j = 0; j < 5; j++) H.pulse(80 + j*25, 0.15 + j*0.06, 0.04, -0.6 + j*0.3*Math.sign(this.pan || 1), j*0.04);
      SND.noise({f:500, fEnd:2400, q:1.2, dur:0.2, att:0.12, gain:0.12}); }
    while(this.i < this.hits.length && this.hits[this.i].t <= t){ const h = this.hits[this.i++]; if(t - h.t > 0.1) continue; this.hit(h); }
  }
  hit(h){
    const amp = clamp(((h.amp ?? 1)*0.5 + (h.stop ?? 0)*5 + Math.abs(h.push ?? 1)*0.12)*this.heavy, 0.4, 1.6), pan = this.pan;
    H.pulse(420, Math.min(1.4, amp), 0.025, pan); H.pulse(48, amp, 0.12 + (h.stop ?? 0)*2.2, pan*0.6);
    if((h.stop ?? 0) > 0.1) H.pulse(32, amp*0.8, 0.35, 0, 0.05);
    const c = this.cat;
    if(c === 'gun'){ SND.play('ehurt', {gain:0.5, rate:1.1, pan:pan*0.6}); }
    else if(c === 'arrow'){ SND.play('wood', {gain:0.9, rate:0.75, pan:pan*0.6}); H.play(SND.hapOf('wood', 0), 0.8, 1.3, pan); }
    else { SND.play('metal', {gain:0.6 + 0.3*Math.min(1, amp), rate:0.75 + Math.random()*0.15, pan:pan*0.6}); SND.play('ehurt', {gain:0.4, rate:0.9, pan:pan*0.6}); H.play(SND.hapOf('metal', 0), 0.8, 1.2*amp, pan); }
  }
}
