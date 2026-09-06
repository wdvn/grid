// Core Animation Graph & State Machine Engine for 2D Character Sprites
import { groupFramesByRows } from './animationClips.js';

export class CharacterStateMachine {
  constructor(config = {}, animations = [], frames = []) {
    this.parameterTypes = {
      speed: 'Float',
      moveX: 'Float',
      moveY: 'Float',
      isAttacking: 'Trigger',
      is_attacked: 'Bool',
      ...(config.parameterTypes || {})
    };

    this.parameters = {
      speed: 0.0,
      moveX: 0.0,
      moveY: -1.0, // Default facing down
      isAttacking: false,
      is_attacked: false,
      ...config.parameters
    };

    this.states = config.states || {};
    this.transitions = config.transitions || [];
    this.currentStateId = config.defaultState || 'Idle';
    this.lastDirection = 'down'; // 'down' | 'up' | 'right' | 'left'
    this.stateTimer = 0;
    this.animations = animations || [];
    this.frames = frames || [];
    this.frameMap = new Map(this.frames.map(f => [f.id, f]));
    this.idleGraceTimer = 0;
    this._rebuildCache();
  }

  // Pre-cache resolved frame arrays and metadata per animation for O(1) lookup during 60 FPS tick loop
  _rebuildCache() {
    this._resolvedAnimMap = new Map();
    for (const anim of this.animations) {
      if (Array.isArray(anim.frameIds)) {
        const resolved = anim.frameIds.map(id => this.frameMap.get(id)).filter(Boolean);
        this._resolvedAnimMap.set(anim.id, {
          anim,
          frames: resolved,
          fps: anim.fps || 10,
          loop: anim.loop !== undefined ? anim.loop : true
        });
      }
    }
  }

  // Update live animations and frames context to guarantee dynamic frame updates reflect immediately
  setContext(animations = [], frames = []) {
    this.animations = animations || [];
    this.frames = frames || [];
    this.frameMap = new Map(this.frames.map(f => [f.id, f]));
    this.idleGraceTimer = 0;
    this._rebuildCache();
  }

  // Update parameters from input (e.g. keyboard / joystick)
  setParameters(params) {
    this.parameters = { ...this.parameters, ...params };

    // Support explicit facing direction from directional key stack (most recent key has priority)
    if (params.facingDirection) {
      this.lastDirection = params.facingDirection;
    } else {
      const { moveX, moveY, speed } = this.parameters;
      if (speed > 0.05 || Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1) {
        if (Math.abs(moveX) > Math.abs(moveY)) {
          this.lastDirection = moveX > 0 ? 'right' : 'left';
        } else {
          this.lastDirection = moveY > 0 ? 'up' : 'down';
        }
      }
    }
  }

  // Evaluate transitions and update state
  update(deltaSeconds) {
    this.stateTimer += deltaSeconds;

    // Check transitions from current state or "AnyState"
    for (const transition of this.transitions) {
      if (transition.from === this.currentStateId || transition.from === 'AnyState') {
        // Run -> Idle transition: provide a 100ms grace period so switching
        // between WASD directions doesn't cause a momentary drop/hitch into Idle
        const isRunToIdle = transition.id === 't_run_to_idle' || (transition.from === 'Run' && transition.to === 'Idle');
        if (isRunToIdle) {
          if (this.parameters.speed <= 0.1) {
            this.idleGraceTimer = (this.idleGraceTimer || 0) + deltaSeconds;
            if (this.idleGraceTimer < 0.10) {
              continue; // Stay in Run during grace period while switching keys
            }
          } else {
            this.idleGraceTimer = 0;
            continue;
          }
        }

        if (this.evaluateConditions(transition.conditions)) {
          // Reset trigger parameters when transition executes
          for (const cond of (transition.conditions || [])) {
            if (this.parameterTypes[cond.param] === 'Trigger' || cond.param === 'isAttacking') {
              this.parameters[cond.param] = false;
            }
          }
          // If transitioning out of action state, reset attack trigger
          if (this.currentStateId === 'Action' && transition.to !== 'Action') {
            this.parameters.isAttacking = false;
          }
          if (this.currentStateId !== transition.to) {
            this.currentStateId = transition.to;
            this.stateTimer = 0;
            this.idleGraceTimer = 0;
          }
          break;
        }
      }
    }

    // Auto-timeout for one-shot action states
    const currentState = this.states[this.currentStateId];
    if (currentState && currentState.type === 'OneShot' && this.stateTimer >= (currentState.duration || 0.5)) {
      this.parameters.isAttacking = false;
      // Reset any active triggers
      for (const [key, type] of Object.entries(this.parameterTypes)) {
        if (type === 'Trigger') {
          this.parameters[key] = false;
        }
      }
      this.currentStateId = currentState.returnState || 'Idle';
      this.stateTimer = 0;
      this.idleGraceTimer = 0;
    }

    return this.getCurrentClip();
  }

