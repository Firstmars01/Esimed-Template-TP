// filepath: c:\Users\cleme\WebstormProjects\Esimed-Template-TP\src\game\WheelManager.js
import * as THREE from 'three';

export class WheelManager {
    constructor(carModel, config = {}) {
        // Configuration des roues
        this.wheelNames = config.wheelNames || [
            'Roue_ARD',  // Arrière droite
            'Roue_ARG',  // Arrière gauche
            'Roue_AVD',  // Avant droite
            'Roue_AVG'   // Avant gauche
        ];

        this.wheelRadius = config.wheelRadius || 0.3;
        this.rotationAxis = config.rotationAxis || 'x'; // 'x', 'y', ou 'z'
        this.maxSteeringAngle = config.maxSteeringAngle || Math.PI / 6; // 30 degrés max
        this.steeringAxis = config.steeringAxis || 'y'; // axe de direction (généralement Y)

        // Stockage des roues
        this.wheels = {
            front: [],  // Roues avant (directionnelles)
            rear: []    // Roues arrière
        };

        // Références individuelles
        this.wheelObjects = {};

        // Angles actuels
        this.currentSteeringAngle = 0;

        // Trouver les roues dans le modèle
        if (carModel) {
            this.findWheels(carModel);
        }
    }

    /**
     * Trouve toutes les roues dans le modèle de voiture
     */
    findWheels(carModel) {
        carModel.traverse((child) => {
            const name = child.name;

            // Vérifier si c'est une roue connue
            if (this.wheelNames.includes(name)) {
                this.wheelObjects[name] = child;

                // Classer en roues avant/arrière
                if (name.includes('AV')) {
                    this.wheels.front.push(child);
                    console.log(`✓ Roue avant trouvée : ${name}`);
                } else if (name.includes('AR')) {
                    this.wheels.rear.push(child);
                    console.log(`✓ Roue arrière trouvée : ${name}`);
                }
            }
        });

        // Vérification
        const totalFound = this.wheels.front.length + this.wheels.rear.length;
        console.log(`🎯 ${totalFound}/${this.wheelNames.length} roues trouvées`);

        if (totalFound === 0) {
            console.warn('⚠️ Aucune roue trouvée ! Vérifiez les noms dans votre modèle 3D.');
        }
    }

    /**
     * Met à jour la rotation des roues en fonction de la vitesse
     * @param {number} speed - Vitesse de la voiture
     */
    updateRotation(speed) {
        // Calculer l'angle de rotation basé sur la vitesse
        // Formule : angle = distance / rayon
        const rotationSpeed = speed / this.wheelRadius;

        // Roues arrière (rotation normale)
        this.wheels.rear.forEach(wheel => {
            if (!wheel) return;
            wheel.rotation[this.rotationAxis] += rotationSpeed;
        });

        // Roues avant (rotation inversée si nécessaire)
        this.wheels.front.forEach(wheel => {
            if (!wheel) return;
            // Inverser la rotation pour les roues avant
            wheel.rotation[this.rotationAxis] -= rotationSpeed;
        });
    }

    /**
     * Test de rotation pour trouver le bon axe
     * Appelez cette méthode pour voir quel axe fait tourner les roues correctement
     */
    testRotation() {
        console.log('🔍 Test de rotation des roues...');
        console.log('Appuyez sur 1, 2 ou 3 pour tester X, Y ou Z');

        window.addEventListener('keydown', (e) => {
            if (e.key === '1') {
                console.log('Test rotation X');
                this.getAllWheels().forEach(w => w.rotation.x += 0.1);
            }
            if (e.key === '2') {
                console.log('Test rotation Y');
                this.getAllWheels().forEach(w => w.rotation.y += 0.1);
            }
            if (e.key === '3') {
                console.log('Test rotation Z');
                this.getAllWheels().forEach(w => w.rotation.z += 0.1);
            }
        });
    }

    /**
     * Met à jour l'angle de direction des roues avant
     * @param {number} turnDirection - Direction (-1 gauche, 0 neutre, 1 droite)
     * @param {number} intensity - Intensité du virage (0 à 1)
     */
    updateSteering(turnDirection, intensity = 1.0) {
        // Calculer l'angle cible de direction
        const targetAngle = -turnDirection * this.maxSteeringAngle * intensity;

        // Lisser la transition
        this.currentSteeringAngle = THREE.MathUtils.lerp(
            this.currentSteeringAngle,
            targetAngle,
            0.2
        );

        // Appliquer aux roues avant uniquement
        this.wheels.front.forEach(wheel => {
            if (!wheel) return;
            wheel.rotation[this.steeringAxis] = this.currentSteeringAngle;
        });
    }

    /**
     * Réinitialise l'angle de direction (roues droites)
     */
    resetSteering() {
        this.currentSteeringAngle = THREE.MathUtils.lerp(
            this.currentSteeringAngle,
            0,
            0.15
        );

        this.wheels.front.forEach(wheel => {
            if (!wheel) return;
            wheel.rotation[this.steeringAxis] = this.currentSteeringAngle;
        });
    }

    /**
     * Applique une inclinaison aux roues (effet de suspension)
     * @param {number} tiltAmount - Quantité d'inclinaison
     * @param {string} side - 'left' ou 'right'
     */
    applyTilt(tiltAmount, side = 'left') {
        const tiltAxis = 'z'; // Généralement Z pour l'inclinaison latérale

        this.getAllWheels().forEach(wheel => {
            if (!wheel) return;

            const wheelSide = wheel.name.includes('D') ? 'right' : 'left';
            const tilt = (wheelSide === side) ? tiltAmount : -tiltAmount;

            wheel.rotation[tiltAxis] = THREE.MathUtils.lerp(
                wheel.rotation[tiltAxis],
                tilt,
                0.1
            );
        });
    }

    /**
     * Réinitialise l'inclinaison des roues
     */
    resetTilt() {
        const tiltAxis = 'z';

        this.getAllWheels().forEach(wheel => {
            if (!wheel) return;
            wheel.rotation[tiltAxis] = THREE.MathUtils.lerp(
                wheel.rotation[tiltAxis],
                0,
                0.1
            );
        });
    }

    /**
     * Obtient toutes les roues (avant + arrière)
     */
    getAllWheels() {
        return [...this.wheels.front, ...this.wheels.rear];
    }

    /**
     * Obtient une roue spécifique par son nom
     */
    getWheel(name) {
        return this.wheelObjects[name] || null;
    }

    /**
     * Vérifie si toutes les roues ont été trouvées
     */
    isComplete() {
        return this.getAllWheels().length === this.wheelNames.length;
    }

    /**
     * Change le rayon des roues (pour calcul de rotation)
     */
    setWheelRadius(radius) {
        this.wheelRadius = radius;
    }

    /**
     * Change l'angle maximum de direction
     */
    setMaxSteeringAngle(angle) {
        this.maxSteeringAngle = angle;
    }

    /**
     * Debug: affiche l'état des roues
     */
    debugInfo() {
        console.log('=== Wheel Manager Debug ===');
        console.log('Roues avant:', this.wheels.front.length);
        console.log('Roues arrière:', this.wheels.rear.length);
        console.log('Angle de direction actuel:', this.currentSteeringAngle);
        console.log('Rayon des roues:', this.wheelRadius);
        console.log('Complet:', this.isComplete());
    }
}