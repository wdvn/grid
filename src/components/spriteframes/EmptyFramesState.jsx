import React from 'react';
import { Check, Plus, Layers, Sparkles } from 'lucide-react';

/**
 * Placeholder empty state shown when an animation clip has no frames assigned yet.
 */
export function EmptyFramesState({
  animationName,
  selectedCount = 0,
  hasSelectedFrame,
  hasSlicedFrames,
  sheetFramesCount = 0,
  activeSheetName = '',
  onApplySelected,
  onAddSelected,
  onAddSheetFrames,
  onAddAll
}) {
  const count = selectedCount > 0 ? selectedCount : (hasSelectedFrame ? 1 : 0);

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-3 text-slate-500">
      <p className="text-xs mb-2">
        Animation{' '}
        <span className="text-blue-300 font-bold font-mono">
          "{animationName || 'current'}"
        </span>{' '}
        has no frames yet.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* Apply Selected (Primary) */}
        <button
          onClick={onApplySelected || onAddSelected}
          disabled={count === 0}
          className="btn bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-emerald-500/20 shadow px-3 py-1 text-xs rounded-md font-bold flex items-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none transition-all"
          title={`Assign currently selected ${count} frame(s) to this animation`}
        >
          <Check size={13} />
          <span>Apply Selected{count > 0 ? ` (${count})` : ''}</span>
        </button>

        {/* Add Selected (Secondary) */}
        {count > 0 && (
          <button
            onClick={onAddSelected}
            className="btn bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 px-2.5 py-1 text-xs rounded-md font-medium flex items-center gap-1"
            title={`Append currently selected ${count} frame(s)`}
          >
            <Plus size={12} />
            <span>+ Add ({count})</span>
          </button>
        )}

        {/* Add Current Sheet Frames */}
        {sheetFramesCount > 0 && (
          <button
            onClick={onAddSheetFrames}
            className="btn btn-secondary px-2.5 py-1 text-xs rounded-md flex items-center gap-1 text-slate-300 hover:text-white"
            title={`Add all ${sheetFramesCount} frames from sheet "${activeSheetName}"`}
          >
            <Layers size={12} className="text-blue-400" />
            <span>+ Add Sheet Frames ({sheetFramesCount})</span>
          </button>
        )}

        {/* Add All Sliced Frames */}
        <button
          onClick={onAddAll}
          disabled={!hasSlicedFrames}
          className="btn btn-secondary px-2.5 py-1 text-xs rounded-md disabled:opacity-30 text-slate-400 hover:text-slate-200 flex items-center gap-1"
          title="Append all sliced frames from sprite sheet"
        >
          <Sparkles size={11} className="text-amber-400" />
          <span>All Project Frames</span>
        </button>
      </div>
    </div>
  );
}
