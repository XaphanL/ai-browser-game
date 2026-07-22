import { PLAYER } from './config.js';

export function createUi() {
  const health = document.querySelector('#health');
  const shield = document.querySelector('#shield');
  const armor = document.querySelector('#armor');
  const score = document.querySelector('#score');
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
      const cells = state.player.armor.reduce((sum, facet) => sum + facet.cells, 0);
      const maxCells = state.player.armor.reduce((sum, facet) => sum + facet.maxCells, 0);
      armor.textContent = `Броня: ${cells}/${maxCells}`;
      arena.textContent = String(state.arena).padStart(2, '0');
      restart.hidden = state.phase !== 'defeat' && state.phase !== 'victory';
      if (state.phase === 'capture') {
        const inside = Math.hypot(state.player.x - state.capture.x, state.player.y - state.capture.y) < state.capture.radius;
        status.textContent = inside ? 'Захват точки' : 'Войдите в зону';
        message.textContent = '';
      } else if (state.phase === 'escape') {
        status.textContent = 'Выберите следующую арену';
        message.textContent = 'ТОЧКА ЗАХВАЧЕНА // ВЫХОДЫ ОТКРЫТЫ';
      } else if (state.phase === 'shop') {
        status.textContent = 'Магазин улучшений';
        message.textContent = '';
      } else if (state.phase === 'merchant') {
        status.textContent = 'Комната торговца';
        message.textContent = 'ТОРГОВЕЦ МОДУЛЯМИ';
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
