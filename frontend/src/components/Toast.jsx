import { CheckCircle, X } from "lucide-react";

const Toast = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed right-5 top-24 z-50 flex w-[min(92vw,360px)] items-center gap-3 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-lg">
      <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        aria-label="Close notification"
        onClick={onClose}
        className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Toast;
