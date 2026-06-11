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
  lastSugarFired: 0,
  selectedSprite: 'assets/hero-sprite.png'
};

const UI = {
  container: document.getElementById('game-container'),
  overlay: document.getElementById('overlay'),
  title: document.getElementById('menu-title'),
  safety: document.getElementById('safety-box'),
  btn: document.getElementById('action-btn'),
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
  menuLevelDisplay: document.getElementById('menu-level-display')
};

function changeMenuLevel(direction) {
  let targetLevel = runtime.currentLevel + direction;
  if (targetLevel >= 1 && targetLevel <= 3) {
    runtime.currentLevel = targetLevel;
    UI.menuLevelDisplay.textContent = `LEVEL ${runtime.currentLevel}`;
    UI.badge.textContent = `LEVEL ${runtime.currentLevel}`;
  }
}

function selectGender(gender) {
  const femaleBtn = document.getElementById('btn-female');
  const maleBtn = document.getElementById('btn-male');
  
  if (gender === 'female') {
    femaleBtn.classList.add('active');
    maleBtn.classList.remove('active');
    runtime.selectedSprite = 'assets/hero-sprite.png';
  } else {
    maleBtn.classList.add('active');
    femaleBtn.classList.remove('active');
    runtime.selectedSprite = 'assets/hero-sprite2.png';
  }
}

function igniteEngine() {
  UI.player.style.backgroundImage = `url('${runtime.selectedSprite}')`;

  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission().then(setupEnvironment).catch(setupEnvironment);
  } else {
    setupEnvironment();
  }
}

function setupEnvironment() {
  UI.overlay.style.display = 'none';
  runtime.halted = false;
  runtime.pHP = 100;
  UI.pFill.style.width = '100%';
  runtime.pX = window.innerWidth * 0.15;
  runtime.pY = window.innerHeight / 2 - 50;
  
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
  runtime.eX = window.innerWidth * 0.75;
  runtime.eY = window.innerHeight / 2 - 60;
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
  
  const horizontalMargin = window.innerWidth * 0.2;
  const verticalMargin = window.innerHeight * 0.2;
  
  runtime.powerX = horizontalMargin + Math.random() * (window.innerWidth - horizontalMargin * 2 - 50);
  runtime.powerY = verticalMargin + Math.random() * (window.innerHeight - verticalMargin * 2 - 50);

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
    UI.motionInfo.textContent = `Steps: ${totalMagnitude.toFixed(1)} | ${runtime.isStuckInSyrup ? 'STUCK IN SYRUP (Run Faster!)' : 'Moving'}`;
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
    }
  }

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
      
      UI.status.textContent = `💥 Hit by flying obstacle!`;
      UI.status.style.color = "var(--danger)";

      if (runtime.pHP <= 0) triggerGameOverScreen();
    }
  }

  let currentlyOnPuddle = false;
  for (let j = runtime.sugarPuddles.length - 1; j >= 0; j--) {
    let p = runtime.sugarPuddles[j];
    let dx = p.x - (runtime.pX + 50);
    let dy = p.y - (runtime.pY + 50);
    let trapDistance = Math.sqrt(dx*dx + dy*dy);

    if (trapDistance < 50) {
      currentlyOnPuddle = true;
    }
  }

  if (currentlyOnPuddle !== runtime.isStuckInSyrup) {
    runtime.isStuckInSyrup = currentlyOnPuddle;
    if (runtime.isStuckInSyrup) {
      UI.player.style.filter = runtime.hasPowerUpBoost 
        ? 'drop-shadow(0px 0px 10px #ffea00) sepia(0.5) hue-rotate(330deg)'
        : 'sepia(0.6) hue-rotate(330deg) brightness(0.9)';
      UI.status.textContent = `⚠️ Stuck in sticky syrup! Run faster to break free!`;
      UI.status.style.color = "#ffaa00";
    } else {
      UI.player.style.filter = runtime.hasPowerUpBoost 
        ? 'drop-shadow(0px 0px 10px #ffea00) brightness(1.2)' 
        : 'none';
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
  clearAllSugarHazards();
  UI.title.textContent = "💥 GAME FAILED!";
  UI.status.textContent = "Defeated...";
  UI.overlay.querySelector('.how-to-play-box').style.display = 'none'; 
  UI.overlay.querySelector('.setup-box').style.display = 'none'; 
  UI.overlay.querySelector('.safety-warning-box').style.display = 'block';
  UI.overlay.querySelectorAll('#menu-desc').forEach(p => p.remove()); 
  
  let retryDesc = document.createElement('p');
  retryDesc.id = 'menu-desc';
  retryDesc.style.color = '#7e8494';
  retryDesc.style.marginBottom = '25px';
  retryDesc.textContent = "Your energy was completely drained! Let's jog it out and try again.";
  UI.overlay.insertBefore(retryDesc, UI.btn);

  UI.btn.textContent = "RETRY THIS LEVEL";
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
      UI.status.textContent = "🛡️ Immune! Armor protects him. Collect an Apple first!";
      UI.status.style.color = "var(--danger)";
      return;
    }

    let dmg = runtime.hasPowerUpBoost ? 34 : 20; 
    UI.player.classList.remove('attack-pulse'); void UI.player.offsetWidth; UI.player.classList.add('attack-pulse');
    runtime.eHP = Math.max(runtime.eHP - dmg, 0); 
    UI.eFill.style.width = `${runtime.eHP}%`;
    UI.enemy.classList.remove('hurt-flash'); void UI.enemy.offsetWidth; UI.enemy.classList.add('hurt-flash');
    
    updateSugarBossScale();
    UI.status.textContent = `💥 HIT! Boss Health: ${runtime.eHP}%`;
    UI.status.style.color = "var(--primary)";

    if (runtime.eHP <= 0) progressCampaignLevel();
  } else {
    UI.status.textContent = "❌ Too far away! Jog closer to strike!";
  }
}

