# Builds index.html (the landing site) from the Mint Noir template (Skillry skill bs-mint-noir-saas-site).
# Keeps the template's CSS, icon sprite, router and interaction code; replaces every page with Pixel Haptics content.
# Usage: python tools/build_site.py
import os, re, html

SKILL = os.path.expanduser(r'~/.claude/skills/bs-mint-noir-saas-site/references/template.html')
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'index.html')
T = open(SKILL, encoding='utf8').read().split('\n')

def lines(a, b): return '\n'.join(T[a - 1:b])           # 1-based inclusive

head = lines(1, 885)
head = re.sub(r'<title>.*?</title>', '<title>Pixel Haptics — DualSense haptics in the browser</title>', head, flags=re.S)
head = re.sub(r'<meta name="description"[^>]*>', '', head)
head = head.replace('<head>', '<head>\n<meta name="description" content="Free browser demos for the DualSense controller: HD haptics, adaptive triggers and the controller speaker. Works in desktop Chrome and Edge. Other gamepads and keyboard also supported.">', 1)

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

# experiences: id, icon, title, ko title, line, ko line, notes (en, ko), tags
XPS = [
  ('playground', 'gamepad-2', 'Playground', '플레이그라운드', 'Walk, run and jump on a wooden deck and a brick floor. Hit straw dummies with a sword, hammer, spear or fists, or shoot them with a pistol, SMG or bow.', '나무 데크와 벽돌 바닥을 걷고, 달리고, 점프합니다. 허수아비를 검, 망치, 창, 주먹으로 치거나 권총, SMG, 활로 쏩니다.',
   [('Footsteps on the side of the foot that lands', '발이 닿는 쪽 손에 발소리 진동'), ('Combos with Square, heavy attack with R2', '네모 버튼 연타 콤보, R2 강공격'), ('Seven weapons on L1 and R1', 'L1·R1로 무기 7종 교체')], ['HD haptics', 'Adaptive triggers', 'Speaker']),
  ('weather', 'cloud-rain', 'Weather lab', '날씨 실험실', 'Twelve kinds of weather. Rain, snow and wind each vibrate differently. R2 sets the intensity.', '날씨 12가지. 비, 눈, 바람마다 진동이 다릅니다. R2로 세기를 정합니다.',
   [('Rain, storm, snow, blizzard, fog and more', '비, 폭풍, 눈, 눈보라, 안개 등'), ('Lightning on Triangle in rain and storm', '비·폭풍에서 세모 버튼으로 번개'), ('Gusts move from one hand to the other', '바람이 한쪽 손에서 다른 손으로 이동')], ['HD haptics', 'Speaker']),
  ('tray', 'box', 'Treasure tray', '보물 쟁반', 'Tilt the controller to roll a steel, a wooden and a rubber ball around a tray. Open the chest and coins drop onto it.', '컨트롤러를 기울여 쇠, 나무, 고무 공을 쟁반 위에서 굴립니다. 상자를 열면 코인이 쟁반에 떨어집니다.',
   [('Each ball vibrates on the side it is on', '공이 있는 쪽 손이 진동'), ('Each coin taps where it lands', '코인은 떨어진 자리에서 톡'), ('Works with the stick or WASD too', '스틱이나 WASD로도 가능')], ['HD haptics', 'Speaker']),
  ('pistol', 'crosshair', 'Pistol', '권총', 'R2 fires at the click halfway down. Three rounds, then a reload.', 'R2를 당기다 딸깍 하는 지점에서 발사됩니다. 세 발 쏘면 재장전합니다.',
   [('Click trigger', '딸깍 트리거'), ('Recoil, then the hit on the target', '반동 후 표적 명중'), ('Reload clicks on the controller speaker', '재장전 소리는 컨트롤러 스피커')], ['Adaptive triggers', 'HD haptics', 'Speaker']),
  ('rifle', 'zap', 'Machine gun', '기관총', 'Hold R2 and the trigger vibrates as it fires, twelve rounds a second. If it overheats, the trigger locks until it cools.', 'R2를 누르고 있으면 트리거가 떨리며 초당 12발을 쏩니다. 과열되면 식을 때까지 트리거가 굳습니다.',
   [('Vibrating trigger', '진동 트리거'), ('Overheat locks the trigger', '과열 시 트리거 잠김')], ['Adaptive triggers', 'HD haptics', 'Speaker']),
  ('bow', 'crosshair', 'Bow', '활', 'R2 gets heavier the further you pull. Release to shoot.', 'R2를 당길수록 무거워집니다. 놓으면 발사됩니다.',
   [('Resistance increases with the draw', '당길수록 커지는 저항'), ('Vibration at full draw', '끝까지 당기면 떨림')], ['Adaptive triggers', 'HD haptics']),
  ('melee', 'activity', 'Melee', '근접 무기', 'Fourteen melee moves against a straw dummy. Left and right on the D-pad change the move.', '근접 동작 14가지를 허수아비에 써 봅니다. 방향키 좌우로 동작을 바꿉니다.',
   [('Hit timing comes from each move', '동작마다 정해진 타격 타이밍'), ('Heavier moves vibrate longer', '무거운 동작은 더 길게 진동')], ['HD haptics', 'Adaptive triggers']),
  ('gallery', 'sparkles', 'Effect gallery', '이펙트 갤러리', '244 pixel effects in 21 categories. Vibration follows the changes in brightness on screen.', '21개 카테고리, 픽셀 이펙트 244개. 화면 밝기가 바뀌는 대로 진동이 납니다.',
   [('Flashes become hits', '번쩍이면 탁'), ('Steady light becomes a hum', '계속 빛나면 웅웅'), ('Left or right follows the effect', '좌우는 이펙트 위치를 따라감')], ['HD haptics', 'Speaker']),
]
TAG_KO = {'HD haptics': 'HD 햅틱', 'Adaptive triggers': '적응형 트리거', 'Speaker': '컨트롤러 스피커'}
TAG_CLS = {'HD haptics': 'mint', 'Adaptive triggers': 'amber', 'Speaker': 'sky'}

