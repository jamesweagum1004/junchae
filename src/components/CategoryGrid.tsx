import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { ArrowLeft } from 'lucide-react';

interface CategoryGridProps {
  onSiteClick: (url: string, name: string) => void;
}

export default function CategoryGrid({ onSiteClick }: CategoryGridProps) {
  const { isSecure } = useTheme();
  
  // Context 데이터 가져오기
  const { categories: ctxCategories, standardCategories: ctxStandard, secureCategories: ctxSecure } = useData();

  // 1. [실시간 싱크] 로컬스토리지 및 컨텍스트 통합 상태 관리
  const [activeCategories, setActiveCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    // 관리자 페이지에서 저장하는 로컬스토리지 키를 실시간으로 긁어옵니다.
    const savedStandard = localStorage.getItem('standardCategories') || localStorage.getItem('categories');
    const savedSecure = localStorage.getItem('secureCategories');

    let standard = ctxStandard || ctxCategories || [];
    let secure = ctxSecure || [];

    // 로컬스토리지에 저장된 진짜 데이터가 있다면 최우선 적용합니다.
    if (savedStandard) {
      try { standard = JSON.parse(savedStandard); } catch (e) {}
    }
    if (savedSecure) {
      try { secure = JSON.parse(savedSecure); } catch (e) {}
    }

    setActiveCategories(isSecure ? secure : standard);
  }, [isSecure, ctxCategories, ctxStandard, ctxSecure]);

  // 데이터 구조 통합 (sites, items, links 자동 감지)
  const getSitesList = (category: any) => {
    return category.sites || category.items || category.links || [];
  };

  // [상태값 번역 및 색상 매핑 헬퍼] normal -> 정상(초록), busy -> 혼잡(주황), slow -> 지연(빨강)
  const getStatusStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'normal' || s === '정상') {
      return { label: '정상', className: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' };
    }
    if (s === 'busy' || s === '혼잡') {
      return { label: '혼잡', className: 'bg-amber-500/10 text-amber-500 border border-amber-500/20' };
    }
    if (s === 'slow' || s === '지연') {
      return { label: '지연', className: 'bg-rose-500/10 text-rose-500 border border-rose-500/20' };
    }
    return { label: status, className: 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20' };
  };

  // ----------------------------------------------------
  // [상세 보기 화면] 더보기를 눌렀을 때 나타나는 독립형 전용 페이지
  // ----------------------------------------------------
  if (selectedCategoryId) {
    const activeCategory = activeCategories.find((c: any) => c.id === selectedCategoryId);
    
    if (activeCategory) {
      const allSites = getSitesList(activeCategory);

      return (
        <div className="space-y-6 animate-fade-in">
          {/* 뒤로가기 버튼 */}
          <button 
            onClick={() => setSelectedCategoryId(null)}
            className={`inline-flex items-center gap-2 text-xs font-bold py-2.5 px-4 rounded-xl transition-all ${
              isSecure 
                ? 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white' 
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
            }`}
          >
            <ArrowLeft size={14} /> 메인으로 돌아가기
          </button>

          {/* 카테고리 상세 카드 */}
          <div className={`p-6 rounded-2xl border ${
            isSecure ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className={`flex justify-between items-center mb-6 border-b pb-4 border-dashed ${
              isSecure ? 'border-zinc-800' : 'border-slate-100'
            }`}>
              <div>
                <h2 className={`text-lg font-bold ${isSecure ? 'text-white' : 'text-slate-900'}`}>
                  {activeCategory.name} 전체 목록
                </h2>
                <p className="text-xs text-slate-400 mt-1">실시간으로 우회 및 보호되고 있는 전체 주소 리스트입니다.</p>
              </div>
              <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
                isSecure ? 'bg-neon-orange/10 text-neon-orange' : 'bg-blue-100 text-blue-700'
              }`}>
                총 {allSites.length}개
              </span>
            </div>

            {/* 전체 주소 목록 - 3열 배치 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allSites.map((item: any) => {
                const siteName = item.name || item.title || "이름 없음";
                const siteUrl = item.url || item.redirectUrl || "";
                const firstLetter = siteName.charAt(0) || "?";
                const statusInfo = getStatusStyle(item.status);

                return (
                  <button
                    key={item.id}
                    onClick={() => onSiteClick(siteUrl, siteName)}
                    className={`flex justify-between items-center p-4 rounded-xl border text-left transition-all ${
                      isSecure 
                        ? 'bg-zinc-950/60 border-zinc-800/60 hover:border-neon-orange/40 text-zinc-200' 
                        : 'bg-slate-50 border-slate-200/80 hover:border-blue-500/30 text-slate-800 hover:bg-white shadow-sm'
                    }`}
                  >
                    <div className="flex items-center truncate pr-4">
                      {/* 네온 이니셜 로고 */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs mr-3 flex-shrink-0 ${
                        isSecure 
                          ? 'bg-zinc-900 border border-orange-500/20 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.15)]' 
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}>
                        {firstLetter}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-sm block truncate">{siteName}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block truncate max-w-[150px]">{siteUrl}</span>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }
  }

  // ----------------------------------------------------
  // [메인 대문 화면] 카테고리별 최대 5개씩 바둑판으로 렌더링
  // ----------------------------------------------------
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
      {activeCategories.map((category: any) => {
        const sites = getSitesList(category);

        return (
          <div 
            key={category.id} 
            className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-300 ${
              isSecure 
                ? 'bg-zinc-900/40 border-zinc-800/60' 
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div>
              {/* 카테고리 헤더 - 실시간 동적 숫자 카운트 반영 */}
              <div className={`flex justify-between items-center mb-4 pb-2 border-b border-dashed ${
                isSecure ? 'border-zinc-800/60' : 'border-slate-100'
              }`}>
                <h3 className={`text-sm font-bold ${isSecure ? 'text-white' : 'text-slate-800'}`}>
                  {category.name}
                </h3>
                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  isSecure ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-400'
                }`}>
                  {sites.length}
                </span>
              </div>

              {/* 내부 사이트 리스트 - 정확히 최대 5개만 잘라서(slice) 노출 */}
              <div className="space-y-2.5">
                {sites.slice(0, 5).map((item: any) => {
                  const siteName = item.name || item.title || "이름 없음";
                  const siteUrl = item.url || item.redirectUrl || "";
                  const firstLetter = siteName.charAt(0) || "?";
                  const statusInfo = getStatusStyle(item.status);

                  return (
                    <button
                      key={item.id}
                      onClick={() => onSiteClick(siteUrl, siteName)}
                      className={`w-full flex justify-between items-center p-2.5 rounded-xl border text-left transition-all ${
                        isSecure 
                          ? 'bg-zinc-950/40 border-zinc-800/40 hover:bg-zinc-900/60 hover:border-neon-orange/20 text-zinc-300' 
                          : 'bg-slate-50/50 border-slate-200/60 hover:bg-slate-100/50 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center truncate mr-2">
                        {/* 네온 이니셜 로고 */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs mr-2 flex-shrink-0 ${
                          isSecure 
                            ? 'bg-zinc-900 border border-orange-500/20 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.1)]' 
                            : 'bg-white border border-slate-200 text-slate-600'
                        }`}>
                          {firstLetter}
                        </div>
                        <span className="text-xs font-bold truncate">{siteName}</span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 등록된 사이트가 5개를 초과할 때만 활성화되는 '더보기' 유도 버튼 */}
            {sites.length > 5 && (
              <button
                onClick={() => setSelectedCategoryId(category.id)}
                className={`mt-4 w-full py-2.5 text-center text-[11px] font-bold rounded-xl transition-all border border-dashed ${
                  isSecure 
                    ? 'bg-zinc-900/20 text-zinc-400 border-zinc-800 hover:text-neon-orange hover:border-neon-orange/30 hover:bg-neon-orange/5' 
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-blue-600 hover:border-blue-500/30 hover:bg-blue-50/50'
                }`}
              >
                더보기 (+{sites.length - 5}개 더보기)
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}