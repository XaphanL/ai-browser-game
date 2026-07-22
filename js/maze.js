import { RUN } from './config.js';

const DIRECTIONS = [
  { side: 'top', dx: 0, dy: -1, opposite: 'bottom' },
  { side: 'right', dx: 1, dy: 0, opposite: 'left' },
  { side: 'bottom', dx: 0, dy: 1, opposite: 'top' },
  { side: 'left', dx: -1, dy: 0, opposite: 'right' }
];

const key = (x, y) => `${x}:${y}`;

function shuffled(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function generateMaze(width = RUN.mazeWidth, height = RUN.mazeHeight) {
  const rooms = new Map();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const id = key(x, y);
      rooms.set(id, { id, x, y, distance: Infinity, type: 'arena', difficulty: 'easy', neighbors: {} });
    }
  }

  const startId = key(Math.floor(width / 2), height - 1);
  const visited = new Set([startId]);
  const stack = [startId];
  while (stack.length) {
    const current = rooms.get(stack[stack.length - 1]);
    const options = shuffled(DIRECTIONS).filter(direction => {
      const nextId = key(current.x + direction.dx, current.y + direction.dy);
      return rooms.has(nextId) && !visited.has(nextId);
    });
    if (!options.length) { stack.pop(); continue; }
    const direction = options[0];
    const nextId = key(current.x + direction.dx, current.y + direction.dy);
    current.neighbors[direction.side] = nextId;
    rooms.get(nextId).neighbors[direction.opposite] = current.id;
    visited.add(nextId);
    stack.push(nextId);
  }

  const queue = [startId];
  rooms.get(startId).distance = 0;
  for (const id of queue) {
    const room = rooms.get(id);
    for (const nextId of Object.values(room.neighbors)) {
      const next = rooms.get(nextId);
      if (next.distance !== Infinity) continue;
      next.distance = room.distance + 1;
      queue.push(nextId);
    }
  }
  const boss = [...rooms.values()].sort((a, b) => b.distance - a.distance)[0];
  boss.type = 'boss';
  for (const room of rooms.values()) {
    if (room.id === startId || room.type === 'boss') continue;
    const roll = Math.random();
    room.difficulty = room.distance <= 2 ? (roll < .55 ? 'easy' : 'normal') : (roll < .25 ? 'easy' : roll < .7 ? 'normal' : 'hard');
  }
  boss.difficulty = 'hard';
  return { width, height, startId, bossId: boss.id, rooms };
}

export function markTransition(run, fromId, toId) {
  run.traversed.add([fromId, toId].sort().join('|'));
  run.visited.add(toId);
  run.currentRoomId = toId;
}
