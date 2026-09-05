import React, { useState } from 'react';
import { Layers, Upload, Download, Trash2, Sparkles, ChevronDown, Flame, Shield, HelpCircle } from 'lucide-react';
import { createSampleSpriteSheet, createFoxSpritePreset } from '../utils/sampleSprites';

export function Header({
  imageSrc,
  onFileUpload,
  onLoadSample,
  onClear,
  onOpenExportModal,
  frameCount
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSelectSample = (sample) => {
    setIsDropdownOpen(false);
    onLoadSample(sample);
  };

  return (
    <header className="app-header">
      {/* Brand Logo & Name */}
      <div className="brand-logo">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-md">
          <Layers size={18} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="brand-text">G.R.I.D.</span>
            <span className="brand-badge">PRO</span>
          </div>
          <span className="text-[10px] text-slate-400 font-normal tracking-wide">
            Graphics Rendering for Independent Developers
          </span>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="flex items-center gap-2.5">
        {/* Sample Sprites Dropdown */}
        <div className="dropdown" onMouseLeave={() => setIsDropdownOpen(false)}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
            title="Choose from demo sprite sheets"
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>Sample Sprites</span>
            <ChevronDown size={13} className="text-slate-400 ml-0.5" />
          </button>

          <div
            className={`dropdown-menu ${isDropdownOpen ? 'block' : ''}`}
            style={{ minWidth: '280px', display: isDropdownOpen ? 'block' : undefined }}
          >
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1 mb-1 border-b border-white/5">
              Demo Sprite Sheets:
            </div>

            {/* Fox Run - Primary requested asset */}
            <button
              onClick={() => handleSelectSample(createFoxSpritePreset('fox_run'))}
              className="dropdown-item"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🦊</span>
                <div className="flex flex-col">
                  <span className="text-amber-300 font-bold">Fox Run</span>
                  <span className="text-[10px] text-slate-400">assets/Fox_Run.png (4 directions)</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                192×128 (24f)
              </span>
            </button>

            {/* Fox Walk */}
            <button
              onClick={() => handleSelectSample(createFoxSpritePreset('fox_walk'))}
              className="dropdown-item"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🦊</span>
                <div className="flex flex-col">
                  <span className="text-slate-200 font-medium">Fox Walk</span>
                  <span className="text-[10px] text-slate-400">assets/Fox_walk.png (4 directions)</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                192×128 (24f)
              </span>
            </button>

            {/* Fox Idle */}
            <button
              onClick={() => handleSelectSample(createFoxSpritePreset('fox_idle'))}
              className="dropdown-item"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🦊</span>
                <div className="flex flex-col">
                  <span className="text-slate-200 font-medium">Fox Idle</span>
                  <span className="text-[10px] text-slate-400">assets/Fox_Idle.png (4 directions)</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                128×128 (16f)
              </span>
            </button>

            <div className="h-px bg-white/10 my-1" />

            {/* Pixel Hero */}
            <button
              onClick={() => handleSelectSample(createSampleSpriteSheet('pixel_hero'))}
              className="dropdown-item"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">⚔️</span>
                <div className="flex flex-col">
                  <span className="text-slate-200 font-medium">Pixel Hero Run</span>
                  <span className="text-[10px] text-slate-400">Procedural Canvas Hero</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                192×32 (6f)
              </span>
            </button>

            {/* Spinning Coin */}
            <button
              onClick={() => handleSelectSample(createSampleSpriteSheet('coin_spin'))}
              className="dropdown-item"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🪙</span>
                <div className="flex flex-col">
                  <span className="text-slate-200 font-medium">Spinning Coin</span>
                  <span className="text-[10px] text-slate-400">Gold Coin 360 Spin</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                256×32 (8f)
              </span>
            </button>

            {/* Duck Sheet from Downloads */}
            <button
              onClick={() => handleSelectSample({
                dataUrl: '/download_test_1.png',
                name: 'Duck Sprite Sheet',
                defaultWidth: 344,
                defaultHeight: 1536,
                count: 8
              })}
              className="dropdown-item"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🦆</span>
                <div className="flex flex-col">
                  <span className="text-slate-200 font-medium">Duck Sprite</span>
                  <span className="text-[10px] text-slate-400">Large Vertical Sheet</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                Downloads #1
              </span>
            </button>
          </div>
        </div>

        {/* Upload File Input - Custom styled button hiding native input */}
        <label className="btn btn-secondary text-xs cursor-pointer">
          <Upload size={14} className="text-blue-400" />
          <span>Upload Image</span>
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) {
                onFileUpload(e.target.files[0]);
                e.target.value = ''; // Reset to allow re-uploading same file
              }
            }}
          />
        </label>

        {imageSrc && (
          <>
            {/* Clear All Frames / Image */}
            <button
              onClick={onClear}
              className="btn btn-danger text-xs"
              title="Clear entire workspace"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>

            <div className="h-4 w-px bg-white/10 mx-0.5" />

            {/* Export Modal Trigger */}
            <button
              onClick={onOpenExportModal}
              className="btn btn-accent text-xs"
              title="Export frames or JSON atlas"
            >
              <Download size={14} />
              <span>Export Atlas ({frameCount})</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
