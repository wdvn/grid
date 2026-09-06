/**
 * G.R.I.D. Studio — 2D/3D Skeleton Rigging Engine
 * Hierarchical Forward Kinematics (FK), Bone-to-Layer Binding,
 * Crisp Pixel Art Transformations & Frame Baking.
 */

// Math helpers
export const degToRad = (deg) => (deg * Math.PI) / 180;
export const radToDeg = (rad) => (rad * 180) / Math.PI;

/**
 * Standard Presets for 2D Skeletal Rigs
 * Coordinates normalized or sized for default 96x96 canvas.
 */
export const RIG_PRESETS = {
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
        y: 56,
        length: 12,
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
        x: 0,
        y: -14,
        length: 16,
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
        x: 0,
        y: -18,
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
        x: -7,
        y: -12,
        length: 15,
        baseAngle: 135, // points down-left
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
        x: 7,
        y: -12,
        length: 16,
        baseAngle: 45, // points down-right
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
        x: -5,
        y: 2,
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
        x: 5,
        y: 2,
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
        x: 48,
        y: 52,
        length: 22,
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
        x: 12,
        y: -4,
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
        x: 10,
        y: 4,
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
        x: 7,
        y: 4,
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
        x: -9,
        y: 4,
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
        x: -12,
        y: 4,
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
        x: -14,
        y: -4,
        length: 16,
        baseAngle: -150,
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
    name: 'Chain / Limb (3-Joint)',
    description: 'Flexible chain for tentacles, swords, capes or tails',
    bones: [
      {
        id: 'chain_1',
        name: 'Base Joint',
        parentId: null,
        x: 48,
        y: 30,
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
        name: 'Mid Joint',
        parentId: 'chain_1',
        x: 0,
        y: 18,
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
        name: 'Tip Joint',
        parentId: 'chain_2',
        x: 0,
        y: 18,
        length: 18,
        baseAngle: 90,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        bindLayerId: null,
        color: '#10b981'
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

  return bones.map((bone) => {
    if (!bone.parentId) {
      // Root bone coordinates in canvas space
      return {
        ...bone,
        x: Math.round(bone.x * sx),
        y: Math.round(bone.y * sy),
        length: Math.round(bone.length * sAvg),
        offsetX: Math.round((bone.offsetX || 0) * sx),
        offsetY: Math.round((bone.offsetY || 0) * sy)
      };
    } else {
      // Child bone relative offset & length
      return {
        ...bone,
        x: Math.round(bone.x * sx),
        y: Math.round(bone.y * sy),
        length: Math.round(bone.length * sAvg)
      };
    }
  });
}

/**
 * Compute Forward Kinematics (FK) for all bones in the hierarchy.
 * Returns a map of boneId -> { startX, startY, endX, endY, angleRad, angleDeg, deltaAngleRad, deltaAngleDeg, totalOffsetX, totalOffsetY }
 */
export function computeForwardKinematics(bones = []) {
  const boneMap = new Map();
  bones.forEach((b) => boneMap.set(b.id, b));

  const result = new Map();

  function solveBone(bone) {
    if (result.has(bone.id)) return result.get(bone.id);

    let startX = bone.x;
    let startY = bone.y;
    let parentWorldAngleRad = 0;
    let totalOffsetX = bone.offsetX || 0;
    let totalOffsetY = bone.offsetY || 0;

    if (bone.parentId && boneMap.has(bone.parentId)) {
      const parentResult = solveBone(boneMap.get(bone.parentId));
      // Joint position attaches to parent start position + rotated offset
      const pAngle = parentResult.worldAngleRad;
      const cosP = Math.cos(pAngle);
      const sinP = Math.sin(pAngle);

      // Parent relative attachment point
      startX = parentResult.startX + (bone.x * cosP - bone.y * sinP);
      startY = parentResult.startY + (bone.x * sinP + bone.y * cosP);
      parentWorldAngleRad = parentResult.deltaAngleRad; // inherit delta rotation
      totalOffsetX = parentResult.totalOffsetX + (bone.offsetX || 0);
      totalOffsetY = parentResult.totalOffsetY + (bone.offsetY || 0);
    }

    const currentRotationDeg = bone.rotation || 0;
    const baseAngleRad = degToRad(bone.baseAngle || 0);
    const deltaAngleRad = degToRad(currentRotationDeg) + parentWorldAngleRad;
    const worldAngleRad = baseAngleRad + deltaAngleRad;

    const endX = startX + Math.cos(worldAngleRad) * bone.length;
    const endY = startY + Math.sin(worldAngleRad) * bone.length;

    const computed = {
      boneId: bone.id,
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
  if (!boneFK || (boneFK.deltaAngleRad === 0 && boneFK.totalOffsetX === 0 && boneFK.totalOffsetY === 0)) {
    // No transform needed, copy 1:1
    ctx.drawImage(sourceCanvas, 0, 0);
    return destCanvas;
  }

  const pivotX = boneFK.startX;
  const pivotY = boneFK.startY;
  const rot = boneFK.deltaAngleRad;
  const offX = boneFK.totalOffsetX || 0;
  const offY = boneFK.totalOffsetY || 0;

  ctx.save();
  // Translate to pivot in target space + offset
  ctx.translate(pivotX + offX, pivotY + offY);
  ctx.rotate(rot);
  // Translate back to origin
  ctx.translate(-pivotX, -pivotY);

  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.restore();

  return destCanvas;
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
 * Layers are drawn bottom to top. Supports Opacity, Blend Modes and Clipping Masks.
 */
export function compositeLayers(layers = [], w, h, bonesFK = null, boneLayerMap = null) {
  const composite = document.createElement('canvas');
  composite.width = w;
  composite.height = h;
  const ctx = composite.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let prevLayerCanvas = null;

  layers.forEach((layer) => {
    if (!layer.visible || !layer.canvas) return;

    // 1. Render layer content into temporary buffer (applying bone transform if any)
    const layerBuffer = document.createElement('canvas');
    layerBuffer.width = w;
    layerBuffer.height = h;
    const bufCtx = layerBuffer.getContext('2d');
    bufCtx.imageSmoothingEnabled = false;

    if (bonesFK && boneLayerMap && boneLayerMap.has(layer.id)) {
      const boneId = boneLayerMap.get(layer.id);
      const boneTransform = bonesFK.get(boneId);
      if (boneTransform) {
        const transformed = transformLayerByBone(layer.canvas, boneTransform, w, h);
        bufCtx.drawImage(transformed, 0, 0);
      } else {
        bufCtx.drawImage(layer.canvas, 0, 0);
      }
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
 * Bake Posed Layers: Creates a new array of layers where every layer bound to a bone
 * has its transform permanently baked into its pixel canvas.
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

  const bakedLayers = layers.map((layer) => {
    if (!layer.canvas) return { ...layer };

    const boundBoneId = boneLayerMap.get(layer.id);
    if (!boundBoneId || !fkResult.has(boundBoneId)) {
      // Layer not bound to any bone: clone canvas
      const clone = document.createElement('canvas');
      clone.width = w;
      clone.height = h;
      const ctx = clone.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(layer.canvas, 0, 0);
      return {
        ...layer,
        canvas: clone,
        blendMode: layer.blendMode || 'normal',
        clipping: Boolean(layer.clipping),
        alphaLocked: Boolean(layer.alphaLocked)
      };
    }

    const boneTransform = fkResult.get(boundBoneId);
    const bakedCanvas = transformLayerByBone(layer.canvas, boneTransform, w, h);
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
 * e.g. "Head" layer matches "head" bone, "Arm (Left)" matches "arm_l"
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
