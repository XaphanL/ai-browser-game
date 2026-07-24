import { BOSS, DIFFICULTIES, ECONOMY, ENEMIES, MOMENTUM, OBJECTIVES, OBSTACLES, PLAYER, REINFORCEMENTS, SPAWNERS, WORLD } from './config.js';
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

function approachVelocity(player, targetX, targetY, amount) {
  const dx = targetX - player.vx;
  const dy = targetY - player.vy;
  const gap = Math.hypot(dx, dy);
  if (gap <= amount || gap === 0) {
    player.vx = targetX;
    player.vy = targetY;
    return;
  }
  player.vx += dx / gap * amount;
  player.vy += dy / gap * amount;
}

function updatePlayer(state, input, dt) {
  const player = state.player;
  const movement = movementVector(input);
  const targetVx = movement.x * state.run.stats.speed;
  const targetVy = movement.y * state.run.stats.speed;
  const currentSpeed = Math.hypot(player.vx || 0, player.vy || 0);
  const opposing = movement.moving && currentSpeed > 1
    && (player.vx * targetVx + player.vy * targetVy) / (currentSpeed * state.run.stats.speed) < .35;
  const response = !movement.moving ? PLAYER.deceleration : (opposing ? PLAYER.turnAcceleration : PLAYER.acceleration);
  approachVelocity(player, targetVx, targetVy, response * dt);
  const previousX = player.x;
  const previousY = player.y;
  moveWithObstacles(player, player.vx * dt, player.vy * dt, state);
  if (Math.abs(player.x - previousX) < Math.abs(player.vx * dt) * .25) player.vx = 0;
  if (Math.abs(player.y - previousY) < Math.abs(player.vy * dt) * .25) player.vy = 0;
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
  player.dodgeCooldown = Math.max(0, player.dodgeCooldown - dt);
  const dodgeStarted = input.dodge && !player.dodgePressed;
  player.dodgePressed = input.dodge;
  if (dodgeStarted && player.dodgeCooldown <= 0) dodge(state, movement);
  const abilityStarted = input.ability && !player.abilityPressed;
  player.abilityPressed = input.ability;
  if (abilityStarted) activateModule(state);
  return shieldStarted;
}

function dodge(state, movement) {
  const player = state.player;
  const angle = movement.moving ? Math.atan2(movement.y, movement.x) : player.aim;
  const distanceToTravel = state.run.module === 'dash' ? state.run.stats.dashDistance : PLAYER.dodgeDistance;
  const from = { x: player.x, y: player.y };
  const steps = Math.ceil(distanceToTravel / 12);
  for (let step = 0; step < steps; step++) {
    const before = { x: player.x, y: player.y };
    moveWithObstacles(player, Math.cos(angle) * distanceToTravel / steps, Math.sin(angle) * distanceToTravel / steps, state);
    if (before.x === player.x && before.y === player.y) break;
  }
  player.dodgeCooldown = PLAYER.dodgeCooldown * state.run.stats.dodgeCooldownMultiplier;
  player.shieldActive = false;
  state.effects.push({ type: 'dash', x: player.x, y: player.y, fromX: from.x, fromY: from.y, life: .25, maxLife: .25 });
  if (state.run.module !== 'dash') return;
  for (const enemy of state.turrets) {
    if (enemy.health <= 0 || distanceToSegment(enemy, from, player) > enemy.radius + player.radius) continue;
    enemy.health -= 1;
    enemy.lastHit = 'module';
    enemy.flash = .12;
  }
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
    return;
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
  for (const crystal of state.crystals) {
    const hitId = `crystal-${crystal.id}`;
    if (crystal.health <= 0 || player.attackHits.includes(hitId)) continue;
    const angle = Math.atan2(crystal.y - player.y, crystal.x - player.x);
    if (Math.abs(normalizeAngle(angle - player.aim)) <= state.run.stats.swordArc / 2
      && distance(player, crystal) <= state.run.stats.swordRange + crystal.radius) {
      crystal.health -= state.run.stats.swordDamage + (state.run.module === 'dash' ? 1 : 0);
      crystal.flash = .12;
      player.attackHits.push(hitId);
    }
  }
  for (const spawner of state.spawners) {
    const hitId = `station-${spawner.id}`;
    if (spawner.destroyed || player.attackHits.includes(hitId)) continue;
    const angle = Math.atan2(spawner.y - player.y, spawner.x - player.x);
    if (Math.abs(normalizeAngle(angle - player.aim)) <= state.run.stats.swordArc / 2
      && distance(player, spawner) <= state.run.stats.swordRange + spawner.radius) {
      spawner.health -= state.run.stats.swordDamage + (state.run.module === 'dash' ? 1 : 0);
      spawner.flash = .12;
      player.attackHits.push(hitId);
    }
  }
}

