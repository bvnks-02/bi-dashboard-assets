/* ==========================================================================
   BI Dashboard — Chart Rendering Engine
   Canvas-based chart library for BI dashboards.
   All charts render on <canvas> elements with responsive sizing.
   ========================================================================== */

const BI = window.BI || {};
BI.charts = {};

// ── Configuration ──────────────────────────────────────────────────────

const DEFAULTS = {
  padding: { top: 32, right: 24, bottom: 48, left: 56 },
  colors: {
    grid:       'rgba(154, 160, 176, 0.08)',
    axis:       'rgba(154, 160, 176, 0.4)',
    label:      '#9aa0b0',
    tooltipBg:  '#232736',
    tooltipBorder: '#2d3248',
  },
  fontFamily:  "'Inter', -apple-system, sans-serif",
  fontSize:    11,
  animationDuration: 800,
};

// ── Helpers ────────────────────────────────────────────────────────────

function getCanvas(elOrId) {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (!el) throw new Error(`Canvas element not found`);
  const canvas = el.tagName === 'CANVAS' ? el : el.querySelector('canvas');
  if (!canvas) throw new Error(`No canvas element found`);
  const ctx = canvas.getContext('2d');
  const rect = el.getBoundingClientRect?.() || { width: el.clientWidth || 600, height: el.clientHeight || 400 };
  const dpr = window.devicePixelRatio || 1;
  const w = rect.width || 600;
  const h = rect.height || 400;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);
  return { canvas, ctx, w, h, el };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function lerp(a, b, t) { return a + (b - a) * t; }

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ── Drawing Foundation ────────────────────────────────────────────────

function drawGrid(ctx, opts) {
  const { x, y, w, h, yTicks, xTicks, colors } = opts;
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  for (const ty of yTicks) {
    const yy = y + h - (ty - opts.yMin) / (opts.yMax - opts.yMin) * h;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
  }
}

function drawAxes(ctx, opts) {
  const { x, y, w, h, yTicks, xTicks, yLabel, colors, fontFamily, fontSize } = opts;
  ctx.fillStyle = colors.axis;
  ctx.strokeStyle = colors.axis;
  ctx.lineWidth = 1;

  // Y axis line
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + h);
  ctx.stroke();

  // X axis line
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.stroke();

  // Y ticks + labels
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = colors.label;
  for (const ty of yTicks) {
    const yy = y + h - (ty - opts.yMin) / (opts.yMax - opts.yMin) * h;
    ctx.fillText(BI.format.compact(ty), x - 8, yy);
  }

  // X labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i < xTicks.length; i++) {
    const xx = x + (i + 0.5) / xTicks.length * w;
    const label = typeof xTicks[i] === 'string' ? xTicks[i] : BI.format.date(xTicks[i]);
    ctx.fillText(label, xx, y + h + 8);
  }
}

// ── Chart: Line ────────────────────────────────────────────────────────

