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

  // Sort boxes from left-to-right, top-to-bottom logically by row
  boxes.sort((a, b) => {
    const rowDiff = Math.floor(a.y / 60) - Math.floor(b.y / 60);
    if (rowDiff !== 0) return rowDiff;
    return a.x - b.x;
  });

  return boxes;
}
