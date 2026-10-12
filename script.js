const BOARD_SIZE = 8;
const ROUND_SECONDS = 60;
const BEST_SCORE_KEY = 'apple-game-best-score';

const boardElement = document.querySelector('#game-board');
const timerElement = document.querySelector('#timer');
const timerTrack = document.querySelector('.timer-track');
const timerProgress = document.querySelector('#timer-progress');
const currentScoreElement = document.querySelector('#current-score');
const bestScoreElement = document.querySelector('#best-score');
const selectionSumElement = document.querySelector('#selection-sum');
const selectionMessageElement = document.querySelector('#selection-message');
const gameStateElement = document.querySelector('#game-state');
const startButton = document.querySelector('#start-button');
const startButtonLabel = document.querySelector('#start-button-label');
const fireworksElement = document.querySelector('#fireworks');

let cells = [];
let score = 0;
let bestScore = readBestScore();
let remainingSeconds = ROUND_SECONDS;
let gameStatus = 'ready';
let timerInterval = null;
let deadline = 0;
let selectedIndices = [];
let activePointerId = null;
let isSelecting = false;
let messageTimeout = null;
let fireworksTimeout = null;
let fireworksInterval = null;

function readBestScore() {
  try {
    const storedScore = Number(window.localStorage.getItem(BEST_SCORE_KEY));
    return Number.isFinite(storedScore) && storedScore > 0 ? storedScore : 0;
  } catch {
    return 0;
  }
}

function createBoard() {
  cells = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () =>
    Math.floor(Math.random() * 9) + 1,
  );
  renderBoard();
}

function renderBoard() {
  const fragment = document.createDocumentFragment();

  cells.forEach((value, index) => {
    const cell = document.createElement('button');
    const row = Math.floor(index / BOARD_SIZE) + 1;
    const column = (index % BOARD_SIZE) + 1;
    const isSelected = selectedIndices.includes(index);
    const isValid = isSelectionValid();

    cell.className = 'number-cell';
    cell.type = 'button';
    cell.dataset.index = String(index);
    cell.setAttribute('aria-label', `행 ${row}, 열 ${column}: ${value ?? '빈칸'}`);
    cell.disabled = gameStatus !== 'running' || value === null;

    if (value === null) {
      cell.classList.add('is-empty');
    } else {
      cell.classList.add('has-apple');
      const number = document.createElement('span');
      number.className = 'cell-value';
      number.textContent = String(value);
      cell.append(number);
    }
    if (isSelected) {
      cell.classList.add('is-selected');
      if (isValid) {
        cell.classList.add('is-valid');
      }
    }

    fragment.append(cell);
  });

  boardElement.replaceChildren(fragment);
}

function getSelectionSum() {
  return selectedIndices.reduce((sum, index) => sum + (cells[index] ?? 0), 0);
}

function isSelectionValid() {
  const sum = getSelectionSum();
  return selectedIndices.length > 0 && sum > 0 && sum % 10 === 0;
}

function updateSelectionDisplay(message, state = '') {
  const sum = getSelectionSum();
  selectionSumElement.textContent = String(sum);
  selectionMessageElement.textContent = message;
  selectionMessageElement.classList.toggle('is-valid', state === 'valid');
  selectionMessageElement.classList.toggle('is-invalid', state === 'invalid');
}

function setSelectionMessage(message, state = '') {
  window.clearTimeout(messageTimeout);
  updateSelectionDisplay(message, state);
}

function startGame() {
  window.clearInterval(timerInterval);
  window.clearInterval(fireworksInterval);
  window.clearTimeout(fireworksTimeout);
  window.clearTimeout(messageTimeout);
  fireworksElement.replaceChildren();
  fireworksInterval = null;
  fireworksTimeout = null;
  score = 0;
  remainingSeconds = ROUND_SECONDS;
  selectedIndices = [];
  gameStatus = 'running';
  deadline = Date.now() + ROUND_SECONDS * 1000;

  createBoard();
  updateScoreDisplay();
  updateTimerDisplay();
  updateSelectionDisplay('이웃한 숫자를 이어 보세요');
  gameStateElement.textContent = '진행 중';
  gameStateElement.classList.remove('is-ended');
  startButtonLabel.textContent = '다시 시작';

  timerInterval = window.setInterval(updateTimer, 100);
}

function updateTimer() {
  remainingSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  updateTimerDisplay();

  if (remainingSeconds === 0) {
    endGame();
  }
}

function updateTimerDisplay() {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  timerElement.setAttribute('aria-label', `남은 시간 ${minutes}분 ${seconds}초`);
  timerTrack.setAttribute('aria-valuenow', String(remainingSeconds));
  timerProgress.style.transform = `scaleX(${remainingSeconds / ROUND_SECONDS})`;
  timerProgress.classList.toggle('is-low', remainingSeconds <= 10);
}

function endGame() {
  window.clearInterval(timerInterval);
  timerInterval = null;
  gameStatus = 'ended';
  isSelecting = false;
  activePointerId = null;
  selectedIndices = [];
  renderBoard();
  gameStateElement.textContent = '시간 종료';
  gameStateElement.classList.add('is-ended');
  updateSelectionDisplay(`최종 점수 ${score}점`);
  showFireworks();
}

function updateScoreDisplay() {
  currentScoreElement.textContent = String(score);

  if (score > bestScore) {
    bestScore = score;
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    } catch {
      // The current score remains playable when browser storage is unavailable.
    }
  }

  bestScoreElement.textContent = String(bestScore);
}

