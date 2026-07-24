import { BOSS, DIFFICULTIES, ENEMIES, OBJECTIVES, OBSTACLES, PLAYER, SPAWNERS, WORLD } from './config.js';

const turretPositions = [
  [150, 140], [810, 145], [150, 455], [810, 455], [480, 105], [480, 495]
];

function makeTurrets(count, obstacles, startId = 0) {
  const offset = Math.floor(Math.random() * turretPositions.length);
  const available = Array.from({ length: turretPositions.length }, (_, index) => turretPositions[(index + offset) % turretPositions.length])
    .filter(([x, y]) => !obstacles.some(item => overlapsRect({ x, y }, 18, item, 12)));
  return available.slice(0, count).map((position, index) => {
    return { id: startId + index, type: 'turret', x: position[0], y: position[1], radius: 18, health: 2, maxHealth: 2, cooldown: .5 + Math.random(), flash: 0 };
  });
}

const obstacleLayouts = [
  [[300, 215, 90, 42], [660, 385, 90, 42], [480, 150, 54, 80], [480, 450, 54, 80], [245, 420, 70, 44], [715, 180, 70, 44], [350, 470, 64, 38], [480, 300, 56, 56]],
  [[250, 190, 58, 100], [710, 410, 58, 100], [400, 170, 100, 42], [560, 430, 100, 42], [255, 430, 76, 42], [705, 170, 76, 42], [610, 465, 64, 38], [480, 300, 46, 90]]
];

function makeObstacles(count) {
  const layout = obstacleLayouts[Math.floor(Math.random() * obstacleLayouts.length)];
  const capture = { x: WORLD.width / 2, y: WORLD.height / 2 };
  return layout
    .filter(([x, y, width, height]) => !overlapsRect(capture, 64, { x, y, width, height }, 18))
    .slice(0, count)
    .map(([x, y, width, height], index) => {
    const destructible = index % 3 !== 0;
    return { id: index, x, y, width, height, destructible, health: destructible ? OBSTACLES.destructibleHealth : Infinity };
  });
}

function makeCrystals(difficulty) {
  const count = difficulty === 'hard' ? 4 : 3;
  const positions = [[220, 120], [740, 120], [740, 480], [220, 480]];
  return positions.slice(0, count).map(([x, y], index) => ({
    id: index, x, y, radius: 25, health: OBJECTIVES.crystalHealth,
    maxHealth: OBJECTIVES.crystalHealth, active: index === 0,
    cooldown: 1.2 + index * .25, telegraph: 0, targetX: 0, targetY: 0, flash: 0
  }));
}

function overlapsRect(point, radius, rect, padding = 0) {
  const dx = Math.max(Math.abs(point.x - rect.x) - rect.width / 2, 0);
  const dy = Math.max(Math.abs(point.y - rect.y) - rect.height / 2, 0);
  return Math.hypot(dx, dy) < radius + padding;
}

function spawnMobileEnemies(rules, obstacles, occupied, startId) {
  const candidates = [
    [110, 100], [850, 100], [110, 500], [850, 500], [310, 110], [650, 110],
    [310, 490], [650, 490], [110, 300], [850, 300], [380, 230], [580, 370]
  ].sort(() => Math.random() - .5);
  const enemies = [];
  const add = type => {
    const config = ENEMIES[type];
    const position = candidates.find(([x, y]) => {
      const point = { x, y };
      return !obstacles.some(item => overlapsRect(point, config.radius, item, 12))
        && !occupied.some(item => Math.hypot(item.x - x, item.y - y) < item.radius + config.radius + 35);
    });
    if (!position) return;
    candidates.splice(candidates.indexOf(position), 1);
    const enemy = {
      id: startId + enemies.length, type, x: position[0], y: position[1], radius: config.radius,
      health: config.health, maxHealth: config.health, cooldown: .4 + Math.random() * .5, windup: 0,
      flash: 0, shielded: type === 'swordsman', knockbackX: 0, knockbackY: 0,
      navTimer: 0, waypoint: null, strafeSign: Math.random() < .5 ? -1 : 1,
      movementPhase: Math.random() * Math.PI * 2
    };
    enemies.push(enemy);
    occupied.push(enemy);
  };
  for (let index = 0; index < rules.swordsmen; index++) add('swordsman');
  for (let index = 0; index < rules.drones; index++) add('drone');
  return enemies;
}

