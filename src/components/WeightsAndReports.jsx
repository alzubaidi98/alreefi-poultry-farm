import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Award,
  Building2,
  CheckCircle2,
  Copy,
  DollarSign,
  ExternalLink,
  FileSpreadsheet,
  HeartPulse,
  Lock,
  MessageCircle,
  Printer,
  Save,
  Scale,
  Stethoscope,
  Truck,
  Users,
} from 'lucide-react';
import {
  calculateHouseInventory,
  evaluateHouseEnvironmentStatus,
  getExpectedWeightForDay,
} from '../mockData.js';
import { useFarm } from '../App.jsx';

const WEIGHT_REPORT_TABS = [
  { id: 'weights', label: 'Weekly Bird Weights & Uniformity (التجانس)', icon: Scale },
  { id: 'eoc', label: 'Automated End-of-Cycle Report', icon: FileSpreadsheet },
  { id: 'whatsapp', label: '3 Audience WhatsApp Templates', icon: MessageCircle },
];

function sanitizeWhatsAppDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function evaluateDualWeightBenchmarks(avgGrams, cycleDay, minHarvestG = 1350, maxHarvestG = 1550) {
  const weight = Number(avgGrams || 0);
  const day = Math.max(1, Number(cycleDay || 1));
  const dailyStdG = getExpectedWeightForDay(day);

  if (!weight || weight <= 0) {
    return {
      dailyStdG,
      dailyDiffG: 0,
      dailyPct: 0,
      dailyStatusLabel: 'Awaiting Sample',
      dailyBadgeClass: 'border-slate-200 bg-slate-100 text-slate-600',
      harvestPct: 0,
      harvestStatusLabel: `Target ${minHarvestG}–${maxHarvestG}g`,
      harvestBadgeClass: 'border-slate-200 bg-slate-100 text-slate-600',
    };
  }

  const dailyDiffG = Math.round(weight - dailyStdG);
  const dailyPct = Number(((weight / Math.max(1, dailyStdG)) * 100).toFixed(1));
  const isAheadDaily = dailyDiffG >= -15;

  const dailyStatusLabel =
    dailyDiffG >= 0
      ? `+${dailyDiffG}g (${dailyPct}%) vs Day ${day} Std (${dailyStdG}g)`
      : `${dailyDiffG}g (${dailyPct}%) vs Day ${day} Std (${dailyStdG}g)`;

  const dailyBadgeClass = isAheadDaily
    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200'
    : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200';

  const harvestPct = Math.min(100, Math.round((weight / minHarvestG) * 100));
  let harvestStatusLabel = '';
  let harvestBadgeClass = '';

  if (weight >= minHarvestG && weight <= maxHarvestG) {
    harvestStatusLabel = `READY / IN TARGET (${minHarvestG}–${maxHarvestG}g)`;
    harvestBadgeClass =
      'border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200';
  } else if (weight > maxHarvestG) {
    harvestStatusLabel = `OVER CAP (+${weight - maxHarvestG}g above ${maxHarvestG}g)`;
    harvestBadgeClass =
      'border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-200';
  } else {
    harvestStatusLabel = `${minHarvestG - weight}g remaining to ${minHarvestG}g Harvest Band (${harvestPct}%)`;
    harvestBadgeClass =
      'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-200';
  }

  return {
    dailyStdG,
    dailyDiffG,
    dailyPct,
    dailyStatusLabel,
    dailyBadgeClass,
    harvestPct,
    harvestStatusLabel,
    harvestBadgeClass,
  };
}

