import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { FrameProperties } from './components/FrameProperties';
import { AnimationPreview } from './components/AnimationPreview';
import { FrameTimeline } from './components/FrameTimeline';
import { QuickGridModal } from './components/QuickGridModal';
import { ExportModal } from './components/ExportModal';
import { ImportAtlasModal } from './components/ImportAtlasModal';

import { createSampleSpriteSheet, createFoxSpritePreset, createFullFoxCharacterSuite } from './utils/sampleSprites';
import { autoDetectSprites } from './utils/autoDetectSprites';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { generateDefaultAnimations, createNewAnimation, groupFramesByRows } from './utils/animationClips';

export default function App() {
  // Multi-Sheet Workspace State: Array of { id, name, imageSrc, imageDimensions, imageElement }
  const [sheets, setSheets] = useState([]);
  const [activeSheetId, setActiveSheetId] = useState(null);

  // Active Sheet & Sheet Lookup Map
  const activeSheet = useMemo(() => {
    return sheets.find((s) => s.id === activeSheetId) || sheets[0] || null;
  }, [sheets, activeSheetId]);

  const sheetMap = useMemo(() => {
    return new Map(sheets.map((s) => [s.id, s]));
  }, [sheets]);

  // Derived properties of the active sheet for backwards-compatibility
  const imageSrc = activeSheet?.imageSrc || null;
  const imageDimensions = activeSheet?.imageDimensions || { width: 0, height: 0 };
  const imageElement = activeSheet?.imageElement || null;

  // Frames & Selection across all sheets (each frame has sheetId)
  const [frames, setFrames] = useState([]);
  const [selectedFrameId, setSelectedFrameId] = useState(null);

  // Godot SpriteFrames Animations State
  const [animations, setAnimations] = useState([]);
  const [selectedAnimationId, setSelectedAnimationId] = useState(null);

  // Synchronized Preview Mode & Playback State between Dock and AnimationPreview
  const [previewMode, setPreviewMode] = useState('character');
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(true);
  const [playbackFrameIndex, setPlaybackFrameIndex] = useState(0);

  // Modals
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportAtlasModalOpen, setIsImportAtlasModalOpen] = useState(false);

  // Load Full 4-Sheet Character Suite (Run, Idle, Hurt, Walk) on first render
  useEffect(() => {
    handleLoadCharacterSuite();
  }, []);

  // Multi-Sheet Character Suite Loader: Loads Run, Idle, Hurt, Walk into one unified workspace
  const handleLoadCharacterSuite = useCallback(() => {
    const suite = createFullFoxCharacterSuite();

    Promise.all(
      suite.sheets.map((s) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            resolve({
              id: s.id,
              name: s.name,
              imageSrc: s.dataUrl,
              imageDimensions: { width: s.width, height: s.height },
              imageElement: img
            });
          };
          img.src = s.dataUrl;
        });
      })
    ).then((loadedSheets) => {
      setSheets(loadedSheets);
      setActiveSheetId(suite.defaultSheetId);
      setFrames(suite.allFrames);
      setSelectedFrameId(suite.allFrames[0]?.id || null);
      setAnimations(suite.animations);
      setSelectedAnimationId(suite.animations[0]?.id || null);
    });
  }, []);

  // Helper to load single image & replace sheets (e.g. from Samples dropdown)
  const loadSpriteImage = useCallback((src, initialFrames = null, sheetName = 'Sheet 1') => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const newSheetId = `sheet_${Date.now()}`;
      const newSheet = {
        id: newSheetId,
        name: sheetName,
        imageSrc: src,
        imageDimensions: { width: img.naturalWidth, height: img.naturalHeight },
        imageElement: img
      };

      setSheets([newSheet]);
      setActiveSheetId(newSheetId);

      if (initialFrames && initialFrames.length > 0) {
        const tagged = initialFrames.map((f) => ({ ...f, sheetId: newSheetId }));
        setFrames(tagged);
        setSelectedFrameId(tagged[0]?.id || null);
        const anims = generateDefaultAnimations(tagged);
        setAnimations(anims);
        setSelectedAnimationId(anims[0]?.id || null);
      } else {
        const detected = autoDetectSprites(img, 10, 1);
        if (detected.length > 0) {
          const newFrames = detected.map((box, i) => ({
            id: `auto_${Date.now()}_${i}`,
            sheetId: newSheetId,
            name: `frame_${i + 1}`,
            x: box.x,
            y: box.y,
            w: box.w,
            h: box.h,
            pivotX: 0.5,
            pivotY: 0.5
          }));
          setFrames(newFrames);
          setSelectedFrameId(newFrames[0]?.id || null);
          const anims = generateDefaultAnimations(newFrames);
          setAnimations(anims);
          setSelectedAnimationId(anims[0]?.id || null);
        } else {
          const defaultW = Math.min(64, Math.floor(img.naturalWidth / 4) || 32);
          const defaultH = Math.min(64, img.naturalHeight);
          const defaultFrames = [];
          const count = Math.min(4, Math.floor(img.naturalWidth / defaultW));

          for (let i = 0; i < count; i++) {
            defaultFrames.push({
              id: `frame_${Date.now()}_${i}`,
              sheetId: newSheetId,
              name: `frame_${i + 1}`,
              x: i * defaultW,
              y: 0,
              w: defaultW,
              h: defaultH,
              pivotX: 0.5,
              pivotY: 0.5
            });
          }
          setFrames(defaultFrames);
          setSelectedFrameId(defaultFrames[0]?.id || null);
          const anims = generateDefaultAnimations(defaultFrames);
          setAnimations(anims);
          setSelectedAnimationId(anims[0]?.id || null);
        }
      }
    };
    img.src = src;
  }, []);

  // Add new Sheet from uploaded image file
  const handleAddSheetFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target.result;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const sheetName = file.name.replace(/\.[^/.]+$/, "");
        const newSheetId = `sheet_${Date.now()}`;
        const newSheet = {
          id: newSheetId,
          name: sheetName,
          imageSrc: src,
          imageDimensions: { width: img.naturalWidth, height: img.naturalHeight },
          imageElement: img
        };

        const detected = autoDetectSprites(img, 10, 1);
        let newFrames = [];
        if (detected.length > 0) {
          newFrames = detected.map((box, i) => ({
            id: `auto_${Date.now()}_${i}`,
            sheetId: newSheetId,
            name: `${sheetName}_${i + 1}`,
            x: box.x,
            y: box.y,
            w: box.w,
            h: box.h,
            pivotX: 0.5,
            pivotY: 0.5
          }));
        } else {
          const defaultW = Math.min(64, Math.floor(img.naturalWidth / 4) || 32);
          const defaultH = Math.min(64, img.naturalHeight);
          const count = Math.min(4, Math.floor(img.naturalWidth / defaultW));
          for (let i = 0; i < count; i++) {
            newFrames.push({
              id: `frame_${Date.now()}_${i}`,
              sheetId: newSheetId,
              name: `${sheetName}_${i + 1}`,
              x: i * defaultW,
              y: 0,
              w: defaultW,
              h: defaultH,
              pivotX: 0.5,
              pivotY: 0.5
            });
          }
        }

        setSheets((prev) => [...prev, newSheet]);
        setActiveSheetId(newSheetId);
        setFrames((prev) => [...prev, ...newFrames]);
        setSelectedFrameId(newFrames[0]?.id || null);

        if (newFrames.length > 0) {
          const newAnim = {
            id: `anim_${Date.now()}`,
            name: sheetName.toLowerCase(),
            fps: 10,
            loop: true,
            frameIds: newFrames.map(f => f.id)
          };
          setAnimations((prev) => [...prev, newAnim]);
          setSelectedAnimationId(newAnim.id);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Add new Sheet from built-in character preset
  const handleAddSheetPreset = (presetType) => {
    const preset = createFoxSpritePreset(presetType);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const typeClean = presetType.replace('fox_', '');
      const sheetName = typeClean.charAt(0).toUpperCase() + typeClean.slice(1);
      const newSheetId = `sheet_${typeClean}_${Date.now()}`;
      const newSheet = {
        id: newSheetId,
        name: sheetName,
        imageSrc: preset.dataUrl,
        imageDimensions: { width: img.naturalWidth, height: img.naturalHeight },
        imageElement: img
      };

      const taggedFrames = preset.initialFrames.map(f => ({
        ...f,
        id: `${newSheetId}_${f.id}`,
        sheetId: newSheetId
      }));

      setSheets((prev) => [...prev, newSheet]);
      setActiveSheetId(newSheetId);
      setFrames((prev) => [...prev, ...taggedFrames]);
      setSelectedFrameId(taggedFrames[0]?.id || null);

      const newAnims = generateDefaultAnimations(taggedFrames).map(a => ({
        ...a,
        id: `${newSheetId}_${a.id}`,
        name: `${sheetName.toLowerCase()}_${a.name}`
      }));
      setAnimations((prev) => [...prev, ...newAnims]);
      if (newAnims[0]) setSelectedAnimationId(newAnims[0].id);
    };
    img.src = preset.dataUrl;
  };

  // Delete a Sheet
  const handleDeleteSheet = (sheetId) => {
    if (sheets.length <= 1) return;
    setSheets((prev) => prev.filter((s) => s.id !== sheetId));
    setFrames((prev) => prev.filter((f) => f.sheetId !== sheetId));
    if (activeSheetId === sheetId) {
      const remaining = sheets.filter((s) => s.id !== sheetId);
      setActiveSheetId(remaining[0]?.id || null);
    }
  };

  // Rename a Sheet
  const handleRenameSheet = (sheetId, newName) => {
    setSheets((prev) =>
      prev.map((s) => (s.id === sheetId ? { ...s, name: newName } : s))
    );
  };

  // Select active Sheet
  const handleSelectSheet = (sheetId) => {
    setActiveSheetId(sheetId);
    const sheetFrames = frames.filter((f) => f.sheetId === sheetId);
    if (sheetFrames.length > 0) {
      setSelectedFrameId(sheetFrames[0].id);
    }
  };

  // File Upload handler (from Header or Canvas)
  const handleFileUpload = (file) => {
    if (file.name.endsWith('.json') || file.type.includes('json')) {
      setIsImportAtlasModalOpen(true);
      return;
    }
    handleAddSheetFile(file);
  };

  // Import Atlas JSON & Frames handler
  const handleImportAtlas = ({ frames: newFrames, animations: newAnims, imageFile, imageName, importMode }) => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target.result;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const sheetName = imageName || imageFile.name.replace(/\.[^/.]+$/, "");
          const newSheetId = `sheet_${Date.now()}`;
          const newSheet = {
            id: newSheetId,
            name: sheetName,
            imageSrc: src,
            imageDimensions: { width: img.naturalWidth, height: img.naturalHeight },
            imageElement: img
          };

          const tagged = newFrames.map(f => ({ ...f, sheetId: newSheetId }));
          setSheets(prev => [...prev, newSheet]);
          setActiveSheetId(newSheetId);
          setFrames(prev => [...prev, ...tagged]);
          setSelectedFrameId(tagged[0]?.id || null);

          if (newAnims && newAnims.length > 0) {
            setAnimations(prev => [...prev, ...newAnims]);
            setSelectedAnimationId(newAnims[0]?.id || null);
          }
        };
        img.src = src;
      };
      reader.readAsDataURL(imageFile);
      return;
    }

    // Applying to active sheet
    const targetSheetId = activeSheetId || sheets[0]?.id || 'sheet_main';
    const tagged = newFrames.map(f => ({ ...f, sheetId: targetSheetId }));

    if (imageSrc) {
      if (importMode === 'append') {
        const combined = [...frames, ...tagged];
        setFrames(combined);
        setSelectedFrameId(tagged[0]?.id || combined[0]?.id || null);
        if (newAnims && newAnims.length > 0) {
          setAnimations((prev) => [...prev, ...newAnims]);
        }
      } else {
        setFrames(prev => [
          ...prev.filter(f => f.sheetId && f.sheetId !== targetSheetId),
          ...tagged
        ]);
        setSelectedFrameId(tagged[0]?.id || null);
        if (newAnims && newAnims.length > 0) {
          setAnimations(prev => [...prev, ...newAnims]);
          setSelectedAnimationId(newAnims[0]?.id || null);
        } else {
          const anims = generateDefaultAnimations(tagged);
          setAnimations((prev) => [...prev, ...anims]);
          setSelectedAnimationId(anims[0]?.id || null);
        }
      }
    } else {
      setFrames(tagged);
      setSelectedFrameId(tagged[0]?.id || null);
      if (newAnims && newAnims.length > 0) {
        setAnimations(newAnims);
        setSelectedAnimationId(newAnims[0]?.id || null);
      }
    }
  };

  // Add a new frame manually
  const handleAddFrame = (frameData) => {
    const newFrame = {
      id: `frame_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      sheetId: activeSheetId || sheets[0]?.id,
      name: `frame_${frames.length + 1}`,
      pivotX: 0.5,
      pivotY: 0.5,
      ...frameData
    };
    setFrames((prev) => [...prev, newFrame]);
    setSelectedFrameId(newFrame.id);
  };

  // Update existing frame
  const handleUpdateFrame = (id, updates) => {
    setFrames((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  // Duplicate Frame adjacent right (Ctrl+D logic)
  const handleDuplicateFrame = useCallback((targetId) => {
    const frameToDup = frames.find((f) => f.id === targetId) || frames.find((f) => f.id === selectedFrameId);
    if (!frameToDup) return;

    let newX = frameToDup.x + frameToDup.w;
    let newY = frameToDup.y;

    if (imageDimensions.width && newX + frameToDup.w > imageDimensions.width) {
      newX = 0;
      newY = frameToDup.y + frameToDup.h;
    }

    const newFrame = {
      ...frameToDup,
      id: `frame_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: `${frameToDup.name}_copy`,
      x: newX,
      y: newY,
      sheetId: frameToDup.sheetId || activeSheetId
    };

    setFrames((prev) => {
      const idx = prev.findIndex((f) => f.id === (targetId || selectedFrameId));
      if (idx === -1) return [...prev, newFrame];
      const next = [...prev];
      next.splice(idx + 1, 0, newFrame);
      return next;
    });

    setSelectedFrameId(newFrame.id);
  }, [frames, selectedFrameId, imageDimensions, activeSheetId]);

  // Delete Frame (Delete key logic)
  const handleDeleteFrame = useCallback((targetId) => {
    const id = targetId || selectedFrameId;
    if (!id) return;

    setFrames((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      const filtered = prev.filter((f) => f.id !== id);
      if (selectedFrameId === id) {
        const nextSelected = filtered[idx] || filtered[idx - 1] || null;
        setSelectedFrameId(nextSelected ? nextSelected.id : null);
      }
      return filtered;
    });
    setAnimations((prev) =>
      prev.map((a) => ({
        ...a,
        frameIds: a.frameIds.filter((fId) => fId !== id)
      }))
    );
  }, [selectedFrameId]);

  // Nudge Frame by pixel delta
  const handleNudgeFrame = useCallback((id, dx, dy) => {
    setFrames((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const newX = Math.max(0, Math.min(imageDimensions.width - f.w, f.x + dx));
        const newY = Math.max(0, Math.min(imageDimensions.height - f.h, f.y + dy));
        return { ...f, x: newX, y: newY };
      })
    );
  }, [imageDimensions]);

  // Move frame order index
  const handleMoveFrameOrder = (id, direction) => {
    setFrames((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx === -1) return prev;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;

      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  };

  // Auto detect non-transparent sprites (always grouped strictly by rows)
  const handleAutoDetect = () => {
    if (!imageElement) return;
    const detected = autoDetectSprites(imageElement, 10, 1);
    if (detected.length > 0) {
      const rows = groupFramesByRows(detected);
      const is4Way = rows.length === 4;
      const dirLabels = ['down', 'up', 'right', 'left'];

      const targetSheetId = activeSheetId || sheets[0]?.id;
      const currentSheetName = activeSheet?.name || 'sprite';
      const newFrames = [];
      let globalIdx = 0;

      rows.forEach((row, rowIdx) => {
        row.forEach((box, colIdx) => {
          globalIdx++;
          const name = is4Way
            ? `${currentSheetName.toLowerCase()}_${dirLabels[rowIdx]}_${colIdx + 1}`
            : `${currentSheetName.toLowerCase()}_r${rowIdx + 1}_${colIdx + 1}`;

          newFrames.push({
            id: `auto_${Date.now()}_${globalIdx}`,
            sheetId: targetSheetId,
            name,
            x: box.x,
            y: box.y,
            w: box.w,
            h: box.h,
            pivotX: 0.5,
            pivotY: 0.85,
            row: rowIdx
          });
        });
      });

      setFrames(prev => [
        ...prev.filter(f => f.sheetId && f.sheetId !== targetSheetId),
        ...newFrames
      ]);
      setSelectedFrameId(newFrames[0]?.id || null);
      const anims = generateDefaultAnimations(newFrames);
      setAnimations(prev => [...prev, ...anims]);
      setSelectedAnimationId(anims[0]?.id || null);
    }
  };

  // Quick Grid application
  const handleApplyGrid = (newFrames, clearExisting) => {
    const targetSheetId = activeSheetId || sheets[0]?.id;
    const tagged = newFrames.map(f => ({ ...f, sheetId: targetSheetId }));

    if (clearExisting) {
      setFrames(prev => [
        ...prev.filter(f => f.sheetId && f.sheetId !== targetSheetId),
        ...tagged
      ]);
      const anims = generateDefaultAnimations(tagged);
      setAnimations((prev) => [...prev, ...anims]);
      setSelectedAnimationId(anims[0]?.id || null);
    } else {
      setFrames((prev) => [...prev, ...tagged]);
    }
    if (tagged.length > 0) {
      setSelectedFrameId(tagged[0].id);
    }
  };

  // Clear all workspace sprites and animations
  const handleClearAll = useCallback(() => {
    setSheets([]);
    setActiveSheetId(null);
    setFrames([]);
    setSelectedFrameId(null);
    setAnimations([]);
    setSelectedAnimationId(null);
  }, []);

  // Godot SpriteFrames Animation Handlers
  const handleAddAnimation = useCallback((customName) => {
    const name = customName || `anim_${animations.length + 1}`;
    const newAnim = createNewAnimation(name, selectedFrameId ? [selectedFrameId] : [], 10, true);
    setAnimations((prev) => [...prev, newAnim]);
    setSelectedAnimationId(newAnim.id);
    return newAnim;
  }, [animations.length, selectedFrameId]);

  const handleDuplicateAnimation = useCallback((animId) => {
    const target = animations.find((a) => a.id === animId);
    if (!target) return;
    const newAnim = {
      ...target,
      id: `anim_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: `${target.name}_copy`,
      frameIds: [...target.frameIds]
    };
    setAnimations((prev) => {
      const idx = prev.findIndex((a) => a.id === animId);
      const next = [...prev];
      next.splice(idx + 1, 0, newAnim);
      return next;
    });
    setSelectedAnimationId(newAnim.id);
  }, [animations]);

  const handleDeleteAnimation = useCallback((animId) => {
    setAnimations((prev) => {
      const filtered = prev.filter((a) => a.id !== animId);
      if (selectedAnimationId === animId) {
        setSelectedAnimationId(filtered[0]?.id || null);
      }
      return filtered;
    });
  }, [selectedAnimationId]);

  const handleUpdateAnimation = useCallback((animId, updates) => {
    setAnimations((prev) =>
      prev.map((a) => (a.id === animId ? { ...a, ...updates } : a))
    );
  }, []);

  const handleAddFrameToAnimation = useCallback((animId, frameId) => {
    setAnimations((prev) =>
      prev.map((a) =>
        a.id === animId ? { ...a, frameIds: [...a.frameIds, frameId] } : a
      )
    );
  }, []);

  const handleRemoveFrameFromAnimation = useCallback((animId, frameIndex) => {
    setAnimations((prev) =>
      prev.map((a) => {
        if (a.id !== animId) return a;
        const newIds = [...a.frameIds];
        newIds.splice(frameIndex, 1);
        return { ...a, frameIds: newIds };
      })
    );
  }, []);

  const handleReorderAnimationFrames = useCallback((animId, fromIdx, toIdx) => {
    setAnimations((prev) =>
      prev.map((a) => {
        if (a.id !== animId) return a;
        const newIds = [...a.frameIds];
        const [moved] = newIds.splice(fromIdx, 1);
        newIds.splice(toIdx, 0, moved);
        return { ...a, frameIds: newIds };
      })
    );
  }, []);

  const handleSelectAnimation = (animId) => {
    setSelectedAnimationId(animId);
    setPlaybackFrameIndex(0);
  };

  const handleTogglePlay = () => {
    setIsAnimationPlaying((prev) => !prev);
  };

  // Keyboard Shortcuts Hook
  useKeyboardShortcuts({
    selectedFrameId,
    frames,
    onDuplicateFrame: handleDuplicateFrame,
    onDeleteFrame: handleDeleteFrame,
    onNudgeFrame: handleNudgeFrame,
    onSelectAll: () => setSelectedFrameId(frames[0]?.id || null),
    onDeselectAll: () => setSelectedFrameId(null),
    onPasteImage: (pastedSrc) => loadSpriteImage(pastedSrc)
  });

  return (
    <div className="app-container">
      {/* Top Header Navbar */}
      <Header
        imageSrc={imageSrc}
        sheets={sheets}
        onFileUpload={handleFileUpload}
        onLoadSample={(sample) => loadSpriteImage(sample.dataUrl, sample.initialFrames, sample.name)}
        onLoadCharacterSuite={handleLoadCharacterSuite}
        onClear={handleClearAll}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenImportAtlasModal={() => setIsImportAtlasModalOpen(true)}
        frameCount={frames.length}
      />

      {/* Main 3-Column Studio Workspace */}
      <main className="main-workspace">
        {/* Left Column: Frame Properties & Pivot Inspector */}
        <FrameProperties
          selectedFrame={frames.find((f) => f.id === selectedFrameId)}
          selectedIndex={frames.findIndex((f) => f.id === selectedFrameId)}
          totalFrames={frames.length}
          onUpdateFrame={handleUpdateFrame}
          onDuplicateFrame={handleDuplicateFrame}
          onDeleteFrame={handleDeleteFrame}
          imageDimensions={imageDimensions}
          frames={frames}
          sheetMap={sheetMap}
          onSelectFrame={setSelectedFrameId}
        />

        {/* Center Column: Interactive Sprite Sheet Canvas with Multi-Sheet Tab Bar */}
        <CanvasWorkspace
          imageSrc={imageSrc}
          imageDimensions={imageDimensions}
          frames={frames}
          selectedFrameId={selectedFrameId}
          onSelectFrame={setSelectedFrameId}
          onAddFrame={handleAddFrame}
          onUpdateFrame={handleUpdateFrame}
          onAutoDetect={handleAutoDetect}
          onOpenQuickGrid={() => setIsGridModalOpen(true)}
          onFileUpload={handleFileUpload}
          onOpenImportAtlasModal={() => setIsImportAtlasModalOpen(true)}
          sheets={sheets}
          activeSheetId={activeSheetId}
          onSelectSheet={handleSelectSheet}
          onAddSheetFile={handleAddSheetFile}
          onAddSheetPreset={handleAddSheetPreset}
          onDeleteSheet={handleDeleteSheet}
          onRenameSheet={handleRenameSheet}
        />

        {/* Right Column: Animation Preview Player with Cross-Sheet Character Mode */}
        <AnimationPreview
          imageElement={imageElement}
          sheets={sheets}
          sheetMap={sheetMap}
          frames={frames}
          selectedFrameId={selectedFrameId}
          onSelectFrame={setSelectedFrameId}
          animations={animations}
          selectedAnimationId={selectedAnimationId}
          onSelectAnimation={handleSelectAnimation}
          previewMode={previewMode}
          onPreviewModeChange={setPreviewMode}
          isPlaying={isAnimationPlaying}
          onTogglePlay={handleTogglePlay}
          currentFrameIndex={playbackFrameIndex}
          onFrameIndexChange={setPlaybackFrameIndex}
        />
      </main>

      {/* Bottom Timeline Strip (Godot SpriteFrames Bottom Dock) */}
      <footer className="app-timeline">
        <FrameTimeline
          imageElement={imageElement}
          sheetMap={sheetMap}
          frames={frames}
          selectedFrameId={selectedFrameId}
          onSelectFrame={setSelectedFrameId}
          onDuplicateFrame={handleDuplicateFrame}
          onDeleteFrame={handleDeleteFrame}
          onMoveFrameOrder={handleMoveFrameOrder}
          animations={animations}
          selectedAnimationId={selectedAnimationId}
          onSelectAnimation={handleSelectAnimation}
          onAddAnimation={handleAddAnimation}
          onDuplicateAnimation={handleDuplicateAnimation}
          onDeleteAnimation={handleDeleteAnimation}
          onUpdateAnimation={handleUpdateAnimation}
          onAddFrameToAnimation={handleAddFrameToAnimation}
          onRemoveFrameFromAnimation={handleRemoveFrameFromAnimation}
          onReorderAnimationFrames={handleReorderAnimationFrames}
          isPlaying={isAnimationPlaying}
          onTogglePlay={handleTogglePlay}
          playbackFrameIndex={playbackFrameIndex}
        />
      </footer>

      {/* Modals */}
      <QuickGridModal
        isOpen={isGridModalOpen}
        onClose={() => setIsGridModalOpen(false)}
        imageDimensions={imageDimensions}
        onApplyGrid={handleApplyGrid}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        imageElement={imageElement}
        imageDimensions={imageDimensions}
        imageSrc={imageSrc}
        frames={frames}
      />

      <ImportAtlasModal
        isOpen={isImportAtlasModalOpen}
        onClose={() => setIsImportAtlasModalOpen(false)}
        hasExistingImage={Boolean(imageSrc)}
        onImportAtlas={handleImportAtlas}
      />
    </div>
  );
}
