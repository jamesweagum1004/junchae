export type SiteStatus = 'normal' | 'busy' | 'slow';

export interface Site {
  id: number;
  name: string;
  url: string;
  /** Local-hosted favicon/logo path under /uploads/logos/ */
  logo: string;
  status: SiteStatus;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
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
  /** Optional ad image — local path or external URL */
  image?: string;
  placement?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface InterAd {
  id: string;
  /** Render after the category at this index (0-based) */
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

/* ============================================================
 *  STANDARD MODE DATA (일반 모드)
 *  공식 · 합법적 사이트 — 성인/도박/토렌트 카테고리 제외
 *  광고: 쿠팡 파트너스, 공식 VPN 등 안전한 광고
 * ============================================================ */

export const standardCategories: Category[] = [
  {
    id: 'webtoon-official',
    name: '웹툰/만화 (공식)',
    icon: 'BookOpen',
    color: 'blue',
    sites: [
      { id: 101, name: '네이버웹툰', url: 'https://comic.naver.com', logo: '/uploads/logos/naver-webtoon.png', status: 'normal', description: '네이버 공식 웹툰' },
      { id: 102, name: '카카오웹툰', url: 'https://webtoon.kakao.com', logo: '/uploads/logos/kakao-webtoon.png', status: 'normal', description: '카카오 공식 웹툰' },
      { id: 103, name: '카카오페이지', url: 'https://page.kakao.com', logo: '/uploads/logos/kakao-page.png', status: 'busy', description: '카카오 웹툰/소설' },
      { id: 104, name: '레진코믹스', url: 'https://www.lezhin.com', logo: '/uploads/logos/lezhin.png', status: 'normal', description: '프리미엄 웹툰 플랫폼' },
      { id: 105, name: '버프툰', url: 'https://www.toomics.com', logo: '/uploads/logos/toomics.png', status: 'normal', description: '투믹스 공식' },
    ],
  },
  {
    id: 'it-community',
    name: 'IT/기술 커뮤니티',
    icon: 'MessageSquare',
    color: 'indigo',
    sites: [
      { id: 201, name: '에펨코리아', url: 'https://fmkorea.com', logo: '/uploads/logos/fmkorea.png', status: 'normal', description: '종합 커뮤니티' },
      { id: 202, name: '루리웹', url: 'https://ruliweb.com', logo: '/uploads/logos/ruliweb.png', status: 'normal', description: '게임/IT 커뮤니티' },
      { id: 203, name: '클리앙', url: 'https://clien.net', logo: '/uploads/logos/clien.png', status: 'slow', description: 'IT/기술 전문 커뮤' },
      { id: 204, name: '딴지일보', url: 'https://www.ddanzi.com', logo: '/uploads/logos/ddanzi.png', status: 'normal', description: '시사/IT 커뮤니티' },
      { id: 205, name: '보드나라', url: 'https://www.bodnara.co.kr', logo: '/uploads/logos/bodnara.png', status: 'normal', description: '하드웨어 정보' },
    ],
  },
  {
    id: 'sports-news',
    name: '스포츠 뉴스',
    icon: 'Tv',
    color: 'green',
    sites: [
      { id: 301, name: '네이버스포츠', url: 'https://sports.news.naver.com', logo: '/uploads/logos/naver-sports.png', status: 'normal', description: '네이버 공식 스포츠' },
      { id: 302, name: '다음스포츠', url: 'https://sports.daum.net', logo: '/uploads/logos/daum-sports.png', status: 'normal', description: '카카오 스포츠' },
      { id: 303, name: '스포츠조선', url: 'https://sports.chosun.com', logo: '/uploads/logos/sports-chosun.png', status: 'normal', description: '스포츠 전문 신문' },
      { id: 304, name: '마이데일리', url: 'https://www.mydaily.co.kr', logo: '/uploads/logos/mydaily.png', status: 'busy', description: '스포츠/연예 뉴스' },
      { id: 305, name: 'OSEN', url: 'https://osen.mt.co.kr', logo: '/uploads/logos/osen.png', status: 'normal', description: '스포츠/엔터 뉴스' },
    ],
  },
  {
    id: 'streaming-official',
    name: '공식 스트리밍',
    icon: 'Film',
    color: 'red',
    sites: [
      { id: 401, name: '웨이브', url: 'https://www.wavve.com', logo: '/uploads/logos/wavve.png', status: 'normal', description: 'KBS/MBC/SBS 공식' },
      { id: 402, name: '티빙', url: 'https://www.tving.com', logo: '/uploads/logos/tving.png', status: 'normal', description: 'CJ ENM 공식' },
      { id: 403, name: '왓챠', url: 'https://watcha.com', logo: '/uploads/logos/watcha.png', status: 'slow', description: '영화 스트리밍' },
      { id: 404, name: '넷플릭스', url: 'https://www.netflix.com', logo: '/uploads/logos/netflix.png', status: 'normal', description: '글로벌 스트리밍' },
      { id: 405, name: '디즈니+', url: 'https://www.disneyplus.com', logo: '/uploads/logos/disney-plus.png', status: 'normal', description: '디즈니 공식' },
    ],
  },
  {
    id: 'shopping-official',
    name: '쇼핑/이커머스',
    icon: 'ShoppingCart',
    color: 'orange',
    sites: [
      { id: 501, name: '쿠팡', url: 'https://www.coupang.com', logo: '/uploads/logos/coupang.png', status: 'normal', description: '로켓배송 1위' },
      { id: 502, name: '11번가', url: 'https://www.11st.co.kr', logo: '/uploads/logos/11st.png', status: 'normal', description: 'SK플래닛 쇼핑' },
      { id: 503, name: 'G마켓', url: 'https://www.gmarket.co.kr', logo: '/uploads/logos/gmarket.png', status: 'busy', description: '옥션/G마켓' },
      { id: 504, name: 'SSG', url: 'https://www.ssg.com', logo: '/uploads/logos/ssg.png', status: 'normal', description: '신세계 쇼핑' },
      { id: 505, name: '올리브영', url: 'https://www.oliveyoung.co.kr', logo: '/uploads/logos/oliveyoung.png', status: 'normal', description: '뷰티/헬스' },
    ],
  },
  {
    id: 'vpn-official',
    name: '공식 VPN 서비스',
    icon: 'Shield',
    color: 'cyan',
    sites: [
      { id: 601, name: 'NordVPN', url: 'https://nordvpn.com', logo: '/uploads/logos/nordvpn.png', status: 'normal', description: '1위 VPN 서비스' },
      { id: 602, name: 'ExpressVPN', url: 'https://www.expressvpn.com', logo: '/uploads/logos/expressvpn.png', status: 'normal', description: '빠른 속도 VPN' },
      { id: 603, name: 'ProtonVPN', url: 'https://protonvpn.com', logo: '/uploads/logos/protonvpn.png', status: 'normal', description: '무료 VPN 제공' },
      { id: 604, name: 'Surfshark', url: 'https://surfshark.com', logo: '/uploads/logos/surfshark.png', status: 'normal', description: '다기기 접속 VPN' },
      { id: 605, name: 'CyberGhost', url: 'https://www.cyberghostvpn.com', logo: '/uploads/logos/cyberghost.png', status: 'slow', description: '저가 VPN' },
    ],
  },
];

export const standardAds: Ad[] = [
  {
    id: 1,
    title: '쿠팡 파트너스',
    subtitle: '로켓배송 무료체험 + 첫 구매 50% 할인',
    url: 'https://www.coupang.com',
    badge: 'SAFE',
    badgeColor: 'blue',
    bgGradient: 'from-blue-900 to-indigo-800',
    expiresAt: '2025-12-31',
    script: '',
  },
  {
    id: 2,
    title: 'NordVPN 공식 할인',
    subtitle: '연간 이용 시 70% 할인 + 3개월 무료',
    url: 'https://nordvpn.com',
    badge: 'SAFE',
    badgeColor: 'green',
    bgGradient: 'from-emerald-900 to-teal-800',
    expiresAt: '2025-11-30',
    script: '',
  },
  {
    id: 3,
    title: '11번가 빅세일',
    subtitle: '신규 가입 시 1만원 즉시 할인',
    url: 'https://www.11st.co.kr',
    badge: 'AD',
    badgeColor: 'blue',
    bgGradient: 'from-slate-800 to-slate-700',
    expiresAt: '2025-10-31',
    script: '',
  },
  {
    id: 4,
    title: '올리브영 뷰티픽',
    subtitle: '이번 주 베스트 뷰티템 최대 40% 할인',
    url: 'https://www.oliveyoung.co.kr',
    badge: 'AD',
    badgeColor: 'green',
    bgGradient: 'from-green-900 to-emerald-800',
    expiresAt: '2025-12-15',
    script: '',
  },
];

/* ============================================================
 *  SECURE MODE DATA (안전 접속 모드)
 *  정예 대피소 리스트 — 웹툰 대피소, 토렌트, 카지노 등
 *  광고: 카지노, 토토 등 그레이햇 배너
 * ============================================================ */

export const secureCategories: Category[] = [
  {
    id: 'webtoon-shelter',
    name: '웹툰 대피소',
    icon: 'BookOpen',
    color: 'blue',
    sites: [
      { id: 1101, name: '뉴토끼', url: 'https://newtoki.com', logo: '/uploads/logos/newtoki.png', status: 'busy', description: '최신 웹툰 무료 대피소' },
      { id: 1102, name: '마나토끼', url: 'https://manatoki.net', logo: '/uploads/logos/manatoki.png', status: 'normal', description: '일본 만화 번역' },
      { id: 1103, name: '붏토끼', url: 'https://booktoki.com', logo: '/uploads/logos/booktoki.png', status: 'slow', description: '웹소설 무료 연재' },
      { id: 1104, name: '밤토끼', url: 'https://bamtoki.com', logo: '/uploads/logos/bamtoki.png', status: 'normal', description: '성인 웹툰 전문' },
      { id: 1105, name: '툰코', url: 'https://toonkor.com', logo: '/uploads/logos/toonkor.png', status: 'normal', description: '무료 웹툰 모음' },
    ],
  },
  {
    id: 'torrent-shelter',
    name: '토렌트 대피소',
    icon: 'Download',
    color: 'teal',
    sites: [
      { id: 1201, name: '토렌트킴', url: 'https://torrentkim.com', logo: '/uploads/logos/torrentkim.png', status: 'normal', description: '최신 토렌트 검색' },
      { id: 1202, name: '토렌트씨', url: 'https://torrentc.com', logo: '/uploads/logos/torrentc.png', status: 'busy', description: '무료 파일 다운로드' },
      { id: 1203, name: '토렌트뷰', url: 'https://torrentview.com', logo: '/uploads/logos/torrentview.png', status: 'normal', description: '영화/드라마 토렌트' },
      { id: 1204, name: '토렌트아이', url: 'https://torrenti.com', logo: '/uploads/logos/torrenti.png', status: 'slow', description: '한국 최대 토렌트' },
      { id: 1205, name: '파일캐스트', url: 'https://filecast.com', logo: '/uploads/logos/filecast.png', status: 'normal', description: 'P2P 파일 공유' },
    ],
  },
  {
    id: 'movie-shelter',
    name: '영화/드라마 대피소',
    icon: 'Film',
    color: 'red',
    sites: [
      { id: 1301, name: '누누티비', url: 'https://noonootv.com', logo: '/uploads/logos/noonootv.png', status: 'busy', description: '최신 영화 무료' },
      { id: 1302, name: '티비몬', url: 'https://tvmon.com', logo: '/uploads/logos/tvmon.png', status: 'normal', description: '한국 드라마 모음' },
      { id: 1303, name: '다시보기', url: 'https://dashibogi.com', logo: '/uploads/logos/dashibogi.png', status: 'normal', description: 'TV 다시보기 전문' },
      { id: 1304, name: '무비조아', url: 'https://moviejoa.com', logo: '/uploads/logos/moviejoa.png', status: 'normal', description: '헐리우드 최신작' },
      { id: 1305, name: '왓챠무료', url: 'https://watcha-free.com', logo: '/uploads/logos/watcha-free.png', status: 'slow', description: '영화 스트리밍' },
    ],
  },
  {
    id: 'casino-shelter',
    name: '카지노/도박',
    icon: 'Dices',
    color: 'yellow',
    sites: [
      { id: 1401, name: '에볼루션카지노', url: 'https://evolution-casino.com', logo: '/uploads/logos/evolution-casino.png', status: 'normal', description: '라이브 카지노 1위' },
      { id: 1402, name: '토토사이트', url: 'https://totosite.com', logo: '/uploads/logos/totosite.png', status: 'busy', description: '안전 스포츠 배팅' },
      { id: 1403, name: '해외바카라', url: 'https://baccarat.com', logo: '/uploads/logos/baccarat.png', status: 'normal', description: '실시간 바카라' },
      { id: 1404, name: '포커클럽', url: 'https://poker-club.com', logo: '/uploads/logos/poker-club.png', status: 'slow', description: '온라인 포커 전문' },
      { id: 1405, name: '슬롯머신', url: 'https://slotmachine.com', logo: '/uploads/logos/slotmachine.png', status: 'normal', description: '무료 슬롯 게임' },
    ],
  },
  {
    id: 'adult-shelter',
    name: '성인/야동',
    icon: 'Flame',
    color: 'orange',
    sites: [
      { id: 1501, name: '야동판', url: 'https://yadongpan.com', logo: '/uploads/logos/yadongpan.png', status: 'normal', description: '국산 성인 영상' },
      { id: 1502, name: '밤보라', url: 'https://bambora.com', logo: '/uploads/logos/bambora.png', status: 'busy', description: '무료 성인 사이트' },
      { id: 1503, name: '엑스비디오', url: 'https://xvideos.com', logo: '/uploads/logos/xvideos.png', status: 'normal', description: '해외 성인 영상' },
      { id: 1504, name: '야한밤', url: 'https://yahanvam.com', logo: '/uploads/logos/yahanvam.png', status: 'slow', description: '한국 야동 전문' },
      { id: 1505, name: '69TV', url: 'https://69tv.com', logo: '/uploads/logos/69tv.png', status: 'normal', description: '성인 라이브 방송' },
    ],
  },
  {
    id: 'sports-shelter',
    name: '스포츠 중계 대피소',
    icon: 'Tv',
    color: 'green',
    sites: [
      { id: 1601, name: '스포TV', url: 'https://spotv.com', logo: '/uploads/logos/spotv.png', status: 'normal', description: 'HD 스포츠 중계' },
      { id: 1602, name: '축구중계', url: 'https://soccerlive.com', logo: '/uploads/logos/soccerlive.png', status: 'busy', description: '해외 축구 라이브' },
      { id: 1603, name: '농구중계', url: 'https://basketballlive.com', logo: '/uploads/logos/basketballlive.png', status: 'normal', description: 'NBA/KBL 중계' },
      { id: 1604, name: '야구중계', url: 'https://baseballlive.com', logo: '/uploads/logos/baseballlive.png', status: 'normal', description: 'KBO/MLB 실시간' },
      { id: 1605, name: '격투기TV', url: 'https://mmalive.com', logo: '/uploads/logos/mmalive.png', status: 'slow', description: 'UFC/ONE 중계' },
    ],
  },
  {
    id: 'community-shelter',
    name: '커뮤니티 대피소',
    icon: 'MessageSquare',
    color: 'indigo',
    sites: [
      { id: 1701, name: '디씨인사이드', url: 'https://dcinside.com', logo: '/uploads/logos/dcinside.png', status: 'busy', description: '갤러리형 커뮤니티' },
      { id: 1702, name: '인벤', url: 'https://inven.co.kr', logo: '/uploads/logos/inven.png', status: 'normal', description: '게임 정보 포털' },
      { id: 1703, name: '에펨코리아', url: 'https://fmkorea.com', logo: '/uploads/logos/fmkorea.png', status: 'normal', description: '종합 커뮤니티' },
      { id: 1704, name: '루리웹', url: 'https://ruliweb.com', logo: '/uploads/logos/ruliweb.png', status: 'normal', description: '게임/영화 커뮤' },
      { id: 1705, name: '클리앙', url: 'https://clien.net', logo: '/uploads/logos/clien.png', status: 'slow', description: 'IT/기술 전문' },
    ],
  },
  {
    id: 'vpn-shelter',
    name: 'VPN/우회도구',
    icon: 'Shield',
    color: 'cyan',
    sites: [
      { id: 1801, name: 'NordVPN', url: 'https://nordvpn.com', logo: '/uploads/logos/nordvpn.png', status: 'normal', description: '1위 VPN 서비스' },
      { id: 1802, name: 'ExpressVPN', url: 'https://expressvpn.com', logo: '/uploads/logos/expressvpn.png', status: 'normal', description: '빠른 속도 VPN' },
      { id: 1803, name: 'ProtonVPN', url: 'https://protonvpn.com', logo: '/uploads/logos/protonvpn.png', status: 'normal', description: '무료 VPN 제공' },
      { id: 1804, name: 'Lantern', url: 'https://getlantern.org', logo: '/uploads/logos/lantern.png', status: 'slow', description: '차단 우회 프록시' },
      { id: 1805, name: 'Tor Browser', url: 'https://torproject.org', logo: '/uploads/logos/tor.png', status: 'normal', description: '익명 브라우징' },
    ],
  },
];

export const secureAds: Ad[] = [
  {
    id: 1,
    title: '에볼루션 카지노 공식',
    subtitle: '첫 충전 200% 보너스 + 무료스핀 제공',
    url: 'https://evolution-casino.com',
    badge: 'HOT',
    badgeColor: 'red',
    bgGradient: 'from-red-900 to-orange-800',
    expiresAt: '2025-12-31',
    script: '',
  },
  {
    id: 2,
    title: '안전 토토 보증 업체',
    subtitle: '먹튀 없는 100% 안전 배팅 사이트',
    url: 'https://safetoto.com',
    badge: 'NEW',
    badgeColor: 'green',
    bgGradient: 'from-green-900 to-teal-800',
    expiresAt: '2025-11-30',
    script: '',
  },
  {
    id: 3,
    title: '프리미엄 야동 사이트',
    subtitle: '국산/일본/서양 HD 무제한 스트리밍',
    url: 'https://premium-adult.com',
    badge: 'VIP',
    badgeColor: 'orange',
    bgGradient: 'from-orange-900 to-red-800',
    expiresAt: '2025-12-15',
    script: '',
  },
  {
    id: 4,
    title: '해외 바카라 메이저',
    subtitle: '실시간 라이브 딜러 + 입금 보너스',
    url: 'https://major-baccarat.com',
    badge: 'HOT',
    badgeColor: 'red',
    bgGradient: 'from-rose-900 to-red-800',
    expiresAt: '2025-10-31',
    script: '',
  },
];

/* ── Inter-Category Ads (in-feed native ads between category boxes) ── */

export const standardInterAds: InterAd[] = [
  {
    id: 'inter-ad-std-1',
    targetCategoryIndex: 1,
    title: '쿠팡 파트너스 — 최저가 도서 쇼핑',
    description: '오늘만 특가 50% 할인 + 무료배송',
    imageUrl: '',
    redirectUrl: 'https://www.coupang.com',
    badge: 'AD',
    isActive: true,
  },
  {
    id: 'inter-ad-std-2',
    targetCategoryIndex: 3,
    title: '신규 가입 즉시 3만 포인트',
    description: '매충 15% 보너스 이벤트 진행 중',
    imageUrl: '',
    redirectUrl: 'https://partners.coupang.com',
    badge: 'HOT',
    isActive: true,
  },
];

export const secureInterAds: InterAd[] = [
  {
    id: 'inter-ad-sec-1',
    targetCategoryIndex: 0,
    title: '실시간 중계 스포츠 토토',
    description: '신규 가입 즉시 3만 포인트 지급 + 매충 15%',
    imageUrl: '',
    redirectUrl: 'https://casino-link.com',
    badge: 'HOT',
    isActive: true,
  },
  {
    id: 'inter-ad-sec-2',
    targetCategoryIndex: 2,
    title: '해외 메이저 카지노 직접 진입',
    description: '라이브 딜러 24시간 운영 — 원클릭 우회 접속',
    imageUrl: '',
    redirectUrl: 'https://major-casino.com',
    badge: 'AD',
    isActive: true,
  },
];

/* Legacy export for backward compatibility */
export const categoriesData = standardCategories;
export const adsData = standardAds;
