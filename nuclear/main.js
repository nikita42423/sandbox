const canvas = document.getElementById('reactor');
const ctx = canvas.getContext('2d');
const graphCanvas = document.getElementById('graph');
const graphCtx = graphCanvas.getContext('2d');

const STEP = CELL + GAP;
canvas.width = COLS * STEP + GAP;
canvas.height = ROWS * STEP + GAP;

graphCanvas.width = canvas.width;
graphCanvas.height = 150;

const GRAPH_MAX_POINTS = 1200; // 20 sec at 60fps
const GRAPH_PADDING = 40;

const ROD_POSITIONS = [];
for (let i = 1; i < NUM_SECTORS; i++) {
  ROD_POSITIONS.push(i * SECTOR_COLS);
}

let grid = [];
let timers = [];
let waterTemp = [];
let xenonTimer = [];
let xenonDecay = [];
let neutrons = [];
let rodTargetEven = 0;
let rodCurrentEven = 0;
let rodTargetOdd = 0;
let rodCurrentOdd = 0;
let rodTargetAll = 100;
let rodCurrentAll = 100;
let sectors = [];
let neutronHistory = [];
let tempHistory = [];
let frameCount = 0;
let currentGraphTemp = 24;
let autoMode = false;
let turbineTarget = 0;
let turbineCurrent = 0;
let turbineBroken = false;
let rodsBroken = false;
let fanAngle = 0;
let neutronSphereAngle = 0;
let currentRound = 0;
let targetValue = 800;
let roundTimer = ROUND_DURATION;
let score = 0;
let scorePerSec = 0;
let gameOver = false;
let lastTime = 0;

function getSectorForCol(col) {
  return Math.floor(col / SECTOR_COLS);
}

function getRandomTarget() {
  const t = ROUND_TARGETS[currentRound];
  return t.min + Math.random() * (t.max - t.min);
}

function getChanceXenon(temp) {
  return XENON_CHANCE_MAX - (temp / 100) * (XENON_CHANCE_MAX - XENON_CHANCE_MIN);
}

function getXenonTimer(temp) {
  return XENON_TIMER_MAX - (temp / 100) * (XENON_TIMER_MAX - XENON_TIMER_MIN);
}

function getSectorSpeedMultiplier(uraniumCount) {
  if (uraniumCount <= SECTOR_URANIUM_NORMAL) {
    return SECTOR_SPEED_MAX - (uraniumCount / SECTOR_URANIUM_NORMAL) * (SECTOR_SPEED_MAX - 1.0);
  } else if (uraniumCount <= SECTOR_URANIUM_MAX) {
    return 1.0 - ((uraniumCount - SECTOR_URANIUM_NORMAL) / (SECTOR_URANIUM_MAX - SECTOR_URANIUM_NORMAL)) * (1.0 - SECTOR_SPEED_MIN);
  } else {
    return SECTOR_SPEED_MIN;
  }
}

function init() {
  grid = [];
  timers = [];
  waterTemp = [];
  xenonTimer = [];
  xenonDecay = [];
  neutrons = [];
  sectors = [];
  neutronHistory = [];
  tempHistory = [];
  frameCount = 0;
  rodCurrentEven = 100;
  rodTargetEven = 100;
  rodCurrentOdd = 100;
  rodTargetOdd = 100;
  document.getElementById('rodSliderEven').value = 100;
  document.getElementById('rodSliderEven').disabled = false;
  document.getElementById('rodValueEven').textContent = '100%';
  document.getElementById('rodSliderOdd').value = 100;
  document.getElementById('rodSliderOdd').disabled = false;
  document.getElementById('rodValueOdd').textContent = '100%';
  rodCurrentAll = 100;
  rodTargetAll = 100;
  document.getElementById('rodSliderAll').value = 100;
  document.getElementById('rodSliderAll').disabled = false;
  document.getElementById('rodValueAll').textContent = '100%';
  turbineTarget = 0;
  turbineCurrent = 0;
  turbineBroken = false;
  rodsBroken = false;
  document.getElementById('turbineSlider').value = 0;
  document.getElementById('turbineSlider').disabled = false;
  document.getElementById('turbineValue').textContent = '0%';
  currentRound = 0;
  targetValue = getRandomTarget();
  roundTimer = ROUND_DURATION;
  score = 0;
  scorePerSec = 0;
  gameOver = false;
  document.getElementById('scorePanel').classList.remove('hidden');
  document.getElementById('gameOverModal').classList.add('hidden');

  for (let i = 0; i < NUM_SECTORS; i++) {
    sectors.push({
      startCol: i * SECTOR_COLS,
      endCol: (i + 1) * SECTOR_COLS,
      neutronTimer: SECTOR_NEUTRON_MIN + Math.random() * (SECTOR_NEUTRON_MAX - SECTOR_NEUTRON_MIN),
      uraniumCount: 0
    });
  }

  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    timers[r] = [];
    waterTemp[r] = [];
    xenonTimer[r] = [];
    xenonDecay[r] = [];
    for (let c = 0; c < COLS; c++) {
      waterTemp[r][c] = 0;
      grid[r][c] = 0;
      timers[r][c] = URANIUM_SPAWN_MIN + Math.random() * (URANIUM_SPAWN_MAX - URANIUM_SPAWN_MIN);
      xenonTimer[r][c] = 0;
      xenonDecay[r][c] = 0;
    }
  }

  addNeutron(COLS / 2 * STEP, ROWS / 2 * STEP);
}

