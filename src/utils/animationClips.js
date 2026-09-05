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

export function generateDefaultAnimations(frames = []) {
  if (!frames || frames.length === 0) {
    return [createNewAnimation('default', [], 10, true)];
  }

  const allFrameIds = frames.map(f => f.id);

  // 1. Fox Run / 24 frames preset (4 rows of 6: Down, Up, Right, Left)
  if (frames.length === 24) {
    return [
      {
        id: 'anim_run_down',
        name: 'run_down',
        fps: 10,
        loop: true,
        frameIds: frames.slice(0, 6).map(f => f.id)
      },
      {
        id: 'anim_run_up',
        name: 'run_up',
        fps: 10,
        loop: true,
        frameIds: frames.slice(6, 12).map(f => f.id)
      },
      {
        id: 'anim_run_right',
        name: 'run_right',
        fps: 10,
        loop: true,
        frameIds: frames.slice(12, 18).map(f => f.id)
      },
      {
        id: 'anim_run_left',
        name: 'run_left',
        fps: 10,
        loop: true,
        frameIds: frames.slice(18, 24).map(f => f.id)
      },
      {
        id: 'anim_default',
        name: 'default',
        fps: 10,
        loop: true,
        frameIds: allFrameIds
      }
    ];
  }

  // 2. 16 frames preset (4 rows of 4: Idle Down, Up, Right, Left)
  if (frames.length === 16) {
    return [
      {
        id: 'anim_idle_down',
        name: 'idle_down',
        fps: 8,
        loop: true,
        frameIds: frames.slice(0, 4).map(f => f.id)
      },
      {
        id: 'anim_idle_up',
        name: 'idle_up',
        fps: 8,
        loop: true,
        frameIds: frames.slice(4, 8).map(f => f.id)
      },
      {
        id: 'anim_idle_right',
        name: 'idle_right',
        fps: 8,
        loop: true,
        frameIds: frames.slice(8, 12).map(f => f.id)
      },
      {
        id: 'anim_idle_left',
        name: 'idle_left',
        fps: 8,
        loop: true,
        frameIds: frames.slice(12, 16).map(f => f.id)
      },
      {
        id: 'anim_default',
        name: 'default',
        fps: 8,
        loop: true,
        frameIds: allFrameIds
      }
    ];
  }

  // 3. Generic grid with multiple rows
  if (frames.length > 6) {
    const chunkSize = frames.length % 6 === 0 ? 6 : (frames.length % 4 === 0 ? 4 : 8);
    const result = [];
    for (let i = 0; i < frames.length; i += chunkSize) {
      const rowNum = Math.floor(i / chunkSize) + 1;
      const end = Math.min(i + chunkSize, frames.length);
      result.push({
        id: `anim_row_${rowNum}`,
        name: `row_${rowNum}`,
        fps: 10,
        loop: true,
        frameIds: frames.slice(i, end).map(f => f.id)
      });
    }
    result.push({
      id: 'anim_default',
      name: 'default',
      fps: 10,
      loop: true,
      frameIds: allFrameIds
    });
    return result;
  }

  // Fallback single animation containing all frames
  return [
    {
      id: 'anim_default',
      name: 'default',
      fps: 10,
      loop: true,
      frameIds: allFrameIds
    }
  ];
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
