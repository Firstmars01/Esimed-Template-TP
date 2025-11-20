import * as THREE from 'three/webgpu'
import {Scene} from "./scene.js";
import {Camera} from "./camera.js";
import {OrbitControls} from "three/examples/jsm/Addons.js";
import { UI } from './iu.js';

//a faire Déplacement d’objets

export class Application {

  constructor() {
    this.selectedObject = null;
    this.selectedMesh = null;
    this.selectedMeshMaterial = null;
    this.moveSelectedObject = false;

    // Création du renderer UNE seule fois
    this.renderer = new THREE.WebGPURenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // Raycaster et souris
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.keyboardMoveEnabled = false;
    this.keysPressed = {};
    this.keyboardSpeed = 0.5;

    this.rotateSelectedObject = false;  // pour activer la rotation
    this.scaleSelectedObject = false;   // pour activer le scaling
    this.startYRotation = 0;            // rotation initiale
    this.startScale = null;             // échelle initiale

    window.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'delete' && this.selectedObject) {
        this.scene.remove(this.selectedObject); // supprime de la scène
        this.selectedObject.traverse(child => {
          if (child.isMesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
        this.selectedObject = null;
        this.selectedMesh = null;
        this.selectedMeshMaterial = null;

        if (this.ui) this.ui.updateSelection(null);
        console.log('Objet supprimé');
      }
    });



    // Exemple : activer rotation/scaling avec touches R et E
    window.addEventListener('keydown', (event) => {
      if (!this.selectedObject) return;
      const key = event.key.toLowerCase();
      if (key === 'r') {
        this.rotateSelectedObject = true;
        this.startYRotation = this.selectedObject.rotation.y;
      } else if (key === 'e') {
        this.scaleSelectedObject = true;
        this.startScale = this.selectedObject.scale.clone();
      }
    });

    window.addEventListener('keyup', (event) => {
      const key = event.key.toLowerCase();
      if (key === 'r') this.rotateSelectedObject = false;
      if (key === 'e') this.scaleSelectedObject = false;
    });


    window.addEventListener('keydown', (e) => {
      this.keysPressed[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed[e.key.toLowerCase()] = false;
    });


    // Event listener pour la sélection
    window.addEventListener('click', this.onClick.bind(this));

    window.addEventListener('keydown', (event) => {
      if (event.key && event.key.toLowerCase() === 'q') {
        this.moveSelectedObject = !this.moveSelectedObject;
        console.log(`Déplacement de l'objet ${this.moveSelectedObject ? 'activé' : 'désactivé'}`);
      }
    });

    window.addEventListener('exportScene', () => {
      if (this.scene && typeof this.scene.exportScene === 'function') {
        this.scene.exportScene(this.groundParams, this.skyboxParams);
      } else {
        console.warn('exportScene non disponible sur la scène');
      }
    });

    window.addEventListener('clearScene', () => {
      if (this.scene && typeof this.scene.clearScene === 'function') {
        this.scene.clearScene();
      }
    });

    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json,application/json';
    importInput.style.display = 'none';
    document.body.appendChild(importInput);

    importInput.addEventListener('change', async (event) => {
      if (this.scene && typeof this.scene.importScene === 'function') {
        await this.scene.importScene(event, {
          skybox: this.skyboxParams,
          ground: this.groundParams,
        });
      }
      importInput.value = '';
    });



    // Pour le déplacement de l’objet
    this.dragYOffset = null;
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));

    // Scene et caméra
    this.scene = new Scene();
    this.scene.loadScene('/scenes/scene_1.json');

    this.camera = new Camera().camera;
    this.scene.addAmbiantLight();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.scene.addDirectionalLight();

    this.initParams();
    this.scene.addGround(this.groundTexture[3], this.groundParams.repeats);
    this.scene.addSkybox(this.skyboxFiles[0]);

    // Interface UI
    this.ui = new UI();
    this.ui.addSkyboxUI(this.skyboxFiles, this.skyboxParams, this.scene.addSkybox.bind(this.scene));
    this.ui.addGroundUI(this.groundTexture, this.groundParams, this.scene.changeGround.bind(this.scene));
    this.sunParams = { intensity: 2, x: 3, z: 0 , color: '#ffffff' };
    this.ui.addSunUI(this.sunParams, this.scene.changeSun.bind(this.scene));
    this.ui.addSelectionUI();
    this.ui.addFunction(() => importInput.click());
    this.ui.addKeyboardControlOption(this);