function getRodX(pos) {
  return pos * STEP;
}

function isNeutronHitRod(nx, ny, rodIdx) {
  const rodX = getRodX(ROD_POSITIONS[rodIdx]);
  if (Math.abs(nx - rodX) < (ROD_WIDTH + NEUTRON_RADIUS * 2) / 2) {
    const row = Math.floor(ny / STEP);
    if (row >= 0 && row < ROWS) {
      const isEven = (rodIdx + 1) % 2 === 0;
    const rodHeight = ((isEven ? rodCurrentEven : rodCurrentOdd) / 100) * ROWS;
      if (row < rodHeight) {
        return true;
      }
    }
  }
  return false;
}

function addNeutron(x, y) {
  const angle = Math.random() * Math.PI * 2;
  const speed = NEUTRON_SPEED + Math.random();
  neutrons.push({
    x: x,
    y: y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: NEUTRON_RADIUS
  });
}

function showGameOverScreen() {
  document.getElementById('finalScore').textContent = Math.round(score);
  document.getElementById('gameOverModal').classList.remove('hidden');
}

function drawFan() {
  const fanCanvas = document.getElementById('fanCanvas');
  const fctx = fanCanvas.getContext('2d');
  const cx = fanCanvas.width / 2;
  const cy = fanCanvas.height / 2;
  const r = TURBINE_FAN_SIZE / 2 - 5;

  const actualRPM = turbineCurrent > 0 ? Math.max(0, Math.min(1, (currentGraphTemp - TURBINE_TEMP_MIN) / (TURBINE_TEMP_MAX - TURBINE_TEMP_MIN))) * turbineCurrent : 0;
  const fanSpeed = (actualRPM / 100) * TURBINE_FAN_SPEED;

  fctx.clearRect(0, 0, fanCanvas.width, fanCanvas.height);

  fctx.fillStyle = '#888';
  fctx.beginPath();
  fctx.arc(cx, cy, 4, 0, Math.PI * 2);
  fctx.fill();

  const blades = 4;
  fctx.strokeStyle = '#aaa';
  fctx.lineWidth = 3;
  for (let i = 0; i < blades; i++) {
    const a = fanAngle + (i * Math.PI * 2) / blades;
    fctx.beginPath();
    fctx.moveTo(cx, cy);
    fctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    fctx.stroke();
  }

  fctx.strokeStyle = '#555';
  fctx.lineWidth = 2;
  fctx.beginPath();
  fctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
  fctx.stroke();

  fanAngle += (fanSpeed / 60) * Math.PI * 2;
}