function updateCapture(state, dt, events) {
  if (state.phase !== 'objective') return;
  const inside = distance(state.player, state.capture) <= state.capture.radius - state.player.radius / 2;
  const momentumBoost = 1 + state.run.momentum.stacks * MOMENTUM.capturePerStack;
  const safeInside = inside && state.capture.hazard <= 0;
  state.capture.progress = clamp(state.capture.progress + (safeInside ? dt * momentumBoost : -dt * .3), 0, state.capture.required);
  const ratio = state.capture.progress / state.capture.required;
  state.capture.hazardWarning = Math.max(0, state.capture.hazardWarning - dt);
  state.capture.hazard = Math.max(0, state.capture.hazard - dt);
  if (ratio >= state.capture.nextPulse && state.capture.nextPulse < 1) {
    state.capture.nextPulse += .33;
    state.capture.hazardWarning = .65;
    state.capture.hazard = 1.15;
    state.effects.push({ type: 'spawn', x: state.capture.x, y: state.capture.y, life: .65, maxLife: .65 });
    const type = state.capture.nextPulse > .7 ? 'swordsman' : 'drone';
    spawnEnemyAtStation(state, { id: `capture-${state.capture.nextPulse}`, enemyType: type, x: state.capture.x, y: state.capture.y, radius: state.capture.radius });
  }
  if (state.capture.hazard > 0 && state.capture.hazardWarning <= 0 && inside) {
    damagePlayerFromAngle(state, 18, state.capture);
    state.capture.hazard = 0;
  }
  if (state.capture.progress >= state.capture.required) {
    completeObjective(state, events);
  }
}

function completeObjective(state, events) {
  if (state.phase !== 'objective') return;
  state.phase = 'escape';
  state.laser = null;
  for (const spawner of state.spawners) {
    if (spawner.destroyed) continue;
    spawner.destroyed = true;
    spawner.health = 0;
    state.effects.push({ type: 'explosion', x: spawner.x, y: spawner.y, life: .65, maxLife: .65 });
  }
  for (const facet of state.player.armor) facet.cells = facet.maxCells;
  events.push({ type: 'objectiveComplete', objective: state.objective.type });
}

function spawnEnemyAtStation(state, spawner) {
  const config = ENEMIES[spawner.enemyType];
  const position = [0, Math.PI / 2, Math.PI, -Math.PI / 2].map(angle => ({
    x: spawner.x + Math.cos(angle) * (spawner.radius + config.radius + 12),
    y: spawner.y + Math.sin(angle) * (spawner.radius + config.radius + 12)
  })).find(point => point.x > WORLD.margin + config.radius && point.x < WORLD.width - WORLD.margin - config.radius
    && point.y > WORLD.margin + config.radius && point.y < WORLD.height - WORLD.margin - config.radius
    && !state.obstacles.some(item => circleHitsObstacle(point.x, point.y, config.radius, item))
    && distance(point, state.player) > config.radius + state.player.radius + 35
    && !state.turrets.some(enemy => distance(point, enemy) < config.radius + enemy.radius + 12));
  if (!position) return false;
  state.turrets.push({
    id: state.nextEnemyId++, type: spawner.enemyType, ...position, radius: config.radius,
    health: config.health, maxHealth: config.health, cooldown: .55, windup: 0, flash: 0,
    shielded: spawner.enemyType === 'swordsman', knockbackX: 0, knockbackY: 0,
    navTimer: 0, waypoint: null, strafeSign: Math.random() < .5 ? -1 : 1,
    movementPhase: Math.random() * Math.PI * 2, spawnedBy: spawner.id
  });
  state.effects.push({ type: 'spawn', x: position.x, y: position.y, life: .35, maxLife: .35 });
  return true;
}

