import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowRight,
  Upload,
  Download,
  CheckCircle2,
  ChevronDown,
  FolderOpen,
  Sparkles
} from 'lucide-react';
import { BlenderPropertiesPanel } from './BlenderPropertiesPanel';
import { PixelCanvasEditor } from './PixelCanvasEditor';
import { ImportSheetModal } from './ImportSheetModal';
import { detectBestSheetGrid } from '../../utils/sheetSlicer';
import {
  applyPixelation,
  applyPaletteAndDithering,
  applyPixelOutline,
  applyAdjustments
} from '../../utils/pixelFilters';
import {
  RIG_PRESETS,
  scaleBonesToResolution,
  compositeLayers,
  bakePosedLayers,
  autoBindLayersToBones
} from '../../utils/skeletonRig';

export function CreatorModule({ onSendToAnimator }) {
  // Canvas Dimensions: Default 96x96 for smaller pixels and high-density detail!
  const [resolutionW, setResolutionW] = useState(96);
  const [resolutionH, setResolutionH] = useState(96);

  // Active Studio Mode: 'draw' | 'rig'
  const [editorMode, setEditorMode] = useState('draw');

  // Import Sprite Sheet Modal state
  const [importModalData, setImportModalData] = useState(null);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);

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

  // Frames Array: [{ id, layers: [{ id, name, visible, locked, opacity, canvas }], activeLayerId, rig, compositeCanvas, canvas }]
  const [frames, setFrames] = useState([]);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);

  // Selected Bone in Rig Inspector
  const [selectedBoneId, setSelectedBoneId] = useState('arm_r');
  const [showBonesOverlay, setShowBonesOverlay] = useState(true);

  // Asset Name
  const [assetName, setAssetName] = useState('Pixel_Knight_HD');
  const [notification, setNotification] = useState(null);

  const fileInputRef = useRef(null);

  // Helper to create an empty transparent canvas of size W x H
  const createEmptyCanvas = useCallback((w = resolutionW, h = resolutionH) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return c;
  }, [resolutionW, resolutionH]);

  // Helper to create a standardized multi-layer frame
  const createFrameFromLayers = useCallback((id, layers, rigPresetKey = 'biped', w = resolutionW, h = resolutionH) => {
    const defaultBones = scaleBonesToResolution(
      RIG_PRESETS[rigPresetKey]?.bones || RIG_PRESETS.biped.bones,
      96,
      96,
      w,
      h
    );
    const boundBones = autoBindLayersToBones(layers, defaultBones);
    const composite = compositeLayers(layers, w, h);
    return {
      id,
      layers,
      activeLayerId: layers[0]?.id || null,
      rig: {
        preset: rigPresetKey,
        bones: boundBones
      },
      compositeCanvas: composite,
      canvas: composite
    };
  }, [resolutionW, resolutionH]);

  // Helper to create a single-layer frame
  const createSingleLayerFrame = useCallback((id, canvas, rigPresetKey = 'biped', w = resolutionW, h = resolutionH) => {
    const layer = {
      id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: 'Layer 1 (Base)',
      visible: true,
      locked: false,
      opacity: 1,
      canvas
    };
    return createFrameFromLayers(id, [layer], rigPresetKey, w, h);
  }, [createFrameFromLayers, resolutionW, resolutionH]);

  // Current active frame object
  const currentFrame = frames[activeFrameIndex] || null;

  // Rescale / Resample existing frames and all layers when resolution changes
  const changeResolution = (newW, newH) => {
    if (newW === resolutionW && newH === resolutionH) return;

    setFrames((prev) => {
      return prev.map((f) => {
        const scaledLayers = (f.layers || []).map((layer) => {
          const newC = document.createElement('canvas');
          newC.width = newW;
          newC.height = newH;
          const ctx = newC.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          if (layer.canvas) {
            ctx.drawImage(layer.canvas, 0, 0, newW, newH);
          }
          return { ...layer, canvas: newC };
        });

        const scaledBones = scaleBonesToResolution(
          f.rig?.bones || RIG_PRESETS.biped.bones,
          resolutionW,
          resolutionH,
          newW,
          newH
        );

        const composite = compositeLayers(scaledLayers, newW, newH);

        return {
          ...f,
          layers: scaledLayers,
          rig: {
            preset: f.rig?.preset || 'biped',
            bones: scaledBones
          },
          compositeCanvas: composite,
          canvas: composite
        };
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

  // Frame strip management
  const handleAddFrame = () => {
    const newCanvas = createEmptyCanvas();
    const newFrame = createSingleLayerFrame(
      `frame_${Date.now()}_${frames.length}`,
      newCanvas,
      'biped',
      resolutionW,
      resolutionH
    );
    setFrames((prev) => [...prev, newFrame]);
    setActiveFrameIndex(frames.length);
  };

  const handleDuplicateFrame = () => {
    const curr = frames[activeFrameIndex];
    if (!curr) return;

    // Deep clone all layers
    const clonedLayers = (curr.layers || []).map((l) => {
      const c = document.createElement('canvas');
      c.width = resolutionW;
      c.height = resolutionH;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      if (l.canvas) ctx.drawImage(l.canvas, 0, 0);
      return {
        ...l,
        id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        canvas: c
      };
    });

    const clonedBones = (curr.rig?.bones || []).map((b) => ({ ...b }));
    const composite = compositeLayers(clonedLayers, resolutionW, resolutionH);

    const dupFrame = {
      ...curr,
      id: `frame_${Date.now()}_dup`,
      layers: clonedLayers,
      activeLayerId: clonedLayers[0]?.id || null,
      rig: {
        preset: curr.rig?.preset || 'biped',
        bones: clonedBones
      },
      compositeCanvas: composite,
      canvas: composite
    };

    setFrames((prev) => {
      const copy = [...prev];
      copy.splice(activeFrameIndex + 1, 0, dupFrame);
      return copy;
    });
    setActiveFrameIndex(activeFrameIndex + 1);
  };

  const handleDeleteFrame = () => {
    if (frames.length <= 1) return;
    setFrames((prev) => prev.filter((_, i) => i !== activeFrameIndex));
    setActiveFrameIndex((prev) => Math.max(0, prev - 1));
  };

  // --- LAYER MANAGEMENT HANDLERS (Aseprite Unified Layer & Cel Architecture) ---
  const handleAddLayer = () => {
    if (!currentFrame) return;
    const newLayerId = `layer_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newLayerName = `Layer ${(currentFrame.layers || []).length + 1}`;

    setFrames((prev) => {
      const activeIdx = currentFrame.layers.findIndex((l) => l.id === currentFrame.activeLayerId);
      const insertAt = activeIdx >= 0 ? activeIdx + 1 : currentFrame.layers.length;

      return prev.map((frame) => {
        const celCanvas = createEmptyCanvas();
        const newLayer = {
          id: newLayerId,
          name: newLayerName,
          visible: true,
          locked: false,
          alphaLocked: false,
          clipping: false,
          blendMode: 'normal',
          opacity: 1,
          canvas: celCanvas
        };

        const updatedLayers = [...(frame.layers || [])];
        updatedLayers.splice(insertAt, 0, newLayer);
        const composite = compositeLayers(updatedLayers, resolutionW, resolutionH);

        return {
          ...frame,
          layers: updatedLayers,
          activeLayerId: newLayerId,
          compositeCanvas: composite,
          canvas: composite
        };
      });
    });
  };

  const handleDuplicateLayer = (layerId) => {
    if (!currentFrame) return;
    const targetLayer = currentFrame.layers.find((l) => l.id === layerId);
    if (!targetLayer) return;

    const newLayerId = `layer_${Date.now()}_dup`;
    const newLayerName = `${targetLayer.name} (Copy)`;
    const targetIdx = currentFrame.layers.findIndex((l) => l.id === layerId);

    setFrames((prev) => {
      return prev.map((frame) => {
        const srcLayer = (frame.layers || []).find((l) => l.id === layerId);
        const newCanvas = document.createElement('canvas');
        newCanvas.width = resolutionW;
        newCanvas.height = resolutionH;
        const ctx = newCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        if (srcLayer?.canvas) ctx.drawImage(srcLayer.canvas, 0, 0);

        const dupLayer = {
          ...srcLayer,
          id: newLayerId,
          name: newLayerName,
          canvas: newCanvas
        };

        const updatedLayers = [...(frame.layers || [])];
        updatedLayers.splice(targetIdx + 1, 0, dupLayer);
        const composite = compositeLayers(updatedLayers, resolutionW, resolutionH);

        return {
          ...frame,
          layers: updatedLayers,
          activeLayerId: newLayerId,
          compositeCanvas: composite,
          canvas: composite
        };
      });
    });
  };

  const handleDeleteLayer = (layerId) => {
    if (!currentFrame || (currentFrame.layers || []).length <= 1) return;

    setFrames((prev) => {
      return prev.map((frame) => {
        const updatedLayers = (frame.layers || []).filter((l) => l.id !== layerId);
        const newActiveId = frame.activeLayerId === layerId ? updatedLayers[0]?.id : frame.activeLayerId;
        const composite = compositeLayers(updatedLayers, resolutionW, resolutionH);

        return {
          ...frame,
          layers: updatedLayers,
          activeLayerId: newActiveId,
          compositeCanvas: composite,
          canvas: composite
        };
      });
    });
  };

  const handleReorderLayer = (layerId, direction) => {
    if (!currentFrame) return;
    const idx = currentFrame.layers.findIndex((l) => l.id === layerId);
    if (idx < 0) return;

    const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
    if (targetIdx < 0 || targetIdx >= currentFrame.layers.length) return;

    setFrames((prev) => {
      return prev.map((frame) => {
        const updatedLayers = [...(frame.layers || [])];
        const temp = updatedLayers[idx];
        updatedLayers[idx] = updatedLayers[targetIdx];
        updatedLayers[targetIdx] = temp;
        const composite = compositeLayers(updatedLayers, resolutionW, resolutionH);

        return {
          ...frame,
          layers: updatedLayers,
          compositeCanvas: composite,
          canvas: composite
        };
      });
    });
  };

  const handleToggleLayerVisibility = (layerId) => {
    setFrames((prev) => {
      return prev.map((frame) => {
        const updatedLayers = (frame.layers || []).map((l) =>
          l.id === layerId ? { ...l, visible: !l.visible } : l
        );
        const composite = compositeLayers(updatedLayers, resolutionW, resolutionH);
        return {
          ...frame,
          layers: updatedLayers,
          compositeCanvas: composite,
          canvas: composite
        };
      });
    });
  };

  const handleToggleLayerLock = (layerId) => {
    setFrames((prev) => {
      return prev.map((frame) => {
        const updatedLayers = (frame.layers || []).map((l) =>
          l.id === layerId ? { ...l, locked: !l.locked } : l
        );
        return {
          ...frame,
          layers: updatedLayers
        };
      });
    });
  };

  const handleChangeLayerOpacity = (layerId, opacity) => {
    setFrames((prev) => {
      return prev.map((frame) => {
        const updatedLayers = (frame.layers || []).map((l) =>
          l.id === layerId ? { ...l, opacity } : l
        );
        const composite = compositeLayers(updatedLayers, resolutionW, resolutionH);
        return {
          ...frame,
          layers: updatedLayers,
          compositeCanvas: composite,
          canvas: composite
        };
      });
    });
  };

  // Aseprite Core: Alpha Lock (Preserve Transparency)
  const handleToggleAlphaLock = (layerId) => {
    setFrames((prev) => {
      return prev.map((frame) => {
        const updatedLayers = (frame.layers || []).map((l) =>
          l.id === layerId ? { ...l, alphaLocked: !l.alphaLocked } : l
        );
        return {
          ...frame,
          layers: updatedLayers
        };
      });
    });
    setNotification('Alpha Lock toggled (Preserve Transparency)');
    setTimeout(() => setNotification(null), 1500);
  };

  // Aseprite Core: Blend Mode (Multiply, Screen, Overlay, etc.)
  const handleChangeLayerBlendMode = (layerId, blendMode) => {
    setFrames((prev) => {
      return prev.map((frame) => {
        const updatedLayers = (frame.layers || []).map((l) =>
          l.id === layerId ? { ...l, blendMode } : l
        );
        const composite = compositeLayers(updatedLayers, resolutionW, resolutionH);
        return {
          ...frame,
          layers: updatedLayers,
          compositeCanvas: composite,
          canvas: composite
        };
      });
    });
  };

  // Aseprite Core: Clipping Mask (Clip into layer beneath)
  const handleToggleClipping = (layerId) => {
    setFrames((prev) => {
      return prev.map((frame) => {
        const updatedLayers = (frame.layers || []).map((l) =>
          l.id === layerId ? { ...l, clipping: !l.clipping } : l
        );
        const composite = compositeLayers(updatedLayers, resolutionW, resolutionH);
        return {
          ...frame,
          layers: updatedLayers,
          compositeCanvas: composite,
          canvas: composite
        };
      });
    });
  };

  // Aseprite Core: Clear Active Cel (Clears current frame's cel without deleting the layer)
  const handleClearActiveCel = () => {
    if (!currentFrame) return;
    const blank = createEmptyCanvas();
    handleUpdateActiveLayerCanvas(blank);
    setNotification('Current cel cleared');
    setTimeout(() => setNotification(null), 1500);
  };

  const handleMergeLayerDown = (layerId) => {
    if (!currentFrame) return;
    const idx = currentFrame.layers.findIndex((l) => l.id === layerId);
    if (idx <= 0) return;

    setFrames((prev) => {
      return prev.map((frame) => {
        const topLayer = frame.layers[idx];
        const bottomLayer = frame.layers[idx - 1];
        if (!topLayer || !bottomLayer) return frame;

        const mergedCanvas = document.createElement('canvas');
        mergedCanvas.width = resolutionW;
        mergedCanvas.height = resolutionH;
        const ctx = mergedCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        if (bottomLayer.canvas) {
          ctx.globalAlpha = bottomLayer.opacity;
          ctx.drawImage(bottomLayer.canvas, 0, 0);
        }
        if (topLayer.canvas) {
          ctx.globalAlpha = topLayer.opacity;
          ctx.drawImage(topLayer.canvas, 0, 0);
        }

        const mergedBottomLayer = {
          ...bottomLayer,
          name: `${bottomLayer.name} + ${topLayer.name}`,
          opacity: 1,
          canvas: mergedCanvas
        };

        const updatedLayers = frame.layers.filter((_, i) => i !== idx);
        updatedLayers[idx - 1] = mergedBottomLayer;
        const composite = compositeLayers(updatedLayers, resolutionW, resolutionH);

        return {
          ...frame,
          layers: updatedLayers,
          activeLayerId: mergedBottomLayer.id,
          compositeCanvas: composite,
          canvas: composite
        };
      });
    });
  };

  const handleRenameLayer = (layerId, newName) => {
    setFrames((prev) => {
      return prev.map((frame) => {
        const updatedLayers = (frame.layers || []).map((l) =>
          l.id === layerId ? { ...l, name: newName } : l
        );
        return {
          ...frame,
          layers: updatedLayers
        };
      });
    });
  };

  const handleSelectLayer = (layerId) => {
    setFrames((prev) => {
      const copy = [...prev];
      const frame = copy[activeFrameIndex];
      if (!frame) return prev;

      copy[activeFrameIndex] = {
        ...frame,
        activeLayerId: layerId
      };
      return copy;
    });
  };

  // Update specific layer's canvas from drawing strokes
  const handleUpdateActiveLayerCanvas = useCallback((sourceCanvas) => {
    setFrames((prev) => {
      const copy = [...prev];
      const frame = copy[activeFrameIndex];
      if (!frame) return prev;

      const updatedLayers = (frame.layers || []).map((layer) => {
        if (layer.id === frame.activeLayerId) {
          const newC = document.createElement('canvas');
          newC.width = resolutionW;
          newC.height = resolutionH;
          const ctx = newC.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(sourceCanvas, 0, 0);
          return { ...layer, canvas: newC };
        }
        return layer;
      });

      const composite = compositeLayers(updatedLayers, resolutionW, resolutionH);

      copy[activeFrameIndex] = {
        ...frame,
        layers: updatedLayers,
        compositeCanvas: composite,
        canvas: composite
      };
      return copy;
    });
  }, [activeFrameIndex, resolutionW, resolutionH]);

  // --- SKELETON RIG HANDLERS ---
  const handleUpdateBones = useCallback((newBones) => {
    setFrames((prev) => {
      const copy = [...prev];
      const frame = copy[activeFrameIndex];
      if (!frame) return prev;

      copy[activeFrameIndex] = {
        ...frame,
        rig: {
          preset: frame.rig?.preset || 'biped',
          bones: newBones
        }
      };
      return copy;
    });
  }, [activeFrameIndex]);

  const handleSelectRigPreset = (presetKey) => {
    const preset = RIG_PRESETS[presetKey];
    if (!preset || !currentFrame) return;

    const scaledBones = scaleBonesToResolution(preset.bones, 96, 96, resolutionW, resolutionH);
    const boundBones = autoBindLayersToBones(currentFrame.layers || [], scaledBones);

    setFrames((prev) => {
      const copy = [...prev];
      const frame = copy[activeFrameIndex];
      if (!frame) return prev;

      copy[activeFrameIndex] = {
        ...frame,
        rig: {
          preset: presetKey,
          bones: boundBones
        }
      };
      return copy;
    });

    if (boundBones[0]) setSelectedBoneId(boundBones[0].id);
    setNotification(`Applied ${preset.name} Rig!`);
    setTimeout(() => setNotification(null), 2000);
  };

  const handleResetPose = () => {
    if (!currentFrame || !currentFrame.rig?.bones) return;
    const resetBones = currentFrame.rig.bones.map((b) => ({
      ...b,
      rotation: 0,
      offsetX: 0,
      offsetY: 0
    }));

    handleUpdateBones(resetBones);
    setNotification('Skeleton reset to rest pose');
    setTimeout(() => setNotification(null), 1500);
  };

  const handleBindLayerToBone = (boneId, layerId) => {
    if (!currentFrame || !currentFrame.rig?.bones) return;
    const updated = currentFrame.rig.bones.map((b) =>
      b.id === boneId ? { ...b, bindLayerId: layerId || null } : b
    );
    handleUpdateBones(updated);
  };

  const handleAutoBindLayers = () => {
    if (!currentFrame || !currentFrame.rig?.bones) return;
    const bound = autoBindLayersToBones(currentFrame.layers || [], currentFrame.rig.bones);
    handleUpdateBones(bound);
    setNotification('Layers auto-bound to bones by name matching!');
    setTimeout(() => setNotification(null), 2000);
  };

  // ⚡ CORE FEATURE: Bake Pose to New Frame (Tạo frame mới từ frame có sẵn)
  const handleBakePoseToNewFrame = () => {
    if (!currentFrame) return;

    const { bakedLayers, resetBones, compositeCanvas } = bakePosedLayers(
      currentFrame.layers,
      currentFrame.rig?.bones || [],
      resolutionW,
      resolutionH
    );

    const newFrame = {
      id: `frame_${Date.now()}_posed`,
      layers: bakedLayers,
      activeLayerId: bakedLayers[0]?.id || null,
      rig: {
        preset: currentFrame.rig?.preset || 'biped',
        bones: resetBones
      },
      compositeCanvas,
      canvas: compositeCanvas
    };

    setFrames((prev) => {
      const copy = [...prev];
      copy.splice(activeFrameIndex + 1, 0, newFrame);
      return copy;
    });

    setActiveFrameIndex(activeFrameIndex + 1);
    setNotification(`⚡ Frame ${activeFrameIndex + 2} created from pose! Posed layers baked.`);
    setTimeout(() => setNotification(null), 3000);
  };

  // Apply pose directly to current frame
  const handleApplyPoseToCurrentFrame = () => {
    if (!currentFrame) return;

    const { bakedLayers, resetBones, compositeCanvas } = bakePosedLayers(
      currentFrame.layers,
      currentFrame.rig?.bones || [],
      resolutionW,
      resolutionH
    );

    setFrames((prev) => {
      const copy = [...prev];
      copy[activeFrameIndex] = {
        ...currentFrame,
        layers: bakedLayers,
        rig: {
          preset: currentFrame.rig?.preset || 'biped',
          bones: resetBones
        },
        compositeCanvas,
        canvas: compositeCanvas
      };
      return copy;
    });

    setNotification('Pose applied and baked into current frame!');
    setTimeout(() => setNotification(null), 2000);
  };

  // High-Density Procedural Sprite Generation Presets
  // Knight is generated with dedicated layers matching the skeleton rig!
  const generateProceduralPreset = (presetType, targetW = resolutionW, targetH = resolutionH) => {
    const count = presetType === 'coin' ? 6 : 4;
    const newFrames = [];
    setResolutionW(targetW);
    setResolutionH(targetH);

    const s = targetW / 32; // Scale factor relative to 32px base

    for (let i = 0; i < count; i++) {
      const cx = targetW / 2;
      const cy = targetH / 2;

      if (presetType === 'knight' || presetType === 'hero') {
        // High-Detail Armored Knight with pre-separated body layers!
        setAssetName(`Pixel_Knight_HD_${targetW}x${targetH}`);
        const bob = i % 2 === 0 ? 0 : -Math.floor(1.5 * s);
        const legStep = (i % 4) * (2 * s) - 3 * s;

        // Layer 1: Cape & Shadow
        const cCape = document.createElement('canvas');
        cCape.width = targetW;
        cCape.height = targetH;
        const ctxCape = cCape.getContext('2d');
        ctxCape.imageSmoothingEnabled = false;

        // Shadow
        ctxCape.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctxCape.beginPath();
        ctxCape.ellipse(cx, targetH - 4 * s, 8 * s, 2.5 * s, 0, 0, Math.PI * 2);
        ctxCape.fill();

        // Flowing Red Cape
        ctxCape.fillStyle = '#991b1b';
        ctxCape.fillRect(Math.floor(cx - 7 * s), Math.floor(cy - 4 * s + bob), Math.floor(5 * s), Math.floor(12 * s));
        ctxCape.fillStyle = '#ef4444';
        ctxCape.fillRect(Math.floor(cx - 6 * s), Math.floor(cy - 2 * s + bob), Math.floor(3 * s), Math.floor(10 * s));

        // Layer 2: Legs & Sabatons
        const cLegs = document.createElement('canvas');
        cLegs.width = targetW;
        cLegs.height = targetH;
        const ctxLegs = cLegs.getContext('2d');
        ctxLegs.imageSmoothingEnabled = false;

        ctxLegs.fillStyle = '#1e293b';
        ctxLegs.fillRect(Math.floor(cx - 4 * s + legStep), Math.floor(cy + 6 * s + bob), Math.floor(3 * s), Math.floor(7 * s));
        ctxLegs.fillRect(Math.floor(cx + 1 * s - legStep), Math.floor(cy + 6 * s + bob), Math.floor(3 * s), Math.floor(7 * s));
        ctxLegs.fillStyle = '#f59e0b';
        ctxLegs.fillRect(Math.floor(cx - 4 * s + legStep), Math.floor(cy + 6 * s + bob), Math.floor(3 * s), Math.floor(1.5 * s));
        ctxLegs.fillRect(Math.floor(cx + 1 * s - legStep), Math.floor(cy + 6 * s + bob), Math.floor(3 * s), Math.floor(1.5 * s));

        // Layer 3: Torso & Pauldrons
        const cTorso = document.createElement('canvas');
        cTorso.width = targetW;
        cTorso.height = targetH;
        const ctxTorso = cTorso.getContext('2d');
        ctxTorso.imageSmoothingEnabled = false;

        // Steel Breastplate Torso
        ctxTorso.fillStyle = '#334155';
        ctxTorso.fillRect(Math.floor(cx - 5 * s), Math.floor(cy - 4 * s + bob), Math.floor(10 * s), Math.floor(10 * s));
        ctxTorso.fillStyle = '#64748b';
        ctxTorso.fillRect(Math.floor(cx - 3 * s), Math.floor(cy - 3 * s + bob), Math.floor(6 * s), Math.floor(7 * s));
        ctxTorso.fillStyle = '#cbd5e1';
        ctxTorso.fillRect(Math.floor(cx - 1 * s), Math.floor(cy - 2 * s + bob), Math.floor(2 * s), Math.floor(5 * s));

        // Golden Pauldrons
        ctxTorso.fillStyle = '#f59e0b';
        ctxTorso.fillRect(Math.floor(cx - 7 * s), Math.floor(cy - 4 * s + bob), Math.floor(3 * s), Math.floor(4 * s));
        ctxTorso.fillRect(Math.floor(cx + 4 * s), Math.floor(cy - 4 * s + bob), Math.floor(3 * s), Math.floor(4 * s));

        // Layer 4: Head & Great Helm
        const cHead = document.createElement('canvas');
        cHead.width = targetW;
        cHead.height = targetH;
        const ctxHead = cHead.getContext('2d');
        ctxHead.imageSmoothingEnabled = false;

        ctxHead.fillStyle = '#475569';
        ctxHead.fillRect(Math.floor(cx - 4 * s), Math.floor(cy - 12 * s + bob), Math.floor(8 * s), Math.floor(8 * s));
        ctxHead.fillStyle = '#94a3b8';
        ctxHead.fillRect(Math.floor(cx - 2 * s), Math.floor(cy - 11 * s + bob), Math.floor(4 * s), Math.floor(6 * s));

        // Golden Plume
        ctxHead.fillStyle = '#eab308';
        ctxHead.fillRect(Math.floor(cx - 1.5 * s), Math.floor(cy - 15 * s + bob), Math.floor(3 * s), Math.floor(3.5 * s));
        ctxHead.fillStyle = '#fef08a';
        ctxHead.fillRect(Math.floor(cx - 0.5 * s), Math.floor(cy - 15 * s + bob), Math.floor(1 * s), Math.floor(3 * s));

        // Visor slit
        ctxHead.fillStyle = '#0f172a';
        ctxHead.fillRect(Math.floor(cx - 1.5 * s), Math.floor(cy - 8.5 * s + bob), Math.floor(5 * s), Math.floor(2 * s));
        ctxHead.fillRect(Math.floor(cx + 0.5 * s), Math.floor(cy - 8.5 * s + bob), Math.floor(1.5 * s), Math.floor(4 * s));

        // Layer 5: Weapon & Arms
        const cArms = document.createElement('canvas');
        cArms.width = targetW;
        cArms.height = targetH;
        const ctxArms = cArms.getContext('2d');
        ctxArms.imageSmoothingEnabled = false;

        // Gleaming Broadsword
        ctxArms.fillStyle = '#cbd5e1';
        ctxArms.fillRect(Math.floor(cx + 7 * s), Math.floor(cy - 8 * s + bob), Math.floor(2 * s), Math.floor(14 * s));
        ctxArms.fillStyle = '#ffffff';
        ctxArms.fillRect(Math.floor(cx + 7.5 * s), Math.floor(cy - 7 * s + bob), Math.floor(1 * s), Math.floor(10 * s));
        ctxArms.fillStyle = '#f59e0b';
        ctxArms.fillRect(Math.floor(cx + 5 * s), Math.floor(cy + 1 * s + bob), Math.floor(6 * s), Math.floor(2 * s));
        ctxArms.fillRect(Math.floor(cx + 7 * s), Math.floor(cy + 5 * s + bob), Math.floor(2 * s), Math.floor(2 * s));

        const knightLayers = [
          { id: `layer_cape_${i}`, name: 'Cape & Shadow', visible: true, locked: false, opacity: 1, canvas: cCape },
          { id: `layer_legs_${i}`, name: 'Legs', visible: true, locked: false, opacity: 1, canvas: cLegs },
          { id: `layer_torso_${i}`, name: 'Torso', visible: true, locked: false, opacity: 1, canvas: cTorso },
          { id: `layer_head_${i}`, name: 'Head', visible: true, locked: false, opacity: 1, canvas: cHead },
          { id: `layer_arms_${i}`, name: 'Arms & Weapon', visible: true, locked: false, opacity: 1, canvas: cArms }
        ];

        const knightFrame = createFrameFromLayers(
          `knight_f${i}`,
          knightLayers,
          'biped',
          targetW,
          targetH
        );
        newFrames.push(knightFrame);

      } else {
        // Slime, Coin, Ghost (Single Base Layer)
        const c = document.createElement('canvas');
        c.width = targetW;
        c.height = targetH;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        if (presetType === 'slime') {
          setAssetName(`Pixel_Slime_${targetW}x${targetH}`);
          const squish = Math.sin((i / count) * Math.PI * 2) * (3 * s);
          const rx = 10 * s + squish;
          const ry = 9 * s - squish;
          const baseY = cy + 4 * s + squish * 0.5;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.beginPath();
          ctx.ellipse(cx, targetH - 4 * s, 12 * s, 3.5 * s, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#064e3b';
          ctx.beginPath();
          ctx.ellipse(cx, baseY, rx + 1.5 * s, ry + 1.5 * s, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.ellipse(cx, baseY, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#34d399';
          ctx.beginPath();
          ctx.ellipse(cx, baseY + 1 * s, rx * 0.8, ry * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.floor(cx - 4 * s), Math.floor(baseY - 4 * s), Math.max(1, Math.floor(1.5 * s)), Math.max(1, Math.floor(1.5 * s)));

          const eyeW = Math.max(2, Math.floor(2 * s));
          const eyeH = Math.max(3, Math.floor(3 * s));
          ctx.fillStyle = '#064e3b';
          ctx.fillRect(Math.floor(cx - 4.5 * s), Math.floor(baseY - 1 * s), eyeW, eyeH);
          ctx.fillRect(Math.floor(cx + 2.5 * s), Math.floor(baseY - 1 * s), eyeW, eyeH);

        } else if (presetType === 'coin') {
          setAssetName(`Gold_Coin_HD_${targetW}x${targetH}`);
          const phase = (i / count) * Math.PI;
          const widthScale = Math.max(0.12, Math.abs(Math.cos(phase)));
          const coinW = 10 * s * widthScale;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.beginPath();
          ctx.ellipse(cx, targetH - 5 * s, 9 * s * widthScale, 2.5 * s, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#78350f';
          ctx.fillRect(Math.floor(cx - coinW - 1 * s), Math.floor(cy - 9 * s), Math.floor((coinW + 1 * s) * 2), Math.floor(18 * s));

          ctx.fillStyle = '#d97706';
          ctx.fillRect(Math.floor(cx - coinW), Math.floor(cy - 8.5 * s), Math.floor(coinW * 2), Math.floor(17 * s));

          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(Math.floor(cx - coinW * 0.85), Math.floor(cy - 7.5 * s), Math.floor(coinW * 1.7), Math.floor(15 * s));

          ctx.fillStyle = '#fef08a';
          ctx.fillRect(Math.floor(cx - coinW * 0.5), Math.floor(cy - 6.5 * s), Math.max(1, Math.floor(coinW * 0.4)), Math.floor(13 * s));

        } else if (presetType === 'ghost') {
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
          ctx.fillRect(Math.floor(cx + 2.5 * s), Math.floor(gy - 1.5 * s), Math.floor(2.5 * s), Math.floor(4 * s));
        }

        const singleFrame = createSingleLayerFrame(
          `preset_frame_${i}`,
          c,
          presetType === 'ghost' ? 'limb_chain' : 'biped',
          targetW,
          targetH
        );
        newFrames.push(singleFrame);
      }
    }

    setFrames(newFrames);
    setActiveFrameIndex(0);
    setNotification(`Generated ${presetType.toUpperCase()} preset with Layers & Rig!`);
    setTimeout(() => setNotification(null), 2500);
  };

  // Upload sprite sheet or image
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const detected = detectBestSheetGrid(img);
        setImportModalData({
          file,
          img,
          fileName: file.name.replace(/\.[^/.]+$/, ''),
          naturalW: img.naturalWidth,
          naturalH: img.naturalHeight,
          detected
        });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Confirm and slice imported frames from modal into Creator
  const handleConfirmImport = ({ frames: slicedList, resolutionW: newW, resolutionH: newH, assetName: newName }) => {
    if (!slicedList || slicedList.length === 0) return;

    setResolutionW(newW);
    setResolutionH(newH);

    const formattedFrames = slicedList.map((f, i) =>
      createSingleLayerFrame(`import_${Date.now()}_${i}`, f.canvas, 'biped', newW, newH)
    );

    setFrames(formattedFrames);
    setActiveFrameIndex(0);
    if (newName) setAssetName(newName);

    setNotification(`Imported ${formattedFrames.length} frames with Layer & Rig support!`);
    setTimeout(() => setNotification(null), 3500);
  };

  // Handle importing a sample sheet URL
  const handleImportSampleSheet = async (url, name) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], `${name}.png`, { type: 'image/png' });
      const img = new Image();
      img.onload = () => {
        const detected = detectBestSheetGrid(img);
        setImportModalData({
          file,
          img,
          fileName: name,
          naturalW: img.naturalWidth,
          naturalH: img.naturalHeight,
          detected
        });
      };
      img.src = URL.createObjectURL(blob);
    } catch (err) {
      console.error('Failed to load sample sheet:', err);
    }
  };

  // Bake Filter Effects directly onto all layers in active frame
  const handleBakeFilters = () => {
    if (frames.length === 0) return;

    setFrames((prev) => {
      return prev.map((f) => {
        const filteredLayers = (f.layers || []).map((l) => {
          if (!l.canvas) return l;
          const newC = document.createElement('canvas');
          newC.width = resolutionW;
          newC.height = resolutionH;
          const ctx = newC.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(l.canvas, 0, 0);

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

          return { ...l, canvas: newC };
        });

        const composite = compositeLayers(filteredLayers, resolutionW, resolutionH);
        return {
          ...f,
          layers: filteredLayers,
          compositeCanvas: composite,
          canvas: composite
        };
      });
    });

    setNotification('Filters permanently baked into layers!');
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
      const c = f.compositeCanvas || f.canvas;
      if (c) {
        ctx.drawImage(c, i * resolutionW, 0);
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
      const c = f.compositeCanvas || f.canvas;
      if (c) {
        ctx.drawImage(c, i * resolutionW, 0);
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
      {/* 1. Top Blender-Style Mode Header Bar */}
      <div className="h-9 px-3 bg-[#090e1a] border-b border-white/10 text-slate-200 flex items-center justify-between flex-shrink-0">
        {/* Left: Asset Title & Mode Switcher */}
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/30">
            🎨
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              className="bg-slate-950 border border-white/15 focus:border-blue-500 rounded px-2 h-6 text-xs font-bold text-white tracking-wide w-36 sm:w-44"
              placeholder="Asset Sheet Name"
            />
            <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 h-6 flex items-center rounded font-mono font-bold whitespace-nowrap">
              {resolutionW}×{resolutionH} PX
            </span>
          </div>

          {/* Mode Switcher Pill */}
          <div className="h-6 flex items-center bg-slate-950 p-0.5 rounded border border-white/10 ml-1">
            <button
              onClick={() => setEditorMode('draw')}
              className={`h-5 px-2 rounded text-[10px] font-bold flex items-center gap-1 transition-all whitespace-nowrap ${
                editorMode === 'draw'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>✏️ Draw</span>
            </button>
            <button
              onClick={() => setEditorMode('rig')}
              className={`h-5 px-2 rounded text-[10px] font-bold flex items-center gap-1 transition-all whitespace-nowrap ${
                editorMode === 'rig'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🦴 Pose & Rig</span>
            </button>
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

          {/* Quick Bake Pose button on top bar when in Rig Mode */}
          {editorMode === 'rig' && (
            <button
              onClick={handleBakePoseToNewFrame}
              className="btn btn-sm h-6 px-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black border-0 rounded flex items-center gap-1 shadow-md shadow-amber-500/20 whitespace-nowrap"
              title="Bake current skeleton pose into a brand new frame!"
            >
              <Sparkles size={11} />
              <span>Bake Pose to Frame</span>
            </button>
          )}

          {/* Import External Sprite Sheet / Image with Dropdown */}
          <div className="relative">
            <div className="flex items-center rounded bg-slate-900 border border-white/10 hover:border-white/20">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary btn-sm flex items-center gap-1.5 whitespace-nowrap border-0 rounded-r-none px-2 text-xs"
                title="Import and auto-slice a sprite sheet from your computer"
              >
                <Upload size={12} className="text-blue-400" />
                <span>Import Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => setIsImportMenuOpen(!isImportMenuOpen)}
                className="h-6 px-1.5 text-slate-400 hover:text-white border-l border-white/10 hover:bg-white/5 rounded-r flex items-center justify-center transition-colors"
                title="Select sample sprite sheet or browse file"
              >
                <ChevronDown size={11} />
              </button>
            </div>

            {isImportMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-64 bg-[#0e1626] border border-white/10 rounded-lg shadow-xl py-1 z-50 text-xs"
                onMouseLeave={() => setIsImportMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    setIsImportMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-slate-200"
                >
                  <FolderOpen size={13} className="text-blue-400" />
                  <span>Choose local file...</span>
                </button>
                <div className="border-t border-white/10 my-1" />
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Sample Sprite Sheets
                </div>
                <button
                  onClick={() => {
                    setIsImportMenuOpen(false);
                    handleImportSampleSheet('/dragon_8dir_transparent.png', 'dragon_8dir_transparent');
                  }}
                  className="w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-800 text-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <span>🐉</span>
                    <span>Dragon 8-Dir Sheet</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">1120×2240 (32f)</span>
                </button>
                <button
                  onClick={() => {
                    setIsImportMenuOpen(false);
                    handleImportSampleSheet('/download_test_1.png', 'duck_walk_sheet');
                  }}
                  className="w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-800 text-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <span>🦆</span>
                    <span>Duck Sprite Sheet</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">344×1536 (8f)</span>
                </button>
              </div>
            )}
          </div>
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
            currentFrame={currentFrame}
            onUpdateActiveLayerCanvas={handleUpdateActiveLayerCanvas}
            onClearActiveCel={handleClearActiveCel}
            editorMode={editorMode}
            onSelectEditorMode={setEditorMode}
            selectedBoneId={selectedBoneId}
            onSelectBoneId={setSelectedBoneId}
            onUpdateBones={handleUpdateBones}
            onBakePoseToNewFrame={handleBakePoseToNewFrame}
            onResetPose={handleResetPose}
            showBonesOverlay={showBonesOverlay}
            onToggleBonesOverlay={() => setShowBonesOverlay(!showBonesOverlay)}
            onSelectLayer={handleSelectLayer}
          />
        </div>

        {/* Right: Blender N-Panel Properties Inspector */}
        <BlenderPropertiesPanel
          activeColor={activeColor}
          onSelectColor={setActiveColor}
          customColors={customColors}
          onAddCustomColor={(c) => setCustomColors((prev) => [...new Set([...prev, c])])}
          activePaletteId={activePaletteId}
          onSelectPalette={setActivePaletteId}
          filterSettings={filterSettings}
          onUpdateFilterSettings={setFilterSettings}
          onApplyFilters={handleBakeFilters}
          onResetFilters={handleResetFilters}
          resolutionW={resolutionW}
          resolutionH={resolutionH}
          onChangeResolution={changeResolution}
          onGeneratePreset={(type) => generateProceduralPreset(type, resolutionW, resolutionH)}
          // Layer Management Props (Aseprite Core Features)
          layers={currentFrame?.layers || []}
          activeLayerId={currentFrame?.activeLayerId || null}
          onAddLayer={handleAddLayer}
          onDuplicateLayer={handleDuplicateLayer}
          onDeleteLayer={handleDeleteLayer}
          onReorderLayer={handleReorderLayer}
          onToggleLayerVisibility={handleToggleLayerVisibility}
          onToggleLayerLock={handleToggleLayerLock}
          onToggleAlphaLock={handleToggleAlphaLock}
          onChangeLayerBlendMode={handleChangeLayerBlendMode}
          onToggleClipping={handleToggleClipping}
          onClearActiveCel={handleClearActiveCel}
          onChangeLayerOpacity={handleChangeLayerOpacity}
          onMergeLayerDown={handleMergeLayerDown}
          onRenameLayer={handleRenameLayer}
          onSelectLayer={handleSelectLayer}
          // Skeleton Rig Props
          editorMode={editorMode}
          onSelectEditorMode={setEditorMode}
          bones={currentFrame?.rig?.bones || []}
          selectedBoneId={selectedBoneId}
          onSelectBoneId={setSelectedBoneId}
          onUpdateBones={handleUpdateBones}
          onSelectRigPreset={handleSelectRigPreset}
          onResetPose={handleResetPose}
          onBindLayerToBone={handleBindLayerToBone}
          onAutoBindLayers={handleAutoBindLayers}
          onBakePoseToNewFrame={handleBakePoseToNewFrame}
          onApplyPoseToCurrentFrame={handleApplyPoseToCurrentFrame}
        />
      </div>

      {/* 3. Interactive Import & Slice Sprite Sheet Modal */}
      <ImportSheetModal
        isOpen={Boolean(importModalData)}
        onClose={() => setImportModalData(null)}
        fileData={importModalData}
        currentStudioResolution={{ w: resolutionW, h: resolutionH }}
        onConfirmImport={handleConfirmImport}
      />
    </div>
  );
}
