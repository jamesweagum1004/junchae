import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, ExternalLink, Link2, RefreshCw, ShieldAlert } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { apiJson } from '../../lib/adminApi';

type LinkMode = 'secure' | 'normal';
type DisplayFilter = 'problem' | 'normal' | 'all' | 'dismissed_include' | 'dismissed_only';

type SummaryRow = {
  check_status: string | null;
  count: number;
};

type LinkCheckRow = {
  id: number;
  mode: LinkMode;
  name: string;
  url: string;
  category: string;
  category_slug?: string;
  check_status?: string | null;
  http_status?: number | null;
  final_url?: string | null;
  candidate_new_url?: string | null;
  down_count?: number;
  last_checked_at?: string | null;
  status_memo?: string | null;
  link_check_dismissed?: boolean | number;
  link_check_dismissed_at?: string | null;
  link_check_dismissed_reason?: string | null;
};

type LinkCheckReport = {
  rows: LinkCheckRow[];
  summary: SummaryRow[];
  category_slug?: string;
  dismissed?: 'exclude' | 'include' | 'only';
  last_checked_at: string | null;
};

type BulkSummary = {
  total: number;
  checked: number;
  normal: number;
  redirected: number;
  restricted: number;
  challenge: number;
  down: number;
  timeout: number;
  server_error: number;
  unknown: number;
};

type BulkCheckResult = {
  mode: LinkMode;
  category_slug: string;
  summary: BulkSummary;
  results: LinkCheckRow[];
};

const emptyReport: LinkCheckReport = {
  rows: [],
  summary: [],
  last_checked_at: null,
};

const statusLabels: Record<string, string> = {
  normal: '정상',
  redirected: '리다이렉트',
  restricted: '차단/제한',
  challenge: 'Challenge',
  down: '다운',
  timeout: '타임아웃',
  server_error: '서버 오류',
  unknown: '확인 필요',
  unchecked: '미점검',
};

const statusClasses: Record<string, string> = {
  normal: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  redirected: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  restricted: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  challenge: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
  down: 'border-red-500/30 bg-red-500/10 text-red-300',
  timeout: 'border-red-500/30 bg-red-500/10 text-red-300',
  server_error: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  unknown: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  unchecked: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
};

function countFor(summary: SummaryRow[], status: string) {
  return summary
    .filter((row) => String(row.check_status || 'unchecked') === status)
    .reduce((sum, row) => sum + Number(row.count || 0), 0);
}

function summaryFromReport(report: LinkCheckReport): BulkSummary {
  const summary = report.summary || [];
  return {
    total: summary.reduce((sum, row) => sum + Number(row.count || 0), 0),
    checked: summary.reduce((sum, row) => sum + (String(row.check_status || 'unchecked') === 'unchecked' ? 0 : Number(row.count || 0)), 0),
    normal: countFor(summary, 'normal'),
    redirected: countFor(summary, 'redirected'),
    restricted: countFor(summary, 'restricted'),
    challenge: countFor(summary, 'challenge'),
    down: countFor(summary, 'down'),
    timeout: countFor(summary, 'timeout'),
    server_error: countFor(summary, 'server_error'),
    unknown: countFor(summary, 'unknown'),
  };
}

function formatDate(value?: string | null) {
  if (!value) return '기록 없음';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : value;
}

function isDismissed(row: LinkCheckRow) {
  return row.link_check_dismissed === true || row.link_check_dismissed === 1;
}

function isManualBrowserCheckStatus(status?: string | null) {
  return status === 'challenge' || status === 'restricted';
}

function canMarkSiteDown(status?: string | null) {
  return status === 'down' || status === 'timeout' || status === 'restricted';
}

function shortenUrl(url: string, maxLength = 42) {
  if (url.length <= maxLength) return url;
  return `${url.slice(0, Math.max(12, maxLength - 12))}...${url.slice(-8)}`;
}

