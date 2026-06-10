/* ==========================================================================
   BI Dashboard — Utility Library
   Formatting, color generation, data helpers for BI dashboards.
   ========================================================================== */

const BI = window.BI || {};

// ── Number Formatting ──────────────────────────────────────────────────

BI.format = {
  /** Format a number with compact notation (1.2K, 3.4M, 5.6B) */
  compact(n, decimals = 1) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(decimals) + 'T';
    if (Math.abs(n) >= 1e9)  return (n / 1e9).toFixed(decimals) + 'B';
    if (Math.abs(n) >= 1e6)  return (n / 1e6).toFixed(decimals) + 'M';
    if (Math.abs(n) >= 1e3)  return (n / 1e3).toFixed(decimals) + 'K';
    return n.toFixed(decimals);
  },

  /** Format currency */
  currency(n, currency = 'USD', decimals = 0) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  },

  /** Format percentage */
  percentage(n, decimals = 1) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    const sign = n > 0 ? '+' : '';
    return sign + n.toFixed(decimals) + '%';
  },

  /** Format as integer with commas */
  integer(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(n);
  },

  /** Format with fixed decimals */
  fixed(n, decimals = 2) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return n.toFixed(decimals);
  },

  /** Format for KPI display — auto-chooses compact or full */
  kpi(n, opts = {}) {
    const { currency, decimals = 1, threshold = 10000 } = opts;
    if (currency) return this.currency(n, currency, decimals);
    if (Math.abs(n) >= threshold) return this.compact(n, decimals);
    return this.integer(n);
  },

  /** Format a date */
  date(d, format = 'short') {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (format === 'short') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (format === 'long')  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (format === 'month') return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    if (format === 'full')  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    return date.toLocaleDateString('en-US');
  },

  /** Human-readable duration */
  duration(days) {
    if (days < 0) return 'overdue';
    if (days === 0) return 'today';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    const m = Math.floor(days / 30);
    return m === 1 ? '1 month' : `${m} months`;
  },
};

// ── Color & Palette ────────────────────────────────────────────────────

BI.colors = {
  /** 10-color categorical palette for charts */
  palette: [
    '#4f6af5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  ],

  /** Get a color by index (cycles if out of range) */
  get(i) {
    return this.palette[i % this.palette.length];
  },

  /** Generate a gradient between two hex colors */
  gradient(startHex, endHex, steps) {
    const s = this.hexToRgb(startHex);
    const e = this.hexToRgb(endHex);
    const result = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      result.push(this.rgbToHex(
        Math.round(s.r + (e.r - s.r) * t),
        Math.round(s.g + (e.g - s.g) * t),
        Math.round(s.b + (e.b - s.b) * t)
      ));
    }
    return result;
  },

  /** Hex to RGB object */
  hexToRgb(hex) {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  },

  /** RGB to hex string */
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  },

  /** Hex with alpha */
  hexWithAlpha(hex, alpha) {
    const c = this.hexToRgb(hex);
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
  },

  /** Generate a semantic color for a trend direction */
  trendColor(value, good = 'up') {
    if (value === 0) return 'var(--color-text-tertiary)';
    if (good === 'up') return value > 0 ? 'var(--color-success)' : 'var(--color-danger)';
    return value > 0 ? 'var(--color-danger)' : 'var(--color-success)';
  },

  /** Generate a fill opacity version for areas */
  areaFill(color) {
    return this.hexWithAlpha(color.replace('var(', '').replace(')', '').trim() || '#4f6af5', 0.15);
  },
};

// ── DOM Helpers ────────────────────────────────────────────────────────

BI.dom = {
  /** Create an element with attributes and children */
  create(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, val] of Object.entries(attrs)) {
      if (key === 'className') el.className = val;
      else if (key === 'style' && typeof val === 'object') Object.assign(el.style, val);
      else if (key.startsWith('on')) el.addEventListener(key.slice(2), val);
      else el.setAttribute(key, val);
    }
    for (const child of children) {
      if (typeof child === 'string') el.appendChild(document.createTextNode(child));
      else if (child) el.appendChild(child);
    }
    return el;
  },

  /** Query selector with container fallback */
  qs(selector, parent = document) {
    return parent.querySelector(selector);
  },

  /** Query selector all */
  qsa(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  },

  /** Resize observer helper */
  onResize(el, callback) {
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) callback(entry.contentRect);
    });
    ro.observe(el);
    return ro;
  },
};

// ── Data Helpers ───────────────────────────────────────────────────────

BI.data = {
  /** Generate sample time-series data */
  generateTimeSeries({ points = 30, start = '2024-01-01', interval = 'day', trend = 0, volatility = 0.1, base = 100, seed = 42 } = {}) {
    const dates = [];
    const values = [];
    const startDate = new Date(start);
    let val = base;
    let s = seed;

    for (let i = 0; i < points; i++) {
      const d = new Date(startDate);
      if (interval === 'day') d.setDate(d.getDate() + i);
      else if (interval === 'week') d.setDate(d.getDate() + i * 7);
      else if (interval === 'month') d.setMonth(d.getMonth() + i);
      else if (interval === 'hour') d.setHours(d.getHours() + i);
      dates.push(d);

      s = (s * 16807 + 1) % 2147483647;
      const noise = (s / 2147483647 - 0.5) * 2 * volatility;
      val = val * (1 + trend + noise);
      values.push(Math.max(0, val));
    }

    return dates.map((d, i) => ({ date: d, value: values[i], label: BI.format.date(d) }));
  },

  /** Generate sample categorical data */
  generateCategories({ items = 8, prefix = 'Category', base = 100, volatility = 0.3, seed = 42 } = {}) {
    const result = [];
    let s = seed;
    for (let i = 0; i < items; i++) {
      s = (s * 16807 + 1) % 2147483647;
      const noise = (s / 2147483647 - 0.5) * 2 * volatility;
      result.push({
        label: `${prefix} ${String.fromCharCode(65 + i)}`,
        value: Math.max(0, base * (1 + noise)),
        color: BI.colors.get(i),
      });
    }
    return result;
  },

  /** Generate KPI data */
  generateKPI({ label = 'Revenue', value = 1250000, format = 'currency', prefix = '', suffix = '', previous = null, target = null } = {}) {
    const prev = previous ?? value * (1 + (Math.random() - 0.48) * 0.2);
    const tgt = target ?? value * 1.15;
    return {
      label,
      value,
      prefix,
      suffix,
      previous: prev,
      target: tgt,
      change: ((value - prev) / prev) * 100,
      attainment: (value / tgt) * 100,
      format,
    };
  },

  /** Generate funnel stages */
  generateFunnel(stages = ['Visitors', 'Leads', 'MQLs', 'SQLs', 'Opportunities', 'Closed Won']) {
    let val = 100000;
    return stages.map((label, i) => {
      const dropoff = 0.3 + Math.random() * 0.4;
      val = i === 0 ? val : Math.round(val * (1 - dropoff));
      return { label, value: val, pct: i === 0 ? 100 : (val / 100000 * 100) };
    });
  },

  /** Moving average smoothing */
  movingAverage(data, window = 3) {
    return data.map((v, i) => {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(data.length, i + Math.ceil(window / 2));
      const slice = data.slice(start, end);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
  },
};

// ── Export ─────────────────────────────────────────────────────────────

window.BI = BI;
