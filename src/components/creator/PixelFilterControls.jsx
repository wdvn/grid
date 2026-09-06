import React from 'react';
import { Sliders, Sparkles, RotateCcw, Check, Palette, Grid3X3, Layers } from 'lucide-react';
import { PALETTES } from '../../utils/pixelFilters';

export function PixelFilterControls({
  filterSettings,
  onUpdateFilterSettings,
  onApplyFilters,
  onResetFilters,
  onGeneratePreset
}) {
  const {
    pixelSize = 1,
    paletteId = 'none',
    ditherMethod = 'none',
    outlineColor = null,
    brightness = 0,
    contrast = 0,
    saturation = 0
  } = filterSettings;

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
    <div className="flex flex-col gap-4 p-3 bg-slate-900/90 rounded-lg border border-white/10 shadow-lg text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs uppercase tracking-wider">
          <Sliders size={14} />
          <span>Pixel FX & Filter Engine</span>
        </div>
        <button
          onClick={onResetFilters}
          className="btn btn-secondary text-[10px] py-0.5 px-2 flex items-center gap-1 text-slate-400 hover:text-white"
          title="Reset all filter adjustments"
        >
          <RotateCcw size={11} />
          <span>Reset</span>
        </button>
      </div>

      {/* 1. Pixel Size Downscaler */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <Grid3X3 size={13} className="text-blue-400" />
            Pixel Block Size
          </span>
          <span className="font-mono text-blue-400 text-[11px] bg-slate-800 px-1.5 py-0.5 rounded border border-white/5">
            {pixelSize === 1 ? '1px (Native)' : `${pixelSize}×${pixelSize} px`}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="16"
          step="1"
          value={pixelSize}
          onChange={(e) => handleSliderChange('pixelSize', e.target.value)}
          className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />
        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
          <span>1px (Fine Detail)</span>
          <span>4px</span>
          <span>8px</span>
          <span>16px</span>
        </div>
        <div className="flex items-center gap-1 pt-0.5">
          {[1, 2, 3, 4, 8].map((size) => (
            <button
              key={size}
              onClick={() => handleSliderChange('pixelSize', size)}
              className={`text-[9px] font-mono flex-1 py-0.5 rounded border transition-all ${
                pixelSize === size
                  ? 'bg-blue-600 text-white font-bold border-blue-400'
                  : 'bg-slate-950/60 text-slate-400 border-white/5 hover:border-white/20'
              }`}
            >
              {size === 1 ? '1px Fine' : `${size}px`}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Palette Remapping */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <Palette size={13} className="text-purple-400" />
            Color Palette Remapping
          </span>
          <span className="text-[10px] text-purple-400 font-mono uppercase">
            {paletteId === 'none' ? 'Full Color' : paletteId}
          </span>
        </div>
        <select
          value={paletteId}
          onChange={(e) => onUpdateFilterSettings({ ...filterSettings, paletteId: e.target.value })}
          className="w-full bg-slate-950 border border-white/15 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="none">Original Colors (No Palette Clamp)</option>
          {Object.entries(PALETTES).map(([key, pal]) => (
            <option key={key} value={key}>
              {pal.name}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Dithering Algorithm (Active only when Palette is selected) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <Layers size={13} className="text-emerald-400" />
            Dithering Algorithm
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">
            {ditherMethod.toUpperCase()}
          </span>
        </div>
        <select
          value={ditherMethod}
          onChange={(e) => onUpdateFilterSettings({ ...filterSettings, ditherMethod: e.target.value })}
          disabled={paletteId === 'none'}
          className={`w-full bg-slate-950 border border-white/15 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 ${
            paletteId === 'none' ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          <option value="none">None (Nearest Color Only)</option>
          <option value="floyd">Floyd-Steinberg (Error Diffusion)</option>
          <option value="bayer4">Bayer 4×4 (Ordered Matrix)</option>
          <option value="bayer8">Bayer 8×8 (Fine Ordered Matrix)</option>
        </select>
        {paletteId === 'none' && (
          <span className="text-[10px] text-slate-500 italic">
            Select a palette above to enable dithering
          </span>
        )}
      </div>

      {/* 4. Pixel Outline Generator */}
      <div className="flex flex-col gap-1.5">
        <span className="font-semibold text-slate-300 text-xs">
          Sprite Outline
        </span>
        <div className="grid grid-cols-6 gap-1">
          {outlineOptions.map((opt) => (
            <button
              key={opt.label}
              onClick={() => onUpdateFilterSettings({ ...filterSettings, outlineColor: opt.value })}
              className={`flex flex-col items-center justify-center p-1 rounded border text-[9px] transition-all ${
                outlineColor === opt.value
                  ? 'border-blue-400 bg-blue-500/20 text-blue-300 font-bold'
                  : 'border-white/10 bg-slate-800/60 text-slate-400 hover:border-white/30'
              }`}
            >
              <div
                className="w-3.5 h-3.5 rounded-full border border-white/20 mb-0.5"
                style={{ backgroundColor: opt.value || 'transparent' }}
              />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Color Adjustments */}
      <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
        <span className="font-semibold text-slate-300 text-xs">Color Adjustments</span>

        {/* Brightness */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Brightness</span>
            <span className="font-mono text-slate-300">{brightness > 0 ? `+${brightness}` : brightness}</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={brightness}
            onChange={(e) => handleSliderChange('brightness', e.target.value)}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Contrast */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Contrast</span>
            <span className="font-mono text-slate-300">{contrast > 0 ? `+${contrast}` : contrast}</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={contrast}
            onChange={(e) => handleSliderChange('contrast', e.target.value)}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Saturation */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Saturation</span>
            <span className="font-mono text-slate-300">{saturation > 0 ? `+${saturation}` : saturation}</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={saturation}
            onChange={(e) => handleSliderChange('saturation', e.target.value)}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>
      </div>

      {/* 6. Quick Procedural Presets */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
        <span className="font-semibold text-slate-300 text-xs flex items-center gap-1">
          <Sparkles size={13} className="text-amber-400" />
          Procedural Sprite Generator
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onGeneratePreset?.('slime')}
            className="btn btn-secondary text-xs py-1.5 px-2 flex items-center justify-center gap-1 hover:border-emerald-500/50 hover:text-emerald-300"
          >
            <span>🟢</span> Slime (4f)
          </button>
          <button
            onClick={() => onGeneratePreset?.('coin')}
            className="btn btn-secondary text-xs py-1.5 px-2 flex items-center justify-center gap-1 hover:border-amber-500/50 hover:text-amber-300"
          >
            <span>🪙</span> Coin (6f)
          </button>
          <button
            onClick={() => onGeneratePreset?.('hero')}
            className="btn btn-secondary text-xs py-1.5 px-2 flex items-center justify-center gap-1 hover:border-blue-500/50 hover:text-blue-300"
          >
            <span>⚔️</span> Knight (4f)
          </button>
          <button
            onClick={() => onGeneratePreset?.('ghost')}
            className="btn btn-secondary text-xs py-1.5 px-2 flex items-center justify-center gap-1 hover:border-purple-500/50 hover:text-purple-300"
          >
            <span>👻</span> Ghost (4f)
          </button>
        </div>
      </div>

      {/* Bake Filter Button */}
      <button
        onClick={onApplyFilters}
        className="btn btn-primary text-xs py-2 w-full flex items-center justify-center gap-1.5 font-bold shadow-md shadow-blue-500/20 mt-1"
      >
        <Check size={14} />
        <span>Bake Filter into Layer</span>
      </button>
    </div>
  );
}
