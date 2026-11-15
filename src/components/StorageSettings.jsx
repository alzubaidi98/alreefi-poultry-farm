import { useEffect, useRef, useState } from 'react';
import {
  Archive,
  Building2,
  Clock,
  Database,
  Download,
  Globe,
  Lock,
  Pill,
  Plus,
  Power,
  RotateCcw,
  Save,
  Server,
  ShieldCheck,
  Thermometer,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { LOCALIZATION_DICTIONARY } from '../mockData.js';
import { useFarm } from '../App.jsx';

const TABS = [
  { id: 'houses', label: 'Houses & Feed Systems', icon: Building2 },
  { id: 'thresholds', label: 'Env, CO₂ & Pressure Limits', icon: Thermometer },
  { id: 'shifts-meds', label: 'Shift Timing & Med Catalog', icon: Pill },
  { id: 'localization', label: 'Language & Farm Units', icon: Globe },
  { id: 'storage', label: 'Storage & Backup', icon: Database },
];

const DEFAULT_2_SHIFTS = [
  { id: 'shift-day', label: 'Day Shift', startTime: '06:00', endTime: '18:00', hours: 12 },
  { id: 'shift-night', label: 'Night Shift', startTime: '18:00', endTime: '06:00', hours: 12 },
  { id: 'shift-mgmt', label: 'Management Flex', startTime: '06:00', endTime: '18:00', hours: 12 },
];

const DEFAULT_3_SHIFTS = [
  { id: 'shift-morning', label: 'Morning Shift', startTime: '06:00', endTime: '14:00', hours: 8 },
  { id: 'shift-afternoon', label: 'Afternoon Shift', startTime: '14:00', endTime: '22:00', hours: 8 },
  { id: 'shift-night', label: 'Night Shift', startTime: '22:00', endTime: '06:00', hours: 8 },
  { id: 'shift-mgmt', label: 'Management Flex', startTime: '06:00', endTime: '18:00', hours: 12 },
];

const MEDICATION_CATEGORIES = [
  'Vaccine',
  'Electrolyte',
  'Vitamin',
  'Antibiotic',
  'Disinfectant',
  'Probiotic',
];

export default function StorageSettings() {
  const {
    state,
    userRole,
    navigateTo,
    saveSettings,
    addOrUpdateHouse,
    toggleArchiveHouse,
    toggleHouseActive,
    updateShiftConfig,
    addMedicationCatalogItem,
    deleteMedicationCatalogItem,
    exportBackupFile,
    importBackupFile,
    resetDemoData,
    notify,
  } = useFarm();

  const [activeTab, setActiveTab] = useState('houses');
  const fileInputRef = useRef(null);

  const isOwner = userRole === 'owner';

  // Local editable drafts synced cleanly when settings load/reset
  const [contractDraft, setContractDraft] = useState({ ...state.settings.contractRules });
  const [envLimitsDraft, setEnvLimitsDraft] = useState({
    humidityMin: state.settings.environmentLimits?.humidityMin ?? 50,
    humidityMax: state.settings.environmentLimits?.humidityMax ?? 65,
    ammoniaWarningPpm: state.settings.environmentLimits?.ammoniaWarningPpm ?? 15,
    ammoniaAlertPpm: state.settings.environmentLimits?.ammoniaAlertPpm ?? 20,
    co2WarningPpm: state.settings.environmentLimits?.co2WarningPpm ?? 2500,
    co2AlertPpm: state.settings.environmentLimits?.co2AlertPpm ?? 3000,
    negPressureMinPa: state.settings.environmentLimits?.negPressureMinPa ?? 18,
    negPressureMaxPa: state.settings.environmentLimits?.negPressureMaxPa ?? 38,
  });
  const [ageDraft, setAgeDraft] = useState(
    (state.settings.ageThresholds || []).map((a) => ({ ...a }))
  );

  const initialShiftMode =
    state.settings?.shiftConfig?.mode === '3x8' ||
    state.settings?.shiftConfig?.mode === '3-shift' ||
    (state.settings?.shiftConfig?.shifts?.filter((s) => s.id !== 'shift-mgmt').length || 2) >= 3
      ? '3x8'
      : '2x12';
  const [shiftDraft, setShiftDraft] = useState({
    mode: initialShiftMode,
    shifts:
      state.settings?.shiftConfig?.shifts?.length > 0
        ? state.settings.shiftConfig.shifts.map((s) => ({ ...s }))
        : DEFAULT_2_SHIFTS.map((s) => ({ ...s })),
  });

  const [langDraft, setLangDraft] = useState({
    language: state.settings.language === 'ar' ? 'ar' : 'en',
    defaultFeedUnit: state.settings.defaultFeedUnit || 'bags',
    defaultWaterUnit: state.settings.defaultWaterUnit || 'gallons',
    enablePhase2Crops: Boolean(state.settings.enablePhase2Crops),
  });

  const [storageDraft, setStorageDraft] = useState({ ...state.settings.storage });

  useEffect(() => {
    setContractDraft({ ...state.settings.contractRules });
    setEnvLimitsDraft({
      humidityMin: state.settings.environmentLimits?.humidityMin ?? 50,
      humidityMax: state.settings.environmentLimits?.humidityMax ?? 65,
      ammoniaWarningPpm: state.settings.environmentLimits?.ammoniaWarningPpm ?? 15,
      ammoniaAlertPpm: state.settings.environmentLimits?.ammoniaAlertPpm ?? 20,
      co2WarningPpm: state.settings.environmentLimits?.co2WarningPpm ?? 2500,
      co2AlertPpm: state.settings.environmentLimits?.co2AlertPpm ?? 3000,
      negPressureMinPa: state.settings.environmentLimits?.negPressureMinPa ?? 18,
      negPressureMaxPa: state.settings.environmentLimits?.negPressureMaxPa ?? 38,
    });
    setAgeDraft((state.settings.ageThresholds || []).map((a) => ({ ...a })));
    setLangDraft({
      language: state.settings.language === 'ar' ? 'ar' : 'en',
      defaultFeedUnit: state.settings.defaultFeedUnit || 'bags',
      defaultWaterUnit: state.settings.defaultWaterUnit || 'gallons',
      enablePhase2Crops: Boolean(state.settings.enablePhase2Crops),
    });
    setStorageDraft({ ...state.settings.storage });
    if (state.settings?.shiftConfig?.shifts?.length) {
      const normalizedMode =
        state.settings.shiftConfig.mode === '3x8' ||
        state.settings.shiftConfig.mode === '3-shift' ||
        state.settings.shiftConfig.shifts.filter((s) => s.id !== 'shift-mgmt').length >= 3
          ? '3x8'
          : '2x12';
      setShiftDraft({
        mode: normalizedMode,
        shifts: state.settings.shiftConfig.shifts.map((s) => ({ ...s })),
      });
    }
  }, [state.settings]);

  // Dynamic New House Form (Super Admin Exclusive)
  const [newHouse, setNewHouse] = useState({
    name: '',
    code: '',
    sector: 'North Pad',
    cartons: 150,
    feedSystemType: 'bags', // 'bags' | 'silo'
    bagWeightKg: 50,
    siloCapacityTons: 20,
  });

  // New Medication Catalog Item Form
  const [newMed, setNewMed] = useState({
    name: '',
    category: 'Vaccine',
    defaultDosage: '',
    waterRatioPer1000Gal: '',
    withdrawalDays: 0,
  });

  if (userRole === 'worker' || userRole === 'supervisor') {
    return (
      <div className="rounded-3xl bg-white/95 p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-slate-700">
          Farm Settings &amp; System Administration are restricted to Farm Manager and Super Admin roles.
        </p>
      </div>
    );
  }

  const handleSaveContract = (e) => {
    e.preventDefault();
    saveSettings({
      ...state.settings,
      contractRules: {
        ...state.settings.contractRules,
        chicksPerCarton: Number(contractDraft.chicksPerCarton),
        defaultTargetCycleDays: Number(contractDraft.defaultTargetCycleDays),
        mandatoryCleaningDays: Number(contractDraft.mandatoryCleaningDays),
        targetWeightMinGrams: Number(contractDraft.targetWeightMinGrams),
        targetWeightMaxGrams: Number(contractDraft.targetWeightMaxGrams),
        payoutPerKgAed: Number(contractDraft.payoutPerKgAed),
      },
    });
  };

  const handleAddHouse = (e) => {
    e.preventDefault();
    if (!isOwner) {
      notify('Only Super Admin (Farm Owner) can add new broiler houses.', 'error');
      return;
    }
    if (!newHouse.name.trim()) return;
    const nextCode = newHouse.code.trim() || String(state.houses.length + 1).padStart(2, '0');
    addOrUpdateHouse({
      name: newHouse.name.trim(),
      code: nextCode,
      sector: newHouse.sector.trim() || 'Main Pad',
      cartons: Number(newHouse.cartons || 150),
      feedSystemType: newHouse.feedSystemType,
      bagWeightKg: newHouse.feedSystemType === 'bags' ? Number(newHouse.bagWeightKg || 50) : null,
      siloCapacityTons:
        newHouse.feedSystemType === 'silo' ? Number(newHouse.siloCapacityTons || 20) : null,
    });
    setNewHouse({
      name: '',
      code: '',
      sector: 'North Pad',
      cartons: 150,
      feedSystemType: 'bags',
      bagWeightKg: 50,
      siloCapacityTons: 20,
    });
  };

  const handleSaveThresholds = (e) => {
    e.preventDefault();
    saveSettings({
      ...state.settings,
      environmentLimits: {
        ...state.settings.environmentLimits,
        humidityMin: Number(envLimitsDraft.humidityMin),
        humidityMax: Number(envLimitsDraft.humidityMax),
        ammoniaWarningPpm: Number(envLimitsDraft.ammoniaWarningPpm),
        ammoniaAlertPpm: Number(envLimitsDraft.ammoniaAlertPpm),
        co2WarningPpm: Number(envLimitsDraft.co2WarningPpm),
        co2AlertPpm: Number(envLimitsDraft.co2AlertPpm),
        negPressureMinPa: Number(envLimitsDraft.negPressureMinPa),
        negPressureMaxPa: Number(envLimitsDraft.negPressureMaxPa),
      },
      ageThresholds: ageDraft.map((row) => ({
        ...row,
        targetMinC: Number(row.targetMinC),
        targetMaxC: Number(row.targetMaxC),
        attentionOffsetC: Number(row.attentionOffsetC),
        alertOffsetC: Number(row.alertOffsetC),
      })),
    });
  };

  const handleSwitchShiftPattern = (mode) => {
    setShiftDraft({
      mode,
      shifts: (mode === '3x8' ? DEFAULT_3_SHIFTS : DEFAULT_2_SHIFTS).map((s) => ({ ...s })),
    });
  };

  const handleSaveShiftConfig = (e) => {
    e.preventDefault();
    updateShiftConfig({
      mode: shiftDraft.mode,
      shifts: shiftDraft.shifts.map((s) => {
        const [sh, sm] = String(s.startTime || '06:00').split(':').map(Number);
        const [eh, em] = String(s.endTime || '18:00').split(':').map(Number);
        let diffHours = (eh * 60 + em - (sh * 60 + sm)) / 60;
        if (diffHours <= 0) diffHours += 24;
        return {
          ...s,
          label: s.label.trim() || 'Shift',
          hours: Number(diffHours.toFixed(1)),
        };
      }),
    });
  };

  const handleAddMedicationItem = (e) => {
    e.preventDefault();
    if (!newMed.name.trim() || !newMed.defaultDosage.trim()) {
      notify('Enter medicine name and default dosage.', 'error');
      return;
    }
    addMedicationCatalogItem({
      name: newMed.name.trim(),
      category: newMed.category,
      defaultDosage: newMed.defaultDosage.trim(),
      waterRatioPer1000Gal: newMed.waterRatioPer1000Gal.trim() || '1 L / 1000 gal',
      withdrawalDays: Number(newMed.withdrawalDays || 0),
    });
    setNewMed({
      name: '',
      category: 'Vaccine',
      defaultDosage: '',
      waterRatioPer1000Gal: '',
      withdrawalDays: 0,
    });
  };

  const handleSaveLocalization = (e) => {
    e.preventDefault();
    saveSettings({
      ...state.settings,
      ...langDraft,
    });
  };

  const handleSaveStorageConfig = (e) => {
    e.preventDefault();
    saveSettings({
      ...state.settings,
      storage: storageDraft,
    });
  };

  const handleImportChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importBackupFile(file);
    e.target.value = '';
  };

  const medicationCatalog = state.medicationCatalog || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Farm Settings &amp; System Administration
            </h2>
            <p className="text-xs font-medium text-slate-600">
              Configure broiler houses, Bag vs. Silo systems, CO₂/pressure limits, shift schedules, medication catalog, and backups
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-extrabold ${
              isOwner
                ? 'bg-emerald-100 text-emerald-900'
                : 'border border-amber-300 bg-amber-50 text-amber-900'
            }`}
          >
            {isOwner ? <ShieldCheck className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {isOwner ? 'Super Admin Access (Full Control)' : 'Farm Manager (House Creation Locked)'}
          </span>
        </div>

        {/* 5-Tab Bar */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold transition ${
                  activeTab === tab.id
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: Houses, Feed Systems (Bag vs Silo), Active/Inactive & Contract Rules */}
      {activeTab === 'houses' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-slate-900">
                Broiler Houses ({state.houses.filter((h) => !h.archived && h.isActive !== false).length}{' '}
                Active / {state.houses.length} Total)
              </h3>
              {!isOwner && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-900">
                  <Lock className="h-3 w-3" />
                  Super Admin Only Controls
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {state.houses.map((house) => {
                const isActiveHouse = house.isActive !== false;
                const isSilo = house.feedSystemType === 'silo';
                return (
                  <div
                    key={house.id}
                    className={`flex flex-col justify-between gap-3 rounded-2xl border p-3.5 sm:flex-row sm:items-center ${
                      house.archived || !isActiveHouse
                        ? 'border-slate-200 bg-slate-100 opacity-80'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-extrabold text-slate-900">
                          {house.name} ({house.code})
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                            isSilo
                              ? 'bg-sky-100 text-sky-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {isSilo
                            ? `Silo-Based (${house.siloCapacityTons || 20}T)`
                            : `Bag-Based (${house.bagWeightKg || 50}kg)`}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                            isActiveHouse
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isActiveHouse ? 'Active' : 'Inactive / Offline'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {house.sector} • {house.cartons} cartons •{' '}
                        {house.phase === 'cleaning'
                          ? `Cleaning D${house.cleaningDay}`
                          : `Cycle D${house.cycleDay}`}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {isOwner ? (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleHouseActive(house.id)}
                            className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                              isActiveHouse
                                ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                            {isActiveHouse ? 'Set Inactive' : 'Set Active'}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleArchiveHouse(house.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            {house.archived ? 'Restore' : 'Archive'}
                          </button>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-500">
                          <Lock className="h-3 w-3" />
                          Super Admin Only
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* + Add New Broiler House (Super Admin Exclusive) */}
            <div className="border-t border-slate-200 pt-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-extrabold text-emerald-900 uppercase">
                  + Add New Broiler House
                </p>
                {!isOwner && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-900">
                    <Lock className="h-3 w-3" />
                    Super Admin Only
                  </span>
                )}
              </div>

              {isOwner ? (
                <form onSubmit={handleAddHouse} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      required
                      placeholder="House Name (e.g. Broiler House 7)"
                      value={newHouse.name}
                      onChange={(e) => setNewHouse((p) => ({ ...p, name: e.target.value }))}
                      className="col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
                    />
                    <input
                      type="text"
                      placeholder="House Code (e.g. 07)"
                      value={newHouse.code}
                      onChange={(e) => setNewHouse((p) => ({ ...p, code: e.target.value }))}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
                    />
                    <input
                      type="text"
                      placeholder="Sector (e.g. East Pad)"
                      value={newHouse.sector}
                      onChange={(e) => setNewHouse((p) => ({ ...p, sector: e.target.value }))}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
                    />
                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-slate-600">
                        Initial Cartons
                      </label>
                      <input
                        type="number"
                        min={10}
                        value={newHouse.cartons}
                        onChange={(e) => setNewHouse((p) => ({ ...p, cartons: e.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-slate-600">
                        Feed System Type
                      </label>
                      <select
                        value={newHouse.feedSystemType}
                        onChange={(e) =>
                          setNewHouse((p) => ({ ...p, feedSystemType: e.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold"
                      >
                        <option value="bags">Bag-Based (Fixed Weight)</option>
                        <option value="silo">Silo-Based (Bulk 20T)</option>
                      </select>
                    </div>

                    {newHouse.feedSystemType === 'bags' ? (
                      <div className="col-span-2">
                        <label className="mb-1 block text-[11px] font-bold text-slate-600">
                          Fixed Bag Weight (kg)
                        </label>
                        <input
                          type="number"
                          min={5}
                          value={newHouse.bagWeightKg}
                          onChange={(e) =>
                            setNewHouse((p) => ({ ...p, bagWeightKg: e.target.value }))
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                        />
                      </div>
                    ) : (
                      <div className="col-span-2">
                        <label className="mb-1 block text-[11px] font-bold text-slate-600">
                          Bulk Silo Capacity (Metric Tons)
                        </label>
                        <input
                          type="number"
                          min={5}
                          value={newHouse.siloCapacityTons}
                          onChange={(e) =>
                            setNewHouse((p) => ({ ...p, siloCapacityTons: e.target.value }))
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                        />
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-900"
                  >
                    <Plus className="h-4 w-4" />
                    Add New Broiler House
                  </button>
                </form>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-900">
                  Adding new broiler houses or changing Active/Inactive house status requires{' '}
                  <strong>Super Admin (Farm Owner)</strong> privileges.
                </div>
              )}
            </div>
          </section>

          {/* Alain Farms Contract Rules */}
          <form
            onSubmit={handleSaveContract}
            className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm"
          >
            <h3 className="text-base font-extrabold text-slate-900">
              Alain Farms Contract Rules &amp; Benchmarks
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Chicks per Carton</label>
                <input
                  type="number"
                  value={contractDraft.chicksPerCarton}
                  onChange={(e) => setContractDraft((p) => ({ ...p, chicksPerCarton: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Default Cycle Days</label>
                <input
                  type="number"
                  value={contractDraft.defaultTargetCycleDays}
                  onChange={(e) =>
                    setContractDraft((p) => ({ ...p, defaultTargetCycleDays: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Cleaning Phase Days</label>
                <input
                  type="number"
                  value={contractDraft.mandatoryCleaningDays}
                  onChange={(e) =>
                    setContractDraft((p) => ({ ...p, mandatoryCleaningDays: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Min Target Weight (g)</label>
                <input
                  type="number"
                  value={contractDraft.targetWeightMinGrams}
                  onChange={(e) =>
                    setContractDraft((p) => ({ ...p, targetWeightMinGrams: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Max Target Weight (g)</label>
                <input
                  type="number"
                  value={contractDraft.targetWeightMaxGrams}
                  onChange={(e) =>
                    setContractDraft((p) => ({ ...p, targetWeightMaxGrams: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                />
              </div>

              {isOwner && (
                <div>
                  <label className="mb-1 block text-xs font-bold text-emerald-800">
                    Contract Payout (AED / kg)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={contractDraft.payoutPerKgAed}
                    onChange={(e) =>
                      setContractDraft((p) => ({ ...p, payoutPerKgAed: e.target.value }))
                    }
                    className="w-full rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-bold"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-6 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-900"
            >
              <Save className="h-4 w-4" />
              Save Contract Rules
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: Dynamic Age-Based Temp, Humidity, NH3, CO2 & Negative Pressure Thresholds */}
      {activeTab === 'thresholds' && (
        <form
          onSubmit={handleSaveThresholds}
          className="space-y-5 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm"
        >
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Age-Based Temperature Curve &amp; Air Quality / Pressure Limits
            </h3>
            <p className="text-xs text-slate-500">
              Gauges and house status pills (Optimal / Attention / Alert) evaluate live readings against these thresholds.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-2 pr-3">Flock Age Band</th>
                  <th className="py-2 pr-3">Target Min (°C)</th>
                  <th className="py-2 pr-3">Target Max (°C)</th>
                  <th className="py-2 pr-3">Attention Offset (°C)</th>
                  <th className="py-2">Alert Offset (°C)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ageDraft.map((row, idx) => (
                  <tr key={row.week}>
                    <td className="py-2.5 pr-3 font-extrabold text-slate-900">{row.label}</td>
                    {['targetMinC', 'targetMaxC', 'attentionOffsetC', 'alertOffsetC'].map((field) => (
                      <td key={field} className="py-2 pr-3">
                        <input
                          type="number"
                          step="0.5"
                          value={row[field]}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAgeDraft((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
                            );
                          }}
                          className="w-24 rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-bold"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Min Humidity (%)</label>
              <input
                type="number"
                value={envLimitsDraft.humidityMin}
                onChange={(e) => setEnvLimitsDraft((p) => ({ ...p, humidityMin: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Max Humidity (%)</label>
              <input
                type="number"
                value={envLimitsDraft.humidityMax}
                onChange={(e) => setEnvLimitsDraft((p) => ({ ...p, humidityMax: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-amber-800">NH₃ Warning (ppm)</label>
              <input
                type="number"
                value={envLimitsDraft.ammoniaWarningPpm}
                onChange={(e) =>
                  setEnvLimitsDraft((p) => ({ ...p, ammoniaWarningPpm: e.target.value }))
                }
                className="w-full rounded-xl border border-amber-300 px-3 py-2 text-xs font-bold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-red-700">NH₃ Alert (ppm)</label>
              <input
                type="number"
                value={envLimitsDraft.ammoniaAlertPpm}
                onChange={(e) =>
                  setEnvLimitsDraft((p) => ({ ...p, ammoniaAlertPpm: e.target.value }))
                }
                className="w-full rounded-xl border border-red-300 px-3 py-2 text-xs font-bold"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-amber-800">CO₂ Warning (ppm)</label>
              <input
                type="number"
                step="50"
                value={envLimitsDraft.co2WarningPpm}
                onChange={(e) =>
                  setEnvLimitsDraft((p) => ({ ...p, co2WarningPpm: e.target.value }))
                }
                className="w-full rounded-xl border border-amber-300 px-3 py-2 text-xs font-bold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-red-700">CO₂ Alert (ppm)</label>
              <input
                type="number"
                step="50"
                value={envLimitsDraft.co2AlertPpm}
                onChange={(e) =>
                  setEnvLimitsDraft((p) => ({ ...p, co2AlertPpm: e.target.value }))
                }
                className="w-full rounded-xl border border-red-300 px-3 py-2 text-xs font-bold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-sky-800">
                Neg. Pressure Min (Pa)
              </label>
              <input
                type="number"
                value={envLimitsDraft.negPressureMinPa}
                onChange={(e) =>
                  setEnvLimitsDraft((p) => ({ ...p, negPressureMinPa: e.target.value }))
                }
                className="w-full rounded-xl border border-sky-200 px-3 py-2 text-xs font-bold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-sky-800">
                Neg. Pressure Max (Pa)
              </label>
              <input
                type="number"
                value={envLimitsDraft.negPressureMaxPa}
                onChange={(e) =>
                  setEnvLimitsDraft((p) => ({ ...p, negPressureMaxPa: e.target.value }))
                }
                className="w-full rounded-xl border border-sky-200 px-3 py-2 text-xs font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-6 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-900"
          >
            <Save className="h-4 w-4" />
            Save Threshold Curve
          </button>
        </form>
      )}

      {/* TAB 3: Shift Configuration & Approved Medication Catalog */}
      {activeTab === 'shifts-meds' && (
        <div className="space-y-6">
          {/* Clean Link to Staff & Attendance for User Accounts */}
          <div className="flex flex-col justify-between gap-3 rounded-3xl border border-sky-200 bg-sky-50/90 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 shrink-0 text-sky-800" />
              <div>
                <p className="text-xs font-extrabold text-sky-900">
                  User Accounts, Passwords &amp; Multi-House Rotations Moved to Staff &amp; Attendance
                </p>
                <p className="text-[11px] text-sky-800">
                  Manage worker/supervisor credentials, live On-Shift status, and shift timelines in Staff &amp; Attendance.
                </p>
              </div>
            </div>
            {typeof navigateTo === 'function' && (
              <button
                type="button"
                onClick={() => navigateTo('staff')}
                className="self-start rounded-full bg-emerald-800 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-900 sm:self-auto"
              >
                Open Staff &amp; Attendance
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Section 1: Shift Timing Configuration */}
            <form
              onSubmit={handleSaveShiftConfig}
              className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-700" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Farm Shift Timing Configuration
                  </h3>
                  <p className="text-xs text-slate-500">
                    Switch between 2×12h or 3×8h coverage and customize exact shift windows
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSwitchShiftPattern('2x12')}
                  className={`rounded-2xl border p-3 text-left transition ${
                    shiftDraft.mode === '2x12'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <p className="text-xs font-extrabold">2 Shifts (12 Hours each)</p>
                  <p className="text-[11px] text-slate-500">Day 06:00–18:00 &amp; Night 18:00–06:00</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchShiftPattern('3x8')}
                  className={`rounded-2xl border p-3 text-left transition ${
                    shiftDraft.mode === '3x8'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <p className="text-xs font-extrabold">3 Shifts (8 Hours each)</p>
                  <p className="text-[11px] text-slate-500">Morning, Afternoon &amp; Night coverage</p>
                </button>
              </div>

              <div className="space-y-2.5">
                {shiftDraft.shifts.map((shift, idx) => (
                  <div
                    key={shift.id || idx}
                    className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3"
                  >
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase">
                        Shift Name
                      </label>
                      <input
                        type="text"
                        value={shift.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          setShiftDraft((prev) => ({
                            ...prev,
                            shifts: prev.shifts.map((s, i) => (i === idx ? { ...s, label: val } : s)),
                          }));
                        }}
                        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={shift.startTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setShiftDraft((prev) => ({
                            ...prev,
                            shifts: prev.shifts.map((s, i) =>
                              i === idx ? { ...s, startTime: val } : s
                            ),
                          }));
                        }}
                        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={shift.endTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setShiftDraft((prev) => ({
                            ...prev,
                            shifts: prev.shifts.map((s, i) =>
                              i === idx ? { ...s, endTime: val } : s
                            ),
                          }));
                        }}
                        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-900"
              >
                <Save className="h-4 w-4" />
                Save Shift Timing
              </button>
            </form>

            {/* Section 2: Approved Medication Catalog */}
            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Approved Medication Catalog ({medicationCatalog.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Structured vaccines, electrolytes &amp; treatments scheduled by Management (zero worker free-text)
                  </p>
                </div>
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {medicationCatalog.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-xs font-extrabold text-slate-900">{item.name}</p>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Dosage: <strong>{item.defaultDosage}</strong> • Ratio:{' '}
                        <strong>{item.waterRatioPer1000Gal}</strong> • Withdrawal:{' '}
                        <strong>{item.withdrawalDays ?? 0} days</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteMedicationCatalogItem(item.id)}
                      className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                      title="Remove from catalog"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleAddMedicationItem}
                className="space-y-3 border-t border-slate-200 pt-4"
              >
                <p className="text-xs font-extrabold text-emerald-900 uppercase">
                  + Add Medicine to Catalog
                </p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    placeholder="Medicine / Vaccine Name"
                    value={newMed.name}
                    onChange={(e) => setNewMed((p) => ({ ...p, name: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
                  />
                  <select
                    value={newMed.category}
                    onChange={(e) => setNewMed((p) => ({ ...p, category: e.target.value }))}
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold"
                  >
                    {MEDICATION_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="Default Dosage (e.g. 1 vial / 1000 birds)"
                    value={newMed.defaultDosage}
                    onChange={(e) => setNewMed((p) => ({ ...p, defaultDosage: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
                  />
                  <input
                    type="text"
                    placeholder="Water Ratio / 1000 gal (e.g. 500 ml / 1000 gal)"
                    value={newMed.waterRatioPer1000Gal}
                    onChange={(e) =>
                      setNewMed((p) => ({ ...p, waterRatioPer1000Gal: e.target.value }))
                    }
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
                  />
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600">
                      Withdrawal Days
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newMed.withdrawalDays}
                      onChange={(e) =>
                        setNewMed((p) => ({ ...p, withdrawalDays: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-emerald-800 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-900"
                    >
                      <Plus className="h-4 w-4" />
                      Add to Catalog
                    </button>
                  </div>
                </div>
              </form>
            </section>
          </div>
        </div>
      )}

      {/* TAB 4: Language (EN <-> AR) & Farm Units */}
      {activeTab === 'localization' && (
        <form
          onSubmit={handleSaveLocalization}
          className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm"
        >
          <h3 className="text-base font-extrabold text-slate-900">
            Interface Language (EN &harr; AR) &amp; Default Farm Measurement Units
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Interface Language</label>
              <select
                value={langDraft.language}
                onChange={(e) => setLangDraft((p) => ({ ...p, language: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold"
              >
                <option value="en">
                  {LOCALIZATION_DICTIONARY.en?.label || 'English (LTR)'}
                </option>
                <option value="ar">
                  {LOCALIZATION_DICTIONARY.ar?.label || 'العربية (Arabic RTL)'}
                </option>
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                Switches top header, navigation &amp; KPIs cleanly between English (LTR) and Arabic (RTL).
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Default Water Unit</label>
              <select
                value={langDraft.defaultWaterUnit}
                onChange={(e) => setLangDraft((p) => ({ ...p, defaultWaterUnit: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold"
              >
                <option value="gallons">Gallons (gal — Tank Gauge Default)</option>
                <option value="liters">Liters (L)</option>
                <option value="m3">Cubic Meters (m³)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Default Feed Unit</label>
              <select
                value={langDraft.defaultFeedUnit}
                onChange={(e) => setLangDraft((p) => ({ ...p, defaultFeedUnit: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold"
              >
                <option value="bags">Bags (50kg Gunny Sacks)</option>
                <option value="tons">Metric Tons (Bulk Silos)</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-800">
            <input
              type="checkbox"
              checked={langDraft.enablePhase2Crops}
              onChange={(e) => setLangDraft((p) => ({ ...p, enablePhase2Crops: e.target.checked }))}
              className="h-4 w-4 accent-emerald-800"
            />
            Show Phase 2 Preview Tab (General Farm / Date Palms Placeholder)
          </label>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-6 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-900"
          >
            <Save className="h-4 w-4" />
            Save Language &amp; Units
          </button>
        </form>
      )}

      {/* TAB 5: Storage Adapters & JSON Backup */}
      {activeTab === 'storage' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <form
            onSubmit={handleSaveStorageConfig}
            className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-emerald-700" />
              <h3 className="text-base font-extrabold text-slate-900">
                Modular Repository Storage Adapter
              </h3>
            </div>

            <select
              value={storageDraft.activeAdapter}
              onChange={(e) => setStorageDraft((p) => ({ ...p, activeAdapter: e.target.value }))}
              className="w-full rounded-xl border-2 border-emerald-700 bg-white px-3 py-2.5 text-xs font-extrabold text-slate-900"
            >
              <option value="local">LocalStorageAdapter (Active Default — 100% Local)</option>
              <option value="firebase">FirebaseAdapter (Firestore / RTDB Spark Tier Stub)</option>
              <option value="gdrive">GoogleDriveAdapter (Drive API v3 1TB+ Sync Stub)</option>
              <option value="unraid">UnraidServerAdapter (Tailscale / Cloudflare Tunnel + MQTT Stub)</option>
            </select>

            {storageDraft.activeAdapter === 'firebase' && (
              <div className="space-y-2 rounded-2xl bg-slate-50 p-3.5 text-xs">
                <p className="font-extrabold text-slate-800">Firebase Firestore Credentials</p>
                <input
                  type="text"
                  placeholder="Project ID"
                  value={storageDraft.firebaseConfig?.projectId || ''}
                  onChange={(e) =>
                    setStorageDraft((p) => ({
                      ...p,
                      firebaseConfig: { ...p.firebaseConfig, projectId: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                />
                <input
                  type="password"
                  placeholder="Web API Key"
                  value={storageDraft.firebaseConfig?.apiKey || ''}
                  onChange={(e) =>
                    setStorageDraft((p) => ({
                      ...p,
                      firebaseConfig: { ...p.firebaseConfig, apiKey: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                />
              </div>
            )}

            {storageDraft.activeAdapter === 'gdrive' && (
              <div className="space-y-2 rounded-2xl bg-slate-50 p-3.5 text-xs">
                <p className="font-extrabold text-slate-800">Google Drive API v3 Configuration</p>
                <input
                  type="text"
                  placeholder="Target Drive Folder ID"
                  value={storageDraft.googleDriveConfig?.folderId || ''}
                  onChange={(e) =>
                    setStorageDraft((p) => ({
                      ...p,
                      googleDriveConfig: { ...p.googleDriveConfig, folderId: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="OAuth Client ID"
                  value={storageDraft.googleDriveConfig?.clientId || ''}
                  onChange={(e) =>
                    setStorageDraft((p) => ({
                      ...p,
                      googleDriveConfig: { ...p.googleDriveConfig, clientId: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                />
              </div>
            )}

            {storageDraft.activeAdapter === 'unraid' && (
              <div className="space-y-2 rounded-2xl bg-slate-50 p-3.5 text-xs">
                <p className="font-extrabold text-slate-800">Unraid Server + Live Zigbee/Wi-Fi MQTT</p>
                <input
                  type="url"
                  placeholder="HTTPS Endpoint (Tailscale / Cloudflare Tunnel)"
                  value={storageDraft.unraidConfig?.endpointUrl || ''}
                  onChange={(e) =>
                    setStorageDraft((p) => ({
                      ...p,
                      unraidConfig: { ...p.unraidConfig, endpointUrl: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                />
                <input
                  type="password"
                  placeholder="Bearer API Token"
                  value={storageDraft.unraidConfig?.apiToken || ''}
                  onChange={(e) =>
                    setStorageDraft((p) => ({
                      ...p,
                      unraidConfig: { ...p.unraidConfig, apiToken: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                />
              </div>
            )}

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-6 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-900"
            >
              <Save className="h-4 w-4" />
              Save Storage Configuration
            </button>
          </form>

          {/* Manual JSON Snapshot Export / Import & Demo Reset */}
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900">
              Manual JSON Snapshot Sync (Google Drive Ready)
            </h3>
            <p className="text-xs text-slate-600">
              Download the complete farm state as a portable <code className="font-bold">.json</code> file to store in Google Drive or restore onto another tablet.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={exportBackupFile}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-900"
              >
                <Download className="h-4 w-4" />
                Export Farm Database (.json)
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-700 bg-emerald-50 px-5 py-2.5 text-xs font-extrabold text-emerald-900 hover:bg-emerald-100"
              >
                <Upload className="h-4 w-4" />
                Import Farm Database (.json)
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportChange}
                className="hidden"
              />
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="mb-2 text-xs font-bold text-slate-700">
                Testing &amp; Sandbox Reset
              </p>
              <button
                type="button"
                onClick={() => {
                  resetDemoData();
                  notify('Demo farm database reset to initial state.', 'success');
                }}
                className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-red-50 px-5 py-2.5 text-xs font-extrabold text-red-700 hover:bg-red-100"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Demo Data
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
