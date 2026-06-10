import * as API from "./api.js";

const STORAGE_KEY = "time_log_history";
const SYNC_QUEUE_KEY = "time_log_sync_queue";

function formatDuration(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function logCurrentTime(category, startTime, endTime = Date.now()) {
  const existingHistory = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

  const durationMs = endTime - startTime;
  const duration = formatDuration(durationMs);

  const startD = new Date(startTime);
  const endD = new Date(endTime);

  const startStr = `${startD.getFullYear()}-${pad(startD.getMonth() + 1)}-${pad(startD.getDate())} ${pad(startD.getHours())}:${pad(startD.getMinutes())}:${pad(startD.getSeconds())}`;
  const endStr = `${endD.getFullYear()}-${pad(endD.getMonth() + 1)}-${pad(endD.getDate())} ${pad(endD.getHours())}:${pad(endD.getMinutes())}:${pad(endD.getSeconds())}`;

  const entry = {
    id: Date.now(), // id needed for editing
    category,
    start: startStr,
    end: endStr,
    duration,
  };

  existingHistory.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existingHistory));

  console.log(`Logged: ${entry.start} → ${entry.end}`);
  console.log(`Category: ${category}`);
  console.log(`Duration: ${duration}`);

  // Try to sync with backend
  syncToBackend(entry);
}

function getHistory() {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  const hasObjectDates = raw.some(it => (it && typeof it.start === 'object') || (it && typeof it.end === 'object'));
  if (hasObjectDates) {
    try {
      console.log('getHistory: detected object-shaped dates, sanitizing local history');
      sanitizeLocalHistory();
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      console.warn('getHistory: sanitizeLocalHistory failed', e);
      return raw;
    }
  }
  return raw;
}

// Helper: convert many common shapes to ISO string or return null
function toIsoString(val) {
  if (!val && val !== 0) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'number') return new Date(val).toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (val.$date) return typeof val.$date === 'string' ? val.$date : new Date(val.$date).toISOString();
    if (val.date) return typeof val.date === 'string' ? val.date : new Date(val.date).toISOString();
    if (val.value) return typeof val.value === 'string' ? val.value : new Date(val.value).toISOString();
    if (typeof val.seconds === 'number') return new Date(val.seconds * 1000).toISOString();
    if (typeof val.ms === 'number') return new Date(val.ms).toISOString();
    if (typeof val.timestamp === 'number') return new Date(val.timestamp).toISOString();
  }
  return null;
}

function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
  console.log("History cleared.");
}

// ===== Backend Sync Functions =====
async function syncToBackend(entry) {
  if (!API.getAuthToken()) {
    console.log("Not authenticated. Entry saved locally.");
    return;
  }

  try {
    const backendEntry = {
      name: entry.category,
      description: "",
      startTime: new Date(entry.start).toISOString(),
      endTime: new Date(entry.end).toISOString(),
    };

    const result = await API.createTimeLog(backendEntry);
    console.log("Synced to backend:", result);
  } catch (error) {
    console.error("Failed to sync to backend:", error);
    // Add to sync queue for retry
    addToSyncQueue(entry);
  }
}

function addToSyncQueue(entry) {
  const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY)) || [];
  queue.push(entry);
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

async function syncQueue() {
  const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY)) || [];
  if (queue.length === 0) return;

  if (!API.getAuthToken()) {
    console.log("Not authenticated. Cannot sync queue.");
    return;
  }

  const failed = [];
  for (const entry of queue) {
    try {
      await syncToBackend(entry);
    } catch (error) {
      console.error("Failed to sync entry:", error);
      failed.push(entry);
    }
  }

  if (failed.length === 0) {
    localStorage.removeItem(SYNC_QUEUE_KEY);
    console.log("Sync queue cleared.");
  } else {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(failed));
    console.log(`${failed.length} items remain in sync queue.`);
  }
}

export { logCurrentTime, getHistory, clearHistory, formatDuration, syncToBackend, syncQueue, addToSyncQueue };

/**
 * Sanitize existing localStorage history entries in-place:
 * - Convert start/end objects to canonical string format when possible
 * - Remove entries missing valid start/end
 */