  evaluateConditions(conditions) {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(cond => {
      const val = this.parameters[cond.param];
      const isBoolValue = typeof cond.value === 'boolean' || cond.value === 'true' || cond.value === 'false';
      const isBoolType = this.parameterTypes?.[cond.param] === 'Bool' || this.parameterTypes?.[cond.param] === 'Trigger';

      if (isBoolValue || isBoolType) {
        const targetBool = cond.value === true || cond.value === 'true';
        const currentBool = Boolean(val);
        if (cond.operator === '!=') return currentBool !== targetBool;
        return currentBool === targetBool;
      }

      const numVal = Number(val !== undefined ? val : 0);
      const numTarget = Number(cond.value);

      switch (cond.operator) {
        case '>': return numVal > numTarget;
        case '>=': return numVal >= numTarget;
        case '<': return numVal < numTarget;
        case '<=': return numVal <= numTarget;
        case '==': return numVal === numTarget;
        case '!=': return numVal !== numTarget;
        default: return false;
      }
    });
  }

  // Resolve current active frame or clip sequence based on state and direction
  getCurrentClip() {
    const state = this.states[this.currentStateId];
    if (!state) return null;

    const dir = this.lastDirection || 'down';

    if (state.type === 'BlendSpace2D') {
      // 1. Try resolving dynamically from cached clipIds
      const clipId = state.clipIds?.[dir];
      if (clipId) {
        const cached = this._resolvedAnimMap.get(clipId);
        if (cached && cached.frames.length > 0) {
          return {
            stateId: this.currentStateId,
            direction: dir,
            clip: cached.frames,
            fps: cached.fps,
            loop: cached.loop,
            animId: clipId
          };
        }
      }

      // 2. Fallback to static clip array
      const dirClips = state.clips || {};
      const clip = dirClips[dir] || dirClips['down'] || Object.values(dirClips)[0];
      return {
        stateId: this.currentStateId,
        direction: dir,
        clip: clip || null,
        fps: state.fps || 10,
        loop: true
      };
    }

    if (state.type === 'OneShot') {
      // 1. Try resolving dynamically from cached clipId
      if (state.clipId) {
        const cached = this._resolvedAnimMap.get(state.clipId);
        if (cached && cached.frames.length > 0) {
          return {
            stateId: this.currentStateId,
            direction: dir,
            clip: cached.frames,
            fps: cached.fps,
            loop: cached.loop,
            animId: state.clipId
          };
        }
      }

      return {
        stateId: this.currentStateId,
        direction: dir,
        clip: state.clip || null,
        fps: state.fps || 10,
        loop: false
      };
    }

    return {
      stateId: this.currentStateId,
      direction: dir,
      clip: state.clip || null,
      fps: state.fps || 10,
      loop: true
    };
  }
}

