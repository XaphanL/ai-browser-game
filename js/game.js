import { BOSS, DIFFICULTIES, ECONOMY, ENEMIES, OBSTACLES, PLAYER, WORLD } from './config.js';
import { movementVector } from './input.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const normalizeAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

function circleHitsObstacle(x, y, radius, obstacle) {
  const closestX = clamp(x, obstacle.x - obstacle.width / 2, obstacle.x + obstacle.width / 2);
  const closestY = clamp(y, obstacle.y - obstacle.height / 2, obstacle.y + obstacle.height / 2);
  return Math.hypot(x - closestX, y - closestY) < radius;
}

function moveWithObstacles(entity, dx, dy, state, ignoresObstacles = false) {
  const minX = WORLD.margin + entity.radius;
  const maxX = WORLD.width - WORLD.margin - entity.radius;
  const minY = WORLD.margin + entity.radius;
  const maxY = WORLD.height - WORLD.margin - entity.radius;
  const nextX = clamp(entity.x + dx, minX, maxX);
  if (ignoresObstacles || !state.obstacles.some(item => circleHitsObstacle(nextX, entity.y, entity.radius, item))) entity.x = nextX;
  const nextY = clamp(entity.y + dy, minY, maxY);
  if (ignoresObstacles || !state.obstacles.some(item => circleHitsObstacle(entity.x, nextY, entity.radius, item))) entity.y = nextY;
}

function updatePlayer(state, input, dt) {
  const player = state.player;
  const movement = movementVector(input);
  moveWithObstacles(player, movement.x * state.run.stats.speed * dt, movement.y * state.run.stats.speed * dt, state);
  if (input.aimX !== null) player.aim = Math.atan2(input.aimY - player.y, input.aimX - player.x);
  else if (movement.moving) player.aim = Math.atan2(movement.y, movement.x);

  player.attackTimer = Math.max(0, player.attackTimer - dt);
  player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  if (input.attack && !input.shield && player.attackTimer <= 0 && player.attackCooldown <= 0) {
    player.attackTimer = PLAYER.swordAttackSeconds / state.run.stats.attackSpeed;
    player.attackCooldown = (PLAYER.swordAttackSeconds + PLAYER.swordCooldownSeconds) / state.run.stats.attackSpeed;
    player.attackHits.length = 0;
  }
  const shieldStarted = input.shield && !player.shieldPressed;
  player.shieldPressed = input.shield;
  player.shieldActive = input.shield && player.shield > 0 && player.attackTimer <= 0;
  player.shield = clamp(player.shield + (player.shieldActive ? -state.run.stats.shieldDrain : state.run.stats.shieldRecharge) * dt, 0, state.run.stats.maxShield);
  player.hitFlash = Math.max(0, player.hitFlash - dt);
  player.reflectionFlash = Math.max(0, player.reflectionFlash - dt);
  const abilityStarted = input.ability && !player.abilityPressed;
  player.abilityPressed = input.ability;
  if (abilityStarted) activateModule(state);
  return shieldStarted;
}

