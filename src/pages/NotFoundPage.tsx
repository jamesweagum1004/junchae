import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-200 mb-6">
          <AlertTriangle size={32} className="text-slate-400" />
        </div>
        <h1 className="text-6xl font-black text-slate-200 mb-2">404</h1>
        <h2 className="text-xl font-bold text-slate-700 mb-3">페이지를 찾을 수 없습니다</h2>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
          <br />
          주소를 다시 확인해 주세요.
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors"
        >
          <Home size={16} />
          메인으로 돌아가기
        </button>
        <p className="mt-6 text-xs text-slate-300 font-mono">
          HTTP 404 — Not Found
        </p>
      </div>
    </div>
  );
}
