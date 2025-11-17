// Three.js 3D Scene Setup
let scene, camera, renderer, drones = [], trails = [], particles = [];
let animationSpeed = 1;
let isAnimating = false;

// Audio context for realistic drone sounds
let audioContext;
let masterGainNode;
let droneAudioNodes = [];

// Initialize audio system
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGainNode = audioContext.createGain();
        masterGainNode.gain.value = 0.3; // Master volume
        masterGainNode.connect(audioContext.destination);
    } catch (e) {
        console.log('Web Audio API not supported');
    }
}

// Create realistic drone propeller sound
function createDroneSound() {
    if (!audioContext) return null;

    const droneSound = {
        oscillators: [],
        gainNodes: [],
        filters: []
    };

    // Multiple oscillators for rich drone sound
    const frequencies = [110, 165, 220, 330]; // Low frequency hum

    frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();

        oscillator.type = 'sawtooth';
        oscillator.frequency.value = freq;

        filter.type = 'lowpass';
        filter.frequency.value = 800 + Math.random() * 400;
        filter.Q.value = 1;

        gainNode.gain.value = 0.15 / (index + 1); // Decreasing volume for harmonics

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(masterGainNode);

        oscillator.start();

        droneSound.oscillators.push(oscillator);
        droneSound.gainNodes.push(gainNode);
        droneSound.filters.push(filter);
    });

    // Add pink noise for propeller whoosh
    const bufferSize = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11;
        b6 = white * 0.115926;
    }

    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1200;
    noiseFilter.Q.value = 0.5;

    const noiseGain = audioContext.createGain();
    noiseGain.gain.value = 0.08;

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGainNode);

    noiseSource.start();

    droneSound.noiseSource = noiseSource;
    droneSound.noiseGain = noiseGain;
    droneSound.noiseFilter = noiseFilter;

    return droneSound;
}

// Update drone sound based on movement
function updateDroneSound(droneSound, isMoving, speed = 1) {
    if (!droneSound || !audioContext) return;

    const targetVolume = isMoving ? 0.15 : 0.05;
    const targetFreqMultiplier = isMoving ? 1 + speed * 0.3 : 1;

    droneSound.gainNodes.forEach((gainNode, index) => {
        gainNode.gain.linearRampToValueAtTime(
            targetVolume / (index + 1),
            audioContext.currentTime + 0.1
        );
    });

    droneSound.oscillators.forEach((osc, index) => {
        const baseFreq = [110, 165, 220, 330][index];
        osc.frequency.linearRampToValueAtTime(
            baseFreq * targetFreqMultiplier,
            audioContext.currentTime + 0.1
        );
    });

    if (droneSound.noiseGain) {
        droneSound.noiseGain.gain.linearRampToValueAtTime(
            isMoving ? 0.12 : 0.03,
            audioContext.currentTime + 0.1
        );
    }

    if (droneSound.noiseFilter) {
        droneSound.noiseFilter.frequency.linearRampToValueAtTime(
            isMoving ? 1500 + speed * 500 : 1000,
            audioContext.currentTime + 0.1
        );
    }
}

// Stop drone sound
function stopDroneSound(droneSound) {
    if (!droneSound || !audioContext) return;

    droneSound.oscillators.forEach(osc => {
        osc.stop();
    });

    if (droneSound.noiseSource) {
        droneSound.noiseSource.stop();
    }
}

// Initialize the 3D scene
function init() {
    // Initialize audio
    initAudio();

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 10, 50);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(50, 50, 50);
    sunLight.castShadow = true;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    scene.add(sunLight);

    // Add point lights for dramatic effect
    const pointLight1 = new THREE.PointLight(0xff6b6b, 1, 100);
    pointLight1.position.set(-20, 20, -20);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x4ecdc4, 1, 100);
    pointLight2.position.set(20, 20, 20);
    scene.add(pointLight2);

    // Add clouds
    addClouds();

    // Add ground reference
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x90ee90,
        transparent: true,
        opacity: 0.3
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -20;
    ground.receiveShadow = true;
    scene.add(ground);

    // Event listeners
    document.getElementById('drawButton').addEventListener('click', startDrawing);
    document.getElementById('resetButton').addEventListener('click', reset);
    document.getElementById('speedUp').addEventListener('click', () => {
        animationSpeed = Math.min(animationSpeed * 1.5, 5);
    });
    document.getElementById('speedDown').addEventListener('click', () => {
        animationSpeed = Math.max(animationSpeed / 1.5, 0.2);
    });

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Start animation loop
    animate();
}

