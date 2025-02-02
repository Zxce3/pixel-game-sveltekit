import { writable } from 'svelte/store';

export type IdleStateType = 'active' | 'resting' | 'idle' | 'sleeping';

export const IdleState = {
    ACTIVE: 'active',
    RESTING: 'resting',
    IDLE: 'idle',
    SLEEPING: 'sleeping'
} as const;

export const IdleThresholds = {
    RESTING: 200,    // ms before entering resting state
    IDLE: 5000,      // ms before entering idle state
    SLEEPING: 30000  // ms before entering sleeping state
} as const;

export const idleState = writable<IdleStateType>('active');

export function updateIdleState(state: IdleStateType) {
    idleState.set(state);
}

export function getIdleStateString(state: IdleStateType): string {
    return state.toLowerCase();
}
