import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default class ModelManager {
  private static instance: ModelManager | null = null;
  public gltfLoader: GLTFLoader | null = null;
}