// Create an ultra-realistic professional drone model (Premium DJI Inspire/Phantom style)
function createDrone() {
    const droneGroup = new THREE.Group();

    // Premium materials with realistic PBR properties
    const carbonFiberMaterial = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        metalness: 0.95,
        roughness: 0.2,
        envMapIntensity: 1.5
    });

    const titaniumMaterial = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        metalness: 0.98,
        roughness: 0.12
    });

    const mattePlasticMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.1,
        roughness: 0.8
    });

    const glossyPlasticMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        metalness: 0.4,
        roughness: 0.3
    });

    const redAccentMaterial = new THREE.MeshStandardMaterial({
        color: 0xff1744,
        metalness: 0.7,
        roughness: 0.2,
        emissive: 0x330000,
        emissiveIntensity: 0.3
    });

    const whiteAccentMaterial = new THREE.MeshStandardMaterial({
        color: 0xf5f5f5,
        metalness: 0.6,
        roughness: 0.25
    });

    // Sleek aerodynamic main body (rounded, futuristic)
    const mainBodyGeometry = new THREE.SphereGeometry(0.35, 16, 16);
    mainBodyGeometry.scale(1, 0.4, 1);
    const mainBody = new THREE.Mesh(mainBodyGeometry, glossyPlasticMaterial);
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    droneGroup.add(mainBody);

    // Top cover (aerodynamic shell)
    const topCoverGeometry = new THREE.SphereGeometry(0.32, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const topCover = new THREE.Mesh(topCoverGeometry, carbonFiberMaterial);
    topCover.position.y = 0.05;
    topCover.castShadow = true;
    droneGroup.add(topCover);

    // Bottom cover
    const bottomCoverGeometry = new THREE.SphereGeometry(0.32, 16, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const bottomCover = new THREE.Mesh(bottomCoverGeometry, mattePlasticMaterial);
    bottomCover.position.y = -0.05;
    bottomCover.receiveShadow = true;
    droneGroup.add(bottomCover);

    // Central hub ring (premium detail)
    const ringGeometry = new THREE.TorusGeometry(0.3, 0.03, 12, 24);
    const ring = new THREE.Mesh(ringGeometry, titaniumMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = true;
    droneGroup.add(ring);

    // Top status LED ring
    const ledRingGeometry = new THREE.TorusGeometry(0.25, 0.015, 8, 24);
    const ledRingMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 2,
        metalness: 0.8,
        roughness: 0.2
    });
    const ledRing = new THREE.Mesh(ledRingGeometry, ledRingMaterial);
    ledRing.rotation.x = Math.PI / 2;
    ledRing.position.y = 0.15;
    droneGroup.add(ledRing);

    // GPS module (sleek dome)
    const gpsGeometry = new THREE.SphereGeometry(0.12, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const gpsMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.3,
        roughness: 0.6,
        transparent: true,
        opacity: 0.9
    });
    const gps = new THREE.Mesh(gpsGeometry, gpsMaterial);
    gps.position.set(0, 0.2, 0);
    droneGroup.add(gps);

    // Battery pack (integrated, sleek design)
    const batteryGeometry = new THREE.BoxGeometry(0.35, 0.1, 0.18);
    const batteryMaterial = new THREE.MeshStandardMaterial({
        color: 0x0d47a1,
        metalness: 0.6,
        roughness: 0.3
    });
    const battery = new THREE.Mesh(batteryGeometry, batteryMaterial);
    battery.position.set(0, 0.22, -0.1);
    battery.castShadow = true;
    droneGroup.add(battery);

    // Battery connector (XT60 style)
    const connectorGeometry = new THREE.BoxGeometry(0.12, 0.04, 0.08);
    const connector = new THREE.Mesh(connectorGeometry, redAccentMaterial);
    connector.position.set(0, 0.24, -0.19);
    droneGroup.add(connector);

    // Ventilation slots (premium detail)
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const slotGeometry = new THREE.BoxGeometry(0.02, 0.08, 0.08);
        const slot = new THREE.Mesh(slotGeometry, new THREE.MeshStandardMaterial({
            color: 0x000000,
            metalness: 0,
            roughness: 1
        }));
        slot.position.set(
            Math.cos(angle) * 0.28,
            0,
            Math.sin(angle) * 0.28
        );
        slot.lookAt(0, 0, 0);
        droneGroup.add(slot);
    }

    // Arm positions for X-configuration
    const armPositions = [
        { x: 1, z: 1, angle: Math.PI / 4 },      // Front right
        { x: -1, z: 1, angle: -Math.PI / 4 },    // Front left
        { x: 1, z: -1, angle: -Math.PI / 4 },    // Back right
        { x: -1, z: -1, angle: Math.PI / 4 }     // Back left
    ];

    droneGroup.userData.propellers = [];

    armPositions.forEach((armPos, index) => {
        // Premium carbon fiber arm (sleek aerodynamic profile)
        const armLength = 2.0;

        // Main arm structure (tapered)
        const armGroup = new THREE.Group();
        const segments = 3;
        for (let seg = 0; seg < segments; seg++) {
            const segLength = armLength / segments;
            const width = 0.14 - (seg * 0.015);
            const height = 0.09 - (seg * 0.01);

            const segGeometry = new THREE.BoxGeometry(width, height, segLength);
            const segMesh = new THREE.Mesh(segGeometry, carbonFiberMaterial);
            segMesh.position.z = (seg - segments / 2) * segLength + segLength / 2;
            segMesh.castShadow = true;
            armGroup.add(segMesh);
        }

        armGroup.position.set(armPos.x * 0.28, 0, armPos.z * 0.28);
        armGroup.rotation.y = armPos.angle;
        droneGroup.add(armGroup);

        // White racing stripe (premium detail)
        const stripeGeometry = new THREE.BoxGeometry(0.15, 0.015, armLength * 0.6);
        const stripe = new THREE.Mesh(stripeGeometry, whiteAccentMaterial);
        stripe.position.set(armPos.x * 0.28, 0.055, armPos.z * 0.28);
        stripe.rotation.y = armPos.angle;
        droneGroup.add(stripe);

        // Motor assembly at arm end
        const motorDistance = armLength / 2;
        const motorX = armPos.x * 0.28 + Math.sin(armPos.angle) * motorDistance;
        const motorZ = armPos.z * 0.28 + Math.cos(armPos.angle) * motorDistance;

        // Motor base (professional design)
        const motorBaseGeometry = new THREE.CylinderGeometry(0.18, 0.22, 0.2, 20);
        const motorBase = new THREE.Mesh(motorBaseGeometry, mattePlasticMaterial);
        motorBase.position.set(motorX, 0.08, motorZ);
        motorBase.castShadow = true;
        droneGroup.add(motorBase);

        // Motor cooling fins
        for (let fin = 0; fin < 8; fin++) {
            const finAngle = (fin / 8) * Math.PI * 2;
            const finGeometry = new THREE.BoxGeometry(0.02, 0.15, 0.05);
            const finMesh = new THREE.Mesh(finGeometry, titaniumMaterial);
            finMesh.position.set(
                motorX + Math.cos(finAngle) * 0.19,
                0.08,
                motorZ + Math.sin(finAngle) * 0.19
            );
            finMesh.rotation.y = finAngle;
            finMesh.castShadow = true;
            droneGroup.add(finMesh);
        }

        // Motor bell (high-end metal finish)
        const motorBellGeometry = new THREE.CylinderGeometry(0.2, 0.18, 0.12, 20);
        const motorBell = new THREE.Mesh(motorBellGeometry, titaniumMaterial);
        motorBell.position.set(motorX, 0.24, motorZ);
        motorBell.castShadow = true;
        droneGroup.add(motorBell);

        // Motor coil detail (visible through bell)
        const coilGeometry = new THREE.TorusGeometry(0.14, 0.02, 8, 16);
        const coilMaterial = new THREE.MeshStandardMaterial({
            color: 0xcc6600,
            metalness: 0.9,
            roughness: 0.3
        });
        const coil = new THREE.Mesh(coilGeometry, coilMaterial);
        coil.position.set(motorX, 0.2, motorZ);
        coil.rotation.x = Math.PI / 2;
        droneGroup.add(coil);

        // Motor shaft (precision machined)
        const shaftGeometry = new THREE.CylinderGeometry(0.035, 0.035, 0.18, 12);
        const shaft = new THREE.Mesh(shaftGeometry, titaniumMaterial);
        shaft.position.set(motorX, 0.38, motorZ);
        droneGroup.add(shaft);

        // Premium 3-blade propeller
        const propellerGroup = new THREE.Group();
        for (let i = 0; i < 3; i++) {
            const blade = createPropellerBlade();
            blade.rotation.y = (i * Math.PI * 2) / 3;
            propellerGroup.add(blade);
        }
        propellerGroup.position.set(motorX, 0.47, motorZ);
        droneGroup.add(propellerGroup);
        droneGroup.userData.propellers.push(propellerGroup);

        // Propeller hub (CNC machined aluminum look)
        const hubGeometry = new THREE.CylinderGeometry(0.065, 0.075, 0.04, 6);
        const hub = new THREE.Mesh(hubGeometry, titaniumMaterial);
        hub.position.set(motorX, 0.47, motorZ);
        droneGroup.add(hub);

        // Hub center nut (red anodized)
        const nutGeometry = new THREE.CylinderGeometry(0.045, 0.045, 0.05, 6);
        const nut = new THREE.Mesh(nutGeometry, redAccentMaterial);
        nut.position.set(motorX, 0.495, motorZ);
        droneGroup.add(nut);

        // Navigation LED (aviation grade)
        const ledSize = 0.04;
        const ledGeometry = new THREE.SphereGeometry(ledSize, 12, 12);
        const ledColor = index < 2 ? 0xff0000 : 0x00ff00; // Front red, back green
        const ledMaterial = new THREE.MeshStandardMaterial({
            color: ledColor,
            emissive: ledColor,
            emissiveIntensity: 4,
            transparent: true,
            opacity: 0.95
        });
        const led = new THREE.Mesh(ledGeometry, ledMaterial);
        led.position.set(motorX, 0.02, motorZ);
        droneGroup.add(led);

        // LED point light (brighter)
        const ledLight = new THREE.PointLight(ledColor, 0.8, 4);
        ledLight.position.set(motorX, 0.02, motorZ);
        droneGroup.add(ledLight);

        // Motor power indicator (small LED)
        const powerLedGeometry = new THREE.SphereGeometry(0.02, 8, 8);
        const powerLed = new THREE.Mesh(powerLedGeometry, new THREE.MeshStandardMaterial({
            color: 0x0080ff,
            emissive: 0x0080ff,
            emissiveIntensity: 3
        }));
        powerLed.position.set(motorX, 0.15, motorZ);
        droneGroup.add(powerLed);
    });

    // Professional 3-axis gimbal system
    const gimbalBaseGeometry = new THREE.SphereGeometry(0.08, 12, 12);
    const gimbalBase = new THREE.Mesh(gimbalBaseGeometry, titaniumMaterial);
    gimbalBase.position.set(0, -0.18, 0.25);
    gimbalBase.castShadow = true;
    droneGroup.add(gimbalBase);

    // Gimbal arms (dual axis)
    const gimbalArmGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
    const gimbalArm1 = new THREE.Mesh(gimbalArmGeometry, titaniumMaterial);
    gimbalArm1.position.set(0, -0.24, 0.32);
    gimbalArm1.castShadow = true;
    droneGroup.add(gimbalArm1);

    // Camera housing (premium compact design)
    const cameraBodyGeometry = new THREE.BoxGeometry(0.22, 0.12, 0.16);
    cameraBodyGeometry.translate(0, 0, 0.08);
    const cameraBody = new THREE.Mesh(cameraBodyGeometry, mattePlasticMaterial);
    cameraBody.position.set(0, -0.3, 0.32);
    cameraBody.castShadow = true;
    droneGroup.add(cameraBody);

    // Camera lens assembly (large sensor)
    const lensHousingGeometry = new THREE.CylinderGeometry(0.09, 0.09, 0.12, 20);
    const lensHousing = new THREE.Mesh(lensHousingGeometry, mattePlasticMaterial);
    lensHousing.rotation.x = Math.PI / 2;
    lensHousing.position.set(0, -0.3, 0.48);
    lensHousing.castShadow = true;
    droneGroup.add(lensHousing);

    // Lens glass (multi-coated optics)
    const glassGeometry = new THREE.CircleGeometry(0.08, 20);
    const glassMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a2a3e,
        metalness: 1,
        roughness: 0.05,
        emissive: 0x0a1520,
        emissiveIntensity: 0.8
    });
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.rotation.y = Math.PI / 2;
    glass.position.set(0, -0.3, 0.54);
    droneGroup.add(glass);

    // Lens hood
    const lensHoodGeometry = new THREE.CylinderGeometry(0.095, 0.11, 0.06, 20);
    const lensHood = new THREE.Mesh(lensHoodGeometry, mattePlasticMaterial);
    lensHood.rotation.x = Math.PI / 2;
    lensHood.position.set(0, -0.3, 0.57);
    droneGroup.add(lensHood);

    // Camera status LED
    const camLedGeometry = new THREE.SphereGeometry(0.015, 8, 8);
    const camLed = new THREE.Mesh(camLedGeometry, new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 4
    }));
    camLed.position.set(0.08, -0.28, 0.38);
    droneGroup.add(camLed);

    // Retractable landing gear (premium design)
    const legPositions = [
        { x: 0.55, z: 0.55 },
        { x: -0.55, z: 0.55 },
        { x: 0.55, z: -0.55 },
        { x: -0.55, z: -0.55 }
    ];

    legPositions.forEach(legPos => {
        // Main leg strut (carbon fiber)
        const legGeometry = new THREE.CylinderGeometry(0.018, 0.022, 0.28, 8);
        const leg = new THREE.Mesh(legGeometry, carbonFiberMaterial);
        leg.position.set(legPos.x, -0.18, legPos.z);
        leg.castShadow = true;
        droneGroup.add(leg);

        // Shock absorber detail
        const shockGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.08, 8);
        const shock = new THREE.Mesh(shockGeometry, titaniumMaterial);
        shock.position.set(legPos.x, -0.24, legPos.z);
        droneGroup.add(shock);

        // Foot pad (high-grip rubber)
        const footGeometry = new THREE.SphereGeometry(0.035, 10, 10);
        footGeometry.scale(1, 0.6, 1);
        const footMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            metalness: 0,
            roughness: 1
        });
        const foot = new THREE.Mesh(footGeometry, footMaterial);
        foot.position.set(legPos.x, -0.32, legPos.z);
        droneGroup.add(foot);
    });

    // Antenna array (dual diversity)
    for (let ant = 0; ant < 2; ant++) {
        const antennaGeometry = new THREE.CylinderGeometry(0.008, 0.008, 0.35, 6);
        const antenna = new THREE.Mesh(antennaGeometry, mattePlasticMaterial);
        antenna.position.set(ant === 0 ? 0.22 : -0.22, 0.28, -0.25);
        antenna.rotation.z = (ant === 0 ? 1 : -1) * Math.PI / 8;
        droneGroup.add(antenna);

        // Antenna tip (signal)
        const tipGeometry = new THREE.SphereGeometry(0.012, 6, 6);
        const tip = new THREE.Mesh(tipGeometry, redAccentMaterial);
        tip.position.set(ant === 0 ? 0.25 : -0.25, 0.58, -0.3);
        droneGroup.add(tip);
    }

    return droneGroup;
}

