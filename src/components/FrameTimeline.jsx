import React, { useState, useEffect, useMemo } from 'react';
import { resolveAnimationFrames } from '../utils/animationClips';
import { AnimationsList, FramesTrack } from './spriteframes';

/**
 * Godot-Style SpriteFrames Dock (Bottom Timeline)
 * Modularized orchestrator coordinating animations list, frame sequence track, and dock player.
 */
export function FrameTimeline({
  imageElement,
  sheetMap,
  frames = [],
  selectedFrameId,
  onSelectFrame,
  animations = [],
  selectedAnimationId,
  onSelectAnimation,
  onAddAnimation,
  onDuplicateAnimation,
  onDeleteAnimation,
  onUpdateAnimation,
  onAddFrameToAnimation,
  onRemoveFrameFromAnimation,
  onReorderAnimationFrames,
  isPlaying: controlledIsPlaying,
  onTogglePlay,
  playbackFrameIndex: controlledFrameIndex
}) {
  // Active animation object
  const activeAnimation = useMemo(() => {
    return (
      animations.find((a) => a.id === selectedAnimationId) ||
      animations[0] ||
      null
    );
  }, [animations, selectedAnimationId]);

  // Sliced frames belonging to the active animation
  const activeFrames = useMemo(() => {
    return resolveAnimationFrames(activeAnimation, frames);
  }, [activeAnimation, frames]);

  // Index of currently selected frame in active animation
  const selectedIndexInAnimation = useMemo(() => {
    if (!activeAnimation || !selectedFrameId) return -1;
    return activeAnimation.frameIds.indexOf(selectedFrameId);
  }, [activeAnimation, selectedFrameId]);

  // Dock inline playback preview state (synchronized with AnimationPreview)
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [localFrameIdx, setLocalFrameIdx] = useState(0);

  const isPreviewPlaying = controlledIsPlaying !== undefined ? controlledIsPlaying : localIsPlaying;
  const previewFrameIdx = controlledFrameIndex !== undefined ? controlledFrameIndex : localFrameIdx;
  const togglePlay = onTogglePlay || (() => setLocalIsPlaying((prev) => !prev));

  // Local timer fallback only when uncontrolled
  useEffect(() => {
    if (controlledIsPlaying !== undefined) return;
    if (!localIsPlaying || activeFrames.length === 0) {
      setLocalFrameIdx(0);
      return;
    }

    const fps = activeAnimation?.fps || 10;
    const interval = 1000 / Math.max(1, fps);

    const timer = setInterval(() => {
      setLocalFrameIdx((prev) => {
        if (prev + 1 >= activeFrames.length) {
          if (activeAnimation?.loop === false) {
            setLocalIsPlaying(false);
            return prev;
          }
          return 0;
        }
        return prev + 1;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [controlledIsPlaying, localIsPlaying, activeFrames.length, activeAnimation?.fps, activeAnimation?.loop]);

  return (
    <div className="glass-panel flex flex-row h-full min-h-0 divide-x divide-white/10 overflow-hidden select-none border border-white/10 shadow-2xl">
      {/* Left Column: Animations List */}
        <AnimationsList
          animations={animations}
          activeAnimationId={activeAnimation?.id}
          onSelectAnimation={onSelectAnimation}
          onAddAnimation={onAddAnimation}
          onDuplicateAnimation={onDuplicateAnimation}
          onDeleteAnimation={onDeleteAnimation}
          onUpdateAnimation={onUpdateAnimation}
        />

        {/* Right Column: Animation Frames Track */}
        <FramesTrack
          imageElement={imageElement}
          sheetMap={sheetMap}
          frames={frames}
          activeAnimation={activeAnimation}
          activeFrames={activeFrames}
          selectedFrameId={selectedFrameId}
          selectedIndexInAnimation={selectedIndexInAnimation}
          isPreviewPlaying={isPreviewPlaying}
          previewFrameIdx={previewFrameIdx}
          onTogglePlay={togglePlay}
          onSelectFrame={onSelectFrame}
          onUpdateAnimation={onUpdateAnimation}
          onAddFrameToAnimation={onAddFrameToAnimation}
          onRemoveFrameFromAnimation={onRemoveFrameFromAnimation}
          onReorderAnimationFrames={onReorderAnimationFrames}
        />
    </div>
  );
}