BI.charts.line = function(elId, data, opts = {}) {
  const { canvas, ctx, w, h, el } = getCanvas(elId);
  const pad = { ...DEFAULTS.padding, ...opts.padding };
  const colors = { ...DEFAULTS.colors, ...opts.colors };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const values = data.map(d => d.value);
  const yMin = opts.yMin ?? Math.min(...values) * 0.9;
  const yMax = opts.yMax ?? Math.max(...values) * 1.1;
  const yRange = yMax - yMin;
  const yTicks = 5;
  const yStep = yRange / yTicks;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => yMin + i * yStep);
  const xTicks = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0).map(d => d.date || d.label);
  const lineColor = opts.lineColor || '#4f6af5';
  const fillColor = opts.fillColor || BI.colors.hexWithAlpha('#4f6af5', 0.1);
  const showFill = opts.showFill !== false;
  const showDots = opts.showDots !== false;
  const showArea = opts.showArea !== false;
  const animate = opts.animate !== false;

  function draw(progress) {
    ctx.clearRect(0, 0, w, h);
    const p = animate ? progress : 1;

    // Grid
    drawGrid(ctx, { x: pad.left, y: pad.top, w: chartW, h: chartH, yTicks: yTickValues, yMin, yMax, colors });

    // Area fill
    if (showFill || showArea) {
      ctx.beginPath();
      ctx.moveTo(pad.left, pad.top + chartH);
      data.forEach((d, i) => {
        const xx = pad.left + (i + 0.5) / data.length * chartW;
        const yy = pad.top + chartH - ((d.value - yMin) / yRange) * chartH * p;
        ctx.lineTo(xx, yy);
      });
      ctx.lineTo(pad.left + chartW, pad.top + chartH);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
    }

    // Line
    ctx.beginPath();
    data.forEach((d, i) => {
      const xx = pad.left + (i + 0.5) / data.length * chartW;
      const yy = pad.top + chartH - ((d.value - yMin) / yRange) * chartH * p;
      i === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
    });
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Dots
    if (showDots) {
      data.forEach((d, i) => {
        const xx = pad.left + (i + 0.5) / data.length * chartW;
        const yy = pad.top + chartH - ((d.value - yMin) / yRange) * chartH * p;
        ctx.beginPath();
        ctx.arc(xx, yy, 4, 0, Math.PI * 2);
        ctx.fillStyle = lineColor;
        ctx.fill();
        ctx.strokeStyle = '#1a1d27';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // Axes
    drawAxes(ctx, { x: pad.left, y: pad.top, w: chartW, h: chartH, yTicks: yTickValues, xTicks, colors, fontFamily: DEFAULTS.fontFamily, fontSize: DEFAULTS.fontSize, yMin, yMax });

    // Title
    if (opts.title) {
      ctx.fillStyle = colors.label;
      ctx.font = `600 ${DEFAULTS.fontSize + 1}px ${DEFAULTS.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(opts.title, pad.left, 8);
    }
  }

  // Animate
  if (animate) {
    const start = performance.now();
    function frame(now) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / DEFAULTS.animationDuration);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      draw(eased);
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  } else {
    draw(1);
  }

  // Resize handler
  let resizeTimer;
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const { canvas: c2, ctx: ctx2, w: w2, h: h2 } = getCanvas(el);
      // Re-draw with same settings
      const pad2 = { ...DEFAULTS.padding, ...opts.padding };
      const chartW2 = w2 - pad2.left - pad2.right;
      const chartH2 = h2 - pad2.top - pad2.bottom;
      ctx2.clearRect(0, 0, w2, h2);
      // non-animated redraw on resize
      const p = 1;
      ctx2.beginPath();
      ctx2.moveTo(pad2.left, pad2.top + chartH2);
      data.forEach((d, i) => {
        const xx = pad2.left + (i + 0.5) / data.length * chartW2;
        const yy = pad2.top + chartH2 - ((d.value - yMin) / yRange) * chartH2;
        ctx2.lineTo(xx, yy);
      });
      ctx2.lineTo(pad2.left + chartW2, pad2.top + chartH2);
      ctx2.closePath();
      ctx2.fillStyle = fillColor;
      ctx2.fill();
      ctx2.beginPath();
      data.forEach((d, i) => {
        const xx = pad2.left + (i + 0.5) / data.length * chartW2;
        const yy = pad2.top + chartH2 - ((d.value - yMin) / yRange) * chartH2;
        i === 0 ? ctx2.moveTo(xx, yy) : ctx2.lineTo(xx, yy);
      });
      ctx2.strokeStyle = lineColor;
      ctx2.lineWidth = 2.5;
      ctx2.lineJoin = 'round';
      ctx2.lineCap = 'round';
      ctx2.stroke();
    }, 100);
  });
  ro.observe(el);

  return { canvas, ctx, redraw: draw, observer: ro };
};

// ── Chart: Bar ─────────────────────────────────────────────────────────

BI.charts.bar = function(elId, data, opts = {}) {
  const { canvas, ctx, w, h, el } = getCanvas(elId);
  const pad = { ...DEFAULTS.padding, ...opts.padding };
  const colors = { ...DEFAULTS.colors, ...opts.colors };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const values = data.map(d => d.value);
  const yMin = opts.yMin ?? 0;
  const yMax = opts.yMax ?? Math.max(...values) * 1.15;
  const yRange = yMax - yMin;
  const barCount = data.length;
  const barWidth = Math.min((chartW / barCount) * 0.7, 48);
  const gap = (chartW - barWidth * barCount) / (barCount + 1);
  const animate = opts.animate !== false;
  const barColor = opts.barColor || null;
  const cornerRadius = opts.cornerRadius ?? 4;

  function draw(progress) {
    ctx.clearRect(0, 0, w, h);
    const p = animate ? progress : 1;

    // Grid (horizontal)
    const yTickCount = 5;
    const yTickValues = Array.from({ length: yTickCount + 1 }, (_, i) => yMin + (yMax - yMin) * i / yTickCount);
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (const ty of yTickValues) {
      const yy = pad.top + chartH - (ty - yMin) / yRange * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, yy);
      ctx.lineTo(pad.left + chartW, yy);
      ctx.stroke();
    }

    // Bars
    data.forEach((d, i) => {
      const bw = barWidth;
      const bh = ((d.value - yMin) / yRange) * chartH * p;
      const bx = pad.left + gap + i * (barWidth + gap);
      const by = pad.top + chartH - bh;

      const color = d.color || (barColor || BI.colors.get(i));
      ctx.fillStyle = color;
      if (cornerRadius > 0 && bh > cornerRadius) {
        roundRect(ctx, bx, by, bw, bh, cornerRadius);
        ctx.fill();
      } else {
        ctx.fillRect(bx, by, bw, bh);
      }

      // Label
      ctx.fillStyle = colors.label;
      ctx.font = `${DEFAULTS.fontSize}px ${DEFAULTS.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const label = typeof d.label === 'string' ? d.label : '';
      ctx.fillText(label.length > 12 ? label.slice(0, 11) + '…' : label, bx + bw / 2, pad.top + chartH + 8);
    });

    // Y axis labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.label;
    ctx.font = `${DEFAULTS.fontSize}px ${DEFAULTS.fontFamily}`;
    for (const ty of yTickValues) {
      const yy = pad.top + chartH - (ty - yMin) / yRange * chartH;
      ctx.fillText(BI.format.compact(ty), pad.left - 8, yy);
    }

    // Title
    if (opts.title) {
      ctx.fillStyle = colors.label;
      ctx.font = `600 ${DEFAULTS.fontSize + 1}px ${DEFAULTS.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(opts.title, pad.left, 8);
    }
  }

  draw(1); // No animation for bar for speed
  return { canvas, ctx };
};

// ── Chart: Pie / Donut ─────────────────────────────────────────────────

BI.charts.pie = function(elId, data, opts = {}) {
  const { canvas, ctx, w, h, el } = getCanvas(elId);
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(w, h) / 2 - 40;
  const innerR = opts.donut !== false ? outerR * 0.55 : 0;
  const total = data.reduce((s, d) => s + d.value, 0);
  const animate = opts.animate !== false;

  function draw(progress) {
    ctx.clearRect(0, 0, w, h);
    const p = animate ? progress : 1;

    let startAngle = -Math.PI / 2;
    data.forEach((d, i) => {
      const sliceAngle = (d.value / total) * Math.PI * 2 * p;
      const color = d.color || BI.colors.get(i);

      ctx.beginPath();
      ctx.moveTo(cx + innerR * Math.cos(startAngle), cy + innerR * Math.sin(startAngle));
      ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // Stroke for separation
      ctx.strokeStyle = '#1a1d27';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label (only if slice is big enough)
      if (p > 0.5 && sliceAngle > 0.3) {
        const midAngle = startAngle + sliceAngle / 2;
        const labelR = outerR * 0.7;
        const lx = cx + labelR * Math.cos(midAngle);
        const ly = cy + labelR * Math.sin(midAngle);

        const pct = (d.value / total) * 100;
        ctx.fillStyle = '#fff';
        ctx.font = `600 13px ${DEFAULTS.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pct.toFixed(1) + '%', lx, ly - 7);

        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = `${10}px ${DEFAULTS.fontFamily}`;
        ctx.fillText(d.label.length > 10 ? d.label.slice(0, 9) + '…' : d.label, lx, ly + 8);
      }

      startAngle += sliceAngle;
    });

    // Center total for donut
    if (opts.donut !== false) {
      ctx.fillStyle = '#fff';
      ctx.font = `700 24px ${DEFAULTS.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(BI.format.compact(total), cx, cy - 8);
      ctx.fillStyle = colors?.label || '#9aa0b0';
      ctx.font = `${11}px ${DEFAULTS.fontFamily}`;
      ctx.fillText('Total', cx, cy + 16);
    }

    if (opts.title) {
      ctx.fillStyle = colors?.label || '#9aa0b0';
      ctx.font = `600 ${DEFAULTS.fontSize + 1}px ${DEFAULTS.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(opts.title, 16, 8);
    }
  }

  if (animate) {
    const start = performance.now();
    function frame(now) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / DEFAULTS.animationDuration);
      draw(progress);
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  } else {
    draw(1);
  }

  return { canvas, ctx };
};

