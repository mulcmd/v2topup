<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Malam Mencekam 3D: MiniMap & Health Bar</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Creepster&family=Special+Elite&display=swap');

        body {
            font-family: 'Special Elite', cursive, sans-serif;
            background-color: #020204;
            color: #e2e8f0;
            overflow: hidden;
            user-select: none;
            margin: 0;
            padding: 0;
        }

        .font-horror {
            font-family: 'Creepster', cursive;
        }

        #canvas-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 1;
        }

        .glass-panel {
            background: rgba(10, 15, 25, 0.85);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(220, 38, 38, 0.3);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
        }

        #crosshair {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 6px;
            height: 6px;
            background-color: rgba(255, 255, 255, 0.7);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 10;
            box-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
        }

        #minimap {
            background: rgba(5, 5, 8, 0.8);
            border: 2px solid rgba(220, 38, 38, 0.5);
            border-radius: 50%;
            box-shadow: 0 0 20px rgba(220, 38, 38, 0.2) inset, 0 0 10px rgba(220, 38, 38, 0.4);
            backdrop-filter: blur(4px);
        }

        @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 15px rgba(220, 38, 38, 0.4); }
            50% { box-shadow: 0 0 30px rgba(220, 38, 38, 0.9); }
        }
        .glow-btn {
            animation: pulseGlow 2.5s infinite;
        }

        /* Efek saat terkena damage */
        #damage-overlay {
            position: fixed;
            inset: 0;
            background: radial-gradient(circle, transparent 20%, rgba(200, 0, 0, 0.8) 100%);
            opacity: 0;
            pointer-events: none;
            z-index: 15;
            transition: opacity 0.15s ease-out;
        }
    </style>
