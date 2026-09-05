import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Film,
  Plus,
  Copy,
  Trash2,
  Repeat,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  X,
  Edit2,
  Check,
  Search,
  Layers,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { resolveAnimationFrames } from '../utils/animationClips';

export function FrameTimeline({
  imageElement,
  frames = [],
  selectedFrameId,
  onSelectFrame,
  onDuplicateFrame,
  onDeleteFrame,
  animations = [],
  selectedAnimationId,
  onSelectAnimation,
  onAddAnimation,
  onDuplicateAnimation,
  onDeleteAnimation,
  onUpdateAnimation,
  onAddFrameToAnimation,
  onRemoveFrameFromAnimation,
  onReorderAnimationFrames
}) {
  const scrollRef = useRef(null);

  // Active animation object
  const activeAnimation = useMemo(() => {
    return (
      animations.find((a) => a.id === selectedAnimationId) ||
      animations[0] ||
      null
    );
  }, [animations, selectedAnimationId]);

  // Sliced frames belonging to active animation
  const activeFrames = useMemo(() => {
    return resolveAnimationFrames(activeAnimation, frames);
  }, [activeAnimation, frames]);

  // Search filter for animations
  const [searchQuery, setSearchQuery] = useState('');
  const filteredAnimations = useMemo(() => {
    if (!searchQuery.trim()) return animations;
    const q = searchQuery.toLowerCase();
    return animations.filter((a) => a.name.toLowerCase().includes(q));
  }, [animations, searchQuery]);

  // Inline rename state
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const startRename = (anim) => {
    setRenamingId(anim.id);
    setRenameValue(anim.name);
  };

  const submitRename = () => {
    if (renamingId && renameValue.trim()) {
      onUpdateAnimation?.(renamingId, { name: renameValue.trim() });
    }
    setRenamingId(null);
  };

  // Dock inline playback preview state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewFrameIdx, setPreviewFrameIdx] = useState(0);

  useEffect(() => {
    if (!isPreviewPlaying || activeFrames.length === 0) {
      setPreviewFrameIdx(0);
      return;
    }

    const fps = activeAnimation?.fps || 10;
    const interval = 1000 / Math.max(1, fps);

    const timer = setInterval(() => {
      setPreviewFrameIdx((prev) => {
        if (prev + 1 >= activeFrames.length) {
          if (activeAnimation?.loop === false) {
            setIsPreviewPlaying(false);
            return prev;
          }
          return 0;
        }
        return prev + 1;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPreviewPlaying, activeFrames.length, activeAnimation?.fps, activeAnimation?.loop]);

  // Auto-scroll timeline to selected frame
  useEffect(() => {
    if (selectedFrameId && scrollRef.current) {
      const activeEl = scrollRef.current.querySelector(`[data-frame-id="${selectedFrameId}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedFrameId]);

  // Find index of selected frame in current animation
  const selectedIndexInAnimation = useMemo(() => {
    if (!activeAnimation || !selectedFrameId) return -1;
    return activeAnimation.frameIds.indexOf(selectedFrameId);
  }, [activeAnimation, selectedFrameId]);

  return (
    <div className="glass-panel flex flex-col h-full overflow-hidden select-none border border-white/10 shadow-2xl">
      {/* Top Godot-style Dock Header Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-950/90 border-b border-white/10 flex-shrink-0 text-xs">
        {/* Left: Godot Tab & Active Anim Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#204b77]/40 border border-[#3b82f6]/50 text-blue-300 font-bold shadow-sm">
            <Film size={12} className="text-[#60a5fa]" />
            <span className="tracking-wide">SpriteFrames</span>
          </div>

          {activeAnimation && (
            <div className="flex items-center gap-2 text-[11px] text-slate-300 font-mono">
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">Animation:</span>
              <span className="text-blue-300 font-bold bg-slate-900/90 px-1.5 py-0.5 rounded border border-white/10">
                {activeAnimation.name}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-bold">{activeFrames.length} frames</span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-300">{activeAnimation.fps} FPS</span>
              <span className="text-slate-500">•</span>
              <span className={activeAnimation.loop ? 'text-blue-400' : 'text-slate-500'}>
                {activeAnimation.loop ? 'Loop: On' : 'Loop: Off'}
              </span>
            </div>
          )}
        </div>

        {/* Right: Global Stats & Shortcuts */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="hidden sm:inline font-mono">
            {animations.length} animations • {frames.length} total frames
          </span>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="hidden md:inline text-[10px]">
            Shortcuts: <kbd>Ctrl+D</kbd> Duplicate | <kbd>Del</kbd> Delete
          </span>
        </div>
      </div>

      {/* Main Split Body: Left Animations List | Right Animation Frames Track */}
      <div className="flex-1 flex flex-row min-h-0 divide-x divide-white/10 overflow-hidden">
        {/* ============================================================ */}
        {/* LEFT COLUMN: ANIMATIONS LIST (Godot SpriteFrames Left Dock)  */}
        {/* ============================================================ */}
        <div className="w-60 flex-shrink-0 flex flex-col bg-slate-950/60 min-h-0">
          {/* Header Toolbar */}
          <div className="p-1.5 border-b border-white/10 flex items-center justify-between gap-1 flex-shrink-0 bg-slate-900/60">
            <div className="flex items-center gap-1.5 px-1">
              <Layers size={11} className="text-blue-400" />
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Animations ({animations.length})
              </span>
            </div>

            {/* Animation Actions: Add, Duplicate, Delete */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => {
                  const newAnim = onAddAnimation?.();
                  if (newAnim) startRename(newAnim);
                }}
                className="btn-icon p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                title="New Animation"
              >
                <Plus size={13} className="text-emerald-400" />
              </button>

              <button
                onClick={() => activeAnimation && onDuplicateAnimation?.(activeAnimation.id)}
                disabled={!activeAnimation}
                className="btn-icon p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
                title="Duplicate Animation"
              >
                <Copy size={12} />
              </button>

              <button
                onClick={() => activeAnimation && onDeleteAnimation?.(activeAnimation.id)}
                disabled={animations.length <= 1}
                className="btn-icon p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-30"
                title="Delete Animation"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Quick Search / Filter Bar */}
          {animations.length > 4 && (
            <div className="px-1.5 py-1 border-b border-white/5 flex items-center gap-1 bg-slate-950/40 flex-shrink-0">
              <Search size={10} className="text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter animations..."
                className="w-full bg-transparent text-[10px] text-slate-200 outline-none placeholder-slate-600"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white">
                  <X size={10} />
                </button>
              )}
            </div>
          )}

          {/* Scrollable List of Animations */}
          <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
            {filteredAnimations.map((anim) => {
              const isActive = anim.id === activeAnimation?.id;
              const isRenaming = renamingId === anim.id;

              if (isRenaming) {
                return (
                  <div
                    key={anim.id}
                    className="flex items-center gap-1 p-1 rounded bg-slate-850 border border-blue-500/50 shadow-inner"
                  >
                    <input
                      type="text"
                      value={renameValue}
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitRename();
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onBlur={submitRename}
                      className="flex-1 bg-transparent text-xs text-white px-1 py-0.5 outline-none font-mono"
                    />
                    <button
                      onClick={submitRename}
                      className="p-0.5 text-emerald-400 hover:text-emerald-300"
                      title="Save"
                    >
                      <Check size={11} />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={anim.id}
                  onClick={() => onSelectAnimation?.(anim.id)}
                  onDoubleClick={() => startRename(anim)}
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
                        onUpdateAnimation?.(anim.id, { loop: !anim.loop });
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
                        startRename(anim);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-white"
                      title="Rename animation"
                    >
                      <Edit2 size={10} />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredAnimations.length === 0 && (
              <div className="text-center text-[10px] text-slate-500 py-4">No animations found</div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: ANIMATION FRAMES TRACK (Godot Frames Strip)         */}
        {/* ================================================================= */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-900/40">
          {/* Track Header Toolbar */}
          <div className="px-2.5 py-1.5 bg-slate-900/80 border-b border-white/10 flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
            {/* Left: Playback & Settings Controls */}
            <div className="flex items-center gap-2">
              {/* Play / Pause dock preview */}
              <button
                onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                disabled={activeFrames.length === 0}
                className={`btn px-2.5 py-1 text-[11px] rounded flex items-center gap-1 font-bold shadow ${
                  isPreviewPlaying
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'btn-secondary text-slate-200'
                } disabled:opacity-30`}
                title={isPreviewPlaying ? 'Pause Dock Preview' : 'Play Animation in Dock'}
              >
                {isPreviewPlaying ? <Pause size={12} /> : <Play size={12} />}
                <span>{isPreviewPlaying ? 'Pause' : 'Play'}</span>
              </button>

              {/* Speed (FPS) Control */}
              <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded border border-white/10 text-[11px]">
                <span className="text-slate-400 font-mono text-[10px]">Speed:</span>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={activeAnimation?.fps || 10}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(60, parseInt(e.target.value) || 10));
                    if (activeAnimation) {
                      onUpdateAnimation?.(activeAnimation.id, { fps: val });
                    }
                  }}
                  className="w-8 bg-transparent text-center font-mono font-bold text-amber-400 outline-none"
                />
                <span className="text-[10px] text-slate-400 font-mono">FPS</span>
              </div>

              {/* Loop Checkbox Toggle */}
              <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer bg-slate-950/80 px-2 py-1 rounded border border-white/10">
                <input
                  type="checkbox"
                  checked={activeAnimation?.loop !== false}
                  onChange={(e) => {
                    if (activeAnimation) {
                      onUpdateAnimation?.(activeAnimation.id, { loop: e.target.checked });
                    }
                  }}
                  className="rounded bg-slate-800 border-white/20 text-blue-500 focus:ring-0"
                />
                <span className="font-mono text-[10px]">Loop</span>
              </label>
            </div>

            {/* Right: Frame Management Actions */}
            <div className="flex items-center gap-1">
              {/* Add Selected Frame */}
              <button
                onClick={() => {
                  if (activeAnimation && selectedFrameId) {
                    onAddFrameToAnimation?.(activeAnimation.id, selectedFrameId);
                  }
                }}
                disabled={!activeAnimation || !selectedFrameId}
                className="btn bg-blue-600/25 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 px-2.5 py-1 text-[11px] rounded font-bold shadow flex items-center gap-1 disabled:opacity-30"
                title="Append currently selected canvas frame to this animation"
              >
                <Plus size={12} className="text-blue-400" />
                <span>Add Selected Frame</span>
              </button>

              {/* Add All Frames */}
              <button
                onClick={() => {
                  if (activeAnimation && frames.length > 0) {
                    const newIds = [...activeAnimation.frameIds, ...frames.map((f) => f.id)];
                    onUpdateAnimation?.(activeAnimation.id, { frameIds: newIds });
                  }
                }}
                disabled={!activeAnimation || frames.length === 0}
                className="btn btn-secondary px-2 py-1 text-[11px] flex items-center gap-1 text-slate-300 disabled:opacity-30"
                title="Append all sliced frames from sheet to this animation"
              >
                <Sparkles size={11} className="text-amber-400" />
                <span>+ All</span>
              </button>

              {/* Reorder Left */}
              <button
                onClick={() => {
                  if (activeAnimation && selectedIndexInAnimation > 0) {
                    onReorderAnimationFrames?.(
                      activeAnimation.id,
                      selectedIndexInAnimation,
                      selectedIndexInAnimation - 1
                    );
                  }
                }}
                disabled={!activeAnimation || selectedIndexInAnimation <= 0}
                className="btn-icon p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded bg-slate-950/80 border border-white/10"
                title="Move frame left in animation"
              >
                <ChevronLeft size={13} />
              </button>

              {/* Reorder Right */}
              <button
                onClick={() => {
                  if (
                    activeAnimation &&
                    selectedIndexInAnimation !== -1 &&
                    selectedIndexInAnimation < activeAnimation.frameIds.length - 1
                  ) {
                    onReorderAnimationFrames?.(
                      activeAnimation.id,
                      selectedIndexInAnimation,
                      selectedIndexInAnimation + 1
                    );
                  }
                }}
                disabled={
                  !activeAnimation ||
                  selectedIndexInAnimation === -1 ||
                  selectedIndexInAnimation >= activeAnimation.frameIds.length - 1
                }
                className="btn-icon p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded bg-slate-950/80 border border-white/10"
                title="Move frame right in animation"
              >
                <ChevronRight size={13} />
              </button>

              {/* Remove selected frame from this animation */}
              <button
                onClick={() => {
                  if (activeAnimation && selectedIndexInAnimation !== -1) {
                    onRemoveFrameFromAnimation?.(activeAnimation.id, selectedIndexInAnimation);
                  }
                }}
                disabled={!activeAnimation || selectedIndexInAnimation === -1}
                className="btn-icon p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30 rounded bg-slate-950/80 border border-white/10"
                title="Remove frame from this animation"
              >
                <X size={13} />
              </button>

              {/* Clear all frames in animation */}
              <button
                onClick={() => {
                  if (activeAnimation && activeAnimation.frameIds.length > 0) {
                    onUpdateAnimation?.(activeAnimation.id, { frameIds: [] });
                  }
                }}
                disabled={!activeAnimation || activeAnimation.frameIds.length === 0}
                className="btn-icon p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30 rounded bg-slate-950/80 border border-white/10"
                title="Clear all frames from this animation"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          </div>

          {/* Horizontal Frames Carousel */}
          <div
            ref={scrollRef}
            className="flex-1 flex flex-row items-center gap-2.5 overflow-x-auto overflow-y-hidden px-2.5 py-1.5"
            style={{ width: '100%', minHeight: 0 }}
          >
            {activeFrames.map((frame, idx) => {
              const isSelected = frame.id === selectedFrameId;
              const isPlaybackActive = isPreviewPlaying && previewFrameIdx === idx;

              return (
                <div
                  key={`${frame.id}_${idx}`}
                  data-frame-id={frame.id}
                  onClick={() => onSelectFrame?.(frame.id)}
                  className={`godot-frame-card border group shadow-md ${
                    isPlaybackActive
                      ? 'border-amber-400 bg-amber-500/15 shadow-amber-500/25 ring-2 ring-amber-400/80'
                      : isSelected
                      ? 'border-blue-500 bg-blue-500/15 shadow-blue-500/25 ring-1 ring-blue-400'
                      : 'border-white/10 bg-slate-900/90 hover:bg-slate-850 hover:border-white/20'
                  }`}
                >
                  {/* Top Tag: Godot Index #0, #1... & Dimensions */}
                  <div className="w-full flex items-center justify-between text-[10px] font-mono px-1 py-0.5 z-10 bg-slate-950/85 rounded border border-white/10 flex-shrink-0">
                    <span
                      className={`font-bold ${
                        isPlaybackActive
                          ? 'text-amber-300'
                          : isSelected
                          ? 'text-blue-400'
                          : 'text-slate-300'
                      }`}
                    >
                      #{idx}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {frame.w}×{frame.h}
                    </span>
                  </div>

                  {/* Thumbnail Preview */}
                  <div
                    className="w-full flex-1 bg-checkerboard rounded relative overflow-hidden flex items-center justify-center my-0.5"
                    style={{ width: '100%', minHeight: '44px', position: 'relative' }}
                  >
                    <FrameThumbnail imageElement={imageElement} frame={frame} />
                  </div>

                  {/* Bottom Bar: Frame Duration Multiplier (Godot style: 1.0x) */}
                  <div className="w-full flex items-center justify-between text-[9px] font-mono px-1 py-0.5 bg-slate-950/85 rounded border border-white/5 flex-shrink-0">
                    <span className="text-slate-400 truncate max-w-[50px]">{frame.name}</span>
                    <span className="text-emerald-400 font-bold">1.0×</span>
                  </div>

                  {/* Hover Quick Actions Bar */}
                  <div className="absolute inset-0 bg-slate-950/90 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (idx > 0 && activeAnimation) {
                          onReorderAnimationFrames?.(activeAnimation.id, idx, idx - 1);
                        }
                      }}
                      disabled={idx === 0}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-20 shadow"
                      title="Move frame earlier"
                    >
                      <ChevronLeft size={12} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeAnimation) {
                          onRemoveFrameFromAnimation?.(activeAnimation.id, idx);
                        }
                      }}
                      className="p-1 rounded bg-rose-600 hover:bg-rose-500 text-white shadow"
                      title="Remove frame from this animation"
                    >
                      <X size={12} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (idx < activeFrames.length - 1 && activeAnimation) {
                          onReorderAnimationFrames?.(activeAnimation.id, idx, idx + 1);
                        }
                      }}
                      disabled={idx === activeFrames.length - 1}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-20 shadow"
                      title="Move frame later"
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Empty State when animation has no frames */}
            {activeFrames.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-3 text-slate-500">
                <p className="text-xs mb-1.5">
                  Animation{' '}
                  <span className="text-blue-300 font-bold font-mono">
                    "{activeAnimation?.name || 'current'}"
                  </span>{' '}
                  has no frames yet.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (activeAnimation && selectedFrameId) {
                        onAddFrameToAnimation?.(activeAnimation.id, selectedFrameId);
                      }
                    }}
                    disabled={!selectedFrameId}
                    className="btn bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 px-2.5 py-1 text-xs rounded font-bold disabled:opacity-30"
                  >
                    <Plus size={12} />
                    <span>Add Selected Canvas Frame</span>
                  </button>
                  <button
                    onClick={() => {
                      if (activeAnimation && frames.length > 0) {
                        onUpdateAnimation?.(activeAnimation.id, {
                          frameIds: frames.map((f) => f.id)
                        });
                      }
                    }}
                    disabled={frames.length === 0}
                    className="btn btn-secondary px-2.5 py-1 text-xs rounded"
                  >
                    <span>+ Add All Sliced Frames</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponent for thumbnail canvas drawing
function FrameThumbnail({ imageElement, frame }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !imageElement || !frame || frame.w <= 0 || frame.h <= 0) return;

    const canvas = canvasRef.current;
    canvas.width = Math.max(1, frame.w);
    canvas.height = Math.max(1, frame.h);

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      imageElement,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      0,
      0,
      frame.w,
      frame.h
    );
  }, [imageElement, frame]);

  if (!imageElement) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        maxWidth: '100%',
        maxHeight: '100%',
        imageRendering: 'pixelated',
        display: 'block',
        margin: 'auto'
      }}
    />
  );
}
