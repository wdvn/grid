/**
 * G.R.I.D. Studio — 2D/3D Skeleton Rigging Engine
 * Hierarchical Forward Kinematics (FK), Bone-to-Layer Binding,
 * Crisp Pixel Art Transformations, Single-Layer Skinning Deform & Frame Baking.
 */

// Math helpers
export const degToRad = (deg) => (deg * Math.PI) / 180;
export const radToDeg = (rad) => (rad * 180) / Math.PI;

/**
 * Standard Presets for 2D Skeletal Rigs
 * Coordinates normalized or sized for default 96x96 canvas.
 */
export const RIG_PRESETS = {
  dragon_worm: {
    id: 'dragon_worm',
    name: 'Dragon / Worm (Spine Chain)',
    description: 'Head, Antennae, 4 Body Segments and Tail for serpentine creatures',
    bones: [
      {
        id: 'head',
        name: 'Head',
        parentId: null,
        x: 48,
        y: 20,
        length: 16,
        baseAngle: 90, // points down along body
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#06b6d4'
      },
      {
        id: 'neck',
        name: 'Neck & Upper Body',
        parentId: 'head',
        x: 48,
        y: 36,
        length: 14,
        baseAngle: 90,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#3b82f6'
      },
      {
        id: 'body_mid',
        name: 'Mid Body',
        parentId: 'neck',
        x: 48,
        y: 50,
        length: 14,
        baseAngle: 90,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#10b981'
      },
      {
        id: 'body_lower',
        name: 'Lower Body',
        parentId: 'body_mid',
        x: 48,
        y: 64,
        length: 14,
        baseAngle: 90,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#f59e0b'
      },
      {
        id: 'tail',
        name: 'Tail',
        parentId: 'body_lower',
        x: 48,
        y: 78,
        length: 16,
        baseAngle: 90,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#8b5cf6'
      },
      {
        id: 'antenna_l',
        name: 'Left Antenna / Horn',
        parentId: 'head',
        x: 44,
        y: 22,
        length: 12,
        baseAngle: 215, // points up-left
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#f43f5e'
      },
      {
        id: 'antenna_r',
        name: 'Right Antenna / Horn',
        parentId: 'head',
        x: 52,
        y: 22,
        length: 12,
        baseAngle: -35, // points up-right
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#f43f5e'
      }
    ]
  },
  biped: {
    id: 'biped',
    name: 'Humanoid Biped',
    description: 'Head, Torso, Arms & Legs for humanoid characters',
    bones: [
      {
        id: 'root',
        name: 'Root / Pelvis',
        parentId: null,
        x: 48,
        y: 54,
        length: 14,
        baseAngle: -90, // points up towards torso
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#f59e0b'
      },
      {
        id: 'torso',
        name: 'Torso',
        parentId: 'root',
        x: 48,
        y: 40,
        length: 14,
        baseAngle: -90,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#3b82f6'
      },
      {
        id: 'head',
        name: 'Head',
        parentId: 'torso',
        x: 48,
        y: 26,
        length: 14,
        baseAngle: -90,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#06b6d4'
      },
      {
        id: 'arm_l',
        name: 'Arm (Left)',
        parentId: 'torso',
        x: 40,
        y: 30,
        length: 16,
        baseAngle: 120, // points down-left
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#10b981'
      },
      {
        id: 'arm_r',
        name: 'Arm (Right / Weapon)',
        parentId: 'torso',
        x: 56,
        y: 30,
        length: 16,
        baseAngle: 60, // points down-right
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#8b5cf6'
      },
      {
        id: 'leg_l',
        name: 'Leg (Left)',
        parentId: 'root',
        x: 43,
        y: 54,
        length: 18,
        baseAngle: 90, // points down
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#10b981'
      },
      {
        id: 'leg_r',
        name: 'Leg (Right)',
        parentId: 'root',
        x: 53,
        y: 54,
        length: 18,
        baseAngle: 90, // points down
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#8b5cf6'
      }
    ]
  },
  quadruped: {
    id: 'quadruped',
    name: 'Quadruped (4-Legged)',
    description: 'Body, Head, 4 Legs and Tail for monsters and animals',
    bones: [
      {
        id: 'body',
        name: 'Body / Spine',
        parentId: null,
        x: 36,
        y: 50,
        length: 24,
        baseAngle: 0, // horizontal
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#3b82f6'
      },
      {
        id: 'neck_head',
        name: 'Neck & Head',
        parentId: 'body',
        x: 60,
        y: 50,
        length: 16,
        baseAngle: -55,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#06b6d4'
      },
      {
        id: 'front_leg_l',
        name: 'Front Leg (L)',
        parentId: 'body',
        x: 56,
        y: 52,
        length: 18,
        baseAngle: 90,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#10b981'
      },
      {
        id: 'front_leg_r',
        name: 'Front Leg (R)',
        parentId: 'body',
        x: 52,
        y: 52,
        length: 18,
        baseAngle: 90,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#8b5cf6'
      },
      {
        id: 'back_leg_l',
        name: 'Back Leg (L)',
        parentId: 'body',
        x: 40,
        y: 52,
        length: 18,
        baseAngle: 90,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#10b981'
      },
      {
        id: 'back_leg_r',
        name: 'Back Leg (R)',
        parentId: 'body',
        x: 36,
        y: 52,
        length: 18,
        baseAngle: 90,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#8b5cf6'
      },
      {
        id: 'tail',
        name: 'Tail',
        parentId: 'body',
        x: 36,
        y: 48,
        length: 16,
        baseAngle: 150,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#f59e0b'
      }
    ]
  },
  limb_chain: {
    id: 'limb_chain',
    name: 'Chain / Limb (4-Joint)',
    description: 'Flexible chain for tentacles, swords, capes or tails',
    bones: [
      {
        id: 'chain_1',
        name: 'Base Joint',
        parentId: null,
        x: 48,
        y: 20,
        length: 18,
        baseAngle: 90,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#f59e0b'
      },
      {
        id: 'chain_2',
        name: 'Mid Joint 1',
        parentId: 'chain_1',
        x: 48,
        y: 38,
        length: 18,
        baseAngle: 90,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#3b82f6'
      },
      {
        id: 'chain_3',
        name: 'Mid Joint 2',
        parentId: 'chain_2',
        x: 48,
        y: 56,
        length: 18,
        baseAngle: 90,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#10b981'
      },
      {
        id: 'chain_4',
        name: 'Tip Joint',
        parentId: 'chain_3',
        x: 48,
        y: 74,
        length: 18,
        baseAngle: 90,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#8b5cf6'
      }
    ]
  }
};

