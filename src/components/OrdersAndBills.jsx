import { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  FileImage,
  FileText,
  History,
  MessageCircle,
  Paperclip,
  Plus,
  Receipt,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { ORDER_BILL_CATEGORIES } from '../mockData.js';
import { readAttachmentFile } from '../services/storageService.js';
import { useFarm } from '../App.jsx';

function sanitizeDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function makeSampleSvgAttachment(title, subtitle, accent = '#065f46') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="240" viewBox="0 0 420 240"><rect width="420" height="240" rx="18" fill="#f8fafc"/><rect x="16" y="16" width="388" height="208" rx="12" fill="#ffffff" stroke="${accent}" stroke-width="3"/><text x="34" y="56" font-family="Arial,sans-serif" font-size="18" font-weight="bold" fill="#0f172a">${title}</text><text x="34" y="84" font-family="Arial,sans-serif" font-size="13" fill="#475569">${subtitle}</text><line x1="34" y1="106" x2="386" y2="106" stroke="#cbd5e1" stroke-width="2"/><text x="34" y="138" font-family="Arial,sans-serif" font-size="12" font-weight="bold" fill="${accent}">ALREEFI FARM ACCOUNTING • VERIFIED DOCUMENT</text><text x="34" y="166" font-family="Arial,sans-serif" font-size="11" fill="#64748b">Generated ${new Date().toLocaleDateString()} • AED Currency</text></svg>`;
  return {
    name: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`,
    mimeType: 'image/svg+xml',
    sizeBytes: svg.length,
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
  };
}

