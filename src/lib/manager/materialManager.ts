import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import * as THREE from 'three';
import { Vector2, Vector3 } from 'three';
import { getFileSize } from '@/utils';
import { SceneManager } from './sceneManager';
import {
  SMAAEffect,
  SMAAPreset,
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  KawaseBlurPass,
} from 'postprocessing';

/**
 * 材质管理器
 * 材质、Shader、换肤
 */
export interface TextureBaseConfig {
  wrapS?: THREE.Wrapping;
  wrapT?: THREE.Wrapping;
  repeatX?: number;
  repeatY?: number;
  //   repeat?: Vector2;
  //   offset?: Vector2;
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
    { name: 't_scar_matcap', priority: 1, type: TextureType.png, config: { flipY: false } },
    { name: 't_gm_car_body_bc', priority: 1, type: TextureType.png, config: { flipY: false } },
    {
      name: 't_gm02_car_body_bc',
      priority: 1,
      type: TextureType.jpg,
      config: { flipY: false, anisotropy: 4 },
    },
    { name: 't_gm02_car_window_bc', priority: 1, type: TextureType.png, config: { flipY: false } },
    {
      name: 't_gm02_car_window_roughness',
      priority: 1,
      type: TextureType.jpg,
      config: { flipY: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter },
    },
    {
      name: 't_gm02_floor_bc',
      priority: 1,
      type: TextureType.png,
      config: { flipY: false, anisotropy: 4 },
    },
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

  // 环境贴图相关
  private sceneManager: SceneManager | null = null;
  private pmremRenderTarget: THREE.WebGLRenderTarget | null = null;
  // cubeTexture / blurTexture
  private _scene: THREE.Scene | null = null;
  private _renderer: THREE.WebGLRenderer | null = null;
  private pmremGenerator: THREE.PMREMGenerator | null = null;
  private _cubeRenderTarget: THREE.WebGLCubeRenderTarget | null = null;
  private _cubeCamera: THREE.CubeCamera | null = null;
  public cubeTexture: { value: THREE.CubeTexture | null } = { value: null };
  public blurTexture: { value: THREE.CubeTexture | null } = { value: null };
  private blurIntensity: number = 4.5;
  private exposure: number = 1.0;

  // 纯白
  public ut_white: THREE.Texture = new THREE.DataTexture(new Uint8Array([255, 255, 255]), 1, 1);
  // 纯黑
  public ut_dark: THREE.Texture = new THREE.DataTexture(new Uint8Array([0, 0, 0]), 1, 1);
  // 地板贴图
  public ut_floorMap: THREE.Texture = this.ut_white;

  // 模糊管线（每个面独立）
  private blurComposer: EffectComposer | null = null;
  private blurRenderTarget: THREE.WebGLCubeRenderTarget | null = null;
  private constructor() {
    this.textureConfig.sort((a, b) => a.priority - b.priority);

    this.ut_white.needsUpdate = true;
    this.ut_dark.needsUpdate = true;
  }

  public static getInstance(): MaterialManager {
    if (!MaterialManager.instance) {
      MaterialManager.instance = new MaterialManager();
    }
    return MaterialManager.instance;
  }

  public initCubeRenderTarget(): void {
    this.ensureSceneManager();
  }

  private ensureSceneManager(): boolean {
    if (!this.sceneManager) {
      try {
        this.sceneManager = SceneManager.getInstance();
        this._scene = this.sceneManager.scene;
        this._renderer = this.sceneManager.renderer;
        this._cubeCamera = this.sceneManager.cubeCamera;
        this._cubeRenderTarget = this.sceneManager.cubeRenderTarget;

        return true;
      } catch (e) {
        console.error('MaterialManager: 无法获取 SceneManager，请确保 SceneManager 已先初始化', e);
        return false;
      }
    }
    return true;
  }

