import React, { useState, useMemo, useEffect } from 'react';
import {
  Upload,
  X,
  FileJson,
  Check,
  AlertCircle,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Film,
  FileText,
  Copy,
  FolderInput
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { parseAtlasJSON, SAMPLE_ATLAS_JSON } from '../utils/importUtils';

export function ImportAtlasModal({
  isOpen,
  onClose,
  hasExistingImage,
  onImportAtlas
}) {
  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'paste' | 'sample'
  const [jsonText, setJsonText] = useState('');
  const [selectedJsonFileName, setSelectedJsonFileName] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [importMode, setImportMode] = useState('replace'); // 'replace' | 'append'

  // Reset or load initial sample when modal opens
  useEffect(() => {
    if (isOpen && !jsonText) {
      // Default to sample ready if empty
      setJsonText(JSON.stringify(SAMPLE_ATLAS_JSON, null, 2));
    }
  }, [isOpen]);

  // Parse JSON live
  const parsedResult = useMemo(() => {
    if (!jsonText || !jsonText.trim()) {
      return { success: false, error: 'Please select a JSON file or paste atlas data.' };
    }
    return parseAtlasJSON(jsonText);
  }, [jsonText]);

  if (!isOpen) return null;

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  const handleJsonFileUpload = (file) => {
    if (!file) return;
    setSelectedJsonFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        setJsonText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleImageFileUpload = (file) => {
    if (!file) return;
    setSelectedImageFile(file);
  };

  const handleLoadSample = (sampleType = 'fox') => {
    if (sampleType === 'fox') {
      setJsonText(JSON.stringify(SAMPLE_ATLAS_JSON, null, 2));
      setSelectedJsonFileName('fox_run_atlas.json');
    } else if (sampleType === 'alias_map') {
      const sampleAliasMap = {
        meta: {
          image: "character_sheet.png",
          size: { w: 192, h: 64 }
        },
        "hero_idle_0": [0, 0, 48, 64],
        "hero_idle_1": [48, 0, 48, 64],
        "hero_walk_0": [96, 0, 48, 64],
        "hero_walk_1": [144, 0, 48, 64]
      };
      setJsonText(JSON.stringify(sampleAliasMap, null, 2));
      setSelectedJsonFileName('hero_alias_map.json');
    }
  };

  const handleApply = () => {
    if (!parsedResult || !parsedResult.success || parsedResult.frames.length === 0) {
      return;
    }

    triggerConfetti();
    onImportAtlas({
      frames: parsedResult.frames,
      animations: parsedResult.animations,
      imageFile: selectedImageFile,
      imageName: parsedResult.imageName,
      importMode
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: '92vw', maxWidth: '820px' }}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <FolderInput size={20} className="text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Import Sprite Sheet Atlas / Alias (JSON)
              </h3>
              <p className="text-[11px] text-slate-400">
                Supports TexturePacker, Phaser 3, Aseprite (with FrameTags), Unity Atlas & Name Alias Maps
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/10 px-4 bg-slate-900/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('file')}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'file'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload size={14} /> Upload JSON / Sheet
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'paste'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText size={14} /> Paste JSON Data
          </button>

          <button
            onClick={() => setActiveTab('sample')}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'sample'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={14} /> Sample Presets
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body space-y-4 max-h-[70vh] overflow-y-auto">
          {/* TAB 1: File Upload */}
          {activeTab === 'file' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Atlas JSON File Upload */}
                <div className="bg-slate-950/60 border border-emerald-500/20 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:border-emerald-500/40 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
                    <FileJson size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-200 mb-0.5">
                    1. Atlas JSON File (*.json)
                  </span>
                  <span className="text-[10px] text-slate-400 mb-3">
                    TexturePacker, Phaser, Aseprite or G.R.I.D.
                  </span>

                  <label className="btn btn-primary text-xs cursor-pointer py-1.5 px-4">
                    {selectedJsonFileName ? 'Change JSON File' : 'Choose Atlas JSON'}
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleJsonFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                  {selectedJsonFileName && (
                    <span className="mt-2 text-[10px] font-mono text-emerald-400 truncate max-w-full">
                      ✓ {selectedJsonFileName}
                    </span>
                  )}
                </div>

                {/* 2. Optional Companion Sprite Sheet Image */}
                <div className="bg-slate-950/60 border border-blue-500/20 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:border-blue-500/40 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 mb-2">
                    <ImageIcon size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-200 mb-0.5">
                    2. Companion Sprite Sheet (Optional)
                  </span>
                  <span className="text-[10px] text-slate-400 mb-3">
                    {hasExistingImage
                      ? 'Leave empty to use current sheet in workspace'
                      : 'Upload PNG / WebP image matching this atlas'}
                  </span>

                  <label className="btn btn-secondary text-xs cursor-pointer py-1.5 px-4">
                    {selectedImageFile ? 'Change Image File' : 'Choose Image (Optional)'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleImageFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                  {selectedImageFile && (
                    <span className="mt-2 text-[10px] font-mono text-blue-400 truncate max-w-full">
                      ✓ {selectedImageFile.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Paste JSON Data */}
          {activeTab === 'paste' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Paste Atlas JSON Content:</span>
                <button
                  onClick={() => {
                    navigator.clipboard.readText?.().then(text => {
                      if (text) setJsonText(text);
                    });
                  }}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Copy size={11} /> Paste from Clipboard
                </button>
              </div>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='Paste Phaser, TexturePacker or Aseprite JSON here...'
                rows={10}
                className="input-field font-mono text-xs w-full bg-slate-950 p-3 rounded-lg border border-white/10 resize-y focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* TAB 3: Sample Presets */}
          {activeTab === 'sample' && (
            <div className="space-y-3">
              <span className="text-xs text-slate-400">
                Click a preset below to populate with standard Atlas JSON formats:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => handleLoadSample('fox')}
                  className="text-left bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-amber-500/50 rounded-xl p-3.5 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-400 group-hover:text-amber-300">
                      🦊 Fox 4-Way Run Atlas (Aseprite)
                    </span>
                    <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                      24 Frames
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Standard Aseprite / TexturePacker JSON with 4 directional frameTags (run_down, run_up, run_right, run_left) and 0.8 pivot anchors.
                  </p>
                </button>

                <button
                  onClick={() => handleLoadSample('alias_map')}
                  className="text-left bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-blue-500/50 rounded-xl p-3.5 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-blue-400 group-hover:text-blue-300">
                      🏷️ Simple Frame Alias Map
                    </span>
                    <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                      Alias Dict
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Dictionary format with named sprite aliases (e.g. <code>hero_idle_0: [x, y, w, h]</code>).
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Live Parsing Validation & Summary */}
          <div className="pt-2 border-t border-white/10 space-y-3">
            {parsedResult.success ? (
              <div className="space-y-3">
                {/* Format & Stats Banner */}
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-emerald-300">
                        {parsedResult.format}
                      </span>
                      {parsedResult.imageName && (
                        <span className="text-[11px] text-slate-400 ml-2">
                          (Referenced Image: <code className="text-emerald-400">{parsedResult.imageName}</code>)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                      {parsedResult.frames.length} frames
                    </span>
                    {parsedResult.animations.length > 0 && (
                      <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 flex items-center gap-1">
                        <Film size={11} /> {parsedResult.animations.length} clips
                      </span>
                    )}
                  </div>
                </div>

                {/* Import Mode: Replace or Append */}
                <div className="flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-lg border border-white/5">
                  <span className="text-xs text-slate-300 font-medium">Frames Integration Mode:</span>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Replace current frames</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                      <input
                        type="radio"
                        name="importMode"
                        value="append"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Append to existing</span>
                    </label>
                  </div>
                </div>

                {/* Frame Preview Table */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">Parsed Frame Coordinates & Aliases Preview:</span>
                    <span className="text-[10px] font-mono">Showing first {Math.min(8, parsedResult.frames.length)} of {parsedResult.frames.length}</span>
                  </div>

                  <div className="border border-white/10 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                    <table className="w-full text-left font-mono text-[11px]">
                      <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-white/10">
                        <tr>
                          <th className="py-1 px-2.5">#</th>
                          <th className="py-1 px-2.5">Name / Alias</th>
                          <th className="py-1 px-2.5">X</th>
                          <th className="py-1 px-2.5">Y</th>
                          <th className="py-1 px-2.5">Width</th>
                          <th className="py-1 px-2.5">Height</th>
                          <th className="py-1 px-2.5">Pivot</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-slate-950/60">
                        {parsedResult.frames.slice(0, 10).map((f, i) => (
                          <tr key={f.id} className="hover:bg-slate-900/40 text-slate-300">
                            <td className="py-1 px-2.5 text-slate-500">{i + 1}</td>
                            <td className="py-1 px-2.5 text-emerald-400 font-semibold">{f.name}</td>
                            <td className="py-1 px-2.5">{f.x}</td>
                            <td className="py-1 px-2.5">{f.y}</td>
                            <td className="py-1 px-2.5">{f.w}</td>
                            <td className="py-1 px-2.5">{f.h}</td>
                            <td className="py-1 px-2.5 text-slate-400">{f.pivotX}, {f.pivotY}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Animations Detected */}
                {parsedResult.animations.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-300">
                      Auto-detected Animation Clips ({parsedResult.animations.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedResult.animations.map(a => (
                        <span
                          key={a.id}
                          className="bg-slate-900 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1"
                        >
                          🎬 {a.name} <span className="text-slate-500">({a.frameIds.length}f)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Error State */
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-lg p-3 flex items-start gap-2 text-rose-300 text-xs">
                <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">Atlas Parsing Failed</span>
                  <p className="text-[11px] text-rose-200/80 leading-relaxed">
                    {parsedResult.error}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            {parsedResult.success ? `✓ Ready to import ${parsedResult.frames.length} frames` : 'Awaiting valid JSON'}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn btn-secondary text-xs">
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!parsedResult.success || parsedResult.frames.length === 0}
              className="btn btn-accent text-xs flex items-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={14} />
              <span>Import & Apply Atlas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
