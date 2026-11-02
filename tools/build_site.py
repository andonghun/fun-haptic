# Builds index.html (the landing site) from the Mint Noir template (Skillry skill bs-mint-noir-saas-site).
# Keeps the template's CSS, icon sprite, router and interaction code; replaces every page with Pixel Haptics content.
# Usage: python tools/build_site.py
import os, re, html

SKILL = os.path.expanduser(r'~/.claude/skills/bs-mint-noir-saas-site/references/template.html')
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'index.html')
T = open(SKILL, encoding='utf8').read().split('\n')

def lines(a, b): return '\n'.join(T[a - 1:b])           # 1-based inclusive

head = lines(1, 885)
head = re.sub(r'<title>.*?</title>', '<title>Pixel Haptics — feel your DualSense in the browser</title>', head, flags=re.S)
head = re.sub(r'<meta name="description"[^>]*>', '', head)
head = head.replace('<head>', '<head>\n<meta name="description" content="A free browser playground for the DualSense controller: HD haptics, adaptive triggers and the controller speaker, wired to 244 pixel-art effects. Plug in with USB and play — nothing to install.">', 1)

EXTRA_CSS = r'''
/* ---- Pixel Haptics additions (same tokens) ---- */
.pv{display:block;width:100%;aspect-ratio:16/9;image-rendering:pixelated;image-rendering:crisp-edges;background:#07090a;border-radius:12px;border:1px solid var(--line-2)}
.pv-main{border-radius:14px}
.trust .chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.trust .chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:var(--fill-2);border:1px solid var(--line-3);font:500 12px/1 'Geist Mono',monospace;color:var(--ink-72)}
.trust .chip .i{width:14px;height:14px;color:var(--mint)}
.xp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.xp-card{display:flex;flex-direction:column;gap:14px;padding:16px;border-radius:20px;background:var(--fill);border:1px solid var(--line-2);transition:transform .25s,border-color .25s}
.xp-card:hover{transform:translateY(-2px);border-color:var(--mint-22)}
.xp-card.lead{grid-column:1/-1;display:grid;grid-template-columns:1.6fr 1fr;align-items:center;box-shadow:0 0 120px rgba(110,231,200,.12)}
.xp-card h3{margin:0;font:600 20px/1.2 Geist,sans-serif;letter-spacing:-.02em}
.xp-card p{margin:0;color:var(--ink-58);font-size:14px;line-height:1.55}
.xp-card .feats{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;font-size:14px;color:var(--ink-72)}
.xp-card .feats li{display:flex;gap:8px;align-items:center}.xp-card .feats .i{width:15px;height:15px;color:var(--mint);flex:none}
.xp-tags{display:flex;gap:6px;flex-wrap:wrap}
.xp-card .btn{align-self:flex-start}
@media (max-width:980px){.xp-grid{grid-template-columns:1fr 1fr}.xp-card.lead{grid-template-columns:1fr}}
@media (max-width:640px){.xp-grid{grid-template-columns:1fr}}
.drawer{position:fixed;inset:0;z-index:80;display:none}
.drawer.open{display:block}
.drawer .scrim{position:absolute;inset:0;background:rgba(7,9,10,.6);backdrop-filter:blur(4px)}
.drawer .panel{position:absolute;right:0;top:0;bottom:0;width:min(560px,100%);background:var(--bg-2);border-left:1px solid var(--line-3);padding:32px 32px 60px;overflow-y:auto;animation:drawIn .35s ease}
@keyframes drawIn{from{transform:translateX(30px);opacity:0}to{transform:none;opacity:1}}
.drawer h2{font:600 28px/1.15 Geist,sans-serif;letter-spacing:-.03em;margin:10px 0 18px}
.drawer p,.drawer li{color:var(--ink-72);font-size:15px;line-height:1.65}
.drawer ol,.drawer ul{padding-left:20px}
.drawer code{font-family:'Geist Mono',monospace;font-size:13px;background:var(--fill-2);border:1px solid var(--line-2);border-radius:6px;padding:1px 6px}
.drawer .close{position:absolute;top:18px;right:18px;width:36px;height:36px;border-radius:999px;border:1px solid var(--line-3);background:var(--fill);color:var(--ink);display:grid;place-items:center;cursor:pointer}
.lang-btn{font:500 12px/1 'Geist Mono',monospace;color:var(--ink-72);background:var(--fill);border:1px solid var(--line-3);border-radius:999px;padding:7px 11px;cursor:pointer}
.lang-btn:hover{color:var(--ink);border-color:var(--mint-22)}
.trig-viz{display:flex;flex-direction:column;gap:10px;margin-top:14px}
.trig-viz svg{width:100%;height:84px}
.surf-tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}
.surf{height:44px;border-radius:10px;border:1px solid var(--line-2);display:flex;align-items:flex-end;padding:6px 8px;font:500 10.5px/1 'Geist Mono',monospace;color:var(--ink-85);cursor:pointer;transition:border-color .2s,transform .2s}
.surf:hover,.surf.on{border-color:var(--mint);transform:translateY(-1px)}
.qmark-note{font:500 11px/1 'Geist Mono',monospace;letter-spacing:.08em;color:var(--ink-50);text-transform:uppercase}
'''
head = head.replace('</style>', EXTRA_CSS + '</style>', 1)

# ---- icon sprite: keep Lucide symbols, drop commerce brand marks, add a few game ones ----
sprite = T[888 - 1]
sprite = re.sub(r'<symbol id="b-[^"]+"[\s\S]*?</symbol>', '', sprite)
EXTRA_ICONS = (
  '<symbol id="i-gamepad-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></symbol>'
  '<symbol id="i-vibrate" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 8 2 2-2 2 2 2-2 2"/><path d="m22 8-2 2 2 2-2 2 2 2"/><rect width="8" height="14" x="8" y="5" rx="1"/></symbol>'
  '<symbol id="i-crosshair" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/></symbol>'
  '<symbol id="i-volume-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></symbol>'
  '<symbol id="i-usb" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="7" r="1"/><circle cx="4" cy="20" r="1"/><path d="M4.7 19.3 19 5"/><path d="m21 3-3 1 2 2Z"/><path d="M9.26 7.68 5 12l2 5"/><path d="m10 14 5 2 3.5-3.5"/><path d="m18 12 1-1 1 1-1 1Z"/></symbol>'
  '<symbol id="i-cloud-rain" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></symbol>'
  '<symbol id="i-footprints" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/></symbol>'
)
sprite = sprite.replace('</svg>', EXTRA_ICONS + '</svg>')

