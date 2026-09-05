// Core Animation Graph & State Machine Engine for 2D Character Sprites
import { groupFramesByRows } from './animationClips';

export class CharacterStateMachine {
  constructor(config = {}) {
    this.parameters = {
      speed: 0.0,
      moveX: 0.0,
      moveY: -1.0, // Default facing down
      isAttacking: false,
      ...config.parameters
    };

    this.states = config.states || {};
    this.transitions = config.transitions || [];
    this.currentStateId = config.defaultState || 'Idle';
    this.lastDirection = 'down'; // 'down' | 'up' | 'right' | 'left'
    this.stateTimer = 0;
  }

  // Update parameters from input (e.g. keyboard / joystick)
  setParameters(params) {
    this.parameters = { ...this.parameters, ...params };

    // Update facing direction if movement is non-zero
    const { moveX, moveY, speed } = this.parameters;
    if (speed > 0.05 || Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1) {
      if (Math.abs(moveX) > Math.abs(moveY)) {
        this.lastDirection = moveX > 0 ? 'right' : 'left';
      } else {
        this.lastDirection = moveY > 0 ? 'up' : 'down';
      }
    }
  }

  // Evaluate transitions and update state
  update(deltaSeconds) {
    this.stateTimer += deltaSeconds;

    // Check transitions from current state or "AnyState"
    for (const transition of this.transitions) {
      if (transition.from === this.currentStateId || transition.from === 'AnyState') {
        if (this.evaluateConditions(transition.conditions)) {
          // If transitioning out of action state, reset attack trigger
          if (this.currentStateId === 'Action' && transition.to !== 'Action') {
            this.parameters.isAttacking = false;
          }
          this.currentStateId = transition.to;
          this.stateTimer = 0;
          break;
        }
      }
    }

    // Auto-timeout for one-shot action states
    const currentState = this.states[this.currentStateId];
    if (currentState && currentState.type === 'OneShot' && this.stateTimer >= (currentState.duration || 0.5)) {
      this.parameters.isAttacking = false;
      this.currentStateId = currentState.returnState || 'Idle';
      this.stateTimer = 0;
    }

    return this.getCurrentClip();
  }

  evaluateConditions(conditions) {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(cond => {
      const val = this.parameters[cond.param];
      switch (cond.operator) {
        case '>': return val > cond.value;
        case '>=': return val >= cond.value;
        case '<': return val < cond.value;
        case '<=': return val <= cond.value;
        case '==': return val === cond.value;
        case '!=': return val !== cond.value;
        default: return false;
      }
    });
  }

  // Resolve current active frame or clip sequence based on state and direction
  getCurrentClip() {
    const state = this.states[this.currentStateId];
    if (!state) return null;

    if (state.type === 'BlendSpace2D') {
      // Pick direction clip (down, up, right, left)
      const dirClips = state.clips || {};
      const clip = dirClips[this.lastDirection] || dirClips['down'] || Object.values(dirClips)[0];
      return {
        stateId: this.currentStateId,
        direction: this.lastDirection,
        clip: clip || null
      };
    }

    if (state.type === 'OneShot') {
      return {
        stateId: this.currentStateId,
        direction: this.lastDirection,
        clip: state.clip || null
      };
    }

    return {
      stateId: this.currentStateId,
      direction: this.lastDirection,
      clip: state.clip || null
    };
  }
}

// Generate default character state machine from sliced frames or animations
export function createDefaultCharacterGraph(frames = [], animations = []) {
  const frameMap = new Map(frames.map(f => [f.id, f]));
  const resolveAnim = (pattern) => {
    const found = animations.find(a => a.name.toLowerCase().includes(pattern.toLowerCase()));
    return found ? found.frameIds.map(id => frameMap.get(id)).filter(Boolean) : null;
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
        isAttacking: false
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
            down: idleDown,
            up: idleUp,
            right: idleRight,
            left: idleLeft
          }
        },
        Run: {
          id: 'Run',
          name: 'Run (4-Way Locomotion)',
          type: 'BlendSpace2D',
          position: { x: 550, y: 170 },
          clips: {
            down: runDown,
            up: runUp,
            right: runRight,
            left: runLeft
          }
        },
        Action: {
          id: 'Action',
          name: 'Action / Hurt',
          type: 'OneShot',
          duration: 0.45,
          returnState: 'Idle',
          position: { x: 400, y: 320 },
          clip: actionClip || runRight.slice(0, 4)
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

    return {
      name: 'Fox Character Graph',
      parameters: {
        speed: 0.0,
        moveX: 0.0,
        moveY: -1.0,
        isAttacking: false
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
      isAttacking: false
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

// Export Schema Generator for Game Engines
export function generateEngineGraphExport(graphConfig, engine = 'unity') {
  if (engine === 'unity') {
    return JSON.stringify({
      schema: 'Unity.Mecanim.AnimatorController',
      name: graphConfig.name || 'CharacterAnimatorController',
      parameters: Object.entries(graphConfig.parameters || {}).map(([key, val]) => ({
        name: key,
        type: typeof val === 'boolean' ? 'Bool' : typeof val === 'number' ? 'Float' : 'Trigger',
        defaultValue: val
      })),
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
