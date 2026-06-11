// ========================================
// SETTINGS — edit these values to change behavior
// НАСТРОЙКИ — изменяйте эти значения для настройки поведения
// ========================================

// --- Grid / Сетка ---
const ROWS = 20;                           // grid height (rows) / высота сетки (строки)
const NUM_SECTORS = 8;                     // number of sectors (1 sector = 20×5) / количество секций (1 секция = 20×5)
const SECTOR_COLS = 5;                     // columns per sector / колонок на секцию
const COLS = NUM_SECTORS * SECTOR_COLS;    // total columns (auto-computed) / всего колонок (вычисляется автоматически)
const CELL = 12;                           // cell size in pixels / размер клетки в пикселях
const GAP = 1.2;                           // gap between cells / расстояние между клетками

// --- Control Rods / Управляющие стержни ---
const ROD_SPEED = 10;                       // rod movement speed (% per second) / скорость движения стержня (% в секунду)
const ROD_WIDTH = 4;                       // rod width in pixels (thin line) / ширина стержня в пикселях (тонкая линия)

// --- Neutrons / Нейтроны ---
const NEUTRON_SPEED = 1;                   // base neutron speed (px/frame) / базовая скорость нейтрона (пикс/кадр)
const NEUTRON_RADIUS = 3;                  // neutron size (px) / размер нейтрона (px)

// --- Sector Spawning / Спавн по секциям ---
const SECTOR_NEUTRON_MIN = 1000;           // min ms between neutron spawns per sector / мин. мс между спавном нейтронов в секции
const SECTOR_NEUTRON_MAX = 2000;          // max ms between neutron spawns per sector / макс. мс между спавном нейтронов в секции

// --- Sector Speed / Скорость секции (чем больше урана — тем медленнее) ---
const SECTOR_SPEED_MAX = 2.0;              // speed multiplier at 0 uranium / множитель скорости при 0 урана
const SECTOR_SPEED_MIN = 0.5;              // speed multiplier at max uranium / множитель скорости при макс. урана
const SECTOR_URANIUM_NORMAL = 5;           // uranium count for normal speed (1.0) / количество урана для нормальной скорости
const SECTOR_URANIUM_MAX = 10;             // uranium count for minimum speed / количество урана для мин. скорости

// --- Auto Control / Автоуправление ---
const AUTO_TEMP_BASE = 24;                 // base temperature (all rods up) / базовая температура (стержни подняты)
const AUTO_TEMP_MID = 150;                  // even rods fully down / чётные стержни полностью опущены
const AUTO_TEMP_HIGH = 200;                // odd rods fully down / нечётные стержни полностью опущены

// --- Turbine / Турбина ---
const TURBINE_TEMP_MIN = 30;               // min temp for turbine to spin / мин. температура для работы турбины
const TURBINE_TEMP_MAX = 100;              // max temp for full power / макс. температура для полной мощности
const TURBINE_POWER_FACTOR = 15;          // MW per 1% RPM / МВт на 1% оборотов
const TURBINE_COOL_MAX = 0.2;              // max cooling from turbine (°C/sec) at 100% / макс. охлаждение от турбины (°C/сек) при 100%
const TURBINE_FAN_SPEED = 2;              // fan rotations per second at 100% / оборотов вентилятора в секунду при 100%
const TURBINE_FAN_SIZE = 60;               // fan diameter in pixels / диаметр вентилятора в пикселях

// --- Scoring / Очки ---
const ROUND_DURATION = 60000;              // ms per round / длительность раунда (мс)
const SCORE_PERFECT = 20;                 // points/sec at <5% error / очков/сек при <5% ошибки
const SCORE_MAX = 10;                     // max points/sec at 5% error / макс. очков/сек при 5% ошибки
const SCORE_MIN = 1;                      // min points/sec at 15% error / мин. очков/сек при 15% ошибки
const ERROR_PERFECT = 5;                  // % for "Идеально" / % для "Идеально"
const ERROR_GOOD = 15;                    // % for "Хорошо" (max) / % для "Хорошо" (макс)
const ROUND_TARGETS = [
  { min: 800, max: 1000 },               // Round 1 / Раунд 1
  { min: 1000, max: 1200 },              // Round 2 / Раунд 2
  { min: 400, max: 600 }                 // Round 3 / Раунд 3
];

// --- Uranium / Fission / Уран / Деление ---
const FISSION_NEUTRONS = 3;                // neutrons released per fission / нейтронов при делении
const FISSION_HEAT_BONUS = 20;
           // heat added at fission site (%) / тепло на месте деления (%)
const URANIUM_TIMER_MIN = 2000;            // min ms for spent fuel → uranium / мин. мс от отработанного топлива до урана
const URANIUM_TIMER_MAX = 20000;           // max ms for spent fuel → uranium / макс. мс от отработанного топлива до урана
const URANIUM_SPAWN_MIN = 500;            // min ms for gray cell → uranium on init / мин. мс от серой клетки до урана при старте
const URANIUM_SPAWN_MAX = 40000;          // max ms for gray cell → uranium on init / макс. мс от серой клетки до урана при старте

// --- Water / Вода ---
const WATER_HEAT_PER_NEUTRON = 1.2;          // temperature gain per neutron pass (%) / нагрев за проход нейтрона (%)
const WATER_COOL_RATE = 0.020;             // temperature loss per frame (%) / охлаждение за кадр (%)
const WATER_BOOST_MAX = 0.40;              // max timer reduction at 100% temp / макс. ускорение таймера при 100% температуры
const WATER_DIFFUSION_RATE = 2;          // heat diffusion rate (higher = faster spread) / скорость распределения тепла (выше = быстрее)

// --- Colors / Цвета ---
const COLOR_BG = '#d0d0d0';               // canvas background / фон холста
const COLOR_URANIUM = '#1976D2';           // uranium-235 (blue) / уран-235 (синий)
const COLOR_SPENT = '#999';                // spent fuel (gray) / отработанное топливо (серый)
const COLOR_ROD = '#333';                  // control rods (dark gray) / управляющие стержни (тёмно-серый)
const COLOR_NEUTRON = '#000';              // neutrons (black) / нейтроны (чёрный)
const COLOR_XENON = '#1a1a1a';             // xenon-135 (dark black) / ксенон-135 (тёмно-чёрный)
const COLOR_WATER_COLD = [79, 195, 247];   // water cold (light blue RGB) / холодная вода (голубой RGB)
const COLOR_WATER_HOT = [244, 67, 54];     // water hot (red RGB) / горячая вода (красный RGB)

// --- Xenon-135 / Ксенон-135 ---
const XENON_DECAY_TIME = 10000;            // ms before Xenon decays / мс до распада ксенона
const XENON_CHANCE_MAX = 70;               // % chance at 0°C / шанс появления при 0°C
const XENON_CHANCE_MIN = 0;               // % chance at 100°C / шанс появления при 100°C
const XENON_TIMER_MIN = 500;              // ms at 100°C (faster) / мс при 100°C (быстрее)
const XENON_TIMER_MAX = 4000;              // ms at 0°C (slower) / мс при 0°C (медленнее)

// ========================================
// END OF SETTINGS
// КОНЕЦ НАСТРОЕК
// ========================================
