document.addEventListener('DOMContentLoaded', () => {

    const canvas = document.getElementById('chessBoard');
    const ctx = canvas.getContext('2d');
    
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');

    const start2pButton = document.getElementById('start-2p-button');
    const startAiButton = document.getElementById('start-ai-button');
    const aiLevelSelection = document.getElementById('ai-level-selection');
    const aiLevelSelect = document.getElementById('ai-level-start');
    const summaryP1 = document.getElementById('summary-p1');
    const summaryP2 = document.getElementById('summary-p2');
    const resetScoresStartButton = document.getElementById('reset-scores-start');

    const player1NameElem = document.getElementById('player1-name');
    const player1ScoreElem = document.getElementById('player1-score');
    const player2NameElem = document.getElementById('player2-name');
    const player2ScoreElem = document.getElementById('player2-score');
    const player1InfoElem = document.getElementById('player1-info');
    const player2InfoElem = document.getElementById('player2-info');
    const mainMenuButton = document.getElementById('main-menu-button');

    let size;
    let squareSize;

    let players = [];
    let currentPlayerIndex;
    let board = [];
    let selectedPiece = null;
    let validMoves = [];
    let isAiActive = false;
    let aiDifficulty = 'easy';
    let isAiThinking = false;

    // Piezas
    const pieces = {
        'R': '♜', 'N': '♞', 'B': '♝', 'Q': '♛', 'K': '♚', 'P': '♟', // Negras
        'r': '♖', 'n': '♘', 'b': '♗', 'q': '♕', 'k': '♔', 'p': '♙'  // Blancas
    };

    const pieceValues = {
    'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 100 
    };

    function resizeCanvas() {
        const availableWidth = window.innerWidth * 0.95;
        const newSize = Math.min(availableWidth, 600);
        size = Math.floor(newSize / 8) * 8;
        canvas.width = size;
        canvas.height = size;
        squareSize = size / 8;
        if (board.length > 0) {
            drawGame();
        }
    }

    //Funciones IA

    const searchDepth = 3; 

    const pawnEvalWhite = [
        [0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0],
        [1.0,  1.0,  2.0,  3.0,  3.0,  2.0,  1.0,  1.0],
        [0.5,  0.5,  1.0,  2.5,  2.5,  1.0,  0.5,  0.5],
        [0.0,  0.0,  0.0,  2.0,  2.0,  0.0,  0.0,  0.0],
        [0.5, -0.5, -1.0,  0.0,  0.0, -1.0, -0.5,  0.5],
        [0.5,  1.0,  1.0, -2.0, -2.0,  1.0,  1.0,  0.5],
        [0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0]
    ];

    const pawnEvalBlack = pawnEvalWhite.slice().reverse();

    const knightEval = [
        [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
        [-4.0, -2.0,  0.0,  0.0,  0.0,  0.0, -2.0, -4.0],
        [-3.0,  0.0,  1.0,  1.5,  1.5,  1.0,  0.0, -3.0],
        [-3.0,  0.5,  1.5,  2.0,  2.0,  1.5,  0.5, -3.0],
        [-3.0,  0.0,  1.5,  2.0,  2.0,  1.5,  0.0, -3.0],
        [-3.0,  0.5,  1.0,  1.5,  1.5,  1.0,  0.5, -3.0],
        [-4.0, -2.0,  0.0,  0.5,  0.5,  0.0, -2.0, -4.0],
        [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0]
    ];

    const bishopEvalWhite = [
        [ -2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
        [ -1.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -1.0],
        [ -1.0,  0.0,  0.5,  1.0,  1.0,  0.5,  0.0, -1.0],
        [ -1.0,  0.5,  0.5,  1.0,  1.0,  0.5,  0.5, -1.0],
        [ -1.0,  0.0,  1.0,  1.0,  1.0,  1.0,  0.0, -1.0],
        [ -1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0, -1.0],
        [ -1.0,  0.5,  0.0,  0.0,  0.0,  0.0,  0.5, -1.0],
        [ -2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0]
    ];

    const bishopEvalBlack = bishopEvalWhite.slice().reverse();

    const rookEvalWhite = [
        [  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [  0.5,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  0.5],
        [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
        [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
        [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
        [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
        [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
        [  0.0,   0.0, 0.0,  0.5,  0.5,  0.0,  0.0,  0.0]
    ];

    const rookEvalBlack = rookEvalWhite.slice().reverse();

    const queenEval = [
        [ -2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
        [ -1.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -1.0],
        [ -1.0,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -1.0],
        [ -0.5,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -0.5],
        [  0.0,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -0.5],
        [ -1.0,  0.5,  0.5,  0.5,  0.5,  0.5,  0.0, -1.0],
        [ -1.0,  0.0,  0.5,  0.0,  0.0,  0.0,  0.0, -1.0],
        [ -2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0]
    ];

    function showStartScreen() {
        gameScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
        
        aiLevelSelection.classList.add('hidden');
        startAiButton.textContent = "Contra la PC";
        isAiSelectorVisible = false;
        
        displayScoresSummary();
    }

    function displayScoresSummary() {
        const storedPlayers = JSON.parse(localStorage.getItem('chessPlayers'));
        if (storedPlayers) {
            summaryP1.textContent = `${storedPlayers[0].name}: ${storedPlayers[0].score} victorias`;
            summaryP2.textContent = `${storedPlayers[1].name}: ${storedPlayers[1].score} victorias`;
        } else {
            summaryP1.textContent = "Jugador 1: 0 victorias";
            summaryP2.textContent = "Jugador 2: 0 victorias";
        }
    }

    function startGame(vsAI) {
        isAiActive = vsAI;
        aiDifficulty = aiLevelSelect.value; 
        startScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        setupPlayers();
        initGame();
    }

    function initGame() {

        resizeCanvas();

        initializeBoard();
        currentPlayerIndex = 0;
        selectedPiece = null;
        validMoves = [];
        drawGame();
        updateTurnIndicator();
    }

    // 2. Configura jugadores..    
    function setupPlayers() {
        const storedPlayers = JSON.parse(localStorage.getItem('chessPlayers'));
        if (isAiActive) {
            const player1Name = storedPlayers ? storedPlayers[0].name : "Jugador 1";
            players = [
                { name: player1Name, score: 0, color: 'white', isAI: false },
                { name: `PC (${aiDifficulty})`, score: 0, color: 'black', isAI: true }
            ];
        } else {
            if (storedPlayers) {
                players = storedPlayers;
            } else {
                const player1Name = prompt("Nombre Jugador 1 (Blancas):", "Jugador 1") || "Jugador 1";
                const player2Name = prompt("Nombre Jugador 2 (Negras):", "Jugador 2") || "Jugador 2";
                players = [
                    { name: player1Name, score: 0, color: 'white', isAI: false },
                    { name: player2Name, score: 0, color: 'black', isAI: false }
                ];
                saveScores();
            }
        }
        updateScoreboard();
    }

    // 3. Guarda en localStorage
    function saveScores() {
        if (players.length === 2 && !players[0].isAI && !players[1].isAI) {
            localStorage.setItem('chessPlayers', JSON.stringify(players));
        }
    }

    function endGame() {
        const winner = players[currentPlayerIndex];
        if (!winner.isAI) {
            alert(`¡Jaque Mate! El ganador es ${winner.name}`);
        } else {
            alert(`¡Jaque Mate! Has sido derrotado por la ${winner.name}.`);
        }
        if (!isAiActive) {
            winner.score++;
            saveScores();
        }
        updateScoreboard();
        setTimeout(showStartScreen, 2000);
    }

    // 4. Actualiza información pantalla
    function updateScoreboard() {
        player1NameElem.textContent = players[0].name;
        player1ScoreElem.textContent = players[0].score;
        player2NameElem.textContent = players[1].name;
        player2ScoreElem.textContent = players[1].score;
    }


    function updateTurnIndicator() {
        if (currentPlayerIndex === 0) {
            player1InfoElem.classList.add('active');
            player2InfoElem.classList.remove('active');
        } else {
            player2InfoElem.classList.add('active');
            player1InfoElem.classList.remove('active');
        }
    }

    // 5. estructura tablero
    function initializeBoard() {
        board = [
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']
        ];
    }

    // 6. Tablero y piezas
    function drawGame() {
        drawBoard();
        drawPieces();
        highlightSelectedPiece();
        highlightValidMoves();
    }

    function drawBoard() {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 0) { ctx.fillStyle = '#ebd8b7'; } 
                else { ctx.fillStyle = '#a98865'; }
                ctx.fillRect(col * squareSize, row * squareSize, squareSize, squareSize);
            }
        }
    }

    function drawPieces() {
        ctx.font = `${squareSize * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const pieceKey = board[row][col];
                if (pieceKey) {
                    ctx.fillStyle = (pieceKey === pieceKey.toUpperCase()) ? '#000000' : '#FFFFFF';
                    const x = col * squareSize + squareSize / 2;
                    const y = row * squareSize + squareSize / 2;
                    ctx.fillText(pieces[pieceKey], x, y);
                }
            }
        }
    }

    // Resalta pieza
    function highlightSelectedPiece() {
        if (selectedPiece) {
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 3;
            ctx.strokeRect(selectedPiece.col * squareSize, selectedPiece.row * squareSize, squareSize, squareSize);
        }
    }

    function highlightValidMoves() {
        ctx.fillStyle = 'rgba(76, 175, 80, 0.5)'; // Círculo verde
        validMoves.forEach(move => {
            const x = move.col * squareSize + squareSize / 2;
            const y = move.row * squareSize + squareSize / 2;
            ctx.beginPath();
            ctx.arc(x, y, squareSize / 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    // 7. clics en canvas
    function handleCanvasClick(event) {
        if (isAiThinking) return;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const col = Math.floor(x / squareSize);
        const row = Math.floor(y / squareSize);
        const clickedPieceKey = board[row][col];
        if (selectedPiece) {
            const isValidMove = validMoves.some(move => move.row === row && move.col === col);
            if (isValidMove) {
                makeMove(selectedPiece.row, selectedPiece.col, row, col);
            } else {
                if (clickedPieceKey && getPieceColor(clickedPieceKey) === players[currentPlayerIndex].color) {
                    selectPiece(row, col);
                } else {
                    selectedPiece = null;
                    validMoves = [];
                }
            }
        } else {
            selectPiece(row, col);
        }
        drawGame();
    }

    function selectPiece(row, col) {
        const pieceKey = board[row][col];
        if (pieceKey && getPieceColor(pieceKey) === players[currentPlayerIndex].color) {
            selectedPiece = { piece: pieceKey, row, col };
            validMoves = getValidMoves(pieceKey, row, col);
        }
    }

    // 8. Mueve piezas en estructura
    function makeMove(fromRow, fromCol, toRow, toCol) {
        const targetPiece = board[toRow][toCol];
        if (targetPiece.toLowerCase() === 'k') {
            endGame();
            return;
        }
        board[toRow][toCol] = board[fromRow][fromCol];
        board[fromRow][fromCol] = '';
        selectedPiece = null;
        validMoves = [];
        currentPlayerIndex = 1 - currentPlayerIndex;
        updateTurnIndicator();
        drawGame();
        if (players.length > 1 && players[currentPlayerIndex].isAI) {
            triggerAiMove();
        }
    }

    function getValidMoves(piece, row, col) {
        const pieceType = piece.toLowerCase();
        switch (pieceType) {
            case 'p': return getPawnMoves(row, col, getPieceColor(piece));
            case 'r': return getRookMoves(row, col);
            case 'n': return getKnightMoves(row, col);
            case 'b': return getBishopMoves(row, col);
            case 'q': return getQueenMoves(row, col);
            case 'k': return getKingMoves(row, col);
            default: return [];
        }
    }

    function getPawnMoves(row, col, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        const newRow = row + direction;
        if (isValidSquare(newRow, col)) {
            if (board[newRow][col] === '') {
                moves.push({ row: newRow, col });
                const doubleMoveRow = row + 2 * direction;
                if (row === startRow && board[doubleMoveRow][col] === '') {
                    moves.push({ row: doubleMoveRow, col });
                }
            }
            [-1, 1].forEach(side => {
                const newCol = col + side;
                if (isValidSquare(newRow, newCol)) {
                    const target = board[newRow][newCol];
                    if (target && getPieceColor(target) !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            });
        }
        return moves;
    }

    function getRookMoves(row, col) {
        const moves = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // Arriba, Abajo, Izquierda, Derecha
        return getSlidingMoves(row, col, directions);
    }
    
    function getBishopMoves(row, col) {
        const moves = [];
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]]; // Diagonales
        return getSlidingMoves(row, col, directions);
    }

    function getQueenMoves(row, col) {
        // Reina combina los movimientos de la torre y el alfil
        return getRookMoves(row, col).concat(getBishopMoves(row, col));
    }
    
    function getKnightMoves(row, col) {
        const moves = [];
        const directions = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        
        directions.forEach(dir => {
            const newRow = row + dir[0];
            const newCol = col + dir[1];
            if (isValidSquare(newRow, newCol)) {
                const target = board[newRow][newCol];
                if (target === '' || getPieceColor(target) !== players[currentPlayerIndex].color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        });
        return moves;
    }
    
    function getKingMoves(row, col) {
        const moves = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1], [0, -1],
            [0, 1], [1, -1], [1, 0], [1, 1]
        ];
        
        directions.forEach(dir => {
            const newRow = row + dir[0];
            const newCol = col + dir[1];
            if (isValidSquare(newRow, newCol)) {
                const target = board[newRow][newCol];
                if (target === '' || getPieceColor(target) !== players[currentPlayerIndex].color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        });
        return moves;
    }

    // Función auxiliar para piezas deslizantes (Torre, Alfil, Reina)
    function getSlidingMoves(row, col, directions) {
        const moves = [];
        const ownColor = players[currentPlayerIndex].color;
        
        directions.forEach(dir => {
            let newRow = row + dir[0];
            let newCol = col + dir[1];
            
            while(isValidSquare(newRow, newCol)) {
                const target = board[newRow][newCol];
                if (target === '') {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (getPieceColor(target) !== ownColor) {
                        moves.push({ row: newRow, col: newCol }); // Puede capturar
                    }
                    break; // Detenerse al encontrar cualquier pieza
                }
                newRow += dir[0];
                newCol += dir[1];
            }
        });
        return moves;
    }

    function isValidSquare(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    function getPieceColor(pieceKey) {
        return (pieceKey === pieceKey.toUpperCase()) ? 'black' : 'white';
    }

    // 9. Termina partida y actualiza marcador
    // function endGame() {
    //     const winner = players[currentPlayerIndex];
    //     if (!winner.isAI) {
    //         alert(`¡Jaque Mate! El ganador es ${winner.name}`);
    //     } else {
    //         alert(`¡Jaque Mate! Has sido derrotado por la ${winner.name}.`);
    //     }
    //     if (!isAiActive) {
    //         winner.score++;
    //         saveScores();
    //     }
    //     updateScoreboard();
    //     setTimeout(showStartScreen, 2000);
    // }

    // Función de ayuda para verificar si una casilla está dentro del tablero
    // function isValidSquare(row, col) {
    //     return row >= 0 && row < 8 && col >= 0 && col < 8;
    // }
    
    // saber color de pieza
    // function getPieceColor(pieceKey) {
    //     return (pieceKey === pieceKey.toUpperCase()) ? 'black' : 'white';
    // }

    // AI .....................
    function triggerAiMove() {
        isAiThinking = true;
        setTimeout(() => {
            const bestMove = calculateBestMove();
            if (bestMove) {
                makeMove(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col);
            } else {
                alert("La IA no tiene movimientos. ¿Ahogado?");
                showStartScreen();
            }
            isAiThinking = false;
        }, 50);
    }

    function calculateBestMove() {
        switch (aiDifficulty) {
            case 'easy': return getEasyMove();
            case 'intermediate': return getIntermediateMove();
            case 'expert': return getExpertMove();
            default: return getEasyMove();
        }
    }

    //fácil
    function getEasyMove() {
        const allMoves = getAllPossibleMoves('black');
        if (allMoves.length === 0) return null;
        return allMoves[Math.floor(Math.random() * allMoves.length)];
    }

    // Intermedio
    function getIntermediateMove() {
        const allMoves = getAllPossibleMoves('black');
        if (allMoves.length === 0) return null;
        let bestMoves = [];
        let maxScore = -1;
        for (const move of allMoves) {
            const targetPiece = board[move.to.row][move.to.col];
            let moveScore = 0;
            if (targetPiece !== '') {
                moveScore = pieceValues[targetPiece.toLowerCase()] || 0;
            }
            if (moveScore > maxScore) {
                maxScore = moveScore;
                bestMoves = [move];
            } else if (moveScore === maxScore) {
                bestMoves.push(move);
            }
        }
        if (maxScore <= 0) {
            return getEasyMove();
        }
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    // Experto
    function getExpertMove() {
        let bestScore = -Infinity;
        let bestMoves = [];
        const allMoves = getAllPossibleMoves('black');
        for (const move of allMoves) {
            const originalPiece = board[move.to.row][move.to.col];
            board[move.to.row][move.to.col] = board[move.from.row][move.from.col];
            board[move.from.row][move.from.col] = '';
            const score = minimax(searchDepth - 1, -Infinity, Infinity, false);
            board[move.from.row][move.from.col] = board[move.to.row][move.to.col];
            board[move.to.row][move.to.col] = originalPiece;
            if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
            } else if (score === bestScore) {
                bestMoves.push(move);
            }
        }
        if (bestMoves.length === 0) return null;
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    // FUNCIÓN MINIMAX PRINCIPAL con Poda Alfa-Beta
    function minimax(depth, alpha, beta, isMaximizingPlayer) {
        if (depth === 0) {
            return evaluateBoard(); 
        }
        const color = isMaximizingPlayer ? 'black' : 'white';
        const allMoves = getAllPossibleMoves(color);
        if (allMoves.length === 0) {
            return evaluateBoard();
        }
        if (isMaximizingPlayer) {
            let maxEval = -Infinity;
            for (const move of allMoves) {
                const originalPiece = board[move.to.row][move.to.col];
                board[move.to.row][move.to.col] = board[move.from.row][move.from.col];
                board[move.from.row][move.from.col] = '';
                const evaluation = minimax(depth - 1, alpha, beta, false);
                board[move.from.row][move.from.col] = board[move.to.row][move.to.col];
                board[move.to.row][move.to.col] = originalPiece;
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) {
                    break;
                }
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of allMoves) {
                const originalPiece = board[move.to.row][move.to.col];
                board[move.to.row][move.to.col] = board[move.from.row][move.from.col];
                board[move.from.row][move.from.col] = '';
                const evaluation = minimax(depth - 1, alpha, beta, true);
                board[move.from.row][move.from.col] = board[move.to.row][move.to.col];
                board[move.to.row][move.to.col] = originalPiece;
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) {
                    break;
                }
            }
            return minEval;
        }
    }

    //
    function getAllPossibleMoves(color) {
        const allMoves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && getPieceColor(piece) === color) {
                    const moves = getValidMoves(piece, row, col);
                    moves.forEach(move => {
                        allMoves.push({
                            from: { row, col },
                            to: { row: move.row, col: move.col }
                        });
                    });
                }
            }
        }
        return allMoves;
    }

    //
    function evaluateBoard() {
        let totalScore = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece) {
                    const value = pieceValues[piece.toLowerCase()] || 0;
                    const posValue = getPiecePositionValue(piece, row, col);
                    if (getPieceColor(piece) === 'black') {
                        totalScore += value + posValue;
                    } else {
                        totalScore -= (value + posValue);
                    }
                }
            }
        }
        return totalScore;
    }

    //
    function getPiecePositionValue(piece, row, col) {
        const pieceType = piece.toLowerCase();
        switch(pieceType) {
            case 'p': return getPieceColor(piece) === 'white' ? pawnEvalWhite[row][col] : pawnEvalBlack[row][col];
            case 'n': return knightEval[row][col];
            case 'b': return getPieceColor(piece) === 'white' ? bishopEvalWhite[row][col] : bishopEvalBlack[row][col];
            case 'r': return getPieceColor(piece) === 'white' ? rookEvalWhite[row][col] : rookEvalBlack[row][col];
            case 'q': return queenEval[row][col];
            default: return 0;
        }
    }

    let isAiSelectorVisible = false;

    start2pButton.addEventListener('click', () => {
        startGame(false);
    });

    startAiButton.addEventListener('click', () => {
        if (!isAiSelectorVisible) {
            aiLevelSelection.classList.remove('hidden');
            startAiButton.textContent = "Iniciar Partida vs PC";
            startAiButton.backgroundColor = "#64B9B3";
            isAiSelectorVisible = true;
        } else {
            startGame(true);
        }
    });
    
    mainMenuButton.addEventListener('click', showStartScreen);
    
    resetScoresStartButton.addEventListener('click', () => {
        if (confirm("¿Borrar todas las puntuaciones de 2 jugadores?")) {
            localStorage.removeItem('chessPlayers');
            displayScoresSummary();
        }
    });

    canvas.addEventListener('click', handleCanvasClick);

    window.addEventListener('resize', resizeCanvas);

    showStartScreen();

});