LOGO = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="8" height="8" fill="#6ee7c8"/><rect x="13" y="3" width="8" height="8" fill="#edf1f0" opacity=".9"/><rect x="3" y="13" width="8" height="8" fill="#edf1f0" opacity=".5"/><rect x="13" y="13" width="8" height="8" fill="#6ee7c8" opacity=".55"/></svg>'

def ko(s): return ' data-ko="' + html.escape(s, quote=True) + '"'
def ic(name): return f'<svg class="i"><use href="#i-{name}"/></svg>'

NAV = f'''<header class="nav">
  <div class="wrap">
    <div class="nav-left">
      <a class="brand" href="#home" aria-label="Pixel Haptics home">{LOGO}Pixel Haptics</a>
      <nav class="nav-links" aria-label="Primary">
        <a href="#home" data-nav="home"{ko('홈')}>Home</a>
        <a href="#experiences" data-nav="experiences"{ko('체험')}>Experiences</a>
        <a href="#guide" data-nav="guide"{ko('가이드')}>Guide</a>
        <a href="#changelog" data-nav="changelog"{ko('업데이트')}>Changelog</a>
      </nav>
    </div>
    <div class="nav-right">
      <button class="lang-btn" type="button" id="langBtn">한국어</button>
      <a class="btn btn-primary btn-sm" href="play/"{ko('지금 플레이')}>Play now</a>
      <button class="nav-burger" aria-label="Open menu" aria-expanded="false">{ic('menu')}</button>
    </div>
  </div>
</header>
<div class="mobile-menu" id="mobile-menu">
  <a href="#home" data-nav="home"{ko('홈')}>Home</a>
  <a href="#experiences" data-nav="experiences"{ko('체험')}>Experiences</a>
  <a href="#guide" data-nav="guide"{ko('가이드')}>Guide</a>
  <a href="#changelog" data-nav="changelog"{ko('업데이트')}>Changelog</a>
  <a href="play/"{ko('지금 플레이')}>Play now</a>
</div>'''

# experiences: id, icon, title, ko title, line, ko line, feels (en, ko), tags
XPS = [
  ('playground', 'gamepad-2', 'Playground', '플레이그라운드', 'Walk, run, dash and jump across eight surfaces, then beat straw dummies with sword, hammer, spear and fists, or shoot them with pistol, SMG and bow.', '여덟 가지 바닥 위를 걷고, 달리고, 대시하고, 점프하세요. 허수아비를 검·망치·창·주먹으로 치거나 권총·SMG·활로 쏘면 타격이 손에 그대로 꽂힙니다.',
   [('Left foot in the left hand, right foot in the right', '왼발은 왼손, 오른발은 오른손으로'), ('Hit-stop on every solid hit', '제대로 맞으면 멈칫하는 히트스톱'), ('A trigger effect for every weapon', '무기마다 다른 트리거 저항')], ['HD haptics', 'Adaptive triggers', 'Speaker']),
  ('rain', 'cloud-rain', 'Rain', '비', 'Drops tap your palms as R2 turns a drizzle into a downpour. Open an umbrella and the patter turns into drumming; call lightning and feel the static build first.', 'R2를 당길수록 빗줄기가 굵어지고 손바닥에 톡톡 떨어집니다. 우산을 펴면 두드리는 감촉으로 바뀌고, 번개를 부르면 먼저 정전기가 손을 타고 올라옵니다.',
   [('Random drops on both palms', '양손에 무작위로 떨어지는 빗방울'), ('Umbrella changes the texture', '우산을 펴면 질감이 바뀜'), ('Three lightning strokes you feel coming', '먼저 느껴지는 번개 세 번')], ['HD haptics', 'Adaptive triggers', 'Speaker']),
  ('pistol', 'crosshair', 'Pistol', '권총', 'Each shot waits for R2 to break at the click halfway down. The gun kicks, the round crosses the floor and the dummy rocks back.', 'R2가 중간에서 딸깍 끊기는 순간 한 발씩 나갑니다. 총이 튀고, 탄이 바닥을 가로질러 허수아비가 흔들립니다.',
   [('Break-point trigger click', '딸깍 끊기는 방아쇠'), ('Recoil, then the impact on the right', '반동, 그다음 오른쪽에서 오는 명중감'), ('Casings tinkle from the controller speaker', '탄피 소리는 컨트롤러 스피커에서')], ['Adaptive triggers', 'HD haptics', 'Speaker']),
  ('rifle', 'zap', 'Machine gun', '기관총', 'Hold R2 and the trigger itself vibrates with every round, twelve a second. Keep firing and it overheats: the trigger locks stiff until the barrel cools.', 'R2를 당기고 있으면 초당 12발마다 트리거 자체가 떨립니다. 계속 쏘면 과열돼서 총열이 식을 때까지 트리거가 딱딱하게 굳습니다.',
   [('Vibrating trigger', '떨리는 트리거'), ('Overheat locks the trigger', '과열되면 트리거가 잠김'), ('Bullets chew the wall to the right', '오른쪽 벽에 꽂히는 탄환')], ['Adaptive triggers', 'HD haptics', 'Speaker']),
  ('bow', 'crosshair', 'Bow', '활', 'R2 is the bowstring. It gets heavier the further you pull, your arms tremble at full draw, and the string rings left and right when you let go.', 'R2가 곧 활시위입니다. 당길수록 무거워지고, 끝까지 당기면 팔이 떨리고, 놓으면 시위가 좌우로 울립니다.',
   [('Resistance that ramps with the draw', '당길수록 커지는 저항'), ('Full-draw tremble', '끝까지 당기면 떨림'), ('A thud when the arrow lands', '화살이 박히는 둔탁한 손맛')], ['Adaptive triggers', 'HD haptics']),
  ('melee', 'activity', 'Melee', '근접 무기', 'Fourteen moves, from a sword slash to a ground pound. The swing sweeps across your hands, then the hit freezes in them.', '검 베기부터 지면 강타까지 14가지 동작. 휘두를 때 손을 가로지르고, 맞는 순간 손 안에서 멈칫합니다.',
   [('Wind-up swish across both hands', '양손을 가로지르는 칼바람'), ('Weight follows each move', '동작마다 다른 무게감'), ('Fourteen moves', '14가지 동작')], ['HD haptics', 'Adaptive triggers']),
  ('gallery', 'sparkles', 'Effect gallery', '이펙트 갤러리', 'All 244 pixel effects, felt. Bursts become hits, glows become a hum that follows the effect across your hands, warm colours rumble low and cold ones buzz high.', '픽셀 이펙트 244개를 전부 손으로. 터지면 치고, 빛나면 웅웅거리며 좌우로 따라오고, 따뜻한 색은 낮게, 차가운 색은 높게 울립니다.',
   [('Auto-haptics from light and colour', '빛과 색을 진동으로 자동 변환'), ('21 categories', '21개 카테고리'), ('Scripted hits for every move', '동작마다 정해진 타격 타이밍')], ['HD haptics', 'Speaker']),
]
TAG_KO = {'HD haptics': 'HD 햅틱', 'Adaptive triggers': '적응형 트리거', 'Speaker': '컨트롤러 스피커'}
TAG_CLS = {'HD haptics': 'mint', 'Adaptive triggers': 'amber', 'Speaker': 'sky'}

