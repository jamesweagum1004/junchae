import { useEffect, useState } from 'react';
import { FileCode2, RefreshCw, Save } from 'lucide-react';
import { apiJson } from '../../lib/adminApi';

type SeoFileSettings = {
  robots_txt: string;
  sitemap_base_url: string;
  sitemap_include_normal: boolean;
  sitemap_include_secure: boolean;
  sitemap_include_categories: boolean;
  sitemap_include_sites: boolean;
  sitemap_custom_urls: string[];
  sitemap_last_generated_at: string;
};

type SeoFilesPayload = {
  settings: SeoFileSettings;
  robots_preview: string;
  sitemap_preview: string;
  sitemap_url_count: number;
  sitemap_counts?: Record<string, number>;
  robots_exists: boolean;
  sitemap_exists: boolean;
};

const defaultSettings: SeoFileSettings = {
  robots_txt: 'User-agent: *\nAllow: /\n\nSitemap: https://junchae.com/sitemap.xml\n',
  sitemap_base_url: 'https://junchae.com',
  sitemap_include_normal: true,
  sitemap_include_secure: false,
  sitemap_include_categories: true,
  sitemap_include_sites: true,
  sitemap_custom_urls: [],
  sitemap_last_generated_at: '',
};

function splitCustomUrls(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function SeoFilesManager() {
  const [settings, setSettings] = useState<SeoFileSettings>(defaultSettings);
  const [customUrls, setCustomUrls] = useState('');
  const [sitemapPreview, setSitemapPreview] = useState('');
  const [urlCount, setUrlCount] = useState(0);
  const [sitemapCounts, setSitemapCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError('');
    const payload = await apiJson<SeoFilesPayload>('/api/admin/seo-files');
    setSettings({ ...defaultSettings, ...payload.settings });
    setCustomUrls((payload.settings.sitemap_custom_urls || []).join('\n'));
    setSitemapPreview(payload.sitemap_preview || '');
    setUrlCount(payload.sitemap_url_count || 0);
    setSitemapCounts(payload.sitemap_counts || {});
  };

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'SEO 파일 설정을 불러오지 못했습니다.'));
  }, []);

  const update = <K extends keyof SeoFileSettings>(key: K, value: SeoFileSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const saveRobots = async () => {
    setSaving(true);
    setStatus('');
    setError('');
    try {
      const payload = await apiJson<{ preview_url: string; cache_notice: string }>('/api/admin/seo-files/robots', {
        method: 'POST',
        body: JSON.stringify({ robots_txt: settings.robots_txt }),
      });
      setStatus(`robots.txt 저장 완료. ${payload.cache_notice} 미리보기: ${payload.preview_url}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'robots.txt 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const generateSitemap = async () => {
    setSaving(true);
    setStatus('');
    setError('');
    try {
      const payload = await apiJson<{
        settings: SeoFileSettings;
        sitemap_xml: string;
        sitemap_url_count: number;
        sitemap_counts?: Record<string, number>;
        preview_url: string;
        cache_notice: string;
      }>('/api/admin/seo-files/sitemap/generate', {
        method: 'POST',
        body: JSON.stringify({
          ...settings,
          sitemap_custom_urls: splitCustomUrls(customUrls),
        }),
      });
      setSettings({ ...defaultSettings, ...payload.settings });
      setCustomUrls((payload.settings.sitemap_custom_urls || []).join('\n'));
      setSitemapPreview(payload.sitemap_xml);
      setUrlCount(payload.sitemap_url_count);
      setSitemapCounts(payload.sitemap_counts || {});
      setStatus(`sitemap.xml 생성 완료. ${payload.cache_notice} 미리보기: ${payload.preview_url}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'sitemap.xml 생성에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {(status || error) && (
        <div className={`rounded-xl border px-4 py-3 text-xs font-medium ${error ? 'bg-red-500/10 text-red-300 border-red-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'}`}>
          {error || status}
        </div>
      )}

      <div className="rounded-xl border border-obsidian-500 bg-obsidian-600 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FileCode2 size={15} className="text-neon-orange" />
            robots.txt
          </h2>
          <a href="https://junchae.com/robots.txt" target="_blank" rel="noreferrer" className="text-xs text-neon-orange hover:text-neon-orangeDark">
            공개 URL
          </a>
        </div>
        <textarea
          value={settings.robots_txt}
          onChange={(e) => update('robots_txt', e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-obsidian-500 bg-obsidian-700 px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-neon-orange"
        />
        <button
          type="button"
          onClick={() => void saveRobots()}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-neon-orange px-3 py-2 text-xs font-bold text-white hover:bg-neon-orangeDark disabled:opacity-50"
        >
          <Save size={13} />
          robots.txt 저장
        </button>
      </div>

      <div className="rounded-xl border border-obsidian-500 bg-obsidian-600 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FileCode2 size={15} className="text-neon-orange" />
            sitemap.xml
          </h2>
          <a href="https://junchae.com/sitemap.xml" target="_blank" rel="noreferrer" className="text-xs text-neon-orange hover:text-neon-orangeDark">
            공개 URL
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-400">Base URL</span>
            <input
              value={settings.sitemap_base_url}
              onChange={(e) => update('sitemap_base_url', e.target.value)}
              className="w-full rounded-lg border border-obsidian-500 bg-obsidian-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-neon-orange"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['sitemap_include_normal', 'normal 포함'],
              ['sitemap_include_secure', 'secure 포함'],
              ['sitemap_include_categories', '카테고리 포함'],
              ['sitemap_include_sites', '사이트 상세 포함'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-lg border border-obsidian-500 bg-obsidian-700 px-3 py-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(settings[key as keyof SeoFileSettings])}
                  onChange={(e) => update(key as keyof SeoFileSettings, e.target.checked as never)}
                  className="accent-neon-orange"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">/site/{'{seo_slug}'} pSEO 페이지를 sitemap에 포함합니다. hidden 사이트와 seo_slug가 없는 사이트는 제외됩니다.</p>

        <label className="space-y-1 block">
          <span className="text-xs font-semibold text-slate-400">Custom URLs</span>
          <textarea
            value={customUrls}
            onChange={(e) => setCustomUrls(e.target.value)}
            rows={4}
            placeholder="https://junchae.com/custom-page"
            className="w-full rounded-lg border border-obsidian-500 bg-obsidian-700 px-3 py-2 font-mono text-xs text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void generateSitemap()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neon-orange px-3 py-2 text-xs font-bold text-white hover:bg-neon-orangeDark disabled:opacity-50"
          >
            <RefreshCw size={13} />
            sitemap 생성/저장
          </button>
          <span className="text-xs text-slate-500">
            URL {urlCount}개 · home {sitemapCounts.home || 0} · category {sitemapCounts.categories || 0} · site {sitemapCounts.sites || 0} · updates {sitemapCounts.updates || 0} · tools {sitemapCounts.tools || 0} · 마지막 생성 {settings.sitemap_last_generated_at || '기록 없음'}
          </span>
        </div>

        <textarea
          value={sitemapPreview}
          readOnly
          rows={14}
          className="w-full rounded-lg border border-obsidian-500 bg-obsidian-700 px-3 py-2 font-mono text-xs text-slate-300 focus:outline-none"
        />
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-300">
        관리자 URL은 robots.txt/sitemap에 넣지 않는 것을 권장합니다. secure mode는 검색 노출 리스크가 있으므로 기본 제외됩니다.
        Cloudflare 캐시 사용 중이면 저장 후 Purge Everything 또는 해당 URL purge가 필요할 수 있습니다.
      </div>
    </div>
  );
}
