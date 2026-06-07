'use client';

import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import gsap from 'gsap';
import type { ModelMeshData, ModelGroup } from '@/types/model';
import { CacheKey } from '@/types/index';
import { getFileSize } from '@/utils';
import { Reflector } from 'three/addons/objects/Reflector.js';

import { PerlinNoise, clamp } from '@/utils';
import { sceneConfig } from './constantsConfig';
import { SceneManager } from './sceneManager';

export interface ModelFileInfo {
  name: CacheKey;
  path: string;
  priority: number;
  isRawGlb: boolean;
  isBin: boolean;
}

export interface ModelLoadResult {
  fileInfo: ModelFileInfo;
  success: boolean;
  data?: THREE.Group;
  error?: string;
  retryCount: number;
}

type Model = { name: CacheKey; priority: number; suffix: '.bin' | '.glb' };

type BinHeader = {
  magic: string;
  version: number;
  length: number;
};

interface SpeedUpModel {
  wheels: THREE.Object3D<THREE.Object3DEventMap> | null;
  targetVelocity: number;
  currentVelocity: number;
  lerpStrength: number;
}

// 尾翼模型（weiyiModel）
export interface PositionRotationModel {
  originPos: THREE.Vector3;
  originRotZ: number;
  targetPos: THREE.Vector3;
  targetRotZ: number;
  visibility: number;
  model: THREE.Object3D | null;
}

// 带材质 + 显隐控制模型
export interface VisibilityMaterialModel {
  materials: THREE.MeshStandardMaterial | THREE.ShaderMaterial | null;
  visibility: number;
  model: THREE.Object3D | null;
}

export interface SimpleModel {
  car1: THREE.Object3D | null;
  car2: THREE.Object3D | null;
  length: number;
  visibility: number;
  moveParams1: THREE.Vector3;
  moveParams2: THREE.Vector3;
  model: THREE.Object3D | null;
}

// 只有材质 + 显隐（无model）
export interface MaterialOnlyModel {
  materials: THREE.MeshStandardMaterial | null;
  visibility: number;
}

// 点位数据（28个坐标）
const points = [
  [0.65, 1.04, -1.16],
  [-0.35, 1.43, -0.69],
  [1.08, 0.72, -1.01],
  [1.95, 0.76, -1],
  [-1.66, 1.34, 0],
  [-1.95, 0.58, -1],
  [0.35, 1.44, -0.08],
  [0.26, 1.46, -0],
  [2.53, 0.45, -0.64],
  [2.73, 0.43, -0.3],
  [2.78, 0.43, -0],
  [-2.3, 0.67, -0.88],
  [-2.72, 0.68, 0],
  [-2.69, 0.62, -0.4],
  [-2.24, 0.53, -0.94],
  [0.65, 1.04, 1.16],
  [-0.35, 1.43, 0.69],
  [1.08, 0.72, 1.01],
  [1.95, 0.76, 1],
  [-1.95, 0.58, 1],
  [0.35, 1.44, 0.08],
  [2.53, 0.45, 0.64],
  [2.73, 0.43, 0.3],
  [-2.3, 0.67, 0.88],
  [-2.69, 0.62, 0.4],
  [-2.24, 0.53, 0.94],
  [2.62, 0.43, 0.4],
  [-2.69, 0.62, -0.4],
];

/**
 * 模型管理器
 * 加载、销毁、组织模型
 */
export class ModelManager {
  private static instance: ModelManager | null = null;
  public sceneManager: SceneManager | null = null;

  public gltfLoader: GLTFLoader | null = null;

  private readonly modelDir = '/model/';
  private readonly maxRetries = 2;
  private readonly fileConfigs: Model[] = [
    { name: CacheKey.sm_car, priority: 1, suffix: '.bin' },
    { name: CacheKey.sm_car_lightbar, priority: 1, suffix: '.bin' },
    { name: CacheKey.sm_carradar, priority: 2, suffix: '.bin' },
    { name: CacheKey.sm_curvature, priority: 2, suffix: '.bin' },
    { name: CacheKey.sm_linecar, priority: 2, suffix: '.bin' },
    { name: CacheKey.sm_simpleCar, priority: 2, suffix: '.bin' },
    { name: CacheKey.sm_size, priority: 2, suffix: '.bin' },
    { name: CacheKey.sm_speedup, priority: 2, suffix: '.bin' },
    { name: CacheKey.sm_startroom, priority: 2, suffix: '.glb' },
    { name: CacheKey.sm_windspeed, priority: 2, suffix: '.bin' },
  ];
  private loadedBytes: number = 0;

