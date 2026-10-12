/* Cargador local para respetar la política same-origin de Web Worker.
 * El binario JavaScript y el WASM se descargan desde el paquete oficial de Stockfish.js.
 */
(function () {
    'use strict';
    const engineBase = 'https://cdn.jsdelivr.net/npm/stockfish@19.0.1/bin/';
    self.Module = self.Module || {};
    self.Module.locateFile = function (path) {
        return new URL(path, engineBase).href;
    };
    importScripts(engineBase + 'stockfish-19-lite-single.js');
})();
