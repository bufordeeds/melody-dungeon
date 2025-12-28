// Tile and map settings
export const TILE_SIZE = 32;
export const MAP_WIDTH = 25;
export const MAP_HEIGHT = 19;
export const CANVAS_WIDTH = MAP_WIDTH * TILE_SIZE;
export const CANVAS_HEIGHT = MAP_HEIGHT * TILE_SIZE;

// Tile types
export const TILE = {
    FLOOR: 0,
    WALL: 1,
    DOOR_LOCKED: 2,
    DOOR_UNLOCKED: 3,
    EXIT: 4,
    START: 5
};

// Note definitions with frequencies and colors
export const NOTES = {
    C: { freq: 262, color: '#ff4444', name: 'C', key: '1' },
    D: { freq: 294, color: '#ff8844', name: 'D', key: '2' },
    E: { freq: 330, color: '#ffff44', name: 'E', key: '3' },
    F: { freq: 349, color: '#44ff44', name: 'F', key: '4' },
    G: { freq: 392, color: '#44ffff', name: 'G', key: '5' },
    A: { freq: 440, color: '#4444ff', name: 'A', key: '6' },
    B: { freq: 494, color: '#ff44ff', name: 'B', key: '7' }
};

export const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
