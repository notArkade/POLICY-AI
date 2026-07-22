import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAdminAuthenticated } from "../services/adminAuth";

const ProtectedRoute = () => {
  const location = useLocation();

  return isAdminAuthenticated() ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
};

export default ProtectedRoute;
