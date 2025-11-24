import * as THREE from 'three/webgpu';
import { Scene } from "../core/Scene.js";
import { Camera } from "../core/Camera.js";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { EditorUI } from './EditorUI.js';
import {loadGltf} from "../managers/ModelLoader.js";
import { Selection } from './Selection.js';
import { SceneManager } from '../managers/SceneManager.js';
import { groundTextures, skyboxFiles, modelList } from '../Param/Param.js';

export class Editor {

  constructor() {
    this.dragMode = false;
    this.dragYOffset = null;

    // Selection variables
    this.selectedObject = null;
    this.selectedMesh = null;
    this.selectedMeshMaterial = null;
    this.moveSelectedObject = false;
    this.rotateSelectedObject = false;
    this.scaleSelectedObject = false;
    this.startYRotation = 0;
    this.startScale = null;
    this.dragYOffset = null;

    // Keyboard movement
    this.keyboardMoveEnabled = false;
    this.keysPressed = {};
    this.keyboardSpeed = 0.5;

    // Renderer
    this.renderer = new THREE.WebGPURenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // Raycaster and mouse
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Scene and camera initialization
    this.scene = new Scene();

    // Create a SceneManager wrapper to handle import/export/clear
    this.sceneManager = new SceneManager(this.scene);

    this.scene.loadScene('/scenes/scene_1.json');
    this.camera = new Camera().camera;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.scene.addAmbientLight();
    this.scene.addDirectionalLight();
    this.scene.addDirectionalLightEditor();

    // Parameters
    this.initParams();
    this.scene.addGround(this.groundTexture[3], this.groundParams.repeats);
    this.scene.addSkybox(this.skyboxFiles[0]);

    // UI (via EditorUI wrapper)
    this.sunParams = { intensity: 2, x: 3, z: 0, color: '#ffffff' };
    this.editorUI = new EditorUI(this);

    // Shortcut for existing code
    this.ui = this.editorUI.ui;

    // Create Selection helper and pass editor reference
    this.selection = new Selection(this);

    // Bind event listeners (selection, keyboard, etc.)
    this.initEventListeners();

    // Example model list
    this.modelList = modelList;

    // Add object list to the UI after initializing EditorUI
    this.editorUI.addObjectList(this.modelList, this.addObject.bind(this));

    // Render loop
    this.renderer.setAnimationLoop(this.render.bind(this));
  }

  initParams() {
    this.groundTexture = groundTextures;
    this.groundParams = { texture: this.groundTexture[0], repeats: 500 };
    this.skyboxFiles = skyboxFiles;
    this.skyboxParams = { texture: this.skyboxFiles[0] };
  }

  // Function to add a model
  async addObject(modelName) {
    if (!this.scene || !modelName) return;

    // Load the model if needed
    if (!this.scene.loadedModels[modelName]) {
      this.scene.loadedModels[modelName] = await loadGltf(modelName);
    }

    const instance = this.scene.loadedModels[modelName].clone(true);
    instance.position.set(0, 0, 0);       // Initial position
    instance.userData.isSelectable = true; // Important for export
    instance.traverse(o => {
      if (o.isMesh) o.userData.isSelectable = true;
    });

    this.scene.scene.add(instance);
    console.log(`Object added: ${modelName}`);
  }

  initEventListeners() {
    // Click for selection -> delegated to Selection
    window.addEventListener('click', this.selection.onClick.bind(this.selection));

    // Mouse movement -> delegated to Selection
    window.addEventListener('mousemove', this.selection.onMouseMove.bind(this.selection));

    // Keyboard
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      this.keysPressed[key] = true;

      if (key === 'delete') this.selection.deleteSelectedObject();
      if (key === 'a') this.moveSelectedObject = !this.moveSelectedObject;

      // Prevent rotation if selected object has lockRotation
      if (key === 'r' && this.selectedObject && !this.selectedObject.userData?.lockRotation) {
        this.rotateSelectedObject = true;
        this.startYRotation = this.selectedObject.rotation.y;
      }

      if (key === 'e' && this.selectedObject) {
        this.scaleSelectedObject = true;
        this.startScale = this.selectedObject.scale.clone();
      }

      // Enable drag mode on key M
      if (key === 'm' && this.selectedObject) {
        this.dragMode = !this.dragMode;
        console.log(`Duplication mode ${this.dragMode ? 'enabled' : 'disabled'}`);

        if (this.dragMode) {
          // Clone the selected object
          this.dragObject = this.selectedObject.clone(true);
          this.dragObject.position.copy(this.selectedObject.position);
          this.dragObject.rotation.copy(this.selectedObject.rotation);
          this.dragObject.scale.copy(this.selectedObject.scale);

          // Restore original materials on clone (not red)
          this.dragObject.traverse(o => {
            if (o.isMesh) {
              const origMat = this.selectedMeshMaterial;
              o.material = Array.isArray(origMat)
                ? origMat.map(m => (m.clone ? m.clone() : m))
                : (origMat.clone ? origMat.clone() : origMat);
            }
          });

          // Add clone to scene
          this.scene.scene.add(this.dragObject);

          // Reset Y-offset
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

    // Export / Clear (delegated to SceneManager)
    window.addEventListener('exportScene', () => this.sceneManager?.exportScene(this.groundParams, this.skyboxParams));
    window.addEventListener('clearScene', () => this.sceneManager?.clearScene());
  }

  render() {
    // Keyboard movement
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
        this.controls.target.add(dir); // Update the target
      }
    }

    this.renderer.render(this.scene.scene, this.camera);
  }
}
