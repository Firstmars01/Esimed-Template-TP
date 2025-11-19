import * as THREE from 'three/webgpu'
import {Scene} from "./scene.js";
import {Camera} from "./camera.js";
import {OrbitControls} from "three/examples/jsm/Addons.js";


export class Application {
    
    constructor() {
        this.renderer = new THREE.WebGPURenderer({antialias: true})
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        document.body.appendChild(this.renderer.domElement)

        this.scene = new Scene()
        this.scene.addCube()
        this.camera = new Camera().camera
        this.scene.addAmbiantLight()
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.scene.addSunLight()

        this.initParams()
        this.scene.addGround(this.groundTexture[4], this.groundParams.repeats)

        this.renderer.setAnimationLoop(this.render.bind(this))
    }

    render() {
        // calculs application
        this.renderer.render(this.scene.scene, this.camera)
    }


    initParams() {
      this.groundTexture =
        [
          'aerial_grass_rock',
          'brown_mud_leaves',
          'forest_floor',
          'forest_ground',
          'gravelly_sand'
        ]

      this.groundParams = {
        texture: this.groundTexture[0],
        repeats: 500
      }



    }

}
