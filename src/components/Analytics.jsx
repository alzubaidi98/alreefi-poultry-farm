import { useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CheckSquare,
  ChevronDown,
  Columns2,
  Download,
  Droplets,
  FileText,
  Gauge,
  HeartPulse,
  Layers,
  Scale,
  Search,
  TrendingUp,
  Wheat,
  Wind,
  X,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useFarm } from '../App.jsx';

const HOUSE_PALETTE = ['#065f46', '#0284c7', '#d97706', '#9333ea', '#dc2626', '#0f766e'];

const CHART_STYLES = [
  { id: 'line', label: 'Linear / Line' },
  { id: 'bar', label: 'Bar Chart' },
  { id: 'area', label: 'Area Chart' },
  { id: 'side-by-side', label: 'Side-by-Side Pair' },
];

/**
 * Converts modern CSS color functions (oklch, oklab, color-mix, lch, lab, color()) to standard rgba()
 * using an offscreen Canvas 2D pixel probe.
 */
function createCssColorSanitizer(doc) {
  const probeCanvas = doc.createElement('canvas');
  probeCanvas.width = 1;
  probeCanvas.height = 1;
  const ctx = probeCanvas.getContext('2d', { willReadFrequently: true });

  const cssColorToRgba = (cssExpr) => {
    try {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.fillStyle = cssExpr;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      if (a === 0) return 'rgba(0, 0, 0, 0)';
      return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
    } catch {
      return 'rgba(15, 23, 42, 1)';
    }
  };

  let combinedCss = '';
  try {
    Array.from(doc.styleSheets).forEach((sheet) => {
      try {
        Array.from(sheet.cssRules || []).forEach((rule) => {
          combinedCss += `${rule.cssText}\n`;
        });
      } catch {
        // Ignore cross-origin sheets if any
      }
    });
  } catch {
    // Fallback if styleSheets inaccessible
  }

  const cssVars = {};
  const varRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;{}]+);/g;
  let varMatch;
  while ((varMatch = varRegex.exec(combinedCss)) !== null) {
    cssVars[varMatch[1].trim()] = varMatch[2].trim();
  }

  const resolveVars = (expr, depth = 0) => {
    if (depth > 4 || !expr.includes('var(')) return expr;
    return expr.replace(/var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*([^)]+))?\)/g, (_, name, fallback) => {
      const resolved = cssVars[name] ?? fallback ?? 'transparent';
      return resolveVars(resolved, depth + 1);
    });
  };

  const replaceModernColorFunctions = (inputText) => {
    if (!inputText) return inputText;
    const targets = ['color-mix(', 'oklch(', 'oklab(', 'lch(', 'lab(', 'color('];
    let out = '';
    let i = 0;

    while (i < inputText.length) {
      const prevChar = i > 0 ? inputText[i - 1] : ' ';
      const isBoundary = !/[a-z0-9_-]/i.test(prevChar);
      const lowerSlice = inputText.slice(i, i + 12).toLowerCase();
      const matchedPrefix = isBoundary
        ? targets.find((prefix) => lowerSlice.startsWith(prefix))
        : null;
      if (!matchedPrefix) {
        out += inputText[i];
        i += 1;
        continue;
      }

      let depth = 0;
      let j = i;
      while (j < inputText.length) {
        if (inputText[j] === '(') depth += 1;
        else if (inputText[j] === ')') {
          depth -= 1;
          if (depth === 0) {
            j += 1;
            break;
          }
        }
        j += 1;
      }

      const rawExpr = inputText.slice(i, j);
      const resolvedExpr = resolveVars(rawExpr);
      out += cssColorToRgba(resolvedExpr);
      i = j;
    }

    return out;
  };

  return { combinedCss, replaceModernColorFunctions };
}

/**
 * Temporarily swaps live Tailwind v4 stylesheets with a sanitized rgba() stylesheet BEFORE calling
 * html2canvas so html2canvas never parses oklch/oklab rules from linked stylesheets.
 */
function prepareSanitizedStylesheetsBeforeCapture() {
  const { combinedCss, replaceModernColorFunctions } = createCssColorSanitizer(document);
  if (!combinedCss) return () => {};

  const sanitizedCss = replaceModernColorFunctions(combinedCss);
  const originalSheetEls = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(
    (el) => ({
      el,
      wasDisabled: Boolean(el.disabled),
    })
  );

  originalSheetEls.forEach(({ el }) => {
    el.disabled = true;
  });

  const safeStyleEl = document.createElement('style');
  safeStyleEl.id = 'alreefi-pdf-sanitized-css';
  safeStyleEl.textContent = sanitizedCss;
  document.head.appendChild(safeStyleEl);

  return () => {
    safeStyleEl.remove();
    originalSheetEls.forEach(({ el, wasDisabled }) => {
      el.disabled = wasDisabled;
    });
  };
}

