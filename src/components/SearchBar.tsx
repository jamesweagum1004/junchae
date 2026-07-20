import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import type { Site } from '../data/categories';
import { getSiteStatusMeta } from '../lib/siteStatus';

interface SearchBarProps {
  onSiteClick: (site: Site) => void;
}

export default function SearchBar({ onSiteClick }: SearchBarProps) {
  const { isSecure } = useTheme();
  const { allSites } = useData();
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? allSites.filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.description.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div
        className={`flex items-center rounded-2xl overflow-hidden transition-all duration-200 ${
          isSecure
            ? 'bg-obsidian-700 border border-obsidian-500 focus-within:border-neon-orange focus-within:shadow-[0_0_20px_rgba(249,115,22,0.25)]'
            : 'bg-white border border-slate-200 focus-within:border-blue-500 focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] shadow-sm'
        }`}
      >
        <Search
          size={18}
          className={`ml-4 flex-shrink-0 ${isSecure ? 'text-neon-orange' : 'text-slate-400'}`}
        />
        <input
          type="text"
          placeholder={isSecure ? '[사이트 검색]  >' : '사이트 이름 또는 키워드 검색...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`flex-1 px-3 py-3.5 text-sm bg-transparent outline-none ${isSecure ? 'font-mono' : ''} ${
            isSecure
              ? 'text-slate-100 placeholder-neon-orange/40'
              : 'text-slate-800 placeholder-slate-400'
          }`}
        />
        {query && (
          <button onClick={() => setQuery('')} className="mr-3 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {filtered.length > 0 && (
        <div
          className={`absolute top-full mt-2 left-0 right-0 rounded-xl border z-50 overflow-hidden shadow-xl animate-slide-up ${
            isSecure ? 'bg-obsidian-700 border-obsidian-500' : 'bg-white border-slate-200'
          }`}
        >
          {filtered.slice(0, 8).map((site) => {
            const status = getSiteStatusMeta(site.status, isSecure);
            return (
              <button
                key={site.id}
                onClick={() => {
                  onSiteClick(site);
                  setQuery('');
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                  isSecure ? 'hover:bg-obsidian-600 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                {/* Local-hosted favicon */}
                <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 overflow-hidden ${isSecure ? 'bg-obsidian-600' : 'bg-slate-100 border border-slate-200'}`}>
                  <img src={site.logo} alt="" className="w-4 h-4 object-contain" onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) parent.innerHTML = `<span class="text-[10px] font-bold ${isSecure ? 'text-neon-orange' : 'text-slate-500'}">${site.name[0]}</span>`;
                  }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{site.name}</span>
                    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold leading-none ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className={`text-xs truncate ${isSecure ? 'text-slate-400' : 'text-slate-400'}`}>
                    {site.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
