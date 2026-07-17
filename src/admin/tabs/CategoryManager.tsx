import { useState } from 'react';
import { Plus, Trash2, GripVertical, FolderOpen, Edit3, Check, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import ModeSubTabs from '../ModeSubTabs';

export default function CategoryManager() {
  const { getModeData, addCategoryInMode, removeCategoryInMode, updateCategoryNameInMode } = useData();
  const [activeMode, setActiveMode] = useState<'standard' | 'secure'>('standard');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const { categories } = getModeData(activeMode);

  const showError = (message: string, err: unknown) => {
    console.error(message, err);
    alert(message);
  };

  const add = async () => {
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      await addCategoryInMode(activeMode, {
        id: '',
        name: newName.trim(),
        icon: 'FolderOpen',
        color: activeMode === 'secure' ? 'orange' : 'blue',
      });
      setNewName('');
    } catch (err) {
      showError('카테고리 추가에 실패했습니다.', err);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await removeCategoryInMode(activeMode, id);
    } catch (err) {
      showError('카테고리 삭제에 실패했습니다.', err);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim() || saving) return;
    setSaving(true);
    try {
      await updateCategoryNameInMode(activeMode, editingId, editName.trim());
      setEditingId(null);
      setEditName('');
    } catch (err) {
      showError('카테고리 수정에 실패했습니다.', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModeSubTabs activeMode={activeMode} onModeChange={setActiveMode} />

      <div className="flex items-center gap-3">
        <div className="flex-1 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void add();
            }}
            placeholder={`새 카테고리 이름 (${activeMode === 'secure' ? '안전 접속 모드' : '일반 모드'})`}
            className="flex-1 px-3 py-2 text-sm bg-obsidian-600 border border-obsidian-500 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-neon-orange"
          />
          <button
            onClick={() => void add()}
            disabled={saving || !newName.trim()}
            className="px-4 py-2 bg-neon-orange text-white text-sm font-semibold rounded-lg hover:bg-neon-orangeDark flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Plus size={14} /> 추가
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-3 px-3 py-2.5 bg-obsidian-600 border border-obsidian-500 rounded-lg group"
          >
            <GripVertical size={14} className="text-slate-600 cursor-grab" />
            <FolderOpen size={14} className="text-neon-orange flex-shrink-0" />
            {editingId === cat.id ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveEdit();
                }}
                autoFocus
                className="flex-1 px-2 py-1 text-sm bg-obsidian-700 border border-neon-orange/50 rounded text-white focus:outline-none"
              />
            ) : (
              <span className="flex-1 text-sm text-slate-200 font-medium">{cat.name}</span>
            )}
            <span className="text-xs text-slate-600 font-mono hidden sm:block">ID {cat.id}</span>
            <span className="text-xs text-slate-600 font-mono">{cat.sites.length}개</span>
            {editingId === cat.id ? (
              <div className="flex items-center gap-1">
                <button onClick={() => void saveEdit()} disabled={saving} className="text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50">
                  <Check size={14} />
                </button>
                <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => startEdit(cat.id, cat.name)}
                  className="text-slate-500 hover:text-neon-orange transition-colors"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => void remove(cat.id)}
                  disabled={saving}
                  className="text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
