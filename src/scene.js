import * as THREE from 'three/webgpu'
import {createStandardMaterial} from "./tools.js";

export class Scene {

  constructor() {
    this.scene = new THREE.Scene();

  }

  addCube() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000, flatShading: true });
    const cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);
  }


  addAmbiantLight(){

    const ambiantLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambiantLight);
  }

  addSunLight(){

    const sun = new THREE.DirectionalLight(0xffffff, 2.0)
    sun.position.set(3, 50, 0)
    sun.target.position.set(0, 0, 0)
    this.scene.add(sun)

    const sunHelper = new THREE.DirectionalLightHelper(sun, 5)
    this.scene.add(sunHelper)
  }

  addGround(texture, repeats){
    const geometry = new THREE.PlaneGeometry(2000, 2000)

    const material = createStandardMaterial(texture, repeats)

    const ground = new THREE.Mesh(geometry, material)
    ground.rotation.x = - Math.PI / 2
    ground.position.y = -0.5
    //ground.receiveShadow = true
    this.scene.add(ground)
  }

}