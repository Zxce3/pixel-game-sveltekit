<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';
    import { Game } from '$lib/game/Game';
    import DebugPanel from '$lib/components/DebugPanel.svelte';
    import { theme } from '$lib/theme';
    import { terrainNames, terrainColors } from '$lib/types';
    import type { Position, TerrainType, WorkerStatus } from '$lib/types';
    import { STATUS } from '$lib/types';
    import Controls from '$lib/components/Controls.svelte';

    let game: Game;
    let enableClouds = false;
    let canvas: HTMLCanvasElement;
    let enableWaves = false;
    let enableRiver = false;
    let currentTerrain: TerrainType = 'G';
    let workerStatus: WorkerStatus = STATUS.IDLE;
    let pixelPos: Position = { x: 2, y: 2 };
    let debugMessage = '';
    let isWorkerBusy = false;
    let terrainData: { colors: Record<string, string>, names: Record<string, string> };

    let fps = 0;
    let memory = { heap: 0, heapLimit: 0 };
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let browserSupportsMemoryAPI = false;

    let gameStarted = false;

    let gameState = {
        currentTerrain: 'G' as TerrainType,
        terrainData: {
            colors: terrainColors,
            names: terrainNames
        }
    };

    let showDebugPanel = false;
    let showLegend = false;
    let showSettings = false;

    function togglePanel(panel: 'debug' | 'legend' | 'settings'): void {
        switch (panel) {
            case 'debug':
                showDebugPanel = !showDebugPanel;
                break;
            case 'legend':
                showLegend = !showLegend;
                break;
            case 'settings':
                showSettings = !showSettings;
                break;
        }
    }

    interface PerformanceWithMemory extends Performance {
        memory?: {
            usedJSHeapSize: number;
            jsHeapSizeLimit: number;
        };
    }

    async function startGame() {
        if (!browser || !canvas) return;
        
        const worker = new Worker(
            new URL('../lib/workers/worker.ts', import.meta.url),
            { type: 'module' }
        );

        game = new Game({
            canvas,
            worker,
            theme: $theme,
            fps: 30
        });

        game.start();
        gameStarted = true;
        updateDebugMetrics();
    }

    function updateDebugMetrics() {
        const now = performance.now();
        frameCount++;
        if (now - lastFrameTime >= 1000) {
            fps = Math.round((frameCount * 1000) / (now - lastFrameTime));
            frameCount = 0;
            lastFrameTime = now;

            browserSupportsMemoryAPI = !!(performance as PerformanceWithMemory).memory;
            if (browserSupportsMemoryAPI) {
                const perfMemory = (performance as PerformanceWithMemory).memory!;
                memory = {
                    heap: Math.round(perfMemory.usedJSHeapSize / 1048576),
                    heapLimit: Math.round(perfMemory.jsHeapSizeLimit / 1048576),
                };
            }
        }
        requestAnimationFrame(updateDebugMetrics);
    }
    $: enableClouds = game?.animationSettings.enableClouds ?? false;

    function updateGameState() {
        if (game) {
            const state = game.getGameState();
            currentTerrain = state.currentTerrain;
            workerStatus = state.state.status;
            pixelPos = state.state.position;
            debugMessage = state.state.message || '';
            isWorkerBusy = state.state.isMoving;
            gameState = {
                currentTerrain: state.currentTerrain,
                terrainData: {
                    colors: state.terrainColors,
                    names: state.terrainNames
                }
            };
        }
    }

    $: if (game?.state) {
        updateGameState();
    }

    onMount(() => {
        window.addEventListener('gamestateupdate', ((e: CustomEvent) => {
            if (e.detail) {
                const { state, message } = e.detail;
                if (message) {
                    debugMessage = message;
                }
                updateGameState();
            }
        }) as EventListener);
    });

    onDestroy(() => {
        if (game) {
            game.destroy();
        }
    });

    function handleKeyDown(e: KeyboardEvent) {
        if (!gameStarted || !game) return;
        switch (e.key.toLowerCase()) {
            case 'arrowleft':
            case 'a':
                game.move('left');
                break;
            case 'arrowright':
            case 'd':
                game.move('right');
                break;
            case 'arrowup':
            case 'w':
                game.move('up');
                break;
            case 'arrowdown':
            case 's':
                game.move('down');
                break;
        }
    }

    // Add reactive store for game-specific terrain data
    $: terrainData = {
        colors: game?.terrainColors || terrainColors,
        names: game?.terrainNames || terrainNames
    };

    // Update animation settings binding
    function updateAnimationSettings() {
        if (game) {
            game.setAnimationSettings({
                enableClouds,
                enableWaves,
                enableRiver
            });
        }
    }

    $: {
        if (enableClouds !== undefined || enableWaves !== undefined || enableRiver !== undefined) {
            updateAnimationSettings();
        }
    }
</script>

