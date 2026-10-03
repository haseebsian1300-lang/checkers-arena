/*
==================================================
 CHECKERS ARENA
 STEP 9 + STEP 10 FINAL
==================================================

 MODES:
 1. Local 2 Players
 2. AI
    - Easy
    - Medium
    - Hard
 3. Online Multiplayer

 FEATURES:
 - Mandatory capture
 - Multiple jumps
 - King promotion
 - King backward/forward movement
 - AI legal move engine
 - AI difficulty
 - Online room system
 - Player colors
 - 30 second turn timer
 - TIMEOUT = TURN PASS, NOT LOSS
 - Statistics
 - Clear King visuals
 - Game over
==================================================
*/


/* =================================================
   DOM
================================================= */

const boardElement = document.getElementById("board");
const restartButton = document.getElementById("restartButton");
const playAgainButton = document.getElementById("playAgainButton");

const localModeButton = document.getElementById("localModeButton");
const aiModeButton = document.getElementById("aiModeButton");
const onlineModeButton = document.getElementById("onlineModeButton");

const aiSettings = document.getElementById("aiSettings");
const onlineSettings = document.getElementById("onlineSettings");

const aiDifficulty = document.getElementById("aiDifficulty");
const humanColor = document.getElementById("humanColor");

const createRoomButton = document.getElementById("createRoomButton");
const joinRoomButton = document.getElementById("joinRoomButton");
const roomInput = document.getElementById("roomInput");

const roomInfo = document.getElementById("roomInfo");
const roomIdText = document.getElementById("roomIdText");
const copyRoomButton = document.getElementById("copyRoomButton");

const turnText = document.getElementById("turnText");
const timerElement = document.getElementById("timer");

const redCount = document.getElementById("redCount");
const blackCount = document.getElementById("blackCount");

const redCaptured = document.getElementById("redCaptured");
const blackCaptured = document.getElementById("blackCaptured");

const redPlayerCard = document.getElementById("redPlayerCard");
const blackPlayerCard = document.getElementById("blackPlayerCard");

const redPlayerName = document.getElementById("redPlayerName");
const blackPlayerName = document.getElementById("blackPlayerName");

const gameMessage = document.getElementById("gameMessage");
const gameMessageContainer =
    document.querySelector(".game-message-container");

const gameOverPanel = document.getElementById("gameOverPanel");
const winnerText = document.getElementById("winnerText");
const winnerReason = document.getElementById("winnerReason");

const moveCountElement = document.getElementById("moveCount");
const captureCountElement = document.getElementById("captureCount");
const queenCountElement = document.getElementById("queenCount");

const finalMoves = document.getElementById("finalMoves");
const finalCaptures = document.getElementById("finalCaptures");
const finalQueens = document.getElementById("finalQueens");


/* =================================================
   CONSTANTS
================================================= */

const BOARD_SIZE = 8;
const TURN_TIME = 30;


/* =================================================
   GAME STATE
================================================= */

let board = [];

let currentPlayer = "black";

let selectedPiece = null;
let isContinuingCapture = false;

let gameEnded = false;

let moveCount = 0;
let captureCount = 0;

let redCapturedCount = 0;
let blackCapturedCount = 0;

let remainingTime = TURN_TIME;
let gameTimer = null;


/* =================================================
   MODE
================================================= */

let gameMode = "local";

let humanSide = "red";
let aiSide = "black";

let aiLevel = "medium";
let aiThinking = false;


/* =================================================
   ONLINE
================================================= */

let socket = null;

let onlineRoom = null;
let onlineColor = null;

let onlineConnected = false;
let onlineHost = false;


/* =================================================
   AUDIO
================================================= */

let audioContext = null;


function initAudio() {

    if (!audioContext) {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

        if (AudioContext) {
            audioContext = new AudioContext();
        }
    }

    if (
        audioContext &&
        audioContext.state === "suspended"
    ) {
        audioContext.resume();
    }
}


