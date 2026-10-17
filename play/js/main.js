// Experience menu → first-person experience. Boot, onboarding, pause and the main loop.
import { E, FX, Fade, Time } from './engine.js';
import { preload } from './assets.js';
import { DS } from './ds.js';
import { H } from './haptics.js';
import { SND } from './sound.js';
import { IN } from './input.js';
import { Feel, Light } from './feel.js';
import { FP } from './fp.js';
import { UI, Save, translate, $ } from './ui.js';
import { t, getLang, setLang } from './i18n.js';
import { makeRain } from './xp/rain.js';
import { makeGuns } from './xp/guns.js';
import { makeBow } from './xp/bow.js';
import { makeWalk } from './xp/walk.js';
import { makeTilt } from './xp/tilt.js';

// tags: hd = HD haptics, trg = adaptive triggers, spk = controller speaker, gyro = motion sensor
const XPS = [
  {id:'rain',   icon:'🌧️', make:() => makeRain(),     tags:['hd', 'trg', 'spk']},
  {id:'pistol', icon:'🔫', make:() => makeGuns(false), tags:['trg', 'hd', 'spk', 'gyro']},
  {id:'rifle',  icon:'💥', make:() => makeGuns(true),  tags:['trg', 'hd', 'spk']},
  {id:'bow',    icon:'🏹', make:() => makeBow(),       tags:['trg', 'hd', 'gyro']},
  {id:'walk',   icon:'👣', make:() => makeWalk(),      tags:['hd']},
  {id:'tilt',   icon:'🎱', make:() => makeTilt(),      tags:['gyro', 'hd', 'spk']}
];
const TAGC = {hd:'', trg:'t2', spk:'t3', gyro:'t4'};
const G = { xp:null, playing:false, bg:null };

function buildMenu(){
  $('xpGrid').innerHTML = XPS.map(x => `<button class="btn xp" data-xp="${x.id}"><div class="ic">${x.icon}</div><h3>${t('x_' + x.id)}</h3><p>${t('x_' + x.id + '_d')}</p><div class="tags">${x.tags.map(g => `<span class="tag ${TAGC[g]}">${t('tag_' + g)}</span>`).join('')}</div></button>`).join('');
  document.querySelectorAll('[data-xp]').forEach(b => b.onclick = () => start(b.dataset.xp));
  $('stPad').textContent = DS.connected ? '🎮 ' + DS.label + (DS.bt ? ' (BT)' : ' (USB)') : '🎮 ' + t('no_pad'); $('stPad').classList.toggle('ok', DS.connected);
  $('stHD').textContent = H.hd ? '✨ ' + t('hd_on') : '✨ ' + t('hd_off'); $('stHD').classList.toggle('ok', H.hd);
}
function applyLang(){
  translate(); buildMenu();
  $('pInvert').textContent = `${t('invert')}: ${IN.invertY ? t('on') : t('off')}`;
  $('pGyro').textContent = `${t('gyro')}: ${Save.get('gyro', true) ? t('on') : t('off')}`;
  $('pOut').textContent = `${t('snd_out')}: ${SND.padOn ? t('on') : t('off')}`; $('pOut').style.display = H.hd ? '' : 'none';
}

