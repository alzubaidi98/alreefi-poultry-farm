import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  FilePlus2,
  History,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Tag,
  Thermometer,
  UserCheck,
} from 'lucide-react';
import { TASK_CATEGORY_PREFIXES } from '../mockData.js';
import { compressImageFile } from '../services/storageService.js';
import { useFarm } from '../App.jsx';

const SHIFT_OPTIONS = [
  'Day Shift (06:00-18:00)',
  'Night Shift (18:00-06:00)',
  'Role Task',
];

function formatShortTimestamp(iso) {
  if (!iso) return 'Pending';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getAuditTimestamp(task, stageKeys) {
  const direct =
    stageKeys.includes('assigned')
      ? task.assignedAt
      : stageKeys.includes('submitted')
      ? task.submittedAt
      : task.reviewedAt;
  if (direct) return direct;
  const entry = (task.auditLog || []).find((item) => {
    const actionLower = String(item.action || '').toLowerCase();
    return stageKeys.some((k) => actionLower.includes(k));
  });
  return entry?.timestamp || null;
}

export default function TaskVerification() {
  const {
    state,
    userRole,
    activeUser,
    activeWorker,
    visibleHouses,
    addTaskTemplate,
    createTask,
    bulkAssignTemplate,
    submitTaskForVerification,
    reviewTask,
    notify,
  } = useFarm();

  const currentUser = activeUser || activeWorker || null;
  const isManagement = userRole === 'owner' || userRole === 'manager';

  // Panels
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [showFreeTaskPanel, setShowFreeTaskPanel] = useState(false);

  // Filters
  const [prefixFilter, setPrefixFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [houseFilter, setHouseFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedJob, setHighlightedJob] = useState(null);

  // Active houses available for assignment
  const activeHouses = useMemo(
    () => (state.houses || []).filter((h) => !h.archived && h.isActive !== false),
    [state.houses]
  );

  // Dynamic shift options including configured shifts from settings
  const availableShifts = useMemo(() => {
    const configured = (state.settings?.shiftConfig?.shifts || [])
      .filter((s) => s.id !== 'shift-mgmt')
      .map((s) => `${s.label} (${s.startTime}-${s.endTime})`);
    const merged = [...configured, ...SHIFT_OPTIONS];
    return Array.from(new Set(merged));
  }, [state.settings?.shiftConfig]);

  // Template Library & Bulk Assign state
  const templates = state.taskTemplates || [];
  const [selectedTemplateId, setSelectedTemplateId] = useState(() => templates[0]?.id || '');
  const [bulkHouseIds, setBulkHouseIds] = useState(() =>
    activeHouses.filter((h) => h.phase !== 'cleaning').map((h) => h.id)
  );
  const [bulkShiftLabel, setBulkShiftLabel] = useState(SHIFT_OPTIONS[0]);
  const [bulkDueDate, setBulkDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [templatePrefixFilter, setTemplatePrefixFilter] = useState('All');
  const [showNewTemplateForm, setShowNewTemplateForm] = useState(false);
  const [newTplDraft, setNewTplDraft] = useState({
    prefix: 'C',
    taskNumber: '',
    title: '',
    defaultScope: 'house',
    defaultRoleTarget: 'Supervisor',
  });

  // Ad-Hoc Free Task state
  const [freeTask, setFreeTask] = useState({
    categoryPrefix: 'C',
    customTaskNumber: '',
    title: '',
    assignmentScope: 'house', // 'house' | 'role'
    houseId: activeHouses[0]?.id || visibleHouses[0]?.id || 'house-1',
    shiftLabel: SHIFT_OPTIONS[0],
    assignedRole: 'Supervisor',
    assignedTo: '',
    dueDate: new Date().toISOString().slice(0, 10),
    note: '',
    saveAsTemplate: false,
  });

  // Per-task submission inputs (mandatory temperature, completion note, optional photo)
  const [workerTempInputs, setWorkerTempInputs] = useState({});
  const [workerNoteInputs, setWorkerNoteInputs] = useState({});
  const [workerPhotoInputs, setWorkerPhotoInputs] = useState({});

  // Per-task management review note
  const [reviewNotes, setReviewNotes] = useState({});
  const [expandedAuditId, setExpandedAuditId] = useState(null);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || templates[0] || null,
    [templates, selectedTemplateId]
  );

  const filteredTemplates = useMemo(() => {
    if (templatePrefixFilter === 'All') return templates;
    return templates.filter(
      (t) => (t.prefix || t.categoryPrefix || '').toUpperCase() === templatePrefixFilter
    );
  }, [templates, templatePrefixFilter]);

  // Suggest next 3-digit task number for ad-hoc Free Task
  const suggestedTaskNum = useMemo(() => {
    const prefix = freeTask.categoryPrefix || 'C';
    const nums = [
      ...(state.taskTemplates || []),
      ...(state.tasks || []),
    ]
      .filter((item) => {
        const p = (item.prefix || item.categoryPrefix || item.taskCode?.split('-')?.[0] || '').toUpperCase();
        return p === prefix;
      })
      .map((item) => {
        const raw = item.taskNumber || item.taskCode?.split('-')?.[1] || '0';
        return parseInt(String(raw).replace(/\D/g, ''), 10) || 0;
      });
    const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
    return String(maxNum + 1).padStart(3, '0');
  }, [freeTask.categoryPrefix, state.taskTemplates, state.tasks]);

  const previewTaskCode = `${freeTask.categoryPrefix}-${
    freeTask.customTaskNumber.trim()
      ? String(freeTask.customTaskNumber.trim()).padStart(3, '0')
      : suggestedTaskNum
  }`;

  const staffOptions = useMemo(() => {
    const accounts = state.userAccounts || state.workerProfiles || [];
    return accounts;
  }, [state.userAccounts, state.workerProfiles]);

  // Scoped tasks by role + active filters
  const scopedTasks = useMemo(() => {
    return (state.tasks || []).filter((task) => {
      const scope = task.assignmentScope || (task.targetRole || task.assignedRole ? 'role' : 'house');
      const targetRole = String(task.targetRole || task.assignedRole || '').toLowerCase();

      if (userRole === 'worker' && currentUser) {
        if (scope === 'role' && targetRole && targetRole !== 'worker') {
          if (task.assignedTo !== currentUser.name) return false;
        }
        const assignedHouses = currentUser.assignedHouseIds || [];
        const assignedHouseMatch = task.houseId ? assignedHouses.includes(task.houseId) : false;
        const assignedNameMatch = task.assignedTo === currentUser.name;
        if (!assignedHouseMatch && !assignedNameMatch) return false;
      }

      if (userRole === 'supervisor' && currentUser) {
        const assignedHouses = currentUser.assignedHouseIds || [];
        const assignedHouseMatch = task.houseId ? assignedHouses.includes(task.houseId) : false;
        const assignedNameMatch = task.assignedTo === currentUser.name;
        const roleMatch = scope === 'role' && targetRole === 'supervisor';
        if (!assignedHouseMatch && !assignedNameMatch && !roleMatch) return false;
      }

      const taskPrefix = (
        task.categoryPrefix ||
        task.prefix ||
        task.taskCode?.split('-')?.[0] ||
        TASK_CATEGORY_PREFIXES.find((c) => c.category === task.category)?.prefix ||
        ''
      ).toUpperCase();

      if (prefixFilter !== 'All' && taskPrefix !== prefixFilter) return false;
      if (statusFilter !== 'All' && task.status !== statusFilter) return false;
      if (houseFilter !== 'All' && task.houseId !== houseFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const haystack = [
          task.title,
          task.taskCode,
          task.jobNumber,
          task.category,
          task.assignedTo,
          task.targetRole,
          task.assignedRole,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [state.tasks, userRole, currentUser, prefixFilter, statusFilter, houseFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    const all = state.tasks || [];
    return {
      total: all.length,
      assigned: all.filter((t) => t.status === 'Assigned').length,
      submitted: all.filter((t) => t.status === 'Submitted').length,
      reviewed: all.filter((t) => t.status === 'Reviewed').length,
    };
  }, [state.tasks]);

  const handleToggleBulkHouse = (houseId) => {
    setBulkHouseIds((prev) =>
      prev.includes(houseId) ? prev.filter((id) => id !== houseId) : [...prev, houseId]
    );
  };

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    if (tpl.defaultScope === 'role') {
      setBulkShiftLabel('Role Task');
    } else if (bulkShiftLabel === 'Role Task') {
      setBulkShiftLabel(availableShifts[0] || SHIFT_OPTIONS[0]);
    }
  };

  const handleCreateTemplateOnly = (e) => {
    e.preventDefault();
    if (!newTplDraft.title.trim()) return;
    const prefixMeta =
      TASK_CATEGORY_PREFIXES.find((p) => p.prefix === newTplDraft.prefix) ||
      TASK_CATEGORY_PREFIXES[0];
    const created = addTaskTemplate({
      prefix: prefixMeta.prefix,
      category: prefixMeta.category,
      taskNumber: newTplDraft.taskNumber.trim() || undefined,
      title: newTplDraft.title.trim(),
      defaultScope: newTplDraft.defaultScope,
      defaultRoleTarget:
        newTplDraft.defaultScope === 'role' ? newTplDraft.defaultRoleTarget : null,
    });
    if (created?.id) {
      handleSelectTemplate(created);
    }
    setNewTplDraft({
      prefix: 'C',
      taskNumber: '',
      title: '',
      defaultScope: 'house',
      defaultRoleTarget: 'Supervisor',
    });
    setShowNewTemplateForm(false);
  };

  const handleBulkAssign = (e) => {
    e.preventDefault();
    if (!selectedTemplate) {
      notify('Please select a task template first.', 'error');
      return;
    }
    const isRoleTemplate = selectedTemplate.defaultScope === 'role';
    if (!isRoleTemplate && bulkHouseIds.length === 0) {
      notify('Select at least one target broiler house for bulk assignment.', 'error');
      return;
    }
    bulkAssignTemplate({
      templateId: selectedTemplate.id,
      houseIds: isRoleTemplate && bulkShiftLabel === 'Role Task' ? [] : bulkHouseIds,
      shiftLabel: bulkShiftLabel,
      dueDate: bulkDueDate,
    });
  };

  const handleCreateFreeTask = (e) => {
    e.preventDefault();
    if (!freeTask.title.trim()) return;

    const prefixMeta =
      TASK_CATEGORY_PREFIXES.find((p) => p.prefix === freeTask.categoryPrefix) ||
      TASK_CATEGORY_PREFIXES[0];
    const cleanNum = freeTask.customTaskNumber.trim()
      ? String(freeTask.customTaskNumber.trim()).padStart(3, '0')
      : suggestedTaskNum;
    const taskCode = `${prefixMeta.prefix}-${cleanNum}`;

    const isRoleScope = freeTask.assignmentScope === 'role';
    const assignedTarget = freeTask.assignedTo.trim()
      ? freeTask.assignedTo.trim()
      : isRoleScope
      ? freeTask.assignedRole
      : `${freeTask.shiftLabel.split(' ')[0]} Crew`;

    createTask({
      title: freeTask.title.trim(),
      category: prefixMeta.category,
      prefix: prefixMeta.prefix,
      taskNumber: cleanNum,
      taskCode,
      assignmentScope: freeTask.assignmentScope,
      houseId: isRoleScope ? null : freeTask.houseId,
      shiftLabel: isRoleScope ? 'Role Task' : freeTask.shiftLabel,
      targetRole: isRoleScope ? freeTask.assignedRole : null,
      assignedTo: assignedTarget,
      dueDate: freeTask.dueDate,
      note: freeTask.note.trim(),
      saveAsTemplate: freeTask.saveAsTemplate,
    });

    setFreeTask((prev) => ({
      ...prev,
      customTaskNumber: '',
      title: '',
      note: '',
      saveAsTemplate: false,
    }));
    setShowFreeTaskPanel(false);
  };

  const handleAttachPhoto = async (taskId, file) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setWorkerPhotoInputs((prev) => ({ ...prev, [taskId]: compressed }));
      notify('Photo proof compressed and attached to job.', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleWorkerSubmit = (task) => {
    const tempVal = workerTempInputs[task.id];
    if (tempVal === undefined || tempVal === '' || Number.isNaN(Number(tempVal))) {
      notify('Mandatory manual house temperature (°C) must be entered before submitting.', 'error');
      return;
    }
    submitTaskForVerification({
      taskId: task.id,
      manualTempC: Number(tempVal),
      workerNote: (workerNoteInputs[task.id] || '').trim(),
      photoProof: workerPhotoInputs[task.id] || task.photoProof || null,
    });
  };

  const handleReviewAction = (task, spawnFollowUp) => {
    const noteVal = (reviewNotes[task.id] || '').trim();
    if (spawnFollowUp && !noteVal) {
      notify('Please enter a brief Review Note explaining what the follow-up job should address.', 'error');
      return;
    }
    reviewTask({
      taskId: task.id,
      reviewNote: noteVal || 'Verified and signed off by Management.',
      spawnFollowUp,
    });
    setReviewNotes((prev) => ({ ...prev, [task.id]: '' }));
  };

  const handleJumpToFollowUp = (jobNum) => {
    if (!jobNum) return;
    setStatusFilter('All');
    setPrefixFilter('All');
    setHouseFilter('All');
    setSearchQuery(jobNum);
    setHighlightedJob(jobNum);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Reviewed':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Submitted':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Assigned':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Buttons */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-slate-900">
              Task Library, Job Dispatch &amp; 3-Timestamp Audit
            </h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-900">
              Assigned &rarr; Submitted &rarr; Reviewed
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-600">
            Dual-ID tracking (<code className="font-bold">Task #</code> template code + sequential{' '}
            <code className="font-bold">Job #</code> instance) with immutable closure &amp; follow-up spawning
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Status Metrics */}
          <div className="hidden items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 xl:flex">
            <span>{statusCounts.assigned} Assigned</span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-700">{statusCounts.submitted} Submitted</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700">{statusCounts.reviewed} Reviewed</span>
          </div>

          {isManagement && (
            <>
              <button
                type="button"
                onClick={() => {
                  setShowTemplatePanel((v) => !v);
                  setShowFreeTaskPanel(false);
                }}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-extrabold shadow-sm transition ${
                  showTemplatePanel
                    ? 'bg-emerald-900 text-white'
                    : 'border-2 border-emerald-800 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                <Layers className="h-4 w-4" />
                Template Library &amp; Bulk Assign
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFreeTaskPanel((v) => !v);
                  setShowTemplatePanel(false);
                }}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition ${
                  showFreeTaskPanel ? 'bg-slate-900' : 'bg-emerald-800 hover:bg-emerald-900'
                }`}
              >
                <Plus className="h-4 w-4" />
                Create Free Task
              </button>
            </>
          )}
        </div>
      </div>

      {/* PANEL 1: Predefined Template Library & Bulk Assign (Management Only) */}
      {isManagement && showTemplatePanel && (
        <section className="space-y-5 rounded-3xl border-2 border-emerald-200 bg-white/95 p-5 shadow-md">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="flex items-center gap-2 text-base font-black text-slate-900">
                <Layers className="h-4 w-4 text-emerald-700" />
                Master Task Template Library &amp; Multi-House Bulk Assign
              </h3>
              <p className="text-xs text-slate-500">
                Select a standardized SOP template (`C`, `W`, `F`, `V`, `B`, `M`, `S`) and dispatch sequential Job # instances across multiple houses at once.
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setTemplatePrefixFilter('All')}
                className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                  templatePrefixFilter === 'All'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({templates.length})
              </button>
              {TASK_CATEGORY_PREFIXES.map((cat) => (
                <button
                  key={cat.prefix}
                  type="button"
                  onClick={() => setTemplatePrefixFilter(cat.prefix)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                    templatePrefixFilter === cat.prefix
                      ? 'bg-emerald-800 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat.prefix} · {cat.category}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Template Library Selector */}
            <div className="space-y-2.5 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-extrabold tracking-wide text-slate-600 uppercase">
                  1. Choose Template ({filteredTemplates.length} Available)
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewTemplateForm((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-900 hover:bg-emerald-100"
                >
                  <Plus className="h-3 w-3" />
                  {showNewTemplateForm ? 'Close New Template' : '+ New Template'}
                </button>
              </div>

              {showNewTemplateForm && (
                <form
                  onSubmit={handleCreateTemplateOnly}
                  className="grid grid-cols-1 gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 sm:grid-cols-4"
                >
                  <select
                    value={newTplDraft.prefix}
                    onChange={(e) => setNewTplDraft((p) => ({ ...p, prefix: e.target.value }))}
                    className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                  >
                    {TASK_CATEGORY_PREFIXES.map((c) => (
                      <option key={c.prefix} value={c.prefix}>
                        {c.prefix} · {c.category}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="Auto #"
                    value={newTplDraft.taskNumber}
                    onChange={(e) =>
                      setNewTplDraft((p) => ({
                        ...p,
                        taskNumber: e.target.value.replace(/\D/g, ''),
                      }))
                    }
                    className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                  />
                  <select
                    value={newTplDraft.defaultScope}
                    onChange={(e) =>
                      setNewTplDraft((p) => ({ ...p, defaultScope: e.target.value }))
                    }
                    className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                  >
                    <option value="house">House-Level SOP</option>
                    <option value="role">Role-Level (Supervisor)</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-800 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-900"
                  >
                    Save Template
                  </button>
                  <input
                    type="text"
                    required
                    placeholder="New master SOP template title..."
                    value={newTplDraft.title}
                    onChange={(e) => setNewTplDraft((p) => ({ ...p, title: e.target.value }))}
                    className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold sm:col-span-4"
                  />
                </form>
              )}

              <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {filteredTemplates.map((tpl) => {
                  const code =
                    tpl.taskCode || `${tpl.prefix || tpl.categoryPrefix || 'T'}-${tpl.taskNumber || '001'}`;
                  const isSelected = selectedTemplate?.id === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        isSelected
                          ? 'border-emerald-700 bg-emerald-50 ring-2 ring-emerald-700/20'
                          : 'border-slate-200 bg-slate-50 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-lg bg-slate-900 px-2 py-0.5 text-[11px] font-black text-white">
                          Task #{code}
                        </span>
                        <div className="flex items-center gap-1">
                          {tpl.defaultScope === 'role' && (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-900">
                              Role: {tpl.defaultRoleTarget || 'Supervisor'}
                            </span>
                          )}
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                            {tpl.category}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1.5 text-xs font-extrabold text-slate-900 line-clamp-2">
                        {tpl.title}
                      </p>
                      {(tpl.instructions || tpl.note || tpl.description) && (
                        <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                          {tpl.instructions || tpl.note || tpl.description}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bulk Assign Controls */}
            <form
              onSubmit={handleBulkAssign}
              className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:col-span-5"
            >
              <p className="text-xs font-extrabold tracking-wide text-slate-700 uppercase">
                2. Target Houses, Shift &amp; Dispatch
              </p>

              {selectedTemplate && (
                <div className="rounded-xl border border-emerald-200 bg-white p-3">
                  <p className="text-[11px] font-extrabold text-emerald-800 uppercase">
                    Selected: Task #{selectedTemplate.taskCode || `${selectedTemplate.prefix}-${selectedTemplate.taskNumber}`}
                  </p>
                  <p className="text-xs font-bold text-slate-900">{selectedTemplate.title}</p>
                </div>
              )}

              {selectedTemplate?.defaultScope === 'role' && bulkShiftLabel === 'Role Task' ? (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs font-semibold text-indigo-900">
                  Role-Level Dispatch: assigns 1 supervisory job to{' '}
                  <strong>{selectedTemplate.defaultRoleTarget || 'Supervisor'}</strong> (Job #00-xxx).
                </div>
              ) : (
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-700">
                      Target Houses ({bulkHouseIds.length} selected)
                    </label>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => setBulkHouseIds(activeHouses.map((h) => h.id))}
                        className="rounded-md bg-white px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-slate-200 hover:bg-emerald-50"
                      >
                        All Active
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setBulkHouseIds(
                            activeHouses.filter((h) => h.feedSystemType === 'bags').map((h) => h.id)
                          )
                        }
                        className="rounded-md bg-white px-2 py-0.5 text-[10px] font-extrabold text-slate-700 border border-slate-200 hover:bg-slate-100"
                      >
                        Bag Houses
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setBulkHouseIds(
                            activeHouses.filter((h) => h.feedSystemType === 'silo').map((h) => h.id)
                          )
                        }
                        className="rounded-md bg-white px-2 py-0.5 text-[10px] font-extrabold text-slate-700 border border-slate-200 hover:bg-slate-100"
                      >
                        Silo Houses
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkHouseIds([])}
                        className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {activeHouses.map((h) => {
                      const checked = bulkHouseIds.includes(h.id);
                      return (
                        <label
                          key={h.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-bold transition ${
                            checked
                              ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleBulkHouse(h.id)}
                            className="h-4 w-4 accent-emerald-800"
                          />
                          <span className="truncate">
                            {h.name} ({h.code})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Shift / Scope</label>
                  <select
                    value={bulkShiftLabel}
                    onChange={(e) => setBulkShiftLabel(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900"
                  >
                    {availableShifts.map((sh) => (
                      <option key={sh} value={sh}>
                        {sh}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Due Date</label>
                  <input
                    type="date"
                    value={bulkDueDate}
                    onChange={(e) => setBulkDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowTemplatePanel(false)}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-900"
                >
                  <Send className="h-3.5 w-3.5" />
                  Bulk Assign Jobs (
                  {selectedTemplate?.defaultScope === 'role' && bulkShiftLabel === 'Role Task'
                    ? 1
                    : bulkHouseIds.length}
                  )
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* PANEL 2: Ad-Hoc Free Task Creation + Save as Template Checkbox */}
      {isManagement && showFreeTaskPanel && (
        <form
          onSubmit={handleCreateFreeTask}
          className="space-y-4 rounded-3xl border-2 border-emerald-200 bg-white/95 p-5 shadow-md"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-black text-slate-900">
                <FilePlus2 className="h-4 w-4 text-emerald-700" />
                Create Ad-Hoc Free Task
              </h3>
              <p className="text-xs text-slate-500">
                Assign either a House-Level Routine Job or a Role-Level Supervisory/Management Task, optionally saving it into the Master Template Library.
              </p>
            </div>
            <span className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-black text-white">
              Preview ID: Task #{previewTaskCode}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Category Prefix</label>
              <select
                value={freeTask.categoryPrefix}
                onChange={(e) => setFreeTask((p) => ({ ...p, categoryPrefix: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold"
              >
                {TASK_CATEGORY_PREFIXES.map((item) => (
                  <option key={item.prefix} value={item.prefix}>
                    {item.prefix} — {item.category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Task # (Optional, auto: {suggestedTaskNum})
              </label>
              <input
                type="text"
                maxLength={4}
                value={freeTask.customTaskNumber}
                onChange={(e) =>
                  setFreeTask((p) => ({ ...p, customTaskNumber: e.target.value.replace(/\D/g, '') }))
                }
                placeholder={`Auto (${suggestedTaskNum})`}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-700">Task Title*</label>
              <input
                type="text"
                required
                value={freeTask.title}
                onChange={(e) => setFreeTask((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g., Inspect cooling pad sump pumps & flush end drinkers"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
              />
            </div>

            {/* Assignment Scope Selector */}
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Assignment Scope</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setFreeTask((p) => ({ ...p, assignmentScope: 'house' }))}
                  className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition ${
                    freeTask.assignmentScope === 'house'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <Building2 className="h-4 w-4 shrink-0 text-emerald-700" />
                  <div>
                    <p className="text-xs font-extrabold">House-Level Routine Task</p>
                    <p className="text-[11px] text-slate-500">Assigned to a specific Broiler House &amp; Shift</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFreeTask((p) => ({ ...p, assignmentScope: 'role' }))}
                  className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition ${
                    freeTask.assignmentScope === 'role'
                      ? 'border-indigo-700 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <UserCheck className="h-4 w-4 shrink-0 text-indigo-700" />
                  <div>
                    <p className="text-xs font-extrabold">Role-Level Supervisory / Management Task</p>
                    <p className="text-[11px] text-slate-500">Assigned directly to Supervisor or Farm Manager role</p>
                  </div>
                </button>
              </div>
            </div>

            {freeTask.assignmentScope === 'house' ? (
              <>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Target House</label>
                  <select
                    value={freeTask.houseId}
                    onChange={(e) => setFreeTask((p) => ({ ...p, houseId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold"
                  >
                    {activeHouses.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Shift</label>
                  <select
                    value={freeTask.shiftLabel}
                    onChange={(e) => setFreeTask((p) => ({ ...p, shiftLabel: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold"
                  >
                    {availableShifts
                      .filter((s) => s !== 'Role Task')
                      .map((sh) => (
                        <option key={sh} value={sh}>
                          {sh}
                        </option>
                      ))}
                  </select>
                </div>
              </>
            ) : (
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Target Role</label>
                <select
                  value={freeTask.assignedRole}
                  onChange={(e) => setFreeTask((p) => ({ ...p, assignedRole: e.target.value }))}
                  className="w-full rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-900"
                >
                  <option value="Supervisor">Supervisor</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Specific Assignee (Optional)</label>
              <select
                value={freeTask.assignedTo}
                onChange={(e) => setFreeTask((p) => ({ ...p, assignedTo: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold"
              >
                <option value="">Auto (House Shift / Role Queue)</option>
                {staffOptions.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.role || 'Worker'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Due Date</label>
              <input
                type="date"
                value={freeTask.dueDate}
                onChange={(e) => setFreeTask((p) => ({ ...p, dueDate: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="mb-1 block text-xs font-bold text-slate-700">Instructions / Checklist Notes</label>
              <input
                type="text"
                value={freeTask.note}
                onChange={(e) => setFreeTask((p) => ({ ...p, note: e.target.value }))}
                placeholder="Specific verification criteria or SOP steps..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs font-extrabold text-emerald-950">
            <input
              type="checkbox"
              checked={freeTask.saveAsTemplate}
              onChange={(e) => setFreeTask((p) => ({ ...p, saveAsTemplate: e.target.checked }))}
              className="h-4 w-4 accent-emerald-800"
            />
            Save this Free Task into Master Template Library (`Task #{previewTaskCode}`)
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowFreeTaskPanel(false)}
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-emerald-800 px-6 py-2 text-xs font-extrabold text-white hover:bg-emerald-900"
            >
              Publish Job
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="space-y-3 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPrefixFilter('All')}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                prefixFilter === 'All'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {TASK_CATEGORY_PREFIXES.map((cat) => (
              <button
                key={cat.prefix}
                type="button"
                onClick={() => setPrefixFilter(cat.prefix)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  prefixFilter === cat.prefix
                    ? 'bg-emerald-800 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat.prefix} · {cat.category}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {['All', 'Assigned', 'Submitted', 'Reviewed'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedJob(null);
              }}
              placeholder="Search by Job # (e.g. 01-001-04), Task # (C-001), title, or assignee..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-8 text-xs font-semibold text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>
          {isManagement && (
            <select
              value={houseFilter}
              onChange={(e) => setHouseFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800"
            >
              <option value="All">All Houses &amp; Roles</option>
              {activeHouses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.code})
                </option>
              ))}
            </select>
          )}
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setHighlightedJob(null);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* Tasks / Jobs List */}
      <div className="space-y-4">
        {scopedTasks.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 text-center shadow-sm">
            <ClipboardList className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-2 text-sm font-bold text-slate-700">No jobs match the current filter.</p>
          </div>
        ) : (
          scopedTasks.map((task) => {
            const house = (state.houses || []).find((h) => h.id === task.houseId);
            const roleTarget = task.targetRole || task.assignedRole;
            const isRoleTask =
              task.assignmentScope === 'role' || Boolean(roleTarget) || !task.houseId;
            const prefix =
              task.categoryPrefix ||
              task.prefix ||
              task.taskCode?.split('-')?.[0] ||
              TASK_CATEGORY_PREFIXES.find((c) => c.category === task.category)?.prefix ||
              'T';
            const taskNum = String(task.taskNumber || task.taskCode?.split('-')?.[1] || '001').padStart(3, '0');
            const taskCodeBadge = task.taskCode || `${prefix}-${taskNum}`;
            const jobNumberBadge =
              task.jobNumber ||
              `${String(house?.code || '00').replace(/\D/g, '').padStart(2, '0')}-${taskNum}-01`;

            const assignmentLabel = isRoleTask
              ? `Role: ${roleTarget || task.assignedTo || 'Supervisor'}`
              : `House ${house?.code || task.houseId} • ${(task.shiftLabel || 'Day Shift').split(' (')[0]}`;
            const parentJobRef = task.parentJobNumber || task.followUpOfJobNumber;

            const canSubmit = task.status === 'Assigned';
            const attachedPhoto = workerPhotoInputs[task.id] || task.photoProof;
            const isAuditOpen = expandedAuditId === task.id;
            const isHighlighted = highlightedJob && highlightedJob === jobNumberBadge;

            const assignedTs = getAuditTimestamp(task, ['assigned']);
            const submittedTs = getAuditTimestamp(task, ['submitted']);
            const reviewedTs = getAuditTimestamp(task, ['reviewed']);

            return (
              <article
                key={task.id}
                className={`rounded-3xl border bg-white/95 p-5 shadow-sm backdrop-blur-sm transition ${
                  isHighlighted
                    ? 'border-2 border-emerald-600 ring-4 ring-emerald-500/15'
                    : task.status === 'Submitted'
                    ? 'border-amber-300'
                    : task.status === 'Reviewed'
                    ? 'border-emerald-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    {/* Dual ID Badges + Assignment & Status Tags */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-black text-white">
                        <Tag className="h-3 w-3" />
                        Task #{taskCodeBadge}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-900">
                        Job #{jobNumberBadge}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                          isRoleTask
                            ? 'bg-indigo-100 text-indigo-900'
                            : 'bg-sky-100 text-sky-900'
                        }`}
                      >
                        {assignmentLabel}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                        {task.category}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${getStatusBadge(
                          task.status
                        )}`}
                      >
                        {task.status}
                      </span>
                      {parentJobRef && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-900">
                          Follow-Up of Job #{parentJobRef}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2.5 text-base font-extrabold text-slate-900">{task.title}</h3>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                      Assigned to <strong>{task.assignedTo}</strong> by {task.assignedBy} • Due {task.dueDate}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedAuditId(isAuditOpen ? null : task.id)}
                    className="inline-flex items-center gap-1.5 self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    <History className="h-3.5 w-3.5" />
                    Audit Trail ({task.auditLog?.length || 0})
                  </button>
                </div>

                {/* Submission Details when Submitted or Reviewed */}
                {(task.status === 'Submitted' || task.status === 'Reviewed') && (
                  <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-slate-800">
                        Recorded House Temperature:{' '}
                        <span className="rounded-lg bg-emerald-100 px-2 py-0.5 font-black text-emerald-900">
                          {task.manualTempC}°C
                        </span>
                        {task.submittedBy && (
                          <span className="ml-2 text-slate-500">by {task.submittedBy}</span>
                        )}
                      </p>
                      <p className="text-slate-700">
                        <strong>Completion Note:</strong> {task.workerNote || 'Completed per SOP.'}
                      </p>
                    </div>
                    {task.photoProof && (
                      <img
                        src={task.photoProof}
                        alt="Job proof"
                        className="h-20 w-28 rounded-xl border border-slate-200 object-cover"
                      />
                    )}
                  </div>
                )}

                {/* Reviewed Permanent Sign-Off & Follow-Up Link */}
                {task.status === 'Reviewed' && (
                  <div className="mt-3 flex flex-col justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs sm:flex-row sm:items-center">
                    <div>
                      <p className="flex items-center gap-1.5 font-extrabold text-emerald-950">
                        <ShieldCheck className="h-4 w-4 text-emerald-700" />
                        Reviewed &amp; Closed {task.reviewedBy ? `by ${task.reviewedBy}` : ''}
                      </p>
                      {task.reviewNote && (
                        <p className="mt-0.5 font-medium text-emerald-900">
                          <strong>Review Note:</strong> {task.reviewNote}
                        </p>
                      )}
                    </div>
                    {task.followUpJobNumber && (
                      <button
                        type="button"
                        onClick={() => handleJumpToFollowUp(task.followUpJobNumber)}
                        className="inline-flex items-center gap-1.5 self-start rounded-full border border-amber-300 bg-amber-100 px-3 py-1.5 text-[11px] font-extrabold text-amber-950 hover:bg-amber-200"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Follow-Up Job #{task.followUpJobNumber}
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Stage 1 -> Stage 2: Worker / Supervisor Job Submission Form */}
                {canSubmit && (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                    <p className="mb-2 text-xs font-extrabold text-emerald-950 uppercase">
                      Complete &amp; Submit Job #{jobNumberBadge}
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                      <div>
                        <label className="mb-1 flex items-center gap-1 text-[11px] font-bold text-slate-700">
                          <Thermometer className="h-3.5 w-3.5 text-emerald-700" />
                          House Temp (°C)*
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="e.g. 28.5"
                          value={workerTempInputs[task.id] ?? ''}
                          onChange={(e) =>
                            setWorkerTempInputs((p) => ({ ...p, [task.id]: e.target.value }))
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[11px] font-bold text-slate-700">
                          Completion Note
                        </label>
                        <input
                          type="text"
                          placeholder="Describe action taken..."
                          value={workerNoteInputs[task.id] ?? ''}
                          onChange={(e) =>
                            setWorkerNoteInputs((p) => ({ ...p, [task.id]: e.target.value }))
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                          <Camera className="h-4 w-4 text-emerald-700" />
                          {attachedPhoto ? 'Photo OK' : 'Photo'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleAttachPhoto(task.id, e.target.files?.[0])}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleWorkerSubmit(task)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-800 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-900"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Submit Job
                        </button>
                      </div>
                    </div>
                    {attachedPhoto && (
                      <img
                        src={attachedPhoto}
                        alt="Attached proof preview"
                        className="mt-3 h-20 w-28 rounded-xl border border-slate-200 object-cover"
                      />
                    )}
                  </div>
                )}

                {/* Stage 2 -> Stage 3: Permanent Review Actions (Mark Reviewed / Re-Assign Follow-Up) */}
                {task.status === 'Submitted' && isManagement && (
                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={reviewNotes[task.id] ?? ''}
                        onChange={(e) =>
                          setReviewNotes((prev) => ({ ...prev, [task.id]: e.target.value }))
                        }
                        placeholder="Review Note (required if spawning a follow-up job)..."
                        className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-700 focus:outline-none"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleReviewAction(task, false)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-900"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Mark Reviewed
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewAction(task, true)}
                          className="inline-flex items-center gap-1.5 rounded-full border-2 border-amber-500 bg-amber-50 px-4 py-2 text-xs font-extrabold text-amber-950 hover:bg-amber-100"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Mark Reviewed + Re-Assign Follow-Up
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expandable 3-Timestamp Audit & Follow-Up Timeline */}
                {isAuditOpen && (
                  <div className="mt-4 space-y-3 border-t border-slate-200 pt-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs">
                        <p className="text-[10px] font-extrabold text-slate-500 uppercase">
                          1. Assigned Timestamp
                        </p>
                        <p className="mt-0.5 font-bold text-slate-900">
                          {formatShortTimestamp(assignedTs)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-xs">
                        <p className="text-[10px] font-extrabold text-amber-800 uppercase">
                          2. Submitted Timestamp
                        </p>
                        <p className="mt-0.5 font-bold text-slate-900">
                          {formatShortTimestamp(submittedTs)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs">
                        <p className="text-[10px] font-extrabold text-emerald-800 uppercase">
                          3. Reviewed Timestamp
                        </p>
                        <p className="mt-0.5 font-bold text-slate-900">
                          {formatShortTimestamp(reviewedTs)}
                        </p>
                      </div>
                    </div>

                    {task.followUpJobNumber && (
                      <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs">
                        <span className="font-bold text-amber-950">
                          Spawned Sequential Follow-Up Instance: <strong>Job #{task.followUpJobNumber}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleJumpToFollowUp(task.followUpJobNumber)}
                          className="font-extrabold text-emerald-800 underline hover:text-emerald-950"
                        >
                          Filter to Job #{task.followUpJobNumber}
                        </button>
                      </div>
                    )}

                    <p className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                      Immutable Accountability Log
                    </p>
                    {(task.auditLog || []).map((entry, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3 py-2 text-xs"
                      >
                        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <div>
                          <p className="font-bold text-slate-800">
                            {entry.action} — {entry.actor}{' '}
                            <span className="font-normal text-slate-500">
                              ({new Date(entry.timestamp).toLocaleString()})
                            </span>
                            {entry.manualTempC !== undefined && entry.manualTempC !== null && (
                              <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-900">
                                {entry.manualTempC}°C
                              </span>
                            )}
                          </p>
                          {entry.note && <p className="text-slate-600">{entry.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
