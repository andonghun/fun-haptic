# 햅틱 체험관 (fun-haptic)

DualSense를 산 사람이 HD 햅틱·적응형 트리거·컨트롤러 스피커·모션 센서를 바로 느껴볼 수 있는 브라우저 체험 모음.
게임 요소 없이 1인칭 체험 6개: 비, 권총, 소총, 활, 발소리, 굴리기. (이전 게임 버전은 git 태그 `game-v1`)

## 실행 (로컬 미리보기)
- Windows: `serve.bat` → `http://localhost:8765/play/`
- macOS/Linux: `sh serve.sh`
- 데스크톱 Chrome/Edge. DualSense는 **USB**로 연결해야 HD 햅틱이 나옵니다 (블루투스는 일반 진동).
- Steam이 켜져 있으면 Steam Input이 컨트롤러를 가로채 HD 햅틱이 막힙니다.

## 구조
```
index.html            랜딩 페이지 (ko/en, 애드센스 자리)
play/                 체험관
  js/main.js          체험 목록 메뉴, 온보딩, 일시정지, 메인 루프
  js/fp.js            1인칭 시점(스틱/마우스/자이로), 걷기 + 머리 흔들림, 반동, 뷰모델
  js/xp/rain.js       비 — R2 빗줄기, L2 우산, △ 천둥, 웅덩이 발소리
  js/xp/guns.js       권총(딸깍 끊기는 트리거) / 소총(떨리는 트리거, 과열 시 굳음)
  js/xp/bow.js        활 — R2가 시위(점점 무거워짐), 끝까지 당기면 떨림
  js/xp/walk.js       발소리 — 8가지 바닥 위를 1인칭으로 걷기
  js/xp/tilt.js       굴리기 — 컨트롤러 기울여 쇠·나무·고무공 굴리기
  js/xp/common.js     표적, 총소리, 탄피 등 공용
  js/ds.js            DualSense WebHID (라이트바, 적응형 트리거, 구형 진동)
  js/haptics.js       HD 햅틱(USB 오디오 ch3/ch4) + 지속 음성 + 구형 진동/게임패드 대체
  js/sound.js         효과음(PC 출력) + 손 안의 소리는 컨트롤러 스피커(pad:true)
  js/feel.js          촉감 어휘: 발소리, 착지, UI 틱 …
  js/input.js         DualSense > 표준 게임패드 > 키보드·마우스
vendor/three/         three.js 0.164.1 (MIT)
lab/                  초기 실험실 (참고용)
```

## 모델 바꾸기
`play/assets/models/custom.json`에 덮어쓸 항목을 적습니다. 모델은 +Z 방향을 바라보면 되고, 크기/바닥 위치는 자동으로 맞춥니다.
```json
{ "player": { "url": "custom/hero.glb", "height": 1.6, "anims": { "idle": "Idle", "walk": "Walk", "run": "Run", "jump": "Jump" } } }
```
키 목록과 기본값은 `play/js/assets.js`의 `MODELS` 참고. 미리보기: `/play/tools/viewer.html?m=custom/hero`.

## HD 햅틱 핵심 사실
- USB 연결 시 컨트롤러는 4채널 오디오 장치. ch3/ch4 = 왼손/오른손 보이스코일.
- 출력 리포트의 구형 진동 호환 비트(valid_flag0 bit0, valid_flag2 bit2)가 켜져 있으면 액추에이터가 오디오를 무시합니다. → HD 햅틱 중에는 구형 진동을 보내지 않음 (`DS.allowRumble = false`).
- 크롬은 출력 장치 이름을 보려면 미디어 권한이 필요해서, HD 햅틱 켤 때 마이크 권한을 한 번 요청합니다(스트림은 즉시 닫음).

## 진행 상황
- [x] 체험 6개 (비, 권총, 소총, 활, 발소리, 굴리기)
- [ ] 체험 추가 후보: 운전(브레이크·엑셀 트리거), 낚시(릴 장력), 심장박동
- [ ] 사이트: 가이드 글, 개인정보처리방침, ads.txt, 배포

## 라이선스
코드: 라이선스 미정(저장소 소유자). 모델/효과음: CC0 (Quaternius, Kenney) — `play/assets/*/CREDITS.txt`. three.js: MIT.
