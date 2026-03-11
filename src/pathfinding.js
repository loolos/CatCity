export function keyOf(pos) {
  return `${pos.x},${pos.y}`;
}

export function neighbors(pos, gridSize) {
  const dirs = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  return dirs
    .map((d) => ({ x: pos.x + d.x, y: pos.y + d.y }))
    .filter((n) => n.x >= 0 && n.y >= 0 && n.x < gridSize && n.y < gridSize);
}

export function shortestPath(start, goal, gridSize, canTraverse = null) {
  if (start.x === goal.x && start.y === goal.y) return [];

  const queue = [start];
  const prev = new Map();
  const visited = new Set([keyOf(start)]);

  while (queue.length) {
    const current = queue.shift();
    if (current.x === goal.x && current.y === goal.y) break;

    const nextNodes = neighbors(current, gridSize);

    for (const next of nextNodes) {
      if (canTraverse && !canTraverse(current, next)) continue;
      const k = keyOf(next);
      if (visited.has(k)) continue;
      visited.add(k);
      prev.set(k, current);
      queue.push(next);
    }
  }

  const route = [];
  let cursor = goal;
  while (cursor && !(cursor.x === start.x && cursor.y === start.y)) {
    route.push(cursor);
    cursor = prev.get(keyOf(cursor));
    if (!cursor) return null;
  }
  route.reverse();
  return route;
}
