import type { GameState, Position, TerrainType, Direction, WorkerStatus } from '$lib/types';
import { STATUS, MESSAGE, TERRAIN, terrainColors, terrainNames, terrainMovementCost } from '$lib/types';
import type { Theme } from '$lib/theme';
import { defaultTheme } from '$lib/theme';
import { IdleState } from '$lib/game/state';
import { drawPixel } from '$lib/game/draw';

interface Cloud {
    x: number;
    y: number;
    speed: number;
    size: number;
    opacity: number;
}

export interface GameConfig {
    canvas: HTMLCanvasElement;
    worker: Worker;
    theme?: Theme;
    fps?: number;
}

export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private worker: Worker;
    private animationFrame: number | null = null;
    private lastFrameTime = 0;
    private frameThrottle: number;
    private movementCooldown = false;
    private readonly BASE_MOVE_MS = 150;
    private onKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);

    // Smooth movement: renderPos eases from moveFrom to the worker-confirmed tile.
    private renderPos: Position = { x: 2, y: 2 };
    private moveFrom: Position = { x: 2, y: 2 };
    private moveStart = 0;
    private moveDuration = 150;
    private cooldownTimer: ReturnType<typeof setTimeout> | null = null;
    private pendingDuration = 150;
    
    public state: GameState;
    /** Seed of the current generated map ('' for the built-in island). */
    public seed = '';
    public terrainColors = terrainColors;
    public terrainNames = terrainNames;
    private isRunning = false;
    public currentTerrain: TerrainType = TERRAIN.GRASSLAND;
    private riverOffset = 0;
    public animationSettings = {
        enableClouds: false,
        enableWaves: false,
        enableRiver: false
    };

    private terrainMap: TerrainType[][] | null = null;
    private clouds: Cloud[] = [];
    private readonly CLOUD_COUNT = 8;
    private readonly MIN_CLOUD_SPEED = 0.05;
    private readonly MAX_CLOUD_SPEED = 0.2;
    private cloudOffset = 0;
    private waterOffset = 0;
    private lastAnimationUpdate = 0;

    constructor(config: GameConfig) {
        this.canvas = config.canvas;
        this.ctx = this.canvas.getContext('2d')!;
        this.worker = config.worker;
        this.frameThrottle = 1000 / (config.fps || 30);

        this.state = {
            position: { x: 2, y: 2 },
            facing: 'down',
            isMoving: false,
            terrain: TERRAIN.GRASSLAND,
            status: STATUS.IDLE,
            message: '',
            isStarted: false,
            idleState: IdleState.ACTIVE,
            lastActivityTime: Date.now(),
            theme: config.theme || defaultTheme
        };

        this.setupWorker();
        this.setupEventListeners();
        this.initializeClouds();
    }

    private setupWorker(): void {
        this.worker.onmessage = (e: MessageEvent) => {
            const { status, message, gameState, terrainMap, reset, seed } = e.data;
            if (seed) this.seed = seed;
            
            if (gameState) {
                const prev = this.state.position;
                const moved = gameState.position &&
                    (gameState.position.x !== prev.x || gameState.position.y !== prev.y);
                // facing / isMoving are owned by the main thread (the worker always
                // reports isMoving=false, which used to cancel the walk animation).
                const { facing, isMoving } = this.state;
                this.state = {
                    ...this.state,
                    ...gameState,
                    facing,
                    isMoving,
                    message: message || this.state.message // Prioritize incoming message
                };
                if (!this.terrainMap || reset) {
                    if (reset) { this.state.isMoving = false; this.releaseCooldown(); }
                    this.renderPos = { ...this.state.position }; // first sync: no tween
                } else if (moved) {
                    this.moveFrom = { ...this.renderPos };
                    this.moveStart = performance.now();
                    this.moveDuration = this.pendingDuration;
                    this.state.isMoving = true;
                } else if (this.movementCooldown) {
                    this.releaseCooldown(); // blocked move: don't bob in place or lock input
                }
                this.handleStateUpdate();
            }

            if (terrainMap) {
                this.terrainMap = terrainMap;
            }

            if (message) {
                this.state.message = message;
                this.handleStateUpdate(); // Update when message changes
            }
        };
    }

    private setupEventListeners(): void {
        window.addEventListener('keydown', this.onKeyDown);
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (!this.isRunning) return;

        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const target = e.target as HTMLElement | null;
        if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

        const keyMap: Record<string, Direction> = {
            arrowleft: 'left', arrowright: 'right', arrowup: 'up', arrowdown: 'down',
            a: 'left', d: 'right', w: 'up', s: 'down'
        };

        const direction = keyMap[e.key.toLowerCase()];
        if (direction) {
            e.preventDefault(); // stop arrow keys scrolling the page
            this.move(direction);
        }
    }

    private handleStateUpdate(): void {
        this.currentTerrain = this.state.terrain;
        
        // Emit state change event with full game state including message
        window.dispatchEvent(new CustomEvent('gamestateupdate', {
            detail: {
                state: this.state,
                currentTerrain: this.currentTerrain,
                terrainMap: this.terrainMap,
                terrainColors: this.terrainColors,
                terrainNames: this.terrainNames,
                message: this.state.message,
                seed: this.seed
            }
        }));
    }

    private getFrameThrottleForState(state: string): number {
        switch (state) {
            case IdleState.RESTING: return 1000 / 20;
            case IdleState.IDLE: return 1000 / 10;
            case IdleState.SLEEPING: return 1000 / 5;
            default: return 1000 / 30;
        }
    }

    public start(): void {
        this.isRunning = true;
        this.worker.postMessage({ task: MESSAGE.START });
        this.gameLoop();
    }

    public stop(): void {
        this.isRunning = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    /** Generate a new map. Empty/undefined seed = random; same seed = same map. */
    public generate(seed?: string): void {
        this.worker.postMessage({ task: MESSAGE.GENERATE, seed });
    }

    public sendDirection(direction: Direction): void {
        this.move(direction);
    }

    public move(direction: Direction): void {
        if (this.movementCooldown || !this.isRunning) return;

        this.state.facing = direction;
        this.movementCooldown = true;
        // Slower terrain (swamp, river...) makes the step take longer.
        this.pendingDuration = this.BASE_MOVE_MS * this.destinationCost(direction);

        this.worker.postMessage({ task: MESSAGE.GAME_UPDATE, direction });

        this.cooldownTimer = setTimeout(() => this.releaseCooldown(), this.pendingDuration);
    }

    private releaseCooldown(): void {
        if (this.cooldownTimer) clearTimeout(this.cooldownTimer);
        this.cooldownTimer = null;
        this.movementCooldown = false;
    }

    private destinationCost(direction: Direction): number {
        const { x, y } = this.state.position;
        const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[direction as 'left'] ?? [0, 0];
        const t = this.terrainMap?.[y + d[1]]?.[x + d[0]];
        const cost = t ? terrainMovementCost[t] : 1;
        return Number.isFinite(cost) ? cost : 1; // blocked moves use the base delay
    }

    /** Idle states render slower to save power, but never below 30fps while animating. */
    private currentThrottle(): number {
        if (this.state.isMoving) return 1000 / 60;
        const animating = Object.values(this.animationSettings).some(Boolean);
        const t = this.getFrameThrottleForState(this.state.idleState);
        return animating ? Math.min(t, this.frameThrottle) : Math.max(t, this.frameThrottle);
    }

    private gameLoop(timestamp = 0): void {
        if (!this.isRunning) return;

        const delta = timestamp - this.lastFrameTime;

        // Always update state to prevent idle
        this.update(delta);

        if (delta >= this.currentThrottle()) {
            this.lastFrameTime = timestamp;
            this.render();
        }

        this.animationFrame = requestAnimationFrame(this.gameLoop.bind(this));
    }

    private update(delta: number): void {
        const now = performance.now();
        
        if (this.state.isMoving) {
            this.state.lastActivityTime = Date.now();
            this.state.idleState = IdleState.ACTIVE;

            const t = Math.min(1, (now - this.moveStart) / this.moveDuration);
            const e = t * t * (3 - 2 * t); // smoothstep
            const to = this.state.position;
            this.renderPos = {
                x: this.moveFrom.x + (to.x - this.moveFrom.x) * e,
                y: this.moveFrom.y + (to.y - this.moveFrom.y) * e
            };
            if (t >= 1) {
                this.renderPos = { ...to };
                this.state.isMoving = false;
            }
        }

        // Update animations based on time passed
        if (now - this.lastAnimationUpdate > 16) {
            this.updateClouds();

            if (this.animationSettings.enableWaves) {
                this.waterOffset = (now / 1000) % (Math.PI * 2);
            }

            if (this.animationSettings.enableRiver) {
                this.riverOffset = (now / 800) % (Math.PI * 2);
            }

            this.lastAnimationUpdate = now;
        }
    }

    private render(): void {
        if (!this.ctx || !this.canvas) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const activeClouds = this.animationSettings.enableClouds ? this.clouds : [];
        const activeWaterOffset = this.animationSettings.enableWaves ? this.waterOffset : 0;
        const activeRiverOffset = this.animationSettings.enableRiver ? this.riverOffset : 0;
        
        drawPixel(this.ctx, {
            terrainMap: this.terrainMap || [],
            pixelPos: this.renderPos,
            facing: this.state.facing,
            isMoving: this.state.isMoving,
            animationSettings: this.animationSettings,
            waterOffset: activeWaterOffset,
            riverOffset: activeRiverOffset,
            clouds: activeClouds,
            cloudOffset: this.cloudOffset,
            tileSize: 40
        });
    }

    public setAnimationSettings(settings: { 
        enableClouds?: boolean; 
        enableWaves?: boolean;
        enableRiver?: boolean;
    }): void {
        this.animationSettings = {
            ...this.animationSettings,
            ...settings
        };
        
        if (!settings.enableClouds) {
            this.cloudOffset = 0;
            this.initializeClouds();
        }
        
        if (!settings.enableWaves) {
            this.waterOffset = 0;
        }

        if (!settings.enableRiver) {
            this.riverOffset = 0;
        }
    }

    public destroy(): void {
        this.stop();
        window.removeEventListener('keydown', this.onKeyDown);
        this.releaseCooldown();
        this.worker.terminate();
    }

    public getGameState() {
        return {
            state: {
                ...this.state,
                message: this.state.message
            },
            currentTerrain: this.currentTerrain,
            terrainMap: this.terrainMap,
            terrainColors: this.terrainColors,
            terrainNames: this.terrainNames,
            seed: this.seed
        };
    }

    private createCloud(index: number, forceOffscreen = false): Cloud {
        const size = 40 + Math.random() * 70;
        const x = forceOffscreen ? 
            -size : 
            (index * (this.canvas.width / this.CLOUD_COUNT)) + (Math.random() * 200);
        return {
            x,
            y: Math.random() * (this.canvas.height * 0.4),
            speed: this.MIN_CLOUD_SPEED + Math.random() * (this.MAX_CLOUD_SPEED - this.MIN_CLOUD_SPEED),
            size,
            opacity: 0.18 + Math.random() * 0.17
        };
    }

    private initializeClouds(): void {
        this.clouds = Array(this.CLOUD_COUNT)
            .fill(null)
            .map((_, i) => this.createCloud(i));
    }

    private updateClouds(): void {
        if (!this.animationSettings.enableClouds) return;
        
        this.cloudOffset += 0.2;
        this.clouds.forEach((cloud, index) => {
            cloud.x += cloud.speed;
            
            // Reset cloud when it moves off screen
            if (cloud.x > this.canvas.width + cloud.size) {
                const newCloud = this.createCloud(index, true);
                this.clouds[index] = newCloud;
            }
        });
    }
}
