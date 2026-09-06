import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Gamepad2,
  Camera,
  Compass,
  RotateCcw,
  Sun,
  Sliders,
  ChevronRight,
  Move,
  Play,
  Pause,
  Layers,
  Sparkles,
  Maximize2
} from 'lucide-react';

export function SceneModule({
  sheets = [],
  sheetMap = new Map(),
  frames = [],
  animations = [],
  activeAnimationId = null
}) {
  const mountRef = useRef(null);
  const hudCanvasRef = useRef(null);

  // Environment themes: 'cyber' | 'dungeon' | 'forest' | 'studio'
  const [environment, setEnvironment] = useState('cyber');
  // Camera Mode: 'follow' (2.5D RPG) | 'orbit' (Free view)
  const [cameraMode, setCameraMode] = useState('follow');

  // Player Settings
  const [playerSpeed, setPlayerSpeed] = useState(4.5);
  const [characterScale, setCharacterScale] = useState(1.8);
  const [castShadows, setCastShadows] = useState(true);

  // Live HUD state (updated at 10hz or on change to prevent React re-render overhead)
  const [hudState, setHudState] = useState({
    state: 'IDLE',
    speed: 0,
    direction: 'down',
    posX: 0,
    posZ: 0,
    clipName: 'None'
  });

  // Animation selection
  const [selectedAnimId, setSelectedAnimId] = useState(activeAnimationId || animations[0]?.id || null);

  // Keyboard input tracking ref
  const keysRef = useRef({
    KeyW: false,
    KeyS: false,
    KeyA: false,
    KeyD: false,
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
  });

  // Character internal 3D state ref (avoid React state re-renders at 60fps)
  const playerRef = useRef({
    x: 0,
    z: 0,
    vx: 0,
    vz: 0,
    direction: 'down', // 'down' | 'up' | 'left' | 'right'
    state: 'IDLE', // 'IDLE' | 'RUN' | 'ACTION'
    actionTimer: 0,
    facingAngle: 0
  });

  // Scene references
  const sceneContextRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    characterMesh: null,
    characterTexture: null,
    characterCanvas: null,
    characterCtx: null,
    groundMesh: null,
    gridHelper: null,
    propGroup: null,
    lights: {},
    orbitControls: {
      isDragging: false,
      prevMouse: { x: 0, y: 0 },
      theta: Math.PI / 4,
      phi: Math.PI / 3,
      radius: 12
    },
    animFrameId: null,
    lastTime: performance.now(),
    animTimer: 0,
    currentFrameIndex: 0
  });

  // Sync selected animation
  useEffect(() => {
    if (activeAnimationId && animations.some((a) => a.id === activeAnimationId)) {
      setSelectedAnimId(activeAnimationId);
    } else if (animations.length > 0 && !selectedAnimId) {
      setSelectedAnimId(animations[0].id);
    }
  }, [activeAnimationId, animations]);

  // Keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code in keysRef.current) {
        keysRef.current[e.code] = true;
      }
      if (e.code === 'Space') {
        playerRef.current.state = 'ACTION';
        playerRef.current.actionTimer = 0.5; // 500ms action duration
      }
    };

    const handleKeyUp = (e) => {
      if (e.code in keysRef.current) {
        keysRef.current[e.code] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Set up Three.js 3D Sandbox Scene
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070a13);
    scene.fog = new THREE.FogExp2(0x070a13, 0.035);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 10, 14);
    camera.lookAt(0, 1, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    mount.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(12, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x3b82f6, 2, 20);
    pointLight.position.set(0, 4, 0);
    scene.add(pointLight);

    // 5. Ground Floor Mesh
    const groundGeo = new THREE.PlaneGeometry(60, 60, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f1624,
      roughness: 0.8,
      metalness: 0.2
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Ground Grid Helper
    const gridHelper = new THREE.GridHelper(60, 60, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // 6. Prop Group (Pillars, obstacles, props)
    const propGroup = new THREE.Group();
    scene.add(propGroup);

    // 7. Billboard Character Canvas Texture
    const charCanvas = document.createElement('canvas');
    charCanvas.width = 64;
    charCanvas.height = 64;
    const charCtx = charCanvas.getContext('2d');
    charCtx.imageSmoothingEnabled = false;

    const charTexture = new THREE.CanvasTexture(charCanvas);
    charTexture.magFilter = THREE.NearestFilter;
    charTexture.minFilter = THREE.NearestFilter;
    charTexture.generateMipmaps = false;

    const charGeo = new THREE.PlaneGeometry(1.5, 1.5);
    const charMat = new THREE.MeshStandardMaterial({
      map: charTexture,
      transparent: true,
      alphaTest: 0.1,
      roughness: 0.9,
      side: THREE.DoubleSide
    });

    const characterMesh = new THREE.Mesh(charGeo, charMat);
    characterMesh.position.set(0, 0.75, 0);
    characterMesh.castShadow = true;
    scene.add(characterMesh);

    // Character Shadow Decal (Blob shadow under character)
    const shadowGeo = new THREE.PlaneGeometry(1.1, 0.7);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 32;
    shadowCanvas.height = 32;
    const sCtx = shadowCanvas.getContext('2d');
    const grad = sCtx.createRadialGradient(16, 16, 2, 16, 16, 15);
    grad.addColorStop(0, 'rgba(0,0,0,0.6)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 32, 32);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.02;
    scene.add(shadowMesh);

    // Store in context ref
    sceneContextRef.current = {
      scene,
      camera,
      renderer,
      characterMesh,
      shadowMesh,
      characterTexture: charTexture,
      characterCanvas: charCanvas,
      characterCtx: charCtx,
      groundMesh,
      gridHelper,
      propGroup,
      lights: { ambientLight, dirLight, pointLight },
      orbitControls: {
        isDragging: false,
        prevMouse: { x: 0, y: 0 },
        theta: Math.PI / 4,
        phi: Math.PI / 3,
        radius: 12
      },
      animFrameId: null,
      lastTime: performance.now(),
      animTimer: 0,
      currentFrameIndex: 0
    };

    // Resize Handler
    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Mouse Drag for Orbit Camera
    const handleMouseDown = (e) => {
      if (cameraMode !== 'orbit' && e.button !== 2) return;
      sceneContextRef.current.orbitControls.isDragging = true;
      sceneContextRef.current.orbitControls.prevMouse = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      const oc = sceneContextRef.current.orbitControls;
      if (!oc.isDragging) return;
      const deltaX = e.clientX - oc.prevMouse.x;
      const deltaY = e.clientY - oc.prevMouse.y;
      oc.prevMouse = { x: e.clientX, y: e.clientY };

      oc.theta -= deltaX * 0.008;
      oc.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, oc.phi - deltaY * 0.008));
    };

    const handleMouseUp = () => {
      sceneContextRef.current.orbitControls.isDragging = false;
    };

    const handleWheel = (e) => {
      if (cameraMode === 'orbit') {
        const oc = sceneContextRef.current.orbitControls;
        oc.radius = Math.max(4, Math.min(30, oc.radius + e.deltaY * 0.015));
      }
    };

    mount.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    mount.addEventListener('wheel', handleWheel, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      mount.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      mount.removeEventListener('wheel', handleWheel);

      if (sceneContextRef.current.animFrameId) {
        cancelAnimationFrame(sceneContextRef.current.animFrameId);
      }
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Environment Theme
  useEffect(() => {
    const ctx = sceneContextRef.current;
    if (!ctx.scene) return;

    const { scene, groundMesh, gridHelper, propGroup, lights } = ctx;

    // Clear old props
    while (propGroup.children.length > 0) {
      const child = propGroup.children[0];
      propGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    if (environment === 'cyber') {
      scene.background.setHex(0x070a13);
      scene.fog.color.setHex(0x070a13);
      groundMesh.material.color.setHex(0x0a101d);
      gridHelper.visible = true;
      gridHelper.material.color.setHex(0x3b82f6);

      lights.ambientLight.color.setHex(0xa5b4fc);
      lights.ambientLight.intensity = 0.8;
      lights.dirLight.color.setHex(0x60a5fa);
      lights.dirLight.intensity = 1.6;
      lights.pointLight.color.setHex(0x06b6d4);

      // Add Cyber Neon Pillars
      const pillarGeo = new THREE.BoxGeometry(0.8, 4, 0.8);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: 0x0284c7,
        emissiveIntensity: 0.3,
        roughness: 0.3
      });

      const positions = [
        [-6, 2, -6], [6, 2, -6], [-6, 2, 6], [6, 2, 6],
        [-10, 2, 0], [10, 2, 0], [0, 2, -10], [0, 2, 10]
      ];

      positions.forEach(([px, py, pz]) => {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(px, py, pz);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        propGroup.add(pillar);
      });
    } else if (environment === 'dungeon') {
      scene.background.setHex(0x0f0b08);
      scene.fog.color.setHex(0x0f0b08);
      groundMesh.material.color.setHex(0x1c1510);
      gridHelper.visible = true;
      gridHelper.material.color.setHex(0x78350f);

      lights.ambientLight.color.setHex(0xfef3c7);
      lights.ambientLight.intensity = 0.6;
      lights.dirLight.color.setHex(0xf59e0b);
      lights.dirLight.intensity = 1.4;
      lights.pointLight.color.setHex(0xd97706);

      // Add Stone Pillars & Chests
      const stoneGeo = new THREE.CylinderGeometry(0.7, 0.8, 3.5, 8);
      const stoneMat = new THREE.MeshStandardMaterial({
        color: 0x44403c,
        roughness: 0.9
      });

      [[-5, 1.75, -5], [5, 1.75, -5], [-5, 1.75, 5], [5, 1.75, 5]].forEach(([x, y, z]) => {
        const p = new THREE.Mesh(stoneGeo, stoneMat);
        p.position.set(x, y, z);
        p.castShadow = true;
        p.receiveShadow = true;
        propGroup.add(p);
      });
    } else if (environment === 'forest') {
      scene.background.setHex(0x061a14);
      scene.fog.color.setHex(0x061a14);
      groundMesh.material.color.setHex(0x064e3b);
      gridHelper.visible = false;

      lights.ambientLight.color.setHex(0xd1fae5);
      lights.ambientLight.intensity = 0.9;
      lights.dirLight.color.setHex(0x34d399);
      lights.dirLight.intensity = 1.5;
      lights.pointLight.color.setHex(0x10b981);

      // Add low poly trees
      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 2, 6);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
      const foliageGeo = new THREE.ConeGeometry(1.6, 3, 6);
      const foliageMat = new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.7 });

      const treeCoords = [
        [-7, -5], [7, -6], [-6, 6], [8, 5], [-11, 2], [11, -2], [2, -10]
      ];

      treeCoords.forEach(([tx, tz]) => {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1;
        trunk.castShadow = true;
        tree.add(trunk);

        const foliage = new THREE.Mesh(foliageGeo, foliageMat);
        foliage.position.y = 3;
        foliage.castShadow = true;
        tree.add(foliage);

        tree.position.set(tx, 0, tz);
        propGroup.add(tree);
      });
    } else {
      // Studio Theme
      scene.background.setHex(0x090d16);
      scene.fog.color.setHex(0x090d16);
      groundMesh.material.color.setHex(0x111827);
      gridHelper.visible = true;
      gridHelper.material.color.setHex(0x475569);

      lights.ambientLight.color.setHex(0xffffff);
      lights.ambientLight.intensity = 1.1;
      lights.dirLight.color.setHex(0xffffff);
      lights.dirLight.intensity = 2.0;
      lights.pointLight.color.setHex(0x3b82f6);
    }
  }, [environment]);

  // Update Character Scale & Shadow Cast
  useEffect(() => {
    const ctx = sceneContextRef.current;
    if (ctx.characterMesh) {
      ctx.characterMesh.scale.set(characterScale, characterScale, characterScale);
      ctx.characterMesh.position.y = (characterScale * 1.5) / 2;
      ctx.characterMesh.castShadow = castShadows;
    }
    if (ctx.shadowMesh) {
      ctx.shadowMesh.scale.set(characterScale, characterScale, 1);
    }
  }, [characterScale, castShadows]);

  // Helper to find the best matching animation clip based on state & direction
  const resolveAnimationClip = useCallback(() => {
    const player = playerRef.current;
    if (animations.length === 0) return null;

    const dir = player.direction;
    const isMoving = player.state === 'RUN';
    const isAction = player.state === 'ACTION';

    if (isAction) {
      // Look for Hurt, Attack, Action animation
      const actionClip = animations.find(
        (a) =>
          a.name.toLowerCase().includes('hurt') ||
          a.name.toLowerCase().includes('attack') ||
          a.name.toLowerCase().includes('action')
      );
      if (actionClip) return actionClip;
    }

    if (isMoving) {
      // Look for Run/Walk with direction
      const runDirClip = animations.find((a) => {
        const name = a.name.toLowerCase();
        return (
          (name.includes('run') || name.includes('walk')) &&
          (name.includes(dir) ||
            (dir === 'down' && name.includes('south')) ||
            (dir === 'up' && name.includes('north')) ||
            (dir === 'right' && name.includes('east')) ||
            (dir === 'left' && name.includes('west')))
        );
      });
      if (runDirClip) return runDirClip;

      // Generic Run or Walk
      const runGeneric = animations.find(
        (a) => a.name.toLowerCase().includes('run') || a.name.toLowerCase().includes('walk')
      );
      if (runGeneric) return runGeneric;
    } else {
      // Look for Idle with direction
      const idleDirClip = animations.find((a) => {
        const name = a.name.toLowerCase();
        return (
          name.includes('idle') &&
          (name.includes(dir) ||
            (dir === 'down' && name.includes('south')) ||
            (dir === 'up' && name.includes('north')) ||
            (dir === 'right' && name.includes('east')) ||
            (dir === 'left' && name.includes('west')))
        );
      });
      if (idleDirClip) return idleDirClip;

      // Generic Idle
      const idleGeneric = animations.find((a) => a.name.toLowerCase().includes('idle'));
      if (idleGeneric) return idleGeneric;
    }

    // Default to selected animation
    return animations.find((a) => a.id === selectedAnimId) || animations[0];
  }, [animations, selectedAnimId]);

  // Main 60 FPS Three.js Game Loop
  useEffect(() => {
    const ctx = sceneContextRef.current;
    if (!ctx.renderer) return;

    let hudTimer = 0;

    const animate = (time) => {
      ctx.animFrameId = requestAnimationFrame(animate);

      const dt = Math.min((time - ctx.lastTime) / 1000, 0.1);
      ctx.lastTime = time;

      const keys = keysRef.current;
      const player = playerRef.current;

      // 1. Process Input & Direction
      let dx = 0;
      let dz = 0;

      if (keys.KeyW || keys.ArrowUp) dz -= 1;
      if (keys.KeyS || keys.ArrowDown) dz += 1;
      if (keys.KeyA || keys.ArrowLeft) dx -= 1;
      if (keys.KeyD || keys.ArrowRight) dx += 1;

      // Action timer countdown
      if (player.actionTimer > 0) {
        player.actionTimer -= dt;
        if (player.actionTimer <= 0) {
          player.state = 'IDLE';
        }
      }

      // Movement vector
      const len = Math.hypot(dx, dz);
      if (len > 0) {
        dx /= len;
        dz /= len;
        player.vx = dx * playerSpeed;
        player.vz = dz * playerSpeed;

        if (player.actionTimer <= 0) {
          player.state = 'RUN';
        }

        // Determine facing direction
        if (Math.abs(dx) > Math.abs(dz)) {
          player.direction = dx > 0 ? 'right' : 'left';
        } else {
          player.direction = dz > 0 ? 'down' : 'up';
        }
      } else {
        // Decelerate smoothly
        player.vx *= 0.7;
        player.vz *= 0.7;
        if (Math.hypot(player.vx, player.vz) < 0.05) {
          player.vx = 0;
          player.vz = 0;
          if (player.actionTimer <= 0) {
            player.state = 'IDLE';
          }
        }
      }

      // Update position with boundaries [-25, 25]
      player.x = Math.max(-25, Math.min(25, player.x + player.vx * dt));
      player.z = Math.max(-25, Math.min(25, player.z + player.vz * dt));

      // 2. Update 3D Character Mesh & Shadow
      if (ctx.characterMesh && ctx.shadowMesh) {
        ctx.characterMesh.position.x = player.x;
        ctx.characterMesh.position.z = player.z;

        ctx.shadowMesh.position.x = player.x;
        ctx.shadowMesh.position.z = player.z;

        // Billboard orientation: Character faces camera in Y-axis
        if (ctx.camera) {
          ctx.characterMesh.rotation.y = ctx.camera.rotation.y;
        }
      }

      // 3. Camera Position Tracking
      if (ctx.camera) {
        if (cameraMode === 'follow') {
          // 2.5D Isometric RPG Follow Camera
          const targetCamX = player.x;
          const targetCamY = 8;
          const targetCamZ = player.z + 11;

          ctx.camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.08);
          ctx.camera.lookAt(player.x, 1, player.z);
        } else {
          // Orbit Camera centered on player or origin
          const oc = ctx.orbitControls;
          const camX = player.x + oc.radius * Math.sin(oc.phi) * Math.sin(oc.theta);
          const camY = Math.max(1, oc.radius * Math.cos(oc.phi));
          const camZ = player.z + oc.radius * Math.sin(oc.phi) * Math.cos(oc.theta);

          ctx.camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.15);
          ctx.camera.lookAt(player.x, 0.75, player.z);
        }
      }

      // 4. Billboard Sprite Animation Frame Update
      const clip = resolveAnimationClip();
      if (clip && clip.frameIds && clip.frameIds.length > 0) {
        const speed = clip.speed || 8;
        ctx.animTimer += dt;
        const frameDuration = 1 / speed;

        if (ctx.animTimer >= frameDuration) {
          ctx.animTimer = 0;
          ctx.currentFrameIndex = (ctx.currentFrameIndex + 1) % clip.frameIds.length;
        }

        const currentFrameId = clip.frameIds[ctx.currentFrameIndex] || clip.frameIds[0];
        const frameData = frames.find((f) => f.id === currentFrameId);

        if (frameData && ctx.characterCanvas && ctx.characterCtx) {
          const sheet = sheetMap.get(frameData.sheetId) || sheets[0];
          const img = sheet?.imageElement;

          if (img && img.complete) {
            // Resize canvas if needed
            if (
              ctx.characterCanvas.width !== frameData.w ||
              ctx.characterCanvas.height !== frameData.h
            ) {
              ctx.characterCanvas.width = frameData.w;
              ctx.characterCanvas.height = frameData.h;
              ctx.characterCtx.imageSmoothingEnabled = false;

              if (ctx.characterMesh) {
                const aspect = frameData.w / Math.max(1, frameData.h);
                ctx.characterMesh.scale.set(characterScale * aspect, characterScale, characterScale);
              }
            }

            ctx.characterCtx.clearRect(0, 0, frameData.w, frameData.h);
            ctx.characterCtx.drawImage(
              img,
              frameData.x,
              frameData.y,
              frameData.w,
              frameData.h,
              0,
              0,
              frameData.w,
              frameData.h
            );

            ctx.characterTexture.needsUpdate = true;
          }
        }
      }

      // 5. Update HUD state at 10 Hz
      hudTimer += dt;
      if (hudTimer >= 0.1) {
        hudTimer = 0;
        setHudState({
          state: player.state,
          speed: Math.hypot(player.vx, player.vz).toFixed(1),
          direction: player.direction,
          posX: player.x.toFixed(1),
          posZ: player.z.toFixed(1),
          clipName: clip?.name || 'None'
        });
      }

      // 6. Render 3D Scene
      ctx.renderer.render(ctx.scene, ctx.camera);
    };

    ctx.animFrameId = requestAnimationFrame(animate);

    return () => {
      if (ctx.animFrameId) {
        cancelAnimationFrame(ctx.animFrameId);
      }
    };
  }, [cameraMode, playerSpeed, resolveAnimationClip, frames, sheetMap, sheets]);

  // Reset player position to center
  const handleResetPosition = () => {
    playerRef.current.x = 0;
    playerRef.current.z = 0;
    playerRef.current.vx = 0;
    playerRef.current.vz = 0;
  };

  // Virtual Joypad Action triggers
  const triggerVirtualKey = (key, isDown) => {
    keysRef.current[key] = isDown;
    if (isDown && key === 'Space') {
      playerRef.current.state = 'ACTION';
      playerRef.current.actionTimer = 0.5;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070a13] overflow-hidden relative select-none">
      {/* Top 3D Scene Control Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-white/10 text-slate-200 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎮</span>
            <div>
              <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                3D Scene & Game Demo Sandbox
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
                  60 FPS
                </span>
              </span>
              <span className="text-[10px] text-slate-400 block">
                Billboard 2.5D character driven by Animator state machine
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-white/10 mx-1" />

          {/* Environment Theme Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded border border-white/10">
            <span className="text-[10px] font-mono text-slate-400 px-1">Theme:</span>
            {[
              { id: 'cyber', label: 'Cyber Grid' },
              { id: 'dungeon', label: 'Dungeon' },
              { id: 'forest', label: 'Forest' },
              { id: 'studio', label: 'Studio' }
            ].map((env) => (
              <button
                key={env.id}
                onClick={() => setEnvironment(env.id)}
                className={`text-[10px] px-2 py-0.5 rounded transition-all ${
                  environment === env.id
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {env.label}
              </button>
            ))}
          </div>

          {/* Camera Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded border border-white/10">
            <span className="text-[10px] font-mono text-slate-400 px-1">Camera:</span>
            <button
              onClick={() => setCameraMode('follow')}
              className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 ${
                cameraMode === 'follow'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera size={11} />
              <span>2.5D Follow</span>
            </button>
            <button
              onClick={() => setCameraMode('orbit')}
              className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 ${
                cameraMode === 'orbit'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass size={11} />
              <span>Orbit Cam</span>
            </button>
          </div>
        </div>

        {/* Right Settings & Reset */}
        <div className="flex items-center gap-3">
          {/* Active Clip Selector */}
          {animations.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[10px] text-slate-400">Preview Clip:</span>
              <select
                value={selectedAnimId || ''}
                onChange={(e) => setSelectedAnimId(e.target.value)}
                className="bg-slate-950 border border-white/15 rounded px-2 py-1 text-xs text-blue-300 font-mono focus:outline-none"
              >
                {animations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.frameIds.length}f)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Character Scale Slider */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[10px] text-slate-400">Scale:</span>
            <input
              type="range"
              min="0.8"
              max="3.5"
              step="0.1"
              value={characterScale}
              onChange={(e) => setCharacterScale(parseFloat(e.target.value))}
              className="w-16 accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded"
            />
            <span className="font-mono text-[10px] text-slate-300 w-7">{characterScale}x</span>
          </div>

          {/* Reset Position Button */}
          <button
            onClick={handleResetPosition}
            className="btn btn-secondary text-xs py-1 px-2 flex items-center gap-1"
            title="Reset player to (0, 0)"
          >
            <RotateCcw size={12} />
            <span>Reset Pos</span>
          </button>
        </div>
      </div>

      {/* The 3D WebGL Canvas Container */}
      <div ref={mountRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
        {/* Floating Top-Left HUD (Player State Machine Metrics) */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 p-3 rounded-xl bg-slate-900/85 backdrop-blur-md border border-white/10 shadow-2xl text-slate-200 pointer-events-none min-w-[200px]">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Gamepad2 size={13} className="text-blue-400" />
              Player HUD
            </span>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                hudState.state === 'RUN'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : hudState.state === 'ACTION'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
              }`}
            >
              {hudState.state}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] pt-1">
            <span className="text-slate-400">Direction:</span>
            <span className="font-mono text-amber-400 font-bold uppercase">{hudState.direction}</span>

            <span className="text-slate-400">Speed:</span>
            <span className="font-mono text-emerald-400">{hudState.speed} m/s</span>

            <span className="text-slate-400">Coords (X, Z):</span>
            <span className="font-mono text-slate-300">
              ({hudState.posX}, {hudState.posZ})
            </span>

            <span className="text-slate-400">Active Clip:</span>
            <span className="font-mono text-blue-300 truncate max-w-[90px]" title={hudState.clipName}>
              {hudState.clipName}
            </span>
          </div>

          {/* Health Bar Mockup for Game Feel */}
          <div className="flex flex-col gap-1 pt-1.5 border-t border-white/5">
            <div className="flex justify-between text-[9px] text-slate-400">
              <span>HP</span>
              <span className="font-mono text-rose-400">100 / 100</span>
            </div>
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/10">
              <div className="h-full bg-gradient-to-r from-rose-500 to-amber-500 w-full" />
            </div>
          </div>
        </div>

        {/* Floating Bottom-Right Keyboard Controls Legend */}
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2 p-3 rounded-xl bg-slate-900/85 backdrop-blur-md border border-white/10 shadow-2xl text-slate-300 pointer-events-auto">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
            <span>Controls</span>
            <span className="text-blue-400 font-mono">WASD / Space</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Directional WASD Grid */}
            <div className="flex flex-col items-center gap-1">
              <button
                onMouseDown={() => triggerVirtualKey('KeyW', true)}
                onMouseUp={() => triggerVirtualKey('KeyW', false)}
                className="w-8 h-8 rounded bg-slate-800 border border-white/15 active:bg-blue-600 active:text-white flex items-center justify-center font-bold text-xs shadow"
              >
                W
              </button>
              <div className="flex items-center gap-1">
                <button
                  onMouseDown={() => triggerVirtualKey('KeyA', true)}
                  onMouseUp={() => triggerVirtualKey('KeyA', false)}
                  className="w-8 h-8 rounded bg-slate-800 border border-white/15 active:bg-blue-600 active:text-white flex items-center justify-center font-bold text-xs shadow"
                >
                  A
                </button>
                <button
                  onMouseDown={() => triggerVirtualKey('KeyS', true)}
                  onMouseUp={() => triggerVirtualKey('KeyS', false)}
                  className="w-8 h-8 rounded bg-slate-800 border border-white/15 active:bg-blue-600 active:text-white flex items-center justify-center font-bold text-xs shadow"
                >
                  S
                </button>
                <button
                  onMouseDown={() => triggerVirtualKey('KeyD', true)}
                  onMouseUp={() => triggerVirtualKey('KeyD', false)}
                  className="w-8 h-8 rounded bg-slate-800 border border-white/15 active:bg-blue-600 active:text-white flex items-center justify-center font-bold text-xs shadow"
                >
                  D
                </button>
              </div>
            </div>

            {/* Action Button */}
            <button
              onMouseDown={() => triggerVirtualKey('Space', true)}
              onMouseUp={() => triggerVirtualKey('Space', false)}
              className="h-16 px-4 rounded-xl bg-gradient-to-b from-amber-500 to-amber-600 text-slate-950 font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-transform"
            >
              <Sparkles size={16} />
              <span>ACTION</span>
              <span className="text-[9px] opacity-75">(Space)</span>
            </button>
          </div>

          <div className="text-[9px] text-slate-400 text-center">
            {cameraMode === 'orbit' ? 'Drag mouse to rotate orbit camera' : '2.5D RPG camera automatically follows character'}
          </div>
        </div>
      </div>
    </div>
  );
}
