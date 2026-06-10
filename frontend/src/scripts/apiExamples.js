/**
 * Example: How to integrate API calls into your frontend components
 * This file demonstrates common patterns for using the TimelogAPI
 */

// ===== Example 1: Authenticate User =====
async function authenticateUser(email, password) {
  try {
    const response = await import('./api.js').then(m => m.login(email, password));
    const { token } = response;
    
    // Store token for future requests
    const { setAuthToken } = await import('./api.js');
    setAuthToken(token);
    
    console.log('User authenticated successfully');
    return token;
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}

// ===== Example 2: Load and Display Categories =====
async function loadCategories() {
  try {
    const { getCategories } = await import('./api.js');
    const categories = await getCategories();
    
    // Update DOM with categories
    const categorySelect = document.getElementById('categorySelect');
    categorySelect.innerHTML = '';
    
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      option.style.backgroundColor = cat.color || '#999';
      categorySelect.appendChild(option);
    });
    
    return categories;
  } catch (error) {
    console.error('Failed to load categories:', error);
    // Fallback to stored categories or show error
  }
}

// ===== Example 3: Create a New TimeLog When Stopping Timer =====
async function createTimeLogFromTimer(category, startTime, endTime) {
  try {
    const { createTimeLog, getAuthToken } = await import('./api.js');
    
    // Only sync if authenticated
    if (!getAuthToken()) {
      console.log('Not authenticated. Saving to localStorage only.');
      return null;
    }
    
    const timeLog = {
      name: category,
      description: '',
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    };
    
    const result = await createTimeLog(timeLog);
    console.log('TimeLog created on backend:', result);
    
    return result;
  } catch (error) {
    console.error('Failed to create TimeLog:', error);
    // Fall back to localStorage sync queue
    return null;
  }
}

// ===== Example 4: Display User's TimeLogs =====
async function displayUserTimeLogs(pageNumber = 1, pageSize = 20) {
  try {
    const { getTimeLogs } = await import('./api.js');
    
    const response = await getTimeLogs({
      pageNumber,
      pageSize,
    });
    
    const { value: timeLogs, pageIndex, pageSize: size, totalRecordCount } = response;
    
    const timelogsContainer = document.getElementById('timelogsContainer');
    timelogsContainer.innerHTML = '';
    
    timeLogs.forEach(log => {
      const logElement = document.createElement('div');
      logElement.className = 'timelog-item';
      logElement.innerHTML = `
        <div class="timelog-name">${log.name}</div>
        <div class="timelog-time">
          ${new Date(log.startTime).toLocaleString()} - ${new Date(log.endTime).toLocaleString()}
        </div>
        <div class="timelog-duration">${calculateDuration(log.startTime, log.endTime)}</div>
        <button onclick="deleteTimelog(${log.id})">Delete</button>
      `;
      timelogsContainer.appendChild(logElement);
    });
    
    console.log(`Showing ${timeLogs.length} of ${totalRecordCount} time logs`);
    return { timeLogs, totalRecordCount, pageIndex, pageSize: size };
  } catch (error) {
    console.error('Failed to load TimeLogs:', error);
  }
}

// ===== Example 5: Delete a TimeLog =====
async function deleteTimelog(id) {
  try {
    const { deleteTimeLog } = await import('./api.js');
    
    await deleteTimeLog(id);
    console.log('TimeLog deleted successfully');
    
    // Refresh the display
    await displayUserTimeLogs();
  } catch (error) {
    console.error('Failed to delete TimeLog:', error);
  }
}

// ===== Example 6: Sync Offline Data When Coming Online =====
async function syncOfflineData() {
  try {
    const { getAuthToken } = await import('./api.js');
    const { syncQueue } = await import('./localStorage.js');
    
    if (!getAuthToken()) {
      console.log('User not authenticated. Skipping sync.');
      return;
    }
    
    console.log('Syncing offline data with backend...');
    await syncQueue();
    
    // Refresh display after sync
    await displayUserTimeLogs();
  } catch (error) {
    console.error('Failed to sync offline data:', error);
  }
}

// ===== Example 7: Calculate Duration Helper =====
function calculateDuration(startTime, endTime) {
  const durationMs = new Date(endTime) - new Date(startTime);
  const totalSecs = Math.floor(durationMs / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ===== Example 8: Listen for Online/Offline Events =====
window.addEventListener('online', async () => {
  console.log('Back online. Attempting to sync...');
  await syncOfflineData();
});

window.addEventListener('offline', () => {
  console.log('App is offline. Changes will be synced when back online.');
});

// Export for use in other modules
export {
  authenticateUser,
  loadCategories,
  createTimeLogFromTimer,
  displayUserTimeLogs,
  deleteTimelog,
  syncOfflineData,
  calculateDuration,
};
