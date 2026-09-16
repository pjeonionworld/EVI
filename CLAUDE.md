# CLAUDE.md

이 문서는 새로운 Claude Code 세션이 EVI 프로젝트에 합류했을 때, 이 문서와 현재 코드만 읽고도
프로젝트의 목적·구조·구현 상태·개발 원칙을 빠르게 파악해서 이어서 작업할 수 있도록 작성되었습니다.

## Project Overview

EVI("이비")는 Windows 데스크톱 위에서 상시 실행되는 개인용 AI 에이전트 프로젝트입니다.

핵심 컨셉은 "내 컴퓨터 안에서 나와 함께 생활하면서, 사용자의 행동과 데이터를 기억하고 점점 사용자를
알아가는 픽셀 NPC 형태의 개인 AI Agent"입니다. 단순 챗봇 UI가 아니라, 화면 위에 존재하는 작은 픽셀
캐릭터가 Agent의 상태(생각 중/응답 중/대기 중 등)를 시각적으로 표현하는 것이 목표입니다.

**현재 단계: v0.1 — Desktop NPC Shell**

이번 버전은 Agent 기능(대화, Tool, 기억)은 전혀 포함하지 않고, "픽셀 NPC가 Windows 화면 위에서
실제로 살아 움직이는 느낌"만 구현한 최소 뼈대입니다. Agent Core/SQLite/LLM은 아직 코드에 존재하지
않습니다 — 이후 버전에서 이 셸 위에 얹는 방식으로 확장할 예정입니다.

유일한 예외는 호출벨 메뉴의 "영상 추천" 항목(아래 "YouTube 추천 기능" 참고) — Agent Core/Tool
Registry 없이, IPC로 직접 배선된 단일 기능으로 먼저 구현해 본 것입니다. 정식 Tool Registry가
생기면 그 구조로 옮겨질 후보입니다.

## Tech Stack

실제로 설치되어 사용 중인 것만 기재합니다.

- **Electron** (`electron`) — 데스크톱 앱 런타임, Main/Preload/Renderer 프로세스
- **React 18** (`react`, `react-dom`) — Renderer UI
- **TypeScript** — 전체 코드베이스, strict 모드
- **Vite** + **electron-vite** (`vite`, `electron-vite`, `@vitejs/plugin-react`) — 빌드/개발 서버, Main/Preload/Renderer 3중 빌드 구성
- **exceljs** — Main 프로세스에서 YouTube 시청기록 Excel 파일(`data/youtube/`)을 읽고 쓰는 용도로만 사용. DB 대체재가 아님(아래 "YouTube 추천 기능" 참고)
- 패키지 매니저: npm (`package-lock.json` 커밋됨)

**아직 도입하지 않음** (코드에 존재하지 않으므로 있는 것처럼 참조하지 말 것):
- SQLite / 그 외 데이터베이스
- LLM SDK / API 연동
- 상태관리 라이브러리(Redux, Zustand 등) — 현재는 React 기본 `useState`/`useRef`만 사용
- electron-builder 등 패키징 도구
- 테스트 프레임워크

## Current Architecture

### 프로세스 역할 분리

- **Electron Main** (`src/main/`) — 유일한 "두뇌"이자 OS 연동 지점. 창 생성/위치/크기 관리, 화면 작업영역
  계산, 트레이 아이콘, 싱글 인스턴스 보장을 담당. 향후 Agent Core/DB/LLM도 여기(또는 Main에서 파생된
  백그라운드 서비스)에 위치할 예정.
- **Preload** (`src/preload/`) — `contextBridge`로 Renderer에 필요한 IPC만 최소 노출. `contextIsolation:
  true`, `nodeIntegration: false`.
- **Renderer** (`src/renderer/`) — 순수 프레젠테이션. NPC 스프라이트 렌더링, 애니메이션 상태머신,
  드래그 입력 처리만 담당. DB/LLM/파일시스템에 직접 접근하지 않음.

### 디렉터리 구조