function showFireworks() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const colors = ['#bd4b3f', '#efcb67', '#38785a', '#df8655', '#7b9bca'];
  const launchBurst = () => {
    const fragment = document.createDocumentFragment();
    const centerX = 12 + Math.random() * 76;
    const centerY = 18 + Math.random() * 58;

    for (let index = 0; index < 36; index += 1) {
      const particle = document.createElement('span');
      particle.className = 'firework-particle';
      particle.style.setProperty('--spark-x', `${centerX}%`);
      particle.style.setProperty('--spark-y', `${centerY}%`);
      particle.style.setProperty('--spark-angle', `${(360 / 36) * index}deg`);
      particle.style.setProperty('--spark-distance', `${50 + Math.random() * 130}px`);
      particle.style.setProperty('--spark-color', colors[index % colors.length]);
      particle.addEventListener('animationend', () => particle.remove(), { once: true });
      fragment.append(particle);
    }

    fireworksElement.append(fragment);
  };

  window.clearInterval(fireworksInterval);
  window.clearTimeout(fireworksTimeout);
  fireworksElement.replaceChildren();
  launchBurst();
  fireworksInterval = window.setInterval(launchBurst, 550);
  fireworksTimeout = window.setTimeout(() => {
    window.clearInterval(fireworksInterval);
    fireworksInterval = null;
    fireworksTimeout = null;
    fireworksElement.replaceChildren();
  }, 5000);
}

function getCellFromPoint(x, y) {
  const element = document.elementFromPoint(x, y);
  const cell = element?.closest('.number-cell');
  return cell && boardElement.contains(cell) ? Number(cell.dataset.index) : null;
}

function addCellToSelection(index) {
  if (index === null || !Number.isInteger(index) || cells[index] === null) {
    return;
  }

  if (selectedIndices.includes(index)) {
    return;
  }

  const previousIndex = selectedIndices.at(-1);
  if (previousIndex !== undefined && !areAdjacent(previousIndex, index)) {
    return;
  }

  selectedIndices.push(index);
  setSelectionMessage(getSelectionHint());
  renderBoard();
}

function areAdjacent(firstIndex, secondIndex) {
  const rowDistance = Math.abs(Math.floor(firstIndex / BOARD_SIZE) - Math.floor(secondIndex / BOARD_SIZE));
  const columnDistance = Math.abs((firstIndex % BOARD_SIZE) - (secondIndex % BOARD_SIZE));
  return rowDistance + columnDistance === 1;
}

function dropCellsAndRefill() {
  for (let column = 0; column < BOARD_SIZE; column += 1) {
    const remainingValues = [];

    for (let row = BOARD_SIZE - 1; row >= 0; row -= 1) {
      const value = cells[row * BOARD_SIZE + column];
      if (value !== null) {
        remainingValues.push(value);
      }
    }

    for (let row = BOARD_SIZE - 1; row >= 0; row -= 1) {
      const valueIndex = BOARD_SIZE - 1 - row;
      cells[row * BOARD_SIZE + column] =
        remainingValues[valueIndex] ?? Math.floor(Math.random() * 9) + 1;
    }
  }
}

function getSelectionHint() {
  const sum = getSelectionSum();
  if (sum % 10 === 0) {
    return '놓으면 수확할 수 있어요';
  }
  return '10의 배수가 되도록 이어 보세요';
}

function clearSelection(message, state = '') {
  selectedIndices = [];
  renderBoard();
  updateSelectionDisplay(message, state);
}

function finishSelection() {
  if (!isSelecting) {
    return;
  }

  isSelecting = false;
  activePointerId = null;

  if (isSelectionValid()) {
    const earnedPoints = getSelectionSum();
    selectedIndices.forEach((index) => {
      cells[index] = null;
    });
    dropCellsAndRefill();
    score += earnedPoints;
    updateScoreDisplay();
    clearSelection(`+${earnedPoints}점 수확!`, 'valid');
    messageTimeout = window.setTimeout(() => {
      if (gameStatus === 'running') {
        updateSelectionDisplay('이웃한 숫자를 이어 보세요');
      }
    }, 1300);
    return;
  }

  if (selectedIndices.length > 0) {
    clearSelection('합이 10의 배수가 아니에요', 'invalid');
    messageTimeout = window.setTimeout(() => {
      if (gameStatus === 'running') {
        updateSelectionDisplay('이웃한 숫자를 이어 보세요');
      }
    }, 1100);
    return;
  }

  updateSelectionDisplay('이웃한 숫자를 이어 보세요');
}

boardElement.addEventListener('pointerdown', (event) => {
  if (gameStatus !== 'running' || event.button !== 0) {
    return;
  }

  const index = Number(event.target.closest('.number-cell')?.dataset.index);
  if (!Number.isInteger(index) || cells[index] === null || cells[index] === undefined) {
    return;
  }

  event.preventDefault();
  window.clearTimeout(messageTimeout);
  selectedIndices = [];
  isSelecting = true;
  activePointerId = event.pointerId;
  boardElement.setPointerCapture(event.pointerId);
  addCellToSelection(index);
});

boardElement.addEventListener('pointermove', (event) => {
  if (!isSelecting || event.pointerId !== activePointerId) {
    return;
  }

  addCellToSelection(getCellFromPoint(event.clientX, event.clientY));
});

boardElement.addEventListener('pointerup', (event) => {
  if (event.pointerId === activePointerId) {
    finishSelection();
  }
});

boardElement.addEventListener('pointercancel', (event) => {
  if (event.pointerId === activePointerId) {
    clearSelection('선택이 취소됐어요');
    isSelecting = false;
    activePointerId = null;
  }
});

startButton.addEventListener('click', startGame);
bestScoreElement.textContent = String(bestScore);
createBoard();
updateTimerDisplay();