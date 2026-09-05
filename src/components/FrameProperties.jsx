import React, { useState, useMemo } from 'react';
import {
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Move,
  Target,
  Hash,
  Check,
  Plus,
  Layers,
  List,
  Sliders,
  CheckSquare,
  Square
} from 'lucide-react';

export function FrameProperties({
  frames = [],
  selectedFrameId,
  selectedFrameIds = [],
  activeAnimation,
  onSelectFrame,
  onSelectAllFrames,
  onDeselectAllFrames,
  onApplySelectedToAnimation,
  onAddSelectedToAnimation,
  onUpdateFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onMoveFrameOrder,
  imageDimensions,
  sheetMap,
  activeSheetId
}) {
  const [activeTab, setActiveTab] = useState('inspector'); // 'inspector' | 'list'

  const selectedFrame = useMemo(() => {
    return frames.find((f) => f.id === selectedFrameId) || null;
  }, [frames, selectedFrameId]);

  const selectedIndex = useMemo(() => {
    return frames.findIndex((f) => f.id === selectedFrameId);
  }, [frames, selectedFrameId]);

  // Current sheet frames for filtering
  const visibleFrames = useMemo(() => {
    return activeSheetId ? frames.filter((f) => f.sheetId === activeSheetId) : frames;
  }, [frames, activeSheetId]);

  const selectedCount = selectedFrameIds.length > 0
    ? selectedFrameIds.length
    : (selectedFrameId ? 1 : 0);

  // If no frame is selected, automatically fall back to Frame List view
  const currentViewTab = selectedFrame ? activeTab : 'list';

  return (
    <div className="glass-panel p-3 flex flex-col h-full overflow-hidden select-none">
      {/* Header Bar with Tabs */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2 flex-shrink-0">
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => setActiveTab('inspector')}
            disabled={!selectedFrame}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded font-bold transition-all ${
              currentViewTab === 'inspector'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            } disabled:opacity-30 disabled:pointer-events-none`}
            title={selectedFrame ? 'Edit selected frame properties' : 'Select a frame to inspect'}
          >
            <Sliders size={12} />
            <span>Inspector</span>
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded font-bold transition-all ${
              currentViewTab === 'list'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="View and select frames list"
          >
            <List size={12} />
            <span>Frames ({visibleFrames.length})</span>
          </button>
        </div>

        {selectedCount > 0 && (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            {selectedCount} selected
          </span>
        )}
      </div>

      {/* Target Animation Quick-Assign Bar (Always visible when frames are selected & animation active) */}
      {activeAnimation && selectedCount > 0 && (
        <div className="mb-2 p-2 rounded-lg bg-slate-950/90 border border-blue-500/30 flex flex-col gap-1.5 shadow flex-shrink-0">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Assign to Clip:</span>
            <span className="text-blue-300 font-bold font-mono truncate max-w-[140px]">
              "{activeAnimation.name}"
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onApplySelectedToAnimation?.(activeAnimation.id)}
              className="btn bg-emerald-600/90 hover:bg-emerald-500 text-white text-[11px] py-1 px-2 rounded-md font-semibold flex items-center justify-center gap-1 shadow-sm transition-all"
              title={`Replace all frames in "${activeAnimation.name}" with selected ${selectedCount} frame(s)`}
            >
              <Check size={12} />
              <span>Apply Selected ({selectedCount})</span>
            </button>
            <button
              onClick={() => onAddSelectedToAnimation?.(activeAnimation.id)}
              className="btn btn-primary text-[11px] py-1 px-2 rounded-md font-semibold flex items-center justify-center gap-1 shadow-sm"
              title={`Append selected ${selectedCount} frame(s) to "${activeAnimation.name}"`}
            >
              <Plus size={12} />
              <span>+ Add ({selectedCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: FRAME LIST VIEW (Multi-selection enabled) */}
      {currentViewTab === 'list' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* List Selection Header Controls */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/5 flex-shrink-0 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={onSelectAllFrames}
                className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10 transition-colors"
                title="Select all frames in active sheet (Ctrl+A)"
              >
                Select All
              </button>
              {selectedCount > 0 && (
                <button
                  onClick={onDeselectAllFrames}
                  className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-900/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 transition-colors"
                  title="Clear frame selection (Esc)"
                >
                  Clear
                </button>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Ctrl/Shift+Click for multi
            </span>
          </div>

          {/* Sliced Frames List */}
          {visibleFrames.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <p className="text-xs font-medium">No frames sliced yet.</p>
              <p className="text-[11px] mt-1 text-slate-600">
                Drag on the canvas or use Grid Slice to auto-slice.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
              {visibleFrames.map((frame, idx) => {
                const isSelected = frame.id === selectedFrameId;
                const isInMulti = selectedFrameIds.includes(frame.id);

                return (
                  <div
                    key={frame.id}
                    onClick={(e) => {
                      onSelectFrame(frame.id, {
                        isMulti: e.ctrlKey || e.metaKey,
                        isRange: e.shiftKey
                      });
                    }}
                    onDoubleClick={() => {
                      onSelectFrame(frame.id);
                      setActiveTab('inspector');
                    }}
                    className={`p-2 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-blue-600/25 border-blue-500/60 shadow-sm shadow-blue-500/20'
                        : isInMulti
                        ? 'bg-cyan-500/20 border-cyan-500/50'
                        : 'bg-slate-900/60 hover:bg-slate-800/80 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Selection Checkbox indicator */}
                      <span className="text-slate-400 hover:text-white flex-shrink-0">
                        {isInMulti || isSelected ? (
                          <CheckSquare size={13} className="text-blue-400" />
                        ) : (
                          <Square size={13} className="text-slate-600" />
                        )}
                      </span>

                      {/* Index Circle */}
                      <span
                        className={`w-5 h-5 rounded-full text-[11px] font-mono font-bold flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'bg-blue-500 text-white'
                            : isInMulti
                            ? 'bg-cyan-500 text-white'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {idx + 1}
                      </span>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {frame.name || `frame_${idx + 1}`}
                          </span>
                          {frame.sheetId && sheetMap?.get(frame.sheetId) && (
                            <span className="text-[8px] font-mono px-1 py-0 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 truncate max-w-[45px]">
                              {sheetMap.get(frame.sheetId).name}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {frame.w}×{frame.h} px @ ({frame.x}, {frame.y})
                        </span>
                      </div>
                    </div>

                    {/* Quick Inline Add to Animation */}
                    {activeAnimation && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFrame(frame.id);
                          onAddSelectedToAnimation?.(activeAnimation.id);
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex-shrink-0"
                        title={`Add this frame to "${activeAnimation.name}"`}
                      >
                        <Plus size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INSPECTOR (Single Frame Editor) */}
      {currentViewTab === 'inspector' && selectedFrame && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Header Actions for selected frame */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-mono font-bold flex items-center justify-center shadow flex-shrink-0">
                {selectedIndex + 1}
              </span>
              <span className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
                {selectedFrame.name || `frame_${selectedIndex + 1}`}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onDuplicateFrame(selectedFrame.id)}
                className="btn btn-secondary p-1.5 text-xs text-blue-400"
                title="Duplicate adjacent right (Ctrl+D)"
              >
                <Copy size={13} />
              </button>
              <button
                onClick={() => onDeleteFrame(selectedFrame.id)}
                className="btn btn-danger p-1.5 text-xs"
                title="Delete frame (Delete)"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
            {/* Source Sheet Badge */}
            {sheetMap && selectedFrame.sheetId && sheetMap.get(selectedFrame.sheetId) && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-white/5 text-xs font-mono">
                <span className="text-slate-400">Source Sheet:</span>
                <span className="text-blue-300 font-bold">
                  {sheetMap.get(selectedFrame.sheetId).name}
                </span>
              </div>
            )}

            {/* Frame Name */}
            <div className="input-group">
              <label className="input-label">Frame Name (ID)</label>
              <input
                type="text"
                className="input-field"
                value={selectedFrame.name || `frame_${selectedIndex + 1}`}
                onChange={(e) => onUpdateFrame(selectedFrame.id, { name: e.target.value })}
              />
            </div>

            {/* Position X, Y */}
            <div className="grid grid-cols-2 gap-2">
              <div className="input-group">
                <label className="input-label">Position X (px)</label>
                <input
                  type="number"
                  className="input-field"
                  value={selectedFrame.x}
                  min={0}
                  max={imageDimensions?.width || 2048}
                  onChange={(e) => onUpdateFrame(selectedFrame.id, { x: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Position Y (px)</label>
                <input
                  type="number"
                  className="input-field"
                  value={selectedFrame.y}
                  min={0}
                  max={imageDimensions?.height || 2048}
                  onChange={(e) => onUpdateFrame(selectedFrame.id, { y: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Size Width, Height */}
            <div className="grid grid-cols-2 gap-2">
              <div className="input-group">
                <label className="input-label">Width (px)</label>
                <input
                  type="number"
                  className="input-field"
                  value={selectedFrame.w}
                  min={1}
                  max={imageDimensions?.width || 2048}
                  onChange={(e) => onUpdateFrame(selectedFrame.id, { w: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Height (px)</label>
                <input
                  type="number"
                  className="input-field"
                  value={selectedFrame.h}
                  min={1}
                  max={imageDimensions?.height || 2048}
                  onChange={(e) => onUpdateFrame(selectedFrame.id, { h: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>
            </div>

            {/* Pivot Anchor Presets */}
            <div className="pt-1 border-t border-white/5">
              <label className="input-label flex items-center justify-between mb-2">
                <span className="flex items-center gap-1">
                  <Target size={12} className="text-amber-400" />
                  <span>Pivot Anchor</span>
                </span>
                <span className="font-mono text-[10px] text-amber-400 font-bold">
                  {(selectedFrame.pivotX ?? 0.5).toFixed(2)}, {(selectedFrame.pivotY ?? 0.5).toFixed(2)}
                </span>
              </label>

              <div className="grid grid-cols-2 gap-1.5 mb-2">
                <button
                  onClick={() => onUpdateFrame(selectedFrame.id, { pivotX: 0.5, pivotY: 0.5 })}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    (selectedFrame.pivotX ?? 0.5) === 0.5 && (selectedFrame.pivotY ?? 0.5) === 0.5
                      ? 'bg-amber-500/25 border-amber-500/60 text-amber-300 font-bold'
                      : 'bg-slate-900/90 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  Center (0.5, 0.5)
                </button>
                <button
                  onClick={() => onUpdateFrame(selectedFrame.id, { pivotX: 0.5, pivotY: 1.0 })}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    (selectedFrame.pivotX ?? 0.5) === 0.5 && (selectedFrame.pivotY ?? 0.5) === 1.0
                      ? 'bg-amber-500/25 border-amber-500/60 text-amber-300 font-bold'
                      : 'bg-slate-900/90 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  Bottom-Center
                </button>
                <button
                  onClick={() => onUpdateFrame(selectedFrame.id, { pivotX: 0.5, pivotY: 0.0 })}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    (selectedFrame.pivotX ?? 0.5) === 0.5 && (selectedFrame.pivotY ?? 0.5) === 0.0
                      ? 'bg-amber-500/25 border-amber-500/60 text-amber-300 font-bold'
                      : 'bg-slate-900/90 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  Top-Center
                </button>
                <button
                  onClick={() => onUpdateFrame(selectedFrame.id, { pivotX: 0.0, pivotY: 0.0 })}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    (selectedFrame.pivotX ?? 0.5) === 0.0 && (selectedFrame.pivotY ?? 0.5) === 0.0
                      ? 'bg-amber-500/25 border-amber-500/60 text-amber-300 font-bold'
                      : 'bg-slate-900/90 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  Top-Left
                </button>
              </div>

              {/* Fine tuning Pivot */}
              <div className="grid grid-cols-2 gap-2">
                <div className="input-group mb-0">
                  <label className="text-[10px] text-slate-400 font-mono mb-1">Pivot X (0-1)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    className="input-field text-xs py-1"
                    value={selectedFrame.pivotX ?? 0.5}
                    onChange={(e) => onUpdateFrame(selectedFrame.id, { pivotX: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="input-group mb-0">
                  <label className="text-[10px] text-slate-400 font-mono mb-1">Pivot Y (0-1)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    className="input-field text-xs py-1"
                    value={selectedFrame.pivotY ?? 0.5}
                    onChange={(e) => onUpdateFrame(selectedFrame.id, { pivotY: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            {/* Actions & Reordering */}
            <div className="pt-2.5 border-t border-white/10 space-y-2">
              <button
                onClick={() => onDuplicateFrame(selectedFrame.id)}
                className="btn btn-primary w-full text-xs justify-center shadow-lg shadow-blue-500/20"
              >
                <Copy size={13} />
                <span>Duplicate Right</span>
                <kbd className="ml-1">Ctrl+D</kbd>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onMoveFrameOrder(selectedFrame.id, -1)}
                  disabled={selectedIndex === 0}
                  className="btn btn-secondary text-xs justify-center disabled:opacity-40"
                >
                  <ArrowUp size={13} /> <span>Move Up</span>
                </button>
                <button
                  onClick={() => onMoveFrameOrder(selectedFrame.id, 1)}
                  disabled={selectedIndex === frames.length - 1}
                  className="btn btn-secondary text-xs justify-center disabled:opacity-40"
                >
                  <ArrowDown size={13} /> <span>Move Down</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
