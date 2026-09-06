import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowRight,
  Upload,
  Download,
  CheckCircle2
} from 'lucide-react';
import { BlenderPropertiesPanel } from './BlenderPropertiesPanel';
import { PixelCanvasEditor } from './PixelCanvasEditor';
import {
  PALETTES,
  applyPixelation,
  applyPaletteAndDithering,
  applyPixelOutline,
  applyAdjustments
} from '../../utils/pixelFilters';

export function CreatorModule({ onSendToAnimator }) {
  // Canvas Dimensions: Default 96x96 for smaller pixels and high-density detail!
  const [resolutionW, setResolutionW] = useState(96);
  const [resolutionH, setResolutionH] = useState(96);

  const [activeColor, setActiveColor] = useState('#3b82f6');
  const [activePaletteId, setActivePaletteId] = useState('pico8');
  const [customColors, setCustomColors] = useState(['#ffffff', '#000000', '#f59e0b', '#10b981', '#ef4444']);

  // Filter Engine Settings
  const [filterSettings, setFilterSettings] = useState({
    pixelSize: 1,
    paletteId: 'none',
    ditherMethod: 'none',
    outlineColor: null,
    brightness: 0,
    contrast: 0,
    saturation: 0
  });

  // Frames Array: [{ id, canvas }]
  const [frames, setFrames] = useState([]);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);

  // Asset Name
  const [assetName, setAssetName] = useState('Pixel_Character_HD');
  const [notification, setNotification] = useState(null);

  const fileInputRef = useRef(null);

  // Helper to create an empty canvas of size W x H
  const createEmptyCanvas = useCallback((w = resolutionW, h = resolutionH) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return c;
  }, [resolutionW, resolutionH]);

  // Rescale / Resample existing frames when resolution changes (Nearest-Neighbor preservation)
  const changeResolution = (newW, newH) => {
    if (newW === resolutionW && newH === resolutionH) return;

    setFrames((prev) => {
      return prev.map((f) => {
        const newC = document.createElement('canvas');
        newC.width = newW;
        newC.height = newH;
        const ctx = newC.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        if (f.canvas) {
          ctx.drawImage(f.canvas, 0, 0, newW, newH);
        }
        return { ...f, canvas: newC };
      });
    });

    setResolutionW(newW);
    setResolutionH(newH);
    setNotification(`Resolution set to ${newW}×${newH} px`);
    setTimeout(() => setNotification(null), 2000);
  };

  // Initialize with High-Detail preset on mount (96x96 default)
  useEffect(() => {
    generateProceduralPreset('knight', 96, 96);
  }, []);

  // Update specific frame canvas
  const handleUpdateFrameCanvas = useCallback((idx, sourceCanvas) => {
    setFrames((prev) => {
      const copy = [...prev];
      if (!copy[idx]) return prev;
      const c = document.createElement('canvas');
      c.width = resolutionW;
      c.height = resolutionH;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sourceCanvas, 0, 0);
      copy[idx] = { ...copy[idx], canvas: c };
      return copy;
    });
  }, [resolutionW, resolutionH]);

  // Frame strip management
  const handleAddFrame = () => {
    const newCanvas = createEmptyCanvas();
    setFrames((prev) => [
      ...prev,
      { id: `frame_${Date.now()}_${prev.length}`, canvas: newCanvas }
    ]);
    setActiveFrameIndex(frames.length);
  };

  const handleDuplicateFrame = () => {
    const curr = frames[activeFrameIndex];
    if (!curr || !curr.canvas) return;
    const newCanvas = document.createElement('canvas');
    newCanvas.width = resolutionW;
    newCanvas.height = resolutionH;
    const ctx = newCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(curr.canvas, 0, 0);

    setFrames((prev) => {
      const copy = [...prev];
      copy.splice(activeFrameIndex + 1, 0, {
        id: `frame_${Date.now()}_dup`,
        canvas: newCanvas
      });
      return copy;
    });
    setActiveFrameIndex(activeFrameIndex + 1);
  };

  const handleDeleteFrame = () => {
    if (frames.length <= 1) return;
    setFrames((prev) => prev.filter((_, i) => i !== activeFrameIndex));
    setActiveFrameIndex((prev) => Math.max(0, prev - 1));
  };

  // High-Density Procedural Sprite Generation Presets
  const generateProceduralPreset = (presetType, targetW = resolutionW, targetH = resolutionH) => {
    const count = presetType === 'coin' ? 6 : 4;
    const newFrames = [];
    setResolutionW(targetW);
    setResolutionH(targetH);

    const s = targetW / 32; // Scale factor relative to 32px base

    for (let i = 0; i < count; i++) {
      const c = document.createElement('canvas');
      c.width = targetW;
      c.height = targetH;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      const cx = targetW / 2;
      const cy = targetH / 2;

      if (presetType === 'slime') {
        // High-Detail Bouncing Slime
        setAssetName(`Pixel_Slime_${targetW}x${targetH}`);
        const squish = Math.sin((i / count) * Math.PI * 2) * (3 * s);
        const rx = 10 * s + squish;
        const ry = 9 * s - squish;
        const baseY = cy + 4 * s + squish * 0.5;

        // Drop Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(cx, targetH - 4 * s, 12 * s, 3.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Outer Dark Green Rim
        ctx.fillStyle = '#064e3b';
        ctx.beginPath();
        ctx.ellipse(cx, baseY, rx + 1.5 * s, ry + 1.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main Emerald Slime Body
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.ellipse(cx, baseY, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner lighter core
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.ellipse(cx, baseY + 1 * s, rx * 0.8, ry * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Specular highlight dither bubble
        ctx.fillStyle = '#a7f3d0';
        ctx.beginPath();
        ctx.ellipse(cx - 3 * s, baseY - 3 * s, rx * 0.35, ry * 0.3, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Mini sparkle dots
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.floor(cx - 4 * s), Math.floor(baseY - 4 * s), Math.max(1, Math.floor(1.5 * s)), Math.max(1, Math.floor(1.5 * s)));
        ctx.fillRect(Math.floor(cx + 4 * s), Math.floor(baseY + 2 * s), Math.max(1, Math.floor(1 * s)), Math.max(1, Math.floor(1 * s)));

        // Eyes with shine
        const eyeW = Math.max(2, Math.floor(2 * s));
        const eyeH = Math.max(3, Math.floor(3 * s));
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(Math.floor(cx - 4.5 * s), Math.floor(baseY - 1 * s), eyeW, eyeH);
        ctx.fillRect(Math.floor(cx + 2.5 * s), Math.floor(baseY - 1 * s), eyeW, eyeH);

        ctx.fillStyle = '#ffffff';
        const shineSize = Math.max(1, Math.floor(1 * s));
        ctx.fillRect(Math.floor(cx - 4.5 * s), Math.floor(baseY - 1 * s), shineSize, shineSize);
        ctx.fillRect(Math.floor(cx + 2.5 * s), Math.floor(baseY - 1 * s), shineSize, shineSize);

        // Blushing cheeks
        ctx.fillStyle = '#059669';
        ctx.fillRect(Math.floor(cx - 6 * s), Math.floor(baseY + 1.5 * s), Math.floor(1.5 * s), Math.floor(1 * s));
        ctx.fillRect(Math.floor(cx + 4.5 * s), Math.floor(baseY + 1.5 * s), Math.floor(1.5 * s), Math.floor(1 * s));

      } else if (presetType === 'coin') {
        // High-Detail Rotating Gold Coin
        setAssetName(`Gold_Coin_HD_${targetW}x${targetH}`);
        const phase = (i / count) * Math.PI;
        const widthScale = Math.max(0.12, Math.abs(Math.cos(phase)));
        const coinW = 10 * s * widthScale;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, targetH - 5 * s, 9 * s * widthScale, 2.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Outer dark gold rim
        ctx.fillStyle = '#78350f';
        ctx.fillRect(Math.floor(cx - coinW - 1 * s), Math.floor(cy - 9 * s), Math.floor((coinW + 1 * s) * 2), Math.floor(18 * s));

        // Mid gold body
        ctx.fillStyle = '#d97706';
        ctx.fillRect(Math.floor(cx - coinW), Math.floor(cy - 8.5 * s), Math.floor(coinW * 2), Math.floor(17 * s));

        // Bright gold face
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(Math.floor(cx - coinW * 0.85), Math.floor(cy - 7.5 * s), Math.floor(coinW * 1.7), Math.floor(15 * s));

        // Specular shimmer reflection
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(Math.floor(cx - coinW * 0.5), Math.floor(cy - 6.5 * s), Math.max(1, Math.floor(coinW * 0.4)), Math.floor(13 * s));

        if (widthScale > 0.4) {
          ctx.fillStyle = '#b45309';
          ctx.fillRect(Math.floor(cx - 1 * s * widthScale), Math.floor(cy - 3 * s), Math.max(1, Math.floor(2 * s * widthScale)), Math.floor(6 * s));
          ctx.fillRect(Math.floor(cx - 3 * s * widthScale), Math.floor(cy - 1 * s), Math.max(1, Math.floor(6 * s * widthScale)), Math.floor(2 * s));
        }

      } else if (presetType === 'knight' || presetType === 'hero') {
        // High-Detail Armored Knight
        setAssetName(`Pixel_Knight_HD_${targetW}x${targetH}`);
        const bob = (i % 2 === 0) ? 0 : -Math.floor(1.5 * s);
        const legStep = (i % 4) * (2 * s) - (3 * s);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(cx, targetH - 4 * s, 8 * s, 2.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Flowing Red Cape
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(Math.floor(cx - 7 * s), Math.floor(cy - 4 * s + bob), Math.floor(5 * s), Math.floor(12 * s));
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(Math.floor(cx - 6 * s), Math.floor(cy - 2 * s + bob), Math.floor(3 * s), Math.floor(10 * s));

        // Armored Legs & Sabatons
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(Math.floor(cx - 4 * s + legStep), Math.floor(cy + 6 * s + bob), Math.floor(3 * s), Math.floor(7 * s));
        ctx.fillRect(Math.floor(cx + 1 * s - legStep), Math.floor(cy + 6 * s + bob), Math.floor(3 * s), Math.floor(7 * s));
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(Math.floor(cx - 4 * s + legStep), Math.floor(cy + 6 * s + bob), Math.floor(3 * s), Math.floor(1.5 * s));
        ctx.fillRect(Math.floor(cx + 1 * s - legStep), Math.floor(cy + 6 * s + bob), Math.floor(3 * s), Math.floor(1.5 * s));

        // Steel Breastplate Torso
        ctx.fillStyle = '#334155';
        ctx.fillRect(Math.floor(cx - 5 * s), Math.floor(cy - 4 * s + bob), Math.floor(10 * s), Math.floor(10 * s));
        ctx.fillStyle = '#64748b';
        ctx.fillRect(Math.floor(cx - 3 * s), Math.floor(cy - 3 * s + bob), Math.floor(6 * s), Math.floor(7 * s));
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(Math.floor(cx - 1 * s), Math.floor(cy - 2 * s + bob), Math.floor(2 * s), Math.floor(5 * s));

        // Golden Pauldrons
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(Math.floor(cx - 7 * s), Math.floor(cy - 4 * s + bob), Math.floor(3 * s), Math.floor(4 * s));
        ctx.fillRect(Math.floor(cx + 4 * s), Math.floor(cy - 4 * s + bob), Math.floor(3 * s), Math.floor(4 * s));

        // Steel Great Helm
        ctx.fillStyle = '#475569';
        ctx.fillRect(Math.floor(cx - 4 * s), Math.floor(cy - 12 * s + bob), Math.floor(8 * s), Math.floor(8 * s));
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(Math.floor(cx - 2 * s), Math.floor(cy - 11 * s + bob), Math.floor(4 * s), Math.floor(6 * s));

        // Golden Helmet Plume
        ctx.fillStyle = '#eab308';
        ctx.fillRect(Math.floor(cx - 1.5 * s), Math.floor(cy - 15 * s + bob), Math.floor(3 * s), Math.floor(3.5 * s));
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(Math.floor(cx - 0.5 * s), Math.floor(cy - 15 * s + bob), Math.floor(1 * s), Math.floor(3 * s));

        // T-Shaped Visor Slit
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(Math.floor(cx - 1.5 * s), Math.floor(cy - 8.5 * s + bob), Math.floor(5 * s), Math.floor(2 * s));
        ctx.fillRect(Math.floor(cx + 0.5 * s), Math.floor(cy - 8.5 * s + bob), Math.floor(1.5 * s), Math.floor(4 * s));

        // Gleaming Broadsword
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(Math.floor(cx + 7 * s), Math.floor(cy - 8 * s + bob), Math.floor(2 * s), Math.floor(14 * s));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.floor(cx + 7.5 * s), Math.floor(cy - 7 * s + bob), Math.floor(1 * s), Math.floor(10 * s));
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(Math.floor(cx + 5 * s), Math.floor(cy + 1 * s + bob), Math.floor(6 * s), Math.floor(2 * s));
        ctx.fillRect(Math.floor(cx + 7 * s), Math.floor(cy + 5 * s + bob), Math.floor(2 * s), Math.floor(2 * s));

      } else if (presetType === 'ghost') {
        // High-Detail Ethereal Ghost
        setAssetName(`Ethereal_Ghost_HD_${targetW}x${targetH}`);
        const floatY = Math.sin((i / count) * Math.PI * 2) * (3 * s);
        const gy = cy - 2 * s + floatY;

        ctx.fillStyle = '#581c87';
        ctx.beginPath();
        ctx.arc(cx, gy, 11 * s, Math.PI, 0, false);
        ctx.lineTo(cx + 11 * s, gy + 13 * s);
        ctx.lineTo(cx - 11 * s, gy + 13 * s);
        ctx.fill();

        ctx.fillStyle = '#7e22ce';
        ctx.beginPath();
        ctx.arc(cx, gy, 9 * s, Math.PI, 0, false);
        ctx.lineTo(cx + 9 * s, gy + 11 * s);
        ctx.lineTo(cx - 9 * s, gy + 11 * s);
        ctx.fill();

        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(cx, gy, 6.5 * s, Math.PI, 0, false);
        ctx.lineTo(cx + 6.5 * s, gy + 8 * s);
        ctx.lineTo(cx - 6.5 * s, gy + 8 * s);
        ctx.fill();

        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(Math.floor(cx - 4.5 * s), Math.floor(gy - 1.5 * s), Math.floor(2.5 * s), Math.floor(4 * s));
        ctx.fillRect(Math.floor(cx + 2 * s), Math.floor(gy - 1.5 * s), Math.floor(2.5 * s), Math.floor(4 * s));

        ctx.fillStyle = '#cffafe';
        ctx.fillRect(Math.floor(cx - 4 * s), Math.floor(gy - 1 * s), Math.floor(1 * s), Math.floor(2 * s));
        ctx.fillRect(Math.floor(cx + 2.5 * s), Math.floor(gy - 1 * s), Math.floor(1 * s), Math.floor(2 * s));

        ctx.fillStyle = '#38bdf8';
        const sparkleOffset = (i * 4 * s) % (targetH);
        ctx.fillRect(Math.floor(cx - 8 * s), Math.floor((cy - 6 * s + sparkleOffset) % targetH), Math.max(1, Math.floor(1.5 * s)), Math.max(1, Math.floor(1.5 * s)));
        ctx.fillRect(Math.floor(cx + 8 * s), Math.floor((cy + 2 * s - sparkleOffset + targetH) % targetH), Math.max(1, Math.floor(1.5 * s)), Math.max(1, Math.floor(1.5 * s)));
      }

      newFrames.push({
        id: `preset_frame_${i}`,
        canvas: c
      });
    }

    setFrames(newFrames);
    setActiveFrameIndex(0);
    setNotification(`Generated ${presetType.toUpperCase()} preset at ${targetW}×${targetH}`);
    setTimeout(() => setNotification(null), 2500);
  };

  // Upload external photo/image to downscale to high-density pixel art
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = resolutionW;
        c.height = resolutionH;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        ctx.drawImage(img, 0, 0, resolutionW, resolutionH);

        applyAdjustments(ctx, resolutionW, resolutionH, { brightness: 5, contrast: 15, saturation: 10 });
        applyPaletteAndDithering(ctx, resolutionW, resolutionH, 'pico8', 'floyd');

        const newFrame = {
          id: `uploaded_${Date.now()}`,
          canvas: c
        };

        setAssetName(file.name.replace(/\.[^/.]+$/, ''));
        setFrames([newFrame]);
        setActiveFrameIndex(0);

        setNotification(`Image imported & converted to ${resolutionW}×${resolutionH} pixel art!`);
        setTimeout(() => setNotification(null), 3000);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Bake Filter Effects directly onto all frames in strip
  const handleBakeFilters = () => {
    if (frames.length === 0) return;

    setFrames((prev) => {
      return prev.map((f) => {
        if (!f.canvas) return f;
        const newC = document.createElement('canvas');
        newC.width = resolutionW;
        newC.height = resolutionH;
        const ctx = newC.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(f.canvas, 0, 0);

        if (filterSettings.pixelSize > 1) {
          applyPixelation(ctx, resolutionW, resolutionH, filterSettings.pixelSize);
        }

        applyAdjustments(ctx, resolutionW, resolutionH, {
          brightness: filterSettings.brightness,
          contrast: filterSettings.contrast,
          saturation: filterSettings.saturation
        });

        if (filterSettings.paletteId !== 'none') {
          applyPaletteAndDithering(
            ctx,
            resolutionW,
            resolutionH,
            filterSettings.paletteId,
            filterSettings.ditherMethod
          );
        }

        if (filterSettings.outlineColor) {
          applyPixelOutline(ctx, resolutionW, resolutionH, filterSettings.outlineColor);
        }

        return { ...f, canvas: newC };
      });
    });

    setNotification('Filters permanently baked into layer!');
    setTimeout(() => setNotification(null), 2500);
  };

  // Reset Filters to default
  const handleResetFilters = () => {
    setFilterSettings({
      pixelSize: 1,
      paletteId: 'none',
      ditherMethod: 'none',
      outlineColor: null,
      brightness: 0,
      contrast: 0,
      saturation: 0
    });
  };

  // Export full sprite sheet strip as PNG
  const handleExportPng = () => {
    if (frames.length === 0) return;
    const stripCanvas = document.createElement('canvas');
    stripCanvas.width = resolutionW * frames.length;
    stripCanvas.height = resolutionH;
    const ctx = stripCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    frames.forEach((f, i) => {
      if (f.canvas) {
        ctx.drawImage(f.canvas, i * resolutionW, 0);
      }
    });

    const link = document.createElement('a');
    link.download = `${assetName || 'spritesheet'}_${resolutionW}x${resolutionH}.png`;
    link.href = stripCanvas.toDataURL('image/png');
    link.click();
  };

  // Bridge: Send to Animator Module!
  const handleSendToAnimator = () => {
    if (frames.length === 0) return;

    const stripCanvas = document.createElement('canvas');
    stripCanvas.width = resolutionW * frames.length;
    stripCanvas.height = resolutionH;
    const ctx = stripCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    frames.forEach((f, i) => {
      if (f.canvas) {
        ctx.drawImage(f.canvas, i * resolutionW, 0);
      }
    });

    const dataUrl = stripCanvas.toDataURL('image/png');
    const sheetId = `sheet_creator_${Date.now()}`;

    const slicedFrames = frames.map((_, i) => ({
      id: `frame_${sheetId}_${i + 1}`,
      sheetId: sheetId,
      name: `${assetName}_f${i + 1}`,
      x: i * resolutionW,
      y: 0,
      w: resolutionW,
      h: resolutionH,
      pivotX: 0.5,
      pivotY: 0.85
    }));

    const animId = `anim_${Date.now()}`;
    const defaultAnimation = {
      id: animId,
      name: `${assetName}_Action`,
      speed: 8,
      loop: true,
      frameIds: slicedFrames.map((f) => f.id)
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const sheetData = {
        id: sheetId,
        name: assetName,
        imageSrc: dataUrl,
        imageDimensions: { width: stripCanvas.width, height: stripCanvas.height },
        imageElement: img
      };

      onSendToAnimator?.(sheetData, slicedFrames, [defaultAnimation]);
    };
    img.src = dataUrl;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070a13] overflow-hidden">
      {/* 1. Top Blender-Style Mode Header Bar (Compact 36px Standard) */}
      <div className="h-9 px-3 bg-[#090e1a] border-b border-white/10 text-slate-200 flex items-center justify-between flex-shrink-0">
        {/* Left: Asset Title & Specs */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/30">
            🎨
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              className="bg-slate-950 border border-white/15 focus:border-blue-500 rounded px-2 h-6 text-xs font-bold text-white tracking-wide w-40 sm:w-48"
              placeholder="Asset Sheet Name"
            />
            <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 h-6 flex items-center rounded font-mono font-bold whitespace-nowrap">
              {resolutionW}×{resolutionH} PX
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {notification && (
            <div className="flex items-center gap-1 text-[11px] text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2 h-6 rounded shadow-sm">
              <CheckCircle2 size={12} />
              <span className="whitespace-nowrap">{notification}</span>
            </div>
          )}

          {/* Import External Image */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary btn-sm flex items-center gap-1.5 whitespace-nowrap"
            title="Import an image or photo to convert into fine pixel art"
          >
            <Upload size={12} className="text-blue-400" />
            <span>Import Image</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          {/* Export PNG Strip */}
          <button
            onClick={handleExportPng}
            className="btn btn-secondary btn-sm flex items-center gap-1.5 whitespace-nowrap"
            title="Export full strip as PNG"
          >
            <Download size={12} className="text-slate-300" />
            <span>Export PNG</span>
          </button>

          {/* Send to Animator Button */}
          <button
            onClick={handleSendToAnimator}
            className="btn btn-primary btn-sm flex items-center gap-1.5 font-bold shadow-md shadow-blue-500/25 whitespace-nowrap"
            title="Send this sprite strip directly into the Animator module to slice and animate"
          >
            <span>Send to Animator</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* 2. Main Studio Workspace: Viewport & Timeline (Left) + Blender Properties Panel (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center: Pixel Canvas Viewport with Left T-Panel & Bottom Dope Sheet */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <PixelCanvasEditor
            frameWidth={resolutionW}
            frameHeight={resolutionH}
            activeColor={activeColor}
            onPickColor={setActiveColor}
            frames={frames}
            activeFrameIndex={activeFrameIndex}
            onSelectFrameIndex={setActiveFrameIndex}
            onAddFrame={handleAddFrame}
            onDuplicateFrame={handleDuplicateFrame}
            onDeleteFrame={handleDeleteFrame}
            onUpdateFrameCanvas={handleUpdateFrameCanvas}
            filterSettings={filterSettings}
          />
        </div>

        {/* Right: Blender N-Panel Properties Inspector */}
        <BlenderPropertiesPanel
          activePaletteId={activePaletteId}
          onSelectPalette={setActivePaletteId}
          activeColor={activeColor}
          onSelectColor={setActiveColor}
          customColors={customColors}
          onAddCustomColor={(c) => setCustomColors((prev) => [...new Set([...prev, c])])}
          filterSettings={filterSettings}
          onUpdateFilterSettings={setFilterSettings}
          onApplyFilters={handleBakeFilters}
          onResetFilters={handleResetFilters}
          resolutionW={resolutionW}
          resolutionH={resolutionH}
          onChangeResolution={changeResolution}
          onGeneratePreset={(type) => generateProceduralPreset(type, resolutionW, resolutionH)}
        />
      </div>
    </div>
  );
}