// Create realistic propeller blade
function createPropellerBlade() {
    const bladeShape = new THREE.Shape();

    // Airfoil-shaped blade profile
    bladeShape.moveTo(0, 0);
    bladeShape.quadraticCurveTo(0.3, 0.08, 0.6, 0.06);
    bladeShape.quadraticCurveTo(0.8, 0.04, 1, 0.01);
    bladeShape.lineTo(1, -0.01);
    bladeShape.quadraticCurveTo(0.8, -0.02, 0.6, -0.03);
    bladeShape.quadraticCurveTo(0.3, -0.04, 0, 0);

    const extrudeSettings = {
        depth: 0.02,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.01,
        bevelSegments: 2
    };

    const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
    const bladeMaterial = new THREE.MeshStandardMaterial({
        color: 0x2c2c2c,
        metalness: 0.4,
        roughness: 0.3,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
    });

    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.rotation.x = -Math.PI / 2;
    blade.position.z = -0.01;
    blade.castShadow = true;

    return blade;
}

// Add clouds to the scene
function addClouds() {
    for (let i = 0; i < 20; i++) {
        const cloudGroup = new THREE.Group();

        for (let j = 0; j < 5; j++) {
            const cloudGeometry = new THREE.SphereGeometry(
                Math.random() * 2 + 1,
                16,
                16
            );
            const cloudMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.6
            });
            const cloudPart = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloudPart.position.set(
                Math.random() * 4 - 2,
                Math.random() * 2 - 1,
                Math.random() * 4 - 2
            );
            cloudGroup.add(cloudPart);
        }

        cloudGroup.position.set(
            Math.random() * 100 - 50,
            Math.random() * 30 + 20,
            Math.random() * 100 - 50
        );
        scene.add(cloudGroup);
    }
}

