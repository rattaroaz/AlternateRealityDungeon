window.game = {
    initGame: function (containerId) {
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
            stats: {
                Strength: 0,
                Stamina: 0,
                Agility: 0,
                Constitution: 0,
                Intelligence: 0,
                Wisdom: 0,
                Experience: 0,
                Speed: 0
            }
        };

        // Initialize stats between 8-21
        for (let stat in player.stats) {
            player.stats[stat] = Math.floor(Math.random() * (21 - 8 + 1)) + 8;
        }

        function updateHUD() {
            const overlay = document.getElementById('stats-overlay');
            if (overlay) {
                overlay.innerHTML = `
                    <strong>Player Stats (Lvl 1)</strong><br>
                    STR: ${player.stats.Strength}<br>
                    STA: ${player.stats.Stamina}<br>
                    AGI: ${player.stats.Agility}<br>
                    CON: ${player.stats.Constitution}<br>
                    INT: ${player.stats.Intelligence}<br>
                    WIS: ${player.stats.Wisdom}<br>
                    EXP: ${player.stats.Experience}<br>
                    SPD: ${player.stats.Speed}
                `;
            }
        }
        updateHUD();

        // Controls
        // Base speed 0.1, modified by Speed stat (e.g., +0.001 per point)
        const baseMoveSpeed = 0.1;
        const moveSpeed = baseMoveSpeed + (player.stats.Speed * 0.002);
        const lookSpeed = 0.002;
        const turnSpeed = 0.03;
        const playerRadius = 0.9;
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
        camera.position.set(playerStartX, standHeight, playerStartZ);

        const keys = {};

        document.addEventListener('keydown', (e) => {
            keys[e.code] = true;

            const step = Math.PI / 2;

            // Discrete 90-degree turns
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
                yaw += step;
            }
            if (e.code === 'KeyD' || e.code === 'ArrowRight') {
                yaw -= step;
            }

            yaw = Math.round(yaw / step) * step;

            // After turning, auto-center on the new view direction
            if (e.code === 'KeyA' || e.code === 'ArrowLeft' || e.code === 'KeyD' || e.code === 'ArrowRight') {
                const tile = worldToTile(camera.position.x, camera.position.z);
                const centerX = (tile.tx - MAP_WIDTH / 2) * TILE_SIZE + TILE_SIZE / 2;
                const centerZ = (tile.ty - MAP_HEIGHT / 2) * TILE_SIZE + TILE_SIZE / 2;

                if (Math.abs(Math.sin(yaw)) > 0.5) {
                    // Facing mostly along X axis: center along Z
                    camera.position.z = centerZ;
                } else {
                    // Facing mostly along Z axis: center along X
                    camera.position.x = centerX;
                }
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

        // Animation Loop
        function animate() {
            requestAnimationFrame(animate);

            // 1. Rotation
            // Discrete 90-degree turns handled on keydown.
            camera.rotation.set(0, 0, 0);
            camera.rotateY(yaw);

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
