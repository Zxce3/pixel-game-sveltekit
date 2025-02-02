/// <reference lib="webworker" />

import type { GameState, Position, TerrainType, Direction } from '$lib/types';
import { STATUS, MESSAGE, TERRAIN, terrainNames } from '$lib/types';
import { IdleState, IdleThresholds } from '$lib/game/state';

declare var self: Worker;

interface WorkerMessage {
    task: string;
    direction?: Direction;
    time?: number;
}

interface WorkerResponse {
    status: string;
    message?: string;
    gameState?: GameState;
    terrainMap?: TerrainType[][];
    step?: number;
    total?: number;
    result?: number;
}

interface TerrainProperties {
    walkable: boolean;
    movementCost: number;
    name: string;
}

// Extend GameState with worker-specific properties
interface WorkerGameState extends GameState {
    currentTerrain: TerrainType;
}

let gameState: WorkerGameState = {
    position: { x: 2, y: 2 },
    facing: 'down',
    isMoving: false,
    terrain: TERRAIN.GRASSLAND,
    currentTerrain: TERRAIN.GRASSLAND,
    status: STATUS.IDLE,
    message: '',
    isStarted: false,
    idleState: IdleState.ACTIVE,
    lastActivityTime: Date.now()
};

let idleCheckInterval: ReturnType<typeof setInterval>;

function startIdleCheck() {
    if (idleCheckInterval) clearInterval(idleCheckInterval);
    
    idleCheckInterval = setInterval(() => {
        const timeSinceLastActivity = Date.now() - gameState.lastActivityTime;
        let newIdleState = gameState.idleState;

        if (timeSinceLastActivity >= IdleThresholds.SLEEPING) {
            newIdleState = IdleState.SLEEPING;
        } else if (timeSinceLastActivity >= IdleThresholds.IDLE) {
            newIdleState = IdleState.IDLE;
        } else if (timeSinceLastActivity >= IdleThresholds.RESTING) {
            newIdleState = IdleState.RESTING;
        } else {
            newIdleState = IdleState.ACTIVE;
        }

        if (newIdleState !== gameState.idleState) {
            gameState.idleState = newIdleState;
            postMessage({
                status: STATUS.PROCESSING,
                gameState,
                message: `State changed to ${newIdleState}`
            });
        }
    }, 500); // Check more frequently
}

/** @type {Record<TerrainType, TerrainProperties>} */
const terrainProperties = {
    W: { walkable: false, movementCost: Infinity, name: 'Water' },
    B: { walkable: true, movementCost: 1, name: 'Beach' },
    F: { walkable: true, movementCost: 1.2, name: 'Forest' },
    M: { walkable: false, movementCost: Infinity, name: 'Mountain' },
    G: { walkable: true, movementCost: 1, name: 'Grassland' },
    R: { walkable: true, movementCost: 1.5, name: 'River' },
    S: { walkable: true, movementCost: 2, name: 'Swamp' },
    H: { walkable: true, movementCost: 1.3, name: 'Hills' }
};

/**
 * Terrain configuration matrix
 * Each cell represents a specific terrain type with unique gameplay properties:
 * W - Water: Natural boundary, blocks movement
 * B - Beach: Transitional zone, fully traversable
 * F - Forest: Standard terrain, provides cover
 * M - Mountains: Impassable peaks
 * G - Grassland: Open terrain, fast movement
 * R - River: Special water feature, crossable
 * S - Swamp: Difficult terrain, slower movement
 * H - Hills: Elevated terrain, strategic positions
 */
const terrainMap: TerrainType[][] = [
  ['W','W','W','W','W','W','W','W','W','W','W','W','W','W','W','W','W','W','W','W'],
  ['W','W','B','B','B','B','B','B','B','B','B','B','B','B','B','B','B','B','W','W'],
  ['W','B','G','G','F','F','F','H','H','M','H','H','F','F','F','G','G','B','B','W'],
  ['W','B','G','F','F','H','H','M','M','M','M','H','H','F','F','F','G','G','B','W'],
  ['W','B','F','F','H','H','M','M','M','M','M','M','H','H','F','F','F','G','B','W'],
  ['W','R','R','F','H','M','M','M','M','M','M','M','M','H','H','R','F','B','B','W'],
  ['W','S','R','F','H','H','M','M','M','M','M','H','R','F','F','F','G','B','B','W'],
  ['W','B','G','R','F','H','H','M','M','M','M','H','R','F','F','F','G','B','B','W'],
  ['W','B','G','F','R','F','H','H','H','H','H','R','F','F','F','G','B','B','W','W'],
  ['W','B','G','F','F','R','F','F','F','R','R','F','F','F','G','G','B','B','W','W'],
  ['W','B','G','F','F','F','R','R','R','F','F','F','F','G','G','B','B','W','W','W'],
  ['W','S','R','F','F','F','F','F','F','F','F','G','G','G','B','B','W','W','W','W'],
  ['W','B','B','G','G','G','G','G','G','G','G','G','B','B','B','W','W','W','W','W'],
  ['W','W','B','B','B','B','B','B','B','B','B','B','B','B','W','W','W','W','W','W'],
  ['W','W','W','W','W','W','W','W','W','W','W','W','W','W','W','W','W','W','W','W']
];

