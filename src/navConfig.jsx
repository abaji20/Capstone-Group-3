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
    // In-update natin ito para tumugma sa SuperAdminEditPDFs route
    { name: 'Edit PDFs', path: '/super-editpdfs', icon: <EditNoteIcon /> }, 
    { name: 'Upload PDFs', path: '/upload', icon: <UploadFileIcon /> },
    { name: 'Activity Logs', path: '/logs', icon: <HistoryIcon /> },
    { name: 'Delete Requests', path: '/delete-requests', icon: <DeleteSweepIcon /> },
    { name: 'Client Requests', path: '/pending-upload', icon: <PendingActionsIcon /> },
    { name: 'Archived/Restore', path: '/archived', icon: <ArchiveIcon /> },
  ],
  admin: [
    { name: 'Upload PDFs', path: '/upload', icon: <UploadFileIcon /> },
    { name: 'Edit PDFs', path: '/edit', icon: <EditNoteIcon /> },
    { name: 'Manage Clients', path: '/admin-manage-accounts', icon: <PeopleIcon /> },
    { name: 'Activity Logs', path: '/admin-logs', icon: <HistoryIcon /> },
    { name: 'Client Requests', path: '/pending-upload', icon: <PendingActionsIcon /> },
    { name: 'Pending Request', path: '/pending', icon: <PendingActionsIcon /> },  
  ],
  client: [ 
    { name: 'Library', path: '/browse', icon: <LibraryBooksIcon /> },
    { name: 'Request', path: '/request-upload', icon: <PublishIcon /> },
    { name: 'Downloads', path: '/my-downloads', icon: <HistoryIcon /> },
  ]
};