"use strict";

// 게임 설정
const SIZE = 6;
const TOTAL_CELLS = SIZE * SIZE;
const GAME_TIME = 60;
const POINTS_PER_APPLE = 10;
const BEST_KEY = "appleGameBestScore";

// HTML 요소
const grid = document.querySelector("#grid");
const timerDisplay = document.querySelector("#timer");
const scoreDisplay = document.querySelector("#score");
const bestDisplay = document.querySelector("#bestScore");
const timeBar = document.querySelector("#timeBar");
const message = document.querySelector("#message");
const startButton = document.querySelector("#startButton");
const endButton = document.querySelector("#endButton");

// 콘페티 캔버스
const canvas = document.querySelector("#confettiCanvas");
const ctx = canvas.getContext("2d");

// 게임 상태
let score = 0;
let bestScore = loadBestScore();
let timeLeft = GAME_TIME;
let timerId = null;

let isPlaying = false;
let isDragging = false;
let isAnimating = false;

let selectedCells = [];
let gameVersion = 0;

// 한 게임에서 최고 기록 갱신 축하를 한 번만 표시
let recordCelebrated = false;

// --------------------------------------------------
// 최고 점수 저장
// --------------------------------------------------

function loadBestScore() {
    try {
        return Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {
        return 0;
    }
}

function saveBestScore() {
    try {
        localStorage.setItem(BEST_KEY, bestScore);
    } catch {
        // 저장을 사용할 수 없어도 게임은 계속 진행
    }
}

// --------------------------------------------------
// 사과 생성 및 격자 관리
// --------------------------------------------------

// 1~9 사이의 랜덤 숫자
function randomNumber() {
    return Math.floor(Math.random() * 9) + 1;
}

// 사과 한 칸 생성
function createCell(index, value, isNew = false) {
    const cell = document.createElement("button");

    cell.type = "button";
    cell.className = "cell";
    cell.dataset.index = index;

    cell.innerHTML = `
        <span class="apple" aria-hidden="true">🍎</span>
        <span class="value"></span>
    `;

    setAppleValue(cell, value);

    // 새로 생성된 사과는 위에서 떨어지도록 준비
    if (isNew) {
        cell.classList.add("falling-new");
        cell.style.transition = "none";
        cell.style.transform =
            `translateY(-${40 + Math.random() * 70}px) scale(0.82)`;
        cell.style.opacity = "0";
    }

    return cell;
}

// 사과 숫자 변경
function setAppleValue(cell, value) {
    cell.dataset.value = value;
    cell.querySelector(".value").textContent = value;

    const index = Number(cell.dataset.index);
    const row = Math.floor(index / SIZE) + 1;
    const col = index % SIZE + 1;

    cell.setAttribute(
        "aria-label",
        `${row}행 ${col}열, 숫자 ${value}인 사과`
    );
}

// 6x6 격자 만들기
function createGrid() {
    grid.innerHTML = "";

    for (let i = 0; i < TOTAL_CELLS; i++) {
        grid.appendChild(createCell(i, randomNumber()));
    }
}

// --------------------------------------------------
// 점수 및 타이머
// --------------------------------------------------

function updateScore() {
    scoreDisplay.textContent = score;
    bestDisplay.textContent = bestScore;
}

function updateTimer() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    timerDisplay.textContent =
        `${String(minutes).padStart(2, "0")}:` +
        `${String(seconds).padStart(2, "0")}`;

    timeBar.style.width =
        `${(timeLeft / GAME_TIME) * 100}%`;

    timeBar.classList.toggle("urgent", timeLeft <= 10);
}

function showMessage(text, warning = false) {
    message.textContent = text;
    message.classList.toggle("warning", warning);
}

// --------------------------------------------------
// 드래그 선택
// --------------------------------------------------

// 선택한 사과 모두 해제
function clearSelection() {
    selectedCells.forEach(cell => {
        cell.classList.remove("selected");
    });

    selectedCells = [];
}

// 선택한 사과 합계
function getSum() {
    return selectedCells.reduce(
        (sum, cell) => sum + Number(cell.dataset.value),
        0
    );
}

