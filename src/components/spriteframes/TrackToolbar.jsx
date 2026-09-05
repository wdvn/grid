import React from 'react';
import {
  Play,
  Pause,
  Plus,
  Check,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  Repeat,
  Film
} from 'lucide-react';

/**
 * Compact, system-design compliant toolbar for the Animation Frames Track in SpriteFrames dock.
 * Adheres to standard h-7 control heights, segmented button groups, and consistent typography.
 */
export function TrackToolbar({
  activeAnimation,
  activeFramesCount = 0,
  hasSlicedFrames,
  selectedFrameId,
  selectedFrameIds = [],
  selectedIndexInAnimation,
  isPreviewPlaying,
  onTogglePlay,
  onUpdateFps,
  onUpdateLoop,
  onApplySelectedFrames,
  onAddSelectedFrames,
  onAddSelectedFrame,
  onAddSheetFrames,
  onAddAllFrames,
  onReorderLeft,
  onReorderRight,
  onRemoveSelectedFrame,
  onClearAllFrames,
  sheetFramesCount = 0,
  activeSheetName = ''
}) {
  const selectedCount = selectedFrameIds.length > 0 ? selectedFrameIds.length : (selectedFrameId ? 1 : 0);
  const canReorderLeft = activeAnimation && selectedIndexInAnimation > 0;
  const canReorderRight =
    activeAnimation &&
    selectedIndexInAnimation !== -1 &&
    selectedIndexInAnimation < (activeAnimation.frameIds?.length || 0) - 1;
  const canRemove = activeAnimation && selectedIndexInAnimation !== -1;
  const canClear = activeAnimation && (activeAnimation.frameIds?.length || 0) > 0;
  const isLooping = activeAnimation?.loop !== false;

  return (
    <div className="h-9 px-2.5 bg-slate-950/70 border-b border-white/10 flex items-center justify-between gap-2 flex-shrink-0">
      {/* Left: Active Animation Pill & Playback Controls */}
      <div className="flex items-center gap-1.5 min-w-0">
        {/* Active Animation Pill */}
        {activeAnimation && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-white/10 text-xs font-mono flex-shrink-0 shadow-inner">
            <Film size={11} className="text-blue-400" />
            <span className="text-blue-300 font-bold max-w-[120px] truncate">
              {activeAnimation.name}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-bold">{activeFramesCount}f</span>
          </div>
        )}

        {/* Play / Pause Dock Preview Button */}
        <button
          onClick={onTogglePlay}
          disabled={activeFramesCount === 0}
          className={`h-7 px-2.5 rounded-md flex items-center gap-1 text-xs font-semibold shadow transition-all ${
            isPreviewPlaying
              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-amber-500/20'
              : 'btn-secondary text-slate-200 hover:text-white'
          } disabled:opacity-30 disabled:pointer-events-none`}
          title={isPreviewPlaying ? 'Pause Dock Preview (Space)' : 'Play Animation in Dock'}
        >
          {isPreviewPlaying ? <Pause size={12} /> : <Play size={12} />}
          <span>{isPreviewPlaying ? 'Pause' : 'Play'}</span>
        </button>

        {/* Speed (FPS) Input Stepper (Standardized with Edit Frame input-field) */}
        <div className="flex items-center gap-1.5 bg-slate-900/60 px-2 py-0.5 rounded-md border border-white/5">
          <span className="input-label !text-[10px] !text-slate-400 !m-0">Speed</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              max="60"
              value={activeAnimation?.fps || 10}
              onChange={(e) => {
                const val = Math.max(1, Math.min(60, parseInt(e.target.value) || 10));
                onUpdateFps(val);
              }}
              className="input-field h-6 w-11 text-center text-xs font-bold text-amber-400 !py-0 !px-1 shadow-inner"
            />
            <span className="text-[10px] text-slate-400 font-mono font-medium">FPS</span>
          </div>
        </div>

        {/* Loop Toggle Button */}
        <button
          onClick={() => onUpdateLoop(!isLooping)}
          className={`h-7 px-2 rounded-md border text-xs flex items-center gap-1.5 transition-all font-medium ${
            isLooping
              ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 shadow-sm'
              : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
          }`}
          title={isLooping ? 'Looping enabled (Click to disable)' : 'Looping disabled (Click to enable)'}
        >
          <Repeat size={12} className={isLooping ? 'text-blue-400' : 'text-slate-500'} />
          <span className="text-[11px]">Loop</span>
        </button>
      </div>

      {/* Right: Frame Management Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Apply Selected: Replaces animation frames with selected frames */}
        <button
          onClick={onApplySelectedFrames || onAddSelectedFrame}
          disabled={!activeAnimation || selectedCount === 0}
          className="btn bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-emerald-500/20 shadow h-7 px-2 text-xs rounded-md flex items-center gap-1 font-semibold disabled:opacity-30 disabled:pointer-events-none transition-all"
          title={`Replace animation frames with currently selected ${selectedCount} frame(s)`}
        >
          <Check size={12} className="text-white" />
          <span>Apply Selected{selectedCount > 0 ? ` (${selectedCount})` : ''}</span>
        </button>

        {/* Add Selected: Appends selected frames to animation */}
        <button
          onClick={onAddSelectedFrames || onAddSelectedFrame}
          disabled={!activeAnimation || selectedCount === 0}
          className="btn btn-primary h-7 px-2 text-xs rounded-md shadow flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none"
          title={`Append currently selected ${selectedCount} frame(s) to this animation`}
        >
          <Plus size={12} />
          <span>Add{selectedCount > 0 ? ` (${selectedCount})` : ''}</span>
        </button>

        {/* Add All Frames of Active Sheet */}
        {sheetFramesCount > 0 && (
          <button
            onClick={onAddSheetFrames}
            disabled={!activeAnimation}
            className="btn btn-secondary h-7 px-2 text-xs rounded-md flex items-center gap-1 text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:text-white"
            title={`Append all ${sheetFramesCount} frames from current sheet "${activeSheetName}" to this animation`}
          >
            <Layers size={11} className="text-blue-400" />
            <span>Sheet ({sheetFramesCount})</span>
          </button>
        )}

        {/* Add All Sliced Frames from Project */}
        <button
          onClick={onAddAllFrames}
          disabled={!activeAnimation || !hasSlicedFrames}
          className="btn btn-secondary h-7 px-2 text-xs rounded-md flex items-center gap-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none"
          title="Append all sliced frames across all sheets to this animation"
        >
          <Sparkles size={11} className="text-amber-400" />
          <span>All</span>
        </button>

        {/* Subtle Divider */}
        <div className="h-4 w-px bg-white/10 mx-0.5" />

        {/* Segmented Action Group: Move, Remove, Clear */}
        <div className="flex items-center rounded-md border border-white/10 bg-slate-900/90 p-0.5 shadow-sm">
          <button
            onClick={onReorderLeft}
            disabled={!canReorderLeft}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors"
            title="Move selected frame earlier in sequence"
          >
            <ChevronLeft size={13} />
          </button>

          <button
            onClick={onReorderRight}
            disabled={!canReorderRight}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors"
            title="Move selected frame later in sequence"
          >
            <ChevronRight size={13} />
          </button>

          <div className="w-px h-3 bg-white/10 mx-0.5" />

          <button
            onClick={onRemoveSelectedFrame}
            disabled={!canRemove}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 disabled:opacity-20 disabled:pointer-events-none transition-colors"
            title="Remove selected frame from this animation"
          >
            <X size={13} />
          </button>

          <button
            onClick={onClearAllFrames}
            disabled={!canClear}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 disabled:opacity-20 disabled:pointer-events-none transition-colors"
            title="Clear all frames from this animation"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
