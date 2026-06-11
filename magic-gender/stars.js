// stars.js - Звёздный фон без движения курсора

const STAR_COLOR = '#fff';
const STAR_SIZE = 2;
const STAR_MIN_SCALE = 0.2;
const STAR_COUNT = 600; // Фиксированное количество звёзд

const canvas = document.createElement('canvas');
canvas.id = 'starsCanvas';
document.body.insertBefore(canvas, document.body.firstChild);

const context = canvas.getContext('2d');

let scale = 1;
let width, height;
let stars = [];
let twinkle = 0;
let twinkleDirection = 0.005;
let starOffsetX = 0;
let targetOffsetX = 0;
let isAnimating = false;
let starFlowDirection = -1; // -1 = влево, 1 = вправо
let baseOffset = 0;

function generate() {
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: 0,
            y: 0,
            z: STAR_MIN_SCALE + Math.random() * (1 - STAR_MIN_SCALE),
            twinkleSpeed: 0.002 + Math.random() * 0.008,
            twinklePhase: Math.random() * Math.PI * 2
        });
    }
}

function placeStar(star) {
    star.x = Math.random() * width;
    star.y = Math.random() * height;
}

function resize() {
    scale = window.devicePixelRatio || 1;
    width = window.innerWidth * scale;
    height = window.innerHeight * scale;

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none'; // Чтобы клики проходили сквозь canvas
    canvas.style.zIndex = '0';

    stars.forEach(placeStar);
}

function update() {
    // Лёгкое мерцание
    twinkle += twinkleDirection;
    if (twinkle >= 1 || twinkle <= 0) {
        twinkleDirection *= -1;
    }

    // Постоянное движение звёзд в зависимости от пола (бесконечное)
    baseOffset += 0.5 * starFlowDirection;

    // Анимация смещения звёзд (при смене пола)
    if (isAnimating) {
        const easing = 0.02;
        starOffsetX += (targetOffsetX - starOffsetX) * easing;

        if (Math.abs(targetOffsetX - starOffsetX) < 0.5) {
            starOffsetX = targetOffsetX;
            isAnimating = false;
        }
    }
}

function render() {
    context.clearRect(0, 0, width, height);

    stars.forEach((star) => {
        // Индивидуальное мерцание для каждой звезды
        const individualTwinkle = 0.5 + 0.5 * Math.sin(Date.now() * star.twinkleSpeed + star.twinklePhase);
        const alpha = 0.3 + individualTwinkle * 0.5;

        // 3D-перспектива: звезды дальше движутся меньше
        const depthFactor = star.z;
        const shift = (starOffsetX + baseOffset * depthFactor) * 0.3;
        const wrappedX = ((star.x + shift) % width + width) % width;

        context.beginPath();
        context.arc(wrappedX, star.y, STAR_SIZE * star.z * scale, 0, Math.PI * 2);        context.fillStyle = STAR_COLOR;
        context.globalAlpha = alpha;
        context.fill();
    });
}

function step() {
    update();
    render();
    requestAnimationFrame(step);
}

// Инициализация
generate();
resize();
step();

// Адаптация при изменении размера окна
window.addEventListener('resize', resize);

// Экспорт функций для script.js
window.starsAnimation = {
    triggerToRight: () => {
        targetOffsetX = 150;
        starFlowDirection = 1;
        isAnimating = true;
    },
    triggerToLeft: () => {
        targetOffsetX = -150;
        starFlowDirection = -1;
        isAnimating = true;
    },
    reset: () => {
        targetOffsetX = 0;
        isAnimating = true;
    }
};