```
EVI/
├── assets/
│   ├── environment/
│   │   ├── DESK.png / call-bell.png / exit.png / talk-menu.png  # 정규화된 데스크 씬 에셋
│   │   └── source/               # 원본 보존 폴더 — 직접 수정 금지
│   └── npc/
│       ├── idle.png              # 정규화된 IDLE 스프라이트시트 (400x640 셀 x4 = 1600x640)
│       ├── walk.png              # 정규화된 WALK 스프라이트시트 (NEW WALK.png 기반, 400x640 셀 x4)
│       ├── sprite-meta.json      # 정규화 파라미터 기록 (cellWidth/Height, anchorY, walk 스케일 등)
│       ├── tray-icon.png         # 트레이 아이콘 (32x32, IDLE 프레임에서 생성)
│       └── source/               # 원본 에셋 보존 폴더 — 직접 수정 금지
│           ├── IDLE SPRITE.png
│           ├── WALK.png          # 이전 WALK 원본 (현재 미사용, 보존 목적)
│           ├── NEW WALK.png      # 현재 walk.png의 정규화 소스
│           ├── SIT.png / THINK.png / TALK.png   # 아직 동작 미구현, 원본만 보관
│           └── MASTER SPRITE.png # 디자인/크기 참고용
├── data/                    # gitignore 처리됨 — 개인정보성 데이터, 커밋 금지
│   └── youtube/
│       ├── seed-watch-history.xlsx    # 사용자가 준비한 과거 시청기록 분석 Excel의 사본(원본 비수정)
│       └── mealtime-watch-log.xlsx    # EVI가 직접 생성/추가하는 축적 데이터 (앱이 없으면 자동 생성)
├── src/
│   ├── main/
│   │   ├── index.ts        # 앱 진입점 — 싱글 인스턴스 락, whenReady에서 IPC 등록 + 창/트레이 생성
│   │   ├── npcWindow.ts    # NPC BrowserWindow 생성, 위치 상태(currentX/Y) 관리, 화면 경계 clamp, IPC 핸들러
│   │   ├── deskWindow.ts   # 데스크 씬 BrowserWindow(호출벨/EXIT/대화창) 생성, 호출 지점 좌표 계산
│   │   ├── callFlow.ts     # 데스크 창 ↔ NPC 창 간 호출벨/대화 상태 relay IPC
│   │   ├── youtubeIpc.ts   # "영상 추천" 메뉴용 IPC (youtube:getRecommendations / youtube:openVideo)
│   │   ├── services/
│   │   │   ├── youtubeHistoryStore.ts  # data/youtube/*.xlsx 읽기/쓰기 + 인메모리 캐시
│   │   │   └── youtubeRecommend.ts     # 시청기록 기반 추천 스코어링 (룰 기반, ML 아님)
│   │   └── tray.ts         # 시스템 트레이 아이콘 + "EVI 종료" 메뉴
│   ├── preload/
│   │   └── index.ts        # window.evi API 노출 (아래 "Main ↔ Renderer 통신 방식" 표 참고)
│   ├── renderer/
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx / App.tsx
│   │       ├── styles.css        # 투명 배경, 드래그 시 텍스트 선택 방지 등
│   │       ├── env.d.ts          # window.evi 타입 선언 + vite/client 타입
│   │       ├── npc/
│   │       │   ├── NpcView.tsx        # 스프라이트 렌더링 (background-image 방식, 상태별 시트 선택)
│   │       │   └── useNpcBehavior.ts  # IDLE/WALK 상태머신, 자율 이동 타이머, 드래그 핸들러
│   │       └── desk/
│   │           ├── DeskView.tsx           # 데스크 씬 렌더링, 호출벨/EXIT/대화창 UI, 메뉴 ↔ 패널 스위칭
│   │           ├── useBellAnimation.ts    # 호출벨 클릭 시 프레임 애니메이션
│   │           └── VideoRecommendPanel.tsx  # "영상 추천" 클릭 시 메뉴 그리드를 대체하는 패널
│   └── shared/
│       ├── npcConfig.ts          # Main·Renderer 공통 상수 (크기/속도/타이밍) — single source of truth
│       ├── environmentConfig.ts  # 데스크 씬 레이아웃 상수/계산 함수
│       └── youtubeTypes.ts       # VideoRecommendation 타입 (Main ↔ Renderer 공용)
├── electron.vite.config.ts # Main/Preload/Renderer 3중 빌드 설정, `@assets` alias(→ assets/)
├── package.json / package-lock.json
├── tsconfig.json / tsconfig.node.json / tsconfig.web.json
└── .gitignore
```