function chooseHomingTarget(state, assigned) {
  const living = state.turrets.filter(turret => turret.health > 0);
  const safe = living.filter(turret => (assigned.get(turret.id) || 0) < turret.health);
  const pool = safe.length ? safe : living;
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function activateModule(state) {
  const player = state.player;
  if (state.run.module === 'dash') {
    const facet = player.armor.find(item => item.cells > 0);
    if (!facet) return;
    if (Math.random() >= state.run.stats.dashRefundChance) facet.cells--;
    const angle = inputAimAngle(player);
    player.x = clamp(player.x + Math.cos(angle) * state.run.stats.dashDistance, WORLD.margin, WORLD.width - WORLD.margin);
    player.y = clamp(player.y + Math.sin(angle) * state.run.stats.dashDistance, WORLD.margin, WORLD.height - WORLD.margin);
    state.effects.push({ type: 'dash', x: player.x, y: player.y, life: .25, maxLife: .25 });
  } else if (state.run.module === 'retaliation') {
    const assigned = new Map();
    for (const bullet of state.projectiles.filter(item => item.homing)) {
      assigned.set(bullet.targetId, (assigned.get(bullet.targetId) || 0) + 1);
    }
    for (const facet of player.armor) {
      if (facet.charge < state.run.stats.retaliationChargeHits) continue;
      const target = chooseHomingTarget(state, assigned);
      if (!target) break;
      facet.charge -= state.run.stats.retaliationChargeHits;
      assigned.set(target.id, (assigned.get(target.id) || 0) + 1);
      state.projectiles.push({
        id: state.nextProjectileId++, x: player.x, y: player.y, vx: 0, vy: 0,
        radius: 5, reflected: true, homing: true, targetId: target.id, damage: state.run.stats.homingDamage, life: 7
      });
    }
  }
}

function inputAimAngle(player) {
  return player.aim;
}

function updateSwordAttack(state) {
  const player = state.player;
  if (player.attackTimer <= 0) return;
  for (const turret of state.turrets) {
    if (player.attackHits.includes(turret.id)) continue;
    const angle = Math.atan2(turret.y - player.y, turret.x - player.x);
    const inArc = Math.abs(normalizeAngle(angle - player.aim)) <= state.run.stats.swordArc / 2;
    if (inArc && distance(player, turret) <= state.run.stats.swordRange + turret.radius) {
      turret.health -= state.run.stats.swordDamage + (state.run.module === 'dash' ? 1 : 0);
      turret.lastHit = 'sword';
      turret.flash = .12;
      if (turret.type !== 'turret') {
        const force = 185;
        turret.knockbackX += Math.cos(angle) * force;
        turret.knockbackY += Math.sin(angle) * force;
      }
      player.attackHits.push(turret.id);
    }
  }
  for (const obstacle of state.obstacles) {
    const hitId = `obstacle-${obstacle.id}`;
    if (!obstacle.destructible || player.attackHits.includes(hitId)) continue;
    const angle = Math.atan2(obstacle.y - player.y, obstacle.x - player.x);
    const inArc = Math.abs(normalizeAngle(angle - player.aim)) <= state.run.stats.swordArc / 2;
    const reach = Math.hypot(obstacle.width, obstacle.height) / 2;
    if (inArc && distance(player, obstacle) <= state.run.stats.swordRange + reach) {
      obstacle.health -= state.run.stats.swordDamage + (state.run.module === 'dash' ? 1 : 0);
      obstacle.flash = .12;
      player.attackHits.push(hitId);
    }
  }
}

function updateCapture(state, dt, events) {
  if (state.phase !== 'capture') return;
  const inside = distance(state.player, state.capture) <= state.capture.radius - state.player.radius / 2;
  state.capture.progress = clamp(state.capture.progress + (inside ? dt : -dt * .45), 0, state.capture.required);
  if (state.capture.progress >= state.capture.required) {
    state.phase = 'escape';
    for (const facet of state.player.armor) facet.cells = facet.maxCells;
    events.push({ type: 'captured' });
  }
}

function fire(turret, state, rules) {
  const angle = Math.atan2(state.player.y - turret.y, state.player.x - turret.x);
  state.projectiles.push({
    id: state.nextProjectileId++, x: turret.x, y: turret.y,
    vx: Math.cos(angle) * rules.bulletSpeed, vy: Math.sin(angle) * rules.bulletSpeed,
    radius: 6, reflected: false, damage: 14, life: 6
  });
}

function updateTurrets(state, dt) {
  const rules = DIFFICULTIES[state.difficulty];
  for (const turret of state.turrets) {
    if (turret.health <= 0 || turret.type !== 'turret') continue;
    turret.flash = Math.max(0, turret.flash - dt);
    turret.cooldown -= dt;
    if (turret.cooldown <= 0 && distance(turret, state.player) < 620) {
      const fireRules = turret.boss ? BOSS : rules;
      fire(turret, state, fireRules);
      turret.cooldown = fireRules.fireDelay * (.85 + Math.random() * .3);
    }
  }
}

function damagePlayerFromAngle(state, damage, source) {
  const player = state.player;
  const angle = normalizeAngle(Math.atan2(source.y - player.y, source.x - player.x));
  const step = Math.PI * 2 / PLAYER.armorSides;
  const facet = Math.round(angle / step + PLAYER.armorSides) % PLAYER.armorSides;
  const armorFacet = player.armor[facet];
  if (armorFacet.cells > 0) {
    armorFacet.cells--;
    if (state.run.module === 'retaliation') armorFacet.charge++;
  } else {
    player.health -= damage * state.run.stats.damageTaken;
  }
  player.hitFlash = .16;
}

function updateMobileEnemies(state, dt) {
  for (const enemy of state.turrets) {
    if (enemy.health <= 0 || enemy.type === 'turret') continue;
    const config = ENEMIES[enemy.type];
    enemy.flash = Math.max(0, enemy.flash - dt);
    enemy.cooldown = Math.max(0, enemy.cooldown - dt);
    const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
    const gap = distance(enemy, state.player) - enemy.radius - state.player.radius;

    if (enemy.type === 'swordsman' && gap <= config.attackRange) {
      enemy.shielded = false;
      if (enemy.windup <= 0 && enemy.cooldown <= 0) enemy.windup = config.windup;
      if (enemy.windup > 0) {
        const previous = enemy.windup;
        enemy.windup = Math.max(0, enemy.windup - dt);
        if (previous > 0 && enemy.windup === 0 && distance(enemy, state.player) - enemy.radius - state.player.radius <= config.attackRange + 8) {
          damagePlayerFromAngle(state, config.damage, enemy);
          enemy.cooldown = config.cooldown;
        }
      }
    } else if (enemy.type === 'drone' && gap <= config.attackRange && enemy.cooldown <= 0) {
      damagePlayerFromAngle(state, config.damage, enemy);
      enemy.cooldown = config.cooldown;
    } else {
      enemy.shielded = enemy.type === 'swordsman';
      const speed = config.speed;
      const previousX = enemy.x;
      const previousY = enemy.y;
      moveWithObstacles(enemy, Math.cos(angle) * speed * dt, Math.sin(angle) * speed * dt, state, enemy.type === 'drone');
      if (enemy.type === 'swordsman' && Math.hypot(enemy.x - previousX, enemy.y - previousY) < speed * dt * .2) {
        const turn = enemy.id % 2 ? Math.PI / 2 : -Math.PI / 2;
        moveWithObstacles(enemy, Math.cos(angle + turn) * speed * dt, Math.sin(angle + turn) * speed * dt, state);
      }
    }

    if (enemy.knockbackX || enemy.knockbackY) {
      moveWithObstacles(enemy, enemy.knockbackX * dt, enemy.knockbackY * dt, state, enemy.type === 'drone');
      const decay = Math.max(0, 1 - dt * 7);
      enemy.knockbackX *= decay;
      enemy.knockbackY *= decay;
    }
  }
}

function reflectProjectile(projectile, player) {
  const angleToBullet = Math.atan2(projectile.y - player.y, projectile.x - player.x);
  const withinArc = Math.abs(normalizeAngle(angleToBullet - player.aim)) <= PLAYER.shieldArc / 2;
  if (!player.shieldActive || !withinArc || player.shield < 5) return false;
  const normalX = Math.cos(angleToBullet);
  const normalY = Math.sin(angleToBullet);
  const dot = projectile.vx * normalX + projectile.vy * normalY;
  projectile.vx = (projectile.vx - 2 * dot * normalX) * 1.35;
  projectile.vy = (projectile.vy - 2 * dot * normalY) * 1.35;
  projectile.reflected = true;
  projectile.x = player.x + normalX * (PLAYER.shieldRadius + projectile.radius + 1);
  projectile.y = player.y + normalY * (PLAYER.shieldRadius + projectile.radius + 1);
  player.shield = Math.max(0, player.shield - 9);
  player.reflectionFlash = .18;
  projectile.reflectionEffect = { x: projectile.x, y: projectile.y };
  return true;
}

function absorbWithArmor(projectile, state) {
  const player = state.player;
  const angle = normalizeAngle(Math.atan2(projectile.y - player.y, projectile.x - player.x));
  const step = Math.PI * 2 / PLAYER.armorSides;
  const facet = Math.round(angle / step + PLAYER.armorSides) % PLAYER.armorSides;
  const armorFacet = player.armor[facet];
  if (armorFacet.cells <= 0) return false;
  armorFacet.cells--;
  if (state.run.module === 'retaliation') armorFacet.charge++;
  player.hitFlash = .1;
  projectile.life = 0;
  return true;
}

function updateProjectiles(state, dt, events) {
  for (const bullet of state.projectiles) {
    if (bullet.homing) {
      let target = state.turrets.find(turret => turret.id === bullet.targetId && turret.health > 0);
      if (!target) target = chooseHomingTarget(state, new Map());
      if (!target) { bullet.life = 0; continue; }
      bullet.targetId = target.id;
      const angle = Math.atan2(target.y - bullet.y, target.x - bullet.x);
      bullet.vx = Math.cos(angle) * PLAYER.homingBulletSpeed;
      bullet.vy = Math.sin(angle) * PLAYER.homingBulletSpeed;
    }
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (state.obstacles.some(item => circleHitsObstacle(bullet.x, bullet.y, bullet.radius, item))) {
      bullet.life = 0;
      continue;
    }
    const playerCollisionRadius = state.player.shieldActive ? PLAYER.shieldRadius : PLAYER.armorRadius;
    if (!bullet.reflected && distance(bullet, state.player) < bullet.radius + playerCollisionRadius) {
      if (!reflectProjectile(bullet, state.player) && distance(bullet, state.player) < bullet.radius + PLAYER.armorRadius) {
        if (!absorbWithArmor(bullet, state) && distance(bullet, state.player) < bullet.radius + state.player.radius) {
          state.player.health -= bullet.damage * state.run.stats.damageTaken;
          state.player.hitFlash = .16;
          bullet.life = 0;
        }
      }
      if (bullet.reflectionEffect) {
        state.effects.push({ type: 'reflection', ...bullet.reflectionEffect, life: .28, maxLife: .28 });
        delete bullet.reflectionEffect;
      }
    }
    if (bullet.reflected) {
      for (const turret of state.turrets) {
        if (distance(bullet, turret) < bullet.radius + turret.radius) {
          if (!turret.shielded) turret.health -= bullet.homing ? bullet.damage : state.run.stats.reflectionDamage;
          turret.lastHit = bullet.homing ? 'module' : 'reflection';
          turret.flash = .12;
          bullet.life = 0;
          break;
        }
      }
    }
  }
  for (const turret of state.turrets) {
    if (!turret.rewarded && turret.health <= 0) {
      const reward = turret.boss ? ECONOMY.bossReward
        : (turret.type === 'swordsman' ? ECONOMY.swordsmanReward
          : (turret.type === 'drone' ? ECONOMY.droneReward : ECONOMY.turretReward));
      turret.rewarded = true;
      state.run.score += reward;
      if (state.run.module === 'vampire') {
        const damaged = state.player.armor.filter(facet => facet.cells < facet.maxCells);
        if (damaged.length) damaged[Math.floor(Math.random() * damaged.length)].cells++;
        const repair = state.run.stats.vampireKillHeal + (turret.lastHit === 'sword' ? state.run.stats.vampireSwordHeal : 0);
        state.player.health = Math.min(state.run.stats.maxHealth, state.player.health + repair);
      }
      events.push({ type: 'enemyKilled', reward });
    }
  }
  state.turrets = state.turrets.filter(turret => turret.health > 0);
  for (const obstacle of state.obstacles) {
    obstacle.flash = Math.max(0, (obstacle.flash || 0) - dt);
    if (obstacle.destructible && obstacle.health <= 0 && Math.random() < OBSTACLES.energyDropChance) {
      state.pickups.push({ x: obstacle.x, y: obstacle.y, radius: 9, type: 'energy' });
    }
  }
  state.obstacles = state.obstacles.filter(obstacle => !obstacle.destructible || obstacle.health > 0);
  for (const pickup of state.pickups) {
    if (distance(pickup, state.player) > pickup.radius + state.player.radius) continue;
    const damaged = state.player.armor.filter(facet => facet.cells < facet.maxCells);
    if (!damaged.length) continue;
    damaged[Math.floor(Math.random() * damaged.length)].cells++;
    pickup.collected = true;
    state.effects.push({ type: 'energy', x: pickup.x, y: pickup.y, life: .35, maxLife: .35 });
  }
  state.pickups = state.pickups.filter(pickup => !pickup.collected);
  if (state.roomType === 'boss' && state.turrets.length === 0 && state.phase !== 'victory') {
    state.phase = 'victory';
    state.projectiles.length = 0;
    events.push({ type: 'victory' });
  }
  state.projectiles = state.projectiles.filter(bullet => bullet.life > 0 && bullet.x > -20 && bullet.x < WORLD.width + 20 && bullet.y > -20 && bullet.y < WORLD.height + 20);
  if (state.player.health <= 0) {
    state.player.health = 0;
    state.phase = 'defeat';
    events.push({ type: 'defeat' });
  }
}

function updateEffects(state, dt) {
  for (const effect of state.effects) effect.life -= dt;
  state.effects = state.effects.filter(effect => effect.life > 0);
}

function checkExits(state, events) {
  if (state.phase !== 'escape' && state.phase !== 'merchant') return;
  for (const exit of state.exits) {
    if (Math.abs(state.player.x - exit.x) < exit.width / 2 && Math.abs(state.player.y - exit.y) < exit.height / 2) {
      events.push({ type: 'nextArena', difficulty: exit.difficulty, targetId: exit.targetId, side: exit.side });
      return;
    }
  }
}

export function updateGame(state, input, dt) {
  const events = [];
  if (state.phase === 'defeat' || state.phase === 'victory' || state.phase === 'shop') return events;
  state.elapsed += dt;
  const shieldStarted = updatePlayer(state, input, dt);
  if (state.merchant && shieldStarted && distance(state.player, state.merchant) <= state.merchant.interactionRadius) {
    state.player.shieldActive = false;
    events.push({ type: 'merchantShop' });
  }
  updateSwordAttack(state);
  if (state.capture) updateCapture(state, dt, events);
  updateTurrets(state, dt);
  updateMobileEnemies(state, dt);
  updateProjectiles(state, dt, events);
  updateEffects(state, dt);
  checkExits(state, events);
  return events;
}