function playTone(
    frequency,
    duration = 0.08,
    type = "sine",
    volume = 0.05
) {

    initAudio();

    if (!audioContext) {
        return;
    }

    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(
        0,
        audioContext.currentTime
    );

    gain.gain.linearRampToValueAtTime(
        volume,
        audioContext.currentTime + 0.01
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();

    oscillator.stop(
        audioContext.currentTime + duration
    );
}


function playMoveSound() {

    playTone(
        420,
        0.07,
        "sine",
        0.045
    );
}


function playCaptureSound() {

    playTone(
        220,
        0.10,
        "triangle",
        0.07
    );
}


function playKingSound() {

    playTone(
        520,
        0.10,
        "sine",
        0.06
    );

    setTimeout(
        () =>
            playTone(
                720,
                0.12,
                "sine",
                0.06
            ),
        100
    );

    setTimeout(
        () =>
            playTone(
                900,
                0.16,
                "sine",
                0.05
            ),
        200
    );
}


function playWinSound() {

    playTone(
        520,
        0.12,
        "sine",
        0.06
    );

    setTimeout(
        () =>
            playTone(
                660,
                0.14,
                "sine",
                0.06
            ),
        110
    );

    setTimeout(
        () =>
            playTone(
                880,
                0.20,
                "sine",
                0.07
            ),
        230
    );
}


/* =================================================
   BOARD CREATION
================================================= */

function createInitialBoard() {

    board = [];

    for (
        let row = 0;
        row < BOARD_SIZE;
        row++
    ) {

        const currentRow = [];

        for (
            let col = 0;
            col < BOARD_SIZE;
            col++
        ) {

            let piece = null;

            if (
                row < 3 &&
                (row + col) % 2 === 1
            ) {

                piece = {
                    color: "black",
                    king: false
                };
            }

            if (
                row > 4 &&
                (row + col) % 2 === 1
            ) {

                piece = {
                    color: "red",
                    king: false
                };
            }

            currentRow.push(piece);
        }

        board.push(currentRow);
    }
}


/* =================================================
   RENDER BOARD
================================================= */

function renderBoard() {

    boardElement.innerHTML = "";

    const mustCapture =
        playerHasCapture(currentPlayer);

    for (
        let row = 0;
        row < BOARD_SIZE;
        row++
    ) {

        for (
            let col = 0;
            col < BOARD_SIZE;
            col++
        ) {

            const square =
                document.createElement("div");

            square.classList.add("square");

            square.classList.add(
                (row + col) % 2 === 0
                    ? "light"
                    : "dark"
            );

            if (
                selectedPiece &&
                selectedPiece.row === row &&
                selectedPiece.col === col
            ) {

                square.classList.add("selected");
            }

            if (
                selectedPiece &&
                canInteractWithBoard()
            ) {

                const move =
                    getMoveType(
                        selectedPiece.row,
                        selectedPiece.col,
                        row,
                        col
                    );

                if (move === "capture") {

                    square.classList.add(
                        isContinuingCapture
                            ? "continue-capture"
                            : "capture-move"
                    );

                } else if (
                    move === "normal" &&
                    !isContinuingCapture
                ) {

                    square.classList.add(
                        "valid-move"
                    );
                }
            }

            const piece =
                board[row][col];

            if (piece) {

                const pieceElement =
                    document.createElement("div");

                pieceElement.classList.add(
                    "piece",
                    piece.color
                );

                if (piece.king) {

                    pieceElement.classList.add(
                        "king"
                    );
                }

                if (
                    selectedPiece &&
                    selectedPiece.row === row &&
                    selectedPiece.col === col
                ) {

                    pieceElement.classList.add(
                        "selected-piece"
                    );
                }

                square.appendChild(
                    pieceElement
                );
            }

            square.addEventListener(
                "click",
                () => {

                    initAudio();

                    handleSquareClick(
                        row,
                        col
                    );
                }
            );

            boardElement.appendChild(square);
        }
    }

    updateCounts();
    updateStats();
    updateTurn();
    updateActivePlayer();
}


/* =================================================
   BOARD INTERACTION
================================================= */

function canInteractWithBoard() {

    if (gameEnded) {
        return false;
    }

    if (aiThinking) {
        return false;
    }

    if (
        gameMode === "ai" &&
        currentPlayer !== humanSide
    ) {
        return false;
    }

    if (
        gameMode === "online" &&
        (
            !onlineConnected ||
            currentPlayer !== onlineColor
        )
    ) {
        return false;
    }

    return true;
}


/* =================================================
   CLICK
================================================= */

function handleSquareClick(row, col) {

    if (!canInteractWithBoard()) {
        return;
    }

    const clickedPiece =
        board[row][col];

    if (selectedPiece) {

        const moveType =
            getMoveType(
                selectedPiece.row,
                selectedPiece.col,
                row,
                col
            );

        if (moveType === "capture") {

            performCapture(
                selectedPiece.row,
                selectedPiece.col,
                row,
                col
            );

            return;
        }

        if (moveType === "normal") {

            if (isContinuingCapture) {

                showMessage(
                    "You must continue the capture chain.",
                    "capture"
                );

                return;
            }

            if (
                playerHasCapture(
                    currentPlayer
                )
            ) {

                showMessage(
                    "Capture is mandatory.",
                    "capture"
                );

                return;
            }

            performNormalMove(
                selectedPiece.row,
                selectedPiece.col,
                row,
                col
            );

            return;
        }
    }

    if (isContinuingCapture) {

        showMessage(
            "Continue with the same piece.",
            "capture"
        );

        return;
    }

    if (
        clickedPiece &&
        clickedPiece.color === currentPlayer
    ) {

        const mustCapture =
            playerHasCapture(
                currentPlayer
            );

        if (
            mustCapture &&
            !pieceHasCapture(row, col)
        ) {

            showMessage(
                "This piece cannot capture. Select a highlighted piece.",
                "capture"
            );

            return;
        }

        selectedPiece = {
            row,
            col
        };

        showMessage(
            mustCapture
                ? "Capture is mandatory — choose a highlighted destination."
                : `${capitalize(currentPlayer)} piece selected.`,
            mustCapture
                ? "capture"
                : "normal"
        );

        renderBoard();

        return;
    }

    showMessage(
        "Select one of your own pieces.",
        "normal"
    );
}


/* =================================================
   MOVE TYPE
================================================= */

function getMoveType(
    fromRow,
    fromCol,
    toRow,
    toCol
) {

    if (
        !isInsideBoard(
            toRow,
            toCol
        )
    ) {
        return null;
    }

    if (board[toRow][toCol]) {
        return null;
    }

    const piece =
        board[fromRow][fromCol];

    if (!piece) {
        return null;
    }

    if (
        piece.color !== currentPlayer
    ) {
        return null;
    }

    if (piece.king) {

        return getKingMoveType(
            fromRow,
            fromCol,
            toRow,
            toCol
        );
    }

    return getPawnMoveType(
        fromRow,
        fromCol,
        toRow,
        toCol
    );
}


/* =================================================
   PAWN MOVE
================================================= */

function getPawnMoveType(
    fromRow,
    fromCol,
    toRow,
    toCol
) {

    const piece =
        board[fromRow][fromCol];

    const dr =
        toRow - fromRow;

    const dc =
        toCol - fromCol;

    const direction =
        piece.color === "red"
            ? -1
            : 1;

    if (
        dr === direction &&
        Math.abs(dc) === 1
    ) {
        return "normal";
    }

    if (
        dr === direction * 2 &&
        Math.abs(dc) === 2
    ) {

        const middleRow =
            fromRow + dr / 2;

        const middleCol =
            fromCol + dc / 2;

        const middlePiece =
            board[middleRow][middleCol];

        if (
            middlePiece &&
            middlePiece.color !== piece.color
        ) {

            return "capture";
        }
    }

    return null;
}


/* =================================================
   KING MOVE
================================================= */

function getKingMoveType(
    fromRow,
    fromCol,
    toRow,
    toCol
) {

    const dr =
        toRow - fromRow;

    const dc =
        toCol - fromCol;

    if (
        Math.abs(dr) !== Math.abs(dc)
    ) {
        return null;
    }

    if (!dr) {
        return null;
    }

    const rowStep =
        Math.sign(dr);

    const colStep =
        Math.sign(dc);

    let row =
        fromRow + rowStep;

    let col =
        fromCol + colStep;

    let opponentFound = false;

    while (
        row !== toRow &&
        col !== toCol
    ) {

        const piece =
            board[row][col];

        if (!piece) {

            row += rowStep;
            col += colStep;

            continue;
        }

        if (
            piece.color === currentPlayer
        ) {
            return null;
        }

        if (opponentFound) {
            return null;
        }

        opponentFound = true;

        row += rowStep;
        col += colStep;
    }

    return opponentFound
        ? "capture"
        : "normal";
}


/* =================================================
   NORMAL MOVE
================================================= */

function performNormalMove(
    fromRow,
    fromCol,
    toRow,
    toCol,
    remote = false
) {

    const piece =
        board[fromRow][fromCol];

    board[toRow][toCol] =
        piece;

    board[fromRow][fromCol] =
        null;

    selectedPiece = null;
    isContinuingCapture = false;

    moveCount++;

    playMoveSound();

    const promoted =
        promoteIfNeeded(
            toRow,
            toCol
        );

    if (promoted) {
        playKingSound();
    }

    if (
        gameMode === "online" &&
        !remote
    ) {
        sendOnlineState();
    }

    switchPlayer();

    resetTimer();

    renderBoard();

    showMessage(
        `${capitalize(currentPlayer)}'s turn.`,
        "normal"
    );

    finishTurn();
}


/* =================================================
   CAPTURE
================================================= */

function performCapture(
    fromRow,
    fromCol,
    toRow,
    toCol,
    remote = false
) {

    const piece =
        board[fromRow][fromCol];

    let capturedColor = null;

    if (!piece.king) {

        const middleRow =
            fromRow +
            (toRow - fromRow) / 2;

        const middleCol =
            fromCol +
            (toCol - fromCol) / 2;

        const captured =
            board[middleRow][middleCol];

        if (captured) {
            capturedColor =
                captured.color;
        }

        board[middleRow][middleCol] =
            null;

    } else {

        const rowStep =
            Math.sign(
                toRow - fromRow
            );

        const colStep =
            Math.sign(
                toCol - fromCol
            );

        let row =
            fromRow + rowStep;

        let col =
            fromCol + colStep;

        while (
            row !== toRow &&
            col !== toCol
        ) {

            if (board[row][col]) {

                capturedColor =
                    board[row][col].color;

                board[row][col] =
                    null;

                break;
            }

            row += rowStep;
            col += colStep;
        }
    }

    if (capturedColor) {

        registerCapture(
            capturedColor
        );
    }

    board[toRow][toCol] =
        piece;

    board[fromRow][fromCol] =
        null;

    moveCount++;
    captureCount++;

    playCaptureSound();

    const promoted =
        promoteIfNeeded(
            toRow,
            toCol
        );

    /*
     * IMPORTANT:
     * If a pawn becomes a King during a
     * capture, its turn ends here.
     */
    if (promoted) {

        playKingSound();

        selectedPiece = null;
        isContinuingCapture = false;

        if (
            gameMode === "online" &&
            !remote
        ) {
            sendOnlineState();
        }

        switchPlayer();

        resetTimer();

        renderBoard();

        showMessage(
            `${capitalize(getOpponent(currentPlayer))} became a KING.`,
            "normal"
        );

        finishTurn();

        return;
    }

    selectedPiece = {
        row: toRow,
        col: toCol
    };

    /*
     * Multiple capture.
     */
    if (
        pieceHasCapture(
            toRow,
            toCol
        )
    ) {

        isContinuingCapture = true;

        renderBoard();

        showMessage(
            "Another capture is available — continue!",
            "multi"
        );

        return;
    }

    /*
     * Capture finished.
     */
    selectedPiece = null;
    isContinuingCapture = false;

    if (
        gameMode === "online" &&
        !remote
    ) {
        sendOnlineState();
    }

    switchPlayer();

    resetTimer();

    renderBoard();

    showMessage(
        `${capitalize(currentPlayer)}'s turn.`,
        "normal"
    );

    finishTurn();
}


/* =================================================
   PROMOTION
================================================= */

function promoteIfNeeded(
    row,
    col
) {

    const piece =
        board[row][col];

    if (
        !piece ||
        piece.king
    ) {
        return false;
    }

    if (
        piece.color === "red" &&
        row === 0
    ) {

        piece.king = true;

        return true;
    }

    if (
        piece.color === "black" &&
        row === BOARD_SIZE - 1
    ) {

        piece.king = true;

        return true;
    }

    return false;
}


/* =================================================
   CAPTURE HELPERS
================================================= */

function registerCapture(color) {

    if (color === "red") {

        redCapturedCount++;

    } else {

        blackCapturedCount++;
    }
}


function playerHasCapture(player) {

    for (
        let row = 0;
        row < BOARD_SIZE;
        row++
    ) {

        for (
            let col = 0;
            col < BOARD_SIZE;
            col++
        ) {

            const piece =
                board[row][col];

            if (
                piece &&
                piece.color === player &&
                pieceHasCaptureForPlayer(
                    row,
                    col,
                    player
                )
            ) {

                return true;
            }
        }
    }

    return false;
}


function pieceHasCapture(
    row,
    col
) {

    return pieceHasCaptureForPlayer(
        row,
        col,
        currentPlayer
    );
}


function pieceHasCaptureForPlayer(
    row,
    col,
    player
) {

    const piece =
        board[row][col];

    if (
        !piece ||
        piece.color !== player
    ) {
        return false;
    }

    if (piece.king) {

        return kingHasCapture(
            row,
            col,
            player
        );
    }

    const direction =
        player === "red"
            ? -1
            : 1;

    for (
        const dc of [-2, 2]
    ) {

        const targetRow =
            row + direction * 2;

        const targetCol =
            col + dc;

        if (
            canPawnCapture(
                row,
                col,
                targetRow,
                targetCol,
                player
            )
        ) {

            return true;
        }
    }

    return false;
}


function canPawnCapture(
    fromRow,
    fromCol,
    toRow,
    toCol,
    player
) {

    if (
        !isInsideBoard(
            toRow,
            toCol
        )
    ) {
        return false;
    }

    if (
        board[toRow][toCol]
    ) {
        return false;
    }

    const middleRow =
        (fromRow + toRow) / 2;

    const middleCol =
        (fromCol + toCol) / 2;

    const middle =
        board[middleRow][middleCol];

    return Boolean(
        middle &&
        middle.color !== player
    );
}


function kingHasCapture(
    row,
    col,
    player
) {

    const directions = [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
    ];

    for (
        const [dr, dc] of directions
    ) {

        let r =
            row + dr;

        let c =
            col + dc;

        let opponentFound =
            false;

        while (
            isInsideBoard(r, c)
        ) {

            const piece =
                board[r][c];

            if (!piece) {

                if (opponentFound) {
                    return true;
                }

                r += dr;
                c += dc;

                continue;
            }

            if (
                piece.color === player
            ) {
                break;
            }

            if (opponentFound) {
                break;
            }

            opponentFound = true;

            r += dr;
            c += dc;
        }
    }

    return false;
}


/* =================================================
   ANY LEGAL MOVE
================================================= */

function playerHasAnyLegalMove(player) {

    if (
        playerHasCapture(player)
    ) {
        return true;
    }

    for (
        let row = 0;
        row < BOARD_SIZE;
        row++
    ) {

        for (
            let col = 0;
            col < BOARD_SIZE;
            col++
        ) {

            const piece =
                board[row][col];

            if (
                !piece ||
                piece.color !== player
            ) {
                continue;
            }

            if (
                pieceHasNormalMove(
                    row,
                    col,
                    player
                )
            ) {
                return true;
            }
        }
    }

    return false;
}


function pieceHasNormalMove(
    row,
    col,
    player
) {

    const piece =
        board[row][col];

    if (piece.king) {

        const directions = [
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1]
        ];

        for (
            const [dr, dc] of directions
        ) {

            const r =
                row + dr;

            const c =
                col + dc;

            if (
                isInsideBoard(r, c) &&
                !board[r][c]
            ) {
                return true;
            }
        }

        return false;
    }

    const direction =
        player === "red"
            ? -1
            : 1;

    for (
        const dc of [-1, 1]
    ) {

        const r =
            row + direction;

        const c =
            col + dc;

        if (
            isInsideBoard(r, c) &&
            !board[r][c]
        ) {
            return true;
        }
    }

    return false;
}


