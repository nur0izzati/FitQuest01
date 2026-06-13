// --- FITQUEST GAME ENGINE REGISTRATION & STATE ---
let currentLevel = 1;
let highScore = parseFloat(localStorage.getItem('fitquest_highscore')) || 0;
let gameActive = false;
let gameTimer = 0;
let timerInterval = null;

// Player & Boss Entities State
let playerX = 100;
let playerY = 300;
let playerSpeed = 5;
let playerHp = 100;
let isStickyMultiplier = 1.0;

let enemyX = 600;
let enemyY = 300;
let enemyHp = 100;
let enemyShieldActive = true;
let bossCanAttack = false;

// Virtual Joystick State
let joystickActive = false;
let joyStartX = 0;
let joyStartY = 0;
let moveDirX = 0;
let moveDirY = 0;
const maxJoystickDistance = 40;

// Fitness/Movement Mechanics Tracking
let stepRate = 0.0;
let lastAcceleration = { x: 0, y: 0, z: 0 };
let shakeThreshold = 15; 
let bossProjectileInterval = null;

// Cache DOM elements
const overlay = document.getElementById('overlay');
const levelValueDisplay = document.getElementById('level-value');
const highScoreDisplay = document.getElementById('high-score-display');
const startBtn = document.getElementById('start-btn');
const prevLevelBtn = document.getElementById('prev-lvl');
const nextLevelBtn = document.getElementById('next-lvl');
const resetScoreBtn = document.getElementById('reset-score');

const playerEl = document.getElementById('player');
const enemyEl = document.getElementById('enemy');
const powerupEl = document.getElementById('powerup-item');
const navArrowEl = document.getElementById('nav-arrow');
const statusMsg = document.getElementById('status-msg');

const pFill = document.getElementById('p-fill');
const eFill = document.getElementById('e-fill');
const timerBadge = document.getElementById('timer-badge');
const levelBadge = document.getElementById('level-badge');

const joyBoundary = document.getElementById('joy-boundary');
const joyStick = document.getElementById('joy-stick');

// --- 1. INITIALIZATION & MENU EVENT LISTENERS ---
window.addEventListener('DOMContentLoaded', () => {
  // Setup display defaults from storage
  highScoreDisplay.textContent = highScore > 0 ? `Best Time: ${highScore.toFixed(2)}s` : "Best Time: 00:00";
  
  // Level Selector Arrow Buttons
  prevLevelBtn.addEventListener('click', () => {
    if (currentLevel > 1) {
      currentLevel--;
      updateMenuUI();
    }
  });

  nextLevelBtn.addEventListener('click', () => {
    if (currentLevel < 3) {
      currentLevel++;
      updateMenuUI();
    }
  });

  // Reset Highscore Button
  resetScoreBtn.addEventListener('click', () => {
    localStorage.removeItem('fitquest_highscore');
    highScore = 0;
    highScoreDisplay.textContent = "Best Time: 00:00";
  });

  // Character Toggle Buttons (Cosmetic Customization Interaction)
  const charBtns = document.querySelectorAll('.char-btn');
  charBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      charBtns.forEach(b => b.classList.remove('active-pink'));
      btn.classList.add('active-pink');
      if(btn.id === 'char-male') {
        playerEl.style.backgroundImage = "url('assets/hero-sprite2.png')";
      } else {
        playerEl.style.backgroundImage = "url('assets/hero-sprite.png')";
      }
    });
  });

  // Main CTA Start Game Trigger
  startBtn.addEventListener('click', startGame);
  
  // Setup Mobile Web Sensor Mechanics (Accelerometer)
  initMotionSensors();
  setupJoystickInput();
});

function updateMenuUI() {
  levelValueDisplay.textContent = `LEVEL ${currentLevel}`;
}

