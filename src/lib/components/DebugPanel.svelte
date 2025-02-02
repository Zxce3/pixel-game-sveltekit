<script lang="ts">
  import type { Position, TerrainType } from '$lib/types';
  import { theme } from '$lib/theme';
  import type { IdleStateType } from '$lib/game/state';

  export let fps: number;
  export let memory: { heap: number; heapLimit: number };
  export let browserSupportsMemoryAPI: boolean;
  export let workerStatus: string;
  export let pixelPos: Position;
  export let terrainNames: Record<TerrainType, string>;
  export let currentTerrain: TerrainType;
  export let debugMessage: string = '';
  export let isWorkerBusy: boolean = false;
  export let idleState: IdleStateType = 'active';

  const idleStateColors = {
    active: 'var(--success-color, #22c55e)',
    resting: 'var(--info-color, #3b82f6)',
    idle: 'var(--warning-color, #f59e0b)',
    sleeping: 'var(--danger-color, #ef4444)'
  };

  $: panelStyle = `
    --panel-bg: ${$theme.colors.background};
    --panel-text: ${$theme.colors.text};
    --success-color: #22c55e;
    --warning-color: #f59e0b;
    --danger-color: #ef4444;
    --info-color: #3b82f6;
  `;

  $: statePanelStyle = `
    color: ${idleStateColors[idleState]};
    background-color: ${idleState !== 'active' ? 'rgba(0,0,0,0.05)' : 'transparent'};
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  `;
</script>

<div 
  class="debug-panel"
  style={panelStyle}
>
  <div class="grid">
    <div class="performance">
      <h3>Performance</h3>
      <dl>
        <dt>FPS:</dt>
        <dd>{fps}</dd>
        <dt>Heap:</dt>
        <dd>
          {#if browserSupportsMemoryAPI}
            {memory.heap}MB / {memory.heapLimit}MB
          {:else}
            <span class="text-warning">Not available</span>
          {/if}
        </dd>
        <dt>Status:</dt>
        <dd>{workerStatus}</dd>
        <dt>Worker:</dt>
        <dd class={isWorkerBusy ? 'text-warning' : 'text-success'}>
          {isWorkerBusy ? 'Processing' : 'Idle'}
        </dd>
        <dt>State:</dt>
        <dd style={statePanelStyle}>{idleState}</dd>
      </dl>
      {#if !browserSupportsMemoryAPI}
        <p class="note">Memory metrics only available in Chrome-based browsers in development mode.</p>
      {/if}
    </div>
    <div class="game-state">
      <h3>Game State</h3>
      <dl>
        <dt>Position:</dt>
        <dd>x:{pixelPos.x} y:{pixelPos.y}</dd>
        <dt>Terrain:</dt>
        <dd>{terrainNames[currentTerrain] ?? 'None'}</dd>
        <dt>Message:</dt>
        <dd>{debugMessage}</dd>
      </dl>
    </div>
  </div>
</div>

<style>
  .debug-panel {
    background-color: color-mix(in srgb, var(--panel-bg) 95%, black);
    color: var(--panel-text);
    padding: 1rem;
    border-radius: 0.5rem;
    font-family: ui-monospace, monospace;
    font-size: 0.875rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .grid {
    display: grid;
    gap: 1rem;
  }

  @media (min-width: 768px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  h3 {
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.25rem 0.5rem;
    align-items: baseline;
  }

  dt {
    font-weight: 500;
    opacity: 0.8;
  }

  .note {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: var(--warning-color);
  }

  .text-success {
    color: var(--success-color);
  }

  .text-warning {
    color: var(--warning-color);
  }

  .highlight {
    background-color: color-mix(in srgb, var(--success-color) 10%, transparent);
    border: 1px solid var(--success-color);
  }
    
  dd {
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .text-highlight {
    background-color: color-mix(in srgb, var(--accent-color) 15%, transparent);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
  }
</style>
