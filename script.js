(() => {
  const SIZE = 8;
  const ROUND_SECONDS = 60;
  const BEST_SCORE_KEY = "apple-make-ten-best-score";
  const boardElement = document.querySelector("#board");
  const scoreElement = document.querySelector("#score");
  const timerElement = document.querySelector("#timer");
  const bestScoreElement = document.querySelector("#best-score");
  const statusElement = document.querySelector("#status");
  const messageElement = document.querySelector("#board-message");
  const startButton = document.querySelector("#start-button");
  const celebrationElement = document.querySelector("#celebration");

  let cells = [];
  let score = 0;
  let bestScore = readBestScore();
  let secondsLeft = ROUND_SECONDS;
  let deadline = 0;
  let timerId = null;
  let gameActive = false;
  let pointerId = null;
  let selected = [];
  let selectedTotal = 0;
  let selectionInvalid = false;
  let celebrationTimeoutId = null;

  function readBestScore() {
    try {
      return Number.parseInt(localStorage.getItem(BEST_SCORE_KEY) || "0", 10) || 0;
    } catch (error) {
      console.warn("최고 점수를 불러오지 못했습니다.", error);
      return 0;
    }
  }

  function saveBestScore() {
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    } catch (error) {
      console.warn("최고 점수를 저장하지 못했습니다.", error);
    }
  }

  function randomNumber() {
    return Math.floor(Math.random() * 9) + 1;
  }

  function renderBoard() {
    boardElement.replaceChildren();
    cells = Array.from({ length: SIZE * SIZE }, () => ({
      value: randomNumber(),
      element: document.createElement("button")
    }));

    cells.forEach((cell, index) => {
      const button = cell.element;
      const icon = document.createElement("span");
      const number = document.createElement("span");
      button.type = "button";
      button.className = "cell";
      button.dataset.index = String(index);
      icon.className = "apple-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = '<svg viewBox="0 0 48 48" focusable="false"><path fill="#df493b" d="M24 15c-4-4-14-3-17 5-4 10 3 23 11 24 3 0 4-1 6-1s4 1 7 1c8-1 15-14 11-24-3-8-13-9-18-5Z"/><path fill="#f47762" d="M11 23c1-5 5-7 9-6-4 1-6 4-7 8-1 3-1 6 0 9-3-3-4-7-2-11Z"/><path fill="none" stroke="#765039" stroke-linecap="round" stroke-width="2.5" d="M24 16c0-4 1-7 4-10"/><path fill="#5d9a4e" d="M26 10c2-6 8-7 13-5-1 6-6 9-13 7Z"/></svg>';
      number.className = "cell-number";
      number.setAttribute("aria-hidden", "true");
      button.append(icon, number);
      boardElement.append(button);
      updateCell(index);
    });
  }

  function updateCell(index) {
    const cell = cells[index];
    const button = cell.element;
    const isSelected = selected.includes(index);
    button.querySelector(".cell-number").textContent = cell.value === null ? "" : String(cell.value);
    button.disabled = !gameActive || cell.value === null;
    button.classList.toggle("empty", cell.value === null);
    button.classList.toggle("selected", isSelected);
    button.setAttribute(
      "aria-label",
      cell.value === null ? `칸 ${index + 1}, 비어 있음` : `칸 ${index + 1}, 숫자 ${cell.value}${isSelected ? ", 선택됨" : ""}`
    );
  }

  function setStatus(message, tone = "") {
    statusElement.textContent = message;
    statusElement.className = `status${tone ? ` ${tone}` : ""}`;
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  function updateTimer() {
    secondsLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    timerElement.textContent = formatTime(secondsLeft);
    timerElement.classList.toggle("timer-low", secondsLeft <= 10);
    if (secondsLeft === 0) endGame();
  }

  function clearSelection({ keepInvalid = false } = {}) {
    const previouslySelected = selected;
    selected = [];
    selectedTotal = 0;
    selectionInvalid = keepInvalid;
    previouslySelected.forEach(updateCell);
  }

  function beginSelection(index) {
    if (!gameActive || cells[index].value === null) return;
    clearSelection();
    selected = [index];
    selectedTotal = cells[index].value;
    updateCell(index);
    setStatus(`선택한 합계: ${selectedTotal}`);
  }

  function isAdjacent(first, second) {
    const rowDistance = Math.abs(Math.floor(first / SIZE) - Math.floor(second / SIZE));
    const columnDistance = Math.abs((first % SIZE) - (second % SIZE));
    return rowDistance + columnDistance === 1;
  }

  function extendSelection(index) {
    if (!gameActive || pointerId === null || selectionInvalid || selected.includes(index)) return;
    const lastIndex = selected[selected.length - 1];
    if (!isAdjacent(lastIndex, index) || cells[index].value === null) return;

    selected.push(index);
    selectedTotal += cells[index].value;
    updateCell(index);

    if (selectedTotal > 10) {
      clearSelection({ keepInvalid: true });
      setStatus("합이 10을 넘었어요. 드래그를 놓고 다시 선택해 주세요.", "warning");
    } else {
      setStatus(`선택한 합계: ${selectedTotal}${selectedTotal === 10 ? " · 놓으면 획득!" : ""}`, selectedTotal === 10 ? "success" : "");
    }
  }

  function finishSelection() {
    if (pointerId === null) return;
    pointerId = null;
    const wasInvalid = selectionInvalid;
    if (!wasInvalid && selected.length > 1 && selectedTotal === 10) {
      const cleared = [...selected];
      selected = [];
      selectedTotal = 0;
      selectionInvalid = false;
      settleColumns(cleared);
      score += cleared.length;
      scoreElement.textContent = String(score);
      if (score > bestScore) {
        bestScore = score;
        bestScoreElement.textContent = String(bestScore);
        saveBestScore();
        showCelebration();
      }
      setStatus(`${cleared.length}개의 숫자를 없앴어요!`, "success");
      return;
    }
    clearSelection();
    if (gameActive && wasInvalid) {
      setStatus("합이 10을 넘어 선택이 취소됐어요. 다시 드래그해 주세요.", "warning");
    } else if (gameActive) {
      setStatus("상하좌우로 이어진 숫자를 드래그해 합 10을 만들어 보세요.");
    }
  }

  function settleColumns(clearedIndices) {
    const cleared = new Set(clearedIndices);
    const moves = [];

    for (let column = 0; column < SIZE; column += 1) {
      const survivors = [];
      for (let row = SIZE - 1; row >= 0; row -= 1) {
        const sourceIndex = row * SIZE + column;
        if (!cleared.has(sourceIndex)) {
          survivors.push({ value: cells[sourceIndex].value, sourceRow: row });
        }
      }

      let destinationRow = SIZE - 1;
      survivors.forEach(({ value, sourceRow }) => {
        moves.push({ index: destinationRow * SIZE + column, value, sourceRow });
        destinationRow -= 1;
      });
      while (destinationRow >= 0) {
        moves.push({
          index: destinationRow * SIZE + column,
          value: randomNumber(),
          sourceRow: -1
        });
        destinationRow -= 1;
      }
    }

    moves.forEach(({ index, value }) => {
      cells[index].value = value;
      updateCell(index);
    });
    animateFallingCells(moves);
  }

  function animateFallingCells(moves) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    moves.forEach(({ index, sourceRow }) => {
      const destinationRow = Math.floor(index / SIZE);
      const distance = (destinationRow - sourceRow) * cells[index].element.offsetHeight;
      if (distance === 0) return;
      cells[index].element.animate(
        [
          { transform: `translateY(-${distance}px)` },
          { transform: "translateY(0)" }
        ],
        {
          duration: 360 + Math.min(destinationRow * 18, 120),
          delay: Math.min(destinationRow * 14, 100),
          easing: "cubic-bezier(0.2, 0.75, 0.35, 1)"
        }
      );
    });
  }

  function showCelebration() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    window.clearTimeout(celebrationTimeoutId);
    celebrationElement.replaceChildren();
    const flowers = ["✿", "❀", "🌸", "✽", "🌼"];
    const colors = ["#f08b79", "#f4bd52", "#e8a6c2", "#fff0a6", "#98bf78"];
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < 72; index += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.textContent = flowers[Math.floor(Math.random() * flowers.length)];
      piece.style.setProperty("--start-x", `${Math.random() * 100}%`);
      piece.style.setProperty("--drift", `${Math.round((Math.random() - 0.5) * 220)}px`);
      piece.style.setProperty("--spin", `${Math.round((Math.random() - 0.5) * 900)}deg`);
      piece.style.setProperty("--piece-size", `${12 + Math.random() * 15}px`);
      piece.style.setProperty("--fall-duration", `${2.1 + Math.random() * 1.8}s`);
      piece.style.setProperty("--fall-delay", `${Math.random() * 0.55}s`);
      piece.style.setProperty("--petal-color", colors[Math.floor(Math.random() * colors.length)]);
      fragment.append(piece);
    }

    celebrationElement.append(fragment);
    celebrationTimeoutId = window.setTimeout(() => celebrationElement.replaceChildren(), 4800);
  }

  function endGame() {
    if (!gameActive) return;
    gameActive = false;
    pointerId = null;
    clearSelection();
    window.clearInterval(timerId);
    timerId = null;
    cells.forEach((_, index) => updateCell(index));
    messageElement.innerHTML = `시간 종료!<br>이번 점수는 ${score}점이에요.`;
    messageElement.hidden = false;
    startButton.textContent = "다시 하기";
    setStatus(`최고 점수 ${bestScore}점에 도전해 보세요!`);
  }

  function startGame() {
    window.clearInterval(timerId);
    gameActive = true;
    pointerId = null;
    score = 0;
    secondsLeft = ROUND_SECONDS;
    deadline = Date.now() + ROUND_SECONDS * 1000;
    scoreElement.textContent = "0";
    timerElement.textContent = formatTime(secondsLeft);
    timerElement.classList.remove("timer-low");
    messageElement.hidden = true;
    startButton.textContent = "새 게임";
    renderBoard();
    setStatus("숫자를 드래그해 합이 10이 되면 놓아 주세요.");
    timerId = window.setInterval(updateTimer, 200);
  }

  boardElement.addEventListener("pointerdown", (event) => {
    if (!gameActive || event.button !== 0) return;
    const cellElement = event.target.closest(".cell");
    if (!cellElement) return;
    event.preventDefault();
    pointerId = event.pointerId;
    beginSelection(Number(cellElement.dataset.index));
  });

  document.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const cellElement = target && target.closest(".cell");
    if (cellElement) extendSelection(Number(cellElement.dataset.index));
  });

  document.addEventListener("pointerup", (event) => {
    if (event.pointerId === pointerId) finishSelection();
  });

  document.addEventListener("pointercancel", (event) => {
    if (event.pointerId === pointerId) {
      pointerId = null;
      clearSelection();
    }
  });

  startButton.addEventListener("click", startGame);
  bestScoreElement.textContent = String(bestScore);
})();
