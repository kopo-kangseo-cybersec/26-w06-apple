const GRID_SIZE = 20;
const GAME_DURATION = 60;

const boardElement = document.querySelector("#board");
const boardViewportElement = document.querySelector("#board-viewport");
const boardScrollElement = document.querySelector("#board-scroll");
const celebrationElement = document.querySelector("#celebration");
const scoreElement = document.querySelector("#score");
const bestScoreElement = document.querySelector("#best-score");
const timerElement = document.querySelector("#timer");
const timerCardElement = document.querySelector(".timer-card");
const messageElement = document.querySelector("#game-message");
const selectionTotalElement = document.querySelector("#selection-total");
const startButton = document.querySelector("#start-button");

let cells = [];
let score = 0;
let bestScore = 0;
let secondsLeft = GAME_DURATION;
let timerId = null;
let gameStarted = false;
let selection = [];
let pointerIsDown = false;
let selectionAnchor = null;

bestScoreElement.textContent = String(bestScore);
createBoard();
updateTimer();
updateBoardScrollRange();

function createBoard() {
  cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, () =>
    Math.floor(Math.random() * 9) + 1,
  );
  boardElement.replaceChildren();

  cells.forEach((value, index) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.index = String(index);
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", `숫자 ${value}`);
    const number = document.createElement("span");
    number.className = "cell-number";
    number.textContent = String(value);
    cell.append(number);
    boardElement.append(cell);
  });
  updateBoardScrollRange();
}

function updateBoardScrollRange() {
  const maxScroll = Math.max(0, boardViewportElement.scrollWidth - boardViewportElement.clientWidth);
  boardScrollElement.max = String(maxScroll);
  boardScrollElement.value = String(Math.min(boardViewportElement.scrollLeft, maxScroll));
  boardScrollElement.disabled = maxScroll === 0;
}