// Convert text to 3D path points
function textToPath(text) {
    const points = [];
    const spacing = 8; // Space between characters
    const scale = 5;   // Size of characters

    let currentX = -(text.length * spacing) / 2;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const charPoints = getCharacterPath(char, currentX, 0, scale);
        points.push(...charPoints);
        currentX += spacing;
    }

    return points;
}

// Get path points for individual characters
function getCharacterPath(char, offsetX, offsetY, scale) {
    const points = [];

    // Basic character patterns (simplified for Korean, English, and numbers)
    const patterns = {
        // Numbers
        '0': [[0.5,0], [0.5,1], [0.5,2], [0,2], [0,1], [0,0], [0.5,0]],
        '1': [[0.25,0], [0.25,1], [0.25,2]],
        '2': [[0,2], [0.5,2], [0.5,1], [0,1], [0,0], [0.5,0]],
        '3': [[0,2], [0.5,2], [0.5,1.5], [0.25,1.5], [0.5,1.5], [0.5,1], [0.5,0.5], [0.5,0], [0,0]],
        '4': [[0,2], [0,1], [0.5,1], [0.5,2], [0.5,1], [0.5,0]],
        '5': [[0.5,2], [0,2], [0,1], [0.5,1], [0.5,0], [0,0]],
        '6': [[0.5,2], [0,2], [0,1], [0,0], [0.5,0], [0.5,1], [0,1]],
        '7': [[0,2], [0.5,2], [0.5,0]],
        '8': [[0,1], [0,2], [0.5,2], [0.5,1], [0,1], [0,0], [0.5,0], [0.5,1]],
        '9': [[0.5,0], [0.5,2], [0,2], [0,1], [0.5,1]],

        // English letters (uppercase)
        'A': [[0,0], [0,2], [0.5,2], [0.5,0], [0,1], [0.5,1]],
        'B': [[0,0], [0,2], [0.5,2], [0.5,1.5], [0,1.5], [0.5,1.5], [0.5,1], [0.5,0], [0,0]],
        'C': [[0.5,2], [0,2], [0,1], [0,0], [0.5,0]],
        'D': [[0,0], [0,2], [0.5,1.8], [0.5,0.2], [0,0]],
        'E': [[0.5,2], [0,2], [0,1], [0.4,1], [0,1], [0,0], [0.5,0]],
        'F': [[0,0], [0,2], [0.5,2], [0,1], [0.4,1]],
        'G': [[0.5,2], [0,2], [0,0], [0.5,0], [0.5,1], [0.25,1]],
        'H': [[0,0], [0,2], [0,1], [0.5,1], [0.5,0], [0.5,2]],
        'I': [[0.1,2], [0.4,2], [0.25,2], [0.25,0], [0.1,0], [0.4,0]],
        'J': [[0,2], [0.5,2], [0.5,0.5], [0.25,0], [0,0.5]],
        'K': [[0,0], [0,2], [0,1], [0.5,2], [0,1], [0.5,0]],
        'L': [[0,2], [0,0], [0.5,0]],
        'M': [[0,0], [0,2], [0.25,1], [0.5,2], [0.5,0]],
        'N': [[0,0], [0,2], [0.5,0], [0.5,2]],
        'O': [[0,0], [0,2], [0.5,2], [0.5,0], [0,0]],
        'P': [[0,0], [0,2], [0.5,2], [0.5,1], [0,1]],
        'Q': [[0,0], [0,2], [0.5,2], [0.5,0], [0,0], [0.3,0.3], [0.6,-0.2]],
        'R': [[0,0], [0,2], [0.5,2], [0.5,1], [0,1], [0.5,0]],
        'S': [[0.5,2], [0,2], [0,1], [0.5,1], [0.5,0], [0,0]],
        'T': [[0,2], [0.5,2], [0.25,2], [0.25,0]],
        'U': [[0,2], [0,0], [0.5,0], [0.5,2]],
        'V': [[0,2], [0.25,0], [0.5,2]],
        'W': [[0,2], [0,0], [0.25,1], [0.5,0], [0.5,2]],
        'X': [[0,2], [0.5,0], [0.25,1], [0,0], [0.5,2]],
        'Y': [[0,2], [0.25,1], [0.5,2], [0.25,1], [0.25,0]],
        'Z': [[0,2], [0.5,2], [0,0], [0.5,0]],

        // Korean characters (simplified patterns)
        'ㄱ': [[0,2], [0.5,2], [0.5,1]],
        'ㄴ': [[0,2], [0,0], [0.5,0]],
        'ㄷ': [[0,2], [0.5,2], [0.5,1], [0,1], [0,0], [0.5,0]],
        'ㄹ': [[0,2], [0.3,2], [0.3,1.5], [0,1.5], [0,1], [0.5,1], [0.5,0]],
        'ㅁ': [[0,0], [0,2], [0.5,2], [0.5,0], [0,0]],
        'ㅂ': [[0,0], [0,2], [0.5,2], [0.5,0], [0.25,1.5], [0.25,0]],
        'ㅅ': [[0,2], [0.25,1], [0.5,2]],
        'ㅇ': [[0.25,2.2], [0,1.8], [0,1.2], [0.25,0.8], [0.5,1.2], [0.5,1.8], [0.25,2.2]],
        'ㅈ': [[0,1.8], [0.5,1.8], [0.25,1.3], [0.5,0.8]],
        'ㅊ': [[0,2.2], [0.5,2.2], [0,1.8], [0.5,1.8], [0.25,1.3], [0.5,0.8]],
        'ㅋ': [[0,2], [0.5,2], [0.5,1.5], [0.5,1], [0,1], [0,0]],
        'ㅌ': [[0,2.2], [0.5,2.2], [0,1.8], [0.5,1.8], [0.5,1], [0,1], [0,0], [0.5,0]],
        'ㅍ': [[0,0], [0,2], [0.5,2], [0.5,0], [0,1], [0.5,1]],
        'ㅎ': [[0.25,2.2], [0,1.8], [0.5,1.8], [0.25,1.4], [0,1], [0.25,0.6], [0.5,1]],

        // Space
        ' ': [[0,0]]
    };

    // Get pattern or create circle for unknown characters
    let pattern = patterns[char.toUpperCase()];

    if (!pattern) {
        // Create a circle for unknown characters
        pattern = [];
        for (let angle = 0; angle <= Math.PI * 2; angle += Math.PI / 8) {
            pattern.push([
                Math.cos(angle) * 0.3 + 0.25,
                Math.sin(angle) * 0.3 + 1
            ]);
        }
    }

    // Convert pattern to 3D points
    pattern.forEach(([x, y]) => {
        points.push(new THREE.Vector3(
            offsetX + x * scale,
            y * scale,
            0
        ));
    });

    return points;
}

