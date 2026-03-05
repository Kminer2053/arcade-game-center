# Arcade Game Center

## 1. 프로젝트 개요 & 핵심 기능
- `arcade-game-center/index.html`에는 로비 버튼, 상태 패널(Score/High Score/Next Goal), 공유 `<canvas>`와 모바일 컨트롤 영역이 포함되어 있습니다.
- `arcade-game-center/public/js/main.js`의 `GameManager`, `ScoreManager`, `GameInputController`, `games` 컬렉션이 세 게임(Snake, Tetris, 2048)을 각각 메타/상태/입력/렌더링으로 분할해 관리하며, `loop()` → `gameOver()` 흐름으로 전체 애니메이션을 제어합니다.
- 데스크톱 키보드, 터치 스와이프, 모바일 버튼 컨트롤 모두 지원하고 `ScoreManager`는 `${gameKey}_highscore` 키를 통해 로컬스토리지에 하이스코어를 저장합니다.

## 2. 세 게임 플레이 흐름 / 목표 / 점수 획득
### 2.1 Snake
- 목표: 벽/자기 몸통에 닿지 않도록 사과를 계속 먹어서 길이를 늘리고 최대 점수를 기록합니다.
- 흐름: `games.snake.init()`은 뱀 몸통 배열/음식 좌표를 생성하고 `SNAKE_SPEED_MS`마다 `update` → `draw`를 반복합니다.
- 점수: 음식 하나당 `ScoreManager.addPoints(10)` 호출.

### 2.2 Tetris
- 목표: 블록을 회전/이동시켜 가로 줄을 채우고 제거해 스택을 높게 쌓지 않습니다.
- 흐름: `games.tetris.spawnPiece()`로 랜덤 도형, `dropInterval` 주기마다 `drop()` 호출, 충돌 시 `merge()` → `sweep()` → `spawnPiece()`로 이어집니다.
- 점수: 완성 줄 수에 따라 `ScoreManager.addPoints(100 * rowCount)`이 더해지고 연속 제거시 `rowCount`가 2배 증가합니다.

### 2.3 2048
- 목표: 같은 숫자의 타일을 합쳐 2048 이상으로 만들어 점수를 올리고 움직임이 더 이상 불가능해질 때까지 플레이합니다.
- 흐름: `games["2048"].move(direction)`은 각 방향 조작에 대해 보드를 슬라이드/병합하고 새 타일을 더해 `canMove()`로 종료 여부를 판단합니다.
- 점수: 병합된 타일 값(`gained`)을 `ScoreManager.addPoints(gained)`으로 누적합니다. 더 이상 움직일 수 없으면 `GameManager.gameOver()`를 호출합니다.

## 3. 조작법 (키보드 + 모바일 버튼 + 터치)
- **키보드:** `keydown` 이벤트에서 `ArrowLeft/Right/Up/Down`은 방향 이동, 스페이스 바(` `)는 테트리스 회전(`rotate`)으로 `GameInputController.dispatch(keyMap[event.key])`를 호출합니다.
- **터치:** `canvas` `touchstart`/`touchend`에서 스와이프 시작/끝 좌표를 비교해 deltaX/Y >= 30px이면 `left/right/up/down`으로 판단해 `GameInputController.dispatch()`를 호출합니다.
- **모바일 버튼:** `renderControls(gameKey)`가 `games[gameKey].meta.controls`에 정의된 버튼(label/action)을 `mobile-controls` 영역에 주입하고 클릭시 동일한 액션을 dispatch합니다. 각 버튼은 `data-action` 속성을 통해 `GameInputController.dispatch`로 연결됩니다.
- **입력 매핑 요약:**
  | 입력 수단 | 매핑된 액션 |
  |-----------|--------------|
  | Arrow 키 | `left`, `right`, `up`, `down` |
  | Space | `rotate` (Tetris 전용) |
  | 스와이프 | `left/right/up/down` 자동 감지 |
  | 모바일 버튼 | meta.controls의 label/action에 따라 dispatch |

