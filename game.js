/**
 * FitQuest: Slime King Campaign - Game Engine Module
 * This module is initialized dynamically by app.js when calibration completes.
 */

const SETTINGS = {
  moveCutoff: 11.8,
  shakeCutoff: 23.5,
  combatWindow: 500,
  hitBoxRange: 75,
  frictionFactor: 0.88,
  accelerationGain: 0.7,
  velocityCap: 6.5,
  padRadius: 60,
  animationSpeed: 110,
  slimeGlobVelocity: 4,
  slimeAttackFrequency: 2200,
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
  isStuckInSlime: false,
  slimeGlobs: [],
  slimePuddles: [],
  lastSlimeFired: 0,
  
  // Analytics Tracking variables for Session Summaries
  startTime: 0,
  totalCaloriesBurned: 0
};

// Global UI Object Cache (mapped to the Single Page App layout)
let UI = {};

/**
 * Core Entry Point to ignite the engine from the App UI Shell
 */
function initializeGameEngine() {
  // Cache DOM element references inside the active SPA view layer
  UI = {
    container: document.getElementById('game-container'),
    badge: document.getElementById('level-badge'),
    player: document.getElementById('player'),
    enemy: document.getElementById('enemy'),
    power: document.getElementById('powerup-item'),
    pFill: document.getElementById('p-fill'),
    eFill: document.getElementById('e-fill'),
    status: document.getElementById('status-msg'),
    motionInfo: document.getElementById('motion-display'),
    padBoundary: document.getElementById('joy-boundary'),
    padStick: document.getElementById('joy-stick')
  };

  // Setup initial session states
  runtime.halted = false;
  runtime.pHP = 100;
  runtime.currentLevel = 1;
  runtime.startTime = Date.now();
  runtime.totalCaloriesBurned = 0;
  
  UI.pFill.style.width = '100%';
  runtime.pX = window.innerWidth * 0.15;
  runtime.pY = window.innerHeight / 2 - 50;
  
  clearAllSlimeHazards();
  resetBossForLevel();

  // Attach Hardware listeners
  window.removeEventListener('devicemotion', evaluateDeviceSensors);
  window.addEventListener('devicemotion', evaluateDeviceSensors, false);
  buildJoystickControl();

  // Desktop Development Fallbacks
  window.removeEventListener('keydown', simulateHardwareDown);
  window.addEventListener('keydown', simulateHardwareDown);
  window.removeEventListener('keyup', simulateHardwareUp);
  window.addEventListener('keyup', simulateHardwareUp);

  // Kick off structural animation frame loops
  requestAnimationFrame(engineFrameTick);
}

function resetBossForLevel() {
  runtime.eX = window.innerWidth * 0.75;
  runtime.eY = window.innerHeight / 2 - 60;
  runtime.eHP = 100;
  runtime.hasPowerUpBoost = false;
  runtime.isStuckInSlime = false;
  UI.eFill.style.width = '100%';
  UI.player.style.filter = 'none';

  updateSlimeBossScale();

  if (runtime.currentLevel >= 2) {
    spawnPowerUpRandomly();
  } else {
    runtime.powerSpawned = false;
    UI.power.style.display = 'none';
  }
  refreshViewportLayouts();
}

function clearAllSlimeHazards() {
  runtime.slimeGlobs.forEach(g => g.element.remove());
  runtime.slimePuddles.forEach(p => p.element.remove());
  runtime.slimeGlobs = [];
  runtime.slimePuddles = [];
}

function updateSlimeBossScale() {
  let dynamicBaseSize = 120 * (0.5 + (runtime.eHP / 200)); 
  UI.enemy.style.width = `${dynamicBaseSize}px`;
  UI.enemy.style.height = `${dynamicBaseSize}px`;
}

function spawnPowerUpRandomly() {
  runtime.powerSpawned = true;
  runtime.hasPowerUpBoost = false;
  
  const horizontalMargin = window.innerWidth * 0.2;
  const verticalMargin = window.innerHeight * 0.2;
  
  runtime.powerX = horizontalMargin + Math.random() * (window.innerWidth - horizontalMargin * 2 - 40);
  runtime.powerY = verticalMargin + Math.random() * (window.innerHeight - verticalMargin * 2 - 40);

  UI.power.style.left = `${runtime.powerX}px`;
  UI.power.style.top = `${runtime.powerY}px`;
  UI.power.style.display = 'block';
  
  UI.status.textContent = "⚡ Anti-Slime Crystal muncul! Ambil cepat!";
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
    
    if (runtime.isStuckInSlime) {
      workYield *= SETTINGS.stickySlowFactor;
    }

    runtime.currentSpeed = Math.min(runtime.currentSpeed + workYield, SETTINGS.velocityCap);
    
    // Academic additions: Convert movement pacing directly into real-time calorie tracking estimators
    runtime.totalCaloriesBurned += (totalMagnitude * 0.002);
    
    UI.motionInfo.textContent = `Langkah: ${totalMagnitude.toFixed(1)} | ${runtime.isStuckInSlime ? 'TERSEKAT (Lari Laju!)' : 'Bergerak'}`;
  }

  if (totalMagnitude > SETTINGS.shakeCutoff) processCombatStrike();
}

