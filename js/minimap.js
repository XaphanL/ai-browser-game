const PADDING = 14;

export function createMinimap(canvas) {
  const ctx = canvas.getContext('2d');
  return run => {
    const { maze, visited, traversed, currentRoomId } = run;
    const cellWidth = (canvas.width - PADDING * 2) / maze.width;
    const cellHeight = (canvas.height - PADDING * 2) / maze.height;
    const center = room => ({
      x: PADDING + (room.x + .5) * cellWidth,
      y: PADDING + (room.y + .5) * cellHeight
    });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#080b16dd';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#61f6d288';
    ctx.lineWidth = 4;
    for (const edge of traversed) {
      const [fromId, toId] = edge.split('|');
      const from = center(maze.rooms.get(fromId));
      const to = center(maze.rooms.get(toId));
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    }

    for (const room of maze.rooms.values()) {
      if (!visited.has(room.id)) continue;
      const point = center(room);
      ctx.beginPath(); ctx.arc(point.x, point.y, room.type === 'boss' ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = room.id === currentRoomId ? '#ffffff' : (room.type === 'boss' ? '#bd83ff' : (room.type === 'merchant' ? '#ffd166' : '#61f6d2'));
      ctx.fill();
      if (room.id === currentRoomId) {
        ctx.strokeStyle = '#61f6d2'; ctx.lineWidth = 3; ctx.stroke();
      }
    }
  };
}
