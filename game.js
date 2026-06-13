// ==========================================
// FITQUEST ENGINE - CORE GAME DATA & LAYOUTS
// ==========================================
const CONFIG = {
  world: { width: 1500, height: 1500 },
  player: { baseSpeed: 5.5, slowSpeed: 2.2, radius: 24 },
  boss: { radius: 45 },
  powerup: { radius: 22 },
  puddle: { radius: 35 },
  stepThreshold: 11.8,
  shakeThreshold: 14.5
};

const STAGES = {
  1: { bossHp: 100, spawnWalls: 4, label: "Level 1: Sugar Shock" },
  2: { bossHp: 175, spawnWalls: 7, label: "Level 2: Calorie Chaos" },
  3: { bossHp: 260, spawnWalls: 11, label: "Level 3: Diabetes Defeated" }
};

const UI = {
  overlay: document.getElementById('overlay'),
  menuTitle: document.getElementById('menu-title'),
  menuSubtitle: document.querySelector('.menu-subtitle'),
  levelDisplay: document.getElementById('menu-level-display'),
  highScore: document.getElementById('high-score-display'),
  actionBtn: document.getElementById('action-btn'),
  playerFill: document.getElementById('p-fill'),
  enemyFill: document.getElementById('e-fill'),
  levelBadge: document.getElementById('level-badge'),
  timerBadge: document.getElementById('timer-badge'),
  statusMsg: document.getElementById('status-msg'),
  motionDisplay: document.getElementById('motion-display'),
  player: document.getElementById('player'),
  enemy: document.getElementById('enemy'),
  powerup: document.getElementById('powerup-item'),
  arrow: document.getElementById('nav-arrow'),
  decorationsLayer: document.getElementById('field-decorations'),
  obstaclesLayer: document.getElementById('obstacles-layer'),
  joyBoundary: document.getElementById('joy-boundary'),
  joyStick: document.getElementById('joy-stick'),
  btnFemale: document.getElementById('btn-female'),
  btnMale: document.getElementById('btn-male')
};

// Engine runtime state
let runtime = {
  activeLevel: 1,
  selectedGender: 'female',
  isGameRunning: false,
  timerInterval: null,
  gameStartTime: 0,
  elapsedTime: 0,
  
  // Entity positions
  px: 150, py: 150,
  ex: 1200, ey: 1200,
  powerupX: 0, powerupY: 0,
  isPowerupSpawned: false,
  isBossShieldBroken: false, // Core mechanics state
  
  // Health states
  playerMaxHp: 100, playerHp: 100,
  bossMaxHp: 100, bossHp: 100,
  
  // Input tracking
  joyX: 0, joyY: 0,
  isJoyActive: false,
  isPhysicallyMoving: false,
  stepFrequency: 0,
  lastAccelTime: 0,
  
  // Sprite animation state
  currentFrameIndex: 0,
  animationTickCounter: 0,
  facingDirectionRow: 0, // 0=down, 1=left, 2=right, 3=up
  
  walls: [],
  puddles: []
};

// ==========================================
// SYSTEM LIFE CYCLE & CONFIGURATION HOOKS
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  loadStageHighScores();
  setupInputControllers();
  window.addEventListener('resize', adaptViewportClamping);
});

function loadStageHighScores() {
  const saved = localStorage.getItem(`fitquest_lvl_${runtime.activeLevel}`);
  if (saved) {
    const ms = parseInt(saved, 10);
    UI.highScore.innerText = `🥇 Best Time: ${formatTimeOutput(ms)}`;
  } else {
    UI.highScore.innerText = `🥇 Best Time: --:--.--`;
  }
}

function changeMenuLevel(direction) {
  if (runtime.isGameRunning) return;
  runtime.activeLevel += direction;
  if (runtime.activeLevel < 1) runtime.activeLevel = 3;
  if (runtime.activeLevel > 3) runtime.activeLevel = 1;
  
  UI.levelDisplay.innerText = `LEVEL ${runtime.activeLevel}`;
  loadStageHighScores();
}

