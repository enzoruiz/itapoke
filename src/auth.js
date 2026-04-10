import { GOOGLE_CLIENT_ID, GOOGLE_IDENTITY_SCRIPT_URL } from './config.js';
import { clearCollectionsCache } from './collections.js';
import { apiRequest } from './http.js';

let googleScriptPromise = null;
let googleInitialized = false;
let authChangeHandler = () => {};
let authSession = null;

function notifyAuthChange() {
  authChangeHandler(getAuthSession());
}

function setSession(session) {
  authSession = session || null;
}

async function handleCredentialResponse(response) {
  try {
    const payload = await apiRequest('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential: response.credential || '' })
    });
    setSession(payload.user || null);
    clearCollectionsCache();
    notifyAuthChange();
  } catch (error) {
    console.error(error);
  }
}

async function loadGoogleScript() {
  if (window.google?.accounts?.id) return window.google;
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services.'));
    document.head.appendChild(script);
  });
  return googleScriptPromise;
}

async function ensureGoogleInitialized() {
  if (!GOOGLE_CLIENT_ID) throw new Error('Falta GOOGLE_CLIENT_ID');
  const google = await loadGoogleScript();
  if (!googleInitialized) {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true
    });
    googleInitialized = true;
  }
  return google;
}

export function setAuthChangeHandler(handler) {
  authChangeHandler = typeof handler === 'function' ? handler : () => {};
}

export function getAuthSession() {
  return authSession;
}

export function getActiveUserId() {
  return getAuthSession()?.sub || '';
}

export async function initializeAuth() {
  try {
    const payload = await apiRequest('/api/me');
    setSession(payload.user || null);
  } catch {
    setSession(null);
  }
  notifyAuthChange();
  return authSession;
}

export async function signOut() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error(error);
  }
  setSession(null);
  clearCollectionsCache();
  window.google?.accounts?.id?.disableAutoSelect?.();
  notifyAuthChange();
}

export function mountGoogleAuthButton(container, label = 'Iniciar con Google') {
  if (!container) return;
  if (getAuthSession()) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = '';

  const placeholder = document.createElement('div');
  placeholder.className = 'auth-google-placeholder';
  placeholder.textContent = 'Cargando Google...';
  container.appendChild(placeholder);

  void ensureGoogleInitialized()
    .then((google) => {
      if (getAuthSession()) {
        container.innerHTML = '';
        return;
      }
      container.innerHTML = '';
      google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        logo_alignment: 'left',
        width: 260
      });
    })
    .catch(() => {
      container.innerHTML = '';
      const fallback = document.createElement('button');
      fallback.type = 'button';
      fallback.className = 'action-btn primary auth-google-launch';
      fallback.textContent = label;
      fallback.addEventListener('click', () => mountGoogleAuthButton(container, label), { once: true });
      container.appendChild(fallback);
    });
}
