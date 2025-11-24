# Esimed-Template-TP

Description
- Template de TP pour rendu WebGPU avec `three/webgpu`.
- Gestion de scène, import/export JSON, chargement de modèles GLTF, sol, skybox et éclairage directionnel.

Prérequis
- Node.js (version 16+ recommandée)
- npm
- Navigateur avec support WebGPU (ex. Chrome Canary ou build expérimental)

Installation
1. Cloner le dépôt et se placer sur la branche Projet-Rally :  
   ```bash
   git clone https://github.com/Firstmars01/Esimed-Template-TP.git
   cd Esimed-Template-TP
   git checkout Projet-Rally
2. Installer les dépendances :  
   `npm install`
3. Lancer le serveur de développement :  
   `npm run dev`

Structure du projet
- `src/` \: code source
- `src/core/Scene.js` \: gestion de la scène, sol, lumière, import\/export
- `src/managers/ModelLoader.js` \: chargement et création de matériaux
- `public/` \: assets statiques (skybox, modèles, etc.)

Fonctionnalités principales
- Rendu WebGPU via `three/webgpu`
- Chargement et mise en cache de modèles GLTF
- Import\/export de la scène au format JSON (positions, rotations, échelles)