  private readonly binConstants = {
    bin_type: 'gltf',
    pre_glb_header_check_digit: '1031088470',
    cur_glb_header_check_digit: '152147171185',
    fixed_head_length: 12,
    JSON: 1313821514, // 0x4E4F534A "JSON"
    BIN: 5130562, // 0x004E4942 "BIN\0"
  };

  private fileList: ModelFileInfo[] = [];
  public modelCache = new Map<CacheKey, THREE.Group>();
  private abortController: AbortController | null = null;
  private isLoading = false;

  // 反射平面
  public reflectorPlane: Reflector | null = null;

  private static readonly _tempVec3 = new THREE.Vector3();

  // 加速相关（车轮旋转 + 速度控制 + 相机震动强度 + 背景加速效果）
  public carSpeedUp: SpeedUpModel = {
    wheels: null,
    targetVelocity: 0,
    currentVelocity: 0,
    lerpStrength: 1,
  };

  // 'weiyi' 模型
  public weiyiModel: PositionRotationModel = {
    model: null,
    originPos: new THREE.Vector3(),
    originRotZ: 0,
    targetPos: new THREE.Vector3(-2.3626, 1.1511, 0),
    targetRotZ: (-12.9 / 360) * Math.PI * 2,
    visibility: 0,
  };

  // sm_car_lightbar
  public lightbarModel: VisibilityMaterialModel = {
    model: null,
    materials: null,
    visibility: 0,
  };

  // sm_size
  public sizeModel: VisibilityMaterialModel = {
    model: null,
    visibility: 0,
    materials: null,
  };

  // sm_curvature
  public curvatureModel: VisibilityMaterialModel = {
    model: null,
    materials: null,
    visibility: 0,
  };

  // sm_windspeed
  public windSpeedModel: VisibilityMaterialModel = {
    model: null,
    visibility: 0,
    materials: null,
  };

  // sm_linecar
  public linecarModel: VisibilityMaterialModel = {
    model: null,
    visibility: 0,
    materials: null,
  };

  // m_radarPoints 雷达点数据
  public carRadarPointModel = {
    visibility: 0,
    materials: null as THREE.ShaderMaterial | null,
    model: null as THREE.InstancedMesh | null,
  };

  // sm_carradar
  public carRadarModel: VisibilityMaterialModel = {
    model: null,
    materials: null,
    visibility: 0,
  };

  // sm_simpleCar
  public simpleCarData: SimpleModel = {
    car1: null as THREE.Object3D | null,
    car2: null as THREE.Object3D | null,
    length: 17, // 移动边界长度
    visibility: 0,
    moveParams1: new THREE.Vector3(),
    moveParams2: new THREE.Vector3(),
    model: null,
  };

  private constructor() {
    this.fileList = this.fileConfigs
      .map((c) => ({
        ...c,
        path: this.modelDir + (c.name === 'sm_startroom' ? 'sm_startroom.raw' : c.name) + c.suffix,
        isRawGlb: c.suffix === '.glb',
        isBin: c.suffix === '.bin',
      }))
      .sort((a, b) => a.priority - b.priority);

    this.initLoader();
  }

  public static getInstance() {
    if (process.env.NODE_ENV === 'development') {
      ModelManager.instance = null;
    }

    if (!ModelManager.instance) ModelManager.instance = new ModelManager();
    return ModelManager.instance;
  }

  // 反射平面
  public initReflector() {
    if (this.reflectorPlane) return;

    // 现在创建才安全！canvas 已有尺寸
    this.reflectorPlane = new Reflector(new THREE.PlaneGeometry(1000, 1000), {
      color: 0x7f7f7f,
      textureWidth: 1024,
      textureHeight: 1024,
    });

    if (!this.sceneManager) {
      this.sceneManager = SceneManager.getInstance();
    }

    // 添加到场景
    this.sceneManager.scene.add(this.reflectorPlane);
  }

  public async computeFileSize() {
    let totalBytes = 0;

    for (const f of this.fileList) {
      const size = await getFileSize(f.path);
      (f as any).size = size;
      totalBytes += size;
    }

    return totalBytes;
  }