/* =================================================
   GAME OVER
================================================= */

function checkGameOver() {

    const redPieces =
        countPieces("red");

    const blackPieces =
        countPieces("black");

    if (redPieces === 0) {

        endGame(
            "Black",
            "Red has no pieces left."
        );

        return true;
    }

    if (blackPieces === 0) {

        endGame(
            "Red",
            "Black has no pieces left."
        );

        return true;
    }

    if (
        !playerHasAnyLegalMove(
            currentPlayer
        )
    ) {

        endGame(
            capitalize(
                getOpponent(
                    currentPlayer
                )
            ),
            `${capitalize(currentPlayer)} has no legal moves.`
        );

        return true;
    }

    return false;
}


function finishTurn() {

    if (
        checkGameOver()
    ) {
        return;
    }

    if (
        gameMode === "ai" &&
        currentPlayer === aiSide
    ) {

        makeAIMove();
    }
}


/* =================================================
   END GAME
================================================= */

function endGame(
    winner,
    reason
) {

    if (gameEnded) {
        return;
    }

    gameEnded = true;

    stopTimer();

    winnerText.textContent =
        `${winner} Wins!`;

    winnerReason.textContent =
        reason;

    finalMoves.textContent =
        moveCount;

    finalCaptures.textContent =
        captureCount;

    finalQueens.textContent =
        countKings();

    gameOverPanel.classList.remove(
        "hidden"
    );

    playWinSound();

    showMessage(
        `${winner} wins — ${reason}`,
        "normal"
    );
}


