import type { GameState, Position, TerrainType, Direction, WorkerStatus } from '../types';
import { STATUS, MESSAGE, TERRAIN, terrainColors, terrainNames } from '../types';
import type { Theme } from '../theme';
import { defaultTheme } from '../theme';
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
    
    public state: GameState;
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
            const { status, message, gameState, terrainMap } = e.data;
            
            if (gameState) {
                this.state = {
                    ...this.state,
                    ...gameState,
                    message: message || this.state.message // Prioritize incoming message
                };
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
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (!this.isRunning) return;

        const keyMap: Record<string, Direction> = {
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'a': 'left',
            'd': 'right',
            'w': 'up',
            's': 'down'
        };

        const direction = keyMap[e.key];
        if (direction) {
            this.move(direction);
        }
    }

    private handleResize(): void {
        const { width, height } = this.canvas.getBoundingClientRect();
        this.canvas.width = width * window.devicePixelRatio;
        this.canvas.height = height * window.devicePixelRatio;
        // Reinitialize clouds on resize
        this.initializeClouds();
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
                message: this.state.message
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

    public sendDirection(direction: Direction): void {
        this.move(direction);
    }

    public move(direction: Direction): void {
        if (this.movementCooldown || !this.isRunning) return;

        this.state.isMoving = true;
        this.state.facing = direction;
        this.movementCooldown = true;

        this.worker.postMessage({ task: MESSAGE.GAME_UPDATE, direction });
        
        setTimeout(() => {
            this.state.isMoving = false;
            this.movementCooldown = false;
        }, 200);
    }

    private gameLoop(timestamp = 0): void {
        if (!this.isRunning) return;

        const delta = timestamp - this.lastFrameTime;

        // Always update state to prevent idle
        this.update(delta);

        if (delta >= this.frameThrottle) {
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
            pixelPos: this.state.position,
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
        window.removeEventListener('keydown', this.handleKeyDown.bind(this));
        window.removeEventListener('resize', this.handleResize.bind(this));
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
            terrainNames: this.terrainNames
        };
    }

    private createCloud(index: number, forceOffscreen = false): Cloud {
        const size = 60 + Math.random() * 100;
        const x = forceOffscreen ? 
            -size : 
            (index * (this.canvas.width / this.CLOUD_COUNT)) + (Math.random() * 200);
        return {
            x,
            y: Math.random() * (this.canvas.height * 0.4),
            speed: this.MIN_CLOUD_SPEED + Math.random() * (this.MAX_CLOUD_SPEED - this.MIN_CLOUD_SPEED),
            size,
            opacity: 0.4 + Math.random() * 0.3
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
