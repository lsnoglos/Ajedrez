document.addEventListener('DOMContentLoaded', () => {

    const canvas = document.getElementById('chessBoard');
    const ctx = canvas.getContext('2d');
    const size = 400;
    const squareSize = size / 8;

    let players = [];
    let currentPlayerIndex;
    let board = []; // tablero, 8x8
    let selectedPiece = null; // pieza jugador seleccionada

    // DOM
    const player1NameElem = document.getElementById('player1-name');
    const player1ScoreElem = document.getElementById('player1-score');
    const player2NameElem = document.getElementById('player2-name');
    const player2ScoreElem = document.getElementById('player2-score');
    const currentPlayerElem = document.getElementById('current-player');
    const player1InfoElem = document.getElementById('player1-info');
    const player2InfoElem = document.getElementById('player2-info');

    // Piezas
    const pieces = {
        'R': '♜', 'N': '♞', 'B': '♝', 'Q': '♛', 'K': '♚', 'P': '♟', // Negras
        'r': '♖', 'n': '♘', 'b': '♗', 'q': '♕', 'k': '♔', 'p': '♙'  // Blancas
    };

    function initGame() {
        setupPlayers();
        initializeBoard();
        currentPlayerIndex = 0; // Blancas empiezan
        selectedPiece = null;
        drawGame();
        updateTurnIndicator();
    }

    // 2. Configura jugadores..
    function setupPlayers() {
        // localStorage
        const storedPlayers = JSON.parse(localStorage.getItem('chessPlayers'));

        if (storedPlayers) {
            players = storedPlayers;
        } else {
            const player1Name = prompt("Nombre del Jugador 1 (Blancas):", "Jugador 1");
            const player2Name = prompt("Nombre del Jugador 2 (Negras):", "Jugador 2");
            players = [
                { name: player1Name || "Jugador 1", score: 0, color: 'white' },
                { name: player2Name || "Jugador 2", score: 0, color: 'black' }
            ];
            saveScores();
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
        currentPlayerElem.textContent = players[currentPlayerIndex].name;
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

    // 7. clics en canvas
    function handleCanvasClick(event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const col = Math.floor(x / squareSize);
        const row = Math.floor(y / squareSize);
        
        const clickedPieceKey = board[row][col];

        if (selectedPiece) {
            // movimientos
            const targetPieceKey = board[row][col];
            if (targetPieceKey && getPieceColor(targetPieceKey) === players[currentPlayerIndex].color) {
                // otra pieza selecciona
                selectedPiece = { piece: clickedPieceKey, row, col };
            } else {
                movePiece(selectedPiece.row, selectedPiece.col, row, col);
            }
        } else {
            // no hay pieza, selecciona
            if (clickedPieceKey) {
                const pieceColor = getPieceColor(clickedPieceKey);
                if (pieceColor === players[currentPlayerIndex].color) {
                    selectedPiece = { piece: clickedPieceKey, row, col };
                }
            }
        }
        drawGame();
    }

    // 8. Mueve piezas en estructura
    function movePiece(fromRow, fromCol, toRow, toCol) {
        const pieceToMove = board[fromRow][fromCol];
        const targetPiece = board[toRow][toCol];

        // Comprueba si captura al rey
        if (targetPiece.toLowerCase() === 'k') {
            endGame();
            return;
        }

        board[toRow][toCol] = pieceToMove;
        board[fromRow][fromCol] = '';
        selectedPiece = null;
        
        // Cambia turno
        currentPlayerIndex = 1 - currentPlayerIndex;
        updateTurnIndicator();
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
    
    // saber color de pieza
    function getPieceColor(pieceKey) {
        return (pieceKey === pieceKey.toUpperCase()) ? 'black' : 'white';
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

    initGame();
});