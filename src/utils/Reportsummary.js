// src/utils/reportSummary.js
// Numerical summary section for the Admin + SuperAdmin PDF reports.
// Replaces the 9 colored KPI rectangles with: a headline number strip +
// two bar-chart panels (accounts by role, library activity).
// Pure jsPDF drawing, no extra libraries. Same 9 metrics as before.

const NAVY = [33, 60, 81];
const BLUE = [37, 99, 235];
const BORDER = [226, 232, 240];
const TRACK = [237, 242, 247];
const MUTED = [100, 116, 139];
const TEXT = [51, 65, 85];

const COLORS = {
  blue: [37, 99, 235],
  purple: [147, 51, 234],
  green: [5, 150, 105],
  indigo: [79, 70, 229],
  amber: [217, 119, 6],
  teal: [13, 148, 136],
  red: [220, 38, 38],
};

const fmt = (n) => Number(n || 0).toLocaleString('en-US');

// White bordered panel with a small title + blue accent underline.
const drawPanel = (doc, x, y, w, h, title) => {
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(String(title).toUpperCase(), x + 5, y + 8);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.8);
  doc.line(x + 5, y + 10.5, x + 17, y + 10.5);
  doc.setFont(undefined, 'normal');
};

// Headline number: light card, thin colored accent bar, big number.
const drawHeadlineStat = (doc, x, y, w, h, label, value, color) => {
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFillColor(...color);
  doc.rect(x, y + 2, 1.6, h - 4, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(String(label).toUpperCase(), x + 6, y + 7, { maxWidth: w - 10 });
  doc.setFontSize(19);
  doc.setTextColor(...NAVY);
  doc.text(fmt(value), x + 6, y + h - 5);
  doc.setFont(undefined, 'normal');
};

// Horizontal bar rows: label | track + fill | value text.
// `max` lets the caller pick the scale (e.g. total accounts for shares).
const drawBarRows = (doc, x, y, w, rows, { rowH = 11, labelW = 40, valueW = 30, max } = {}) => {
  const trackX = x + labelW;
  const trackW = w - labelW - valueW;
  const scale = Math.max(1, max ?? Math.max(...rows.map((r) => r.value)));
  rows.forEach((r, i) => {
    const cy = y + i * rowH;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT);
    doc.text(r.label, x, cy + 4.7);
    doc.setFillColor(...TRACK);
    doc.roundedRect(trackX, cy, trackW, 6.5, 1.2, 1.2, 'F');
    if (r.value > 0) {
      const bw = Math.max(2.5, Math.min(1, r.value / scale) * trackW);
      doc.setFillColor(...r.color);
      doc.roundedRect(trackX, cy, bw, 6.5, 1.2, 1.2, 'F');
    }
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...NAVY);
    doc.text(r.valueText ?? fmt(r.value), x + w, cy + 4.7, { align: 'right' });
  });
  doc.setFont(undefined, 'normal');
};

/**
 * @param doc    jsPDF instance (landscape)
 * @param startY y where the section may start (return value of drawReportHeader)
 * @param s      { registeredUsers, totalAccounts, users, admins, superAdmins,
 *                 totalPdfs, pendingRequests, totalDownloads, userRequests }
 * @returns      y where the next section can start
 */
export const drawReportSummary = (doc, startY, s) => {
  const pageW = doc.internal.pageSize.getWidth();
  const M = 14;
  const W = pageW - M * 2;
  let y = startY;

  // 1) Headline numbers
  const cols = 4;
  const gap = 5;
  const cw = (W - gap * (cols - 1)) / cols;
  const ch = 20;
  [
    ['Registered User Accounts', s.registeredUsers, COLORS.blue],
    ['Total Accounts', s.totalAccounts, COLORS.purple],
    ['Total PDFs', s.totalPdfs, COLORS.green],
    ['Total Downloads', s.totalDownloads, COLORS.amber],
  ].forEach(([label, value, color], i) => {
    drawHeadlineStat(doc, M + i * (cw + gap), y, cw, ch, label, value, color);
  });
  y += ch + 6;

  // 2) Two bar-chart panels side by side
  const panelH = 62;
  const leftW = W * 0.45;
  const rightW = W - leftW - 6;

  // Accounts by role (bar length = share of total accounts)
  drawPanel(doc, M, y, leftW, panelH, 'Accounts by Role');
  const total = s.totalAccounts || 0;
  const pct = (v) => (total ? ` (${Math.round((v / total) * 100)}%)` : '');
  drawBarRows(
    doc, M + 5, y + 17, leftW - 10,
    [
      { label: 'Total Users', value: s.users, color: COLORS.green, valueText: `${fmt(s.users)}${pct(s.users)}` },
      { label: 'Total Admins', value: s.admins, color: COLORS.indigo, valueText: `${fmt(s.admins)}${pct(s.admins)}` },
      { label: 'Total Super Admins', value: s.superAdmins, color: COLORS.purple, valueText: `${fmt(s.superAdmins)}${pct(s.superAdmins)}` },
    ],
    { rowH: 12, labelW: 36, valueW: 28, max: total }
  );

  // Library activity
  const rx = M + leftW + 6;
  drawPanel(doc, rx, y, rightW, panelH, 'Library Activity');
  drawBarRows(
    doc, rx + 5, y + 17, rightW - 10,
    [
      { label: 'Total PDFs', value: s.totalPdfs, color: COLORS.blue },
      { label: 'Total Downloads', value: s.totalDownloads, color: COLORS.amber },
      { label: 'Pending Requests', value: s.pendingRequests, color: COLORS.red },
      { label: 'User Requests', value: s.userRequests, color: COLORS.teal },
    ],
    { rowH: 10.5, labelW: 38, valueW: 20 }
  );

  return y + panelH + 10;
};