/**
 * Scale default bone positions to match current canvas resolution
 */
export function scaleBonesToResolution(bones, baseW = 96, baseH = 96, targetW = 96, targetH = 96) {
  if (baseW === targetW && baseH === targetH) return bones;
  const sx = targetW / baseW;
  const sy = targetH / baseH;
  const sAvg = (sx + sy) / 2;

  return bones.map((bone) => ({
    ...bone,
    x: Math.round(bone.x * sx),
    y: Math.round(bone.y * sy),
    length: Math.round(bone.length * sAvg),
    offsetX: Math.round((bone.offsetX || 0) * sx),
    offsetY: Math.round((bone.offsetY || 0) * sy)
  }));
}

/**
 * Compute Forward Kinematics (FK) for all bones in the hierarchy.
 * Returns a map of boneId -> { restStartX, restStartY, startX, startY, endX, endY, angleRad, angleDeg, deltaAngleRad, deltaAngleDeg, totalOffsetX, totalOffsetY, length }
 */
export function computeForwardKinematics(bones = []) {
  const boneMap = new Map();
  bones.forEach((b) => boneMap.set(b.id, b));

  const result = new Map();

  function solveBone(bone) {
    if (result.has(bone.id)) return result.get(bone.id);

    let startX = bone.x;
    let startY = bone.y;
    let parentDeltaAngleRad = 0;
    let totalOffsetX = bone.offsetX || 0;
    let totalOffsetY = bone.offsetY || 0;

    if (bone.parentId && boneMap.has(bone.parentId)) {
      const parent = boneMap.get(bone.parentId);
      const parentResult = solveBone(parent);

      // Relative rest offset from parent rest joint to child rest joint
      const dx0 = bone.x - parent.x;
      const dy0 = bone.y - parent.y;

      // Parent cumulative delta rotation
      const pAngle = parentResult.deltaAngleRad;
      const cosP = Math.cos(pAngle);
      const sinP = Math.sin(pAngle);

      startX = parentResult.startX + (dx0 * cosP - dy0 * sinP);
      startY = parentResult.startY + (dx0 * sinP + dy0 * cosP);
      parentDeltaAngleRad = parentResult.deltaAngleRad;
      totalOffsetX = parentResult.totalOffsetX + (bone.offsetX || 0);
      totalOffsetY = parentResult.totalOffsetY + (bone.offsetY || 0);
    } else {
      startX = bone.x + totalOffsetX;
      startY = bone.y + totalOffsetY;
    }

    const currentRotationDeg = bone.rotation || 0;
    const baseAngleRad = degToRad(bone.baseAngle || 0);
    const deltaAngleRad = degToRad(currentRotationDeg) + parentDeltaAngleRad;
    const worldAngleRad = baseAngleRad + deltaAngleRad;

    const endX = startX + Math.cos(worldAngleRad) * bone.length;
    const endY = startY + Math.sin(worldAngleRad) * bone.length;

    const computed = {
      boneId: bone.id,
      restStartX: bone.x,
      restStartY: bone.y,
      startX,
      startY,
      endX,
      endY,
      worldAngleRad,
      worldAngleDeg: radToDeg(worldAngleRad),
      deltaAngleRad,
      deltaAngleDeg: radToDeg(deltaAngleRad),
      totalOffsetX,
      totalOffsetY,
      length: bone.length
    };

    result.set(bone.id, computed);
    return computed;
  }

  bones.forEach((bone) => solveBone(bone));
  return result;
}

