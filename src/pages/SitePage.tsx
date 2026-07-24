import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, CheckCircle2, Clock, ExternalLink, FolderOpen, HelpCircle, Info, Tag } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import AIBridgeOverlay from '../components/AIBridgeOverlay';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import type { Site } from '../data/categories';
import { categoryPath } from '../lib/categorySlug';
import { getSiteSlug, sitePath, slugifySiteName } from '../lib/siteSlug';
import { calculateSiteStatusScore, getCheckStatusBadgeClass, getCheckStatusLabel, getSiteStatusMeta, normalizeCheckStatus } from '../lib/siteStatus';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { readRecentlyViewedSites, RecentlyViewedSite, saveRecentlyViewedSite } from '../lib/recentlyViewedSites';
import { RecentlyViewedSitesBlock, formatDateTime } from '../components/GrowthFeatureBlocks';

const siteName = '전체닷컴';

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

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

type FaqItem = {
  question: string;
  answer: string;
};

type CheckHistoryItem = {
  id?: number;
  created_at?: string | null;
  check_status?: string | null;
  http_status?: number | null;
  checked_url?: string | null;
  final_url?: string | null;
  candidate_new_url?: string | null;
  memo?: string | null;
};

const parseTextList = (value?: string | string[] | null) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === 'string' ? item : item?.title || item?.text || item?.feature || ''))
        .map(String)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  } catch {
    // Plain newline text is supported.
  }
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
};

const parseFaq = (value?: Site['seo_faq']): FaqItem[] => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : (() => {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  })();

  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      question: typeof item?.question === 'string' ? item.question.trim() : '',
      answer: typeof item?.answer === 'string' ? item.answer.trim() : '',
    }))
    .filter((item) => item.question && item.answer);
};