</head>
<body>

    <!-- 3D CANVAS CONTAINER -->
    <div id="canvas-container"></div>

    <!-- DAMAGE OVERLAY (Vignette Merah) -->
    <div id="damage-overlay"></div>

    <!-- CROSSHAIR -->
    <div id="crosshair" class="hidden"></div>

    <!-- UI OVERLAY -->
    <div id="ui-container" class="relative z-20 w-full h-screen pointer-events-none flex flex-col justify-between p-6">
        
        <!-- HUD ATAS: Status, Senter UV & Health Pemain -->
        <div id="hud-top" class="hidden justify-between items-start w-full">
            <div class="flex flex-col gap-2">
                <!-- Health Bar Pemain -->
                <div class="glass-panel px-4 py-2 rounded-xl border border-red-800/60 w-56">
                    <div class="flex justify-between items-center mb-1 text-xs font-bold text-red-400">
                        <span><i class="fa-solid fa-heart text-red-500 mr-1"></i> DARAH PEMAIN</span>
                        <span id="player-hp-text">100%</span>
                    </div>
                    <div class="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-red-950">
                        <div id="player-hp-bar" class="bg-gradient-to-r from-red-700 via-red-500 to-emerald-500 h-full w-full transition-all duration-300"></div>
                    </div>
                </div>

                <!-- Status Lentera -->
                <div class="glass-panel px-4 py-1.5 rounded-xl border border-red-900/50 flex items-center gap-3 w-fit">
                    <i class="fa-solid fa-fire-flame-curved text-amber-500 text-sm"></i>
                    <div class="text-xs font-bold text-amber-400">
                        LENTERA: <span id="lantern-count">0</span> / 3
                    </div>
                </div>
            </div>

            <!-- KANAN ATAS: Mode Senter & MINIMAP 2D -->
            <div class="flex flex-col items-end gap-3">
                <div class="glass-panel px-3 py-1.5 rounded-xl border border-purple-900/50 flex items-center gap-2">
                    <i class="fa-solid fa-bolt text-purple-400 text-xs"></i>
                    <span id="flashlight-mode" class="text-xs font-bold text-amber-300">SENTER: BIASA [R]</span>
                </div>

                <!-- RADAR / MINIMAP 2D -->
                <div class="relative">
                    <canvas id="minimap" width="130" height="130"></canvas>
                    <div class="text-[9px] text-center text-slate-400 mt-1 uppercase tracking-wider font-bold">RADAR AREA</div>
                </div>
            </div>
        </div>

        <!-- DIALOG / STORYTEXT BOX -->
        <div id="story-box" class="hidden self-center max-w-xl w-full glass-panel p-5 rounded-2xl border border-red-900/60 text-center pointer-events-auto transition-all duration-300">
            <h3 id="story-speaker" class="text-xs font-bold text-red-500 tracking-widest uppercase mb-1">BISIKAN GAIB</h3>
            <p id="story-text" class="text-sm md:text-base text-slate-200 leading-relaxed mb-3">
                "Perhatikan Radar MiniMap di kanan atas! Titik hijau adalah dirimu, merah adalah Kuntilanak!"
            </p>
            <button id="next-dialog-btn" class="text-xs bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-700/50 px-4 py-1.5 rounded-lg transition active:scale-95">
                Lanjutkan (Klik)
            </button>
        </div>

        <!-- FOOTER INSTRUCTION -->
        <div id="hud-bottom" class="hidden text-center text-xs text-slate-400 glass-panel w-fit mx-auto px-4 py-2 rounded-full">
            <kbd class="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300">WASD</kbd> Gerak | <kbd class="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300">F</kbd> On/Off Senter | <kbd class="px-1.5 py-0.5 bg-purple-950 border border-purple-700 rounded text-purple-300">R</kbd> Mode UV | <kbd class="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300">E</kbd> Ambil Item
        </div>
    </div>

    <!-- MODAL MENU UTAMA -->
    <div id="menu-overlay" class="fixed inset-0 z-30 flex items-center justify-center bg-black/90 backdrop-blur-lg transition-all duration-500">
        <div id="main-menu" class="glass-panel p-8 rounded-3xl max-w-md w-11/12 text-center border border-red-900/50 shadow-2xl relative">
            <div class="text-red-600 text-6xl mb-3 animate-pulse">
                <i class="fa-solid fa-ghost"></i>
            </div>
            <h1 class="text-4xl md:text-5xl font-horror text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-purple-500 to-red-500 tracking-wider mb-2 drop-shadow-lg">
                MALAM MENCEKAM
            </h1>
            <p class="text-xs text-slate-400 mb-6 uppercase tracking-widest">Update: Realisme & Playability Ditingkatkan</p>

            <div class="flex flex-col gap-3">
                <button id="start-game-btn" class="glow-btn bg-gradient-to-r from-purple-900 via-red-800 to-red-600 hover:from-purple-800 hover:to-red-500 text-white font-bold py-3.5 px-6 rounded-xl transition transform active:scale-95 flex items-center justify-center gap-2 border border-red-500/50">
                    <i class="fa-solid fa-play text-sm"></i> MULAI PETUALANGAN
                </button>
            </div>
        </div>
    </div>

    <!-- THREE.JS & GAME CODE -->
    <script>
        class SoundEngine {
            constructor() {
                this.ctx = null;
            }

            init() {
                if (!this.ctx) {
                    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                    this.startAmbientBGM();
                }
            }

            startAmbientBGM() {
                if (!this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(45, this.ctx.currentTime); // Lebih dalam/low
                gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
            }

            playUVBeamSound() {
                if (!this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, this.ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(150, this.ctx.currentTime + 0.15);

                gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.15);
            }

            playJumpscare() {
                if (!this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.3);

                gain.gain.setValueAtTime(0.4, this.ctx.currentTime); // Volume disesuaikan
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.3);
            }
        }

        const audioSys = new SoundEngine();

        // WORLD VARIABLES
        let scene, camera, renderer, flashlight;
        let lanterns = [];
        let kuntilanakEnemy = null;
        let kuntilanakHealth = 100;
        let playerHealth = 100;
        let lanternCount = 0;
        let isGameStarted = false;
        let flashlightOn = true;
        let isUVMode = false;
        
        let stepTime = 0; // Untuk efek head bobbing
        let lastJumpscareTime = 0; // Cooldown audio

        // Minimap Canvas Setup
        let minimapCanvas, minimapCtx;
        const MAP_SCALE = 3.2;

        // Player Movement
        let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
        let direction = new THREE.Vector3();

        function init3DWorld() {
            const container = document.getElementById('canvas-container');

            scene = new THREE.Scene();
            // KABUT DIBUAT LEBIH PEKAT & GELAP (Lebih Realistis)
            scene.fog = new THREE.FogExp2(0x020205, 0.15); 

            camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 1.6, 5);

            renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimasi performa
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            container.appendChild(renderer.domElement);

            const ambientLight = new THREE.AmbientLight(0x111118, 0.3);
            scene.add(ambientLight);

            // SENTER DIBUAT LEBIH REALISTIS (Penumbra halus, decay)
            flashlight = new THREE.SpotLight(0xfff5e6, 2.5, 20, Math.PI / 6, 0.6, 1.5);
            flashlight.position.set(0, 1.6, 5);
            flashlight.castShadow = true;
            scene.add(flashlight);
            scene.add(flashlight.target);

            // Minimap Initialization
            minimapCanvas = document.getElementById('minimap');
            minimapCtx = minimapCanvas.getContext('2d');

            buildHauntedHouse();
            spawnLanterns();
            spawnKuntilanak();

            window.addEventListener('resize', onWindowResize);
            setupInputListeners();

            animate();
        }

        function buildHauntedHouse() {
            // Lantai dibuat lebih gelap dan bertekstur kasar
            const floorGeo = new THREE.PlaneGeometry(35, 35);
            const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.9, metalness: 0.1 });
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            scene.add(floor);

            const wallMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 1.0 });
            
            const wall1 = new THREE.Mesh(new THREE.BoxGeometry(35, 5, 0.5), wallMat);
            wall1.position.set(0, 2.5, -17.5);
            wall1.receiveShadow = true;
            scene.add(wall1);

            const wall2 = new THREE.Mesh(new THREE.BoxGeometry(35, 5, 0.5), wallMat);
            wall2.position.set(0, 2.5, 17.5);
            wall2.receiveShadow = true;
            scene.add(wall2);

            const wall3 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 35), wallMat);
            wall3.position.set(-17.5, 2.5, 0);
            wall3.receiveShadow = true;
            scene.add(wall3);

            const wall4 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 35), wallMat);
            wall4.position.set(17.5, 2.5, 0);
            wall4.receiveShadow = true;
            scene.add(wall4);
        }

        function spawnLanterns() {
            const lanternGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 8);
            const lanternMat = new THREE.MeshStandardMaterial({ color: 0xd97706, emissive: 0xd97706, emissiveIntensity: 1 });

            const positions = [
                { x: -12, z: -12 },
                { x: 12, z: -10 },
                { x: -10, z: 12 }
            ];

            positions.forEach(pos => {
                const mesh = new THREE.Mesh(lanternGeo, lanternMat);
                mesh.position.set(pos.x, 0.5, pos.z);

                const light = new THREE.PointLight(0xf59e0b, 1.2, 5);
                light.position.set(pos.x, 0.8, pos.z);
                scene.add(light);

                scene.add(mesh);
                lanterns.push({ mesh, light, collected: false, x: pos.x, z: pos.z });
            });
        }

        function spawnKuntilanak() {
            const group = new THREE.Group();

            const dressGeo = new THREE.CylinderGeometry(0.15, 0.5, 2.0, 12);
            const dressMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 1.0 });
            const dress = new THREE.Mesh(dressGeo, dressMat);
            dress.position.y = 1.0;
            group.add(dress);

            const headGeo = new THREE.SphereGeometry(0.25, 12, 12);
            const headMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 2.1;
            group.add(head);

            const hairGeo = new THREE.CylinderGeometry(0.27, 0.35, 1.6, 12);
            const hairMat = new THREE.MeshBasicMaterial({ color: 0x020202 });
            const hair = new THREE.Mesh(hairGeo, hairMat);
            hair.position.set(0, 1.7, -0.04);
            group.add(hair);

            group.position.set(5, 0.2, -8); // Sedikit melayang di atas tanah
            scene.add(group);
            kuntilanakEnemy = group;
        }

        function setupInputListeners() {
            document.addEventListener('keydown', (e) => {
                if (!isGameStarted || playerHealth <= 0) return;
                switch (e.code) {
                    case 'KeyW': moveForward = true; break;
                    case 'KeyS': moveBackward = true; break;
                    case 'KeyA': moveLeft = true; break;
                    case 'KeyD': moveRight = true; break;
                    case 'KeyF':
                        flashlightOn = !flashlightOn;
                        flashlight.intensity = flashlightOn ? (isUVMode ? 4 : 2.5) : 0;
                        break;
                    case 'KeyR':
                        isUVMode = !isUVMode;
                        const modeText = document.getElementById('flashlight-mode');
                        if (isUVMode) {
                            flashlight.color.setHex(0xa855f7); // Warna ungu lebih terang
                            flashlight.intensity = flashlightOn ? 4 : 0;
                            modeText.innerText = "SENTER: MODE UV [R]";
                            modeText.className = "text-xs font-bold text-purple-400 animate-pulse";
                        } else {
                            flashlight.color.setHex(0xfff5e6);
                            flashlight.intensity = flashlightOn ? 2.5 : 0;
                            modeText.innerText = "SENTER: BIASA [R]";
                            modeText.className = "text-xs font-bold text-amber-300";
                        }
                        break;
                    case 'KeyE':
                        checkItemInteraction();
                        break;
                }
            });

            document.addEventListener('keyup', (e) => {
                switch (e.code) {
                    case 'KeyW': moveForward = false; break;
                    case 'KeyS': moveBackward = false; break;
                    case 'KeyA': moveLeft = false; break;
                    case 'KeyD': moveRight = false; break;
                }
            });

            document.addEventListener('mousemove', (e) => {
                if (document.pointerLockElement === document.body && isGameStarted && playerHealth > 0) {
                    camera.rotation.y -= e.movementX * 0.002;
                    camera.rotation.x -= e.movementY * 0.002;
                    // Batasi rotasi vertikal agar kepala tidak terbalik
                    camera.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, camera.rotation.x));
                }
            });
        }

        function checkItemInteraction() {
            lanterns.forEach(item => {
                if (!item.collected) {
                    const dist = camera.position.distanceTo(item.mesh.position);
                    if (dist < 3.0) { // Jarak ambil diperbesar agar lebih mudah
                        item.collected = true;
                        scene.remove(item.mesh);
                        scene.remove(item.light);
                        lanternCount++;
                        document.getElementById('lantern-count').innerText = lanternCount;

                        showStoryText("LENTERA DITEMUKAN", `Kamu mengumpulkan Lentera (${lanternCount}/3). Kuntilanak menyadari keberadaanmu!`);
                    }
                }
            });
        }

        function updateGameLogic() {
            if (!isGameStarted || playerHealth <= 0) return;

            // Player Movement
            direction.z = Number(moveForward) - Number(moveBackward);
            direction.x = Number(moveRight) - Number(moveLeft);
            direction.normalize(); // Kecepatan konsisten saat jalan menyamping

            let isMoving = false;
            if (moveForward || moveBackward) { camera.translateZ(-direction.z * 0.09); isMoving = true; }
            if (moveLeft || moveRight) { camera.translateX(direction.x * 0.08); isMoving = true; }

            // Head Bobbing (Kamera goyang saat jalan)
            if (isMoving) {
                stepTime += 0.15;
                camera.position.y = 1.6 + Math.sin(stepTime) * 0.06;
            } else {
                camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.6, 0.1);
            }

            // Batas Dinding Arena
            camera.position.x = Math.max(-17, Math.min(17, camera.position.x));
            camera.position.z = Math.max(-17, Math.min(17, camera.position.z));

            // Update Senter Target
            flashlight.position.copy(camera.position);
            const targetDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            flashlight.target.position.copy(camera.position).add(targetDir);

            // Kuntilanak AI & Damage Logic
            if (kuntilanakEnemy && kuntilanakHealth > 0) {
                // Efek hantu melayang (Hover)
                kuntilanakEnemy.position.y = 0.2 + Math.sin(Date.now() * 0.002) * 0.15;

                kuntilanakEnemy.lookAt(camera.position.x, kuntilanakEnemy.position.y, camera.position.z);
                const distToPlayer = kuntilanakEnemy.position.distanceTo(camera.position);

                if (distToPlayer > 1.5) {
                    // Bergerak LEBIH LAMBAT agar pemain bisa bermanuver (Lebih Mudah)
                    kuntilanakEnemy.translateZ(0.013);
                } else {
                    // MENGURANGI DARAH PEMAIN (Damage diturunkan jadi 0.3 agar tidak instan mati)
                    playerHealth -= 0.3;
                    
                    // Mainkan Jumpscare dengan jeda 1 detik agar audio tidak tumpang tindih
                    const now = Date.now();
                    if (now - lastJumpscareTime > 1000) {
                        audioSys.playJumpscare();
                        lastJumpscareTime = now;
                    }

                    // EFEK VISUAL TERLUKA (Layar merah berkedip)
                    const dmgOverlay = document.getElementById('damage-overlay');
                    dmgOverlay.style.opacity = '1';
                    setTimeout(() => { if(playerHealth > 0) dmgOverlay.style.opacity = '0'; }, 150);

                    updateHealthBarUI();

                    if (playerHealth <= 0) {
                        dmgOverlay.style.opacity = '1';
                        showStoryText("GAME OVER", "Pandanganmu menggelap. Kamu tewas di tempat ini.");
                        document.exitPointerLock();
                    }
                }

                // Serangan Senter UV (Dipermudah hit-box nya)
                if (flashlightOn && isUVMode) {
                    const kuntiDir = kuntilanakEnemy.position.clone().sub(camera.position).normalize();
                    const angle = targetDir.angleTo(kuntiDir);

                    // Angle diperbesar dari 0.35 jadi 0.5 (Lebih mudah membidik hantu)
                    if (angle < 0.5 && distToPlayer < 12) {
                        // Damage hantu dinaikkan agar cepat mati
                        kuntilanakHealth -= 1.2;
                        audioSys.playUVBeamSound();
                        
                        // Efek knockback/Hantu kepanasan dan mundur
                        kuntilanakEnemy.translateZ(-0.06);

                        if (kuntilanakHealth <= 0) {
                            scene.remove(kuntilanakEnemy);
                            showStoryText("KUNTILANAK MUSNAH!", "Cahaya Senter UV menghanguskan entitas tersebut!");
                        }
                    }
                }
            }

            // GAMBAR RENDERING MINIMAP 2D
            renderMinimap();
        }

        function updateHealthBarUI() {
            const hpBar = document.getElementById('player-hp-bar');
            const hpText = document.getElementById('player-hp-text');
            const currentHp = Math.max(0, Math.floor(playerHealth));
            
            hpBar.style.width = `${currentHp}%`;
            hpText.innerText = `${currentHp}%`;

            if (currentHp < 30) {
                hpBar.classList.remove('from-red-700', 'to-emerald-500');
                hpBar.classList.add('bg-red-600', 'animate-pulse');
            }
        }

        function renderMinimap() {
            const centerX = minimapCanvas.width / 2;
            const centerY = minimapCanvas.height / 2;

            minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

            // Gambar Garis Grid Radar
            minimapCtx.strokeStyle = "rgba(220, 38, 38, 0.2)";
            minimapCtx.lineWidth = 1;
            minimapCtx.beginPath();
            minimapCtx.arc(centerX, centerY, 30, 0, Math.PI * 2);
            minimapCtx.arc(centerX, centerY, 55, 0, Math.PI * 2);
            minimapCtx.moveTo(centerX, 0); minimapCtx.lineTo(centerX, minimapCanvas.height);
            minimapCtx.moveTo(0, centerY); minimapCtx.lineTo(minimapCanvas.width, centerY);
            minimapCtx.stroke();

            // 1. Gambar Posisi Lentera
            lanterns.forEach(item => {
                if (!item.collected) {
                    const mapX = centerX + (item.x - camera.position.x) * MAP_SCALE;
                    const mapY = centerY + (item.z - camera.position.z) * MAP_SCALE;

                    minimapCtx.fillStyle = "#fbbf24";
                    minimapCtx.beginPath();
                    minimapCtx.arc(mapX, mapY, 3.5, 0, Math.PI * 2);
                    minimapCtx.fill();
                }
            });

            // 2. Gambar Posisi Kuntilanak
            if (kuntilanakEnemy && kuntilanakHealth > 0) {
                const kuntiX = centerX + (kuntilanakEnemy.position.x - camera.position.x) * MAP_SCALE;
                const kuntiY = centerY + (kuntilanakEnemy.position.z - camera.position.z) * MAP_SCALE;

                minimapCtx.fillStyle = "#ef4444";
                minimapCtx.beginPath();
                minimapCtx.arc(kuntiX, kuntiY, 4.5, 0, Math.PI * 2);
                minimapCtx.fill();
            }

            // 3. Gambar Posisi Pemain + Arah Hadap (Bentuk Segitiga)
            minimapCtx.translate(centerX, centerY);
            minimapCtx.rotate(-camera.rotation.y); // Rotasi mengikuti hadap kamera

            minimapCtx.fillStyle = "#10b981";
            minimapCtx.beginPath();
            minimapCtx.moveTo(0, -6);
            minimapCtx.lineTo(4, 4);
            minimapCtx.lineTo(-4, 4);
            minimapCtx.fill();

            minimapCtx.rotate(camera.rotation.y);
            minimapCtx.translate(-centerX, -centerY);
        }

        function showStoryText(speaker, text) {
            const storyBox = document.getElementById('story-box');
            document.getElementById('story-speaker').innerText = speaker;
            document.getElementById('story-text').innerText = text;
            storyBox.classList.remove('hidden');
        }

        function animate() {
            requestAnimationFrame(animate);

            if (isGameStarted) {
                updateGameLogic();
            } else {
                camera.rotation.y += 0.001;
            }

            renderer.render(scene, camera);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        // UI Handlers
        document.getElementById('start-game-btn').addEventListener('click', () => {
            audioSys.init();
            document.getElementById('menu-overlay').classList.add('hidden');
            document.getElementById('hud-top').classList.remove('hidden');
            document.getElementById('hud-bottom').classList.remove('hidden');
            document.getElementById('crosshair').classList.remove('hidden');

            document.body.requestPointerLock();
            isGameStarted = true;

            showStoryText("PERHATIAN", "Perhatikan Radar MiniMap! Cari 3 Lentera Jiwa dan sorot Kuntilanak menggunakan Senter UV [R] untuk memusnahkannya!");
        });

        document.getElementById('next-dialog-btn').addEventListener('click', () => {
            document.getElementById('story-box').classList.add('hidden');
        });

        window.onload = init3DWorld;
    </script>
</body>
</html>
