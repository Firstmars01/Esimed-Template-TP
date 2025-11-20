import * as THREE from 'three';
import { loadGltfCar } from "./tools.js";

export class Car {
  constructor() {
    this.object = new THREE.Group();

    // Physique
    this.speed = 0;
    this.maxSpeed = 1.0;      // vitesse max
    this.acceleration = 0.02; // accélération
    this.turnSpeed = 0.03;

    // Drift
    this.isDrifting = false;
    this.driftIntensity = 0;
    this.maxDrift = 0.6;

    // Friction
    this.friction = 0.94;
    this.driftFriction = 0.985;
  }

  setModel(model) {
    this.object.clear(); // Supprime les anciens modèles enfants
    this.object.add(model);
  }

  update(keys) {
    // --- Accélération / frein ---
    if (keys["z"]) this.speed += this.acceleration;
    else if (keys["s"]) this.speed -= this.acceleration;
    else this.speed *= 0.96;

    this.speed = THREE.MathUtils.clamp(this.speed, -this.maxSpeed, this.maxSpeed);

    // --- Drift ---
    if (keys[" "]) {
      this.isDrifting = true;
      this.driftIntensity = THREE.MathUtils.lerp(this.driftIntensity, 1, 0.15);
    } else {
      this.isDrifting = false;
      this.driftIntensity = THREE.MathUtils.lerp(this.driftIntensity, 0, 0.1);
    }

    // --- Rotation ---
    if (Math.abs(this.speed) > 0.005) {
      const turnFactor = this.speed / this.maxSpeed;
      if (keys["q"]) this.object.rotation.y += this.turnSpeed * turnFactor;
      if (keys["d"]) this.object.rotation.y -= this.turnSpeed * turnFactor;
    }

    // --- Mouvement ---
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.object.rotation);
    const side = new THREE.Vector3(1, 0, 0).applyEuler(this.object.rotation);

    let driftDir = 0;
    if (keys["q"]) driftDir = +1;
    if (keys["d"]) driftDir = -1;

    const driftVec = side.clone().multiplyScalar(this.speed * this.driftIntensity * this.maxDrift * driftDir);
    const move = forward.multiplyScalar(this.speed).add(driftVec);
    this.object.position.add(move);

    // --- Friction ---
    this.speed *= this.isDrifting ? this.driftFriction : this.friction;
  }

  // --- Charger un nouveau modèle ---
  async loadModel(modelName, scene) {
    if (!modelName || !scene) return;

    try {
      // Supprimer et libérer l'ancien modèle
      this.object.children.forEach(child => {
        this.object.remove(child);
        child.traverse(c => {
          if (c.isMesh) {
            c.geometry.dispose();
            if (Array.isArray(c.material)) {
              c.material.forEach(m => {
                if (m.map) m.map.dispose();
                m.dispose();
              });
            } else {
              if (c.material.map) c.material.map.dispose();
              c.material.dispose();
            }
          }
        });
      });

      // Charger le nouveau modèle
      const newMesh = await loadGltfCar(modelName);

      // Ajouter le nouveau modèle
      this.setModel(newMesh);

      // Position initiale
      this.object.position.set(0, 0, 0);
      this.object.rotation.set(0, 0, 0);

      // Ajouter à la scène
      if (!scene.children.includes(this.object)) scene.add(this.object);

      console.log(`${modelName} chargé avec succès !`);
    } catch (err) {
      console.error(`Erreur lors du chargement de la voiture ${modelName}:`, err);
      alert(`Impossible de charger la voiture ${modelName}. Vérifie le fichier dans /models/`);
    }
  }
}
