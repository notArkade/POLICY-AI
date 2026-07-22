import { useCallback, useEffect, useState } from "react";
import { DASHBOARD_DATA_UPDATED, storage } from "../services/localStorageService";
import { getDashboardAnalytics } from "../services/dashboardAnalytics";

export const useDashboardAnalytics = () => {
  const [state, setState] = useState(() => {
    try {
      return { analytics: getDashboardAnalytics(storage), error: "" };
    } catch {
      return { analytics: null, error: "Dashboard analytics could not be loaded." };
    }
  });

  const refresh = useCallback(() => {
    try {
      setState({ analytics: getDashboardAnalytics(storage), error: "" });
    } catch {
      setState({ analytics: null, error: "Dashboard analytics could not be loaded." });
    }
  }, []);

  useEffect(() => {
    window.addEventListener(DASHBOARD_DATA_UPDATED, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(DASHBOARD_DATA_UPDATED, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return state;
};
