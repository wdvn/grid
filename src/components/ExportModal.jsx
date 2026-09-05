import React, { useState, useMemo } from 'react';
import { Download, X, Copy, Check, FileJson, Archive, Save, Sparkles, Network, Cpu } from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateAtlasJSON, downloadFramesZip, downloadFile } from '../utils/exportUtils';
import { createDefaultCharacterGraph, generateEngineGraphExport } from '../utils/animationGraph';

export function ExportModal({
  isOpen,
  onClose,
  imageElement,
  imageDimensions,
  imageSrc,
  frames
}) {
  const [activeTab, setActiveTab] = useState('json'); // 'json' | 'zip' | 'project' | 'state_graph'
  const [engineFormat, setEngineFormat] = useState('unity'); // 'unity' | 'godot' | 'universal'
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Pre-generate Sprite Sheet Atlas JSON
  const jsonContent = useMemo(() => {
    return generateAtlasJSON('spritesheet.png', imageDimensions, frames);
  }, [imageDimensions, frames]);

  // Pre-generate Animation Graph config & engine export
  const graphConfig = useMemo(() => {
    return createDefaultCharacterGraph(frames);
  }, [frames]);

  const stateGraphExportContent = useMemo(() => {
    return generateEngineGraphExport(graphConfig, engineFormat);
  }, [graphConfig, engineFormat]);

  if (!isOpen) return null;

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    triggerConfetti();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    downloadFile(jsonContent, 'spritesheet_atlas.json');
    triggerConfetti();
  };

  const handleDownloadStateGraph = () => {
    const filename =
      engineFormat === 'unity'
        ? 'CharacterAnimator.controller.json'
        : engineFormat === 'godot'
        ? 'character_state_machine.tres.json'
        : 'character_graph.universal.json';
    downloadFile(stateGraphExportContent, filename);
    triggerConfetti();
  };

  const handleDownloadZip = async () => {
    setIsExporting(true);
    try {
      await downloadFramesZip(imageElement, frames, 'sprite_frames');
      triggerConfetti();
    } catch (err) {
      console.error('Failed to generate ZIP', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveProject = () => {
    const projectData = JSON.stringify(
      {
        version: 1,
        imageSrc,
        imageDimensions,
        frames,
        graphConfig
      },
      null,
      2
    );
    downloadFile(projectData, 'project_workspace.spritesheet.json');
    triggerConfetti();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: '90vw', maxWidth: '800px' }}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Download size={20} className="text-emerald-400" />
            <h3 className="text-base font-bold text-slate-100">Export Sprite & Animation Graph</h3>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/10 px-4 bg-slate-900/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'json'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileJson size={14} /> JSON Atlas
          </button>

          <button
            onClick={() => setActiveTab('state_graph')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'state_graph'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network size={14} /> State Graph (Unity / Godot)
          </button>

          <button
            onClick={() => setActiveTab('zip')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'zip'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Archive size={14} /> PNG Frames ZIP ({frames.length})
          </button>

          <button
            onClick={() => setActiveTab('project')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'project'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Save size={14} /> Save Project (.json)
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* TAB 1: JSON Atlas */}
          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Standard Sprite Sheet Atlas JSON with frame coordinates and pivot anchors:
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleCopy(jsonContent)} className="btn btn-secondary text-xs">
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                  <button onClick={handleDownloadJSON} className="btn btn-primary text-xs">
                    <Download size={14} /> Download JSON
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                value={jsonContent}
                className="w-full h-48 xl:h-64 bg-slate-950 text-slate-300 font-mono text-xs p-3 rounded-lg border border-white/10 focus:outline-none select-all"
              />
            </div>
          )}

          {/* TAB 2: State Graph Export */}
          {activeTab === 'state_graph' && (
            <div className="space-y-3">
              {/* Engine Format Selector & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950/60 p-2 rounded-lg border border-white/5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <Cpu size={13} className="text-cyan-400" /> Engine:
                  </span>
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-white/10">
                    <button
                      onClick={() => setEngineFormat('unity')}
                      className={`h-7 px-2.5 text-xs font-semibold rounded flex items-center justify-center transition-colors ${
                        engineFormat === 'unity'
                          ? 'bg-cyan-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Unity Mecanim
                    </button>
                    <button
                      onClick={() => setEngineFormat('godot')}
                      className={`h-7 px-2.5 text-xs font-semibold rounded flex items-center justify-center transition-colors ${
                        engineFormat === 'godot'
                          ? 'bg-cyan-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Godot 4.x
                    </button>
                    <button
                      onClick={() => setEngineFormat('universal')}
                      className={`h-7 px-2.5 text-xs font-semibold rounded flex items-center justify-center transition-colors ${
                        engineFormat === 'universal'
                          ? 'bg-cyan-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Universal / Phaser
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(stateGraphExportContent)}
                    className="btn btn-secondary text-xs"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Schema'}
                  </button>
                  <button onClick={handleDownloadStateGraph} className="btn btn-primary text-xs bg-cyan-600 hover:bg-cyan-500 border-none">
                    <Download size={14} /> Download Graph JSON
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-cyan-500/10 border border-cyan-500/20 p-2 rounded-lg flex items-center gap-2">
                <Sparkles size={14} className="text-cyan-400 flex-shrink-0" />
                <span>
                  {engineFormat === 'unity' && 'Generates Unity Mecanim AnimatorController with 2D Simple Directional BlendTree, parameters (speed, moveX, moveY, isAttacking), and transition rules.'}
                  {engineFormat === 'godot' && 'Generates Godot 4.x AnimationNodeStateMachine schema with 2D BlendSpace points and advance conditions.'}
                  {engineFormat === 'universal' && 'Generates portable JSON state machine specification ready for Phaser.js, PixiJS, or custom game engines.'}
                </span>
              </div>

              <textarea
                readOnly
                value={stateGraphExportContent}
                className="w-full h-44 xl:h-56 bg-slate-950 text-slate-300 font-mono text-xs p-3 rounded-lg border border-white/10 focus:outline-none select-all"
              />
            </div>
          )}

          {/* TAB 3: PNG Frames ZIP */}
          {activeTab === 'zip' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                <Archive size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-100">Export Sliced Frames as ZIP</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Extract all {frames.length} frames into individual transparent PNG image files bundled in a ZIP archive.
                </p>
              </div>

              <button
                onClick={handleDownloadZip}
                disabled={isExporting || frames.length === 0}
                className="btn btn-accent px-6 py-2.5 text-sm mx-auto shadow-lg shadow-emerald-500/25"
              >
                <Download size={16} />
                {isExporting ? 'Compressing...' : 'Download PNG Frames ZIP'}
              </button>
            </div>
          )}

          {/* TAB 4: Project File */}
          {activeTab === 'project' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/20">
                <Save size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-100">Save Project Workspace</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Save the current sprite sheet, all sliced frames, state machine configuration, and pivots to resume work anytime.
                </p>
              </div>

              <button
                onClick={handleSaveProject}
                className="btn btn-primary px-6 py-2.5 text-sm mx-auto bg-purple-600 hover:bg-purple-500 border-none shadow-lg shadow-purple-500/25"
              >
                <Save size={16} />
                Download Project File (.spritesheet.json)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