// --- 2. THE CHOSEN CORE ENGINE LAYOUT: LEVEL CONFIGURATIONS ---
function setupGameStageLayout(level) {
  console.log(`Loading system configuration for FitQuest Level ${level}...`);
  
  // Reset clean scene vectors
  const obstaclesLayer = document.getElementById('game-container');
  
  // Remove any previously spawned dynamic obstacles or puddles
  document.querySelectorAll('.chocolate-wall, .sugar-puddle, .sugar-glob').forEach(el => el.remove());
  
  // Default values reset
  isStickyMultiplier = 1.0;
  playerEl.classList.remove('sticky-slow');
  enemyShieldActive = true;
  enemyEl.classList.add('shielded');
  powerupEl.style.display = 'block';
  
  // Randomize Apple spawn coordinate placement 
  spawnPowerupApple();

  // Clear existing projectile timers
  if (bossProjectileInterval) clearInterval(bossProjectileInterval);

  // LEVEL PROGRESSION LOGIC TREE
  switch (level) {
    case 1:
      // LEVEL 1 - Chocolate Bar Barriers Only
      buildChocolateBarObstacles(obstaclesLayer);
      bossCanAttack = false;
      break;

    case 2:
      // LEVEL 2 - Syrup Puddles & Active Boss Attacks
      buildSyrupMudPuddles(obstaclesLayer);
      bossCanAttack = true;
      activateBossProjectiles();
      break;

    case 3:
      // LEVEL 3 - Combine Level 1 & 2 Together (Ultimate Challenge)
      buildChocolateBarObstacles(obstaclesLayer);
      buildSyrupMudPuddles(obstaclesLayer);
      bossCanAttack = true;
      activateBossProjectiles();
      break;
  }
}

// --- 3. DYNAMIC GENERATION FUNCTIONS ---
function buildChocolateBarObstacles(parentContainer) {
  console.log("Spawning structural chocolate barriers...");
  
  // Preset layout coordinates so barriers don't trap players or cover up entities safely
  const presets = [
    { left: 150, top: 180, width: 220, height: 50 },
    { left: 450, top: 400, width: 220, height: 50 }
  ];

  presets.forEach(data => {
    const block = document.createElement('div');
    block.className = 'chocolate-wall';
    block.style.left = `${data.left}px`;
    block.style.top = `${data.top}px`;
    block.style.width = `${data.width}px`;
    block.style.height = `${data.height}px`;
    parentContainer.appendChild(block);
  });
}

function buildSyrupMudPuddles(parentContainer) {
  console.log("Spawning sticky purple syrup puddles...");
  
  const presets = [
    { left: 320, top: 280 },
    { left: 240, top: 420 },
    { left: 500, top: 160 }
  ];

  presets.forEach(pos => {
    const puddle = document.createElement('div');
    puddle.className = 'sugar-puddle';
    puddle.style.left = `${pos.left}px`;
    puddle.style.top = `${pos.top}px`;
    parentContainer.appendChild(puddle);
  });
}

function spawnPowerupApple() {
  // Positions apple randomly safely separated from top HUD layer fields
  const randX = Math.floor(Math.random() * (window.innerWidth - 150)) + 50;
  const randY = Math.floor(Math.random() * (window.innerHeight - 320)) + 180;
  powerupEl.style.left = `${randX}px`;
  powerupEl.style.top = `${randY}px`;
}

// --- 4. BOSS ATTACK AND SHOOTING SYSTEMS ---
function activateBossProjectiles() {
  bossProjectileInterval = setInterval(() => {
    if (!gameActive || !bossCanAttack) return;

    // Build Projectile Layer Node
    const container = document.getElementById('game-container');
    const glob = document.createElement('div');
    glob.className = 'sugar-glob';
    
    // Fire from center point of the boss sprite coordinate space
    let currentGlobX = enemyX + 48;
    let currentGlobY = enemyY + 48;
    glob.style.left = `${currentGlobX}px`;
    glob.style.top = `${currentGlobY}px`;
    container.appendChild(glob);

    // Calculate normalized path tracking vectors to hit the player directly
    const diffX = (playerX + 50) - currentGlobX;
    const diffY = (playerY + 50) - currentGlobY;
    const distance = Math.sqrt(diffX * diffX + diffY * diffY);
    const speedX = (diffX / distance) * 4;
    const speedY = (diffY / distance) * 4;

    const globTimer = setInterval(() => {
      if (!gameActive) {
        clearInterval(globTimer);
        glob.remove();
        return;
      }

      currentGlobX += speedX;
      currentGlobY += speedY;
      glob.style.left = `${currentGlobX}px`;
      glob.style.top = `${currentGlobY}px`;

      // Collision Detection tracking against player boundaries
      if (Math.abs(currentGlobX - (playerX + 38)) < 40 && Math.abs(currentGlobY - (playerY + 38)) < 40) {
        clearInterval(globTimer);
        glob.remove();
        playerHp = Math.max(0, playerHp - 10);
        pFill.style.width = `${playerHp}%`;
        playerEl.classList.add('hurt-flash');
        setTimeout(() => playerEl.classList.remove('hurt-flash'), 300);
        statusMsg.textContent = "💥 HIT! Sugar Glob damaged you!";
        checkGameOverConditions();
      }

      // Cleanup out of bounds projectiles automatically
      if (currentGlobX < -50 || currentGlobX > window.innerWidth + 50 || currentGlobY < -50 || currentGlobY > window.innerHeight + 50) {
        clearInterval(globTimer);
        glob.remove();
      }
    }, 20);

  }, 3000); // Boss fires projectile burst once every 3 seconds
}

