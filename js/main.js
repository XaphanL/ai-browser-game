import { createGameState } from './state.js';
import { createInput } from './input.js';
import { updateGame } from './game.js';
import { createRenderer } from './renderer.js';
import { createUi } from './ui.js';
import { ECONOMY } from './config.js';
import { buyModule, buyUpgrade, createRunState, drawOffers, MODULES } from './upgrades.js';
import { markTransition } from './maze.js';
import { createMinimap } from './minimap.js';

const canvas = document.querySelector('#game');
const input = createInput(canvas);
const renderGame = createRenderer(canvas);
const renderMinimap = createMinimap(document.querySelector('#minimap'));
const ui = createUi();
let run = createRunState();
let state = createGameState(run.maze.rooms.get(run.currentRoomId), run);
run.roomStates.set(run.currentRoomId, state);
let previousTime = performance.now();
let pendingRoom = null;
let currentOffers = [];
let purchasedOffers = new Set();
let shopMode = 'upgrade';
const shop = document.querySelector('#shop');
const shopCards = document.querySelector('#shop-cards');
const shopScore = document.querySelector('#shop-score');
const reroll = document.querySelector('#reroll');
const shopContinue = document.querySelector('#shop-continue');

function clearInput() {
  input.keys.clear();
  input.shield = false;
  input.attack = false;
  input.ability = false;
}

function playerSnapshot(player) {
  return {
    health: player.health,
    shield: player.shield,
    armor: player.armor.map(facet => ({ ...facet })),
    aim: player.aim
  };
}

function placeAtEntrance(player, exitSide) {
  const positions = {
    left: { x: 880, y: 300, aim: Math.PI },
    right: { x: 80, y: 300, aim: 0 },
    top: { x: 480, y: 520, aim: -Math.PI / 2 },
    bottom: { x: 480, y: 80, aim: Math.PI / 2 }
  };
  Object.assign(player, positions[exitSide]);
}

function enterRoom(targetId, exitSide) {
  const snapshot = playerSnapshot(state.player);
  const target = run.maze.rooms.get(targetId);
  state = run.roomStates.get(targetId) || createGameState(target, run);
  run.roomStates.set(targetId, state);
  Object.assign(state.player, snapshot, { shieldActive: false, attackTimer: 0, attackCooldown: 0 });
  placeAtEntrance(state.player, exitSide);
  markTransition(run, run.currentRoomId, targetId);
  clearInput();
}

function reset() {
  run = createRunState();
  state = createGameState(run.maze.rooms.get(run.currentRoomId), run);
  run.roomStates.set(run.currentRoomId, state);
  pendingRoom = null;
  shop.hidden = true;
  clearInput();
}

function continueRun() {
  shop.hidden = true;
  state.phase = pendingRoom.previousPhase;
  if (pendingRoom.targetId) enterRoom(pendingRoom.targetId, pendingRoom.side);
  pendingRoom = null;
}

function renderShop() {
  shopScore.textContent = `${run.score} очков`;
  reroll.hidden = shopMode === 'merchant';
  reroll.disabled = run.score < ECONOMY.rerollCost;
  document.querySelector('#shop-kicker').textContent = shopMode === 'merchant' ? 'КОМНАТА ТОРГОВЦА' : 'МЕЖДУ АРЕНАМИ';
  document.querySelector('#shop-title').textContent = shopMode === 'merchant' ? 'Улучшения и классовые модули' : 'Магазин улучшений';
  shopContinue.textContent = shopMode === 'merchant' ? 'Покинуть торговца' : 'Продолжить';
  const offers = shopMode === 'merchant' ? [...currentOffers, ...MODULES] : currentOffers;
  shopCards.replaceChildren(...offers.map(upgrade => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'upgrade-card';
    const isModule = MODULES.includes(upgrade);
    card.disabled = run.score < upgrade.price || (isModule ? run.module === upgrade.id : purchasedOffers.has(upgrade.id));
    if (isModule) card.classList.add('module-card');
    card.innerHTML = `<strong>${upgrade.title}</strong><span>${upgrade.description}</span><em>${upgrade.price} очков</em>`;
    card.addEventListener('click', () => {
      const bought = isModule ? buyModule(run, upgrade) : buyUpgrade(run, upgrade);
      if (bought) {
        if (!isModule) purchasedOffers.add(upgrade.id);
        renderShop();
      }
    });
    return card;
  }));
}

function openShop(targetId, side, mode = 'upgrade') {
  shopMode = mode;
  currentOffers = drawOffers();
  purchasedOffers = new Set();
  pendingRoom = { targetId, side, previousPhase: state.phase };
  state.phase = 'shop';
  clearInput();
  renderShop();
  shop.hidden = false;
}

reroll.addEventListener('click', () => {
  if (run.score < ECONOMY.rerollCost) return;
  run.score -= ECONOMY.rerollCost;
  currentOffers = drawOffers();
  purchasedOffers = new Set();
  renderShop();
});
shopContinue.addEventListener('click', continueRun);
ui.restart.addEventListener('click', reset);

function frame(time) {
  const dt = Math.min((time - previousTime) / 1000, .033);
  previousTime = time;
  const events = updateGame(state, input, dt);
  for (const event of events) {
    if (event.type !== 'nextArena') continue;
    if (run.visited.has(event.targetId)) enterRoom(event.targetId, event.side);
    else if (run.maze.rooms.get(event.targetId).type === 'merchant') {
      enterRoom(event.targetId, event.side);
      openShop(null, null, 'merchant');
    } else openShop(event.targetId, event.side);
  }
  renderGame(state);
  renderMinimap(run);
  ui.render(state);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
