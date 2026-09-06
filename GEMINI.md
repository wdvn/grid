# G.R.I.D. Studio — Project Rules & Guidelines

Dự án **G.R.I.D. (Graphics Rendering for Independent Developers)** tuân thủ hệ thống quy chuẩn thiết kế và kiến trúc 3 Module:

## 1. Kiến trúc 3 Module chính
- **Creator Module**: Công cụ tạo, vẽ và biến đổi assets (sprite sheet generator, pixelated filter, palette remapping, dithering).
- **Animator Module**: Toàn bộ hệ thống hiện có (cắt frame đa sheet, Godot SpriteFrames timeline dock, Unity Mecanim visual state machine, live 60fps character preview).
- **Scene Module (3D Demo)**: Đưa các nhân vật 2D/2.5D dạng Billboard vào môi trường 3D tương tác (Three.js/WebGL), chạy bằng State Machine của Animator.

## 2. Quy chuẩn Thiết kế & Thành phần (Design System)
Chi tiết đầy đủ các quy tắc thành phần, bảng màu, typography, CSS tokens, canvas pixelated rendering và quy tắc hiệu năng 60 FPS được định nghĩa chi tiết tại:
👉 [.agents/rules/system-design.md](file:///home/mypc/projects/noname/.agents/rules/system-design.md)

### Tóm tắt nhanh:
- **Tone màu**: Dark-mode game studio IDE (`#070a13`, `#0f1624`, slate-900, glassmorphism `blur(16px)`).
- **Màu nhấn ngữ nghĩa**:
  - Blue (`#3b82f6`): Primary action, active tab, transition.
  - Emerald (`#10b981`): Playback running, Entry node.
  - Amber (`#f59e0b`): Action space button, pivot feet, drag port.
  - Purple (`#8b5cf6`): Bool/Trigger param, brand accent.
  - Rose (`#f43f5e`): Delete, danger.
  - Cyan (`#06b6d4`): AnyState, Int param.
- **Phông chữ**: UI dùng `'Plus Jakarta Sans'`, kỹ thuật / số đo / code / kbd dùng `'JetBrains Mono'`.
- **Pixel Art**: Luôn áp dụng `image-rendering: pixelated;` và `ctx.imageSmoothingEnabled = false`.
- **Hiệu năng**: Các tác vụ 60 FPS (preview loop, canvas draw, 3D render loop) bắt buộc sử dụng `useRef` + `requestAnimationFrame`, không đặt trong React state.