function sanitizeClonedNodeColors(clonedDoc, containerEl) {
  const { replaceModernColorFunctions } = createCssColorSanitizer(clonedDoc);
  const nodesToCheck = [
    clonedDoc.documentElement,
    clonedDoc.body,
    ...(containerEl ? [containerEl, ...containerEl.querySelectorAll('*')] : []),
  ].filter(Boolean);

  const colorProps = [
    'color',
    'backgroundColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'outlineColor',
    'fill',
    'stroke',
    'boxShadow',
    'backgroundImage',
  ];

  nodesToCheck.forEach((node) => {
    const computed = clonedDoc.defaultView?.getComputedStyle(node);
    if (!computed) return;
    colorProps.forEach((prop) => {
      const val = computed[prop];
      if (
        val &&
        (val.includes('oklch') || val.includes('oklab') || val.includes('color-mix') || val.includes('color('))
      ) {
        node.style[prop] = replaceModernColorFunctions(val);
      }
    });
  });
}

function getHouseFactor(house, index, cycle) {
  const explicitOffset = cycle?.houseOffsets?.[house.id];
  if (explicitOffset) return explicitOffset;

  const factors = [
    { tempOffset: -0.5, mortMult: 0.85, feedMult: 0.24, co2Offset: -180, pressureOffset: 2, weightMult: 1.02 },
    { tempOffset: 0.4, mortMult: 1.05, feedMult: 0.27, co2Offset: 260, pressureOffset: -2, weightMult: 1.01 },
    { tempOffset: 1.2, mortMult: 1.26, feedMult: 0.25, co2Offset: 540, pressureOffset: -6, weightMult: 0.96 },
    { tempOffset: 0.1, mortMult: 0.94, feedMult: 0.23, co2Offset: -110, pressureOffset: 1, weightMult: 1.0 },
    { tempOffset: -0.3, mortMult: 0.89, feedMult: 0.25, co2Offset: -210, pressureOffset: 3, weightMult: 1.03 },
    { tempOffset: 0.6, mortMult: 1.12, feedMult: 0.22, co2Offset: 120, pressureOffset: -1, weightMult: 0.98 },
  ];
  return factors[index % factors.length];
}

