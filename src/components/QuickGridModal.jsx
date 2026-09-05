import React, { useState } from 'react';
import { Grid, X, Check } from 'lucide-react';

export function QuickGridModal({
  isOpen,
  onClose,
  imageDimensions,
  onApplyGrid
}) {
  const [mode, setMode] = useState('count'); // 'count' (cols/rows) or 'size' (cell w/h)

  const [cols, setCols] = useState(4);
  const [rows, setRows] = useState(1);

  const [cellW, setCellW] = useState(32);
  const [cellH, setCellH] = useState(32);

  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [spacingX, setSpacingX] = useState(0);
  const [spacingY, setSpacingY] = useState(0);

  const [clearExisting, setClearExisting] = useState(true);

  if (!isOpen) return null;

  const handleApply = () => {
    const newFrames = [];
    const imgW = imageDimensions.width;
    const imgH = imageDimensions.height;

    let targetCols = cols;
    let targetRows = rows;
    let frameW = cellW;
    let frameH = cellH;

    if (mode === 'count') {
      const availW = imgW - offsetX * 2 - (cols - 1) * spacingX;
      const availH = imgH - offsetY * 2 - (rows - 1) * spacingY;
      frameW = Math.max(1, Math.floor(availW / cols));
      frameH = Math.max(1, Math.floor(availH / rows));
    } else {
      targetCols = Math.floor((imgW - offsetX) / (cellW + spacingX));
      targetRows = Math.floor((imgH - offsetY) / (cellH + spacingY));
    }

    let count = 0;
    for (let r = 0; r < targetRows; r++) {
      for (let c = 0; c < targetCols; c++) {
        const x = offsetX + c * (frameW + spacingX);
        const y = offsetY + r * (frameH + spacingY);

        if (x + frameW <= imgW && y + frameH <= imgH) {
          count++;
          newFrames.push({
            id: `frame_grid_${Date.now()}_${count}`,
            name: `frame_${count}`,
            x,
            y,
            w: frameW,
            h: frameH,
            pivotX: 0.5,
            pivotY: 0.5
          });
        }
      }
    }

    onApplyGrid(newFrames, clearExisting);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Grid size={20} className="text-blue-400" />
            <h3 className="text-base font-bold text-slate-100">Auto Grid Slice</h3>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body space-y-4">
          {/* Mode Switcher */}
          <div className="flex bg-slate-900 p-1 rounded-lg border border-white/10 text-xs">
            <button
              onClick={() => setMode('count')}
              className={`flex-1 h-7 rounded-md font-semibold flex items-center justify-center transition-colors ${
                mode === 'count' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              By Columns & Rows
            </button>
            <button
              onClick={() => setMode('size')}
              className={`flex-1 h-7 rounded-md font-semibold flex items-center justify-center transition-colors ${
                mode === 'size' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              By Cell Size (W × H)
            </button>
          </div>

          {/* Mode Specific Inputs */}
          {mode === 'count' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="input-group">
                <label className="input-label">Columns</label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={cols}
                  onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Rows</label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={rows}
                  onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="input-group">
                <label className="input-label">Cell Width W (px)</label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={cellW}
                  onChange={(e) => setCellW(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Cell Height H (px)</label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={cellH}
                  onChange={(e) => setCellH(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </div>
          )}

          {/* Offsets & Spacing */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
            <div className="input-group">
              <label className="input-label">Margin X (px)</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={offsetX}
                onChange={(e) => setOffsetX(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Margin Y (px)</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={offsetY}
                onChange={(e) => setOffsetY(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="input-group">
              <label className="input-label">Spacing X (px)</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={spacingX}
                onChange={(e) => setSpacingX(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Spacing Y (px)</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={spacingY}
                onChange={(e) => setSpacingY(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
          </div>

          {/* Clear Existing option */}
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={clearExisting}
              onChange={(e) => setClearExisting(e.target.checked)}
              className="accent-blue-500 rounded"
            />
            Clear existing frames before slicing
          </label>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary text-xs">
            Cancel
          </button>
          <button onClick={handleApply} className="btn btn-primary text-xs shadow-lg shadow-blue-500/20">
            <Check size={14} /> Apply Grid Slice
          </button>
        </div>
      </div>
    </div>
  );
}
