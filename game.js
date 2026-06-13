const SETTINGS = {
  moveCutoff: 11.8,
  shakeCutoff: 23.5,
  combatWindow: 500,
  hitBoxRange: 75,
  frictionFactor: 0.88,
  accelerationGain: 0.7,
  velocityCap: 6.5,
  padRadius: 55,
  animationSpeed: 110,
  sugarGlobVelocity: 4,
  sugarAttackFrequency: 2200,
  stickySlowFactor: 0.35
};

let runtime = {
  pX: 0, pY: 0, eX: 0, eY: 0,
  steerX: 0, steerY: 0,
  currentSpeed: 0,
  pHP: 100, eHP: 100,
  lastAttack: 0, halted: true, padActive: false,
  currentFrameIndex: 1, currentDirectionRow: 0, lastFrameUpdateTime: 0,
  currentLevel: 1, 
  hasPowerUpBoost: false,
  powerX: 0, powerY: 0,
  powerSpawned: false,
  isStuckInSyrup: false,
  sugarGlobs: [],
  sugarPuddles: [],
  obstacles: [], 
  lastSugarFired: 0,
  selectedSprite: 'assets/hero-sprite.png',
  startTime: 0,
  elapsedTime: 0,
  audioCtx: null, 
  lastStepSoundTime: 0,
  bgMusic: null 
};

const UI = {
  container: document.getElementById('game-container'),
  decorationsContainer: document.getElementById('field-decorations'),
  obstaclesContainer: document.getElementById('obstacles-layer'), 
  overlay: document.getElementById('overlay'),
  title: document.getElementById('menu-title'),
  safety: document.getElementById('safety-box'),
  btn: document.getElementById('action-btn'),
  actionsContainer: document.getElementById('menu-actions-container'),
  badge: document.getElementById('level-badge'),
  player: document.getElementById('player'),
  enemy: document.getElementById('enemy'),
  power: document.getElementById('powerup-item'),
  pFill: document.getElementById('p-fill'),
  eFill: document.getElementById('e-fill'),
  status: document.getElementById('status-msg'),
  motionInfo: document.getElementById('motion-display'),
  padBoundary: document.getElementById('joy-boundary'),
  padStick: document.getElementById('joy-stick'),
  menuLevelDisplay: document.getElementById('menu-level-display'),
  timerBadge: document.getElementById('timer-badge'),
  highScoreDisplay: document.getElementById('high-score-display'),
  navArrow: document.getElementById('nav-arrow')
};

displayCurrentLevelHighScore();

// ==========================================
// SISTEM AUDIO (EFFECTS & BACKGROUND MUSIC)
// ==========================================
function initAudioEngine() {
  if (!runtime.audioCtx) {
    runtime.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playBackgroundMusic() {
  if (runtime.bgMusic) return; 

  runtime.bgMusic = new Audio('assets/bg-music.mp3'); 
  runtime.bgMusic.loop = true; 
  runtime.bgMusic.volume = 0.4; 

  runtime.bgMusic.play().catch(error => {
    console.log("Autoplay music disekat oleh pelayar sehingga ada interaksi skrin:", error);
  });
}

function stopBackgroundMusic() {
  if (runtime.bgMusic) {
    runtime.bgMusic.pause();
    runtime.bgMusic.currentTime = 0;
    runtime.bgMusic = null;
  }
}

function playSoundFX(type) {
  if (!runtime.audioCtx) return;
  if (runtime.audioCtx.state === 'suspended') {
    runtime.audioCtx.resume();
  }

  const ctx = runtime.audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  if (type === 'step') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
    osc.start(now);
    osc.stop(now + 0.08);
  } 
  else if (type === 'shoot') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } 
  else if (type === 'hit_hero') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(60, now + 0.25);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  } 
  else if (type === 'hit_boss') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.setValueAtTime(450, now + 0.05);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.12);
  }
  else if (type === 'powerup') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); 
    osc.frequency.setValueAtTime(659.25, now + 0.08); 
    osc.frequency.setValueAtTime(783.99, now + 0.16); 
    osc.frequency.setValueAtTime(1046.50, now + 0.24); 
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);
  }
  else if (type === 'victory') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, now); 
    osc.frequency.setValueAtTime(659.25, now + 0.1); 
    osc.frequency.setValueAtTime(880.00, now + 0.2); 
    osc.frequency.setValueAtTime(987.77, now + 0.3); 
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.6);
  }
}