// ── Chart: Area (stacked) ──────────────────────────────────────────────

BI.charts.area = function(elId, datasets, opts = {}) {
  const { canvas, ctx, w, h, el } = getCanvas(elId);
  const pad = { ...DEFAULTS.padding, ...opts.padding };
  const colors = { ...DEFAULTS.colors, ...opts.colors };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const points = datasets[0].values.length;
  const allValues = datasets.flatMap(ds => ds.values);
  const yMin = opts.yMin ?? 0;
  const yMax = opts.yMax ?? Math.max(...allValues) * 1.15;
  const yRange = yMax - yMin;
  const animate = opts.animate !== false;

  function draw(progress) {
    ctx.clearRect(0, 0, w, h);
    const p = animate ? progress : 1;

    // Grid
    const yTickCount = 5;
    const yTickValues = Array.from({ length: yTickCount + 1 }, (_, i) => yMin + (yMax - yMin) * i / yTickCount);
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (const ty of yTickValues) {
      const yy = pad.top + chartH - (ty - yMin) / yRange * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, yy);
      ctx.lineTo(pad.left + chartW, yy);
      ctx.stroke();
    }

    // Build stacked values
    const stacked = [];
    for (let i = 0; i < points; i++) {
      let sum = 0;
      const layer = [];
      for (const ds of datasets) {
        sum += ds.values[i];
        layer.push(sum);
      }
      stacked.push(layer);
    }

    // Draw each dataset from bottom (index 0) up
    for (let dsi = datasets.length - 1; dsi >= 0; dsi--) {
      const color = datasets[dsi].color || BI.colors.get(dsi);
      ctx.beginPath();
      ctx.moveTo(pad.left, pad.top + chartH);

      for (let i = 0; i < points; i++) {
        const xx = pad.left + (i + 0.5) / points * chartW;
        const stackVal = stacked[i][dsi] * p;
        const prevStackVal = dsi > 0 ? stacked[i][dsi - 1] * p : 0;
        const yy = pad.top + chartH - ((stackVal - yMin) / yRange) * chartH;
        ctx.lineTo(xx, yy);
      }

      // Back to bottom for the next layer down
      for (let i = points - 1; i >= 0; i--) {
        const xx = pad.left + (i + 0.5) / points * chartW;
        const prevStackVal = dsi > 0 ? stacked[i][dsi - 1] * p : 0;
        const yy = pad.top + chartH - ((prevStackVal - yMin) / yRange) * chartH;
        ctx.lineTo(xx, yy);
      }

      ctx.closePath();
      ctx.fillStyle = BI.colors.hexWithAlpha(color, 0.7);
      ctx.fill();
    }

    // X labels
    const xTicks = opts.labels || [];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = colors.label;
    ctx.font = `${DEFAULTS.fontSize}px ${DEFAULTS.fontFamily}`;
    for (let i = 0; i < Math.min(points, xTicks.length); i += Math.max(1, Math.floor(points / 6))) {
      const xx = pad.left + (i + 0.5) / points * chartW;
      ctx.fillText(xTicks[i], xx, pad.top + chartH + 8);
    }

    // Y axis
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const ty of yTickValues) {
      const yy = pad.top + chartH - (ty - yMin) / yRange * chartH;
      ctx.fillText(BI.format.compact(ty), pad.left - 8, yy);
    }

    if (opts.title) {
      ctx.fillStyle = colors.label;
      ctx.font = `600 ${DEFAULTS.fontSize + 1}px ${DEFAULTS.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(opts.title, pad.left, 8);
    }
  }

  draw(1);
  return { canvas, ctx };
};

// ── Chart: Funnel ──────────────────────────────────────────────────────

BI.charts.funnel = function(elId, data, opts = {}) {
  const { canvas, ctx, w, h, el } = getCanvas(elId);
  const pad = { ...DEFAULTS.padding, ...opts.padding };
  const chartH = h - pad.top - pad.bottom;
  const maxVal = data[0].value;
  const barH = Math.min(chartH / data.length * 0.7, 36);
  const gap = (chartH - barH * data.length) / (data.length + 1);

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const centerX = w / 2;

    data.forEach((d, i) => {
      const pct = d.value / maxVal;
      const bw = (w - 120) * pct;
      const bx = centerX - bw / 2;
      const by = pad.top + gap + i * (barH + gap);

      // Bar (trapezoid shape)
      const topWidth = bw;
      const bottomWidth = bw * 0.85;
      const midX = centerX;
      const color = d.color || BI.colors.get(i);

      ctx.beginPath();
      ctx.moveTo(midX - topWidth / 2, by);
      ctx.lineTo(midX + topWidth / 2, by);
      ctx.lineTo(midX + bottomWidth / 2, by + barH);
      ctx.lineTo(midX - bottomWidth / 2, by + barH);
      ctx.closePath();
      ctx.fillStyle = BI.colors.hexWithAlpha(color, 0.6 + 0.3 * pct);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = `600 13px ${DEFAULTS.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.label, 16, by + barH / 2);

      // Value
      ctx.textAlign = 'right';
      ctx.fillStyle = colors?.label || '#9aa0b0';
      ctx.font = `${DEFAULTS.fontSize}px ${DEFAULTS.fontFamily}`;
      ctx.fillText(BI.format.integer(d.value), w - 16, by + barH / 2 - 6);

      // Conversion %
      if (i > 0) {
        const conv = (d.value / data[i - 1].value) * 100;
        ctx.fillStyle = d.value > data[i - 1].value * 0.5 ? '#22c55e' : '#f59e0b';
        ctx.font = `600 11px ${DEFAULTS.fontFamily}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`${conv.toFixed(1)}% conversion`, w - 16, by + barH / 2 + 2);
      }
    });

    if (opts.title) {
      ctx.fillStyle = colors?.label || '#9aa0b0';
      ctx.font = `600 ${DEFAULTS.fontSize + 1}px ${DEFAULTS.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(opts.title, 16, 8);
    }
  }

  draw();
  return { canvas, ctx };
};

