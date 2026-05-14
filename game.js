// --- Game Configuration ---
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

let player;
let isWalking = false;
let stepCount = 0;
let currentLevel = 1;
let currentXP = 0;
let xpNeededForLevelUp = 100;
let uiText;
let lastShake = 0;

function preload() {
    // Character asset
    this.load.spritesheet('hero', 'https://labs.phaser.io/assets/sprites/dude.png', {
        frameWidth: 32,
        frameHeight: 48
    });
}

function create() {
    const scene = this;

    // Add Player
    player = this.physics.add.sprite(window.innerWidth / 2, window.innerHeight / 2, 'hero');
    player.setCollideWorldBounds(true);

    // Animations
    this.anims.create({
        key: 'walk-anim',
        frames: this.anims.generateFrameNumbers('hero', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    // UI Panel
    uiText = this.add.text(20, 20, 'Tap Screen to Enable Motion', {
        fontSize: '18px',
        fill: '#ffffff',
        backgroundColor: '#ff66b2',
        padding: { x: 10, y: 10 }
    }).setScrollFactor(0).setInteractive();

    // SENSOR LOGIC (From your working prototype)
    this.input.on('pointerdown', () => {
        if (typeof DeviceMotionEvent.requestPermission === "function") {
            DeviceMotionEvent.requestPermission().then(response => {
                if (response === "granted") {
                    window.addEventListener("devicemotion", handleMotion);
                    uiText.setText("Motion Enabled!");
                }
            });
        } else {
            window.addEventListener("devicemotion", handleMotion);
            uiText.setText("Motion Enabled!");
        }
    });
}

// Logic to translate phone movement to Phaser variables
function handleMotion(event) {
    let acc = event.accelerationIncludingGravity;
    if (!acc) return;

    let force = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);

    // Walking detection
    if (force > 12) {
        isWalking = true;
        stepCount++;
    } else {
        isWalking = false;
    }

    // Shake attack detection
    let now = Date.now();
    if (force > 25 && (now - lastShake > 1000)) {
        lastShake = now;
        // We'll call a function to tint the player red
        player.setTint(0xff0000);
        currentXP += 10;
    }
}

function update() {
    // Movement Logic
    if (isWalking) {
        player.setVelocityY(-150); // Moves character UP the screen
        player.anims.play('walk-anim', true);
        currentXP += 0.05;
    } else {
        player.setVelocityY(0);
        player.anims.stop();
        // Clear red tint slowly after an attack
        if (player.isTinted) {
            player.clearTint();
        }
    }

    // Level Up Check
    if (currentXP >= xpNeededForLevelUp) {
        currentLevel++;
        currentXP = 0;
        xpNeededForLevelUp *= 1.2;
        player.setScale(player.scale + 0.1); // Character grows!
    }

    // Update Text
    uiText.setText(
        `⭐ FitQuest ⭐\n` +
        `Level: ${currentLevel}\n` +
        `XP: ${Math.floor(currentXP)} / ${Math.floor(xpNeededForLevelUp)}\n` +
        `Status: ${isWalking ? '🐾 WALKING' : '🧍 STANDING'}`
    );
}
