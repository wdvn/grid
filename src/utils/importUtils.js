/**
 * G.R.I.D. Atlas Import Utilities
 * Parses various Sprite Sheet Atlas JSON formats:
 * - Phaser 3 / TexturePacker JSON Hash
 * - TexturePacker JSON Array
 * - Aseprite JSON (with frameTags)
 * - Unity / Godot Sprite Atlas JSON
 * - Generic Frame Array / Simple Alias Map
 */

export function parseAtlasJSON(jsonInput) {
  try {
    let data = jsonInput;
    if (typeof jsonInput === 'string') {
      const trimmed = jsonInput.trim();
      if (!trimmed) {
        return { success: false, error: 'JSON content is empty.' };
      }
      data = JSON.parse(trimmed);
    }

    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Parsed JSON root is not a valid object or array.' };
    }

    const timestamp = Date.now();
    let format = 'Unknown Atlas Format';
    let frames = [];
    let imageName = null;
    let imageDimensions = null;
    let frameTags = [];

    // Extract meta if present
    if (data.meta && typeof data.meta === 'object') {
      if (data.meta.image) imageName = String(data.meta.image);
      if (data.meta.size && typeof data.meta.size === 'object') {
        const w = Number(data.meta.size.w) || 0;
        const h = Number(data.meta.size.h) || 0;
        if (w > 0 && h > 0) imageDimensions = { width: w, height: h };
      }
      if (Array.isArray(data.meta.frameTags)) {
        frameTags = data.meta.frameTags;
      }
    }

    // CASE 1: Generic Array of Frames [ { name, x, y, w, h, ... } ]
    if (Array.isArray(data)) {
      format = 'Generic Frame Array';
      frames = data.map((item, index) => {
        const frameData = item.frame || item;
        const x = Number(frameData.x ?? 0);
        const y = Number(frameData.y ?? 0);
        const w = Number(frameData.w ?? frameData.width ?? 32);
        const h = Number(frameData.h ?? frameData.height ?? 32);
        const pivotX = Number(item.pivotX ?? item.pivot?.x ?? 0.5);
        const pivotY = Number(item.pivotY ?? item.pivot?.y ?? 0.5);
        const name = String(item.name || item.filename || `frame_${index + 1}`);

        return {
          id: `atlas_${timestamp}_${index}`,
          name,
          x: Math.max(0, x),
          y: Math.max(0, y),
          w: Math.max(1, w),
          h: Math.max(1, h),
          pivotX: isNaN(pivotX) ? 0.5 : pivotX,
          pivotY: isNaN(pivotY) ? 0.5 : pivotY
        };
      });
    }

    // CASE 2: TexturePacker JSON Array { frames: [ { filename, frame: {x, y, w, h}, pivot: {x, y} } ] }
    else if (Array.isArray(data.frames)) {
      format = frameTags.length > 0 ? 'Aseprite JSON Array (with Tags)' : 'TexturePacker JSON Array';
      frames = data.frames.map((item, index) => {
        const f = item.frame || item;
        const name = String(item.filename || item.name || `frame_${index + 1}`);
        const x = Number(f.x ?? 0);
        const y = Number(f.y ?? 0);
        const w = Number(f.w ?? f.width ?? 32);
        const h = Number(f.h ?? f.height ?? 32);
        const pivotX = Number(item.pivot?.x ?? item.pivotX ?? 0.5);
        const pivotY = Number(item.pivot?.y ?? item.pivotY ?? 0.5);

        return {
          id: `atlas_${timestamp}_${index}`,
          name,
          x: Math.max(0, x),
          y: Math.max(0, y),
          w: Math.max(1, w),
          h: Math.max(1, h),
          pivotX: isNaN(pivotX) ? 0.5 : pivotX,
          pivotY: isNaN(pivotY) ? 0.5 : pivotY
        };
      });
    }

    // CASE 3: Phaser 3 / TexturePacker JSON Hash { frames: { "anim_0": { frame: {x, y, w, h}, pivot } } }
    else if (data.frames && typeof data.frames === 'object') {
      format = frameTags.length > 0 ? 'Aseprite JSON Hash (with Tags)' : 'Phaser / TexturePacker JSON Hash';
      const keys = Object.keys(data.frames);
      frames = keys.map((key, index) => {
        const item = data.frames[key];
        const f = item.frame || item;
        const x = Number(f.x ?? 0);
        const y = Number(f.y ?? 0);
        const w = Number(f.w ?? f.width ?? 32);
        const h = Number(f.h ?? f.height ?? 32);
        const pivotX = Number(item.pivot?.x ?? item.pivotX ?? 0.5);
        const pivotY = Number(item.pivot?.y ?? item.pivotY ?? 0.5);

        return {
          id: `atlas_${timestamp}_${index}`,
          name: key,
          x: Math.max(0, x),
          y: Math.max(0, y),
          w: Math.max(1, w),
          h: Math.max(1, h),
          pivotX: isNaN(pivotX) ? 0.5 : pivotX,
          pivotY: isNaN(pivotY) ? 0.5 : pivotY
        };
      });
    }

    // CASE 4: Simple Alias Map { "frame_alias_1": { x, y, w, h } } or { "frame_alias_1": [x, y, w, h] }
    else {
      const keys = Object.keys(data).filter(k => k !== 'meta');
      if (keys.length > 0) {
        format = 'Simple Sheet Alias Map';
        frames = keys.map((key, index) => {
          const val = data[key];
          let x = 0, y = 0, w = 32, h = 32, pivotX = 0.5, pivotY = 0.5;

          if (Array.isArray(val) && val.length >= 4) {
            x = Number(val[0]) || 0;
            y = Number(val[1]) || 0;
            w = Number(val[2]) || 32;
            h = Number(val[3]) || 32;
          } else if (val && typeof val === 'object') {
            const f = val.frame || val;
            x = Number(f.x ?? 0);
            y = Number(f.y ?? 0);
            w = Number(f.w ?? f.width ?? 32);
            h = Number(f.h ?? f.height ?? 32);
            pivotX = Number(val.pivot?.x ?? val.pivotX ?? 0.5);
            pivotY = Number(val.pivot?.y ?? val.pivotY ?? 0.5);
          }

          return {
            id: `atlas_${timestamp}_${index}`,
            name: key,
            x: Math.max(0, x),
            y: Math.max(0, y),
            w: Math.max(1, w),
            h: Math.max(1, h),
            pivotX: isNaN(pivotX) ? 0.5 : pivotX,
            pivotY: isNaN(pivotY) ? 0.5 : pivotY
          };
        });
      }
    }

    if (frames.length === 0) {
      return {
        success: false,
        error: 'No frame coordinates found in the JSON file. Ensure it contains a "frames" object/array or frame alias map.'
      };
    }

    // Generate Animation Clips from Tags or Name Prefixes
    const animations = [];

    // If Aseprite frameTags exist
    if (frameTags.length > 0) {
      frameTags.forEach((tag, idx) => {
        const from = Math.max(0, Number(tag.from) || 0);
        const to = Math.min(frames.length - 1, Number(tag.to) || frames.length - 1);
        const tagFrames = frames.slice(from, to + 1);

        if (tagFrames.length > 0) {
          animations.push({
            id: `anim_tag_${timestamp}_${idx}`,
            name: tag.name || `tag_${idx + 1}`,
            fps: 10,
            loop: tag.direction !== 'pingpong' ? true : false,
            frameIds: tagFrames.map(f => f.id)
          });
        }
      });
    }

    // Otherwise group by alias / name prefixes (e.g. "run_down_0", "run_down_1" -> "run_down")
    if (animations.length === 0) {
      const prefixMap = new Map();
      frames.forEach(frame => {
        // Strip trailing digits, underscores, dashes
        const match = frame.name.match(/^([a-zA-Z0-9_-]+?)[-_ ]*(?:\d+)?(?:\.[a-zA-Z]+)?$/);
        const base = match && match[1] && match[1].length > 1 ? match[1] : null;
        const key = base || 'animation';
        if (!prefixMap.has(key)) prefixMap.set(key, []);
        prefixMap.get(key).push(frame.id);
      });

      // If we found meaningful multi-frame groups
      let animIndex = 0;
      prefixMap.forEach((ids, groupName) => {
        if (ids.length >= 2 || prefixMap.size === 1) {
          animations.push({
            id: `anim_group_${timestamp}_${animIndex++}`,
            name: groupName,
            fps: 10,
            loop: true,
            frameIds: ids
          });
        }
      });

      // Fallback: If no groups, create one default animation
      if (animations.length === 0) {
        animations.push({
          id: `anim_default_${timestamp}`,
          name: 'All Frames',
          fps: 10,
          loop: true,
          frameIds: frames.map(f => f.id)
        });
      }
    }

    return {
      success: true,
      format,
      imageName,
      imageDimensions,
      frames,
      animations,
      rawMeta: data.meta || null
    };
  } catch (err) {
    return {
      success: false,
      error: `JSON Syntax Error: ${err.message}`
    };
  }
}