// Generate default character state machine from sliced frames or animations
export function createDefaultCharacterGraph(frames = [], animations = []) {
  const frameMap = new Map(frames.map(f => [f.id, f]));
  const resolveAnim = (pattern) => {
    const found = animations.find(a => a.name.toLowerCase().includes(pattern.toLowerCase()));
    return found ? { anim: found, frames: found.frameIds.map(id => frameMap.get(id)).filter(Boolean) } : null;
  };

  const idleDown = resolveAnim('idle_down') || resolveAnim('idle');
  const idleUp = resolveAnim('idle_up') || idleDown;
  const idleRight = resolveAnim('idle_right') || idleDown;
  const idleLeft = resolveAnim('idle_left') || idleDown;

  const runDown = resolveAnim('run_down') || resolveAnim('run');
  const runUp = resolveAnim('run_up') || runDown;
  const runRight = resolveAnim('run_right') || runDown;
  const runLeft = resolveAnim('run_left') || runDown;

  const actionClip = resolveAnim('action') || resolveAnim('hurt') || resolveAnim('attack') || resolveAnim('death');

  // If animations match dedicated multi-sheet clips (Idle, Run, Action)
  if (idleDown && runDown) {
    return {
      name: 'Character State Machine',
      parameters: {
        speed: 0.0,
        moveX: 0.0,
        moveY: -1.0,
        isAttacking: false,
        is_attacked: false
      },
      parameterTypes: {
        speed: 'Float',
        moveX: 'Float',
        moveY: 'Float',
        isAttacking: 'Trigger',
        is_attacked: 'Bool'
      },
      defaultState: 'Idle',
      anyStatePosition: { x: 50, y: 50 },
      entryPosition: { x: 50, y: 170 },
      states: {
        Idle: {
          id: 'Idle',
          name: 'Idle',
          type: 'BlendSpace2D',
          position: { x: 260, y: 170 },
          clips: {
            down: idleDown.frames,
            up: idleUp.frames,
            right: idleRight.frames,
            left: idleLeft.frames
          },
          clipIds: {
            down: idleDown.anim?.id,
            up: idleUp.anim?.id,
            right: idleRight.anim?.id,
            left: idleLeft.anim?.id
          }
        },
        Run: {
          id: 'Run',
          name: 'Run (4-Way Locomotion)',
          type: 'BlendSpace2D',
          position: { x: 550, y: 170 },
          clips: {
            down: runDown.frames,
            up: runUp.frames,
            right: runRight.frames,
            left: runLeft.frames
          },
          clipIds: {
            down: runDown.anim?.id,
            up: runUp.anim?.id,
            right: runRight.anim?.id,
            left: runLeft.anim?.id
          }
        },
        Action: {
          id: 'Action',
          name: 'Action / Hurt',
          type: 'OneShot',
          duration: 0.45,
          returnState: 'Idle',
          position: { x: 400, y: 320 },
          clip: actionClip?.frames || runRight.frames.slice(0, 4),
          clipId: actionClip?.anim?.id || runRight.anim?.id
        }
      },
      transitions: [
        {
          id: 't_idle_to_run',
          from: 'Idle',
          to: 'Run',
          name: 'Start Moving',
          conditions: [{ param: 'speed', operator: '>', value: 0.1 }]
        },
        {
          id: 't_run_to_idle',
          from: 'Run',
          to: 'Idle',
          name: 'Stop Moving',
          conditions: [{ param: 'speed', operator: '<=', value: 0.1 }]
        },
        {
          id: 't_anystate_to_action',
          from: 'AnyState',
          to: 'Action',
          name: 'Trigger Action',
          conditions: [{ param: 'isAttacking', operator: '==', value: true }]
        }
      ]
    };
  }

  const rows = groupFramesByRows(frames);

  // If we have at least 4 rows (e.g. 4-way walk/run: Down, Up, Right, Left)
  if (rows.length >= 4) {
    const downRun = rows[0];
    const upRun = rows[1];
    const rightRun = rows[2];
    const leftRun = rows[3];

    const findAnimForRow = (rowFrames) => {
      const firstId = rowFrames[0]?.id;
      return animations.find(a => a.frameIds && a.frameIds.includes(firstId));
    };

    const animDown = findAnimForRow(downRun) || animations.find(a => a.name.includes('down'));
    const animUp = findAnimForRow(upRun) || animations.find(a => a.name.includes('up'));
    const animRight = findAnimForRow(rightRun) || animations.find(a => a.name.includes('right'));
    const animLeft = findAnimForRow(leftRun) || animations.find(a => a.name.includes('left'));

    return {
      name: 'Fox Character Graph',
      parameters: {
        speed: 0.0,
        moveX: 0.0,
        moveY: -1.0,
        isAttacking: false,
        is_attacked: false
      },
      parameterTypes: {
        speed: 'Float',
        moveX: 'Float',
        moveY: 'Float',
        isAttacking: 'Trigger',
        is_attacked: 'Bool'
      },
      defaultState: 'Idle',
      anyStatePosition: { x: 50, y: 50 },
      entryPosition: { x: 50, y: 170 },
      states: {
        Idle: {
          id: 'Idle',
          name: 'Idle',
          type: 'BlendSpace2D',
          position: { x: 260, y: 170 },
          clips: {
            down: [downRun[0]],
            up: [upRun[0]],
            right: [rightRun[0]],
            left: [leftRun[0]]
          }
        },
        Run: {
          id: 'Run',
          name: 'Run (4-Way Locomotion)',
          type: 'BlendSpace2D',
          position: { x: 550, y: 170 },
          clips: {
            down: downRun,
            up: upRun,
            right: rightRun,
            left: leftRun
          },
          clipIds: {
            down: animDown?.id,
            up: animUp?.id,
            right: animRight?.id,
            left: animLeft?.id
          }
        },
        Action: {
          id: 'Action',
          name: 'Action / Attack',
          type: 'OneShot',
          duration: 0.45,
          returnState: 'Idle',
          position: { x: 400, y: 320 },
          clip: rightRun.slice(0, 4)
        }
      },
      transitions: [
        {
          id: 't_idle_to_run',
          from: 'Idle',
          to: 'Run',
          name: 'Start Moving',
          conditions: [{ param: 'speed', operator: '>', value: 0.1 }]
        },
        {
          id: 't_run_to_idle',
          from: 'Run',
          to: 'Idle',
          name: 'Stop Moving',
          conditions: [{ param: 'speed', operator: '<=', value: 0.1 }]
        },
        {
          id: 't_anystate_to_action',
          from: 'AnyState',
          to: 'Action',
          name: 'Trigger Action',
          conditions: [{ param: 'isAttacking', operator: '==', value: true }]
        }
      ]
    };
  }

  // Fallback for generic frame sets
  const half = Math.max(1, Math.floor(frames.length / 2));
  return {
    name: 'Generic Character Graph',
    parameters: {
      speed: 0.0,
      moveX: 0.0,
      moveY: -1.0,
      isAttacking: false,
      is_attacked: false
    },
    parameterTypes: {
      speed: 'Float',
      moveX: 'Float',
      moveY: 'Float',
      isAttacking: 'Trigger',
      is_attacked: 'Bool'
    },
    defaultState: 'Idle',
    anyStatePosition: { x: 50, y: 50 },
    entryPosition: { x: 50, y: 170 },
    states: {
      Idle: {
        id: 'Idle',
        name: 'Idle',
        type: 'BlendSpace2D',
        position: { x: 260, y: 170 },
        clips: {
          down: frames.slice(0, 1),
          up: frames.slice(0, 1),
          right: frames.slice(0, 1),
          left: frames.slice(0, 1)
        }
      },
      Run: {
        id: 'Run',
        name: 'Run',
        type: 'BlendSpace2D',
        position: { x: 550, y: 170 },
        clips: {
          down: frames.slice(0, half),
          up: frames.slice(half),
          right: frames.slice(0, half),
          left: frames.slice(half)
        }
      },
      Action: {
        id: 'Action',
        name: 'Action',
        type: 'OneShot',
        duration: 0.4,
        returnState: 'Idle',
        position: { x: 400, y: 320 },
        clip: frames.slice(0, 2)
      }
    },
    transitions: [
      {
        id: 't_idle_to_run',
        from: 'Idle',
        to: 'Run',
        conditions: [{ param: 'speed', operator: '>', value: 0.1 }]
      },
      {
        id: 't_run_to_idle',
        from: 'Run',
        to: 'Idle',
        conditions: [{ param: 'speed', operator: '<=', value: 0.1 }]
      },
      {
        id: 't_any_to_action',
        from: 'AnyState',
        to: 'Action',
        conditions: [{ param: 'isAttacking', operator: '==', value: true }]
      }
    ]
  };
}