// --- 5. GAME CONTROLLER RUNTIME RUN Loops ---
function startGame() {
  overlay.style.display = 'none';
  
  // State Initialization
  playerHp = 100;
  enemyHp = 100;
  gameTimer = 0;
  playerX = 80;
  playerY = window.innerHeight / 2 - 50;
  enemyX = window.innerWidth - 200;
  enemyY = window.innerHeight / 2 - 60;
  
  pFill.style.width = '100%';
  eFill.style.width = '100%';
  timerBadge.textContent = "00:00.00";
  levelBadge.textContent = `LEVEL ${currentLevel}`;
  statusMsg.textContent = "🏃‍♂️ JOG ON SPOT TO START RUNNING!";

  setupGameStageLayout(currentLevel);
  
  gameActive = true;
  
  // Core Render Loops Init
  clearInterval(timerInterval);
  const startTime = performance.now();
  timerInterval = setInterval(() => {
    const elapsed = (performance.now() - startTime) / 1000;
    gameTimer = elapsed;
    timerBadge.textContent = elapsed.toFixed(2) + "s";
  }, 10);

  requestAnimationFrame(gameLoop);
}

function gameLoop() {
  if (!gameActive) return;

  // Process player positional locomotion values
  // Only allow execution movement processing if stepRate tracking sensor registers actual movement
  if (stepRate > 0.1) {
    let nextX = playerX + (moveDirX * playerSpeed * isStickyMultiplier);
    let nextY = playerY + (moveDirY * playerSpeed * isStickyMultiplier);

    // Dynamic Wall Collision Intersection checks
    let hitWall = false;
    const padding = 15;
    document.querySelectorAll('.chocolate-wall').forEach(wall => {
      const wL = parseFloat(wall.style.left);
      const wT = parseFloat(wall.style.top);
      const wW = parseFloat(wall.style.width);
      const wH = parseFloat(wall.style.height);

      if (nextX + padding < wL + wW && nextX + 100 - padding > wL &&
          nextY + padding < wT + wH && nextY + 100 - padding > wT) {
        hitWall = true;
      }
    });

    // Simple Map Window Boundaries Constraint checking
    if (!hitWall) {
      if (nextX >= 0 && nextX <= window.innerWidth - 100) playerX = nextX;
      if (nextY >= 60 && nextY <= window.innerHeight - 140) playerY = nextY;
    }

    // Set sprite animations or directions based on target velocities
    if (moveDirX > 0) playerEl.style.backgroundPosition = "100% 33.3%";
    else if (moveDirX < 0) playerEl.style.backgroundPosition = "0% 66.6%";
  }

  // Position Entity elements inside viewport
  playerEl.style.left = `${playerX}px`;
  playerEl.style.top = `${playerY}px`;
  enemyEl.style.left = `${enemyX}px`;
  enemyEl.style.top = `${enemyY}px`;

  // Render Navigation Arrow to objective target tracking structures
  updateNavigationRadar();

  // Run Real-Time Environment Intersection Checks
  processEnvironmentTriggers();

  requestAnimationFrame(gameLoop);
}

function updateNavigationRadar() {
  // Arrow anchor source node coordinate center space matching
  const pCenterX = playerX + 50;
  const pCenterY = playerY + 50;
  
  let targetX = enemyX + 60;
  let targetY = enemyY + 60;

  // Target the apple first if the boss shield is active
  if (enemyShieldActive && powerupEl.style.display !== 'none') {
    targetX = parseFloat(powerupEl.style.left) + 25;
    targetY = parseFloat(powerupEl.style.top) + 25;
    navArrowEl.style.filter = "drop-shadow(0 0 8px #ffd166)";
  } else {
    navArrowEl.style.filter = "drop-shadow(0 0 8px #ff4d6d)";
  }

  navArrowEl.style.left = `${pCenterX}px`;
  navArrowEl.style.top = `${pCenterY}px`;

  const angleRad = Math.atan2(targetY - pCenterY, targetX - pCenterX);
  const angleDeg = angleRad * (180 / Math.PI);
  navArrowEl.style.transform = `rotate(${angleDeg}deg)`;
}