export default function Analytics() {
  const { state, userRole, visibleHouses, notify } = useFarm();
  const reportRef = useRef(null);

  const isOwner = userRole === 'owner';
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
  const [chartStyle, setChartStyle] = useState('line'); // 'line' | 'bar' | 'area' | 'side-by-side'
  const [isExportingPdf, setIsExportingPdf] = useState(false);

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
    return (activeCycle.dailySeries || []).map((pt, idx) => {
      const compPt =
        compareCycle?.dailySeries?.find((d) => d.day === pt.day) ??
        compareCycle?.dailySeries?.[idx];
      const baseCo2 = pt.co2Ppm ?? Math.round(1450 + pt.day * 42 + (pt.day % 5) * 65);
      const basePressure = pt.negativePressurePa ?? Number((28 - pt.day * 0.18 + Math.sin(pt.day) * 2.2).toFixed(1));
      const baseHumidity = Math.round(
        Number(
          pt.humidityPct ??
            pt.humidity ??
            54 + pt.day * 0.25 + Math.sin(pt.day * 0.7) * 4
        )
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
      const compHumidityVal = compPt
        ? Math.round(
            Number(
              compPt.humidityPct ??
                compPt.humidity ??
                56 + (compPt.day || pt.day) * 0.22 + Math.cos((compPt.day || pt.day) * 0.65) * 4
            )
          )
        : null;

      const row = {
        ...pt,
        avgTempC: avgTempVal,
        humidityPct: baseHumidity,
        outsideTemp: pt.outsideTemp,
        co2Ppm: baseCo2,
        negativePressurePa: basePressure,
        compareMortality: compPt ? compPt.mortalities : null,
        compareWeightGrams: compPt ? compPt.avgWeightGrams : null,
        compareAvgTempC: compAvgTempVal,
        compareHumidityPct: compHumidityVal,
      };

      selectedHouses.forEach((h) => {
        const directHousePt = activeCycle.byHouseSeries?.[h.id]?.[idx];
        const factor = getHouseFactor(h, h.idx, activeCycle);

        const startT = directHousePt?.startTemp ?? Number((pt.startTemp + factor.tempOffset).toFixed(1));
        const midT = directHousePt?.middleTemp ?? Number((pt.middleTemp + factor.tempOffset).toFixed(1));
        const endT = directHousePt?.endTemp ?? Number((pt.endTemp + factor.tempOffset).toFixed(1));
        const avgT = Number(((startT + midT + endT) / 3).toFixed(1));
        const co2Val = directHousePt?.co2Ppm ?? Math.max(900, Math.round(baseCo2 + (factor.co2Offset || 0)));
        const pressVal =
          directHousePt?.negativePressurePa ??
          Math.max(10, Number((basePressure + (factor.pressureOffset || 0)).toFixed(1)));
        const nh3Val =
          directHousePt?.ammoniaPpm ??
          Number(Math.max(2, pt.ammoniaPpm + factor.tempOffset * 1.6).toFixed(1));
        const humVal =
          directHousePt?.humidityPct ??
          Math.min(78, Math.max(40, Math.round(baseHumidity + factor.tempOffset * 2)));
        const mortVal = directHousePt?.mortalities ?? Math.round(pt.mortalities * factor.mortMult);
        const cullVal = directHousePt?.culls ?? Math.round(pt.culls * factor.mortMult);
        const weightVal =
          directHousePt?.avgWeightGrams ?? Math.round(pt.avgWeightGrams * (factor.weightMult || 1));
        const feedVal =
          directHousePt?.cumulativeFeedTons ?? Number((pt.cumulativeFeedTons * factor.feedMult).toFixed(2));

        row[`avgTemp_${h.id}`] = avgT;
        row[`startTemp_${h.id}`] = startT;
        row[`middleTemp_${h.id}`] = midT;
        row[`endTemp_${h.id}`] = endT;
        row[`co2_${h.id}`] = co2Val;
        row[`pressure_${h.id}`] = pressVal;
        row[`nh3_${h.id}`] = nh3Val;
        row[`hum_${h.id}`] = humVal;
        row[`mort_${h.id}`] = mortVal;
        row[`culls_${h.id}`] = cullVal;
        row[`weight_${h.id}`] = weightVal;
        row[`feed_${h.id}`] = feedVal;
      });

      // Single-house convenience aliases for 4-zone view
      if (selectedHouses.length === 1) {
        const only = selectedHouses[0];
        row.singleStartTemp = row[`startTemp_${only.id}`];
        row.singleMiddleTemp = row[`middleTemp_${only.id}`];
        row.singleEndTemp = row[`endTemp_${only.id}`];
        row.singleNh3 = row[`nh3_${only.id}`];
        row.singleHumidity = row[`hum_${only.id}`];
        row.singleCo2 = row[`co2_${only.id}`];
        row.singlePressure = row[`pressure_${only.id}`];
        row.singleMortalities = row[`mort_${only.id}`];
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

  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    setIsExportingPdf(true);
    let restoreStylesheets = null;
    const wasDark = document.documentElement.classList.contains('dark');
    try {
      // Temporarily render crisp light-mode colors during PDF capture so dark mode never washes out PDF text
      if (wasDark) {
        document.documentElement.classList.remove('dark');
      }
      restoreStylesheets = prepareSanitizedStylesheetsBeforeCapture();
      const canvas = await html2canvas(reportRef.current, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#f8fafc',
        onclone: (clonedDoc) => {
          clonedDoc.documentElement.classList.remove('dark');
          const target = clonedDoc.getElementById('analytics-pdf-capture');
          if (target) {
            target.style.backgroundColor = '#f8fafc';
            target.style.padding = '12px';
          }
          sanitizeClonedNodeColors(clonedDoc, target);
        },
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = Math.min((pdfWidth - 16) / imgProps.width, (pdfHeight - 24) / imgProps.height);
      const renderW = imgProps.width * ratio;
      const renderH = imgProps.height * ratio;

      pdf.setFontSize(14);
      pdf.text(`AlReefi Farm Management — ${activeCycle?.name || 'Cycle Report'} (${scopeLabel})`, 8, 11);
      pdf.setFontSize(9);
      pdf.text(`Generated: ${new Date().toLocaleString()} • Partner: Alain Farms`, 8, 16);
      pdf.addImage(imgData, 'PNG', 8, 20, renderW, renderH);

      const dateSlug = new Date().toISOString().slice(0, 10);
      const fileName = `AlReefi-Farm-Analytics-${dateSlug}.pdf`;
      pdf.save(fileName);
      notify(`Exported ${fileName} successfully.`, 'success');
    } catch (err) {
      console.error('[Analytics PDF Export]', err);
      notify(`PDF export error: ${err.message}`, 'error');
    } finally {
      if (restoreStylesheets) restoreStylesheets();
      if (wasDark) {
        document.documentElement.classList.add('dark');
      }
      setIsExportingPdf(false);
    }
  };

  if (userRole === 'worker' || userRole === 'supervisor') {
    return (
      <div className="rounded-3xl bg-white/95 p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-slate-700">
          Analytics &amp; Financial Reports are restricted to Farm Manager and Super Admin roles.
        </p>
      </div>
    );
  }

  const effectiveTempMode =
    compareCycle && chartStyle !== 'bar'
      ? 'line'
      : chartStyle === 'side-by-side'
      ? 'line'
      : chartStyle;
  const effectiveHumidityMode =
    compareCycle && chartStyle !== 'bar'
      ? 'line'
      : chartStyle === 'side-by-side'
      ? 'line'
      : chartStyle;
  const effectiveAirMode = chartStyle === 'side-by-side' ? 'area' : chartStyle;
  const effectiveMortMode =
    compareCycle && chartStyle !== 'bar'
      ? 'line'
      : chartStyle === 'side-by-side'
      ? 'bar'
      : chartStyle;
  const effectiveWeightMode =
    compareCycle && chartStyle !== 'bar'
      ? 'line'
      : chartStyle === 'side-by-side'
      ? 'line'
      : chartStyle;

  const renderHumidityChart = (mode) => {
    if (selectedHouses.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-xs font-bold text-slate-500">
          Select one or more houses above to plot Relative Humidity (%).
        </div>
      );
    }

    if (mode === 'bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartSeries} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis domain={[35, 85]} unit="%" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <ReferenceArea y1={50} y2={65} fill="#0ea5e9" fillOpacity={0.14} />
            <Bar
              dataKey={selectedHouses.length === 1 ? 'singleHumidity' : 'humidityPct'}
              name="Current Cycle Humidity (%)"
              fill="#0284c7"
              radius={[4, 4, 0, 0]}
            />
            {compareCycle && (
              <Bar
                dataKey="compareHumidityPct"
                name={`Compare (${compareCycle.name.split(' ')[1]}) %`}
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartSeries} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis domain={[35, 85]} unit="%" tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <ReferenceArea
            y1={50}
            y2={65}
            fill="#0ea5e9"
            fillOpacity={0.14}
            label={{ value: 'Optimal 50–65% RH', position: 'insideTopLeft', fontSize: 10, fill: '#0369a1' }}
          />
          {selectedHouses.length === 1 && (
            <Line
              type="monotone"
              dataKey="singleHumidity"
              name={`${selectedHouses[0].name} Humidity (%)`}
              stroke="#0284c7"
              strokeWidth={2.6}
              dot={false}
            />
          )}
          {selectedHouses.length > 1 && (
            <Line
              type="monotone"
              dataKey="humidityPct"
              name={`Current Cycle (${activeCycle?.name?.split('(')[0]?.trim() || 'Current'}) %`}
              stroke="#0284c7"
              strokeWidth={2.8}
              dot={false}
            />
          )}
          {selectedHouses.length > 1 &&
            !compareCycle &&
            selectedHouses.map((h) => (
              <Line
                key={h.id}
                type="monotone"
                dataKey={`hum_${h.id}`}
                name={`${h.name} %`}
                stroke={h.color}
                strokeWidth={1.8}
                dot={false}
              />
            ))}
          {compareCycle && (
            <Line
              type="monotone"
              dataKey="compareHumidityPct"
              name={`Previous (${compareCycle.name.split('(')[0].trim()}) %`}
              stroke="#d97706"
              strokeDasharray="5 4"
              strokeWidth={2.4}
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderTempChart = (mode) => {
    if (selectedHouses.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-xs font-bold text-slate-500">
          Select one or more houses above to display temperature curves.
        </div>
      );
    }

    const commonChildren = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={4} />
        <YAxis yAxisId="temp" domain={[15, 50]} unit="°C" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="nh3" orientation="right" domain={[0, 30]} unit=" ppm" tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
      </>
    );

    if (mode === 'bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartSeries} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            {commonChildren}
            <Bar yAxisId="temp" dataKey="outsideTemp" name="Outside (UAE)" fill="#ef4444" radius={[3, 3, 0, 0]} />
            {selectedHouses.length === 1 ? (
              <>
                <Bar yAxisId="temp" dataKey="singleStartTemp" name="Start Zone" fill="#0284c7" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="temp" dataKey="singleMiddleTemp" name="Middle Zone" fill="#065f46" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="temp" dataKey="singleEndTemp" name="End Zone" fill="#d97706" radius={[3, 3, 0, 0]} />
              </>
            ) : (
              selectedHouses.map((h) => (
                <Bar
                  key={h.id}
                  yAxisId="temp"
                  dataKey={`avgTemp_${h.id}`}
                  name={`${h.name} Avg °C`}
                  fill={h.color}
                  radius={[3, 3, 0, 0]}
                />
              ))
            )}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (mode === 'area') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartSeries} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            {commonChildren}
            <Area
              yAxisId="temp"
              type="monotone"
              dataKey="outsideTemp"
              name="Outside (UAE)"
              stroke="#dc2626"
              fill="#dc2626"
              fillOpacity={0.12}
              strokeWidth={2}
            />
            {selectedHouses.length === 1 ? (
              <>
                <Area yAxisId="temp" type="monotone" dataKey="singleStartTemp" name="Start Zone" stroke="#0284c7" fill="#0284c7" fillOpacity={0.14} strokeWidth={2} />
                <Area yAxisId="temp" type="monotone" dataKey="singleMiddleTemp" name="Middle Zone" stroke="#065f46" fill="#065f46" fillOpacity={0.14} strokeWidth={2} />
                <Area yAxisId="temp" type="monotone" dataKey="singleEndTemp" name="End Zone" stroke="#d97706" fill="#d97706" fillOpacity={0.14} strokeWidth={2} />
              </>
            ) : (
              selectedHouses.map((h) => (
                <Area
                  key={h.id}
                  yAxisId="temp"
                  type="monotone"
                  dataKey={`avgTemp_${h.id}`}
                  name={`${h.name} Avg °C`}
                  stroke={h.color}
                  fill={h.color}
                  fillOpacity={0.15}
                  strokeWidth={2.5}
                />
              ))
            )}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartSeries} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
          {commonChildren}
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="outsideTemp"
            name="Outside (UAE)"
            stroke="#dc2626"
            strokeDasharray="5 4"
            strokeWidth={2}
            dot={false}
          />
          {selectedHouses.length === 1 ? (
            <>
              <Line yAxisId="temp" type="monotone" dataKey="singleStartTemp" name="Start Zone" stroke="#0284c7" strokeWidth={2.2} dot={false} />
              <Line yAxisId="temp" type="monotone" dataKey="singleMiddleTemp" name="Middle Zone" stroke="#065f46" strokeWidth={2.2} dot={false} />
              <Line yAxisId="temp" type="monotone" dataKey="singleEndTemp" name="End Zone" stroke="#d97706" strokeWidth={2.2} dot={false} />
              <Line yAxisId="nh3" type="monotone" dataKey="singleNh3" name="NH₃ (ppm)" stroke="#9333ea" strokeDasharray="3 3" strokeWidth={2} dot={false} />
            </>
          ) : (
              selectedHouses.map((h) => (
                <Line
                  key={h.id}
                  yAxisId="temp"
                  type="monotone"
                  dataKey={`avgTemp_${h.id}`}
                  name={`${h.name} Avg °C`}
                  stroke={h.color}
                  strokeWidth={2.5}
                  dot={false}
                />
              ))
            )}
          {compareCycle && (
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="compareAvgTempC"
              name={`Previous (${compareCycle.name.split('(')[0].trim()}) Avg °C`}
              stroke="#475569"
              strokeDasharray="5 4"
              strokeWidth={2.2}
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderAirQualityChart = (mode) => {
    if (selectedHouses.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-xs font-bold text-slate-500">
          Select one or more houses above to compare CO₂ (ppm) &amp; Negative Pressure (Pa).
        </div>
      );
    }

    const commonChildren = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={4} />
        <YAxis yAxisId="co2" domain={[800, 3600]} unit=" ppm" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="pa" orientation="right" domain={[0, 48]} unit=" Pa" tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <ReferenceLine yAxisId="co2" y={3000} stroke="#dc2626" strokeDasharray="4 4" label={{ value: 'CO₂ Alert 3000', fontSize: 10, fill: '#dc2626', position: 'insideTopRight' }} />
      </>
    );

    if (mode === 'bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartSeries} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            {commonChildren}
            {selectedHouses.map((h) => (
              <Bar key={`co2-${h.id}`} yAxisId="co2" dataKey={`co2_${h.id}`} name={`${h.code} CO₂ (ppm)`} fill={h.color} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (mode === 'area') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartSeries} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            {commonChildren}
            {selectedHouses.map((h) => (
              <Area
                key={`co2-${h.id}`}
                yAxisId="co2"
                type="monotone"
                dataKey={`co2_${h.id}`}
                name={`${h.code} CO₂ (ppm)`}
                stroke={h.color}
                fill={h.color}
                fillOpacity={0.14}
                strokeWidth={2}
              />
            ))}
            {selectedHouses.map((h) => (
              <Line
                key={`pa-${h.id}`}
                yAxisId="pa"
                type="monotone"
                dataKey={`pressure_${h.id}`}
                name={`${h.code} Pressure (Pa)`}
                stroke={h.color}
                strokeDasharray="4 3"
                strokeWidth={2}
                dot={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartSeries} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
          {commonChildren}
          {selectedHouses.map((h) => (
            <Line
              key={`co2-${h.id}`}
              yAxisId="co2"
              type="monotone"
              dataKey={`co2_${h.id}`}
              name={`${h.code} CO₂ (ppm)`}
              stroke={h.color}
              strokeWidth={2.3}
              dot={false}
            />
          ))}
          {selectedHouses.map((h) => (
            <Line
              key={`pa-${h.id}`}
              yAxisId="pa"
              type="monotone"
              dataKey={`pressure_${h.id}`}
              name={`${h.code} Pressure (Pa)`}
              stroke={h.color}
              strokeDasharray="4 3"
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderMortalityChart = (mode) => {
    if (selectedHouses.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-xs font-bold text-slate-500">
          Select one or more houses above to compare daily mortality &amp; culls.
        </div>
      );
    }

    if (mode === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartSeries} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {compareCycle && (
              <Line
                type="monotone"
                dataKey={selectedHouses.length === 1 ? 'singleMortalities' : 'mortalities'}
                name={`Current (${activeCycle?.name?.split('(')[0]?.trim() || 'Current'}) Dead`}
                stroke="#dc2626"
                strokeWidth={2.7}
                dot={false}
              />
            )}
            {compareCycle && (
              <Line
                type="monotone"
                dataKey="compareMortality"
                name={`Previous (${compareCycle.name.split('(')[0].trim()}) Dead`}
                stroke="#64748b"
                strokeDasharray="5 4"
                strokeWidth={2.4}
                dot={false}
              />
            )}
            {!compareCycle && selectedHouses.length === 1 && (
              <Line type="monotone" dataKey="singleMortalities" name="Dead (Mortalities)" stroke="#dc2626" strokeWidth={2.5} dot={false} />
            )}
            {!compareCycle && selectedHouses.length === 1 && (
              <Line type="monotone" dataKey="singleCulls" name="Sick (Culls)" stroke="#d97706" strokeWidth={2} dot={false} />
            )}
            {!compareCycle &&
              selectedHouses.length > 1 &&
              selectedHouses.map((h) => (
                <Line key={h.id} type="monotone" dataKey={`mort_${h.id}`} name={`${h.name} Dead`} stroke={h.color} strokeWidth={2.3} dot={false} />
              ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (mode === 'area') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartSeries} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {selectedHouses.length === 1 && (
              <Area type="monotone" dataKey="singleMortalities" name="Dead (Mortalities)" stroke="#dc2626" fill="#dc2626" fillOpacity={0.2} strokeWidth={2} />
            )}
            {selectedHouses.length === 1 && (
              <Area type="monotone" dataKey="singleCulls" name="Sick (Culls)" stroke="#d97706" fill="#d97706" fillOpacity={0.2} strokeWidth={2} />
            )}
            {selectedHouses.length > 1 &&
              selectedHouses.map((h) => (
                <Area key={h.id} type="monotone" dataKey={`mort_${h.id}`} name={`${h.name} Dead`} stroke={h.color} fill={h.color} fillOpacity={0.14} strokeWidth={2} />
              ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartSeries} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          {selectedHouses.length === 1 ? (
            <>
              <Bar dataKey="singleMortalities" name="Dead (Mortalities)" fill="#dc2626" radius={[4, 4, 0, 0]} />
              <Bar dataKey="singleCulls" name="Sick (Culls)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </>
          ) : (
            selectedHouses.map((h) => (
              <Bar key={h.id} dataKey={`mort_${h.id}`} name={`${h.code} Dead`} fill={h.color} radius={[3, 3, 0, 0]} />
            ))
          )}
          {compareCycle && (
            <Bar
              dataKey="compareMortality"
              name={`Compare Dead (${compareCycle.name.split(' ')[1]})`}
              fill="#64748b"
              radius={[4, 4, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderWeightChart = (mode) => {
    if (selectedHouses.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-xs font-bold text-slate-500">
          Select one or more houses above to compare weekly growth vs. 1350g–1550g contract target.
        </div>
      );
    }

    const targetMin = state.settings?.contractRules?.targetWeightMinGrams || 1350;
    const targetMax = state.settings?.contractRules?.targetWeightMaxGrams || 1550;

    if (mode === 'bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyWeightData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 1800]} unit="g" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <ReferenceArea y1={targetMin} y2={targetMax} fill="#16a34a" fillOpacity={0.16} />
            {compareCycle && (
              <Bar dataKey="avgWeightGrams" name="Current Cycle (g)" fill="#059669" radius={[4, 4, 0, 0]} />
            )}
            {compareCycle && (
              <Bar dataKey="compareWeightGrams" name={`Previous (${compareCycle.name.split('(')[0].trim()}) (g)`} fill="#64748b" radius={[4, 4, 0, 0]} />
            )}
            {!compareCycle &&
              selectedHouses.map((h) => (
                <Bar key={h.id} dataKey={`weight_${h.id}`} name={`${h.name} (g)`} fill={h.color} radius={[4, 4, 0, 0]} />
              ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={weeklyWeightData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
          <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="weight" domain={[0, 1800]} unit="g" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="feed" orientation="right" unit="T" tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <ReferenceArea
            yAxisId="weight"
            y1={targetMin}
            y2={targetMax}
            fill="#16a34a"
            fillOpacity={0.18}
            label={{ value: 'Contract Target (1350-1550g)', position: 'insideTopLeft', fontSize: 10, fill: '#166534' }}
          />
          <Area
            yAxisId="feed"
            type="monotone"
            dataKey="feedTons"
            name="Farm Cumulative Feed (T)"
            fill="#fef3c7"
            fillOpacity={0.45}
            stroke="#d97706"
            strokeWidth={2}
          />
          {compareCycle && (
            <Line
              yAxisId="weight"
              type="monotone"
              dataKey="avgWeightGrams"
              name={`Current (${activeCycle?.name?.split('(')[0]?.trim() || 'Current'}) (g)`}
              stroke="#059669"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          )}
          {compareCycle && (
            <Line
              yAxisId="weight"
              type="monotone"
              dataKey="compareWeightGrams"
              name={`Previous (${compareCycle.name.split('(')[0].trim()}) (g)`}
              stroke="#94a3b8"
              strokeDasharray="5 4"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          )}
          {!compareCycle &&
            selectedHouses.map((h) => (
              <Line
                key={h.id}
                yAxisId="weight"
                type="monotone"
                dataKey={`weight_${h.id}`}
                name={`${h.name} Weight (g)`}
                stroke={h.color}
                strokeWidth={2.8}
                dot={{ r: 4 }}
              />
            ))}
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6">
      {/* Interactive Filter, Multi-House Checkboxes & Export Control Bar */}
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Performance Analytics, Multi-House Overlay &amp; PDF Export
            </h2>
            <p className="text-xs font-medium text-slate-600">
              {isOwner
                ? 'Super Admin View: Full operational, air quality & Alain Farms AED financial analytics'
                : 'Manager View: Operational health, CO₂/pressure contrast & weight benchmarks'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5">
              <Layers className="h-3.5 w-3.5 text-emerald-700" />
              <select
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
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
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
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
              {isExportingPdf ? 'Generating PDF...' : 'Export PDF Report'}
            </button>
          </div>
        </div>

        {/* Multi-House Searchable Dropdown Overlay Filter + Chart Style Toggle */}
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
                Same-Day (H1 &amp; H5)
              </button>
              <button
                type="button"
                onClick={handleClearHouses}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Clear
              </button>
            </div>

            {/* Selected swatches preview (compact tags without crowding the toolbar) */}
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

            {/* Scalable Searchable Dropdown Menu */}
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
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-900">
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

          {/* Chart Style Pills */}
          <div className="flex flex-col gap-1.5 xl:items-end">
            <span className="flex items-center gap-1 text-[11px] font-extrabold text-slate-600 uppercase">
              <Columns2 className="h-3.5 w-3.5 text-emerald-700" />
              Chart Visualization Mode
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CHART_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setChartStyle(style.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                    chartStyle === style.id
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Capturable Report Container */}
      <div id="analytics-pdf-capture" ref={reportRef} className="space-y-6 rounded-3xl">
        {/* Top KPI Cards (AED Financial Card strictly restricted to Super Admin / Owner) */}
        <div
          className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
            isOwner ? 'xl:grid-cols-5' : 'xl:grid-cols-4'
          }`}
        >
          <div className="rounded-3xl border border-red-200 bg-red-50/90 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold text-red-900 uppercase">Total Mortality Rate</p>
              <HeartPulse className="h-4 w-4 text-red-700" />
            </div>
            <p className="mt-1.5 text-3xl font-black text-red-700">
              {activeCycle?.totalMortalityRate}%
            </p>
            <p className="mt-1 text-xs font-semibold text-red-800">
              {compareCycle
                ? `vs ${compareCycle.totalMortalityRate}% (${compareCycle.name.split(' ')[1]})`
                : 'Within < 3.0% target'}
            </p>
          </div>

          {/* EXCLUSIVE TO SUPER ADMIN (FARM OWNER) */}
          {isOwner && (
            <div className="rounded-3xl border border-emerald-300 bg-emerald-50/95 p-4 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/55">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold text-emerald-900 uppercase">
                  Cycle Est. Profit (Owner)
                </p>
                <TrendingUp className="h-4 w-4 text-emerald-700" />
              </div>
              <p className="mt-1.5 text-2xl font-black text-emerald-900">
                AED {Number(activeCycle?.estimatedProfitAed || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs font-semibold text-emerald-800">
                Gross Payout: AED {Number(activeCycle?.estimatedPayoutAed || 0).toLocaleString()}
              </p>
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold text-slate-600 uppercase">Feed Consumption</p>
              <Wheat className="h-4 w-4 text-amber-700" />
            </div>
            <p className="mt-1.5 text-3xl font-black text-slate-900">
              {activeCycle?.totalFeedTons} <span className="text-base font-bold">Tons</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {Math.round((activeCycle?.totalFeedTons || 0) * 20).toLocaleString()} × 50kg Bags
            </p>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/55">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold text-amber-900 uppercase">Avg Sick / Culls</p>
              <FileText className="h-4 w-4 text-amber-700" />
            </div>
            <p className="mt-1.5 text-3xl font-black text-amber-900">
              {activeCycle?.avgSickChicks}
            </p>
            <p className="mt-1 text-xs font-semibold text-amber-800">
              Daily farm average per house check
            </p>
          </div>

          <div className="rounded-3xl border border-sky-200 bg-sky-50/90 p-4 shadow-sm dark:border-sky-800 dark:bg-sky-950/55">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold text-sky-900 uppercase">FCR &amp; Catch Weight</p>
              <Scale className="h-4 w-4 text-sky-700" />
            </div>
            <p className="mt-1.5 text-3xl font-black text-sky-900">
              {activeCycle?.fcr} <span className="text-sm font-bold text-sky-700">FCR</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-sky-800">
              Avg Final Weight: {activeCycle?.avgCatchWeightGrams}g
            </p>
          </div>
        </div>

        {/* Chart Pair 1: 4-Zone Temps & Air Quality (CO2 ppm + Negative Pressure Pa) */}
        <div
          className={`grid grid-cols-1 gap-6 ${
            chartStyle === 'side-by-side' ? 'lg:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  4-Zone Temperature &amp; Cooling Contrast (35-Day Cycle)
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedHouses.length === 1
                    ? 'Interior zones (Start, Middle, End) + NH₃ against UAE exterior heat'
                    : `Multi-house average interior temp overlay (${selectedHouses.length} houses) vs. Outside UAE`}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                Scope: {scopeLabel}
              </span>
            </div>
            <div className="h-80 w-full">{renderTempChart(effectiveTempMode)}</div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                  <Wind className="h-4 w-4 text-emerald-700" />
                  CO₂ (ppm) &amp; Negative Pressure (Pa) Telemetry
                </h3>
                <p className="text-xs text-slate-500">
                  Ventilation efficiency: CO₂ alert threshold 3,000 ppm vs. static tunnel pressure (18–38 Pa)
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
                <Gauge className="h-3.5 w-3.5" />
                Target: 18–38 Pa
              </span>
            </div>
            <div className="h-80 w-full">{renderAirQualityChart(effectiveAirMode)}</div>
          </section>
        </div>

        {/* Dedicated Relative Humidity (%) Trend Chart */}
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
                <Droplets className="h-4 w-4 text-sky-600" />
                Relative Humidity (%) Trend vs. Optimal 50–65% RH
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Evaporative cooling pad humidity tracking across the 35-day cycle
                {compareCycle ? ` vs. ${compareCycle.name}` : ''}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-900 dark:bg-sky-950/60 dark:text-sky-200">
              Target Band: 50%–65% RH
            </span>
          </div>
          <div className="h-72 w-full">{renderHumidityChart(effectiveHumidityMode)}</div>
        </section>

        {/* Chart Pair 2: Daily Mortality/Culls & Weekly Weight vs 1350-1550g Contract Target */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900">
              Daily Mortality &amp; Cull Trends
            </h3>
            <p className="mb-4 text-xs text-slate-500">
              {selectedHouses.length <= 1
                ? `Daily dead chicks vs. culls across ${activeCycle?.name}`
                : `Side-by-side daily mortality overlay across ${selectedHouses.length} selected houses`}
            </p>
            <div className="h-72 w-full">{renderMortalityChart(effectiveMortMode)}</div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900">
              Weekly Weight vs. 1350g–1550g Target &amp; Feed Usage
            </h3>
            <p className="mb-4 text-xs text-slate-500">
              Shaded green band highlights the Alain Farms contract harvest target (1350g–1550g)
            </p>
            <div className="h-72 w-full">{renderWeightChart(effectiveWeightMode)}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
