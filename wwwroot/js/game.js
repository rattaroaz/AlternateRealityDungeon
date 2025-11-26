window.game = {
    initGame: function (containerId, playerStats, dotNetHelper, cameraState) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        scene.fog = new THREE.Fog(0x000000, 5, 80);

        // Camera
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
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

        // Dungeon grid
        const MAP_WIDTH = 64;
        const MAP_HEIGHT = 64;
        const TILE_SIZE = 2;
        const playerStartTile = { x: 51, y: 61 };

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

        // Dungeon layout
        const WALL = 1;
        const FLOOR = 0;
        const dungeonMap = [];

        for (let y = 0; y < MAP_HEIGHT; y++) {
            dungeonMap[y] = [];
            for (let x = 0; x < MAP_WIDTH; x++) {
                dungeonMap[y][x] = WALL;
            }
        }

        function carveCorridor(x1, y1, x2, y2) {
            const dx = Math.sign(x2 - x1);
            const dy = Math.sign(y2 - y1);
            let x = x1;
            let y = y1;
            dungeonMap[y][x] = FLOOR;
            while (x !== x2 || y !== y2) {
                if (x !== x2) x += dx;
                if (y !== y2) y += dy;
                dungeonMap[y][x] = FLOOR;
            }
        }

        // Simple cross-shaped corridor network near the player start
        carveCorridor(41, 61, 61, 61);
        carveCorridor(51, 46, 51, 62);
        carveCorridor(41, 56, 41, 61);

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
        }

        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (dungeonMap[y][x] === WALL) {
                    addWallTile(x, y);
                }
            }
        }

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
            return dungeonMap[ty][tx] === FLOOR;
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
            getItemIndex: 0
        };

        // Initialize stats between 8-21
        if (playerStats && typeof playerStats === 'object') {
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
        } else {
            for (let stat in player.stats) {
                player.stats[stat] = Math.floor(Math.random() * (21 - 8 + 1)) + 8;
            }
        }

        // Set starting hitpoints = stamina, experience = 0
        player.hitpoints = player.stats.Stamina;
        player.experience = 0;

        function updateHUD() {
            // 1. Update Character Name (4th Quarter)
            const charNameEl = document.getElementById('nav-char-name');
            if (charNameEl) {
                charNameEl.textContent = player.name;
            }

            // Update Level Text (1st Quarter)
            const levelTextEl = document.getElementById('level-text');
            if (levelTextEl) {
                levelTextEl.textContent = `You are on Level ${player.level} of the Dungeon.`;
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
                    <strong>Level: ${player.level}</strong><br>
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
                
                if (player.showNothingToGrab) {
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
            // S is at 6 o'clock (180 deg visual).
            // W is at 9 o'clock (270 deg visual).
            
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

            // Drop items in Lose Mode (Keys 1-9)
            if (player.showLoseMode && e.code.startsWith('Digit')) {
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
    }
};
