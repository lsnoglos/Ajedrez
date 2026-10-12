/* Configuración de fuerza de la IA por niveles Elo.
 * El Elo es orientativo hasta calibrar el motor mediante torneos de prueba.
 */
(function (global) {
    'use strict';

    const levels = [
        { id: 'elo-400', elo: 400, label: 'Principiante I', category: 'Principiante', depth: 1, blunderChance: 0.42, thinkTimeMs: 120 },
        { id: 'elo-600', elo: 600, label: 'Principiante II', category: 'Principiante', depth: 1, blunderChance: 0.30, thinkTimeMs: 180 },
        { id: 'elo-800', elo: 800, label: 'Principiante III', category: 'Principiante', depth: 1, blunderChance: 0.18, thinkTimeMs: 250 },
        { id: 'elo-1000', elo: 1000, label: 'Intermedio I', category: 'Intermedio', depth: 2, blunderChance: 0.12, thinkTimeMs: 350 },
        { id: 'elo-1200', elo: 1200, label: 'Intermedio II', category: 'Intermedio', depth: 2, blunderChance: 0.08, thinkTimeMs: 500 },
        { id: 'elo-1400', elo: 1400, label: 'Intermedio III', category: 'Intermedio', depth: 3, blunderChance: 0.05, thinkTimeMs: 700 },
        { id: 'elo-1600', elo: 1600, label: 'Intermedio IV', category: 'Intermedio', depth: 3, blunderChance: 0.025, thinkTimeMs: 900 },
        { id: 'elo-1800', elo: 1800, label: 'Experto I', category: 'Experto', depth: 4, blunderChance: 0.015, thinkTimeMs: 1200 },
        { id: 'elo-2000', elo: 2000, label: 'Experto II', category: 'Experto', depth: 4, blunderChance: 0.008, thinkTimeMs: 1600 },
        { id: 'elo-2200', elo: 2200, label: 'Experto III', category: 'Experto', depth: 5, blunderChance: 0.003, thinkTimeMs: 2200 },
        { id: 'elo-2400', elo: 2400, label: 'Experto IV', category: 'Experto', depth: 6, blunderChance: 0, thinkTimeMs: 3000 }
    ];

    function getLevel(id) {
        return levels.find(level => level.id === id) || levels.find(level => level.id === 'elo-1200');
    }

    global.ChessEloConfig = Object.freeze({
        levels: Object.freeze(levels.map(level => Object.freeze(level))),
        getLevel
    });
})(window);
