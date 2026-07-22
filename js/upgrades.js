import { PLAYER } from './config.js';
import { generateMaze } from './maze.js';

export const UPGRADES = [
  { id: 'hull', title: 'Усиленный корпус', description: '+20 к максимуму прочности', price: 80, apply: stats => { stats.maxHealth += 20; } },
  { id: 'plating', title: 'Композитная обшивка', description: '-10% к получаемому урону', price: 90, apply: stats => { stats.damageTaken *= .9; } },
  { id: 'speed', title: 'Сервоприводы', description: '+10% к скорости движения', price: 70, apply: stats => { stats.speed *= 1.1; } },
  { id: 'damage', title: 'Резонатор клинка', description: '+1 к урону меча', price: 100, apply: stats => { stats.swordDamage += 1; } },
  { id: 'range', title: 'Длинное лезвие', description: '+12 к дальности меча', price: 70, apply: stats => { stats.swordRange += 12; } },
  { id: 'arc', title: 'Широкий замах', description: '+12° к сектору удара', price: 65, apply: stats => { stats.swordArc += Math.PI / 15; } },
  { id: 'tempo', title: 'Боевой привод', description: '+15% к скорости атак', price: 90, apply: stats => { stats.attackSpeed *= 1.15; } },
  { id: 'battery', title: 'Ёмкая батарея', description: '+20 к максимуму щита', price: 80, apply: stats => { stats.maxShield += 20; } },
  { id: 'recharge', title: 'Быстрая зарядка', description: '+25% к восстановлению щита', price: 75, apply: stats => { stats.shieldRecharge *= 1.25; } },
  { id: 'efficiency', title: 'Экономичный барьер', description: '-15% к расходу щита', price: 85, apply: stats => { stats.shieldDrain *= .85; } }
];

export function createRunState() {
  const maze = generateMaze();
  return {
    score: 0,
    maze,
    currentRoomId: maze.startId,
    visited: new Set([maze.startId]),
    traversed: new Set(),
    roomStates: new Map(),
    upgrades: [],
    stats: {
      maxHealth: PLAYER.maxHealth,
      damageTaken: 1,
      speed: PLAYER.speed,
      swordDamage: PLAYER.swordDamage,
      swordRange: PLAYER.swordRange,
      swordArc: PLAYER.swordArc,
      attackSpeed: 1,
      maxShield: PLAYER.maxShield,
      shieldRecharge: PLAYER.shieldRecharge,
      shieldDrain: PLAYER.shieldDrain
    }
  };
}

export function drawOffers(count = 3) {
  const pool = [...UPGRADES];
  for (let index = pool.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  return pool.slice(0, count);
}

export function buyUpgrade(run, upgrade) {
  if (run.score < upgrade.price) return false;
  run.score -= upgrade.price;
  upgrade.apply(run.stats);
  run.upgrades.push(upgrade.id);
  return true;
}
