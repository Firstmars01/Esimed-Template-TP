import * as THREE from 'three/webgpu'
import {createStandardMaterial} from "./tools.js";
import { loadGltf } from './tools.js';

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

  addDirectionalLight(){

    const sun = new THREE.DirectionalLight(0xffffff, 2.0)
    sun.position.set(3, 50, 0)
    sun.target.position.set(0, 0, 0)
    this.scene.add(sun)

    const sunHelper = new THREE.DirectionalLightHelper(sun, 5)
    this.scene.add(sunHelper)
  }

  addGround(texture, repeats){
    const geometry = new THREE.PlaneGeometry(500, 500)

    const material = createStandardMaterial(texture, repeats)

    const ground = new THREE.Mesh(geometry, material)
    ground.rotation.x = - Math.PI / 2
    ground.position.y = -0.5
    //ground.receiveShadow = true
    this.scene.add(ground)
  }
/*
  async loadScene(url) {

    const response = await fetch(url);
    const data = await response.json();

    const nodes = data.nodes || [];

    for (const obj of nodes) {

      const name = obj.name;

      // Charger uniquement si pas déjà chargé
      if (!this.loadedModels[name]) {
        this.loadedModels[name] = await loadGltf(name);
      }

      // loadGltf retourne déjà un OBJET SCENE prêt à cloner
      const original = this.loadedModels[name];
      const instance = original.clone(true);

      // Position
      if (obj.position) {
        instance.position.fromArray(
          obj.position.split(',').map(Number)
        );
      }

      // Rotation (quaternion)
      if (obj.rotation) {
        instance.quaternion.fromArray(
          obj.rotation.split(',').map(Number)
        );
      }

      // Scale
      if (obj.scale) {
        instance.scale.fromArray(
          obj.scale.split(',').map(Number)
        );
      }

      this.scene.add(instance);
    }
  }
*/

  async loadScene(url) {
    const response = await fetch(url)
    const data = await response.json()
    for (const obj of data.nodes) {
      if (this.loadedModels[obj.name] == undefined) {
        this.loadedModels[obj.name] = await loadGltf(obj.name)
      }
      let mesh = this.loadedModels[obj.name].clone()
      mesh.position.fromArray(obj.position.split(',').map(Number))
      mesh.quaternion.fromArray(obj.rotation.split(',').map(Number))
      mesh.scale.fromArray(obj.scale.split(',').map(Number))
      mesh.traverse(o => {
        if (o.isMesh) {
          o.userData = {
            isSelectable: true,
            object : mesh,
          };
        }});
      this.scene.add(mesh)
    }
    let params = {}
    if (data.params) {
      if (data.params.skybox) {
        params.skybox = data.params.skybox
      }
      if (data.params.ground) {
        params.ground = data.params.ground
      }
    }
    return params
  }
}

