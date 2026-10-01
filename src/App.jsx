import { useEffect, useState, useMemo, useRef, createContext } from 'react';
import { flushSync } from 'react-dom';
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
import AdminDashboard from './pages/Admin/AdminDashboard'; // ADDED — new Admin Dashboard page

import Browse from './pages/Client/Browse';
import MyDownloads from './pages/Client/MyDownloads';
import RequestUpload from './pages/Client/RequestUpload';
import UserDashboard from './pages/Client/UserDashboard'; // ADDED — new User Dashboard page

export const ColorModeContext = createContext({ toggleColorMode: () => {} });

function App() {
  const [role, setRole] = useState(() => sessionStorage.getItem('current_tab_role') || null);
  const [loading, setLoading] = useState(() => !sessionStorage.getItem('current_tab_role'));
  const [mode, setMode] = useState(localStorage.getItem('themeMode') || 'light');
  const modeRef = useRef(mode);
  const transitionSnapshotRef = useRef(null);
  const activeThemeAnimationRef = useRef(null);

  const colorMode = useMemo(() => ({
    toggleColorMode: (event) => {
      const nextMode = modeRef.current === 'light' ? 'dark' : 'light';
      const bounds = event?.currentTarget?.getBoundingClientRect();
      const originX = bounds ? bounds.left + bounds.width / 2 : window.innerWidth / 2;
      const originY = bounds ? bounds.top + bounds.height / 2 : window.innerHeight / 2;

      activeThemeAnimationRef.current?.cancel();
      activeThemeAnimationRef.current = null;
      transitionSnapshotRef.current?.remove();

      const bodySnapshot = document.body.cloneNode(true);
      bodySnapshot.querySelectorAll('script, [data-theme-transition-snapshot]').forEach((node) => node.remove());
      Object.assign(bodySnapshot.style, {
        position: 'absolute',
        top: `${-window.scrollY}px`,
        left: '0',
        width: '100%',
        minHeight: '100vh',
        margin: '0',
        pointerEvents: 'none',
      });

      const snapshot = document.createElement('div');
      snapshot.dataset.themeTransitionSnapshot = 'true';
      snapshot.setAttribute('aria-hidden', 'true');
      snapshot.inert = true;
      Object.assign(snapshot.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483647',
        overflow: 'hidden',
        pointerEvents: 'none',
        backgroundColor: getComputedStyle(document.body).backgroundColor,
      });
      const revealMask = `radial-gradient(circle at ${originX}px ${originY}px, transparent var(--theme-reveal-radius), black calc(var(--theme-reveal-radius) + 1px))`;
      snapshot.style.maskImage = revealMask;
      snapshot.style.WebkitMaskImage = revealMask;
      snapshot.style.setProperty('--theme-reveal-radius', '0px');
      snapshot.append(bodySnapshot);

      modeRef.current = nextMode;
      flushSync(() => {
        localStorage.setItem('themeMode', nextMode);
        setMode(nextMode);
      });
      document.body.append(snapshot);
      transitionSnapshotRef.current = snapshot;

      const animation = snapshot.animate(
        [{ '--theme-reveal-radius': '0px' }, { '--theme-reveal-radius': '150vmax' }],
        { duration: 1300, easing: 'cubic-bezier(0.2, 0.75, 0.25, 1)', fill: 'both' }
      );
      activeThemeAnimationRef.current = animation;
      animation.onfinish = () => {
        if (activeThemeAnimationRef.current !== animation) return;
        snapshot.remove();
        activeThemeAnimationRef.current = null;
        transitionSnapshotRef.current = null;
      };
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
      // Fetch both role and is_active from your existing table structure
      const { data, error } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', userId)
        .single();
      
      if (error) throw error;

      if (data) {
        // Enforce restriction: If account is deactivated, sign out immediately
        if (data.is_active === false || data.is_active === 0) {
          await supabase.auth.signOut();
          setRole(null);
          sessionStorage.removeItem('current_tab_role');
          setLoading(false);
          return;
        }

        setRole(data.role);
        sessionStorage.setItem('current_tab_role', data.role);
      }
    } catch (err) {
      console.error("Error fetching role and status:", err);
      setRole(null);
      sessionStorage.removeItem('current_tab_role');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isResetting = window.location.pathname === '/forgot-password';

    // 1. Initial check scoped strictly to this tab's sessionStorage
    supabase.auth.getSession().then(({ data: { session } }) => {
      const activeRole = sessionStorage.getItem('current_tab_role');
      if (session && activeRole && !isResetting) {
        fetchUserRole(session.user.id);
      } else if (session && !activeRole && !isResetting && window.location.pathname === '/login') {
        // If session exists but no tab role, check status anyway
        fetchUserRole(session.user.id);
      } else {
        setRole(null);
        sessionStorage.removeItem('current_tab_role');
        setLoading(false);
      }
    });

    // 2. Listen to local auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const isCurrentlyResetting = window.location.pathname === '/forgot-password';
      
      if (event === 'PASSWORD_RECOVERY' || isCurrentlyResetting) {
        setRole(null);
        sessionStorage.removeItem('current_tab_role');
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_OUT' || !session) {
        setRole(null);
        sessionStorage.removeItem('current_tab_role');
        setLoading(false);
        return;
      }

      // ONLY process login if this tab was explicitly on the login page or already logged in
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        const storedRole = sessionStorage.getItem('current_tab_role');
        const isLoginPage = window.location.pathname === '/login';

        if (session && (storedRole || isLoginPage)) {
          fetchUserRole(session.user.id);
        } else {
          setLoading(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) return (
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
                <Route path="/admin-dashboard" element={<AdminDashboard />} /> 
                <Route path="/upload" element={<PdfUploads />} />
                <Route path="/edit" element={<EditPDFs />} />
                <Route path="/admin-manage-accounts" element={<AdminManageAccount />} />
                <Route path="/admin-logs" element={<AdminLogs />} />
                <Route path="/pending-upload" element={<PendingUpload />} />
                <Route path="/pending" element={<PendingActions />} />
                <Route path="/" element={<Navigate to="/admin-dashboard" />} />  
              </Route>
            )}

            {role === 'client' && (
              <Route element={<ClientLayout />}>
                <Route path="/browse" element={<Browse />} />
                <Route path="/my-downloads" element={<MyDownloads />} />
                <Route path="/request-upload" element={<RequestUpload />} />
                <Route path="/dashboard" element={<UserDashboard />} /> {/* ADDED — new User Dashboard route */}
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