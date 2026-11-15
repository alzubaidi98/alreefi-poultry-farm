import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Droplets,
  Flame,
  Gauge,
  Lock,
  Package,
  PackagePlus,
  Power,
  Radio,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Thermometer,
  Truck,
  Unlock,
  Wheat,
  Wind,
} from 'lucide-react';
import {
  calculateHouseInventory,
  evaluateHouseEnvironmentStatus,
} from '../mockData.js';
import { compressImageFile } from '../services/storageService.js';
import { useFarm } from '../App.jsx';

function ZoneRadialGauge({ label, valueC, targetBand, isOutside = false }) {
  const min = isOutside ? 15 : 18;
  const max = isOutside ? 52 : 42;
  const numericVal = Number(valueC || 0);
  const ratio = Math.min(1, Math.max(0, (numericVal - min) / (max - min)));
  const circumference = 251.2; // 2 * pi * 40
  const arcLen = ratio * (circumference * 0.75); // 270 deg gauge

  let ringColor = '#16a34a';
  let statusText = 'In Target';

  if (isOutside) {
    ringColor = numericVal >= 40 ? '#dc2626' : numericVal >= 34 ? '#d97706' : '#0284c7';
    statusText = numericVal >= 40 ? 'UAE Extreme Heat' : 'Outdoor Ambient';
  } else if (targetBand) {
    const dev = Math.max(numericVal - targetBand.targetMaxC, targetBand.targetMinC - numericVal, 0);
    if (dev >= targetBand.alertOffsetC) {
      ringColor = '#dc2626';
      statusText = `Alert (${targetBand.targetMinC}–${targetBand.targetMaxC}°C)`;
    } else if (dev > 0) {
      ringColor = '#d97706';
      statusText = `Drifting (${targetBand.targetMinC}–${targetBand.targetMaxC}°C)`;
    } else {
      ringColor = '#16a34a';
      statusText = `Optimal (${targetBand.targetMinC}–${targetBand.targetMaxC}°C)`;
    }
  }

  return (
    <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="relative flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-[225deg]">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="10"
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={ringColor}
            strokeWidth="10"
            strokeDasharray={`${arcLen} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            {numericVal.toFixed(1)}°C
          </span>
          <span className="text-[10px] font-bold text-slate-500 uppercase">
            {isOutside ? 'Exterior' : 'Interior'}
          </span>
        </div>
      </div>

      <p className="mt-1 text-sm font-extrabold text-slate-900">{label}</p>
      <p
        className={`mt-0.5 text-center text-[11px] font-bold ${
          ringColor === '#dc2626'
            ? 'text-red-600 dark:text-red-400'
            : ringColor === '#d97706'
            ? 'text-amber-600 dark:text-amber-400'
            : ringColor === '#0284c7'
            ? 'text-sky-600 dark:text-sky-400'
            : 'text-emerald-700 dark:text-emerald-400'
        }`}
      >
        {statusText}
      </p>
    </div>
  );
}

function EnvMetricCard({ icon: Icon, title, value, unit, status, targetText, pctFill, markerRange }) {
  const toneClasses =
    status === 'ALERT'
      ? {
          border: 'border-red-300 dark:border-red-800',
          badge: 'bg-red-600 text-white',
          bar: 'bg-red-600',
          iconBg: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
        }
      : status === 'ATTENTION'
      ? {
          border: 'border-amber-300 dark:border-amber-800',
          badge: 'bg-amber-500 text-white',
          bar: 'bg-amber-500',
          iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
        }
      : {
          border: 'border-emerald-200 dark:border-emerald-800/70',
          badge: 'bg-emerald-600 text-white',
          bar: 'bg-emerald-600',
          iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
        };

  return (
    <div className={`flex flex-col justify-between rounded-3xl border bg-white p-4 shadow-sm ${toneClasses.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses.iconBg}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-slate-900">{title}</p>
            <p className="text-[11px] font-semibold text-slate-500">{targetText}</p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${toneClasses.badge}`}>
          {status}
        </span>
      </div>

      <div className="mt-3">
        <p className="text-2xl font-black text-slate-900">
          {value} <span className="text-xs font-bold text-slate-500">{unit}</span>
        </p>
        <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          {markerRange && (
            <div
              className="absolute inset-y-0 bg-emerald-200/70 dark:bg-emerald-800/40"
              style={{ left: `${markerRange.left}%`, width: `${markerRange.width}%` }}
            />
          )}
          <div
            className={`relative h-full rounded-full transition-all duration-300 ${toneClasses.bar}`}
            style={{ width: `${Math.min(100, Math.max(4, pctFill))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function PoultryDashboard() {
  const {
    state,
    userRole,
    visibleHouses,
    selectedHouseId,
    setSelectedHouseId,
    navigateTo,
    setIsEmergencyModalOpen,
    manualOverrideEnabled,
    liveSensorEnabled,
    setLiveSensorEnabled,
    toggleHouseActive,
    updateHouseZones,
    applyManualOverride,
    recordFinalCatch,
    recordFinalCatchAndStartCleaning,
    startNewCycle,
    startNewFlockCycle,
    submitCleaningStep,
    reviewCleaningStep,
    verifyCleaningStep,
    finishCleaningAndReadyHouse,
    recordBulkSiloDelivery,
    recordSiloSightGlassReading,
    clonePreviousHouseTeam,
    notify,
  } = useFarm();

  const isManagement = userRole === 'owner' || userRole === 'manager';
  const isOwner = userRole === 'owner';

  const selectableHouses = isManagement
    ? (state.houses || []).filter((h) => !h.archived)
    : visibleHouses || [];

  const house =
    selectableHouses.find((h) => h.id === selectedHouseId) ||
    visibleHouses[0] ||
    state.houses?.[0];

  const chicksPerCarton = state.settings?.contractRules?.chicksPerCarton || 100;
  const envLimits = state.settings?.environmentLimits || {};
  const humMin = envLimits.humidityMin ?? 50;
  const humMax = envLimits.humidityMax ?? 65;
  const nh3Warn = envLimits.ammoniaWarningPpm ?? 15;
  const nh3Alert = envLimits.ammoniaAlertPpm ?? 20;
  const co2Warn = envLimits.co2WarningPpm ?? 2500;
  const co2Alert = envLimits.co2AlertPpm ?? 3000;
  const negMin = envLimits.negPressureMinPa ?? 18;
  const negMax = envLimits.negPressureMaxPa ?? 38;

  // Interactive Modal / Drawer States
  const [showManualEnvEditor, setShowManualEnvEditor] = useState(false);
  const [envForm, setEnvForm] = useState({
    start: house?.zones?.start ?? 28,
    middle: house?.zones?.middle ?? 28,
    end: house?.zones?.end ?? 28,
    outside: house?.zones?.outside ?? 42,
    humidity: house?.zones?.humidity ?? 58,
    ammoniaPpm: house?.zones?.ammoniaPpm ?? 10,
    co2Ppm: house?.zones?.co2Ppm ?? 1950,
    negativePressurePa: house?.zones?.negativePressurePa ?? 25,
  });

  const [showSiloRefillModal, setShowSiloRefillModal] = useState(false);
  const [siloForm, setSiloForm] = useState({
    tonsAdded: '10',
    supplier: 'Alain Farms Bulk Feed Fleet',
    invoiceRef: '',
    note: '',
  });
  const [sightGlassInput, setSightGlassInput] = useState('');
  const [sightGlassNote, setSightGlassNote] = useState('');

  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    manualCountOverride: '',
    cycleDay: house?.cycleDay || 1,
    cleaningDay: house?.cleaningDay || 1,
    reason: '',
  });

  const [showFinalCatchModal, setShowFinalCatchModal] = useState(false);
  const [catchForm, setCatchForm] = useState({
    harvestedBirds: '',
    avgWeightGrams: 1475,
    totalCatchKg: '',
    notes: '',
  });

  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  const [newCycleForm, setNewCycleForm] = useState({
    cartons: 150,
    targetCycleDays: state.settings?.contractRules?.defaultTargetCycleDays || 35,
    cycleStartDate: new Date().toISOString().slice(0, 10),
  });

  const [cleaningNotes, setCleaningNotes] = useState({});
  const [cleaningPhotos, setCleaningPhotos] = useState({});
  const [recleanNotes, setRecleanNotes] = useState({});

  if (!house) {
    return (
      <div className="rounded-3xl bg-white/95 p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-slate-700">No houses available for your profile.</p>
      </div>
    );
  }

  const inventory = calculateHouseInventory(house, chicksPerCarton, state.healthLogs || []);
  const envEval = evaluateHouseEnvironmentStatus(house, state.settings);
  const avgInsideTemp = (
    (Number(house.zones?.start || 0) +
      Number(house.zones?.middle || 0) +
      Number(house.zones?.end || 0)) /
    3
  ).toFixed(1);
  const thermalDelta = (Number(house.zones?.outside || 0) - Number(avgInsideTemp)).toFixed(1);

  const isSilo = house.feedSystemType === 'silo';
  const isInactive = house.isActive === false;
  const bagWeightKg = Number(house.bagWeightKg || 50);
  const siloCapacityTons = Number(house.siloCapacityTons || 20);
  const siloCapacityKg = siloCapacityTons * 1000;
  const siloCurrentKg = Number(house.siloCurrentKg ?? 14200);
  const siloFillPct = Math.min(100, Math.max(0, Math.round((siloCurrentKg / Math.max(1, siloCapacityKg)) * 100)));

  const feedStarterKg = Number(house.feedInventoryKg?.Starter || 0);
  const feedGrowerKg = Number(house.feedInventoryKg?.Grower || 0);
  const feedFinisherKg = Number(house.feedInventoryKg?.Finisher || 0);
  const feedTotalKg = feedStarterKg + feedGrowerKg + feedFinisherKg;

  // Status calculations for 4 air-quality / pressure cards
  const humVal = Number(house.zones?.humidity ?? 58);
  const humStatus =
    humVal < humMin - 10 || humVal > humMax + 10
      ? 'ALERT'
      : humVal < humMin || humVal > humMax
      ? 'ATTENTION'
      : 'OPTIMAL';

  const nh3Val = Number(house.zones?.ammoniaPpm ?? 8);
  const nh3Status = nh3Val >= nh3Alert ? 'ALERT' : nh3Val >= nh3Warn ? 'ATTENTION' : 'OPTIMAL';

  const co2Val = Number(house.zones?.co2Ppm ?? 1950);
  const co2Status = co2Val >= co2Alert ? 'ALERT' : co2Val >= co2Warn ? 'ATTENTION' : 'OPTIMAL';

  const negPaVal = Number(house.zones?.negativePressurePa ?? house.negativePressurePa ?? 25);
  const negPaStatus =
    negPaVal <= negMin - 2 || negPaVal >= negMax + 4
      ? 'ALERT'
      : negPaVal < negMin || negPaVal > negMax
      ? 'ATTENTION'
      : 'OPTIMAL';

  const openEnvEditor = () => {
    setEnvForm({
      start: house.zones?.start ?? 28,
      middle: house.zones?.middle ?? 28,
      end: house.zones?.end ?? 28,
      outside: house.zones?.outside ?? 42,
      humidity: house.zones?.humidity ?? 58,
      ammoniaPpm: house.zones?.ammoniaPpm ?? 10,
      co2Ppm: house.zones?.co2Ppm ?? 1950,
      negativePressurePa: house.zones?.negativePressurePa ?? 25,
    });
    setShowManualEnvEditor(true);
  };

  const handleSaveEnv = (e) => {
    e.preventDefault();
    updateHouseZones(house.id, {
      start: Number(envForm.start),
      middle: Number(envForm.middle),
      end: Number(envForm.end),
      outside: Number(envForm.outside),
      humidity: Number(envForm.humidity),
      ammoniaPpm: Number(envForm.ammoniaPpm),
      co2Ppm: Number(envForm.co2Ppm),
      negativePressurePa: Number(envForm.negativePressurePa),
    });
    setShowManualEnvEditor(false);
  };

  const handleSiloRefillSubmit = (e) => {
    e.preventDefault();
    const tons = Number(siloForm.tonsAdded || 0);
    if (tons <= 0) {
      notify('Enter a valid refill tonnage greater than 0.', 'warning');
      return;
    }
    if (recordBulkSiloDelivery) {
      recordBulkSiloDelivery({
        houseId: house.id,
        tonsAdded: tons,
        phase: house.currentFeedPhase || 'Grower',
        supplier: siloForm.supplier.trim() || 'Alain Farms Bulk Feed Fleet',
        invoiceRef: siloForm.invoiceRef.trim() || `SILO-${Date.now().toString().slice(-4)}`,
        notes: siloForm.note.trim(),
      });
    }
    setShowSiloRefillModal(false);
    setSiloForm({ tonsAdded: '10', supplier: 'Alain Farms Bulk Feed Fleet', invoiceRef: '', note: '' });
  };

  const openOverride = () => {
    setOverrideForm({
      manualCountOverride:
        house.manualCountOverride !== null && house.manualCountOverride !== undefined
          ? String(house.manualCountOverride)
          : String(inventory.activeChicks),
      cycleDay: house.cycleDay,
      cleaningDay: house.cleaningDay || 1,
      reason: '',
    });
    setShowOverrideModal(true);
  };

  const handleSaveOverride = (e) => {
    e.preventDefault();
    if (!overrideForm.reason.trim()) {
      notify('Please enter an audit reason for the Manual Override.', 'warning');
      return;
    }
    applyManualOverride(house.id, {
      manualCountOverride:
        overrideForm.manualCountOverride === '' ? null : Number(overrideForm.manualCountOverride),
      cycleDay: Number(overrideForm.cycleDay),
      cleaningDay: Number(overrideForm.cleaningDay),
      reason: overrideForm.reason.trim(),
    });
    setShowOverrideModal(false);
  };

  const openFinalCatch = () => {
    const estTotalKg = Math.round((inventory.activeChicks * 1475) / 1000);
    setCatchForm({
      harvestedBirds: String(inventory.activeChicks),
      avgWeightGrams: 1475,
      totalCatchKg: String(estTotalKg),
      notes: '',
    });
    setShowFinalCatchModal(true);
  };

  const handleFinalCatchSubmit = (e) => {
    e.preventDefault();
    const payload = {
      houseId: house.id,
      harvestedBirds: Number(catchForm.harvestedBirds || inventory.activeChicks),
      avgWeightGrams: Number(catchForm.avgWeightGrams || 1475),
      totalCatchKg: Number(catchForm.totalCatchKg || 0),
      notes: catchForm.notes.trim(),
    };
    if (recordFinalCatch) {
      recordFinalCatch(house.id, payload);
    } else if (recordFinalCatchAndStartCleaning) {
      recordFinalCatchAndStartCleaning(payload);
    }
    setShowFinalCatchModal(false);
  };

  const handleNewCycleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      houseId: house.id,
      cartons: Number(newCycleForm.cartons),
      targetCycleDays: Number(newCycleForm.targetCycleDays),
      cycleStartDate: newCycleForm.cycleStartDate,
    };
    if (startNewCycle) {
      startNewCycle(house.id, payload);
    } else if (startNewFlockCycle) {
      startNewFlockCycle(payload);
    }
    setShowNewCycleModal(false);
  };

  const handleSubmitStep = (stepNumber) => {
    const payload = {
      houseId: house.id,
      stepNumber,
      note: cleaningNotes[stepNumber] || 'Sanitation step completed.',
      photoProof: cleaningPhotos[stepNumber] || null,
    };
    if (submitCleaningStep.length >= 2) {
      submitCleaningStep(house.id, stepNumber, payload);
    } else {
      submitCleaningStep(payload);
    }
  };

  const handleReviewStep = (stepNumber, approved, noteText = '') => {
    if (reviewCleaningStep) {
      reviewCleaningStep(house.id, stepNumber, {
        approved,
        note: noteText,
      });
    } else if (verifyCleaningStep) {
      verifyCleaningStep({
        houseId: house.id,
        stepNumber,
        approved,
        note: noteText,
      });
    }
  };

  const handlePhotoUpload = async (stepNumber, file) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setCleaningPhotos((prev) => ({ ...prev, [stepNumber]: compressed }));
      notify(`Photo attached to Cleaning Step ${stepNumber}.`, 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const allCleaningStepsVerified = (house.cleaningSteps || []).every((s) => s.status === 'verified');

  return (
    <div className="space-y-6">
      {/* Top House Switcher & Super Admin Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigateTo('hub')}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Hub
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">{house.name} Control</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase ${
                  isInactive
                    ? 'bg-slate-700 text-white'
                    : envEval.status === 'OPTIMAL'
                    ? 'bg-emerald-600 text-white'
                    : envEval.status === 'ATTENTION'
                    ? 'bg-amber-500 text-white'
                    : envEval.status === 'ALERT'
                    ? 'bg-red-600 text-white'
                    : 'bg-sky-700 text-white'
                }`}
              >
                {isInactive ? 'INACTIVE' : envEval.status}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${
                  isSilo
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200'
                    : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
                }`}
              >
                {isSilo ? <Package className="h-3 w-3" /> : <Wheat className="h-3 w-3" />}
                {isSilo ? `Silo-Based (${siloCapacityTons}T)` : `Bag-Based (${bagWeightKg}kg)`}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500">
              {house.sector} • Cycle #{house.cycleNumber} • Started {house.cycleStartDate}
            </p>
          </div>
        </div>

        {/* House Quick Selector Pills + Super Admin Active/Inactive Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {selectableHouses.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setSelectedHouseId(h.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  h.id === house.id
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : h.isActive === false
                    ? 'border border-dashed border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-200'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50'
                }`}
              >
                {h.code || h.name}
                {h.isActive === false ? ' (Off)' : ''}
              </button>
            ))}
          </div>

          {isOwner && toggleHouseActive && (
            <button
              type="button"
              onClick={() => toggleHouseActive(house.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold shadow-sm transition ${
                isInactive
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                  : 'border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              {isInactive ? 'Reactivate House' : 'Set Inactive'}
            </button>
          )}
        </div>
      </div>

      {/* Inactive House Notice */}
      {isInactive && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Power className="h-4 w-4 text-slate-600" />
            <span>
              {house.name} is currently marked INACTIVE / OFFLINE. Its historical logs and cycle metrics are preserved safely without affecting active farm totals.
            </span>
          </div>
          {isOwner && toggleHouseActive && (
            <button
              type="button"
              onClick={() => toggleHouseActive(house.id)}
              className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-800"
            >
              Reactivate House
            </button>
          )}
        </div>
      )}

      {/* Cycle Progress & Feed System Summary Banner */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Progress & Phase Control Card */}
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                {house.phase === 'cleaning'
                  ? 'Mandatory Post-Cycle Sanitation'
                  : 'Broiler Cultivation Schedule'}
              </p>
              <h3 className="mt-0.5 text-2xl font-black text-slate-900">
                {house.phase === 'cleaning'
                  ? `Cleaning Phase: Day ${house.cleaningDay} of ${house.targetCleaningDays || 14}`
                  : `Cycle: Day ${house.cycleDay} of ${house.targetCycleDays}`}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isOwner && manualOverrideEnabled && (
                <button
                  type="button"
                  onClick={openOverride}
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-amber-500 bg-amber-50 px-3.5 py-1.5 text-xs font-extrabold text-amber-900 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-200"
                >
                  <ShieldCheck className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  Edit Count / Cycle Day
                </button>
              )}

              {isManagement && house.phase === 'cultivation' && (
                <button
                  type="button"
                  onClick={openFinalCatch}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-emerald-800 dark:hover:bg-emerald-900"
                >
                  Record Final Catch / End Cycle
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 h-3.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                house.phase === 'cleaning' ? 'bg-sky-700' : 'bg-emerald-700'
              }`}
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    ((house.phase === 'cleaning' ? house.cleaningDay : house.cycleDay) /
                      Math.max(
                        1,
                        house.phase === 'cleaning' ? house.targetCleaningDays || 14 : house.targetCycleDays
                      )) *
                      100
                  )
                )}%`,
              }}
            />
          </div>

          {/* Live Inventory Formula Breakdown */}
          {house.phase !== 'cleaning' ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Initial Cartons</p>
                <p className="mt-0.5 text-lg font-black text-slate-900">
                  {house.cartons} × {chicksPerCarton}
                </p>
                <p className="text-[11px] font-semibold text-slate-500">
                  = {inventory.initialChicks.toLocaleString()} chicks
                </p>
              </div>
              <div className="rounded-2xl bg-red-50/80 p-3 dark:bg-red-950/40">
                <p className="text-[11px] font-bold text-red-700 uppercase dark:text-red-300">
                  Total Dead
                </p>
                <p className="mt-0.5 text-lg font-black text-red-700 dark:text-red-400">
                  -{inventory.totalMortalities.toLocaleString()}
                </p>
                <p className="text-[11px] font-semibold text-red-600 dark:text-red-300">
                  Cumulative mortalities
                </p>
              </div>
              <div className="rounded-2xl bg-amber-50/80 p-3 dark:bg-amber-950/40">
                <p className="text-[11px] font-bold text-amber-700 uppercase dark:text-amber-300">
                  Total Culls
                </p>
                <p className="mt-0.5 text-lg font-black text-amber-700 dark:text-amber-400">
                  -{inventory.totalCulls.toLocaleString()}
                </p>
                <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-300">
                  Sick / removed birds
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/40">
                <p className="text-[11px] font-bold text-emerald-800 uppercase dark:text-emerald-300">
                  Active Bird Count
                </p>
                <p className="mt-0.5 text-lg font-black text-emerald-900 dark:text-emerald-200">
                  {inventory.activeChicks.toLocaleString()}
                </p>
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {inventory.isOverridden ? 'Owner Overridden' : `Loss rate: ${inventory.mortalityPct}%`}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50/80 p-4 sm:flex-row sm:items-center dark:border-sky-800 dark:bg-sky-950/40">
              <div>
                <p className="text-xs font-extrabold text-sky-900 uppercase dark:text-sky-200">
                  Last Harvest Summary (Cycle #{house.cycleNumber})
                </p>
                {house.lastHarvestSummary ? (
                  <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Caught {house.lastHarvestSummary.harvestedBirds.toLocaleString()} birds • Avg{' '}
                    {house.lastHarvestSummary.avgWeightGrams}g • Total{' '}
                    {house.lastHarvestSummary.totalCatchKg.toLocaleString()} kg (
                    {house.lastHarvestSummary.completedDate})
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    House emptied and undergoing 14-day sanitation.
                  </p>
                )}
              </div>
              {isManagement && (
                <button
                  type="button"
                  disabled={!allCleaningStepsVerified && !(isOwner && manualOverrideEnabled)}
                  onClick={() => setShowNewCycleModal(true)}
                  className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition ${
                    allCleaningStepsVerified || (isOwner && manualOverrideEnabled)
                      ? 'bg-emerald-800 text-white shadow-sm hover:bg-emerald-900'
                      : 'cursor-not-allowed bg-slate-200 text-slate-500'
                  }`}
                >
                  <PackagePlus className="h-4 w-4" />
                  Start New Flock Cycle
                </button>
              )}
            </div>
          )}
        </div>

        {/* Feed System (Bag-Based vs. 20T Bulk Silo) & Cooling Summary Card */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm">
          <div className="space-y-3">
            {/* Cycle-End Worker Reset & 1-Click Clone Previous Team (Owner & Manager) */}
            {isManagement && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                {(() => {
                  const assignedStaff = (state.userAccounts || []).filter(
                    (u) =>
                      (u.role === 'worker' || u.role === 'supervisor') &&
                      Array.isArray(u.assignedHouseIds) &&
                      u.assignedHouseIds.includes(house.id)
                  );
                  const prevIds = house.previousCycleTeamIds || [];
                  const prevNames = (state.userAccounts || [])
                    .filter((u) => prevIds.includes(u.id))
                    .map((u) => u.name);
                  return (
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                            Assigned House Team ({assignedStaff.length} Active)
                          </span>
                          {assignedStaff.length === 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                              Auto-Reset on End Cycle
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          {assignedStaff.length > 0
                            ? `Active: ${assignedStaff.map((s) => `${s.name} (${s.role})`).join(', ')}`
                            : prevNames.length > 0
                            ? `Previous cycle crew archived: ${prevNames.join(', ')}.`
                            : 'Assign workers from Staff & Attendance or clone a previous crew.'}
                        </p>
                      </div>
                      {prevIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => clonePreviousHouseTeam(house.id)}
                          className="shrink-0 rounded-xl bg-emerald-800 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-xs transition hover:bg-emerald-900"
                        >
                          Clone Previous Team ({prevIds.length})
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                UAE Cooling &amp; Feed System
              </p>
              <p className="text-lg font-black text-emerald-800 dark:text-emerald-400">
                -{thermalDelta}°C Δ
              </p>
            </div>

            {/* Silo vs. Bag Inventory Panel */}
            {isSilo ? (
              <div className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/75 p-3.5 dark:border-indigo-800 dark:bg-indigo-950/35">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">
                      {siloCapacityTons}-Ton Bulk Silo Level
                    </span>
                    <span className="rounded-full bg-indigo-200/80 px-2 py-0.5 text-[10px] font-black text-indigo-950 dark:bg-indigo-900 dark:text-indigo-200">
                      Load-Cell Sensor Ready
                    </span>
                  </div>
                  <span className="text-xs font-black text-indigo-800 dark:text-indigo-300">
                    {(siloCurrentKg / 1000).toFixed(2)} / {siloCapacityTons} T ({siloFillPct}%)
                  </span>
                </div>

                {/* Sight-Glass Remaining Tonnage Input (Manager / Super Admin) */}
                {isManagement && (
                  <div className="rounded-xl border border-indigo-200/90 bg-white/90 p-2.5 dark:border-indigo-800 dark:bg-slate-900/80">
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
                      <span className="text-[11px] font-extrabold text-indigo-950 dark:text-indigo-200">
                        Sight-Glass Remaining Level (Tons):{' '}
                        <strong>
                          {house.siloSightGlassTons ?? (siloCurrentKg / 1000).toFixed(2)} T
                        </strong>
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">
                        Bottom-quarter visual gauge / scale input
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max={siloCapacityTons}
                        value={sightGlassInput}
                        onChange={(e) => setSightGlassInput(e.target.value)}
                        placeholder={`e.g. ${house.siloSightGlassTons ?? (siloCurrentKg / 1000).toFixed(1)} T`}
                        className="w-28 rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 text-xs font-bold dark:border-indigo-700 dark:bg-slate-800"
                      />
                      <input
                        type="text"
                        value={sightGlassNote}
                        onChange={(e) => setSightGlassNote(e.target.value)}
                        placeholder="Sight-glass / tonnage drop note..."
                        className="min-w-[140px] flex-1 rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 text-xs dark:border-indigo-700 dark:bg-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (sightGlassInput === '' || Number(sightGlassInput) < 0) {
                            notify('Enter valid remaining tonnage (0–20T).', 'warning');
                            return;
                          }
                          recordSiloSightGlassReading({
                            houseId: house.id,
                            remainingTons: Number(sightGlassInput),
                            method: 'manual-sight-glass',
                            note: sightGlassNote.trim() || 'Visual sight-glass inspection',
                          });
                          setSightGlassInput('');
                          setSightGlassNote('');
                        }}
                        className="rounded-lg bg-indigo-700 px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-indigo-800"
                      >
                        Log Reading (T)
                      </button>
                    </div>
                    {(house.siloConsumptionHistory || []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-indigo-100 pt-1.5 text-[10px] font-semibold text-slate-600 dark:border-indigo-900/50 dark:text-slate-300">
                        {(house.siloConsumptionHistory || []).slice(0, 3).map((sr) => (
                          <span
                            key={sr.id}
                            className="rounded-md bg-indigo-50 px-2 py-0.5 dark:bg-indigo-950/60"
                          >
                            {sr.date}: {sr.readingTons}T{' '}
                            {sr.deltaTons > 0 ? `(-${sr.deltaTons}T used)` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-indigo-200 dark:bg-indigo-900">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      siloFillPct < 20 ? 'bg-red-600' : siloFillPct < 35 ? 'bg-amber-500' : 'bg-indigo-700'
                    }`}
                    style={{ width: `${siloFillPct}%` }}
                  />
                </div>
                <div className="mt-2 text-[11px] font-semibold text-indigo-900 dark:text-indigo-300">
                  {house.lastSiloRefill ? (
                    <span>
                      Last Truck Refill: {house.lastSiloRefill.tonsAdded}T on{' '}
                      {house.lastSiloRefill.date} ({house.lastSiloRefill.loggedBy})
                    </span>
                  ) : (
                    <span>No recent bulk silo refill logged.</span>
                  )}
                </div>

                <div className="mt-2.5 flex items-center gap-1.5 rounded-xl border border-dashed border-indigo-300 bg-white/80 px-2.5 py-1.5 text-[10px] font-bold text-indigo-800 dark:border-indigo-700 dark:bg-slate-900/60 dark:text-indigo-300">
                  <Scale className="h-3.5 w-3.5 shrink-0" />
                  Automated Silo Load-Cell Scale (Future Hardware Hook)
                </div>

                {isManagement && (
                  <button
                    type="button"
                    onClick={() => setShowSiloRefillModal(true)}
                    className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-700 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-indigo-800"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    + Log Bulk Silo Refill (Tons)
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/75 p-3.5 dark:border-amber-800 dark:bg-amber-950/35">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-amber-950 dark:text-amber-200">
                    Bag-Based Feed ({bagWeightKg}kg Fixed)
                  </span>
                  <span className="text-xs font-black text-amber-900 dark:text-amber-300">
                    {Math.round(feedTotalKg / bagWeightKg)} Bags ({(feedTotalKg / 1000).toFixed(2)} T)
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
                  {[
                    ['Starter', feedStarterKg],
                    ['Grower', feedGrowerKg],
                    ['Finisher', feedFinisherKg],
                  ].map(([phaseName, kg]) => (
                    <div
                      key={phaseName}
                      className={`rounded-xl border px-2 py-1.5 ${
                        house.currentFeedPhase === phaseName
                          ? 'border-amber-400 bg-white font-extrabold dark:bg-slate-900'
                          : 'border-amber-200/70 bg-white/60 dark:bg-slate-900/40'
                      }`}
                    >
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{phaseName}</p>
                      <p className="font-black text-slate-900">
                        {Math.round(kg / bagWeightKg)} bags
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1 rounded-2xl bg-slate-50 p-3 text-xs">
              {envEval.reasons.map((r, i) => (
                <p key={i} className="font-semibold text-slate-700">
                  • {r}
                </p>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={() => setLiveSensorEnabled(!liveSensorEnabled)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                liveSensorEnabled
                  ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              <Radio
                className={`h-3.5 w-3.5 ${liveSensorEnabled ? 'animate-pulse text-emerald-700 dark:text-emerald-400' : ''}`}
              />
              {liveSensorEnabled ? 'Live Sim ON' : 'Live Sim OFF'}
            </button>
            <button
              type="button"
              onClick={openEnvEditor}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
            >
              <Thermometer className="h-3.5 w-3.5 text-emerald-700" />
              Manual Zone Entry
            </button>
          </div>
        </div>
      </section>

      {/* Complete 8-Reading Environmental Panel (4 Zone Gauges + Humidity, NH3, CO2, Neg. Pressure) */}
      <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Environmental Monitoring Panel (Zones, Air Quality &amp; Negative Pressure)
            </h3>
            <p className="text-xs text-slate-500">
              Evaluated dynamically against{' '}
              {envEval.targetBand
                ? `${envEval.targetBand.label} (${envEval.targetBand.targetMinC}–${envEval.targetBand.targetMaxC}°C)`
                : 'Sanitation Idle Mode'}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            Last Sync: {new Date(house.zones?.lastSensorSync || Date.now()).toLocaleTimeString()}
          </span>
        </div>

        {/* 4 Zone Temperature Gauges */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <ZoneRadialGauge
            label="Start Zone"
            valueC={house.zones?.start}
            targetBand={envEval.targetBand}
          />
          <ZoneRadialGauge
            label="Middle Zone"
            valueC={house.zones?.middle}
            targetBand={envEval.targetBand}
          />
          <ZoneRadialGauge
            label="End Zone"
            valueC={house.zones?.end}
            targetBand={envEval.targetBand}
          />
          <ZoneRadialGauge
            label="Outside (UAE Climate)"
            valueC={house.zones?.outside}
            isOutside
          />
        </div>

        {/* 4 Air Quality & Ventilation Panels: Humidity, NH3, CO2, Negative Pressure */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <EnvMetricCard
            icon={Droplets}
            title="Relative Humidity"
            value={humVal}
            unit="%"
            status={humStatus}
            targetText={`Target ${humMin}–${humMax}%`}
            pctFill={humVal}
            markerRange={{ left: humMin, width: humMax - humMin }}
          />
          <EnvMetricCard
            icon={Wind}
            title="Ammonia (NH₃)"
            value={nh3Val}
            unit="ppm"
            status={nh3Status}
            targetText={`Optimal <${nh3Warn} • Alert ≥${nh3Alert} ppm`}
            pctFill={(nh3Val / 30) * 100}
          />
          <EnvMetricCard
            icon={Activity}
            title="Carbon Dioxide (CO₂)"
            value={co2Val.toLocaleString()}
            unit="ppm"
            status={co2Status}
            targetText={`Optimal <${co2Warn} • Alert ≥${co2Alert} ppm`}
            pctFill={(co2Val / 4000) * 100}
          />
          <EnvMetricCard
            icon={Gauge}
            title="Negative Pressure"
            value={negPaVal}
            unit="Pa"
            status={negPaStatus}
            targetText={`Target ${negMin}–${negMax} Pa`}
            pctFill={(negPaVal / 50) * 100}
            markerRange={{ left: (negMin / 50) * 100, width: ((negMax - negMin) / 50) * 100 }}
          />
        </div>
      </section>

      {/* Primary Action Tiles */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          disabled={house.phase === 'cleaning'}
          onClick={() => navigateTo('log', house.id)}
          className={`flex items-center justify-center gap-3 rounded-3xl px-6 py-4 text-left shadow-sm transition ${
            house.phase === 'cleaning'
              ? 'cursor-not-allowed bg-slate-200 text-slate-500'
              : 'bg-emerald-800 text-white hover:bg-emerald-900'
          }`}
        >
          <Stethoscope className="h-7 w-7 shrink-0" />
          <div>
            <p className="text-sm font-extrabold">Log Daily Health &amp; Water</p>
            <p className="text-[11px] opacity-90">
              {house.phase === 'cleaning'
                ? 'Locked during cleaning'
                : isSilo
                ? 'Mortalities, culls, temp & water (gal)'
                : 'Mortalities, culls, temp, bags & water'}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('tasks', house.id)}
          className="flex items-center justify-center gap-3 rounded-3xl bg-emerald-700 px-6 py-4 text-left text-white shadow-sm transition hover:bg-emerald-800"
        >
          <ClipboardCheck className="h-7 w-7 shrink-0" />
          <div>
            <p className="text-sm font-extrabold">Complete House Tasks</p>
            <p className="text-[11px] opacity-90">Submit proof &amp; manual house temp</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setIsEmergencyModalOpen && setIsEmergencyModalOpen(true)}
          className="flex items-center justify-center gap-3 rounded-3xl bg-red-600 px-6 py-4 text-left text-white shadow-sm transition hover:bg-red-700"
        >
          <Flame className="h-7 w-7 shrink-0" />
          <div>
            <p className="text-sm font-extrabold">Emergency Alert</p>
            <p className="text-[11px] opacity-90">Power, water leak, cooling failure</p>
          </div>
        </button>
      </section>

      {/* Mandatory 14-Day Sequential Cleaning Checklist (Shown when house.phase === 'cleaning') */}
      {house.phase === 'cleaning' && (
        <section className="rounded-3xl border-2 border-sky-200 bg-white/95 p-6 shadow-md backdrop-blur-sm dark:border-sky-800">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-700 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  14-Day Sequential Sanitation Checklist
                </h3>
                <p className="text-xs text-slate-600">
                  Strict sequential lock active: Step N+1 unlocks only after Step N is verified by Management.
                </p>
              </div>
            </div>
            {allCleaningStepsVerified && (
              <button
                type="button"
                onClick={() => {
                  finishCleaningAndReadyHouse?.(house.id);
                  setShowNewCycleModal(true);
                }}
                className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-800"
              >
                All Steps Verified — Open New Cycle Setup
              </button>
            )}
          </div>

          <div className="space-y-3">
            {(house.cleaningSteps || []).map((step, idx, arr) => {
              const prevStep = idx > 0 ? arr[idx - 1] : null;
              const isUnlocked =
                idx === 0 ||
                prevStep?.status === 'verified' ||
                (isOwner && manualOverrideEnabled);

              return (
                <div
                  key={step.stepNumber}
                  className={`rounded-2xl border p-4 transition ${
                    step.status === 'verified'
                      ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30'
                      : step.status === 'awaiting_verification'
                      ? 'border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/30'
                      : isUnlocked
                      ? 'border-sky-300 bg-white dark:border-sky-800'
                      : 'border-slate-200 bg-slate-100/75 opacity-75'
                  }`}
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                          step.status === 'verified'
                            ? 'bg-emerald-700 text-white'
                            : step.status === 'awaiting_verification'
                            ? 'bg-amber-500 text-white'
                            : isUnlocked
                            ? 'bg-sky-700 text-white'
                            : 'bg-slate-300 text-slate-600'
                        }`}
                      >
                        {step.status === 'verified' ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : !isUnlocked ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          step.stepNumber
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-900">
                            {step.stepNumber}. {step.title}
                          </h4>
                          <span className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide text-slate-700 uppercase">
                            {step.status.replace('_', ' ')}
                          </span>
                          {!isUnlocked && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                              <Lock className="h-3 w-3" /> Locked until Step {step.stepNumber - 1} verified
                            </span>
                          )}
                          {isOwner &&
                            manualOverrideEnabled &&
                            !(idx === 0 || prevStep?.status === 'verified') && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                                <Unlock className="h-3 w-3" /> Owner Override Unlocked
                              </span>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{step.description}</p>
                        {step.note && (
                          <p className="mt-2 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-800">
                            Note: {step.note}
                          </p>
                        )}
                        {step.photoProof && (
                          <img
                            src={step.photoProof}
                            alt={`Proof for step ${step.stepNumber}`}
                            className="mt-2 h-24 w-36 rounded-xl border border-slate-200 object-cover"
                          />
                        )}
                        {step.completedBy && (
                          <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
                            Completed by {step.completedBy} (
                            {new Date(step.completedAt).toLocaleString()})
                            {step.verifiedBy && ` • Verified by ${step.verifiedBy}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Step Action Controls */}
                    <div className="shrink-0 space-y-2 sm:w-72">
                      {step.status === 'pending' && isUnlocked && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={cleaningNotes[step.stepNumber] || ''}
                            onChange={(e) =>
                              setCleaningNotes((prev) => ({
                                ...prev,
                                [step.stepNumber]: e.target.value,
                              }))
                            }
                            placeholder="Sanitation notes / chemical ratio..."
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-sky-700 focus:outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
                              <Camera className="h-3.5 w-3.5" />
                              {cleaningPhotos[step.stepNumber] ? 'Photo Ready' : 'Photo'}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handlePhotoUpload(step.stepNumber, e.target.files?.[0])}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleSubmitStep(step.stepNumber)}
                              className="flex-1 rounded-xl bg-sky-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-800"
                            >
                              Submit Step
                            </button>
                          </div>
                        </div>
                      )}

                      {step.status === 'awaiting_verification' && isManagement && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={recleanNotes[step.stepNumber] || ''}
                            onChange={(e) =>
                              setRecleanNotes((prev) => ({
                                ...prev,
                                [step.stepNumber]: e.target.value,
                              }))
                            }
                            placeholder="Optional verification or re-clean note..."
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-emerald-700 focus:outline-none"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleReviewStep(
                                  step.stepNumber,
                                  true,
                                  recleanNotes[step.stepNumber] || ''
                                )
                              }
                              className="flex-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                            >
                              Verify &amp; Unlock Next
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleReviewStep(
                                  step.stepNumber,
                                  false,
                                  recleanNotes[step.stepNumber]?.trim() ||
                                    'Re-clean requested by management.'
                                )
                              }
                              className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                            >
                              Request Re-Clean Note
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Manual 8-Field Environmental Entry Modal */}
      {showManualEnvEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveEnv}
            className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl"
          >
            <h3 className="text-lg font-extrabold text-slate-900">
              Manual Environmental Reading (All 8 Sensors) — {house.name}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                <div key={key} className="col-span-1 sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-slate-700">{label}</label>
                  <input
                    type="number"
                    step={stepVal}
                    value={envForm[key]}
                    onChange={(e) => setEnvForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900 focus:border-emerald-700 focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowManualEnvEditor(false)}
                className="w-1/3 rounded-full border border-slate-300 py-2.5 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-2/3 rounded-full bg-emerald-800 py-2.5 text-xs font-bold text-white hover:bg-emerald-900"
              >
                Update All 8 Gauges
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk Silo Refill Modal (Owner & Manager) */}
      {showSiloRefillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSiloRefillSubmit}
            className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
              <Truck className="h-6 w-6" />
              <h3 className="text-lg font-extrabold">Log Bulk Silo Truck Refill — {house.name}</h3>
            </div>
            <p className="text-xs text-slate-600">
              Current Silo Level: {(siloCurrentKg / 1000).toFixed(2)} T of {siloCapacityTons} T capacity.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Metric Tons Delivered
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max={siloCapacityTons}
                  required
                  value={siloForm.tonsAdded}
                  onChange={(e) => setSiloForm((p) => ({ ...p, tonsAdded: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Delivery Ticket / Invoice #
                </label>
                <input
                  type="text"
                  value={siloForm.invoiceRef}
                  onChange={(e) => setSiloForm((p) => ({ ...p, invoiceRef: e.target.value }))}
                  placeholder="AF-BULK-204"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Feed Mill / Truck Fleet</label>
              <input
                type="text"
                value={siloForm.supplier}
                onChange={(e) => setSiloForm((p) => ({ ...p, supplier: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Notes</label>
              <input
                type="text"
                value={siloForm.note}
                onChange={(e) => setSiloForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="Pneumatic blower fill verified..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSiloRefillModal(false)}
                className="w-1/3 rounded-full border border-slate-300 py-2.5 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-2/3 rounded-full bg-indigo-700 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-800"
              >
                Save Silo Refill
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Super Admin Manual Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveOverride}
            className="w-full max-w-md space-y-4 rounded-3xl border-2 border-amber-400 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-lg font-extrabold">Super Admin Manual Override</h3>
            </div>
            <p className="text-xs text-slate-600">
              Directly adjust active bird count or cycle day for {house.name}. Leave bird count blank to restore calculated carton formula.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Active Bird Count
                </label>
                <input
                  type="number"
                  value={overrideForm.manualCountOverride}
                  onChange={(e) =>
                    setOverrideForm((prev) => ({ ...prev, manualCountOverride: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                />
              </div>
              {house.phase === 'cleaning' ? (
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Cleaning Day (1–14)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="21"
                    value={overrideForm.cleaningDay}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({ ...prev, cleaningDay: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Cycle Day (1–45)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="45"
                    value={overrideForm.cycleDay}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({ ...prev, cycleDay: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Mandatory Audit Reason
              </label>
              <input
                type="text"
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g., Physical recount after hatchery carton credit"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="w-1/3 rounded-full border border-slate-300 py-2.5 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-2/3 rounded-full bg-amber-600 py-2.5 text-xs font-extrabold text-white hover:bg-amber-700"
              >
                Apply Override
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Record Final Catch & Start 14-Day Cleaning Modal */}
      {showFinalCatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleFinalCatchSubmit}
            className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl"
          >
            <h3 className="text-lg font-extrabold text-slate-900">
              Record Final Catch &amp; Start Cleaning — {house.name}
            </h3>
            <p className="text-xs text-slate-600">
              Logs final Alain Farms harvest figures and switches {house.name} into mandatory 14-day sequential cleaning mode.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Harvested Birds
                </label>
                <input
                  type="number"
                  required
                  value={catchForm.harvestedBirds}
                  onChange={(e) =>
                    setCatchForm((prev) => ({ ...prev, harvestedBirds: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Avg Catch Weight (g)
                </label>
                <input
                  type="number"
                  required
                  value={catchForm.avgWeightGrams}
                  onChange={(e) =>
                    setCatchForm((prev) => ({ ...prev, avgWeightGrams: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Total Net Catch Weight (kg)
              </label>
              <input
                type="number"
                required
                value={catchForm.totalCatchKg}
                onChange={(e) =>
                  setCatchForm((prev) => ({ ...prev, totalCatchKg: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Catch Notes</label>
              <textarea
                rows={2}
                value={catchForm.notes}
                onChange={(e) => setCatchForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Alain Farms truck batch reference & grading..."
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFinalCatchModal(false)}
                className="w-1/3 rounded-full border border-slate-300 py-2.5 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-2/3 rounded-full bg-sky-700 py-2.5 text-xs font-extrabold text-white hover:bg-sky-800"
              >
                End Cycle &amp; Begin Cleaning
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Start New Flock Cycle Modal */}
      {showNewCycleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleNewCycleSubmit}
            className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl"
          >
            <h3 className="text-lg font-extrabold text-slate-900">
              Start New Broiler Cycle — {house.name}
            </h3>
            <p className="text-xs text-slate-600">
              Initial flock size = Cartons Delivered × {chicksPerCarton} chicks/carton.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Cartons Delivered
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newCycleForm.cartons}
                  onChange={(e) =>
                    setNewCycleForm((prev) => ({ ...prev, cartons: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                />
                <p className="mt-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  = {(Number(newCycleForm.cartons || 0) * chicksPerCarton).toLocaleString()} chicks
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Target Cycle Days
                </label>
                <input
                  type="number"
                  min="28"
                  max="45"
                  required
                  value={newCycleForm.targetCycleDays}
                  onChange={(e) =>
                    setNewCycleForm((prev) => ({ ...prev, targetCycleDays: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Placement Date</label>
              <input
                type="date"
                required
                value={newCycleForm.cycleStartDate}
                onChange={(e) =>
                  setNewCycleForm((prev) => ({ ...prev, cycleStartDate: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowNewCycleModal(false)}
                className="w-1/3 rounded-full border border-slate-300 py-2.5 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-2/3 rounded-full bg-emerald-800 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-900"
              >
                Place Chicks &amp; Start Day 1
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
