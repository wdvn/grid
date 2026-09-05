import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Network,
  X,
  ArrowRight,
  Play,
  Sparkles,
  Layers,
  Sliders,
  Check,
  Zap,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  ChevronRight,
  Info,
  Link2,
  Compass
} from 'lucide-react';
import {
  addTransitionToGraph,
  removeTransitionFromGraph,
  updateTransitionInGraph,
  addStateToGraph,
  removeStateFromGraph,
  createDefaultCharacterGraph
} from '../utils/animationGraph';

export function StateGraphModal({
  isOpen,
  onClose,
  graphConfig,
  onUpdateGraphConfig,
  currentActiveStateId = 'Idle',
  animations = [],
  frames = []
}) {
  const [localGraph, setLocalGraph] = useState(graphConfig);
  const [selectedItem, setSelectedItem] = useState(null); // { type: 'state', id } | { type: 'transition', id }
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Dragging node state
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Panning canvas state
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // "Make Transition" drag-and-drop state
  const [transitionDrag, setTransitionDrag] = useState(null); // { fromId: string, startPos: {x,y}, currentPos: {x,y} }
  const [hoveredTargetNodeId, setHoveredTargetNodeId] = useState(null);

  const canvasAreaRef = useRef(null);

  // Sync local graph when graphConfig prop changes
  useEffect(() => {
    setLocalGraph(graphConfig);
  }, [graphConfig]);

  // Propagate updates back to parent state machine
  const notifyUpdate = useCallback((newGraph) => {
    setLocalGraph(newGraph);
    if (onUpdateGraphConfig) {
      onUpdateGraphConfig(newGraph);
    }
  }, [onUpdateGraphConfig]);

  if (!isOpen || !localGraph) return null;

  const states = localGraph.states || {};
  const transitions = localGraph.transitions || [];
  const defaultState = localGraph.defaultState || 'Idle';

  // Fixed positions for special nodes
  const anyStatePos = localGraph.anyStatePosition || { x: 50, y: 50 };
  const entryPos = localGraph.entryPosition || { x: 50, y: 170 };

  // Helper to get node position by ID
  const getNodePos = (nodeId) => {
    if (nodeId === 'AnyState') return anyStatePos;
    if (nodeId === 'Entry') return entryPos;
    return states[nodeId]?.position || { x: 200, y: 150 };
  };

  // ==========================================
  // MOUSE DRAG & PAN EVENT HANDLERS
  // ==========================================
  const handleCanvasMouseDown = (e) => {
    // If clicking background, start panning
    if (e.target === canvasAreaRef.current || e.target.tagName.toLowerCase() === 'svg') {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      setSelectedItem(null);
    }
  };

  const handleMouseMove = (e) => {
    // 1. Panning canvas
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
      return;
    }

    // 2. Dragging a State Node
    if (draggingNodeId && canvasAreaRef.current) {
      const rect = canvasAreaRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;

      const newX = Math.round(mouseX - dragOffsetRef.current.x);
      const newY = Math.round(mouseY - dragOffsetRef.current.y);

      if (draggingNodeId === 'AnyState') {
        notifyUpdate({ ...localGraph, anyStatePosition: { x: newX, y: newY } });
      } else if (draggingNodeId === 'Entry') {
        notifyUpdate({ ...localGraph, entryPosition: { x: newX, y: newY } });
      } else if (states[draggingNodeId]) {
        notifyUpdate({
          ...localGraph,
          states: {
            ...states,
            [draggingNodeId]: {
              ...states[draggingNodeId],
              position: { x: newX, y: newY }
            }
          }
        });
      }
      return;
    }

    // 3. Dragging a Transition Connection Arrow
    if (transitionDrag && canvasAreaRef.current) {
      const rect = canvasAreaRef.current.getBoundingClientRect();
      const currentPos = {
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom
      };
      setTransitionDrag(prev => ({ ...prev, currentPos }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);

    // If dropping a transition onto a target node
    if (transitionDrag) {
      if (hoveredTargetNodeId && hoveredTargetNodeId !== transitionDrag.fromId) {
        // Create new transition
        const updated = addTransitionToGraph(localGraph, transitionDrag.fromId, hoveredTargetNodeId);
        notifyUpdate(updated);
        // Select the newly created transition
        const newTrans = updated.transitions[updated.transitions.length - 1];
        if (newTrans) {
          setSelectedItem({ type: 'transition', id: newTrans.id });
        }
      }
      setTransitionDrag(null);
      setHoveredTargetNodeId(null);
    }
  };

  // Start dragging a node
  const startDragNode = (e, nodeId) => {
    e.stopPropagation();
    if (canvasAreaRef.current) {
      const rect = canvasAreaRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      const nodePos = getNodePos(nodeId);

      dragOffsetRef.current = {
        x: mouseX - nodePos.x,
        y: mouseY - nodePos.y
      };
      setDraggingNodeId(nodeId);
      setSelectedItem({ type: 'state', id: nodeId });
    }
  };

  // Start dragging "Make Transition" arrow
  const startMakeTransition = (e, fromId) => {
    e.stopPropagation();
    if (canvasAreaRef.current) {
      const fromPos = getNodePos(fromId);
      const startPos = { x: fromPos.x + 180, y: fromPos.y + 35 };
      setTransitionDrag({
        fromId,
        startPos,
        currentPos: { ...startPos }
      });
    }
  };

  // Reset node layout to defaults
  const handleResetLayout = () => {
    const defaultG = createDefaultCharacterGraph();
    notifyUpdate({
      ...localGraph,
      anyStatePosition: defaultG.anyStatePosition,
      entryPosition: defaultG.entryPosition,
      states: Object.fromEntries(
        Object.entries(localGraph.states).map(([k, s]) => [
          k,
          { ...s, position: defaultG.states[k]?.position || s.position }
        ])
      )
    });
    setPan({ x: 0, y: 0 });
    setZoom(1.0);
  };

  // Create a new custom state node
  const handleCreateNewState = () => {
    const count = Object.keys(states).length + 1;
    const newId = `State_${count}`;
    const rect = canvasAreaRef.current ? canvasAreaRef.current.getBoundingClientRect() : { width: 800, height: 500 };
    const centerX = Math.round((rect.width / 2 - pan.x) / zoom - 90);
    const centerY = Math.round((rect.height / 2 - pan.y) / zoom - 35);

    const updated = addStateToGraph(localGraph, {
      id: newId,
      name: `Custom State ${count}`,
      type: 'SingleClip',
      position: { x: centerX, y: centerY }
    });
    notifyUpdate(updated);
    setSelectedItem({ type: 'state', id: newId });
  };

  // Selected Transition Object
  const selectedTransition = selectedItem?.type === 'transition'
    ? transitions.find(t => t.id === selectedItem.id)
    : null;

  // Selected State Object
  const selectedState = selectedItem?.type === 'state'
    ? states[selectedItem.id]
    : null;

  // Directional clip assignment helpers for BlendSpace2D (WASD Locomotion)
  const handleAssignDirClip = (dir, animId) => {
    if (!selectedState) return;
    const frameMap = new Map(frames.map(f => [f.id, f]));
    const chosenAnim = animations.find(a => a.id === animId);
    const resolvedFrames = chosenAnim ? chosenAnim.frameIds.map(id => frameMap.get(id)).filter(Boolean) : [];

    const existingClips = selectedState.clips || {};
    const existingClipIds = selectedState.clipIds || {};

    const updatedState = {
      ...selectedState,
      clips: {
        ...existingClips,
        [dir]: resolvedFrames
      },
      clipIds: {
        ...existingClipIds,
        [dir]: animId
      }
    };

    notifyUpdate({
      ...localGraph,
      states: {
        ...states,
        [selectedState.id]: updatedState
      }
    });
  };

  const getSelectedAnimIdForDir = (dir) => {
    if (selectedState?.clipIds && selectedState.clipIds[dir]) {
      return selectedState.clipIds[dir];
    }
    const dirFrames = selectedState?.clips?.[dir] || [];
    if (dirFrames.length === 0) return '';
    const dirFrameIds = new Set(dirFrames.map(f => f.id));
    const matchedAnim = animations.find(a => 
      a.frameIds.length === dirFrames.length && a.frameIds.every(id => dirFrameIds.has(id))
    );
    return matchedAnim ? matchedAnim.id : '';
  };

  const handleAssignOneShotClip = (animId) => {
    if (!selectedState) return;
    const frameMap = new Map(frames.map(f => [f.id, f]));
    const chosenAnim = animations.find(a => a.id === animId);
    const resolvedFrames = chosenAnim ? chosenAnim.frameIds.map(id => frameMap.get(id)).filter(Boolean) : [];

    const updatedState = {
      ...selectedState,
      clip: resolvedFrames,
      clipId: animId
    };

    notifyUpdate({
      ...localGraph,
      states: {
        ...states,
        [selectedState.id]: updatedState
      }
    });
  };

  const getSelectedAnimIdForOneShot = () => {
    if (selectedState?.clipId) return selectedState.clipId;
    const clipFrames = selectedState?.clip || [];
    if (clipFrames.length === 0) return '';
    const clipFrameIds = new Set(clipFrames.map(f => f.id));
    const matchedAnim = animations.find(a =>
      a.frameIds.length === clipFrames.length && a.frameIds.every(id => clipFrameIds.has(id))
    );
    return matchedAnim ? matchedAnim.id : '';
  };

  return createPortal(
    <div className="modal-overlay">
      <div
        className="modal-card flex flex-col overflow-hidden shadow-2xl border border-white/20"
        style={{ width: '92vw', maxWidth: '1200px', height: '88vh' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Header Bar */}
        <div className="modal-header bg-slate-900/95 border-b border-white/10 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shadow-inner">
              <Network size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">Unity Animator Graph Editor</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Mecanim State Machine
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Drag nodes to reposition • Drag right handles to connect transitions • Click arrows to inspect conditions
              </p>
            </div>
          </div>

          {/* Canvas Controls Toolbar */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-white/10">
              <button
                onClick={() => setZoom(z => Math.max(0.6, z - 0.15))}
                className="btn-icon p-1 text-slate-400 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <span className="text-[10px] font-mono text-slate-300 w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(1.6, z + 0.15))}
                className="btn-icon p-1 text-slate-400 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
              <button
                onClick={handleResetLayout}
                className="btn-icon p-1 text-slate-400 hover:text-white"
                title="Reset Layout & View"
              >
                <RotateCcw size={13} />
              </button>
            </div>

            <button
              onClick={handleCreateNewState}
              className="btn btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1"
              title="Add New Animation State Node"
            >
              <Plus size={13} className="text-blue-400" />
              <span>Add State</span>
            </button>

            <button onClick={onClose} className="btn-icon">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Work Area: Interactive Canvas + Inspector Sidebar */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* 1. INTERACTIVE NODE GRAPH CANVAS */}
          <div
            ref={canvasAreaRef}
            className="flex-1 relative overflow-hidden select-none bg-slate-950 cursor-grab active:cursor-grabbing"
            onMouseDown={handleCanvasMouseDown}
            style={{
              backgroundImage: `
                radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
                linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: `${20 * zoom}px ${20 * zoom}px, ${100 * zoom}px ${100 * zoom}px, ${100 * zoom}px ${100 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`
            }}
          >
            {/* Scaled & Panned Canvas Layer */}
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                position: 'absolute',
                inset: 0,
                width: '3000px',
                height: '3000px',
                pointerEvents: 'none'
              }}
            >
              {/* SVG TRANSITION ARROWS LAYER */}
              <svg
                className="w-full h-full absolute inset-0"
                style={{ overflow: 'visible', pointerEvents: 'auto' }}
              >
                <defs>
                  {/* Standard arrowhead */}
                  <marker
                    id="arrowhead"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
                  </marker>
                  {/* Selected/active arrowhead */}
                  <marker
                    id="arrowhead-selected"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                  </marker>
                  {/* Dragging connecting arrowhead */}
                  <marker
                    id="arrowhead-drag"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
                  </marker>
                </defs>

                {/* Entry to DefaultState Transition Arrow (Unity Green) */}
                {(() => {
                  const s = entryPos;
                  const targetPos = states[defaultState]?.position || { x: 260, y: 170 };
                  const sx = s.x + 130;
                  const sy = s.y + 25;
                  const ex = targetPos.x;
                  const ey = targetPos.y + 35;
                  return (
                    <path
                      d={`M ${sx} ${sy} L ${ex} ${ey}`}
                      stroke="#22c55e"
                      strokeWidth="2.5"
                      fill="none"
                      markerEnd="url(#arrowhead)"
                      className="opacity-90"
                    />
                  );
                })()}

                {/* Render Transition Arrows */}
                {transitions.map((t) => {
                  const p1 = getNodePos(t.from);
                  const p2 = getNodePos(t.to);

                  // Center coordinates
                  const c1 = { x: p1.x + 90, y: p1.y + 35 };
                  const c2 = { x: p2.x + 90, y: p2.y + 35 };

                  const dx = c2.x - c1.x;
                  const dy = c2.y - c1.y;
                  const len = Math.hypot(dx, dy) || 1;
                  const ux = dx / len;
                  const uy = dy / len;
                  const nx = -uy;
                  const ny = ux;

                  // Check if there is a reverse transition to offset parallel lines
                  const hasReverse = transitions.some(other => other.from === t.to && other.to === t.from);
                  const offset = hasReverse ? 10 : 0;

                  // Line start & end clamped to node edges
                  const sx = c1.x + ux * 85 + nx * offset;
                  const sy = c1.y + uy * 35 + ny * offset;
                  const ex = c2.x - ux * 85 + nx * offset;
                  const ey = c2.y - uy * 35 + ny * offset;

                  // Midpoint for curve and clickable rule badge
                  const mx = (sx + ex) / 2 + nx * (hasReverse ? 4 : 0);
                  const my = (sy + ey) / 2 + ny * (hasReverse ? 4 : 0);

                  const isSelected = selectedItem?.type === 'transition' && selectedItem.id === t.id;

                  return (
                    <g
                      key={t.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem({ type: 'transition', id: t.id });
                      }}
                      className="cursor-pointer group"
                    >
                      {/* Thick transparent hit-box area for easy clicking */}
                      <path
                        d={`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`}
                        stroke="transparent"
                        strokeWidth="16"
                        fill="none"
                      />
                      {/* Visible Arrow Line */}
                      <path
                        d={`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`}
                        stroke={isSelected ? '#38bdf8' : '#64748b'}
                        strokeWidth={isSelected ? '3' : '2'}
                        fill="none"
                        markerEnd={isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
                        className="transition-colors group-hover:stroke-blue-400"
                        style={isSelected ? { filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.6))' } : {}}
                      />
                      {/* Interactive Transition Condition Pill */}
                      <foreignObject
                        x={mx - 45}
                        y={my - 12}
                        width="90"
                        height="24"
                        style={{ overflow: 'visible', pointerEvents: 'none' }}
                      >
                        <div
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded text-center border shadow transition-transform group-hover:scale-105 pointer-events-auto ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-400 font-bold'
                              : 'bg-slate-900/90 text-slate-300 border-white/20'
                          }`}
                        >
                          {t.conditions?.[0]?.param || 'Transition'}
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}

                {/* Dragging New Transition Preview Line */}
                {transitionDrag && (
                  <path
                    d={`M ${transitionDrag.startPos.x} ${transitionDrag.startPos.y} L ${transitionDrag.currentPos.x} ${transitionDrag.currentPos.y}`}
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                    fill="none"
                    markerEnd="url(#arrowhead-drag)"
                  />
                )}
              </svg>

              {/* SPECIAL NODE: Entry Node (Unity Green) */}
              <div
                onMouseDown={(e) => startDragNode(e, 'Entry')}
                style={{
                  transform: `translate(${entryPos.x}px, ${entryPos.y}px)`,
                  width: '130px',
                  pointerEvents: 'auto'
                }}
                className="absolute rounded-lg border border-emerald-500/60 bg-emerald-950/80 shadow-lg p-2 flex items-center justify-between cursor-move hover:border-emerald-400 transition-colors select-none"
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-300 tracking-wider">ENTRY</span>
                </div>
                <ChevronRight size={14} className="text-emerald-400" />
              </div>

              {/* SPECIAL NODE: AnyState Node (Unity Cyan/Teal) */}
              <div
                onMouseDown={(e) => startDragNode(e, 'AnyState')}
                style={{
                  transform: `translate(${anyStatePos.x}px, ${anyStatePos.y}px)`,
                  width: '170px',
                  pointerEvents: 'auto'
                }}
                className={`absolute rounded-lg border shadow-xl p-2.5 cursor-move transition-all select-none ${
                  selectedItem?.type === 'state' && selectedItem.id === 'AnyState'
                    ? 'border-cyan-400 ring-2 ring-cyan-400/50 bg-cyan-950/90'
                    : 'border-cyan-500/50 bg-cyan-950/75 hover:border-cyan-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                    <Zap size={11} className="text-cyan-400" /> AnyState
                  </span>
                  {/* Make Transition Port Handle */}
                  <button
                    onMouseDown={(e) => startMakeTransition(e, 'AnyState')}
                    className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500 hover:text-white flex items-center justify-center transition-colors cursor-crosshair"
                    title="Drag to create transition from AnyState"
                  >
                    <Plus size={10} />
                  </button>
                </div>
                <div className="text-[9px] text-cyan-200/70 font-mono">
                  Global Interrupt Wildcard
                </div>
              </div>

              {/* STANDARD STATE NODES */}
              {Object.entries(states).map(([id, state]) => {
                const pos = state.position || { x: 260, y: 170 };
                const isSelected = selectedItem?.type === 'state' && selectedItem.id === id;
                const isDefault = defaultState === id;
                const isActive = currentActiveStateId === id;
                const isTargetHovered = hoveredTargetNodeId === id;

                return (
                  <div
                    key={id}
                    onMouseDown={(e) => startDragNode(e, id)}
                    onMouseEnter={() => transitionDrag && setHoveredTargetNodeId(id)}
                    onMouseLeave={() => transitionDrag && setHoveredTargetNodeId(null)}
                    style={{
                      transform: `translate(${pos.x}px, ${pos.y}px)`,
                      width: '180px',
                      pointerEvents: 'auto'
                    }}
                    className={`absolute rounded-xl border shadow-xl transition-all cursor-move select-none overflow-hidden ${
                      isActive
                        ? 'border-emerald-400 ring-2 ring-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.35)] bg-slate-900'
                        : isSelected
                        ? 'border-blue-400 ring-2 ring-blue-400/50 bg-slate-900'
                        : isTargetHovered
                        ? 'border-amber-400 ring-2 ring-amber-400/60 bg-amber-950/40'
                        : 'border-white/15 bg-slate-900/90 hover:border-white/30'
                    }`}
                  >
                    {/* Node Header Banner */}
                    <div
                      className={`px-3 py-1.5 flex items-center justify-between text-xs font-bold ${
                        isDefault
                          ? 'bg-amber-700/80 text-amber-100'
                          : id === 'Action'
                          ? 'bg-purple-800/80 text-purple-100'
                          : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      <span className="truncate">{state.name || id}</span>

                      {/* Transition Output Port Handle */}
                      <button
                        onMouseDown={(e) => startMakeTransition(e, id)}
                        className="w-4 h-4 rounded-full bg-white/20 hover:bg-white text-white hover:text-slate-900 flex items-center justify-center transition-colors cursor-crosshair ml-1 flex-shrink-0"
                        title="Drag to create transition to another state"
                      >
                        <Plus size={10} />
                      </button>
                    </div>

                    {/* Node Body Details */}
                    <div className="p-2.5 space-y-1.5 text-[10px] text-slate-400 font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Type:</span>
                        <span className="text-blue-300 font-semibold">{state.type || 'BlendTree'}</span>
                      </div>

                      {state.type === 'BlendSpace2D' && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Clips:</span>
                          <span className="text-slate-300">4-Way (2D)</span>
                        </div>
                      )}

                      {isDefault && (
                        <div className="text-[9px] text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20 text-center font-bold">
                          Default State
                        </div>
                      )}
                    </div>

                    {/* Live Playback Meter (Unity Mecanim Feature) */}
                    {isActive && (
                      <div className="h-1 w-full bg-slate-950 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 w-full animate-pulse" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. INSPECTOR SIDEBAR (Unity Animator Style) */}
          <div className="w-72 bg-slate-900/95 border-l border-white/10 flex flex-col overflow-y-auto flex-shrink-0 p-3 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sliders size={13} className="text-blue-400" />
                Inspector
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {selectedItem ? selectedItem.type.toUpperCase() : 'OVERVIEW'}
              </span>
            </div>

            {/* A. TRANSITION INSPECTOR */}
            {selectedTransition && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <span>Transition:</span>
                    <span className="font-bold text-slate-200">{selectedTransition.from}</span>
                    <ArrowRight size={11} className="text-blue-400" />
                    <span className="font-bold text-slate-200">{selectedTransition.to}</span>
                  </div>
                </div>

                {/* Conditions Editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Conditions:
                    </label>
                    <button
                      onClick={() => {
                        const newCond = { param: 'speed', operator: '>', value: 0.1 };
                        notifyUpdate(
                          updateTransitionInGraph(localGraph, selectedTransition.id, {
                            conditions: [...(selectedTransition.conditions || []), newCond]
                          })
                        );
                      }}
                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                    >
                      <Plus size={11} /> Add
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {(selectedTransition.conditions || []).map((cond, idx) => (
                      <div key={idx} className="p-2 rounded bg-slate-950 border border-white/10 space-y-1 text-xs">
                        <div className="flex items-center gap-1">
                          <select
                            value={cond.param}
                            onChange={(e) => {
                              const nextConds = [...selectedTransition.conditions];
                              nextConds[idx] = { ...cond, param: e.target.value };
                              notifyUpdate(updateTransitionInGraph(localGraph, selectedTransition.id, { conditions: nextConds }));
                            }}
                            className="input-field text-xs py-0.5 flex-1"
                          >
                            <option value="speed">speed</option>
                            <option value="moveX">moveX</option>
                            <option value="moveY">moveY</option>
                            <option value="isAttacking">isAttacking</option>
                          </select>

                          <select
                            value={cond.operator}
                            onChange={(e) => {
                              const nextConds = [...selectedTransition.conditions];
                              nextConds[idx] = { ...cond, operator: e.target.value };
                              notifyUpdate(updateTransitionInGraph(localGraph, selectedTransition.id, { conditions: nextConds }));
                            }}
                            className="input-field text-xs py-0.5 w-14"
                          >
                            <option value=">">&gt;</option>
                            <option value="<">&lt;</option>
                            <option value="==">==</option>
                            <option value="!=">!=</option>
                            <option value="<=">&lt;=</option>
                            <option value=">=">&gt;=</option>
                          </select>

                          <button
                            onClick={() => {
                              const nextConds = selectedTransition.conditions.filter((_, i) => i !== idx);
                              notifyUpdate(updateTransitionInGraph(localGraph, selectedTransition.id, { conditions: nextConds }));
                            }}
                            className="text-slate-500 hover:text-rose-400 p-0.5"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500">Value:</span>
                          {cond.param === 'isAttacking' ? (
                            <select
                              value={String(cond.value)}
                              onChange={(e) => {
                                const nextConds = [...selectedTransition.conditions];
                                nextConds[idx] = { ...cond, value: e.target.value === 'true' };
                                notifyUpdate(updateTransitionInGraph(localGraph, selectedTransition.id, { conditions: nextConds }));
                              }}
                              className="input-field text-xs py-0.5 flex-1"
                            >
                              <option value="true">true</option>
                              <option value="false">false</option>
                            </select>
                          ) : (
                            <input
                              type="number"
                              step="0.1"
                              value={cond.value}
                              onChange={(e) => {
                                const nextConds = [...selectedTransition.conditions];
                                nextConds[idx] = { ...cond, value: parseFloat(e.target.value) || 0 };
                                notifyUpdate(updateTransitionInGraph(localGraph, selectedTransition.id, { conditions: nextConds }));
                              }}
                              className="input-field text-xs py-0.5 flex-1 font-mono"
                            />
                          )}
                        </div>
                      </div>
                    ))}

                    {(!selectedTransition.conditions || selectedTransition.conditions.length === 0) && (
                      <div className="text-[11px] text-slate-500 italic p-2 bg-slate-950 rounded border border-white/5 text-center">
                        Instant Transition (No conditions)
                      </div>
                    )}
                  </div>
                </div>

                {/* Delete Transition Button */}
                <button
                  onClick={() => {
                    notifyUpdate(removeTransitionFromGraph(localGraph, selectedTransition.id));
                    setSelectedItem(null);
                  }}
                  className="btn bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs w-full py-1.5 flex items-center justify-center gap-1"
                >
                  <Trash2 size={13} />
                  <span>Delete Transition</span>
                </button>
              </div>
            )}

            {/* B. STATE NODE INSPECTOR */}
            {selectedState && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    State Name:
                  </label>
                  <input
                    type="text"
                    value={selectedState.name || selectedState.id}
                    onChange={(e) => {
                      notifyUpdate({
                        ...localGraph,
                        states: {
                          ...states,
                          [selectedState.id]: {
                            ...selectedState,
                            name: e.target.value
                          }
                        }
                      });
                    }}
                    className="input-field text-xs py-1 w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Motion Type:
                  </label>
                  <select
                    value={selectedState.type}
                    onChange={(e) => {
                      notifyUpdate({
                        ...localGraph,
                        states: {
                          ...states,
                          [selectedState.id]: {
                            ...selectedState,
                            type: e.target.value
                          }
                        }
                      });
                    }}
                    className="input-field text-xs py-1 w-full"
                  >
                    <option value="BlendSpace2D">BlendSpace2D (4-Directional)</option>
                    <option value="OneShot">OneShot (Attack / Action)</option>
                    <option value="SingleClip">SingleClip</option>
                  </select>
                </div>

                {/* Directional WASD Animation Mapping (BlendSpace2D) */}
                {selectedState.type === 'BlendSpace2D' && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-blue-300 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Compass size={12} /> WASD Animation Mapping
                      </label>
                      <span className="text-[9px] text-slate-500 font-mono">4 Directions</span>
                    </div>

                    <div className="space-y-1.5 font-mono text-xs">
                      {/* W - Up (North) */}
                      <div className="bg-slate-950/80 p-2 rounded-lg border border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-blue-400 font-bold flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 bg-blue-600/30 text-blue-300 rounded border border-blue-500/40 text-[10px]">W</kbd>
                            <span>Up (North)</span>
                          </span>
                          <span className="text-slate-500 text-[9px]">moveY &gt; 0</span>
                        </div>
                        <select
                          value={getSelectedAnimIdForDir('up')}
                          onChange={(e) => handleAssignDirClip('up', e.target.value)}
                          className="input-field text-[11px] py-1 w-full"
                        >
                          <option value="" disabled>-- Select Animation --</option>
                          {animations.map((a) => (
                            <option key={a.id} value={a.id}>
                              🎬 {a.name} ({a.frameIds.length} frames)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* S - Down (South) */}
                      <div className="bg-slate-950/80 p-2 rounded-lg border border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-blue-400 font-bold flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 bg-blue-600/30 text-blue-300 rounded border border-blue-500/40 text-[10px]">S</kbd>
                            <span>Down (South)</span>
                          </span>
                          <span className="text-slate-500 text-[9px]">moveY &lt; 0</span>
                        </div>
                        <select
                          value={getSelectedAnimIdForDir('down')}
                          onChange={(e) => handleAssignDirClip('down', e.target.value)}
                          className="input-field text-[11px] py-1 w-full"
                        >
                          <option value="" disabled>-- Select Animation --</option>
                          {animations.map((a) => (
                            <option key={a.id} value={a.id}>
                              🎬 {a.name} ({a.frameIds.length} frames)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* A - Left (West) */}
                      <div className="bg-slate-950/80 p-2 rounded-lg border border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-blue-400 font-bold flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 bg-blue-600/30 text-blue-300 rounded border border-blue-500/40 text-[10px]">A</kbd>
                            <span>Left (West)</span>
                          </span>
                          <span className="text-slate-500 text-[9px]">moveX &lt; 0</span>
                        </div>
                        <select
                          value={getSelectedAnimIdForDir('left')}
                          onChange={(e) => handleAssignDirClip('left', e.target.value)}
                          className="input-field text-[11px] py-1 w-full"
                        >
                          <option value="" disabled>-- Select Animation --</option>
                          {animations.map((a) => (
                            <option key={a.id} value={a.id}>
                              🎬 {a.name} ({a.frameIds.length} frames)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* D - Right (East) */}
                      <div className="bg-slate-950/80 p-2 rounded-lg border border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-blue-400 font-bold flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 bg-blue-600/30 text-blue-300 rounded border border-blue-500/40 text-[10px]">D</kbd>
                            <span>Right (East)</span>
                          </span>
                          <span className="text-slate-500 text-[9px]">moveX &gt; 0</span>
                        </div>
                        <select
                          value={getSelectedAnimIdForDir('right')}
                          onChange={(e) => handleAssignDirClip('right', e.target.value)}
                          className="input-field text-[11px] py-1 w-full"
                        >
                          <option value="" disabled>-- Select Animation --</option>
                          {animations.map((a) => (
                            <option key={a.id} value={a.id}>
                              🎬 {a.name} ({a.frameIds.length} frames)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* OneShot / Action Clip Mapping */}
                {(selectedState.type === 'OneShot' || selectedState.type === 'SingleClip') && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Zap size={12} /> Action Animation Clip
                      </label>
                      <span className="text-[9px] text-slate-500 font-mono">Space Key</span>
                    </div>
                    <div className="bg-slate-950/80 p-2 rounded-lg border border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-amber-400 font-bold flex items-center gap-1.5">
                          <kbd className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 text-[10px]">Space</kbd>
                          <span>Trigger Clip</span>
                        </span>
                      </div>
                      <select
                        value={getSelectedAnimIdForOneShot()}
                        onChange={(e) => handleAssignOneShotClip(e.target.value)}
                        className="input-field text-[11px] py-1 w-full"
                      >
                        <option value="" disabled>-- Select Animation --</option>
                        {animations.map((a) => (
                          <option key={a.id} value={a.id}>
                            🎬 {a.name} ({a.frameIds.length} frames)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Set as Default State */}
                {defaultState !== selectedState.id && (
                  <button
                    onClick={() => notifyUpdate({ ...localGraph, defaultState: selectedState.id })}
                    className="btn btn-secondary text-xs w-full py-1.5 flex items-center justify-center gap-1 text-amber-400 border-amber-500/30"
                  >
                    <Check size={13} />
                    <span>Set as Default State</span>
                  </button>
                )}

                {/* Delete State (Cannot delete default state) */}
                {defaultState !== selectedState.id && (
                  <button
                    onClick={() => {
                      notifyUpdate(removeStateFromGraph(localGraph, selectedState.id));
                      setSelectedItem(null);
                    }}
                    className="btn bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs w-full py-1.5 flex items-center justify-center gap-1"
                  >
                    <Trash2 size={13} />
                    <span>Delete State</span>
                  </button>
                )}
              </div>
            )}

            {/* C. GENERAL PARAMETERS OVERVIEW (When nothing selected) */}
            {!selectedTransition && !selectedState && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Animator Parameters
                  </div>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between items-center bg-slate-950 p-1.5 rounded border border-white/5">
                      <span className="text-slate-300">speed</span>
                      <span className="text-blue-400 font-semibold">Float (0.0)</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-950 p-1.5 rounded border border-white/5">
                      <span className="text-slate-300">moveX</span>
                      <span className="text-blue-400 font-semibold">Float (0.0)</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-950 p-1.5 rounded border border-white/5">
                      <span className="text-slate-300">moveY</span>
                      <span className="text-blue-400 font-semibold">Float (-1.0)</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-950 p-1.5 rounded border border-white/5">
                      <span className="text-slate-300">isAttacking</span>
                      <span className="text-purple-400 font-semibold">Trigger / Bool</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-1 text-[11px] text-slate-300">
                  <div className="font-bold text-blue-300 flex items-center gap-1">
                    <Info size={13} />
                    Unity Mecanim Controls:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[10px]">
                    <li>Drag nodes by their header to move them.</li>
                    <li>Drag from the <span className="text-white font-bold">+</span> handle to create transition arrows.</li>
                    <li>Click any arrow or rule pill to edit conditions.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span>Current Live State:</span>
            <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 animate-pulse">
              {currentActiveStateId.toUpperCase()}
            </span>
          </div>

          <button onClick={onClose} className="btn btn-primary text-xs px-4 py-1.5 flex items-center gap-1">
            <Check size={14} />
            <span>Done & Apply</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