function wipeCurrentLevelScore() {
  localStorage.removeItem(`fitquest_lvl_${runtime.activeLevel}`);
  loadStageHighScores();
}

function selectGender(gender) {
  runtime.selectedGender = gender;
  if (gender === 'female') {
    UI.btnFemale.classList.add('active-pink');
    UI.btnMale.classList.remove('active-pink');
    UI.player.style.backgroundImage = "url('assets/hero-sprite.png')";
  } else {
    UI.btnMale.classList.add('active-pink');
    UI.btnFemale.classList.remove('active-pink');
    UI.player.style.backgroundImage = "url('assets/hero-sprite2.png')";
  }
}

// ==========================================
// VIRTUAL JOYSTICK & HARDWARE ACCELERATION
// ==========================================
function setupInputControllers() {
  // Joystick Touch Binding
  UI.joyBoundary.addEventListener('touchstart', (e) => {
    runtime.isJoyActive = true;
    updateJoystickTracking(e.touches[0]);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!runtime.isJoyActive) return;
    updateJoystickTracking(e.touches[0]);
  }, { passive: true });

  window.addEventListener('touchend', () => {
    runtime.isJoyActive = false;
    runtime.joyX = 0; runtime.joyY = 0;
    UI.joyStick.style.transform = `translate(0px, 0px)`;
  });

  // Motion Detection Hook
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    // iOS Device Trigger Requirement handled in igniteEngine()
  } else {
    window.addEventListener('devicemotion', handleHardwareAccelerationData);
  }
}

function updateJoystickTracking(touchPoint) {
  const rect = UI.joyBoundary.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  let deltaX = touchPoint.clientX - centerX;
  let deltaY = touchPoint.clientY - centerY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const maxRadius = rect.width / 2;

  if (distance > maxRadius) {
    deltaX = (deltaX / distance) * maxRadius;
    deltaY = (deltaY / distance) * maxRadius;
  }

  UI.joyStick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  
  // Normalize values between -1 and 1
  runtime.joyX = deltaX / maxRadius;
  runtime.joyY = deltaY / maxRadius;
}

function handleHardwareAccelerationData(event) {
  if (!runtime.isGameRunning) return;

  const accel = event.accelerationIncludingGravity || event.acceleration;
  if (!accel) return;

  const now = Date.now();
  if (now - runtime.lastAccelTime < 80) return; // Debounce rate throttle
  runtime.lastAccelTime = now;

  const x = accel.x || 0;
  const y = accel.y || 0;
  const z = accel.z || 0;
  const magnitude = Math.sqrt(x * x + y * y + z * z);

  // 1. Shake To Strike Mechanic (Fires when near boss)
  if (magnitude > CONFIG.shakeThreshold) {
    evaluatePlayerAttackAction();
  }

  // 2. Physical Step Engine (Checks if player is stepping on spot)
  if (magnitude > CONFIG.stepThreshold) {
    runtime.isPhysicallyMoving = true;
    runtime.stepFrequency = magnitude;
  } else {
    // Smoothly decay acceleration force back to idle
    runtime.stepFrequency *= 0.85;
    if (runtime.stepFrequency < 2) runtime.isPhysicallyMoving = false;
  }
}

