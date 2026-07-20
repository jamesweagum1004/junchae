import { useEffect, useState } from 'react';

const mobileQuery = '(max-width: 768px)';

const getIsMobile = () =>
  typeof window !== 'undefined' && window.matchMedia(mobileQuery).matches;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = window.matchMedia(mobileQuery);
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isMobile;
}
