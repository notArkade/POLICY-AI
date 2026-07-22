const ADMIN_SESSION_KEY = "adminAuthenticated";

export const isAdminAuthenticated = () => localStorage.getItem(ADMIN_SESSION_KEY) === "true";

export const setAdminAuthenticated = () => localStorage.setItem(ADMIN_SESSION_KEY, "true");

export const clearAdminAuthentication = () => localStorage.removeItem(ADMIN_SESSION_KEY);