// ── Chart: Waterfall ───────────────────────────────────────────────────

BI.charts.waterfall = function(elId, data, opts = {}) {
  const { canvas, ctx, w, h, el } = getCanvas(elId);
  const pad = { ...DEFAULTS.padding, ...opts.padding };
  const colors = { ...DEFAULTS.colors, ...opts.colors };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  let runningTotal = 0;
  const bars = data.map((d, i) => {
    if (i === 0 || d.isTotal) {
      runningTotal = d.value;
      return { ...d, start: 0, end: d.value, isTotal: true };
    }
    const start = runningTotal;
    runningTotal += d.value;
    return { ...d, start, end: runningTotal, isTotal: false };
  });

  const allVals = bars.flatMap(b => [b.start, b.end]);
  const yMin = Math.min(0, ...allVals);
  const yMax = Math.max(...allVals) * 1.15;
  const yRange = yMax - yMin;
  const barW = Math.min(chartW / bars.length * 0.6, 40);
  const gap = (chartW - barW * bars.length) / (bars.length + 1);

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // Grid
    const yTickCount = 5;
    const yTickValues = Array.from({ length: yTickCount + 1 }, (_, i) => yMin + (yMax - yMin) * i / yTickCount);
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (const ty of yTickValues) {
      const yy = pad.top + chartH - (ty - yMin) / yRange * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, yy);
      ctx.lineTo(pad.left + chartW, yy);
      ctx.stroke();
    }

    // Bars
    bars.forEach((b, i) => {
      const bx = pad.left + gap + i * (barW + gap);
      const by = pad.top + chartH - (Math.max(b.start, b.end) - yMin) / yRange * chartH;
      const bh = Math.abs(b.end - b.start) / yRange * chartH || 1;
      const color = b.isTotal ? '#4f6af5' : (b.value >= 0 ? '#22c55e' : '#ef4444');

      ctx.fillStyle = color;
      roundRect(ctx, bx, by, barW, bh, 3);
      ctx.fill();

      // Value label
      ctx.fillStyle = colors.label;
      ctx.font = `${10}px ${DEFAULTS.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = b.value >= 0 ? 'bottom' : 'top';
      const labelY = b.value >= 0 ? by - 4 : by + bh + 4;
      ctx.fillText(BI.format.compact(b.value), bx + barW / 2, labelY);

      // X label
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = colors.label;
      ctx.font = `${DEFAULTS.fontSize}px ${DEFAULTS.fontFamily}`;
      ctx.fillText(b.label, bx + barW / 2, pad.top + chartH + 8);

      // Connector line
      if (i > 0) {
        const prevBar = bars[i - 1];
        const prevTop = pad.top + chartH - (prevBar.end - yMin) / yRange * chartH;
        const currTop = pad.top + chartH - (b.start - yMin) / yRange * chartH;
        ctx.strokeStyle = 'rgba(154, 160, 176, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(pad.left + gap + (i - 1) * (barW + gap) + barW, prevTop);
        ctx.lineTo(bx, currTop);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // Y labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.label;
    ctx.font = `${DEFAULTS.fontSize}px ${DEFAULTS.fontFamily}`;
    for (const ty of yTickValues) {
      const yy = pad.top + chartH - (ty - yMin) / yRange * chartH;
      ctx.fillText(BI.format.compact(ty), pad.left - 8, yy);
    }

    if (opts.title) {
      ctx.fillStyle = colors.label;
      ctx.font = `600 ${DEFAULTS.fontSize + 1}px ${DEFAULTS.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(opts.title, pad.left, 8);
    }
  }

  draw();
  return { canvas, ctx };
};

