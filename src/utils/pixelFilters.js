// Core Pixel Art & Graphics Transformation Filters Engine

// Retro Palettes
export const PALETTES = {
  pico8: {
    id: 'pico8',
    name: 'PICO-8 (16 Colors)',
    colors: [
      [0, 0, 0], [29, 43, 83], [126, 37, 83], [0, 135, 81],
      [171, 82, 54], [95, 87, 79], [194, 195, 199], [255, 241, 232],
      [255, 0, 77], [255, 163, 0], [255, 236, 39], [0, 228, 54],
      [41, 173, 255], [131, 118, 156], [255, 119, 168], [255, 204, 170]
    ]
  },
  gameboy: {
    id: 'gameboy',
    name: 'GameBoy Classic (4 Shades)',
    colors: [
      [15, 56, 15],
      [48, 98, 48],
      [139, 172, 15],
      [155, 188, 15]
    ]
  },
  nes: {
    id: 'nes',
    name: 'NES Retro (16 Curated)',
    colors: [
      [0, 0, 0], [252, 252, 252], [116, 116, 116], [36, 24, 140],
      [0, 116, 180], [32, 56, 236], [0, 168, 0], [0, 148, 0],
      [216, 40, 0], [248, 56, 0], [252, 152, 56], [248, 184, 0],
      [184, 248, 24], [0, 232, 216], [248, 120, 248], [104, 68, 252]
    ]
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon (8 Colors)',
    colors: [
      [13, 2, 33], [247, 6, 207], [254, 231, 21], [0, 240, 255],
      [113, 31, 156], [255, 42, 109], [5, 217, 232], [255, 255, 255]
    ]
  },
  monochrome: {
    id: 'monochrome',
    name: 'Monochrome (8 Grayscale)',
    colors: [
      [0, 0, 0], [36, 36, 36], [73, 73, 73], [109, 109, 109],
      [146, 146, 146], [182, 182, 182], [219, 219, 219], [255, 255, 255]
    ]
  }
};

// Bayer 4x4 Matrix for ordered dithering
const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

// Bayer 8x8 Matrix
const BAYER_8X8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21]
];

// Find nearest color in given palette
export function findNearestColor(r, g, b, paletteColors) {
  let minDist = Infinity;
  let nearest = paletteColors[0];

  for (let i = 0; i < paletteColors.length; i++) {
    const pr = paletteColors[i][0];
    const pg = paletteColors[i][1];
    const pb = paletteColors[i][2];
    // Weighted Euclidean distance for human perception
    const dist = (r - pr) ** 2 * 0.3 + (g - pg) ** 2 * 0.59 + (b - pb) ** 2 * 0.11;
    if (dist < minDist) {
      minDist = dist;
      nearest = paletteColors[i];
    }
  }
  return nearest;
}

// 1. Pixelation Downscaler & Block Averager
export function applyPixelation(ctx, width, height, pixelSize) {
  if (pixelSize <= 1) return;

  const originalData = ctx.getImageData(0, 0, width, height);
  const data = originalData.data;

  // Process blocks
  for (let y = 0; y < height; y += pixelSize) {
    for (let x = 0; x < width; x += pixelSize) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
      let count = 0;

      const maxX = Math.min(x + pixelSize, width);
      const maxY = Math.min(y + pixelSize, height);

      for (let by = y; by < maxY; by++) {
        for (let bx = x; bx < maxX; bx++) {
          const idx = (by * width + bx) * 4;
          const alpha = data[idx + 3];
          if (alpha > 10) {
            rSum += data[idx];
            gSum += data[idx + 1];
            bSum += data[idx + 2];
            aSum += alpha;
            count++;
          }
        }
      }

      const avgR = count > 0 ? Math.round(rSum / count) : 0;
      const avgG = count > 0 ? Math.round(gSum / count) : 0;
      const avgB = count > 0 ? Math.round(bSum / count) : 0;
      const avgA = count > 0 ? Math.round(aSum / count) : 0;

      // Fill block
      for (let by = y; by < maxY; by++) {
        for (let bx = x; bx < maxX; bx++) {
          const idx = (by * width + bx) * 4;
          if (avgA < 20) {
            data[idx + 3] = 0;
          } else {
            data[idx] = avgR;
            data[idx + 1] = avgG;
            data[idx + 2] = avgB;
            data[idx + 3] = avgA > 128 ? 255 : avgA;
          }
        }
      }
    }
  }

  ctx.putImageData(originalData, 0, 0);
}

