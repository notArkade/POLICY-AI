import { storage } from "../services/localStorageService";

const ChatLogs = () => {
  const logs = storage.getChatLogs();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Chat Logs</h2>
        <p className="mt-1 text-sm text-slate-500">Review employee chatbot interactions captured in localStorage.</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">User Query</th>
                <th className="px-4 py-3">Bot Response</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="max-w-xs px-4 py-3 text-slate-700">{log.query}</td>
                  <td className="max-w-lg px-4 py-3 text-slate-600">{log.response}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ChatLogs;
