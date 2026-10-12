/* Adaptador UCI para Stockfish en un Web Worker.
 * Stockfish.js se sirve desde jsDelivr; si no carga o falla, script.js conserva su motor anterior.
 * Stockfish.js está distribuido bajo GPL-3.0: https://github.com/nmrugg/stockfish.js
 */
(function (global) {
    'use strict';

    const ENGINE_URL = 'https://cdn.jsdelivr.net/npm/stockfish@19.0.1/stockfish-19-lite-single.js';
    let worker = null;
    let ready = false;
    let initializing = false;
    let failed = false;
    let pendingResolve = null;
    let pendingReject = null;
    let pendingFen = null;
    let pendingLevel = null;
    let initWaiters = [];
    let searchTimer = null;

    function notifyReady(error) {
        initializing = false;
        const waiters = initWaiters;
        initWaiters = [];
        waiters.forEach(waiter => error ? waiter.reject(error) : waiter.resolve());
    }

    function startSearch() {
        if (!worker || !pendingResolve || !pendingFen || !pendingLevel) return;

        const level = pendingLevel;
        const elo = Number(level.elo) || 1200;
        const skill = Math.max(0, Math.min(20, Math.round((elo - 400) / 100)));
        const supportsUciElo = elo >= 1320;

        worker.postMessage('setoption name Threads value 1');
        worker.postMessage('setoption name Hash value 16');
        worker.postMessage('setoption name Skill Level value ' + skill);
        worker.postMessage('setoption name UCI_LimitStrength value ' + (supportsUciElo ? 'true' : 'false'));
        if (supportsUciElo) {
            worker.postMessage('setoption name UCI_Elo value ' + Math.max(1320, Math.min(3190, elo)));
        }
        worker.postMessage('isready');
    }

    function toFen(board) {
        const rows = board.map(row => {
            let fenRow = '';
            let empty = 0;
            row.forEach(rawPiece => {
                if (!rawPiece) {
                    empty++;
                    return;
                }
                if (empty) {
                    fenRow += empty;
                    empty = 0;
                }
                const piece = String(rawPiece).replace('_promoted', '');
                // En este juego las mayúsculas son negras y las minúsculas son blancas;
                // FEN usa el convenio contrario.
                const lower = piece.toLowerCase();
                const fenPiece = piece === piece.toUpperCase() ? lower : lower.toUpperCase();
                fenRow += fenPiece;
            });
            if (empty) fenRow += empty;
            return fenRow;
        }).join('/');
        // El juego actual no implementa enroque ni captura al paso; se deshabilitan en FEN.
        return rows + ' b - - 0 1';
    }

    function fail(error) {
        failed = true;
        ready = false;
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = null;
        if (pendingReject) pendingReject(error instanceof Error ? error : new Error(String(error)));
        pendingResolve = null;
        pendingReject = null;
        pendingFen = null;
        pendingLevel = null;
        if (worker) {
            worker.terminate();
            worker = null;
        }
        notifyReady(error instanceof Error ? error : new Error(String(error)));
    }

    function handleMessage(event) {
        const line = String(event.data || '').trim();

        if (line === 'uciok') {
            worker.postMessage('setoption name Threads value 1');
            worker.postMessage('setoption name Hash value 16');
            worker.postMessage('isready');
            return;
        }

        if (line === 'readyok') {
            if (!ready) {
                ready = true;
                notifyReady();
            } else if (pendingResolve && pendingFen) {
                worker.postMessage('position fen ' + pendingFen);
                const level = pendingLevel || {};
                const movetime = Math.max(180, Math.min(1400, Number(level.moveTimeMs) || (180 + (Number(level.elo) || 1200) * 0.45)));
                worker.postMessage('go movetime ' + Math.round(movetime));
                if (searchTimer) clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    if (!pendingResolve) return;
                    worker.postMessage('stop');
                    // El worker debe responder bestmove después de stop; este límite evita bloquear la partida.
                    setTimeout(() => {
                        if (pendingResolve) {
                            const reject = pendingReject;
                            pendingResolve = null;
                            pendingReject = null;
                            pendingFen = null;
                            pendingLevel = null;
                            if (reject) reject(new Error('Stockfish tardó demasiado en responder.'));
                        }
                    }, 250);
                }, movetime + 1200);
            }
            return;
        }

        if (line.startsWith('bestmove ')) {
            if (searchTimer) clearTimeout(searchTimer);
            searchTimer = null;
            const uciMove = line.split(/\s+/)[1];
            const resolve = pendingResolve;
            pendingResolve = null;
            pendingReject = null;
            pendingFen = null;
            pendingLevel = null;
            if (resolve) resolve(uciMove && uciMove !== '(none)' ? uciMove : null);
        }
    }

    function initialize() {
        if (ready) return Promise.resolve();
        if (failed) return Promise.reject(new Error('Stockfish no está disponible.'));
        return new Promise((resolve, reject) => {
            initWaiters.push({ resolve, reject });
            if (initializing) return;
            initializing = true;
            try {
                worker = new Worker(ENGINE_URL);
                worker.addEventListener('message', handleMessage);
                worker.addEventListener('error', event => fail(new Error(event.message || 'No se pudo cargar Stockfish.')));
                worker.postMessage('uci');
                setTimeout(() => {
                    if (!ready && initializing) fail(new Error('Tiempo de espera agotado al iniciar Stockfish.'));
                }, 15000);
            } catch (error) {
                fail(error);
            }
        });
    }

    function findBestMove(board, level) {
        return initialize().then(() => new Promise((resolve, reject) => {
            if (pendingResolve) {
                reject(new Error('Stockfish ya está calculando otro movimiento.'));
                return;
            }
            pendingResolve = resolve;
            pendingReject = reject;
            pendingFen = toFen(board);
            pendingLevel = level || { elo: 1200, moveTimeMs: 500 };
            // Cambiar opciones requiere sincronización UCI antes de empezar a buscar.
            ready = true;
            worker.postMessage('setoption name Threads value 1');
            worker.postMessage('setoption name Hash value 16');
            const elo = Number(pendingLevel.elo) || 1200;
            const skill = Math.max(0, Math.min(20, Math.round((elo - 400) / 100)));
            const supportsUciElo = elo >= 1320;
            worker.postMessage('setoption name Skill Level value ' + skill);
            worker.postMessage('setoption name UCI_LimitStrength value ' + (supportsUciElo ? 'true' : 'false'));
            if (supportsUciElo) worker.postMessage('setoption name UCI_Elo value ' + Math.max(1320, Math.min(3190, elo)));
            worker.postMessage('isready');
        }));
    }

    function dispose() {
        if (worker) worker.terminate();
        worker = null;
        ready = false;
        failed = false;
        initializing = false;
    }

    global.StockfishAdapter = Object.freeze({ findBestMove, toFen, dispose });
})(window);
