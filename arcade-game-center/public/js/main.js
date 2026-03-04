const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highscore");
const gameTitleEl = document.getElementById("game-title");
const nextGoalEl = document.getElementById("next-goal");
const mobileControlsEl = document.getElementById("mobile-controls");
const lobby = document.getElementById("lobby");
const gameContainer = document.getElementById("game-container");

const appState = {
  currentGame: null,
  animationId: null,
  lastTime: 0,
  score: 0,
};

function resetCanvas(color = "#000") {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawCenteredText(text, y, color = "#fff", size = 20) {
  ctx.fillStyle = color;
  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, y);
  ctx.textAlign = "start";
}

const GameStatusPanel = {
  state: {
    gameName: "Game",
    score: 0,
    highScore: 0,
    nextGoal: "Select a game to begin",
  },
  update(partial) {
    Object.assign(this.state, partial);
    gameTitleEl.innerText = this.state.gameName;
    scoreEl.innerText = String(this.state.score);
    highScoreEl.innerText = String(this.state.highScore);
    nextGoalEl.innerText = this.state.nextGoal;
  },
};
GameStatusPanel.update({});

const ScoreManager = {
  currentGame: null,
  currentHighScore: 0,
  getKey(game) {
    return `${game}_highscore`;
  },
  loadHighScore(game) {
    try {
      return Number(localStorage.getItem(this.getKey(game)) || 0);
    } catch (error) {
      console.warn("localStorage unavailable", error);
      return 0;
    }
  },
  setGame(gameKey, meta) {
    this.currentGame = gameKey;
    this.currentHighScore = this.loadHighScore(gameKey);
    this.setScore(0);
    GameStatusPanel.update({
      highScore: this.currentHighScore,
      gameName: meta.displayName,
      nextGoal: meta.nextGoal,
    });
  },
  setScore(value) {
    appState.score = value;
    GameStatusPanel.update({ score: appState.score });
  },
  addPoints(points) {
    this.setScore(appState.score + points);
  },
  recordHighScore() {
    if (!this.currentGame) {
      return;
    }
    if (appState.score > this.currentHighScore) {
      this.currentHighScore = appState.score;
      this.saveHighScore();
      GameStatusPanel.update({ highScore: this.currentHighScore });
    }
  },
  saveHighScore() {
    if (!this.currentGame) {
      return;
    }
    try {
      localStorage.setItem(this.getKey(this.currentGame), String(this.currentHighScore));
    } catch (error) {
      console.warn("localStorage write failed", error);
    }
  },
};

function drawGameOverOverlay() {
  resetCanvas("rgba(0, 0, 0, 0.75)");
  drawCenteredText("GAME OVER", canvas.height / 2, "#fff", 28);
}

const SNAKE_CELL = 10;
const SNAKE_SPEED_MS = 100;
const TETRIS_COLS = 10;
const TETRIS_ROWS = 20;
const TETRIS_BLOCK = 20;
const TETRIS_OFFSET_X = 50;
const TETRIS_OFFSET_Y = 0;
const TETRIS_COLORS = [
  "#000",
  "#00f0f0",
  "#4d79ff",
  "#ff9f1a",
  "#ffd633",
  "#66ff66",
  "#bb66ff",
  "#ff5e57",
];
const TETRIS_SHAPES = [
  [[1, 1, 1, 1]],
  [[2, 0, 0], [2, 2, 2]],
  [[0, 0, 3], [3, 3, 3]],
  [[4, 4], [4, 4]],
  [[0, 5, 5], [5, 5, 0]],
  [[0, 6, 0], [6, 6, 6]],
  [[7, 7, 0], [0, 7, 7]],
];
const BOARD_SIZE = 4;
const TILE_SIZE = 60;
const TILE_GAP = 10;
const BOARD_OFFSET_X = 15;
const BOARD_OFFSET_Y = 55;