def tags(ts): return ''.join(f'<span class="tag {TAG_CLS[x]}"{ko(TAG_KO[x])}>{x}</span>' for x in ts)

side = '\n'.join(f'          <button class="s-item task{" on" if i == 0 else ""}" role="tab" aria-selected="{"true" if i == 0 else "false"}" data-x="{x[0]}">{ic(x[1])}<span{ko(x[3])}>{x[2]}</span></button>' for i, x in enumerate(XPS))

HOME = f'''<section class="page p-home" data-page="home">
  <div class="hero">
    <div class="hero-glow" aria-hidden="true"></div>
    <a class="announce" href="#changelog"><span class="new">NEW</span><span{ko('플레이그라운드 — 무기 7종, 바닥 8종')}>Playground — 7 weapons, 8 surfaces</span>{ic('arrow-right')}</a>
    <h1 class="hero-h"><span class="ln"{ko('모든 발걸음을 느끼고.')}>Feel every step.</span> <span class="ln"{ko('모든 <span class="serif">타격</span>을 느끼세요.')}>Feel every <span class="serif">hit</span>.</span></h1>
    <p class="hero-lede"{ko('DualSense를 위한 무료 브라우저 놀이터. HD 햅틱, 적응형 트리거, 컨트롤러 스피커를 픽셀 이펙트 244개에 연결했습니다. USB로 꽂고 바로 플레이하세요. 설치할 것은 없습니다.')}>A free browser playground for the DualSense. HD haptics, adaptive triggers and the controller speaker, wired to 244 pixel-art effects. Plug in with USB and play — nothing to install.</p>
    <div class="ctas">
      <a class="btn btn-primary" href="play/">{ic('play')}<span{ko('지금 플레이')}>Play now</span></a>
      <a class="btn btn-ghost" href="#guide"><span{ko('작동 방식')}>How it works</span>{ic('arrow-right')}</a>
    </div>
    <div class="trust"><div class="chips"><span class="chip">{ic('usb')}USB-C</span><span class="chip">{ic('globe')}Chrome · Edge</span><span class="chip">{ic('lock')}<span{ko('계정 필요 없음')}>No account</span></span></div></div>

    <div class="shot">
      <div class="win" role="group" aria-label="Live preview">
        <aside class="side">
          <div class="lights" aria-hidden="true"><i></i><i></i><i></i></div>
          <div class="s-label"{ko('체험')}>EXPERIENCES</div>
          <div class="tasks" role="tablist" aria-label="Experiences">
{side}
          </div>
          <div class="side-user">{ic('gamepad-2')}<span class="pad-state"{ko('컨트롤러 미리보기')}>Controller preview</span></div>
        </aside>
        <div class="main">
          <div class="topbar"><span class="swap" data-k="title">Playground</span><span class="status-pill" data-k="status">LIVE · 320×180</span></div>
          <canvas class="pv pv-main" id="pvMain" width="320" height="180" aria-label="Live pixel preview"></canvas>
          <div class="kpis">
            <div class="kpi"><span class="l"{ko('햅틱 채널')}>Haptic channels</span><span class="v">4</span><span class="d"{ko('양손 보이스코일')}>2 voice coils</span></div>
            <div class="kpi"><span class="l"{ko('트리거 모드')}>Trigger modes</span><span class="v">4</span><span class="d"{ko('딸깍·경사·진동·벽')}>click · ramp · buzz · wall</span></div>
            <div class="kpi"><span class="l"{ko('픽셀 이펙트')}>Pixel effects</span><span class="v">244</span><span class="d">pixelfx</span></div>
            <div class="kpi"><span class="l"{ko('바닥 종류')}>Surfaces</span><span class="v">8</span><span class="d"{ko('바닥마다 다른 발소리')}>each its own step</span></div>
          </div>
          <div class="finding"><span class="k"{ko('손에 느껴지는 것')}>WHAT YOU FEEL</span><p class="swap" data-k="finding"></p></div>
        </div>
      </div>
      <div class="shot-fade" aria-hidden="true"></div>
    </div>
  </div>

  <div class="logos reveal">
    <span class="logos-label"{ko('필요한 것')}>WHAT YOU NEED</span>
    <div class="logos-row">
      <span class="logo">{ic('gamepad-2')}DualSense</span>
      <span class="logo">{ic('usb')}<span{ko('USB 케이블')}>USB cable</span></span>
      <span class="logo">{ic('globe')}Chrome</span>
      <span class="logo">{ic('globe')}Edge</span>
      <span class="logo">{ic('box')}Windows</span>
      <span class="logo">{ic('box')}macOS</span>
    </div>
  </div>

  <div class="hsec">
    <div class="wrap">
      <div class="shead reveal">
        <div>
          <p class="eyebrow"{ko('01 — 컨트롤러')}>01 — THE CONTROLLER</p>
          <h2 class="h2x"{ko('손이 <span class="serif">읽는</span> 컨트롤러.')}>A controller your hands <span class="serif">read</span>.</h2>
        </div>
        <p{ko('DualSense에는 진동 모터 대신 손잡이마다 보이스코일이 있고, 저항을 바꾸는 트리거와 작은 스피커가 있습니다. 대부분의 게임은 이걸 다 쓰지 않습니다. 여기서는 다 씁니다.')}>The DualSense has a voice coil in each grip instead of a spinning weight, triggers that push back and a small speaker. Most games barely use them. Here, everything does.</p>
      </div>
      <div class="fgrid reveal">
        <article class="bx feat"><div class="feat-top"><span class="ficon">{ic('vibrate')}</span><span>01</span></div><h3{ko('HD 햅틱')}>HD haptics</h3><p{ko('USB로 연결하면 컨트롤러가 4채널 오디오 장치가 됩니다. 3·4번 채널이 왼손과 오른손이고, 파형을 그대로 재생해서 탁, 자글자글, 쿵을 구분해 그립니다.')}>Over USB the controller is a 4-channel audio device. Channels 3 and 4 drive your left and right hand, so a tap, a crunch and a thud each feel distinct.</p></article>
        <article class="bx feat"><div class="feat-top"><span class="ficon">{ic('crosshair')}</span><span>02</span></div><h3{ko('적응형 트리거')}>Adaptive triggers</h3><p{ko('R2가 중간에서 딸깍 끊기거나, 당길수록 무거워지거나, 손가락 밑에서 떨리거나, 벽처럼 막힙니다. 무기마다 하나씩.')}>R2 can break with a click halfway, get heavier as you pull, buzz under your finger or stop like a wall. Each weapon gets one.</p></article>
        <article class="bx feat"><div class="feat-top"><span class="ficon">{ic('volume-2')}</span><span>03</span></div><h3{ko('컨트롤러 스피커')}>Controller speaker</h3><p{ko('큰 소리는 PC에서, 손 안의 소리는 손에서. 탄피, 재장전 딸깍, 활시위 삐걱임은 컨트롤러 스피커로 나옵니다.')}>Big sounds play on your PC, small ones in your hands: casings, reload clicks and a creaking bowstring come from the controller.</p></article>
      </div>
    </div>
  </div>

  <div class="hsec">
    <div class="wrap">
      <div class="shead reveal">
        <div>
          <p class="eyebrow"{ko('02 — 체험해 볼 것')}>02 — WHAT TO TRY</p>
          <h2 class="h2x"{ko('바닥이 다르면 <span class="serif">느낌</span>도 다릅니다.')}>Every surface <span class="serif">feels</span> different.</h2>
        </div>
        <p{ko('실제 발소리 녹음을 진동으로 바꿔서, 철판은 쨍하게, 눈은 사각사각, 물은 철벅하게 느껴집니다.')}>Real footstep recordings are turned into haptics, so steel rings, snow crunches and water splashes in your palms.</p>
      </div>
      <div class="bento reveal">
        <div class="brow">
          <div class="bx team">
            <div class="team-copy">
              <span class="kick"{ko('트리거 저항')}>TRIGGER RESISTANCE</span>
              <h3{ko('하나의 트리거, 네 가지 느낌.')}>One trigger, four feels.</h3>
              <p{ko('모드를 눌러 R2가 손가락을 어떻게 밀어내는지 보세요.')}>Pick a mode to see how R2 pushes back against your finger.</p>
              <div class="roles" id="trigModes">
                <button class="role on" data-mode="click"{ko('딸깍')}>Click</button>
                <button class="role" data-mode="ramp"{ko('경사')}>Ramp</button>
                <button class="role" data-mode="buzz"{ko('진동')}>Buzz</button>
                <button class="role" data-mode="wall"{ko('벽')}>Wall</button>
              </div>
            </div>
            <div class="trig-viz" aria-hidden="true">
              <svg viewBox="0 0 300 84" preserveAspectRatio="none"><path id="trigPath" fill="none" stroke="#6ee7c8" stroke-width="2" vector-effect="non-scaling-stroke" d=""/><line x1="0" y1="83" x2="300" y2="83" stroke="rgba(255,255,255,.1)"/></svg>
              <span class="qmark-note" id="trigNote"></span>
            </div>
          </div>
          <div class="bx tools">
            <span class="kick"{ko('바닥 8종')}>8 SURFACES</span>
            <h3{ko('발밑을 골라 보세요.')}>Pick what is underfoot.</h3>
            <div class="surf-tiles" id="surfTiles"></div>
          </div>
        </div>
        <div class="brow brow-3">
          <div class="bx">
            <span class="kick"{ko('무기 7종')}>7 WEAPONS</span>
            <h3{ko('L1·R1로 바꾸기.')}>Switch with L1 and R1.</h3>
            <div class="models" role="group" aria-label="Weapons">
              <button class="model" aria-pressed="true">Sword</button><button class="model" aria-pressed="false">Hammer</button><button class="model" aria-pressed="false">Spear</button><button class="model" aria-pressed="false">Fists</button><button class="model" aria-pressed="false">Pistol</button><button class="model" aria-pressed="false">SMG</button><button class="model" aria-pressed="false">Bow</button>
            </div>
          </div>
          <div class="bx">
            <span class="kick"{ko('연결')}>CONNECT</span>
            <h3{ko('USB 한 줄이면 됩니다.')}>One USB cable.</h3>
            <div class="approval">
              {ic('usb')}
              <span class="approval-q"{ko('브라우저에서 컨트롤러 열기')}>Open the controller in your browser</span>
              <a class="approve" href="play/">{ic('arrow-right')}<span class="approve-t"{ko('플레이')}>Play</span></a>
            </div>
          </div>
          <div class="bx sched">
            <span class="kick"{ko('비')}>RAIN</span>
            <h3{ko('보슬비에서 폭풍까지.')}>From drizzle to storm.</h3>
            <div class="run"><span class="tm">R2 20%</span><span class="dot"></span><span class="nm"{ko('보슬비')}>Drizzle</span></div>
            <div class="run"><span class="tm">R2 100%</span><span class="dot"></span><span class="nm"{ko('폭우')}>Downpour</span></div>
            <div class="run"><span class="tm">&#9651;</span><span class="dot"></span><span class="nm"{ko('번개 세 번')}>Three strikes</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="testi">
    <div class="wrap" style="display:flex;flex-direction:column;align-items:center;gap:36px">
      <div class="qmark reveal" aria-hidden="true">&ldquo;</div>
      <blockquote class="quote reveal"{ko('철판 위의 발걸음이 눈 위의 발걸음처럼 느껴지면 안 됩니다. 그래서 바닥마다, 무기마다, <span class="serif">모든 타격</span>마다 따로 만들었습니다.')}>A footstep on steel should never feel like a footstep on snow. So every surface, every weapon and <span class="serif">every hit</span> gets its own feel.</blockquote>
      <div class="author reveal"><div><b{ko('만든 원칙')}>Design note</b><small>Pixel Haptics</small></div></div>
      <div class="proof reveal">
        <div><b data-count="244">244</b><span{ko('픽셀 이펙트')}>pixel effects</span></div>
        <div><b data-count="8">8</b><span{ko('바닥 종류')}>surfaces</span></div>
        <div><b data-count="7">7</b><span{ko('무기')}>weapons</span></div>
        <div><b data-count="0">0</b><span{ko('설치할 것')}>installs</span></div>
      </div>
    </div>
  </div>

  <div class="cta-sec">
    <div class="wrap">
      <div class="cta-card reveal">
        <div class="cta-glow" aria-hidden="true"></div>
        <p class="eyebrow"{ko('무료 · 계정 없음')}>FREE · NO ACCOUNT</p>
        <h2 class="cta-h"{ko('꽂고. <span class="serif">느끼세요</span>.')}>Plug in. <span class="serif">Feel it</span>.</h2>
        <p{ko('데스크톱 Chrome 또는 Edge, USB로 연결한 DualSense면 충분합니다.')}>Desktop Chrome or Edge and a DualSense on USB. That is all.</p>
        <div class="ctas">
          <a class="btn btn-primary" href="play/">{ic('play')}<span{ko('지금 플레이')}>Play now</span></a>
          <a class="btn btn-ghost" href="#guide"><span{ko('설정 가이드')}>Setup guide</span>{ic('arrow-right')}</a>
        </div>
      </div>
    </div>
  </div>
</section>'''

