import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Droplets,
  Edit3,
  Eye,
  HeartPulse,
  History,
  Lock,
  Minus,
  Package,
  Pill,
  Plus,
  Save,
  ShieldCheck,
  Skull,
  Sparkles,
  Thermometer,
  Truck,
  Unlock,
  Wheat,
  Wind,
  X,
} from 'lucide-react';
import {
  calculateHouseInventory,
  detectActiveShiftForTimestamp,
  evaluateHouseEnvironmentStatus,
  gallonsToLiters,
  getTasksForHouseAndShift,
  litersToGallons,
} from '../mockData.js';
import { compressImageFile } from '../services/storageService.js';
import { useFarm } from '../App.jsx';

const ANOMALY_CATEGORIES = [
  'Water Gauge Fault',
  'Cooling Pad Leak',
  'Power Dip',
  'Feeder Jam',
  'Sick Flock Observation',
];

function BroilerHouseSvgIcon({ className = 'h-12 w-12', isSilo = false, status = 'OPTIMAL' }) {
  const accentColor =
    status === 'INACTIVE'
      ? '#64748b'
      : status === 'CLEANING'
      ? '#0284c7'
      : status === 'ALERT'
      ? '#dc2626'
      : status === 'ATTENTION'
      ? '#d97706'
      : '#059669';

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Concrete pad */}
      <rect x="4" y="54" width="56" height="4" rx="2" fill="currentColor" opacity="0.22" />

      {/* Feed silo silhouette (emphasized on silo-equipped houses) */}
      <g opacity={isSilo ? 1 : 0.3}>
        <path d="M49 20 L54 13 L59 20 Z" fill={isSilo ? '#4f46e5' : 'currentColor'} />
        <rect
          x="49"
          y="20"
          width="10"
          height="21"
          rx="1.5"
          fill={isSilo ? '#6366f1' : 'currentColor'}
          opacity={isSilo ? 0.9 : 0.55}
        />
        <path d="M49 41 L54 48 L59 41 Z" fill={isSilo ? '#4338ca' : 'currentColor'} />
        <line x1="50" y1="44" x2="50" y2="54" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="58" y1="44" x2="58" y2="54" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M51 46 L44 36" stroke={isSilo ? '#4338ca' : 'currentColor'} strokeWidth="2.2" strokeLinecap="round" />
      </g>

      {/* Ridge vent / cupola */}
      <rect x="21" y="9" width="12" height="5" rx="1.5" fill={accentColor} />
      <path d="M19 10 L27 5 L35 10 Z" fill={accentColor} />
      <line x1="23.5" y1="11.5" x2="30.5" y2="11.5" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />

      {/* Barn frame */}
      <path
        d="M9 28 L27 14 L45 28 V54 H9 V28 Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Pitched roof overhang */}
      <path
        d="M5 29 L27 12 L49 29"
        stroke={accentColor}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Side wall evaporative louvers */}
      <rect
        x="13"
        y="34"
        width="10"
        height="10"
        rx="1.8"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line x1="15" y1="37" x2="21" y2="37" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="15" y1="39.5" x2="21" y2="39.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="15" y1="42" x2="21" y2="42" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />

      {/* Circular exhaust fan with blades */}
      <circle
        cx="34"
        cy="39"
        r="6.5"
        fill={accentColor}
        fillOpacity="0.14"
        stroke={accentColor}
        strokeWidth="2"
      />
      <circle cx="34" cy="39" r="1.6" fill={accentColor} />
      <path
        d="M34 34.2 L35.4 37.5 M38.2 41.4 L35.2 39.8 M29.8 41.4 L32.8 39.8"
        stroke={accentColor}
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Barn access doors */}
      <rect
        x="21"
        y="46"
        width="12"
        height="8"
        rx="1"
        fill={accentColor}
        fillOpacity="0.22"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line x1="27" y1="46" x2="27" y2="54" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function getHouseStatusBadgeMeta(status) {
  if (status === 'INACTIVE') {
    return {
      label: 'INACTIVE',
      badgeClass: 'bg-slate-700 text-white',
      iconWrapClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    };
  }
  if (status === 'CLEANING') {
    return {
      label: 'CLEANING',
      badgeClass: 'bg-sky-700 text-white',
      iconWrapClass: 'bg-sky-100 text-sky-900 dark:bg-sky-900/50 dark:text-sky-200',
    };
  }
  if (status === 'ALERT') {
    return {
      label: 'ALERT',
      badgeClass: 'bg-red-600 text-white',
      iconWrapClass: 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-200',
    };
  }
  if (status === 'ATTENTION') {
    return {
      label: 'ATTENTION',
      badgeClass: 'bg-amber-500 text-white',
      iconWrapClass: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200',
    };
  }
  return {
    label: 'OPTIMAL',
    badgeClass: 'bg-emerald-600 text-white',
    iconWrapClass: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200',
  };
}

