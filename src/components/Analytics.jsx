import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AreaChart as AreaChartIcon,
  ArrowDown,
  ArrowUp,
  BarChart3,
  CheckSquare,
  ChevronDown,
  Columns2,
  Columns3,
  Download,
  Droplets,
  Eye,
  EyeOff,
  FileText,
  Gauge,
  HeartPulse,
  Layers,
  LayoutGrid,
  LineChart as LineChartIcon,
  Maximize2,
  Minimize2,
  RotateCcw,
  Scale,
  Search,
  SlidersHorizontal,
  Sparkles,
  Table2,
  TrendingUp,
  Wheat,
  Wind,
  X,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useFarm } from '../App.jsx';
import {
  calculateHouseInventory,
  evaluateHouseEnvironmentStatus,
  getExpectedWeightForDay,
} from '../mockData.js';

const WORKSPACE_STORAGE_KEY = 'alreefi_analytics_workspace_v4';
const HOUSE_PALETTE = ['#065f46', '#0284c7', '#d97706', '#9333ea', '#dc2626', '#0f766e'];

const GRID_LAYOUT_OPTIONS = [
  { id: '1', label: '1 Column', className: 'grid-cols-1' },
  { id: '2', label: '2 Columns', className: 'grid-cols-1 lg:grid-cols-2' },
  { id: '3', label: '3 Columns', className: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' },
];

const CHART_DENSITY_OPTIONS = [
  { id: 'compact', label: 'Compact', heightPx: 240 },
  { id: 'standard', label: 'Standard', heightPx: 300 },
  { id: 'tall', label: 'Tall', heightPx: 380 },
];

const CHART_STYLE_OPTIONS = [
  { id: 'line', label: 'Line', icon: LineChartIcon },
  { id: 'area', label: 'Area', icon: AreaChartIcon },
  { id: 'bar', label: 'Bar', icon: BarChart3 },
];

const WIDGET_CATALOG = [
  {
    id: 'kpi-strip',
    label: 'KPI Strip',
    description: 'Mortality, Feed, Water & Hydration, Culls, FCR, Climate Snapshot (plus Owner AED Profit)',
    kind: 'kpi',
    defaultVisible: true,
    defaultSpan: 'full',
    defaultChartType: 'line',
  },
  {
    id: 'temp-4zone',
    label: '4-Zone Temp',
    description: 'Interior thermal contrast (Start, Middle, End) & NH3 vs UAE exterior heat',
    kind: 'chart',
    defaultVisible: true,
    defaultSpan: 'card',
    defaultChartType: 'line',
  },
  {
    id: 'co2-pressure',
    label: 'CO2 & Negative Pressure',
    description: 'CO2 concentration (3,000 ppm alert) vs tunnel negative static pressure (18–38 Pa)',
    kind: 'chart',
    defaultVisible: true,
    defaultSpan: 'card',
    defaultChartType: 'line',
  },
  {
    id: 'humidity-rh',
    label: 'Relative Humidity',
    description: 'Evaporative pad RH% curve vs 50–65% target band and cycle comparison',
    kind: 'chart',
    defaultVisible: true,
    defaultSpan: 'card',
    defaultChartType: 'line',
  },
  {
    id: 'mortality',
    label: 'Daily & Cumulative Mortality',
    description: 'Daily dead birds & culls alongside cumulative flock mortality progression',
    kind: 'chart',
    defaultVisible: true,
    defaultSpan: 'card',
    defaultChartType: 'line',
  },
  {
    id: 'weekly-weight',
    label: 'Weekly Weight & Contract Target',
    description: 'Weekly flock body weight vs 1350g–1550g contract band and cumulative feed tons',
    kind: 'chart',
    defaultVisible: true,
    defaultSpan: 'card',
    defaultChartType: 'line',
  },
  {
    id: 'feed-hydration',
    label: 'Daily Feed & Water Hydration Ratio',
    description: 'Daily feed (kg), water (gal) & water-to-feed ratio (L/kg) vs 1.7–1.9 healthy band',
    kind: 'chart',
    defaultVisible: true,
    defaultSpan: 'card',
    defaultChartType: 'bar',
  },
  {
    id: 'custom-builder',
    label: 'Interactive Custom Metric Builder',
    description: 'Build your own dual-axis correlation chart across any 2 operational metrics',
    kind: 'chart',
    defaultVisible: true,
    defaultSpan: 'full',
    defaultChartType: 'line',
  },
  {
    id: 'house-scorecard',
    label: 'House Comparison Scorecard',
    description: 'Side-by-side live KPIs, feed mode, sensors & environment status across selected houses',
    kind: 'table',
    defaultVisible: true,
    defaultSpan: 'full',
    defaultChartType: 'line',
  },
];

const WORKSPACE_PRESETS = [
  {
    id: 'complete',
    label: 'Complete Analytics',
    gridColumns: '2',
    chartHeight: 'standard',
    visibleIds: WIDGET_CATALOG.map((w) => w.id),
    spans: {
      'kpi-strip': 'full',
      'custom-builder': 'full',
      'house-scorecard': 'full',
    },
  },
  {
    id: 'executive',
    label: 'Executive & Financial',
    gridColumns: '2',
    chartHeight: 'standard',
    visibleIds: ['kpi-strip', 'mortality', 'weekly-weight', 'house-scorecard'],
    spans: {
      'kpi-strip': 'full',
      mortality: 'card',
      'weekly-weight': 'card',
      'house-scorecard': 'full',
    },
  },
  {
    id: 'climate',
    label: 'Climate & Ventilation',
    gridColumns: '2',
    chartHeight: 'standard',
    visibleIds: ['kpi-strip', 'temp-4zone', 'humidity-rh', 'co2-pressure', 'house-scorecard'],
    spans: {
      'kpi-strip': 'full',
      'temp-4zone': 'full',
      'humidity-rh': 'card',
      'co2-pressure': 'card',
      'house-scorecard': 'full',
    },
  },
  {
    id: 'growth',
    label: 'Growth, Feed & Hydration',
    gridColumns: '2',
    chartHeight: 'standard',
    visibleIds: ['weekly-weight', 'feed-hydration', 'custom-builder'],
    spans: {
      'weekly-weight': 'card',
      'feed-hydration': 'card',
      'custom-builder': 'full',
    },
  },
];

const CUSTOM_METRICS = [
  { id: 'interiorTempC', label: 'Interior Temp (°C)', shortLabel: 'Interior Temp', unit: '°C', color: '#059669', domain: ['auto', 'auto'] },
  { id: 'outsideTempC', label: 'Outside Heat (°C)', shortLabel: 'Outside Heat', unit: '°C', color: '#dc2626', domain: ['auto', 'auto'] },
  { id: 'humidityPct', label: 'Relative Humidity (%)', shortLabel: 'Rel. Humidity', unit: '%', color: '#0284c7', domain: [35, 85] },
  { id: 'co2Ppm', label: 'CO2 (ppm)', shortLabel: 'CO2', unit: ' ppm', color: '#7c3aed', domain: ['auto', 'auto'] },
  { id: 'ammoniaPpm', label: 'Ammonia NH3 (ppm)', shortLabel: 'NH3', unit: ' ppm', color: '#d97706', domain: [0, 30] },
  { id: 'negativePressurePa', label: 'Negative Pressure (Pa)', shortLabel: 'Neg Pressure', unit: ' Pa', color: '#0f766e', domain: [0, 45] },
  { id: 'mortalities', label: 'Dead Birds', shortLabel: 'Dead Birds', unit: ' birds', color: '#e11d48', domain: [0, 'auto'] },
  { id: 'culls', label: 'Culls', shortLabel: 'Culls', unit: ' birds', color: '#f59e0b', domain: [0, 'auto'] },
  { id: 'dailyFeedKg', label: 'Feed (kg)', shortLabel: 'Feed', unit: ' kg', color: '#b45309', domain: [0, 'auto'] },
  { id: 'waterGallons', label: 'Water (gal)', shortLabel: 'Water', unit: ' gal', color: '#2563eb', domain: [0, 'auto'] },
  { id: 'avgWeightGrams', label: 'Weight (g)', shortLabel: 'Weight', unit: ' g', color: '#16a34a', domain: [0, 'auto'] },
];

const DEFAULT_CUSTOM_BUILDER = {
  leftMetric: 'interiorTempC',
  rightMetric: 'waterGallons',
  chartType: 'line',
  startDay: 1,
  endDay: 35,
};

function createDefaultWorkspace(presetId = 'complete') {
  const preset = WORKSPACE_PRESETS.find((p) => p.id === presetId) || WORKSPACE_PRESETS[0];
  const visibleSet = new Set(preset.visibleIds);

  return {
    activePreset: preset.id,
    gridColumns: preset.gridColumns,
    chartHeight: preset.chartHeight,
    widgets: WIDGET_CATALOG.map((w) => ({
      id: w.id,
      visible: visibleSet.has(w.id),
      span: preset.spans[w.id] || w.defaultSpan,
      chartType: w.defaultChartType,
    })),
    customBuilder: { ...DEFAULT_CUSTOM_BUILDER },
  };
}

function loadWorkspaceFromStorage() {
  const fallback = createDefaultWorkspace('complete');
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;

    const catalogById = new Map(WIDGET_CATALOG.map((w) => [w.id, w]));
    const parsedWidgets = Array.isArray(parsed.widgets) ? parsed.widgets : [];
    const seenIds = new Set();
    const mergedWidgets = [];

    for (const item of parsedWidgets) {
      if (!item || !catalogById.has(item.id) || seenIds.has(item.id)) continue;
      seenIds.add(item.id);
      const def = catalogById.get(item.id);
      mergedWidgets.push({
        id: item.id,
        visible: typeof item.visible === 'boolean' ? item.visible : def.defaultVisible,
        span: item.span === 'full' || item.span === 'card' ? item.span : def.defaultSpan,
        chartType:
          item.chartType === 'line' || item.chartType === 'area' || item.chartType === 'bar'
            ? item.chartType
            : def.defaultChartType,
      });
    }

    for (const def of WIDGET_CATALOG) {
      if (!seenIds.has(def.id)) {
        mergedWidgets.push({
          id: def.id,
          visible: def.defaultVisible,
          span: def.defaultSpan,
          chartType: def.defaultChartType,
        });
      }
    }

    const validColumns = GRID_LAYOUT_OPTIONS.some((o) => o.id === parsed.gridColumns)
      ? parsed.gridColumns
      : fallback.gridColumns;
    const validHeight = CHART_DENSITY_OPTIONS.some((o) => o.id === parsed.chartHeight)
      ? parsed.chartHeight
      : fallback.chartHeight;

    const cb = parsed.customBuilder || {};
    const validMetricIds = new Set(CUSTOM_METRICS.map((m) => m.id));
    const startDay = Math.max(1, Math.min(35, Number(cb.startDay) || 1));
    const endDay = Math.max(startDay, Math.min(35, Number(cb.endDay) || 35));

    return {
      activePreset: typeof parsed.activePreset === 'string' ? parsed.activePreset : 'custom',
      gridColumns: validColumns,
      chartHeight: validHeight,
      widgets: mergedWidgets,
      customBuilder: {
        leftMetric: validMetricIds.has(cb.leftMetric) ? cb.leftMetric : DEFAULT_CUSTOM_BUILDER.leftMetric,
        rightMetric: validMetricIds.has(cb.rightMetric) ? cb.rightMetric : DEFAULT_CUSTOM_BUILDER.rightMetric,
        chartType:
          cb.chartType === 'line' || cb.chartType === 'area' || cb.chartType === 'bar'
            ? cb.chartType
            : DEFAULT_CUSTOM_BUILDER.chartType,
        startDay,
        endDay,
      },
    };
  } catch {
    return fallback;
  }
}

function getHouseFactor(house, index, cycle) {
  const explicitOffset = cycle?.houseOffsets?.[house.id];
  if (explicitOffset) return explicitOffset;

  const factors = [
    { tempDelta: -0.2, co2Delta: -120, pressureDelta: 1.5, mortDelta: -2, weightDelta: 18, waterDelta: -40 },
    { tempDelta: 0.4, co2Delta: 240, pressureDelta: -1.2, mortDelta: 2, weightDelta: -12, waterDelta: 90 },
    { tempDelta: 1.1, co2Delta: 520, pressureDelta: -5.5, mortDelta: 6, weightDelta: -38, waterDelta: 210 },
    { tempDelta: 0.1, co2Delta: 60, pressureDelta: 0.4, mortDelta: 0, weightDelta: 8, waterDelta: 20 },
    { tempDelta: -0.4, co2Delta: -180, pressureDelta: 2.2, mortDelta: -3, weightDelta: 29, waterDelta: -20 },
    { tempDelta: 0.0, co2Delta: -90, pressureDelta: 0.0, mortDelta: -1, weightDelta: 0, waterDelta: 0 },
  ];
  return factors[index % factors.length];
}

