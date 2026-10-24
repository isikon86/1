(() => {
  const hud = document.getElementById('hud');
  const statNodes = {
    health: document.querySelector('[data-stat="health"]'),
    stamina: document.querySelector('[data-stat="stamina"]'),
    hunger: document.querySelector('[data-stat="hunger"]'),
    thirst: document.querySelector('[data-stat="thirst"]'),
    psychology: document.querySelector('[data-stat="psychology"]'),
    sleep: document.querySelector('[data-stat="sleep"]'),
    temperature: document.querySelector('[data-stat="temperature"]'),
    microphone: document.querySelector('[data-stat="microphone"]')
  };

  const staminaStateNode = document.querySelector('[data-stamina-state]');
  let staminaStateHoldUntil = 0;
  if (staminaStateNode) staminaStateNode.title = 'Стамина не расходуется';

  const fireCanvas = document.querySelector('[data-fire-canvas]');
  const fireCtx = fireCanvas ? fireCanvas.getContext('2d') : null;
  const fire = {
    active: false,
    startedAt: 0,
    frame: 0,
    lastSparkAt: 0,
    particles: [],
    width: 136,
    height: 136
  };

  if (fireCanvas && fireCtx) {
    fireCanvas.width = fire.width;
    fireCanvas.height = fire.height;
  }

  const hungerIconSvg = statNodes.hunger ? statNodes.hunger.querySelector('.icon svg') : null;
  const waterIconSvg = statNodes.thirst ? statNodes.thirst.querySelector('.icon svg') : null;

  const healthCanvas = document.querySelector('[data-health-canvas]');
  const healthCtx = healthCanvas ? healthCanvas.getContext('2d') : null;
  const healthIconSvg = statNodes.health ? statNodes.health.querySelector('.icon svg') : null;
  const healthFx = {
    active: false,
    frame: 0,
    current: 100,
    width: 128,
    height: 128
  };

  if (healthCanvas && healthCtx) {
    healthCanvas.width = healthFx.width;
    healthCanvas.height = healthFx.height;
  }

  const waterCanvas = document.querySelector('[data-water-canvas]');
  const waterCtx = waterCanvas ? waterCanvas.getContext('2d') : null;
  const waterFx = {
    active: false,
    frame: 0,
    current: 100,
    width: 128,
    height: 128,
    lastAt: 0
  };

  if (waterCanvas && waterCtx) {
    waterCanvas.width = waterFx.width;
    waterCanvas.height = waterFx.height;
  }

  const hungerCanvas = document.querySelector('[data-hunger-canvas]');
  const hungerCtx = hungerCanvas ? hungerCanvas.getContext('2d') : null;
  const hungerFx = {
    active: false,
    frame: 0,
    current: 100,
    width: 128,
    height: 128,
    embers: []
  };

  if (hungerCanvas && hungerCtx) {
    hungerCanvas.width = hungerFx.width;
    hungerCanvas.height = hungerFx.height;
  }

  const staminaCanvas = document.querySelector('[data-stamina-canvas]');
  const staminaCtx = staminaCanvas ? staminaCanvas.getContext('2d') : null;
  const staminaFx = {
    active: false,
    frame: 0,
    current: 100,
    lastNumericValue: null,
    lastSampleAt: 0,
    drainRate: 0,
    recoveryRate: 0,
    pulseStartedAt: 0,
    pulseDuration: 0,
    pulseUntil: 0,
    sparks: [],
    width: 144,
    height: 144,
    lastAt: 0,
    cycleStartedAt: 0,
    lastDischargeId: -1
  };

  if (staminaCanvas && staminaCtx) {
    staminaCanvas.width = staminaFx.width;
    staminaCanvas.height = staminaFx.height;
  }

  function setGauge(element, value, needs = false) {
    if (!element) return;
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      element.classList.add('unknown');
      element.style.setProperty('--deg', '0deg');
      return;
    }
    const percent = Math.max(0, Math.min(100, Number(value)));
    element.classList.remove('unknown');
    element.style.setProperty('--deg', `${percent * 3.6}deg`);
    element.classList.toggle('critical', percent <= (needs ? 20 : 15));
  }


  function updateTemperature(data) {
    const node = statNodes.temperature;
    if (!node) return;

    const rawTemperature = data.temperature;
    if (rawTemperature === null || rawTemperature === undefined || !Number.isFinite(Number(rawTemperature))) {
      node.style.setProperty('--deg', '0deg');
      node.classList.remove(
        'temperature-cold', 'temperature-moderate', 'temperature-heat',
        'temperature-active', 'temperature-warning', 'temperature-critical'
      );
      node.classList.add('temperature-unknown');
      node.title = 'Температура окружающего мира недоступна';
      node.setAttribute('aria-label', node.title);
      return;
    }

    const temperature = Number(rawTemperature);
    const coldStart = Number.isFinite(Number(data.coldStart)) ? Number(data.coldStart) : 8;
    const heatStart = Number.isFinite(Number(data.heatStart)) ? Number(data.heatStart) : 28;
    let mode = 'moderate';
    if (temperature < coldStart) mode = 'cold';
    else if (temperature > heatStart) mode = 'heat';

    const severity = mode === 'cold'
      ? Math.max(0, Math.min(100, Number(data.cold) || 0))
      : mode === 'heat'
        ? Math.max(0, Math.min(100, Number(data.heat) || 0))
        : 0;

    node.style.setProperty('--deg', `${severity * 3.6}deg`);
    node.classList.remove('temperature-unknown', 'temperature-cold', 'temperature-moderate', 'temperature-heat');
    node.classList.add(`temperature-${mode}`);
    node.classList.toggle('temperature-active', mode !== 'moderate' && severity > 0);
    node.classList.toggle('temperature-warning', mode !== 'moderate' && severity >= 40 && severity < 99.9);
    node.classList.toggle('temperature-critical', mode !== 'moderate' && severity >= 99.9);

    let status;
    if (mode === 'cold') {
      status = severity >= 99.9 ? 'экстремальный холод' : severity >= 40 ? 'сильный холод' : 'прохладно';
    } else if (mode === 'heat') {
      status = severity >= 99.9 ? 'экстремальная жара' : severity >= 40 ? 'сильная жара' : 'жарко';
    } else {
      status = 'умеренная температура';
    }

    node.title = `${temperature.toFixed(1)}°C · ${status}`;
    node.setAttribute('aria-label', node.title);
  }

  function startHealthFx() {
    if (!healthCanvas || !healthCtx || healthFx.active) return;
    healthFx.active = true;
    statNodes.health.classList.add('health-active');
    healthFx.frame = window.requestAnimationFrame(renderHealthFx);
  }

  function stopHealthFx(force = false) {
    healthFx.active = false;
    if (healthFx.frame) {
      window.cancelAnimationFrame(healthFx.frame);
      healthFx.frame = 0;
    }
    if (healthCtx) healthCtx.clearRect(0, 0, healthFx.width, healthFx.height);
    if (healthIconSvg) {
      healthIconSvg.style.transform = '';
      healthIconSvg.style.filter = '';
    }
    if (force && statNodes.health) {
      statNodes.health.classList.remove('health-active', 'health-low', 'health-critical');
    }
  }

  function updateHealthFx(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      stopHealthFx(true);
      return;
    }

    healthFx.current = Math.max(0, Math.min(100, numeric));

    if (hud.classList.contains('visible')) startHealthFx();
  }

  function pulseShape(t, center, width, amplitude) {
    const x = (t - center) / width;
    return amplitude * Math.exp(-(x * x));
  }

  function renderHealthFx(now) {
    if (!healthFx.active || !healthCanvas || !healthCtx || !statNodes.health) return;

    const ctx = healthCtx;
    const w = healthFx.width;
    const h = healthFx.height;
    const cx = w / 2;
    const cy = h / 2;
    const health = Math.max(0, Math.min(100, healthFx.current));

    // Three intensity bands, but the effect stays in the same visual language.
    const critical = health <= 20;
    const low = health > 20 && health <= 55;
    const normal = health > 55;

    statNodes.health.classList.toggle('health-low', low);
    statNodes.health.classList.toggle('health-critical', critical);
    statNodes.health.classList.toggle('health-active', true);

    const period = critical ? 980 : (low ? 1500 : 2450);
    const t = ((now % period) + period) % period / period;

    // Calm heartbeat at high HP, stronger/double beat at low HP.
    const beatA = pulseShape(t, critical ? 0.16 : 0.20, critical ? 0.06 : 0.08, critical ? 1.10 : (low ? 0.90 : 0.60));
    const beatB = critical
      ? pulseShape(t, 0.34, 0.048, 0.86)
      : low
        ? pulseShape(t, 0.38, 0.060, 0.50)
        : pulseShape(t, 0.40, 0.090, 0.16);

    const beat = Math.min(1.35, beatA + beatB);
    const aura = 0.18 + beat * 0.82;
    const outerTint = critical ? '168, 79, 64' : (low ? '214, 122, 54' : '214, 147, 56');
    const midTint = critical ? '230, 165, 152' : '245, 190, 94';

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Warm living glow from the center.
    const glowRadius = 8 + aura * (critical ? 16 : (low ? 13 : 10));
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    glow.addColorStop(0, `rgba(255, 244, 214, ${0.28 + beat * 0.34})`);
    glow.addColorStop(0.22, `rgba(${midTint}, ${0.18 + beat * 0.36})`);
    glow.addColorStop(0.55, `rgba(${outerTint}, ${0.12 + beat * 0.22})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Short outward heartbeat waves; subtle in normal state, stronger when injured.
    const waveCount = critical ? 2 : 1;
    for (let i = 0; i < waveCount; i++) {
      const delay = i * (critical ? 0.18 : 0.22);
      const wavePhase = ((t - delay) + 1) % 1;
      const active = wavePhase < 0.38;
      if (!active) continue;

      const p = wavePhase / 0.38;
      const radius = 9 + p * (critical ? 19 : (low ? 15 : 11));
      const alpha = (1 - p) * (critical ? 0.52 : (low ? 0.34 : 0.20)) * (0.55 + beat * 0.45);
      ctx.strokeStyle = `rgba(${critical ? '196, 104, 92' : '229, 170, 82'}, ${alpha})`;
      ctx.lineWidth = critical ? 1.8 : (low ? 1.45 : 1.2);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // Pulse the actual heart icon.
    if (healthIconSvg) {
      const scale = critical ? (1 + beat * 0.22) : (low ? (1 + beat * 0.16) : (1 + beat * 0.10));
      const brightA = critical ? 0.50 : (low ? 0.34 : 0.20);
      const brightB = critical ? 0.82 : (low ? 0.52 : 0.30);
      const hotColor = critical ? 'rgba(168,79,64,.55)' : 'rgba(230,158,66,.38)';
      healthIconSvg.style.transform = `scale(${scale.toFixed(3)})`;
      healthIconSvg.style.filter = `drop-shadow(0 0 ${brightA + beat * 1.6}px rgba(255,236,186,.78)) drop-shadow(0 0 ${brightB + beat * 3.8}px ${hotColor})`;
    }

    if (hud.classList.contains('visible')) {
      healthFx.frame = window.requestAnimationFrame(renderHealthFx);
    } else {
      stopHealthFx();
    }
  }


  function startWaterFx() {
    if (!waterCanvas || !waterCtx || waterFx.active) return;
    waterFx.active = true;
    waterFx.lastAt = 0;
    waterCanvas.style.display = 'block';
    waterCanvas.style.opacity = '1';
    waterFx.frame = window.requestAnimationFrame(renderWaterFx);
  }

  function stopWaterFx(force = false) {
    waterFx.active = false;
    if (waterFx.frame) {
      window.cancelAnimationFrame(waterFx.frame);
      waterFx.frame = 0;
    }
    if (waterCtx) waterCtx.clearRect(0, 0, waterFx.width, waterFx.height);
    if (waterIconSvg) {
      waterIconSvg.style.transform = '';
      waterIconSvg.style.filter = '';
    }
    if (force && statNodes.thirst) {
      statNodes.thirst.classList.remove('water-active', 'water-low', 'water-critical');
    }
  }

  function updateWaterFx(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    waterFx.current = Math.max(0, Math.min(100, numeric));
    if (waterFx.current <= 15) {
      statNodes.thirst.classList.add('water-critical');
      statNodes.thirst.classList.remove('water-low');
    } else if (waterFx.current <= 35) {
      statNodes.thirst.classList.add('water-low');
      statNodes.thirst.classList.remove('water-critical');
    } else {
      statNodes.thirst.classList.remove('water-low', 'water-critical');
    }
    if (hud.classList.contains('visible')) startWaterFx();
  }

  function renderWaterFx(now) {
    if (!waterFx.active || !waterCanvas || !waterCtx || !statNodes.thirst) return;

    const ctx = waterCtx;
    const w = waterFx.width;
    const h = waterFx.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = 43;
    const level = Math.max(0, Math.min(100, waterFx.current)) / 100;
    const surfaceY = cy + radius - level * radius * 2;

    // Transparent water: only the moving wave is visible.
    const lowBoost = 1 - level;
    const amp = 2.6 + lowBoost * 3.2;
    const phase = now * 0.00185;
    const phase2 = now * 0.00127 + 1.4;

    const pulse = 0.5 + 0.5 * Math.sin(now * 0.0024);
    const pulseScale = 1 + pulse * (waterFx.current <= 15 ? 0.032 : waterFx.current <= 35 ? 0.024 : 0.014);
    if (waterIconSvg) {
      const glowA = waterFx.current <= 15 ? 0.52 : waterFx.current <= 35 ? 0.34 : 0.20;
      const glowB = waterFx.current <= 15 ? 0.30 : waterFx.current <= 35 ? 0.20 : 0.12;
      waterIconSvg.style.transform = `scale(${pulseScale.toFixed(3)})`;
      waterIconSvg.style.filter =
        `drop-shadow(0 0 ${1.2 + pulse * 1.2}px rgba(247, 232, 198, ${0.52 + glowB})) ` +
        `drop-shadow(0 0 ${2.0 + pulse * 2.2}px rgba(201, 175, 126, ${glowA}))`;
    }
    statNodes.thirst.classList.add('water-active');

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';

    const points = [];
    for (let x = 0; x <= w; x += 2) {
      const wave =
        Math.sin(x * 0.078 + phase) * amp +
        Math.sin(x * 0.046 - phase2) * amp * 0.45;
      points.push({ x, y: surfaceY + wave });
    }

    // Soft outer glow line.
    ctx.beginPath();
    points.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = `rgba(205, 173, 116, ${0.20 + 0.10 * Math.sin(phase * 1.2)})`;
    ctx.lineWidth = 5.2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(201, 175, 126, .22)';
    ctx.stroke();

    // Main bright wave.
    ctx.beginPath();
    points.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = `rgba(245, 233, 204, ${0.88 + 0.08 * Math.sin(phase * 1.55)})`;
    ctx.lineWidth = 2.3;
    ctx.shadowBlur = 7;
    ctx.shadowColor = 'rgba(230, 214, 175, .55)';
    ctx.stroke();

    // Sharp crest highlight on top of the same wave.
    ctx.beginPath();
    points.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y - 0.3);
      else ctx.lineTo(p.x, p.y - 0.3);
    });
    ctx.strokeStyle = `rgba(255, 247, 225, ${0.52 + 0.10 * Math.sin(phase * 2.0)})`;
    ctx.lineWidth = 1.0;
    ctx.shadowBlur = 0;
    ctx.stroke();

    // Tiny moving glints that ride the wave, but no filled water body.
    for (let i = 0; i < 2; i++) {
      const progress = ((now * (0.00016 + i * 0.00005)) + i * 0.33) % 1;
      const gx = 8 + progress * (w - 16);
      const gwave =
        Math.sin(gx * 0.078 + phase) * amp +
        Math.sin(gx * 0.046 - phase2) * amp * 0.45;
      const gy = surfaceY + gwave;
      ctx.beginPath();
      ctx.arc(gx, gy - 0.4, 1.2 + i * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 244, 220, ${0.30 + (1 - i * 0.25) * 0.20})`;
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(255, 240, 210, .42)';
      ctx.fill();
    }

    ctx.restore();

    if (hud.classList.contains('visible')) {
      waterFx.frame = window.requestAnimationFrame(renderWaterFx);
    } else {
      stopWaterFx();
    }
  }

  function startHungerFx() {
    if (!hungerCanvas || !hungerCtx || hungerFx.active) return;
    hungerFx.active = true;
    hungerFx.embers = [];
    hungerCanvas.style.display = 'block';
    hungerCanvas.style.opacity = '1';
    hungerFx.frame = window.requestAnimationFrame(renderHungerFx);
  }

  function stopHungerFx(force = false) {
    hungerFx.active = false;
    if (hungerFx.frame) {
      window.cancelAnimationFrame(hungerFx.frame);
      hungerFx.frame = 0;
    }
    if (hungerCtx) hungerCtx.clearRect(0, 0, hungerFx.width, hungerFx.height);
    hungerFx.embers = [];
    if (hungerIconSvg) {
      hungerIconSvg.style.transform = '';
    }
    if (force && statNodes.hunger) {
      statNodes.hunger.classList.remove('hunger-active', 'hunger-low', 'hunger-critical');
    }
  }

  function updateHungerFx(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    hungerFx.current = Math.max(0, Math.min(100, numeric));

    if (hungerFx.current <= 15) {
      statNodes.hunger.classList.add('hunger-critical');
      statNodes.hunger.classList.remove('hunger-low');
    } else if (hungerFx.current <= 40) {
      statNodes.hunger.classList.add('hunger-low');
      statNodes.hunger.classList.remove('hunger-critical');
    } else {
      statNodes.hunger.classList.remove('hunger-low', 'hunger-critical');
    }

    if (hud.classList.contains('visible')) startHungerFx();
  }

  function spawnHungerEmber(strong = false) {
    const cx = hungerFx.width / 2;
    const cy = hungerFx.height / 2;
    // Embers originate around the food symbol and drift gently upward/outward.
    const angle = rand(-Math.PI * 0.92, -Math.PI * 0.08);
    const radius = rand(5, 13);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius + 4;
    const speed = strong ? rand(0.25, 0.72) : rand(0.12, 0.38);
    hungerFx.embers.push({
      x, y,
      vx: Math.cos(angle) * speed * 0.55 + rand(-0.12, 0.12),
      vy: -speed - rand(0.08, 0.26),
      life: 0,
      maxLife: strong ? rand(500, 900) : rand(360, 720),
      size: strong ? rand(1.8, 2.9) : rand(1.15, 1.95),
      flicker: rand(0, Math.PI * 2),
      hot: Math.random() > 0.45
    });
  }

  function renderHungerFx(now) {
    if (!hungerFx.active || !hungerCanvas || !hungerCtx || !statNodes.hunger) return;

    const ctx = hungerCtx;
    const w = hungerFx.width;
    const h = hungerFx.height;
    const cx = w / 2;
    const cy = h / 2;
    const hunger = Math.max(0, Math.min(100, hungerFx.current));
    const low = hunger <= 40 && hunger > 15;
    const critical = hunger <= 15;

    statNodes.hunger.classList.toggle('hunger-active', true);
    statNodes.hunger.classList.toggle('hunger-low', low);
    statNodes.hunger.classList.toggle('hunger-critical', critical);

    const pulseSpeed = critical ? 0.0064 : (low ? 0.0042 : 0.0026);
    const pulse = 0.5 + 0.5 * Math.sin(now * pulseSpeed);
    const intensity = critical ? 0.86 + pulse * 0.30 : (low ? 0.60 + pulse * 0.32 : 0.34 + pulse * 0.20);
    const radius = 10 + intensity * (critical ? 16 : (low ? 13 : 9));

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // A small, warm coal-like glow lives under the food icon.
    const glow = ctx.createRadialGradient(cx, cy + 2, 0, cx, cy + 2, radius);
    glow.addColorStop(0, `rgba(255, 225, 163, ${0.20 + intensity * 0.36})`);
    glow.addColorStop(0.25, `rgba(230, 151, 65, ${0.16 + intensity * 0.34})`);
    glow.addColorStop(0.62, `rgba(175, 79, 34, ${0.10 + intensity * 0.24})`);
    glow.addColorStop(1, 'rgba(100, 42, 20, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, radius, 0, Math.PI * 2);
    ctx.fill();

    // Visible "burning" under the icon: tiny heat tongues/flickers.
    const tongueCount = critical ? 3 : 2;
    for (let i = 0; i < tongueCount; i++) {
      const sway = Math.sin(now * (0.006 + i * 0.0011) + i * 1.7) * (critical ? 3.0 : 2.1);
      const baseX = cx - 6 + i * 6 + sway * 0.25;
      const baseY = cy + 10;
      const height = (critical ? 12 : low ? 9 : 7) + pulse * (critical ? 3 : 2);
      ctx.beginPath();
      ctx.moveTo(baseX - 1.2, baseY);
      ctx.quadraticCurveTo(baseX - 2.0 + sway * 0.25, baseY - height * 0.55, baseX, baseY - height);
      ctx.quadraticCurveTo(baseX + 1.8 + sway * 0.25, baseY - height * 0.45, baseX + 1.2, baseY);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 214, 132, ${0.10 + intensity * 0.18})`;
      ctx.shadowBlur = critical ? 7 : 5;
      ctx.shadowColor = 'rgba(221, 121, 48, .42)';
      ctx.fill();
    }

    // The food icon itself gets a restrained ember pulse.
    if (hungerIconSvg) {
      const scale = critical ? 1 + pulse * 0.050 : (low ? 1 + pulse * 0.034 : 1 + pulse * 0.018);
      hungerIconSvg.style.transform = `scale(${scale.toFixed(3)})`;
      hungerIconSvg.style.filter =
        `drop-shadow(0 0 ${1.5 + pulse * 1.6}px rgba(255,220,155,.30)) ` +
        `drop-shadow(0 0 ${2.4 + pulse * 3.0}px rgba(214,121,45,.18))`;
    }

    // Healthy/full: just a quiet glow. Lower hunger: embers begin to rise.
    if (hunger <= 100 && Math.random() < (critical ? 0.56 : (low ? 0.34 : 0.12))) {
      spawnHungerEmber(critical || low);
    }

    // Critical hunger makes the embers brighter and slightly more restless.
    if (critical && Math.random() < 0.20) {
      spawnHungerEmber(true);
    } else if (low && Math.random() < 0.09) {
      spawnHungerEmber(false);
    }

    hungerFx.embers = hungerFx.embers.filter(p => p.life < p.maxLife);
    for (const p of hungerFx.embers) {
      const dt = Math.min(34, Math.max(0, now - (p.lastAt || now)));
      p.lastAt = now;
      p.life += dt;
      const progress = p.life / p.maxLife;
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.vx += Math.sin(now * 0.004 + p.flicker) * 0.008;
      p.vy *= 0.994;
      const fade = Math.sin(Math.PI * progress) * (0.55 + 0.45 * Math.sin(now * 0.018 + p.flicker));
      const alpha = Math.max(0, fade);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.hot ? '#FFE3A0' : '#D88A43';
      ctx.shadowBlur = critical ? 9 : 6;
      ctx.shadowColor = p.hot ? 'rgba(255, 204, 112, .98)' : 'rgba(203, 96, 39, .88)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.65 + alpha * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();

    if (hud.classList.contains('visible')) {
      hungerFx.frame = window.requestAnimationFrame(renderHungerFx);
    } else {
      stopHungerFx();
    }
  }

  function startStaminaFx() {
    if (!staminaCanvas || !staminaCtx || staminaFx.active) return;
    staminaFx.active = true;
    staminaFx.lastAt = 0;
    staminaFx.cycleStartedAt = performance.now();
    staminaFx.lastDischargeId = -1;
    staminaCanvas.style.opacity = '1';
    statNodes.stamina.classList.add('stamina-active');
    staminaFx.frame = window.requestAnimationFrame(renderStaminaFx);
  }

  function stopStaminaFx(force = false) {
    staminaFx.active = false;
    if (staminaFx.frame) {
      window.cancelAnimationFrame(staminaFx.frame);
      staminaFx.frame = 0;
    }
    staminaFx.sparks = [];
    statNodes.stamina.classList.remove('stamina-active');
    if (staminaCanvas) staminaCanvas.style.opacity = '0';
    if (force && staminaCtx) staminaCtx.clearRect(0, 0, staminaFx.width, staminaFx.height);
  }

  function drawLightningBolt(ctx, sx, sy, angle, length, thickness, branchScale, now, seed, alpha) {
    const shapeTick = Math.floor(now / 42);
    const segments = 4 + Math.floor(seedNoise(seed * 1.7 + shapeTick * 0.73) * 2);
    const points = [{ x: sx, y: sy }];
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const px = -dy;
    const py = dx;

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const spread = (1 - t) * 5.8 + 1.2;
      const offset = (Math.sin(now * 0.01 + seed * 3.1 + i * 1.7) + (seedNoise(seed * 13.3 + i * 5.9) - 0.5)) * spread;
      points.push({
        x: sx + dx * (length * t) + px * offset,
        y: sy + dy * (length * t) + py * offset
      });
    }

    points.push({
      x: sx + dx * length,
      y: sy + dy * length
    });

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 10;
    ctx.shadowColor = `rgba(245, 178, 76, ${0.45 * alpha})`;

    ctx.strokeStyle = `rgba(177, 94, 31, ${0.65 * alpha})`;
    ctx.lineWidth = thickness + 1.7;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();

    ctx.strokeStyle = `rgba(248, 189, 89, ${0.92 * alpha})`;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 232, 177, ${0.9 * alpha})`;
    ctx.lineWidth = Math.max(.8, thickness * 0.42);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.restore();

    if (branchScale > 0.18) {
      const branchIndex = 1 + Math.floor(seedNoise(seed * 3.9 + shapeTick) * Math.max(1, points.length - 2));
      const bp = points[branchIndex];
      const bAngle = angle + (seedNoise(seed * 2.4 + shapeTick * 0.17) - 0.5) * 2.2;
      const bLength = length * branchScale;
      drawLightningBranch(ctx, bp.x, bp.y, bAngle, bLength, Math.max(.75, thickness * 0.56), alpha * 0.82, now, seed);
    }
  }

  function drawLightningBranch(ctx, sx, sy, angle, length, thickness, alpha, now, seed) {
    const shapeTick = Math.floor(now / 48);
    const segments = 2 + Math.floor(seedNoise(seed * 5.3 + shapeTick * 0.61) * 2);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const px = -dy;
    const py = dx;
    let x = sx;
    let y = sy;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 7;
    ctx.shadowColor = `rgba(245, 178, 76, ${0.35 * alpha})`;

    const stroke = (color, width) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      x = sx; y = sy;
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const spread = (1 - t) * 3.5 + .6;
        const offset = (Math.sin(now * 0.011 + seed * 2.8 + i) + (seedNoise(seed * 17.7 + i * 4.1) - 0.5) * 0.55) * spread;
        x = sx + dx * (length * t) + px * offset;
        y = sy + dy * (length * t) + py * offset;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    stroke(`rgba(174, 84, 29, ${0.58 * alpha})`, thickness + 1);
    stroke(`rgba(248, 189, 89, ${0.8 * alpha})`, thickness);
    stroke(`rgba(255, 230, 172, ${0.75 * alpha})`, Math.max(.55, thickness * .45));
    ctx.restore();
  }

  function spawnStaminaSpark(strong = false, originX = null, originY = null, outwardAngle = null) {
    const cx = staminaFx.width / 2;
    const cy = staminaFx.height / 2;
    const angle = Number.isFinite(outwardAngle)
      ? outwardAngle + rand(-0.62, 0.62)
      : rand(0, Math.PI * 2);
    const drainActivity = clamp01(staminaFx.drainRate / 7.5);
    const speed = (strong ? rand(1.05, 2.2) : rand(0.72, 1.45)) * (0.78 + drainActivity * 1.35);
    const radius = strong ? rand(1.1, 3.4) : rand(0.3, 1.8);
    const ox = Number.isFinite(originX) ? originX : cx;
    const oy = Number.isFinite(originY) ? originY : cy;
    staminaFx.sparks.push({
      x: ox + Math.cos(angle) * radius,
      y: oy + Math.sin(angle) * radius,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      maxLife: strong ? rand(360, 700) : rand(240, 500),
      life: 0,
      size: strong ? rand(1.65, 2.8) : rand(1.0, 1.9),
      warm: Math.random() > 0.5
    });
  }

  function drawStaminaSpark(ctx, p) {
    const progress = p.life / p.maxLife;
    const alpha = (1 - progress) * (0.65 + Math.sin(progress * Math.PI) * 0.35);
    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 7;
    ctx.shadowColor = p.warm ? 'rgba(255, 220, 135, .98)' : 'rgba(229, 139, 58, .92)';
    ctx.fillStyle = p.warm ? '#ffe2a8' : '#f0ab5a';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 241, 210, .9)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.5, p.size * 0.42), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function setStaminaState(state) {
    const staminaNode = statNodes.stamina;
    if (!staminaNode || !staminaStateNode) return;

    staminaNode.classList.remove(
      'stamina-draining',
      'stamina-recovering',
      'stamina-idle',
      'stamina-empty',
      'stamina-unknown'
    );
    staminaNode.classList.add(`stamina-${state}`);

    staminaStateNode.className = `stamina-state is-${state}`;
    const labels = {
      draining: 'Стамина расходуется',
      recovering: 'Стамина восстанавливается',
      idle: 'Стамина не расходуется',
      empty: 'Стамина исчерпана',
      unknown: 'Показатель стамины недоступен'
    };
    const label = labels[state] || labels.unknown;
    staminaStateNode.title = label;
    staminaStateNode.setAttribute('aria-label', label);
    staminaNode.setAttribute('title', `Выносливость — ${label}`);
  }

  function updateStaminaFx(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      stopStaminaFx(true);
      staminaFx.lastNumericValue = null;
      staminaFx.lastSampleAt = 0;
      staminaFx.drainRate = 0;
      staminaFx.recoveryRate = 0;
      setStaminaState('unknown');
      return;
    }

    // Keep the stamina amount ring in sync with the same live value.
    setGauge(statNodes.stamina, numeric);

    const now = performance.now();
    let rawDrainRate = 0;
    let rawRecoveryRate = 0;

    if (staminaFx.lastSampleAt > 0 && staminaFx.lastNumericValue !== null) {
      const elapsed = Math.max(0.12, (now - staminaFx.lastSampleAt) / 1000);
      const delta = numeric - staminaFx.lastNumericValue;

      if (delta < -0.04) rawDrainRate = Math.min(14, -delta / elapsed);
      if (delta > 0.04) rawRecoveryRate = Math.min(14, delta / elapsed);

      // Smooth tiny native-bar fluctuations while keeping up with real sprint drain.
      staminaFx.drainRate = Math.max(0, Math.min(14, staminaFx.drainRate * 0.38 + rawDrainRate * 0.62));
      staminaFx.recoveryRate = Math.max(0, Math.min(14, staminaFx.recoveryRate * 0.42 + rawRecoveryRate * 0.58));

      if (rawDrainRate > 0.18) {
        const drainActivity = clamp01(rawDrainRate / 7.5);
        staminaFx.pulseStartedAt = now;
        staminaFx.pulseDuration = 220 + drainActivity * 520;
        staminaFx.pulseUntil = now + staminaFx.pulseDuration;
        staminaStateHoldUntil = now + 520;
        setStaminaState('draining');

        const burstCount = 1 + Math.round(drainActivity * 4);
        for (let i = 0; i < burstCount; i++) spawnStaminaSpark(true);
      } else if (rawRecoveryRate > 0.18) {
        staminaStateHoldUntil = now + 520;
        setStaminaState('recovering');
      }
    } else {
      staminaFx.drainRate = 0;
      staminaFx.recoveryRate = 0;
    }

    staminaFx.current = Math.max(0, Math.min(100, numeric));
    staminaFx.lastNumericValue = numeric;
    staminaFx.lastSampleAt = now;

    if (rawDrainRate <= 0.18 && rawRecoveryRate <= 0.18 && now >= staminaStateHoldUntil) {
      if (staminaFx.current <= 0.5) setStaminaState('empty');
      else setStaminaState('idle');
    }

    // Keep the calm two-bolt mode visible even at full stamina.
    // Only stop the effect when the HUD itself is hidden.
    if (hud.classList.contains('visible')) {
      startStaminaFx();
    } else {
      stopStaminaFx(true);
    }
  }

  function renderStaminaFx(now) {
    if (!staminaFx.active || !staminaCanvas || !staminaCtx) return;

    const ctx = staminaCtx;
    const w = staminaFx.width;
    const h = staminaFx.height;
    const cx = w / 2;
    const cy = h / 2;
    const current = Math.max(0, Math.min(100, staminaFx.current));
    const spent = 1 - current / 100;
    const drainActivity = clamp01(staminaFx.drainRate / 7.5);
    const recoveryActivity = clamp01(staminaFx.recoveryRate / 6.0);

    // Three clear behavior modes:
    // 1) idle/standing: only the inner lightning glows, no sparks and no outer bolts
    // 2) light/medium spending: two bolts at medium speed
    // 3) strong spending/running: four bolts at high speed
    const idleMode = drainActivity < 0.045;
    const runningMode = drainActivity >= 0.20;
    const mediumMode = !idleMode && !runningMode;

    const boltCount = idleMode ? 0 : (runningMode ? 4 : 2);
    const cycleDuration = idleMode ? 2400 : (runningMode ? 760 : 1450);
    const chargeDuration = idleMode ? 700 : (runningMode ? 150 : 280);
    const dischargeDuration = idleMode ? 0 : (runningMode ? 300 : 480);

    const cycleElapsed = ((now - staminaFx.cycleStartedAt) % cycleDuration + cycleDuration) % cycleDuration;
    const cycleId = Math.floor((now - staminaFx.cycleStartedAt) / cycleDuration);
    const isCharging = idleMode ? true : cycleElapsed < chargeDuration;
    const dischargeElapsed = cycleElapsed - chargeDuration;
    const isDischarging = !idleMode && dischargeElapsed >= 0 && dischargeElapsed < dischargeDuration;
    const dischargeProgress = isDischarging ? clamp01(dischargeElapsed / dischargeDuration) : 0;

    statNodes.stamina.classList.toggle('stamina-igniting', isCharging || idleMode);
    statNodes.stamina.classList.toggle('stamina-discharging', isDischarging);

    // Motion/energy scale now follows real stamina spending speed.
    // Idle is slow and calm, medium is clear, running is fast and aggressive.
    const motionSpeed = idleMode ? 0.30 : (runningMode ? 1.65 + drainActivity * 1.6 : 0.72 + drainActivity * 1.25);
    const motionNow = now * motionSpeed;

    const pulseBoost = idleMode
      ? (0.18 + 0.14 * Math.sin(now * 0.0042))
      : isCharging
        ? 0.38 + 0.62 * Math.sin((cycleElapsed / chargeDuration) * Math.PI * 0.5)
        : isDischarging
          ? 0.96 * (1 - dischargeProgress * 0.32)
          : 0.10;

    const lowStaminaBoost = current <= 18 ? 0.10 : 0;
    const intensity = Math.max(
      0.10,
      Math.min(
        1,
        0.10
          + spent * 0.19
          + drainActivity * 0.62
          + pulseBoost * 0.24
          + lowStaminaBoost
          - recoveryActivity * 0.07
      )
    );

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Center glow: this is always visible and is the only effect while standing still.
    const corePulse = idleMode
      ? (0.72 + 0.28 * Math.sin(now * 0.0065))
      : isCharging
        ? (0.72 + 0.28 * Math.sin((cycleElapsed / chargeDuration) * Math.PI))
        : (isDischarging ? 0.62 : 0.20);

    const glowRadius = idleMode
      ? 10 + corePulse * 7
      : isCharging
        ? 8 + corePulse * 13
        : (isDischarging ? 13 + pulseBoost * 7 : 7 + intensity * 4);

    const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    coreGlow.addColorStop(0, `rgba(255, 245, 215, ${0.36 + corePulse * 0.60})`);
    coreGlow.addColorStop(0.18, `rgba(255, 213, 121, ${0.28 + corePulse * 0.58})`);
    coreGlow.addColorStop(0.46, `rgba(225, 139, 42, ${0.16 + corePulse * 0.34})`);
    coreGlow.addColorStop(1, 'rgba(185, 78, 24, 0)');
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    const coreRadius = idleMode ? (2.4 + corePulse * 1.7) : (isCharging ? 2.6 + corePulse * 2.2 : (isDischarging ? 3.2 : 1.7));
    ctx.fillStyle = `rgba(255, 239, 195, ${0.35 + corePulse * 0.65})`;
    ctx.beginPath();
    ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    // Only light/medium usage and running produce outer bolts.
    if (isDischarging && boltCount > 0) {
      const baseRotation = motionNow * (runningMode ? 0.0034 : 0.0015);
      const travel = runningMode
        ? (dischargeProgress < 0.25 ? dischargeProgress / 0.25 : 1 - 0.18 * clamp01((dischargeProgress - 0.25) / 0.75))
        : (dischargeProgress < 0.40 ? dischargeProgress / 0.40 : 1 - 0.22 * clamp01((dischargeProgress - 0.40) / 0.60));

      for (let i = 0; i < boltCount; i++) {
        const angle = (Math.PI * 2 * i / boltCount) + baseRotation
          + Math.sin(motionNow * (runningMode ? 0.010 : 0.0042) + i * 1.45)
          * (runningMode ? 0.16 : 0.065);

        const maxReach = runningMode ? 42 + pulseBoost * 5 : 34 + drainActivity * 5;
        const minReach = runningMode ? 10 : 8;
        const length = minReach + (maxReach - minReach) * travel;
        const thickness = runningMode ? 1.55 + intensity * 1.35 : 1.20 + intensity * 0.88;
        const branchScale = runningMode ? 0.38 + drainActivity * 0.32 : 0.14 + drainActivity * 0.14;
        const alpha = (runningMode ? 0.74 : 0.60) * (1 - dischargeProgress * 0.22) + intensity * 0.22;

        drawLightningBolt(
          ctx, cx, cy, angle, length, thickness, branchScale,
          motionNow, i + cycleId * 0.31 + Math.floor(motionNow / (runningMode ? 24 : 60)) * 0.13, alpha
        );

        // Emit sparks from the bolt tips only when there are real outer bolts.
        if (cycleId !== staminaFx.lastDischargeId && dischargeProgress < 0.14) {
          const tipX = cx + Math.cos(angle) * length;
          const tipY = cy + Math.sin(angle) * length;
          const sparksPerBolt = runningMode ? 2 : 1;
          for (let s = 0; s < sparksPerBolt; s++) {
            spawnStaminaSpark(true, tipX, tipY, angle);
            spawnStaminaSpark(false, tipX, tipY, angle);
          }
        }
      }
      if (cycleId !== staminaFx.lastDischargeId && dischargeProgress < 0.14) {
        staminaFx.lastDischargeId = cycleId;
      }
    }

    // Soft outer charge ring: calm at idle, stronger while discharging.
    ctx.strokeStyle = `rgba(232, 158, 66, ${idleMode ? 0.10 + corePulse * 0.12 : isCharging ? 0.22 + corePulse * 0.28 : isDischarging ? 0.28 + intensity * 0.18 : 0.08})`;
    ctx.lineWidth = idleMode ? 0.85 + corePulse * 0.18 : (isCharging ? 1.2 + corePulse * 0.5 : 0.8 + (isDischarging ? 0.5 : 0));
    ctx.beginPath();
    ctx.arc(cx, cy, 28.6 + Math.sin(motionNow * (idleMode ? 0.003 : 0.010)) * (idleMode ? 0.12 : (0.35 + drainActivity * 0.7)), 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // Random free sparks only while actual outer discharges are happening.
    if (isDischarging && boltCount > 0 && Math.random() < (runningMode ? 0.16 : 0.075)) {
      const angle = rand(0, Math.PI * 2);
      const r = 23 + rand(0, 15);
      spawnStaminaSpark(false, cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, angle);
    }

    staminaFx.sparks = staminaFx.sparks.filter(p => p.life < p.maxLife);
    for (const p of staminaFx.sparks) {
      const dt = Math.min(34, Math.max(0, now - (p.lastAt || now)));
      p.lastAt = now;
      p.life += dt;
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.vx *= 0.987;
      p.vy *= 0.989;
      drawStaminaSpark(ctx, p);
    }

    const keepRunning = hud.classList.contains('visible');
    if (keepRunning) {
      staminaFx.frame = window.requestAnimationFrame(renderStaminaFx);
    } else {
      stopStaminaFx(true);
    }
  }


  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function seedNoise(value) {
    const x = Math.sin(value * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function easeOutCubic(value) {
    const x = clamp01(value);
    return 1 - Math.pow(1 - x, 3);
  }

  function drawCore(ctx, cx, cy, radius, alpha, now) {
    if (radius <= 0 || alpha <= 0) return;
    const pulse = 0.92 + Math.sin(now * 0.018) * 0.08;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    glow.addColorStop(0, `rgba(255, 236, 173, ${0.78 * alpha * pulse})`);
    glow.addColorStop(0.18, `rgba(255, 183, 76, ${0.64 * alpha})`);
    glow.addColorStop(0.43, `rgba(239, 111, 34, ${0.34 * alpha})`);
    glow.addColorStop(0.72, `rgba(163, 57, 21, ${0.13 * alpha})`);
    glow.addColorStop(1, 'rgba(120, 38, 13, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draws an irregular, molten ring that expands from the mic's center.
  function drawIgnitionWave(ctx, cx, cy, radius, thickness, alpha, now, seed) {
    if (radius <= 1 || alpha <= 0.01) return;
    const points = 88;
    const outer = [];
    const inner = [];
    for (let i = 0; i <= points; i++) {
      const angle = (Math.PI * 2 * i) / points;
      const organic =
        Math.sin(angle * 4 + now * 0.008 + seed) * 1.25 +
        Math.sin(angle * 9 - now * 0.011 + seed * 1.7) * 0.72 +
        Math.sin(angle * 17 + now * 0.014 + seed * 0.4) * 0.34;
      const pulse = Math.sin(now * 0.016 + angle * 6 + seed) * 0.45;
      const outerRadius = Math.max(1, radius + thickness + organic + pulse);
      const innerRadius = Math.max(0.2, radius - thickness * 0.72 + organic * 0.35);
      outer.push({ x: cx + Math.cos(angle) * outerRadius, y: cy + Math.sin(angle) * outerRadius });
      inner.push({ x: cx + Math.cos(angle) * innerRadius, y: cy + Math.sin(angle) * innerRadius });
    }

    const gradient = ctx.createRadialGradient(cx, cy, Math.max(0, radius - thickness * 1.8), cx, cy, radius + thickness * 1.8);
    gradient.addColorStop(0, 'rgba(166, 62, 20, 0)');
    gradient.addColorStop(0.28, `rgba(190, 73, 22, ${0.48 * alpha})`);
    gradient.addColorStop(0.48, `rgba(255, 149, 47, ${0.94 * alpha})`);
    gradient.addColorStop(0.61, `rgba(255, 224, 139, ${0.9 * alpha})`);
    gradient.addColorStop(0.79, `rgba(224, 91, 24, ${0.68 * alpha})`);
    gradient.addColorStop(1, 'rgba(133, 43, 14, 0)');

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    outer.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i].x, inner[i].y);
    ctx.closePath();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'rgba(241, 118, 31, .65)';
    ctx.fill('evenodd');
    ctx.restore();
  }

  function drawFlameTongue(ctx, cx, cy, angle, baseRadius, height, width, now, phase, alpha, inner = false) {
    const wobble =
      Math.sin(now * (inner ? 0.014 : 0.009) + phase) * 0.17 +
      Math.sin(now * 0.019 + phase * 1.7) * 0.075;
    const a = angle + wobble;
    const rx = Math.cos(a);
    const ry = Math.sin(a);
    const tx = -ry;
    const ty = rx;
    const baseR = baseRadius + Math.sin(now * 0.01 + phase) * 1.1;
    const tipR = baseR + height * (0.78 + 0.22 * Math.sin(now * 0.015 + phase * 2));
    const baseHalf = width * 0.58;
    const midHalf = width * (0.37 + 0.13 * Math.sin(now * 0.012 + phase));
    const tipShift = Math.sin(now * 0.012 + phase) * width * 0.48;
    const point = (r, tangentOffset) => ({
      x: cx + rx * r + tx * tangentOffset,
      y: cy + ry * r + ty * tangentOffset
    });
    const leftBase = point(baseR, -baseHalf);
    const rightBase = point(baseR, baseHalf);
    const leftMid = point(baseR + height * 0.34, -midHalf);
    const rightMid = point(baseR + height * 0.38, midHalf);
    const tip = point(tipR, tipShift);
    const leftCtrl = point(baseR + height * 0.17, -width * 0.9);
    const rightCtrl = point(baseR + height * 0.22, width * 0.82);

    const gradient = ctx.createLinearGradient(cx + rx * baseR, cy + ry * baseR, tip.x, tip.y);
    if (inner) {
      gradient.addColorStop(0, 'rgba(222, 103, 29, .8)');
      gradient.addColorStop(0.43, 'rgba(255, 181, 71, .98)');
      gradient.addColorStop(0.78, 'rgba(255, 226, 145, .98)');
      gradient.addColorStop(1, 'rgba(255, 244, 198, .18)');
    } else {
      gradient.addColorStop(0, 'rgba(126, 42, 16, .84)');
      gradient.addColorStop(0.32, 'rgba(205, 75, 22, .95)');
      gradient.addColorStop(0.68, 'rgba(244, 144, 44, .98)');
      gradient.addColorStop(0.88, 'rgba(255, 208, 105, .92)');
      gradient.addColorStop(1, 'rgba(255, 233, 162, .12)');
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(leftBase.x, leftBase.y);
    ctx.quadraticCurveTo(leftCtrl.x, leftCtrl.y, tip.x, tip.y);
    ctx.quadraticCurveTo(rightCtrl.x, rightCtrl.y, rightBase.x, rightBase.y);
    ctx.quadraticCurveTo(rightMid.x, rightMid.y, cx + rx * (baseR - 1), cy + ry * (baseR - 1));
    ctx.quadraticCurveTo(leftMid.x, leftMid.y, leftBase.x, leftBase.y);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function spawnSpark(origin = 'rim', waveRadius = 0) {
    const cx = fire.width / 2;
    const cy = fire.height / 2;
    let angle, radius, speed, vx, vy;

    if (origin === 'center') {
      angle = rand(0, Math.PI * 2);
      radius = rand(1, 5);
      speed = rand(0.65, 1.85);
      vx = Math.cos(angle) * speed + rand(-0.28, 0.28);
      vy = Math.sin(angle) * speed - rand(0.2, 0.75);
    } else if (origin === 'wave') {
      angle = rand(0, Math.PI * 2);
      radius = Math.max(3, waveRadius + rand(-2, 2));
      speed = rand(0.25, 0.9);
      vx = Math.cos(angle) * speed + rand(-0.2, 0.2);
      vy = Math.sin(angle) * speed - rand(0.4, 0.9);
    } else {
      // Embers mostly rise from the top and sides of the outer flame.
      angle = rand(Math.PI * 1.02, Math.PI * 1.98);
      radius = rand(27, 36);
      speed = rand(0.12, 0.55);
      vx = Math.cos(angle) * speed + rand(-0.34, 0.34);
      vy = -rand(0.45, 1.3) + Math.sin(angle) * speed * 0.12;
    }

    fire.particles.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      vx, vy,
      life: 0,
      lastAt: 0,
      maxLife: rand(360, 790),
      size: rand(0.48, 1.2),
      drift: rand(-0.65, 0.65),
      hue: Math.random(),
      origin
    });
  }

  function drawSpark(ctx, p) {
    const progress = p.life / p.maxLife;
    const alpha = Math.sin(Math.PI * progress) * (1 - progress * 0.22);
    if (alpha <= 0) return;
    const angle = Math.atan2(p.vy, p.vx);
    const length = p.size * (1.8 + (1 - progress) * 1.8);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 4;
    ctx.shadowColor = p.hue > 0.5 ? 'rgba(255, 202, 97, .95)' : 'rgba(227, 99, 30, .85)';
    const ember = ctx.createLinearGradient(-length, 0, length, 0);
    ember.addColorStop(0, 'rgba(219, 91, 26, 0)');
    ember.addColorStop(0.45, p.hue > 0.5 ? '#ffe5a6' : '#f4a04c');
    ember.addColorStop(1, '#fff0c4');
    ctx.fillStyle = ember;
    ctx.beginPath();
    ctx.moveTo(-length, 0);
    ctx.quadraticCurveTo(0, -p.size * 0.6, length, 0);
    ctx.quadraticCurveTo(0, p.size * 0.6, -length, 0);
    ctx.fill();
    ctx.restore();
  }

  function renderFire(now) {
    if (!fire.active || !fireCtx || !fireCanvas) return;
    const ctx = fireCtx;
    const w = fire.width;
    const h = fire.height;
    const cx = w / 2;
    const cy = h / 2;
    const elapsed = now - fire.startedAt;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // A repeating pulse: every wave is born in the mic center and travels beyond the ring.
    const pulsePeriod = 1560;
    const pulseTime = elapsed % pulsePeriod;
    const pulseProgress = easeOutCubic(pulseTime / 790);
    const waveRadius = 2 + pulseProgress * 47;
    const waveFade = pulseTime < 900 ? Math.max(0, 1 - pulseTime / 1020) : 0;
    const waveAlpha = 0.78 * waveFade;

    // Warm core ignition slowly grows under the microphone glyph.
    const ignition = easeOutCubic(Math.min(1, pulseTime / 470));
    const coreRadius = 2.5 + ignition * 17 + Math.sin(now * 0.018) * 1.2;
    drawCore(ctx, cx, cy, coreRadius, 0.7 * (0.45 + 0.55 * ignition), now);

    // The irregular fire wave expands outward from the center.
    if (waveAlpha > 0.01) {
      drawIgnitionWave(ctx, cx, cy, waveRadius, 2.1 + Math.sin(now * 0.02) * 0.7, waveAlpha, now, elapsed / pulsePeriod);
      // Small radial tongues ride the edge of the wave, giving it a liquid/flame contour.
      for (let i = 0; i < 18; i++) {
        const angle = (Math.PI * 2 * i / 18) + Math.sin(now * 0.007 + i) * 0.07;
        const stagger = (i % 5) * 0.035;
        const localAlpha = waveAlpha * (1 - stagger);
        drawFlameTongue(ctx, cx, cy, angle, Math.max(2, waveRadius - 1), 2.2 + (i % 4) * 1.4, 1.05 + (i % 3) * 0.35,
          now, i * 1.63, localAlpha * 0.82, i % 3 === 0);
      }
    }

    // Outer ring fire: uneven flame tongues ignite around the rim and extend beyond it.
    const ringIgnition = Math.min(1, elapsed / 440);
    const tongueCount = 28;
    for (let i = 0; i < tongueCount; i++) {
      const angle = (Math.PI * 2 * i / tongueCount) + Math.sin(now * 0.006 + i * 1.7) * 0.06;
      const cluster = (Math.sin(i * 2.17) + 1) / 2;
      const flicker = 0.5 + 0.5 * Math.sin(now * 0.014 + i * 2.2);
      const height = (3.3 + cluster * 4.8 + flicker * 3.6 + (i % 7 === 0 ? 3.3 : 0)) * ringIgnition;
      const width = 1.1 + cluster * 1.1;
      drawFlameTongue(ctx, cx, cy, angle, 29.3, height, width, now, i * 1.29,
        (0.56 + flicker * 0.3) * ringIgnition, false);
      if (i % 2 === 0) {
        drawFlameTongue(ctx, cx, cy, angle + 0.04, 28.2, height * 0.52, width * 0.42, now + 95, i * 1.91,
          (0.52 + flicker * 0.32) * ringIgnition, true);
      }
    }

    // Fine, broken ember arcs add a molten, non-cartoon texture around the rim.
    for (let i = 0; i < 7; i++) {
      const start = now * 0.0004 + i * 0.87;
      const a0 = start;
      const a1 = start + 0.18 + 0.12 * Math.sin(now * 0.01 + i);
      ctx.beginPath();
      ctx.arc(cx, cy, 29.2 + Math.sin(now * 0.01 + i) * 0.7, a0, a1);
      ctx.strokeStyle = `rgba(255, ${156 + (i % 3) * 22}, ${62 + (i % 4) * 17}, ${0.35 + 0.3 * Math.sin(now * 0.012 + i) ** 2})`;
      ctx.lineWidth = 0.7 + (i % 2) * 0.35;
      ctx.shadowBlur = 3;
      ctx.shadowColor = 'rgba(238, 120, 36, .75)';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    // Burst sparks from the center and the moving wave; embers then rise from the outer fire.
    if (now - fire.lastSparkAt > 36) {
      if (pulseTime < 790 && Math.random() > 0.22) spawnSpark('wave', waveRadius);
      if (Math.random() > 0.24) spawnSpark('rim');
      if (Math.random() > 0.68) spawnSpark('center');
      fire.lastSparkAt = now;
    }

    fire.particles = fire.particles.filter(p => p.life < p.maxLife);
    for (const p of fire.particles) {
      const dt = Math.min(34, Math.max(0, now - (p.lastAt || now)));
      p.lastAt = now;
      p.life += dt;
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.vx += p.drift * 0.0025;
      p.vy -= 0.006 * (dt / 16);
      drawSpark(ctx, p);
    }

    fire.frame = window.requestAnimationFrame(renderFire);
  }

  function startFire() {
    if (!fireCanvas || !fireCtx || fire.active) return;
    fire.active = true;
    fire.startedAt = performance.now();
    fire.lastSparkAt = 0;
    fire.particles = [];
    for (let i = 0; i < 28; i++) spawnSpark('center');
    fireCanvas.style.opacity = '1';
    fire.frame = window.requestAnimationFrame(renderFire);
  }

  function stopFire() {
    fire.active = false;
    if (fire.frame) {
      window.cancelAnimationFrame(fire.frame);
      fire.frame = 0;
    }
    fire.particles = [];
    if (fireCtx) fireCtx.clearRect(0, 0, fire.width, fire.height);
    if (fireCanvas) fireCanvas.style.opacity = '0';
  }

  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.action === 'show') {
      hud.classList.add('visible');
      startHealthFx();
      startWaterFx();
      startHungerFx();
      startStaminaFx();
    }
    if (data.action === 'hide') {
      hud.classList.remove('visible');
      stopHealthFx(true);
      stopWaterFx(true);
      stopHungerFx(true);
      stopStaminaFx(true);
    }
    if (data.action === 'update') {
      setGauge(statNodes.health, data.health);
      updateHealthFx(data.health);
      updateStaminaFx(data.stamina);
      setGauge(statNodes.hunger, data.hunger, true);
      updateHungerFx(data.hunger);
      setGauge(statNodes.thirst, data.thirst, true);
      updateWaterFx(data.thirst);
    }
    if (data.action === 'psychology') {
      setGauge(statNodes.psychology, data.psychology);
      setGauge(statNodes.sleep, data.sleep);
    }
    if (data.action === 'sleep') setGauge(statNodes.sleep, data.sleep);
    if (data.action === 'temperature') {
      updateTemperature(data);
    }
    if (data.action === 'microphone') {
      const talking = data.talking === true;
      statNodes.microphone.classList.toggle('active', talking);
      if (talking) startFire();
      else stopFire();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopFire();
      stopHealthFx(true);
      stopWaterFx(true);
      stopHungerFx(true);
      stopStaminaFx(true);
    } else if (hud.classList.contains('visible')) {
      startHealthFx();
      startWaterFx();
      startHungerFx();
      startStaminaFx();
    }
  });
})();
