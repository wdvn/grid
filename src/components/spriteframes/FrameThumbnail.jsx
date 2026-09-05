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

    const canvas = canvasRef.current;
    canvas.width = Math.max(1, w);
    canvas.height = Math.max(1, h);

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      imageElement,
      x,
      y,
      w,
      h,
      0,
      0,
      w,
      h
    );
  }, [imageElement, x, y, w, h]);

  if (!imageElement || !frame) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        maxWidth: '100%',
        maxHeight: '100%',
        imageRendering: 'pixelated',
        display: 'block',
        margin: 'auto'
      }}
    />
  );
});
