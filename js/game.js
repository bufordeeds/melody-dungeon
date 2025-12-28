import { TILE, MAP_WIDTH, MAP_HEIGHT, NOTE_NAMES, NOTES } from './constants.js';
import { generateDungeon } from './dungeon.js';
import { playNote, playMelody, playErrorSound, playSuccessSound, playPickupSound, initAudio } from './audio.js';
import * as renderer from './renderer.js';
import { initInput, onMove, onPlayNote, onInteract, onRestart, updateInput } from './input.js';

// Game state
const state = {
    player: { x: 1, y: 1 },
    collectedNotes: new Set(),
    currentLevel: 1,
    lives: 3,
    highScore: 0,
    map: [],
    notePositions: [],
    doors: [],
    puzzleState: null, // null, 'listening', 'input', 'won', 'gameover'
    puzzleSequence: [],
    playerInput: [],
    puzzleDoor: null,
    message: '',
    messageTimer: 0,
    hideNotesOnPlayback: true // Difficulty setting
};

// LocalStorage key
const HIGH_SCORE_KEY = 'melodyDungeon_highScore';

function loadHighScore() {
    try {
        const saved = localStorage.getItem(HIGH_SCORE_KEY);
        if (saved) {
            state.highScore = parseInt(saved, 10) || 0;
        }
    } catch (e) {
        console.warn('Could not load high score:', e);
    }
}

function saveHighScore() {
    try {
        localStorage.setItem(HIGH_SCORE_KEY, state.highScore.toString());
    } catch (e) {
        console.warn('Could not save high score:', e);
    }
}

function checkHighScore() {
    if (state.currentLevel > state.highScore) {
        state.highScore = state.currentLevel;
        saveHighScore();
        return true; // New high score!
    }
    return false;
}

let inventoryUI = null;
let livesUI = null;
let overlayUI = null;
let toggleUI = null;
let scoreUI = null;

export function initGame(canvas, inventoryElement, livesElement, overlayElement, toggleElement, scoreElement) {
    renderer.initRenderer(canvas);
    inventoryUI = inventoryElement;
    livesUI = livesElement;
    overlayUI = overlayElement;
    toggleUI = toggleElement;
    scoreUI = scoreElement;

    loadHighScore();
    initInput();
    setupInputHandlers();
    setupToggle();
    updateInventoryUI();
    updateLivesUI();
    updateScoreUI();

    loadLevel(1);
}

function setupToggle() {
    if (toggleUI) {
        toggleUI.checked = state.hideNotesOnPlayback;
        toggleUI.addEventListener('change', () => {
            state.hideNotesOnPlayback = toggleUI.checked;
        });
    }
}

export function toggleHideNotes() {
    state.hideNotesOnPlayback = !state.hideNotesOnPlayback;
    if (toggleUI) toggleUI.checked = state.hideNotesOnPlayback;
}