// ── Chart: Heatmap ─────────────────────────────────────────────────────

BI.charts.heatmap = function(elId, data, opts = {}) {
  // data: 2D array [[val, labelX, labelY], ...] or flat with opts.xLabels, opts.yLabels
  // Expect: { grid: [[v1, v2, ...], ...], xLabels: [...], yLabels: [...] }
  const { canvas, ctx, w, h, el } = getCanvas(elId);
  const pad = { top: 40, right: 24, bottom: 48, left: 80 };
  if (opts.padding) Object.assign(pad, opts.padding);
  const colors = { ...DEFAULTS.colors, ...opts.colors };

  const grid = data.grid || data;
  const rows = grid.length;
  const cols = grid[0].length;
  const xLabels = opts.xLabels || [];
  const yLabels = opts.yLabels || [];

  const cellW = (w - pad.left - pad.right) / cols;
  const cellH = (h - pad.top - pad.bottom) / rows;

  const allVals = grid.flat().filter(v => v !== null && v !== undefined);
  const minVal = opts.minVal ?? Math.min(...allVals);
  const maxVal = opts.maxVal ?? Math.max(...allVals);

  function getHeatColor(val) {
    if (val === null || val === undefined) return 'rgba(255,255,255,0.05)';
    const t = (val - minVal) / (maxVal - minVal);
    const r = Math.round(15 + t * 79);
    const g = Math.round(29 + t * 106);
    const b = Math.round(39 + t * 245);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = grid[r][c];
        const x = pad.left + c * cellW;
        const y = pad.top + r * cellH;

        ctx.fillStyle = getHeatColor(val);
        ctx.fillRect(x, y, cellW, cellH);

        // Value text
        if (val !== null && val !== undefined) {
          ctx.fillStyle = val > (minVal + maxVal) / 2 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)';
          ctx.font = `${Math.min(10, cellW * 0.2)}px ${DEFAULTS.fontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(BI.format.compact(val), x + cellW / 2, y + cellH / 2);
        }
      }
    }

    // X labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = colors.label;
    ctx.font = `${10}px ${DEFAULTS.fontFamily}`;
    for (let c = 0; c < cols; c++) {
      const x = pad.left + c * cellW + cellW / 2;
      const label = xLabels[c] || '';
      ctx.fillText(label.length > 5 ? label.slice(0, 4) + '…' : label, x, pad.top + rows * cellH + 4);
    }

    // Y labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < rows; r++) {
      const y = pad.top + r * cellH + cellH / 2;
      const label = yLabels[r] || '';
      ctx.fillText(label.length > 10 ? label.slice(0, 9) + '…' : label, pad.left - 8, y);
    }

    if (opts.title) {
      ctx.fillStyle = colors.label;
      ctx.font = `600 ${DEFAULTS.fontSize + 1}px ${DEFAULTS.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(opts.title, pad.left, 8);
    }
  }

  draw();
  return { canvas, ctx };
};

