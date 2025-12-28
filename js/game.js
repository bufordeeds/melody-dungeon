import { TILE, MAP_WIDTH, MAP_HEIGHT, NOTE_NAMES, NOTES } from './constants.js';
import { generateDungeon } from './dungeon.js';
import { playNote, playMelody, playErrorSound, playSuccessSound, playPickupSound, initAudio } from './audio.js';
import * as renderer from './renderer.js';
import { initInput, onMove, onPlayNote, onInteract } from './input.js';

// Game state
const state = {
    player: { x: 1, y: 1 },
    collectedNotes: new Set(),
    currentLevel: 1,
    map: [],
    notePositions: [],
    doors: [],
    puzzleState: null, // null, 'listening', 'input', 'won'
    puzzleSequence: [],
    playerInput: [],
    puzzleDoor: null,
    message: '',
    messageTimer: 0
};

let inventoryUI = null;

export function initGame(canvas, inventoryElement) {
    renderer.initRenderer(canvas);
    inventoryUI = inventoryElement;

    initInput();
    setupInputHandlers();
    updateInventoryUI();

    loadLevel(1);
}

function setupInputHandlers() {
    onMove((dx, dy) => {
        initAudio();
        if (state.puzzleState === null) {
            movePlayer(dx, dy);
        }
    });

    onPlayNote((noteIndex) => {
        initAudio();
        const noteName = NOTE_NAMES[noteIndex];

        if (state.puzzleState === 'input') {
            if (state.collectedNotes.has(noteName)) {
                playNote(noteName, 0.3, highlightNote);
                state.playerInput.push(noteName);
                checkPuzzleInput();
            } else {
                showMessage(`You don't have note ${noteName}!`);
                playErrorSound();
            }
        } else if (state.puzzleState === null) {
            if (state.collectedNotes.has(noteName)) {
                playNote(noteName, 0.3, highlightNote);
            }
        }
    });

    onInteract(() => {
        initAudio();
        if (state.puzzleState === null) {
            interact();
        }
    });
}

function loadLevel(levelNum) {
    state.currentLevel = levelNum;
    state.collectedNotes.clear();
    state.puzzleState = null;
    state.puzzleSequence = [];
    state.playerInput = [];
    state.puzzleDoor = null;

    // Generate new dungeon
    const dungeon = generateDungeon(levelNum);

    state.map = dungeon.map;
    state.player.x = dungeon.startPos.x;
    state.player.y = dungeon.startPos.y;
    state.doors = dungeon.doors;
    state.notePositions = dungeon.notePositions;

    updateInventoryUI();
    showMessage(`Level ${levelNum}`);
}

function movePlayer(dx, dy) {
    const newX = state.player.x + dx;
    const newY = state.player.y + dy;

    // Check bounds
    if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) return;

    // Check collision
    const tile = state.map[newY][newX];
    if (tile === TILE.WALL || tile === TILE.DOOR_LOCKED) return;

    // Move player
    state.player.x = newX;
    state.player.y = newY;

    // Check for note pickup
    const noteHere = state.notePositions.find(n => n.x === newX && n.y === newY && !n.collected);
    if (noteHere) {
        noteHere.collected = true;
        state.collectedNotes.add(noteHere.note);
        playPickupSound(noteHere.note);
        highlightNote(noteHere.note);
        showMessage(`Collected note ${noteHere.note}!`);
        updateInventoryUI();
    }

    // Check for exit
    if (tile === TILE.EXIT) {
        showMessage("Level Complete!");
        setTimeout(() => loadLevel(state.currentLevel + 1), 1500);
    }
}

function interact() {
    // Check adjacent tiles for locked doors
    const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    for (const [dx, dy] of directions) {
        const checkX = state.player.x + dx;
        const checkY = state.player.y + dy;

        if (state.map[checkY] && state.map[checkY][checkX] === TILE.DOOR_LOCKED) {
            const door = state.doors.find(d => d.x === checkX && d.y === checkY);
            if (door) {
                startPuzzle(door);
                return;
            }
        }
    }

    showMessage("Nothing to interact with here.");
}

function startPuzzle(door) {
    // Check if player has all required notes
    const missingNotes = door.sequence.filter(n => !state.collectedNotes.has(n));
    if (missingNotes.length > 0) {
        showMessage(`Missing notes: ${missingNotes.join(', ')}`);
        playErrorSound();
        return;
    }

    state.puzzleState = 'listening';
    state.puzzleDoor = door;
    state.puzzleSequence = door.sequence;
    state.playerInput = [];

    showMessage("Listen to the melody...");

    // Play the melody, then switch to input mode
    const duration = playMelody(door.sequence, 400, highlightNote);
    setTimeout(() => {
        state.puzzleState = 'input';
        showMessage("Your turn! Repeat the melody.");
    }, duration + 500);
}

function checkPuzzleInput() {
    const inputLen = state.playerInput.length;
    const expected = state.puzzleSequence[inputLen - 1];
    const actual = state.playerInput[inputLen - 1];

    if (actual !== expected) {
        // Wrong note!
        playErrorSound();
        showMessage("Wrong note! Try again...");
        state.playerInput = [];

        // Replay melody after delay
        setTimeout(() => {
            state.puzzleState = 'listening';
            showMessage("Listen again...");
            const duration = playMelody(state.puzzleSequence, 400, highlightNote);
            setTimeout(() => {
                state.puzzleState = 'input';
                showMessage("Your turn!");
            }, duration + 500);
        }, 1000);
        return;
    }

    if (inputLen === state.puzzleSequence.length) {
        // Puzzle solved!
        playSuccessSound();
        showMessage("Door unlocked!");

        // Unlock the door
        const door = state.puzzleDoor;
        state.map[door.y][door.x] = TILE.DOOR_UNLOCKED;

        state.puzzleState = null;
        state.puzzleDoor = null;
    }
}

function showMessage(text, duration = 2000) {
    state.message = text;
    state.messageTimer = duration;
}

function updateInventoryUI() {
    if (!inventoryUI) return;

    inventoryUI.innerHTML = '';

    NOTE_NAMES.forEach((noteName, index) => {
        const slot = document.createElement('div');
        slot.className = 'note-slot';
        slot.id = `note-${noteName}`;
        slot.style.color = NOTES[noteName].color;

        if (state.collectedNotes.has(noteName)) {
            slot.classList.add('collected');
        }

        slot.innerHTML = `
            <span class="name">${noteName}</span>
            <span class="key">${index + 1}</span>
        `;
        inventoryUI.appendChild(slot);
    });
}

function highlightNote(noteName) {
    const slot = document.getElementById(`note-${noteName}`);
    if (slot) {
        slot.classList.add('active');
        setTimeout(() => slot.classList.remove('active'), 200);
    }
}

// Game loop
let lastTime = 0;

export function startGameLoop() {
    requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Update message timer
    if (state.messageTimer > 0) {
        state.messageTimer -= deltaTime;
    }

    // Render
    render(timestamp);

    requestAnimationFrame(gameLoop);
}

function render(time) {
    renderer.clear();

    // Draw map
    renderer.drawMap(state.map);

    // Draw notes
    for (const notePos of state.notePositions) {
        renderer.drawNote(notePos, time);
    }

    // Draw player
    renderer.drawPlayer(state.player);

    // Draw UI
    if (state.message && state.messageTimer > 0) {
        renderer.drawMessage(state.message);
    }

    if (state.puzzleState === 'input') {
        renderer.drawPuzzleIndicator(state.playerInput, state.puzzleSequence.length);
    }
}
