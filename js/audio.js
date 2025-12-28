import { NOTES } from './constants.js';

let audioCtx = null;

export function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

export function playNote(noteName, duration = 0.3, onPlay = null) {
    if (!audioCtx) initAudio();

    const note = NOTES[noteName];
    if (!note) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(note.freq, audioCtx.currentTime);

    // Envelope for pleasant sound
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);

    if (onPlay) onPlay(noteName);
}

export function playMelody(notes, tempo = 400, onNotePlayed = null) {
    notes.forEach((noteName, index) => {
        setTimeout(() => {
            playNote(noteName, 0.35, onNotePlayed);
        }, index * tempo);
    });
    return notes.length * tempo;
}

export function playErrorSound() {
    if (!audioCtx) initAudio();

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.2);
}

export function playSuccessSound() {
    if (!audioCtx) initAudio();

    const notes = [392, 494, 587]; // G, B, D (happy chord arpeggio)
    notes.forEach((freq, i) => {
        setTimeout(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.3);
        }, i * 100);
    });
}

export function playPickupSound(noteName) {
    playNote(noteName, 0.5);
}