// 두 칸이 상하좌우로 붙어 있는지 확인
function isAdjacent(cellA, cellB) {
    const indexA = Number(cellA.dataset.index);
    const indexB = Number(cellB.dataset.index);

    const rowA = Math.floor(indexA / SIZE);
    const colA = indexA % SIZE;
    const rowB = Math.floor(indexB / SIZE);
    const colB = indexB % SIZE;

    return (
        Math.abs(rowA - rowB) +
        Math.abs(colA - colB) === 1
    );
}

// 현재 선택 합계 표시
function updateSelectionMessage() {
    const sum = getSum();

    if (sum === 10) {
        showMessage("합이 10입니다! 손을 떼면 사과를 수확해요.");
    } else {
        showMessage(
            `선택한 사과 ${selectedCells.length}개 · 합계 ${sum} / 10`
        );
    }
}

// 드래그 중 사과 선택
function addCell(cell) {
    if (
        !cell ||
        !isPlaying ||
        !isDragging ||
        isAnimating
    ) {
        return;
    }

    if (selectedCells.length === 0) {
        selectedCells.push(cell);
        cell.classList.add("selected");
        updateSelectionMessage();
        return;
    }

    const lastCell = selectedCells[selectedCells.length - 1];

    // 같은 칸이면 무시
    if (cell === lastCell) {
        return;
    }

    // 바로 이전 칸으로 되돌아가면 선택 취소
    if (
        selectedCells.length > 1 &&
        cell === selectedCells[selectedCells.length - 2]
    ) {
        const removedCell = selectedCells.pop();

        removedCell.classList.remove("selected");
        updateSelectionMessage();
        return;
    }

    // 이미 선택한 칸 또는 인접하지 않은 칸은 무시
    if (
        selectedCells.includes(cell) ||
        !isAdjacent(lastCell, cell)
    ) {
        return;
    }

    // 새로운 사과 선택
    selectedCells.push(cell);
    cell.classList.add("selected");

    const sum = getSum();

    // 합계가 10을 초과하면 즉시 전체 선택 무효 처리
    if (sum > 10) {
        clearSelection();
        isDragging = false;

        showMessage(
            "합이 10을 넘었습니다! 선택이 초기화됐어요.",
            true
        );

        return;
    }

    updateSelectionMessage();
}

// --------------------------------------------------
// 사과 수확 후 중력 처리
// --------------------------------------------------

function applyGravity(chosenCells) {
    const oldCells = Array.from(grid.querySelectorAll(".cell"));
    const removedSet = new Set(chosenCells);

    // 살아남은 사과들의 기존 화면 위치 기록
    const oldPositions = new Map();

    oldCells.forEach(cell => {
        if (!removedSet.has(cell)) {
            oldPositions.set(cell, cell.getBoundingClientRect());
        }
    });

    // 각 열에서 수확되지 않은 사과들을 위에서 아래 순서로 수집
    const columns = Array.from(
        { length: SIZE },
        () => []
    );

    oldCells.forEach(cell => {
        if (removedSet.has(cell)) {
            return;
        }

        const oldIndex = Number(cell.dataset.index);
        const col = oldIndex % SIZE;

        columns[col].push(cell);
    });

    // 재배치 후의 격자
    const nextCells = new Array(TOTAL_CELLS);
    const newCells = new Set();

    for (let col = 0; col < SIZE; col++) {
        const survivors = columns[col];
        const emptyCount = SIZE - survivors.length;

        for (let row = 0; row < SIZE; row++) {
            const newIndex = row * SIZE + col;
            let cell;

            if (row < emptyCount) {
                // 위쪽 빈칸은 새 사과로 채움
                cell = createCell(
                    newIndex,
                    randomNumber(),
                    true
                );

                newCells.add(cell);
            } else {
                // 남은 사과를 아래쪽부터 채워 떨어지게 만듦
                cell = survivors[row - emptyCount];
                cell.dataset.index = newIndex;

                // 행과 열 정보 갱신
                setAppleValue(
                    cell,
                    Number(cell.dataset.value)
                );
            }

            nextCells[newIndex] = cell;
        }
    }

    // 기존 사과를 새 위치로 이동
    grid.replaceChildren(...nextCells);

    // 새 위치의 레이아웃 계산
    void grid.offsetHeight;

    nextCells.forEach(cell => {
        if (newCells.has(cell)) {
            // 새 사과가 위에서 떨어지는 애니메이션
            requestAnimationFrame(() => {
                if (!cell.isConnected) return;

                cell.style.transition = "";
                cell.style.transform = "";
                cell.style.opacity = "";
            });

            setTimeout(() => {
                cell.classList.remove("falling-new");
            }, 430);

            return;
        }

        // 기존 사과는 이전 위치에서 새 위치까지 떨어짐
        const oldRect = oldPositions.get(cell);

        if (!oldRect) return;

        const newRect = cell.getBoundingClientRect();
        const deltaY = oldRect.top - newRect.top;

        if (Math.abs(deltaY) < 1) {
            return;
        }

        cell.classList.add("falling");
        cell.style.transition = "none";
        cell.style.transform = `translateY(${deltaY}px)`;

        // 시작 위치를 먼저 적용
        void cell.offsetHeight;

        // 원래 위치로 돌아가도록 해 떨어지는 효과 표현
        requestAnimationFrame(() => {
            if (!cell.isConnected) return;

            cell.style.transition = "";
            cell.style.transform = "";
        });

        setTimeout(() => {
            cell.classList.remove("falling");
        }, 430);
    });
}

