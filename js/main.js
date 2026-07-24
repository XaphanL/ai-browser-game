import { createGameState } from './state.js';
import { createInput } from './input.js';
import { updateGame } from './game.js';
import { createRenderer } from './renderer.js';
import { createUi } from './ui.js';
import { ECONOMY } from './config.js';
import { buyModule, buyUpgrade, createRunState, drawOffers, MODULES, RARITIES } from './upgrades.js';
import { markTransition } from './maze.js';
import { createMinimap } from './minimap.js';
import { createAdminMenu } from './admin.js';

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
  input.dodge = false;
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

function playerPositionIsFree(candidate) {
  const obstacleHit = state.obstacles.some(obstacle => {
    const closestX = Math.max(obstacle.x - obstacle.width / 2, Math.min(candidate.x, obstacle.x + obstacle.width / 2));
    const closestY = Math.max(obstacle.y - obstacle.height / 2, Math.min(candidate.y, obstacle.y + obstacle.height / 2));
    return Math.hypot(candidate.x - closestX, candidate.y - closestY) < state.player.radius + 8;
  });
  const enemyHit = state.turrets.some(enemy => enemy.health > 0 && Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y) < state.player.radius + enemy.radius + 18);
  const spawnerHit = state.spawners.some(spawner => !spawner.destroyed && Math.hypot(candidate.x - spawner.x, candidate.y - spawner.y) < state.player.radius + spawner.radius + 18);
  return !obstacleHit && !enemyHit && !spawnerHit;
}

function ensureSafePlayerPosition() {
  if (playerPositionIsFree(state.player)) return;
  const origin = { x: state.player.x, y: state.player.y };
  for (const radius of [55, 90, 130, 175]) {
    for (let index = 0; index < 12; index++) {
      const angle = index / 12 * Math.PI * 2;
      const candidate = {
        x: Math.max(55, Math.min(905, origin.x + Math.cos(angle) * radius)),
        y: Math.max(55, Math.min(545, origin.y + Math.sin(angle) * radius))
      };
      if (playerPositionIsFree(candidate)) {
        Object.assign(state.player, candidate);
        return;
      }
    }
  }
}

function syncArmorCapacity() {
  for (const roomState of run.roomStates.values()) {
    roomState.player.armor.forEach((facet, index) => {
      const maxCells = 1 + run.armorBonuses[index] + (run.module === 'retaliation' ? 1 : 0);
      const difference = maxCells - facet.maxCells;
      facet.maxCells = maxCells;
      facet.cells = difference > 0 ? facet.cells + difference : Math.min(facet.cells, maxCells);
    });
  }
}

ensureSafePlayerPosition();

function enterRoom(targetId, exitSide = null, direct = false) {
  const snapshot = playerSnapshot(state.player);
  const target = run.maze.rooms.get(targetId);
  state = run.roomStates.get(targetId) || createGameState(target, run);
  run.roomStates.set(targetId, state);
  Object.assign(state.player, snapshot, { shieldActive: false, attackTimer: 0, attackCooldown: 0, dodgeCooldown: 0, vx: 0, vy: 0 });
  if (exitSide) placeAtEntrance(state.player, exitSide);
  else Object.assign(state.player, { x: 480, y: 495, aim: -Math.PI / 2 });
  ensureSafePlayerPosition();
  if (direct) {
    run.visited.add(targetId);
    run.currentRoomId = targetId;
  } else markTransition(run, run.currentRoomId, targetId);
  clearInput();
}

function enterLowerFloor() {
  const snapshot = playerSnapshot(state.player);
  const lowerFloor = {
    id: 'lower-floor-placeholder', type: 'lowerFloor', difficulty: 'easy',
    distance: state.arena, neighbors: {}
  };
  state = createGameState(lowerFloor, run);
  Object.assign(state.player, snapshot, { x: 480, y: 495, aim: -Math.PI / 2, vx: 0, vy: 0 });
  clearInput();
}

