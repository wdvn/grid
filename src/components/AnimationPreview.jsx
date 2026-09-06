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
  ChevronRight,
  Wind,
  Sparkles
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
  const [motionBlur, setMotionBlur] = useState(false); // Optional motion blur / after-image trail in character mode
  const motionBlurRef = useRef(false);
  useEffect(() => {
    motionBlurRef.current = motionBlur;
  }, [motionBlur]);
  const trailHistoryRef = useRef([]);
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
    if (activeAnimation) {
      if (activeAnimation.frameIds && activeAnimation.frameIds.length > 0) {
        const frameMap = new Map(frames.map((f) => [f.id, f]));
        return activeAnimation.frameIds.map((id) => frameMap.get(id)).filter(Boolean);
      }
      return [];
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
          arenaSizeRef.current = { w, h };
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
    stateMachineRef.current = new CharacterStateMachine(graphConfig, animations, frames);
    activeStateIdRef.current = graphConfig.defaultState || 'Idle';
    setActiveStateId(activeStateIdRef.current);
    charFrameIdxRef.current = 0;
    frameAccRef.current = 0;
  }, [graphConfig]);

  // Keep state machine context dynamically updated with latest animations and frames
  useEffect(() => {
    if (stateMachineRef.current) {
      stateMachineRef.current.setContext(animations, frames);
    }
  }, [animations, frames]);

  // Real-time keyboard input tracking (WASD + Arrows + Space)
  const keysDownRef = useRef(new Set());
  const dirStackRef = useRef([]); // Direction history stack: latest pressed direction has immediate priority
  const btnUpRef = useRef(null);
  const btnDownRef = useRef(null);
  const btnLeftRef = useRef(null);
  const btnRightRef = useRef(null);
  const btnActionRef = useRef(null);

  // Directly update virtual button classes without triggering 60 FPS React re-renders
  const updateKeyVisuals = useCallback((up, down, left, right, action) => {
    btnUpRef.current?.classList.toggle('active', !!up);
    btnDownRef.current?.classList.toggle('active', !!down);
    btnLeftRef.current?.classList.toggle('active', !!left);
    btnRightRef.current?.classList.toggle('active', !!right);
    if (action !== undefined) {
      btnActionRef.current?.classList.toggle('active', !!action);
    }
  }, []);

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

    // Filter stack to only active keys and maintain insertion order
    const stack = dirStackRef.current.filter((d) =>
      (d === 'up' && isUp) ||
      (d === 'down' && isDown) ||
      (d === 'left' && isLeft) ||
      (d === 'right' && isRight)
    );
    if (isUp && !stack.includes('up')) stack.push('up');
    if (isDown && !stack.includes('down')) stack.push('down');
    if (isLeft && !stack.includes('left')) stack.push('left');
    if (isRight && !stack.includes('right')) stack.push('right');
    dirStackRef.current = stack;

    const latestDir = stack.length > 0 ? stack[stack.length - 1] : null;
    const speed = (mx !== 0 || my !== 0) ? 1.0 : 0.0;

    stateMachineRef.current.setParameters({
      speed,
      moveX: mx,
      moveY: my,
      ...(latestDir ? { facingDirection: latestDir } : {})
    });

    updateKeyVisuals(isUp, isDown, isLeft, isRight);
  }, [updateKeyVisuals]);

  // Virtual buttons input helpers (for mouse click & mobile touch)
  const triggerVirtualKey = useCallback((code, isDown) => {
    if (code === 'Space') {
      if (isDown && stateMachineRef.current) {
        stateMachineRef.current.setParameters({ isAttacking: true });
      }
      btnActionRef.current?.classList.toggle('active', isDown);
      return;
    }

    const dirMap = { KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' };
    const dir = dirMap[code];

    if (isDown) {
      keysDownRef.current.add(code);
      if (dir) {
        dirStackRef.current = dirStackRef.current.filter(d => d !== dir);
        dirStackRef.current.push(dir);
      }
    } else {
      keysDownRef.current.delete(code);
      if (dir) {
        dirStackRef.current = dirStackRef.current.filter(d => d !== dir);
      }
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
          btnActionRef.current?.classList.toggle('active', true);
          return;
        }

        const dir = (e.code === 'KeyW' || e.code === 'ArrowUp') ? 'up'
                  : (e.code === 'KeyS' || e.code === 'ArrowDown') ? 'down'
                  : (e.code === 'KeyA' || e.code === 'ArrowLeft') ? 'left'
                  : (e.code === 'KeyD' || e.code === 'ArrowRight') ? 'right' : null;
        if (dir) {
          dirStackRef.current = dirStackRef.current.filter(d => d !== dir);
          dirStackRef.current.push(dir);
        }

        keysDownRef.current.add(e.code);
        updateParametersFromKeys();
      }
    };

    const handleKeyUp = (e) => {
      if (previewMode !== 'character') return;

      if (e.code === 'Space') {
        btnActionRef.current?.classList.toggle('active', false);
        return;
      }

      const dir = (e.code === 'KeyW' || e.code === 'ArrowUp') ? 'up'
                : (e.code === 'KeyS' || e.code === 'ArrowDown') ? 'down'
                : (e.code === 'KeyA' || e.code === 'ArrowLeft') ? 'left'
                : (e.code === 'KeyD' || e.code === 'ArrowRight') ? 'right' : null;
      if (dir) {
        dirStackRef.current = dirStackRef.current.filter(d => d !== dir);
      }

      if (keysDownRef.current.has(e.code)) {
        keysDownRef.current.delete(e.code);
        updateParametersFromKeys();
      }
    };

    const handleBlur = () => {
      keysDownRef.current.clear();
      dirStackRef.current = [];
      updateParametersFromKeys();
      updateKeyVisuals(false, false, false, false, false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [previewMode, updateParametersFromKeys, updateKeyVisuals]);

  // Reset keys on mode switch
  useEffect(() => {
    if (previewMode !== 'character') {
      keysDownRef.current.clear();
      dirStackRef.current = [];
      updateKeyVisuals(false, false, false, false, false);
    }
  }, [previewMode, updateKeyVisuals]);

  // Track last direction to detect directional animation change inside a state
  const lastResolvedDirRef = useRef('down');

  // Direct Character Canvas Drawing Helper (Draws razor-sharp pixelated character in arena)
  const drawCharacterCanvas = useCallback((ctx, canvas, activeFrame) => {
    if (!imageElement || frames.length === 0) return;

    const curArena = arenaSizeRef.current;
    if (canvas.width !== curArena.w) {
      canvas.width = curArena.w;
    }
    if (canvas.height !== curArena.h) {
      canvas.height = curArena.h;
    }
    ctx.imageSmoothingEnabled = false;

    // ALWAYS clean clear the entire canvas on every frame to guarantee ZERO ghosting or leftover smear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

      // Draw Sprite with 100% crisp pixel rendering and no ghost artifacts
      const frameImg = (activeFrame?.sheetId && sheetMap?.get(activeFrame.sheetId)?.imageElement) || imageElement;

      // Optional Motion Blur / After-Image Trail (Only active if toggled ON in Character Mode)
      if (motionBlurRef.current && !isStationary) {
        const trail = trailHistoryRef.current;
        for (let i = 0; i < trail.length; i++) {
          const t = trail[i];
          const alpha = (i + 1) * (0.32 / (trail.length + 1));
          ctx.globalAlpha = alpha;
          ctx.drawImage(
            t.img,
            t.frame.x,
            t.frame.y,
            t.frame.w,
            t.frame.h,
            t.x,
            t.y,
            drawW,
            drawH
          );
        }

        const last = trail[trail.length - 1];
        const moved = !last || Math.hypot(last.x - drawX, last.y - drawY) > 2;
        if (moved) {
          trail.push({ x: drawX, y: drawY, frame: activeFrame, img: frameImg });
          if (trail.length > 4) trail.shift();
        } else if (trail.length > 0) {
          trail.shift();
        }
      } else {
        trailHistoryRef.current = [];
      }

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

      let currentActiveFrame = frames[0] || null;

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
        const currentDir = resolved?.direction || 'down';

        // When direction switches inside a state (WASD BlendSpace2D transform), clamp frame index cleanly
        if (lastResolvedDirRef.current !== currentDir) {
          lastResolvedDirRef.current = currentDir;
          if (currentClip.length > 0) {
            charFrameIdxRef.current = charFrameIdxRef.current % currentClip.length;
          }
        }

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
          const frameForBounds = (currentClip.length > 0 ? currentClip[charFrameIdxRef.current % currentClip.length] : null) || frames[0];
          const halfW = frameForBounds ? (frameForBounds.w * zoomScale) / 2 : 24;
          const halfH = frameForBounds ? (frameForBounds.h * zoomScale) / 2 : 24;
          const pad = 10;

          let nx = charPosRef.current.x + mx * moveSpeed;
          let ny = charPosRef.current.y - my * moveSpeed;

          // Clean clamping prevents character from ever clipping arena borders
          nx = Math.max(halfW + pad, Math.min(curArena.w - halfW - pad, nx));
          ny = Math.max(halfH + pad, Math.min(curArena.h - halfH - pad, ny));

          charPosRef.current.x = nx;
          charPosRef.current.y = ny;
        }

        // Cycle animation frames smoothly using clip's true FPS
        const targetFps = resolved?.fps || fps;
        if (currentClip.length > 1) {
          if (params.speed > 0) {
            frameAccRef.current += dt;
            const frameDuration = 1 / Math.max(1, targetFps);
            if (frameAccRef.current >= frameDuration) {
              const advance = Math.floor(frameAccRef.current / frameDuration);
              frameAccRef.current -= advance * frameDuration;
              charFrameIdxRef.current = (charFrameIdxRef.current + advance) % currentClip.length;
            }
          }
          currentActiveFrame = currentClip[charFrameIdxRef.current] || currentClip[0];
        } else if (currentClip.length === 1) {
          charFrameIdxRef.current = 0;
          frameAccRef.current = 0;
          currentActiveFrame = currentClip[0];
        } else {
          charFrameIdxRef.current = 0;
          frameAccRef.current = 0;
        }
      }

      // Render directly to canvas on every display refresh frame
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          drawCharacterCanvas(ctx, canvasRef.current, currentActiveFrame);
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
    if (!activeFrame || activeFrame.w <= 0 || activeFrame.h <= 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

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
      {/* Header Bar with Mode Switcher Tabs */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => setPreviewMode('character')}
            className={`h-7 flex items-center gap-1.5 px-2.5 text-xs rounded font-semibold transition-all ${
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
            className={`h-7 flex items-center gap-1.5 px-2.5 text-xs rounded font-semibold transition-all ${
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
              className={`badge ${
                activeStateId === 'Action'
                  ? 'badge-amber animate-pulse'
                  : activeStateId === 'Run'
                  ? 'badge-blue'
                  : 'badge-emerald'
              }`}
            >
              {activeStateId}
            </span>
            <button
              onClick={() => setIsGraphModalOpen(true)}
              className="btn btn-secondary h-7 px-2 text-xs font-semibold text-blue-400 border-blue-500/30 hover:bg-blue-500/10 flex items-center gap-1"
              title="Open Animation Graph & State Machine Diagram"
            >
              <Network size={12} />
              <span>Graph</span>
            </button>
          </div>
        ) : (
          <span className="badge badge-emerald">
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
        {previewMode === 'character' || activeFrames.length > 0 ? (
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
          <div className="text-slate-400 text-xs font-mono text-center p-4 flex flex-col items-center gap-1.5">
            <span className="text-blue-300 font-bold">"{activeAnimation?.name || 'Animation'}"</span>
            <span>has no frames yet.</span>
            <span className="text-[11px] text-slate-500">
              Select frames on canvas or list, then click "Apply Selected" in the timeline dock below.
            </span>
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
                  ref={btnUpRef}
                  onMouseDown={() => triggerVirtualKey('KeyW', true)}
                  onMouseUp={() => triggerVirtualKey('KeyW', false)}
                  onMouseLeave={() => triggerVirtualKey('KeyW', false)}
                  onTouchStart={(e) => { e.preventDefault(); triggerVirtualKey('KeyW', true); }}
                  onTouchEnd={(e) => { e.preventDefault(); triggerVirtualKey('KeyW', false); }}
                  className="dpad-btn"
                  title="Move Up (W / ↑)"
                >
                  <ChevronUp size={15} />
                </button>
                <div />

                <button
                  ref={btnLeftRef}
                  onMouseDown={() => triggerVirtualKey('KeyA', true)}
                  onMouseUp={() => triggerVirtualKey('KeyA', false)}
                  onMouseLeave={() => triggerVirtualKey('KeyA', false)}
                  onTouchStart={(e) => { e.preventDefault(); triggerVirtualKey('KeyA', true); }}
                  onTouchEnd={(e) => { e.preventDefault(); triggerVirtualKey('KeyA', false); }}
                  className="dpad-btn"
                  title="Move Left (A / ←)"
                >
                  <ChevronLeft size={15} />
                </button>

                <button
                  ref={btnDownRef}
                  onMouseDown={() => triggerVirtualKey('KeyS', true)}
                  onMouseUp={() => triggerVirtualKey('KeyS', false)}
                  onMouseLeave={() => triggerVirtualKey('KeyS', false)}
                  onTouchStart={(e) => { e.preventDefault(); triggerVirtualKey('KeyS', true); }}
                  onTouchEnd={(e) => { e.preventDefault(); triggerVirtualKey('KeyS', false); }}
                  className="dpad-btn"
                  title="Move Down (S / ↓)"
                >
                  <ChevronDown size={15} />
                </button>

                <button
                  ref={btnRightRef}
                  onMouseDown={() => triggerVirtualKey('KeyD', true)}
                  onMouseUp={() => triggerVirtualKey('KeyD', false)}
                  onMouseLeave={() => triggerVirtualKey('KeyD', false)}
                  onTouchStart={(e) => { e.preventDefault(); triggerVirtualKey('KeyD', true); }}
                  onTouchEnd={(e) => { e.preventDefault(); triggerVirtualKey('KeyD', false); }}
                  className="dpad-btn"
                  title="Move Right (D / →)"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Virtual Action Button, Custom Parameter Controls & Play Pause */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                ref={btnActionRef}
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
                className={`action-space-btn h-7 ${activeStateId === 'Action' ? 'active' : ''}`}
                title="Trigger Action State (Space)"
              >
                <Zap size={13} className={activeStateId === 'Action' ? 'fill-current' : 'text-amber-400'} />
                <span>Action (Space)</span>
              </button>

              {/* Dynamic Parameter Triggers / Toggles (e.g. is_attacked, health, etc.) */}
              {Object.entries(graphConfig.parameters || {})
                .filter(([k]) => !['speed', 'moveX', 'moveY', 'isAttacking'].includes(k))
                .map(([paramKey, defaultVal]) => {
                  const paramType = graphConfig.parameterTypes?.[paramKey] || (typeof defaultVal === 'boolean' ? 'Bool' : 'Float');
                  const isBool = paramType === 'Bool' || paramType === 'Trigger';

                  return (
                    <button
                      key={paramKey}
                      onClick={() => {
                        if (stateMachineRef.current) {
                          if (paramType === 'Trigger') {
                            stateMachineRef.current.setParameters({ [paramKey]: true });
                          } else if (isBool) {
                            const cur = !!stateMachineRef.current.parameters[paramKey];
                            stateMachineRef.current.setParameters({ [paramKey]: !cur });
                          } else {
                            const cur = Number(stateMachineRef.current.parameters[paramKey] || 0);
                            stateMachineRef.current.setParameters({ [paramKey]: cur > 0 ? 0 : 1 });
                          }
                        }
                      }}
                      className="btn h-7 px-2 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 rounded-lg flex items-center gap-1 transition-colors"
                      title={`Trigger/Toggle parameter: ${paramKey}`}
                    >
                      <Sparkles size={11} className="text-purple-400" />
                      <span>{paramKey}</span>
                    </button>
                  );
                })}

              <button
                onClick={togglePlay}
                className="btn btn-secondary h-7 px-2.5 text-xs flex items-center gap-1"
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

        {/* FPS Slider, Motion Blur & Background Mode */}
        <div className="h-7 flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-[10px] font-mono text-slate-400 w-11 flex-shrink-0">
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

          {/* Motion Blur (Character Mode) & Background Toggle */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {previewMode === 'character' && (
              <button
                onClick={() => setMotionBlur((prev) => !prev)}
                className={`h-6 flex items-center gap-1 px-1.5 text-[10px] font-mono rounded border transition-all ${
                  motionBlur
                    ? 'bg-blue-500/20 border-blue-400/60 text-blue-300 font-semibold shadow-sm'
                    : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle Motion Blur / Ghost Trail Effect in Character Mode"
              >
                <Wind size={11} className={motionBlur ? 'text-blue-400' : 'text-slate-500'} />
                <span>Blur</span>
              </button>
            )}

            {/* Background Toggle */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-white/10">
              <button
                onClick={() => setBgStyle('checkerboard')}
                className={`w-3.5 h-3.5 rounded bg-checkerboard border border-white/20 transition-all ${
                  bgStyle === 'checkerboard' ? 'ring-2 ring-blue-400 opacity-100' : 'opacity-50 hover:opacity-100'
                }`}
                title="Checkerboard background (Transparent)"
              />
              <button
                onClick={() => setBgStyle('dark')}
                className={`w-3.5 h-3.5 rounded bg-slate-950 ${bgStyle === 'dark' ? 'ring-1 ring-blue-400' : 'opacity-60'}`}
                title="Dark background"
              />
              <button
                onClick={() => setBgStyle('light')}
                className={`w-3.5 h-3.5 rounded bg-slate-200 ${bgStyle === 'light' ? 'ring-1 ring-blue-400' : 'opacity-60'}`}
                title="Light background"
              />
              <button
                onClick={() => setBgStyle('green')}
                className={`w-3.5 h-3.5 rounded bg-emerald-700 ${bgStyle === 'green' ? 'ring-1 ring-blue-400' : 'opacity-60'}`}
                title="Green screen background"
              />
            </div>
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
