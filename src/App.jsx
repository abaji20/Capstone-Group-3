import { useEffect, useState, useMemo, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// MUI Theme Imports
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography } from '@mui/material';

// Layouts
import SuperAdminLayout from './components/SuperAdminLayout';
import AdminLayout from './components/AdminLayout';
import ClientLayout from './components/ClientLayout';

// Auth
import Login from './pages/Auth/Login';
import ResetPassword from './pages/Auth/ResetPassword';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';

// Pages
import Dashboard from './pages/SuperAdmin/Dashboard';
import ManageAccount from './pages/SuperAdmin/ManageAccount';
import Logs from './pages/SuperAdmin/Logs';
import DeleteRequests from './pages/SuperAdmin/DeleteRequest';
import Archived from './pages/SuperAdmin/Archived';
import SuperAdminEditPDFs from './pages/SuperAdmin/SuperAdminEditPDFs'; // Eto yung bago

import PdfUploads from './pages/Admin/PdfUploads';
import EditPDFs from './pages/Admin/EditPdfs';
import PendingActions from './pages/Admin/PendingActions';
import AdminManageAccount from './pages/Admin/AdminManageAccount'; // ANG BAGONG IMPORT
import AdminLogs from './pages/Admin/AdminLogs';
import PendingUpload from './pages/Admin/PendingUpload';

import Browse from './pages/Client/Browse';
import MyDownloads from './pages/Client/MyDownloads';
import RequestUpload from './pages/Client/RequestUpload';

export const ColorModeContext = createContext({ toggleColorMode: () => {} });

function App() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(localStorage.getItem('themeMode') || 'light');

  const colorMode = useMemo(() => ({
    toggleColorMode: () => {
      setMode((prevMode) => {
        const newMode = prevMode === 'light' ? 'dark' : 'light';
        localStorage.setItem('themeMode', newMode);
        return newMode;
      });
    },
  }), []);

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      ...(mode === 'dark' ? {
        primary: { main: '#90caf9' },
        background: { default: '#0f172a', paper: '#1e293b' },
        text: { primary: '#f8fafc' }
      } : {
        primary: { main: '#1e3a8a' },
        background: { default: '#f8fafc', paper: '#ffffff' }
      }),
    },
    shape: { borderRadius: 12 },
    typography: { fontFamily: 'Inter, sans-serif' }
  }), [mode]);

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
    // Check if user is currently resetting password
    const isResetting = window.location.pathname === '/forgot-password';

    supabase.auth.getSession().then(({ data: { session } }) => {
      // Logic: Do NOT fetch role if on the forgot-password page
      if (session && !isResetting) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const isCurrentlyResetting = window.location.pathname === '/forgot-password';
      
      // If a recovery event is triggered or they are on the recovery page, 
      // treat them as a guest (role = null)
      if (event === 'PASSWORD_RECOVERY' || isCurrentlyResetting) {
        setRole(null);
        setLoading(false);
        return;
      }

      if (session) {
        fetchUserRole(session.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
      <Typography variant="h6" color="text.secondary">Loading System...</Typography>
    </Box>
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/login" element={role ? <Navigate to="/" /> : <Login />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {role === 'superadmin' && (
              <Route element={<SuperAdminLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/manage-accounts" element={<ManageAccount />} />
                <Route path="/super-editpdfs" element={<SuperAdminEditPDFs />} />
                <Route path="/upload" element={<PdfUploads />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/pending-upload" element={<PendingUpload />} />
                <Route path="/delete-requests" element={<DeleteRequests />} />
                <Route path="/archived" element={<Archived />} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
              </Route>
            )}

            {(role === 'admin' || role === 'superadmin') && (
              <Route element={<AdminLayout />}>
                <Route path="/upload" element={<PdfUploads />} />
                <Route path="/edit" element={<EditPDFs />} />
                <Route path="/admin-manage-accounts" element={<AdminManageAccount />} />
                <Route path="/admin-logs" element={<AdminLogs />} />
                <Route path="/pending-upload" element={<PendingUpload />} />
                <Route path="/pending" element={<PendingActions />} />
                <Route path="/" element={<Navigate to="/upload" />} />  
              </Route>
            )}

            {role === 'client' && (
              <Route element={<ClientLayout />}>
                <Route path="/browse" element={<Browse />} />
                <Route path="/my-downloads" element={<MyDownloads />} />
                <Route path="/request-upload" element={<RequestUpload />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/" element={<Navigate to="/browse" />} />
              </Route>
            )}

            <Route path="*" element={role ? <Navigate to="/" /> : <Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;