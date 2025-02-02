import type { TerrainType, Direction, Position, AnimationSettings } from './types';
import { terrainColors } from './types';

interface Cloud {
    x: number;
    y: number;
    size: number;
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
    const bounce = isMoving ? Math.sin(Date.now() / 150) * 2 : 0;
    const scale = size / 40;

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
        drawRect(baseX, baseY + charSize.head + charSize.body + charSize.limb * 2, charSize.limb * 1.5, charSize.limb, colors.shoes);
        drawRect(baseX + charSize.limb * 1.5, baseY + charSize.head + charSize.body + charSize.limb * 2, charSize.limb * 1.5, charSize.limb, colors.shoes);

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
        drawRect(baseX, baseY + charSize.head + charSize.body + charSize.limb * 2, charSize.limb * 1.5, charSize.limb, colors.shoes);
        drawRect(baseX + charSize.limb * 1.5, baseY + charSize.head + charSize.body + charSize.limb * 2, charSize.limb * 1.5, charSize.limb, colors.shoes);
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
    ctx.beginPath();
    ctx.lineWidth = 8;

    const waterGradient = ctx.createLinearGradient(x, y, x, y + size);
    waterGradient.addColorStop(0, 'rgba(0, 181, 216, 0.6)');
    waterGradient.addColorStop(1, 'rgba(0, 105, 148, 0.8)');

    ctx.strokeStyle = waterGradient;

    for (let i = 0; i < 3; i++) {
        const wavePhase = waterOffset + (i * Math.PI) / 3;
        const yOffset = (size / 3) * i;

        ctx.moveTo(x, y + yOffset + Math.sin(wavePhase) * 4);

        for (let j = 0; j <= size; j += 2) {
            const curveX = x + j;
            const curveY = y + yOffset + Math.sin(wavePhase + j / 40) * 5;
            ctx.lineTo(curveX, curveY);
        }
    }

    ctx.stroke();
}

export function drawCloud(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
): void {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';

    const circles = [
        { x: x, y: y, r: size * 0.4 },
        { x: x + size * 0.3, y: y - size * 0.1, r: size * 0.4 },
        { x: x + size * 0.4, y: y + size * 0.1, r: size * 0.35 },
        { x: x + size * 0.6, y: y, r: size * 0.3 }
    ];

    circles.forEach(circle => {
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
        ctx.fill();
    });

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
    ctx.lineWidth = 4;

    const riverGradient = ctx.createLinearGradient(x, y, x + size, y);
    riverGradient.addColorStop(0, 'rgba(100, 181, 246, 0.6)');
    riverGradient.addColorStop(1, 'rgba(30, 136, 229, 0.8)');

    ctx.strokeStyle = riverGradient;
    ctx.fillStyle = 'rgba(79, 195, 247, 0.4)';

    // Draw flowing river effect
    const amplitude = 3;
    const frequency = size / 80;
    
    ctx.beginPath();
    ctx.moveTo(x, y + size/2);
    
    for (let i = 0; i <= size; i++) {
        const xPos = x + i;
        const yPos = y + size/2 + Math.sin(riverOffset + i * frequency) * amplitude;
        ctx.lineTo(xPos, yPos);
    }
    
    ctx.stroke();
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
            if (!(row === Math.floor(pixelPos.y) && col === Math.floor(pixelPos.x))) {
                switch (terrain) {
                    case 'F':
                        drawTrees(ctx, col * tileSize, row * tileSize, tileSize);
                        break;
                    case 'M':
                        drawMountains(ctx, col * tileSize, row * tileSize, tileSize);
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
                            drawRiver(ctx, col * tileSize, row * tileSize, tileSize, params.riverOffset);
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
    drawCharacter(ctx, x, y - tileSize / 8, tileSize, facing, isMoving);

    // Draw player terrain details
    const playerTerrain = terrainMap[Math.floor(pixelPos.y)]?.[Math.floor(pixelPos.x)];
    if (playerTerrain === 'F') {
        drawTrees(ctx, Math.floor(pixelPos.x) * tileSize, Math.floor(pixelPos.y) * tileSize, tileSize);
    }

    // Draw clouds
    if (animationSettings.enableClouds && clouds) {
        clouds.forEach(cloud => {
            drawCloud(ctx, cloud.x, cloud.y, cloud.size);
        });
    }
}