  private initLoader() {
    if (typeof window === 'undefined' || this.gltfLoader) return;

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);
    gltfLoader.setMeshoptDecoder(MeshoptDecoder);
    this.gltfLoader = gltfLoader;
  }

  // 加载
  async loadAllModel(onProgress?: ProgressCallback) {
    if (this.isLoading) return;
    // 中止使用此管理器的加载器中正在进行的请求
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    this.isLoading = true;

    // await Promise.resolve();

    try {
      const results: ModelLoadResult[] = [];

      for (const f of this.fileList) {
        if (signal.aborted) break;

        const res = await this.loadWithRetry(f, () => {
          const size = (f as any).size || 0;
          this.loadedBytes += size;

          onProgress?.({
            loadedBytes: this.loadedBytes,
            currentFile: f.name,
          });
        });
        results.push(res);
      }
      this.isLoading = false;

      console.log('all moelCache', this.modelCache);
      return results.every((r) => r.success);
    } catch (e) {
      this.isLoading = false;
      throw e;
    }
  }

  // 重试
  private async loadWithRetry(f: ModelFileInfo, onStep: () => void): Promise<ModelLoadResult> {
    let attempt = 0;
    while (attempt <= this.maxRetries) {
      try {
        const data = await this.loadSingle(f);
        onStep();
        return { fileInfo: f, success: true, data, retryCount: attempt };
      } catch (e: any) {
        attempt++;
        if (attempt > this.maxRetries) {
          onStep();
          return { fileInfo: f, success: false, error: e.message, retryCount: attempt };
        }
        await new Promise((r) => setTimeout(r, 300 * attempt));
      }
    }
    onStep();
    return { fileInfo: f, success: false, error: 'max retry', retryCount: attempt };
  }

  // 单个加载
  private async loadSingle(f: ModelFileInfo): Promise<THREE.Group> {
    // 检查缓存
    if (this.modelCache.has(f.name)) return this.modelCache.get(f.name)!;

    if (!this.gltfLoader) {
      this.initLoader();
      if (!this.gltfLoader) throw new Error('GLTFLoader');
    }

    const signal = this.abortController!.signal;
    const res = await fetch(f.path, { signal });

    if (!res.ok) throw new Error(`${f.path}: ${res}`);

    const arrayBuffer = await res.arrayBuffer();

    let glbBuffer: ArrayBuffer;

    // raw glb 直接加载
    if (f.isRawGlb) {
      glbBuffer = arrayBuffer;
    }
    // .bin
    else if (f.isBin) {
      const headerStr = new Uint8Array(arrayBuffer, 0, 4).join('');
      if (
        headerStr !== this.binConstants.pre_glb_header_check_digit &&
        headerStr !== this.binConstants.cur_glb_header_check_digit
      ) {
        throw new Error(`非法 .bin: ${f.name}`);
      }

      try {
        const headerView = new DataView(arrayBuffer, 0, this.binConstants.fixed_head_length); // 读取 GLB 头部（固定 12 字节）

        const header: BinHeader = {
          magic: new TextDecoder().decode(new Uint8Array(arrayBuffer, 0, 4)), // 二进制转字符串 "glTF"
          version: headerView.getUint32(4, true), // glTF 版本号   2
          length: headerView.getUint32(8, true), // 整个文件总长度
        };

        const { content, body } = this.parseToContentAndBody(header, arrayBuffer);

        if (!content || !body) throw new Error('解析 .bin 失败');

        glbBuffer = this.buildGLBFromParts(header, content, body);
      } catch (e) {
        throw new Error(`解析 .bin ${f.name} 失败`);
      }
    } else {
      throw new Error(`解析 ${f.name} 失败`);
    }

    const gltf = await this.parseGLBBuffer(glbBuffer);

    const modelRoot = gltf.scene; // 拿到 3D 根节点
    modelRoot.userData.animations = gltf.animations || ([] as THREE.AnimationClip[]);
    modelRoot.userData.meshData = this.traverseAndCollectModelData(modelRoot) as ModelMeshData;
    modelRoot.name = f.name;

    this.modelCache.set(f.name, modelRoot);
    sceneConfig[f.name] = modelRoot;
    return modelRoot;
  }

  public getCache(cacheName: CacheKey) {
    if (this.modelCache.has(cacheName)) return this.modelCache.get(cacheName)!;
  }

  public getAllCache() {
    return this.modelCache;
  }

  cancel() {
    this.abortController?.abort();
    this.isLoading = false;
  }
  clearCache() {
    this.modelCache.clear();
  }
  isBusy() {
    return this.isLoading;
  }

  /**
   * 异或解密函数
   * @param {Uint8Array} data - 待解密数据
   * @param {number} key - 解密密钥，默认 255
   * @returns {Uint8Array} 解密后的数据
   */
  private decode(buffer: Uint8Array, key = 255) {
    for (let i = 0, len = buffer.length; i < len; i++) {
      buffer[i] ^= key; // 异或运算
    }
    return buffer;
  }

  private parseGLBBuffer(buffer: ArrayBuffer): Promise<GLTF> {
    if (!this.gltfLoader) {
      this.initLoader();
    }
    return new Promise((resolve, reject) => {
      const blob = new Blob([buffer], { type: 'model/gltf-binary' });
      const url = URL.createObjectURL(blob);

      this.gltfLoader!.load(
        url,
        (gltf) => {
          URL.revokeObjectURL(url);
          resolve(gltf);
        },
        undefined,
        (err) => {
          URL.revokeObjectURL(url);
          reject(err);
        }
      );
    });
  }

  private parseToContentAndBody(
    header: BinHeader,
    buffer: ArrayBuffer
  ): { content: string; body: ArrayBuffer | null } {
    let content = null; // 存放解析出来的 glTF JSON 字符串
    let body = null; // 存放模型二进制数据（顶点、纹理等）

    // 判断是否是【加密 GLB】
    const isLegacy =
      new Uint8Array(buffer, 0, 4).join('') === this.binConstants.cur_glb_header_check_digit;

    try {
      // 解析JSON和二进制块
      const dataLength = header.length - this.binConstants.fixed_head_length;
      const dataView = new DataView(buffer, this.binConstants.fixed_head_length);

      let offset = 0; // 读取指针

      while (offset < dataLength) {
        // 读取Chunk Length：当前块有多少字节
        const chunkLength = dataView.getUint32(offset, true);
        offset += 4;

        // 如果是加密 GLB → 解密这段数据
        if (isLegacy) {
          const decryptData = new Uint8Array(
            buffer,
            this.binConstants.fixed_head_length + offset,
            chunkLength + 4
          );
          this.decode(decryptData); // 调用异或解密函数
        }

        // 读取【块类型】：JSON 还是 BIN
        const chunkType = dataView.getUint32(offset, true);
        offset += 4;

        // --------------------------
        // 4. 根据块类型解析
        // --------------------------
        if (chunkType === this.binConstants.JSON) {
          // JSON 块：二进制转字符串
          const jsonBytes = new Uint8Array(
            buffer,
            this.binConstants.fixed_head_length + offset,
            chunkLength
          );
          content = new TextDecoder().decode(jsonBytes);
        } else if (chunkType === this.binConstants.BIN) {
          // 二进制块：直接切片保存（模型、纹理等）
          const binStart = this.binConstants.fixed_head_length + offset;
          body = buffer.slice(binStart, binStart + chunkLength);
        }

        // 移动指针到下一个块
        offset += chunkLength;
      }
      if (content === null) {
        throw new Error('content');
      }

      return { content, body };
    } catch (e) {
      console.log(e);
      return { content: '', body: null };
    }
  }

  private buildGLBFromParts(header: BinHeader, content: string, body: ArrayBuffer) {
    // JSON 字符串转 UTF-8 字节数组
    const encoder = new TextEncoder();
    const jsonData = encoder.encode(content);
    // GLB 要求 JSON chunk 数据长度必须是 4 字节对齐
    const jsonChunkLength = (jsonData.length + 3) & ~3; // 向上取整到 4 的倍数
    const jsonPadding = jsonChunkLength - jsonData.length;

    // BIN chunk 长度（body 已经是 ArrayBuffer）
    const binChunkLength = body.byteLength;
    // BIN chunk 数据也需要 4 字节对齐（通常已经是，但保险处理）
    const binPaddedLength = (binChunkLength + 3) & ~3;
    const binPadding = binPaddedLength - binChunkLength;

    // 总文件长度 = 12 + (8 + jsonChunkLength) + (8 + binPaddedLength)
    const totalLength = 12 + 8 + jsonChunkLength + 8 + binPaddedLength;

    // 4. 构建 ArrayBuffer
    const buffer = new ArrayBuffer(totalLength);
    const view = new DataView(buffer);

    // 写入 GLB 头
    const magic = 0x46546c67; // "glTF" 的小端字节序
    view.setUint32(0, magic, true);
    view.setUint32(4, header.version, true); // 通常是 2
    view.setUint32(8, totalLength, true);

    let offset = 12;

    // 写入 JSON chunk
    view.setUint32(offset, jsonChunkLength, true);
    offset += 4;
    view.setUint32(offset, 0x4e4f534a, true);
    offset += 4; // "JSON" 类型
    // 复制 JSON 数据
    new Uint8Array(buffer, offset, jsonData.length).set(jsonData);
    offset += jsonChunkLength; // 已对齐

    // 写入 BIN chunk
    view.setUint32(offset, binPaddedLength, true);
    offset += 4;
    view.setUint32(offset, 0x004e4942, true);
    offset += 4; // "BIN\0" 类型
    // 复制 body 数据
    new Uint8Array(buffer, offset, binChunkLength).set(new Uint8Array(body));
    // 剩余 padding 自动为 0（无需显式填充）

    return buffer;
  }

  // 递归遍历场景，收集所有模型数据
  private traverseAndCollectModelData(
    root: THREE.Object3D,
    result: {
      meshes: THREE.Mesh[];
      materials: Record<string, THREE.Material>;
      textures: Record<string, THREE.Texture>;
    } = { meshes: [], materials: {}, textures: {} }
  ) {
    const TEXTURE_PROPERTIES = [
      'alphaMap',
      'aoMap',
      'bumpMap',
      'displacementMap',
      'emissiveMap',
      'envMap',
      'lightMap',
      'metalnessMap',
      'normalMap',
      'roughnessMap',
      'specularMap',
    ];
    root.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        const material = node.material;

        // 收集所有 Mesh
        result.meshes.push(node);

        // 收集材质（以材质名称为 key）
        if (material.name) {
          result.materials[material.name] = material;
        }

        // 收集材质上所有贴图（以 uuid 为 key）
        let texture: THREE.Texture | null = null;
        for (const mapName of TEXTURE_PROPERTIES) {
          texture = material[mapName as keyof typeof material];
          if (texture instanceof THREE.Texture) {
            result.textures[texture.uuid] = texture;
          }
        }

        // 添加 uv2
        let geometry = node.geometry;
        if (!geometry.attributes.uv2) {
          // 优先使用uv1，如果没有uv1则使用uv
          const sourceUV = geometry.attributes.uv1 || geometry.attributes.uv;

          if (sourceUV && sourceUV.array && sourceUV.itemSize === 2) {
            geometry.setAttribute('uv2', sourceUV.clone());
          } else {
            console.warn(`${node.type} ${node.name} 没有有效的UV属性，无法生成uv2`);
          }
        }
      }
    });

    // 返回整理完成的数据
    return result;
  }

  public static getInstanceVersion(): number {
    return (ModelManager as any)._version || 0;
  }

  // 初始化 车轮旋转 + 速度控制 + 相机震动强度 + 背景加速效果
  public initCarSpeedUp() {
    const carModel = this.modelCache.get('sm_car' as CacheKey);
    if (!carModel) return;

    this.carSpeedUp.wheels =
      carModel.children[0].children.find((item) => item.name === 'Wheels') || null;
  }
  public setCarSpeedRadarVisibility(value: number) {
    this.carSpeedUp.targetVelocity = value;
  }
  public setLerpStrength(r: number) {
    this.carSpeedUp.lerpStrength = r;
  }

  public carSpeedUpUpdate(value: number) {
    this.carSpeedUp.currentVelocity = THREE.MathUtils.lerp(
      this.carSpeedUp.currentVelocity,
      this.carSpeedUp.targetVelocity,
      value * this.carSpeedUp.lerpStrength
    );

    for (const wheel of this.carSpeedUp.wheels?.children || []) {
      wheel.rotateZ(
        ((-this.carSpeedUp.currentVelocity * value) / (Math.PI * 0.737774)) * 2 * Math.PI
      );
    }

    sceneConfig.u_floorUVOffset.value.x += this.carSpeedUp.currentVelocity * value;
  }

  // 初始化 weiyi 模型
  public initWeiyiModel() {
    const carModel = this.modelCache.get('sm_car' as CacheKey);
    if (!carModel) return;

    this.weiyiModel.model =
      carModel.children[0].children.find((item) => item.name === 'WeiYi') || null;

    if (!this.weiyiModel.model) return;
    this.weiyiModel.originPos.copy(this.weiyiModel.model.position);
    this.weiyiModel.originRotZ = this.weiyiModel.model.rotation.z;

    this.setWeiYiPosition(0);
  }

  // 设置 weiyi 模型位置
  public setWeiYiPosition(value: number) {
    if (!this.weiyiModel || !this.weiyiModel.model) return;

    const { model, originPos, targetPos, originRotZ, targetRotZ } = this.weiyiModel;

    this.weiyiModel.visibility = THREE.MathUtils.clamp(value, 0, 1);

    // 位置插值
    const tempPos = new THREE.Vector3();
    tempPos.copy(originPos).lerp(targetPos, this.weiyiModel.visibility);
    model!.position.copy(tempPos);

    // 旋转插值
    model.rotation.z = THREE.MathUtils.lerp(originRotZ, targetRotZ, this.weiyiModel.visibility);
  }

  // 初始化 sm_car_lightbar
  public initLightbarModel() {
    // 拿到灯光模型
    const lightModel = this.modelCache.get('sm_car_lightbar' as CacheKey);
    if (!lightModel || !lightModel.userData.meshData?.materials) return;

    if (!this.sceneManager) {
      this.sceneManager = SceneManager.getInstance();
    }
    this.sceneManager?.scene.add(lightModel);

    this.lightbarModel.model = lightModel;
    this.lightbarModel.materials = lightModel.userData.meshData.materials.lightbar_Baked;

    if (!this.sceneManager) {
      this.sceneManager = SceneManager.getInstance();
    }

    this.sceneManager?.scene.add(lightModel);

    // 默认关闭灯光
    this.setLightbarVisibility(0);
    this.lightbarModel.materials &&
      ((this.lightbarModel.materials as THREE.MeshStandardMaterial).emissiveIntensity =
        500 * 0 + 1);
  }
  public updateLightbarIntensity() {
    const { materials, visibility } = this.lightbarModel;
    if (!materials) return;

    // 原组件公式：500 * 透明度 + 1
    (materials as THREE.MeshStandardMaterial).emissiveIntensity = 500 * visibility + 1;
  }

  // 设置 sm_car_lightbar.lightbar_Baked 显隐
  public setLightbarVisibility(value: number) {
    // 限制 0~1
    value = THREE.MathUtils.clamp(value, 0, 1);
    this.lightbarModel.visibility = value;

    // 立即更新材质亮度
    // this.updateLightbarIntensity();
  }

  // 初始化 sm_size
  public initSizeModel() {
    const sizeModel = this.modelCache.get('sm_size' as CacheKey);

    if (!sizeModel || !sizeModel.userData.meshData?.materials) return;

    if (!this.sceneManager) {
      this.sceneManager = SceneManager.getInstance();
    }
    this.sceneManager?.scene.add(sizeModel);

    this.sizeModel.model = sizeModel;
    // 保存材质
    this.sizeModel.materials = sizeModel.userData.meshData.materials;

    // 初始化：隐藏
    this.setSizeVisibility(0);
  }

  // 设置 sm_size 显隐
  public setSizeVisibility(value: number) {
    const { materials, model } = this.sizeModel;

    if (!model || !materials) return;

    // 保存值
    this.sizeModel.visibility = value;

    // 控制模型显隐（>=0.005 显示）
    model.visible = value >= 0.005;

    // 遍历所有材质更新透明度（兼容普通材质 + 着色器材质）
    Object.values(materials).forEach((mat: THREE.ShaderMaterial | THREE.MeshBasicMaterial) => {
      mat.opacity = value;

      if (mat instanceof THREE.ShaderMaterial && mat.uniforms?.opacity) {
        mat.uniforms.opacity.value = value;
      }
    });
  }

  // initCurvatureModel
  public initCurvatureModel() {
    const model = this.modelCache.get('sm_curvature' as CacheKey);
    if (!model || !model.userData.meshData?.materials) return;

    if (!this.sceneManager) {
      this.sceneManager = SceneManager.getInstance();
    }
    this.sceneManager?.scene.add(model);

    this.curvatureModel.model = model;
    this.curvatureModel.materials = model.userData.meshData.materials;

    // 初始化隐藏
    this.setCurvatureVisibility(0);
  }

  public setCurvatureVisibility(value: number) {
    const { materials, model } = this.curvatureModel;

    if (!model || !materials) return;

    this.curvatureModel.visibility = value;

    // 控制显隐
    model.visible = value >= 0.005;

    // 更新所有材质透明度
    Object.values(materials).forEach((mat: THREE.ShaderMaterial | THREE.MeshBasicMaterial) => {
      mat.opacity = value;

      // Shader材质兼容
      if (mat instanceof THREE.ShaderMaterial && mat.uniforms?.opacity) {
        mat.uniforms.opacity.value = value;
      }
    });
  }

  // sm_windspeed
  public initWindspeedModel() {
    const model = this.modelCache.get('sm_windspeed' as CacheKey);
    if (!model || !model.userData.meshData?.materials) return;

    if (!this.sceneManager) {
      this.sceneManager = SceneManager.getInstance();
    }
    this.sceneManager?.scene.add(model);

    this.windSpeedModel.model = model;
    this.windSpeedModel.materials = model.userData.meshData.materials;

    // 默认隐藏
    this.setWindSpeedVisibility(0);
  }

  public setWindSpeedVisibility(value: number) {
    const { materials, model } = this.windSpeedModel;

    if (!model || !materials) return;

    if (!this.sceneManager) {
      this.sceneManager = SceneManager.getInstance();
    }

    // 保存当前值
    this.windSpeedModel.visibility = value;

    // 控制模型显隐
    model.visible = value >= 0.005;

    // 更新所有材质透明度
    Object.values(materials).forEach((mat: THREE.ShaderMaterial | THREE.MeshBasicMaterial) => {
      mat.opacity = value;

      // 兼容 Shader 材质
      if (mat instanceof THREE.ShaderMaterial && mat.uniforms?.opacity != null) {
        mat.uniforms.opacity.value = value;
      }
    });
  }

  // sm_linecar
  public initLinecarModel() {
    const model = this.modelCache.get('sm_linecar' as CacheKey);
    if (!model || !model.userData.meshData?.materials) return;

    if (!this.sceneManager) {
      this.sceneManager = SceneManager.getInstance();
    }
    this.sceneManager?.scene.add(model);

    this.linecarModel.model = model;
    this.linecarModel.materials = model.userData.meshData.materials;

    // 默认隐藏
    this.setLineCarVisibility(0);
  }

  public setLineCarVisibility(value: number) {
    const { materials, model } = this.linecarModel;

    if (!model || !materials) return;

    // 保存值
    this.linecarModel.visibility = value;

    // 显隐控制
    model.visible = value >= 0.005;

    // 遍历材质更新
    Object.values(materials).forEach((mat: THREE.ShaderMaterial | THREE.MeshBasicMaterial) => {
      sceneConfig.u_car_discard.value = 1 - value;

      mat.opacity = value;

      if (mat instanceof THREE.ShaderMaterial && mat.uniforms?.opacity) {
        mat.uniforms.opacity.value = value;
      }
    });
  }

  // sm_carradar points
  public initCarRadarPointsModel(pointMaterial: THREE.ShaderMaterial) {
    // if (this.carRadarPointModel.instancedMesh) return;
    const geometry = new THREE.PlaneGeometry(0.1, 0.1);
    // 实例化
    const instancedMesh = new THREE.InstancedMesh(geometry, pointMaterial, points.length);
    instancedMesh.frustumCulled = false;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);

    for (let i = 0; i < points.length; i++) {
      position.set(points[i][0], points[i][1], points[i][2]);
      matrix.compose(position, rotation, scale);
      instancedMesh.setMatrixAt(i, matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;

    if (!this.sceneManager) {
      this.sceneManager = SceneManager.getInstance();
    }
    this.sceneManager.scene.add(instancedMesh);

    this.carRadarPointModel.model = instancedMesh;
    if (!pointMaterial) return;
    this.carRadarPointModel.materials = pointMaterial;

    this.setRadarPointsVisibility(0);
  }

  // 0~1 控制雷达点显示/透明度
  public setRadarPointsVisibility(value: number) {
    const { model, materials } = this.carRadarPointModel;
    if (!model || !materials) return;

    value = THREE.MathUtils.clamp(value, 0, 1);
    this.carRadarPointModel.visibility = value;

    model.visible = value >= 0.005;
    materials.uniforms.opacity.value = value;
  }

  // sm_carradar
  public initCarradarModel() {
    const model = this.modelCache.get('sm_carradar' as CacheKey);
    if (!model || !model.userData.meshData?.materials) return;

    this.carRadarModel.materials = model.userData.meshData.materials;
    this.carRadarModel.model = model;

    if (!this.sceneManager) {
      this.sceneManager = SceneManager.getInstance();
    }
    this.sceneManager.scene.add(model);

    // 默认隐藏
    this.setCarRadarVisibility(0);
  }

  public setCarRadarVisibility(value: number) {
    const { model, materials } = this.carRadarModel;
    if (!model || !materials) return;

    // 0~1 限制
    value = THREE.MathUtils.clamp(value, 0, 1);
    this.carRadarModel.visibility = value;

    sceneConfig.u_floor_typeSwitch.value = value;

    model.visible = value >= 0.005;

    Object.values(materials).forEach((mat: THREE.ShaderMaterial | THREE.MeshBasicMaterial) => {
      mat.opacity = value;

      if (mat instanceof THREE.ShaderMaterial && mat.uniforms?.opacity) {
        mat.uniforms.opacity.value = value;
      }
    });
  }

  // sm_simpleCar
  public initSimpleCarModel() {
    const model = this.modelCache.get('sm_simpleCar' as CacheKey);
    if (!model || !model.userData.meshData?.materials) return;

    const car1 = model.children[0] as THREE.Object3D;
    const car2 = car1.clone();
    model.add(car2);
    sceneConfig.sm_simpleCar.add(car2);

    if (!this.sceneManager) {
      this.sceneManager = SceneManager.getInstance();
    }
    this.sceneManager?.scene.add(model);

    this.simpleCarData.model = model;
    this.simpleCarData.car1 = car1;
    this.simpleCarData.car2 = car2;

    this.randomUpdate(this.simpleCarData.moveParams1, car1);
    this.randomUpdate(this.simpleCarData.moveParams2, car2);

    this.setSimpleCarVisibility(0);
  }

  // 随机更新车辆方向、位置、速度
  private randomUpdate(params: THREE.Vector3, car: THREE.Object3D) {
    // 随机左右方向
    params.x = Math.random() > 0.5 ? -1 : 1;
    // 随机纵向位置 2.5 ~ 5.5
    params.y = Math.random() * 3 + 2.5;
    // 随机速度 1 ~ 3
    params.z = Math.random() * 2 + 1;
    // 设置初始 X 位置
    car.position.x = this.simpleCarData.length * -params.x;
  }

  public updateSimpleCar(deltaTime: number) {
    const { car1, car2, length, moveParams1, moveParams2 } = this.simpleCarData;
    if (!car1 || !car2) return;

    // 第一辆车移动逻辑
    const pos1 = car1.position;
    pos1.set(pos1.x + deltaTime * moveParams1.z * moveParams1.x, pos1.y, moveParams1.y);

    // 同步到全局 shader 变量
    sceneConfig.u_simpleCarCenter1.value.copy(pos1);
    // 越界重置
    if (Math.abs(pos1.x) > length) {
      this.randomUpdate(this.simpleCarData.moveParams1, car1);
    }

    // 第二辆车移动逻辑
    const pos2 = car2.position;

    pos2.set(pos2.x + deltaTime * moveParams2.z * moveParams2.x, pos1.y, -moveParams2.y);

    sceneConfig.u_simpleCarCenter2.value.copy(pos2);
    // 越界重置
    if (Math.abs(pos2.x) > length) {
      this.randomUpdate(this.simpleCarData.moveParams2, car2);
    }
  }

  public setSimpleCarVisibility(value: number): void {
    const { model } = this.simpleCarData;

    if (!model) return;

    this.simpleCarData.visibility = value;

    model.visible = value >= 0.005;

    const meshData = model?.userData?.meshData as ModelMeshData;

    meshData.materials.m_simpleCar.opacity = value; // Ag
  }

  // 淡出 / 角度（1 → 0）
  public hideModel(
    model: PositionRotationModel | VisibilityMaterialModel | SimpleModel,
    func: (value: number) => void,
    duration: number = 1,
    delay: number = 0
  ) {
    if (!model) {
      console.error('showModel: model is null');
      return;
    }
    gsap.killTweensOf(model, { visibility: true }, false);
    gsap.to(model, {
      duration,
      delay,
      visibility: 0,
      ease: 'power2.inOut',
      onUpdate: () => {
        func(model.visibility);
      },
      onComplete: () => {
        func(0);
      },
    });
  }

  // 淡出 / 角度（0 → 1）
  public showModel(
    model: PositionRotationModel | VisibilityMaterialModel | SimpleModel,
    func: (value: number) => void,
    duration: number = 1,
    delay: number = 0
  ) {
    if (!model) {
      console.error('showModel: model is null');
      return;
    }

    gsap.killTweensOf(model, { visibility: true }, false);
    gsap.to(model, {
      duration: duration,
      delay: delay,
      visibility: 1,
      ease: 'power2.inOut',
      onUpdate: () => {
        func(model.visibility);
      },
      onComplete: () => {
        func(1);
      },
    });
  }
}
