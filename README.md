# VoxCAD — Precision Voice-Controlled 3D & CAD Modeler

VoxCAD is a web-based, voice-first CAD modeling application that enables designers and engineers to create precise 3D solid geometry using natural speech instead of complex multi-click toolbars.

---

## Key Features

1. **Precision Speech Engine (CAD Lexicon Filtered):**
   * Eliminates common speech recognition errors (e.g. preserves *"counterbore"*, *"fillet"*, *"chamfer"*, exact millimetre measurements).
   * Spoken number normalizer converts words like *"twenty five point four millimeters"* to exact float values (`25.4mm`).

2. **"Point & Speak" Contextual Raycasting:**
   * Click any face or edge in the 3D viewport to bind context.
   * Speak relative commands like *"Extrude 25mm"* or *"Cut 12mm hole"* and the engine applies them directly to the selected face normal.

3. **Parametric Feature History:**
   * Every spoken command appends to a visible parametric feature tree.
   * Delete or modify earlier steps; the solid geometry automatically recomputes.
   * Full conversational **Undo** and **Redo** support (`Ctrl+Z` or speak *"Undo"*).

4. **Solid Engineering Exports:**
   * **`.STL`**: Download ready-to-print physical 3D mesh files for your slicer / 3D printer.
   * **`.OBJ`**: Standard 3D asset export for Blender, Unreal Engine, or WebGL.
   * **Python CAD (`build123d`)**: Copy-pasteable parametric code backed by the OpenCASCADE kernel (the same standard powering SolidWorks, FreeCAD, and Fusion 360).

5. **AI Audio Feedback (Text-to-Speech):**
   * VoxCAD talks back to confirm design steps or ask clarifying questions when dimensions are ambiguous.

---

## Getting Started

### 1. Launching the Local Server
From the project folder, run:

```bash
python server.py
```

Then open your browser to:
```
http://localhost:8080
```

*(Note: Chrome, Edge, or Brave are recommended for full Web Speech API and WebGL support).*

---

## Example Spoken Commands

| Command | Action |
| :--- | :--- |
| `"Create a plate 120 by 80 by 15 mm"` | Generates a 120×80×15mm base solid plate |
| `"Cut a 25mm hole through the center"` | Performs a boolean subtraction through the solid |
| `"Add a 30mm cylinder on top"` | Creates and attaches a cylinder feature to the top |
| `"Extrude 20mm"` *(with face selected)* | Extrudes the clicked face outwards by 20mm |
| `"Chamfer edges by 3mm"` | Applies a 3mm chamfer bevel |
| `"Make it metallic brass"` | Changes material appearance to machined brass |
| `"Top view"` / `"Isometric view"` | Adjusts viewport camera angle |
| `"Toggle wireframe"` | Switches between shaded and wireframe mesh view |
| `"Undo last step"` | Reverts the previous feature |
