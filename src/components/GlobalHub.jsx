import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bird,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Eye,
  Flame,
  Gauge,
  HeartPulse,
  Package,
  Pill,
  Power,
  ShieldCheck,
  Skull,
  Sparkles,
  ThermometerSun,
  Users,
  Warehouse,
  Wheat,
  Wind,
  X,
} from 'lucide-react';
import {
  calculateHouseInventory,
  evaluateHouseEnvironmentStatus,
  litersToGallons,
} from '../mockData.js';
import { useFarm } from '../App.jsx';

function MiniSemiGauge({ tempC, status }) {
  const min = 18;
  const max = 45;
  const clamped = Math.min(max, Math.max(min, Number(tempC || 25)));
  const ratio = (clamped - min) / (max - min);
  const angle = -90 + ratio * 180;

  const arcColor =
    status === 'ALERT'
      ? '#dc2626'
      : status === 'ATTENTION'
      ? '#d97706'
      : '#16a34a';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 58" className="h-14 w-24">
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke={arcColor}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${Math.round(ratio * 126)} 126`}
        />
        <g transform={`translate(50,50) rotate(${angle})`}>
          <line x1="0" y1="0" x2="0" y2="-30" className="stroke-slate-800 dark:stroke-slate-200" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="0" cy="0" r="4" className="fill-slate-800 dark:fill-slate-200" />
        </g>
      </svg>
      <span className="-mt-1 text-xs font-extrabold text-slate-900 dark:text-slate-100">
        {Number(tempC).toFixed(1)}°C Avg
      </span>
    </div>
  );
}

export default function GlobalHub() {
  const {
    state,
    userRole,
    activeUser,
    activeWorker,
    visibleHouses,
    activeAlerts,
    resolveEmergencyAlert,
    acknowledgeIncidentNote,
    executeMedicationTask,
    toggleHouseActive,
    navigateTo,
    manualOverrideEnabled,
  } = useFarm();

  const currentUser = activeUser || activeWorker;
  const isManagement = userRole === 'owner' || userRole === 'manager';
  const isSupervisor = userRole === 'supervisor';
  const isOwner = userRole === 'owner';

  const [now, setNow] = useState(() => new Date());
  const [resolvingAlertId, setResolvingAlertId] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [showInactiveDrawer, setShowInactiveDrawer] = useState(false);
  const [showIncidentsDrawer, setShowIncidentsDrawer] = useState(true);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const chicksPerCarton = state.settings?.contractRules?.chicksPerCarton || 100;
  const co2WarnLimit = state.settings?.environmentLimits?.co2WarningPpm ?? 2500;
  const co2AlertLimit = state.settings?.environmentLimits?.co2AlertPpm ?? 3000;
  const negMinLimit = state.settings?.environmentLimits?.negPressureMinPa ?? 18;
  const negMaxLimit = state.settings?.environmentLimits?.negPressureMaxPa ?? 38;

  // Strict Active vs. Inactive separation (never skew live stats with inactive or archived houses)
  const activeVisibleHouses = useMemo(
    () => (visibleHouses || []).filter((h) => h.isActive !== false && !h.archived),
    [visibleHouses]
  );

  const inactiveHouses = useMemo(
    () => (state.houses || []).filter((h) => h.isActive === false && !h.archived),
    [state.houses]
  );

  const activeCultivationHouses = useMemo(
    () => activeVisibleHouses.filter((h) => h.phase !== 'cleaning'),
    [activeVisibleHouses]
  );

  const activeHouseIds = useMemo(
    () => new Set(activeVisibleHouses.map((h) => h.id)),
    [activeVisibleHouses]
  );

  // Live bird count & initial flock strictly across active cultivation houses
  const { totalActiveChicks, totalInitialChicks } = useMemo(() => {
    let activeSum = 0;
    let initialSum = 0;
    activeCultivationHouses.forEach((h) => {
      const inv = calculateHouseInventory(h, chicksPerCarton, state.healthLogs || []);
      activeSum += inv.activeChicks;
      initialSum += inv.initialChicks;
    });
    return { totalActiveChicks: activeSum, totalInitialChicks: initialSum };
  }, [activeCultivationHouses, chicksPerCarton, state.healthLogs]);

  const farmSurvivalPct =
    totalInitialChicks > 0 ? ((totalActiveChicks / totalInitialChicks) * 100).toFixed(2) : '100.00';

  // Active cycle number & flock age range across active cultivation houses
  const activeCycleNumber = useMemo(() => {
    const nums = activeCultivationHouses.map((h) => Number(h.cycleNumber || 0)).filter((n) => n > 0);
    if (nums.length > 0) return Math.max(...nums);
    const allNums = activeVisibleHouses.map((h) => Number(h.cycleNumber || 0)).filter((n) => n > 0);
    return allNums.length > 0 ? Math.max(...allNums) : 13;
  }, [activeCultivationHouses, activeVisibleHouses]);

  const flockAgeSummary = useMemo(() => {
    if (activeCultivationHouses.length === 0) return 'Sanitation / Idle';
    const days = activeCultivationHouses.map((h) => Number(h.cycleDay || 1));
    const minDay = Math.min(...days);
    const maxDay = Math.max(...days);
    const targetDays = Math.max(...activeCultivationHouses.map((h) => Number(h.targetCycleDays || 35)));
    return minDay === maxDay ? `Day ${minDay} / ${targetDays}` : `Days ${minDay}–${maxDay} / ${targetDays}`;
  }, [activeCultivationHouses]);

  // Today's mortalities & culls strictly across active houses
  const todayStr = now.toISOString().slice(0, 10);
  const { todaysLogs, effectiveLogDate } = useMemo(() => {
    const activeLogs = (state.healthLogs || []).filter((log) => activeHouseIds.has(log.houseId));
    const exactToday = activeLogs.filter((log) => log.date === todayStr);
    if (exactToday.length > 0) {
      return { todaysLogs: exactToday, effectiveLogDate: todayStr };
    }
    const latestDate = activeLogs.reduce((max, l) => (l.date && l.date > max ? l.date : max), '');
    return {
      todaysLogs: latestDate ? activeLogs.filter((l) => l.date === latestDate) : [],
      effectiveLogDate: latestDate || todayStr,
    };
  }, [state.healthLogs, activeHouseIds, todayStr]);

  const totalMortalitiesToday = todaysLogs.reduce((sum, l) => sum + Number(l.mortalities || 0), 0);
  const totalCullsToday = todaysLogs.reduce((sum, l) => sum + Number(l.culls || 0), 0);

  // Avg inside vs outside temperature strictly across active houses
  const avgInsideTemp =
    activeCultivationHouses.length > 0
      ? (
          activeCultivationHouses.reduce((sum, h) => {
            const avg =
              (Number(h.zones?.start || 0) + Number(h.zones?.middle || 0) + Number(h.zones?.end || 0)) /
              3;
            return sum + avg;
          }, 0) / activeCultivationHouses.length
        ).toFixed(1)
      : '—';

  const avgOutsideTemp =
    activeVisibleHouses.length > 0
      ? (
          activeVisibleHouses.reduce((sum, h) => sum + Number(h.zones?.outside || 42), 0) /
          activeVisibleHouses.length
        ).toFixed(1)
      : '—';

  const coolingDelta =
    avgInsideTemp !== '—' && avgOutsideTemp !== '—'
      ? (Number(avgOutsideTemp) - Number(avgInsideTemp)).toFixed(1)
      : '0.0';

  // Staff, Task Reviews, Incident Notes, Supervisor Medications & Worker Logs
  const userAccounts = state.userAccounts || [];
  const onShiftStaff = userAccounts.filter((u) => u.onShift);

  const pendingTaskReviews = (state.tasks || []).filter(
    (t) => t.status === 'Submitted' || t.status === 'Awaiting Verification'
  );

  const openIncidentNotes = (state.incidentNotes || []).filter(
    (n) => !n.acknowledged && n.status !== 'acknowledged'
  );

  // Supervisor specific feeds (scoped to supervisor's assigned active houses)
  const supervisorWorkerLogs = useMemo(() => {
    const workerNames = new Set(
      userAccounts.filter((u) => u.role === 'worker').map((u) => u.name)
    );
    return (state.healthLogs || [])
      .filter(
        (l) =>
          activeHouseIds.has(l.houseId) &&
          (workerNames.size === 0 || workerNames.has(l.loggedBy) || l.loggedByRole === 'worker')
      )
      .slice(0, 8);
  }, [state.healthLogs, activeHouseIds, userAccounts]);

  const supervisorPendingMeds = useMemo(
    () =>
      (state.medicationTasks || []).filter((m) => {
        const st = String(m.status || '').toLowerCase();
        return activeHouseIds.has(m.houseId) && st !== 'administered' && st !== 'completed';
      }),
    [state.medicationTasks, activeHouseIds]
  );

  // Task progress summary for Supervisor & Worker
  const scopedTasks = (state.tasks || []).filter((t) => {
    if (isManagement) return true;
    const targetRole = String(t.targetRole || t.assignedRole || '').toLowerCase();
    const isRoleScoped = t.assignmentScope === 'role' || !t.houseId;
    const assignedByName = Boolean(currentUser?.name && t.assignedTo === currentUser.name);

    if (isRoleScoped) {
      return targetRole === userRole || assignedByName;
    }

    if (userRole === 'worker' && targetRole && targetRole !== 'worker' && !assignedByName) {
      return false;
    }

    const assignedHouseMatch =
      activeHouseIds.has(t.houseId) || (currentUser?.assignedHouseIds || []).includes(t.houseId);
    return assignedHouseMatch || assignedByName;
  });

  const submittedOrReviewedCount = scopedTasks.filter(
    (t) => t.status === 'Submitted' || t.status === 'Reviewed' || t.status === 'Complete' || t.status === 'Awaiting Verification'
  ).length;
  const taskProgressPct =
    scopedTasks.length > 0 ? Math.round((submittedOrReviewedCount / scopedTasks.length) * 100) : 100;

  const handleConfirmResolve = (alertId) => {
    resolveEmergencyAlert(alertId, resolutionNote.trim() || 'Verified & resolved on site.');
    setResolvingAlertId(null);
    setResolutionNote('');
  };

  return (
    <div className="space-y-5">
      {/* Persistent Emergency Red Alert Banner */}
      {activeAlerts.length > 0 && (
        <section className="rounded-3xl border-2 border-red-300 bg-red-50/95 p-4 shadow-lg backdrop-blur-sm dark:border-red-800 dark:bg-red-950/60">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white shadow-md">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider text-white uppercase">
                    {activeAlerts.length} Active Emergency {activeAlerts.length === 1 ? 'Alert' : 'Alerts'}
                  </span>
                  <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                    Immediate Inspection Required
                  </span>
                </div>
                <div className="mt-2 space-y-2">
                  {activeAlerts.map((alert) => {
                    const house = (state.houses || []).find((h) => h.id === alert.houseId);
                    return (
                      <div
                        key={alert.id}
                        className="flex flex-col justify-between gap-2 rounded-2xl border border-red-200 bg-white/95 px-3.5 py-2.5 sm:flex-row sm:items-center dark:border-red-900 dark:bg-slate-900/90"
                      >
                        <div>
                          <p className="text-sm font-bold text-red-900 dark:text-red-300">
                            {house?.name || 'Farm House'} — {alert.eventType}
                          </p>
                          <p className="text-xs text-slate-700 dark:text-slate-300">{alert.details}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            Reported by {alert.reportedBy} • {new Date(alert.reportedAt).toLocaleString()}
                          </p>
                        </div>

                        {isManagement && (
                          <div className="shrink-0">
                            {resolvingAlertId === alert.id ? (
                              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                                <input
                                  type="text"
                                  value={resolutionNote}
                                  onChange={(e) => setResolutionNote(e.target.value)}
                                  placeholder="Resolution note..."
                                  className="rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs focus:border-emerald-700 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleConfirmResolve(alert.id)}
                                  className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
                                >
                                  Confirm
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setResolvingAlertId(alert.id)}
                                className="rounded-xl border border-emerald-700 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-700 hover:text-white dark:bg-emerald-950/60 dark:text-emerald-300"
                              >
                                Mark Resolved
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Owner Manual Override Banner */}
      {isOwner && manualOverrideEnabled && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50/95 px-4 py-3 text-amber-950 shadow-sm dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <ShieldCheck className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
            <span>
              Super Admin Manual Override Mode is ACTIVE — You can directly edit active bird counts, locked shift logs, cycle days, or unlock sequential cleaning steps.
            </span>
          </div>
        </div>
      )}

      {/* Pinned Live Header Bar (Management & Supervisor) */}
      {(isManagement || isSupervisor) && (
        <section className="lg:sticky lg:top-[68px] z-20 rounded-3xl border border-emerald-900/20 bg-slate-900 px-4 py-3 text-white shadow-lg dark:border-slate-700 dark:bg-slate-950/95">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {/* Current Date & Time */}
            <div className="flex items-center gap-2.5 rounded-2xl bg-slate-800/80 px-3 py-2">
              <Clock className="h-5 w-5 shrink-0 text-emerald-400" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  UAE Farm Clock
                </p>
                <p className="truncate text-xs font-black text-white">
                  {now.toLocaleTimeString('en-AE', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
                <p className="truncate text-[10px] font-medium text-slate-300">
                  {now.toLocaleDateString('en-AE', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Active Cycle */}
            <div className="flex items-center gap-2.5 rounded-2xl bg-slate-800/80 px-3 py-2">
              <CalendarClock className="h-5 w-5 shrink-0 text-sky-400" />
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Active Cycle
                </p>
                <p className="text-sm font-black text-white">Cycle {activeCycleNumber}</p>
                <p className="text-[10px] font-medium text-sky-300">
                  {activeCultivationHouses.length} Active Houses
                </p>
              </div>
            </div>

            {/* Flock Age Range / Day */}
            <div className="flex items-center gap-2.5 rounded-2xl bg-slate-800/80 px-3 py-2">
              <Activity className="h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Flock Age Range
                </p>
                <p className="text-sm font-black text-white">{flockAgeSummary}</p>
                <p className="text-[10px] font-medium text-slate-300">Active flocks only</p>
              </div>
            </div>

            {/* Live Bird Count */}
            <div className="flex items-center gap-2.5 rounded-2xl bg-slate-800/80 px-3 py-2">
              <Bird className="h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Live Bird Count
                </p>
                <p className="text-sm font-black text-emerald-300">
                  {totalActiveChicks.toLocaleString()}
                </p>
                <p className="text-[10px] font-medium text-slate-300">
                  Survival {farmSurvivalPct}%
                </p>
              </div>
            </div>

            {/* Mortalities Today */}
            <div className="flex items-center gap-2.5 rounded-2xl bg-slate-800/80 px-3 py-2">
              <Skull className="h-5 w-5 shrink-0 text-red-400" />
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Mortalities Today
                </p>
                <p className="text-sm font-black text-red-300">{totalMortalitiesToday} Dead</p>
                <p className="text-[10px] font-medium text-amber-300">
                  +{totalCullsToday} Culls ({effectiveLogDate})
                </p>
              </div>
            </div>

            {/* Avg Inside vs Outside UAE Temp Contrast */}
            <div className="flex items-center gap-2.5 rounded-2xl bg-slate-800/80 px-3 py-2">
              <ThermometerSun className="h-5 w-5 shrink-0 text-orange-400" />
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Inside vs UAE Out
                </p>
                <p className="text-sm font-black text-white">
                  {avgInsideTemp}°C <span className="text-slate-400">/</span>{' '}
                  <span className="text-red-300">{avgOutsideTemp}°C</span>
                </p>
                <p className="text-[10px] font-medium text-emerald-300">
                  -{coolingDelta}°C Cooling Δ
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Executive Summary Panel & Farm-Wide KPIs (Owner & Manager) */}
      {isManagement ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Executive Summary &amp; Daily Farm Statistics
              </h2>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Live operational metrics across {activeCultivationHouses.length} active cultivation{' '}
                {activeCultivationHouses.length === 1 ? 'house' : 'houses'} &amp;{' '}
                {activeVisibleHouses.length - activeCultivationHouses.length} cleaning{' '}
                {activeVisibleHouses.length - activeCultivationHouses.length === 1 ? 'house' : 'houses'}
                {inactiveHouses.length > 0 && ` (${inactiveHouses.length} offline excluded from totals)`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {pendingTaskReviews.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigateTo('tasks')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-900 shadow-sm transition hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200"
                >
                  <ClipboardCheck className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  {pendingTaskReviews.length} Pending Task Reviews
                </button>
              )}
              <button
                type="button"
                onClick={() => navigateTo('analytics')}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900"
              >
                <Activity className="h-4 w-4" />
                Open Analytics
              </button>
            </div>
          </div>

          {/* Consolidated Executive Summary Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <div className="rounded-3xl border border-emerald-200 bg-white/95 p-4 shadow-sm dark:border-emerald-800/60">
              <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                Farm Survival %
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {farmSurvivalPct}%
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                {totalActiveChicks.toLocaleString()} / {totalInitialChicks.toLocaleString()} placed
              </p>
            </div>

            <div className="rounded-3xl border border-sky-200 bg-white/95 p-4 shadow-sm dark:border-sky-800/60">
              <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                Overall Cooling Delta
              </p>
              <p className="mt-1 text-2xl font-black text-sky-700 dark:text-sky-400">
                -{coolingDelta}°C
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                Inside {avgInsideTemp}°C vs UAE {avgOutsideTemp}°C
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigateTo('staff')}
              className="rounded-3xl border border-slate-200 bg-white/95 p-4 text-left shadow-sm transition hover:border-emerald-400"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  On-Shift Staff
                </p>
                <Users className="h-4 w-4 text-emerald-700" />
              </div>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {onShiftStaff.length}{' '}
                <span className="text-sm font-bold text-slate-400">/ {userAccounts.length}</span>
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">
                View attendance &amp; shifts &rarr;
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('tasks')}
              className="rounded-3xl border border-amber-200 bg-white/95 p-4 text-left shadow-sm transition hover:border-amber-400 dark:border-amber-800/60"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Pending Task Reviews
                </p>
                <ClipboardCheck className="h-4 w-4 text-amber-600" />
              </div>
              <p className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-400">
                {pendingTaskReviews.length}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                Click to review submissions &rarr;
              </p>
            </button>

            <button
              type="button"
              onClick={() => setShowIncidentsDrawer((v) => !v)}
              className={`rounded-3xl border p-4 text-left shadow-sm transition ${
                openIncidentNotes.length > 0
                  ? 'border-rose-300 bg-rose-50/90 dark:border-rose-800 dark:bg-rose-950/40'
                  : 'border-slate-200 bg-white/95'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Open Incident Notes
                </p>
                <Camera className="h-4 w-4 text-rose-600" />
              </div>
              <p
                className={`mt-1 text-2xl font-black ${
                  openIncidentNotes.length > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700'
                }`}
              >
                {openIncidentNotes.length}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {openIncidentNotes.length > 0 ? 'Review photos below' : 'No open anomalies'}
              </p>
            </button>
          </div>

          {/* Open Incident Photo Notes Click-Through Queue */}
          {openIncidentNotes.length > 0 && showIncidentsDrawer && (
            <div className="rounded-3xl border border-rose-200 bg-white/95 p-4 shadow-sm dark:border-rose-900">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-rose-600" />
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Open Incident Photo Notes ({openIncidentNotes.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIncidentsDrawer(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Collapse
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {openIncidentNotes.map((item) => {
                  const incHouse = (state.houses || []).find((h) => h.id === item.houseId);
                  const photoSrc = item.photo || item.photoDataUrl || item.photoUrl || null;
                  return (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start gap-3">
                        {photoSrc ? (
                          <button
                            type="button"
                            onClick={() => setLightboxPhoto(photoSrc)}
                            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-300"
                            title="Inspect photo"
                          >
                            <img
                              src={photoSrc}
                              alt={item.category}
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition group-hover:opacity-100">
                              <Eye className="h-4 w-4 text-white" />
                            </span>
                          </button>
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400">
                            <Camera className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-800 uppercase dark:bg-rose-950 dark:text-rose-300">
                              {item.category}
                            </span>
                            <span className="text-xs font-extrabold text-slate-900">
                              {incHouse?.name || item.houseId}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-medium text-slate-700">{item.note}</p>
                          <p className="mt-1 text-[10px] font-semibold text-slate-500">
                            {item.reportedBy} •{' '}
                            {new Date(
                              item.reportedAt || item.timestamp || item.createdAt || Date.now()
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => acknowledgeIncidentNote(item.id)}
                          className="rounded-xl bg-emerald-700 px-3 py-1.5 text-[11px] font-extrabold text-white transition hover:bg-emerald-800"
                        >
                          Acknowledge
                        </button>
                        <button
                          type="button"
                          onClick={() => navigateTo('log', item.houseId)}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                        >
                          Open Log
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Classic 5-Card Farm-Wide Daily Strip */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="flex items-center justify-between rounded-3xl border border-slate-200/90 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Total Active Chicks
                </p>
                <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">
                  {totalActiveChicks.toLocaleString()}
                </p>
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  Across {activeCultivationHouses.length} live houses
                </p>
              </div>
              <div className="flex h-13 w-13 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <Bird className="h-7 w-7" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-3xl border border-slate-200/90 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Mortalities Today
                </p>
                <p className="mt-1 text-3xl font-black tracking-tight text-red-700 dark:text-red-400">
                  {totalMortalitiesToday}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Active houses ({effectiveLogDate})
                </p>
              </div>
              <div className="flex h-13 w-13 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                <Skull className="h-7 w-7" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-3xl border border-slate-200/90 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Sick / Culls Today
                </p>
                <p className="mt-1 text-3xl font-black tracking-tight text-amber-700 dark:text-amber-400">
                  {totalCullsToday}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Isolated / removed</p>
              </div>
              <div className="flex h-13 w-13 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <HeartPulse className="h-7 w-7" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-3xl border border-slate-200/90 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Inside vs. Outside
                </p>
                <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                  {avgInsideTemp}°C <span className="text-sm font-bold text-slate-400">/</span>{' '}
                  <span className="text-red-600 dark:text-red-400">{avgOutsideTemp}°C</span>
                </p>
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  -{coolingDelta}°C cooling delta
                </p>
              </div>
              <div className="flex h-13 w-13 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                <ThermometerSun className="h-7 w-7" />
              </div>
            </div>

            <div
              className={`flex items-center justify-between rounded-3xl border p-4 shadow-sm backdrop-blur-sm ${
                activeAlerts.length > 0
                  ? 'border-red-300 bg-red-50/95 dark:border-red-800 dark:bg-red-950/50'
                  : 'border-slate-200/90 bg-white/95'
              }`}
            >
              <div>
                <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Active Emergencies
                </p>
                <p
                  className={`mt-1 text-3xl font-black tracking-tight ${
                    activeAlerts.length > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700'
                  }`}
                >
                  {activeAlerts.length}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {activeAlerts.length > 0 ? 'Check red banner above' : 'All systems nominal'}
                </p>
              </div>
              <div
                className={`flex h-13 w-13 items-center justify-center rounded-full ${
                  activeAlerts.length > 0
                    ? 'bg-red-600 text-white'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
              >
                <Flame className="h-7 w-7" />
              </div>
            </div>
          </div>
        </section>
      ) : isSupervisor ? (
        /* Supervisor Mode Panel */
        <section className="space-y-4">
          <div className="rounded-3xl border border-emerald-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-800 px-3 py-1 text-xs font-extrabold text-white">
                    Supervisor: {currentUser?.name}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                    Assigned Houses: {activeVisibleHouses.map((h) => h.code || h.name).join(', ')}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                  Supervisor Shift Oversight ({activeVisibleHouses.length} Active Houses)
                </h2>
                <p className="text-xs text-slate-600">
                  Review junior worker entries, administer scheduled medication doses, and complete supervisory tasks.
                </p>
              </div>

              <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Assigned Jobs Progress</span>
                  <span className="text-emerald-800 dark:text-emerald-400">
                    {submittedOrReviewedCount} / {scopedTasks.length} ({taskProgressPct}%)
                  </span>
                </div>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-700 transition-all duration-500"
                    style={{ width: `${taskProgressPct}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    {supervisorPendingMeds.length} Pending Med Doses
                  </span>
                  <button
                    type="button"
                    onClick={() => navigateTo('tasks')}
                    className="font-bold text-emerald-800 hover:underline dark:text-emerald-400"
                  >
                    Open Task Board &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Pending Structured Medication Doses across Supervisor Houses */}
            <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <Pill className="h-4 w-4 text-emerald-700" />
                  Pending Scheduled Medication Doses ({supervisorPendingMeds.length})
                </h3>
                <button
                  type="button"
                  onClick={() => navigateTo('log', activeVisibleHouses[0]?.id)}
                  className="text-xs font-bold text-emerald-800 hover:underline dark:text-emerald-400"
                >
                  Open House Log &rarr;
                </button>
              </div>
              {supervisorPendingMeds.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-xs font-semibold text-slate-500">
                  All scheduled medication doses for your assigned houses are administered.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {supervisorPendingMeds.map((med) => {
                    const medHouse = activeVisibleHouses.find((h) => h.id === med.houseId);
                    return (
                      <div
                        key={med.id}
                        className="flex flex-col justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 sm:flex-row sm:items-center dark:border-amber-800 dark:bg-amber-950/30"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-extrabold text-amber-950">
                              {medHouse?.name || med.houseId}
                            </span>
                            <span className="text-xs font-extrabold text-slate-900">
                              {med.medicineName}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] font-semibold text-slate-700">
                            Dosage: {med.dosage} • Water Vol:{' '}
                            {Number(med.waterVolumeGallons || 0).toLocaleString()} gal •{' '}
                            {med.scheduledTime || 'Scheduled'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            executeMedicationTask(med.id, `Executed by Supervisor ${currentUser?.name || ''}`)
                          }
                          className="shrink-0 rounded-xl bg-emerald-800 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-emerald-900"
                        >
                          Mark Dose Administered
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Junior Worker Recent Shift Logs Feed */}
            <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <Users className="h-4 w-4 text-sky-700" />
                  Junior Worker Recent Shift Logs (Guidance Feed)
                </h3>
              </div>
              {supervisorWorkerLogs.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-xs font-semibold text-slate-500">
                  No recent junior worker logs for your assigned houses yet.
                </p>
              ) : (
                <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
                  {supervisorWorkerLogs.map((log) => {
                    const logHouse = activeVisibleHouses.find((h) => h.id === log.houseId);
                    const gal =
                      log.waterGallons !== undefined
                        ? Number(log.waterGallons)
                        : Math.round(litersToGallons(log.waterLiters || 0));
                    const isSiloHouse = logHouse?.feedSystemType === 'silo';
                    const bagWeight = Number(logHouse?.bagWeightKg || 50);
                    const bagsUsed =
                      log.feedBags !== undefined
                        ? Number(log.feedBags)
                        : Math.round(Number(log.feedKg || 0) / bagWeight);

                    return (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="font-extrabold text-slate-900">
                            {log.loggedBy} — {logHouse?.name || log.houseId}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {log.shift} • {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-[11px] font-bold">
                          <span className="text-red-700 dark:text-red-400">
                            Dead: {log.mortalities}
                          </span>
                          <span className="text-amber-700 dark:text-amber-400">
                            Culls: {log.culls}
                          </span>
                          <span className="text-emerald-800 dark:text-emerald-400">
                            Temp: {log.manualTempC}°C
                          </span>
                          {!isSiloHouse && (
                            <span className="text-slate-700">Feed: {bagsUsed} bags</span>
                          )}
                          <span className="text-sky-700 dark:text-sky-400">
                            Water: {gal.toLocaleString()} gal
                          </span>
                        </div>
                        {log.note && (
                          <p className="mt-1 text-[11px] italic text-slate-600">"{log.note}"</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        /* Poultry Worker Focused Top Progress Card */
        <section className="rounded-3xl border border-emerald-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                  Operator: {currentUser?.name}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {currentUser?.roleTitle || 'Poultry Worker'}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                Your Assigned Houses ({activeVisibleHouses.length}) &amp; Shift Progress
              </h2>
              <p className="text-xs text-slate-600">
                Tap any assigned house below to log incremental shift entries or complete routine jobs.
              </p>
            </div>

            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Assigned Jobs Submitted / Reviewed</span>
                <span className="text-emerald-800 dark:text-emerald-400">
                  {submittedOrReviewedCount} / {scopedTasks.length} ({taskProgressPct}%)
                </span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-700 transition-all duration-500"
                  style={{ width: `${taskProgressPct}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">
                  {scopedTasks.filter((t) => t.status === 'Assigned').length} jobs remaining
                </span>
                <button
                  type="button"
                  onClick={() => navigateTo('tasks')}
                  className="font-bold text-emerald-800 hover:underline dark:text-emerald-400"
                >
                  Open Task List &rarr;
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Horizontal Scrolling Active Broiler Houses Carousel */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Active Broiler Houses ({activeVisibleHouses.length})
            </h2>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Evaluated against age-adjusted temps, NH₃, CO₂ (&lt;{co2WarnLimit} ppm), and Negative Pressure ({negMinLimit}–{negMaxLimit} Pa)
            </p>
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={() => navigateTo('settings')}
              className="text-xs font-bold text-emerald-800 hover:underline dark:text-emerald-400"
            >
              + Add / Configure Houses in Settings
            </button>
          )}
        </div>

        <div className="carousel-scroll flex snap-x gap-4 overflow-x-auto pb-3">
          {activeVisibleHouses.map((house) => {
            const inventory = calculateHouseInventory(house, chicksPerCarton, state.healthLogs || []);
            const envEval = evaluateHouseEnvironmentStatus(house, state.settings);
            const avgInterior = (
              (Number(house.zones?.start || 0) +
                Number(house.zones?.middle || 0) +
                Number(house.zones?.end || 0)) /
              3
            ).toFixed(1);

            const isSilo = house.feedSystemType === 'silo';
            const feedBadgeLabel = isSilo
              ? `Silo-Based (${house.siloCapacityTons || 20}T)`
              : `Bag-Based (${house.bagWeightKg || 50}kg)`;

            const co2 = Number(house.zones?.co2Ppm ?? 1950);
            const negPa = Number(house.zones?.negativePressurePa ?? 25);

            const co2ColorClass =
              co2 >= co2AlertLimit
                ? 'text-red-600 dark:text-red-400'
                : co2 >= co2WarnLimit
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-700 dark:text-emerald-400';

            const negPaColorClass =
              negPa <= negMinLimit - 2 || negPa >= negMaxLimit + 4
                ? 'text-red-600 dark:text-red-400'
                : negPa < negMinLimit || negPa > negMaxLimit
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-700 dark:text-emerald-400';

            const statusBadgeStyles =
              envEval.status === 'OPTIMAL'
                ? 'bg-emerald-600 text-white'
                : envEval.status === 'ATTENTION'
                ? 'bg-amber-500 text-white'
                : envEval.status === 'ALERT'
                ? 'bg-red-600 text-white'
                : 'bg-sky-700 text-white';

            const phasePillStyles =
              house.phase === 'cleaning'
                ? 'bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-800'
                : house.cycleDay <= 10
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800'
                : house.cycleDay >= house.targetCycleDays - 7
                ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800'
                : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800';

            const houseTodaysLogs = (state.healthLogs || []).filter(
              (l) => l.houseId === house.id && l.date === effectiveLogDate
            );
            const houseSickToday = houseTodaysLogs.reduce((s, l) => s + Number(l.culls || 0), 0);
            const houseDeadToday = houseTodaysLogs.reduce((s, l) => s + Number(l.mortalities || 0), 0);

            const cleaningDoneCount = (house.cleaningSteps || []).filter(
              (s) => s.status === 'verified'
            ).length;

            return (
              <article
                key={house.id}
                className="flex min-w-[310px] max-w-[350px] shrink-0 snap-start flex-col justify-between rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-sm backdrop-blur-sm transition hover:border-emerald-400 hover:shadow-md"
              >
                <div>
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">{house.name}</h3>
                      <p className="text-xs font-medium text-slate-500">
                        {house.sector} • Cycle #{house.cycleNumber}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${phasePillStyles}`}
                    >
                      {house.phase === 'cleaning'
                        ? `Cleaning: Day ${house.cleaningDay}/${house.targetCleaningDays || 14}`
                        : house.cycleLabel || 'Cultivation'}
                    </span>
                  </div>

                  {/* Feed System & Status Pills */}
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold tracking-wide uppercase ${statusBadgeStyles}`}
                    >
                      {envEval.status === 'CLEANING' ? (
                        <Sparkles className="h-3.5 w-3.5" />
                      ) : envEval.status === 'OPTIMAL' ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                      {envEval.status}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${
                        isSilo
                          ? 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200'
                          : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
                      }`}
                    >
                      {isSilo ? <Package className="h-3 w-3" /> : <Wheat className="h-3 w-3" />}
                      {feedBadgeLabel}
                    </span>
                  </div>

                  {envEval.targetBand && (
                    <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
                      Target Band: {envEval.targetBand.targetMinC}–{envEval.targetBand.targetMaxC}°C
                    </p>
                  )}

                  <hr className="my-3 border-slate-100" />

                  {/* Body metrics + mini gauge */}
                  {house.phase === 'cleaning' ? (
                    <div className="space-y-2.5 rounded-2xl bg-sky-50/80 p-3 text-xs text-sky-950 dark:bg-sky-950/40 dark:text-sky-200">
                      <div className="flex items-center justify-between font-bold">
                        <span>Sanitation Progress</span>
                        <span>
                          {cleaningDoneCount} / {(house.cleaningSteps || []).length} Verified
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-sky-200 dark:bg-sky-900">
                        <div
                          className="h-full rounded-full bg-sky-700"
                          style={{
                            width: `${Math.round(
                              (cleaningDoneCount / Math.max(1, (house.cleaningSteps || []).length)) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-sky-800 dark:text-sky-300">
                        Standard poultry logging locked until 14-day cleaning protocol completes.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold text-slate-700">
                            Cycle Day:{' '}
                            <span className="font-extrabold text-slate-900">
                              {house.cycleDay}/{house.targetCycleDays}
                            </span>
                          </p>
                          <p className="font-semibold text-slate-700">
                            Birds:{' '}
                            <span className="font-extrabold text-emerald-800 dark:text-emerald-400">
                              {inventory.activeChicks.toLocaleString()}
                            </span>
                          </p>
                          <p className="text-xs font-semibold text-slate-600">
                            Today:{' '}
                            <span className="font-bold text-red-700 dark:text-red-400">
                              {houseDeadToday} Dead
                            </span>{' '}
                            •{' '}
                            <span className="font-bold text-amber-700 dark:text-amber-400">
                              {houseSickToday} Sick
                            </span>
                          </p>
                          <p className="text-[11px] font-semibold text-slate-500">
                            Zones: {Number(house.zones?.start).toFixed(1)}° /{' '}
                            {Number(house.zones?.middle).toFixed(1)}° /{' '}
                            {Number(house.zones?.end).toFixed(1)}°C
                          </p>
                        </div>
                        <MiniSemiGauge tempC={avgInterior} status={envEval.status} />
                      </div>

                      {/* CO2, Neg. Pressure, NH3 & Outside Telemetry Pills */}
                      <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-50 p-2 text-center text-[11px]">
                        <div>
                          <p className="font-bold text-slate-500 uppercase">CO₂</p>
                          <p className={`font-black ${co2ColorClass}`}>
                            {co2.toLocaleString()} <span className="text-[9px]">ppm</span>
                          </p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-500 uppercase">Pressure</p>
                          <p className={`font-black ${negPaColorClass}`}>
                            {negPa} <span className="text-[9px]">Pa</span>
                          </p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-500 uppercase">NH₃ / Out</p>
                          <p className="font-black text-slate-800">
                            {house.zones?.ammoniaPpm} /{' '}
                            <span className="text-red-600 dark:text-red-400">
                              {house.zones?.outside}°
                            </span>
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="mt-4 flex items-center gap-2 pt-1">
                  {isManagement ? (
                    <>
                      <button
                        type="button"
                        onClick={() => navigateTo('house', house.id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-800 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900"
                      >
                        <Warehouse className="h-4 w-4" />
                        Control Panel
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      {house.phase !== 'cleaning' && (
                        <button
                          type="button"
                          onClick={() => navigateTo('log', house.id)}
                          className="rounded-2xl border-2 border-emerald-700 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-900 transition hover:bg-emerald-700 hover:text-white dark:bg-emerald-950/60 dark:text-emerald-300"
                        >
                          + Log
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          navigateTo(house.phase === 'cleaning' ? 'tasks' : 'log', house.id)
                        }
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-800 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        {house.phase === 'cleaning' ? 'House Tasks' : 'Daily Log & Meds'}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateTo('tasks', house.id)}
                        className="rounded-2xl border-2 border-emerald-700 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-900 transition hover:bg-emerald-700 hover:text-white dark:bg-emerald-950/60 dark:text-emerald-300"
                      >
                        Tasks
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Collapsible Inactive / Offline Houses Strip (Owner & Manager) */}
      {isManagement && inactiveHouses.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          <button
            type="button"
            onClick={() => setShowInactiveDrawer((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
                <Power className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Inactive / Offline Houses ({inactiveHouses.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Historical logs preserved — excluded from live bird totals, mortalities, and temperature averages
                </p>
              </div>
            </div>
            {showInactiveDrawer ? (
              <ChevronUp className="h-5 w-5 text-slate-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-500" />
            )}
          </button>

          {showInactiveDrawer && (
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 md:grid-cols-2 lg:grid-cols-3">
              {inactiveHouses.map((h) => {
                const isSilo = h.feedSystemType === 'silo';
                return (
                  <div
                    key={h.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900">{h.name}</h4>
                        <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-[10px] font-extrabold text-white uppercase">
                          INACTIVE
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {h.sector} • Code {h.code || '—'} •{' '}
                        {isSilo
                          ? `Silo-Based (${h.siloCapacityTons || 20}T)`
                          : `Bag-Based (${h.bagWeightKg || 50}kg)`}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-600">
                        Last Cycle #{h.cycleNumber} • Offline for maintenance / rest
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigateTo('house', h.id)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                      >
                        Inspect History
                      </button>
                      {isOwner ? (
                        <button
                          type="button"
                          onClick={() => toggleHouseActive(h.id)}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-800"
                        >
                          <Power className="h-3.5 w-3.5" />
                          Reactivate House
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400">
                          Super Admin Only to Reactivate
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
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
              className="absolute top-3 right-3 rounded-full bg-slate-900/80 p-1.5 text-white hover:bg-slate-900"
              aria-label="Close photo preview"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={lightboxPhoto}
              alt="Incident photo attachment"
              className="max-h-[75vh] w-auto rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
