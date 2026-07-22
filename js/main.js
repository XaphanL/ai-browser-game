import { createGameState } from './state.js';
import { createInput } from './input.js';
import { updateGame } from './game.js';
import { createRenderer } from './renderer.js';
import { createUi } from './ui.js';

const canvas = document.querySelector('#game');
const input = createInput(canvas);
const renderGame = createRenderer(canvas);
const ui = createUi();
let state = createGameState();
let previousTime = performance.now();

function reset(arena = 1, difficulty = 'easy') {
  state = createGameState(arena, difficulty);
  input.keys.clear();
  input.shield = false;
}

ui.restart.addEventListener('click', () => reset());

function frame(time) {
  const dt = Math.min((time - previousTime) / 1000, .033);
  previousTime = time;
  const events = updateGame(state, input, dt);
  for (const event of events) {
    if (event.type === 'nextArena') reset(state.arena + 1, event.difficulty);
  }
  renderGame(state);
  ui.render(state);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