def xp_card(x, lead=False):
    fe = ''.join(f'<li>{ic("check")}<span{ko(k)}>{e}</span></li>' for e, k in x[6])
    return f'''        <article class="xp-card{' lead' if lead else ''}">
          <canvas class="pv" width="320" height="180" data-pv="{x[0]}" aria-label="{x[2]} preview"></canvas>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div class="xp-tags">{tags(x[7])}</div>
            <h3{ko(x[3])}>{x[2]}</h3>
            <p{ko(x[5])}>{x[4]}</p>
            <ul class="feats">{fe}</ul>
            <a class="btn {'btn-primary' if lead else 'btn-ghost'}" href="play/#{x[0]}"><span{ko('플레이')}>Play</span>{ic('arrow-right')}</a>
          </div>
        </article>'''

Y, N = f'<svg class="i" aria-label="Yes"><use href="#i-check"/></svg>', '<span class="dash" aria-label="No">—</span>'
PRO = ' class="pro"'
MATRIX = [('HD haptics', 'HD 햅틱', [1, 1, 1, 1, 1, 1, 1]), ('Adaptive trigger', '적응형 트리거', [1, 1, 1, 1, 1, 1, 0]), ('Controller speaker', '컨트롤러 스피커', [1, 1, 1, 1, 0, 0, 1]), ('Left / right hand', '왼손 / 오른손 구분', [1, 1, 1, 1, 1, 1, 1]), ('Works on Bluetooth (rumble)', '블루투스 (일반 진동)', [1, 1, 1, 1, 1, 1, 1])]
rows = '\n'.join(f'<tr><td{ko(k)}>{e}</td>' + ''.join(f'<td{PRO if i == 0 else ""}>{Y if v else N}</td>' for i, v in enumerate(vals)) + '</tr>' for e, k, vals in MATRIX)
heads = ''.join(f'<th scope="col"{PRO if i == 0 else ""}{ko(x[3])}>{x[2]}</th>' for i, x in enumerate(XPS))
FAQ = [('Which browsers work?', '어떤 브라우저에서 되나요?', 'Desktop Chrome and Edge. They support WebHID, which talks to the controller directly. Safari and Firefox do not.', '데스크톱 Chrome과 Edge입니다. 컨트롤러와 직접 통신하는 WebHID를 지원하기 때문입니다. Safari와 Firefox는 지원하지 않습니다.'),
       ('Why USB and not Bluetooth?', '왜 블루투스가 아니라 USB인가요?', 'HD haptics travel as audio, and browsers can only reach the controller audio over USB. On Bluetooth everything still works, with classic rumble instead.', 'HD 햅틱은 오디오로 전달되는데, 브라우저는 USB로 연결했을 때만 컨트롤러 오디오에 접근할 수 있습니다. 블루투스에서도 모두 동작하지만 일반 진동으로 바뀝니다.'),
       ('Why does it ask for the microphone?', '왜 마이크 권한을 묻나요?', 'Chrome hides audio device names until a media permission is granted. We ask once to find the DualSense output and close the stream immediately. Nothing is recorded.', 'Chrome은 미디어 권한을 받기 전까지 오디오 장치 이름을 숨깁니다. DualSense 출력 장치를 찾으려고 한 번 묻고 바로 닫습니다. 녹음은 하지 않습니다.'),
       ('Do I need a DualSense?', 'DualSense가 꼭 있어야 하나요?', 'It is the point, but not required. Any standard gamepad gets rumble, and the keyboard works too.', '그게 핵심이지만 필수는 아닙니다. 일반 게임패드는 일반 진동으로, 키보드로도 플레이할 수 있습니다.')]
