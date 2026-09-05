import React, { useState, useMemo } from 'react';
import { Film, Plus, Copy, Trash2, Search, X } from 'lucide-react';
import { AnimationItem } from './AnimationItem';

/**
 * Left column of Godot SpriteFrames dock: Manages list of animation clips.
 * Header height is strictly h-9 (36px) to match the TrackToolbar perfectly.
 */
export function AnimationsList({
  animations = [],
  activeAnimationId,
  onSelectAnimation,
  onAddAnimation,
  onDuplicateAnimation,
  onDeleteAnimation,
  onUpdateAnimation
}) {
  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAnimations = useMemo(() => {
    if (!searchQuery.trim()) return animations;
    const q = searchQuery.toLowerCase();
    return animations.filter((a) => a.name.toLowerCase().includes(q));
  }, [animations, searchQuery]);

  // Inline rename state
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const startRename = (anim) => {
    setRenamingId(anim.id);
    setRenameValue(anim.name);
  };

  const submitRename = () => {
    if (renamingId && renameValue.trim()) {
      onUpdateAnimation?.(renamingId, { name: renameValue.trim() });
    }
    setRenamingId(null);
  };

  return (
    <div className="w-56 flex-shrink-0 flex flex-col bg-slate-950/60 min-h-0">
      {/* Header Toolbar (h-9 to match TrackToolbar) */}
      <div className="h-9 px-2 bg-slate-950/70 border-b border-white/10 flex items-center justify-between gap-1 flex-shrink-0">
        {/* Title & Count Badge */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Film size={13} className="text-blue-400 flex-shrink-0" />
          <span className="text-xs font-bold text-slate-200 tracking-wide">
            Animations
          </span>
          <span className="text-[10px] font-mono font-semibold bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded-full border border-blue-500/30 flex-shrink-0">
            {animations.length}
          </span>
        </div>

        {/* Action Buttons: Add, Duplicate, Delete */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => {
              const newAnim = onAddAnimation?.();
              if (newAnim) startRename(newAnim);
            }}
            className="w-6 h-6 flex items-center justify-center rounded text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
            title="New Animation"
          >
            <Plus size={14} />
          </button>

          <button
            onClick={() => activeAnimationId && onDuplicateAnimation?.(activeAnimationId)}
            disabled={!activeAnimationId}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-25 disabled:pointer-events-none"
            title="Duplicate Animation"
          >
            <Copy size={12} />
          </button>

          <button
            onClick={() => activeAnimationId && onDeleteAnimation?.(activeAnimationId)}
            disabled={animations.length <= 1}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-25 disabled:pointer-events-none"
            title="Delete Animation"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Quick Search / Filter Bar (Standardized with Edit Frame input-field) */}
      {animations.length > 3 && (
        <div className="p-1.5 border-b border-white/10 bg-slate-950/40 flex-shrink-0">
          <div className="relative flex items-center">
            <Search size={12} className="absolute left-2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter animations..."
              className="input-field w-full h-7 text-xs !pl-7 !pr-6 !py-0 placeholder-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 text-slate-500 hover:text-white p-0.5 rounded transition-colors"
                title="Clear search"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scrollable List of Animations */}
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {filteredAnimations.map((anim) => (
          <AnimationItem
            key={anim.id}
            anim={anim}
            isActive={anim.id === activeAnimationId}
            isRenaming={renamingId === anim.id}
            renameValue={renameValue}
            onSelect={() => onSelectAnimation?.(anim.id)}
            onStartRename={() => startRename(anim)}
            onRenameChange={setRenameValue}
            onSubmitRename={submitRename}
            onCancelRename={() => setRenamingId(null)}
            onToggleLoop={() => onUpdateAnimation?.(anim.id, { loop: !anim.loop })}
          />
        ))}

        {filteredAnimations.length === 0 && (
          <div className="text-center text-[10px] text-slate-500 py-4">No animations found</div>
        )}
      </div>
    </div>
  );
}