/* =================================================
   COUNTING
================================================= */

function countPieces(color) {

    let count = 0;

    for (
        const row of board
    ) {

        for (
            const piece of row
        ) {

            if (
                piece &&
                piece.color === color
            ) {
                count++;
            }
        }
    }

    return count;
}


function countKings() {

    let count = 0;

    for (
        const row of board
    ) {

        for (
            const piece of row
        ) {

            if (
                piece &&
                piece.king
            ) {
                count++;
            }
        }
    }

    return count;
}


/* =================================================
   UI
================================================= */

function updateCounts() {

    redCount.textContent =
        `${countPieces("red")} pieces`;

    blackCount.textContent =
        `${countPieces("black")} pieces`;

    redCaptured.textContent =
        `Captured: ${redCapturedCount}`;

    blackCaptured.textContent =
        `Captured: ${blackCapturedCount}`;
}


function updateStats() {

    moveCountElement.textContent =
        moveCount;

    captureCountElement.textContent =
        captureCount;

    queenCountElement.textContent =
        countKings();
}


function updateTurn() {

    turnText.textContent =
        capitalize(
            currentPlayer
        );
}


function updateActivePlayer() {

    redPlayerCard.classList.remove(
        "active"
    );

    blackPlayerCard.classList.remove(
        "active"
    );

    if (
        currentPlayer === "red"
    ) {

        redPlayerCard.classList.add(
            "active"
        );

    } else {

        blackPlayerCard.classList.add(
            "active"
        );
    }
}


