const SIX_WEEKS = 6;

const startOfWeek = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - result.getDay());
  return result;
};

const sameDay = (first, second) => first.getTime() === second.getTime();

const policyCategories = (policies) => [
  ...new Set(policies.map((policy) => policy.category?.trim()).filter(Boolean)),
];

export const getUploadStatistics = (policies, now = new Date()) => {
  const thisWeek = startOfWeek(now);
  const weeks = Array.from({ length: SIX_WEEKS }, (_, index) => {
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - (SIX_WEEKS - index - 1) * 7);
    return { start, label: `W${index + 1}`, count: 0 };
  });

  policies.forEach((policy) => {
    const uploadedAt = new Date(policy.uploadDate);
    if (Number.isNaN(uploadedAt.getTime())) return;
    const uploadedWeek = startOfWeek(uploadedAt);
    const bucket = weeks.find((week) => sameDay(week.start, uploadedWeek));
    if (bucket) bucket.count += 1;
  });

  const highestCount = Math.max(...weeks.map((week) => week.count), 0);
  return weeks.map((week) => ({
    ...week,
    height: highestCount ? Math.max((week.count / highestCount) * 100, 8) : 0,
  }));
};

const queryWords = (query) =>
  new Set((query || "").toLowerCase().match(/[a-z0-9]+/g) || []);

const getQueryCategory = (query, categories) => {
  const normalizedQuery = (query || "").toLowerCase();
  const words = queryWords(query);
  let bestCategory = null;
  let bestScore = 0;

  categories.forEach((category) => {
    const categoryWords = queryWords(category);
    const matchingWords = [...categoryWords].filter((word) => word.length > 2 && words.has(word));
    const score = matchingWords.length + (normalizedQuery.includes(category.toLowerCase()) ? 2 : 0);
    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  });

  return bestCategory || "Other";
};

export const getQueryStatistics = (logs, categories) => {
  if (!logs.length) return [];

  const counts = logs.reduce((result, log) => {
    const category = getQueryCategory(log.query, categories);
    result[category] = (result[category] || 0) + 1;
    return result;
  }, {});

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count, percentage: Math.round((count / logs.length) * 100) }))
    .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label));
};

export const getDashboardAnalytics = (storage) => {
  const policies = storage.getPolicies();
  const categories = policyCategories(policies);
  const logs = storage.getDashboardChatLogs();
  const now = new Date();
  const uploadedThisMonth = policies.filter((policy) => {
    const uploadedAt = new Date(policy.uploadDate);
    return uploadedAt.getMonth() === now.getMonth() && uploadedAt.getFullYear() === now.getFullYear();
  }).length;

  return {
    totalPolicies: policies.length,
    categoryCount: categories.length,
    uploadedThisMonth,
    chatQueries: logs.length,
    uploadStatistics: getUploadStatistics(policies, now),
    queryStatistics: getQueryStatistics(logs, categories),
  };
};
