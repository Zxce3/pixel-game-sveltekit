<script lang="ts">
  import type { Game } from '$lib/game/Game';
  import type { Direction } from '$lib/types';

  let { game }: { game?: Game } = $props();
  let timer: ReturnType<typeof setInterval> | null = null;

  function press(dir: Direction, e: PointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    game?.move(dir);
    stop();
    timer = setInterval(() => game?.move(dir), 60); // hold to keep walking (game rate-limits)
  }
  function stop() { if (timer) clearInterval(timer); timer = null; }

  const keys: { dir: Direction; label: string; cls: string; aria: string }[] = [
    { dir: 'up', label: '▲', cls: 'u', aria: 'Move up' },
    { dir: 'left', label: '◀', cls: 'l', aria: 'Move left' },
    { dir: 'right', label: '▶', cls: 'r', aria: 'Move right' },
    { dir: 'down', label: '▼', cls: 'd', aria: 'Move down' }
  ];
</script>

<svelte:window onblur={stop} />

<div class="dpad" role="group" aria-label="Directional pad">
  {#each keys as k}
    <button class="key {k.cls} glass" aria-label={k.aria} disabled={!game}
      onpointerdown={(e) => press(k.dir, e)} onpointerup={stop} onpointercancel={stop} onlostpointercapture={stop}>{k.label}</button>
  {/each}
</div>

<style>
  .dpad { display: grid; grid-template: repeat(3, 56px) / repeat(3, 56px); gap: 6px; touch-action: none; user-select: none; -webkit-user-select: none; }
  .key { color: var(--text); font-size: 1.2rem; cursor: pointer; display: grid; place-items: center; }
  .key:active { background: rgba(94, 234, 212, 0.28); }
  .u { grid-area: 1 / 2; } .l { grid-area: 2 / 1; } .r { grid-area: 2 / 3; } .d { grid-area: 3 / 2; }
</style>