export default function WeightsAndReports() {
  const {
    state,
    userRole,
    recordWeeklyBirdWeight,
    saveHarvestLaborRecord,
    dispatchDailyReportNow,
    notify,
  } = useFarm();

  const isAuthorized = userRole === 'owner' || userRole === 'manager';

  const [subTab, setSubTab] = useState('weights');

  const houses = useMemo(
    () => (state.houses || []).filter((h) => !h.archived),
    [state.houses]
  );

  // --- Sub-Tab 1: Weekly Bird Weights & Uniformity % ---
  const [selectedWeightHouseId, setSelectedWeightHouseId] = useState(
    () => houses.find((h) => h.phase === 'cultivation' && h.isActive !== false)?.id || houses[0]?.id || 'house-1'
  );
  const selectedWeightHouse = useMemo(
    () => houses.find((h) => h.id === selectedWeightHouseId) || houses[0],
    [houses, selectedWeightHouseId]
  );

  // Cycle Day automatically mirrors selected house and is grayed out / read-only
  const autoCycleDay = Math.max(1, Number(selectedWeightHouse?.cycleDay || 1));

  const [weightForm, setWeightForm] = useState({
    sampleSize: '50',
    avgGrams: '',
    uniformityPct: '85',
    notes: '',
  });

  const minTargetG = state.settings?.contractRules?.targetWeightMinGrams || 1350;
  const maxTargetG = state.settings?.contractRules?.targetWeightMaxGrams || 1550;
  const payoutPerKg = state.settings?.contractRules?.payoutPerKgAed || 5.45;
  const chicksPerCarton = state.settings?.contractRules?.chicksPerCarton || 100;

  const liveDualPreview = useMemo(
    () => evaluateDualWeightBenchmarks(weightForm.avgGrams, autoCycleDay, minTargetG, maxTargetG),
    [weightForm.avgGrams, autoCycleDay, minTargetG, maxTargetG]
  );

  // --- Sub-Tab 2: Automated End-of-Cycle Financial & Operations Report ---
  const [eocHouseId, setEocHouseId] = useState(
    () => houses.find((h) => h.phase === 'cleaning')?.id || houses[0]?.id || 'house-1'
  );
  const eocHouse = useMemo(
    () => houses.find((h) => h.id === eocHouseId) || houses[0],
    [houses, eocHouseId]
  );

  const existingHarvestLabor = useMemo(() => {
    if (!eocHouse) return null;
    return (state.harvestLaborRecords || []).find(
      (r) => r.houseId === eocHouse.id && Number(r.cycleNumber) === Number(eocHouse.cycleNumber)
    );
  }, [state.harvestLaborRecords, eocHouse]);

  const [harvestLaborForm, setHarvestLaborForm] = useState({
    workerHeadcount: String(existingHarvestLabor?.workerHeadcount ?? 8),
    bonusPerWorkerAed: String(existingHarvestLabor?.bonusPerWorkerAed ?? 150),
    notes: existingHarvestLabor?.notes || '',
  });

  useEffect(() => {
    setHarvestLaborForm({
      workerHeadcount: String(existingHarvestLabor?.workerHeadcount ?? 8),
      bonusPerWorkerAed: String(existingHarvestLabor?.bonusPerWorkerAed ?? 150),
      notes: existingHarvestLabor?.notes || '',
    });
  }, [eocHouseId, existingHarvestLabor]);

  const eocFinancialSummary = useMemo(() => {
    if (!eocHouse) return null;
    const inv = calculateHouseInventory(eocHouse, chicksPerCarton, state.healthLogs || []);
    const activeHousesCount = Math.max(1, houses.filter((h) => h.isActive !== false).length);

    // Allocated Bills & Orders for this house
    const relatedBills = (state.ordersAndBills || []).filter((ord) => {
      const targets = ord.assignedHouseIds || [];
      return targets.includes(eocHouse.id) || targets.includes('ALL');
    });

    const billRows = relatedBills.map((ord) => {
      const targets = ord.assignedHouseIds || [];
      const divisor = targets.includes('ALL') ? activeHousesCount : Math.max(1, targets.length);
      const allocatedAed = Number(ord.totalCostAed || 0) / divisor;
      return {
        ...ord,
        allocatedAed,
      };
    });

    const totalPaidBillsAed = billRows
      .filter((b) => b.status === 'Paid')
      .reduce((s, b) => s + b.allocatedAed, 0);
    const totalPendingBillsAed = billRows
      .filter((b) => b.status !== 'Paid')
      .reduce((s, b) => s + b.allocatedAed, 0);

    const headcount = Math.max(0, Number(harvestLaborForm.workerHeadcount || 0));
    const bonusEach = Math.max(0, Number(harvestLaborForm.bonusPerWorkerAed || 0));
    const totalHarvestBonusAed = headcount * bonusEach;

    const latestWeight =
      eocHouse.lastHarvestSummary?.avgWeightGrams ||
      eocHouse.weeklyWeights?.[eocHouse.weeklyWeights.length - 1]?.avgGrams ||
      getExpectedWeightForDay(eocHouse.cycleDay);

    const harvestedOrActiveBirds =
      eocHouse.lastHarvestSummary?.harvestedBirds || inv.activeChicks;
    const estimatedCatchKg =
      eocHouse.lastHarvestSummary?.totalCatchKg ||
      Math.round((harvestedOrActiveBirds * latestWeight) / 1000);
    const estimatedGrossRevenueAed = Math.round(estimatedCatchKg * payoutPerKg);
    const totalAllocatedSpendAed = Math.round(totalPaidBillsAed + totalPendingBillsAed + totalHarvestBonusAed);
    const netCycleMarginAed = estimatedGrossRevenueAed - totalAllocatedSpendAed;

    return {
      inv,
      billRows,
      totalPaidBillsAed,
      totalPendingBillsAed,
      totalHarvestBonusAed,
      latestWeight,
      harvestedOrActiveBirds,
      estimatedCatchKg,
      estimatedGrossRevenueAed,
      totalAllocatedSpendAed,
      netCycleMarginAed,
    };
  }, [eocHouse, chicksPerCarton, state.healthLogs, state.ordersAndBills, houses, harvestLaborForm, payoutPerKg]);

  // --- Sub-Tab 3: 3 Audience-Specific WhatsApp Templates ---
  const [templateAudience, setTemplateAudience] = useState('vet'); // 'vet' | 'supplier' | 'internal'
  const [customPhone, setCustomPhone] = useState('');

  const compiledMessages = useMemo(() => {
    const activeHouses = houses.filter((h) => h.isActive !== false && h.phase !== 'cleaning');
    const latestDate = state.healthLogs?.[0]?.date || '2026-11-15';
    const todaysLogs = (state.healthLogs || []).filter((l) => l.date === latestDate);

    const totalLive = activeHouses.reduce(
      (s, h) => s + calculateHouseInventory(h, chicksPerCarton, state.healthLogs || []).activeChicks,
      0
    );
    const totalDeadToday = todaysLogs.reduce((s, l) => s + Number(l.mortalities || 0), 0);
    const totalCullsToday = todaysLogs.reduce((s, l) => s + Number(l.culls || 0), 0);
    const avgWeightAll = activeHouses.length
      ? Math.round(
          activeHouses.reduce((s, h) => {
            const lastW = h.weeklyWeights?.[h.weeklyWeights.length - 1]?.avgGrams;
            return s + (lastW || getExpectedWeightForDay(h.cycleDay));
          }, 0) / activeHouses.length
        )
      : 0;
    const avgUniformity = activeHouses.length
      ? Number(
          (
            activeHouses.reduce((s, h) => {
              const lastU = h.weeklyWeights?.[h.weeklyWeights.length - 1]?.uniformityPct;
              return s + (lastU ?? 85);
            }, 0) / activeHouses.length
          ).toFixed(1)
        )
      : 85;

    const healthSummaries = activeHouses
      .map((h) => {
        const inv = calculateHouseInventory(h, chicksPerCarton, state.healthLogs || []);
        const env = evaluateHouseEnvironmentStatus(h, state.settings);
        const lastW = h.weeklyWeights?.[h.weeklyWeights.length - 1];
        const wStr = lastW ? `${lastW.avgGrams}g (${lastW.uniformityPct || 85}% Unif)` : 'Pending Weigh';
        return `• ${h.name} (Day ${h.cycleDay}): Live ${inv.activeChicks.toLocaleString()} | Wt ${wStr} | Env ${env.status}`;
      })
      .join('\n');

    const clinicalNotes = (state.incidentNotes || [])
      .slice(0, 3)
      .map((inc) => {
        const hName = houses.find((h) => h.id === inc.houseId)?.code || inc.houseId;
        return `• [H${hName}] ${inc.note}`;
      })
      .join('\n');

    // 1. Veterinarian ("Doctor") Report — ZERO Financials
    const vetReport = [
      `*AlReefi Farm — Daily Veterinary Health Report*`,
      `Date: ${latestDate} | Cycle #13`,
      `Total Live Birds: ${totalLive.toLocaleString()}`,
      `Mortalities Today: ${totalDeadToday} | Sick / Culls: ${totalCullsToday}`,
      `Avg Sample Weight: ${avgWeightAll}g | Uniformity: ${avgUniformity}%`,
      ``,
      `*House-by-House Clinical Snapshot:*`,
      healthSummaries,
      ``,
      `*Recent Health & Environmental Observations:*`,
      clinicalNotes || '• Normal clinical behavior across houses.',
    ].join('\n');

    // 2. Supplier Report (Alain Farms) — STRICTLY ZERO Financial Costs/Bills
    const supplierHouseWeights = activeHouses
      .map((h) => {
        const lastW = h.weeklyWeights?.[h.weeklyWeights.length - 1];
        const actualG = lastW?.avgGrams || getExpectedWeightForDay(h.cycleDay);
        const stdG = getExpectedWeightForDay(h.cycleDay);
        const diff = actualG - stdG;
        return `• ${h.name} (Day ${h.cycleDay}): Avg ${actualG}g (${diff >= 0 ? '+' : ''}${diff}g vs Day ${h.cycleDay} Std ${stdG}g) | Uniformity: ${lastW?.uniformityPct ?? 85}%`;
      })
      .join('\n');

    const supplierReport = [
      `*Alain Farms Flock Progress Update — AlReefi Poultry Farm*`,
      `Date: ${latestDate} | Active Batch: Cycle #13`,
      `Flock Health Status: Stable — Routine biosecurity & vaccination schedule on track (Zero reportable disease outbreak).`,
      `Contract Target Harvest Band: ${minTargetG}g – ${maxTargetG}g | Current Avg Uniformity: ${avgUniformity}%`,
      ``,
      `*House Weight & Uniformity Benchmarks:*`,
      supplierHouseWeights,
    ].join('\n');

    // 3. Internal Management Report — Full Operational + Financials
    const paidOrdersAed = (state.ordersAndBills || [])
      .filter((o) => o.status === 'Paid')
      .reduce((s, o) => s + Number(o.totalCostAed || 0), 0);
    const pendingOrders = (state.ordersAndBills || []).filter((o) => o.status === 'Pending');
    const pendingOrdersAed = pendingOrders.reduce((s, o) => s + Number(o.totalCostAed || 0), 0);

    const internalReport = [
      `*AlReefi Farm — Internal Management Executive Brief*`,
      `Date: ${latestDate} | Active Cycle #13`,
      `Live Birds: ${totalLive.toLocaleString()} | Dead Today: ${totalDeadToday} | Culls: ${totalCullsToday}`,
      `Avg Weight: ${avgWeightAll}g | Avg Uniformity: ${avgUniformity}%`,
      ``,
      `*Orders & Bills Financial Summary:*`,
      `• Total Paid Bills: AED ${Math.round(paidOrdersAed).toLocaleString()}`,
      `• Pending Super Admin Payment: ${pendingOrders.length} orders (AED ${Math.round(pendingOrdersAed).toLocaleString()})`,
      ``,
      `*Active House Status:*`,
      healthSummaries,
    ].join('\n');

    return {
      vet: vetReport,
      supplier: supplierReport,
      internal: internalReport,
    };
  }, [houses, state.healthLogs, state.settings, state.incidentNotes, state.ordersAndBills, chicksPerCarton, minTargetG, maxTargetG]);

  const activeMessageText = compiledMessages[templateAudience] || compiledMessages.vet;

  const defaultRecipient = useMemo(() => {
    const recips = state.reportSchedule?.recipients || [];
    if (templateAudience === 'vet') {
      return (
        recips.find((r) => String(r.roleTitle || r.name).toLowerCase().includes('vet')) || {
          name: 'Dr. Khalid Al-Nuaimi (Farm Vet)',
          phone: '+971 50 884 7712',
        }
      );
    }
    if (templateAudience === 'supplier') {
      return {
        name: 'Alain Farms Coordinator',
        phone: '+971 50 555 2040',
      };
    }
    return (
      recips.find((r) => String(r.roleTitle || r.name).toLowerCase().includes('owner')) || {
        name: 'Super Admin & Management',
        phone: '+971 50 100 0001',
      }
    );
  }, [state.reportSchedule, templateAudience]);

  if (!isAuthorized) {
    return (
      <div className="rounded-3xl bg-white/95 p-8 text-center shadow-sm dark:bg-slate-800/95">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Weekly Bird Weights &amp; Financial Cycle Reports are restricted to Farm Manager and Super Admin roles.
        </p>
      </div>
    );
  }

  const handleSaveWeight = (e) => {
    e.preventDefault();
    const grams = Number(weightForm.avgGrams);
    const unif = Number(weightForm.uniformityPct);
    if (!grams || grams <= 0) {
      notify('Enter a valid measured average bird weight in grams.', 'warning');
      return;
    }
    if (Number.isNaN(unif) || unif < 0 || unif > 100) {
      notify('Enter a numeric Flock Uniformity % between 0 and 100.', 'warning');
      return;
    }

    recordWeeklyBirdWeight({
      houseId: selectedWeightHouse.id,
      cycleDay: autoCycleDay,
      sampleSize: Number(weightForm.sampleSize || 50),
      avgGrams: grams,
      uniformityPct: unif,
      notes: weightForm.notes.trim(),
    });

    setWeightForm({
      sampleSize: '50',
      avgGrams: '',
      uniformityPct: '85',
      notes: '',
    });
  };

  const handleSaveHarvestLabor = (e) => {
    e.preventDefault();
    if (!eocHouse) return;
    saveHarvestLaborRecord({
      houseId: eocHouse.id,
      cycleNumber: eocHouse.cycleNumber,
      workerHeadcount: Number(harvestLaborForm.workerHeadcount || 0),
      bonusPerWorkerAed: Number(harvestLaborForm.bonusPerWorkerAed || 0),
      notes: harvestLaborForm.notes.trim(),
    });
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(activeMessageText);
      notify('Copied formatted WhatsApp report text!', 'success');
    } catch {
      notify('Select and copy the preview box manually.', 'warning');
    }
  };

  const handleWhatsAppSend = () => {
    dispatchDailyReportNow?.('whatsapp');
  };

  const targetPhone = customPhone.trim() || defaultRecipient.phone;
  const whatsappUrl = `https://wa.me/${sanitizeWhatsAppDigits(targetPhone)}?text=${encodeURIComponent(
    activeMessageText
  )}`;

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tab Switcher */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm lg:flex-row lg:items-center dark:border-slate-700 dark:bg-slate-800/95">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Bird Weights, End-of-Cycle Accounting &amp; WhatsApp Reports
          </h2>
          <p className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            Dual daily/harvest weight benchmarking, house-level cycle statements, and audience-isolated WhatsApp reporting (Full Contracts deferred to Phase 2).
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {WEIGHT_REPORT_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold transition ${
                  active
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-TAB 1: WEEKLY BIRD WEIGHTS & DUAL BENCHMARKS */}
      {subTab === 'weights' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Weighing Input Form */}
          <form
            onSubmit={handleSaveWeight}
            className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm lg:col-span-5 dark:border-slate-700 dark:bg-slate-800/95"
          >
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Record Weekly Sample Weighing
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Broiler House
                </label>
                <select
                  value={selectedWeightHouse?.id || ''}
                  onChange={(e) => setSelectedWeightHouseId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  {houses.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} — Cycle #{h.cycleNumber} (Day {h.cycleDay})
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-Populated & Grayed Out Cycle Day */}
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <Lock className="h-3 w-3" />
                  Cycle Day (Auto-Filled)
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={`Day ${autoCycleDay} (Week ${Math.ceil(autoCycleDay / 7)})`}
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Sample Size (Birds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={weightForm.sampleSize}
                  onChange={(e) => setWeightForm((p) => ({ ...p, sampleSize: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Avg Bird Weight (g) *
                </label>
                <input
                  type="number"
                  min="30"
                  max="4000"
                  required
                  value={weightForm.avgGrams}
                  onChange={(e) => setWeightForm((p) => ({ ...p, avgGrams: e.target.value }))}
                  placeholder={`e.g., ${liveDualPreview.dailyStdG}`}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-black text-emerald-900 dark:border-slate-600 dark:bg-slate-900 dark:text-emerald-300"
                />
              </div>

              {/* Direct Numeric Flock Uniformity Input */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Flock Uniformity % (التجانس) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    required
                    value={weightForm.uniformityPct}
                    onChange={(e) => setWeightForm((p) => ({ ...p, uniformityPct: e.target.value }))}
                    placeholder="e.g., 40, 50, 85"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-8 text-sm font-black text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-black text-slate-400">
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Dual Benchmark Evaluation Box */}
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-900/60">
              <p className="text-[11px] font-extrabold text-slate-500 uppercase dark:text-slate-400">
                Dual Weight Benchmark Preview
              </p>
              <div className={`rounded-xl border px-3 py-2 text-xs font-bold ${liveDualPreview.dailyBadgeClass}`}>
                <span className="block text-[10px] font-extrabold uppercase opacity-75">
                  1. vs. Daily Growth Standard (Day {autoCycleDay})
                </span>
                {liveDualPreview.dailyStatusLabel}
              </div>
              <div className={`rounded-xl border px-3 py-2 text-xs font-bold ${liveDualPreview.harvestBadgeClass}`}>
                <span className="block text-[10px] font-extrabold uppercase opacity-75">
                  2. vs. Final Harvest Target ({minTargetG}g–{maxTargetG}g)
                </span>
                {liveDualPreview.harvestStatusLabel}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Weighing Notes (Optional)
              </label>
              <input
                type="text"
                value={weightForm.notes}
                onChange={(e) => setWeightForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Start/Mid/End pen sample breakdown..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-800 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-900"
            >
              <Save className="h-4 w-4" />
              Save Bird Weight &amp; Uniformity
            </button>
          </form>

          {/* Weight Records Table & Dual Benchmark History */}
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm lg:col-span-7 dark:border-slate-700 dark:bg-slate-800/95">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {selectedWeightHouse?.name} — Dual-Benchmark Weighing Log
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tracks both Day-by-Day Standard Curve alignment &amp; {minTargetG}–{maxTargetG}g Catch Target progress
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200">
                Day {autoCycleDay} Std: {getExpectedWeightForDay(autoCycleDay)}g
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase dark:border-slate-700 dark:text-slate-400">
                    <th className="py-2 pr-3">Cycle Day</th>
                    <th className="py-2 pr-3">Measured</th>
                    <th className="py-2 pr-3">Uniformity</th>
                    <th className="py-2 pr-3">vs. Daily Standard</th>
                    <th className="py-2">vs. Harvest ({minTargetG}g)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {(selectedWeightHouse?.weeklyWeights || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center font-bold text-slate-500">
                        No sample weights recorded for {selectedWeightHouse?.name} yet.
                      </td>
                    </tr>
                  ) : (
                    [...(selectedWeightHouse?.weeklyWeights || [])]
                      .reverse()
                      .map((w, idx) => {
                        const evalBench = evaluateDualWeightBenchmarks(
                          w.avgGrams,
                          w.day,
                          minTargetG,
                          maxTargetG
                        );
                        return (
                          <tr key={`${w.day}-${idx}`} className="align-middle">
                            <td className="py-3 pr-3 font-black text-slate-900 dark:text-white">
                              Day {w.day}
                              <span className="block text-[10px] font-medium text-slate-500">
                                {w.recordedAt || `Week ${w.week}`} • n={w.sampleSize || 50}
                              </span>
                            </td>
                            <td className="py-3 pr-3 text-sm font-black text-emerald-800 dark:text-emerald-400">
                              {w.avgGrams}g
                            </td>
                            <td className="py-3 pr-3 font-extrabold text-slate-800 dark:text-slate-200">
                              {w.uniformityPct ?? 85}%
                            </td>
                            <td className="py-3 pr-3">
                              <span
                                className={`inline-block rounded-lg border px-2 py-1 text-[11px] font-bold ${evalBench.dailyBadgeClass}`}
                              >
                                {evalBench.dailyDiffG >= 0 ? '+' : ''}
                                {evalBench.dailyDiffG}g vs {evalBench.dailyStdG}g
                              </span>
                            </td>
                            <td className="py-3">
                              <span
                                className={`inline-block rounded-lg border px-2 py-1 text-[11px] font-bold ${evalBench.harvestBadgeClass}`}
                              >
                                {evalBench.harvestPct}% of {minTargetG}g
                              </span>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: AUTOMATED END-OF-CYCLE REPORT */}
      {subTab === 'eoc' && eocHouse && eocFinancialSummary && (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-3 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-800/95">
            <div className="flex flex-wrap items-center gap-3">
              <Building2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              <select
                value={eocHouse.id}
                onChange={(e) => setEocHouseId(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-black text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              >
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} — Cycle #{h.cycleNumber} ({h.phase === 'cleaning' ? 'Harvested / Cleaning' : `Day ${h.cycleDay}`})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-slate-800 dark:bg-emerald-700"
            >
              <Printer className="h-4 w-4" />
              Print Cycle Statement
            </button>
          </div>

          {/* 4 End-of-Cycle Financial & Livability KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/95">
              <p className="text-[11px] font-extrabold text-slate-500 uppercase dark:text-slate-400">
                Birds Placed &rarr; Harvested/Live
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                {eocFinancialSummary.harvestedOrActiveBirds.toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Placed: {eocFinancialSummary.inv.initialChicks.toLocaleString()} • Loss: {eocFinancialSummary.inv.mortalityPct}%
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40">
              <p className="text-[11px] font-extrabold text-emerald-900 uppercase dark:text-emerald-300">
                Est. Gross Catch Payout
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-950 dark:text-white">
                AED {eocFinancialSummary.estimatedGrossRevenueAed.toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                {eocFinancialSummary.estimatedCatchKg.toLocaleString()} kg @ AED {payoutPerKg}/kg
              </p>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/40">
              <p className="text-[11px] font-extrabold text-amber-900 uppercase dark:text-amber-300">
                Allocated Bills + Harvest Bonuses
              </p>
              <p className="mt-1 text-2xl font-black text-amber-950 dark:text-white">
                AED {eocFinancialSummary.totalAllocatedSpendAed.toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Paid Bills: AED {Math.round(eocFinancialSummary.totalPaidBillsAed).toLocaleString()} • Bonus: AED {eocFinancialSummary.totalHarvestBonusAed.toLocaleString()}
              </p>
            </div>

            <div className="rounded-3xl border border-sky-200 bg-sky-50/90 p-4 shadow-sm dark:border-sky-800 dark:bg-sky-950/40">
              <p className="text-[11px] font-extrabold text-sky-900 uppercase dark:text-sky-300">
                Net House Cycle Balance
              </p>
              <p className="mt-1 text-2xl font-black text-sky-950 dark:text-white">
                AED {eocFinancialSummary.netCycleMarginAed.toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-sky-800 dark:text-sky-300">
                Avg Weight Basis: {eocFinancialSummary.latestWeight}g
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Harvesting Labor Headcounts & Bonuses Card */}
            <form
              onSubmit={handleSaveHarvestLabor}
              className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm lg:col-span-5 dark:border-slate-700 dark:bg-slate-800/95"
            >
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Harvesting Crew Headcount &amp; Bonuses
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Captures end-of-cycle catching team size &amp; bonuses directly into this house&apos;s financial statement (full payroll stays in Phase 2).
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Catch Workers Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={harvestLaborForm.workerHeadcount}
                    onChange={(e) =>
                      setHarvestLaborForm((p) => ({ ...p, workerHeadcount: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Bonus / Worker (AED)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={harvestLaborForm.bonusPerWorkerAed}
                    onChange={(e) =>
                      setHarvestLaborForm((p) => ({ ...p, bonusPerWorkerAed: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-3 text-xs font-black text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
                Total Catch Bonus Payout: AED{' '}
                {(
                  Number(harvestLaborForm.workerHeadcount || 0) *
                  Number(harvestLaborForm.bonusPerWorkerAed || 0)
                ).toLocaleString()}
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Catch Crew Notes
                </label>
                <input
                  type="text"
                  value={harvestLaborForm.notes}
                  onChange={(e) => setHarvestLaborForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Shift team performance, DOA count, overtime note..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-800 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-900"
              >
                <Save className="h-4 w-4" />
                Save Harvesting Bonus to Cycle Report
              </button>
            </form>

            {/* Rolled-Up Orders & Bills Table */}
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm lg:col-span-7 dark:border-slate-700 dark:bg-slate-800/95">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Orders &amp; Bills Rolled Into {eocHouse.name} (Cycle #{eocHouse.cycleNumber})
              </h3>
              <div className="space-y-2">
                {eocFinancialSummary.billRows.length === 0 ? (
                  <p className="py-6 text-center text-xs font-bold text-slate-500">
                    No Orders &amp; Bills assigned specifically to {eocHouse.name}.
                  </p>
                ) : (
                  eocFinancialSummary.billRows.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs dark:border-slate-700 dark:bg-slate-900/60"
                    >
                      <div>
                        <p className="font-black text-slate-900 dark:text-white">
                          {bill.orderCode} • {bill.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {bill.category} • {bill.supplierName} •{' '}
                          {(bill.assignedHouseIds || []).includes('ALL')
                            ? 'Farm-Wide Share'
                            : `${bill.assignedHouseIds.length} House Share`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900 dark:text-white">
                          AED {Math.round(bill.allocatedAed).toLocaleString()}
                        </p>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                            bill.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {bill.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: 3 AUDIENCE-SPECIFIC WHATSAPP TEMPLATES */}
      {subTab === 'whatsapp' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm lg:col-span-5 dark:border-slate-700 dark:bg-slate-800/95">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Select Audience Report Template
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Each template filters sensitive data automatically so external vets &amp; suppliers never see farm bills or financial margins.
            </p>

            <div className="space-y-2.5">
              {[
                {
                  id: 'vet',
                  title: '1. Veterinarian ("Doctor") Report',
                  desc: 'Live birds, mortalities, culls, sample weights & health notes (ZERO Financials)',
                  icon: Stethoscope,
                  badge: 'Clinical Only',
                },
                {
                  id: 'supplier',
                  title: '2. Supplier Report (Alain Farms)',
                  desc: 'Bird weights, Uniformity % & general health status (STRICTLY hides costs & bills)',
                  icon: Truck,
                  badge: 'Zero Cost Data',
                },
                {
                  id: 'internal',
                  title: '3. Internal Management Brief',
                  desc: 'Full operational KPIs, Paid/Pending Orders & End-of-Cycle financials',
                  icon: DollarSign,
                  badge: 'Owner & Manager',
                },
              ].map((tpl) => {
                const Icon = tpl.icon;
                const active = templateAudience === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setTemplateAudience(tpl.id)}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                      active
                        ? 'border-emerald-700 bg-emerald-50 ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/50'
                        : 'border-slate-200 bg-slate-50/70 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <p className="text-sm font-black text-slate-900 dark:text-white">{tpl.title}</p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-emerald-900 dark:bg-slate-800 dark:text-emerald-300">
                          {tpl.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{tpl.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Recipient WhatsApp Number ({defaultRecipient.name})
              </label>
              <input
                type="text"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                placeholder={`Default: ${defaultRecipient.phone}`}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm lg:col-span-7 dark:border-slate-700 dark:bg-slate-800/95">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                WhatsApp Message Preview ({templateAudience.toUpperCase()})
              </h3>
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${
                  templateAudience === 'internal'
                    ? 'bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-200'
                    : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200'
                }`}
              >
                {templateAudience === 'internal'
                  ? 'Includes Paid/Pending Financials'
                  : 'Privacy Verified: Zero AED / Cost Figures'}
              </span>
            </div>

            <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-200">
              {activeMessageText}
            </pre>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppSend}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-700 px-6 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-800"
              >
                <MessageCircle className="h-4 w-4" />
                Send {templateAudience === 'vet' ? 'Doctor' : templateAudience === 'supplier' ? 'Alain Farms' : 'Management'} Report on WhatsApp
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <button
                type="button"
                onClick={handleCopyMessage}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-xs font-extrabold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                <Copy className="h-4 w-4" />
                Copy Text
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
