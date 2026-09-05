import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Eye,
  Sliders,
  Monitor,
  Layers,
  Gamepad2,
  Network,
  Move,
  RotateCcw,
  Zap,
  Film,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { CharacterStateMachine, createDefaultCharacterGraph } from '../utils/animationGraph';
import { StateGraphModal } from './StateGraphModal';

export function AnimationPreview({
  imageElement,
  sheets = [],
  sheetMap,
  frames,
  selectedFrameId,
  onSelectFrame,
  animations = [],
  selectedAnimationId,
  onSelectAnimation,
  previewMode: controlledPreviewMode,
  onPreviewModeChange,
  isPlaying: controlledIsPlaying,
  onTogglePlay,
  currentFrameIndex: controlledFrameIndex,
  onFrameIndexChange
}) {
  const canvasRef = useRef(null);

  // Preview Mode: 'clip' (single animation clip) or 'character' (interactive state machine)
  const [localPreviewMode, setLocalPreviewMode] = useState('character');
  const previewMode = controlledPreviewMode !== undefined ? controlledPreviewMode : localPreviewMode;
  const setPreviewMode = onPreviewModeChange || setLocalPreviewMode;
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);

  // Playback settings
  const [localIsPlaying, setLocalIsPlaying] = useState(true);
  const isPlaying = controlledIsPlaying !== undefined ? controlledIsPlaying : localIsPlaying;
  const togglePlay = onTogglePlay || (() => setLocalIsPlaying((p) => !p));
  const [fps, setFps] = useState(10);
  const [isLooping, setIsLooping] = useState(true);
  const [onionSkin, setOnionSkin] = useState(false);
  const [bgStyle, setBgStyle] = useState('checkerboard'); // 'checkerboard' | 'dark' | 'light' | 'green'
  const [zoomScale, setZoomScale] = useState(3); // 2x, 3x, 4x, 6x

  // Active animation from Godot SpriteFrames animations list
  const activeAnimation = useMemo(() => {
    return (
      animations.find((a) => a.id === selectedAnimationId) ||
      animations[0] ||
      null
    );
  }, [animations, selectedAnimationId]);

  // Sync FPS and loop settings when active animation changes
  useEffect(() => {
    if (activeAnimation) {
      if (activeAnimation.fps) setFps(activeAnimation.fps);
      if (activeAnimation.loop !== undefined) setIsLooping(activeAnimation.loop);
    }
  }, [activeAnimation]);

  // Resolve frames for current clip mode
  const activeFrames = useMemo(() => {
    if (frames.length === 0) return [];
    if (activeAnimation && activeAnimation.frameIds && activeAnimation.frameIds.length > 0) {
      const frameMap = new Map(frames.map((f) => [f.id, f]));
      const resolved = activeAnimation.frameIds.map((id) => frameMap.get(id)).filter(Boolean);
      if (resolved.length > 0) return resolved;
    }
    return frames;
  }, [activeAnimation, frames]);

  const [localFrameIndex, setLocalFrameIndex] = useState(0);
  const currentFrameIndex = controlledFrameIndex !== undefined ? controlledFrameIndex : localFrameIndex;
  const setFrameIndex = onFrameIndexChange || setLocalFrameIndex;

  // Keep frame index within active frames range
  useEffect(() => {
    if (currentFrameIndex >= activeFrames.length && activeFrames.length > 0) {
      setFrameIndex(0);
    }
  }, [activeFrames.length, currentFrameIndex, setFrameIndex]);

  // ==========================================
  // CHARACTER STATE MACHINE ENGINE INTEGRATION
  // ==========================================
  const defaultGraph = useMemo(() => {
    return createDefaultCharacterGraph(frames, animations);
  }, [frames, animations]);

  const [customGraphConfig, setCustomGraphConfig] = useState(null);
  const graphConfig = customGraphConfig || defaultGraph;

  const stateMachineRef = useRef(null);
  const [activeStateId, setActiveStateId] = useState('Idle');
  const activeStateIdRef = useRef('Idle');
  const [isStationary, setIsStationary] = useState(false); // Walk in arena vs stationary center
  const containerRef = useRef(null);
  const [arenaSize, setArenaSize] = useState({ w: 340, h: 280 });
  const arenaSizeRef = useRef({ w: 340, h: 280 });
  arenaSizeRef.current = arenaSize;

  // Real-time character physics & animation state stored in refs to eliminate 60 FPS React re-renders
  const charPosRef = useRef({ x: 170, y: 140 });
  const charFrameIdxRef = useRef(0);
  const frameAccRef = useRef(0);

  // Measure container dimensions dynamically to guarantee 1:1 pixel aspect ratio without distortion
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 20 && height > 20) {
          const w = Math.round(width);
          const h = Math.round(height);
          setArenaSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Center character when arena dimensions change or reset
  const resetCharPosition = useCallback(() => {
    charPosRef.current = {
      x: Math.round(arenaSize.w / 2),
      y: Math.round(arenaSize.h / 2)
    };
  }, [arenaSize.w, arenaSize.h]);

  useEffect(() => {
    resetCharPosition();
  }, [arenaSize.w, arenaSize.h, resetCharPosition]);

  // Initialize or update state machine when graph changes
  useEffect(() => {
    stateMachineRef.current = new CharacterStateMachine(graphConfig);
    activeStateIdRef.current = graphConfig.defaultState || 'Idle';
    setActiveStateId(activeStateIdRef.current);
    charFrameIdxRef.current = 0;
    frameAccRef.current = 0;
  }, [graphConfig]);

  // Real-time keyboard input tracking (WASD + Arrows + Space)
  const keysDownRef = useRef(new Set());
  const [activeKeys, setActiveKeys] = useState({
    up: false,
    down: false,
    left: false,
    right: false,
    action: false
  });

  const updateParametersFromKeys = useCallback(() => {
    if (!stateMachineRef.current) return;
    const keys = keysDownRef.current;

    let mx = 0;
    let my = 0;

    const isUp = keys.has('KeyW') || keys.has('ArrowUp');
    const isDown = keys.has('KeyS') || keys.has('ArrowDown');
    const isLeft = keys.has('KeyA') || keys.has('ArrowLeft');
    const isRight = keys.has('KeyD') || keys.has('ArrowRight');

    if (isUp) my += 1;
    if (isDown) my -= 1;
    if (isRight) mx += 1;
    if (isLeft) mx -= 1;

    const speed = (mx !== 0 || my !== 0) ? 1.0 : 0.0;
    stateMachineRef.current.setParameters({
      speed,
      moveX: mx,
      moveY: my
    });

    setActiveKeys((prev) => {
      if (
        prev.up === isUp &&
        prev.down === isDown &&
        prev.left === isLeft &&
        prev.right === isRight
      ) {
        return prev;
      }
      return {
        ...prev,
        up: isUp,
        down: isDown,
        left: isLeft,
        right: isRight
      };
    });
  }, []);

  // Virtual buttons input helpers (for mouse click & mobile touch)
  const triggerVirtualKey = useCallback((code, isDown) => {
    if (code === 'Space') {
      if (isDown && stateMachineRef.current) {
        stateMachineRef.current.setParameters({ isAttacking: true });
      }
      setActiveKeys((prev) => (prev.action === isDown ? prev : { ...prev, action: isDown }));
      return;
    }

    if (isDown) {
      keysDownRef.current.add(code);
    } else {
      keysDownRef.current.delete(code);
    }
    updateParametersFromKeys();
  }, [updateParametersFromKeys]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Do not intercept if user is typing in an input field
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (previewMode !== 'character') return;

      const trackedKeys = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
      if (trackedKeys.includes(e.code)) {
        e.preventDefault();
        if (e.repeat) return; // Prevent auto-repeat spam from stuttering frame pacing

        if (e.code === 'Space') {
          if (stateMachineRef.current) {
            stateMachineRef.current.setParameters({ isAttacking: true });
          }
          setActiveKeys((prev) => (prev.action ? prev : { ...prev, action: true }));
          return;
        }

        keysDownRef.current.add(e.code);
        updateParametersFromKeys();
      }
    };

    const handleKeyUp = (e) => {
      if (previewMode !== 'character') return;

      if (e.code === 'Space') {
        setActiveKeys((prev) => (!prev.action ? prev : { ...prev, action: false }));
        return;
      }

      if (keysDownRef.current.has(e.code)) {
        keysDownRef.current.delete(e.code);
        updateParametersFromKeys();
      }
    };

    const handleBlur = () => {
      keysDownRef.current.clear();
      updateParametersFromKeys();
      setActiveKeys({ up: false, down: false, left: false, right: false, action: false });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [previewMode, updateParametersFromKeys]);

  // Reset keys on mode switch
  useEffect(() => {
    if (previewMode !== 'character') {
      keysDownRef.current.clear();
      setActiveKeys({ up: false, down: false, left: false, right: false, action: false });
    }
  }, [previewMode]);

  // Direct Character Canvas Drawing Helper (Draws razor-sharp pixelated character in arena)
  const drawCharacterCanvas = useCallback((ctx, canvas) => {
    if (!imageElement || frames.length === 0) return;

    const curArena = arenaSizeRef.current;
    if (canvas.width !== curArena.w) canvas.width = curArena.w;
    if (canvas.height !== curArena.h) canvas.height = curArena.h;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Arena Subtle Checker Tile Floor
    const tileSize = 24;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let r = 0; r < Math.ceil(curArena.h / tileSize); r++) {
      for (let c = 0; c < Math.ceil(curArena.w / tileSize); c++) {
        if ((r + c) % 2 === 0) {
          ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
        }
      }
    }

    // Draw Arena Subtle Boundary Ring
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(6, 6, curArena.w - 12, curArena.h - 12);

    // Draw Corner Accent Brackets
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.lineWidth = 2;
    const bLen = 10;
    // Top-Left
    ctx.beginPath(); ctx.moveTo(6, 6 + bLen); ctx.lineTo(6, 6); ctx.lineTo(6 + bLen, 6); ctx.stroke();
    // Top-Right
    ctx.beginPath(); ctx.moveTo(curArena.w - 6 - bLen, 6); ctx.lineTo(curArena.w - 6, 6); ctx.lineTo(curArena.w - 6, 6 + bLen); ctx.stroke();
    // Bottom-Left
    ctx.beginPath(); ctx.moveTo(6, curArena.h - 6 - bLen); ctx.lineTo(6, curArena.h - 6); ctx.lineTo(6 + bLen, curArena.h - 6); ctx.stroke();
    // Bottom-Right
    ctx.beginPath(); ctx.moveTo(curArena.w - 6 - bLen, curArena.h - 6); ctx.lineTo(curArena.w - 6, curArena.h - 6); ctx.lineTo(curArena.w - 6, curArena.h - 6 - bLen); ctx.stroke();

    // Resolve active clip frame from character state machine
    const clipObj = stateMachineRef.current?.getCurrentClip();
    const clipFrames = clipObj?.clip || [];
    const safeIndex = clipFrames.length > 0 ? (charFrameIdxRef.current % clipFrames.length) : 0;
    const activeFrame = clipFrames[safeIndex] || frames[0];

    if (activeFrame && activeFrame.w > 0 && activeFrame.h > 0) {
      const drawW = activeFrame.w * zoomScale;
      const drawH = activeFrame.h * zoomScale;

      let drawX, drawY;
      if (isStationary) {
        drawX = Math.round((curArena.w - drawW) / 2);
        drawY = Math.round((curArena.h - drawH) / 2);
      } else {
        drawX = Math.round(charPosRef.current.x - drawW / 2);
        drawY = Math.round(charPosRef.current.y - drawH / 2);
      }

      // Draw clean drop shadow under character's feet
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      const shadowW = Math.max(10, drawW * 0.35);
      const shadowH = Math.max(4, drawW * 0.12);
      const feetY = drawY + drawH - Math.max(2, Math.round(zoomScale * 0.8));
      ctx.ellipse(
        drawX + drawW / 2,
        feetY,
        shadowW,
        shadowH,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Draw Sprite with 0% distortion and razor-sharp pixels
      const frameImg = (activeFrame?.sheetId && sheetMap?.get(activeFrame.sheetId)?.imageElement) || imageElement;
      ctx.globalAlpha = 1.0;
      ctx.drawImage(
        frameImg,
        activeFrame.x,
        activeFrame.y,
        activeFrame.w,
        activeFrame.h,
        drawX,
        drawY,
        drawW,
        drawH
      );
    }
  }, [imageElement, sheetMap, frames, zoomScale, isStationary]);

  // High-Performance 60 FPS Game Loop for Character Mode (Buttery-smooth movement & frame timing)
  useEffect(() => {
    if (previewMode !== 'character') return;

    let lastTime = performance.now();
    let animId;

    const tick = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (isPlaying && stateMachineRef.current) {
        const resolved = stateMachineRef.current.update(dt);
        const newStateId = stateMachineRef.current.currentStateId;

        // Only update React state when active state truly changes (preserves 60 FPS with 0 re-renders during motion)
        if (newStateId !== activeStateIdRef.current) {
          activeStateIdRef.current = newStateId;
          setActiveStateId(newStateId);
          charFrameIdxRef.current = 0;
          frameAccRef.current = 0;
        }

        const currentClip = resolved?.clip || [];

        // Move character in arena if speed > 0 and not stationary
        const params = stateMachineRef.current.parameters;
        if (!isStationary && params.speed > 0) {
          let mx = params.moveX;
          let my = params.moveY;

          // Normalize diagonal movement speed (prevents 41% speed lurch on diagonals)
          if (mx !== 0 && my !== 0) {
            mx *= 0.70710678;
            my *= 0.70710678;
          }

          const moveSpeed = 130 * dt; // Pixels per second
          const curArena = arenaSizeRef.current;
          const activeFrame = currentClip[charFrameIdxRef.current] || frames[0];
          const halfW = activeFrame ? (activeFrame.w * zoomScale) / 2 : 24;
          const halfH = activeFrame ? (activeFrame.h * zoomScale) / 2 : 24;
          const pad = 10;

          let nx = charPosRef.current.x + mx * moveSpeed;
          let ny = charPosRef.current.y - my * moveSpeed;

          // Clean clamping prevents character from ever clipping arena borders
          nx = Math.max(halfW + pad, Math.min(curArena.w - halfW - pad, nx));
          ny = Math.max(halfH + pad, Math.min(curArena.h - halfH - pad, ny));

          charPosRef.current.x = nx;
          charPosRef.current.y = ny;
        }

        // Cycle animation frames smoothly without accumulator loss
        if (currentClip.length > 1) {
          frameAccRef.current += dt;
          const frameDuration = 1 / Math.max(1, fps);
          if (frameAccRef.current >= frameDuration) {
            const advance = Math.floor(frameAccRef.current / frameDuration);
            frameAccRef.current -= advance * frameDuration;
            charFrameIdxRef.current = (charFrameIdxRef.current + advance) % currentClip.length;
          }
        } else {
          charFrameIdxRef.current = 0;
          frameAccRef.current = 0;
        }
      }

      // Render directly to canvas on every display refresh frame
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          drawCharacterCanvas(ctx, canvasRef.current);
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [previewMode, isPlaying, fps, isStationary, drawCharacterCanvas, frames, zoomScale]);

  // Classic Clip Mode Frame Tick Timer
  useEffect(() => {
    if (previewMode !== 'clip' || !isPlaying || activeFrames.length === 0) return;

    const interval = 1000 / fps;
    const timer = setInterval(() => {
      setFrameIndex((prev) => {
        if (prev + 1 >= activeFrames.length) {
          return isLooping ? 0 : prev;
        }
        return prev + 1;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [previewMode, isPlaying, fps, isLooping, activeFrames.length, setFrameIndex]);

  // Classic Clip Mode Canvas Rendering
  useEffect(() => {
    if (previewMode !== 'clip' || !canvasRef.current || !imageElement) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const activeFrame = activeFrames[currentFrameIndex];
    if (!activeFrame || activeFrame.w <= 0 || activeFrame.h <= 0) return;

    const targetW = Math.max(1, activeFrame.w * zoomScale);
    const targetH = Math.max(1, activeFrame.h * zoomScale);
    if (canvas.width !== targetW) canvas.width = targetW;
    if (canvas.height !== targetH) canvas.height = targetH;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Onion Skinning
    if (onionSkin && activeFrames.length > 1) {
      const prevIdx = (currentFrameIndex - 1 + activeFrames.length) % activeFrames.length;
      const prevFrame = activeFrames[prevIdx];
      if (prevFrame && prevFrame.w > 0 && prevFrame.h > 0) {
        const prevImg = (prevFrame.sheetId && sheetMap?.get(prevFrame.sheetId)?.imageElement) || imageElement;
        ctx.globalAlpha = 0.25;
        ctx.drawImage(
          prevImg,
          prevFrame.x,
          prevFrame.y,
          prevFrame.w,
          prevFrame.h,
          0,
          0,
          canvas.width,
          canvas.height
        );
      }
    }

    const frameImg = (activeFrame.sheetId && sheetMap?.get(activeFrame.sheetId)?.imageElement) || imageElement;
    ctx.globalAlpha = 1.0;
    ctx.drawImage(
      frameImg,
      activeFrame.x,
      activeFrame.y,
      activeFrame.w,
      activeFrame.h,
      0,
      0,
      canvas.width,
      canvas.height
    );
  }, [previewMode, currentFrameIndex, activeFrames, zoomScale, onionSkin, imageElement, sheetMap]);

  // Background style helper
  const getBgStyleClass = () => {
    if (bgStyle === 'checkerboard') return 'bg-checkerboard';
    if (bgStyle === 'dark') return 'bg-slate-950';
    if (bgStyle === 'light') return 'bg-slate-200';
    if (bgStyle === 'green') return 'bg-emerald-950';
    return 'bg-checkerboard';
  };

  const currentGlobalFrame = activeFrames[currentFrameIndex];

  return (
    <div className="glass-panel p-3 flex flex-col h-full overflow-hidden select-none">
      {/* Header & Mode Selector */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => setPreviewMode('character')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded font-bold transition-all ${
              previewMode === 'character'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Interactive character controller with WASD and 2D state machine"
          >
            <Gamepad2 size={13} />
            <span>Character (WASD)</span>
          </button>

          <button
            onClick={() => setPreviewMode('clip')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded font-bold transition-all ${
              previewMode === 'clip'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Standard single animation clip preview"
          >
            <Monitor size={13} />
            <span>Clip</span>
          </button>
        </div>

        {/* State / Frame Counter Badge */}
        {previewMode === 'character' ? (
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider border shadow-sm ${
                activeStateId === 'Action'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
                  : activeStateId === 'Run'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {activeStateId}
            </span>
            <button
              onClick={() => setIsGraphModalOpen(true)}
              className="btn btn-secondary px-2 py-0.5 text-[10px] font-bold text-blue-400 border-blue-500/30 hover:bg-blue-500/10 flex items-center gap-1"
              title="Open Animation Graph & State Machine Diagram"
            >
              <Network size={11} />
              <span>Graph</span>
            </button>
          </div>
        ) : (
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
            {activeFrames.length > 0 ? `${currentFrameIndex + 1} / ${activeFrames.length}` : '0 / 0'}
          </span>
        )}
      </div>

      {/* Clip Mode: Animation Clip Selector (Synchronized with Godot SpriteFrames Dock) */}
      {previewMode === 'clip' && animations.length > 0 && (
        <div className="mt-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              <Film size={11} className="text-blue-400" /> Animation Clip:
            </label>
            <span className="text-[9px] text-slate-500 font-mono">
              {activeFrames.length} frames • {activeAnimation?.fps || 10} FPS
            </span>
          </div>
          <select
            className="input-field w-full text-xs py-1 font-mono"
            value={activeAnimation?.id || ''}
            onChange={(e) => {
              onSelectAnimation?.(e.target.value);
              setFrameIndex(0);
            }}
          >
            {animations.map((a) => (
              <option key={a.id} value={a.id}>
                🎬 {a.name} ({a.frameIds.length} frames)
              </option>
            ))}
          </select>
        </div>
      )}


      {/* Main Preview Box Canvas */}
      <div
        ref={containerRef}
        className={`flex-1 min-h-0 rounded-xl border border-white/10 relative overflow-hidden mt-2 flex items-center justify-center shadow-inner ${getBgStyleClass()}`}
      >
        {frames.length > 0 && imageElement ? (
          <canvas
            ref={canvasRef}
            className="shadow-2xl"
            style={{
              imageRendering: 'pixelated',
              display: 'block',
              ...(previewMode === 'character'
                ? {
                    width: `${arenaSize.w}px`,
                    height: `${arenaSize.h}px`,
                    maxWidth: '100%',
                    maxHeight: '100%'
                  }
                : {
                    maxWidth: '92%',
                    maxHeight: '92%',
                    width: 'auto',
                    height: 'auto'
                  })
            }}
          />
        ) : (
          <div className="text-slate-500 text-xs font-mono text-center p-4">
            No frames sliced yet. Slice frames to preview animations.
          </div>
        )}

        {/* Floating Frame Info Badge (Clip Mode) */}
        {previewMode === 'clip' && currentGlobalFrame && (
          <div className="absolute bottom-2 left-2 text-[10px] font-mono bg-slate-950/85 px-2 py-0.5 rounded text-slate-300 border border-white/15 shadow">
            {currentGlobalFrame.name || `frame_${currentFrameIndex + 1}`} ({currentGlobalFrame.w}×{currentGlobalFrame.h})
          </div>
        )}

        {/* Arena Mode Toggle & Center Reset (Character Mode) */}
        {previewMode === 'character' && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-slate-950/80 p-0.5 rounded border border-white/10 shadow">
            <button
              onClick={() => setIsStationary(!isStationary)}
              className={`text-[9px] font-mono px-2 py-0.5 rounded transition-colors ${
                isStationary
                  ? 'bg-slate-800 text-slate-400 hover:text-white'
                  : 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
              }`}
              title="Toggle Walk in Arena or Run in Place"
            >
              {isStationary ? 'Stationary' : 'Arena Walk'}
            </button>

            {!isStationary && (
              <button
                onClick={resetCharPosition}
                className="btn-icon p-1 text-slate-400 hover:text-white"
                title="Reset character to center"
              >
                <RotateCcw size={10} />
              </button>
            )}
          </div>
        )}
        {previewMode === 'character' && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-[9px] font-mono text-slate-400 bg-slate-950/85 px-2 py-0.5 rounded border border-white/10 shadow">
            <span className="text-blue-400 font-bold">WASD</span> Move
            <span className="text-slate-600">•</span>
            <span className="text-amber-400 font-bold">Space</span> Action
          </div>
        )}

        {/* Quick Zoom Pill */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-950/80 p-0.5 rounded border border-white/10">
          {[2, 3, 4, 6].map((z) => (
            <button
              key={z}
              onClick={() => setZoomScale(z)}
              className={`px-1.5 py-0.5 text-[9px] font-mono rounded ${
                zoomScale === z ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {z}x
            </button>
          ))}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="mt-2.5 flex-shrink-0 space-y-2">
        {/* Character Mode Action & Virtual D-Pad Bar */}
        {previewMode === 'character' && (
          <div className="bg-slate-900/80 p-2 rounded-lg border border-white/10 flex items-center justify-between">
            {/* Virtual Directional Arrows (D-Pad) with Live Active Feedback */}
            <div className="flex items-center gap-1">
              <div className="grid grid-cols-3 gap-1 w-24">
                <div />
                <button
                  onMouseDown={() => triggerVirtualKey('KeyW', true)}
                  onMouseUp={() => triggerVirtualKey('KeyW', false)}
                  onMouseLeave={() => triggerVirtualKey('KeyW', false)}
                  onTouchStart={(e) => { e.preventDefault(); triggerVirtualKey('KeyW', true); }}
                  onTouchEnd={(e) => { e.preventDefault(); triggerVirtualKey('KeyW', false); }}
                  className={`dpad-btn ${activeKeys.up ? 'active' : ''}`}
                  title="Move Up (W / ↑)"
                >
                  <ChevronUp size={15} />
                </button>
                <div />

                <button
                  onMouseDown={() => triggerVirtualKey('KeyA', true)}
                  onMouseUp={() => triggerVirtualKey('KeyA', false)}
                  onMouseLeave={() => triggerVirtualKey('KeyA', false)}
                  onTouchStart={(e) => { e.preventDefault(); triggerVirtualKey('KeyA', true); }}
                  onTouchEnd={(e) => { e.preventDefault(); triggerVirtualKey('KeyA', false); }}
                  className={`dpad-btn ${activeKeys.left ? 'active' : ''}`}
                  title="Move Left (A / ←)"
                >
                  <ChevronLeft size={15} />
                </button>

                <button
                  onMouseDown={() => triggerVirtualKey('KeyS', true)}
                  onMouseUp={() => triggerVirtualKey('KeyS', false)}
                  onMouseLeave={() => triggerVirtualKey('KeyS', false)}
                  onTouchStart={(e) => { e.preventDefault(); triggerVirtualKey('KeyS', true); }}
                  onTouchEnd={(e) => { e.preventDefault(); triggerVirtualKey('KeyS', false); }}
                  className={`dpad-btn ${activeKeys.down ? 'active' : ''}`}
                  title="Move Down (S / ↓)"
                >
                  <ChevronDown size={15} />
                </button>

                <button
                  onMouseDown={() => triggerVirtualKey('KeyD', true)}
                  onMouseUp={() => triggerVirtualKey('KeyD', false)}
                  onMouseLeave={() => triggerVirtualKey('KeyD', false)}
                  onTouchStart={(e) => { e.preventDefault(); triggerVirtualKey('KeyD', true); }}
                  onTouchEnd={(e) => { e.preventDefault(); triggerVirtualKey('KeyD', false); }}
                  className={`dpad-btn ${activeKeys.right ? 'active' : ''}`}
                  title="Move Right (D / →)"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Virtual Action Button & Play Pause */}
            <div className="flex items-center gap-1.5">
              <button
                onMouseDown={() => triggerVirtualKey('Space', true)}
                onMouseUp={() => triggerVirtualKey('Space', false)}
                onMouseLeave={() => triggerVirtualKey('Space', false)}
                onTouchStart={(e) => { e.preventDefault(); triggerVirtualKey('Space', true); }}
                onTouchEnd={(e) => { e.preventDefault(); triggerVirtualKey('Space', false); }}
                onClick={() => {
                  if (stateMachineRef.current) {
                    stateMachineRef.current.setParameters({ isAttacking: true });
                  }
                }}
                className={`action-space-btn ${activeKeys.action || activeStateId === 'Action' ? 'active' : ''}`}
                title="Trigger Action State (Space)"
              >
                <Zap size={14} className={activeKeys.action || activeStateId === 'Action' ? 'fill-current' : 'text-amber-400'} />
                <span>Action (Space)</span>
              </button>

              <button
                onClick={togglePlay}
                className="btn btn-secondary px-2.5 py-1.5 text-xs flex items-center gap-1"
                title={isPlaying ? 'Pause Animation' : 'Play Animation'}
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              </button>
            </div>
          </div>
        )}

        {/* Clip Mode Play / Pause / Step Bar */}
        {previewMode === 'clip' && (
          <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-lg border border-white/10">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const prev = (currentFrameIndex - 1 + activeFrames.length) % activeFrames.length;
                  setFrameIndex(prev);
                  onSelectFrame?.(activeFrames[prev]?.id);
                }}
                disabled={activeFrames.length <= 1}
                className="btn-icon p-1.5 text-slate-400 hover:text-white disabled:opacity-30"
                title="Previous Frame"
              >
                <SkipBack size={14} />
              </button>

              <button
                onClick={togglePlay}
                disabled={activeFrames.length === 0}
                className="btn btn-primary px-3 py-1 text-xs rounded-md shadow"
                title={isPlaying ? 'Pause' : 'Play Animation'}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={() => {
                  const next = (currentFrameIndex + 1) % activeFrames.length;
                  setFrameIndex(next);
                  onSelectFrame?.(activeFrames[next]?.id);
                }}
                disabled={activeFrames.length <= 1}
                className="btn-icon p-1.5 text-slate-400 hover:text-white disabled:opacity-30"
                title="Next Frame"
              >
                <SkipForward size={14} />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`btn-icon p-1.5 ${isLooping ? 'text-blue-400 bg-blue-500/15' : 'text-slate-500'}`}
                title="Toggle Loop"
              >
                <Repeat size={14} />
              </button>

              <button
                onClick={() => setOnionSkin(!onionSkin)}
                className={`btn-icon p-1.5 ${onionSkin ? 'text-amber-400 bg-amber-500/15' : 'text-slate-500'}`}
                title="Toggle Onion Skinning"
              >
                <Eye size={14} />
              </button>
            </div>
          </div>
        )}

        {/* FPS Slider & Background Mode */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[10px] font-mono text-slate-400 w-12 flex-shrink-0">
              {fps} FPS
            </span>
            <input
              type="range"
              min="1"
              max="30"
              value={fps}
              onChange={(e) => setFps(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Background Toggle */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-white/10">
            <button
              onClick={() => setBgStyle('checkerboard')}
              className={`w-4 h-4 rounded bg-checkerboard border border-white/20 transition-all ${
                bgStyle === 'checkerboard' ? 'ring-2 ring-blue-400 opacity-100' : 'opacity-50 hover:opacity-100'
              }`}
              title="Checkerboard background (Transparent)"
            />
            <button
              onClick={() => setBgStyle('dark')}
              className={`w-4 h-4 rounded bg-slate-950 ${bgStyle === 'dark' ? 'ring-1 ring-blue-400' : 'opacity-60'}`}
              title="Dark background"
            />
            <button
              onClick={() => setBgStyle('light')}
              className={`w-4 h-4 rounded bg-slate-200 ${bgStyle === 'light' ? 'ring-1 ring-blue-400' : 'opacity-60'}`}
              title="Light background"
            />
            <button
              onClick={() => setBgStyle('green')}
              className={`w-4 h-4 rounded bg-emerald-700 ${bgStyle === 'green' ? 'ring-1 ring-blue-400' : 'opacity-60'}`}
              title="Green screen background"
            />
          </div>
        </div>
      </div>

      {/* State Graph Modal */}
      {isGraphModalOpen && (
        <StateGraphModal
          isOpen={isGraphModalOpen}
          onClose={() => setIsGraphModalOpen(false)}
          graphConfig={graphConfig}
          onUpdateGraphConfig={setCustomGraphConfig}
          currentActiveStateId={activeStateId}
          animations={animations}
          frames={frames}
        />
      )}
    </div>
  );
}
