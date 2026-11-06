<script lang="ts">
  import { terrainColors, terrainNames } from '$lib/types';
  import type { TerrainType } from '$lib/types';

  let { terrain, steps, explored, exploreTotal, muted, onmenu, onmute }: {
    terrain: TerrainType; steps: number; explored: number; exploreTotal: number;
    muted: boolean; onmenu: () => void; onmute: () => void;
  } = $props();

  const pct = $derived(exploreTotal ? Math.round((explored / exploreTotal) * 100) : 0);
</script>

<div class="hud">
  <div class="glass stats" aria-live="off">
    <div class="row">
      <span class="dot" style="background:{terrainColors[terrain]}"></span>
      <span class="terrain">{terrainNames[terrain]}</span>
      <span class="sep"></span>
      <span class="label">Steps</span><b class="num">{steps}</b>
    </div>
    <div class="bar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100" aria-label="Explored">
      <i style="width:{pct}%"></i>
    </div>
    <div class="label small num">Explored {explored}/{exploreTotal} · {pct}%</div>
  </div>

  <div class="glass tools">
    <button class="icon-btn" onclick={onmute} aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute' : 'Mute'}>{muted ? '🔇' : '🔊'}</button>
    <button class="icon-btn" onclick={onmenu} aria-label="Open menu (M)" title="Menu (M)">☰</button>
  </div>
</div>

<style>
  .hud { position: absolute; inset: 0; pointer-events: none; padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 0 max(12px, env(safe-area-inset-left)); display: flex; justify-content: space-between; align-items: flex-start; z-index: 5; }
  .hud > * { pointer-events: auto; }
  .stats { padding: 10px 14px; min-width: 190px; display: grid; gap: 6px; }
  .row { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
  .dot { width: 10px; height: 10px; border-radius: 3px; box-shadow: 0 0 0 1px rgba(255,255,255,.3); }
  .terrain { font-weight: 600; }
  .sep { flex: 1; }
  .label { color: var(--muted); font-size: 0.8rem; }
  .small { font-size: 0.72rem; }
  .bar { height: 5px; border-radius: 99px; background: rgba(255,255,255,.1); overflow: hidden; }
  .bar i { display: block; height: 100%; background: var(--accent); border-radius: 99px; transition: width 0.3s ease; }
  .tools { display: flex; padding: 4px; gap: 2px; }
</style>
