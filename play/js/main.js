// Boot, screens, scene switching and the main loop.
import { E, Cam, FX, Fade, Time } from './engine.js';
import { preload } from './assets.js';
import { DS } from './ds.js';
import { H } from './haptics.js';
import { SND } from './sound.js';
import { IN } from './input.js';
import { Feel, Light } from './feel.js';
import { UI, Save, translate, $ } from './ui.js';
import { t, getLang, setLang } from './i18n.js';
import { makeHub } from './hub.js';
import { makeStage1 } from './stage1.js';
import { makeStage2 } from './stage2.js';
import { makeStage3 } from './stage3.js';
import { makeStage4 } from './stage4.js';
import { makeStage5 } from './stage5.js';
import { makeStage6 } from './stage6.js';
import { makeStage7 } from './stage7.js';

const G = { scene:null, playing:false, results:null, lastStage:null };
const STAGE_MAKERS = { st1: makeStage1, st2: makeStage2, st3: makeStage3, st4: makeStage4, st5: makeStage5, st6: makeStage6, st7: makeStage7 };

async function setScene(make, arg){
  if(G.scene && G.scene.exit) G.scene.exit();
  G.scene = make(G); await sceneReady(G.scene); G.scene.enter(arg);
}
// wait until the main models of a scene are loaded (player + whatever spawned so far)
async function sceneReady(s){ const ps = []; s.world.group.traverse(o => { if(o.userData.model) ps.push(o.userData.model.ready); }); await Promise.all(ps); }

G.enterStage = async id => {
  if(!STAGE_MAKERS[id]) return;
  G.playing = false; Feel.enterPortal(); UI.prompt(null);
  await Fade.to(1, 700); UI.hud(true);
  await setScene(STAGE_MAKERS[id]); G.lastStage = id; G.playing = true;
  await Fade.to(0, 600);
};
G.toHub = async from => {
  G.playing = false; UI.hide(); UI.prompt(null); await Fade.to(1, 500);
  await setScene(makeHub, from); UI.hud(true); G.playing = true; await Fade.to(0, 500);
};
G.finishStage = r => {
  G.playing = false; UI.prompt(null); G.results = r; Save.record(r.id, r.got, r.time);
  $('rTitle').textContent = t(r.id) + ' — ' + (r.got[0] ? t('clear') : t('results'));
  const m = Math.floor(r.time/60), s = Math.floor(r.time % 60);
  $('rTime').textContent = `${t('time')} ${m}:${String(s).padStart(2, '0')}`;
  $('rGoals').innerHTML = r.goals.map((g, i) => `<div class="goal ${r.got[i] ? 'on' : ''}"><span>${g}</span><b>${r.got[i] ? '★' : '☆'}</b></div>`).join('');
  const stars = [...document.querySelectorAll('#results .star')]; stars.forEach(s => s.classList.remove('on'));
  UI.show('results');
  r.got.forEach((g, i) => { if(g) setTimeout(() => { stars[i].classList.add('on'); Feel.star(i); }, 500 + i*450); });
};
G.failStage = r => {
  G.playing = false; UI.prompt(null); G.results = r;
  $('rTitle').textContent = t(r.id) + ' — ' + t('fail');
  $('rTime').textContent = r.note || '';
  $('rGoals').innerHTML = r.goals.map(g => `<div class="goal"><span>${g}</span><b>☆</b></div>`).join('');
  document.querySelectorAll('#results .star').forEach(s => s.classList.remove('on'));
  UI.show('results'); UI.setFocus($('rRetry'), true);
};