## 4. 점수 & 하이스코어 로직
- `ScoreManager`는 `currentGame`, `currentHighScore`, `setGame()`, `setScore()`, `addPoints()`, `recordHighScore()`, `saveHighScore()`로 구성된 싱글턴이며 `appState.score`를 갱신하고 `GameStatusPanel` UI를 동시에 업데이트합니다.
- 로컬스토리지 키: `${gameKey}_highscore` (예: `snake_highscore`, `tetris_highscore`, `2048_highscore`). `loadHighScore()`는 실패 시 0 반환, `recordHighScore()`는 현재 점수가 `currentHighScore`를 넘어설 때 `saveHighScore()`로 `localStorage`에 저장합니다.
- 예시 코드:
  ```js
  const ScoreManager = {
    getKey(game) {
      return `${game}_highscore`;
    },
    addPoints(points) {
      this.setScore(appState.score + points);
    },
    recordHighScore() {
      if (appState.score > this.currentHighScore) {
        this.currentHighScore = appState.score;
        this.saveHighScore();
        GameStatusPanel.update({ highScore: this.currentHighScore });
      }
    },
  };
  ```

## 5. 로컬 실행 방법
1. 저장소 루트에서 `arcade-game-center/index.html`을 브라우저로 열거나, 정적 서버(`npx http-server -c-1` 또는 `serve .`)를 실행합니다.
2. 브라우저에서 `http://localhost:8080`(기본 http-server) 혹은 제공된 URL로 접속합니다.
3. Lobby에서 게임을 선택하면 캔버스/버튼이 나타나며 즉시 플레이/점수 기록이 가능합니다.

## 6. 배포 & 빌드 노트
- **Vercel:** `arcade-game-center` 디렉터리를 프로젝트 루트로 지정하고 프레임워크 preset 없이 정적 사이트로 설정합니다. `index.html`이 entry point고 `public/js/main.js`를 포함합니다.
- **정적 호스팅:** Cloudflare Pages, Netlify, S3, 기타 CDN에 `arcade-game-center`을 업로드하면 됩니다. 별도 빌드 단계가 없어 `index.html`과 `public` 디렉터리를 함께 업로드하면 작동합니다.
- **주의:** 하이스코어는 브라우저별 `localStorage`에 저장되므로, 배포 후 초기화를 원한다면 브라우저 콘솔에서 `localStorage.clear()`를 실행하세요.

## 7. 디렉터리 구조 & 주요 파일
- `arcade-game-center/index.html`: 로비 UI, 상태 패널(Score/High Score/Next Goal), `<canvas>` 및 모바일 컨트롤 영역을 정의합니다.
- `arcade-game-center/public/js/main.js`: `games` 객체(각 게임의 meta/state/input), `GameManager`, `ScoreManager`, `GameInputController`, 터치/키보드 바인딩, `renderControls`, `localStorage` 하이스코어 저장 등을 포함한 핵심 스크립트입니다.
- 주요 아키텍처 개요:
  - `GameManager`: `start`, `loop`, `stop`, `gameOver`로 애니메이션 루프 및 상태 전환 조율.
  - `ScoreManager`: 점수/하이스코어 관리 및 상태 패널 동기화.
  - `GameInputController`: 입력(action)을 현재 게임 모듈의 `handleInput`으로 전달.
  - `renderControls`: `games[gameKey].meta.controls`를 받아 모바일 버튼을 렌더링하고 클릭 이벤트를 바인딩.

## 8. 기여 안내
- 컨벤션: `games` 객체에 새 게임을 추가할 때는 메타/상태/`init`/`update`/`draw`/`handleInput` 메서드 패턴을 준수하고 `meta.controls` 배열로 모바일 버튼을 정의하세요.
- 테스트: 정적 자산이고 빌드 스크립트가 없으므로 브라우저에서 직접 플레이하며 터치/키보드/버튼 동작과 `localStorage` 하이스코어 저장을 수동 확인하세요.
- 이슈/PR: 변경 전 이슈를 열어 목표와 테스트 환경을 설명하고, 별도 브랜치에서 작업한 뒤 PR을 제출하세요. `arcade-game-center` 하위 디렉터리에서 작업한다고 명시해주세요.
- 경미한 수정이라도 `games` 모듈과 `renderControls()`에 주석 혹은 메타 정보를 유지해 주세요.
