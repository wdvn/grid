// Utility to generate and load sample sprite sheets for quick testing

export function createFoxSpritePreset(type = 'fox_run') {
  if (type === 'fox_run') {
    // 192x128 sprite sheet (6 cols x 4 rows, 32x32 each)
    // Row 0: Run Down, Row 1: Run Up, Row 2: Run Right, Row 3: Run Left
    const frames = [];
    const dirNames = ['down', 'up', 'right', 'left'];

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        const frameNum = r * 6 + c + 1;
        frames.push({
          id: `fox_run_${frameNum}`,
          name: `fox_run_${dirNames[r]}_${c + 1}`,
          x: c * 32,
          y: r * 32,
          w: 32,
          h: 32,
          pivotX: 0.5,
          pivotY: 0.85,
          row: r,
          direction: dirNames[r]
        });
      }
    }

    return {
      dataUrl: '/assets/Fox_Run.png',
      name: 'Fox Run (192×128)',
      defaultWidth: 32,
      defaultHeight: 32,
      count: 24,
      initialFrames: frames,
      animations: [
        { name: 'All (24 frames)', startIndex: 0, endIndex: 23 },
        { name: 'Run Down (South)', startIndex: 0, endIndex: 5 },
        { name: 'Run Up (North)', startIndex: 6, endIndex: 11 },
        { name: 'Run Right (East)', startIndex: 12, endIndex: 17 },
        { name: 'Run Left (West)', startIndex: 18, endIndex: 23 },
      ]
    };
  }

  if (type === 'fox_walk') {
    const frames = [];
    const dirNames = ['down', 'up', 'right', 'left'];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        const frameNum = r * 6 + c + 1;
        frames.push({
          id: `fox_walk_${frameNum}`,
          name: `fox_walk_${dirNames[r]}_${c + 1}`,
          x: c * 32,
          y: r * 32,
          w: 32,
          h: 32,
          pivotX: 0.5,
          pivotY: 0.85,
          row: r,
          direction: dirNames[r]
        });
      }
    }
    return {
      dataUrl: '/assets/Fox_walk.png',
      name: 'Fox Walk (192×128)',
      defaultWidth: 32,
      defaultHeight: 32,
      count: 24,
      initialFrames: frames
    };
  }

  if (type === 'fox_idle') {
    // 128x128 (4 cols x 4 rows of 32x32)
    const frames = [];
    const dirNames = ['down', 'up', 'right', 'left'];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const frameNum = r * 4 + c + 1;
        frames.push({
          id: `fox_idle_${frameNum}`,
          name: `fox_idle_${dirNames[r]}_${c + 1}`,
          x: c * 32,
          y: r * 32,
          w: 32,
          h: 32,
          pivotX: 0.5,
          pivotY: 0.85,
          row: r,
          direction: dirNames[r]
        });
      }
    }
    return {
      dataUrl: '/assets/Fox_Idle.png',
      name: 'Fox Idle (128×128)',
      defaultWidth: 32,
      defaultHeight: 32,
      count: 16,
      initialFrames: frames
    };
  }

  return createFoxSpritePreset('fox_run');
}

export function createSampleSpriteSheet(type = 'pixel_hero') {
  if (type.startsWith('fox_')) {
    return createFoxSpritePreset(type);
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (type === 'pixel_hero') {
    // 6 frames of a running character, each 32x32, total 192x32
    canvas.width = 192;
    canvas.height = 32;

    const frameWidth = 32;
    const legOffsets = [
      { l1: -4, l2: 4, y: 0, arm: -3 },
      { l1: -2, l2: 2, y: -1, arm: -1 },
      { l1: 0, l2: 0, y: -2, arm: 0 },
      { l1: 4, l2: -4, y: 0, arm: 3 },
      { l1: 2, l2: -2, y: -1, arm: 1 },
      { l1: 0, l2: 0, y: -2, arm: 0 },
    ];

    legOffsets.forEach((anim, i) => {
      const cx = i * frameWidth + 16;
      const cy = 16 + anim.y;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(cx, 28, 7, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Back leg
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 3 + anim.l2, cy + 4, 3, 7);

      // Body
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(cx - 5, cy - 4, 10, 9);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(cx - 3, cy - 3, 6, 7);

      // Front leg
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx - 1 + anim.l1, cy + 4, 3, 7);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(cx - 1 + anim.l1, cy + 9, 4, 2);

      // Head / Helmet
      ctx.fillStyle = '#f87171';
      ctx.fillRect(cx - 4, cy - 11, 8, 4);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(cx - 4, cy - 7, 8, 3);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 2, cy - 6, 5, 2);

      // Sword / Arm
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(cx + anim.arm + 3, cy - 6, 2, 10);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(cx + anim.arm + 1, cy + 2, 6, 2);
    });

    const initialFrames = [];
    for (let i = 0; i < 6; i++) {
      initialFrames.push({
        id: `hero_f${i + 1}`,
        name: `hero_run_${i + 1}`,
        x: i * 32,
        y: 0,
        w: 32,
        h: 32,
        pivotX: 0.5,
        pivotY: 0.85
      });
    }

    return {
      dataUrl: canvas.toDataURL(),
      name: 'Pixel Hero Run (192×32)',
      defaultWidth: 32,
      defaultHeight: 32,
      count: 6,
      initialFrames
    };
  }

  if (type === 'coin_spin') {
    canvas.width = 256;
    canvas.height = 32;

    const widths = [14, 11, 7, 3, 7, 11, 14, 16];

    widths.forEach((w, i) => {
      const cx = i * 32 + 16;
      const cy = 16;

      const radGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 14);
      radGrad.addColorStop(0, 'rgba(251, 191, 36, 0.4)');
      radGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(1, w / 2 - 2), 10, 0, 0, Math.PI * 2);
      ctx.fill();

      if (w > 6) {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(cx - Math.max(1, w / 6), cy - 5, Math.max(2, w / 3), 10);
      }
    });

    const initialFrames = [];
    for (let i = 0; i < 8; i++) {
      initialFrames.push({
        id: `coin_f${i + 1}`,
        name: `coin_${i + 1}`,
        x: i * 32,
        y: 0,
        w: 32,
        h: 32,
        pivotX: 0.5,
        pivotY: 0.5
      });
    }

    return {
      dataUrl: canvas.toDataURL(),
      name: 'Spinning Gold Coin (256×32)',
      defaultWidth: 32,
      defaultHeight: 32,
      count: 8,
      initialFrames
    };
  }

  // Energy Orb
  canvas.width = 160;
  canvas.height = 32;
  const scales = [10, 12, 14, 13, 11];

  scales.forEach((r, i) => {
    const cx = i * 32 + 16;
    const cy = 16;

    ctx.fillStyle = i % 2 === 0 ? '#ef4444' : '#f97316';
    ctx.beginPath();
    ctx.arc(cx - 3, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  });

  const initialFrames = [];
  for (let i = 0; i < 5; i++) {
    initialFrames.push({
      id: `orb_f${i + 1}`,
      name: `orb_${i + 1}`,
      x: i * 32,
      y: 0,
      w: 32,
      h: 32,
      pivotX: 0.5,
      pivotY: 0.5
    });
  }

  return {
    dataUrl: canvas.toDataURL(),
    name: 'Energy Orb Blast (160×32)',
    defaultWidth: 32,
    defaultHeight: 32,
    count: 5,
    initialFrames
  };
}
