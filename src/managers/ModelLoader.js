
import * as THREE from 'three/webgpu'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'

export const textureloader = new THREE.TextureLoader()
const gltfLoader = new GLTFLoader()

export const loadGltf = function (filename, useLOD = true) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      `/models/${filename}.glb`,
      (gltf) => {
        const mesh = gltf.scene;
        mesh.name = filename;

        mesh.traverse(o => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;

            // NOUVEAU: Simplifier géométries lointaines
            if (useLOD && o.geometry) {
              const vertexCount = o.geometry.attributes.position.count;
              if (vertexCount > 1000) {
                // Marquer pour LOD
                o.userData.needsLOD = true;
              }
            }
          }
        });

        resolve(mesh);
      },
      undefined,
      (error) => {
        console.error(`Error loading ${filename}:`, error);
        reject(error);
      }
    );
  });
};

export const loadGltfCar = function (filename) {
    return new Promise((resolve, reject) => {
        gltfLoader.load(
            `/models/car/${filename}.glb`,
            (gltf) => {
                const mesh = gltf.scene
                mesh.name = filename
                mesh.traverse(o => {
                    if (o.isMesh) {
                        o.castShadow = true;
                        o.receiveShadow = true;
                    }})
                resolve(mesh)
            },
            undefined,
            (error) => {
                console.error(`Error loading ${filename}:`, error)
                reject(error)
            }
        );
    });
}

export const createStandardMaterial = function (texture, repeats) {

    const floorTexture = textureloader.load(`textures/${texture}_diff_1k.jpg`)
    floorTexture.wrapS = THREE.RepeatWrapping
    floorTexture.wrapT = THREE.RepeatWrapping
    floorTexture.repeat.set(repeats, repeats)
    floorTexture.magFilter = THREE.NearestFilter
    floorTexture.colorSpace = THREE.SRGBColorSpace

    const floorTextureNormal = textureloader.load(`textures/${texture}_nor_gl_1k.jpg`)
    floorTextureNormal.wrapS = THREE.RepeatWrapping
    floorTextureNormal.wrapT = THREE.RepeatWrapping
    floorTextureNormal.repeat.set(repeats, repeats)
    floorTextureNormal.magFilter = THREE.NearestFilter
    floorTextureNormal.colorSpace = THREE.SRGBColorSpace

    const floorTextureARM = textureloader.load(`textures/${texture}_arm_1k.jpg`)
    floorTextureARM.wrapS = THREE.RepeatWrapping
    floorTextureARM.wrapT = THREE.RepeatWrapping
    floorTextureARM.repeat.set(repeats, repeats)
    floorTextureARM.magFilter = THREE.NearestFilter
    floorTextureARM.colorSpace = THREE.LinearSRGBColorSpace

    return new THREE.MeshStandardMaterial ({
        map: floorTexture,
        normalMap: floorTextureNormal,
        aoMap: floorTextureARM,          // R
        roughnessMap: floorTextureARM,   // G
        metalnessMap: floorTextureARM,   // B
        roughness: 1.0,
        metalness: 1.0,
    })

}