// 2. Dithering & Palette Quantization
export function applyPaletteAndDithering(ctx, width, height, paletteId, ditherMethod = 'none') {
  if (!paletteId || !PALETTES[paletteId]) return;

  const palette = PALETTES[paletteId].colors;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  if (ditherMethod === 'floyd-steinberg') {
    // Floyd-Steinberg error diffusion
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] < 50) continue;

        const oldR = data[idx];
        const oldG = data[idx + 1];
        const oldB = data[idx + 2];

        const [newR, newG, newB] = findNearestColor(oldR, oldG, oldB, palette);
        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;

        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;

        const distribute = (targetX, targetY, factor) => {
          if (targetX < 0 || targetX >= width || targetY < 0 || targetY >= height) return;
          const tidx = (targetY * width + targetX) * 4;
          if (data[tidx + 3] < 50) return;
          data[tidx] = Math.max(0, Math.min(255, data[tidx] + errR * factor));
          data[tidx + 1] = Math.max(0, Math.min(255, data[tidx + 1] + errG * factor));
          data[tidx + 2] = Math.max(0, Math.min(255, data[tidx + 2] + errB * factor));
        };

        distribute(x + 1, y, 7 / 16);
        distribute(x - 1, y + 1, 3 / 16);
        distribute(x, y + 1, 5 / 16);
        distribute(x + 1, y + 1, 1 / 16);
      }
    }
  } else if (ditherMethod === 'bayer4' || ditherMethod === 'bayer8') {
    const is8 = ditherMethod === 'bayer8';
    const matrix = is8 ? BAYER_8X8 : BAYER_4X4;
    const mSize = is8 ? 8 : 4;
    const scale = is8 ? (1 / 64 - 0.5) * 48 : (1 / 16 - 0.5) * 48;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] < 50) continue;

        const threshold = matrix[y % mSize][x % mSize] * scale;
        const r = Math.max(0, Math.min(255, data[idx] + threshold));
        const g = Math.max(0, Math.min(255, data[idx + 1] + threshold));
        const b = Math.max(0, Math.min(255, data[idx + 2] + threshold));

        const [newR, newG, newB] = findNearestColor(r, g, b, palette);
        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;
      }
    }
  } else {
    // Direct Palette Quantization (no dithering)
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 50) continue;
      const [newR, newG, newB] = findNearestColor(data[i], data[i + 1], data[i + 2], palette);
      data[i] = newR;
      data[i + 1] = newG;
      data[i + 2] = newB;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// 3. Pixel Art Outline Generator (1-Pixel border around opaque pixels)
export function applyPixelOutline(ctx, width, height, outlineColor = [15, 23, 42, 255]) {
  const originalData = ctx.getImageData(0, 0, width, height);
  const src = originalData.data;
  const output = ctx.createImageData(width, height);
  const dst = output.data;

  // Copy original data first
  for (let i = 0; i < src.length; i++) {
    dst[i] = src[i];
  }

  const isOpaque = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return src[(y * width + x) * 4 + 3] > 40;
  };

  // Check 4-neighborhood for outline insertion
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // If transparent pixel has at least one opaque neighbor
      if (src[idx + 3] <= 40) {
        if (isOpaque(x + 1, y) || isOpaque(x - 1, y) || isOpaque(x, y + 1) || isOpaque(x, y - 1)) {
          dst[idx] = outlineColor[0];
          dst[idx + 1] = outlineColor[1];
          dst[idx + 2] = outlineColor[2];
          dst[idx + 3] = outlineColor[3] || 255;
        }
      }
    }
  }

  ctx.putImageData(output, 0, 0);
}

// 4. Color Adjustments (Brightness, Contrast, Saturation)
export function applyAdjustments(ctx, width, height, { brightness = 0, contrast = 0, saturation = 0 }) {
  if (brightness === 0 && contrast === 0 && saturation === 0) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const bFactor = brightness * 255;
  const cFactor = (contrast + 100) / 100;
  const sFactor = (saturation + 100) / 100;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) continue;

    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Brightness
    r += bFactor;
    g += bFactor;
    b += bFactor;

    // Contrast
    r = ((r / 255 - 0.5) * cFactor + 0.5) * 255;
    g = ((g / 255 - 0.5) * cFactor + 0.5) * 255;
    b = ((b / 255 - 0.5) * cFactor + 0.5) * 255;

    // Saturation
    const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
    r = gray + (r - gray) * sFactor;
    g = gray + (g - gray) * sFactor;
    b = gray + (b - gray) * sFactor;

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  ctx.putImageData(imgData, 0, 0);
}