// --------------------------------------------------
// 사과 수확 및 점수 계산
// --------------------------------------------------

function finishSelection() {
    if (!isDragging) {
        return;
    }

    isDragging = false;

    if (!isPlaying) {
        clearSelection();
        return;
    }

    const chosenCells = [...selectedCells];
    const sum = getSum();

    clearSelection();

    // 합이 정확히 10일 때만 수확
    if (sum === 10 && chosenCells.length > 1) {
        score += chosenCells.length * POINTS_PER_APPLE;

        let newRecord = false;

        // 최고 점수 갱신 확인
        if (score > bestScore) {
            bestScore = score;
            saveBestScore();

            // 한 게임에서 첫 기록 갱신일 때 축하 효과 실행
            if (!recordCelebrated) {
                recordCelebrated = true;
                newRecord = true;
            }
        }

        updateScore();

        if (newRecord) {
            showMessage(`🎉 최고 점수 갱신! ${score}점 달성!`);
            launchConfetti();
        } else {
            showMessage(
                `🍎 수확 성공! 사과 ${chosenCells.length}개, ` +
                `+${chosenCells.length * POINTS_PER_APPLE}점!`
            );
        }

        // 사과가 사라지는 효과
        isAnimating = true;

        chosenCells.forEach(cell => {
            cell.classList.add("clearing");
        });

        const currentVersion = gameVersion;

        // 사과가 사라진 후 위쪽 사과를 아래로 이동
        setTimeout(() => {
            if (currentVersion !== gameVersion) {
                return;
            }

            applyGravity(chosenCells);

            // 떨어지는 애니메이션이 끝날 때까지 입력 방지
            setTimeout(() => {
                if (currentVersion !== gameVersion) {
                    return;
                }

                isAnimating = false;
            }, 430);
        }, 180);

    } else if (chosenCells.length > 0) {
        showMessage(
            `합계는 ${sum}입니다. 정확히 10을 만들어 보세요.`,
            true
        );
    }
}

// --------------------------------------------------
// 게임 시작 및 종료
// --------------------------------------------------

function startGame() {
    clearInterval(timerId);

    // 이전 게임의 예약된 애니메이션 취소 처리용 버전 변경
    gameVersion++;

    score = 0;
    timeLeft = GAME_TIME;

    isPlaying = true;
    isDragging = false;
    isAnimating = false;
    recordCelebrated = false;

    clearSelection();
    createGrid();

    updateScore();
    updateTimer();

    startButton.textContent = "다시 시작";
    endButton.disabled = false;

    showMessage("상하좌우로 이어진 사과를 드래그하세요!");

    timerId = setInterval(() => {
        timeLeft--;
        updateTimer();

        if (timeLeft <= 0) {
            endGame("time");
        }
    }, 1000);
}

