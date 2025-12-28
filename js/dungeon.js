import { TILE, MAP_WIDTH, MAP_HEIGHT, NOTE_NAMES } from './constants.js';

// Room class for BSP generation
class Room {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.centerX = Math.floor(x + width / 2);
        this.centerY = Math.floor(y + height / 2);
    }

    intersects(other, padding = 1) {
        return !(this.x + this.width + padding < other.x ||
                 other.x + other.width + padding < this.x ||
                 this.y + this.height + padding < other.y ||
                 other.y + other.height + padding < this.y);
    }
}

// BSP Node for dungeon generation
class BSPNode {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.left = null;
        this.right = null;
        this.room = null;
    }

    split(minSize = 6) {
        if (this.left || this.right) return false;

        // Determine split direction
        let splitH = Math.random() > 0.5;
        if (this.width > this.height && this.width / this.height >= 1.25) {
            splitH = false;
        } else if (this.height > this.width && this.height / this.width >= 1.25) {
            splitH = true;
        }

        const max = (splitH ? this.height : this.width) - minSize;
        if (max <= minSize) return false;

        const splitPos = Math.floor(Math.random() * (max - minSize)) + minSize;

        if (splitH) {
            this.left = new BSPNode(this.x, this.y, this.width, splitPos);
            this.right = new BSPNode(this.x, this.y + splitPos, this.width, this.height - splitPos);
        } else {
            this.left = new BSPNode(this.x, this.y, splitPos, this.height);
            this.right = new BSPNode(this.x + splitPos, this.y, this.width - splitPos, this.height);
        }

        return true;
    }

    getLeaves() {
        if (!this.left && !this.right) return [this];
        let leaves = [];
        if (this.left) leaves = leaves.concat(this.left.getLeaves());
        if (this.right) leaves = leaves.concat(this.right.getLeaves());
        return leaves;
    }

    createRooms(minRoomSize = 4, padding = 1) {
        if (this.left || this.right) {
            if (this.left) this.left.createRooms(minRoomSize, padding);
            if (this.right) this.right.createRooms(minRoomSize, padding);
        } else {
            const roomWidth = Math.floor(Math.random() * (this.width - minRoomSize - padding * 2)) + minRoomSize;
            const roomHeight = Math.floor(Math.random() * (this.height - minRoomSize - padding * 2)) + minRoomSize;
            const roomX = this.x + Math.floor(Math.random() * (this.width - roomWidth - padding)) + padding;
            const roomY = this.y + Math.floor(Math.random() * (this.height - roomHeight - padding)) + padding;
            this.room = new Room(roomX, roomY, roomWidth, roomHeight);
        }
    }

    getRoom() {
        if (this.room) return this.room;
        if (this.left) {
            const leftRoom = this.left.getRoom();
            if (leftRoom) return leftRoom;
        }
        if (this.right) {
            const rightRoom = this.right.getRoom();
            if (rightRoom) return rightRoom;
        }
        return null;
    }
}

// Generate dungeon using BSP
export function generateDungeon(level = 1) {
    const map = [];
    const rooms = [];
    const corridors = [];

    // Initialize map with walls
    for (let y = 0; y < MAP_HEIGHT; y++) {
        map[y] = [];
        for (let x = 0; x < MAP_WIDTH; x++) {
            map[y][x] = TILE.WALL;
        }
    }

    // BSP generation
    const root = new BSPNode(1, 1, MAP_WIDTH - 2, MAP_HEIGHT - 2);
    const iterations = 3 + Math.min(level, 2); // More splits for higher levels

    const nodesToSplit = [root];
    for (let i = 0; i < iterations; i++) {
        const newNodes = [];
        for (const node of nodesToSplit) {
            if (node.split(5)) {
                newNodes.push(node.left, node.right);
            }
        }
        nodesToSplit.length = 0;
        nodesToSplit.push(...newNodes);
    }

    root.createRooms(4, 1);

    // Get all rooms from leaves
    const leaves = root.getLeaves();
    for (const leaf of leaves) {
        if (leaf.room) {
            rooms.push(leaf.room);
        }
    }

    // Carve rooms into map
    for (const room of rooms) {
        for (let y = room.y; y < room.y + room.height; y++) {
            for (let x = room.x; x < room.x + room.width; x++) {
                if (y > 0 && y < MAP_HEIGHT - 1 && x > 0 && x < MAP_WIDTH - 1) {
                    map[y][x] = TILE.FLOOR;
                }
            }
        }
    }

    // Connect rooms with corridors using BSP hierarchy
    connectBSP(root, map, corridors);

    // Place start and exit in furthest rooms
    const startRoom = rooms[0];
    const exitRoom = findFurthestRoom(startRoom, rooms);

    const startPos = { x: startRoom.centerX, y: startRoom.centerY };
    const exitPos = { x: exitRoom.centerX, y: exitRoom.centerY };

    map[startPos.y][startPos.x] = TILE.START;
    map[exitPos.y][exitPos.x] = TILE.EXIT;

    // Generate doors and notes ensuring solvability
    const { doors, notePositions } = generatePuzzles(map, rooms, startRoom, exitRoom, level, corridors);

    return {
        map,
        rooms,
        startPos,
        exitPos,
        doors,
        notePositions
    };
}