function showMessage(
    message,
    type = "normal"
) {

    gameMessage.textContent =
        message;

    gameMessageContainer.classList.remove(
        "capture-required",
        "multi-jump-message"
    );

    if (type === "capture") {

        gameMessageContainer.classList.add(
            "capture-required"
        );
    }

    if (type === "multi") {

        gameMessageContainer.classList.add(
            "multi-jump-message"
        );
    }
}


/* =================================================
   TIMER
================================================= */

/*
 * IMPORTANT TIMER RULE:
 *
 * Timer reaches 0:
 *
 * NO WIN
 * NO LOSS
 *
 * Current player's turn simply ends.
 * Turn passes to opponent.
 *
 * If opponent is AI:
 * AI automatically moves.
 *
 * If online:
 * New turn is synchronized.
 */

function handleTimeExpired() {

    if (gameEnded) {
        return;
    }

    stopTimer();

    const timedOutPlayer =
        currentPlayer;

    /*
     * Clear any selected piece.
     * A capture chain also ends because
     * the player's time has expired.
     */
    selectedPiece = null;
    isContinuingCapture = false;

    /*
     * PASS TURN
     */
    currentPlayer =
        getOpponent(
            currentPlayer
        );

    /*
     * New player's timer starts
     * from a fresh 30 seconds.
     */
    remainingTime =
        TURN_TIME;

    updateTimer();

    renderBoard();

    showMessage(
        `${capitalize(timedOutPlayer)}'s time ended — turn passed to ${capitalize(currentPlayer)}.`,
        "normal"
    );

    /*
     * Online:
     * send the new turn/state to opponent.
     */
    if (
        gameMode === "online" &&
        onlineConnected &&
        onlineRoom
    ) {

        sendOnlineState();
    }

    /*
     * Check actual game-over conditions.
     * Timeout itself NEVER causes loss.
     */
    if (
        checkGameOver()
    ) {
        return;
    }

    /*
     * Start timer for the new player.
     */
    startTimer();

    /*
     * If next player is AI,
     * AI automatically starts thinking.
     */
    if (
        gameMode === "ai" &&
        currentPlayer === aiSide &&
        !gameEnded
    ) {

        makeAIMove();
    }
}


function startTimer() {

    stopTimer();

    if (gameEnded) {
        return;
    }

    remainingTime =
        TURN_TIME;

    updateTimer();

    gameTimer =
        setInterval(
            () => {

                if (gameEnded) {

                    stopTimer();

                    return;
                }

                remainingTime--;

                updateTimer();

                /*
                 * TIMEOUT:
                 * Do NOT call endGame().
                 *
                 * Instead pass the turn.
                 */
                if (
                    remainingTime <= 0
                ) {

                    handleTimeExpired();
                }

            },
            1000
        );
}


function resetTimer() {

    if (gameEnded) {
        return;
    }

    startTimer();
}


function stopTimer() {

    if (gameTimer) {

        clearInterval(
            gameTimer
        );

        gameTimer = null;
    }
}


function updateTimer() {

    timerElement.textContent =
        remainingTime;

    timerElement.classList.toggle(
        "warning",
        remainingTime <= 10
    );
}


/* =================================================
   AI ENGINE
================================================= */

function getAllLegalMoves(
    player,
    stateBoard = board
) {

    const moves = [];

    const hasCapture =
        playerHasCaptureOnBoard(
            player,
            stateBoard
        );

    for (
        let row = 0;
        row < BOARD_SIZE;
        row++
    ) {

        for (
            let col = 0;
            col < BOARD_SIZE;
            col++
        ) {

            const piece =
                stateBoard[row][col];

            if (
                !piece ||
                piece.color !== player
            ) {
                continue;
            }

            const pieceMoves =
                getPieceMoves(
                    row,
                    col,
                    player,
                    stateBoard,
                    hasCapture
                );

            moves.push(
                ...pieceMoves
            );
        }
    }

    return moves;
}