// ==========================================
// GAME ENGINE INIT & ENVIRONMENT SPAWNING
// ==========================================
function igniteEngine() {
  // Trigger iOS motion authorization security layer if required
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === 'granted') {
          window.addEventListener('devicemotion', handleHardwareAccelerationData);
        }
      }).catch(console.error);
  }

  UI.overlay.style.display = 'none';
  runtime.isGameRunning = true;
  
  // Setup level attributes
  const settings = STAGES[runtime.activeLevel];
  runtime.bossMaxHp = settings.bossHp;
  runtime.bossHp = settings.bossHp;
  runtime.playerHp = runtime.playerMaxHp;
  
  // Reset character positions
  runtime.px = 200; runtime.py = 200;
  runtime.ex = 1200; runtime.ey = 1200;
  
  // Core mechanics reset
  runtime.isBossShieldBroken = false;
  UI.enemy.classList.add('shielded'); // Activate white shield visibility
  
  // Spawn Apple far away from player
  runtime.powerupX = 750;
  runtime.powerupY = 750;
  runtime.isPowerupSpawned = true;
  UI.powerup.style.display = 'block';

  UI.levelBadge.innerText = `LEVEL ${runtime.activeLevel}`;
  updateHealthBars();
  
  buildEnvironmentLayout(settings.spawnWalls);

  // Fire Game Timers
  runtime.gameStartTime = Date.now();
  runtime.elapsedTime = 0;
  runtime.timerInterval = setInterval(() => {
    runtime.elapsedTime = Date.now() - runtime.gameStartTime;
    UI.timerBadge.innerText = `⏱️ ${formatTimeOutput(runtime.elapsedTime)}`;
  }, 33);

  UI.statusMsg.innerText = "🛡️ Boss is Immune! Grab the Golden Apple!";
  
  // Kick off frame processing loop
  requestAnimationFrame(processFrameIteration);
}

function buildEnvironmentLayout(wallCount) {
  UI.obstaclesLayer.innerHTML = '';
  UI.decorationsLayer.innerHTML = '';
  runtime.walls = [];
  runtime.puddles = [];

  // 1. Spawn Obstacle Bars
  for (let i = 0; i < wallCount; i++) {
    const w = 120 + Math.random() * 160;
    const h = 50;
    const x = 300 + Math.random() * (CONFIG.world.width - 500);
    const y = 300 + Math.random() * (CONFIG.world.height - 500);

    const el = document.createElement('div');
    el.className = 'chocolate-wall';
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    UI.obstaclesLayer.appendChild(el);

    runtime.walls.push({ x, y, width: w, height: h });
  }

  // 2. FOCUS CRITICAL STICKY PUDDLES IN CENTER OF MAP
  const puddleCount = 4 + runtime.activeLevel;
  for (let i = 0; i < puddleCount; i++) {
    // Clustered tightly around the physical map center (750, 750)
    const x = 550 + Math.random() * 400;
    const y = 550 + Math.random() * 400;

    const el = document.createElement('div');
    el.className = 'sugar-puddle';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    UI.decorationsLayer.appendChild(el);

    runtime.puddles.push({ x: x + CONFIG.puddle.radius, y: y + 15 });
  }
}