### Main ↔ Renderer 통신 방식

`src/preload/index.ts`가 노출하는 `window.evi` API가 전부입니다 (Renderer는 이 외에 IPC/Node에 접근할 방법이 없음).

| API | 종류 | 용도 |
|---|---|---|
| `getBounds()` | `ipcRenderer.invoke` | 드래그 시작 시 현재 창 위치 조회 |
| `getWorkArea()` | `ipcRenderer.invoke` | 화면 작업영역 조회 |
| `moveBy(dx, dy)` | `ipcRenderer.invoke` | WALK 중 매 tick마다 이동 요청, 결과로 새 좌표 반환 |
| `setPosition(x, y)` | `ipcRenderer.send` | 드래그 중 매 pointermove마다 절대 위치 설정 (fire-and-forget) |
| `ringBell()` / `onCalled()` | `send` / `on` | 호출벨 클릭 → NPC가 데스크로 걸어옴 (`callFlow.ts`) |
| `notifyArrived()` / `notifyCallCancelled()` | `send` | NPC 창이 도착/드래그로 취소됨을 Main에 알림 |
| `onTalkState(cb)` | `on` | 데스크 창이 대화 UI를 열고 닫을 때 상태 전달 |
| `closeTalk()` / `onResume()` | `send` / `on` | 대화창 ✕ 버튼 → NPC 자율행동 재개 |
| `quitApp()` | `send` | EXIT 확인 팝업의 "퇴근시키기" — 유일한 종료 경로 |
| `getVideoRecommendations()` | `ipcRenderer.invoke` | "영상 추천" 클릭 시 추천 영상 3개 조회 (`youtubeIpc.ts`) |
| `openVideo(url)` | `ipcRenderer.send` | 추천 영상 클릭 시 기본 브라우저로 열기 (`shell.openExternal`) |

Main(`npcWindow.ts`)이 창의 실제 x/y(`currentX`/`currentY`)를 유일하게 관리하는 소스이며, 매번
`setBounds({x, y, width, height})`로 위치와 크기를 함께 재확정합니다 (이유는 아래 Known Issues 참고).

## NPC System

- **상태**: `idle` | `walk` 두 가지만 존재 (`useNpcBehavior.ts`의 `AnimState`).
- **자율 이동**: IDLE 상태에서 3~8초(`IDLE_MIN_MS`~`IDLE_MAX_MS`) 랜덤 대기 후, 랜덤 방향으로 1.5~3.5초
  (`WALK_MIN_MS`~`WALK_MAX_MS`) 동안 WALK. 이동은 60ms(`MOVE_TICK_MS`)마다 `moveBy` IPC 호출로 처리되며
  main에서 실제 창 위치를 변경.
- **좌우 방향 전환**: `direction: -1 | 1` 상태값으로 관리. WALK 스프라이트의 기본 포즈가 오른쪽을 보고
  있으므로, `direction === -1`(왼쪽 이동)일 때만 `transform: scaleX(-1)`로 좌우 반전 (`NpcView.tsx`).
  이 값은 IDLE 상태에서도 유지되어, WALK→IDLE 전환 시 반전 상태가 갑자기 바뀌지 않음.
- **드래그**: Pointer Events(`onPointerDown/Move/Up`) + `setPointerCapture` 기반. 시작 시 `getBounds()`로
  기준 위치를 받아온 뒤, 이후 `screenX/screenY` 델타를 더해 `setPosition`으로 실시간 이동.
- **화면 경계 처리**: `npcWindow.ts`의 `clampX`/`clampY`가 `screen.getPrimaryDisplay().workArea` 기준으로
  매 이동마다 좌표를 clamp. 현재 **주 디스플레이(primary display) 기준으로만** 계산하며, 멀티 모니터
  간 이동은 고려하지 않음 (Known Issues 참고).
- **드래그 중 자율 이동 정지 / 종료 후 재개**: `pausedRef`로 드래그 중 idle 타이머·이동 인터벌을 모두
  정지. `pointerup` 시 2초(`DRAG_RESUME_DELAY_MS`) 뒤 `scheduleNextIdle()`을 다시 호출해 자율 행동 재개.