function getPieceMoves(
    row,
    col,
    player,
    stateBoard,
    captureOnly = false
) {

    const piece =
        stateBoard[row][col];

    const moves = [];

    if (piece.king) {

        const directions = [
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1]
        ];

        for (
            const [dr, dc] of directions
        ) {

            let r =
                row + dr;

            let c =
                col + dc;

            let enemy = null;

            while (
                isInsideBoard(r, c)
            ) {

                const target =
                    stateBoard[r][c];

                if (!target) {

                    if (enemy) {

                        moves.push({
                            from: {
                                row,
                                col
                            },
                            to: {
                                row: r,
                                col: c
                            },
                            capture: true,
                            captured: enemy
                        });

                    } else if (!captureOnly) {

                        moves.push({
                            from: {
                                row,
                                col
                            },
                            to: {
                                row: r,
                                col: c
                            },
                            capture: false
                        });
                    }

                    r += dr;
                    c += dc;

                    continue;
                }

                if (
                    target.color === player
                ) {
                    break;
                }

                if (enemy) {
                    break;
                }

                enemy = {
                    row: r,
                    col: c
                };

                r += dr;
                c += dc;
            }
        }

        return moves;
    }

    const direction =
        player === "red"
            ? -1
            : 1;

    for (
        const dc of [-1, 1]
    ) {

        const r =
            row + direction;

        const c =
            col + dc;

        if (
            isInsideBoard(r, c) &&
            !stateBoard[r][c] &&
            !captureOnly
        ) {

            moves.push({
                from: {
                    row,
                    col
                },
                to: {
                    row: r,
                    col: c
                },
                capture: false
            });
        }

        const jumpRow =
            row + direction * 2;

        const jumpCol =
            col + dc * 2;

        if (
            canCaptureOnBoard(
                row,
                col,
                jumpRow,
                jumpCol,
                player,
                stateBoard
            )
        ) {

            moves.push({
                from: {
                    row,
                    col
                },
                to: {
                    row: jumpRow,
                    col: jumpCol
                },
                capture: true,
                captured: {
                    row:
                        row + direction,
                    col:
                        col + dc
                }
            });
        }
    }

    return moves;
}


function applyMoveToBoard(
    stateBoard,
    move
) {

    const copy =
        cloneBoard(
            stateBoard
        );

    const piece =
        copy[
            move.from.row
        ][
            move.from.col
        ];

    copy[
        move.to.row
    ][
        move.to.col
    ] = piece;

    copy[
        move.from.row
    ][
        move.from.col
    ] = null;

    if (
        move.capture &&
        move.captured
    ) {

        copy[
            move.captured.row
        ][
            move.captured.col
        ] = null;
    }

    if (
        piece &&
        !piece.king
    ) {

        if (
            piece.color === "red" &&
            move.to.row === 0
        ) {
            piece.king = true;
        }

        if (
            piece.color === "black" &&
            move.to.row === 7
        ) {
            piece.king = true;
        }
    }

    return copy;
}


function chooseEasyMove(moves) {

    return moves[
        Math.floor(
            Math.random() *
            moves.length
        )
    ];
}


function chooseMediumMove(
    moves,
    player
) {

    let bestScore =
        -Infinity;

    let bestMoves = [];

    for (
        const move of moves
    ) {

        let score = 0;

        if (move.capture) {
            score += 100;
        }

        const piece =
            board[
                move.from.row
            ][
                move.from.col
            ];

        if (
            piece &&
            piece.king
        ) {
            score += 15;
        }

        if (
            move.to.row === 0 ||
            move.to.row === 7
        ) {
            score += 25;
        }

        score +=
            Math.random() * 10;

        if (
            score > bestScore
        ) {

            bestScore =
                score;

            bestMoves = [
                move
            ];

        } else if (
            score === bestScore
        ) {

            bestMoves.push(
                move
            );
        }
    }

    return bestMoves[0];
}


function chooseHardMove(
    moves,
    player
) {

    let bestMove =
        moves[0];

    let bestScore =
        -Infinity;

    for (
        const move of moves
    ) {

        const next =
            applyMoveToBoard(
                board,
                move
            );

        const score =
            minimax(
                next,
                getOpponent(player),
                2,
                player
            );

        if (
            score > bestScore
        ) {

            bestScore =
                score;

            bestMove =
                move;
        }
    }

    return bestMove;
}


function minimax(
    stateBoard,
    player,
    depth,
    maximizingPlayer
) {

    if (
        depth === 0
    ) {

        return evaluateBoard(
            stateBoard,
            maximizingPlayer
        );
    }

    const moves =
        getAllLegalMoves(
            player,
            stateBoard
        );

    if (
        moves.length === 0
    ) {

        return player === maximizingPlayer
            ? -10000
            : 10000;
    }

    const maximizing =
        player === maximizingPlayer;

    let best =
        maximizing
            ? -Infinity
            : Infinity;

    for (
        const move of moves
    ) {

        const next =
            applyMoveToBoard(
                stateBoard,
                move
            );

        const score =
            minimax(
                next,
                getOpponent(player),
                depth - 1,
                maximizingPlayer
            );

        if (maximizing) {

            best =
                Math.max(
                    best,
                    score
                );

        } else {

            best =
                Math.min(
                    best,
                    score
                );
        }
    }

    return best;
}


function evaluateBoard(
    stateBoard,
    player
) {

    let score = 0;

    for (
        const row of stateBoard
    ) {

        for (
            const piece of row
        ) {

            if (!piece) {
                continue;
            }

            const value =
                piece.king
                    ? 5
                    : 3;

            if (
                piece.color === player
            ) {

                score += value;

            } else {

                score -= value;
            }
        }
    }

    return score;
}


/* =================================================
   START AI
================================================= */

function makeAIMove() {

    if (
        gameEnded ||
        currentPlayer !== aiSide ||
        gameMode !== "ai"
    ) {
        return;
    }

    aiThinking = true;

    selectedPiece = null;
    isContinuingCapture = false;

    renderBoard();

    showMessage(
        "🤖 AI is thinking...",
        "normal"
    );

    setTimeout(
        () => {

            if (
                gameEnded ||
                currentPlayer !== aiSide
            ) {

                aiThinking = false;

                return;
            }

            const moves =
                getAllLegalMoves(
                    aiSide,
                    board
                );

            if (!moves.length) {

                aiThinking = false;

                checkGameOver();

                return;
            }

            let move;

            if (
                aiLevel === "easy"
            ) {

                move =
                    chooseEasyMove(
                        moves
                    );

            } else if (
                aiLevel === "hard"
            ) {

                move =
                    chooseHardMove(
                        moves,
                        aiSide
                    );

            } else {

                move =
                    chooseMediumMove(
                        moves,
                        aiSide
                    );
            }

            aiThinking = false;

            executeAIMove(move);

        },
        aiLevel === "easy"
            ? 450
            : aiLevel === "medium"
                ? 700
                : 950
    );
}


