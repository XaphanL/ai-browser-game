import { PLAYER } from './config.js';

export function createUi() {
  const health = document.querySelector('#health');
  const shield = document.querySelector('#shield');
  const status = document.querySelector('#status');
  const message = document.querySelector('#message');
  const arena = document.querySelector('#arena-number');
  const restart = document.querySelector('#restart');
  return {
    restart,
    render(state) {
      health.value = state.player.health;
      health.max = PLAYER.maxHealth;
      shield.value = state.player.shield;
      shield.max = PLAYER.maxShield;
      arena.textContent = String(state.arena).padStart(2, '0');
      restart.hidden = state.phase !== 'defeat';
      if (state.phase === 'capture') {
        const inside = Math.hypot(state.player.x - state.capture.x, state.player.y - state.capture.y) < state.capture.radius;
        status.textContent = inside ? 'Захват точки' : 'Войдите в зону';
        message.textContent = '';
      } else if (state.phase === 'escape') {
        status.textContent = 'Выберите следующую арену';
        message.textContent = 'ТОЧКА ЗАХВАЧЕНА // ВЫХОДЫ ОТКРЫТЫ';
      } else {
        status.textContent = 'Система отключена';
        message.textContent = 'ПОРАЖЕНИЕ';
      }
    }
  };
}