- **설정 위치**: 위 모든 수치(크기, 속도, 대기 시간, 프레임 간격 등)는 전부
  **`src/shared/npcConfig.ts`** 한 곳에 상수로 모여 있음. 현재 `SPRITE_SCALE = 0.24`이며, `WINDOW_WIDTH`
  (96)/`WINDOW_HEIGHT`(154)는 여기서 파생되어 BrowserWindow 크기와 렌더링 크기에 동시에 반영됨.

## Desk / 호출벨 / 메뉴 시스템

- 별도의 데스크 창(`deskWindow.ts`, `DeskView.tsx`)이 화면 우하단에 상시 떠 있으며, 데스크 그래픽 +
  호출벨 + EXIT 버튼으로 구성됨. NPC 창과는 별개의 BrowserWindow.
- 호출벨 클릭 → `callFlow.ts`가 NPC 창에 "호출 지점으로 걸어가라" 신호를 보냄 → 도착하면 NPC 창은
  숨기고, 데스크 창 안에 도킹된 모습으로 그려짐(데스크 그래픽이 하반신을 가려 리셉션 느낌 연출) →
  대화창(talk-menu.png 배경)이 열리고 메뉴 그리드가 표시됨.
- 메뉴 항목(`MENU_ITEMS`, `DeskView.tsx`)은 `['오늘 할 일', '영상 추천', '채용공고', '오늘의 운세', '재정', '무엇이든 물어보기']` — 이 중 **"영상 추천"만 실제로 연결되어 있고 나머지는 아직 UI 셸(클릭해도
  동작 없음)**.
- 대화창 안의 콘텐츠 영역은 `activePanel` 상태(`'menu' | 'videoRecommend'`)로 스위칭됨 — 메뉴 그리드
  자체를 다른 컴포넌트로 통째로 갈아끼우는 방식. 새 메뉴 기능을 추가할 때도 이 패턴(별도 패널
  컴포넌트를 만들고 `activePanel`에 케이스 추가)을 따를 것.
  - **콘텐츠 영역이 매우 작음(대화창 높이의 28.8%, 실측 약 75px)** — 패널을 새로 만들 때 한 줄짜리
    항목 위주로 설계할 것. 2줄짜리 카드(제목+부가정보)를 넣으려 하면 flexbox의 기본 `min-height: auto`
    shrink 동작 때문에 자식 요소 높이가 0으로 찌그러져 텍스트가 안 보이는 문제를 실제로 겪었음
    (`VideoRecommendPanel.tsx` 참고 — 제목/채널을 한 줄에 나란히 배치하는 방식으로 해결).
- 대화창을 닫으면(✕ 버튼) `activePanel`이 `'menu'`로 리셋됨 — 다음에 열 때 항상 메인 메뉴부터 시작.

## YouTube 추천 기능

메뉴의 "영상 추천"을 누르면 과거 시청 성향을 바탕으로 볼 만한 영상 3개를 추천합니다. Agent
Core/LLM/ML 없이, 설명 가능한 규칙 기반 스코어링만 사용합니다.

- **데이터 소스** (`src/main/services/youtubeHistoryStore.ts`):
  - `data/youtube/seed-watch-history.xlsx` — 사용자가 직접 준비한 과거 YouTube 시청기록 분석 결과의
    사본(`원본데이터` 시트: 날짜/시간/요일/제목/채널/채널URL/영상URL/시청일시). 원본은
    `C:\Projects\유튜브_시청기록_분석.xlsx`에 그대로 남아 있고 이 파일은 수정하지 않음.
  - `data/youtube/mealtime-watch-log.xlsx` — EVI가 직접 만들고 관리하는 축적용 파일. 파일이 없으면
    앱이 헤더만 채워 자동 생성함. **아직 여기에 실제로 데이터를 쓰는 기능(식사 시작/종료 기록)은
    구현되어 있지 않음** — `appendMealtimeWatch()` 함수만 준비되어 있고 호출하는 곳이 없음(아래
    "Not Implemented Yet" 참고).
  - 두 파일 모두 `data/`가 `.gitignore`되어 있어 커밋되지 않음(개인정보성 데이터).
  - 앱 실행 중 첫 요청 시 1회 파싱해서 메모리에 캐시(`getWatchRecords()`). `appendMealtimeWatch()`
    호출 시에만 캐시 무효화.