// KEMASKINI: Dikosongkan sepenuhnya supaya bunga emoji tidak menindih gambar background asli anda!
function generateProceduralFieldDecorations() {
  UI.decorationsContainer.innerHTML = ''; 
}

function generateChocolateObstacles() {
  UI.obstaclesContainer.innerHTML = '';
  runtime.obstacles = [];

  let mapW = window.innerWidth;
  let mapH = window.innerHeight;
  let blueprint = [];

  if (runtime.currentLevel === 1) {
    blueprint.push({ x: mapW * 0.25, y: mapH * 0.45, w: mapW * 0.5, h: 40 });
  } 
  else if (runtime.currentLevel === 2) {
    blueprint.push({ x: mapW * 0.15, y: mapH * 0.3, w: 45, h: mapH * 0.4 });
    blueprint.push({ x: mapW * 0.65, y: mapH * 0.3, w: 45, h: mapH * 0.4 });
  } 
  else if (runtime.currentLevel === 3) {
    // Dinding bar coklat distruktur semula sedikit agar tidak terlalu rapat ke siling/lantai telefon
    blueprint.push({ x: mapW * 0.2, y: mapH * 0.23, w: mapW * 0.6, h: 35 });
    blueprint.push({ x: mapW * 0.08, y: mapH * 0.55, w: mapW * 0.42, h: 35 });
    blueprint.push({ x: mapW * 0.62, y: mapH * 0.55, w: mapW * 0.3, h: 35 });
  }

  blueprint.forEach(wall => {
    let element = document.createElement('div');
    element.className = 'chocolate-wall';
    element.style.left = `${wall.x}px`;
    element.style.top = `${wall.y}px`;
    element.style.width = `${wall.w}px`;
    element.style.height = `${wall.h}px`;
    UI.obstaclesContainer.appendChild(element);
    
    runtime.obstacles.push({
      x: wall.x, y: wall.y,
      width: wall.w, height: wall.h
    });
  });
}

// KEMASKINI: Saiz hitbox kolisi dikecilkan (daripada 50px ke 24px) supaya hero senang meloloskan diri di lorong sempit level 3
function checkPlayerWallCollisions(nextX, nextY) {
  let hitboxSize = 24; 
  let pLeft = nextX + 38; 
  let pRight = pLeft + hitboxSize;
  let pTop = nextY + 45; 
  let pBottom = pTop + hitboxSize;

  for (let wall of runtime.obstacles) {
    if (pRight > wall.x && pLeft < wall.x + wall.width &&
        pBottom > wall.y && pTop < wall.y + wall.height) {
      return true; 
    }
  }
  return false;
}

function changeMenuLevel(direction) {
  let targetLevel = runtime.currentLevel + direction;
  if (targetLevel >= 1 && targetLevel <= 3) {
    runtime.currentLevel = targetLevel;
    UI.menuLevelDisplay.textContent = `LEVEL ${runtime.currentLevel}`;
    UI.badge.textContent = `LEVEL ${runtime.currentLevel}`;
    displayCurrentLevelHighScore();
  }
}

function formatTime(ms) {
  let minutes = Math.floor(ms / 60000);
  let seconds = Math.floor((ms % 60000) / 1000);
  let centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

function displayCurrentLevelHighScore() {
  let savedScore = localStorage.getItem(`fitquest_lvl_${runtime.currentLevel}`);
  if (savedScore) {
    UI.highScoreDisplay.textContent = `🥇 Best Time: ${formatTime(parseInt(savedScore))}`;
  } else {
    UI.highScoreDisplay.textContent = `🥇 Best Time: --:--.--`;
  }
}

function selectGender(gender) {
  const femaleBtn = document.getElementById('btn-female');
  const maleBtn = document.getElementById('btn-male');
  if (gender === 'female') {
    femaleBtn.className = 'char-btn active-pink';
    maleBtn.className = 'char-btn';
    runtime.selectedSprite = 'assets/hero-sprite.png';
  } else {
    maleBtn.className = 'char-btn active-pink';
    femaleBtn.className = 'char-btn';
    runtime.selectedSprite = 'assets/hero-sprite2.png';
  }
}

function igniteEngine() {
  initAudioEngine(); 
  playBackgroundMusic(); 
  UI.player.style.backgroundImage = `url('${runtime.selectedSprite}')`;
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission().then(setupEnvironment).catch(setupEnvironment);
  } else {
    setupEnvironment();
  }
}

