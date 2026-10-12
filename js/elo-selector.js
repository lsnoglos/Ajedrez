/* Renderiza el selector Elo de forma independiente del motor de ajedrez. */
(function () {
    'use strict';

    const select = document.getElementById('ai-level-start');
    if (!select || !window.ChessEloConfig) return;

    const previousValue = select.value;
    const groups = ['Principiante', 'Intermedio', 'Experto'];
    select.replaceChildren();

    groups.forEach(category => {
        const group = document.createElement('optgroup');
        group.label = category;
        window.ChessEloConfig.levels
            .filter(level => level.category === category)
            .forEach(level => {
                const option = document.createElement('option');
                option.value = level.id;
                option.textContent = level.elo + ' Elo — ' + level.label;
                group.appendChild(option);
            });
        select.appendChild(group);
    });

    select.value = window.ChessEloConfig.getLevel(previousValue).id;
    if (!select.value) select.value = 'elo-1200';
})();
