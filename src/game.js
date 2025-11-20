import * as THREE from 'three/webgpu';
import { Scene } from './scene.js';
import { Camera } from './camera.js';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Car } from './car.js';

export class Game {
  constructor() {
    // Renderer
    this.renderer = new THREE.WebGPURenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // Scene + camera
    this.scene = new Scene();
    this.scene.loadScene('/scenes/scene_1.json').then(r =>   {} );
    this.camera = new Camera().camera;

    // Orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // Lights / Sky / Ground
    this.scene.addAmbientLight();
    this.scene.addDirectionalLight();
    this.scene.addGround('forrest_ground_01', 500);
    this.scene.addSkybox('citrus_orchard_road_puresky');

    // Car
    this.car = new Car();
    this.keysPressed = {};

    // Chargement voiture
    this.loadCar();

    // Event touches
    window.addEventListener('keydown', e => this.keysPressed[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', e => this.keysPressed[e.key.toLowerCase()] = false);

    // Render loop
    this.renderer.setAnimationLoop(this.render.bind(this));
  }

  loadCar() {
    const loader = new GLTFLoader();

    loader.load(
      '/models/car/Dodge Challenger.glb',
      (gltf) => {
        const carModel = gltf.scene;
        carModel.scale.set(1, 1, 1);
        this.car.setModel(carModel);

        this.car.object.position.set(0, 0, 0);
        this.scene.scene.add(this.car.object);

        this.controls.enabled = false;
        this.camera.position.set(0, 3, 6);
      },
      (progress) => {
        console.log(`Chargement voiture : ${(progress.loaded / progress.total) * 100}%`);
      },
      (error) => {
        console.error('Erreur GLTF : ', error);
      }
    );
  }


  updateCameraFollow() {
    const carPos = this.car.object.position;

    const idealOffset = new THREE.Vector3(0, 5, 12)
      .applyEuler(this.car.object.rotation)
      .add(carPos);


    const idealLookAt = carPos.clone().add(new THREE.Vector3(0, 1.5, 0));

    this.camera.position.lerp(idealOffset, 0.15);
    this.camera.lookAt(idealLookAt);
  }

  render() {
    if (this.car) {
      this.car.update(this.keysPressed);
      this.updateCameraFollow();
    }

    this.renderer.render(this.scene.scene, this.camera);
  }
}