faq = '\n'.join(f'''        <div class="qa{' open' if i == 0 else ''}">
          <button type="button" aria-expanded="{'true' if i == 0 else 'false'}"><span{ko(qk)}>{q}</span><span class="ic"><svg class="i plus"><use href="#i-plus"/></svg><svg class="i minus"><use href="#i-minus"/></svg></span></button>
          <div class="ans"><p{ko(ak)}>{a}</p></div>
        </div>''' for i, (q, qk, a, ak) in enumerate(FAQ))

EXPERIENCES = f'''<section class="page p-xp" data-page="experiences">
  <div class="page-hero pr-hero">
    <p class="eyebrow"{ko('체험')}>Experiences</p>
    <h1 class="h1"{ko('하나의 놀이터, <span class="serif">여섯</span> 개의 방.')}>One playground, <span class="serif">six</span> rooms.</h1>
    <p class="lede"{ko('모두 무료이고 브라우저에서 바로 실행됩니다. 아래 미리보기는 실제 게임과 같은 엔진으로 지금 그려지고 있습니다.')}>All free, all in the browser. The previews below run on the same engine as the game, right now.</p>
  </div>
  <div class="pr-plans reveal">
    <div class="wrap">
      <div class="xp-grid">
{xp_card(XPS[0], True)}
{chr(10).join(xp_card(x) for x in XPS[1:])}
      </div>
    </div>
  </div>
  <div class="pr-compare">
    <div class="wrap reveal">
      <h2 class="h2"{ko('무엇을 <span class="serif">쓰는지</span>')}>What each one <span class="serif">uses</span></h2>
      <div class="tbl-scroll" tabindex="0" aria-label="Feature table, scroll horizontally on small screens">
        <table class="tbl"><thead><tr><th scope="col"></th>{heads}</tr></thead><tbody>
{rows}
        </tbody></table>
      </div>
    </div>
  </div>
  <div class="pr-faq">
    <div class="wrap reveal">
      <h2 class="h2"{ko('자주 묻는 <span class="serif">질문</span>')}>Common <span class="serif">questions</span></h2>
      <div class="faq">
{faq}
      </div>
    </div>
  </div>
</section>'''