/**
 * Transform a Layer Canvas based on its bound bone's FK world transform.
 * Renders with nearest-neighbor crisp pixel art sampling.
 */
export function transformLayerByBone(
  sourceCanvas,
  boneFK,
  w,
  h
) {
  const destCanvas = document.createElement('canvas');
  destCanvas.width = w;
  destCanvas.height = h;
  const ctx = destCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  if (!sourceCanvas) return destCanvas;
  if (!boneFK || (Math.abs(boneFK.deltaAngleRad) < 0.0001 && Math.abs(boneFK.totalOffsetX) < 0.0001 && Math.abs(boneFK.totalOffsetY) < 0.0001)) {
    ctx.drawImage(sourceCanvas, 0, 0);
    return destCanvas;
  }

  const pivotX = boneFK.restStartX;
  const pivotY = boneFK.restStartY;
  const currentJointX = boneFK.startX;
  const currentJointY = boneFK.startY;
  const rot = boneFK.deltaAngleRad;

  ctx.save();
  // Move origin to current posed joint location
  ctx.translate(currentJointX, currentJointY);
  ctx.rotate(rot);
  // Re-align by rest joint coordinate
  ctx.translate(-pivotX, -pivotY);

  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.restore();

  return destCanvas;
}

/**
 * Calculate distance squared from point (px, py) to line segment (x1, y1)-(x2, y2)
 */