async function start(id){
  SND.unlock();
  if(!Save.d.onboarded){ G.pending = id; openOnboard(); return; }
  if(DS.connected && !DS.bt && Save.get('hd') && !H.hd){ const r = await H.enableHD(); if(r.ok) SND.attachPad(); }
  const x = XPS.find(v => v.id === id); if(!x) return;
  G.playing = false; UI.hide(); await Fade.to(1, 350);
  if(G.xp) G.xp.exit(); if(G.bg){ G.bg.exit(); }
  G.xp = x.make(); G.xp.enter(); UI.hud(true); $('foot').style.display = 'none'; G.playing = true; IN.lockMouse(E.renderer.domElement);
  await Fade.to(0, 450);
}
async function toMenu(){
  G.playing = false; await Fade.to(1, 300);
  if(G.xp){ G.xp.exit(); G.xp = null; }
  UI.hud(false); UI.prompt(null); DS.out.trigL = [0x05, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; DS.out.trigR = DS.out.trigL.slice();
  showMenuBg(); buildMenu(); UI.show('title'); document.exitPointerLock && document.exitPointerLock();
  await Fade.to(0, 400);
}
// the menu sits on top of the footsteps path, slowly panning
function showMenuBg(){ if(!G.bg) G.bg = makeWalk(); G.bg.enter(); FP.yaw = 0.6; UI.toast('', 1); }

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
  UI.focusFirst(); buildMenu();
}
$('obConnect').onclick = async () => { try{ if(await DS.request()) onConnected(); }catch(e){ $('obM1').textContent = e.message; } };
$('obOther').onclick = () => { step(1, 'done', '—'); $('obM1').textContent = t('ob_nopad'); step(2, '', '—'); step(3, 'active', ''); UI.focusFirst(); };
$('obHD').onclick = async () => {
  $('obM2').textContent = '…';
  const r = await H.enableHD();
  if(r.ok){ step(2, 'done', '✓'); $('obM2').textContent = t('ob_hd_ok', {ch:r.channels}); Save.set('hd', true); SND.attachPad(); step(3, 'active', ''); setTimeout(() => Feel.sweep(), 300); buildMenu(); }
  else { $('obM2').textContent = t('ob_err_' + r.reason, {ch:r.channels}); $('obM2').className = 'msg warn'; Feel.uiError(); }
};
$('obSkip').onclick = () => { step(2, 'done', '—'); step(3, 'active', ''); UI.focusFirst(); setTimeout(() => Feel.sweep(), 200); };
$('obTest').onclick = () => Feel.sweep();
$('obYes').onclick = () => { step(3, 'done', '✓'); $('obM3').textContent = ''; Feel.star(0); UI.setFocus($('obGo')); };
$('obNo').onclick = () => { $('obM3').textContent = t('ob_trouble'); $('obM3').className = 'msg warn'; };
$('obGo').onclick = () => { Save.d.onboarded = true; Save.write(); if(G.pending){ const id = G.pending; G.pending = null; start(id); } else { buildMenu(); UI.show('title'); } };
$('bSetup').onclick = () => { SND.unlock(); openOnboard(); };
$('bLang').onclick = $('pLang').onclick = () => { setLang(getLang() === 'ko' ? 'en' : 'ko'); applyLang(); };
DS.on(e => { if(e.type === 'connect' && UI.screen === 'onboard') onConnected(); buildMenu(); });

// ---- pause ----------------------------------------------------------------------
function openPause(){ G.playing = false; applyLang(); UI.show('pause'); document.exitPointerLock && document.exitPointerLock(); }
function closePause(){ UI.hide(); G.playing = true; IN.lockMouse(E.renderer.domElement); }
$('pResume').onclick = closePause;
$('pHub').onclick = () => { UI.hide(); toMenu(); };
$('pHap').value = H.level = Save.get('hap', 1); H.setLevel(H.level); $('pHap').oninput = e => { H.setLevel(+e.target.value); Save.set('hap', +e.target.value); H.pulse(120, 0.9, 0.08); };
$('pVol').value = Save.get('vol', 0.8); SND.vol = +$('pVol').value; $('pVol').oninput = e => { SND.setVolume(+e.target.value); Save.set('vol', +e.target.value); };
$('pSens').value = IN.sens = Save.get('sens', 1); $('pSens').oninput = e => { IN.sens = +e.target.value; Save.set('sens', IN.sens); };
IN.invertY = Save.get('invert', false);
$('pInvert').onclick = () => { IN.invertY = !IN.invertY; Save.set('invert', IN.invertY); applyLang(); };
$('pGyro').onclick = () => { Save.set('gyro', !Save.get('gyro', true)); applyLang(); };
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
  Time.update(now);
  const live = G.playing && !UI.screen;
  if(G.xp) G.xp.update(dt*Time.scale, now/1000, live);
  else if(G.bg){ FP.yaw += dt*0.05; G.bg.update(dt, now/1000, false); }
  E.followSun(FP.pos);
  FX.update(dt);
  H.update(now); Light.update(now); DS.flush(now);
  E.render();
  requestAnimationFrame(frame);
}

async function boot(){
  E.init($('game')); FX.init(); Fade.init($('fade')); applyLang();
  E.renderer.domElement.addEventListener('click', () => { if(G.playing && !UI.screen) IN.lockMouse(E.renderer.domElement); });
  await preload(['tree', 'flag']);
  showMenuBg();
  DS.reconnect().then(buildMenu);
  UI.show('title'); UI.hud(false);
  requestAnimationFrame(t0 => { last = t0; requestAnimationFrame(frame); });
  Fade.to(0, 700);
  window.__hq = {G, DS, H, SND, IN, UI, Save, E, FP, start, toMenu};
}
boot();
