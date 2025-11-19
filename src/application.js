import * as THREE from 'three/webgpu'
import {Scene} from "./scene.js";
import {Camera} from "./camera.js";
import {OrbitControls} from "three/examples/jsm/Addons.js";
import { UI } from './iu.js';


export class Application {

  constructor() {
    this.selectedObject = null;
    this.selectedMesh = null;
    this.selectedMeshMaterial = null;

    // Création du renderer UNE seule fois
    this.renderer = new THREE.WebGPURenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // Raycaster et souris
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Event listener pour la sélection
    window.addEventListener('click', this.onClick.bind(this));

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

    // Boucle de rendu
    this.renderer.setAnimationLoop(this.render.bind(this));
  }


    render() {
        // calculs application
        this.renderer.render(this.scene.scene, this.camera)


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

}
