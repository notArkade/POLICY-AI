import { Outlet } from "react-router-dom";
import DashboardCards from "../components/DashboardCards";
import Sidebar from "../components/Sidebar";
import { useDashboardAnalytics } from "../hooks/useDashboardAnalytics";

const Overview = () => {
  const { analytics, error } = useDashboardAnalytics();
  const loading = !analytics && !error;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">Monitor policy coverage, uploads, and employee chatbot usage.</p>
      </div>
      <DashboardCards analytics={analytics} loading={loading} />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Policy Uploads</h3>
          {loading ? (
            <div className="mt-5 h-56 animate-pulse rounded-md bg-slate-100" />
          ) : analytics?.totalPolicies ? (
            <div className="mt-5 flex h-56 items-end gap-3">
              {analytics.uploadStatistics.map((week) => (
                <div key={week.start.toISOString()} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t-md bg-blue-500" style={{ height: `${week.height}%` }} title={`${week.count} uploads`} />
                  <span className="text-xs text-slate-500">{week.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 flex h-56 items-center justify-center text-sm text-slate-500">No upload data available</p>
          )}
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Query Categories</h3>
          {loading ? (
            <div className="mt-5 space-y-4">
              {[1, 2, 3, 4].map((item) => <div key={item} className="h-7 animate-pulse rounded bg-slate-100" />)}
            </div>
          ) : analytics?.queryStatistics.length ? (
            <div className="mt-5 space-y-4">
            {analytics.queryStatistics.map(({ label, percentage }) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{label}</span>
                  <span className="text-slate-500">{percentage}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-blue-600" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500">No chat history available</p>
          )}
        </section>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  return (
    <main className="grid lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <section className="min-w-0 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </section>
    </main>
  );
};

AdminDashboard.Overview = Overview;

export default AdminDashboard;
