import { DIFFICULTIES, PLAYER, WORLD } from './config.js';

function drawGrid(ctx) {
  ctx.strokeStyle = '#17233b';
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD.height); ctx.stroke(); }
  for (let y = 0; y <= WORLD.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD.width, y); ctx.stroke(); }
  ctx.strokeStyle = '#314263';
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, WORLD.width - 48, WORLD.height - 48);
}

function drawCapture(ctx, state) {
  if (!state.capture) return;
  const capture = state.capture;
  const ratio = capture.progress / capture.required;
  ctx.fillStyle = state.phase === 'escape' ? '#61f6d226' : '#4d78ff18';
  ctx.strokeStyle = state.phase === 'escape' ? '#61f6d2' : '#547de0';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(capture.x, capture.y, capture.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#1f304d'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(capture.x, capture.y, capture.radius + 12, -.5 * Math.PI, 1.5 * Math.PI); ctx.stroke();
  ctx.strokeStyle = '#61f6d2';
  ctx.beginPath(); ctx.arc(capture.x, capture.y, capture.radius + 12, -.5 * Math.PI, (-.5 + ratio * 2) * Math.PI); ctx.stroke();
  ctx.fillStyle = '#dcecff'; ctx.font = '700 13px monospace'; ctx.textAlign = 'center';
  ctx.fillText(state.phase === 'escape' ? 'ЗАХВАЧЕНО' : `${Math.round(ratio * 100)}%`, capture.x, capture.y + 5);
}

function drawExits(ctx, state) {
  for (const exit of state.exits) {
    const open = state.phase === 'escape';
    const rules = DIFFICULTIES[exit.difficulty];
    ctx.save();
    ctx.translate(exit.x, exit.y);
    ctx.fillStyle = open ? `${rules.color}2b` : '#111827';
    ctx.strokeStyle = open ? rules.color : '#39465c';
    ctx.lineWidth = 3;
    ctx.fillRect(-exit.width / 2, -exit.height / 2, exit.width, exit.height);
    ctx.strokeRect(-exit.width / 2, -exit.height / 2, exit.width, exit.height);
    ctx.fillStyle = open ? rules.color : '#526176';
    ctx.font = '700 13px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = state.run.visited.has(exit.targetId) ? 'ПРОЙДЕНО' : rules.label.toUpperCase();
    if (exit.side === 'left') { ctx.rotate(Math.PI / 2); ctx.fillText(label, 0, -37); }
    else if (exit.side === 'right') { ctx.rotate(-Math.PI / 2); ctx.fillText(label, 0, -37); }
    else if (exit.side === 'bottom') ctx.fillText(label, 0, -40);
    else ctx.fillText(label, 0, 40);
    ctx.restore();
  }
}

function drawTurrets(ctx, state) {
  for (const turret of state.turrets) {
    const angle = Math.atan2(state.player.y - turret.y, state.player.x - turret.x);
    ctx.save(); ctx.translate(turret.x, turret.y); ctx.rotate(angle);
    const size = turret.boss ? 58 : 30;
    ctx.fillStyle = turret.flash ? '#fff' : (turret.boss ? '#6d3fc0' : '#b94763');
    ctx.strokeStyle = turret.boss ? '#bd83ff' : '#ff7690'; ctx.lineWidth = turret.boss ? 4 : 2;
    ctx.fillRect(-size / 2, -size / 2, size, size); ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.fillRect(size / 4, turret.boss ? -8 : -5, turret.boss ? 43 : 26, turret.boss ? 16 : 10);
    ctx.restore();
    if (turret.boss) {
      ctx.fillStyle = '#231535'; ctx.fillRect(turret.x - 90, turret.y + 55, 180, 10);
      ctx.fillStyle = '#bd83ff'; ctx.fillRect(turret.x - 90, turret.y + 55, 180 * turret.health / turret.maxHealth, 10);
      ctx.strokeStyle = '#e5c7ff'; ctx.strokeRect(turret.x - 90, turret.y + 55, 180, 10);
    } else {
      for (let i = 0; i < turret.health; i++) { ctx.fillStyle = '#ff7690'; ctx.fillRect(turret.x - 13 + i * 10, turret.y + 24, 7, 3); }
    }
  }
}

function drawArmor(ctx, player) {
  const step = Math.PI * 2 / PLAYER.armorSides;
  const vertexRadius = PLAYER.armorRadius / Math.cos(step / 2);
  for (let index = 0; index < PLAYER.armorSides; index++) {
    if (!player.armor[index]) continue;
    const angle = index * step;
    ctx.strokeStyle = '#72a7ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle - step / 2) * vertexRadius, Math.sin(angle - step / 2) * vertexRadius);
    ctx.lineTo(Math.cos(angle + step / 2) * vertexRadius, Math.sin(angle + step / 2) * vertexRadius);
    ctx.stroke();
  }
}

function drawPlayer(ctx, player, stats) {
  ctx.save(); ctx.translate(player.x, player.y);
  ctx.fillStyle = player.hitFlash ? '#fff' : '#e6f0ff';
  ctx.strokeStyle = '#61f6d2'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, player.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  drawArmor(ctx, player);
  ctx.rotate(player.aim); ctx.fillStyle = '#61f6d2'; ctx.fillRect(5, -3, 19, 6);
  if (player.attackTimer > 0) {
    const progress = 1 - player.attackTimer / (PLAYER.swordAttackSeconds / stats.attackSpeed);
    const swordAngle = -stats.swordArc / 2 + stats.swordArc * progress;
    ctx.save(); ctx.rotate(swordAngle);
    ctx.strokeStyle = '#fff1a6'; ctx.shadowBlur = 16; ctx.shadowColor = '#ffd166'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(stats.swordRange, 0); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#ffd16688'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, stats.swordRange, -stats.swordArc / 2, swordAngle); ctx.stroke();
  }
  if (player.shieldActive) {
    ctx.strokeStyle = player.reflectionFlash ? '#ffffff' : '#6cfbe1';
    ctx.shadowBlur = player.reflectionFlash ? 30 : 18; ctx.shadowColor = '#61f6d2'; ctx.lineWidth = player.reflectionFlash ? 9 : 6;
    ctx.beginPath(); ctx.arc(0, 0, PLAYER.shieldRadius, -PLAYER.shieldArc / 2, PLAYER.shieldArc / 2); ctx.stroke();
    ctx.fillStyle = '#dffff8';
    for (const angle of [-PLAYER.shieldArc / 2, 0, PLAYER.shieldArc / 2]) {
      ctx.beginPath(); ctx.arc(Math.cos(angle) * PLAYER.shieldRadius, Math.sin(angle) * PLAYER.shieldRadius, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function drawEffects(ctx, effects) {
  for (const effect of effects) {
    const progress = 1 - effect.life / effect.maxLife;
    ctx.strokeStyle = `rgba(176, 255, 241, ${1 - progress})`;
    ctx.lineWidth = 5 * (1 - progress);
    ctx.beginPath(); ctx.arc(effect.x, effect.y, 8 + progress * 28, 0, Math.PI * 2); ctx.stroke();
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return state => {
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    drawGrid(ctx); drawExits(ctx, state); drawCapture(ctx, state); drawTurrets(ctx, state);
    for (const bullet of state.projectiles) {
      ctx.fillStyle = bullet.reflected ? '#61f6d2' : '#ff6b83';
      ctx.shadowBlur = bullet.reflected ? 22 : 12; ctx.shadowColor = ctx.fillStyle;
      if (bullet.reflected) {
        const speed = Math.hypot(bullet.vx, bullet.vy) || 1;
        ctx.strokeStyle = '#61f6d288'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(bullet.x, bullet.y);
        ctx.lineTo(bullet.x - bullet.vx / speed * 28, bullet.y - bullet.vy / speed * 28); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    drawEffects(ctx, state.effects);
    drawPlayer(ctx, state.player, state.run.stats);
    if (state.phase === 'defeat' || state.phase === 'victory') { ctx.fillStyle = '#080b16b8'; ctx.fillRect(0, 0, WORLD.width, WORLD.height); }
  };
}
