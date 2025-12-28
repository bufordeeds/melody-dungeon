const keys = {};
const callbacks = {
    move: null,
    playNote: null,
    interact: null,
    restart: null
};

// Movement timing
const MOVE_DELAY = 120; // ms between moves when holding
const INITIAL_MOVE_DELAY = 0; // no delay on first press
let lastMoveTime = 0;
let moveHeldTime = 0;

export function initInput() {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    initTouchControls();
}

function initTouchControls() {
    // D-pad buttons
    const dpadBtns = document.querySelectorAll('.dpad-btn[data-dir]');
    dpadBtns.forEach(btn => {
        const dir = btn.dataset.dir;
        let dx = 0, dy = 0;
        if (dir === 'up') dy = -1;
        if (dir === 'down') dy = 1;
        if (dir === 'left') dx = -1;
        if (dir === 'right') dx = 1;

        // Handle touch start for immediate + held movement
        let holdInterval = null;
        let holdTimeout = null;

        const startMove = (e) => {
            e.preventDefault();
            if (callbacks.move) callbacks.move(dx, dy);
            lastMoveTime = performance.now();

            // Start holding after a short delay
            holdTimeout = setTimeout(() => {
                holdInterval = setInterval(() => {
                    if (callbacks.move) callbacks.move(dx, dy);
                }, MOVE_DELAY);
            }, 200);
        };

        const stopMove = () => {
            if (holdTimeout) clearTimeout(holdTimeout);
            if (holdInterval) clearInterval(holdInterval);
            holdTimeout = null;
            holdInterval = null;
        };

        btn.addEventListener('touchstart', startMove, { passive: false });
        btn.addEventListener('touchend', stopMove);
        btn.addEventListener('touchcancel', stopMove);

        // Mouse support for testing
        btn.addEventListener('mousedown', startMove);
        btn.addEventListener('mouseup', stopMove);
        btn.addEventListener('mouseleave', stopMove);
    });

    // Note buttons
    const noteBtns = document.querySelectorAll('.touch-note[data-note]');
    noteBtns.forEach(btn => {
        const noteIndex = parseInt(btn.dataset.note);

        const playTouchNote = (e) => {
            e.preventDefault();
            if (callbacks.playNote) callbacks.playNote(noteIndex);
        };

        btn.addEventListener('touchstart', playTouchNote, { passive: false });
        btn.addEventListener('mousedown', playTouchNote);
    });

    // Interact button
    const interactBtn = document.getElementById('interactBtn');
    if (interactBtn) {
        const doInteract = (e) => {
            e.preventDefault();
            if (callbacks.interact) callbacks.interact();
        };
        interactBtn.addEventListener('touchstart', doInteract, { passive: false });
        interactBtn.addEventListener('mousedown', doInteract);
    }

    // Restart button
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
        const doRestart = (e) => {
            e.preventDefault();
            if (callbacks.restart) callbacks.restart();
        };
        restartBtn.addEventListener('touchstart', doRestart, { passive: false });
        restartBtn.addEventListener('mousedown', doRestart);
    }
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

export function onRestart(callback) {
    callbacks.restart = callback;
}

// Called every frame from game loop to handle held movement keys
export function updateInput(timestamp) {
    let dx = 0, dy = 0;

    if (keys['ArrowUp'] || keys['w'] || keys['W']) dy = -1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) dy = 1;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx = -1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx = 1;

    if ((dx !== 0 || dy !== 0) && callbacks.move) {
        const timeSinceMove = timestamp - lastMoveTime;

        if (timeSinceMove >= MOVE_DELAY) {
            callbacks.move(dx, dy);
            lastMoveTime = timestamp;
        }
    }
}

function handleKeyDown(e) {
    const wasPressed = keys[e.key];
    keys[e.key] = true;

    // For movement keys, trigger immediate move on first press
    if (!wasPressed) {
        let dx = 0, dy = 0;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dy = -1;
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dy = 1;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dx = -1;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dx = 1;

        if ((dx !== 0 || dy !== 0) && callbacks.move) {
            callbacks.move(dx, dy);
            lastMoveTime = performance.now();
        }
    }

    // Note keys (1-7) - only trigger once per press
    if (!wasPressed) {
        const noteIndex = parseInt(e.key) - 1;
        if (noteIndex >= 0 && noteIndex < 7 && callbacks.playNote) {
            callbacks.playNote(noteIndex);
        }
    }

    // Interact - only trigger once per press
    if (!wasPressed && e.key === ' ' && callbacks.interact) {
        callbacks.interact();
        e.preventDefault();
    }

    // Prevent spacebar scrolling
    if (e.key === ' ') {
        e.preventDefault();
    }

    // Restart key
    if (!wasPressed && (e.key === 'r' || e.key === 'R') && callbacks.restart) {
        callbacks.restart();
    }
}

function handleKeyUp(e) {
    keys[e.key] = false;
}

export function isKeyPressed(key) {
    return !!keys[key];
}
