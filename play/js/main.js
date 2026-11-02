// Pixel haptic lab: experience menu (live pixel previews) → full-screen pixel stage. Onboarding, pause, main loop.
import { DS, TRG } from './ds.js';
import { H } from './haptics.js';
import { SND } from './sound.js';
import { IN } from './input.js';
import { Feel, Light } from './feel.js';
import { UI, Save, translate, $ } from './ui.js';
import { t, getLang, setLang } from './i18n.js';
import { Stage } from './px.js';
import { effects } from './pxp/common.js';
import { makeRain } from './pxp/rain.js';
import { makePistol, makeSmg } from './pxp/guns.js';
import { makeBow } from './pxp/bow.js';
import { makeMelee } from './pxp/melee.js';
import { makeGallery } from './pxp/gallery.js';

const stage = new Stage($('px'), 320, 180);
const XPS = [
  {id:'rain',    icon:'🌧️', make:() => makeRain(stage),    tags:['hd', 'trg', 'spk'], prev:{fx:'weather/rain', bg:'sky'}},
  {id:'pistol',  icon:'🔫', make:() => makePistol(stage),  tags:['trg', 'hd', 'spk'], prev:{act:'moves/pistol-shots', x:50}},
  {id:'rifle',   icon:'💥', make:() => makeSmg(stage),     tags:['trg', 'hd', 'spk'], prev:{fx:'projectiles/muzzle-smg', x:120}},
  {id:'bow',     icon:'🏹', make:() => makeBow(stage),     tags:['trg', 'hd'],        prev:{act:'moves/arrow-shot', x:16}},
  {id:'melee',   icon:'⚔️', make:() => makeMelee(stage),   tags:['hd', 'trg'],        prev:{act:'moves/sword-combo', x:40}},
  {id:'gallery', icon:'✨', make:() => makeGallery(stage), tags:['hd', 'spk'],        prev:{cycle:['fire/campfire', 'explosions/big-explosion', 'lightning/plasma-ball', 'ice/frost-nova', 'water/fountain', 'arcane/magic-circle-cast', 'holy/heal', 'critters/slime']}}
];
const TAGC = {hd:'', trg:'t2', spk:'t3', gyro:'t4'};
const G = {xp:null, playing:false};

// ---- menu with live previews ------------------------------------------------------
const previews = [];
function buildMenu(){
  previews.length = 0;
  $('xpGrid').innerHTML = XPS.map(x => `<button class="btn xp" data-xp="${x.id}"><canvas class="pv" width="320" height="180"></canvas><div class="xp-body"><h3>${x.icon} ${t('x_' + x.id)}</h3><p>${t('x_' + x.id + '_d')}</p><div class="tags">${x.tags.map(g => `<span class="tag ${TAGC[g]}">${t('tag_' + g)}</span>`).join('')}</div></div></button>`).join('');
  document.querySelectorAll('[data-xp]').forEach((b, i) => {
    b.onclick = () => start(b.dataset.xp);
    const st = new Stage(b.querySelector('canvas'), 320, 180, {auto:false, bg:XPS[i].prev.bg || 'ground', groundY:150});
    previews.push({st, p:XPS[i].prev, cur:null, k:0});
  });
  $('stPad').textContent = DS.connected ? '🎮 ' + DS.label + (DS.bt ? ' (BT)' : ' (USB)') : '🎮 ' + t('no_pad'); $('stPad').classList.toggle('ok', DS.connected);
  $('stHD').textContent = H.hd ? '✨ ' + t('hd_on') : '✨ ' + t('hd_off'); $('stHD').classList.toggle('ok', H.hd);
}
function tickPreviews(dt){
  for(const v of previews){
    const p = v.p, st = v.st; v.age = (v.age || 0) + dt;
    if(!v.cur || v.age >= v.end){
      st.clear(); v.age = 0;
      const id = p.cycle ? p.cycle[v.k++ % p.cycle.length] : (p.act || p.fx), mod = effects[id], m = mod.meta;
      if(p.cycle) st.setBg(m.bg || 'dark', 140);
      const x = p.x ?? (p.cycle ? 160 : m.origin[0] + (320 - m.size[0])/2), y = p.cycle ? 140 : (p.fx === 'weather/rain' ? 170 : 150);
      if(p.act){ v.cur = st.act(mod, {x, y}); const k = mod.act.poses; v.end = Math.max(m.duration, k[k.length - 1][0]) - (k[0][0] < 0 ? k[0][0] : 0) + 0.6; }
      else { v.cur = st.fx(mod, {x, y, keep:true}); v.end = p.cycle ? 3.2 : (m.loop ? Infinity : m.duration + 0.6); }
    }
    st.update(dt); st.draw();
  }
}

async function start(id){
  SND.unlock();
  if(!Save.d.onboarded){ G.pending = id; openOnboard(); return; }
  if(DS.connected && !DS.bt && Save.get('hd') && !H.hd){ const r = await H.enableHD(); if(r.ok) SND.attachPad(); }
  const x = XPS.find(v => v.id === id); if(!x) return;
  UI.hide(); $('foot').style.display = 'none';
  if(G.xp) G.xp.exit();
  G.xp = x.make(); G.xp.enter(); UI.hud(true); $('px').classList.add('on'); G.playing = true;
}
function toMenu(){
  G.playing = false; if(G.xp){ G.xp.exit(); G.xp = null; }
  UI.hud(false); UI.prompt(null); DS.out.trigL = TRG.off(); DS.out.trigR = TRG.off(); $('px').classList.remove('on');
  buildMenu(); UI.show('title');
}