function returnToMainMenu() {
  runtime.halted = true;
  stopBackgroundMusic(); 
  clearAllSugarHazards();
  UI.obstaclesContainer.innerHTML = '';
  UI.decorationsContainer.innerHTML = '';
  UI.title.textContent = "✨ FITQUEST ✨";
  
  document.getElementById('menu-setup-level').style.display = 'block';
  document.getElementById('menu-setup-char').style.display = 'block';
  document.getElementById('menu-instructions').style.display = 'block';
  UI.safety.style.display = 'block';

  UI.actionsContainer.innerHTML = `<button class="cta-btn pulse-button" id="action-btn" onclick="igniteEngine()">START QUEST 🎮</button>`;
  
  displayCurrentLevelHighScore();
  UI.overlay.style.display = 'flex';
}

function setupEnvironment() {
  UI.overlay.style.display = 'none';
  runtime.halted = false;
  runtime.pHP = 100;
  UI.pFill.style.width = '100%';
  
  runtime.pX = 20;
  runtime.pY = 20;
  
  runtime.startTime = performance.now();
  runtime.elapsedTime = 0;
  UI.timerBadge.textContent = "⏱️ 00:00.00";

  generateProceduralFieldDecorations();
  generateChocolateObstacles(); 
  clearAllSugarHazards();
  resetBossForLevel();

  window.removeEventListener('devicemotion', evaluateDeviceSensors);
  window.addEventListener('devicemotion', evaluateDeviceSensors, false);
  buildJoystickControl();

  window.removeEventListener('keydown', simulateHardwareDown);
  window.addEventListener('keydown', simulateHardwareDown);
  window.removeEventListener('keyup', simulateHardwareUp);
  window.addEventListener('keyup', simulateHardwareUp);

  requestAnimationFrame(engineFrameTick);
}

function resetBossForLevel() {
  let eWidth = 120;
  runtime.eX = window.innerWidth - eWidth - 20;
  runtime.eY = window.innerHeight - eWidth - 55; 
  
  runtime.eHP = 100;
  runtime.hasPowerUpBoost = false;
  runtime.isStuckInSyrup = false;
  UI.eFill.style.width = '100%';
  UI.player.style.filter = 'none';

  updateSugarBossScale();

  if (runtime.currentLevel >= 2) {
    spawnPowerUpRandomly();
  } else {
    runtime.powerSpawned = false;
    UI.power.style.display = 'none';
  }
  refreshViewportLayouts();
}

function clearAllSugarHazards() {
  runtime.sugarGlobs.forEach(g => g.element.remove());
  runtime.sugarPuddles.forEach(p => p.element.remove());
  runtime.sugarGlobs = [];
  runtime.sugarPuddles = [];
}

function updateSugarBossScale() {
  let dynamicBaseSize = 120 * (0.5 + (runtime.eHP / 200)); 
  UI.enemy.style.width = `${dynamicBaseSize}px`;
  UI.enemy.style.height = `${dynamicBaseSize}px`;
}

function spawnPowerUpRandomly() {
  runtime.powerSpawned = true;
  runtime.hasPowerUpBoost = false;
  
  const horizontalMargin = window.innerWidth * 0.25;
  const verticalMargin = window.innerHeight * 0.25;
  
  let validSpawn = false;
  let attempts = 0;
  while (!validSpawn && attempts < 20) {
    runtime.powerX = horizontalMargin + Math.random() * (window.innerWidth - horizontalMargin * 2 - 50);
    runtime.powerY = verticalMargin + Math.random() * (window.innerHeight - verticalMargin * 2 - 50);
    
    let hitWall = false;
    for (let wall of runtime.obstacles) {
      if (runtime.powerX + 40 > wall.x && runtime.powerX < wall.x + wall.width &&
          runtime.powerY + 40 > wall.y && runtime.powerY < wall.y + wall.height) {
        hitWall = true;
      }
    }
    if (!hitWall) validSpawn = true;
    attempts++;
  }
  
  UI.power.style.left = `${runtime.powerX}px`;
  UI.power.style.top = `${runtime.powerY}px`;
  UI.power.style.display = 'block';
  UI.status.textContent = "🍏 Apple Spawned! Grab it quick to break the shield!";
  UI.status.style.color = "var(--powerup)";
}