// Graph manipulation helpers for interactive Unity-style editor
export function addTransitionToGraph(graph, from, to) {
  const newTransition = {
    id: `t_${from.toLowerCase()}_to_${to.toLowerCase()}_${Date.now()}`,
    from,
    to,
    name: `${from} -> ${to}`,
    conditions: [{ param: 'speed', operator: '>', value: 0.1 }]
  };

  return {
    ...graph,
    transitions: [...(graph.transitions || []), newTransition]
  };
}

export function removeTransitionFromGraph(graph, transitionId) {
  return {
    ...graph,
    transitions: (graph.transitions || []).filter(t => t.id !== transitionId)
  };
}

export function updateTransitionInGraph(graph, transitionId, updates) {
  return {
    ...graph,
    transitions: (graph.transitions || []).map(t =>
      t.id === transitionId ? { ...t, ...updates } : t
    )
  };
}

export function addStateToGraph(graph, stateData) {
  const id = stateData.id || `State_${Date.now().toString(36)}`;
  return {
    ...graph,
    states: {
      ...graph.states,
      [id]: {
        id,
        name: stateData.name || id,
        type: 'SingleClip',
        position: stateData.position || { x: 350, y: 220 },
        ...stateData
      }
    }
  };
}

export function removeStateFromGraph(graph, stateId) {
  if (stateId === graph.defaultState || stateId === 'AnyState') return graph;
  const newStates = { ...graph.states };
  delete newStates[stateId];

  return {
    ...graph,
    states: newStates,
    transitions: (graph.transitions || []).filter(t => t.from !== stateId && t.to !== stateId)
  };
}

