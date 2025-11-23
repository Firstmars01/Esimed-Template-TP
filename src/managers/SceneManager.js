import { Scene } from '../core/scene.js';
import { loadGltf } from './modelLoader.js';

export class SceneManager {
  constructor(existingScene) {
    // accept either a core Scene instance or create a new one
    if (existingScene) {
      this.scene = existingScene;
    } else {
      this.scene = new Scene();
    }
  }

  // Return the underlying THREE.Scene for compatibility
  getScene() {
    return this.scene.scene;
  }

  // Helper to expose some scene values (used by menu.js)
  getSceneWrapper() {
    return {
      sun: this.scene.sun ?? null,
      ground: this.scene.ground ?? null,
      skybox: this.scene.skybox ?? null
    };
  }

  // Proxy to core Scene load
  async loadScene(url) {
    if (typeof this.scene.loadScene === 'function') return await this.scene.loadScene(url);
  }

  // Export current scene to a JSON file (ground and skybox are param objects)
  exportScene(Ground, skybox) {
    const sceneData = { ground: Ground || null, skybox: skybox || null, nodes: [] };

    this.scene.scene.traverse(obj => {
      if (obj.userData?.isSelectable && (!obj.parent || obj.parent === this.scene.scene)) {
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

  // Remove selectable objects from the scene and dispose resources
  clearScene() {
    const toRemove = new Set();

    this.scene.scene.traverse(obj => {
      if (obj.isMesh && obj.userData?.isSelectable) {
        let top = obj;
        while (top.parent && top.parent !== this.scene.scene) top = top.parent;
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
      this.scene.scene.remove(obj);
    });

    window.dispatchEvent(new CustomEvent('sceneChanged'));
  }

  // Import scene from a File or an input event. params may contain references to ground/skybox/sun objects to update.
  async importScene(eventOrFile, params = {}) {
    let file = null;
    if (eventOrFile?.target?.files) {
      file = eventOrFile.target.files[0];
    } else if (eventOrFile instanceof File) {
      file = eventOrFile;
    }

    if (!file) return;

    const text = await file.text();
    const data = JSON.parse(text);

    this.clearScene();

    // Ground
    if (data.ground) {
      if (typeof this.scene.changeGround === 'function') this.scene.changeGround(data.ground.texture, data.ground.repeats);
      if (params.ground) Object.assign(params.ground, data.ground);
    }

    // Skybox
    if (data.skybox) {
      if (typeof this.scene.addSkybox === 'function') this.scene.addSkybox(data.skybox.texture);
      if (params.skybox) params.skybox.texture = data.skybox.texture;
    }

    // Nodes
    for (const obj of data.nodes || []) {
      const { name, position, rotation, scale } = obj;
      if (!this.scene.loadedModels[name]) this.scene.loadedModels[name] = await loadGltf(name);
      const instance = this.scene.loadedModels[name].clone(true);

      if (position) instance.position.fromArray(position.split(',').map(Number));
      if (rotation) instance.quaternion.fromArray(rotation.split(',').map(Number));
      if (scale) instance.scale.fromArray(scale.split(',').map(Number));

      instance.userData.isSelectable = true;
      instance.traverse(o => {
        if (o.isMesh) {
          o.userData.isSelectable = true;
          o.userData.object = instance;
        }
      });

      this.scene.scene.add(instance);
    }

    if (params.sun && typeof this.scene.changeSun === 'function') this.scene.changeSun(params.sun);

    window.dispatchEvent(new CustomEvent('sceneChanged'));
  }
}