function endGame(reason = "manual") {
    if (!isPlaying) {
        return;
    }

    isPlaying = false;
    isDragging = false;

    clearInterval(timerId);
    timerId = null;

    clearSelection();

    startButton.textContent = "다시 도전";
    endButton.disabled = true;

    if (reason === "time") {
        showMessage(`⏰ 시간 종료! 최종 점수는 ${score}점입니다.`);
    } else {
        showMessage(`게임을 종료했습니다. 최종 점수: ${score}점`);
    }
}

// --------------------------------------------------
// 마우스 및 터치 드래그 이벤트
// --------------------------------------------------

grid.addEventListener("pointerdown", event => {
    const cell = event.target.closest(".cell");

    if (
        !cell ||
        !isPlaying ||
        isAnimating ||
        event.button > 0
    ) {
        return;
    }

    event.preventDefault();

    clearSelection();

    isDragging = true;
    selectedCells = [cell];

    cell.classList.add("selected");
    updateSelectionMessage();
});

// 드래그 중 마우스 또는 손가락 위치 확인
document.addEventListener("pointermove", event => {
    if (
        !isDragging ||
        !isPlaying ||
        isAnimating
    ) {
        return;
    }

    const element = document.elementFromPoint(
        event.clientX,
        event.clientY
    );

    const cell = element?.closest(".cell");

    if (cell && grid.contains(cell)) {
        addCell(cell);
    }
});

// 드래그 종료
document.addEventListener("pointerup", finishSelection);

// 터치 취소 등으로 입력이 끊긴 경우
document.addEventListener("pointercancel", () => {
    if (!isDragging) {
        return;
    }

    isDragging = false;
    clearSelection();

    showMessage("선택이 취소됐습니다. 다시 드래그하세요.");
});

// 버튼 이벤트
startButton.addEventListener("click", startGame);

endButton.addEventListener("click", () => {
    endGame("manual");
});

// --------------------------------------------------
// 최고 점수 갱신 콘페티 효과
// --------------------------------------------------

const confettiColors = [
    "#ff4d4d",
    "#ffcb45",
    "#6bd879",
    "#5bbdff",
    "#c79bff",
    "#ff8db3",
    "#ff914d"
];

let confettiParticles = [];
let confettiFrame = null;

// 화면 크기에 맞춰 캔버스 조정
function resizeConfettiCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeConfettiCanvas);
resizeConfettiCanvas();

// 콘페티 생성
function launchConfetti() {
    const width = canvas.width;
    const height = canvas.height;

    confettiParticles = Array.from(
        { length: 180 },
        () => ({
            x: Math.random() * width,
            y: -Math.random() * height * 0.35 - 10,

            vx: (Math.random() - 0.5) * 3,
            vy: 2 + Math.random() * 3.5,
            gravity: 0.04 + Math.random() * 0.06,

            width: 4 + Math.random() * 6,
            height: 6 + Math.random() * 9,

            rotation: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.2,

            color: confettiColors[
                Math.floor(Math.random() * confettiColors.length)
            ],

            shape: Math.random() > 0.5 ? "rect" : "circle"
        })
    );

    // 이미 애니메이션이 진행 중이면 새 입자를 이어서 표시
    if (confettiFrame === null) {
        confettiFrame = requestAnimationFrame(animateConfetti);
    }
}

// 콘페티 애니메이션
function animateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const remainingParticles = [];

    confettiParticles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += particle.gravity;
        particle.rotation += particle.spin;

        // 화면 밖으로 나간 콘페티는 제거
        if (
            particle.y < canvas.height + 30 &&
            particle.x > -50 &&
            particle.x < canvas.width + 50
        ) {
            remainingParticles.push(particle);
        }

        ctx.save();

        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.fillStyle = particle.color;

        if (particle.shape === "circle") {
            ctx.beginPath();

            ctx.arc(
                0,
                0,
                particle.width / 2,
                0,
                Math.PI * 2
            );

            ctx.fill();
        } else {
            ctx.fillRect(
                -particle.width / 2,
                -particle.height / 2,
                particle.width,
                particle.height
            );
        }

        ctx.restore();
    });

    confettiParticles = remainingParticles;

    if (confettiParticles.length > 0) {
        confettiFrame = requestAnimationFrame(animateConfetti);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        confettiFrame = null;
    }
}

// --------------------------------------------------
// 최초 화면 초기화
// --------------------------------------------------

createGrid();
updateScore();
updateTimer();
