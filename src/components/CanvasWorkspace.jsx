import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize, RotateCcw, Move, Sparkles, Plus, Grid, Info, Hash, Target } from 'lucide-react';

export function CanvasWorkspace({
  imageSrc,
  imageDimensions,
  frames,
  selectedFrameId,
  onSelectFrame,
  onAddFrame,
  onUpdateFrame,
  onAutoDetect,
  onOpenQuickGrid,
  onFileUpload
}) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Display toggles
  const [showNumbers, setShowNumbers] = useState(true);
  const [showPivot, setShowPivot] = useState(true);

  // Dragging / Drawing state
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isMovingFrame, setIsMovingFrame] = useState(false);
  const [isResizingFrame, setIsResizingFrame] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);

  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });
  const [moveStart, setMoveStart] = useState({ x: 0, y: 0 });
  const [initialFramePos, setInitialFramePos] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // Center image when imageSrc changes
  useEffect(() => {
    if (imageSrc && containerRef.current && imageDimensions.width > 0) {
      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight;
      const scaleX = (containerW - 120) / imageDimensions.width;
      const scaleY = (containerH - 120) / imageDimensions.height;
      const autoScale = Math.min(scaleX, scaleY);
      // Small pixel art sheets like Fox_Run (192x128) should comfortably scale up to 3x or 4x
      const initialZoom = Math.min(Math.max(autoScale, 0.5), 4);

      setZoom(Math.round(initialZoom * 10) / 10);
      setPan({
        x: Math.max(20, (containerW - imageDimensions.width * initialZoom) / 2),
        y: Math.max(20, (containerH - imageDimensions.height * initialZoom) / 2)
      });
    }
  }, [imageSrc, imageDimensions]);

  // Convert client mouse coordinates to image-pixel space
  const getImageCoords = useCallback((e) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const imgX = Math.round((clientX - pan.x) / zoom);
    const imgY = Math.round((clientY - pan.y) / zoom);

    return {
      x: Math.max(0, Math.min(imageDimensions.width, imgX)),
      y: Math.max(0, Math.min(imageDimensions.height, imgY))
    };
  }, [pan, zoom, imageDimensions]);

  // Native wheel zoom handler with passive: false to prevent browser window scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e) => {
      e.preventDefault();
      if (!imageSrc) return;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;

      setZoom((prevZoom) => {
        const newZoom = Math.min(Math.max(0.15, prevZoom * zoomFactor), 15);
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          setPan((prevPan) => ({
            x: mouseX - (mouseX - prevPan.x) * (newZoom / prevZoom),
            y: mouseY - (mouseY - prevPan.y) * (newZoom / prevZoom)
          }));
        }
        return newZoom;
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, [imageSrc]);

  // Mouse down handler (Pan / Draw / Select / Resize)
  const handleMouseDown = (e) => {
    if (!imageSrc) return;

    // Middle click or Spacebar key held -> Pan mode
    if (e.button === 1 || e.spaceKey || e.altKey) {
      setIsPanning(true);
      setMoveStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return; // Left click only for drawing/moving

    const coords = getImageCoords(e);

    // Check if clicked on a resize handle of the selected frame
    const handleEl = e.target.closest('[data-handle]');
    if (handleEl && selectedFrameId) {
      const handleType = handleEl.getAttribute('data-handle');
      const activeFrame = frames.find(f => f.id === selectedFrameId);
      if (activeFrame) {
        setIsResizingFrame(true);
        setResizeHandle(handleType);
        setMoveStart({ x: e.clientX, y: e.clientY });
        setInitialFramePos({ ...activeFrame });
        return;
      }
    }

    // Check if clicked inside an existing frame box
    const frameEl = e.target.closest('[data-frame-id]');
    if (frameEl) {
      const clickedId = frameEl.getAttribute('data-frame-id');
      onSelectFrame(clickedId);

      const activeFrame = frames.find(f => f.id === clickedId);
      if (activeFrame) {
        setIsMovingFrame(true);
        setMoveStart({ x: e.clientX, y: e.clientY });
        setInitialFramePos({ ...activeFrame });
        return;
      }
    }

    // Otherwise: Start drawing a new frame selection box!
    onSelectFrame(null);
    setIsDrawing(true);
    setDrawStart(coords);
    setDrawCurrent(coords);
  };

  // Mouse move handler
  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - moveStart.x,
        y: e.clientY - moveStart.y
      });
      return;
    }

    const coords = getImageCoords(e);

    if (isDrawing) {
      setDrawCurrent(coords);
      return;
    }

    if (isMovingFrame && selectedFrameId) {
      const dx = Math.round((e.clientX - moveStart.x) / zoom);
      const dy = Math.round((e.clientY - moveStart.y) / zoom);

      const newX = Math.max(0, Math.min(imageDimensions.width - initialFramePos.w, initialFramePos.x + dx));
      const newY = Math.max(0, Math.min(imageDimensions.height - initialFramePos.h, initialFramePos.y + dy));

      onUpdateFrame(selectedFrameId, { x: newX, y: newY });
      return;
    }

    if (isResizingFrame && selectedFrameId) {
      const dx = Math.round((e.clientX - moveStart.x) / zoom);
      const dy = Math.round((e.clientY - moveStart.y) / zoom);

      let { x, y, w, h } = initialFramePos;

      if (resizeHandle.includes('e')) w = Math.max(2, initialFramePos.w + dx);
      if (resizeHandle.includes('s')) h = Math.max(2, initialFramePos.h + dy);

      if (resizeHandle.includes('w')) {
        const proposedW = initialFramePos.w - dx;
        if (proposedW >= 2) {
          x = initialFramePos.x + dx;
          w = proposedW;
        }
      }

      if (resizeHandle.includes('n')) {
        const proposedH = initialFramePos.h - dy;
        if (proposedH >= 2) {
          y = initialFramePos.y + dy;
          h = proposedH;
        }
      }

      onUpdateFrame(selectedFrameId, { x, y, w, h });
    }
  };

  // Mouse up handler
  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false);

    if (isDrawing) {
      setIsDrawing(false);
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const w = Math.abs(drawCurrent.x - drawStart.x);
      const h = Math.abs(drawCurrent.y - drawStart.y);

      // Only create frame if drawn size is at least 4x4 px
      if (w >= 4 && h >= 4) {
        onAddFrame({ x, y, w, h });
      }
    }

    if (isMovingFrame) setIsMovingFrame(false);
    if (isResizingFrame) setIsResizingFrame(false);
  };

  // Render 8 transform handles for selected box (Screen-Space Invariant)
  const renderHandles = (frame) => {
    if (frame.id !== selectedFrameId) return null;

    const invScale = 1 / zoom;

    const handles = [
      { type: 'nw', cursor: 'nwse-resize', left: '0%',   top: '0%' },
      { type: 'n',  cursor: 'ns-resize',   left: '50%',  top: '0%' },
      { type: 'ne', cursor: 'nesw-resize', left: '100%', top: '0%' },
      { type: 'e',  cursor: 'ew-resize',   left: '100%', top: '50%' },
      { type: 'se', cursor: 'nwse-resize', left: '100%', top: '100%' },
      { type: 's',  cursor: 'ns-resize',   left: '50%',  top: '100%' },
      { type: 'sw', cursor: 'nesw-resize', left: '0%',   top: '100%' },
      { type: 'w',  cursor: 'ew-resize',   left: '0%',   top: '50%' },
    ];

    return handles.map(h => (
      <div
        key={h.type}
        data-handle={h.type}
        className="transform-handle"
        style={{
          left: h.left,
          top: h.top,
          cursor: h.cursor,
          transform: `translate(-50%, -50%) scale(${invScale})`,
          transformOrigin: 'center center'
        }}
      />
    ));
  };

  return (
    <div
      ref={containerRef}
      className="glass-panel relative flex-1 flex flex-col overflow-hidden select-none bg-checkerboard"
      style={{ position: 'relative', width: '100%', height: '100%' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Canvas Viewport Controls Header Bar */}
      {imageSrc && (
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2 pointer-events-none flex-wrap">
          {/* Left Action Buttons */}
          <div
            className="flex items-center gap-1.5 p-1.5 rounded-lg text-xs pointer-events-auto shadow-lg"
            style={{ background: 'rgba(15, 23, 42, 0.92)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <button
              onClick={onAutoDetect}
              className="btn btn-secondary text-xs px-2.5 py-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
              title="Auto-detect non-transparent sprite bounds"
            >
              <Sparkles size={13} className="text-emerald-400" />
              <span>Auto Detect</span>
            </button>

            <button
              onClick={onOpenQuickGrid}
              className="btn btn-secondary text-xs px-2.5 py-1 text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
              title="Quick grid slice by rows/cols or pixel size"
            >
              <Grid size={13} className="text-blue-400" />
              <span>Grid Slice</span>
            </button>

            <div className="h-4 w-px bg-white/10 mx-0.5" />

            {/* Display Toggles */}
            <button
              onClick={() => setShowNumbers(!showNumbers)}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-all ${
                showNumbers
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-medium'
                  : 'text-slate-400 hover:text-white border border-transparent hover:bg-slate-800'
              }`}
              title="Toggle frame index numbers"
            >
              <Hash size={13} />
              <span className="text-[11px] font-mono hidden sm:inline">#{frames.length}</span>
            </button>

            <button
              onClick={() => setShowPivot(!showPivot)}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-all ${
                showPivot
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium'
                  : 'text-slate-400 hover:text-white border border-transparent hover:bg-slate-800'
              }`}
              title="Toggle pivot anchor point"
            >
              <Target size={13} />
              <span className="text-[11px] hidden sm:inline">Pivot</span>
            </button>
          </div>

          {/* Right Zoom Controls */}
          <div
            className="flex items-center gap-1 p-1.5 rounded-lg pointer-events-auto shadow-lg ml-auto"
            style={{ background: 'rgba(15, 23, 42, 0.92)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            {/* Quick Integer Zoom presets for crisp pixel art */}
            <div className="flex items-center gap-0.5 bg-slate-950/70 p-0.5 rounded border border-white/10 mr-1">
              {[1, 2, 4].map((z) => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                    Math.abs(zoom - z) < 0.05
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={`Zoom ${z}x`}
                >
                  {z}x
                </button>
              ))}
            </div>

            <button
              className="btn-icon"
              title="Zoom Out (-)"
              onClick={() => setZoom(z => Math.max(z * 0.8, 0.15))}
            >
              <ZoomOut size={15} />
            </button>
            <span className="font-mono text-xs text-slate-200 px-1 font-semibold min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="btn-icon"
              title="Zoom In (+)"
              onClick={() => setZoom(z => Math.min(z * 1.25, 15))}
            >
              <ZoomIn size={15} />
            </button>
            <button
              className="btn-icon"
              title="Fit to Screen"
              onClick={() => {
                if (containerRef.current && imageDimensions.width) {
                  const scale = Math.min(
                    (containerRef.current.clientWidth - 80) / imageDimensions.width,
                    (containerRef.current.clientHeight - 80) / imageDimensions.height
                  );
                  const fitZoom = Math.min(Math.max(scale, 0.2), 6);
                  setZoom(fitZoom);
                  setPan({
                    x: (containerRef.current.clientWidth - imageDimensions.width * fitZoom) / 2,
                    y: (containerRef.current.clientHeight - imageDimensions.height * fitZoom) / 2
                  });
                }
              }}
            >
              <Maximize size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Main Render Area */}
      {imageSrc ? (
        <div
          style={{
            position: 'absolute',
            left: `${pan.x}px`,
            top: `${pan.y}px`,
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
            width: `${imageDimensions.width}px`,
            height: `${imageDimensions.height}px`,
            cursor: isPanning ? 'grabbing' : isDrawing ? 'crosshair' : 'default',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}
        >
          {/* Base Sprite Image */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Sprite Sheet Canvas"
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              pointerEvents: 'none',
              imageRendering: zoom > 2 ? 'pixelated' : 'auto'
            }}
          />

          {/* Render Frame Boxes */}
          {frames.map((frame, index) => {
            const isSelected = frame.id === selectedFrameId;
            const invScale = 1 / zoom;

            return (
              <div
                key={frame.id}
                data-frame-id={frame.id}
                className={`frame-box ${isSelected ? 'is-selected' : ''}`}
                style={{
                  position: 'absolute',
                  left: `${frame.x}px`,
                  top: `${frame.y}px`,
                  width: `${frame.w}px`,
                  height: `${frame.h}px`,
                  border: isSelected
                    ? `${Math.max(1, 1.5 * invScale)}px solid #3b82f6`
                    : `${Math.max(0.75, 1 * invScale)}px dashed rgba(96, 165, 250, 0.55)`,
                  backgroundColor: isSelected
                    ? 'rgba(59, 130, 246, 0.08)'
                    : 'transparent',
                  boxShadow: isSelected
                    ? `0 0 0 ${Math.max(1, 1 * invScale)}px rgba(59, 130, 246, 0.35)`
                    : 'none',
                  zIndex: isSelected ? 25 : 10,
                  cursor: 'move'
                }}
              >
                {/* Minimalist Index Badge (Scaled inversely so it never covers the sprite!) */}
                {showNumbers && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      transform: `scale(${invScale})`,
                      transformOrigin: 'top left',
                      background: isSelected ? '#2563eb' : 'rgba(15, 23, 42, 0.72)',
                      color: isSelected ? '#ffffff' : '#94a3b8',
                      fontSize: '9px',
                      fontFamily: 'monospace',
                      fontWeight: '700',
                      padding: '1px 3px',
                      borderRadius: '0 0 3px 0',
                      lineHeight: '12px',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      userSelect: 'none',
                      borderRight: isSelected ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
                      borderBottom: isSelected ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
                      zIndex: isSelected ? 30 : 15,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}
                  >
                    #{index + 1}
                  </div>
                )}

                {/* Pivot point indicator (Crisp crosshair target scaled inversely) */}
                {isSelected && showPivot && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${(frame.pivotX ?? 0.5) * 100}%`,
                      top: `${(frame.pivotY ?? 0.5) * 100}%`,
                      width: '16px',
                      height: '16px',
                      transform: `translate(-50%, -50%) scale(${invScale})`,
                      transformOrigin: 'center center',
                      pointerEvents: 'none',
                      zIndex: 35,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {/* Ring */}
                    <div
                      style={{
                        position: 'absolute',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        border: '1.5px solid #f59e0b',
                        boxShadow: '0 0 4px rgba(245, 158, 11, 0.8)',
                        background: 'rgba(245, 158, 11, 0.2)'
                      }}
                    />
                    {/* Crosshairs */}
                    <div style={{ position: 'absolute', width: '16px', height: '1px', background: '#f59e0b' }} />
                    <div style={{ position: 'absolute', height: '16px', width: '1px', background: '#f59e0b' }} />
                    {/* Dot */}
                    <div style={{ position: 'absolute', width: '4px', height: '4px', borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 2px #000' }} />
                  </div>
                )}

                {/* 8 Resize Handles for Selected Box */}
                {renderHandles(frame)}
              </div>
            );
          })}

          {/* Active Mouse Drawing Box Preview */}
          {isDrawing && (
            <div
              style={{
                position: 'absolute',
                left: `${Math.min(drawStart.x, drawCurrent.x)}px`,
                top: `${Math.min(drawStart.y, drawCurrent.y)}px`,
                width: `${Math.abs(drawCurrent.x - drawStart.x)}px`,
                height: `${Math.abs(drawCurrent.y - drawStart.y)}px`,
                border: `${Math.max(1, 1.5 / zoom)}px solid #10b981`,
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                zIndex: 30,
                pointerEvents: 'none'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-18px',
                  left: '0px',
                  transform: `scale(${1 / zoom})`,
                  transformOrigin: 'bottom left',
                  background: '#059669',
                  color: '#ffffff',
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.5)'
                }}
              >
                {Math.abs(drawCurrent.x - drawStart.x)} × {Math.abs(drawCurrent.y - drawStart.y)} px
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State Dropzone */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 shadow-lg shadow-blue-500/10">
            <Plus size={36} />
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">Add Sprite Sheet to Workspace</h3>
          <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            Paste directly from clipboard (<kbd>Ctrl + V</kbd>), drag & drop an image file here, or choose a file below.
          </p>

          <label className="btn btn-primary px-6 py-2.5 text-sm cursor-pointer shadow-lg shadow-blue-500/25">
            Choose Sprite Sheet (PNG, JPG, WebP)
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  onFileUpload(e.target.files[0]);
                }
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
