import { DIFFICULTIES, PLAYER, WORLD } from './config.js';

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

export function createGameState(arena = 1, difficulty = 'easy') {
  const rules = DIFFICULTIES[difficulty];
  return {
    arena,
    difficulty,
    phase: 'capture',
    elapsed: 0,
    player: {
      x: WORLD.width / 2,
      y: WORLD.height - 105,
      radius: PLAYER.radius,
      health: PLAYER.maxHealth,
      shield: PLAYER.maxShield,
      shieldActive: false,
      aim: -Math.PI / 2,
      hitFlash: 0
    },
    capture: { x: WORLD.width / 2, y: WORLD.height / 2, radius: 64, progress: 0, required: rules.captureSeconds },
    turrets: makeTurrets(rules.turrets),
    projectiles: [],
    exits: [
      { side: 'left', x: 25, y: 300, width: 50, height: 120, difficulty: 'easy' },
      { side: 'top', x: 480, y: 25, width: 150, height: 50, difficulty: 'normal' },
      { side: 'right', x: 935, y: 300, width: 50, height: 120, difficulty: 'hard' }
    ],
    nextProjectileId: 1
  };
}
