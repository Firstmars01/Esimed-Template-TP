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

    // Scene & Camera
    this.scene = new Scene();
    this._sceneLoaded = false;
    this._pendingMoveToStart = false;
    this._gameFinished = false;
    this.finishObject = null;

    this.scene.loadScene('/scenes/scene_1.json').then(() => {
      this._sceneLoaded = true;
      this.finishObject = this.findFinishObject();
      this.moveCarToStartIfReady();
    });

    window.addEventListener('sceneChanged', () => {
      this._sceneLoaded = true;
      this.finishObject = this.findFinishObject();
      this.moveCarToStartIfReady();
    });

    this.camera = new Camera().camera;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // Lights / Ground / Sky
    this.scene.addAmbientLight();
    this.scene.addDirectionalLight();
    this.scene.addGround('forrest_ground_01', 500);
    this.scene.addSkybox('citrus_orchard_road_puresky');

    // Car
    this.car = new Car();
    this.keysPressed = {};
    this.loadCar();

    // Keyboard input
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
        this.moveCarToStartIfReady();
        this.controls.enabled = false;
        this.camera.position.set(0, 3, 6);
      },
      (progress) => console.log(`Chargement voiture : ${(progress.loaded / progress.total) * 100}%`),
      (error) => console.error('Erreur GLTF : ', error)
    );
  }

  updateCameraFollow() {
    const carPos = this.car.object.position;
    const idealOffset = new THREE.Vector3(0, 5, 12).applyEuler(this.car.object.rotation).add(carPos);
    const idealLookAt = carPos.clone().add(new THREE.Vector3(0, 1.5, 0));
    this.camera.position.lerp(idealOffset, 0.15);
    this.camera.lookAt(idealLookAt);
  }

  render() {
    if (this.car && !this._gameFinished) {
      this.car.update(this.keysPressed);
      this.updateCameraFollow();
      this.checkFinishCollision();
    }
    this.renderer.render(this.scene.scene, this.camera);
  }

  findStartObject() {
    return this._findObjectByName('star');
  }

  findFinishObject() {
    return this._findObjectByName('finish');
  }

  _findObjectByName(keyword) {
    let found = null;
    this.scene.scene.traverse(o => {
      if (found) return;
      if (o.name?.toLowerCase().includes(keyword) || String(o.userData?.source || '').toLowerCase().includes(keyword)) {
        found = o;
      }
    });
    return found;
  }

  moveCarToStartIfReady() {
    if (!this._sceneLoaded || !this.car?.object) {
      this._pendingMoveToStart = true;
      return;
    }

    const start = this.findStartObject();
    if (!start) return;

    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    start.getWorldPosition(worldPos);
    start.getWorldQuaternion(worldQuat);

    this.car.object.position.copy(worldPos);
    this.car.object.quaternion.copy(worldQuat);
    this._pendingMoveToStart = false;
  }

  getExpandedBoundingBox(object, margin = 4) {
    if (!object) return null;
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return null;
    box.expandByScalar(margin);
    return box;
  }

  checkFinishCollision() {
    if (this._gameFinished || !this.car?.object) return;

    const finish = this.finishObject || this.findFinishObject();
    if (!finish) return;
    this.finishObject = finish;

    const finishBox = this.getExpandedBoundingBox(finish, 0);
    if (!finishBox) return;

    const carCenter = this.car.object.position.clone();
    const carBox = new THREE.Box3().setFromObject(this.car.object);

    if (finishBox.containsPoint(carCenter) || (!carBox.isEmpty() && finishBox.intersectsBox(carBox))) {
      this.onGameFinish(finish);
    }
  }

  onGameFinish(finish) {
    if (this._gameFinished) return;
    this._gameFinished = true;
    this.controls.enabled = false;
    this.keysPressed = {};
    console.log('Game finished! Reached:', finish.name || 'finish');
    window.dispatchEvent(new CustomEvent('gameFinished', { detail: { finishName: finish.name || null } }));
    this.createFinishOverlay();
  }

  createFinishOverlay() {
    if (document.getElementById('game-finish-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'game-finish-overlay';

    const msg = document.createElement('div');
    msg.textContent = 'Game finish';
    overlay.appendChild(msg);

    const btn = document.createElement('button');
    btn.textContent = 'Restart';
    btn.addEventListener('click', () => this.restartGame());
    overlay.appendChild(btn);

    document.body.appendChild(overlay);
  }


  restartGame() {
    const overlay = document.getElementById('game-finish-overlay');
    if (overlay) overlay.remove();

    this._gameFinished = false;
    this.keysPressed = {};
    if (this.controls) this.controls.enabled = true;

    this.finishObject = this.findFinishObject();

    if (this.car?.reset) this.car.reset();
    else if (this.car?.object) {
      this.moveCarToStartIfReady();
      if (this.car.velocity?.set) this.car.velocity.set(0,0,0);
      if (this.car.angularVelocity?.set) this.car.angularVelocity.set(0,0,0);
      if (typeof this.car.speed !== 'undefined') this.car.speed = 0;
      if (typeof this.car.steering !== 'undefined') this.car.steering = 0;
    }

    if (this.car?.object && this.camera) {
      const carPos = this.car.object.position.clone();
      const offset = new THREE.Vector3(0, 5, 12).applyEuler(this.car.object.rotation).add(carPos);
      this.camera.position.copy(offset);
      this.camera.lookAt(carPos.clone().add(new THREE.Vector3(0,1.5,0)));
    }

    if (this._pendingMoveToStart) this.moveCarToStartIfReady();
  }
}
