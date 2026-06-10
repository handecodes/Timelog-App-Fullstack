import { getHistory, fetchRemoteHistory, sanitizeLocalHistory } from './localStorage.js';
import { getAuthToken } from './api.js';

// Ensure remote history is fetched (if needed) before loading the overview UI
(async () => {
  try {
    // Always attempt to sanitize any existing local history first so malformed objects don't break the UI
    try { sanitizeLocalHistory(); } catch (e) { console.warn('overviewBootstrap: sanitizeLocalHistory failed', e); }
    const history = getHistory();
    if ((!history || history.length === 0) && getAuthToken()) {
      console.log('overviewBootstrap: no local history and auth present — fetching remote history');
      await fetchRemoteHistory();
      console.log('overviewBootstrap: fetchRemoteHistory complete');
    }
  } catch (err) {
    console.warn('overviewBootstrap: error while attempting remote fetch', err);
  }

  // Dynamically import the overview UI after data is ready (or immediately if nothing to fetch)
  await import('./overviewDOM.js');
})();
