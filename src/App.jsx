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
 import ResetPassword from './pages/Auth/ResetPassword';

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
      // 1. Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        const isCreatingAccount = sessionStorage.getItem('isCreatingAccount') === 'true';
        if (session && !isCreatingAccount) {
          fetchUserRole(session.user.id);
        } else {
          setLoading(false);
        }
      });

      // 2. Listen for Auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const isCreatingAccount = sessionStorage.getItem('isCreatingAccount') === 'true';
        
        // Only update the app's role state if we are NOT in the middle of creating an account
        if (session && !isCreatingAccount) {
          fetchUserRole(session.user.id);
        } else if (!session) {
          setRole(null);
          setLoading(false);
        }
      });

      return () => subscription.unsubscribe();
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
      <Router>
        <Routes>
          <Route path="/login" element={role ? <Navigate to="/" /> : <Login />} />

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

          {(role === 'admin' || role === 'superadmin') && (
          <Route element={<AdminLayout />}>
            <Route path="/upload" element={<PdfUploads />} />
            <Route path="/edit" element={<EditPDFs />} />
            <Route path="/admin-logs" element={<AdminLogs />} />
            <Route path="/pending" element={<PendingActions />} />
            <Route path="/" element={<Navigate to="/upload" />} />
          </Route>
          )}

          {role === 'client' && (
            <Route element={<ClientLayout />}>
              <Route path="/browse" element={<Browse />} />
              <Route path="/my-downloads" element={<MyDownloads />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<Navigate to="/browse" />} />
            </Route>
          )}

          <Route path="*" element={role ? <Navigate to="/" /> : <Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  export default App;