- **추천 로직** (`src/main/services/youtubeRecommend.ts`):
  - videoUrl 기준으로 시청 기록을 집계(`watchCount`, `mealtimeCount`, `lastWatchedAt`).
  - 점수 = `min(watchCount, 10) × recencyWeight × (1 + mealtimeCount × 1.5)` — 다시 본 횟수가 많을수록,
    최근에 볼수록, **식사 시간에 본 기록일수록** 높은 점수. 이 마지막 항이 장기 목표인 "밥 먹을 때
    보기 좋은 영상"으로 자연스럽게 발전하는 지점 — `mealtime-watch-log.xlsx`에 데이터가 쌓이기
    시작하면 코드 변경 없이 그 영상들이 점점 더 자주 추천됨.
  - 상위 20개 후보 중 가중치 랜덤 추출(같은 채널 중복은 후순위) — 매번 정확히 같은 3개가 나오지
    않도록. 순수 top-3가 아님.
  - 각 추천에 `reason`(예: "3회 다시 본 영상", "식사 시간에 즐겨 본 영상")을 붙여 왜 추천됐는지
    보여줌.
- **IPC** (`src/main/youtubeIpc.ts`): `youtube:getRecommendations` (조회), `youtube:openVideo`
  (클릭 시 `shell.openExternal`로 열기 — youtube.com/watch 형식만 허용, IPC 경계를 넘어온 URL이므로
  검증 후 실행).
- **UI**: `VideoRecommendPanel.tsx` — 대화창 콘텐츠 영역에서 메뉴 그리드를 대체. 로딩/에러/빈 상태를
  각각 처리하며, 각 행 클릭 시 해당 영상을 브라우저로 엶.

## Sprite Assets

- **원본 vs 정규화 에셋**: `assets/npc/source/`의 원본 스프라이트시트(예: `IDLE SPRITE.png`,
  `NEW WALK.png`)는 4프레임이 가로로 배치되어 있지만, 프레임마다 폭/높이/여백이 서로 다르고 캐릭터
  크기(스케일)도 시트마다 다를 수 있음(예: 이전 WALK 대비 NEW WALK는 평균 bbox 높이가 IDLE보다 약
  8.7% 큼). 이 원본을 그대로 CSS로 4등분해서 쓰면 프레임마다 캐릭터가 흔들리거나, IDLE↔WALK 전환 시
  크기가 튀는 문제가 생김.
- **정규화 방식**: 알파 채널 기준으로 각 프레임의 실제 bounding box를 픽셀 단위로 검출한 뒤,
  - 모든 시트가 공유하는 400×640 셀 캔버스(`sprite-meta.json`의 `cellWidth`/`cellHeight`)에
  - 캐릭터를 가로 중심 정렬하고,
  - 발의 baseline을 셀의 620행(`anchorY`, 하단에서 20px 여백)에 맞춰 배치.
  - 시트 간 캐릭터 크기가 다르면(WALK처럼) IDLE 평균 높이 대비 비율로 전체 프레임을 nearest-neighbor로
    축소한 뒤 동일한 방식으로 배치 (`sprite-meta.json`의 `walkSourceScale`).
  - 이 과정을 거쳐 나온 결과가 `assets/npc/idle.png`, `assets/npc/walk.png` (각 1600×640, 400×640
    셀 × 4프레임)이며, 실제 렌더링은 이 정규화 파일만 사용함.
- **픽셀아트 렌더링**: `NpcView.tsx`에서 `image-rendering: pixelated`를 사용해 확대/축소 시 흐려지지
  않도록 함.
- **현재 WALK는 NEW WALK.png 기반**: 기존 WALK 원본은 `assets/npc/source/WALK.png`로 보존되어 있으나
  더 이상 사용되지 않으며, 현재 `walk.png`는 `NEW WALK.png`(정면에 가까운 포즈)를 정규화한 것.