function connectBSP(node, map, corridors) {
    if (!node.left || !node.right) return;

    const leftRoom = node.left.getRoom();
    const rightRoom = node.right.getRoom();

    if (leftRoom && rightRoom) {
        const corridor = createCorridor(leftRoom, rightRoom, map);
        corridors.push(corridor);
    }

    connectBSP(node.left, map, corridors);
    connectBSP(node.right, map, corridors);
}

function createCorridor(room1, room2, map) {
    const x1 = room1.centerX;
    const y1 = room1.centerY;
    const x2 = room2.centerX;
    const y2 = room2.centerY;

    const corridorTiles = [];

    // L-shaped corridor
    if (Math.random() > 0.5) {
        // Horizontal then vertical
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            if (y1 > 0 && y1 < MAP_HEIGHT - 1 && x > 0 && x < MAP_WIDTH - 1) {
                map[y1][x] = TILE.FLOOR;
                corridorTiles.push({ x, y: y1 });
            }
        }
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            if (y > 0 && y < MAP_HEIGHT - 1 && x2 > 0 && x2 < MAP_WIDTH - 1) {
                map[y][x2] = TILE.FLOOR;
                corridorTiles.push({ x: x2, y });
            }
        }
    } else {
        // Vertical then horizontal
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            if (y > 0 && y < MAP_HEIGHT - 1 && x1 > 0 && x1 < MAP_WIDTH - 1) {
                map[y][x1] = TILE.FLOOR;
                corridorTiles.push({ x: x1, y });
            }
        }
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            if (y2 > 0 && y2 < MAP_HEIGHT - 1 && x > 0 && x < MAP_WIDTH - 1) {
                map[y2][x] = TILE.FLOOR;
                corridorTiles.push({ x, y: y2 });
            }
        }
    }

    return {
        from: room1,
        to: room2,
        tiles: corridorTiles,
        midpoint: corridorTiles[Math.floor(corridorTiles.length / 2)]
    };
}

function findFurthestRoom(startRoom, rooms) {
    let maxDist = 0;
    let furthest = rooms[rooms.length - 1];

    for (const room of rooms) {
        const dist = Math.abs(room.centerX - startRoom.centerX) + Math.abs(room.centerY - startRoom.centerY);
        if (dist > maxDist) {
            maxDist = dist;
            furthest = room;
        }
    }

    return furthest;
}

// Find chokepoints in corridors for door placement
function findChokepoints(map, corridors) {
    const chokepoints = [];

    for (const corridor of corridors) {
        // Look for narrow points in the corridor
        for (const tile of corridor.tiles) {
            const { x, y } = tile;

            // Check if this is a valid chokepoint (wall on opposite sides)
            const wallsNS = (map[y - 1]?.[x] === TILE.WALL && map[y + 1]?.[x] === TILE.WALL);
            const wallsEW = (map[y]?.[x - 1] === TILE.WALL && map[y]?.[x + 1] === TILE.WALL);

            if (wallsNS || wallsEW) {
                chokepoints.push({
                    x,
                    y,
                    corridor,
                    orientation: wallsNS ? 'vertical' : 'horizontal'
                });
            }
        }
    }

    return chokepoints;
}

