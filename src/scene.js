import * as THREE from 'three/webgpu'
import {createStandardMaterial} from "./tools.js";
import { loadGltf } from './tools.js';
import {TextureLoader} from "three/webgpu";

export class Scene {

  constructor() {
    this.scene = new THREE.Scene();

    this.loadedModels = {};
  }

  addCube() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000, flatShading: true });
    const cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);
  }


  addAmbiantLight(){

    const ambiantLight = new THREE.AmbientLight(0xffffff, 0.3)

    this.scene.add(ambiantLight);
  }

  addDirectionalLight() {
    this.sun = new THREE.DirectionalLight(0xFFFFFF, 3.0)
    this.sun.position.set(50, 100, 0)
    this.sun.target.position.set(0, 0, 0)
    this.sun.castShadow = true
    this.sun.shadow.camera.left = -100
    this.sun.shadow.camera.right = 100
    this.sun.shadow.camera.top = 100
    this.sun.shadow.camera.bottom = -100
    this.sun.shadow.camera.near = 1
    this.sun.shadow.camera.far = 200
    this.sun.shadow.mapSize.set(2048, 2048)
    this.scene.add(this.sun)
    this.sunHelper = new THREE.DirectionalLightHelper(this.sun)
    this.scene.add(this.sunHelper)
    return this.sunHelper
  }

  addGround(texture, repeats){
    const geometry = new THREE.PlaneGeometry(2048, 2048);

    const material = createStandardMaterial(texture, repeats);

    this.ground = new THREE.Mesh(geometry, material); // <- stocker le sol
    this.ground.rotation.x = - Math.PI / 2;
    this.ground.position.y = 0;
    this.ground.receiveShadow = true;

    this.scene.add(this.ground);
  }


  async loadScene(url) {
    const response = await fetch(url);
    const data = await response.json();
    const nodes = data.nodes || [];

    for (const obj of nodes) {
      const name = obj.name;

      // Charger uniquement si pas déjà chargé
      if (!this.loadedModels) this.loadedModels = {};
      if (!this.loadedModels[name]) {
        this.loadedModels[name] = await loadGltf(name);
      }

      const original = this.loadedModels[name];
      const instance = original.clone(true);

      // Position
      if (obj.position) {
        instance.position.fromArray(obj.position.split(',').map(Number));
      }

      // Rotation (quaternion)
      if (obj.rotation) {
        instance.quaternion.fromArray(obj.rotation.split(',').map(Number));
      }

      // Scale
      if (obj.scale) {
        instance.scale.fromArray(obj.scale.split(',').map(Number));
      }

      instance.traverse(o => {
        if (o.isMesh) {
          o.userData = {
            isSelectable: true,
            object : instance,
          };
        }});
/*
      // --- Propriétés utilisateur pour la sélection ---
      instance.userData.selectable = true;  // le mesh est sélectionnable
      instance.userData.objectName = name;  // nom de l’objet original
      instance.userData.nodeId = obj.id || name; // si le JSON contient un id sinon le nom
*/
      this.scene.add(instance);
    }
  }


  addSkybox(filename) {
    const loader = new TextureLoader();
    loader.load(`/skybox/${filename}.jpg`, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.environment = texture;
      this.scene.background = texture;
    });
  }

  changeGround(textureName, repeats = 1) {
    if (!this.ground) return;

    const newMaterial = createStandardMaterial(textureName, repeats);
    this.ground.material.dispose();  // libère l’ancien matériau
    this.ground.material = newMaterial;
  }

  changeSun(params) {
    if (!this.sun) return;

    // Couleur
    if (params.color !== undefined) {
      this.sun.color.set(params.color);
    }

    // Intensité
    if (params.intensity !== undefined) {
      this.sun.intensity = params.intensity;
    }

    // Position
    if (params.x !== undefined) this.sun.position.x = params.x;
    if (params.z !== undefined) this.sun.position.z = params.z;

    this.sun.updateMatrixWorld();
  }




}