// Parameter management helpers for Unity Mecanim style parameters
export function addParameterToGraph(graph, paramName, paramType = 'Float', defaultValue = 0.0) {
  const name = (paramName || '').trim();
  if (!name) return graph;

  let finalVal = defaultValue;
  if (paramType === 'Bool' || paramType === 'Trigger') {
    finalVal = defaultValue === true || defaultValue === 'true';
  } else if (paramType === 'Int') {
    finalVal = parseInt(defaultValue, 10) || 0;
  } else {
    finalVal = parseFloat(defaultValue) || 0.0;
  }

  return {
    ...graph,
    parameters: {
      ...(graph.parameters || {}),
      [name]: finalVal
    },
    parameterTypes: {
      ...(graph.parameterTypes || {}),
      [name]: paramType
    }
  };
}

export function removeParameterFromGraph(graph, paramName) {
  if (!paramName) return graph;

  const newParams = { ...(graph.parameters || {}) };
  delete newParams[paramName];

  const newTypes = { ...(graph.parameterTypes || {}) };
  delete newTypes[paramName];

  return {
    ...graph,
    parameters: newParams,
    parameterTypes: newTypes
  };
}

export function updateParameterInGraph(graph, oldName, { name, type, defaultValue } = {}) {
  if (!oldName) return graph;
  const targetName = (name || oldName).trim();
  if (!targetName) return graph;

  const newParams = { ...(graph.parameters || {}) };
  const newTypes = { ...(graph.parameterTypes || {}) };

  const currentType = type || newTypes[oldName] || (typeof newParams[oldName] === 'boolean' ? 'Bool' : 'Float');
  let finalVal = defaultValue !== undefined ? defaultValue : newParams[oldName];
  if (currentType === 'Bool' || currentType === 'Trigger') {
    finalVal = finalVal === true || finalVal === 'true';
  } else if (currentType === 'Int') {
    finalVal = parseInt(finalVal, 10) || 0;
  } else {
    finalVal = parseFloat(finalVal) || 0.0;
  }

  if (oldName !== targetName) {
    delete newParams[oldName];
    delete newTypes[oldName];
  }
  newParams[targetName] = finalVal;
  newTypes[targetName] = currentType;

  // Also update any transitions referring to oldName if renamed
  let newTransitions = graph.transitions || [];
  if (oldName !== targetName) {
    newTransitions = newTransitions.map(t => ({
      ...t,
      conditions: (t.conditions || []).map(c => c.param === oldName ? { ...c, param: targetName } : c)
    }));
  }

  return {
    ...graph,
    parameters: newParams,
    parameterTypes: newTypes,
    transitions: newTransitions
  };
}

