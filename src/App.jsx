import { useEffect, useState, useMemo, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import glclogo from './assets/glclogo.png';

// MUI Theme Imports
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography, CircularProgress } from '@mui/material';

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
import SuperAdminEditPDFs from './pages/SuperAdmin/SuperAdminEditPDFs';

import PdfUploads from './pages/Admin/PdfUploads';
import EditPDFs from './pages/Admin/EditPdfs';
import PendingActions from './pages/Admin/PendingActions';
import AdminManageAccount from './pages/Admin/AdminManageAccount';
import AdminLogs from './pages/Admin/AdminLogs';
import PendingUpload from './pages/Admin/PendingUpload';

import Browse from './pages/Client/Browse';
import MyDownloads from './pages/Client/MyDownloads';
import RequestUpload from './pages/Client/RequestUpload';

export const ColorModeContext = createContext({ toggleColorMode: () => {} });

function App() {
  const [role, setRole] = useState(() => sessionStorage.getItem('current_tab_role') || null);
  const [loading, setLoading] = useState(() => !sessionStorage.getItem('current_tab_role'));
  const [isFocusSyncing, setIsFocusSyncing] = useState(false);
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

  const fetchUserRole = async (userId, isFocusEvent = false) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (data) {
        setRole(data.role);
        sessionStorage.setItem('current_tab_role', data.role);
      }
    } catch (err) {
      console.error("Error fetching role:", err);
    } finally {
      setLoading(false);
      if (isFocusEvent) {
        setTimeout(() => setIsFocusSyncing(false), 150);
      }
    }
  };

  useEffect(() => {
    const isResetting = window.location.pathname === '/forgot-password';

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !isResetting) {
        fetchUserRole(session.user.id);
      } else {
        setRole(null);
        sessionStorage.removeItem('current_tab_role');
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const isCurrentlyResetting = window.location.pathname === '/forgot-password';
      
      if (event === 'PASSWORD_RECOVERY' || isCurrentlyResetting) {
        setRole(null);
        sessionStorage.removeItem('current_tab_role');
        setLoading(false);
        return;
      }

      if (session) {
        fetchUserRole(session.user.id);
      } else {
        setRole(null);
        sessionStorage.removeItem('current_tab_role');
        setLoading(false);
      }
    });

    const handleFocus = () => {
      setIsFocusSyncing(true);
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          fetchUserRole(session.user.id, true);
        } else {
          setRole(null);
          sessionStorage.removeItem('current_tab_role');
          setIsFocusSyncing(false);
        }
      });
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  if (loading || isFocusSyncing) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default', gap: 2 }}>
      <Box 
        component="img" 
        src={glclogo} 
        alt="GLC Logo" 
        sx={{ width: 150, height: 'auto', mb: 1, objectFit: 'contain' }} 
      />
      <CircularProgress color="primary" size={32} />
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Loading session...</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Be The Best That You Can Be</Typography>
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

            {role === 'admin' && (
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