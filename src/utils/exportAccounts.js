import * as XLSX from 'xlsx';

const roleLabel = (role) => (role?.toLowerCase() === 'client' ? 'User' : role || '');

/**
 * Exports account profiles to an .xlsx file.
 * Only non-sensitive profile fields are exported (no passwords).
 */
export const exportAccountsToExcel = (accounts, { includeRole = true, filename = 'accounts' } = {}) => {
  const rows = accounts.map((u) => ({
    'Full Name': u.full_name || '',
    'ID Number': u.id_number || '',
    Department: u.department || '',
    'Year Level': u.year_level || '',
    Email: u.email || '',
    ...(includeRole ? { Role: roleLabel(u.role) } : {}),
    Status: u.computed_is_active ? 'Active' : 'Deactive',
    'Joined Date': u.created_at ? new Date(u.created_at).toLocaleDateString() : '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 28 }, { wch: 16 }, { wch: 32 }, { wch: 12 }, { wch: 32 },
    ...(includeRole ? [{ wch: 12 }] : []),
    { wch: 10 }, { wch: 14 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Accounts');
  XLSX.writeFile(wb, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`);
};