// Export Schema Generator for Game Engines
export function generateEngineGraphExport(graphConfig, engine = 'unity') {
  if (engine === 'unity') {
    return JSON.stringify({
      schema: 'Unity.Mecanim.AnimatorController',
      name: graphConfig.name || 'CharacterAnimatorController',
      parameters: Object.entries(graphConfig.parameters || {}).map(([key, val]) => {
        const explicitType = graphConfig.parameterTypes?.[key];
        const inferredType = typeof val === 'boolean' ? 'Bool' : typeof val === 'number' ? 'Float' : 'Trigger';
        return {
          name: key,
          type: explicitType || inferredType,
          defaultValue: val
        };
      }),
      layers: [
        {
          name: 'Base Layer',
          weight: 1.0,
          stateMachine: {
            entryState: graphConfig.defaultState || 'Idle',
            states: Object.entries(graphConfig.states || {}).map(([id, s]) => ({
              name: s.name || id,
              type: s.type === 'BlendSpace2D' ? 'BlendTree2D' : 'Motion',
              blendTree: s.type === 'BlendSpace2D' ? {
                blendType: '2D Simple Directional',
                parameters: ['moveX', 'moveY'],
                motions: [
                  { direction: [0, -1], clip: `${id}_Down` },
                  { direction: [0, 1], clip: `${id}_Up` },
                  { direction: [1, 0], clip: `${id}_Right` },
                  { direction: [-1, 0], clip: `${id}_Left` }
                ]
              } : null
            })),
            transitions: (graphConfig.transitions || []).map(t => ({
              fromState: t.from,
              toState: t.to,
              conditions: (t.conditions || []).map(c => ({
                parameter: c.param,
                mode: c.operator === '>' ? 'Greater' : c.operator === '<=' ? 'Less' : 'Equals',
                threshold: c.value
              }))
            }))
          }
        }
      ]
    }, null, 2);
  }

  if (engine === 'godot') {
    return JSON.stringify({
      schema: 'Godot.AnimationNodeStateMachine',
      version: '4.x',
      parameters: graphConfig.parameters || {},
      root: {
        type: 'AnimationNodeStateMachine',
        nodes: Object.entries(graphConfig.states || {}).map(([id, s]) => ({
          node_name: id,
          type: s.type === 'BlendSpace2D' ? 'AnimationNodeBlendSpace2D' : 'AnimationNodeAnimation',
          blend_space: s.type === 'BlendSpace2D' ? {
            blend_point_0: { pos: [0, 1], animation: `${id}_up` },
            blend_point_1: { pos: [0, -1], animation: `${id}_down` },
            blend_point_2: { pos: [1, 0], animation: `${id}_right` },
            blend_point_3: { pos: [-1, 0], animation: `${id}_left` }
          } : null
        })),
        transitions: (graphConfig.transitions || []).map(t => ({
          from: t.from,
          to: t.to,
          advance_condition: t.conditions?.map(c => `${c.param} ${c.operator} ${c.value}`).join(' && ') || ''
        }))
      }
    }, null, 2);
  }

  // Universal Web Game format (Phaser.js / PixiJS)
  return JSON.stringify({
    schema: 'Universal.SpriteStateMachine.v1',
    character: 'PlayerCharacter',
    graph: graphConfig
  }, null, 2);
}
