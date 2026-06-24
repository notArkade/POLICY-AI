import { NavLink } from "react-router-dom";
import {
  BarChart3,
  FileStack,
  FolderTree,
  MessageSquareText,
  Settings,
  UploadCloud,
} from "lucide-react";

const items = [
  { label: "Dashboard", to: "/admin/dashboard", icon: BarChart3 },
  { label: "Upload Policy", to: "/admin/upload", icon: UploadCloud },
  { label: "Existing Policies", to: "/admin/policies", icon: FileStack },
  { label: "Policy Categories", to: "/admin/categories", icon: FolderTree },
  { label: "Chat Logs", to: "/admin/chat-logs", icon: MessageSquareText },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

const Sidebar = () => {
  return (
    <aside className="border-r border-slate-200 bg-white lg:min-h-[calc(100vh-65px)]">
      <div className="border-b border-slate-200 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">HR Admin</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-950">Policy Center</h1>
      </div>
      <nav className="flex gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-visible">
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `inline-flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