function buildJoystickControl() {
  const bound = UI.padBoundary;
  const stick = UI.padStick;

  function trackInput(e) {
    if (!runtime.padActive || runtime.halted) return;
    let targetTouch = e.touches ? e.touches[0] : e;
    let geoBox = bound.getBoundingClientRect();
    let xOffset = targetTouch.clientX - (geoBox.left + SETTINGS.padRadius);
    let yOffset = targetTouch.clientY - (geoBox.top + SETTINGS.padRadius);
    let absoluteLength = Math.sqrt(xOffset * xOffset + yOffset * yOffset);

    if (absoluteLength > SETTINGS.padRadius) {
      xOffset = (xOffset / absoluteLength) * SETTINGS.padRadius;
      yOffset = (yOffset / absoluteLength) * SETTINGS.padRadius;
    }

    stick.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
    runtime.steerX = xOffset / SETTINGS.padRadius;
    runtime.steerY = yOffset / SETTINGS.padRadius;

    if (Math.abs(runtime.steerX) > Math.abs(runtime.steerY)) {
      runtime.currentDirectionRow = runtime.steerX > 0 ? 2 : 1; 
    } else {
      runtime.currentDirectionRow = runtime.steerY > 0 ? 0 : 3; 
    }
  }

  function severInput() {
    runtime.padActive = false;
    stick.style.transform = `translate(0px, 0px)`;
    runtime.steerX = 0; runtime.steerY = 0;
  }

  bound.addEventListener('touchstart', (e) => { runtime.padActive = true; trackInput(e); }, {passive: false});
  window.addEventListener('touchmove', trackInput, {passive: false});
  window.addEventListener('touchend', severInput);
  bound.addEventListener('mousedown', (e) => { runtime.padActive = true; trackInput(e); });
  window.addEventListener('mousemove', trackInput);
  window.addEventListener('mouseup', severInput);
}

function evaluateDeviceSensors(event) {
  if (runtime.halted) return;
  let sensors = event.accelerationIncludingGravity;
  if (!sensors) return;

  let totalMagnitude = Math.sqrt((sensors.x||0)**2 + (sensors.y||0)**2 + (sensors.z||0)**2);

  if (totalMagnitude > SETTINGS.moveCutoff) {
    let workYield = (totalMagnitude - SETTINGS.moveCutoff) * SETTINGS.accelerationGain;
    if (runtime.isStuckInSyrup) {
      workYield *= SETTINGS.stickySlowFactor;
    }
    runtime.currentSpeed = Math.min(runtime.currentSpeed + workYield, SETTINGS.velocityCap);
    UI.motionInfo.textContent = `Steps: ${totalMagnitude.toFixed(1)} | ${runtime.isStuckInSyrup ? 'STUCK IN SYRUP' : 'Moving'}`;
  }
  if (totalMagnitude > SETTINGS.shakeCutoff) processCombatStrike();
}

function updateNavigationArrow(timestamp) {
  if (runtime.halted) return;

  let eWidth = parseInt(UI.enemy.style.width) || 120;
  let heroCenterX = runtime.pX + 50;
  let heroCenterY = runtime.pY + 50;
  let bossCenterX = runtime.eX + (eWidth / 2);
  let bossCenterY = runtime.eY + (eWidth / 2);

  let deltaX = bossCenterX - heroCenterX;
  let deltaY = bossCenterY - heroCenterY;
  let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  if (distance < 170) {
    UI.navArrow.style.display = 'none';
  } else {
    UI.navArrow.style.display = 'flex';
    let angleRadian = Math.atan2(deltaY, deltaX);
    let angleDegree = angleRadian * (180 / Math.PI);
    
    let dynamicStemLength = Math.max(35, Math.min(95, distance * 0.16));
    const stemElement = UI.navArrow.querySelector('.arrow-stem');
    if (stemElement) stemElement.style.width = `${dynamicStemLength}px`;

    let floatOffset = Math.sin(timestamp * 0.007) * 4; 
    UI.navArrow.style.transform = `rotate(${angleDegree}deg) translateX(${15 + floatOffset}px)`;
  }
}

