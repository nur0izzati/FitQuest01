let player;
let enemy;
let speed = 0;

let enemyHP = 100;

let motionEnabled = false;

const SETTINGS = {
    moveThreshold: 2.2,
    attackThreshold: 7,
    maxSpeed: 5,
    friction: 0.92,
    accelerationGain: 0.35
};

const gameState = {
    directionX: 0,
    directionY: 0,
    lastAttack: 0
};

const config = {
    type: Phaser.AUTO,

    width: window.innerWidth,
    height: window.innerHeight,

    backgroundColor: "#111",

    scene: {
        preload,
        create,
        update
    }
};

const game = new Phaser.Game(config);

function preload() {

}

function create() {

    // Player
    player = this.add.rectangle(
        120,
        window.innerHeight / 2,
        60,
        60,
        0x00ff66
    );

    // Enemy
    enemy = this.add.rectangle(
        window.innerWidth - 120,
        window.innerHeight / 2,
        60,
        60,
        0xff3333
    );

    // Text
    this.statusText = this.add.text(
        20,
        20,
        "Waiting for movement...",
        {
            fontSize: "20px",
            color: "#ffffff"
        }
    );

    this.hpText = this.add.text(
        20,
        50,
        "Enemy HP: 100",
        {
            fontSize: "20px",
            color: "#ff6666"
        }
    );

    // Keyboard fallback
    this.cursors = this.input.keyboard.createCursorKeys();

    // Motion listener
    window.addEventListener(
        "devicemotion",
        handleMotion,
        true
    );
}

function update() {

    // Keyboard fallback for PC testing
    gameState.directionX = 0;
    gameState.directionY = 0;

    if (this.cursors.left.isDown) {
        gameState.directionX = -1;
    }

    if (this.cursors.right.isDown) {
        gameState.directionX = 1;
    }

    if (this.cursors.up.isDown) {
        gameState.directionY = -1;
    }

    if (this.cursors.down.isDown) {
        gameState.directionY = 1;
    }

    // Apply friction
    speed *= SETTINGS.friction;

    // Stop tiny floating movement
    if (speed < 0.05) {
        speed = 0;
    }

    // Move player
    player.x += gameState.directionX * speed;
    player.y += gameState.directionY * speed;

    // Keep inside screen
    player.x = Phaser.Math.Clamp(
        player.x,
        30,
        window.innerWidth - 30
    );

    player.y = Phaser.Math.Clamp(
        player.y,
        30,
        window.innerHeight - 30
    );
}

function handleMotion(event) {

    if (!motionEnabled) return;

    // IMPORTANT:
    // Use acceleration WITHOUT gravity first
    let accel =
        event.acceleration ||
        event.accelerationIncludingGravity;

    if (!accel) return;

    const x = accel.x || 0;
    const y = accel.y || 0;
    const z = accel.z || 0;

    // Motion magnitude
    const magnitude = Math.sqrt(
        x * x +
        y * y +
        z * z
    );

    console.log("Motion:", magnitude);

    // Ignore tiny sensor noise
    if (magnitude < 1.2) {
        return;
    }

    // MOVEMENT
    if (magnitude > SETTINGS.moveThreshold) {

        speed +=
            (magnitude - SETTINGS.moveThreshold)
            * SETTINGS.accelerationGain;

        speed = Math.min(
            speed,
            SETTINGS.maxSpeed
        );

        // Auto-forward movement
        // (You can replace with joystick later)
        gameState.directionX = 1;
    }

    // ATTACK
    if (magnitude > SETTINGS.attackThreshold) {

        const now = Date.now();

        if (now - gameState.lastAttack > 500) {

            gameState.lastAttack = now;

            attackEnemy();
        }
    }
}

function attackEnemy() {

    const distance = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        enemy.x,
        enemy.y
    );

    // Must be close enough
    if (distance > 120) {
        return;
    }

    enemyHP -= 20;

    enemyHP = Math.max(enemyHP, 0);

    game.scene.scenes[0].hpText.setText(
        "Enemy HP: " + enemyHP
    );

    enemy.fillColor = 0xffffff;

    setTimeout(() => {
        enemy.fillColor = 0xff3333;
    }, 100);

    if (enemyHP <= 0) {

        game.scene.scenes[0].statusText.setText(
            "🏆 ENEMY DEFEATED!"
        );
    }
}

async function startMotion() {

    // iPhone permission
    if (
        typeof DeviceMotionEvent !== "undefined" &&
        typeof DeviceMotionEvent.requestPermission === "function"
    ) {

        try {

            const permission =
                await DeviceMotionEvent.requestPermission();

            if (permission !== "granted") {
                alert("Motion permission denied");
                return;
            }

        } catch (err) {

            console.error(err);
        }
    }

    motionEnabled = true;

    document
        .getElementById("start-overlay")
        .style.display = "none";
}