function generatePuzzles(map, rooms, startRoom, exitRoom, level, corridors) {
    const doors = [];
    const notePositions = [];
    const notesInReachableArea = new Set();

    // Find chokepoints for potential door placement
    const chokepoints = findChokepoints(map, corridors);

    // Determine number of doors based on level
    const numDoors = Math.min(1 + level, chokepoints.length, 3);

    // Sort chokepoints by distance from start (place doors progressively further)
    chokepoints.sort((a, b) => {
        const distA = Math.abs(a.x - startRoom.centerX) + Math.abs(a.y - startRoom.centerY);
        const distB = Math.abs(b.x - startRoom.centerX) + Math.abs(b.y - startRoom.centerY);
        return distA - distB;
    });

    // Use BFS to find rooms reachable before each door
    const selectedChokepoints = chokepoints.slice(0, numDoors);

    // For each door, ensure required notes are placed in reachable area
    let currentReachable = findReachableFloors(map, startRoom.centerX, startRoom.centerY);

    for (let i = 0; i < selectedChokepoints.length; i++) {
        const choke = selectedChokepoints[i];

        // Determine sequence length based on level and door index
        const seqLength = Math.min(2 + Math.floor(level / 2) + i, 5);
        const sequence = generateSequence(seqLength, Array.from(notesInReachableArea));

        // Place door
        map[choke.y][choke.x] = TILE.DOOR_LOCKED;
        doors.push({
            x: choke.x,
            y: choke.y,
            sequence
        });

        // Place required notes in reachable area (before the door)
        const notesNeeded = sequence.filter(n => !notesInReachableArea.has(n));
        const availableSpots = currentReachable.filter(pos =>
            map[pos.y][pos.x] === TILE.FLOOR &&
            !notePositions.some(n => n.x === pos.x && n.y === pos.y) &&
            !(pos.x === startRoom.centerX && pos.y === startRoom.centerY)
        );

        shuffle(availableSpots);

        for (const noteName of notesNeeded) {
            if (availableSpots.length > 0) {
                const spot = availableSpots.pop();
                notePositions.push({ x: spot.x, y: spot.y, note: noteName, collected: false });
                notesInReachableArea.add(noteName);
            }
        }

        // Add some extra notes for variety
        const extraNotes = NOTE_NAMES.filter(n => !notesInReachableArea.has(n));
        const numExtra = Math.min(1, extraNotes.length, availableSpots.length);
        for (let j = 0; j < numExtra; j++) {
            const spot = availableSpots.pop();
            const note = extraNotes[j];
            notePositions.push({ x: spot.x, y: spot.y, note, collected: false });
            notesInReachableArea.add(note);
        }

        // Update reachable area to include area after this door
        map[choke.y][choke.x] = TILE.FLOOR; // Temporarily remove door
        currentReachable = findReachableFloors(map, startRoom.centerX, startRoom.centerY);
        map[choke.y][choke.x] = TILE.DOOR_LOCKED; // Put door back
    }

    // Place any remaining notes in the dungeon
    const remainingNotes = NOTE_NAMES.filter(n => !notesInReachableArea.has(n));
    const allFloors = findReachableFloors(map, startRoom.centerX, startRoom.centerY, true);
    const availableFloors = allFloors.filter(pos =>
        map[pos.y][pos.x] === TILE.FLOOR &&
        !notePositions.some(n => n.x === pos.x && n.y === pos.y)
    );
    shuffle(availableFloors);

    for (const note of remainingNotes) {
        if (availableFloors.length > 0) {
            const spot = availableFloors.pop();
            notePositions.push({ x: spot.x, y: spot.y, note, collected: false });
        }
    }

    return { doors, notePositions };
}

function findReachableFloors(map, startX, startY, ignoreDoors = false) {
    const reachable = [];
    const visited = new Set();
    const queue = [{ x: startX, y: startY }];

    while (queue.length > 0) {
        const { x, y } = queue.shift();
        const key = `${x},${y}`;

        if (visited.has(key)) continue;
        visited.add(key);

        const tile = map[y]?.[x];
        if (tile === undefined || tile === TILE.WALL) continue;
        if (!ignoreDoors && tile === TILE.DOOR_LOCKED) continue;

        reachable.push({ x, y });

        queue.push({ x: x + 1, y });
        queue.push({ x: x - 1, y });
        queue.push({ x, y: y + 1 });
        queue.push({ x, y: y - 1 });
    }

    return reachable;
}

function generateSequence(length, availableNotes) {
    const sequence = [];
    const allNotes = [...NOTE_NAMES];

    for (let i = 0; i < length; i++) {
        // Prefer available notes, but can introduce new ones
        const pool = availableNotes.length > 0 && Math.random() > 0.3
            ? availableNotes
            : allNotes;
        const note = pool[Math.floor(Math.random() * pool.length)];
        sequence.push(note);

        // Add to available for next iteration
        if (!availableNotes.includes(note)) {
            availableNotes.push(note);
        }
    }

    return sequence;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
