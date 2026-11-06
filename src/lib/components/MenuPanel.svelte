<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { terrainColors, terrainNames } from '$lib/types';
  import type { TerrainType, Position, WorkerStatus } from '$lib/types';
  import type { IdleStateType } from '$lib/game/state';
  import DebugPanel from './DebugPanel.svelte';

  let {
    seed = $bindable(''), currentSeed, clouds = $bindable(), waves = $bindable(), river = $bindable(), muted,
    currentTerrain, onclose, onload, onrandom, oncopy, onsettings, onmute,
    fps, memory, browserSupportsMemoryAPI, workerStatus, pixelPos, debugMessage, isWorkerBusy, idleState
  }: {
    seed: string; currentSeed: string; clouds: boolean; waves: boolean; river: boolean; muted: boolean;
    currentTerrain: TerrainType; onclose: () => void; onload: () => void; onrandom: () => void; oncopy: () => void;
    onsettings: () => void; onmute: () => void;
    fps: number; memory: { heap: number; heapLimit: number }; browserSupportsMemoryAPI: boolean;
    workerStatus: WorkerStatus; pixelPos: Position; debugMessage: string; isWorkerBusy: boolean; idleState: IdleStateType;
  } = $props();

  let showDebug = $state(false);
  let panel: HTMLElement | undefined = $state();
  $effect(() => { panel?.focus(); });
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') onclose(); }} />

<div class="scrim" transition:fade={{ duration: 180 }} onclick={onclose} role="presentation"></div>
<div bind:this={panel} tabindex="-1" class="panel glass" transition:fly={{ x: 360, duration: 240 }} role="dialog" aria-modal="true" aria-label="Menu">
  <header>
    <h2>Menu</h2>
    <button class="icon-btn" onclick={onclose} aria-label="Close menu">✕</button>
  </header>

  <section>
    <h3>Map</h3>
    <form onsubmit={(e) => { e.preventDefault(); onload(); }}>
      <div class="inline">
        <input class="field grow" bind:value={seed} placeholder="random" aria-label="Map seed" autocomplete="off" spellcheck="false" />
        <button type="submit" class="btn">Load</button>
      </div>
    </form>
    <div class="inline">
      <button class="btn btn-primary grow" onclick={onrandom}>🎲 New island <kbd>N</kbd></button>
      <button class="btn" onclick={oncopy} disabled={!currentSeed} title="Copy a link to this exact map">🔗 Copy link</button>
    </div>
    {#if currentSeed}<p class="hint">Current seed: <code>{currentSeed}</code></p>{/if}
  </section>

  <section>
    <h3>Display &amp; sound</h3>
    <label class="switch"><input type="checkbox" bind:checked={clouds} onchange={onsettings} /><span>Clouds</span></label>
    <label class="switch"><input type="checkbox" bind:checked={waves} onchange={onsettings} /><span>Water waves</span></label>
    <label class="switch"><input type="checkbox" bind:checked={river} onchange={onsettings} /><span>River flow</span></label>
    <label class="switch"><input type="checkbox" checked={!muted} onchange={onmute} /><span>Sound</span></label>
  </section>

  <section>
    <h3>Terrain</h3>
    <ul class="legend">
      {#each Object.entries(terrainColors) as [t, color]}
        <li class:on={currentTerrain === t}><i style="background:{color}"></i>{terrainNames[t as TerrainType]}</li>
      {/each}
    </ul>
    <p class="hint">Water and mountains block you. Swamp, river, hills and forest slow you down.</p>
  </section>

  <section>
    <label class="switch"><input type="checkbox" bind:checked={showDebug} /><span>Developer info</span></label>
    {#if showDebug}
      <DebugPanel {fps} {memory} {browserSupportsMemoryAPI} {workerStatus} {pixelPos} terrainNames={terrainNames} {currentTerrain} {debugMessage} {isWorkerBusy} {idleState} />
    {/if}
  </section>

  <footer>
    <a href="https://github.com/Zxce3/pixel-game-sveltekit" target="_blank" rel="noopener noreferrer">View on GitHub ↗</a>
  </footer>
</div>

<style>
  .scrim { position: absolute; inset: 0; background: rgba(4, 7, 16, 0.5); z-index: 20; }
  .panel { position: absolute; top: 8px; right: 8px; bottom: 8px; width: min(360px, calc(100% - 16px)); z-index: 21; background: var(--glass-strong); padding: 16px 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 18px; outline: none; }
  header { display: flex; justify-content: space-between; align-items: center; }
  h2 { margin: 0; font-size: 1.15rem; }
  h3 { margin: 0 0 8px; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
  section { display: grid; gap: 8px; }
  .inline { display: flex; gap: 8px; }
  .grow { flex: 1; }
  .hint { margin: 0; color: var(--muted); font-size: 0.78rem; line-height: 1.5; }
  code { background: rgba(255,255,255,.08); padding: 1px 6px; border-radius: 5px; }
  kbd { background: rgba(0,0,0,.18); border-radius: 4px; padding: 0 5px; font-size: 0.7rem; font-family: inherit; }
  .switch { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.9rem; padding: 4px 0; }
  .switch input { appearance: none; -webkit-appearance: none; width: 36px; height: 20px; border-radius: 99px; background: rgba(255,255,255,.16); position: relative; cursor: pointer; transition: background .15s; border: 0; flex: none; }
  .switch input::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform .15s; }
  .switch input:checked { background: var(--accent); }
  .switch input:checked::after { transform: translateX(16px); background: var(--accent-ink); }
  .legend { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; font-size: 0.85rem; }
  .legend li { display: flex; align-items: center; gap: 8px; padding: 3px 6px; border-radius: 7px; }
  .legend li.on { background: rgba(94, 234, 212, 0.14); outline: 1px solid rgba(94, 234, 212, 0.4); }
  .legend i { width: 12px; height: 12px; border-radius: 3px; display: block; }
  footer { margin-top: auto; font-size: 0.8rem; }
  footer a { color: var(--accent); text-decoration: none; }
  footer a:hover { text-decoration: underline; }
</style>