function drawNeutronSphere() {
  const c = document.getElementById('neutronSphere');
  const sctx = c.getContext('2d');
  const cx = c.width / 2;
  const cy = c.height / 2;
  const r = 40;

  sctx.clearRect(0, 0, c.width, c.height);

  const grad = sctx.createRadialGradient(cx - 10, cy - 12, 2, cx, cy, r);
  grad.addColorStop(0, '#666');
  grad.addColorStop(0.3, '#333');
  grad.addColorStop(0.7, '#111');
  grad.addColorStop(1, '#000');
  sctx.fillStyle = grad;
  sctx.beginPath();
  sctx.arc(cx, cy, r, 0, Math.PI * 2);
  sctx.fill();

  for (let i = 0; i < 20; i++) {
    const a = neutronSphereAngle + (i * Math.PI * 2) / 20;
    const br = r - 2 + Math.sin(a * 3 + i) * 3 + Math.cos(a * 5 + i * 2) * 2;
    const bx = cx + Math.cos(a) * br;
    const by = cy + Math.sin(a) * br;
    const bg = sctx.createRadialGradient(bx, by, 0, bx, by, 4);
    bg.addColorStop(0, 'rgba(80,80,80,0.4)');
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = bg;
    sctx.beginPath();
    sctx.arc(bx, by, 4, 0, Math.PI * 2);
    sctx.fill();
  }

  const hl = sctx.createRadialGradient(cx - 12, cy - 14, 1, cx - 12, cy - 14, 18);
  hl.addColorStop(0, 'rgba(200,200,200,0.3)');
  hl.addColorStop(1, 'rgba(200,200,200,0)');
  sctx.fillStyle = hl;
  sctx.beginPath();
  sctx.arc(cx - 12, cy - 14, 18, 0, Math.PI * 2);
  sctx.fill();

  for (let i = 0; i < 5; i++) {
    const a = neutronSphereAngle * 0.7 + (i * Math.PI * 2) / 5;
    const pr = r * 0.55 + Math.sin(a * 2) * 6;
    const px = cx + Math.cos(a) * pr;
    const py = cy + Math.sin(a) * pr;
    sctx.fillStyle = 'rgba(40,40,40,0.5)';
    sctx.beginPath();
    sctx.arc(px, py, 1.5, 0, Math.PI * 2);
    sctx.fill();
  }

  neutronSphereAngle += 0.015;
}

function drawTempGauge() {
  const c = document.getElementById('tempGauge');
  const tctx = c.getContext('2d');
  c.height = c.clientHeight;
  const w = c.width;
  const h = c.height;

  tctx.clearRect(0, 0, w, h);

  const barX = 18;
  const barW = 16;
  const barTop = 8;
  const barBot = h - 8;
  const barH = barBot - barTop;

  tctx.fillStyle = '#111';
  tctx.beginPath();
  tctx.roundRect(barX - 2, barTop - 2, barW + 4, barH + 4, 8);
  tctx.fill();

  const maxTemp = 300;
  const fillRatio = Math.min(1, currentGraphTemp / maxTemp);
  const fillH = fillRatio * barH;

  const barGrad = tctx.createLinearGradient(0, barBot, 0, barTop);
  barGrad.addColorStop(0, '#1565C0');
  barGrad.addColorStop(0.2, '#4CAF50');
  barGrad.addColorStop(0.5, '#FFC107');
  barGrad.addColorStop(0.6, '#FF9800');
  barGrad.addColorStop(0.67, '#F44336');
  barGrad.addColorStop(1, '#B71C1C');

  tctx.fillStyle = barGrad;
  tctx.beginPath();
  tctx.roundRect(barX, barBot - fillH, barW, fillH, [0, 0, 6, 6]);
  tctx.fill();

  tctx.strokeStyle = '#555';
  tctx.lineWidth = 2;
  tctx.beginPath();
  tctx.roundRect(barX - 2, barTop - 2, barW + 4, barH + 4, 8);
  tctx.stroke();

  const marks = [
    { temp: 0, color: '#888' },
    { temp: 100, color: '#888' },
    { temp: 180, color: '#FF9800' },
    { temp: 200, color: '#D32F2F' },
    { temp: 300, color: '#888' }
  ];

  tctx.font = '9px monospace';
  tctx.textAlign = 'right';
  for (const m of marks) {
    const my = barBot - (m.temp / maxTemp) * barH;
    tctx.strokeStyle = m.color;
    tctx.lineWidth = 1;
    if (m.temp === 180 || m.temp === 200) {
      tctx.setLineDash([2, 2]);
    } else {
      tctx.setLineDash([]);
    }
    tctx.beginPath();
    tctx.moveTo(barX - 1, my);
    tctx.lineTo(barX + barW + 1, my);
    tctx.stroke();
    tctx.fillStyle = m.color;
    tctx.fillText(m.temp, barX - 4, my + 3);
  }
  tctx.setLineDash([]);

  const tempEl = document.getElementById('avgTemp');
  tempEl.textContent = Math.round(currentGraphTemp) + '°C';
  const warnRow = document.getElementById('tempWarning');
  const warnLabel = document.getElementById('tempWarningLabel');
  if (currentGraphTemp >= 200) {
    tempEl.style.color = '#FF5252';
    tempEl.style.textShadow = '0 0 14px rgba(255,82,82,0.8)';
    tempEl.style.background = 'rgba(255,82,82,0.1)';
    warnRow.className = 'temp-warning-row hidden';
  } else if (currentGraphTemp >= 180) {
    tempEl.style.color = '#FFD54F';
    tempEl.style.textShadow = '0 0 12px rgba(255,213,79,0.7)';
    tempEl.style.background = 'rgba(255,152,0,0.1)';
    warnRow.className = 'temp-warning-row hidden';
  } else {
    tempEl.style.color = '#4FC3F7';
    tempEl.style.textShadow = '0 0 10px rgba(79,195,247,0.6)';
    tempEl.style.background = 'rgba(0,0,0,0.3)';
    warnRow.className = 'temp-warning-row hidden';
    warnLabel.className = 'temp-warning-label hidden';
  }
}

