import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthProvider from "./components/AuthProvider";
import LoadingScreen from "./components/LoadingScreen";
import ProtectedRoute from "./components/ProtectedRoute";
import SetupNotice from "./components/SetupNotice";
import { initializeFirebase } from "./lib/firebase";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import JoinPage from "./pages/JoinPage";
import StatusPage from "./pages/StatusPage";

function App() {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [firebaseAvailable, setFirebaseAvailable] = useState(false);

  useEffect(() => {
    let active = true;

    initializeFirebase()
      .then((ready) => {
        if (active) {
          setFirebaseAvailable(ready);
          setFirebaseReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setFirebaseAvailable(false);
          setFirebaseReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (!firebaseReady) {
    return <LoadingScreen label="Connecting to Firebase..." />;
  }

  if (!firebaseAvailable) {
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