const games = {
  snake: {
    meta: {
      displayName: "Snake",
      nextGoal: "Grow longer without crashing",
      controls: [
        { label: "Left", action: "left" },
        { label: "Up", action: "up" },
        { label: "Down", action: "down" },
        { label: "Right", action: "right" },
      ],
    },
    state: {
      snake: [],
      food: { x: 0, y: 0 },
      dx: SNAKE_CELL,
      dy: 0,
      timer: 0,
      changingDirection: false,
    },
    init() {
      this.state.snake = [
        { x: 150, y: 150 },
        { x: 140, y: 150 },
        { x: 130, y: 150 },
      ];
      this.state.dx = SNAKE_CELL;
      this.state.dy = 0;
      this.state.timer = 0;
      this.state.changingDirection = false;
      this.spawnFood();
      resetCanvas();
    },
    spawnFood() {
      this.state.food = {
        x: Math.round((Math.random() * (canvas.width - 10)) / 10) * 10,
        y: Math.round((Math.random() * (canvas.height - 10)) / 10) * 10,
      };
    },
    hasEatenSelf() {
      const [head, ...body] = this.state.snake;
      return body.some((segment) => segment.x === head.x && segment.y === head.y);
    },
    update(deltaTime) {
      this.state.timer += deltaTime;
      if (this.state.timer < SNAKE_SPEED_MS) {
        return;
      }
      this.state.timer = 0;
      this.state.changingDirection = false;
      const head = {
        x: this.state.snake[0].x + this.state.dx,
        y: this.state.snake[0].y + this.state.dy,
      };
      this.state.snake.unshift(head);
      if (head.x === this.state.food.x && head.y === this.state.food.y) {
        ScoreManager.addPoints(10);
        this.spawnFood();
      } else {
        this.state.snake.pop();
      }
      if (
        head.x < 0 ||
        head.x >= canvas.width ||
        head.y < 0 ||
        head.y >= canvas.height ||
        this.hasEatenSelf()
      ) {
        GameManager.gameOver();
      }
    },
    draw() {
      resetCanvas();
      ctx.fillStyle = "#32cd32";
      this.state.snake.forEach((part) => ctx.fillRect(part.x, part.y, SNAKE_CELL, SNAKE_CELL));
      ctx.fillStyle = "#ff4d4d";
      ctx.fillRect(this.state.food.x, this.state.food.y, SNAKE_CELL, SNAKE_CELL);
    },
    handleInput(action) {
      if (this.state.changingDirection) {
        return;
      }
      this.state.changingDirection = true;
      const { dx, dy } = this.state;
      if (action === "left" && dx === 0) {
        this.state.dx = -SNAKE_CELL;
        this.state.dy = 0;
        return;
      }
      if (action === "up" && dy === 0) {
        this.state.dx = 0;
        this.state.dy = -SNAKE_CELL;
        return;
      }
      if (action === "right" && dx === 0) {
        this.state.dx = SNAKE_CELL;
        this.state.dy = 0;
        return;
      }
      if (action === "down" && dy === 0) {
        this.state.dx = 0;
        this.state.dy = SNAKE_CELL;
      }
    },
  },
  tetris: {
    meta: {
      displayName: "Tetris",
      nextGoal: "Clear rows and keep the stack balanced",
      controls: [
        { label: "Rotate", action: "rotate" },
        { label: "Left", action: "left" },
        { label: "Down", action: "down" },
        { label: "Right", action: "right" },
      ],
    },
    state: {
      arena: createMatrix(TETRIS_COLS, TETRIS_ROWS),
      piece: null,
      pos: { x: 0, y: 0 },
      dropCounter: 0,
      dropInterval: 600,
    },
    init() {
      this.state.arena = createMatrix(TETRIS_COLS, TETRIS_ROWS);
      this.state.dropCounter = 0;
      this.state.dropInterval = 600;
      this.spawnPiece();
      this.draw();
    },
    randomPiece() {
      const shape = TETRIS_SHAPES[Math.floor(Math.random() * TETRIS_SHAPES.length)];
      return shape.map((row) => row.slice());
    },
    collide() {
      const { arena, piece, pos } = this.state;
      for (let y = 0; y < piece.length; y += 1) {
        for (let x = 0; x < piece[y].length; x += 1) {
          if (
            piece[y][x] !== 0 &&
            (arena[y + pos.y] === undefined || arena[y + pos.y][x + pos.x] === undefined || arena[y + pos.y][x + pos.x] !== 0)
          ) {
            return true;
          }
        }
      }
      return false;
    },
    spawnPiece() {
      this.state.piece = this.randomPiece();
      this.state.pos.y = 0;
      this.state.pos.x = Math.floor(TETRIS_COLS / 2) - Math.ceil(this.state.piece[0].length / 2);
      if (this.collide()) {
        GameManager.gameOver();
      }
    },
    merge() {
      const { arena, piece, pos } = this.state;
      for (let y = 0; y < piece.length; y += 1) {
        for (let x = 0; x < piece[y].length; x += 1) {
          if (piece[y][x] !== 0) {
            arena[y + pos.y][x + pos.x] = piece[y][x];
          }
        }
      }
    },
    sweep() {
      let rowCount = 1;
      for (let y = this.state.arena.length - 1; y >= 0; y -= 1) {
        if (this.state.arena[y].every((value) => value !== 0)) {
          this.state.arena.splice(y, 1);
          this.state.arena.unshift(Array(TETRIS_COLS).fill(0));
          ScoreManager.addPoints(100 * rowCount);
          rowCount *= 2;
          y += 1;
        }
      }
    },
    rotateMatrix(piece, dir) {
      const rotated = piece[0].map((_, index) => piece.map((row) => row[index]));
      if (dir > 0) {
        rotated.forEach((row) => row.reverse());
      } else {
        rotated.reverse();
      }
      return rotated;
    },
    drop() {
      this.state.pos.y += 1;
      if (this.collide()) {
        this.state.pos.y -= 1;
        this.merge();
        this.sweep();
        this.spawnPiece();
      }
    },
    move(dir) {
      this.state.pos.x += dir;
      if (this.collide()) {
        this.state.pos.x -= dir;
      }
    },
    tryRotate(dir) {
      const rotated = this.rotateMatrix(this.state.piece, dir);
      const oldX = this.state.pos.x;
      let offset = 1;
      this.state.piece = rotated;
      while (this.collide()) {
        this.state.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (Math.abs(offset) > this.state.piece[0].length) {
          this.state.piece = this.rotateMatrix(rotated, -dir);
          this.state.pos.x = oldX;
          return;
        }
      }
    },
    update(deltaTime) {
      this.state.dropCounter += deltaTime;
      if (this.state.dropCounter >= this.state.dropInterval) {
        this.drop();
        this.state.dropCounter = 0;
      }
    },
    drawMatrix(matrix, offset) {
      for (let y = 0; y < matrix.length; y += 1) {
        for (let x = 0; x < matrix[y].length; x += 1) {
          const value = matrix[y][x];
          if (value !== 0) {
            ctx.fillStyle = TETRIS_COLORS[value];
            ctx.fillRect(
              TETRIS_OFFSET_X + (x + offset.x) * TETRIS_BLOCK,
              TETRIS_OFFSET_Y + (y + offset.y) * TETRIS_BLOCK,
              TETRIS_BLOCK - 1,
              TETRIS_BLOCK - 1,
            );
          }
        }
      }
    },
    draw() {
      resetCanvas("#0f0f16");
      ctx.strokeStyle = "#2a2a3a";
      ctx.lineWidth = 1;
      for (let x = 0; x <= TETRIS_COLS; x += 1) {
        ctx.beginPath();
        ctx.moveTo(TETRIS_OFFSET_X + x * TETRIS_BLOCK, TETRIS_OFFSET_Y);
        ctx.lineTo(TETRIS_OFFSET_X + x * TETRIS_BLOCK, TETRIS_OFFSET_Y + TETRIS_ROWS * TETRIS_BLOCK);
        ctx.stroke();
      }
      for (let y = 0; y <= TETRIS_ROWS; y += 1) {
        ctx.beginPath();
        ctx.moveTo(TETRIS_OFFSET_X, TETRIS_OFFSET_Y + y * TETRIS_BLOCK);
        ctx.lineTo(TETRIS_OFFSET_X + TETRIS_COLS * TETRIS_BLOCK, TETRIS_OFFSET_Y + y * TETRIS_BLOCK);
        ctx.stroke();
      }
      this.drawMatrix(this.state.arena, { x: 0, y: 0 });
      this.drawMatrix(this.state.piece, this.state.pos);
    },
    handleInput(action) {
      if (action === "rotate") {
        this.tryRotate(1);
        return;
      }
      if (action === "left") {
        this.move(-1);
        return;
      }
      if (action === "right") {
        this.move(1);
        return;
      }
      if (action === "down") {
        this.drop();
      }
    },
  },
  "2048": {
    meta: {
      displayName: "2048",
      nextGoal: "Fuse tiles to hit 2048",
      controls: [
        { label: "Up", action: "up" },
        { label: "Left", action: "left" },
        { label: "Down", action: "down" },
        { label: "Right", action: "right" },
      ],
    },
    state: {
      board: [],
    },
    init() {
      this.state.board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
      ScoreManager.setScore(0);
      this.addRandomTile();
      this.addRandomTile();
      this.draw();
    },
    addRandomTile() {
      const empty = [];
      this.state.board.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value === 0) {
            empty.push({ x, y });
          }
        });
      });
      if (empty.length === 0) {
        return;
      }
      const target = empty[Math.floor(Math.random() * empty.length)];
      this.state.board[target.y][target.x] = Math.random() < 0.9 ? 2 : 4;
    },
    slideAndMergeRowLeft(row) {
      const compact = row.filter((value) => value !== 0);
      const result = [];
      let gained = 0;
      for (let i = 0; i < compact.length; i += 1) {
        if (compact[i] === compact[i + 1]) {
          const merged = compact[i] * 2;
          result.push(merged);
          gained += merged;
          i += 1;
        } else {
          result.push(compact[i]);
        }
      }
      while (result.length < BOARD_SIZE) {
        result.push(0);
      }
      return { row: result, gained };
    },
    cloneBoard(board) {
      return board.map((row) => row.slice());
    },
    transpose(board) {
      const result = createMatrix(BOARD_SIZE, BOARD_SIZE);
      for (let y = 0; y < BOARD_SIZE; y += 1) {
        for (let x = 0; x < BOARD_SIZE; x += 1) {
          result[y][x] = board[x][y];
        }
      }
      return result;
    },
    reverseRows(board) {
      return board.map((row) => row.slice().reverse());
    },
    moveLeft(board) {
      const next = [];
      let gained = 0;
      for (let y = 0; y < BOARD_SIZE; y += 1) {
        const moved = this.slideAndMergeRowLeft(board[y]);
        next.push(moved.row);
        gained += moved.gained;
      }
      return { board: next, gained };
    },
    boardEquals(a, b) {
      for (let y = 0; y < BOARD_SIZE; y += 1) {
        for (let x = 0; x < BOARD_SIZE; x += 1) {
          if (a[y][x] !== b[y][x]) {
            return false;
          }
        }
      }
      return true;
    },
    canMove() {
      for (let y = 0; y < BOARD_SIZE; y += 1) {
        for (let x = 0; x < BOARD_SIZE; x += 1) {
          const value = this.state.board[y][x];
          if (value === 0) {
            return true;
          }
          if (x < BOARD_SIZE - 1 && value === this.state.board[y][x + 1]) {
            return true;
          }
          if (y < BOARD_SIZE - 1 && value === this.state.board[y + 1][x]) {
            return true;
          }
        }
      }
      return false;
    },
    move(direction) {
      let working = this.cloneBoard(this.state.board);
      let moved;
      if (direction === "left") {
        moved = this.moveLeft(working);
      } else if (direction === "right") {
        working = this.reverseRows(working);
        moved = this.moveLeft(working);
        moved.board = this.reverseRows(moved.board);
      } else if (direction === "up") {
        working = this.transpose(working);
        moved = this.moveLeft(working);
        moved.board = this.transpose(moved.board);
      } else {
        working = this.transpose(working);
        working = this.reverseRows(working);
        moved = this.moveLeft(working);
        moved.board = this.reverseRows(moved.board);
        moved.board = this.transpose(moved.board);
      }
      if (this.boardEquals(this.state.board, moved.board)) {
        return 0;
      }
      this.state.board = moved.board;
      ScoreManager.addPoints(moved.gained);
      this.addRandomTile();
      if (!this.canMove()) {
        GameManager.gameOver();
      }
      return moved.gained;
    },
    draw() {
      resetCanvas("#111");
      ctx.fillStyle = "#bbada0";
      ctx.fillRect(BOARD_OFFSET_X - 5, BOARD_OFFSET_Y - 5, 270, 270);
      for (let y = 0; y < BOARD_SIZE; y += 1) {
        for (let x = 0; x < BOARD_SIZE; x += 1) {
          const value = this.state.board[y][x];
          const px = BOARD_OFFSET_X + x * (TILE_SIZE + TILE_GAP);
          const py = BOARD_OFFSET_Y + y * (TILE_SIZE + TILE_GAP);
          ctx.fillStyle = getTileColor(value);
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          if (value !== 0) {
            ctx.fillStyle = value <= 4 ? "#776e65" : "#f9f6f2";
            ctx.font = value < 100 ? "28px sans-serif" : value < 1000 ? "24px sans-serif" : "18px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(String(value), px + TILE_SIZE / 2, py + TILE_SIZE / 2);
          }
        }
      }
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    },
    handleInput(action) {
      const directionMap = {
        left: "left",
        right: "right",
        up: "up",
        down: "down",
      };
      if (directionMap[action]) {
        this.move(directionMap[action]);
      }
    },
  },
};