function processEnvironmentTriggers() {
  // 1. Syrup Sticky Puddles overlap checks
  let insidePuddle = false;
  document.querySelectorAll('.sugar-puddle').forEach(puddle => {
    const pL = parseFloat(puddle.style.left) + 40;
    const pT = parseFloat(puddle.style.top) + 17;
    const distance = Math.sqrt(Math.pow((playerX + 50) - pL, 2) + Math.pow((playerY + 50) - pT, 2));
    if (distance < 45) insidePuddle = true;
  });

  if (insidePuddle) {
    isStickyMultiplier = 0.4; // Reduces walking speed by 60%
    playerEl.classList.add('sticky-slow');
  } else {
    isStickyMultiplier = 1.0;
    playerEl.classList.remove('sticky-slow');
  }

  // 2. Apple Powerup collection intersection check
  if (enemyShieldActive && powerupEl.style.display !== 'none') {
    const appleX = parseFloat(powerupEl.style.left) + 25;
    const appleY = parseFloat(powerupEl.style.top) + 25;
    const distToApple = Math.sqrt(Math.pow((playerX + 50) - appleX, 2) + Math.pow((playerY + 50) - appleY, 2));
    
    if (distToApple < 55) {
      powerupEl.style.display = 'none';
      enemyShieldActive = false;
      enemyEl.classList.remove('shielded');
      statusMsg.textContent = "⚡ SHIELD BROKEN! SHAKE PHONE TO ATTACK BOSS!";
    }
  }

  // 3. Proximity proximity check to hit boss
  const distToBoss = Math.sqrt(Math.pow((playerX + 50) - (enemyX + 60), 2) + Math.pow((playerY + 50) - (enemyY + 60), 2));
  if (distToBoss < 130) {
    if (enemyShieldActive) {
      statusMsg.textContent = "🛡️ Boss is Immune! Grab the Golden Apple!";
    } else {
      statusMsg.textContent = "👋 SHAKE DEVICE FIRMLY TO SMASH!";
    }
  }
}

// --- 6. DEV MOTION WEB ACCELEROMETER SENSOR INTERFACES ---
function initMotionSensors() {
  // Fallback testing support mechanisms via mouse movement for PC simulations
  if (!window.DeviceMotionEvent) {
    console.log("DeviceMotion API missing. Simulation backup injected.");
    setupKeyboardSimulation();
    return;
  }

  // Event handler callback wrapper registration 
  window.addEventListener('devicemotion', (event) => {
    if (!gameActive) return;

    let acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null) acc = event.acceleration; 
    if (!acc || acc.x === null) return;

    // A. Run/Jog Step Processing calculations
    let magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    let delta = Math.abs(magnitude - lastAcceleration.gValue || 0);
    
    // Low pass filter smoothing mapping
    if (delta > 2.2) {
      stepRate = Math.min(1.0, stepRate + 0.15);
    } else {
      stepRate = Math.max(0.0, stepRate - 0.02);
    }
    
    lastAcceleration.gValue = magnitude;
    document.getElementById('step-rate-val').textContent = stepRate > 0.1 ? "RUNNING" : "STOPPED";

    // B. Shake Vector Verification mapping for Weapon Attack triggering
    let shakeDelta = Math.abs(acc.x - lastAcceleration.x) + Math.abs(acc.y - lastAcceleration.y);
    if (shakeDelta > shakeThreshold && !enemyShieldActive) {
      // Execute melee impact damage if standing close inside enemy frame box bounds
      const distToBoss = Math.sqrt(Math.pow((playerX + 50) - (enemyX + 60), 2) + Math.pow((playerY + 50) - (enemyY + 60), 2));
      if (distToBoss < 140) {
        triggerWeaponDamageAttack();
      }
    }

    lastAcceleration.x = acc.x;
    lastAcceleration.y = acc.y;
    lastAcceleration.z = acc.z;
  });
}

