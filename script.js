const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Variables
let frames = 0;
const DEGREE = Math.PI / 180;

// Load Images
const sprite = new Image();
sprite.src = 'assets/redbird-upflap.png';
const spriteMid = new Image();
spriteMid.src = 'assets/redbird-midflap.png';
const spriteDown = new Image();
spriteDown.src = 'assets/redbird-downflap.png';

// Blue Bird Images
const blueSprite = new Image();
blueSprite.src = 'assets/bluebird-upflap.png';
const blueSpriteMid = new Image();
blueSpriteMid.src = 'assets/bluebird-midflap.png';
const blueSpriteDown = new Image();
blueSpriteDown.src = 'assets/bluebird-downflap.png';

const bgImg = new Image();
bgImg.src = 'assets/background.png';
const pipeImg = new Image();
pipeImg.src = 'assets/pipe-green.png';

// Game State
const state = {
    current: 0,
    getReady: 0,
    game: 1,
    over: 2
}

// Control the game
const startBtn = document.getElementById('restart-btn');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('final-score');

startBtn.addEventListener('click', function () {
    resetGame();
});

document.addEventListener('keydown', function (evt) {
    if (evt.repeat) return;
    if (evt.code !== 'Space') return;

    switch (state.current) {
        case state.getReady:
            state.current = state.game;
            startScreen.classList.remove('active');
            playerBird.flap();
            break;
        case state.game:
            playerBird.flap();
            break;
        case state.over:
            resetGame();
            break;
    }
});

canvas.addEventListener('click', function (evt) {
    switch (state.current) {
        case state.getReady:
            state.current = state.game;
            startScreen.classList.remove('active');
            playerBird.flap();
            break;
        case state.game:
            playerBird.flap();
            break;
    }
});

function resetGame() {
    playerBird.reset();
    aiBird.reset();
    pipes.position = [];
    score.value = 0;
    scoreElement.innerHTML = 0;
    state.current = state.getReady;
    gameOverScreen.classList.remove('active');
    startScreen.classList.add('active');
    frames = 0;
}

// Background
const bg = {
    x: 0,
    y: 0,
    w: 480,
    h: 480,
    dx: 2,

    draw: function () {
        ctx.drawImage(bgImg, this.x, this.y, this.w, this.h);
        ctx.drawImage(bgImg, this.x + this.w, this.y, this.w, this.h);
    },

    update: function () {
        if (state.current == state.game) {
            this.x = (this.x - this.dx) % (this.w);
        }
    }
}

class Bird {
    constructor(sprites, initialY = 150) {
        this.sprites = sprites;
        this.initialY = initialY;
        this.animation = [0, 1, 2, 1];
        this.x = 50;
        this.y = this.initialY;
        this.w = 34;
        this.h = 24;
        this.radius = 12;
        this.frame = 0;
        this.gravity = 0.25;
        this.jump = 4.6;
        this.speed = 0;
        this.rotation = 0;
        this.dead = false;
    }

    draw() {
        if (this.dead && this.y >= canvas.height) return; // Don't draw if dead and off screen

        let birdW = this.w;
        let birdH = this.h;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        let currentSprite = this.sprites[0];
        if (this.animation[this.frame] === 1) currentSprite = this.sprites[1];
        if (this.animation[this.frame] === 2) currentSprite = this.sprites[2];

        ctx.drawImage(currentSprite, -birdW / 2, -birdH / 2, birdW, birdH);
        ctx.restore();
    }

    flap() {
        if (this.dead) return;
        this.speed = -this.jump;
    }

    reset() {
        this.speed = 0;
        this.rotation = 0;
        this.y = this.initialY;
        this.dead = false;
    }

    update() {
        // Animation
        const period = state.current == state.getReady ? 10 : 5;
        this.frame += frames % period == 0 ? 1 : 0;
        this.frame = this.frame % this.animation.length;

        if (state.current == state.getReady) {
            this.y = this.initialY;
            this.rotation = 0 * DEGREE;
        } else {
            if (this.dead) {
                // If dead, just fall
                if (this.y < canvas.height + this.h) {
                    this.speed += this.gravity;
                    this.y += this.speed;
                    this.rotation = 90 * DEGREE;
                }
                return;
            }

            this.speed += this.gravity;
            this.y += this.speed;

            // Floor collision
            if (this.y + this.h / 2 >= canvas.height) {
                this.y = canvas.height - this.h / 2;
                this.die();
            }

            // Rotation logic
            if (this.speed >= this.jump) {
                this.rotation = 90 * DEGREE;
                this.frame = 1;
            } else {
                this.rotation = -25 * DEGREE;
            }
        }
    }

