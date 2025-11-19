const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Variables
let frames = 0;
const DEGREE = Math.PI / 180;

// Load Images
// Load Images
const sprite = new Image();
sprite.src = 'assets/redbird-upflap.png';
const spriteMid = new Image();
spriteMid.src = 'assets/redbird-midflap.png';
const spriteDown = new Image();
spriteDown.src = 'assets/redbird-downflap.png';
const bgImg = new Image();
bgImg.src = 'assets/background.png';
const pipeImg = new Image();
pipeImg.src = 'assets/pipe-green.png'; // User provided asset

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
    if (evt.repeat) return; // Prevent holding key from triggering multiple events

    if (evt.code !== 'Space') return; // Only allow Space key

    switch (state.current) {
        case state.getReady:
            state.current = state.game;
            startScreen.classList.remove('active');
            bird.flap(); // Flap immediately on start
            break;
        case state.game:
            bird.flap();
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
            bird.flap();
            break;
        case state.game:
            bird.flap();
            break;
    }
});

function resetGame() {
    bird.speed = 0;
    bird.rotation = 0;
    bird.y = 150;
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

// Foreground (Ground) - simulating with bottom of canvas for now or part of BG
const fg = {
    h: 112, // Height of ground
    draw: function () {
        // If we had a separate ground image, we'd draw it here.
        // For now, let's assume the background covers it or we just check collision with bottom
    }
}

// Bird
const bird = {
    animation: [0, 1, 2, 1],
    x: 50,
    y: 150,
    w: 34,
    h: 24,

    radius: 12,

    frame: 0,

    gravity: 0.25,
    jump: 4.6,
    speed: 0,
    rotation: 0,

    draw: function () {
        let birdW = this.w;
        let birdH = this.h;

        ctx.save();
        ctx.translate(this.x, this.y);
        // Rotation logic: 
        // If falling (speed > jump), rotate down (positive angle)
        // If jumping (speed < jump), rotate up (negative angle)
        // Since the bird faces right by default (0 degrees), we rotate around that.
        ctx.rotate(this.rotation);

        // Draw the bird centered
        // Select image based on current frame
        let currentSprite = sprite;
        if (this.animation[this.frame] === 1) currentSprite = spriteMid;
        if (this.animation[this.frame] === 2) currentSprite = spriteDown;

        ctx.drawImage(currentSprite, -birdW / 2, -birdH / 2, birdW, birdH);

        ctx.restore();
    },

    flap: function () {
        this.speed = -this.jump;
    },

    update: function () {
        // If the game state is get ready state, the bird must flap slowly
        const period = state.current == state.getReady ? 10 : 5;
        // We increment the frame by 1, each period
        this.frame += frames % period == 0 ? 1 : 0;
        // Frame goes from 0 to 4, then again to 0
        this.frame = this.frame % this.animation.length;

        if (state.current == state.getReady) {
            this.y = 150; // Reset position
            this.rotation = 0 * DEGREE;
        } else {
            this.speed += this.gravity;
            this.y += this.speed;

            if (this.y + this.h / 2 >= canvas.height) {
                this.y = canvas.height - this.h / 2;
                if (state.current == state.game) {
                    state.current = state.over;
                    gameOverScreen.classList.add('active');
                    finalScoreElement.innerHTML = "Score: " + score.value;
                }
            }

            // Rotation logic
            if (this.speed >= this.jump) {
                this.rotation = 90 * DEGREE; // Nose dive
                this.frame = 1;
            } else {
                this.rotation = -25 * DEGREE; // Tilt up
            }
        }
    }
}

// Pipes
const pipes = {
    position: [],

    w: 78, // Scaled to match height ratio (52 * 1.5)
    h: 480, // Match canvas height
    gap: 100,
    dx: 2,

    maxYPos: -210, // Adjusted for new height

    draw: function () {
        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            let topY = p.y;
            let bottomY = p.y + this.h + this.gap;

            // Top pipe
            ctx.save();
            ctx.translate(p.x + this.w / 2, topY + this.h / 2);
            ctx.scale(1, -1); // Flip vertically
            ctx.drawImage(pipeImg, -this.w / 2, -this.h / 2, this.w, this.h);
            ctx.restore();

            // Bottom pipe
            ctx.drawImage(pipeImg, p.x, bottomY, this.w, this.h);
        }
    },

    update: function () {
        if (state.current !== state.game) return;

        // Add new pipe every 150 frames (1.5x distance)
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
            // Top Pipe
            if (bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + this.w &&
                bird.y + bird.radius > p.y && bird.y - bird.radius < p.y + this.h) {
                state.current = state.over;
                gameOverScreen.classList.add('active');
                finalScoreElement.innerHTML = "Score: " + score.value;
            }
            // Bottom Pipe
            if (bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + this.w &&
                bird.y + bird.radius > bottomPipeY && bird.y - bird.radius < bottomPipeY + this.h) {
                state.current = state.over;
                gameOverScreen.classList.add('active');
                finalScoreElement.innerHTML = "Score: " + score.value;
            }

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
    }
}

// Score
const score = {
    best: localStorage.getItem("best") || 0,
    value: 0,

    draw: function () {
        // Score is drawn in HTML overlay
    }
}

// Draw
function draw() {
    ctx.fillStyle = "#70c5ce";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    bg.draw();
    pipes.draw();
    // fg.draw();
    bird.draw();
}

// Update
function update() {
    bird.update();
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