def tags(ts): return ''.join(f'<span class="tag {TAG_CLS[x]}"{ko(TAG_KO[x])}>{x}</span>' for x in ts)

side = '\n'.join(f'          <button class="s-item task{" on" if i == 0 else ""}" role="tab" aria-selected="{"true" if i == 0 else "false"}" data-x="{x[0]}">{ic(x[1])}<span{ko(x[3])}>{x[2]}</span></button>' for i, x in enumerate(XPS))

WX = [('Rain', '비', '#2f4a7a'), ('Storm', '폭풍', '#1d2238'), ('Snow', '눈', '#c9d6e6'), ('Blizzard', '눈보라', '#9fb4cc'), ('Fog', '안개', '#5c6670'), ('Leaves', '낙엽', '#b8692e'), ('Blossoms', '벚꽃', '#e8a0b8'), ('Fireflies', '반딧불이', '#7a8f2a')]
wx_tiles = ''.join(f'<div class="surf" style="background:linear-gradient(180deg,rgba(7,9,10,0),rgba(7,9,10,.65)),{c}"><span{ko(k)}>{e}</span></div>' for e, k, c in WX)

HOME = f'''<section class="page p-home" data-page="home">
  <div class="hero">
    <div class="hero-glow" aria-hidden="true"></div>
    <a class="announce" href="#changelog"><span class="new">NEW</span><span{ko('날씨 실험실, 보물 쟁반 추가')}>Weather lab and Treasure tray added</span>{ic('arrow-right')}</a>
    <h1 class="hero-h"><span class="ln"{ko('DualSense 진동을')}>DualSense haptics,</span> <span class="ln"{ko('<span class="serif">브라우저에서</span>.')}><span class="serif">in the browser</span>.</span></h1>
    <p class="hero-lede"{ko('무료이고 설치할 것이 없습니다. DualSense를 USB로 연결하면 HD 햅틱과 적응형 트리거를 쓸 수 있고, 다른 게임패드나 키보드로도 할 수 있습니다.')}>Free, nothing to install. Connect a DualSense over USB for HD haptics and adaptive triggers. Other gamepads and the keyboard work too.</p>
    <div class="ctas">
      <a class="btn btn-primary" href="play/">{ic('play')}<span{ko('플레이')}>Play</span></a>
      <a class="btn btn-ghost" href="#guide"><span{ko('설정 방법')}>Setup guide</span>{ic('arrow-right')}</a>
    </div>
    <div class="trust"><div class="chips"><span class="chip">{ic('usb')}USB</span><span class="chip">{ic('globe')}Chrome · Edge</span><span class="chip">{ic('lock')}<span{ko('가입 없음')}>No sign-up</span></span></div></div>

    <div class="shot">
      <div class="win" role="group" aria-label="Live preview">
        <aside class="side">
          <div class="lights" aria-hidden="true"><i></i><i></i><i></i></div>
          <div class="s-label"{ko('체험')}>EXPERIENCES</div>
          <div class="tasks" role="tablist" aria-label="Experiences">
{side}
          </div>
          <div class="side-user">{ic('gamepad-2')}<span{ko('미리보기')}>Preview</span></div>
        </aside>
        <div class="main">
          <div class="topbar"><span class="swap" data-k="title">Playground</span><span class="status-pill" data-k="status">LIVE · 320×180</span></div>
          <canvas class="pv pv-main" id="pvMain" width="320" height="180" aria-label="Live pixel preview"></canvas>
          <div class="kpis">
            <div class="kpi"><span class="l"{ko('체험')}>Experiences</span><span class="v">8</span><span class="d">play/</span></div>
            <div class="kpi"><span class="l"{ko('무기')}>Weapons</span><span class="v">7</span><span class="d"{ko('플레이그라운드')}>playground</span></div>
            <div class="kpi"><span class="l"{ko('날씨')}>Weather</span><span class="v">12</span><span class="d"{ko('날씨 실험실')}>weather lab</span></div>
            <div class="kpi"><span class="l"{ko('픽셀 이펙트')}>Pixel effects</span><span class="v">244</span><span class="d">pixelfx</span></div>
          </div>
          <div class="finding"><span class="k"{ko('진동')}>HAPTICS</span><p class="swap" data-k="finding"></p></div>
        </div>
      </div>
      <div class="shot-fade" aria-hidden="true"></div>
    </div>
  </div>

  <div class="logos reveal">
    <span class="logos-label"{ko('필요한 것')}>REQUIREMENTS</span>
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
          <p class="eyebrow"{ko('01 — 하드웨어')}>01 — HARDWARE</p>
          <h2 class="h2x"{ko('DualSense의 <span class="serif">세 가지</span> 기능.')}>Three DualSense <span class="serif">features</span>.</h2>
        </div>
        <p{ko('이 사이트에서 쓰는 컨트롤러 기능과 각각 어디에 쓰이는지입니다.')}>The controller features used here, and where each one is used.</p>
      </div>
      <div class="fgrid reveal">
        <article class="bx feat"><div class="feat-top"><span class="ficon">{ic('vibrate')}</span><span>01</span></div><h3{ko('HD 햅틱')}>HD haptics</h3><p{ko('USB로 연결하면 컨트롤러가 4채널 오디오 장치로 잡힙니다. 3번과 4번 채널이 왼쪽과 오른쪽 손잡이의 진동 장치입니다.')}>Over USB the controller is a 4-channel audio device. Channels 3 and 4 drive the left and right grip.</p></article>
        <article class="bx feat"><div class="feat-top"><span class="ficon">{ic('crosshair')}</span><span>02</span></div><h3{ko('적응형 트리거')}>Adaptive triggers</h3><p{ko('R2가 딸깍 끊기거나, 당길수록 무거워지거나, 떨리거나, 중간에 막힙니다. 무기마다 하나씩 씁니다.')}>R2 can click, get heavier, vibrate or stop partway. Each weapon uses one of these.</p></article>
        <article class="bx feat"><div class="feat-top"><span class="ficon">{ic('volume-2')}</span><span>03</span></div><h3{ko('컨트롤러 스피커')}>Controller speaker</h3><p{ko('재장전, 탄피, 코인 같은 작은 소리는 컨트롤러에서 납니다. 나머지는 PC 스피커로 나옵니다.')}>Small sounds such as reloads, shell casings and coins play from the controller. Everything else plays on the PC.</p></article>
      </div>
    </div>
  </div>

  <div class="hsec">
    <div class="wrap">
      <div class="shead reveal">
        <div>
          <p class="eyebrow"{ko('02 — 세부')}>02 — DETAILS</p>
          <h2 class="h2x"{ko('설정 <span class="serif">일부</span>.')}>Some of the <span class="serif">settings</span>.</h2>
        </div>
        <p{ko('트리거 모드, 날씨 종류, 무기 목록입니다.')}>Trigger modes, weather types and weapons.</p>
      </div>
      <div class="bento reveal">
        <div class="brow">
          <div class="bx team">
            <div class="team-copy">
              <span class="kick"{ko('트리거 저항')}>TRIGGER RESISTANCE</span>
              <h3{ko('R2 저항 모드 4가지.')}>Four R2 resistance modes.</h3>
              <p{ko('모드를 누르면 저항 곡선이 바뀝니다.')}>Pick a mode to see its resistance curve.</p>
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
            <span class="kick"{ko('날씨 12가지')}>12 WEATHER TYPES</span>
            <h3{ko('날씨 실험실.')}>Weather lab.</h3>
            <div class="surf-tiles">{wx_tiles}</div>
          </div>
        </div>
        <div class="brow brow-3">
          <div class="bx">
            <span class="kick"{ko('무기 7종')}>7 WEAPONS</span>
            <h3{ko('L1·R1로 교체.')}>Switch with L1 and R1.</h3>
            <div class="models" role="group" aria-label="Weapons">
              <button class="model" aria-pressed="true">Sword</button><button class="model" aria-pressed="false">Hammer</button><button class="model" aria-pressed="false">Spear</button><button class="model" aria-pressed="false">Fists</button><button class="model" aria-pressed="false">Pistol</button><button class="model" aria-pressed="false">SMG</button><button class="model" aria-pressed="false">Bow</button>
            </div>
          </div>
          <div class="bx">
            <span class="kick"{ko('연결')}>CONNECT</span>
            <h3{ko('USB로 연결.')}>Connect over USB.</h3>
            <div class="approval">
              {ic('usb')}
              <span class="approval-q"{ko('플레이 화면에서 컨트롤러 연결')}>Connect the controller on the Play page</span>
              <a class="approve" href="play/">{ic('arrow-right')}<span class="approve-t"{ko('플레이')}>Play</span></a>
            </div>
          </div>
          <div class="bx sched">
            <span class="kick"{ko('보물 쟁반')}>TREASURE TRAY</span>
            <h3{ko('순서.')}>How it goes.</h3>
            <div class="run"><span class="tm">01</span><span class="dot"></span><span class="nm"{ko('기울여서 굴리기')}>Tilt to roll</span></div>
            <div class="run"><span class="tm">02</span><span class="dot"></span><span class="nm"{ko('상자 열기')}>Open the chest</span></div>
            <div class="run"><span class="tm">03</span><span class="dot"></span><span class="nm"{ko('코인 모으기')}>Collect coins</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="testi">
    <div class="wrap" style="display:flex;flex-direction:column;align-items:center;gap:36px">
      <div class="proof reveal">
        <div><b data-count="8">8</b><span{ko('체험')}>experiences</span></div>
        <div><b data-count="7">7</b><span{ko('무기')}>weapons</span></div>
        <div><b data-count="12">12</b><span{ko('날씨')}>weather types</span></div>
        <div><b data-count="244">244</b><span{ko('픽셀 이펙트')}>pixel effects</span></div>
      </div>
    </div>
  </div>

  <div class="cta-sec">
    <div class="wrap">
      <div class="cta-card reveal">
        <div class="cta-glow" aria-hidden="true"></div>
        <p class="eyebrow"{ko('무료')}>FREE</p>
        <h2 class="cta-h"{ko('지금 <span class="serif">해 보기</span>.')}><span class="serif">Try</span> it now.</h2>
        <p{ko('데스크톱 Chrome 또는 Edge가 필요합니다. HD 햅틱은 USB 연결에서만 됩니다.')}>Needs desktop Chrome or Edge. HD haptics need a USB connection.</p>
        <div class="ctas">
          <a class="btn btn-primary" href="play/">{ic('play')}<span{ko('플레이')}>Play</span></a>
          <a class="btn btn-ghost" href="#guide"><span{ko('설정 방법')}>Setup guide</span>{ic('arrow-right')}</a>
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
MATRIX = [('HD haptics', 'HD 햅틱', [1, 1, 1, 1, 1, 1, 1, 1]), ('Adaptive trigger', '적응형 트리거', [1, 0, 0, 1, 1, 1, 1, 0]), ('Controller speaker', '컨트롤러 스피커', [1, 1, 1, 1, 1, 0, 0, 0]), ('Motion sensor', '모션 센서', [0, 0, 1, 0, 0, 0, 0, 0]), ('Keyboard and mouse', '키보드·마우스', [1, 1, 1, 1, 1, 1, 1, 1])]
rows = '\n'.join(f'<tr><td{ko(k)}>{e}</td>' + ''.join(f'<td{PRO if i == 0 else ""}>{Y if v else N}</td>' for i, v in enumerate(vals)) + '</tr>' for e, k, vals in MATRIX)
heads = ''.join(f'<th scope="col"{PRO if i == 0 else ""}{ko(x[3])}>{x[2]}</th>' for i, x in enumerate(XPS))
FAQ = [('Which browsers work?', '어떤 브라우저에서 되나요?', 'Desktop Chrome and Edge. They support WebHID, which talks to the controller directly. Safari and Firefox do not.', '데스크톱 Chrome과 Edge입니다. 컨트롤러와 직접 통신하는 WebHID를 지원하기 때문입니다. Safari와 Firefox는 지원하지 않습니다.'),
       ('Why USB and not Bluetooth?', '왜 블루투스가 아니라 USB인가요?', 'HD haptics travel as audio, and browsers can only reach the controller audio over USB. On Bluetooth everything still works, with classic rumble instead.', 'HD 햅틱은 오디오로 전달되는데, 브라우저는 USB로 연결했을 때만 컨트롤러 오디오에 접근할 수 있습니다. 블루투스에서도 모두 동작하지만 일반 진동으로 바뀝니다.'),
       ('Why does it ask for the microphone?', '왜 마이크 권한을 묻나요?', 'Chrome hides audio device names until a media permission is granted. We ask once to find the DualSense output and close the stream immediately. Nothing is recorded.', 'Chrome은 미디어 권한을 받기 전까지 오디오 장치 이름을 숨깁니다. DualSense 출력 장치를 찾으려고 한 번 묻고 바로 닫습니다. 녹음은 하지 않습니다.'),
       ('Do I need a DualSense?', 'DualSense가 꼭 있어야 하나요?', 'No. Other gamepads get normal rumble, and you can use a keyboard and mouse without vibration.', '아니요. 다른 게임패드는 일반 진동으로, 키보드와 마우스는 진동 없이 할 수 있습니다.')]
faq = '\n'.join(f'''        <div class="qa{' open' if i == 0 else ''}">
          <button type="button" aria-expanded="{'true' if i == 0 else 'false'}"><span{ko(qk)}>{q}</span><span class="ic"><svg class="i plus"><use href="#i-plus"/></svg><svg class="i minus"><use href="#i-minus"/></svg></span></button>
          <div class="ans"><p{ko(ak)}>{a}</p></div>
        </div>''' for i, (q, qk, a, ak) in enumerate(FAQ))

EXPERIENCES = f'''<section class="page p-xp" data-page="experiences">
  <div class="page-hero pr-hero">
    <p class="eyebrow"{ko('체험')}>Experiences</p>
    <h1 class="h1"{ko('체험 <span class="serif">8가지</span>.')}><span class="serif">Eight</span> experiences.</h1>
    <p class="lede"{ko('모두 무료이고 브라우저에서 실행됩니다. 미리보기는 게임과 같은 엔진으로 그립니다.')}>All free and run in the browser. The previews use the same engine as the game.</p>
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
      <h2 class="h2"{ko('체험별 <span class="serif">기능</span>')}>Features per <span class="serif">experience</span></h2>
      <div class="tbl-scroll" tabindex="0" aria-label="Feature table, scroll horizontally on small screens">
        <table class="tbl"><thead><tr><th scope="col"></th>{heads}</tr></thead><tbody>
{rows}
        </tbody></table>
      </div>
    </div>
  </div>
  <div class="pr-faq">
    <div class="wrap reveal">
      <h2 class="h2"{ko('자주 묻는 <span class="serif">질문</span>')}>Frequently asked <span class="serif">questions</span></h2>
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
TUTS = [('b', 'BEGINNER', 'Your first five minutes', '처음 5분', 'beginner start', 'start', '4 min'), ('m', 'INTERMEDIATE', 'Footsteps on wood and brick', '나무와 벽돌 위 발소리', 'surfaces footsteps', 'surfaces', '3 min'), ('a', 'ADVANCED', 'Why one hidden bit silences the coils', '숨은 비트 하나가 진동을 막는 이유', 'advanced report bit', 'bit', '8 min')]
tuts = '\n'.join(f'''            <button type="button" class="rs-tut" data-k="{k}" data-art="{a}">
              <span class="rs-lvl {l}">{lv}</span>
              <h4{ko(tk)}>{t}</h4>
              <span class="rs-meta">{ic('clock')}{m}</span>
            </button>''' for l, lv, t, tk, k, a, m in TUTS)

