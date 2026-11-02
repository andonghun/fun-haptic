# 픽셀 햅틱 (fun-haptic)

DualSense의 HD 햅틱·적응형 트리거·컨트롤러 스피커를 브라우저에서 느껴보는 픽셀아트 체험 모음.
그래픽은 [pixelfx](https://github.com/patch-gg/pixelfx) (MIT, 244개 픽셀 이펙트)로 그립니다.
체험: 비, 권총, 기관총, 활, 근접 무기, 이펙트 갤러리(모든 이펙트에 자동 햅틱).
이전 버전: git 태그 `3d-lab-v1`(3D 1인칭), `game-v1`(3D 게임).

## 실행 (로컬 미리보기)
- Windows: `serve.bat` → `http://localhost:8765/play/`
- macOS/Linux: `sh serve.sh`
- 데스크톱 Chrome/Edge. DualSense는 **USB**로 연결해야 HD 햅틱이 나옵니다 (블루투스는 일반 진동).
- Steam이 켜져 있으면 Steam Input이 컨트롤러를 가로채 HD 햅틱이 막힙니다.

## 구조
```
index.html              랜딩 페이지 (ko/en, 애드센스 자리)
play/                   체험관
  js/main.js            체험 목록(라이브 픽셀 미리보기), 온보딩, 일시정지, 메인 루프
  js/px.js              픽셀 스테이지(pixelfx 프레임→캔버스) + 자동 햅틱 + 액트(캐릭터 동작) 햅틱
  js/pxp/rain.js        비 — R2 빗줄기, L2 우산, △ 번개(차오르는 정전기 → 3연타)
  js/pxp/guns.js        권총(딸깍 끊기는 트리거, 한 발씩) / 기관총(떨리는 트리거, 과열 시 굳음)
  js/pxp/bow.js         활 — R2로 시위를 당기는 만큼 동작이 진행, 놓으면 발사
  js/pxp/melee.js       근접 무기 14종 — 휘두르기 전 칼바람, 맞는 순간 히트스톱 손맛
  js/pxp/gallery.js     이펙트 갤러리 — 244개 전부, 빛의 변화 → 진동 자동 변환
  js/ds.js, haptics.js, sound.js, input.js, feel.js, ui.js, i18n.js   (공용)
vendor/pixelfx/         pixelfx 0.3.0 (MIT) — src만 사용
lab/                    초기 실험실 (참고용)
```

## 자동 햅틱 원리
매 프레임 이펙트가 내는 빛(light 버퍼 + 색 픽셀)을 측정해서:
- 갑자기 밝아지면 → 크기만큼 "탁" (크랙 + 저음 쿵), 화면 좌우 위치대로 왼손/오른손 배분
- 계속 빛나면 → 은은한 진동(허밍), 깜빡임이 많을수록 거칠게
- 따뜻한 색(불·폭발)은 낮은 주파수, 차가운 색(얼음·번개)은 높은 주파수
- 캐릭터가 나오는 이펙트는 pixelfx의 `act.hits`(타격 타이밍·히트스톱·밀림)를 그대로 진동으로 변환

## HD 햅틱 핵심 사실
- USB 연결 시 컨트롤러는 4채널 오디오 장치. ch3/ch4 = 왼손/오른손 보이스코일.
- 출력 리포트의 구형 진동 호환 비트(valid_flag0 bit0, valid_flag2 bit2)가 켜져 있으면 액추에이터가 오디오를 무시합니다. → HD 햅틱 중에는 구형 진동을 보내지 않음 (`DS.allowRumble = false`).
- 크롬은 출력 장치 이름을 보려면 미디어 권한이 필요해서, HD 햅틱 켤 때 마이크 권한을 한 번 요청합니다(스트림은 즉시 닫음).

## 진행 상황
- [x] 픽셀 체험 6개 (비, 권총, 기관총, 활, 근접 무기, 이펙트 갤러리)
- [ ] 체험 추가 후보: 운전(브레이크·엑셀 트리거), 낚시(릴 장력), 심장박동
- [ ] 사이트: 가이드 글, 개인정보처리방침, ads.txt, 배포

## 라이선스
코드: 라이선스 미정(저장소 소유자). 픽셀 이펙트: pixelfx (MIT, vendor/pixelfx/LICENSE·NOTICE.md). 효과음: Kenney (CC0) — `play/assets/sfx/CREDITS.txt`.
