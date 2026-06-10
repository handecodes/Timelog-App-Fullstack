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
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
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
