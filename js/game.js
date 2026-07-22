import { DIFFICULTIES, PLAYER, WORLD } from './config.js';
import { movementVector } from './input.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const normalizeAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

function updatePlayer(state, input, dt) {
  const player = state.player;
  const movement = movementVector(input);
  player.x = clamp(player.x + movement.x * PLAYER.speed * dt, WORLD.margin, WORLD.width - WORLD.margin);
  player.y = clamp(player.y + movement.y * PLAYER.speed * dt, WORLD.margin, WORLD.height - WORLD.margin);
  if (input.aimX !== null) player.aim = Math.atan2(input.aimY - player.y, input.aimX - player.x);
  else if (movement.moving) player.aim = Math.atan2(movement.y, movement.x);

  player.shieldActive = input.shield && player.shield > 0;
  player.shield = clamp(player.shield + (player.shieldActive ? -PLAYER.shieldDrain : PLAYER.shieldRecharge) * dt, 0, PLAYER.maxShield);
  player.hitFlash = Math.max(0, player.hitFlash - dt);
}

function updateCapture(state, dt, events) {
  if (state.phase !== 'capture') return;
  const inside = distance(state.player, state.capture) <= state.capture.radius - state.player.radius / 2;
  state.capture.progress = clamp(state.capture.progress + (inside ? dt : -dt * .45), 0, state.capture.required);
  if (state.capture.progress >= state.capture.required) {
    state.phase = 'escape';
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
    turret.flash = Math.max(0, turret.flash - dt);
    turret.cooldown -= dt;
    if (turret.cooldown <= 0 && distance(turret, state.player) < 620) {
      fire(turret, state, rules);
      turret.cooldown = rules.fireDelay * (.85 + Math.random() * .3);
    }
  }
}

function reflectProjectile(projectile, player) {
  const angleToBullet = Math.atan2(projectile.y - player.y, projectile.x - player.x);
  const withinArc = Math.abs(normalizeAngle(angleToBullet - player.aim)) <= PLAYER.shieldArc / 2;
  if (!player.shieldActive || !withinArc || player.shield < 5) return false;
  const speed = Math.hypot(projectile.vx, projectile.vy) * 1.35;
  projectile.vx = Math.cos(player.aim) * speed;
  projectile.vy = Math.sin(player.aim) * speed;
  projectile.reflected = true;
  projectile.x = player.x + Math.cos(player.aim) * (PLAYER.shieldRadius + 8);
  projectile.y = player.y + Math.sin(player.aim) * (PLAYER.shieldRadius + 8);
  player.shield = Math.max(0, player.shield - 9);
  return true;
}

function updateProjectiles(state, dt, events) {
  for (const bullet of state.projectiles) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (!bullet.reflected && distance(bullet, state.player) < bullet.radius + (state.player.shieldActive ? PLAYER.shieldRadius : state.player.radius)) {
      if (!reflectProjectile(bullet, state.player) && distance(bullet, state.player) < bullet.radius + state.player.radius) {
        state.player.health -= bullet.damage;
        state.player.hitFlash = .16;
        bullet.life = 0;
      }
    }
    if (bullet.reflected) {
      for (const turret of state.turrets) {
        if (distance(bullet, turret) < bullet.radius + turret.radius) {
          turret.health--;
          turret.flash = .12;
          bullet.life = 0;
          break;
        }
      }
    }
  }
  state.turrets = state.turrets.filter(turret => turret.health > 0);
  state.projectiles = state.projectiles.filter(bullet => bullet.life > 0 && bullet.x > -20 && bullet.x < WORLD.width + 20 && bullet.y > -20 && bullet.y < WORLD.height + 20);
  if (state.player.health <= 0) {
    state.player.health = 0;
    state.phase = 'defeat';
    events.push({ type: 'defeat' });
  }
}

function checkExits(state, events) {
  if (state.phase !== 'escape') return;
  for (const exit of state.exits) {
    if (Math.abs(state.player.x - exit.x) < exit.width / 2 && Math.abs(state.player.y - exit.y) < exit.height / 2) {
      events.push({ type: 'nextArena', difficulty: exit.difficulty });
      return;
    }
  }
}

export function updateGame(state, input, dt) {
  const events = [];
  if (state.phase === 'defeat') return events;
  state.elapsed += dt;
  updatePlayer(state, input, dt);
  updateCapture(state, dt, events);
  updateTurrets(state, dt);
  updateProjectiles(state, dt, events);
  checkExits(state, events);
  return events;
}