// ==========================================
// CORE FRAME ITERATION ENGINE & LOGIC LOOPS
// ==========================================
function processFrameIteration() {
  if (!runtime.isGameRunning) return;

  // 1. Process Physical Step Speeds & Mud Slowdowns
  let isInsideMud = false;
  for (let puddle of runtime.puddles) {
    const dx = runtime.px - puddle.x;
    const dy = runtime.py - puddle.y;
    if (Math.sqrt(dx*dx + dy*dy) < CONFIG.puddle.radius) {
      isInsideMud = true;
      break;
    }
  }

  // Apply mud speed penalty profile
  let movementVelocity = CONFIG.player.baseSpeed;
  if (isInsideMud) {
    movementVelocity = CONFIG.player.slowSpeed;
    UI.player.classList.add('sticky-slow');
    UI.motionDisplay.innerText = `⚠️ STUCK IN STICKY MUD (SPEED REDUCED)`;
  } else {
    UI.player.classList.remove('sticky-slow');
  }

  // 2. Execute Movement Physics
  if (runtime.isJoyActive && runtime.isPhysicallyMoving) {
    const oldX = runtime.px;
    const oldY = runtime.py;

    runtime.px += runtime.joyX * movementVelocity;
    runtime.py += runtime.joyY * movementVelocity;

    // Apply Wall Blockades
    for (let wall of runtime.walls) {
      if (runtime.px + CONFIG.player.radius > wall.x && runtime.px - CONFIG.player.radius < wall.x + wall.width &&
          runtime.py + CONFIG.player.radius > wall.y && runtime.py - CONFIG.player.radius < wall.y + wall.height) {
        runtime.px = oldX;
        runtime.py = oldY;
        break;
      }
    }

    // Canvas boundary clamping
    runtime.px = Math.max(CONFIG.player.radius, Math.min(CONFIG.world.width - CONFIG.player.radius, runtime.px));
    runtime.py = Math.max(CONFIG.player.radius, Math.min(CONFIG.world.height - CONFIG.player.radius, runtime.py));

    processSpriteSheetRotation();
    if (!isInsideMud) {
      UI.motionDisplay.innerText = `Step Rate: ${(runtime.stepFrequency).toFixed(2)} | Running...`;
    }
  } else {
    if (!isInsideMud) {
      UI.motionDisplay.innerText = `Step Rate: 0.00 | Stand On Spot & JOG to Run`;
    }
  }

  // 3. Evaluate Apple Collection Logic
  if (runtime.isPowerupSpawned) {
    const dx = runtime.px - runtime.powerupX;
    const dy = runtime.py - runtime.powerupY;
    if (Math.sqrt(dx*dx + dy*dy) < CONFIG.player.radius + CONFIG.powerup.radius) {
      runtime.isPowerupSpawned = false;
      runtime.isBossShieldBroken = true;
      UI.powerup.style.display = 'none';
      UI.enemy.classList.remove('shielded'); // Drop shield glow effect
      UI.statusMsg.innerText = "🔓 Shield Shattered! Go Strike the Sugar Cube!";
    }
  }

  // 4. Update Screen Rendering Contexts
  adaptViewportClamping();
  processRadarPointer();

  requestAnimationFrame(processFrameIteration);
}

function processSpriteSheetRotation() {
  // Map angle orientation to direction state arrays
  const angle = Math.atan2(runtime.joyY, runtime.joyX) * (180 / Math.PI);
  
  if (angle >= -45 && angle <= 45) runtime.facingDirectionRow = 2;       // Right row
  else if (angle > 45 && angle < 135) runtime.facingDirectionRow = 0;    // Down row
  else if (angle >= 135 || angle <= -135) runtime.facingDirectionRow = 1; // Left row
  else runtime.facingDirectionRow = 3;                                  // Up row

  runtime.animationTickCounter++;
  if (runtime.animationTickCounter > 6) {
    runtime.currentFrameIndex = (runtime.currentFrameIndex + 1) % 3;
    runtime.animationTickCounter = 0;
  }

  const xPercentage = runtime.currentFrameIndex * 50; 
  const yPercentage = runtime.facingDirectionRow * 33.33;
  UI.player.style.backgroundPosition = `${xPercentage}% ${yPercentage}%`;
}

function processRadarPointer() {
  // If shield is up, point to the Apple; if shield is broken, point to the Boss
  let targetX = runtime.isBossShieldBroken ? runtime.ex : runtime.powerupX;
  let targetY = runtime.isBossShieldBroken ? runtime.ey : runtime.powerupY;

  const dx = targetX - runtime.px;
  const dy = targetY - runtime.py;
  const distance = Math.sqrt(dx*dx + dy*dy);

  if (distance > 80) {
    UI.arrow.style.display = 'flex';
    const angleRad = Math.atan2(dy, dx);
    UI.arrow.style.transform = `rotate(${angleRad}rad)`;
  } else {
    UI.arrow.style.display = 'none';
  }
}