  public getSceneManager(): SceneManager {
    if (!this.sceneManager) {
      this.sceneManager = SceneManager.getInstance();
    }
    return this.sceneManager;
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
              //   texture.flipY = config.flipY ?? true;
              //   texture.colorSpace = config.colorSpace ?? THREE.SRGBColorSpace;
              //   texture.wrapS = config.wrapS ?? THREE.ClampToEdgeWrapping;
              //   texture.wrapT = config.wrapT ?? THREE.ClampToEdgeWrapping;
              //   texture.anisotropy = config.anisotropy ?? 1;
              //   texture.minFilter = config.minFilter ?? THREE.LinearMipmapLinearFilter;
              //   texture.magFilter = config.magFilter ?? THREE.LinearFilter;

              Object.keys(config).forEach((key: string) => {
                const k = key as keyof TextureBaseConfig;

                switch (k) {
                  case 'repeatX':
                    texture.repeat.x = config[k]!;
                    break;
                  case 'repeatY':
                    texture.repeat.y = config[k]!;
                    break;
                  case 'offsetX':
                    texture.offset.x = config[k]!;
                    break;
                  case 'offsetY':
                    texture.offset.y = config[k]!;
                    break;
                  default:
                    if (config[k] !== undefined) {
                      (texture as any)[k] = config[k]!;
                    }
                }
              });

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

  public getCache(name: string): THREE.Texture | undefined {
    return this.textureCache.get(name);
  }

  public disposeAllTexures() {
    this.textureCache.forEach((tex) => tex.dispose());
    this.textureCache.clear();
  }

  // 实时环境捕获器 生成 cubeTexture（清晰反射）、blurTexture （模糊环境贴图）
  public async initEnvironment(hdrName: string = 't_env_night'): Promise<void> {
    if (!this.ensureSceneManager() || !this._renderer || !this._scene) return;

    let hdrTexture = this.textureCache.get(hdrName) as THREE.Texture | undefined;

    console.log(hdrTexture);

    if (!hdrTexture) {
      console.warn(`MaterialManager: HDR 纹理 ${hdrName} 未在缓存中，尝试直接加载`);
      const config = this.textureConfig.find((t) => t.name === hdrName);
      if (!config) {
        console.error(`MaterialManager: 未找到 HDR 配置 ${hdrName}`);
        return;
      }
      const result = await this.loadtexture(
        `${this.materialDir}${hdrName}.${config.type}`,
        hdrName,
        config.config,
        config.type
      );
      if (!result.success) return;
      hdrTexture = this.textureCache.get(hdrName);
    }

    if (!hdrTexture) {
      console.error('MaterialManager: 无法获取 HDR 纹理');
      return;
    }

    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;

    if (!this.pmremGenerator) {
      this.pmremGenerator = new THREE.PMREMGenerator(this._renderer);
      this.pmremGenerator.compileEquirectangularShader();
    }

    if (this.pmremRenderTarget) this.pmremRenderTarget.dispose();

    // 生成 PMREM 模糊纹理（用于场景环境和 blurTexture）
    this.pmremRenderTarget = this.pmremGenerator.fromEquirectangular(hdrTexture);
    const pmremTexture = this.pmremRenderTarget.texture as THREE.CubeTexture;

    // 初始化场景和纹理变量
    this.cubeTexture.value = pmremTexture;
    this.blurTexture.value = pmremTexture;
    this._scene.environment = pmremTexture;
    this._scene.background = pmremTexture;

    // 初始化立方相机和渲染目标（用于后续实时捕获清晰反射）
    this._cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });

    this._cubeCamera = new THREE.CubeCamera(0.1, 1000, this._cubeRenderTarget);
    this._cubeCamera.layers.set(0);
  }

  // 动态场景实时更新环境贴图
  public updateEnvMap(position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)): void {
    if (
      !this._cubeCamera ||
      !this.pmremGenerator ||
      !this._scene ||
      !this._renderer ||
      !this._cubeRenderTarget ||
      !this._cubeRenderTarget.texture
    )
      return;

    if (this._cubeRenderTarget.width === 0 || this._cubeRenderTarget.height === 0) {
      return;
    }

    // 设置立方相机位置（关键：让反射点跟随物体移动）
    this._cubeCamera.position.copy(position);

    // 渲染场景到立方体贴图（得到清晰的 cubeTexture）
    this._cubeCamera.update(this._renderer, this._scene);
    this.cubeTexture.value = this._cubeRenderTarget.texture;

    // 释放旧的 PMREM RenderTarget
    if (this.pmremRenderTarget) this.pmremRenderTarget.dispose();

    this.pmremRenderTarget = this.pmremGenerator.fromCubemap(this.cubeTexture.value);
    this.blurTexture.value = this.pmremRenderTarget.texture as THREE.CubeTexture;
  }

  // public setBlurIntensity(value: number) {
  //   this.blurIntensity = THREE.MathUtils.clamp(value, 0, 1);
  // }

  public getCubeTexture(): { readonly value: THREE.Texture | null } {
    return this.cubeTexture;
  }

  /** 模糊后的环境纹理（只读），用于漫反射、光照探针 */
  public getBlurTexture(): { readonly value: THREE.Texture | null } {
    return this.cubeTexture;
  }

  /** 控制环境纹理的曝光度（读写） */
  public getExposure(): number {
    return this.exposure;
  }
  public setExposure(value: number) {
    this.exposure = value;
    if (this._renderer) {
      this._renderer.toneMappingExposure = value;
    }
  }

  private createBlurShader(resolution: number): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        tCube: { value: null },
        blurSize: { value: this.blurIntensity / resolution },
        exposure: { value: this.exposure },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform samplerCube tCube;
        uniform float blurSize;
        uniform float exposure;
        varying vec2 vUv;

        void main() {
          vec3 color = vec3(0.0);
          float total = 0.0;
          int r = 2;
          for(int x = -r; x <= r; x++) {
            for(int y = -r; y <= r; y++) {
              vec2 off = vec2(float(x), float(y)) * blurSize;
              vec3 dir = normalize(vec3((vUv + off) * 2.0 - 1.0, 1.0)); // 简化采样
              float w = 1.0 / 25.0;
              color += texture(tCube, dir).rgb * w;
              total += w;
            }
          }
          gl_FragColor = vec4(color / total * exposure, 1.0);
        }
      `,
    });
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
    if (this.pmremGenerator) this.pmremGenerator.dispose();
    if (this.pmremRenderTarget) this.pmremRenderTarget.dispose();
    if (this._cubeRenderTarget) this._cubeRenderTarget.dispose();
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