// Create particle effect
function createParticle(position, color) {
    const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    particle.position.copy(position);

    particle.userData = {
        velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2
        ),
        life: 1.0
    };

    scene.add(particle);
    particles.push(particle);
}

// Start drawing with drones
function startDrawing() {
    const text = document.getElementById('textInput').value.trim();

    if (!text) {
        alert('글자를 입력해주세요!');
        return;
    }

    if (isAnimating) {
        reset();
    }

    // Resume audio context if suspended (browser autoplay policy)
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }

    isAnimating = true;
    const path = textToPath(text);

    if (path.length === 0) {
        alert('지원되지 않는 문자가 포함되어 있습니다.');
        return;
    }

    // Create drones for each path segment
    let currentPath = [];
    drones = [];
    droneAudioNodes = [];

    path.forEach((point, index) => {
        currentPath.push(point);

        // Create new drone for each segment
        if (currentPath.length === 2 || index === path.length - 1) {
            const drone = createDrone();
            drone.position.copy(currentPath[0]);

            // Create sound for this drone
            const droneSound = createDroneSound();

            drone.userData = {
                path: [...currentPath],
                currentPointIndex: 0,
                progress: 0,
                color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
                active: false,
                delay: index * 2, // Stagger drone starts
                sound: droneSound
            };
            scene.add(drone);
            drones.push(drone);

            if (droneSound) {
                droneAudioNodes.push(droneSound);
            }

            currentPath = [point];
        }
    });

    document.getElementById('droneCount').textContent = drones.length;

    // Create trail line
    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
        transparent: true,
        opacity: 0.8
    });
    const trail = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trail);
    trail.userData.positions = [];
    trails.push(trail);
}