function engineFrameTick(timestamp) {
  if (runtime.halted) return;

  runtime.elapsedTime = timestamp - runtime.startTime;
  UI.timerBadge.textContent = `⏱️ ${formatTime(runtime.elapsedTime)}`;

  runtime.currentSpeed *= SETTINGS.frictionFactor;

  if (runtime.currentSpeed < 0.1) {
    runtime.currentSpeed = 0;
    runtime.currentFrameIndex = 1; 
  } else {
    if (timestamp - runtime.lastFrameUpdateTime > SETTINGS.animationSpeed) {
      runtime.lastFrameUpdateTime = timestamp;
      runtime.currentFrameIndex = (runtime.currentFrameIndex + 1) % 3;
    }
    if (timestamp - runtime.lastStepSoundTime > 320) {
      runtime.lastStepSoundTime = timestamp;
      playSoundFX('step');
    }
  }

  let proposedX = runtime.pX + (runtime.steerX * runtime.currentSpeed);
  let proposedY = runtime.pY + (runtime.steerY * runtime.currentSpeed);

  if (!checkPlayerWallCollisions(proposedX, runtime.pY)) {
    runtime.pX = proposedX;
  } else {
    runtime.currentSpeed *= 0.4; 
  }

  if (!checkPlayerWallCollisions(runtime.pX, proposedY)) {
    runtime.pY = proposedY;
  } else {
    runtime.currentSpeed *= 0.4;
  }

  runtime.pX = Math.max(0, Math.min(window.innerWidth - 100, runtime.pX));
  runtime.pY = Math.max(0, Math.min(window.innerHeight - 100, runtime.pY));

  if ((runtime.currentLevel === 2 || runtime.currentLevel === 3) && timestamp - runtime.lastSugarFired > SETTINGS.sugarAttackFrequency) {
    runtime.lastSugarFired = timestamp;
    spitSugarGlob();
  }
  
  processSugarHazards();

  if (runtime.powerSpawned && !runtime.hasPowerUpBoost) {
    let dx = (runtime.pX + 50) - (runtime.powerX + 25);
    let dy = (runtime.pY + 50) - (runtime.powerY + 25);
    let pDist = Math.sqrt(dx*dx + dy*dy);
    
    if (pDist < 60) {
      runtime.hasPowerUpBoost = true;
      UI.power.style.display = 'none';
      UI.player.style.filter = 'drop-shadow(0px 0px 10px #ffea00) brightness(1.2)';
      UI.status.textContent = `🍏 VITAMIN POWERUP! Shield broken, strike now!`;
      UI.status.style.color = 'var(--powerup)';
      playSoundFX('powerup'); 
    }
  }

  updateNavigationArrow(timestamp);
  refreshViewportLayouts();
  requestAnimationFrame(engineFrameTick);
}

function spitSugarGlob() {
  let glob = document.createElement('div');
  glob.className = 'sugar-glob';
  glob.style.left = `${runtime.eX + 40}px`;
  glob.style.top = `${runtime.eY + 40}px`;
  UI.container.appendChild(glob);

  let targetX = runtime.pX + 50;
  let targetY = runtime.pY + 50;
  let angle = Math.atan2(targetY - (runtime.eY + 40), targetX - (runtime.eX + 40));
  let velocityMultiplier = runtime.currentLevel === 3 ? SETTINGS.sugarGlobVelocity + 2.5 : SETTINGS.sugarGlobVelocity;

  runtime.sugarGlobs.push({
    element: glob,
    x: runtime.eX + 40,
    y: runtime.eY + 40,
    vX: Math.cos(angle) * velocityMultiplier,
    vY: Math.sin(angle) * velocityMultiplier
  });

  playSoundFX('shoot'); 
}

