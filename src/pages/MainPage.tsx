import { useState } from 'react';
import { Globe, ChevronRight, AlertTriangle, ShieldCheck, Lock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import AdsGrid from '../components/AdsGrid';
import CategoryGrid from '../components/CategoryGrid';
import AIBridgeOverlay from '../components/AIBridgeOverlay';

export default function MainPage() {
  const { isSecure, setMode } = useTheme();
  const { secureCategories } = useData();

  const [overlay, setOverlay] = useState<{ url: string; name: string } | null>(null);

  const handleSiteClick = (url: string, name: string) => {
    setOverlay({ url, name });
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isSecure ? 'bg-obsidian-deep' : 'bg-metallic'}`}>
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-6">
        {/* Hero / Search */}
        <section className="text-center space-y-4 pt-2">
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight mb-1 ${isSecure ? 'text-white' : 'text-slate-900'}`}>
              {isSecure ? (
                <>
                  <span className="text-neon-orange neon-glow">차단된 사이트</span>에 즉시 접속
                </>
              ) : (
                <>
                  <span className="text-blue-700">정예 사이트</span> 디렉토리 포털
                </>
              )}
            </h1>
            <p className={`text-sm ${isSecure ? 'text-slate-500 font-mono' : 'text-slate-500'}`}>
              {isSecure
                ? '> AI 우회 브릿지 엔진 탑재 — 실시간 최적 경로 자동 산출'
                : '엄선된 공식 사이트만을 모아놓은 안전한 링크 포털'}
            </p>
          </div>

          <SearchBar onSiteClick={handleSiteClick} />

          {/* System Alert Banner */}
          <div
            className={`mx-auto max-w-2xl flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs sm:text-sm transition-all duration-300 animate-fade-in ${
              isSecure
                ? 'glass-dark border-emerald-500/30'
                : 'bg-rose-50/90 border border-rose-200'
            }`}
          >
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                isSecure ? 'bg-emerald-500/20' : 'bg-rose-100'
              }`}
            >
              {isSecure ? (
                <ShieldCheck size={16} className="text-emerald-400" />
              ) : (
                <AlertTriangle size={16} className="text-rose-600" />
              )}
            </div>
            <p className={`flex-1 font-mono leading-relaxed ${isSecure ? 'text-emerald-200' : 'text-rose-950 font-medium'}`}>
              {isSecure ? (
                <>🟢 <span className="font-bold">SECURE TUNNEL ACTIVE:</span> 실시간 우회 프록시 터널링 가동 완료. 대피소 암호화 디코딩이 정상 작동 중입니다.</>
              ) : (
                <>⚠️ <span className="font-bold">SYSTEM:</span> 현재 일반 인터넷망 접속 중. 통신사 검열 및 도메인 차단 방지 터널이 비활성화 상태입니다. 실시간 대피소 주소 해독을 위해 우측 상단의 <button onClick={() => setMode('secure')} className="font-bold text-rose-600 underline decoration-rose-400/50 hover:decoration-rose-500 underline-offset-2">[안전 접속 ⚡]</button>을 켜십시오.</>
              )}
            </p>
          </div>

        </section>

        {/* Premium Ads */}
        <section>
          <AdsGrid onAdClick={handleSiteClick} />
        </section>

        {/* Category Grid */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Globe size={14} className={isSecure ? 'text-neon-orange' : 'text-blue-600'} />
            <span className={`text-xs font-semibold uppercase tracking-widest ${isSecure ? 'text-neon-orange/70' : 'text-slate-400'}`}>
              {isSecure ? 'DIRECTORY_INDEX' : '전체 카테고리'}
            </span>
            <ChevronRight size={12} className={isSecure ? 'text-slate-600' : 'text-slate-300'} />
          </div>
          <CategoryGrid onSiteClick={handleSiteClick} />
        </section>

        {/* Lock Teaser — only in Standard mode */}
        {!isSecure && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Lock size={14} className="text-slate-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                SECURE ZONE — LOCKED
              </span>
              <ChevronRight size={12} className="text-slate-300" />
            </div>

            <div
              onClick={() => setMode('secure')}
              className="relative cursor-pointer group overflow-hidden rounded-2xl glass-light border border-slate-300/40 transition-all duration-300 hover:border-neon-orange/40"
            >
              {/* Blur overlay over hidden categories */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 w-full p-4 opacity-20 select-none blur-sm">
                  {secureCategories.map((cat) => (
                    <div key={cat.id} className="rounded-2xl border border-slate-300 bg-white/60 p-4 h-32" />
                  ))}
                </div>
              </div>

              {/* Lock content overlay */}
              <div className="relative z-10 flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-200/80 border border-slate-300 flex items-center justify-center mb-4 wobble">
                  <Lock size={26} className="text-slate-500" />
                </div>
                <p className="text-sm sm:text-base font-bold text-slate-600 mb-1">
                  🔒 안전 접속(Secure) 활성화 시 실시간 우회 주소 봉인 해제
                </p>
                <p className="text-xs text-slate-400 font-mono">
                  웹툰 대피소 · 토렌트 대피소 · 영화/드라마 대피소 · 성인 대피소
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setMode('secure'); }}
                  className="mt-5 px-5 py-2.5 rounded-full bg-neon-orange text-white text-xs font-bold flex items-center gap-1.5 neon-pulse hover:bg-neon-orangeDark transition-colors"
                >
                  <Lock size={12} /> 안전 접속 켜기
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className={`text-center py-8 border-t text-xs space-y-1 ${isSecure ? 'border-obsidian-600 text-slate-700' : 'border-slate-200 text-slate-400'}`}>
          <p className="font-mono">
            {isSecure
              ? '© 2025 전체닷컴 — SECURE BRIDGE ENGINE v2.1'
              : '© 2025 전체닷컴 — 대한민국 No.1 링크 디렉토리'}
          </p>
          <p>모든 링크는 정보 제공 목적으로만 수록되었습니다.</p>
        </footer>
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