function sanitizeLocalHistory() {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  const cleaned = [];
  const removed = [];
  for (const it of raw) {
    try {
      let startIso = toIsoString(it.start);
      let endIso = toIsoString(it.end);

      // If start/end are missing but a duration string exists, reconstruct timestamps
      if ((!startIso || !endIso) && it.duration) {
        // duration expected as HH:MM:SS (may be long hours)
        const parseDurationToMs = (dur) => {
          if (!dur || typeof dur !== 'string') return null;
          const parts = dur.split(':').map(p => Number(p));
          if (parts.some(p => isNaN(p))) return null;
          // allow H:MM:SS or HH:MM:SS
          if (parts.length === 3) {
            const [h, m, s] = parts; return ((h*3600)+(m*60)+s)*1000;
          }
          if (parts.length === 2) {
            const [m, s] = parts; return ((m*60)+s)*1000;
          }
          return null;
        };

        const durMs = parseDurationToMs(it.duration);
        if (durMs !== null) {
          endIso = endIso || new Date().toISOString();
          startIso = startIso || new Date(Date.now() - durMs).toISOString();
        }
      }

      if (!startIso || !endIso) { removed.push(it); continue; }

      const start = isoToLocal(startIso);
      const end = isoToLocal(endIso);
      const durationMs = (new Date(endIso) - new Date(startIso)) || 0;
      cleaned.push({ id: it.id || Date.now(), category: it.category || 'General', start, end, duration: formatDuration(durationMs) });
    } catch (e) {
      removed.push(it);
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  console.log(`sanitizeLocalHistory: cleaned ${cleaned.length} entries, removed ${removed.length}.`);
  return { cleaned, removed };
}

export { fetchRemoteHistory, sanitizeLocalHistory };

if (typeof window !== 'undefined') {
  window.fetchRemoteHistory = fetchRemoteHistory;
  window.sanitizeLocalHistory = sanitizeLocalHistory;
}

// ===== Remote fetch / populate =====
function isoToLocal(iso) {
  try {
    const d = new Date(iso);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hour = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const sec = String(d.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
  } catch (err) {
    return iso;
  }
}

/**
 * Fetch timelogs from backend and populate localStorage when local history is empty.
 * - Only runs when authenticated (requires JWT in localStorage via API.getAuthToken())
 * - Does not overwrite existing local history unless it's empty
 */
async function fetchRemoteHistory(pageSize = 1000) {
  const existing = getHistory();
  if (existing.length > 0) return; // don't overwrite user data

  if (!API.getAuthToken()) {
    console.log("Not authenticated — skipping remote fetch of history.");
    return;
  }

  try {
    console.log('fetchRemoteHistory: starting fetch, pageSize=', pageSize);
    console.log('fetchRemoteHistory: auth token present? ', !!API.getAuthToken());

    const page = await API.getTimeLogs({ pageNumber: 1, pageSize });
    console.log('fetchRemoteHistory: raw page response', page);
    // Support multiple possible API shapes:
    // - { value: [...] } (asp.net paging)
    // - { data: [...], pagination: {...} } (custom)
    // - an array directly
    let items = [];
    if (!page) items = [];
    else if (Array.isArray(page)) items = page;
    else items = page.value || page.data || page.items || [];

    if (!items || items.length === 0) {
      console.log("No remote timelogs returned.");
      return;
    }

    console.log('fetchRemoteHistory: items.length =', items.length);

    function toIsoString(val) {
      if (!val && val !== 0) return null;
      if (val instanceof Date) return val.toISOString();
      if (typeof val === 'number') return new Date(val).toISOString();
      if (typeof val === 'string') return val;
      if (typeof val === 'object') {
        // Common shapes: { $date: '...' }, { date: '...' }, { seconds: 12345 }
        if (val.$date) return typeof val.$date === 'string' ? val.$date : new Date(val.$date).toISOString();
        if (val.date) return typeof val.date === 'string' ? val.date : new Date(val.date).toISOString();
        if (val.value) return typeof val.value === 'string' ? val.value : new Date(val.value).toISOString();
        if (typeof val.seconds === 'number') return new Date(val.seconds * 1000).toISOString();
        if (typeof val.ms === 'number') return new Date(val.ms).toISOString();
        if (typeof val.timestamp === 'number') return new Date(val.timestamp).toISOString();
      }
      return null;
    }

    const mapped = [];
    const skipped = [];
    for (const it of items) {
      const rawStart = it.startTime || it.start || it.start_time || it.createdAt || it.created_at;
      const rawEnd = it.endTime || it.end || it.end_time || it.updatedAt || it.updated_at;
      const startIso = toIsoString(rawStart);
      const endIso = toIsoString(rawEnd);

      if (!startIso || !endIso) {
        skipped.push({ id: it.id, rawStart, rawEnd });
        continue; // skip malformed entries rather than defaulting to now
      }

      const start = isoToLocal(startIso);
      const end = isoToLocal(endIso);
      const durationMs = (new Date(endIso) - new Date(startIso)) || 0;

      mapped.push({
        id: it.id || it.id?.toString() || Date.now() + Math.floor(Math.random() * 1000),
        category: it.name || it.category || 'General',
        start,
        end,
        duration: formatDuration(durationMs),
      });
    }

    if (skipped.length > 0) console.warn('fetchRemoteHistory: skipped malformed items', skipped.slice(0,10));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
    console.log(`Populated local history with ${mapped.length} items from backend. ${skipped.length} skipped.`);
  } catch (err) {
    console.error("Failed to fetch remote history:", err);
  }
}


// Expose helper for quick manual testing in the browser console
if (typeof window !== 'undefined') {
  window.fetchRemoteHistory = fetchRemoteHistory;
}
