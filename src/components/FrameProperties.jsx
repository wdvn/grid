import React from 'react';
import { Copy, Trash2, ArrowUp, ArrowDown, Move, Target, Hash, Check } from 'lucide-react';

export function FrameProperties({
  frames,
  selectedFrameId,
  onSelectFrame,
  onUpdateFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onMoveFrameOrder,
  imageDimensions,
  sheetMap
}) {
  const selectedFrame = frames.find(f => f.id === selectedFrameId);
  const selectedIndex = frames.findIndex(f => f.id === selectedFrameId);

  if (!selectedFrame) {
    return (
      <div className="glass-panel p-3.5 flex flex-col h-full overflow-hidden select-none">
        <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Hash size={14} className="text-blue-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Frame List ({frames.length})
            </span>
          </div>
        </div>

        {frames.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
            <p className="text-xs font-medium">No frames sliced yet.</p>
            <p className="text-[11px] mt-1 text-slate-600">
              Drag on the canvas or use Grid Slice to auto-slice.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
            {frames.map((frame, idx) => (
              <div
                key={frame.id}
                onClick={() => onSelectFrame(frame.id)}
                className="p-2 rounded-lg border border-white/5 bg-slate-900/60 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[11px] font-mono font-bold flex items-center justify-center flex-shrink-0">
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
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const currentPivotX = selectedFrame.pivotX ?? 0.5;
  const currentPivotY = selectedFrame.pivotY ?? 0.5;

  return (
    <div className="glass-panel p-3.5 flex flex-col h-full overflow-hidden select-none">
      {/* Header with Frame Index Badge */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-2.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-mono font-bold flex items-center justify-center shadow flex-shrink-0">
            {selectedIndex + 1}
          </span>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Edit Frame
          </span>
        </div>

        {/* Quick Duplicate & Delete Buttons */}
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
              max={imageDimensions.width}
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
              max={imageDimensions.height}
              onChange={(e) => onUpdateFrame(selectedFrame.id, { y: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        {/* Size W, H */}
        <div className="grid grid-cols-2 gap-2">
          <div className="input-group">
            <label className="input-label">Width W (px)</label>
            <input
              type="number"
              className="input-field"
              value={selectedFrame.w}
              min={1}
              onChange={(e) => onUpdateFrame(selectedFrame.id, { w: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Height H (px)</label>
            <input
              type="number"
              className="input-field"
              value={selectedFrame.h}
              min={1}
              onChange={(e) => onUpdateFrame(selectedFrame.id, { h: parseInt(e.target.value) || 1 })}
            />
          </div>
        </div>

        {/* Pivot Point X, Y with Visual 3x3 Anchor Widget */}
        <div className="bg-slate-950/40 p-2.5 rounded-lg border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="input-label flex items-center gap-1.5 mb-0">
              <Target size={13} className="text-amber-400" />
              <span>Pivot Anchor</span>
            </label>
            <span className="text-[11px] text-amber-400 font-mono font-bold">
              ({currentPivotX.toFixed(2)}, {currentPivotY.toFixed(2)})
            </span>
          </div>

          {/* Visual Anchor Pad + Quick Game Presets */}
          <div className="flex items-center gap-2.5">
            {/* 3x3 Visual Interactive Pad */}
            <div className="anchor-pad w-[70px] h-[70px] flex-shrink-0">
              {[0, 0.5, 1].map((rowY) =>
                [0, 0.5, 1].map((colX) => {
                  const isMatch = Math.abs(currentPivotX - colX) < 0.08 && Math.abs(currentPivotY - rowY) < 0.08;
                  const isFeetMatch = colX === 0.5 && rowY === 1 && Math.abs(currentPivotX - 0.5) < 0.08 && Math.abs(currentPivotY - 0.85) < 0.08;
                  const isActive = isMatch || isFeetMatch;

                  return (
                    <button
                      key={`${colX}-${rowY}`}
                      type="button"
                      onClick={() => onUpdateFrame(selectedFrame.id, { pivotX: colX, pivotY: rowY })}
                      className={`anchor-dot ${isActive ? 'active' : ''}`}
                      title={`Pivot: (${colX}, ${rowY})`}
                    />
                  );
                })
              )}
            </div>

            {/* Quick Presets for Game Sprites */}
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              {/* Feet (Ideal for RPG sprites like Fox Run) */}
              <button
                type="button"
                onClick={() => onUpdateFrame(selectedFrame.id, { pivotX: 0.5, pivotY: 0.85 })}
                className={`w-full py-1 px-2 rounded text-[11px] font-medium border flex items-center justify-between transition-all ${
                  Math.abs(currentPivotX - 0.5) < 0.08 && Math.abs(currentPivotY - 0.85) < 0.08
                    ? 'bg-amber-500/25 border-amber-500/60 text-amber-300 font-bold shadow-sm'
                    : 'bg-slate-900/90 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Ground contact point for character feet (0.50, 0.85)"
              >
                <span>Character Feet</span>
                <span className="font-mono text-[9px] text-amber-400 font-semibold">(0.5, 0.85)</span>
              </button>

              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => onUpdateFrame(selectedFrame.id, { pivotX: 0.5, pivotY: 0.5 })}
                  className={`py-1 px-1.5 rounded text-[10px] font-medium border text-center transition-all ${
                    Math.abs(currentPivotX - 0.5) < 0.08 && Math.abs(currentPivotY - 0.5) < 0.08
                      ? 'bg-amber-500/25 border-amber-500/60 text-amber-300 font-bold'
                      : 'bg-slate-900/90 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Center point (0.50, 0.50)"
                >
                  Center
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateFrame(selectedFrame.id, { pivotX: 0.0, pivotY: 0.0 })}
                  className={`py-1 px-1.5 rounded text-[10px] font-medium border text-center transition-all ${
                    Math.abs(currentPivotX) < 0.08 && Math.abs(currentPivotY) < 0.08
                      ? 'bg-amber-500/25 border-amber-500/60 text-amber-300 font-bold'
                      : 'bg-slate-900/90 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Top-Left corner (0.00, 0.00)"
                >
                  Top-Left
                </button>
              </div>
            </div>
          </div>

          {/* Numeric Pivot X, Y Fine Tuning */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="input-group mb-0">
              <label className="text-[10px] text-slate-400 font-mono mb-1">Pivot X (0-1)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                className="input-field text-xs py-1"
                value={currentPivotX}
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
                value={currentPivotY}
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
  );
}