function engineFrameTick(timestamp) {
  if (runtime.halted) return;

  runtime.currentSpeed *= SETTINGS.frictionFactor;

  if (runtime.currentSpeed < 0.1) {
    runtime.currentSpeed = 0;
    runtime.currentFrameIndex = 1; 
  } else {
    if (timestamp - runtime.lastFrameUpdateTime > SETTINGS.animationSpeed) {
      runtime.lastFrameUpdateTime = timestamp;
      runtime.currentFrameIndex = (runtime.currentFrameIndex + 1) % 3;
    }
  }

  runtime.pX += runtime.steerX * runtime.currentSpeed;
  runtime.pY += runtime.steerY * runtime.currentSpeed;

  runtime.pX = Math.max(0, Math.min(window.innerWidth - 100, runtime.pX));
  runtime.pY = Math.max(0, Math.min(window.innerHeight - 100, runtime.pY));

  if ((runtime.currentLevel === 2 || runtime.currentLevel === 3) && timestamp - runtime.lastSlimeFired > SETTINGS.slimeAttackFrequency) {
    runtime.lastSlimeFired = timestamp;
    spitSlimeGlob();
  }
  
  processSlimeHazards();

  if (runtime.powerSpawned && !runtime.hasPowerUpBoost) {
    let dx = (runtime.pX + 50) - (runtime.powerX + 20);
    let dy = (runtime.pY + 50) - (runtime.powerY + 20);
    let pDist = Math.sqrt(dx*dx + dy*dy);
    
    if (pDist < 55) {
      runtime.hasPowerUpBoost = true;
      UI.power.style.display = 'none';
      UI.player.style.filter = 'drop-shadow(0px 0px 10px #ffea00) brightness(1.2)';
      UI.status.textContent = `⚡ Perisai Slime pecah, serang sekarang!`;
      UI.status.style.color = 'var(--powerup)';
    }
  }

  refreshViewportLayouts();
  requestAnimationFrame(engineFrameTick);
}

function spitSlimeGlob() {
  let glob = document.createElement('div');
  glob.className = 'slime-glob';
  glob.style.left = `${runtime.eX + 40}px`;
  glob.style.top = `${runtime.eY + 40}px`;
  UI.container.appendChild(glob);

  let targetX = runtime.pX + 50;
  let targetY = runtime.pY + 50;
  let angle = Math.atan2(targetY - (runtime.eY + 40), targetX - (runtime.eX + 40));

  let velocityMultiplier = runtime.currentLevel === 3 ? SETTINGS.slimeGlobVelocity + 2.5 : SETTINGS.slimeGlobVelocity;

  runtime.slimeGlobs.push({
    element: glob,
    x: runtime.eX + 40,
    y: runtime.eY + 40,
    vX: Math.cos(angle) * velocityMultiplier,
    vY: Math.sin(angle) * velocityMultiplier
  });
}

