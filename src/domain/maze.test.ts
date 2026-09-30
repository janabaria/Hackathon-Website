import { describe, it, expect } from 'vitest';
import { initialRobot, stepRobot, reachableMaze, starterMazes } from './maze';
import { mazeSchema, createEmptyData } from './schema';
import { reduceData } from './actions';
describe('robot game', () => {
  it('wins only after collecting a star and reaching the goal', () => {
    const m = starterMazes[0];
    let r = initialRobot(m);
    for (let i = 0; i < 4; i++) r = stepRobot(m, r, 'forward');
    expect(r.status).toBe('won');
    expect(r.collected).toEqual([12]);
  });
  it('stops on walls and refuses to wrap across row edges', () => {
    const m = starterMazes[0];
    let r = initialRobot(m);
    r = stepRobot(m, r, 'left');
    r = stepRobot(m, r, 'forward');
    r = stepRobot(m, r, 'forward');
    expect(r.status).toBe('crashed');
    expect(stepRobot(m, { ...initialRobot(m), cell: 9 }, 'forward').status).toBe('crashed');
  });
  it('turns without moving and cannot win with missing stars', () => {
    const m = starterMazes[0];
    expect(stepRobot(m, initialRobot(m), 'right').cell).toBe(m.start);
    expect(stepRobot(m, { ...initialRobot(m), cell: 13 }, 'forward').status).toBe('running');
  });
  it('rejects invalid layouts and confirms every starter is solvable', () => {
    starterMazes.forEach((m) => expect(reachableMaze(m)).toBe(true));
    expect(reachableMaze({ ...starterMazes[0], walls: [9, 13, 19] })).toBe(false);
    expect(mazeSchema.safeParse({ ...starterMazes[0], stars: [12, 12] }).success).toBe(false);
  });
  it('restricts game ownership and deletes only the selected quiz result', () => {
    const s = createEmptyData();
    const m = { ...starterMazes[0], authorId: s.profile.id };
    const next = reduceData(s, { type: 'maze/save', maze: m });
    expect(next.mazes).toHaveLength(1);
    expect(() =>
      reduceData(next, { type: 'maze/save', maze: { ...m, authorId: 'other' } }),
    ).toThrow();
    expect(reduceData(next, { type: 'maze/delete', id: m.id }).mazes).toHaveLength(0);
    expect(() => reduceData(s, { type: 'quiz/delete', id: 'other' })).toThrow();
  });
});
