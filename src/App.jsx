import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BatteryFull,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Languages,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Lock,
  LogIn,
  LogOut,
  Menu,
  Monitor,
  Moon,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  RotateCw,
  Settings,
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
  Bird,
  Receipt,
  Scale,
  Skull,
  Thermometer,
} from 'lucide-react';
import {
  DEFAULT_CLEANING_STEPS,
  LOCALIZATION_DICTIONARY,
  TASK_CATEGORY_PREFIXES,
  calculateHouseInventory,
  createInitialFarmState,
  deriveWorkerProfiles,
  detectActiveShiftForTimestamp,
  evaluateHouseEnvironmentStatus,
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
import OrdersAndBills from './components/OrdersAndBills.jsx';
import WeightsAndReports from './components/WeightsAndReports.jsx';

const FarmContext = createContext(null);
const THEME_STORAGE_KEY = 'alreefi_theme_mode';
const LAYOUT_STORAGE_KEY = 'alreefi_layout_mode';

export function useFarm() {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error('useFarm must be used inside FarmProvider');
  return ctx;
}

function BroilerHouseSvgIcon({ isSilo = false, className = 'h-7 w-7' }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Ridge Roof Vent Cupola */}
      <rect x="26" y="8" width="12" height="6" rx="1.5" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="2.2" />
      <path d="M24 9L32 4L40 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Main Gable Barn Roof & Silhouette */}
      <path
        d="M6 28L32 13L58 28"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 26V52H53V26L32 14L11 26Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Double Barn Bay Doors */}
      <rect x="24" y="36" width="16" height="16" rx="1.5" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="2" />
      <line x1="32" y1="36" x2="32" y2="52" stroke="currentColor" strokeWidth="1.8" />

      {/* Ventilation Louvers (Left & Right) */}
      <line x1="15" y1="33" x2="21" y2="33" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="15" y1="37" x2="21" y2="37" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="15" y1="41" x2="21" y2="41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="43" y1="33" x2="49" y2="33" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="43" y1="37" x2="49" y2="37" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="43" y1="41" x2="49" y2="41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

      {/* Ground Line */}
      <line x1="6" y1="52" x2="58" y2="52" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />

      {/* Optional Silo Tank Silhouette */}
      {isSilo && (
        <>
          <path d="M53 26H59V46L56 50L53 46V26Z" fill="currentColor" fillOpacity="0.28" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M53 26L56 21L59 26" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

function LiveClockDateBadge({ nowClock, activeLangCode, className = '' }) {
  const timeText = nowClock.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateText = nowClock.toLocaleDateString(activeLangCode === 'ar' ? 'ar-AE' : 'en-AE', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className={`inline-flex max-w-full min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 shadow-xs dark:border-emerald-800/80 dark:bg-emerald-950/70 ${className}`}
      aria-label="Live farm clock and date"
    >
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-black tracking-tight whitespace-nowrap text-emerald-950 tabular-nums sm:text-sm dark:text-emerald-200">
        <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
        <span>{timeText}</span>
      </span>
      <span className="hidden h-3.5 w-px bg-emerald-300/90 sm:inline-block dark:bg-emerald-700/80" />
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold whitespace-nowrap text-slate-700 sm:text-xs dark:text-slate-200">
        <Calendar className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
        <span>{dateText}</span>
      </span>
    </div>
  );
}

function LayoutModeSwitcher({ layoutMode, setLayoutMode }) {
  const options = [
    { id: 'sidebar', label: 'Sidebar', icon: PanelLeft },
    { id: 'dropdown', label: 'Dropdowns', icon: Layers },
    { id: 'topbar', label: 'Top Bar', icon: LayoutGrid },
  ];

  return (
    <div
      className="inline-flex max-w-full flex-wrap items-center rounded-full border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800"
      role="group"
      aria-label="Layout style"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = layoutMode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLayoutMode(opt.id)}
            title={`Switch to ${opt.label} layout`}
            aria-label={`Switch to ${opt.label} layout`}
            aria-pressed={active}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold transition ${
              active
                ? 'bg-white text-emerald-900 shadow-sm dark:bg-emerald-600 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
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

  // Theme Mode ('light' | 'dark' | 'system'), Layout Mode ('sidebar' | 'dropdown' | 'topbar') & Tablet Preview
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch {
      // Ignore storage failures
    }
    return 'light';
  });
  const [layoutMode, setLayoutMode] = useState(() => {
    try {
      const saved = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (saved === 'sidebar' || saved === 'dropdown' || saved === 'topbar') return saved;
    } catch {
      // Ignore storage failures
    }
    return 'sidebar';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarHousesOpen, setSidebarHousesOpen] = useState(true);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [headerHeight, setHeaderHeight] = useState(72);
  const headerRef = useRef(null);
  const dropdownContainerRef = useRef(null);

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
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, layoutMode);
    } catch {
      // Ignore storage errors
    }
    setOpenDropdownId(null);
    setMobileSidebarOpen(false);
  }, [layoutMode]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof window === 'undefined') return undefined;
    const updateHeight = () => setHeaderHeight(Math.round(el.getBoundingClientRect().height) || 72);
    updateHeight();
    if (typeof window.ResizeObserver !== 'undefined') {
      const ro = new window.ResizeObserver(updateHeight);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [userRole, activeUserId, layoutMode, tabletPreviewMode, activeView]);

  useEffect(() => {
    const handlePointerDown = (e) => {
      if (
        openDropdownId &&
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(e.target)
      ) {
        setOpenDropdownId(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenDropdownId(null);
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openDropdownId]);

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
    setOpenDropdownId(null);
    setMobileSidebarOpen(false);
  };

  const completeSignInForAccount = (account) => {
    setUserRole(account.role);
    setActiveUserId(account.id);
    setManualOverrideEnabled(false);
    setOpenDropdownId(null);
    setMobileSidebarOpen(false);
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

    if (account.role === 'worker' || account.role === 'supervisor') {
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
    setOpenDropdownId(null);
    setMobileSidebarOpen(false);
    setLoginError('');
  };

  // --- Shift Clock-In / Clock-Out ---

  const clockInShift = () => {
    if (!activeUser) return;
    const now = new Date();
    const nowIso = now.toISOString();
    const todayStr = nowIso.slice(0, 10);
    const detectedShift = detectActiveShiftForTimestamp(now, state.settings?.shiftConfig);
    const shiftObj =
      (state.settings?.shiftConfig?.shifts || []).find((s) => s.id === detectedShift.shiftId) ||
      (state.settings?.shiftConfig?.shifts || []).find((s) => s.id === activeUser.shiftId) ||
      state.settings?.shiftConfig?.shifts?.[0] ||
      { id: detectedShift.shiftId || 'shift-day', label: detectedShift.label || 'Day Shift', startTime: '06:00', endTime: '18:00', hours: 12 };

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

    commitState((prev) => {
      const teamIds = (prev.userAccounts || [])
        .filter(
          (u) =>
            (u.role === 'worker' || u.role === 'supervisor') &&
            Array.isArray(u.assignedHouseIds) &&
            u.assignedHouseIds.includes(houseId)
        )
        .map((u) => u.id);

      const nextUserAccounts = (prev.userAccounts || []).map((u) => {
        if ((u.role === 'worker' || u.role === 'supervisor') && Array.isArray(u.assignedHouseIds)) {
          return {
            ...u,
            assignedHouseIds: u.assignedHouseIds.filter((id) => id !== houseId),
          };
        }
        return u;
      });

      const targetHouse = (prev.houses || []).find((h) => h.id === houseId);

      return {
        ...prev,
        userAccounts: nextUserAccounts,
        houses: (prev.houses || []).map((h) =>
          h.id === houseId
            ? {
                ...h,
                phase: 'cleaning',
                cycleLabel: 'Cleaning Phase',
                cleaningDay: 1,
                manualCountOverride: 0,
                previousCycleTeamIds: teamIds.length > 0 ? teamIds : h.previousCycleTeamIds || [],
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
        auditLogs: [
          {
            id: `aud-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actor: actorName,
            role: userRole,
            action: 'End Cycle & Worker Assignment Reset',
            details: `${targetHouse?.name || houseId}: Archived ${teamIds.length} assigned worker/supervisor account(s) for 1-click cloning and cleared house permissions.`,
          },
          ...(prev.auditLogs || []),
        ],
      };
    });
    notify(
      'Final catch recorded. House switched to Cleaning Phase and house staff assignments automatically reset.',
      'success'
    );
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
    if (userRole !== 'owner') {
      notify('Only Super Admin can edit locked entries.', 'error');
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
    const hasTemp =
      manualTempC !== undefined &&
      manualTempC !== null &&
      String(manualTempC).trim() !== '' &&
      !Number.isNaN(Number(manualTempC));
    commitState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'Submitted',
              manualTempC: hasTemp ? Number(manualTempC) : t.manualTempC ?? null,
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

  const recordWeeklyBirdWeight = ({
    houseId,
    cycleDay,
    sampleSize = 50,
    avgGrams,
    uniformityPct = 85,
    notes = '',
  }) => {
    const dayNum = Math.max(1, Number(cycleDay || 7));
    const todayStr = new Date().toISOString().slice(0, 10);
    const entry = {
      week: Math.ceil(dayNum / 7),
      day: dayNum,
      sampleSize: Number(sampleSize || 50),
      avgGrams: Number(avgGrams),
      uniformityPct: Number(uniformityPct || 85),
      notes: notes || '',
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

  // --- V3 Orders & Bills, Dynamic Categories, Recurrence Engine, Silo Sight-Glass & Team Clone ---

  const createOrderBill = ({
    title,
    category,
    quantity,
    unit,
    unitPriceAed,
    totalCostAed,
    assignedHouseIds = ['ALL'],
    supplierName = '',
    managerBillAttachment = null,
    notes = '',
  }) => {
    const existingCount = (state.ordersAndBills || []).length;
    const nowIso = new Date().toISOString();
    const created = {
      id: `ord-${Date.now()}`,
      orderCode: `ORD-2026-${101 + existingCount}`,
      title,
      category,
      quantity: Number(quantity || 1),
      unit: unit || 'Units',
      unitPriceAed: Number(unitPriceAed || 0),
      totalCostAed: Number(totalCostAed || 0),
      assignedHouseIds: assignedHouseIds?.length ? assignedHouseIds : ['ALL'],
      supplierName,
      requestedBy: actorName,
      requestedAt: nowIso,
      managerBillAttachment,
      status: 'Pending',
      paidBy: null,
      paidAt: null,
      adminInvoiceAttachment: null,
      paidNote: '',
      whatsappNotifiedAt: null,
      notes,
    };

    commitState((prev) => ({
      ...prev,
      ordersAndBills: [created, ...(prev.ordersAndBills || [])],
      auditLogs: [
        {
          id: `aud-${Date.now()}`,
          timestamp: nowIso,
          actor: actorName,
          role: userRole,
          action: 'Order / Bill Request Submitted',
          details: `${created.orderCode}: ${created.title} (AED ${created.totalCostAed.toLocaleString()})`,
        },
        ...(prev.auditLogs || []),
      ],
    }));
    notify(`Order request ${created.orderCode} created. Notify Super Admin via WhatsApp.`, 'success');
    return created;
  };

  const markOrderBillPaid = ({ orderId, adminInvoiceAttachment = null, paidNote = '' }) => {
    if (userRole !== 'owner') {
      notify('Only the Super Admin can mark an order or bill as Paid.', 'warning');
      return;
    }
    const nowIso = new Date().toISOString();
    const target = (state.ordersAndBills || []).find((o) => o.id === orderId);
    commitState((prev) => ({
      ...prev,
      ordersAndBills: (prev.ordersAndBills || []).map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'Paid',
              paidBy: actorName,
              paidAt: nowIso,
              adminInvoiceAttachment: adminInvoiceAttachment || o.adminInvoiceAttachment || null,
              paidNote: paidNote || o.paidNote || '',
            }
          : o
      ),
      auditLogs: [
        {
          id: `aud-${Date.now()}`,
          timestamp: nowIso,
          actor: actorName,
          role: userRole,
          action: 'Order / Bill Marked Paid',
          details: `${target?.orderCode || orderId} marked Paid (AED ${Number(target?.totalCostAed || 0).toLocaleString()}).`,
        },
        ...(prev.auditLogs || []),
      ],
    }));
    notify(`${target?.orderCode || 'Bill'} marked as Paid.`, 'success');
  };

  const recordOrderWhatsappNotified = (orderId) => {
    const nowIso = new Date().toISOString();
    commitState((prev) => ({
      ...prev,
      ordersAndBills: (prev.ordersAndBills || []).map((o) =>
        o.id === orderId ? { ...o, whatsappNotifiedAt: nowIso } : o
      ),
    }));
    notify('WhatsApp notification timestamp logged on order.', 'success');
  };

  const saveHarvestLaborRecord = ({
    houseId,
    cycleNumber,
    workerHeadcount,
    bonusPerWorkerAed,
    notes = '',
  }) => {
    const headcount = Math.max(0, Number(workerHeadcount || 0));
    const bonus = Math.max(0, Number(bonusPerWorkerAed || 0));
    const totalBonusAed = Number((headcount * bonus).toFixed(2));
    const todayStr = new Date().toISOString().slice(0, 10);

    commitState((prev) => {
      const existing = (prev.harvestLaborRecords || []).find(
        (r) => r.houseId === houseId && Number(r.cycleNumber) === Number(cycleNumber)
      );
      const nextList = existing
        ? (prev.harvestLaborRecords || []).map((r) =>
            r.id === existing.id
              ? {
                  ...r,
                  workerHeadcount: headcount,
                  bonusPerWorkerAed: bonus,
                  totalBonusAed,
                  notes,
                  recordedBy: actorName,
                  catchDate: todayStr,
                }
              : r
          )
        : [
            {
              id: `harv-${Date.now()}`,
              houseId,
              cycleNumber: Number(cycleNumber || 13),
              workerHeadcount: headcount,
              bonusPerWorkerAed: bonus,
              totalBonusAed,
              catchDate: todayStr,
              recordedBy: actorName,
              notes,
            },
            ...(prev.harvestLaborRecords || []),
          ];
      return { ...prev, harvestLaborRecords: nextList };
    });
    notify(`Saved harvesting crew summary (${headcount} workers • AED ${totalBonusAed.toLocaleString()} total bonuses).`, 'success');
  };

  const addTaskCategory = ({ prefix, category, color = 'emerald' }) => {
    const cleanCat = String(category || '').trim();
    const cleanPrefix = String(prefix || cleanCat.slice(0, 1) || 'T')
      .trim()
      .toUpperCase()
      .slice(0, 2);
    if (!cleanCat) return;
    commitState((prev) => ({
      ...prev,
      taskCategories: [
        ...(prev.taskCategories || []),
        {
          id: `cat-${Date.now()}`,
          prefix: cleanPrefix,
          category: cleanCat,
          color,
        },
      ],
    }));
    notify(`Task category "${cleanCat}" (${cleanPrefix}) added.`, 'success');
  };

  const updateTaskCategory = ({ id, originalCategory, prefix, category, color }) => {
    const cleanCat = String(category || '').trim();
    const cleanPrefix = String(prefix || cleanCat.slice(0, 1) || 'T')
      .trim()
      .toUpperCase()
      .slice(0, 2);
    if (!cleanCat) return;
    commitState((prev) => ({
      ...prev,
      taskCategories: (prev.taskCategories || []).map((c) =>
        (id && c.id === id) || (!id && c.category === originalCategory)
          ? { ...c, prefix: cleanPrefix, category: cleanCat, color: color || c.color }
          : c
      ),
    }));
    notify(`Task category "${cleanCat}" updated.`, 'success');
  };

  const createRecurringTaskRule = ({
    templateId = null,
    title,
    category = 'Operations',
    prefix = 'O',
    houseScope = 'all',
    targetHouseIds = [],
    shiftScope = 'all',
    recurrenceType = 'daily',
    recurrenceIntervalDays = 1,
    note = '',
  }) => {
    const nowIso = new Date().toISOString();
    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) return;
    const cleanInterval = Math.max(1, Number(recurrenceIntervalDays || 1));

    commitState((prev) => {
      const count = (prev.recurringTaskRules || []).length + 1;
      const newRule = {
        id: `rec-${Date.now()}`,
        templateId,
        prefix: String(prefix || 'O').toUpperCase(),
        category,
        taskCode: `${String(prefix || 'O').toUpperCase()}-${String(count).padStart(3, '0')}`,
        title: cleanTitle,
        houseScope,
        targetHouseIds:
          houseScope === 'all'
            ? (prev.houses || []).filter((h) => !h.archived && h.isActive !== false).map((h) => h.id)
            : targetHouseIds,
        shiftScope,
        recurrenceType,
        recurrenceIntervalDays: cleanInterval,
        cycleBound: true,
        active: true,
        note,
        createdBy: actorName,
        createdAt: nowIso,
      };
      return {
        ...prev,
        recurringTaskRules: [newRule, ...(prev.recurringTaskRules || [])],
      };
    });
    notify(`Recurring task rule "${cleanTitle}" activated across cycle.`, 'success');
  };

  const toggleRecurringRuleActive = (ruleId) => {
    commitState((prev) => ({
      ...prev,
      recurringTaskRules: (prev.recurringTaskRules || []).map((r) =>
        r.id === ruleId ? { ...r, active: !r.active } : r
      ),
    }));
  };

  const completeRecurringTaskInstance = ({ completionKey, ruleId, houseId, note = '' }) => {
    const nowIso = new Date().toISOString();
    commitState((prev) => ({
      ...prev,
      recurringCompletions: {
        ...(prev.recurringCompletions || {}),
        [completionKey]: {
          ruleId,
          houseId,
          completedBy: actorName,
          completedAt: nowIso,
          note,
        },
      },
    }));
    notify('Task marked Done for this shift.', 'success');
  };

  const recordSiloSightGlassReading = ({
    houseId,
    remainingTons,
    method = 'manual-sight-glass',
    note = '',
  }) => {
    const val = Number(remainingTons);
    if (Number.isNaN(val) || val < 0) return;
    const nowIso = new Date().toISOString();
    commitState((prev) => ({
      ...prev,
      houses: (prev.houses || []).map((h) => {
        if (h.id !== houseId) return h;
        const prevTons =
          h.siloSightGlassTons != null
            ? Number(h.siloSightGlassTons)
            : Number(((h.siloCurrentKg || 0) / 1000).toFixed(2));
        const deltaTons = Number((prevTons - val).toFixed(2));
        const entry = {
          id: `sr-${Date.now()}`,
          date: nowIso.slice(0, 10),
          timestamp: nowIso,
          readingTons: Number(val.toFixed(2)),
          deltaTons,
          source: method,
          recordedBy: actorName,
          note,
        };
        return {
          ...h,
          siloSightGlassTons: Number(val.toFixed(2)),
          siloCurrentKg: Math.round(val * 1000),
          siloLastUpdatedAt: nowIso,
          siloConsumptionHistory: [entry, ...(h.siloConsumptionHistory || [])],
        };
      }),
    }));
    notify(`Updated Silo sight-glass reading to ${val.toFixed(2)} Tons.`, 'success');
  };

  const clonePreviousHouseTeam = (houseId) => {
    const targetHouse = (state.houses || []).find((h) => h.id === houseId);
    const prevTeam = targetHouse?.previousCycleTeamIds || [];
    if (prevTeam.length === 0) {
      notify('No previous cycle team snapshot saved for this house.', 'warning');
      return;
    }
    const nowIso = new Date().toISOString();
    commitState((prev) => ({
      ...prev,
      userAccounts: (prev.userAccounts || []).map((u) => {
        if (prevTeam.includes(u.id)) {
          const nextAssigned = Array.from(new Set([...(u.assignedHouseIds || []), houseId]));
          return { ...u, assignedHouseIds: nextAssigned };
        }
        return u;
      }),
      auditLogs: [
        {
          id: `aud-${Date.now()}`,
          timestamp: nowIso,
          actor: actorName,
          role: userRole,
          action: 'Cloned Previous Cycle Team',
          details: `Restored ${prevTeam.length} prior staff account(s) onto ${targetHouse?.name || houseId}.`,
        },
        ...(prev.auditLogs || []),
      ],
    }));
    notify(`Restored ${prevTeam.length} previous cycle worker/supervisor account(s) to ${targetHouse?.name || 'house'}.`, 'success');
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
    layoutMode,
    setLayoutMode,
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
    // Tasks, Dynamic Categories & Recurrence Engine
    addTaskCategory,
    updateTaskCategory,
    createRecurringTaskRule,
    toggleRecurringRuleActive,
    completeRecurringTaskInstance,
    addTaskTemplate,
    createTask,
    bulkAssignTemplate,
    submitTaskForVerification,
    reviewTask,
    // Silos & Cycle Team Cloning
    recordSiloSightGlassReading,
    clonePreviousHouseTeam,
    // Orders & Bills
    createOrderBill,
    markOrderBillPaid,
    recordOrderWhatsappNotified,
    // Weights, Labor & Reports
    recordWeeklyBirdWeight,
    saveHarvestLaborRecord,
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
            <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-emerald-900/10 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/95">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <img src="/app-logo.png" alt="AlReefi" className="h-9 w-9 shrink-0 rounded-xl object-contain" />
                <div className="min-w-0">
                  <p className="text-sm font-black tracking-tight text-emerald-950 dark:text-emerald-300">
                    {langDict.appTitle}
                  </p>
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {activeUser.name} • <span className="text-emerald-700 dark:text-emerald-400">{activeUser.roleTitle}</span>
                  </p>
                </div>
                <LiveClockDateBadge nowClock={nowClock} activeLangCode={activeLangCode} />
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
            <div className="mx-auto my-6 w-full max-w-3xl rounded-[2rem] border border-emerald-900/15 bg-white/95 p-6 text-center shadow-2xl backdrop-blur-md sm:p-10 dark:border-slate-700 dark:bg-slate-800/95">
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
                  <Calendar className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <span>
                    {nowClock.toLocaleDateString('en-AE', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <p className="mt-1 font-mono text-3xl font-black tracking-tight text-emerald-900 tabular-nums sm:text-4xl dark:text-emerald-400">
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

              {/* Visual Assigned Broiler Houses Cards */}
              <div className="mt-6 text-left">
                <p className="mb-3 text-xs font-extrabold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  Your Assigned Broiler Houses ({assignedHouses.length})
                </p>
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {assignedHouses.map((h) => {
                    const isSilo = h.feedSystemType === 'silo';
                    const isCleaning = h.phase === 'cleaning';
                    const env = evaluateHouseEnvironmentStatus(h, state.settings);
                    const inv = calculateHouseInventory(
                      h,
                      state.settings?.contractRules?.chicksPerCarton || 100,
                      state.healthLogs || []
                    );
                    const statusBadgeClass =
                      env.status === 'ALERT'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                        : env.status === 'ATTENTION'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        : env.status === 'CLEANING'
                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
                        : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-300';

                    return (
                      <div
                        key={h.id}
                        className="flex flex-col justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
                              isCleaning
                                ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                                : isSilo
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}
                          >
                            <BroilerHouseSvgIcon isSilo={isSilo} className="h-9 w-9" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <p className="text-base font-black text-slate-900 dark:text-white">
                                {h.name}
                              </p>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${statusBadgeClass}`}>
                                {env.status}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {h.sector} • House #{h.code || '01'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                              {isCleaning
                                ? `Cleaning Day ${h.cleaningDay || 1}`
                                : `Day ${h.cycleDay || 1}/${h.targetCycleDays || 35}`}
                            </span>
                            {!isCleaning && (
                              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                {inv.activeChicks.toLocaleString()} Birds
                              </span>
                            )}
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                              isSilo
                                ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-300'
                                : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}
                          >
                            {isSilo ? `Silo • ${h.siloCapacityTons || 20}T` : `Bags • ${h.bagWeightKg || 50}kg`}
                          </span>
                        </div>
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

  // --- 3. ROLE-SCOPED NAVIGATION & HEADER TELEMETRY DELTAS ---
  const rawNavItems = [
    {
      id: 'hub',
      label: userRole === 'supervisor' ? langDict.houseOverview : langDict.globalHub,
      icon: LayoutDashboard,
      roles: ['owner', 'manager', 'supervisor'],
    },
    {
      id: 'house',
      label: activeLangCode === 'ar' ? langDict.houses : 'Broiler Houses',
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
      label: langDict.tasks,
      icon: ClipboardCheck,
      roles: ['owner', 'manager'],
    },
    {
      id: 'orders',
      label: langDict.ordersBills || 'Orders & Bills',
      icon: Receipt,
      roles: ['owner', 'manager'],
    },
    {
      id: 'weights',
      label: langDict.weightsReports || 'Weights & Reports',
      icon: Scale,
      roles: ['owner', 'manager'],
    },
    {
      id: 'analytics',
      label: langDict.analytics,
      icon: BarChart3,
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

  const navItems =
    userRole === 'supervisor'
      ? [...rawNavItems].sort((a, b) => (a.id === 'log' ? -1 : b.id === 'log' ? 1 : 0))
      : rawNavItems;

  const headerTelemetry = (() => {
    const chicksPerCarton = state.settings?.contractRules?.chicksPerCarton || 100;
    const cultHouses = (visibleHouses || []).filter(
      (h) => h.isActive !== false && !h.archived && h.phase !== 'cleaning'
    );
    const activeIds = new Set(cultHouses.map((h) => h.id));
    const liveBirds = cultHouses.reduce(
      (sum, h) => sum + calculateHouseInventory(h, chicksPerCarton, state.healthLogs || []).activeChicks,
      0
    );
    const activeCycleNum = cultHouses.length
      ? Math.max(...cultHouses.map((h) => Number(h.cycleNumber || 0)), 13)
      : 13;
    const days = cultHouses.map((h) => Number(h.cycleDay || 1));
    const flockAgeLabel =
      days.length === 0
        ? 'Cleaning'
        : Math.min(...days) === Math.max(...days)
        ? `Day ${Math.min(...days)}`
        : `Days ${Math.min(...days)}–${Math.max(...days)}`;

    const logs = (state.healthLogs || []).filter((l) => activeIds.has(l.houseId));
    const datesDesc = Array.from(new Set(logs.map((l) => l.date).filter(Boolean))).sort((a, b) =>
      b.localeCompare(a)
    );
    const latestDate = datesDesc[0] || '';
    const prevDate = datesDesc[1] || '';

    const todayLogs = latestDate ? logs.filter((l) => l.date === latestDate) : [];
    const yesterdayLogs = prevDate ? logs.filter((l) => l.date === prevDate) : [];

    const mortalitiesToday = todayLogs.reduce((s, l) => s + Number(l.mortalities || 0), 0);
    const cullsToday = todayLogs.reduce((s, l) => s + Number(l.culls || 0), 0);
    const mortalitiesPrev = prevDate
      ? yesterdayLogs.reduce((s, l) => s + Number(l.mortalities || 0), 0)
      : cultHouses.reduce((s, h) => {
          const ds = h.dailySeries || [];
          return s + Number(ds.length >= 2 ? ds[ds.length - 2]?.mortalities || 0 : 0);
        }, 0);

    const avgTempToday = cultHouses.length
      ? cultHouses.reduce(
          (s, h) =>
            s + (Number(h.zones?.start || 0) + Number(h.zones?.middle || 0) + Number(h.zones?.end || 0)) / 3,
          0
        ) / cultHouses.length
      : 0;
    const avgTempPrev = cultHouses.length
      ? cultHouses.reduce((s, h) => {
          const ds = h.dailySeries || [];
          const fallback =
            (Number(h.zones?.start || 0) + Number(h.zones?.middle || 0) + Number(h.zones?.end || 0)) / 3;
          return s + Number(ds.length >= 2 ? ds[ds.length - 2]?.avgTempC ?? fallback : fallback);
        }, 0) / cultHouses.length
      : 0;

    return {
      activeCycleNum,
      flockAgeLabel,
      liveBirds,
      liveBirdsDelta: -(mortalitiesToday + cullsToday),
      mortalitiesToday,
      mortalitiesDelta: mortalitiesToday - mortalitiesPrev,
      avgTempToday: cultHouses.length ? avgTempToday.toFixed(1) : '—',
      avgTempDelta: cultHouses.length ? Number((avgTempToday - avgTempPrev).toFixed(1)) : 0,
    };
  })();

  const currentNavView = navItems.some((n) => n.id === activeView)
    ? activeView
    : navItems[0]?.id || 'log';

  const navItemMap = Object.fromEntries(navItems.map((item) => [item.id, item]));
  const canViewHouseDashboard = userRole === 'owner' || userRole === 'manager';
  const isPortraitPreview = tabletPreviewMode === 'portrait';

  const getHouseStatusMeta = (house) => {
    const env = evaluateHouseEnvironmentStatus(house, state.settings);
    const dotClass =
      env.status === 'ALERT'
        ? 'bg-red-500 ring-2 ring-red-200 dark:ring-red-900/60'
        : env.status === 'ATTENTION'
        ? 'bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-900/60'
        : env.status === 'CLEANING'
        ? 'bg-sky-500 ring-2 ring-sky-200 dark:ring-sky-900/60'
        : env.status === 'INACTIVE'
        ? 'bg-slate-400'
        : 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900/60';
    const phaseText =
      house.isActive === false
        ? 'Inactive'
        : house.phase === 'cleaning'
        ? `Cleaning D${house.cleaningDay || 1}`
        : `Day ${house.cycleDay || 1}/${house.targetCycleDays || 35}`;
    const isSilo = house.feedSystemType === 'silo';
    const feedBadge = isSilo
      ? `${house.siloCapacityTons || 20}T Silo`
      : `${house.bagWeightKg || 50}kg Bags`;
    const shortFeedBadge = isSilo ? `${house.siloCapacityTons || 20}T` : `${house.bagWeightKg || 50}kg`;
    return { env, dotClass, phaseText, isSilo, feedBadge, shortFeedBadge };
  };

  const handleQuickJumpHouse = (houseId, preferredView = null) => {
    const targetView = canViewHouseDashboard
      ? preferredView || (currentNavView === 'log' ? 'log' : 'house')
      : 'log';
    navigateTo(targetView, houseId);
  };

  const sidebarSections = [
    {
      id: 'overview',
      title: 'Overview & Houses',
      items: [navItemMap.hub, navItemMap.house, navItemMap.log].filter(Boolean),
      showHouseQuickJump: true,
    },
    {
      id: 'operations',
      title: 'Operations & Workflow',
      items: [navItemMap.tasks, navItemMap.staff].filter(Boolean),
    },
    {
      id: 'finance',
      title: 'Finance, Weights & Analytics',
      items: [navItemMap.orders, navItemMap.weights, navItemMap.analytics].filter(Boolean),
    },
    {
      id: 'system',
      title: 'System',
      items: [navItemMap.settings, navItemMap.crops].filter(Boolean),
    },
  ].filter((sec) => sec.items.length > 0);

  const dropdownMenus = [
    {
      id: 'ops',
      label: 'Operations & Barn Logs',
      icon: Warehouse,
      type: 'nav',
      items: [navItemMap.hub, navItemMap.house, navItemMap.log, navItemMap.tasks].filter(Boolean),
    },
    {
      id: 'houses',
      label: 'Quick House Jump',
      icon: BroilerHouseSvgIcon,
      type: 'houses',
      items: [],
    },
    {
      id: 'finance',
      label: 'Finance & Analytics',
      icon: BarChart3,
      type: 'nav',
      items: [navItemMap.orders, navItemMap.weights, navItemMap.analytics].filter(Boolean),
    },
    {
      id: 'admin',
      label: 'Admin & Settings',
      icon: Settings,
      type: 'nav',
      items: [navItemMap.staff, navItemMap.settings, navItemMap.crops].filter(Boolean),
    },
  ].filter((m) => m.type === 'houses' || m.items.length > 0);

  const userInitials = String(activeUser?.name || actorName || 'AR')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
  const isUserOnShift =
    activeUser.onShift || userRole === 'owner' || userRole === 'manager';

  const renderHouseQuickJumpList = (compactRail = false) => {
    if (compactRail) {
      return (
        <div className="space-y-1 pt-1">
          {visibleHouses.map((h) => {
            const meta = getHouseStatusMeta(h);
            const active =
              selectedHouseId === h.id &&
              (currentNavView === 'house' || currentNavView === 'log');
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => handleQuickJumpHouse(h.id, canViewHouseDashboard ? 'house' : 'log')}
                title={`${h.name} • ${meta.phaseText} • ${meta.feedBadge}`}
                className={`relative mx-auto flex h-10 w-12 items-center justify-center rounded-xl border text-[11px] font-black transition ${
                  active
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${meta.dotClass}`} />
                <BroilerHouseSvgIcon isSilo={meta.isSilo} className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <div className="ms-2 border-s-2 border-emerald-200/80 ps-2.5 pt-1 pb-1.5 dark:border-emerald-900/70">
        <button
          type="button"
          onClick={() => setSidebarHousesOpen((prev) => !prev)}
          className="mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1 text-[11px] font-extrabold tracking-wide text-slate-500 uppercase transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <span>Quick-Jump Houses ({visibleHouses.length})</span>
          {sidebarHousesOpen ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        {sidebarHousesOpen && (
          <div className="space-y-1">
            {visibleHouses.map((h) => {
              const meta = getHouseStatusMeta(h);
              const active =
                selectedHouseId === h.id &&
                (currentNavView === 'house' || currentNavView === 'log');
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => handleQuickJumpHouse(h.id, canViewHouseDashboard ? 'house' : 'log')}
                  className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition ${
                    active
                      ? 'bg-emerald-100/90 text-emerald-950 ring-1 ring-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-100 dark:ring-emerald-700'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-800 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-emerald-300 dark:ring-slate-700">
                    <BroilerHouseSvgIcon isSilo={meta.isSilo} className="h-4 w-4" />
                    <span
                      className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${meta.dotClass}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold">{h.name}</p>
                    <p className="truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {meta.phaseText}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-black ${
                      meta.isSilo
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                    }`}
                  >
                    {meta.shortFeedBadge}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderSidebarPanel = ({ isDrawer = false } = {}) => {
    const compact = !isDrawer && sidebarCollapsed;

    return (
      <div className="flex h-full flex-col">
        {/* Sidebar Header / Collapse Toggle */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-3 py-2.5 dark:border-slate-800">
          {!compact && (
            <span className="text-[11px] font-black tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Farm Navigation
            </span>
          )}
          {isDrawer ? (
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-extrabold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              aria-label="Close navigation menu"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              title={compact ? 'Expand sidebar' : 'Collapse sidebar to icon rail'}
              aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
              className="mx-auto inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {compact ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-2.5 py-3">
          {sidebarSections.map((section) => (
            <div key={section.id} className="space-y-1">
              {!compact ? (
                <p className="px-2.5 pb-1 text-[10px] font-black tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  {section.title}
                </p>
              ) : (
                <div className="mx-3 my-1 border-t border-slate-200 dark:border-slate-800" />
              )}

              {section.items.map((item) => {
                const Icon = item.icon;
                const active = currentNavView === item.id;
                const isHouseTab = item.id === 'house';
                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => navigateTo(item.id)}
                        title={compact ? item.label : undefined}
                        aria-current={active ? 'page' : undefined}
                        className={`flex flex-1 items-center rounded-xl text-xs font-extrabold transition ${
                          compact ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-3 py-2.5'
                        } ${
                          active
                            ? 'bg-emerald-800 text-white shadow-sm dark:bg-emerald-600'
                            : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!compact && <span className="truncate">{item.label}</span>}
                      </button>

                      {!compact && isHouseTab && (
                        <button
                          type="button"
                          onClick={() => setSidebarHousesOpen((prev) => !prev)}
                          title="Toggle Broiler Houses quick-jump sub-menu"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          {sidebarHousesOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>

                    {isHouseTab && renderHouseQuickJumpList(compact)}
                  </div>
                );
              })}

              {/* For Supervisor / Worker (no 'house' tab), show collapsible Broiler Houses sub-menu in Overview */}
              {section.showHouseQuickJump && !navItemMap.house && renderHouseQuickJumpList(compact)}
            </div>
          ))}
        </div>

        {/* Active User + Role + On-Shift Footer Card */}
        <div className="border-t border-slate-200/80 p-2.5 dark:border-slate-800">
          {compact ? (
            <div
              title={`${activeUser.name} (${activeUser.roleTitle}) • ${isUserOnShift ? 'On Shift' : 'Off Shift'}`}
              className="relative mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-800 text-xs font-black text-white shadow-sm dark:bg-emerald-700"
            >
              {userInitials}
              <span
                className={`absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                  isUserOnShift ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-xs font-black text-white dark:bg-emerald-600">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-slate-900 dark:text-white">
                    {activeUser.name}
                  </p>
                  <p className="truncate text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    {activeUser.roleTitle}
                  </p>
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-200/80 pt-2 dark:border-slate-700">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-black ${
                    isUserOnShift
                      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-300'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isUserOnShift ? 'animate-pulse bg-emerald-600 dark:bg-emerald-400' : 'bg-amber-500'
                    }`}
                  />
                  {isUserOnShift ? 'On Shift' : 'Off Shift'}
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {visibleHouses.length} Houses
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <FarmContext.Provider value={contextValue}>
      <TabletPreviewShell
        tabletPreviewMode={tabletPreviewMode}
        setTabletPreviewMode={setTabletPreviewMode}
      >
        <div
          className={`app-bg-pattern relative flex min-h-screen flex-col ${
            layoutMode === 'sidebar' ? 'pb-20 lg:pb-6' : 'pb-8'
          }`}
        >
          {/* Persistent Top App Bar */}
          <header
            ref={headerRef}
            className="sticky top-0 z-30 border-b border-emerald-950/10 bg-white/95 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95"
          >
            <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2.5 px-3 py-2.5 sm:px-6">
              {/* Brand Identity + Sidebar Drawer Trigger + Live Clock & Date */}
              <div className="flex min-w-0 flex-wrap items-center gap-2.5 sm:gap-3">
                {layoutMode === 'sidebar' && (
                  <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(true)}
                    aria-label="Open navigation sidebar"
                    className={`${
                      isPortraitPreview ? 'inline-flex' : 'inline-flex lg:hidden'
                    } items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-extrabold text-emerald-900 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300`}
                  >
                    <Menu className="h-4 w-4" />
                    <span className="hidden sm:inline">Menu</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigateTo(navItems[0]?.id || 'log')}
                  className="flex min-w-0 items-center gap-2.5 text-left"
                >
                  <img
                    src="/app-logo.png"
                    alt="AlReefi Logo"
                    className="h-10 w-10 shrink-0 rounded-xl object-contain"
                  />
                  <div className="min-w-0">
                    <h1 className="text-base font-black tracking-tight text-emerald-950 sm:text-lg dark:text-emerald-300">
                      {langDict.appTitle}
                    </h1>
                    <p className="hidden text-[11px] font-bold text-emerald-700 sm:block dark:text-emerald-400">
                      {actorName} ({activeUser.roleTitle})
                    </p>
                  </div>
                </button>

                {/* Live Ticking Clock & Formatted Date next to Brand & Title */}
                <LiveClockDateBadge nowClock={nowClock} activeLangCode={activeLangCode} />
              </div>

              {/* Right Utility Controls: Layout Switcher, Theme, EN/AR, Tablet View, SOS, End Shift, Logout */}
              <div className="flex flex-wrap items-center gap-1.5">
                <LayoutModeSwitcher layoutMode={layoutMode} setLayoutMode={setLayoutMode} />

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

            {/* Layout Mode B: Classic Enterprise Dropdown Menu Bar */}
            {layoutMode === 'dropdown' && (
              <div
                ref={dropdownContainerRef}
                className="border-t border-slate-100 bg-white/95 px-3 py-2 sm:px-6 dark:border-slate-800 dark:bg-slate-900/95"
              >
                <div className="relative mx-auto flex max-w-[1600px] flex-wrap items-center gap-2">
                  {dropdownMenus.map((menu) => {
                    const MenuIcon = menu.icon;
                    const isOpen = openDropdownId === menu.id;
                    const hasActiveChild =
                      menu.type === 'nav' && menu.items.some((item) => item.id === currentNavView);

                    return (
                      <div key={menu.id} className="md:relative">
                        <button
                          type="button"
                          onClick={() => setOpenDropdownId((prev) => (prev === menu.id ? null : menu.id))}
                          aria-expanded={isOpen}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                            isOpen || hasActiveChild
                              ? 'border-emerald-700 bg-emerald-800 text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-600'
                              : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          <MenuIcon className="h-3.5 w-3.5 shrink-0" />
                          <span>{menu.label}</span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {isOpen && (
                          <div
                            className={`absolute top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900 ${
                              menu.id === 'admin'
                                ? 'left-0 right-0 md:left-auto md:right-0 md:w-72'
                                : 'left-0 right-0 md:right-auto md:w-80'
                            }`}
                          >
                            {menu.type === 'houses' ? (
                              <div className="space-y-1">
                                <p className="px-2.5 py-1 text-[10px] font-black tracking-wider text-slate-400 uppercase dark:text-slate-500">
                                  Jump to Broiler House ({visibleHouses.length})
                                </p>
                                {visibleHouses.map((h) => {
                                  const meta = getHouseStatusMeta(h);
                                  const isSelected = selectedHouseId === h.id;
                                  return (
                                    <button
                                      key={h.id}
                                      type="button"
                                      onClick={() => handleQuickJumpHouse(h.id)}
                                      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                                        isSelected
                                          ? 'bg-emerald-50 text-emerald-950 ring-1 ring-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-100 dark:ring-emerald-700'
                                          : 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                                      }`}
                                    >
                                      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-slate-800 dark:text-emerald-300 dark:ring-slate-700">
                                        <BroilerHouseSvgIcon isSilo={meta.isSilo} className="h-6 w-6" />
                                        <span
                                          className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${meta.dotClass}`}
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-black">{h.name}</p>
                                        <p className="truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                          {h.sector} • {meta.phaseText}
                                        </p>
                                      </div>
                                      <span
                                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                                          meta.isSilo
                                            ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/50 dark:text-indigo-300'
                                            : 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-300'
                                        }`}
                                      >
                                        {meta.feedBadge}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <p className="px-2.5 py-1 text-[10px] font-black tracking-wider text-slate-400 uppercase dark:text-slate-500">
                                  {menu.label}
                                </p>
                                {menu.items.map((item) => {
                                  const Icon = item.icon;
                                  const active = currentNavView === item.id;
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => navigateTo(item.id)}
                                      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-extrabold transition ${
                                        active
                                          ? 'bg-emerald-800 text-white dark:bg-emerald-600'
                                          : 'text-slate-800 hover:bg-emerald-50 hover:text-emerald-950 dark:text-slate-200 dark:hover:bg-slate-800'
                                      }`}
                                    >
                                      <span className="flex items-center gap-2.5">
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span>{item.label}</span>
                                      </span>
                                      {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Layout Mode C: Modern Wrapping Icon Pill Bar */}
            {layoutMode === 'topbar' && (
              <nav
                aria-label="Primary navigation"
                className="border-t border-slate-100 bg-white/95 px-3 py-2 sm:px-6 dark:border-slate-800 dark:bg-slate-900/95"
              >
                <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-1.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = currentNavView === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigateTo(item.id)}
                        aria-current={active ? 'page' : undefined}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold transition ${
                          active
                            ? 'bg-emerald-800 text-white shadow-sm dark:bg-emerald-600'
                            : 'border border-slate-200/80 bg-slate-50/80 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>
            )}

            {/* Global Telemetry & Day-Over-Day (+/-) Delta Bar for Management & Supervisors */}
            {(userRole === 'owner' || userRole === 'manager' || userRole === 'supervisor') && (
              <div className="border-t border-slate-100 bg-slate-50/85 px-3 py-1.5 sm:px-6 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-slate-700 shadow-xs ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          liveSensorEnabled ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      {liveSensorEnabled ? 'Live Telemetry' : 'Sensors Paused'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2.5 py-0.5 font-extrabold text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-300">
                      Cycle #{headerTelemetry.activeCycleNum} • {headerTelemetry.flockAgeLabel}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                      <Bird className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                      <span>Live Birds:</span>
                      <strong className="font-black text-slate-900 dark:text-white">
                        {headerTelemetry.liveBirds.toLocaleString()}
                      </strong>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                          headerTelemetry.liveBirdsDelta < 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        }`}
                      >
                        {headerTelemetry.liveBirdsDelta >= 0
                          ? `+${headerTelemetry.liveBirdsDelta}`
                          : headerTelemetry.liveBirdsDelta}{' '}
                        vs yest
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                      <Skull className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                      <span>Mortalities:</span>
                      <strong className="font-black text-slate-900 dark:text-white">
                        {headerTelemetry.mortalitiesToday}
                      </strong>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                          headerTelemetry.mortalitiesDelta > 0
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        }`}
                      >
                        {headerTelemetry.mortalitiesDelta >= 0
                          ? `+${headerTelemetry.mortalitiesDelta}`
                          : headerTelemetry.mortalitiesDelta}{' '}
                        vs yest
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                      <Thermometer className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                      <span>Avg Temp:</span>
                      <strong className="font-black text-slate-900 dark:text-white">
                        {headerTelemetry.avgTempToday}°C
                      </strong>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                          Math.abs(headerTelemetry.avgTempDelta) >= 1.5
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300'
                        }`}
                      >
                        {headerTelemetry.avgTempDelta >= 0
                          ? `+${headerTelemetry.avgTempDelta}°C`
                          : `${headerTelemetry.avgTempDelta}°C`}{' '}
                        vs yest
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </header>

          {/* Body Layout Area */}
          {layoutMode === 'sidebar' ? (
            <div className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-1">
              {/* Desktop & Landscape Tablet Left Sidebar */}
              <aside
                style={{
                  top: `${headerHeight}px`,
                  maxHeight: tabletPreviewMode
                    ? `calc(82vh - ${headerHeight}px)`
                    : `calc(100vh - ${headerHeight}px)`,
                }}
                className={`${
                  isPortraitPreview ? 'hidden' : 'hidden lg:flex'
                } sticky shrink-0 flex-col border-e border-emerald-950/10 bg-white/90 backdrop-blur-md transition-all duration-200 dark:border-slate-800 dark:bg-slate-900/95 ${
                  sidebarCollapsed ? 'w-20' : 'w-64'
                }`}
              >
                {renderSidebarPanel({ isDrawer: false })}
              </aside>

              {/* Mobile / Portrait Tablet Slide-Over Drawer */}
              {mobileSidebarOpen && (
                <div
                  className={`${
                    tabletPreviewMode ? 'absolute inset-0' : 'fixed inset-0'
                  } z-40 flex items-start`}
                >
                  <button
                    type="button"
                    aria-label="Close sidebar overlay"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px]"
                  />
                  <aside
                    className={`relative z-10 flex w-72 max-w-[85vw] flex-col border-e border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 ${
                      tabletPreviewMode ? 'sticky top-0 h-[82vh]' : 'h-full'
                    }`}
                  >
                    {renderSidebarPanel({ isDrawer: true })}
                  </aside>
                </div>
              )}

              {/* Main Content Viewport */}
              <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">
                <div className="mx-auto max-w-7xl">
                  {currentNavView === 'hub' && <GlobalHub />}
                  {currentNavView === 'house' && <PoultryDashboard />}
                  {currentNavView === 'log' && <HealthResourceLog />}
                  {currentNavView === 'tasks' && <TaskVerification />}
                  {currentNavView === 'orders' && <OrdersAndBills />}
                  {currentNavView === 'weights' && <WeightsAndReports />}
                  {currentNavView === 'analytics' && <Analytics />}
                  {currentNavView === 'staff' && <StaffAttendance />}
                  {currentNavView === 'settings' && <StorageSettings />}
                  {currentNavView === 'crops' && <CropDashboard />}
                </div>
              </main>
            </div>
          ) : (
            <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-6 sm:px-6">
              {currentNavView === 'hub' && <GlobalHub />}
              {currentNavView === 'house' && <PoultryDashboard />}
              {currentNavView === 'log' && <HealthResourceLog />}
              {currentNavView === 'tasks' && <TaskVerification />}
              {currentNavView === 'orders' && <OrdersAndBills />}
              {currentNavView === 'weights' && <WeightsAndReports />}
              {currentNavView === 'analytics' && <Analytics />}
              {currentNavView === 'staff' && <StaffAttendance />}
              {currentNavView === 'settings' && <StorageSettings />}
              {currentNavView === 'crops' && <CropDashboard />}
            </main>
          )}

          {/* Mobile / Tablet Portrait Bottom Quick-Nav (Sidebar Mode only) */}
          {layoutMode === 'sidebar' && (
            <nav
              className={`${
                tabletPreviewMode ? 'sticky bottom-0' : 'fixed inset-x-0 bottom-0'
              } ${
                isPortraitPreview ? 'flex' : 'flex lg:hidden'
              } z-30 items-center ${
                navItems.length <= 4 ? 'justify-around' : 'justify-start gap-1 sm:justify-around'
              } overflow-x-auto border-t border-slate-200 bg-white/95 px-2 py-2 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95`}
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
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Global Persistent Emergency Modal */}
          <EmergencyModal />

          {toastBanner}
        </div>
      </TabletPreviewShell>
    </FarmContext.Provider>
  );
}
