// --- 1. FITQUEST GAME ENGINE REGISTRATION & STATE ---
let currentLevel = 1;
let highScore = parseFloat(localStorage.getItem('fitquest_highscore')) || 0;
let gameActive = false, gameTimer = 0, timerInterval = null;
let playerX = 100, playerY = 300, playerSpeed = 5, playerHp = 100, isStickyMultiplier = 1.0;
let enemyX = 600, enemyY = 300, enemyHp = 100, enemyShieldActive = true, bossCanAttack = false;
let joystickActive = false, joyStartX = 0, joyStartY = 0, moveDirX = 0, moveDirY = 0;
const maxJoystickDistance = 40;
let stepRate = 0.0, lastAcceleration = { x: 0, y: 0, z: 0 }, shakeThreshold = 15, bossProjectileInterval = null;

// --- 2. DOM CACHING ---
const overlay = document.getElementById('overlay');
const levelValueDisplay = document.getElementById('menu-level-display');
const highScoreDisplay = document.getElementById('high-score-display');
const startBtn = document.getElementById('action-btn');
const playerEl = document.getElementById('player');
const enemyEl = document.getElementById('enemy');
const powerupEl = document.getElementById('powerup-item');
const navArrowEl = document.getElementById('nav-arrow');
const statusMsg = document.getElementById('status-msg');
const pFill = document.getElementById('p-fill'), eFill = document.getElementById('e-fill');
const timerBadge = document.getElementById('timer-badge');
const joyBoundary = document.getElementById('joy-boundary'), joyStick = document.getElementById('joy-stick');
const motionDisplay = document.getElementById('motion-display');

// --- 3. INITIALIZATION & UI ---
window.addEventListener('DOMContentLoaded', () => {
  highScoreDisplay.textContent = highScore > 0 ? `🥇 Best Time: ${highScore.toFixed(2)}s` : "🥇 Best Time: --:--.--";
  initMotionSensors();
  setupJoystickInput();
});

function changeMenuLevel(direction) {
  currentLevel = Math.max(1, Math.min(3, currentLevel + direction));
  levelValueDisplay.textContent = `LEVEL ${currentLevel}`;
}

function selectGender(gender) {
  document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('active-pink'));
  if (gender === 'female') {
    document.getElementById('btn-female').classList.add('active-pink');
    playerEl.style.backgroundImage = "url('assets/hero-sprite.png')";
  } else {
    document.getElementById('btn-male').classList.add('active-pink');
    playerEl.style.backgroundImage = "url('assets/hero-sprite2.png')";
  }
}

function igniteEngine() { startGame(); }

// --- 4. GAME ENGINE LOGIC ---
function startGame() {
  overlay.style.display = 'none';
  playerHp = 100; enemyHp = 100; gameTimer = 0; gameActive = true;
  setupGameStageLayout(currentLevel);
  const startTime = performance.now();
  timerInterval = setInterval(() => {
    gameTimer = (performance.now() - startTime) / 1000;
    timerBadge.textContent = `⏱️ ${gameTimer.toFixed(2)}s`;
  }, 10);
  requestAnimationFrame(gameLoop);
}

function setupGameStageLayout(level) {
  const container = document.getElementById('game-container');
  document.querySelectorAll('.chocolate-wall, .sugar-puddle, .sugar-glob').forEach(el => el.remove());
  enemyShieldActive = true; enemyEl.classList.add('shielded');
  powerupEl.style.display = 'block';
  
  if (level === 1 || level === 3) buildChocolateBarObstacles(container);
  if (level === 2 || level === 3) {
    buildSyrupMudPuddles(container);
    bossCanAttack = true;
    activateBossProjectiles();
  }
  spawnPowerupApple();
}

function buildChocolateBarObstacles(parent) {
  const presets = [{left: 150, top: 180, width: 220, height: 50}, {left: 450, top: 400, width: 220, height: 50}];
  presets.forEach(data => {
    const b = document.createElement('div');
    b.className = 'chocolate-wall';
    Object.assign(b.style, {left: data.left+'px', top: data.top+'px', width: data.width+'px', height: data.height+'px', position: 'absolute', backgroundColor: '#5D4037'});
    parent.appendChild(b);
  });
}

function buildSyrupMudPuddles(parent) {
  const presets = [{left: 320, top: 280}, {left: 240, top: 420}, {left: 500, top: 160}];
  presets.forEach(pos => {
    const p = document.createElement('div');
    p.className = 'sugar-puddle';
    Object.assign(p.style, {left: pos.left+'px', top: pos.top+'px', position: 'absolute', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'purple', opacity: '0.5'});
    parent.appendChild(p);
  });
}

function gameLoop() {
  if (!gameActive) return;
  if (stepRate > 0.1) {
    playerX = Math.max(0, Math.min(window.innerWidth - 100, playerX + (moveDirX * playerSpeed * isStickyMultiplier)));
    playerY = Math.max(60, Math.min(window.innerHeight - 140, playerY + (moveDirY * playerSpeed * isStickyMultiplier)));
  }
  playerEl.style.left = playerX + 'px'; playerEl.style.top = playerY + 'px';
  updateNavigationRadar();
  processEnvironmentTriggers();
  requestAnimationFrame(gameLoop);
}

function updateNavigationRadar() {
  const pC = {x: playerX + 50, y: playerY + 50};
  const target = enemyShieldActive ? {x: parseFloat(powerupEl.style.left)+25, y: parseFloat(powerupEl.style.top)+25} : {x: enemyX+60, y: enemyY+60};
  navArrowEl.style.left = pC.x + 'px'; navArrowEl.style.top = pC.y + 'px';
  navArrowEl.style.transform = `rotate(${Math.atan2(target.y - pC.y, target.x - pC.x) * (180/Math.PI)}deg)`;
}

// --- 5. MOTION & SENSORS ---
function initMotionSensors() {
  window.addEventListener('devicemotion', (e) => {
    if (!gameActive) return;
    let acc = e.accelerationIncludingGravity;
    let mag = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2);
    stepRate = Math.abs(mag - lastAcceleration.gValue || 0) > 2.2 ? Math.min(1.0, stepRate + 0.15) : Math.max(0.0, stepRate - 0.02);
    lastAcceleration.gValue = mag;
    motionDisplay.textContent = stepRate > 0.1 ? "RUNNING" : "STOPPED";
  });
}

function setupJoystickInput() {
  joyBoundary.addEventListener('touchmove', (e) => {
    let touch = e.touches[0];
    let dX = touch.clientX - joyBoundary.offsetLeft - 40;
    let dY = touch.clientY - joyBoundary.offsetTop - 40;
    moveDirX = Math.max(-1, Math.min(1, dX / 40));
    moveDirY = Math.max(-1, Math.min(1, dY / 40));
  });
  joyBoundary.addEventListener('touchend', () => { moveDirX = 0; moveDirY = 0; });
}
