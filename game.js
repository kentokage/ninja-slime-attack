const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 300 },
            debug: false,
        },
    },
    scene: {
        preload: preload,
        create: create,
        update: update,
    },
};

const game = new Phaser.Game(config);

let player;
let enemies;
let platforms;
let cursors;
let score = 0;
let gameOver = false;
let scoreText;
let healthText;
let health = 100;
let wallClimbCooldown = 0;
let jumps = 0;

function preload() {
    this.load.image("background", "assets/background.jpeg");
    this.load.image("ground", "assets/ground.png");
    this.load.spritesheet("ninja", "assets/ninja.png", {
        frameWidth: 138,
        frameHeight: 130,
    });
    this.load.image("enemy", "assets/slime.png");
    this.load.image("shuriken", "assets/AirShuriken.svg");
}

function create() {
    this.add.image(400, 300, "background");

    platforms = this.physics.add.staticGroup();
    // platforms.create(400, 568, "ground").setScale(2).refreshBody();

    player = this.physics.add.sprite(100, 450, "ninja");
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);
    player.setScale(0.5);

    this.anims.create({
        key: "left",
        frames: this.anims.generateFrameNumbers("ninja", { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1,
    });

    this.anims.create({
        key: "turn",
        frames: [{ key: "ninja", frame: 0 }],
        frameRate: 20,
    });

    this.anims.create({
        key: "right",
        frames: this.anims.generateFrameNumbers("ninja", { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1,
    });

    this.anims.create({
        key: "jump",
        frames: [{ key: "ninja", frame: 1 }],
        frameRate: 20,
    });

    cursors = this.input.keyboard.createCursorKeys();

    enemies = this.physics.add.group();
    createEnemy(this);

    scoreText = this.add.text(16, 16, "Score: 0", {
        fontSize: "32px",
        fill: "#fff",
    });
    healthText = this.add.text(16, 50, "Health: 100", {
        fontSize: "32px",
        fill: "#fff",
    });

    this.physics.add.collider(player, platforms);
    this.physics.add.collider(enemies, platforms);

    this.physics.add.overlap(player, enemies, hitEnemy, null, this);

    // Shuriken throwing
    this.input.keyboard.on("keydown-SPACE", throwShuriken, this);
}

function update() {
    if (gameOver) {
        return;
    }

    if (cursors.left.isDown) {
        player.setVelocityX(-160);
        player.anims.play("left", true);
        player.setFlipX(true);
    } else if (cursors.right.isDown) {
        player.setVelocityX(160);
        player.anims.play("right", true);
        player.setFlipX(false);
    } else {
        player.setVelocityX(0);
        player.anims.play("turn");
    }

    // Reset jumps when touching the ground
    if (player.body.deltaY() > 0 && player.body.onFloor()) {
        jumps = 0;
    }

    // Jump when the up arrow key is pressed, allowing for double jump
    if (Phaser.Input.Keyboard.JustDown(cursors.up)) {
        if (jumps < 2) {
            player.setVelocityY(-330);
            player.anims.play("jump");
            jumps++;
        }
    }

    // Wall climbing
    if (cursors.up.isDown && !player.body.onFloor()) {
        if (
            (player.body.touching.left || player.body.touching.right) &&
            wallClimbCooldown <= 0
        ) {
            player.setVelocityY(-150);
            wallClimbCooldown = 30;
        }
    }

    if (wallClimbCooldown > 0) {
        wallClimbCooldown--;
    }

    // Move enemies towards player
    enemies.children.entries.forEach((enemy) => {
        const angle = Phaser.Math.Angle.Between(
            enemy.x,
            enemy.y,
            player.x,
            player.y
        );
        const velocity = new Phaser.Math.Vector2();
        this.physics.velocityFromRotation(angle, 100, velocity);
        enemy.setVelocity(velocity.x, velocity.y);
    });

    // Spawn new enemies
    if (enemies.countActive(true) === 0) {
        createEnemy(this);
    }
}

function hitEnemy(player, enemy) {
    enemy.disableBody(true, true);
    health -= 10;
    healthText.setText("Health: " + health);

    if (health <= 0) {
        gameOver = true;
        this.physics.pause();
        player.setTint(0xff0000);
        player.anims.play("turn");

        this.add
            .text(400, 300, "Game Over", { fontSize: "64px", fill: "#fff" })
            .setOrigin(0.5);
        this.add
            .text(400, 350, "Click to Restart", {
                fontSize: "32px",
                fill: "#fff",
            })
            .setOrigin(0.5);

        this.input.on("pointerdown", () => {
            health = 100;
            score = 0;
            gameOver = false;
            this.scene.restart();
        });
    } else {
        score += 10;
        scoreText.setText("Score: " + score);
        createEnemy(this);
    }
}

function createEnemy(scene) {
    const x = Phaser.Math.Between(0, 800);
    const enemy = enemies.create(x, 16, "enemy");
    enemy.setBounce(1);
    enemy.setCollideWorldBounds(true);
    enemy.setScale(0.5);
}

function throwShuriken() {
    const shuriken = this.physics.add.image(player.x, player.y, "shuriken");
    shuriken.setScale(0.5);
    const angle = Phaser.Math.Angle.Between(
        player.x,
        player.y,
        this.input.x,
        this.input.y
    );
    this.physics.velocityFromRotation(angle, 400, shuriken.body.velocity);

    this.physics.add.overlap(shuriken, enemies, (shuriken, enemy) => {
        shuriken.destroy();
        enemy.destroy();
        score += 20;
        scoreText.setText("Score: " + score);
        createEnemy(this);
    });

    this.time.delayedCall(1000, () => {
        shuriken.destroy();
    });
}
