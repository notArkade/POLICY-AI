import { useState } from "react";
import Toast from "../components/Toast";
import { storage } from "../services/localStorageService";

const Settings = () => {
  const [settings, setSettings] = useState(storage.getSettings);
  const [toast, setToast] = useState("");

  const setField = (field, value) => setSettings((current) => ({ ...current, [field]: value }));

  const save = (event) => {
    event.preventDefault();
    storage.saveSettings(settings);
    setToast("Settings saved.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Manage company information, admin profile, and notifications.</p>
      </div>
      <form onSubmit={save} className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Company Information</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input value={settings.companyName} onChange={(event) => setField("companyName", event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Company name" />
            <input value={settings.companyEmail} onChange={(event) => setField("companyEmail", event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Company email" />
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Admin Profile</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input value={settings.adminName} onChange={(event) => setField("adminName", event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Admin name" />
            <input value={settings.adminEmail} onChange={(event) => setField("adminEmail", event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Admin email" />
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Notification Preferences</h3>
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input type="checkbox" checked={settings.emailNotifications} onChange={(event) => setField("emailNotifications", event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
              Email notifications for new uploads
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input type="checkbox" checked={settings.weeklyDigest} onChange={(event) => setField("weeklyDigest", event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
              Weekly chat summary digest
            </label>
          </div>
        </section>
        <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Save Settings
        </button>
      </form>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
};

export default Settings;
