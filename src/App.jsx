import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
// Layouts
import SuperAdminLayout from './components/SuperAdminLayout';
import AdminLayout from './components/AdminLayout';
import ClientLayout from './components/ClientLayout';

// Auth
import Login from './pages/Auth/Login';

// Client
import Browse from './pages/Client/Browse';
import MyDownloads from './pages/Client/MyDownloads';

// SuperAdmin
import ManageAccount from './pages/SuperAdmin/ManageAccount';
import Logs from './pages/SuperAdmin/Logs';
import DeleteRequests from './pages/SuperAdmin/DeleteRequest';
import Archived from './pages/SuperAdmin/Archived';
import Dashboard from './pages/SuperAdmin/Dashboard';

// Admin
import EditPDFs from './pages/Admin/EditPdfs';
import PdfUploads from './pages/Admin/PdfUploads';
import PendingActions from './pages/Admin/PendingActions';
import AdminLogs from './pages/Admin/AdminLogs';

function App() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Updated to ensure loading is set to false only after the query finishes
  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (data) setRole(data.role);
    } catch (err) {
      console.error("Error fetching role:", err);
    } finally {
      setLoading(false); // Stop loading after attempt
    }
  };

  useEffect(() => {
    // 1. Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false); // No session, stop loading immediately
      }
    });

    // 2. Listen for Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserRole(session.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show a loading state so the app doesn't push to login while checking session
  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>
        {/* Entry Point */}
        <Route path="/login" element={role ? <Navigate to="/" /> : <Login />} />

        {/* 1. SUPER ADMIN ROUTES */}
        {role === 'superadmin' && (
          <Route element={<SuperAdminLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/manage-accounts" element={<ManageAccount />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/delete-requests" element={<DeleteRequests />} />
            <Route path="/archived" element={<Archived />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Route>
        )}

        {/* 2. ADMIN ROUTES */}
        {role === 'admin' && (
          <Route element={<AdminLayout />}>
            <Route path="/upload" element={<PdfUploads />} />
            <Route path="/edit" element={<EditPDFs />} />
            <Route path="/admin-logs" element={<AdminLogs />} />
            <Route path="/pending" element={<PendingActions />} />
            <Route path="/" element={<Navigate to="/upload" />} />
          </Route>
        )}

        {/* 3. CLIENT ROUTES */}
        {role === 'client' && (
          <Route element={<ClientLayout />}>
            <Route path="/browse" element={<Browse />} />
            <Route path="/my-downloads" element={<MyDownloads />} />
            <Route path="/" element={<Navigate to="/browse" />} />
          </Route>
        )}

        {/* CATCH-ALL: Redirects correctly based on auth status */}
        <Route path="*" element={role ? <Navigate to="/" /> : <Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;