// Sample Atlas JSON for instant testing & demonstration
export const SAMPLE_ATLAS_JSON = {
  meta: {
    app: "G.R.I.D. (Graphics Rendering for Independent Developers)",
    version: "1.0",
    image: "fox_run.png",
    format: "RGBA8888",
    size: { w: 288, h: 128 },
    scale: "1",
    frameTags: [
      { name: "run_down", from: 0, to: 5, direction: "forward" },
      { name: "run_up", from: 6, to: 11, direction: "forward" },
      { name: "run_right", from: 12, to: 17, direction: "forward" },
      { name: "run_left", from: 18, to: 23, direction: "forward" }
    ]
  },
  frames: {
    "run_down_0": { "frame": { "x": 0, "y": 0, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_down_1": { "frame": { "x": 48, "y": 0, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_down_2": { "frame": { "x": 96, "y": 0, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_down_3": { "frame": { "x": 144, "y": 0, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_down_4": { "frame": { "x": 192, "y": 0, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_down_5": { "frame": { "x": 240, "y": 0, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_up_0": { "frame": { "x": 0, "y": 32, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_up_1": { "frame": { "x": 48, "y": 32, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_up_2": { "frame": { "x": 96, "y": 32, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_up_3": { "frame": { "x": 144, "y": 32, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_up_4": { "frame": { "x": 192, "y": 32, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_up_5": { "frame": { "x": 240, "y": 32, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_right_0": { "frame": { "x": 0, "y": 64, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_right_1": { "frame": { "x": 48, "y": 64, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_right_2": { "frame": { "x": 96, "y": 64, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_right_3": { "frame": { "x": 144, "y": 64, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_right_4": { "frame": { "x": 192, "y": 64, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_right_5": { "frame": { "x": 240, "y": 64, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_left_0": { "frame": { "x": 0, "y": 96, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_left_1": { "frame": { "x": 48, "y": 96, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_left_2": { "frame": { "x": 96, "y": 96, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_left_3": { "frame": { "x": 144, "y": 96, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_left_4": { "frame": { "x": 192, "y": 96, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } },
    "run_left_5": { "frame": { "x": 240, "y": 96, "w": 48, "h": 32 }, "pivot": { "x": 0.5, "y": 0.8 } }
  }
};