function executeAIMove(move) {

    if (move.capture) {

        performCapture(
            move.from.row,
            move.from.col,
            move.to.row,
            move.to.col
        );

    } else {

        performNormalMove(
            move.from.row,
            move.from.col,
            move.to.row,
            move.to.col
        );
    }
}


/* =================================================
   AI BOARD HELPERS
================================================= */

function cloneBoard(source) {

    return source.map(
        row =>
            row.map(
                piece =>
                    piece
                        ? {
                            color:
                                piece.color,
                            king:
                                piece.king
                        }
                        : null
            )
    );
}


function playerHasCaptureOnBoard(
    player,
    stateBoard
) {

    for (
        let row = 0;
        row < BOARD_SIZE;
        row++
    ) {

        for (
            let col = 0;
            col < BOARD_SIZE;
            col++
        ) {

            const piece =
                stateBoard[row][col];

            if (
                piece &&
                piece.color === player &&
                pieceHasCaptureOnState(
                    row,
                    col,
                    player,
                    stateBoard
                )
            ) {

                return true;
            }
        }
    }

    return false;
}


function pieceHasCaptureOnState(
    row,
    col,
    player,
    stateBoard
) {

    const moves =
        getPieceMoves(
            row,
            col,
            player,
            stateBoard,
            true
        );

    return moves.length > 0;
}


function canCaptureOnBoard(
    fromRow,
    fromCol,
    toRow,
    toCol,
    player,
    stateBoard
) {

    if (
        !isInsideBoard(
            toRow,
            toCol
        )
    ) {
        return false;
    }

    if (
        stateBoard[toRow][toCol]
    ) {
        return false;
    }

    const middleRow =
        (fromRow + toRow) / 2;

    const middleCol =
        (fromCol + toCol) / 2;

    const middle =
        stateBoard[
            middleRow
        ][
            middleCol
        ];

    return Boolean(
        middle &&
        middle.color !== player
    );
}


/* =================================================
   MODE SWITCHING
================================================= */

function setMode(mode) {

    gameMode = mode;

    aiThinking = false;

    localModeButton.classList.toggle(
        "active",
        mode === "local"
    );

    aiModeButton.classList.toggle(
        "active",
        mode === "ai"
    );

    onlineModeButton.classList.toggle(
        "active",
        mode === "online"
    );

    aiSettings.classList.toggle(
        "hidden",
        mode !== "ai"
    );

    onlineSettings.classList.toggle(
        "hidden",
        mode !== "online"
    );

    if (
        mode !== "online"
    ) {

        roomInfo.classList.add(
            "hidden"
        );

        disconnectOnline();
    }

    startGame();
}


localModeButton.addEventListener(
    "click",
    () => {

        initAudio();

        setMode("local");
    }
);


aiModeButton.addEventListener(
    "click",
    () => {

        initAudio();

        setMode("ai");
    }
);


onlineModeButton.addEventListener(
    "click",
    () => {

        initAudio();

        setMode("online");
    }
);


aiDifficulty.addEventListener(
    "change",
    () => {

        aiLevel =
            aiDifficulty.value;

        startGame();
    }
);


humanColor.addEventListener(
    "change",
    () => {

        humanSide =
            humanColor.value;

        aiSide =
            getOpponent(
                humanSide
            );

        startGame();
    }
);


/* =================================================
   ONLINE
================================================= */

function getServerURL() {

    const protocol =
        location.protocol === "https:"
            ? "wss:"
            : "ws:";

    return `${protocol}//${location.host}`;
}


function connectSocket() {

    if (
        socket &&
        (
            socket.readyState ===
                WebSocket.OPEN ||
            socket.readyState ===
                WebSocket.CONNECTING
        )
    ) {
        return;
    }

    socket =
        new WebSocket(
            getServerURL()
        );

    socket.addEventListener(
        "open",
        () => {

            onlineConnected =
                true;

            showMessage(
                "Connected to online server.",
                "normal"
            );
        }
    );

    socket.addEventListener(
        "message",
        event => {

            try {

                handleServerMessage(
                    JSON.parse(
                        event.data
                    )
                );

            } catch {

                showMessage(
                    "Invalid server response.",
                    "capture"
                );
            }
        }
    );

    socket.addEventListener(
        "close",
        () => {

            onlineConnected =
                false;

            showMessage(
                "Online connection closed.",
                "normal"
            );
        }
    );

    socket.addEventListener(
        "error",
        () => {

            onlineConnected =
                false;

            showMessage(
                "Could not connect to online server.",
                "capture"
            );
        }
    );
}


function createOnlineRoom() {

    connectSocket();

    const wait =
        setInterval(
            () => {

                if (
                    socket &&
                    socket.readyState ===
                        WebSocket.OPEN
                ) {

                    clearInterval(wait);

                    socket.send(
                        JSON.stringify({
                            type: "create"
                        })
                    );
                }

            },
            100
        );

    setTimeout(
        () =>
            clearInterval(wait),
        5000
    );
}


function joinOnlineRoom() {

    const room =
        roomInput.value
            .trim()
            .toUpperCase();

    if (
        !room ||
        room.length !== 6
    ) {

        showMessage(
            "Enter a valid 6-character room ID.",
            "capture"
        );

        return;
    }

    connectSocket();

    const wait =
        setInterval(
            () => {

                if (
                    socket &&
                    socket.readyState ===
                        WebSocket.OPEN
                ) {

                    clearInterval(wait);

                    socket.send(
                        JSON.stringify({
                            type: "join",
                            room
                        })
                    );
                }

            },
            100
        );

    setTimeout(
        () =>
            clearInterval(wait),
        5000
    );
}