function setupInputHandlers() {
    onMove((dx, dy) => {
        initAudio();
        if (state.puzzleState === null) {
            movePlayer(dx, dy);
        }
    });

    onRestart(() => {
        initAudio();
        if (state.puzzleState === 'gameover') {
            restartGame();
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
    // Award extra life for completing previous level (not on first level)
    if (levelNum > 1 && state.currentLevel < levelNum) {
        state.lives++;
        updateLivesUI();
    }

    state.currentLevel = levelNum;

    // Check for new high score
    const isNewHighScore = checkHighScore();
    updateScoreUI();

    if (levelNum > 1) {
        if (isNewHighScore) {
            showMessage(`Level ${levelNum} - NEW HIGH SCORE!`);
        } else {
            showMessage(`Level ${levelNum} - Extra life!`);
        }
    } else {
        showMessage(`Level ${levelNum}`);
    }

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
    hideOverlay();
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
    // Check if player has all required notes (deduplicate for display)
    const missingNotes = [...new Set(door.sequence.filter(n => !state.collectedNotes.has(n)))];
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
    if (state.hideNotesOnPlayback) showOverlay();

    // Play the melody, then switch to input mode
    const duration = playMelody(door.sequence, 400, highlightNote);
    setTimeout(() => {
        hideOverlay();
        state.puzzleState = 'input';
        showMessage("Your turn! Repeat the melody.");
    }, duration + 500);
}

function checkPuzzleInput() {
    const inputLen = state.playerInput.length;
    const expected = state.puzzleSequence[inputLen - 1];
    const actual = state.playerInput[inputLen - 1];

    if (actual !== expected) {
        // Wrong note - lose a life!
        state.lives--;
        updateLivesUI();
        playErrorSound();

        if (state.lives <= 0) {
            // Game over
            state.puzzleState = 'gameover';
            showMessage("Game Over! Press R to restart.");
            return;
        }

        showMessage(`Wrong note! Lives: ${state.lives}`);
        state.playerInput = [];

        // Replay melody after delay
        setTimeout(() => {
            if (state.puzzleState === 'gameover') return;
            state.puzzleState = 'listening';
            showMessage("Listen again...");
            if (state.hideNotesOnPlayback) showOverlay();
            const duration = playMelody(state.puzzleSequence, 400, highlightNote);
            setTimeout(() => {
                if (state.puzzleState === 'gameover') return;
                hideOverlay();
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

function updateLivesUI() {
    if (!livesUI) return;
    livesUI.textContent = '❤'.repeat(state.lives) + '♡'.repeat(Math.max(0, 3 - state.lives));
}

function updateScoreUI() {
    if (!scoreUI) return;
    scoreUI.innerHTML = `Level: <span class="current">${state.currentLevel}</span> | Best: <span class="best">${state.highScore}</span>`;
}

function showOverlay() {
    if (overlayUI) {
        overlayUI.classList.add('visible');
    }
    // Also hide touch notes on mobile
    const touchNotes = document.getElementById('touchNotes');
    if (touchNotes) {
        touchNotes.classList.add('hidden');
    }
}

function hideOverlay() {
    if (overlayUI) {
        overlayUI.classList.remove('visible');
    }
    // Also show touch notes on mobile
    const touchNotes = document.getElementById('touchNotes');
    if (touchNotes) {
        touchNotes.classList.remove('hidden');
    }
}

export function restartGame() {
    state.lives = 3;
    state.currentLevel = 0; // Set to 0 so loadLevel(1) doesn't think we're advancing
    state.puzzleState = null;
    updateLivesUI();
    updateScoreUI();
    hideOverlay();
    loadLevel(1);
}

function updateInventoryUI() {
    // Update desktop inventory
    if (inventoryUI) {
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

    // Update touch note buttons
    const touchNotes = document.querySelectorAll('.touch-note[data-note]');
    touchNotes.forEach(btn => {
        const noteIndex = parseInt(btn.dataset.note);
        const noteName = NOTE_NAMES[noteIndex];
        if (state.collectedNotes.has(noteName)) {
            btn.classList.add('collected');
        } else {
            btn.classList.remove('collected');
        }
    });
}

function highlightNote(noteName) {
    // Don't show highlights during listening phase in Mozart Mode
    if (state.puzzleState === 'listening' && state.hideNotesOnPlayback) {
        return;
    }

    // Highlight desktop inventory slot
    const slot = document.getElementById(`note-${noteName}`);
    if (slot) {
        slot.classList.add('active');
        setTimeout(() => slot.classList.remove('active'), 200);
    }

    // Highlight touch button
    const noteIndex = NOTE_NAMES.indexOf(noteName);
    const touchBtn = document.querySelector(`.touch-note[data-note="${noteIndex}"]`);
    if (touchBtn) {
        touchBtn.classList.add('active');
        setTimeout(() => touchBtn.classList.remove('active'), 200);
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

    // Handle held movement keys (only when not in puzzle)
    if (state.puzzleState === null) {
        updateInput(timestamp);
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
