<script lang="ts">
    import type { Game } from '$lib/game/Game';
    export let game: Game | undefined;
    
    const controls = [
        { direction: 'left', label: '←' },
        { direction: 'right', label: '→' },
        { direction: 'up', label: '↑' },
        { direction: 'down', label: '↓' }
    ] as const;
</script>

<div class="controls flex justify-center gap-2 md:gap-4 flex-wrap">
    {#each controls as { direction, label }}
        <button 
            class="control-btn p-3 md:p-4 min-w-[3rem]" 
            on:click={() => game?.move(direction)}
            disabled={!game}
        >
            {label}
        </button>
    {/each}
</div>

<style>
    .control-btn {
        transition: all 0.2s ease;
        border-radius: 0.5rem;
    }
    
    .control-btn:hover:not(:disabled) {
        transform: translateY(-1px);
    }
    
    .control-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .control-btn:active:not(:disabled) {
        transform: translateY(1px);
    }
</style>
