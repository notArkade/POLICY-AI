import { FileText, FolderTree, MessageCircle, UploadCloud } from "lucide-react";
const DashboardCards = ({ analytics, loading }) => {
  const currentMonth = new Date().toLocaleString("en-US", { month: "short", year: "numeric" });

  const cards = [
    { label: "Total Policies", value: analytics?.totalPolicies, icon: FileText, color: "text-blue-700" },
    { label: "Categories", value: analytics?.categoryCount, icon: FolderTree, color: "text-emerald-700" },
    { label: `Uploaded ${currentMonth}`, value: analytics?.uploadedThisMonth, icon: UploadCloud, color: "text-violet-700" },
    { label: "Chat Queries", value: analytics?.chatQueries, icon: MessageCircle, color: "text-amber-700" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <article key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          {loading ? (
            <div className="mt-4 h-9 w-12 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-4 text-3xl font-semibold text-slate-950">{value}</p>
          )}
        </article>
      ))}
    </div>
  );
};

export default DashboardCards;
