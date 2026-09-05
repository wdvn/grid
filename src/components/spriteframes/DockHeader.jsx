import React from 'react';
import { Film } from 'lucide-react';

/**
 * Top bar of Godot-style SpriteFrames dock displaying current animation info and shortcuts.
 */
export function DockHeader({
  activeAnimation,
  activeFramesCount = 0,
  animationsCount = 0,
  totalFramesCount = 0
}) {
  return (
    <div className="flex items-center justify-between px-3 py-1 bg-slate-950/90 border-b border-white/10 flex-shrink-0 text-xs">
      {/* Left: Godot Tab & Active Anim Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#204b77]/40 border border-[#3b82f6]/50 text-blue-300 font-bold shadow-sm">
          <Film size={12} className="text-[#60a5fa]" />
          <span className="tracking-wide">SpriteFrames</span>
        </div>

        {activeAnimation && (
          <div className="flex items-center gap-2 text-[11px] text-slate-300 font-mono">
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Animation:</span>
            <span className="text-blue-300 font-bold bg-slate-900/90 px-1.5 py-0.5 rounded border border-white/10">
              {activeAnimation.name}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-bold">{activeFramesCount} frames</span>
            <span className="text-slate-500">•</span>
            <span className="text-amber-300">{activeAnimation.fps} FPS</span>
            <span className="text-slate-500">•</span>
            <span className={activeAnimation.loop !== false ? 'text-blue-400' : 'text-slate-500'}>
              {activeAnimation.loop !== false ? 'Loop: On' : 'Loop: Off'}
            </span>
          </div>
        )}
      </div>

      {/* Right: Global Stats & Shortcuts */}
      <div className="flex items-center gap-3 text-[11px] text-slate-400">
        <span className="hidden sm:inline font-mono">
          {animationsCount} animations • {totalFramesCount} total frames
        </span>
        <span className="hidden md:inline text-slate-500">|</span>
        <span className="hidden md:inline text-[10px]">
          Shortcuts: <kbd>Ctrl+D</kbd> Duplicate | <kbd>Del</kbd> Delete
        </span>
      </div>
    </div>
  );
}
