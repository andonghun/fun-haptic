# Haptic Quest (fun-haptic)

브라우저에서 DualSense HD 햅틱을 체험하는 3D 모험 게임. 서버 코드 없이 정적 파일만으로 동작합니다.

## 실행 (로컬 미리보기)
- Windows: `serve.bat` → `http://localhost:8765/play/`
- macOS/Linux: `sh serve.sh`
- 데스크톱 Chrome/Edge. DualSense는 **USB**로 연결해야 HD 햅틱이 나옵니다 (블루투스는 일반 진동).
- Steam이 켜져 있으면 Steam Input이 컨트롤러를 가로채 HD 햅틱이 막힙니다.

## 구조
```
index.html            랜딩 페이지 (ko/en, 애드센스 자리)
play/                 게임
  index.html, style.css
  js/main.js          부팅, 화면 전환, 메인 루프, 온보딩/일시정지/결과
  js/ds.js            DualSense WebHID 입출력 (라이트바, 적응형 트리거, 구형 진동)
  js/haptics.js       HD 햅틱(USB 오디오 ch3/ch4) + 구형 진동/게임패드 대체
  js/sound.js         효과음(기본 출력) + 샘플 뱅크
  js/feel.js          촉감 어휘: 발소리, 착지, 코인, UI 틱, 보물 탐지 핑, 파내기 …
  js/input.js         DualSense > 표준 게임패드 > 키보드·마우스 통합 입력
  js/assets.js        GLB 모델 레지스트리 (자동 크기 맞춤, custom.json 교체)
  js/engine.js        렌더러, 하늘, 3인칭 카메라, 파티클
  js/world.js         걸을 수 있는 표면 패치(평판/경사/원판) + 충돌
  js/player.js        캐릭터 조작 (걷기/달리기, 점프, 호버 제트)
  js/hub.js           허브 섬 + 스테이지 포털 7개
  js/stage1.js        스테이지 ① 발밑의 세계 (손끝으로 보물 찾기)
  js/i18n.js          한국어/영어
  assets/models/      CC0 모델 (CREDITS.txt), custom.json
  assets/sfx/         CC0 효과음 (CREDITS.txt)
  tools/viewer.html   모델 미리보기 (?m=robot,arena/tree)
vendor/three/         three.js 0.164.1 (MIT)
lab/                  초기 실험실 (파이썬 브리지 포함, 참고용)
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
- [x] 엔진, 온보딩, 허브, 스테이지 ①
- [ ] 스테이지 ②검 ③사격 ④활 ⑤도끼 ⑥폭풍 ⑦보스
- [ ] 사이트: 가이드 글, 개인정보처리방침, ads.txt, 배포

## 라이선스
코드: 라이선스 미정(저장소 소유자). 모델/효과음: CC0 (Quaternius, Kenney) — `play/assets/*/CREDITS.txt`. three.js: MIT.