const GameManager = {
  start(gameKey) {
    const module = games[gameKey];
    if (!module) {
      console.warn("Unknown game", gameKey);
      return;
    }
    cancelAnimationFrame(appState.animationId);
    appState.animationId = null;
    appState.currentGame = gameKey;
    ScoreManager.setGame(gameKey, module.meta);
    module.init();
    renderControls(gameKey);
    GameStatusPanel.update({ nextGoal: module.meta.nextGoal });
    appState.lastTime = performance.now();
    appState.animationId = requestAnimationFrame(GameManager.loop);
  },
  loop(currentTime) {
    if (!appState.currentGame) {
      appState.animationId = null;
      return;
    }
    const deltaTime = currentTime - appState.lastTime;
    appState.lastTime = currentTime;
    const module = games[appState.currentGame];
    if (module) {
      module.update?.(deltaTime);
      module.draw?.();
    }
    appState.animationId = requestAnimationFrame(GameManager.loop);
  },
  stop() {
    cancelAnimationFrame(appState.animationId);
    appState.animationId = null;
    appState.currentGame = null;
    mobileControlsEl.style.display = "none";
  },
  gameOver() {
    if (!appState.currentGame) {
      return;
    }
    cancelAnimationFrame(appState.animationId);
    appState.animationId = null;
    ScoreManager.recordHighScore();
    GameStatusPanel.update({ nextGoal: "Back to the lobby to restart" });
    drawGameOverOverlay();
    appState.currentGame = null;
    mobileControlsEl.style.display = "none";
  },
};

