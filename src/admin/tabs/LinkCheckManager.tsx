import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, ExternalLink, Link2, RefreshCw, ShieldAlert } from 'lucide-react';
import { apiJson } from '../../lib/adminApi';

type LinkCheckStatus =
  | 'normal'
  | 'redirected'
  | 'restricted'
  | 'challenge'
  | 'down'
  | 'timeout'
  | 'server_error'
  | 'unknown'
  | 'unchecked';

type SummaryRow = {
  check_status: LinkCheckStatus | string | null;
  count: number;
};

type LinkCheckRow = {
  id: number;
  mode: 'normal' | 'secure';
  name: string;
  url: string;
  category: string;
  category_slug?: string;
  check_status?: LinkCheckStatus | string | null;
  http_status?: number | null;
  final_url?: string | null;
  candidate_new_url?: string | null;
  down_count?: number;
  last_checked_at?: string | null;
  status_memo?: string | null;
};

type LinkCheckReport = {
  rows: LinkCheckRow[];
  summary: SummaryRow[];
  last_checked_at: string | null;
};

type BulkCheckResult = {
  summary: Record<string, number>;
  results: LinkCheckRow[];
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

const emptyReport: LinkCheckReport = {
  rows: [],
  summary: [],
  last_checked_at: null,
};

function countFor(summary: SummaryRow[], status: string) {
  return summary
    .filter((row) => String(row.check_status || 'unchecked') === status)
    .reduce((sum, row) => sum + Number(row.count || 0), 0);
}

function totalCount(summary: SummaryRow[]) {
  return summary.reduce((sum, row) => sum + Number(row.count || 0), 0);
}

function formatDate(value?: string | null) {
  if (!value) return '기록 없음';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : value;
}

function StatusBadge({ status }: { status?: string | null }) {
  const key = status || 'unchecked';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusClasses[key] || statusClasses.unknown}`}>
      {statusLabels[key] || key}
    </span>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Activity }) {
  return (
    <div className="rounded-xl border border-obsidian-500 bg-obsidian-600 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Icon size={14} className="text-neon-orange" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

export default function LinkCheckManager() {
  const [mode, setMode] = useState<'secure' | 'normal'>('secure');
  const [report, setReport] = useState<LinkCheckReport>(emptyReport);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const stats = useMemo(() => {
    const summary = report.summary || [];
    const downGroup =
      countFor(summary, 'down') +
      countFor(summary, 'timeout') +
      countFor(summary, 'server_error');
    return {
      total: totalCount(summary),
      normal: countFor(summary, 'normal'),
      redirected: countFor(summary, 'redirected'),
      restricted: countFor(summary, 'restricted') + countFor(summary, 'challenge'),
      downGroup,
      lastCheckedAt: report.last_checked_at || report.rows.find((row) => row.last_checked_at)?.last_checked_at || null,
    };
  }, [report]);

  const loadReport = async (nextMode = mode) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiJson<LinkCheckReport>(`/api/admin/sites/link-check-report?mode=${nextMode}&status=problem&limit=300`);
      setReport({ ...emptyReport, ...data });
    } catch (err) {
      setError(err instanceof Error ? err.message : '링크 점검 리포트를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport(mode);
  }, [mode]);

  const runBulkCheck = async (targetMode: 'secure' | 'normal') => {
    setMode(targetMode);
    setRunning(`${targetMode} 전체 점검`);
    setNotice('');
    setError('');
    try {
      const data = await apiJson<BulkCheckResult>('/api/admin/sites/check-links', {
        method: 'POST',
        body: JSON.stringify({
          mode: targetMode,
          only_visible: false,
          limit: 100,
        }),
      });
      setNotice(`점검 완료: ${data.summary.checked || 0}개 확인, 문제 ${Number(data.summary.total || 0) - Number(data.summary.normal || 0)}개`);
      await loadReport(targetMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : '전체 링크 점검에 실패했습니다.');
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
      await loadReport(mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : '사이트 재점검에 실패했습니다.');
    } finally {
      setRunning('');
    }
  };

  const recheckProblems = async () => {
    if (report.rows.length === 0) {
      setNotice('재점검할 문제 링크가 없습니다.');
      return;
    }
    setRunning('문제 링크 재점검');
    setNotice('');
    setError('');
    try {
      for (const row of report.rows) {
        await apiJson<LinkCheckRow>(`/api/admin/sites/${row.id}/check-link`, { method: 'POST' });
      }
      setNotice(`문제 링크 ${report.rows.length}개를 재점검했습니다.`);
      await loadReport(mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : '문제 링크 재점검 중 오류가 발생했습니다.');
    } finally {
      setRunning('');
    }
  };

  const applyCandidate = async (row: LinkCheckRow) => {
    if (!row.candidate_new_url) return;
    if (!window.confirm(`${row.name}의 URL을 새 후보로 변경할까요?`)) return;
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
      await loadReport(mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : '새 URL 후보 반영에 실패했습니다.');
    } finally {
      setRunning('');
    }
  };

  const openSitesTab = () => {
    window.dispatchEvent(new CustomEvent('junchae-admin-tab', { detail: { tab: 'sites' } }));
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-obsidian-500 bg-obsidian-600 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-black text-white">링크 상태 점검</h2>
            <p className="mt-1 text-xs text-slate-500">
              외부 사이트 확인은 서버 API에서만 수행하며, 리다이렉트 후보는 자동 반영하지 않습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void runBulkCheck('secure')}
              disabled={Boolean(running)}
              className="inline-flex items-center gap-2 rounded-lg bg-neon-orange px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              <ShieldAlert size={14} /> SEC 전체 점검
            </button>
            <button
              onClick={() => void runBulkCheck('normal')}
              disabled={Boolean(running)}
              className="inline-flex items-center gap-2 rounded-lg border border-obsidian-500 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-obsidian-700 disabled:opacity-50"
            >
              <Link2 size={14} /> NORMAL 전체 점검
            </button>
            <button
              onClick={() => void recheckProblems()}
              disabled={Boolean(running)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              <RefreshCw size={14} /> 문제 링크 재점검
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(['secure', 'normal'] as const).map((item) => (
            <button
              key={item}
              onClick={() => setMode(item)}
              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                mode === item ? 'border-neon-orange bg-neon-orange/10 text-neon-orange' : 'border-obsidian-500 text-slate-400 hover:text-white'
              }`}
            >
              {item === 'secure' ? 'SEC 리포트' : 'NORMAL 리포트'}
            </button>
          ))}
          {running && <span className="text-xs text-amber-300">{running} 진행 중...</span>}
        </div>
      </div>

      {notice && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">{notice}</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={Activity} label="전체 사이트 수" value={stats.total.toLocaleString()} />
        <StatCard icon={CheckCircle2} label="정상" value={stats.normal.toLocaleString()} />
        <StatCard icon={ExternalLink} label="리다이렉트" value={stats.redirected.toLocaleString()} />
        <StatCard icon={ShieldAlert} label="차단/제한" value={stats.restricted.toLocaleString()} />
        <StatCard icon={AlertTriangle} label="다운/타임아웃" value={stats.downGroup.toLocaleString()} />
      </div>

      <div className="rounded-xl border border-obsidian-500 bg-obsidian-600 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white">문제 링크 목록</h3>
          <span className="text-[11px] text-slate-500">마지막 점검: {formatDate(stats.lastCheckedAt)}</span>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-slate-400">리포트 로딩 중...</div>
        ) : report.rows.length === 0 ? (
          <div className="mt-4 rounded-lg border border-obsidian-500 bg-obsidian-700 p-4 text-sm text-slate-400">
            현재 필터에서 확인된 문제 링크가 없습니다.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr className="border-b border-obsidian-500">
                  <th className="py-2 pr-3">사이트명</th>
                  <th className="py-2 pr-3">모드</th>
                  <th className="py-2 pr-3">카테고리</th>
                  <th className="py-2 pr-3">현재 URL</th>
                  <th className="py-2 pr-3">상태</th>
                  <th className="py-2 pr-3">HTTP</th>
                  <th className="py-2 pr-3">최종 URL</th>
                  <th className="py-2 pr-3">새 URL 후보</th>
                  <th className="py-2 pr-3">누적</th>
                  <th className="py-2 pr-3">점검 시간</th>
                  <th className="py-2 pr-3">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-500">
                {report.rows.map((row) => (
                  <tr key={row.id} className="align-top text-slate-300">
                    <td className="py-3 pr-3 font-bold text-white">{row.name}</td>
                    <td className="py-3 pr-3">{row.mode === 'secure' ? 'SEC' : 'NORMAL'}</td>
                    <td className="py-3 pr-3">{row.category || '-'}</td>
                    <td className="py-3 pr-3">
                      <a href={row.url} target="_blank" rel="noopener noreferrer" className="block max-w-[180px] truncate text-sky-300 hover:underline">
                        {row.url}
                      </a>
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={row.check_status} />
                      {row.status_memo && <p className="mt-1 max-w-[220px] text-[11px] leading-4 text-slate-500">{row.status_memo}</p>}
                    </td>
                    <td className="py-3 pr-3 font-mono">{row.http_status || '-'}</td>
                    <td className="py-3 pr-3">
                      <span className="block max-w-[180px] truncate text-slate-400">{row.final_url || '-'}</span>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="block max-w-[180px] truncate text-amber-300">{row.candidate_new_url || '-'}</span>
                    </td>
                    <td className="py-3 pr-3 font-mono">{row.down_count || 0}</td>
                    <td className="py-3 pr-3 text-slate-500">{formatDate(row.last_checked_at)}</td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => void recheckSite(row.id)}
                          disabled={Boolean(running)}
                          className="rounded-lg border border-obsidian-500 px-2 py-1 text-[11px] font-bold text-slate-200 hover:bg-obsidian-700 disabled:opacity-50"
                        >
                          재점검
                        </button>
                        {row.candidate_new_url && (
                          <button
                            onClick={() => void applyCandidate(row)}
                            disabled={Boolean(running)}
                            className="rounded-lg border border-emerald-500/30 px-2 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                          >
                            새 URL 후보 적용
                          </button>
                        )}
                        <button
                          onClick={openSitesTab}
                          className="rounded-lg border border-obsidian-500 px-2 py-1 text-[11px] font-bold text-slate-400 hover:bg-obsidian-700 hover:text-white"
                        >
                          사이트 관리로 이동
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
