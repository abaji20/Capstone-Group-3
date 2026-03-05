import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SuperAdminLayout from './components/SuperAdminLayout';
import AdminLayout from './components/AdminLayout';
import ClientLayout from './components/ClientLayout';

{/* Client*/}
import Browse from './pages/Client/Browse';
import MyDownloads from './pages/Client/MyDownloads';
import RequestPdf from './pages/Client/RequestPdf';
import MyRequest from './pages/Client/MyRequest';

{/* SuperAdmin*/}
import ManageAccount from './pages/SuperAdmin/ManageAccount';
import Logs from './pages/SuperAdmin/Logs';
import DeleteRequests from './pages/SuperAdmin/DeleteRequest';
import Archived from './pages/SuperAdmin/Archived';
import Dashboard from './pages/SuperAdmin/Dashboard';

{/* Admin*/}

import EditPDFs from './pages/Admin/EditPdfs';
import PdfUploads from './pages/Admin/PdfUploads';
import PendingActions from './pages/Admin/PendingActions';
import UsersRequests from './pages/Admin/UserRequests';
import AdminLogs from './pages/Admin/AdminLogs';


function App() {
  // TEST MODE: Toggle between 'superadmin', 'admin', and 'client'
  const role = 'admin'; // Change this to 'superadmin' or 'client' to test different layouts

  return (
    <Router>
      <Routes>
        
        {/* 1. SUPER ADMIN ROUTES (Deep Navy Blue Theme) */}
        {role === 'superadmin' && (
          <Route element={<SuperAdminLayout />}>
            <Route path="/dashboard" element={<Dashboard/>} />
            <Route path="/manage-accounts" element={<ManageAccount/>} />
            <Route path="/logs" element={<Logs/>} />
            <Route path="/delete-requests" element={<DeleteRequests/>} />
            <Route path="/archived" element={<Archived/>} />
            {/* Default Page */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Route>
        )}

        {/* 2. ADMIN ROUTES (Royal Blue Theme) */}
        {role === 'admin' && (
          <Route element={<AdminLayout />}>
            <Route path="/upload" element={<PdfUploads/>} />
            <Route path="/edit" element={<EditPDFs/>} />
            <Route path="/requests" element={<PendingActions/>} />
            <Route path="/admin-logs" element={<AdminLogs/>} />
            <Route path="/pending" element={<UsersRequests/>} />
            {/* Default Page */}
            <Route path="/" element={<Navigate to="/upload" />} />
          </Route>
        )}

        {/* 3. CLIENT/STUDENT ROUTES (Sky Blue Topbar Theme) */}
        {role === 'client' && (
          <Route element={<ClientLayout />}>
            <Route path="/browse" element={<Browse />} />
            <Route path="/my-downloads" element={<MyDownloads/>} />
            <Route path="/pending-request" element={<MyRequest/>} />
            <Route path="/request-pdf" element={<RequestPdf/>} />
            {/* Default Page */}
            <Route path="/" element={<Navigate to="/browse" />} />
          </Route>
        )}

        {/* 4. CATCH-ALL ERROR PAGE */}
        <Route path="*" element={<div style={{ padding: '20px' }}>404 - Access Denied or Page Not Found</div>} />
        
      </Routes>
    </Router>
  );
}

export default App;