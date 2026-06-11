const canvas = document.getElementById('reactor');
const ctx = canvas.getContext('2d');
const graphCanvas = document.getElementById('graph');
const graphCtx = graphCanvas.getContext('2d');

const STEP = CELL + GAP;
canvas.width = COLS * STEP + GAP;
canvas.height = ROWS * STEP + GAP;

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
let turbineMax = 0;
let fanAngle = 0;
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
  document.getElementById('rodValueEven').textContent = '100%';
  document.getElementById('rodSliderOdd').value = 100;
  document.getElementById('rodValueOdd').textContent = '100%';
  rodCurrentAll = 100;
  rodTargetAll = 100;
  document.getElementById('rodSliderAll').value = 100;
  document.getElementById('rodValueAll').textContent = '100%';
  turbineMax = 0;
  document.getElementById('turbineSlider').value = 0;
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
      const rodHeight = Math.floor(((isEven ? rodCurrentEven : rodCurrentOdd) / 100) * ROWS);
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

  const actualRPM = turbineMax > 0 ? Math.max(0, (currentGraphTemp - TURBINE_TEMP_MIN) / (TURBINE_TEMP_MAX - TURBINE_TEMP_MIN)) * turbineMax : 0;
  const fanSpeed = (actualRPM / 100) * TURBINE_FAN_SPEED;

  fctx.clearRect(0, 0, fanCanvas.width, fanCanvas.height);

  fctx.fillStyle = '#555';
  fctx.beginPath();
  fctx.arc(cx, cy, 4, 0, Math.PI * 2);
  fctx.fill();

  const blades = 4;
  fctx.strokeStyle = '#333';
  fctx.lineWidth = 3;
  for (let i = 0; i < blades; i++) {
    const a = fanAngle + (i * Math.PI * 2) / blades;
    fctx.beginPath();
    fctx.moveTo(cx, cy);
    fctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    fctx.stroke();
  }

  fctx.strokeStyle = '#999';
  fctx.lineWidth = 2;
  fctx.beginPath();
  fctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
  fctx.stroke();

  fanAngle += (fanSpeed / 60) * Math.PI * 2;
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
        timers[row][col] = URANIUM_TIMER_MIN + Math.random() * (URANIUM_TIMER_MAX - URANIUM_TIMER_MIN);
        xenonTimer[row][col] = getXenonTimer(waterTemp[row][col]);
        xenonDecay[row][col] = 0;
        neutrons.splice(i, 1);
        continue;
      }

      if (grid[row][col] === 1) {
        grid[row][col] = 0;
        timers[row][col] = URANIUM_TIMER_MIN + Math.random() * (URANIUM_TIMER_MAX - URANIUM_TIMER_MIN);
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

  const turbineRPM = turbineMax > 0 ? Math.max(0, (currentGraphTemp - TURBINE_TEMP_MIN) / (TURBINE_TEMP_MAX - TURBINE_TEMP_MIN)) * turbineMax : 0;
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
          timers[r][c] = URANIUM_TIMER_MIN + Math.random() * (URANIUM_TIMER_MAX - URANIUM_TIMER_MIN);
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
    const rodHeight = Math.floor(((isEven ? rodCurrentEven : rodCurrentOdd) / 100) * ROWS);
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

  document.getElementById('neutronCount').textContent = 'Neutrons: ' + neutrons.length;
  document.getElementById('avgTemp').textContent = 'Temperature: ' + Math.round(currentGraphTemp) + '°C';

  const displayRPM = turbineMax > 0 ? Math.max(0, (currentGraphTemp - TURBINE_TEMP_MIN) / (TURBINE_TEMP_MAX - TURBINE_TEMP_MIN)) * turbineMax : 0;
  document.getElementById('turbineRPM').textContent = 'RPM: ' + Math.round(displayRPM);
  document.getElementById('turbinePower').textContent = 'Power: ' + Math.round(displayRPM * TURBINE_POWER_FACTOR) + ' MW';

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
    document.getElementById('targetValue').textContent = Math.round(targetValue) + ' MW';
    document.getElementById('currentPowerDisplay').textContent = currentPower + ' MW';
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
  graphCtx.fillText('Neutrons', w - 70, 12);
  graphCtx.fillStyle = '#FF9800';
  graphCtx.fillText('Temp', w - 70, 24);

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
  turbineMax = parseInt(e.target.value);
  document.getElementById('turbineValue').textContent = turbineMax + '%';
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

init();
requestAnimationFrame(loop);
