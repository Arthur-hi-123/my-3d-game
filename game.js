// 3D Space Shooter Game using Three.js

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x001a00);
scene.fog = new THREE.Fog(0x001a00, 500, 1000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(100, 100, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Game variables
const gameState = {
    score: 0,
    health: 100,
    ammo: 100,
    maxAmmo: 100,
    isGameOver: false
};

// Player controls
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);

// Mouse controls
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
});

// Player object
const player = {
    mesh: null,
    velocity: new THREE.Vector3(),
    speed: 0.5,
    jumpForce: 0.5,
    isJumping: false,
    health: 100,
    
    init() {
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, 1, 0);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);
    },
    
    update() {
        // Movement
        if (keys['w'] || keys['W']) this.mesh.position.z -= this.speed;
        if (keys['s'] || keys['S']) this.mesh.position.z += this.speed;
        if (keys['a'] || keys['A']) this.mesh.position.x -= this.speed;
        if (keys['d'] || keys['D']) this.mesh.position.x += this.speed;
        
        // Jumping
        if ((keys[' '] || keys['Space']) && !this.isJumping) {
            this.velocity.y = this.jumpForce;
            this.isJumping = true;
        }
        
        // Gravity
        this.velocity.y -= 0.02;
        this.mesh.position.y += this.velocity.y;
        
        // Ground collision
        if (this.mesh.position.y <= 1) {
            this.mesh.position.y = 1;
            this.velocity.y = 0;
            this.isJumping = false;
        }
        
        // Camera follows player
        camera.position.copy(this.mesh.position);
        camera.position.y += 1.5;
    }
};

// Bullets
const bullets = [];
function createBullet() {
    if (gameState.ammo <= 0) return;
    
    gameState.ammo--;
    
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshPhongMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(geometry, material);
    
    bullet.position.copy(camera.position);
    bullet.position.z -= 5;
    
    const direction = new THREE.Vector3(0, 0, -1);
    bullet.direction = direction.normalize();
    bullet.speed = 2;
    bullet.life = 300;
    
    scene.add(bullet);
    bullets.push(bullet);
}

// Click to shoot
document.addEventListener('click', () => {
    if (!gameState.isGameOver) {
        createBullet();
    }
});

// Enemies
const enemies = [];

function createEnemy() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const enemy = new THREE.Mesh(geometry, material);
    
    enemy.position.set(
        Math.random() * 200 - 100,
        5,
        Math.random() * 200 - 100
    );
    
    enemy.castShadow = true;
    enemy.receiveShadow = true;
    enemy.health = 3;
    enemy.shootTimer = 0;
    
    scene.add(enemy);
    enemies.push(enemy);
}

// Spawn enemies
let spawnTimer = 0;
function spawnEnemies() {
    spawnTimer++;
    if (spawnTimer > 60) {
        createEnemy();
        spawnTimer = 0;
    }
}

// Update bullets
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.add(bullet.direction.clone().multiplyScalar(bullet.speed));
        bullet.life--;
        
        // Remove if out of bounds or dead
        if (bullet.life <= 0 || Math.abs(bullet.position.x) > 500 || Math.abs(bullet.position.z) > 500) {
            scene.remove(bullet);
            bullets.splice(i, 1);
        }
    }
}

// Update enemies
function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Move toward player
        const direction = new THREE.Vector3().subVectors(player.mesh.position, enemy.position);
        direction.normalize();
        enemy.position.add(direction.multiplyScalar(0.3));
        
        // Check collision with bullets
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            const distance = enemy.position.distanceTo(bullet.position);
            
            if (distance < 1.5) {
                enemy.health--;
                scene.remove(bullet);
                bullets.splice(j, 1);
                
                if (enemy.health <= 0) {
                    gameState.score += 100;
                    scene.remove(enemy);
                    enemies.splice(i, 1);
                }
                break;
            }
        }
        
        // Check collision with player
        if (enemy.position.distanceTo(player.mesh.position) < 2) {
            player.health -= 0.5;
            gameState.health = Math.max(0, player.health);
            
            if (gameState.health <= 0) {
                endGame();
            }
        }
    }
}

// Ammo regeneration
let ammoTimer = 0;
function regenerateAmmo() {
    ammoTimer++;
    if (ammoTimer > 100) {
        gameState.ammo = Math.min(gameState.maxAmmo, gameState.ammo + 10);
        ammoTimer = 0;
    }
}

// End game
function endGame() {
    gameState.isGameOver = true;
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('finalScore').textContent = `Final Score: ${gameState.score}`;
}

// Update HUD
function updateHUD() {
    document.getElementById('score').textContent = `Score: ${gameState.score}`;
    document.getElementById('health').textContent = `Health: ${Math.ceil(gameState.health)}`;
    document.getElementById('ammo').textContent = `Ammo: ${gameState.ammo}`;
}

// Ground plane
const groundGeometry = new THREE.PlaneGeometry(500, 500);
const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x004400 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Initialize player
player.init();

// Main game loop
function animate() {
    requestAnimationFrame(animate);
    
    if (!gameState.isGameOver) {
        player.update();
        spawnEnemies();
        updateBullets();
        updateEnemies();
        regenerateAmmo();
        updateHUD();
    }
    
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the game
animate();
