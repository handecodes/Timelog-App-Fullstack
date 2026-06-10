import { login, getAuthToken } from './api.js';
import { syncQueue, fetchRemoteHistory } from './localStorage.js';

// Create a fixed, visible login button and modal form so it's easy to find
(() => {
  try {
    const existing = document.getElementById('appLoginButton');
    if (existing) return;

    const loginBtn = document.createElement('button');
    loginBtn.id = 'appLoginButton';
    loginBtn.textContent = 'LOGIN';
    Object.assign(loginBtn.style, {
      position: 'fixed',
      top: '1rem',
      right: '1rem',
      zIndex: 9999,
      padding: '0.5rem 0.75rem',
      background: '#6b3b9d',
      color: '#fff',
      border: 'none',
      borderRadius: '0.5rem',
      cursor: 'pointer',
      boxShadow: '0 6px 18px rgba(0,0,0,0.15)'
    });
    document.body.appendChild(loginBtn);

    // modal
    const modal = document.createElement('div');
    modal.id = 'appLoginModal';
    Object.assign(modal.style, {
      display: 'none',
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.45)',
      zIndex: 9998,
      justifyContent: 'center',
      alignItems: 'center'
    });

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      background: '#fff',
      color: '#111',
      padding: '1rem 1.25rem',
      borderRadius: '0.5rem',
      minWidth: '280px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
    });

    panel.innerHTML = `
      <h3 style="margin:0 0 0.5rem 0">Sign in</h3>
      <label style="display:block;margin-bottom:0.5rem;">Username
        <input id="login_username_input" type="text" style="width:100%" />
      </label>
      <label style="display:block;margin-bottom:0.5rem;">Password
        <input id="login_password_input" type="password" style="width:100%" />
      </label>
      <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:0.5rem;">
        <button id="login_submit_btn" type="button" style="background:#6b3b9d;color:#fff;border:none;padding:0.4rem 0.6rem;border-radius:0.35rem">Sign in</button>
        <button id="login_cancel_btn" type="button" style="padding:0.4rem 0.6rem;border-radius:0.35rem">Cancel</button>
      </div>
      <div id="login_status_msg" style="margin-top:0.5rem;display:none"></div>
    `;

    modal.appendChild(panel);
    document.body.appendChild(modal);

    const openModal = () => { modal.style.display = 'flex'; };
    const closeModal = () => { modal.style.display = 'none'; };

    loginBtn.addEventListener('click', openModal);

    const submitBtn = panel.querySelector('#login_submit_btn');
    const cancelBtn = panel.querySelector('#login_cancel_btn');
    const usernameInput = panel.querySelector('#login_username_input');
    const passwordInput = panel.querySelector('#login_password_input');
    const status = panel.querySelector('#login_status_msg');

    cancelBtn.addEventListener('click', closeModal);

    submitBtn.addEventListener('click', async () => {
      const u = usernameInput.value?.trim();
      const p = passwordInput.value || '';
      status.style.display = 'none';
      try {
        const res = await login(u, p);
        status.style.display = 'block';
        status.style.color = 'green';
        status.textContent = 'Login successful';
    setTimeout(() => { status.style.display = 'none'; closeModal(); loginBtn.textContent = 'LOGGED IN'; }, 900);
    // After successful login, attempt to sync any queued local entries
    try { syncQueue(); } catch (err) { console.warn('syncQueue failed after login', err); }
    // Also try to fetch remote history to repopulate localStorage if it was cleared
    try {
      await fetchRemoteHistory();
      // Notify other parts of the app to refresh their views
      window.dispatchEvent(new Event('remoteHistoryFetched'));
    } catch (err) {
      console.warn('fetchRemoteHistory failed after login', err);
    }
      } catch (err) {
        status.style.display = 'block';
        status.style.color = 'red';
        status.textContent = 'Login failed';
        console.error('Login failed', err);
      }
    });

    // If already logged in, update button text
    if (getAuthToken()) loginBtn.textContent = 'LOGGED IN';
  } catch (err) {
    console.error('loginDOM init error', err);
  }
})();
