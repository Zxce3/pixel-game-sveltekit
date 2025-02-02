import type { IdleStateType } from '$lib/game/state';
import type { Theme } from './theme';

// Worker Status Type
export type WorkerStatus = 'STATUS_FINISHED' | 'STATUS_PROCESSING' | 'STATUS_IDLE' | 'STATUS_ERROR';

// Worker Message Type
export type WorkerMessageType = 'START' | 'GAME_UPDATE';

// Add new status constants
export const STATUS_FINISHED = 'STATUS_FINISHED';
export const STATUS_PROCESSING = 'STATUS_PROCESSING';
export const STATUS_IDLE = 'STATUS_IDLE';
export const STATUS_ERROR = 'STATUS_ERROR';

// Add new message constants
export const MESSAGE_START = 'START';
export const MESSAGE_GAME_UPDATE = 'GAME_UPDATE';

// Update STATUS object
export const STATUS = {
    FINISHED: STATUS_FINISHED,
    PROCESSING: STATUS_PROCESSING,
    IDLE: STATUS_IDLE,
    ERROR: STATUS_ERROR
} as const;

export const MESSAGE = {
    START: MESSAGE_START,
    GAME_UPDATE: MESSAGE_GAME_UPDATE
} as const;

export const TERRAIN = {
    WATER: 'W',
    BEACH: 'B',
    FOREST: 'F',
    MOUNTAIN: 'M',
    GRASSLAND: 'G',
    RIVER: 'R',
    SWAMP: 'S',
    HILLS: 'H'
} as const;

export type TerrainType = typeof TERRAIN[keyof typeof TERRAIN];

export const terrainColors: Record<TerrainType, string> = {
    W: '#3b6c9e',
    B: '#f2e1a5',
    F: '#3b7a57',
    M: '#4e4e4e',
    G: '#4c9f70',
    R: '#5e92a5',
    S: '#5a4f32',
    H: '#d5c29f'
};

export const terrainNames: Record<TerrainType, string> = {
    W: 'Water',
    B: 'Beach',
    F: 'Forest',
    M: 'Mountain',
    G: 'Grassland',
    R: 'River',
    S: 'Swamp',
    H: 'Hills'
};

export interface Position {
    x: number;
    y: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right' | 'back' | 'front';

export interface GameState {
    position: Position;
    facing: Direction;
    isMoving: boolean;
    terrain: TerrainType;
    status: WorkerStatus;
    message: string;
    isStarted: boolean;
    idleState: IdleStateType;
    lastActivityTime: number;
    theme?: Theme;
}

export interface DebugMetrics {
    fps: number;
    memory: {
        heap: number;
        heapLimit: number;
    };
    lastFrameTime: number;
    frameCount: number;
}

export interface AnimationSettings {
    enableClouds: boolean;
    enableWaves: boolean;
}

export const initialGameState: GameState = {
    position: { x: 2, y: 2 },
    facing: 'down',
    isMoving: false,
    terrain: TERRAIN.GRASSLAND,
    status: STATUS.IDLE,
    message: '',
    isStarted: false,
    idleState: 'active',
    lastActivityTime: Date.now()
};

export const initialDebugMetrics: DebugMetrics = {
    fps: 0,
    memory: { heap: 0, heapLimit: 0 },
    lastFrameTime: performance.now(),
    frameCount: 0
};

export const defaultAnimationSettings: AnimationSettings = {
    enableClouds: false,
    enableWaves: false
};

export const DIRECTIONS = {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right',
    BACK: 'back',
    FRONT: 'front'
} as const;