function processSugarHazards() {
  for (let i = runtime.sugarGlobs.length - 1; i >= 0; i--) {
    let g = runtime.sugarGlobs[i];
    g.x += g.vX;
    g.y += g.vY;
    g.element.style.left = `${g.x}px`;
    g.element.style.top = `${g.y}px`;

    if (g.x < -20 || g.x > window.innerWidth + 20 || g.y < -20 || g.y > window.innerHeight + 20) {
      createSugarPuddle(g.x, g.y);
      g.element.remove();
      runtime.sugarGlobs.splice(i, 1);
      continue;
    }

    let dx = g.x - (runtime.pX + 50);
    let dy = g.y - (runtime.pY + 50);
    let range = Math.sqrt(dx*dx + dy*dy);

    if (range < 45) { 
      g.element.remove();
      runtime.sugarGlobs.splice(i, 1);
      runtime.pHP = Math.max(runtime.pHP - 12, 0);
      UI.pFill.style.width = `${runtime.pHP}%`;
      UI.player.classList.remove('hurt-flash'); void UI.player.offsetWidth; UI.player.classList.add('hurt-flash');
      UI.status.textContent = `💥 Hit by sugar glob!`;
      UI.status.style.color = "var(--danger)";
      playSoundFX('hit_hero'); 

      if (runtime.pHP <= 0) triggerGameOverScreen();
    }
  }

  let currentlyOnPuddle = false;
  for (let j = runtime.sugarPuddles.length - 1; j >= 0; j--) {
    let p = runtime.sugarPuddles[j];
    let dx = p.x - (runtime.pX + 50);
    let dy = p.y - (runtime.pY + 50);
    let trapDistance = Math.sqrt(dx*dx + dy*dy);
    if (trapDistance < 50) currentlyOnPuddle = true;
  }

  if (currentlyOnPuddle !== runtime.isStuckInSyrup) {
    runtime.isStuckInSyrup = currentlyOnPuddle;
    if (runtime.isStuckInSyrup) {
      UI.player.style.filter = runtime.hasPowerUpBoost 
        ? 'drop-shadow(0px 0px 10px #ffea00) sepia(0.5) hue-rotate(330deg)'
        : 'sepia(0.6) hue-rotate(330deg) brightness(0.9)';
      UI.status.textContent = `⚠️ Stuck in sticky syrup! Run faster!`;
      UI.status.style.color = "#ffaa00";
    } else {
      UI.player.style.filter = runtime.hasPowerUpBoost ? 'drop-shadow(0px 0px 10px #ffea00) brightness(1.2)' : 'none';
    }
  }
}

function createSugarPuddle(rawX, rawY) {
  let targetX = Math.max(40, Math.min(window.innerWidth - 80, rawX));
  let targetY = Math.max(40, Math.min(window.innerHeight - 60, rawY));
  let puddle = document.createElement('div');
  puddle.className = 'sugar-puddle';
  puddle.style.left = `${targetX}px`;
  puddle.style.top = `${targetY}px`;
  UI.container.appendChild(puddle);
  runtime.sugarPuddles.push({ element: puddle, x: targetX, y: targetY });

  if (runtime.sugarPuddles.length > 6) {
    let oldPuddle = runtime.sugarPuddles.shift();
    oldPuddle.element.remove();
  }
}

function triggerGameOverScreen() {
  runtime.halted = true;
  stopBackgroundMusic(); 
  clearAllSugarHazards();
  UI.title.textContent = "💥 QUEST FAILED";
  UI.status.textContent = "Defeated...";
  
  const card = UI.overlay.querySelector('.menu-card');
  card.querySelector('.how-to-play-box').style.display = 'none'; 
  card.querySelector('.setup-box').style.display = 'none'; 
  card.querySelector('.safety-warning-box').style.display = 'block';
  card.querySelectorAll('#menu-desc').forEach(p => p.remove()); 
  
  let retryDesc = document.createElement('p');
  retryDesc.id = 'menu-desc';
  retryDesc.style.color = '#cbd5e1';
  retryDesc.style.margin = '10px 0 20px 0';
  retryDesc.style.fontSize = '0.85rem';
  retryDesc.textContent = "Your energy drained completely. Let's stand up and try again!";
  card.insertBefore(retryDesc, UI.actionsContainer);

  UI.actionsContainer.innerHTML = `
    <button class="cta-btn pulse-button" onclick="igniteEngine()">RETRY LEVEL 🔄</button>
    <button class="secondary-btn" onclick="returnToMainMenu()">BACK TO MAIN MENU 🏠</button>
  `;

  UI.overlay.style.display = 'flex';
}

