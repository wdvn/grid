import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  Hand,
  RotateCcw,
  RotateCw,
  Plus,
  Trash2,
  Copy,
  Play,
  Pause,
  Grid,
  FlipHorizontal,
  Focus,
  ZoomIn,
  ZoomOut,
  Layers,
  Sparkles,
  RotateCcw as ResetIcon,
  Bone as BoneIcon
} from 'lucide-react';
import {
  computeForwardKinematics,
  compositeLayers,
  radToDeg,
  degToRad
} from '../../utils/skeletonRig';

function CreatorFrameThumb({ canvas }) {
  const thumbRef = useRef(null);

  useEffect(() => {
    if (!thumbRef.current || !canvas) return;
    const tc = thumbRef.current;
    const ctx = tc.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, tc.width, tc.height);
    ctx.drawImage(canvas, 0, 0, tc.width, tc.height);
  }, [canvas]);

  return (
    <canvas
      ref={thumbRef}
      width={28}
      height={28}
      className="w-7 h-7 object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

export function PixelCanvasEditor({
  frameWidth = 96,
  frameHeight = 96,
  activeColor = '#3b82f6',
  onPickColor,
  frames = [],
  activeFrameIndex = 0,
  onSelectFrameIndex,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  currentFrame = null,
  onUpdateActiveLayerCanvas,
  onClearActiveCel,
  editorMode = 'draw', // 'draw' | 'rig'
  onSelectEditorMode,
  selectedBoneId = null,
  onSelectBoneId,
  onUpdateBones,
  onBakePoseToNewFrame,
  onResetPose,
  showBonesOverlay = true,
  onToggleBonesOverlay,
  onSelectLayer
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const onionCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Tools: 'pencil' | 'eraser' | 'bucket' | 'eyedropper' | 'hand'
  const [activeTool, setActiveTool] = useState('pencil');
  const [brushSize, setBrushSize] = useState(1); // 1, 2, 3, 4, 6px
  const [isSymmetryActive, setIsSymmetryActive] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showOnionSkin, setShowOnionSkin] = useState(false);

  // Viewport Transform: Zoom and Pan
  const [zoom, setZoom] = useState(8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPixelRef = useRef(null);
  const [hoverPixel, setHoverPixel] = useState(null);

  // Undo / Redo history
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Strip live preview playback
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [previewFrameIdx, setPreviewFrameIdx] = useState(0);

  // Bone interactive dragging state in Rig Mode
  const [dragBoneState, setDragBoneState] = useState(null);
  const [hoverBone, setHoverBone] = useState(null); // { id, part: 'joint' | 'tip' | 'body' }

  // Current Frame layers & active layer
  const layers = useMemo(() => currentFrame?.layers || [], [currentFrame]);
  const activeLayer = useMemo(() => {
    return layers.find((l) => l.id === currentFrame?.activeLayerId) || layers[0] || null;
  }, [layers, currentFrame?.activeLayerId]);

  // Bones and FK
  const bones = useMemo(() => currentFrame?.rig?.bones || [], [currentFrame?.rig?.bones]);
  const fkResult = useMemo(() => computeForwardKinematics(bones), [bones]);

  const boneLayerMap = useMemo(() => {
    const map = new Map();
    bones.forEach((b) => {
      if (b.bindLayerId) map.set(b.bindLayerId, b.id);
    });
    return map;
  }, [bones]);

  // Auto-fit zoom whenever frame dimensions change
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const availableW = Math.max(150, rect.width - 60);
      const availableH = Math.max(150, rect.height - 60);
      const idealZoom = Math.floor(Math.min(availableW / frameWidth, availableH / frameHeight));
      const clampedZoom = Math.max(1, Math.min(32, idealZoom || 6));
      setZoom(clampedZoom);
      setPan({ x: 0, y: 0 });
    }
  }, [frameWidth, frameHeight]);



  // Smooth Cursor-Centered Mouse Wheel Zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;

      const zoomFactor = e.deltaY < 0 ? 1.2 : 0.833;

      setZoom((prevZoom) => {
        let nextZoom;
        if (prevZoom >= 4) {
          nextZoom = Math.round(prevZoom * zoomFactor);
        } else {
          nextZoom = Math.round(prevZoom * zoomFactor * 10) / 10;
        }
        nextZoom = Math.max(1, Math.min(64, nextZoom));

        if (nextZoom === prevZoom) return prevZoom;

        // Anchor pan to mouse cursor position
        setPan((prevPan) => {
          const scaleChange = nextZoom / prevZoom;
          return {
            x: Math.round(mouseX - (mouseX - prevPan.x) * scaleChange),
            y: Math.round(mouseY - (mouseY - prevPan.y) * scaleChange)
          };
        });

        return nextZoom;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Convert Canvas Coordinates to Pixel Coordinates
  const getPixelCoord = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / zoom);
    const y = Math.floor((e.clientY - rect.top) / zoom);
    if (x < 0 || x >= frameWidth || y < 0 || y >= frameHeight) return null;
    return { x, y };
  }, [frameWidth, frameHeight, zoom]);

  // Convert Canvas Coordinates to precise float point
  const getFloatCoord = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    return { x, y };
  }, [zoom]);

  // Render the Display Canvas (either Composite in Draw mode or FK Transform in Rig mode)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentFrame) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, frameWidth, frameHeight);

    if (editorMode === 'rig') {
      // Live FK transformed layers rendering
      const comp = compositeLayers(layers, frameWidth, frameHeight, fkResult, boneLayerMap);
      ctx.drawImage(comp, 0, 0);
    } else {
      // Normal Composite layers rendering
      if (currentFrame.compositeCanvas) {
        ctx.drawImage(currentFrame.compositeCanvas, 0, 0);
      } else {
        const comp = compositeLayers(layers, frameWidth, frameHeight);
        ctx.drawImage(comp, 0, 0);
      }
    }
  }, [currentFrame, layers, editorMode, fkResult, boneLayerMap, frameWidth, frameHeight]);

  // Onion Skinning Engine (Aseprite Core Mechanic)
  // Renders previous frame tinted Red (#f43f5e) and next frame tinted Blue (#38bdf8)
  useEffect(() => {
    const onionCanvas = onionCanvasRef.current;
    if (!onionCanvas) return;
    const ctx = onionCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, frameWidth, frameHeight);

    if (!showOnionSkin || frames.length <= 1) return;

    // 1. Previous frame ghost (Red tint #f43f5e, 35% opacity)
    if (activeFrameIndex > 0) {
      const prevFrame = frames[activeFrameIndex - 1];
      const prevSource = prevFrame?.compositeCanvas || prevFrame?.canvas;
      if (prevSource) {
        const offscreen = document.createElement('canvas');
        offscreen.width = frameWidth;
        offscreen.height = frameHeight;
        const oCtx = offscreen.getContext('2d');
        oCtx.imageSmoothingEnabled = false;
        oCtx.drawImage(prevSource, 0, 0);
        oCtx.globalCompositeOperation = 'source-in';
        oCtx.fillStyle = '#f43f5e';
        oCtx.fillRect(0, 0, frameWidth, frameHeight);

        ctx.globalAlpha = 0.35;
        ctx.drawImage(offscreen, 0, 0);
      }
    }

    // 2. Next frame ghost (Blue tint #38bdf8, 35% opacity)
    if (activeFrameIndex < frames.length - 1) {
      const nextFrame = frames[activeFrameIndex + 1];
      const nextSource = nextFrame?.compositeCanvas || nextFrame?.canvas;
      if (nextSource) {
        const offscreen = document.createElement('canvas');
        offscreen.width = frameWidth;
        offscreen.height = frameHeight;
        const oCtx = offscreen.getContext('2d');
        oCtx.imageSmoothingEnabled = false;
        oCtx.drawImage(nextSource, 0, 0);
        oCtx.globalCompositeOperation = 'source-in';
        oCtx.fillStyle = '#38bdf8';
        oCtx.fillRect(0, 0, frameWidth, frameHeight);

        ctx.globalAlpha = 0.35;
        ctx.drawImage(offscreen, 0, 0);
      }
    }

    ctx.globalAlpha = 1.0;
  }, [showOnionSkin, activeFrameIndex, frames, frameWidth, frameHeight]);

  // Render Skeleton Rig Overlay Gizmo on top of canvas
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (editorMode !== 'rig' || !showBonesOverlay || bones.length === 0) return;

    // Draw each bone in the hierarchy
    bones.forEach((bone) => {
      const transform = fkResult.get(bone.id);
      if (!transform) return;

      const sx = transform.startX * zoom;
      const sy = transform.startY * zoom;
      const ex = transform.endX * zoom;
      const ey = transform.endY * zoom;

      const isSel = bone.id === selectedBoneId;
      const isHov = hoverBone?.id === bone.id;

      // Bone vector and perpendicular
      const dx = ex - sx;
      const dy = ey - sy;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = len > 0 ? -dy / len : 0;
      const ny = len > 0 ? dx / len : 0;

      // Diamond width for 3D octahedral bone look
      const boneWidth = Math.max(4, Math.min(14, len * 0.22));
      const midRatio = 0.25;
      const mx = sx + dx * midRatio;
      const my = sy + dy * midRatio;

      const p1x = sx;
      const p1y = sy;
      const p2x = mx + nx * boneWidth;
      const p2y = my + ny * boneWidth;
      const p3x = ex;
      const p3y = ey;
      const p4x = mx - nx * boneWidth;
      const p4y = my - ny * boneWidth;

      // 1. Draw Octahedral Bone Shape
      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineTo(p3x, p3y);
      ctx.lineTo(p4x, p4y);
      ctx.closePath();

      if (isSel) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.45)';
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
      } else if (isHov) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.strokeStyle = bone.color || '#94a3b8';
        ctx.lineWidth = 1.5;
      }
      ctx.fill();
      ctx.stroke();

      // 2. Joint Ball (Pivot)
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(3, 4 * (zoom / 6)), 0, Math.PI * 2);
      ctx.fillStyle = isSel ? '#3b82f6' : bone.color || '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 3. Tip Circle (Handle to rotate)
      ctx.beginPath();
      ctx.arc(ex, ey, Math.max(2.5, 3.5 * (zoom / 6)), 0, Math.PI * 2);
      ctx.fillStyle = isSel ? '#60a5fa' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = isSel ? '#1e3a8a' : '#0f172a';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 4. Bone Label
      if (zoom >= 4) {
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = isSel ? '#93c5fd' : '#e2e8f0';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 4;
        const labelText = bone.bindLayerId ? `${bone.name} 🔗` : bone.name;
        ctx.fillText(labelText, ex + 6, ey + 3);
        ctx.shadowBlur = 0;
      }
    });
  }, [editorMode, showBonesOverlay, bones, fkResult, selectedBoneId, hoverBone, zoom]);

  // Save history snapshot of active layer
  const saveSnapshot = useCallback(() => {
    if (!activeLayer || !activeLayer.canvas) return;
    const ctx = activeLayer.canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, frameWidth, frameHeight);
    setUndoStack((prev) => [...prev.slice(-25), imgData]);
    setRedoStack([]);
  }, [activeLayer, frameWidth, frameHeight]);

  // Draw a single pixel block at (x, y) with symmetry support on active layer
  const drawPixelAt = useCallback((ctx, x, y, color, isErase = false) => {
    if (x < 0 || x >= frameWidth || y < 0 || y >= frameHeight) return;

    // Aseprite Alpha Lock (Preserve Transparency)
    if (activeLayer?.alphaLocked) {
      if (isErase) return; // Erasing transparency is forbidden when alpha is locked
      ctx.globalCompositeOperation = 'source-atop';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    if (isErase) {
      ctx.clearRect(x, y, 1, 1);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }

    if (isSymmetryActive) {
      const symX = frameWidth - 1 - x;
      if (isErase) {
        ctx.clearRect(symX, y, 1, 1);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(symX, y, 1, 1);
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  }, [frameWidth, frameHeight, isSymmetryActive, activeLayer?.alphaLocked]);

  // Draw brush stamp of size `brushSize`
  const drawBrushStamp = useCallback((ctx, cx, cy, color, isErase = false) => {
    const half = Math.floor(brushSize / 2);
    for (let ox = 0; ox < brushSize; ox++) {
      for (let oy = 0; oy < brushSize; oy++) {
        drawPixelAt(ctx, cx - half + ox, cy - half + oy, color, isErase);
      }
    }
  }, [brushSize, drawPixelAt]);

  // Bresenham's Line Algorithm
  const drawBresenhamStroke = useCallback((ctx, x0, y0, x1, y1, color, isErase = false) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let cx = x0;
    let cy = y0;

    while (true) {
      drawBrushStamp(ctx, cx, cy, color, isErase);
      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
  }, [drawBrushStamp]);

  const hexToRgba = (hex) => {
    if (hex.startsWith('#')) {
      const c = hex.slice(1);
      if (c.length === 3) {
        return [
          parseInt(c[0] + c[0], 16),
          parseInt(c[1] + c[1], 16),
          parseInt(c[2] + c[2], 16),
          255
        ];
      }
      if (c.length === 6) {
        return [
          parseInt(c.slice(0, 2), 16),
          parseInt(c.slice(2, 4), 16),
          parseInt(c.slice(4, 6), 16),
          255
        ];
      }
    }
    return [0, 0, 0, 255];
  };

  // Flood fill algorithm on active layer
  const floodFill = useCallback((targetX, targetY, fillColor) => {
    if (!activeLayer || !activeLayer.canvas || activeLayer.locked || !activeLayer.visible) return;

    const ctx = activeLayer.canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, frameWidth, frameHeight);
    const data = imgData.data;

    const startIdx = (targetY * frameWidth + targetX) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    const startA = data[startIdx + 3];

    // Aseprite Alpha Lock: Do not fill transparent background when alpha is locked
    if (activeLayer.alphaLocked && startA === 0) {
      return;
    }

    const [fillR, fillG, fillB, fillA] = hexToRgba(fillColor);

    if (startR === fillR && startG === fillG && startB === fillB && startA === fillA) {
      return;
    }

    saveSnapshot();

    const queue = [[targetX, targetY]];
    const seen = new Uint8Array(frameWidth * frameHeight);
    seen[targetY * frameWidth + targetX] = 1;

    const matchColor = (idx) => {
      return (
        data[idx] === startR &&
        data[idx + 1] === startG &&
        data[idx + 2] === startB &&
        data[idx + 3] === startA
      );
    };

    while (queue.length > 0) {
      const [cx, cy] = queue.pop();
      const idx = (cy * frameWidth + cx) * 4;

      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      if (!activeLayer.alphaLocked) {
        data[idx + 3] = fillA;
      }

      const neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1]
      ];

      for (let i = 0; i < neighbors.length; i++) {
        const [nx, ny] = neighbors[i];
        if (nx >= 0 && nx < frameWidth && ny >= 0 && ny < frameHeight) {
          const nIndex = ny * frameWidth + nx;
          if (!seen[nIndex]) {
            seen[nIndex] = 1;
            if (matchColor(nIndex * 4)) {
              queue.push([nx, ny]);
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    onUpdateActiveLayerCanvas?.(activeLayer.canvas);
  }, [activeLayer, frameWidth, frameHeight, saveSnapshot, onUpdateActiveLayerCanvas]);

  // Find bone near a canvas coordinate (in pixels)
  const findBoneAtPoint = useCallback((pt) => {
    if (!pt || bones.length === 0) return null;

    const hitThreshold = 7 / zoom; // ~7 screen pixels

    for (let i = bones.length - 1; i >= 0; i--) {
      const bone = bones[i];
      const transform = fkResult.get(bone.id);
      if (!transform) continue;

      // Check tip handle
      const dTip = Math.hypot(pt.x - transform.endX, pt.y - transform.endY);
      if (dTip <= hitThreshold * 1.5) {
        return { bone, part: 'tip', transform };
      }

      // Check joint ball
      const dJoint = Math.hypot(pt.x - transform.startX, pt.y - transform.startY);
      if (dJoint <= hitThreshold * 1.5) {
        return { bone, part: 'joint', transform };
      }

      // Check bone body distance
      const lineLen = transform.length;
      if (lineLen > 0) {
        const dx = transform.endX - transform.startX;
        const dy = transform.endY - transform.startY;
        const t = Math.max(0, Math.min(1, ((pt.x - transform.startX) * dx + (pt.y - transform.startY) * dy) / (lineLen * lineLen)));
        const projX = transform.startX + t * dx;
        const projY = transform.startY + t * dy;
        const dLine = Math.hypot(pt.x - projX, pt.y - projY);
        if (dLine <= hitThreshold * 1.2) {
          return { bone, part: 'body', transform };
        }
      }
    }
    return null;
  }, [bones, fkResult, zoom]);

  // Mouse Handlers
  const handleMouseDown = (e) => {
    // 1. Pan mode active if Hand tool selected, or holding Space, or middle mouse, or right click
    if (activeTool === 'hand' || isSpaceHeld || e.button === 1 || e.button === 2) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return; // Only left click

    // 2. Rig Mode: Bone dragging & manipulation
    if (editorMode === 'rig') {
      const pt = getFloatCoord(e);
      const hit = findBoneAtPoint(pt);
      if (hit) {
        onSelectBoneId?.(hit.bone.id);
        const transform = hit.transform;
        const mouseAngleRad = Math.atan2(pt.y - transform.startY, pt.x - transform.startX);

        setDragBoneState({
          boneId: hit.bone.id,
          part: hit.part,
          startX: pt.x,
          startY: pt.y,
          jointStartX: transform.startX,
          jointStartY: transform.startY,
          initialRotation: hit.bone.rotation || 0,
          mouseStartAngleRad: mouseAngleRad,
          boneBaseAngleRad: degToRad(hit.bone.baseAngle || 0)
        });
        return;
      }
    }

    // 3. Draw Mode: Drawing on Active Layer
    if (editorMode === 'draw') {
      if (!activeLayer || activeLayer.locked || !activeLayer.visible) return;

      const coord = getPixelCoord(e);
      if (!coord) return;

      saveSnapshot();
      setIsDrawing(true);
      lastPixelRef.current = coord;

      const ctx = activeLayer.canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      if (activeTool === 'pencil') {
        drawBrushStamp(ctx, coord.x, coord.y, activeColor, false);
        onUpdateActiveLayerCanvas?.(activeLayer.canvas);
      } else if (activeTool === 'eraser') {
        drawBrushStamp(ctx, coord.x, coord.y, null, true);
        onUpdateActiveLayerCanvas?.(activeLayer.canvas);
      } else if (activeTool === 'bucket') {
        floodFill(coord.x, coord.y, activeColor);
      } else if (activeTool === 'eyedropper') {
        const displayCanvas = canvasRef.current;
        if (displayCanvas) {
          const p = displayCanvas.getContext('2d').getImageData(coord.x, coord.y, 1, 1).data;
          if (p[3] > 0) {
            const hex = `#${p[0].toString(16).padStart(2, '0')}${p[1].toString(16).padStart(2, '0')}${p[2].toString(16).padStart(2, '0')}`;
            onPickColor?.(hex);
          }
        }
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    const floatCoord = getFloatCoord(e);
    const coord = getPixelCoord(e);
    setHoverPixel(coord);

    // Rig Mode Bone Dragging
    if (editorMode === 'rig') {
      if (dragBoneState && floatCoord) {
        const { boneId, part, jointStartX, jointStartY, initialRotation, mouseStartAngleRad } = dragBoneState;

        if (part === 'tip' || part === 'body') {
          // Rotate bone
          const currentMouseAngleRad = Math.atan2(floatCoord.y - jointStartY, floatCoord.x - jointStartX);
          const deltaAngleDeg = radToDeg(currentMouseAngleRad - mouseStartAngleRad);
          let newRot = initialRotation + deltaAngleDeg;

          // Normalize to [-180, 180]
          while (newRot > 180) newRot -= 360;
          while (newRot < -180) newRot += 360;

          const updatedBones = bones.map((b) =>
            b.id === boneId ? { ...b, rotation: Math.round(newRot) } : b
          );
          onUpdateBones?.(updatedBones);
        } else if (part === 'joint') {
          // Move joint (Root bone or offset)
          const dx = Math.round(floatCoord.x - dragBoneState.startX);
          const dy = Math.round(floatCoord.y - dragBoneState.startY);

          const targetBone = bones.find((b) => b.id === boneId);
          if (targetBone) {
            const updatedBones = bones.map((b) => {
              if (b.id === boneId) {
                if (!b.parentId) {
                  return { ...b, x: Math.round(b.x + dx), y: Math.round(b.y + dy) };
                } else {
                  return { ...b, offsetX: (b.offsetX || 0) + dx, offsetY: (b.offsetY || 0) + dy };
                }
              }
              return b;
            });
            onUpdateBones?.(updatedBones);
            setDragBoneState((prev) => ({
              ...prev,
              startX: floatCoord.x,
              startY: floatCoord.y
            }));
          }
        }
        return;
      }

      // Hover detection on bones
      const hit = findBoneAtPoint(floatCoord);
      setHoverBone(hit ? { id: hit.bone.id, part: hit.part } : null);
      return;
    }

    // Draw Mode Mouse Move
    if (!isDrawing || !coord || !activeLayer || activeLayer.locked || !activeLayer.visible) return;

    const ctx = activeLayer.canvas.getContext('2d');
    const last = lastPixelRef.current || coord;

    if (activeTool === 'pencil') {
      drawBresenhamStroke(ctx, last.x, last.y, coord.x, coord.y, activeColor, false);
      onUpdateActiveLayerCanvas?.(activeLayer.canvas);
    } else if (activeTool === 'eraser') {
      drawBresenhamStroke(ctx, last.x, last.y, coord.x, coord.y, null, true);
      onUpdateActiveLayerCanvas?.(activeLayer.canvas);
    }

    lastPixelRef.current = coord;
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (dragBoneState) {
      setDragBoneState(null);
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
      lastPixelRef.current = null;
      if (activeLayer && activeLayer.canvas) {
        onUpdateActiveLayerCanvas?.(activeLayer.canvas);
      }
    }
  };

  const handleMouseLeave = () => {
    setHoverPixel(null);
    setHoverBone(null);

    if (isPanning) setIsPanning(false);
    if (dragBoneState) setDragBoneState(null);

    if (isDrawing) {
      setIsDrawing(false);
      lastPixelRef.current = null;
      if (activeLayer && activeLayer.canvas) {
        onUpdateActiveLayerCanvas?.(activeLayer.canvas);
      }
    }
  };

  // Undo / Redo on active layer
  const handleUndo = () => {
    if (undoStack.length === 0 || !activeLayer || activeLayer.locked) return;
    const ctx = activeLayer.canvas.getContext('2d');
    const current = ctx.getImageData(0, 0, frameWidth, frameHeight);
    setRedoStack((prev) => [...prev, current]);

    const prev = undoStack[undoStack.length - 1];
    setUndoStack((old) => old.slice(0, old.length - 1));
    ctx.putImageData(prev, 0, 0);
    onUpdateActiveLayerCanvas?.(activeLayer.canvas);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !activeLayer || activeLayer.locked) return;
    const ctx = activeLayer.canvas.getContext('2d');
    const current = ctx.getImageData(0, 0, frameWidth, frameHeight);
    setUndoStack((prev) => [...prev, current]);

    const next = redoStack[redoStack.length - 1];
    setRedoStack((old) => old.slice(0, old.length - 1));
    ctx.putImageData(next, 0, 0);
    onUpdateActiveLayerCanvas?.(activeLayer.canvas);
  };

  // Auto-fit zoom handler
  const handleAutoFitZoom = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const availableW = Math.max(150, rect.width - 60);
      const availableH = Math.max(150, rect.height - 60);
      const idealZoom = Math.floor(Math.min(availableW / frameWidth, availableH / frameHeight));
      setZoom(Math.max(1, Math.min(32, idealZoom || 6)));
      setPan({ x: 0, y: 0 });
    }
  }, [frameWidth, frameHeight]);

  // Comprehensive Creator Studio Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Space hold for Pan
      if (e.code === 'Space' && !e.repeat) {
        setIsSpaceHeld(true);
        return;
      }

      // Undo / Redo (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y)
      if (isCtrlOrCmd && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (isCtrlOrCmd && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Duplicate Frame (Ctrl+D / Cmd+D)
      if (isCtrlOrCmd && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        onDuplicateFrame?.();
        return;
      }

      // Clear Active Cel (Shift+Delete / Shift+Backspace)
      if (e.shiftKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        onClearActiveCel?.();
        return;
      }

      // Delete Frame (Delete / Backspace without Shift)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteFrame?.();
        return;
      }

      // Tools & Toggles (when not holding Ctrl/Cmd or Alt)
      if (!isCtrlOrCmd && !e.altKey) {
        const keyLower = e.key.toLowerCase();

        // Onion Skinning Toggle (O)
        if (keyLower === 'o') {
          e.preventDefault();
          setShowOnionSkin((prev) => !prev);
          return;
        }

        // Pencil Tool (P)
        if (keyLower === 'p') {
          e.preventDefault();
          setActiveTool('pencil');
          if (editorMode !== 'draw') onSelectEditorMode?.('draw');
          return;
        }

        // Eraser Tool (E)
        if (keyLower === 'e') {
          e.preventDefault();
          setActiveTool('eraser');
          if (editorMode !== 'draw') onSelectEditorMode?.('draw');
          return;
        }

        // Paint Bucket Tool (G)
        if (keyLower === 'g') {
          e.preventDefault();
          setActiveTool('bucket');
          if (editorMode !== 'draw') onSelectEditorMode?.('draw');
          return;
        }

        // Eyedropper Tool (I)
        if (keyLower === 'i') {
          e.preventDefault();
          setActiveTool('eyedropper');
          if (editorMode !== 'draw') onSelectEditorMode?.('draw');
          return;
        }

        // Hand Tool (H)
        if (keyLower === 'h') {
          e.preventDefault();
          setActiveTool('hand');
          return;
        }

        // Mirror Symmetry Toggle (X)
        if (keyLower === 'x') {
          e.preventDefault();
          setIsSymmetryActive((prev) => !prev);
          return;
        }

        // Pixel Grid Toggle (# or \)
        if (e.key === '#' || e.key === '\\') {
          e.preventDefault();
          setShowGrid((prev) => !prev);
          return;
        }

        // Rig & Pose Mode Toggle (B or R)
        if (keyLower === 'b' || keyLower === 'r') {
          e.preventDefault();
          onSelectEditorMode?.(editorMode === 'rig' ? 'draw' : 'rig');
          return;
        }

        // Brush Sizes: 1, 2, 3, 4, 6 (in Draw Mode)
        if (['1', '2', '3', '4', '6'].includes(e.key) && editorMode === 'draw') {
          e.preventDefault();
          setBrushSize(Number(e.key));
          return;
        }

        // Brush Size step: [ and ]
        if (e.key === '[') {
          e.preventDefault();
          setBrushSize((sz) => {
            const sizes = [1, 2, 3, 4, 6];
            const idx = sizes.indexOf(sz);
            return idx > 0 ? sizes[idx - 1] : sizes[0];
          });
          return;
        }
        if (e.key === ']') {
          e.preventDefault();
          setBrushSize((sz) => {
            const sizes = [1, 2, 3, 4, 6];
            const idx = sizes.indexOf(sz);
            return idx >= 0 && idx < sizes.length - 1 ? sizes[idx + 1] : sizes[sizes.length - 1];
          });
          return;
        }

        // Auto Fit Zoom (F or 0)
        if (keyLower === 'f' || e.key === '0') {
          e.preventDefault();
          handleAutoFitZoom();
          return;
        }

        // Enter key in Rig Mode: Bake Pose to New Frame
        if (e.key === 'Enter' && editorMode === 'rig') {
          e.preventDefault();
          onBakePoseToNewFrame?.();
          return;
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpaceHeld(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    editorMode,
    onSelectEditorMode,
    onDuplicateFrame,
    onDeleteFrame,
    onClearActiveCel,
    onBakePoseToNewFrame,
    undoStack,
    redoStack,
    activeLayer,
    frameWidth,
    frameHeight,
    onUpdateActiveLayerCanvas,
    handleAutoFitZoom
  ]);

  // Live Strip Preview Loop
  useEffect(() => {
    if (!isPreviewPlaying || frames.length === 0) return;
    const interval = setInterval(() => {
      setPreviewFrameIdx((prev) => (prev + 1) % frames.length);
    }, 125); // 8 FPS
    return () => clearInterval(interval);
  }, [isPreviewPlaying, frames.length]);

  // Render to Preview Canvas
  useEffect(() => {
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;
    const ctx = previewCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    const f = frames[previewFrameIdx];
    const canvasSource = f?.compositeCanvas || f?.canvas;
    if (canvasSource) {
      ctx.drawImage(canvasSource, 0, 0, previewCanvas.width, previewCanvas.height);
    } else if (canvasRef.current) {
      ctx.drawImage(canvasRef.current, 0, 0, previewCanvas.width, previewCanvas.height);
    }
  }, [previewFrameIdx, frames]);

  // Cursor styling based on active tool & spacebar
  const getCursorClass = () => {
    if (isPanning) return 'cursor-grabbing';
    if (isSpaceHeld || activeTool === 'hand') return 'cursor-grab';
    if (editorMode === 'rig') {
      if (dragBoneState) return 'cursor-grabbing';
      if (hoverBone) return hoverBone.part === 'tip' ? 'cursor-grab' : 'cursor-move';
      return 'cursor-default';
    }
    if (activeLayer?.locked) return 'cursor-not-allowed';
    return 'cursor-crosshair';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070b14] overflow-hidden relative select-none">
      {/* 1. Blender-Style Tool Settings Bar */}
      <div className="h-8 px-2.5 bg-[#0a0f1d] border-b border-white/10 flex items-center justify-between text-slate-300 z-20 flex-shrink-0">
        {/* Left: Active Tool Info & Size Settings */}
        <div className="flex items-center gap-2">
          {editorMode === 'draw' ? (
            <>
              {/* Active Tool Label */}
              <div className="h-6 px-2 rounded bg-slate-900 border border-white/10 flex items-center gap-1.5 font-bold text-blue-400 text-[11px] whitespace-nowrap flex-shrink-0">
                {activeTool === 'pencil' && <Pencil size={12} />}
                {activeTool === 'eraser' && <Eraser size={12} />}
                {activeTool === 'bucket' && <PaintBucket size={12} />}
                {activeTool === 'eyedropper' && <Pipette size={12} />}
                {activeTool === 'hand' && <Hand size={12} />}
                <span className="capitalize">{activeTool}</span>
              </div>

              {/* Brush Size Selector */}
              <div className="h-6 flex items-center bg-slate-950 px-1 rounded border border-white/10 flex-shrink-0">
                <span className="text-[10px] text-slate-400 font-mono pr-1">Size:</span>
                {[1, 2, 3, 4, 6].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setBrushSize(sz)}
                    className={`w-5 h-5 flex items-center justify-center text-[10px] font-mono rounded transition-all whitespace-nowrap ${
                      brushSize === sz
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title={`Brush size: ${sz}px`}
                  >
                    {sz}p
                  </button>
                ))}
              </div>

              {/* Active Color Swatch */}
              <div className="h-6 flex items-center gap-1 bg-slate-950 px-1.5 rounded border border-white/10 flex-shrink-0">
                <div
                  className="w-3.5 h-3.5 rounded-[2px] border border-white/30"
                  style={{ backgroundColor: activeColor }}
                />
                <span className="text-[10px] font-mono text-slate-300 uppercase">{activeColor}</span>
              </div>

              {/* Active Layer Quick Selector */}
              <div className="h-6 flex items-center gap-1 bg-slate-900 px-2 rounded border border-white/10 text-xs text-slate-300">
                <Layers size={11} className="text-purple-400" />
                <span className="text-[10px] text-slate-400">Layer:</span>
                <select
                  value={currentFrame?.activeLayerId || ''}
                  onChange={(e) => onSelectLayer?.(e.target.value)}
                  className="bg-transparent border-0 text-slate-200 text-[11px] font-semibold focus:outline-none cursor-pointer max-w-[100px] truncate"
                >
                  {layers.map((l) => (
                    <option key={l.id} value={l.id} className="bg-slate-900 text-white">
                      {l.name} {l.locked ? '🔒' : ''} {l.alphaLocked ? '🔒α' : ''} {!l.visible ? '👁️‍🗨️' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Onion Skinning Toggle Button (O) */}
              <button
                onClick={() => setShowOnionSkin(!showOnionSkin)}
                className={`h-6 px-2 rounded border text-[10px] font-bold flex items-center gap-1 transition-colors ${
                  showOnionSkin
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                }`}
                title="Toggle Onion Skinning (O): Ghost silhouettes of prev (Red) & next (Blue) frames"
              >
                <span>🧅 Onion Skin</span>
                <span className="text-[9px] opacity-70 font-mono">({showOnionSkin ? 'ON' : 'OFF'})</span>
              </button>

              {/* Active Layer Alpha Lock Indicator */}
              {activeLayer?.alphaLocked && (
                <div
                  className="h-6 px-1.5 rounded bg-purple-900/40 border border-purple-500/50 text-purple-300 text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm"
                  title="Alpha Lock is ACTIVE: Drawing will only color existing pixels (preserves transparency)"
                >
                  <span>🔒α Locked</span>
                </div>
              )}
            </>
          ) : (
            /* Rig Mode Context Controls */
            <div className="flex items-center gap-2">
              <div className="h-6 px-2 rounded bg-amber-500/20 border border-amber-500/40 flex items-center gap-1.5 font-bold text-amber-300 text-[11px] whitespace-nowrap flex-shrink-0">
                <BoneIcon size={12} />
                <span>Pose & Rig Mode</span>
              </div>

              {/* Show Bones Toggle */}
              <button
                onClick={onToggleBonesOverlay}
                className={`h-6 px-2 rounded border text-[10px] font-bold flex items-center gap-1 transition-colors ${
                  showBonesOverlay
                    ? 'bg-blue-600/30 text-blue-300 border-blue-500/40'
                    : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                }`}
                title="Toggle skeleton bone overlay visibility"
              >
                <span>🦴 Bones: {showBonesOverlay ? 'ON' : 'OFF'}</span>
              </button>

              {/* Reset Pose Button */}
              <button
                onClick={onResetPose}
                className="h-6 px-2 rounded bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-slate-300 text-[10px] flex items-center gap-1 transition-colors"
                title="Reset all bone rotations to 0"
              >
                <ResetIcon size={11} />
                <span>Reset Pose</span>
              </button>

              {/* Bake Pose to New Frame CTA */}
              <button
                onClick={onBakePoseToNewFrame}
                className="h-6 px-2.5 rounded bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-md shadow-emerald-500/20 transition-all whitespace-nowrap"
                title="Bake current posed layers into a brand new frame on the timeline!"
              >
                <Sparkles size={11} />
                <span>⚡ Bake to New Frame</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: History Undo/Redo & Viewport Helper */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
            Space: Pan • Wheel: Zoom
          </span>

          {/* Undo / Redo */}
          <div className="h-6 flex items-center bg-slate-950 rounded border border-white/10 px-0.5 flex-shrink-0">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 disabled:opacity-30"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw size={11} />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 disabled:opacity-30"
              title="Redo (Ctrl+Y)"
            >
              <RotateCw size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Middle Area: Left Tool Shelf (T-Panel 38px) + Center Viewport Canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Tools Shelf (T-Panel: Fixed 38px Width) */}
        <aside className="w-[38px] bg-[#090e1a] border-r border-white/10 flex flex-col items-center py-2 gap-1.5 z-20 flex-shrink-0">
          {[
            { id: 'pencil', icon: Pencil, title: 'Pencil Tool (P)' },
            { id: 'eraser', icon: Eraser, title: 'Eraser Tool (E)' },
            { id: 'bucket', icon: PaintBucket, title: 'Paint Bucket (G)' },
            { id: 'eyedropper', icon: Pipette, title: 'Color Eyedropper (I)' },
            { id: 'hand', icon: Hand, title: 'Hand / Pan Tool (H / Space)' }
          ].map((tool) => {
            const Icon = tool.icon;
            const isSel = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveTool(tool.id);
                  if (editorMode === 'rig') onSelectEditorMode?.('draw');
                }}
                className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                  isSel && editorMode === 'draw'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={tool.title}
              >
                <Icon size={14} />
              </button>
            );
          })}

          <div className="w-5 h-px bg-white/10 my-0.5" />

          {/* Quick Rig Mode Toggle button on T-Panel */}
          <button
            onClick={() => onSelectEditorMode?.(editorMode === 'rig' ? 'draw' : 'rig')}
            className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
              editorMode === 'rig'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Skeleton Rig & Pose Mode (Bones)"
          >
            <BoneIcon size={13} />
          </button>

          {/* Mirror Symmetry & Grid Buttons on T-Panel */}
          <button
            onClick={() => setIsSymmetryActive(!isSymmetryActive)}
            className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
              isSymmetryActive
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Mirror Symmetry across X axis (X key)"
          >
            <FlipHorizontal size={13} />
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
              showGrid
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Pixel Grid (#)"
          >
            <Grid size={13} />
          </button>
        </aside>

        {/* Center Viewport Canvas (Fills entire remaining space) */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={(e) => e.preventDefault()}
          className={`flex-1 overflow-hidden relative flex items-center justify-center bg-[#050811] ${getCursorClass()}`}
          style={{
            backgroundImage:
              'radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {/* Subtle Viewport Watermark */}
          <div
            style={{ position: 'absolute', top: '10px', left: '12px', zIndex: 10 }}
            className="pointer-events-none text-slate-500/60 font-mono text-[10px] select-none flex items-center gap-2"
          >
            <span>{frameWidth} × {frameHeight} px</span>
            {editorMode === 'rig' && (
              <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                🦴 RIG MODE: Drag bone tips to rotate!
              </span>
            )}
          </div>

          {/* Centered Canvas Container with Pan/Zoom translation */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px)`,
              transition: isPanning ? 'none' : 'transform 0.04s ease-out'
            }}
            className="relative shadow-2xl shadow-black border border-white/20 bg-transparent"
          >
            {/* Transparent Checkerboard Pattern */}
            <div
              className="absolute inset-0 z-0 pointer-events-none"
              style={{
                width: frameWidth * zoom,
                height: frameHeight * zoom,
                backgroundImage:
                  'linear-gradient(45deg, #131b28 25%, transparent 25%), linear-gradient(-45deg, #131b28 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #131b28 75%), linear-gradient(-45deg, transparent 75%, #131b28 75%)',
                backgroundSize: `${Math.max(8, zoom * 2)}px ${Math.max(8, zoom * 2)}px`,
                backgroundColor: '#0a0f19'
              }}
            />

            {/* Onion Skin Underlay Canvas (Aseprite Red/Blue Ghosts) */}
            <canvas
              ref={onionCanvasRef}
              width={frameWidth}
              height={frameHeight}
              style={{
                width: `${frameWidth * zoom}px`,
                height: `${frameHeight * zoom}px`,
                imageRendering: 'pixelated',
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                display: showOnionSkin ? 'block' : 'none',
                zIndex: 5
              }}
            />

            {/* The Drawing / Composited Canvas */}
            <canvas
              ref={canvasRef}
              width={frameWidth}
              height={frameHeight}
              style={{
                width: `${frameWidth * zoom}px`,
                height: `${frameHeight * zoom}px`,
                imageRendering: 'pixelated',
                display: 'block'
              }}
              className="relative z-10"
            />

            {/* Skeleton Bone Gizmo Overlay Canvas */}
            <canvas
              ref={overlayCanvasRef}
              width={frameWidth * zoom}
              height={frameHeight * zoom}
              style={{
                width: `${frameWidth * zoom}px`,
                height: `${frameHeight * zoom}px`,
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                zIndex: 15
              }}
            />

            {/* Crisp Adaptive Pixel Grid Overlay */}
            {showGrid && zoom >= 4 && (
              <div
                className="absolute inset-0 z-10 pointer-events-none"
                style={{
                  width: frameWidth * zoom,
                  height: frameHeight * zoom,
                  backgroundImage:
                    'linear-gradient(to right, rgba(255, 255, 255, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 1px, transparent 1px)',
                  backgroundSize: `${zoom}px ${zoom}px`
                }}
              />
            )}

            {/* Pixel Hover Brush Cursor Box (In Draw Mode) */}
            {hoverPixel && editorMode === 'draw' && activeTool !== 'hand' && !isSpaceHeld && (
              <div
                className="absolute z-20 pointer-events-none border border-white/90 bg-white/25 shadow-sm"
                style={{
                  left: `${(hoverPixel.x - Math.floor(brushSize / 2)) * zoom}px`,
                  top: `${(hoverPixel.y - Math.floor(brushSize / 2)) * zoom}px`,
                  width: `${brushSize * zoom}px`,
                  height: `${brushSize * zoom}px`
                }}
              />
            )}

            {/* Mirror Center Symmetry Line */}
            {isSymmetryActive && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none border-r-2 border-dashed border-amber-400/70"
                style={{
                  left: `${(frameWidth / 2) * zoom}px`,
                  transform: 'translateX(-1px)'
                }}
              />
            )}
          </div>

          {/* Floating Bottom-Right Zoom Controller */}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            style={{ position: 'absolute', bottom: '12px', right: '12px', zIndex: 30 }}
            className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0f1624]/95 backdrop-blur-md border border-white/15 shadow-xl shadow-black/70 text-slate-200 select-none pointer-events-auto"
          >
            {/* Cursor XY Coordinates */}
            <div className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
              <span className="text-slate-500">XY:</span>
              <span className="text-amber-400 font-bold min-w-[36px]">
                {hoverPixel ? `${hoverPixel.x},${hoverPixel.y}` : '-,-'}
              </span>
            </div>

            <div className="w-px h-3.5 bg-white/15" />

            {/* Zoom Out Button */}
            <button
              onClick={() => setZoom((z) => Math.max(z - 1, 1))}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Zoom Out (Scroll Down)"
            >
              <ZoomOut size={12} />
            </button>

            {/* Clickable Zoom Percentage Badge */}
            <button
              onClick={() => {
                if (zoom === 1) {
                  handleAutoFitZoom();
                } else {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }
              }}
              className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all text-center min-w-[42px]"
              title="Click to toggle 100% / Auto Fit"
            >
              {Math.round(zoom * 100)}%
            </button>

            {/* Zoom In Button */}
            <button
              onClick={() => setZoom((z) => Math.min(z + 1, 64))}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Zoom In (Scroll Up)"
            >
              <ZoomIn size={12} />
            </button>

            <div className="w-px h-3.5 bg-white/15" />

            {/* 1:1 Reset Button */}
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className={`px-1.5 h-6 rounded text-[10px] font-mono transition-colors ${
                zoom === 1
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Reset Zoom to 1:1 (100%)"
            >
              1:1
            </button>

            {/* Fit to Viewport Button */}
            <button
              onClick={handleAutoFitZoom}
              className="px-2 h-6 rounded bg-slate-800/80 hover:bg-blue-600 text-slate-300 hover:text-white text-[10px] font-mono font-semibold border border-white/10 hover:border-blue-500/50 transition-all flex items-center gap-1"
              title="Fit Canvas to Viewport"
            >
              <Focus size={11} />
              <span>Fit</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Bottom Timeline Dock (Dope Sheet) */}
      <footer className="h-12 px-2.5 bg-[#0a0f1d] border-t border-white/10 flex items-center justify-between z-20 text-slate-300 flex-shrink-0">
        {/* Left: Filmstrip Frames */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
            Frames ({frames.length}):
          </span>

          <div className="flex items-center gap-1">
            {frames.map((frame, idx) => {
              const isSelected = activeFrameIndex === idx;
              const displayCanvas = frame.compositeCanvas || frame.canvas;
              return (
                <div
                  key={`frame-strip-${idx}`}
                  onClick={() => onSelectFrameIndex?.(idx)}
                  className={`w-8 h-8 rounded border transition-all cursor-pointer flex flex-col items-center justify-center relative overflow-hidden flex-shrink-0 ${
                    isSelected
                      ? 'border-blue-400 ring-2 ring-blue-500/40 bg-slate-800'
                      : 'border-white/10 bg-slate-950/80 hover:border-white/30'
                  }`}
                >
                  <span className="text-[7px] font-mono text-slate-400 absolute top-0 left-0.5 z-10">
                    {idx + 1}
                  </span>
                  {displayCanvas && (
                    <CreatorFrameThumb canvas={displayCanvas} />
                  )}
                </div>
              );
            })}

            {/* Add Frame Button */}
            <button
              onClick={onAddFrame}
              className="w-8 h-8 rounded border border-dashed border-white/20 hover:border-blue-400 text-slate-400 hover:text-blue-300 flex items-center justify-center transition-colors flex-shrink-0"
              title="Add New Blank Frame"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Compact Icon-Only Actions */}
          <div className="flex items-center gap-1 pl-1">
            <button
              onClick={onDuplicateFrame}
              className="w-7 h-7 rounded bg-slate-900 border border-white/10 hover:border-white/30 text-slate-400 hover:text-white flex items-center justify-center transition-colors flex-shrink-0"
              title="Duplicate Frame"
            >
              <Copy size={12} />
            </button>
            <button
              onClick={onDeleteFrame}
              disabled={frames.length <= 1}
              className="w-7 h-7 rounded bg-slate-900 border border-white/10 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors disabled:opacity-30 flex-shrink-0"
              title="Delete Frame"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Right: Embedded Transport & Live 8 FPS Preview */}
        <div className="flex items-center gap-2 bg-slate-950 px-2 py-0.5 rounded border border-white/10 flex-shrink-0">
          <button
            onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
            className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center"
            title={isPreviewPlaying ? 'Pause Playback' : 'Play Live Strip'}
          >
            {isPreviewPlaying ? <Pause size={11} /> : <Play size={11} />}
          </button>

          <span className="text-[10px] font-mono text-emerald-400 font-bold whitespace-nowrap">
            F: {previewFrameIdx + 1}/{frames.length || 1} • 8 FPS
          </span>

          <div className="w-8 h-8 rounded bg-slate-900 border border-white/15 flex items-center justify-center overflow-hidden">
            <canvas
              ref={previewCanvasRef}
              width={frameWidth}
              height={frameHeight}
              style={{
                maxWidth: '28px',
                maxHeight: '28px',
                imageRendering: 'pixelated'
              }}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
