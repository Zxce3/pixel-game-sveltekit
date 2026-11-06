import type { TerrainType } from '../types';

export const MAP_W = 20;
export const MAP_H = 15;

export interface GeneratedMap {
    map: TerrainType[][];
    start: { x: number; y: number };
    seed: string;
}

/** Deterministic string -> 32-bit hash (xmur3). */
function hashSeed(str: string): number {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
}

/** mulberry32 PRNG: same seed -> same sequence. */
function rng(seed: number): () => number {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Smooth 2D value noise with a few octaves, in [0, 1). */
function makeNoise(rand: () => number, cell: number) {
    const size = 64;
    const grid = Array.from({ length: size * size }, () => rand());
    const at = (x: number, y: number) => grid[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
    const smooth = (t: number) => t * t * (3 - 2 * t);
    const sample = (x: number, y: number) => {
        const x0 = Math.floor(x), y0 = Math.floor(y);
        const fx = smooth(x - x0), fy = smooth(y - y0);
        const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
        const bot = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
        return top * (1 - fy) + bot * fy;
    };
    return (x: number, y: number) =>
        (sample(x / cell, y / cell) * 0.65 + sample((x * 2) / cell, (y * 2) / cell) * 0.35);
}

const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const walkable = (t: TerrainType) => t !== 'W' && t !== 'M';

function attempt(seed: string, salt: number): GeneratedMap | null {
    const rand = rng(hashSeed(`${seed}#${salt}`));
    const elevNoise = makeNoise(rand, 4.5);
    const moistNoise = makeNoise(rand, 5.5);
    const w = MAP_W, h = MAP_H;

    const elev: number[][] = [];
    const map: TerrainType[][] = [];
    for (let y = 0; y < h; y++) {
        elev.push([]);
        map.push([]);
        for (let x = 0; x < w; x++) {
            // Island falloff: land in the middle, ocean at the edges.
            const dx = (x - (w - 1) / 2) / (w / 2), dy = (y - (h - 1) / 2) / (h / 2);
            const d = Math.min(1, Math.sqrt(dx * dx + dy * dy));
            const e = elevNoise(x, y) * 1.15 + 0.35 - d * d * 0.95;
            const m = moistNoise(x, y);
            elev[y].push(e);

            let t: TerrainType;
            if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || e < 0.3) t = 'W';
            else if (e < 0.37) t = 'B';
            else if (e > 0.88) t = 'M';
            else if (e > 0.76) t = 'H';
            else if (m > 0.68 && e < 0.55) t = 'S';
            else if (m > 0.48) t = 'F';
            else t = 'G';
            map[y].push(t);
        }
    }

    // Rivers: run downhill from high ground until they reach the sea.
    const riverCount = 1 + Math.floor(rand() * 2);
    const highs: [number, number][] = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (elev[y][x] > 0.7) highs.push([x, y]);
    for (let r = 0; r < riverCount && highs.length; r++) {
        let [x, y] = highs[Math.floor(rand() * highs.length)];
        const seen = new Set<string>();
        for (let step = 0; step < 40; step++) {
            seen.add(`${x},${y}`);
            if (map[y][x] === 'W' || map[y][x] === 'B') break;
            if (map[y][x] !== 'M') map[y][x] = 'R';
            let best: [number, number] | null = null;
            for (const [ox, oy] of NEIGHBORS) {
                const nx = x + ox, ny = y + oy;
                if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen.has(`${nx},${ny}`)) continue;
                if (!best || elev[ny][nx] < elev[best[1]][best[0]]) best = [nx, ny];
            }
            if (!best) break;
            [x, y] = best;
        }
    }

    // Keep only the largest walkable region so every tile is reachable.
    const comp: number[][] = map.map(row => row.map(() => -1));
    const sizes: number[] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!walkable(map[y][x]) || comp[y][x] !== -1) continue;
        const id = sizes.length;
        let count = 0;
        const stack: [number, number][] = [[x, y]];
        comp[y][x] = id;
        while (stack.length) {
            const [cx, cy] = stack.pop()!;
            count++;
            for (const [ox, oy] of NEIGHBORS) {
                const nx = cx + ox, ny = cy + oy;
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                if (walkable(map[ny][nx]) && comp[ny][nx] === -1) { comp[ny][nx] = id; stack.push([nx, ny]); }
            }
        }
        sizes.push(count);
    }
    if (!sizes.length) return null;
    const main = sizes.indexOf(Math.max(...sizes));
    if (sizes[main] < 60) return null; // too small to be fun; retry with another salt

    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (walkable(map[y][x]) && comp[y][x] !== main) {
            const nearSea = NEIGHBORS.some(([ox, oy]) => map[y + oy]?.[x + ox] === 'W');
            map[y][x] = nearSea ? 'W' : 'M';
        }
    }

    // Start on the most central easy tile.
    let start = { x: -1, y: -1 }, bestD = Infinity;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        if (!['G', 'B', 'F'].includes(map[y][x]) || comp[y][x] !== main) continue;
        const d = (x - w / 2) ** 2 + (y - h / 2) ** 2;
        if (d < bestD) { bestD = d; start = { x, y }; }
    }
    if (start.x < 0) return null;
    return { map, start, seed };
}

/** Generate a unique, reproducible island from a seed string. */
export function generateMap(seed: string): GeneratedMap {
    for (let salt = 0; salt < 50; salt++) {
        const result = attempt(seed, salt);
        if (result) return result;
    }
    throw new Error(`Could not generate a playable map for seed "${seed}"`);
}

export function randomSeed(): string {
    return Math.random().toString(36).slice(2, 8);
}
