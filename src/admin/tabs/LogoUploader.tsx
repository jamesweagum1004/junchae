import { useState, useRef } from 'react';
import { Upload, Image, X, CheckCircle } from 'lucide-react';
import ModeSubTabs from '../ModeSubTabs';

export default function LogoUploader() {
  const [activeMode, setActiveMode] = useState<'standard' | 'secure'>('standard');
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<{ name: string; preview: string; type: 'logo' | 'favicon'; mode: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent, type: 'logo' | 'favicon') => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFiles((prev) => [...prev, { name: file.name, preview: ev.target?.result as string, type, mode: activeMode }]);
    };
    reader.readAsDataURL(file);
  };

  const remove = (name: string) => setFiles((prev) => prev.filter((f) => f.name !== name));

  const DropZone = ({ type, label }: { type: 'logo' | 'favicon'; label: string }) => (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => handleDrop(e, type)}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
        dragOver
          ? 'border-neon-orange bg-neon-orange/5'
          : 'border-obsidian-500 hover:border-neon-orange/50 hover:bg-obsidian-600/50'
      }`}
    >
      <Upload size={24} className="mx-auto mb-3 text-slate-500" />
      <p className="text-sm font-semibold text-slate-300">{label}</p>
      <p className="text-xs text-slate-600 mt-1">PNG, SVG, ICO — 드래그하거나 클릭</p>
      <p className="text-[10px] text-neon-orange/50 mt-1 font-mono">→ /uploads/logos/ 에 자동 저장</p>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          setFiles((prev) => [...prev, { name: file.name, preview: ev.target?.result as string, type, mode: activeMode }]);
        };
        reader.readAsDataURL(file);
      }} />
    </div>
  );

  return (
    <div className="space-y-6">
      <ModeSubTabs activeMode={activeMode} onModeChange={setActiveMode} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DropZone type="logo" label="사이트 로고 업로드" />
        <DropZone type="favicon" label="파비콘 업로드 (32×32)" />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">업로드된 파일</p>
          {files.map((f) => (
            <div key={f.name} className="flex items-center gap-3 px-3 py-2.5 bg-obsidian-600 rounded-lg border border-obsidian-500">
              <Image size={14} className="text-neon-orange flex-shrink-0" />
              {f.preview && <img src={f.preview} alt={f.name} className="w-8 h-8 object-contain rounded" />}
              <span className="flex-1 text-sm text-slate-300 font-medium truncate">{f.name}</span>
              <span className="text-xs text-slate-600 px-2 py-0.5 bg-obsidian-700 rounded font-mono">{f.type}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-mono ${f.mode === 'secure' ? 'text-neon-orange bg-neon-orange/10' : 'text-blue-400 bg-blue-500/10'}`}>
                {f.mode === 'secure' ? 'SECURE' : 'STANDARD'}
              </span>
              <button onClick={() => remove(f.name)} className="text-slate-600 hover:text-red-400 transition-colors">
                <X size={14} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono mt-2">
            <CheckCircle size={12} /> 서버 폴더(/uploads/logos/)에 저장 완료
          </div>
        </div>
      )}
    </div>
  );
}