function BroilerHouseSelectionGrid({
  houses,
  selectedHouseId,
  onSelectHouse,
  healthLogs,
  chicksPerCarton,
  settings,
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {houses.map((h) => {
        const selected = h.id === selectedHouseId;
        const isSilo = h.feedSystemType === 'silo';
        const bagKg = Number(h.bagWeightKg || 50);
        const siloTons = Number(h.siloCapacityTons || 20);
        const envEval = evaluateHouseEnvironmentStatus(h, settings);
        const inv = calculateHouseInventory(h, chicksPerCarton, healthLogs || []);
        const avgTemp = (
          (Number(h.zones?.start || 0) +
            Number(h.zones?.middle || 0) +
            Number(h.zones?.end || 0)) /
          3
        ).toFixed(1);
        const statusMeta = getHouseStatusBadgeMeta(envEval.status);

        return (
          <button
            key={h.id}
            type="button"
            onClick={() => onSelectHouse(h.id)}
            aria-pressed={selected}
            className={`group flex flex-col justify-between gap-3 rounded-2xl border-2 p-4 text-left transition ${
              selected
                ? 'border-emerald-700 bg-emerald-50/90 shadow-md ring-2 ring-emerald-500/25 dark:border-emerald-400 dark:bg-emerald-950/55 dark:ring-emerald-400/20'
                : 'border-slate-200 bg-white/95 hover:border-emerald-400 hover:bg-emerald-50/35 dark:border-slate-700 dark:bg-slate-900/75 dark:hover:border-emerald-600 dark:hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl p-1.5 shadow-xs ${statusMeta.iconWrapClass}`}
                >
                  <BroilerHouseSvgIcon
                    className="h-10 w-10"
                    isSilo={isSilo}
                    status={envEval.status}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-black text-slate-900 dark:text-white">
                    {h.name}
                  </h3>
                  <p className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {h.sector || 'Main Pad'} •{' '}
                    {h.phase === 'cleaning'
                      ? `Cleaning (${h.cleaningDay}/${h.targetCleaningDays || 14})`
                      : `Day ${h.cycleDay}/${h.targetCycleDays || 35}`}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {selected && (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-white shadow-xs dark:bg-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-2.5 dark:border-slate-700/80">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wide uppercase ${statusMeta.badgeClass}`}
                >
                  {statusMeta.label}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${
                    isSilo
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200'
                      : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
                  }`}
                >
                  {isSilo ? <Package className="h-3 w-3" /> : <Wheat className="h-3 w-3" />}
                  {isSilo ? `${siloTons}T Silo` : `${bagKg}kg Bags`}
                </span>
              </div>

              <div className="text-right text-xs font-extrabold tabular-nums text-slate-800 dark:text-slate-100">
                {h.phase === 'cleaning' ? (
                  <span className="text-sky-700 dark:text-sky-300">Sanitation</span>
                ) : (
                  <span>
                    {inv.activeChicks.toLocaleString()} birds • {avgTemp}°C
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function getFieldTaskVisualMeta(item) {
  if (item.kind === 'med') {
    return {
      Icon: Pill,
      badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
    };
  }
  const cat = String(item.raw?.category || '').toLowerCase();
  const code = String(item.raw?.taskCode || '').toUpperCase();
  if (cat.includes('clean') || code.startsWith('C')) {
    return {
      Icon: Sparkles,
      badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200',
    };
  }
  if (cat.includes('water') || code.startsWith('W')) {
    return {
      Icon: Droplets,
      badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200',
    };
  }
  if (cat.includes('feed') || code.startsWith('F')) {
    return {
      Icon: Wheat,
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
    };
  }
  if (cat.includes('vent') || code.startsWith('V')) {
    return {
      Icon: Wind,
      badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200',
    };
  }
  if (cat.includes('bio') || code.startsWith('B')) {
    return {
      Icon: ShieldCheck,
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
    };
  }
  return {
    Icon: ClipboardCheck,
    badgeClass: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  };
}

function DailyCountersStack({
  isManagement,
  isSiloHouse,
  bagWeightKg,
  mortalities,
  setMortalities,
  culls,
  setCulls,
  bagsConsumed,
  setBagsConsumed,
  feedPhase,
  setFeedPhase,
  feedKgComputed,
  stockBagsRemaining,
  showDeliveryForm,
  setShowDeliveryForm,
  waterGallonsInput,
  setWaterGallonsInput,
  waterViewUnit,
  setWaterViewUnit,
  displayedWaterValue,
  handleWaterDisplayChange,
  waterGallonsComputed,
  waterLitersComputed,
  waterM3Computed,
  manualTempC,
  setManualTempC,
  shiftSubtotals,
  currentShiftLogs,
}) {
  const latestTemp = currentShiftLogs[0]?.manualTempC;

  return (
    <div className="flex flex-col space-y-3.5">
      {/* 1. Dead Birds */}
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-rose-200 bg-rose-50/75 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-rose-900/70 dark:bg-rose-950/30">
        <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 shadow-xs dark:bg-rose-900/60 dark:text-rose-200">
            <Skull className="h-6 w-6" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Dead Birds</h3>
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-extrabold text-rose-900 dark:bg-rose-900/60 dark:text-rose-200">
                Today Logged: {shiftSubtotals.dead} dead
              </span>
            </div>
            <p className="text-xs font-medium text-rose-900/80 dark:text-rose-200/80">
              Mortality count for this shift entry
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => setMortalities((v) => Math.max(0, Number(v || 0) - 1))}
            aria-label="Decrease Dead Birds count"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-rose-300 bg-white text-rose-800 shadow-xs transition hover:bg-rose-100 active:scale-95 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950"
          >
            <Minus className="h-5 w-5" />
          </button>
          <input
            type="number"
            min="0"
            value={mortalities}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setMortalities(Math.max(0, Math.round(Number(e.target.value || 0))))}
            aria-label="Dead Birds count"
            className="h-12 w-24 min-w-[5.5rem] rounded-2xl border-2 border-rose-200 bg-white px-2 text-center text-2xl font-black text-slate-900 tabular-nums focus:border-rose-500 focus:outline-none dark:border-rose-800 dark:bg-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={() => setMortalities((v) => Number(v || 0) + 1)}
            aria-label="Increase Dead Birds count"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-xs transition hover:bg-rose-700 active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 2. Sick / Culls */}
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50/75 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-amber-900/70 dark:bg-amber-950/30">
        <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-xs dark:bg-amber-900/60 dark:text-amber-200">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Sick / Culls</h3>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                Today Logged: {shiftSubtotals.culls} culls
              </span>
            </div>
            <p className="text-xs font-medium text-amber-900/80 dark:text-amber-200/80">
              Weak, sick, or culled birds removed from flock
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => setCulls((v) => Math.max(0, Number(v || 0) - 1))}
            aria-label="Decrease Sick / Culls count"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-300 bg-white text-amber-800 shadow-xs transition hover:bg-amber-100 active:scale-95 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-amber-950"
          >
            <Minus className="h-5 w-5" />
          </button>
          <input
            type="number"
            min="0"
            value={culls}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setCulls(Math.max(0, Math.round(Number(e.target.value || 0))))}
            aria-label="Sick / Culls count"
            className="h-12 w-24 min-w-[5.5rem] rounded-2xl border-2 border-amber-200 bg-white px-2 text-center text-2xl font-black text-slate-900 tabular-nums focus:border-amber-500 focus:outline-none dark:border-amber-800 dark:bg-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={() => setCulls((v) => Number(v || 0) + 1)}
            aria-label="Increase Sick / Culls count"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs transition hover:bg-amber-600 active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 3. Feed Bags (STRICTLY HIDDEN when isSiloHouse is true) */}
      {!isSiloHouse && (
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50/75 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-emerald-900/70 dark:bg-emerald-950/30">
          <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-xs dark:bg-emerald-900/60 dark:text-emerald-200">
              <Wheat className="h-6 w-6" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">Feed Bags</h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200">
                  Today Logged: {shiftSubtotals.bags} bags ({shiftSubtotals.bags * bagWeightKg} kg)
                </span>
                {isManagement && (
                  <select
                    value={feedPhase}
                    onChange={(e) => setFeedPhase(e.target.value)}
                    aria-label="Feed phase"
                    className="rounded-xl border border-emerald-300 bg-white px-2 py-0.5 text-[11px] font-extrabold text-slate-900 dark:border-emerald-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="Starter">Starter</option>
                    <option value="Grower">Grower</option>
                    <option value="Finisher">Finisher</option>
                  </select>
                )}
              </div>
              <p className="text-xs font-medium text-emerald-900/80 dark:text-emerald-200/80">
                {bagWeightKg} kg/bag • This entry: <strong>{feedKgComputed.toLocaleString()} kg</strong> •{' '}
                {feedPhase} Stock: <strong>{stockBagsRemaining} bags</strong>
              </p>
              {isManagement && setShowDeliveryForm && (
                <button
                  type="button"
                  onClick={() => setShowDeliveryForm(!showDeliveryForm)}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white/90 px-2.5 py-1 text-[11px] font-extrabold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-200"
                >
                  <Truck className="h-3.5 w-3.5" />
                  + Log {bagWeightKg}kg Bag Delivery
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setBagsConsumed((v) => Math.max(0, Number(v || 0) - 1))}
              aria-label="Decrease Feed Bags"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-emerald-300 bg-white text-emerald-800 shadow-xs transition hover:bg-emerald-100 active:scale-95 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
            >
              <Minus className="h-5 w-5" />
            </button>
            <input
              type="number"
              min="0"
              step="1"
              value={bagsConsumed}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setBagsConsumed(Math.max(0, Math.round(Number(e.target.value || 0))))}
              aria-label="Feed Bags count"
              className="h-12 w-24 min-w-[5.5rem] rounded-2xl border-2 border-emerald-200 bg-white px-2 text-center text-2xl font-black text-slate-900 tabular-nums focus:border-emerald-600 focus:outline-none dark:border-emerald-800 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setBagsConsumed((v) => Number(v || 0) + 1)}
              aria-label="Increase Feed Bags"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-xs transition hover:bg-emerald-800 active:scale-95"
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setBagsConsumed((v) => Number(v || 0) + 5)}
              aria-label="Add 5 Feed Bags"
              className="h-12 shrink-0 rounded-2xl bg-emerald-900 px-3.5 text-xs font-black text-white shadow-xs transition hover:bg-emerald-950 active:scale-95 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              +5
            </button>
          </div>
        </div>
      )}

      {/* 4. Water (Gallons) */}
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-sky-200 bg-sky-50/75 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-sky-900/70 dark:bg-sky-950/30">
        <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-800 shadow-xs dark:bg-sky-900/60 dark:text-sky-200">
            <Droplets className="h-6 w-6" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Water (Gallons)
              </h3>
              <span className="rounded-full bg-sky-700 px-2.5 py-0.5 text-[11px] font-black text-white uppercase">
                Gallons
              </span>
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-extrabold text-sky-900 dark:bg-sky-900/60 dark:text-sky-200">
                Today Logged: {shiftSubtotals.gallons.toLocaleString()} gal
              </span>
              {isManagement && (
                <div className="inline-flex rounded-full border border-sky-200 bg-white p-0.5 text-[11px] font-bold dark:border-sky-800 dark:bg-slate-900">
                  {[
                    ['gallons', 'gal'],
                    ['liters', 'L'],
                    ['m3', 'm³'],
                  ].map(([unitKey, label]) => (
                    <button
                      key={unitKey}
                      type="button"
                      onClick={() => setWaterViewUnit(unitKey)}
                      className={`rounded-full px-2 py-0.5 ${
                        waterViewUnit === unitKey
                          ? 'bg-sky-700 text-white'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs font-medium text-sky-900/80 dark:text-sky-200/80">
              Tank gauge in Gallons • <strong>{waterGallonsComputed.toLocaleString()} gal</strong> ={' '}
              {waterLitersComputed.toLocaleString()} L ({waterM3Computed} m³)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() =>
              setWaterGallonsInput((v) => Math.max(0, Math.round(Number(v || 0) - 100)))
            }
            aria-label="Decrease Water by 100 Gallons"
            className="h-12 shrink-0 rounded-2xl border-2 border-sky-300 bg-white px-3 text-xs font-black text-sky-900 shadow-xs transition hover:bg-sky-100 active:scale-95 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-sky-950"
          >
            -100
          </button>
          <button
            type="button"
            onClick={() =>
              setWaterGallonsInput((v) => Math.max(0, Math.round(Number(v || 0) - 25)))
            }
            aria-label="Decrease Water by 25 Gallons"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-sky-300 bg-white text-sky-800 shadow-xs transition hover:bg-sky-100 active:scale-95 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-300 dark:hover:bg-sky-950"
            title="-25 gal"
          >
            <Minus className="h-5 w-5" />
          </button>
          <input
            type="number"
            min="0"
            step={isManagement && waterViewUnit === 'm3' ? '0.1' : '1'}
            value={isManagement ? displayedWaterValue : waterGallonsInput}
            onFocus={(e) => e.target.select()}
            onChange={(e) =>
              isManagement
                ? handleWaterDisplayChange(e.target.value)
                : setWaterGallonsInput(Math.max(0, Math.round(Number(e.target.value || 0))))
            }
            aria-label="Water in Gallons"
            className="h-12 w-24 min-w-[5.5rem] rounded-2xl border-2 border-sky-200 bg-white px-2 text-center text-2xl font-black text-slate-900 tabular-nums focus:border-sky-600 focus:outline-none dark:border-sky-800 dark:bg-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={() => setWaterGallonsInput((v) => Math.round(Number(v || 0) + 25))}
            aria-label="Increase Water by 25 Gallons"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-xs transition hover:bg-sky-700 active:scale-95"
            title="+25 gal"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setWaterGallonsInput((v) => Math.round(Number(v || 0) + 100))}
            aria-label="Increase Water by 100 Gallons"
            className="h-12 shrink-0 rounded-2xl bg-sky-800 px-3.5 text-xs font-black text-white shadow-xs transition hover:bg-sky-900 active:scale-95"
          >
            +100 gal
          </button>
        </div>
      </div>

      {/* 5. House Temp (°C) */}
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-teal-200 bg-teal-50/75 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-teal-900/70 dark:bg-teal-950/30">
        <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-800 shadow-xs dark:bg-teal-900/60 dark:text-teal-200">
            <Thermometer className="h-6 w-6" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                House Temp (°C)
              </h3>
              <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-extrabold text-teal-900 dark:bg-teal-900/60 dark:text-teal-200">
                {latestTemp !== undefined
                  ? `Last Logged: ${latestTemp}°C (${currentShiftLogs.length} entries)`
                  : '0 entries today'}
              </span>
            </div>
            <p className="text-xs font-medium text-teal-900/80 dark:text-teal-200/80">
              Mandatory house interior temperature (°C, ±0.5°C steppers)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => setManualTempC((t) => Number((Number(t || 0) - 0.5).toFixed(1)))}
            aria-label="Decrease House Temperature by 0.5°C"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-teal-300 bg-white text-teal-800 shadow-xs transition hover:bg-teal-100 active:scale-95 dark:border-teal-800 dark:bg-slate-900 dark:text-teal-300 dark:hover:bg-teal-950"
          >
            <Minus className="h-5 w-5" />
          </button>
          <div className="flex h-12 min-w-[7.5rem] items-center justify-center gap-1 rounded-2xl border-2 border-teal-200 bg-white px-3 focus-within:border-teal-600 dark:border-teal-800 dark:bg-slate-900">
            <input
              type="number"
              step="0.1"
              required
              value={manualTempC}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setManualTempC(e.target.value)}
              aria-label="Manual House Temperature Celsius"
              className="w-20 bg-transparent text-center text-2xl font-black text-slate-900 tabular-nums focus:outline-none dark:text-white"
            />
            <span className="shrink-0 text-sm font-black text-teal-700 dark:text-teal-300">
              °C
            </span>
          </div>
          <button
            type="button"
            onClick={() => setManualTempC((t) => Number((Number(t || 0) + 0.5).toFixed(1)))}
            aria-label="Increase House Temperature by 0.5°C"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-xs transition hover:bg-teal-700 active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HealthResourceLog() {
  const {
    state,
    userRole,
    activeUser,
    activeWorker,
    visibleHouses,
    selectedHouseId,
    setSelectedHouseId,
    manualOverrideEnabled,
    setManualOverrideEnabled,
    addHealthLog,
    updateLockedHealthLog,
    addFeedDelivery,
    recordBulkSiloDelivery,
    scheduleMedicationTask,
    executeMedicationTask,
    addIncidentNote,
    acknowledgeIncidentNote,
    submitTaskForVerification,
    completeRecurringTaskInstance,
    recordSiloSightGlassReading,
    notify,
  } = useFarm();

  const currentUser = activeUser || activeWorker;
  const isManagement = userRole === 'owner' || userRole === 'manager';
  const isOwner = userRole === 'owner';
  const canExecuteStandardMeds =
    userRole === 'owner' || userRole === 'manager' || userRole === 'supervisor';

  const selectableHouses = (visibleHouses || []).filter((h) => h.isActive !== false && !h.archived);
  const cultivationHouses = selectableHouses.filter((h) => h.phase !== 'cleaning');
  const activeHouse =
    selectableHouses.find((h) => h.id === selectedHouseId) ||
    cultivationHouses[0] ||
    selectableHouses[0] ||
    visibleHouses?.[0];

  const isSiloHouse = activeHouse?.feedSystemType === 'silo';
  const bagWeightKg = Number(activeHouse?.bagWeightKg || 50);

  // Shift & Core Tactile Inputs
  const shiftOptions = useMemo(() => {
    const cfgShifts = state.settings?.shiftConfig?.shifts;
    if (Array.isArray(cfgShifts) && cfgShifts.length > 0) {
      return cfgShifts.map((s) => s.label || s.name).filter(Boolean);
    }
    return ['Day Shift (06:00-18:00)', 'Night Shift (18:00-06:00)'];
  }, [state.settings?.shiftConfig?.shifts]);

  const [shift, setShift] = useState(
    () =>
      detectActiveShiftForTimestamp(new Date(), state.settings?.shiftConfig)?.fullLabel ||
      shiftOptions[0] ||
      'Day Shift (06:00-18:00)'
  );
  const [mortalities, setMortalities] = useState(0);
  const [culls, setCulls] = useState(0);
  const [manualTempC, setManualTempC] = useState(
    activeHouse
      ? Number(
          (
            (Number(activeHouse.zones?.start || 28) +
              Number(activeHouse.zones?.middle || 28) +
              Number(activeHouse.zones?.end || 28)) /
            3
          ).toFixed(1)
        )
      : 29.0
  );

  // Optional 8-sensor walkaround update
  const [showFullZones, setShowFullZones] = useState(false);
  const [zones, setZones] = useState({
    start: activeHouse?.zones?.start ?? 29.2,
    middle: activeHouse?.zones?.middle ?? 29.5,
    end: activeHouse?.zones?.end ?? 30.0,
    outside: activeHouse?.zones?.outside ?? 42.5,
    humidity: activeHouse?.zones?.humidity ?? 58,
    ammoniaPpm: activeHouse?.zones?.ammoniaPpm ?? 10,
    co2Ppm: activeHouse?.zones?.co2Ppm ?? 1950,
    negativePressurePa: activeHouse?.zones?.negativePressurePa ?? 25,
  });

  // Bag-Based House Feed Consumption (Strict integer fixed-weight bags)
  const [feedPhase, setFeedPhase] = useState(activeHouse?.currentFeedPhase || 'Grower');
  const [bagsConsumed, setBagsConsumed] = useState(0);

  // Water Consumption — Default strictly to Gallons ('gallons'), management may toggle view unit
  const [waterViewUnit, setWaterViewUnit] = useState('gallons'); // 'gallons' | 'liters' | 'm3'
  const [waterGallonsInput, setWaterGallonsInput] = useState(0);
  const [note, setNote] = useState('');

  // Management Bag Delivery / Silo Refill Forms
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    phase: 'Grower',
    bagsCount: '100',
    invoiceRef: '',
  });
  const [siloRefillForm, setSiloRefillForm] = useState({
    tonsAdded: '10',
    supplier: 'Alain Farms Bulk Feed Fleet',
    invoiceRef: '',
    note: '',
  });

  // Super Admin Inline Locked Entry Override Editor
  const [editingLogId, setEditingLogId] = useState(null);
  const [editLogForm, setEditLogForm] = useState({});

  // Structured Medication Scheduling (Owner/Manager) + Execution Notes
  const catalog = state.medicationCatalog || [];
  const [showScheduleMedForm, setShowScheduleMedForm] = useState(false);
  const [scheduleMedForm, setScheduleMedForm] = useState({
    catalogId: catalog[0]?.id || '',
    waterVolumeGallons: '500',
    scheduledTime: '08:00',
    assignedRole: 'supervisor',
    notes: '',
  });
  const [medExecNotes, setMedExecNotes] = useState({});

  // Incident / Anomaly Note with Camera Photo Upload
  const [incidentCategory, setIncidentCategory] = useState(ANOMALY_CATEGORIES[0]);
  const [incidentText, setIncidentText] = useState('');
  const [incidentPhoto, setIncidentPhoto] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [sightGlassTonsInput, setSightGlassTonsInput] = useState('');
  const [sightGlassNote, setSightGlassNote] = useState('');

  const detectedFieldShift = useMemo(
    () => detectActiveShiftForTimestamp(new Date(), state.settings?.shiftConfig),
    [state.settings?.shiftConfig]
  );
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  useEffect(() => {
    if (!activeHouse) return;
    setManualTempC(
      Number(
        (
          (Number(activeHouse.zones?.start || 28) +
            Number(activeHouse.zones?.middle || 28) +
            Number(activeHouse.zones?.end || 28)) /
          3
        ).toFixed(1)
      )
    );
    setFeedPhase(activeHouse.currentFeedPhase || 'Grower');
    setBagsConsumed(0);
    setWaterGallonsInput(0);
    setEditingLogId(null);
    setZones({
      start: activeHouse.zones?.start ?? 29,
      middle: activeHouse.zones?.middle ?? 29,
      end: activeHouse.zones?.end ?? 29,
      outside: activeHouse.zones?.outside ?? 42,
      humidity: activeHouse.zones?.humidity ?? 58,
      ammoniaPpm: activeHouse.zones?.ammoniaPpm ?? 10,
      co2Ppm: activeHouse.zones?.co2Ppm ?? 1950,
      negativePressurePa: activeHouse.zones?.negativePressurePa ?? 25,
    });
  }, [activeHouse?.id]);

  if (!activeHouse) {
    return (
      <div className="rounded-3xl bg-white/95 p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-slate-700">No active houses available for logging.</p>
      </div>
    );
  }

  const isCleaningLocked = activeHouse.phase === 'cleaning';
  const chicksPerCarton = state.settings?.contractRules?.chicksPerCarton || 100;
  const currentInv = calculateHouseInventory(activeHouse, chicksPerCarton, state.healthLogs || []);

  // Computed Feed & Water Conversions
  const feedBagsInt = isSiloHouse ? 0 : Math.max(0, Math.round(Number(bagsConsumed || 0)));
  const feedKgComputed = isSiloHouse ? 0 : feedBagsInt * bagWeightKg;
  const stockForSelectedPhaseKg = Number(activeHouse.feedInventoryKg?.[feedPhase] || 0);
  const stockBagsRemaining = Math.round(stockForSelectedPhaseKg / bagWeightKg);

  const siloCapacityTons = Number(activeHouse.siloCapacityTons || 20);
  const siloCapacityKg = siloCapacityTons * 1000;
  const siloCurrentKg = Number(activeHouse.siloCurrentKg ?? 14200);
  const siloFillPct = Math.min(
    100,
    Math.max(0, Math.round((siloCurrentKg / Math.max(1, siloCapacityKg)) * 100))
  );

  const waterGallonsComputed = Math.max(0, Math.round(Number(waterGallonsInput || 0)));
  const waterLitersComputed = gallonsToLiters
    ? Math.round(gallonsToLiters(waterGallonsComputed))
    : Math.round(waterGallonsComputed * 3.78541);
  const waterM3Computed = (waterLitersComputed / 1000).toFixed(2);

  // Display value in management selected unit
  const displayedWaterValue =
    waterViewUnit === 'liters'
      ? waterLitersComputed
      : waterViewUnit === 'm3'
      ? Number(waterM3Computed)
      : waterGallonsComputed;

  const handleWaterDisplayChange = (rawVal) => {
    const val = Math.max(0, Number(rawVal || 0));
    if (waterViewUnit === 'liters') {
      const gal = litersToGallons ? litersToGallons(val) : val / 3.78541;
      setWaterGallonsInput(Math.round(gal));
    } else if (waterViewUnit === 'm3') {
      const liters = val * 1000;
      const gal = litersToGallons ? litersToGallons(liters) : liters / 3.78541;
      setWaterGallonsInput(Math.round(gal));
    } else {
      setWaterGallonsInput(Math.round(val));
    }
  };

  const handleSelectHouse = (hId) => {
    setSelectedHouseId(hId);
    const target = selectableHouses.find((h) => h.id === hId);
    if (target) {
      setManualTempC(
        Number(
          (
            (Number(target.zones?.start || 28) +
              Number(target.zones?.middle || 28) +
              Number(target.zones?.end || 28)) /
            3
          ).toFixed(1)
        )
      );
      setFeedPhase(target.currentFeedPhase || 'Grower');
      setBagsConsumed(0);
      setWaterGallonsInput(0);
      setZones({
        start: target.zones?.start ?? 29,
        middle: target.zones?.middle ?? 29,
        end: target.zones?.end ?? 29,
        outside: target.zones?.outside ?? 42,
        humidity: target.zones?.humidity ?? 58,
        ammoniaPpm: target.zones?.ammoniaPpm ?? 10,
        co2Ppm: target.zones?.co2Ppm ?? 1950,
        negativePressurePa: target.zones?.negativePressurePa ?? 25,
      });
    }
  };

  const handleSubmitIncrementalLog = (e) => {
    e.preventDefault();
    if (isCleaningLocked) {
      notify('Daily poultry logging is locked while house is in 14-day Cleaning Mode.', 'warning');
      return;
    }
    if (!manualTempC || Number(manualTempC) <= 0) {
      notify('Mandatory manual house temperature (°C) is required.', 'error');
      return;
    }

    addHealthLog({
      houseId: activeHouse.id,
      shift: isManagement ? shift : detectedFieldShift.fullLabel || detectedFieldShift.label || shift,
      mortalities: Number(mortalities || 0),
      culls: Number(culls || 0),
      manualTempC: Number(manualTempC),
      zones: showFullZones ? zones : null,
      feedPhase: isSiloHouse ? activeHouse.currentFeedPhase || 'Grower' : feedPhase,
      feedBags: feedBagsInt,
      feedKg: feedKgComputed,
      waterGallons: waterGallonsComputed,
      waterLiters: waterLitersComputed,
      locked: true,
      note: note.trim(),
    });

    setMortalities(0);
    setCulls(0);
    setBagsConsumed(0);
    setWaterGallonsInput(0);
    setNote('');
  };

  const handleSubmitBagDelivery = (e) => {
    e.preventDefault();
    const bags = Math.max(0, Math.round(Number(deliveryForm.bagsCount || 0)));
    const qtyKg = bags * bagWeightKg;
    if (qtyKg <= 0) return;

    addFeedDelivery({
      houseId: activeHouse.id,
      phase: deliveryForm.phase,
      quantityKg: qtyKg,
      bagCount: bags,
      supplier: 'Alain Farms Feed Mill',
      invoiceRef: deliveryForm.invoiceRef.trim() || `AF-${Date.now().toString().slice(-4)}`,
    });
    setShowDeliveryForm(false);
    setDeliveryForm({ phase: 'Grower', bagsCount: '100', invoiceRef: '' });
  };

  const handleSubmitSiloRefill = (e) => {
    e.preventDefault();
    const tons = Number(siloRefillForm.tonsAdded || 0);
    if (tons <= 0) {
      notify('Enter valid metric tons delivered to bulk silo.', 'warning');
      return;
    }
    if (recordBulkSiloDelivery) {
      recordBulkSiloDelivery({
        houseId: activeHouse.id,
        tonsAdded: tons,
        phase: activeHouse.currentFeedPhase || 'Grower',
        supplier: siloRefillForm.supplier.trim() || 'Alain Farms Bulk Feed Fleet',
        invoiceRef: siloRefillForm.invoiceRef.trim() || `SILO-${Date.now().toString().slice(-4)}`,
        notes: siloRefillForm.note.trim(),
      });
    }
    setSiloRefillForm({ tonsAdded: '10', supplier: 'Alain Farms Bulk Feed Fleet', invoiceRef: '', note: '' });
  };

  const startEditingLockedLog = (log) => {
    const logGallons =
      log.waterGallons !== undefined
        ? Number(log.waterGallons)
        : Math.round(litersToGallons(log.waterLiters || 0));
    const logBags =
      log.feedBags !== undefined
        ? Number(log.feedBags)
        : Math.round(Number(log.feedKg || 0) / bagWeightKg);
    setEditingLogId(log.id);
    setEditLogForm({
      mortalities: Number(log.mortalities || 0),
      culls: Number(log.culls || 0),
      manualTempC: Number(log.manualTempC || 28),
      feedBags: logBags,
      waterGallons: logGallons,
      note: log.note || '',
    });
  };

  const handleSaveLockedLogOverride = (logId) => {
    if (!updateLockedHealthLog) return;
    const gal = Math.max(0, Math.round(Number(editLogForm.waterGallons || 0)));
    const liters = Math.round(gallonsToLiters(gal));
    const bags = isSiloHouse ? 0 : Math.max(0, Math.round(Number(editLogForm.feedBags || 0)));
    updateLockedHealthLog(logId, {
      mortalities: Math.max(0, Number(editLogForm.mortalities || 0)),
      culls: Math.max(0, Number(editLogForm.culls || 0)),
      manualTempC: Number(editLogForm.manualTempC || 28),
      feedBags: bags,
      feedKg: bags * bagWeightKg,
      waterGallons: gal,
      waterLiters: liters,
      note: String(editLogForm.note || '').trim(),
    });
    setEditingLogId(null);
  };

  const handleScheduleMedication = (e) => {
    e.preventDefault();
    const selectedMed = catalog.find((c) => c.id === scheduleMedForm.catalogId) || catalog[0];
    if (!selectedMed) {
      notify('No approved medication selected from catalog.', 'warning');
      return;
    }
    scheduleMedicationTask({
      houseId: activeHouse.id,
      catalogId: selectedMed.id,
      medicineName: selectedMed.name,
      category: selectedMed.category,
      dosage: selectedMed.defaultDosage,
      waterRatioPer1000Gal: selectedMed.waterRatioPer1000Gal,
      withdrawalDays: selectedMed.withdrawalDays,
      waterVolumeGallons: Number(scheduleMedForm.waterVolumeGallons || 500),
      scheduledTime: scheduleMedForm.scheduledTime || '08:00',
      assignedToRole: scheduleMedForm.assignedRole === 'worker' ? 'Worker' : 'Supervisor',
      note: scheduleMedForm.notes.trim(),
    });
    setShowScheduleMedForm(false);
    setScheduleMedForm({
      catalogId: catalog[0]?.id || '',
      waterVolumeGallons: '500',
      scheduledTime: '08:00',
      assignedRole: 'supervisor',
      notes: '',
    });
  };

  const handleIncidentPhotoChange = async (file) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setIncidentPhoto(compressed);
      notify('Incident camera photo attached & compressed.', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleSubmitIncident = (e) => {
    e.preventDefault();
    if (!incidentText.trim()) {
      notify('Please describe the incident or anomaly before submitting.', 'warning');
      return;
    }
    addIncidentNote({
      houseId: activeHouse.id,
      category: incidentCategory,
      note: incidentText.trim(),
      photoUrl: incidentPhoto || null,
      photo: incidentPhoto || null,
    });
    setIncidentText('');
    setIncidentPhoto(null);
  };

  // Locked Shift Entries & Running Shift Subtotals
  const todayStr = new Date().toISOString().slice(0, 10);
  const allHouseLogs = useMemo(
    () => (state.healthLogs || []).filter((l) => l.houseId === activeHouse.id),
    [state.healthLogs, activeHouse.id]
  );

  const activeShiftDate = useMemo(() => {
    if (allHouseLogs.some((l) => l.date === todayStr)) return todayStr;
    return allHouseLogs[0]?.date || todayStr;
  }, [allHouseLogs, todayStr]);

  const currentShiftLogs = useMemo(
    () => allHouseLogs.filter((l) => l.date === activeShiftDate),
    [allHouseLogs, activeShiftDate]
  );

  const shiftSubtotals = useMemo(() => {
    return currentShiftLogs.reduce(
      (acc, l) => {
        const bags =
          l.feedBags !== undefined
            ? Number(l.feedBags)
            : Math.round(Number(l.feedKg || 0) / bagWeightKg);
        const gal =
          l.waterGallons !== undefined
            ? Number(l.waterGallons)
            : Math.round(litersToGallons(l.waterLiters || 0));
        acc.bags += bags;
        acc.gallons += gal;
        acc.dead += Number(l.mortalities || 0);
        acc.culls += Number(l.culls || 0);
        return acc;
      },
      { bags: 0, gallons: 0, dead: 0, culls: 0 }
    );
  }, [currentShiftLogs, bagWeightKg]);

  const houseMedicationTasks = (state.medicationTasks || []).filter(
    (m) => m.houseId === activeHouse.id
  );
  const houseIncidents = (state.incidentNotes || []).filter(
    (n) => n.houseId === activeHouse.id
  );

  const isFieldUser = userRole === 'worker' || userRole === 'supervisor';
  const fieldOperationalTasks = isFieldUser
    ? getTasksForHouseAndShift(state, activeHouse.id, detectedFieldShift, userRole)
    : [];

  const unifiedFieldTasks = isFieldUser
    ? [
        ...fieldOperationalTasks.map((t) => ({
          key: `job-${t.id}`,
          kind: 'task',
          sourceType: t.sourceType || 'job',
          title: t.title,
          instructions:
            t.instructions ||
            t.workerNote ||
            `Complete inside ${activeHouse.name} during ${detectedFieldShift.label}.`,
          isDone:
            t.status === 'Submitted' || t.status === 'Approved' || t.status === 'Completed',
          raw: t,
        })),
        ...houseMedicationTasks.map((med) => ({
          key: `med-${med.id}`,
          kind: 'med',
          title: `Medication: ${med.medicineName}`,
          instructions: `Dosage: ${med.dosage} • Mix in ${Number(
            med.waterVolumeGallons || 0
          ).toLocaleString()} gal water (${med.scheduledTime || 'Scheduled'}).${
            med.note || med.notes ? ` ${med.note || med.notes}` : ''
          }`,
          isDone: med.status === 'Executed' || med.status === 'Completed',
          canAdminister:
            userRole === 'supervisor' ||
            String(med.assignedToRole || med.assignedRole || '').toLowerCase() === 'worker',
          raw: med,
        })),
      ]
    : [];

  const handleFieldObservationSubmit = (e) => {
    e.preventDefault();
    if (!incidentText.trim() && !incidentPhoto) {
      notify('Enter an observation note or attach a camera photo first.', 'warning');
      return;
    }
    addIncidentNote({
      houseId: activeHouse.id,
      category: 'General Observation',
      note: incidentText.trim() || 'Photo observation attached.',
      photoUrl: incidentPhoto || null,
      photo: incidentPhoto || null,
    });
    setIncidentText('');
    setIncidentPhoto(null);
  };

  if (isFieldUser) {
    const completedFieldCount = unifiedFieldTasks.filter((t) => t.isDone).length;
    const siloSightTons =
      activeHouse.siloSightGlassTons != null
        ? Number(activeHouse.siloSightGlassTons)
        : Number((siloCurrentKg / 1000).toFixed(1));

    return (
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Top Strip: Auto-Detected Shift, House Selection Cards & History Trigger */}
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-sm sm:p-5 dark:border-slate-700 dark:bg-slate-800/95">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-950 dark:bg-emerald-950/70 dark:text-emerald-300">
                <Clock className="h-3.5 w-3.5" />
                {detectedFieldShift.fullLabel} • Auto
              </span>
              {isSiloHouse && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-extrabold text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200">
                  <Package className="h-3.5 w-3.5" />
                  Silo House ({siloSightTons}T Rem.)
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-extrabold text-slate-800 shadow-xs transition hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <History className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              <span>History</span>
              <span className="rounded-full bg-emerald-800 px-2 py-0.5 text-[10px] font-black text-white">
                {currentShiftLogs.length}
              </span>
            </button>
          </div>

          <div>
            <p className="mb-2 text-xs font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Select Broiler House ({selectableHouses.length})
            </p>
            <BroilerHouseSelectionGrid
              houses={selectableHouses}
              selectedHouseId={activeHouse.id}
              onSelectHouse={handleSelectHouse}
              healthLogs={state.healthLogs}
              chicksPerCarton={chicksPerCarton}
              settings={state.settings}
            />
          </div>
        </div>

        {/* 1. TOP CARD: Vertically Stacked Daily Counters */}
        {isCleaningLocked ? (
          <div className="rounded-3xl border-2 border-sky-200 bg-sky-50/95 p-6 text-center shadow-sm dark:border-sky-800 dark:bg-sky-950/40">
            <p className="text-base font-black text-sky-950 dark:text-sky-200">
              {activeHouse.name} is in Mandatory Cleaning Phase
            </p>
            <p className="mt-1 text-xs font-medium text-sky-800 dark:text-sky-300">
              Daily mortality, water, and feed logging are paused until new chicks arrive. Complete tasks and observations below.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmitIncrementalLog}
            className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-5 dark:border-slate-700 dark:bg-slate-800/95"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <BroilerHouseSvgIcon className="h-8 w-8" isSilo={isSiloHouse} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    Daily Counters — {activeHouse.name}
                  </h2>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Tap +/- or enter readings directly • Incremental entries lock on submit
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-emerald-950/50 dark:text-slate-300">
                Active Birds:{' '}
                <strong className="font-black text-emerald-800 dark:text-emerald-400">
                  {Math.max(
                    0,
                    currentInv.activeChicks - Number(mortalities || 0) - Number(culls || 0)
                  ).toLocaleString()}
                </strong>
              </span>
            </div>

            <DailyCountersStack
              isManagement={false}
              isSiloHouse={isSiloHouse}
              bagWeightKg={bagWeightKg}
              mortalities={mortalities}
              setMortalities={setMortalities}
              culls={culls}
              setCulls={setCulls}
              bagsConsumed={bagsConsumed}
              setBagsConsumed={setBagsConsumed}
              feedPhase={feedPhase}
              setFeedPhase={setFeedPhase}
              feedKgComputed={feedKgComputed}
              stockBagsRemaining={stockBagsRemaining}
              waterGallonsInput={waterGallonsInput}
              setWaterGallonsInput={setWaterGallonsInput}
              waterViewUnit={waterViewUnit}
              setWaterViewUnit={setWaterViewUnit}
              displayedWaterValue={displayedWaterValue}
              handleWaterDisplayChange={handleWaterDisplayChange}
              waterGallonsComputed={waterGallonsComputed}
              waterLitersComputed={waterLitersComputed}
              waterM3Computed={waterM3Computed}
              manualTempC={manualTempC}
              setManualTempC={setManualTempC}
              shiftSubtotals={shiftSubtotals}
              currentShiftLogs={currentShiftLogs}
            />

            <button
              type="submit"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-800 py-3.5 text-sm font-black text-white shadow-md transition hover:bg-emerald-900 active:scale-[0.99]"
            >
              <Lock className="h-4 w-4" />
              Submit &amp; Lock Shift Log
            </button>
          </form>
        )}

        {/* 2. MIDDLE CARD: Clean Numbered Tasks (Task 1, Task 2, Task 3...) — Zero IDs or Filters */}
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Today&apos;s Tasks — {activeHouse.name}
                </h3>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Tap Mark Done or Mark Administered as you walk the house
                </p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {completedFieldCount} / {unifiedFieldTasks.length} Done
            </span>
          </div>

          {unifiedFieldTasks.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No scheduled tasks remaining for {activeHouse.name} this shift.
            </p>
          ) : (
            <div className="space-y-3">
              {unifiedFieldTasks.map((item, idx) => {
                const { Icon: TaskIcon, badgeClass } = getFieldTaskVisualMeta(item);
                return (
                  <div
                    key={item.key}
                    className={`flex flex-col justify-between gap-3 rounded-2xl border-2 p-4 sm:flex-row sm:items-center ${
                      item.isDone
                        ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/25'
                        : item.kind === 'med'
                        ? 'border-indigo-200 bg-indigo-50/60 dark:border-indigo-900/50 dark:bg-indigo-950/25'
                        : 'border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-xs ${badgeClass}`}
                      >
                        <TaskIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-black text-white dark:bg-slate-700">
                            Task {idx + 1}
                          </span>
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            {item.title}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          {item.instructions}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {item.isDone ? (
                        <span className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-700 px-4 py-2 text-xs font-black text-white">
                          <CheckCircle2 className="h-4 w-4" />
                          {item.kind === 'med' ? 'Administered' : 'Done'}
                        </span>
                      ) : item.kind === 'med' ? (
                        item.canAdminister ? (
                          <button
                            type="button"
                            onClick={() =>
                              executeMedicationTask(
                                item.raw.id,
                                'Administered per scheduled water ratio'
                              )
                            }
                            className="w-full rounded-2xl bg-indigo-700 px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-indigo-800 active:scale-95 sm:w-auto"
                          >
                            Mark Administered
                          </button>
                        ) : (
                          <span className="inline-flex rounded-2xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-extrabold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            Supervisor Med Task
                          </span>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (item.sourceType === 'recurring') {
                              completeRecurringTaskInstance({
                                completionKey: item.raw.completionKey,
                                ruleId: item.raw.recurringRuleId,
                                houseId: activeHouse.id,
                                note: 'Completed on shift',
                              });
                            } else {
                              submitTaskForVerification({
                                taskId: item.raw.id,
                                workerNote: 'Completed during field shift',
                              });
                            }
                          }}
                          className="w-full rounded-2xl bg-emerald-700 px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-800 active:scale-95 sm:w-auto"
                        >
                          Mark Done
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. BOTTOM CARD: Single-Box Observation & Camera Photo Upload */}
        <form
          onSubmit={handleFieldObservationSubmit}
          className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95"
        >
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Observation &amp; Photo
              </h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Snap a quick photo or note any leak, fan issue, or flock observation
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/70 px-5 py-3 text-xs font-black text-emerald-900 transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
                <Camera className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                <span>{incidentPhoto ? 'Change Camera Photo' : 'Take / Upload Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleIncidentPhotoChange(e.target.files?.[0])}
                />
              </label>

              {incidentPhoto && (
                <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-slate-300 dark:border-slate-600">
                  <img
                    src={incidentPhoto}
                    alt="Observation preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setIncidentPhoto(null)}
                    aria-label="Remove photo"
                    className="absolute top-0.5 right-0.5 rounded-full bg-slate-900/80 p-0.5 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            <textarea
              rows={3}
              value={incidentText}
              onChange={(e) => setIncidentText(e.target.value)}
              placeholder="Write any quick house observation, fan/nipple issue, or flock note..."
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-emerald-700 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />

            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-900 py-3.5 text-xs font-black text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99] dark:bg-emerald-700 dark:hover:bg-emerald-800"
            >
              Submit Observation
            </button>
          </div>
        </form>

        {/* Locked Shift Entries & Observations History Modal */}
        {showHistoryModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            onClick={() => setShowHistoryModal(false)}
          >
            <div
              className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Logged Entries History — {activeHouse.name}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Entries lock automatically upon submission ({activeShiftDate})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                  aria-label="Close history modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                {currentShiftLogs.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs font-semibold text-slate-500">
                    No locked entries recorded yet for {activeHouse.name} today.
                  </p>
                ) : (
                  currentShiftLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div>
                        <span className="inline-flex items-center gap-1 font-black text-emerald-800 dark:text-emerald-400">
                          <Lock className="h-3 w-3" /> {log.shift}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString()} • {log.loggedBy}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 font-bold">
                        <span className="rounded-lg bg-rose-100 px-2 py-0.5 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                          Dead: {log.mortalities}
                        </span>
                        <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          Culls: {log.culls}
                        </span>
                        {!isSiloHouse && (
                          <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Bags: {log.feedBags ?? Math.round((log.feedKg || 0) / bagWeightKg)}
                          </span>
                        )}
                        <span className="rounded-lg bg-sky-100 px-2 py-0.5 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                          {log.waterGallons} gal
                        </span>
                        <span className="rounded-lg bg-teal-100 px-2 py-0.5 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                          {log.manualTempC}°C
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {houseIncidents.length > 0 && (
                <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <h4 className="mb-2 text-xs font-extrabold text-slate-600 uppercase dark:text-slate-400">
                    Recent Observations ({houseIncidents.length})
                  </h4>
                  <div className="space-y-2">
                    {houseIncidents.slice(0, 6).map((inc) => {
                      const thumb = inc.photo || inc.photoDataUrl || inc.photoUrl;
                      return (
                        <div
                          key={inc.id}
                          className="flex items-start gap-2.5 rounded-2xl border border-slate-200 p-2.5 text-xs dark:border-slate-700"
                        >
                          {thumb && (
                            <img
                              src={thumb}
                              alt="Obs"
                              onClick={() => setLightboxPhoto(thumb)}
                              className="h-10 w-10 shrink-0 cursor-pointer rounded-xl object-cover"
                            />
                          )}
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {inc.note}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {inc.reportedBy} •{' '}
                              {new Date(inc.reportedAt || inc.timestamp || Date.now()).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Photo Lightbox Modal */}
        {lightboxPhoto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
            onClick={() => setLightboxPhoto(null)}
          >
            <div
              className="relative max-w-2xl overflow-hidden rounded-3xl bg-white p-2 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="absolute top-3 right-3 rounded-full bg-slate-900/80 p-1.5 text-white"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={lightboxPhoto}
                alt="Observation full view"
                className="max-h-[75vh] w-auto rounded-2xl object-contain"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Large Rectangular Broiler House Cards */}
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Daily Health, Water &amp; Shift Log
              </h2>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${
                  isSiloHouse
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200'
                    : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
                }`}
              >
                {isSiloHouse ? <Package className="h-3 w-3" /> : <Wheat className="h-3 w-3" />}
                {isSiloHouse
                  ? `Silo-Based (${siloCapacityTons}T)`
                  : `Bag-Based (${bagWeightKg}kg Fixed)`}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              Incremental shift entries lock automatically upon submission • Water defaults to Gallons (gal)
            </p>
            {isManagement && (
              <p className="mt-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                Management Note: Weekly sample bird weighing is recorded in Weights &amp; Reports.
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Select Broiler House ({selectableHouses.length})
          </p>
          <BroilerHouseSelectionGrid
            houses={selectableHouses}
            selectedHouseId={activeHouse.id}
            onSelectHouse={handleSelectHouse}
            healthLogs={state.healthLogs}
            chicksPerCarton={chicksPerCarton}
            settings={state.settings}
          />
        </div>
      </div>

      {isCleaningLocked ? (
        <div className="rounded-3xl border-2 border-sky-200 bg-sky-50/95 p-8 text-center shadow-sm dark:border-sky-800 dark:bg-sky-950/40">
          <p className="text-lg font-extrabold text-sky-950 dark:text-sky-200">
            {activeHouse.name} is currently in Mandatory 14-Day Cleaning Phase
          </p>
          <p className="mt-1 text-sm text-sky-800 dark:text-sky-300">
            Daily flock mortality, water, and feed logging are locked until sanitation completes. Incident notes remain active below.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmitIncrementalLog} className="space-y-5">
          {/* Shift Selector & Live Inventory Preview */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white/95 px-5 py-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-slate-500 uppercase dark:text-slate-400">
                Shift:
              </span>
              {shiftOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShift(s)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    shift === s
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Projected Active Birds:{' '}
              <span className="text-base font-black text-emerald-800 dark:text-emerald-400">
                {Math.max(
                  0,
                  currentInv.activeChicks - Number(mortalities || 0) - Number(culls || 0)
                ).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Vertically Stacked Daily Counters */}
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-5 dark:border-slate-700 dark:bg-slate-800/95">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <BroilerHouseSvgIcon className="h-8 w-8" isSilo={isSiloHouse} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Daily Shift Counters — {activeHouse.name}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {isSiloHouse
                      ? 'Feed Bags counter hidden for Silo-Based house • Manage bulk feed below'
                      : `Bag-Based (${bagWeightKg}kg fixed bags) • Water defaults to Gallons`}
                  </p>
                </div>
              </div>
            </div>

            <DailyCountersStack
              isManagement={isManagement}
              isSiloHouse={isSiloHouse}
              bagWeightKg={bagWeightKg}
              mortalities={mortalities}
              setMortalities={setMortalities}
              culls={culls}
              setCulls={setCulls}
              bagsConsumed={bagsConsumed}
              setBagsConsumed={setBagsConsumed}
              feedPhase={feedPhase}
              setFeedPhase={setFeedPhase}
              feedKgComputed={feedKgComputed}
              stockBagsRemaining={stockBagsRemaining}
              showDeliveryForm={showDeliveryForm}
              setShowDeliveryForm={setShowDeliveryForm}
              waterGallonsInput={waterGallonsInput}
              setWaterGallonsInput={setWaterGallonsInput}
              waterViewUnit={waterViewUnit}
              setWaterViewUnit={setWaterViewUnit}
              displayedWaterValue={displayedWaterValue}
              handleWaterDisplayChange={handleWaterDisplayChange}
              waterGallonsComputed={waterGallonsComputed}
              waterLitersComputed={waterLitersComputed}
              waterM3Computed={waterM3Computed}
              manualTempC={manualTempC}
              setManualTempC={setManualTempC}
              shiftSubtotals={shiftSubtotals}
              currentShiftLogs={currentShiftLogs}
            />
          </div>

          {/* Silo-Based House Info Card (when isSiloHouse is true) */}
          {isSiloHouse && (
            <div className="rounded-3xl border border-indigo-200 bg-indigo-50/75 p-5 shadow-sm dark:border-indigo-800 dark:bg-indigo-950/35">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-700 dark:text-indigo-300" />
                <h3 className="text-sm font-extrabold text-indigo-950 dark:text-indigo-200">
                  Silo-Based House — Bulk feed is managed in Management Silo Refills
                </h3>
              </div>
              <p className="mt-1.5 text-xs font-medium text-indigo-900/90 dark:text-indigo-300">
                This house runs automated auger feeding from its {siloCapacityTons}-Ton bulk silo.
                Daily Feed Bags entry is hidden; log truck refills or sight-glass readings below.
              </p>

              <div className="mt-3.5 rounded-2xl border border-indigo-200 bg-white/90 p-3.5 dark:border-indigo-800 dark:bg-slate-900/80">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  <span>Current Bulk Silo Level</span>
                  <span className="text-indigo-700 dark:text-indigo-300">
                    {(siloCurrentKg / 1000).toFixed(2)} / {siloCapacityTons} T ({siloFillPct}%)
                  </span>
                </div>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900">
                  <div
                    className="h-full rounded-full bg-indigo-700"
                    style={{ width: `${siloFillPct}%` }}
                  />
                </div>
                {activeHouse.lastSiloRefill && (
                  <p className="mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Last Truck Refill: {activeHouse.lastSiloRefill.tonsAdded}T on{' '}
                    {activeHouse.lastSiloRefill.date}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Expandable Full 8-Field Environmental Readings */}
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95">
            <button
              type="button"
              onClick={() => setShowFullZones((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Optional: Enter Full 8-Sensor Walkaround (4 Zones, Humidity, NH₃, CO₂ &amp; Pressure)
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Expand to update house control gauges during physical inspection
                </p>
              </div>
              {showFullZones ? (
                <ChevronUp className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              )}
            </button>

            {showFullZones && (
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4 dark:border-slate-700">
                {[
                  ['start', 'Start Zone (°C)', '0.1'],
                  ['middle', 'Middle Zone (°C)', '0.1'],
                  ['end', 'End Zone (°C)', '0.1'],
                  ['outside', 'Outside UAE (°C)', '0.1'],
                  ['humidity', 'Humidity (%)', '1'],
                  ['ammoniaPpm', 'NH₃ (ppm)', '1'],
                  ['co2Ppm', 'CO₂ (ppm)', '10'],
                  ['negativePressurePa', 'Neg. Pressure (Pa)', '1'],
                ].map(([key, label, stepVal]) => (
                  <div key={key}>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600 uppercase dark:text-slate-300">
                      {label}
                    </label>
                    <input
                      type="number"
                      step={stepVal}
                      value={zones[key]}
                      onChange={(e) =>
                        setZones((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 focus:border-emerald-700 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes & Submit & Lock CTA */}
          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-800/95">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional shift observations (litter quality, drinker flow, cooling pads)..."
              className="flex-1 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-emerald-700 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-800 px-7 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:bg-emerald-900 active:scale-[0.99]"
            >
              <Lock className="h-4 w-4" />
              Submit &amp; Lock Incremental Entry
            </button>
          </div>
        </form>
      )}

      {/* Management-Only: Bulk Silo Truck Delivery Panel (on Silo Houses) */}
      {isManagement && isSiloHouse && (
        <form
          onSubmit={handleSubmitSiloRefill}
          className="rounded-3xl border-2 border-indigo-200 bg-white/95 p-5 shadow-sm dark:border-indigo-800"
        >
          <div className="mb-3 flex items-center gap-2">
            <Truck className="h-5 w-5 text-indigo-700 dark:text-indigo-300" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Log 20T Bulk Silo Truck Delivery — {activeHouse.name}
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600 uppercase">
                Tons Delivered (T)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max={siloCapacityTons}
                required
                value={siloRefillForm.tonsAdded}
                onChange={(e) => setSiloRefillForm((p) => ({ ...p, tonsAdded: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600 uppercase">
                Supplier / Fleet
              </label>
              <input
                type="text"
                value={siloRefillForm.supplier}
                onChange={(e) => setSiloRefillForm((p) => ({ ...p, supplier: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600 uppercase">
                Ticket / Invoice #
              </label>
              <input
                type="text"
                value={siloRefillForm.invoiceRef}
                onChange={(e) => setSiloRefillForm((p) => ({ ...p, invoiceRef: e.target.value }))}
                placeholder="AF-SILO-902"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-700 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-800"
              >
                + Record Silo Refill
              </button>
            </div>
          </div>

          {/* Silo Sight-Glass / Remaining Tonnage (Future Load-Cell Sensor Ready) */}
          <div className="mt-4 border-t border-indigo-200/80 pt-4 dark:border-indigo-800">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">
                Sight-Glass Remaining Tonnage Reading (Tons) — Load-Cell Sensor Ready
              </span>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-black text-indigo-900 dark:bg-indigo-900/50 dark:text-indigo-200">
                Current: {activeHouse.siloSightGlassTons ?? (siloCurrentKg / 1000).toFixed(2)} T
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="0"
                max={siloCapacityTons}
                value={sightGlassTonsInput}
                onChange={(e) => setSightGlassTonsInput(e.target.value)}
                placeholder={`e.g. ${(siloCurrentKg / 1000).toFixed(1)} T`}
                className="w-36 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs font-bold dark:border-indigo-700 dark:bg-slate-900"
              />
              <input
                type="text"
                value={sightGlassNote}
                onChange={(e) => setSightGlassNote(e.target.value)}
                placeholder="Bottom-quarter sight-glass or scale check..."
                className="min-w-[180px] flex-1 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs dark:border-indigo-700 dark:bg-slate-900"
              />
              <button
                type="button"
                onClick={() => {
                  if (sightGlassTonsInput === '' || Number(sightGlassTonsInput) < 0) return;
                  recordSiloSightGlassReading({
                    houseId: activeHouse.id,
                    remainingTons: Number(sightGlassTonsInput),
                    method: 'manual-sight-glass',
                    note: sightGlassNote.trim() || 'Manual sight-glass reading logged',
                  });
                  setSightGlassTonsInput('');
                  setSightGlassNote('');
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700"
              >
                Update Sight-Glass (T)
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Management-Only: Bag Feed Delivery Inline Drawer */}
      {isManagement && !isSiloHouse && showDeliveryForm && (
        <form
          onSubmit={handleSubmitBagDelivery}
          className="rounded-3xl border-2 border-emerald-200 bg-white/95 p-5 shadow-md"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <Package className="h-4 w-4 text-emerald-700" />
              Receive {bagWeightKg}kg Bag Delivery — {activeHouse.name}
            </h3>
            <button
              type="button"
              onClick={() => setShowDeliveryForm(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <select
              value={deliveryForm.phase}
              onChange={(e) => setDeliveryForm((p) => ({ ...p, phase: e.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
            >
              <option value="Starter">Starter</option>
              <option value="Grower">Grower</option>
              <option value="Finisher">Finisher</option>
            </select>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={deliveryForm.bagsCount}
              onChange={(e) => setDeliveryForm((p) => ({ ...p, bagsCount: e.target.value }))}
              placeholder={`Number of ${bagWeightKg}kg bags`}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
            />
            <input
              type="text"
              value={deliveryForm.invoiceRef}
              onChange={(e) => setDeliveryForm((p) => ({ ...p, invoiceRef: e.target.value }))}
              placeholder="Invoice / Slip #"
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs"
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-800 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-900"
            >
              Add {deliveryForm.bagsCount || 0} Bags ({((Number(deliveryForm.bagsCount || 0) * bagWeightKg) / 1000).toFixed(2)} T)
            </button>
          </div>
        </form>
      )}

      {/* Current Shift Locked Entries + Running Subtotals */}
      <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
              <Lock className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              Current Shift Locked Entries — {activeHouse.name} ({activeShiftDate})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submitted entries are locked permanently against tampering.
              {isOwner && manualOverrideEnabled && ' Super Admin Override Edit is ACTIVE.'}
            </p>
          </div>

          {/* Running Shift Subtotals Strip & Contextual Super Admin Override Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {isOwner && (
              <button
                type="button"
                onClick={() => setManualOverrideEnabled(!manualOverrideEnabled)}
                className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-xs font-extrabold transition ${
                  manualOverrideEnabled
                    ? 'border-amber-500 bg-amber-500 text-white shadow-sm hover:bg-amber-600'
                    : 'border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200 dark:hover:bg-amber-900/60'
                }`}
              >
                {manualOverrideEnabled ? (
                  <Unlock className="h-3.5 w-3.5" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                {manualOverrideEnabled
                  ? 'Super Admin: Lock Entries (Override Active)'
                  : 'Super Admin: Unlock Entries for Override Edit'}
              </button>
            )}
            {!isSiloHouse && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                Total Bags Today: {shiftSubtotals.bags} ({shiftSubtotals.bags * bagWeightKg} kg)
              </span>
            )}
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-extrabold text-sky-900 dark:bg-sky-950 dark:text-sky-200">
              Total Gallons: {shiftSubtotals.gallons.toLocaleString()} gal
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-extrabold text-red-900 dark:bg-red-950 dark:text-red-200">
              Total Dead / Culls: {shiftSubtotals.dead} / {shiftSubtotals.culls}
            </span>
          </div>
        </div>

        {currentShiftLogs.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-center text-xs font-semibold text-slate-500">
            No locked shift entries recorded for {activeHouse.name} yet today.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-2 pr-3">Status / Time</th>
                  <th className="py-2 pr-3">Operator</th>
                  <th className="py-2 pr-3">Dead / Sick</th>
                  <th className="py-2 pr-3">Temp</th>
                  <th className="py-2 pr-3">Feed</th>
                  <th className="py-2 pr-3">Water</th>
                  <th className="py-2 pr-3">Notes</th>
                  {isOwner && manualOverrideEnabled && <th className="py-2 text-right">Override</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70">
                {currentShiftLogs.map((log) => {
                  const gal =
                    log.waterGallons !== undefined
                      ? Number(log.waterGallons)
                      : Math.round(litersToGallons(log.waterLiters || 0));
                  const liters =
                    log.waterLiters !== undefined
                      ? Number(log.waterLiters)
                      : Math.round(gallonsToLiters(gal));
                  const bags =
                    log.feedBags !== undefined
                      ? Number(log.feedBags)
                      : Math.round(Number(log.feedKg || 0) / bagWeightKg);
                  const isEditingThis = editingLogId === log.id;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/70">
                      <td className="py-2.5 pr-3">
                        <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
                          <Lock className="h-3 w-3 text-emerald-700" />
                          Locked
                        </div>
                        <p className="mt-0.5 font-semibold text-slate-900">{log.shift}</p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3 font-medium text-slate-700">{log.loggedBy}</td>
                      <td className="py-2.5 pr-3 font-bold">
                        {isEditingThis ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={editLogForm.mortalities}
                              onChange={(e) =>
                                setEditLogForm((p) => ({ ...p, mortalities: e.target.value }))
                              }
                              className="w-14 rounded-lg border border-slate-300 px-1.5 py-1 text-xs font-bold"
                            />
                            /
                            <input
                              type="number"
                              min="0"
                              value={editLogForm.culls}
                              onChange={(e) =>
                                setEditLogForm((p) => ({ ...p, culls: e.target.value }))
                              }
                              className="w-14 rounded-lg border border-slate-300 px-1.5 py-1 text-xs font-bold"
                            />
                          </div>
                        ) : (
                          <>
                            <span className="text-red-700 dark:text-red-400">{log.mortalities}</span> /{' '}
                            <span className="text-amber-700 dark:text-amber-400">{log.culls}</span>
                          </>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 font-bold text-emerald-800 dark:text-emerald-400">
                        {isEditingThis ? (
                          <input
                            type="number"
                            step="0.1"
                            value={editLogForm.manualTempC}
                            onChange={(e) =>
                              setEditLogForm((p) => ({ ...p, manualTempC: e.target.value }))
                            }
                            className="w-16 rounded-lg border border-slate-300 px-1.5 py-1 text-xs font-bold"
                          />
                        ) : (
                          `${log.manualTempC}°C`
                        )}
                      </td>
                      <td className="py-2.5 pr-3 font-medium text-slate-700">
                        {isSiloHouse ? (
                          <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                            Silo Automated
                          </span>
                        ) : isEditingThis ? (
                          <input
                            type="number"
                            min="0"
                            value={editLogForm.feedBags}
                            onChange={(e) =>
                              setEditLogForm((p) => ({ ...p, feedBags: e.target.value }))
                            }
                            className="w-16 rounded-lg border border-slate-300 px-1.5 py-1 text-xs font-bold"
                          />
                        ) : (
                          `${bags} bags (${log.feedPhase || activeHouse.currentFeedPhase})`
                        )}
                      </td>
                      <td className="py-2.5 pr-3 font-semibold text-sky-800 dark:text-sky-300">
                        {isEditingThis ? (
                          <input
                            type="number"
                            min="0"
                            value={editLogForm.waterGallons}
                            onChange={(e) =>
                              setEditLogForm((p) => ({ ...p, waterGallons: e.target.value }))
                            }
                            className="w-20 rounded-lg border border-slate-300 px-1.5 py-1 text-xs font-bold"
                          />
                        ) : (
                          <>
                            {gal.toLocaleString()} gal
                            {isManagement && (
                              <span className="block text-[10px] font-normal text-slate-500">
                                ({liters.toLocaleString()} L)
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600">
                        {isEditingThis ? (
                          <input
                            type="text"
                            value={editLogForm.note}
                            onChange={(e) =>
                              setEditLogForm((p) => ({ ...p, note: e.target.value }))
                            }
                            className="w-36 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                          />
                        ) : (
                          log.note || '—'
                        )}
                        {(log.overriddenBy || log.overrideAudit?.[0]?.actor) && (
                          <span className="mt-0.5 block text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            Edited by {log.overriddenBy || log.overrideAudit?.[0]?.actor}
                          </span>
                        )}
                      </td>
                      {isOwner && manualOverrideEnabled && (
                        <td className="py-2.5 text-right">
                          {isEditingThis ? (
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveLockedLogOverride(log.id)}
                                className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-extrabold text-white hover:bg-amber-700"
                              >
                                <Save className="h-3 w-3" />
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingLogId(null)}
                                className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-bold text-slate-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditingLockedLog(log)}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-400 bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-900 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-200"
                            >
                              <Edit3 className="h-3 w-3" />
                              Override Edit
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bottom Grid: Scheduled Structured Medications + Incident / Anomaly Notes (+ Photo) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Scheduled Medication Doses (No Free-Text Medicine Inputs!) */}
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <Pill className="h-4 w-4 text-emerald-700" />
                Scheduled Medication Doses — {activeHouse.name}
              </h3>
              <p className="text-[11px] text-slate-500">
                Strictly scheduled from Approved Medication Catalog (no free-text entry)
              </p>
            </div>
            {isManagement && (
              <button
                type="button"
                onClick={() => setShowScheduleMedForm((v) => !v)}
                className="rounded-full bg-emerald-800 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-900"
              >
                + Schedule Dose from Catalog
              </button>
            )}
          </div>

          {/* Manager / Owner: Schedule Dose from Approved Catalog */}
          {isManagement && showScheduleMedForm && (
            <form
              onSubmit={handleScheduleMedication}
              className="mb-4 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800 dark:bg-emerald-950/30"
            >
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-700 uppercase">
                  Select Approved Medicine / Vaccine
                </label>
                <select
                  value={scheduleMedForm.catalogId}
                  onChange={(e) => setScheduleMedForm((p) => ({ ...p, catalogId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900"
                >
                  {catalog.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.category}) — {item.defaultDosage}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    Water Vol (gal)
                  </label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    required
                    value={scheduleMedForm.waterVolumeGallons}
                    onChange={(e) =>
                      setScheduleMedForm((p) => ({ ...p, waterVolumeGallons: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    Scheduled Time
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduleMedForm.scheduledTime}
                    onChange={(e) =>
                      setScheduleMedForm((p) => ({ ...p, scheduledTime: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    Executor Role
                  </label>
                  <select
                    value={scheduleMedForm.assignedRole}
                    onChange={(e) =>
                      setScheduleMedForm((p) => ({ ...p, assignedRole: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold"
                  >
                    <option value="supervisor">Supervisor</option>
                    <option value="worker">Assigned Worker</option>
                  </select>
                </div>
              </div>
              <input
                type="text"
                value={scheduleMedForm.notes}
                onChange={(e) => setScheduleMedForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Water fasting or tank mixing instructions..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-800 py-2 text-xs font-extrabold text-white hover:bg-emerald-900"
              >
                Confirm Scheduled Medication Task
              </button>
            </form>
          )}

          <div className="space-y-3">
            {houseMedicationTasks.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-xs font-semibold text-slate-500">
                No scheduled medication doses for {activeHouse.name}.
              </p>
            ) : (
              houseMedicationTasks.map((med) => {
                const isDone = ['administered', 'completed'].includes(
                  String(med.status || '').toLowerCase()
                );
                const assignedToWorker =
                  String(med.assignedToRole || med.assignedRole || '').toLowerCase() === 'worker' ||
                  med.assignedTo === currentUser?.name;
                const canExecuteThisMed = canExecuteStandardMeds || assignedToWorker;

                return (
                  <div
                    key={med.id}
                    className={`rounded-2xl border p-3.5 ${
                      isDone
                        ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30'
                        : 'border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-900">
                        {med.medicineName}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                          isDone
                            ? 'bg-emerald-700 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {isDone ? 'Administered' : 'Scheduled'}
                      </span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-700">
                      <span>Dosage: {med.dosage}</span>
                      <span>
                        Water Volume:{' '}
                        <strong>{Number(med.waterVolumeGallons || 0).toLocaleString()} gal</strong>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-500" />
                        Time: {med.scheduledTime || 'Scheduled'}
                      </span>
                      <span>Executor: {med.assignedToRole || med.assignedRole || 'Supervisor'}</span>
                    </div>

                    {(med.note || med.notes) && (
                      <p className="mt-1.5 text-[11px] text-slate-600">{med.note || med.notes}</p>
                    )}

                    {isDone ? (
                      <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Administered by {med.administeredBy || med.executedBy} •{' '}
                        {med.administeredAt || med.executedAt
                          ? new Date(med.administeredAt || med.executedAt).toLocaleString()
                          : ''}
                      </p>
                    ) : canExecuteThisMed ? (
                      <div className="mt-2.5 flex items-center gap-2">
                        <input
                          type="text"
                          value={medExecNotes[med.id] || ''}
                          onChange={(e) =>
                            setMedExecNotes((p) => ({ ...p, [med.id]: e.target.value }))
                          }
                          placeholder="Optional execution note..."
                          className="flex-1 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-[11px]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            executeMedicationTask(
                              med.id,
                              medExecNotes[med.id]?.trim() || 'Administered per scheduled water ratio.'
                            )
                          }
                          className="shrink-0 rounded-xl bg-emerald-800 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-900"
                        >
                          Mark Dose Administered
                        </button>
                      </div>
                    ) : (
                      <p className="mt-2 text-[11px] font-bold text-slate-500">
                        Read-only visibility — Execution reserved for Supervisor / Management
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Report Incident / Anomaly Note (+ Camera Photo Upload) */}
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              Report Incident / Anomaly Note (+ Photo)
            </h3>
            <p className="text-[11px] text-slate-500">
              Flag equipment faults, water gauge errors, cooling leaks, or flock observations directly to Management
            </p>
          </div>

          <form onSubmit={handleSubmitIncident} className="space-y-3 rounded-2xl bg-slate-50 p-3.5">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-700 uppercase">
                Anomaly Category
              </label>
              <select
                value={incidentCategory}
                onChange={(e) => setIncidentCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900"
              >
                {ANOMALY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-700 uppercase">
                Incident Observation Note
              </label>
              <textarea
                rows={2}
                required
                value={incidentText}
                onChange={(e) => setIncidentText(e.target.value)}
                placeholder="Describe fault location, gauge reading discrepancy, or bird condition..."
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                <Camera className="h-4 w-4 text-rose-600" />
                {incidentPhoto ? 'Camera Photo Attached' : 'Attach Camera Photo'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleIncidentPhotoChange(e.target.files?.[0])}
                />
              </label>

              {incidentPhoto && (
                <div className="flex items-center gap-2">
                  <img
                    src={incidentPhoto}
                    alt="Incident preview"
                    className="h-10 w-10 rounded-lg border border-slate-300 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setIncidentPhoto(null)}
                    className="text-xs font-bold text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="ml-auto rounded-xl bg-rose-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-rose-700"
              >
                Submit Incident Note
              </button>
            </div>
          </form>

          {/* Recent House Incident Notes List */}
          <div className="space-y-2.5">
            <p className="text-xs font-extrabold text-slate-700 uppercase">
              Recent Incident Notes — {activeHouse.name} ({houseIncidents.length})
            </p>
            {houseIncidents.length === 0 ? (
              <p className="text-xs text-slate-500">No incident notes logged for this house.</p>
            ) : (
              houseIncidents.map((item) => {
                const photoSrc = item.photo || item.photoDataUrl || item.photoUrl || null;
                const isAcked = Boolean(item.acknowledged || item.status === 'acknowledged');
                return (
                  <div
                    key={item.id}
                    className={`flex items-start justify-between gap-3 rounded-2xl border p-3 ${
                      isAcked
                        ? 'border-slate-200 bg-slate-50'
                        : 'border-rose-200 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/30'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {photoSrc && (
                        <button
                          type="button"
                          onClick={() => setLightboxPhoto(photoSrc)}
                          className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-300"
                          title="View incident photo"
                        >
                          <img
                            src={photoSrc}
                            alt={item.category}
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                            <Eye className="h-4 w-4 text-white" />
                          </span>
                        </button>
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-800 uppercase dark:bg-rose-950 dark:text-rose-300">
                            {item.category}
                          </span>
                          {isAcked && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <ShieldCheck className="h-3 w-3" />
                              Acknowledged
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs font-medium text-slate-800">{item.note}</p>
                        <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                          {item.reportedBy} •{' '}
                          {new Date(
                            item.reportedAt || item.timestamp || item.createdAt || Date.now()
                          ).toLocaleString()}
                          {item.acknowledgedBy && ` • Ack by ${item.acknowledgedBy}`}
                        </p>
                      </div>
                    </div>

                    {isManagement && !isAcked && (
                      <button
                        type="button"
                        onClick={() => acknowledgeIncidentNote(item.id)}
                        className="shrink-0 rounded-xl bg-emerald-700 px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-emerald-800"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Photo Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-2xl overflow-hidden rounded-3xl bg-white p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-3 right-3 rounded-full bg-slate-900/80 p-1.5 text-white hover:bg-slate-900"
              aria-label="Close photo preview"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={lightboxPhoto}
              alt="Incident photo"
              className="max-h-[75vh] w-auto rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
