// DualSense over WebHID: input parsing (USB 0x01 / BT 0x31), output (lightbar, LEDs, adaptive triggers, legacy rumble).
// Legacy rumble sets the "compatible vibration" bits; while those bits are on the actuators ignore USB-audio haptics,
// so rumble is only sent when HD haptics are not in use (see haptics.js).

const VID = 0x054c, PIDS = [0x0ce6, 0x0df2];

export const TRG = (() => {
  const pack = s => { let active = 0, packed = 0; for(let i = 0; i < 10; i++){ const v = s[i] | 0; if(v > 0){ active |= 1 << i; packed |= ((v - 1) & 7) << (3*i); } } return {active, packed}; };
  const zones = (mode, s, freq) => { const {active, packed} = pack(s); return [mode, active & 255, (active >> 8) & 255, packed & 255, (packed >> 8) & 255, (packed >> 16) & 255, (packed >>> 24) & 255, 0, 0, freq | 0, 0]; };
  const fill = (pos, f) => Array.from({length:10}, (_, i) => i >= pos ? f(i) : 0);
  return {
    off: () => [0x05, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    feedback: (pos, str) => zones(0x21, fill(pos, () => str), 0),                        // 벽 같은 저항
    ramp: (pos, from = 1, to = 8) => zones(0x21, fill(pos, i => Math.min(8, Math.round(from + (i - pos)*(to - from)/Math.max(1, 9 - pos)))), 0),
    weapon: (st, en, str) => { const ss = (1 << st) | (1 << en); return [0x25, ss & 255, (ss >> 8) & 255, (str - 1) & 7, 0, 0, 0, 0, 0, 0, 0]; },   // 딸깍 끊기는 방아쇠
    vibration: (pos, amp, freq) => zones(0x26, fill(pos, () => amp), freq),
    zones
  };
})();

const crcT = (() => { const t = new Uint32Array(256); for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for(const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };

export const DS = {
  supported: !!navigator.hid,
  dev: null, bt: false, label: '',
  s: {lx:0, ly:0, rx:0, ry:0, l2:0, r2:0, b:{}, touch:[{down:false, x:0, y:0}, {down:false, x:0, y:0}], gyro:[0,0,0], accel:[0,0,0], battery:-1, t:0},
  out: {rgb:[40, 110, 255], players:0, mic:false, strong:0, weak:0, trigL:TRG.off(), trigR:TRG.off()},
  allowRumble: true,           // haptics.js turns this off while HD haptics are active
  listeners: new Set(),
  get connected(){ return !!(this.dev && this.dev.opened); },
  on(fn){ this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit(ev){ this.listeners.forEach(f => { try{ f(ev); }catch(e){ console.error(e); } }); },

  async request(){
    if(!navigator.hid) throw new Error('webhid');
    const devs = await navigator.hid.requestDevice({filters: PIDS.map(productId => ({vendorId:VID, productId}))});
    if(!devs.length) return false;
    await this.open(devs[0]); return true;
  },
  async reconnect(){
    if(!navigator.hid) return false;
    const l = await navigator.hid.getDevices(), d = l.find(x => x.vendorId === VID && PIDS.includes(x.productId));
    if(d){ try{ await this.open(d); return true; }catch(e){ console.warn(e); } }
    return false;
  },
  async open(dev){
    if(!dev.opened) await dev.open();
    this.dev = dev; this.label = dev.productName || 'DualSense'; this.bt = false; this.firstOut = true; this.lastSig = '';
    dev.oninputreport = e => this.parse(e);
    await this.calibrate(dev);
    this.emit({type:'connect'});
  },
  cal: {gb:[0,0,0], gs:[0.061, 0.061, 0.061], ab:[0,0,0], as:[1/8192, 1/8192, 1/8192]},
  async calibrate(dev){
    try{
      const dv = await dev.receiveFeatureReport(0x05);     // on BT this also switches the pad to full 0x31 reports
      const g = i => dv.getInt16(i, true), sp = g(18) + g(20);
      const ax = [[0,6,8], [2,10,12], [4,14,16]], gs = ax.map(([, p, m]) => sp / (g(p) - g(m)));
      if(gs.every(v => v > 0.02 && v < 0.2)){ this.cal.gb = ax.map(([b]) => g(b)); this.cal.gs = gs; }
      const ac = [[22,24], [26,28], [30,32]], rng = ac.map(([p, m]) => g(p) - g(m));
      if(rng.every(r => r > 4000 && r < 40000)){ this.cal.ab = ac.map(([p, m]) => g(p) - (g(p) - g(m))/2); this.cal.as = rng.map(r => 2/r); }
    }catch(e){ console.warn('calibration', e); }
  },
  parse(e){
    const d = e.data; let o;
    if(e.reportId === 0x01 && d.byteLength >= 62) o = 0;
    else if(e.reportId === 0x31 && d.byteLength >= 63){ o = 1; this.bt = true; }
    else return;
    const u8 = i => d.getUint8(o + i), s16 = i => d.getInt16(o + i, true), S = this.s, B = S.b;
    S.lx = (u8(0) - 128)/127; S.ly = (u8(1) - 128)/127; S.rx = (u8(2) - 128)/127; S.ry = (u8(3) - 128)/127;
    S.l2 = u8(4)/255; S.r2 = u8(5)/255;
    const b0 = u8(7), b1 = u8(8), b2 = u8(9), dp = b0 & 15;
    B.square = !!(b0 & 0x10); B.cross = !!(b0 & 0x20); B.circle = !!(b0 & 0x40); B.tri = !!(b0 & 0x80);
    B.l1 = !!(b1 & 1); B.r1 = !!(b1 & 2); B.create = !!(b1 & 0x10); B.options = !!(b1 & 0x20); B.l3 = !!(b1 & 0x40); B.r3 = !!(b1 & 0x80);
    B.ps = !!(b2 & 1); B.tpad = !!(b2 & 2); B.mute = !!(b2 & 4);
    B.up = dp === 0 || dp === 1 || dp === 7; B.right = dp >= 1 && dp <= 3; B.down = dp >= 3 && dp <= 5; B.left = dp >= 5 && dp <= 7;
    for(let i = 0; i < 2; i++){
      const p = 32 + i*4, b = u8(p), t = S.touch[i];
      t.down = !(b & 0x80); t.x = u8(p + 1) | ((u8(p + 2) & 0x0f) << 8); t.y = (u8(p + 2) >> 4) | (u8(p + 3) << 4);
    }
    const st = u8(52); S.battery = (st >> 4) === 2 ? 100 : Math.min(100, (st & 15)*10 + 5);
    const c = this.cal;
    S.gyro = [s16(15), s16(17), s16(19)].map((r, i) => (r - c.gb[i])*c.gs[i]);
    S.accel = [s16(21), s16(23), s16(25)].map((r, i) => (r - c.ab[i])*c.as[i]);
    S.t = performance.now();
  },
  build(){
    const out = this.out, d = new Uint8Array(47), rum = this.allowRumble && (out.weak | out.strong) > 0;
    d[0] = 0x04 | 0x08 | 0x20 | (rum ? 0x01 : 0);       // triggers R/L, speaker volume, (compat vibration only while rumbling)
    d[1] = 0x01 | 0x04 | 0x10;                          // mic LED, lightbar, player LEDs
    d[2] = rum ? out.weak & 255 : 0; d[3] = rum ? out.strong & 255 : 0;
    d[5] = 0x64; d[8] = out.mic ? 1 : 0; d[37] = 0x02;
    d.set(out.trigR, 10); d.set(out.trigL, 21);
    d[38] = (rum ? 0x04 : 0) | (this.firstOut ? 0x02 : 0); d[41] = this.firstOut ? 2 : 0;
    d[43] = out.players & 0x1f; d[44] = out.rgb[0] & 255; d[45] = out.rgb[1] & 255; d[46] = out.rgb[2] & 255;
    return d;
  },
  async flush(now){
    if(!this.connected || this.sending) return;
    const c = this.build(), sig = c.join(',');
    if(sig === this.lastSig && now - this.lastAt < 400) return;
    this.sending = true;
    try{
      if(this.bt){
        const b = new Uint8Array(77); b[0] = ((this.seq = ((this.seq | 0) + 1) & 15)) << 4; b[1] = 0x10; b.set(c, 2);
        const body = new Uint8Array(75); body[0] = 0xA2; body[1] = 0x31; body.set(b.subarray(0, 73), 2);
        const crc = crc32(body); b[73] = crc & 255; b[74] = (crc >> 8) & 255; b[75] = (crc >> 16) & 255; b[76] = (crc >>> 24) & 255;
        await this.dev.sendReport(0x31, b);
      } else await this.dev.sendReport(0x02, c);
      this.firstOut = false; this.lastSig = sig; this.lastAt = now;
    }catch(e){ console.warn('ds out', e); }
    this.sending = false;
  },
  resetOutput(){ Object.assign(this.out, {strong:0, weak:0, trigL:TRG.off(), trigR:TRG.off(), players:0}); }
};

if(navigator.hid) navigator.hid.addEventListener('disconnect', e => { if(e.device === DS.dev){ DS.dev = null; DS.emit({type:'disconnect'}); } });