function adaptViewportClamping() {
  // Center screen focus smoothly around player coordinates
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;

  let camX = runtime.px - viewW / 2;
  let camY = runtime.py - viewH / 2;

  camX = Math.max(0, Math.min(CONFIG.world.width - viewW, camX));
  camY = Math.max(0, Math.min(CONFIG.world.height - viewH, camY));

  // Render updates relative to active viewport camera offsets
  UI.player.style.left = `${runtime.px - 50}px`;
  UI.player.style.top = `${runtime.py - 50}px`;

  UI.enemy.style.left = `${runtime.ex - 60}px`;
  UI.enemy.style.top = `${runtime.ey - 60}px`;

  if (runtime.isPowerupSpawned) {
    UI.powerup.style.left = `${runtime.powerupX - 25}px`;
    UI.powerup.style.top = `${runtime.powerupY - 25}px`;
  }

  document.getElementById('game-container').style.backgroundPosition = `${-camX}px ${-camY}px`;
  UI.obstaclesLayer.style.transform = `translate(${-camX}px, ${-camY}px)`;
  UI.decorationsLayer.style.transform = `translate(${-camX}px, ${-camY}px)`;
  UI.player.style.transform = `translate(${-camX}px, ${-camY}px)`;
  UI.enemy.style.transform = `translate(${-camX}px, ${-camY}px)`;
  UI.powerup.style.transform = `translate(${-camX}px, ${-camY}px)`;
}

// ==========================================
// DAMAGE EVALUATION & HIT ENGINE TRIPPERS
// ==========================================
function evaluatePlayerAttackAction() {
  const dx = runtime.px - runtime.ex;
  const dy = runtime.py - runtime.ey;
  const distance = Math.sqrt(dx*dx + dy*dy);

  // Must be in strike zone near boss to trigger attack evaluation
  if (distance < CONFIG.player.radius + CONFIG.boss.radius + 40) {
    
    // GUARD CHECK: Refuse damage calculations if shield is unbroken
    if (!runtime.isBossShieldBroken) {
      UI.statusMsg.innerText = "❌ IMMUNE! Shield blocks your strike! Grab Apple!";
      return;
    }

    // Process valid strike damage
    runtime.bossHp -= 15;
    UI.enemy.classList.add('attack-pulse');
    UI.statusMsg.innerText = `💥 SMASHED! Boss lost 15 HP!`;
    setTimeout(() => UI.enemy.classList.remove('attack-pulse'), 200);

    if (runtime.bossHp <= 0) {
      terminateGameLoopContext(true);
    } else {
      updateHealthBars();
    }
  }
}

function updateHealthBars() {
  const pPct = Math.max(0, (runtime.playerHp / runtime.playerMaxHp) * 100);
  const ePct = Math.max(0, (runtime.bossHp / runtime.bossMaxHp) * 100);
  UI.playerFill.style.width = `${pPct}%`;
  UI.enemyFill.style.width = `${ePct}%`;
}

function terminateGameLoopContext(isVictory) {
  runtime.isGameRunning = false;
  clearInterval(runtime.timerInterval);
  
  UI.overlay.style.display = 'flex';
  
  if (isVictory) {
    UI.menuTitle.innerText = "🎉 QUEST CLEAR! 🎉";
    UI.menuSubtitle.innerText = `You burned away the glucose in ${formatTimeOutput(runtime.elapsedTime)}!`;
    
    // Save record tracking score inside local database profiles
    const historicalBest = localStorage.getItem(`fitquest_lvl_${runtime.activeLevel}`);
    if (!historicalBest || runtime.elapsedTime < parseInt(historicalBest, 10)) {
      localStorage.setItem(`fitquest_lvl_${runtime.activeLevel}`, runtime.elapsedTime.toString());
      UI.statusMsg.innerText = "🔥 NEW PERSONAL BEST TIME LOCKED IN!";
    }
  } else {
    UI.menuTitle.innerText = "💀 QUEST FAILED 💀";
    UI.menuSubtitle.innerText = "The Sugar Overlords drained your core stamina!";
  }

  UI.actionBtn.innerText = "PLAY AGAIN 🔄";
  loadStageHighScores();
}

function formatTimeOutput(ms) {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const centiseconds = Math.floor((ms % 1000) / 10);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}
