import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Grid,
  X,
  Check,
  Maximize2,
  Sparkles,
  Layers,
  Sliders,
  Eye,
  AlertCircle
} from 'lucide-react';
import { sliceImageIntoFrames, isCanvasNonEmpty } from '../../utils/sheetSlicer';

export function ImportSheetModal({
  isOpen,
  onClose,
  fileData, // { file, img, fileName, naturalW, naturalH, detected }
  currentStudioResolution = { w: 96, h: 96 },
  onConfirmImport
}) {
  if (!isOpen || !fileData) return null;

  const { img, fileName, naturalW, naturalH, detected } = fileData;

  // Slicing Mode: 'count' (cols & rows) | 'size' (cellW & cellH)
  const [mode, setMode] = useState('count');

  // Grid parameters
  const [cols, setCols] = useState(detected?.cols || 1);
  const [rows, setRows] = useState(detected?.rows || 1);
  const [cellW, setCellW] = useState(detected?.cellW || naturalW);
  const [cellH, setCellH] = useState(detected?.cellH || naturalH);

  // Offset & spacing
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  // Skip empty transparent frames
  const [skipEmpty, setSkipEmpty] = useState(true);

  // Target Resolution option: 'native' | 'studio'
  const [resolutionMode, setResolutionMode] = useState('native');

  // Asset name
  const [assetName, setAssetName] = useState(fileName || 'Sprite_Asset');

  const canvasRef = useRef(null);

  // When detected changes or modal opens, initialize parameters
  useEffect(() => {
    if (detected) {
      setCols(detected.cols || 1);
      setRows(detected.rows || 1);
      setCellW(detected.cellW || naturalW);
      setCellH(detected.cellH || naturalH);
      setAssetName(fileName || 'Sprite_Asset');
    }
  }, [detected, fileName, naturalW, naturalH]);

  // Sync mode changes
  const handleColsChange = (newCols) => {
    const c = Math.max(1, Math.min(64, newCols));
    setCols(c);
    setCellW(Math.max(1, Math.floor((naturalW - offsetX * 2) / c)));
  };

  const handleRowsChange = (newRows) => {
    const r = Math.max(1, Math.min(64, newRows));
    setRows(r);
    setCellH(Math.max(1, Math.floor((naturalH - offsetY * 2) / r)));
  };

  const handleCellWChange = (newW) => {
    const w = Math.max(1, Math.min(naturalW, newW));
    setCellW(w);
    setCols(Math.max(1, Math.floor((naturalW - offsetX) / w)));
  };

  const handleCellHChange = (newH) => {
    const h = Math.max(1, Math.min(naturalH, newH));
    setCellH(h);
    setRows(Math.max(1, Math.floor((naturalH - offsetY) / h)));
  };

  // Select a preset candidate from auto-detector
  const handleSelectCandidate = (cand) => {
    setCols(cand.cols);
    setRows(cand.rows);
    setCellW(cand.cellW);
    setCellH(cand.cellH);
  };

  // Calculate total slices
  const totalGridCells = cols * rows;

  // Render live preview on canvas with neon grid lines and frame labels
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    canvas.width = naturalW;
    canvas.height = naturalH;
    ctx.imageSmoothingEnabled = false;

    // 1. Draw source image
    ctx.clearRect(0, 0, naturalW, naturalH);
    ctx.drawImage(img, 0, 0);

    // 2. Draw grid lines and labels
    const curW = mode === 'count' ? Math.floor(naturalW / cols) : cellW;
    const curH = mode === 'count' ? Math.floor(naturalH / rows) : cellH;

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * curW;
        const y = offsetY + r * curH;

        if (x + curW <= naturalW && y + curH <= naturalH) {
          idx++;

          // Grid slice border
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.75)'; // blue-500
          ctx.lineWidth = Math.max(1, Math.floor(naturalW / 600));
          ctx.strokeRect(x + 0.5, y + 0.5, curW - 1, curH - 1);

          // Subtle corner accents
          ctx.fillStyle = '#38bdf8';
          const corner = Math.max(2, Math.min(6, curW * 0.05));
          ctx.fillRect(x, y, corner, 2);
          ctx.fillRect(x, y, 2, corner);

          // Cell index tag background & text
          const fontSize = Math.max(9, Math.min(18, Math.floor(curH * 0.12)));
          ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
          const text = `#${idx}`;
          const textMetrics = ctx.measureText(text);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
          ctx.fillRect(x + 2, y + 2, textMetrics.width + 6, fontSize + 4);

          ctx.fillStyle = '#38bdf8';
          ctx.fillText(text, x + 5, y + fontSize + 2);
        }
      }
    }
  }, [img, naturalW, naturalH, cols, rows, cellW, cellH, offsetX, offsetY, mode]);

  // Handle final import
  const handleExecuteImport = () => {
    const curCellW = mode === 'count' ? Math.floor(naturalW / cols) : cellW;
    const curCellH = mode === 'count' ? Math.floor(naturalH / rows) : cellH;

    const targetW = resolutionMode === 'native' ? curCellW : currentStudioResolution.w;
    const targetH = resolutionMode === 'native' ? curCellH : currentStudioResolution.h;

    const slicedFrames = sliceImageIntoFrames(img, {
      cols,
      rows,
      cellW: curCellW,
      cellH: curCellH,
      offsetX,
      offsetY,
      skipEmpty,
      targetW,
      targetH
    });

    onConfirmImport({
      frames: slicedFrames,
      resolutionW: targetW,
      resolutionH: targetH,
      assetName: assetName.trim() || fileName
    });

    onClose();
  };

  // Support Enter key for quick import
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExecuteImport();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="modal-card w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0b1120] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* 1. Header */}
        <div className="modal-header h-12 px-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Grid size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Import & Slice Sprite Sheet
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300">
                  {naturalW} × {naturalH} px
                </span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 2. Body: Two columns (Left: Canvas Preview, Right: Settings) */}
        <div className="modal-body flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 p-4 overflow-y-auto">
          {/* Left Column: Live Slice Viewport (7 cols) */}
          <div className="md:col-span-7 flex flex-col gap-2 min-h-[280px]">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                <Eye size={13} className="text-blue-400" />
                Live Slice Preview
              </span>
              <span className="text-[11px] font-mono text-cyan-400">
                {cols} cols × {rows} rows • {totalGridCells} cells
              </span>
            </div>

            {/* Checkerboard Viewport */}
            <div className="flex-1 bg-slate-950/80 border border-white/10 rounded-lg p-2 flex items-center justify-center overflow-auto max-h-[380px] relative">
              <div
                className="relative rounded shadow-inner"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #182234 25%, transparent 25%),
                    linear-gradient(-45deg, #182234 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #182234 75%),
                    linear-gradient(-45deg, transparent 75%, #182234 75%)
                  `,
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  backgroundColor: '#0c1322'
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[340px] block object-contain shadow-lg"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>

              {/* Floating watermark info */}
              <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-slate-900/90 border border-white/15 text-[10px] font-mono text-slate-300 shadow">
                Cell: {mode === 'count' ? Math.floor(naturalW / cols) : cellW} × {mode === 'count' ? Math.floor(naturalH / rows) : cellH} px
              </div>
            </div>

            {/* Candidates Quick Chips */}
            {detected?.candidates && detected.candidates.length > 0 && (
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-400" />
                  Auto-Detected Grid Candidates:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {detected.candidates.slice(0, 4).map((cand, i) => {
                    const isSelected = cols === cand.cols && rows === cand.rows;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectCandidate(cand)}
                        className={`text-[11px] font-mono px-2 py-1 rounded border transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-400 shadow-sm shadow-blue-500/30 font-bold'
                            : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {cand.cols}×{cand.rows} ({cand.cellW}×{cand.cellH})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Slicing Controls (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-3.5 bg-slate-900/40 p-3.5 rounded-lg border border-white/5">
            {/* Mode Switcher */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Slicing Mode
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-lg border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setMode('count')}
                  className={`h-7 rounded font-semibold transition-all ${
                    mode === 'count'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  By Cols & Rows
                </button>
                <button
                  type="button"
                  onClick={() => setMode('size')}
                  className={`h-7 rounded font-semibold transition-all ${
                    mode === 'size'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  By Cell Size (px)
                </button>
              </div>
            </div>

            {/* Inputs based on Mode */}
            {mode === 'count' ? (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Columns
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="64"
                    value={cols}
                    onChange={(e) => handleColsChange(parseInt(e.target.value) || 1)}
                    className="w-full h-8 px-2.5 bg-slate-950 border border-white/10 rounded font-mono text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Rows
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="64"
                    value={rows}
                    onChange={(e) => handleRowsChange(parseInt(e.target.value) || 1)}
                    className="w-full h-8 px-2.5 bg-slate-950 border border-white/10 rounded font-mono text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Cell Width W (px)
                  </label>
                  <input
                    type="number"
                    min="4"
                    max={naturalW}
                    value={cellW}
                    onChange={(e) => handleCellWChange(parseInt(e.target.value) || 16)}
                    className="w-full h-8 px-2.5 bg-slate-950 border border-white/10 rounded font-mono text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Cell Height H (px)
                  </label>
                  <input
                    type="number"
                    min="4"
                    max={naturalH}
                    value={cellH}
                    onChange={(e) => handleCellHChange(parseInt(e.target.value) || 16)}
                    className="w-full h-8 px-2.5 bg-slate-950 border border-white/10 rounded font-mono text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Target Resolution Options */}
            <div className="flex flex-col gap-1.5 border-t border-white/10 pt-2.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Target Studio Resolution</span>
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => setResolutionMode('native')}
                  className={`px-2.5 py-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                    resolutionMode === 'native'
                      ? 'bg-blue-600/20 border-blue-500/50 text-slate-100'
                      : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200">
                      Keep Native Resolution
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Canvas adjusts to frame size ({mode === 'count' ? Math.floor(naturalW / cols) : cellW}×{mode === 'count' ? Math.floor(naturalH / rows) : cellH} px)
                    </span>
                  </div>
                  {resolutionMode === 'native' && <Check size={14} className="text-blue-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => setResolutionMode('studio')}
                  className={`px-2.5 py-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                    resolutionMode === 'studio'
                      ? 'bg-blue-600/20 border-blue-500/50 text-slate-100'
                      : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200">
                      Fit to Current Studio Canvas
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Resample cleanly into {currentStudioResolution.w}×{currentStudioResolution.h} px
                    </span>
                  </div>
                  {resolutionMode === 'studio' && <Check size={14} className="text-blue-400" />}
                </button>
              </div>
            </div>

            {/* Slicing Checkboxes */}
            <div className="flex flex-col gap-2 border-t border-white/10 pt-2.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={skipEmpty}
                  onChange={(e) => setSkipEmpty(e.target.checked)}
                  className="rounded border-white/20 text-blue-600 focus:ring-0 bg-slate-950"
                />
                <span>Skip empty transparent cells</span>
              </label>
            </div>

            {/* Asset Name */}
            <div className="border-t border-white/10 pt-2.5">
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Asset Name
              </label>
              <input
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="Asset name..."
                className="w-full h-8 px-2.5 bg-slate-950 border border-white/10 rounded text-xs text-slate-100 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* 3. Footer */}
        <div className="modal-footer h-14 px-4 border-t border-white/10 flex items-center justify-between bg-slate-900/80 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Ready:</span>
            <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
              {totalGridCells} potential frames
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              (Press Enter to import)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm px-3"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              className="btn btn-primary btn-sm px-4 font-bold shadow-lg shadow-blue-500/25 flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>Import All Frames</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
