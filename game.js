let player;
let enemy;

let speed = 0;

let enemyHP = 100;

let motionEnabled = false;

const SETTINGS = {

    moveThreshold: 2.2,
    attackThreshold: 7,

    accelerationGain: 0.3,

    maxSpeed: 6,

    friction: 0.92
};

const gameState = {

    moveX: 0,
    moveY: 0,

    touchActive: false,

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

    // PLAYER
    player = this.add.rectangle(
        120,
        window.innerHeight / 2,
        60,
        60,
        0x00ff66
    );

    // ENEMY
    enemy = this.add.rectangle(
        window.innerWidth - 120,
        window.innerHeight / 2,
        60,
        60,
        0xff3333
    );

    // STATUS TEXT
    this.statusText = this.add.text(
        20,
        20,
        "Move with touch",
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

    // TOUCH CONTROLS
    this.input.on("pointerdown", pointer => {

        gameState.touchActive = true;

        updateTouchDirection(pointer);
    });

    this.input.on("pointermove", pointer => {

        if (!gameState.touchActive) return;

        updateTouchDirection(pointer);
    });

    this.input.on("pointerup", () => {

        gameState.touchActive = false;

        gameState.moveX = 0;
        gameState.moveY = 0;
    });

    // DEVICE MOTION
    window.addEventListener(
        "devicemotion",
        handleMotion,
        true
    );
}

function update() {

    // FRICTION
    speed *= SETTINGS.friction;

    if (speed < 0.05) {
        speed = 0;
    }

    // PLAYER MOVEMENT
    player.x += gameState.moveX * speed;
    player.y += gameState.moveY * speed;

    // BOUNDS
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

    // UI
    game.scene.scenes[0].statusText.setText(
        "Speed: " + speed.toFixed(2)
    );
}

function updateTouchDirection(pointer) {

    const dx = pointer.x - player.x;
    const dy = pointer.y - player.y;

    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return;

    // NORMALIZED DIRECTION
    gameState.moveX = dx / length;
    gameState.moveY = dy / length;
}

function handleMotion(event) {

    if (!motionEnabled) return;

    let accel =
        event.acceleration ||
        event.accelerationIncludingGravity;

    if (!accel) return;

    const x = accel.x || 0;
    const y = accel.y || 0;
    const z = accel.z || 0;

    // VECTOR MAGNITUDE
    const magnitude = Math.sqrt(
        x*x +
        y*y +
        z*z
    );

    // IGNORE SENSOR NOISE
    if (magnitude < 1.2) return;

    console.log("Motion:", magnitude);

    // SPEED BOOST
    if (magnitude > SETTINGS.moveThreshold) {

        speed +=
            (magnitude - SETTINGS.moveThreshold)
            * SETTINGS.accelerationGain;

        speed = Math.min(
            speed,
            SETTINGS.maxSpeed
        );
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

    const distance =
        Phaser.Math.Distance.Between(
            player.x,
            player.y,
            enemy.x,
            enemy.y
        );

    // TOO FAR
    if (distance > 120) {
        return;
    }

    enemyHP -= 20;

    enemyHP = Math.max(enemyHP, 0);

    game.scene.scenes[0].hpText.setText(
        "Enemy HP: " + enemyHP
    );

    // FLASH EFFECT
    enemy.fillColor = 0xffffff;

    setTimeout(() => {

        enemy.fillColor = 0xff3333;

    }, 100);

    // WIN
    if (enemyHP <= 0) {

        game.scene.scenes[0].statusText.setText(
            "🏆 ENEMY DEFEATED!"
        );
    }
}

async function startMotion() {

    // iPhone motion permission
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