export function distToSegmentSquared(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

/**
 * Deform a single canvas according to the skeleton's bone hierarchy.
 * Segments pixels by closest rest bone and applies each bone's FK transform.
 */
export function deformCanvasByBones(sourceCanvas, bones = [], fkResult, w, h) {
  if (!sourceCanvas || bones.length === 0 || !fkResult) return sourceCanvas;

  let hasTransform = false;
  bones.forEach((b) => {
    const fk = fkResult.get(b.id);
    if (fk && (Math.abs(fk.deltaAngleRad) > 0.001 || Math.abs(fk.totalOffsetX) > 0.001 || Math.abs(fk.totalOffsetY) > 0.001)) {
      hasTransform = true;
    }
  });

  if (!hasTransform) {
    return sourceCanvas;
  }

  const srcCtx = sourceCanvas.getContext('2d');
  const imgData = srcCtx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Bounding box of non-empty pixels
  let minX = w, minY = h, maxX = 0, maxY = 0;
  let hasPixels = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hasPixels = true;
      }
    }
  }

  if (!hasPixels) return sourceCanvas;

  const boneDataMap = new Map();
  bones.forEach((b) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    boneDataMap.set(b.id, {
      bone: b,
      canvas: c,
      ctx,
      imgData: ctx.createImageData(w, h),
      count: 0
    });
  });

  const restSegments = bones.map((b) => {
    const baseAngleRad = degToRad(b.baseAngle || 0);
    return {
      id: b.id,
      sx: b.x,
      sy: b.y,
      ex: b.x + Math.cos(baseAngleRad) * b.length,
      ey: b.y + Math.sin(baseAngleRad) * b.length
    };
  });

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = (y * w + x) * 4;
      const a = data[idx + 3];
      if (a === 0) continue;

      let bestDist = Infinity;
      let bestId = restSegments[0]?.id;

      for (let i = 0; i < restSegments.length; i++) {
        const seg = restSegments[i];
        const d2 = distToSegmentSquared(x, y, seg.sx, seg.sy, seg.ex, seg.ey);
        if (d2 < bestDist) {
          bestDist = d2;
          bestId = seg.id;
        }
      }

      if (bestId && boneDataMap.has(bestId)) {
        const target = boneDataMap.get(bestId);
        const tData = target.imgData.data;
        tData[idx] = data[idx];
        tData[idx + 1] = data[idx + 1];
        tData[idx + 2] = data[idx + 2];
        tData[idx + 3] = a;
        target.count++;
      }
    }
  }

  const destCanvas = document.createElement('canvas');
  destCanvas.width = w;
  destCanvas.height = h;
  const destCtx = destCanvas.getContext('2d');
  destCtx.imageSmoothingEnabled = false;

  bones.forEach((b) => {
    const entry = boneDataMap.get(b.id);
    if (!entry || entry.count === 0) return;

    entry.ctx.putImageData(entry.imgData, 0, 0);
    const fk = fkResult.get(b.id);
    const transformed = transformLayerByBone(entry.canvas, fk, w, h);
    destCtx.drawImage(transformed, 0, 0);
  });

  return destCanvas;
}

/**
 * Automatically slices a single layer canvas into separate layers corresponding to each bone.
 */
