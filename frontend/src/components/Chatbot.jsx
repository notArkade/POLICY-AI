import { useEffect, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { storage } from "../services/localStorageService";
import { askPolicyQuestion } from "../services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import "highlight.js/styles/github.css";

const getInitialMessages = () => [
  {
    role: "bot",
    text: "Hi, I can help you find policy answers. Try asking about leave, attendance, onboarding, or working hours.",
    timestamp: new Date().toISOString(),
  },
];

const GREETING_ANSWER =
  "Hello. I am the HR Policy Assistant. How may I help you with the uploaded policy documents today?";
const GREETING_WORDS = new Set([
  "aloha",
  "greetings",
  "hello",
  "hey",
  "hiya",
  "howdy",
  "hi",
  "namaste",
  "sup",
  "yo",
  "hola",
]);
const GREETING_PHRASES = new Set([
  "good afternoon",
  "good day",
  "good evening",
  "good morning",
  "hope you are well",
  "how are you",
  "whats up",
]);

const normalizeGreeting = (question) =>
  question.toLowerCase().replace(/[^\w\s]/g, "").trim().replace(/\s+/g, " ");

const isGreeting = (question) => {
  const normalized = normalizeGreeting(question);
  const words = normalized.split(" ").filter(Boolean);

  if (GREETING_PHRASES.has(normalized)) return true;
  if (!words.length) return false;
  if ([...GREETING_PHRASES].some((phrase) => normalized.startsWith(`${phrase} `))) {
    return words.length <= 6;
  }
  return GREETING_WORDS.has(words[0]) && words.length <= 6;
};

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(getInitialMessages);
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const query = input.trim();
    if (!query || loading) return;
    const timestamp = new Date().toISOString();
    setMessages((current) => [
      ...current,
      { role: "user", text: query, timestamp },
    ]);
    setInput("");

    if (isGreeting(query)) {
      const responseTimestamp = new Date().toISOString();
      setMessages((current) => [
        ...current,
        { role: "bot", text: GREETING_ANSWER, timestamp: responseTimestamp },
      ]);
      storage.addChatLog({ query, response: GREETING_ANSWER, timestamp: responseTimestamp });
      return;
    }

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
      const response =
        err.response?.data?.detail ||
        "I could not reach the policy assistant API.";
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
              <p className="text-sm text-slate-500">
                AI answers from HR policy docs
              </p>
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
                {message.role === "bot" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-2xl font-bold mt-5 mb-3">
                          {children}
                        </h1>
                      ),

                      h2: ({ children }) => (
                        <h2 className="text-xl font-semibold mt-4 mb-2">
                          {children}
                        </h2>
                      ),

                      h3: ({ children }) => (
                        <h3 className="text-lg font-semibold mt-3 mb-2">
                          {children}
                        </h3>
                      ),

                      p: ({ children }) => (
                        <p className="mb-3 leading-7">{children}</p>
                      ),

                      ul: ({ children }) => (
                        <ul className="list-disc ml-5 mb-3 space-y-1">
                          {children}
                        </ul>
                      ),

                      ol: ({ children }) => (
                        <ol className="list-decimal ml-5 mb-3 space-y-1">
                          {children}
                        </ol>
                      ),

                      li: ({ children }) => <li>{children}</li>,

                      strong: ({ children }) => (
                        <strong className="font-semibold text-slate-900">
                          {children}
                        </strong>
                      ),

                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-blue-500 pl-4 italic text-slate-600 my-3">
                          {children}
                        </blockquote>
                      ),

                      code({ inline, className, children }) {
                        return inline ? (
                          <code className="rounded bg-slate-100 px-1 py-0.5 text-red-600">
                            {children}
                          </code>
                        ) : (
                          <pre className="my-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-white">
                            <code className={className}>{children}</code>
                          </pre>
                        );
                      },

                      table: ({ children }) => (
                        <div className="overflow-x-auto my-4">
                          <table className="min-w-full border border-slate-300">
                            {children}
                          </table>
                        </div>
                      ),

                      th: ({ children }) => (
                        <th className="border bg-slate-100 px-3 py-2 text-left font-semibold">
                          {children}
                        </th>
                      ),

                      td: ({ children }) => (
                        <td className="border px-3 py-2">{children}</td>
                      ),

                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
                ) : (
                  message.text
                )}
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

        <form
          onSubmit={handleSubmit}
          className="flex gap-2 border-t border-slate-200 bg-white p-4"
        >
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
