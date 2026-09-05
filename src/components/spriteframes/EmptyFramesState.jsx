import React from 'react';
import { Plus, Sparkles } from 'lucide-react';

/**
 * Placeholder empty state shown when an animation clip has no frames assigned yet.
 */
export function EmptyFramesState({
  animationName,
  hasSelectedFrame,
  hasSlicedFrames,
  onAddSelected,
  onAddAll
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-3 text-slate-500">
      <p className="text-xs mb-1.5">
        Animation{' '}
        <span className="text-blue-300 font-bold font-mono">
          "{animationName || 'current'}"
        </span>{' '}
        has no frames yet.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={onAddSelected}
          disabled={!hasSelectedFrame}
          className="btn bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 px-2.5 py-1 text-xs rounded font-bold disabled:opacity-30"
          title="Append currently selected canvas frame"
        >
          <Plus size={12} />
          <span>Add Selected Canvas Frame</span>
        </button>
        <button
          onClick={onAddAll}
          disabled={!hasSlicedFrames}
          className="btn btn-secondary px-2.5 py-1 text-xs rounded disabled:opacity-30"
          title="Append all sliced frames from sprite sheet"
        >
          <Sparkles size={11} className="text-amber-400" />
          <span>+ Add All Sliced Frames</span>
        </button>
      </div>
    </div>
  );
}
