import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useTheme } from '../context/ThemeContext';
import { getAnalyticsSessionId, sendPageview } from '../lib/analytics';

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function AnalyticsTracker() {
  const location = useLocation();
  const { adminPath, isConfigLoaded } = useAdminAuth();
  const { mode } = useTheme();

  useEffect(() => {
    if (!isConfigLoaded) return;
    const path = location.pathname;
    const normalizedAdminPath = `/${adminPath}`;
    if (!path || path.startsWith('/api')) return;
    if (path === normalizedAdminPath || path.startsWith(`${normalizedAdminPath}/`)) return;

    const categoryMatch = path.match(/^\/category\/([^/]+)/);
    sendPageview({
      path,
      mode: mode === 'secure' ? 'secure' : 'normal',
      category_id: categoryMatch ? safeDecode(categoryMatch[1]) : null,
      site_id: null,
      referrer: document.referrer || '',
      session_id: getAnalyticsSessionId(),
    });
  }, [adminPath, isConfigLoaded, location.pathname, mode]);

  return null;
}