// FUNGSI DIKEMASKINI: Ditambah Paparan Fakta Kesihatan & Bahaya Diabetes Sepasukan Kalah
function progressCampaignLevel() {
  runtime.halted = true;
  clearAllSugarHazards();
  window.removeEventListener('devicemotion', evaluateDeviceSensors);

  UI.overlay.querySelector('.how-to-play-box').style.display = 'none';
  UI.overlay.querySelector('.setup-box').style.display = 'none';
  UI.overlay.querySelector('.safety-warning-box').style.display = 'none';
  UI.overlay.querySelectorAll('p').forEach(p => p.remove());
  UI.overlay.querySelectorAll('.health-fact-box').forEach(b => b.remove());

  // Cipta satu kotak khas untuk mesej kesedaran kesihatan (Health Fact Box)
  let factBox = document.createElement('div');
  factBox.className = 'health-fact-box';
  factBox.style.background = 'rgba(0, 229, 255, 0.08)';
  factBox.style.border = '2px solid #00e5ff';
  factBox.style.borderRadius = '12px';
  factBox.style.padding = '15px';
  factBox.style.margin = '15px 0 25px 0';
  factBox.style.maxWidth = '340px';
  factBox.style.textAlign = 'left';

  let factTitle = document.createElement('h4');
  factTitle.style.margin = '0 0 8px 0';
  factTitle.style.color = '#00e5ff';
  factTitle.style.fontSize = '1rem';
  factTitle.textContent = '🩺 HEALTH FACT REPORT';

  let factContent = document.createElement('p');
  factContent.style.color = '#e5e7eb';
  factContent.style.fontSize = '0.85rem';
  factContent.style.lineHeight = '1.5';
  factContent.style.margin = '0';

  factBox.appendChild(factTitle);
  factBox.appendChild(factContent);

  if (runtime.currentLevel === 1) {
    UI.title.textContent = "🎉 LEVEL 1 CLEARED!";
    factContent.innerHTML = "<b>Empty Calories:</b> Sugar provides instant energy but has 0 nutritional value. By actively jogging just now, you successfully burned off those empty calories before they turned into stored body fat!";
    
    runtime.currentLevel = 2;
    UI.btn.textContent = "PROCEED TO LEVEL 2";
    UI.badge.textContent = `LEVEL 2`;
  } 
  else if (runtime.currentLevel === 2) {
    UI.title.textContent = "🎉 LEVEL 2 CLEARED!";
    factContent.innerHTML = "<b>Insulin Resistance & Weight Gain:</b> Constant high sugar spikes force your pancreas to overproduce insulin. Over time, your cells become numb to it (insulin resistance), leading to fat storage, high blood pressure, and obesity!";
    
    runtime.currentLevel = 3;
    UI.btn.textContent = "PROCEED TO LEVEL 3";
    UI.badge.textContent = `LEVEL 3`;
  } 
  else if (runtime.currentLevel === 3) {
    UI.title.textContent = "🏆 VICTORY OVER DIABETES!";
    factContent.innerHTML = "<b>Chronic Diabetes Risk:</b> When insulin fails completely, sugar builds up in your blood, causing <b>Type 2 Diabetes</b>. This can lead to blindness, kidney failure, and nerve damage. Congratulations! Your active steps today prove that exercise is the ultimate shield against chronic health diseases!";
    
    runtime.currentLevel = 1;
    UI.btn.textContent = "PLAY AGAIN";
    UI.badge.textContent = `LEVEL 1`;
  }

  UI.overlay.insertBefore(factBox, UI.btn);
  
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
