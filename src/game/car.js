// filepath: c:\Users\cleme\WebstormProjects\Esimed-Template-TP\src\car.js
import * as THREE from 'three';
import {loadGltfCar} from "../managers/modelLoader.js";
import {WheelManager} from "./WheelManager.js";

export class Car {
    constructor() {
        this.object = new THREE.Group();
        this.visual = new THREE.Group();
        this.object.add(this.visual);

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

        // --- Gestionnaire de roues ---
        this.wheelManager = null;

        // --- Obstacle detection (Raycaster) ---
        this.raycaster = new THREE.Raycaster();
        this.stopDistance = 1.5;
        this.brakeDistance = 4.0;
        this.rayYOffset = 0.5;
        this.scene = null;
        this.obstacleList = null;
    }

    setModel(model) {
        // vider uniquement la partie visuelle
        this.visual.clear();
        this.visual.add(model);

        // Initialiser le gestionnaire de roues avec le nouveau modèle
        this.wheelManager = new WheelManager(model, {
            wheelRadius: 0.3,
            rotationAxis: 'x',
            maxSteeringAngle: Math.PI / 6,
            steeringAxis: 'y'
        });

        // Debug: afficher les infos des roues
        this.wheelManager.debugInfo();
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
        let turnDir = 0;
        if (Math.abs(this.speed) > 0.01) {
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
                0.03
            );

            // --- Inclinaison visuelle uniquement ---
            const maxTilt = 0.15;
            const targetTilt = -turnDir * this.driftIntensity * maxTilt;
            this.visual.rotation.z = THREE.MathUtils.lerp(this.visual.rotation.z, targetTilt, 0.2);

        } else {
            // Revenir droit visuellement
            this.visual.rotation.z = THREE.MathUtils.lerp(this.visual.rotation.z, 0, 0.2);
            this.targetRotationY = this.object.rotation.y;
        }

        // --- Mise à jour de la direction des roues ---
        if (this.wheelManager) {
            if (turnDir !== 0 && Math.abs(this.speed) > 0.01) {
                // Appliquer la direction avec intensité drift
                this.wheelManager.updateSteering(turnDir, 1 + this.driftIntensity * 0.5);
            } else {
                // Revenir au centre
                this.wheelManager.resetSteering();
            }
        }

        // BOOST - shift (maj)
        if (keys["shift"]) {
            this.currentBoost = this.boostPower;
        }

        // Appliquer le boost
        if (this.currentBoost > 0) {
            this.speed += this.currentBoost;
            this.currentBoost *= this.boostDecay;
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

        const driftVec = side.clone().multiplyScalar(this.speed * this.driftIntensity * driftDir * 0.15);
        const move = forward.clone().multiplyScalar(this.speed).add(driftVec);

        // --- Obstacle check: seulement si on avance vers l'avant (speed > 0)
        if (this.scene && this.speed > 0.01) {
            const origin = this.object.position.clone();
            origin.y += this.rayYOffset;
            const dir = forward.clone().normalize();

            const rayLen = Math.max(this.stopDistance, Math.abs(this.speed) * 1.5 + this.stopDistance);
            this.raycaster.set(origin, dir);

            const candidates = this.obstacleList || this.scene.children;
            const intersects = this.raycaster.intersectObjects(candidates, true).filter(i => !this._isIgnored(i.object));

            if (intersects.length > 0) {
                const hit = intersects[0];
                if (hit.distance <= this.stopDistance) {
                    this.speed = 0;
                    this.currentBoost = 0;
                } else if (hit.distance <= rayLen && hit.distance <= this.brakeDistance) {
                    const t = hit.distance / this.brakeDistance;
                    const brakeFactor = THREE.MathUtils.clamp(t, 0.1, 1);
                    this.speed *= brakeFactor;
                }
            }
        }

        this.object.position.add(move);

        // --- Mise à jour de la rotation des roues ---
        if (this.wheelManager) {
            this.wheelManager.updateRotation(this.speed);

            // Optionnel: effet d'inclinaison lors du drift
            if (this.isDrifting && Math.abs(driftDir) > 0) {
                const side = driftDir > 0 ? 'left' : 'right';
                this.wheelManager.applyTilt(0.05 * this.driftIntensity, side);
            } else {
                this.wheelManager.resetTilt();
            }
        }

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

            // Recentrer le modèle visuellement
            try {
                const box = new THREE.Box3().setFromObject(newMesh);
                if (!box.isEmpty()) {
                    const center = new THREE.Vector3();
                    box.getCenter(center);

                    const min = box.min.clone();

                    // Recentre X/Z
                    newMesh.position.x -= center.x;
                    newMesh.position.z -= center.z;

                    // Aligne la base du mesh sur y = 0
                    newMesh.position.y -= min.y;

                    // Correction universelle : remonter la voiture un peu
                    newMesh.position.y += 0.05;
                }
            }
            catch (e) {
                console.warn('Recentering model failed:', e);
            }

            // Ajouter le nouveau modèle visuel (initialise aussi le WheelManager)
            this.setModel(newMesh);

            // Ajouter à la scène
            if (!scene.children.includes(this.object)) scene.add(this.object);

            // Fournir la référence de la scène à la voiture pour la détection d'obstacles
            this.setScene(scene);

            console.log(`${modelName} chargé avec succès !`);
        } catch (err) {
            console.error(`Erreur lors du chargement de la voiture ${modelName}:`, err);
            alert(`Impossible de charger la voiture ${modelName}. Vérifie le fichier dans /models/`);
        }
    }

    // --- Scene / obstacles helpers ---
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