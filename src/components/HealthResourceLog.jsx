import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Droplets,
  Edit3,
  Eye,
  HeartPulse,
  Lock,
  Minus,
  Package,
  Pill,
  Plus,
  Save,
  ShieldCheck,
  Skull,
  Thermometer,
  Truck,
  Wheat,
  X,
} from 'lucide-react';
import {
  calculateHouseInventory,
  gallonsToLiters,
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
    addHealthLog,
    updateLockedHealthLog,
    addFeedDelivery,
    recordBulkSiloDelivery,
    scheduleMedicationTask,
    executeMedicationTask,
    addIncidentNote,
    acknowledgeIncidentNote,
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

  const [shift, setShift] = useState(shiftOptions[0] || 'Day Shift (06:00-18:00)');
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
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

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
      shift,
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

  return (
    <div className="space-y-6">
      {/* Header & House Selector */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-slate-900">
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
          <p className="mt-1 text-xs font-medium text-slate-600">
            Incremental shift entries lock automatically upon submission • Water defaults to Gallons (gal)
          </p>
          {isManagement && (
            <p className="mt-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              Management Note: Weekly sample bird weighing is now recorded in Contracts &amp; Reports.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectableHouses.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => handleSelectHouse(h.id)}
              className={`rounded-full px-3.5 py-2 text-xs font-extrabold transition ${
                h.id === activeHouse.id
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50'
              }`}
            >
              {h.name} {h.phase === 'cleaning' ? '(Cleaning)' : ''}
            </button>
          ))}
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white/95 px-5 py-3.5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-slate-500 uppercase">Shift:</span>
              {shiftOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShift(s)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    shift === s
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="text-xs font-bold text-slate-700">
              Projected Active Birds:{' '}
              <span className="text-base font-black text-emerald-800 dark:text-emerald-400">
                {Math.max(
                  0,
                  currentInv.activeChicks - Number(mortalities || 0) - Number(culls || 0)
                ).toLocaleString()}
              </span>
            </div>
          </div>

          {/* 3 Tactile Counter Cards: Dead Chicks, Sick/Culls, Mandatory Temp */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Dead Chicks */}
            <div className="overflow-hidden rounded-3xl border border-red-200 bg-white/95 shadow-sm dark:border-red-900">
              <div className="bg-red-100 px-4 py-2 text-xs font-extrabold tracking-wider text-red-900 uppercase dark:bg-red-950 dark:text-red-200">
                Mortality
              </div>
              <div className="p-5 text-center">
                <p className="text-xs font-extrabold tracking-wide text-slate-700 uppercase">
                  Dead Chicks (This Entry)
                </p>
                <div className="mt-3 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMortalities((v) => Math.max(0, Number(v) - 1))}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-800 transition active:scale-95 hover:bg-slate-100"
                    aria-label="Decrease dead chicks"
                  >
                    <Minus className="h-6 w-6" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={mortalities}
                    onChange={(e) => setMortalities(Math.max(0, Number(e.target.value)))}
                    className="h-14 w-28 rounded-2xl bg-red-100/90 text-center text-3xl font-black text-red-700 focus:ring-2 focus:ring-red-400 focus:outline-none dark:bg-red-950/60 dark:text-red-300"
                  />
                  <button
                    type="button"
                    onClick={() => setMortalities((v) => Number(v) + 1)}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-red-200 bg-red-50 text-red-700 transition active:scale-95 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                    aria-label="Increase dead chicks"
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
                <Skull className="mx-auto mt-3 h-6 w-6 text-red-400" />
              </div>
            </div>

            {/* Sick / Culls */}
            <div className="overflow-hidden rounded-3xl border border-amber-200 bg-white/95 shadow-sm dark:border-amber-900">
              <div className="bg-amber-100 px-4 py-2 text-xs font-extrabold tracking-wider text-amber-900 uppercase dark:bg-amber-950 dark:text-amber-200">
                Health / Culls
              </div>
              <div className="p-5 text-center">
                <p className="text-xs font-extrabold tracking-wide text-slate-700 uppercase">
                  Sick Chicks (Culls)
                </p>
                <div className="mt-3 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCulls((v) => Math.max(0, Number(v) - 1))}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-800 transition active:scale-95 hover:bg-slate-100"
                    aria-label="Decrease sick chicks"
                  >
                    <Minus className="h-6 w-6" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={culls}
                    onChange={(e) => setCulls(Math.max(0, Number(e.target.value)))}
                    className="h-14 w-28 rounded-2xl bg-amber-100/90 text-center text-3xl font-black text-amber-700 focus:ring-2 focus:ring-amber-400 focus:outline-none dark:bg-amber-950/60 dark:text-amber-300"
                  />
                  <button
                    type="button"
                    onClick={() => setCulls((v) => Number(v) + 1)}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-amber-200 bg-amber-50 text-amber-700 transition active:scale-95 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                    aria-label="Increase sick chicks"
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
                <HeartPulse className="mx-auto mt-3 h-6 w-6 text-amber-500" />
              </div>
            </div>

            {/* Mandatory Manual House Temp */}
            <div className="overflow-hidden rounded-3xl border border-emerald-300 bg-white/95 shadow-sm dark:border-emerald-800">
              <div className="bg-emerald-800 px-4 py-2 text-xs font-extrabold tracking-wider text-white uppercase">
                Environment (Mandatory)
              </div>
              <div className="p-5 text-center">
                <p className="text-xs font-extrabold tracking-wide text-slate-700 uppercase">
                  Manual House Temp (°C)
                </p>
                <div className="mt-3 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setManualTempC((t) => Number((Number(t) - 0.2).toFixed(1)))}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-800 transition active:scale-95 hover:bg-slate-100"
                    aria-label="Decrease house temperature"
                  >
                    <Minus className="h-6 w-6" />
                  </button>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={manualTempC}
                    onChange={(e) => setManualTempC(e.target.value)}
                    className="h-14 w-28 rounded-2xl bg-emerald-50 text-center text-2xl font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:bg-emerald-950/60 dark:text-emerald-200"
                  />
                  <button
                    type="button"
                    onClick={() => setManualTempC((t) => Number((Number(t) + 0.2).toFixed(1)))}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-emerald-200 bg-emerald-50 text-emerald-800 transition active:scale-95 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    aria-label="Increase house temperature"
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
                <Thermometer className="mx-auto mt-3 h-6 w-6 text-emerald-700 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Expandable Full 8-Field Environmental Readings */}
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
            <button
              type="button"
              onClick={() => setShowFullZones((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <p className="text-sm font-extrabold text-slate-900">
                  Optional: Enter Full 8-Sensor Walkaround (4 Zones, Humidity, NH₃, CO₂ &amp; Pressure)
                </p>
                <p className="text-xs text-slate-500">
                  Expand to update house control gauges during physical inspection
                </p>
              </div>
              {showFullZones ? (
                <ChevronUp className="h-5 w-5 text-slate-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-600" />
              )}
            </button>

            {showFullZones && (
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
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
                    <label className="mb-1 block text-[11px] font-bold text-slate-600 uppercase">
                      {label}
                    </label>
                    <input
                      type="number"
                      step={stepVal}
                      value={zones[key]}
                      onChange={(e) =>
                        setZones((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 focus:border-emerald-700 focus:bg-white focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Role & House-Aware Feed + Water Section (Weekly Bird Sample Weight REMOVED!) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Feed Section: Strict Bag vs. Silo Split */}
            {isSiloHouse ? (
              <div className="flex flex-col justify-between rounded-3xl border border-indigo-200 bg-indigo-50/70 p-5 shadow-sm dark:border-indigo-800 dark:bg-indigo-950/35">
                <div>
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-indigo-700 dark:text-indigo-300" />
                    <h3 className="text-sm font-extrabold text-indigo-950 dark:text-indigo-200">
                      Silo-Based House — Bulk feed is managed in Management Silo Refills
                    </h3>
                  </div>
                  <p className="mt-2 text-xs font-medium text-indigo-900/90 dark:text-indigo-300">
                    This house runs automated auger feeding from its {siloCapacityTons}-Ton bulk silo.
                    Workers and Supervisors do not enter daily feed bags or tonnage here.
                  </p>

                  <div className="mt-4 rounded-2xl border border-indigo-200 bg-white/90 p-3.5">
                    <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
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
                      <p className="mt-2 text-[11px] font-semibold text-slate-600">
                        Last Truck Refill: {activeHouse.lastSiloRefill.tonsAdded}T on{' '}
                        {activeHouse.lastSiloRefill.date}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Wheat className="h-5 w-5 text-amber-700" />
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Bags Consumed ({bagWeightKg}kg Fixed Bag / جونية)
                    </h3>
                  </div>
                  <select
                    value={feedPhase}
                    onChange={(e) => setFeedPhase(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-900"
                  >
                    <option value="Starter">Starter</option>
                    <option value="Grower">Grower</option>
                    <option value="Finisher">Finisher</option>
                  </select>
                </div>

                {/* Tactile Integer Bag Counter */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBagsConsumed((b) => Math.max(0, Number(b) - 1))}
                      className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-extrabold text-slate-800 hover:bg-slate-100"
                    >
                      -1
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={bagsConsumed}
                      onChange={(e) =>
                        setBagsConsumed(Math.max(0, Math.round(Number(e.target.value || 0))))
                      }
                      className="h-12 w-24 rounded-xl border border-amber-300 bg-amber-50 text-center text-2xl font-black text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                    />
                    <button
                      type="button"
                      onClick={() => setBagsConsumed((b) => Number(b) + 1)}
                      className="rounded-xl bg-amber-600 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-amber-700"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => setBagsConsumed((b) => Number(b) + 2)}
                      className="rounded-xl bg-amber-600 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-amber-700"
                    >
                      +2
                    </button>
                    <button
                      type="button"
                      onClick={() => setBagsConsumed((b) => Number(b) + 5)}
                      className="rounded-xl bg-amber-700 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-amber-800"
                    >
                      +5
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-2xl bg-amber-50/80 px-3.5 py-2.5 text-xs font-semibold text-amber-950 dark:bg-amber-950/40 dark:text-amber-200">
                  <span>
                    Fixed Weight: <strong>{feedBagsInt} × {bagWeightKg}kg = {feedKgComputed} kg</strong>
                  </span>
                  <span>
                    {feedPhase} Stock: <strong>{stockBagsRemaining} Bags</strong>
                  </span>
                </div>

                {isManagement && (
                  <button
                    type="button"
                    onClick={() => setShowDeliveryForm((v) => !v)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    <Truck className="h-3.5 w-3.5 text-emerald-700" />
                    + Log {bagWeightKg}kg Bag Delivery to House Stock
                  </button>
                )}
              </div>
            )}

            {/* Water Usage Panel — Default Gallons (gal) */}
            <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-sky-600" />
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Daily Water Tank Reading (Gallons Default)
                  </h3>
                </div>
                {isManagement && (
                  <div className="inline-flex rounded-full bg-slate-100 p-0.5 text-[11px] font-bold">
                    {[
                      ['gallons', 'gal'],
                      ['liters', 'L'],
                      ['m3', 'm³'],
                    ].map(([unitKey, label]) => (
                      <button
                        key={unitKey}
                        type="button"
                        onClick={() => setWaterViewUnit(unitKey)}
                        className={`rounded-full px-2.5 py-1 ${
                          waterViewUnit === unitKey ? 'bg-sky-700 text-white' : 'text-slate-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWaterGallonsInput((g) => Math.max(0, Number(g) - 50))}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-extrabold text-slate-800 hover:bg-slate-100"
                >
                  -50 gal
                </button>
                <input
                  type="number"
                  min="0"
                  step={waterViewUnit === 'm3' ? '0.1' : '1'}
                  value={displayedWaterValue}
                  onChange={(e) => handleWaterDisplayChange(e.target.value)}
                  className="h-12 w-28 rounded-xl border border-sky-300 bg-sky-50 text-center text-xl font-black text-sky-900 dark:bg-sky-950/60 dark:text-sky-200"
                />
                <button
                  type="button"
                  onClick={() => setWaterGallonsInput((g) => Number(g) + 50)}
                  className="rounded-xl bg-sky-600 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-sky-700"
                >
                  +50 gal
                </button>
                <button
                  type="button"
                  onClick={() => setWaterGallonsInput((g) => Number(g) + 100)}
                  className="rounded-xl bg-sky-700 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-sky-800"
                >
                  +100 gal
                </button>
                <button
                  type="button"
                  onClick={() => setWaterGallonsInput((g) => Number(g) + 500)}
                  className="rounded-xl bg-sky-800 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-sky-900"
                >
                  +500 gal
                </button>
              </div>

              <div className="mt-3 rounded-2xl bg-sky-50 px-3.5 py-2.5 text-xs font-semibold text-sky-950 dark:bg-sky-950/40 dark:text-sky-200">
                Recorded: <strong>{waterGallonsComputed.toLocaleString()} gal</strong> •{' '}
                {waterLitersComputed.toLocaleString()} L ({waterM3Computed} m³)
              </div>
            </div>
          </div>

          {/* Notes & Submit & Lock CTA */}
          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm sm:flex-row sm:items-center">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional shift observations (litter quality, drinker flow, cooling pads)..."
              className="flex-1 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-emerald-700 focus:bg-white focus:outline-none"
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
      <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <Lock className="h-4 w-4 text-emerald-700" />
              Current Shift Locked Entries — {activeHouse.name} ({activeShiftDate})
            </h3>
            <p className="text-xs text-slate-500">
              Submitted entries are locked permanently against tampering.
              {isOwner && manualOverrideEnabled && ' Super Admin Override Edit is ACTIVE.'}
            </p>
          </div>

          {/* Running Shift Subtotals Strip */}
          <div className="flex flex-wrap items-center gap-2">
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
              <tbody className="divide-y divide-slate-100">
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
                    <tr key={log.id} className="hover:bg-slate-50/80">
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
