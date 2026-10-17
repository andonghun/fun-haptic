// DOM screens, gamepad-navigable menus, HUD helpers and save data.
import { t } from './i18n.js';
import { IN } from './input.js';
import { Feel } from './feel.js';

export const $ = id => document.getElementById(id);

export function translate(root = document){ root.querySelectorAll('[data-t]').forEach(el => el.textContent = t(el.dataset.t)); }

let current = null;
export const UI = {
  show(id){ document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); current = id; this.focusFirst(); $('foot').style.display = id === 'title' ? '' : 'none'; },
  hide(){ document.querySelectorAll('.screen').forEach(s => s.classList.remove('on')); current = null; },
  get screen(){ return current; },
  items(){ const s = current && $(current); return s ? [...s.querySelectorAll('.btn, input[type=range]')].filter(e => !e.disabled && e.offsetParent !== null) : []; },
  focus: null,
  setFocus(el, quiet){ if(this.focus === el) return; this.focus && this.focus.classList.remove('focus'); this.focus = el; if(el){ el.classList.add('focus'); if(!quiet) Feel.uiMove(); } },
  focusFirst(){ const it = this.items(); this.setFocus(it.find(e => e.classList.contains('primary') && !e.disabled) || it[0], true); },
  // gamepad / keyboard navigation for whichever screen is open
  nav(){
    if(!current) return false;
    const it = this.items(); if(!it.length) return true;
    if(!it.includes(this.focus)) this.setFocus(it[0], true);
    const i = it.indexOf(this.focus);
    const f0 = this.focus, slider = f0 && f0.type === 'range';
    // grids: left/right move one item, up/down move one row (by on-screen position)
    const move = dir => { const r = f0.getBoundingClientRect(), cx = r.left + r.width/2, cy = r.top + r.height/2; let best = null, bd = 1e9;
      for(const el of it){ if(el === f0) continue; const q = el.getBoundingClientRect(), x = q.left + q.width/2, y = q.top + q.height/2, dx = x - cx, dy = y - cy;
        const ok = dir === 'down' ? dy > 10 : dir === 'up' ? dy < -10 : dir === 'right' ? dx > 10 && Math.abs(dy) < r.height/2 : dx < -10 && Math.abs(dy) < r.height/2; if(!ok) continue;
        const d = (dir === 'up' || dir === 'down') ? Math.abs(dy)*1 + Math.abs(dx)*0.6 : Math.abs(dx) + Math.abs(dy)*3; if(d < bd){ bd = d; best = el; } }
      if(best) this.setFocus(best); else if(dir === 'down' || dir === 'right') this.setFocus(it[(i + 1) % it.length]); else this.setFocus(it[(i - 1 + it.length) % it.length]); };
    if(IN.pressed('down')) move('down'); else if(IN.pressed('up')) move('up');
    else if(!slider && IN.pressed('right')) move('right'); else if(!slider && IN.pressed('left')) move('left');
    if(this.focus !== f0 && this.focus) this.focus.scrollIntoView({block:'nearest'});
    const f = this.focus;
    if(f && f.type === 'range' && (IN.pressed('left') || IN.pressed('right'))){ const st = +f.step || 0.1; f.value = +f.value + (IN.pressed('right') ? st : -st); f.dispatchEvent(new Event('input')); Feel.uiMove(); }
    else if(f && f.type !== 'range' && (IN.pressed('jump') || (IN.source === 'kb' && IN.pressed('ok')))) f.click();
    return true;
  },
  toast(text, ms = 1800){ const e = $('toast'); e.textContent = text; e.style.opacity = 1; clearTimeout(this._tt); this._tt = setTimeout(() => e.style.opacity = 0, ms); },
  prompt(text){ const e = $('hPrompt'); if(text){ if(e.textContent !== text) e.textContent = text; e.classList.add('on'); } else e.classList.remove('on'); },
  zone(text, rgb){ const e = $('hZone'); e.textContent = text; e.style.color = `rgb(${rgb.join(',')})`; e.style.opacity = 1; clearTimeout(this._zt); this._zt = setTimeout(() => e.style.opacity = 0, 2200); },
  hud(on){ $('hud').classList.toggle('on', on); },
  key(n){ const g = IN.glyph(n); return `<span class="key">${g === 'TOUCHPAD' ? t('touchpad') : g}</span>`; },
  glyph(n){ const g = IN.glyph(n); return g === 'TOUCHPAD' ? t('touchpad') : g; }
};
document.addEventListener('mouseover', e => { const b = e.target.closest && e.target.closest('.btn, input[type=range]'); if(b && current && $(current).contains(b)) UI.setFocus(b); });
document.addEventListener('click', e => { if(e.target.closest && e.target.closest('.btn')) Feel.uiSelect(); }, true);

export const Save = {
  d: (() => { try{ return JSON.parse(localStorage.getItem('hq_save')) || {}; }catch(e){ return {}; } })(),
  write(){ try{ localStorage.setItem('hq_save', JSON.stringify(this.d)); }catch(e){} },
  stars(id){ return (this.d.stars && this.d.stars[id]) || [false, false, false]; },
  total(){ return Object.values(this.d.stars || {}).reduce((a, s) => a + s.filter(Boolean).length, 0); },
  record(id, got, time){ this.d.stars = this.d.stars || {}; const old = this.stars(id); this.d.stars[id] = old.map((v, i) => v || !!got[i]);
    this.d.best = this.d.best || {}; if(got[0] && (!this.d.best[id] || time < this.d.best[id])) this.d.best[id] = time; this.write(); },
  get(k, def){ return this.d.opt && k in this.d.opt ? this.d.opt[k] : def; },
  set(k, v){ this.d.opt = this.d.opt || {}; this.d.opt[k] = v; this.write(); }
};
