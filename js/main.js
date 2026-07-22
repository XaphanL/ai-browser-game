import { createGameState } from './state.js';
import { createInput } from './input.js';
import { updateGame } from './game.js';
import { createRenderer } from './renderer.js';
import { createUi } from './ui.js';
import { ECONOMY } from './config.js';
import { buyUpgrade, createRunState, drawOffers } from './upgrades.js';

const canvas = document.querySelector('#game');
const input = createInput(canvas);
const renderGame = createRenderer(canvas);
const ui = createUi();
let run = createRunState();
let state = createGameState(1, 'easy', run);
let previousTime = performance.now();
let pendingArena = null;
const shop = document.querySelector('#shop');
const shopCards = document.querySelector('#shop-cards');
const shopScore = document.querySelector('#shop-score');
const reroll = document.querySelector('#reroll');
const shopContinue = document.querySelector('#shop-continue');

function reset(arena = 1, difficulty = 'easy', newRun = false) {
  if (newRun) run = createRunState();
  state = createGameState(arena, difficulty, run);
  input.keys.clear();
  input.shield = false;
  input.attack = false;
}

function continueRun() {
  shop.hidden = true;
  reset(pendingArena.arena, pendingArena.difficulty);
  pendingArena = null;
}

function renderShop() {
  shopScore.textContent = `${run.score} очков`;
  reroll.disabled = run.score < ECONOMY.rerollCost;
  shopCards.replaceChildren(...drawOffers().map(upgrade => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'upgrade-card';
    card.disabled = run.score < upgrade.price;
    card.innerHTML = `<strong>${upgrade.title}</strong><span>${upgrade.description}</span><em>${upgrade.price} очков</em>`;
    card.addEventListener('click', () => {
      if (buyUpgrade(run, upgrade)) continueRun();
    });
    return card;
  }));
}

function openShop(arena, difficulty) {
  pendingArena = { arena, difficulty };
  state.phase = 'shop';
  input.keys.clear(); input.shield = false; input.attack = false;
  renderShop();
  shop.hidden = false;
}

reroll.addEventListener('click', () => {
  if (run.score < ECONOMY.rerollCost) return;
  run.score -= ECONOMY.rerollCost;
  renderShop();
});
shopContinue.addEventListener('click', continueRun);
ui.restart.addEventListener('click', () => reset(1, 'easy', true));

function frame(time) {
  const dt = Math.min((time - previousTime) / 1000, .033);
  previousTime = time;
  const events = updateGame(state, input, dt);
  for (const event of events) {
    if (event.type === 'nextArena') openShop(state.arena + 1, event.difficulty);
  }
  renderGame(state);
  ui.render(state);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
