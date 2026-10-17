# fun-haptic (DualSense Lab)

USB로 연결한 DualSense를 WebHID로 직접 다루는 실험 프로젝트. 3D 컨트롤러 모델 + 걷기/봇 굴리기 등 햅틱 모드.

## 실행
- Windows: `run.bat` (venv 생성 후 `pip install -r requirements.txt` 먼저)
- macOS/Linux: `sh run.sh`
- 브라우저는 Chrome (WebHID 필요), 주소는 `http://localhost:8765/index.html` (file:// 불가). DualSense를 USB로 연결 후 페이지에서 연결 버튼.

## 구성
- `index.html` — 앱 전체 (three.js 장면, HID 입출력, 센서 퓨전, 적응형 트리거, 모드들). `#mode=walk` 처럼 해시로 모드 직행 가능.
- `server.py` — 정적 서버 + 4채널 햅틱 오디오 브리지(sounddevice). `POST /h`로 이벤트를 받아 ch3/4(보이스코일)로 재생.
- `tools_chtest.py` — 채널별 단독 진동 테스트 (Windows WASAPI device=16 하드코딩, 환경에 맞게 수정 필요).
- `sounds/` — Kenney Impact Sounds (CC0).

## 현재 상태 / 이어서 할 일
- 체험 여정(튜토리얼): 왼쪽 패널 "🎮 체험 여정 시작" — 11단계 미션, 점수/별점, OPTIONS 버튼으로 건너뛰기.
- 동작: WebHID 입력(자이로·스틱·트리거·터치패드), 라이트바, 구형 진동 모터, 적응형 트리거, 샘플 기반 발소리, 공 물리.
- **해결(원인): 출력 리포트의 구형 진동 호환 비트(valid_flag0 bit0, valid_flag2 bit2)가 켜져 있으면 액추에이터가 오디오가 아니라 구형 모터 값으로 구동돼 USB 오디오 ch3/ch4(좌/우 보이스코일)가 무시된다.** 에뮬레이터(Kyty)도 오디오 햅틱 중엔 구형 진동을 0으로 끈다. 지금은 "HID 구형 진동 모드: 자동"(진동 값이 있을 때만 비트 ON)이 기본. 채널 1은 왼쪽 스피커라 진동 없음(정상).
- 맥에서: `server.py`의 `find_device()`는 WASAPI 전용이라 CoreAudio용으로 고쳐야 함. DualSense가 4채널 장치로 보이는지 먼저 확인.
- HID 출력 리포트: 0x02(USB 47바이트) / 0x31+CRC32(BT). `d[7]` 라우팅 바이트는 좌측 스피커 채널을 죽이므로 쓰지 말 것.
- Sony/게임 제작 햅틱 파형은 사용하지 않음(독점). 샘플 → 햅틱 변환은 `makeHaptic`(JS)/`make_haptic`(Py) 참고.

## 라이선스
코드: 자유 사용. 사운드: Kenney (CC0). three.js r128: MIT.
