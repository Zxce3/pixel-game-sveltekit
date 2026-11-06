<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';
    import { fade } from 'svelte/transition';
    import { get } from 'svelte/store';
    import { Game, type GameEventType } from '$lib/game/Game';
    import { theme } from '$lib/theme';
    import { sfx } from '$lib/audio';
    import { STATUS, terrainNames } from '$lib/types';
    import type { Position, TerrainType, WorkerStatus } from '$lib/types';
    import type { IdleStateType } from '$lib/game/state';
    import Hud from '$lib/components/Hud.svelte';
    import MiniMap from '$lib/components/MiniMap.svelte';
    import DPad from '$lib/components/DPad.svelte';
    import TitleScreen from '$lib/components/TitleScreen.svelte';
    import MenuPanel from '$lib/components/MenuPanel.svelte';

    const SETTINGS_KEY = 'pixel-settings';

    let canvas: HTMLCanvasElement | undefined = $state();
    let game: Game | undefined = $state();

    // UI state
    let playing = $state(false);
    let menuOpen = $state(false);
    let seedInput = $state('');
    let currentSeed = $state('');
    let toast = $state({ text: '', id: 0 });
    let veil = $state(0); // bump to replay the map-change transition
    let tick = $state(0); // bump to redraw the mini-map

    // Persisted settings
    let clouds = $state(true);
    let waves = $state(true);
    let river = $state(true);
    let muted = $state(false);

    // Game state mirrored for the UI
    let currentTerrain: TerrainType = $state('G');
    let pixelPos: Position = $state({ x: 2, y: 2 });
    let steps = $state(0);
    let explored = $state(0);
    let exploreTotal = $state(0);
    let debugMessage = $state('');
    let workerStatus: WorkerStatus = $state(STATUS.IDLE);
    let isWorkerBusy = $state(false);
    let idleState: IdleStateType = $state('active');

    // Debug metrics
    let fps = $state(0);
    let memory = $state({ heap: 0, heapLimit: 0 });
    let browserSupportsMemoryAPI = $state(false);
    let raf = 0;

    interface PerformanceWithMemory extends Performance {
        memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
    }

    let toastTimer: ReturnType<typeof setTimeout>;
    function showToast(text: string) {
        toast = { text, id: toast.id + 1 };
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => (toast = { ...toast, text: '' }), 2200);
    }

    function onGameEvent(type: GameEventType, detail?: { terrain?: TerrainType; seed?: string }) {
        switch (type) {
            case 'step': sfx.step(detail?.terrain); break;
            case 'discover': sfx.discover(); break;
            case 'blocked': sfx.bump(); break;
            case 'mapreset':
                sfx.newMap();
                veil++;
                if (detail?.seed) showToast(`Island “${detail.seed}” ready`);
                break;
        }
    }

    function syncFromGame() {
        if (!game) return;
        const s = game.getGameState();
        currentTerrain = s.currentTerrain;
        workerStatus = s.state.status;
        pixelPos = s.state.position;
        debugMessage = s.state.message || '';
        isWorkerBusy = s.state.isMoving;
        idleState = s.state.idleState;
        steps = s.state.steps ?? 0;
        explored = s.state.explored ?? 0;
        exploreTotal = s.state.exploreTotal ?? 0;
        if (s.seed && s.seed !== currentSeed) {
            currentSeed = s.seed;
            seedInput = s.seed;
            const url = new URL(location.href);
            url.searchParams.set('seed', s.seed);
            history.replaceState(history.state, '', url);
        }
        const blocked = /blocked by (.+)$/.exec(debugMessage);
        if (blocked && s.state.status === STATUS.ERROR) showToast(`Blocked by ${blocked[1].toLowerCase()}`);
        tick++;
    }

    function applySettings() {
        game?.setAnimationSettings({ enableClouds: clouds, enableWaves: waves, enableRiver: river });
        saveSettings();
    }
    function saveSettings() {
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ clouds, waves, river, muted })); } catch { /* private mode */ }
    }
    function toggleMute() {
        muted = !muted;
        sfx.setMuted(muted);
        saveSettings();
    }

    function play() {
        sfx.unlock();
        sfx.click();
        const seed = seedInput.trim();
        if (seed && seed !== currentSeed) game?.generate(seed);
        playing = true;
        if (game) game.paused = false;
    }
    function loadSeed() { sfx.click(); game?.generate(seedInput.trim()); menuOpen = false; }
    function randomMap() { sfx.click(); game?.generate(''); menuOpen = false; }
    async function copyLink() {
        sfx.click();
        try {
            await navigator.clipboard.writeText(location.href);
            showToast('Link copied');
        } catch { showToast('Copy failed — copy the address bar instead'); }
    }
    function setMenu(open: boolean) {
        menuOpen = open;
        if (game) game.paused = open || !playing;
        sfx.click();
    }

    function onKey(e: KeyboardEvent) {
        if (!playing || e.ctrlKey || e.metaKey || e.altKey) return;
        const t = e.target as HTMLElement | null;
        if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
        const k = e.key.toLowerCase();
        if (k === 'm') setMenu(!menuOpen);
        else if (k === 'n' && !menuOpen) randomMap();
    }

    function metricsLoop() {
        const frames = (metricsLoop as unknown as { n: number; t: number });
        frames.n = (frames.n ?? 0) + 1;
        const now = performance.now();
        frames.t ??= now;
        if (now - frames.t >= 1000) {
            fps = Math.round((frames.n * 1000) / (now - frames.t));
            frames.n = 0;
            frames.t = now;
            const m = (performance as PerformanceWithMemory).memory;
            browserSupportsMemoryAPI = !!m;
            if (m) memory = { heap: Math.round(m.usedJSHeapSize / 1048576), heapLimit: Math.round(m.jsHeapSizeLimit / 1048576) };
        }
        raf = requestAnimationFrame(metricsLoop);
    }

    onMount(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
            clouds = saved.clouds ?? clouds; waves = saved.waves ?? waves; river = saved.river ?? river; muted = saved.muted ?? muted;
        } catch { /* ignore corrupt settings */ }
        sfx.muted = muted;

        const urlSeed = new URLSearchParams(location.search).get('seed');
        if (urlSeed) seedInput = urlSeed;

        // Boot the game immediately (paused) so the title screen sits over a live map.
        const worker = new Worker(new URL('../lib/workers/worker.ts', import.meta.url), { type: 'module' });
        game = new Game({ canvas: canvas!, worker, theme: get(theme), fps: 30, onEvent: onGameEvent });
        game.paused = true;
        game.start();
        game.setAnimationSettings({ enableClouds: clouds, enableWaves: waves, enableRiver: river });
        if (urlSeed) game.generate(urlSeed);

        const onUpdate = () => syncFromGame();
        window.addEventListener('gamestateupdate', onUpdate);
        raf = requestAnimationFrame(metricsLoop);
        return () => window.removeEventListener('gamestateupdate', onUpdate);
    });

    onDestroy(() => {
        // onDestroy also runs during SSR, where window/rAF don't exist.
        if (!browser) return;
        cancelAnimationFrame(raf);
        clearTimeout(toastTimer);
        game?.destroy();
    });
