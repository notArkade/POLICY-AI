import { Trash2 } from "lucide-react";
import { useState } from "react";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import { storage } from "../services/localStorageService";

const ChatLogs = () => {
  const [logs, setLogs] = useState(storage.getDashboardChatLogs);
  const [selectedLog, setSelectedLog] = useState(null);
  const [deleteAllStep, setDeleteAllStep] = useState(0);
  const [confirmationText, setConfirmationText] = useState("");
  const [toast, setToast] = useState("");

  const deleteLog = () => {
    if (!selectedLog?.id) return;
    setLogs(storage.deleteChatLog(selectedLog.id));
    setSelectedLog(null);
    setToast("Chat history deleted successfully.");
  };

  const beginDeleteAll = () => setDeleteAllStep(1);

  const continueDeleteAll = () => setDeleteAllStep(2);

  const deleteAllLogs = () => {
    setLogs(storage.clearChatLogs());
    setDeleteAllStep(0);
    setConfirmationText("");
    setToast("All chat history deleted successfully.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Chat Logs</h2>
          <p className="mt-1 text-sm text-slate-500">Review employee chatbot interactions captured in localStorage.</p>
        </div>
        <button
          type="button"
          onClick={beginDeleteAll}
          disabled={!logs.length}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
        >
          Delete All Chat History
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">User Query</th>
                <th className="px-4 py-3">Bot Response</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="max-w-xs px-4 py-3 text-slate-700">{log.query}</td>
                  <td className="max-w-lg px-4 py-3 text-slate-600">{log.response}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      aria-label="Delete chat history"
                      onClick={() => setSelectedLog(log)}
                      className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!logs.length && (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-slate-500">No chat history available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedLog && (
        <Modal title="Delete chat history" onClose={() => setSelectedLog(null)}>
          <p className="text-sm text-slate-600">Delete this chat history? This action cannot be undone.</p>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setSelectedLog(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={deleteLog} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
          </div>
        </Modal>
      )}
      {deleteAllStep === 1 && (
        <Modal title="Delete all chat history" onClose={() => setDeleteAllStep(0)}>
          <p className="text-sm text-slate-600">This will remove every recorded conversation.</p>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setDeleteAllStep(0)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={continueDeleteAll} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Continue</button>
          </div>
        </Modal>
      )}
      {deleteAllStep === 2 && (
        <Modal title="FINAL CONFIRMATION" onClose={() => setDeleteAllStep(0)}>
          <p className="text-sm text-slate-600">This action is permanent. All chat history will be permanently deleted.</p>
          <label className="mt-4 block space-y-2 text-sm font-medium text-slate-700">
            Type DELETE to continue.
            <input value={confirmationText} onChange={(event) => setConfirmationText(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setDeleteAllStep(0)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" disabled={confirmationText !== "DELETE"} onClick={deleteAllLogs} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400">Delete Everything</button>
          </div>
        </Modal>
      )}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
};

export default ChatLogs;