- **원본 비수정 원칙**: `assets/npc/source/` 및 `C:\Projects\EVI SPRITE ASSET`(프로젝트 외부 원본
  폴더)의 파일은 어떤 스크립트에서도 직접 덮어쓰지 않음. 정규화 결과만 `assets/npc/`에 별도 파일로 생성.

## Implemented

실제로 구현되어 있고, 앱을 실행해서 동작을 확인한 기능만 기재합니다.

- Electron Main/Preload/Renderer 3중 프로세스 구조 (electron-vite 기반, `contextIsolation: true`)
- 투명·frameless·always-on-top NPC 창, 작업표시줄에 노출되지 않음(`skipTaskbar`)
- 트레이 아이콘 + "EVI 종료" 메뉴
- IDLE/WALK 두 상태 스프라이트 애니메이션 (4프레임)
- 대기 후 랜덤 좌우 자율 이동, 화면 경계에서 멈춤(주 디스플레이 기준)
- 이동 방향에 따른 좌우 반전
- 마우스 드래그로 위치 이동, 드래그 중 자율 이동 정지, 종료 2초 후 재개
- 싱글 인스턴스 실행 보장
- 호출벨/EXIT/대화창(메뉴)로 구성된 데스크 씬, NPC가 호출벨에 반응해 걸어와 도킹
- 메뉴의 "영상 추천" — 시청기록(Excel) 기반 규칙형 추천 3개 표시, 클릭 시 브라우저로 열기
- `npm run dev` / `npm run build` / `npm run typecheck` 스크립트

## Not Implemented Yet

아래는 아직 코드에 존재하지 않습니다. 있는 것처럼 가정하고 참조/구현하지 마세요.

- Agent Core, Tool Registry, Tool 실행 흐름 (YouTube 추천 기능도 이 구조 없이 IPC 직결로 구현됨)
- 실제 Agent Tool (TodoTool, FortuneTool, JobTool, FinanceTool 등) — 정식 Tool Registry 기반은 아직 없음
- SQLite / 그 외 Memory·데이터 저장 계층 (YouTube 관련 데이터는 예외적으로 Excel로 관리 — 위 "YouTube 추천 기능" 참고)
- LLM 연동 (LLMService 등)
- SIT / THINK / TALK 동작 (원본 에셋만 `assets/npc/source/`에 보관 중)
- **식사 시작/종료 기록 및 그 시간대 시청 영상 자동 수집** — `appendMealtimeWatch()` 함수와
  `mealtime-watch-log.xlsx` 스키마만 준비되어 있고, 실제로 식사 시간을 감지/기록해서 이 함수를
  호출하는 기능은 없음
- 메뉴의 "영상 추천" 외 나머지 항목("오늘 할 일", "채용공고", "오늘의 운세", "재정", "무엇이든 물어보기") — 클릭해도 아무 동작 없는 UI 셸
- Windows 자동실행 및 on/off 토글
- 설정 UI / 채팅 UI
- 패키징·설치형 배포(electron-builder 등) — `out/`은 개발 빌드 산출물일 뿐, 배포용 아님
- 멀티 모니터 간 이동/경계 처리 (현재 주 디스플레이만 기준)
- 자동 테스트

## Development Principles

- EVI는 단순 NPC 앱이 아니라 최종적으로 **개인 AI Agent**(Agent Core + Tool Registry + Tool들)를
  목표로 함. NPC는 그 Agent의 시각적 표현체 중 하나.
- Agent Core와 각 Tool은 분리하고, Tool Registry 구조로 확장 (Agent Core에 `if (tool === ...)` 나열
  금지).
- LLMService/NotificationService/SchedulerService/UserContextService 등 공통 기능은 별도 Service로
  분리 예정.
- Local-first. SQLite를 향후 장기 Memory의 source of truth로 사용할 예정 (Common Memory / Domain
  Memory 구분).
- 기능을 한 번에 크게 구현하기보다 **작은 단위로 구현하고 실제로 실행해서 검증**한 뒤 다음 단계로
  진행 (이번 v0.1도 "정적 표시 → IDLE → WALK → 자율이동 → 드래그 → 트레이" 순으로 단계별 구현·검증).
