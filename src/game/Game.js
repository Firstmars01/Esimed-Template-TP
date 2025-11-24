import * as THREE from 'three/webgpu';
import { Scene } from '../core/Scene.js';
import { Camera } from '../core/Camera.js';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Car } from './Car.js';
import { SceneManager } from '../managers/SceneManager.js';
import { Timer } from './Timer.js';
import { Scoreboard } from './Scoreboard.js';

export class Game {
  constructor() {
    // Renderer
    this.renderer = new THREE.WebGPURenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // Scene & Camera
    this.scene = new Scene();
    this.sceneManager = new SceneManager(this.scene);

    this._sceneLoaded = false;
    this._pendingMoveToStart = false;
    this._gameFinished = false;
    this.finishObject = null;

    // Timer
    this.timer = new Timer();
    this._timerStarted = false; // <--- flag used to start the timer on first user action

    // Scoreboard
    this.scoreboard = new Scoreboard(10);
    this.scoreboard.setTrack('scene_1');

    this.scene.loadScene('/scenes/scene_1.json').then(() => {
      this._sceneLoaded = true;
      this.finishObject = this.findFinishObject();
      this.moveCarToStartIfReady();

      // Build obstacle list and assign it to the car if loaded
      const obstacles = this.buildObstacleList();
      if (this.car) {
        this.car.setScene(this.scene.scene);
        this.car.setObstacles(obstacles);
      }

      // Do NOT start the timer here — it will start on first player action
    });

    window.addEventListener('sceneChanged', () => {
      this._sceneLoaded = true;
      this.finishObject = this.findFinishObject();
      this.moveCarToStartIfReady();

      const obstacles = this.buildObstacleList();
      if (this.car) {
        this.car.setScene(this.scene.scene);
        this.car.setObstacles(obstacles);
      }

      // Reset the timer when the scene changes, but wait for player action before starting
      this.timer.reset();
      this._timerStarted = false;
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
    window.addEventListener('keydown', e => {
      const key = e.key.toLowerCase();
      this.keysPressed[key] = true;

      // Start the timer on the FIRST player action (Z,Q,S,D)
      if (!this._timerStarted && ['z', 'q', 's', 'd'].includes(key)) {
        this.timer.start();
        this._timerStarted = true;
      }
    });

    window.addEventListener('keyup', e => this.keysPressed[e.key.toLowerCase()] = false);

    // Create the scoreboard button
    this.scoreboard.createScoreboardButton();

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

        // Enable shadows for all meshes in the car model
        carModel.traverse(o => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });

        this.car.setModel(carModel);
        this.scene.scene.add(this.car.object);
        this.car.setScene(this.scene.scene);
        this.car.setObstacles(this.buildObstacleList());
        this.moveCarToStartIfReady();
        this.controls.enabled = false;
        this.camera.position.set(0, 3, 6);
      },
      (progress) => console.log(`Car loading: ${(progress.loaded / progress.total) * 100}%`),
      (error) => console.error('GLTF error:', error)
    );
  }

  buildObstacleList() {
    const obstacles = [];
    if (!this.scene || !this.scene.scene) return obstacles;

    this.scene.scene.traverse(o => {
      if (!o.isMesh) return;
      if (o.userData && o.userData.ignoreObstacle) return;
      const name = (o.name || '').toLowerCase();
      if (name.includes('finish') || name.includes('start') || name.includes('car')) return;
      obstacles.push(o);
    });

    return obstacles;
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
    if (this.car && !this._gameFinished) {
      this.car.update(this.keysPressed);
      this.updateCameraFollow();
      this.checkFinishCollision();

      if (this._timerStarted) this.timer.update();

      // NEW: Manual frustum culling for far-away objects
      if (!this._frustum) {
        this._frustum = new THREE.Frustum();
        this._frustumMatrix = new THREE.Matrix4();
      }

      this._frustumMatrix.multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse
      );
      this._frustum.setFromProjectionMatrix(this._frustumMatrix);

      // Disable objects outside of camera view
      this.scene.scene.traverse(obj => {
        if (obj.isMesh && obj.userData.isSelectable) {
          const bbox = new THREE.Box3().setFromObject(obj);
          obj.visible = this._frustum.intersectsBox(bbox);
        }
      });
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
      if (
        o.name?.toLowerCase().includes(keyword) ||
        String(o.userData?.source || '').toLowerCase().includes(keyword)
      ) {
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

    // Check if the car overlaps with or enters the finish zone
    if (
      finishBox.containsPoint(carCenter) ||
      (!carBox.isEmpty() && finishBox.intersectsBox(carBox))
    ) {
      this.onGameFinish(finish);
    }
  }

  onGameFinish(finish) {
    if (this._gameFinished) return;
    this._gameFinished = true;
    this.controls.enabled = false;
    this.keysPressed = {};

    const finalTime = this.timer.stop();

    console.log('Game finished! Reached:', finish.name || 'finish');
    console.log('Final time:', this.timer.getFormattedTime());

    const isRecord = this.scoreboard.isNewRecord(finalTime);
    const isTopScore = this.scoreboard.isTopScore(finalTime);

    let position = null;
    if (isTopScore) {
      const playerName = this.scoreboard.promptPlayerName();
      position = this.scoreboard.addScore(finalTime, playerName);
    }

    window.dispatchEvent(new CustomEvent('gameFinished', {
      detail: {
        finishName: finish.name || null,
        time: finalTime,
        formattedTime: this.timer.getFormattedTime(),
        isRecord: isRecord,
        isTopScore: isTopScore,
        position: position
      }
    }));

    this.createFinishOverlay(isRecord, position);
  }

  createFinishOverlay(isRecord = false, position = null) {
    if (document.getElementById('game-finish-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'game-finish-overlay';

    const msg = document.createElement('div');
    msg.textContent = isRecord ? '🏆 NEW RECORD!' : 'Finish!';
    overlay.appendChild(msg);

    const timeDisplay = document.createElement('div');
    let timeText = `Time: ${this.timer.getFormattedTime()}`;
    if (position) timeText += ` - Position: #${position}`;
    timeDisplay.textContent = timeText;
    overlay.appendChild(timeDisplay);

    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display: flex; gap: 20px; margin-top: 20px;';

    const btnRestart = document.createElement('button');
    btnRestart.textContent = 'Restart';
    btnRestart.addEventListener('click', () => this.restartGame());
    btnContainer.appendChild(btnRestart);

    const btnScoreboard = document.createElement('button');
    btnScoreboard.textContent = '🏆 View Scoreboard';
    btnScoreboard.addEventListener('click', () => {
      overlay.style.display = 'none';
      this.scoreboard.showScoreboard();
    });
    btnContainer.appendChild(btnScoreboard);

    overlay.appendChild(btnContainer);
    document.body.appendChild(overlay);
  }

  restartGame() {
    const overlay = document.getElementById('game-finish-overlay');
    if (overlay) overlay.remove();

    this._gameFinished = false;
    this.keysPressed = {};
    if (this.controls) this.controls.enabled = true;

    this.finishObject = this.findFinishObject();

    this.timer.reset();
    this._timerStarted = false; // <--- reset flag for the new game
    this.timer.start(); // will start again after first movement

    // Reset car physics or fallback to manual reset
    if (this.car?.reset) this.car.reset();
    else if (this.car?.object) {
      this.moveCarToStartIfReady();
      if (this.car.velocity?.set) this.car.velocity.set(0,0,0);
      if (this.car.angularVelocity?.set) this.car.angularVelocity.set(0,0,0);
      if (typeof this.car.speed !== 'undefined') this.car.speed = 0;
      if (typeof this.car.steering !== 'undefined') this.car.steering = 0;
    }

    // Reset camera position behind the car
    if (this.car?.object && this.camera) {
      const carPos = this.car.object.position.clone();
      const offset = new THREE.Vector3(0, 5, 12)
        .applyEuler(this.car.object.rotation)
        .add(carPos);
      this.camera.position.copy(offset);
      this.camera.lookAt(carPos.clone().add(new THREE.Vector3(0,1.5,0)));
    }

    if (this._pendingMoveToStart) this.moveCarToStartIfReady();
  }

  dispose() {
    if (this.timer) this.timer.destroy();
    if (this.scoreboard) this.scoreboard.hideScoreboard();
  }
}