    die() {
        this.dead = true;
    }
}

class AIBird extends Bird {
    constructor(sprites, initialY = 150) {
        super(sprites, initialY);
    }

    update() {
        super.update();
        if (state.current !== state.game || this.dead) return;

        // AI Logic
        // Find closest pipe that is in front of the bird
        let nextPipe = null;
        for (let i = 0; i < pipes.position.length; i++) {
            let p = pipes.position[i];
            if (p.x + pipes.w > this.x) {
                nextPipe = p;
                break;
            }
        }

        if (nextPipe) {
            let targetY = nextPipe.y + pipes.h + pipes.gap / 2 + 25; // Aim slightly lower
            // Flap if below target
            if (this.y > targetY) {
                this.flap();
            }
        } else {
            // If no pipe, stay in middle
            if (this.y > canvas.height / 2) {
                this.flap();
            }
        }
    }
}

const playerBird = new Bird([sprite, spriteMid, spriteDown], 150);
const aiBird = new AIBird([blueSprite, blueSpriteMid, blueSpriteDown], 180);


// Pipes
const pipes = {
    position: [],

    w: 78,
    h: 480,
    gap: 100,
    dx: 2,

    maxYPos: -210,

    draw: function () {
        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            let topY = p.y;
            let bottomY = p.y + this.h + this.gap;

            // Top pipe
            ctx.save();
            ctx.translate(p.x + this.w / 2, topY + this.h / 2);
            ctx.scale(1, -1);
            ctx.drawImage(pipeImg, -this.w / 2, -this.h / 2, this.w, this.h);
            ctx.restore();

            // Bottom pipe
            ctx.drawImage(pipeImg, p.x, bottomY, this.w, this.h);
        }
    },

    update: function () {
        if (state.current !== state.game) return;

        if (frames % 150 == 0) {
            this.position.push({
                x: canvas.width,
                y: this.maxYPos * (Math.random() + 1)
            });
        }

        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            let bottomPipeY = p.y + this.h + this.gap;

            // Collision Detection
            this.checkCollision(playerBird, p);
            this.checkCollision(aiBird, p);

            // Move pipes
            p.x -= this.dx;

            // Remove pipes that go beyond canvas
            if (p.x + this.w <= 0) {
                this.position.shift();
                score.value += 1;
                scoreElement.innerHTML = score.value;
                score.best = Math.max(score.value, score.best);
                localStorage.setItem("best", score.best);
            }
        }

        // Check if player died to trigger game over
        if (playerBird.dead && state.current == state.game) {
            state.current = state.over;
            gameOverScreen.classList.add('active');
            finalScoreElement.innerHTML = "Score: " + score.value;
        }
    },

    checkCollision: function (bird, p) {
        if (bird.dead) return;

        let bottomPipeY = p.y + this.h + this.gap;

        // Top Pipe
        if (bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + this.w &&
            bird.y + bird.radius > p.y && bird.y - bird.radius < p.y + this.h) {
            bird.die();
        }
        // Bottom Pipe
        if (bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + this.w &&
            bird.y + bird.radius > bottomPipeY && bird.y - bird.radius < bottomPipeY + this.h) {
            bird.die();
        }
    }
}

// Score
const score = {
    best: localStorage.getItem("best") || 0,
    value: 0,

    draw: function () {
    }
}

// Draw
function draw() {
    ctx.fillStyle = "#70c5ce";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    bg.draw();
    pipes.draw();
    playerBird.draw();
    aiBird.draw();
}

// Update
function update() {
    playerBird.update();
    aiBird.update();
    bg.update();
    pipes.update();
}

// Loop
function loop() {
    update();
    draw();
    frames++;

    requestAnimationFrame(loop);
}

loop();
