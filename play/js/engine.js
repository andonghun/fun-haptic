// Renderer, sky, lights, third-person camera rig, particles, fades.
import * as THREE from 'three';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a)*t;
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k*dt));

export const E = {
  renderer: null, scene: null, camera: null, sun: null, hemi: null, sky: null, world: null, clock: new THREE.Clock(),
  init(canvasParent){
    const r = this.renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
    r.setPixelRatio(Math.min(2, devicePixelRatio)); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    canvasParent.appendChild(r.domElement);
    const s = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 600);
    this.hemi = new THREE.HemisphereLight(0xdff0ff, 0x5a6b48, 1.2); s.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xfff1dc, 2.6); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = sc.bottom = -32; sc.right = sc.top = 32; sc.near = 1; sc.far = 140; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    s.add(sun, sun.target);
    this.sky = makeSky(); s.add(this.sky);
    s.fog = new THREE.Fog(0xbfd8ef, 60, 220);
    this.resize(); addEventListener('resize', () => this.resize());
  },
  setSky(top, horizon, ground, fog){ const u = this.sky.material.uniforms; u.top.value.set(top); u.horizon.value.set(horizon); u.bottom.value.set(ground); this.scene.fog.color.set(fog ?? horizon); },
  resize(){ const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h); this.camera.aspect = w/h; this.camera.updateProjectionMatrix(); },
  setWorld(g){ if(this.world) this.scene.remove(this.world); this.world = g; if(g) this.scene.add(g); },
  // keep the shadow frustum centred on the player
  followSun(p){ this.sun.position.set(p.x + 22, p.y + 40, p.z + 14); this.sun.target.position.set(p.x, p.y, p.z); this.sky.position.copy(this.camera.position); },
  render(){ this.renderer.render(this.scene, this.camera); }
};

function makeSky(){
  const m = new THREE.ShaderMaterial({side:THREE.BackSide, depthWrite:false, fog:false,
    uniforms:{top:{value:new THREE.Color(0x3f8ce0)}, horizon:{value:new THREE.Color(0xcfe6fb)}, bottom:{value:new THREE.Color(0x9cb6c9)}, sunDir:{value:new THREE.Vector3(0.45, 0.8, 0.3).normalize()}},
    vertexShader:'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'uniform vec3 top, horizon, bottom, sunDir; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(horizon, top, pow(h, 0.55)) : mix(horizon, bottom, pow(-h, 0.4)); float s = max(dot(vP, sunDir), 0.0); c += vec3(1.0,0.9,0.7)*pow(s, 64.0)*0.8 + vec3(1.0,0.85,0.6)*pow(s, 6.0)*0.12; gl_FragColor = vec4(c, 1.0); }'});
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), m); sky.renderOrder = -1; sky.frustumCulled = false; return sky;
}

// Third-person orbit camera with smoothing and shake.
export const Cam = {
  yaw: 0, pitch: 0.42, dist: 7.5, target: new THREE.Vector3(), cur: new THREE.Vector3(), shakeA: 0, ground: () => 0, minPitch: 0.08, maxPitch: 1.25,
  snap(p){ this.target.copy(p); this.cur.copy(p); },
  update(dt, look){
    if(look){ this.yaw -= look.x*dt*2.6; this.pitch = clamp(this.pitch + look.y*dt*1.6, this.minPitch, this.maxPitch); }
    this.cur.x = damp(this.cur.x, this.target.x, 10, dt); this.cur.y = damp(this.cur.y, this.target.y, 6, dt); this.cur.z = damp(this.cur.z, this.target.z, 10, dt);
    const c = E.camera, cp = Math.cos(this.pitch);
    c.position.set(this.cur.x + this.dist*cp*Math.sin(this.yaw), this.cur.y + this.dist*Math.sin(this.pitch), this.cur.z + this.dist*cp*Math.cos(this.yaw));
    const gy = this.ground(c.position.x, c.position.z) + 0.4; if(c.position.y < gy) c.position.y = gy;
    if(this.shakeA > 0.001){ c.position.x += (Math.random() - 0.5)*this.shakeA; c.position.y += (Math.random() - 0.5)*this.shakeA; this.shakeA *= Math.exp(-dt*9); }
    c.lookAt(this.cur.x, this.cur.y + 0.2, this.cur.z);
  },
  shake(a){ this.shakeA = Math.max(this.shakeA, a); },
  // world-space directions on the ground plane for stick input
  fwd(){ return [-Math.sin(this.yaw), -Math.cos(this.yaw)]; }, right(){ return [Math.cos(this.yaw), -Math.sin(this.yaw)]; },
  // -1 (left) .. 1 (right) for a world point relative to the view — used to pan haptics
  panOf(x, z){ const dx = x - this.cur.x, dz = z - this.cur.z, d = Math.hypot(dx, dz) || 1, r = this.right(); return clamp((dx*r[0] + dz*r[1])/d*1.15, -1, 1); }
};

// Simple pooled particles (sparkles, dust, splashes)
export const FX = {
  list: [], geo: null, init(){ this.geo = new THREE.SphereGeometry(1, 6, 4); },
  burst(pos, o = {}){
    const n = o.n || 12, col = new THREE.Color(o.color ?? 0xffffff);
    for(let i = 0; i < n; i++){
      const m = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:1, depthWrite:false}));
      const s = (o.size || 0.08)*(0.6 + Math.random()*0.8); m.scale.setScalar(s); m.position.copy(pos);
      const a = Math.random()*Math.PI*2, up = (o.up ?? 3)*(0.5 + Math.random()), sp = (o.speed || 3)*(0.3 + Math.random()*0.7);
      E.scene.add(m); this.list.push({m, v:new THREE.Vector3(Math.cos(a)*sp, up, Math.sin(a)*sp), life:(o.life || 0.8)*(0.6 + Math.random()*0.6), t:0, g:o.gravity ?? 9, s});
    }
  },
  update(dt){
    for(let i = this.list.length - 1; i >= 0; i--){ const p = this.list[i]; p.t += dt;
      if(p.t > p.life){ E.scene.remove(p.m); p.m.material.dispose(); this.list.splice(i, 1); continue; }
      p.v.y -= p.g*dt; p.m.position.addScaledVector(p.v, dt); const k = 1 - p.t/p.life; p.m.material.opacity = k; p.m.scale.setScalar(p.s*(0.4 + 0.6*k)); }
  }
};

export const Fade = {
  el: null, init(el){ this.el = el; },
  to(v, ms = 400){ return new Promise(r => { this.el.style.transition = `opacity ${ms}ms`; this.el.style.opacity = v; setTimeout(r, ms); }); }
};
