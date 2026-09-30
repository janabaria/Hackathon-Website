import type { Maze } from './schema';
export type Command = 'forward' | 'left' | 'right';
export type Robot = {
  cell: number;
  direction: number;
  collected: number[];
  status: 'ready' | 'running' | 'crashed' | 'won';
};
export const initialRobot = (m: Maze): Robot => ({
  cell: m.start,
  direction: 1,
  collected: [],
  status: 'ready',
});
export function stepRobot(m: Maze, r: Robot, c: Command): Robot {
  if (r.status === 'crashed' || r.status === 'won') return r;
  if (c !== 'forward')
    return { ...r, direction: (r.direction + (c === 'right' ? 1 : 3)) % 4, status: 'running' };
  const row = Math.floor(r.cell / 5),
    col = r.cell % 5;
  const nr = row + [-1, 0, 1, 0][r.direction],
    nc = col + [0, 1, 0, -1][r.direction];
  const next = nr * 5 + nc;
  if (nr < 0 || nr > 4 || nc < 0 || nc > 4 || m.walls.includes(next))
    return { ...r, status: 'crashed' };
  const collected =
    m.stars.includes(next) && !r.collected.includes(next) ? [...r.collected, next] : r.collected;
  return {
    ...r,
    cell: next,
    collected,
    status: next === m.goal && collected.length === m.stars.length ? 'won' : 'running',
  };
}
export function reachableMaze(m: Maze): boolean {
  const reached = new Set([m.start]),
    queue = [m.start];
  while (queue.length) {
    const c = queue.shift()!;
    for (const n of [c - 5, c + 5, ...(c % 5 ? [c - 1] : []), ...(c % 5 < 4 ? [c + 1] : [])])
      if (n >= 0 && n < 25 && !m.walls.includes(n) && !reached.has(n)) {
        reached.add(n);
        queue.push(n);
      }
  }
  return reached.has(m.goal) && m.stars.every((n) => reached.has(n));
}
export const starterMazes: Maze[] = [
  {
    id: 'first-steps',
    authorId: 'btb',
    title: 'First steps',
    start: 10,
    goal: 14,
    walls: [0, 1, 2, 3, 4, 20, 21, 22, 23, 24],
    stars: [12],
  },
  {
    id: 'around-the-corner',
    authorId: 'btb',
    title: 'Around the corner',
    start: 20,
    goal: 4,
    walls: [6, 7, 8, 11, 12, 13, 16, 17, 18],
    stars: [22, 14],
  },
  {
    id: 'take-the-detour',
    authorId: 'btb',
    title: 'Take the detour',
    start: 0,
    goal: 24,
    walls: [2, 7, 16, 17, 18, 22],
    stars: [10, 4],
  },
];
