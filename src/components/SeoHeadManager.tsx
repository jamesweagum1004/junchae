import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

type GlobalSeoSettings = {
  site_name?: string;
  homepage_title?: string;
  homepage_description?: string;
  homepage_keywords?: string;
  canonical_url?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_type?: string;
  robots?: string;
};

const defaultGlobalSeo: Required<GlobalSeoSettings> = {
  site_name: '전체닷컴',
  homepage_title: '전체닷컴 - 인기 사이트 주소 모음 | 빠른 링크 허브',
  homepage_description:
    '전체닷컴은 포털, 커뮤니티, OTT, 영화, 웹툰, 쇼핑 등 주요 사이트 주소를 카테고리별로 빠르게 확인할 수 있는 링크 허브입니다.',
  homepage_keywords: '사이트 주소, 링크 모음, 인기 사이트, 커뮤니티 주소, 웹툰 주소, OTT 사이트, 영화 사이트, 전체닷컴',
  canonical_url: 'https://junchae.com',
  og_title: '전체닷컴 - 인기 사이트 주소 모음',
  og_description: '포털, 커뮤니티, 웹툰, 영화, OTT, 쇼핑 사이트를 한 곳에서 빠르게 확인하세요.',
  og_image: '/uploads/og/default-og.png',
  og_type: 'website',
  robots: 'index,follow',
};

const getOrCreateMeta = (selector: string, attrs: Record<string, string>) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attrs).forEach(([key, value]) => element?.setAttribute(key, value));
    document.head.appendChild(element);
  }
  return element;
};

const getOrCreateCanonical = () => {
  let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  return canonical;
};

const normalizeSetting = (value: unknown, fallback: string) => {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const applyGlobalSeo = (settings: GlobalSeoSettings) => {
  const merged = {
    site_name: normalizeSetting(settings.site_name, defaultGlobalSeo.site_name),
    homepage_title: normalizeSetting(settings.homepage_title, defaultGlobalSeo.homepage_title),
    homepage_description: normalizeSetting(settings.homepage_description, defaultGlobalSeo.homepage_description),
    homepage_keywords: normalizeSetting(settings.homepage_keywords, defaultGlobalSeo.homepage_keywords),
    canonical_url: normalizeSetting(settings.canonical_url, defaultGlobalSeo.canonical_url),
    og_title: normalizeSetting(settings.og_title, settings.homepage_title || defaultGlobalSeo.og_title),
    og_description: normalizeSetting(settings.og_description, settings.homepage_description || defaultGlobalSeo.og_description),
    og_image: normalizeSetting(settings.og_image, defaultGlobalSeo.og_image),
    og_type: normalizeSetting(settings.og_type, defaultGlobalSeo.og_type),
    robots: normalizeSetting(settings.robots, defaultGlobalSeo.robots),
  };

  document.title = merged.homepage_title;
  getOrCreateMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', merged.homepage_description);
  getOrCreateMeta('meta[name="keywords"]', { name: 'keywords' }).setAttribute('content', merged.homepage_keywords);
  getOrCreateMeta('meta[name="robots"]', { name: 'robots' }).setAttribute('content', merged.robots);
  getOrCreateMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', merged.og_title);
  getOrCreateMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', merged.og_description);
  getOrCreateMeta('meta[property="og:image"]', { property: 'og:image' }).setAttribute('content', merged.og_image);
  getOrCreateMeta('meta[property="og:type"]', { property: 'og:type' }).setAttribute('content', merged.og_type);
  getOrCreateMeta('meta[property="og:site_name"]', { property: 'og:site_name' }).setAttribute('content', merged.site_name);
  getOrCreateCanonical().href = merged.canonical_url;
};

const removeElement = (id: string) => {
  const element = document.getElementById(id);
  if (element) element.remove();
};

export default function SeoHeadManager() {
  const { mode } = useTheme();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/category/')) return;

    const dbMode = mode === 'secure' ? 'secure' : 'normal';
    let cancelled = false;

    fetch(`/api/settings?mode=${dbMode}&section=global_seo`)
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (!body?.ok) {
          applyGlobalSeo(defaultGlobalSeo);
          return;
        }
        applyGlobalSeo(body.data || {});
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Global SEO settings load failed', err);
          applyGlobalSeo(defaultGlobalSeo);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mode, location.pathname]);

  useEffect(() => {
    const dbMode = mode === 'secure' ? 'secure' : 'normal';
    let cancelled = false;

    fetch(`/api/settings?mode=${dbMode}&section=sitekit`)
      .then((res) => res.json())
      .then((body) => {
        if (cancelled || !body?.ok) return;
        const settings = body.data || {};

        const verification = String(settings.search_console_meta || '').match(/content=["']([^"']+)["']/)?.[1] || '';
        if (verification) {
          getOrCreateMeta('meta[name="google-site-verification"]', { name: 'google-site-verification' })
            .setAttribute('content', verification);
        }

        const gaId = String(settings.ga4_script || '').match(/G-[A-Z0-9]+/i)?.[0];
        removeElement('junchae-ga4');
        removeElement('junchae-ga4-init');
        if (gaId) {
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
      .catch((err) => console.error('SiteKit settings apply failed', err));

    return () => {
      cancelled = true;
    };
  }, [mode]);

  return null;
}
