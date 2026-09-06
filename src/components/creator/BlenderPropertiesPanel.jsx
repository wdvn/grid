import React, { useState } from 'react';
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
  SlidersHorizontal
} from 'lucide-react';
import { PALETTES } from '../../utils/pixelFilters';

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
  onGeneratePreset
}) {
  // Blender-style Properties Tabs: 'color' | 'modifiers' | 'canvas' | 'generator'
  const [activeTab, setActiveTab] = useState('color');

  const currentPalette = PALETTES[activePaletteId] || PALETTES.pico8;

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

  return (
    <aside className="w-[290px] flex flex-col h-full bg-[#0d1322] border-l border-white/10 select-none text-slate-200 flex-shrink-0">
      {/* 1. Blender N-Panel Header Tab Bar (Fixed height 32px) */}
      <div className="h-8 flex items-center justify-between px-1.5 bg-[#090e1a] border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-1 w-full h-full">
          {[
            { id: 'color', label: 'Color', icon: Palette, title: 'Palette & Swatches' },
            { id: 'modifiers', label: 'Modifiers', icon: Sliders, title: 'Pixel FX & Dithering' },
            { id: 'canvas', label: 'Canvas', icon: Maximize2, title: 'Resolution & Specs' },
            { id: 'generator', label: 'Presets', icon: Sparkles, title: 'Procedural Generators' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 h-7 flex items-center justify-center gap-1 rounded text-[11px] font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
                title={tab.title}
              >
                <Icon size={12} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Tab Contents Area */}
      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5 custom-scrollbar">
        {/* TAB 1: COLOR & PALETTE */}
        {activeTab === 'color' && (
          <div className="flex flex-col gap-2.5">
            {/* Active Color Bar (Compact 28px) */}
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

            {/* Palette Swatches (Guaranteed 8-column compact grid, 2 rows total) */}
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

        {/* TAB 2: MODIFIERS & PIXEL FX */}
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

            {/* Pixel Outline (Guaranteed 6-column grid on 1 row) */}
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

        {/* TAB 3: CANVAS & RESOLUTION */}
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

            {/* Density Presets (Guaranteed 2-column grid, compact height 28px) */}
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

        {/* TAB 4: PROCEDURAL PRESETS (Compact 32px rows) */}
        {activeTab === 'generator' && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Procedural Sprite Presets:
            </span>
            {[
              { id: 'knight', icon: '⚔️', name: 'Knight HD', desc: 'Armored (4f)' },
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
