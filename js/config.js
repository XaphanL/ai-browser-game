export const WORLD = { width: 960, height: 600, margin: 34 };

export const RUN = { mazeWidth: 5, mazeHeight: 5 };

export const ECONOMY = { turretReward: 18, swordsmanReward: 24, droneReward: 10, bossReward: 150, rerollCost: 20 };

export const DIFFICULTIES = {
  easy: { label: 'Легко', color: '#61f6d2', turrets: 2, swordsmen: 1, drones: 1, obstacles: 3, captureSeconds: 3.4, fireDelay: 1.55, bulletSpeed: 180 },
  normal: { label: 'Норма', color: '#ffd166', turrets: 2, swordsmen: 2, drones: 2, obstacles: 5, captureSeconds: 4.8, fireDelay: 1.15, bulletSpeed: 220 },
  hard: { label: 'Сложно', color: '#ff5d7a', turrets: 3, swordsmen: 3, drones: 3, obstacles: 7, captureSeconds: 6.2, fireDelay: .88, bulletSpeed: 260 }
};

export const PLAYER = {
  radius: 15,
  speed: 220,
  acceleration: 2100,
  turnAcceleration: 3600,
  deceleration: 2800,
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
  dodgeDistance: 105,
  dodgeCooldown: .82,
  armorChargeHits: 3,
  homingBulletSpeed: 330,
  swordDamage: 1,
  swordRange: 62,
  swordArc: Math.PI * .72,
  swordAttackSeconds: .3,
  swordCooldownSeconds: .18
};

export const OBJECTIVES = {
  crystalHealth: 4,
  crystalTelegraphSeconds: .9,
  crystalLaserLockSeconds: .32,
  crystalFireDelay: 2.8,
  crystalSwitchDelay: 1.15,
  crystalLaserDamage: 28,
  survivalSeconds: { easy: 12, normal: 16, hard: 20 }
};

export const ENEMIES = {
  swordsman: { radius: 17, health: 2, speed: 112, shieldRadius: 24, attackRange: 43, windup: .58, cooldown: .95, damage: 24, strafe: 28 },
  drone: { radius: 11, health: 1, speed: 172, attackRange: 27, cooldown: .58, damage: 12, strafe: 48 },
  heavyDrone: { radius: 22, health: 8, speed: 76, attackRange: 34, windup: .9, cooldown: 1.7, damage: 28, strafe: 18 }
};

export const MOMENTUM = { window: 3.2, maxStacks: 8, capturePerStack: .1, rewardPerStack: .12 };
export const REINFORCEMENTS = { warning: .75, firstWave: 3.2, waveGap: 5.5 };

export const SPAWNERS = {
  health: 30,
  radius: 29,
  initialDelay: { crystals: 5.5, survive: 4.5 },
  interval: { easy: 10, normal: 8, hard: 6.5 },
  maxAlivePerSpawner: { easy: 1, normal: 2, hard: 3 }
};

export const OBSTACLES = {
  destructibleHealth: 2,
  energyDropChance: .22
};

export const BOSS = {
  radius: 46, health: 12, cannonHealth: 4, batteryHealth: 1,
  fireDelay: .72, bulletSpeed: 215, laserWarning: 1.15, laserLockSeconds: .38, laserDelay: 2.4,
  overloadWarning: .62, overloadWaveGap: .78, finalOpenSeconds: 1.4, finalClosedSeconds: 1.05
};
