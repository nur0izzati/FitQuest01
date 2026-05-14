// --- 1. Game Configuration ---
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#87CEEB',
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

// --- 2. Global Variables (Required for the code to work) ---
let player;
let isWalking = false;
let stepCount = 0;
let currentLevel = 1;
let currentXP = 0;
let xpNeededForLevelUp = 100;
let uiText;
let lastShake = 0;
let walkTimeout; 

function preload() {
    // Character asset - Replace with your GitHub link if you have a custom PNG
    this.load.spritesheet('hero', 'https://labs.phaser.io/assets/sprites/dude.png', {
        frameWidth: 32,
        frameHeight: 48
    });
}

function create() {
    const scene = this;

    // Add Player to the middle of the screen
    player = this.physics.add.sprite(window.innerWidth / 2, window.innerHeight / 2, 'hero');
    player.setCollideWorldBounds(true);

    // Animations (Walking and Standing Still)
    this.anims.create({
        key: 'walk-anim',
        frames: this.anims.generateFrameNumbers('hero', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'idle',
        frames: [ { key: 'hero', frame: 4 } ],
        frameRate: 20
    });

    // UI Text Panel
    uiText = this.add.text(20, 20, 'Tap to Start Motion', {
        fontSize: '18px',
        fill: '#ffffff',
        backgroundColor: '#ff66b2',
        padding: { x: 10, y: 10 }
    }).setScrollFactor(0).setInteractive();

    // --- SENSOR ACTIVATION (The "Prototype" way) ---
    this.input.on('pointerdown', () => {
        if (typeof DeviceMotionEvent.requestPermission === "function") {
            DeviceMotionEvent.requestPermission().then(response => {
                if (response === "granted") {
                    window.addEventListener("devicemotion", handleMotion);
                    uiText.setText("Motion Ready!");
                }
            });
        } else {
            window.addEventListener("devicemotion", handleMotion);
            uiText.setText("Motion Ready!");
        }
    });
}

function handleMotion(event) {
    let acc = event.accelerationIncludingGravity;
    if (!acc) return;

    let force = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);

    // 1. WALKING DETECTION
    if (force > 10 && force < 22) {
        isWalking = true;
        clearTimeout(walkTimeout);
        walkTimeout = setTimeout(() => { isWalking = false; }, 800);
        stepCount++;
    }

    // 2. ATTACK DETECTION
    let now = Date.now();
    if (force >= 22 && (now - lastShake > 1000)) {
        lastShake = now;
        performAttack(); // Call the attack function
    }
}

function update() {
    // Movement Logic
    if (isWalking) {
        player.setVelocityY(-150); // Move UP
        player.anims.play('walk-anim', true);
        currentXP += 0.05;
        checkLevelUp(this);
    } else {
        player.setVelocityY(0);
        player.anims.play('idle', true);
        
        if (player.isTinted) {
            player.clearTint();
        }
    }

    // Update UI Stats
    uiText.setText(
        `⭐ FitQuest Stats ⭐\n` +
        `Level: ${currentLevel}\n` +
        `XP: ${Math.floor(currentXP)} / ${xpNeededForLevelUp}\n` +
        `Steps: ${Math.floor(stepCount / 10)}\n` +
        `Status: ${isWalking ? '🐾 WALKING' : '🧍 STANDING'}`
    );
}

function checkLevelUp(scene) {
    if (currentXP >= xpNeededForLevelUp) {
        currentXP = 0;
        currentLevel += 1;
        xpNeededForLevelUp = Math.floor(xpNeededForLevelUp * 1.5);

        // Visual Feedback
        player.setScale(1.5);
        scene.time.delayedCall(500, () => { player.setScale(1); });

        // Cloud Save (Firebase)
        if (typeof savePlayerData === "function") {
            savePlayerData(Math.floor(stepCount/10), currentLevel, currentXP);
        }
    }
}

function performAttack() {
    player.setTint(0xff0000); // Turns red
    currentXP += 10;
    // Tiny jump for feedback
    player.setVelocityY(-200);
}
