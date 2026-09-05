import React, { useRef, useEffect } from 'react';
import { TrackToolbar } from './TrackToolbar';
import { FrameCard } from './FrameCard';
import { EmptyFramesState } from './EmptyFramesState';

/**
 * Right panel of Godot SpriteFrames: Header toolbar and horizontal frame cards track.
 */
export function FramesTrack({
  imageElement,
  sheetMap,
  frames = [],
  activeAnimation,
  activeFrames = [],
  selectedFrameId,
  selectedIndexInAnimation,
  isPreviewPlaying,
  previewFrameIdx,
  onTogglePlay,
  onSelectFrame,
  onUpdateAnimation,
  onAddFrameToAnimation,
  onRemoveFrameFromAnimation,
  onReorderAnimationFrames
}) {
  const scrollRef = useRef(null);

  // Auto-scroll timeline to active/selected frame
  useEffect(() => {
    if (selectedFrameId && scrollRef.current) {
      const activeEl = scrollRef.current.querySelector(`[data-frame-id="${selectedFrameId}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedFrameId]);

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-900/40">
      {/* Track Header Toolbar */}
      <TrackToolbar
        activeAnimation={activeAnimation}
        activeFramesCount={activeFrames.length}
        hasSlicedFrames={frames.length > 0}
        selectedFrameId={selectedFrameId}
        selectedIndexInAnimation={selectedIndexInAnimation}
        isPreviewPlaying={isPreviewPlaying}
        onTogglePlay={onTogglePlay}
        onUpdateFps={(fps) => {
          if (activeAnimation) onUpdateAnimation?.(activeAnimation.id, { fps });
        }}
        onUpdateLoop={(loop) => {
          if (activeAnimation) onUpdateAnimation?.(activeAnimation.id, { loop });
        }}
        onAddSelectedFrame={() => {
          if (activeAnimation && selectedFrameId) {
            onAddFrameToAnimation?.(activeAnimation.id, selectedFrameId);
          }
        }}
        onAddAllFrames={() => {
          if (activeAnimation && frames.length > 0) {
            const newIds = [...activeAnimation.frameIds, ...frames.map((f) => f.id)];
            onUpdateAnimation?.(activeAnimation.id, { frameIds: newIds });
          }
        }}
        onReorderLeft={() => {
          if (activeAnimation && selectedIndexInAnimation > 0) {
            onReorderAnimationFrames?.(
              activeAnimation.id,
              selectedIndexInAnimation,
              selectedIndexInAnimation - 1
            );
          }
        }}
        onReorderRight={() => {
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
        onRemoveSelectedFrame={() => {
          if (activeAnimation && selectedIndexInAnimation !== -1) {
            onRemoveFrameFromAnimation?.(activeAnimation.id, selectedIndexInAnimation);
          }
        }}
        onClearAllFrames={() => {
          if (activeAnimation && activeAnimation.frameIds.length > 0) {
            onUpdateAnimation?.(activeAnimation.id, { frameIds: [] });
          }
        }}
      />

      {/* Horizontal Frames Carousel Strip */}
      <div
        ref={scrollRef}
        className="flex-1 flex flex-row items-center gap-2.5 overflow-x-auto overflow-y-hidden px-2.5 py-1.5"
        style={{ width: '100%', minHeight: 0 }}
      >
        {activeFrames.map((frame, idx) => {
          const isSelected = frame.id === selectedFrameId;
          const isPlaybackActive = isPreviewPlaying && previewFrameIdx === idx;

          return (
            <FrameCard
              key={`${frame.id}_${idx}`}
              frame={frame}
              idx={idx}
              isSelected={isSelected}
              isPlaybackActive={isPlaybackActive}
              totalFrames={activeFrames.length}
              imageElement={imageElement}
              sheetMap={sheetMap}
              onSelectFrame={onSelectFrame}
              onMoveEarlier={() => {
                if (idx > 0 && activeAnimation) {
                  onReorderAnimationFrames?.(activeAnimation.id, idx, idx - 1);
                }
              }}
              onMoveLater={() => {
                if (idx < activeFrames.length - 1 && activeAnimation) {
                  onReorderAnimationFrames?.(activeAnimation.id, idx, idx + 1);
                }
              }}
              onRemove={() => {
                if (activeAnimation) {
                  onRemoveFrameFromAnimation?.(activeAnimation.id, idx);
                }
              }}
            />
          );
        })}

        {/* Empty State when active animation has no frames */}
        {activeFrames.length === 0 && (
          <EmptyFramesState
            animationName={activeAnimation?.name}
            hasSelectedFrame={Boolean(selectedFrameId)}
            hasSlicedFrames={frames.length > 0}
            onAddSelected={() => {
              if (activeAnimation && selectedFrameId) {
                onAddFrameToAnimation?.(activeAnimation.id, selectedFrameId);
              }
            }}
            onAddAll={() => {
              if (activeAnimation && frames.length > 0) {
                onUpdateAnimation?.(activeAnimation.id, {
                  frameIds: frames.map((f) => f.id)
                });
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