function startGame() {
  window.clearInterval(timerId);
  score = 0;
  secondsLeft = GAME_DURATION;
  gameStarted = true;
  clearSelection();
  boardViewportElement.scrollLeft = 0;
  celebrationElement.classList.remove("is-celebrating");
  celebrationElement.replaceChildren();
  createBoard();
  updateScore();
  updateTimer();
  messageElement.textContent = "사과를 드래그해 사각형 안의 합이 10의 배수가 되게 해보세요!";
  startButton.textContent = "다시 시작";
  boardElement.classList.remove("is-disabled");

  timerId = window.setInterval(() => {
    secondsLeft -= 1;
    updateTimer();

    if (secondsLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  window.clearInterval(timerId);
  timerId = null;
  gameStarted = false;
  pointerIsDown = false;
  selectionAnchor = null;
  clearSelection();
  boardElement.classList.add("is-disabled");
  const finalScore = score.toLocaleString("ko-KR");

  if (score > bestScore) {
    bestScore = score;
    bestScoreElement.textContent = bestScore.toLocaleString("ko-KR");
    celebrateNewRecord();
    messageElement.textContent = `시간 종료! ${finalScore}점으로 이번 방문 최고 기록을 세웠어요!`;
    return;
  }

  messageElement.textContent = `시간 종료! ${finalScore}점을 얻었어요.`;
}

function updateScore() {
  scoreElement.textContent = score.toLocaleString("ko-KR");
}

function celebrateNewRecord() {
  const apples = Array.from({ length: 24 }, () => {
    const apple = document.createElement("span");
    apple.className = "falling-apple";
    apple.textContent = "🍎";
    apple.style.setProperty("--apple-left", `${Math.random() * 100}%`);
    apple.style.setProperty("--fall-duration", `${2.2 + Math.random() * 1.8}s`);
    apple.style.setProperty("--fall-delay", `${Math.random() * 0.8}s`);
    return apple;
  });

  celebrationElement.replaceChildren(...apples);
  celebrationElement.classList.remove("is-celebrating");
  void celebrationElement.offsetWidth;
  celebrationElement.classList.add("is-celebrating");
  messageElement.textContent = "신기록 달성! 사과가 쏟아져요!";
}

function updateTimer() {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  timerElement.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  timerCardElement.classList.toggle("is-urgent", secondsLeft <= 10);
}

function getCellAtPoint(x, y) {
  const target = document.elementFromPoint(x, y);
  const cell = target?.closest(".cell");
  return cell && boardElement.contains(cell) ? cell : null;
}

function handlePointerDown(event) {
  if (!gameStarted || event.button !== 0) {
    return;
  }

  const cell = event.target.closest(".cell");
  if (!cell || !boardElement.contains(cell) || cells[Number(cell.dataset.index)] === null) {
    return;
  }

  event.preventDefault();
  pointerIsDown = true;
  selectionAnchor = Number(cell.dataset.index);
  selection = getRectangleSelection(selectionAnchor, selectionAnchor);
  renderSelection();
}

function handlePointerMove(event) {
  if (!pointerIsDown || !gameStarted) {
    return;
  }

  const cell = getCellAtPoint(event.clientX, event.clientY);
  if (cell) {
    selection = getRectangleSelection(selectionAnchor, Number(cell.dataset.index));
    renderSelection();
  }
}

function getRectangleSelection(firstIndex, secondIndex) {
  const firstRow = Math.floor(firstIndex / GRID_SIZE);
  const firstColumn = firstIndex % GRID_SIZE;
  const secondRow = Math.floor(secondIndex / GRID_SIZE);
  const secondColumn = secondIndex % GRID_SIZE;
  const top = Math.min(firstRow, secondRow);
  const bottom = Math.max(firstRow, secondRow);
  const left = Math.min(firstColumn, secondColumn);
  const right = Math.max(firstColumn, secondColumn);
  const rectangle = [];

  for (let row = top; row <= bottom; row += 1) {
    for (let column = left; column <= right; column += 1) {
      rectangle.push(row * GRID_SIZE + column);
    }
  }

  return rectangle;
}

function renderSelection() {
  const selectedCells = selection.filter((index) => cells[index] !== null);
  const total = selectedCells.reduce((sum, index) => sum + cells[index], 0);
  const isValid = selectedCells.length > 1 && total % 10 === 0;
  const selectedSet = new Set(selection);

  boardElement.querySelectorAll(".cell").forEach((cell) => {
    const index = Number(cell.dataset.index);
    cell.classList.toggle("is-selected", selectedSet.has(index));
    cell.classList.toggle("is-valid", isValid && selectedSet.has(index));
  });

  selectionTotalElement.textContent = selectedCells.length > 0 ? `합계 ${total}` : "";
}

function clearSelection() {
  selection = [];
  selectionTotalElement.textContent = "";
  boardElement.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.remove("is-selected", "is-valid");
  });
}

function finishSelection() {
  if (!pointerIsDown) {
    return;
  }

  pointerIsDown = false;
  selectionAnchor = null;
  const selectedCells = selection.filter((index) => cells[index] !== null);
  if (!gameStarted || selectedCells.length < 2) {
    clearSelection();
    return;
  }

  const total = selectedCells.reduce((sum, index) => sum + cells[index], 0);
  if (total % 10 !== 0) {
    clearSelection();
    messageElement.textContent = `사각형 안의 합 ${total}은 10의 배수가 아니에요.`;
    return;
  }

  selectedCells.forEach((index) => {
    cells[index] = null;
  });

  score += total;
  updateScore();
  clearSelection();
  dropApples();
  messageElement.textContent = `${total}점을 얻었어요! 사과가 아래로 내려옵니다.`;
}

function dropApples() {
  const nextCells = Array(GRID_SIZE * GRID_SIZE);
  const movements = [];

  for (let column = 0; column < GRID_SIZE; column += 1) {
    let destinationRow = GRID_SIZE - 1;

    for (let sourceRow = GRID_SIZE - 1; sourceRow >= 0; sourceRow -= 1) {
      const sourceIndex = sourceRow * GRID_SIZE + column;
      const value = cells[sourceIndex];
      if (value === null) {
        continue;
      }

      const destinationIndex = destinationRow * GRID_SIZE + column;
      nextCells[destinationIndex] = value;
      movements.push({ destinationIndex, distance: destinationRow - sourceRow });
      destinationRow -= 1;
    }

    for (; destinationRow >= 0; destinationRow -= 1) {
      const destinationIndex = destinationRow * GRID_SIZE + column;
      nextCells[destinationIndex] = Math.floor(Math.random() * 9) + 1;
      movements.push({ destinationIndex, distance: destinationRow + 1 });
    }
  }

  cells = nextCells;
  cells.forEach((value, index) => {
    const cell = boardElement.children[index];
    cell.querySelector(".cell-number").textContent = String(value);
    cell.classList.remove("is-empty", "is-selected", "is-valid");
    cell.setAttribute("aria-label", `숫자 ${value}`);
  });

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const rowGap = Number.parseFloat(getComputedStyle(boardElement).rowGap) || 0;
  const cellHeight = boardElement.children[0].getBoundingClientRect().height;
  const rowHeight = cellHeight + rowGap;

  movements.forEach(({ destinationIndex, distance }) => {
    if (distance === 0) {
      return;
    }

    boardElement.children[destinationIndex].animate(
      [
        { transform: `translateY(${-distance * rowHeight}px)` },
        { transform: "translateY(0)" },
      ],
      {
        duration: Math.min(560, 200 + distance * 24),
        easing: "cubic-bezier(0.2, 0.7, 0.35, 1)",
      },
    );
  });
}

startButton.addEventListener("click", startGame);
boardElement.addEventListener("pointerdown", handlePointerDown);
window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerup", finishSelection);
window.addEventListener("pointercancel", finishSelection);
boardScrollElement.addEventListener("input", () => {
  boardViewportElement.scrollLeft = Number(boardScrollElement.value);
});
boardViewportElement.addEventListener("scroll", () => {
  boardScrollElement.value = String(boardViewportElement.scrollLeft);
});
window.addEventListener("resize", updateBoardScrollRange);
