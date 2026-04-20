import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import * as THREE from 'three';

import { getFileSize } from '@/utils';
/**
 * 材质管理器
 * 材质、Shader、换肤
 */
export interface TextureBaseConfig {
  wrapS?: THREE.Wrapping;
  wrapT?: THREE.Wrapping;
  repeatX?: number;
  repeatY?: number;
  offsetX?: number;
  offsetY?: number;
  flipY?: boolean;
  anisotropy?: number;
  colorSpace?: THREE.ColorSpace;
  minFilter?: THREE.MinificationTextureFilter;
  magFilter?: THREE.MagnificationTextureFilter;
}

export interface MaterialOptions {
  color?: string | number;
  map?: THREE.Texture | null;
  transparent?: boolean;
  opacity?: number;
  wireframe?: boolean;
  side?: THREE.Side;
  depthWrite?: boolean;
  metalness?: number;
  roughness?: number;
  emissive?: string | number;
  emissiveIntensity?: number;
}

export interface TextureConfigItem {
  name: string;
  type: TextureType;
  priority: number;
  config?: TextureBaseConfig;
}

enum TextureType {
  png = 'png',
  jpg = 'jpg',
  webp = 'webp',
  hdr = 'hdr',
  jpeg = 'jpeg',
}

export class MaterialManager {
  private static instance: MaterialManager;
  private materials: Map<string, THREE.Material> = new Map();
  private readonly textureCache = new Map<string, THREE.Texture>();
  private readonly loader = new THREE.TextureLoader();
  private readonly hdrLoader = new HDRLoader();

  private readonly materialDir = '/texture/';
  private readonly textureConfig: TextureConfigItem[] = [
    {
      name: 't_saLine',
      priority: 1,
      type: TextureType.png,
      config: {
        flipY: false,
        colorSpace: THREE.SRGBColorSpace,
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        anisotropy: 4,
      },
    },
    {
      name: 't_car_body_AO.raw',
      priority: 1,
      type: TextureType.jpg,
      config: {
        flipY: false,
        colorSpace: THREE.SRGBColorSpace,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
      },
    },
    {
      name: 't_startroom_ao.raw',
      priority: 1,
      type: TextureType.jpg,
      config: { flipY: false, colorSpace: THREE.SRGBColorSpace },
    },
    {
      name: 't_startroom_light.raw',
      priority: 1,
      type: TextureType.jpg,
      config: { flipY: false, colorSpace: THREE.SRGBColorSpace },
    },
    {
      name: 't_floor_normal',
      priority: 1,
      type: TextureType.webp,
      config: {
        flipY: false,
        colorSpace: THREE.SRGBColorSpace,
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
      },
    },
    {
      name: 't_floor_roughness',
      priority: 1,
      type: TextureType.jpg,
      config: {
        flipY: false,
        colorSpace: THREE.SRGBColorSpace,
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
      },
    },
    {
      name: 't_street',
      priority: 1,
      type: TextureType.png,
      config: { flipY: false, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping },
    },
    { name: 't_scar_matcap', priority: 1, type: 'png', config: { flipY: false } },
    { name: 't_gm_car_body_bc', priority: 1, type: 'png', config: { flipY: false } },
    {
      name: 't_gm02_car_body_bc',
      priority: 1,
      type: TextureType.jpg,
      config: { flipY: false, anisotropy: 4 },
    },
    { name: 't_gm02_car_window_bc', priority: 1, type: 'png', config: { flipY: false } },
    {
      name: 't_gm02_car_window_roughness',
      priority: 1,
      type: TextureType.jpg,
      config: { flipY: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter },
    },
    { name: 't_gm02_floor_bc', priority: 1, type: 'png', config: { flipY: false, anisotropy: 4 } },
    {
      name: 't_police_Car_body_BC',
      priority: 1,
      type: TextureType.png,
      config: { flipY: false, anisotropy: 4 },
    },
    {
      name: 't_police_floor_bc',
      priority: 1,
      type: TextureType.jpg,
      config: { flipY: false, anisotropy: 4 },
    },
    { name: 't_env_night', priority: 1, type: TextureType.hdr, config: {} },
    { name: 't_env_light', priority: 1, type: TextureType.hdr, config: {} },
  ];
  private loadedBytes: number = 0;

