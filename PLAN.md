# Melody Dungeon - Implementation Plan

A browser-based musical dungeon crawler where players collect notes and solve melody puzzles.

## Tech Stack
- **Vanilla JavaScript** - no frameworks, easier to learn from
- **HTML5 Canvas** - 2D rendering for dungeon and UI
- **Web Audio API** - synthesizing musical notes (no external libraries)
- **Single HTML file** - easy to run, just open in browser

## Core Systems

### 1. Audio System (`audio.js` concepts in main file)
- Create an `AudioContext` for sound generation
- Oscillator-based note synthesis (sine waves for pleasant tones)
- Note frequency mapping: C4=262Hz, D4=294Hz, E4=330Hz, etc.
- Functions: `playNote(note, duration)`, `playMelody(notes[])`

### 2. Dungeon Generation
- Grid-based map (tiles)
- Room-based generation with corridors
- Room types:
  - **Note Rooms** - contain collectible notes
  - **Puzzle Rooms** - melody locks blocking progression
  - **Start Room** - where player begins
  - **Exit Room** - goal of each level

### 3. Game Entities
- **Player**: position, collected notes inventory
- **Notes**: C, D, E, F, G, A, B (one octave to start)
- **Melody Locks**: door + required sequence to unlock
- **Tiles**: floor, wall, door (locked/unlocked)

### 4. Puzzle Mechanics (Simon Says Style)
- Locked doors display a melody pattern
- Player approaches door → melody plays automatically with visual feedback
- Each note lights up its corresponding UI element as it plays
- Player must replay the exact sequence using number keys (1-7 = C-B)
- Visual feedback: notes light up as player presses them
- Correct sequence → door opens with success sound/animation
- Wrong note → error sound, puzzle resets after short delay
- Difficulty scales: Level 1 = 2-3 notes, later levels = 5-7 notes

### 5. Rendering System (Pixel Art Style)
- Tile-based rendering (16x16 or 32x32 pixel tiles)
- Chunky pixel art aesthetic with limited color palette
- No image files - draw sprites procedurally with fillRect
- Color coding:
  - Player: bright adventurer colors
  - Notes: rainbow colors (C=red, D=orange, E=yellow, etc.)
  - Walls: dark stone colors with simple texture pattern
  - Floors: lighter dungeon tiles
  - Locked doors: glowing red → green when unlocked
- Intentionally blocky/pixelated look (no anti-aliasing)

### 6. Game Loop
- `update()`: process input, check collisions
- `render()`: draw current state
- `requestAnimationFrame` for smooth 60fps

### 7. Input Handling
- Arrow keys / WASD: movement
- Number keys 1-7: play notes C through B
- Space: interact with nearby puzzle door

## File Structure
```
melody-dungeon/
├── index.html      # Single file containing everything
└── PLAN.md         # This file
```

## Implementation Order

### Phase 1: Foundation
1. HTML boilerplate with canvas
2. Basic game loop (update/render cycle)
3. Tile rendering system
4. Player movement on grid

### Phase 2: Audio
5. Web Audio API setup
6. Note synthesis and playback
7. Melody playback function

### Phase 3: Dungeon
8. Simple room generation (start with handcrafted level)
9. Wall collision detection
10. Note collectibles placed in rooms

### Phase 4: Puzzles
11. Melody lock doors
12. Puzzle interaction (hear melody, replay it)
13. Inventory UI showing collected notes

### Phase 5: Polish
14. Multiple levels with increasing difficulty
15. Visual feedback (animations, colors)
16. Win condition and level progression

## Learning Highlights
- **Web Audio API**: oscillators, audio context, gain nodes
- **Game loop pattern**: separation of update/render
- **Procedural generation**: algorithms for creating content
- **State machines**: puzzle states (locked → listening → solved)
- **Collision detection**: grid-based simplifies this significantly