function triggerWeaponDamageAttack() {
  enemyHp = Math.max(0, enemyHp - 15);
  eFill.style.width = `${enemyHp}%`;
  
  enemyEl.classList.add('attack-pulse');
  setTimeout(() => enemyEl.classList.remove('attack-pulse'), 200);
  
  statusMsg.textContent = `💥 SMASHED! Boss lost 15 HP!`;
  
  // Reactivate protection phase sequence if boss survives inside Level 3 loop
  if (enemyHp > 0 && currentLevel >= 2) {
    enemyShieldActive = true;
    enemyEl.classList.add('shielded');
    powerupEl.style.display = 'block';
    spawnPowerupApple();
  }

  checkGameOverConditions();
}

// --- 7. GAME OVER AND HIGH SCORE EVALUATION WINDOW ---
function checkGameOverConditions() {
  if (enemyHp <= 0) {
    endGameSession(true); // Victory!
  } else if (playerHp <= 0) {
    endGameSession(false); // Defeat
  }
}

function endGameSession(isVictory) {
  gameActive = false;
  clearInterval(timerInterval);
  if (bossProjectileInterval) clearInterval(bossProjectileInterval);

  const titleText = document.getElementById('menu-title');
  const subtitleText = document.querySelector('.menu-subtitle');
  
  if (isVictory) {
    titleText.textContent = "🏆 VICTORY!";
    let praiseMsg = `You cleared Stage ${currentLevel} in ${gameTimer.toFixed(2)}s!`;
    
    if (highScore === 0 || gameTimer < highScore) {
      highScore = gameTimer;
      localStorage.setItem('fitquest_highscore', highScore);
      praiseMsg += " NEW RECORD! 🎉";
    }
    subtitleText.textContent = praiseMsg;
  } else {
    titleText.textContent = "💀 DEFEAT!";
    subtitleText.textContent = "Your Energy ran out. Keep moving to stay fit!";
  }

  // Redraw highscore metrics and reopen main menu layout overlay card view
  highScoreDisplay.textContent = highScore > 0 ? `Best Time: ${highScore.toFixed(2)}s` : "Best Time: 00:00";
  startBtn.textContent = "PLAY AGAIN";
  overlay.style.display = 'flex';
}

// --- 8. VIRTUAL JOYSTICK LOCOMOTION HANDLING INTERFACES ---
function setupJoystickInput() {
  joyBoundary.addEventListener('touchstart', (e) => {
    joystickActive = true;
    const touch = e.touches[0];
    joyStartX = touch.clientX;
    joyStartY = touch.clientY;
  });

  joyBoundary.addEventListener('touchmove', (e) => {
    if (!joystickActive) return;
    const touch = e.touches[0];
    
    let dX = touch.clientX - joyStartX;
    let dY = touch.clientY - joyStartY;
    let distance = Math.sqrt(dX * dX + dY * dY);

    if (distance > maxJoystickDistance) {
      dX = (dX / distance) * maxJoystickDistance;
      dY = (dY / distance) * maxJoystickDistance;
      distance = maxJoystickDistance;
    }

    joyStick.style.transform = `translate(${dX}px, ${dY}px)`;

    // Output direction vector values
    moveDirX = dX / maxJoystickDistance;
    moveDirY = dY / maxJoystickDistance;
  });

  joyBoundary.addEventListener('touchend', resetJoystickState);
  joyBoundary.addEventListener('touchcancel', resetJoystickState);
}

function resetJoystickState() {
  joystickActive = false;
  moveDirX = 0;
  moveDirY = 0;
  joyStick.style.transform = 'translate(0px, 0px)';
}

// --- 9. TESTING UTILITIES (DESKTOP SIMULATION FALLBACK) ---
function setupKeyboardSimulation() {
  stepRate = 1.0; // Assume player is walking constantly on PC environments
  document.getElementById('step-rate-val').textContent = "SIMULATOR ACTIVE";

  window.addEventListener('keydown', (e) => {
    if (!gameActive) return;
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') moveDirX = -1;
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') moveDirX = 1;
    if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') moveDirY = -1;
    if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') moveDirY = 1;
    
    // Spacebar mapping alternative proxy simulation matching shaking attacks
    if (e.key === ' ' && !enemyShieldActive) {
      const distToBoss = Math.sqrt(Math.pow((playerX + 50) - (enemyX + 60), 2) + Math.pow((playerY + 50) - (enemyY + 60), 2));
      if (distToBoss < 140) triggerWeaponDamageAttack();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) moveDirX = 0;
    if (['ArrowUp', 'ArrowDown', 'w', 's'].includes(e.key)) moveDirY = 0;
  });
}
