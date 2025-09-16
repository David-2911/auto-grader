import { authConfig } from '@/config/authConfig';
import { decodeJwt } from '@/utils/jwt';
import store from '@/store';
import { logout } from '@/store/slices/authSlice';
import { api } from '@/store/api/apiSlice';

let timerId: ReturnType<typeof setTimeout> | null = null;
let refreshPromise: Promise<any> | null = null;
let consecutiveFailures = 0;

export function clearRefreshTimer() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
}

function schedule(delayMs: number) {
  clearRefreshTimer();
  timerId = setTimeout(() => {
    triggerScheduledRefresh();
  }, delayMs);
}

export function scheduleFromToken(token: string) {
  const decoded = decodeJwt(token);
  if (!decoded?.exp) return; // cannot schedule
  const nowSec = Date.now() / 1000;
  const ttl = decoded.exp - nowSec;
  const { refreshLeadTimeSec, minImmediateRefreshSec, jitterMaxSec } = authConfig;

  if (ttl <= 0) {
    store.dispatch(logout());
    return;
  }
  if (ttl < minImmediateRefreshSec) {
    triggerScheduledRefresh();
    return;
  }
  const targetOffset = Math.max(ttl - refreshLeadTimeSec, minImmediateRefreshSec);
  const jitter = Math.random() * jitterMaxSec;
  const delayMs = Math.max(0, (targetOffset - jitter) * 1000);
  schedule(delayMs);
}

export function triggerScheduledRefresh() {
  const state = store.getState() as any;
  const refreshToken = state.auth.refreshToken;
  if (!refreshToken) return; // nothing to do
  if (refreshPromise) return refreshPromise; // single-flight

  refreshPromise = store.dispatch(
    api.endpoints.refreshSession.initiate({ refreshToken })
  ).unwrap()
    .then(() => {
      consecutiveFailures = 0;
      localStorage.setItem(authConfig.storageEventChannel, Date.now().toString());
      const latest = (store.getState() as any).auth.token;
      if (latest) scheduleFromToken(latest);
    })
    .catch((err: any) => {
      consecutiveFailures++;
      if (err?.status === 401 || consecutiveFailures >= authConfig.maxConsecutiveFailures) {
        store.dispatch(logout());
      } else {
        // light retry after 5s
        setTimeout(() => {
          const s = store.getState() as any;
          if (s.auth.token && s.auth.refreshToken) triggerScheduledRefresh();
        }, 5000);
      }
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

export function getActiveRefreshPromise() {
  return refreshPromise;
}

export function onTokensUpdated() {
  const state = store.getState() as any;
  const token = state.auth.token;
  if (token) {
    scheduleFromToken(token);
  } else {
    clearRefreshTimer();
  }
}

// Multi-tab sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'token' || e.key === 'refreshToken') {
      onTokensUpdated();
    }
    if (e.key === authConfig.storageEventChannel && e.newValue) {
      // another tab refreshed; reschedule based on new token
      onTokensUpdated();
    }
  });
  // Activity-based trigger
  const activityHandler = () => {
    const state = store.getState() as any;
    const token = state.auth.token;
    const decoded = token ? decodeJwt(token) : null;
    if (!decoded?.exp) return;
    const nowSec = Date.now() / 1000;
    const ttl = decoded.exp - nowSec;
    if (ttl > 0 && ttl < authConfig.activityRenewWindowSec) {
      triggerScheduledRefresh();
    }
  };
  ['visibilitychange', 'focus'].forEach(ev => window.addEventListener(ev, activityHandler));
  ['mousemove', 'keydown'].forEach(ev => window.addEventListener(ev, activityHandler));
}
