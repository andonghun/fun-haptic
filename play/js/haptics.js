// Haptics: HD (DualSense voice coils over USB audio ch3/ch4) with graceful fallback to legacy rumble
// (DualSense over Bluetooth, or any Gamepad API pad with a vibration actuator).
import { DS } from './ds.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const panGains = p => { const a = (clamp(p, -1, 1) + 1)*Math.PI/4; return [Math.cos(a), Math.sin(a)]; };

export const H = {
  hd: false, ctx: null, busL: null, busR: null, label: '', level: 1, base: 2.2,
  rumbles: [], pad: null, lastPadAt: 0,

  // ---- HD haptics -------------------------------------------------------
  async findOutput(){
    if(navigator.mediaDevices && navigator.mediaDevices.selectAudioOutput){
      try{ const d = await navigator.mediaDevices.selectAudioOutput(); if(d) return d; }catch(e){}
    }
    // Chrome hides output-device names until a media permission is granted; the mic stream is closed immediately.
    try{ (await navigator.mediaDevices.getUserMedia({audio:true})).getTracks().forEach(t => t.stop()); }catch(e){ return {error:'permission'}; }
    const outs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audiooutput');
    return outs.find(d => /dualsense|wireless controller/i.test(d.label)) || {error:'notfound'};
  },
  async enableHD(){
    if(!window.isSecureContext || !navigator.mediaDevices) return {ok:false, reason:'insecure'};
    if(!('setSinkId' in AudioContext.prototype)) return {ok:false, reason:'browser'};
    const dev = await this.findOutput();
    if(!dev || dev.error) return {ok:false, reason:dev ? dev.error : 'notfound'};
    const ctx = new AudioContext({latencyHint:'interactive'});
    try{ await ctx.setSinkId(dev.deviceId); }catch(e){ ctx.close(); return {ok:false, reason:'sink'}; }
    const max = ctx.destination.maxChannelCount;
    if(max < 4){ ctx.close(); return {ok:false, reason:'channels', channels:max}; }
    ctx.destination.channelCount = 4; ctx.destination.channelInterpretation = 'discrete';
    const merger = ctx.createChannelMerger(4); merger.connect(ctx.destination);
    // master gain → tanh soft clip (keeps punch without harsh clipping) → ch3 (left coil) / ch4 (right coil)
    const cv = new Float32Array(2048); for(let i = 0; i < 2048; i++){ const x = i/1023.5 - 1; cv[i] = Math.tanh(x*1.6)/Math.tanh(1.6); }
    const mk = ch => { const g = ctx.createGain(), sh = ctx.createWaveShaper(); sh.curve = cv; g.connect(sh); sh.connect(merger, 0, ch); return g; };
    this.busL = mk(2); this.busR = mk(3); this.ctx = ctx; this.merger = merger; this.hd = true; this.label = dev.label || 'DualSense';
    this.setLevel(this.level);
    if(ctx.state === 'suspended') await ctx.resume();
    DS.allowRumble = false;
    return {ok:true, label:this.label, channels:max};
  },
  setLevel(v){ this.level = v; if(this.busL){ this.busL.gain.value = this.busR.gain.value = this.base*v; } },
  out(pan){ const [l, r] = panGains(pan), c = this.ctx, gl = c.createGain(), gr = c.createGain(), g = c.createGain();
    gl.gain.value = l; gr.gain.value = r; g.connect(gl).connect(this.busL); g.connect(gr).connect(this.busR); return g; },

  // ---- primitives ---------------------------------------------------------
  // A short tonal hit: freq glides down to 55% (gives the "thock"), 2nd harmonic adds body.
  pulse(freq, amp, dur, pan = 0, t = 0){
    if(!this.hd){ this.rumble(freq, amp, dur, pan, t); return; }
    const c = this.ctx, t0 = c.currentTime + t, g = this.out(pan);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(clamp(amp, 0, 1.6), t0 + 0.002); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    for(const [m, a] of [[1, 1], [2, 0.35]]){ const o = c.createOscillator(), h = c.createGain(); h.gain.value = a;
      o.frequency.setValueAtTime(freq*m, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, freq*m*0.55), t0 + dur); o.connect(h).connect(g); o.start(t0); o.stop(t0 + dur + 0.03); }
  },
  // A steady tone (no glide) — hums, engines, charge-ups.
  tone(freq, amp, dur, pan = 0, o = {}){
    if(!this.hd){ this.rumble(freq, amp*0.8, dur, pan, o.t || 0, true); return; }
    const c = this.ctx, t0 = c.currentTime + (o.t || 0), g = this.out(pan), os = c.createOscillator();
    os.type = o.type || 'sine'; os.frequency.setValueAtTime(freq, t0); if(o.fEnd) os.frequency.exponentialRampToValueAtTime(o.fEnd, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(clamp(amp, 0, 1.6), t0 + (o.att || 0.01)); g.gain.setValueAtTime(clamp(amp, 0, 1.6), t0 + Math.max(0.011, dur - (o.rel || 0.05))); g.gain.linearRampToValueAtTime(0, t0 + dur);
    os.connect(g); os.start(t0); os.stop(t0 + dur + 0.02);
  },
  noiseBuf: null,
  noise(o){
    const dur = o.dur || 0.1, pan = o.pan || 0;
    if(!this.hd){ this.rumble(o.f || 200, (o.gain || 0.3)*1.2, dur, pan, o.t || 0); return; }
    const c = this.ctx, t0 = c.currentTime + (o.t || 0);
    if(!this.noiseBuf){ this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = this.noiseBuf.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1; }
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q || 1; f.frequency.setValueAtTime(o.f || 200, t0); if(o.fEnd) f.frequency.exponentialRampToValueAtTime(o.fEnd, t0 + dur);
    const g = this.out(pan); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(o.gain || 0.3, t0 + (o.att || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g); src.start(t0, Math.random()*0.5); src.stop(t0 + dur + 0.02);
  },
  // play a haptic buffer made by fromSound()
  play(buf, rate = 1, gain = 1, pan = 0, t = 0){
    if(!buf) return;
    if(!this.hd){ this.rumble(buf._f || 100, gain*0.7, Math.min(0.35, buf.duration*0.6/rate), pan, t); return; }
    const c = this.ctx, s = c.createBufferSource(), g = this.out(pan); s.buffer = buf; s.playbackRate.value = rate; g.gain.value = gain;
    s.connect(g); s.start(c.currentTime + t);
  },
  // Sound → haptic: envelope × low carrier (slight downward glide) + low-passed original + sharp onset click.
  fromSound(snd, f, fc){
    const ctx = this.ctx || (this._off = this._off || new OfflineAudioContext(1, 1, 48000));
    const n = snd.length, sr = snd.sampleRate, x = snd.getChannelData(0), out = ctx.createBuffer(1, n, sr), o = out.getChannelData(0);
    const a = 1 - Math.exp(-2*Math.PI*320/sr), atk = 1 - Math.exp(-1/(0.0008*sr)), rel = 1 - Math.exp(-1/(0.022*sr));
    const lp = new Float32Array(n), en = new Float32Array(n); let l1 = 0, l2 = 0, e = 0, pk = 1e-6, lpk = 1e-6;
    for(let i = 0; i < n; i++){ l1 += a*(x[i] - l1); l2 += a*(l1 - l2); lp[i] = l2; lpk = Math.max(lpk, Math.abs(l2));
      const ax = Math.abs(x[i]); e += (ax > e ? atk : rel)*(ax - e); en[i] = e; pk = Math.max(pk, e); }
    let ph = 0, mx = 1e-6;
    for(let i = 0; i < n; i++){ const t = i/sr; ph += 2*Math.PI*f*(1 - 0.3*Math.min(1, t/0.1))/sr;
      const click = t < 0.04 ? 1.3*Math.sin(2*Math.PI*fc*t)*Math.exp(-t/0.006) : 0;
      o[i] = (0.85*Math.pow(en[i]/pk, 0.6)*Math.sin(ph) + 0.4*lp[i]/lpk)*Math.exp(-t/0.11) + click; mx = Math.max(mx, Math.abs(o[i])); }
    const fade = Math.floor(sr*0.02); for(let i = 0; i < n; i++) o[i] = o[i]/mx*0.98*(i > n - fade ? (n - i)/fade : 1);
    out._f = f; return out;
  },

  // ---- legacy rumble fallback ----------------------------------------------
  // Left (strong, heavy) motor gets low frequencies and left pan; right (weak, light) motor the rest.
  rumble(freq, amp, dur, pan = 0, t = 0, sustain = false){
    const now = performance.now() + t*1000, [l, r] = panGains(pan), m = clamp(amp/1.2, 0, 1), low = freq < 140 ? 1 : 0.35;
    this.rumbles.push({t0:now, t1:now + Math.max(40, dur*1000), s:m*l*(0.55 + 0.45*low)*1.4, w:m*r*(0.75 + 0.25*(1 - low))*1.4, sustain});
  },
  // Continuous voice (rolling, engines, rain hiss): filtered noise + optional tone, set(level, freq, pan) every frame.
  voices: new Set(),
  voice(o = {}){
    const v = {level:0, freq:o.f || 120, pan:0, dead:false, set(level, freq, pan){ this.level = level; if(freq) this.freq = freq; if(pan != null) this.pan = pan; this.apply && this.apply(); }, stop(){ this.dead = true; this.level = 0; this.apply && this.apply(); this.kill && setTimeout(this.kill, 200); H.voices.delete(this); }};
    if(this.hd){
      const c = this.ctx;
      if(!this.noiseBuf){ this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = this.noiseBuf.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1; }
      const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = o.q || 0.9; bp.frequency.value = v.freq;
      const g = c.createGain(), gl = c.createGain(), gr = c.createGain(); g.gain.value = 0;
      src.connect(bp).connect(g); g.connect(gl).connect(this.busL); g.connect(gr).connect(this.busR);
      let os = null, og = null; if(o.tone){ os = c.createOscillator(); os.frequency.value = v.freq*0.5; og = c.createGain(); og.gain.value = o.tone; os.connect(og).connect(g); os.start(); }
      src.start();
      v.apply = () => { const t = c.currentTime, [l, r] = panGains(v.pan); g.gain.setTargetAtTime(clamp(v.level, 0, 1.4), t, 0.03); bp.frequency.setTargetAtTime(Math.max(20, v.freq), t, 0.05); if(os) os.frequency.setTargetAtTime(Math.max(15, v.freq*0.5), t, 0.05); gl.gain.setTargetAtTime(l, t, 0.03); gr.gain.setTargetAtTime(r, t, 0.03); };
      v.kill = () => { try{ src.stop(); os && os.stop(); }catch(e){} };
    }
    this.voices.add(v); return v;
  },
  // called once per frame
  update(now){
    let s = 0, w = 0;
    if(!this.hd) for(const v of this.voices){ const [l, r] = panGains(v.pan), m = clamp(v.level, 0, 1), low = v.freq < 140 ? 1 : 0.4; s = Math.max(s, m*l*(0.5 + 0.5*low)); w = Math.max(w, m*r); }
    for(let i = this.rumbles.length - 1; i >= 0; i--){
      const r = this.rumbles[i]; if(now > r.t1){ this.rumbles.splice(i, 1); continue; } if(now < r.t0) continue;
      const k = r.sustain ? 1 : 1 - (now - r.t0)/(r.t1 - r.t0); s = Math.max(s, r.s*k); w = Math.max(w, r.w*k);
    }
    s = clamp(s*this.level, 0, 1); w = clamp(w*this.level, 0, 1);
    if(DS.connected){ DS.out.strong = this.hd ? 0 : Math.round(s*255); DS.out.weak = this.hd ? 0 : Math.round(w*255); return; }
    const pad = this.pad;
    if(pad && pad.vibrationActuator && now - this.lastPadAt > 45){
      this.lastPadAt = now;
      if(s > 0.01 || w > 0.01 || this._padOn){ this._padOn = s > 0.01 || w > 0.01; pad.vibrationActuator.playEffect('dual-rumble', {duration:80, strongMagnitude:s, weakMagnitude:w}).catch(() => {}); }
    }
  },
  get active(){ return this.hd || DS.connected || !!(this.pad && this.pad.vibrationActuator); }
};
