window.game = {
    _player: null, // Reference to current player state for saving
    initGame: function (containerId, playerStats, dotNetHelper, cameraState, mapData) {
        const container = document.getElementById(containerId);
        if (!container) return;

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

        // Add random trees (disabled in dungeon)
        // for (let i = 0; i < 50; i++) {
        //     const x = (Math.random() - 0.5) * 80;
        //     const z = (Math.random() - 0.5) * 80;
        //     createTree(x, z);
        // }

        // Dungeon layout - Multi-level
        const WALL = 1;
        const FLOOR = 0;
        const STAIRS_DOWN = 2;
        const STAIRS_UP = 3;
        
        // All dungeon levels [level][y][x]
        const dungeonLevels = [];
        // Stair positions for each level: { down: [{x,y}, {x,y}], up: [{x,y}, {x,y}] }
        const stairPositions = [];
        
        // Initialize all levels
        for (let level = 0; level < NUM_LEVELS; level++) {
            dungeonLevels[level] = [];
            for (let y = 0; y < MAP_HEIGHT; y++) {
                dungeonLevels[level][y] = [];
                for (let x = 0; x < MAP_WIDTH; x++) {
                    dungeonLevels[level][y][x] = WALL;
                }
            }
            stairPositions[level] = { down: [], up: [] };
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

        // Stair materials
        const stairsDownMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.5 }); // Dark red for down
        const stairsUpMaterial = new THREE.MeshStandardMaterial({ color: 0x006400, roughness: 0.5 }); // Dark green for up
        const stairGeometry = new THREE.BoxGeometry(TILE_SIZE * 0.8, 0.3, TILE_SIZE * 0.8);
        
        // Track dungeon meshes for level switching
        let dungeonMeshes = [];
        
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
        
        function buildLevel(level) {
            // Clear existing meshes
            for (const mesh of dungeonMeshes) {
                scene.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
            }
            dungeonMeshes = [];
            
            const map = dungeonLevels[level];
            for (let y = 0; y < MAP_HEIGHT; y++) {
                for (let x = 0; x < MAP_WIDTH; x++) {
                    const tile = map[y][x];
                    if (tile === WALL) {
                        addWallTile(x, y);
                    } else if (tile === STAIRS_DOWN) {
                        addStairTile(x, y, true);
                    } else if (tile === STAIRS_UP) {
                        addStairTile(x, y, false);
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
            return tile === FLOOR || tile === STAIRS_DOWN || tile === STAIRS_UP;
        }
        
        function getTileType(tx, ty) {
            if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) {
                return WALL;
            }
            return dungeonLevels[currentLevel][ty][tx];
        }
        
        // Level transition
        function changeLevel(newLevel) {
            if (newLevel < 0 || newLevel >= NUM_LEVELS) return;
            currentLevel = newLevel;
            buildLevel(currentLevel);
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
        const player = {
            name: 'Adventurer',
            level: 1,
            hitpoints: 0,
            experience: 0,
            stats: {
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
            showInventory: false,
            showLoseMode: false,
            showGetMode: false,
            showNothingToGrab: false,
            getItemIndex: 0,
            // Battle state
            inBattle: false,
            currentMonster: null,
            battleOption: 0
        };

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

        // Get random monster based on player level
        function getRandomMonster(playerLevel) {
            const minLevel = Math.max(1, playerLevel - 2);
            const maxLevel = playerLevel + 2;
            const candidates = monsterList.filter(m => m.level >= minLevel && m.level <= maxLevel);
            if (candidates.length === 0) return monsterList[0];
            return { ...candidates[Math.floor(Math.random() * candidates.length)] }; // Clone the monster
        }

        // Store player reference for getGameState access
        window.game._player = player;
        window.game._getCurrentLevel = function() { return currentLevel; };
        window.game._setCurrentLevel = function(lvl) { changeLevel(lvl); };

        // Initialize player state
        if (playerStats && typeof playerStats === 'object') {
            // Check if this is a full game state (from loaded save) or basic stats (new game)
            if (playerStats.name && playerStats.stats && playerStats.inventory) {
                // Full game state restoration
                player.name = playerStats.name;
                player.level = playerStats.level || 1;
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

                // Restore ground items
                player.groundItems = playerStats.groundItems || {};

                // Restore inventory
                player.inventory = playerStats.inventory || [];

                // Restore UI state
                player.showInventory = playerStats.showInventory || false;
                player.showLoseMode = playerStats.showLoseMode || false;
                player.showGetMode = playerStats.showGetMode || false;
                player.getItemIndex = playerStats.getItemIndex || 0;
                
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
                    }
                }
            }
        } else {
            // Random stats for completely new games
            for (let stat in player.stats) {
                player.stats[stat] = Math.floor(Math.random() * (21 - 8 + 1)) + 8;
            }
        }

        // Set hitpoints if not already set (for new games)
        if (player.hitpoints === 0) {
            player.hitpoints = player.stats.Stamina;
        }
        
        // Ensure experience is set
        if (player.experience === 0 && player.level > 1) {
            // Could implement experience calculation here if needed
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
                overlay.innerHTML = `
                    <strong>Floor: ${currentLevel + 1}/${NUM_LEVELS}</strong><br>
                    <strong>Char Lvl: ${player.level}</strong><br>
                    <strong>HP: ${player.hitpoints} | EXP: ${player.experience}</strong><br>
                    STA: ${player.stats.Stamina}<br>
                    CHR: ${player.stats.Charisma}<br>
                    STR: ${player.stats.Strength}<br>
                    INT: ${player.stats.Intelligence}<br>
                    WIS: ${player.stats.Wisdom}<br>
                    SKL: ${player.stats.Skill}<br>
                    SPD: ${player.stats.Speed}
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

        // Create monster encounter overlay
        const monsterOverlay = document.createElement('div');
        monsterOverlay.id = 'monster-overlay';
        monsterOverlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 35; color: white; font-family: monospace;';
        container.appendChild(monsterOverlay);

        // Start a battle encounter
        function startBattle() {
            if (player.inBattle || isPaused) return;
            
            const monster = getRandomMonster(player.level);
            player.currentMonster = monster;
            player.inBattle = true;
            player.battleOption = 0;
            isPaused = true;
            
            // Show monster overlay
            monsterOverlay.innerHTML = `
                <div style="font-size: 2rem; color: red; margin-bottom: 20px;">ENCOUNTER!</div>
                <div style="font-size: 1.5rem; color: gold; margin-bottom: 10px;">${monster.name}</div>
                <div style="margin-bottom: 5px;">Level: ${monster.level}</div>
                <div style="margin-bottom: 5px;">HP: ${monster.hitpoints}</div>
                <div style="margin-bottom: 5px;">Attack: ${monster.attack}</div>
                <div style="margin-bottom: 5px;">Defense: ${monster.defense}</div>
                <div style="margin-top: 20px; color: #aaa;">Choose an action (1-6)</div>
            `;
            monsterOverlay.style.display = 'flex';
            
            // Hide pause overlay if visible
            const pauseOverlay = document.getElementById('pause-overlay');
            if (pauseOverlay) pauseOverlay.style.display = 'none';
            
            updateHUD();
        }

        // Random encounter check - 1% chance per second
        setInterval(() => {
            if (!player.inBattle && !isPaused) {
                if (Math.random() < 0.01) { // 1% chance
                    startBattle();
                }
            }
        }, 1000);

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
                if (tileType === STAIRS_DOWN && currentLevel < NUM_LEVELS - 1) {
                    changeLevel(currentLevel + 1);
                } else if (tileType === STAIRS_UP && currentLevel > 0) {
                    changeLevel(currentLevel - 1);
                }
            }

            if (e.code === 'KeyI') {
                player.showInventory = !player.showInventory;
                player.showLoseMode = false; // Mutually exclusive
                player.showGetMode = false;
                updateHUD();
            }

            if (e.code === 'KeyL') {
                player.showLoseMode = !player.showLoseMode;
                player.showInventory = false; // Mutually exclusive
                player.showGetMode = false;
                updateHUD();
            }

            // Get Mode (G key)
            if (e.code === 'KeyG') {
                const tile = worldToTile(camera.position.x, camera.position.z);
                const tileKey = `${tile.tx},${tile.ty}`;
                const itemsHere = player.groundItems[tileKey] || [];
                player.showInventory = false;
                player.showLoseMode = false;
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

            // Battle Mode - Select option (Keys 1-6)
            if (player.inBattle && e.code.startsWith('Digit')) {
                const digit = parseInt(e.code.replace('Digit', ''));
                if (digit >= 1 && digit <= 6) {
                    player.battleOption = digit;
                    updateHUD();
                    // Battle is paused - player has selected an option
                    // Future: implement battle logic here
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
                const payload = {
                    X: camera.position.x,
                    Y: camera.position.y,
                    Z: camera.position.z,
                    Yaw: yaw
                };

                dotNetHelper.invokeMethodAsync('OnSaveRequested', payload);
            }
        });

        document.addEventListener('keyup', (e) => {
            keys[e.code] = false;
        });

        document.addEventListener('mousemove', (e) => {
            // Mouse look disabled; turning is handled via discrete key presses.
        });

        container.addEventListener('click', () => {
            container.requestPointerLock();
        });

        // Resize handler
        window.addEventListener('resize', () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });

        function animate() {
            requestAnimationFrame(animate);

            if (isPaused) {
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

                if (isWalkable(collisionTile.tx, collisionTile.ty)) {
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
                } else {
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
            stats: player.stats,
            groundItems: player.groundItems,
            inventory: player.inventory,
            showInventory: player.showInventory,
            showLoseMode: player.showLoseMode,
            showGetMode: player.showGetMode,
            getItemIndex: player.getItemIndex,
            dungeonLevel: this._getCurrentLevel ? this._getCurrentLevel() : 0
        });
    }
};