// Reset scene
function reset() {
    // Stop all drone sounds
    droneAudioNodes.forEach(sound => stopDroneSound(sound));
    droneAudioNodes = [];

    drones.forEach(drone => scene.remove(drone));
    trails.forEach(trail => scene.remove(trail));
    particles.forEach(particle => scene.remove(particle));

    drones = [];
    trails = [];
    particles = [];
    isAnimating = false;

    document.getElementById('droneCount').textContent = '0';
    document.getElementById('progress').textContent = '0';
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (isAnimating && drones.length > 0) {
        let totalProgress = 0;
        let activeDrones = 0;

        drones.forEach((drone, droneIndex) => {
            // Rotate propellers
            if (drone.userData.propellers) {
                drone.userData.propellers.forEach(propeller => {
                    propeller.rotation.y += 0.5;
                });
            }

            // Handle delay before starting
            if (drone.userData.delay > 0) {
                drone.userData.delay -= animationSpeed;
                // Idle sound for waiting drone
                if (drone.userData.sound) {
                    updateDroneSound(drone.userData.sound, false, 0);
                }
                return;
            }

            drone.userData.active = true;
            activeDrones++;

            const path = drone.userData.path;

            if (drone.userData.currentPointIndex < path.length - 1) {
                const start = path[drone.userData.currentPointIndex];
                const end = path[drone.userData.currentPointIndex + 1];

                drone.userData.progress += 0.02 * animationSpeed;

                if (drone.userData.progress >= 1) {
                    drone.userData.progress = 0;
                    drone.userData.currentPointIndex++;
                }

                // Interpolate position
                const t = drone.userData.progress;
                drone.position.lerpVectors(start, end, t);

                // Add wobble effect
                drone.position.y += Math.sin(Date.now() * 0.01) * 0.1;

                // Look at direction of movement
                const direction = new THREE.Vector3()
                    .subVectors(end, start)
                    .normalize();
                drone.lookAt(
                    drone.position.x + direction.x,
                    drone.position.y + direction.y,
                    drone.position.z + direction.z
                );

                // Update drone sound based on movement
                if (drone.userData.sound) {
                    updateDroneSound(drone.userData.sound, true, animationSpeed);
                }

                // Create particles
                if (Math.random() < 0.3) {
                    createParticle(drone.position, drone.userData.color);
                }

                // Update trail
                if (trails[droneIndex]) {
                    const positions = trails[droneIndex].userData.positions;
                    positions.push(drone.position.clone());

                    const posArray = new Float32Array(positions.length * 3);
                    positions.forEach((pos, i) => {
                        posArray[i * 3] = pos.x;
                        posArray[i * 3 + 1] = pos.y;
                        posArray[i * 3 + 2] = pos.z;
                    });

                    trails[droneIndex].geometry.setAttribute(
                        'position',
                        new THREE.BufferAttribute(posArray, 3)
                    );
                    trails[droneIndex].material.color = drone.userData.color;
                }

                totalProgress += (drone.userData.currentPointIndex + drone.userData.progress) / path.length;
            } else {
                // Drone finished path - idle sound
                if (drone.userData.sound) {
                    updateDroneSound(drone.userData.sound, false, 0);
                }
                totalProgress += 1;
            }
        });

        // Update progress display
        if (activeDrones > 0) {
            const progress = Math.round((totalProgress / drones.length) * 100);
            document.getElementById('progress').textContent = progress;
        }
    }

    // Update particles
    particles.forEach((particle, index) => {
        particle.position.add(particle.userData.velocity);
        particle.userData.life -= 0.02;
        particle.material.opacity = particle.userData.life;

        if (particle.userData.life <= 0) {
            scene.remove(particle);
            particles.splice(index, 1);
        }
    });

    // Camera rotation
    const time = Date.now() * 0.0001;
    camera.position.x = Math.sin(time) * 50;
    camera.position.z = Math.cos(time) * 50;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize on load
window.addEventListener('load', init);
