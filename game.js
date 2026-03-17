// BlockDrop - Game Logic

const COLS = 10;
const ROWS = 20;
const CELL_SIZE = 30;
const DROP_INTERVAL = 500;
const PREVIEW_SIZE = 22;

const SHAPES = {
  I: [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
    [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
  ],
  O: [
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
  ],
  T: [
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 1, 0], [0, 1, 0]],
  ],
  S: [
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
    [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
    [[1, 0, 0], [1, 1, 0], [0, 1, 0]],
  ],
  Z: [
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
    [[0, 1, 0], [1, 1, 0], [1, 0, 0]],
  ],
  J: [
    [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
    [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
  ],
  L: [
    [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
    [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
    [[1, 1, 0], [0, 1, 0], [0, 1, 0]],
  ],
};

const COLORS = {
  I: '#00f5ff',
  O: '#ffeb3b',
  T: '#9c27b0',
  S: '#4caf50',
  Z: '#f44336',
  J: '#2196f3',
  L: '#ff9800',
};

const SHAPE_NAMES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

let canvas, ctx, holdCanvas, holdCtx, nextCanvas, nextCtx;
let board;
let currentPiece;
let nextPiece;
let holdPiece;
let canHold;
let score;
let lines;
let level;
let gameOver;
let paused;
let dropTimer;
let gameStarted = false;

function init() {
  gameStarted = true;
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  holdCanvas = document.getElementById('hold-canvas');
  holdCtx = holdCanvas.getContext('2d');
  nextCanvas = document.getElementById('next-canvas');
  nextCtx = nextCanvas.getContext('2d');

  board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
  score = 0;
  lines = 0;
  level = 1;
  gameOver = false;
  paused = false;
  holdPiece = null;
  canHold = true;

  document.getElementById('score').textContent = '0';
  document.getElementById('level').textContent = '1';
  document.getElementById('lines').textContent = '0';
  document.getElementById('game-over').classList.add('hidden');
  document.getElementById('pause-overlay').classList.add('hidden');
  document.getElementById('start-overlay').classList.add('hidden');

  nextPiece = createRandomPiece();
  spawnPiece();

  if (dropTimer) clearInterval(dropTimer);
  dropTimer = setInterval(gameTick, DROP_INTERVAL);
  render();
}

function createRandomPiece() {
  const name = SHAPE_NAMES[Math.floor(Math.random() * SHAPE_NAMES.length)];
  return { name, shape: SHAPES[name][0] };
}

function spawnPiece() {
  const piece = nextPiece;
  nextPiece = createRandomPiece();

  const shape = piece.shape;
  const col = Math.floor((COLS - shape[0].length) / 2);
  currentPiece = {
    name: piece.name,
    shape: [...shape.map(r => [...r])],
    row: 0,
    col,
    rotation: 0,
  };
  canHold = true;

  if (collides(currentPiece)) {
    gameOver = true;
    clearInterval(dropTimer);
    document.getElementById('game-over').classList.remove('hidden');
  }
  renderNext();
  renderHold();
}

function collides(piece) {
  const { shape, row, col } = piece;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        const newRow = row + r;
        const newCol = col + c;
        if (newRow < 0 || newRow >= ROWS || newCol < 0 || newCol >= COLS) return true;
        if (board[newRow][newCol]) return true;
      }
    }
  }
  return false;
}

function movePiece(dr, dc) {
  if (gameOver || paused) return false;
  const moved = { ...currentPiece, row: currentPiece.row + dr, col: currentPiece.col + dc };
  if (!collides(moved)) {
    currentPiece = moved;
    render();
    return true;
  }
  return false;
}

function rotatePiece() {
  if (gameOver || paused) return;
  const nextRotation = (currentPiece.rotation + 1) % 4;
  const shape = SHAPES[currentPiece.name][nextRotation];
  const rotated = { ...currentPiece, shape, rotation: nextRotation };
  if (!collides(rotated)) {
    currentPiece = rotated;
    render();
  }
}

function doHold() {
  if (gameOver || paused || !canHold) return;
  const name = currentPiece.name;
  const shape = SHAPES[name][0];

  if (holdPiece) {
    currentPiece = {
      name: holdPiece.name,
      shape: SHAPES[holdPiece.name][0].map(r => [...r]),
      row: 0,
      col: Math.floor((COLS - SHAPES[holdPiece.name][0][0].length) / 2),
      rotation: 0,
    };
    holdPiece = { name, shape };
  } else {
    holdPiece = { name, shape };
    spawnPiece();
    return;
  }
  holdPiece = { name, shape };
  canHold = false;
  render();
  renderHold();
  renderNext();
}

function lockPiece() {
  const { shape, row, col, name } = currentPiece;
  const color = COLORS[name];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        const boardRow = row + r;
        const boardCol = col + c;
        if (boardRow >= 0) board[boardRow][boardCol] = color;
      }
    }
  }
  clearLines();
  spawnPiece();
  render();
}

