import { CalendarClock, Sprout } from 'lucide-react';
import { useFarm } from '../App.jsx';

/**
 * Isolated Phase 2 Placeholder Module for General Farm & Date Palm Management.
 * Deferred per stakeholder decision so Phase 1 prioritizes 100% of engineering focus on Broiler Poultry.
 */
export default function CropDashboard() {
  const { navigateTo } = useFarm();

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-emerald-200 bg-white/95 p-8 text-center shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
        <Sprout className="h-8 w-8" />
      </div>
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900">
        <CalendarClock className="h-3.5 w-3.5" />
        Scheduled for Phase 2
      </span>
      <h2 className="mt-3 text-2xl font-black text-slate-900">
        General Farm &amp; Date Palm Management
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        This isolated agricultural crop module (Date Palm blocks, pollination, protective bagging, and harvest yields) is reserved for Phase 2 while AlReefi Farm Management prioritizes live broiler poultry operations.
      </p>
      <button
        type="button"
        onClick={() => navigateTo('hub')}
        className="mt-6 rounded-full bg-emerald-800 px-6 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-900"
      >
        Return to Poultry Global Hub
      </button>
    </div>
  );
}
