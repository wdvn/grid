import React from 'react';
import { Film, Repeat, Edit2, Check } from 'lucide-react';

/**
 * Single animation row in Godot SpriteFrames animations sidebar.
 * Wrapped in React.memo for snappy, zero-lag list rendering.
 */
export const AnimationItem = React.memo(function AnimationItem({
  anim,
  isActive,
  isRenaming,
  renameValue,
  onSelect,
  onStartRename,
  onRenameChange,
  onSubmitRename,
  onCancelRename,
  onToggleLoop
}) {
  if (isRenaming) {
    return (
      <div className="flex items-center gap-1 p-0.5">
        <input
          type="text"
          value={renameValue}
          autoFocus
          onFocus={(e) => e.target.select()}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmitRename();
            if (e.key === 'Escape') onCancelRename();
          }}
          onBlur={onSubmitRename}
          className="input-field flex-1 h-7 text-xs text-white !py-0 !px-2 font-mono"
        />
        <button
          onClick={onSubmitRename}
          className="btn btn-primary h-7 w-7 !p-0 flex items-center justify-center rounded text-white flex-shrink-0"
          title="Save Name"
        >
          <Check size={12} />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onStartRename}
      className={`group godot-anim-item ${isActive ? 'active' : ''}`}
      title={`Double click to rename "${anim.name}"`}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <Film
          size={12}
          className={isActive ? 'text-blue-400 flex-shrink-0' : 'text-slate-500 flex-shrink-0'}
        />
        <span className="truncate text-xs font-mono">{anim.name}</span>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Loop Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLoop();
          }}
          className={`p-0.5 rounded hover:bg-white/10 ${
            anim.loop ? 'text-blue-400' : 'text-slate-600 hover:text-slate-400'
          }`}
          title={anim.loop ? 'Looping enabled' : 'Looping disabled'}
        >
          <Repeat size={11} />
        </button>

        {/* Frame count badge */}
        <span
          className={`text-[9px] font-mono px-1 py-0.2 rounded ${
            isActive
              ? 'bg-blue-900/60 text-blue-200 border border-blue-400/30'
              : 'bg-slate-900 text-slate-400 border border-white/5'
          }`}
        >
          {anim.frameIds.length}
        </span>

        {/* Inline edit button on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartRename();
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-white"
          title="Rename animation"
        >
          <Edit2 size={10} />
        </button>
      </div>
    </div>
  );
});
