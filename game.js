// Minimalna szerokość: mały iPhone SE w poziomie (~568px)
const GAME_WIDTH = 568;
const GAME_HEIGHT = 320;

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#1a1a1a',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    pixelArt: true,
    roundPixels: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        min: {
            width: 480,
            height: 270
        },
        max: {
            width: 1920,
            height: 1080
        }
    },
    input: {
        activePointers: 3
    }
};

const game = new Phaser.Game(config);

let player;
let cursors;
let spaceKey;
let isAttacking = false;
let touchLeft, touchRight, touchJump, touchAttack;

function preload() {
    this.load.image('idle', 'assets/sprites/idle_side.png');
    this.load.image('run1', 'assets/sprites/run_1.png');
    this.load.image('run2', 'assets/sprites/run_2.png');
    this.load.image('run3', 'assets/sprites/run_3.png');
    this.load.image('jump', 'assets/sprites/jump.png');
    this.load.image('attack', 'assets/sprites/attack.png');
}

function create() {
    // Ziemia
    const ground = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 20, GAME_WIDTH, 40, 0x333333);
    this.physics.add.existing(ground, true);

    // Gracz
    player = this.physics.add.sprite(120, 200, 'idle');
    player.setScale(0.22);
    player.setCollideWorldBounds(true);
    player.body.setSize(player.width * 0.45, player.height * 0.7);

    this.physics.add.collider(player, ground);

    // Klawiatura
    cursors = this.input.keyboard.createCursorKeys();
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Animacje
    this.anims.create({
        key: 'run',
        frames: [{ key: 'run1' }, { key: 'run2' }, { key: 'run3' }],
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({ key: 'idle', frames: [{ key: 'idle' }], frameRate: 1 });
    this.anims.create({ key: 'jump', frames: [{ key: 'jump' }], frameRate: 1 });
    this.anims.create({ key: 'attack', frames: [{ key: 'attack' }], frameRate: 8, repeat: 0 });

    // Przyciski dotykowe (dla telefonu)
    createTouchControls.call(this);
}

function createTouchControls() {
    const btnSize = 70;
    const margin = 20;

    // Lewo
    touchLeft = this.add.circle(margin + btnSize / 2, GAME_HEIGHT - margin - btnSize / 2, btnSize / 2, 0x000000, 0.4)
        .setInteractive()
        .setScrollFactor(0)
        .setDepth(100);
    this.add.text(touchLeft.x, touchLeft.y, '◀', { fontSize: '32px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    // Prawo
    touchRight = this.add.circle(margin + btnSize + 20 + btnSize / 2, GAME_HEIGHT - margin - btnSize / 2, btnSize / 2, 0x000000, 0.4)
        .setInteractive()
        .setScrollFactor(0)
        .setDepth(100);
    this.add.text(touchRight.x, touchRight.y, '▶', { fontSize: '32px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    // Skok
    touchJump = this.add.circle(GAME_WIDTH - margin - btnSize / 2, GAME_HEIGHT - margin - btnSize / 2, btnSize / 2, 0x000000, 0.4)
        .setInteractive()
        .setScrollFactor(0)
        .setDepth(100);
    this.add.text(touchJump.x, touchJump.y, '↑', { fontSize: '32px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    // Atak
    touchAttack = this.add.circle(GAME_WIDTH - margin - btnSize - 20 - btnSize / 2, GAME_HEIGHT - margin - btnSize / 2, btnSize / 2, 0x000000, 0.4)
        .setInteractive()
        .setScrollFactor(0)
        .setDepth(100);
    this.add.text(touchAttack.x, touchAttack.y, '⚔', { fontSize: '28px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
}

function update() {
    if (!player) return;

    const onGround = player.body.touching.down;
    let movingLeft = cursors.left.isDown;
    let movingRight = cursors.right.isDown;
    let jumping = Phaser.Input.Keyboard.JustDown(spaceKey);

    // Dotyk
    if (touchLeft && this.input.activePointer.isDown) {
        const pointers = this.input.manager.pointers;
        pointers.forEach(p => {
            if (p.isDown) {
                if (Phaser.Geom.Circle.Contains(touchLeft.getBounds(), p.x, p.y) || 
                    (p.x < GAME_WIDTH * 0.3 && p.y > GAME_HEIGHT * 0.6)) movingLeft = true;
                if (Phaser.Geom.Circle.Contains(touchRight.getBounds(), p.x, p.y) || 
                    (p.x > GAME_WIDTH * 0.3 && p.x < GAME_WIDTH * 0.5 && p.y > GAME_HEIGHT * 0.6)) movingRight = true;
                if (Phaser.Geom.Circle.Contains(touchJump.getBounds(), p.x, p.y) || 
                    (p.x > GAME_WIDTH * 0.7 && p.y > GAME_HEIGHT * 0.6)) jumping = true;
            }
        });
    }

    // Ruch
    if (movingLeft) {
        player.setVelocityX(-140);
        player.setFlipX(true);
        if (onGround && !isAttacking) player.anims.play('run', true);
    } else if (movingRight) {
        player.setVelocityX(140);
        player.setFlipX(false);
        if (onGround && !isAttacking) player.anims.play('run', true);
    } else {
        player.setVelocityX(0);
        if (onGround && !isAttacking) player.anims.play('idle', true);
    }

    // Skok
    if (jumping && onGround && !isAttacking) {
        player.setVelocityY(-280);
        player.anims.play('jump', true);
    }
}
