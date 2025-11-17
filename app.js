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

// Create a detailed drone model
function createDrone() {
    const droneGroup = new THREE.Group();

    // Main body
    const bodyGeometry = new THREE.BoxGeometry(1, 0.5, 1);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x2c3e50,
        metalness: 0.7,
        roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    droneGroup.add(body);

    // Create 4 arms
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 2, 8);
    const armMaterial = new THREE.MeshStandardMaterial({
        color: 0xe74c3c,
        metalness: 0.6,
        roughness: 0.4
    });

    const positions = [
        { x: 1.5, z: 1.5, rot: Math.PI / 4 },
        { x: -1.5, z: 1.5, rot: -Math.PI / 4 },
        { x: 1.5, z: -1.5, rot: -Math.PI / 4 },
        { x: -1.5, z: -1.5, rot: Math.PI / 4 }
    ];

    positions.forEach((pos, index) => {
        const arm = new THREE.Mesh(armGeometry, armMaterial);
        arm.position.set(pos.x / 2, 0, pos.z / 2);
        arm.rotation.z = pos.rot;
        arm.castShadow = true;
        droneGroup.add(arm);

        // Propeller
        const propellerGroup = new THREE.Group();
        for (let i = 0; i < 2; i++) {
            const propellerGeometry = new THREE.BoxGeometry(1.2, 0.05, 0.15);
            const propellerMaterial = new THREE.MeshStandardMaterial({
                color: 0x3498db,
                metalness: 0.8,
                roughness: 0.2,
                transparent: true,
                opacity: 0.7
            });
            const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
            propeller.rotation.y = i * Math.PI / 2;
            propellerGroup.add(propeller);
        }
        propellerGroup.position.set(pos.x, 0.5, pos.z);
        droneGroup.add(propellerGroup);

        // Store propeller for animation
        droneGroup.userData.propellers = droneGroup.userData.propellers || [];
        droneGroup.userData.propellers.push(propellerGroup);

        // LED light on each arm
        const ledGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const ledMaterial = new THREE.MeshStandardMaterial({
            color: index % 2 === 0 ? 0xff0000 : 0x00ff00,
            emissive: index % 2 === 0 ? 0xff0000 : 0x00ff00,
            emissiveIntensity: 2
        });
        const led = new THREE.Mesh(ledGeometry, ledMaterial);
        led.position.set(pos.x, 0, pos.z);
        droneGroup.add(led);

        // Point light for LED
        const ledLight = new THREE.PointLight(
            index % 2 === 0 ? 0xff0000 : 0x00ff00,
            1,
            5
        );
        ledLight.position.set(pos.x, 0, pos.z);
        droneGroup.add(ledLight);
    });

    // Camera on drone
    const cameraGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const cameraMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        metalness: 0.9,
        roughness: 0.1
    });
    const droneCamera = new THREE.Mesh(cameraGeometry, cameraMaterial);
    droneCamera.position.y = -0.3;
    droneGroup.add(droneCamera);

    return droneGroup;
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
