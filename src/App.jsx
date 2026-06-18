import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthProvider from "./components/AuthProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingScreen from "./components/LoadingScreen";
import ProtectedRoute from "./components/ProtectedRoute";
import SetupNotice from "./components/SetupNotice";
import { initializeFirebase } from "./lib/firebase";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import DemoPage from "./pages/DemoPage";
import JoinPage from "./pages/JoinPage";
import PitchPage from "./pages/PitchPage";
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

  // The pitch and demo videos are self-contained marketing pages that do not
  // depend on Firebase, so they render regardless of backend availability.
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    if (path.startsWith("/pitch")) {
      return (
        <ErrorBoundary>
          <PitchPage />
        </ErrorBoundary>
      );
    }
    if (path.startsWith("/demo")) {
      return (
        <ErrorBoundary>
          <DemoPage />
        </ErrorBoundary>
      );
    }
  }

  if (!firebaseReady) {
    return <LoadingScreen label="Connecting to Firebase..." />;
  }

  if (!firebaseAvailable) {
    return <SetupNotice />;
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<JoinPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/pitch" element={<PitchPage />} />
            <Route path="/demo" element={<DemoPage />} />
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
    </ErrorBoundary>
  );
}

export default App;