GUIDE = f'''<section class="page p-resources" data-page="guide">
  <div class="rs-hero">
    <p class="eyebrow"{ko('가이드')}>Guide</p>
    <h1 class="rs-title"{ko('<span class="serif">가이드</span>')}><span class="serif">Guide</span></h1>
    <p class="rs-lede"{ko('설정, 문제 해결, 동작 원리.')}>Setup, troubleshooting and how it works.</p>
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
          <h3{ko('버그 <span class="serif">제보</span>')}>Report a <span class="serif">bug</span></h3>
          <p{ko('컨트롤러 종류, 연결 방식(USB/블루투스), 브라우저를 함께 적어 주세요.')}>Include your controller, connection (USB or Bluetooth) and browser.</p>
        </div>
        <a class="btn btn-primary" href="https://github.com/andonghun/fun-haptic/issues" target="_blank" rel="noopener"><span{ko('이슈 남기기')}>Open an issue</span> {ic('arrow-right')}</a>
      </div>
    </div>
  </div>
</section>'''

REL = [('v0.6', 'Nov 2, 2026', [('mint', 'New'), ('sky', 'Improved')], 'Weather lab and Treasure tray', '날씨 실험실, 보물 쟁반', 'Rain was replaced by a weather lab with 12 types. The tray rolls balls when you tilt the controller, and drops coins from a chest. The playground now has two floors, combos and stronger hit vibration.', '비 체험을 날씨 12가지가 있는 날씨 실험실로 바꿨습니다. 보물 쟁반은 컨트롤러를 기울이면 공이 구르고 상자에서 코인이 떨어집니다. 플레이그라운드는 바닥 2종, 콤보, 더 강한 타격 진동으로 바뀌었습니다.', ['Device and vibration status always on screen', 'Vibration test in the menu', 'Mouse buttons for attack and R2', 'Fix: the hammer no longer turns into a sword on a heavy attack', 'Fix: removed a squeaky sound when firing'], ['장치와 진동 상태 항상 표시', '메뉴에 진동 테스트', '마우스 버튼으로 공격과 R2', '수정: 망치 강공격 때 칼로 바뀌던 문제', '수정: 총 쏠 때 나던 끽끽 소리 제거']),
       ('v0.5', 'Nov 2, 2026', [('mint', 'New')], 'Playground', '플레이그라운드', 'A side-scrolling area with straw dummies. Walk, run, dash, jump and use seven weapons.', '허수아비가 있는 횡스크롤 공간. 걷기, 달리기, 대시, 점프, 무기 7종.', ['Dash with after-images', 'Skid when stopping from a run', 'Hit-stop and screen shake per move'], ['잔상이 남는 대시', '달리다 멈추면 미끄러짐', '동작별 히트스톱과 화면 흔들림']),
       ('v0.4', 'Nov 2, 2026', [('mint', 'New'), ('sky', 'Graphics')], 'Pixel art', '픽셀아트', 'Rebuilt in pixel art with the open-source pixelfx library. Added vibration generated from on-screen light.', '오픈소스 pixelfx 라이브러리로 픽셀아트로 다시 만들었습니다. 화면의 빛으로 진동을 만드는 기능을 추가했습니다.', ['244 effects in the gallery', 'Live previews in the menu'], ['갤러리에 이펙트 244개', '메뉴에 실시간 미리보기']),
       ('v0.3', 'Oct 18, 2026', [('sky', 'Improved')], 'First-person version', '1인칭 버전', 'Rain, pistol, rifle, bow, footsteps and tilt in 3D first person.', '비, 권총, 소총, 활, 발소리, 굴리기를 3D 1인칭으로.', ['Small sounds moved to the controller speaker'], ['작은 소리를 컨트롤러 스피커로']),
       ('v0.2', 'Oct 17, 2026', [('amber', 'Experiment')], '3D adventure', '3D 모험', 'A hub island with seven stages. Replaced later by separate experiences.', '스테이지 7개가 있는 허브 섬. 이후 개별 체험으로 바꿨습니다.', ['Sword guard and parry', 'Axe throw and recall'], ['검 막기와 패리', '도끼 던지기와 회수']),
       ('v0.1', 'Oct 17, 2026', [('red', 'Fix')], 'HD haptics working', 'HD 햅틱 동작', 'The controller ignored audio haptics while a legacy rumble flag was set in its output report. Rumble is now only sent when HD haptics are off.', '출력 리포트에 구형 진동 플래그가 켜져 있으면 컨트롤러가 오디오 진동을 무시했습니다. 이제 HD 햅틱이 꺼져 있을 때만 구형 진동을 보냅니다.', ['Channels 3 and 4 drive the left and right grip', 'Adaptive triggers over WebHID'], ['3·4번 채널이 왼쪽·오른쪽 손잡이', 'WebHID로 적응형 트리거'])]
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
    <h1 class="cl-title"{ko('업데이트 <span class="serif">기록</span>.')}>Release <span class="serif">notes</span>.</h1>
    <p class="cl-lede"{ko('추가, 개선, 수정 내역입니다.')}>Additions, improvements and fixes.</p>
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
        <p{ko('DualSense 진동과 트리거를 브라우저에서 써 보는 무료 사이트.')}>Free browser demos for DualSense haptics and triggers.</p>
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