CATS = [('activity', 'Getting started', '시작하기', 'Connect, turn on HD haptics, play.', '연결하고, HD 햅틱 켜고, 플레이.', 'start connect usb webhid setup', 'start'),
        ('vibrate', 'HD haptics', 'HD 햅틱', 'What the voice coils are and how we drive them.', '보이스코일이 무엇이고 어떻게 움직이는지.', 'haptics audio channels voice coil', 'hd'),
        ('crosshair', 'Adaptive triggers', '적응형 트리거', 'Click, ramp, buzz and wall — the four modes.', '딸깍, 경사, 진동, 벽 — 네 가지 모드.', 'trigger r2 resistance', 'triggers'),
        ('shield-check', 'Steam & drivers', 'Steam과 드라이버', 'When something grabs the controller first.', '다른 프로그램이 컨트롤러를 먼저 잡을 때.', 'steam input ds4windows driver', 'steam'),
        ('radio', 'Bluetooth vs USB', '블루투스 vs USB', 'What changes without a cable.', '케이블 없이 무엇이 달라지는지.', 'bluetooth wireless rumble', 'bt'),
        ('lock', 'Privacy', '개인정보', 'Microphone prompt, storage, ads.', '마이크 권한, 저장, 광고.', 'privacy microphone data cookies ads', 'privacy')]
cats = '\n'.join(f'''        <button type="button" class="rs-cat" data-k="{k}" data-art="{a}">
          <span class="rs-ico">{ic(i)}</span>
          <h3{ko(tk)}>{t}</h3>
          <p{ko(dk)}>{d}</p>
          <span class="rs-count"><span{ko('읽기')}>Read</span> {ic('arrow-right')}</span>
        </button>''' for i, t, tk, d, dk, k, a in CATS)
ARTS = [('Turn on HD haptics in Chrome', 'Chrome에서 HD 햅틱 켜기', 'start hd haptics chrome', 'hd'), ('Haptics are silent on Windows: what to check', 'Windows에서 진동이 안 날 때 확인할 것', 'silent windows steam troubleshoot', 'silent'),
        ('Steam Input is blocking the controller', 'Steam Input이 컨트롤러를 막을 때', 'steam input', 'steam'), ('How the four trigger modes work', '트리거 모드 네 가지의 원리', 'trigger modes', 'triggers'),
        ('Turning sound into touch', '소리를 촉감으로 바꾸는 법', 'auto haptics audio', 'auto'), ('Playing over Bluetooth', '블루투스로 플레이하기', 'bluetooth', 'bt')]
arts = '\n'.join(f'<li><button type="button" class="rs-art" data-k="{k}" data-art="{a}"><span class="n">{i + 1:02d}</span><span class="t"{ko(tk)}>{t}</span>{ic("arrow-up-right")}</button></li>' for i, (t, tk, k, a) in enumerate(ARTS))
TUTS = [('b', 'BEGINNER', 'Your first five minutes', '처음 5분', 'beginner start', 'start', '4 min'), ('m', 'INTERMEDIATE', 'Feel the difference between eight surfaces', '바닥 8종의 차이 느끼기', 'surfaces footsteps', 'surfaces', '6 min'), ('a', 'ADVANCED', 'Why one hidden bit silences the coils', '숨은 비트 하나가 진동을 막는 이유', 'advanced report bit', 'bit', '8 min')]
tuts = '\n'.join(f'''            <button type="button" class="rs-tut" data-k="{k}" data-art="{a}">
              <span class="rs-lvl {l}">{lv}</span>
              <h4{ko(tk)}>{t}</h4>
              <span class="rs-meta">{ic('clock')}{m}</span>
            </button>''' for l, lv, t, tk, k, a, m in TUTS)