function clearLines() {
  let linesCleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((cell) => cell !== 0)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(0));
      linesCleared++;
      r++;
    }
  }
  if (linesCleared > 0) {
    lines += linesCleared;
    level = Math.floor(lines / 10) + 1;
    score += linesCleared * 100 * level;
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
  }
}

function gameTick() {
  if (gameOver || paused) return;
  if (!movePiece(1, 0)) lockPiece();
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (paused) {
    document.getElementById('pause-overlay').classList.remove('hidden');
  } else {
    document.getElementById('pause-overlay').classList.add('hidden');
  }
  render();
}

function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (paused) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) drawCell(ctx, c, r, board[r][c], CELL_SIZE);
    }
  }

  if (currentPiece) {
    const { shape, row, col, name } = currentPiece;
    const color = COLORS[name];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) drawCell(ctx, col + c, row + r, color, CELL_SIZE);
      }
    }
  }
}

function renderHold() {
  holdCtx.fillStyle = '#0a0a0a';
  holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
  if (holdPiece) {
    const { name, shape } = holdPiece;
    const color = COLORS[name];
    const offsetX = (holdCanvas.width - shape[0].length * PREVIEW_SIZE) / 2 / PREVIEW_SIZE;
    const offsetY = (holdCanvas.height - shape.length * PREVIEW_SIZE) / 2 / PREVIEW_SIZE;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) drawCell(holdCtx, offsetX + c, offsetY + r, color, PREVIEW_SIZE);
      }
    }
  }
}

function renderNext() {
  nextCtx.fillStyle = '#0a0a0a';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (nextPiece) {
    const { name, shape } = nextPiece;
    const color = COLORS[name];
    const offsetX = (nextCanvas.width - shape[0].length * PREVIEW_SIZE) / 2 / PREVIEW_SIZE;
    const offsetY = (nextCanvas.height - shape.length * PREVIEW_SIZE) / 2 / PREVIEW_SIZE;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) drawCell(nextCtx, offsetX + c, offsetY + r, color, PREVIEW_SIZE);
      }
    }
  }
}

function drawCell(ctx, col, row, color, size) {
  const padding = 1;
  ctx.fillStyle = color;
  ctx.fillRect(
    col * size + padding,
    row * size + padding,
    size - padding * 2,
    size - padding * 2
  );
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (gameOver) init();
    else togglePause();
    return;
  }
  if (e.key === 'c' || e.key === 'C') {
    e.preventDefault();
    doHold();
    return;
  }
  if (gameOver || paused) return;
  switch (e.key) {
    case 'ArrowLeft': e.preventDefault(); movePiece(0, -1); break;
    case 'ArrowRight': e.preventDefault(); movePiece(0, 1); break;
    case 'ArrowDown': e.preventDefault(); movePiece(1, 0); break;
    case 'ArrowUp':
    case ' ': e.preventDefault(); rotatePiece(); break;
  }
});

document.getElementById('restart-btn').addEventListener('click', init);
document.getElementById('pause-btn').addEventListener('click', togglePause);
document.getElementById('resume-btn').addEventListener('click', togglePause);
document.getElementById('quit-btn').addEventListener('click', () => {
  paused = false;
  document.getElementById('pause-overlay').classList.add('hidden');
  init();
});
document.getElementById('how-to-play-btn').addEventListener('click', () => {
  document.getElementById('how-to-play-modal').classList.remove('hidden');
});
document.getElementById('close-modal-btn').addEventListener('click', () => {
  document.getElementById('how-to-play-modal').classList.add('hidden');
});

document.getElementById('play-btn').addEventListener('click', () => {
  document.getElementById('start-overlay').classList.add('hidden');
  init();
});

document.querySelectorAll('.touch-btn').forEach((btn) => {
  const action = btn.getAttribute('data-action');
  const handler = (e) => {
    e.preventDefault();
    if (!gameStarted || gameOver || paused) return;
    switch (action) {
      case 'left': movePiece(0, -1); break;
      case 'right': movePiece(0, 1); break;
      case 'rotate': rotatePiece(); break;
      case 'down': movePiece(1, 0); break;
    }
  };
  btn.addEventListener('click', handler);
  btn.addEventListener('touchstart', handler, { passive: false });
});
