// src/utils/formatPublishedDate.js
//
// Shared helpers for the publication date, which is stored in three columns:
//   published_date  -> the YEAR   (required)
//   published_month -> 1-12       (optional)
//   published_day   -> 1-31       (optional)

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Turns the three columns into one readable string.
//   year only            -> "2020"
//   year + month         -> "March 2020"
//   year + month + day   -> "March 15, 2020"
// Works with a DB record OR the form data (any object with those keys).
export const formatPublishedDate = (item) => {
  if (!item) return 'N/A';

  const year = item.published_date;
  if (year === null || year === undefined || year === '') return 'N/A';

  const month = Number(item.published_month);
  const day = Number(item.published_day);
  const monthName = month >= 1 && month <= 12 ? MONTH_NAMES[month - 1] : null;

  if (monthName && day >= 1 && day <= 31) return `${monthName} ${day}, ${year}`;
  if (monthName) return `${monthName} ${year}`;
  return String(year);
};

// How many days a month has. If the year isn't complete yet we assume a leap
// year (2000) so "Feb 29" isn't blocked while the user is still typing.
export const getDaysInMonth = (year, month) => {
  const y = String(year).length === 4 ? Number(year) : 2000;
  return new Date(y, Number(month), 0).getDate();
};

// True when the chosen year / month / day is later than today.
export const isFutureDate = (data) => {
  if (String(data.published_date).length !== 4) return false;
  const now = new Date();
  const y = Number(data.published_date);
  const m = Number(data.published_month);
  const d = Number(data.published_day);
  if (y > now.getFullYear()) return true;
  if (y === now.getFullYear() && m && m > now.getMonth() + 1) return true;
  if (y === now.getFullYear() && m === now.getMonth() + 1 && d && d > now.getDate()) return true;
  return false;
};

// Keeps month/day consistent: no day without a month, and no day that the
// month doesn't have (e.g. Feb 30, or Feb 29 in a non-leap year).
export const normalizePubDate = (data) => {
  const next = { ...data };
  if (!next.published_month) next.published_day = '';
  if (next.published_month && next.published_day) {
    if (Number(next.published_day) > getDaysInMonth(next.published_date, next.published_month)) {
      next.published_day = '';
    }
  }
  return next;
};