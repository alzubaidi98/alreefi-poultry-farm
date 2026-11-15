import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BatteryFull,
  Building2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  FileSpreadsheet,
  Languages,
  LayoutDashboard,
  Lock,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  Play,
  RotateCw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Signal,
  Sprout,
  Stethoscope,
  Sun,
  Tablet,
  UserCheck,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import {
  DEFAULT_CLEANING_STEPS,
  LOCALIZATION_DICTIONARY,
  TASK_CATEGORY_PREFIXES,
  calculateHouseInventory,
  createInitialFarmState,
  deriveWorkerProfiles,
  gallonsToLiters,
  generateNextJobNumber,
  litersToGallons,
} from './mockData.js';
import storageService, { UnraidServerAdapter } from './services/storageService.js';
import GlobalHub from './components/GlobalHub.jsx';
import PoultryDashboard from './components/PoultryDashboard.jsx';
import HealthResourceLog from './components/HealthResourceLog.jsx';
import TaskVerification from './components/TaskVerification.jsx';
import EmergencyModal from './components/EmergencyModal.jsx';
import Analytics from './components/Analytics.jsx';
import CropDashboard from './components/CropDashboard.jsx';
import StorageSettings from './components/StorageSettings.jsx';
import StaffAttendance from './components/StaffAttendance.jsx';
import ContractsReports from './components/ContractsReports.jsx';

const FarmContext = createContext(null);
const THEME_STORAGE_KEY = 'alreefi_theme_mode';

export function useFarm() {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error('useFarm must be used inside FarmProvider');
  return ctx;
}

function getSystemPrefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function ThemeTogglePill({ themeMode, setThemeMode }) {
  const options = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div
      className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800"
      role="group"
      aria-label="Theme mode"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = themeMode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setThemeMode(opt.id)}
            title={`Switch to ${opt.label} theme`}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold transition ${
              active
                ? 'bg-white text-emerald-900 shadow-sm dark:bg-emerald-600 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function TabletPreviewShell({ tabletPreviewMode, setTabletPreviewMode, children }) {
  if (!tabletPreviewMode) return children;

  const isPortrait = tabletPreviewMode === 'portrait';

  return (
    <div className="min-h-screen bg-slate-950 px-3 py-5 sm:px-6">
      <div className="mx-auto mb-3 flex max-w-6xl flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Tablet className="h-4 w-4 text-emerald-400" />
          <span className="font-extrabold text-white">Rugged 10&quot; Farm Tablet Simulator</span>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
            {isPortrait ? 'Portrait (800×1024)' : 'Landscape (1280×800)'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTabletPreviewMode(isPortrait ? 'landscape' : 'portrait')}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-slate-700"
          >
            <RotateCw className="h-3.5 w-3.5 text-emerald-400" />
            {isPortrait ? 'Rotate to Landscape (1280×800)' : 'Rotate to Portrait (800×1024)'}
          </button>
          <button
            type="button"
            onClick={() => setTabletPreviewMode(false)}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-red-700"
          >
            <X className="h-3.5 w-3.5" />
            Exit Tablet Preview
          </button>
        </div>
      </div>

      {/* Rugged Tablet Bezel */}
      <div
        className={`mx-auto transition-all duration-300 ${
          isPortrait ? 'w-[780px] max-w-full' : 'w-[1180px] max-w-full'
        }`}
      >
        <div className="relative overflow-hidden rounded-[2.25rem] border-[12px] border-slate-800 bg-slate-900 shadow-[0_25px_70px_rgba(0,0,0,0.65)] ring-2 ring-slate-700">
          {/* Tablet Top Hardware Bezel + Kiosk Status Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-2 text-[11px] font-bold text-slate-300">
            <div className="flex items-center gap-2.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-700 ring-2 ring-slate-600" />
              <Signal className="h-3.5 w-3.5 text-emerald-400" />
              <span>5G SIM • AlReefi Kiosk Mode</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-300">
              <span>{isPortrait ? '800×1024' : '1280×800'}</span>
              <BatteryFull className="h-4 w-4 text-emerald-400" />
              <span>Battery 98%</span>
            </div>
          </div>

          {/* Scrollable Tablet Screen Viewport */}
          <div className="relative max-h-[82vh] min-h-[680px] overflow-y-auto bg-[#f4f7f2] dark:bg-slate-900">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState(() => createInitialFarmState());
  const [isLoaded, setIsLoaded] = useState(false);

  // Auth & Role Session: null (Login Screen) | 'owner' | 'manager' | 'supervisor' | 'worker'
  const [userRole, setUserRole] = useState(null);
  const [activeUserId, setActiveUserId] = useState(null);
  const [manualOverrideEnabled, setManualOverrideEnabled] = useState(false);

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showQuickDemo, setShowQuickDemo] = useState(true);

  // Navigation & Global UI Controls
  const [activeView, setActiveView] = useState('hub');
  const [selectedHouseId, setSelectedHouseId] = useState('house-1');
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [liveSensorEnabled, setLiveSensorEnabled] = useState(true);
  const [toast, setToast] = useState(null);
  const [nowClock, setNowClock] = useState(() => new Date());

  // Theme Mode ('light' | 'dark' | 'system') & Tablet Preview ('false' | 'landscape' | 'portrait')
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch {
      // Ignore storage failures
    }
    return 'light';
  });
  const [systemDark, setSystemDark] = useState(getSystemPrefersDark);
  const [tabletPreviewMode, setTabletPreviewMode] = useState(false);

  const resolvedTheme = themeMode === 'system' ? (systemDark ? 'dark' : 'light') : themeMode;

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // Ignore storage errors
    }
  }, [themeMode]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemDark(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [resolvedTheme]);

  // Live ticking clock for Start Shift screen
  useEffect(() => {
    const timer = window.setInterval(() => setNowClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Initial load from StorageService (alreefi_farm_v2_state)
  useEffect(() => {
    let mounted = true;
    storageService.loadState().then((loaded) => {
      if (!mounted) return;
      setState(loaded);
      setIsLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Live Zigbee/Wi-Fi sensor stream simulation via UnraidServerAdapter
  useEffect(() => {
    if (!isLoaded || !liveSensorEnabled) return undefined;
    const unraid = new UnraidServerAdapter(state.settings?.storage?.unraidConfig);
    const unsubscribe = unraid.subscribeLiveSensors(null, (applyDrift) => {
      setState((prev) => ({
        ...prev,
        houses: applyDrift(prev.houses),
      }));
    });
    return unsubscribe;
  }, [isLoaded, liveSensorEnabled, state.settings?.storage?.unraidConfig]);

  // Language direction support hook
  const activeLangCode = state.settings?.language || 'en';
  const langDict = LOCALIZATION_DICTIONARY[activeLangCode] || LOCALIZATION_DICTIONARY.en;

  useEffect(() => {
    document.documentElement.dir = langDict.dir || 'ltr';
    document.documentElement.lang = activeLangCode;
  }, [langDict.dir, activeLangCode]);

  const notify = (message, tone = 'success') => {
    const id = Date.now() + Math.random();
    setToast({ id, message, tone });
    window.setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 3800);
  };

  const commitState = (updater) => {
    setState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      storageService.saveState(next);
      return next;
    });
  };

  const toggleLanguage = () => {
    const nextLang = activeLangCode === 'ar' ? 'en' : 'ar';
    commitState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        language: nextLang,
      },
    }));
    notify(nextLang === 'ar' ? 'تم التبديل إلى اللغة العربية (RTL)' : 'Switched interface to English (LTR)', 'success');
  };

  const activeUser = useMemo(() => {
    if (!activeUserId) return null;
    return (state.userAccounts || []).find((u) => u.id === activeUserId) || null;
  }, [state.userAccounts, activeUserId]);

  const actorName = useMemo(() => {
    if (activeUser?.name) return activeUser.name;
    if (userRole === 'owner') return 'Super Admin';
    if (userRole === 'manager') return 'Farm Manager';
    if (userRole === 'supervisor') return 'Supervisor';
    if (userRole === 'worker') return 'Farm Worker';
    return 'Operator';
  }, [activeUser, userRole]);

  const visibleHouses = useMemo(() => {
    const nonArchived = (state.houses || []).filter((h) => !h.archived);
    if ((userRole === 'worker' || userRole === 'supervisor') && activeUser) {
      const assigned = nonArchived.filter(
        (h) => h.isActive !== false && (activeUser.assignedHouseIds || []).includes(h.id)
      );
      return assigned.length > 0
        ? assigned
        : nonArchived.filter((h) => h.isActive !== false);
    }
    return nonArchived;
  }, [state.houses, userRole, activeUser]);

  const activeAlerts = useMemo(() => {
    const visibleIds = new Set(visibleHouses.map((h) => h.id));
    return (state.emergencyAlerts || []).filter(
      (a) =>
        a.status === 'active' &&
        (userRole === 'owner' || userRole === 'manager' || visibleIds.has(a.houseId))
    );
  }, [state.emergencyAlerts, visibleHouses, userRole]);

  const navigateTo = (view, houseId) => {
    if (houseId) setSelectedHouseId(houseId);
    setActiveView(view);
  };

  const completeSignInForAccount = (account) => {
    setUserRole(account.role);
    setActiveUserId(account.id);
    setManualOverrideEnabled(false);
    setLoginError('');

    const nonArchivedActive = (state.houses || []).filter(
      (h) => !h.archived && h.isActive !== false
    );
    const firstAssigned =
      nonArchivedActive.find((h) => (account.assignedHouseIds || []).includes(h.id)) ||
      nonArchivedActive[0];
    if (firstAssigned?.id) {
      setSelectedHouseId(firstAssigned.id);
    }

    if (account.role === 'worker') {
      setActiveView('log');
    } else {
      setActiveView('hub');
    }
  };

  const handleCredentialLogin = (e) => {
    e.preventDefault();
    const uname = loginUsername.trim().toLowerCase();
    const pwd = loginPassword;
    const matched = (state.userAccounts || []).find(
      (u) => u.username.toLowerCase() === uname && u.password === pwd
    );
    if (!matched) {
      setLoginError('Invalid username or password. Try a Quick Demo Sign-In account below.');
      return;
    }
    completeSignInForAccount(matched);
  };

  const handleQuickDemoLogin = (userId) => {
    const target = (state.userAccounts || []).find((u) => u.id === userId);
    if (!target) return;
    setLoginUsername(target.username);
    setLoginPassword(target.password);
    completeSignInForAccount(target);
  };

  const logout = () => {
    setUserRole(null);
    setActiveUserId(null);
    setManualOverrideEnabled(false);
    setLoginError('');
  };

  // --- Shift Clock-In / Clock-Out ---

  const clockInShift = () => {
    if (!activeUser) return;
    const now = new Date();
    const nowIso = now.toISOString();
    const todayStr = nowIso.slice(0, 10);
    const shiftObj =
      (state.settings?.shiftConfig?.shifts || []).find((s) => s.id === activeUser.shiftId) ||
      state.settings?.shiftConfig?.shifts?.[0] ||
      { id: 'shift-day', label: 'Day Shift', startTime: '06:00', endTime: '18:00', hours: 12 };

    const [schedH, schedM] = String(shiftObj.startTime || '06:00')
      .split(':')
      .map((n) => Number(n || 0));
    const schedDate = new Date(now);
    schedDate.setHours(schedH, schedM, 0, 0);
    const diffMins = Math.round((now.getTime() - schedDate.getTime()) / 60000);
    const realisticLate = diffMins > 5 && diffMins <= 90 ? diffMins : 0;
    const punctualityStatus = realisticLate > 5 ? `Late (+${realisticLate} min)` : 'On Time';

    const newSession = {
      id: `sess-${Date.now()}`,
      userId: activeUser.id,
      userName: activeUser.name,
      role: activeUser.role,
      shiftId: shiftObj.id,
      shiftLabel: `${shiftObj.label} (${shiftObj.startTime} - ${shiftObj.endTime})`,
      date: todayStr,
      scheduledStart: shiftObj.startTime,
      clockInAt: nowIso,
      clockOutAt: null,
      durationHours: 0,
      punctualityStatus,
      lateMinutes: realisticLate,
      assignedHouseIds: [...(activeUser.assignedHouseIds || [])],
    };

    commitState((prev) => {
      const nextAccounts = prev.userAccounts.map((u) =>
        u.id === activeUser.id
          ? { ...u, onShift: true, clockedInAt: nowIso }
          : u
      );
      return {
        ...prev,
        userAccounts: nextAccounts,
        workerProfiles: deriveWorkerProfiles(nextAccounts),
        shiftSessions: [newSession, ...(prev.shiftSessions || [])],
      };
    });

    notify(`Shift started for ${activeUser.name} (${shiftObj.label}).`, 'success');
  };

  const clockOutShift = () => {
    if (!activeUser) return;
    const now = new Date();
    const nowIso = now.toISOString();
    const startTimeMs = activeUser.clockedInAt ? new Date(activeUser.clockedInAt).getTime() : now.getTime();
    const elapsedHrs = Math.max(0.1, Number(((now.getTime() - startTimeMs) / 3600000).toFixed(1)));

    commitState((prev) => {
      const nextAccounts = prev.userAccounts.map((u) =>
        u.id === activeUser.id
          ? {
              ...u,
              onShift: false,
              clockedInAt: null,
              hoursToday: Number((Number(u.hoursToday || 0) + elapsedHrs).toFixed(1)),
              hoursWeek: Number((Number(u.hoursWeek || 0) + elapsedHrs).toFixed(1)),
              hoursCycle: Number((Number(u.hoursCycle || 0) + elapsedHrs).toFixed(1)),
            }
          : u
      );

      let closedOne = false;
      const nextSessions = (prev.shiftSessions || []).map((sess) => {
        if (!closedOne && sess.userId === activeUser.id && !sess.clockOutAt) {
          closedOne = true;
          return {
            ...sess,
            clockOutAt: nowIso,
            durationHours: elapsedHrs,
          };
        }
        return sess;
      });

      return {
        ...prev,
        userAccounts: nextAccounts,
        workerProfiles: deriveWorkerProfiles(nextAccounts),
        shiftSessions: nextSessions,
      };
    });

    notify(`Shift ended for ${activeUser.name} (+${elapsedHrs}h logged).`, 'warning');
  };

  // --- Staff & User Account Mutations ---

  const saveUserAccount = (accountData) => {
    commitState((prev) => {
      const existing = prev.userAccounts.find((u) => u.id === accountData.id);
      const nextAccounts = existing
        ? prev.userAccounts.map((u) =>
            u.id === accountData.id
              ? {
                  ...u,
                  ...accountData,
                  assignedHouseIds: [...(accountData.assignedHouseIds || u.assignedHouseIds || [])],
                }
              : u
          )
        : [
            ...prev.userAccounts,
            {
              onShift: false,
              clockedInAt: null,
              hoursToday: 0,
              hoursWeek: 0,
              hoursCycle: 0,
              preferredLang: 'en',
              password: '123',
              ...accountData,
              id: accountData.id || `user-${Date.now()}`,
              assignedHouseIds: [...(accountData.assignedHouseIds || [])],
            },
          ];

      return {
        ...prev,
        userAccounts: nextAccounts,
        workerProfiles: deriveWorkerProfiles(nextAccounts),
      };
    });
    notify(`Saved staff account: ${accountData.name}.`, 'success');
  };

  const deleteUserAccount = (userId) => {
    const target = state.userAccounts.find((u) => u.id === userId);
    if (!target) return;
    if (target.role === 'owner' && state.userAccounts.filter((u) => u.role === 'owner').length <= 1) {
      notify('Cannot delete the primary Super Admin account.', 'error');
      return;
    }
    if (target.id === activeUserId) {
      notify('Cannot delete the currently logged-in user.', 'error');
      return;
    }
    commitState((prev) => {
      const nextAccounts = prev.userAccounts.filter((u) => u.id !== userId);
      return {
        ...prev,
        userAccounts: nextAccounts,
        workerProfiles: deriveWorkerProfiles(nextAccounts),
      };
    });
    notify(`Removed user account ${target.name}.`, 'warning');
  };

  const saveWorkerProfile = (workerData) => {
    saveUserAccount({
      ...workerData,
      role: workerData.role || 'worker',
      username: workerData.username || workerData.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || `worker${Date.now()}`,
      password: workerData.password || '123',
      shiftId: workerData.shiftId || 'shift-day',
    });
  };

  const deleteWorkerProfile = (workerId) => deleteUserAccount(workerId);

  const updateShiftConfig = (shiftConfig) => {
    commitState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        shiftConfig,
      },
    }));
    notify(`Shift timing updated (${shiftConfig.mode === '3x8' ? '3 × 8h Shifts' : '2 × 12h Shifts'}).`, 'success');
  };

  // --- Emergency Alerts ---

  const submitEmergencyAlert = ({ houseId, eventType, details }) => {
    const alert = {
      id: `emg-${Date.now()}`,
      houseId,
      eventType,
      details,
      reportedBy: actorName,
      reportedAt: new Date().toISOString(),
      status: 'active',
      resolvedBy: null,
      resolvedAt: null,
      resolutionNote: '',
    };
    commitState((prev) => ({
      ...prev,
      emergencyAlerts: [alert, ...(prev.emergencyAlerts || [])],
    }));
    notify(`Emergency Alert dispatched for ${eventType}!`, 'error');
  };

  const resolveEmergencyAlert = (alertId, resolutionNote = '') => {
    commitState((prev) => ({
      ...prev,
      emergencyAlerts: prev.emergencyAlerts.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'resolved',
              resolvedBy: actorName,
              resolvedAt: new Date().toISOString(),
              resolutionNote,
            }
          : a
      ),
    }));
    notify('Emergency alert marked resolved.', 'success');
  };

  // --- Houses & Environmental Controls ---

  const toggleHouseActive = (houseId) => {
    if (userRole !== 'owner') {
      notify('Only Super Admin can change Active / Inactive house status.', 'error');
      return;
    }
    let nextStateLabel = 'Active';
    commitState((prev) => ({
      ...prev,
      houses: prev.houses.map((h) => {
        if (h.id !== houseId) return h;
        const nextActive = h.isActive === false;
        nextStateLabel = nextActive ? 'Active' : 'Inactive / Offline';
        return { ...h, isActive: nextActive };
      }),
    }));
    notify(`House status updated to ${nextStateLabel}.`, 'success');
  };

  const updateHouseZones = (houseId, zonesPatch) => {
    commitState((prev) => ({
      ...prev,
      houses: prev.houses.map((h) => {
        if (h.id !== houseId) return h;
        const mergedZones = {
          ...h.zones,
          ...zonesPatch,
          lastSensorSync: new Date().toISOString(),
        };
        return {
          ...h,
          zones: mergedZones,
          co2Ppm: mergedZones.co2Ppm ?? h.co2Ppm,
          negativePressurePa: mergedZones.negativePressurePa ?? h.negativePressurePa,
        };
      }),
    }));
    notify('House environmental zones & air quality readings updated.', 'success');
  };

  const addOrUpdateHouse = ({
    id,
    name,
    code,
    sector,
    cartons,
    feedSystemType = 'bags',
    bagWeightKg = 50,
    siloCapacityTons = 20,
  }) => {
    if (userRole !== 'owner') {
      notify('Only Super Admin can add or configure Broiler Houses.', 'error');
      return;
    }

    const paddedCode = String(code || state.houses.length + 1)
      .replace(/\D/g, '')
      .padStart(2, '0')
      .slice(-2) || String(state.houses.length + 1).padStart(2, '0');

    const isSilo = feedSystemType === 'silo';

    if (id) {
      commitState((prev) => ({
        ...prev,
        houses: prev.houses.map((h) =>
          h.id === id
            ? {
                ...h,
                name,
                code: paddedCode,
                sector,
                cartons: Number(cartons || h.cartons),
                feedSystemType,
                bagWeightKg: isSilo ? null : Number(bagWeightKg || 50),
                siloCapacityTons: isSilo ? Number(siloCapacityTons || 20) : null,
              }
            : h
        ),
      }));
      notify(`Updated ${name} configuration.`, 'success');
      return;
    }

    const newId = `house-${Date.now()}`;
    const newHouse = {
      id: newId,
      name,
      code: paddedCode,
      sector: sector || 'East Pad',
      isActive: true,
      archived: false,
      phase: 'cultivation',
      cycleNumber: 13,
      cycleLabel: 'Start-of-Cycle',
      cycleStartDate: new Date().toISOString().slice(0, 10),
      cycleDay: 1,
      targetCycleDays: state.settings?.contractRules?.defaultTargetCycleDays || 35,
      cleaningDay: 0,
      targetCleaningDays: state.settings?.contractRules?.mandatoryCleaningDays || 14,
      cartons: Number(cartons || 150),
      historicalMortalities: 0,
      historicalCulls: 0,
      manualCountOverride: null,
      feedSystemType,
      bagWeightKg: isSilo ? null : Number(bagWeightKg || 50),
      siloCapacityTons: isSilo ? Number(siloCapacityTons || 20) : null,
      siloCurrentKg: isSilo ? Number(siloCapacityTons || 20) * 1000 : null,
      lastSiloRefill: isSilo
        ? { date: new Date().toISOString().slice(0, 10), tonsAdded: Number(siloCapacityTons || 20), loggedBy: actorName }
        : null,
      currentFeedPhase: 'Starter',
      feedInventoryKg: isSilo
        ? { Starter: Number(siloCapacityTons || 20) * 1000, Grower: 0, Finisher: 0 }
        : { Starter: 4000, Grower: 0, Finisher: 0 },
      zones: {
        start: 31.8,
        middle: 32.0,
        end: 32.1,
        outside: 41.5,
        humidity: 58,
        ammoniaPpm: 5,
        co2Ppm: 1450,
        negativePressurePa: 25,
        lastSensorSync: new Date().toISOString(),
      },
      co2Ppm: 1450,
      negativePressurePa: 25,
      weeklyWeights: [],
      cleaningSteps: (state.settings?.cleaningStepTemplates || DEFAULT_CLEANING_STEPS).map((s) => ({
        ...s,
        status: 'pending',
        completedBy: null,
        completedAt: null,
        verifiedBy: null,
        verifiedAt: null,
        note: '',
        photoProof: null,
      })),
      lastHarvestSummary: null,
      overrideAudit: [],
    };
    commitState((prev) => ({
      ...prev,
      houses: [...prev.houses, newHouse],
    }));
    notify(`Added ${name} (${isSilo ? `${siloCapacityTons}T Silo` : `${bagWeightKg}kg Bags`}).`, 'success');
  };

  const toggleArchiveHouse = (houseId) => {
    if (userRole !== 'owner') {
      notify('Only Super Admin can archive or restore houses.', 'error');
      return;
    }
    commitState((prev) => ({
      ...prev,
      houses: prev.houses.map((h) => (h.id === houseId ? { ...h, archived: !h.archived } : h)),
    }));
    notify('Updated house archive status.', 'success');
  };

  const applyManualOverride = (houseId, { manualCountOverride, cycleDay, cleaningDay, reason }) => {
    if (userRole !== 'owner') return;
    commitState((prev) => ({
      ...prev,
      houses: prev.houses.map((h) => {
        if (h.id !== houseId) return h;
        const auditEntry = {
          actor: actorName,
          timestamp: new Date().toISOString(),
          manualCountOverride,
          cycleDay,
          cleaningDay,
          reason,
        };
        return {
          ...h,
          manualCountOverride,
          cycleDay: h.phase === 'cultivation' ? cycleDay : h.cycleDay,
          cleaningDay: h.phase === 'cleaning' ? cleaningDay : h.cleaningDay,
          overrideAudit: [auditEntry, ...(h.overrideAudit || [])],
        };
      }),
    }));
    notify('Super Admin manual override applied & logged.', 'warning');
  };

  // --- Cleaning & Flock Lifecycle (Supports both positional & object signatures) ---

  const recordFinalCatchAndStartCleaning = (arg1, arg2) => {
    const payload = typeof arg1 === 'object' && arg1 !== null ? arg1 : { houseId: arg1, ...(arg2 || {}) };
    const { houseId, harvestedBirds, avgWeightGrams, totalCatchKg, notes } = payload;
    const stepsTemplate = state.settings?.cleaningStepTemplates || DEFAULT_CLEANING_STEPS;

    commitState((prev) => ({
      ...prev,
      houses: prev.houses.map((h) =>
        h.id === houseId
          ? {
              ...h,
              phase: 'cleaning',
              cycleLabel: 'Cleaning Phase',
              cleaningDay: 1,
              manualCountOverride: 0,
              lastHarvestSummary: {
                harvestedBirds: Number(harvestedBirds || 0),
                avgWeightGrams: Number(avgWeightGrams || 0),
                totalCatchKg: Number(totalCatchKg || 0),
                completedDate: new Date().toISOString().slice(0, 10),
                recordedBy: actorName,
                notes: notes || '',
              },
              cleaningSteps: stepsTemplate.map((s) => ({
                ...s,
                status: 'pending',
                completedBy: null,
                completedAt: null,
                verifiedBy: null,
                verifiedAt: null,
                note: '',
                photoProof: null,
              })),
            }
          : h
      ),
    }));
    notify('Final catch recorded. House switched to 14-day Cleaning Phase.', 'success');
  };

  const startNewFlockCycle = (arg1, arg2) => {
    const payload = typeof arg1 === 'object' && arg1 !== null ? arg1 : { houseId: arg1, ...(arg2 || {}) };
    const { houseId, cartons, targetCycleDays, cycleStartDate } = payload;

    commitState((prev) => ({
      ...prev,
      houses: prev.houses.map((h) =>
        h.id === houseId
          ? {
              ...h,
              phase: 'cultivation',
              cycleNumber: Number(h.cycleNumber || 12) + 1,
              cycleLabel: 'Start-of-Cycle',
              cycleStartDate: cycleStartDate || new Date().toISOString().slice(0, 10),
              cycleDay: 1,
              targetCycleDays: Number(targetCycleDays || 35),
              cleaningDay: 0,
              cartons: Number(cartons || 150),
              historicalMortalities: 0,
              historicalCulls: 0,
              manualCountOverride: null,
              currentFeedPhase: 'Starter',
              weeklyWeights: [],
            }
          : h
      ),
    }));
    notify(
      `New flock cycle initialized (${Number(cartons || 150) * (state.settings?.contractRules?.chicksPerCarton || 100)} chicks).`,
      'success'
    );
  };

  const submitCleaningStep = (arg1, arg2, arg3) => {
    const payload =
      typeof arg1 === 'object' && arg1 !== null
        ? arg1
        : { houseId: arg1, stepNumber: arg2, ...(arg3 || {}) };
    const { houseId, stepNumber, note, photoProof } = payload;

    commitState((prev) => ({
      ...prev,
      houses: prev.houses.map((h) => {
        if (h.id !== houseId) return h;
        return {
          ...h,
          cleaningSteps: h.cleaningSteps.map((s) =>
            s.stepNumber === stepNumber
              ? {
                  ...s,
                  status: 'awaiting_verification',
                  completedBy: actorName,
                  completedAt: new Date().toISOString(),
                  note: note ?? s.note,
                  photoProof: photoProof ?? s.photoProof,
                }
              : s
          ),
        };
      }),
    }));
    notify(`Cleaning Step ${stepNumber} submitted for verification.`, 'success');
  };

  const reviewCleaningStep = (arg1, arg2, arg3) => {
    const payload =
      typeof arg1 === 'object' && arg1 !== null
        ? arg1
        : { houseId: arg1, stepNumber: arg2, ...(arg3 || {}) };
    const { houseId, stepNumber, approved = true, note } = payload;

    commitState((prev) => ({
      ...prev,
      houses: prev.houses.map((h) => {
        if (h.id !== houseId) return h;
        return {
          ...h,
          cleaningSteps: h.cleaningSteps.map((s) =>
            s.stepNumber === stepNumber
              ? {
                  ...s,
                  status: approved ? 'verified' : 'pending',
                  verifiedBy: approved ? actorName : null,
                  verifiedAt: approved ? new Date().toISOString() : null,
                  note: note || s.note,
                }
              : s
          ),
        };
      }),
    }));
    notify(
      approved ? `Step ${stepNumber} verified! Next step unlocked.` : `Step ${stepNumber} returned for re-clean.`,
      approved ? 'success' : 'warning'
    );
  };

  const finishCleaningAndReadyHouse = () => {
    notify('All sanitation steps verified! Click "Start New Flock Cycle" to place chicks.', 'success');
  };

  // --- Daily Incremental Health Logs, Feed, Silos, Medication & Incidents ---

  const addHealthLog = ({
    houseId,
    shift,
    mortalities,
    culls,
    manualTempC,
    zones,
    feedPhase,
    feedBags,
    feedKg,
    waterGallons,
    waterLiters,
    note,
  }) => {
    const targetHouse = state.houses.find((h) => h.id === houseId);
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.slice(0, 10);
    const bagWeight = Number(targetHouse?.bagWeightKg || 50);

    const computedFeedBags =
      targetHouse?.feedSystemType === 'silo'
        ? 0
        : feedBags !== undefined && feedBags !== null
        ? Number(feedBags)
        : Math.round(Number(feedKg || 0) / bagWeight);

    const computedFeedKg =
      targetHouse?.feedSystemType === 'silo'
        ? Number(feedKg || 0)
        : feedKg !== undefined && feedKg !== null
        ? Number(feedKg)
        : computedFeedBags * bagWeight;

    const computedGallons =
      waterGallons !== undefined && waterGallons !== null
        ? Number(waterGallons)
        : litersToGallons(waterLiters || 0);
    const computedLiters =
      waterLiters !== undefined && waterLiters !== null
        ? Number(waterLiters)
        : gallonsToLiters(computedGallons);

    const entry = {
      id: `log-${Date.now()}`,
      houseId,
      cycleNumber: targetHouse?.cycleNumber || 13,
      date: todayStr,
      shift: shift || 'Day Shift',
      timestamp: nowIso,
      userId: activeUser?.id || null,
      loggedBy: actorName,
      mortalities: Number(mortalities || 0),
      culls: Number(culls || 0),
      manualTempC: Number(manualTempC),
      zones: zones || targetHouse?.zones,
      feedPhase: feedPhase || targetHouse?.currentFeedPhase || 'Grower',
      feedBags: computedFeedBags,
      feedKg: computedFeedKg,
      waterGallons: computedGallons,
      waterLiters: computedLiters,
      locked: true,
      note: note || '',
    };

    commitState((prev) => ({
      ...prev,
      healthLogs: [entry, ...(prev.healthLogs || [])],
      houses: prev.houses.map((h) => {
        if (h.id !== houseId) return h;
        const phaseKey = entry.feedPhase;
        const currentStock = Number(h.feedInventoryKg?.[phaseKey] || 0);
        const nextStock = Math.max(0, currentStock - computedFeedKg);
        const nextSiloKg =
          h.feedSystemType === 'silo' && h.siloCurrentKg !== null
            ? Math.max(0, Number(h.siloCurrentKg) - computedFeedKg)
            : h.siloCurrentKg;

        return {
          ...h,
          currentFeedPhase: phaseKey,
          siloCurrentKg: nextSiloKg,
          feedInventoryKg: {
            ...h.feedInventoryKg,
            [phaseKey]: nextStock,
          },
          zones: zones
            ? { ...h.zones, ...zones, lastSensorSync: nowIso }
            : h.zones,
        };
      }),
    }));

    notify(`Incremental shift entry locked for ${targetHouse?.name || 'house'}.`, 'success');
  };

  const updateLockedHealthLog = (arg1, arg2) => {
    if (userRole !== 'owner' || !manualOverrideEnabled) {
      notify('Super Admin Override Mode must be ON to edit locked entries.', 'error');
      return;
    }
    const logId = typeof arg1 === 'object' ? arg1.logId : arg1;
    const patch = typeof arg1 === 'object' ? arg1 : arg2 || {};

    commitState((prev) => ({
      ...prev,
      healthLogs: (prev.healthLogs || []).map((log) => {
        if (log.id !== logId) return log;
        const targetHouse = prev.houses.find((h) => h.id === log.houseId);
        const bagWeight = Number(targetHouse?.bagWeightKg || 50);

        const nextFeedBags =
          patch.feedBags !== undefined ? Number(patch.feedBags) : log.feedBags;
        const nextFeedKg =
          patch.feedKg !== undefined
            ? Number(patch.feedKg)
            : patch.feedBags !== undefined
            ? nextFeedBags * bagWeight
            : log.feedKg;

        const nextWaterGallons =
          patch.waterGallons !== undefined
            ? Number(patch.waterGallons)
            : patch.waterLiters !== undefined
            ? litersToGallons(patch.waterLiters)
            : log.waterGallons;
        const nextWaterLiters =
          patch.waterLiters !== undefined
            ? Number(patch.waterLiters)
            : patch.waterGallons !== undefined
            ? gallonsToLiters(patch.waterGallons)
            : log.waterLiters;

        return {
          ...log,
          ...patch,
          feedBags: nextFeedBags,
          feedKg: nextFeedKg,
          waterGallons: nextWaterGallons,
          waterLiters: nextWaterLiters,
          locked: true,
          overrideAudit: [
            {
              actor: actorName,
              timestamp: new Date().toISOString(),
              patch,
            },
            ...(log.overrideAudit || []),
          ],
        };
      }),
    }));
    notify('Locked log entry updated under Super Admin Override.', 'warning');
  };

  const addFeedDelivery = ({ houseId, phase, quantityKg, bagCount, supplier, invoiceRef }) => {
    const qtyKg = Number(quantityKg || 0);
    const delivery = {
      id: `del-${Date.now()}`,
      houseId,
      deliveryType: 'bags',
      phase,
      quantityKg: qtyKg,
      tonsAdded: Number((qtyKg / 1000).toFixed(2)),
      bagCount: bagCount !== undefined ? Number(bagCount) : Math.round(qtyKg / 50),
      supplier: supplier || 'Alain Farms Feed Mill',
      invoiceRef: invoiceRef || `AF-BAG-${String(Date.now()).slice(-4)}`,
      deliveredAt: new Date().toISOString(),
      loggedBy: actorName,
    };
    commitState((prev) => ({
      ...prev,
      feedDeliveries: [delivery, ...(prev.feedDeliveries || [])],
      houses: prev.houses.map((h) =>
        h.id === houseId
          ? {
              ...h,
              feedInventoryKg: {
                ...h.feedInventoryKg,
                [phase]: Number(h.feedInventoryKg?.[phase] || 0) + qtyKg,
              },
            }
          : h
      ),
    }));
    notify(`Added ${(qtyKg / 1000).toFixed(2)}T (${phase}) to bag inventory.`, 'success');
  };

  const recordBulkSiloDelivery = ({ houseId, tonsAdded, phase, supplier, invoiceRef, notes }) => {
    const tons = Number(tonsAdded || 0);
    if (tons <= 0) return;
    const kgAdded = Math.round(tons * 1000);
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.slice(0, 10);
    const targetHouse = state.houses.find((h) => h.id === houseId);
    const feedPhase = phase || targetHouse?.currentFeedPhase || 'Grower';

    const delivery = {
      id: `del-${Date.now()}`,
      houseId,
      deliveryType: 'silo_bulk',
      phase: feedPhase,
      quantityKg: kgAdded,
      tonsAdded: tons,
      bagCount: 0,
      supplier: supplier || 'Alain Farms Bulk Silo Truck',
      invoiceRef: invoiceRef || `AF-SILO-${String(Date.now()).slice(-4)}`,
      notes: notes || '',
      deliveredAt: nowIso,
      loggedBy: actorName,
    };

    commitState((prev) => ({
      ...prev,
      feedDeliveries: [delivery, ...(prev.feedDeliveries || [])],
      houses: prev.houses.map((h) => {
        if (h.id !== houseId) return h;
        const maxKg = Number(h.siloCapacityTons || 20) * 1000;
        const nextSiloKg = Math.min(maxKg, Number(h.siloCurrentKg || 0) + kgAdded);
        return {
          ...h,
          siloCurrentKg: nextSiloKg,
          lastSiloRefill: {
            date: todayStr,
            tonsAdded: tons,
            loggedBy: actorName,
          },
          feedInventoryKg: {
            ...h.feedInventoryKg,
            [feedPhase]: Number(h.feedInventoryKg?.[feedPhase] || 0) + kgAdded,
          },
        };
      }),
    }));
    notify(`Logged ${tons}T bulk silo refill for ${targetHouse?.name || 'house'}.`, 'success');
  };

  // --- Medication Catalog & Structured Medication Doses ---

  const addMedicationCatalogItem = ({
    name,
    category,
    defaultDosage,
    waterRatioPer1000Gal,
    withdrawalDays,
  }) => {
    const item = {
      id: `medcat-${Date.now()}`,
      name,
      category: category || 'Supplement',
      defaultDosage,
      waterRatioPer1000Gal: waterRatioPer1000Gal || defaultDosage,
      withdrawalDays: Number(withdrawalDays || 0),
    };
    commitState((prev) => ({
      ...prev,
      medicationCatalog: [...(prev.medicationCatalog || []), item],
    }));
    notify(`Added ${name} to Medication Catalog.`, 'success');
  };

  const deleteMedicationCatalogItem = (id) => {
    commitState((prev) => ({
      ...prev,
      medicationCatalog: (prev.medicationCatalog || []).filter((m) => m.id !== id),
    }));
    notify('Removed medication from catalog.', 'warning');
  };

  const scheduleMedicationTask = ({
    houseId,
    catalogId,
    medicineName,
    category,
    dosage,
    waterVolumeGallons,
    scheduledDate,
    scheduledTime,
    assignedToRole,
    note,
  }) => {
    const catalogItem = (state.medicationCatalog || []).find((m) => m.id === catalogId);
    const volGal = Number(waterVolumeGallons || 500);
    const task = {
      id: `medtask-${Date.now()}`,
      houseId,
      catalogId: catalogId || catalogItem?.id || null,
      medicineName: medicineName || catalogItem?.name || 'Medication Dose',
      category: category || catalogItem?.category || 'Supplement',
      dosage: dosage || catalogItem?.defaultDosage || '',
      waterVolumeGallons: volGal,
      waterVolumeLiters: gallonsToLiters(volGal),
      scheduledDate: scheduledDate || new Date().toISOString().slice(0, 10),
      scheduledTime: scheduledTime || '16:00',
      status: 'Pending',
      assignedToRole: assignedToRole || 'Supervisor',
      scheduledBy: actorName,
      administeredBy: null,
      administeredAt: null,
      note: note || '',
    };

    commitState((prev) => ({
      ...prev,
      medicationTasks: [task, ...(prev.medicationTasks || [])],
    }));
    notify(`Scheduled ${task.medicineName} (${volGal} gal).`, 'success');
  };

  const executeMedicationTask = (arg1, arg2) => {
    const medTaskId = typeof arg1 === 'object' ? arg1.medTaskId : arg1;
    const note = typeof arg1 === 'object' ? arg1.note : arg2;
    const nowIso = new Date().toISOString();

    commitState((prev) => ({
      ...prev,
      medicationTasks: (prev.medicationTasks || []).map((mt) =>
        mt.id === medTaskId
          ? {
              ...mt,
              status: 'Administered',
              administeredBy: actorName,
              administeredAt: nowIso,
              note: note !== undefined && note !== '' ? note : mt.note,
            }
          : mt
      ),
    }));
    notify('Medication dose marked as Administered.', 'success');
  };

  const addMedicationLog = ({ houseId, name, type, dosage, notes }) => {
    scheduleMedicationTask({
      houseId,
      medicineName: name,
      category: type,
      dosage,
      waterVolumeGallons: 500,
      note: notes,
    });
  };

  // --- Incident / Anomaly Notes with Photos ---

  const addIncidentNote = ({ houseId, category, note, photoUrl, photo }) => {
    const entry = {
      id: `inc-${Date.now()}`,
      houseId,
      category: category || 'Anomaly',
      note: note || '',
      photoUrl: photoUrl || photo || null,
      reportedBy: actorName,
      userId: activeUser?.id || null,
      reportedAt: new Date().toISOString(),
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
    };
    commitState((prev) => ({
      ...prev,
      incidentNotes: [entry, ...(prev.incidentNotes || [])],
    }));
    notify(`Incident note logged for ${category}.`, 'warning');
  };

  const acknowledgeIncidentNote = (arg1) => {
    const noteId = typeof arg1 === 'object' ? arg1.noteId : arg1;
    commitState((prev) => ({
      ...prev,
      incidentNotes: (prev.incidentNotes || []).map((n) =>
        n.id === noteId
          ? {
              ...n,
              acknowledged: true,
              acknowledgedBy: actorName,
              acknowledgedAt: new Date().toISOString(),
            }
          : n
      ),
    }));
    notify('Incident note acknowledged.', 'success');
  };

  // --- Tasks, Templates & 3-Timestamp Audit (NO Reject Status) ---

  const addTaskTemplate = ({
    prefix = 'C',
    category,
    taskNumber,
    title,
    defaultScope = 'house',
    defaultRoleTarget = null,
  }) => {
    const catObj =
      TASK_CATEGORY_PREFIXES.find((c) => c.prefix === prefix) ||
      TASK_CATEGORY_PREFIXES.find((c) => c.category === category) ||
      TASK_CATEGORY_PREFIXES[0];

    const samePrefixCount = (state.taskTemplates || []).filter(
      (tpl) => tpl.prefix === catObj.prefix
    ).length;
    const numStr = String(taskNumber || samePrefixCount + 1)
      .replace(/\D/g, '')
      .padStart(3, '0')
      .slice(-3);

    const newTemplate = {
      id: `tpl-${Date.now()}`,
      prefix: catObj.prefix,
      category: category || catObj.category,
      taskNumber: numStr,
      taskCode: `${catObj.prefix}-${numStr}`,
      title,
      defaultScope,
      defaultRoleTarget: defaultScope === 'role' ? defaultRoleTarget || 'Supervisor' : null,
    };

    commitState((prev) => ({
      ...prev,
      taskTemplates: [...(prev.taskTemplates || []), newTemplate],
    }));
    notify(`Saved template ${newTemplate.taskCode}: ${title}.`, 'success');
    return newTemplate;
  };

  const createTask = ({
    houseId,
    title,
    category,
    prefix,
    taskNumber,
    assignmentScope = 'house',
    targetRole = null,
    shiftLabel = 'Day Shift (06:00-18:00)',
    assignedTo,
    dueDate,
    note,
    saveAsTemplate = false,
  }) => {
    const catObj =
      TASK_CATEGORY_PREFIXES.find((c) => c.prefix === prefix) ||
      TASK_CATEGORY_PREFIXES.find((c) => c.category === category) ||
      TASK_CATEGORY_PREFIXES[0];

    const targetHouse = assignmentScope === 'role' ? null : state.houses.find((h) => h.id === houseId);
    const cleanNum = String(taskNumber || '001')
      .replace(/\D/g, '')
      .padStart(3, '0')
      .slice(-3);
    const taskCode = `${catObj.prefix}-${cleanNum}`;
    const nowIso = new Date().toISOString();

    commitState((prev) => {
      const jobNumber = generateNextJobNumber(
        prev.tasks || [],
        targetHouse?.code || '00',
        cleanNum
      );

      const newTask = {
        id: `task-${Date.now()}`,
        templateId: null,
        taskCode,
        taskNumber: cleanNum,
        jobNumber,
        category: catObj.category,
        title,
        assignmentScope,
        houseId: assignmentScope === 'role' ? null : houseId,
        shiftLabel: assignmentScope === 'role' ? 'Role Task' : shiftLabel,
        targetRole: assignmentScope === 'role' ? targetRole || 'Supervisor' : null,
        assignedTo: assignedTo || (assignmentScope === 'role' ? targetRole || 'Supervisor' : 'Ahmed Al-Mansoor'),
        assignedBy: actorName,
        dueDate: dueDate || nowIso.slice(0, 10),
        status: 'Assigned',
        manualTempC: null,
        workerNote: '',
        photoProof: null,
        reviewNote: '',
        followUpJobNumber: null,
        assignedAt: nowIso,
        submittedAt: null,
        reviewedAt: null,
        auditLog: [
          {
            action: 'Assigned',
            actor: actorName,
            timestamp: nowIso,
            note: note || '',
          },
        ],
      };

      let nextTemplates = prev.taskTemplates || [];
      if (saveAsTemplate) {
        const exists = nextTemplates.some(
          (tpl) => tpl.taskCode === taskCode && tpl.title.toLowerCase() === title.toLowerCase()
        );
        if (!exists) {
          nextTemplates = [
            ...nextTemplates,
            {
              id: `tpl-${Date.now()}`,
              prefix: catObj.prefix,
              category: catObj.category,
              taskNumber: cleanNum,
              taskCode,
              title,
              defaultScope: assignmentScope,
              defaultRoleTarget: assignmentScope === 'role' ? targetRole || 'Supervisor' : null,
            },
          ];
        }
      }

      return {
        ...prev,
        taskTemplates: nextTemplates,
        tasks: [newTask, ...(prev.tasks || [])],
      };
    });
    notify(`Assigned job ${taskCode} cleanly.`, 'success');
  };

  const bulkAssignTemplate = ({ templateId, houseIds = [], shiftLabel = 'Day Shift (06:00-18:00)', dueDate }) => {
    const tpl = (state.taskTemplates || []).find((t) => t.id === templateId);
    if (!tpl) return;
    const nowIso = new Date().toISOString();
    const targetDue = dueDate || nowIso.slice(0, 10);

    commitState((prev) => {
      const existingAndNew = [...(prev.tasks || [])];
      const created = [];

      if (tpl.defaultScope === 'role' && (!houseIds || houseIds.length === 0)) {
        const jobNumber = generateNextJobNumber(existingAndNew, '00', tpl.taskNumber);
        const assignee =
          (prev.userAccounts || []).find(
            (u) => u.role.toLowerCase() === String(tpl.defaultRoleTarget || 'supervisor').toLowerCase()
          )?.name || 'Faisal Al-Harbi';

        const roleJob = {
          id: `task-${Date.now()}-role`,
          templateId: tpl.id,
          taskCode: tpl.taskCode,
          taskNumber: tpl.taskNumber,
          jobNumber,
          category: tpl.category,
          title: tpl.title,
          assignmentScope: 'role',
          houseId: null,
          shiftLabel: 'Role Task',
          targetRole: tpl.defaultRoleTarget || 'Supervisor',
          assignedTo: assignee,
          assignedBy: actorName,
          dueDate: targetDue,
          status: 'Assigned',
          manualTempC: null,
          workerNote: '',
          photoProof: null,
          reviewNote: '',
          followUpJobNumber: null,
          assignedAt: nowIso,
          submittedAt: null,
          reviewedAt: null,
          auditLog: [
            {
              action: 'Assigned (Template Bulk)',
              actor: actorName,
              timestamp: nowIso,
              note: `Role-level task assigned to ${tpl.defaultRoleTarget || 'Supervisor'}.`,
            },
          ],
        };
        created.push(roleJob);
      } else {
        houseIds.forEach((hId, idx) => {
          const targetHouse = prev.houses.find((h) => h.id === hId);
          if (!targetHouse) return;
          const jobNumber = generateNextJobNumber(
            [...created, ...existingAndNew],
            targetHouse.code || hId,
            tpl.taskNumber
          );
          const assignee =
            (prev.userAccounts || []).find(
              (u) =>
                (u.role === 'worker' || u.role === 'supervisor') &&
                (u.assignedHouseIds || []).includes(hId)
            )?.name || 'Faisal Al-Harbi';

          created.push({
            id: `task-${Date.now()}-${idx}`,
            templateId: tpl.id,
            taskCode: tpl.taskCode,
            taskNumber: tpl.taskNumber,
            jobNumber,
            category: tpl.category,
            title: tpl.title,
            assignmentScope: 'house',
            houseId: hId,
            shiftLabel,
            targetRole: null,
            assignedTo: assignee,
            assignedBy: actorName,
            dueDate: targetDue,
            status: 'Assigned',
            manualTempC: null,
            workerNote: '',
            photoProof: null,
            reviewNote: '',
            followUpJobNumber: null,
            assignedAt: nowIso,
            submittedAt: null,
            reviewedAt: null,
            auditLog: [
              {
                action: 'Assigned (Template Bulk)',
                actor: actorName,
                timestamp: nowIso,
                note: `${tpl.taskCode} assigned to ${targetHouse.name} (${shiftLabel}).`,
              },
            ],
          });
        });
      }

      return {
        ...prev,
        tasks: [...created, ...(prev.tasks || [])],
      };
    });

    notify(`Bulk assigned ${tpl.taskCode} jobs cleanly.`, 'success');
  };

  const submitTaskForVerification = ({ taskId, manualTempC, workerNote, photoProof }) => {
    const nowIso = new Date().toISOString();
    commitState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'Submitted',
              manualTempC: Number(manualTempC),
              workerNote: workerNote || '',
              photoProof: photoProof || t.photoProof || null,
              submittedAt: nowIso,
              auditLog: [
                ...(t.auditLog || []),
                {
                  action: 'Submitted',
                  actor: actorName,
                  timestamp: nowIso,
                  manualTempC: Number(manualTempC),
                  note: workerNote || '',
                },
              ],
            }
          : t
      ),
    }));
    notify('Job submitted with temperature audit.', 'success');
  };

  const reviewTask = ({ taskId, reviewNote = '', spawnFollowUp = false }) => {
    const nowIso = new Date().toISOString();
    let spawnedNum = null;

    commitState((prev) => {
      const targetTask = (prev.tasks || []).find((t) => t.id === taskId);
      if (!targetTask) return prev;

      const targetHouse = prev.houses.find((h) => h.id === targetTask.houseId);
      let followUpJob = null;

      if (spawnFollowUp) {
        spawnedNum = generateNextJobNumber(
          prev.tasks || [],
          targetHouse?.code || '00',
          targetTask.taskNumber || '001'
        );
        followUpJob = {
          id: `task-${Date.now()}-fu`,
          templateId: targetTask.templateId || null,
          taskCode: targetTask.taskCode,
          taskNumber: targetTask.taskNumber,
          jobNumber: spawnedNum,
          category: targetTask.category,
          title: targetTask.title.includes('(Follow-Up)')
            ? targetTask.title
            : `${targetTask.title} (Follow-Up)`,
          assignmentScope: targetTask.assignmentScope || 'house',
          houseId: targetTask.houseId,
          shiftLabel: targetTask.shiftLabel,
          targetRole: targetTask.targetRole || null,
          assignedTo: targetTask.assignedTo,
          assignedBy: actorName,
          dueDate: nowIso.slice(0, 10),
          status: 'Assigned',
          manualTempC: null,
          workerNote: '',
          photoProof: null,
          reviewNote: '',
          followUpJobNumber: null,
          parentJobNumber: targetTask.jobNumber,
          assignedAt: nowIso,
          submittedAt: null,
          reviewedAt: null,
          auditLog: [
            {
              action: `Assigned (Follow-Up from ${targetTask.jobNumber})`,
              actor: actorName,
              timestamp: nowIso,
              note: reviewNote || 'Re-assigned for follow-up execution.',
            },
          ],
        };
      }

      const updatedTasks = prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'Reviewed',
              reviewedAt: nowIso,
              reviewNote: reviewNote || 'Reviewed cleanly by management.',
              followUpJobNumber: spawnedNum || t.followUpJobNumber || null,
              auditLog: [
                ...(t.auditLog || []),
                {
                  action: spawnedNum
                    ? `Reviewed + Follow-Up Assigned (${spawnedNum})`
                    : 'Reviewed',
                  actor: actorName,
                  timestamp: nowIso,
                  note: reviewNote || 'Reviewed cleanly by management.',
                },
              ],
            }
          : t
      );

      return {
        ...prev,
        tasks: followUpJob ? [followUpJob, ...updatedTasks] : updatedTasks,
      };
    });

    notify(
      spawnFollowUp
        ? `Job permanently reviewed & follow-up spawned!`
        : 'Job permanently marked Reviewed.',
      spawnFollowUp ? 'warning' : 'success'
    );
  };

  // --- Weekly Bird Weights (Manager/Owner), Contracts & Reports ---

  const recordWeeklyBirdWeight = ({ houseId, cycleDay, sampleSize = 50, avgGrams, uniformityPct = 85 }) => {
    const dayNum = Math.max(1, Number(cycleDay || 7));
    const todayStr = new Date().toISOString().slice(0, 10);
    const entry = {
      week: Math.ceil(dayNum / 7),
      day: dayNum,
      sampleSize: Number(sampleSize || 50),
      avgGrams: Number(avgGrams),
      uniformityPct: Number(uniformityPct || 85),
      recordedAt: todayStr,
      recordedBy: actorName,
    };

    commitState((prev) => ({
      ...prev,
      houses: prev.houses.map((h) =>
        h.id === houseId
          ? {
              ...h,
              weeklyWeights: [...(h.weeklyWeights || []), entry],
            }
          : h
      ),
    }));
    notify(`Recorded Week ${entry.week} sample weight (${entry.avgGrams}g).`, 'success');
  };

  const saveContractRecord = (contractData) => {
    commitState((prev) => {
      const exists = (prev.contracts || []).some((c) => c.id === contractData.id);
      const nextContracts = exists
        ? prev.contracts.map((c) => (c.id === contractData.id ? contractData : c))
        : [{ ...contractData, id: `ctr-${Date.now()}` }, ...(prev.contracts || [])];
      return {
        ...prev,
        contracts: nextContracts,
      };
    });
    notify(`Saved contract ${contractData.contractCode}.`, 'success');
  };

  const saveReportSchedule = (nextSchedule) => {
    const channelVal = nextSchedule.defaultChannel || nextSchedule.channel || 'both';
    commitState((prev) => ({
      ...prev,
      reportSchedule: {
        ...prev.reportSchedule,
        ...nextSchedule,
        defaultChannel: channelVal,
        channel: channelVal,
      },
    }));
    notify('Daily report schedule & recipients saved.', 'success');
  };

  const dispatchDailyReportNow = (channelOverride) => {
    const sched = state.reportSchedule || {};
    const channel = typeof channelOverride === 'string'
      ? channelOverride
      : channelOverride?.channel || sched.defaultChannel || sched.channel || 'both';

    const activeHouses = (state.houses || []).filter((h) => !h.archived && h.isActive !== false);
    const chicksPerCarton = state.settings?.contractRules?.chicksPerCarton || 100;
    const totalLive = activeHouses.reduce((sum, h) => {
      if (h.phase === 'cleaning') return sum;
      return sum + calculateHouseInventory(h, chicksPerCarton, state.healthLogs).activeChicks;
    }, 0);
    const todayStr = new Date().toISOString().slice(0, 10);
    const latestLogs = (state.healthLogs || []).filter((l) => l.date === todayStr || l.date === '2026-11-15');
    const totalMorts = latestLogs.reduce((sum, l) => sum + Number(l.mortalities || 0), 0);
    const openIncidents = (state.incidentNotes || []).filter((i) => !i.acknowledged).length;

    const enabledRecipients = (sched.recipients || []).filter((r) => r.enabled);
    const summaryPreview = `Active Houses: ${activeHouses.length} • Live Birds: ${totalLive.toLocaleString()} • Mortalities Today: ${totalMorts} • Open Incidents: ${openIncidents}`;

    const entry = {
      id: `disp-${Date.now()}`,
      timestamp: new Date().toISOString(),
      channel,
      recipientCount: enabledRecipients.length,
      triggeredBy: actorName,
      summaryPreview,
    };

    commitState((prev) => ({
      ...prev,
      reportSchedule: {
        ...prev.reportSchedule,
        dispatchHistory: [entry, ...(prev.reportSchedule?.dispatchHistory || [])],
      },
    }));
    notify(
      `Daily summary dispatched via ${channel.toUpperCase()} to ${enabledRecipients.length} recipients.`,
      'success'
    );
    return entry;
  };

  // --- Settings & Backup ---

  const saveSettings = (nextSettings) => {
    commitState((prev) => ({
      ...prev,
      settings: nextSettings,
    }));
    notify('Farm settings saved.', 'success');
  };

  const exportBackupFile = () => {
    const filename = storageService.exportDatabaseJSON(state);
    notify(`Exported ${filename}`, 'success');
  };

  const importBackupFile = async (file) => {
    try {
      const imported = await storageService.importDatabaseJSON(file);
      setState(imported);
      notify('Farm database restored from JSON snapshot!', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const resetDemoData = async () => {
    const fresh = await storageService.resetDemoData();
    setState(fresh);
    notify('Demo data reset to fresh V2 farm dataset.', 'success');
  };

  const contextValue = {
    state,
    userRole,
    activeUser,
    activeUserId,
    setActiveUserId,
    activeWorkerId: activeUserId,
    setActiveWorkerId: setActiveUserId,
    activeWorker: activeUser,
    actorName,
    manualOverrideEnabled,
    setManualOverrideEnabled,
    activeView,
    selectedHouseId,
    setSelectedHouseId,
    navigateTo,
    visibleHouses,
    activeAlerts,
    isEmergencyModalOpen,
    setIsEmergencyModalOpen,
    liveSensorEnabled,
    setLiveSensorEnabled,
    themeMode,
    setThemeMode,
    resolvedTheme,
    tabletPreviewMode,
    setTabletPreviewMode,
    activeLangCode,
    langDict,
    toggleLanguage,
    notify,
    // Auth & Shift
    clockInShift,
    clockOutShift,
    logout,
    saveUserAccount,
    deleteUserAccount,
    updateShiftConfig,
    saveWorkerProfile,
    deleteWorkerProfile,
    // Alerts & Environment
    submitEmergencyAlert,
    resolveEmergencyAlert,
    toggleHouseActive,
    updateHouseZones,
    applyManualOverride,
    // Lifecycle & Cleaning (both V1 & V2 aliases)
    recordFinalCatch: recordFinalCatchAndStartCleaning,
    recordFinalCatchAndStartCleaning,
    startNewCycle: startNewFlockCycle,
    startNewFlockCycle,
    submitCleaningStep,
    reviewCleaningStep,
    verifyCleaningStep: reviewCleaningStep,
    finishCleaningAndReadyHouse,
    // Daily Logs, Silos, Meds & Incidents
    addHealthLog,
    updateLockedHealthLog,
    addFeedDelivery,
    recordBulkSiloDelivery,
    addMedicationCatalogItem,
    deleteMedicationCatalogItem,
    scheduleMedicationTask,
    executeMedicationTask,
    addMedicationLog,
    addIncidentNote,
    acknowledgeIncidentNote,
    // Tasks & Templates
    addTaskTemplate,
    createTask,
    bulkAssignTemplate,
    submitTaskForVerification,
    reviewTask,
    // Weights, Contracts & Reports
    recordWeeklyBirdWeight,
    saveContractRecord,
    saveReportSchedule,
    dispatchDailyReportNow,
    // Settings & Backup
    saveSettings,
    addOrUpdateHouse,
    toggleArchiveHouse,
    exportBackupFile,
    importBackupFile,
    resetDemoData,
  };

  const toastBanner = toast && (
    <div className="fixed right-4 bottom-20 z-50 lg:bottom-6">
      <div
        className={`rounded-2xl px-4 py-3 text-xs font-extrabold text-white shadow-xl ${
          toast.tone === 'error'
            ? 'bg-red-600'
            : toast.tone === 'warning'
            ? 'bg-amber-600'
            : 'bg-emerald-800'
        }`}
      >
        {toast.message}
      </div>
    </div>
  );

  // --- 1. LOGIN SCREEN ---
  if (!userRole || !activeUser) {
    const demoAccounts = [
      { id: 'user-owner', badge: 'Tier 1 • Owner', desc: 'All 6 Houses + Overrides + Financials', highlight: true },
      { id: 'user-manager', badge: 'Tier 2 • Manager', desc: 'Tariq • Silos, Contracts, Weights, Staff' },
      { id: 'user-sup', badge: 'Tier 3 • Supervisor', desc: 'Faisal • Houses 1-3 + Meds + Overview' },
      { id: 'user-w1', badge: 'Tier 4 • Worker (Bags)', desc: 'Ahmed • Bag Houses 1 & 2 (Already On Shift)' },
      { id: 'user-w2', badge: 'Tier 4 • Worker (Silo)', desc: 'Rashid • Silo Houses 3 & 4 [Start Shift Demo]' },
    ];

    return (
      <FarmContext.Provider value={contextValue}>
        <TabletPreviewShell
          tabletPreviewMode={tabletPreviewMode}
          setTabletPreviewMode={setTabletPreviewMode}
        >
          <div className="app-bg-pattern flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
            {/* Top Utility Bar: Theme + Language + Tablet Preview */}
            <div className="mb-4 flex w-full max-w-lg flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-900/10 bg-white/90 px-3.5 py-2 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/95">
              <ThemeTogglePill themeMode={themeMode} setThemeMode={setThemeMode} />

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-extrabold text-slate-700 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <Languages className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                  {activeLangCode === 'ar' ? 'EN' : 'AR'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTabletPreviewMode((prev) => (prev ? false : 'landscape'))
                  }
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold transition ${
                    tabletPreviewMode
                      ? 'bg-emerald-800 text-white'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                  }`}
                >
                  <Tablet className="h-3.5 w-3.5" />
                  Tablet View
                </button>
              </div>
            </div>

            <div className="w-full max-w-lg rounded-[2rem] border border-emerald-900/10 bg-white/92 p-7 shadow-2xl backdrop-blur-md sm:p-9 dark:border-slate-700 dark:bg-slate-800/95">
              <div className="text-center">
                <img
                  src="/app-logo.png"
                  alt="AlReefi Poultry Farm Logo"
                  className="mx-auto h-24 w-24 rounded-3xl object-contain"
                />
                <h1 className="mt-2 text-2xl font-black tracking-tight text-emerald-950 dark:text-emerald-300">
                  {langDict.appTitle}
                </h1>
                <p className="mt-0.5 text-xs font-bold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
                  {langDict.subtitle}
                </p>
              </div>

              {/* Standard Credential Form */}
              <form onSubmit={handleCredentialLogin} className="mt-6 space-y-3 text-left">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Username
                  </label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => {
                      setLoginUsername(e.target.value);
                      if (loginError) setLoginError('');
                    }}
                    placeholder="e.g., admin, manager, supervisor, ahmed, rashid"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (loginError) setLoginError('');
                    }}
                    placeholder="Default demo password: 123"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-700 focus:outline-none"
                  />
                </div>

                {loginError && (
                  <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                    {loginError}
                  </p>
                )}

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-800 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-900 active:scale-[0.99]"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In to AlReefi Farm
                </button>
              </form>

              {/* Collapsible Quick Demo Sign-In (Fill & Enter) */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/90 p-3.5 dark:border-slate-700 dark:bg-slate-900/70">
                <button
                  type="button"
                  onClick={() => setShowQuickDemo((prev) => !prev)}
                  className="flex w-full items-center justify-between text-left text-xs font-extrabold text-slate-700 uppercase dark:text-slate-200"
                >
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    Quick Demo Sign-In (Fill &amp; Enter)
                  </span>
                  {showQuickDemo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showQuickDemo && (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {demoAccounts.map((demo) => {
                      const acct = (state.userAccounts || []).find((u) => u.id === demo.id);
                      if (!acct) return null;
                      return (
                        <button
                          key={demo.id}
                          type="button"
                          onClick={() => handleQuickDemoLogin(acct.id)}
                          className={`flex flex-col rounded-xl border p-2.5 text-left transition active:scale-[0.99] ${
                            demo.highlight
                              ? 'border-emerald-700 bg-emerald-800 text-white hover:bg-emerald-900 sm:col-span-2'
                              : 'border-slate-200 bg-white text-slate-900 hover:border-emerald-700 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black">{acct.name}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                demo.highlight
                                  ? 'bg-emerald-950/60 text-emerald-100'
                                  : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-300'
                              }`}
                            >
                              {demo.badge}
                            </span>
                          </div>
                          <span
                            className={`mt-1 text-[11px] font-medium ${
                              demo.highlight ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {demo.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <p className="mt-4 text-center text-[11px] font-medium text-slate-400">
                Poultry-First V2 • Offline-Ready Tablet PWA (EN / AR)
              </p>
            </div>
          </div>
          {toastBanner}
        </TabletPreviewShell>
      </FarmContext.Provider>
    );
  }

  // --- 2. FULL-SCREEN "START SHIFT" CLOCK-IN GATE FOR WORKERS & SUPERVISORS ---
  const requiresClockInGate =
    (userRole === 'worker' || userRole === 'supervisor') && !activeUser.onShift;

  if (requiresClockInGate) {
    const userShift =
      (state.settings?.shiftConfig?.shifts || []).find((s) => s.id === activeUser.shiftId) ||
      state.settings?.shiftConfig?.shifts?.[0] ||
      { label: 'Day Shift', startTime: '06:00', endTime: '18:00', hours: 12 };

    const assignedHouses = (state.houses || []).filter(
      (h) => !h.archived && h.isActive !== false && (activeUser.assignedHouseIds || []).includes(h.id)
    );

    return (
      <FarmContext.Provider value={contextValue}>
        <TabletPreviewShell
          tabletPreviewMode={tabletPreviewMode}
          setTabletPreviewMode={setTabletPreviewMode}
        >
          <div className="app-bg-pattern flex min-h-screen flex-col justify-between p-4 sm:p-8">
            {/* Top Control Bar */}
            <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-900/10 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/95">
              <div className="flex items-center gap-2">
                <img src="/app-logo.png" alt="AlReefi" className="h-8 w-8 rounded-lg object-contain" />
                <div>
                  <p className="text-xs font-black text-slate-900 dark:text-white">{activeUser.name}</p>
                  <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    {activeUser.roleTitle}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ThemeTogglePill themeMode={themeMode} setThemeMode={setThemeMode} />
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-extrabold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <Languages className="h-3.5 w-3.5" />
                  {activeLangCode === 'ar' ? 'EN' : 'AR'}
                </button>
                <button
                  type="button"
                  onClick={() => setTabletPreviewMode((prev) => (prev ? false : 'landscape'))}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-extrabold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <Tablet className="h-3.5 w-3.5" />
                  Tablet View
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>
            </div>

            {/* Center High-Contrast Clock-In Gate */}
            <div className="mx-auto my-6 w-full max-w-2xl rounded-[2rem] border border-emerald-900/15 bg-white/95 p-6 text-center shadow-2xl backdrop-blur-md sm:p-10 dark:border-slate-700 dark:bg-slate-800/95">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-extrabold text-amber-900 dark:bg-amber-900/40 dark:text-amber-300">
                <Lock className="h-3.5 w-3.5" />
                Shift Attendance Gate • Clock-In Required
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                Ready to Begin Your Shift?
              </h1>
              <p className="mt-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                Confirm your assigned houses and shift schedule to unlock daily logs &amp; assigned tasks.
              </p>

              {/* Live Ticking UAE Clock */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 uppercase dark:text-slate-400">
                  <Clock className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <span>
                    {nowClock.toLocaleDateString('en-AE', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <p className="mt-1 font-mono text-3xl font-black tracking-tight text-emerald-900 sm:text-4xl dark:text-emerald-400">
                  {nowClock.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
                <p className="mt-1.5 text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  Scheduled: {userShift.label} ({userShift.startTime} – {userShift.endTime})
                </p>
              </div>

              {/* Assigned Houses List */}
              <div className="mt-6 text-left">
                <p className="mb-2.5 text-xs font-extrabold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  Your Assigned Broiler Houses ({assignedHouses.length})
                </p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {assignedHouses.map((h) => {
                    const isSilo = h.feedSystemType === 'silo';
                    return (
                      <div
                        key={h.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-300">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">{h.name}</p>
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {h.sector} • {h.phase === 'cleaning' ? `Cleaning Day ${h.cleaningDay}` : `Day ${h.cycleDay}/${h.targetCycleDays}`}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                            isSilo
                              ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-300'
                              : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}
                        >
                          {isSilo ? 'Silo-Based' : 'Bag-Based'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Huge Green START SHIFT Button */}
              <button
                type="button"
                onClick={clockInShift}
                className="mt-7 flex w-full items-center justify-center gap-3 rounded-full bg-emerald-700 px-8 py-5 text-xl font-black tracking-wide text-white uppercase shadow-xl shadow-emerald-900/25 transition hover:bg-emerald-800 active:scale-[0.98]"
              >
                <Play className="h-6 w-6 fill-white" />
                {langDict.startShift}
              </button>
            </div>

            <div className="text-center text-[11px] font-semibold text-slate-500">
              All timestamps are recorded in the Management Staff &amp; Attendance ledger.
            </div>
          </div>
          {toastBanner}
        </TabletPreviewShell>
      </FarmContext.Provider>
    );
  }

  // --- 3. ROLE-SCOPED NAVIGATION ---
  const navItems = [
    {
      id: 'hub',
      label: userRole === 'supervisor' ? langDict.houseOverview : langDict.globalHub,
      icon: LayoutDashboard,
      roles: ['owner', 'manager', 'supervisor'],
    },
    {
      id: 'house',
      label: langDict.houses,
      icon: Warehouse,
      roles: ['owner', 'manager'],
    },
    {
      id: 'log',
      label:
        userRole === 'worker'
          ? langDict.dailyLog
          : userRole === 'supervisor'
          ? langDict.dailyLogMeds
          : langDict.dailyLogSilos,
      icon: Stethoscope,
      roles: ['owner', 'manager', 'supervisor', 'worker'],
    },
    {
      id: 'tasks',
      label:
        userRole === 'worker' || userRole === 'supervisor'
          ? langDict.assignedTasks
          : langDict.tasks,
      icon: ClipboardCheck,
      roles: ['owner', 'manager', 'supervisor', 'worker'],
    },
    {
      id: 'analytics',
      label: langDict.analytics,
      icon: BarChart3,
      roles: ['owner', 'manager'],
    },
    {
      id: 'contracts',
      label: langDict.contractsReports,
      icon: FileSpreadsheet,
      roles: ['owner', 'manager'],
    },
    {
      id: 'staff',
      label: langDict.staffAttendance,
      icon: Users,
      roles: ['owner', 'manager'],
    },
    {
      id: 'settings',
      label: langDict.settings,
      icon: Settings,
      roles: ['owner', 'manager'],
    },
    ...(state.settings?.enablePhase2Crops
      ? [{ id: 'crops', label: langDict.crops, icon: Sprout, roles: ['owner', 'manager'] }]
      : []),
  ].filter((item) => item.roles.includes(userRole));

  const currentNavView = navItems.some((n) => n.id === activeView)
    ? activeView
    : navItems[0]?.id || 'log';

  return (
    <FarmContext.Provider value={contextValue}>
      <TabletPreviewShell
        tabletPreviewMode={tabletPreviewMode}
        setTabletPreviewMode={setTabletPreviewMode}
      >
        <div className="app-bg-pattern min-h-screen pb-24 lg:pb-10">
          {/* Persistent Top App Bar */}
          <header className="sticky top-0 z-30 border-b border-emerald-950/10 bg-white/95 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
            <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 sm:px-6">
              {/* Brand Identity */}
              <button
                type="button"
                onClick={() => navigateTo(navItems[0]?.id || 'log')}
                className="flex items-center gap-2.5 text-left"
              >
                <img
                  src="/app-logo.png"
                  alt="AlReefi Logo"
                  className="h-10 w-10 rounded-xl object-contain"
                />
                <div>
                  <h1 className="text-base font-black tracking-tight text-emerald-950 sm:text-lg dark:text-emerald-300">
                    {langDict.appTitle}
                  </h1>
                  <p className="hidden text-[11px] font-bold text-emerald-700 sm:block dark:text-emerald-400">
                    {actorName} ({activeUser.roleTitle})
                  </p>
                </div>
              </button>

              {/* Desktop / Landscape Tablet Navigation */}
              <nav className="hidden flex-wrap items-center gap-1 xl:flex">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = currentNavView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateTo(item.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold transition ${
                        active
                          ? 'bg-emerald-800 text-white shadow-sm'
                          : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* Right Controls: Theme, EN/AR, Tablet Test, Override, Emergency, End Shift, Logout */}
              <div className="flex flex-wrap items-center gap-1.5">
                <ThemeTogglePill themeMode={themeMode} setThemeMode={setThemeMode} />

                <button
                  type="button"
                  onClick={toggleLanguage}
                  title="Switch English / Arabic"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-extrabold text-slate-700 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Languages className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                  {activeLangCode === 'ar' ? 'EN' : 'AR'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTabletPreviewMode((prev) => (prev ? false : 'landscape'))
                  }
                  title="Toggle 10-inch Tablet Screen Preview"
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-extrabold transition ${
                    tabletPreviewMode
                      ? 'bg-emerald-800 text-white'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  <Tablet className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Tablet View</span>
                </button>

                {userRole === 'owner' && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = !manualOverrideEnabled;
                      setManualOverrideEnabled(next);
                      notify(
                        next
                          ? 'Manual Override Mode ENABLED for Super Admin adjustments.'
                          : 'Manual Override Mode disabled.',
                        next ? 'warning' : 'success'
                      );
                    }}
                    className={`hidden items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition sm:inline-flex ${
                      manualOverrideEnabled
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    }`}
                  >
                    {manualOverrideEnabled ? (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    ) : (
                      <ShieldAlert className="h-3.5 w-3.5" />
                    )}
                    Override {manualOverrideEnabled ? 'ON' : 'OFF'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsEmergencyModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-md shadow-red-600/25 transition hover:bg-red-700 active:scale-95"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{langDict.emergencyBtn}</span>
                  <span className="sm:hidden">SOS</span>
                </button>

                {(userRole === 'worker' || userRole === 'supervisor') && activeUser.onShift && (
                  <button
                    type="button"
                    onClick={clockOutShift}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>{langDict.endShift}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={logout}
                  title="Logout / Switch Account"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{langDict.switchRole}</span>
                </button>
              </div>
            </div>

            {/* Compact Sub-Nav Strip for 1024-1279px screens */}
            <div className="hidden border-t border-slate-100 px-4 py-1.5 lg:flex xl:hidden dark:border-slate-800">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = currentNavView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateTo(item.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold transition ${
                        active
                          ? 'bg-emerald-800 text-white shadow-sm'
                          : 'text-slate-700 hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          {/* Main Content Viewport */}
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            {currentNavView === 'hub' && <GlobalHub />}
            {currentNavView === 'house' && <PoultryDashboard />}
            {currentNavView === 'log' && <HealthResourceLog />}
            {currentNavView === 'tasks' && <TaskVerification />}
            {currentNavView === 'analytics' && <Analytics />}
            {currentNavView === 'contracts' && <ContractsReports />}
            {currentNavView === 'staff' && <StaffAttendance />}
            {currentNavView === 'settings' && <StorageSettings />}
            {currentNavView === 'crops' && <CropDashboard />}
          </main>

          {/* Mobile / Tablet Portrait Bottom Navigation */}
          <nav
            className={`${
              tabletPreviewMode ? 'sticky bottom-0' : 'fixed inset-x-0 bottom-0'
            } z-30 flex items-center justify-around overflow-x-auto border-t border-slate-200 bg-white/95 px-2 py-2 shadow-lg backdrop-blur-md lg:hidden dark:border-slate-800 dark:bg-slate-900/95`}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentNavView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[10px] font-extrabold transition ${
                    active
                      ? 'text-emerald-800 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      active
                        ? 'text-emerald-800 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Global Persistent Emergency Modal */}
          <EmergencyModal />

          {toastBanner}
        </div>
      </TabletPreviewShell>
    </FarmContext.Provider>
  );
}
