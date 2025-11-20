import * as THREE from 'three/webgpu';
import { createStandardMaterial, loadGltf } from './tools.js';
import { TextureLoader } from 'three/webgpu';

export class Scene {

  constructor() {
    this.scene = new THREE.Scene();
    this.loadedModels = {};
    this.ground = null;
    this.sun = null;
    this.sunHelper = null;
  }

  /*** Ajout d'objets de base ***/
  addCube(size = 1, color = 0xff0000) {
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshPhongMaterial({ color, flatShading: true });
    const cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);
  }

  /*** Lumières ***/
  addAmbientLight(intensity = 0.3, color = 0xffffff) {
    const ambient = new THREE.AmbientLight(color, intensity);
    this.scene.add(ambient);
  }

  addDirectionalLight(intensity = 3.0, color = 0xffffff, position = [50, 100, 0]) {
    this.sun = new THREE.DirectionalLight(color, intensity);
    this.sun.position.set(...position);
    this.sun.target.position.set(0, 0, 0);
    this.sun.castShadow = true;
    this.sun.shadow.camera.left = -100;
    this.sun.shadow.camera.right = 100;
    this.sun.shadow.camera.top = 100;
    this.sun.shadow.camera.bottom = -100;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 200;
    this.sun.shadow.mapSize.set(2048, 2048);

    this.scene.add(this.sun);

    this.sunHelper = new THREE.DirectionalLightHelper(this.sun);
    this.scene.add(this.sunHelper);

    return this.sunHelper;
  }

  /*** Sol ***/
  addGround(texture, repeats = 1) {
    const geometry = new THREE.PlaneGeometry(2048, 2048);
    const material = createStandardMaterial(texture, repeats);

    this.ground = new THREE.Mesh(geometry, material);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.ground.receiveShadow = true;
    this.ground.userData.isSelectable = false;
    this.scene.add(this.ground);
  }

  changeGround(texture, repeats = 1) {
    if (!this.ground) return;
    this.ground.material.dispose();
    this.ground.material = createStandardMaterial(texture, repeats);
  }

  /*** Skybox ***/
  addSkybox(filename) {
    const loader = new TextureLoader();
    loader.load(`/skybox/${filename}.jpg`, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.environment = texture;
      this.scene.background = texture;
    });
  }

  /*** Soleil ***/
  changeSun({ color, intensity, x, z }) {
    if (!this.sun) return;
    if (color !== undefined) this.sun.color.set(color);
    if (intensity !== undefined) this.sun.intensity = intensity;
    if (x !== undefined) this.sun.position.x = x;
    if (z !== undefined) this.sun.position.z = z;
    this.sun.updateMatrixWorld();
  }

  /*** Gestion des modèles ***/
  async loadScene(url) {
    const response = await fetch(url);
    const data = await response.json();
    const nodes = data.nodes || [];

    for (const obj of nodes) {
      const { name, position, rotation, scale } = obj;

      if (!this.loadedModels[name]) {
        this.loadedModels[name] = await loadGltf(name);
      }

      const instance = this.loadedModels[name].clone(true);

      if (position) instance.position.fromArray(position.split(',').map(Number));
      if (rotation) instance.quaternion.fromArray(rotation.split(',').map(Number));
      if (scale) instance.scale.fromArray(scale.split(',').map(Number));

      instance.userData.isSelectable = true; // <-- IMPORTANT
      instance.traverse(o => {
        if (o.isMesh) {
          o.userData.isSelectable = true;
          o.userData.object = instance; // parent root
        }
      });


      this.scene.add(instance);
    }
  }

  /*** Export / Import ***/
  exportScene(Ground, skybox) {
    const sceneData = { ground: Ground || null, skybox: skybox || null, nodes: [] };
    const exported = new Set();

    this.scene.traverse(obj => {
      if (obj.userData?.isSelectable && (!obj.parent || obj.parent === this.scene)) {
        // on n'exporte que les parents root
        sceneData.nodes.push({
          name: obj.name || 'Inconnu',
          position: obj.position.toArray().join(','),
          rotation: obj.quaternion.toArray().join(','),
          scale: obj.scale.toArray().join(',')
        });
      }
    });



    const blob = new Blob([JSON.stringify(sceneData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scene_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearScene() {
    const toRemove = new Set();

    this.scene.traverse(obj => {
      if (obj.isMesh && obj.userData?.isSelectable) {
        let top = obj;
        while (top.parent && top.parent !== this.scene) top = top.parent;
        toRemove.add(top);
      }
    });

    toRemove.forEach(obj => {
      obj.traverse(child => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m?.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
      this.scene.remove(obj);
    });
  }

  async importScene(event, params) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const data = JSON.parse(text);

    this.clearScene();

    // Ground
    if (data.ground) {
      this.changeGround(data.ground.texture, data.ground.repeats);
      if (params.ground) Object.assign(params.ground, data.ground);
    }

    // Skybox
    if (data.skybox) {
      this.addSkybox(data.skybox.texture);
      if (params.skybox) params.skybox.texture = data.skybox.texture;
    }

    // Nodes
    for (const obj of data.nodes || []) {
      const { name, position, rotation, scale } = obj;
      if (!this.loadedModels[name]) this.loadedModels[name] = await loadGltf(name);
      const instance = this.loadedModels[name].clone(true);

      if (position) instance.position.fromArray(position.split(',').map(Number));
      if (rotation) instance.quaternion.fromArray(rotation.split(',').map(Number));
      if (scale) instance.scale.fromArray(scale.split(',').map(Number));

      instance.userData.isSelectable = true;      // <- marque le root pour export
      instance.traverse(o => {
        if (o.isMesh) {
          o.userData.isSelectable = true;
          o.userData.object = instance;       // <- root parent pour export
        }
      });
      this.scene.add(instance);
    }

    if (params.sun) this.changeSun(params.sun);
  }
}
