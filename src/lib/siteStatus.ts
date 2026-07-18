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