function getUraniumTimer() {
  const min = currentGraphTemp >= 250 ? URANIUM_TIMER_ACCIDENT_MIN : URANIUM_TIMER_MIN;
  const max = currentGraphTemp >= 250 ? URANIUM_TIMER_ACCIDENT_MAX : URANIUM_TIMER_MAX;
  return min + Math.random() * (max - min);
}

function getWaterColor(temp) {
  const t = temp / 100;
  const r = Math.round(COLOR_WATER_COLD[0] + t * (COLOR_WATER_HOT[0] - COLOR_WATER_COLD[0]));
  const g = Math.round(COLOR_WATER_COLD[1] + t * (COLOR_WATER_HOT[1] - COLOR_WATER_COLD[1]));
  const b = Math.round(COLOR_WATER_COLD[2] + t * (COLOR_WATER_HOT[2] - COLOR_WATER_COLD[2]));
  return `rgb(${r},${g},${b})`;
}

function update(dt) {
  const moveStep = ROD_SPEED * dt / 1000;

  if (currentGraphTemp >= 250 && !rodsBroken) {
    rodsBroken = true;
    rodTargetEven = 0;
    rodTargetOdd = 0;
    document.getElementById('rodSliderEven').disabled = true;
    document.getElementById('rodSliderEven').value = 0;
    document.getElementById('rodValueEven').textContent = 'Сломано!';
    document.getElementById('rodSliderOdd').disabled = true;
    document.getElementById('rodSliderOdd').value = 100;
    document.getElementById('rodValueOdd').textContent = 'Сломано!';
    document.getElementById('rodSliderAll').disabled = true;
    document.getElementById('rodSliderAll').value = 0;
    document.getElementById('rodValueAll').textContent = 'Сломано!';
  }
  if (rodsBroken) {
    rodTargetEven = 0;
    rodTargetOdd = 0;
  }

  if (rodTargetEven > rodCurrentEven) {
    rodCurrentEven = Math.min(rodTargetEven, rodCurrentEven + moveStep);
  } else if (rodTargetEven < rodCurrentEven) {
    rodCurrentEven = Math.max(rodTargetEven, rodCurrentEven - moveStep);
  }

  if (rodTargetOdd > rodCurrentOdd) {
    rodCurrentOdd = Math.min(rodTargetOdd, rodCurrentOdd + moveStep);
  } else if (rodTargetOdd < rodCurrentOdd) {
    rodCurrentOdd = Math.max(rodTargetOdd, rodCurrentOdd - moveStep);
  }

  const turbineStep = 10 * dt / 1000;
  if (currentGraphTemp >= 250) {
    turbineBroken = true;
    turbineTarget = 0;
    document.getElementById('turbineSlider').disabled = true;
    document.getElementById('turbineSlider').value = 0;
    document.getElementById('turbineValue').textContent = 'Сломано!';
  }
  if (turbineBroken) {
    turbineTarget = 0;
  }
  if (turbineTarget > turbineCurrent) {
    turbineCurrent = Math.min(turbineTarget, turbineCurrent + turbineStep);
  } else if (turbineTarget < turbineCurrent) {
    turbineCurrent = Math.max(turbineTarget, turbineCurrent - turbineStep);
  }

  if (autoMode) {
    if (currentGraphTemp <= AUTO_TEMP_BASE) {
      rodTargetEven = 0;
      rodTargetOdd = 0;
    } else if (currentGraphTemp <= AUTO_TEMP_MID) {
      rodTargetEven = ((currentGraphTemp - AUTO_TEMP_BASE) / (AUTO_TEMP_MID - AUTO_TEMP_BASE)) * 100;
      rodTargetOdd = 0;
    } else {
      rodTargetEven = 100;
      rodTargetOdd = Math.min(100, ((currentGraphTemp - AUTO_TEMP_MID) / (AUTO_TEMP_HIGH - AUTO_TEMP_MID)) * 100);
    }
  }

  for (const sector of sectors) {
    sector.neutronTimer -= dt;
    if (sector.neutronTimer <= 0) {
      sector.neutronTimer = SECTOR_NEUTRON_MIN + Math.random() * (SECTOR_NEUTRON_MAX - SECTOR_NEUTRON_MIN);
      const sx = (sector.startCol + Math.random() * SECTOR_COLS) * STEP;
      const sy = Math.random() * canvas.height;
      addNeutron(sx, sy);
    }
  }

  for (let i = neutrons.length - 1; i >= 0; i--) {
    const n = neutrons[i];
    n.x += n.vx;
    n.y += n.vy;

    if (n.x < 0 || n.x > canvas.width || n.y < 0 || n.y > canvas.height) {
      neutrons.splice(i, 1);
      continue;
    }

    if (currentGraphTemp < 200) {
      let hitRod = false;
      for (let ri = 0; ri < ROD_POSITIONS.length; ri++) {
        if (isNeutronHitRod(n.x, n.y, ri)) {
          hitRod = true;
          break;
        }
      }
      if (hitRod) {
        neutrons.splice(i, 1);
        continue;
      }
    }

    const col = Math.floor(n.x / STEP);
    const row = Math.floor(n.y / STEP);

    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      if (waterTemp[row][col] < 100) {
        waterTemp[row][col] = Math.min(100, waterTemp[row][col] + WATER_HEAT_PER_NEUTRON);
      }

      if (grid[row][col] === 2) {
        grid[row][col] = 0;
        timers[row][col] = getUraniumTimer();
        xenonTimer[row][col] = getXenonTimer(waterTemp[row][col]);
        xenonDecay[row][col] = 0;
        neutrons.splice(i, 1);
        continue;
      }

      if (grid[row][col] === 1) {
        grid[row][col] = 0;
        timers[row][col] = getUraniumTimer();
        xenonTimer[row][col] = getXenonTimer(waterTemp[row][col]);
        xenonDecay[row][col] = 0;
        waterTemp[row][col] = Math.min(100, waterTemp[row][col] + FISSION_HEAT_BONUS);
        neutrons.splice(i, 1);
        for (let k = 0; k < FISSION_NEUTRONS; k++) {
          addNeutron(col * STEP + STEP / 2, row * STEP + STEP / 2);
        }
        continue;
      }
    }
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (waterTemp[r][c] > 0) {
        waterTemp[r][c] = Math.max(0, waterTemp[r][c] - WATER_COOL_RATE);
      }
    }
  }

  const turbineRPM = turbineCurrent > 0 ? Math.max(0, Math.min(1, (currentGraphTemp - TURBINE_TEMP_MIN) / (TURBINE_TEMP_MAX - TURBINE_TEMP_MIN))) * turbineCurrent : 0;
  const turbineCool = (turbineRPM / 100) * TURBINE_COOL_MAX;
  if (turbineCool > 0) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        waterTemp[r][c] = Math.max(0, waterTemp[r][c] - turbineCool);
      }
    }
  }

  if (!gameOver) {
    roundTimer -= dt;
    if (roundTimer <= 0) {
      currentRound++;
      if (currentRound >= 3) {
        gameOver = true;
        showGameOverScreen();
      } else {
        roundTimer = ROUND_DURATION;
        targetValue = getRandomTarget();
      }
    }

    const currentPower = Math.round(turbineRPM * TURBINE_POWER_FACTOR);
    const error = targetValue > 0 ? Math.abs(currentPower - targetValue) / targetValue * 100 : 999;

    if (error < ERROR_PERFECT) {
      scorePerSec = SCORE_PERFECT;
    } else if (error < ERROR_GOOD) {
      scorePerSec = SCORE_MAX - ((error - ERROR_PERFECT) / (ERROR_GOOD - ERROR_PERFECT)) * (SCORE_MAX - SCORE_MIN);
    } else {
      scorePerSec = 0;
    }
    score += scorePerSec * dt / 1000;
  }

  const newTemp = waterTemp.map(row => [...row]);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const neighbors = [];
      if (c < COLS - 1) neighbors.push([r, c + 1]);
      if (r < ROWS - 1) neighbors.push([r + 1, c]);

      for (const [nr, nc] of neighbors) {
        const diff = waterTemp[r][c] - waterTemp[nr][nc];
        if (Math.abs(diff) < 0.01) continue;

        const avg = (waterTemp[r][c] + waterTemp[nr][nc]) / 2;
        const rate = WATER_DIFFUSION_RATE * (avg / 100);
        const transfer = diff * rate * dt / 1000;

        newTemp[r][c] -= transfer;
        newTemp[nr][nc] += transfer;
      }
    }
  }
  waterTemp = newTemp;

  for (const sector of sectors) {
    sector.uraniumCount = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = sector.startCol; c < sector.endCol; c++) {
        if (grid[r][c] === 1) {
          sector.uraniumCount++;
        }
      }
    }
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === 2 && xenonDecay[r][c] > 0) {
        xenonDecay[r][c] -= dt;
        if (xenonDecay[r][c] <= 0) {
          grid[r][c] = 0;
          timers[r][c] = getUraniumTimer();
          xenonTimer[r][c] = getXenonTimer(waterTemp[r][c]);
          xenonDecay[r][c] = 0;
        }
      }

      if (grid[r][c] === 0 && timers[r][c] > 0) {
        if (xenonTimer[r][c] > 0) {
          xenonTimer[r][c] -= dt;
          if (xenonTimer[r][c] <= 0) {
            xenonTimer[r][c] = 0;
            const chance = getChanceXenon(waterTemp[r][c]);
            if (Math.random() * 100 < chance) {
              grid[r][c] = 2;
              timers[r][c] = 0;
              xenonDecay[r][c] = XENON_DECAY_TIME;
              continue;
            }
          }
        }

        const tempFactor = 1 / (1 - (waterTemp[r][c] / 100) * WATER_BOOST_MAX);
        const sectorIdx = getSectorForCol(c);
        const speedMult = getSectorSpeedMultiplier(sectors[sectorIdx].uraniumCount);
        timers[r][c] -= dt * tempFactor * speedMult;
        if (timers[r][c] <= 0) {
          timers[r][c] = 0;
          grid[r][c] = 1;
          xenonTimer[r][c] = 0;
        }
      }
    }
  }
}

