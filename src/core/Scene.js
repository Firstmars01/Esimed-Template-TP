import * as THREE from 'three/webgpu';
import { createStandardMaterial, loadGltf } from '../managers/ModelLoader.js';
import { TextureLoader } from 'three/webgpu';

export class Scene {

  constructor() {
    // Create the main scene
    this.scene = new THREE.Scene();

    // Store loaded models to avoid reloading
    this.loadedModels = {};

    // Ground, sun and helper references
    this.ground = null;
    this.sun = null;
    this.sunHelper = null;
  }

  /*** Lights ***/
  addAmbientLight(intensity = 0.15, color = 0xffffff) {
    // Add a soft ambient light to the scene
    const ambient = new THREE.AmbientLight(color, intensity);
    this.scene.add(ambient);
  }

  addDirectionalLight(intensity = 5.0, color = 0xffffff, position = [50, 100, 0]) {
    // Create the main directional light (sun)
    this.sun = new THREE.DirectionalLight(color, intensity);
    this.sun.position.set(...position);
    this.sun.target.position.set(0, 0, 0);
    this.sun.castShadow = true;

    // Configure a very large shadow area
    this.sun.shadow.camera.left = -500;
    this.sun.shadow.camera.right = 500;
    this.sun.shadow.camera.top = 500;
    this.sun.shadow.camera.bottom = -500;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 500;
    this.sun.shadow.mapSize.set(2048, 2048);

    this.scene.add(this.sun);

    // Optional debugging helper
    this.sunHelper = new THREE.DirectionalLightHelper(this.sun);
    //this.scene.add(this.sunHelper);

    return this.sunHelper;
  }

  addDirectionalLightEditor(intensity = 5.0, color = 0xffffff, position = [50, 100, 0]) {
    // Update or create the directional light (editor mode)
    if (!this.sun) {
      this.addDirectionalLight(intensity, color, position);
    } else {
      if (color !== undefined) this.sun.color = new THREE.Color(color);
      if (intensity !== undefined) this.sun.intensity = intensity;
      if (position !== undefined) this.sun.position.set(...position);
      this.sun.updateMatrixWorld();
    }

    // Create or update the helper
    if (!this.sunHelper) {
      this.sunHelper = new THREE.DirectionalLightHelper(this.sun);
      this.scene.add(this.sunHelper);
    } else {
      try {
        this.sunHelper.update();
      } catch {
        this.scene.remove(this.sunHelper);
        this.sunHelper = new THREE.DirectionalLightHelper(this.sun);
        this.scene.add(this.sunHelper);
      }
    }

    return this.sunHelper;
  }

  /*** Ground ***/
  addGround(texture, repeats = 1) {
    // Create a large ground plane
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
    // Replace ground texture
    if (!this.ground) return;
    this.ground.material.dispose();
    this.ground.material = createStandardMaterial(texture, repeats);
  }

  /*** Skybox ***/
  addSkybox(filename) {
    // Load and apply a skybox texture
    const loader = new TextureLoader();
    loader.load(`/skybox/${filename}.jpg`, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.environment = texture;
      this.scene.background = texture;
    });
  }

  /*** Sun properties update ***/
  changeSun({ color, intensity, x, z }) {
    // Update sun settings
    if (!this.sun) return;
    if (color !== undefined) this.sun.color.set(color);
    if (intensity !== undefined) this.sun.intensity = intensity;
    if (x !== undefined) this.sun.position.x = x;
    if (z !== undefined) this.sun.position.z = z;

    this.sun.updateMatrixWorld();
  }

  /*** Load scene objects ***/
  async loadScene(url) {
    // Load scene JSON file
    const response = await fetch(url);
    const data = await response.json();
    const nodes = data.nodes || [];

    for (const obj of nodes) {
      const { name, position, rotation, scale } = obj;

      // Load model once and reuse
      if (!this.loadedModels[name]) {
        this.loadedModels[name] = await loadGltf(name);
      }

      // Clone model and apply transform
      const instance = this.loadedModels[name].clone(true);

      if (position) instance.position.fromArray(position.split(',').map(Number));
      if (rotation) instance.quaternion.fromArray(rotation.split(',').map(Number));
      if (scale) instance.scale.fromArray(scale.split(',').map(Number));

      // Allow selection
      instance.userData.isSelectable = true;

      // Enable shadows on all meshes
      instance.traverse(o => {
        if (o.isMesh) {
          o.userData.isSelectable = true;
          o.userData.object = instance;
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });

      this.scene.add(instance);
    }
  }

  /*** Export scene to JSON ***/
  exportScene(Ground, skybox) {
    // Build JSON data
    const sceneData = { ground: Ground || null, skybox: skybox || null, nodes: [] };

    this.scene.traverse(obj => {
      if (obj.userData?.isSelectable && (!obj.parent || obj.parent === this.scene)) {
        sceneData.nodes.push({
          name: obj.name || 'Unknown',
          position: obj.position.toArray().join(','),
          rotation: obj.quaternion.toArray().join(','),
          scale: obj.scale.toArray().join(',')
        });
      }
    });

    // Download JSON file
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

  /*** Clear all models from the scene ***/
  clearScene() {
    const toRemove = new Set();

    // Collect top-level selectable objects
    this.scene.traverse(obj => {
      if (obj.isMesh && obj.userData?.isSelectable) {
        let top = obj;
        while (top.parent && top.parent !== this.scene) top = top.parent;
        toRemove.add(top);
      }
    });

    // Remove objects and free GPU memory
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

    // Notify listeners
    window.dispatchEvent(new CustomEvent('sceneChanged'));
  }

  /*** Import a saved scene ***/
  async importScene(event, params) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const data = JSON.parse(text);

    this.clearScene();

    // Restore ground
    if (data.ground) {
      this.changeGround(data.ground.texture, data.ground.repeats);
      if (params.ground) Object.assign(params.ground, data.ground);
    }

    // Restore skybox
    if (data.skybox) {
      this.addSkybox(data.skybox.texture);
      if (params.skybox) params.skybox.texture = data.skybox.texture;
    }

    // Restore objects
    for (const obj of data.nodes || []) {
      const { name, position, rotation, scale } = obj;

      if (!this.loadedModels[name]) {
        this.loadedModels[name] = await loadGltf(name);
      }

      const instance = this.loadedModels[name].clone(true);

      if (position) instance.position.fromArray(position.split(',').map(Number));
      if (rotation) instance.quaternion.fromArray(rotation.split(',').map(Number));
      if (scale) instance.scale.fromArray(scale.split(',').map(Number));

      instance.userData.isSelectable = true;

      instance.traverse(o => {
        if (o.isMesh) {
          o.userData.isSelectable = true;
          o.userData.object = instance;
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });

      this.scene.add(instance);
    }

    // Restore sun settings
    if (params.sun) this.changeSun(params.sun);

    window.dispatchEvent(new CustomEvent('sceneChanged'));
  }
}
