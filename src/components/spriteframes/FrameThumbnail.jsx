import React, { useRef, useEffect } from 'react';

/**
 * Renders a pixelated frame thumbnail on a canvas.
 * Wrapped in React.memo to prevent unnecessary canvas redraws.
 */
export const FrameThumbnail = React.memo(function FrameThumbnail({ imageElement, frame }) {
  const canvasRef = useRef(null);
  const { x = 0, y = 0, w = 0, h = 0 } = frame || {};

  useEffect(() => {
    if (!canvasRef.current || !imageElement || w <= 0 || h <= 0) return;

    const maxDim = 72;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const thumbW = Math.max(1, Math.round(w * scale));
    const thumbH = Math.max(1, Math.round(h * scale));

    const canvas = canvasRef.current;
    canvas.width = thumbW;
    canvas.height = thumbH;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, thumbW, thumbH);
    ctx.drawImage(
      imageElement,
      x,
      y,
      w,
      h,
      0,
      0,
      thumbW,
      thumbH
    );
  }, [imageElement, x, y, w, h]);

  if (!imageElement || !frame) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
        imageRendering: 'pixelated',
        display: 'block',
        margin: 'auto'
      }}
    />
  );
});
