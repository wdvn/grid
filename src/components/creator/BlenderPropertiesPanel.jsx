import React, { useState, useRef, useEffect } from 'react';
import {
  Palette,
  Sliders,
  Maximize2,
  Sparkles,
  RotateCcw,
  Check,
  Grid3X3,
  Layers,
  Pipette,
  SlidersHorizontal,
  Bone as BoneIcon,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Link,
  Combine,
  Scissors
} from 'lucide-react';
import { PALETTES } from '../../utils/pixelFilters';
import { RIG_PRESETS, BLEND_MODES } from '../../utils/skeletonRig';

function LayerThumbnail({ canvas }) {
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
      width={24}
      height={24}
      className="w-6 h-6 object-contain rounded-[2px] bg-slate-950 border border-white/10"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

export function BlenderPropertiesPanel({
  activePaletteId,
  onSelectPalette,
  activeColor,
  onSelectColor,
  customColors = [],
  onAddCustomColor,
  filterSettings,
  onUpdateFilterSettings,
  onApplyFilters,
  onResetFilters,
  resolutionW,
  resolutionH,
  onChangeResolution,
  onGeneratePreset,
  // Layers
  layers = [],
  activeLayerId,
  onAddLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onReorderLayer,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onToggleAlphaLock,
  onChangeLayerBlendMode,
  onToggleClipping,
  onClearActiveCel,
  onChangeLayerOpacity,
  onMergeLayerDown,
  onRenameLayer,
  onSelectLayer,
  // Rig
  editorMode = 'draw',
  onSelectEditorMode,
  bones = [],
  selectedBoneId,
  onSelectBoneId,
  onUpdateBones,
  onSelectRigPreset,
  onResetPose,
  onBindLayerToBone,
  onAutoBindLayers,
  onAutoSegmentToLayers,
  onBakePoseToNewFrame,
  onApplyPoseToCurrentFrame
}) {
  // Blender-style Properties Tabs: 'layers' | 'rig' | 'color' | 'modifiers' | 'canvas' | 'generator'
  const [activeTab, setActiveTab] = useState('layers');
  const [editingLayerNameId, setEditingLayerNameId] = useState(null);
  const [editingNameValue, setEditingNameValue] = useState('');

  const currentPalette = PALETTES[activePaletteId] || PALETTES.pico8;

  // Selected Bone Object
  const selectedBone = bones.find((b) => b.id === selectedBoneId) || bones[0] || null;
  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0] || null;

  // Convert [r, g, b] array to hex
  const rgbToHex = (rgb) => {
    const hex = rgb.map((c) => c.toString(16).padStart(2, '0')).join('');
    return `#${hex}`;
  };

  const handleSliderChange = (field, val) => {
    onUpdateFilterSettings({
      ...filterSettings,
      [field]: Number(val)
    });
  };

  const outlineOptions = [
    { label: 'None', value: null, color: 'transparent' },
    { label: 'Black', value: '#000000', color: '#000000' },
    { label: 'White', value: '#ffffff', color: '#ffffff' },
    { label: 'Gold', value: '#f59e0b', color: '#f59e0b' },
    { label: 'Cyan', value: '#06b6d4', color: '#06b6d4' },
    { label: 'Rose', value: '#f43f5e', color: '#f43f5e' }
  ];

  // Handle Bone Rotation change from slider
  const handleBoneRotationChange = (boneId, newDeg) => {
    const updated = bones.map((b) =>
      b.id === boneId ? { ...b, rotation: Math.round(Number(newDeg)) } : b
    );
    onUpdateBones?.(updated);
  };

  return (
    <aside className="w-[290px] flex flex-col h-full bg-[#0d1322] border-l border-white/10 select-none text-slate-200 flex-shrink-0">
      {/* 1. Blender N-Panel Header Tab Bar (Compact 32px height) */}
      <div className="h-8 flex items-center px-1 bg-[#090e1a] border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-0.5 w-full h-full">
          {[
            { id: 'layers', label: 'Layers', icon: Layers, title: 'Layer Stack Manager' },
            { id: 'rig', label: 'Rig', icon: BoneIcon, title: 'Skeleton Rigging & Pose' },
            { id: 'color', label: 'Color', icon: Palette, title: 'Palette & Swatches' },
            { id: 'modifiers', label: 'FX', icon: Sliders, title: 'Pixel FX & Dithering' },
            { id: 'canvas', label: 'Specs', icon: Maximize2, title: 'Resolution & Dimensions' },
            { id: 'generator', label: 'Presets', icon: Sparkles, title: 'Procedural Generators' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'rig' && editorMode !== 'rig') {
                    onSelectEditorMode?.('rig');
                  }
                }}
                className={`flex-1 h-6 flex items-center justify-center gap-1 rounded text-[10px] font-semibold transition-all whitespace-nowrap px-1 ${
                  isActive
                    ? 'bg-blue-600/25 text-blue-400 border border-blue-500/40 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
                title={tab.title}
              >
                <Icon size={11} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Tab Contents Area */}
      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5 custom-scrollbar">
        {/* ========================================================= */}
        {/* TAB 1: LAYERS MANAGER */}
        {/* ========================================================= */}
        {activeTab === 'layers' && (
          <div className="flex flex-col gap-2">
            {/* Layer Stack Header & Actions */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Layers size={11} className="text-purple-400" />
                Layers ({layers.length})
              </span>

              {/* Action Buttons: Add, Duplicate, Delete, Up, Down, Merge */}
              <div className="flex items-center gap-1">
                <button
                  onClick={onAddLayer}
                  className="w-6 h-6 rounded bg-slate-900 border border-white/10 hover:border-blue-400 text-slate-300 hover:text-blue-400 flex items-center justify-center transition-colors"
                  title="Add New Blank Layer"
                >
                  <Plus size={12} />
                </button>
                <button
                  onClick={() => onDuplicateLayer?.(activeLayerId)}
                  className="w-6 h-6 rounded bg-slate-900 border border-white/10 hover:border-white/30 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                  title="Duplicate Active Layer"
                >
                  <Copy size={11} />
                </button>
                <button
                  onClick={() => onMergeLayerDown?.(activeLayerId)}
                  disabled={layers.findIndex((l) => l.id === activeLayerId) <= 0}
                  className="w-6 h-6 rounded bg-slate-900 border border-white/10 hover:border-amber-400 text-slate-300 hover:text-amber-400 flex items-center justify-center transition-colors disabled:opacity-30"
                  title="Merge Layer Down"
                >
                  <Combine size={11} />
                </button>
                <button
                  onClick={() => onReorderLayer?.(activeLayerId, 'up')}
                  disabled={layers.findIndex((l) => l.id === activeLayerId) >= layers.length - 1}
                  className="w-6 h-6 rounded bg-slate-900 border border-white/10 hover:border-white/30 text-slate-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-30"
                  title="Move Layer Up"
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  onClick={() => onReorderLayer?.(activeLayerId, 'down')}
                  disabled={layers.findIndex((l) => l.id === activeLayerId) <= 0}
                  className="w-6 h-6 rounded bg-slate-900 border border-white/10 hover:border-white/30 text-slate-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-30"
                  title="Move Layer Down"
                >
                  <ChevronDown size={12} />
                </button>
                <button
                  onClick={() => onDeleteLayer?.(activeLayerId)}
                  disabled={layers.length <= 1}
                  className="w-6 h-6 rounded bg-slate-900 border border-white/10 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors disabled:opacity-30"
                  title="Delete Active Layer"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>

            {/* Layer Stack Items (Rendered in natural display order: Top layer first) */}
            <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto p-1 bg-slate-950/70 rounded border border-white/10 custom-scrollbar">
              {[...layers].reverse().map((layer) => {
                const isSelected = layer.id === activeLayerId;
                const isEditing = editingLayerNameId === layer.id;

                return (
                  <div
                    key={layer.id}
                    onClick={() => onSelectLayer?.(layer.id)}
                    className={`h-8 px-1.5 rounded flex items-center justify-between gap-1.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-600/20 border border-blue-500/50 text-white shadow-sm'
                        : 'hover:bg-slate-900 border border-transparent text-slate-300'
                    }`}
                  >
                    {/* Left: Thumbnail & Name */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {layer.clipping && (
                        <span className="text-[10px] text-cyan-400 font-mono font-bold pl-0.5" title="Clipping mask applied (clipped into layer below)">↳</span>
                      )}
                      <LayerThumbnail canvas={layer.canvas} />

                      {isEditing ? (
                        <input
                          type="text"
                          value={editingNameValue}
                          autoFocus
                          onChange={(e) => setEditingNameValue(e.target.value)}
                          onBlur={() => {
                            if (editingNameValue.trim()) {
                              onRenameLayer?.(layer.id, editingNameValue.trim());
                            }
                            setEditingLayerNameId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editingNameValue.trim()) {
                                onRenameLayer?.(layer.id, editingNameValue.trim());
                              }
                              setEditingLayerNameId(null);
                            }
                          }}
                          className="bg-slate-900 border border-blue-500 rounded px-1 h-5 text-[11px] text-white w-24 focus:outline-none"
                        />
                      ) : (
                        <span
                          onDoubleClick={() => {
                            setEditingLayerNameId(layer.id);
                            setEditingNameValue(layer.name);
                          }}
                          className="text-[11px] font-medium truncate select-none"
                          title="Double-click to rename"
                        >
                          {layer.name}
                        </span>
                      )}
                    </div>

                    {/* Right: Alpha Lock, Clipping, Visibility & Lock Toggles */}
                    <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Alpha Lock Toggle (Preserve Transparency) */}
                      <button
                        onClick={() => onToggleAlphaLock?.(layer.id)}
                        className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold font-mono transition-colors ${
                          layer.alphaLocked
                            ? 'bg-purple-600/40 text-purple-300 border border-purple-500/50'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={layer.alphaLocked ? 'Alpha Lock ON (Preserves transparency)' : 'Turn Alpha Lock ON (Preserve transparency)'}
                      >
                        α
                      </button>

                      {/* Clipping Mask Toggle */}
                      <button
                        onClick={() => onToggleClipping?.(layer.id)}
                        className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold font-mono transition-colors ${
                          layer.clipping
                            ? 'bg-cyan-600/40 text-cyan-300 border border-cyan-500/50'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={layer.clipping ? 'Clipping Mask ON (Clips into layer below)' : 'Turn Clipping Mask ON (Clip into layer below)'}
                      >
                        ↳
                      </button>

                      {/* Visibility Toggle */}
                      <button
                        onClick={() => onToggleLayerVisibility?.(layer.id)}
                        className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
                          layer.visible ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={layer.visible ? 'Hide layer' : 'Show layer'}
                      >
                        {layer.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                      </button>

                      {/* Lock Toggle */}
                      <button
                        onClick={() => onToggleLayerLock?.(layer.id)}
                        className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
                          layer.locked ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title={layer.locked ? 'Unlock layer' : 'Lock layer (prevent drawing)'}
                      >
                        {layer.locked ? <Lock size={10} /> : <Unlock size={10} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Layer Properties (Aseprite Core Features: Blend Mode, Opacity, Cel Action) */}
            {activeLayer && (
              <div className="flex flex-col gap-2 p-2 bg-slate-950/60 rounded border border-white/10">
                {/* Blend Mode Selection */}
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-medium">Blend Mode:</span>
                  <select
                    value={activeLayer.blendMode || 'normal'}
                    onChange={(e) => onChangeLayerBlendMode?.(activeLayer.id, e.target.value)}
                    className="bg-slate-900 border border-white/10 text-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {BLEND_MODES.map((mode) => (
                      <option key={mode.id} value={mode.id} className="bg-slate-900 text-white">
                        {mode.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Layer Opacity Slider */}
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-medium">Opacity:</span>
                  <span className="font-mono text-blue-400 font-bold">
                    {Math.round((activeLayer.opacity ?? 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={activeLayer.opacity ?? 1}
                  onChange={(e) => onChangeLayerOpacity?.(activeLayer.id, Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer h-1 bg-slate-800 rounded"
                />

                {/* Status & Cel Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                    <span>{activeLayer.locked ? '🔒 Locked' : '✏️ Editable'}</span>
                    {activeLayer.alphaLocked && <span className="text-purple-400">| 🔒α Lock</span>}
                    {activeLayer.clipping && <span className="text-cyan-400">| ↳ Clip</span>}
                  </div>

                  {/* Clear Cel Button (Aseprite Core: Clear current frame's cel) */}
                  <button
                    onClick={onClearActiveCel}
                    className="h-5 px-1.5 rounded bg-slate-900 hover:bg-rose-950/40 border border-white/10 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 text-[10px] flex items-center gap-1 transition-colors"
                    title="Clear pixels in current frame's cel without deleting the layer (Shift+Delete)"
                  >
                    <RotateCcw size={10} />
                    <span>Clear Cel</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: SKELETON RIG & POSE */}
        {/* ========================================================= */}
        {activeTab === 'rig' && (
          <div className="flex flex-col gap-2.5">
            {/* Mode Indicator & Switch */}
            <div className="flex items-center justify-between p-1.5 bg-slate-950/80 rounded border border-white/10">
              <span className="text-[10px] text-slate-300 font-bold flex items-center gap-1">
                <BoneIcon size={12} className="text-amber-400" />
                Studio Mode:
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onSelectEditorMode?.('draw')}
                  className={`h-5 px-2 rounded text-[10px] font-bold transition-all ${
                    editorMode === 'draw'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ✏️ Draw
                </button>
                <button
                  onClick={() => onSelectEditorMode?.('rig')}
                  className={`h-5 px-2 rounded text-[10px] font-black transition-all ${
                    editorMode === 'rig'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🦴 Rig & Pose
                </button>
              </div>
            </div>

            {/* ⚡ PRIMARY CTA: Bake Pose to New Frame */}
            <div className="flex flex-col gap-1 p-2 bg-gradient-to-b from-amber-500/10 to-slate-950/60 rounded border border-amber-500/30">
              <button
                onClick={onBakePoseToNewFrame}
                className="w-full h-8 rounded bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/25 transition-all whitespace-nowrap"
              >
                <Sparkles size={13} />
                <span>⚡ Bake Pose as New Frame</span>
              </button>
              <span className="text-[9px] text-amber-200/70 text-center">
                Tạo 1 frame mới từ frame hiện tại với dáng pose xương vừa xoay!
              </span>

              {/* Secondary Actions */}
              <div className="grid grid-cols-2 gap-1 pt-1">
                <button
                  onClick={onResetPose}
                  className="h-6 rounded bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                  title="Reset all bone angles to 0"
                >
                  <RotateCcw size={10} />
                  <span>Reset Pose</span>
                </button>
                <button
                  onClick={onAutoBindLayers}
                  className="h-6 rounded bg-slate-900 border border-white/10 hover:border-blue-400/40 text-blue-400 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                  title="Auto-bind existing layers to bones by name matching"
                >
                  <Link size={10} />
                  <span>Auto-Bind</span>
                </button>
                <button
                  onClick={onAutoSegmentToLayers}
                  className="h-6 rounded bg-slate-900 border border-white/10 hover:border-emerald-400/40 text-emerald-400 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                  title="Auto-slice current sprite layer into separate layers for each bone (Head, Body, Tail, etc.)"
                >
                  <Scissors size={10} />
                  <span>✂️ Split to Layers</span>
                </button>
                <button
                  onClick={onApplyPoseToCurrentFrame}
                  className="h-6 rounded bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                  title="Apply pose directly onto current frame"
                >
                  <span>Apply Pose</span>
                </button>
              </div>
            </div>

            {/* Rig Preset Picker */}
            <div className="flex flex-col gap-1 p-2 bg-slate-950/60 rounded border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Skeleton Presets:
              </span>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(RIG_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => onSelectRigPreset?.(key)}
                    className="h-6 px-1.5 rounded bg-slate-900 border border-white/10 hover:border-blue-400 text-slate-300 hover:text-blue-300 text-[10px] font-medium truncate transition-colors text-left flex items-center gap-1"
                    title={preset.description}
                  >
                    <span>{key === 'dragon_worm' ? '🐉' : key === 'biped' ? '🧍' : key === 'quadruped' ? '🐕' : '🔗'}</span>
                    <span className="truncate">{preset.name.split(' (')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Bone Controls */}
            {selectedBone && (
              <div className="flex flex-col gap-2 p-2 bg-slate-950/80 rounded border border-white/15">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: selectedBone.color || '#3b82f6' }}
                    />
                    Bone: {selectedBone.name}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    Parent: {selectedBone.parentId || 'Root'}
                  </span>
                </div>

                {/* Rotation Angle Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">Rotation:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-amber-400 font-bold">
                        {selectedBone.rotation || 0}°
                      </span>
                      <button
                        onClick={() => handleBoneRotationChange(selectedBone.id, 0)}
                        className="text-[9px] text-slate-500 hover:text-white"
                        title="Reset angle to 0"
                      >
                        (0°)
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={selectedBone.rotation || 0}
                    onChange={(e) => handleBoneRotationChange(selectedBone.id, e.target.value)}
                    className="w-full accent-amber-500 cursor-pointer h-1 bg-slate-800 rounded"
                  />
                </div>

                {/* Bind to Layer Dropdown */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Link size={10} className="text-purple-400" />
                    Bound Layer:
                  </span>
                  <select
                    value={selectedBone.bindLayerId || ''}
                    onChange={(e) => onBindLayerToBone?.(selectedBone.id, e.target.value || null)}
                    className="w-full h-6 bg-slate-900 border border-white/15 rounded px-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">None (Unbound)</option>
                    {layers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Bones Hierarchy Tree */}
            <div className="flex flex-col gap-1 p-2 bg-slate-950/60 rounded border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Bones Tree ({bones.length}):
              </span>
              <div className="flex flex-col gap-0.5 max-h-[140px] overflow-y-auto custom-scrollbar">
                {bones.map((b) => {
                  const isSel = b.id === selectedBoneId;
                  const boundLayer = layers.find((l) => l.id === b.bindLayerId);
                  const isChild = Boolean(b.parentId);

                  return (
                    <button
                      key={b.id}
                      onClick={() => onSelectBoneId?.(b.id)}
                      className={`h-6 px-1.5 rounded text-left flex items-center justify-between text-[11px] transition-colors ${
                        isChild ? 'pl-4' : ''
                      } ${
                        isSel
                          ? 'bg-blue-600/30 text-blue-300 font-bold border border-blue-500/40'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: b.color || '#94a3b8' }}
                        />
                        <span className="truncate">{b.name}</span>
                      </div>

                      {boundLayer ? (
                        <span className="text-[9px] text-purple-400 font-mono bg-purple-950/80 px-1 rounded flex-shrink-0">
                          🔗 {boundLayer.name.slice(0, 8)}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-600 font-mono">
                          {b.rotation ? `${b.rotation}°` : '0°'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: COLOR & PALETTE */}
        {/* ========================================================= */}
        {activeTab === 'color' && (
          <div className="flex flex-col gap-2.5">
            {/* Active Color Bar */}
            <div className="h-8 px-2 bg-slate-900/90 rounded border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-5 h-5 rounded border border-white/30 shadow-inner flex-shrink-0"
                  style={{ backgroundColor: activeColor }}
                />
                <span className="text-[11px] font-mono font-bold text-white uppercase">{activeColor}</span>
              </div>

              {/* Native Eyedropper / Color Picker */}
              <label className="relative cursor-pointer" title="Custom color picker">
                <div className="h-6 px-2 rounded bg-slate-800 border border-white/15 flex items-center gap-1 hover:border-blue-400 text-slate-300 text-[10px] transition-colors whitespace-nowrap">
                  <Pipette size={11} className="text-blue-400" />
                  <span>Picker</span>
                </div>
                <input
                  type="color"
                  value={activeColor.startsWith('#') ? activeColor : '#ffffff'}
                  onChange={(e) => {
                    onSelectColor(e.target.value);
                    onAddCustomColor?.(e.target.value);
                  }}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>

            {/* Palette Preset Dropdown */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span className="font-semibold uppercase tracking-wider">Palette:</span>
                <span className="text-blue-400 font-mono">{currentPalette.name.split(' ')[0]}</span>
              </div>
              <select
                value={activePaletteId}
                onChange={(e) => onSelectPalette(e.target.value)}
                className="w-full h-7 bg-slate-950 border border-white/15 rounded px-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {Object.entries(PALETTES).map(([key, pal]) => (
                  <option key={key} value={key}>
                    {pal.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Palette Swatches (Guaranteed 8-column compact grid) */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Swatches ({currentPalette.colors.length}):
              </span>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
                  gap: '4px'
                }}
                className="p-1.5 bg-slate-950/80 rounded border border-white/10"
              >
                {currentPalette.colors.map((c, i) => {
                  const hex = rgbToHex(c);
                  const isSelected = activeColor.toLowerCase() === hex.toLowerCase();
                  return (
                    <button
                      key={`${hex}-${i}`}
                      onClick={() => onSelectColor(hex)}
                      className={`h-6 rounded-[2px] transition-all transform hover:scale-105 relative ${
                        isSelected
                          ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-900 z-10 scale-105'
                          : 'border border-white/10 hover:border-white/40'
                      }`}
                      style={{ backgroundColor: hex }}
                      title={`Color: ${hex}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Recent Custom Swatches (8-column grid) */}
            {customColors.length > 0 && (
              <div className="flex flex-col gap-1 pt-1.5 border-t border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Recent Colors:
                </span>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
                    gap: '4px'
                  }}
                  className="p-1.5 bg-slate-950/60 rounded border border-white/5"
                >
                  {customColors.slice(-8).map((hex, idx) => (
                    <button
                      key={`custom-${hex}-${idx}`}
                      onClick={() => onSelectColor(hex)}
                      className={`h-5 rounded-[2px] transition-transform hover:scale-105 ${
                        activeColor.toLowerCase() === hex.toLowerCase()
                          ? 'ring-2 ring-blue-400'
                          : 'border border-white/20'
                      }`}
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: MODIFIERS & PIXEL FX */}
        {/* ========================================================= */}
        {activeTab === 'modifiers' && (
          <div className="flex flex-col gap-2.5">
            {/* Pixel Block Size */}
            <div className="flex flex-col gap-1 p-2 bg-slate-950/60 rounded border border-white/10">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-semibold text-slate-300 flex items-center gap-1">
                  <Grid3X3 size={11} className="text-blue-400" />
                  Pixel Block Size
                </span>
                <span className="font-mono text-blue-400 bg-slate-900 px-1 py-0.2 rounded border border-white/5">
                  {filterSettings.pixelSize === 1 ? '1px' : `${filterSettings.pixelSize}px`}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="16"
                step="1"
                value={filterSettings.pixelSize}
                onChange={(e) => handleSliderChange('pixelSize', e.target.value)}
                className="w-full accent-blue-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
              />
              <div className="flex items-center gap-1 pt-0.5">
                {[1, 2, 3, 4, 8].map((size) => (
                  <button
                    key={size}
                    onClick={() => handleSliderChange('pixelSize', size)}
                    className={`h-6 text-[10px] font-mono flex-1 rounded border transition-all whitespace-nowrap ${
                      filterSettings.pixelSize === size
                        ? 'bg-blue-600 text-white font-bold border-blue-400'
                        : 'bg-slate-900 text-slate-400 border-white/5 hover:border-white/20'
                    }`}
                  >
                    {size}p
                  </button>
                ))}
              </div>
            </div>

            {/* Dithering & Retro Palette */}
            <div className="flex flex-col gap-1.5 p-2 bg-slate-950/60 rounded border border-white/10">
              <span className="font-semibold text-slate-300 text-[10px] flex items-center gap-1">
                <Layers size={11} className="text-purple-400" />
                Color Remapping & Dithering
              </span>
              <select
                value={filterSettings.paletteId}
                onChange={(e) => onUpdateFilterSettings({ ...filterSettings, paletteId: e.target.value })}
                className="w-full h-7 bg-slate-900 border border-white/15 rounded px-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="none">Original Colors</option>
                {Object.entries(PALETTES).map(([key, pal]) => (
                  <option key={key} value={key}>
                    {pal.name}
                  </option>
                ))}
              </select>

              <select
                value={filterSettings.ditherMethod}
                onChange={(e) => onUpdateFilterSettings({ ...filterSettings, ditherMethod: e.target.value })}
                disabled={filterSettings.paletteId === 'none'}
                className={`w-full h-7 bg-slate-900 border border-white/15 rounded px-2 text-xs text-slate-200 focus:outline-none ${
                  filterSettings.paletteId === 'none' ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <option value="none">No Dither</option>
                <option value="floyd">Floyd-Steinberg</option>
                <option value="bayer4">Bayer 4×4</option>
                <option value="bayer8">Bayer 8×8</option>
              </select>
            </div>

            {/* Pixel Outline */}
            <div className="flex flex-col gap-1 p-2 bg-slate-950/60 rounded border border-white/10">
              <span className="font-semibold text-slate-300 text-[10px]">Outline:</span>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
                  gap: '4px'
                }}
              >
                {outlineOptions.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => onUpdateFilterSettings({ ...filterSettings, outlineColor: opt.value })}
                    className={`h-6 flex items-center justify-center rounded border text-[9px] transition-all whitespace-nowrap ${
                      filterSettings.outlineColor === opt.value
                        ? 'border-blue-400 bg-blue-500/20 text-blue-300 font-bold'
                        : 'border-white/10 bg-slate-900 text-slate-400 hover:border-white/30'
                    }`}
                    title={opt.label}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full border border-white/20 mr-1 flex-shrink-0"
                      style={{ backgroundColor: opt.value || 'transparent' }}
                    />
                    <span>{opt.label.slice(0, 3)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Adjustments */}
            <div className="flex flex-col gap-1.5 p-2 bg-slate-950/60 rounded border border-white/10">
              <span className="font-semibold text-slate-300 text-[10px] flex items-center gap-1">
                <SlidersHorizontal size={11} className="text-amber-400" />
                Adjustments
              </span>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Bright</span>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={filterSettings.brightness}
                  onChange={(e) => handleSliderChange('brightness', e.target.value)}
                  className="w-28 accent-blue-500 cursor-pointer h-1 bg-slate-800 rounded"
                />
                <span className="font-mono text-slate-300 w-6 text-right">{filterSettings.brightness}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Contrast</span>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={filterSettings.contrast}
                  onChange={(e) => handleSliderChange('contrast', e.target.value)}
                  className="w-28 accent-blue-500 cursor-pointer h-1 bg-slate-800 rounded"
                />
                <span className="font-mono text-slate-300 w-6 text-right">{filterSettings.contrast}</span>
              </div>
            </div>

            {/* Bake / Reset */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={onResetFilters}
                className="h-7 px-2 rounded bg-slate-800 border border-white/10 text-slate-400 hover:text-white flex-1 flex items-center justify-center gap-1 text-xs whitespace-nowrap"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
              <button
                onClick={onApplyFilters}
                className="h-7 px-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold flex-1 flex items-center justify-center gap-1 text-xs whitespace-nowrap shadow-sm"
              >
                <Check size={12} />
                <span>Bake FX</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: CANVAS & SPECS */}
        {/* ========================================================= */}
        {activeTab === 'canvas' && (
          <div className="flex flex-col gap-2.5">
            {/* Active Spec */}
            <div className="h-8 px-2 bg-slate-900/90 rounded border border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">SIZE:</span>
              <span className="text-xs font-mono font-bold text-blue-400">
                {resolutionW} × {resolutionH} PX
              </span>
              <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1 py-0.2 rounded font-mono">
                {resolutionW * resolutionH} px
              </span>
            </div>

            {/* Density Presets */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Density Presets:
              </span>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '4px'
                }}
              >
                {[
                  { label: '48×48', w: 48, h: 48 },
                  { label: '64×64', w: 64, h: 64 },
                  { label: '96×96', w: 96, h: 96 },
                  { label: '128×128', w: 128, h: 128 },
                  { label: '160×160', w: 160, h: 160 },
                  { label: '256×256', w: 256, h: 256 }
                ].map((p) => {
                  const isCur = resolutionW === p.w && resolutionH === p.h;
                  return (
                    <button
                      key={p.label}
                      onClick={() => onChangeResolution(p.w, p.h)}
                      className={`h-7 px-2 rounded border text-xs font-mono font-bold transition-all whitespace-nowrap flex items-center justify-between ${
                        isCur
                          ? 'border-blue-400 bg-blue-600 text-white'
                          : 'border-white/10 bg-slate-950 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      <span>{p.label}</span>
                      {isCur && <span className="text-[9px] text-blue-200">Active</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Dimension Input */}
            <div className="flex flex-col gap-1 p-2 bg-slate-950/60 rounded border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Custom Size (W × H):
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="16"
                  max="512"
                  step="8"
                  value={resolutionW}
                  onChange={(e) => onChangeResolution(Math.max(16, Math.min(512, Number(e.target.value) || 96)), resolutionH)}
                  className="w-full h-7 bg-slate-900 border border-white/15 rounded px-2 text-center font-mono text-xs text-blue-400"
                />
                <span className="text-slate-500">×</span>
                <input
                  type="number"
                  min="16"
                  max="512"
                  step="8"
                  value={resolutionH}
                  onChange={(e) => onChangeResolution(resolutionW, Math.max(16, Math.min(512, Number(e.target.value) || 96)))}
                  className="w-full h-7 bg-slate-900 border border-white/15 rounded px-2 text-center font-mono text-xs text-blue-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: PROCEDURAL PRESETS */}
        {/* ========================================================= */}
        {activeTab === 'generator' && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Procedural Sprite Presets:
            </span>
            {[
              { id: 'knight', icon: '⚔️', name: 'Knight HD', desc: '5 Layers + Rig (4f)' },
              { id: 'slime', icon: '🟢', name: 'Emerald Slime', desc: 'Bouncing (4f)' },
              { id: 'coin', icon: '🪙', name: 'Gold Coin', desc: 'Rotating (6f)' },
              { id: 'ghost', icon: '👻', name: 'Ethereal Ghost', desc: 'Floating (4f)' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => onGeneratePreset?.(item.id)}
                className="h-8 px-2.5 rounded bg-slate-950/80 border border-white/10 hover:border-blue-500/50 flex items-center justify-between text-left transition-all hover:bg-slate-900"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-xs font-bold text-slate-200">{item.name}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{item.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