export default function SitePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSecure, mode } = useTheme();
  const { allSites, categories } = useData();
  const { flags } = useFeatureFlags();
  const [overlay, setOverlay] = useState<{ url: string; name: string } | null>(null);
  const [checkHistory, setCheckHistory] = useState<CheckHistoryItem[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedSite[]>([]);

  const siteParam = useMemo(() => safeDecode(location.pathname.replace(/^\/site\/?/, '')), [location.pathname]);
  const visibleAllSites = useMemo(
    () => allSites.filter((item) => !item.isHidden && !item.is_hidden),
    [allSites]
  );
  const siteMatch = useMemo(() => {
    const normalizedParam = siteParam.trim().toLowerCase();
    const bySlug = visibleAllSites.find((item) => String(item.seo_slug || '').toLowerCase() === normalizedParam);
    if (bySlug) return { site: bySlug, matchedBy: 'slug' as const };

    const byId = visibleAllSites.find((item) => String(item.id) === siteParam);
    if (byId) return { site: byId, matchedBy: 'id' as const };

    const byNameSlug = visibleAllSites.find((item) => slugifySiteName(item.name, item.id) === normalizedParam);
    if (byNameSlug) return { site: byNameSlug, matchedBy: 'nameSlug' as const };

    return { site: null, matchedBy: null };
  }, [siteParam, visibleAllSites]);

  const site = siteMatch.site;
  const category = useMemo(
    () => categories.find((item) => item.name === site?.categoryName || item.id === site?.categoryId),
    [categories, site?.categoryId, site?.categoryName]
  );
  const status = site ? getSiteStatusMeta(site.status, isSecure) : null;
  const introText =
    site?.seo_intro ||
    site?.seo_description ||
    site?.description ||
    (site ? `${site.name}은 ${site.categoryName || '사이트'} 카테고리에 등록된 사이트입니다. 전체닷컴에서 접속 상태와 관련 정보를 확인하고 이동할 수 있습니다.` : '');
  const features = useMemo(() => {
    const parsed = parseTextList(site?.seo_features);
    if (parsed.length > 0) return parsed.slice(0, 6);
    if (!site) return [];
    return [
      '접속 상태 확인 가능',
      '관련 카테고리 사이트와 함께 비교 가능',
      '전체닷컴에서 빠르게 이동 가능',
    ];
  }, [site]);
  const faqItems = useMemo(() => {
    const parsed = parseFaq(site?.seo_faq);
    if (parsed.length > 0) return parsed.slice(0, 5);
    if (!site) return [];
    return [
      {
        question: `${site.name} 바로가기는 어디에서 이용하나요?`,
        answer: '이 페이지의 바로가기 버튼을 통해 외부 사이트로 이동할 수 있습니다.',
      },
      {
        question: '접속 상태는 무엇을 의미하나요?',
        answer: '전체닷컴에서 관리자가 확인한 상태값이며 정상, 혼잡, 접속불가, 확인중으로 구분됩니다.',
      },
      {
        question: '관련 사이트는 어떤 기준으로 표시되나요?',
        answer: '같은 카테고리에 등록된 사이트를 기준으로 함께 확인할 수 있도록 표시합니다.',
      },
    ];
  }, [site]);
  const previewImage = site?.preview_image || '';
  const keywords = useMemo(
    () => (site?.seo_keywords || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 10),
    [site?.seo_keywords]
  );
  const relatedSites = useMemo(
    () => visibleAllSites
      .filter((item) => item.id !== site?.id && item.categoryName === site?.categoryName)
      .slice(0, 6),
    [site?.categoryName, site?.id, visibleAllSites]
  );
  const statusScore = site ? calculateSiteStatusScore(site) : 0;
  const timelineItems = useMemo<CheckHistoryItem[]>(() => {
    if (!site) return [];
    if (checkHistory.length > 0) return checkHistory.slice(0, 5);
    return [{
      created_at: site.last_checked_at || null,
      check_status: site.check_status || null,
      http_status: site.http_status ?? null,
      checked_url: site.url,
      final_url: site.final_url || null,
      candidate_new_url: site.candidate_new_url || null,
      memo: site.status_memo || '현재 사이트 상태 기준 기록입니다.',
    }];
  }, [checkHistory, site]);

  useEffect(() => {
    if (!site) return;

    const canonicalPath = sitePath(site);
    if (siteMatch.matchedBy === 'id' && getSiteSlug(site)) {
      navigate(canonicalPath, { replace: true });
    }

    const title = site.seo_title || `${site.name} 바로가기 | ${siteName}`;
    const description = site.seo_description || site.description || `${site.name} 사이트 정보와 접속 링크를 확인하세요.`;
    const canonical = `https://junchae.com${canonicalPath}`;

    document.title = title;
    getOrCreateMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', description);
    getOrCreateMeta('meta[name="keywords"]', { name: 'keywords' }).setAttribute('content', site.seo_keywords || site.name);
    getOrCreateMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', site.seo_og_title || title);
    getOrCreateMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', site.seo_og_description || description);
    getOrCreateMeta('meta[property="og:type"]', { property: 'og:type' }).setAttribute('content', 'website');
    getOrCreateMeta('meta[property="og:site_name"]', { property: 'og:site_name' }).setAttribute('content', siteName);
    getOrCreateMeta('meta[property="og:url"]', { property: 'og:url' }).setAttribute('content', canonical);
    if (site.seo_og_image || site.preview_image || site.logo) {
      getOrCreateMeta('meta[property="og:image"]', { property: 'og:image' }).setAttribute('content', site.seo_og_image || site.preview_image || site.logo);
    }
    getOrCreateCanonical().href = canonical;
  }, [navigate, site, siteMatch.matchedBy]);

  useEffect(() => {
    if (!site || !flags.show_site_check_timeline) return;
    fetch(`/api/sites/${site.id}/check-history?limit=5`)
      .then((res) => res.json())
      .then((body) => {
        if (body?.ok && Array.isArray(body.data)) setCheckHistory(body.data);
      })
      .catch((err) => console.error('Site check history load failed', err));
  }, [flags.show_site_check_timeline, site]);

  useEffect(() => {
    if (!site || !flags.show_recently_viewed_sites) return;
    if (site.isHidden || site.is_hidden) return;
    saveRecentlyViewedSite(site, mode);
    setRecentlyViewed(readRecentlyViewedSites(mode).filter((item) => item.site_id !== site.id));
  }, [flags.show_recently_viewed_sites, mode, site]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isSecure ? 'bg-obsidian-deep' : 'bg-metallic'}`}>
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-5 sm:py-7">
        <button
          onClick={() => navigate(-1)}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
            isSecure
              ? 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.07] border border-white/[0.06]'
              : 'bg-white/80 text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200'
          }`}
        >
          <ArrowLeft size={14} />
          뒤로가기
        </button>

        {site ? (
          <>
            <section className="mt-5 grid grid-cols-1 md:grid-cols-[160px_1fr] gap-5">
              <div className={`rounded-2xl border p-5 flex items-center justify-center ${
                isSecure ? 'glass-dark border-white/[0.08]' : 'glass-light border-slate-200/70'
              }`}>
                <div className="w-28 h-28 rounded-2xl bg-white/90 border border-slate-200 flex items-center justify-center overflow-hidden p-3">
                  {site.logo ? (
                    <img src={site.logo} alt={site.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-3xl font-black text-neon-orange">{site.name.charAt(0) || '?'}</span>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {category && (
                    <button
                      onClick={() => navigate(categoryPath(category))}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
                        isSecure ? 'border-white/[0.08] text-neon-orange bg-white/[0.04]' : 'border-slate-200 text-blue-700 bg-white/80'
                      }`}
                    >
                      <FolderOpen size={12} />
                      {category.name}
                    </button>
                  )}
                  {status && (
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${status.className}`}>
                      {status.label}
                    </span>
                  )}
                </div>

                <h1 className={`mt-3 text-2xl sm:text-4xl font-black tracking-tight ${isSecure ? 'text-white' : 'text-slate-950'}`}>
                  {site.seo_h1 || `${site.name} 바로가기`}
                </h1>
                <p className={`mt-3 text-sm leading-relaxed ${isSecure ? 'text-slate-400' : 'text-slate-600'}`}>
                  {site.seo_description || site.description || `${site.name} 사이트 정보와 접속 상태를 확인할 수 있는 안내 페이지입니다.`}
                </p>

                {keywords.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                          isSecure ? 'bg-white/[0.04] text-slate-300 border border-white/[0.06]' : 'bg-white/85 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <Tag size={11} />
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-5 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => setOverlay({ url: site.url, name: site.name })}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-neon-orange px-4 py-3 text-sm font-black text-white hover:bg-neon-orangeDark transition-colors"
                  >
                    <ExternalLink size={16} />
                    {site.name} 바로가기
                  </button>
                  {category && (
                    <button
                      onClick={() => navigate(categoryPath(category))}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${
                        isSecure ? 'border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.05]' : 'border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      카테고리로 이동
                    </button>
                  )}
                </div>
              </div>
            </section>

            {flags.show_site_status_score && (
              <section className={`mt-5 rounded-2xl border p-5 ${
                isSecure ? 'glass-dark border-white/[0.08]' : 'glass-light border-slate-200/70'
              }`}>
                <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border text-2xl font-black ${
                      statusScore >= 80
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : statusScore >= 50
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                          : 'border-red-500/30 bg-red-500/10 text-red-300'
                    }`}>
                      {statusScore}
                    </div>
                    <div>
                      <div className={`text-sm font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>상태 점수</div>
                      <div className={`text-xs ${isSecure ? 'text-slate-500' : 'text-slate-500'}`}>0~100점 기준</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <div className={`rounded-xl border p-3 ${isSecure ? 'border-white/[0.06] bg-white/[0.03]' : 'border-slate-200 bg-white/70'}`}>
                      <div className="text-[10px] font-bold text-slate-500">현재 상태</div>
                      <div className={`mt-1 text-sm font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>{getCheckStatusLabel(site.check_status || site.status)}</div>
                    </div>
                    <div className={`rounded-xl border p-3 ${isSecure ? 'border-white/[0.06] bg-white/[0.03]' : 'border-slate-200 bg-white/70'}`}>
                      <div className="text-[10px] font-bold text-slate-500">마지막 확인</div>
                      <div className={`mt-1 text-xs font-bold ${isSecure ? 'text-slate-300' : 'text-slate-700'}`}>{formatDateTime(site.last_checked_at)}</div>
                    </div>
                    <div className={`rounded-xl border p-3 ${isSecure ? 'border-white/[0.06] bg-white/[0.03]' : 'border-slate-200 bg-white/70'}`}>
                      <div className="text-[10px] font-bold text-slate-500">HTTP</div>
                      <div className={`mt-1 text-sm font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>{site.http_status || '-'}</div>
                    </div>
                    <div className={`rounded-xl border p-3 ${isSecure ? 'border-white/[0.06] bg-white/[0.03]' : 'border-slate-200 bg-white/70'}`}>
                      <div className="text-[10px] font-bold text-slate-500">최종 URL</div>
                      <div className={`mt-1 truncate text-xs font-mono ${isSecure ? 'text-slate-300' : 'text-slate-700'}`}>{site.final_url || '-'}</div>
                    </div>
                  </div>
                </div>
                {site.candidate_new_url && (
                  <div className="mt-3 inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-bold text-sky-300">
                    주소 변경 후보 감지
                  </div>
                )}
              </section>
            )}

            <section className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5">
              <div className="space-y-5">
                <div className={`rounded-2xl border p-5 ${
                  isSecure ? 'glass-dark border-white/[0.08]' : 'glass-light border-slate-200/70'
                }`}>
                  <h2 className={`text-lg font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>
                    {site.name} 소개
                  </h2>
                  <div className={`mt-3 space-y-3 text-sm leading-relaxed ${isSecure ? 'text-slate-400' : 'text-slate-600'}`}>
                    {introText.split(/\n{2,}|\r?\n/).filter(Boolean).map((paragraph, index) => (
                      <p key={`${paragraph}-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                </div>

                {previewImage && (
                  <div className={`rounded-2xl border p-3 ${
                    isSecure ? 'glass-dark border-white/[0.08]' : 'glass-light border-slate-200/70'
                  }`}>
                    <h2 className={`px-2 pt-2 text-lg font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>
                      사이트 미리보기
                    </h2>
                    <div className="mt-3 overflow-hidden rounded-xl bg-white border border-slate-200">
                      <img
                        src={previewImage}
                        alt={`${site.name} 메인 화면 미리보기`}
                        className="w-full max-h-[420px] object-cover object-top"
                      />
                    </div>
                  </div>
                )}

                <div className={`rounded-2xl border p-5 ${
                  isSecure ? 'glass-dark border-white/[0.08]' : 'glass-light border-slate-200/70'
                }`}>
                  <h2 className={`text-lg font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>
                    주요 특징
                  </h2>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {features.map((feature) => (
                      <div
                        key={feature}
                        className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
                          isSecure ? 'border-white/[0.06] bg-white/[0.03] text-slate-300' : 'border-slate-200 bg-white/70 text-slate-700'
                        }`}
                      >
                        <CheckCircle2 size={15} className={isSecure ? 'text-neon-orange mt-0.5' : 'text-blue-600 mt-0.5'} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`rounded-2xl border p-5 ${
                  isSecure ? 'glass-dark border-white/[0.08]' : 'glass-light border-slate-200/70'
                }`}>
                  <div className="flex items-center gap-2">
                    <Info size={16} className={isSecure ? 'text-neon-orange' : 'text-blue-600'} />
                    <h2 className={`text-lg font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>
                      이용 안내
                    </h2>
                  </div>
                  <p className={`mt-3 text-sm leading-relaxed ${isSecure ? 'text-slate-400' : 'text-slate-600'}`}>
                    아래 바로가기 버튼을 누르면 외부 사이트로 이동합니다. 외부 사이트의 정책과 콘텐츠는 해당 사이트 기준으로 제공되며,
                    전체닷컴은 링크 상태와 분류 정보를 확인하기 쉽게 정리합니다.
                  </p>
                </div>

                {faqItems.length > 0 && (
                  <div className={`rounded-2xl border p-5 ${
                    isSecure ? 'glass-dark border-white/[0.08]' : 'glass-light border-slate-200/70'
                  }`}>
                    <div className="flex items-center gap-2">
                      <HelpCircle size={16} className={isSecure ? 'text-neon-orange' : 'text-blue-600'} />
                      <h2 className={`text-lg font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>
                        자주 묻는 질문
                      </h2>
                    </div>
                    <div className="mt-3 space-y-2">
                      {faqItems.map((item, index) => (
                        <div
                          key={`${item.question}-${index}`}
                          className={`rounded-xl border p-4 ${
                            isSecure ? 'border-white/[0.06] bg-white/[0.03]' : 'border-slate-200 bg-white/70'
                          }`}
                        >
                          <h3 className={`text-sm font-bold ${isSecure ? 'text-slate-100' : 'text-slate-900'}`}>
                            {item.question}
                          </h3>
                          <p className={`mt-2 text-sm leading-relaxed ${isSecure ? 'text-slate-400' : 'text-slate-600'}`}>
                            {item.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {flags.show_site_check_timeline && (
                  <div className={`rounded-2xl border p-5 ${
                    isSecure ? 'glass-dark border-white/[0.08]' : 'glass-light border-slate-200/70'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Activity size={16} className={isSecure ? 'text-neon-orange' : 'text-blue-600'} />
                      <h2 className={`text-lg font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>
                        점검/주소 변경 타임라인
                      </h2>
                    </div>
                    <div className="mt-4 space-y-3">
                      {timelineItems.map((item, index) => {
                        const checkStatus = normalizeCheckStatus(item.check_status || site.check_status || site.status);
                        return (
                          <div key={item.id || index} className={`rounded-xl border p-4 ${isSecure ? 'border-white/[0.06] bg-white/[0.03]' : 'border-slate-200 bg-white/70'}`}>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${getCheckStatusBadgeClass(checkStatus, isSecure)}`}>
                                {getCheckStatusLabel(checkStatus)}
                              </span>
                              <span className={`inline-flex items-center gap-1 text-xs ${isSecure ? 'text-slate-500' : 'text-slate-500'}`}>
                                <Clock size={12} /> {formatDateTime(item.created_at)}
                              </span>
                              <span className={`text-xs font-mono ${isSecure ? 'text-slate-500' : 'text-slate-500'}`}>HTTP {item.http_status || '-'}</span>
                            </div>
                            <div className={`mt-2 space-y-1 text-xs ${isSecure ? 'text-slate-400' : 'text-slate-600'}`}>
                              <div className="truncate"><span className="font-bold">Checked:</span> {item.checked_url || '-'}</div>
                              <div className="truncate"><span className="font-bold">Final:</span> {item.final_url || '-'}</div>
                              {item.candidate_new_url && <div className="truncate text-sky-300"><span className="font-bold">Candidate:</span> {item.candidate_new_url}</div>}
                              {item.memo && <p className="pt-1 leading-5">{item.memo}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <aside className="space-y-4">
                <div className={`rounded-2xl border p-5 ${
                  isSecure ? 'glass-dark border-white/[0.08]' : 'glass-light border-slate-200/70'
                }`}>
                  <h2 className={`text-sm font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>
                    관련 키워드
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(keywords.length ? keywords : [site.name, site.categoryName || '사이트 정보', '바로가기']).map((keyword) => (
                      <span
                        key={keyword}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                          isSecure ? 'bg-white/[0.04] text-slate-300 border border-white/[0.06]' : 'bg-white/85 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <Tag size={11} />
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </aside>
            </section>

            {relatedSites.length > 0 && (
              <section className="mt-8">
                <h2 className={`text-base font-black tracking-tight ${isSecure ? 'text-white' : 'text-slate-900'}`}>
                  관련 사이트
                </h2>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {relatedSites.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(sitePath(item))}
                      className={`min-h-[72px] rounded-xl border p-3 text-left transition-all hover:scale-[1.01] ${
                        isSecure ? 'glass-dark border-white/[0.08] hover:border-neon-orange/30' : 'glass-light border-slate-200/70 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-9 h-9 rounded-lg bg-white/90 border border-slate-200 flex items-center justify-center overflow-hidden p-1 flex-shrink-0">
                          {item.logo ? (
                            <img src={item.logo} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-xs font-bold text-neon-orange">{item.name.charAt(0) || '?'}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`font-black truncate ${isSecure ? 'text-white' : 'text-slate-900'}`}>{item.name}</div>
                          <div className={`mt-1 inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${getSiteStatusMeta(item.status, isSecure).className}`}>
                            {getSiteStatusMeta(item.status, isSecure).label}
                          </div>
                          <div className={`mt-1 text-xs line-clamp-2 ${isSecure ? 'text-slate-500' : 'text-slate-500'}`}>
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {flags.show_recently_viewed_sites && (
              <div className="mt-8">
                <RecentlyViewedSitesBlock items={recentlyViewed} isSecure={isSecure} limit={flags.recently_viewed_limit} />
              </div>
            )}
          </>
        ) : (
          <section className={`mt-8 rounded-2xl border p-8 text-center ${
            isSecure ? 'glass-dark border-white/[0.08]' : 'glass-light border-slate-200'
          }`}>
            <h1 className={`text-xl font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>사이트를 찾을 수 없습니다</h1>
            <p className={`mt-2 text-sm ${isSecure ? 'text-slate-500' : 'text-slate-500'}`}>
              현재 모드에서 노출 가능한 사이트가 아니거나 삭제된 URL입니다.
            </p>
          </section>
        )}
      </main>

      {overlay && (
        <AIBridgeOverlay
          targetUrl={overlay.url}
          siteName={overlay.name}
          onClose={() => setOverlay(null)}
        />
      )}
    </div>
  );
}
