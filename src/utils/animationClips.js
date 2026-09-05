// Animation Clips Management for Godot SpriteFrames Dock

export function createNewAnimation(name, frameIds = [], fps = 10, loop = true) {
  return {
    id: `anim_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    name: name || 'new_animation',
    fps: fps || 10,
    loop: loop !== undefined ? loop : true,
    frameIds: Array.isArray(frameIds) ? frameIds : []
  };
}

// Group frame objects into rows by their y & h positions
export function groupFramesByRows(frames = []) {
  if (!frames || frames.length === 0) return [];
  if (frames.length === 1) return [[frames[0]]];

  // Calculate median frame height for adaptive clustering
  const heights = frames.map(f => f.h || 32).sort((a, b) => a - b);
  const medianH = heights[Math.floor(heights.length / 2)] || 32;

  // Sort primarily by vertical center
  const sorted = [...frames].sort((a, b) => {
    const cyA = (a.y ?? 0) + (a.h || medianH) / 2;
    const cyB = (b.y ?? 0) + (b.h || medianH) / 2;
    return cyA - cyB;
  });

  const rows = [];
  const yTolerance = Math.max(6, medianH * 0.45);

  for (const frame of sorted) {
    const frameCy = (frame.y ?? 0) + (frame.h || medianH) / 2;
    let matchedRow = null;

    for (const row of rows) {
      const rowAvgCy = row.reduce((sum, f) => sum + ((f.y ?? 0) + (f.h || medianH) / 2), 0) / row.length;
      if (Math.abs(frameCy - rowAvgCy) <= yTolerance) {
        matchedRow = row;
        break;
      }
    }

    if (matchedRow) {
      matchedRow.push(frame);
    } else {
      rows.push([frame]);
    }
  }

  // Sort rows top-to-bottom by average Y
  rows.sort((rA, rB) => {
    const avgYA = rA.reduce((sum, f) => sum + (f.y ?? 0), 0) / rA.length;
    const avgYB = rB.reduce((sum, f) => sum + (f.y ?? 0), 0) / rB.length;
    return avgYA - avgYB;
  });

  // Sort each row left-to-right by X
  rows.forEach(row => {
    row.sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
  });

  return rows;
}

export function generateDefaultAnimations(frames = []) {
  if (!frames || frames.length === 0) {
    return [createNewAnimation('default', [], 10, true)];
  }

  const allFrameIds = frames.map(f => f.id);
  const rows = groupFramesByRows(frames);

  // If there are exactly 4 rows (standard 4-directional locomotion pattern: Down, Up, Right, Left)
  if (rows.length === 4) {
    const dirNames = ['run_down', 'run_up', 'run_right', 'run_left'];
    const dirIds = ['anim_run_down', 'anim_run_up', 'anim_run_right', 'anim_run_left'];

    const result = rows.map((row, idx) => ({
      id: dirIds[idx],
      name: dirNames[idx],
      fps: 10,
      loop: true,
      frameIds: row.map(f => f.id)
    }));

    result.push({
      id: 'anim_default',
      name: 'default',
      fps: 10,
      loop: true,
      frameIds: allFrameIds
    });

    return result;
  }

  // Multi-row sprite sheets: always group strictly by physical rows
  const result = rows.map((row, idx) => ({
    id: `anim_row_${idx + 1}`,
    name: `row_${idx + 1}`,
    fps: 10,
    loop: true,
    frameIds: row.map(f => f.id)
  }));

  // Always include 'default' animation containing all frames
  result.push({
    id: 'anim_default',
    name: 'default',
    fps: 10,
    loop: true,
    frameIds: allFrameIds
  });

  return result;
}

// Resolve frame objects in order for a given animation
export function resolveAnimationFrames(animation, allFrames = []) {
  if (!animation || !animation.frameIds || animation.frameIds.length === 0) {
    return [];
  }
  const frameMap = new Map(allFrames.map(f => [f.id, f]));
  return animation.frameIds
    .map(id => frameMap.get(id))
    .filter(Boolean);
}