function StatusBadge({ status }: { status?: string | null }) {
  const key = status || 'unchecked';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusClasses[key] || statusClasses.unknown}`}>
      {statusLabels[key] || key}
    </span>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Activity }) {
  return (
    <div className="rounded-xl border border-obsidian-500 bg-obsidian-600 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Icon size={14} className="text-neon-orange" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-white">{value.toLocaleString()}</div>
    </div>
  );
}

function UrlCell({
  url,
  label,
  copiedKey,
  copiedUrlKey,
  onCopy,
  highlight = false,
}: {
  url?: string | null;
  label: string;
  copiedKey: string;
  copiedUrlKey: string;
  onCopy: (key: string, url: string) => void;
  highlight?: boolean;
}) {
  if (!url) return <span className="text-slate-600">-</span>;

  return (
    <div className={`max-w-[240px] rounded-lg border p-2 ${highlight ? 'border-amber-500/30 bg-amber-500/10' : 'border-obsidian-500 bg-obsidian-700/40'}`}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        title={url}
        className={`block truncate font-mono text-[11px] hover:underline ${highlight ? 'text-amber-300' : 'text-sky-300'}`}
      >
        {shortenUrl(url)}
      </a>
      <div className="mt-1 flex flex-wrap gap-1">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          title={`${label} 열기`}
          className="rounded border border-obsidian-500 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 hover:bg-obsidian-600 hover:text-white"
        >
          열기
        </a>
        <button
          type="button"
          onClick={() => onCopy(copiedKey, url)}
          className="rounded border border-obsidian-500 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 hover:bg-obsidian-600 hover:text-white"
        >
          {copiedUrlKey === copiedKey ? '복사됨' : '복사'}
        </button>
      </div>
    </div>
  );
}

type LinkCheckManagerProps = {
  onEditSite?: (siteId: number) => void;
};

export default function LinkCheckManager({ onEditSite }: LinkCheckManagerProps) {
  const { getModeData, updateSiteStatusInMode } = useData();
  const [mode, setMode] = useState<LinkMode>('secure');
  const [categorySlug, setCategorySlug] = useState('');
  const [displayFilter, setDisplayFilter] = useState<DisplayFilter>('problem');
  const [report, setReport] = useState<LinkCheckReport>(emptyReport);
  const [lastRunSummary, setLastRunSummary] = useState<BulkSummary | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [copiedUrlKey, setCopiedUrlKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const categories = getModeData(mode === 'secure' ? 'secure' : 'standard').categories;
  const activeSummary = lastRunSummary || summaryFromReport(report);

  const reportUrl = (nextMode = mode, nextCategorySlug = categorySlug, nextDisplayFilter = displayFilter) => {
    const params = new URLSearchParams({ mode: nextMode, limit: '300' });
    if (nextCategorySlug) params.set('category_slug', nextCategorySlug);
    if (nextDisplayFilter === 'problem') {
      params.set('status', 'problem');
      params.set('dismissed', 'exclude');
    } else if (nextDisplayFilter === 'normal') {
      params.set('status', 'normal');
      params.set('dismissed', 'exclude');
    } else if (nextDisplayFilter === 'dismissed_include') {
      params.set('dismissed', 'include');
    } else if (nextDisplayFilter === 'dismissed_only') {
      params.set('dismissed', 'only');
    } else {
      params.set('dismissed', 'exclude');
    }
    return `/api/admin/sites/link-check-report?${params.toString()}`;
  };

  const loadReport = async (nextMode = mode, nextCategorySlug = categorySlug, nextDisplayFilter = displayFilter) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiJson<LinkCheckReport>(reportUrl(nextMode, nextCategorySlug, nextDisplayFilter));
      setReport({ ...emptyReport, ...data });
      setSelectedIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '링크 점검 리포트를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCategorySlug('');
    setLastRunSummary(null);
  }, [mode]);

  useEffect(() => {
    void loadReport(mode, categorySlug, displayFilter);
  }, [mode, categorySlug, displayFilter]);

  const copyUrl = async (key: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrlKey(key);
      window.setTimeout(() => setCopiedUrlKey((current) => (current === key ? '' : current)), 1400);
    } catch (err) {
      console.error('URL copy failed', err);
      setError('URL 복사에 실패했습니다.');
    }
  };

  const runCheck = async (targetMode: LinkMode, targetCategorySlug = '') => {
    setRunning(targetCategorySlug ? '선택 카테고리 점검' : `${targetMode.toUpperCase()} 전체 점검`);
    setNotice('');
    setError('');
    try {
      const data = await apiJson<BulkCheckResult>('/api/admin/sites/check-links', {
        method: 'POST',
        body: JSON.stringify({
          mode: targetMode,
          category_slug: targetCategorySlug,
          only_visible: false,
          limit: 100,
        }),
      });
      setLastRunSummary(data.summary);
      setNotice(`점검 완료: ${data.summary.checked || 0}개 확인`);
      await loadReport(targetMode, targetCategorySlug, displayFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : '링크 점검에 실패했습니다.');
    } finally {
      setRunning('');
    }
  };

  const recheckSite = async (siteId: number) => {
    setRunning(`site-${siteId}`);
    setNotice('');
    setError('');
    try {
      await apiJson<LinkCheckRow>(`/api/admin/sites/${siteId}/check-link`, { method: 'POST' });
      await loadReport(mode, categorySlug, displayFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : '사이트 재점검에 실패했습니다.');
    } finally {
      setRunning('');
    }
  };

  const recheckCurrentProblems = async () => {
    const problemRows = report.rows.filter((row) => row.check_status !== 'normal');
    if (problemRows.length === 0) {
      setNotice('현재 필터에서 재점검할 문제 링크가 없습니다.');
      return;
    }
    setRunning('현재 필터 문제 링크 재점검');
    setNotice('');
    setError('');
    try {
      for (const row of problemRows) {
        await apiJson<LinkCheckRow>(`/api/admin/sites/${row.id}/check-link`, { method: 'POST' });
      }
      setNotice(`현재 필터 문제 링크 ${problemRows.length}개를 재점검했습니다.`);
      await loadReport(mode, categorySlug, displayFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : '문제 링크 재점검 중 오류가 발생했습니다.');
    } finally {
      setRunning('');
    }
  };

  const applyCandidate = async (row: LinkCheckRow) => {
    if (!row.candidate_new_url) return;
    if (!window.confirm('현재 URL을 candidate_new_url로 변경하시겠습니까?')) return;
    setRunning(`apply-${row.id}`);
    setNotice('');
    setError('');
    try {
      await apiJson<LinkCheckRow>(`/api/admin/sites/${row.id}/url`, {
        method: 'PATCH',
        body: JSON.stringify({
          url: row.candidate_new_url,
          reason: 'redirect candidate approved',
        }),
      });
      setNotice('새 URL 후보를 사이트 URL로 반영했습니다.');
      await loadReport(mode, categorySlug, displayFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : '새 URL 후보 반영에 실패했습니다.');
    } finally {
      setRunning('');
    }
  };

  const removeRowsFromCurrentReport = (ids: number[]) => {
    const idSet = new Set(ids);
    setReport((current) => ({ ...current, rows: current.rows.filter((row) => !idSet.has(row.id)) }));
    setSelectedIds((current) => current.filter((id) => !idSet.has(id)));
  };

  const dismissSite = async (siteId: number) => {
    setRunning(`dismiss-${siteId}`);
    setNotice('');
    setError('');
    try {
      await apiJson<{ site_id: number; link_check_dismissed: number }>(`/api/admin/sites/${siteId}/link-check-dismiss`, {
        method: 'PATCH',
        body: JSON.stringify({
          dismissed: true,
          reason: 'manual reviewed',
        }),
      });
      removeRowsFromCurrentReport([siteId]);
      setNotice('확인완료 처리했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '확인완료 처리에 실패했습니다.');
    } finally {
      setRunning('');
    }
  };

  const dismissSelected = async () => {
    if (selectedIds.length === 0) {
      setNotice('확인완료 처리할 항목을 선택해 주세요.');
      return;
    }
    setRunning('selected-dismiss');
    setNotice('');
    setError('');
    try {
      const data = await apiJson<{ updated_count: number }>('/api/admin/sites/link-check-dismiss', {
        method: 'POST',
        body: JSON.stringify({
          site_ids: selectedIds,
          dismissed: true,
          reason: 'bulk reviewed',
        }),
      });
      removeRowsFromCurrentReport(selectedIds);
      setNotice(`선택 항목 ${data.updated_count || selectedIds.length}개를 확인완료 처리했습니다.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '선택 항목 확인완료 처리에 실패했습니다.');
    } finally {
      setRunning('');
    }
  };

  const markSiteDown = async (row: LinkCheckRow) => {
    setRunning(`down-${row.id}`);
    setNotice('');
    setError('');
    try {
      await updateSiteStatusInMode(row.mode === 'secure' ? 'secure' : 'standard', row.id, 'down');
      setNotice('사이트 상태를 접속불가로 저장했고 해당 카테고리 맨 아래로 이동했습니다.');
      await loadReport(mode, categorySlug, displayFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : '사이트 상태를 접속불가로 변경하지 못했습니다.');
    } finally {
      setRunning('');
    }
  };

  const openSitesTab = (siteId: number) => {
    if (onEditSite) {
      onEditSite(siteId);
      return;
    }
    window.dispatchEvent(new CustomEvent('junchae-admin-tab', { detail: { tab: 'sites', siteId } }));
  };

  const selectedCategoryName = useMemo(
    () => categories.find((category) => category.slug === categorySlug)?.name || '',
    [categories, categorySlug]
  );
  const rowIds = report.rows.map((row) => row.id);
  const allRowsSelected = rowIds.length > 0 && rowIds.every((id) => selectedIds.includes(id));
  const toggleRowSelection = (siteId: number) => {
    setSelectedIds((current) => current.includes(siteId) ? current.filter((id) => id !== siteId) : [...current, siteId]);
  };
  const toggleAllRows = () => {
    setSelectedIds(allRowsSelected ? [] : rowIds);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-obsidian-500 bg-obsidian-600 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-black text-white">링크 상태 점검</h2>
            <p className="mt-1 text-xs text-slate-500">
              원하는 모드와 카테고리를 선택해 서버에서 링크 상태를 확인합니다. Challenge/제한 항목은 서버가 우회하지 않고 브라우저 직접 확인 링크만 제공합니다.
            </p>
          </div>
          {running && <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">{running} 진행 중...</span>}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs font-bold text-slate-400">모드</span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as LinkMode)}
              className="w-full rounded-lg border border-obsidian-500 bg-obsidian-700 px-3 py-2 text-sm text-white"
            >
              <option value="secure">secure</option>
              <option value="normal">normal</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold text-slate-400">카테고리</span>
            <select
              value={categorySlug}
              onChange={(event) => {
                setCategorySlug(event.target.value);
                setLastRunSummary(null);
              }}
              className="w-full rounded-lg border border-obsidian-500 bg-obsidian-700 px-3 py-2 text-sm text-white"
            >
              <option value="">전체 카테고리</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug || ''}>
                  {category.name} ({category.slug || category.id})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold text-slate-400">표시 옵션</span>
            <select
              value={displayFilter}
              onChange={(event) => {
                setDisplayFilter(event.target.value as DisplayFilter);
                setLastRunSummary(null);
              }}
              className="w-full rounded-lg border border-obsidian-500 bg-obsidian-700 px-3 py-2 text-sm text-white"
            >
              <option value="problem">문제 링크만</option>
              <option value="normal">정상만</option>
              <option value="all">전체</option>
              <option value="dismissed_include">확인완료 포함</option>
              <option value="dismissed_only">확인완료만</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => void runCheck(mode, categorySlug)}
            disabled={Boolean(running) || !categorySlug}
            className="inline-flex items-center gap-2 rounded-lg bg-neon-orange px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            <CheckCircle2 size={14} /> 선택 카테고리 링크 확인
          </button>
          <button
            onClick={() => void recheckCurrentProblems()}
            disabled={Boolean(running)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
          >
            <RefreshCw size={14} /> 현재 필터 문제 링크 재점검
          </button>
          <button
            onClick={() => void dismissSelected()}
            disabled={Boolean(running) || selectedIds.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
          >
            <CheckCircle2 size={14} /> 선택 항목 확인완료
          </button>
          <button
            onClick={() => void runCheck('secure', '')}
            disabled={Boolean(running)}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
          >
            <ShieldAlert size={14} /> SEC 전체 점검
          </button>
          <button
            onClick={() => void runCheck('normal', '')}
            disabled={Boolean(running)}
            className="inline-flex items-center gap-2 rounded-lg border border-obsidian-500 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-obsidian-700 disabled:opacity-50"
          >
            <Link2 size={14} /> NORMAL 전체 점검
          </button>
        </div>
        <p className="mt-2 text-[11px] text-amber-300">주의: SEC 전체 점검은 전체 secure 링크를 순차 점검합니다. 필요한 경우 카테고리별 점검을 우선 사용하세요.</p>
      </div>

      {notice && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">{notice}</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={Activity} label="total" value={activeSummary.total} />
        <StatCard icon={Activity} label="checked" value={activeSummary.checked} />
        <StatCard icon={CheckCircle2} label="normal" value={activeSummary.normal} />
        <StatCard icon={ExternalLink} label="redirected" value={activeSummary.redirected} />
        <StatCard icon={ShieldAlert} label="restricted" value={activeSummary.restricted} />
        <StatCard icon={ShieldAlert} label="challenge" value={activeSummary.challenge} />
        <StatCard icon={AlertTriangle} label="down" value={activeSummary.down} />
        <StatCard icon={AlertTriangle} label="timeout" value={activeSummary.timeout} />
        <StatCard icon={AlertTriangle} label="server_error" value={activeSummary.server_error} />
        <StatCard icon={AlertTriangle} label="unknown" value={activeSummary.unknown} />
      </div>

      <div className="rounded-xl border border-obsidian-500 bg-obsidian-600 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-bold text-white">
            링크 점검 목록 {selectedCategoryName ? `- ${selectedCategoryName}` : ''}
          </h3>
          <span className="text-[11px] text-slate-500">마지막 점검: {formatDate(report.last_checked_at)}</span>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-slate-400">리포트 로딩 중...</div>
        ) : report.rows.length === 0 ? (
          <div className="mt-4 rounded-lg border border-obsidian-500 bg-obsidian-700 p-4 text-sm text-slate-400">
            현재 필터에서 표시할 링크가 없습니다.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[1560px] w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr className="border-b border-obsidian-500">
                  <th className="py-2 pr-3">
                    <input
                      type="checkbox"
                      checked={allRowsSelected}
                      onChange={toggleAllRows}
                      aria-label="전체 선택"
                      className="h-4 w-4 rounded border-obsidian-500 bg-obsidian-700"
                    />
                  </th>
                  <th className="py-2 pr-3">사이트명</th>
                  <th className="py-2 pr-3">카테고리</th>
                  <th className="py-2 pr-3">현재 URL</th>
                  <th className="py-2 pr-3">check_status</th>
                  <th className="py-2 pr-3">http_status</th>
                  <th className="py-2 pr-3">final_url</th>
                  <th className="py-2 pr-3">candidate_new_url</th>
                  <th className="py-2 pr-3">down_count</th>
                  <th className="py-2 pr-3">last_checked_at</th>
                  <th className="py-2 pr-3">확인완료</th>
                  <th className="py-2 pr-3">확인완료 시각</th>
                  <th className="py-2 pr-3">dismissed_reason</th>
                  <th className="py-2 pr-3">status_memo</th>
                  <th className="py-2 pr-3">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-500">
                {report.rows.map((row) => {
                  const browserCheckUrl = row.final_url || row.url;
                  return (
                    <tr key={row.id} className={`align-top text-slate-300 ${row.candidate_new_url ? 'bg-amber-500/[0.04]' : ''}`}>
                      <td className="py-3 pr-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => toggleRowSelection(row.id)}
                          aria-label={`${row.name} 선택`}
                          className="h-4 w-4 rounded border-obsidian-500 bg-obsidian-700"
                        />
                      </td>
                      <td className="py-3 pr-3 font-bold text-white">
                        <div>{row.name}</div>
                        {row.candidate_new_url && (
                          <span className="mt-1 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            새 URL 후보 있음
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-3">{row.category || '-'}</td>
                      <td className="py-3 pr-3">
                        <UrlCell url={row.url} label="현재 URL" copiedKey={`${row.id}-url`} copiedUrlKey={copiedUrlKey} onCopy={copyUrl} />
                      </td>
                      <td className="py-3 pr-3"><StatusBadge status={row.check_status} /></td>
                      <td className="py-3 pr-3 font-mono">{row.http_status || '-'}</td>
                      <td className="py-3 pr-3">
                        <UrlCell url={row.final_url} label="final_url" copiedKey={`${row.id}-final`} copiedUrlKey={copiedUrlKey} onCopy={copyUrl} />
                      </td>
                      <td className="py-3 pr-3">
                        <UrlCell
                          url={row.candidate_new_url}
                          label="candidate_new_url"
                          copiedKey={`${row.id}-candidate`}
                          copiedUrlKey={copiedUrlKey}
                          onCopy={copyUrl}
                          highlight
                        />
                      </td>
                      <td className="py-3 pr-3 font-mono">{row.down_count || 0}</td>
                      <td className="py-3 pr-3 text-slate-500">{formatDate(row.last_checked_at)}</td>
                      <td className="py-3 pr-3">{isDismissed(row) ? <span className="text-emerald-300">확인완료</span> : <span className="text-slate-500">-</span>}</td>
                      <td className="py-3 pr-3 text-slate-500">{formatDate(row.link_check_dismissed_at)}</td>
                      <td className="py-3 pr-3"><p className="max-w-[180px] text-[11px] leading-4 text-slate-500">{row.link_check_dismissed_reason || '-'}</p></td>
                      <td className="py-3 pr-3"><p className="max-w-[260px] text-[11px] leading-4 text-slate-500">{row.status_memo || '-'}</p></td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => void recheckSite(row.id)}
                            disabled={Boolean(running)}
                            className="rounded-lg border border-obsidian-500 px-2 py-1 text-[11px] font-bold text-slate-200 hover:bg-obsidian-700 disabled:opacity-50"
                          >
                            재점검
                          </button>
                          {isManualBrowserCheckStatus(row.check_status) && browserCheckUrl && (
                            <a
                              href={browserCheckUrl}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="rounded-lg border border-sky-500/30 px-2 py-1 text-center text-[11px] font-bold text-sky-300 hover:bg-sky-500/10"
                            >
                              브라우저로 확인
                            </a>
                          )}
                          {row.candidate_new_url && (
                            <>
                              <a
                                href={row.candidate_new_url}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="rounded-lg border border-amber-500/30 px-2 py-1 text-center text-[11px] font-bold text-amber-300 hover:bg-amber-500/10"
                              >
                                새 탭 확인
                              </a>
                              <button
                                onClick={() => void applyCandidate(row)}
                                disabled={Boolean(running)}
                                className="rounded-lg border border-emerald-500/30 px-2 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                              >
                                새 URL 후보 적용
                              </button>
                            </>
                          )}
                          {!isDismissed(row) && (
                            <button
                              onClick={() => void dismissSite(row.id)}
                              disabled={Boolean(running)}
                              className="rounded-lg border border-emerald-500/30 px-2 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                            >
                              확인완료
                            </button>
                          )}
                          {canMarkSiteDown(row.check_status) && (
                            <button
                              onClick={() => void markSiteDown(row)}
                              disabled={Boolean(running)}
                              className="rounded-lg border border-red-500/30 px-2 py-1 text-[11px] font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                            >
                              상태를 접속불가로 변경
                            </button>
                          )}
                          <button
                            onClick={() => openSitesTab(row.id)}
                            className="rounded-lg border border-obsidian-500 px-2 py-1 text-[11px] font-bold text-slate-400 hover:bg-obsidian-700 hover:text-white"
                          >
                            사이트 수정
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
