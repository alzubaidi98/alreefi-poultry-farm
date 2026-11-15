import { useState } from 'react';
import { AlertTriangle, Send, X, Building2, ShieldAlert } from 'lucide-react';
import { EMERGENCY_EVENT_TYPES } from '../mockData.js';
import { useFarm } from '../App.jsx';

export default function EmergencyModal() {
  const {
    isEmergencyModalOpen,
    setIsEmergencyModalOpen,
    visibleHouses,
    selectedHouseId,
    submitEmergencyAlert,
  } = useFarm();

  const [houseId, setHouseId] = useState(selectedHouseId || visibleHouses[0]?.id || 'house-1');
  const [eventType, setEventType] = useState('Water Leak');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');

  if (!isEmergencyModalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!details.trim()) {
      setError('Please describe the location, affected equipment, and urgency before sending.');
      return;
    }
    submitEmergencyAlert({
      houseId: houseId || visibleHouses[0]?.id || 'house-1',
      eventType,
      details: details.trim(),
    });
    setDetails('');
    setError('');
    setIsEmergencyModalOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-modal-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-red-200 bg-white shadow-2xl">
        {/* Top Close Strip */}
        <div className="flex items-center justify-end bg-white px-4 pt-3 pb-1">
          <button
            type="button"
            onClick={() => setIsEmergencyModalOpen(false)}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close emergency modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* High-Contrast Crimson Banner */}
        <div className="mx-3 flex items-center justify-center gap-3 rounded-2xl bg-red-600 px-5 py-4 text-white shadow-md">
          <AlertTriangle className="h-7 w-7 shrink-0 fill-white text-red-600" />
          <h2 id="emergency-modal-title" className="text-xl font-extrabold tracking-wide uppercase">
            Emergency Alert
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="text-center">
            <p className="text-sm font-bold tracking-wide text-slate-900 uppercase">
              Report an Urgent Issue to Farm Management
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Triggers an immediate persistent alert banner on Owner &amp; Manager dashboards.
            </p>
          </div>

          {/* Affected House Selector */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <Building2 className="h-4 w-4 text-emerald-700" />
              Affected Broiler House
            </label>
            <select
              value={houseId}
              onChange={(e) => setHouseId(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-700 focus:bg-white focus:outline-none"
            >
              {visibleHouses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.sector} — {h.phase === 'cleaning' ? `Cleaning Day ${h.cleaningDay}` : `Day ${h.cycleDay}`})
                </option>
              ))}
            </select>
          </div>

          {/* Critical Event Dropdown */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              Type of Emergency
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full rounded-xl border-2 border-emerald-700 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
            >
              {EMERGENCY_EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Urgent Details */}
          <div>
            <label className="mb-1 text-sm font-semibold text-slate-800 block">
              Additional Details
            </label>
            <p className="mb-2 text-xs text-slate-500">
              Describe the situation (e.g., zone location, specific equipment, water valve, or fan bank).
            </p>
            <textarea
              rows={4}
              value={details}
              onChange={(e) => {
                setDetails(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g., Water pipe broken in House 3 near the middle zone feeding line. Starting to flood. Main shutoff valve is near entrance."
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-600 focus:bg-white focus:outline-none"
            />
            {error && (
              <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setIsEmergencyModalOpen(false)}
              className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:w-1/3"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-extrabold tracking-wide text-white uppercase shadow-lg shadow-red-600/25 transition hover:bg-red-700 active:scale-[0.99] sm:w-2/3"
            >
              <Send className="h-4 w-4" />
              Send Emergency Alert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
