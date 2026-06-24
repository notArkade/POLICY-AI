import { useEffect, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { storage } from "../services/localStorageService";
import { askPolicyQuestion } from "../services/api";

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(storage.getChatHistory);
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    storage.saveChatHistory(messages);
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const query = input.trim();
    if (!query || loading) return;
    const timestamp = new Date().toISOString();
    setMessages((current) => [...current, { role: "user", text: query, timestamp }]);
    setInput("");

    try {
      setLoading(true);
      const result = await askPolicyQuestion(query);
      const response = result.data.answer;
      const responseTimestamp = new Date().toISOString();
      setMessages((current) => [
        ...current,
        { role: "bot", text: response, timestamp: responseTimestamp },
      ]);
      storage.addChatLog({ query, response, timestamp: responseTimestamp });
    } catch (err) {
      const response = err.response?.data?.detail || "I could not reach the policy assistant API.";
      setMessages((current) => [
        ...current,
        { role: "bot", text: response, timestamp: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Open policy chatbot"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-900/25 transition hover:bg-blue-700"
      >
        <Bot className="h-6 w-6" />
      </button>

      <aside
        aria-label="AI policy chatbot"
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md transform flex-col border-l border-slate-200 bg-white shadow-2xl transition duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-950">Policy Assistant</h2>
              <p className="text-sm text-slate-500">AI answers from HR policy docs</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close chatbot"
            onClick={() => setOpen(false)}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
          {messages.map((message, index) => (
            <div
              key={`${message.timestamp}-${index}`}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[82%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[82%] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-500 shadow-sm">
                Searching uploaded policies...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-200 bg-white p-4">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Ask about leave, attendance, or onboarding"
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={loading}
            className="grid h-10 w-10 place-items-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </aside>
    </>
  );
};

export default Chatbot;
