import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';
import { initGame, startGameLoop } from './game.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const inventory = document.getElementById('noteInventory');

    // Set canvas size
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Initialize and start game
    initGame(canvas, inventory);
    startGameLoop();
});
