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

    const gameOverModal = document.getElementById('game-over-modal');
    const winnerMessage = document.getElementById('winner-message');
    const modalMenuButton = document.getElementById('modal-menu-button');

    const menuMusic = document.getElementById('menu-music');
    const menuMusic2 = document.getElementById('menu-music2');
    const gameMusic = document.getElementById('game-music');
    const moveSound = new Audio('assets/move.wav');
    const captureSound = new Audio('assets/hit.mp3');

    gameMusic.volume = 0.6;
    menuMusic2.volume = 0.6;

    let hasInteracted = false;
    document.body.addEventListener('click', () => {
        hasInteracted = true;
    }, { once: true });

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
    let myName = '';
    let opponentName = '';

    const pieces = {
        'R': '♜', 'N': '♞', 'B': '♝', 'Q': '♛', 'K': '♚', 'P': '♟', // Negras
        'r': '♖', 'n': '♘', 'b': '♗', 'q': '♕', 'k': '♔', 'p': '♙'  // Blancas
    };

    const pieceValues = {
        'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 100
    };

    const searchDepth = 8;

    function playSound(sound) {
        sound.currentTime = 0;
        sound.play();
    }

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
            // Envía tu nombre a tu oponente
            connection.send({ type: 'name', name: myName });
            connectionStatus.textContent = "Conexión establecida. Esperando nombre del oponente...";
        });

        connection.on('data', (data) => {
            if (data.type === 'move' && data.boardState) {
                board = data.boardState;
                animateMove(data.move, true);
            } else if (data.type === 'name') {
                opponentName = data.name;
                connectionStatus.textContent = `Conectado con ${opponentName}`;
                
                startGame(false, true);
            }
        });
    }

    ////////////////////////
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

    const pawnEvalWhite = [
        [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
        [1.0, 1.0, 2.0, 3.0, 3.0, 2.0, 1.0, 1.0],
        [0.5, 0.5, 1.0, 2.5, 2.5, 1.0, 0.5, 0.5],
        [0.0, 0.0, 0.0, 2.0, 2.0, 0.0, 0.0, 0.0],
        [0.5, -0.5, -1.0, 0.0, 0.0, -1.0, -0.5, 0.5],
        [0.5, 1.0, 1.0, -2.0, -2.0, 1.0, 1.0, 0.5],
        [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    ];

    const pawnEvalBlack = pawnEvalWhite.slice().reverse();

    const knightEval = [
        [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
        [-4.0, -2.0, 0.0, 0.0, 0.0, 0.0, -2.0, -4.0],
        [-3.0, 0.0, 1.0, 1.5, 1.5, 1.0, 0.0, -3.0],
        [-3.0, 0.5, 1.5, 2.0, 2.0, 1.5, 0.5, -3.0],
        [-3.0, 0.0, 1.5, 2.0, 2.0, 1.5, 0.0, -3.0],
        [-3.0, 0.5, 1.0, 1.5, 1.5, 1.0, 0.5, -3.0],
        [-4.0, -2.0, 0.0, 0.5, 0.5, 0.0, -2.0, -4.0],
        [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0]
    ];

    const bishopEvalWhite = [
        [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
        [-1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0],
        [-1.0, 0.0, 0.5, 1.0, 1.0, 0.5, 0.0, -1.0],
        [-1.0, 0.5, 0.5, 1.0, 1.0, 0.5, 0.5, -1.0],
        [-1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, -1.0],
        [-1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0],
        [-1.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.5, -1.0],
        [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0]
    ];

    const bishopEvalBlack = bishopEvalWhite.slice().reverse();

    const rookEvalWhite = [
        [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        [0.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5],
        [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
        [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
        [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
        [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
        [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
        [0.0, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0]
    ];

    const rookEvalBlack = rookEvalWhite.slice().reverse();

    const queenEval = [
        [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
        [-1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0],
        [-1.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -1.0],
        [-0.5, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5],
        [0.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5],
        [-1.0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.0, -1.0],
        [-1.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, -1.0],
        [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0]
    ];

    function showStartScreen() {

        if (hasInteracted) {
            gameMusic.pause();
            menuMusic2.play();
        }

        gameScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');

        aiLevelSelection.classList.add('hidden');
        startAiButton.textContent = "Contra la PC";
        startAiButton.classList.remove('confirm-button');
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

    // START ONLINE
    function startGame(vsAI, isOnline = false) {

        if (hasInteracted) {
            menuMusic2.pause();
            gameMusic.play();
        }
    
        isAiActive = vsAI;
        if (!isOnline) { // Solo lee la dificultad si no es online
            aiDifficulty = aiLevelSelect.value;
        }
        startScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        setupPlayers(isOnline); // Pasa la bandera online
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
    function setupPlayers(isOnline = false) {
        if (isOnline) {
            const whitePlayerName = (myPlayerColor === 'white') ? myName : opponentName;
            const blackPlayerName = (myPlayerColor === 'black') ? myName : opponentName;
            players = [
                { name: whitePlayerName, score: 0, color: 'white', isAI: false },
                { name: blackPlayerName, score: 0, color: 'black', isAI: false }
            ];
        } else {
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


    // 3. Guarda en localStorage
    function saveScores() {
        if (players.length === 2 && !players[0].isAI && !players[1].isAI) {
            localStorage.setItem('chessPlayers', JSON.stringify(players));
        }
    }

    function endGame(reason) {

        gameMusic.pause();
        menuMusic2.play();

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
                }
                drawGame();
            }
        } else {
            selectPiece(row, col);
            drawGame();
        }
    }

    function selectPiece(row, col) {
        const pieceKey = board[row][col];
        if (pieceKey && getPieceColor(pieceKey) === players[currentPlayerIndex].color) {
            selectedPiece = { piece: pieceKey, row, col };
            validMoves = getValidMoves(pieceKey, row, col);
        }
    }

    function makeMove(from, to, isRemoteMove = false, boardState = null) {

        if (isRemoteMove) {
            if (boardState) {
                board = boardState; // Sincroniza el tablero
            }
            selectedPiece = null;
            validMoves = [];
            currentPlayerIndex = 1 - currentPlayerIndex;
            updateTurnIndicator();
            drawGame();
            return; // Termina ejecución receptor
        }

        //local
        const movingPiece = board[from.row][from.col];
        if (!movingPiece) return;

        const pieceType = movingPiece.toLowerCase().replace('_promoted', '');
        const promotionRank = getPieceColor(movingPiece) === 'white' ? 0 : 7;
        let finalPiece = movingPiece;

        if (pieceType === 'p' && to.row === promotionRank) {
            finalPiece = getPieceColor(movingPiece) === 'white' ? 'q_promoted' : 'Q_promoted';
        }
        
        board[to.row][to.col] = finalPiece;
        board[from.row][from.col] = '';

        // Comprobación de fin de partida...
        const opponentColor = players[1 - currentPlayerIndex].color;
        const opponentKingPos = findKing(opponentColor);
        if (!opponentKingPos) {
            endGame("Jaque Mate");
            return;
        }
        const opponentHasMoves = getAllPossibleMoves(opponentColor).length > 0;
        if (!opponentHasMoves) {
            endGame(isSquareAttacked(opponentKingPos.row, opponentKingPos.col, players[currentPlayerIndex].color) ? "Jaque Mate" : "Ahogado (Empate)");
            return;
        }
        
        // La partida continúa...
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

        // Activa la IA si corresponde
        if (players[currentPlayerIndex]?.isAI && !myPlayerColor) {
            triggerAiMove();
        }
    }

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

    //////////////////
    //posición del rey
    function findKing(color) {
        const kingPiece = (color === 'white') ? 'k' : 'K';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row][col] === kingPiece) {
                    return { row, col };
                }
            }
        }
        return null;
    }
    // Verifica si una casilla específica está siendo atacada por el color opuesto
    function isSquareAttacked(row, col, attackerColor) {
        const allOpponentMoves = getAllPossibleMoves(attackerColor, true); // true para una búsqueda "bruta"
        return allOpponentMoves.some(move => move.to.row === row && move.to.col === col);
    }
    /////////////////

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

            while (isValidSquare(newRow, newCol)) {
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

    // REEMPLAZA ESTA FUNCIÓN
    function calculateBestMove() {
        let currentSearchDepth;

        switch (aiDifficulty) {
            case 'easy':
                return getEasyMove();

            case 'intermediate':
                currentSearchDepth = 4;
                break;

            case 'expert':
                currentSearchDepth = searchDepth;
                break;

            default:
                return getEasyMove();
        }
        return getExpertMove(currentSearchDepth);
    }

    //fácil
    function getEasyMove() {
        const allMoves = getAllPossibleMoves('black');
        if (allMoves.length === 0) return null;
        return allMoves[Math.floor(Math.random() * allMoves.length)];
    }

    // Experto e intermedio
    function getExpertMove(depth) {
        let bestScore = -Infinity;
        let bestMoves = [];
        const allMoves = getAllPossibleMoves('black');

        for (const move of allMoves) {
            // Simula el movimiento
            const originalPiece = board[move.to.row][move.to.col];
            board[move.to.row][move.to.col] = board[move.from.row][move.from.col];
            board[move.from.row][move.from.col] = '';

            // Llama a minimax con profundidad
            const score = minimax(depth - 1, -Infinity, Infinity, false);

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

        if (bestMoves.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * bestMoves.length);
        return bestMoves[randomIndex];
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
        switch (pieceType) {
            case 'p': return getPieceColor(piece) === 'white' ? pawnEvalWhite[row][col] : pawnEvalBlack[row][col];
            case 'n': return knightEval[row][col];
            case 'b': return getPieceColor(piece) === 'white' ? bishopEvalWhite[row][col] : bishopEvalBlack[row][col];
            case 'r': return getPieceColor(piece) === 'white' ? rookEvalWhite[row][col] : rookEvalBlack[row][col];
            case 'q': return queenEval[row][col];
            default: return 0;
        }
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

    let isAiSelectorVisible = false;

    function showAiLevelSelector() {
        aiLevelSelection.classList.remove('hidden');
        startAiButton.textContent = "Iniciar Partida vs PC";
        startAiButton.classList.add('confirm-button');
        isAiSelectorVisible = true;
    }

    start2pButton.addEventListener('click', () => startGame(false));
    
    startAiButton.addEventListener('click', () => {
        if (!isAiSelectorVisible) {
            showAiLevelSelector();
        } else {
            startGame(true);
        }
    });
    
    startOnlineButton.addEventListener('click', initializeOnlineMode);
    connectByNameButton.addEventListener('click', registerAndConnect);
    
    mainMenuButton.addEventListener('click', showStartScreen);
    modalMenuButton.addEventListener('click', () => {
        gameOverModal.classList.add('hidden');
        isAiThinking = false;
        myPlayerColor = null; // Resetea el modo online
        showStartScreen();
    });
    resetScoresStartButton.addEventListener('click', () => {
        if (confirm("¿Borrar todas las puntuaciones de 2 jugadores?")) {
            localStorage.removeItem('chessPlayers');
            displayScoresSummary();
        }
    });

    canvas.addEventListener('click', handleCanvasClick);
    window.addEventListener('resize', resizeCanvas);

    createBackgroundPieces();
    showStartScreen();
    resizeCanvas();
});