function draw() {
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = getWaterColor(waterTemp[r][c]);
      ctx.fillRect(c * STEP + GAP / 2, r * STEP + GAP / 2, CELL, CELL);
    }
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * STEP + STEP / 2;
      const y = r * STEP + STEP / 2;

      if (grid[r][c] === 1) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = COLOR_URANIUM;
        ctx.fill();
      } else if (grid[r][c] === 2) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = COLOR_XENON;
        ctx.fill();
      } else if (timers[r][c] > 0) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = COLOR_SPENT;
        ctx.fill();
      }
    }
  }

  ctx.fillStyle = COLOR_ROD;
  for (let ri = 0; ri < ROD_POSITIONS.length; ri++) {
    const rodX = getRodX(ROD_POSITIONS[ri]);
    const isEven = (ri + 1) % 2 === 0;
    const rodHeight = ((isEven ? rodCurrentEven : rodCurrentOdd) / 100) * ROWS;
    ctx.fillRect(rodX - ROD_WIDTH / 2, 0, ROD_WIDTH, rodHeight * STEP);
  }

  for (const n of neutrons) {
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_NEUTRON;
    ctx.fill();
  }
}

function drawGraph() {
  const w = graphCanvas.width;
  const h = graphCanvas.height;

  graphCtx.fillStyle = '#1a1a2e';
  graphCtx.fillRect(0, 0, w, h);

  graphCtx.strokeStyle = '#333';
  graphCtx.lineWidth = 1;
  graphCtx.beginPath();
  graphCtx.moveTo(GRAPH_PADDING, 0);
  graphCtx.lineTo(GRAPH_PADDING, h);
  graphCtx.stroke();

  const totalTemp = waterTemp.reduce((sum, row) => sum + row.reduce((s, v) => s + v, 0), 0);
  const avgTemp = totalTemp / (ROWS * COLS);

  const graphTemp = (avgTemp + (neutrons.length / NUM_SECTORS) * 0.1) * 3;
  currentGraphTemp = Math.max(24, graphTemp);

  const warningEl = document.getElementById('warning');
  if (currentGraphTemp >= 200) {
    warningEl.textContent = '☢ Авария ☢';
    warningEl.className = 'warning accident';
  } else if (currentGraphTemp >= 180) {
    warningEl.textContent = '⚠️ Опасность ⚠️';
    warningEl.className = 'warning danger';
  } else {
    warningEl.className = 'warning hidden';
  }

  document.getElementById('neutronCount').textContent = neutrons.length;

  const mobileNeutronsEl = document.getElementById('mobileNeutrons');
  const mobileTempEl = document.getElementById('mobileTemp');
  if (mobileNeutronsEl) mobileNeutronsEl.textContent = neutrons.length;
  if (mobileTempEl) mobileTempEl.textContent = Math.round(currentGraphTemp) + '°C';

  const displayRPM = turbineCurrent > 0 ? Math.max(0, Math.min(1, (currentGraphTemp - TURBINE_TEMP_MIN) / (TURBINE_TEMP_MAX - TURBINE_TEMP_MIN))) * turbineCurrent : 0;
  document.getElementById('turbineRPM').textContent = 'Об/мин: ' + Math.round(displayRPM * 15);
  document.getElementById('turbinePower').textContent = 'Мощность: ' + Math.round(displayRPM * TURBINE_POWER_FACTOR) + ' МВт';
  document.getElementById('turbinePercent').textContent = 'Мощность турбины: ' + Math.round(displayRPM) + '%';

  if (!gameOver) {
    const currentPower = Math.round(displayRPM * TURBINE_POWER_FACTOR);
    const error = targetValue > 0 ? Math.abs(currentPower - targetValue) / targetValue * 100 : 999;

    const statusEl = document.getElementById('scoreStatus');
    if (error < ERROR_PERFECT) {
      statusEl.textContent = 'Идеально';
      statusEl.className = 'score-status perfect';
    } else if (error < ERROR_GOOD) {
      statusEl.textContent = 'Хорошо';
      statusEl.className = 'score-status good';
    } else {
      statusEl.textContent = 'Плохо';
      statusEl.className = 'score-status bad';
    }

    document.getElementById('roundDisplay').textContent = (currentRound + 1) + '/3';
    document.getElementById('roundTimerDisplay').textContent = Math.ceil(roundTimer / 1000);
    document.getElementById('targetValue').textContent = Math.round(targetValue) + ' МВт';
    document.getElementById('currentPowerDisplay').textContent = currentPower + ' МВт';
    document.getElementById('scoreDisplay').textContent = Math.round(score);
  }

  neutronHistory.push(neutrons.length);
  tempHistory.push(currentGraphTemp);

  if (neutronHistory.length > GRAPH_MAX_POINTS) neutronHistory.shift();
  if (tempHistory.length > GRAPH_MAX_POINTS) tempHistory.shift();

  const currentNeutrons = neutrons.length;
  const maxNeutronVal = Math.max(100, ...neutronHistory);
  const maxTempVal = Math.max(100, ...tempHistory);
  const maxVal = Math.max(maxNeutronVal, maxTempVal);

  const plotW = w - GRAPH_PADDING - 10;
  const plotH = h - 20;
  const stepX = plotW / (GRAPH_MAX_POINTS - 1);

  graphCtx.font = '10px monospace';
  graphCtx.fillStyle = '#888';
  graphCtx.textAlign = 'right';
  graphCtx.fillText(Math.round(maxVal), GRAPH_PADDING - 5, 12);
  graphCtx.fillText('0', GRAPH_PADDING - 5, plotH + 5);

  graphCtx.textAlign = 'left';
  graphCtx.fillStyle = '#4FC3F7';
  graphCtx.fillText('Нейтроны', w - 70, 12);
  graphCtx.fillStyle = '#FF9800';
  graphCtx.fillText('Темп.', w - 70, 24);

  if (neutronHistory.length > 1) {
    graphCtx.beginPath();
    graphCtx.strokeStyle = '#4FC3F7';
    graphCtx.lineWidth = 1.5;
    for (let i = 0; i < neutronHistory.length; i++) {
      const x = GRAPH_PADDING + i * stepX;
      const y = plotH - (neutronHistory[i] / maxVal) * (plotH - 10) + 5;
      if (i === 0) graphCtx.moveTo(x, y);
      else graphCtx.lineTo(x, y);
    }
    graphCtx.stroke();
  }

  if (tempHistory.length > 1) {
    graphCtx.beginPath();
    graphCtx.strokeStyle = '#FF9800';
    graphCtx.lineWidth = 1.5;
    for (let i = 0; i < tempHistory.length; i++) {
      const x = GRAPH_PADDING + i * stepX;
      const y = plotH - (tempHistory[i] / maxVal) * (plotH - 10) + 5;
      if (i === 0) graphCtx.moveTo(x, y);
      else graphCtx.lineTo(x, y);
    }
    graphCtx.stroke();
  }
}