function computePearsonCorrelation(rows, leftKey, rightKey) {
  const pairs = rows
    .map((r) => [Number(r[leftKey]), Number(r[rightKey])])
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  const n = pairs.length;
  if (n < 3) return null;

  let sumX = 0;
  let sumY = 0;
  for (const [x, y] of pairs) {
    sumX += x;
    sumY += y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (const [x, y] of pairs) {
    const dx = x - meanX;
    const dy = y - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const denom = Math.sqrt(denX * denY);
  if (denom === 0) return 0;
  return Number((num / denom).toFixed(2));
}

function describeCorrelation(r) {
  if (r === null) return 'Insufficient points';
  const abs = Math.abs(r);
  const dir = r >= 0 ? 'Positive' : 'Inverse';
  if (abs >= 0.75) return `Strong ${dir}`;
  if (abs >= 0.45) return `Moderate ${dir}`;
  if (abs >= 0.2) return `Weak ${dir}`;
  return 'Minimal Correlation';
}

function toPdfSafeText(text) {
  return String(text ?? '')
    .replace(/₂/g, '2')
    .replace(/₃/g, '3')
    .replace(/→/g, '->')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=');
}

function drawRoundedRectCanvas(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function normalizeSvgClipUrls(svgClone) {
  const attrs = ['clip-path', 'fill', 'stroke', 'mask'];
  const allEls = [svgClone, ...svgClone.querySelectorAll('*')];
  for (const el of allEls) {
    for (const attr of attrs) {
      const val = el.getAttribute(attr);
      if (val && val.includes('url(') && val.includes('#')) {
        const hashIdx = val.indexOf('#');
        const endIdx = val.indexOf(')', hashIdx);
        if (hashIdx !== -1 && endIdx !== -1) {
          const idPart = val.slice(hashIdx, endIdx).replace(/['"]/g, '');
          el.setAttribute(attr, `url(${idPart})`);
        }
      }
    }
  }
}

function serializeRechartsSvgForLightCanvas(svgEl) {
  const svgW = Number(svgEl.getAttribute('width')) || Math.round(svgEl.getBoundingClientRect().width) || 1200;
  const svgH = Number(svgEl.getAttribute('height')) || Math.round(svgEl.getBoundingClientRect().height) || 245;

  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(svgW));
  clone.setAttribute('height', String(svgH));
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
  }

  // Strip any foreignObject tags so SVG never taints the Canvas
  clone.querySelectorAll('foreignObject').forEach((fo) => fo.remove());

  // Normalize url(#id) references for standalone SVG serialization
  normalizeSvgClipUrls(clone);

  // Ensure crisp light-mode typography & grid lines inside standalone SVG regardless of host Dark Mode CSS
  const styleNode = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleNode.textContent =
    'text, tspan { font-family: Arial, Helvetica, sans-serif; } .recharts-cartesian-grid line { stroke: #cbd5e1; }';
  clone.insertBefore(styleNode, clone.firstChild);

  clone.querySelectorAll('text').forEach((t) => {
    const existingFill = t.getAttribute('fill');
    if (!existingFill || existingFill === 'currentColor' || existingFill.includes('var(')) {
      t.setAttribute('fill', '#334155');
    }
    t.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
  });

  clone.querySelectorAll('.recharts-cartesian-grid line').forEach((line) => {
    line.setAttribute('stroke', '#cbd5e1');
  });

  return {
    xml: new XMLSerializer().serializeToString(clone),
    svgW,
    svgH,
  };
}

function extractLegendItemsFromCard(cardEl) {
  const items = Array.from(cardEl.querySelectorAll('.recharts-legend-item'));
  return items
    .map((item) => {
      const textEl = item.querySelector('.recharts-legend-item-text');
      const label = (textEl?.textContent || item.textContent || '').trim();
      if (!label) return null;

      const iconEl = item.querySelector('.recharts-legend-icon');
      const attrStroke = iconEl?.getAttribute('stroke');
      const attrFill = iconEl?.getAttribute('fill');
      const textInlineColor = textEl?.style?.color;
      const itemInlineColor = item.style?.color;
      const color =
        (attrStroke && attrStroke !== 'none' ? attrStroke : null) ||
        (attrFill && attrFill !== 'none' ? attrFill : null) ||
        textInlineColor ||
        itemInlineColor ||
        '#065f46';

      const isDashed = Boolean(iconEl?.getAttribute('stroke-dasharray'));
      const isLine = !attrFill || attrFill === 'none';
      return { label, color, isDashed, isLine };
    })
    .filter(Boolean);
}

async function renderChartCardToCanvas(cardEl, meta) {
  const W = 1248;
  const H = 360;
  const scale = 2;

  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Pure white backing for JPEG encoding + Card surface & subtle border
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  drawRoundedRectCanvas(ctx, 1, 1, W - 2, H - 2, 16);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Header strip
  ctx.fillStyle = '#f8fafc';
  drawRoundedRectCanvas(ctx, 2, 2, W - 4, 54, 15);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2, 56);
  ctx.lineTo(W - 2, 56);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Title & Subtitle
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px Arial, Helvetica, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(meta.title || 'Analytics Chart', 22, 25);

  ctx.fillStyle = '#475569';
  ctx.font = '11.5px Arial, Helvetica, sans-serif';
  ctx.fillText(meta.subtitle || '', 22, 43);

  // Right Scope / Target pill badge
  if (meta.badge) {
    ctx.font = 'bold 11px Arial, Helvetica, sans-serif';
    const badgeText = meta.badge;
    const textW = ctx.measureText(badgeText).width;
    const pillW = Math.min(420, textW + 24);
    const pillX = W - 22 - pillW;
    const pillY = 16;
    ctx.fillStyle = '#ecfdf5';
    drawRoundedRectCanvas(ctx, pillX, pillY, pillW, 24, 12);
    ctx.fill();
    ctx.strokeStyle = '#a7f3d0';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#065f46';
    ctx.fillText(badgeText, pillX + 12, pillY + 16, pillW - 20);
  }

  // Main Recharts SVG plot
  const svgCandidates = Array.from(cardEl.querySelectorAll('.recharts-wrapper > svg.recharts-surface'));
  const mainSvg =
    svgCandidates.sort(
      (a, b) => Number(b.getAttribute('width') || 0) - Number(a.getAttribute('width') || 0)
    )[0] || null;

  const plotBoxX = 20;
  const plotBoxY = 62;
  const plotBoxW = W - 40;
  const plotBoxH = 250;

  if (mainSvg) {
    const { xml, svgW, svgH } = serializeRechartsSvgForLightCanvas(mainSvg);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;

    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const fitScale = Math.min(plotBoxW / svgW, plotBoxH / svgH);
        const drawW = svgW * fitScale;
        const drawH = svgH * fitScale;
        const drawX = plotBoxX + (plotBoxW - drawW) / 2;
        const drawY = plotBoxY + (plotBoxH - drawH) / 2;
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        resolve();
      };
      img.onerror = (err) => reject(err);
      img.src = dataUrl;
    });
  } else {
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 13px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Select one or more houses in Analytics to plot this chart.', W / 2, plotBoxY + plotBoxH / 2);
    ctx.textAlign = 'left';
  }

  // Bottom Legend Bar
  const legendItems = extractLegendItemsFromCard(cardEl);
  if (legendItems.length > 0) {
    ctx.beginPath();
    ctx.moveTo(20, 316);
    ctx.lineTo(W - 20, 316);
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 10.5px Arial, Helvetica, sans-serif';
    const measured = legendItems.map((it) => ({
      ...it,
      itemW: 18 + ctx.measureText(it.label).width + 16,
    }));

    // Split into up to 2 centered rows if total width exceeds 1190px
    const rows = [[]];
    let currentRowWidth = 0;
    for (const item of measured) {
      if (currentRowWidth + item.itemW > 1190 && rows[0].length > 0 && rows.length === 1) {
        rows.push([]);
        currentRowWidth = 0;
      }
      rows[rows.length - 1].push(item);
      currentRowWidth += item.itemW;
    }

    rows.forEach((rowItems, rowIdx) => {
      const rowTotalW = rowItems.reduce((s, it) => s + it.itemW, 0) - 16;
      let cursorX = Math.max(24, (W - rowTotalW) / 2);
      const baseY = rows.length === 1 ? 338 : rowIdx === 0 ? 330 : 347;

      for (const item of rowItems) {
        ctx.save();
        if (item.isLine) {
          ctx.strokeStyle = item.color;
          ctx.lineWidth = 2.5;
          if (item.isDashed) ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(cursorX, baseY - 3.5);
          ctx.lineTo(cursorX + 13, baseY - 3.5);
          ctx.stroke();
        } else {
          ctx.fillStyle = item.color;
          drawRoundedRectCanvas(ctx, cursorX, baseY - 8.5, 11, 10, 2);
          ctx.fill();
        }
        ctx.restore();

        ctx.fillStyle = '#1e293b';
        ctx.fillText(item.label, cursorX + 17, baseY);
        cursorX += item.itemW;
      }
    });
  }

  return canvas;
}

