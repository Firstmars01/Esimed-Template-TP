# Esimed Template TP

**Branch for submission:** `Projet-Rally`

## Description
This is a template project for a WebGPU assignment using `three/webgpu`.  
It includes scene management, JSON import/export, GLTF model loading, ground, skybox, and directional lighting setup.

## Prerequisites
- Node.js (v16+ recommended)
- npm
- Browser with WebGPU support (e.g., Chrome Canary or experimental build)

## Installation
1. Clone the repository and switch to the submission branch:
   ```bash
   git clone https://github.com/Firstmars01/Esimed-Template-TP.git
   cd Esimed-Template-TP
   git checkout Projet-Rally

2. Install dependencies :  
   `npm install`
3. Run the development server :  
   `npm run dev`

### Project Structure
- `src/` \: Source code
- `src/core/Scene.js` \: Scene management (ground, lighting, import\/export)
- `src/managers/ModelLoader.js` \: Model loading and material creation
- `public/` \: Static assets (skybox textures, GLTF models, etc.)

### Main Features
- WebGPU rendering via `three/webgpu`
- Loading and caching of GLTF models
- Import/export of scene data in JSON (positions, rotations, scales)
- Ground material setup with textures (diffuse, normal, ARM maps)
- Skybox management
- Directional lighting (sun) controls
- Dynamic UI for scene and object manipulation via `lil-gui`

### Usage

- Open the project in a browser with WebGPU support.
- From the main menu, you can:
  -    `Play` — Launch the game scene
  - `Editor` — Open the scene editor to create or modify maps

- In-game menu allows:
  - Switching maps
  - Changing cars
  - Viewing controls

- Editor menu allows:
  - Selecting, moving, rotating, scaling, duplicating, or deleting objects
  - Camera movement controls

- Scoreboard tracks best times per track.

### Notes

- All scenes and object transformations are saved in JSON for export/import.
- Car and map models are loaded dynamically from the public/models folder.
- Ensure your browser supports WebGPU; otherwise, the app may not render correctly.