function loop(timestamp) {
  if (lastTime === 0) lastTime = timestamp;
  const dt = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;
  update(dt);
  draw();
  drawGraph();
  drawFan();
  drawNeutronSphere();
  drawTempGauge();
  frameCount++;
  requestAnimationFrame(loop);
}

document.getElementById('reset').addEventListener('click', () => {
  autoMode = false;
  document.getElementById('autoBtn').classList.remove('active');
  init();
});

document.getElementById('autoBtn').addEventListener('click', () => {
  autoMode = !autoMode;
  document.getElementById('autoBtn').classList.toggle('active', autoMode);
});

document.getElementById('rodSliderEven').addEventListener('input', (e) => {
  rodTargetEven = parseInt(e.target.value);
  document.getElementById('rodValueEven').textContent = rodTargetEven + '%';
});

document.getElementById('rodSliderOdd').addEventListener('input', (e) => {
  rodTargetOdd = parseInt(e.target.value);
  document.getElementById('rodValueOdd').textContent = rodTargetOdd + '%';
});

document.getElementById('rodSliderAll').addEventListener('input', (e) => {
  const val = parseInt(e.target.value);
  rodTargetEven = val;
  rodTargetOdd = val;
  document.getElementById('rodValueAll').textContent = val + '%';
  document.getElementById('rodSliderEven').value = val;
  document.getElementById('rodValueEven').textContent = val + '%';
  document.getElementById('rodSliderOdd').value = val;
  document.getElementById('rodValueOdd').textContent = val + '%';
});

