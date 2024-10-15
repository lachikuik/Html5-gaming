var config = {
    type: Phaser.AUTO,
    width: 900,
    height: 600,
    physics: {
        default: 'arcade'
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

var graphics;
var path;
var blueEnemies;
var redEnemies;
var blackEnemies;
var towers;
var alternateTowers;
var waves;
var add;
var physics;
var core;
var place = false;
var alternatePlace = false;
var attack = false;
var currentEnemies = [];
var resources = 10;
var resourcesText;
var waveText;
var gameOver = false;
var gameOverText;
var addTowerButton

const SPRITE_SIZE = 32;
const ENEMY_SPEED = 1/10000;
const PROJECTILE_SPEED = 1/1000;

class Enemy extends Phaser.GameObjects.Image {
    constructor(scene, image, hp, damage, reward, path) {
        super(scene, 0, 0, image);
        this.follower = { t: 0, vec: new Phaser.Math.Vector2() };
        this.hp = hp;
        this.damage = damage;
        this.reward = reward;
        this.path = path;
    }

    startOnPath() {
        this.follower.t = 0;
        this.path.getPoint(this.follower.t, this.follower.vec);
        this.setPosition(this.follower.vec.x, this.follower.vec.y);
    }

    update(time, delta) {
        this.follower.t += ENEMY_SPEED * delta;
        this.path.getPoint(this.follower.t, this.follower.vec);
        this.setPosition(this.follower.vec.x, this.follower.vec.y);
        if (this.follower.t >= 1) {
            this.setActive(false);
            this.setVisible(false);
            currentEnemies = currentEnemies.filter(x => x != this);
            console.log(currentEnemies);
        }
    }

    receiveDamage(damage){
        this.hp = this.hp - damage;
        if (this.hp <= 0) {
            this.setActive(false);
            this.setVisible(false);
            currentEnemies = currentEnemies.filter(x => x != this);
            console.log(currentEnemies);
            addResources(this.reward);
        }
    }
}

class BlueEnemy extends Enemy {
    constructor(scene, path) {
        super(scene, 'thingBlue', 1, 1, 1, path);
    }
}

class RedEnemy extends Enemy {
    constructor(scene, path) {
        super(scene, 'thingRed', 2, 10, 2, path);
    }
}

class BlackEnemy extends Enemy {
    constructor(scene, path) {
        super(scene, 'thing', 10, 50, 100, path);
    }
}

class Tower extends Phaser.GameObjects.Image {
    constructor(scene, image, fireRate) {
        super(scene, 0, 0, image);
        this.currentFireT = 0;
        this.fireRate = fireRate;
        this.radius = 300;
    }

    place(i, j) {
        this.y = i * 64 + 64/2;
        this.x = j * 64 + 64/2;
    }

    attack(enemy) {
        if (enemy && gameOver != true) {
            var projectile = projectiles.get()
            projectile.attack(this.x, this.y, enemy);
        }
    }

    update(time) {
        if (time > this.currentFireT) {
            this.currentFireT = time + this.fireRate;
            var enemiesInRadius = currentEnemies.filter(enemy => enemy.active && Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y) <= this.radius);
            if (enemiesInRadius.length >= 1) {
                this.attack(enemiesInRadius[0]);
            }
        }
    }
}

class MainTower extends Tower {
    constructor(scene) {
          super(scene, 'snake', 1000);
    }
}

class AlternateTower extends Tower {
    constructor(scene) {
        super(scene, 'snake2', 100);
    }
}

class Projectile extends Phaser.GameObjects.Sprite {
    constructor(scene) {
        super(scene, 0, 0, 'fireball');
        this.lifespan = 0;
        this.damage = 1;
    }

    attack(x, y, enemy) {
        console.log('attack', enemy);
        this.setActive(true);
        this.setVisible(true);
        this.setPosition(x, y);
        this.lifespan = 1000;
        this.projectilePath = add.path(x, y);
        this.projectilePath.lineTo(enemy.x, enemy.y);
        this.follower = { t: 0, vec: new Phaser.Math.Vector2() };
        this.play('fireball_anim');
    }

    update(time, delta) {
        this.follower.t += PROJECTILE_SPEED * delta;
        this.projectilePath.getPoint(this.follower.t, this.follower.vec);
        this.setPosition(this.follower.vec.x, this.follower.vec.y);
        this.lifespan -= delta;

        if (this.lifespan <= 0)
        {
            this.setActive(false);
            this.setVisible(false);
            this.stop('fireball_anim');
        }
    }
}

class Core extends Phaser.GameObjects.Image {
    constructor(scene) {
        super(scene, 0, 0, 'core');
        this.hp = 100;
        this.bar = this.makeBar();
    }

    receiveDamage(damage) {
        this.hp = this.hp - damage;
        this.setValue(this.bar, this.hp);
        if (this.hp <= 0) {
            this.setActive(false);
            this.setVisible(false);
            gameOver = true;
        }
    }

    makeBar() {
        let bar = add.graphics();
        bar.fillStyle(0x800080 , 1);
        bar.fillRect(0, 0, 100, 20);
        bar.x = 750;
        bar.y = 400;
        return bar;
    }

    setValue(bar, percentage) {
        bar.scaleX = percentage / 100;
    }
}

class Wave extends Phaser.GameObjects.Image {
    constructor(scene) {
        super(scene, -200, -200, '');
        this.scene = scene;
        this.enemies = [];
        this.enemyRate = 2000;
        this.nextEnemy = 0;
        this.countdownText = scene.add.text(400, 300, '', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
    }

    update(time, delta) {
        if (attack == true && this.enemies.length > 0 ) {
            if (time > this.nextEnemy)
            {
                var enemyType = this.enemies.pop();
                var enemy;
                switch (enemyType) {
                    case 'blue':
                        enemy = new BlueEnemy(this.scene, path);
                        blueEnemies.add(enemy, true);
                        break;
                    case 'red':
                        enemy = new RedEnemy(this.scene, path);
                        redEnemies.add(enemy, true);
                        break;
                    case 'black':
                        enemy = new BlackEnemy(this.scene, path);
                        blackEnemies.add(enemy, true);
                        break;
                }
                console.log('create', enemy, enemy.active);
                currentEnemies.push(enemy);
                if (enemy)
                {
                    enemy.setActive(true);
                    enemy.setVisible(true);
                    enemy.startOnPath();
                    this.nextEnemy = time + this.enemyRate;
                }
            }
        } else if (attack == true && currentEnemies.length == 0) {
            attack = false;
            this.startCountdown(10);
            this.setActive(false);
        }
    }

    startCountdown(seconds) {
        let count = seconds;
        this.countdownText.setText('New wave in: ' + count);

        const countdownInterval = setInterval(() => {
            count--;
            this.countdownText.setText('New wave in: ' + count);
            if (count <= 0) {
                clearInterval(countdownInterval);
                this.countdownText.setText('');
                this.nextWave();
            }
        }, 1000);
    }
}

function preload ()
{
    this.load.image('snake', './assets/snake');
    this.load.image('snake2', './assets/snake2')
    this.load.image('cursorSnake', './assets/cursorSnake');
    this.load.image('background', './assets/background2');
    this.load.image('thing', './assets/thing');
    this.load.image('thingRed', './assets/thing_red');
    this.load.image('thingBlue', './assets/thing_blue');
    this.load.image('core', './assets/core');
    this.load.image('projectile1', './assets/fireball/FB500-1');
    this.load.image('projectile2', './assets/fireball/FB500-2');
    this.load.image('projectile3', './assets/fireball/FB500-3');
    this.load.image('projectile4', './assets/fireball/FB500-4');
    this.load.image('projectile5', './assets/fireball/FB500-5');
}

function placeCore() {
    var c = core.get();
    c.setActive(true);
    c.setVisible(true);
    c.x = 800;
    c.y = 300;
}

function create ()
{
    add = this.add;
    physics = this.physics;
    this.add.image(450, 300, 'background');
    var graphics = this.add.graphics();
    path = this.add.path(-SPRITE_SIZE, 300);
    path.lineTo(250, 300);
    path.lineTo(250, 150);
    path.lineTo(600, 150);
    path.lineTo(600, 300);
    path.lineTo(900 + SPRITE_SIZE, 300);

    graphics.lineStyle(3, 0xffffff, 1);
    path.draw(graphics);

    var startButton = this.add.text(450, 300, 'Start', { fontSize: '32px', fill: '#0f0' }).setOrigin(0.5);
    startButton.setInteractive();
    startButton.on('pointerup', () => {
        startGame();
        startButton.destroy();
    });


    blackEnemies = this.physics.add.group({ classType: BlackEnemy, runChildUpdate: true });
    blueEnemies = this.physics.add.group({ classType: BlueEnemy, runChildUpdate: true });
    redEnemies = this.physics.add.group({ classType: RedEnemy, runChildUpdate: true });
    towers = this.add.group({ classType: MainTower, runChildUpdate: true });
    alternateTowers = this.add.group({ classType: AlternateTower, runChildUpdate: true });
    projectiles = this.physics.add.group({ classType: Projectile, runChildUpdate: true });
    core = this.physics.add.group({ classType: Core, runChildUpdate: true });
    waves = this.add.group({ classType: Wave, runChildUpdate: true });
    resourcesText = this.add.text(16, 16, 'resources: 10', { fontSize: '32px', fill: '#000' });

    setupEnemyGroup(blueEnemies);
    setupEnemyGroup(redEnemies);
    setupEnemyGroup(blackEnemies);

    this.input.on('pointerdown', (pointer) => {
        if(place == true){
            placeTower(pointer);
            this.input.setDefaultCursor('default');
            place = false;
            alternatePlace = false;
        }
        else if ( alternatePlace == true) {
            placeAlternateTower(pointer);
            this.input.setDefaultCursor('default');
            alternatePlace = false;
            place = false;
        }
    });

    addTowerButton = this.add.text(16, 95, 'Add Tower (cost 5 ressources)', { fontSize: '32px', fill: '#00f' }).setInteractive();
    addTowerButton.on('pointerup', () => {
        place = true;
        this.input.setDefaultCursor('url(./assets/cursorSnake.png), pointer');
    });

    addAlternateTowerButton = this.add.text(16, 55, 'Add RapidFireTower (cost 5 ressources)', { fontSize: '32px', fill: '#00f' }).setInteractive();
    addAlternateTowerButton.on('pointerup', () => {
        alternatePlace = true;
        this.input.setDefaultCursor('url(./assets/cursorSnake.png), pointer');
    });

    placeCore();

    attack = true;
    this.anims.create({
        key: 'fireball_anim',
        frames: [
            { key: 'projectile1' },
            { key: 'projectile2' },
            { key: 'projectile3' },
            { key: 'projectile4' },
            { key: 'projectile5' }
        ],
        frameRate: 10,
        repeat: -1
    });
}

function startGame() {
    console.log("Game Started!");
    wave1 = waves.get();
    wave1.enemies = [
        'blue',
        'blue',
        'blue',
        'blue',
        'blue'
    ];
    wave1.nextWave = () => {
        wave2 = waves.get();
        wave2.setActive(true);
        wave2.enemies = [
            'red',
            'red',
            'blue',
            'blue',
            'blue'
        ];
        attack = true;
        wave2.nextWave = () => {
            wave3 = waves.get();
            wave3.setActive(true);
            wave3.enemies = [
                'black',
                'red',
                'red',
                'red',
                'red',
                'blue',
                'blue',
                'blue'
            ];
            attack = true;
            wave3.nextWave = () => {
                gameOverText = this.add.text(400 , 300, 'Victory', { fontSize: '32px', fill: '#fff' })
                const retryButton = this.add.text(450, 400, 'Retry!', { fill: '#0f0' });
                retryButton.setInteractive();
                retryButton.on('pointerdown', () => {  location.reload(); })
            }
        }
        
    };
    attack = true;
}

function setupEnemyGroup(enemyGroup) {
    physics.add.overlap(enemyGroup, projectiles, enemyDamaging);
    physics.add.overlap(core, enemyGroup, coreDamaging);
}

function update(time, delta) {
    if (gameOver == true) {
        gameOverText = this.add.text(400 , 300, 'GAME OVER', { fontSize: '32px', fill: '#fff' })
        const retryButton = this.add.text(450, 400, 'Retry!', { fill: '#0f0' });
        retryButton.setInteractive();
        retryButton.on('pointerdown', () => {  location.reload(); })
    }
}

function placeTower(pointer) {
    if (resources >= 5 && gameOver != true) {
        var i = Math.floor(pointer.y/64);
        var j = Math.floor(pointer.x/64);
        var tower = towers.get();
        tower.setActive(true);
        tower.setVisible(true);
        tower.place(i, j);
        addResources(-5);
    }
}

function placeAlternateTower(pointer) {
    if (resources >= 5 && gameOver != true) {
        var i = Math.floor(pointer.y/64);
        var j = Math.floor(pointer.x/64);
        var tower = alternateTowers.get();
        tower.setActive(true);
        tower.setVisible(true);
        tower.place(i, j);
        addResources(-5);
    }
}

function coreDamaging(target, enemy){
    if (target.active === true && enemy.active === true) {
        enemy.setActive(false);
        enemy.setVisible(false);
        target.receiveDamage(enemy.damage);
        currentEnemies = currentEnemies.filter(x => x != enemy);
        console.log(currentEnemies);
    }
}

function enemyDamaging(target, projectile){
    if (target.active === true && projectile.active === true) {
        projectile.setActive(false);
        projectile.setVisible(false);
        target.receiveDamage(projectile.damage);
    }
}

function addResources(amount){
    resources += amount;
    resourcesText.setText('resources: ' + resources);
}