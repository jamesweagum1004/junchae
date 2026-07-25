export type CanonicalSiteStatus = 'normal' | 'busy' | 'down' | 'checking';

export const normalizeSiteStatus = (value: unknown): CanonicalSiteStatus => {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'normal' || status === 'active' || status === '정상') return 'normal';
  if (status === 'busy' || status === 'congested' || status === '혼잡') return 'busy';
  if (status === 'down' || status === 'offline' || status === 'slow' || status === '접속불가') return 'down';
  if (status === 'checking' || status === 'unknown' || status === '확인중') return 'checking';
  return 'checking';
};

export const siteStatusOptions: { value: CanonicalSiteStatus; label: string }[] = [
  { value: 'normal', label: '정상' },
  { value: 'busy', label: '혼잡' },
  { value: 'down', label: '접속불가' },
  { value: 'checking', label: '확인중' },
];

const statusMeta: Record<CanonicalSiteStatus, { label: string; dark: string; light: string }> = {
  normal: {
    label: '정상',
    dark: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    light: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  busy: {
    label: '혼잡',
    dark: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    light: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  down: {
    label: '접속불가',
    dark: 'bg-red-500/15 text-red-300 border-red-400/30',
    light: 'bg-red-50 text-red-700 border-red-200',
  },
  checking: {
    label: '확인중',
    dark: 'bg-slate-500/15 text-slate-300 border-slate-400/25',
    light: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

export const getSiteStatusMeta = (value: unknown, isSecure = false) => {
  const status = normalizeSiteStatus(value);
  const meta = statusMeta[status];
  return {
    status,
    label: meta.label,
    className: isSecure ? meta.dark : meta.light,
  };
};

export const siteStatusPriority = (value: unknown) => {
  const status = normalizeSiteStatus(value);
  if (status === 'normal') return 0;
  if (status === 'busy') return 1;
  if (status === 'checking') return 2;
  return 9;
};

export const compareSitesByStatusAndOrder = <
  T extends { status?: unknown; sortOrder?: number; sort_order?: number; name?: string; id?: number }
>(a: T, b: T) =>
  siteStatusPriority(a.status) - siteStatusPriority(b.status) ||
  (a.sortOrder ?? a.sort_order ?? 0) - (b.sortOrder ?? b.sort_order ?? 0) ||
  String(a.name || '').localeCompare(String(b.name || '')) ||
  (a.id ?? 0) - (b.id ?? 0);

export const normalizeCheckStatus = (value: unknown) => String(value || '').trim().toLowerCase() || 'unchecked';

export const isRedirectedStatus = (value: unknown, candidateNewUrl?: unknown) => {
  const status = normalizeCheckStatus(value);
  return status === 'redirected' || status === 'candidate_detected' || Boolean(String(candidateNewUrl || '').trim());
};

export const isProblemStatus = (checkStatus?: unknown, siteStatus?: unknown) => {
  const status = normalizeCheckStatus(checkStatus);
  if ([
    'candidate_detected',
    'redirected',
    'down',
    'timeout',
    'restricted',
    'server_error',
    'challenge',
    'latest_unknown',
    'unknown',
  ].includes(status)) return true;
  return normalizeSiteStatus(siteStatus) === 'down';
};

export const getCheckStatusLabel = (value: unknown) => {
  const status = normalizeCheckStatus(value);
  const labels: Record<string, string> = {
    normal: '정상 확인',
    redirected: '리다이렉트 감지',
    candidate_detected: '새 주소 후보 감지',
    candidate_dismissed: '후보 확인 완료',
    candidate_rejected: '후보 확인 완료',
    restricted: '접근 제한',
    challenge: '자동 확인 제한',
    latest_unknown: '최신 주소 확인 필요',
    down: '접속 불가',
    timeout: '시간 초과',
    server_error: '서버 오류',
    unknown: '확인 필요',
    unchecked: '미점검',
  };
  return labels[status] || status;
};

export const getCheckStatusBadgeClass = (value: unknown, isSecure = false) => {
  const status = normalizeCheckStatus(value);
  if (status === 'normal') return isSecure
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'redirected') return isSecure
    ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
    : 'border-sky-200 bg-sky-50 text-sky-700';
  if (status === 'candidate_detected') return isSecure
    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    : 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'restricted' || status === 'challenge' || status === 'latest_unknown') return isSecure
    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    : 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'down' || status === 'timeout' || status === 'server_error') return isSecure
    ? 'border-red-500/30 bg-red-500/10 text-red-300'
    : 'border-red-200 bg-red-50 text-red-700';
  return isSecure
    ? 'border-slate-500/30 bg-slate-500/10 text-slate-300'
    : 'border-slate-200 bg-slate-100 text-slate-600';
};

export const calculateSiteStatusScore = (site: { check_status?: unknown; status?: unknown; down_count?: number | null }) => {
  const checkStatus = normalizeCheckStatus(site.check_status);
  const baseByCheckStatus: Record<string, number> = {
    normal: 100,
    redirected: 80,
    candidate_detected: 60,
    candidate_dismissed: normalizeSiteStatus(site.status) === 'normal' ? 100 : normalizeSiteStatus(site.status) === 'down' ? 20 : 65,
    candidate_rejected: normalizeSiteStatus(site.status) === 'normal' ? 100 : normalizeSiteStatus(site.status) === 'down' ? 20 : 65,
    challenge: 70,
    restricted: 50,
    latest_unknown: 45,
    server_error: 45,
    timeout: 35,
    down: 20,
    unknown: 55,
    unchecked: normalizeSiteStatus(site.status) === 'normal' ? 100 : normalizeSiteStatus(site.status) === 'down' ? 20 : 65,
  };
  const base = baseByCheckStatus[checkStatus] ?? 55;
  const penalty = Math.max(0, Number(site.down_count || 0)) * 5;
  return Math.max(0, Math.min(100, base - penalty));
};

export const formatPublicCheckDate = (value?: string | null) => {
  if (!value) return '확인일 정보 없음';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '확인일 정보 없음';

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfDate) / 86400000);

  if (dayDiff === 0) return '오늘 확인';
  if (dayDiff === 1) return '어제 확인';
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}. 확인`;
};
