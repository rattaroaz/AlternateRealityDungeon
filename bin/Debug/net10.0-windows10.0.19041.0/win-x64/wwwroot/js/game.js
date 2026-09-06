window.game = {
    _player: null, // Reference to current player state for saving
    _dotNetHelper: null, // Reference to .NET helper for logging
    initGame: function (containerId, playerStats, dotNetHelper, cameraState, mapData) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Store dotNetHelper globally for logging
        window.game._dotNetHelper = dotNetHelper;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        scene.fog = new THREE.Fog(0x000000, 5, 80);

        // Camera
        const camera = new THREE.PerspectiveCamera(90, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(0, 1.6, 0); // Eye level

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        scene.add(dirLight);

        // Dungeon grid - use provided map data or defaults
        const MAP_WIDTH = mapData?.width || 65;
        const MAP_HEIGHT = mapData?.height || 65;
        const TILE_SIZE = 4;
        const NUM_LEVELS = mapData?.numLevels || 4;
        let currentLevel = 0; // 0-indexed (Level 1 = index 0)
        const playerStartTile = { 
            x: mapData?.playerStartX || 32, 
            y: mapData?.playerStartY || 32 
        };
        
        // Flag to track if we're using a custom map
        const useCustomMap = mapData && mapData.levels && mapData.levels.length > 0;
        
        // Debug: Log map data received
        if (mapData) {
            console.log('Map data received:', {
                hasLevels: !!mapData.levels,
                levelsCount: mapData.levels ? mapData.levels.length : 0,
                hasHWalls: !!mapData.hWalls,
                hWallsCount: mapData.hWalls ? mapData.hWalls.length : 0,
                hasVWalls: !!mapData.vWalls,
                vWallsCount: mapData.vWalls ? mapData.vWalls.length : 0
            });
        } else {
            console.log('No map data received, will generate procedurally');
        }

        const planeGeometry = new THREE.PlaneGeometry(MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
        const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;
        scene.add(plane);

        // Trees
        function createTree(x, z) {
            const treeGroup = new THREE.Group();

            // Trunk
            const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
            const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // SaddleBrown
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = 0.5;
            treeGroup.add(trunk);

            // Leaves
            const leavesGeometry = new THREE.ConeGeometry(1, 2, 8);
            const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x006400 }); // DarkGreen
            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leaves.position.y = 1.5;
            treeGroup.add(leaves);

            treeGroup.position.set(x, 0, z);
            scene.add(treeGroup);
        }

        // JavaScript logging system - accumulates logs for .NET to fetch
        window.gameLogBuffer = window.gameLogBuffer || [];
        
        function logToFile(message) {
            // Log to console
            console.log(message);
            
            // Add to log buffer for .NET to fetch
            const timestamp = new Date().toISOString();
            window.gameLogBuffer.push(`[${timestamp}] ${message}`);
            
            // Keep buffer size manageable (max 100 entries)
            if (window.gameLogBuffer.length > 100) {
                window.gameLogBuffer.shift();
            }
        }
        
        // Method for .NET to call to get and clear logs
        window.game.getAndClearLogs = function() {
            const logs = window.gameLogBuffer.slice();
            window.gameLogBuffer = [];
            return logs;
        };
        
        // Make logToFile available globally
        window.logToFile = logToFile;

        // Dungeon layout - Multi-level
        const WALL = 1;
        const FLOOR = 0;
        const STAIRS_DOWN = 2;
        const STAIRS_UP = 3;
        // Special rooms (guilds, shops, etc.) with entrance direction
        const SPECIAL_ROOM_N = 5; // Entrance from North
        const SPECIAL_ROOM_E = 6; // Entrance from East
        const SPECIAL_ROOM_S = 7; // Entrance from South
        const SPECIAL_ROOM_W = 8; // Entrance from West
        
        // All dungeon levels [level][y][x]
        const dungeonLevels = [];
        // Stair positions for each level: { down: [{x,y}, {x,y}], up: [{x,y}, {x,y}] }
        const stairPositions = [];
        
        // Edge-based walls: hWalls[level][y][x] = horizontal wall on top edge of cell (x,y)
        // vWalls[level][y][x] = vertical wall on left edge of cell (x,y)
        const hWalls = [];
        const vWalls = [];
        // Edge-based doors (parallel to walls): 0=none, 1=normal, 2=hidden, 3=one-way positive (S/E), 4=one-way negative (N/W)
        const hDoors = [];
        const vDoors = [];
        
        // Check if we have edge-based wall data
        const useEdgeWalls = mapData && mapData.hWalls && mapData.vWalls && 
                            mapData.hWalls.length > 0 && mapData.vWalls.length > 0;
        
        // Initialize all levels
        for (let level = 0; level < NUM_LEVELS; level++) {
            dungeonLevels[level] = [];
            for (let y = 0; y < MAP_HEIGHT; y++) {
                dungeonLevels[level][y] = [];
                for (let x = 0; x < MAP_WIDTH; x++) {
                    dungeonLevels[level][y][x] = useEdgeWalls ? FLOOR : WALL;
                }
            }
            stairPositions[level] = { down: [], up: [] };
            
            // Initialize edge-based walls with perimeter
            hWalls[level] = [];
            hDoors[level] = [];
            for (let y = 0; y <= MAP_HEIGHT; y++) {
                hWalls[level][y] = [];
                hDoors[level][y] = [];
                for (let x = 0; x < MAP_WIDTH; x++) {
                    hWalls[level][y][x] = (y === 0 || y === MAP_HEIGHT);
                    hDoors[level][y][x] = 0;
                }
            }
            vWalls[level] = [];
            vDoors[level] = [];
            for (let y = 0; y < MAP_HEIGHT; y++) {
                vWalls[level][y] = [];
                vDoors[level][y] = [];
                for (let x = 0; x <= MAP_WIDTH; x++) {
                    vWalls[level][y][x] = (x === 0 || x === MAP_WIDTH);
                    vDoors[level][y][x] = 0;
                }
            }
        }
        
        // Room generation for each level
        function generateLevel(level) {
            const map = dungeonLevels[level];
            const rooms = [];
            const minRooms = 8;
            const maxRooms = 12;
            const minRoomSize = 4;
            const maxRoomSize = 10;
            const numRooms = minRooms + Math.floor(Math.random() * (maxRooms - minRooms + 1));
            
            // Carve a room
            function carveRoom(x, y, w, h) {
                for (let ry = y; ry < y + h && ry < MAP_HEIGHT - 1; ry++) {
                    for (let rx = x; rx < x + w && rx < MAP_WIDTH - 1; rx++) {
                        if (rx > 0 && ry > 0) {
                            map[ry][rx] = FLOOR;
                        }
                    }
                }
            }
            
            // Carve corridor between two points
            function carveCorridor(x1, y1, x2, y2) {
                let x = x1;
                let y = y1;
                while (x !== x2 || y !== y2) {
                    if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
                        map[y][x] = FLOOR;
                    }
                    if (Math.random() < 0.5) {
                        if (x !== x2) x += Math.sign(x2 - x);
                        else if (y !== y2) y += Math.sign(y2 - y);
                    } else {
                        if (y !== y2) y += Math.sign(y2 - y);
                        else if (x !== x2) x += Math.sign(x2 - x);
                    }
                }
                if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
                    map[y][x] = FLOOR;
                }
            }
            
            // Generate rooms
            for (let i = 0; i < numRooms; i++) {
                const w = minRoomSize + Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1));
                const h = minRoomSize + Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1));
                const x = 1 + Math.floor(Math.random() * (MAP_WIDTH - w - 2));
                const y = 1 + Math.floor(Math.random() * (MAP_HEIGHT - h - 2));
                
                // Check for overlap with existing rooms (with 1 tile buffer)
                let overlaps = false;
                for (const room of rooms) {
                    if (x < room.x + room.w + 1 && x + w + 1 > room.x &&
                        y < room.y + room.h + 1 && y + h + 1 > room.y) {
                        overlaps = true;
                        break;
                    }
                }
                
                if (!overlaps) {
                    carveRoom(x, y, w, h);
                    rooms.push({ x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) });
                }
            }
            
            // Connect rooms with corridors
            for (let i = 1; i < rooms.length; i++) {
                carveCorridor(rooms[i - 1].cx, rooms[i - 1].cy, rooms[i].cx, rooms[i].cy);
            }
            // Connect last to first to ensure connectivity
            if (rooms.length > 2) {
                carveCorridor(rooms[rooms.length - 1].cx, rooms[rooms.length - 1].cy, rooms[0].cx, rooms[0].cy);
            }
            
            // Ensure player start area is open (for level 0)
            if (level === 0) {
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const px = playerStartTile.x + dx;
                        const py = playerStartTile.y + dy;
                        if (px > 0 && px < MAP_WIDTH - 1 && py > 0 && py < MAP_HEIGHT - 1) {
                            map[py][px] = FLOOR;
                        }
                    }
                }
                // Connect player start to nearest room
                if (rooms.length > 0) {
                    let nearest = rooms[0];
                    let minDist = Math.abs(nearest.cx - playerStartTile.x) + Math.abs(nearest.cy - playerStartTile.y);
                    for (const room of rooms) {
                        const dist = Math.abs(room.cx - playerStartTile.x) + Math.abs(room.cy - playerStartTile.y);
                        if (dist < minDist) {
                            minDist = dist;
                            nearest = room;
                        }
                    }
                    carveCorridor(playerStartTile.x, playerStartTile.y, nearest.cx, nearest.cy);
                }
            }
            
            return rooms;
        }
        
        // Load custom map or generate procedurally
        if (useCustomMap) {
            // Load map data from provided mapData
            for (let level = 0; level < NUM_LEVELS && level < mapData.levels.length; level++) {
                for (let y = 0; y < MAP_HEIGHT && y < mapData.levels[level].length; y++) {
                    for (let x = 0; x < MAP_WIDTH && x < mapData.levels[level][y].length; x++) {
                        dungeonLevels[level][y][x] = mapData.levels[level][y][x];
                        
                        // Track stair positions
                        if (mapData.levels[level][y][x] === STAIRS_DOWN) {
                            stairPositions[level].down.push({ x, y });
                        } else if (mapData.levels[level][y][x] === STAIRS_UP) {
                            stairPositions[level].up.push({ x, y });
                        }
                    }
                }
            }
            
            // Load edge-based walls if present
            if (useEdgeWalls) {
                console.log('Loading edge-based walls. mapData.hWalls.length:', mapData.hWalls.length, 'mapData.vWalls.length:', mapData.vWalls.length);
                for (let level = 0; level < NUM_LEVELS; level++) {
                    // Check if this level's data exists in mapData
                    if (level < mapData.hWalls.length && mapData.hWalls[level]) {
                        // Load horizontal walls
                        for (let y = 0; y <= MAP_HEIGHT; y++) {
                            if (y < mapData.hWalls[level].length && mapData.hWalls[level][y]) {
                                for (let x = 0; x < MAP_WIDTH && x < mapData.hWalls[level][y].length; x++) {
                                    hWalls[level][y][x] = mapData.hWalls[level][y][x];
                                }
                            }
                        }
                        console.log('Loaded hWalls for level', level);
                    } else {
                        console.warn('No hWalls data for level', level);
                    }
                    
                    // Check if this level's vWalls data exists
                    if (level < mapData.vWalls.length && mapData.vWalls[level]) {
                        // Load vertical walls
                        for (let y = 0; y < MAP_HEIGHT; y++) {
                            if (y < mapData.vWalls[level].length && mapData.vWalls[level][y]) {
                                for (let x = 0; x <= MAP_WIDTH && x < mapData.vWalls[level][y].length; x++) {
                                    vWalls[level][y][x] = mapData.vWalls[level][y][x];
                                }
                            }
                        }
                        console.log('Loaded vWalls for level', level);
                    } else {
                        console.warn('No vWalls data for level', level);
                    }
                }
                console.log('Loaded edge-based walls from editor for all levels');
            }
            
            // Load edge-based doors if present
            const useEdgeDoors = mapData && mapData.hDoors && mapData.vDoors &&
                                mapData.hDoors.length > 0 && mapData.vDoors.length > 0;
            if (useEdgeDoors) {
                for (let level = 0; level < NUM_LEVELS; level++) {
                    if (level < mapData.hDoors.length && mapData.hDoors[level]) {
                        for (let y = 0; y <= MAP_HEIGHT; y++) {
                            if (y < mapData.hDoors[level].length && mapData.hDoors[level][y]) {
                                for (let x = 0; x < MAP_WIDTH && x < mapData.hDoors[level][y].length; x++) {
                                    hDoors[level][y][x] = mapData.hDoors[level][y][x];
                                }
                            }
                        }
                    }
                    if (level < mapData.vDoors.length && mapData.vDoors[level]) {
                        for (let y = 0; y < MAP_HEIGHT; y++) {
                            if (y < mapData.vDoors[level].length && mapData.vDoors[level][y]) {
                                for (let x = 0; x <= MAP_WIDTH && x < mapData.vDoors[level][y].length; x++) {
                                    vDoors[level][y][x] = mapData.vDoors[level][y][x];
                                }
                            }
                        }
                    }
                }
                console.log('Loaded edge-based doors from editor for all levels');
            }

            normalizeWallDoorExclusivity();
            
            console.log('Loaded custom map from editor');
        } else {
            // Generate all levels procedurally
            const allRooms = [];
            for (let level = 0; level < NUM_LEVELS; level++) {
                allRooms[level] = generateLevel(level);
            }
            
            // Place stairs between levels (2 sets per level connection)
            function placeStairs() {
                for (let level = 0; level < NUM_LEVELS - 1; level++) {
                    const rooms = allRooms[level];
                    const nextRooms = allRooms[level + 1];
                    
                    // Find 2 good stair locations on current level
                    const usedPositions = [];
                    for (let stairNum = 0; stairNum < 2; stairNum++) {
                        // Pick a room for stairs down
                        let stairRoom;
                        let attempts = 0;
                        do {
                            stairRoom = rooms[Math.floor(Math.random() * rooms.length)];
                            attempts++;
                        } while (usedPositions.some(p => Math.abs(p.x - stairRoom.cx) < 8 && Math.abs(p.y - stairRoom.cy) < 8) && attempts < 20);
                        
                        // Find a floor tile in the room for stairs
                        let stairX = stairRoom.cx;
                        let stairY = stairRoom.cy;
                        
                        // Make sure the position is valid
                        if (dungeonLevels[level][stairY][stairX] === FLOOR) {
                            dungeonLevels[level][stairY][stairX] = STAIRS_DOWN;
                            stairPositions[level].down.push({ x: stairX, y: stairY });
                            usedPositions.push({ x: stairX, y: stairY });
                            
                            // Ensure the corresponding position on next level is open and has stairs up
                            dungeonLevels[level + 1][stairY][stairX] = STAIRS_UP;
                            stairPositions[level + 1].up.push({ x: stairX, y: stairY });
                            
                            // Ensure area around stairs is walkable on both levels
                            for (let dy = -1; dy <= 1; dy++) {
                                for (let dx = -1; dx <= 1; dx++) {
                                    const nx = stairX + dx;
                                    const ny = stairY + dy;
                                    if (nx > 0 && nx < MAP_WIDTH - 1 && ny > 0 && ny < MAP_HEIGHT - 1) {
                                        if (dungeonLevels[level][ny][nx] === WALL) {
                                            dungeonLevels[level][ny][nx] = FLOOR;
                                        }
                                        if (dungeonLevels[level + 1][ny][nx] === WALL) {
                                            dungeonLevels[level + 1][ny][nx] = FLOOR;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            placeStairs();
            
            // Place special rooms (guilds, shops, inns) on each level
            function placeSpecialRooms() {
                const roomTypes = [
                    { type: SPECIAL_ROOM_N, name: 'guild' },
                    { type: SPECIAL_ROOM_E, name: 'shop' },
                    { type: SPECIAL_ROOM_S, name: 'inn' },
                    { type: SPECIAL_ROOM_W, name: 'smith' }
                ];
                
                for (let level = 0; level < NUM_LEVELS; level++) {
                    const rooms = allRooms[level];
                    if (rooms.length < 4) continue; // Need enough rooms
                    
                    // Shuffle rooms and pick different ones for each special room type
                    const shuffled = [...rooms].sort(() => Math.random() - 0.5);
                    let roomIdx = 0;
                    
                    for (const roomType of roomTypes) {
                        if (roomIdx >= shuffled.length) break;
                        const room = shuffled[roomIdx++];
                        
                        // Find a suitable wall location in the room
                        const walls = [];
                        // Top wall (north entrance)
                        for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
                            if (room.y > 0 && dungeonLevels[level][room.y - 1][x] === WALL) {
                                walls.push({ x, y: room.y, dir: SPECIAL_ROOM_N });
                            }
                        }
                        // Right wall (east entrance)
                        for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
                            if (room.x + room.w < MAP_WIDTH && dungeonLevels[level][y][room.x + room.w] === WALL) {
                                walls.push({ x: room.x + room.w - 1, y, dir: SPECIAL_ROOM_E });
                            }
                        }
                        // Bottom wall (south entrance)
                        for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
                            if (room.y + room.h < MAP_HEIGHT && dungeonLevels[level][room.y + room.h][x] === WALL) {
                                walls.push({ x, y: room.y + room.h - 1, dir: SPECIAL_ROOM_S });
                            }
                        }
                        // Left wall (west entrance)
                        for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
                            if (room.x > 0 && dungeonLevels[level][y][room.x - 1] === WALL) {
                                walls.push({ x: room.x, y, dir: SPECIAL_ROOM_W });
                            }
                        }
                        
                        if (walls.length > 0) {
                            const wall = walls[Math.floor(Math.random() * walls.length)];
                            dungeonLevels[level][wall.y][wall.x] = wall.dir;
                            logToFile(`Placed ${roomType.name} at (${wall.x}, ${wall.y}) on level ${level}`);
                        }
                    }
                }
            }
            placeSpecialRooms();
            
            console.log('Generated procedural dungeon');
        }
        
        // Get current level's map
        function getDungeonMap() {
            return dungeonLevels[currentLevel];
        }

        const wallHeight = 3;

        function createWallTexture() {
            const size = 256;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#d2b48c';
            ctx.fillRect(0, 0, size, size);

            ctx.strokeStyle = '#c9a57a';
            ctx.lineWidth = 2;
            for (let x = 0; x <= size; x += 32) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, size);
                ctx.stroke();
            }

            ctx.strokeStyle = '#b88f63';
            for (let y = 0; y <= size; y += 32) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(size, y);
                ctx.stroke();
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.anisotropy = 4;

            return texture;
        }

        const wallTexture = createWallTexture();
        const wallMaterial = new THREE.MeshStandardMaterial({
            map: wallTexture,
            color: 0xD2B48C,
            roughness: 0.85,
            metalness: 0.05,
            transparent: false,
            opacity: 1.0,
            side: THREE.DoubleSide
        });
        const wallGeometry = new THREE.BoxGeometry(TILE_SIZE, wallHeight, TILE_SIZE);
        const wallEdgeGeometry = new THREE.EdgesGeometry(wallGeometry);
        const wallEdgeMaterial = new THREE.LineBasicMaterial({ color: 0xFF6666 });
        
        // Edge wall geometry (thin walls on cell edges)
        const WALL_THICKNESS = 0.3;
        const hEdgeWallGeometry = new THREE.BoxGeometry(TILE_SIZE, wallHeight, WALL_THICKNESS); // Horizontal wall (runs along X axis)
        const vEdgeWallGeometry = new THREE.BoxGeometry(WALL_THICKNESS, wallHeight, TILE_SIZE); // Vertical wall (runs along Z axis)
        const edgeWallMaterial = new THREE.MeshStandardMaterial({
            color: 0xB8860B, // Dark yellow/gold color matching editor
            roughness: 0.7,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        // Stair materials
        const stairsDownMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.5 }); // Dark red for down
        const stairsUpMaterial = new THREE.MeshStandardMaterial({ color: 0x006400, roughness: 0.5 }); // Dark green for up
        const stairGeometry = new THREE.BoxGeometry(TILE_SIZE * 0.8, 0.3, TILE_SIZE * 0.8);
        
        // Special room materials (door frame on wall)
        const doorFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.6, metalness: 0.2 }); // Dark wood color
        const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8B008B, roughness: 0.3, metalness: 0.1 }); // Dark magenta for door
        const doorArchMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.55, metalness: 0.15 });
        const hiddenDoorArchMaterial = new THREE.MeshStandardMaterial({ color: 0xB8860B, roughness: 0.7, metalness: 0.1 });
        const oneWayDoorAccentPosMaterial = new THREE.MeshStandardMaterial({ color: 0x32CD32, roughness: 0.35, metalness: 0.25, emissive: 0x103010, emissiveIntensity: 0.2 });
        const oneWayDoorAccentNegMaterial = new THREE.MeshStandardMaterial({ color: 0xADFF2F, roughness: 0.35, metalness: 0.25, emissive: 0x203010, emissiveIntensity: 0.2 });
        
        // Track dungeon meshes for level switching
        let dungeonMeshes = [];
        
        // Add horizontal edge wall (on top edge of cell tx, ty)
        function addHEdgeWall(tx, ty) {
            const mesh = new THREE.Mesh(hEdgeWallGeometry, edgeWallMaterial);
            const worldX = (tx - MAP_WIDTH / 2) * TILE_SIZE + TILE_SIZE / 2;
            const worldZ = (ty - MAP_HEIGHT / 2) * TILE_SIZE; // Top edge of cell
            mesh.position.set(worldX, wallHeight / 2, worldZ);
            scene.add(mesh);
            dungeonMeshes.push(mesh);
        }
        
        // Add vertical edge wall (on left edge of cell tx, ty)
        function addVEdgeWall(tx, ty) {
            const mesh = new THREE.Mesh(vEdgeWallGeometry, edgeWallMaterial);
            const worldX = (tx - MAP_WIDTH / 2) * TILE_SIZE; // Left edge of cell
            const worldZ = (ty - MAP_HEIGHT / 2) * TILE_SIZE + TILE_SIZE / 2;
            mesh.position.set(worldX, wallHeight / 2, worldZ);
            scene.add(mesh);
            dungeonMeshes.push(mesh);
        }

        function getDoorMaterials(doorValue) {
            const frameMat = doorFrameMaterial;
            let archMat = doorArchMaterial;
            let accentMat = null;
            let showAccent = false;

            if (doorValue === 2) {
                archMat = hiddenDoorArchMaterial;
            } else if (doorValue === 3) {
                accentMat = oneWayDoorAccentPosMaterial;
                showAccent = true;
            } else if (doorValue === 4) {
                accentMat = oneWayDoorAccentNegMaterial;
                showAccent = true;
            }

            return { frameMat, archMat, accentMat, showAccent };
        }

        // Render a passable edge door with side posts and a curved arch on top.
        function addEdgeDoor(worldX, worldZ, axis, doorValue) {
            const openingWidth = TILE_SIZE * 0.62;
            const jambWidth = (TILE_SIZE - openingWidth) / 2;
            const frameHeight = wallHeight * 0.72;
            const archRadius = openingWidth / 2;
            const thickness = WALL_THICKNESS;
            const tubeRadius = 0.16;
            const materials = getDoorMaterials(doorValue);

            const jambGeo = axis === 'x'
                ? new THREE.BoxGeometry(jambWidth, frameHeight, thickness)
                : new THREE.BoxGeometry(thickness, frameHeight, jambWidth);

            const offset = openingWidth / 2 + jambWidth / 2;
            const leftJamb = new THREE.Mesh(jambGeo, materials.frameMat);
            const rightJamb = new THREE.Mesh(jambGeo, materials.frameMat);

            if (axis === 'x') {
                leftJamb.position.set(worldX - offset, frameHeight / 2, worldZ);
                rightJamb.position.set(worldX + offset, frameHeight / 2, worldZ);
            } else {
                leftJamb.position.set(worldX, frameHeight / 2, worldZ - offset);
                rightJamb.position.set(worldX, frameHeight / 2, worldZ + offset);
            }

            const archGeo = new THREE.TorusGeometry(archRadius, tubeRadius, 8, 24, Math.PI);
            const arch = new THREE.Mesh(archGeo, materials.archMat);
            arch.rotation.x = Math.PI / 2;
            if (axis === 'z') {
                arch.rotation.y = Math.PI / 2;
            }
            arch.position.set(worldX, frameHeight, worldZ);

            const keystoneGeo = new THREE.BoxGeometry(
                axis === 'x' ? openingWidth * 0.18 : thickness * 1.4,
                wallHeight * 0.12,
                axis === 'z' ? openingWidth * 0.18 : thickness * 1.4
            );
            const keystone = new THREE.Mesh(keystoneGeo, materials.archMat);
            keystone.position.set(worldX, frameHeight + archRadius * 0.55, worldZ);

            scene.add(leftJamb);
            scene.add(rightJamb);
            scene.add(arch);
            scene.add(keystone);
            dungeonMeshes.push(leftJamb, rightJamb, arch, keystone);

            if (materials.showAccent) {
                const accentGeo = new THREE.BoxGeometry(
                    axis === 'x' ? openingWidth * 0.55 : thickness * 0.8,
                    0.08,
                    axis === 'z' ? openingWidth * 0.55 : thickness * 0.8
                );
                const accent = new THREE.Mesh(accentGeo, materials.accentMat);
                accent.position.set(worldX, frameHeight * 0.35, worldZ);
                scene.add(accent);
                dungeonMeshes.push(accent);
            } else if (doorValue === 1) {
                const panelGeo = new THREE.BoxGeometry(
                    axis === 'x' ? openingWidth * 0.78 : thickness * 0.45,
                    frameHeight * 0.82,
                    axis === 'z' ? openingWidth * 0.78 : thickness * 0.45
                );
                const panel = new THREE.Mesh(panelGeo, doorMaterial);
                panel.position.set(worldX, frameHeight * 0.41, worldZ);
                scene.add(panel);
                dungeonMeshes.push(panel);
            }
        }

        function addHEdgeDoor(tx, ty, doorValue) {
            const worldX = (tx - MAP_WIDTH / 2) * TILE_SIZE + TILE_SIZE / 2;
            const worldZ = (ty - MAP_HEIGHT / 2) * TILE_SIZE;
            addEdgeDoor(worldX, worldZ, 'x', doorValue);
        }

        function addVEdgeDoor(tx, ty, doorValue) {
            const worldX = (tx - MAP_WIDTH / 2) * TILE_SIZE;
            const worldZ = (ty - MAP_HEIGHT / 2) * TILE_SIZE + TILE_SIZE / 2;
            addEdgeDoor(worldX, worldZ, 'z', doorValue);
        }
        
        function addWallTile(tx, ty) {
            const mesh = new THREE.Mesh(wallGeometry, wallMaterial);
            const worldX = (tx - MAP_WIDTH / 2) * TILE_SIZE + TILE_SIZE / 2;
            const worldZ = (ty - MAP_HEIGHT / 2) * TILE_SIZE + TILE_SIZE / 2;
            mesh.position.set(worldX, wallHeight / 2, worldZ);

            const edges = new THREE.LineSegments(wallEdgeGeometry, wallEdgeMaterial);
            edges.position.copy(mesh.position);
            edges.renderOrder = 1;

            scene.add(mesh);
            scene.add(edges);
            dungeonMeshes.push(mesh);
            dungeonMeshes.push(edges);
        }
        
        function addStairTile(tx, ty, isDown) {
            const material = isDown ? stairsDownMaterial : stairsUpMaterial;
            const mesh = new THREE.Mesh(stairGeometry, material);
            const worldX = (tx - MAP_WIDTH / 2) * TILE_SIZE + TILE_SIZE / 2;
            const worldZ = (ty - MAP_HEIGHT / 2) * TILE_SIZE + TILE_SIZE / 2;
            mesh.position.set(worldX, 0.15, worldZ);
            scene.add(mesh);
            dungeonMeshes.push(mesh);
            
            // Add arrow indicator
            const arrowGeo = new THREE.ConeGeometry(0.5, 1, 4);
            const arrowMesh = new THREE.Mesh(arrowGeo, material);
            arrowMesh.position.set(worldX, isDown ? 0.5 : 1.5, worldZ);
            arrowMesh.rotation.x = isDown ? Math.PI : 0; // Point down or up
            scene.add(arrowMesh);
            dungeonMeshes.push(arrowMesh);
        }
        
        function addSpecialRoomTile(tx, ty, entranceDir) {
            const worldX = (tx - MAP_WIDTH / 2) * TILE_SIZE + TILE_SIZE / 2;
            const worldZ = (ty - MAP_HEIGHT / 2) * TILE_SIZE + TILE_SIZE / 2;
            
            // Add wall (special rooms are inside walls)
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
            wallMesh.position.set(worldX, wallHeight / 2, worldZ);
            scene.add(wallMesh);
            dungeonMeshes.push(wallMesh);

            // Guild entrance uses the same arched door style as edge doors.
            if (entranceDir === 'N') {
                addHEdgeDoor(tx, ty, 1);
            } else if (entranceDir === 'S') {
                addHEdgeDoor(tx, ty + 1, 1);
            } else if (entranceDir === 'E') {
                addVEdgeDoor(tx + 1, ty, 1);
            } else if (entranceDir === 'W') {
                addVEdgeDoor(tx, ty, 1);
            }
        }
        
        function buildLevel(level) {
            // Clear existing meshes
            for (const mesh of dungeonMeshes) {
                scene.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
            }
            dungeonMeshes = [];
            
            const map = dungeonLevels[level];
            
            // Render tiles (stairs, special rooms, and tile-based walls if not using edge walls)
            for (let y = 0; y < MAP_HEIGHT; y++) {
                for (let x = 0; x < MAP_WIDTH; x++) {
                    const tile = map[y][x];
                    if (tile === WALL && !useEdgeWalls) {
                        addWallTile(x, y);
                    } else if (tile === STAIRS_DOWN) {
                        addStairTile(x, y, true);
                    } else if (tile === STAIRS_UP) {
                        addStairTile(x, y, false);
                    } else if (tile === SPECIAL_ROOM_N) {
                        addSpecialRoomTile(x, y, 'N');
                    } else if (tile === SPECIAL_ROOM_E) {
                        addSpecialRoomTile(x, y, 'E');
                    } else if (tile === SPECIAL_ROOM_S) {
                        addSpecialRoomTile(x, y, 'S');
                    } else if (tile === SPECIAL_ROOM_W) {
                        addSpecialRoomTile(x, y, 'W');
                    }
                }
            }
            
            // Render edge-based walls if using edge walls
            if (useEdgeWalls) {
                // Horizontal walls
                for (let y = 0; y <= MAP_HEIGHT; y++) {
                    for (let x = 0; x < MAP_WIDTH; x++) {
                        if (hWalls[level][y] && hWalls[level][y][x] &&
                            !(hDoors[level][y] && hDoors[level][y][x] > 0)) {
                            addHEdgeWall(x, y);
                        }
                        // Doors render as arched openings instead of solid walls
                        if (hDoors[level][y] && hDoors[level][y][x] > 0) {
                            addHEdgeDoor(x, y, hDoors[level][y][x]);
                        }
                    }
                }
                // Vertical walls
                for (let y = 0; y < MAP_HEIGHT; y++) {
                    for (let x = 0; x <= MAP_WIDTH; x++) {
                        if (vWalls[level][y] && vWalls[level][y][x] &&
                            !(vDoors[level][y] && vDoors[level][y][x] > 0)) {
                            addVEdgeWall(x, y);
                        }
                        // Doors render as arched openings instead of solid walls
                        if (vDoors[level][y] && vDoors[level][y][x] > 0) {
                            addVEdgeDoor(x, y, vDoors[level][y][x]);
                        }
                    }
                }
            }
        }
        
        // Build initial level
        buildLevel(currentLevel);

        // Tile helpers for collision
        function worldToTile(x, z) {
            const tx = Math.floor(x / TILE_SIZE + MAP_WIDTH / 2);
            const ty = Math.floor(z / TILE_SIZE + MAP_HEIGHT / 2);
            return { tx, ty };
        }

        function isWalkable(tx, ty) {
            if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) {
                return false;
            }
            const tile = dungeonLevels[currentLevel][ty][tx];
            // With edge-based walls, ALL tiles are walkable - walls are edges, not tile types
            // Only special rooms block based on tile type
            if (useEdgeWalls) {
                // Special rooms are not walkable (must enter through proper entrance)
                if (tile === SPECIAL_ROOM_N || tile === SPECIAL_ROOM_E || 
                    tile === SPECIAL_ROOM_S || tile === SPECIAL_ROOM_W) {
                    return false;
                }
                // All other tiles are walkable when using edge-based walls
                return true;
            }
            return tile === FLOOR || tile === STAIRS_DOWN || tile === STAIRS_UP;
        }
        
        // Check if a door edge allows passage in a given direction
        // doorValue: 0=none, 1=normal, 2=hidden, 3=one-way positive (S/E), 4=one-way negative (N/W)
        // isPositiveDir: true if moving in positive direction (south for h-edges, east for v-edges)
        function isDoorPassable(doorValue, isPositiveDir) {
            if (doorValue === 0) return false; // No door
            if (doorValue === 1 || doorValue === 2) return true; // Normal or hidden = passable both ways
            if (doorValue === 3) return isPositiveDir;  // One-way positive: only pass going S/E
            if (doorValue === 4) return !isPositiveDir; // One-way negative: only pass going N/W
            return false;
        }
        
        // Check if an edge blocks movement: returns true if blocked
        // hasWall: boolean, doorValue: int, isPositiveDir: movement direction
        function isEdgeBlocked(hasWall, doorValue, isPositiveDir) {
            if (doorValue > 0) return !isDoorPassable(doorValue, isPositiveDir); // Door overrides wall at same edge
            if (hasWall) return true;
            return false; // No wall or door = open
        }

        // Doors and walls share the same edge slot; keep only one active.
        function normalizeWallDoorExclusivity() {
            if (!useEdgeWalls) return;

            for (let level = 0; level < NUM_LEVELS; level++) {
                for (let y = 0; y <= MAP_HEIGHT; y++) {
                    for (let x = 0; x < MAP_WIDTH; x++) {
                        if (hDoors[level][y] && hDoors[level][y][x] > 0) {
                            hWalls[level][y][x] = false;
                        }
                    }
                }
                for (let y = 0; y < MAP_HEIGHT; y++) {
                    for (let x = 0; x <= MAP_WIDTH; x++) {
                        if (vDoors[level][y] && vDoors[level][y][x] > 0) {
                            vWalls[level][y][x] = false;
                        }
                    }
                }
            }
        }
        
        // Check if there's a wall edge between two adjacent cells
        function hasWallBetween(fromTx, fromTy, toTx, toTy) {
            if (!useEdgeWalls) return false;
            
            const dx = toTx - fromTx;
            const dy = toTy - fromTy;
            
            // Moving north (negative Y in map coords) = negative direction for h-edges
            if (dy < 0) {
                if (fromTy >= 0 && fromTy <= MAP_HEIGHT && fromTx >= 0 && fromTx < MAP_WIDTH) {
                    const wall = hWalls[currentLevel][fromTy] && hWalls[currentLevel][fromTy][fromTx];
                    const door = hDoors[currentLevel][fromTy] ? hDoors[currentLevel][fromTy][fromTx] : 0;
                    return isEdgeBlocked(wall, door, false); // north = negative direction
                }
                return true;
            }
            // Moving south (positive Y) = positive direction for h-edges
            if (dy > 0) {
                if (toTy >= 0 && toTy <= MAP_HEIGHT && toTx >= 0 && toTx < MAP_WIDTH) {
                    const wall = hWalls[currentLevel][toTy] && hWalls[currentLevel][toTy][toTx];
                    const door = hDoors[currentLevel][toTy] ? hDoors[currentLevel][toTy][toTx] : 0;
                    return isEdgeBlocked(wall, door, true); // south = positive direction
                }
                return true;
            }
            // Moving west (negative X) = negative direction for v-edges
            if (dx < 0) {
                if (fromTy >= 0 && fromTy < MAP_HEIGHT && fromTx >= 0 && fromTx <= MAP_WIDTH) {
                    const wall = vWalls[currentLevel][fromTy] && vWalls[currentLevel][fromTy][fromTx];
                    const door = vDoors[currentLevel][fromTy] ? vDoors[currentLevel][fromTy][fromTx] : 0;
                    return isEdgeBlocked(wall, door, false); // west = negative direction
                }
                return true;
            }
            // Moving east (positive X) = positive direction for v-edges
            if (dx > 0) {
                if (toTy >= 0 && toTy < MAP_HEIGHT && toTx >= 0 && toTx <= MAP_WIDTH) {
                    const wall = vWalls[currentLevel][toTy] && vWalls[currentLevel][toTy][toTx];
                    const door = vDoors[currentLevel][toTy] ? vDoors[currentLevel][toTy][toTx] : 0;
                    return isEdgeBlocked(wall, door, true); // east = positive direction
                }
                return true;
            }
            
            return false;
        }
        
        // Check wall collision at a world position with buffer
        // Doors are passable so we need to check both walls and doors
        function checkEdgeWallCollision(worldX, worldZ, buffer) {
            if (!useEdgeWalls) return false;
            
            const { tx, ty } = worldToTile(worldX, worldZ);
            if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return true;
            
            // Get position within tile (0 to TILE_SIZE)
            const tileStartX = (tx - MAP_WIDTH / 2) * TILE_SIZE;
            const tileStartZ = (ty - MAP_HEIGHT / 2) * TILE_SIZE;
            const localX = worldX - tileStartX;
            const localZ = worldZ - tileStartZ;
            
            // Check if too close to an edge that has a wall (not a door)
            // Top edge (low Z within tile) - approaching from south = negative direction
            if (localZ < buffer && ty >= 0) {
                const wall = hWalls[currentLevel][ty] && hWalls[currentLevel][ty][tx];
                const door = hDoors[currentLevel][ty] ? hDoors[currentLevel][ty][tx] : 0;
                if (isEdgeBlocked(wall, door, false)) return true; // Moving north through top edge
            }
            // Bottom edge (high Z within tile) - approaching from north = positive direction
            if (localZ > TILE_SIZE - buffer && ty + 1 <= MAP_HEIGHT) {
                const wall = hWalls[currentLevel][ty + 1] && hWalls[currentLevel][ty + 1][tx];
                const door = hDoors[currentLevel][ty + 1] ? hDoors[currentLevel][ty + 1][tx] : 0;
                if (isEdgeBlocked(wall, door, true)) return true; // Moving south through bottom edge
            }
            // Left edge (low X within tile) - approaching from east = negative direction
            if (localX < buffer && tx >= 0) {
                const wall = vWalls[currentLevel][ty] && vWalls[currentLevel][ty][tx];
                const door = vDoors[currentLevel][ty] ? vDoors[currentLevel][ty][tx] : 0;
                if (isEdgeBlocked(wall, door, false)) return true; // Moving west through left edge
            }
            // Right edge (high X within tile) - approaching from west = positive direction
            if (localX > TILE_SIZE - buffer && tx + 1 <= MAP_WIDTH) {
                const wall = vWalls[currentLevel][ty] && vWalls[currentLevel][ty][tx + 1];
                const door = vDoors[currentLevel][ty] ? vDoors[currentLevel][ty][tx + 1] : 0;
                if (isEdgeBlocked(wall, door, true)) return true; // Moving east through right edge
            }
            
            return false;
        }
        
        function isSpecialRoom(tx, ty) {
            if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) {
                return false;
            }
            const tile = dungeonLevels[currentLevel][ty][tx];
            return tile === SPECIAL_ROOM_N || tile === SPECIAL_ROOM_E || 
                   tile === SPECIAL_ROOM_S || tile === SPECIAL_ROOM_W;
        }
        
        function getSpecialRoomEntrance(tx, ty) {
            const tile = dungeonLevels[currentLevel][ty][tx];
            if (tile === SPECIAL_ROOM_N) return 'N';
            if (tile === SPECIAL_ROOM_E) return 'E';
            if (tile === SPECIAL_ROOM_S) return 'S';
            if (tile === SPECIAL_ROOM_W) return 'W';
            return null;
        }
        
        function getTileType(tx, ty) {
            if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) {
                return WALL;
            }
            return dungeonLevels[currentLevel][ty][tx];
        }
        
        // Clear walls around a tile to ensure player can move (used at stairs)
        function clearWallsAroundTile(tx, ty) {
            if (!useEdgeWalls) return;
            if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return;
            
            // Clear horizontal walls (top and bottom of tile)
            if (hWalls[currentLevel][ty]) hWalls[currentLevel][ty][tx] = false;
            if (ty + 1 <= MAP_HEIGHT && hWalls[currentLevel][ty + 1]) hWalls[currentLevel][ty + 1][tx] = false;
            
            // Clear vertical walls (left and right of tile)
            if (vWalls[currentLevel][ty]) vWalls[currentLevel][ty][tx] = false;
            if (tx + 1 <= MAP_WIDTH && vWalls[currentLevel][ty]) vWalls[currentLevel][ty][tx + 1] = false;
            
            console.log('Cleared walls around tile', tx, ty, 'on level', currentLevel);
        }
        
        // Convert wall tiles around a position to floor tiles (used at stairs to ensure movement)
        function clearAreaAroundStairs(tx, ty) {
            // Convert tiles in a 7x7 area (radius 3) around the stairs to floor tiles
            const radius = 3;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = tx + dx;
                    const ny = ty + dy;
                    
                    // Check bounds
                    if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue;
                    
                    // Only convert WALL tiles to FLOOR, leave stairs and special rooms alone
                    if (dungeonLevels[currentLevel][ny][nx] === WALL) {
                        dungeonLevels[currentLevel][ny][nx] = FLOOR;
                        logToFile(`[STAIR] Converted wall at (${nx}, ${ny}) to floor on level ${currentLevel}`);
                    }
                }
            }
            
            // Also clear wall segments around the expanded area
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    clearWallsAroundTile(tx + dx, ty + dy);
                }
            }
        }
        
        // Level transition
        function changeLevel(newLevel) {
            if (newLevel < 0 || newLevel >= NUM_LEVELS) {
                logToFile(`[STAIR] Invalid level change: ${currentLevel} -> ${newLevel}`);
                return;
            }
            
            const oldLevel = currentLevel;
            const playerTile = worldToTile(camera.position.x, camera.position.z);
            
            logToFile(`[STAIR] LEVEL TRANSITION: ${oldLevel} -> ${newLevel}`);
            logToFile(`[STAIR] Player position before change: (${camera.position.x.toFixed(2)}, ${camera.position.z.toFixed(2)})`);
            logToFile(`[STAIR] Player tile before change: (${playerTile.tx}, ${playerTile.ty})`);
            
            currentLevel = newLevel;
            
            buildLevel(currentLevel);
            
            // Log wall count for debugging
            let wallCount = 0;
            for (let y = 0; y <= MAP_HEIGHT; y++) {
                for (let x = 0; x < MAP_WIDTH; x++) {
                    if (hWalls[currentLevel][y] && hWalls[currentLevel][y][x]) wallCount++;
                }
            }
            for (let y = 0; y < MAP_HEIGHT; y++) {
                for (let x = 0; x <= MAP_WIDTH; x++) {
                    if (vWalls[currentLevel][y] && vWalls[currentLevel][y][x]) wallCount++;
                }
            }
            logToFile(`[STAIR] Level ${currentLevel} has ${wallCount} wall segments`);
            logToFile(`[STAIR] Player position after change: (${camera.position.x.toFixed(2)}, ${camera.position.z.toFixed(2)})`);
            
            // Check if player position is walkable
            const newTile = worldToTile(camera.position.x, camera.position.z);
            const tileType = getTileType(newTile.tx, newTile.ty);
            const isWalkableCheck = tileType === FLOOR || tileType === STAIRS_DOWN || tileType === STAIRS_UP;
            
            logToFile(`[STAIR] Player tile after change: (${newTile.tx}, ${newTile.ty})`);
            logToFile(`[STAIR] Tile type: ${tileType}, isWalkable: ${isWalkableCheck}`);
            
            updateHUD();
        }

        const hitFlash = document.getElementById('hit-flash');

        function triggerHitFlash() {
            if (!hitFlash) return;
            hitFlash.style.opacity = '0.8';
            if (hitFlash._timeoutId) {
                clearTimeout(hitFlash._timeoutId);
            }
            hitFlash._timeoutId = setTimeout(() => {
                hitFlash.style.opacity = '0';
            }, 100);
        }

        // Player Stats
        const MAX_STAT = 255;  // Maximum value for any stat
        const BASE_XP_THRESHOLD = 1000;  // XP needed for level 1
        
        const player = {
            name: 'Adventurer',
            level: 0,  // Start at level 0, level up to 1 at 1000 XP
            hitpoints: 0,
            experience: 0,
            gold: 100, // Starting gold
            stats: {
                Stamina: 0,
                Charisma: 0,
                Strength: 0,
                Intelligence: 0,
                Wisdom: 0,
                Skill: 0,
                Speed: 0
            },
            baseStats: {  // Base stats before equipment bonuses
                Stamina: 0,
                Charisma: 0,
                Strength: 0,
                Intelligence: 0,
                Wisdom: 0,
                Skill: 0,
                Speed: 0
            },
            groundItems: {}, // Keyed by "tx,ty" tile coordinates
            inventory: [
                { name: 'Compass', count: 1, equipped: true },
                { name: 'Timepiece', count: 1, equipped: true },
                { name: 'Food', count: 0 },
                { name: 'Torches', count: 0 },
                { name: 'Flasks', count: 0 }
            ],
            primaryWeapon: null,    // Primary weapon used for attack
            secondaryWeapon: null,  // Secondary weapon used for defense only
            equippedClothing: {     // Clothing equipped to body parts
                Head: null,
                Hands: null,
                Arms: null,
                Body: null,
                Legs: null,
                Feet: null
            },
            temporaryEffects: {     // Active temporary potion effects
                Strength: { active: false, duration: 0 },
                Intelligence: { active: false, duration: 0 },
                Skill: { active: false, duration: 0 },
                Stamina: { active: false, duration: 0 },
                Charisma: { active: false, duration: 0 },
                Wisdom: { active: false, duration: 0 },
                Speed: { active: false, duration: 0 },
                invisibility: { active: false, duration: 0 }
            },
            showInventory: false,
            showLoseMode: false,
            showGetMode: false,
            showNothingToGrab: false,
            getItemIndex: 0,
            showWeaponEquipMode: false,  // Show primary/secondary choice for weapon
            weaponToEquip: null,         // The weapon being equipped
            showClothingEquipMode: false, // Show body part choice for clothing
            clothingToEquip: null,       // The clothing being equipped
            // Battle state
            inBattle: false,
            currentMonster: null,
            battleOption: 0,
            // Special room state
            inSpecialRoom: false,
            currentSpecialRoom: null, // { tx, ty, entrance }
            // Guild system
            currentGuild: null,
            guildReputation: {
                'Fighters': 0, 'Mages': 0, 'Thieves': 0, 'Clerics': 0, 'Rangers': 0
            },
            guildRank: 0,
            completedQuests: [],
            // Game progression
            dungeonDepth: 0,
            hasDefeatedFinalBoss: false,
            monstersDefeated: 0,
            bossesDefeated: 0
        };

        // Helper function to check if any interaction menu is open
        function isInteractionMenuOpen() {
            return player.showInventory || player.showLoseMode || player.showGetMode || 
                   player.showUseMode || player.showWeaponEquipMode || player.showClothingEquipMode ||
                   player.inSpecialRoom;
        }

        // ===== GUILD SYSTEM =====
        const guilds = {
            'Fighters': {
                name: 'Warriors Guild',
                statBonus: 'Strength',
                ranks: ['Recruit', 'Fighter', 'Warrior', 'Champion', 'Guildmaster'],
                benefits: {
                    1: { desc: '+2 Strength, 5% discount at smiths', strBonus: 2, discount: 0.05 },
                    2: { desc: '+4 Strength, 10% discount, Quest: Slay 10 monsters', strBonus: 4, discount: 0.10, questReq: 10 },
                    3: { desc: '+6 Strength, 15% discount, +5 HP regen/rest', strBonus: 6, discount: 0.15, healBonus: 5 },
                    4: { desc: '+10 Strength, 20% discount, Quest: Defeat a Boss', strBonus: 10, discount: 0.20, bossReq: true },
                    5: { desc: '+15 Strength, 25% discount, +10 HP regen, Free repairs', strBonus: 15, discount: 0.25, healBonus: 10, freeRepair: true }
                },
                joinReq: { stat: 'Strength', min: 12 }
            },
            'Mages': {
                name: 'Mages Guild',
                statBonus: 'Intelligence',
                ranks: ['Apprentice', 'Adept', 'Mage', 'Archmage', 'Grand Archmage'],
                benefits: {
                    1: { desc: '+2 Intelligence, Magic items 10% cheaper', intBonus: 2, magicDiscount: 0.10 },
                    2: { desc: '+4 Intelligence, 15% magic discount, +2 Wisdom', intBonus: 4, wisBonus: 2, magicDiscount: 0.15 },
                    3: { desc: '+6 Intelligence, +4 Wisdom, Identify magical items', intBonus: 6, wisBonus: 4, identify: true },
                    4: { desc: '+10 Intelligence, +6 Wisdom, Create magic scrolls', intBonus: 10, wisBonus: 6, scrolls: true },
                    5: { desc: '+15 Intelligence, +10 Wisdom, Teleport ability', intBonus: 15, wisBonus: 10, teleport: true }
                },
                joinReq: { stat: 'Intelligence', min: 13 }
            },
            'Thieves': {
                name: 'Thieves Guild',
                statBonus: 'Skill',
                ranks: ['Cutpurse', 'Thief', 'Rogue', 'Master Thief', 'Guildmaster'],
                benefits: {
                    1: { desc: '+2 Skill, +2 Speed, Steal from monsters', sklBonus: 2, spdBonus: 2, steal: true },
                    2: { desc: '+4 Skill, +4 Speed, Better steal chance', sklBonus: 4, spdBonus: 4, stealBonus: 0.15 },
                    3: { desc: '+6 Skill, +6 Speed, Disarm traps', sklBonus: 6, spdBonus: 6, trapDisarm: true },
                    4: { desc: '+8 Skill, +8 Speed, Backstab damage x2', sklBonus: 8, spdBonus: 8, backstab: 2.0 },
                    5: { desc: '+12 Skill, +12 Speed, Shadow Step (flee 90%)', sklBonus: 12, spdBonus: 12, shadowStep: 0.90 }
                },
                joinReq: { stat: 'Skill', min: 11 }
            },
            'Clerics': {
                name: 'Clerics Guild',
                statBonus: 'Wisdom',
                ranks: ['Acolyte', 'Priest', 'Cleric', 'High Priest', 'Patriarch'],
                benefits: {
                    1: { desc: '+2 Wisdom, +5 HP regen at inns', wisBonus: 2, innHeal: 5 },
                    2: { desc: '+4 Wisdom, +10 HP regen, Cure disease', wisBonus: 4, innHeal: 10, cure: true },
                    3: { desc: '+6 Wisdom, +15 HP regen, Bless (+10% hit)', wisBonus: 6, innHeal: 15, bless: 0.10 },
                    4: { desc: '+8 Wisdom, +20 HP regen, Turn undead', wisBonus: 8, innHeal: 20, turnUndead: true },
                    5: { desc: '+12 Wisdom, Full heal at inns, Resurrection', wisBonus: 12, fullHeal: true, resurrect: true }
                },
                joinReq: { stat: 'Wisdom', min: 12 }
            },
            'Rangers': {
                name: 'Rangers Guild',
                statBonus: 'Speed',
                ranks: ['Scout', 'Tracker', 'Ranger', 'Master Ranger', 'Ranger Lord'],
                benefits: {
                    1: { desc: '+2 Speed, +2 Skill, Avoid ambush 30%', spdBonus: 2, sklBonus: 2, avoidAmbush: 0.30 },
                    2: { desc: '+4 Speed, +4 Skill, Track monsters', spdBonus: 4, sklBonus: 4, track: true },
                    3: { desc: '+6 Speed, +6 Skill, Avoid ambush 60%', spdBonus: 6, sklBonus: 6, avoidAmbush: 0.60 },
                    4: { desc: '+8 Speed, +8 Skill, Double shot (bow)', spdBonus: 8, sklBonus: 8, doubleShot: true },
                    5: { desc: '+12 Speed, +12 Skill, Avoid ambush 90%', spdBonus: 12, sklBonus: 12, avoidAmbush: 0.90 }
                },
                joinReq: { stat: 'Speed', min: 11 }
            }
        };

        // ===== SHOP SYSTEM =====
        const shops = {
            weapons: [
                { name: 'Dagger', price: 50, attack: 10, defense: 2 },
                { name: 'Short Sword', price: 100, attack: 15, defense: 5 },
                { name: 'Sword', price: 200, attack: 25, defense: 8 },
                { name: 'Axe', price: 250, attack: 30, defense: 5 },
                { name: 'Mace', price: 180, attack: 22, defense: 10 },
                { name: 'Spear', price: 220, attack: 28, defense: 7 },
                { name: 'Bow', price: 150, attack: 20, defense: 3 },
                { name: 'Shield', price: 120, attack: 5, defense: 20 }
            ],
            armor: [
                { name: 'Leather Armor', price: 100, defense: 10, slot: 'Body' },
                { name: 'Chain Mail', price: 300, defense: 25, slot: 'Body' },
                { name: 'Plate Armor', price: 600, defense: 45, slot: 'Body' },
                { name: 'Iron Helm', price: 80, defense: 8, slot: 'Head' },
                { name: 'Steel Helm', price: 150, defense: 15, slot: 'Head' },
                { name: 'Leather Boots', price: 50, defense: 5, slot: 'Feet' },
                { name: 'Iron Greaves', price: 100, defense: 12, slot: 'Legs' }
            ],
            potions: [
                { name: 'Minor Healing Potion', price: 25, heal: 20 },
                { name: 'Healing Potion', price: 50, heal: 50 },
                { name: 'Greater Healing Potion', price: 100, heal: 100 },
                { name: 'Strength Potion', price: 75, buff: 'Strength', amount: 10, duration: 60 },
                { name: 'Speed Potion', price: 75, buff: 'Speed', amount: 10, duration: 60 },
                { name: 'Antidote', price: 40, cures: 'poison' }
            ],
            supplies: [
                { name: 'Food', price: 5, restores: 'hunger' },
                { name: 'Water Flask', price: 3, restores: 'thirst' },
                { name: 'Torch', price: 10, provides: 'light' },
                { name: 'Rope', price: 15, tool: true },
                { name: 'Lockpicks', price: 30, tool: true }
            ]
        };

        // ===== INN SYSTEM =====
        const innServices = {
            'Poor Room': { cost: 10, healPercent: 0.30, riskAmbush: 0.15, riskTheft: 0.10, riskDisease: 0.05 },
            'Common Room': { cost: 25, healPercent: 0.50, riskAmbush: 0.08, riskTheft: 0.05, riskDisease: 0.02 },
            'Private Room': { cost: 50, healPercent: 0.75, riskAmbush: 0.03, riskTheft: 0.02, riskDisease: 0 },
            'Luxury Suite': { cost: 100, healPercent: 1.0, riskAmbush: 0, riskTheft: 0, riskDisease: 0, bonusXP: 50 }
        };

        // ===== BOSS SYSTEM =====
        const bossMonsters = [
            { 
                name: 'Orc Warlord', level: 5, floor: 0, hitpoints: 150, attack: 35, defense: 20, 
                exp: 250, gold: 200, 
                abilities: ['Rage (doubles attack for 2 turns)', 'War Cry (reduces player defense)'],
                loot: ['Orcish Blade', 'Warlord Helm', 'Gold x200']
            },
            { 
                name: 'Necromancer', level: 10, floor: 1, hitpoints: 180, attack: 45, defense: 25, 
                exp: 500, gold: 400,
                abilities: ['Drain Life (steals HP)', 'Summon Skeleton', 'Dark Bolt'],
                loot: ['Staff of Necromancy', 'Robes of the Dead', 'Necronomicon']
            },
            { 
                name: 'Dragon Wyrmling', level: 15, floor: 2, hitpoints: 300, attack: 60, defense: 40, 
                exp: 1000, gold: 800,
                abilities: ['Fire Breath (AOE)', 'Wing Buffet (knockback)', 'Tail Swipe'],
                loot: ['Dragon Scale Armor', 'Flame Sword', 'Dragon Hoard (Gold x800)']
            },
            { 
                name: 'The Dark One', level: 20, floor: 3, hitpoints: 500, attack: 80, defense: 60, 
                exp: 5000, gold: 2000,
                abilities: ['Shadow Strike', 'Life Drain', 'Darkness (blind)', 'Teleport'],
                loot: ['Blade of Shadows', 'Crown of Darkness', 'Amulet of Power'],
                finalBoss: true
            }
        ];

        // Track boss defeats per floor
        const bossDefeated = { 0: false, 1: false, 2: false, 3: false };

        // Monster definitions (simplified for JS)
        const monsterList = [
            // Weak (Level 1-5)
            { name: 'Giant Rat', level: 1, hitpoints: 8, attack: 5, defense: 2, exp: 10, gold: 2 },
            { name: 'Cave Bat', level: 1, hitpoints: 6, attack: 4, defense: 1, exp: 8, gold: 1 },
            { name: 'Slime', level: 2, hitpoints: 12, attack: 6, defense: 3, exp: 15, gold: 3 },
            { name: 'Goblin', level: 2, hitpoints: 15, attack: 8, defense: 4, exp: 20, gold: 5 },
            { name: 'Skeleton', level: 3, hitpoints: 18, attack: 10, defense: 5, exp: 25, gold: 8 },
            { name: 'Giant Spider', level: 3, hitpoints: 20, attack: 12, defense: 4, exp: 30, gold: 10 },
            { name: 'Zombie', level: 4, hitpoints: 25, attack: 10, defense: 8, exp: 35, gold: 12 },
            { name: 'Kobold', level: 4, hitpoints: 22, attack: 14, defense: 6, exp: 40, gold: 15 },
            { name: 'Giant Centipede', level: 5, hitpoints: 28, attack: 16, defense: 7, exp: 45, gold: 18 },
            { name: 'Ghoul', level: 5, hitpoints: 32, attack: 18, defense: 10, exp: 55, gold: 22 },
            // Moderate (Level 6-10)
            { name: 'Orc Warrior', level: 6, hitpoints: 40, attack: 22, defense: 12, exp: 70, gold: 30 },
            { name: 'Hobgoblin', level: 6, hitpoints: 38, attack: 20, defense: 14, exp: 65, gold: 28 },
            { name: 'Harpy', level: 7, hitpoints: 35, attack: 24, defense: 10, exp: 80, gold: 35 },
            { name: 'Wererat', level: 7, hitpoints: 42, attack: 26, defense: 15, exp: 85, gold: 40 },
            { name: 'Shadow', level: 8, hitpoints: 45, attack: 28, defense: 8, exp: 95, gold: 45 },
            { name: 'Wight', level: 8, hitpoints: 50, attack: 30, defense: 18, exp: 100, gold: 50 },
            { name: 'Ogre', level: 9, hitpoints: 65, attack: 35, defense: 20, exp: 120, gold: 60 },
            { name: 'Gargoyle', level: 9, hitpoints: 55, attack: 32, defense: 25, exp: 115, gold: 55 },
            { name: 'Wraith', level: 10, hitpoints: 60, attack: 38, defense: 15, exp: 140, gold: 70 },
            { name: 'Troll', level: 10, hitpoints: 80, attack: 40, defense: 22, exp: 150, gold: 75 },
            // Strong (Level 11-20)
            { name: 'Minotaur', level: 11, hitpoints: 90, attack: 45, defense: 28, exp: 180, gold: 90 },
            { name: 'Basilisk', level: 12, hitpoints: 85, attack: 48, defense: 30, exp: 200, gold: 100 },
            { name: 'Manticore', level: 12, hitpoints: 95, attack: 50, defense: 26, exp: 210, gold: 105 },
            { name: 'Medusa', level: 13, hitpoints: 88, attack: 52, defense: 24, exp: 230, gold: 115 },
            { name: 'Vampire', level: 14, hitpoints: 100, attack: 55, defense: 32, exp: 260, gold: 130 },
            { name: 'Stone Golem', level: 15, hitpoints: 120, attack: 58, defense: 45, exp: 280, gold: 140 },
            { name: 'Chimera', level: 16, hitpoints: 130, attack: 62, defense: 35, exp: 320, gold: 160 },
            { name: 'Hydra', level: 17, hitpoints: 150, attack: 65, defense: 38, exp: 360, gold: 180 },
            { name: 'Beholder', level: 18, hitpoints: 140, attack: 70, defense: 30, exp: 400, gold: 200 },
            { name: 'Death Knight', level: 20, hitpoints: 160, attack: 75, defense: 50, exp: 500, gold: 250 }
        ];

        const clothingItems = [
            // HEAD CLOTHING
            "Woolen Hat", "Leather Helm", "Silk Hood", "Wizard's Cap", "Crown of Speed",
            "Mask of Stealth", "Hood of Shadows", "Circlet of Wisdom", "Helm of Courage", "Tiara of Luck",
            // HANDS CLOTHING
            "Cotton Gloves", "Leather Gloves", "Silk Gloves", "Gauntlets of Strength", "Gloves of Dexterity",
            "Bracers of Defense", "Gloves of Healing", "Cursed Gauntlets", "Gloves of Fire", "Frost Bracers",
            // ARMS CLOTHING
            "Linen Sleeves", "Leather Sleeves", "Silk Sleeves", "Bracers of Power", "Sleeves of Accuracy",
            "Arm Guards of Protection", "Healing Bracers", "Flame Sleeves", "Ice Bracers", "Poisoner's Sleeves",
            // BODY CLOTHING
            "Cotton Shirt", "Leather Vest", "Silk Robe", "Robe of the Mage", "Vest of Swiftness",
            "Shadow Cloak", "Cloak of Invisibility", "Tunic of Wisdom", "Robe of Courage", "Lucky Tunic",
            // LEGS CLOTHING
            "Cotton Pants", "Leather Pants", "Silk Trousers", "Greaves of Might", "Pants of Agility",
            "Leg Guards of Steel", "Regenerative Greaves", "Flame Leggings", "Frost Pants", "Anti-Venom Greaves",
            // FEET CLOTHING
            "Cotton Shoes", "Leather Boots", "Silk Slippers", "Boots of Speed", "Stealth Boots",
            "Armored Boots", "Healing Sandals", "Fire Boots", "Ice Boots", "Poison Ward Boots"
        ];

        const armorItems = [
            // HEAD ARMOR
            "Iron Helm", "Steel Helm", "Mithril Helm", "Helm of Fire Protection", "Frost Crown",
            "Helm of Clarity", "Crown of Regeneration", "Speed Helm", "Wise Helm", "Lucky Helm",
            // HANDS ARMOR
            "Iron Gauntlets", "Steel Gauntlets", "Mithril Gauntlets", "Flame Gauntlets", "Ice Gauntlets",
            "Pure Gauntlets", "Vital Gauntlets", "Swift Gauntlets", "Arcane Gauntlets", "Fortunate Gauntlets",
            // ARMS ARMOR
            "Iron Bracers", "Steel Bracers", "Mithril Bracers", "Fire Bracers", "Frost Bracers",
            "Clean Bracers", "Life Bracers", "Quick Bracers", "Mystic Bracers", "Blessed Bracers",
            // BODY ARMOR
            "Chain Mail", "Plate Armor", "Mithril Armor", "Dragon Scale Armor", "Ice Crystal Armor",
            "Blessed Chain Mail", "Living Armor", "Wind Walker Armor", "Mage's Robes", "Hero's Plate",
            // LEGS ARMOR
            "Iron Greaves", "Steel Greaves", "Mithril Greaves", "Flame Greaves", "Frost Greaves",
            "Pure Greaves", "Vital Greaves", "Swift Greaves", "Arcane Greaves", "Fortunate Greaves",
            // FEET ARMOR
            "Iron Boots", "Steel Boots", "Mithril Boots", "Fire Boots", "Ice Boots",
            "Clean Boots", "Life Boots", "Quick Boots", "Mystic Boots", "Blessed Boots"
        ];

        // Body parts for clothing - each can only have 1 piece equipped
        const bodyParts = [
            "Head",      // Woolen Hat, Leather Helm
            "Hands",     // Gloves
            "Arms",      // Sleeves
            "Body",      // Leather Armor, Cloak
            "Legs",      // Pants, Leggings
            "Feet"       // Leather Boots, Shoes
        ];

        // Map clothing items to body parts (includes both clothing and armor)
        const clothingBodyPartMap = {
            // HEAD CLOTHING & ARMOR
            "Woolen Hat": "Head", "Leather Helm": "Head", "Silk Hood": "Head", "Wizard's Cap": "Head", "Crown of Speed": "Head",
            "Mask of Stealth": "Head", "Hood of Shadows": "Head", "Circlet of Wisdom": "Head", "Helm of Courage": "Head", "Tiara of Luck": "Head",
            "Iron Helm": "Head", "Steel Helm": "Head", "Mithril Helm": "Head", "Helm of Fire Protection": "Head", "Frost Crown": "Head",
            "Helm of Clarity": "Head", "Crown of Regeneration": "Head", "Speed Helm": "Head", "Wise Helm": "Head", "Lucky Helm": "Head",
            // HANDS CLOTHING & ARMOR
            "Cotton Gloves": "Hands", "Leather Gloves": "Hands", "Silk Gloves": "Hands", "Gauntlets of Strength": "Hands", "Gloves of Dexterity": "Hands",
            "Bracers of Defense": "Hands", "Gloves of Healing": "Hands", "Cursed Gauntlets": "Hands", "Gloves of Fire": "Hands", "Frost Bracers": "Hands",
            "Iron Gauntlets": "Hands", "Steel Gauntlets": "Hands", "Mithril Gauntlets": "Hands", "Flame Gauntlets": "Hands", "Ice Gauntlets": "Hands",
            "Pure Gauntlets": "Hands", "Vital Gauntlets": "Hands", "Swift Gauntlets": "Hands", "Arcane Gauntlets": "Hands", "Fortunate Gauntlets": "Hands",
            // ARMS CLOTHING & ARMOR
            "Linen Sleeves": "Arms", "Leather Sleeves": "Arms", "Silk Sleeves": "Arms", "Bracers of Power": "Arms", "Sleeves of Accuracy": "Arms",
            "Arm Guards of Protection": "Arms", "Healing Bracers": "Arms", "Flame Sleeves": "Arms", "Ice Bracers": "Arms", "Poisoner's Sleeves": "Arms",
            "Iron Bracers": "Arms", "Steel Bracers": "Arms", "Mithril Bracers": "Arms", "Fire Bracers": "Arms", "Frost Bracers": "Arms",
            "Clean Bracers": "Arms", "Life Bracers": "Arms", "Quick Bracers": "Arms", "Mystic Bracers": "Arms", "Blessed Bracers": "Arms",
            // BODY CLOTHING & ARMOR
            "Cotton Shirt": "Body", "Leather Vest": "Body", "Silk Robe": "Body", "Robe of the Mage": "Body", "Vest of Swiftness": "Body",
            "Shadow Cloak": "Body", "Cloak of Invisibility": "Body", "Tunic of Wisdom": "Body", "Robe of Courage": "Body", "Lucky Tunic": "Body",
            "Chain Mail": "Body", "Plate Armor": "Body", "Mithril Armor": "Body", "Dragon Scale Armor": "Body", "Ice Crystal Armor": "Body",
            "Blessed Chain Mail": "Body", "Living Armor": "Body", "Wind Walker Armor": "Body", "Mage's Robes": "Body", "Hero's Plate": "Body",
            // LEGS CLOTHING & ARMOR
            "Cotton Pants": "Legs", "Leather Pants": "Legs", "Silk Trousers": "Legs", "Greaves of Might": "Legs", "Pants of Agility": "Legs",
            "Leg Guards of Steel": "Legs", "Regenerative Greaves": "Legs", "Flame Leggings": "Legs", "Frost Pants": "Legs", "Anti-Venom Greaves": "Legs",
            "Iron Greaves": "Legs", "Steel Greaves": "Legs", "Mithril Greaves": "Legs", "Flame Greaves": "Legs", "Frost Greaves": "Legs",
            "Pure Greaves": "Legs", "Vital Greaves": "Legs", "Swift Greaves": "Legs", "Arcane Greaves": "Legs", "Fortunate Greaves": "Legs",
            // FEET CLOTHING & ARMOR
            "Cotton Shoes": "Feet", "Leather Boots": "Feet", "Silk Slippers": "Feet", "Boots of Speed": "Feet", "Stealth Boots": "Feet",
            "Armored Boots": "Feet", "Healing Sandals": "Feet", "Fire Boots": "Feet", "Ice Boots": "Feet", "Poison Ward Boots": "Feet",
            "Iron Boots": "Feet", "Steel Boots": "Feet", "Mithril Boots": "Feet", "Fire Boots": "Feet", "Ice Boots": "Feet",
            "Clean Boots": "Feet", "Life Boots": "Feet", "Quick Boots": "Feet", "Mystic Boots": "Feet", "Blessed Boots": "Feet"
        };

        // Potion definitions
        const temporaryPotions = [
            "Strength Potion", "Intelligence Potion", "Skill Potion", "Stamina Potion",
            "Charisma Potion", "Wisdom Potion", "Speed Potion", "Invisibility Potion"
        ];

        const permanentPotions = [
            "Permanent Strength Potion", "Permanent Intelligence Potion", "Permanent Skill Potion",
            "Permanent Stamina Potion", "Permanent Charisma Potion", "Permanent Wisdom Potion",
            "Permanent Speed Potion", "Cure Disease Potion", "Banish Curse Potion",
            "Cure Poison Potion", "Fatigue Relief Potion", "Banish Hunger Potion", "Banish Thirst Potion"
        ];

        // Map potions to their effects
        const potionEffects = {
            // Temporary potions (+10 stat for 1 hour)
            "Strength Potion": { stat: "Strength", bonus: 10, duration: 60, type: "temporary" },
            "Intelligence Potion": { stat: "Intelligence", bonus: 10, duration: 60, type: "temporary" },
            "Skill Potion": { stat: "Skill", bonus: 10, duration: 60, type: "temporary" },
            "Stamina Potion": { stat: "Stamina", bonus: 10, duration: 60, type: "temporary" },
            "Charisma Potion": { stat: "Charisma", bonus: 10, duration: 60, type: "temporary" },
            "Wisdom Potion": { stat: "Wisdom", bonus: 10, duration: 60, type: "temporary" },
            "Speed Potion": { stat: "Speed", bonus: 10, duration: 60, type: "temporary" },
            "Invisibility Potion": { effect: "invisibility", duration: 60, type: "temporary" },

            // Permanent potions (+5 stat permanently)
            "Permanent Strength Potion": { stat: "Strength", bonus: 5, type: "permanent" },
            "Permanent Intelligence Potion": { stat: "Intelligence", bonus: 5, type: "permanent" },
            "Permanent Skill Potion": { stat: "Skill", bonus: 5, type: "permanent" },
            "Permanent Stamina Potion": { stat: "Stamina", bonus: 5, type: "permanent" },
            "Permanent Charisma Potion": { stat: "Charisma", bonus: 5, type: "permanent" },
            "Permanent Wisdom Potion": { stat: "Wisdom", bonus: 5, type: "permanent" },
            "Permanent Speed Potion": { stat: "Speed", bonus: 5, type: "permanent" },

            // Permanent cures
            "Cure Disease Potion": { effect: "cure_disease", type: "permanent" },
            "Banish Curse Potion": { effect: "banish_curse", type: "permanent" },
            "Cure Poison Potion": { effect: "cure_poison", type: "permanent" },
            "Fatigue Relief Potion": { effect: "relieve_fatigue", type: "permanent" },
            "Banish Hunger Potion": { effect: "banish_hunger", type: "permanent" },
            "Banish Thirst Potion": { effect: "banish_thirst", type: "permanent" }
        };

        // Check if an item is a potion
        function isPotion(itemName) {
            if (!itemName) return false;
            return temporaryPotions.includes(itemName) || permanentPotions.includes(itemName);
        }

        // Check if an item is clothing (provides 0 defense, may have magical effects)
        function isClothing(itemName) {
            if (!itemName) return false;
            return clothingItems.includes(itemName);
        }

        // Check if an item is armor (provides defense, may have magical effects)
        function isArmor(itemName) {
            if (!itemName) return false;
            return armorItems.includes(itemName);
        }

        // Check if an item is equipment (clothing or armor)
        function isEquipment(itemName) {
            return isClothing(itemName) || isArmor(itemName);
        }

        // Armor defense values
        const armorStats = {
            // HEAD ARMOR
            "Iron Helm": { defense: 3 }, "Steel Helm": { defense: 4 }, "Mithril Helm": { defense: 5 },
            "Helm of Fire Protection": { defense: 4 }, "Frost Crown": { defense: 4 }, "Helm of Clarity": { defense: 4 },
            "Crown of Regeneration": { defense: 4 }, "Speed Helm": { defense: 4 }, "Wise Helm": { defense: 4 }, "Lucky Helm": { defense: 4 },
            // HANDS ARMOR
            "Iron Gauntlets": { defense: 2 }, "Steel Gauntlets": { defense: 3 }, "Mithril Gauntlets": { defense: 4 },
            "Flame Gauntlets": { defense: 3 }, "Ice Gauntlets": { defense: 3 }, "Pure Gauntlets": { defense: 3 },
            "Vital Gauntlets": { defense: 3 }, "Swift Gauntlets": { defense: 3 }, "Arcane Gauntlets": { defense: 3 }, "Fortunate Gauntlets": { defense: 3 },
            // ARMS ARMOR
            "Iron Bracers": { defense: 2 }, "Steel Bracers": { defense: 3 }, "Mithril Bracers": { defense: 4 },
            "Fire Bracers": { defense: 3 }, "Frost Bracers": { defense: 3 }, "Clean Bracers": { defense: 3 },
            "Life Bracers": { defense: 3 }, "Quick Bracers": { defense: 3 }, "Mystic Bracers": { defense: 3 }, "Blessed Bracers": { defense: 3 },
            // BODY ARMOR
            "Chain Mail": { defense: 8 }, "Plate Armor": { defense: 10 }, "Mithril Armor": { defense: 12 },
            "Dragon Scale Armor": { defense: 10 }, "Ice Crystal Armor": { defense: 10 }, "Blessed Chain Mail": { defense: 10 },
            "Living Armor": { defense: 10 }, "Wind Walker Armor": { defense: 10 }, "Mage's Robes": { defense: 10 }, "Hero's Plate": { defense: 10 },
            // LEGS ARMOR
            "Iron Greaves": { defense: 4 }, "Steel Greaves": { defense: 5 }, "Mithril Greaves": { defense: 6 },
            "Flame Greaves": { defense: 5 }, "Frost Greaves": { defense: 5 }, "Pure Greaves": { defense: 5 },
            "Vital Greaves": { defense: 5 }, "Swift Greaves": { defense: 5 }, "Arcane Greaves": { defense: 5 }, "Fortunate Greaves": { defense: 5 },
            // FEET ARMOR
            "Iron Boots": { defense: 3 }, "Steel Boots": { defense: 4 }, "Mithril Boots": { defense: 5 },
            "Fire Boots": { defense: 4 }, "Ice Boots": { defense: 4 }, "Clean Boots": { defense: 4 },
            "Life Boots": { defense: 4 }, "Quick Boots": { defense: 4 }, "Mystic Boots": { defense: 4 }, "Blessed Boots": { defense: 4 }
        };

        const lowTierWeapons = [
            "Sword", "Bow", "Dagger", "Axe", "Mace", 
            "Spear", "Hammer", "Staff", "Crossbow", "Shield"
        ];

        const highTierWeapons = [
            "Flame Sword", "Ice Dagger", "Thunder Axe", "Earth Mace", "Water Spear",
            "Light Hammer", "Shadow Staff", "Phoenix Bow", "Frost Crossbow", "Holy Shield",
            "Dragon Blade", "Void Dagger", "Storm Axe", "Crystal Mace", "Serpent Spear",
            "Celestial Hammer", "Necrotic Staff", "Inferno Bow", "Glacier Crossbow", 
            "Divine Shield", "Abyssal Blade", "Eternal Dagger", "Tempest Dagger", 
            "Volcanic Axe", "Mystic Mace", "Tidal Spear", "Radiant Hammer", "Cursed Staff", 
            "Ethereal Bow", "Soul Crossbow", "Guardian Shield", "Chaos Blade"
        ];
        
        // Two-handed weapons require both hands - using secondary with these causes 50% skill penalty
        const twoHandedWeapons = [
            "Bow", "Crossbow", "Staff", "Spear", "Hammer",
            "Phoenix Bow", "Frost Crossbow", "Inferno Bow", "Ethereal Bow", "Soul Crossbow",
            "Shadow Staff", "Necrotic Staff", "Cursed Staff",
            "Water Spear", "Serpent Spear", "Tidal Spear",
            "Light Hammer", "Celestial Hammer", "Radiant Hammer",
            "Dragon Blade", "Abyssal Blade", "Chaos Blade"  // Large two-handed swords
        ];
        
        // Check if an item is a weapon
        function isWeapon(itemName) {
            if (!itemName) return false;
            return lowTierWeapons.some(w => itemName.includes(w) || itemName === w) ||
                   highTierWeapons.includes(itemName);
        }
        
        // Check if a weapon requires two hands
        function isTwoHanded(itemName) {
            if (!itemName) return false;
            return twoHandedWeapons.some(w => itemName.includes(w) || itemName === w);
        }

        // Get random monster based on player level
        function getRandomMonster(playerLevel) {
            const minLevel = Math.max(1, playerLevel - 2);
            const maxLevel = playerLevel + 2;
            const candidates = monsterList.filter(m => m.level >= minLevel && m.level <= maxLevel);
            let monster = candidates.length > 0 
                ? { ...candidates[Math.floor(Math.random() * candidates.length)] }
                : { ...monsterList[0] };
            
            monster.equipment = [];

            // Strong monsters (Level 11+) always have equipment
            if (monster.level >= 11) {
                // Add a High Tier Weapon (or Low Tier if unlucky? No, user said "strong monsters... use weapons")
                // Let's give them High Tier weapons to match their strength
                const weapon = highTierWeapons[Math.floor(Math.random() * highTierWeapons.length)];
                monster.equipment.push(weapon);

                // Add a Clothing or Armor item (50/50 chance)
                if (Math.random() < 0.5) {
                    const clothing = clothingItems[Math.floor(Math.random() * clothingItems.length)];
                    monster.equipment.push(clothing);
                } else {
                    const armor = armorItems[Math.floor(Math.random() * armorItems.length)];
                    monster.equipment.push(armor);
                }
            } else {
                // Lower level monsters: 30% chance of dropping lower level weapons/items
                if (Math.random() < 0.30) {
                    // 50/50 chance between weapon or clothing/armor
                    if (Math.random() < 0.5) {
                        const weapon = lowTierWeapons[Math.floor(Math.random() * lowTierWeapons.length)];
                        monster.equipment.push(weapon);
                    } else {
                        // 50/50 between clothing and armor
                        if (Math.random() < 0.5) {
                            const clothing = clothingItems[Math.floor(Math.random() * clothingItems.length)];
                            monster.equipment.push(clothing);
                        } else {
                            const armor = armorItems[Math.floor(Math.random() * armorItems.length)];
                            monster.equipment.push(armor);
                        }
                    }
                }
            }
            
            return monster;
        }

        // Calculate XP needed for a specific level (level 1 = 1000, level 2 = 2000, level 3 = 4000, etc.)
        function getXpThresholdForLevel(targetLevel) {
            if (targetLevel <= 0) return 0;
            return BASE_XP_THRESHOLD * Math.pow(2, targetLevel - 1);
        }
        
        // Calculate total XP needed to reach a level (cumulative)
        function getTotalXpForLevel(targetLevel) {
            if (targetLevel <= 0) return 0;
            // Sum of geometric series: 1000 * (2^n - 1) where n = targetLevel
            return BASE_XP_THRESHOLD * (Math.pow(2, targetLevel) - 1);
        }
        
        // Get XP progress towards next level
        function getXpProgress() {
            const currentLevelXp = getTotalXpForLevel(player.level);
            const nextLevelXp = getTotalXpForLevel(player.level + 1);
            const xpIntoLevel = player.experience - currentLevelXp;
            const xpNeeded = nextLevelXp - currentLevelXp;
            return { current: xpIntoLevel, needed: xpNeeded, percent: Math.floor((xpIntoLevel / xpNeeded) * 100) };
        }
        
        // Calculate equipment stat bonuses (for future use when equipment affects stats)
        function getEquipmentStatBonuses() {
            const bonuses = {
                Stamina: 0, Charisma: 0, Strength: 0,
                Intelligence: 0, Wisdom: 0, Skill: 0, Speed: 0
            };
            // Equipment bonuses can be added here in the future
            // For now, equipment only affects attack/defense in combat
            return bonuses;
        }
        
        // Recalculate current stats from base stats + equipment + temporary effects
        function recalculateStats() {
            const bonuses = getEquipmentStatBonuses();
            for (const stat in player.baseStats) {
                let totalBonus = bonuses[stat] || 0;
                
                // Add temporary potion effects
                if (player.temporaryEffects[stat] && player.temporaryEffects[stat].active) {
                    const effect = potionEffects[`${stat} Potion`];
                    if (effect) {
                        totalBonus += effect.bonus;
                    }
                }
                
                player.stats[stat] = Math.min(MAX_STAT, player.baseStats[stat] + totalBonus);
            }
        }
        
        // Level up function - increases all stats by 3-6 points
        function levelUp() {
            player.level++;
            
            const statNames = Object.keys(player.baseStats);
            const increases = {};
            
            for (const stat of statNames) {
                const baseStat = player.baseStats[stat];
                const currentStat = player.stats[stat];
                const bonuses = getEquipmentStatBonuses();
                const equipBonus = bonuses[stat] || 0;
                
                // If base stat is maxed, no changes occur
                if (baseStat >= MAX_STAT) {
                    increases[stat] = 0;
                    continue;
                }
                
                // Random increase of 3-6
                const increase = Math.floor(Math.random() * 4) + 3;
                
                // Increase base stat (cap at MAX_STAT)
                const newBaseStat = Math.min(MAX_STAT, baseStat + increase);
                player.baseStats[stat] = newBaseStat;
                increases[stat] = newBaseStat - baseStat;
                
                // If stat was maxed due to equipment, keep current stat unchanged but base increased
                if (currentStat >= MAX_STAT) {
                    // Current stat stays at max, base was already increased above
                } else {
                    // Recalculate current stat
                    player.stats[stat] = Math.min(MAX_STAT, newBaseStat + equipBonus);
                }
            }
            
            // Increase max HP based on new stamina
            const oldMaxHp = player.hitpoints;
            player.hitpoints = Math.max(player.hitpoints, player.baseStats.Stamina);
            
            return increases;
        }
        
        // Check for level up and process it
        function checkLevelUp() {
            const xpForNextLevel = getTotalXpForLevel(player.level + 1);
            let leveledUp = false;
            let totalIncreases = {};
            
            while (player.experience >= xpForNextLevel) {
                const increases = levelUp();
                leveledUp = true;
                
                // Accumulate increases for display
                for (const stat in increases) {
                    totalIncreases[stat] = (totalIncreases[stat] || 0) + increases[stat];
                }
                
                // Check if we can level up again
                if (player.experience < getTotalXpForLevel(player.level + 1)) {
                    break;
                }
            }
            
            if (leveledUp) {
                // Show level up message
                const statGains = Object.entries(totalIncreases)
                    .filter(([_, v]) => v > 0)
                    .map(([k, v]) => `${k.substring(0, 3).toUpperCase()}+${v}`)
                    .join(', ');
                
                if (player.battleLog) {
                    player.battleLog.push(`<span style="color: gold; font-weight: bold;">LEVEL UP! You are now level ${player.level}!</span>`);
                    if (statGains) {
                        player.battleLog.push(`<span style="color: cyan;">${statGains}</span>`);
                    }
                }
            }
            
            return leveledUp;
        }

        // Store player reference for getGameState access
        window.game._player = player;
        window.game._getCurrentLevel = function() { return currentLevel; };
        window.game._setCurrentLevel = function(lvl) { changeLevel(lvl); };
        window.game._setPaused = function(paused) { 
            isPaused = paused; 
            const overlay = document.getElementById('pause-overlay');
            if (overlay) {
                overlay.style.display = isPaused ? 'flex' : 'none';
            }
        };

        // Initialize player state
        if (playerStats && typeof playerStats === 'object') {
            // Check if this is a full game state (from loaded save) or basic stats (new game)
            if (playerStats.name && playerStats.stats && playerStats.inventory) {
                // Full game state restoration
                player.name = playerStats.name;
                player.level = playerStats.level || 0;
                player.hitpoints = playerStats.hitpoints || 0;
                player.experience = playerStats.experience || 0;

                // Restore stats
                for (let stat in player.stats) {
                    // Check both PascalCase and camelCase since Blazor may serialize either way
                    const camelKey = stat.charAt(0).toLowerCase() + stat.slice(1);
                    let value = undefined;
                    if (playerStats.stats) {
                        if (typeof playerStats.stats[stat] === 'number') {
                            value = playerStats.stats[stat];
                        } else if (typeof playerStats.stats[camelKey] === 'number') {
                            value = playerStats.stats[camelKey];
                        }
                    }
                    if (typeof value === 'number') {
                        player.stats[stat] = value;
                    }
                }
                
                // Restore base stats (or copy from stats if not present)
                for (let stat in player.baseStats) {
                    const camelKey = stat.charAt(0).toLowerCase() + stat.slice(1);
                    let value = undefined;
                    if (playerStats.baseStats) {
                        if (typeof playerStats.baseStats[stat] === 'number') {
                            value = playerStats.baseStats[stat];
                        } else if (typeof playerStats.baseStats[camelKey] === 'number') {
                            value = playerStats.baseStats[camelKey];
                        }
                    }
                    // If no baseStats in save, use current stats as base
                    if (typeof value === 'number') {
                        player.baseStats[stat] = value;
                    } else {
                        player.baseStats[stat] = player.stats[stat];
                    }
                }

                // Restore ground items
                player.groundItems = playerStats.groundItems || {};

                // Restore inventory
                player.inventory = playerStats.inventory || [];
                
                // Restore equipped weapons
                player.primaryWeapon = playerStats.primaryWeapon || null;
                player.secondaryWeapon = playerStats.secondaryWeapon || null;

                // Restore equipped clothing
                player.equippedClothing = playerStats.equippedClothing || {
                    Head: null, Hands: null, Arms: null, Body: null, Legs: null, Feet: null
                };

                // Restore temporary effects
                player.temporaryEffects = playerStats.temporaryEffects || {
                    Strength: { active: false, duration: 0 },
                    Intelligence: { active: false, duration: 0 },
                    Skill: { active: false, duration: 0 },
                    Stamina: { active: false, duration: 0 },
                    Charisma: { active: false, duration: 0 },
                    Wisdom: { active: false, duration: 0 },
                    Speed: { active: false, duration: 0 },
                    invisibility: { active: false, duration: 0 }
                };

                // Restore gold
                player.gold = playerStats.gold || 100;

                // Restore guild system
                player.currentGuild = playerStats.currentGuild || null;
                player.guildReputation = playerStats.guildReputation || {
                    'Fighters': 0, 'Mages': 0, 'Thieves': 0, 'Clerics': 0, 'Rangers': 0
                };
                player.guildRank = playerStats.guildRank || 0;
                player.completedQuests = playerStats.completedQuests || [];
                
                // Restore game progression
                player.dungeonDepth = playerStats.dungeonDepth || 0;
                player.hasDefeatedFinalBoss = playerStats.hasDefeatedFinalBoss || false;
                player.monstersDefeated = playerStats.monstersDefeated || 0;
                player.bossesDefeated = playerStats.bossesDefeated || 0;

                // Restore UI state
                player.showInventory = playerStats.showInventory || false;
                player.showLoseMode = playerStats.showLoseMode || false;
                player.showGetMode = playerStats.showGetMode || false;
                player.getItemIndex = playerStats.getItemIndex || 0;
                player.showUseMode = playerStats.showUseMode || false;
                player.useItemIndex = playerStats.useItemIndex || 0;
                
                // Restore dungeon level
                const savedDungeonLevel = playerStats.dungeonLevel || playerStats.DungeonLevel || 0;
                if (savedDungeonLevel !== currentLevel && savedDungeonLevel >= 0 && savedDungeonLevel < NUM_LEVELS) {
                    currentLevel = savedDungeonLevel;
                    buildLevel(currentLevel);
                }
            } else {
                // Basic stats initialization (new game)
                // Get player name (check both camelCase and PascalCase)
                if (typeof playerStats.name === 'string') {
                    player.name = playerStats.name;
                } else if (typeof playerStats.Name === 'string') {
                    player.name = playerStats.Name;
                }

                for (let stat in player.stats) {
                    // Blazor typically serializes anonymous-type property names to camelCase.
                    const camelKey = stat.charAt(0).toLowerCase() + stat.slice(1);
                    let value = undefined;
                    if (Object.prototype.hasOwnProperty.call(playerStats, stat)) {
                        value = playerStats[stat];
                    } else if (Object.prototype.hasOwnProperty.call(playerStats, camelKey)) {
                        value = playerStats[camelKey];
                    }
                    if (typeof value === 'number') {
                        player.stats[stat] = value;
                        player.baseStats[stat] = value;  // Set base stats equal to initial stats
                    }
                }
            }
        } else {
            // Random stats for completely new games
            for (let stat in player.stats) {
                const randomValue = Math.floor(Math.random() * (21 - 8 + 1)) + 8;
                player.stats[stat] = randomValue;
                player.baseStats[stat] = randomValue;  // Set base stats equal to initial stats
            }
        }

        // Set hitpoints if not already set (for new games)
        if (player.hitpoints === 0) {
            player.hitpoints = player.baseStats.Stamina;
        }
        
        // Show tutorial for new games
        if (player.level === 0 && player.experience === 0 && !playerStats.skipTutorial) {
            setTimeout(() => {
                const tutorial = `
=== WELCOME TO ALTERNATE REALITY: THE DUNGEON ===

You awaken in a dark dungeon with no memory of how you got here.
Your only goal: survive and escape the depths.

CONTROLS:
• WASD / Arrow Keys: Move and turn
• Enter: Use stairs
• I: Toggle inventory
• G: Get items from ground
• U: Use items
• P: Pause

GAMEPLAY TIPS:
• Join a GUILD (North door) for stat bonuses and special abilities
• Rest at INNS (South door) to heal - but beware of risks!
• Buy supplies at SHOPS (East door) and upgrade gear at SMITHS (West door)
• Combat is automatic - encounter monsters as you explore
• Defeat BOSSES on each floor to progress
• Manage your gold, HP, and equipment carefully

The deeper you go, the greater the danger... and the greater the rewards.

Good luck, adventurer. You'll need it.
                `;
                alert(tutorial);
            }, 500);
        }

        function updateHUD() {
            // 1. Update Character Name (4th Quarter)
            const charNameEl = document.getElementById('nav-char-name');
            if (charNameEl) {
                charNameEl.textContent = player.name;
            }

            // Update Level Text (1st Quarter) - show dungeon floor level
            const levelTextEl = document.getElementById('level-text');
            if (levelTextEl) {
                levelTextEl.textContent = `You are on Dungeon Level ${currentLevel + 1} of ${NUM_LEVELS}.`;
            }
            
            // Update area description based on tile type
            const areaTextEl = document.getElementById('area-text');
            if (areaTextEl) {
                const tile = worldToTile(camera.position.x, camera.position.z);
                const tileType = getTileType(tile.tx, tile.ty);
                if (tileType === STAIRS_DOWN) {
                    areaTextEl.innerHTML = 'You see <span style="color: #8B0000; font-weight: bold;">stairs leading DOWN</span>. Press <strong>Enter</strong> to descend.';
                } else if (tileType === STAIRS_UP) {
                    areaTextEl.innerHTML = 'You see <span style="color: #006400; font-weight: bold;">stairs leading UP</span>. Press <strong>Enter</strong> to ascend.';
                } else {
                    areaTextEl.textContent = 'You are standing in a dark dungeon corridor.';
                }
            }

            // Update Ground Items Text (1st Quarter) - based on current tile
            const groundItemsEl = document.getElementById('ground-items');
            if (groundItemsEl) {
                const tile = worldToTile(camera.position.x, camera.position.z);
                const tileKey = `${tile.tx},${tile.ty}`;
                const itemsHere = player.groundItems[tileKey] || [];
                const count = itemsHere.length;
                if (count === 0) {
                    groundItemsEl.textContent = "There is nothing on the ground.";
                } else if (count === 1) {
                    groundItemsEl.textContent = "Something is on the ground.";
                } else {
                    groundItemsEl.textContent = "Some things are on the ground.";
                }
            }

            // 2. Update Stats Overlay (Top Left)
            const overlay = document.getElementById('stats-overlay');
            if (overlay) {
                const xpProgress = getXpProgress();
                const nextLevelXp = getTotalXpForLevel(player.level + 1);
                const pStats = getPlayerCombatStats();
                // Show skill with penalty indicator if applicable
                let skillDisplay = player.stats.Skill;
                if (player.primaryWeapon && player.secondaryWeapon && isTwoHanded(player.primaryWeapon)) {
                    skillDisplay = `<span style="color: #f88;">${pStats.skill}</span>`;
                }
                // Guild display
                let guildDisplay = player.currentGuild ? `<span style="color: cyan;">${player.currentGuild.substring(0,3)} R${player.guildRank}</span>` : 'None';
                
                overlay.innerHTML = `
                    <strong>Floor: ${currentLevel + 1}/${NUM_LEVELS}</strong><br>
                    <strong>Lvl: ${player.level}</strong> | <strong>HP: ${player.hitpoints}</strong><br>
                    <strong>Gold: <span style="color: gold;">${player.gold}</span></strong><br>
                    <strong>XP: ${player.experience}/${nextLevelXp}</strong><br>
                    Guild: ${guildDisplay}<br>
                    STA: ${player.stats.Stamina}<br>
                    CHR: ${player.stats.Charisma}<br>
                    STR: ${player.stats.Strength}<br>
                    INT: ${player.stats.Intelligence}<br>
                    WIS: ${player.stats.Wisdom}<br>
                    SKL: ${skillDisplay}<br>
                    SPD: ${player.stats.Speed}<br>
                    <span style="color: #8f8;">Pri: ${player.primaryWeapon || 'None'}</span><br>
                    <span style="color: #88f;">Sec: ${player.secondaryWeapon || 'None'}</span>
                `;
            }
            
            // 3. Update Inventory (3rd Quarter)
            const invContainer = document.getElementById('nav-inventory');
            if (invContainer) {
                // Get items at current tile for Get mode
                const tile = worldToTile(camera.position.x, camera.position.z);
                const tileKey = `${tile.tx},${tile.ty}`;
                const itemsHere = player.groundItems[tileKey] || [];
                
                if (player.inBattle) {
                    // Battle Options View
                    let html = `<div style="margin-bottom: 5px; font-weight: bold; color: red;">Battle Options:</div>`;
                    html += `<div style="${player.battleOption === 1 ? 'color: yellow;' : ''}">1. Attack</div>`;
                    html += `<div style="${player.battleOption === 2 ? 'color: yellow;' : ''}">2. Charge</div>`;
                    html += `<div style="${player.battleOption === 3 ? 'color: yellow;' : ''}">3. Aimed Attack</div>`;
                    html += `<div style="${player.battleOption === 4 ? 'color: yellow;' : ''}">4. Transact</div>`;
                    html += `<div style="${player.battleOption === 5 ? 'color: yellow;' : ''}">5. Switch Weapon</div>`;
                    html += `<div style="${player.battleOption === 6 ? 'color: yellow;' : ''}">6. Turn and Run</div>`;
                    invContainer.innerHTML = html;
                } else if (player.showNothingToGrab) {
                    // Nothing to Grab feedback
                    invContainer.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; font-weight: bold; color: #888;">Nothing to Grab.</div>`;
                } else if (player.showGetMode && itemsHere.length > 0) {
                    // Get Items View
                    const currentItem = itemsHere[player.getItemIndex];
                    let html = `<div style="margin-bottom: 10px; font-weight: bold; color: lime;">Get?</div>`;
                    html += `<div style="font-size: 1.1rem; margin: 10px 0;">${currentItem}</div>`;
                    html += `<div style="margin-top: 10px; color: #aaa;">Yes, No, End</div>`;
                    html += `<div style="margin-top: 5px; font-size: 0.8rem; color: #666;">(Item ${player.getItemIndex + 1} of ${itemsHere.length})</div>`;
                    invContainer.innerHTML = html;
                } else if (player.showLoseMode) {
                    // Lose Items View
                    let html = `<div style="margin-bottom: 5px; font-weight: bold; color: red;">Lose Items (Press # to drop):</div>`;
                    player.inventory.forEach((item, index) => {
                        html += `<div>${index + 1}. ${item.name} (${item.count})</div>`;
                    });
                    invContainer.innerHTML = html;
                } else if (player.showInventory) {
                    // Full Inventory View
                    let html = `<div style="margin-bottom: 5px; font-weight: bold; color: gold;">Inventory:</div>`;
                    player.inventory.forEach(item => {
                        if (item.count > 0) {
                             html += `<div>${item.name} (${item.count})</div>`;
                        }
                    });
                    if (player.inventory.every(i => i.count === 0)) {
                         html += `<div>(Empty)</div>`;
                    }
                    invContainer.innerHTML = html;
                } else if (player.showWeaponEquipMode && player.weaponToEquip) {
                    // Weapon Equip Mode - Choose Primary or Secondary
                    let html = `<div style="margin-bottom: 10px; font-weight: bold; color: orange;">Equip Weapon</div>`;
                    html += `<div style="font-size: 1.1rem; margin: 10px 0;">${player.weaponToEquip}</div>`;
                    if (isTwoHanded(player.weaponToEquip)) {
                        html += `<div style="font-size: 0.8rem; color: #f88; margin-bottom: 5px;">(Two-Handed)</div>`;
                    }
                    html += `<div style="margin-top: 10px;">`;
                    html += `<div>1. Primary (Attack)</div>`;
                    html += `<div>2. Secondary (Defense)</div>`;
                    html += `<div style="color: #888; margin-top: 5px;">E = Cancel</div>`;
                    html += `</div>`;
                    // Show current weapons
                    html += `<div style="margin-top: 15px; font-size: 0.8rem; color: #666;">`;
                    html += `Current Primary: ${player.primaryWeapon || 'None'}<br>`;
                    html += `Current Secondary: ${player.secondaryWeapon || 'None'}`;
                    html += `</div>`;
                    invContainer.innerHTML = html;
                } else if (player.showClothingEquipMode && player.clothingToEquip) {
                    // Clothing Equip Mode - Choose body part
                    const bodyPart = clothingBodyPartMap[player.clothingToEquip];
                    let html = `<div style="margin-bottom: 10px; font-weight: bold; color: cyan;">Equip Clothing</div>`;
                    html += `<div style="font-size: 1.1rem; margin: 10px 0;">${player.clothingToEquip}</div>`;
                    html += `<div style="font-size: 0.9rem; color: #8f8; margin-bottom: 5px;">Fits: ${bodyPart}</div>`;
                    html += `<div style="margin-top: 10px;">`;
                    
                    // Show available body parts
                    bodyParts.forEach((part, index) => {
                        const isFitting = part === bodyPart;
                        const currentEquipped = player.equippedClothing[part];
                        const color = isFitting ? '#8f8' : '#666';
                        const label = `${index + 1}. ${part}`;
                        if (currentEquipped) {
                            html += `<div style="color: ${color};">${label} (${currentEquipped})</div>`;
                        } else {
                            html += `<div style="color: ${color};">${label} (Empty)</div>`;
                        }
                    });
                    
                    html += `<div style="color: #888; margin-top: 5px;">E = Cancel</div>`;
                    html += `</div>`;
                    invContainer.innerHTML = html;
                } else if (player.showUseMode) {
                    // Use Items View
                    const usableItems = player.inventory.filter(i => i.count > 0);
                    if (usableItems.length > 0 && player.useItemIndex < usableItems.length) {
                        const currentItem = usableItems[player.useItemIndex];
                        let html = `<div style="margin-bottom: 10px; font-weight: bold; color: cyan;">Use?</div>`;
                        html += `<div style="font-size: 1.1rem; margin: 10px 0;">${currentItem.name} (${currentItem.count})</div>`;
                        html += `<div style="margin-top: 10px; color: #aaa;">Yes, No, End</div>`;
                        html += `<div style="margin-top: 5px; font-size: 0.8rem; color: #666;">(Item ${player.useItemIndex + 1} of ${usableItems.length})</div>`;
                        invContainer.innerHTML = html;
                    } else {
                        invContainer.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; font-weight: bold; color: #888;">No items to use.</div>`;
                    }
                } else {
                    // Standard View (Food, Torches, Flasks counts)
                    // Helper to find count
                    const getCount = (name) => {
                        const item = player.inventory.find(i => i.name === name);
                        return item ? item.count : 0;
                    };
                    
                    invContainer.innerHTML = `
                        <div style="display: flex; flex-direction: column; justify-content: center; gap: 5px; height: 100%;">
                            <div>Food: <span>${getCount('Food')}</span></div>
                            <div>Torches: <span>${getCount('Torches')}</span></div>
                            <div>Flasks: <span>${getCount('Flasks')}</span></div>
                        </div>
                    `;
                }
            }
        }
        updateHUD();

        // Item usage function - returns true if item was used immediately, false if needs more input
        function useItem(item) {
            // Check if item is a weapon - trigger weapon equip mode
            if (isWeapon(item.name)) {
                player.weaponToEquip = item.name;
                player.showWeaponEquipMode = true;
                player.showUseMode = false;
                return false;  // Needs further input (Primary/Secondary choice)
            }
            
            // Check if item is clothing or armor - auto-equip to appropriate body part
            if (isClothing(item.name) || isArmor(item.name)) {
                const bodyPart = clothingBodyPartMap[item.name];
                if (bodyPart) {
                    player.equippedClothing[bodyPart] = item.name;
                    player.showUseMode = false;
                    updateHUD();
                }
                return true;  // Equipment equipped immediately
            }
            
            // Check if item is a potion
            if (isPotion(item.name)) {
                usePotion(item);
                return true;  // Potion is used immediately
            }
            
            if (item.name === 'Food' || item.name === 'Food Packet') {
                // Restore some HP (cap at base stamina, not equipment-modified)
                player.hitpoints = Math.min(player.hitpoints + 10, player.baseStats.Stamina);
                item.count--;
            } else if (item.name === 'Water Flask' || item.name === 'Flasks') {
                // Restore some HP
                player.hitpoints = Math.min(player.hitpoints + 5, player.baseStats.Stamina);
                item.count--;
            } else if (item.name === 'Unlit Torch') {
                // Convert to lit torch
                item.name = 'Lit Torch';
                // Could add light effect, but for now just rename
            } else if (item.name === 'Lit Torch') {
                // Already lit, maybe extinguish
                item.name = 'Burnt Stick';
            } else {
                // Default: Do nothing (item cannot be used or has no use effect)
                // Do not consume item
            }
            // If count reaches 0, could remove from inventory, but for now keep it
            return true;
        }
        
        // Equip weapon to primary or secondary slot
        function equipWeapon(slot) {
            if (!player.weaponToEquip) return;
            
            const weaponName = player.weaponToEquip;
            
            if (slot === 'primary') {
                // If there's already a primary weapon, it stays in inventory
                player.primaryWeapon = weaponName;
            } else if (slot === 'secondary') {
                // If there's already a secondary weapon, it stays in inventory
                player.secondaryWeapon = weaponName;
            }
            
            // Clear the equip mode
            player.weaponToEquip = null;
            player.showWeaponEquipMode = false;
            updateHUD();
        }
        
        // Equip clothing to body part
        function equipClothing(bodyPart) {
            if (!player.clothingToEquip) return;
            
            const clothingName = player.clothingToEquip;
            const targetBodyPart = clothingBodyPartMap[clothingName];
            
            if (targetBodyPart === bodyPart) {
                // If there's already clothing on this body part, it stays in inventory
                player.equippedClothing[bodyPart] = clothingName;
                
                // Clear the equip mode
                player.clothingToEquip = null;
                player.showClothingEquipMode = false;
                updateHUD();
            } else {
                // Invalid body part for this clothing
                // Could show error message, but for now just cancel
                player.clothingToEquip = null;
                player.showClothingEquipMode = false;
                updateHUD();
            }
        }

        // Use potion function
        function usePotion(item) {
            const effect = potionEffects[item.name];
            if (!effect) return;
            
            if (effect.type === "temporary") {
                // Apply temporary effect
                if (effect.stat) {
                    // Stat boost
                    player.temporaryEffects[effect.stat].active = true;
                    player.temporaryEffects[effect.stat].duration = effect.duration;
                } else if (effect.effect === "invisibility") {
                    // Special effect
                    player.temporaryEffects.invisibility.active = true;
                    player.temporaryEffects.invisibility.duration = effect.duration;
                }
                
                // Recalculate stats immediately
                recalculateStats();
                
                // Show message
                if (player.battleLog) {
                    const durationText = `${Math.floor(effect.duration / 60)}:${(effect.duration % 60).toString().padStart(2, '0')}`;
                    player.battleLog.push(`<span style="color: cyan;">You drink ${item.name}. Effect lasts 1 hour.</span>`);
                }
            } else if (effect.type === "permanent") {
                if (effect.stat) {
                    // Permanent stat boost
                    player.baseStats[effect.stat] = Math.min(MAX_STAT, player.baseStats[effect.stat] + effect.bonus);
                    recalculateStats();
                    
                    // Show message
                    if (player.battleLog) {
                        player.battleLog.push(`<span style="color: lime;">You drink ${item.name}. ${effect.stat} permanently increased by ${effect.bonus}!</span>`);
                    }
                } else if (effect.effect) {
                    // Permanent cure/effect
                    if (effect.effect === "cure_disease") {
                        // Implement disease cure logic here
                        if (player.battleLog) {
                            player.battleLog.push(`<span style="color: lime;">You drink ${item.name}. All diseases are cured!</span>`);
                        }
                    } else if (effect.effect === "banish_curse") {
                        // Implement curse removal logic here
                        if (player.battleLog) {
                            player.battleLog.push(`<span style="color: lime;">You drink ${item.name}. All curses are banished!</span>`);
                        }
                    } else if (effect.effect === "cure_poison") {
                        // Implement poison cure logic here
                        if (player.battleLog) {
                            player.battleLog.push(`<span style="color: lime;">You drink ${item.name}. All poisons are cured!</span>`);
                        }
                    } else if (effect.effect === "relieve_fatigue") {
                        // Restore stamina to max
                        player.hitpoints = player.baseStats.Stamina;
                        if (player.battleLog) {
                            player.battleLog.push(`<span style="color: lime;">You drink ${item.name}. Fatigue is relieved!</span>`);
                        }
                    } else if (effect.effect === "banish_hunger") {
                        // Implement hunger removal logic here
                        if (player.battleLog) {
                            player.battleLog.push(`<span style="color: lime;">You drink ${item.name}. Hunger is banished!</span>`);
                        }
                    } else if (effect.effect === "banish_thirst") {
                        // Implement thirst removal logic here
                        if (player.battleLog) {
                            player.battleLog.push(`<span style="color: lime;">You drink ${item.name}. Thirst is banished!</span>`);
                        }
                    }
                }
            }
            
            // Consume the potion
            item.count--;
        }

        // Create monster encounter overlay
        const monsterOverlay = document.createElement('div');
        monsterOverlay.id = 'monster-overlay';
        monsterOverlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 35; color: white; font-family: monospace;';
        container.appendChild(monsterOverlay);
        
        // Create special room overlay
        const specialRoomOverlay = document.createElement('div');
        specialRoomOverlay.id = 'special-room-overlay';
        specialRoomOverlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #000; display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 36; color: white; font-family: monospace;';
        container.appendChild(specialRoomOverlay);
        
        function enterSpecialRoom(tx, ty, entrance) {
            player.inSpecialRoom = true;
            player.currentSpecialRoom = { tx, ty, entrance };
            isPaused = true;
            
            // Determine room type based on entrance direction
            let roomType, roomContent;
            if (entrance === 'N') {
                roomType = 'guild';
                roomContent = generateGuildContent();
            } else if (entrance === 'E') {
                roomType = 'shop';
                roomContent = generateShopContent();
            } else if (entrance === 'S') {
                roomType = 'inn';
                roomContent = generateInnContent();
            } else if (entrance === 'W') {
                roomType = 'smith';
                roomContent = generateSmithContent();
            } else {
                roomContent = '<div style="font-size: 2rem; color: #888; margin-bottom: 40px;">Empty Room</div>';
            }
            
            specialRoomOverlay.innerHTML = roomContent + 
                '<div style="margin-top: 30px; font-size: 0.9rem; color: #888;">Press Space Bar to exit</div>';
            specialRoomOverlay.style.display = 'flex';
        }
        
        function generateGuildContent() {
            let html = '<div style="width: 80%; max-width: 800px; text-align: left;">';
            html += '<div style="font-size: 2rem; color: gold; margin-bottom: 20px; text-align: center;">GUILDS</div>';
            
            if (player.currentGuild) {
                // Show current guild status
                const guild = guilds[player.currentGuild];
                const rank = player.guildRank;
                html += `<div style="background: rgba(0,50,0,0.7); padding: 15px; margin-bottom: 15px; border: 2px solid #4a4;">`;
                html += `<div style="font-size: 1.3rem; color: #8f8;">Current Guild: ${guild.name}</div>`;
                html += `<div>Rank: ${guild.ranks[rank - 1]} (${rank}/5)</div>`;
                html += `<div>Reputation: ${player.guildReputation[player.currentGuild]}</div>`;
                if (rank < 5) {
                    html += `<div style="margin-top: 10px; color: #aaa;">Next Rank Benefits: ${guild.benefits[rank + 1].desc}</div>`;
                    html += `<div style="color: cyan; margin-top: 5px;">Press [U] to attempt rank up (costs 100 gold + quest requirements)</div>`;
                } else {
                    html += `<div style="margin-top: 10px; color: lime;">You are a Guildmaster!</div>`;
                }
                html += `</div>`;
                html += `<div style="margin-top: 10px; color: #888;">Press [L] to leave guild</div>`;
            } else {
                // Show available guilds
                html += '<div style="color: #ccc; margin-bottom: 15px;">Choose a guild to join (100 gold + stat requirement):</div>';
                let guildNum = 1;
                for (const guildKey in guilds) {
                    const guild = guilds[guildKey];
                    const meets = player.baseStats[guild.joinReq.stat] >= guild.joinReq.min;
                    const color = meets ? '#8f8' : '#f88';
                    html += `<div style="background: rgba(30,30,30,0.8); padding: 10px; margin-bottom: 10px; border-left: 3px solid ${color};">`;
                    html += `<div style="font-size: 1.2rem; color: ${color};">[${guildNum}] ${guild.name}</div>`;
                    html += `<div style="color: #aaa;">Requirement: ${guild.joinReq.stat} ${guild.joinReq.min}+ (You: ${player.baseStats[guild.joinReq.stat]})</div>`;
                    html += `<div style="color: #888; margin-top: 5px;">Rank 1: ${guild.benefits[1].desc}</div>`;
                    html += `</div>`;
                    guildNum++;
                }
            }
            
            html += '</div>';
            return html;
        }
        
        function generateShopContent() {
            let html = '<div style="width: 80%; max-width: 800px; text-align: left;">';
            html += '<div style="font-size: 2rem; color: gold; margin-bottom: 20px; text-align: center;">GENERAL SHOP</div>';
            html += `<div style="margin-bottom: 15px; text-align: center;">Your Gold: <span style="color: gold;">${player.gold}</span></div>`;
            
            // Weapons section
            html += '<div style="background: rgba(50,30,0,0.7); padding: 10px; margin-bottom: 10px; border: 2px solid #a84;">';
            html += '<div style="font-size: 1.2rem; color: #fa6; margin-bottom: 10px;">Weapons</div>';
            shops.weapons.slice(0, 5).forEach((item, idx) => {
                const canAfford = player.gold >= item.price;
                const color = canAfford ? '#8f8' : '#888';
                html += `<div style="color: ${color}; padding: 3px;">[${idx+1}] ${item.name} - ${item.price}g (Atk: ${item.attack}, Def: ${item.defense})</div>`;
            });
            html += '</div>';
            
            // Potions section
            html += '<div style="background: rgba(30,0,50,0.7); padding: 10px; margin-bottom: 10px; border: 2px solid #94a;">';
            html += '<div style="font-size: 1.2rem; color: #c8f; margin-bottom: 10px;">Potions</div>';
            shops.potions.slice(0, 4).forEach((item, idx) => {
                const canAfford = player.gold >= item.price;
                const color = canAfford ? '#8f8' : '#888';
                const effect = item.heal ? `Heals ${item.heal} HP` : `+${item.amount} ${item.buff} for ${item.duration}s`;
                html += `<div style="color: ${color}; padding: 3px;">[${idx+6}] ${item.name} - ${item.price}g (${effect})</div>`;
            });
            html += '</div>';
            
            html += '<div style="margin-top: 15px; color: #aaa; text-align: center;">Press [1-9] to buy, [S] to sell items, [Space] to exit</div>';
            html += '</div>';
            return html;
        }
        
        function generateInnContent() {
            let html = '<div style="width: 80%; max-width: 800px; text-align: left;">';
            html += '<div style="font-size: 2rem; color: gold; margin-bottom: 20px; text-align: center;">THE INN</div>';
            html += `<div style="margin-bottom: 15px; text-align: center;">Your Gold: <span style="color: gold;">${player.gold}</span> | HP: <span style="color: ${player.hitpoints < player.baseStats.Stamina * 0.3 ? 'red' : 'lime'};">${player.hitpoints}/${player.baseStats.Stamina}</span></div>`;
            
            let roomNum = 1;
            for (const roomType in innServices) {
                const service = innServices[roomType];
                const canAfford = player.gold >= service.cost;
                const color = canAfford ? '#8f8' : '#888';
                const healAmount = Math.floor(player.baseStats.Stamina * service.healPercent);
                
                html += `<div style="background: rgba(40,30,20,0.7); padding: 12px; margin-bottom: 10px; border: 2px solid ${canAfford ? '#a84' : '#444'};">`;
                html += `<div style="font-size: 1.2rem; color: ${color};">[${roomNum}] ${roomType} - ${service.cost} gold</div>`;
                html += `<div style="color: #8f8;">Restores ${Math.floor(service.healPercent * 100)}% HP (~${healAmount} HP)</div>`;
                if (service.bonusXP) html += `<div style="color: cyan;">Bonus: +${service.bonusXP} XP</div>`;
                
                const risks = [];
                if (service.riskAmbush > 0) risks.push(`Ambush ${Math.floor(service.riskAmbush * 100)}%`);
                if (service.riskTheft > 0) risks.push(`Theft ${Math.floor(service.riskTheft * 100)}%`);
                if (service.riskDisease > 0) risks.push(`Disease ${Math.floor(service.riskDisease * 100)}%`);
                if (risks.length > 0) {
                    html += `<div style="color: #f88; margin-top: 5px;">Risks: ${risks.join(', ')}</div>`;
                } else {
                    html += `<div style="color: #8f8; margin-top: 5px;">Safe and comfortable</div>`;
                }
                html += `</div>`;
                roomNum++;
            }
            
            html += '<div style="margin-top: 15px; color: #aaa; text-align: center;">Press [1-4] to rest, [Space] to exit</div>';
            html += '</div>';
            return html;
        }
        
        function generateSmithContent() {
            let html = '<div style="width: 80%; max-width: 800px; text-align: left;">';
            html += '<div style="font-size: 2rem; color: gold; margin-bottom: 20px; text-align: center;">THE SMITHY</div>';
            html += `<div style="margin-bottom: 15px; text-align: center;">Your Gold: <span style="color: gold;">${player.gold}</span></div>`;
            
            html += '<div style="background: rgba(50,20,0,0.7); padding: 15px; margin-bottom: 10px; border: 2px solid #c84;">';
            html += '<div style="font-size: 1.3rem; color: #fa6; margin-bottom: 10px;">Services</div>';
            html += '<div style="padding: 5px;">[1] Buy Armor - Various pieces available (50-600g)</div>';
            html += '<div style="padding: 5px;">[2] Repair Equipment - Restore durability (30g per item)</div>';
            html += '<div style="padding: 5px;">[3] Upgrade Weapon - Increase attack +5 (100g + materials)</div>';
            html += '<div style="padding: 5px;">[4] Forge Special Item - Combine items (200g + materials)</div>';
            html += '</div>';
            
            // Show equipped weapons
            html += '<div style="background: rgba(20,20,40,0.7); padding: 10px; margin-top: 10px; border: 2px solid #48a;">';
            html += '<div style="font-size: 1.1rem; color: #8cf; margin-bottom: 5px;">Your Equipment</div>';
            html += `<div>Primary: ${player.primaryWeapon || 'None'}</div>`;
            html += `<div>Secondary: ${player.secondaryWeapon || 'None'}</div>`;
            html += '</div>';
            
            html += '<div style="margin-top: 15px; color: #aaa; text-align: center;">Press [1-4] for service, [Space] to exit</div>';
            html += '</div>';
            return html;
        }
        
        // ==== GUILD HANDLERS ====
        function handleGuildChoice(choice) {
            if (player.currentGuild) return; // Already in a guild
            
            const guildKeys = Object.keys(guilds);
            if (choice < 1 || choice > guildKeys.length) return;
            
            const guildKey = guildKeys[choice - 1];
            const guild = guilds[guildKey];
            
            // Check requirements
            if (player.gold < 100) {
                alert('Not enough gold! (Need 100g)');
                return;
            }
            if (player.baseStats[guild.joinReq.stat] < guild.joinReq.min) {
                alert(`You need ${guild.joinReq.stat} ${guild.joinReq.min}+ to join this guild.`);
                return;
            }
            
            // Join guild
            player.gold -= 100;
            player.currentGuild = guildKey;
            player.guildRank = 1;
            player.guildReputation[guildKey] = 10;
            alert(`Welcome to the ${guild.name}! You are now a ${guild.ranks[0]}.`);
            
            // Refresh display
            if (player.inSpecialRoom) {
                specialRoomOverlay.innerHTML = generateGuildContent() + 
                    '<div style="margin-top: 30px; font-size: 0.9rem; color: #888;">Press Space Bar to exit</div>';
            }
            updateHUD();
        }
        
        function handleGuildRankUp() {
            if (!player.currentGuild || player.guildRank >= 5) return;
            
            const guild = guilds[player.currentGuild];
            const nextRank = player.guildRank + 1;
            const benefits = guild.benefits[nextRank];
            
            // Check requirements
            if (player.gold < 100) {
                alert('Not enough gold! (Need 100g)');
                return;
            }
            
            // Check quest requirements
            if (benefits.questReq && player.monstersDefeated < benefits.questReq) {
                alert(`Quest incomplete: Slay ${benefits.questReq} monsters (${player.monstersDefeated}/${benefits.questReq})`);
                return;
            }
            if (benefits.bossReq && player.bossesDefeated < 1) {
                alert('Quest incomplete: Defeat a boss');
                return;
            }
            
            // Rank up
            player.gold -= 100;
            player.guildRank = nextRank;
            player.guildReputation[player.currentGuild] += 20;
            alert(`Promoted to ${guild.ranks[nextRank - 1]}!`);
            
            // Refresh display
            if (player.inSpecialRoom) {
                specialRoomOverlay.innerHTML = generateGuildContent() + 
                    '<div style="margin-top: 30px; font-size: 0.9rem; color: #888;">Press Space Bar to exit</div>';
            }
            updateHUD();
        }
        
        function handleGuildLeave() {
            if (!player.currentGuild) return;
            
            if (confirm('Leave your guild? You will lose all rank and reputation.')) {
                player.currentGuild = null;
                player.guildRank = 0;
                
                // Refresh display
                if (player.inSpecialRoom) {
                    specialRoomOverlay.innerHTML = generateGuildContent() + 
                        '<div style="margin-top: 30px; font-size: 0.9rem; color: #888;">Press Space Bar to exit</div>';
                }
                updateHUD();
            }
        }
        
        // ==== SHOP HANDLERS ====
        function handleShopBuy(index) {
            let item, category;
            if (index < 5) {
                category = 'weapon';
                item = shops.weapons[index];
            } else {
                category = 'potion';
                item = shops.potions[index - 5];
            }
            
            if (!item) return;
            
            if (player.gold < item.price) {
                alert('Not enough gold!');
                return;
            }
            
            // Buy item
            player.gold -= item.price;
            const invItem = player.inventory.find(i => i.name === item.name);
            if (invItem) {
                invItem.count++;
            } else {
                player.inventory.push({ name: item.name, count: 1, equipped: false });
            }
            
            alert(`Purchased ${item.name} for ${item.price} gold!`);
            
            // Refresh display
            if (player.inSpecialRoom) {
                specialRoomOverlay.innerHTML = generateShopContent() + 
                    '<div style="margin-top: 30px; font-size: 0.9rem; color: #888;">Press Space Bar to exit</div>';
            }
            updateHUD();
        }
        
        // ==== INN HANDLERS ====
        function handleInnRest(choice) {
            const roomTypes = ['Poor Room', 'Common Room', 'Private Room', 'Luxury Suite'];
            const roomType = roomTypes[choice - 1];
            const service = innServices[roomType];
            
            if (!service) return;
            
            if (player.gold < service.cost) {
                alert('Not enough gold!');
                return;
            }
            
            // Pay and rest
            player.gold -= service.cost;
            const healAmount = Math.floor(player.baseStats.Stamina * service.healPercent);
            player.hitpoints = Math.min(player.baseStats.Stamina, player.hitpoints + healAmount);
            
            let message = `You rest in the ${roomType}.\nRestored ${healAmount} HP!`;
            
            // Add bonus XP if applicable
            if (service.bonusXP) {
                player.experience += service.bonusXP;
                message += `\n+${service.bonusXP} XP!`;
                checkLevelUp();
            }
            
            // Check for risks
            if (Math.random() < service.riskAmbush) {
                message += '\n\nYou were ambushed during the night!';
                alert(message);
                exitSpecialRoom();
                startBattle();
                return;
            }
            
            if (Math.random() < service.riskTheft) {
                const stolenGold = Math.min(player.gold, Math.floor(20 + Math.random() * 50));
                player.gold -= stolenGold;
                message += `\n\nA thief stole ${stolenGold} gold while you slept!`;
            }
            
            if (Math.random() < service.riskDisease) {
                message += '\n\nYou contracted a disease! (Temporary stat reduction)';
                // Could implement disease mechanic here
            }
            
            alert(message);
            
            // Refresh display
            if (player.inSpecialRoom) {
                specialRoomOverlay.innerHTML = generateInnContent() + 
                    '<div style="margin-top: 30px; font-size: 0.9rem; color: #888;">Press Space Bar to exit</div>';
            }
            updateHUD();
        }
        
        // ==== SMITH HANDLERS ====
        function handleSmithService(choice) {
            if (choice === 1) {
                // Buy armor - simple implementation
                const armorItem = shops.armor[Math.floor(Math.random() * shops.armor.length)];
                if (player.gold >= armorItem.price) {
                    player.gold -= armorItem.price;
                    player.inventory.push({ name: armorItem.name, count: 1, equipped: false });
                    alert(`Purchased ${armorItem.name} for ${armorItem.price} gold!`);
                } else {
                    alert('Not enough gold!');
                }
            } else if (choice === 2) {
                // Repair - simple implementation
                if (player.gold >= 30) {
                    player.gold -= 30;
                    alert('Equipment repaired! Durability restored.');
                } else {
                    alert('Not enough gold! (Need 30g)');
                }
            } else if (choice === 3) {
                // Upgrade weapon
                if (!player.primaryWeapon) {
                    alert('No weapon equipped!');
                    return;
                }
                if (player.gold >= 100) {
                    player.gold -= 100;
                    alert(`Upgraded ${player.primaryWeapon}! Attack increased.`);
                } else {
                    alert('Not enough gold! (Need 100g)');
                }
            } else if (choice === 4) {
                // Forge special item
                if (player.gold >= 200) {
                    player.gold -= 200;
                    alert('Forged a special item! Check your inventory.');
                    player.inventory.push({ name: 'Forged Blade', count: 1, equipped: false });
                } else {
                    alert('Not enough gold! (Need 200g)');
                }
            }
            
            // Refresh display
            if (player.inSpecialRoom) {
                specialRoomOverlay.innerHTML = generateSmithContent() + 
                    '<div style="margin-top: 30px; font-size: 0.9rem; color: #888;">Press Space Bar to exit</div>';
            }
            updateHUD();
        }
        
        function exitSpecialRoom() {
            player.inSpecialRoom = false;
            player.currentSpecialRoom = null;
            isPaused = false;
            specialRoomOverlay.style.display = 'none';
        }

        // Win battle logic
        function winBattle() {
            if (!player.inBattle || !player.currentMonster) return;

            const monster = player.currentMonster;
            
            // Award EXP and Gold
            player.experience += monster.exp;
            player.gold += monster.gold;
            player.monstersDefeated++;
            
            // Check if this was a boss
            if (monster.isBoss) {
                player.bossesDefeated++;
                bossDefeated[currentLevel] = true;
                
                if (monster.finalBoss) {
                    player.hasDefeatedFinalBoss = true;
                    setTimeout(() => {
                        alert('VICTORY! You have defeated The Dark One and completed the dungeon!\n\nThe curse is lifted. The realm is safe once more.\n\nYou have proven yourself a true hero!');
                        showVictoryScreen();
                    }, 1500);
                }
            }
            
            // Check for level up
            checkLevelUp();
            
            // Drop Items
            const tile = worldToTile(camera.position.x, camera.position.z);
            const tileKey = `${tile.tx},${tile.ty}`;
            
            if (!player.groundItems[tileKey]) {
                player.groundItems[tileKey] = [];
            }

            // Drop equipment
            if (monster.equipment && monster.equipment.length > 0) {
                monster.equipment.forEach(item => {
                    player.groundItems[tileKey].push(item);
                });
            }
            
            // Drop loot from bosses
            if (monster.loot && monster.loot.length > 0) {
                monster.loot.forEach(item => {
                    player.groundItems[tileKey].push(item);
                });
            }
            
            // Clean up
            player.inBattle = false;
            player.currentMonster = null;
            player.battleLog = [];
            isPaused = false;
            
            // Hide overlay
            monsterOverlay.style.display = 'none';
            
            updateHUD();
        }
        
        function showVictoryScreen() {
            const victoryOverlay = document.createElement('div');
            victoryOverlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to bottom, rgba(0,50,0,0.9), rgba(50,100,0,0.9)); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 100; color: gold; font-family: monospace;';
            victoryOverlay.innerHTML = `
                <div style="font-size: 3rem; margin-bottom: 20px; text-shadow: 2px 2px 4px black;">VICTORY!</div>
                <div style="font-size: 1.5rem; margin-bottom: 40px; color: white;">You have defeated The Dark One</div>
                <div style="background: rgba(0,0,0,0.7); padding: 30px; border: 3px solid gold; max-width: 600px;">
                    <div style="font-size: 1.2rem; margin-bottom: 15px;">Final Stats:</div>
                    <div style="color: white; line-height: 1.8;">
                        Level: ${player.level}<br>
                        Monsters Defeated: ${player.monstersDefeated}<br>
                        Bosses Defeated: ${player.bossesDefeated}<br>
                        Gold Earned: ${player.gold}<br>
                        Guild: ${player.currentGuild || 'None'} ${player.guildRank ? `(Rank ${player.guildRank})` : ''}<br>
                    </div>
                </div>
                <div style="margin-top: 30px; font-size: 1rem; color: #aaa;">Press F5 to play again</div>
            `;
            container.appendChild(victoryOverlay);
        }

        function loseGame() {
            player.inBattle = false;
            player.currentMonster = null;
            player.battleLog = [];
            isPaused = true;
            
            // Show death screen
            const deathOverlay = document.createElement('div');
            deathOverlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(100,0,0,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 100; color: white; font-family: monospace;';
            
            let html = '<div style="font-size: 3rem; margin-bottom: 20px; color: red; text-shadow: 2px 2px 4px black;">YOU DIED</div>';
            html += '<div style="font-size: 1.2rem; margin-bottom: 40px;">The darkness claims another soul...</div>';
            html += '<div style="background: rgba(0,0,0,0.7); padding: 30px; border: 2px solid red; max-width: 600px;">';
            html += `<div style="font-size: 1rem; color: #ccc; line-height: 1.8;">
                Level Reached: ${player.level}<br>
                Deepest Floor: ${Math.max(player.dungeonDepth, currentLevel + 1)}<br>
                Monsters Defeated: ${player.monstersDefeated}<br>
                Gold Earned: ${player.gold}<br>
                ${player.currentGuild ? `Guild: ${player.currentGuild} (Rank ${player.guildRank})` : 'No Guild'}
            </div>`;
            html += '</div>';
            
            // Check if player can resurrect (if in Clerics guild at max rank)
            if (player.currentGuild === 'Clerics' && player.guildRank === 5 && player.gold >= 500) {
                html += '<div style="margin-top: 30px; background: rgba(0,100,100,0.7); padding: 20px; border: 2px solid cyan;">';
                html += '<div style="color: cyan; font-size: 1.2rem; margin-bottom: 10px;">DIVINE INTERVENTION</div>';
                html += '<div style="color: white;">Your faith grants you a second chance!</div>';
                html += '<div style="margin-top: 10px;">Press <span style="color: lime; font-weight: bold;">R</span> to Resurrect (500 gold)</div>';
                html += '<div style="margin-top: 5px; color: #888;">Press any other key to accept death</div>';
                html += '</div>';
                
                deathOverlay.innerHTML = html;
                container.appendChild(deathOverlay);
                
                // Add resurrection handler
                const resurrectHandler = (e) => {
                    if (e.code === 'KeyR') {
                        player.gold -= 500;
                        player.hitpoints = Math.floor(player.baseStats.Stamina * 0.5);
                        container.removeChild(deathOverlay);
                        isPaused = false;
                        document.removeEventListener('keydown', resurrectHandler);
                        updateHUD();
                        alert('You have been resurrected by divine power!');
                    } else {
                        document.removeEventListener('keydown', resurrectHandler);
                        location.reload();
                    }
                };
                document.addEventListener('keydown', resurrectHandler);
            } else {
                html += '<div style="margin-top: 30px; font-size: 1rem; color: #888;">Press any key to return to the beginning...</div>';
                deathOverlay.innerHTML = html;
                container.appendChild(deathOverlay);
                
                // Reload on any key
                document.addEventListener('keydown', () => location.reload(), { once: true });
            }
        }

        // Helper: Get simple stats for an item name (since we don't have full item DB in JS)
        function getItemStats(name) {
            if (!name) return { attack: 0, defense: 0 };
            // Very rough estimation based on lists
            if (highTierWeapons.includes(name)) return { attack: 30, defense: 5 };
            if (lowTierWeapons.includes(name)) return { attack: 10, defense: 2 };
            
            // Check for armor defense values
            if (armorStats[name]) {
                return { attack: 0, defense: armorStats[name].defense };
            }
            
            // Clothing provides 0 defense (but may have magical effects)
            if (clothingItems.includes(name)) return { attack: 0, defense: 0 };
            if (name.includes("Shield")) return { attack: 2, defense: 15 };
            return { attack: 0, defense: 0 };
        }

        // Helper: Get total player combat stats
        function getPlayerCombatStats() {
            let attack = player.stats.Strength; // Base attack from strength
            let defense = Math.floor(player.stats.Strength / 2); // Base defense
            let skill = player.stats.Skill;
            
            // Primary weapon adds attack
            if (player.primaryWeapon) {
                const primaryStats = getItemStats(player.primaryWeapon);
                attack += primaryStats.attack;
            }
            
            // Secondary weapon adds defense only
            if (player.secondaryWeapon) {
                const secondaryStats = getItemStats(player.secondaryWeapon);
                defense += secondaryStats.defense;
                
                // If primary is two-handed and we have a secondary, skill drops by 50%
                if (player.primaryWeapon && isTwoHanded(player.primaryWeapon)) {
                    skill = Math.floor(skill * 0.5);
                }
            }
            
            // Add defense from equipped clothing
            for (const bodyPart in player.equippedClothing) {
                const equippedClothing = player.equippedClothing[bodyPart];
                if (equippedClothing) {
                    const clothingStats = getItemStats(equippedClothing);
                    defense += clothingStats.defense;
                }
            }
            
            return {
                attack: attack,
                defense: defense,
                skill: skill,
                speed: player.stats.Speed
            };
        }

        function updateBattleOverlay() {
            if (!player.inBattle || !player.currentMonster) return;
            const monster = player.currentMonster;
            
            let equipStr = "";
            if (monster.equipment && monster.equipment.length > 0) {
                equipStr = `<div style="color: cyan; margin-top: 5px; font-size: 0.9rem;">Wielding: ${monster.equipment.join(", ")}</div>`;
            }

            let logHtml = "";
            if (player.battleLog && player.battleLog.length > 0) {
                 // Show last 4 entries
                 const recent = player.battleLog.slice(-4);
                 logHtml = `<div style="margin-top: 15px; font-size: 0.9rem; text-align: left; width: 80%; background: rgba(0,0,0,0.5); padding: 5px;">
                    ${recent.map(l => `<div>${l}</div>`).join('')}
                 </div>`;
            }

            monsterOverlay.innerHTML = `
                <div style="font-size: 2rem; color: red; margin-bottom: 20px;">ENCOUNTER!</div>
                <div style="font-size: 1.5rem; color: gold; margin-bottom: 10px;">${monster.name}</div>
                <div style="margin-bottom: 5px;">Level: ${monster.level}</div>
                <div style="margin-bottom: 5px;">HP: ${monster.hitpoints}</div>
                <div style="margin-bottom: 5px;">Attack: ${monster.attack}</div>
                <div style="margin-bottom: 5px;">Defense: ${monster.defense}</div>
                ${equipStr}
                ${logHtml}
                <div style="margin-top: 20px; color: #aaa;">
                    <div>1. Attack</div>
                    <div>2. Charge (-Hit, +Dmg)</div>
                    <div>3. Aimed (+Hit, +Dmg, Slow)</div>
                    <div>4. Transact</div>
                    <div>5. Switch Weapon [${player.primaryWeapon || 'Bare Hands'}]</div>
                    <div>6. Run</div>
                </div>
            `;
        }

        function combatLog(msg) {
            if (!player.battleLog) player.battleLog = [];
            player.battleLog.push(msg);
            updateBattleOverlay();
        }

        function executeMonsterTurn() {
            const monster = player.currentMonster;
            if (!monster || monster.hitpoints <= 0) return;

            // Simple monster AI: Attack
            // Hit chance: Base 70% + (MonsterLvl*2 - PlayerSpeed)
            // Note: Speed is ~10-20. Level 1-20.
            const hitChance = 70 + (monster.level * 2 - player.stats.Speed);
            const roll = Math.random() * 100;
            
            if (roll < hitChance) {
                // Hit
                const pStats = getPlayerCombatStats();
                let dmg = Math.max(1, monster.attack - (pStats.defense / 2));
                dmg = Math.floor(dmg * (0.8 + Math.random() * 0.4)); // +/- 20% variance
                
                player.hitpoints -= dmg;
                combatLog(`<span style="color: #f88;">${monster.name} hits you for ${dmg} damage!</span>`);
                
                if (player.hitpoints <= 0) {
                    setTimeout(loseGame, 1000);
                }
            } else {
                combatLog(`<span style="color: #8f8;">${monster.name} missed you!</span>`);
            }
            updateBattleOverlay();
            updateHUD();
            player.waitingForTurn = false;
        }

        function executePlayerAction(action) {
            if (player.waitingForTurn) return; // Prevent spam
            
            const monster = player.currentMonster;
            const pStats = getPlayerCombatStats();
            
            // Base Hit Chance: 70% + (PlayerSkill - MonsterLvl*2)
            let baseHit = 70 + (pStats.skill - monster.level * 2);
            let damageMult = 1.0;
            
            if (action === 1) { // Attack
                // Standard
            } else if (action === 2) { // Charge
                baseHit -= 20;
                damageMult = 1.5;
            } else if (action === 3) { // Aimed
                if (Math.random() < 0.3) {
                    combatLog(`<span style="color: #fe8;">You wait for an opening...</span>`);
                    player.waitingForTurn = true;
                    setTimeout(executeMonsterTurn, 800);
                    updateBattleOverlay();
                    return;
                }
                baseHit += 30;
                damageMult = 1.3;
            } else if (action === 4) { // Transact
                 // Charisma Check
                 const chance = 30 + (player.stats.Charisma - monster.level) * 5;
                 if (Math.random() * 100 < chance) {
                     combatLog(`<span style="color: cyan;">You calmed the ${monster.name}.</span>`);
                     setTimeout(winBattle, 1000);
                     return;
                 } else {
                     combatLog("Transact failed.");
                     player.waitingForTurn = true;
                     setTimeout(executeMonsterTurn, 800);
                     return;
                 }
            } else if (action === 5) { // Switch Weapon
                // Swap primary and secondary weapons
                const temp = player.primaryWeapon;
                player.primaryWeapon = player.secondaryWeapon;
                player.secondaryWeapon = temp;
                const newWeapon = player.primaryWeapon || 'Bare Hands';
                combatLog(`<span style="color: #8ff;">Switched to ${newWeapon}!</span>`);
                updateBattleOverlay();
                updateHUD();
                return; // Switching weapon doesn't end turn
            } else if (action === 6) { // Run
                // Speed Check
                const chance = 50 + (player.stats.Speed - monster.level * 2) * 5;
                if (Math.random() * 100 < chance) {
                    player.inBattle = false;
                    player.currentMonster = null;
                    monsterOverlay.style.display = 'none';
                    isPaused = false;
                    combatLog("You ran away!");
                    updateHUD();
                    return;
                } else {
                    combatLog("Failed to run!");
                    player.waitingForTurn = true;
                    setTimeout(executeMonsterTurn, 800);
                    return;
                }
            } else {
                // Pass
            }

            if (action >= 1 && action <= 3) {
                const roll = Math.random() * 100;
                if (roll < baseHit) {
                    // Hit
                    let dmg = Math.max(1, (pStats.attack - monster.defense / 2));
                    dmg = Math.floor(dmg * damageMult * (0.8 + Math.random() * 0.4));
                    
                    monster.hitpoints -= dmg;
                    combatLog(`<span style="color: #ff0;">You hit ${monster.name} for ${dmg} damage!</span>`);
                    
                    if (monster.hitpoints <= 0) {
                        combatLog(`<span style="color: lime;">You defeated ${monster.name}!</span>`);
                        setTimeout(winBattle, 1000);
                        return;
                    }
                } else {
                    combatLog(`<span style="color: #aaa;">You missed ${monster.name}.</span>`);
                }
            }
            
            player.waitingForTurn = true;
            setTimeout(executeMonsterTurn, 800);
            updateBattleOverlay();
        }

        // Start a battle encounter
        function startBattle(forcedMonster = null) {
            if (player.inBattle || isPaused) return;
            
            const monster = forcedMonster || getRandomMonster(player.level);
            player.currentMonster = monster;
            player.inBattle = true;
            player.battleLog = []; // Reset log
            player.waitingForTurn = false;
            isPaused = true;
            
            updateBattleOverlay();
            monsterOverlay.style.display = 'flex';
            
            // Hide pause overlay if visible
            const pauseOverlay = document.getElementById('pause-overlay');
            if (pauseOverlay) pauseOverlay.style.display = 'none';
            
            updateHUD();
        }
        
        // Check for boss encounter on floor
        function checkBossEncounter() {
            if (bossDefeated[currentLevel]) return false; // Boss already defeated
            
            // Find boss for this floor
            const boss = bossMonsters.find(b => b.floor === currentLevel);
            if (!boss) return false;
            
            // 5% chance per second to encounter boss if not yet defeated
            if (Math.random() < 0.05) {
                // Create boss monster
                const bossMonster = {
                    name: boss.name,
                    level: boss.level,
                    hitpoints: boss.hitpoints,
                    attack: boss.attack,
                    defense: boss.defense,
                    exp: boss.exp,
                    gold: boss.gold,
                    abilities: boss.abilities,
                    loot: boss.loot,
                    equipment: [],
                    isBoss: true,
                    finalBoss: boss.finalBoss || false
                };
                
                startBattle(bossMonster);
                return true;
            }
            return false;
        }

        // Game timer for temporary effects and encounters
        let gameTime = 0;
        setInterval(() => {
            gameTime++;
            
            // Random encounters (re-enabled with balance)
            if (!player.inBattle && !isPaused && !isInteractionMenuOpen()) {
                // Check for boss encounter first (5% chance)
                if (!checkBossEncounter()) {
                    // Regular monster encounter
                    // Base 8% per second, reduced by Speed stat
                    const encounterChance = 0.08 - (player.stats.Speed * 0.001);
                    const finalChance = Math.max(0.02, encounterChance); // Min 2%, max ~8%
                    
                    if (Math.random() < finalChance) {
                        startBattle();
                    }
                }
            }
            
            // Update temporary potion effects
            let effectsExpired = false;
            for (const effect in player.temporaryEffects) {
                if (player.temporaryEffects[effect].active) {
                    player.temporaryEffects[effect].duration--;
                    if (player.temporaryEffects[effect].duration <= 0) {
                        player.temporaryEffects[effect].active = false;
                        effectsExpired = true;
                    }
                }
            }
            
            // Recalculate stats if effects expired
            if (effectsExpired) {
                recalculateStats();
                updateHUD();
            }
        }, 1000); // Update every second (1 game minute)

        function updateCompass() {
            // Only show compass if player has one
            const hasCompass = player.inventory.some(i => i.name === 'Compass' && i.count > 0);
            const compassContainer = document.getElementById('compass-container');
            if (compassContainer) {
                 compassContainer.style.display = hasCompass ? 'block' : 'none';
            }
            
            if (!hasCompass) return;

            const compassDial = document.getElementById('compass-dial');
            if (!compassDial) return;

            // Normalize yaw to 0-2PI
            let angle = yaw % (Math.PI * 2);
            // Yaw is rotation around Y. 
            // 0 = Facing -Z (North). 
            // PI/2 = Facing -X (West). 
            // PI = Facing +Z (South). 
            // 3PI/2 = Facing +X (East).
            // (Assuming standard counter-clockwise rotation for positive angles in right-handed coords)
            
            // We want the dial to rotate so that the direction we are facing is at the top.
            // If we face North (0), N is at top. Rotation 0.
            // If we face West (PI/2), W is at top. The dial must rotate so W (which is at 270 deg on dial) is at top (0 deg).
            // Actually, let's visualize the dial:
            // N is at 12 o'clock (0 deg visual).
            // E is at 3 o'clock (90 deg visual).
            // S at 6 o'clock (180 deg visual).
            // W at 9 o'clock (270 deg visual).
            
            // If player faces West (yaw = PI/2), we want W to be at 12 o'clock.
            // So we need to rotate the dial by +90 degrees (clockwise)? No, +90 makes N go to 3 o'clock.
            // To bring W (at 9 o'clock) to 12 o'clock, we rotate +90 deg.
            
            // Wait, let's map:
            // Yaw 0 (North) -> Dial 0.
            // Yaw PI/2 (Left/West) -> Dial +90 deg?
            // If I turn left, the world rotates right. The compass needle stays fixed (North), but the casing moves?
            // The user request: "a circle with the top part being the direction the player is facing".
            // This is a "Heading Indicator" style.
            // So if I face North, N is top.
            // If I face West, W is top.
            
            // My dial text is fixed relative to the dial div: N top, E right, S bottom, W left.
            // If I want W at top, I must rotate the dial div by +90 deg (clockwise).
            // If I want E at top, I must rotate -90 deg.
            
            // Relation:
            // West is Yaw PI/2 (if A/Left increases yaw).
            // If Yaw = PI/2, Rotation = +90 deg.
            // East is Yaw -PI/2 (if D/Right decreases yaw).
            // If Yaw = -PI/2, Rotation = -90 deg.
            
            // So Rotation (deg) = Yaw (rad) * (180/PI).
            
            // Let's verify "Left" increases yaw in my code.
            // if (e.code === 'KeyA' || e.code === 'ArrowLeft') yaw += step;
            // Yes.
            
            // So Rotation = Yaw converted to degrees.
            const deg = yaw * (180 / Math.PI);
            compassDial.style.transform = `rotate(${deg}deg)`;
            
            // Time display logic
            const hasTimepiece = player.inventory.some(i => i.name === 'Timepiece' && i.count > 0);
            const timeEl = document.getElementById('time-display');
            if (timeEl) {
                // Placeholder time - can implement dynamic time later
                timeEl.textContent = hasTimepiece ? "12:00 PM" : ""; 
            }
        }

        // Controls
        // Base speed 0.1, modified by Speed stat (e.g., +0.001 per point)
        const minSpeedStat = 5;
        const maxSpeedStat = 50;
        const minMoveSpeed = 0.08;
        const maxMoveSpeed = 0.3;

        function computeMoveSpeed(speedStat) {
            const clamped = Math.max(minSpeedStat, Math.min(maxSpeedStat, speedStat));
            const t = (clamped - minSpeedStat) / (maxSpeedStat - minSpeedStat);
            return minMoveSpeed + (maxMoveSpeed - minMoveSpeed) * t;
        }

        const moveSpeed = computeMoveSpeed(player.stats.Speed);
        const lookSpeed = 0.002;
        const turnSpeed = 0.03;
        const playerRadius = 0.6;
        let pitch = 0;
        let yaw = 0;
        let verticalVelocity = 0;
        const gravity = 0.01;
        const jumpStrength = 0.2;
        const standHeight = 1.6;
        const crouchHeight = 0.8;
        let isGrounded = true;

        // Place the player in the dungeon at tile (51, 61)
        const playerStartX = (playerStartTile.x - MAP_WIDTH / 2) * TILE_SIZE + TILE_SIZE / 2;
        const playerStartZ = (playerStartTile.y - MAP_HEIGHT / 2) * TILE_SIZE + TILE_SIZE / 2;

        const keys = {};
        let isPaused = false;
        let lastTileKey = null; // Track current tile for ground items updates
        let saveRequestPending = false; // Debounce for save requests
        
        // Expose save pending reset for Blazor to call
        window.game._resetSavePending = function() {
            saveRequestPending = false;
        };

        if (cameraState && typeof cameraState === 'object') {
            // Blazor JS interop sends properties in camelCase, so check for both cases
            const cx = typeof cameraState.x === 'number' ? cameraState.x : 
                       (typeof cameraState.X === 'number' ? cameraState.X : playerStartX);
            const cy = typeof cameraState.y === 'number' ? cameraState.y : 
                       (typeof cameraState.Y === 'number' ? cameraState.Y : standHeight);
            const cz = typeof cameraState.z === 'number' ? cameraState.z : 
                       (typeof cameraState.Z === 'number' ? cameraState.Z : playerStartZ);
            const cyaw = typeof cameraState.yaw === 'number' ? cameraState.yaw : 
                         (typeof cameraState.Yaw === 'number' ? cameraState.Yaw : 0);

            camera.position.set(cx, cy, cz);
            yaw = cyaw;
        } else {
            camera.position.set(playerStartX, standHeight, playerStartZ);
        }

        document.addEventListener('keydown', (e) => {
            keys[e.code] = true;
            
            // Exit special room with Space Bar
            if (e.code === 'Space' && player.inSpecialRoom) {
                exitSpecialRoom();
                return;
            }
            
            // Handle special room interactions
            if (player.inSpecialRoom && player.currentSpecialRoom) {
                const entrance = player.currentSpecialRoom.entrance;
                
                // Guild interactions
                if (entrance === 'N') {
                    if (e.code === 'Digit1' || e.code === 'Numpad1') handleGuildChoice(1);
                    if (e.code === 'Digit2' || e.code === 'Numpad2') handleGuildChoice(2);
                    if (e.code === 'Digit3' || e.code === 'Numpad3') handleGuildChoice(3);
                    if (e.code === 'Digit4' || e.code === 'Numpad4') handleGuildChoice(4);
                    if (e.code === 'Digit5' || e.code === 'Numpad5') handleGuildChoice(5);
                    if (e.code === 'KeyU') handleGuildRankUp();
                    if (e.code === 'KeyL') handleGuildLeave();
                }
                
                // Shop interactions
                if (entrance === 'E') {
                    if (e.code === 'Digit1' || e.code === 'Numpad1') handleShopBuy(0);
                    if (e.code === 'Digit2' || e.code === 'Numpad2') handleShopBuy(1);
                    if (e.code === 'Digit3' || e.code === 'Numpad3') handleShopBuy(2);
                    if (e.code === 'Digit4' || e.code === 'Numpad4') handleShopBuy(3);
                    if (e.code === 'Digit5' || e.code === 'Numpad5') handleShopBuy(4);
                    if (e.code === 'Digit6' || e.code === 'Numpad6') handleShopBuy(5);
                    if (e.code === 'Digit7' || e.code === 'Numpad7') handleShopBuy(6);
                    if (e.code === 'Digit8' || e.code === 'Numpad8') handleShopBuy(7);
                    if (e.code === 'Digit9' || e.code === 'Numpad9') handleShopBuy(8);
                }
                
                // Inn interactions
                if (entrance === 'S') {
                    if (e.code === 'Digit1' || e.code === 'Numpad1') handleInnRest(1);
                    if (e.code === 'Digit2' || e.code === 'Numpad2') handleInnRest(2);
                    if (e.code === 'Digit3' || e.code === 'Numpad3') handleInnRest(3);
                    if (e.code === 'Digit4' || e.code === 'Numpad4') handleInnRest(4);
                }
                
                // Smith interactions
                if (entrance === 'W') {
                    if (e.code === 'Digit1' || e.code === 'Numpad1') handleSmithService(1);
                    if (e.code === 'Digit2' || e.code === 'Numpad2') handleSmithService(2);
                    if (e.code === 'Digit3' || e.code === 'Numpad3') handleSmithService(3);
                    if (e.code === 'Digit4' || e.code === 'Numpad4') handleSmithService(4);
                }
                
                return; // Don't process other keys in special rooms
            }

            // Block movement/turning when interaction menu is open
            if (!isInteractionMenuOpen()) {
                const step = Math.PI / 2;

                if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
                    yaw += step;
                }
                if (e.code === 'KeyD' || e.code === 'ArrowRight') {
                    yaw -= step;
                }

                yaw = Math.round(yaw / step) * step;

                if (e.code === 'KeyA' || e.code === 'ArrowLeft' || e.code === 'KeyD' || e.code === 'ArrowRight') {
                    const tile = worldToTile(camera.position.x, camera.position.z);
                    const centerX = (tile.tx - MAP_WIDTH / 2) * TILE_SIZE + TILE_SIZE / 2;
                    const centerZ = (tile.ty - MAP_HEIGHT / 2) * TILE_SIZE + TILE_SIZE / 2;

                    if (Math.abs(Math.sin(yaw)) > 0.5) {
                        camera.position.z = centerZ;
                    } else {
                        camera.position.x = centerX;
                    }
                }
            }

            if (e.code === 'KeyP') {
                isPaused = !isPaused;
                const overlay = document.getElementById('pause-overlay');
                if (overlay) {
                    overlay.style.display = isPaused ? 'flex' : 'none';
                }
            }
            
            // Use stairs (Enter key)
            if (e.code === 'Enter' || e.code === 'NumpadEnter') {
                const tile = worldToTile(camera.position.x, camera.position.z);
                const tileType = getTileType(tile.tx, tile.ty);
                
                // Log stair usage
                logToFile(`[STAIR] Player attempting to use stairs at tile (${tile.tx}, ${tile.ty}) with type ${tileType} on level ${currentLevel}`);
                
                if (tileType === STAIRS_DOWN && currentLevel < NUM_LEVELS - 1) {
                    logToFile(`[STAIR] Going DOWN from level ${currentLevel} to ${currentLevel + 1}`);
                    changeLevel(currentLevel + 1);
                } else if (tileType === STAIRS_UP && currentLevel > 0) {
                    logToFile(`[STAIR] Going UP from level ${currentLevel} to ${currentLevel - 1}`);
                    changeLevel(currentLevel - 1);
                } else {
                    logToFile(`[STAIR] Cannot use stairs - type: ${tileType}, currentLevel: ${currentLevel}`);
                }
            }

            if (e.code === 'KeyI') {
                player.showInventory = !player.showInventory;
                player.showLoseMode = false; // Mutually exclusive
                player.showGetMode = false;
                player.showUseMode = false;
                player.showWeaponEquipMode = false;
                player.weaponToEquip = null;
                player.showClothingEquipMode = false;
                player.clothingToEquip = null;
                updateHUD();
            }

            if (e.code === 'KeyU') {
                const usableItems = player.inventory.filter(i => i.count > 0);
                player.showInventory = false;
                player.showLoseMode = false;
                player.showGetMode = false;
                player.showWeaponEquipMode = false;
                player.weaponToEquip = null;
                player.showClothingEquipMode = false;
                player.clothingToEquip = null;
                if (usableItems.length > 0) {
                    player.showUseMode = !player.showUseMode;
                    player.useItemIndex = 0;
                }
                updateHUD();
            }

            if (e.code === 'KeyL') {
                player.showLoseMode = !player.showLoseMode;
                player.showInventory = false; // Mutually exclusive
                player.showGetMode = false;
                player.showWeaponEquipMode = false;
                player.weaponToEquip = null;
                player.showClothingEquipMode = false;
                player.clothingToEquip = null;
                updateHUD();
            }

            // Get Mode (G key)
            if (e.code === 'KeyG') {
                const tile = worldToTile(camera.position.x, camera.position.z);
                const tileKey = `${tile.tx},${tile.ty}`;
                const itemsHere = player.groundItems[tileKey] || [];
                player.showInventory = false;
                player.showLoseMode = false;
                player.showWeaponEquipMode = false;
                player.weaponToEquip = null;
                player.showClothingEquipMode = false;
                player.clothingToEquip = null;
                if (itemsHere.length > 0) {
                    player.showGetMode = !player.showGetMode;
                    player.showNothingToGrab = false;
                    player.getItemIndex = 0;
                } else {
                    // Show "Nothing to Grab" feedback briefly
                    player.showGetMode = false;
                    player.showNothingToGrab = true;
                    setTimeout(() => {
                        player.showNothingToGrab = false;
                        updateHUD();
                    }, 1500);
                }
                updateHUD();
            }

            // Get Mode - Yes (Y key)
            if (player.showGetMode && e.code === 'KeyY') {
                const tile = worldToTile(camera.position.x, camera.position.z);
                const tileKey = `${tile.tx},${tile.ty}`;
                const itemsHere = player.groundItems[tileKey] || [];
                if (itemsHere.length > 0 && player.getItemIndex < itemsHere.length) {
                    const itemName = itemsHere[player.getItemIndex];
                    // Add to inventory
                    const invItem = player.inventory.find(i => i.name === itemName);
                    if (invItem) {
                        invItem.count++;
                    } else {
                        player.inventory.push({ name: itemName, count: 1 });
                    }
                    // Remove from ground at this tile
                    itemsHere.splice(player.getItemIndex, 1);
                    // Clean up empty tile
                    if (itemsHere.length === 0) {
                        delete player.groundItems[tileKey];
                    }
                    // Check if more items
                    if (!player.groundItems[tileKey] || player.getItemIndex >= player.groundItems[tileKey].length) {
                        player.showGetMode = false;
                        player.getItemIndex = 0;
                    }
                    updateHUD();
                }
            }

            // Get Mode - No (N key)
            if (player.showGetMode && e.code === 'KeyN') {
                const tile = worldToTile(camera.position.x, camera.position.z);
                const tileKey = `${tile.tx},${tile.ty}`;
                const itemsHere = player.groundItems[tileKey] || [];
                player.getItemIndex++;
                if (player.getItemIndex >= itemsHere.length) {
                    player.showGetMode = false;
                    player.getItemIndex = 0;
                }
                updateHUD();
            }

            // Get Mode - End (E key)
            if (player.showGetMode && e.code === 'KeyE') {
                player.showGetMode = false;
                player.getItemIndex = 0;
                updateHUD();
            }

            // Use Mode - Yes (Y key)
            if (player.showUseMode && e.code === 'KeyY') {
                const usableItems = player.inventory.filter(i => i.count > 0);
                if (usableItems.length > 0 && player.useItemIndex < usableItems.length) {
                    const item = usableItems[player.useItemIndex];
                    // Use the item according to its property
                    useItem(item);
                    updateHUD();
                }
            }

            // Use Mode - No (N key)
            if (player.showUseMode && e.code === 'KeyN') {
                const usableItems = player.inventory.filter(i => i.count > 0);
                player.useItemIndex++;
                if (player.useItemIndex >= usableItems.length) {
                    player.showUseMode = false;
                    player.useItemIndex = 0;
                }
                updateHUD();
            }

            // Use Mode - End (E key)
            if (player.showUseMode && e.code === 'KeyE') {
                player.showUseMode = false;
                player.useItemIndex = 0;
                updateHUD();
            }
            
            // Weapon Equip Mode - Primary (1 key)
            if (player.showWeaponEquipMode && e.code === 'Digit1') {
                equipWeapon('primary');
            }
            
            // Weapon Equip Mode - Secondary (2 key)
            if (player.showWeaponEquipMode && e.code === 'Digit2') {
                equipWeapon('secondary');
            }
            
            // Weapon Equip Mode - Cancel (E key)
            if (player.showWeaponEquipMode && e.code === 'KeyE') {
                player.weaponToEquip = null;
                player.showWeaponEquipMode = false;
                updateHUD();
            }
            
            // Clothing Equip Mode - Body parts (1-6 keys)
            if (player.showClothingEquipMode && e.code.startsWith('Digit')) {
                const digit = parseInt(e.code.replace('Digit', ''));
                if (digit >= 1 && digit <= bodyParts.length) {
                    const bodyPart = bodyParts[digit - 1];
                    equipClothing(bodyPart);
                }
            }
            
            // Clothing Equip Mode - Cancel (E key)
            if (player.showClothingEquipMode && e.code === 'KeyE') {
                player.clothingToEquip = null;
                player.showClothingEquipMode = false;
                updateHUD();
            }

            // Battle Mode - Select option (Keys 1-6)
            if (player.inBattle && e.code.startsWith('Digit')) {
                const digit = parseInt(e.code.replace('Digit', ''));
                if (digit >= 1 && digit <= 6) {
                    // Map keys to actions
                    executePlayerAction(digit);
                }
            }

            // Drop items in Lose Mode (Keys 1-9)
            if (!player.inBattle && player.showLoseMode && e.code.startsWith('Digit')) {
                const digit = parseInt(e.code.replace('Digit', ''));
                if (digit >= 1 && digit <= player.inventory.length) {
                    const itemIndex = digit - 1;
                    const item = player.inventory[itemIndex];
                    if (item.count > 0) {
                        item.count--;
                        // Add to current tile's ground items
                        const tile = worldToTile(camera.position.x, camera.position.z);
                        const tileKey = `${tile.tx},${tile.ty}`;
                        if (!player.groundItems[tileKey]) {
                            player.groundItems[tileKey] = [];
                        }
                        player.groundItems[tileKey].push(item.name);
                        updateHUD();
                    }
                }
            }

            if (e.code === 'KeyQ' && dotNetHelper) {
                // Debounce to prevent race conditions with rapid presses
                if (saveRequestPending) return;
                saveRequestPending = true;
                
                const payload = {
                    X: camera.position.x,
                    Y: camera.position.y,
                    Z: camera.position.z,
                    Yaw: yaw
                };

                dotNetHelper.invokeMethodAsync('OnSaveRequested', payload)
                    .finally(() => {
                        // Reset after a short delay to allow Blazor to update state
                        setTimeout(() => { saveRequestPending = false; }, 500);
                    });
            }
        });

        document.addEventListener('keyup', (e) => {
            keys[e.code] = false;
        });

        document.addEventListener('mousemove', (e) => {
            // Mouse look disabled; turning is handled via discrete key presses.
        });

        // Resize handler
        window.addEventListener('resize', () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });

        function animate() {
            requestAnimationFrame(animate);

            // Pause game when paused or interaction menu is open
            if (isPaused || isInteractionMenuOpen()) {
                renderer.render(scene, camera);
                return;
            }

            camera.rotation.set(0, 0, 0);
            camera.rotateY(yaw);

            updateCompass();

            // Check if player moved to a new tile and update ground items display
            const currentTile = worldToTile(camera.position.x, camera.position.z);
            const currentTileKey = `${currentTile.tx},${currentTile.ty}`;
            if (currentTileKey !== lastTileKey) {
                lastTileKey = currentTileKey;
                // Reset get mode if player moves to different tile
                if (player.showGetMode) {
                    player.showGetMode = false;
                    player.getItemIndex = 0;
                }
                if (player.showUseMode) {
                    player.showUseMode = false;
                    player.useItemIndex = 0;
                }
                updateHUD();
            }

            // 2. Movement Directions relative to new rotation
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            forward.y = 0;
            forward.normalize();

            // 3. Apply Movement with wall collision (no lateral motion)
            const move = new THREE.Vector3(0, 0, 0);

            // W/S - Forward/Back only
            if (keys['KeyW'] || keys['ArrowUp']) move.add(forward);
            if (keys['KeyS'] || keys['ArrowDown']) move.addScaledVector(forward, -1);

            if (move.lengthSq() > 0) {
                move.normalize();

                const nextPos = camera.position.clone().addScaledVector(move, moveSpeed);
                const stepTile = worldToTile(nextPos.x, nextPos.z);

                const collisionPos = nextPos.clone();
                if (move.x > 0) collisionPos.x += playerRadius;
                if (move.x < 0) collisionPos.x -= playerRadius;
                if (move.z > 0) collisionPos.z += playerRadius;
                if (move.z < 0) collisionPos.z -= playerRadius;

                const collisionTile = worldToTile(collisionPos.x, collisionPos.z);

                // Check for edge wall collision first (if using edge walls)
                const edgeCollision = checkEdgeWallCollision(collisionPos.x, collisionPos.z, playerRadius);
                
                if (isWalkable(collisionTile.tx, collisionTile.ty) && !edgeCollision) {
                    const centerX = (stepTile.tx - MAP_WIDTH / 2) * TILE_SIZE + TILE_SIZE / 2;
                    const centerZ = (stepTile.ty - MAP_HEIGHT / 2) * TILE_SIZE + TILE_SIZE / 2;

                    // Keep player centered in the hall: lock orthogonal axis to tile center
                    if (Math.abs(Math.sin(yaw)) > 0.5) {
                        // Facing mostly along X axis
                        camera.position.x = nextPos.x;
                        camera.position.z = centerZ;
                    } else {
                        // Facing mostly along Z axis
                        camera.position.x = centerX;
                        camera.position.z = nextPos.z;
                    }
                    
                    // Log successful movement
                    logToFile(`[MOVE] Movement successful: (${camera.position.x.toFixed(2)}, ${camera.position.z.toFixed(2)})`);
                } else if (isSpecialRoom(collisionTile.tx, collisionTile.ty)) {
                    // Check if player is approaching from the correct entrance direction
                    const entrance = getSpecialRoomEntrance(collisionTile.tx, collisionTile.ty);
                    const playerTile = worldToTile(camera.position.x, camera.position.z);
                    let validApproach = false;
                    
                    // Check approach direction matches entrance
                    if (entrance === 'N' && playerTile.ty < collisionTile.ty) validApproach = true; // Coming from North
                    else if (entrance === 'S' && playerTile.ty > collisionTile.ty) validApproach = true; // Coming from South
                    else if (entrance === 'E' && playerTile.tx > collisionTile.tx) validApproach = true; // Coming from East
                    else if (entrance === 'W' && playerTile.tx < collisionTile.tx) validApproach = true; // Coming from West
                    
                    if (validApproach) {
                        enterSpecialRoom(collisionTile.tx, collisionTile.ty, entrance);
                    } else {
                        logToFile(`[MOVE] BLOCKED: Wrong entrance direction for special room`);
                        triggerHitFlash(); // Can't enter from this side
                    }
                } else {
                    // Log movement blocking with details
                    const tileType = getTileType(collisionTile.tx, collisionTile.ty);
                    let blockReason = 'Unknown';
                    if (!isWalkable(collisionTile.tx, collisionTile.ty)) {
                        blockReason = `Tile not walkable (type: ${tileType})`;
                    } else if (edgeCollision) {
                        blockReason = 'Edge wall collision';
                    }
                    
                    logToFile(`[MOVE] BLOCKED: ${blockReason}`);
                    logToFile(`[MOVE] Position: (${camera.position.x.toFixed(2)}, ${camera.position.z.toFixed(2)})`);
                    logToFile(`[MOVE] Target tile: (${collisionTile.tx}, ${collisionTile.ty}), type: ${tileType}`);
                    logToFile(`[MOVE] Edge collision: ${edgeCollision}`);
                    
                    triggerHitFlash();
                }
            }

            // 4. Crouch (Z) - Determines target height
            // If jumping, we process gravity. If grounded, we lerp to target height? 
            // For simplicity: Base height is determined by crouch/stand. 
            // Jump adds offset to Y.
            // Actually, easiest physics: track Y position. 
            // Ground level is 0. 
            // Player height determines eye level. 
            
            const currentBaseHeight = keys['KeyZ'] ? crouchHeight : standHeight;

            // 5. Jump (Left Shift)
            if (keys['ShiftLeft'] && isGrounded && !keys['KeyZ']) {
                verticalVelocity = jumpStrength;
                isGrounded = false;
            }

            // 6. Physics / Gravity
            verticalVelocity -= gravity;
            camera.position.y += verticalVelocity;

            // 7. Collision / Landing
            if (camera.position.y <= currentBaseHeight) {
                camera.position.y = currentBaseHeight;
                verticalVelocity = 0;
                isGrounded = true;
            } else {
                isGrounded = false;
            }

            renderer.render(scene, camera);
        }

        animate();
    },

    // Public method to get current game state for saving
    getGameState: function() {
        const player = this._player;
        if (!player) return '{}';
        return JSON.stringify({
            name: player.name,
            level: player.level,
            hitpoints: player.hitpoints,
            experience: player.experience,
            gold: player.gold,
            stats: player.stats,
            baseStats: player.baseStats,  // Include base stats for proper save/load
            primaryWeapon: player.primaryWeapon,
            secondaryWeapon: player.secondaryWeapon,
            equippedClothing: player.equippedClothing,
            temporaryEffects: player.temporaryEffects,
            groundItems: player.groundItems,
            inventory: player.inventory,
            showInventory: player.showInventory,
            showLoseMode: player.showLoseMode,
            showGetMode: player.showGetMode,
            getItemIndex: player.getItemIndex,
            showUseMode: player.showUseMode,
            useItemIndex: player.useItemIndex,
            dungeonLevel: this._getCurrentLevel ? this._getCurrentLevel() : 0,
            // Guild system
            currentGuild: player.currentGuild,
            guildReputation: player.guildReputation,
            guildRank: player.guildRank,
            completedQuests: player.completedQuests,
            // Game progression
            dungeonDepth: Math.max(player.dungeonDepth, this._getCurrentLevel ? this._getCurrentLevel() : 0),
            hasDefeatedFinalBoss: player.hasDefeatedFinalBoss,
            monstersDefeated: player.monstersDefeated,
            bossesDefeated: player.bossesDefeated
        });
    }
};
