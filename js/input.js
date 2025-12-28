const keys = {};
const callbacks = {
    move: null,
    playNote: null,
    interact: null
};

export function initInput() {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
}

export function onMove(callback) {
    callbacks.move = callback;
}

export function onPlayNote(callback) {
    callbacks.playNote = callback;
}

export function onInteract(callback) {
    callbacks.interact = callback;
}

function handleKeyDown(e) {
    if (keys[e.key]) return; // Prevent key repeat
    keys[e.key] = true;

    // Movement
    let dx = 0, dy = 0;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dy = -1;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dy = 1;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dx = -1;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dx = 1;

    if ((dx !== 0 || dy !== 0) && callbacks.move) {
        callbacks.move(dx, dy);
    }

    // Note keys (1-7)
    const noteIndex = parseInt(e.key) - 1;
    if (noteIndex >= 0 && noteIndex < 7 && callbacks.playNote) {
        callbacks.playNote(noteIndex);
    }

    // Interact
    if (e.key === ' ' && callbacks.interact) {
        callbacks.interact();
        e.preventDefault();
    }
}

function handleKeyUp(e) {
    keys[e.key] = false;
}

export function isKeyPressed(key) {
    return !!keys[key];
}