function processSlimeHazards() {
  for (let i = runtime.slimeGlobs.length - 1; i >= 0; i--) {
    let g = runtime.slimeGlobs[i];
    g.x += g.vX;
    g.y += g.vY;
    g.element.style.left = `${g.x}px`;
    g.element.style.top = `${g.y}px`;

    if (g.x < -20 || g.x > window.innerWidth + 20 || g.y < -20 || g.y > window.innerHeight + 20) {
      createSlimePuddle(g.x, g.y);
      g.element.remove();
      runtime.slimeGlobs.splice(i, 1);
      continue;
    }

    let dx = g.x - (runtime.pX + 50);
    let dy = g.y - (runtime.pY + 50);
    let range = Math.sqrt(dx*dx + dy*dy);

    if (range < 45) { 
      g.element.remove();
      runtime.slimeGlobs.splice(i, 1);
      
      runtime.pHP = Math.max(runtime.pHP - 12, 0);
      UI.pFill.style.width = `${runtime.pHP}%`;
      UI.player.classList.remove('hurt-flash'); void UI.player.offsetWidth; UI.player.classList.add('hurt-flash');
      
      UI.status.textContent = `🤢 Melekit! Terkena Slime Glob!`;
      UI.status.style.color = "var(--danger)";

      if (runtime.pHP <= 0) terminateGameSession(false);
    }
  }

  let currentlyOnPuddle = false;
  for (let j = runtime.slimePuddles.length - 1; j >= 0; j--) {
    let p = runtime.slimePuddles[j];
    let dx = p.x - (runtime.pX + 50);
    let dy = p.y - (runtime.pY + 50);
    let trapDistance = Math.sqrt(dx*dx + dy*dy);

    if (trapDistance < 50) currentlyOnPuddle = true;
  }

  if (currentlyOnPuddle !== runtime.isStuckInSlime) {
    runtime.isStuckInSlime = currentlyOnPuddle;
    if (runtime.isStuckInSlime) {
      UI.player.style.filter = runtime.hasPowerUpBoost 
        ? 'drop-shadow(0px 0px 10px #ffea00) sepia(0.6) hue-rotate(60deg)'
        : 'sepia(0.8) hue-rotate(60deg) brightness(0.8)';
      UI.status.textContent = `⚠️ Tersekat! Tingkatkan kelajuan larian!`;
      UI.status.style.color = "#ffaa00";
    } else {
      UI.player.style.filter = runtime.hasPowerUpBoost ? 'drop-shadow(0px 0px 10px #ffea00) brightness(1.2)' : 'none';
    }
  }
}

function createSlimePuddle(rawX, rawY) {
  let targetX = Math.max(40, Math.min(window.innerWidth - 80, rawX));
  let targetY = Math.max(40, Math.min(window.innerHeight - 60, rawY));

  let puddle = document.createElement('div');
  puddle.className = 'slime-puddle';
  puddle.style.left = `${targetX}px`;
  puddle.style.top = `${targetY}px`;
  UI.container.appendChild(puddle);

  runtime.slimePuddles.push({ element: puddle, x: targetX, y: targetY });

  if (runtime.slimePuddles.length > 6) {
    let oldPuddle = runtime.slimePuddles.shift();
    oldPuddle.element.remove();
  }
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
      UI.status.textContent = "🛡️ Kebal! Cari Kristal dahulu!";
      UI.status.style.color = "var(--danger)";
      return;
    }

    let dmg = runtime.hasPowerUpBoost ? 34 : 20; 
    
    UI.player.classList.remove('attack-pulse'); void UI.player.offsetWidth; UI.player.classList.add('attack-pulse');
    runtime.eHP = Math.max(runtime.eHP - dmg, 0); 
    UI.eFill.style.width = `${runtime.eHP}%`;
    UI.enemy.classList.remove('hurt-flash'); void UI.enemy.offsetWidth; UI.enemy.classList.add('hurt-flash');
    
    updateSlimeBossScale();
    UI.status.textContent = `💥 PUKULAN! HP Boss: ${runtime.eHP}%`;
    UI.status.style.color = "var(--primary)";

    if (runtime.eHP <= 0) progressCampaignLevel();
  } else {
    UI.status.textContent = "❌ Terlalu jauh! Dekati musuh!";
  }
}

function progressCampaignLevel() {
  if (runtime.currentLevel < 3) {
    runtime.currentLevel++;
    resetBossForLevel();
    UI.badge.textContent = `LEVEL ${runtime.currentLevel}`;
    UI.status.textContent = `FASA VIRTUAL ${runtime.currentLevel} BERMULA!`;
  } else {
    terminateGameSession(true);
  }
}

/**
 * Handles Game Over or Win states, and pushes stats back to app.js
 * This fulfills Panel 10 (Session Summary Architecture)
 */
function terminateGameSession(isVictory) {
  runtime.halted = true;
  clearAllSlimeHazards();
  
  window.removeEventListener('devicemotion', evaluateDeviceSensors);

  const finalDurationMinutes = Math.round((Date.now() - runtime.startTime) / 1000 / 60) || 1;
  const finalXP = isVictory ? 150 : 25;

  // Fire event returning metrics payload to app.js wrapper shell
  if (typeof window.onGameSessionComplete === 'function') {
    window.onGameSessionComplete({
      victory: isVictory,
      calories: Math.round(runtime.totalCaloriesBurned),
      duration: finalDurationMinutes,
      xpGained: finalXP
    });
  }
}

// Development Keyboard hooks
let testKeys = {};
function simulateHardwareDown(e) {
  testKeys[e.code] = true;
  if (e.code === 'ShiftLeft' || e.code === 'Space') {
    let simulatedGain = runtime.isStuckInSlime ? 0.7 : 2.0;
    runtime.currentSpeed = Math.min(runtime.currentSpeed + simulatedGain, SETTINGS.velocityCap);
    runtime.totalCaloriesBurned += 0.15;
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
