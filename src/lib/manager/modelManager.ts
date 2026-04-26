// app/lib/ModelManager.ts
'use client';

import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { ModelMeshData, ModelGroup } from '@/types/model';
import { CacheKey } from '@/types/index';
import { getFileSize } from '@/utils';
import { Reflector } from 'three/addons/objects/Reflector.js';

// ==================== 类型 ====================
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

/**
 * 模型管理器
 * 加载、销毁、组织模型
 */
export class ModelManager {
  private static instance: ModelManager | null = null;
  public gltfLoader: GLTFLoader | null = null;

  private readonly modelDir = '/model/';
  private readonly maxRetries = 2;
  private readonly fileConfigs: Model[] = [
    { name: CacheKey.sm_car, priority: 1, suffix: '.bin' },
    { name: CacheKey.sm_car_lightbar, priority: 1, suffix: '.bin' },
    { name: CacheKey.sm_carradar, priority: 2, suffix: '.bin' },
    { name: CacheKey.sm_curvature, priority: 2, suffix: '.bin' },
    { name: CacheKey.sm_linecar, priority: 2, suffix: '.bin' },
    { name: CacheKey.sm_simplecar, priority: 2, suffix: '.bin' },
    { name: CacheKey.sm_size, priority: 2, suffix: '.bin' },
    { name: CacheKey.sm_speedup, priority: 2, suffix: '.bin' },
    { name: CacheKey.sm_startroomraw, priority: 2, suffix: '.glb' },
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

  private constructor() {
    this.fileList = this.fileConfigs
      .map((c) => ({
        ...c,
        path: this.modelDir + c.name + c.suffix,
        isRawGlb: c.suffix === '.glb',
        isBin: c.suffix === '.bin',
      }))
      .sort((a, b) => a.priority - b.priority);

    this.initLoader();

    // 反射平面
    this.reflectorPlane = new Reflector(new THREE.PlaneGeometry(1000, 1000), {
      color: 0x7f7f7f,
      textureWidth: 1024,
      textureHeight: 1024,
    });
  }

  public static getInstance() {
    if (process.env.NODE_ENV === 'development') {
      ModelManager.instance = null;
    }

    if (!ModelManager.instance) ModelManager.instance = new ModelManager();
    return ModelManager.instance;
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

      console.log(this.modelCache);
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

    this.modelCache.set(f.name, modelRoot);
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
    // 1. JSON 字符串转 UTF-8 字节数组
    const encoder = new TextEncoder();
    const jsonData = encoder.encode(content);
    // GLB 要求 JSON chunk 数据长度必须是 4 字节对齐
    const jsonChunkLength = (jsonData.length + 3) & ~3; // 向上取整到 4 的倍数
    const jsonPadding = jsonChunkLength - jsonData.length;

    // 2. BIN chunk 长度（body 已经是 ArrayBuffer）
    const binChunkLength = body.byteLength;
    // BIN chunk 数据也需要 4 字节对齐（通常已经是，但保险处理）
    const binPaddedLength = (binChunkLength + 3) & ~3;
    const binPadding = binPaddedLength - binChunkLength;

    // 3. 总文件长度 = 12 + (8 + jsonChunkLength) + (8 + binPaddedLength)
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
      }
    });

    // 返回整理完成的数据
    return result;
  }

  public static getInstanceVersion(): number {
    return (ModelManager as any)._version || 0;
  }
}
