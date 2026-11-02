// Effect gallery: every pixelfx effect, felt. Auto-haptics turn each effect's light into touch — bursts become hits,
// steady glows become a hum that follows the effect left↔right, warm colours rumble low, cold ones buzz high.
// Effects with a character also get their scripted hits. ◀▶ effect · ▲▼ category · ✕ replay.
import { effects, categories, FLOOR, hud } from './common.js';
import { PX, ActHaptic } from '../px.js';
import { IN } from '../input.js';
import { DS, TRG } from '../ds.js';
import { Light } from '../feel.js';
import { UI } from '../ui.js';
import { t } from '../i18n.js';

const ALL = Object.keys(effects);
const CATS = categories.map(c => ({...c, ids:ALL.filter(id => id.startsWith(c.id + '/'))})).filter(c => c.ids.length);

export function makeGallery(stage, start){
  let ci = 0, ei = 0, cur = null, ah = null, wait = 0, cycle = !!start;
  const W0 = stage.w, H0 = stage.h;
  function load(){
    stage.clear();
    const id = CATS[ci].ids[ei], mod = effects[id], m = mod.meta;
    const b = mod.act ? PX.actBounds(mod) : {x0:-m.origin[0], y0:-m.origin[1], x1:m.size[0] - m.origin[0], y1:m.size[1] - m.origin[1]};
    const bw = b.x1 - b.x0, bh = b.y1 - b.y0, w = Math.max(320, Math.ceil(bw + 24), Math.ceil((bh + 24)*16/9)), h = Math.round(w*9/16);
    if(w !== stage.w) stage.resize(w, h);
    const x = Math.round(w/2 - (b.x0 + bw/2)), y = Math.round(h/2 - (b.y0 + bh/2));
    stage.setBg(m.bg || 'dark', y);
    cur = mod.act ? stage.act(mod, {x, y, manual:true}) : stage.fx(mod, {x, y, keep:true});
    ah = mod.act ? new ActHaptic(mod, {pan:0.5}) : null;
    stage.auto.cat = CATS[ci].id; stage.auto.peak = 0.02; wait = 0;
  }
  return {
    id:'gallery',
    enter(){ stage.clear(); stage.auto.enabled = true; stage.auto.gain = 1; DS.out.trigL = TRG.off(); DS.out.trigR = TRG.off(); Light.base = [180, 120, 255];
      if(start){ ci = CATS.findIndex(c => c.id === start.split('/')[0]); ei = Math.max(0, CATS[ci].ids.indexOf(start)); }
      load(); UI.toast(t('x_gallery_tip'), 4200); },
    exit(){ stage.clear(); stage.auto.enabled = false; stage.auto.stop(); stage.resize(W0, H0); },
    update(dt, live){
      if(live){
        if(IN.pressed('right') || IN.pressed('wnext')){ ei = (ei + 1) % CATS[ci].ids.length; load(); }
        if(IN.pressed('left') || IN.pressed('wprev')){ ei = (ei - 1 + CATS[ci].ids.length) % CATS[ci].ids.length; load(); }
        if(IN.pressed('down')){ ci = (ci + 1) % CATS.length; ei = 0; load(); }
        if(IN.pressed('up')){ ci = (ci - 1 + CATS.length) % CATS.length; ei = 0; load(); }
        if(IN.pressed('jump') || IN.pressed('attack')) load();
      }
      if(ah){ cur.update(dt); ah.tick(cur); }
      // one-shots replay after a short pause
      const mod = effects[CATS[ci].ids[ei]], m = mod.meta, k = mod.act && mod.act.poses, end = Math.max(m.duration, k ? k[k.length - 1][0] : 0);
      const done = m.loop ? false : (mod.act ? cur.t >= end : cur.done());
      if(done){ wait += dt; if(wait > 0.9) load(); }
      stage.auto.update(dt);
      hud(m.name, `${CATS[ci].name} · ${ei + 1} / ${CATS[ci].ids.length}`, '',
        `<span class="key">◀▶</span> ${t('x_effect')} · <span class="key">▲▼</span> ${t('x_category')} · ${UI.key('jump')} ${t('x_replay')} · ${UI.key('pause')} ${t('menu')}`);
    }
  };
}