GUIDE = f'''<section class="page p-resources" data-page="guide">
  <div class="rs-hero">
    <p class="eyebrow"{ko('가이드')}>Guide</p>
    <h1 class="rs-title"{ko('무엇을 <span class="serif">도와드릴까요?</span>')}>How can we <span class="serif">help?</span></h1>
    <p class="rs-lede"{ko('설정, 문제 해결, 그리고 손이 느끼는 원리.')}>Setup, troubleshooting and how the feel is made.</p>
    <label class="rs-search" aria-label="Search the guide">
      {ic('search')}
      <input type="search" class="rs-input" placeholder="Search the guide, e.g. &ldquo;Steam&rdquo;" autocomplete="off" spellcheck="false">
      <button type="button" class="rs-clear" aria-label="Clear search">{ic('x')}</button>
      <span class="rs-kbd" aria-hidden="true">Ctrl K</span>
    </label>
    <div class="rs-pop">
      <span{ko('자주 찾는 것:')}>Popular:</span>
      <button type="button" class="rs-chip">Steam</button>
      <button type="button" class="rs-chip">Bluetooth</button>
      <button type="button" class="rs-chip">Trigger</button>
      <button type="button" class="rs-chip">Silent</button>
    </div>
  </div>
  <div class="rs-cats">
    <div class="wrap">
      <div class="rs-grid reveal">
{cats}
      </div>
      <div class="rs-empty rs-empty-cats">{ic('search')}<div>No categories match <b class="rs-q"></b></div></div>
    </div>
  </div>
  <div class="rs-at">
    <div class="wrap">
      <div class="rs-cols">
        <div class="rs-arts reveal">
          <p class="rs-k"{ko('많이 읽은 글')}>MOST READ</p>
          <h2 class="rs-h2"{ko('인기 <span class="serif">글</span>')}>Popular <span class="serif">articles</span></h2>
          <ul class="rs-list">
{arts}
          </ul>
          <div class="rs-empty rs-empty-arts">{ic('search')}<div>No articles match <b class="rs-q"></b>. Try &ldquo;Steam&rdquo; or &ldquo;trigger&rdquo;.</div></div>
        </div>
        <div class="rs-tuts reveal">
          <p class="rs-k"{ko('따라 하기')}>GUIDED</p>
          <h2 class="rs-h2"{ko('튜토리얼')}>Tutorials</h2>
          <div class="rs-tlist">
{tuts}
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="rs-sup">
    <div class="wrap">
      <div class="rs-card reveal">
        <div class="rs-team"><span class="rs-ico">{ic('github')}</span></div>
        <div class="rs-copy">
          <h3{ko('버그를 <span class="serif">찾으셨나요?</span>')}>Found a <span class="serif">bug?</span></h3>
          <p{ko('컨트롤러 종류, 연결 방식, 브라우저를 적어 이슈로 남겨 주세요.')}>Open an issue with your controller, connection and browser.</p>
        </div>
        <a class="btn btn-primary" href="https://github.com/andonghun/fun-haptic/issues" target="_blank" rel="noopener"><span{ko('이슈 남기기')}>Open an issue</span> {ic('arrow-right')}</a>
      </div>
    </div>
  </div>
</section>'''

REL = [('v0.5', 'Nov 2, 2026', [('mint', 'New')], 'Playground', '플레이그라운드', 'A side-scrolling field with eight surfaces and six straw dummies. Walk, run, dash and jump, and fight with seven weapons.', '바닥 8종과 허수아비 6개가 있는 횡스크롤 들판. 걷고, 달리고, 대시하고, 점프하고, 무기 7종으로 싸웁니다.', ['Dash with after-images and a sweep across your hands', 'Skid to a halt from a run', 'Hit-stop and screen shake taken from each move'], ['잔상과 함께 손을 가로지르는 대시', '달리다 멈추면 미끄러짐', '동작마다 정해진 히트스톱과 화면 흔들림']),
       ('v0.4', 'Nov 2, 2026', [('mint', 'New'), ('sky', 'Graphics')], 'Pixel art with pixelfx', 'pixelfx 픽셀아트', 'Rebuilt in pixel art on the open-source pixelfx library, with auto-haptics that turn any effect into touch.', '오픈소스 pixelfx 라이브러리로 픽셀아트 전환. 어떤 이펙트든 촉감으로 바꾸는 자동 햅틱 추가.', ['244 effects in the gallery', 'Character moves keep their scripted hits', 'Live previews on the menu'], ['갤러리에 이펙트 244개', '캐릭터 동작의 타격 타이밍 그대로 반영', '메뉴에 실시간 미리보기']),
       ('v0.3', 'Oct 18, 2026', [('sky', 'Improved')], 'First-person rooms', '1인칭 체험실', 'Rain, pistol, rifle, bow, footsteps and tilt in first person, with gyro aiming.', '비, 권총, 소총, 활, 발소리, 굴리기를 1인칭으로. 자이로 조준 지원.', ['In-hand sounds moved to the controller speaker', 'Umbrella and thunder in the rain room'], ['손 안의 소리는 컨트롤러 스피커로', '비 체험에 우산과 천둥']),
       ('v0.2', 'Oct 17, 2026', [('amber', 'Experiment')], 'A small adventure', '작은 모험', 'A hub island with seven stages built around each feature. It taught us that people want to feel things, not clear stages.', '기능별 스테이지 7개가 있는 허브 섬. 사람들은 스테이지를 깨는 것보다 직접 느끼고 싶어한다는 걸 배웠습니다.', ['Sword guard and parry', 'Axe throw and recall'], ['검 막기와 패리', '도끼 던지기와 회수']),
       ('v0.1', 'Oct 17, 2026', [('red', 'Fix')], 'Haptics finally reach the coils', '드디어 보이스코일까지 닿은 진동', 'The controller ignored audio haptics while a classic-rumble compatibility bit was set. We now send rumble only when HD haptics are off.', '구형 진동 호환 비트가 켜져 있으면 컨트롤러가 오디오 햅틱을 무시했습니다. 이제 HD 햅틱이 꺼져 있을 때만 구형 진동을 보냅니다.', ['Channels 3 and 4 drive the left and right coil', 'Adaptive triggers over WebHID'], ['3·4번 채널이 왼손·오른손 코일', 'WebHID로 적응형 트리거'])]
def rel(r, i):
    tg = ''.join(f'<span class="tag {c}">{t}</span>' for c, t in r[2])
    bl = ''.join(f'<li>{ic("check")}<span{ko(k)}>{b}</span></li>' for b, k in zip(r[7], r[8]))
    old = i >= 4
    return f'''      <article class="rel{' active' if i == 0 else ''}{' older' if old else ' reveal'}"{' hidden' if old else ''}>
        <div class="rel-meta"><span class="rel-ver">{r[0]}</span><span class="rel-date">{r[1]}</span></div>
        <div class="rel-rail"><span class="rel-dot"></span></div>
        <div class="rel-entry"><div class="rel-card">
          <div class="rel-tags">{tg}</div>
          <h2 class="rel-title"{ko(r[4])}>{r[3]}</h2>
          <p class="rel-desc"{ko(r[6])}>{r[5]}</p>
          <ul class="bullets">{bl}</ul>
        </div></div>
      </article>'''