function updateSpawners(state, dt) {
  for (const spawner of state.spawners) {
    spawner.flash = Math.max(0, spawner.flash - dt);
    if (spawner.destroyed) continue;
    if (spawner.health <= 0) {
      spawner.destroyed = true;
      state.effects.push({ type: 'explosion', x: spawner.x, y: spawner.y, life: .65, maxLife: .65 });
      continue;
    }
    if (state.phase !== 'objective') continue;
    spawner.cooldown -= dt;
    const alive = state.turrets.filter(enemy => enemy.spawnedBy === spawner.id && enemy.health > 0).length;
    if (spawner.cooldown <= 0 && alive < SPAWNERS.maxAlivePerSpawner[state.difficulty]
      && spawnEnemyAtStation(state, spawner)) {
      const modeFactor = state.objective.type === 'survive' ? .9 : 1.1;
      spawner.cooldown = SPAWNERS.interval[state.difficulty] * modeFactor * (.9 + Math.random() * .2);
    }
  }
}

function updateCrystals(state, dt) {
  if (state.objective?.type !== 'crystals' || state.phase !== 'objective') return;
  for (const crystal of state.crystals) crystal.flash = Math.max(0, crystal.flash - dt);
  const living = state.crystals.filter(crystal => crystal.health > 0);
  let active = living.find(crystal => crystal.id === state.objective.activeCrystalId);
  if (!active) {
    active = living[0];
    state.objective.activeCrystalId = active?.id ?? null;
  }
  for (const crystal of state.crystals) crystal.active = crystal === active;
  if (!active) return;
  if (active.telegraph > 0) {
    active.telegraph -= dt;
    state.laser = { x1: active.x, y1: active.y, x2: active.targetX, y2: active.targetY, firing: active.telegraph <= 0 };
    if (active.telegraph <= 0) {
      const target = { x: active.targetX, y: active.targetY };
      const blocked = state.obstacles.some(obstacle => segmentHitsExpandedRect(active, target, obstacle, 2));
      if (!blocked && distanceToSegment(state.player, active, target) <= state.player.radius + 7) {
        damagePlayerFromAngle(state, OBJECTIVES.crystalLaserDamage, active);
      }
      active.cooldown = OBJECTIVES.crystalFireDelay;
      const alternatives = living.filter(crystal => crystal !== active);
      if (alternatives.length) {
        const next = alternatives[Math.floor(Math.random() * alternatives.length)];
        state.objective.activeCrystalId = next.id;
        next.cooldown = Math.min(next.cooldown, OBJECTIVES.crystalSwitchDelay);
      }
    }
    return;
  }
  state.laser = null;
  active.cooldown -= dt;
  if (active.cooldown <= 0) {
    active.targetX = state.player.x;
    active.targetY = state.player.y;
    active.telegraph = OBJECTIVES.crystalTelegraphSeconds;
  }
}