const GameInputController = {
  dispatch(action) {
    if (!appState.currentGame) {
      return;
    }
    const module = games[appState.currentGame];
    module?.handleInput?.(action);
  },
};

function renderControls(gameKey) {
  const module = games[gameKey];
  if (!module || !module.meta.controls?.length) {
    mobileControlsEl.style.display = "none";
    mobileControlsEl.innerHTML = "";
    return;
  }
  mobileControlsEl.innerHTML = module.meta.controls
    .map((control) => `<button data-action="${control.action}">${control.label}</button>`)
    .join("");
  mobileControlsEl.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      GameInputController.dispatch(button.dataset.action);
    });
  });
  mobileControlsEl.style.display = "block";
}

function startGame(gameKey) {
  lobby.style.display = "none";
  gameContainer.style.display = "block";
  GameManager.start(gameKey);
}

function backToLobby() {
  GameManager.stop();
  lobby.style.display = "flex";
  gameContainer.style.display = "none";
  resetCanvas();
  GameStatusPanel.update({ nextGoal: "Select a game to begin" });
}

let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener(
  "touchstart",
  (event) => {
    event.preventDefault();
    touchStartX = event.changedTouches[0].screenX;
    touchStartY = event.changedTouches[0].screenY;
  },
  { passive: false },
);