function reset() {
  run = createRunState();
  state = createGameState(run.maze.rooms.get(run.currentRoomId), run);
  run.roomStates.set(run.currentRoomId, state);
  ensureSafePlayerPosition();
  pendingRoom = null;
  shop.hidden = true;
  admin.close();
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
  shopContinue.textContent = shopMode === 'merchant' ? 'Закрыть торговлю' : 'Продолжить';
  const offers = shopMode === 'merchant' ? [...currentOffers, ...MODULES] : currentOffers;
  shopCards.replaceChildren(...offers.map(upgrade => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'upgrade-card';
    const isModule = MODULES.includes(upgrade);
    card.disabled = run.score < upgrade.price || (isModule ? run.module === upgrade.id : purchasedOffers.has(upgrade.id));
    if (isModule) card.classList.add('module-card');
    if (!isModule) card.classList.add(`rarity-${upgrade.rarity}`);
    const rarity = isModule ? 'Классовый модуль' : RARITIES[upgrade.rarity].label;
    card.innerHTML = `<small>${rarity}</small><strong>${upgrade.title}</strong><span>${upgrade.description}</span><em>${upgrade.price} очков</em>`;
    card.addEventListener('click', () => {
      const bought = isModule ? buyModule(run, upgrade) : buyUpgrade(run, upgrade);
      if (bought) {
        syncArmorCapacity();
        if (!isModule) purchasedOffers.add(upgrade.id);
        renderShop();
      }
    });
    return card;
  }));
}

function openShop(targetId, side, mode = 'upgrade') {
  shopMode = mode;
  currentOffers = mode === 'merchant' ? run.merchantOffers : drawOffers(3, run);
  purchasedOffers = mode === 'merchant' ? run.merchantPurchased : new Set();
  pendingRoom = { targetId, side, previousPhase: state.phase };
  state.phase = 'shop';
  clearInput();
  renderShop();
  shop.hidden = false;
}

reroll.addEventListener('click', () => {
  if (run.score < ECONOMY.rerollCost) return;
  run.score -= ECONOMY.rerollCost;
  currentOffers = drawOffers(3, run);
  purchasedOffers = new Set();
  renderShop();
});
shopContinue.addEventListener('click', continueRun);
ui.restart.addEventListener('click', reset);

function adminTeleport(targetId) {
  shop.hidden = true;
  pendingRoom = null;
  enterRoom(targetId, null, true);
}

function restorePlayer() {
  state.player.health = run.stats.maxHealth;
  state.player.shield = run.stats.maxShield;
  state.player.armor.forEach(facet => { facet.cells = facet.maxCells; facet.charge = 0; });
}

function completeRoom() {
  if (state.roomType === 'boss') { state.boss.health = 0; return; }
  if (state.roomType !== 'arena') return;
  state.turrets.length = 0;
  state.spawners.length = 0;
  state.projectiles.length = 0;
  state.crystals.forEach(crystal => { crystal.health = 0; });
  if (state.capture) state.capture.progress = state.capture.required;
  if (state.objective?.type === 'survive') state.objective.timer = 0;
  state.reinforcements = null;
  state.phase = 'escape';
  restorePlayer();
}

function resetCurrentRoom() {
  const snapshot = playerSnapshot(state.player);
  const room = run.maze.rooms.get(run.currentRoomId);
  state = createGameState(room, run);
  run.roomStates.set(room.id, state);
  Object.assign(state.player, snapshot, { health: run.stats.maxHealth, shield: run.stats.maxShield, vx: 0, vy: 0 });
  state.player.armor.forEach(facet => { facet.cells = facet.maxCells; facet.charge = 0; });
  ensureSafePlayerPosition();
  clearInput();
}

const admin = createAdminMenu({
  getRun: () => run,
  teleport: adminTeleport,
  openUpgradeShop: () => openShop(null, null),
  openMerchantShop: () => openShop(null, null, 'merchant'),
  restorePlayer,
  completeRoom,
  resetRoom: resetCurrentRoom
});

function frame(time) {
  const dt = Math.min((time - previousTime) / 1000, .033);
  previousTime = time;
  const events = admin.isOpen() ? [] : updateGame(state, input, dt);
  for (const event of events) {
    if (event.type === 'descend') {
      enterLowerFloor();
      continue;
    }
    if (event.type === 'merchantShop') {
      openShop(null, null, 'merchant');
      continue;
    }
    if (event.type !== 'nextArena') continue;
    if (run.visited.has(event.targetId)) enterRoom(event.targetId, event.side);
    else if (run.maze.rooms.get(event.targetId).type === 'merchant') enterRoom(event.targetId, event.side);
    else {
      const target = run.maze.rooms.get(event.targetId);
      run.roomsSinceShop = (run.roomsSinceShop || 0) + 1;
      if (target.type === 'boss' || run.roomsSinceShop >= 3) {
        run.roomsSinceShop = 0;
        openShop(event.targetId, event.side);
      } else enterRoom(event.targetId, event.side);
    }
  }
  renderGame(state);
  renderMinimap(run);
  ui.render(state);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