// ---- onboarding -------------------------------------------------------------------
function step(n, state, badge){ const s = $('obS' + n); s.classList.toggle('done', state === 'done'); s.classList.toggle('active', state === 'active'); if(badge != null) $('obB' + n).textContent = badge; if(badge === '✓') $('obB' + n).classList.add('ok'); }
function openOnboard(){
  UI.show('onboard');
  if(!navigator.hid){ $('obConnect').disabled = true; $('obM1').textContent = t('webhid_missing'); }
  if(DS.connected) onConnected(); else { step(1, 'active', ''); step(2, '', ''); step(3, '', ''); }
  UI.focusFirst();
}
function onConnected(){
  step(1, 'done', '✓'); $('obM1').textContent = t('ob_ds_ok', {name:DS.label}) + (DS.bt ? '\n' + t('ob_ds_bt') : '');
  Light.flash([255,255,255], 300); H.pulse(200, 0.8, 0.06);
  if(DS.bt || H.hd){ if(H.hd){ step(2, 'done', '✓'); $('obM2').textContent = t('ob_hd_ok', {ch:4}); } else step(2, '', '—'); step(3, 'active', ''); }
  else step(2, 'active', '');
  UI.focusFirst();
}
$('obConnect').onclick = async () => { try{ if(await DS.request()) onConnected(); }catch(e){ $('obM1').textContent = e.message; } };
$('obOther').onclick = () => { step(1, 'done', '—'); $('obM1').textContent = t('ob_nopad'); step(2, '', '—'); step(3, 'active', ''); UI.focusFirst(); };
$('obHD').onclick = async () => {
  $('obM2').textContent = '…';
  const r = await H.enableHD();
  if(r.ok){ step(2, 'done', '✓'); $('obM2').textContent = t('ob_hd_ok', {ch:r.channels}); Save.set('hd', true); SND.attachPad(); step(3, 'active', ''); setTimeout(() => Feel.sweep(), 300); }
  else { $('obM2').textContent = t('ob_err_' + r.reason, {ch:r.channels}); $('obM2').className = 'msg warn'; Feel.uiError(); }
};
$('obSkip').onclick = () => { step(2, 'done', '—'); step(3, 'active', ''); UI.focusFirst(); setTimeout(() => Feel.sweep(), 200); };
$('obTest').onclick = () => Feel.sweep();
$('obYes').onclick = () => { step(3, 'done', '✓'); $('obM3').textContent = ''; Feel.star(0); UI.setFocus($('obGo')); };
$('obNo').onclick = () => { $('obM3').textContent = t('ob_trouble'); $('obM3').className = 'msg warn'; };
$('obGo').onclick = () => { Save.d.onboarded = true; Save.write(); if(G.pending){ const id = G.pending; G.pending = null; start(id); } else { buildMenu(); UI.show('title'); } };
$('bSetup').onclick = () => { SND.unlock(); openOnboard(); };
$('bLang').onclick = $('pLang').onclick = () => { setLang(getLang() === 'ko' ? 'en' : 'ko'); applyLang(); };
DS.on(e => { if(e.type === 'connect' && UI.screen === 'onboard') onConnected(); if(UI.screen === 'title') buildMenu(); });

// ---- pause ----------------------------------------------------------------------
function applyLang(){
  translate(); if(UI.screen === 'title' || !G.xp) buildMenu();
  $('pOut').textContent = `${t('snd_out')}: ${SND.padOn ? t('on') : t('off')}`; $('pOut').style.display = H.hd ? '' : 'none';
}
function openPause(){ G.playing = false; applyLang(); UI.show('pause'); }
function closePause(){ UI.hide(); G.playing = true; }
$('pResume').onclick = closePause;
$('pHub').onclick = () => { UI.hide(); toMenu(); };
$('pHap').value = H.level = Save.get('hap', 1); H.setLevel(H.level); $('pHap').oninput = e => { H.setLevel(+e.target.value); Save.set('hap', +e.target.value); H.pulse(120, 0.9, 0.08); };
$('pVol').value = Save.get('vol', 0.8); SND.vol = +$('pVol').value; $('pVol').oninput = e => { SND.setVolume(+e.target.value); Save.set('vol', +e.target.value); };
SND.padOn = Save.get('padSfx', true);
$('pOut').onclick = () => { SND.padOn = !SND.padOn; Save.set('padSfx', SND.padOn); applyLang(); Feel.coin(); };

// ---- loop -------------------------------------------------------------------------
let last = performance.now();
function frame(now){
  const dt = Math.min(0.05, (now - last)/1000); last = now;
  IN.poll(dt);
  if(UI.screen){
    UI.nav();
    if(UI.screen === 'pause' && (IN.pressed('pause') || IN.pressed('dodge'))) closePause();
  } else if(G.playing && IN.pressed('pause')) openPause();
  const live = G.playing && !UI.screen;
  if(G.xp){ if(live || G.xp.id === 'rain') stage.update(dt); G.xp.update(dt, live); stage.draw(); }
  else if(UI.screen === 'title') tickPreviews(dt);
  H.update(now); Light.update(now); DS.flush(now);
  requestAnimationFrame(frame);
}

function boot(){
  applyLang(); UI.show('title'); UI.hud(false);
  DS.reconnect().then(() => { if(UI.screen === 'title') buildMenu(); });
  requestAnimationFrame(t0 => { last = t0; requestAnimationFrame(frame); });
  $('fade').style.opacity = 0;
  window.__hq = {G, DS, H, SND, IN, UI, Save, stage, start, toMenu};
}
boot();
