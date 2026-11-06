import { describe, expect, test } from 'bun:test';
import { generateMap, MAP_H, MAP_W } from './mapgen';

const walkable = (t: string) => t !== 'W' && t !== 'M';
const seeds = Array.from({ length: 60 }, (_, i) => `seed-${i}`);

describe('generateMap', () => {
    test('is deterministic per seed and differs between seeds', () => {
        expect(generateMap('abc').map).toEqual(generateMap('abc').map);
        const uniq = new Set(seeds.map(s => JSON.stringify(generateMap(s).map)));
        expect(uniq.size).toBe(seeds.length);
    });

    test('has correct size, water border and a walkable start', () => {
        for (const s of seeds) {
            const { map, start } = generateMap(s);
            expect(map.length).toBe(MAP_H);
            map.forEach(row => expect(row.length).toBe(MAP_W));
            for (let x = 0; x < MAP_W; x++) { expect(map[0][x]).toBe('W'); expect(map[MAP_H - 1][x]).toBe('W'); }
            for (let y = 0; y < MAP_H; y++) { expect(map[y][0]).toBe('W'); expect(map[y][MAP_W - 1]).toBe('W'); }
            expect(walkable(map[start.y][start.x])).toBe(true);
        }
    });

    test('every walkable tile is reachable from the start', () => {
        for (const s of seeds) {
            const { map, start } = generateMap(s);
            const seen = new Set([`${start.x},${start.y}`]);
            const q = [[start.x, start.y]];
            while (q.length) {
                const [x, y] = q.pop()!;
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const k = `${x + dx},${y + dy}`;
                    if (map[y + dy]?.[x + dx] && walkable(map[y + dy][x + dx]) && !seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); }
                }
            }
            expect(seen.size).toBe(map.flat().filter(walkable).length);
        }
    });

    test('maps have terrain variety', () => {
        const kinds = new Set(seeds.flatMap(s => generateMap(s).map.flat()));
        for (const t of ['W', 'B', 'F', 'G', 'H', 'M', 'R']) expect(kinds.has(t as never)).toBe(true);
    });
});
