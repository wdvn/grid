import JSZip from 'jszip';

// Export frame atlas to JSON (Phaser 3 / Unity style)
export function generateAtlasJSON(imageName, imageDimensions, frames) {
  const atlas = {
    meta: {
      app: "Sprite Sheet Slicer Studio",
      version: "1.0",
      image: imageName || "spritesheet.png",
      format: "RGBA8888",
      size: { w: imageDimensions.width, h: imageDimensions.height },
      scale: "1"
    },
    frames: {}
  };

  frames.forEach((frame, index) => {
    const key = frame.name || `frame_${index}`;
    atlas.frames[key] = {
      frame: { x: frame.x, y: frame.y, w: frame.w, h: frame.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: frame.w, h: frame.h },
      sourceSize: { w: frame.w, h: frame.h },
      pivot: { x: frame.pivotX ?? 0.5, y: frame.pivotY ?? 0.5 }
    };
  });

  return JSON.stringify(atlas, null, 2);
}

// Extract canvas blob for a single frame
export function getFrameCanvas(imageElement, frame) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, frame.w);
  canvas.height = Math.max(1, frame.h);

  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    imageElement,
    frame.x, frame.y, frame.w, frame.h,
    0, 0, frame.w, frame.h
  );

  return canvas;
}

// Download Sliced Frames as ZIP archive
export async function downloadFramesZip(imageElement, frames, baseName = 'sprite_frames') {
  const zip = new JSZip();
  const folder = zip.folder(baseName);

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const canvas = getFrameCanvas(imageElement, frame);
    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    const fileName = `${frame.name || `frame_${String(i).padStart(3, '0')}`}.png`;
    folder.file(fileName, base64Data, { base64: true });
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${baseName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Download text or JSON file
export function downloadFile(content, fileName, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
