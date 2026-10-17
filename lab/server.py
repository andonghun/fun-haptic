"""DualSense Lab 로컬 서버 + 4채널 햅틱 엔진.
정적 파일을 서빙하고, 브라우저가 POST /h 로 보낸 햅틱 이벤트를 Windows WASAPI 4채널로 직접 재생한다.
채널 0·1 = 스피커, 2·3 = 왼쪽/오른쪽 보이스코일.
"""
import os, json, threading, http.server
import numpy as np, sounddevice as sd, soundfile as sf

ROOT = os.path.dirname(os.path.abspath(__file__)); os.chdir(ROOT)
SR = 48000
HAP_F = {'metal': 190, 'wood': 105, 'grass': 75, 'snow': 85, 'stone': 68}
HAP_C = {'metal': 520, 'wood': 300, 'grass': 230, 'snow': 270, 'stone': 380}
FILES = {
    'metal': [f'impactPlate_light_00{i}.ogg' for i in range(5)], 'wood': [f'footstep_wood_00{i}.ogg' for i in range(5)],
    'grass': [f'footstep_grass_00{i}.ogg' for i in range(5)], 'snow': [f'footstep_snow_00{i}.ogg' for i in range(5)],
    'stone': [f'footstep_concrete_00{i}.ogg' for i in range(5)],
}


def load(path):
    x, sr = sf.read(path, dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    if sr != SR:
        n = int(len(x) * SR / sr); x = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)
    return x


def make_haptic(x, f, fc):
    """브라우저 makeHaptic()과 동일: 포락선×저역 캐리어 + 저역통과 원음 + 첫 타격 클릭."""
    n = len(x)
    a = 1 - np.exp(-2 * np.pi * 320 / SR); atk = 1 - np.exp(-1 / (0.0008 * SR)); rel = 1 - np.exp(-1 / (0.022 * SR))
    lp = np.zeros(n); en = np.zeros(n); l1 = l2 = e = 0.0
    for i in range(n):
        xi = float(x[i]); l1 += a * (xi - l1); l2 += a * (l1 - l2); lp[i] = l2
        ax = abs(xi); e += (atk if ax > e else rel) * (ax - e); en[i] = e
    pk = max(en.max(), 1e-6); lpk = max(np.abs(lp).max(), 1e-6)
    t = np.arange(n) / SR
    ph = np.cumsum(2 * np.pi * f * (1 - 0.3 * np.minimum(1, t / 0.1)) / SR)
    click = np.where(t < 0.04, 1.3 * np.sin(2 * np.pi * fc * t) * np.exp(-t / 0.006), 0)
    o = (0.85 * (en / pk) ** 0.6 * np.sin(ph) + 0.4 * lp / lpk) * np.exp(-t / 0.11) + click
    o = o / max(np.abs(o).max(), 1e-6) * 0.98
    fade = int(SR * 0.02); o[-fade:] *= np.linspace(1, 0, fade)
    return o.astype(np.float32)


print('샘플 로딩/변환 중...', flush=True)
HAPT = {k: [make_haptic(load(os.path.join('sounds', fn)), HAP_F[k], HAP_C[k]) for fn in v] for k, v in FILES.items()}
GH = {'coin': (260, 700), 'jump': (95, 300), 'land': (55, 260), 'break': (120, 420), 'fall': (70, 200)}
HAPG = {k: make_haptic(load(os.path.join('sounds', 'game', k + '.ogg')), *v) for k, v in GH.items() if os.path.exists(os.path.join('sounds', 'game', k + '.ogg'))}
print('완료', flush=True)

lock = threading.Lock(); voices = []; rolls = []; master = 2.2


def pan_w(p):
    a = (max(-1, min(1, p)) + 1) * np.pi / 4; return [0, 0, float(np.cos(a)), float(np.sin(a))]


def add_voice(buf, w, gain=1.0):
    with lock: voices.append([np.asarray(buf, np.float32), 0, [x * gain for x in w]])


def synth_pulse(freq, amp, dur):
    n = int(SR * (dur + 0.03)); t = np.arange(n) / SR
    env = np.minimum(1, t / 0.002) * np.exp(np.log(0.001) * np.clip(t / dur, 0, 1)) * (t < dur)
    ph = np.cumsum(2 * np.pi * freq * (0.55 ** np.clip(t / dur, 0, 1)) / SR)
    return (amp * env * (np.sin(ph) + 0.35 * np.sin(2 * ph))).astype(np.float32)


def synth_noise(f, q, dur, gain, att):
    n = int(SR * (dur + 0.02)); t = np.arange(n) / SR
    spec = np.fft.rfft(np.random.randn(n)); fr = np.fft.rfftfreq(n, 1 / SR)
    sigma = max(f / max(q, 0.3), 20) / 2.355
    y = np.fft.irfft(spec * np.exp(-0.5 * ((fr - f) / sigma) ** 2), n)
    y = y / max(np.abs(y).max(), 1e-6)
    env = np.minimum(1, t / max(att, 0.001)) * np.exp(np.log(0.001) * np.clip(t / dur, 0, 1)) * (t < dur)
    return (gain * y * env).astype(np.float32)


