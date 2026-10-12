const BOARD_SIZE = 8;
const GAME_DURATION = 60;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

const boardElement = document.querySelector('#board');
const scoreElement = document.querySelector('#score');
const bestScoreElement = document.querySelector('#best-score');
const timerElement = document.querySelector('#timer');
const timerPanel = document.querySelector('#timer-panel');
const selectionSumElement = document.querySelector('#selection-sum');
const messageElement = document.querySelector('#game-message');
const startButton = document.querySelector('#start-button');
const refreshButton = document.querySelector('#refresh-button');
const stopButton = document.querySelector('#stop-button');

let cells = [];
let selectedIndices = [];
let score = 0;
let bestScore = 0;
let secondsLeft = GAME_DURATION;
let timerId = null;
let isRunning = false;
let isDragging = false;

function randomNumber() {
  return Math.floor(Math.random() * 9) + 1;
}

function createBoard() {
  cells = Array.from({ length: CELL_COUNT }, randomNumber);
  renderBoard();
}

function renderBoard() {
  const fragment = document.createDocumentFragment();

  for (let rowIndex = 0; rowIndex < BOARD_SIZE; rowIndex += 1) {
    const rowElement = document.createElement('div');
    rowElement.className = 'board-row';
    rowElement.setAttribute('role', 'row');

    for (let columnIndex = 0; columnIndex < BOARD_SIZE; columnIndex += 1) {
      const index = rowIndex * BOARD_SIZE + columnIndex;
      const value = cells[index];
      const tile = document.createElement('button');
      tile.className = `tile${value === null ? ' is-empty' : ''}`;
      tile.type = 'button';
      tile.disabled = value === null;
      tile.dataset.index = String(index);
      tile.setAttribute('role', 'gridcell');
      tile.setAttribute('aria-label', value === null
        ? `${rowIndex + 1}행 ${columnIndex + 1}열, 빈칸`
        : `${rowIndex + 1}행 ${columnIndex + 1}열, ${value}`);
      tile.textContent = value === null ? '' : String(value);
      rowElement.append(tile);
    }

    fragment.append(rowElement);
  }

  boardElement.replaceChildren(fragment);
  updateSelectionDisplay();
  boardElement.classList.toggle('is-locked', !isRunning);
}

function updateSelectionDisplay() {
  const selectedSet = new Set(selectedIndices);
  boardElement.querySelectorAll('.tile').forEach((tile) => {
    tile.classList.toggle('is-selected', selectedSet.has(Number(tile.dataset.index)));
  });

  const sum = selectedIndices.reduce((total, index) => total + (cells[index] ?? 0), 0);
  selectionSumElement.textContent = String(sum);
}

function updateScore() {
  scoreElement.textContent = String(score);
  if (score > bestScore) {
    bestScore = score;
    bestScoreElement.textContent = String(bestScore);
    celebrateNewRecord();
  }
}

