/* Configuración de fuerza de la IA por niveles Elo.
 * El Elo es orientativo hasta calibrar el motor mediante torneos de prueba.
 */
(function (global) {
    'use strict';

    const levels = [
        { id: 'elo-400', elo: 400, label: 'Principiante I', category: 'Principiante', depth: 1, blunderChance: 0.42, nodeBudget: 250 },
        { id: 'elo-600', elo: 600, label: 'Principiante II', category: 'Principiante', depth: 1, blunderChance: 0.30, nodeBudget: 350 },
        { id: 'elo-800', elo: 800, label: 'Principiante III', category: 'Principiante', depth: 1, blunderChance: 0.18, nodeBudget: 500 },
        { id: 'elo-1000', elo: 1000, label: 'Intermedio I', category: 'Intermedio', depth: 2, blunderChance: 0.12, nodeBudget: 700 },
        { id: 'elo-1200', elo: 1200, label: 'Intermedio II', category: 'Intermedio', depth: 2, blunderChance: 0.08, nodeBudget: 900 },
        { id: 'elo-1400', elo: 1400, label: 'Intermedio III', category: 'Intermedio', depth: 3, blunderChance: 0.05, nodeBudget: 1100 },
        { id: 'elo-1600', elo: 1600, label: 'Intermedio IV', category: 'Intermedio', depth: 3, blunderChance: 0.025, nodeBudget: 1400 },
        { id: 'elo-1800', elo: 1800, label: 'Experto I', category: 'Experto', depth: 4, blunderChance: 0.015, nodeBudget: 800 },
        { id: 'elo-2000', elo: 2000, label: 'Experto II', category: 'Experto', depth: 4, blunderChance: 0.008, nodeBudget: 950 },
        { id: 'elo-2200', elo: 2200, label: 'Experto III', category: 'Experto', depth: 4, blunderChance: 0.003, nodeBudget: 1100 },
        { id: 'elo-2400', elo: 2400, label: 'Experto IV', category: 'Experto', depth: 4, blunderChance: 0, nodeBudget: 1250 }
    ];

    function getLevel(id) {
        return levels.find(level => level.id === id) || levels.find(level => level.id === 'elo-1200');
    }

    global.ChessEloConfig = Object.freeze({
        levels: Object.freeze(levels.map(level => Object.freeze(level))),
        getLevel
    });
})(window);
