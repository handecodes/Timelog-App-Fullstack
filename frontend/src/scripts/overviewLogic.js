import { getHistory, formatDuration } from "./localStorage.js";

// Function that filters the localStorage history to user input date
function filterByTimeInterval(startDate, endDate) {
  const history = getHistory();
  return history.filter((item) => {
    const itemStart = parseLocaleDate(item.start);
    const itemEnd = parseLocaleDate(item.end);
    return itemStart >= startDate && itemEnd <= endDate;
  });
}

// Parsing user input
function parseLocaleDate(dateStr) {
  // Accept multiple input types: Date, number (ms), ISO string, or the app's 'YYYY-MM-DD HH:mm:ss'
  if (!dateStr && dateStr !== 0) {
    throw new Error(`Invalid date value: ${dateStr}`);
  }

  if (dateStr instanceof Date) return dateStr;

  if (typeof dateStr === 'number') return new Date(dateStr);

  if (typeof dateStr === 'string') {
    // First try the exact app format 'YYYY-MM-DD HH:mm:ss'
    const match = dateStr.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})$/);
    if (match) {
      const [, y, m, d, hh, mm, ss] = match.map(Number);
      return new Date(y, m - 1, d, hh, mm, ss);
    }

    // Next try parsing as an ISO or other parseable string
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Try handling common object shapes (e.g. { $date }, { date }, { seconds }, { ms })
  if (typeof dateStr === 'object') {
    try {
      if (dateStr instanceof Date) return dateStr;
      if (dateStr.$date) return new Date(dateStr.$date);
      if (dateStr.date) return new Date(dateStr.date);
      if (dateStr.value) return new Date(dateStr.value);
      if (typeof dateStr.seconds === 'number') return new Date(dateStr.seconds * 1000);
      if (typeof dateStr.ms === 'number') return new Date(dateStr.ms);
      if (typeof dateStr.timestamp === 'number') return new Date(dateStr.timestamp);
    } catch (e) {
      // fall through to error below
    }
  }

  // If we get here, provide a clearer error message
  let preview;
  try { preview = JSON.stringify(dateStr); } catch (e) { preview = String(dateStr); }
  throw new Error(`Invalid date format: ${preview}`);
}
// Formats the time so that it fits the local time, mirrors the time and date that your computer is in
function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const sec = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
}

// edit button
function editHistoryEntry(id, newStart, newEnd) {
  const history = getHistory();
  
  const saveStart = formatLocalDate(newStart);
  const saveEnd = formatLocalDate(newEnd);
  
  const updatedHistory = history.map((entry) => {
    if (Number(entry.id) === Number(id)) {
      return {
        ...entry,
        start: saveStart,
        end: saveEnd,
        duration: formatDuration(newEnd - newStart),
      };
    }
    return entry;
  });
  localStorage.setItem("time_log_history", JSON.stringify(updatedHistory));
}

// delete button
function deleteHistoryEntry(id) {
  const history = getHistory();

  const updatedHistory = history.filter(
    (entry) => Number(entry.id) !== Number(id)
  );

  localStorage.setItem("time_log_history", JSON.stringify(updatedHistory));
}

export { filterByTimeInterval, parseLocaleDate, editHistoryEntry, deleteHistoryEntry, };
