import * as THREE from 'three/webgpu'
import {Scene} from "./scene.js";
import {Camera} from "./camera.js";
import {OrbitControls} from "three/examples/jsm/Addons.js";



export class Application {
    
    constructor() {
        this.renderer = new THREE.WebGPURenderer({antialias: true})
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        document.body.appendChild(this.renderer.domElement)

        this.renderer.shadowMap.enabled = true

        this.scene = new Scene()
        //this.scene.addCube()
        this.scene.loadScene('/scenes/scene_1.json')

        this.camera = new Camera().camera
        this.scene.addAmbiantLight()
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.scene.addDirectionalLight()

        this.initParams()
        this.scene.addGround(this.groundTexture[3], this.groundParams.repeats)





      /*
        const gtlfLoader = new GLTFLoader();
        gtlfLoader.load('/models/spaceship.glb', (gltf) => {
          const obj = gltf.scene
          obj.position.z = 20
          this.scene.add(obj)
        });
    */
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
          'brown_mud_leaves_01',
          'forest_floor',
          'forrest_ground_01',
          'gravelly_sand'
        ]

      this.groundParams = {
        texture: this.groundTexture[0],
        repeats: 500
      }



    }

}
