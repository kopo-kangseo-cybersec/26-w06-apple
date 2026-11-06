const ROWS = 8;
const COLS = 8;
const TIME_LIMIT = 60;
const BEST_KEY = 'multiple-of-ten-best';

const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const timeEl = document.getElementById('time');
const sumEl = document.getElementById('sum');
const overlayEl = document.getElementById('overlay');
const confettiEl = document.getElementById('confetti');

let board = [];
let cells = [];
let score = 0;
let best = Number(localStorage.getItem(BEST_KEY)) || 0;
let timeLeft = TIME_LIMIT;
let timerId = null;
let playing = false;
let start = null;
let current = null;

function randomApple() {
  return 1 + Math.floor(Math.random() * 9);
}

function init() {
  board = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, randomApple)
  );
  score = 0;
  timeLeft = TIME_LIMIT;
  playing = false;
  start = current = null;
  renderBoard();
  updateStatus();
  clearInterval(timerId);
}

function startGame() {
  board = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, randomApple)
  );
  score = 0;
  timeLeft = TIME_LIMIT;
  playing = true;
  start = current = null;
  overlayEl.classList.add('hidden');
  document.getElementById('restart').textContent = '다시 시작';
  renderBoard();
  updateStatus();
  clearInterval(timerId);
  timerId = setInterval(tick, 1000);
}

function renderBoard() {
  boardEl.innerHTML = '';
  cells = [];
  for (let r = 0; r < ROWS; r++) {
    cells.push([]);
    for (let c = 0; c < COLS; c++) {
      const el = document.createElement('div');
      el.className = 'cell';
      el.dataset.r = r;
      el.dataset.c = c;
      boardEl.appendChild(el);
      cells[r].push(el);
    }
  }
  refreshCells();
}

function refreshCells() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = board[r][c];
      cells[r][c].innerHTML = v ? `<span class="apple-icon" aria-hidden="true">🍎</span><span class="apple-value">${v}</span>` : '';
      cells[r][c].classList.toggle('empty', v === 0);
    }
  }
}

function dropApples() {
  for (let c = 0; c < COLS; c++) {
    const survivors = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c] !== 0) survivors.push(board[r][c]);
    }
    for (let r = ROWS - 1; r >= 0; r--) {
      board[r][c] = survivors[ROWS - 1 - r] ?? randomApple();
    }
  }
}

function showConfetti() {
  const colors = ['#e53935', '#f9a825', '#43a047', '#29b6f6', '#ec407a'];
  confettiEl.replaceChildren();
  for (let i = 0; i < 72; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.setProperty('--drift', `${Math.random() * 180 - 90}px`);
    piece.style.setProperty('--duration', `${2 + Math.random() * 2}s`);
    piece.style.backgroundColor = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.6}s`;
    confettiEl.appendChild(piece);
  }
  window.setTimeout(() => confettiEl.replaceChildren(), 5000);
}

function updateStatus() {
  scoreEl.textContent = score;
  bestEl.textContent = best;
  timeEl.textContent = timeLeft;
}

function tick() {
  timeLeft--;
  updateStatus();
  if (timeLeft <= 0) endGame();
}

function endGame() {
  playing = false;
  clearInterval(timerId);
  start = current = null;
  clearSelection();
  document.getElementById('final-score').textContent = score;
  document.getElementById('final-best').textContent = best;
  overlayEl.classList.remove('hidden');
}

function getRect() {
  return {
    r1: Math.min(start.r, current.r),
    r2: Math.max(start.r, current.r),
    c1: Math.min(start.c, current.c),
    c2: Math.max(start.c, current.c),
  };
}

function clearSelection() {
  cells.flat().forEach((el) => el.classList.remove('selected', 'match'));
  sumEl.textContent = 0;
}

function updateSelection() {
  clearSelection();
  if (!start || !current) return;
  const { r1, r2, c1, c2 } = getRect();
  let sum = 0;
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (board[r][c] === 0) continue;
      sum += board[r][c];
      cells[r][c].classList.add('selected');
    }
  }
  sumEl.textContent = sum;
  if (sum > 0 && sum % 10 === 0) {
    cells.flat().forEach((el) => {
      if (el.classList.contains('selected')) el.classList.add('match');
    });
  }
}

function cellFromEvent(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cell');
  if (!el) return null;
  return { r: Number(el.dataset.r), c: Number(el.dataset.c) };
}

function commit() {
  const { r1, r2, c1, c2 } = getRect();
  let sum = 0;
  let count = 0;
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (board[r][c] === 0) continue;
      sum += board[r][c];
      count++;
    }
  }
  if (sum === 0 || sum % 10 !== 0) return;
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) board[r][c] = 0;
  }
  score += count;
  if (score > best) {
    best = score;
    localStorage.setItem(BEST_KEY, best);
    showConfetti();
  }
  dropApples();
  refreshCells();
  updateStatus();
}

boardEl.addEventListener('pointerdown', (e) => {
  if (!playing) return;
  const pos = cellFromEvent(e);
  if (!pos) return;
  start = current = pos;
  boardEl.setPointerCapture(e.pointerId);
  updateSelection();
});

boardEl.addEventListener('pointermove', (e) => {
  if (!start) return;
  const pos = cellFromEvent(e);
  if (!pos) return;
  current = pos;
  updateSelection();
});

boardEl.addEventListener('pointerup', () => {
  if (!start) return;
  if (playing) commit();
  start = current = null;
  clearSelection();
});

boardEl.addEventListener('pointercancel', () => {
  start = current = null;
  clearSelection();
});

document.getElementById('restart').addEventListener('click', startGame);
document.getElementById('overlay-restart').addEventListener('click', startGame);

init();