function handleServerMessage(message) {

    if (
        message.type === "created"
    ) {

        onlineRoom =
            message.room;

        onlineColor =
            "black";

        onlineHost =
            true;

        roomIdText.textContent =
            onlineRoom;

        roomInfo.classList.remove(
            "hidden"
        );

        showMessage(
            `Room ${onlineRoom} created. Waiting for Red player...`,
            "normal"
        );

        return;
    }

    if (
        message.type === "joined"
    ) {

        onlineRoom =
            message.room;

        onlineColor =
            "red";

        onlineHost =
            false;

        roomIdText.textContent =
            onlineRoom;

        roomInfo.classList.remove(
            "hidden"
        );

        showMessage(
            `Joined room ${onlineRoom}.`,
            "normal"
        );

        return;
    }

    if (
        message.type === "ready"
    ) {

        startGame();

        showMessage(
            "Both players connected. Black moves first.",
            "normal"
        );

        return;
    }

    if (
        message.type === "state"
    ) {

        applyRemoteState(
            message.state
        );

        return;
    }

    if (
        message.type === "error"
    ) {

        showMessage(
            message.message,
            "capture"
        );
    }
}


function sendOnlineState() {

    if (
        !socket ||
        socket.readyState !==
            WebSocket.OPEN ||
        !onlineRoom
    ) {
        return;
    }

    socket.send(
        JSON.stringify({
            type: "state",
            room: onlineRoom,
            state: serializeState()
        })
    );
}


function serializeState() {

    return {
        board:
            cloneBoard(board),

        currentPlayer,

        moveCount,

        captureCount,

        redCapturedCount,

        blackCapturedCount,

        remainingTime,

        gameEnded
    };
}


function applyRemoteState(state) {

    /*
     * Stop current local timer first.
     */
    stopTimer();

    board =
        state.board;

    currentPlayer =
        state.currentPlayer;

    moveCount =
        state.moveCount;

    captureCount =
        state.captureCount;

    redCapturedCount =
        state.redCapturedCount;

    blackCapturedCount =
        state.blackCapturedCount;

    remainingTime =
        Number.isFinite(
            state.remainingTime
        )
            ? state.remainingTime
            : TURN_TIME;

    gameEnded =
        state.gameEnded;

    selectedPiece = null;
    isContinuingCapture = false;

    renderBoard();

    if (gameEnded) {

        /*
         * Remote game is already over.
         * Do not create another timer.
         */
        checkGameOver();

        return;
    }

    updateTimer();

    /*
     * Continue timer from received state.
     */
    gameTimer =
        setInterval(
            () => {

                if (gameEnded) {

                    stopTimer();

                    return;
                }

                remainingTime--;

                updateTimer();

                if (
                    remainingTime <= 0
                ) {

                    /*
                     * Remote client can also
                     * process timeout.
                     */
                    handleTimeExpired();
                }

            },
            1000
        );

    showMessage(
        `${capitalize(currentPlayer)}'s turn.`,
        "normal"
    );
}


function disconnectOnline() {

    if (socket) {

        socket.close();

        socket = null;
    }

    onlineConnected = false;

    onlineRoom = null;
    onlineColor = null;

    onlineHost = false;
}


createRoomButton.addEventListener(
    "click",
    () => {

        initAudio();

        createOnlineRoom();
    }
);


joinRoomButton.addEventListener(
    "click",
    () => {

        initAudio();

        joinOnlineRoom();
    }
);


copyRoomButton.addEventListener(
    "click",
    async () => {

        if (!onlineRoom) {
            return;
        }

        try {

            await navigator.clipboard.writeText(
                onlineRoom
            );

            showMessage(
                "Room ID copied.",
                "normal"
            );

        } catch {

            showMessage(
                `Room ID: ${onlineRoom}`,
                "normal"
            );
        }
    }
);


/* =================================================
   RESTART
================================================= */

function startGame() {

    stopTimer();

    currentPlayer =
        "black";

    selectedPiece = null;

    isContinuingCapture = false;

    gameEnded = false;

    aiThinking = false;

    moveCount = 0;

    captureCount = 0;

    redCapturedCount = 0;

    blackCapturedCount = 0;

    remainingTime =
        TURN_TIME;

    createInitialBoard();

    gameOverPanel.classList.add(
        "hidden"
    );

    if (
        gameMode === "online" &&
        onlineConnected &&
        onlineRoom
    ) {

        /*
         * Only Black host starts
         * the synchronized game.
         */
        if (onlineHost) {

            sendOnlineState();
        }
    }

    renderBoard();

    startTimer();

    if (
        gameMode === "ai" &&
        currentPlayer === aiSide
    ) {

        makeAIMove();
    }

    if (
        gameMode === "online"
    ) {

        if (!onlineConnected) {

            showMessage(
                "Create or join an online room.",
                "normal"
            );

        } else {

            showMessage(
                `You are ${capitalize(onlineColor)}.`,
                "normal"
            );
        }
    }
}


restartButton.addEventListener(
    "click",
    () => {

        initAudio();

        startGame();
    }
);


playAgainButton.addEventListener(
    "click",
    () => {

        initAudio();

        startGame();
    }
);


/* =================================================
   UTILITIES
================================================= */

function switchPlayer() {

    currentPlayer =
        getOpponent(
            currentPlayer
        );
}


function getOpponent(player) {

    return player === "red"
        ? "black"
        : "red";
}


function capitalize(value) {

    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );
}


function isInsideBoard(
    row,
    col
) {

    return (
        row >= 0 &&
        row < BOARD_SIZE &&
        col >= 0 &&
        col < BOARD_SIZE
    );
}


/* =================================================
   START
================================================= */

startGame();