/**
 * Processes messages from the main thread
 * @param {MessageEvent} e - Incoming message event
 * @param {Object} e.data - Message payload
 * @param {string} e.data.task - Task identifier
 * @param {string} [e.data.direction] - Movement direction
 * @param {number} [e.data.time] - Processing delay
 */
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
    try {
        gameState.lastActivityTime = Date.now();
        switch (e.data.task) {
            case MESSAGE.START:
                handleGameStart(e.data.time);
                break;
            case MESSAGE.GAME_UPDATE:
                if (e.data.direction) {
                    handleMovement(e.data.direction);
                }
                break;
            default:
                throw new Error(`Unknown task: ${e.data.task}`);
        }
    } catch (error) {
        postMessage({
            status: STATUS.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error'
        } as WorkerResponse);
    }
};

/**
 * Initializes or restarts the game
 * @param {number} [time=100] - Processing delay in ms
 */
function handleGameStart(time = 100): void {
    startIdleCheck();
    postMessage({
        status: STATUS.PROCESSING,
        message: 'Game initialized',
        gameState,
        terrainMap
    });
    longRunningFunction(time);
}

/**
 * Handles player movement requests
 * @param {'up'|'down'|'left'|'right'} direction - Movement direction
 * @throws {Error} If direction is invalid
 */
function handleMovement(direction: Direction): void {
    gameState.lastActivityTime = Date.now();
    gameState.idleState = IdleState.ACTIVE;
    gameState.facing = direction;

    const newPos = { ...gameState.position };
    
    // Calculate new position
    switch (direction) {
        case 'left': newPos.x--; break;
        case 'right': newPos.x++; break;
        case 'up': newPos.y--; break;
        case 'down': newPos.y++; break;
        default: throw new Error(`Invalid direction: ${direction}`);
    }

    const oldTerrain = terrainMap[gameState.position.y][gameState.position.x];
    const message = canMove(newPos)
        ? `Moved ${direction} from ${terrainNames[oldTerrain]} to ${terrainNames[terrainMap[newPos.y][newPos.x]]}`
        : `Cannot move ${direction} - blocked by ${isInBounds(newPos) ? terrainNames[terrainMap[newPos.y][newPos.x]] : 'boundary'}`;

    if (canMove(newPos)) {
        gameState.position = newPos;
        gameState.currentTerrain = terrainMap[newPos.y][newPos.x];
        gameState.terrain = gameState.currentTerrain;
        gameState.message = message;
        
        postMessage({
            status: STATUS.PROCESSING,
            gameState,
            message,
            terrainMap
        });
    } else {
        gameState.message = message;
        postMessage({
            status: STATUS.ERROR,
            gameState,
            message,
            terrainMap
        });
    }
}

/**
 * Validates movement to new position
 * @param {Position} position - Target position
 * @returns {boolean} Whether movement is valid
 */
function canMove(position: Position): boolean {
    if (!isInBounds(position)) return false;
    const terrain = /** @type {TerrainType} */ (terrainMap[position.y][position.x]);
    return terrainProperties[terrain].walkable;
}

/**
 * Checks if position is within map boundaries
 * @param {Position} position - Position to check
 * @returns {boolean} Whether position is in bounds
 */
function isInBounds(position: Position): boolean {
    return position.x >= 0 && position.x < terrainMap[0].length && position.y >= 0 && position.y < terrainMap.length;
}

/**
 * Demo function that simulates long-running task
 * Used to demonstrate worker progress tracking
 * @param {number} [time=100] - Delay between steps in milliseconds
 */
async function longRunningFunction(time = 100): Promise<void> {
  const total = 100;
  for (let i = 0; i < total; i++) {
    await new Promise(resolve => setTimeout(resolve, time));
    postMessage({
      status: STATUS.PROCESSING,
      step: i + 1,
      total
    } as WorkerResponse);
  }
  postMessage({
    status: STATUS.FINISHED,
    result: time * total,
    message: `Task finished with time = ${time}`
  } as WorkerResponse);
}

// Clean up on termination
self.addEventListener('beforeunload', () => {
  if (idleCheckInterval) clearInterval(idleCheckInterval);
});

export {}; // Add empty export to mark as module