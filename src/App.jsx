import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthProvider from "./components/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import SetupNotice from "./components/SetupNotice";
import { isFirebaseConfigured } from "./lib/firebase";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import JoinPage from "./pages/JoinPage";
import StatusPage from "./pages/StatusPage";

function App() {
  if (!isFirebaseConfigured) {
    return <SetupNotice />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<JoinPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
