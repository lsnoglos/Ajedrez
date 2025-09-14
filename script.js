document.addEventListener('DOMContentLoaded', () => {

    const canvas = document.getElementById('chessBoard');
    const ctx = canvas.getContext('2d');
    const size = 400;
    const squareSize = size / 8;

    let players = [];
    let currentPlayerIndex;
    let board = []; // tablero, 8x8
    let selectedPiece = null; // pieza jugador seleccionada
    let validMoves = []; 

    let isAiActive = false;
    let aiDifficulty = 'easy';
    let isAiThinking = false; //  bloquear jugador

    // DOM
    const player1NameElem = document.getElementById('player1-name');
    const player1ScoreElem = document.getElementById('player1-score');
    const player2NameElem = document.getElementById('player2-name');
    const player2ScoreElem = document.getElementById('player2-score');
    //const currentPlayerElem = document.getElementById('current-player');
    const player1InfoElem = document.getElementById('player1-info');
    const player2InfoElem = document.getElementById('player2-info');

    // Piezas
    const pieces = {
        'R': '♜', 'N': '♞', 'B': '♝', 'Q': '♛', 'K': '♚', 'P': '♟', // Negras
        'r': '♖', 'n': '♘', 'b': '♗', 'q': '♕', 'k': '♔', 'p': '♙'  // Blancas
    };

    const pieceValues = {
    'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 100 
    };

    function initGame() {
        setupPlayers();
        initializeBoard();
        currentPlayerIndex = 0; // Blancas empiezan
        selectedPiece = null;
        validMoves = [];
        drawGame();
        updateTurnIndicator();
    }

    // 2. Configura jugadores..    
    function setupPlayers() {
        isAiActive = document.getElementById('ai-checkbox').checked;
        aiDifficulty = document.getElementById('ai-level').value;

        const storedPlayers = JSON.parse(localStorage.getItem('chessPlayers'));
        let player1Name, player2Name;

        if (storedPlayers && !isAiActive) { // si no IA
            players = storedPlayers;
        } else {
            player1Name = prompt("Jugador 1 (Blancas):", "Jugador 1") || "Jugador 1";
            
            if (isAiActive) {
                player2Name = `PC (${aiDifficulty.charAt(0).toUpperCase() + aiDifficulty.slice(1)})`;
            } else {
                player2Name = prompt("Jugador 2 (Negras):", "Jugador 2") || "Jugador 2";
            }

            players = [
                { name: player1Name, score: 0, color: 'white', isAI: false },
                { name: player2Name, score: 0, color: 'black', isAI: isAiActive }
            ];
            
            // No guardamos localStorage si juega la IA
            if (!isAiActive) {
                saveScores();
            }
        }
        updateScoreboard();
    }


    // 3. Guarda en localStorage
    function saveScores() {
        localStorage.setItem('chessPlayers', JSON.stringify(players));
    }
    
    // 4. Actualiza información pantalla
    function updateScoreboard() {
        player1NameElem.textContent = players[0].name;
        player1ScoreElem.textContent = players[0].score;
        player2NameElem.textContent = players[1].name;
        player2ScoreElem.textContent = players[1].score;
    }

    function updateTurnIndicator() {
        //currentPlayerElem.textContent = players[currentPlayerIndex].name;
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
                if ((row + col) % 2 === 0) {
                    ctx.fillStyle = '#ebd8b7'; // casillas claras
                } else {
                    ctx.fillStyle = '#a98865'; // casillas oscuras
                }
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
                    // mayúsculas negras, minúsculas blancas
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
                // clic pieza suya, la selecciona
                if (clickedPieceKey && getPieceColor(clickedPieceKey) === players[currentPlayerIndex].color) {
                    selectPiece(row, col);
                } else {
                    // Deselecciona si inválido
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
            validMoves = getValidMoves(pieceKey, row, col); // movimientos válidos
        }
    }

    // 8. Mueve piezas en estructura
    function makeMove(fromRow, fromCol, toRow, toCol) {
        const pieceToMove = board[fromRow][fromCol];
        const targetPiece = board[toRow][toCol];

        if (targetPiece.toLowerCase() === 'k') {
            endGame();
            return;
        }

        board[toRow][toCol] = pieceToMove;
        board[fromRow][fromCol] = '';
        selectedPiece = null;
        validMoves = [];
        
        currentPlayerIndex = 1 - currentPlayerIndex;
        updateTurnIndicator();
        drawGame();

        if (players[currentPlayerIndex].isAI) {
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
        
        // Hacia adelante
        if (board[row + direction][col] === '') {
            moves.push({ row: row + direction, col });
            // Movimiento doble inicio
            if (row === startRow && board[row + 2 * direction][col] === '') {
                moves.push({ row: row + 2 * direction, col });
            }
        }
        
        // Capturas diagonal
        [-1, 1].forEach(side => {
            if (col + side >= 0 && col + side < 8) {
                const target = board[row + direction][col + side];
                if (target && getPieceColor(target) !== color) {
                    moves.push({ row: row + direction, col: col + side });
                }
            }
        });

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

    // 9. Termina partida y actualiza marcador
    function endGame() {
        const winner = players[currentPlayerIndex];
        alert(`¡Jaque Mate! El ganador es ${winner.name}`);
        winner.score++;
        saveScores();
        updateScoreboard();
        // jugar de nuevo
        if (confirm("¿Jugar otra vez?")) {
            initGame();
        }
    }

    // Función de ayuda para verificar si una casilla está dentro del tablero
    function isValidSquare(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }
    
    // saber color de pieza
    function getPieceColor(pieceKey) {
        return (pieceKey === pieceKey.toUpperCase()) ? 'black' : 'white';
    }

    // AI .....................
    function triggerAiMove() {
        isAiThinking = true;
        // simular que piensa
        setTimeout(() => {
            const bestMove = calculateBestMove();
            if (bestMove) {
                makeMove(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col);
            }
            isAiThinking = false;
        }, 500);
    }

    function calculateBestMove() {
        switch (aiDifficulty) {
            case 'easy':
                return getEasyMove();
            case 'intermediate':
                return getIntermediateMove();
            case 'expert':
                return getExpertMove();
            default:
                return getEasyMove();
        }
    }

    //fácil
    function getEasyMove() {
        const allMoves = getAllPossibleMoves('black');
        if (allMoves.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * allMoves.length);
        return allMoves[randomIndex];
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
        
        const randomIndex = Math.floor(Math.random() * bestMoves.length);
        return bestMoves[randomIndex];
    }

    // Experto
    function getExpertMove() {
        const allMoves = getAllPossibleMoves('black');
        if (allMoves.length === 0) return null;
        
        let bestMoves = [];
        let bestScore = -Infinity;

        for (const move of allMoves) {
            // Simula el movimiento
            const originalPiece = board[move.to.row][move.to.col];
            board[move.to.row][move.to.col] = board[move.from.row][move.from.col];
            board[move.from.row][move.from.col] = '';

            // Evalúa
            const score = evaluateBoard();

            // Deshace el movimiento
            board[move.from.row][move.from.col] = board[move.to.row][move.to.col];
            board[move.to.row][move.to.col] = originalPiece;

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
            } else if (score === bestScore) {
                bestMoves.push(move);
            }
        }
        
        // Elige movimientos al azar
        const randomIndex = Math.floor(Math.random() * bestMoves.length);
        return bestMoves[randomIndex];
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
                    if (getPieceColor(piece) === 'black') {
                        totalScore += value; // La IA (negra) suma
                    } else {
                        totalScore -= value; // El jugador (blanco) resta
                    }
                }
            }
        }
        return totalScore;
    }

    // Events
    canvas.addEventListener('click', handleCanvasClick);
    
    document.getElementById('reset-game').addEventListener('click', initGame);
    
    document.getElementById('reset-scores').addEventListener('click', () => {
        if (confirm("¿Estás seguro de que quieres borrar todas las puntuaciones?")) {
            localStorage.removeItem('chessPlayers');
            // Recargamos
            location.reload(); 
        }
    });

    const aiCheckbox = document.getElementById('ai-checkbox');
    const aiLevelSelect = document.getElementById('ai-level');

    aiCheckbox.addEventListener('change', () => {
        aiLevelSelect.style.display = aiCheckbox.checked ? 'inline-block' : 'none';
        // Reiniciar para aplicar cambio
        initGame();
    });

    aiLevelSelect.addEventListener('change', () => {
        // Reiniciar para cambio de dificultad
        initGame();
    });

    initGame();
}); 