canvas.addEventListener(
  "touchend",
  (event) => {
    event.preventDefault();
    const deltaX = event.changedTouches[0].screenX - touchStartX;
    const deltaY = event.changedTouches[0].screenY - touchStartY;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 30) {
        GameInputController.dispatch("right");
      } else if (deltaX < -30) {
        GameInputController.dispatch("left");
      }
    } else if (deltaY > 30) {
      GameInputController.dispatch("down");
    } else if (deltaY < -30) {
      GameInputController.dispatch("up");
    }
  },
  { passive: false },
);

document.addEventListener("keydown", (event) => {
  const keyMap = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
    " ": "rotate",
  };
  if (keyMap[event.key]) {
    event.preventDefault();
    GameInputController.dispatch(keyMap[event.key]);
  }
});

function getTileColor(value) {
  const colors = {
    0: "#222",
    2: "#eee4da",
    4: "#ede0c8",
    8: "#f2b179",
    16: "#f59563",
    32: "#f67c5f",
    64: "#f65e3b",
    128: "#edcf72",
    256: "#edcc61",
    512: "#edc850",
    1024: "#edc53f",
    2048: "#edc22e",
  };
  return colors[value] || "#3c3a32";
}

function createMatrix(width, height) {
  return Array.from({ length: height }, () => Array(width).fill(0));
}
