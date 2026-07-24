import { PLAYER } from './config.js';

export function createUi() {
  const health = document.querySelector('#health');
  const shield = document.querySelector('#shield');
  const armor = document.querySelector('#armor');
  const armorCells = document.querySelector('#armor-cells');
  const score = document.querySelector('#score');
  const momentum = document.querySelector('#momentum');
  const status = document.querySelector('#status');
  const message = document.querySelector('#message');
  const arena = document.querySelector('#arena-number');
  const restart = document.querySelector('#restart');
  return {
    restart,
    render(state) {
      health.value = state.player.health;
      health.max = state.run.stats.maxHealth;
      shield.value = state.player.shield;
      shield.max = state.run.stats.maxShield;
      score.textContent = `Очки: ${state.run.score}`;
      momentum.textContent = state.run.momentum.stacks
        ? `Натиск: ×${state.run.momentum.stacks} · ${state.run.momentum.timer.toFixed(1)}с`
        : 'Натиск: —';
      const cells = state.player.armor.reduce((sum, facet) => sum + facet.cells, 0);
      const maxCells = state.player.armor.reduce((sum, facet) => sum + facet.maxCells, 0);
      armor.textContent = `Броня: ${cells}/${maxCells}`;
      armorCells.replaceChildren(...state.player.armor.map((facet, index) => {
        const segment = document.createElement('span');
        segment.className = 'armor-segment';
        segment.title = `Сегмент ${index + 1}: ${facet.cells} из ${facet.maxCells}`;
        segment.textContent = `${index + 1}:${'●'.repeat(facet.cells)}${'○'.repeat(facet.maxCells - facet.cells)}`;
        return segment;
      }));
      arena.textContent = String(state.arena).padStart(2, '0');
      restart.hidden = state.phase !== 'defeat' && state.phase !== 'victory';
      if (state.phase === 'objective' && state.objective?.type === 'capture') {
        const inside = Math.hypot(state.player.x - state.capture.x, state.player.y - state.capture.y) < state.capture.radius;
        status.textContent = inside ? 'Захват точки' : 'Войдите в зону';
        message.textContent = state.capture.hazardWarning > 0 ? 'ИМПУЛЬС // ПОКИНЬТЕ ЦЕНТР' : '';
      } else if (state.phase === 'escape') {
        status.textContent = 'Выберите следующую арену';
        message.textContent = 'ЗАДАНИЕ ВЫПОЛНЕНО // ВЫХОДЫ ОТКРЫТЫ';
      } else if (state.phase === 'objective' && state.objective?.type === 'clear') {
        status.textContent = `Зачистите комнату: ${state.turrets.length}`;
        message.textContent = state.reinforcements?.warning > 0 ? 'ПОДКРЕПЛЕНИЕ // ЗОНА ВЫСАДКИ' : 'УНИЧТОЖЬТЕ ВСЕХ ПРОТИВНИКОВ';
      } else if (state.phase === 'objective' && state.objective?.type === 'crystals') {
        status.textContent = `Энергокристаллы: ${state.crystals.filter(item => item.health > 0).length}`;
        message.textContent = 'ПОСЛЕ ВЫСТРЕЛА АКТИВИРУЕТСЯ ДРУГОЙ КРИСТАЛЛ';
      } else if (state.phase === 'objective' && state.objective?.type === 'survive') {
        status.textContent = `Продержитесь: ${Math.ceil(state.objective.timer)} с`;
        message.textContent = 'ПЕРЕЖИВИТЕ АТАКУ';
      } else if (state.phase === 'objective' && state.objective?.type === 'hunt') {
        status.textContent = `Командиры: ${state.turrets.filter(item => item.marked).length}`;
        message.textContent = 'УНИЧТОЖЬТЕ ОТМЕЧЕННЫЕ ЦЕЛИ';
      } else if (state.phase === 'shop') {
        status.textContent = 'Магазин улучшений';
        message.textContent = '';
      } else if (state.phase === 'merchant') {
        status.textContent = 'Комната торговца';
        message.textContent = 'РАЗБУДИТЕ КОТА КНОПКОЙ ЩИТА';
      } else if (state.phase === 'boss') {
        status.textContent = 'Комната босса';
        message.textContent = 'УНИЧТОЖЬТЕ СТРАЖА ЛАБИРИНТА';
      } else if (state.phase === 'victory') {
        status.textContent = 'Лабиринт пройден';
        message.textContent = 'ПОБЕДА';
      } else {
        status.textContent = 'Система отключена';
        message.textContent = 'ПОРАЖЕНИЕ';
      }
    }
  };
}