// ---- title / onboarding ------------------------------------------------------
function applyLang(){ translate(); $('pInvert').textContent = `${t('invert')}: ${IN.invertY ? t('on') : t('off')}`; $('pOut').textContent = `${t('snd_out')}: ${SND.padOn ? t('on') : t('off')}`; $('pOut').style.display = H.hd ? '' : 'none'; if(G.scene && G.scene.refresh) G.scene.refresh(); }
$('bLang').onclick = $('pLang').onclick = () => { setLang(getLang() === 'ko' ? 'en' : 'ko'); applyLang(); };
$('bStart').onclick = async () => {
  SND.unlock();
  if(!Save.d.onboarded){ openOnboard(); return; }
  if(DS.connected && !DS.bt && Save.get('hd') && !H.hd){ const r = await H.enableHD(); if(!r.ok){ openOnboard(); return; } SND.attachPad(); }
  startGame();
};
$('bSetup').onclick = () => { SND.unlock(); openOnboard(); };
function startGame(){ UI.hide(); UI.hud(true); G.playing = true; Cam.yaw = Cam.yaw % (Math.PI*2); IN.lockMouse(E.renderer.domElement); Feel.uiSelect(); }

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
  else { step(2, 'active', ''); }
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
$('obGo').onclick = () => { Save.d.onboarded = true; Save.write(); startGame(); };
DS.on(e => { if(e.type === 'connect' && UI.screen === 'onboard') onConnected(); });

// ---- pause ----------------------------------------------------------------------
function openPause(){ G.playing = false; applyLang(); UI.show('pause'); document.exitPointerLock && document.exitPointerLock(); $('pRestart').style.display = G.scene && G.scene.id !== 'hub' ? '' : 'none'; $('pHub').style.display = G.scene && G.scene.id !== 'hub' ? '' : 'none'; }
function closePause(){ UI.hide(); G.playing = true; IN.lockMouse(E.renderer.domElement); }
$('pResume').onclick = closePause;
$('pHub').onclick = () => G.toHub(G.scene.id);
$('pRestart').onclick = () => { const id = G.scene.id; UI.hide(); G.enterStage(id); };
$('pHap').value = H.level = Save.get('hap', 1); H.setLevel(H.level); $('pHap').oninput = e => { H.setLevel(+e.target.value); Save.set('hap', +e.target.value); H.pulse(120, 0.9, 0.08); };
$('pVol').value = Save.get('vol', 0.8); SND.vol = +$('pVol').value; $('pVol').oninput = e => { SND.setVolume(+e.target.value); Save.set('vol', +e.target.value); };
$('pSens').value = IN.sens = Save.get('sens', 1); $('pSens').oninput = e => { IN.sens = +e.target.value; Save.set('sens', IN.sens); };
IN.invertY = Save.get('invert', false);
$('pInvert').onclick = () => { IN.invertY = !IN.invertY; Save.set('invert', IN.invertY); applyLang(); };
SND.padOn = Save.get('padSfx', true);
$('pOut').onclick = () => { SND.padOn = !SND.padOn; Save.set('padSfx', SND.padOn); applyLang(); Feel.coin(); };
$('rNext').onclick = () => G.toHub(G.results.id);
$('rRetry').onclick = () => { UI.hide(); G.enterStage(G.results.id); };

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
  if(G.scene) G.scene.update(dt*Time.scale, now/1000, G.playing && !UI.screen);
  FX.update(dt);
  H.update(now); Light.update(now); DS.flush(now);
  E.render();
  requestAnimationFrame(frame);
}

async function boot(){
  E.init($('game')); FX.init(); Fade.init($('fade')); applyLang();
  E.renderer.domElement.addEventListener('click', () => { if(G.playing && !UI.screen) IN.lockMouse(E.renderer.domElement); });
  await preload(['player', 'buddy', 'tree', 'column', 'columnBroken', 'statue', 'banner', 'trophy', 'grass', 'grassSmall', 'cloud']);
  preload(['soldier', 'drone', 'sword', 'blaster', 'repeater', 'wallHigh', 'rack', 'wall', 'block', 'flag', 'coin']);
  await setScene(makeHub);
  DS.reconnect();
  UI.show('title'); UI.hud(false);
  requestAnimationFrame(t0 => { last = t0; requestAnimationFrame(frame); });
  Fade.to(0, 900);
  window.__hq = {G, DS, H, SND, IN, UI, Save, Cam, E};
}
boot();
