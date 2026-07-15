import { useEffect, useState, useRef } from 'react';
import { Cpu, Shield, Zap, X, Lock, Globe } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface AIBridgeOverlayProps {
  targetUrl: string;
  siteName: string;
  onClose: () => void;
}

const SECURE_LOG_STEPS = [
  { delay: 400,  progress: 12, text: '▶ 접속 요청 패킷 분석 중... 네트워크 레이어 스캔' },
  { delay: 900,  progress: 35, text: '▶ 보안 우회 프록시 터널링 엔드포인트 연결 중... 35%' },
  { delay: 1500, progress: 52, text: '⚠  대한민국 ISP 통신사 차단 벽(Warning) 감지됨' },
  { delay: 2100, progress: 70, text: '▶ 차단 우회 스크립트 가동... 우회 레이어 3단계 적용... 70%' },
  { delay: 2800, progress: 85, text: '▶ AES-256 암호화 세션 핸드쉐이크 완료' },
  { delay: 3400, progress: 99, text: '✓  최신 유효 대피소 IP 타겟 매칭 완료... 99%' },
  { delay: 4100, progress: 100, text: '✓  접속 경로 확보 완료. 입장 가능 상태.' },
];

const STANDARD_LOG_STEPS = [
  { delay: 400,  progress: 12, text: '▶ 접속 요청 패킷 분석 중... 공식 DNS 레코드 조회' },
  { delay: 900,  progress: 35, text: '▶ 안전한 SSL/TLS 보안 암호화 소켓 생성 중... 35%' },
  { delay: 1500, progress: 52, text: '▶ 인증서 체인 검증 완료 — 신뢰할 수 있는 CA 발급' },
  { delay: 2100, progress: 70, text: '▶ 글로벌 트래픽 분산용 최적 CDN 에지 라우팅 적용 중... 70%' },
  { delay: 2800, progress: 85, text: '▶ 가장 가까운 엣지 노드 선택 완료 — 지연 시간 최소화' },
  { delay: 3400, progress: 99, text: '✓  공식 원본 서버 핸드쉐이크 완료. 즉시 유동 입장합니다... 99%' },
  { delay: 4100, progress: 100, text: '✓  안전한 연결 확보 완료. 입장 가능 상태.' },
];

const TOTAL_DURATION = 4500;

export default function AIBridgeOverlay({ targetUrl, siteName, onClose }: AIBridgeOverlayProps) {
  const { isSecure } = useTheme();

  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [launched, setLaunched] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const logSteps = isSecure ? SECURE_LOG_STEPS : STANDARD_LOG_STEPS;

  const launch = () => {
    if (launched) return;
    setLaunched(true);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  useEffect(() => {
    const startTime = Date.now();
    const raf = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
      setProgress(pct);
      if (pct < 100) requestAnimationFrame(raf);
      else setDone(true);
    };
    requestAnimationFrame(raf);

    logSteps.forEach(({ delay, text }) => {
      const id = setTimeout(() => {
        setLogs((prev) => [...prev, text]);
      }, delay);
      timerRefs.current.push(id);
    });

    const autoId = setTimeout(launch, TOTAL_DURATION);
    timerRefs.current.push(autoId);

    return () => {
      timerRefs.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center scanline terminal-flicker"
      style={{ background: 'rgba(10,10,15,0.97)' }}>
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(249,115,22,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors z-10"
      >
        <X size={20} />
      </button>

      <div className="relative w-full max-w-xl mx-4 flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-neon-orange/10 border border-neon-orange/30 flex items-center justify-center animate-pulse-glow">
              {isSecure ? <Cpu size={20} className="text-neon-orange" /> : <Globe size={20} className="text-neon-orange" />}
            </div>
          </div>
          <h2 className="text-white font-black text-xl mb-1 tracking-tight">
            {isSecure
              ? 'AI 엔진이 실시간 최적 우회 접속 경로를 연산 중입니다'
              : '공식 정격 경로로 안전하게 연결 중입니다'}
          </h2>
          <p className="text-slate-500 text-sm font-mono">
            TARGET: <span className="text-neon-orange">{siteName}</span>
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono text-slate-500">
            <span className="flex items-center gap-1">
              {isSecure ? <Shield size={11} className="text-neon-orange" /> : <Lock size={11} className="text-neon-orange" />}
              {isSecure ? 'SECURE TUNNEL' : 'SSL SECURE CONNECT'}
            </span>
            <span className={`font-bold ${done ? 'text-emerald-400' : 'text-neon-orange'}`}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-obsidian-600 rounded-full overflow-hidden border border-neon-orange/10">
            <div
              className="h-full bg-neon-orange rounded-full progress-glow transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Terminal Log */}
        <div className="bg-black/60 border border-neon-orange/15 rounded-xl p-4 font-mono text-xs space-y-1.5 max-h-44 overflow-y-auto">
          <div className="text-neon-orange/60 mb-2">
            {'> '}{isSecure ? 'JUNCHAE_AI_BRIDGE v4.2.1' : 'STANDARD_CONNECT v4.2.1'} — 세션 초기화
          </div>
          {logs.map((log, i) => (
            <div
              key={i}
              className={`${
                log.startsWith('⚠') ? 'text-amber-400' :
                log.startsWith('✓') ? 'text-emerald-400' :
                'text-slate-400'
              } animate-fade-in`}
            >
              {log}
            </div>
          ))}
          {!done && <div className="text-neon-orange/70 cursor-blink" />}
          <div ref={logEndRef} />
        </div>

        {/* CTA Button */}
        <button
          onClick={launch}
          disabled={launched}
          className={`w-full py-4 rounded-xl font-black text-base tracking-wide flex items-center justify-center gap-2 transition-all duration-200 ${
            done
              ? 'bg-neon-orange text-white shadow-[0_0_30px_rgba(249,115,22,0.5)] hover:bg-neon-orangeDark scale-100 hover:scale-[1.02] active:scale-[0.99]'
              : 'bg-neon-orange/20 text-neon-orange border border-neon-orange/30 hover:bg-neon-orange/30'
          }`}
        >
          <Zap size={18} fill={done ? 'white' : 'none'} />
          {isSecure ? 'AI 최적 우회로로 즉시 입장' : '안전 경로로 즉시 입장'}
        </button>

        <p className="text-center text-slate-600 text-xs font-mono">
          {done ? '준비 완료 — 새 탭에서 접속됩니다' : `자동 입장까지 잠시 기다리세요`}
        </p>
      </div>
    </div>
  );
}
