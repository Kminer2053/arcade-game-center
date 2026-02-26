const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highscore');
const gameTitleEl = document.getElementById('game-title');
const mobileControlsEl = document.getElementById('mobile-controls');
const lobby = document.getElementById('lobby');
const gameContainer = document.getElementById('game-container');

let currentGame = null;
let animationId = null;
let score = 0;
let lastTime = 0;

// High Score Management
function loadHighScore(game) {
    return localStorage.getItem(`${game}_highscore`) || 0;
}

function saveHighScore(game, currentScore) {
    const currentHigh = loadHighScore(game);
    if (currentScore > currentHigh) {
        localStorage.setItem(`${game}_highscore`, currentScore);
        highScoreEl.innerText = currentScore;
    }
}

// --- Snake Game Logic ---
let snake = [];
let food = {};
let dx = 10, dy = 0;
let changingDirection = false;

function initSnake() {
    snake = [{x: 150, y: 150}, {x: 140, y: 150}, {x: 130, y: 150}];
    dx = 10; dy = 0;
    score = 0;
    scoreEl.innerText = score;
    spawnFood();
}

function spawnFood() {
    food.x = Math.round((Math.random() * (canvas.width - 10)) / 10) * 10;
    food.y = Math.round((Math.random() * (canvas.height - 10)) / 10) * 10;
}

function updateSnake() {
    if (changingDirection) return;
    changingDirection = true;
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    snake.unshift(head);
    
    // Check food
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.innerText = score;
        spawnFood();
    } else {
        snake.pop();
    }
    
    // Check collision
    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height || hasEatenSelf()) {
        gameOver();
    }
}

function hasEatenSelf() {
    for (let i = 4; i < snake.length; i++) {
        if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) return true;
    }
    return false;
}

function drawSnake() {
    ctx.fillStyle = 'lime';
    snake.forEach(part => ctx.fillRect(part.x, part.y, 10, 10));
    ctx.fillStyle = 'red';
    ctx.fillRect(food.x, food.y, 10, 10);
}

// --- Main Loop ---
function startGame(game) {
    lobby.style.display = 'none';
    gameContainer.style.display = 'block';
    gameTitleEl.innerText = game.charAt(0).toUpperCase() + game.slice(1);
    
    score = 0;
    scoreEl.innerText = score;
    highScoreEl.innerText = loadHighScore(game);
    currentGame = game;
    
    setupControls(game);
    
    if (game === 'snake') {
        initSnake();
    }
    
    if (animationId) cancelAnimationFrame(animationId);
    lastTime = performance.now();
    loop(lastTime);
}

function loop(currentTime) {
    if (!currentGame) return;
    animationId = requestAnimationFrame(loop);
    
    const deltaTime = currentTime - lastTime;
    
    // Snake runs at ~10 fps
    if (currentGame === 'snake') {
        if (deltaTime < 100) return;
        lastTime = currentTime;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        changingDirection = false;
        updateSnake();
        if (currentGame) drawSnake(); // Check if still playing
    } else {
        // Placeholder for Tetris/2048
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '20px sans-serif';
        ctx.fillText(`${currentGame} in development...`, 40, canvas.height / 2);
    }
}

function gameOver() {
    saveHighScore(currentGame, score);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillText('GAME OVER', 90, canvas.height / 2);
    currentGame = null; // stop updates
}

function backToLobby() {
    if (animationId) cancelAnimationFrame(animationId);
    lobby.style.display = 'flex';
    gameContainer.style.display = 'none';
    if (currentGame) saveHighScore(currentGame, score);
    currentGame = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function setupControls(game) {
    mobileControlsEl.style.display = 'block';
    if (game === 'tetris') {
        mobileControlsEl.innerHTML = `
            <div>
                <button onclick="handleInput('rotate')">🔄</button>
                <button onclick="handleInput('up')">⬆️</button>
            </div>
            <div>
                <button onclick="handleInput('left')">⬅️</button>
                <button onclick="handleInput('down')">⬇️</button>
                <button onclick="handleInput('right')">➡️</button>
            </div>
        `;
    } else {
        mobileControlsEl.innerHTML = `<p style="font-size:12px; color:#aaa;">(Swipe or Arrow Keys to move)</p>`;
    }
}

function handleInput(action) {
    if (!currentGame) return;
    
    if (currentGame === 'snake' && !changingDirection) {
        if (action === 'left' && dx === 0) { dx = -10; dy = 0; }
        if (action === 'up' && dy === 0) { dx = 0; dy = -10; }
        if (action === 'right' && dx === 0) { dx = 10; dy = 0; }
        if (action === 'down' && dy === 0) { dx = 0; dy = 10; }
    }
    // Tetris and 2048 logic goes here...
}

// Input Handling (Keyboard & Swipe)
document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') handleInput('left');
    if (e.key === 'ArrowUp') handleInput('up');
    if (e.key === 'ArrowRight') handleInput('right');
    if (e.key === 'ArrowDown') handleInput('down');
});

let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', e => {
    e.preventDefault(); // Prevent scrolling
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, {passive: false});

canvas.addEventListener('touchend', e => {
    e.preventDefault();
    const dx = e.changedTouches[0].screenX - touchStartX;
    const dy = e.changedTouches[0].screenY - touchStartY;
    
    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) handleInput('right');
        else if (dx < -30) handleInput('left');
    } else {
        if (dy > 30) handleInput('down');
        else if (dy < -30) handleInput('up');
    }
}, {passive: false});
