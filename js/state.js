import { BOSS, DIFFICULTIES, PLAYER, WORLD } from './config.js';

const turretPositions = [
  [150, 140], [810, 145], [150, 455], [810, 455], [480, 105], [480, 495]
];

function makeTurrets(count) {
  const offset = Math.floor(Math.random() * turretPositions.length);
  return Array.from({ length: count }, (_, index) => {
    const position = turretPositions[(index + offset) % turretPositions.length];
    return { id: index, x: position[0], y: position[1], radius: 18, health: 3, cooldown: .5 + Math.random(), flash: 0 };
  });
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
  return {
    arena: room.distance + 1,
    roomId: room.id,
    difficulty,
    roomType: isBossRoom ? 'boss' : (isMerchantRoom ? 'merchant' : 'arena'),
    phase: isBossRoom ? 'boss' : (isMerchantRoom ? 'merchant' : 'capture'),
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
      attackTimer: 0,
      attackCooldown: 0,
      attackHits: [],
      reflectionFlash: 0,
      abilityPressed: false,
      armor: Array.from({ length: PLAYER.armorSides }, () => ({ cells: PLAYER.armorCells, maxCells: PLAYER.armorCells, charge: 0 }))
    },
    capture: (isBossRoom || isMerchantRoom) ? null : { x: WORLD.width / 2, y: WORLD.height / 2, radius: 64, progress: 0, required: rules.captureSeconds },
    merchant: isMerchantRoom ? { x: WORLD.width / 2, y: WORLD.height / 2, interactionRadius: 92 } : null,
    turrets: isBossRoom ? [{
      id: 0, x: WORLD.width / 2, y: 145, radius: BOSS.radius,
      health: BOSS.health, maxHealth: BOSS.health, cooldown: 1.2, flash: 0, boss: true
    }] : (isMerchantRoom ? [] : makeTurrets(rules.turrets)),
    projectiles: [],
    effects: [],
    exits: isBossRoom ? [] : Object.entries(room.neighbors).map(([side, targetId]) => ({
      side, targetId, difficulty: run.maze.rooms.get(targetId).difficulty, ...EXIT_GEOMETRY[side]
    })),
    nextProjectileId: 1,
    run
  };
}
