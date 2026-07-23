export const WORLD = { width: 960, height: 600, margin: 34 };

export const RUN = { mazeWidth: 5, mazeHeight: 5 };

export const ECONOMY = { turretReward: 30, swordsmanReward: 40, droneReward: 15, bossReward: 150, rerollCost: 20 };

export const DIFFICULTIES = {
  easy: { label: 'Легко', color: '#61f6d2', turrets: 2, swordsmen: 1, drones: 1, obstacles: 3, captureSeconds: 4, fireDelay: 1.8, bulletSpeed: 155 },
  normal: { label: 'Норма', color: '#ffd166', turrets: 2, swordsmen: 2, drones: 2, obstacles: 5, captureSeconds: 6, fireDelay: 1.35, bulletSpeed: 190 },
  hard: { label: 'Сложно', color: '#ff5d7a', turrets: 3, swordsmen: 3, drones: 3, obstacles: 7, captureSeconds: 8, fireDelay: 1.05, bulletSpeed: 225 }
};

export const PLAYER = {
  radius: 15,
  speed: 220,
  acceleration: 1500,
  deceleration: 1900,
  maxHealth: 100,
  maxShield: 100,
  shieldRadius: 29,
  shieldArc: Math.PI * 0.82,
  shieldDrain: 24,
  shieldRecharge: 15,
  armorRadius: 23,
  armorSides: 8,
  armorCells: 1,
  dashDistance: 150,
  armorChargeHits: 3,
  homingBulletSpeed: 330,
  swordDamage: 1,
  swordRange: 62,
  swordArc: Math.PI * .72,
  swordAttackSeconds: .3,
  swordCooldownSeconds: .18
};

export const ENEMIES = {
  swordsman: { radius: 17, health: 2, speed: 92, shieldRadius: 24, attackRange: 43, windup: .78, cooldown: 1.15, damage: 24, strafe: 24 },
  drone: { radius: 11, health: 1, speed: 142, attackRange: 27, cooldown: .7, damage: 12, strafe: 42 }
};

export const OBSTACLES = {
  destructibleHealth: 2,
  energyDropChance: .22
};

export const BOSS = {
  radius: 38,
  health: 24,
  fireDelay: .72,
  bulletSpeed: 215
};
