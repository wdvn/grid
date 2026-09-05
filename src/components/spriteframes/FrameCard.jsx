import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { FrameThumbnail } from './FrameThumbnail';

/**
 * Individual frame card in the Godot-style frames track.
 * Wrapped in React.memo for high performance during live animation playback.
 */
export const FrameCard = React.memo(function FrameCard({
  frame,
  idx,
  isSelected,
  isPlaybackActive,
  totalFrames,
  imageElement,
  onSelectFrame,
  onMoveEarlier,
  onMoveLater,
  onRemove
}) {
  return (
    <div
      data-frame-id={frame.id}
      onClick={() => onSelectFrame?.(frame.id)}
      className={`godot-frame-card border group shadow-md ${
        isPlaybackActive
          ? 'border-amber-400 bg-amber-500/15 shadow-amber-500/25 ring-2 ring-amber-400/80'
          : isSelected
          ? 'border-blue-500 bg-blue-500/15 shadow-blue-500/25 ring-1 ring-blue-400'
          : 'border-white/10 bg-slate-900/90 hover:bg-slate-850 hover:border-white/20'
      }`}
    >
      {/* Top Tag: Godot Index #0, #1... & Dimensions */}
      <div className="w-full flex items-center justify-between text-[10px] font-mono px-1 py-0.5 z-10 bg-slate-950/85 rounded border border-white/10 flex-shrink-0">
        <span
          className={`font-bold ${
            isPlaybackActive
              ? 'text-amber-300'
              : isSelected
              ? 'text-blue-400'
              : 'text-slate-300'
          }`}
        >
          #{idx}
        </span>
        <span className="text-[9px] text-slate-400 font-mono">
          {frame.w}×{frame.h}
        </span>
      </div>

      {/* Thumbnail Preview */}
      <div
        className="w-full flex-1 bg-checkerboard rounded relative overflow-hidden flex items-center justify-center my-0.5"
        style={{ width: '100%', minHeight: '44px', position: 'relative' }}
      >
        <FrameThumbnail imageElement={imageElement} frame={frame} />
      </div>

      {/* Bottom Bar: Frame Name & Duration Multiplier */}
      <div className="w-full flex items-center justify-between text-[9px] font-mono px-1 py-0.5 bg-slate-950/85 rounded border border-white/5 flex-shrink-0">
        <span className="text-slate-400 truncate max-w-[50px]">{frame.name}</span>
        <span className="text-emerald-400 font-bold">1.0×</span>
      </div>

      {/* Hover Quick Actions Bar */}
      <div className="absolute inset-0 bg-slate-950/90 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveEarlier?.(idx);
          }}
          disabled={idx === 0}
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-20 shadow"
          title="Move frame earlier"
        >
          <ChevronLeft size={12} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.(idx);
          }}
          className="p-1 rounded bg-rose-600 hover:bg-rose-500 text-white shadow"
          title="Remove frame from this animation"
        >
          <X size={12} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveLater?.(idx);
          }}
          disabled={idx === totalFrames - 1}
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-20 shadow"
          title="Move frame later"
        >
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
});