export function autoSegmentLayerToBones(layer, bones = [], w, h) {
  if (!layer || !layer.canvas || bones.length === 0) return { layers: [layer], bones };

  const ctx = layer.canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const boneDataMap = new Map();
  bones.forEach((b) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const bCtx = c.getContext('2d');
    bCtx.imageSmoothingEnabled = false;
    boneDataMap.set(b.id, {
      bone: b,
      canvas: c,
      ctx: bCtx,
      imgData: bCtx.createImageData(w, h),
      count: 0
    });
  });

  const restSegments = bones.map((b) => {
    const baseAngleRad = degToRad(b.baseAngle || 0);
    return {
      id: b.id,
      sx: b.x,
      sy: b.y,
      ex: b.x + Math.cos(baseAngleRad) * b.length,
      ey: b.y + Math.sin(baseAngleRad) * b.length
    };
  });

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const a = data[idx + 3];
      if (a === 0) continue;

      let bestDist = Infinity;
      let bestId = restSegments[0]?.id;

      for (let i = 0; i < restSegments.length; i++) {
        const seg = restSegments[i];
        const d2 = distToSegmentSquared(x, y, seg.sx, seg.sy, seg.ex, seg.ey);
        if (d2 < bestDist) {
          bestDist = d2;
          bestId = seg.id;
        }
      }

      if (bestId && boneDataMap.has(bestId)) {
        const target = boneDataMap.get(bestId);
        const tData = target.imgData.data;
        tData[idx] = data[idx];
        tData[idx + 1] = data[idx + 1];
        tData[idx + 2] = data[idx + 2];
        tData[idx + 3] = a;
        target.count++;
      }
    }
  }

  const newLayers = [];
  const updatedBones = bones.map((b) => ({ ...b }));

  bones.forEach((b) => {
    const entry = boneDataMap.get(b.id);
    if (!entry || entry.count === 0) return;

    entry.ctx.putImageData(entry.imgData, 0, 0);
    const layerId = `layer_${b.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newLayer = {
      id: layerId,
      name: b.name,
      visible: true,
      locked: false,
      alphaLocked: false,
      clipping: false,
      blendMode: 'normal',
      opacity: 1,
      canvas: entry.canvas
    };
    newLayers.push(newLayer);

    const bIdx = updatedBones.findIndex((bone) => bone.id === b.id);
    if (bIdx >= 0) {
      updatedBones[bIdx].bindLayerId = layerId;
    }
  });

  if (newLayers.length === 0) {
    return { layers: [layer], bones };
  }

  return {
    layers: newLayers,
    bones: updatedBones
  };
}

export const BLEND_MODES = [
  { id: 'normal', name: 'Normal', operation: 'source-over' },
  { id: 'multiply', name: 'Multiply (Shadow)', operation: 'multiply' },
  { id: 'screen', name: 'Screen (Glow)', operation: 'screen' },
  { id: 'overlay', name: 'Overlay', operation: 'overlay' },
  { id: 'darken', name: 'Darken', operation: 'darken' },
  { id: 'lighten', name: 'Lighten', operation: 'lighten' },
  { id: 'color-dodge', name: 'Color Dodge', operation: 'color-dodge' },
  { id: 'difference', name: 'Difference', operation: 'difference' }
];

const BLEND_OPERATION_MAP = {
  normal: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken',
  lighten: 'lighten',
  'color-dodge': 'color-dodge',
  difference: 'difference'
};

/**
 * Composite an array of layers onto a single Canvas.
 * Layers are drawn bottom to top. Supports Opacity, Blend Modes, Clipping Masks and Live Rig Deformation.
 */
export function compositeLayers(layers = [], w, h, bonesFK = null, boneLayerMap = null, bones = []) {
  const composite = document.createElement('canvas');
  composite.width = w;
  composite.height = h;
  const ctx = composite.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let prevLayerCanvas = null;
  const hasBoundLayers = layers.some((l) => boneLayerMap && boneLayerMap.has(l.id));

  layers.forEach((layer) => {
    if (!layer.visible || !layer.canvas) return;

    // 1. Render layer content into temporary buffer (applying bone transform if any)
    const layerBuffer = document.createElement('canvas');
    layerBuffer.width = w;
    layerBuffer.height = h;
    const bufCtx = layerBuffer.getContext('2d');
    bufCtx.imageSmoothingEnabled = false;

    if (bonesFK && boneLayerMap && boneLayerMap.has(layer.id)) {
      // Cutout workflow: layer bound to specific bone
      const boneId = boneLayerMap.get(layer.id);
      const boneTransform = bonesFK.get(boneId);
      if (boneTransform) {
        const transformed = transformLayerByBone(layer.canvas, boneTransform, w, h);
        bufCtx.drawImage(transformed, 0, 0);
      } else {
        bufCtx.drawImage(layer.canvas, 0, 0);
      }
    } else if (bonesFK && bones.length > 0 && !hasBoundLayers && (layers.length === 1 || layer.isSkinned)) {
      // Skinning workflow: single-layer sprite deformed live by all bones
      const deformed = deformCanvasByBones(layer.canvas, bones, bonesFK, w, h);
      bufCtx.drawImage(deformed, 0, 0);
    } else {
      bufCtx.drawImage(layer.canvas, 0, 0);
    }

    // 2. Handle Clipping Mask (Clip into layer below)
    if (layer.clipping && prevLayerCanvas) {
      bufCtx.globalCompositeOperation = 'destination-in';
      bufCtx.drawImage(prevLayerCanvas, 0, 0);
      bufCtx.globalCompositeOperation = 'source-over';
    }

    // 3. Draw onto composite canvas with Opacity and Blend Mode
    ctx.save();
    ctx.globalAlpha = typeof layer.opacity === 'number' ? layer.opacity : 1;
    const blendOp = BLEND_OPERATION_MAP[layer.blendMode] || 'source-over';
    ctx.globalCompositeOperation = blendOp;
    ctx.drawImage(layerBuffer, 0, 0);
    ctx.restore();

    prevLayerCanvas = layer.canvas;
  });

  return composite;
}

/**
 * Bake Posed Layers: Creates a new array of layers where every layer or single-layer sprite
 * has its bone deformation permanently baked into its pixel canvas.
 * Bone rotations are reset to 0 for the new frame!
 */
export function bakePosedLayers(layers = [], bones = [], w, h) {
  const fkResult = computeForwardKinematics(bones);
  const boneLayerMap = new Map();
  bones.forEach((b) => {
    if (b.bindLayerId) {
      boneLayerMap.set(b.bindLayerId, b.id);
    }
  });

  const hasBoundLayers = layers.some((l) => boneLayerMap.has(l.id));

  const bakedLayers = layers.map((layer) => {
    if (!layer.canvas) return { ...layer };

    let bakedCanvas;
    if (boneLayerMap.has(layer.id)) {
      const boundBoneId = boneLayerMap.get(layer.id);
      const boneTransform = fkResult.get(boundBoneId);
      bakedCanvas = transformLayerByBone(layer.canvas, boneTransform, w, h);
    } else if (!hasBoundLayers && (layers.length === 1 || layer.isSkinned)) {
      bakedCanvas = deformCanvasByBones(layer.canvas, bones, fkResult, w, h);
    } else {
      const clone = document.createElement('canvas');
      clone.width = w;
      clone.height = h;
      const ctx = clone.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(layer.canvas, 0, 0);
      bakedCanvas = clone;
    }

    return {
      ...layer,
      canvas: bakedCanvas,
      blendMode: layer.blendMode || 'normal',
      clipping: Boolean(layer.clipping),
      alphaLocked: Boolean(layer.alphaLocked)
    };
  });

  // Bones for the new frame start with reset rotation/offsets
  const resetBones = bones.map((b) => ({
    ...b,
    rotation: 0,
    offsetX: 0,
    offsetY: 0
  }));

  const composite = compositeLayers(bakedLayers, w, h);

  return {
    bakedLayers,
    resetBones,
    compositeCanvas: composite
  };
}

/**
 * Auto-bind layers to bones by comparing names.
 */
export function autoBindLayersToBones(layers = [], bones = []) {
  const normalize = (str) =>
    (str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();

  return bones.map((bone) => {
    const boneKey = normalize(bone.name) || normalize(bone.id);

    const matchedLayer = layers.find((l) => {
      const layerKey = normalize(l.name);
      return (
        layerKey === boneKey ||
        layerKey.includes(boneKey) ||
        boneKey.includes(layerKey) ||
        (boneKey.includes('head') && layerKey.includes('head')) ||
        (boneKey.includes('neck') && layerKey.includes('neck')) ||
        (boneKey.includes('bodymid') && (layerKey.includes('mid') || layerKey.includes('body'))) ||
        (boneKey.includes('bodylower') && (layerKey.includes('lower') || layerKey.includes('bottom'))) ||
        (boneKey.includes('tail') && layerKey.includes('tail')) ||
        (boneKey.includes('antenna') && (layerKey.includes('antenna') || layerKey.includes('horn') || layerKey.includes('whisker'))) ||
        (boneKey.includes('torso') && (layerKey.includes('torso') || layerKey.includes('body'))) ||
        (boneKey.includes('arml') && (layerKey.includes('arml') || layerKey.includes('leftarm'))) ||
        (boneKey.includes('armr') && (layerKey.includes('armr') || layerKey.includes('rightarm') || layerKey.includes('weapon') || layerKey.includes('sword'))) ||
        (boneKey.includes('legl') && (layerKey.includes('legl') || layerKey.includes('leftleg'))) ||
        (boneKey.includes('legr') && (layerKey.includes('legr') || layerKey.includes('rightleg')))
      );
    });

    return {
      ...bone,
      bindLayerId: matchedLayer ? matchedLayer.id : bone.bindLayerId
    };
  });
}
