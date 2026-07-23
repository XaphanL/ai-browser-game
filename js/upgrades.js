import { PLAYER } from './config.js';
import { generateMaze } from './maze.js';

export const RARITIES = {
  common: { label: 'Обычное', weight: 10 },
  uncommon: { label: 'Необычное', weight: 5 },
  rare: { label: 'Редкое', weight: 2 }
};

const upgrade = (id, title, description, price, rarity, apply, requiresModule = null) => ({
  id, title, description, price, rarity, apply, requiresModule
});

export const UPGRADES = [
  upgrade('hull', 'Усиленный корпус', '+20 к максимуму прочности', 110, 'common', run => { run.stats.maxHealth += 20; }),
  upgrade('speed', 'Сервоприводы', '+10% к скорости движения', 105, 'common', run => { run.stats.speed *= 1.1; }),
  upgrade('arc', 'Широкий замах', '+12° к сектору удара', 100, 'common', run => { run.stats.swordArc += Math.PI / 15; }),
  upgrade('battery', 'Ёмкая батарея', '+20 к максимуму щита', 110, 'common', run => { run.stats.maxShield += 20; }),
  upgrade('recharge', 'Быстрая зарядка', '+25% к восстановлению щита', 115, 'common', run => { run.stats.shieldRecharge *= 1.25; }),
  upgrade('plating', 'Композитная обшивка', '-10% к получаемому урону', 165, 'uncommon', run => { run.stats.damageTaken *= .9; }),
  upgrade('range', 'Длинное лезвие', '+12 к дальности меча', 155, 'uncommon', run => { run.stats.swordRange += 12; }),
  upgrade('tempo', 'Боевой привод', '+15% к скорости атак', 170, 'uncommon', run => { run.stats.attackSpeed *= 1.15; }),
  upgrade('efficiency', 'Экономичный барьер', '-15% к расходу щита', 160, 'uncommon', run => { run.stats.shieldDrain *= .85; }),
  upgrade('damage', 'Резонатор клинка', '+1 к урону меча', 250, 'rare', run => { run.stats.swordDamage += 1; }),
  upgrade('armor-cell', 'Адаптивная энергоячейка', '+1 ячейка случайному сегменту брони', 245, 'rare', run => {
    run.armorBonuses[Math.floor(Math.random() * run.armorBonuses.length)]++;
  }),
  upgrade('reflection-damage', 'Усилитель рикошета', '+1 к урону отражённых снарядов', 240, 'rare', run => { run.stats.reflectionDamage += 1; }),
  upgrade('retaliation-charge', 'Накопитель возмездия', 'Граням нужно на 1 поглощённое попадание меньше для ответного выстрела', 175, 'uncommon', run => {
    run.stats.retaliationChargeHits = Math.max(1, run.stats.retaliationChargeHits - 1);
  }, 'retaliation'),
  upgrade('retaliation-damage', 'Карательная боеголовка', '+1 к урону самонаводящихся пуль «Возмездия»', 245, 'rare', run => { run.stats.homingDamage += 1; }, 'retaliation'),
  upgrade('dash-distance', 'Форсаж импульса', '+35 к дистанции рывка', 165, 'uncommon', run => { run.stats.dashDistance += 35; }, 'dash'),
  upgrade('dash-refund', 'Рекуператор импульса', '35% шанс не тратить ячейку при рывке', 235, 'rare', run => {
    run.stats.dashRefundChance = Math.min(.8, run.stats.dashRefundChance + .35);
  }, 'dash'),
  upgrade('vampire-repair', 'Голодный сплав', '+4 к ремонту корпуса за убийство мечом', 165, 'uncommon', run => { run.stats.vampireSwordHeal += 4; }, 'vampire'),
  upgrade('vampire-harvest', 'Глубокий дренаж', 'Любое убийство дополнительно ремонтирует 4 прочности корпуса', 235, 'rare', run => { run.stats.vampireKillHeal += 4; }, 'vampire')
];

export const MODULES = [
  { id: 'retaliation', title: 'Модуль «Возмездие»', description: 'Добавляет каждой грани +1 энергоячейку. Грани копят заряд от попаданий, а способность выпускает самонаводящиеся пули.', price: 400 },
  { id: 'dash', title: 'Модуль «Импульс»', description: 'Меч наносит +1 урон. Способность делает рывок к курсору, расходуя одну энергетическую ячейку.', price: 400 },
  { id: 'vampire', title: 'Модуль «Вампиризм»', description: 'Убийства восстанавливают ячейку брони, а убийства мечом дополнительно ремонтируют корпус.', price: 400 }
];

export function createRunState() {
  const maze = generateMaze();
  const run = {
    score: 0,
    maze,
    currentRoomId: maze.startId,
    visited: new Set([maze.startId]),
    traversed: new Set(),
    roomStates: new Map(),
    upgrades: [],
    module: null,
    armorBonuses: Array(PLAYER.armorSides).fill(0),
    merchantPurchased: new Set(),
    stats: {
      maxHealth: PLAYER.maxHealth, damageTaken: 1, speed: PLAYER.speed,
      swordDamage: PLAYER.swordDamage, swordRange: PLAYER.swordRange, swordArc: PLAYER.swordArc, attackSpeed: 1,
      maxShield: PLAYER.maxShield, shieldRecharge: PLAYER.shieldRecharge, shieldDrain: PLAYER.shieldDrain,
      reflectionDamage: 1, retaliationChargeHits: PLAYER.armorChargeHits, homingDamage: 1,
      dashDistance: PLAYER.dashDistance, dashRefundChance: 0, vampireSwordHeal: 8, vampireKillHeal: 0
    }
  };
  run.merchantOffers = drawOffers(3, run);
  return run;
}

export function drawOffers(count = 3, run = null) {
  const pool = UPGRADES.filter(item => !item.requiresModule || item.requiresModule === run?.module);
  const offers = [];
  while (offers.length < count && pool.length) {
    const totalWeight = pool.reduce((sum, item) => sum + RARITIES[item.rarity].weight, 0);
    let roll = Math.random() * totalWeight;
    let selectedIndex = pool.findIndex(item => {
      roll -= RARITIES[item.rarity].weight;
      return roll <= 0;
    });
    if (selectedIndex < 0) selectedIndex = pool.length - 1;
    offers.push(pool.splice(selectedIndex, 1)[0]);
  }
  return offers;
}

export function buyUpgrade(run, item) {
  if (run.score < item.price) return false;
  run.score -= item.price;
  item.apply(run);
  run.upgrades.push(item.id);
  return true;
}

export function buyModule(run, module) {
  if (run.score < module.price || run.module === module.id) return false;
  run.score -= module.price;
  run.module = module.id;
  return true;
}
