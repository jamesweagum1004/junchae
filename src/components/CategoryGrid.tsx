import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { ArrowLeft, ExternalLink } from 'lucide-react';

interface CategoryGridProps {
  onSiteClick: (url: string, name: string) => void;
}

export default function CategoryGrid({ onSiteClick }: CategoryGridProps) {
  const { isSecure } = useTheme();
  
  // 데이터 안전성 확보 (categories 또는 standardCategories 중 존재하는 값을 동적으로 바인딩)
  const { categories, standardCategories, secureCategories } = useData();
  const baseCategories = categories || standardCategories || [];
  const activeCategories = isSecure ? (secureCategories || []) : baseCategories;

  // 더보기 클릭 시 해당 카테고리 상세 페이지로 전환하기 위한 로컬 상태(State)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // ----------------------------------------------------
  // [상세 보기 화면] 더보기를 눌렀을 때 나타나는 독립형 전용 페이지
  // ----------------------------------------------------
  if (selectedCategoryId) {
    const activeCategory = activeCategories.find((c: any) => c.id === selectedCategoryId);
    
    if (activeCategory) {
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
                총 {activeCategory.items?.length || 0}개
              </span>
            </div>

            {/* 전체 주소 목록 - PC 3열 바둑판 정렬 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeCategory.items?.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => onSiteClick(item.url, item.name)}
                  className={`flex justify-between items-center p-4 rounded-xl border text-left transition-all ${
                    isSecure 
                      ? 'bg-zinc-950/60 border-zinc-800/60 hover:border-neon-orange/40 text-zinc-200' 
                      : 'bg-slate-50 border-slate-200/80 hover:border-blue-500/30 text-slate-800 hover:bg-white shadow-sm'
                  }`}
                >
                  <div className="truncate pr-4">
                    <span className="font-bold text-sm block truncate">{item.name}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block truncate max-w-[200px]">{item.url}</span>
                  </div>
                  <span className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    item.status === '정상' 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : item.status === '혼잡' 
                        ? 'bg-amber-500/10 text-amber-500' 
                        : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    {item.status || '정상'}
                  </span>
                </button>
              ))}
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
      {activeCategories.map((category: any) => (
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
                {category.items?.length || 0}
              </span>
            </div>

            {/* 내부 사이트 리스트 - 정확히 최대 5개만 잘라서(slice) 노출 */}
            <div className="space-y-2.5">
              {category.items?.slice(0, 5).map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => onSiteClick(item.url, item.name)}
                  className={`w-full flex justify-between items-center p-3 rounded-xl border text-left transition-all ${
                    isSecure 
                      ? 'bg-zinc-950/40 border-zinc-800/40 hover:bg-zinc-900/60 hover:border-neon-orange/20 text-zinc-300' 
                      : 'bg-slate-50/50 border-slate-200/60 hover:bg-slate-100/50 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold">{item.name}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    item.status === '정상' 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : item.status === '혼잡' 
                        ? 'bg-amber-500/10 text-amber-500' 
                        : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    {item.status || '정상'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 등록된 사이트가 5개를 초과할 때만 활성화되는 '더보기' 유도 버튼 */}
          {category.items && category.items.length > 5 && (
            <button
              onClick={() => setSelectedCategoryId(category.id)}
              className={`mt-4 w-full py-2.5 text-center text-[11px] font-bold rounded-xl transition-all border border-dashed ${
                isSecure 
                  ? 'bg-zinc-900/20 text-zinc-400 border-zinc-800 hover:text-neon-orange hover:border-neon-orange/30 hover:bg-neon-orange/5' 
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-blue-600 hover:border-blue-500/30 hover:bg-blue-50/50'
              }`}
            >
              더보기 (+{category.items.length - 5}개 더보기)
            </button>
          )}
        </div>
      ))}
    </div>
  );
}