  private constructor() {
    this.textureConfig.sort((a, b) => a.priority - b.priority);
    this.computeFileSize();
  }
  public static getInstance(): MaterialManager {
    if (!MaterialManager.instance) {
      MaterialManager.instance = new MaterialManager();
    }
    return MaterialManager.instance;
  }

  public async computeFileSize() {
    let totalBytes = 0;

    for (const f of this.textureConfig) {
      const size = await getFileSize(this.materialDir + f.name + '.' + f.type);
      (f as any).size = size;
      totalBytes += size;
    }

    return totalBytes;
  }

  public async loadAllMaterial(onProgress?: ProgressCallback) {
    const results: { success: boolean }[] = [];
    try {
      for (const item of this.textureConfig) {
        const res = await this.loadtexture(
          this.materialDir + item.name + '.' + item.type,
          item.name,
          item.config,
          item.type,
          () => {
            const size = (item as any).size || 0;
            this.loadedBytes += size;
            onProgress?.({
              loadedBytes: this.loadedBytes,
              currentFile: item.name,
            });
          }
        );
        results.push(res);
      }
      return results.every((r) => r.success);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // 加载纹理
  public loadtexture(
    url: string,
    name: string,
    config: TextureBaseConfig = {},
    type: TextureType,
    onStep?: () => void
  ): Promise<{ success: boolean }> {
    return new Promise((resolve, reject) => {
      try {
        if (this.textureCache.has(name)) {
          resolve({ success: true });
          return;
        }

        if (type === TextureType.hdr) {
          this.hdrLoader.load(
            url,
            (texture) => {
              // 加载完成才会执行这里！
              //   texture.flipY = config.flipY ?? true;
              //   texture.colorSpace = config.colorSpace ?? THREE.SRGBColorSpace;
              //   texture.wrapS = config.wrapS ?? THREE.ClampToEdgeWrapping;
              //   texture.wrapT = config.wrapT ?? THREE.ClampToEdgeWrapping;
              //   texture.anisotropy = config.anisotropy ?? 1;
              //   texture.minFilter = config.minFilter ?? THREE.LinearMipmapLinearFilter;
              //   texture.magFilter = config.magFilter ?? THREE.LinearFilter;
              //   texture.needsUpdate = true;

              this.textureCache.set(name, texture);
              onStep?.(); // ✅ 真正加载完才累加
              resolve({ success: true });
            },
            () => {},
            (err) => {
              console.error('纹理加载失败:', url, err);
              resolve({ success: false });
            }
          );
        } else {
          this.loader.load(
            url,
            (texture) => {
              // 加载完成才会执行这里！
              texture.flipY = config.flipY ?? true;
              texture.colorSpace = config.colorSpace ?? THREE.SRGBColorSpace;
              texture.wrapS = config.wrapS ?? THREE.ClampToEdgeWrapping;
              texture.wrapT = config.wrapT ?? THREE.ClampToEdgeWrapping;
              texture.anisotropy = config.anisotropy ?? 1;
              texture.minFilter = config.minFilter ?? THREE.LinearMipmapLinearFilter;
              texture.magFilter = config.magFilter ?? THREE.LinearFilter;
              texture.needsUpdate = true;

              this.textureCache.set(name, texture);
              onStep?.();
              resolve({ success: true });
            },
            () => {},
            (err) => {
              console.error('纹理加载失败:', url, err);
              resolve({ success: false });
            }
          );
        }
      } catch (error) {
        console.error('Error:', error);
        reject({ success: false });
      }
    });
  }

  public getTexture(name: string): THREE.Texture | undefined {
    return this.textureCache.get(name);
  }

  public disposeAllTexures() {
    this.textureCache.forEach((tex) => tex.dispose());
    this.textureCache.clear();
  }

  // ==============================================
  // 创建基础 MeshLambert 材质（非反光）
  // ==============================================
  public createLambert(key: string, options: MaterialOptions = {}): THREE.MeshLambertMaterial {
    if (this.materials.has(key)) {
      return this.materials.get(key) as THREE.MeshLambertMaterial;
    }

    const mat = new THREE.MeshLambertMaterial({
      color: options.color ?? 0xffffff,
      map: options.map ?? null,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      wireframe: options.wireframe ?? false,
      side: options.side ?? THREE.FrontSide,
    });

    this.materials.set(key, mat);
    return mat;
  }

  // ==============================================
  // 创建 PBR 标准材质（MeshStandardMaterial）
  // ==============================================
  public createStandard(key: string, options: MaterialOptions = {}): THREE.MeshStandardMaterial {
    if (this.materials.has(key)) {
      return this.materials.get(key) as THREE.MeshStandardMaterial;
    }

    const mat = new THREE.MeshStandardMaterial({
      color: options.color ?? 0xffffff,
      map: options.map ?? null,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      side: options.side ?? THREE.FrontSide,
      metalness: options.metalness ?? 0,
      roughness: options.roughness ?? 1,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0,
      depthWrite: options.depthWrite ?? true,
    });

    this.materials.set(key, mat);
    return mat;
  }

  // ==============================================
  // 创建 PBR 物理材质（MeshPhysicalMaterial）
  // ==============================================
  public createPhysical(
    key: string,
    options: MaterialOptions & { ior?: number; transmission?: number } = {}
  ): THREE.MeshPhysicalMaterial {
    if (this.materials.has(key)) {
      return this.materials.get(key) as THREE.MeshPhysicalMaterial;
    }

    const mat = new THREE.MeshPhysicalMaterial({
      color: options.color ?? 0xffffff,
      map: options.map ?? null,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      metalness: options.metalness ?? 0,
      roughness: options.roughness ?? 1,
      transmission: options.transmission ?? 0,
      ior: options.ior ?? 1.5,
      side: THREE.DoubleSide,
      depthWrite: options.depthWrite ?? false,
    });

    this.materials.set(key, mat);
    return mat;
  }

  // ==============================================
  // 获取已存在的材质
  // ==============================================
  public get<T extends THREE.Material>(key: string): T | undefined {
    return this.materials.get(key) as T;
  }

  // ==============================================
  // 判断材质是否存在
  // ==============================================
  public has(key: string): boolean {
    return this.materials.has(key);
  }

  // ==============================================
  // 删除材质（并销毁）
  // ==============================================
  public remove(key: string): void {
    const mat = this.materials.get(key);
    if (mat) {
      mat.dispose();
      this.materials.delete(key);
    }
  }

  // ==============================================
  // 清空所有材质（页面卸载时调用）
  // ==============================================
  public disposeAll(): void {
    this.materials.forEach((mat) => mat.dispose());
    this.materials.clear();
  }

  // ==============================================
  // 更新材质颜色
  // ==============================================
  public updateColor(key: string, color: string | number): void {
    const mat = this.materials.get(key) as any;
    if (mat && mat.color) {
      mat.color.set(color);
    }
  }

  // ==============================================
  // 更新纹理
  // ==============================================
  public updateMap(key: string, map: THREE.Texture | null): void {
    const mat = this.materials.get(key) as any;
    if (mat) {
      mat.map = map;
      mat.needsUpdate = true;
    }
  }

  // ==============================================
  // UV 滚动动画（流动效果）
  // ==============================================
  public animateUV(key: string, speedX = 0.01, speedY = 0.01): void {
    const mat = this.materials.get(key) as any;
    if (mat && mat.map) {
      mat.map.offset.x += speedX;
      mat.map.offset.y += speedY;
      mat.map.needsUpdate = true;
    }
  }
}
