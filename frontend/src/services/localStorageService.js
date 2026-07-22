const keys = {
  policies: "policy-ai-policies",
  categories: "policy-ai-categories",
  chatHistory: "policy-ai-chat-history",
  chatLogs: "policy-ai-chat-logs",
  settings: "policy-ai-settings",
};

const defaultCategories = [
  "Recruitment",
  "Onboarding",
  "Attendance",
  "Working Hours",
  "Leave Policy",
];

const defaultSettings = {
  companyName: "The Company",
  companyEmail: "hr@thecompany.com",
  adminName: "HR Admin",
  adminEmail: "admin@thecompany.com",
  emailNotifications: true,
  weeklyDigest: false,
};

export const DASHBOARD_DATA_UPDATED = "policy-ai-dashboard-data-updated";

const notifyDashboardDataChanged = () => {
  window.dispatchEvent(new Event(DASHBOARD_DATA_UPDATED));
};

const parse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export const storage = {
  getPolicies() {
    return parse(localStorage.getItem(keys.policies), []);
  },
  savePolicies(policies) {
    localStorage.setItem(keys.policies, JSON.stringify(policies));
    notifyDashboardDataChanged();
  },
  addPolicy(policy) {
    const policies = storage.getPolicies();
    const next = [{ ...policy, id: crypto.randomUUID() }, ...policies];
    storage.savePolicies(next);
    return next;
  },
  updatePolicy(updatedPolicy) {
    const next = storage
      .getPolicies()
      .map((policy) => (policy.id === updatedPolicy.id ? updatedPolicy : policy));
    storage.savePolicies(next);
    return next;
  },
  deletePolicy(id) {
    const next = storage.getPolicies().filter((policy) => policy.id !== id);
    storage.savePolicies(next);
    return next;
  },
  getCategories() {
    const categories = parse(localStorage.getItem(keys.categories), null);
    if (categories?.length) return categories;
    localStorage.setItem(keys.categories, JSON.stringify(defaultCategories));
    return defaultCategories;
  },
  saveCategories(categories) {
    localStorage.setItem(keys.categories, JSON.stringify(categories));
    notifyDashboardDataChanged();
  },
  getChatHistory() {
    return parse(localStorage.getItem(keys.chatHistory), [
      {
        role: "bot",
        text: "Hi, I can help you find policy answers. Try asking about leave, attendance, onboarding, or working hours.",
        timestamp: new Date().toISOString(),
      },
    ]);
  },
  saveChatHistory(messages) {
    localStorage.setItem(keys.chatHistory, JSON.stringify(messages));
  },
  getChatLogs() {
    return parse(localStorage.getItem(keys.chatLogs), [
      {
        id: "sample-1",
        query: "What is the leave policy?",
        response: "Employees receive 18 annual leaves, subject to manager approval and policy terms.",
        timestamp: new Date().toISOString(),
      },
    ]);
  },
  getDashboardChatLogs() {
    return parse(localStorage.getItem(keys.chatLogs), []);
  },
  addChatLog(log) {
    const logs = [{ ...log, id: crypto.randomUUID() }, ...storage.getChatLogs()];
    localStorage.setItem(keys.chatLogs, JSON.stringify(logs));
    notifyDashboardDataChanged();
    return logs;
  },
  getSettings() {
    return parse(localStorage.getItem(keys.settings), defaultSettings);
  },
  saveSettings(settings) {
    localStorage.setItem(keys.settings, JSON.stringify(settings));
  },
};
