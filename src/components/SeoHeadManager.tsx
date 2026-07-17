import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';

const getOrCreateMeta = (selector: string, attrs: Record<string, string>) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attrs).forEach(([key, value]) => element?.setAttribute(key, value));
    document.head.appendChild(element);
  }
  return element;
};

export default function SeoHeadManager() {
  const { mode } = useTheme();
  const { categories } = useData();

  useEffect(() => {
    const isSecure = mode === 'secure';
    const title = isSecure ? 'junchae 안전 접속 링크 모음' : 'junchae 링크 디렉터리';
    const description = isSecure
      ? '안전 접속 모드에서 대피소 링크와 우회 접속 정보를 확인하세요.'
      : '공식 사이트와 주요 링크를 카테고리별로 확인하세요.';

    document.title = title;
    getOrCreateMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', description);
    getOrCreateMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', title);
    getOrCreateMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', description);

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + window.location.pathname;
  }, [mode, categories]);

  useEffect(() => {
    const dbMode = mode === 'secure' ? 'secure' : 'normal';
    fetch(`/api/settings?mode=${dbMode}&section=sitekit`)
      .then((res) => res.json())
      .then((body) => {
        if (!body?.ok) return;
        const settings = body.data || {};

        const verification = String(settings.search_console_meta || '').match(/content=["']([^"']+)["']/)?.[1] || '';
        if (verification) {
          getOrCreateMeta('meta[name="google-site-verification"]', { name: 'google-site-verification' })
            .setAttribute('content', verification);
        }

        const gaId = String(settings.ga4_script || '').match(/G-[A-Z0-9]+/i)?.[0];
        if (gaId && !document.getElementById('junchae-ga4')) {
          const script = document.createElement('script');
          script.id = 'junchae-ga4';
          script.async = true;
          script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
          document.head.appendChild(script);

          const inline = document.createElement('script');
          inline.id = 'junchae-ga4-init';
          inline.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`;
          document.head.appendChild(inline);
        }
      })
      .catch((err) => console.error('SiteKit 설정 적용 실패', err));
  }, [mode]);

  return null;
}