    // Boucle de rendu
    this.renderer.setAnimationLoop(this.render.bind(this));
  }


    render() {
        // calculs application
        this.renderer.render(this.scene.scene, this.camera)

      if (this.keyboardMoveEnabled) {
        const dir = new THREE.Vector3();

        if (this.keysPressed['w']) dir.z -= 1;
        if (this.keysPressed['s']) dir.z += 1;
        if (this.keysPressed['a']) dir.x -= 1;
        if (this.keysPressed['d']) dir.x += 1;
        if (this.keysPressed[' ']) dir.y += 1; // espace pour monter
        if (this.keysPressed['shift']) dir.y -= 1; // shift pour descendre

        if (dir.lengthSq() > 0) {
          dir.normalize().multiplyScalar(this.keyboardSpeed);
          this.camera.position.add(dir);
        }
      }

      this.renderer.render(this.scene.scene, this.camera);

    }


    initParams() {
      this.groundTexture = [
          'aerial_grass_rock',
          'brown_mud_leaves_01',
          'forest_floor',
          'forrest_ground_01',
          'gravelly_sand'
        ]

      this.groundParams = {
        texture: this.groundTexture[0],
        repeats: 500
      }

      this.skyboxFiles = [
        'DaySkyHDRI019A_2K-TONEMAPPED',
        'DaySkyHDRI050A_2K-TONEMAPPED',
        'NightSkyHDRI009_2K-TONEMAPPED'
      ]

      this.skyboxParams = {
        texture: this.skyboxFiles[0]
      }

    }

  onClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.scene.scene.children, true);
    if (intersects.length === 0) {
      // clic dans le vide → désélection
      if (this.selectedMesh && this.selectedMeshMaterial) {
        this.selectedMesh.material = this.selectedMeshMaterial;
      }
      this.selectedMesh = null;
      this.selectedMeshMaterial = null;
      this.selectedObject = null;

      if (this.ui) this.ui.updateSelection(null);
      return;
    }

    const hit = intersects.find(i => i.object.userData && i.object.userData.selectable) || intersects[0];
    const mesh = hit.object;

    // remonter pour trouver le parent top-level
    let top = mesh;
    while (top.parent && top.parent !== this.scene.scene) {
      top = top.parent;
    }

    if (this.selectedMesh && this.selectedMeshMaterial) {
      this.selectedMesh.material = this.selectedMeshMaterial;
    }

    const origMat = mesh.material;
    this.selectedMeshMaterial = Array.isArray(origMat)
      ? origMat.map(m => (m && m.clone ? m.clone() : m))
      : (origMat && origMat.clone ? origMat.clone() : origMat);

    this.selectedMesh = mesh;
    this.selectedObject = top;

    if (Array.isArray(this.selectedMeshMaterial)) {
      mesh.material = this.selectedMeshMaterial.map(() => new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    } else {
      mesh.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    }

    console.log('Objet sélectionné :', this.selectedObject);

    // --- Mise à jour du panneau UI ---
    if (this.ui) {
      this.ui.updateSelection({
        name: top.name || 'Inconnu',          // nom de l’objet
        posX: top.position.x,
        posY: top.position.y,
        posZ: top.position.z,
        rotX: top.rotation.x,
        rotY: top.rotation.y,
        rotZ: top.rotation.z,
        scaleX: top.scale.x,
        scaleY: top.scale.y,
        scaleZ: top.scale.z
      });
    }
  }


  onMouseMove(event) {
    if (!this.selectedObject) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const point = new THREE.Vector3();
    if (!this._groundPlane) this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    if (!this.raycaster.ray.intersectPlane(this._groundPlane, point)) return;

    // Déplacement
    if (this.moveSelectedObject) {
      if (this.dragYOffset === null) this.dragYOffset = this.selectedObject.position.y - point.y;
      this.selectedObject.position.set(
        point.x,
        point.y + this.dragYOffset,
        point.z
      );
    }

    // Rotation autour de l'axe Y
    if (this.rotateSelectedObject) {
      const deltaX = event.movementX || 0; // variation horizontale
      this.selectedObject.rotation.y = this.startYRotation + deltaX * 0.01; // ajuster sensibilité
    }

    // Changement d'échelle uniforme
    if (this.scaleSelectedObject) {
      const deltaY = event.movementY || 0; // variation verticale
      const scaleFactor = 1 + deltaY * 0.01; // ajuster sensibilité
      this.selectedObject.scale.set(
        this.startScale.x * scaleFactor,
        this.startScale.y * scaleFactor,
        this.startScale.z * scaleFactor
      );
    }

    // Mise à jour UI
    if (this.ui) {
      this.ui.updateSelection({
        name: this.selectedObject.name || "Inconnu",
        posX: this.selectedObject.position.x,
        posY: this.selectedObject.position.y,
        posZ: this.selectedObject.position.z,
        rotX: this.selectedObject.rotation.x,
        rotY: this.selectedObject.rotation.y,
        rotZ: this.selectedObject.rotation.z,
        scaleX: this.selectedObject.scale.x,
        scaleY: this.selectedObject.scale.y,
        scaleZ: this.selectedObject.scale.z,
      });
    }
  }



}
