<<<<<<< HEAD
# BI Dashboard Component Library

A production-quality business intelligence dashboard component library built with vanilla HTML, CSS, and JavaScript — no framework dependencies. Dark theme, responsive, ready to embed or extend.

## Quick Start

Open the master dashboard:

```bash
open index.html
# or serve with a local HTTP server:
python3 -m http.server 8080 --bind 127.0.0.1
# then visit http://127.0.0.1:8080
```

> **Important:** Some browsers restrict `file://` cross-origin requests when loading components via `<object>`. Use a local HTTP server for the full experience.

## Architecture

```
bi-dashboard/
├── index.html               # Master executive dashboard (grid of all components)
├── design-tokens.css        # Design system foundation (colors, typography, spacing)
├── README.md                # You are here
│
├── components/              # Standalone, self-contained components
│   ├── kpi-card.html        # Single metric tile with sparkline & trend
│   ├── kpi-row.html         # Horizontal row of 5 KPI metrics
│   ├── line-chart.html      # Time-series line chart with area fill
│   ├── bar-chart.html       # Categorical bar/column chart
│   ├── pie-chart.html       # Donut/pie chart with percentage labels
│   ├── area-chart.html      # Stacked area chart with legend
│   ├── scatter-plot.html    # Scatter/bubble chart (ad spend vs revenue)
│   ├── funnel-chart.html    # Sales pipeline funnel with conversion %
│   ├── heatmap.html         # 2D heatmap (time × day pattern analysis)
│   ├── gauge-chart.html     # Arc gauge + bullet chart combo
│   ├── waterfall-chart.html # Incremental P&L / revenue decomposition
│   ├── treemap.html         # Proportional rectangular visualization
│   ├── geo-map.html         # Country/region ranking bar chart
│   ├── data-table.html      # Sortable data grid with status badges
│   └── filter-controls.html # Date range, region, category filters
│
├── js/
│   ├── bi-utils.js          # Formatting, color palette, data generators
│   └── bi-charts.js         # Canvas chart rendering engine (15+ chart types)
│
└── assets/
    └── sample-data.json     # Sample BI data for all components
```

## Components

### KPI Cards (`kpi-card.html`)
Single metric display with:
- Large formatted value (currency, percentage, integer, compact)
- Colored trend indicator (▲/▼ with % change)
- SVG sparkline mini-chart
- Progress/attainment bar
- Responsive 280px card

### Charts (all in `components/`)
Each chart component is a standalone HTML file that:
- Fetches real sample data from `assets/sample-data.json`
- Falls back to generated data if fetch fails
- Renders on `<canvas>` via the chart engine
- Animates on load
- Resizes responsively
- Shows skeleton loading state

| Component | Chart Type | Data | Use Case |
|-----------|-----------|------|----------|
| `line-chart.html` | Line + area fill | 12-month revenue | Time series trends |
| `bar-chart.html` | Vertical bars | Sales by region | Category comparison |
| `pie-chart.html` | Donut chart | Product mix | Composition analysis |
| `area-chart.html` | Stacked area | Revenue by product | Multi-series trends |
| `scatter-plot.html` | Scatter/bubble | Campaign ROI | Correlation analysis |
| `funnel-chart.html` | Funnel | Pipeline stages | Conversion tracking |
| `heatmap.html` | 2D heatmap | Sales by time × day | Pattern discovery |
| `gauge-chart.html` | Arc gauge + bullet | Target attainment | Performance vs goal |
| `waterfall-chart.html` | Waterfall | Revenue decomposition | Incremental analysis |
| `treemap.html` | Treemap | Product revenue | Hierarchical proportions |
| `geo-map.html` | Bar ranking | Revenue by country | Geographic performance |

### Interactive Components

| Component | Type | Features |
|-----------|------|----------|
| `data-table.html` | Data grid | 6 columns, sortable by header click, status badges, row hover |
| `filter-controls.html` | Form controls | Date range picker, region dropdown, tag-based multi-select, apply/reset |

### KPI Row (`kpi-row.html`)
- 5 horizontal metrics in a flex row
- Responsive wrap (2-col → 1-col on mobile)
- Vertical dividers, skeleton loading
- Inverse trend support (churn rate: negative is good)

## Usage

### Use a Single Component
Each component is fully self-contained. Open it directly:

```bash
open components/line-chart.html
```

### Embed in an Existing Page
Use `<object>` or `<iframe>`:

```html
<div class="component-frame" style="height:380px;">
  <object data="components/line-chart.html" type="text/html" width="100%" height="100%"></object>
</div>
```

### Use the Chart Engine Directly
```html
<script src="js/bi-utils.js"></script>
<script src="js/bi-charts.js"></script>
<canvas id="myChart" width="600" height="300"></canvas>
<script>
  const data = BI.data.generateTimeSeries({ points: 12, trend: 0.02 });
  BI.charts.line('myChart', data, { title: 'My Revenue' });
</script>
```

### Use the KPI Card Programmatically
```html
<script src="js/bi-utils.js"></script>
<script>
  const card = BI.components.kpiCard({
    label: 'Revenue',
    value: 2845000,
    trend: 16.1,
    format: 'currency'
  });
  document.getElementById('container').appendChild(card);
</script>
```

## Design System

The `design-tokens.css` file defines a complete dark-theme design system:

- **Colors:** 10-category chart palette, semantic colors (success/warning/danger), surface hierarchy
- **Typography:** Inter font family, 9 size scale, 4 weight scale
- **Spacing:** 10-step scale (4px to 48px)
- **Effects:** 4 shadow levels, 3 animation durations, 4 border radii
- **Components:** Card, badge, tooltip, skeleton, button patterns

All components use CSS custom properties — override any token to theme.

## Chart Engine API

`js/bi-charts.js` provides canvas-based charts via `BI.charts.*`:

```js
BI.charts.line(el, data, opts)        // Time series line
BI.charts.bar(el, data, opts)         // Categorical bars
BI.charts.pie(el, data, opts)         // Donut/pie
BI.charts.area(el, datasets, opts)    // Stacked area
BI.charts.scatter(el, data, opts)     // Scatter plot
BI.charts.funnel(el, data, opts)      // Funnel
BI.charts.heatmap(el, data, opts)     // 2D heatmap
BI.charts.waterfall(el, data, opts)   // Waterfall
BI.charts.treemap(el, data, opts)     // Treemap
BI.charts.gauge(el, value, opts)      // Arc gauge
BI.charts.bullet(el, value, opts)     // Bullet chart
```

Utility library `js/bi-utils.js` provides:
- `BI.format.compact()` / `.currency()` / `.percentage()` / `.integer()` / `.kpi()`
- `BI.colors.palette` — 10-color categorical array
- `BI.colors.get(i)` — cycle-safe color accessor
- `BI.colors.hexWithAlpha()` — rgba from hex
- `BI.data.generateTimeSeries()` / `.generateCategories()` / `.generateKPI()` / `.generateFunnel()`

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 80+

## Customization

1. **Theme:** Edit CSS variable values in `design-tokens.css`
2. **Colors:** Change `--chart-color-1` through `--chart-color-10`
3. **Sample data:** Edit `assets/sample-data.json`
4. **Chart options:** Pass `opts` to chart functions (colors, padding, animation, etc.)

## License

MIT — free for any use.
=======
# bi-dashboard-assets
a collection of ready web assets for business analyst , coders making web dashboards
>>>>>>> 96773ce41b5d99f3e15a99aa29f273089ee5365c
