// src/App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext'; // <<< Use the hook
import PageLayout from './components/Layout/PageLayout';
import TestPage from './pages/TestPage';
import BatchPage from './pages/BatchPage';
import BatchJobsPage from './pages/BatchJobsPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import RagInfoPage from './pages/RagInfoPage';
import LoginPage from './pages/LoginPage';
import UserManagementPage from './pages/UserManagementPage'; // <<< Import Admin Pages
import RoleManagementPage from './pages/RoleManagementPage';   // <<< Import Admin Pages
import './App.css';
import { Spin } from 'antd'; // For loading indicator
import ChatPage from './pages/ChatPage';

// --- Protected Route Component ---
interface ProtectedRouteProps {
    isAllowed: boolean;
    redirectPath?: string;
    children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    isAllowed,
    redirectPath = '/login',
    children,
}) => {
    const location = useLocation();

    if (!isAllowed) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience
        // than dropping them off on the home page.
        return <Navigate to={redirectPath} state={{ from: location }} replace />;
    }

    return children ? <>{children}</> : <Outlet />; // Render children or Outlet
};
// --- End Protected Route Component ---

function App() {
  const {
    isAuthenticated,
    loading,
    authEnabled,
    checkPermission, // Get checkPermission from context
    apiClient,       // Get apiClient from context
    logout,          // Get logout from context
    handleLoginSuccess: contextLoginSuccess // Rename for clarity
  } = useAuth();

  // RAG enabled status (can also be moved to context if needed globally)
  const [ragEnabled, setRagEnabled] = useState<boolean | null>(null);
  const [ragStatusFetched, setRagStatusFetched] = useState(false);
  
  useEffect(() => {
    const fetchRagStatus = async () => {
       try {
            const config = await apiClient.getConfig();
            
            // Log the full config for debugging, pretty-printed
            console.log("[DEBUG] Full config response from apiClient.getConfig():", JSON.stringify(config, null, 2));
            
            // Determine RAG status solely from the correct nested property
            const isRagEnabled = !!config?.database?.ragEnabled;
            
            console.log('[App.tsx] RAG enabled status determined:', isRagEnabled, 'Value from config.database.ragEnabled:', config?.database?.ragEnabled);
            
            setRagEnabled(isRagEnabled);
       } catch (e) { 
          console.error("Failed to get RAG status from API, defaulting to false.", e); 
          setRagEnabled(false); // Ensure it defaults to false on API error
       } finally {
          setRagStatusFetched(true);
       }
    };
    fetchRagStatus();
  }, [apiClient]);

  // Use a dummy handleLoginSuccess if context doesn't provide one directly
  const handleLoginSuccess = () => {
      console.log("Login successful callback in App.tsx");
      contextLoginSuccess();
  };

  // Use the logout function from context
  const handleLogout = () => {
      logout();
  };

  if (loading || authEnabled === null || !ragStatusFetched) { // Wait for context loading & RAG status
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={
            isAuthenticated && authEnabled ? ( // Redirect only if auth is enabled AND logged in
              <Navigate to="/" replace />
            ) : (
              <LoginPage apiClient={apiClient} onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        {/* Protected Application Routes */}
        <Route
          element={
            <ProtectedRoute isAllowed={!authEnabled || isAuthenticated}>
                <PageLayout ragEnabled={!!ragEnabled} onLogout={handleLogout} />
             </ProtectedRoute>
          }
        >
              <Route index element={<Navigate to="/test" replace />} />
              {/* Apply permission checks inline or via a wrapper component */}
              <Route path="/test" element={<ProtectedRoute isAllowed={!authEnabled || checkPermission('classify:item')}><TestPage apiClient={apiClient} /></ProtectedRoute>} />
              <Route path="/batch" element={<ProtectedRoute isAllowed={!authEnabled || checkPermission('classify:batch')}><BatchPage apiClient={apiClient} /></ProtectedRoute>} />
              <Route path="/batch/jobs" element={<ProtectedRoute isAllowed={!authEnabled || checkPermission('classify:batch')}><BatchJobsPage apiClient={apiClient} /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute isAllowed={!authEnabled || checkPermission('history:view')}><HistoryPage apiClient={apiClient} /></ProtectedRoute>} />
              <Route path="/rag-info" element={<ProtectedRoute isAllowed={!authEnabled || checkPermission('rag:view')}><RagInfoPage apiClient={apiClient} /></ProtectedRoute>} />
              <Route path="/chat" element={
                <ProtectedRoute isAllowed={!authEnabled || checkPermission('chat:use')}> {/* Example permission */}
                  <ChatPage />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={<ProtectedRoute isAllowed={!authEnabled || checkPermission('config:view')}><SettingsPage apiClient={apiClient} /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin/users" element={<ProtectedRoute isAllowed={!authEnabled || checkPermission('users:manage')}><UserManagementPage apiClient={apiClient} /></ProtectedRoute>} />
              <Route path="/admin/roles" element={<ProtectedRoute isAllowed={!authEnabled || checkPermission('roles:manage')}><RoleManagementPage apiClient={apiClient} /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/test" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;