function celebrateNewRecord() {
  const layer = document.createElement('div');
  const boardBounds = boardElement.getBoundingClientRect();
  const colors = ['#d85b4b', '#efaa42', '#5f8a61', '#f3d66d', '#f6eee1'];
  layer.className = 'celebration-layer';
  layer.setAttribute('aria-hidden', 'true');

  for (let index = 0; index < 72; index += 1) {
    const particle = document.createElement('span');
    const isPollen = index % 4 === 0;
    const burstSide = index % 2;
    const angle = Math.random() * Math.PI * 2;
    const distance = 70 + Math.random() * 210;
    particle.className = isPollen ? 'pollen-particle' : 'confetti-piece';
    particle.style.left = `${boardBounds.left + boardBounds.width * (burstSide ? 0.72 : 0.28)}px`;
    particle.style.top = `${boardBounds.top + boardBounds.height * 0.36}px`;
    particle.style.setProperty('--drift-x', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--drift-y', `${Math.sin(angle) * distance}px`);
    particle.style.setProperty('--spin', `${Math.floor(Math.random() * 900) - 450}deg`);
    particle.style.setProperty('--particle-color', colors[Math.floor(Math.random() * colors.length)]);
    particle.style.animationDelay = `${Math.random() * 180}ms`;
    layer.append(particle);
  }

  document.body.append(layer);
  window.setTimeout(() => layer.remove(), 2300);
}

function setMessage(message, tone = '') {
  messageElement.textContent = message;
  messageElement.className = `game-message${tone ? ` is-${tone}` : ''}`;
}

function setTimer(value) {
  secondsLeft = value;
  timerElement.textContent = String(secondsLeft);
  timerPanel.classList.toggle('is-urgent', secondsLeft <= 10);
}

function clearSelection() {
  selectedIndices = [];
  updateSelectionDisplay();
}

function startGame() {
  window.clearInterval(timerId);
  isDragging = false;
  isRunning = true;
  score = 0;
  setTimer(GAME_DURATION);
  scoreElement.textContent = '0';
  clearSelection();
  createBoard();
  refreshButton.disabled = false;
  stopButton.disabled = false;
  startButton.querySelector('span:last-child').textContent = '다시 시작';
  setMessage('숫자를 이어 합을 10의 배수로 만드세요.');

  timerId = window.setInterval(() => {
    setTimer(secondsLeft - 1);
    if (secondsLeft <= 0) {
      endGame(`시간 종료! ${score}점을 얻었습니다. 다시 도전해보세요.`);
    }
  }, 1000);
}

function endGame(message) {
  window.clearInterval(timerId);
  timerId = null;
  isRunning = false;
  isDragging = false;
  clearSelection();
  boardElement.classList.add('is-locked');
  refreshButton.disabled = true;
  stopButton.disabled = true;
  setMessage(message, 'success');
}

function stopGame() {
  if (!isRunning) return;
  endGame(`게임을 중지했습니다. ${score}점을 기록했어요.`);
}

function refreshBoard() {
  if (!isRunning) return;
  isDragging = false;
  clearSelection();
  createBoard();
  setMessage('숫자판을 새로 섞었습니다.');
}

function collapseColumns() {
  for (let column = 0; column < BOARD_SIZE; column += 1) {
    let writeRow = BOARD_SIZE - 1;

    for (let readRow = BOARD_SIZE - 1; readRow >= 0; readRow -= 1) {
      const value = cells[readRow * BOARD_SIZE + column];
      if (value !== null) {
        cells[writeRow * BOARD_SIZE + column] = value;
        writeRow -= 1;
      }
    }

    while (writeRow >= 0) {
      cells[writeRow * BOARD_SIZE + column] = randomNumber();
      writeRow -= 1;
    }
  }
}

function getTileAtPoint(clientX, clientY) {
  const element = document.elementFromPoint(clientX, clientY);
  const tile = element?.closest('.tile');
  return tile && boardElement.contains(tile) ? tile : null;
}

function addTileToPath(tile) {
  if (!tile || !isRunning || !isDragging) return;

  const nextIndex = Number(tile.dataset.index);
  if (cells[nextIndex] === null) return;
  const existingPosition = selectedIndices.indexOf(nextIndex);
  if (selectedIndices.length > 0 && existingPosition === selectedIndices.length - 1) return;

  if (existingPosition >= 0) {
    selectedIndices = selectedIndices.slice(0, existingPosition + 1);
    updateSelectionDisplay();
    return;
  }

  if (selectedIndices.length > 0) {
    const previousIndex = selectedIndices[selectedIndices.length - 1];
    const rowDistance = Math.abs(Math.floor(previousIndex / BOARD_SIZE) - Math.floor(nextIndex / BOARD_SIZE));
    const columnDistance = Math.abs((previousIndex % BOARD_SIZE) - (nextIndex % BOARD_SIZE));
    if (rowDistance > 1 || columnDistance > 1) return;
  }

  selectedIndices.push(nextIndex);
  updateSelectionDisplay();
}

function resolveSelection() {
  const sum = selectedIndices.reduce((total, index) => total + cells[index], 0);
  if (selectedIndices.length > 0 && sum > 0 && sum % 10 === 0) {
    const pointsEarned = selectedIndices.length;
    for (const index of selectedIndices) cells[index] = null;
    score += pointsEarned;
    updateScore();
    selectedIndices = [];
    collapseColumns();
    setMessage(`${sum} 완성! ${pointsEarned}점을 얻었습니다.`, 'success');
    renderBoard();
    return;
  }

  if (selectedIndices.length > 1) {
    setMessage(`${sum}은 10의 배수가 아니에요.`, 'error');
  }
  clearSelection();
}

boardElement.addEventListener('pointerdown', (event) => {
  const tile = event.target.closest('.tile');
  if (!isRunning || !tile || event.button !== 0) return;
  event.preventDefault();
  isDragging = true;
  selectedIndices = [];
  addTileToPath(tile);
});

document.addEventListener('pointermove', (event) => {
  if (!isDragging) return;
  addTileToPath(getTileAtPoint(event.clientX, event.clientY));
});

document.addEventListener('pointerup', () => {
  if (!isDragging) return;
  isDragging = false;
  resolveSelection();
});

document.addEventListener('pointercancel', () => {
  if (!isDragging) return;
  isDragging = false;
  clearSelection();
});

startButton.addEventListener('click', startGame);
refreshButton.addEventListener('click', refreshBoard);
stopButton.addEventListener('click', stopGame);

cells = Array(CELL_COUNT).fill(null);
renderBoard();
bestScoreElement.textContent = String(bestScore);