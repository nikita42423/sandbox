// Получаем элементы
const genderIcon = document.getElementById('genderIcon');
const toggleBtn = document.getElementById('toggleBtn');
const body = document.body;

// Состояние
let isWoman = false;
let isMoving = false;
let animationFrame = null;
let floatFrame = null;
let glowFrame = null;
let floatOffset = 0;

// Определяем устройство
const isMobile = window.innerWidth <= 768;

// Позиции
const LEFT_POS = -500;
const RIGHT_POS = 500;
const TOP_POS = -300;    // Для телефона (сверху)
const BOTTOM_POS = 300;   // Для телефона (снизу)

// Текущая позиция
let currentX = isMobile ? TOP_POS : LEFT_POS;
let targetX = isMobile ? TOP_POS : LEFT_POS;

// Параметры плавности
const SMOOTHING_FACTOR = 0.06;

// Функция плавного перемещения
function animateMovement(timestamp) {
    if (!isMoving) return;

    const diff = targetX - currentX;
    if (Math.abs(diff) < 0.2) {
        currentX = targetX;
        isMoving = false;
        updatePosition();
        return;
    }

    currentX += diff * SMOOTHING_FACTOR;
    updatePosition();

    animationFrame = requestAnimationFrame(animateMovement);
}

// Обновление позиции иконки
function updatePosition() {
    if (isMobile) {
        // Телефон: движение по вертикали
        genderIcon.style.transform = `translate(-50%, calc(-50% + ${currentX}px)) translateY(${floatOffset}px)`;
    } else {
        // Десктоп: движение по горизонтали
        genderIcon.style.transform = `translateX(calc(-50% + ${currentX}px)) translateY(${floatOffset}px)`;
    }
}

// Анимация дыхания
function breathe(timestamp) {
    if (!floatFrame) return;

    const time = Date.now() / 1000;
    floatOffset = Math.sin(time * 1.6) * 10;

    updatePosition();

    floatFrame = requestAnimationFrame(breathe);
}

// Анимация свечения
let glowIntensity = 0.5;
let glowDirection = 0.005;

function animateGlow() {
    if (!genderIcon) return;

    glowIntensity += glowDirection;
    if (glowIntensity >= 1) {
        glowIntensity = 1;
        glowDirection = -0.003;
    } else if (glowIntensity <= 0.1) {
        glowIntensity = 0.1;
        glowDirection = 0.003;
    }

    const intensity = glowIntensity;
    const manColor = `rgba(79, 195, 247, ${0.3 + intensity * 0.3})`;
    const womanColor = `rgba(244, 143, 177, ${0.3 + intensity * 0.3})`;

    if (!isWoman) {
        genderIcon.style.filter = `drop-shadow(0 0 ${10 + intensity * 20}px ${manColor})
                                  drop-shadow(0 0 ${20 + intensity * 30}px ${manColor})`;
    } else {
        genderIcon.style.filter = `drop-shadow(0 0 ${10 + intensity * 20}px ${womanColor})
                                  drop-shadow(0 0 ${20 + intensity * 30}px ${womanColor})`;
    }

    glowFrame = requestAnimationFrame(animateGlow);
}

// Переключение пола
function toggleGender() {
    if (isMoving) return;

    isWoman = !isWoman;

    if (isWoman) {
        genderIcon.classList.add('woman');
        targetX = isMobile ? BOTTOM_POS : RIGHT_POS;
        body.classList.add('woman-bg');
        document.querySelector("link[rel*='icon']").href = './female.svg';
        if (window.starsAnimation) window.starsAnimation.triggerToRight();
    } else {
        genderIcon.classList.remove('woman');
        targetX = isMobile ? TOP_POS : LEFT_POS;
        body.classList.remove('woman-bg');
        document.querySelector("link[rel*='icon']").href = './male.svg';
        if (window.starsAnimation) window.starsAnimation.triggerToLeft();
    }

    isMoving = true;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(animateMovement);
}

// Обновление при изменении ориентации экрана
function handleOrientationChange() {
    const newIsMobile = window.innerWidth <= 768;
    if (newIsMobile !== (currentX === TOP_POS || currentX === BOTTOM_POS)) {
        // Перезагружаем позиции при смене ориентации
        location.reload();
    }
}

// Запускаем все анимации
function init() {
    floatFrame = requestAnimationFrame(breathe);
    animateGlow();
    updatePosition();

    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleGender);
    }

    window.addEventListener('resize', handleOrientationChange);
}

// Стартуем когда страница загрузится
window.addEventListener('DOMContentLoaded', init);