- 기존에 정상 동작하는 기능은 새 작업을 하면서 불필요하게 변경하지 않는다.
- 구현되지 않은 내용을 구현된 것처럼 가정하지 않는다 — 이 문서의 "Not Implemented Yet"을 신뢰할 것.
- 과도한 추상화/설계를 피하고, 현재 1인 개인 프로젝트 규모에 맞는 최소 구조를 우선한다.

## How to Run

```
npm install
npm run dev
```

- 최초 설치 시 `electron`/`esbuild`의 postinstall 스크립트 승인이 필요할 수 있음
  (`npm approve-scripts` 또는 해당 패키지 매니저의 안내에 따름).
- `npm run typecheck` — Main/Preload용(`tsconfig.node.json`)과 Renderer용(`tsconfig.web.json`)을
  순서대로 타입체크.
- `npm run build` — electron-vite 프로덕션 빌드 (배포용 패키징은 아직 별도 설정 없음).

## Known Issues / Notes

- **Windows 파일명 대소문자 미구분**: NTFS는 파일명 대소문자를 구분하지 않으므로, `assets/npc/` 바로
  아래에 `walk.png`(정규화본)와 `WALK.png`(원본)처럼 대소문자만 다른 파일을 함께 두면 실제로는 같은
  파일로 취급되어 서로 덮어쓸 수 있음 (v0.1 작업 중 실제로 한 번 발생했던 문제). 이 때문에 원본은
  전부 `assets/npc/source/`로 분리해서 보관 중 — 새 원본 에셋을 추가할 때도 이 규칙을 유지할 것.
- **스프라이트 정규화 스크립트는 저장소에 없음**: `assets/npc/idle.png`/`walk.png`는 알파 채널 bbox
  검출 + 크기 보정 + 앵커 정렬 로직을 담은 1회성 Node 스크립트로 생성했으나, 그 스크립트 자체는
  프로젝트에 커밋되어 있지 않음 (임시 작업 공간에서 실행 후 결과물만 반영). 새 스프라이트를 추가/교체할
  때는 "Sprite Assets" 절의 방법(알파 bbox 검출 → IDLE 평균 높이 기준 스케일 보정 → 400×640 셀에 발
  baseline 620행 기준 정렬)을 다시 적용해야 하며, 반복 작업이 잦아지면 `scripts/`
  아래에 정식 스크립트로 만들어 두는 것을 고려할 것.
- **트레이 아이콘 경로는 개발 모드 기준**: `tray.ts`가 `__dirname` 기준 상대 경로로
  `assets/npc/tray-icon.png`를 읽음. 이후 electron-builder 등으로 패키징할 때 `extraResources` 설정이
  필요할 수 있음.
- **주 디스플레이만 고려**: 화면 경계 clamp, 초기 위치 계산 모두 `screen.getPrimaryDisplay()` 기준.
  멀티 모니터 환경에서 창을 다른 모니터로 드래그하면 경계 계산이 부정확할 수 있음.
- **Windows 자동실행 미구현**: 원래 기획에 있던 기능이지만 v0.1 범위에서 의도적으로 제외됨.

## Next Priorities

아래는 현재 코드 기준으로 다음에 고려할 수 있는 후보를 정리한 것이며, **이 문서 작업만으로 임의로
구현을 시작하지 않습니다.** 실제 착수는 별도 지시에 따릅니다.

- SQLite 연동 + 최소 스키마(`user_setting`, `common_code` 등)
- Agent Core / Tool Registry 뼈대 (더미 Tool 하나로 배선 검증) — YouTube 추천 기능을 이 구조로 이전하는 것도 후보
- 첫 실제 Tool로 TodoTool 구현 (외부 API/인증 불필요, 가장 단순)
- 식사 시작/종료 시간 기록 기능 + 그 시간대 시청 영상을 `appendMealtimeWatch()`로 자동 적재
  (YouTube 추천이 "밥 먹을 때 보기 좋은 영상"으로 발전하기 위한 전제조건)
- SchedulerService + NotificationService (Todo 알림이 채팅 없이 NPC를 깨우는 경로 검증)
- Windows 자동실행 on/off 토글
- THINK/TALK 상태 배선 (LLM 응답 대기/표시 시)
