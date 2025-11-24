// filepath: c:\Users\cleme\WebstormProjects\Esimed-Template-TP\src\Car.js
import * as THREE from 'three';
import { loadGltfCar } from "../managers/ModelLoader.js";

export class Car {
  constructor() {
    this.object = new THREE.Group();
    this.visual = new THREE.Group();
    this.object.add(this.visual);

    // --- Hitbox invisible ---
    this.hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.2, 3.5), // plus grosse que le modèle
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.visual.add(this.hitbox);

    // Speed
    this.speed = 0;
    this.maxSpeed = 1.0;
    this.acceleration = 0.03;
    this.turnSpeed = 0.04;

    // Drift
    this.isDrifting = false;
    this.driftIntensity = 0;
    this.driftEase = 0.1;
    this.maxDriftAngle = 1.3;

    // Boost
    this.boostPower = 0.06;
    this.boostMaxSpeed = 2.4;
    this.boostDecay = 0.96;
    this.currentBoost = 0;

    // Friction
    this.friction = 0.95;
    this.driftFriction = 0.97;

    // --- Obstacle detection (Raycaster) ---
    this.raycaster = new THREE.Raycaster();
    this.stopDistance = 2.0; // augmenté pour la grosse hitbox
    this.brakeDistance = 5.0;
    this.rayYOffset = 0.5;
    this.scene = null;
    this.obstacleList = null;
  }

  setModel(model) {
    this.visual.clear();
    this.visual.add(model);
    this.visual.add(this.hitbox); // réajoute la hitbox invisible
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

    // --- Rotation avec drift ---
    let turnDir = 0;
    if (Math.abs(this.speed) > 0.01) {
      if (keys["q"]) turnDir = 1;
      if (keys["d"]) turnDir = -1;

      const driftTurn = turnDir * this.turnSpeed * (1 + this.driftIntensity * this.maxDriftAngle);

      if (!this.targetRotationY) this.targetRotationY = this.object.rotation.y;
      this.targetRotationY += driftTurn;

      this.object.rotation.y = THREE.MathUtils.lerp(
        this.object.rotation.y,
        this.targetRotationY,
        0.03
      );

      const maxTilt = 0.15;
      const targetTilt = -turnDir * this.driftIntensity * maxTilt;
      this.visual.rotation.z = THREE.MathUtils.lerp(this.visual.rotation.z, targetTilt, 0.2);
    } else {
      this.visual.rotation.z = THREE.MathUtils.lerp(this.visual.rotation.z, 0, 0.2);
      this.targetRotationY = this.object.rotation.y;
    }

    // --- Boost ---
    if (keys["shift"]) this.currentBoost = this.boostPower;
    if (this.currentBoost > 0) {
      this.speed += this.currentBoost;
      this.currentBoost *= this.boostDecay;
    }
    this.speed = THREE.MathUtils.clamp(this.speed, -this.maxSpeed, this.boostMaxSpeed);

    // --- Mouvement ---
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.object.rotation);
    const side = new THREE.Vector3(1, 0, 0).applyEuler(this.object.rotation);

    let driftDir = 0;
    if (keys["q"]) driftDir = 1;
    if (keys["d"]) driftDir = -1;

    const driftVec = side.clone().multiplyScalar(this.speed * this.driftIntensity * driftDir * 0.15);
    const move = forward.clone().multiplyScalar(this.speed).add(driftVec);

    // --- Vérification avant déplacement (hitbox) ---
    const nextPosition = this.object.position.clone().add(move);
    let canMove = true;

    if (this.scene && this.speed > 0.01) {
      const origin = nextPosition.clone();
      origin.y += this.rayYOffset;

      this.raycaster.set(origin, forward.clone().normalize());

      const candidates = this.obstacleList || this.scene.children;
      const intersects = this.raycaster
        .intersectObjects(candidates, true)
        .filter(i => !this._isIgnored(i.object));

      if (intersects.length > 0 && intersects[0].distance <= this.stopDistance) {
        canMove = false;
        this.speed = 0;
        this.currentBoost = 0;
      }
    }

    if (canMove) this.object.position.copy(nextPosition);

    // --- Friction supplémentaire en drift ---
    this.speed *= this.isDrifting ? this.driftFriction : this.friction;
  }

  async loadModel(modelName, scene) {
    if (!modelName || !scene) return;

    try {
      // Vider ancien modèle
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

      const newMesh = await loadGltfCar(modelName);

      try {
        const box = new THREE.Box3().setFromObject(newMesh);
        if (!box.isEmpty()) {
          const center = new THREE.Vector3();
          box.getCenter(center);
          const min = box.min.clone();

          newMesh.position.x -= center.x;
          newMesh.position.z -= center.z;
          newMesh.position.y -= min.y;
          newMesh.position.y += 0.05;
        }
      } catch (e) {
        console.warn('Recentering model failed:', e);
      }

      this.setModel(newMesh);

      if (!scene.children.includes(this.object)) scene.add(this.object);

      this.setScene(scene);

      console.log(`${modelName} chargé avec succès !`);
    } catch (err) {
      console.error(`Erreur lors du chargement de la voiture ${modelName}:`, err);
      alert(`Impossible de charger la voiture ${modelName}. Vérifie le fichier dans /models/`);
    }
  }

  setScene(scene) {
    this.scene = scene;
  }

  setObstacles(list) {
    this.obstacleList = list;
  }

  _isIgnored(obj) {
    let o = obj;
    while (o) {
      if (o === this.object) return true;
      if (o.userData && o.userData.ignoreObstacle) return true;
      const name = (o.name || '').toLowerCase();
      if (name.includes('finish') || name.includes('start') || name.includes('car')) return true;
      o = o.parent;
    }
    return false;
  }
}
