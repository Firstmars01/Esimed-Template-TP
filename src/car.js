// javascript
import * as THREE from 'three';
import {loadGltfCar} from "./tools.js";

export class Car {
  constructor() {
    this.object = new THREE.Group();
    this.visual = new THREE.Group();
    this.object.add(this.visual);

    // Physique
    this.speed = 0;
    this.maxSpeed = 1.2;
    this.acceleration = 0.03;
    this.turnSpeed = 0.04;

    // Drift
    this.isDrifting = false;
    this.driftIntensity = 0;
    this.driftEase = 0.1;
    this.maxDriftAngle = 1.2;

    // Boost
    this.boostPower = 0.06;     // force du boost
    this.boostMaxSpeed = 2.4;   // vitesse max sous boost
    this.boostDecay = 0.96;     // perte progressive de boost
    this.currentBoost = 0;      // boost actif (0 à power)

    // Friction
    this.friction = 0.95;
    this.driftFriction = 0.97;
  }


  setModel(model) {
    // vider uniquement la partie visuelle
    this.visual.clear();
    this.visual.add(model);
  }

  update(keys) {
    // --- Accélération / frein ---
    if (keys["z"]) this.speed += this.acceleration;
    else if (keys["s"]) this.speed -= this.acceleration * 0.7;
    else this.speed *= this.friction;

    this.speed = THREE.MathUtils.clamp(this.speed, -this.maxSpeed, this.maxSpeed);

    // --- Drift ---
    this.isDrifting = keys[" "];
    this.driftIntensity = THREE.MathUtils.lerp(
      this.driftIntensity,
      this.isDrifting ? 1 : 0,
      this.driftEase
    );

// --- Rotation avec drift (seulement si vitesse suffisante) ---
    if (Math.abs(this.speed) > 0.01) {
      let turnDir = 0;
      if (keys["q"]) turnDir = 1;
      if (keys["d"]) turnDir = -1;

      // Calculer l'angle cible
      const driftTurn = turnDir * this.turnSpeed * (1 + this.driftIntensity * this.maxDriftAngle);

      if (!this.targetRotationY) this.targetRotationY = this.object.rotation.y;

      // Mettre à jour la rotation cible
      this.targetRotationY += driftTurn;

      // Lisser la rotation réelle vers la cible
      this.object.rotation.y = THREE.MathUtils.lerp(
        this.object.rotation.y,
        this.targetRotationY,
        0.05 // plus petit = rotation plus lente, ajustable
      );

      // --- Inclinaison visuelle uniquement ---
      const maxTilt = 0.15; // angle max en radians
      const targetTilt = -turnDir * this.driftIntensity * maxTilt;
      this.visual.rotation.z = THREE.MathUtils.lerp(this.visual.rotation.z, targetTilt, 0.2);

    } else {
      // Revenir droit visuellement
      this.visual.rotation.z = THREE.MathUtils.lerp(this.visual.rotation.z, 0, 0.2);
      this.targetRotationY = this.object.rotation.y; // reset la rotation cible quand stop
    }

    // BOOST - shift (maj)
    if (keys["shift"]) {
      this.currentBoost = this.boostPower;
    }

// Appliquer le boost
    if (this.currentBoost > 0) {
      this.speed += this.currentBoost;
      this.currentBoost *= this.boostDecay; // le boost disparaît petit à petit
    }

// Limite de vitesse sous boost
    this.speed = THREE.MathUtils.clamp(
      this.speed,
      -this.maxSpeed,
      this.boostMaxSpeed
    );



    // --- Mouvement ---
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.object.rotation);
    const side = new THREE.Vector3(1, 0, 0).applyEuler(this.object.rotation);

    let driftDir = 0;
    if (keys["q"]) driftDir = 1;
    if (keys["d"]) driftDir = -1;

    const driftVec = side.clone().multiplyScalar(this.speed * this.driftIntensity * driftDir * 0.5);
    const move = forward.clone().multiplyScalar(this.speed).add(driftVec);
    this.object.position.add(move);



    // --- Friction supplémentaire en drift ---
    this.speed *= this.isDrifting ? this.driftFriction : this.friction;
  }

  // --- Charger un nouveau modèle ---
  async loadModel(modelName, scene) {
    if (!modelName || !scene) return;

    try {
      // Supprimer et libérer l'ancien modèle uniquement dans la partie visuelle
      this.visual.children.forEach(child => {
        this.visual.remove(child);
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

      // Ajouter le nouveau modèle visuel
      this.setModel(newMesh);

      // Position initiale
      this.object.position.set(0, 0, 0);
      this.object.rotation.set(0, 0, 0);
      this.visual.rotation.set(0, 0, 0);

      // Ajouter à la scène
      if (!scene.children.includes(this.object)) scene.add(this.object);

      console.log(`${modelName} chargé avec succès !`);
    } catch (err) {
      console.error(`Erreur lors du chargement de la voiture ${modelName}:`, err);
      alert(`Impossible de charger la voiture ${modelName}. Vérifie le fichier dans /models/`);
    }
  }

}
