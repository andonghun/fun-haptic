// Model registry + loader. Every model is auto-scaled to a target height with its feet on y=0 and centred in x/z,
// so a replacement GLB only needs to face +Z. Overrides: assets/models/custom.json, e.g.
// { "player": { "url": "custom/hero.glb", "height": 1.6, "yaw": 0, "anims": { "idle": "Idle", "walk": "Walk" } } }
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const BASE = 'assets/models/';
export const MODELS = {
  player:  {url:'robot.glb', height:1.55, anims:{idle:'Idle', walk:'Walking', run:'Running', jump:'Jump', fall:'Jump', wave:'Wave', yes:'ThumbsUp', dance:'Dance', punch:'Punch', death:'Death', sit:'Sitting', no:'No'}},
  soldier: {url:'arena/character-soldier.glb', height:1.5, anims:{idle:'idle', walk:'walk', run:'sprint', attack:'attack-melee-right', shoot:'holding-right-shoot', die:'die', hold:'holding-right'}},
  buddy:   {url:'platformer/character.glb', height:1.0, anims:{idle:'idle', walk:'walk', jump:'jump'}},
  drone:   {url:'fps/enemy-flying.glb', height:1.0},
  tree:    {url:'arena/tree.glb', height:3.4}, column:{url:'arena/column.glb', height:2.4}, columnBroken:{url:'arena/column-damaged.glb', height:1.8},
  statue:  {url:'arena/statue.glb', height:2.6}, banner:{url:'arena/banner.glb', height:2.2}, trophy:{url:'arena/trophy.glb', height:0.7},
  flag:    {url:'platformer/flag.glb', height:1.6}, coin:{url:'platformer/coin.glb', height:0.6}, grass:{url:'platformer/grass.glb', height:0.35}, grassSmall:{url:'platformer/grass-small.glb', height:0.25},
  cloud:   {url:'platformer/cloud.glb', height:2.2}, brick:{url:'platformer/brick.glb', height:1}, block:{url:'arena/block.glb', height:0.5},
  sword:   {url:'arena/weapon-sword.glb', height:1.0}, spear:{url:'arena/weapon-spear.glb', height:1.6}, blaster:{url:'fps/blaster.glb', height:0.45}, repeater:{url:'fps/blaster-repeater.glb', height:0.5},
  wall:    {url:'arena/wall.glb', height:1.6}, wallHigh:{url:'fps/wall-high.glb', height:2.2}, rack:{url:'arena/weapon-rack.glb', height:1.4}
};
const loader = new GLTFLoader(), cache = new Map();
let custom = null;
async function loadCustom(){ if(custom) return custom; try{ const r = await fetch(BASE + 'custom.json', {cache:'no-store'}); custom = r.ok ? await r.json() : {}; }catch(e){ custom = {}; } for(const k in custom) MODELS[k] = {...(MODELS[k] || {}), ...custom[k]}; return custom; }
function load(url){ if(!cache.has(url)) cache.set(url, loader.loadAsync(BASE + url).catch(e => { console.warn('model', url, e.message); return null; })); return cache.get(url); }
export async function preload(keys){ await loadCustom(); await Promise.all(keys.map(k => MODELS[k] && load(MODELS[k].url))); }

// returns {root, play(name, opts), once(name, then), update(dt), clips} — root is a Group you can move/rotate freely
export function spawn(key, opts = {}){
  const m = MODELS[key], root = new THREE.Group(), api = {root, key, mixer:null, actions:{}, current:null, update(){}, play(){}, once(){}, ok:false};
  root.userData.model = api;
  const p = m ? load(m.url) : Promise.resolve(null);
  api.ready = p.then(g => {
    if(!g){ if(opts.fallback){ root.add(opts.fallback()); } return api; }
    const o = SkeletonUtils.clone(g.scene);
    o.traverse(n => { if(n.isMesh){ n.castShadow = opts.shadow !== false; n.receiveShadow = true; if(n.material && opts.tint){ n.material = n.material.clone(); n.material.color.multiply(new THREE.Color(opts.tint)); }
        if(n.material && opts.frost){ n.material = n.material.clone(); n.material.color.lerp(new THREE.Color(0xffffff), 0.55); n.material.emissive = new THREE.Color(0x3a4a5e); } } });
    // measure once per file (precise = includes skinning and nested node scales, e.g. FBX-converted rigs)
    if(!g.userData.box){ g.scene.updateMatrixWorld(true); g.userData.box = new THREE.Box3().setFromObject(g.scene, true); }
    const b = g.userData.box, s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), h = opts.height || m.height || 1;
    const k = h/Math.max(s.y, 1e-3)*(m.scale || 1); o.scale.multiplyScalar(k);
    o.position.set(-c.x*k, -b.min.y*k + (m.y || 0), -c.z*k);
    const wrap = new THREE.Group(); wrap.rotation.y = m.yaw || 0; wrap.add(o); root.add(wrap); api.inner = wrap;
    if(g.animations && g.animations.length){
      const mixer = api.mixer = new THREE.AnimationMixer(o), names = m.anims || {};
      const find = n => g.animations.find(a => a.name === (names[n] || n)) || g.animations.find(a => a.name.toLowerCase().includes(n));
      api.play = (n, o2 = {}) => {
        const clip = find(n); if(!clip) return null;
        const a = api.actions[clip.name] || (api.actions[clip.name] = mixer.clipAction(clip));
        if(api.current === a && !o2.restart) { a.timeScale = o2.speed || 1; return a; }
        a.reset(); a.setLoop(o2.once ? THREE.LoopOnce : THREE.LoopRepeat); a.clampWhenFinished = !!o2.once; a.timeScale = o2.speed || 1;
        a.fadeIn(o2.fade ?? 0.2).play(); if(api.current && api.current !== a) api.current.fadeOut(o2.fade ?? 0.2);
        api.current = a; api.currentName = n; return a;
      };
      api.once = (n, then, o2 = {}) => { const a = api.play(n, {...o2, once:true, restart:true}); if(!a) { then && then(); return; }
        const f = e => { if(e.action === a){ mixer.removeEventListener('finished', f); then && then(); } }; mixer.addEventListener('finished', f); };
      api.update = dt => mixer.update(dt);
      api.has = n => !!find(n);
    }
    api.ok = true; return api;
  });
  return api;
}