</script>

<svelte:window onkeydown={onKey} />

<main class="stage">
    <div class="field-wrap">
        <canvas bind:this={canvas} id="gameCanvas" width="800" height="600" aria-label="Game map"></canvas>
        {#key veil}
            {#if veil > 0}<div class="veil"></div>{/if}
        {/key}
    </div>

    {#if playing}
        <div class="ui" transition:fade={{ duration: 300 }}>
            <Hud terrain={currentTerrain} {steps} {explored} {exploreTotal} {muted} onmenu={() => setMenu(true)} onmute={toggleMute} />

            <div class="bottom-left"><MiniMap {game} {tick} /></div>
            <div class="bottom-right"><DPad {game} /></div>
            <p class="hint glass" aria-hidden="true">WASD / arrows · <b>M</b> menu · <b>N</b> new island</p>
        </div>
    {/if}

    <div class="toast-region" aria-live="polite">
        {#if toast.text}
            {#key toast.id}<div class="toast glass">{toast.text}</div>{/key}
        {/if}
    </div>

    {#if !playing}
        <TitleScreen bind:seed={seedInput} onplay={play} />
    {/if}

    {#if menuOpen}
        <MenuPanel
            bind:seed={seedInput} {currentSeed} bind:clouds bind:waves bind:river {muted} {currentTerrain}
            onclose={() => setMenu(false)} onload={loadSeed} onrandom={randomMap} oncopy={copyLink}
            onsettings={applySettings} onmute={toggleMute}
            {fps} {memory} {browserSupportsMemoryAPI} {workerStatus} {pixelPos} {debugMessage} {isWorkerBusy} {idleState}
        />
    {/if}
</main>

<style>
    .stage { position: fixed; inset: 0; overflow: hidden; background: radial-gradient(ellipse at 50% 40%, #12203b 0%, #0a0f1d 70%); }
    .field-wrap { position: absolute; inset: 0; display: grid; place-items: center; }
    canvas {
        width: min(100vw, calc(100dvh * 4 / 3));
        aspect-ratio: 4 / 3;
        height: auto;
        display: block;
        box-shadow: 0 0 80px rgba(0, 0, 0, 0.55);
    }
    .veil { position: absolute; inset: 0; background: #0a0f1d; pointer-events: none; animation: veil 0.7s ease-out forwards; }
    @keyframes veil { from { opacity: 1; } to { opacity: 0; } }

    .ui { position: absolute; inset: 0; pointer-events: none; }
    .bottom-left, .bottom-right { position: absolute; bottom: max(12px, env(safe-area-inset-bottom)); pointer-events: auto; z-index: 5; }
    .bottom-left { left: max(12px, env(safe-area-inset-left)); }
    .bottom-right { right: max(12px, env(safe-area-inset-right)); display: none; }
    @media (pointer: coarse) { .bottom-right { display: block; } .hint { display: none; } }
    .hint { position: absolute; left: 50%; bottom: max(12px, env(safe-area-inset-bottom)); transform: translateX(-50%); margin: 0; padding: 6px 14px; font-size: 0.78rem; color: var(--muted); white-space: nowrap; z-index: 5; }
    .hint b { color: var(--text); }
    @media (max-width: 640px) { .hint { display: none; } }

    .toast-region { position: absolute; top: max(72px, calc(env(safe-area-inset-top) + 60px)); left: 50%; transform: translateX(-50%); z-index: 40; pointer-events: none; }
    .toast { padding: 8px 16px; font-size: 0.88rem; animation: toast 2.2s ease forwards; white-space: nowrap; }
    @media (max-width: 640px) { .toast-region { top: calc(env(safe-area-inset-top) + 104px); } }
    @keyframes toast { 0% { opacity: 0; transform: translateY(-6px); } 10%, 85% { opacity: 1; transform: none; } 100% { opacity: 0; } }
</style>
