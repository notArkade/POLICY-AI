import { Outlet } from "react-router-dom";
import DashboardCards from "../components/DashboardCards";
import Sidebar from "../components/Sidebar";

const Overview = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">Monitor policy coverage, uploads, and employee chatbot usage.</p>
      </div>
      <DashboardCards />
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Policy Uploads</h3>
          <div className="mt-5 flex h-56 items-end gap-3">
            {[44, 68, 52, 78, 60, 88].map((height, index) => (
              <div key={height + index} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-md bg-blue-500" style={{ height: `${height}%` }} />
                <span className="text-xs text-slate-500">W{index + 1}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Query Categories</h3>
          <div className="mt-5 space-y-4">
            {[
              ["Leave Policy", 82],
              ["Attendance", 64],
              ["Working Hours", 48],
              ["Onboarding", 36],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{label}</span>
                  <span className="text-slate-500">{value}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-blue-600" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
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
