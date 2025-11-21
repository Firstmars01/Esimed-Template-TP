import * as THREE from 'three/webgpu';
import { Scene } from "./scene.js";
import { Camera } from "./camera.js";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { UI } from './iu.js';
import {loadGltf} from "./tools.js";

export class Editor {

  constructor() {
    this.dragMode = false;       // true si on veut déplacer l'objet avec la souris
    this.dragYOffset = null;     // pour maintenir la hauteur relative


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

    // Paramètres
    this.initParams();
    this.scene.addGround(this.groundTexture[3], this.groundParams.repeats);
    this.scene.addSkybox(this.skyboxFiles[0]);

    // UI
    this.ui = new UI();
    this.ui.addSkyboxUI(this.skyboxFiles, this.skyboxParams, this.scene.addSkybox.bind(this.scene));
    this.ui.addGroundUI(this.groundTexture, this.groundParams, this.scene.changeGround.bind(this.scene));
    this.sunParams = { intensity: 2, x: 3, z: 0, color: '#ffffff' };
    this.ui.addSunUI(this.sunParams, this.scene.changeSun.bind(this.scene));
    this.ui.addSelectionUI();

    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json,application/json';
    importInput.style.display = 'none';
    document.body.appendChild(importInput);

    importInput.addEventListener('change', async (event) => {
      if (this.scene?.importScene) {
        await this.scene.importScene(event, {
          skybox: this.skyboxParams,
          ground: this.groundParams,
        });
      }
      importInput.value = '';
    });

    this.ui.addFunction(() => importInput.click());
    this.ui.addKeyboardControlOption(this);

    // Event listeners
    this.initEventListeners();

    // Exemple de liste de modèles
    this.modelList = ['Bush', 'Bush red', 'Forest', 'Log', 'Resource Gold', 'Tree', 'Twister Tree', 'Road'];

    // Après avoir initialisé UI
    this.ui.addObjectFromListUI(this.modelList, this.addObject.bind(this));

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
    // Clic pour sélection
    window.addEventListener('click', this.onClick.bind(this));

    // Déplacement souris
    window.addEventListener('mousemove', this.onMouseMove.bind(this));

    // Clavier
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      this.keysPressed[key] = true;

      if (key === 'delete') this.deleteSelectedObject();
      if (key === 'a') this.moveSelectedObject = !this.moveSelectedObject;
      if (key === 'r' && this.selectedObject) {
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

  deleteSelectedObject() {
    if (!this.selectedObject) return;
    this.selectedObject.traverse(child => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
    this.scene.scene.remove(this.selectedObject);
    this.clearSelection();
    console.log('Objet supprimé');
  }

  clearSelection() {
    if (this.selectedMesh && this.selectedMeshMaterial) {
      this.selectedMesh.material = this.selectedMeshMaterial;
    }
    this.selectedObject = null;
    this.selectedMesh = null;
    this.selectedMeshMaterial = null;
    if (this.ui) this.ui.updateSelection(null);
  }

  onClick(event) {
    if (!this.raycaster || !this.camera) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.scene.children, true);
    if (!intersects.length) return this.clearSelection();

    const hit = intersects.find(i => i.object.userData?.isSelectable) || null;
    if (!hit) return this.clearSelection(); // si rien de sélectionnable, clear
    const mesh = hit.object;

    let top = mesh;
    while (top.parent && top.parent !== this.scene.scene) top = top.parent;

    // Restaurer ancien matériau
    if (this.selectedMesh && this.selectedMeshMaterial) this.selectedMesh.material = this.selectedMeshMaterial;

    // Cloner matériau
    const origMat = mesh.material;
    this.selectedMeshMaterial = Array.isArray(origMat)
      ? origMat.map(m => (m?.clone ? m.clone() : m))
      : (origMat?.clone ? origMat.clone() : origMat);

    this.selectedMesh = mesh;
    this.selectedObject = top;

    // Remplacer par matériau rouge
    mesh.material = Array.isArray(this.selectedMeshMaterial)
      ? this.selectedMeshMaterial.map(() => new THREE.MeshBasicMaterial({ color: 0xff0000 }))
      : new THREE.MeshBasicMaterial({ color: 0xff0000 });

    if (this.ui) {
      this.ui.updateSelection({
        name: top.name || 'Inconnu',
        posX: top.position.x, posY: top.position.y, posZ: top.position.z,
        rotX: top.rotation.x, rotY: top.rotation.y, rotZ: top.rotation.z,
        scaleX: top.scale.x, scaleY: top.scale.y, scaleZ: top.scale.z
      });
    }
  }

  onMouseMove(event) {
    if (!this.selectedObject) return;

    if (this.dragMode && this.dragObject) {
      if (!this._groundPlane) this._groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
      const point = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this._groundPlane, point)) {
        if (this.dragYOffset === null) this.dragYOffset = this.dragObject.position.y - point.y;
        this.dragObject.position.set(point.x, point.y + this.dragYOffset, point.z);

        // Mettre à jour l'UI si besoin
        if (this.ui) {
          this.ui.updateSelection({
            name: this.dragObject.name || 'Inconnu',
            posX: this.dragObject.position.x,
            posY: this.dragObject.position.y,
            posZ: this.dragObject.position.z,
            rotX: this.dragObject.rotation.x,
            rotY: this.dragObject.rotation.y,
            rotZ: this.dragObject.rotation.z,
            scaleX: this.dragObject.scale.x,
            scaleY: this.dragObject.scale.y,
            scaleZ: this.dragObject.scale.z
          });
        }
      }
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (!this._groundPlane) this._groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
    const point = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this._groundPlane, point)) return;

    // Déplacement
    if (this.moveSelectedObject) {
      if (this.dragYOffset === null) this.dragYOffset = this.selectedObject.position.y - point.y;
      this.selectedObject.position.set(point.x, point.y + this.dragYOffset, point.z);
    }

    // Rotation
    if (this.rotateSelectedObject) {
      const deltaX = event.movementX || 0;
      this.selectedObject.rotation.y = this.startYRotation + deltaX * 0.01;
    }

    // Scale
    if (this.scaleSelectedObject) {
      const deltaY = event.movementY || 0;
      const factor = 1 + deltaY * 0.01;
      this.selectedObject.scale.set(
        this.startScale.x * factor,
        this.startScale.y * factor,
        this.startScale.z * factor
      );
    }

    if (this.ui) {
      this.ui.updateSelection({
        name: this.selectedObject.name || 'Inconnu',
        posX: this.selectedObject.position.x,
        posY: this.selectedObject.position.y,
        posZ: this.selectedObject.position.z,
        rotX: this.selectedObject.rotation.x,
        rotY: this.selectedObject.rotation.y,
        rotZ: this.selectedObject.rotation.z,
        scaleX: this.selectedObject.scale.x,
        scaleY: this.selectedObject.scale.y,
        scaleZ: this.selectedObject.scale.z
      });
    }
  }
}
