import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Loader global pour textures et modèles
export const textureloader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

/**
 * Load a GLTF model from /models/
 * @param {string} filename - name of the GLB file (without extension)
 * @param {boolean} useLOD - mark meshes for Level of Detail if they have >1000 vertices
 * @returns {Promise<THREE.Group>} the loaded mesh
 */
export const loadGltf = function (filename, useLOD = true) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      `/models/${filename}.glb`,
      (gltf) => {
        const mesh = gltf.scene;
        mesh.name = filename;

        // Traverse all children to enable shadows and mark for LOD if needed
        mesh.traverse(o => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;

            // Mark high-vertex meshes for Level of Detail
            if (useLOD && o.geometry) {
              const vertexCount = o.geometry.attributes.position.count;
              if (vertexCount > 1000) {
                o.userData.needsLOD = true;
              }
            }
          }
        });

        resolve(mesh);
      },
      undefined, // progress callback (optional)
      (error) => {
        console.error(`Error loading ${filename}:`, error);
        reject(error);
      }
    );
  });
};

/**
 * Load a GLTF car model from /models/car/
 * @param {string} filename - name of the car GLB file (without extension)
 * @returns {Promise<THREE.Group>} the loaded car mesh
 */
export const loadGltfCar = function (filename) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      `/models/car/${filename}.glb`,
      (gltf) => {
        const mesh = gltf.scene;
        mesh.name = filename;

        // Enable shadows for all meshes
        mesh.traverse(o => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
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

/**
 * Create a standard material with diffuse, normal, and ARM maps
 * @param {string} texture - base name of the texture
 * @param {number} repeats - number of times the texture should repeat
 * @returns {THREE.MeshStandardMaterial} the configured material
 */
export const createStandardMaterial = function (texture, repeats) {
  // Diffuse map
  const floorTexture = textureloader.load(`textures/${texture}_diff_1k.jpg`);
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(repeats, repeats);
  floorTexture.magFilter = THREE.NearestFilter;
  floorTexture.colorSpace = THREE.SRGBColorSpace;

  // Normal map
  const floorTextureNormal = textureloader.load(`textures/${texture}_nor_gl_1k.jpg`);
  floorTextureNormal.wrapS = THREE.RepeatWrapping;
  floorTextureNormal.wrapT = THREE.RepeatWrapping;
  floorTextureNormal.repeat.set(repeats, repeats);
  floorTextureNormal.magFilter = THREE.NearestFilter;
  floorTextureNormal.colorSpace = THREE.SRGBColorSpace;

  // ARM map (ambient occlusion, roughness, metalness)
  const floorTextureARM = textureloader.load(`textures/${texture}_arm_1k.jpg`);
  floorTextureARM.wrapS = THREE.RepeatWrapping;
  floorTextureARM.wrapT = THREE.RepeatWrapping;
  floorTextureARM.repeat.set(repeats, repeats);
  floorTextureARM.magFilter = THREE.NearestFilter;
  floorTextureARM.colorSpace = THREE.LinearSRGBColorSpace;

  return new THREE.MeshStandardMaterial({
    map: floorTexture,
    normalMap: floorTextureNormal,
    aoMap: floorTextureARM,        // R channel
    roughnessMap: floorTextureARM, // G channel
    metalnessMap: floorTextureARM, // B channel
    roughness: 1.0,
    metalness: 1.0,
  });
};
