import * as THREE from 'three/webgpu'

export class Camera {

    constructor() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
        this.defaultPosition()


    }

    defaultPosition(x = 10, y = 10, z = 10, target = new THREE.Vector3(0, 0, 0)) {
      this.camera.position.set(x, y, z)
      this.camera.lookAt(target)
      this.camera.updateProjectionMatrix()
    }

}

export class OrbitControls {

    constructor(camera, domElement) {
      const controls = new OrbitControls(this.camera, this.renderer.domElement)
      controls.target.set(0, 0, 0)
      controls.update()
    }

}