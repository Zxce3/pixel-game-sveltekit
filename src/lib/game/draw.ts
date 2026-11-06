import type { TerrainType, Direction, Position, AnimationSettings } from '$lib/types';
import { terrainColors } from '$lib/types';

interface Cloud {
    x: number;
    y: number;
    size: number;
    opacity?: number;
}

interface DrawPixelParams {
    terrainMap: TerrainType[][];
    pixelPos: Position;
    facing: Direction;
    isMoving: boolean;
    animationSettings: AnimationSettings;
    waterOffset: number;
    clouds: Cloud[];
    cloudOffset: number;
    tileSize?: number;
    riverOffset: number;
}

export function drawCharacter(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    facing: Direction,
    isMoving: boolean
): void {
    const bounce = isMoving ? -Math.abs(Math.sin(Date.now() / 75)) * 3 : 0;
    const scale = size / 40;
    const legSwing = isMoving ? Math.round(Math.sin(Date.now() / 75) * 2 * scale) : 0;

    const baseX = Math.floor(x + size / 4);
    const baseY = Math.floor(y + size / 4 + bounce);

    const colors = {
        skin: '#ffb74d',
        shirt: '#90e0ef',
        pants: '#3f51b5',
        backpack: '#8d6e63',
        shoes: '#37474f',
        hair: '#3e2723',
    };

    const charSize = {
        head: 10 * scale,
        body: 12 * scale,
        limb: 4 * scale,
    };

    ctx.save();

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {string} color
     */
    function drawRect(x: number, y: number, width: number, height: number, color: string) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(width), Math.floor(height));
    }

    if (facing === 'right' || facing === 'left') {
        if (facing === 'left') {
            ctx.translate(x + size, y);
            ctx.scale(-1, 1);
            ctx.translate(-x, -y);
        }

        // Body
        drawRect(baseX, baseY + charSize.head, charSize.head, charSize.body, colors.shirt);
        drawRect(baseX, baseY + charSize.head + charSize.body, charSize.head, charSize.limb * 2, colors.pants);

        // Backpack
        const backpackX = baseX + charSize.head;
        drawRect(
            backpackX,
            baseY + charSize.head,
            charSize.limb * 1.5,
            charSize.body * 0.7,
            colors.backpack
        );

        // Head and hair
        drawRect(baseX, baseY, charSize.head, charSize.head, colors.skin);
        drawRect(baseX, baseY, charSize.head, charSize.limb, colors.hair);

        // Arms
        const armOffset = isMoving ? Math.sin(Date.now() / 150) * 3 : 0;
        drawRect(baseX - charSize.limb, baseY + charSize.head + armOffset, charSize.limb, charSize.limb * 2, colors.shirt);
        drawRect(baseX + charSize.head, baseY + charSize.head - armOffset, charSize.limb, charSize.limb * 2, colors.shirt);

        // Shoes
        drawRect(baseX, baseY + charSize.head + charSize.body + charSize.limb * 2 - legSwing, charSize.limb * 1.5, charSize.limb, colors.shoes);
        drawRect(baseX + charSize.limb * 1.5, baseY + charSize.head + charSize.body + charSize.limb * 2 + legSwing, charSize.limb * 1.5, charSize.limb, colors.shoes);

    } else {
        // Front/Back view
        // Body
        drawRect(baseX, baseY + charSize.head, charSize.head, charSize.body, colors.shirt);
        drawRect(baseX, baseY + charSize.head + charSize.body, charSize.head, charSize.limb * 2, colors.pants);

        if (facing === 'back') {
            // Backpack
            drawRect(baseX - charSize.limb, baseY + charSize.head, charSize.head + charSize.limb * 2, charSize.body * 0.7, colors.backpack);
        }

        // Head and hair
        drawRect(baseX, baseY, charSize.head, charSize.head, colors.skin);
        drawRect(baseX - scale, baseY, charSize.head + 2 * scale, charSize.limb, colors.hair);

        // Arms
        const armOffset = isMoving ? Math.sin(Date.now() / 150) * 2 : 0;
        drawRect(baseX - charSize.limb, baseY + charSize.head + armOffset, charSize.limb, charSize.limb * 2, colors.shirt);
        drawRect(baseX + charSize.head, baseY + charSize.head - armOffset, charSize.limb, charSize.limb * 2, colors.shirt);

        // Shoes
        drawRect(baseX, baseY + charSize.head + charSize.body + charSize.limb * 2 - legSwing, charSize.limb * 1.5, charSize.limb, colors.shoes);
        drawRect(baseX + charSize.limb * 1.5, baseY + charSize.head + charSize.body + charSize.limb * 2 + legSwing, charSize.limb * 1.5, charSize.limb, colors.shoes);
    }

    ctx.restore();
}

