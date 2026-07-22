import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Chatbot from "./components/Chatbot";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import UploadPolicy from "./pages/UploadPolicy";
import ExistingPolicies from "./pages/ExistingPolicies";
import Categories from "./pages/Categories";
import ChatLogs from "./pages/ChatLogs";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminDashboard />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard.Overview />} />
              <Route path="upload" element={<UploadPolicy />} />
              <Route path="policies" element={<ExistingPolicies />} />
              <Route path="categories" element={<Categories />} />
              <Route path="chat-logs" element={<ChatLogs />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
        <Chatbot />
      </div>
    </BrowserRouter>
  );
}

export default App;