function refreshViewportLayouts() {
  UI.player.style.left = `${runtime.pX}px`;
  UI.player.style.top = `${runtime.pY}px`;
  UI.enemy.style.left = `${runtime.eX}px`;
  UI.enemy.style.top = `${runtime.eY}px`;

  let xPercentage = runtime.currentFrameIndex * 50;  
  let yPercentage = runtime.currentDirectionRow * 33.333; 
  UI.player.style.backgroundPosition = `${xPercentage}% ${yPercentage}%`;
}

function processCombatStrike() {
  if (runtime.halted) return;
  let timeStamp = Date.now();
  if (timeStamp - runtime.lastAttack < SETTINGS.combatWindow) return;
  runtime.lastAttack = timeStamp;

  let eWidth = parseInt(UI.enemy.style.width) || 120;
  let distanceVector = Math.sqrt(((runtime.eX + (eWidth/2)) - (runtime.pX + 50))**2 + ((runtime.eY + (eWidth/2)) - (runtime.pY + 50))**2);
  
  if (distanceVector <= SETTINGS.hitBoxRange + (eWidth/2)) {
    if (runtime.currentLevel >= 2 && !runtime.hasPowerUpBoost) {
      UI.status.textContent = "🛡️ Immune! Collect an Apple first!";
      UI.status.style.color = "var(--danger)";
      playSoundFX('hit_hero');
      return;
    }
    let dmg = runtime.hasPowerUpBoost ? 34 : 20; 
    UI.player.classList.remove('attack-pulse'); void UI.player.offsetWidth; UI.player.classList.add('attack-pulse');
    runtime.eHP = Math.max(runtime.eHP - dmg, 0); 
    UI.eFill.style.width = `${runtime.eHP}%`;
    UI.enemy.classList.remove('hurt-flash'); void UI.enemy.offsetWidth; UI.enemy.classList.add('hurt-flash');
    updateSugarBossScale();
    UI.status.textContent = `💥 HIT! Sugar Cube: ${runtime.eHP}%`;
    UI.status.style.color = "var(--primary)";
    playSoundFX('hit_boss'); 

    if (runtime.eHP <= 0) processLevelVictory();
  } else {
    UI.status.textContent = "❌ Too far! Jog closer to the Sugar Cube!";
  }
}

function checkAndSaveHighScore(level, completionTime) {
  let recordKey = `fitquest_lvl_${level}`;
  let existingRecord = localStorage.getItem(recordKey);
  if (!existingRecord || completionTime < parseInt(existingRecord)) {
    localStorage.setItem(recordKey, completionTime.toString());
    return true; 
  }
  return false;
}

