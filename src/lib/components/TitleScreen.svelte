<script lang="ts">
  import { fade, fly } from 'svelte/transition';

  let { seed = $bindable(''), onplay }: { seed: string; onplay: () => void } = $props();
  let playBtn: HTMLButtonElement | undefined = $state();
  $effect(() => { playBtn?.focus(); });
</script>

<div class="title" transition:fade={{ duration: 350 }} role="dialog" aria-modal="true" aria-labelledby="t">
  <div class="card glass" in:fly={{ y: 16, duration: 450, delay: 120 }}>
    <p class="eyebrow">Procedural exploration</p>
    <h1 id="t">Terrain Explorer</h1>
    <p class="lede">Wander a freshly generated island. Uncover every tile, cross rivers, wade through swamps — each seed is a world you can share.</p>

    <form onsubmit={(e) => { e.preventDefault(); onplay(); }}>
      <label for="title-seed">Seed <span>(optional — leave empty for the starter island)</span></label>
      <input id="title-seed" class="field" bind:value={seed} placeholder="e.g. hello" autocomplete="off" spellcheck="false" />
      <button bind:this={playBtn} class="btn btn-primary play" type="submit">Play ▶</button>
    </form>

    <ul class="tips">
      <li><kbd>WASD</kbd> / <kbd>←↑↓→</kbd> move</li>
      <li><kbd>M</kbd> menu</li>
      <li><kbd>N</kbd> new island</li>
    </ul>
  </div>
</div>

<style>
  .title { position: absolute; inset: 0; z-index: 30; display: grid; place-items: center; padding: 16px; background: radial-gradient(ellipse at center, rgba(8,12,24,.55), rgba(8,12,24,.88)); backdrop-filter: blur(6px); }
  .card { width: min(480px, 100%); padding: 28px; display: grid; gap: 14px; background: var(--glass-strong); }
  .eyebrow { margin: 0; color: var(--accent); font-size: 0.75rem; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
  h1 { margin: 0; font-size: clamp(1.8rem, 6vw, 2.5rem); line-height: 1.1; letter-spacing: -0.02em; }
  .lede { margin: 0; color: var(--muted); line-height: 1.55; }
  form { display: grid; gap: 8px; margin-top: 6px; }
  label { font-size: 0.82rem; font-weight: 600; }
  label span { color: var(--muted); font-weight: 400; }
  .play { margin-top: 6px; padding: 0.8rem 1rem; font-size: 1rem; }
  .tips { display: flex; flex-wrap: wrap; gap: 6px 16px; list-style: none; margin: 4px 0 0; padding: 0; color: var(--muted); font-size: 0.8rem; }
  kbd { background: rgba(255,255,255,.1); border: 1px solid var(--glass-border); border-radius: 5px; padding: 1px 6px; font-family: inherit; font-size: 0.75rem; color: var(--text); }
</style>
