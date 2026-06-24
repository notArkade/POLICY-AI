import { FileText, FolderTree, MessageCircle, UploadCloud } from "lucide-react";
import { storage } from "../services/localStorageService";

const DashboardCards = () => {
  const policies = storage.getPolicies();
  const categories = storage.getCategories();
  const logs = storage.getChatLogs();
  const currentMonth = new Date().toLocaleString("en-US", { month: "short", year: "numeric" });
  const uploadedThisMonth = policies.filter((policy) => {
    const uploaded = new Date(policy.uploadDate);
    const now = new Date();
    return uploaded.getMonth() === now.getMonth() && uploaded.getFullYear() === now.getFullYear();
  }).length;

  const cards = [
    { label: "Total Policies", value: policies.length, icon: FileText, color: "text-blue-700" },
    { label: "Categories", value: categories.length, icon: FolderTree, color: "text-emerald-700" },
    { label: `Uploaded ${currentMonth}`, value: uploadedThisMonth, icon: UploadCloud, color: "text-violet-700" },
    { label: "Chat Queries", value: logs.length, icon: MessageCircle, color: "text-amber-700" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <article key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <p className="mt-4 text-3xl font-semibold text-slate-950">{value}</p>
        </article>
      ))}
    </div>
  );
};

export default DashboardCards;
