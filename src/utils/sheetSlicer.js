// Utility for analyzing and slicing sprite sheets into frames

/**
 * Intelligent Grid & Frame Detection for Sprite Sheets
 * Supports:
 * 1. Horizontal / Vertical strips (W % H == 0)
 * 2. Standard grid divisions (16, 24, 32, 48, 64, 80, 96, 128, 140, 160, 240, 256, 280, 320 px)
 * 3. Greatest Common Divisor (GCD) for square / proportional tiles
 * 4. Transparent alpha cluster checks
 */
export function detectBestSheetGrid(imgElement) {
  const w = imgElement.naturalWidth || imgElement.width;
  const h = imgElement.naturalHeight || imgElement.height;

  if (!w || !h) {
    return {
      cols: 1,
      rows: 1,
      cellW: 96,
      cellH: 96,
      totalFrames: 1,
      isSheet: false,
      candidates: []
    };
  }

  // Single sprite detection
  if (w <= 128 && h <= 128 && Math.abs(w - h) <= 4) {
    return {
      cols: 1,
      rows: 1,
      cellW: w,
      cellH: h,
      totalFrames: 1,
      isSheet: false,
      candidates: [{ cols: 1, rows: 1, cellW: w, cellH: h, score: 100, label: 'Single Sprite' }]
    };
  }

  const candidates = [];

  // 1. Check if Horizontal Strip (e.g. 384x96 -> 4 frames of 96x96)
  if (w > h && w % h === 0) {
    const cols = w / h;
    if (cols >= 2 && cols <= 64) {
      candidates.push({
        cols,
        rows: 1,
        cellW: h,
        cellH: h,
        score: 110,
        label: `Horizontal Strip (${cols} frames of ${h}×${h} px)`
      });
    }
  }

  // 2. Check if Vertical Strip (e.g. 96x384 -> 4 frames of 96x96)
  if (h > w && h % w === 0) {
    const rows = h / w;
    if (rows >= 2 && rows <= 64) {
      candidates.push({
        cols: 1,
        rows,
        cellW: w,
        cellH: w,
        score: 105,
        label: `Vertical Strip (${rows} frames of ${w}×${w} px)`
      });
    }
  }

  // 3. Check standard square cell sizes
  const standardTileSizes = [
    16, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 96, 112, 128, 140, 160, 192, 240, 256, 280, 320, 384, 512
  ];

  for (const sz of standardTileSizes) {
    if (w % sz === 0 && h % sz === 0) {
      const cols = w / sz;
      const rows = h / sz;
      const total = cols * rows;

      if (total >= 2 && total <= 128) {
        let score = 85 - total * 0.35;
        // Boost typical animation column/row patterns
        if ([3, 4, 6, 8, 10, 12, 16].includes(cols)) score += 12;
        if ([1, 2, 4, 8].includes(rows)) score += 12;
        if (sz >= 32 && sz <= 320) score += 8;

        candidates.push({
          cols,
          rows,
          cellW: sz,
          cellH: sz,
          score,
          label: `Grid ${cols}×${rows} (${sz}×${sz} px, ${total} frames)`
        });
      }
    }
  }

  // 4. Check GCD
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(w, h);
  if (g >= 16) {
    const cols = w / g;
    const rows = h / g;
    const total = cols * rows;
    if (total >= 2 && total <= 128 && !candidates.some(c => c.cellW === g && c.cellH === g)) {
      candidates.push({
        cols,
        rows,
        cellW: g,
        cellH: g,
        score: 70,
        label: `GCD Grid ${cols}×${rows} (${g}×${g} px)`
      });
    }
  }

  // Sort candidates by score
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length > 0) {
    const best = candidates[0];
    return {
      cols: best.cols,
      rows: best.rows,
      cellW: best.cellW,
      cellH: best.cellH,
      totalFrames: best.cols * best.rows,
      isSheet: true,
      candidates
    };
  }

  // Fallback: estimate 4 columns if wide or default 96x96
  const fallbackCols = w >= 256 ? 4 : 1;
  const fallbackRows = h >= 256 ? Math.floor(h / (w / fallbackCols)) || 1 : 1;
  const cellW = Math.max(16, Math.floor(w / fallbackCols));
  const cellH = Math.max(16, Math.floor(h / fallbackRows));

  return {
    cols: fallbackCols,
    rows: fallbackRows,
    cellW,
    cellH,
    totalFrames: fallbackCols * fallbackRows,
    isSheet: fallbackCols * fallbackRows > 1,
    candidates: []
  };
}

/**
 * Check if a canvas has any non-transparent pixels (alpha > threshold)
 */
export function isCanvasNonEmpty(canvas, alphaThreshold = 10) {
  if (!canvas || canvas.width === 0 || canvas.height === 0) return false;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > alphaThreshold) return true;
  }
  return false;
}

/**
 * Slice an image element into an array of frame canvases
 */
export function sliceImageIntoFrames(imgElement, options = {}) {
  const {
    cols = 1,
    rows = 1,
    cellW = imgElement.naturalWidth || imgElement.width,
    cellH = imgElement.naturalHeight || imgElement.height,
    offsetX = 0,
    offsetY = 0,
    spacingX = 0,
    spacingY = 0,
    skipEmpty = true,
    targetW = null,
    targetH = null
  } = options;

  const imgW = imgElement.naturalWidth || imgElement.width;
  const imgH = imgElement.naturalHeight || imgElement.height;

  const finalW = targetW || cellW;
  const finalH = targetH || cellH;

  const frames = [];
  let frameCount = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = offsetX + c * (cellW + spacingX);
      const sy = offsetY + r * (cellH + spacingY);

      if (sx + cellW <= imgW && sy + cellH <= imgH) {
        // Create frame canvas
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = finalW;
        frameCanvas.height = finalH;
        const ctx = frameCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Draw cropped section
        ctx.drawImage(
          imgElement,
          sx, sy, cellW, cellH,
          0, 0, finalW, finalH
        );

        // Check if empty
        if (skipEmpty && !isCanvasNonEmpty(frameCanvas)) {
          continue; // Skip transparent blank cell
        }

        frameCount++;
        frames.push({
          id: `frame_${Date.now()}_${frameCount}`,
          canvas: frameCanvas,
          sliceInfo: {
            col: c,
            row: r,
            x: sx,
            y: sy,
            w: cellW,
            h: cellH
          }
        });
      }
    }
  }

  // Fallback if all were skipped (e.g. empty sheet)
  if (frames.length === 0) {
    const singleCanvas = document.createElement('canvas');
    singleCanvas.width = finalW;
    singleCanvas.height = finalH;
    const ctx = singleCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(imgElement, 0, 0, imgW, imgH, 0, 0, finalW, finalH);
    frames.push({
      id: `frame_${Date.now()}_1`,
      canvas: singleCanvas,
      sliceInfo: { col: 0, row: 0, x: 0, y: 0, w: imgW, h: imgH }
    });
  }

  return frames;
}