function updateObjective(state, dt, events) {
  if (state.phase !== 'objective' || !state.objective) return;
  const type = state.objective.type;
  if (type === 'capture') updateCapture(state, dt, events);
  if (type === 'survive') {
    state.objective.timer = Math.max(0, state.objective.timer - dt);
    if (state.objective.timer === 0) completeObjective(state, events);
  } else if (type === 'clear' && state.turrets.length === 0 && (!state.reinforcements || state.reinforcements.wavesLeft === 0)) {
    completeObjective(state, events);
  } else if (type === 'hunt' && !state.turrets.some(enemy => enemy.marked)) {
    completeObjective(state, events);
  } else if (type === 'crystals' && state.crystals.every(crystal => crystal.health <= 0)) {
    completeObjective(state, events);
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
  resetMomentum(state);
}

function resetMomentum(state) {
  state.run.momentum.stacks = 0;
  state.run.momentum.timer = 0;
}

function updateMomentum(state, dt) {
  const momentum = state.run.momentum;
  momentum.timer = Math.max(0, momentum.timer - dt);
  if (momentum.timer === 0) momentum.stacks = 0;
}

function updateReinforcements(state, dt) {
  const wave = state.reinforcements;
  if (!wave || state.phase !== 'objective' || wave.wavesLeft <= 0) return;
  if (wave.warning > 0) {
    wave.warning -= dt;
    if (wave.warning > 0) return;
    const count = state.difficulty === 'hard' ? 3 : 2;
    for (let index = 0; index < count; index++) {
      spawnEnemyAtStation(state, {
        id: `wave-${wave.wavesLeft}-${index}`, enemyType: index % 2 ? 'swordsman' : 'drone',
        x: wave.portal.x, y: wave.portal.y, radius: 24
      });
    }
    wave.wavesLeft--;
    wave.timer = REINFORCEMENTS.waveGap;
    return;
  }
  wave.timer -= dt;
  if (wave.timer > 0) return;
  const portals = [{ x: 100, y: 300 }, { x: 860, y: 300 }, { x: 480, y: 85 }, { x: 480, y: 515 }];
  wave.portal = portals[Math.floor(Math.random() * portals.length)];
  wave.warning = REINFORCEMENTS.warning;
}

function segmentHitsExpandedRect(from, to, obstacle, padding) {
  const bounds = [
    [from.x, to.x - from.x, obstacle.x - obstacle.width / 2 - padding, obstacle.x + obstacle.width / 2 + padding],
    [from.y, to.y - from.y, obstacle.y - obstacle.height / 2 - padding, obstacle.y + obstacle.height / 2 + padding]
  ];
  let near = 0;
  let far = 1;
  for (const [start, delta, min, max] of bounds) {
    if (Math.abs(delta) < .0001) {
      if (start <= min || start >= max) return false;
      continue;
    }
    const first = (min - start) / delta;
    const second = (max - start) / delta;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return false;
  }
  return near < 1 && far > 0;
}

function distanceToSegment(point, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  const ratio = lengthSquared ? clamp(((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared, 0, 1) : 0;
  return Math.hypot(point.x - (from.x + dx * ratio), point.y - (from.y + dy * ratio));
}

function hasClearPath(from, to, radius, state) {
  return !state.obstacles.some(obstacle => segmentHitsExpandedRect(from, to, obstacle, radius + 5));
}

function findNavigationWaypoint(enemy, target, state) {
  if (hasClearPath(enemy, target, enemy.radius, state)) return null;
  const nodes = [{ x: enemy.x, y: enemy.y }, target];
  for (const obstacle of state.obstacles) {
    const padding = enemy.radius + 10;
    for (const x of [obstacle.x - obstacle.width / 2 - padding, obstacle.x + obstacle.width / 2 + padding]) {
      for (const y of [obstacle.y - obstacle.height / 2 - padding, obstacle.y + obstacle.height / 2 + padding]) {
        if (x > WORLD.margin + enemy.radius && x < WORLD.width - WORLD.margin - enemy.radius
          && y > WORLD.margin + enemy.radius && y < WORLD.height - WORLD.margin - enemy.radius) nodes.push({ x, y });
      }
    }
  }
  const costs = nodes.map(() => Infinity);
  const previous = nodes.map(() => -1);
  const visited = new Set();
  costs[0] = 0;
  while (visited.size < nodes.length) {
    let current = -1;
    for (let index = 0; index < nodes.length; index++) {
      if (!visited.has(index) && (current < 0 || costs[index] < costs[current])) current = index;
    }
    if (current < 0 || !Number.isFinite(costs[current]) || current === 1) break;
    visited.add(current);
    for (let next = 1; next < nodes.length; next++) {
      if (visited.has(next) || !hasClearPath(nodes[current], nodes[next], enemy.radius, state)) continue;
      const candidate = costs[current] + distance(nodes[current], nodes[next]);
      if (candidate < costs[next]) {
        costs[next] = candidate;
        previous[next] = current;
      }
    }
  }
  if (!Number.isFinite(costs[1])) return null;
  let step = 1;
  while (previous[step] > 0) step = previous[step];
  return step === 1 ? null : { ...nodes[step] };
}

function enemyMovementTarget(enemy, state, config) {
  const playerDistance = distance(enemy, state.player);
  const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
  const sideOffset = Math.min(config.strafe, Math.max(0, playerDistance - config.attackRange) * .24);
  const pulse = .65 + Math.sin(state.elapsed * 2.2 + (enemy.movementPhase || 0)) * .35;
  const strafeSign = enemy.strafeSign || 1;
  return {
    x: state.player.x + Math.cos(angle + strafeSign * Math.PI / 2) * sideOffset * pulse,
    y: state.player.y + Math.sin(angle + strafeSign * Math.PI / 2) * sideOffset * pulse
  };
}

function separationVector(enemy, state) {
  let x = 0;
  let y = 0;
  for (const other of state.turrets) {
    if (other === enemy || other.health <= 0 || other.type === 'turret') continue;
    const dx = enemy.x - other.x;
    const dy = enemy.y - other.y;
    const range = enemy.radius + other.radius + 22;
    const currentDistance = Math.hypot(dx, dy);
    if (currentDistance > 0 && currentDistance < range) {
      const strength = (range - currentDistance) / range;
      x += dx / currentDistance * strength;
      y += dy / currentDistance * strength;
    }
  }
  return { x, y };
}

function updateMobileEnemies(state, dt) {
  for (const enemy of state.turrets) {
    if (enemy.health <= 0 || enemy.type === 'turret') continue;
    const config = ENEMIES[enemy.type];
    enemy.flash = Math.max(0, enemy.flash - dt);
    enemy.cooldown = Math.max(0, enemy.cooldown - dt);
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
      const movementTarget = enemyMovementTarget(enemy, state, config);
      if (enemy.type === 'swordsman') {
        enemy.navTimer = (enemy.navTimer || 0) - dt;
        if (enemy.navTimer <= 0 || (enemy.waypoint && distance(enemy, enemy.waypoint) < 16)) {
          enemy.waypoint = findNavigationWaypoint(enemy, movementTarget, state);
          enemy.navTimer = .22 + (enemy.id % 4) * .035;
        }
      }
      const target = enemy.waypoint || movementTarget;
      const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
      const separation = separationVector(enemy, state);
      let moveX = Math.cos(angle) + separation.x * .85;
      let moveY = Math.sin(angle) + separation.y * .85;
      const moveLength = Math.hypot(moveX, moveY) || 1;
      moveX /= moveLength;
      moveY /= moveLength;
      moveWithObstacles(enemy, moveX * speed * dt, moveY * speed * dt, state, enemy.type === 'drone');
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
  resetMomentum(state);
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
          resetMomentum(state);
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
      for (const crystal of bullet.life > 0 ? state.crystals : []) {
        if (crystal.health > 0 && distance(bullet, crystal) < bullet.radius + crystal.radius) {
          crystal.health -= bullet.homing ? bullet.damage : state.run.stats.reflectionDamage;
          crystal.flash = .12;
          bullet.life = 0;
          break;
        }
      }
      for (const spawner of bullet.life > 0 ? state.spawners : []) {
        if (!spawner.destroyed && distance(bullet, spawner) < bullet.radius + spawner.radius) {
          spawner.health -= bullet.homing ? bullet.damage : state.run.stats.reflectionDamage;
          spawner.flash = .12;
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
      const momentum = state.run.momentum;
      momentum.stacks = Math.min(MOMENTUM.maxStacks, momentum.stacks + 1);
      momentum.timer = MOMENTUM.window;
      const totalReward = Math.round(reward * (1 + (momentum.stacks - 1) * MOMENTUM.rewardPerStack));
      state.run.score += totalReward;
      if (state.run.module === 'vampire') {
        const damaged = state.player.armor.filter(facet => facet.cells < facet.maxCells);
        if (damaged.length) damaged[Math.floor(Math.random() * damaged.length)].cells++;
        const repair = state.run.stats.vampireKillHeal + (turret.lastHit === 'sword' ? state.run.stats.vampireSwordHeal : 0);
        state.player.health = Math.min(state.run.stats.maxHealth, state.player.health + repair);
      }
      state.effects.push({ type: 'kill', x: turret.x, y: turret.y, life: .32, maxLife: .32 });
      events.push({ type: 'enemyKilled', reward: totalReward });
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
  updateMomentum(state, dt);
  const shieldStarted = updatePlayer(state, input, dt);
  if (state.merchant && shieldStarted && distance(state.player, state.merchant) <= state.merchant.interactionRadius) {
    state.player.shieldActive = false;
    events.push({ type: 'merchantShop' });
  }
  updateSwordAttack(state);
  updateCrystals(state, dt);
  updateTurrets(state, dt);
  updateMobileEnemies(state, dt);
  updateProjectiles(state, dt, events);
  updateObjective(state, dt, events);
  updateReinforcements(state, dt);
  updateSpawners(state, dt);
  updateEffects(state, dt);
  checkExits(state, events);
  return events;
}
