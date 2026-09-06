import { useEffect } from 'react';

export function useKeyboardShortcuts({
  enabled = true,
  selectedFrameId,
  frames,
  onDuplicateFrame,
  onDeleteFrame,
  onNudgeFrame,
  onSelectAll,
  onDeselectAll,
  onPasteImage
}) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Ignore keybindings if typing in text inputs or textareas
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Duplicate adjacent (Ctrl+D / Cmd+D)
      if (isCtrlOrCmd && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (selectedFrameId) {
          onDuplicateFrame(selectedFrameId);
        }
        return;
      }

      // Select All (Ctrl+A / Cmd+A)
      if (isCtrlOrCmd && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        onSelectAll?.();
        return;
      }

      // Delete frame (Delete or Backspace)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedFrameId) {
          onDeleteFrame(selectedFrameId);
        }
        return;
      }

      // Escape (Deselect)
      if (e.key === 'Escape') {
        e.preventDefault();
        onDeselectAll?.();
        return;
      }

      // Arrow keys nudge
      if (selectedFrameId && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;

        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;

        onNudgeFrame(selectedFrameId, dx, dy);
      }
    };

    const handlePaste = (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              onPasteImage(event.target.result);
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [enabled, selectedFrameId, frames, onDuplicateFrame, onDeleteFrame, onNudgeFrame, onSelectAll, onDeselectAll, onPasteImage]);
}
