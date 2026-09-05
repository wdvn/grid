import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { FrameProperties } from './components/FrameProperties';
import { AnimationPreview } from './components/AnimationPreview';
import { FrameTimeline } from './components/FrameTimeline';
import { QuickGridModal } from './components/QuickGridModal';
import { ExportModal } from './components/ExportModal';

import { createSampleSpriteSheet, createFoxSpritePreset } from './utils/sampleSprites';
import { autoDetectSprites } from './utils/autoDetectSprites';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { generateDefaultAnimations, createNewAnimation, groupFramesByRows } from './utils/animationClips';

export default function App() {
  // Sprite Sheet Image State
  const [imageSrc, setImageSrc] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [imageElement, setImageElement] = useState(null);

  // Frames & Selection
  const [frames, setFrames] = useState([]);
  const [selectedFrameId, setSelectedFrameId] = useState(null);

  // Godot SpriteFrames Animations State
  const [animations, setAnimations] = useState([]);
  const [selectedAnimationId, setSelectedAnimationId] = useState(null);

  // Synchronized Preview Mode & Playback State between Dock and AnimationPreview
  const [previewMode, setPreviewMode] = useState('character');
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(true);
  const [playbackFrameIndex, setPlaybackFrameIndex] = useState(0);

  // Modals
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Load Fox Run sample on first render as requested
  useEffect(() => {
    const foxPreset = createFoxSpritePreset('fox_run');
    loadSpriteImage(foxPreset.dataUrl, foxPreset.initialFrames);
  }, []);

  // Helper to load image & measure dimensions
  const loadSpriteImage = useCallback((src, initialFrames = null) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageElement(img);
      setImageSrc(src);
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });

      if (initialFrames && initialFrames.length > 0) {
        setFrames(initialFrames);
        setSelectedFrameId(initialFrames[0]?.id || null);
        const anims = generateDefaultAnimations(initialFrames);
        setAnimations(anims);
        setSelectedAnimationId(anims[0]?.id || null);
      } else {
        // Run auto-detect on loaded image first!
        const detected = autoDetectSprites(img, 10, 1);
        if (detected.length > 0) {
          const newFrames = detected.map((box, i) => ({
            id: `auto_${Date.now()}_${i}`,
            name: `frame_${i + 1}`,
            x: box.x,
            y: box.y,
            w: box.w,
            h: box.h,
            pivotX: 0.5,
            pivotY: 0.5
          }));
          setFrames(newFrames);
          setSelectedFrameId(newFrames[0]?.id || null);
          const anims = generateDefaultAnimations(newFrames);
          setAnimations(anims);
          setSelectedAnimationId(anims[0]?.id || null);
        } else {
          // Fallback to 4 grid frames if image is fully transparent or solid
          const defaultW = Math.min(64, Math.floor(img.naturalWidth / 4) || 32);
          const defaultH = Math.min(64, img.naturalHeight);
          const defaultFrames = [];
          const count = Math.min(4, Math.floor(img.naturalWidth / defaultW));

          for (let i = 0; i < count; i++) {
            defaultFrames.push({
              id: `frame_${Date.now()}_${i}`,
              name: `frame_${i + 1}`,
              x: i * defaultW,
              y: 0,
              w: defaultW,
              h: defaultH,
              pivotX: 0.5,
              pivotY: 0.5
            });
          }
          setFrames(defaultFrames);
          setSelectedFrameId(defaultFrames[0]?.id || null);
          const anims = generateDefaultAnimations(defaultFrames);
          setAnimations(anims);
          setSelectedAnimationId(anims[0]?.id || null);
        }
      }
    };
    img.src = src;
  }, []);

  // File Upload handler
  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      loadSpriteImage(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Add a new frame manually
  const handleAddFrame = (frameData) => {
    const newFrame = {
      id: `frame_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: `frame_${frames.length + 1}`,
      pivotX: 0.5,
      pivotY: 0.5,
      ...frameData
    };
    setFrames((prev) => [...prev, newFrame]);
    setSelectedFrameId(newFrame.id);
  };

  // Update existing frame
  const handleUpdateFrame = (id, updates) => {
    setFrames((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  // Duplicate Frame adjacent right (Ctrl+D logic)
  const handleDuplicateFrame = useCallback((targetId) => {
    const frameToDup = frames.find((f) => f.id === targetId) || frames.find((f) => f.id === selectedFrameId);
    if (!frameToDup) return;

    let newX = frameToDup.x + frameToDup.w;
    let newY = frameToDup.y;

    // Wrap to next line if exceeding image width
    if (newX + frameToDup.w > imageDimensions.width) {
      newX = 0;
      newY = frameToDup.y + frameToDup.h;
    }

    // Keep within bounds
    if (newY + frameToDup.h > imageDimensions.height) {
      newY = Math.max(0, imageDimensions.height - frameToDup.h);
    }

    const newFrame = {
      ...frameToDup,
      id: `frame_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: `${frameToDup.name || 'frame'}_copy`,
      x: newX,
      y: newY
    };

    setFrames((prev) => {
      const idx = prev.findIndex((f) => f.id === frameToDup.id);
      if (idx !== -1) {
        const next = [...prev];
        next.splice(idx + 1, 0, newFrame);
        return next;
      }
      return [...prev, newFrame];
    });

    // Also insert into active animation if it contains the source frame
    setAnimations((prev) =>
      prev.map((a) => {
        if (a.id !== selectedAnimationId) return a;
        const fIdx = a.frameIds.indexOf(frameToDup.id);
        if (fIdx !== -1) {
          const nextIds = [...a.frameIds];
          nextIds.splice(fIdx + 1, 0, newFrame.id);
          return { ...a, frameIds: nextIds };
        }
        return a;
      })
    );

    setSelectedFrameId(newFrame.id);
  }, [frames, selectedFrameId, imageDimensions, selectedAnimationId]);

  // Delete Frame
  const handleDeleteFrame = useCallback((id) => {
    setFrames((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (selectedFrameId === id) {
        setSelectedFrameId(next[0]?.id || null);
      }
      return next;
    });
    setAnimations((prev) =>
      prev.map((a) => ({
        ...a,
        frameIds: a.frameIds.filter((fId) => fId !== id)
      }))
    );
  }, [selectedFrameId]);

  // Nudge Frame by pixel delta
  const handleNudgeFrame = useCallback((id, dx, dy) => {
    setFrames((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const newX = Math.max(0, Math.min(imageDimensions.width - f.w, f.x + dx));
        const newY = Math.max(0, Math.min(imageDimensions.height - f.h, f.y + dy));
        return { ...f, x: newX, y: newY };
      })
    );
  }, [imageDimensions]);

  // Move frame order index
  const handleMoveFrameOrder = (id, direction) => {
    setFrames((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx === -1) return prev;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;

      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  };

  // Auto detect non-transparent sprites (always grouped strictly by rows)
  const handleAutoDetect = () => {
    if (!imageElement) return;
    const detected = autoDetectSprites(imageElement, 10, 1);
    if (detected.length > 0) {
      const rows = groupFramesByRows(detected);
      const is4Way = rows.length === 4;
      const dirLabels = ['down', 'up', 'right', 'left'];

      const newFrames = [];
      let globalIdx = 0;

      rows.forEach((row, rowIdx) => {
        row.forEach((box, colIdx) => {
          globalIdx++;
          const name = is4Way
            ? `fox_run_${dirLabels[rowIdx]}_${colIdx + 1}`
            : `sprite_r${rowIdx + 1}_${colIdx + 1}`;

          newFrames.push({
            id: `auto_${Date.now()}_${globalIdx}`,
            name,
            x: box.x,
            y: box.y,
            w: box.w,
            h: box.h,
            pivotX: 0.5,
            pivotY: 0.85,
            row: rowIdx
          });
        });
      });

      setFrames(newFrames);
      setSelectedFrameId(newFrames[0]?.id || null);
      const anims = generateDefaultAnimations(newFrames);
      setAnimations(anims);
      setSelectedAnimationId(anims[0]?.id || null);
    }
  };

  // Quick Grid application
  const handleApplyGrid = (newFrames, clearExisting) => {
    if (clearExisting) {
      setFrames(newFrames);
      const anims = generateDefaultAnimations(newFrames);
      setAnimations(anims);
      setSelectedAnimationId(anims[0]?.id || null);
    } else {
      setFrames((prev) => [...prev, ...newFrames]);
    }
    if (newFrames.length > 0) {
      setSelectedFrameId(newFrames[0].id);
    }
  };

  // Clear all workspace sprites and animations
  const handleClearAll = useCallback(() => {
    setImageSrc(null);
    setImageElement(null);
    setFrames([]);
    setSelectedFrameId(null);
    setAnimations([]);
    setSelectedAnimationId(null);
  }, []);

  // Godot SpriteFrames Animation Handlers
  const handleAddAnimation = useCallback((customName) => {
    const name = customName || `anim_${animations.length + 1}`;
    const newAnim = createNewAnimation(name, selectedFrameId ? [selectedFrameId] : [], 10, true);
    setAnimations((prev) => [...prev, newAnim]);
    setSelectedAnimationId(newAnim.id);
    return newAnim;
  }, [animations.length, selectedFrameId]);

  const handleDuplicateAnimation = useCallback((animId) => {
    const target = animations.find((a) => a.id === animId);
    if (!target) return;
    const newAnim = {
      ...target,
      id: `anim_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: `${target.name}_copy`,
      frameIds: [...target.frameIds]
    };
    setAnimations((prev) => {
      const idx = prev.findIndex((a) => a.id === animId);
      const next = [...prev];
      next.splice(idx + 1, 0, newAnim);
      return next;
    });
    setSelectedAnimationId(newAnim.id);
  }, [animations]);

  const handleDeleteAnimation = useCallback((animId) => {
    if (animations.length <= 1) return;
    setAnimations((prev) => {
      const next = prev.filter((a) => a.id !== animId);
      if (selectedAnimationId === animId) {
        setSelectedAnimationId(next[0]?.id || null);
      }
      return next;
    });
  }, [animations.length, selectedAnimationId]);

  const handleUpdateAnimation = useCallback((animId, updates) => {
    setAnimations((prev) =>
      prev.map((a) => (a.id === animId ? { ...a, ...updates } : a))
    );
  }, []);

  const handleAddFrameToAnimation = useCallback((animId, frameId) => {
    if (!frameId) return;
    setAnimations((prev) =>
      prev.map((a) => {
        if (a.id !== animId) return a;
        return { ...a, frameIds: [...a.frameIds, frameId] };
      })
    );
  }, []);

  const handleRemoveFrameFromAnimation = useCallback((animId, frameIndex) => {
    setAnimations((prev) =>
      prev.map((a) => {
        if (a.id !== animId) return a;
        const nextIds = [...a.frameIds];
        nextIds.splice(frameIndex, 1);
        return { ...a, frameIds: nextIds };
      })
    );
  }, []);

  const handleReorderAnimationFrames = useCallback((animId, fromIndex, toIndex) => {
    setAnimations((prev) =>
      prev.map((a) => {
        if (a.id !== animId) return a;
        const nextIds = [...a.frameIds];
        if (toIndex < 0 || toIndex >= nextIds.length) return a;
        const [moved] = nextIds.splice(fromIndex, 1);
        nextIds.splice(toIndex, 0, moved);
        return { ...a, frameIds: nextIds };
      })
    );
  }, []);

  // Synchronized animation selection: switches preview directly to clip mode and plays it
  const handleSelectAnimation = useCallback((animId) => {
    setSelectedAnimationId(animId);
    setPreviewMode('clip');
    setPlaybackFrameIndex(0);
    setIsAnimationPlaying(true);
  }, []);

  // Synchronized Play/Pause toggle: ensures preview is in clip mode and toggles playback
  const handleTogglePlay = useCallback(() => {
    setIsAnimationPlaying((prev) => {
      const next = !prev;
      if (next) {
        setPreviewMode('clip');
      }
      return next;
    });
  }, []);

  // Setup Global Keyboard Shortcuts
  useKeyboardShortcuts({
    selectedFrameId,
    frames,
    onDuplicateFrame: handleDuplicateFrame,
    onDeleteFrame: handleDeleteFrame,
    onNudgeFrame: handleNudgeFrame,
    onSelectAll: () => setSelectedFrameId(frames[0]?.id || null),
    onDeselectAll: () => setSelectedFrameId(null),
    onPasteImage: (pastedSrc) => loadSpriteImage(pastedSrc)
  });

  return (
    <div className="app-container">
      {/* Top Header Navbar */}
      <Header
        imageSrc={imageSrc}
        onFileUpload={handleFileUpload}
        onLoadSample={(sample) => loadSpriteImage(sample.dataUrl, sample.initialFrames)}
        onClear={handleClearAll}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        frameCount={frames.length}
      />

      {/* Main 3-Column Studio Workspace */}
      <main className="main-workspace">
        {/* Left Column: Frame Properties & Pivot Inspector */}
        <FrameProperties
          selectedFrame={frames.find((f) => f.id === selectedFrameId)}
          selectedIndex={frames.findIndex((f) => f.id === selectedFrameId)}
          totalFrames={frames.length}
          onUpdateFrame={handleUpdateFrame}
          onDuplicateFrame={handleDuplicateFrame}
          onDeleteFrame={handleDeleteFrame}
          imageDimensions={imageDimensions}
          frames={frames}
          onSelectFrame={setSelectedFrameId}
        />

        {/* Center Column: Interactive Sprite Sheet Canvas */}
        <CanvasWorkspace
          imageSrc={imageSrc}
          imageDimensions={imageDimensions}
          frames={frames}
          selectedFrameId={selectedFrameId}
          onSelectFrame={setSelectedFrameId}
          onAddFrame={handleAddFrame}
          onUpdateFrame={handleUpdateFrame}
          onAutoDetect={handleAutoDetect}
          onOpenQuickGrid={() => setIsGridModalOpen(true)}
          onFileUpload={handleFileUpload}
        />

        {/* Right Column: Animation Preview Player */}
        <AnimationPreview
          imageElement={imageElement}
          frames={frames}
          selectedFrameId={selectedFrameId}
          onSelectFrame={setSelectedFrameId}
          animations={animations}
          selectedAnimationId={selectedAnimationId}
          onSelectAnimation={handleSelectAnimation}
          previewMode={previewMode}
          onPreviewModeChange={setPreviewMode}
          isPlaying={isAnimationPlaying}
          onTogglePlay={handleTogglePlay}
          currentFrameIndex={playbackFrameIndex}
          onFrameIndexChange={setPlaybackFrameIndex}
        />
      </main>

      {/* Bottom Timeline Strip (Godot SpriteFrames Bottom Dock) */}
      <footer className="app-timeline">
        <FrameTimeline
          imageElement={imageElement}
          frames={frames}
          selectedFrameId={selectedFrameId}
          onSelectFrame={setSelectedFrameId}
          onDuplicateFrame={handleDuplicateFrame}
          onDeleteFrame={handleDeleteFrame}
          onMoveFrameOrder={handleMoveFrameOrder}
          animations={animations}
          selectedAnimationId={selectedAnimationId}
          onSelectAnimation={handleSelectAnimation}
          onAddAnimation={handleAddAnimation}
          onDuplicateAnimation={handleDuplicateAnimation}
          onDeleteAnimation={handleDeleteAnimation}
          onUpdateAnimation={handleUpdateAnimation}
          onAddFrameToAnimation={handleAddFrameToAnimation}
          onRemoveFrameFromAnimation={handleRemoveFrameFromAnimation}
          onReorderAnimationFrames={handleReorderAnimationFrames}
          isPlaying={isAnimationPlaying}
          onTogglePlay={handleTogglePlay}
          playbackFrameIndex={playbackFrameIndex}
        />
      </footer>

      {/* Modals */}
      <QuickGridModal
        isOpen={isGridModalOpen}
        onClose={() => setIsGridModalOpen(false)}
        imageDimensions={imageDimensions}
        onApplyGrid={handleApplyGrid}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        imageElement={imageElement}
        imageDimensions={imageDimensions}
        imageSrc={imageSrc}
        frames={frames}
      />
    </div>
  );
}
