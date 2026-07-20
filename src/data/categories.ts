import type { CanonicalSiteStatus } from '../lib/siteStatus';

export type SiteStatus =
  | CanonicalSiteStatus
  | 'active'
  | 'congested'
  | 'offline'
  | 'unknown'
  | 'slow'
  | '정상'
  | '혼잡'
  | '접속불가'
  | '확인중';
export type DbMode = 'normal' | 'secure';

export interface Site {
  id: number;
  mode?: DbMode;
  name: string;
  url: string;
  logo: string;
  status: SiteStatus;
  description: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  seo_slug?: string;
  seo_h1?: string;
  seo_canonical?: string;
  seo_og_title?: string;
  seo_og_description?: string;
  seo_og_image?: string;
  seo_score?: number;
  seo_updated_at?: string | null;
  is_hidden?: boolean;
  isHidden?: boolean;
  is_featured?: boolean;
  isFeatured?: boolean;
  featured_order?: number;
  featuredOrder?: number;
  sort_order?: number;
  sortOrder?: number;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  icon: string;
  color: string;
  sortOrder?: number;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  seo_intro?: string;
  seo_faq?: string | { question: string; answer: string }[];
  seo_updated_at?: string | null;
  sites: Site[];
}

export interface Ad {
  id: number;
  title: string;
  subtitle: string;
  url: string;
  badge: string;
  badgeColor: string;
  bgGradient: string;
  expiresAt: string;
  script: string;
  image?: string;
  placement?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface InterAd {
  id: string;
  targetCategoryIndex: number;
  title: string;
  description: string;
  imageUrl: string;
  redirectUrl: string;
  badge: string;
  isActive: boolean;
  expiresAt?: string;
  sortOrder?: number;
}

export const standardCategories: Category[] = [
  {
    id: 'official-webtoon',
    name: '웹툰/만화',
    icon: 'BookOpen',
    color: 'blue',
    sortOrder: 0,
    sites: [
      {
        id: 101,
        mode: 'normal',
        name: '네이버웹툰',
        url: 'https://comic.naver.com',
        logo: '/uploads/logos/naver-webtoon.png',
        status: 'normal',
        description: '공식 웹툰 서비스',
      },
    ],
  },
  {
    id: 'community',
    name: '커뮤니티',
    icon: 'MessageSquare',
    color: 'indigo',
    sortOrder: 1,
    sites: [
      {
        id: 201,
        mode: 'normal',
        name: '에펨코리아',
        url: 'https://fmkorea.com',
        logo: '/uploads/logos/fmkorea.png',
        status: 'normal',
        description: '종합 커뮤니티',
      },
    ],
  },
];

export const secureCategories: Category[] = [
  {
    id: 'secure-webtoon',
    name: '웹툰 대피소',
    icon: 'BookOpen',
    color: 'orange',
    sortOrder: 0,
    sites: [
      {
        id: 1101,
        mode: 'secure',
        name: '뉴토끼',
        url: 'https://newtoki.com',
        logo: '/uploads/logos/newtoki.png',
        status: 'busy',
        description: '웹툰 대피소',
      },
    ],
  },
  {
    id: 'secure-community',
    name: '커뮤니티 대피소',
    icon: 'MessageSquare',
    color: 'indigo',
    sortOrder: 1,
    sites: [
      {
        id: 1701,
        mode: 'secure',
        name: '디시인사이드',
        url: 'https://dcinside.com',
        logo: '/uploads/logos/dcinside.png',
        status: 'normal',
        description: '커뮤니티 대피소',
      },
    ],
  },
];

export const standardAds: Ad[] = [
  {
    id: 1,
    title: '공식 배너',
    subtitle: '광고 설명을 입력하세요.',
    url: '#',
    badge: 'AD',
    badgeColor: 'blue',
    bgGradient: 'from-slate-900 to-slate-800',
    expiresAt: '',
    script: '',
    image: '',
    placement: 'top',
    isActive: true,
    sortOrder: 0,
  },
];

export const secureAds: Ad[] = [
  {
    id: 1,
    title: '안전 접속 배너',
    subtitle: '광고 설명을 입력하세요.',
    url: '#',
    badge: 'SAFE',
    badgeColor: 'green',
    bgGradient: 'from-slate-900 to-slate-800',
    expiresAt: '',
    script: '',
    image: '',
    placement: 'top',
    isActive: true,
    sortOrder: 0,
  },
];

export const standardInterAds: InterAd[] = [];
export const secureInterAds: InterAd[] = [];

export const categoriesData = standardCategories;
export const adsData = standardAds;
