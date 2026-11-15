import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BadgeCheck,
  BellRing,
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  History,
  Lock,
  Mail,
  MessageCircle,
  Plus,
  Save,
  Scale,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  calculateHouseInventory,
  evaluateHouseEnvironmentStatus,
} from '../mockData.js';
import { useFarm } from '../App.jsx';

const TABS = [
  { id: 'contracts', label: 'Alain Farms Contracts & Payouts', icon: FileSpreadsheet },
  { id: 'weights', label: 'Manager Weekly Bird Weights', icon: Scale },
  { id: 'reports', label: 'WhatsApp & Email EOD Reports', icon: MessageCircle },
];

const PAYMENT_STATUS_STYLES = {
  Settled:
    'border-emerald-200 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  Invoiced:
    'border-sky-200 bg-sky-100 text-sky-900 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
  Pending:
    'border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
};

function sanitizeWhatsAppDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function formatDateTimeShort(isoStr) {
  if (!isoStr) return '—';
  const dt = new Date(isoStr);
  if (Number.isNaN(dt.getTime())) return String(isoStr);
  return dt.toLocaleString('en-AE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function evaluateWeightAgainstBenchmark(avgGrams, cycleDay, minG = 1350, maxG = 1550) {
  const grams = Number(avgGrams || 0);
  const day = Number(cycleDay || 1);
  if (!grams || grams <= 0) {
    return {
      code: 'EMPTY',
      label: 'Enter avg weight (g)',
      sublabel: `Alain Farms harvest target: ${minG}–${maxG}g`,
      badgeClass: 'border-slate-200 bg-slate-100 text-slate-700',
    };
  }

  if (grams >= minG && grams <= maxG) {
    return {
      code: 'PASS',
      label: `PASS • Within ${minG}–${maxG}g Target`,
      sublabel: 'Meets Alain Farms Grade-A catch weight specification',
      badgeClass:
        'border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    };
  }

  if (grams > maxG) {
    const over = grams - maxG;
    return {
      code: 'OVER',
      label: `ABOVE CAP (+${over}g over ${maxG}g)`,
      sublabel: 'Exceeds upper contract weight ceiling — schedule catch early',
      badgeClass:
        'border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    };
  }

  const gap = minG - grams;
  // Provide interim week trajectory context for Weeks 1-3 alongside harvest benchmark status
  const expectedByDay =
    day <= 7 ? 185 : day <= 14 ? 470 : day <= 21 ? 900 : day <= 28 ? 1350 : minG;
  const interimOnTrack = day < 25 && grams >= expectedByDay;

  return {
    code: 'BELOW',
    label: `BELOW HARVEST TARGET (-${gap}g under ${minG}g)`,
    sublabel:
      day < 25
        ? interimOnTrack
          ? `Growing Phase (Day ${day}): On-track vs ~${expectedByDay}g interim curve; ${gap}g to final ${minG}–${maxG}g harvest band`
          : `Growing Phase (Day ${day}): Below ~${expectedByDay}g interim curve (${gap}g to ${minG}g harvest target)`
        : `Fail vs ${minG}–${maxG}g harvest benchmark at Day ${day}`,
    badgeClass: interimOnTrack
      ? 'border-sky-300 bg-sky-100 text-sky-950 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-200'
      : 'border-red-300 bg-red-100 text-red-950 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200',
  };
}

export default function ContractsReports() {
  const {
    state,
    userRole,
    recordWeeklyBirdWeight,
    saveContractRecord,
    saveReportSchedule,
    dispatchDailyReportNow,
    notify,
  } = useFarm();

  const isAuthorized = userRole === 'owner' || userRole === 'manager';
  const [activeTab, setActiveTab] = useState('contracts');

  const houses = useMemo(
    () => (state.houses || []).filter((h) => !h.archived),
    [state.houses]
  );
  const activeHouses = useMemo(
    () => houses.filter((h) => h.isActive !== false),
    [houses]
  );
  const houseLookup = useMemo(() => {
    const map = {};
    for (const h of state.houses || []) map[h.id] = h;
    return map;
  }, [state.houses]);

  const contractRules = state.settings?.contractRules || {};
  const weightMin = Number(contractRules.targetWeightMinGrams || 1350);
  const weightMax = Number(contractRules.targetWeightMaxGrams || 1550);
  const chicksPerCarton = Number(contractRules.chicksPerCarton || 100);

  // ============================================================================
  // TAB 1 STATE: Contracts & Payout Ledger
  // ============================================================================
  const contracts = state.contracts || [];
  const [showContractForm, setShowContractForm] = useState(false);
  const [editingContractId, setEditingContractId] = useState(null);
  const [contractForm, setContractForm] = useState({
    contractCode: '',
    partnerName: 'Alain Farms — Batch 13C',
    cycleNumber: 13,
    houseIds: ['house-1'],
    totalChicksContracted: 15400,
    targetWeightMinG: weightMin,
    targetWeightMaxG: weightMax,
    agreedRatePerKgAed: Number(contractRules.payoutPerKgAed || 5.45),
    bonusFcrThreshold: Number(contractRules.bonusFcrThreshold || 1.58),
    bonusPerKgAed: 0.25,
    estimatedPayoutAed: 121700,
    settledAmountAed: 0,
    paymentStatus: 'Pending',
    startDate: new Date().toISOString().slice(0, 10),
    expectedHarvestDate: '',
    notes: '',
  });

  const contractKpis = useMemo(() => {
    const totalChicksContracted = contracts.reduce(
      (sum, c) => sum + Number(c.totalChicksContracted || 0),
      0
    );
    const activeCycleChicks = contracts
      .filter((c) => c.paymentStatus !== 'Settled')
      .reduce((sum, c) => sum + Number(c.totalChicksContracted || 0), 0);
    const activePayoutEstAed = contracts
      .filter((c) => c.paymentStatus !== 'Settled')
      .reduce((sum, c) => sum + Number(c.estimatedPayoutAed || 0), 0);
    const settledAed = contracts.reduce(
      (sum, c) =>
        sum +
        Number(
          c.paymentStatus === 'Settled'
            ? c.settledAmountAed || c.estimatedPayoutAed || 0
            : c.settledAmountAed || 0
        ),
      0
    );
    const pendingAed = contracts.reduce((sum, c) => {
      if (c.paymentStatus === 'Settled') return sum;
      return sum + Math.max(0, Number(c.estimatedPayoutAed || 0) - Number(c.settledAmountAed || 0));
    }, 0);
    return {
      totalChicksContracted,
      activeCycleChicks,
      activePayoutEstAed,
      settledAed,
      pendingAed,
    };
  }, [contracts]);

  // ============================================================================
  // TAB 2 STATE: Manager Weekly Sample Bird Weights
  // ============================================================================
  const defaultWeightHouse =
    activeHouses.find((h) => h.phase !== 'cleaning') || activeHouses[0] || houses[0];
  const [weightForm, setWeightForm] = useState({
    houseId: defaultWeightHouse?.id || 'house-1',
    cycleDay: defaultWeightHouse?.cycleDay || 14,
    sampleSize: 50,
    avgGrams: '',
    uniformityPct: 86,
  });
  const [weightHouseFilter, setWeightHouseFilter] = useState('all');

  const allWeeklyWeights = useMemo(() => {
    const rows = [];
    for (const h of houses) {
      for (const w of h.weeklyWeights || []) {
        rows.push({
          ...w,
          houseId: h.id,
          houseName: h.name,
          houseCode: h.code,
          feedSystemType: h.feedSystemType,
          cycleNumber: h.cycleNumber,
        });
      }
    }
    return rows.sort((a, b) => {
      const dateDiff = String(b.recordedAt || '').localeCompare(String(a.recordedAt || ''));
      if (dateDiff !== 0) return dateDiff;
      return Number(b.day || 0) - Number(a.day || 0);
    });
  }, [houses]);

  const filteredWeeklyWeights = useMemo(() => {
    if (weightHouseFilter === 'all') return allWeeklyWeights;
    return allWeeklyWeights.filter((r) => r.houseId === weightHouseFilter);
  }, [allWeeklyWeights, weightHouseFilter]);

  const liveWeightEval = useMemo(
    () =>
      evaluateWeightAgainstBenchmark(
        weightForm.avgGrams,
        weightForm.cycleDay,
        weightMin,
        weightMax
      ),
    [weightForm.avgGrams, weightForm.cycleDay, weightMin, weightMax]
  );

  // ============================================================================
  // TAB 3 STATE: Automated EOD WhatsApp & Email Scheduler
  // ============================================================================
  const storedSchedule = state.reportSchedule || {
    enabled: true,
    sendTime: '18:00',
    defaultChannel: 'both',
    includeIncidents: true,
    includeEnvSummary: true,
    recipients: [],
    dispatchHistory: [],
  };

  const [scheduleDraft, setScheduleDraft] = useState(() => ({
    enabled: Boolean(storedSchedule.enabled),
    sendTime: storedSchedule.sendTime || '18:00',
    defaultChannel: storedSchedule.defaultChannel || storedSchedule.channel || 'both',
    includeIncidents: Boolean(storedSchedule.includeIncidents),
    includeEnvSummary: Boolean(storedSchedule.includeEnvSummary),
    recipients: (storedSchedule.recipients || []).map((r) => ({ ...r })),
  }));
  const [isScheduleDirty, setIsScheduleDirty] = useState(false);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [newRecipient, setNewRecipient] = useState({
    name: '',
    roleTitle: '',
    phone: '+971 50 ',
    email: '',
  });
  const [whatsAppLaunchReady, setWhatsAppLaunchReady] = useState(false);

  useEffect(() => {
    if (!isScheduleDirty && state.reportSchedule) {
      setScheduleDraft({
        enabled: Boolean(state.reportSchedule.enabled),
        sendTime: state.reportSchedule.sendTime || '18:00',
        defaultChannel:
          state.reportSchedule.defaultChannel || state.reportSchedule.channel || 'both',
        includeIncidents: Boolean(state.reportSchedule.includeIncidents),
        includeEnvSummary: Boolean(state.reportSchedule.includeEnvSummary),
        recipients: (state.reportSchedule.recipients || []).map((r) => ({ ...r })),
      });
    }
  }, [state.reportSchedule, isScheduleDirty]);

  const liveReportStats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const activeProdHouses = activeHouses.filter((h) => h.phase !== 'cleaning');

    let totalLiveBirds = 0;
    let totalInitialChicks = 0;
    for (const h of activeProdHouses) {
      const inv = calculateHouseInventory(h, chicksPerCarton, state.healthLogs || []);
      totalLiveBirds += inv.activeChicks;
      totalInitialChicks += inv.initialChicks;
    }

    const latestLogs = (state.healthLogs || []).filter(
      (l) => l.date === todayStr || l.date === '2026-11-15'
    );
    const mortalitiesToday = latestLogs.reduce((sum, l) => sum + Number(l.mortalities || 0), 0);
    const cullsToday = latestLogs.reduce((sum, l) => sum + Number(l.culls || 0), 0);
    const waterGallonsToday = latestLogs.reduce(
      (sum, l) => sum + Number(l.waterGallons || 0),
      0
    );

    const openIncidents = (state.incidentNotes || []).filter((n) => !n.acknowledged);
    const activeAlerts = (state.emergencyAlerts || []).filter((a) => a.status === 'active');

    const houseLines = activeHouses.map((h) => {
      const inv = calculateHouseInventory(h, chicksPerCarton, state.healthLogs || []);
      const env = evaluateHouseEnvironmentStatus(h, state.settings);
      const co2 = h.zones?.co2Ppm ?? h.co2Ppm ?? 0;
      const negP = h.zones?.negativePressurePa ?? h.negativePressurePa ?? 0;
      if (h.phase === 'cleaning') {
        return `• H${h.code} (${h.name}): CLEANING Day ${h.cleaningDay}/${h.targetCleaningDays || 14}`;
      }
      return `• H${h.code} (D${h.cycleDay}): ${inv.activeChicks.toLocaleString()} birds | Zones ${h.zones?.start}/${h.zones?.middle}/${h.zones?.end}°C (Out ${h.zones?.outside}°C) | RH ${h.zones?.humidity}% | NH3 ${h.zones?.ammoniaPpm}ppm | CO2 ${co2}ppm | Pressure ${negP}Pa [${env.status}]`;
    });

    const lines = [
      `ALREEFI POULTRY FARM — EOD REPORT (${todayStr})`,
      `Partner: Alain Farms | Active Houses: ${activeHouses.length} (${activeProdHouses.length} Production)`,
      `Live Birds: ${totalLiveBirds.toLocaleString()} / ${totalInitialChicks.toLocaleString()} placed`,
      `Today Losses: ${mortalitiesToday} Dead, ${cullsToday} Culls | Water: ${waterGallonsToday.toLocaleString()} gal`,
      `Active Emergency Alerts: ${activeAlerts.length} | Open Incidents: ${openIncidents.length}`,
    ];

    if (scheduleDraft.includeEnvSummary && houseLines.length > 0) {
      lines.push('', '4-ZONE, CO2 & NEGATIVE PRESSURE SUMMARY:', ...houseLines);
    }

    if (scheduleDraft.includeIncidents) {
      const recentInc = (state.incidentNotes || []).slice(0, 3);
      if (recentInc.length > 0) {
        lines.push(
          '',
          'INCIDENT NOTES:',
          ...recentInc.map(
            (inc) =>
              `• [${inc.acknowledged ? 'ACK' : 'OPEN'}] H${
                houseLookup[inc.houseId]?.code || inc.houseId
              } (${inc.category}): ${inc.note}`
          )
        );
      }
    }

    return {
      totalLiveBirds,
      mortalitiesToday,
      cullsToday,
      waterGallonsToday,
      openIncidentsCount: openIncidents.length,
      activeAlertsCount: activeAlerts.length,
      compiledText: lines.join('\n'),
    };
  }, [
    activeHouses,
    chicksPerCarton,
    houseLookup,
    scheduleDraft.includeEnvSummary,
    scheduleDraft.includeIncidents,
    state.emergencyAlerts,
    state.healthLogs,
    state.incidentNotes,
    state.settings,
  ]);

  if (!isAuthorized) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-white/95 p-8 text-center shadow-sm">
        <Lock className="mx-auto mb-3 h-10 w-10 text-amber-600" />
        <h2 className="text-lg font-black text-slate-900">
          Restricted Access — Contracts &amp; Reports
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-600">
          Alain Farms contract payouts, Manager weekly bird weighing, and automated EOD WhatsApp/Email
          dispatches are accessible strictly to Farm Manager and Super Admin roles.
        </p>
      </div>
    );
  }

  // ============================================================================
  // HANDLERS: TAB 1
  // ============================================================================
  const openNewContractForm = () => {
    setEditingContractId(null);
    setContractForm({
      contractCode: `AF-2026-C13-B${contracts.length + 1}`,
      partnerName: 'Alain Farms — New Production Batch',
      cycleNumber: 13,
      houseIds: activeHouses.slice(0, 2).map((h) => h.id),
      totalChicksContracted: 30000,
      targetWeightMinG: weightMin,
      targetWeightMaxG: weightMax,
      agreedRatePerKgAed: Number(contractRules.payoutPerKgAed || 5.45),
      bonusFcrThreshold: Number(contractRules.bonusFcrThreshold || 1.58),
      bonusPerKgAed: 0.25,
      estimatedPayoutAed: 237000,
      settledAmountAed: 0,
      paymentStatus: 'Pending',
      startDate: new Date().toISOString().slice(0, 10),
      expectedHarvestDate: '',
      notes: '',
    });
    setShowContractForm(true);
  };

  const openEditContract = (ctr) => {
    setEditingContractId(ctr.id);
    setContractForm({
      contractCode: ctr.contractCode || '',
      partnerName: ctr.partnerName || '',
      cycleNumber: ctr.cycleNumber || 13,
      houseIds: [...(ctr.houseIds || [])],
      totalChicksContracted: Number(ctr.totalChicksContracted || 0),
      targetWeightMinG: Number(ctr.targetWeightMinG || weightMin),
      targetWeightMaxG: Number(ctr.targetWeightMaxG || weightMax),
      agreedRatePerKgAed: Number(ctr.agreedRatePerKgAed || 5.45),
      bonusFcrThreshold: Number(ctr.bonusFcrThreshold || 1.58),
      bonusPerKgAed: Number(ctr.bonusPerKgAed || 0.25),
      estimatedPayoutAed: Number(ctr.estimatedPayoutAed || 0),
      settledAmountAed: Number(ctr.settledAmountAed || 0),
      paymentStatus: ctr.paymentStatus || 'Pending',
      startDate: ctr.startDate || '',
      expectedHarvestDate: ctr.expectedHarvestDate || '',
      notes: ctr.notes || '',
    });
    setShowContractForm(true);
  };

  const toggleContractHouse = (houseId) => {
    setContractForm((prev) => {
      const exists = prev.houseIds.includes(houseId);
      return {
        ...prev,
        houseIds: exists
          ? prev.houseIds.filter((id) => id !== houseId)
          : [...prev.houseIds, houseId],
      };
    });
  };

  const handleAutoEstimatePayout = () => {
    const midWeightKg =
      ((Number(contractForm.targetWeightMinG || 1350) +
        Number(contractForm.targetWeightMaxG || 1550)) /
        2) /
      1000;
    const est = Math.round(
      Number(contractForm.totalChicksContracted || 0) *
        0.975 *
        midWeightKg *
        Number(contractForm.agreedRatePerKgAed || 5.45)
    );
    setContractForm((p) => ({ ...p, estimatedPayoutAed: est }));
  };

  const handleSaveContractSubmit = (e) => {
    e.preventDefault();
    if (!contractForm.contractCode.trim() || !contractForm.partnerName.trim()) {
      notify('Contract Code and Partner / Batch Name are required.', 'error');
      return;
    }
    saveContractRecord({
      ...(editingContractId ? { id: editingContractId } : {}),
      contractCode: contractForm.contractCode.trim(),
      partnerName: contractForm.partnerName.trim(),
      cycleNumber: Number(contractForm.cycleNumber || 13),
      houseIds: contractForm.houseIds,
      totalChicksContracted: Number(contractForm.totalChicksContracted || 0),
      targetWeightMinG: Number(contractForm.targetWeightMinG || 1350),
      targetWeightMaxG: Number(contractForm.targetWeightMaxG || 1550),
      agreedRatePerKgAed: Number(contractForm.agreedRatePerKgAed || 5.45),
      bonusFcrThreshold: Number(contractForm.bonusFcrThreshold || 1.58),
      bonusPerKgAed: Number(contractForm.bonusPerKgAed || 0),
      estimatedPayoutAed: Number(contractForm.estimatedPayoutAed || 0),
      settledAmountAed:
        contractForm.paymentStatus === 'Settled' && Number(contractForm.settledAmountAed || 0) === 0
          ? Number(contractForm.estimatedPayoutAed || 0)
          : Number(contractForm.settledAmountAed || 0),
      paymentStatus: contractForm.paymentStatus,
      startDate: contractForm.startDate,
      expectedHarvestDate: contractForm.expectedHarvestDate,
      notes: contractForm.notes.trim(),
    });
    setShowContractForm(false);
  };

  // ============================================================================
  // HANDLERS: TAB 2
  // ============================================================================
  const handleWeightHouseChange = (nextHouseId) => {
    const target = houseLookup[nextHouseId];
    setWeightForm((prev) => ({
      ...prev,
      houseId: nextHouseId,
      cycleDay: target?.cycleDay || prev.cycleDay || 14,
    }));
  };

  const handleRecordWeightSubmit = (e) => {
    e.preventDefault();
    if (!weightForm.houseId || !weightForm.avgGrams || Number(weightForm.avgGrams) <= 0) {
      notify('Please enter a valid sample average weight (g).', 'error');
      return;
    }
    recordWeeklyBirdWeight({
      houseId: weightForm.houseId,
      cycleDay: Number(weightForm.cycleDay || 1),
      sampleSize: Number(weightForm.sampleSize || 50),
      avgGrams: Number(weightForm.avgGrams),
      uniformityPct: Number(weightForm.uniformityPct || 85),
    });
    setWeightForm((prev) => ({ ...prev, avgGrams: '' }));
  };

  // ============================================================================
  // HANDLERS: TAB 3
  // ============================================================================
  const updateDraftField = (patch) => {
    setIsScheduleDirty(true);
    setScheduleDraft((prev) => ({ ...prev, ...patch }));
  };

  const updateRecipientField = (recId, patch) => {
    setIsScheduleDirty(true);
    setScheduleDraft((prev) => ({
      ...prev,
      recipients: prev.recipients.map((r) => (r.id === recId ? { ...r, ...patch } : r)),
    }));
  };

  const removeRecipient = (recId) => {
    setIsScheduleDirty(true);
    setScheduleDraft((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((r) => r.id !== recId),
    }));
  };

  const handleAddRecipient = (e) => {
    e.preventDefault();
    if (!newRecipient.name.trim()) {
      notify('Recipient name is required.', 'error');
      return;
    }
    setIsScheduleDirty(true);
    setScheduleDraft((prev) => ({
      ...prev,
      recipients: [
        ...prev.recipients,
        {
          id: `rec-${Date.now()}`,
          name: newRecipient.name.trim(),
          roleTitle: newRecipient.roleTitle.trim() || 'Farm Contact',
          phone: newRecipient.phone.trim(),
          email: newRecipient.email.trim(),
          enabled: true,
        },
      ],
    }));
    setNewRecipient({ name: '', roleTitle: '', phone: '+971 50 ', email: '' });
    setShowAddRecipient(false);
    notify('Recipient added — click Save Schedule to persist.', 'success');
  };

  const handleSaveSchedule = (e) => {
    if (e) e.preventDefault();
    saveReportSchedule({
      ...storedSchedule,
      ...scheduleDraft,
      channel: scheduleDraft.defaultChannel,
    });
    setIsScheduleDirty(false);
  };

  const handleSendWhatsAppNow = () => {
    if (isScheduleDirty) {
      saveReportSchedule({
        ...storedSchedule,
        ...scheduleDraft,
        channel: scheduleDraft.defaultChannel,
      });
      setIsScheduleDirty(false);
    }
    dispatchDailyReportNow('whatsapp');
    setWhatsAppLaunchReady(true);
  };

  const handleSendEmailNow = () => {
    if (isScheduleDirty) {
      saveReportSchedule({
        ...storedSchedule,
        ...scheduleDraft,
        channel: scheduleDraft.defaultChannel,
      });
      setIsScheduleDirty(false);
    }
    dispatchDailyReportNow('email');
  };

  const handleCopyPreview = async () => {
    try {
      await navigator.clipboard.writeText(liveReportStats.compiledText);
      notify('Copied EOD report summary to clipboard.', 'success');
    } catch {
      notify('Copy unavailable in this browser context.', 'warning');
    }
  };

  const enabledWhatsAppRecipients = scheduleDraft.recipients.filter(
    (r) => r.enabled && sanitizeWhatsAppDigits(r.phone).length >= 7
  );
  const enabledEmailRecipients = scheduleDraft.recipients.filter(
    (r) => r.enabled && String(r.email || '').includes('@')
  );

  return (
    <div className="space-y-6">
      {/* Header & 3-Tab Switcher */}
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-800 text-white shadow-sm">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Alain Farms Contracts, Weekly Weights &amp; Daily Reports
              </h2>
              <p className="text-xs font-medium text-slate-600">
                Contract payout ledger, Manager-only weekly bird sampling ({weightMin}–{weightMax}g target), and automated 18:00 WhatsApp/Email dispatches
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-900">
            <BadgeCheck className="h-3.5 w-3.5 text-emerald-700" />
            Management Access ({userRole === 'owner' ? 'Super Admin' : 'Farm Manager'})
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold transition ${
                  active
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

      {/* ========================================================================
          TAB 1: Alain Farms Contracts & Payout Ledger
         ======================================================================== */}
      {activeTab === 'contracts' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
              <span className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                Total Chicks Contracted
              </span>
              <p className="mt-1.5 text-2xl font-black text-slate-900">
                {contractKpis.totalChicksContracted.toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-emerald-700">
                Active Cycle 13: {contractKpis.activeCycleChicks.toLocaleString()} chicks
              </p>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 shadow-sm">
              <span className="text-[11px] font-bold tracking-wide text-sky-900 uppercase">
                Active Payout Est.
              </span>
              <p className="mt-1.5 text-2xl font-black text-sky-950">
                AED {contractKpis.activePayoutEstAed.toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-sky-800">
                Target {weightMin}–{weightMax}g @ AED {contractRules.payoutPerKgAed || 5.45}/kg
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
              <span className="text-[11px] font-bold tracking-wide text-emerald-900 uppercase">
                Settled AED
              </span>
              <p className="mt-1.5 text-2xl font-black text-emerald-950">
                AED {contractKpis.settledAed.toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-emerald-800">
                Completed Alain Farms settlements
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
              <span className="text-[11px] font-bold tracking-wide text-amber-900 uppercase">
                Pending / Invoiced AED
              </span>
              <p className="mt-1.5 text-2xl font-black text-amber-950">
                AED {contractKpis.pendingAed.toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-amber-800">
                Awaiting final catch &amp; settlement
              </p>
            </div>
          </div>

          {/* Add / Update Contract Drawer */}
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Alain Farms Contract Ledger ({contracts.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Track batch weights, FCR bonus thresholds, AED/kg rates, and settlement progress
                </p>
              </div>
              <button
                type="button"
                onClick={() => (showContractForm ? setShowContractForm(false) : openNewContractForm())}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-900"
              >
                {showContractForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showContractForm ? 'Close Form' : '+ Add / Update Contract'}
              </button>
            </div>

            {showContractForm && (
              <form
                onSubmit={handleSaveContractSubmit}
                className="mt-4 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900">
                    {editingContractId ? 'Update Contract Record' : 'New Alain Farms Contract Record'}
                  </h4>
                  <button
                    type="button"
                    onClick={handleAutoEstimatePayout}
                    className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-[11px] font-extrabold text-emerald-900 hover:bg-emerald-100"
                  >
                    Auto-Estimate Payout (AED)
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Contract Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={contractForm.contractCode}
                      onChange={(e) =>
                        setContractForm((p) => ({ ...p, contractCode: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Partner / Batch Description *
                    </label>
                    <input
                      type="text"
                      required
                      value={contractForm.partnerName}
                      onChange={(e) =>
                        setContractForm((p) => ({ ...p, partnerName: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Cycle Number
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={contractForm.cycleNumber}
                      onChange={(e) =>
                        setContractForm((p) => ({ ...p, cycleNumber: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Chicks Contracted
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={contractForm.totalChicksContracted}
                      onChange={(e) =>
                        setContractForm((p) => ({ ...p, totalChicksContracted: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Target Min Weight (g)
                    </label>
                    <input
                      type="number"
                      min="500"
                      value={contractForm.targetWeightMinG}
                      onChange={(e) =>
                        setContractForm((p) => ({ ...p, targetWeightMinG: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Target Max Weight (g)
                    </label>
                    <input
                      type="number"
                      min="500"
                      value={contractForm.targetWeightMaxG}
                      onChange={(e) =>
                        setContractForm((p) => ({ ...p, targetWeightMaxG: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Agreed Rate (AED / kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={contractForm.agreedRatePerKgAed}
                      onChange={(e) =>
                        setContractForm((p) => ({ ...p, agreedRatePerKgAed: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      FCR Bonus Threshold (&le;)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={contractForm.bonusFcrThreshold}
                      onChange={(e) =>
                        setContractForm((p) => ({ ...p, bonusFcrThreshold: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      FCR Bonus (AED / kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={contractForm.bonusPerKgAed}
                      onChange={(e) =>
                        setContractForm((p) => ({ ...p, bonusPerKgAed: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Estimated Payout (AED)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={contractForm.estimatedPayoutAed}
                      onChange={(e) =>
                        setContractForm((p) => ({ ...p, estimatedPayoutAed: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Payment Status
                    </label>
                    <select
                      value={contractForm.paymentStatus}
                      onChange={(e) =>
                        setContractForm((p) => ({ ...p, paymentStatus: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Invoiced">Invoiced</option>
                      <option value="Settled">Settled</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Settled Amount (AED)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={contractForm.settledAmountAed}
                      onChange={(e) =>
                        setContractForm((p) => ({ ...p, settledAmountAed: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={contractForm.startDate}
                      onChange={(e) =>
                        setContractForm((p) => ({ ...p, startDate: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Expected Harvest Date
                    </label>
                    <input
                      type="date"
                      value={contractForm.expectedHarvestDate}
                      onChange={(e) =>
                        setContractForm((p) => ({ ...p, expectedHarvestDate: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">Notes</label>
                    <input
                      type="text"
                      value={contractForm.notes}
                      onChange={(e) => setContractForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Settlement or catch notes..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Covered Broiler Houses
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {houses.map((h) => {
                      const selected = contractForm.houseIds.includes(h.id);
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => toggleContractHouse(h.id)}
                          className={`rounded-full border px-3 py-1 text-xs font-extrabold transition ${
                            selected
                              ? 'border-emerald-700 bg-emerald-800 text-white'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {h.name} ({h.code})
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowContractForm(false)}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-900"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {editingContractId ? 'Update Contract' : 'Save Contract'}
                  </button>
                </div>
              </form>
            )}

            {/* Contract Cards Grid */}
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {contracts.map((ctr) => (
                <article
                  key={ctr.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-300"
                >
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-slate-900 px-2.5 py-0.5 text-xs font-black text-white">
                            {ctr.contractCode}
                          </span>
                          <span className="rounded-lg bg-slate-200 px-2 py-0.5 text-[11px] font-extrabold text-slate-700">
                            Cycle {ctr.cycleNumber}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${
                              PAYMENT_STATUS_STYLES[ctr.paymentStatus] || PAYMENT_STATUS_STYLES.Pending
                            }`}
                          >
                            {ctr.paymentStatus}
                          </span>
                        </div>
                        <h4 className="mt-2 text-sm font-black text-slate-900">
                          {ctr.partnerName}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => openEditContract(ctr)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">
                          Chicks Placed
                        </span>
                        <span className="text-sm font-black text-slate-900">
                          {Number(ctr.totalChicksContracted || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">
                          Target Weight
                        </span>
                        <span className="text-sm font-black text-emerald-800">
                          {ctr.targetWeightMinG}–{ctr.targetWeightMaxG}g
                        </span>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">
                          Agreed Rate
                        </span>
                        <span className="text-sm font-black text-slate-900">
                          AED {Number(ctr.agreedRatePerKgAed || 0).toFixed(2)}/kg
                        </span>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">
                          FCR Bonus
                        </span>
                        <span className="text-xs font-black text-amber-800">
                          &le;{ctr.bonusFcrThreshold} (+{Number(ctr.bonusPerKgAed || 0).toFixed(2)}/kg)
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div>
                        <span className="text-[11px] font-bold text-slate-500">Est. Payout: </span>
                        <span className="text-sm font-black text-slate-900">
                          AED {Number(ctr.estimatedPayoutAed || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-500">Settled: </span>
                        <span className="text-sm font-black text-emerald-800">
                          AED {Number(ctr.settledAmountAed || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {(ctr.houseIds || []).map((hid) => (
                        <span
                          key={hid}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-900"
                        >
                          {houseLookup[hid]?.name || hid}
                        </span>
                      ))}
                      <span className="ml-auto text-[11px] font-semibold text-slate-500">
                        {ctr.startDate} → {ctr.expectedHarvestDate || 'TBD'}
                      </span>
                    </div>
                  </div>

                  {ctr.notes && (
                    <p className="mt-2.5 border-t border-slate-200 pt-2 text-xs font-medium text-slate-600">
                      {ctr.notes}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          TAB 2: Manager Weekly Sample Bird Weights
         ======================================================================== */}
      {activeTab === 'weights' && (
        <div className="space-y-6">
          {/* Weighing Form + Live Benchmark Comparison */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <form
              onSubmit={handleRecordWeightSubmit}
              className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm lg:col-span-5"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-white">
                  <Scale className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Record Weekly Sample Bird Weight
                  </h3>
                  <p className="text-xs text-slate-500">
                    Management-only weighing log (removed from Worker daily screen)
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Broiler House
                  </label>
                  <select
                    value={weightForm.houseId}
                    onChange={(e) => handleWeightHouseChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold"
                  >
                    {houses.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.code}) — {h.phase === 'cleaning' ? 'Cleaning' : `Day ${h.cycleDay}`} (
                        {h.feedSystemType === 'silo' ? 'Silo' : 'Bags'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Cycle Day (Week {Math.ceil(Math.max(1, Number(weightForm.cycleDay || 1)) / 7)})
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      required
                      value={weightForm.cycleDay}
                      onChange={(e) =>
                        setWeightForm((p) => ({ ...p, cycleDay: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Sample Size (Birds)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="500"
                      required
                      value={weightForm.sampleSize}
                      onChange={(e) =>
                        setWeightForm((p) => ({ ...p, sampleSize: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Avg Weight (grams) *
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="4000"
                      required
                      placeholder="e.g. 1465"
                      value={weightForm.avgGrams}
                      onChange={(e) =>
                        setWeightForm((p) => ({ ...p, avgGrams: e.target.value }))
                      }
                      className="w-full rounded-xl border-2 border-emerald-600 px-3 py-2 text-sm font-black"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Uniformity (%)
                    </label>
                    <input
                      type="number"
                      min="40"
                      max="100"
                      required
                      value={weightForm.uniformityPct}
                      onChange={(e) =>
                        setWeightForm((p) => ({ ...p, uniformityPct: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                    />
                  </div>
                </div>

                {/* Live Alain Farms 1350-1550g Benchmark Comparison Badge */}
                <div className={`rounded-2xl border p-3.5 ${liveWeightEval.badgeClass}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase">
                      Alain Farms {weightMin}–{weightMax}g Check
                    </span>
                    <Award className="h-4 w-4 shrink-0" />
                  </div>
                  <p className="mt-1 text-sm font-black">{liveWeightEval.label}</p>
                  <p className="mt-0.5 text-[11px] font-semibold opacity-90">
                    {liveWeightEval.sublabel}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-800 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-900 active:scale-[0.99]"
              >
                <CheckCircle2 className="h-4 w-4" />
                Save Weekly Sample Weight
              </button>
            </form>

            {/* Per-House Latest Weight Cards + Same-Age Comparison */}
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Latest Flock Sample Snapshot by House
                  </h3>
                  <p className="text-xs text-slate-500">
                    Benchmark target: {weightMin}g – {weightMax}g catch weight • Target uniformity &ge; 80%
                  </p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-900">
                  {allWeeklyWeights.length} Total Samples Recorded
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {houses.map((h) => {
                  const latest = (h.weeklyWeights || [])[
                    (h.weeklyWeights || []).length - 1
                  ];
                  const evalLatest = latest
                    ? evaluateWeightAgainstBenchmark(
                        latest.avgGrams,
                        latest.day,
                        weightMin,
                        weightMax
                      )
                    : null;
                  return (
                    <div
                      key={h.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-black text-slate-900">
                            {h.name} ({h.code})
                          </p>
                          <p className="text-[11px] font-semibold text-slate-500">
                            {h.feedSystemType === 'silo' ? 'Silo (20T)' : 'Bags (50kg)'} •{' '}
                            {h.isActive === false ? 'Offline' : `Cycle D${h.cycleDay}`}
                          </p>
                        </div>
                        {latest ? (
                          <span className="text-lg font-black text-emerald-800">
                            {latest.avgGrams}g
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">No data</span>
                        )}
                      </div>

                      {latest && evalLatest && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                            <span>
                              Week {latest.week} (Day {latest.day}) • n={latest.sampleSize}
                            </span>
                            <span>Uniformity: {latest.uniformityPct}%</span>
                          </div>
                          <span
                            className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold ${evalLatest.badgeClass}`}
                          >
                            {evalLatest.label}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Full Historical Weekly Weight Table Across All Houses */}
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Historical Weekly Bird Weights Across All Houses
                </h3>
                <p className="text-xs text-slate-500">
                  Complete audit trail of weekly sample weights compared against the {weightMin}–{weightMax}g Alain Farms benchmark
                </p>
              </div>
              <select
                value={weightHouseFilter}
                onChange={(e) => setWeightHouseFilter(e.target.value)}
                className="rounded-full border border-slate-300 bg-slate-50 px-4 py-1.5 text-xs font-extrabold text-slate-800"
              >
                <option value="all">All Houses ({allWeeklyWeights.length})</option>
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-extrabold tracking-wide text-slate-500 uppercase">
                    <th className="py-3 pr-3 pl-2">House</th>
                    <th className="px-3 py-3">Week / Day</th>
                    <th className="px-3 py-3">Sample Size</th>
                    <th className="px-3 py-3">Avg Weight</th>
                    <th className="px-3 py-3">Uniformity</th>
                    <th className="px-3 py-3">vs {weightMin}–{weightMax}g Target</th>
                    <th className="py-3 pr-2 pl-3 text-right">Recorded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWeeklyWeights.map((row, idx) => {
                    const evalRow = evaluateWeightAgainstBenchmark(
                      row.avgGrams,
                      row.day,
                      weightMin,
                      weightMax
                    );
                    return (
                      <tr key={`${row.houseId}-${row.day}-${idx}`} className="hover:bg-slate-50">
                        <td className="py-3 pr-3 pl-2">
                          <span className="font-extrabold text-slate-900 text-xs">
                            {row.houseName}
                          </span>
                          <span className="ml-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                            H{row.houseCode} • {row.feedSystemType === 'silo' ? 'Silo' : 'Bags'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs font-bold text-slate-800">
                          Week {row.week} • Day {row.day}
                        </td>
                        <td className="px-3 py-3 text-xs font-semibold text-slate-700">
                          {row.sampleSize || 50} birds
                        </td>
                        <td className="px-3 py-3 text-sm font-black text-slate-900">
                          {row.avgGrams} g
                        </td>
                        <td className="px-3 py-3 text-xs font-extrabold text-emerald-800">
                          {row.uniformityPct ?? 85}%
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold ${evalRow.badgeClass}`}
                          >
                            {evalRow.label}
                          </span>
                        </td>
                        <td className="py-3 pr-2 pl-3 text-right text-[11px] font-semibold text-slate-500">
                          <div>{row.recordedAt || '—'}</div>
                          <div>{row.recordedBy || 'Farm Manager'}</div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredWeeklyWeights.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs font-semibold text-slate-500">
                        No sample weights recorded for this house yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          TAB 3: Automated End-of-Day WhatsApp & Email Report Scheduler
         ======================================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column: Scheduler Config & Recipients */}
            <div className="space-y-6 lg:col-span-7">
              <form
                onSubmit={handleSaveSchedule}
                className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-white">
                      <BellRing className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        Automated Daily Dispatch Schedule
                      </h3>
                      <p className="text-xs text-slate-500">
                        Sends End-of-Day farm summary via WhatsApp (Primary) and/or Email
                      </p>
                    </div>
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-extrabold">
                    <input
                      type="checkbox"
                      checked={scheduleDraft.enabled}
                      onChange={(e) => updateDraftField({ enabled: e.target.checked })}
                      className="h-4 w-4 accent-emerald-700"
                    />
                    <span className={scheduleDraft.enabled ? 'text-emerald-800' : 'text-slate-500'}>
                      {scheduleDraft.enabled ? 'Auto Dispatch ENABLED' : 'Auto Dispatch PAUSED'}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Daily Send Time (UAE)
                    </label>
                    <input
                      type="time"
                      value={scheduleDraft.sendTime}
                      onChange={(e) => updateDraftField({ sendTime: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-extrabold"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Default Dispatch Channel
                    </label>
                    <select
                      value={scheduleDraft.defaultChannel}
                      onChange={(e) => updateDraftField({ defaultChannel: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-extrabold"
                    >
                      <option value="whatsapp">WhatsApp (Primary)</option>
                      <option value="email">Email</option>
                      <option value="both">Both (WhatsApp + Email)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <input
                      type="checkbox"
                      checked={scheduleDraft.includeIncidents}
                      onChange={(e) => updateDraftField({ includeIncidents: e.target.checked })}
                      className="h-4 w-4 accent-emerald-700"
                    />
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">Include Incident Notes</p>
                      <p className="text-[11px] text-slate-500">
                        Attach open anomaly &amp; equipment notes
                      </p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <input
                      type="checkbox"
                      checked={scheduleDraft.includeEnvSummary}
                      onChange={(e) => updateDraftField({ includeEnvSummary: e.target.checked })}
                      className="h-4 w-4 accent-emerald-700"
                    />
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">
                        Include 4-Zone &amp; CO₂/Pressure Summary
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Zone temps, NH₃, CO₂ (ppm), Pressure (Pa)
                      </p>
                    </div>
                  </label>
                </div>

                {/* Recipients List */}
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        Report Recipients ({scheduleDraft.recipients.filter((r) => r.enabled).length} active)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Owner, Farm Manager, and Veterinarian (Dr. Khalid Al-Nuaimi)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddRecipient((prev) => !prev)}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-900 hover:bg-emerald-100"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      + Add Recipient
                    </button>
                  </div>

                  {showAddRecipient && (
                    <div className="mt-3 grid grid-cols-1 gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3 sm:grid-cols-2">
                      <input
                        type="text"
                        placeholder="Recipient Name *"
                        value={newRecipient.name}
                        onChange={(e) =>
                          setNewRecipient((p) => ({ ...p, name: e.target.value }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold"
                      />
                      <input
                        type="text"
                        placeholder="Role (e.g. Biosecurity Vet)"
                        value={newRecipient.roleTitle}
                        onChange={(e) =>
                          setNewRecipient((p) => ({ ...p, roleTitle: e.target.value }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold"
                      />
                      <input
                        type="text"
                        placeholder="WhatsApp (+971 50 ...)"
                        value={newRecipient.phone}
                        onChange={(e) =>
                          setNewRecipient((p) => ({ ...p, phone: e.target.value }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold"
                      />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={newRecipient.email}
                        onChange={(e) =>
                          setNewRecipient((p) => ({ ...p, email: e.target.value }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold"
                      />
                      <div className="flex justify-end gap-2 sm:col-span-2">
                        <button
                          type="button"
                          onClick={() => setShowAddRecipient(false)}
                          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddRecipient}
                          className="rounded-full bg-emerald-800 px-4 py-1 text-xs font-extrabold text-white"
                        >
                          Add to List
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 space-y-2.5">
                    {scheduleDraft.recipients.map((rec) => (
                      <div
                        key={rec.id}
                        className={`rounded-2xl border p-3 transition ${
                          rec.enabled
                            ? 'border-slate-200 bg-slate-50'
                            : 'border-slate-200 bg-slate-100/70 opacity-65'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(rec.enabled)}
                              onChange={(e) =>
                                updateRecipientField(rec.id, { enabled: e.target.checked })
                              }
                              className="h-4 w-4 accent-emerald-700"
                            />
                            <div>
                              <span className="text-sm font-black text-slate-900">{rec.name}</span>
                              <span className="ml-2 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900">
                                {rec.roleTitle}
                              </span>
                            </div>
                          </label>

                          {scheduleDraft.recipients.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRecipient(rec.id)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="Remove recipient"
                              aria-label={`Remove ${rec.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <label className="mb-0.5 block text-[10px] font-bold text-slate-500 uppercase">
                              WhatsApp Phone
                            </label>
                            <input
                              type="text"
                              value={rec.phone || ''}
                              onChange={(e) =>
                                updateRecipientField(rec.id, { phone: e.target.value })
                              }
                              placeholder="+971 50 ..."
                              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold"
                            />
                          </div>
                          <div>
                            <label className="mb-0.5 block text-[10px] font-bold text-slate-500 uppercase">
                              Email Address
                            </label>
                            <input
                              type="email"
                              value={rec.email || ''}
                              onChange={(e) =>
                                updateRecipientField(rec.id, { email: e.target.value })
                              }
                              placeholder="name@alreefi.ae"
                              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
                  <span className="text-xs font-semibold text-slate-500">
                    {isScheduleDirty ? (
                      <span className="font-extrabold text-amber-700">
                        Unsaved schedule edits
                      </span>
                    ) : (
                      'All schedule changes synced'
                    )}
                  </span>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-900"
                  >
                    <Save className="h-4 w-4" />
                    Save Schedule
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Live Compiled Daily Report Preview & Instant Dispatch */}
            <div className="space-y-6 lg:col-span-5">
              <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Live Compiled Daily Report Preview
                    </h3>
                    <p className="text-xs text-slate-500">
                      Auto-calculated from active houses, shift logs &amp; incidents
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPreview}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-extrabold text-slate-700 hover:bg-slate-100"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5">
                    <span className="block text-[10px] font-bold text-emerald-900 uppercase">
                      Live Birds
                    </span>
                    <span className="text-sm font-black text-emerald-950">
                      {liveReportStats.totalLiveBirds.toLocaleString()}
                    </span>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50/70 p-2.5">
                    <span className="block text-[10px] font-bold text-red-900 uppercase">
                      Dead / Culls
                    </span>
                    <span className="text-sm font-black text-red-950">
                      {liveReportStats.mortalitiesToday} / {liveReportStats.cullsToday}
                    </span>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5">
                    <span className="block text-[10px] font-bold text-amber-900 uppercase">
                      Open Issues
                    </span>
                    <span className="text-sm font-black text-amber-950">
                      {liveReportStats.activeAlertsCount + liveReportStats.openIncidentsCount}
                    </span>
                  </div>
                </div>

                <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-900 p-4 font-mono text-[11px] leading-relaxed text-emerald-100">
                  {liveReportStats.compiledText}
                </pre>

                {/* Instant Dispatch Buttons */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleSendWhatsAppNow}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-800 active:scale-95"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Send Now via WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={handleSendEmailNow}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-4 py-2.5 text-xs font-extrabold text-sky-900 transition hover:bg-sky-100 active:scale-95"
                  >
                    <Mail className="h-4 w-4" />
                    Send Now via Email
                  </button>
                </div>

                {/* Clickable WhatsApp wa.me Launch Links */}
                <div
                  className={`rounded-2xl border p-3.5 transition ${
                    whatsAppLaunchReady
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <p className="text-[11px] font-black text-slate-900 uppercase">
                    Direct WhatsApp (`wa.me`) &amp; Email Launch Links
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    Click any enabled recipient below to open a pre-filled WhatsApp message or email draft:
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {enabledWhatsAppRecipients.map((rec) => {
                      const digits = sanitizeWhatsAppDigits(rec.phone);
                      const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(
                        liveReportStats.compiledText
                      )}`;
                      return (
                        <a
                          key={`wa-${rec.id}`}
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1 text-[11px] font-extrabold text-emerald-900 hover:bg-emerald-100"
                        >
                          <MessageCircle className="h-3 w-3 text-emerald-700" />
                          {rec.name.split(' ')[0]} ({rec.roleTitle.split(' ')[0]})
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      );
                    })}
                    {enabledEmailRecipients.length > 0 && (
                      <a
                        href={`mailto:${enabledEmailRecipients
                          .map((r) => r.email)
                          .join(',')}?subject=${encodeURIComponent(
                          'AlReefi Farm End-of-Day Report'
                        )}&body=${encodeURIComponent(liveReportStats.compiledText)}`}
                        className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-white px-3 py-1 text-[11px] font-extrabold text-sky-900 hover:bg-sky-100"
                      >
                        <Mail className="h-3 w-3 text-sky-700" />
                        Open Email Draft ({enabledEmailRecipients.length})
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dispatch Audit History Log */}
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-emerald-700" />
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Dispatch Audit History ({(storedSchedule.dispatchHistory || []).length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Log of scheduled 18:00 dispatches and manual WhatsApp / Email transmissions
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {(storedSchedule.dispatchHistory || []).length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-xs font-semibold text-slate-500">
                  No daily report dispatches recorded yet.
                </div>
              ) : (
                (storedSchedule.dispatchHistory || []).map((entry) => {
                  const ch = String(entry.channel || 'both').toLowerCase();
                  const chBadge =
                    ch === 'whatsapp'
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-900'
                      : ch === 'email'
                      ? 'border-sky-200 bg-sky-100 text-sky-900'
                      : 'border-indigo-200 bg-indigo-100 text-indigo-900';
                  return (
                    <div
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${chBadge}`}
                          >
                            {ch}
                          </span>
                          <span className="text-xs font-extrabold text-slate-900">
                            Sent to {entry.recipientCount} recipient{entry.recipientCount === 1 ? '' : 's'}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            • Triggered by {entry.triggeredBy}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-700">
                          {entry.summaryPreview}
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">
                        {formatDateTimeShort(entry.timestamp)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