function makeSpawners(objectiveType, difficulty, obstacles, occupied) {
  if (objectiveType !== 'crystals' && objectiveType !== 'survive') return [];
  const positions = [
    [105, 300], [855, 300], [480, 82], [480, 518],
    [90, 210], [870, 390], [90, 390], [870, 210],
    [360, 72], [600, 528], [600, 72], [360, 528]
  ];
  const types = difficulty === 'easy'
    ? [objectiveType === 'crystals' ? 'drone' : 'swordsman']
    : ['drone', 'swordsman'];
  return types.map((enemyType, index) => {
    const position = positions.find(([x, y]) => {
      const point = { x, y };
      return !obstacles.some(item => overlapsRect(point, SPAWNERS.radius, item, 12))
        && !occupied.some(item => Math.hypot(item.x - x, item.y - y) < item.radius + SPAWNERS.radius + 28);
    });
    if (!position) return null;
    const station = {
      id: `spawner-${index}`, type: enemyType === 'drone' ? 'droneStation' : 'factory', enemyType,
      x: position[0], y: position[1], radius: SPAWNERS.radius, health: SPAWNERS.health,
      maxHealth: SPAWNERS.health, cooldown: SPAWNERS.initialDelay[objectiveType] + index * 1.5,
      flash: 0, destroyed: false
    };
    occupied.push(station);
    return station;
  }).filter(Boolean);
}

const EXIT_GEOMETRY = {
  left: { x: 25, y: 300, width: 50, height: 120 },
  top: { x: 480, y: 25, width: 150, height: 50 },
  right: { x: 935, y: 300, width: 50, height: 120 },
  bottom: { x: 480, y: 575, width: 150, height: 50 }
};

export function createGameState(room, run) {
  const difficulty = room.difficulty;
  const rules = DIFFICULTIES[difficulty];
  const isBossRoom = room.type === 'boss';
  const isMerchantRoom = room.type === 'merchant';
  const objectiveType = (!isBossRoom && !isMerchantRoom) ? (room.objective || 'clear') : null;
  const obstacles = (!isBossRoom && !isMerchantRoom) ? makeObstacles(rules.obstacles) : [];
  const turrets = isBossRoom ? [{
    id: 0, type: 'turret', x: WORLD.width / 2, y: 145, radius: BOSS.radius,
    health: BOSS.health, maxHealth: BOSS.health, cooldown: 1.2, flash: 0, boss: true
  }] : (isMerchantRoom ? [] : makeTurrets(rules.turrets, obstacles));
  const mobileEnemies = (!isBossRoom && !isMerchantRoom) ? spawnMobileEnemies(rules, obstacles, [...turrets], turrets.length) : [];
  const spawners = makeSpawners(objectiveType, difficulty, obstacles, [...turrets, ...mobileEnemies]);
  if (objectiveType === 'hunt') {
    const targets = [...mobileEnemies, ...turrets].slice(0, difficulty === 'hard' ? 3 : 2);
    for (const target of targets) target.marked = true;
  }
  const crystals = objectiveType === 'crystals' ? makeCrystals(difficulty) : [];
  return {
    arena: room.distance + 1,
    roomId: room.id,
    difficulty,
    roomType: isBossRoom ? 'boss' : (isMerchantRoom ? 'merchant' : 'arena'),
    phase: isBossRoom ? 'boss' : (isMerchantRoom ? 'merchant' : 'objective'),
    objective: objectiveType ? {
      type: objectiveType,
      timer: objectiveType === 'survive' ? OBJECTIVES.survivalSeconds[difficulty] : 0,
      required: objectiveType === 'survive' ? OBJECTIVES.survivalSeconds[difficulty] : 0
    } : null,
    elapsed: 0,
    player: {
      x: WORLD.width / 2,
      y: WORLD.height - 105,
      radius: PLAYER.radius,
      health: run.stats.maxHealth,
      shield: run.stats.maxShield,
      shieldActive: false,
      shieldPressed: false,
      aim: -Math.PI / 2,
      hitFlash: 0,
      vx: 0,
      vy: 0,
      attackTimer: 0,
      attackCooldown: 0,
      attackHits: [],
      reflectionFlash: 0,
      abilityPressed: false,
      dodgePressed: false,
      dodgeCooldown: 0,
      armor: Array.from({ length: PLAYER.armorSides }, (_, index) => {
        const maxCells = PLAYER.armorCells + run.armorBonuses[index] + (run.module === 'retaliation' ? 1 : 0);
        return { cells: maxCells, maxCells, charge: 0 };
      })
    },
    capture: objectiveType === 'capture' ? { x: WORLD.width / 2, y: WORLD.height / 2, radius: 64, progress: 0, required: rules.captureSeconds, nextPulse: .34, hazard: 0, hazardWarning: 0 } : null,
    crystals,
    laser: null,
    merchant: isMerchantRoom ? { x: WORLD.width / 2, y: WORLD.height / 2, interactionRadius: 92 } : null,
    turrets: [...turrets, ...mobileEnemies],
    spawners,
    obstacles,
    pickups: [],
    projectiles: [],
    effects: [],
    reinforcements: (!isBossRoom && !isMerchantRoom && objectiveType !== 'capture') ? {
      timer: 3.2, wavesLeft: difficulty === 'hard' ? 2 : 1, warning: 0, portal: null
    } : null,
    exits: isBossRoom ? [] : Object.entries(room.neighbors).map(([side, targetId]) => ({
      side, targetId, difficulty: run.maze.rooms.get(targetId).difficulty, ...EXIT_GEOMETRY[side]
    })),
    nextProjectileId: 1,
    nextEnemyId: turrets.length + mobileEnemies.length,
    run
  };
}
