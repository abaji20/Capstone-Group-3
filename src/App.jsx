import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Layouts
import SuperAdminLayout from './components/SuperAdminLayout';
import AdminLayout from './components/AdminLayout';
import ClientLayout from './components/ClientLayout';

// Auth
import Login from './pages/Auth/Login';
import ResetPassword from './pages/Auth/ResetPassword';

// Client Pages
import Browse from './pages/Client/Browse';
import MyDownloads from './pages/Client/MyDownloads';
import RequestUpload from './pages/Client/RequestUpload';

// SuperAdmin Pages
import Dashboard from './pages/SuperAdmin/Dashboard';
import ManageAccount from './pages/SuperAdmin/ManageAccount';
import Logs from './pages/SuperAdmin/Logs';
import DeleteRequests from './pages/SuperAdmin/DeleteRequest';
import Archived from './pages/SuperAdmin/Archived';

// Admin Pages
import PdfUploads from './pages/Admin/PdfUploads';
import EditPDFs from './pages/Admin/EditPdfs';
import PendingActions from './pages/Admin/PendingActions';
import AdminLogs from './pages/Admin/AdminLogs';

function App() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Get initial session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      const isCreatingAccount = sessionStorage.getItem('isCreatingAccount') === 'true';
      if (session && !isCreatingAccount) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for Auth changes (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const isCreatingAccount = sessionStorage.getItem('isCreatingAccount') === 'true';
      
      if (session && !isCreatingAccount) {
        fetchUserRole(session.user.id);
      } else if (!session) {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      Loading System...
    </div>
  );

  return (
    <Router>
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={role ? <Navigate to="/" /> : <Login />} />

        {/* SuperAdmin Specific Routes */}
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

        {/* Shared Admin & SuperAdmin Routes */}
        {(role === 'admin' || role === 'superadmin') && (
          <Route element={<AdminLayout />}>
            <Route path="/upload" element={<PdfUploads />} />
            <Route path="/edit" element={<EditPDFs />} />
            <Route path="/admin-logs" element={<AdminLogs />} />
            <Route path="/pending" element={<PendingActions />} />
            <Route path="/" element={<Navigate to="/upload" />} />
          </Route>
        )}

        {/* Client Specific Routes */}
        {role === 'client' && (
          <Route element={<ClientLayout />}>
            <Route path="/browse" element={<Browse />} />
            <Route path="/my-downloads" element={<MyDownloads />} />
            <Route path="/request-upload" element={<RequestUpload />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<Navigate to="/browse" />} />
          </Route>
        )}

        {/* Fallback Route */}
        <Route path="*" element={role ? <Navigate to="/" /> : <Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;