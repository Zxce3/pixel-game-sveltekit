<script lang="ts">
  import type { Game } from '$lib/game/Game';
  import { terrainColors } from '$lib/types';

  let { game, tick }: { game?: Game; tick: number } = $props();
  let canvas: HTMLCanvasElement | undefined = $state();
  const T = 8; // px per tile
  const VISION = 2; // tiles revealed around every visited tile

  $effect(() => {
    tick; // redraw whenever game state changes
    if (!canvas || !game) return;
    const { terrainMap, state } = game.getGameState();
    if (!terrainMap) return;
    const h = terrainMap.length, w = terrainMap[0].length;
    canvas.width = w * T;
    canvas.height = h * T;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const seen = new Set<string>();
    for (const key of game.visited) {
      const [vx, vy] = key.split(',').map(Number);
      for (let dy = -VISION; dy <= VISION; dy++)
        for (let dx = -VISION; dx <= VISION; dx++)
          if (dx * dx + dy * dy <= VISION * VISION + 1) seen.add(`${vx + dx},${vy + dy}`);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!seen.has(`${x},${y}`)) continue;
      ctx.fillStyle = terrainColors[terrainMap[y][x]];
      ctx.fillRect(x * T, y * T, T, T);
      if (!game.visited.has(`${x},${y}`)) { // seen-but-not-visited tiles are dimmed
        ctx.fillStyle = 'rgba(8, 12, 24, 0.45)';
        ctx.fillRect(x * T, y * T, T, T);
      }
    }
    const { x, y } = state.position;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x * T - 1, y * T - 1, T + 2, T + 2);
    ctx.fillStyle = '#0d9488';
    ctx.fillRect(x * T + 1, y * T + 1, T - 2, T - 2);
  });
</script>

<div class="glass mini" aria-label="Mini-map" role="img">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .mini { padding: 6px; line-height: 0; }
  canvas { display: block; width: clamp(120px, 22vw, 176px); height: auto; border-radius: 8px; }
</style>
