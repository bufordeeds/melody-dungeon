import { TILE, TILE_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT, NOTES } from './constants.js';

let ctx = null;

export function initRenderer(canvas) {
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return ctx;
}

export function clear() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

export function drawTile(x, y, tile) {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;

    switch (tile) {
        case TILE.FLOOR:
        case TILE.START:
            // Stone floor with subtle pattern
            ctx.fillStyle = '#3a3a5a';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#323252';
            ctx.fillRect(px + 2, py + 2, 12, 12);
            ctx.fillRect(px + 18, py + 18, 12, 12);
            break;

        case TILE.WALL:
            // Stone wall with texture
            ctx.fillStyle = '#2a2a3a';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#222230';
            ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, 6);
            ctx.fillRect(px + 2, py + 14, TILE_SIZE - 4, 6);
            ctx.fillRect(px + 2, py + 26, TILE_SIZE - 4, 4);
            ctx.fillStyle = '#1a1a28';
            ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
            break;

        case TILE.DOOR_LOCKED:
            // Glowing red locked door
            ctx.fillStyle = '#3a3a5a';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#8b0000';
            ctx.fillRect(px + 4, py + 2, TILE_SIZE - 8, TILE_SIZE - 4);
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(px + 8, py + 6, TILE_SIZE - 16, TILE_SIZE - 12);
            // Lock symbol
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(px + 13, py + 12, 6, 8);
            ctx.fillRect(px + 14, py + 8, 4, 4);
            break;

        case TILE.DOOR_UNLOCKED:
            // Green unlocked door (open)
            ctx.fillStyle = '#3a3a5a';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#004400';
            ctx.fillRect(px + 4, py + 2, 8, TILE_SIZE - 4);
            ctx.fillStyle = '#00aa00';
            ctx.fillRect(px + 6, py + 4, 4, TILE_SIZE - 8);
            break;

        case TILE.EXIT:
            // Glowing exit stairs
            ctx.fillStyle = '#3a3a5a';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#ffd700';
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(px + 4 + i * 2, py + 8 + i * 4, TILE_SIZE - 8 - i * 4, 6);
            }
            break;
    }
}

export function drawNote(notePos, time) {
    if (notePos.collected) return;

    const px = notePos.x * TILE_SIZE;
    const py = notePos.y * TILE_SIZE;
    const note = NOTES[notePos.note];

    // Floating animation
    const float = Math.sin(time / 300 + notePos.x + notePos.y) * 2;

    // Glow effect
    ctx.fillStyle = note.color + '44';
    ctx.beginPath();
    ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2 + float, 14, 0, Math.PI * 2);
    ctx.fill();

    // Note body (music note shape)
    ctx.fillStyle = note.color;
    ctx.beginPath();
    ctx.arc(px + 12, py + 20 + float, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(px + 17, py + 6 + float, 3, 14);
    ctx.fillRect(px + 17, py + 6 + float, 8, 3);
}

export function drawPlayer(player) {
    const px = player.x * TILE_SIZE;
    const py = player.y * TILE_SIZE;

    // Body
    ctx.fillStyle = '#44aaff';
    ctx.fillRect(px + 8, py + 10, 16, 16);

    // Head
    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(px + 10, py + 2, 12, 10);

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(px + 12, py + 5, 2, 2);
    ctx.fillRect(px + 18, py + 5, 2, 2);

    // Feet
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(px + 8, py + 26, 6, 4);
    ctx.fillRect(px + 18, py + 26, 6, 4);
}

export function drawMessage(message) {
    if (!message) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(CANVAS_WIDTH / 2 - 150, 20, 300, 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(message, CANVAS_WIDTH / 2, 42);
}

export function drawPuzzleIndicator(playerInput, sequenceLength) {
    const text = `Input: ${playerInput.join(' ')} (${playerInput.length}/${sequenceLength})`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(CANVAS_WIDTH / 2 - 120, CANVAS_HEIGHT - 50, 240, 30);

    ctx.fillStyle = '#00ff00';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);
}

export function drawMap(map) {
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            drawTile(x, y, map[y][x]);
        }
    }
}
