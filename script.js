document.addEventListener('DOMContentLoaded', () => {

    const canvas = document.getElementById('chessBoard');
    const ctx = canvas.getContext('2d');

    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');

    const start2pButton = document.getElementById('start-2p-button');
    const startAiButton = document.getElementById('start-ai-button');
    const aiLevelSelection = document.getElementById('ai-level-selection');
    const aiLevelSelect = document.getElementById('ai-level-start');
    //const summaryP1 = document.getElementById('summary-p1');
    //const summaryP2 = document.getElementById('summary-p2');
    const resetScoresStartButton = document.getElementById('reset-scores-start');

    const player1NameElem = document.getElementById('player1-name');
    const player1ScoreElem = document.getElementById('player1-score');
    const player2NameElem = document.getElementById('player2-name');
    const player2ScoreElem = document.getElementById('player2-score');
    const player1InfoElem = document.getElementById('player1-info');
    const player2InfoElem = document.getElementById('player2-info');
    const mainMenuButton = document.getElementById('main-menu-button');

    const gameOverModal = document.getElementById('game-over-modal');
    const winnerMessage = document.getElementById('winner-message');
    const modalMenuButton = document.getElementById('modal-menu-button');

    //sonido

    const menuMusic = document.getElementById('menu-music');
    const menuMusic2 = document.getElementById('menu-music2');
    const gameMusic = document.getElementById('game-music');

    gameMusic.volume = 0.4;
    menuMusic.volume = 0.4;
    menuMusic2.volume = 0.4;

    const moveSound = new Audio('assets/move.wav');
    const captureSound = new Audio('assets/hit.mp3');

    const musicCheckbox = document.getElementById('music-checkbox');
    const soundEffectsCheckbox = document.getElementById('sound-effects-checkbox');
    const moveGuideCheckbox = document.getElementById('move-guide-checkbox');
    const threatGuideCheckbox = document.getElementById('threat-guide-checkbox');
    let opponentThreats = [];

    //setting

    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsButton = document.getElementById('close-settings');

    let size;
    let squareSize;

    let players = [];
    let currentPlayerIndex;
    let board = [];
    let selectedPiece = null;
    let validMoves = [];
    let isAiActive = false;
    let aiDifficulty = 'expert';
    let isAiThinking = false;

    let isAnimating = false;
    let animationDetails = null;
    const globalJumpDuration = 500;
    const globalJumpHeight = 0.8;
    const globalJumpParticles = 30;
    const globalJumpGravity = 0.2;
    let particleExplosion = null;

    //ONLINE

    const startOnlineButton = document.getElementById('start-online-button');
    const onlineSetupSection = document.getElementById('online-setup');
    const myNameInput = document.getElementById('my-name-input');
    const opponentNameInput = document.getElementById('opponent-name-input');
    const connectByNameButton = document.getElementById('connect-by-name-button');
    const connectionStatus = document.getElementById('connection-status');

    const db = firebase.database();

    let peer;
    let connection;
    let myPlayerColor = null;
    let playerColor = null;
    let myName = '';
    let opponentName = '';

    const pieces = {
        'R': '♜', 'N': '♞', 'B': '♝', 'Q': '♛', 'K': '♚', 'P': '♟', // Negras
        'r': '♖', 'n': '♘', 'b': '♗', 'q': '♕', 'k': '♔', 'p': '♙'  // Blancas
    };

    const pieceValues = {
        'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 100
    };

    //capturas 

    // const whiteCapturedElem = document.getElementById("white-captured");
    // const blackCapturedElem = document.getElementById("black-captured");
    // const whitePlayerNameElem = document.getElementById("white-player-name");
    // const blackPlayerNameElem = document.getElementById("black-player-name");

    // let capturedPieces = {
    //     white: [],
    //     black: []
    // };

    // function addCapturedPiece(piece, capturerColor) {
    //     if (capturerColor === "white") {
    //         capturedPieces.white.push(piece);
    //         renderCapturedPieces("white");
    //     } else {
    //         capturedPieces.black.push(piece);
    //         renderCapturedPieces("black");
    //     }
    // }

    // function renderCapturedPieces(color) {
    //     const container = (color === "white") ? whiteCapturedElem : blackCapturedElem;
    //     container.innerHTML = "";
    //     capturedPieces[color].forEach(p => {
    //         const span = document.createElement("span");
    //         span.textContent = pieces[p] || p; // usa el diccionario de símbolos
    //         container.appendChild(span);
    //     });
    // }

    // function resetCapturedPieces() {
    //     capturedPieces.white = [];
    //     capturedPieces.black = [];
    //     renderCapturedPieces("white");
    //     renderCapturedPieces("black");
    // }



    // MEJORAS /////////////////////////////////////////////////////////////////////////////////////////////////

    let transpositionTable = {}; // memoria IA
    let zobristKeys = {};      // claves piezas / casillas
    let moveHistory = [];      // registra movimientos

    const searchDepth = 3;

    function initZobrist() {
        zobristKeys = {};
        const pieces = ['P', 'N', 'B', 'R', 'Q', 'K', 'p', 'n', 'b', 'r', 'q', 'k'];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                zobristKeys[`${r},${c}`] = {};
                for (const piece of pieces) {
                    zobristKeys[`${r},${c}`][piece] = Math.floor(Math.random() * Math.pow(2, 53));
                }
            }
        }
    }

    function getBoardHash() {
        let hash = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece) {
                    hash ^= zobristKeys[`${r},${c}`][piece];
                }
            }
        }
        return hash;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////

    //OTROS LOCALSTORE, SOUNDS

    //Guarda en localStorage
    function saveScores() {
        if (players.length === 2 && !players[0].isAI && !players[1].isAI) {
            localStorage.setItem('chessPlayers', JSON.stringify(players));
        }
    }


    //CONEXIÓN ONLINE -----------------------------------------------------------------------------------------

    function initializeOnlineMode() {
        onlineSetupSection.classList.remove('hidden');
        connectByNameButton.disabled = true; // Deshabilita el botón al principio

        if (!peer || peer.disconnected) {
            connectionStatus.textContent = 'Estableciendo conexión segura...';
            peer = new Peer();

            peer.on('open', (id) => {
                connectionStatus.textContent = 'Conexión lista. Ingresa los nombres.';
                connectByNameButton.disabled = false; // Habilita el botón cuando estemos listos
            });

            peer.on('connection', (conn) => {
                connection = conn;
                setupConnectionEvents();
                myPlayerColor = 'black'; // El que recibe la conexión es Negras
            });

            peer.on('error', (err) => {
                console.error(err);
                connectionStatus.textContent = `Error: ${err.message}`;
            });
        } else {
            // Si el objeto peer ya existe y está conectado
            connectionStatus.textContent = 'Conexión lista. Ingresa los nombres.';
            connectByNameButton.disabled = false;
        }
    }

    function registerAndConnect() {
        myName = myNameInput.value.trim().toLowerCase();
        opponentName = opponentNameInput.value.trim().toLowerCase();

        if (!myName || !opponentName) {
            connectionStatus.textContent = 'Debes ingresar ambos nombres.';
            return;
        }

        if (!peer || !peer.id) {
            connectionStatus.textContent = 'Aún conectando... Intenta de nuevo en un segundo.';
            return;
        }

        connectionStatus.textContent = 'Registrando tu nombre...';
        const playerRef = db.ref('players/' + myName);
        playerRef.set({ peerId: peer.id, timestamp: Date.now() });

        connectionStatus.textContent = `Esperando a ${opponentName}...`;
        const opponentRef = db.ref('players/' + opponentName);

        opponentRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && data.peerId) {
                opponentRef.off();
                connectionStatus.textContent = `¡${opponentName} encontrado! Conectando...`;
                connection = peer.connect(data.peerId);
                myPlayerColor = 'white'; // El que inicia la conexión es Blancas
                setupConnectionEvents();
            }
        });
    }

    function setupConnectionEvents() {
        connection.on('open', () => {
            if (myPlayerColor === 'white') {
                connection.send({
                    type: 'init',
                    board: board,
                    currentPlayerIndex: 0
                });
            }
            connectionStatus.textContent = "Conexión establecida. Esperando nombre del oponente...";
            startGame(false, true);

            if (myPlayerColor === 'white') {
                currentPlayerIndex = 0; // Blancas
            } else {
                currentPlayerIndex = 1; // Negras
            }

            updateTurnIndicator();
            drawGame();
        });

        connection.on('data', (data) => {
            if (data.type === 'init') {
                opponentName = data.name;
                board = data.boardState;
                currentPlayerIndex = data.currentPlayerIndex;
                startGame(false, true);

                // 👇 Ajuste aquí también al recibir la data inicial
                if (myPlayerColor === 'white') {
                    currentPlayerIndex = 0;
                } else {
                    currentPlayerIndex = 1;
                }
                updateTurnIndicator();
                drawGame();
            } else if (data.type === 'move') {
                //board = data.boardState;
                animateMove(data.move, true);
            }
        });
    }


    // PANTALLA -----------------------------------------------------------------------

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

    //Pantalla de inicio
    function showStartScreen() {
        document.getElementById("start-screen").classList.remove("hidden");
        document.getElementById("game-screen").classList.add("hidden");
        document.activeElement.blur();

        playMusic('menu');

        gameScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');

        resetMenus();

        startAiButton.textContent = "Contra la PC";
        startAiButton.classList.remove('confirm-button');
        isAiSelectorVisible = false;

        //displayScoresSummary();
    }

        // START
    function startGame(vsAI, isOnline = false) {

        playMusic('game'); 

        isAiActive = vsAI;
        if (!isOnline) { // Solo lee la dificultad si no es online
            aiDifficulty = aiLevelSelect.value;
        }
        startScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        setupPlayers(isOnline); // Pasa la bandera online
        initGame();
    }

    function initGame(isOnline = false) {
        resizeCanvas();
        if (!isOnline) {
            //MEJORA ////////////////////////////////////////////////////////
            initZobrist(); //prepara memoria IA
            initializeBoard();
            currentPlayerIndex = 0;
            moveHistory = []; // resetea historial de jugadas
        }

        //resetCapturedPieces();
        //whitePlayerNameElem.textContent = players.find(p => p.color === "white").name;
        //blackPlayerNameElem.textContent = players.find(p => p.color === "black").name;

        selectedPiece = null;
        validMoves = [];
        drawGame();
        updateTurnIndicator();
    }

    function endGame(reason) {

        playMusic('win');

        isAiThinking = true;
        let message = '';

        if (reason === "Jaque Mate") {
            const winner = players[currentPlayerIndex];
            message = `¡Jaque Mate! Gana ${winner.name}`;
            if (!isAiActive) {
                winner.score++;
                saveScores();
            }
        } else if (reason === "Ahogado (Empate)") {
            message = "¡Ahogado! La partida es un empate.";
        }

        winnerMessage.textContent = message;
        updateScoreboard();
        gameOverModal.classList.remove('hidden');
    }

    // Actualiza información pantalla
    function updateScoreboard() {
        player1NameElem.textContent = players[0].name;
        player1ScoreElem.textContent = players[0].score;
        player2NameElem.textContent = players[1].name;
        player2ScoreElem.textContent = players[1].score;
    }

    //indica turno
    function updateTurnIndicator() {
        if (currentPlayerIndex === 0) {
            player1InfoElem.classList.add('active');
            player2InfoElem.classList.remove('active');
        } else {
            player2InfoElem.classList.add('active');
            player1InfoElem.classList.remove('active');
        }
    }

    //TABLERO ------------------------------------------------------------

    //MATRICES

    const pawnEvalWhite = [
        [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0],
        [5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0],
        [1.0,1.0,2.0,3.0,3.0,2.0,1.0,1.0],
        [0.5,0.5,1.0,2.5,2.5,1.0,0.5,0.5],
        [0.0,0.0,0.0,2.0,2.0,0.0,0.0,0.0],
        [0.5,-0.5,-1.0,0.0,0.0,-1.0,-0.5,0.5],
        [0.5,1.0,1.0,-2.0,-2.0,1.0,1.0,0.5],
        [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0]
    ];
    const pawnEvalBlack = pawnEvalWhite.slice().reverse();

    const knightEval = [
        [-5.0,-4.0,-3.0,-3.0,-3.0,-3.0,-4.0,-5.0],
        [-4.0,-2.0,0.0,0.0,0.0,0.0,-2.0,-4.0],
        [-3.0,0.0,1.0,1.5,1.5,1.0,0.0,-3.0],
        [-3.0,0.5,1.5,2.0,2.0,1.5,0.5,-3.0],
        [-3.0,0.0,1.5,2.0,2.0,1.5,0.0,-3.0],
        [-3.0,0.5,1.0,1.5,1.5,1.0,0.5,-3.0],
        [-4.0,-2.0,0.0,0.5,0.5,0.0,-2.0,-4.0],
        [-5.0,-4.0,-3.0,-3.0,-3.0,-3.0,-4.0,-5.0]
    ];

    const bishopEvalWhite = [
        [-2.0,-1.0,-1.0,-1.0,-1.0,-1.0,-1.0,-2.0],
        [-1.0,0.0,0.0,0.0,0.0,0.0,0.0,-1.0],
        [-1.0,0.0,0.5,1.0,1.0,0.5,0.0,-1.0],
        [-1.0,0.5,0.5,1.0,1.0,0.5,0.5,-1.0],
        [-1.0,0.0,1.0,1.0,1.0,1.0,0.0,-1.0],
        [-1.0,1.0,1.0,1.0,1.0,1.0,1.0,-1.0],
        [-1.0,0.5,0.0,0.0,0.0,0.0,0.5,-1.0],
        [-2.0,-1.0,-1.0,-1.0,-1.0,-1.0,-1.0,-2.0]
    ];
    const bishopEvalBlack = bishopEvalWhite.slice().reverse();

    const rookEvalWhite = [
        [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0],
        [0.5,1.0,1.0,1.0,1.0,1.0,1.0,0.5],
        [-0.5,0.0,0.0,0.0,0.0,0.0,0.0,-0.5],
        [-0.5,0.0,0.0,0.0,0.0,0.0,0.0,-0.5],
        [-0.5,0.0,0.0,0.0,0.0,0.0,0.0,-0.5],
        [-0.5,0.0,0.0,0.0,0.0,0.0,0.0,-0.5],
        [-0.5,0.0,0.0,0.0,0.0,0.0,0.0,-0.5],
        [0.0,0.0,0.0,0.5,0.5,0.0,0.0,0.0]
    ];
    const rookEvalBlack = rookEvalWhite.slice().reverse();

    const queenEval = [
        [-2.0,-1.0,-1.0,-0.5,-0.5,-1.0,-1.0,-2.0],
        [-1.0,0.0,0.0,0.0,0.0,0.0,0.0,-1.0],
        [-1.0,0.0,0.5,0.5,0.5,0.5,0.0,-1.0],
        [-0.5,0.0,0.5,0.5,0.5,0.5,0.0,-0.5],
        [0.0,0.0,0.5,0.5,0.5,0.5,0.0,-0.5],
        [-1.0,0.5,0.5,0.5,0.5,0.5,0.0,-1.0],
        [-1.0,0.0,0.5,0.0,0.0,0.0,0.0,-1.0],
        [-2.0,-1.0,-1.0,-0.5,-0.5,-1.0,-1.0,-2.0]
    ];

    // estructura tablero
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

    // color pieza
    function getPieceColor(pieceKey) {
        return (pieceKey === pieceKey.toUpperCase()) ? 'black' : 'white';
    }

    // verifica si piezas no se salen del tablero
    function isValidSquare(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    // Dibujando tablero y piezas, y movimientos ----------------------------------------------

    function drawGame() {
        drawBoard();
        drawPieces();
        highlightSelectedPiece();
        highlightValidMoves();
    }

    // clic en todo el canvas -------------------------
    function handleCanvasClick(event) {
        if ((myPlayerColor && players[currentPlayerIndex].color !== myPlayerColor) || isAiThinking || isAnimating) {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const col = Math.floor(x / squareSize);
        const row = Math.floor(y / squareSize);
        const clickedPieceKey = board[row][col];

        if (selectedPiece) {
            const isValidMove = validMoves.some(move => move.row === row && move.col === col);
            if (isValidMove) {
                animateMove({ from: selectedPiece, to: { row, col } }, false);
            } else {
                if (clickedPieceKey && getPieceColor(clickedPieceKey) === players[currentPlayerIndex].color) {
                    selectPiece(row, col);
                } else {
                    selectedPiece = null;
                    validMoves = [];
                    opponentThreats = [];
                }
                drawGame();
            }
        } else {
            selectPiece(row, col);
            drawGame();
        }
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
                    if (isAnimating && animationDetails.move.from.row === row && animationDetails.move.from.col === col) {
                        continue;
                    }
                    const x = col * squareSize + squareSize / 2;
                    const y = row * squareSize + squareSize / 2;
                    drawSinglePiece(pieceKey, x, y);
                }
            }
        }
    }

    //pintar piezas
    function drawSinglePiece(pieceKey, x, y) {
        const isPromoted = pieceKey.includes('_promoted');
        const normalPieceKey = pieceKey.replace('_promoted', '');

        if (!pieces[normalPieceKey]) return;

        const pieceType = normalPieceKey.toLowerCase();
        const pieceSymbol = pieces[normalPieceKey];
        const color = getPieceColor(normalPieceKey);

        ctx.fillStyle = (color === 'black') ? '#000000' : '#FFFFFF';
        ctx.strokeStyle = (color === 'black') ? '#FFFFFF' : '#000000';
        ctx.lineWidth = 2.5;

        if (isPromoted && pieceType === 'q') {
            // Reina coronada
            ctx.strokeStyle = '#FFA500'; // Borde naranja
        } else if (pieceType === 'k') {
            ctx.strokeStyle = '#87CEEB';
        } else if (pieceType === 'q') {
            ctx.strokeStyle = '#FFC0CB';
        }

        ctx.strokeText(pieceSymbol, x, y);
        ctx.fillText(pieceSymbol, x, y);
    }

    function createBackgroundPieces() {
        const container = document.getElementById('background-container');
        if (!container) return;

        container.innerHTML = '';

        const pieceChars = ['♙', '♘', '♗', '♖', '♕', '♔', '♟', '♞', '♝', '♜', '♛', '♚'];
        const numberOfPieces = 30;

        for (let i = 0; i < numberOfPieces; i++) {
            const pieceSpan = document.createElement('span');

            pieceSpan.textContent = pieceChars[Math.floor(Math.random() * pieceChars.length)];
            pieceSpan.className = 'bg-piece';

            const randomTop = Math.random() * 100;
            const randomLeft = Math.random() * 100;
            const randomSize = Math.random() * 6 + 2;
            const randomOpacity = Math.random() * 0.08 + 0.01;
            const randomRotation = Math.random() * 360 - 180;

            pieceSpan.style.top = `${randomTop}vh`;
            pieceSpan.style.left = `${randomLeft}vw`;
            pieceSpan.style.fontSize = `${randomSize}em`;
            pieceSpan.style.setProperty('--target-opacity', randomOpacity);
            pieceSpan.style.transform = `rotate(${randomRotation}deg)`;

            container.appendChild(pieceSpan);
        }
    }


    // seleccionar pieza
    function selectPiece(row, col) {
        const pieceKey = board[row][col];
        if (pieceKey && getPieceColor(pieceKey) === players[currentPlayerIndex].color) {
            selectedPiece = { piece: pieceKey, row, col };
            validMoves = getValidMoves(pieceKey, row, col);
            updateThreats(); 
        }
    }

    // Resalta camino y pieza
    function highlightSelectedPiece() {
        if (selectedPiece && (moveGuideCheckbox.checked || threatGuideCheckbox.checked)) {
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 3;
            ctx.strokeRect(selectedPiece.col * squareSize, selectedPiece.row * squareSize, squareSize, squareSize);
        }
    }

    // Dibuja círculo
    function drawCircle(col, row, color) {
        const x = col * squareSize + squareSize / 2;
        const y = row * squareSize + squareSize / 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, squareSize / 4, 0, 2 * Math.PI);
        ctx.fill();
    }

    //amenazas
    function highlightValidMoves() {
        if (!selectedPiece) return;

        const threatSet = new Set(opponentThreats.map(t => `${t.row},${t.col}`));

        // movimientos legales
        validMoves.forEach(move => {
            const isThreatened = threatSet.has(`${move.row},${move.col}`);

            if (moveGuideCheckbox.checked) {
                // si guia activa, dibuja verde
                let color = 'rgba(76, 175, 80, 0.5)'; 

                // si riesgo activado, dibuja rojo
                if (isThreatened && threatGuideCheckbox.checked) {
                    color = 'rgba(255, 80, 80, 0.6)'; // Rojo
                }
                
                drawCircle(move.col, move.row, color);

            } else if (threatGuideCheckbox.checked && isThreatened) {
                // si solo riesgo activado, dibuja rojo
                drawCircle(move.col, move.row, 'rgba(255, 80, 80, 0.6)'); // Rojo
            }
        });

        // si amenaza activa, marca potencialmente riesgoso
        if (threatGuideCheckbox.checked && selectedPiece.piece.toLowerCase().replace('_promoted', '') === 'p') {
            const color = getPieceColor(selectedPiece.piece);
            const direction = color === 'white' ? -1 : 1;
            const newRow = selectedPiece.row + direction;

            [-1, 1].forEach(side => {
                const newCol = selectedPiece.col + side;
                if (isValidSquare(newRow, newCol)) {
                    const isThreatened = threatSet.has(`${newRow},${newCol}`);
                    const isEmpty = board[newRow][newCol] === '';
                    
                    if (isEmpty && isThreatened) {
                        drawCircle(newCol, newRow, 'rgba(255, 165, 0, 0.5)'); // Naranja
                    }
                }
            });
        }
    }

    function updateThreats() {
        const opponentColor = players[1 - currentPlayerIndex].color;
        const allOpponentMoves = getAllPossibleMoves(opponentColor, true); // Búsqueda bruta
        
        const threatSet = new Set();
        allOpponentMoves.forEach(move => {
            threatSet.add(`${move.to.row},${move.to.col}`);
        });
        
        opponentThreats = Array.from(threatSet).map(coord => {
            const [row, col] = coord.split(',');
            return { row: parseInt(row), col: parseInt(col) };
        });
    }

    //Animar movimientos ---------------------------------------------------------------------

    function animateMove(data, isRemoteMove = false) {
        const move = isRemoteMove ? data.move : data;
        const pieceToAnimate = isRemoteMove ? move.piece : board[move.from.row][move.from.col];

        if (!pieceToAnimate) return;

        const targetPiece = board[move.to.row][move.to.col];
        const fromX = move.from.col * squareSize + squareSize / 2;
        const fromY = move.from.row * squareSize + squareSize / 2;
        const toX = move.to.col * squareSize + squareSize / 2;
        const toY = move.to.row * squareSize + squareSize / 2;

        animationDetails = {
            piece: pieceToAnimate,
            fromX, fromY, toX, toY,
            isCapture: targetPiece !== '',
            capturedPiece: targetPiece,
            startTime: performance.now(),
            duration: globalJumpDuration,
            move: move,
            isRemote: isRemoteMove,
            boardState: isRemoteMove ? data.boardState : null
        };

        isAnimating = true;
        requestAnimationFrame(animationLoop);
    }

    // crear explosión

    function createExplosion(x, y, piece) {
        const particles = [];
        const color = getPieceColor(piece);

        for (let i = 0; i < globalJumpParticles; i++) {
            particles.push({
                x: x,
                y: y,
                // Velocidad y dirección
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.7) * 10,
                radius: Math.random() * 3 + 1,
                color: (color === 'black') ? `rgba(0, 0, 0, ${Math.random()})` : `rgba(255, 255, 255, ${Math.random()})`,
                life: 30 + Math.random() * globalJumpParticles // frames partícula
            });
        }
        particleExplosion = particles;
    }

    //seguir animación
    function animationLoop(timestamp) {
        const elapsedTime = timestamp - animationDetails.startTime;
        let progress = elapsedTime / animationDetails.duration;
        if (progress > 1) {
            progress = 1;
        }

        drawGame();

        if (animationDetails.isCapture) {
            drawSinglePiece(animationDetails.capturedPiece, animationDetails.toX, animationDetails.toY);
        }

        const currentX = animationDetails.fromX + (animationDetails.toX - animationDetails.fromX) * progress;
        const jumpHeight = squareSize * globalJumpHeight;
        const parabolicProgress = -4 * jumpHeight * progress * (progress - 1);
        const currentY = animationDetails.fromY + (animationDetails.toY - animationDetails.fromY) * progress - parabolicProgress;

        drawSinglePiece(animationDetails.piece, currentX, currentY);

        if (progress < 1) {
            requestAnimationFrame(animationLoop);
        } else {
            if (animationDetails.isCapture) {

                playSound(captureSound);

                if (!animationDetails.isRemote) {
                    board[animationDetails.move.to.row][animationDetails.move.to.col] = '';
                }
                createExplosion(animationDetails.toX, animationDetails.toY, animationDetails.capturedPiece);
                requestAnimationFrame(explosionLoop);
            } else {

                playSound(moveSound);

                isAnimating = false;
                makeMove(animationDetails.move.from, animationDetails.move.to, animationDetails.isRemote, animationDetails.boardState);
            }
        }
    }

    //seguir explosión
    function explosionLoop() {
        if (!particleExplosion || particleExplosion.length === 0) {
            isAnimating = false;
            makeMove(animationDetails.move.from, animationDetails.move.to, animationDetails.isRemote, animationDetails.boardState);
            return;
        }

        drawGame();

        drawSinglePiece(animationDetails.piece, animationDetails.toX, animationDetails.toY);

        // Actualiza y dibuja cada partícula
        for (let i = particleExplosion.length - 1; i >= 0; i--) {
            const p = particleExplosion[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += globalJumpGravity; // Gravedad
            p.life--;

            if (p.life <= 0) {
                particleExplosion.splice(i, 1); // Elimina partícula
            } else {
                ctx.beginPath();
                ctx.fillStyle = p.color;
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        requestAnimationFrame(explosionLoop);
    }

    // CONFIGURACIONES EN EL JUEGO ----------------------------------------------------------------

    //Configura jugadores..
    function setupPlayers(isOnline = false) {
        if (isOnline) {
            // nombres
            const whitePlayerName = (myPlayerColor === 'white') ? myName : opponentName;
            const blackPlayerName = (myPlayerColor === 'black') ? myName : opponentName;
            players = [
                { name: whitePlayerName, score: 0, color: 'white', isAI: false },
                { name: blackPlayerName, score: 0, color: 'black', isAI: false }
            ];
        } else {
            // 
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
        }
        updateScoreboard();
    }

    // // POSICIONES --------------------------------------------------------------------------

    //posición del rey
    function findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const p = board[row][col];
                if (!p) continue;
                if (p.toLowerCase() === 'k') {
                    // si el color coincide con el pedido, devolvemos
                    if (getPieceColor(p) === color) return { row, col };
                }
            }
        }
        return null;
    }

    //valor de pieza
    function getPieceValue(pieceKey) {
        if (!pieceKey) return 0;
        const pieceType = pieceKey.toLowerCase().replace('_promoted', '');
        const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
        return values[pieceType] || 0;
    }

    //posición de pieza
    function getPiecePositionValue(piece, row, col) {
        const pieceType = piece.toLowerCase();
        switch (pieceType) {
            case 'p': return getPieceColor(piece) === 'white' ? pawnEvalWhite[row][col] : pawnEvalBlack[row][col];
            case 'n': return knightEval[row][col];
            case 'b': return getPieceColor(piece) === 'white' ? bishopEvalWhite[row][col] : bishopEvalBlack[row][col];
            case 'r': return getPieceColor(piece) === 'white' ? rookEvalWhite[row][col] : rookEvalBlack[row][col];
            case 'q': return queenEval[row][col];
            default: return 0;
        }
    }

    //MOVIMIENTOS -----------------------------------------------------------------------------------

    //Peones
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

    //torre
    function getRookMoves(row, col) {
        const moves = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // Arriba, Abajo, Izquierda, Derecha
        return getSlidingMoves(row, col, directions);
    }

    //alfil
    function getBishopMoves(row, col) {
        const moves = [];
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]]; // Diagonales
        return getSlidingMoves(row, col, directions);
    }

    //reina
    function getQueenMoves(row, col) {
        return getRookMoves(row, col).concat(getBishopMoves(row, col));
    }

    //caballo
    function getKnightMoves(row, col) {
        const moves = [];
        const directions = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        const ownColor = getPieceColor(board[row][col]);

        directions.forEach(dir => {
            const newRow = row + dir[0];
            const newCol = col + dir[1];
            if (isValidSquare(newRow, newCol)) {
                const target = board[newRow][newCol];
                if (target === '' || getPieceColor(target) !== ownColor) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        });

        return moves;
    }

    //rey
    function getKingMoves(row, col) {
        const moves = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1], [0, -1],
            [0, 1], [1, -1], [1, 0], [1, 1]
        ];

        const ownColor = getPieceColor(board[row][col]);

        directions.forEach(dir => {
            const newRow = row + dir[0];
            const newCol = col + dir[1];
            if (isValidSquare(newRow, newCol)) {
                const target = board[newRow][newCol];
                if (target === '' || getPieceColor(target) !== ownColor) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        });

        return moves;
    }

    // Función auxiliar para piezas deslizantes (Torre, Alfil, Reina)
    function getSlidingMoves(row, col, directions) {
        const moves = [];
        
        if (!board[row] || board[row][col] === '') return moves;

        const ownColor = getPieceColor(board[row][col]);

        directions.forEach(dir => {
            let newRow = row + dir[0];
            let newCol = col + dir[1];

            while (isValidSquare(newRow, newCol)) {
                const target = board[newRow][newCol];
                if (target === '') {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (getPieceColor(target) !== ownColor) {
                        moves.push({ row: newRow, col: newCol }); // captura
                    }
                    break; // bloqueado por pieza
                }
                newRow += dir[0];
                newCol += dir[1];
            }
        });
        return moves;
    }

    //todos los movimientos
    function getRawValidMoves(piece, row, col) {
        const normalPieceKey = piece.replace('_promoted', '');
        const pieceType = normalPieceKey.toLowerCase();

        switch (pieceType) {
            case 'p': return getPawnMoves(row, col, getPieceColor(normalPieceKey));
            case 'r': return getRookMoves(row, col);
            case 'n': return getKnightMoves(row, col);
            case 'b': return getBishopMoves(row, col);
            case 'q': return getQueenMoves(row, col);
            case 'k': return getKingMoves(row, col);
            default: return [];
        }
    }

    // Obtiene todos los posibles movimientos
    function getAllPossibleMoves(color, isRawSearch = false) {
        const allMoves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && getPieceColor(piece) === color) {
                    // Para la búsqueda bruta, no filtramos por jaque.
                    const moves = isRawSearch ? getRawValidMoves(piece, row, col) : getValidMoves(piece, row, col);
                    moves.forEach(move => {
                        allMoves.push({
                            from: { row, col, piece },
                            to: { row: move.row, col: move.col }
                        });
                    });
                }
            }
        }
        return allMoves;
    }

    //pide movimiento propio
    function quiescenceSearch(alpha, beta, isMaximizingPlayer) {
        let standPat = evaluateBoard();

        if (isMaximizingPlayer) {
            if (standPat >= beta) return beta;
            alpha = Math.max(alpha, standPat);
        } else {
            if (standPat <= alpha) return alpha;
            beta = Math.min(beta, standPat);
        }

        const color = isMaximizingPlayer ? 'black' : 'white';
        const captureMoves = getAllPossibleMoves(color).filter(move => {
            return board[move.to.row][move.to.col] !== '';
        });

        for (const move of captureMoves) {
            const originalPiece = board[move.to.row][move.to.col];
            board[move.to.row][move.to.col] = move.from.piece;
            board[move.from.row][move.from.col] = '';

            let score = quiescenceSearch(alpha, beta, !isMaximizingPlayer);

            board[move.from.row][move.from.col] = move.from.piece;
            board[move.to.row][move.to.col] = originalPiece;

            if (isMaximizingPlayer) {
                alpha = Math.max(alpha, score);
            } else {
                beta = Math.min(beta, score);
            }
            if (alpha >= beta) break;
        }

        return isMaximizingPlayer ? alpha : beta;
    }

    //VALIDACIONES  ---------------------------------------------------------------------------------------------------

    //validar movimientos
    function getValidMoves(piece, row, col) {
        const rawMoves = getRawValidMoves(piece, row, col);
        const legalMoves = [];
        const ownColor = getPieceColor(piece);

        for (const move of rawMoves) {
            // Simula el movimiento
            const originalPiece = board[move.row][move.col];
            board[move.row][move.col] = piece;
            board[row][col] = '';

            const kingPos = findKing(ownColor);
            if (kingPos && !isSquareAttacked(kingPos.row, kingPos.col, ownColor === 'white' ? 'black' : 'white')) {
                legalMoves.push(move);
            }

            // Deshace el movimiento
            board[row][col] = piece;
            board[move.row][move.col] = originalPiece;
        }
        return legalMoves;
    }

    //evalua tablero
    function evaluateBoard() {
        let totalScore = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece) {
                    const value = pieceValues[piece.toLowerCase().replace('_promoted', '')] || 0;
                    const posValue = getPiecePositionValue(piece, row, col);
                    const score = value + posValue;

                    // Bonificación por movilidad
                    const mobility = getRawValidMoves(piece, row, col).length;
                    const mobilityBonus = mobility * 0.1;

                    if (getPieceColor(piece) === 'black') {
                        totalScore += score + mobilityBonus;
                    } else {
                        totalScore -= (score + mobilityBonus);
                    }
                }
            }
        }

        // Bonificación por seguridad del rey
        const whiteKingPos = findKing('white');
        const blackKingPos = findKing('black');
        if (whiteKingPos) {
            // Penalización rey blanco está en centro en medio juego/final
            if (board.flat().filter(p => p).length < 20 && (whiteKingPos.col > 1 && whiteKingPos.col < 6)) {
                totalScore += 1;
            }
        }
        if (blackKingPos) {
            // Bonificación el rey negro está en centro en medio juego/final
            if (board.flat().filter(p => p).length < 20 && (blackKingPos.col > 1 && blackKingPos.col < 6)) {
                totalScore += 1;
            }
        }

        return totalScore;
    }

    //Evalúa si un movimiento es seguro
    function evaluateMoveSafety(move) {
        const tempPiece = board[move.to.row][move.to.col];

        // Mueve temporalmente la pieza
        board[move.to.row][move.to.col] = board[move.from.row][move.from.col];
        board[move.from.row][move.from.col] = '';

        const kingPos = findKing('black');
        let score = 0;

        // Penaliza si el rey queda en jaque
        if (isSquareAttacked(kingPos.row, kingPos.col, 'white')) {
            score -= 1000;
        }

        // Penaliza si la pieza movida puede ser capturada inmediatamente
        const opponentMoves = getAllPossibleMoves('white');
        for (const oppMove of opponentMoves) {
            if (oppMove.to.row === move.to.row && oppMove.to.col === move.to.col) {
                score -= getPieceValue(board[move.to.row][move.to.col]);
            }
        }

        // Bonifica si se mueve a una casilla segura
        if (!opponentMoves.some(opp => opp.to.row === move.to.row && opp.to.col === move.to.col)) {
            score += 50;
        }

        // Deshacer el movimiento
        board[move.from.row][move.from.col] = board[move.to.row][move.to.col];
        board[move.to.row][move.to.col] = tempPiece;

        return score;
    }

    // MEJORA /////////////////////////////////////////////////////////////////////////////

    function isSquareAttacked(row, col, attackerColor) {
        // 1. Revisa ataques de PEONES
        const pawnDirection = (attackerColor === 'white') ? 1 : -1;
        const pawnRow = row + pawnDirection;
        for (let pawnCol of [col - 1, col + 1]) {
            if (isValidSquare(pawnRow, pawnCol)) {
                const p = board[pawnRow][pawnCol];
                if (p && getPieceColor(p) === attackerColor && p.toLowerCase() === 'p') {
                    return true;
                }
            }
        }

        // 2. Revisa ataques de CABALLO
        const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const move of knightMoves) {
            const newRow = row + move[0];
            const newCol = col + move[1];
            if (isValidSquare(newRow, newCol)) {
                const p = board[newRow][newCol];
                if (p && getPieceColor(p) === attackerColor && p.toLowerCase() === 'n') {
                    return true;
                }
            }
        }

        // 3. Revisa ataques de REY
        const kingMoves = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        for (const move of kingMoves) {
            const newRow = row + move[0];
            const newCol = col + move[1];
            if (isValidSquare(newRow, newCol)) {
                const p = board[newRow][newCol];
                if (p && getPieceColor(p) === attackerColor && p.toLowerCase() === 'k') {
                    return true;
                }
            }
        }
        
        // 4. Revisa ataques "deslizantes" (TORRE, ALFIL, REINA)
        const slidingDirections = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
        for (const dir of slidingDirections) {
            let r = row + dir[0];
            let c = col + dir[1];
            while (isValidSquare(r, c)) {
                const p = board[r][c];
                if (p) { // Si encuentra una pieza, la analiza y detiene la búsqueda en esta dirección
                    if (getPieceColor(p) === attackerColor) {
                        const pType = p.toLowerCase().replace('_promoted','');
                        if (pType === 'q' || 
                           ( (dir[0] === 0 || dir[1] === 0) && pType === 'r' ) || 
                           ( (dir[0] !== 0 && dir[1] !== 0) && pType === 'b') ) {
                            return true; // Encontró un atacante
                        }
                    }
                    break; // La vista está bloqueada por otra pieza, ya no sigue
                }
                r += dir[0];
                c += dir[1];
            }
        }

        return false;
    }

    ///////////////////////////////////////////////////////////////////////////////////////

    // LEVELS -----------------------------------------------------------------------------------------------

    //verifica level

    function calculateBestMove() {
        let currentSearchDepth;

        switch (aiDifficulty) {
            case 'easy':
                const easyMoves = getAllPossibleMoves('black');
                if (easyMoves.length === 0) return null;
                return easyMoves[Math.floor(Math.random() * easyMoves.length)];

            case 'intermediate':
                return getExpertMove(0)

            case 'expert':
                return getExpertMove(1)

            default:
                return getEasyMove();
        }
    }

    //movimiento AI
    function triggerAiMove() {
        isAiThinking = true;
        setTimeout(() => {
            const bestMove = calculateBestMove();
            if (bestMove) {
                // La IA llama a la animación
                animateMove(bestMove);
            } else {
                alert("La IA no tiene movimientos. ¿Ahogado?");
                showStartScreen();
            }
            isAiThinking = false;
        }, 50);
    }

    function makeMove(from, to, isRemoteMove = false, boardState = null) {
        // Red
        if (isRemoteMove) {
            board = boardState; // Sincroniza el tablero
            
            // Revisa si el movimiento remoto
            const localKingPos = findKing(myPlayerColor);
            if (!localKingPos || getAllPossibleMoves(myPlayerColor).length === 0) {
                 // Si mi rey no existe o no tengo movimientos, el otro jugador ganó.
                 // Invertimos el turno para que el ganador sea el correcto.
                 currentPlayerIndex = 1 - currentPlayerIndex; 
                 endGame("Jaque Mate");
                 return;
            }

            // Si la partida continúa, simplemente actualiza el turno y la pantalla
            selectedPiece = null;
            validMoves = [];
            currentPlayerIndex = 1 - currentPlayerIndex;
            updateTurnIndicator();
            drawGame();
            return;
        }

        // local
        const movingPiece = board[from.row][from.col];
        //const targetPiece = board[to.row][to.col];

        if (!movingPiece) return;

        const pieceType = movingPiece.toLowerCase().replace('_promoted', '');
        const promotionRank = getPieceColor(movingPiece) === 'white' ? 0 : 7;
        let finalPiece = movingPiece;        

        // if (targetPiece) {
        //     const capturerColor = getPieceColor(movingPiece); 
        //     const normalizedPiece = targetPiece.replace("_promoted", "");
        //     addCapturedPiece(normalizedPiece, capturerColor);
        // }

        if (pieceType === 'p' && to.row === promotionRank) {
            finalPiece = getPieceColor(movingPiece) === 'white' ? 'q_promoted' : 'Q_promoted';
        }
        
        board[to.row][to.col] = finalPiece;
        board[from.row][from.col] = '';

        // Comprobación de fin de partida
        const opponentColor = players[1 - currentPlayerIndex].color;
        const opponentKingPos = findKing(opponentColor);

        if (!opponentKingPos) {
            endGame("Jaque Mate");
            return;
        }

        const opponentMoves = getAllPossibleMoves(opponentColor);

        if (opponentMoves.length === 0) {
            const isCheckmate = isSquareAttacked(opponentKingPos.row, opponentKingPos.col, players[currentPlayerIndex].color);
            endGame(isCheckmate ? "Jaque Mate" : "Ahogado (Empate)");
            return;
        }
        
        // continúa...
        selectedPiece = null;
        validMoves = [];
        currentPlayerIndex = 1 - currentPlayerIndex;
        updateTurnIndicator();
        drawGame();

        // Envía los datos a la red
        if (myPlayerColor && !isRemoteMove) {
            connection.send({ 
                type: 'move', 
                move: { from, to, piece: finalPiece },
                boardState: board 
            });
        }

        // Activa IA
        if (players[currentPlayerIndex]?.isAI && !myPlayerColor) {
            triggerAiMove();
        }
    }

    //para fácil default
    function getEasyMove() {
        const allMoves = getAllPossibleMoves('black');
        if (allMoves.length === 0) return null;
        return allMoves[Math.floor(Math.random() * allMoves.length)];
    }

    // MEJORA /////////////////////////////////////////////////////////////////////////

    function getExpertMove(depth) {
        transpositionTable = {}; // Limpia la memoria en cada turno
        let bestScore = -Infinity;
        let bestMoves = [];
        const allMoves = getAllPossibleMoves('black');

        // Ordena los movimientos para que la poda sea más efectiva (capturas primero)
        allMoves.sort((a, b) => getPieceValue(board[b.to.row][b.to.col]) - getPieceValue(board[a.to.row][a.to.col]));

        for (const move of allMoves) {
            const originalPiece = board[move.to.row][move.to.col];
            board[move.to.row][move.to.col] = move.from.piece;
            board[move.from.row][move.from.col] = '';

            const score = minimax(depth - 1, -Infinity, Infinity, false);

            board[move.from.row][move.from.col] = move.from.piece;
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

    function minimax(depth, alpha, beta, isMaximizingPlayer) {
        const boardHash = getBoardHash();
        if (transpositionTable[boardHash] && transpositionTable[boardHash].depth >= depth) {
            return transpositionTable[boardHash].score;
        }

        if (depth === 0) {
            return quiescenceSearch(alpha, beta, isMaximizingPlayer);
        }

        const color = isMaximizingPlayer ? 'black' : 'white';
        const allMoves = getAllPossibleMoves(color);

        if (allMoves.length === 0) {
            const kingPos = findKing(color);
            if (kingPos && isSquareAttacked(kingPos.row, kingPos.col, color === 'white' ? 'black' : 'white')) {
                return isMaximizingPlayer ? -Infinity - depth : Infinity + depth; // Jaque mate (prioriza mates más rápidos)
            }
            return 0; // Ahogado
        }

        let bestValue;
        if (isMaximizingPlayer) {
            bestValue = -Infinity;
            for (const move of allMoves) {
                const originalPiece = board[move.to.row][move.to.col];
                board[move.to.row][move.to.col] = move.from.piece;
                board[move.from.row][move.from.col] = '';
                
                const evaluation = minimax(depth - 1, alpha, beta, false);
                
                board[move.from.row][move.from.col] = move.from.piece;
                board[move.to.row][move.to.col] = originalPiece;
                
                bestValue = Math.max(bestValue, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) {
                    break; // Poda Beta
                }
            }
        } else { // Minimizando (jugador blanco)
            bestValue = Infinity;
            for (const move of allMoves) {
                const originalPiece = board[move.to.row][move.to.col];
                board[move.to.row][move.to.col] = move.from.piece;
                board[move.from.row][move.from.col] = '';

                const evaluation = minimax(depth - 1, alpha, beta, true);

                board[move.from.row][move.from.col] = move.from.piece;
                board[move.to.row][move.to.col] = originalPiece;

                bestValue = Math.min(bestValue, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) {
                    break; // Poda Alfa
                }
            }
        }
        
        // Guardado en memoria y retorno del valor FINAL
        transpositionTable[boardHash] = { depth: depth, score: bestValue };
        return bestValue;
    }

    //////////////////////////////////////////////////////////////////////////////////////

    // ajustes generales ----------------------------------------------------------------------------------

    //menu

    function resetMenus() {

        aiLevelSelection.classList.add("hidden");
        onlineSetupSection.classList.add("hidden");

        [start2pButton, startAiButton, startOnlineButton].forEach(btn => {
            btn.classList.remove("active");
            btn.classList.remove("confirm-button"); // Limpia confirm-button si estaba
        });
    }

    start2pButton.addEventListener("click", () => {
        startGame(false);
        resetMenus();
        start2pButton.classList.add("active");
    });

    startAiButton.addEventListener("click", () => {
        resetMenus();
        startAiButton.classList.add("active");
    });

    startOnlineButton.addEventListener("click", () => {

        startAiButton.textContent = "Contra la PC";
        isAiSelectorVisible = false;

        resetMenus();
        startOnlineButton.classList.add("active");
        onlineSetupSection.classList.remove("hidden");
    });

    settingsButton.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
    });

    closeSettingsButton.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });


    //sonido

    function playMusic(track) {
       
        gameMusic.pause();
        menuMusic.pause();
        menuMusic2.pause();

        if (musicCheckbox.checked) {
            if (track === 'menu') menuMusic.play().catch(() => {});
            if (track === 'game') gameMusic.play().catch(() => {});
            if (track === 'win') menuMusic2.play().catch(() => {});
        }
    }

    function playSound(sound) {
        if (soundEffectsCheckbox.checked) {
            sound.currentTime = 0;
            sound.play();
        }
    }

    //para check inicial
    function loadSettings() {
        musicCheckbox.checked = localStorage.getItem('music') === 'true';
        soundEffectsCheckbox.checked = localStorage.getItem('soundEffects') === 'true';
        moveGuideCheckbox.checked = localStorage.getItem('moveGuide') === 'true';
        threatGuideCheckbox.checked = localStorage.getItem('threatGuide') === 'true';
    }

    musicCheckbox.addEventListener('change', () => {
        localStorage.setItem('music', musicCheckbox.checked);
    });

    soundEffectsCheckbox.addEventListener('change', () => {
        localStorage.setItem('soundEffects', soundEffectsCheckbox.checked);
    });

    moveGuideCheckbox.addEventListener('change', () => {
        localStorage.setItem('moveGuide', moveGuideCheckbox.checked);
    });

    threatGuideCheckbox.addEventListener('change', () => {
        localStorage.setItem('threatGuide', threatGuideCheckbox.checked);
        // Si hay una pieza seleccionada, recalculamos y redibujamos
        if (selectedPiece) {
            drawGame();
        }
    });

    let isAiSelectorVisible = false;

    function showAiLevelSelector() {
        aiLevelSelection.classList.remove('hidden');
        startAiButton.textContent = "Iniciar Partida vs PC";
        startAiButton.classList.add('confirm-button');
        isAiSelectorVisible = true;
    }

    //start2pButton.addEventListener('click', () => startGame(false));

    startAiButton.addEventListener('click', () => {
        if (!isAiSelectorVisible) {
            showAiLevelSelector();
        } else {
            startGame(true);
        }
    });

    startOnlineButton.addEventListener('click', initializeOnlineMode);
    connectByNameButton.addEventListener('click', registerAndConnect);

    // mainMenuButton.addEventListener('click', showStartScreen);

    modalMenuButton.addEventListener('click', () => {
        gameOverModal.classList.add('hidden');
        isAiThinking = false;
        myPlayerColor = null; // Resetea el modo online
        showStartScreen();
    });

    resetScoresStartButton.addEventListener('click', () => {
        if (confirm("¿Borrar todas las puntuaciones de 2 jugadores?")) {
            localStorage.removeItem('chessPlayers');
            //displayScoresSummary();
        }
    });

    canvas.addEventListener('click', handleCanvasClick);
    window.addEventListener('resize', resizeCanvas);

    createBackgroundPieces();
    showStartScreen();
    resizeCanvas();
    loadSettings();
});
