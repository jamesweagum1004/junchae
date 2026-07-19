import { useState } from 'react';
import {
  FolderOpen,
  List,
  Image,
  Cpu,
  Megaphone,
  BarChart2,
  FileText,
  Radio,
  LogOut,
  Zap,
  ChevronRight,
  Menu,
  X,
  Shield,
  KeyRound,
  Search,
  LayoutDashboard,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import AdminLogin from '../components/AdminLogin';
import CategoryManager from '../admin/tabs/CategoryManager';
import SiteManager from '../admin/tabs/SiteManager';
import LogoUploader from '../admin/tabs/LogoUploader';
import DeepSeekSettings from '../admin/tabs/DeepSeekSettings';
import AdController from '../admin/tabs/AdController';
import AnalyticsSettings from '../admin/tabs/AnalyticsSettings';
import PSEOManager from '../admin/tabs/PSEOManager';
import AISEOManager from '../admin/tabs/AISEOManager';
import BridgeAdManager from '../admin/tabs/BridgeAdManager';
import AccountSettings from '../admin/tabs/AccountSettings';
import CmsDashboard from '../admin/tabs/CmsDashboard';
import SeoFilesManager from '../admin/tabs/SeoFilesManager';

const TABS = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard, desc: '방문자/CMS 현황' },
  { id: 'categories', label: '카테고리 관리', icon: FolderOpen, desc: '추가/삭제/순서' },
  { id: 'sites', label: '사이트 리스트', icon: List, desc: '상태/로고/카테고리' },
  { id: 'logos', label: '로고/파비콘', icon: Image, desc: '이미지 업로드' },
  { id: 'deepseek', label: 'DeepSeek AI', icon: Cpu, desc: 'API 설정' },
  { id: 'ads', label: '광고 컨트롤러', icon: Megaphone, desc: '배너 관리' },
  { id: 'analytics', label: 'Google SiteKit', icon: BarChart2, desc: 'GA/Search Console' },
  { id: 'seo-files', label: 'SEO 파일 관리', icon: FileText, desc: 'robots/sitemap' },
  { id: 'pseo', label: 'pSEO 관리', icon: FileText, desc: '사이트별 메타' },
  { id: 'ai-seo', label: 'AI SEO 센터', icon: Search, desc: 'AI SEO 생성' },
  { id: 'bridge', label: '브릿지 광고', icon: Radio, desc: 'ExoClick 설정' },
  { id: 'account', label: '보안 / 계정 설정', icon: KeyRound, desc: 'ID/PW/주소' },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={() => {}} onExit={() => navigate('/')} />;
  }

  const current = TABS.find((tab) => tab.id === activeTab) || TABS[0];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <CmsDashboard />;
      case 'categories': return <CategoryManager />;
      case 'sites': return <SiteManager />;
      case 'logos': return <LogoUploader />;
      case 'deepseek': return <DeepSeekSettings />;
      case 'ads': return <AdController />;
      case 'analytics': return <AnalyticsSettings />;
      case 'seo-files': return <SeoFilesManager />;
      case 'pseo': return <PSEOManager />;
      case 'ai-seo': return <AISEOManager />;
      case 'bridge': return <BridgeAdManager />;
      case 'account': return <AccountSettings />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-900 flex flex-col">
      <header className="sticky top-0 z-50 h-14 bg-obsidian-800 border-b border-obsidian-600 flex items-center px-4 gap-4">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-slate-400 hover:text-white">
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-neon-orange flex items-center justify-center shadow-[0_0_10px_rgba(249,115,22,0.5)]">
            <Zap size={14} className="text-white" fill="white" />
          </div>
          <span className="font-extrabold text-white text-sm tracking-tight">
            junchae <span className="text-neon-orange">ADMIN</span>
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-xs font-mono text-slate-600">
          <ChevronRight size={12} />
          <span className="text-slate-400">{current.label}</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs font-mono text-emerald-400 hidden sm:flex items-center gap-1">
            <Shield size={11} /> SESSION ACTIVE
          </span>
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
          >
            <LogOut size={14} /> 로그아웃
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`fixed lg:relative inset-y-14 left-0 z-40 w-60 bg-obsidian-800 border-r border-obsidian-600 flex flex-col transition-transform duration-200 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group ${
                    isActive ? 'bg-neon-orange/10 border border-neon-orange/20' : 'hover:bg-obsidian-700 border border-transparent'
                  }`}
                >
                  <Icon size={15} className={`flex-shrink-0 ${isActive ? 'text-neon-orange' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <div className="min-w-0">
                    <div className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                      {tab.label}
                    </div>
                    <div className="text-[10px] text-slate-600 truncate">{tab.desc}</div>
                  </div>
                  {isActive && <div className="ml-auto w-1 h-4 bg-neon-orange rounded-full flex-shrink-0" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h1 className="text-xl font-black text-white">{current.label}</h1>
              <p className="text-sm text-slate-500 mt-0.5">{current.desc}</p>
            </div>
            <div className="animate-fade-in">{renderContent()}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
