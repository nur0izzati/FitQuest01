// --- 1. FITQUEST GAME ENGINE REGISTRATION & STATE ---
let currentLevel = 1;
let highScore = parseFloat(localStorage.getItem('fitquest_highscore')) || 0;
let gameActive = false, gameTimer = 0, timerInterval = null;
let playerX = 100, playerY = 300, playerSpeed = 5, playerHp = 100, isStickyMultiplier = 1.0;
let enemyX = 600, enemyY = 300, enemyHp = 100, enemyShieldActive = true, bossCanAttack = false;
let joystickActive = false, joyStartX = 0, joyStartY = 0, moveDirX = 0, moveDirY = 0;
const maxJoystickDistance = 40;
let stepRate = 0.0, lastAcceleration = { x: 0, y: 0, z: 0, gValue: 0 }, shakeThreshold = 15, bossProjectileInterval = null;

// --- 2. DOM CACHING (Initialized as null, assigned inside DOMContentLoaded) ---
let ui = {};

// --- 3. INITIALIZATION & UI ---
window.addEventListener('DOMContentLoaded', () => {
    // Safely cache elements
    ui = {
        overlay: document.getElementById('overlay'),
        levelValueDisplay: document.getElementById('menu-level-display'),
        highScoreDisplay: document.getElementById('high-score-display'),
        startBtn: document.getElementById('action-btn'),
        playerEl: document.getElementById('player'),
        enemyEl: document.getElementById('enemy'),
        powerupEl: document.getElementById('powerup-item'),
        navArrowEl: document.getElementById('nav-arrow'),
        timerBadge: document.getElementById('timer-badge'),
        joyBoundary: document.getElementById('joy-boundary'),
        motionDisplay: document.getElementById('motion-display')
    };

    ui.highScoreDisplay.textContent = highScore > 0 ? `🥇 Best Time: ${highScore.toFixed(2)}s` : "🥇 Best Time: --:--.--";
    
    initMotionSensors();
    setupJoystickInput();
});

function changeMenuLevel(direction) {
    currentLevel = Math.max(1, Math.min(3, currentLevel + direction));
    ui.levelValueDisplay.textContent = `LEVEL ${currentLevel}`;
}

// --- 4. GAME ENGINE LOGIC ---
function startGame() {
    ui.overlay.style.display = 'none';
    playerHp = 100; enemyHp = 100; gameTimer = 0; gameActive = true;
    setupGameStageLayout(currentLevel);
    
    const startTime = performance.now();
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        gameTimer = (performance.now() - startTime) / 1000;
        ui.timerBadge.textContent = `⏱️ ${gameTimer.toFixed(2)}s`;
    }, 10);
    requestAnimationFrame(gameLoop);
}

function setupGameStageLayout(level) {
    const container = document.getElementById('game-container');
    document.querySelectorAll('.chocolate-wall, .sugar-puddle, .sugar-glob').forEach(el => el.remove());
    enemyShieldActive = true; 
    ui.enemyEl.classList.add('shielded');
    ui.powerupEl.style.display = 'block';
    
    if (level === 1 || level === 3) buildChocolateBarObstacles(container);
    if (level === 2 || level === 3) {
        buildSyrupMudPuddles(container);
        bossCanAttack = true;
        activateBossProjectiles(); // Ensure this function is defined below
    }
    spawnPowerupApple(); // Ensure this function is defined below
}

// --- PLACEHOLDER FUNCTIONS TO PREVENT CRASHES ---
function spawnPowerupApple() { console.log("Spawning Apple..."); }
function activateBossProjectiles() { console.log("Boss firing..."); }
function processEnvironmentTriggers() { /* Add your collision logic here */ }
function buildChocolateBarObstacles(parent) { /* Your existing logic */ }
function buildSyrupMudPuddles(parent) { /* Your existing logic */ }

function gameLoop() {
    if (!gameActive) return;
    if (stepRate > 0.1) {
        playerX = Math.max(0, Math.min(window.innerWidth - 100, playerX + (moveDirX * playerSpeed * isStickyMultiplier)));
        playerY = Math.max(60, Math.min(window.innerHeight - 140, playerY + (moveDirY * playerSpeed * isStickyMultiplier)));
    }
    ui.playerEl.style.left = playerX + 'px'; 
    ui.playerEl.style.top = playerY + 'px';
    
    updateNavigationRadar();
    processEnvironmentTriggers();
    requestAnimationFrame(gameLoop);
}

function updateNavigationRadar() {
    const pC = {x: playerX + 50, y: playerY + 50};
    // Use fallback values if style is empty
    const powerupLeft = parseFloat(ui.powerupEl.style.left) || 0;
    const powerupTop = parseFloat(ui.powerupEl.style.top) || 0;
    const target = enemyShieldActive ? {x: powerupLeft + 25, y: powerupTop + 25} : {x: enemyX + 60, y: enemyY + 60};
    
    ui.navArrowEl.style.left = pC.x + 'px'; 
    ui.navArrowEl.style.top = pC.y + 'px';
    ui.navArrowEl.style.transform = `rotate(${Math.atan2(target.y - pC.y, target.x - pC.x) * (180/Math.PI)}deg)`;
}

// --- 5. MOTION & SENSORS ---
function initMotionSensors() {
    window.addEventListener('devicemotion', (e) => {
        if (!gameActive) return;
        let acc = e.accelerationIncludingGravity;
        if (!acc) return;
        let mag = Math.sqrt((acc.x || 0)**2 + (acc.y || 0)**2 + (acc.z || 0)**2);
        stepRate = Math.abs(mag - lastAcceleration.gValue) > 2.2 ? Math.min(1.0, stepRate + 0.15) : Math.max(0.0, stepRate - 0.02);
        lastAcceleration.gValue = mag;
        ui.motionDisplay.textContent = stepRate > 0.1 ? "RUNNING" : "STOPPED";
    });
}

function setupJoystickInput() {
    ui.joyBoundary.addEventListener('touchmove', (e) => {
        let touch = e.touches[0];
        let rect = ui.joyBoundary.getBoundingClientRect();
        let dX = touch.clientX - rect.left - 40;
        let dY = touch.clientY - rect.top - 40;
        moveDirX = Math.max(-1, Math.min(1, dX / 40));
        moveDirY = Math.max(-1, Math.min(1, dY / 40));
    });
    ui.joyBoundary.addEventListener('touchend', () => { moveDirX = 0; moveDirY = 0; });
}
