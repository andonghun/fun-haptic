// ko / en strings. t('key', {var}) — {var} placeholders.
const D = {
  ko: {
    title: '햅틱 퀘스트', tagline: '손끝으로 느끼는 작은 모험',
    start: '시작하기', continue: '이어하기', settings: '설정', language: 'English',
    ob_title: '컨트롤러 준비', ob_step1: '① 컨트롤러 연결', ob_step2: '② HD 햅틱 켜기', ob_step3: '③ 손으로 느껴보기',
    ob_ds: 'DualSense 연결 (USB)', ob_other: '다른 패드 / 키보드로 플레이',
    ob_ds_ok: '연결됨: {name}', ob_ds_bt: '블루투스 연결 — HD 햅틱은 USB에서만 됩니다. 일반 진동으로 진행합니다.',
    ob_hd_btn: 'HD 햅틱 켜기', ob_hd_why: '진짜 손맛은 컨트롤러의 4채널 오디오로 나옵니다. 장치 이름을 찾기 위해 마이크 권한을 한 번 묻습니다 — 녹음은 하지 않습니다.',
    ob_hd_ok: 'HD 햅틱 켜짐 ({ch}채널)', ob_hd_skip: '건너뛰기 (일반 진동)',
    ob_err_permission: '권한이 거부되어 장치를 찾지 못했습니다. 주소창 왼쪽 아이콘에서 마이크 권한을 허용한 뒤 다시 눌러 주세요.',
    ob_err_notfound: 'DualSense 오디오 장치를 찾지 못했습니다. USB 케이블로 연결했는지 확인하세요.',
    ob_err_channels: 'DualSense가 {ch}채널로만 잡혀 있습니다. Windows 소리 설정 → DualSense → 속성 → 고급에서 4채널 형식을 고르세요.',
    ob_err_browser: '이 브라우저는 출력 장치 선택을 지원하지 않습니다. 데스크톱 Chrome 또는 Edge를 써 주세요.',
    ob_err_insecure: 'HTTPS 주소에서만 동작합니다.', ob_err_sink: '출력 장치를 열지 못했습니다. 다른 앱이 컨트롤러 오디오를 쓰는지 확인하세요.',
    ob_test: '양손 테스트', ob_test_q: '왼손 → 오른손으로 흐르는 진동이 느껴졌나요?', ob_yes: '네, 느껴져요!', ob_no: '안 느껴져요',
    ob_trouble: 'Steam이 컨트롤러를 가로채면 HD 햅틱이 막힙니다. Steam을 끄거나 Steam Input을 비활성화한 뒤 다시 시도하세요.',
    ob_go: '모험 시작', ob_nopad: '패드 없이도 플레이할 수 있지만, 이 게임은 진동이 핵심입니다.',
    webhid_missing: '이 브라우저는 WebHID를 지원하지 않아 DualSense를 직접 연결할 수 없습니다 (Chrome/Edge 데스크톱 권장). 일반 패드나 키보드로 플레이할 수 있습니다.',
    hub_hint: '포털에 올라가 {b} 로 입장', locked: '잠김 — 별 {n}개 필요', soon: '준비 중', stars: '별',
    st1: '발밑의 세계', st1_d: '손끝 감각만으로 숨은 보물을 찾으세요', st2: '검의 길', st3: '사격장', st4: '궁수의 계곡', st5: '얼음 협곡', st6: '폭풍', st7: '최종 결전',
    s1_goal: '보물 {n} / {m}', s1_intro: '보물이 가까울수록 손이 두근거립니다.\n진동이 오는 쪽으로 걸어가세요.',
    s1_dig_ds: '터치패드를 문질러 파내기', s1_dig_other: '{b} 를 연타해 파내기', s1_found: '보물 발견! {n} / {m}',
    s1_exit_open: '출구 포털이 열렸습니다 — 계속 찾아도 돼요', s1_star1: '보물 3개 찾기', s1_star2: '보물 6개 모두 찾기', s1_star3: '3분 안에 모두 찾기',
    surf_grass: '풀밭', surf_wood: '나무 다리', surf_metal: '철교', surf_snow: '눈밭', surf_stone: '돌 광장', surf_gravel: '자갈길', surf_water: '얕은 물', surf_sand: '모래',
    pause: '일시정지', resume: '계속하기', to_hub: '허브로 돌아가기', restart: '다시 시작', haptic_level: '진동 세기', volume: '소리 크기', sens: '시점 감도', invert: '시점 상하 반전',
    results: '결과', time: '시간', next: '계속', retry: '다시 하기', clear: '클리어!',
    on: '켜짐', off: '꺼짐', touchpad: '터치패드', loading: '불러오는 중…',
    ctl_move: '이동', ctl_look: '시점', ctl_jump: '점프', ctl_enter: '입장',
    footer_credits: '3D 모델: Quaternius, Kenney (CC0) · 효과음: Kenney (CC0)'
  },
  en: {
    title: 'Haptic Quest', tagline: 'A tiny adventure you feel in your hands',
    start: 'Start', continue: 'Continue', settings: 'Settings', language: '한국어',
    ob_title: 'Controller setup', ob_step1: '① Connect controller', ob_step2: '② Turn on HD haptics', ob_step3: '③ Feel it',
    ob_ds: 'Connect DualSense (USB)', ob_other: 'Play with another pad / keyboard',
    ob_ds_ok: 'Connected: {name}', ob_ds_bt: 'Bluetooth connection — HD haptics need USB. Continuing with standard rumble.',
    ob_hd_btn: 'Turn on HD haptics', ob_hd_why: 'The real feel comes through the controller\'s 4-channel audio. The browser asks for microphone permission once so it can see device names — nothing is recorded.',
    ob_hd_ok: 'HD haptics on ({ch} channels)', ob_hd_skip: 'Skip (standard rumble)',
    ob_err_permission: 'Permission was denied, so the device could not be found. Allow the microphone from the icon left of the address bar and try again.',
    ob_err_notfound: 'Could not find the DualSense audio device. Make sure it is connected with a USB cable.',
    ob_err_channels: 'The DualSense is set to {ch} channels. In Windows Sound settings → DualSense → Properties → Advanced, pick a 4-channel format.',
    ob_err_browser: 'This browser cannot choose an audio output device. Please use desktop Chrome or Edge.',
    ob_err_insecure: 'Only works over HTTPS.', ob_err_sink: 'Could not open the output device. Check that no other app is using the controller audio.',
    ob_test: 'Two-hand test', ob_test_q: 'Did you feel a buzz travel from your left hand to your right?', ob_yes: 'Yes, I felt it!', ob_no: 'I didn\'t',
    ob_trouble: 'Steam can grab the controller and block HD haptics. Quit Steam or disable Steam Input, then try again.',
    ob_go: 'Start the adventure', ob_nopad: 'You can play without a controller, but vibration is the heart of this game.',
    webhid_missing: 'This browser has no WebHID, so a DualSense cannot be connected directly (desktop Chrome/Edge recommended). You can still play with a standard pad or keyboard.',
    hub_hint: 'Step on a portal and press {b}', locked: 'Locked — {n} stars needed', soon: 'Coming soon', stars: 'stars',
    st1: 'Underfoot', st1_d: 'Find hidden treasure by touch alone', st2: 'Way of the Sword', st3: 'Shooting Range', st4: 'Archer\'s Valley', st5: 'Ice Canyon', st6: 'The Storm', st7: 'Final Battle',
    s1_goal: 'Treasure {n} / {m}', s1_intro: 'Your hands beat faster as treasure gets closer.\nWalk toward the side that buzzes.',
    s1_dig_ds: 'Rub the touchpad to dig', s1_dig_other: 'Tap {b} to dig', s1_found: 'Treasure found! {n} / {m}',
    s1_exit_open: 'The exit portal is open — you can keep searching', s1_star1: 'Find 3 treasures', s1_star2: 'Find all 6 treasures', s1_star3: 'Find all within 3 minutes',
    surf_grass: 'Meadow', surf_wood: 'Boardwalk', surf_metal: 'Iron bridge', surf_snow: 'Snowfield', surf_stone: 'Stone plaza', surf_gravel: 'Gravel path', surf_water: 'Shallows', surf_sand: 'Sand',
    pause: 'Paused', resume: 'Resume', to_hub: 'Back to hub', restart: 'Restart', haptic_level: 'Vibration', volume: 'Volume', sens: 'Camera speed', invert: 'Invert camera Y',
    results: 'Results', time: 'Time', next: 'Continue', retry: 'Retry', clear: 'Clear!',
    on: 'On', off: 'Off', touchpad: 'Touchpad', loading: 'Loading…',
    ctl_move: 'Move', ctl_look: 'Camera', ctl_jump: 'Jump', ctl_enter: 'Enter',
    footer_credits: '3D models: Quaternius, Kenney (CC0) · Sound: Kenney (CC0)'
  }
};
let lang = (() => { try{ const s = localStorage.getItem('hq_lang'); if(s) return s; }catch(e){} return /^ko/i.test(navigator.language || '') ? 'ko' : 'en'; })();
export const getLang = () => lang;
export function setLang(l){ lang = l; try{ localStorage.setItem('hq_lang', l); }catch(e){} document.documentElement.lang = l; }
export function t(k, v){ let s = (D[lang] && D[lang][k]) ?? D.en[k] ?? k; if(v) for(const n in v) s = s.split('{' + n + '}').join(v[n]); return s; }
document.documentElement.lang = lang;
