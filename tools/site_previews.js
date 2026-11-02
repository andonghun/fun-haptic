// Live pixel previews on the landing page, drawn by the same engine as the game.
import { createFrame, clearFrame, composite, backdrop, createFx, createAct } from './vendor/pixelfx/src/core/index.js';
import { effects } from './vendor/pixelfx/src/fx/index.js';

const P = {
  playground:{act:'moves/sword-combo', x:40}, weather:{cycle:['weather/rain', 'weather/storm', 'weather/snow', 'weather/blizzard', 'weather/aurora', 'weather/cherry-blossoms'], y:170, bg:'sky', dur:4},
  tray:{cycle:['pickups/chest-open', 'pickups/coin-spin', 'pickups/collect-burst'], dur:2.4}, pistol:{act:'moves/pistol-shots', x:50},
  rifle:{act:'moves/pistol-shots', x:50}, bow:{act:'moves/arrow-shot', x:16}, melee:{act:'melee/hammer-smash', x:110},
  gallery:{cycle:['fire/campfire', 'explosions/big-explosion', 'lightning/plasma-ball', 'ice/frost-nova', 'water/fountain', 'holy/heal', 'pickups/chest-open', 'weather/aurora']}
};
class View {
  constructor(cv, id){ this.cv = cv; this.c = cv.getContext('2d'); this.f = createFrame(320, 180); this.img = this.c.createImageData(320, 180); this.k = 0; this.set(id); }
  set(id){ this.id = id; this.p = P[id]; this.cur = null; }
  load(){
    const p = this.p, id = p.cycle ? p.cycle[this.k++ % p.cycle.length] : (p.act || p.fx), mod = effects[id], m = mod.meta;
    const y = p.y ?? (p.cycle ? 140 : 150); this.bg = backdrop(p.bg || (p.cycle ? (m.bg || 'dark') : 'ground'), 320, 180, y);
    const x = p.x ?? (p.cycle ? 160 : m.origin[0] + (320 - m.size[0])/2);
    if(p.act){ this.cur = createAct(mod, {x, y}); const k = mod.act.poses; this.end = Math.max(m.duration, k[k.length - 1][0]) - Math.min(0, k[0][0]) + 0.6; this.act = true; }
    else { this.cur = createFx(mod, {x, y}); this.end = p.cycle ? (p.dur || 3.2) : (m.loop ? Infinity : m.duration + 0.6); this.act = false; }
    this.age = 0;
  }
  tick(dt){
    if(!this.cur || this.age >= this.end) this.load();
    this.age += dt; this.cur.update(dt); clearFrame(this.f);
    if(this.act) this.cur.draw(this.f); else { this.cur.draw(this.f, 'back'); this.cur.draw(this.f, 'front'); }
    composite(this.f, this.img.data, this.bg); this.c.putImageData(this.img, 0, 0);
  }
}
const main = new View(document.getElementById('pvMain'), 'playground');
const cards = [...document.querySelectorAll('canvas[data-pv]')].map(cv => new View(cv, cv.dataset.pv));
const visible = new Set([main]);
const io = new IntersectionObserver(es => es.forEach(e => { const v = e.target === main.cv ? main : cards.find(c => c.cv === e.target); if(e.isIntersecting) visible.add(v); else visible.delete(v); }));
io.observe(main.cv); cards.forEach(c => io.observe(c.cv));
window.__pv = { main: id => main.set(id) };
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
let last = performance.now();
function frame(now){
  const dt = Math.min(0.05, (now - last)/1000); last = now;
  if(!document.hidden) for(const v of visible) if(v.cv.offsetParent) v.tick(still ? 0 : dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