CHANGELOG = f'''<section class="page p-changelog" data-page="changelog">
  <div class="cl-hero">
    <p class="eyebrow"{ko('업데이트')}>Changelog</p>
    <h1 class="cl-title"{ko('Pixel Haptics의 <span class="serif">새 소식</span>.')}>What&rsquo;s <span class="serif">new</span> in Pixel Haptics.</h1>
    <p class="cl-lede"{ko('새 체험, 개선, 수정.')}>New experiences, improvements and fixes.</p>
    <div class="cl-actions">
      <a class="btn btn-ghost" href="https://github.com/andonghun/fun-haptic" target="_blank" rel="noopener">{ic('github')}<span{ko('GitHub에서 보기')}>Watch on GitHub</span></a>
    </div>
  </div>
  <div class="cl-timeline">
    <div class="cl-list">
{chr(10).join(rel(r, i) for i, r in enumerate(REL))}
    </div>
    <button class="btn btn-ghost cl-more" type="button"{ko('이전 기록 더 보기')}>Load older releases</button>
  </div>
</section>'''

FOOTER = f'''<footer class="footer">
  <div class="wrap">
    <div class="footer-top">
      <div class="footer-brand">
        <a class="brand" href="#home">{LOGO}Pixel Haptics</a>
        <p{ko('DualSense를 손끝으로 느끼는 무료 브라우저 놀이터.')}>A free browser playground for feeling your DualSense.</p>
        <div class="socials">
          <a href="https://github.com/andonghun/fun-haptic" target="_blank" rel="noopener" aria-label="GitHub">{ic('github')}</a>
        </div>
      </div>
      <div class="footer-cols">
        <div class="footer-col"><h4{ko('플레이')}>PLAY</h4><a href="play/"{ko('플레이그라운드')}>Playground</a><a href="#experiences"{ko('체험')}>Experiences</a><a href="#changelog"{ko('업데이트')}>Changelog</a></div>
        <div class="footer-col"><h4{ko('가이드')}>GUIDE</h4><a href="#guide"{ko('시작하기')}>Getting started</a><a href="#guide"{ko('문제 해결')}>Troubleshooting</a><a href="#experiences"{ko('자주 묻는 질문')}>FAQ</a></div>
        <div class="footer-col"><h4{ko('크레딧')}>CREDITS</h4><a href="https://github.com/patch-gg/pixelfx" target="_blank" rel="noopener">pixelfx (MIT)</a><a href="https://kenney.nl" target="_blank" rel="noopener">Kenney (CC0)</a></div>
        <div class="footer-col"><h4{ko('법적 고지')}>LEGAL</h4><a href="#guide" data-art-link="privacy"{ko('개인정보처리방침')}>Privacy</a></div>
      </div>
    </div>
    <div class="footer-bottom"><span{ko('DualSense는 Sony Interactive Entertainment의 상표입니다. 이 사이트는 Sony와 관련이 없습니다.')}>DualSense is a trademark of Sony Interactive Entertainment. This site is not affiliated with Sony.</span><span class="status"{ko('무료 · 오픈소스')}>Free · open source</span></div>
    <div class="wordmark" aria-hidden="true">Pixel Haptics</div>
  </div>
</footer>
<div class="toast" id="toast" role="status" aria-live="polite">{ic('circle-check')}<span></span></div>
<div class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="Article"><div class="scrim"></div><div class="panel"><button class="close" type="button" aria-label="Close">{ic('x')}</button><p class="eyebrow" id="drEyebrow">Guide</p><div id="drBody"></div></div></div>'''

# ---- scripts: template router (pages renamed) + resources + changelog, plus our own home/xp/i18n/article code ----
router = lines(1655, 1686).replace("var PAGES=['home','pricing','resources','events','changelog'];", "var PAGES=['home','experiences','guide','changelog'];")
res = lines(1875, 1913)
res = res.replace("cats.forEach(function(c){c.addEventListener('click',function(){toast('Opening '+c.querySelector('h3').textContent+'…')})});", '')
res = res.replace("arts.forEach(function(a){a.addEventListener('click',function(){toast('Opening “'+a.querySelector('.t').textContent+'”…')})});", '')
res = res.replace("tuts.forEach(function(t){t.addEventListener('click',function(){toast('Opening tutorial: '+t.querySelector('h4').textContent+'…')})});", '')
res = res.replace("root.querySelector('.rs-contact').addEventListener('click',function(){toast('Support chat opened. A teammate will reply shortly.')});", '')
cl = lines(1969, 2017)
cl = cl.replace("root.querySelector('[data-cl=\"subscribe\"]').addEventListener('click',function(){toast('Subscribed — a weekly digest of Corvel releases is on its way')});", '')
cl = cl.replace("root.querySelector('[data-cl=\"rss\"]').addEventListener('click',function(e){e.preventDefault();e.stopPropagation();toast('RSS feed ready: add corvel.app/changelog.xml to your reader')});", '')
cl = re.sub(r"  // role cycling[\s\S]*?\n  \}\);\n\n", '', cl)
cl = cl.replace("toast('Loaded '+older.length+' older releases');", "toast(document.documentElement.lang==='ko'?'이전 기록 '+older.length+'개':'Loaded '+older.length+' older releases');")
assert 'Corvel' not in res + cl, 'template copy left in scripts'

OWN = open(os.path.join(os.path.dirname(__file__), 'site_main.js'), encoding='utf8').read()
MODULE = open(os.path.join(os.path.dirname(__file__), 'site_previews.js'), encoding='utf8').read()

out = '\n'.join([head, '</head>', '<body>', sprite, NAV, '', '<main>', HOME, EXPERIENCES, GUIDE, CHANGELOG, '</main>', '', FOOTER, '', router,
                 '<script>\n' + res + '\n' + cl + '\n</script>', '<script>\n' + OWN + '\n</script>', '<script type="module">\n' + MODULE + '\n</script>', '</body>', '</html>', ''])
out = out.replace('<html lang="en">', '<html lang="en">', 1)
assert 'Corvel' not in out, 'template brand left'
open(OUT, 'w', encoding='utf8', newline='\n').write(out)
print('wrote', OUT, len(out))
