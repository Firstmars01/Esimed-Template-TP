import * as THREE from 'three/webgpu';
import { Scene } from "../core/scene.js";
import { Camera } from "../core/camera.js";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { EditorUI } from './editorUI.js';
import {loadGltf} from "../managers/modelLoader.js";
import { Selection } from './Selection.js';

export class Editor {

  constructor() {
    this.dragMode = false;
    this.dragYOffset = null;


    // Variables de sélection
    this.selectedObject = null;
    this.selectedMesh = null;
    this.selectedMeshMaterial = null;
    this.moveSelectedObject = false;
    this.rotateSelectedObject = false;
    this.scaleSelectedObject = false;
    this.startYRotation = 0;
    this.startScale = null;
    this.dragYOffset = null;

    // Déplacement clavier
    this.keyboardMoveEnabled = false;
    this.keysPressed = {};
    this.keyboardSpeed = 0.5;

    // Renderer
    this.renderer = new THREE.WebGPURenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // Raycaster et souris
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Initialisation de la scène et de la caméra
    this.scene = new Scene();
    this.scene.loadScene('/scenes/scene_1.json');
    this.camera = new Camera().camera;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.scene.addAmbientLight();
    this.scene.addDirectionalLight();
    this.scene.addDirectionalLightEditor();


    // Paramètres
    this.initParams();
    this.scene.addGround(this.groundTexture[3], this.groundParams.repeats);
    this.scene.addSkybox(this.skyboxFiles[0]);


    // UI (via EditorUI wrapper)
    this.sunParams = { intensity: 2, x: 3, z: 0, color: '#ffffff' };
    this.editorUI = new EditorUI(this);
    // keep shortcut for existing code
    this.ui = this.editorUI.ui;

    // Create Selection helper and pass editor reference
    this.selection = new Selection(this);

    // Lier les écouteurs d'événements (sélection, clavier etc.)
    this.initEventListeners();

    // Exemple de liste de modèles
    this.modelList = ['Start', 'Finish', 'Bush', 'Bush red', 'Forest', 'Log', 'Resource Gold', 'Tree', 'Twisted Tree'];

    // Après avoir initialisé UI via EditorUI
    this.editorUI.addObjectList(this.modelList, this.addObject.bind(this));

    // Boucle de rendu
    this.renderer.setAnimationLoop(this.render.bind(this));
  }

  initParams() {
    this.groundTexture = ['aerial_grass_rock','brown_mud_leaves_01','forest_floor','forrest_ground_01','gravelly_sand'];
    this.groundParams = { texture: this.groundTexture[0], repeats: 500 };
    this.skyboxFiles = ['DaySkyHDRI019A_2K-TONEMAPPED','DaySkyHDRI050A_2K-TONEMAPPED','NightSkyHDRI009_2K-TONEMAPPED', 'citrus_orchard_road_puresky'];
    this.skyboxParams = { texture: this.skyboxFiles[0] };
  }

  // Fonction pour ajouter le modèle
  async addObject(modelName) {
    if (!this.scene || !modelName) return;

    // Charger le modèle si nécessaire
    if (!this.scene.loadedModels[modelName]) {
      this.scene.loadedModels[modelName] = await loadGltf(modelName);
    }

    const instance = this.scene.loadedModels[modelName].clone(true);
    instance.position.set(0, 0, 0);       // position initiale
    instance.userData.isSelectable = true; // important pour l'export
    instance.traverse(o => {
      if (o.isMesh) o.userData.isSelectable = true;
    });

    this.scene.scene.add(instance);
    console.log(`Objet ajouté : ${modelName}`);
  }


  initEventListeners() {
    // Clic pour sélection -> déléguer à selection
    window.addEventListener('click', this.selection.onClick.bind(this.selection));

    // Déplacement souris -> déléguer à selection
    window.addEventListener('mousemove', this.selection.onMouseMove.bind(this.selection));

    // Clavier
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      this.keysPressed[key] = true;

      if (key === 'delete') this.selection.deleteSelectedObject();
      if (key === 'a') this.moveSelectedObject = !this.moveSelectedObject;
      // Empêcher la rotation si l'objet sélectionné a lockRotation
      if (key === 'r' && this.selectedObject && !this.selectedObject.userData?.lockRotation) {
        this.rotateSelectedObject = true;
        this.startYRotation = this.selectedObject.rotation.y;
      }
      if (key === 'e' && this.selectedObject) {
        this.scaleSelectedObject = true;
        this.startScale = this.selectedObject.scale.clone();
      }

      //activer le mode drag sur touche M ---
      if (key === 'm' && this.selectedObject) {
        this.dragMode = !this.dragMode;
        console.log(`Mode duplication ${this.dragMode ? 'activé' : 'désactivé'}`);

        if (this.dragMode) {
          // Cloner l'objet sélectionné
          this.dragObject = this.selectedObject.clone(true);
          this.dragObject.position.copy(this.selectedObject.position);
          this.dragObject.rotation.copy(this.selectedObject.rotation);
          this.dragObject.scale.copy(this.selectedObject.scale);

          // Restaurer les matériaux d'origine du clone (pas rouge)
          this.dragObject.traverse(o => {
            if (o.isMesh) {
              const origMat = this.selectedMeshMaterial;
              o.material = Array.isArray(origMat)
                ? origMat.map(m => (m.clone ? m.clone() : m))
                : (origMat.clone ? origMat.clone() : origMat);
            }
          });

          // Ajouter le clone à la scène
          this.scene.scene.add(this.dragObject);

          // Réinitialiser le Y offset
          this.dragYOffset = null;
        } else {
          this.dragObject = null;
        }
      }


    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      this.keysPressed[key] = false;
      if (key === 'r') this.rotateSelectedObject = false;
      if (key === 'e') this.scaleSelectedObject = false;
    });

    // Export / Clear
    window.addEventListener('exportScene', () => this.scene?.exportScene(this.groundParams, this.skyboxParams));
    window.addEventListener('clearScene', () => this.scene?.clearScene());
  }

  render() {
    // Déplacement clavier
    if (this.keyboardMoveEnabled) {
      const dir = new THREE.Vector3();
      const forward = new THREE.Vector3();
      const right = new THREE.Vector3();

      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      right.crossVectors(forward, this.camera.up).normalize();

      if (this.keysPressed['z']) dir.add(forward);
      if (this.keysPressed['s']) dir.sub(forward);
      if (this.keysPressed['q']) dir.sub(right);
      if (this.keysPressed['d']) dir.add(right);
      if (this.keysPressed[' ']) dir.y += 1;
      if (this.keysPressed['shift']) dir.y -= 1;

      if (dir.lengthSq() > 0) {
        dir.normalize().multiplyScalar(this.keyboardSpeed);
        this.camera.position.add(dir);
        this.controls.target.add(dir); // <— mettre à jour le target
      }
    }



    this.renderer.render(this.scene.scene, this.camera);
  }
}
