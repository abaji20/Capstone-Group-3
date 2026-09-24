import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import HistoryIcon from '@mui/icons-material/History';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import EditNoteIcon from '@mui/icons-material/EditNote';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ArchiveIcon from '@mui/icons-material/Archive';
import PublishIcon from '@mui/icons-material/Publish';

export const navLinks = {
  superadmin: [
    { name: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    { name: 'Manage Accounts', path: '/manage-accounts', icon: <PeopleIcon /> },
    { name: 'Update PDFs', path: '/super-editpdfs', icon: <EditNoteIcon /> },
    { name: 'Upload PDFs', path: '/upload', icon: <UploadFileIcon /> },
    { name: 'Activity Logs', path: '/logs', icon: <HistoryIcon /> },
    { name: 'Delete Requests', path: '/delete-requests', icon: <DeleteSweepIcon /> },
    { name: 'User Requests', path: '/pending-upload', icon: <PendingActionsIcon /> },
    { name: 'Archived', path: '/archived', icon: <ArchiveIcon /> },
  ],
  admin: [
    { name: 'Dashboard', path: '/admin-dashboard', icon: <DashboardIcon /> },
    { name: 'Upload PDFs', path: '/upload', icon: <UploadFileIcon /> },
    { name: 'Update PDFs', path: '/edit', icon: <EditNoteIcon /> },
    { name: 'Manage Users', path: '/admin-manage-accounts', icon: <PeopleIcon /> },
    { name: 'Activity Logs', path: '/admin-logs', icon: <HistoryIcon /> },
    { name: 'User Requests', path: '/pending-upload', icon: <PendingActionsIcon /> },
    { name: 'Pending Request', path: '/pending', icon: <PendingActionsIcon /> },
  ],
  client: [
    // MAIN group — reachable via the topbar hamburger drawer (no longer shown
    // inline in the toolbar row, now that Search covers browsing there).
    { name: 'Library', path: '/browse', icon: <LibraryBooksIcon />, group: 'main' },
    { name: 'Request Upload', path: '/request-upload', icon: <PublishIcon />, group: 'main' },

    // PROFILE group — Dashboard moved here per earlier grouping requirement
    { name: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, group: 'profile' },
    { name: 'Downloads', path: '/my-downloads', icon: <HistoryIcon />, group: 'profile' },
  ]
};