document.getElementById('turbineSlider').addEventListener('input', (e) => {
  turbineTarget = parseInt(e.target.value);
  document.getElementById('turbineValue').textContent = turbineTarget + '%';
});

document.getElementById('btnContinue').addEventListener('click', () => {
  document.getElementById('gameOverModal').classList.add('hidden');
  document.getElementById('scorePanel').classList.add('hidden');
  gameOver = false;
  currentRound = 0;
  roundTimer = ROUND_DURATION;
  targetValue = getRandomTarget();
  score = 0;
});

document.getElementById('btnFinish').addEventListener('click', () => {
  document.getElementById('gameOverModal').classList.add('hidden');
  init();
});

document.getElementById('helpToggle').addEventListener('click', () => {
  document.getElementById('helpPanel').classList.toggle('hidden');
});

document.getElementById('helpClose').addEventListener('click', () => {
  document.getElementById('helpPanel').classList.add('hidden');
});

document.getElementById('settingsToggle').addEventListener('click', () => {
  document.getElementById('settingsPanel').classList.toggle('hidden');
});

document.getElementById('settingsClose').addEventListener('click', () => {
  document.getElementById('settingsPanel').classList.add('hidden');
});

document.getElementById('leftColSlider').addEventListener('input', (e) => {
  const left = parseInt(e.target.value);
  const right = 90 - left;
  document.getElementById('leftColValue').textContent = left + '%';
  document.querySelector('.left-panel').style.flex = '0 0 ' + left + '%';
  document.querySelector('.right-panel').style.flex = '0 0 ' + right + '%';
});

init();
requestAnimationFrame(loop);
