// Three.js 3D Scene Setup
let scene, camera, renderer, drones = [], trails = [], particles = [];
let animationSpeed = 1;
let isAnimating = false;

// Initialize the 3D scene
function init() {
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

// Create a realistic professional drone model (DJI/Racing drone style)
function createDrone() {
    const droneGroup = new THREE.Group();

    // Materials
    const carbonFiberMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.9,
        roughness: 0.3,
        envMapIntensity: 1
    });

    const metalMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.95,
        roughness: 0.15
    });

    const plasticBlackMaterial = new THREE.MeshStandardMaterial({
        color: 0x2c2c2c,
        metalness: 0.3,
        roughness: 0.6
    });

    const redAccentMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        metalness: 0.5,
        roughness: 0.4
    });

    // Central flight controller / main body
    const mainBodyGeometry = new THREE.BoxGeometry(0.8, 0.15, 0.8);
    const mainBody = new THREE.Mesh(mainBodyGeometry, carbonFiberMaterial);
    mainBody.castShadow = true;
    droneGroup.add(mainBody);

    // Top plate (stacked design)
    const topPlateGeometry = new THREE.BoxGeometry(0.7, 0.08, 0.7);
    const topPlate = new THREE.Mesh(topPlateGeometry, carbonFiberMaterial);
    topPlate.position.y = 0.2;
    topPlate.castShadow = true;
    droneGroup.add(topPlate);

    // Battery pack on top
    const batteryGeometry = new THREE.BoxGeometry(0.5, 0.15, 0.3);
    const batteryMaterial = new THREE.MeshStandardMaterial({
        color: 0x1e5a8e,
        metalness: 0.4,
        roughness: 0.5
    });
    const battery = new THREE.Mesh(batteryGeometry, batteryMaterial);
    battery.position.y = 0.32;
    battery.castShadow = true;
    droneGroup.add(battery);

    // Battery connector detail
    const connectorGeometry = new THREE.BoxGeometry(0.15, 0.05, 0.1);
    const connector = new THREE.Mesh(connectorGeometry, redAccentMaterial);
    connector.position.set(0, 0.38, -0.15);
    droneGroup.add(connector);

    // Flight controller board (visible through gap)
    const fcGeometry = new THREE.BoxGeometry(0.4, 0.02, 0.4);
    const fcMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d5016,
        metalness: 0.6,
        roughness: 0.4
    });
    const fc = new THREE.Mesh(fcGeometry, fcMaterial);
    fc.position.y = -0.05;
    droneGroup.add(fc);

    // Arm positions for X-configuration
    const armPositions = [
        { x: 1, z: 1, angle: Math.PI / 4 },      // Front right
        { x: -1, z: 1, angle: -Math.PI / 4 },    // Front left
        { x: 1, z: -1, angle: -Math.PI / 4 },    // Back right
        { x: -1, z: -1, angle: Math.PI / 4 }     // Back left
    ];

    droneGroup.userData.propellers = [];

    armPositions.forEach((armPos, index) => {
        // Carbon fiber arm (flat profile)
        const armLength = 2.2;
        const armGeometry = new THREE.BoxGeometry(0.12, 0.08, armLength);
        const arm = new THREE.Mesh(armGeometry, carbonFiberMaterial);

        arm.position.set(armPos.x * 0.3, 0, armPos.z * 0.3);
        arm.rotation.y = armPos.angle;
        arm.castShadow = true;
        droneGroup.add(arm);

        // Red accent stripe on arm
        const stripeGeometry = new THREE.BoxGeometry(0.13, 0.02, armLength * 0.3);
        const stripe = new THREE.Mesh(stripeGeometry, redAccentMaterial);
        stripe.position.set(armPos.x * 0.3, 0.05, armPos.z * 0.3);
        stripe.rotation.y = armPos.angle;
        droneGroup.add(stripe);

        // Motor housing at arm end
        const motorDistance = armLength / 2;
        const motorX = armPos.x * 0.3 + Math.sin(armPos.angle) * motorDistance;
        const motorZ = armPos.z * 0.3 + Math.cos(armPos.angle) * motorDistance;

        // Motor base
        const motorBaseGeometry = new THREE.CylinderGeometry(0.2, 0.25, 0.25, 16);
        const motorBase = new THREE.Mesh(motorBaseGeometry, plasticBlackMaterial);
        motorBase.position.set(motorX, 0.1, motorZ);
        motorBase.castShadow = true;
        droneGroup.add(motorBase);

        // Motor top (bell)
        const motorBellGeometry = new THREE.CylinderGeometry(0.22, 0.2, 0.15, 16);
        const motorBell = new THREE.Mesh(motorBellGeometry, metalMaterial);
        motorBell.position.set(motorX, 0.3, motorZ);
        motorBell.castShadow = true;
        droneGroup.add(motorBell);

        // Motor shaft
        const shaftGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 8);
        const shaft = new THREE.Mesh(shaftGeometry, metalMaterial);
        shaft.position.set(motorX, 0.45, motorZ);
        droneGroup.add(shaft);

        // Realistic propeller (3-blade)
        const propellerGroup = new THREE.Group();
        for (let i = 0; i < 3; i++) {
            const blade = createPropellerBlade();
            blade.rotation.y = (i * Math.PI * 2) / 3;
            propellerGroup.add(blade);
        }
        propellerGroup.position.set(motorX, 0.52, motorZ);
        droneGroup.add(propellerGroup);
        droneGroup.userData.propellers.push(propellerGroup);

        // Propeller hub/nut
        const hubGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 6);
        const hub = new THREE.Mesh(hubGeometry, redAccentMaterial);
        hub.position.set(motorX, 0.52, motorZ);
        droneGroup.add(hub);

        // Tiny LED indicator on arm
        const ledSize = 0.05;
        const ledGeometry = new THREE.SphereGeometry(ledSize, 8, 8);
        const ledColor = index < 2 ? 0xff0000 : 0x00ff00; // Front red, back green
        const ledMaterial = new THREE.MeshStandardMaterial({
            color: ledColor,
            emissive: ledColor,
            emissiveIntensity: 3,
            transparent: true,
            opacity: 0.9
        });
        const led = new THREE.Mesh(ledGeometry, ledMaterial);
        led.position.set(motorX, 0.05, motorZ);
        droneGroup.add(led);

        // Subtle LED point light
        const ledLight = new THREE.PointLight(ledColor, 0.5, 3);
        ledLight.position.set(motorX, 0.05, motorZ);
        droneGroup.add(ledLight);
    });

    // Camera gimbal mount (professional 3-axis gimbal style)
    const gimbalArmGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
    const gimbalArm = new THREE.Mesh(gimbalArmGeometry, metalMaterial);
    gimbalArm.position.set(0, -0.25, 0.3);
    gimbalArm.castShadow = true;
    droneGroup.add(gimbalArm);

    // Camera body (realistic camera shape)
    const cameraBodyGeometry = new THREE.BoxGeometry(0.25, 0.15, 0.2);
    const cameraBody = new THREE.Mesh(cameraBodyGeometry, plasticBlackMaterial);
    cameraBody.position.set(0, -0.35, 0.35);
    cameraBody.castShadow = true;
    droneGroup.add(cameraBody);

    // Camera lens
    const lensGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 16);
    const lensMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        metalness: 0.95,
        roughness: 0.05
    });
    const lens = new THREE.Mesh(lensGeometry, lensMaterial);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, -0.35, 0.45);
    droneGroup.add(lens);

    // Lens glass (reflective)
    const glassGeometry = new THREE.CircleGeometry(0.07, 16);
    const glassMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a3e,
        metalness: 1,
        roughness: 0.1,
        emissive: 0x0a0a1e,
        emissiveIntensity: 0.5
    });
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.rotation.y = Math.PI / 2;
    glass.position.set(0, -0.35, 0.5);
    droneGroup.add(glass);

    // GPS module on top
    const gpsGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.08, 8);
    const gpsMaterial = new THREE.MeshStandardMaterial({
        color: 0x2c2c2c,
        metalness: 0.2,
        roughness: 0.7
    });
    const gps = new THREE.Mesh(gpsGeometry, gpsMaterial);
    gps.position.set(0, 0.45, 0);
    droneGroup.add(gps);

    // Antenna (thin rod)
    const antennaGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.4, 6);
    const antenna = new THREE.Mesh(antennaGeometry, metalMaterial);
    antenna.position.set(0.25, 0.3, -0.3);
    antenna.rotation.z = Math.PI / 6;
    droneGroup.add(antenna);

    // Landing gear (4 small legs)
    const legPositions = [
        { x: 0.6, z: 0.6 },
        { x: -0.6, z: 0.6 },
        { x: 0.6, z: -0.6 },
        { x: -0.6, z: -0.6 }
    ];

    legPositions.forEach(legPos => {
        const legGeometry = new THREE.CylinderGeometry(0.02, 0.025, 0.3, 6);
        const leg = new THREE.Mesh(legGeometry, plasticBlackMaterial);
        leg.position.set(legPos.x, -0.2, legPos.z);
        leg.castShadow = true;
        droneGroup.add(leg);

        // Rubber foot
        const footGeometry = new THREE.SphereGeometry(0.04, 8, 8);
        const footMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0,
            roughness: 0.9
        });
        const foot = new THREE.Mesh(footGeometry, footMaterial);
        foot.position.set(legPos.x, -0.35, legPos.z);
        droneGroup.add(foot);
    });

    // Small details: ESC wires (tiny cylinders)
    armPositions.forEach((armPos, index) => {
        const wireGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4);
        const wireMaterial = new THREE.MeshStandardMaterial({
            color: index % 2 === 0 ? 0xff0000 : 0x000000,
            metalness: 0.2,
            roughness: 0.8
        });
        const wire = new THREE.Mesh(wireGeometry, wireMaterial);
        wire.position.set(armPos.x * 0.2, -0.05, armPos.z * 0.2);
        wire.rotation.y = armPos.angle;
        wire.rotation.z = Math.PI / 2;
        droneGroup.add(wire);
    });

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

    isAnimating = true;
    const path = textToPath(text);

    if (path.length === 0) {
        alert('지원되지 않는 문자가 포함되어 있습니다.');
        return;
    }

    // Create drones for each path segment
    let currentPath = [];
    drones = [];

    path.forEach((point, index) => {
        currentPath.push(point);

        // Create new drone for each segment
        if (currentPath.length === 2 || index === path.length - 1) {
            const drone = createDrone();
            drone.position.copy(currentPath[0]);
            drone.userData = {
                path: [...currentPath],
                currentPointIndex: 0,
                progress: 0,
                color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
                active: false,
                delay: index * 2 // Stagger drone starts
            };
            scene.add(drone);
            drones.push(drone);

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