// ── Chart: Scatter ─────────────────────────────────────────────────────

BI.charts.scatter = function(elId, data, opts = {}) {
  const { canvas, ctx, w, h, el } = getCanvas(elId);
  const pad = { ...DEFAULTS.padding, ...opts.padding };
  const colors = { ...DEFAULTS.colors, ...opts.colors };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  const xVals = data.map(d => d.x);
  const yVals = data.map(d => d.y);
  const xMin = opts.xMin ?? Math.min(...xVals) * 0.9;
  const xMax = opts.xMax ?? Math.max(...xVals) * 1.1;
  const yMin = opts.yMin ?? Math.min(...yVals) * 0.9;
  const yMax = opts.yMax ?? Math.max(...yVals) * 1.1;
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const yy = pad.top + chartH - i / 5 * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, yy);
      ctx.lineTo(pad.left + chartW, yy);
      ctx.stroke();
    }
    for (let i = 0; i <= 5; i++) {
      const xx = pad.left + i / 5 * chartW;
      ctx.beginPath();
      ctx.moveTo(xx, pad.top);
      ctx.lineTo(xx, pad.top + chartH);
      ctx.stroke();
    }

    // Scatter points
    data.forEach((d, i) => {
      const xx = pad.left + ((d.x - xMin) / xRange) * chartW;
      const yy = pad.top + chartH - ((d.y - yMin) / yRange) * chartH;
      const r = d.radius || 6;
      const color = d.color || BI.colors.get(i);

      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fillStyle = BI.colors.hexWithAlpha(color, 0.7);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Axes
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.label;
    ctx.font = `${DEFAULTS.fontSize}px ${DEFAULTS.fontFamily}`;
    for (let i = 0; i <= 5; i++) {
      const yv = yMin + i / 5 * yRange;
      const yy = pad.top + chartH - i / 5 * chartH;
      ctx.fillText(BI.format.compact(yv), pad.left - 8, yy);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= 5; i++) {
      const xv = xMin + i / 5 * xRange;
      const xx = pad.left + i / 5 * chartW;
      ctx.fillText(BI.format.compact(xv), xx, pad.top + chartH + 8);
    }

    // Axis labels
    if (opts.xLabel) {
      ctx.fillStyle = colors.label;
      ctx.font = `${DEFAULTS.fontSize}px ${DEFAULTS.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(opts.xLabel, pad.left + chartW / 2, pad.top + chartH + 28);
    }
    if (opts.yLabel) {
      ctx.save();
      ctx.translate(12, pad.top + chartH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = colors.label;
      ctx.font = `${DEFAULTS.fontSize}px ${DEFAULTS.fontFamily}`;
      ctx.fillText(opts.yLabel, 0, 0);
      ctx.restore();
    }

    if (opts.title) {
      ctx.fillStyle = colors.label;
      ctx.font = `600 ${DEFAULTS.fontSize + 1}px ${DEFAULTS.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(opts.title, pad.left, 8);
    }
  }

  draw();
  return { canvas, ctx };
};

// ── Chart: Gauge ───────────────────────────────────────────────────────

BI.charts.gauge = function(elId, value, opts = {}) {
  const { canvas, ctx, w, h, el } = getCanvas(elId);
  const cx = w / 2;
  const cy = h * 0.65;
  const r = Math.min(w, h) / 2 - 40;
  const min = opts.min ?? 0;
  const max = opts.max ?? 100;
  const pct = clamp((value - min) / (max - min), 0, 1);
  const threshold = opts.threshold ?? 0.75;
  const warning = opts.warning ?? 0.5;
  const animate = opts.animate !== false;

  function draw(progress) {
    ctx.clearRect(0, 0, w, h);
    const p = animate ? progress : 1;
    const sweepAngle = Math.PI * 1.4;
    const startAngle = Math.PI * 0.8;

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, startAngle + sweepAngle);
    ctx.strokeStyle = 'rgba(154, 160, 176, 0.1)';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Value arc
    const valAngle = startAngle + sweepAngle * pct * p;
    const gradient = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    gradient.addColorStop(0, '#22c55e');
    gradient.addColorStop(warning, '#f59e0b');
    gradient.addColorStop(threshold, '#ef4444');

    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, valAngle);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Value label
    ctx.fillStyle = '#fff';
    ctx.font = `700 32px ${DEFAULTS.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.format ? BI.format[opts.format](value) : Math.round(value), cx, cy - 10);

    // Label
    ctx.fillStyle = colors?.label || '#9aa0b0';
    ctx.font = `${13}px ${DEFAULTS.fontFamily}`;
    ctx.fillText(opts.label || '', cx, cy + 24);

    // Title
    if (opts.title) {
      ctx.fillStyle = colors?.label || '#9aa0b0';
      ctx.font = `600 ${DEFAULTS.fontSize + 1}px ${DEFAULTS.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(opts.title, 16, 8);
    }
  }

  if (animate) {
    const start = performance.now();
    function frame(now) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / 1000);
      draw(progress);
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  } else {
    draw(1);
  }
};

