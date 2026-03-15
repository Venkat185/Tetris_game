// BlockDrop - Game Logic

const COLS = 10;
const ROWS = 20;
const CELL_SIZE = 26;
const DROP_INTERVAL = 500;

// Tetromino shapes: [shape][rotation][y][x]
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

// Game state
let canvas, ctx;
let board;
let currentPiece;
let score;
let gameOver;
let paused;
let dropTimer;

function init() {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  board = Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(0));
  score = 0;
  gameOver = false;
  paused = false;
  document.getElementById('score').textContent = '0';
  document.getElementById('game-over').classList.add('hidden');
  spawnPiece();
  if (dropTimer) clearInterval(dropTimer);
  dropTimer = setInterval(gameTick, DROP_INTERVAL);
  render();
}

function spawnPiece() {
  const name = SHAPE_NAMES[Math.floor(Math.random() * SHAPE_NAMES.length)];
  const shape = SHAPES[name][0];
  const col = Math.floor((COLS - shape[0].length) / 2);
  currentPiece = {
    name,
    shape,
    row: 0,
    col,
    rotation: 0,
  };
  if (collides(currentPiece)) {
    gameOver = true;
    clearInterval(dropTimer);
    document.getElementById('game-over').classList.remove('hidden');
  }
}

function collides(piece) {
  const { shape, row, col } = piece;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        const newRow = row + r;
        const newCol = col + c;
        if (newRow < 0 || newRow >= ROWS || newCol < 0 || newCol >= COLS) {
          return true;
        }
        if (board[newRow][newCol]) {
          return true;
        }
      }
    }
  }
  return false;
}

function movePiece(dr, dc) {
  if (gameOver || paused) return false;
  const moved = {
    ...currentPiece,
    row: currentPiece.row + dr,
    col: currentPiece.col + dc,
  };
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
  const rotated = {
    ...currentPiece,
    shape,
    rotation: nextRotation,
  };
  if (!collides(rotated)) {
    currentPiece = rotated;
    render();
  }
}

function lockPiece() {
  const { shape, row, col, name } = currentPiece;
  const color = COLORS[name];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        const boardRow = row + r;
        const boardCol = col + c;
        if (boardRow >= 0) {
          board[boardRow][boardCol] = color;
        }
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
  score += linesCleared * 100;
  const scoreEl = document.getElementById('score');
  scoreEl.textContent = score;
  if (linesCleared > 0) {
    scoreEl.classList.remove('pulse');
    scoreEl.offsetHeight; // trigger reflow
    scoreEl.classList.add('pulse');
    setTimeout(() => scoreEl.classList.remove('pulse'), 300);
  }
}

function gameTick() {
  if (gameOver || paused) return;
  if (!movePiece(1, 0)) {
    lockPiece();
  }
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  render();
}

function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (paused) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    return;
  }

  // Draw board
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) {
        drawCell(c, r, board[r][c]);
      }
    }
  }

  // Draw current piece
  if (currentPiece) {
    const { shape, row, col, name } = currentPiece;
    const color = COLORS[name];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          drawCell(col + c, row + r, color);
        }
      }
    }
  }
}

function drawCell(col, row, color) {
  const padding = 1;
  ctx.fillStyle = color;
  ctx.fillRect(
    col * CELL_SIZE + padding,
    row * CELL_SIZE + padding,
    CELL_SIZE - padding * 2,
    CELL_SIZE - padding * 2
  );
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (gameOver) {
      init();
    } else {
      togglePause();
    }
    return;
  }
  if (gameOver || paused) return;
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      movePiece(0, -1);
      break;
    case 'ArrowRight':
      e.preventDefault();
      movePiece(0, 1);
      break;
    case 'ArrowDown':
      e.preventDefault();
      movePiece(1, 0);
      break;
    case 'ArrowUp':
    case ' ':
      e.preventDefault();
      rotatePiece();
      break;
  }
});

document.getElementById('restart-btn').addEventListener('click', init);

init();
