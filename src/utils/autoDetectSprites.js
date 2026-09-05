// Utility to auto-detect transparent alpha cluster bounding boxes on an image

export function autoDetectSprites(imageElement, alphaThreshold = 10, padding = 1) {
  const canvas = document.createElement('canvas');
  const width = imageElement.naturalWidth || imageElement.width;
  const height = imageElement.naturalHeight || imageElement.height;

  if (width <= 0 || height <= 0) return [];

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageElement, 0, 0);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const visited = new Uint8Array(width * height);
  const boxes = [];

  // Helper to get alpha value at (x,y)
  const getAlpha = (x, y) => data[(y * width + x) * 4 + 3];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;
      visited[idx] = 1;

      if (getAlpha(x, y) > alphaThreshold) {
        // Flood fill / BFS to find contiguous sprite area
        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;

        const queue = [[x, y]];

        while (queue.length > 0) {
          const [cx, cy] = queue.pop();

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          // Check 4-connected neighbors
          const neighbors = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1]
          ];

          for (let i = 0; i < neighbors.length; i++) {
            const [nx, ny] = neighbors[i];
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              if (!visited[nIdx]) {
                visited[nIdx] = 1;
                if (getAlpha(nx, ny) > alphaThreshold) {
                  queue.push([nx, ny]);
                }
              }
            }
          }
        }

        // Apply padding & bounds check
        const paddedMinX = Math.max(0, minX - padding);
        const paddedMinY = Math.max(0, minY - padding);
        const paddedMaxX = Math.min(width - 1, maxX + padding);
        const paddedMaxY = Math.min(height - 1, maxY + padding);

        const boxWidth = paddedMaxX - paddedMinX + 1;
        const boxHeight = paddedMaxY - paddedMinY + 1;

        // Ignore tiny noise pixels (smaller than 6x6)
        if (boxWidth >= 6 && boxHeight >= 6) {
          boxes.push({
            x: paddedMinX,
            y: paddedMinY,
            w: boxWidth,
            h: boxHeight
          });
        }
      }
    }
  }

  // Group boxes into visual rows, sort rows top-to-bottom, and sort each row left-to-right
  return groupBoxesByRow(boxes).flat();
}

// Group bounding boxes into rows based on vertical proximity and median height
export function groupBoxesByRow(boxes = []) {
  if (!boxes || boxes.length === 0) return [];
  if (boxes.length === 1) return [[boxes[0]]];

  const heights = boxes.map(b => b.h).sort((a, b) => a - b);
  const medianH = heights[Math.floor(heights.length / 2)] || 32;

  // Sort boxes primarily by vertical center
  const sorted = [...boxes].sort((a, b) => {
    const cyA = a.y + a.h / 2;
    const cyB = b.y + b.h / 2;
    return cyA - cyB;
  });

  const rows = [];
  const yTolerance = Math.max(6, medianH * 0.45);

  for (const box of sorted) {
    const boxCy = box.y + box.h / 2;
    let matchedRow = null;

    for (const row of rows) {
      const rowAvgCy = row.reduce((sum, b) => sum + (b.y + b.h / 2), 0) / row.length;
      if (Math.abs(boxCy - rowAvgCy) <= yTolerance) {
        matchedRow = row;
        break;
      }
    }

    if (matchedRow) {
      matchedRow.push(box);
    } else {
      rows.push([box]);
    }
  }

  // Sort rows top-to-bottom by average Y
  rows.sort((rA, rB) => {
    const avgYA = rA.reduce((sum, b) => sum + b.y, 0) / rA.length;
    const avgYB = rB.reduce((sum, b) => sum + b.y, 0) / rB.length;
    return avgYA - avgYB;
  });

  // Sort each row left-to-right by X
  rows.forEach(row => {
    row.sort((a, b) => a.x - b.x);
  });

  return rows;
}
