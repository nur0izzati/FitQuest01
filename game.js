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
let cursors; // For keyboard testing
let uiText;
let stepCount = 0;

function preload() {
    // Change the URL here to your GitHub path after uploading
    this.load.spritesheet('hero', 'https://labs.phaser.io/assets/sprites/dude.png', {
        frameWidth: 32,
        frameHeight: 48
    });
}

function create() {
    const scene = this;

    // Create Keyboard Controls
    cursors = this.input.keyboard.createCursorKeys();

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

    this.anims.create({
        key: 'idle',
        frames: [ { key: 'hero', frame: 4 } ],
        frameRate: 20
    });

    uiText = this.add.text(20, 20, 'Tap Screen to Start Sensors', {
        fontSize: '18px', fill: '#ffffff', backgroundColor: '#ff66b2', padding: { x: 10, y: 10 }
    });

    // START SENSOR ON TAP (Required by many browsers)
    this.input.on('pointerdown', () => {
        if ('LinearAccelerationSensor' in window) {
            const sensor = new LinearAccelerationSensor({ frequency: 60 });
            sensor.addEventListener('reading', () => {
                if (sensor.y > 12) {
                    isWalking = true;
                    stepCount++;
                    scene.time.delayedCall(500, () => { isWalking = false; });
                }
            });
            sensor.start();
            uiText.setText('Sensor Active! Walk or use Arrows');
        }
    });
}

function update() {
    // RESET VELOCITY EVERY FRAME
    player.setVelocity(0);

    // LOGIC: If Walking (Sensor) OR Pressing Up (Keyboard)
    if (isWalking || cursors.up.isDown) {
        player.setVelocityY(-150); // Move Up
        player.anims.play('walk-anim', true);
    }
    else if (cursors.down.isDown) {
        player.setVelocityY(150); // Move Down
        player.anims.play('walk-anim', true);
    }
    else {
        player.anims.play('idle');
    }

    // Update UI
    uiText.setText(`Steps: ${Math.floor(stepCount/10)}\nStatus: ${player.body.speed > 0 ? 'MOVING' : 'IDLE'}`);
}

function checkLevelUp(scene) {
    if (currentXP >= xpNeededForLevelUp) {
        currentXP = 0;
        currentLevel += 1;
        xpNeededForLevelUp = Math.floor(xpNeededForLevelUp * 1.5);

        // Feedback: Player grows temporarily
        player.setScale(1.5);
        scene.time.delayedCall(500, () => { player.setScale(1); });

        // Save progress to Firebase
        if (typeof savePlayerData === "function") {
            savePlayerData(Math.floor(stepCount/10), currentLevel, currentXP);
        }
    }
}

function performAttack(scene) {
    player.setTint(0xff0000); // Turns red when attacking
    currentXP += 5;
    checkLevelUp(scene);
    scene.time.delayedCall(200, () => { player.clearTint(); });
}