export default function Analytics() {
  const { state, userRole, visibleHouses, resolvedTheme, notify } = useFarm();
  const reportRef = useRef(null);
  const pdfStageRef = useRef(null);

  const isOwner = userRole === 'owner';
  const isDark = resolvedTheme === 'dark';
  const cycles = state.historicalCycles || [];

  const allOverlayHouses = useMemo(
    () => (state.houses || []).filter((h) => !h.archived),
    [state.houses]
  );

  const activeOnlyHouses = useMemo(
    () => allOverlayHouses.filter((h) => h.isActive !== false),
    [allOverlayHouses]
  );

  const [selectedCycleId, setSelectedCycleId] = useState(cycles[0]?.cycleId || 'cycle-13');
  const [compareCycleId, setCompareCycleId] = useState('none');
  const [isHouseDropdownOpen, setIsHouseDropdownOpen] = useState(false);
  const [houseDropdownSearch, setHouseDropdownSearch] = useState('');
  const [selectedHouseIds, setSelectedHouseIds] = useState(() => {
    const defaults = (visibleHouses || []).filter((h) => h.isActive !== false).slice(0, 3).map((h) => h.id);
    return defaults.length > 0 ? defaults : ['house-1', 'house-5'];
  });

  const [workspace, setWorkspace] = useState(() => loadWorkspaceFromStorage());
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
    } catch {
      // Ignore storage quota issues safely
    }
  }, [workspace]);

  const activeCycle = cycles.find((c) => c.cycleId === selectedCycleId) || cycles[0];
  const compareCycle =
    compareCycleId !== 'none' ? cycles.find((c) => c.cycleId === compareCycleId) : null;

  const selectedHouses = useMemo(() => {
    return allOverlayHouses
      .map((h, idx) => ({
        ...h,
        color: HOUSE_PALETTE[idx % HOUSE_PALETTE.length],
        idx,
      }))
      .filter((h) => selectedHouseIds.includes(h.id));
  }, [allOverlayHouses, selectedHouseIds]);

  const toggleHouseSelection = (houseId) => {
    setSelectedHouseIds((prev) =>
      prev.includes(houseId) ? prev.filter((id) => id !== houseId) : [...prev, houseId]
    );
  };

  const handleSelectAllActive = () => {
    setSelectedHouseIds(activeOnlyHouses.map((h) => h.id));
  };

  const handleSelectSameDayPlaced = () => {
    const h1 = allOverlayHouses.find((h) => h.id === 'house-1');
    const h1Start = h1?.cycleStartDate;
    const sameDay = allOverlayHouses
      .filter(
        (h) =>
          h.isActive !== false &&
          (h.id === 'house-1' || h.id === 'house-5' || (h1Start && h.cycleStartDate === h1Start))
      )
      .map((h) => h.id);
    setSelectedHouseIds(sameDay.length > 0 ? sameDay : ['house-1', 'house-5']);
  };

  const handleClearHouses = () => {
    setSelectedHouseIds([]);
  };

  // Workspace Customization Handlers
  const applyWorkspacePreset = (presetId) => {
    const next = createDefaultWorkspace(presetId);
    setWorkspace((prev) => ({
      ...next,
      customBuilder: prev.customBuilder || next.customBuilder,
    }));
  };

  const handleResetLayout = () => {
    setWorkspace(createDefaultWorkspace('complete'));
    notify('Analytics workspace layout reset to default.', 'success');
  };

  const updateWidgetConfig = (widgetId, updater) => {
    setWorkspace((prev) => ({
      ...prev,
      activePreset: 'custom',
      widgets: prev.widgets.map((w) => (w.id === widgetId ? { ...w, ...updater(w) } : w)),
      customBuilder:
        widgetId === 'custom-builder' && updater
          ? (() => {
              const target = prev.widgets.find((w) => w.id === 'custom-builder');
              const updated = target ? updater(target) : {};
              return updated.chartType
                ? { ...prev.customBuilder, chartType: updated.chartType }
                : prev.customBuilder;
            })()
          : prev.customBuilder,
    }));
  };

  const moveWidgetOrder = (widgetId, direction) => {
    setWorkspace((prev) => {
      const idx = prev.widgets.findIndex((w) => w.id === widgetId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.widgets.length) return prev;
      const copy = [...prev.widgets];
      const [moved] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, moved);
      return {
        ...prev,
        activePreset: 'custom',
        widgets: copy,
      };
    });
  };

  const updateCustomBuilder = (patch) => {
    setWorkspace((prev) => {
      const nextBuilder = { ...prev.customBuilder, ...patch };
      if (nextBuilder.startDay > nextBuilder.endDay) {
        if (patch.startDay !== undefined) nextBuilder.endDay = nextBuilder.startDay;
        else nextBuilder.startDay = nextBuilder.endDay;
      }
      const nextWidgets = patch.chartType
        ? prev.widgets.map((w) =>
            w.id === 'custom-builder' ? { ...w, chartType: patch.chartType } : w
          )
        : prev.widgets;
      return {
        ...prev,
        customBuilder: nextBuilder,
        widgets: nextWidgets,
      };
    });
  };

  const scopeLabel = useMemo(() => {
    if (selectedHouses.length === 0) return 'No Houses Selected';
    if (selectedHouses.length === 1) return selectedHouses[0].name;
    if (selectedHouses.length === activeOnlyHouses.length && activeOnlyHouses.length > 0) {
      return `All ${selectedHouses.length} Active Houses Overlay`;
    }
    return selectedHouses.map((h) => h.code || h.name).join(' + ');
  }, [selectedHouses, activeOnlyHouses.length]);

  const chartSeries = useMemo(() => {
    if (!activeCycle) return [];
    let runningBaseCumMort = 0;
    let runningCompareCumMort = 0;
    const runningHouseCumMort = {};

    return (activeCycle.dailySeries || []).map((pt, idx) => {
      const compPt =
        compareCycle?.dailySeries?.find((d) => d.day === pt.day) ??
        compareCycle?.dailySeries?.[idx];

      const baseCo2 = pt.co2Ppm ?? Math.round(1450 + pt.day * 42 + (pt.day % 5) * 65);
      const basePressure =
        pt.negativePressurePa ?? Number((28 - pt.day * 0.18 + Math.sin(pt.day) * 2.2).toFixed(1));
      const baseHumidity = Math.round(
        Number(pt.humidityPct ?? pt.humidity ?? 54 + pt.day * 0.25 + Math.sin(pt.day * 0.7) * 4)
      );
      const avgTempVal = Number(
        (pt.avgTempC ?? ((pt.startTemp + pt.middleTemp + pt.endTemp) / 3 || 29)).toFixed(1)
      );
      const compAvgTempVal = compPt
        ? Number(
            (
              compPt.avgTempC ??
              ((compPt.startTemp + compPt.middleTemp + compPt.endTemp) / 3 || 29)
            ).toFixed(1)
          )
        : null;

      runningBaseCumMort += Number(pt.mortalities || 0);
      if (compPt) {
        runningCompareCumMort += Number(compPt.mortalities || 0);
      }

      const row = {
        ...pt,
        avgTempC: avgTempVal,
        humidityPct: baseHumidity,
        outsideTemp: pt.outsideTemp,
        co2Ppm: baseCo2,
        negativePressurePa: basePressure,
        cumulativeMortalities: runningBaseCumMort,
        compareMortality: compPt ? compPt.mortalities : null,
        compareCumulativeMortality: compPt ? runningCompareCumMort : null,
        compareWeightGrams: compPt ? compPt.avgWeightGrams : null,
        compareAvgTempC: compAvgTempVal,
      };

      let sumTemp = 0;
      let sumHum = 0;
      let sumCo2 = 0;
      let sumPress = 0;
      let sumNh3 = 0;
      let sumMort = 0;
      let sumCumMort = 0;
      let sumCulls = 0;
      let sumFeedKg = 0;
      let sumWaterGal = 0;
      let sumWaterLiters = 0;
      let sumWeightG = 0;

      selectedHouses.forEach((h) => {
        const directHousePt = activeCycle.byHouseSeries?.[h.id]?.[idx];
        const factor = getHouseFactor(h, h.idx, activeCycle);

        const startT = directHousePt?.startTemp ?? Number((pt.startTemp + (factor.tempDelta ?? 0)).toFixed(1));
        const midT = directHousePt?.middleTemp ?? Number((pt.middleTemp + (factor.tempDelta ?? 0)).toFixed(1));
        const endT = directHousePt?.endTemp ?? Number((pt.endTemp + (factor.tempDelta ?? 0)).toFixed(1));
        const avgT = Number(((startT + midT + endT) / 3).toFixed(1));
        const co2Val = directHousePt?.co2Ppm ?? Math.max(900, Math.round(baseCo2 + (factor.co2Delta ?? 0)));
        const pressVal =
          directHousePt?.negativePressurePa ??
          Math.max(10, Number((basePressure + (factor.pressureDelta ?? 0)).toFixed(1)));
        const nh3Val =
          directHousePt?.ammoniaPpm ??
          Number(Math.max(2, pt.ammoniaPpm + (factor.tempDelta ?? 0) * 1.4).toFixed(1));
        const humVal =
          directHousePt?.humidityPct ??
          Math.min(78, Math.max(40, Math.round(baseHumidity + (factor.tempDelta ?? 0) * 2)));
        const mortVal =
          directHousePt?.mortalities ?? Math.max(1, Math.round(pt.mortalities + (factor.mortDelta ?? 0)));
        const cullVal = directHousePt?.culls ?? Math.max(1, Math.round(mortVal * 0.4));
        const weightVal =
          directHousePt?.avgWeightGrams ?? Math.round(pt.avgWeightGrams + (factor.weightDelta ?? 0));
        const feedTonVal =
          directHousePt?.cumulativeFeedTons ?? pt.cumulativeFeedTons;
        const dailyFeedKgVal =
          directHousePt?.dailyFeedKg ?? pt.dailyFeedKg ?? Math.round(320 + pt.day * 68);
        const waterLitersVal =
          directHousePt?.waterLiters ??
          pt.waterLiters ??
          Math.round(dailyFeedKgVal * 1.95 + (pt.day > 20 ? 320 : 0));
        const waterGalVal =
          directHousePt?.waterGallons ?? Math.round(waterLitersVal / 3.78541);

        runningHouseCumMort[h.id] = (runningHouseCumMort[h.id] || 0) + mortVal;

        row[`avgTemp_${h.id}`] = avgT;
        row[`startTemp_${h.id}`] = startT;
        row[`middleTemp_${h.id}`] = midT;
        row[`endTemp_${h.id}`] = endT;
        row[`co2_${h.id}`] = co2Val;
        row[`pressure_${h.id}`] = pressVal;
        row[`nh3_${h.id}`] = nh3Val;
        row[`hum_${h.id}`] = humVal;
        row[`mort_${h.id}`] = mortVal;
        row[`cumMort_${h.id}`] = runningHouseCumMort[h.id];
        row[`culls_${h.id}`] = cullVal;
        row[`weight_${h.id}`] = weightVal;
        row[`feed_${h.id}`] = feedTonVal;

        sumTemp += avgT;
        sumHum += humVal;
        sumCo2 += co2Val;
        sumPress += pressVal;
        sumNh3 += nh3Val;
        sumMort += mortVal;
        sumCumMort += runningHouseCumMort[h.id];
        sumCulls += cullVal;
        sumFeedKg += dailyFeedKgVal;
        sumWaterGal += waterGalVal;
        sumWaterLiters += waterLitersVal;
        sumWeightG += weightVal;
      });

      const n = selectedHouses.length;
      const scopeDailyFeedKg = n > 0 ? Math.round(sumFeedKg / n) : Number(pt.dailyFeedKg || 0);
      const scopeWaterGal = n > 0 ? Math.round(sumWaterGal / n) : Number(pt.waterGallons || 0);
      const scopeWaterLiters = n > 0 ? Math.round(sumWaterLiters / n) : Number(pt.waterLiters || 0);
      const hydrationRatio = Number((scopeWaterLiters / Math.max(1, scopeDailyFeedKg)).toFixed(2));

      row.scopeInteriorTempC = n > 0 ? Number((sumTemp / n).toFixed(1)) : avgTempVal;
      row.scopeOutsideTempC = Number(pt.outsideTemp);
      row.scopeHumidityPct = n > 0 ? Math.round(sumHum / n) : baseHumidity;
      row.scopeCo2Ppm = n > 0 ? Math.round(sumCo2 / n) : baseCo2;
      row.scopeAmmoniaPpm = n > 0 ? Number((sumNh3 / n).toFixed(1)) : Number(pt.ammoniaPpm || 0);
      row.scopePressurePa = n > 0 ? Number((sumPress / n).toFixed(1)) : basePressure;
      row.scopeMortalities = n > 0 ? Math.round(sumMort / n) : Number(pt.mortalities || 0);
      row.scopeCumMortalities = n > 0 ? Math.round(sumCumMort / n) : runningBaseCumMort;
      row.scopeCulls = n > 0 ? Math.round(sumCulls / n) : Number(pt.culls || 0);
      row.scopeDailyFeedKg = scopeDailyFeedKg;
      row.scopeWaterGallons = scopeWaterGal;
      row.scopeWaterLiters = scopeWaterLiters;
      row.scopeWeightGrams = n > 0 ? Math.round(sumWeightG / n) : Number(pt.avgWeightGrams || 0);
      row.hydrationRatio = hydrationRatio;

      // Distinct comparison humidity curve (+/- 2.5 to 3.5% diurnal offset) so Previous vs Current are clearly separated
      if (compPt) {
        const currentBaselineHum = n === 1 ? row[`hum_${selectedHouses[0].id}`] : baseHumidity;
        const sign = compareCycle?.cycleNumber === 11 ? -1 : 1;
        const diurnalSwing = 2.95 + Math.sin(pt.day * 0.45 + (compareCycle?.cycleNumber || 1)) * 0.45;
        let compHum = Math.round(currentBaselineHum + sign * diurnalSwing);
        if (Math.abs(compHum - currentBaselineHum) < 2.5) {
          compHum = Math.round(currentBaselineHum + sign * 3);
        }
        row.compareHumidityPct = Math.min(78, Math.max(40, compHum));
      } else {
        row.compareHumidityPct = null;
      }

      // Unified keys for Custom Correlation Builder
      row.interiorTempC = row.scopeInteriorTempC;
      row.outsideTempC = row.scopeOutsideTempC;
      row.humidityPct = row.scopeHumidityPct;
      row.co2Ppm = row.scopeCo2Ppm;
      row.ammoniaPpm = row.scopeAmmoniaPpm;
      row.negativePressurePa = row.scopePressurePa;
      row.mortalities = row.scopeMortalities;
      row.culls = row.scopeCulls;
      row.dailyFeedKg = row.scopeDailyFeedKg;
      row.waterGallons = row.scopeWaterGallons;
      row.avgWeightGrams = row.scopeWeightGrams;

      if (n === 1) {
        const only = selectedHouses[0];
        row.singleStartTemp = row[`startTemp_${only.id}`];
        row.singleMiddleTemp = row[`middleTemp_${only.id}`];
        row.singleEndTemp = row[`endTemp_${only.id}`];
        row.singleNh3 = row[`nh3_${only.id}`];
        row.singleHumidity = row[`hum_${only.id}`];
        row.singleCo2 = row[`co2_${only.id}`];
        row.singlePressure = row[`pressure_${only.id}`];
        row.singleMortalities = row[`mort_${only.id}`];
        row.singleCumMortalities = row[`cumMort_${only.id}`];
        row.singleCulls = row[`culls_${only.id}`];
      }

      return row;
    });
  }, [activeCycle, compareCycle, selectedHouses]);

  const weeklyWeightData = useMemo(() => {
    const sampleDays = [7, 14, 21, 28, 35];
    return sampleDays
      .map((d) => {
        const pt = chartSeries.find((item) => item.day === d);
        if (!pt) return null;
        const entry = {
          weekLabel: `W${d / 7} (D${d})`,
          avgWeightGrams: pt.avgWeightGrams,
          compareWeightGrams: pt.compareWeightGrams,
          feedTons: pt.cumulativeFeedTons,
          targetMin: state.settings?.contractRules?.targetWeightMinGrams || 1350,
          targetMax: state.settings?.contractRules?.targetWeightMaxGrams || 1550,
        };
        selectedHouses.forEach((h) => {
          entry[`weight_${h.id}`] = pt[`weight_${h.id}`];
          entry[`feed_${h.id}`] = pt[`feed_${h.id}`];
        });
        return entry;
      })
      .filter(Boolean);
  }, [chartSeries, selectedHouses, state.settings]);

  // Water & Hydration summary metrics across the active cycle
  const hydrationSummary = useMemo(() => {
    if (chartSeries.length === 0) {
      return { totalWaterGal: 0, totalFeedKg: 0, avgDailyWaterGal: 0, avgHydrationRatio: 0 };
    }
    const totalWaterGal = chartSeries.reduce((s, r) => s + Number(r.scopeWaterGallons || 0), 0);
    const totalWaterL = chartSeries.reduce((s, r) => s + Number(r.scopeWaterLiters || 0), 0);
    const totalFeedKg = chartSeries.reduce((s, r) => s + Number(r.scopeDailyFeedKg || 0), 0);
    const avgDailyWaterGal = Math.round(totalWaterGal / chartSeries.length);
    const avgHydrationRatio = Number((totalWaterL / Math.max(1, totalFeedKg)).toFixed(2));
    return { totalWaterGal, totalFeedKg, avgDailyWaterGal, avgHydrationRatio };
  }, [chartSeries]);

  // Multi-House Scorecard Data (shared between Live UI Table and Page 1 PDF Vector Table)
  const scorecardRows = useMemo(() => {
    const chicksPerCarton = state.settings?.contractRules?.chicksPerCarton || 100;
    const logs = state.healthLogs || [];
    const baseFcr = Number(activeCycle?.fcr || 1.54);

    return selectedHouses.map((h) => {
      const inv = calculateHouseInventory(h, chicksPerCarton, logs);
      const env = evaluateHouseEnvironmentStatus(h, state.settings);

      const startT = Number(h.zones?.start ?? 0);
      const midT = Number(h.zones?.middle ?? 0);
      const endT = Number(h.zones?.end ?? 0);
      const avgTempC = Number(((startT + midT + endT) / 3).toFixed(1));
      const rhPct = Math.round(Number(h.zones?.humidity ?? 55));
      const co2Ppm = Math.round(Number(h.zones?.co2Ppm ?? h.co2Ppm ?? 1800));
      const negPressurePa = Number(Number(h.zones?.negativePressurePa ?? h.negativePressurePa ?? 25).toFixed(1));
      const nh3Ppm = Number(Number(h.zones?.ammoniaPpm ?? 8).toFixed(1));

      let phaseLabel = `Cultivation (D${h.cycleDay || 1}/${h.targetCycleDays || 35})`;
      if (h.isActive === false) {
        phaseLabel = 'Inactive / Offline';
      } else if (h.phase === 'cleaning') {
        phaseLabel = `Cleaning (D${h.cleaningDay || 0}/${h.targetCleaningDays || 14})`;
      }

      const latestWeight = h.weeklyWeights?.[h.weeklyWeights.length - 1];
      let estWeightGrams = null;
      if (h.isActive === false) {
        estWeightGrams = null;
      } else if (h.phase === 'cleaning') {
        estWeightGrams = h.lastHarvestSummary?.avgWeightGrams || latestWeight?.avgGrams || null;
      } else if (latestWeight && latestWeight.day === h.cycleDay) {
        estWeightGrams = latestWeight.avgGrams;
      } else {
        const expectedNow = getExpectedWeightForDay(h.cycleDay || 1);
        const ratio =
          latestWeight && latestWeight.day
            ? latestWeight.avgGrams / Math.max(1, getExpectedWeightForDay(latestWeight.day))
            : 1;
        estWeightGrams = Math.round(expectedNow * ratio);
      }

      const factor = getHouseFactor(h, h.idx, activeCycle);
      const fcrPenalty =
        h.isActive === false
          ? null
          : Number(
              (
                baseFcr +
                (factor.mortDelta || 0) * 0.012 -
                (factor.weightDelta || 0) * 0.0012
              ).toFixed(2)
            );

      const feedModeLabel =
        h.feedSystemType === 'silo'
          ? `Silo (${h.siloCapacityTons || 20}T)`
          : `Bags (${h.bagWeightKg || 50}kg)`;

      return {
        id: h.id,
        name: h.name,
        code: h.code,
        color: h.color,
        isActive: h.isActive !== false,
        phase: h.phase,
        phaseLabel,
        activeBirds: inv.activeChicks,
        mortalityPct: inv.mortalityPct,
        fcr: fcrPenalty,
        estWeightGrams,
        feedModeLabel,
        avgTempC,
        outsideTempC: Number(h.zones?.outside ?? 42.5),
        rhPct,
        co2Ppm,
        negPressurePa,
        nh3Ppm,
        envStatus: env.status,
        envReasons: env.reasons,
      };
    });
  }, [selectedHouses, state.settings, state.healthLogs, activeCycle]);

  // Live Selected-House Climate Snapshot (used in KPI Strip & Climate preset)
  const climateSummary = useMemo(() => {
    const cultivationRows = scorecardRows.filter((r) => r.isActive && r.phase !== 'cleaning');
    const activeRows = scorecardRows.filter((r) => r.isActive);
    const pool =
      cultivationRows.length > 0
        ? cultivationRows
        : activeRows.length > 0
        ? activeRows
        : scorecardRows;
    if (pool.length === 0) {
      return {
        avgTempC: 0,
        outsideTempC: 42.5,
        avgRhPct: 0,
        avgCo2Ppm: 0,
        avgPressurePa: 0,
        avgNh3Ppm: 0,
        alertCount: 0,
      };
    }
    const len = pool.length;
    return {
      avgTempC: Number((pool.reduce((s, r) => s + r.avgTempC, 0) / len).toFixed(1)),
      outsideTempC: Number((pool.reduce((s, r) => s + r.outsideTempC, 0) / len).toFixed(1)),
      avgRhPct: Math.round(pool.reduce((s, r) => s + r.rhPct, 0) / len),
      avgCo2Ppm: Math.round(pool.reduce((s, r) => s + r.co2Ppm, 0) / len),
      avgPressurePa: Number((pool.reduce((s, r) => s + r.negPressurePa, 0) / len).toFixed(1)),
      avgNh3Ppm: Number((pool.reduce((s, r) => s + r.nh3Ppm, 0) / len).toFixed(1)),
      alertCount: pool.filter((r) => r.envStatus === 'ALERT' || r.envStatus === 'ATTENTION').length,
    };
  }, [scorecardRows]);

  // Custom Metric Correlation Builder Data & Correlation Statistic
  const customBuilderSeries = useMemo(() => {
    const { startDay, endDay } = workspace.customBuilder;
    return chartSeries.filter((pt) => pt.day >= startDay && pt.day <= endDay);
  }, [chartSeries, workspace.customBuilder]);

  const leftMetricMeta =
    CUSTOM_METRICS.find((m) => m.id === workspace.customBuilder.leftMetric) || CUSTOM_METRICS[0];
  const rightMetricMeta =
    CUSTOM_METRICS.find((m) => m.id === workspace.customBuilder.rightMetric) || CUSTOM_METRICS[9];

  const customCorrelationR = useMemo(
    () =>
      computePearsonCorrelation(
        customBuilderSeries,
        leftMetricMeta.id,
        rightMetricMeta.id
      ),
    [customBuilderSeries, leftMetricMeta.id, rightMetricMeta.id]
  );

  // Chart Styling Tokens (Interactive UI vs Standardized Light-Mode PDF Stage)
  const getChartTheme = (forPdf) => ({
    gridStroke: forPdf ? '#cbd5e1' : isDark ? '#334155' : '#cbd5e1',
    tickFill: forPdf ? '#334155' : isDark ? '#cbd5e1' : '#334155',
    animate: !forPdf,
    tooltipStyle: {
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      borderColor: isDark ? '#334155' : '#e2e8f0',
      borderRadius: '12px',
      color: isDark ? '#f8fafc' : '#0f172a',
      fontSize: '12px',
    },
    rhBandFill: forPdf ? '#0369a1' : isDark ? '#7dd3fc' : '#0369a1',
    targetBandFill: forPdf ? '#166534' : isDark ? '#86efac' : '#166534',
    hydrationBandFill: forPdf ? '#065f46' : isDark ? '#6ee7b7' : '#065f46',
  });

  const wrapChartPlot = (forPdf, pdfW, pdfH, chartEl) => {
    if (forPdf) {
      return React.cloneElement(chartEl, { width: pdfW, height: pdfH });
    }
    return <ResponsiveContainer width="100%" height="100%">{chartEl}</ResponsiveContainer>;
  };

  const renderSeriesList = (seriesConfigs, animate) =>
    seriesConfigs.map((s) => {
      if (s.kind === 'bar') {
        return (
          <Bar
            key={s.key}
            yAxisId={s.yAxisId}
            dataKey={s.dataKey}
            name={s.name}
            fill={s.color}
            radius={[3, 3, 0, 0]}
            isAnimationActive={animate}
          />
        );
      }
      if (s.kind === 'area') {
        return (
          <Area
            key={s.key}
            yAxisId={s.yAxisId}
            type="monotone"
            dataKey={s.dataKey}
            name={s.name}
            stroke={s.color}
            fill={s.color}
            fillOpacity={s.fillOpacity ?? 0.16}
            strokeWidth={s.strokeWidth ?? 2.2}
            strokeDasharray={s.dash}
            isAnimationActive={animate}
          />
        );
      }
      return (
        <Line
          key={s.key}
          yAxisId={s.yAxisId}
          type="monotone"
          dataKey={s.dataKey}
          name={s.name}
          stroke={s.color}
          strokeWidth={s.strokeWidth ?? 2.3}
          strokeDasharray={s.dash}
          dot={s.dot ?? false}
          isAnimationActive={animate}
        />
      );
    });

  // ---------------------------------------------------------------------------
  // Chart Renderers (Zero React Fragments inside Recharts!)
  // ---------------------------------------------------------------------------
  const renderTempChart = (mode, options = {}) => {
    const { forPdf = false, pdfW = 1200, pdfH = 250 } = options;
    if (selectedHouses.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
          Select one or more houses above to display temperature curves.
        </div>
      );
    }

    const theme = getChartTheme(forPdf);
    const kind = mode === 'bar' ? 'bar' : mode === 'area' ? 'area' : 'line';
    const series = [
      {
        key: 'outsideTemp',
        kind,
        yAxisId: 'temp',
        dataKey: 'outsideTemp',
        name: 'Outside (UAE)',
        color: '#dc2626',
        dash: kind === 'line' ? '5 4' : undefined,
        fillOpacity: 0.12,
        strokeWidth: 2,
      },
    ];

    if (selectedHouses.length === 1) {
      series.push(
        { key: 's-start', kind, yAxisId: 'temp', dataKey: 'singleStartTemp', name: 'Start Zone', color: '#0284c7', fillOpacity: 0.15 },
        { key: 's-mid', kind, yAxisId: 'temp', dataKey: 'singleMiddleTemp', name: 'Middle Zone', color: '#065f46', fillOpacity: 0.15 },
        { key: 's-end', kind, yAxisId: 'temp', dataKey: 'singleEndTemp', name: 'End Zone', color: '#d97706', fillOpacity: 0.15 }
      );
      if (kind !== 'bar') {
        series.push({
          key: 's-nh3',
          kind: 'line',
          yAxisId: 'nh3',
          dataKey: 'singleNh3',
          name: 'NH3 (ppm)',
          color: '#9333ea',
          dash: '3 3',
          strokeWidth: 2,
        });
      }
    } else {
      selectedHouses.forEach((h) => {
        series.push({
          key: `h-temp-${h.id}`,
          kind,
          yAxisId: 'temp',
          dataKey: `avgTemp_${h.id}`,
          name: `${h.name} Avg °C`,
          color: h.color,
          fillOpacity: 0.14,
          strokeWidth: 2.4,
        });
      });
    }

    if (compareCycle) {
      series.push({
        key: 'comp-temp',
        kind: kind === 'bar' ? 'bar' : 'line',
        yAxisId: 'temp',
        dataKey: 'compareAvgTempC',
        name: `Previous (${compareCycle.name.split('(')[0].trim()}) Avg °C`,
        color: '#475569',
        dash: '5 4',
        strokeWidth: 2.2,
      });
    }

    return wrapChartPlot(
      forPdf,
      pdfW,
      pdfH,
      <ComposedChart data={chartSeries} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: theme.tickFill }} interval={4} />
        <YAxis yAxisId="temp" domain={[15, 50]} unit="°C" tick={{ fontSize: 11, fill: theme.tickFill }} />
        <YAxis yAxisId="nh3" orientation="right" domain={[0, 30]} unit=" ppm" tick={{ fontSize: 11, fill: theme.tickFill }} />
        {!forPdf && <Tooltip contentStyle={theme.tooltipStyle} />}
        <Legend />
        {renderSeriesList(series, theme.animate)}
      </ComposedChart>
    );
  };

  const renderAirQualityChart = (mode, options = {}) => {
    const { forPdf = false, pdfW = 1200, pdfH = 250 } = options;
    if (selectedHouses.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
          Select one or more houses above to compare CO₂ (ppm) &amp; Negative Pressure (Pa).
        </div>
      );
    }

    const theme = getChartTheme(forPdf);
    const co2Kind = mode === 'bar' ? 'bar' : mode === 'area' ? 'area' : 'line';
    const series = [];

    selectedHouses.forEach((h) => {
      series.push({
        key: `co2-${h.id}`,
        kind: co2Kind,
        yAxisId: 'co2',
        dataKey: `co2_${h.id}`,
        name: `${h.code} CO2 (ppm)`,
        color: h.color,
        fillOpacity: 0.14,
        strokeWidth: 2.3,
      });
    });

    selectedHouses.forEach((h) => {
      series.push({
        key: `pa-${h.id}`,
        kind: 'line',
        yAxisId: 'pa',
        dataKey: `pressure_${h.id}`,
        name: `${h.code} Pressure (Pa)`,
        color: h.color,
        dash: '4 3',
        strokeWidth: 2,
      });
    });

    return wrapChartPlot(
      forPdf,
      pdfW,
      pdfH,
      <ComposedChart data={chartSeries} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: theme.tickFill }} interval={4} />
        <YAxis yAxisId="co2" domain={[800, 3600]} unit=" ppm" tick={{ fontSize: 11, fill: theme.tickFill }} />
        <YAxis yAxisId="pa" orientation="right" domain={[0, 48]} unit=" Pa" tick={{ fontSize: 11, fill: theme.tickFill }} />
        {!forPdf && <Tooltip contentStyle={theme.tooltipStyle} />}
        <Legend />
        <ReferenceLine
          yAxisId="co2"
          y={3000}
          stroke="#dc2626"
          strokeDasharray="4 4"
          label={{ value: 'CO2 Alert 3000', fontSize: 10, fill: '#dc2626', position: 'insideTopRight' }}
        />
        {renderSeriesList(series, theme.animate)}
      </ComposedChart>
    );
  };

  const renderHumidityChart = (mode, options = {}) => {
    const { forPdf = false, pdfW = 1200, pdfH = 250 } = options;
    if (selectedHouses.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
          Select one or more houses above to plot Relative Humidity (%).
        </div>
      );
    }

    const theme = getChartTheme(forPdf);
    const kind = mode === 'bar' ? 'bar' : mode === 'area' ? 'area' : 'line';
    const series = [];

    if (selectedHouses.length === 1) {
      series.push({
        key: 'single-rh',
        kind,
        yAxisId: 'rh',
        dataKey: 'singleHumidity',
        name: `${selectedHouses[0].name} Humidity (%)`,
        color: '#0284c7',
        fillOpacity: 0.18,
        strokeWidth: 2.6,
      });
    } else {
      series.push({
        key: 'cycle-rh',
        kind,
        yAxisId: 'rh',
        dataKey: 'humidityPct',
        name: `Current Cycle (${activeCycle?.name?.split('(')[0]?.trim() || 'Current'}) %`,
        color: '#0284c7',
        fillOpacity: 0.16,
        strokeWidth: 2.8,
      });

      if (!compareCycle) {
        selectedHouses.forEach((h) => {
          series.push({
            key: `rh-${h.id}`,
            kind,
            yAxisId: 'rh',
            dataKey: `hum_${h.id}`,
            name: `${h.name} %`,
            color: h.color,
            fillOpacity: 0.1,
            strokeWidth: 1.8,
          });
        });
      }
    }

    if (compareCycle) {
      series.push({
        key: 'comp-rh',
        kind: kind === 'bar' ? 'bar' : 'line',
        yAxisId: 'rh',
        dataKey: 'compareHumidityPct',
        name: `Previous (${compareCycle.name.split('(')[0].trim()}) %`,
        color: '#d97706',
        dash: '5 4',
        strokeWidth: 2.5,
      });
    }

    return wrapChartPlot(
      forPdf,
      pdfW,
      pdfH,
      <ComposedChart data={chartSeries} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: theme.tickFill }} />
        <YAxis yAxisId="rh" domain={[35, 85]} unit="%" tick={{ fontSize: 11, fill: theme.tickFill }} />
        {!forPdf && <Tooltip contentStyle={theme.tooltipStyle} />}
        <Legend />
        <ReferenceArea
          yAxisId="rh"
          y1={50}
          y2={65}
          fill="#0ea5e9"
          fillOpacity={0.14}
          label={{ value: 'Optimal 50–65% RH', position: 'insideTopLeft', fontSize: 10, fill: theme.rhBandFill }}
        />
        {renderSeriesList(series, theme.animate)}
      </ComposedChart>
    );
  };

  const renderMortalityChart = (mode, options = {}) => {
    const { forPdf = false, pdfW = 1200, pdfH = 250 } = options;
    if (selectedHouses.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
          Select one or more houses above to compare daily &amp; cumulative mortality.
        </div>
      );
    }

    const theme = getChartTheme(forPdf);
    const kind = mode === 'bar' ? 'bar' : mode === 'area' ? 'area' : 'line';
    const series = [];

    if (compareCycle) {
      series.push(
        {
          key: 'curr-mort',
          kind,
          yAxisId: 'daily',
          dataKey: selectedHouses.length === 1 ? 'singleMortalities' : 'mortalities',
          name: `Current (${activeCycle?.name?.split('(')[0]?.trim() || 'Current'}) Dead`,
          color: '#dc2626',
          fillOpacity: 0.2,
          strokeWidth: 2.6,
        },
        {
          key: 'prev-mort',
          kind: kind === 'bar' ? 'bar' : 'line',
          yAxisId: 'daily',
          dataKey: 'compareMortality',
          name: `Previous (${compareCycle.name.split('(')[0].trim()}) Dead`,
          color: '#64748b',
          dash: '5 4',
          strokeWidth: 2.3,
        },
        {
          key: 'curr-cum-mort',
          kind: 'line',
          yAxisId: 'cum',
          dataKey: selectedHouses.length === 1 ? 'singleCumMortalities' : 'cumulativeMortalities',
          name: 'Current Cumulative Dead',
          color: '#991b1b',
          dash: '3 3',
          strokeWidth: 2.1,
        },
        {
          key: 'prev-cum-mort',
          kind: 'line',
          yAxisId: 'cum',
          dataKey: 'compareCumulativeMortality',
          name: 'Previous Cumulative Dead',
          color: '#94a3b8',
          dash: '2 4',
          strokeWidth: 1.9,
        }
      );
    } else if (selectedHouses.length === 1) {
      series.push(
        {
          key: 's-mort',
          kind,
          yAxisId: 'daily',
          dataKey: 'singleMortalities',
          name: 'Daily Dead (Mortalities)',
          color: '#dc2626',
          fillOpacity: 0.2,
          strokeWidth: 2.5,
        },
        {
          key: 's-cull',
          kind,
          yAxisId: 'daily',
          dataKey: 'singleCulls',
          name: 'Daily Sick (Culls)',
          color: '#d97706',
          fillOpacity: 0.18,
          strokeWidth: 2,
        },
        {
          key: 's-cum',
          kind: 'line',
          yAxisId: 'cum',
          dataKey: 'singleCumMortalities',
          name: 'Cumulative Mortality',
          color: '#7f1d1d',
          dash: '4 3',
          strokeWidth: 2.2,
        }
      );
    } else {
      selectedHouses.forEach((h) => {
        series.push({
          key: `h-mort-${h.id}`,
          kind,
          yAxisId: 'daily',
          dataKey: `mort_${h.id}`,
          name: `${h.name} Daily Dead`,
          color: h.color,
          fillOpacity: 0.14,
          strokeWidth: 2.2,
        });
      });
      series.push({
        key: 'scope-cum-mort',
        kind: 'line',
        yAxisId: 'cum',
        dataKey: 'scopeCumMortalities',
        name: 'Avg Cumulative Dead / House',
        color: '#991b1b',
        dash: '4 3',
        strokeWidth: 2.4,
      });
    }

    return wrapChartPlot(
      forPdf,
      pdfW,
      pdfH,
      <ComposedChart data={chartSeries} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: theme.tickFill }} />
        <YAxis yAxisId="daily" tick={{ fontSize: 11, fill: theme.tickFill }} />
        <YAxis yAxisId="cum" orientation="right" tick={{ fontSize: 11, fill: theme.tickFill }} />
        {!forPdf && <Tooltip contentStyle={theme.tooltipStyle} />}
        <Legend />
        {renderSeriesList(series, theme.animate)}
      </ComposedChart>
    );
  };

  const renderWeightChart = (mode, options = {}) => {
    const { forPdf = false, pdfW = 1200, pdfH = 250 } = options;
    if (selectedHouses.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
          Select one or more houses above to compare weekly growth vs. 1350g–1550g contract target.
        </div>
      );
    }

    const theme = getChartTheme(forPdf);
    const targetMin = state.settings?.contractRules?.targetWeightMinGrams || 1350;
    const targetMax = state.settings?.contractRules?.targetWeightMaxGrams || 1550;
    const kind = mode === 'bar' ? 'bar' : mode === 'area' ? 'area' : 'line';

    const series = [
      {
        key: 'feed-tons',
        kind: kind === 'bar' ? 'line' : 'area',
        yAxisId: 'feed',
        dataKey: 'feedTons',
        name: 'Cumulative Feed (T)',
        color: '#d97706',
        fillOpacity: 0.16,
        strokeWidth: 2,
        dash: kind === 'bar' ? '4 3' : undefined,
      },
    ];

    if (compareCycle) {
      series.push(
        {
          key: 'curr-wt',
          kind,
          yAxisId: 'weight',
          dataKey: 'avgWeightGrams',
          name: `Current (${activeCycle?.name?.split('(')[0]?.trim() || 'Current'}) (g)`,
          color: '#059669',
          fillOpacity: 0.18,
          strokeWidth: 3,
          dot: { r: 4 },
        },
        {
          key: 'prev-wt',
          kind: kind === 'bar' ? 'bar' : 'line',
          yAxisId: 'weight',
          dataKey: 'compareWeightGrams',
          name: `Previous (${compareCycle.name.split('(')[0].trim()}) (g)`,
          color: '#64748b',
          dash: '5 4',
          strokeWidth: 2.5,
          dot: { r: 3 },
        }
      );
    } else {
      selectedHouses.forEach((h) => {
        series.push({
          key: `wt-${h.id}`,
          kind,
          yAxisId: 'weight',
          dataKey: `weight_${h.id}`,
          name: `${h.name} Weight (g)`,
          color: h.color,
          fillOpacity: 0.14,
          strokeWidth: 2.6,
          dot: { r: 4 },
        });
      });
    }

    return wrapChartPlot(
      forPdf,
      pdfW,
      pdfH,
      <ComposedChart data={weeklyWeightData} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} />
        <XAxis dataKey="weekLabel" tick={{ fontSize: 11, fill: theme.tickFill }} />
        <YAxis yAxisId="weight" domain={[0, 2200]} unit="g" tick={{ fontSize: 11, fill: theme.tickFill }} />
        <YAxis yAxisId="feed" orientation="right" unit="T" tick={{ fontSize: 11, fill: theme.tickFill }} />
        {!forPdf && <Tooltip contentStyle={theme.tooltipStyle} />}
        <Legend />
        <ReferenceArea
          yAxisId="weight"
          y1={targetMin}
          y2={targetMax}
          fill="#16a34a"
          fillOpacity={0.18}
          label={{
            value: `Contract Target (${targetMin}–${targetMax}g)`,
            position: 'insideTopLeft',
            fontSize: 10,
            fill: theme.targetBandFill,
          }}
        />
        {renderSeriesList(series, theme.animate)}
      </ComposedChart>
    );
  };

  const renderFeedHydrationChart = (mode, options = {}) => {
    const { forPdf = false, pdfW = 1200, pdfH = 250 } = options;
    if (selectedHouses.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
          Select one or more houses above to plot Daily Feed, Water &amp; Hydration Ratio (L/kg).
        </div>
      );
    }

    const theme = getChartTheme(forPdf);
    const kind = mode === 'bar' ? 'bar' : mode === 'area' ? 'area' : 'line';

    const series = [
      {
        key: 'daily-feed-kg',
        kind,
        yAxisId: 'vol',
        dataKey: 'scopeDailyFeedKg',
        name: 'Daily Feed (kg/house)',
        color: '#d97706',
        fillOpacity: 0.18,
        strokeWidth: 2.3,
      },
      {
        key: 'daily-water-gal',
        kind,
        yAxisId: 'vol',
        dataKey: 'scopeWaterGallons',
        name: 'Daily Water (gal/house)',
        color: '#0284c7',
        fillOpacity: 0.18,
        strokeWidth: 2.3,
      },
      {
        key: 'hydration-ratio',
        kind: 'line',
        yAxisId: 'ratio',
        dataKey: 'hydrationRatio',
        name: 'Hydration Ratio (L/kg)',
        color: '#059669',
        strokeWidth: 2.8,
        dot: { r: 2.5 },
      },
    ];

    return wrapChartPlot(
      forPdf,
      pdfW,
      pdfH,
      <ComposedChart data={chartSeries} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: theme.tickFill }} interval={4} />
        <YAxis yAxisId="vol" tick={{ fontSize: 11, fill: theme.tickFill }} />
        <YAxis yAxisId="ratio" orientation="right" domain={[1.2, 2.5]} tick={{ fontSize: 11, fill: theme.tickFill }} />
        {!forPdf && <Tooltip contentStyle={theme.tooltipStyle} />}
        <Legend />
        <ReferenceArea
          yAxisId="ratio"
          y1={1.7}
          y2={1.9}
          fill="#10b981"
          fillOpacity={0.18}
          label={{
            value: 'Healthy 1.7–1.9 L/kg',
            position: 'insideTopLeft',
            fontSize: 10,
            fill: theme.hydrationBandFill,
          }}
        />
        {renderSeriesList(series, theme.animate)}
      </ComposedChart>
    );
  };

  const renderCustomCorrelationChart = (mode, options = {}) => {
    const { forPdf = false, pdfW = 1200, pdfH = 250 } = options;
    if (selectedHouses.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
          Select one or more houses above to build custom metric correlations.
        </div>
      );
    }

    const theme = getChartTheme(forPdf);
    const kind = mode === 'bar' ? 'bar' : mode === 'area' ? 'area' : 'line';

    const series = [
      {
        key: `left-${leftMetricMeta.id}`,
        kind,
        yAxisId: 'left',
        dataKey: leftMetricMeta.id,
        name: `Left: ${leftMetricMeta.label}`,
        color: leftMetricMeta.color,
        fillOpacity: 0.2,
        strokeWidth: 2.6,
      },
      {
        key: `right-${rightMetricMeta.id}`,
        kind: kind === 'bar' ? 'line' : kind,
        yAxisId: 'right',
        dataKey: rightMetricMeta.id,
        name: `Right: ${rightMetricMeta.label}`,
        color: rightMetricMeta.color,
        dash: leftMetricMeta.id === rightMetricMeta.id ? '5 4' : undefined,
        fillOpacity: 0.14,
        strokeWidth: 2.5,
      },
    ];

    return wrapChartPlot(
      forPdf,
      pdfW,
      pdfH,
      <ComposedChart data={customBuilderSeries} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: theme.tickFill }} interval="preserveStartEnd" />
        <YAxis
          yAxisId="left"
          domain={leftMetricMeta.domain}
          unit={leftMetricMeta.unit}
          tick={{ fontSize: 11, fill: leftMetricMeta.color }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={rightMetricMeta.domain}
          unit={rightMetricMeta.unit}
          tick={{ fontSize: 11, fill: rightMetricMeta.color }}
        />
        {!forPdf && <Tooltip contentStyle={theme.tooltipStyle} />}
        <Legend />
        {renderSeriesList(series, theme.animate)}
      </ComposedChart>
    );
  };

  // Chart Card Metadata Builder (used both in Live UI and Offscreen PDF Stage)
  const getChartMeta = (widgetId) => {
    switch (widgetId) {
      case 'temp-4zone':
        return {
          title: '4-Zone Temperature & Cooling Contrast (35-Day Cycle)',
          subtitle:
            selectedHouses.length === 1
              ? 'Interior zones (Start, Middle, End) + NH3 against UAE exterior heat'
              : `Multi-house average interior temp overlay (${selectedHouses.length} houses) vs. Outside UAE`,
          badge: `Scope: ${scopeLabel}`,
        };
      case 'co2-pressure':
        return {
          title: 'CO₂ (ppm) & Negative Pressure (Pa) Telemetry',
          subtitle:
            'Ventilation efficiency: CO2 alert threshold 3,000 ppm vs. static tunnel pressure (18–38 Pa)',
          badge: 'Target: 18–38 Pa',
        };
      case 'humidity-rh':
        return {
          title: 'Relative Humidity (%) Trend vs. Optimal 50–65% RH',
          subtitle: `Evaporative cooling pad humidity tracking across the 35-day cycle${
            compareCycle ? ` vs. ${compareCycle.name}` : ''
          }`,
          badge: 'Target Band: 50%–65% RH',
        };
      case 'mortality':
        return {
          title: 'Daily & Cumulative Mortality & Cull Trends',
          subtitle:
            selectedHouses.length <= 1
              ? `Daily dead, culls & cumulative mortality curve across ${activeCycle?.name || 'Cycle'}`
              : `Multi-house daily dead overlay & avg cumulative mortality (${selectedHouses.length} houses)`,
          badge: `Target: < 3.0% Cycle Mort`,
        };
      case 'weekly-weight':
        return {
          title: 'Weekly Weight vs. 1350g–1550g Target & Feed Usage',
          subtitle: 'Shaded green band highlights the Alain Farms contract harvest target (1350g–1550g)',
          badge: `FCR: ${activeCycle?.fcr ?? 1.54} • Catch: ${activeCycle?.avgCatchWeightGrams ?? 1480}g`,
        };
      case 'feed-hydration':
        return {
          title: 'Daily Feed (kg), Water (Gallons) & Hydration Ratio (L/kg)',
          subtitle:
            'Daily feed intake & water gallons plotted with L/kg hydration curve against 1.7–1.9 broiler target',
          badge: `Avg Ratio: ${hydrationSummary.avgHydrationRatio} L/kg`,
        };
      case 'custom-builder':
        return {
          title: `Custom Metric Correlation: ${leftMetricMeta.shortLabel} vs. ${rightMetricMeta.shortLabel}`,
          subtitle: `Cycle Days ${workspace.customBuilder.startDay}–${workspace.customBuilder.endDay} • ${
            customCorrelationR !== null
              ? `Pearson r = ${customCorrelationR > 0 ? `+${customCorrelationR}` : customCorrelationR} (${describeCorrelation(customCorrelationR)})`
              : 'Interactive Correlation Explorer'
          }`,
          badge: `Days ${workspace.customBuilder.startDay}–${workspace.customBuilder.endDay} • ${workspace.customBuilder.chartType.toUpperCase()}`,
        };
      default:
        return { title: widgetId, subtitle: '', badge: '' };
    }
  };

  const renderChartById = (widgetId, mode, options) => {
    switch (widgetId) {
      case 'temp-4zone':
        return renderTempChart(mode, options);
      case 'co2-pressure':
        return renderAirQualityChart(mode, options);
      case 'humidity-rh':
        return renderHumidityChart(mode, options);
      case 'mortality':
        return renderMortalityChart(mode, options);
      case 'weekly-weight':
        return renderWeightChart(mode, options);
      case 'feed-hydration':
        return renderFeedHydrationChart(mode, options);
      case 'custom-builder':
        return renderCustomCorrelationChart(mode, options);
      default:
        return null;
    }
  };

  // ---------------------------------------------------------------------------
  // Rock-Solid Multi-Page A4 Landscape (297mm x 210mm) PDF Report Generator
  // ---------------------------------------------------------------------------
  const handleExportPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      // Allow React to mount & render the fixed-width light-mode offscreen Recharts stage
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 140)))
      );

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageW = pdf.internal.pageSize.getWidth(); // 297mm
      const pageH = pdf.internal.pageSize.getHeight(); // 210mm
      const marginX = 10;
      const contentW = pageW - marginX * 2; // 277mm
      const generatedAtStr = new Date().toLocaleString();
      const activeCycleLabel = toPdfSafeText(activeCycle?.name || 'Active Cycle');
      const compareLabel = compareCycle ? toPdfSafeText(compareCycle.name) : 'None';
      const safeScope = toPdfSafeText(scopeLabel);

      // ---------------------------------------------------------------------
      // PAGE 1: Crisp Vector Executive Summary & Multi-House Scorecard
      // ---------------------------------------------------------------------
      pdf.setFillColor(6, 78, 59); // #064e3b
      pdf.rect(0, 0, pageW, 23, 'F');
      pdf.setFillColor(16, 185, 129); // #10b981 accent bar
      pdf.rect(0, 23, pageW, 1.2, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14.5);
      pdf.text('AlReefi Farm Management - Executive Analytics Report', marginX, 10);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(209, 250, 229);
      pdf.text(
        `Cycle: ${activeCycleLabel}  |  Compare: ${compareLabel}  |  Scope: ${safeScope}`,
        marginX,
        16.2
      );
      pdf.text(`Generated: ${generatedAtStr}  |  Partner: Alain Farms Contract Operations`, marginX, 20.5);

      // Role pill badge in header
      const roleText = isOwner ? 'SUPER ADMIN EXECUTIVE' : 'MANAGER OPERATIONAL';
      pdf.setFillColor(4, 120, 87);
      pdf.roundedRect(pageW - marginX - 48, 5.5, 48, 7.5, 2, 2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.text(roleText, pageW - marginX - 24, 10.4, { align: 'center' });

      // Vector KPI Cards Grid
      const kpiCards = [
        {
          label: 'TOTAL MORTALITY RATE',
          value: `${activeCycle?.totalMortalityRate ?? 0}%`,
          sub: compareCycle
            ? `vs ${compareCycle.totalMortalityRate}% (${toPdfSafeText(compareCycle.name.split(' ')[1] || 'Prev')})`
            : 'Target: < 3.0% cycle limit',
          bg: [254, 242, 242],
          border: [254, 202, 202],
          titleRgb: [153, 27, 27],
          valRgb: [185, 28, 28],
        },
        ...(isOwner
          ? [
              {
                label: 'OWNER EST. PROFIT',
                value: `AED ${Number(activeCycle?.estimatedProfitAed || 0).toLocaleString()}`,
                sub: `Payout: AED ${Number(activeCycle?.estimatedPayoutAed || 0).toLocaleString()}`,
                bg: [236, 253, 245],
                border: [167, 243, 208],
                titleRgb: [6, 95, 70],
                valRgb: [6, 78, 59],
              },
            ]
          : []),
        {
          label: 'FEED CONSUMPTION',
          value: `${activeCycle?.totalFeedTons ?? 0} Tons`,
          sub: `${Math.round((activeCycle?.totalFeedTons || 0) * 20).toLocaleString()} x 50kg Bags`,
          bg: [248, 250, 252],
          border: [203, 213, 225],
          titleRgb: [71, 85, 105],
          valRgb: [15, 23, 42],
        },
        {
          label: 'WATER & HYDRATION',
          value: `${hydrationSummary.avgDailyWaterGal.toLocaleString()} gal/d`,
          sub: `Ratio: ${hydrationSummary.avgHydrationRatio} L/kg (1.7-1.9 target)`,
          bg: [239, 246, 255],
          border: [191, 219, 254],
          titleRgb: [3, 105, 161],
          valRgb: [12, 74, 110],
        },
        {
          label: 'AVG SICK / CULLS',
          value: `${activeCycle?.avgSickChicks ?? 0}`,
          sub: 'Daily farm avg per house check',
          bg: [255, 251, 235],
          border: [253, 230, 138],
          titleRgb: [146, 64, 14],
          valRgb: [120, 53, 15],
        },
        {
          label: 'FCR & CATCH WEIGHT',
          value: `${activeCycle?.fcr ?? 0} FCR`,
          sub: `Avg Final: ${activeCycle?.avgCatchWeightGrams ?? 0}g`,
          bg: [240, 249, 255],
          border: [186, 230, 253],
          titleRgb: [7, 89, 133],
          valRgb: [12, 74, 110],
        },
      ];

      const kpiGap = 4;
      const kpiW = (contentW - kpiGap * (kpiCards.length - 1)) / kpiCards.length;
      const kpiY = 28;
      const kpiH = 26;

      kpiCards.forEach((card, i) => {
        const cx = marginX + i * (kpiW + kpiGap);
        pdf.setFillColor(...card.bg);
        pdf.setDrawColor(...card.border);
        pdf.setLineWidth(0.35);
        pdf.roundedRect(cx, kpiY, kpiW, kpiH, 2.5, 2.5, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.8);
        pdf.setTextColor(...card.titleRgb);
        pdf.text(card.label, cx + 3.2, kpiY + 5.8);

        pdf.setFontSize(12.5);
        pdf.setTextColor(...card.valRgb);
        pdf.text(card.value, cx + 3.2, kpiY + 14.5, { maxWidth: kpiW - 6 });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.8);
        pdf.setTextColor(71, 85, 105);
        pdf.text(card.sub, cx + 3.2, kpiY + 21.5, { maxWidth: kpiW - 6 });
      });

      // Vector Multi-House Performance Scorecard Table
      let curY = 61;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(
        `Multi-House Performance Scorecard (${scorecardRows.length} Selected House${
          scorecardRows.length === 1 ? '' : 's'
        })`,
        marginX,
        curY
      );

      curY += 3.5;

      // Exact column widths summing to 277mm (contentW)
      const cols = [
        { key: 'name', label: 'House', w: 34, align: 'left' },
        { key: 'phaseLabel', label: 'Phase / Day', w: 33, align: 'left' },
        { key: 'activeBirds', label: 'Active Birds', w: 23, align: 'right' },
        { key: 'mortalityPct', label: 'Mort %', w: 17, align: 'right' },
        { key: 'fcr', label: 'FCR', w: 15, align: 'right' },
        { key: 'estWeight', label: 'Est Wt', w: 21, align: 'right' },
        { key: 'feedModeLabel', label: 'Feed Mode', w: 26, align: 'left' },
        { key: 'avgTempC', label: 'Temp', w: 18, align: 'right' },
        { key: 'rhPct', label: 'RH %', w: 15, align: 'right' },
        { key: 'co2Ppm', label: 'CO2 ppm', w: 23, align: 'right' },
        { key: 'negPressurePa', label: 'Neg Pa', w: 21, align: 'right' },
        { key: 'envStatus', label: 'Env Status', w: 31, align: 'center' },
      ];

      const drawScorecardTableHeader = (yPos) => {
        pdf.setFillColor(15, 23, 42);
        pdf.rect(marginX, yPos, contentW, 8.5, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.4);
        pdf.setTextColor(255, 255, 255);
        let colX = marginX;
        cols.forEach((col) => {
          const tx =
            col.align === 'right'
              ? colX + col.w - 2.2
              : col.align === 'center'
              ? colX + col.w / 2
              : colX + 2.2;
          pdf.text(col.label, tx, yPos + 5.7, { align: col.align });
          colX += col.w;
        });
        return yPos + 8.5;
      };

      curY = drawScorecardTableHeader(curY);

      if (scorecardRows.length === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(226, 232, 240);
        pdf.rect(marginX, curY, contentW, 12, 'FD');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(100, 116, 139);
        pdf.text(
          'No houses selected. Select houses in the House Scope filter to populate scorecard metrics.',
          pageW / 2,
          curY + 7.5,
          { align: 'center' }
        );
        curY += 12;
      } else {
        scorecardRows.forEach((row, rIdx) => {
          if (curY > 184) {
            pdf.addPage('a4', 'landscape');
            pdf.setFillColor(6, 78, 59);
            pdf.rect(0, 0, pageW, 15, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10.5);
            pdf.text('AlReefi Farm Management - Multi-House Scorecard (Continued)', marginX, 9.8);
            curY = drawScorecardTableHeader(19);
          }

          const rowH = 9.5;
          if (rIdx % 2 === 1) {
            pdf.setFillColor(248, 250, 252);
          } else {
            pdf.setFillColor(255, 255, 255);
          }
          pdf.setDrawColor(226, 232, 240);
          pdf.setLineWidth(0.2);
          pdf.rect(marginX, curY, contentW, rowH, 'FD');

          const cells = {
            name: toPdfSafeText(row.name),
            phaseLabel: toPdfSafeText(row.phaseLabel),
            activeBirds: row.activeBirds.toLocaleString(),
            mortalityPct: `${row.mortalityPct.toFixed(2)}%`,
            fcr: row.fcr !== null ? row.fcr.toFixed(2) : '-',
            estWeight: row.estWeightGrams ? `${row.estWeightGrams.toLocaleString()}g` : '-',
            feedModeLabel: toPdfSafeText(row.feedModeLabel),
            avgTempC: `${row.avgTempC.toFixed(1)}°C`,
            rhPct: `${row.rhPct}%`,
            co2Ppm: `${row.co2Ppm.toLocaleString()}`,
            negPressurePa: `${row.negPressurePa.toFixed(1)} Pa`,
          };

          let colX = marginX;
          cols.forEach((col) => {
            if (col.key === 'envStatus') {
              const statusColors = {
                OPTIMAL: { bg: [220, 252, 231], fg: [22, 101, 52] },
                ATTENTION: { bg: [254, 243, 199], fg: [146, 64, 14] },
                ALERT: { bg: [254, 226, 226], fg: [185, 28, 28] },
                CLEANING: { bg: [224, 242, 254], fg: [7, 89, 133] },
                INACTIVE: { bg: [226, 232, 240], fg: [71, 85, 105] },
              };
              const sc = statusColors[row.envStatus] || statusColors.INACTIVE;
              pdf.setFillColor(...sc.bg);
              pdf.roundedRect(colX + 3, curY + 2, col.w - 6, rowH - 4, 1.5, 1.5, 'F');
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(6.8);
              pdf.setTextColor(...sc.fg);
              pdf.text(row.envStatus, colX + col.w / 2, curY + 6, { align: 'center' });
            } else {
              pdf.setFont('helvetica', col.key === 'name' ? 'bold' : 'normal');
              pdf.setFontSize(7.4);
              pdf.setTextColor(30, 41, 59);
              const tx =
                col.align === 'right'
                  ? colX + col.w - 2.2
                  : col.align === 'center'
                  ? colX + col.w / 2
                  : colX + 2.2;
              pdf.text(String(cells[col.key] ?? ''), tx, curY + 6, {
                align: col.align,
                maxWidth: col.w - 4,
              });
            }
            colX += col.w;
          });

          curY += rowH;
        });

        // Summary Row for Selected Scope (dynamically aligned to column geometry)
        const colRects = {};
        let runX = marginX;
        cols.forEach((col) => {
          colRects[col.key] = { x: runX, w: col.w, endX: runX + col.w };
          runX += col.w;
        });

        const totalLiveBirds = scorecardRows.reduce((s, r) => s + r.activeBirds, 0);
        const avgMortPct = Number(
          (scorecardRows.reduce((s, r) => s + r.mortalityPct, 0) / scorecardRows.length).toFixed(2)
        );
        const activeFcrRows = scorecardRows.filter((r) => r.fcr !== null);
        const avgScopeFcr =
          activeFcrRows.length > 0
            ? (activeFcrRows.reduce((s, r) => s + r.fcr, 0) / activeFcrRows.length).toFixed(2)
            : '-';

        pdf.setFillColor(236, 253, 245);
        pdf.setDrawColor(167, 243, 208);
        pdf.rect(marginX, curY, contentW, 9, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.2);
        pdf.setTextColor(6, 78, 59);
        pdf.text(
          `Scope Averages / Totals (${scorecardRows.length} Houses)`,
          colRects.name.x + 2.2,
          curY + 5.8,
          { maxWidth: colRects.name.w + colRects.phaseLabel.w - 4 }
        );
        pdf.text(totalLiveBirds.toLocaleString(), colRects.activeBirds.endX - 2.2, curY + 5.8, { align: 'right' });
        pdf.text(`${avgMortPct.toFixed(2)}%`, colRects.mortalityPct.endX - 2.2, curY + 5.8, { align: 'right' });
        pdf.text(avgScopeFcr, colRects.fcr.endX - 2.2, curY + 5.8, { align: 'right' });
        pdf.text(`${climateSummary.avgTempC.toFixed(1)}°C`, colRects.avgTempC.endX - 2.2, curY + 5.8, { align: 'right' });
        pdf.text(`${climateSummary.avgRhPct}%`, colRects.rhPct.endX - 2.2, curY + 5.8, { align: 'right' });
        pdf.text(`${climateSummary.avgCo2Ppm.toLocaleString()}`, colRects.co2Ppm.endX - 2.2, curY + 5.8, { align: 'right' });
        pdf.text(`${climateSummary.avgPressurePa.toFixed(1)} Pa`, colRects.negPressurePa.endX - 2.2, curY + 5.8, { align: 'right' });
        pdf.text(
          climateSummary.alertCount === 0 ? 'ALL OPTIMAL' : `${climateSummary.alertCount} FLAGGED`,
          colRects.envStatus.x + colRects.envStatus.w / 2,
          curY + 5.8,
          { align: 'center' }
        );
        curY += 13;
      }

      // Operational & Contract Benchmark Insights Strip (when space remains on Page 1)
      if (curY + 28 <= 194) {
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(203, 213, 225);
        pdf.roundedRect(marginX, curY, contentW, 24, 2.5, 2.5, 'FD');

        const insightCols = [
          {
            title: 'ALAIN FARMS CONTRACT TARGETS',
            line1: `Catch Weight Band: ${state.settings?.contractRules?.targetWeightMinGrams || 1350}g - ${
              state.settings?.contractRules?.targetWeightMaxGrams || 1550
            }g`,
            line2: `Bonus FCR <= ${state.settings?.contractRules?.bonusFcrThreshold || 1.58}  |  Cycle Target: ${
              state.settings?.contractRules?.defaultTargetCycleDays || 35
            } Days`,
          },
          {
            title: 'HYDRATION & FEED BENCHMARKS',
            line1: `Healthy Broiler Ratio: 1.70 - 1.90 L/kg`,
            line2: `Cycle Avg Ratio: ${hydrationSummary.avgHydrationRatio} L/kg  |  Avg Water: ${hydrationSummary.avgDailyWaterGal.toLocaleString()} gal/d`,
          },
          {
            title: 'VENTILATION & AIR THRESHOLDS',
            line1: `CO2 Warning: >= 2,500 ppm  |  Alert: >= 3,000 ppm`,
            line2: `Static Neg Pressure: 18 - 38 Pa  |  NH3 Alert: >= 20 ppm`,
          },
        ];

        const icW = (contentW - 12) / 3;
        insightCols.forEach((ic, idx) => {
          const ix = marginX + 4 + idx * (icW + 2);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7.2);
          pdf.setTextColor(6, 95, 70);
          pdf.text(ic.title, ix, curY + 6.5);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.4);
          pdf.setTextColor(30, 41, 59);
          pdf.text(ic.line1, ix, curY + 13);
          pdf.text(ic.line2, ix, curY + 18.5);
        });
      }

      // ---------------------------------------------------------------------
      // PAGE 2+: Unclipped High-Resolution Chart Pages (2 Charts Per Page)
      // ---------------------------------------------------------------------
      const liveChartIds = Array.from(
        reportRef.current?.querySelectorAll('[data-pdf-chart-card]') || []
      ).map((el) => el.getAttribute('data-chart-id'));

      const offscreenCards = Array.from(
        pdfStageRef.current?.querySelectorAll('[data-pdf-export-card]') || []
      );

      // Preserve exact user-customized visible order
      const orderedOffscreenCards =
        liveChartIds.length > 0
          ? liveChartIds
              .map((id) => offscreenCards.find((el) => el.getAttribute('data-chart-id') === id))
              .filter(Boolean)
          : offscreenCards;

      for (let i = 0; i < orderedOffscreenCards.length; i += 1) {
        const cardEl = orderedOffscreenCards[i];
        const chartId = cardEl.getAttribute('data-chart-id');
        const meta = getChartMeta(chartId);

        if (i % 2 === 0) {
          pdf.addPage('a4', 'landscape');
          // Consistent Chart Page Header Banner
          pdf.setFillColor(6, 78, 59);
          pdf.rect(0, 0, pageW, 15, 'F');
          pdf.setFillColor(16, 185, 129);
          pdf.rect(0, 15, pageW, 0.9, 'F');

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.setTextColor(255, 255, 255);
          pdf.text(
            `AlReefi Farm Management - Telemetry & Visual Analytics (${activeCycleLabel})`,
            marginX,
            9.5
          );
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(209, 250, 229);
          pdf.text(`Scope: ${safeScope}`, pageW - marginX, 9.5, { align: 'right' });
        }

        const canvas = await renderChartCardToCanvas(cardEl, {
          title: meta.title,
          subtitle: meta.subtitle,
          badge: meta.badge,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const slotY = i % 2 === 0 ? 20 : 108;
        const targetH = Math.min(80, contentW * (canvas.height / canvas.width));
        pdf.addImage(imgData, 'JPEG', marginX, slotY, contentW, targetH, undefined, 'FAST');
      }

      // Stamp consistent Page X of Y footer across every page
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p += 1) {
        pdf.setPage(p);
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.line(marginX, pageH - 12, pageW - marginX, pageH - 12);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`Page ${p} of ${totalPages} • AlReefi Farm Management`, marginX, pageH - 6.5);
        pdf.text(
          `${isOwner ? 'Super Admin Executive Report' : 'Farm Manager Report'} • ${generatedAtStr}`,
          pageW - marginX,
          pageH - 6.5,
          { align: 'right' }
        );
      }

      const dateSlug = new Date().toISOString().slice(0, 10);
      const fileName = `AlReefi-Farm-Analytics-${dateSlug}.pdf`;
      pdf.save(fileName);
      notify(`Exported ${fileName} (${totalPages} pages) successfully.`, 'success');
    } catch (err) {
      console.error('[Analytics PDF Export]', err);
      notify(`PDF export error: ${err.message}`, 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (userRole === 'worker' || userRole === 'supervisor') {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800/95">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Analytics &amp; Financial Reports are restricted to Farm Manager and Super Admin roles.
        </p>
      </div>
    );
  }

  const activeGridClass =
    GRID_LAYOUT_OPTIONS.find((o) => o.id === workspace.gridColumns)?.className ||
    'grid-cols-1 lg:grid-cols-2';
  const activeHeightPx =
    CHART_DENSITY_OPTIONS.find((o) => o.id === workspace.chartHeight)?.heightPx || 300;
  const visibleWidgets = workspace.widgets.filter((w) => w.visible);
  const visibleChartWidgets = visibleWidgets.filter(
    (w) => w.id !== 'kpi-strip' && w.id !== 'house-scorecard'
  );

  // ---------------------------------------------------------------------------
  // Widget Renderers
  // ---------------------------------------------------------------------------
  const renderKpiStripWidget = (widget) => (
    <section
      key={widget.id}
      className={`${widget.span === 'full' ? 'col-span-full' : 'col-span-1'} space-y-4`}
    >
      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${
          isOwner ? 'xl:grid-cols-6' : 'xl:grid-cols-5'
        }`}
      >
        <div className="rounded-3xl border border-red-200 bg-red-50/90 p-4 shadow-sm dark:border-red-900/60 dark:bg-red-950/45">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-red-900 uppercase dark:text-red-200">
              Total Mortality Rate
            </p>
            <HeartPulse className="h-4 w-4 text-red-700 dark:text-red-400" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-red-700 dark:text-red-300">
            {activeCycle?.totalMortalityRate}%
          </p>
          <p className="mt-1 text-xs font-semibold text-red-800 dark:text-red-300/90">
            {compareCycle
              ? `vs ${compareCycle.totalMortalityRate}% (${compareCycle.name.split(' ')[1]})`
              : 'Within < 3.0% target'}
          </p>
        </div>

        {/* EXCLUSIVE TO SUPER ADMIN (OWNER) */}
        {isOwner && (
          <div className="rounded-3xl border border-emerald-300 bg-emerald-50/95 p-4 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/55">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold text-emerald-900 uppercase dark:text-emerald-200">
                Cycle Est. Profit (Super Admin)
              </p>
              <TrendingUp className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <p className="mt-1.5 text-2xl font-black text-emerald-900 dark:text-emerald-200">
              AED {Number(activeCycle?.estimatedProfitAed || 0).toLocaleString()}
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Gross Payout: AED {Number(activeCycle?.estimatedPayoutAed || 0).toLocaleString()}
            </p>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/95">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-slate-600 uppercase dark:text-slate-300">
              Feed Consumption
            </p>
            <Wheat className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-slate-900 dark:text-white">
            {activeCycle?.totalFeedTons} <span className="text-sm font-bold">Tons</span>
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {Math.round((activeCycle?.totalFeedTons || 0) * 20).toLocaleString()} × 50kg Bags
          </p>
        </div>

        <div className="rounded-3xl border border-blue-200 bg-blue-50/90 p-4 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/45">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-blue-900 uppercase dark:text-blue-200">
              Water &amp; Hydration
            </p>
            <Droplets className="h-4 w-4 text-blue-700 dark:text-blue-400" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-blue-900 dark:text-blue-200">
            {hydrationSummary.avgDailyWaterGal.toLocaleString()}{' '}
            <span className="text-sm font-bold">gal/d</span>
          </p>
          <p className="mt-1 text-xs font-semibold text-blue-800 dark:text-blue-300">
            Ratio: {hydrationSummary.avgHydrationRatio} L/kg (Target 1.7–1.9)
          </p>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/55">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-amber-900 uppercase dark:text-amber-200">
              Avg Sick / Culls
            </p>
            <FileText className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-amber-900 dark:text-amber-200">
            {activeCycle?.avgSickChicks}
          </p>
          <p className="mt-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
            Daily farm average per house check
          </p>
        </div>

        <div className="rounded-3xl border border-sky-200 bg-sky-50/90 p-4 shadow-sm dark:border-sky-800 dark:bg-sky-950/55">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-sky-900 uppercase dark:text-sky-200">
              FCR &amp; Catch Weight
            </p>
            <Scale className="h-4 w-4 text-sky-700 dark:text-sky-400" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-sky-900 dark:text-sky-200">
            {activeCycle?.fcr} <span className="text-sm font-bold text-sky-700 dark:text-sky-300">FCR</span>
          </p>
          <p className="mt-1 text-xs font-semibold text-sky-800 dark:text-sky-300">
            Avg Final Weight: {activeCycle?.avgCatchWeightGrams}g
          </p>
        </div>
      </div>

      {/* Live Climate & Ventilation Metrics Snapshot Bar */}
      {selectedHouses.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-xs sm:grid-cols-3 lg:grid-cols-6 dark:border-slate-700 dark:bg-slate-800/90">
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900/70">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase dark:text-slate-400">
              Avg Interior Temp
            </p>
            <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">
              {climateSummary.avgTempC.toFixed(1)}°C
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900/70">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase dark:text-slate-400">
              UAE Exterior Heat
            </p>
            <p className="text-sm font-black text-red-600 dark:text-red-400">
              {climateSummary.outsideTempC.toFixed(1)}°C
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900/70">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase dark:text-slate-400">
              Avg Relative Humidity
            </p>
            <p className="text-sm font-black text-sky-700 dark:text-sky-400">
              {climateSummary.avgRhPct}% RH
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900/70">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase dark:text-slate-400">
              Avg CO₂ Level
            </p>
            <p
              className={`text-sm font-black ${
                climateSummary.avgCo2Ppm >= 3000
                  ? 'text-red-600 dark:text-red-400'
                  : climateSummary.avgCo2Ppm >= 2500
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {climateSummary.avgCo2Ppm.toLocaleString()} ppm
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900/70">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase dark:text-slate-400">
              Avg Neg Pressure
            </p>
            <p className="text-sm font-black text-teal-700 dark:text-teal-400">
              {climateSummary.avgPressurePa.toFixed(1)} Pa
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900/70">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase dark:text-slate-400">
              Avg NH₃ &amp; Env Flags
            </p>
            <p className="text-sm font-black text-slate-900 dark:text-slate-100">
              {climateSummary.avgNh3Ppm} ppm •{' '}
              <span
                className={
                  climateSummary.alertCount > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                }
              >
                {climateSummary.alertCount === 0 ? 'Optimal' : `${climateSummary.alertCount} Flagged`}
              </span>
            </p>
          </div>
        </div>
      )}
    </section>
  );

  const renderScorecardWidget = (widget) => (
    <section
      key={widget.id}
      className={`${
        widget.span === 'full' ? 'col-span-full' : 'col-span-1'
      } rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
            <Table2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            Multi-House Comparative Scorecard
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Side-by-side flock inventory, FCR, feed delivery mode, and live climate sensors for selected houses
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
          {scorecardRows.length} Selected House{scorecardRows.length === 1 ? '' : 's'}
        </span>
      </div>

      {scorecardRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/60">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            No houses selected in the House Scope filter.
          </p>
          <button
            type="button"
            onClick={handleSelectAllActive}
            className="rounded-full bg-emerald-800 px-4 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-900"
          >
            Select All Active Houses
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="min-w-[960px] w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-[11px] font-extrabold tracking-wide text-white uppercase dark:bg-slate-950">
                <th className="px-3 py-2.5">House</th>
                <th className="px-3 py-2.5">Phase / Day</th>
                <th className="px-3 py-2.5 text-right">Active Birds</th>
                <th className="px-3 py-2.5 text-right">Mortality %</th>
                <th className="px-3 py-2.5 text-right">FCR</th>
                <th className="px-3 py-2.5 text-right">Est Weight</th>
                <th className="px-3 py-2.5">Feed Mode</th>
                <th className="px-3 py-2.5 text-right">Temp °C</th>
                <th className="px-3 py-2.5 text-right">RH %</th>
                <th className="px-3 py-2.5 text-right">CO₂ ppm</th>
                <th className="px-3 py-2.5 text-right">Neg Pressure</th>
                <th className="px-3 py-2.5 text-center">Env Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {scorecardRows.map((row, idx) => {
                const statusBadgeClass =
                  row.envStatus === 'OPTIMAL'
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200'
                    : row.envStatus === 'ATTENTION'
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200'
                    : row.envStatus === 'ALERT'
                    ? 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-200'
                    : row.envStatus === 'CLEANING'
                    ? 'bg-sky-100 text-sky-900 dark:bg-sky-900/50 dark:text-sky-200'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300';

                return (
                  <tr
                    key={row.id}
                    className={
                      idx % 2 === 1
                        ? 'bg-slate-50/85 dark:bg-slate-900/55'
                        : 'bg-white dark:bg-slate-800/60'
                    }
                  >
                    <td className="px-3 py-2.5 font-extrabold text-slate-900 dark:text-white">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: row.color }}
                        />
                        {row.name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">
                      {row.phaseLabel}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                      {row.activeBirds.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-800 dark:text-slate-200">
                      {row.mortalityPct.toFixed(2)}%
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-800 dark:text-slate-200">
                      {row.fcr !== null ? row.fcr.toFixed(2) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-emerald-800 dark:text-emerald-300">
                      {row.estWeightGrams ? `${row.estWeightGrams.toLocaleString()}g` : '—'}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">
                      {row.feedModeLabel}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-800 dark:text-slate-200">
                      {row.avgTempC.toFixed(1)}°C
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-sky-800 dark:text-sky-300">
                      {row.rhPct}%
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-bold ${
                        row.co2Ppm >= 3000
                          ? 'text-red-700 dark:text-red-400'
                          : row.co2Ppm >= 2500
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {row.co2Ppm.toLocaleString()} ppm
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-bold ${
                        row.negPressurePa < 18 || row.negPressurePa > 38
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {row.negPressurePa.toFixed(1)} Pa
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        title={row.envReasons.join(' • ')}
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${statusBadgeClass}`}
                      >
                        {row.envStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  const renderChartWidgetCard = (widget) => {
    const meta = getChartMeta(widget.id);
    const isCustom = widget.id === 'custom-builder';
    const chartMode = isCustom ? workspace.customBuilder.chartType : widget.chartType;

    const iconMap = {
      'temp-4zone': <ThermometerIcon />,
      'co2-pressure': <Wind className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />,
      'humidity-rh': <Droplets className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
      mortality: <HeartPulse className="h-4 w-4 text-red-600 dark:text-red-400" />,
      'weekly-weight': <Scale className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />,
      'feed-hydration': <Wheat className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
      'custom-builder': <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
    };

    return (
      <section
        key={widget.id}
        data-pdf-chart-card="true"
        data-chart-id={widget.id}
        data-chart-title={meta.title}
        data-chart-subtitle={meta.subtitle}
        data-chart-badge={meta.badge}
        className={`${
          widget.span === 'full' ? 'col-span-full' : 'col-span-1'
        } rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95`}
      >
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
              {iconMap[widget.id]}
              <span className="truncate">{meta.title}</span>
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{meta.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {meta.badge && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
                {widget.id === 'co2-pressure' && <Gauge className="h-3.5 w-3.5" />}
                {meta.badge}
              </span>
            )}

            {/* Quick per-card style selector */}
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900">
              {CHART_STYLE_OPTIONS.map((opt) => {
                const active = chartMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateWidgetConfig(widget.id, () => ({ chartType: opt.id }))}
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold transition ${
                      active
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Interactive Controls for Custom Metric Correlation Builder */}
        {isCustom && (
          <div className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-3.5 md:grid-cols-2 xl:grid-cols-4 dark:border-slate-700 dark:bg-slate-900/70">
            <div>
              <label className="mb-1 block text-[10px] font-extrabold text-slate-600 uppercase dark:text-slate-300">
                Left Y-Axis Metric
              </label>
              <select
                value={workspace.customBuilder.leftMetric}
                onChange={(e) => updateCustomBuilder({ leftMetric: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {CUSTOM_METRICS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold text-slate-600 uppercase dark:text-slate-300">
                Right Y-Axis Metric
              </label>
              <select
                value={workspace.customBuilder.rightMetric}
                onChange={(e) => updateCustomBuilder({ rightMetric: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {CUSTOM_METRICS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-extrabold text-slate-600 uppercase dark:text-slate-300">
                Chart Type
              </label>
              <div className="flex gap-1.5">
                {CHART_STYLE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = workspace.customBuilder.chartType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateCustomBuilder({ chartType: opt.id })}
                      className={`inline-flex flex-1 items-center justify-center gap-1 rounded-xl border px-2 py-1.5 text-xs font-extrabold transition ${
                        active
                          ? 'border-emerald-800 bg-emerald-800 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase dark:text-slate-300">
                  Cycle Day Range (1–35)
                </label>
                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                  D{workspace.customBuilder.startDay} – D{workspace.customBuilder.endDay}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={35}
                  value={workspace.customBuilder.startDay}
                  onChange={(e) =>
                    updateCustomBuilder({
                      startDay: Math.max(1, Math.min(35, Number(e.target.value) || 1)),
                    })
                  }
                  aria-label="Start cycle day"
                  className="w-14 rounded-xl border border-slate-200 bg-white px-2 py-1 text-center text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <span className="text-xs font-bold text-slate-400">to</span>
                <input
                  type="number"
                  min={1}
                  max={35}
                  value={workspace.customBuilder.endDay}
                  onChange={(e) =>
                    updateCustomBuilder({
                      endDay: Math.max(1, Math.min(35, Number(e.target.value) || 35)),
                    })
                  }
                  aria-label="End cycle day"
                  className="w-14 rounded-xl border border-slate-200 bg-white px-2 py-1 text-center text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                {[
                  { label: '1–35', start: 1, end: 35 },
                  { label: '1–7', start: 1, end: 7 },
                  { label: '8–21', start: 8, end: 21 },
                  { label: '22–35', start: 22, end: 35 },
                ].map((rng) => {
                  const active =
                    workspace.customBuilder.startDay === rng.start &&
                    workspace.customBuilder.endDay === rng.end;
                  return (
                    <button
                      key={rng.label}
                      type="button"
                      onClick={() => updateCustomBuilder({ startDay: rng.start, endDay: rng.end })}
                      className={`rounded-lg border px-1.5 py-1 text-[10px] font-extrabold transition ${
                        active
                          ? 'border-emerald-700 bg-emerald-800 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      D{rng.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="w-full" style={{ height: `${activeHeightPx}px` }}>
          {renderChartById(widget.id, chartMode, { forPdf: false })}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6">
      {/* Primary Cycle, Multi-House Filter & PDF Export Header */}
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Performance Analytics, Multi-House Overlay &amp; PDF Export
            </h2>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {isOwner
                ? 'Super Admin View: Full operational, hydration, air quality & Alain Farms AED financial analytics'
                : 'Manager View: Operational health, hydration, CO₂/pressure contrast & weight benchmarks'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900">
              <Layers className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              <select
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className="rounded-lg bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none dark:bg-slate-900 dark:text-slate-100"
              >
                {cycles.map((c) => (
                  <option key={c.cycleId} value={c.cycleId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={compareCycleId}
              onChange={(e) => setCompareCycleId(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="none">No Cycle Comparison</option>
              {cycles
                .filter((c) => c.cycleId !== selectedCycleId)
                .map((c) => (
                  <option key={c.cycleId} value={c.cycleId}>
                    Compare vs. {c.name}
                  </option>
                ))}
            </select>

            <button
              type="button"
              disabled={isExportingPdf}
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-900 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {isExportingPdf ? 'Generating A4 PDF...' : 'Export PDF Report'}
            </button>
          </div>
        </div>

        {/* Multi-House Searchable Dropdown Overlay Filter */}
        <div className="flex flex-col justify-between gap-4 border-t border-slate-100 pt-4 xl:flex-row xl:items-center dark:border-slate-700">
          <div className="relative space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] font-extrabold text-slate-600 uppercase dark:text-slate-300">
                <CheckSquare className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                House Scope:
              </span>

              <button
                type="button"
                onClick={() => setIsHouseDropdownOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50/90 px-3.5 py-2 text-xs font-extrabold text-emerald-950 shadow-xs transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
              >
                <span>
                  {selectedHouses.length === 0
                    ? 'Select Houses...'
                    : selectedHouses.length <= 2
                    ? selectedHouses.map((h) => h.name).join(', ')
                    : `${selectedHouses.length} of ${allOverlayHouses.length} Houses Selected`}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isHouseDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={handleSelectAllActive}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                Select All Active
              </button>
              <button
                type="button"
                onClick={handleSelectSameDayPlaced}
                className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-extrabold text-sky-900 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
              >
                Same-Day H1 &amp; H5
              </button>
              <button
                type="button"
                onClick={handleClearHouses}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Clear
              </button>
            </div>

            {selectedHouses.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedHouses.map((h) => (
                  <span
                    key={h.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: h.color }}
                    />
                    {h.name}
                    <button
                      type="button"
                      onClick={() => toggleHouseSelection(h.id)}
                      aria-label={`Remove ${h.name}`}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {isHouseDropdownOpen && (
              <div className="absolute top-11 left-0 z-30 w-80 max-w-[90vw] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={houseDropdownSearch}
                      onChange={(e) => setHouseDropdownSearch(e.target.value)}
                      placeholder="Search house name or code..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pr-2.5 pl-8 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsHouseDropdownOpen(false)}
                    className="rounded-xl bg-emerald-800 px-3 py-1.5 text-[11px] font-extrabold text-white"
                  >
                    Done
                  </button>
                </div>

                <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                  {allOverlayHouses
                    .filter((h) => {
                      const q = houseDropdownSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        h.name.toLowerCase().includes(q) ||
                        String(h.code || '').toLowerCase().includes(q)
                      );
                    })
                    .map((h, idx) => {
                      const checked = selectedHouseIds.includes(h.id);
                      const swatch = HOUSE_PALETTE[idx % HOUSE_PALETTE.length];
                      return (
                        <label
                          key={h.id}
                          className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-bold transition ${
                            checked
                              ? 'bg-emerald-50 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-200'
                              : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleHouseSelection(h.id)}
                              className="h-4 w-4 accent-emerald-800"
                            />
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: swatch }}
                            />
                            <span>{h.name}</span>
                          </div>
                          {h.isActive === false ? (
                            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                              Inactive
                            </span>
                          ) : h.phase === 'cleaning' ? (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                              Cleaning
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                              Active
                            </span>
                          )}
                        </label>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Visible Widgets: {visibleWidgets.length}/{workspace.widgets.length}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
              PDF Format: A4 Landscape (Vector + 2 Charts/Page)
            </span>
          </div>
        </div>

        {/* Workspace & Layout Customizer Bar */}
        <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-700">
          <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
            {/* 1-Click Workspace Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 flex items-center gap-1 text-[11px] font-extrabold text-slate-600 uppercase dark:text-slate-300">
                <LayoutGrid className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                Workspace Presets:
              </span>
              {WORKSPACE_PRESETS.map((preset) => {
                const active = workspace.activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyWorkspacePreset(preset.id)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                      active
                        ? 'bg-emerald-800 text-white shadow-sm'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
              {workspace.activePreset === 'custom' && (
                <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-black text-purple-800 uppercase dark:bg-purple-950/60 dark:text-purple-200">
                  Custom Layout
                </span>
              )}
            </div>

            {/* Grid Columns, Chart Height Density & Customize Widgets Drawer Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Grid Column Layout */}
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900">
                <span className="px-2 text-[10px] font-extrabold text-slate-500 uppercase dark:text-slate-400">
                  Grid
                </span>
                {GRID_LAYOUT_OPTIONS.map((opt) => {
                  const active = workspace.gridColumns === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setWorkspace((prev) => ({
                          ...prev,
                          gridColumns: opt.id,
                        }))
                      }
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold transition ${
                        active
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                      }`}
                    >
                      {opt.id === '2' && <Columns2 className="h-3 w-3" />}
                      {opt.id === '3' && <Columns3 className="h-3 w-3" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Chart Height Density */}
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900">
                <span className="px-2 text-[10px] font-extrabold text-slate-500 uppercase dark:text-slate-400">
                  Height
                </span>
                {CHART_DENSITY_OPTIONS.map((opt) => {
                  const active = workspace.chartHeight === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setWorkspace((prev) => ({
                          ...prev,
                          chartHeight: opt.id,
                        }))
                      }
                      className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold transition ${
                        active
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                      }`}
                    >
                      {opt.label} ({opt.heightPx}px)
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setIsCustomizeOpen((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-extrabold transition ${
                  isCustomizeOpen
                    ? 'border-emerald-800 bg-emerald-800 text-white'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Customize Widgets &amp; Order
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    isCustomizeOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Expandable Customize Widgets & Order Panel */}
          {isCustomizeOpen && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/75">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase dark:text-white">
                    Widget Visibility, Order, Width Span &amp; Per-Chart Style
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    All layout changes save automatically to your browser workspace.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetLayout}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Layout
                </button>
              </div>

              <div className="space-y-2">
                {workspace.widgets.map((w, idx) => {
                  const def = WIDGET_CATALOG.find((item) => item.id === w.id);
                  if (!def) return null;
                  const isChart = def.kind === 'chart';

                  return (
                    <div
                      key={w.id}
                      className={`flex flex-col justify-between gap-3 rounded-2xl border px-3.5 py-2.5 sm:flex-row sm:items-center ${
                        w.visible
                          ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                          : 'border-slate-200/70 bg-slate-100/70 opacity-75 dark:border-slate-800 dark:bg-slate-900/50'
                      }`}
                    >
                      <label className="flex cursor-pointer items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={w.visible}
                          onChange={(e) =>
                            updateWidgetConfig(w.id, () => ({ visible: e.target.checked }))
                          }
                          className="mt-0.5 h-4 w-4 accent-emerald-800"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                              {idx + 1}. {def.label}
                            </span>
                            {w.visible ? (
                              <Eye className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <EyeOff className="h-3 w-3 text-slate-400" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {def.description}
                          </p>
                        </div>
                      </label>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Move Up / Move Down */}
                        <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveWidgetOrder(w.id, 'up')}
                            title="Move Up"
                            aria-label={`Move ${def.label} up`}
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-white disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === workspace.widgets.length - 1}
                            onClick={() => moveWidgetOrder(w.id, 'down')}
                            title="Move Down"
                            aria-label={`Move ${def.label} down`}
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-white disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Width Span Toggle: Card vs Full Width */}
                        <button
                          type="button"
                          onClick={() =>
                            updateWidgetConfig(w.id, (cur) => ({
                              span: cur.span === 'full' ? 'card' : 'full',
                            }))
                          }
                          className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-extrabold transition ${
                            w.span === 'full'
                              ? 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200'
                              : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                          }`}
                        >
                          {w.span === 'full' ? (
                            <>
                              <Maximize2 className="h-3 w-3" />
                              Full Width
                            </>
                          ) : (
                            <>
                              <Minimize2 className="h-3 w-3" />
                              Card
                            </>
                          )}
                        </button>

                        {/* Per-Chart Style Selector (Line / Area / Bar) */}
                        {isChart ? (
                          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900">
                            {CHART_STYLE_OPTIONS.map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() =>
                                  updateWidgetConfig(w.id, () => ({ chartType: opt.id }))
                                }
                                className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition ${
                                  w.chartType === opt.id
                                    ? 'bg-emerald-800 text-white'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                            {def.kind === 'kpi' ? 'KPI Cards' : 'Scorecard Table'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customizable Analytics Grid */}
      <div id="analytics-pdf-capture" ref={reportRef} className={`grid gap-6 ${activeGridClass}`}>
        {visibleWidgets.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white/95 p-10 text-center dark:border-slate-700 dark:bg-slate-800/95">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              All widgets are currently hidden.
            </p>
            <button
              type="button"
              onClick={handleResetLayout}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-900"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore Complete Analytics Layout
            </button>
          </div>
        ) : (
          visibleWidgets.map((widget) => {
            if (widget.id === 'kpi-strip') return renderKpiStripWidget(widget);
            if (widget.id === 'house-scorecard') return renderScorecardWidget(widget);
            return renderChartWidgetCard(widget);
          })
        )}
      </div>

      {/* Offscreen Standardized Light-Mode Recharts Stage for Crisp Multi-Page A4 PDF Export */}
      {isExportingPdf && (
        <div
          ref={pdfStageRef}
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: '-14000px',
            top: 0,
            width: '1248px',
            pointerEvents: 'none',
            backgroundColor: '#ffffff',
            color: '#0f172a',
          }}
        >
          {visibleChartWidgets.map((widget) => (
            <div
              key={`pdf-${widget.id}`}
              data-pdf-export-card="true"
              data-chart-id={widget.id}
              style={{ width: '1200px', backgroundColor: '#ffffff', color: '#0f172a' }}
            >
              {renderChartById(
                widget.id,
                widget.id === 'custom-builder'
                  ? workspace.customBuilder.chartType
                  : widget.chartType,
                { forPdf: true, pdfW: 1200, pdfH: 250 }
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThermometerIcon() {
  return <Activity className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />;
}
