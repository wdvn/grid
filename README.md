# G.R.I.D. — Graphics Rendering for Independent Developers

[![License: BSD 3-Clause](https://img.shields.io/badge/License-BSD_3--Clause-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)](https://react.dev)
[![Vite 8](https://img.shields.io/badge/Vite-8-646cff.svg?logo=vite)](https://vite.dev)

**G.R.I.D.** (**G**raphics **R**endering for **I**ndependent **D**evelopers) is a modern, high-performance web-based suite for 2D game developers. It brings together visual sprite sheet slicing, a Godot-style SpriteFrames dock, an interactive Unity Mecanim-inspired animation state machine, and a live playable character controller.

---

## ✨ Features

### ✂️ Visual Sprite Sheet Slicer
- **Interactive Bounding Box Selection**: Click and drag on canvas to define custom frame bounds with pixel precision.
- **Smart Shortcuts**:
  - `Ctrl + D`: Duplicate selected frame.
  - `Delete` / `Backspace`: Remove selected frame.
  - `Escape`: Deselect.
  - Mouse wheel zoom & pan canvas controls.
- **Auto Grid Slicer**: Slice by Rows × Columns or fixed Cell Dimensions with custom padding, offset, and margin.
- **Auto Sprite Detection**: Intelligent alpha-channel contour detection algorithm for non-uniform sprites.
- **Pivot Point Editor**: Configure pivot anchors (`Top-Left`, `Center`, `Bottom-Center`, or custom normalized coordinates).

### 🎬 Godot-Style SpriteFrames Dock (Bottom Timeline)
- **Split 2-Column Architecture**:
  - **Left (Animations List)**: Create, duplicate, rename (inline double-click), search, and delete animation clips with loop toggles and frame count badges. Auto-generates standard 4-way sequences (`run_down`, `run_up`, `run_right`, `run_left`) and `default`.
  - **Right (Animation Frames Track)**: Individual frame cards with thumbnail preview, frame index, duration multiplier, reordering (`←` / `→`), and remove controls.
- **Direct Dock Player**: Preview animations directly inside the bottom dock with Play/Pause controls and FPS speed adjustment.
- **Bi-directional Sync**: Canvas frame selections can be instantly added to any active animation clip with `+ Add Selected Frame`.

### ⚡ Unity Mecanim-Inspired Animation Graph & State Machine
- **Node-Based Visual Editor**: Drag & drop animation states (`Entry`, `AnyState`, `Idle`, `Run`, `Action`, custom clips) across an infinite technical grid canvas.
- **Dynamic Transition Rules**: Drag from state ports to create transition curves with configurable conditions (`speed`, `moveX`, `moveY`, `isAttacking`).
- **Live State Pulse**: Visual pulsating border and progress bar tracking the active state in real-time during gameplay.

### 🎮 Playable Character Controller Arena
- **Real-Time 2D Controller**: Test your sprites immediately in stationary or free-walk arena modes.
- **Dynamic WASD & Arrow Key Sync**: Active glowing feedback on directional controls and Spacebar action triggers.
- **Strict 1:1 Pixel Aspect Ratio**: Eliminates sprite distortion and subpixel stretching.

### 📦 Import & Export Suite
- **Import Sheet Atlas & Frame Aliases**:
  - Load existing atlas metadata from **TexturePacker** (Hash & Array formats), **Phaser 3**, **Aseprite** (including `frameTags` animation import), **Unity Sprite Atlas**, and custom **Frame Alias Maps**.
  - Upload JSON atlas with an optional companion sprite sheet image, or paste raw JSON directly.
  - Choose between replacing or appending to current frame sequences.
- **Engine State Machine Exporter**: Export state graphs directly formatted for:
  - **Unity Mecanim** (`AnimatorController` schema with 2D BlendTree)
  - **Godot 4.x** (`AnimationNodeStateMachine` + `AnimationNodeBlendSpace2D` schema)
  - **Universal / Phaser.js** (Standard JSON state machine)
- **Asset Exporter**:
  - Download sliced frames as a ZIP archive of individual PNGs.
  - Export Atlas JSON (Phaser 3 / Unity / Godot compatible metadata).

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm / yarn

### Installation

```bash
# Clone repository
git clone git@github.com:wdvn/grid.git
cd grid

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

---

## 🛠️ Built With

- **React 19**
- **Vite**
- **Vanilla CSS & TailwindCSS**
- **Lucide Icons**
- **JSZip & Canvas Confetti**

---

## 📄 License

This project is licensed under the **BSD 3-Clause License** - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2026, **wdvn** <nguyenthanhluynd@gmail.com>.
