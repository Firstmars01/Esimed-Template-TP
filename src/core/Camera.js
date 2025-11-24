import * as THREE from 'three/webgpu'

export class Camera {

    constructor() {
      // Create a perspective camera with FOV 75,
      // aspect ratio based on the window size,
      // and near/far clipping planes.
      this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

      // Set the default camera position and orientation
      this.defaultPosition()


    }

  /**
   * Sets the camera's default position and target.
   * @param {number} x - X coordinate for camera position
   * @param {number} y - Y coordinate for camera position
   * @param {number} z - Z coordinate for camera position
   * @param {THREE.Vector3} target - Point the camera should look at
   */
    defaultPosition(x = 10, y = 10, z = 10, target = new THREE.Vector3(0, 0, 0)) {
      this.camera.position.set(x, y, z)
      this.camera.lookAt(target)
      this.camera.updateProjectionMatrix()
    }

}
