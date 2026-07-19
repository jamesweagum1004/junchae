const SESSION_KEY = 'junchae_analytics_session_id';

function createSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getAnalyticsSessionId() {
  try {
    const current = sessionStorage.getItem(SESSION_KEY);
    if (current) return current;
    const next = createSessionId();
    sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return createSessionId();
  }
}

export function sendPageview(payload: {
  path: string;
  mode: 'normal' | 'secure';
  category_id?: string | null;
  site_id?: number | null;
  referrer?: string;
  session_id: string;
}) {
  const body = JSON.stringify(payload);
  const url = '/api/analytics/pageview';

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon(url, blob)) return;
  }

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
