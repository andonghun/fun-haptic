// Procedural ground textures (canvas) for each surface type — no image files needed.
import * as THREE from 'three';

const cache = {};
let seed = 1; const rnd = () => (seed = (seed*16807) % 2147483647)/2147483647;
const N = 512;
function canvas(){ const c = document.createElement('canvas'); c.width = c.height = N; return [c, c.getContext('2d')]; }
function speck(g, n, cols, rmin, rmax, alpha = 1){ for(let i = 0; i < n; i++){ g.globalAlpha = alpha*(0.4 + rnd()*0.6); g.fillStyle = cols[(rnd()*cols.length) | 0]; const r = rmin + rnd()*(rmax - rmin); g.beginPath(); g.arc(rnd()*N, rnd()*N, r, 0, 7); g.fill(); } g.globalAlpha = 1; }

const DRAW = {
  grass(g){ g.fillStyle = '#4f9a3c'; g.fillRect(0, 0, N, N); speck(g, 900, ['#5fae45', '#3f8530', '#6dbb4f', '#467f2f'], 6, 22, 0.35);
    g.lineWidth = 2; for(let i = 0; i < 2600; i++){ const x = rnd()*N, y = rnd()*N, l = 5 + rnd()*9; g.strokeStyle = ['#6cc04f', '#3c7d2c', '#86d061', '#58a843'][(rnd()*4) | 0]; g.globalAlpha = 0.7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5)*5, y - l); g.stroke(); } g.globalAlpha = 1; },
  wood(g){ const pw = N/8; for(let i = 0; i < 8; i++){ const base = [150 + rnd()*30, 92 + rnd()*20, 52 + rnd()*12]; g.fillStyle = `rgb(${base.map(v => v | 0)})`; g.fillRect(0, i*pw, N, pw);
      g.strokeStyle = 'rgba(70,40,18,0.35)'; g.lineWidth = 1.5; for(let k = 0; k < 7; k++){ const y = i*pw + 4 + rnd()*(pw - 8); g.beginPath(); g.moveTo(0, y); for(let x = 0; x <= N; x += 32) g.lineTo(x, y + Math.sin(x*0.02 + k)*2.5); g.stroke(); }
      const cut = rnd()*N; g.fillStyle = 'rgba(40,22,10,0.8)'; g.fillRect(cut, i*pw, 3, pw); g.fillStyle = 'rgba(30,18,8,0.9)'; g.fillRect(0, i*pw + pw - 3, N, 3);
      g.fillStyle = 'rgba(60,40,30,0.8)'; [cut - 14, cut + 14].forEach(x => { g.beginPath(); g.arc(x, i*pw + pw/2, 2.6, 0, 7); g.fill(); }); } },
  metal(g){ const gr = g.createLinearGradient(0, 0, N, N); gr.addColorStop(0, '#8d97a3'); gr.addColorStop(1, '#6d7680'); g.fillStyle = gr; g.fillRect(0, 0, N, N);
    for(let y = 0; y < N; y += 32) for(let x = (y/32 % 2)*16; x < N; x += 32){ g.save(); g.translate(x + 8, y + 8); g.rotate(0.6); g.fillStyle = 'rgba(220,230,240,0.35)'; g.fillRect(-7, -2, 14, 4); g.fillStyle = 'rgba(30,35,40,0.35)'; g.fillRect(-7, 2, 14, 1.5); g.restore(); }
    g.strokeStyle = 'rgba(30,34,40,0.8)'; g.lineWidth = 3; g.strokeRect(1, 1, N - 2, N - 2); g.beginPath(); g.moveTo(N/2, 0); g.lineTo(N/2, N); g.stroke();
    g.fillStyle = '#c9d1da'; for(let i = 8; i < N; i += 40){ [[i, 8], [i, N - 8], [8, i], [N - 8, i], [N/2 - 8, i], [N/2 + 8, i]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }); }
    speck(g, 300, ['#5b4a3b', '#7a6450'], 1, 4, 0.25); },
  snow(g){ g.fillStyle = '#eef4fb'; g.fillRect(0, 0, N, N); speck(g, 500, ['#dbe6f3', '#f9fbff', '#cfdced'], 8, 28, 0.35); speck(g, 1500, ['#ffffff', '#c7d6e8'], 0.5, 1.6, 0.9); },
  stone(g){ g.fillStyle = '#7d7f84'; g.fillRect(0, 0, N, N); const ts = N/4;
    for(let y = 0; y < 4; y++) for(let x = 0; x < 4; x++){ const off = (y % 2)*ts/2, c = 150 + rnd()*40 | 0; g.fillStyle = `rgb(${c},${c - 2},${c - 6 + rnd()*10 | 0})`;
      const px = x*ts + off + 3, py = y*ts + 3; g.beginPath(); g.roundRect ? g.roundRect(px % N, py, ts - 6, ts - 6, 8) : g.rect(px % N, py, ts - 6, ts - 6); g.fill(); if(px + ts > N){ g.beginPath(); g.rect(px - N, py, ts - 6, ts - 6); g.fill(); } }
    speck(g, 900, ['#6d6f73', '#9a9da2', '#5f6064'], 1, 5, 0.35);
    g.strokeStyle = 'rgba(50,50,55,0.5)'; g.lineWidth = 1.2; for(let i = 0; i < 14; i++){ let x = rnd()*N, y = rnd()*N; g.beginPath(); g.moveTo(x, y); for(let k = 0; k < 4; k++){ x += (rnd() - 0.5)*30; y += (rnd() - 0.5)*30; g.lineTo(x, y); } g.stroke(); } },
  gravel(g){ g.fillStyle = '#8c8174'; g.fillRect(0, 0, N, N); for(let i = 0; i < 2600; i++){ const c = 100 + rnd()*110 | 0, r = 2 + rnd()*5; g.fillStyle = `rgb(${c},${c - 8 | 0},${c - 18 | 0})`; g.beginPath(); g.ellipse(rnd()*N, rnd()*N, r, r*(0.6 + rnd()*0.4), rnd()*3, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.15)'; } },
  sand(g){ g.fillStyle = '#dcc08a'; g.fillRect(0, 0, N, N); g.strokeStyle = 'rgba(160,120,70,0.25)'; g.lineWidth = 3; for(let y = 0; y < N; y += 18){ g.beginPath(); for(let x = 0; x <= N; x += 16) g.lineTo(x, y + Math.sin(x*0.03 + y)*5); g.stroke(); } speck(g, 2000, ['#c9a874', '#efdbab', '#b89464'], 0.6, 1.8, 0.8); },
  water(g){ const gr = g.createLinearGradient(0, 0, 0, N); gr.addColorStop(0, '#2f8fd0'); gr.addColorStop(1, '#2a7fbf'); g.fillStyle = gr; g.fillRect(0, 0, N, N);
    g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 2; for(let i = 0; i < 60; i++){ const x = rnd()*N, y = rnd()*N, w = 20 + rnd()*40; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w/2, y - 4, x + w, y); g.stroke(); } }
};
export function surfaceTexture(key, repeat = 4){
  if(!cache[key]){ seed = 12345 + key.length*977; const [c, g] = canvas(); DRAW[key](g); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; cache[key] = t; }
  const t = cache[key].clone(); t.needsUpdate = true; t.repeat.set(repeat, repeat); return t;
}
export const SURF_PARAMS = {grass:{roughness:0.95}, wood:{roughness:0.8}, metal:{roughness:0.35, metalness:0.75}, snow:{roughness:0.9}, stone:{roughness:0.85}, gravel:{roughness:1}, sand:{roughness:1}, water:{roughness:0.15, metalness:0.1, transparent:true, opacity:0.85}};
export function surfaceMaterial(key, w, d, tile = 4){
  const t = surfaceTexture(key); t.repeat.set(w/tile, d/tile);
  return new THREE.MeshStandardMaterial({map:t, ...SURF_PARAMS[key]});
}