function processLevelVictory() {
  runtime.halted = true;
  stopBackgroundMusic(); 
  clearAllSugarHazards();
  window.removeEventListener('devicemotion', evaluateDeviceSensors);

  let isNewRecord = checkAndSaveHighScore(runtime.currentLevel, runtime.elapsedTime);
  let finalTimeFormatted = formatTime(runtime.elapsedTime);

  playSoundFX('victory'); 

  const card = UI.overlay.querySelector('.menu-card');
  document.getElementById('menu-setup-level').style.display = 'none';
  document.getElementById('menu-setup-char').style.display = 'none';
  document.getElementById('menu-instructions').style.display = 'none';
  UI.safety.style.display = 'none';
  
  card.querySelectorAll('.health-fact-box').forEach(b => b.remove());
  card.querySelectorAll('#menu-desc').forEach(p => p.remove());

  let factBox = document.createElement('div');
  factBox.className = 'health-fact-box';
  factBox.style.background = 'rgba(46, 229, 117, 0.12)';
  factBox.style.border = '2px solid var(--primary)';
  factBox.style.borderRadius = '16px';
  factBox.style.padding = '12px';
  factBox.style.margin = '10px 0 15px 0';
  factBox.style.textAlign = 'left';

  let factTitle = document.createElement('h4');
  factTitle.style.margin = '0 0 6px 0';
  factTitle.style.color = isNewRecord ? '#ffd700' : 'var(--primary)'; 
  factTitle.style.fontSize = '0.9rem';
  factTitle.textContent = isNewRecord ? '🥇 NEW BEST RECORD!' : '🩺 HEALTH DATA ANALYSIS';

  let factContent = document.createElement('p');
  factContent.style.color = '#e2e8f0';
  factContent.style.fontSize = '0.78rem';
  factContent.style.lineHeight = '1.4';
  factContent.style.margin = '0';

  factBox.appendChild(factTitle);
  factBox.appendChild(factContent);

  let timeNote = `<b style="color: #2ee575;">Quest Time: ${finalTimeFormatted}</b><br><br>`;
  let nextLevelTriggerText = "";

  if (runtime.currentLevel === 1) {
    UI.title.textContent = "🎉 STAGE 1 CLEAR";
    factContent.innerHTML = timeNote + "By actively running on the spot just now, you successfully burned off empty sugar calories before they could convert into unhealthy body fat storage!";
    runtime.currentLevel = 2;
    nextLevelTriggerText = "ENTER LEVEL 2 ➡️";
  } 
  else if (runtime.currentLevel === 2) {
    UI.title.textContent = "🎉 STAGE 2 CLEAR";
    factContent.innerHTML = timeNote + "Constant blood sugar spikes can lead to insulin resistance. Regular active physical movement keeps your body cells sensitive and healthy!";
    runtime.currentLevel = 3;
    nextLevelTriggerText = "ENTER LEVEL 3 ➡️";
  } 
  else if (runtime.currentLevel === 3) {
    UI.title.textContent = "🏆 CHAMPION!";
    factContent.innerHTML = timeNote + "Fantastic job! Maintaining an active workout routine drastically reduces chronic long-term Type-2 Diabetes risks. Keep moving!";
    runtime.currentLevel = 1;
    nextLevelTriggerText = "RESTART QUEST 🔄";
  }

  card.insertBefore(factBox, UI.actionsContainer);
  UI.badge.textContent = `LEVEL ${runtime.currentLevel}`;
  UI.menuLevelDisplay.textContent = `LEVEL ${runtime.currentLevel}`;

  UI.actionsContainer.innerHTML = `
    <button class="cta-btn pulse-button" onclick="igniteEngine()">${nextLevelTriggerText}</button>
    <button class="secondary-btn" onclick="returnToMainMenu()">BACK TO MAIN MENU 🏠</button>
  `;

  displayCurrentLevelHighScore();

  setTimeout(() => {
    UI.overlay.style.display = 'flex';
  }, 600);
}

let testKeys = {};
function simulateHardwareDown(e) {
  testKeys[e.code] = true;
  if (e.code === 'ShiftLeft' || e.code === 'Space') {
    let simulatedGain = runtime.isStuckInSyrup ? 0.7 : 2.0;
    runtime.currentSpeed = Math.min(runtime.currentSpeed + simulatedGain, SETTINGS.velocityCap);
  }
  if (e.code === 'KeyE') processCombatStrike();
  mapSimulatedSteering();
}
function simulateHardwareUp(e) { testKeys[e.code] = false; mapSimulatedSteering(); }
function mapSimulatedSteering() {
  if (runtime.padActive || runtime.halted) return;
  runtime.steerX = (testKeys['KeyD'] || testKeys['ArrowRight'] ? 1 : 0) - (testKeys['KeyA'] || testKeys['ArrowLeft'] ? 1 : 0);
  runtime.steerY = (testKeys['KeyS'] || testKeys['ArrowDown'] ? 1 : 0) - (testKeys['KeyW'] || testKeys['ArrowUp'] ? 1 : 0);
  if (runtime.steerX !== 0 || runtime.steerY !== 0) {
    if (Math.abs(runtime.steerX) > Math.abs(runtime.steerY)) runtime.currentDirectionRow = runtime.steerX > 0 ? 2 : 1;
    else runtime.currentDirectionRow = runtime.steerY > 0 ? 0 : 3;
  }
}
