import * as THREE from 'three';

export class Car {
  constructor() {
    this.object = new THREE.Group();

    // Physique
    this.speed = 0;
    this.maxSpeed = 0.5;
    this.acceleration = 0.01;

    this.turnSpeed = 0.03;

    // Drift
    this.isDrifting = false;
    this.driftIntensity = 0;
    this.maxDrift = 0.6;

    this.friction = 0.94;
    this.driftFriction = 0.985;
  }

  setModel(model) {
    this.object.add(model);
  }

  update(keys) {

    /** Accélération */
    if (keys["z"]) this.speed += this.acceleration;
    else if (keys["s"]) this.speed -= this.acceleration;
    else this.speed *= 0.96;

    this.speed = THREE.MathUtils.clamp(this.speed, -this.maxSpeed, this.maxSpeed);


    /** Drift activé */
    if (keys[" "]) {
      this.isDrifting = true;
      this.driftIntensity = THREE.MathUtils.lerp(this.driftIntensity, 1, 0.15);
    } else {
      this.isDrifting = false;
      this.driftIntensity = THREE.MathUtils.lerp(this.driftIntensity, 0, 0.1);
    }


    /** Rotation */
    if (Math.abs(this.speed) > 0.005) {
      const turnFactor = this.speed / this.maxSpeed;

      if (keys["q"]) this.object.rotation.y += this.turnSpeed * turnFactor;
      if (keys["d"]) this.object.rotation.y -= this.turnSpeed * turnFactor;
    }


    /** Direction voiture */
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.object.rotation);
    const side = new THREE.Vector3(1, 0, 0).applyEuler(this.object.rotation);


    /** ✔️ Correction DRIFT directionnel */
    let driftDirection = 0;

    if (keys["q"]) driftDirection = +1; // drift vers la gauche
    if (keys["d"]) driftDirection = -1; // drift vers la droite (corrigé)

    const driftVector = side
      .clone()
      .multiplyScalar(this.speed * this.driftIntensity * this.maxDrift * driftDirection);


    /** Mouvement final */
    const move = forward.multiplyScalar(this.speed).add(driftVector);

    this.object.position.add(move);


    /** Friction */
    if (this.isDrifting) this.speed *= this.driftFriction;
    else this.speed *= this.friction;
  }
}
