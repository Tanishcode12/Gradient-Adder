# Gradient-Adder
Gradient Adder is a lightweight browser-based image tool built with vanilla JavaScript and the HTML5 Canvas API. It lets users load images, select colors, and apply customizable linear or radial gradients in real time. The app preserves image detail, supports transparent PNG export, and runs fully client-side with no external libraries or backend.
---
## Features

- Image loading via file upload, URL, or clipboard paste
- Background handling:
  - Keep original
  - Remove background (transparent PNG)
  - Replace with solid color
- Color rule system:
  - Pick colors directly from the image
  - Adjustable tolerance per rule
  - Per-rule gradients or shared “leader” gradients
- Gradient rendering:
  - Linear or radial gradients
  - Adjustable angle
  - Optional mirrored (A–B–A) gradients
- Surface effects:
  - Bevel and emboss depth simulation
  - Glossy highlight finish
  - Brushed metallic effect
- Detail preservation to retain luminance and texture
- Real-time preview with optimized rendering
- Export as high-quality 32-bit PNG with transparency

---
## How to Use

1. Load an image using:
- File upload
- Image URL

2. Choose a background mode (keep, transparent, or solid color).
3. Click or drag on the canvas to sample colors and create color rules.
4. Adjust gradient colors, tolerance, angles, and grouping behavior.
5. Apply surface effects such as bevel, gloss, or metallic finishes.
6. Export the result as a high-quality PNG.
---
## Technical Notes
- Built with vanilla JavaScript and HTML5 Canvas
- Uses ImageData manipulation for pixel-level control
- Gradient data is cached for performance
- Rendering is throttled using requestAnimationFrame
- All processing happens client-side; images never leave the browser
---
## Technical Notes
- Built with vanilla JavaScript and HTML5 Canvas
- Uses ImageData manipulation for pixel-level control
- Gradient data is cached for performance
- Rendering is throttled using requestAnimationFrame
- All processing happens client-side; images never leave the browser
---
## Limitations
- Large images may impact performance due to pixel-level processing
- Background removal is color-distance based, not AI-based
- No undo/redo history (yet)
---
## Possible Future Improvements
- undo / redo stack
- Preset saving and loading
- Web Worker offloading for large images
- AI-assisted background detection
