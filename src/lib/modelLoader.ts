// app/lib/ModelLoader.ts
'use client';

import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// ==================== 类型 ====================
export interface ModelFileInfo {
  name: string;
  path: string;
  priority: number;
  isRawGlb: boolean;
  isBin: boolean;
}

export interface ModelLoadResult {
  fileInfo: ModelFileInfo;
  success: boolean;
  data?: GLTF;
  error?: string;
  retryCount: number;
}

type ProgressCallback = (p: {
  current: number;
  total: number;
  percent: number;
  currentFile: string;
}) => void;

type LoadCallback = (results: ModelLoadResult[], allSuccess: boolean) => void;

type Model = { name: string; priority: number };

type BinHeader = {
  magic: string;
  version: number;
  length: number;
};

interface WorkerRequest {
  id: string;
  buffer: ArrayBuffer;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  gltf?: GLTF;
  error?: string;
}

export class ModelLoader {
  private static instance: ModelLoader;
  private gltfLoader: GLTFLoader | null = null;

  private readonly modelDir = '/model/';
  private readonly maxRetries = 2;
  private readonly fileConfigs: Model[] = [
    { name: 'sm_car.bin', priority: 1 },
    { name: 'sm_car_lightbar.bin', priority: 1 },
    { name: 'sm_carradar.bin', priority: 2 },
    { name: 'sm_curvature.bin', priority: 2 },
    { name: 'sm_linecar.bin', priority: 2 },
    { name: 'sm_simplecar.bin', priority: 2 },
    { name: 'sm_size.bin', priority: 2 },
    { name: 'sm_speedup.bin', priority: 2 },
    { name: 'sm_startroom.raw.glb', priority: 2 },
    { name: 'sm_windspeed.bin', priority: 2 },
  ];

  private readonly binConstants = {
    bin_type: 'gltf',
    pre_glb_header_check_digit: '1031088470',
    cur_glb_header_check_digit: '152147171185',
    fixed_head_length: 12,
    JSON: 1313821514, // 0x4E4F534A "JSON"
    BIN: 5130562, // 0x004E4942 "BIN\0"
  };

  private fileList: ModelFileInfo[] = [];
  private cache = new Map<string, GLTF>();
  private abortController: AbortController | null = null;
  private isLoading = false;
  private taskMap = new Map<string, { resolve: (v: any) => void; reject: (e: Error) => void }>();

  private constructor() {
    this.initFiles();

    this.initLoader();
  }

  static getInstance() {
    if (!ModelLoader.instance) ModelLoader.instance = new ModelLoader();
    return ModelLoader.instance;
  }

  private initFiles() {
    this.fileList = this.fileConfigs.map((c) => ({
      ...c,
      path: this.modelDir + c.name,
      isRawGlb: c.name.endsWith('.raw.glb'),
      isBin: c.name.endsWith('.bin'),
    }));
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

  // ==================== 加载 ====================
  async loadAll(onProgress?: ProgressCallback, onComplete?: LoadCallback) {
    if (this.isLoading) return;
    // 中止使用此管理器的加载器中正在进行的请求
    this.abortController = new AbortController();
    this.isLoading = true;

    const sorted = [...this.fileList].sort((a, b) => a.priority - b.priority);
    const total = sorted.length;
    let done = 0;
    const results: ModelLoadResult[] = [];

    for (const f of sorted) {
      if (this.abortController.signal.aborted) break;

      const res = await this.loadWithRetry(f, () => {
        done++;
        onProgress?.({ current: done, total, percent: (done / total) * 100, currentFile: f.name });
      });

      results.push(res);
    }

    this.isLoading = false;
    onComplete?.(
      results,
      results.every((r) => r.success)
    );
    return results;
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

  // 真正加载
  private async loadSingle(f: ModelFileInfo): Promise<GLTF> {
    // 检查缓存
    if (this.cache.has(f.path)) return this.cache.get(f.path)!;

    if (!this.gltfLoader) {
      this.initLoader();
      if (!this.gltfLoader) throw new Error('GLTFLoader');
    }

    const signal = this.abortController!.signal;
    const res = await fetch(f.path, { signal });

    if (!res.ok) throw new Error(`${f.path}: ${res}`);

    const arrayBuffer = await res.arrayBuffer();

    console.log('load', f);
    console.log('load', arrayBuffer);

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
        throw new Error(`Invalid header for .bin file: ${f.name}`);
      }

      try {
        const headerView = new DataView(arrayBuffer, 0, this.binConstants.fixed_head_length); // 读取 GLB 头部（固定 12 字节）

        const header: BinHeader = {
          magic: new TextDecoder().decode(new Uint8Array(arrayBuffer, 0, 4)), // 二进制转字符串 "glTF"
          version: headerView.getUint32(4, true), // glTF 版本号   2
          length: headerView.getUint32(8, true), // 整个文件总长度
        };

        const { content, body } = this.parseToContentAndBody(header, arrayBuffer);

        glbBuffer = this.buildGLBFromParts(header, content, body);
      } catch (e) {
        throw new Error(`解析 .bin ${f.name} 失败`);
      }
    } else {
      throw new Error(`解析 ${f.name} 失败`);
    }

    const gltf = await this.parseGLBBuffer(glbBuffer);

    this.cache.set(f.path, gltf);
    return gltf;
  }

  cancel() {
    this.abortController?.abort();
    this.isLoading = false;
  }
  clearCache() {
    this.cache.clear();
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
  ): { content: string; body: ArrayBuffer } {
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
      return { content: null, body: null };
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
}