export function drawTrees(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + size / 3, y + size / 2, size / 3, size / 2);
    ctx.fillStyle = '#8B5E3C';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + size / 2, y + size / 4);
    ctx.lineTo(x + size / 4, y + size / 2);
    ctx.lineTo(x + (3 * size) / 4, y + size / 2);
    ctx.closePath();
    ctx.fillStyle = '#52b788';
    ctx.fill();
    ctx.restore();
}

export function drawMountains(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
): void {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y + size / 4);
    ctx.lineTo(x + size / 4, y + (3 * size) / 4);
    ctx.lineTo(x + (3 * size) / 4, y + (3 * size) / 4);
    ctx.closePath();
    ctx.fillStyle = '#4e4e4e';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + size / 2, y + size / 4);
    ctx.lineTo(x + size / 3, y + size / 2);
    ctx.lineTo(x + (2 * size) / 3, y + size / 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();
    ctx.restore();
}

export function drawWaves(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    waterOffset = 0
): void {
    ctx.save();
    // Clip to the tile so strokes never bleed into neighbours.
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();

    ctx.fillStyle = terrainColors.W;
    ctx.fillRect(x, y, size, size);

    ctx.lineWidth = Math.max(2, size / 14);
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.32 - i * 0.07})`;
        const baseY = y + (size * (i + 0.5)) / 3;
        for (let j = 0; j <= size; j += 2) {
            // World-space x keeps the wave continuous across adjacent water tiles.
            const wx = x + j;
            const wy = baseY + Math.sin(wx / 22 - waterOffset + i * 1.7) * (size / 14);
            if (j === 0) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
    }
    ctx.restore();
}

export function drawCloud(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    opacity = 0.5
): void {
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;

    const circles = [
        { x: x, y: y, r: size * 0.4 },
        { x: x + size * 0.3, y: y - size * 0.1, r: size * 0.4 },
        { x: x + size * 0.4, y: y + size * 0.1, r: size * 0.35 },
        { x: x + size * 0.6, y: y, r: size * 0.3 }
    ];

    // Single path so overlapping circles don't double up the alpha.
    ctx.beginPath();
    circles.forEach(circle => {
        ctx.moveTo(circle.x + circle.r, circle.y);
        ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
    });
    ctx.fill();

    ctx.restore();
}

export function drawRiver(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    riverOffset = 0
): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();

    ctx.fillStyle = terrainColors.R;
    ctx.fillRect(x, y, size, size);

    ctx.lineCap = 'round';
    const lines = [
        { at: 0.32, w: size / 12, color: 'rgba(255, 255, 255, 0.45)', phase: 0 },
        { at: 0.68, w: size / 16, color: 'rgba(30, 100, 160, 0.35)', phase: 1.3 }
    ];
    for (const l of lines) {
        ctx.beginPath();
        ctx.lineWidth = l.w;
        ctx.strokeStyle = l.color;
        for (let i = 0; i <= size; i += 2) {
            const wx = x + i;
            // riverOffset*2 completes whole cycles per wrap, so the loop is seamless.
            const wy = y + size * l.at + Math.sin(wx / 14 - riverOffset * 2 + l.phase) * (size / 14);
            if (i === 0) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
    }
    ctx.restore();
}

export function drawPixel(
    ctx: CanvasRenderingContext2D,
    params: DrawPixelParams
): void {
    const { 
        terrainMap, 
        pixelPos, 
        facing, 
        isMoving, 
        animationSettings, 
        waterOffset,
        clouds,
        cloudOffset,
        tileSize = 40,
        riverOffset
    } = params;

    if (!terrainMap) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // First Pass: Base terrain
    for (let row = 0; row < terrainMap.length; row++) {
        for (let col = 0; col < terrainMap[row].length; col++) {
            const terrain = terrainMap[row][col];
            ctx.fillStyle = terrainColors[terrain];
            ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
        }
    }

    // Second Pass: Terrain details
    for (let row = 0; row < terrainMap.length; row++) {
        for (let col = 0; col < terrainMap[row].length; col++) {
            const terrain = terrainMap[row][col];
            const isPlayerTile = row === Math.round(pixelPos.y) && col === Math.round(pixelPos.x);
            {
                switch (terrain) {
                    case 'F':
                        if (!isPlayerTile) drawTrees(ctx, col * tileSize, row * tileSize, tileSize);
                        break;
                    case 'M':
                        if (!isPlayerTile) drawMountains(ctx, col * tileSize, row * tileSize, tileSize);
                        break;
                    case 'W':
                        if (animationSettings.enableWaves) {
                            drawWaves(ctx, col * tileSize, row * tileSize, tileSize, waterOffset);
                        } else {
                            ctx.fillStyle = terrainColors.W;
                            ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
                        }
                        break;
                    case 'R':
                        if (params.animationSettings.enableRiver) {
                            drawRiver(ctx, col * tileSize, row * tileSize, tileSize, riverOffset);
                        } else {
                            ctx.fillStyle = terrainColors.R;
                            ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
                        }
                        break;
                }
            }
        }
    }

    // Draw character
    const x = pixelPos.x * tileSize;
    const y = pixelPos.y * tileSize;
    const view = facing === 'up' ? 'back' : facing === 'down' ? 'front' : facing;
    drawCharacter(ctx, x, y - tileSize / 8, tileSize, view, isMoving);

    // Draw player terrain details
    const px = Math.round(pixelPos.x), py = Math.round(pixelPos.y);
    const playerTerrain = terrainMap[py]?.[px];
    if (playerTerrain === 'F') {
        drawTrees(ctx, px * tileSize, py * tileSize, tileSize);
    }

    // Draw clouds
    if (animationSettings.enableClouds && clouds) {
        clouds.forEach(cloud => {
            drawCloud(ctx, cloud.x, cloud.y, cloud.size, cloud.opacity);
        });
    }
}


export interface Effect {
    /** Tile coordinates. */
    x: number;
    y: number;
    start: number;
}

/** "Discovery" pop: an expanding ring with a few sparkles on a newly explored tile. */
export function drawEffects(
    ctx: CanvasRenderingContext2D,
    effects: Effect[],
    now: number,
    tileSize: number
): void {
    ctx.save();
    for (const fx of effects) {
        const t = Math.min(1, (now - fx.start) / 600);
        const ease = 1 - (1 - t) * (1 - t);
        const cx = (fx.x + 0.5) * tileSize, cy = (fx.y + 0.5) * tileSize;
        const alpha = 1 - t;

        ctx.lineWidth = 3 * (1 - t) + 1;
        ctx.strokeStyle = `rgba(94, 234, 212, ${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 6 + ease * tileSize * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + 0.4;
            const r = 8 + ease * tileSize * 0.6;
            const s = 3 * (1 - t) + 1;
            ctx.fillRect(Math.round(cx + Math.cos(a) * r - s / 2), Math.round(cy + Math.sin(a) * r - s / 2), s, s);
        }
    }
    ctx.restore();
}