{#if !gameStarted}
    <div class="fixed inset-0 bg-gray-900/90 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg p-6 max-w-lg w-full">
            <h1 class="text-2xl font-bold mb-4">Terrain Explorer</h1>
            <div class="prose prose-sm mb-6">
                <p>Welcome to the terrain exploration game! Navigate through different landscapes:</p>
                <ul class="list-disc pl-4 space-y-1">
                    <li><span class="font-medium">Arrow keys</span> or buttons to move</li>
                    <li><span class="font-medium">Mountains</span> and <span class="font-medium">Water</span> are impassable</li>
                    <li>Watch the debug panel for performance metrics</li>
                    <li>Explore different terrains: forests, hills, beaches, and more!</li>
                </ul>
            </div>
            <button class="w-full bg-blue-700 text-white rounded p-3 font-medium hover:bg-blue-800 transition-colors" on:click={startGame}> Start Exploring </button>
        </div>
    </div>
{/if}

<div class="flex w-full min-h-dvh items-center justify-center p-4" class:blur-sm={!gameStarted}>
    <div class="w-full max-w-6xl bg-gray-50 rounded flex flex-col gap-y-4 shadow-xl border border-gray-150 p-4 md:p-6">
        <div class="flex justify-between items-center">
            <h1 class="text-xl md:text-2xl font-bold">Simple Pixel Game</h1>
            <div class="flex gap-2">
                <button 
                    class="px-3 py-2 text-sm rounded transition-colors"
                    class:bg-blue-600={showDebugPanel}
                    class:text-white={showDebugPanel}
                    class:bg-gray-200={!showDebugPanel}
                    on:click={() => togglePanel('debug')}
                >
                    {showDebugPanel ? 'Hide' : 'Show'} Debug
                </button>
                <button 
                    class="px-3 py-2 text-sm rounded transition-colors"
                    class:bg-blue-600={showLegend}
                    class:text-white={showLegend}
                    class:bg-gray-200={!showLegend}
                    on:click={() => togglePanel('legend')}
                >
                    {showLegend ? 'Hide' : 'Show'} Legend
                </button>
                <button 
                    class="px-3 py-2 text-sm rounded transition-colors"
                    class:bg-blue-600={showSettings}
                    class:text-white={showSettings}
                    class:bg-gray-200={!showSettings}
                    on:click={() => togglePanel('settings')}
                >
                    {showSettings ? 'Hide' : 'Show'} Settings
                </button>
            </div>
        </div>

        <!-- Debug Panel -->
        {#if showDebugPanel}
            <DebugPanel
                {fps}
                {memory}
                {browserSupportsMemoryAPI}
                {workerStatus}
                {pixelPos}
                {terrainNames}
                {currentTerrain}
                {debugMessage}
                {isWorkerBusy}
                idleState={game?.state?.idleState || 'active'}
            />
        {/if}

        <div class="relative w-full aspect-[4/3] max-h-[70vh]">
            <canvas
                bind:this={canvas}
                id="gameCanvas"
                width="800"
                height="600"
                class="absolute inset-0 w-full h-full object-contain border border-gray-200 rounded"
            ></canvas>
        </div>
        
        <Controls {game} />

        <!-- Legend -->
        {#if showLegend}
            <div class="legend grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs md:text-sm mt-4">
                {#each Object.entries(gameState.terrainData.colors) as [type, color]}
                    <div class="flex items-center gap-2 p-1 rounded" class:highlight={gameState.currentTerrain === type}>
                        <div class="w-3 h-3 md:w-4 md:h-4" style="background: {color}"></div>
                        <span>{gameState.terrainData.names[type as TerrainType]}</span>
                    </div>
                {/each}
            </div>
        {/if}

        <!-- Animation Settings -->
        {#if showSettings}
            <div class="settings-panel bg-gray-800 text-white p-3 md:p-4 rounded text-xs md:text-sm font-mono mt-4">
                <h3 class="font-bold mb-2">Animation Settings</h3>
                <div class="grid grid-cols-3 gap-2">
                    <label class="flex items-center gap-2">
                        <input type="checkbox" bind:checked={enableClouds} class="form-checkbox text-blue-600" />
                        <span>Clouds {enableClouds ? '(Active)' : ''}</span>
                    </label>
                    <label class="flex items-center gap-2">
                        <input type="checkbox" bind:checked={enableWaves} class="form-checkbox text-blue-600" />
                        <span>Water Animation {enableWaves ? '(Active)' : ''}</span>
                    </label>
                    <label class="flex items-center gap-2">
                        <input type="checkbox" bind:checked={enableRiver} class="form-checkbox text-blue-600" />
                        <span>River {enableRiver ? '(Active)' : ''}</span>
                    </label>
                </div>
            </div>
        {/if}
    </div>
</div>

<svelte:window on:keydown={handleKeyDown} />

<style>
    .highlight {
        background-color: rgba(76, 175, 80, 0.1);
        border: 1px solid #4caf50;
    }


</style>
