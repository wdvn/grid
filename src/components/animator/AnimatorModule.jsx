import React from 'react';
import { CanvasWorkspace } from '../CanvasWorkspace';
import { FrameProperties } from '../FrameProperties';
import { AnimationPreview } from '../AnimationPreview';
import { FrameTimeline } from '../FrameTimeline';

export function AnimatorModule({
  // Sheet & Image State
  imageSrc,
  imageDimensions,
  imageElement,
  sheets,
  sheetMap,
  activeSheetId,
  onSelectSheet,
  onAddSheetFile,
  onAddSheetPreset,
  onDeleteSheet,
  onRenameSheet,

  // Frames & Selection
  frames,
  selectedFrameId,
  selectedFrameIds,
  onSelectFrame,
  onAddFrame,
  onUpdateFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onMoveFrameOrder,
  onSelectAllFrames,
  onDeselectAllFrames,
  onAutoDetect,
  onOpenQuickGrid,
  onFileUpload,
  onOpenImportAtlasModal,

  // Animations & Playback
  animations,
  selectedAnimationId,
  onSelectAnimation,
  onAddAnimation,
  onDuplicateAnimation,
  onDeleteAnimation,
  onUpdateAnimation,
  onApplySelectedFrames,
  handleAddSelectedFrames,
  handleAddSheetFrames,
  onAddFrameToAnimation,
  onRemoveFrameFromAnimation,
  onReorderAnimationFrames,
  previewMode,
  onPreviewModeChange,
  isAnimationPlaying,
  onTogglePlay,
  playbackFrameIndex,
  onFrameIndexChange
}) {
  const activeAnimation = animations.find((a) => a.id === selectedAnimationId) || animations[0];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Main 3-Column Studio Workspace */}
      <main className="main-workspace flex-1 overflow-hidden">
        {/* Left Column: Frame Properties & Pivot Inspector */}
        <FrameProperties
          frames={frames}
          selectedFrameId={selectedFrameId}
          selectedFrameIds={selectedFrameIds}
          activeAnimation={activeAnimation}
          activeSheetId={activeSheetId}
          onSelectFrame={onSelectFrame}
          onSelectAllFrames={onSelectAllFrames}
          onDeselectAllFrames={onDeselectAllFrames}
          onApplySelectedToAnimation={onApplySelectedFrames}
          onAddSelectedToAnimation={handleAddSelectedFrames}
          onUpdateFrame={onUpdateFrame}
          onDuplicateFrame={onDuplicateFrame}
          onDeleteFrame={onDeleteFrame}
          onMoveFrameOrder={onMoveFrameOrder}
          imageDimensions={imageDimensions}
          sheetMap={sheetMap}
        />

        {/* Center Column: Interactive Sprite Sheet Canvas with Multi-Sheet Tab Bar */}
        <CanvasWorkspace
          imageSrc={imageSrc}
          imageDimensions={imageDimensions}
          frames={frames}
          selectedFrameId={selectedFrameId}
          selectedFrameIds={selectedFrameIds}
          onSelectFrame={onSelectFrame}
          onAddFrame={onAddFrame}
          onUpdateFrame={onUpdateFrame}
          onAutoDetect={onAutoDetect}
          onOpenQuickGrid={onOpenQuickGrid}
          onFileUpload={onFileUpload}
          onOpenImportAtlasModal={onOpenImportAtlasModal}
          sheets={sheets}
          activeSheetId={activeSheetId}
          onSelectSheet={onSelectSheet}
          onAddSheetFile={onAddSheetFile}
          onAddSheetPreset={onAddSheetPreset}
          onDeleteSheet={onDeleteSheet}
          onRenameSheet={onRenameSheet}
        />

        {/* Right Column: Animation Preview Player with Cross-Sheet Character Mode */}
        <AnimationPreview
          imageElement={imageElement}
          sheets={sheets}
          sheetMap={sheetMap}
          frames={frames}
          selectedFrameId={selectedFrameId}
          selectedFrameIds={selectedFrameIds}
          onSelectFrame={onSelectFrame}
          animations={animations}
          selectedAnimationId={selectedAnimationId}
          onSelectAnimation={onSelectAnimation}
          previewMode={previewMode}
          onPreviewModeChange={onPreviewModeChange}
          isPlaying={isAnimationPlaying}
          onTogglePlay={onTogglePlay}
          currentFrameIndex={playbackFrameIndex}
          onFrameIndexChange={onFrameIndexChange}
        />
      </main>

      {/* Bottom Timeline Strip (Godot SpriteFrames Bottom Dock) */}
      <footer className="app-timeline">
        <FrameTimeline
          imageElement={imageElement}
          sheetMap={sheetMap}
          frames={frames}
          selectedFrameId={selectedFrameId}
          selectedFrameIds={selectedFrameIds}
          activeSheetId={activeSheetId}
          onSelectFrame={onSelectFrame}
          onDuplicateFrame={onDuplicateFrame}
          onDeleteFrame={onDeleteFrame}
          onMoveFrameOrder={onMoveFrameOrder}
          animations={animations}
          selectedAnimationId={selectedAnimationId}
          onSelectAnimation={onSelectAnimation}
          onAddAnimation={onAddAnimation}
          onDuplicateAnimation={onDuplicateAnimation}
          onDeleteAnimation={onDeleteAnimation}
          onUpdateAnimation={onUpdateAnimation}
          onApplySelectedFrames={onApplySelectedFrames}
          onAddSelectedFrames={handleAddSelectedFrames}
          onAddSheetFrames={handleAddSheetFrames}
          onAddFrameToAnimation={onAddFrameToAnimation}
          onRemoveFrameFromAnimation={onRemoveFrameFromAnimation}
          onReorderAnimationFrames={onReorderAnimationFrames}
          isPlaying={isAnimationPlaying}
          onTogglePlay={onTogglePlay}
          playbackFrameIndex={playbackFrameIndex}
        />
      </footer>
    </div>
  );
}
