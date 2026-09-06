import React from 'react';
import { Pipette } from 'lucide-react';
import { PALETTES } from '../../utils/pixelFilters';

export function PaletteBar({
  activePaletteId,
  onSelectPalette,
  activeColor,
  onSelectColor,
  customColors = [],
  onAddCustomColor
}) {
  const currentPalette = PALETTES[activePaletteId] || PALETTES.pico8;

  // Convert [r, g, b] array to hex
  const rgbToHex = (rgb) => {
    const hex = rgb.map((c) => c.toString(16).padStart(2, '0')).join('');
    return `#${hex}`;
  };

  return (
    <div className="flex flex-col gap-2 p-2.5 bg-slate-900/90 rounded-lg border border-white/10 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
          Palette: <span className="text-blue-400 font-mono">{currentPalette.name.split(' ')[0]}</span>
        </span>

        {/* Current Selected Color Swatch & Native Color Picker */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-5 h-5 rounded border border-white/30 shadow-inner flex-shrink-0"
            style={{ backgroundColor: activeColor }}
            title={`Active Color: ${activeColor}`}
          />
          <label className="relative cursor-pointer" title="Custom color picker">
            <div className="w-5 h-5 rounded bg-slate-800 border border-white/15 flex items-center justify-center hover:border-white/40 text-slate-300 transition-colors">
              <Pipette size={11} />
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
      </div>

      {/* Color Swatches Grid */}
      <div className="grid grid-cols-8 gap-1 p-1 bg-slate-950/70 rounded border border-white/5">
        {currentPalette.colors.map((c, i) => {
          const hex = rgbToHex(c);
          const isSelected = activeColor.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={`${hex}-${i}`}
              onClick={() => onSelectColor(hex)}
              className={`w-5 h-5 rounded-[3px] transition-all transform hover:scale-110 relative ${
                isSelected
                  ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-900 z-10 scale-105'
                  : 'hover:border hover:border-white/50'
              }`}
              style={{ backgroundColor: hex }}
              title={`Color: ${hex} (${c[0]}, ${c[1]}, ${c[2]})`}
            />
          );
        })}
      </div>

      {/* Custom Recent Colors if any */}
      {customColors.length > 0 && (
        <div className="flex items-center gap-1 pt-1 border-t border-white/5 overflow-x-auto pb-0.5">
          <span className="text-[9px] text-slate-400 font-mono flex-shrink-0">Custom:</span>
          {customColors.slice(-8).map((hex, idx) => (
            <button
              key={`custom-${hex}-${idx}`}
              onClick={() => onSelectColor(hex)}
              className={`w-4 h-4 rounded-[2px] flex-shrink-0 transition-transform hover:scale-110 ${
                activeColor.toLowerCase() === hex.toLowerCase()
                  ? 'ring-2 ring-blue-400'
                  : 'border border-white/20'
              }`}
              style={{ backgroundColor: hex }}
              title={hex}
            />
          ))}
        </div>
      )}
    </div>
  );
}
