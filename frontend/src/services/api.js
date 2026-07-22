import axios from "axios";


const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
});


export const uploadPolicy = (formData, onUploadProgress) => {
  return api.post("/api/policies/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
  });
};


export const askPolicyQuestion = (question) => {
  return api.post("/api/chat", { question });
};


export const loginAdmin = (username, password) => {
  return api.post("/api/admin/login", { username, password });
};


export const listPolicies = () => {
  return api.get("/api/policies");
};


export const deletePolicy = (id) => {
  return api.delete(`/api/policies/${id}`);
};
