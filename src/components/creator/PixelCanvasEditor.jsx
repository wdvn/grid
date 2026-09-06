import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  Hand,
  RotateCcw,
  RotateCw,
  Plus,
  Trash2,
  Copy,
  Play,
  Pause,
  Grid,
  FlipHorizontal,
  Focus,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

function CreatorFrameThumb({ canvas }) {
  const thumbRef = useRef(null);

  useEffect(() => {
    if (!thumbRef.current || !canvas) return;
    const tc = thumbRef.current;
    const ctx = tc.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, tc.width, tc.height);
    ctx.drawImage(canvas, 0, 0, tc.width, tc.height);
  }, [canvas]);

  return (
    <canvas
      ref={thumbRef}
      width={28}
      height={28}
      className="w-7 h-7 object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

export function PixelCanvasEditor({
  frameWidth = 96,
  frameHeight = 96,
  activeColor = '#3b82f6',
  onPickColor,
  frames = [],
  activeFrameIndex = 0,
  onSelectFrameIndex,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onUpdateFrameCanvas,
  filterSettings = {}
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Tools: 'pencil' | 'eraser' | 'bucket' | 'eyedropper' | 'hand'
  const [activeTool, setActiveTool] = useState('pencil');
  const [brushSize, setBrushSize] = useState(1); // 1, 2, 3, 4, 6px
  const [isSymmetryActive, setIsSymmetryActive] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  // Viewport Transform: Zoom and Pan
  const [zoom, setZoom] = useState(8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPixelRef = useRef(null);
  const [hoverPixel, setHoverPixel] = useState(null);

  // Undo / Redo history
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Strip live preview playback
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [previewFrameIdx, setPreviewFrameIdx] = useState(0);

  // Current canvas frame
  const currentFrame = frames[activeFrameIndex];

  // Auto-fit zoom whenever frame dimensions change
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const availableW = Math.max(150, rect.width - 60);
      const availableH = Math.max(150, rect.height - 60);
      const idealZoom = Math.floor(Math.min(availableW / frameWidth, availableH / frameHeight));
      const clampedZoom = Math.max(1, Math.min(32, idealZoom || 6));
      setZoom(clampedZoom);
      setPan({ x: 0, y: 0 });
    }
  }, [frameWidth, frameHeight]);

  // Handle Spacebar hold for temporary Pan tool
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        setIsSpaceHeld(true);
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpaceHeld(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Smooth Cursor-Centered Mouse Wheel Zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;

      const zoomFactor = e.deltaY < 0 ? 1.2 : 0.833;

      setZoom((prevZoom) => {
        let nextZoom;
        if (prevZoom >= 4) {
          nextZoom = Math.round(prevZoom * zoomFactor);
        } else {
          nextZoom = Math.round(prevZoom * zoomFactor * 10) / 10;
        }
        nextZoom = Math.max(1, Math.min(64, nextZoom));

        if (nextZoom === prevZoom) return prevZoom;

        // Anchor pan to mouse cursor position
        setPan((prevPan) => {
          const scaleChange = nextZoom / prevZoom;
          return {
            x: Math.round(mouseX - (mouseX - prevPan.x) * scaleChange),
            y: Math.round(mouseY - (mouseY - prevPan.y) * scaleChange)
          };
        });

        return nextZoom;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Convert Canvas Coordinates to Pixel Coordinates
  const getPixelCoord = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / zoom);
    const y = Math.floor((e.clientY - rect.top) / zoom);
    if (x < 0 || x >= frameWidth || y < 0 || y >= frameHeight) return null;
    return { x, y };
  }, [frameWidth, frameHeight, zoom]);

  // Save history snapshot
  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, frameWidth, frameHeight);
    setUndoStack((prev) => [...prev.slice(-25), imgData]);
    setRedoStack([]);
  }, [frameWidth, frameHeight]);

  // Draw a single pixel block at (x, y) with symmetry support
  const drawPixelAt = useCallback((ctx, x, y, color, isErase = false) => {
    if (x < 0 || x >= frameWidth || y < 0 || y >= frameHeight) return;
    if (isErase) {
      ctx.clearRect(x, y, 1, 1);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }

    // Horizontal symmetry mirror
    if (isSymmetryActive) {
      const symX = frameWidth - 1 - x;
      if (isErase) {
        ctx.clearRect(symX, y, 1, 1);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(symX, y, 1, 1);
      }
    }
  }, [frameWidth, frameHeight, isSymmetryActive]);

  // Draw a brush stamp of size `brushSize`
  const drawBrushStamp = useCallback((ctx, cx, cy, color, isErase = false) => {
    const half = Math.floor(brushSize / 2);
    for (let ox = 0; ox < brushSize; ox++) {
      for (let oy = 0; oy < brushSize; oy++) {
        drawPixelAt(ctx, cx - half + ox, cy - half + oy, color, isErase);
      }
    }
  }, [brushSize, drawPixelAt]);

  // Bresenham's Line Algorithm for smooth, unbroken strokes when dragging fast
  const drawBresenhamStroke = useCallback((ctx, x0, y0, x1, y1, color, isErase = false) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let cx = x0;
    let cy = y0;

    while (true) {
      drawBrushStamp(ctx, cx, cy, color, isErase);

      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
  }, [drawBrushStamp]);

  // Helper: Hex string to [r, g, b, a]
  const hexToRgba = (hex) => {
    if (hex.startsWith('#')) {
      const c = hex.slice(1);
      if (c.length === 3) {
        return [
          parseInt(c[0] + c[0], 16),
          parseInt(c[1] + c[1], 16),
          parseInt(c[2] + c[2], 16),
          255
        ];
      }
      if (c.length === 6) {
        return [
          parseInt(c.slice(0, 2), 16),
          parseInt(c.slice(2, 4), 16),
          parseInt(c.slice(4, 6), 16),
          255
        ];
      }
    }
    return [0, 0, 0, 255];
  };

  // Flood fill algorithm
  const floodFill = useCallback((targetX, targetY, fillColor) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, frameWidth, frameHeight);
    const data = imgData.data;

    const startIdx = (targetY * frameWidth + targetX) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    const startA = data[startIdx + 3];

    const [fillR, fillG, fillB, fillA] = hexToRgba(fillColor);

    if (startR === fillR && startG === fillG && startB === fillB && startA === fillA) {
      return;
    }

    saveSnapshot();

    const queue = [[targetX, targetY]];
    const seen = new Uint8Array(frameWidth * frameHeight);
    seen[targetY * frameWidth + targetX] = 1;

    const matchColor = (idx) => {
      return (
        data[idx] === startR &&
        data[idx + 1] === startG &&
        data[idx + 2] === startB &&
        data[idx + 3] === startA
      );
    };

    while (queue.length > 0) {
      const [cx, cy] = queue.pop();
      const idx = (cy * frameWidth + cx) * 4;

      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      data[idx + 3] = fillA;

      const neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1]
      ];

      for (let i = 0; i < neighbors.length; i++) {
        const [nx, ny] = neighbors[i];
        if (nx >= 0 && nx < frameWidth && ny >= 0 && ny < frameHeight) {
          const nIndex = ny * frameWidth + nx;
          if (!seen[nIndex]) {
            seen[nIndex] = 1;
            if (matchColor(nIndex * 4)) {
              queue.push([nx, ny]);
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    onUpdateFrameCanvas?.(activeFrameIndex, canvas);
  }, [frameWidth, frameHeight, saveSnapshot, onUpdateFrameCanvas, activeFrameIndex]);

  // Synchronize active canvas when current frame changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentFrame) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    if (currentFrame.canvas) {
      ctx.clearRect(0, 0, frameWidth, frameHeight);
      ctx.drawImage(currentFrame.canvas, 0, 0);
    }
  }, [currentFrame, frameWidth, frameHeight]);

  // Mouse Handlers
  const handleMouseDown = (e) => {
    // Pan mode active if Hand tool selected, or holding Space, or middle mouse, or right click
    if (activeTool === 'hand' || isSpaceHeld || e.button === 1 || e.button === 2) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return; // Only left click for drawing

    const coord = getPixelCoord(e);
    if (!coord) return;

    saveSnapshot();
    setIsDrawing(true);
    lastPixelRef.current = coord;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (activeTool === 'pencil') {
      drawBrushStamp(ctx, coord.x, coord.y, activeColor, false);
    } else if (activeTool === 'eraser') {
      drawBrushStamp(ctx, coord.x, coord.y, null, true);
    } else if (activeTool === 'bucket') {
      floodFill(coord.x, coord.y, activeColor);
    } else if (activeTool === 'eyedropper') {
      const p = ctx.getImageData(coord.x, coord.y, 1, 1).data;
      if (p[3] > 0) {
        const hex = `#${p[0].toString(16).padStart(2, '0')}${p[1].toString(16).padStart(2, '0')}${p[2].toString(16).padStart(2, '0')}`;
        onPickColor?.(hex);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    const coord = getPixelCoord(e);
    setHoverPixel(coord);

    if (!isDrawing || !coord) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const last = lastPixelRef.current || coord;

    if (activeTool === 'pencil') {
      drawBresenhamStroke(ctx, last.x, last.y, coord.x, coord.y, activeColor, false);
    } else if (activeTool === 'eraser') {
      drawBresenhamStroke(ctx, last.x, last.y, coord.x, coord.y, null, true);
    }

    lastPixelRef.current = coord;
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
      lastPixelRef.current = null;
      const canvas = canvasRef.current;
      onUpdateFrameCanvas?.(activeFrameIndex, canvas);
    }
  };

  const handleMouseLeave = () => {
    setHoverPixel(null);
    if (isDrawing) {
      setIsDrawing(false);
      lastPixelRef.current = null;
      const canvas = canvasRef.current;
      onUpdateFrameCanvas?.(activeFrameIndex, canvas);
    }
  };

  // Undo / Redo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const current = ctx.getImageData(0, 0, frameWidth, frameHeight);
    setRedoStack((prev) => [...prev, current]);

    const prev = undoStack[undoStack.length - 1];
    setUndoStack((old) => old.slice(0, old.length - 1));
    ctx.putImageData(prev, 0, 0);
    onUpdateFrameCanvas?.(activeFrameIndex, canvas);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const current = ctx.getImageData(0, 0, frameWidth, frameHeight);
    setUndoStack((prev) => [...prev, current]);

    const next = redoStack[redoStack.length - 1];
    setRedoStack((old) => old.slice(0, old.length - 1));
    ctx.putImageData(next, 0, 0);
    onUpdateFrameCanvas?.(activeFrameIndex, canvas);
  };

  // Auto-fit zoom handler
  const handleAutoFitZoom = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const availableW = Math.max(150, rect.width - 60);
      const availableH = Math.max(150, rect.height - 60);
      const idealZoom = Math.floor(Math.min(availableW / frameWidth, availableH / frameHeight));
      setZoom(Math.max(1, Math.min(32, idealZoom || 6)));
      setPan({ x: 0, y: 0 });
    }
  };

  // Live Strip Preview Loop
  useEffect(() => {
    if (!isPreviewPlaying || frames.length === 0) return;
    const interval = setInterval(() => {
      setPreviewFrameIdx((prev) => (prev + 1) % frames.length);
    }, 125); // 8 FPS
    return () => clearInterval(interval);
  }, [isPreviewPlaying, frames.length]);

  // Render to Preview Canvas
  useEffect(() => {
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;
    const ctx = previewCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    const f = frames[previewFrameIdx];
    if (f && f.canvas) {
      ctx.drawImage(f.canvas, 0, 0, previewCanvas.width, previewCanvas.height);
    } else if (canvasRef.current) {
      ctx.drawImage(canvasRef.current, 0, 0, previewCanvas.width, previewCanvas.height);
    }
  }, [previewFrameIdx, frames]);

  // Cursor styling based on active tool & spacebar
  const getCursorClass = () => {
    if (isPanning) return 'cursor-grabbing';
    if (isSpaceHeld || activeTool === 'hand') return 'cursor-grab';
    return 'cursor-crosshair';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070b14] overflow-hidden relative select-none">
      {/* 1. Blender-Style Tool Settings Bar (Standard Compact Height 32px) */}
      <div className="h-8 px-2.5 bg-[#0a0f1d] border-b border-white/10 flex items-center justify-between text-slate-300 z-20 flex-shrink-0">
        {/* Left: Active Tool Info & Size Settings */}
        <div className="flex items-center gap-2">
          {/* Active Tool Label */}
          <div className="h-6 px-2 rounded bg-slate-900 border border-white/10 flex items-center gap-1.5 font-bold text-blue-400 text-[11px] whitespace-nowrap flex-shrink-0">
            {activeTool === 'pencil' && <Pencil size={12} />}
            {activeTool === 'eraser' && <Eraser size={12} />}
            {activeTool === 'bucket' && <PaintBucket size={12} />}
            {activeTool === 'eyedropper' && <Pipette size={12} />}
            {activeTool === 'hand' && <Hand size={12} />}
            <span className="capitalize">{activeTool}</span>
          </div>

          {/* Brush Size Selector: Compact 24px buttons */}
          <div className="h-6 flex items-center bg-slate-950 px-1 rounded border border-white/10 flex-shrink-0">
            <span className="text-[10px] text-slate-400 font-mono pr-1">Size:</span>
            {[1, 2, 3, 4, 6].map((sz) => (
              <button
                key={sz}
                onClick={() => setBrushSize(sz)}
                className={`w-5 h-5 flex items-center justify-center text-[10px] font-mono rounded transition-all whitespace-nowrap ${
                  brushSize === sz
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={`Brush size: ${sz}px`}
              >
                {sz}p
              </button>
            ))}
          </div>

          {/* Active Color Swatch */}
          <div className="h-6 flex items-center gap-1 bg-slate-950 px-1.5 rounded border border-white/10 flex-shrink-0">
            <div
              className="w-3.5 h-3.5 rounded-[2px] border border-white/30"
              style={{ backgroundColor: activeColor }}
            />
            <span className="text-[10px] font-mono text-slate-300 uppercase">{activeColor}</span>
          </div>
        </div>

        {/* Right: History Undo/Redo & Viewport Helper */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
            Space: Pan • Wheel: Zoom
          </span>

          {/* Undo / Redo (24px icons) */}
          <div className="h-6 flex items-center bg-slate-950 rounded border border-white/10 px-0.5 flex-shrink-0">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 disabled:opacity-30"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw size={11} />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 disabled:opacity-30"
              title="Redo (Ctrl+Y)"
            >
              <RotateCw size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Middle Area: Left Tool Shelf (T-Panel 38px) + Center Viewport Canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Tools Shelf (T-Panel: Fixed 38px Width) */}
        <aside className="w-[38px] bg-[#090e1a] border-r border-white/10 flex flex-col items-center py-2 gap-1.5 z-20 flex-shrink-0">
          {[
            { id: 'pencil', icon: Pencil, title: 'Pencil Tool (P)' },
            { id: 'eraser', icon: Eraser, title: 'Eraser Tool (E)' },
            { id: 'bucket', icon: PaintBucket, title: 'Paint Bucket (G)' },
            { id: 'eyedropper', icon: Pipette, title: 'Color Eyedropper (I)' },
            { id: 'hand', icon: Hand, title: 'Hand / Pan Tool (H / Space)' }
          ].map((tool) => {
            const Icon = tool.icon;
            const isSel = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                  isSel
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={tool.title}
              >
                <Icon size={14} />
              </button>
            );
          })}

          <div className="w-5 h-px bg-white/10 my-0.5" />

          {/* Mirror Symmetry & Grid Buttons on T-Panel */}
          <button
            onClick={() => setIsSymmetryActive(!isSymmetryActive)}
            className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
              isSymmetryActive
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Mirror Symmetry across X axis (X key)"
          >
            <FlipHorizontal size={13} />
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
              showGrid
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Pixel Grid (#)"
          >
            <Grid size={13} />
          </button>
        </aside>

        {/* Center Viewport Canvas (Fills entire remaining space) */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={(e) => e.preventDefault()}
          className={`flex-1 overflow-hidden relative flex items-center justify-center bg-[#050811] ${getCursorClass()}`}
          style={{
            backgroundImage:
              'radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {/* Subtle Viewport Watermark (Top Left) */}
          <div
            style={{ position: 'absolute', top: '10px', left: '12px', zIndex: 10 }}
            className="pointer-events-none text-slate-500/60 font-mono text-[10px] select-none"
          >
            {frameWidth} × {frameHeight} px
          </div>

          {/* Centered Canvas Container with Pan/Zoom translation */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px)`,
              transition: isPanning ? 'none' : 'transform 0.04s ease-out'
            }}
            className="relative shadow-2xl shadow-black border border-white/20 bg-transparent"
          >
            {/* Transparent Checkerboard Pattern */}
            <div
              className="absolute inset-0 z-0 pointer-events-none"
              style={{
                width: frameWidth * zoom,
                height: frameHeight * zoom,
                backgroundImage:
                  'linear-gradient(45deg, #131b28 25%, transparent 25%), linear-gradient(-45deg, #131b28 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #131b28 75%), linear-gradient(-45deg, transparent 75%, #131b28 75%)',
                backgroundSize: `${Math.max(8, zoom * 2)}px ${Math.max(8, zoom * 2)}px`,
                backgroundColor: '#0a0f19'
              }}
            />

            {/* The Drawing Canvas */}
            <canvas
              ref={canvasRef}
              width={frameWidth}
              height={frameHeight}
              style={{
                width: `${frameWidth * zoom}px`,
                height: `${frameHeight * zoom}px`,
                imageRendering: 'pixelated',
                display: 'block'
              }}
              className="relative z-10"
            />

            {/* Crisp Adaptive Pixel Grid Overlay */}
            {showGrid && zoom >= 4 && (
              <div
                className="absolute inset-0 z-10 pointer-events-none"
                style={{
                  width: frameWidth * zoom,
                  height: frameHeight * zoom,
                  backgroundImage:
                    'linear-gradient(to right, rgba(255, 255, 255, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 1px, transparent 1px)',
                  backgroundSize: `${zoom}px ${zoom}px`
                }}
              />
            )}

            {/* Pixel Hover Brush Cursor Box */}
            {hoverPixel && activeTool !== 'hand' && !isSpaceHeld && (
              <div
                className="absolute z-20 pointer-events-none border border-white/90 bg-white/25 shadow-sm"
                style={{
                  left: `${(hoverPixel.x - Math.floor(brushSize / 2)) * zoom}px`,
                  top: `${(hoverPixel.y - Math.floor(brushSize / 2)) * zoom}px`,
                  width: `${brushSize * zoom}px`,
                  height: `${brushSize * zoom}px`
                }}
              />
            )}

            {/* Mirror Center Symmetry Line */}
            {isSymmetryActive && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none border-r-2 border-dashed border-amber-400/70"
                style={{
                  left: `${(frameWidth / 2) * zoom}px`,
                  transform: 'translateX(-1px)'
                }}
              />
            )}
          </div>

          {/* Floating Bottom-Right Zoom & Viewport Controller Component */}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            style={{ position: 'absolute', bottom: '12px', right: '12px', zIndex: 30 }}
            className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0f1624]/95 backdrop-blur-md border border-white/15 shadow-xl shadow-black/70 text-slate-200 select-none pointer-events-auto"
          >
            {/* Cursor XY Coordinates */}
            <div className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
              <span className="text-slate-500">XY:</span>
              <span className="text-amber-400 font-bold min-w-[36px]">
                {hoverPixel ? `${hoverPixel.x},${hoverPixel.y}` : '-,-'}
              </span>
            </div>

            <div className="w-px h-3.5 bg-white/15" />

            {/* Zoom Out Button */}
            <button
              onClick={() => setZoom((z) => Math.max(z - 1, 1))}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Zoom Out (Scroll Down)"
            >
              <ZoomOut size={12} />
            </button>

            {/* Clickable Zoom Percentage Badge */}
            <button
              onClick={() => {
                if (zoom === 1) {
                  handleAutoFitZoom();
                } else {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }
              }}
              className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all text-center min-w-[42px]"
              title="Click to toggle 100% / Auto Fit"
            >
              {Math.round(zoom * 100)}%
            </button>

            {/* Zoom In Button */}
            <button
              onClick={() => setZoom((z) => Math.min(z + 1, 64))}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Zoom In (Scroll Up)"
            >
              <ZoomIn size={12} />
            </button>

            <div className="w-px h-3.5 bg-white/15" />

            {/* 1:1 Reset Button */}
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className={`px-1.5 h-6 rounded text-[10px] font-mono transition-colors ${
                zoom === 1
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Reset Zoom to 1:1 (100%)"
            >
              1:1
            </button>

            {/* Fit to Viewport Button */}
            <button
              onClick={handleAutoFitZoom}
              className="px-2 h-6 rounded bg-slate-800/80 hover:bg-blue-600 text-slate-300 hover:text-white text-[10px] font-mono font-semibold border border-white/10 hover:border-blue-500/50 transition-all flex items-center gap-1"
              title="Fit Canvas to Viewport"
            >
              <Focus size={11} />
              <span>Fit</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Bottom Timeline Dock (Dope Sheet: Standard Compact Height 48px) */}
      <footer className="h-12 px-2.5 bg-[#0a0f1d] border-t border-white/10 flex items-center justify-between z-20 text-slate-300 flex-shrink-0">
        {/* Left: Filmstrip Frames */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
            Frames ({frames.length}):
          </span>

          <div className="flex items-center gap-1">
            {frames.map((frame, idx) => {
              const isSelected = activeFrameIndex === idx;
              return (
                <div
                  key={`frame-strip-${idx}`}
                  onClick={() => onSelectFrameIndex?.(idx)}
                  className={`w-8 h-8 rounded border transition-all cursor-pointer flex flex-col items-center justify-center relative overflow-hidden flex-shrink-0 ${
                    isSelected
                      ? 'border-blue-400 ring-2 ring-blue-500/40 bg-slate-800'
                      : 'border-white/10 bg-slate-950/80 hover:border-white/30'
                  }`}
                >
                  <span className="text-[7px] font-mono text-slate-400 absolute top-0 left-0.5 z-10">
                    {idx + 1}
                  </span>
                  {frame.canvas && (
                    <CreatorFrameThumb canvas={frame.canvas} />
                  )}
                </div>
              );
            })}

            {/* Add Frame Button */}
            <button
              onClick={onAddFrame}
              className="w-8 h-8 rounded border border-dashed border-white/20 hover:border-blue-400 text-slate-400 hover:text-blue-300 flex items-center justify-center transition-colors flex-shrink-0"
              title="Add New Blank Frame"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Compact Icon-Only Actions */}
          <div className="flex items-center gap-1 pl-1">
            <button
              onClick={onDuplicateFrame}
              className="w-7 h-7 rounded bg-slate-900 border border-white/10 hover:border-white/30 text-slate-400 hover:text-white flex items-center justify-center transition-colors flex-shrink-0"
              title="Duplicate Frame"
            >
              <Copy size={12} />
            </button>
            <button
              onClick={onDeleteFrame}
              disabled={frames.length <= 1}
              className="w-7 h-7 rounded bg-slate-900 border border-white/10 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors disabled:opacity-30 flex-shrink-0"
              title="Delete Frame"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Right: Embedded Transport & Live 8 FPS Preview */}
        <div className="flex items-center gap-2 bg-slate-950 px-2 py-0.5 rounded border border-white/10 flex-shrink-0">
          <button
            onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
            className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center"
            title={isPreviewPlaying ? 'Pause Playback' : 'Play Live Strip'}
          >
            {isPreviewPlaying ? <Pause size={11} /> : <Play size={11} />}
          </button>

          <span className="text-[10px] font-mono text-emerald-400 font-bold whitespace-nowrap">
            F: {previewFrameIdx + 1}/{frames.length || 1} • 8 FPS
          </span>

          <div className="w-8 h-8 rounded bg-slate-900 border border-white/15 flex items-center justify-center overflow-hidden">
            <canvas
              ref={previewCanvasRef}
              width={frameWidth}
              height={frameHeight}
              style={{
                maxWidth: '28px',
                maxHeight: '28px',
                imageRendering: 'pixelated'
              }}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
