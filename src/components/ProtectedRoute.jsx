import { Navigate } from "react-router-dom";
import LoadingScreen from "./LoadingScreen";
import { useAuthState } from "./AuthProvider";

function ProtectedRoute({ children }) {
  const { loading, isAdmin } = useAuthState();

  if (loading) {
    return <LoadingScreen label="Verifying admin access..." />;
  }

  if (!isAdmin) {
    return <Navigate replace to="/admin/login" />;
  }

  return children;
}

export default ProtectedRoute;