export default function OrdersAndBills() {
  const {
    state,
    userRole,
    createOrderBill,
    markOrderBillPaid,
    recordOrderWhatsappNotified,
    notify,
  } = useFarm();

  const isOwner = userRole === 'owner';
  const isAuthorized = userRole === 'owner' || userRole === 'manager';

  const houses = useMemo(
    () => (state.houses || []).filter((h) => !h.archived),
    [state.houses]
  );

  const superAdminPhone = useMemo(() => {
    const ownerAcct = (state.userAccounts || []).find((u) => u.role === 'owner');
    const ownerRec = (state.reportSchedule?.recipients || []).find((r) =>
      String(r.roleTitle || r.name || '').toLowerCase().includes('owner') ||
      String(r.roleTitle || r.name || '').toLowerCase().includes('super admin')
    );
    return ownerAcct?.phone || ownerRec?.phone || '+971 50 100 0001';
  }, [state.userAccounts, state.reportSchedule]);

  const [viewMode, setViewMode] = useState('all'); // 'all' | 'pending' | 'paid_history'
  const [houseFilter, setHouseFilter] = useState('ALL_FILTER');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Manager Order / Bill Form State
  const [orderForm, setOrderForm] = useState({
    title: '',
    category: ORDER_BILL_CATEGORIES[0],
    quantity: '1',
    unit: 'Tons',
    unitPriceAed: '',
    totalCostAed: '',
    supplierName: 'Alain Farms Feed Mill',
    assignedAllHouses: false,
    assignedHouseIds: [houses[0]?.id || 'house-1'],
    notes: '',
    managerBillAttachment: null,
  });

  // Payment Settlement Modal (Super Admin)
  const [payingOrder, setPayingOrder] = useState(null);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [paymentNote, setPaymentNote] = useState('');

  // Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState(null);

  // WhatsApp notification preview modal / confirmation
  const [lastCreatedOrder, setLastCreatedOrder] = useState(null);

  const orders = useMemo(() => state.ordersAndBills || [], [state.ordersAndBills]);

  // Compute summary metrics & per-house paid allocations
  const metrics = useMemo(() => {
    let totalPaidAed = 0;
    let totalPendingAed = 0;
    let paidCount = 0;
    let pendingCount = 0;

    const perHouse = {};
    houses.forEach((h) => {
      perHouse[h.id] = { house: h, paidAed: 0, pendingAed: 0, orderCount: 0 };
    });
    perHouse.FARM_WIDE = {
      house: { id: 'FARM_WIDE', name: 'Farm-Wide / Shared', code: 'ALL' },
      paidAed: 0,
      pendingAed: 0,
      orderCount: 0,
    };

    const activeHouseIds = houses.filter((h) => h.isActive !== false).map((h) => h.id);

    orders.forEach((ord) => {
      const cost = Number(ord.totalCostAed || 0);
      const isPaid = ord.status === 'Paid';
      if (isPaid) {
        totalPaidAed += cost;
        paidCount += 1;
      } else {
        totalPendingAed += cost;
        pendingCount += 1;
      }

      const targets = ord.assignedHouseIds || [];
      if (targets.includes('ALL') || targets.length === 0) {
        perHouse.FARM_WIDE.orderCount += 1;
        if (isPaid) perHouse.FARM_WIDE.paidAed += cost;
        else perHouse.FARM_WIDE.pendingAed += cost;
      } else {
        const validTargets = targets.filter((id) => perHouse[id]);
        const divisor = Math.max(1, validTargets.length || activeHouseIds.length);
        const share = cost / divisor;
        validTargets.forEach((hId) => {
          perHouse[hId].orderCount += 1;
          if (isPaid) perHouse[hId].paidAed += share;
          else perHouse[hId].pendingAed += share;
        });
      }
    });

    return {
      totalPaidAed,
      totalPendingAed,
      totalOverallAed: totalPaidAed + totalPendingAed,
      paidCount,
      pendingCount,
      perHouseList: Object.values(perHouse),
    };
  }, [orders, houses]);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (viewMode === 'pending' && ord.status !== 'Pending') return false;
      if (viewMode === 'paid_history' && ord.status !== 'Paid') return false;
      if (categoryFilter !== 'ALL' && ord.category !== categoryFilter) return false;
      if (houseFilter !== 'ALL_FILTER') {
        if (houseFilter === 'FARM_WIDE') {
          if (!(ord.assignedHouseIds || []).includes('ALL')) return false;
        } else {
          const targets = ord.assignedHouseIds || [];
          if (!targets.includes(houseFilter) && !targets.includes('ALL')) return false;
        }
      }
      return true;
    });
  }, [orders, viewMode, categoryFilter, houseFilter]);

  if (!isAuthorized) {
    return (
      <div className="rounded-3xl bg-white/95 p-8 text-center shadow-sm dark:bg-slate-800/95">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Orders &amp; Bills management is restricted to Farm Manager and Super Admin accounts.
        </p>
      </div>
    );
  }

  const handleToggleAssignedHouse = (houseId) => {
    setOrderForm((prev) => {
      const exists = prev.assignedHouseIds.includes(houseId);
      const next = exists
        ? prev.assignedHouseIds.filter((id) => id !== houseId)
        : [...prev.assignedHouseIds, houseId];
      return { ...prev, assignedAllHouses: false, assignedHouseIds: next };
    });
  };

  const handleManagerFileUpload = async (file) => {
    if (!file) return;
    try {
      const attached = await readAttachmentFile(file);
      setOrderForm((prev) => ({ ...prev, managerBillAttachment: attached }));
      notify(`Attached ${attached.name} to order request.`, 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handlePaymentFileUpload = async (file) => {
    if (!file) return;
    try {
      const attached = await readAttachmentFile(file);
      setPaymentReceipt(attached);
      notify(`Payment receipt ${attached.name} ready.`, 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleSubmitOrder = (e) => {
    e.preventDefault();
    const qty = Math.max(0.1, Number(orderForm.quantity || 1));
    const unitPrice = Number(orderForm.unitPriceAed || 0);
    const totalCost =
      Number(orderForm.totalCostAed || 0) > 0
        ? Number(orderForm.totalCostAed)
        : Math.round(qty * unitPrice);

    if (!orderForm.title.trim()) {
      notify('Enter an order or bill description.', 'warning');
      return;
    }
    if (totalCost <= 0) {
      notify('Enter a valid Total Cost (AED) or Unit Price.', 'warning');
      return;
    }
    if (!orderForm.assignedAllHouses && orderForm.assignedHouseIds.length === 0) {
      notify('Assign this bill to at least one Broiler House or select Farm-Wide.', 'warning');
      return;
    }

    const created = createOrderBill({
      title: orderForm.title.trim(),
      category: orderForm.category,
      quantity: qty,
      unit: orderForm.unit.trim() || 'Units',
      unitPriceAed: unitPrice > 0 ? unitPrice : Number((totalCost / qty).toFixed(2)),
      totalCostAed: totalCost,
      assignedHouseIds: orderForm.assignedAllHouses ? ['ALL'] : orderForm.assignedHouseIds,
      supplierName: orderForm.supplierName.trim() || 'Vendor / Supplier',
      managerBillAttachment: orderForm.managerBillAttachment,
      notes: orderForm.notes.trim(),
    });

    setLastCreatedOrder(created);
    setOrderForm({
      title: '',
      category: ORDER_BILL_CATEGORIES[0],
      quantity: '1',
      unit: 'Tons',
      unitPriceAed: '',
      totalCostAed: '',
      supplierName: 'Alain Farms Feed Mill',
      assignedAllHouses: false,
      assignedHouseIds: [houses[0]?.id || 'house-1'],
      notes: '',
      managerBillAttachment: null,
    });
    setShowCreateForm(false);
  };

  const buildSuperAdminWhatsAppUrl = (ord) => {
    const houseNames = (ord.assignedHouseIds || []).includes('ALL')
      ? 'All Houses (Farm-Wide)'
      : (ord.assignedHouseIds || [])
          .map((id) => houses.find((h) => h.id === id)?.name || id)
          .join(', ');

    const lines = [
      `*AlReefi Farm — New Order / Bill Request*`,
      `Code: ${ord.orderCode}`,
      `Item: ${ord.title}`,
      `Category: ${ord.category} • Qty: ${ord.quantity} ${ord.unit}`,
      `Total Cost: AED ${Number(ord.totalCostAed || 0).toLocaleString()}`,
      `Assigned Houses: ${houseNames}`,
      `Supplier: ${ord.supplierName || 'N/A'}`,
      `Bill Attached: ${ord.managerBillAttachment ? ord.managerBillAttachment.name : 'No attachment'}`,
      ``,
      `Please review in the AlReefi App (Orders & Bills tab) and mark as Paid once settled.`,
    ];
    const digits = sanitizeDigits(superAdminPhone);
    return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join('\n'))}`;
  };

  const handleConfirmPayment = (e) => {
    e.preventDefault();
    if (!payingOrder) return;
    markOrderBillPaid({
      orderId: payingOrder.id,
      adminInvoiceAttachment: paymentReceipt,
      paidNote: paymentNote.trim(),
    });
    setPayingOrder(null);
    setPaymentReceipt(null);
    setPaymentNote('');
  };

  const getHouseBadgeList = (assignedHouseIds = []) => {
    if (assignedHouseIds.includes('ALL')) return ['Farm-Wide (All Houses)'];
    return assignedHouseIds.map((id) => {
      const h = houses.find((item) => item.id === id);
      return h ? `H${h.code || ''}: ${h.name}` : id;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm lg:flex-row lg:items-center dark:border-slate-700 dark:bg-slate-800/95">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Purchase Orders, Vendor Bills &amp; House Cost Ledger
            </h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200">
              Manager Request &rarr; Super Admin WhatsApp &rarr; Paid + Invoice
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Request feed, water, chicks, or extra medicines, attach PDF/image bills, allocate costs per house, and settle payments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'paid_history' ? 'all' : 'paid_history')}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-extrabold transition ${
              viewMode === 'paid_history'
                ? 'bg-slate-900 text-white dark:bg-emerald-700'
                : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            <History className="h-4 w-4" />
            Paid Bills History ({metrics.paidCount})
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-900"
          >
            <Plus className="h-4 w-4" />
            New Order / Upload Bill
          </button>
        </div>
      </div>

      {/* Just-Created Order WhatsApp Dispatch Banner */}
      {lastCreatedOrder && (
        <div className="flex flex-col justify-between gap-3 rounded-3xl border-2 border-emerald-400 bg-emerald-50 p-4 shadow-sm sm:flex-row sm:items-center dark:border-emerald-700 dark:bg-emerald-950/50">
          <div>
            <p className="text-xs font-black text-emerald-950 uppercase dark:text-emerald-200">
              Order {lastCreatedOrder.orderCode} Logged — Notify Super Admin via WhatsApp
            </p>
            <p className="mt-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              {lastCreatedOrder.title} • AED {Number(lastCreatedOrder.totalCostAed).toLocaleString()} • Target WhatsApp: {superAdminPhone}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={buildSuperAdminWhatsAppUrl(lastCreatedOrder)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => recordOrderWhatsappNotified(lastCreatedOrder.id)}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-800"
            >
              <MessageCircle className="h-4 w-4" />
              Send WhatsApp Alert to Super Admin
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setLastCreatedOrder(null)}
              className="rounded-full border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Top Financial Metrics Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/90 p-5 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-emerald-900 uppercase dark:text-emerald-300">
              Total Paid Bills ({metrics.paidCount})
            </p>
            <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-black text-emerald-950 dark:text-white">
            AED {Math.round(metrics.totalPaidAed).toLocaleString()}
          </p>
          <p className="mt-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            Settled &amp; archived with Super Admin sign-off
          </p>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-5 shadow-sm dark:border-amber-800 dark:bg-amber-950/40">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-amber-900 uppercase dark:text-amber-300">
              Pending Super Admin Payment ({metrics.pendingCount})
            </p>
            <Clock className="h-5 w-5 text-amber-700 dark:text-amber-400" />
          </div>
          <p className="mt-2 text-3xl font-black text-amber-950 dark:text-white">
            AED {Math.round(metrics.totalPendingAed).toLocaleString()}
          </p>
          <p className="mt-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
            Awaiting review &amp; payment receipt
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-slate-600 uppercase dark:text-slate-300">
              Combined Cycle Purchases
            </p>
            <DollarSign className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          </div>
          <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            AED {Math.round(metrics.totalOverallAed).toLocaleString()}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {orders.length} total bills across Feed, Chicks, Water &amp; Meds
          </p>
        </div>
      </div>

      {/* Per-House Paid Cost Allocation Grid */}
      <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
              <Building2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              Cost Paid Per House Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Multi-house bills are divided proportionally. Click any house card to filter its bills below.
            </p>
          </div>
          {houseFilter !== 'ALL_FILTER' && (
            <button
              type="button"
              onClick={() => setHouseFilter('ALL_FILTER')}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
            >
              Show All Houses
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {metrics.perHouseList.map((item) => {
            const targetKey = item.house.id === 'FARM_WIDE' ? 'FARM_WIDE' : item.house.id;
            const isSelected = houseFilter === targetKey;
            return (
              <button
                key={targetKey}
                type="button"
                onClick={() => setHouseFilter(isSelected ? 'ALL_FILTER' : targetKey)}
                className={`rounded-2xl border p-3.5 text-left transition ${
                  isSelected
                    ? 'border-emerald-700 bg-emerald-50 ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/50'
                    : 'border-slate-200 bg-slate-50/70 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-xs font-black text-slate-900 dark:text-white">
                    {item.house.id === 'FARM_WIDE' ? 'Farm-Wide' : `House ${item.house.code}`}
                  </span>
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {item.orderCount}
                  </span>
                </div>
                <p className="mt-1.5 text-base font-black text-emerald-800 dark:text-emerald-400">
                  AED {Math.round(item.paidAed).toLocaleString()}
                </p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  Paid {item.pendingAed > 0 ? `• Pending ${Math.round(item.pendingAed).toLocaleString()}` : ''}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Manager Create Order & Upload Bill Form */}
      {showCreateForm && (
        <form
          onSubmit={handleSubmitOrder}
          className="space-y-4 rounded-3xl border-2 border-emerald-300 bg-white/95 p-6 shadow-md dark:border-emerald-700 dark:bg-slate-800/95"
        >
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
              <Receipt className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              Request Order &amp; Upload Vendor Bill (Manager Submission)
            </h3>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Order / Bill Title *
              </label>
              <input
                type="text"
                required
                value={orderForm.title}
                onChange={(e) => setOrderForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g., 20T Finisher Silo Delivery or Electrolytes Restock"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold focus:border-emerald-700 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Category
              </label>
              <select
                value={orderForm.category}
                onChange={(e) => setOrderForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              >
                {ORDER_BILL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Supplier Name
              </label>
              <input
                type="text"
                value={orderForm.supplierName}
                onChange={(e) => setOrderForm((p) => ({ ...p, supplierName: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Quantity
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={orderForm.quantity}
                onChange={(e) => {
                  const qty = e.target.value;
                  const unitPrice = Number(orderForm.unitPriceAed || 0);
                  setOrderForm((p) => ({
                    ...p,
                    quantity: qty,
                    totalCostAed: unitPrice > 0 ? String(Math.round(Number(qty) * unitPrice)) : p.totalCostAed,
                  }));
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Unit Label
              </label>
              <input
                type="text"
                value={orderForm.unit}
                onChange={(e) => setOrderForm((p) => ({ ...p, unit: e.target.value }))}
                placeholder="Tons / Bags / Cartons / Packs"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Unit Price (AED)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={orderForm.unitPriceAed}
                onChange={(e) => {
                  const unitPrice = e.target.value;
                  const qty = Number(orderForm.quantity || 1);
                  setOrderForm((p) => ({
                    ...p,
                    unitPriceAed: unitPrice,
                    totalCostAed: unitPrice ? String(Math.round(qty * Number(unitPrice))) : p.totalCostAed,
                  }));
                }}
                placeholder="Optional"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Total Bill Cost (AED) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={orderForm.totalCostAed}
                onChange={(e) => setOrderForm((p) => ({ ...p, totalCostAed: e.target.value }))}
                placeholder="e.g., 3400"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-black text-emerald-800 dark:border-slate-600 dark:bg-slate-900 dark:text-emerald-400"
              />
            </div>
          </div>

          {/* House Cost Allocation Checkboxes */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-extrabold text-slate-700 uppercase dark:text-slate-200">
                Assign Bill Cost To House(s)
              </label>
              <button
                type="button"
                onClick={() =>
                  setOrderForm((p) => ({ ...p, assignedAllHouses: !p.assignedAllHouses }))
                }
                className={`rounded-full px-3 py-1 text-xs font-extrabold transition ${
                  orderForm.assignedAllHouses
                    ? 'bg-emerald-800 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {orderForm.assignedAllHouses ? '✓ Farm-Wide (All Houses)' : 'Select Farm-Wide Instead'}
              </button>
            </div>
            {!orderForm.assignedAllHouses && (
              <div className="flex flex-wrap gap-2">
                {houses.map((h) => {
                  const selected = orderForm.assignedHouseIds.includes(h.id);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => handleToggleAssignedHouse(h.id)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                        selected
                          ? 'border-emerald-700 bg-emerald-100 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-900/50 dark:text-emerald-200'
                          : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {selected ? '✓ ' : ''}House {h.code} ({h.name})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Attach PDF or Image Bill + Notes */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Attach Vendor Bill / Quote (PDF or Image)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
                  <Upload className="h-4 w-4 text-emerald-700" />
                  Upload PDF or Image
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => handleManagerFileUpload(e.target.files?.[0])}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setOrderForm((p) => ({
                      ...p,
                      managerBillAttachment: makeSampleSvgAttachment(
                        orderForm.title || 'Vendor Quote',
                        `${orderForm.category} • AED ${orderForm.totalCostAed || 'Pending'}`,
                        '#065f46'
                      ),
                    }))
                  }
                  className="rounded-xl border border-dashed border-emerald-400 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"
                >
                  Attach Sample Bill Preview
                </button>
                {orderForm.managerBillAttachment && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
                    <Paperclip className="h-3.5 w-3.5" />
                    {orderForm.managerBillAttachment.name}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Delivery / Payment Notes
              </label>
              <input
                type="text"
                value={orderForm.notes}
                onChange={(e) => setOrderForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Urgency, vendor credit terms, or bank details..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-full border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-6 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-900"
            >
              <CheckCircle2 className="h-4 w-4" />
              Submit Order &amp; Notify Super Admin
            </button>
          </div>
        </form>
      )}

      {/* Filter & Tabs Strip */}
      <div className="flex flex-col justify-between gap-3 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-800/95">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: `All Orders (${orders.length})` },
            { id: 'pending', label: `Pending Approval (${metrics.pendingCount})` },
            { id: 'paid_history', label: `Paid Bills History (${metrics.paidCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewMode(tab.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-extrabold transition ${
                viewMode === tab.id
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="ALL">All Categories</option>
            {ORDER_BILL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={houseFilter}
            onChange={(e) => setHouseFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="ALL_FILTER">All Houses</option>
            {houses.map((h) => (
              <option key={h.id} value={h.id}>
                House {h.code} ({h.name})
              </option>
            ))}
            <option value="FARM_WIDE">Farm-Wide Only</option>
          </select>
        </div>
      </div>

      {/* Orders & Bills Ledger List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-400">
            No orders or bills match the active filters.
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const isPaid = ord.status === 'Paid';
            return (
              <div
                key={ord.id}
                className={`rounded-3xl border bg-white/95 p-5 shadow-sm transition dark:bg-slate-800/95 ${
                  isPaid
                    ? 'border-emerald-200 dark:border-emerald-800'
                    : 'border-amber-300 dark:border-amber-700'
                }`}
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-black text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        {ord.orderCode}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        {ord.category}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-[11px] font-black uppercase ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200'
                            : 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200'
                        }`}
                      >
                        {isPaid ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {isPaid ? 'Paid / Completed' : 'Pending Payment'}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                      {ord.title}
                    </h4>

                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Qty: <strong className="text-slate-900 dark:text-white">{ord.quantity} {ord.unit}</strong> •
                      Supplier: {ord.supplierName} • Requested by {ord.requestedBy} (
                      {new Date(ord.requestedAt).toLocaleDateString()})
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {getHouseBadgeList(ord.assignedHouseIds).map((lbl) => (
                        <span
                          key={lbl}
                          className="rounded-xl bg-sky-50 px-2.5 py-1 text-[11px] font-extrabold text-sky-900 dark:bg-sky-950/60 dark:text-sky-200"
                        >
                          {lbl}
                        </span>
                      ))}
                    </div>

                    {ord.notes && (
                      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                        {ord.notes}
                      </p>
                    )}

                    {/* Attachment Buttons (Manager Bill + Super Admin Paid Receipt) */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {ord.managerBillAttachment && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewDoc({
                              title: `${ord.orderCode} — Manager Uploaded Bill`,
                              file: ord.managerBillAttachment,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        >
                          {ord.managerBillAttachment.mimeType === 'application/pdf' ? (
                            <FileText className="h-3.5 w-3.5 text-red-600" />
                          ) : (
                            <FileImage className="h-3.5 w-3.5 text-emerald-700" />
                          )}
                          View Manager Bill ({ord.managerBillAttachment.name})
                        </button>
                      )}

                      {ord.adminInvoiceAttachment && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewDoc({
                              title: `${ord.orderCode} — Super Admin Paid Receipt`,
                              file: ord.adminInvoiceAttachment,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                          View Paid Receipt ({ord.adminInvoiceAttachment.name})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Side Cost + Actions */}
                  <div className="flex shrink-0 flex-col items-start gap-2.5 lg:items-end">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-right dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                        Total Amount
                      </p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">
                        AED {Number(ord.totalCostAed || 0).toLocaleString()}
                      </p>
                    </div>

                    {isPaid ? (
                      <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                        Paid by {ord.paidBy} on {new Date(ord.paidAt).toLocaleDateString()}
                      </p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={buildSuperAdminWhatsAppUrl(ord)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => recordOrderWhatsappNotified(ord.id)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-extrabold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {ord.whatsappNotifiedAt ? 'Resend WhatsApp Alert' : 'WhatsApp Super Admin'}
                        </a>

                        {isOwner ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPayingOrder(ord);
                              setPaymentReceipt(null);
                              setPaymentNote('');
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-900"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Mark Paid &amp; Attach Receipt
                          </button>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-[11px] font-bold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                            Awaiting Super Admin Payment
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Super Admin Mark Paid + Optional Invoice Upload Modal */}
      {payingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleConfirmPayment}
            className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300">
                <ShieldCheck className="h-6 w-6" />
                <h3 className="text-lg font-black">Mark Order as Paid — {payingOrder.orderCode}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPayingOrder(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3.5 text-xs dark:bg-slate-900">
              <p className="font-black text-slate-900 dark:text-white">{payingOrder.title}</p>
              <p className="mt-1 font-bold text-emerald-700 dark:text-emerald-400">
                Settlement Amount: AED {Number(payingOrder.totalCostAed || 0).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Attach Payment Receipt / Invoice (Optional PDF or Image)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
                  <Upload className="h-4 w-4 text-emerald-700" />
                  Choose Receipt (PDF / Image)
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => handlePaymentFileUpload(e.target.files?.[0])}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setPaymentReceipt(
                      makeSampleSvgAttachment(
                        `Paid Receipt ${payingOrder.orderCode}`,
                        `AED ${Number(payingOrder.totalCostAed).toLocaleString()} Settled`,
                        '#0284c7'
                      )
                    )
                  }
                  className="rounded-xl border border-dashed border-sky-400 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900"
                >
                  Generate Sample Receipt
                </button>
              </div>
              {paymentReceipt && (
                <p className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  ✓ Attached: {paymentReceipt.name}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Payment Reference / Note
              </label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g., Paid via bank transfer #ADCB-8812"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayingOrder(null)}
                className="w-1/3 rounded-full border border-slate-300 py-2.5 text-xs font-bold text-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-2/3 rounded-full bg-emerald-800 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-900"
              >
                Confirm Paid &amp; Archive
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PDF / Image Document Lightbox Viewer */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="w-full max-w-2xl space-y-3 rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">{previewDoc.title}</h4>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.file?.dataUrl}
                  download={previewDoc.file?.name || 'document'}
                  className="rounded-full bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white"
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="rounded-full bg-slate-100 p-1.5 text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {previewDoc.file?.mimeType === 'application/pdf' ? (
              <iframe
                title={previewDoc.file.name}
                src={previewDoc.file.dataUrl}
                className="h-[65vh] w-full rounded-2xl border border-slate-200"
              />
            ) : (
              <img
                src={previewDoc.file?.dataUrl}
                alt={previewDoc.file?.name}
                className="mx-auto max-h-[65vh] rounded-2xl border border-slate-200 object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