// ── Chart: Treemap ─────────────────────────────────────────────────────

BI.charts.treemap = function(elId, data, opts = {}) {
  const { canvas, ctx, w, h, el } = getCanvas(elId);
  const total = data.reduce((s, d) => s + d.value, 0);

  // Simple squarified treemap layout
  const areas = data.map(d => ({ ...d, area: (d.value / total) * (w - 40) * (h - 40) }));
  const sorted = areas.sort((a, b) => b.value - a.value);

  const x0 = 20, y0 = 20;
  let x = x0, y = y0;
  let rowH = 0;
  let remainingW = w - 40;

  function draw() {
    ctx.clearRect(0, 0, w, h);

    const rects = [];
    let row = [];
    for (const d of sorted) {
      const aspect = d.area / (remainingW || 1);
      const bh = Math.max(20, Math.min(aspect, remainingW * 0.5));
      rowH = Math.max(rowH, bh);
      d._w = remainingW * (d.value / total);
      d._h = bh;
      row.push(d);

      if (x + d._w > w - 20) {
        // Flush row
        flushRow();
      } else {
        x += d._w;
      }
    }
    if (row.length) flushRow();

    function flushRow() {
      for (const d of row) {
        const bw = d._w || remainingW * (d.value / total);
        const color = d.color || BI.colors.get(rects.length);
        ctx.fillStyle = BI.colors.hexWithAlpha(color, 0.7);
        roundRect(ctx, x, y, bw - 2, rowH - 2, 4);
        ctx.fill();

        // Label
        if (bw > 60 && rowH > 30) {
          ctx.fillStyle = '#fff';
          ctx.font = `600 ${Math.min(12, rowH * 0.3)}px ${DEFAULTS.fontFamily}`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(d.label.slice(0, Math.floor(bw / 8)), x + 6, y + 6);

          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font = `${Math.min(10, rowH * 0.25)}px ${DEFAULTS.fontFamily}`;
          ctx.fillText(BI.format.compact(d.value), x + 6, y + 6 + Math.min(16, rowH * 0.35));
        }

        rects.push({ ...d, x, y, w: bw, h: rowH });
        x += bw;
      }
      y += rowH + 2;
      x = x0;
      remainingW = w - 40;
      row = [];
      rowH = 0;
    }

    if (opts.title) {
      ctx.fillStyle = '#9aa0b0';
      ctx.font = `600 ${DEFAULTS.fontSize + 1}px ${DEFAULTS.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(opts.title, 16, 4);
    }
  }

  draw();
  return { canvas, ctx };
};

// ── Chart: Bullet (horizontal bar with target) ─────────────────────────

BI.charts.bullet = function(elId, value, opts = {}) {
  const { canvas, ctx, w, h, el } = getCanvas(elId);
  const pad = { top: 20, right: 20, bottom: 20, left: 20 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const barH = Math.min(chartH * 0.5, 24);
  const y = pad.top + (chartH - barH) / 2;

  const target = opts.target ?? 100;
  const max = opts.max ?? target * 1.3;
  const pct = clamp(value / max, 0, 1);
  const targetPct = clamp(target / max, 0, 1);
  const bad = opts.bad ?? max * 0.5;
  const satisfactory = opts.satisfactory ?? max * 0.75;

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // Background bands
    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
    ctx.fillRect(pad.left, y, chartW * (bad / max), barH);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
    ctx.fillRect(pad.left + chartW * (bad / max), y, chartW * ((satisfactory - bad) / max), barH);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
    ctx.fillRect(pad.left + chartW * (satisfactory / max), y, chartW * ((max - satisfactory) / max), barH);

    // Outer frame
    ctx.strokeStyle = 'rgba(154, 160, 176, 0.2)';
    ctx.lineWidth = 1;
    roundRect(ctx, pad.left, y, chartW, barH, 4);
    ctx.stroke();

    // Value bar
    const color = value >= satisfactory ? '#22c55e' : (value >= bad ? '#f59e0b' : '#ef4444');
    ctx.fillStyle = color;
    roundRect(ctx, pad.left + 2, y + 2, Math.max(4, (chartW - 4) * pct), barH - 4, 3);
    ctx.fill();

    // Target line
    const tx = pad.left + chartW * targetPct;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(tx, y - 4);
    ctx.lineTo(tx, y + barH + 4);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#9aa0b0';
    ctx.font = `600 11px ${DEFAULTS.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(opts.label || '', pad.left, y - 6);

    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(opts.format ? BI.format[opts.format](value) : BI.format.compact(value), pad.left + chartW, y - 6);

    if (opts.targetLabel) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `9px ${DEFAULTS.fontFamily}`;
      ctx.fillText('▎target', tx, y + barH + 6);
    }

    if (opts.title) {
      ctx.fillStyle = '#9aa0b0';
      ctx.font = `600 ${DEFAULTS.fontSize + 1}px ${DEFAULTS.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(opts.title, 16, 4);
    }
  }

  draw();
  return { canvas, ctx };
};

// ── Export ─────────────────────────────────────────────────────────────
window.BI = BI;
