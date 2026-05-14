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

// Global Variables
let player;
let isWalking = false;
let stepCount = 0;
let currentLevel = 1;
let currentXP = 0;
let xpNeededForLevelUp = 100;
let uiText;

function preload() {
    this.load.spritesheet('hero', 'https://labs.phaser.io/assets/sprites/dude.png', {
        frameWidth: 32,
        frameHeight: 48
    });
}

function create() {
    const scene = this; // Save reference to the scene for the sensor logic

    // Add Player
    player = this.physics.add.sprite(window.innerWidth / 2, window.innerHeight / 2, 'hero');
    player.setCollideWorldBounds(true);

    // Create Animations
    this.anims.create({
        key: 'walk-anim',
        frames: this.anims.generateFrameNumbers('hero', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    // Cute UI Panel
    uiText = this.add.text(20, 20, '', {
        fontSize: '18px',
        fill: '#ffffff',
        backgroundColor: '#ff66b2',
        padding: { x: 10, y: 10 },
        lineSpacing: 6
    }).setScrollFactor(0);

    // --- Web Sensor API Logic ---
    if ('LinearAccelerationSensor' in window) {
        const sensor = new LinearAccelerationSensor({ frequency: 60 });

        sensor.addEventListener('reading', () => {
            // WALKING DETECTION
            if (sensor.y > 12) {
                isWalking = true;
                stepCount++;
                // Use scene reference here
                scene.time.delayedCall(500, () => { isWalking = false; });
            }

            // ATTACK DETECTION
            let totalForce = Math.abs(sensor.x) + Math.abs(sensor.y) + Math.abs(sensor.z);
            if (totalForce > 18) {
                performAttack(scene);
            }
        });
        sensor.start();
    } else {
        uiText.setText('Sensor Error: Use Chrome on Android with HTTPS');
    }
}

function update() {
    let formalSteps = Math.floor(stepCount / 10);

    if (isWalking) {
        player.setVelocityY(-100);
        player.anims.play('walk-anim', true);
        currentXP += 0.1; // Slow down XP gain for better balance
        checkLevelUp(this); // Pass scene context
    } else {
        player.setVelocityY(0);
        player.anims.stop();
    }

    uiText.setText(
        `⭐ FitQuest Stats ⭐\n` +
        `---------------------\n` +
        `Level: ${currentLevel}\n` +
        `XP: ${Math.floor(currentXP)} / ${xpNeededForLevelUp}\n` +
        `Steps: ${formalSteps}\n` +
        `Status: ${isWalking ? '🐾 WALKING' : '🧍 STANDING'}`
    );
}

function checkLevelUp(scene) {
    if (currentXP >= xpNeededForLevelUp) {
        currentXP = 0;
        currentLevel += 1;
        xpNeededForLevelUp = Math.floor(xpNeededForLevelUp * 1.5);

        // Visual feedback
        player.setScale(1.5);
        scene.time.delayedCall(500, () => { player.setScale(1); });
    }
}

function performAttack(scene) {
    player.setTint(0xff0000);
    currentXP += 5;
    checkLevelUp(scene);
    scene.time.delayedCall(200, () => { player.clearTint(); });
}
