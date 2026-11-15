import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Globe,
  History,
  Lock,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  Sliders,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useFarm } from '../App.jsx';

const ROLE_FILTERS = [
  { id: 'all', label: 'All Staff' },
  { id: 'worker', label: 'Worker' },
  { id: 'supervisor', label: 'Supervisor' },
  { id: 'manager', label: 'Manager' },
  { id: 'owner', label: 'Super Admin' },
];

const ROLE_BADGE_MAP = {
  owner: {
    label: 'Super Admin',
    classes:
      'border-purple-200 bg-purple-100 text-purple-900 dark:border-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
  },
  manager: {
    label: 'Manager',
    classes:
      'border-sky-200 bg-sky-100 text-sky-900 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
  },
  supervisor: {
    label: 'Supervisor',
    classes:
      'border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  },
  worker: {
    label: 'Worker',
    classes:
      'border-emerald-200 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  },
};

const SHIFT_PRESETS = {
  '2x12': [
    { id: 'shift-day', label: 'Day Shift', startTime: '06:00', endTime: '18:00', hours: 12 },
    { id: 'shift-night', label: 'Night Shift', startTime: '18:00', endTime: '06:00', hours: 12 },
    { id: 'shift-mgmt', label: 'Management Flex', startTime: '06:00', endTime: '18:00', hours: 12 },
  ],
  '3x8': [
    { id: 'shift-morning', label: 'Morning Shift', startTime: '06:00', endTime: '14:00', hours: 8 },
    { id: 'shift-afternoon', label: 'Afternoon Shift', startTime: '14:00', endTime: '22:00', hours: 8 },
    { id: 'shift-night', label: 'Night Shift', startTime: '22:00', endTime: '06:00', hours: 8 },
    { id: 'shift-mgmt', label: 'Management Flex', startTime: '06:00', endTime: '18:00', hours: 12 },
  ],
};

function formatDateTime(isoStr) {
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

function formatTimeOnly(isoStr) {
  if (!isoStr) return '—';
  const dt = new Date(isoStr);
  if (Number.isNaN(dt.getTime())) return String(isoStr);
  return dt.toLocaleTimeString('en-AE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function StaffAttendance() {
  const {
    state,
    userRole,
    activeUser,
    saveUserAccount,
    deleteUserAccount,
    updateShiftConfig,
    notify,
  } = useFarm();

  const isAuthorized = userRole === 'owner' || userRole === 'manager';

  const [roleFilter, setRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectedUserId, setInspectedUserId] = useState(null);
  const [drawerTab, setDrawerTab] = useState('sessions');

  // Inline Shift Pattern Editor
  const shiftConfig = state.settings?.shiftConfig || {
    mode: '2x12',
    shifts: SHIFT_PRESETS['2x12'],
  };
  const [showShiftEditor, setShowShiftEditor] = useState(false);
  const [shiftDraft, setShiftDraft] = useState(() => ({
    mode: shiftConfig.mode || '2x12',
    shifts: (shiftConfig.shifts || SHIFT_PRESETS['2x12']).map((s) => ({ ...s })),
  }));

  // Add / Edit User Modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    username: '',
    password: '123',
    role: 'worker',
    roleTitle: 'Poultry House Worker',
    shiftId: shiftConfig.shifts?.[0]?.id || 'shift-day',
    phone: '+971 50 ',
    email: '',
    preferredLang: 'en',
    assignedHouseIds: [],
  });

  const userAccounts = state.userAccounts || [];
  const shiftSessions = state.shiftSessions || [];
  const allHouses = useMemo(
    () => (state.houses || []).filter((h) => !h.archived),
    [state.houses]
  );

  const houseLookup = useMemo(() => {
    const map = {};
    for (const h of state.houses || []) {
      map[h.id] = h;
    }
    return map;
  }, [state.houses]);

  const shiftLookup = useMemo(() => {
    const map = {};
    for (const s of shiftConfig.shifts || []) {
      map[s.id] = s;
    }
    return map;
  }, [shiftConfig.shifts]);

  const kpis = useMemo(() => {
    const onShiftCount = userAccounts.filter((u) => u.onShift).length;
    const totalStaff = userAccounts.length;
    const totalHoursToday = userAccounts.reduce((sum, u) => sum + Number(u.hoursToday || 0), 0);
    const totalHoursCycle = userAccounts.reduce((sum, u) => sum + Number(u.hoursCycle || 0), 0);
    const totalHoursWeek = userAccounts.reduce((sum, u) => sum + Number(u.hoursWeek || 0), 0);
    return {
      onShiftCount,
      totalStaff,
      totalHoursToday: Number(totalHoursToday.toFixed(1)),
      totalHoursWeek: Number(totalHoursWeek.toFixed(1)),
      totalHoursCycle: Number(totalHoursCycle.toFixed(1)),
    };
  }, [userAccounts]);

  const roleCounts = useMemo(() => {
    const counts = { all: userAccounts.length, worker: 0, supervisor: 0, manager: 0, owner: 0 };
    for (const u of userAccounts) {
      if (counts[u.role] !== undefined) counts[u.role] += 1;
    }
    return counts;
  }, [userAccounts]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return userAccounts.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      const houseText = (u.assignedHouseIds || [])
        .map((id) => `${houseLookup[id]?.name || ''} ${houseLookup[id]?.code || ''}`)
        .join(' ')
        .toLowerCase();
      return (
        String(u.name || '').toLowerCase().includes(q) ||
        String(u.username || '').toLowerCase().includes(q) ||
        String(u.roleTitle || '').toLowerCase().includes(q) ||
        String(u.phone || '').toLowerCase().includes(q) ||
        String(u.email || '').toLowerCase().includes(q) ||
        houseText.includes(q)
      );
    });
  }, [userAccounts, roleFilter, searchQuery, houseLookup]);

  const inspectedUser = useMemo(
    () => userAccounts.find((u) => u.id === inspectedUserId) || null,
    [userAccounts, inspectedUserId]
  );

  const inspectedActivity = useMemo(() => {
    if (!inspectedUser) {
      return { sessions: [], logs: [], tasks: [], incidents: [] };
    }
    const sessions = shiftSessions
      .filter((s) => s.userId === inspectedUser.id)
      .slice()
      .sort((a, b) => new Date(b.clockInAt || 0) - new Date(a.clockInAt || 0));

    const logs = (state.healthLogs || [])
      .filter((l) => l.userId === inspectedUser.id || l.loggedBy === inspectedUser.name)
      .slice()
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    const tasks = (state.tasks || [])
      .filter(
        (t) =>
          t.assignedTo === inspectedUser.name ||
          t.assignedBy === inspectedUser.name ||
          (t.auditLog || []).some((entry) => entry.actor === inspectedUser.name)
      )
      .slice()
      .sort(
        (a, b) =>
          new Date(b.reviewedAt || b.submittedAt || b.assignedAt || 0) -
          new Date(a.reviewedAt || a.submittedAt || a.assignedAt || 0)
      );

    const incidents = (state.incidentNotes || [])
      .filter((n) => n.userId === inspectedUser.id || n.reportedBy === inspectedUser.name)
      .slice()
      .sort((a, b) => new Date(b.reportedAt || 0) - new Date(a.reportedAt || 0));

    return { sessions, logs, tasks, incidents };
  }, [inspectedUser, shiftSessions, state.healthLogs, state.tasks, state.incidentNotes]);

  if (!isAuthorized) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-white/95 p-8 text-center shadow-sm">
        <Lock className="mx-auto mb-3 h-10 w-10 text-amber-600" />
        <h2 className="text-lg font-black text-slate-900">Restricted Access — Staff &amp; Attendance</h2>
        <p className="mt-1 text-sm font-medium text-slate-600">
          Workforce credentials, shift clock-in history, and multi-house rotation rosters are strictly limited to
          Farm Manager and Super Admin roles.
        </p>
      </div>
    );
  }

  const openShiftEditor = () => {
    setShiftDraft({
      mode: shiftConfig.mode || '2x12',
      shifts: (shiftConfig.shifts || SHIFT_PRESETS['2x12']).map((s) => ({ ...s })),
    });
    setShowShiftEditor((prev) => !prev);
  };

  const handleShiftModeSwitch = (nextMode) => {
    setShiftDraft({
      mode: nextMode,
      shifts: SHIFT_PRESETS[nextMode].map((s) => ({ ...s })),
    });
  };

  const handleShiftFieldChange = (shiftId, field, value) => {
    setShiftDraft((prev) => ({
      ...prev,
      shifts: prev.shifts.map((s) =>
        s.id === shiftId
          ? { ...s, [field]: field === 'hours' ? Number(value || 0) : value }
          : s
      ),
    }));
  };

  const handleSaveShiftConfig = (e) => {
    e.preventDefault();
    updateShiftConfig(shiftDraft);
    setShowShiftEditor(false);
  };

  const openAddUserModal = () => {
    setEditingUserId(null);
    setShowPassword(false);
    setUserForm({
      name: '',
      username: '',
      password: '123',
      role: 'worker',
      roleTitle: 'Poultry Worker',
      shiftId: shiftConfig.shifts?.[0]?.id || 'shift-day',
      phone: '+971 50 ',
      email: '',
      preferredLang: 'en',
      assignedHouseIds: allHouses.filter((h) => h.isActive !== false).slice(0, 1).map((h) => h.id),
    });
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (user) => {
    if (user.role === 'owner' && userRole !== 'owner') {
      notify('Only Super Admin can edit an Owner / Super Admin account.', 'error');
      return;
    }
    setEditingUserId(user.id);
    setShowPassword(false);
    setUserForm({
      name: user.name || '',
      username: user.username || '',
      password: user.password || '123',
      role: user.role || 'worker',
      roleTitle: user.roleTitle || '',
      shiftId: user.shiftId || shiftConfig.shifts?.[0]?.id || 'shift-day',
      phone: user.phone || '',
      email: user.email || '',
      preferredLang: user.preferredLang || 'en',
      assignedHouseIds: [...(user.assignedHouseIds || [])],
    });
    setIsUserModalOpen(true);
  };

  const toggleHouseInModal = (houseId) => {
    setUserForm((prev) => {
      const exists = prev.assignedHouseIds.includes(houseId);
      return {
        ...prev,
        assignedHouseIds: exists
          ? prev.assignedHouseIds.filter((id) => id !== houseId)
          : [...prev.assignedHouseIds, houseId],
      };
    });
  };

  const handleSaveUserSubmit = (e) => {
    e.preventDefault();
    const cleanName = userForm.name.trim();
    const cleanUsername = userForm.username.trim().toLowerCase().replace(/\s+/g, '');
    const cleanPassword = userForm.password.trim();

    if (!cleanName || !cleanUsername || !cleanPassword) {
      notify('Full Name, Username, and Password are required.', 'error');
      return;
    }

    const duplicateUsername = userAccounts.find(
      (u) => u.id !== editingUserId && String(u.username || '').toLowerCase() === cleanUsername
    );
    if (duplicateUsername) {
      notify(`Username "@${cleanUsername}" is already assigned to ${duplicateUsername.name}.`, 'error');
      return;
    }

    if (userForm.role === 'owner' && userRole !== 'owner') {
      notify('Only Super Admin can assign the Owner / Super Admin role.', 'error');
      return;
    }

    saveUserAccount({
      ...(editingUserId ? { id: editingUserId } : {}),
      name: cleanName,
      username: cleanUsername,
      password: cleanPassword,
      role: userForm.role,
      roleTitle: userForm.roleTitle.trim() || ROLE_BADGE_MAP[userForm.role]?.label || 'Farm Staff',
      shiftId: userForm.shiftId,
      phone: userForm.phone.trim(),
      email: userForm.email.trim(),
      preferredLang: userForm.preferredLang,
      assignedHouseIds: userForm.assignedHouseIds,
    });
    setIsUserModalOpen(false);
  };

  const handleDeleteUser = (user) => {
    if (user.role === 'owner') {
      notify('Owner / Super Admin accounts cannot be deleted.', 'error');
      return;
    }
    if (user.id === activeUser?.id) {
      notify('You cannot delete your own active session account.', 'error');
      return;
    }
    if (inspectedUserId === user.id) {
      setInspectedUserId(null);
    }
    deleteUserAccount(user.id);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-800 text-white shadow-sm">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Staff Directory, Shift Attendance &amp; House Rotations
                </h2>
                <p className="text-xs font-medium text-slate-600">
                  Manage farm credentials, multi-house assignments, 2×12h / 3×8h shift timings, and click-in shift audit logs
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openShiftEditor}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-extrabold text-slate-800 transition hover:bg-emerald-50"
            >
              <Sliders className="h-3.5 w-3.5 text-emerald-700" />
              Shift Pattern ({shiftConfig.mode === '3x8' ? '3×8h' : '2×12h'})
            </button>
            <button
              type="button"
              onClick={openAddUserModal}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-900 active:scale-95"
            >
              <UserPlus className="h-4 w-4" />
              Add Staff Account
            </button>
          </div>
        </div>

        {/* Top Workforce KPIs */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wide text-emerald-900 uppercase">
                Currently On Shift
              </span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
              </span>
            </div>
            <p className="mt-1.5 text-2xl font-black text-emerald-950">
              {kpis.onShiftCount}
              <span className="ml-1.5 text-xs font-bold text-emerald-700">/ {kpis.totalStaff}</span>
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-emerald-800">Active clocked-in staff</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wide text-slate-600 uppercase">
                Total Staff Accounts
              </span>
              <Users className="h-4 w-4 text-slate-500" />
            </div>
            <p className="mt-1.5 text-2xl font-black text-slate-900">{kpis.totalStaff}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
              {roleCounts.worker} Workers • {roleCounts.supervisor} Sup • {roleCounts.manager + roleCounts.owner} Mgmt
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wide text-slate-600 uppercase">
                Total Hours Today
              </span>
              <Clock className="h-4 w-4 text-sky-600" />
            </div>
            <p className="mt-1.5 text-2xl font-black text-slate-900">{kpis.totalHoursToday}h</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
              This Week: {kpis.totalHoursWeek}h
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wide text-slate-600 uppercase">
                Total Cycle Hours
              </span>
              <Calendar className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="mt-1.5 text-2xl font-black text-slate-900">{kpis.totalHoursCycle}h</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
              Cycle 13 cumulative logged
            </p>
          </div>

          <div className="col-span-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wide text-amber-900 uppercase">
                Active Shift Pattern
              </span>
              <button
                type="button"
                onClick={openShiftEditor}
                className="text-[11px] font-extrabold text-amber-800 underline hover:text-amber-950"
              >
                {showShiftEditor ? 'Close' : 'Edit'}
              </button>
            </div>
            <p className="mt-1.5 text-xl font-black text-amber-950">
              {shiftConfig.mode === '3x8' ? '3 × 8h Shifts' : '2 × 12h Shifts'}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-amber-800">
              {(shiftConfig.shifts || [])
                .slice(0, 2)
                .map((s) => `${s.label.split(' ')[0]} ${s.startTime}-${s.endTime}`)
                .join(' • ')}
            </p>
          </div>
        </div>

        {/* Inline Shift Pattern Editor */}
        {showShiftEditor && (
          <form
            onSubmit={handleSaveShiftConfig}
            className="mt-4 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Configure Farm Shift Schedule (2×12h vs 3×8h)
                </h3>
                <p className="text-xs text-slate-600">
                  Changes sync immediately across worker clock-in gates and attendance punctuality tracking.
                </p>
              </div>
              <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => handleShiftModeSwitch('2x12')}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                    shiftDraft.mode === '2x12'
                      ? 'bg-emerald-800 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  2 × 12h (Day / Night)
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftModeSwitch('3x8')}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                    shiftDraft.mode === '3x8'
                      ? 'bg-emerald-800 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  3 × 8h (Morning / Afternoon / Night)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {shiftDraft.shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={shift.label}
                      onChange={(e) => handleShiftFieldChange(shift.id, 'label', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-extrabold text-slate-900"
                      placeholder="Shift Label"
                    />
                    <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                      {shift.hours}h
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] font-bold text-slate-500 uppercase">
                        Start
                      </label>
                      <input
                        type="time"
                        value={shift.startTime}
                        onChange={(e) => handleShiftFieldChange(shift.id, 'startTime', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] font-bold text-slate-500 uppercase">
                        End
                      </label>
                      <input
                        type="time"
                        value={shift.endTime}
                        onChange={(e) => handleShiftFieldChange(shift.id, 'endTime', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] font-bold text-slate-500 uppercase">
                        Hours
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={shift.hours}
                        onChange={(e) => handleShiftFieldChange(shift.id, 'hours', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowShiftEditor(false)}
                className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-5 py-1.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-900"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Save Shift Timing
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Filters & Search Bar */}
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {ROLE_FILTERS.map((rf) => {
              const active = roleFilter === rf.id;
              return (
                <button
                  key={rf.id}
                  type="button"
                  onClick={() => setRoleFilter(rf.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                    active
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50'
                  }`}
                >
                  <span>{rf.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {roleCounts[rf.id] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, @username, house..."
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pr-8 pl-9 text-xs font-semibold text-slate-900 focus:border-emerald-700 focus:bg-white focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Directory Table / Cards */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-extrabold tracking-wide text-slate-500 uppercase">
                <th className="py-3 pr-3 pl-2">Staff Member</th>
                <th className="px-3 py-3">Role &amp; Shift</th>
                <th className="px-3 py-3">Shift Status</th>
                <th className="px-3 py-3">Assigned Houses</th>
                <th className="px-3 py-3 text-right">Today / Wk / Cycle</th>
                <th className="py-3 pr-2 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const roleMeta = ROLE_BADGE_MAP[user.role] || ROLE_BADGE_MAP.worker;
                const shiftMeta = shiftLookup[user.shiftId];
                const isSelected = inspectedUserId === user.id;
                const canEdit = user.role !== 'owner' || userRole === 'owner';
                const canDelete = user.role !== 'owner' && user.id !== activeUser?.id;

                return (
                  <tr
                    key={user.id}
                    onClick={() => {
                      setInspectedUserId(user.id);
                      setDrawerTab('sessions');
                    }}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 pr-3 pl-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-black text-white shadow-sm ${
                            user.onShift ? 'bg-emerald-700' : 'bg-slate-500'
                          }`}
                        >
                          {String(user.name || 'U')
                            .split(' ')
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-extrabold text-slate-900">{user.name}</p>
                            {user.id === activeUser?.id && (
                              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                YOU
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-500">
                            @{user.username} • {user.phone || 'No phone'} • {(user.preferredLang || 'en').toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${roleMeta.classes}`}
                      >
                        {user.role === 'owner' && <ShieldCheck className="h-3 w-3" />}
                        {roleMeta.label}
                      </span>
                      <p className="mt-1 text-xs font-semibold text-slate-700">{user.roleTitle}</p>
                      <p className="text-[11px] text-slate-500">
                        {shiftMeta ? `${shiftMeta.label} (${shiftMeta.startTime}-${shiftMeta.endTime})` : user.shiftId}
                      </p>
                    </td>

                    <td className="px-3 py-3.5">
                      {user.onShift ? (
                        <div>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-900">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                            </span>
                            On Shift
                          </span>
                          <p className="mt-1 text-[11px] font-semibold text-emerald-800">
                            In @ {formatTimeOnly(user.clockedInAt)}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold text-slate-600">
                            <span className="h-2 w-2 rounded-full bg-slate-400" />
                            Off Shift
                          </span>
                          <p className="mt-1 text-[11px] text-slate-500">Clocked out</p>
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-3.5">
                      <div className="flex max-w-[230px] flex-wrap gap-1">
                        {(user.assignedHouseIds || []).length === 0 ? (
                          <span className="text-xs text-slate-400 italic">No houses assigned</span>
                        ) : (
                          user.assignedHouseIds.map((hid) => {
                            const h = houseLookup[hid];
                            return (
                              <span
                                key={hid}
                                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold ${
                                  h?.isActive === false
                                    ? 'border-slate-200 bg-slate-100 text-slate-500'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                }`}
                              >
                                H{h?.code || hid.replace('house-', '')}
                                {h?.feedSystemType === 'silo' ? '•S' : h ? '•B' : ''}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-3.5 text-right">
                      <p className="text-sm font-black text-slate-900">{Number(user.hoursToday || 0).toFixed(1)}h</p>
                      <p className="text-[11px] font-semibold text-slate-500">
                        Wk: {Number(user.hoursWeek || 0).toFixed(1)}h • Cyc: {Number(user.hoursCycle || 0).toFixed(1)}h
                      </p>
                    </td>

                    <td
                      className="py-3.5 pr-2 pl-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setInspectedUserId(user.id);
                            setDrawerTab('sessions');
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-extrabold text-emerald-900 transition hover:bg-emerald-100"
                        >
                          <History className="h-3.5 w-3.5" />
                          Inspect History
                        </button>

                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => openEditUserModal(user)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100"
                            title="Edit User"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-2 py-1.5 text-[10px] font-bold text-slate-500"
                            title="Super Admin Only"
                          >
                            <Lock className="h-3 w-3" />
                            Owner
                          </span>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 p-1.5 text-red-700 transition hover:bg-red-100"
                            title={`Delete ${user.name}`}
                            aria-label={`Delete ${user.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm font-semibold text-slate-500">
                    No staff accounts match your current role filter or search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] font-semibold text-slate-500">
          Tip: Click any staff row or &ldquo;Inspect History&rdquo; to audit exact clock-in/out sessions, submitted shift logs, and completed tasks.
        </p>
      </div>

      {/* Interactive Click-In Attendance & Activity Slide-Over Drawer */}
      {inspectedUser && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/55 backdrop-blur-xs"
          onClick={() => setInspectedUserId(null)}
        >
          <aside
            className="flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Attendance and activity audit for ${inspectedUser.name}`}
          >
            {/* Drawer Header */}
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black text-white shadow-sm ${
                      inspectedUser.onShift ? 'bg-emerald-700' : 'bg-slate-600'
                    }`}
                  >
                    {String(inspectedUser.name || 'U')
                      .split(' ')
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">{inspectedUser.name}</h3>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${
                          (ROLE_BADGE_MAP[inspectedUser.role] || ROLE_BADGE_MAP.worker).classes
                        }`}
                      >
                        {(ROLE_BADGE_MAP[inspectedUser.role] || ROLE_BADGE_MAP.worker).label}
                      </span>
                      {inspectedUser.onShift ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          On Shift
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
                          Off Shift
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-slate-600">
                      @{inspectedUser.username} • {inspectedUser.roleTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {(inspectedUser.role !== 'owner' || userRole === 'owner') && (
                    <button
                      type="button"
                      onClick={() => openEditUserModal(inspectedUser)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setInspectedUserId(null)}
                    className="rounded-full p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                    aria-label="Close staff inspection drawer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Quick Meta & Hours Row */}
              <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Today</p>
                  <p className="text-base font-black text-slate-900">
                    {Number(inspectedUser.hoursToday || 0).toFixed(1)}h
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">This Week</p>
                  <p className="text-base font-black text-slate-900">
                    {Number(inspectedUser.hoursWeek || 0).toFixed(1)}h
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Cycle 13</p>
                  <p className="text-base font-black text-slate-900">
                    {Number(inspectedUser.hoursCycle || 0).toFixed(1)}h
                  </p>
                </div>
                <div className="col-span-3 rounded-xl border border-slate-200 bg-white p-2.5 sm:col-span-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Sessions</p>
                  <p className="text-base font-black text-emerald-800">
                    {inspectedActivity.sessions.length} logged
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-semibold border border-slate-200">
                  <Phone className="h-3.5 w-3.5 text-emerald-700" />
                  {inspectedUser.phone || '—'}
                </span>
                {inspectedUser.email && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-semibold border border-slate-200">
                    <Mail className="h-3.5 w-3.5 text-sky-600" />
                    {inspectedUser.email}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-semibold border border-slate-200">
                  <Globe className="h-3.5 w-3.5 text-indigo-600" />
                  Lang: {(inspectedUser.preferredLang || 'en').toUpperCase()}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-semibold border border-slate-200">
                  <Building2 className="h-3.5 w-3.5 text-emerald-700" />
                  Houses:{' '}
                  {(inspectedUser.assignedHouseIds || []).length > 0
                    ? inspectedUser.assignedHouseIds
                        .map((id) => `H${houseLookup[id]?.code || id.replace('house-', '')}`)
                        .join(', ')
                    : 'None'}
                </span>
              </div>

              {/* Drawer Sub-Tabs */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {[
                  {
                    id: 'sessions',
                    label: `Shift Sessions (${inspectedActivity.sessions.length})`,
                    icon: Clock,
                  },
                  {
                    id: 'logs',
                    label: `Submitted Daily Logs (${inspectedActivity.logs.length})`,
                    icon: FileText,
                  },
                  {
                    id: 'tasks',
                    label: `Tasks & Audits (${inspectedActivity.tasks.length + inspectedActivity.incidents.length})`,
                    icon: ClipboardCheck,
                  },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDrawerTab(t.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                        drawerTab === t.id
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-emerald-50'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {drawerTab === 'sessions' && (
                <>
                  {inspectedActivity.sessions.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-xs font-semibold text-slate-500">
                      No clock-in / clock-out sessions recorded yet for {inspectedUser.name}.
                    </div>
                  ) : (
                    inspectedActivity.sessions.map((sess) => {
                      const isLate =
                        Number(sess.lateMinutes || 0) > 5 ||
                        String(sess.punctualityStatus || '').toLowerCase().includes('late');
                      const isActiveNow = !sess.clockOutAt;
                      return (
                        <div
                          key={sess.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-extrabold text-slate-900">
                                {sess.shiftLabel || 'Shift Session'}
                              </p>
                              <p className="text-[11px] font-semibold text-slate-500">
                                Date: {sess.date} • Scheduled Start: {sess.scheduledStart || '—'}
                              </p>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${
                                isLate
                                  ? 'border-amber-200 bg-amber-100 text-amber-900'
                                  : 'border-emerald-200 bg-emerald-100 text-emerald-900'
                              }`}
                            >
                              {isLate ? (
                                <AlertTriangle className="h-3 w-3" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              {sess.punctualityStatus || 'On Time'}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-xs">
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">
                                Clock In
                              </span>
                              <span className="font-bold text-slate-900">
                                {formatDateTime(sess.clockInAt)}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">
                                Clock Out
                              </span>
                              <span
                                className={`font-bold ${
                                  isActiveNow ? 'text-emerald-700' : 'text-slate-900'
                                }`}
                              >
                                {isActiveNow ? 'Active On Shift' : formatDateTime(sess.clockOutAt)}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">
                                Duration
                              </span>
                              <span className="font-black text-slate-900">
                                {Number(sess.durationHours || 0).toFixed(1)} hrs
                              </span>
                            </div>
                          </div>

                          {(sess.assignedHouseIds || []).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {sess.assignedHouseIds.map((hid) => (
                                <span
                                  key={hid}
                                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600"
                                >
                                  {houseLookup[hid]?.name || hid}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {drawerTab === 'logs' && (
                <>
                  {inspectedActivity.logs.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-xs font-semibold text-slate-500">
                      No daily health/resource logs recorded by {inspectedUser.name}.
                    </div>
                  ) : (
                    inspectedActivity.logs.map((log) => {
                      const house = houseLookup[log.houseId];
                      return (
                        <div
                          key={log.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-emerald-800 px-2 py-0.5 text-[11px] font-black text-white">
                                H{house?.code || log.houseId}
                              </span>
                              <span className="text-sm font-extrabold text-slate-900">
                                {house?.name || log.houseId}
                              </span>
                              <span className="text-xs font-semibold text-slate-500">
                                • {log.shift}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {log.locked && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                  <Lock className="h-2.5 w-2.5" />
                                  Locked
                                </span>
                              )}
                              <span className="text-[11px] font-semibold text-slate-500">
                                {formatDateTime(log.timestamp)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2.5 grid grid-cols-4 gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-xs">
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">
                                Dead / Culls
                              </span>
                              <span className="font-extrabold text-red-700">
                                {log.mortalities ?? 0} / {log.culls ?? 0}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">
                                Temp
                              </span>
                              <span className="font-extrabold text-slate-900">
                                {log.manualTempC ?? '—'}°C
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">
                                Feed
                              </span>
                              <span className="font-extrabold text-slate-900">
                                {house?.feedSystemType === 'silo'
                                  ? 'Silo Auto'
                                  : `${log.feedBags ?? Math.round((log.feedKg || 0) / 50)} bags`}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">
                                Water
                              </span>
                              <span className="font-extrabold text-sky-700">
                                {log.waterGallons ?? Math.round((log.waterLiters || 0) / 3.78541)} gal
                              </span>
                            </div>
                          </div>

                          {log.note && (
                            <p className="mt-2 text-xs font-medium text-slate-700">
                              &ldquo;{log.note}&rdquo;
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {drawerTab === 'tasks' && (
                <div className="space-y-4">
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-black tracking-wide text-slate-500 uppercase">
                      Tasks Assigned / Submitted / Reviewed ({inspectedActivity.tasks.length})
                    </h4>
                    {inspectedActivity.tasks.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-xs font-semibold text-slate-500">
                        No tasks linked to {inspectedUser.name}.
                      </div>
                    ) : (
                      inspectedActivity.tasks.map((task) => {
                        const h = task.houseId ? houseLookup[task.houseId] : null;
                        const statusColor =
                          task.status === 'Reviewed'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                            : task.status === 'Submitted'
                            ? 'bg-sky-100 text-sky-900 border-sky-200'
                            : 'bg-amber-100 text-amber-900 border-amber-200';
                        return (
                          <div
                            key={task.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {task.taskCode && (
                                  <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-black text-white">
                                    Task #{task.taskCode}
                                  </span>
                                )}
                                {task.jobNumber && (
                                  <span className="rounded-md bg-emerald-800 px-2 py-0.5 text-[10px] font-black text-white">
                                    Job #{task.jobNumber}
                                  </span>
                                )}
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${statusColor}`}
                                >
                                  {task.status}
                                </span>
                              </div>
                              <span className="text-[11px] font-semibold text-slate-500">
                                {h ? `${h.name}` : `Role: ${task.targetRole || 'All'}`}
                              </span>
                            </div>

                            <p className="mt-1.5 text-sm font-extrabold text-slate-900">{task.title}</p>
                            <p className="mt-0.5 text-[11px] font-semibold text-slate-600">
                              Assigned: {formatDateTime(task.assignedAt)}
                              {task.submittedAt ? ` • Submitted: ${formatDateTime(task.submittedAt)}` : ''}
                              {task.reviewedAt ? ` • Reviewed: ${formatDateTime(task.reviewedAt)}` : ''}
                            </p>
                            {task.workerNote && (
                              <p className="mt-1.5 rounded-xl bg-white px-2.5 py-1.5 text-xs text-slate-700 border border-slate-200">
                                <span className="font-bold">Worker Note:</span> {task.workerNote}
                              </p>
                            )}
                            {task.reviewNote && (
                              <p className="mt-1 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-900 border border-emerald-200">
                                <span className="font-bold">Review Note:</span> {task.reviewNote}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {inspectedActivity.incidents.length > 0 && (
                    <div className="space-y-2.5 pt-2">
                      <h4 className="text-xs font-black tracking-wide text-slate-500 uppercase">
                        Incident / Anomaly Notes Reported ({inspectedActivity.incidents.length})
                      </h4>
                      {inspectedActivity.incidents.map((inc) => (
                        <div
                          key={inc.id}
                          className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-amber-900">
                              {houseLookup[inc.houseId]?.name || inc.houseId} — {inc.category}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {formatDateTime(inc.reportedAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-medium text-slate-700">{inc.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {isUserModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-modal-title"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-white">
                  {editingUserId ? <UserCheck className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                </span>
                <div>
                  <h3 id="staff-modal-title" className="text-base font-black text-slate-900">
                    {editingUserId ? 'Edit Staff Account & House Assignment' : 'Create New Staff Account'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure login credentials, role tier, shift schedule, and multi-house rotation access
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close staff account modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserSubmit} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={userForm.name}
                    onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Tariq Al-Mazrouei"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Username <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={userForm.username}
                    onChange={(e) => setUserForm((p) => ({ ...p, username: e.target.value }))}
                    placeholder="e.g. ahmed"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Password <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={userForm.password}
                      onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 py-2 pr-10 pl-3 text-sm font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Role Tier
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
                  >
                    <option value="worker">Worker (Field Operator)</option>
                    <option value="supervisor">Supervisor (Senior Worker)</option>
                    <option value="manager">Manager (Farm Operations)</option>
                    {userRole === 'owner' && (
                      <option value="owner">Super Admin / Owner (Full Access)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Role Title
                  </label>
                  <input
                    type="text"
                    value={userForm.roleTitle}
                    onChange={(e) => setUserForm((p) => ({ ...p, roleTitle: e.target.value }))}
                    placeholder="e.g. Poultry Worker (Silo Houses)"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Assigned Shift
                  </label>
                  <select
                    value={userForm.shiftId}
                    onChange={(e) => setUserForm((p) => ({ ...p, shiftId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
                  >
                    {(shiftConfig.shifts || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} ({s.startTime} - {s.endTime})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={userForm.phone}
                    onChange={(e) => setUserForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+971 50 000 0000"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="staff@alreefi.ae"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Preferred Language
                  </label>
                  <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
                    {[
                      { id: 'en', label: 'English (EN)' },
                      { id: 'ar', label: 'العربية (Arabic)' },
                    ].map((lang) => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => setUserForm((p) => ({ ...p, preferredLang: lang.id }))}
                        className={`rounded-full px-4 py-1.5 text-xs font-extrabold transition ${
                          userForm.preferredLang === lang.id
                            ? 'bg-emerald-800 text-white shadow-xs'
                            : 'text-slate-700 hover:bg-white'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Multi-Select House Assignment */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase">
                      Multi-House Rotation Assignment ({userForm.assignedHouseIds.length} selected)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Select one or multiple broiler houses this staff member can access and rotate across.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setUserForm((p) => ({
                          ...p,
                          assignedHouseIds: allHouses
                            .filter((h) => h.isActive !== false)
                            .map((h) => h.id),
                        }))
                      }
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-900 hover:bg-emerald-100"
                    >
                      Select All Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserForm((p) => ({ ...p, assignedHouseIds: [] }))}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {allHouses.map((house) => {
                    const checked = userForm.assignedHouseIds.includes(house.id);
                    return (
                      <label
                        key={house.id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition ${
                          checked
                            ? 'border-emerald-600 bg-emerald-50/80 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleHouseInModal(house.id)}
                            className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                          />
                          <div>
                            <p className="text-xs font-extrabold text-slate-900">
                              {house.name} ({house.code})
                            </p>
                            <p className="text-[10px] font-semibold text-slate-500">
                              {house.sector} •{' '}
                              {house.feedSystemType === 'silo' ? 'Silo (20T)' : 'Bags (50kg)'}
                              {house.isActive === false ? ' • Offline' : ''}
                            </p>
                          </div>
                        </div>
                        {checked && <CheckCircle2 className="h-4 w-4 text-emerald-700" />}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="rounded-full border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-6 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-900"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {editingUserId ? 'Update Staff Account' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
