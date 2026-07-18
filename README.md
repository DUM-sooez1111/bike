# POLY DRIVE

설치 없이 브라우저에서 실행되는 Three.js 기반 3D 자동차 게임입니다.

## 실행

`index.html`을 더블클릭해 브라우저로 열면 됩니다. Three.js 런타임이 프로젝트에
포함되어 있어 별도 설치나 인터넷 연결이 필요하지 않습니다.

## 조작

- `W` 가속
- `S` 후진
- `A` / `D` 좌우 조향
- `Shift` 강한 브레이크
- `Space` 점프
- `R` 차량 복구
- `ESC` 일시정지

## 파일 구조

- `index.html` — 게임 화면과 UI
- `style.css` — HUD, 시작/일시정지 화면, 반응형 스타일
- `main.js` — Three.js 월드, 자동차 모델, 물리, 충돌, 카메라, 사운드
- `vendor/three.min.js` — 오프라인 실행을 위한 Three.js 런타임
