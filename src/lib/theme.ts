import { writable } from 'svelte/store';

export interface Theme {
    name: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    terrainColors: {
        water: string;
        beach: string;
        forest: string;
        mountain: string;
        grassland: string;
        river: string;
        swamp: string;
        hills: string;
    };
}

export const defaultTheme: Theme = {
    name: 'default',
    colors: {
        primary: '#4caf50',
        secondary: '#2196f3',
        accent: '#ff4081',
        background: '#ffffff',
        text: '#000000'
    },
    terrainColors: {
        water: '#3b6c9e',
        beach: '#f2e1a5',
        forest: '#3b7a57',
        mountain: '#4e4e4e',
        grassland: '#4c9f70',
        river: '#5e92a5',
        swamp: '#5a4f32',
        hills: '#d5c29f'
    }
};

export const theme = writable<Theme>(defaultTheme);