def callback(outdata, frames, time_info, status):
    out = np.zeros((frames, 4), np.float32)
    with lock:
        keep = []
        for v in voices:
            buf, pos, w = v; chunk = buf[pos:pos + frames]; m = len(chunk)
            for c in range(4):
                if w[c]: out[:m, c] += chunk * w[c]
            v[1] = pos + m
            if v[1] < len(buf): keep.append(v)
        voices[:] = keep
        tt = np.arange(frames)
        for r in rolls:
            r['lev'] += (r['tgt'] - r['lev']) * 0.25
            if r['lev'] < 1e-3 and r['tgt'] == 0: continue
            ph = r['ph'] + 2 * np.pi * r['f'] * tt / SR; pl = r['pl'] + 2 * np.pi * r['lf'] * tt / SR
            nz = np.convolve(np.random.randn(frames + 2), [0.3, 0.4, 0.3], 'valid')[:frames]
            sig = r['lev'] * (np.sin(ph) * (0.6 + 0.4 * np.sin(pl)) + 0.35 * nz)
            r['ph'] = float(ph[-1] % (2 * np.pi)); r['pl'] = float(pl[-1] % (2 * np.pi))
            w = pan_w(r['pan']); out[:, 2] += sig * w[2]; out[:, 3] += sig * w[3]
    outdata[:] = np.clip(np.tanh(out * master * 0.7) / 0.6, -1, 1)


def find_device():
    ha = {i: h['name'] for i, h in enumerate(sd.query_hostapis())}
    for i, d in enumerate(sd.query_devices()):
        if 'WASAPI' in ha[d['hostapi']] and d['max_output_channels'] >= 4 and ('DualSense' in d['name'] or 'Wireless Controller' in d['name']):
            return i, d['name']
    return None, None


dev_idx, dev_name = find_device()
stream = None
if dev_idx is not None:
    stream = sd.OutputStream(samplerate=SR, channels=4, dtype='float32', device=dev_idx, blocksize=256, latency='low', callback=callback)
    stream.start(); print('햅틱 출력 장치:', dev_name.encode('ascii', 'replace').decode(), flush=True)
else:
    print('DualSense 4채널 WASAPI 장치를 찾지 못했습니다 (USB 연결 확인)', flush=True)


def handle(d):
    global master
    t = d.get('t')
    if t == 'sample':
        buf = HAPT[d['k']][int(d['i'])]; r = float(d.get('r', 1))
        if abs(r - 1) > 0.01:
            n = int(len(buf) / r); buf = np.interp(np.linspace(0, len(buf) - 1, n), np.arange(len(buf)), buf)
        add_voice(buf, pan_w(float(d.get('p', 0))), float(d.get('g', 1)))
    elif t == 'gsample':
        buf = HAPG.get(d['k'])
        if buf is not None:
            r = float(d.get('r', 1))
            if abs(r - 1) > 0.01:
                n = int(len(buf) / r); buf = np.interp(np.linspace(0, len(buf) - 1, n), np.arange(len(buf)), buf)
            add_voice(buf, pan_w(float(d.get('p', 0))), float(d.get('g', 1)))
    elif t == 'pulse': add_voice(synth_pulse(d['f'], 1.0, d['d']), pan_w(float(d.get('p', 0))), float(d['a']))
    elif t == 'noise': add_voice(synth_noise(d['f'], d['q'], d['d'], 1.0, d['att']), pan_w(float(d.get('p', 0))), float(d['g']))
    elif t == 'chan':
        n = int(SR * 0.6); tt = np.arange(n) / SR
        buf = (0.9 * np.sin(2 * np.pi * 170 * tt) * np.minimum(1, tt / 0.02) * np.minimum(1, (0.6 - tt) / 0.05)).astype(np.float32)
        w = [0, 0, 0, 0]; w[int(d['c'])] = 1; add_voice(buf, w)
    elif t == 'roll':
        with lock:
            while len(rolls) < len(d['lv']): rolls.append({'lev': 0.0, 'tgt': 0.0, 'f': 100.0, 'lf': 4.0, 'pan': 0.0, 'ph': 0.0, 'pl': 0.0})
            for r, lv, pn, f, lf in zip(rolls, d['lv'], d['pn'], d['f'], d['l']): r.update(tgt=lv, pan=pn, f=f, lf=lf)
    elif t == 'master': master = float(d['v'])


class H(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def log_message(self, *a): pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()

    def do_GET(self):
        if self.path == '/h/ping':
            body = json.dumps({'ok': stream is not None, 'device': (dev_name or '')}).encode()
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
        else: super().do_GET()

    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0))
        try: handle(json.loads(self.rfile.read(n) or b'{}'))
        except Exception as e: print('handle error:', repr(e), flush=True)
        self.send_response(204); self.send_header('Content-Length', '0'); self.end_headers()


if __name__ == '__main__':
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8765), H)
    print('http://localhost:8765/index.html', flush=True)
    srv.serve_forever()
