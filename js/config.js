export const WORLD = { width: 960, height: 600, margin: 34 };

export const RUN = { mazeWidth: 5, mazeHeight: 5 };

export const ECONOMY = { turretReward: 30, bossReward: 150, rerollCost: 20 };

export const DIFFICULTIES = {
  easy: { label: 'Легко', color: '#61f6d2', turrets: 2, captureSeconds: 4, fireDelay: 1.8, bulletSpeed: 155 },
  normal: { label: 'Норма', color: '#ffd166', turrets: 3, captureSeconds: 6, fireDelay: 1.35, bulletSpeed: 190 },
  hard: { label: 'Сложно', color: '#ff5d7a', turrets: 5, captureSeconds: 8, fireDelay: 1.05, bulletSpeed: 225 }
};

export const PLAYER = {
  radius: 15,
  speed: 220,
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
  swordDamage: 2,
  swordRange: 62,
  swordArc: Math.PI * .72,
  swordAttackSeconds: .3,
  swordCooldownSeconds: .18
};

export const BOSS = {
  radius: 38,
  health: 24,
  fireDelay: .72,
  bulletSpeed: 215
};
