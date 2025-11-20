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
          o.userData.isSelectable = true;   // <-- pour l'export
          o.userData.object = instance;     // top-level parent
        }
      });


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

  exportScene(Ground, skybox) {
    // ground et skybox placés en premier dans l'objet exporté
    const sceneData = { ground: Ground || null, skybox: skybox || null, nodes: [] };
    const exported = new Set();

    this.scene.traverse((obj) => {
      if (obj.userData && obj.userData.isSelectable) {
        const root = obj.userData.object || obj;
        if (!exported.has(root)) {
          exported.add(root);

          const node = {
            name: root.name || 'Inconnu',
            position: root.position ? root.position.toArray().join(',') : '0,0,0',
            rotation: root.quaternion ? root.quaternion.toArray().join(',') : '0,0,0,1',
            scale: root.scale ? root.scale.toArray().join(',') : '1,1,1'
          };

          sceneData.nodes.push(node);
        }
      }
    });

    const jsonStr = JSON.stringify(sceneData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scene_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

// Ajoutez cette méthode dans la classe Scene (fichier `src/scene.js`)
  clearScene() {
    const toRemove = new Set();

    this.scene.traverse((obj) => {
      if (obj.isMesh && obj.userData && obj.userData.isSelectable) {
        let top = obj;
        while (top.parent && top.parent !== this.scene) {
          top = top.parent;
        }
        toRemove.add(top);
      }
    });


    // Pour chaque objet à supprimer, parcourir ses enfants pour disposer ressources puis retirer de la scène
    toRemove.forEach((obj) => {
      obj.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry && typeof child.geometry.dispose === 'function') {
            child.geometry.dispose();
          }
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => { if (m && typeof m.dispose === 'function') m.dispose(); });
            } else if (typeof child.material.dispose === 'function') {
              child.material.dispose();
            }
          }
        }
      });
      this.scene.remove(obj);
    });
  }

  async importScene(event, params) {
    const file = event.target.files[0];
    if (!file) return;

    const text = await file.text();
    const data = JSON.parse(text);

    // Clear la scène avant d'importer
    this.clearScene();

    // Import du ground
    if (data.ground) {
      const g = data.ground;
      this.changeGround(g.texture, g.repeats);
      if (params.ground) {
        params.ground.texture = g.texture;
        params.ground.repeats = g.repeats;
      }
    }

    // Import du skybox
    if (data.skybox) {
      const s = data.skybox;
      this.addSkybox(s.texture);
      if (params.skybox) params.skybox.texture = s.texture;
    }

    // Import des objets (nodes)
    if (data.nodes && data.nodes.length > 0) {
      for (const obj of data.nodes) {
        const name = obj.name;
        if (!this.loadedModels[name]) {
          this.loadedModels[name] = await loadGltf(name);
        }
        const instance = this.loadedModels[name].clone(true);

        // Position
        if (obj.position) instance.position.fromArray(obj.position.split(',').map(Number));
        // Rotation (quaternion)
        if (obj.rotation) instance.quaternion.fromArray(obj.rotation.split(',').map(Number));
        // Scale
        if (obj.scale) instance.scale.fromArray(obj.scale.split(',').map(Number));

        instance.traverse(o => {
          if (o.isMesh) o.userData.isSelectable = true;
        });

        this.scene.add(instance);
      }
    }

    // Restaurer le soleil si fourni
    if (params.sun) this.changeSun(params.sun);
  }



}

