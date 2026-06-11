import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import * as THREE from 'three';
import { getFileSize, isEmptyObject } from '@/utils';
import { SceneManager } from './sceneManager';
import type { ModelMeshData, ModelGroup } from '@/types/model';
import { sceneConfig, textureObj } from './constantsConfig';

// import noise2d from '@/shaders/noise2d.glsl';
import { noise2d } from '@/shaders/noise2d';
import { customVertexShader } from '@/shaders/customVertexShader';
import { randomColorShader } from '@/shaders/randomColorShader';

/**
 * 材质管理器
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
  anisotropy?: number; // 贴图各向异性
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

interface GlobalTimeUniforms {
  u_time: THREE.IUniform<number>;
  u_speedTime: THREE.IUniform<number>;
}

export class MaterialManager {
  private static instance: MaterialManager;
  private materials: Map<string, THREE.MeshStandardMaterial> = new Map();
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
        colorSpace: THREE.LinearSRGBColorSpace,
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
        colorSpace: THREE.NoColorSpace,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      },
    },
    {
      name: 't_startroom_ao.raw',
      priority: 1,
      type: TextureType.jpg,
      config: { flipY: false, colorSpace: THREE.NoColorSpace },
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
        colorSpace: THREE.NoColorSpace,
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
        colorSpace: THREE.NoColorSpace,
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
      },
    },
    {
      name: 't_street',
      priority: 1,
      type: TextureType.png,
      config: {
        flipY: false,
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        colorSpace: THREE.SRGBColorSpace,
      },
    },
    {
      name: 't_scar_matcap',
      priority: 1,
      type: TextureType.png,
      config: { flipY: false, colorSpace: THREE.SRGBColorSpace },
    },
    {
      name: 't_gm_car_body_bc',
      priority: 1,
      type: TextureType.png,
      config: { flipY: false, colorSpace: THREE.SRGBColorSpace },
    },
    {
      name: 't_gm02_car_body_bc',
      priority: 1,
      type: TextureType.jpg,
      config: { flipY: false, anisotropy: 4, colorSpace: THREE.SRGBColorSpace },
    },
    {
      name: 't_gm02_car_window_bc',
      priority: 1,
      type: TextureType.png,
      config: { flipY: false, colorSpace: THREE.SRGBColorSpace },
    },
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
      config: { flipY: false, anisotropy: 4, colorSpace: THREE.SRGBColorSpace },
    },
    {
      name: 't_police_Car_body_BC',
      priority: 1,
      type: TextureType.png,
      config: { flipY: false, anisotropy: 4, colorSpace: THREE.SRGBColorSpace },
    },
    {
      name: 't_police_floor_bc',
      priority: 1,
      type: TextureType.jpg,
      config: { flipY: false, anisotropy: 4, colorSpace: THREE.SRGBColorSpace },
    },
    {
      name: 't_env_night',
      priority: 1,
      type: TextureType.hdr,
      config: { colorSpace: THREE.SRGBColorSpace },
    },
    {
      name: 't_env_light',
      priority: 1,
      type: TextureType.hdr,
      config: { colorSpace: THREE.SRGBColorSpace },
    },
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
  public ut_white: THREE.Texture = new THREE.DataTexture(
    new Float32Array([1, 1, 1, 1]),
    1,
    1,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  // 纯黑
  public ut_dark: THREE.Texture = new THREE.DataTexture(
    new Float32Array([0, 0, 0, 1]),
    1,
    1,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  // 车窗原始数据
  public u_m_car_window_orignData: { opacity: number; roughness: number; color: THREE.Color } = {
    opacity: 0,
    roughness: 0,
    color: new THREE.Color(),
  };

  // 发光材质
  public startroomLightMaterial: THREE.MeshStandardMaterial | null = null;

  private static readonly LIGHT_OFF_COLOR = new THREE.Color('#000000');
  private static readonly LIGHT_ON_COLOR = new THREE.Color('#ffffff');

  // 汽车车灯材质
  public carlight: {
    carlightMaterial: THREE.MeshStandardMaterial | null;
    carlightValue: number;
    carlightColor: THREE.Color;
  } = {
    carlightMaterial: null,
    carlightValue: 0,
    carlightColor: MaterialManager.LIGHT_OFF_COLOR,
  };

  public smcar_carbody: THREE.MeshStandardMaterial | null = null;

  public global_time_uniforms: GlobalTimeUniforms = {
    u_time: { value: 0 },
    u_speedTime: { value: 0 },
  };
  // speed_up
  private u_speedUpBackgroundValue: { value: number } = { value: 0 };

  private constructor() {
    this.textureConfig.sort((a, b) => a.priority - b.priority);

    this.ut_white.needsUpdate = true;
    this.ut_dark.needsUpdate = true;

    sceneConfig.ut_white.value = this.ut_white;
    sceneConfig.ut_floorMap = { value: this.ut_white };

    sceneConfig.ut_dark.value = this.ut_dark;

    this.textureCache.set('ut_white', this.ut_white);
    this.textureCache.set('ut_dark', this.ut_dark);
    this.textureCache.set('ut_floorMap', this.ut_white);
  }

  public static getInstance(): MaterialManager {
    if (!MaterialManager.instance) {
      MaterialManager.instance = new MaterialManager();
    }
    return MaterialManager.instance;
  }

  public ensureSceneManager(): boolean {
    if (!this.sceneManager) {
      try {
        this.sceneManager = SceneManager.getInstance();
        this._scene = this.sceneManager.scene;
        this._renderer = this.sceneManager.renderer;
        this._cubeCamera = this.sceneManager.cubeCamera;
        this._cubeRenderTarget = this.sceneManager.cubeRenderTarget;

        this.pmremGenerator = new THREE.PMREMGenerator(this._renderer);
        this.pmremGenerator.compileEquirectangularShader();
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
      console.log('All textures loaded.', this.textureCache);
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
              // texture.flipY = false;
              texture.colorSpace = THREE.LinearSRGBColorSpace;
              // texture.mapping = THREE.EquirectangularReflectionMapping;
              texture.type = THREE.HalfFloatType;

              texture.needsUpdate = true;

              // 载入原样 hdr
              if (textureObj[name]) {
                sceneConfig[textureObj[name]].value = texture;
                this.textureCache.set(name, texture);
                // texture.dispose();
              }

              onStep?.();
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
              if (config.flipY !== undefined) texture.flipY = config.flipY;
              if (config.colorSpace !== undefined) texture.colorSpace = config.colorSpace;
              if (config.wrapS !== undefined) texture.wrapS = config.wrapS;
              if (config.wrapT !== undefined) texture.wrapT = config.wrapT;
              if (config.anisotropy !== undefined) texture.anisotropy = config.anisotropy;
              if (config.minFilter !== undefined) texture.minFilter = config.minFilter;
              if (config.magFilter !== undefined) texture.magFilter = config.magFilter;
              texture.needsUpdate = true;

              if (textureObj[name]) {
                sceneConfig[textureObj[name]].value = texture;
              }
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

  public async initEnvironment(hdrName: string = 't_env_night'): Promise<void> {
    if (!this.ensureSceneManager() || !this._renderer || !this._scene) return;

    let hdrTexture = this.textureCache.get(hdrName) as THREE.Texture | undefined;

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
      hdrTexture = this.textureCache.get(hdrName) as THREE.Texture | undefined;
    }

    if (!hdrTexture) {
      console.error('MaterialManager: 无法获取 HDR 纹理');
      return;
    }

    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
    // hdrTexture.colorSpace = THREE.SRGBColorSpace;

    if (!this.pmremGenerator) {
      this.pmremGenerator = new THREE.PMREMGenerator(this._renderer);
      this.pmremGenerator.compileEquirectangularShader();
    }

    if (this.pmremRenderTarget) this.pmremRenderTarget.dispose();

    // PMREM 模糊纹理
    this.pmremRenderTarget = this.pmremGenerator.fromEquirectangular(hdrTexture);
    const pmremTexture = this.pmremRenderTarget.texture as THREE.CubeTexture;

    // 初始化场景和纹理变量
    this.cubeTexture.value = pmremTexture;
    this.blurTexture.value = pmremTexture;
    this._scene.environment = pmremTexture;
    this._scene.background = pmremTexture;

    // hdrTexture.dispose();

    if (!this._cubeCamera) return;
    this._cubeCamera.layers.set(sceneConfig.LAYER_CAPTURE);
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

  // 初始化car材质
  public initCarMaterial(meshData: ModelMeshData): void {
    if (!meshData?.meshes) return;

    Object.values(meshData.meshes).forEach((item: THREE.Mesh) => {
      item.layers.enable(sceneConfig.LAYER_PLANE_REFLECT);
    });

    const aoTexture = sceneConfig.ut_car_body_ao.value;
    aoTexture!.channel = 1;

    Object.values(meshData.materials).forEach((item: THREE.MeshStandardMaterial) => {
      item.aoMap = aoTexture;

      if (item instanceof THREE.MeshStandardMaterial) {
        item.onBeforeCompile = (shader) => {
          this.changeCarMaterialShader(shader);
        };
      }

      item.needsUpdate = true;
    });

    // 汽车车身材质：主贴图为白色纹理
    meshData.materials.Car_body.map = this.ut_white;
    meshData.materials.Car_body.needsUpdate = true;

    this.smcar_carbody = meshData.materials.Car_body;

    meshData.materials.M_logo.map!.anisotropy = 8;

    const car_window_material = meshData.materials.Car_window;
    // 车窗主贴图=白色
    car_window_material.map = this.ut_white;
    // 车窗粗糙度贴图=黑色（粗糙度0，表面光滑）
    car_window_material.roughnessMap = this.ut_dark;
    // 车窗金属度贴图=白色（金属度1，高反射）
    car_window_material.metalnessMap = this.ut_white;
    car_window_material.needsUpdate = true;

    // 车窗原始数据
    this.u_m_car_window_orignData.color.copy(car_window_material.color);
    this.u_m_car_window_orignData.opacity = car_window_material.opacity;
    this.u_m_car_window_orignData.roughness = car_window_material.roughness;
    car_window_material.needsUpdate = true;

    sceneConfig.u_m_car_window_orignData = this.u_m_car_window_orignData;
  }

  //  onBeforeCompile 设置 Car 材质  实现：盒子投影 + 双层反射 + 混合高光
  public changeCarMaterialShader(t: THREE.WebGLProgramParametersWithUniforms) {
    let n = t.fragmentShader;
    let r = t.vertexShader;

    r = r.replace(
      '#include <common>',
      `
      #include <common>
      
      varying vec3 reflectVec;
      varying vec3 vPosW;
      
      #if (!defined(USE_UV))
        #define USE_UV
      #endif
      `
    );

    r = r.replace(
      '#include <fog_vertex>',
      `
      #include <fog_vertex>
      
      vec3 worldNormal = normalize(vec3(vec4(normal, 0.0) * modelMatrix));
      vec3 cameraToVertex = normalize(worldPosition.xyz - cameraPosition);
      reflectVec = reflect(cameraToVertex, worldNormal);
      vPosW = worldPosition.xyz;
      `
    );

    n = n.replace(
      '#include <common>',
      `#include <common>
      varying vec3 reflectVec;
      varying vec3 vPosW;
      
      uniform samplerCube cubeCaptureReflectMap;  // 反射 Cubemap
      uniform samplerCube blurCaptureReflectMap;  // 模糊反射 Cubemap
      uniform float vEnvMapIntensity;             // 环境光强度
      uniform float vDiscardOpacity;              //  discard 裁切透明度
      
      ${noise2d}
      
      // 强制开启 UV
      #if (!defined(USE_UV))
        #define USE_UV
      #endif
      `
    );

    // 重写 Three.js 物理光照环境光（IBL）模块
    n = n.replace(
      '#include <envmap_physical_pars_fragment>',
      `
      #if defined(USE_ENVMAP)

      #if defined(USE_BOX_PROJECTION)
      uniform vec4 probePos;
      uniform vec3 probeBoxMin;
      uniform vec3 probeBoxMax;

      vec3 boxProjection(vec3 nrdir, vec3 worldPos, vec3 probePos, vec3 boxMin, vec3 boxMax) {
        vec3 tbot = boxMin - worldPos;
        vec3 ttop = boxMax - worldPos;
        vec3 tmax = mix(tbot, ttop, step(vec3(0), nrdir));
        tmax /= nrdir;
        float t = min(min(tmax.x, tmax.y), tmax.z);
        return worldPos + nrdir * t - probePos;
      }
      #endif

      // 计算环境光辐照（漫反射）
      vec3 getIBLIrradiance(const in vec3 normal) {
        #if defined(ENVMAP_TYPE_CUBE_UV)
          vec3 worldNormal = inverseTransformDirection(normal, viewMatrix);

          // 盒子投影
          #if defined(USE_BOX_PROJECTION)
            if (probePos.w > 0.001) {
              worldNormal = boxProjection(worldNormal, vWorldPosition, probePos.xyz, probeBoxMin.xyz, probeBoxMax.xyz);
            }
          #endif

          // 采样环境贴图 + 模糊反射贴图混合
          vec4 envMapColor = textureCubeUV(envMap, worldNormal, 1.0);
          vec4 reflectColor = textureLod(blurCaptureReflectMap, worldNormal, 0.0);
              
          // 混合输出
          return PI * mix(reflectColor.rgb, envMapColor.rgb, vEnvMapIntensity);
        #else
          return vec3(0.0);
        #endif
      }

      // 计算环境光反射
      vec3 getIBLRadiance(const in vec3 viewDir, const in vec3 normal, const in float roughness) {
        #if defined(ENVMAP_TYPE_CUBE_UV)
          vec3 reflectVec = reflect(-viewDir, normal);
          reflectVec = normalize(mix(reflectVec, normal, roughness * roughness));
          reflectVec = inverseTransformDirection(reflectVec, viewMatrix);

          // 盒子投影
          #if defined(USE_BOX_PROJECTION)
            if (probePos.w > 0.001) {
              reflectVec = boxProjection(reflectVec, vWorldPosition, probePos.xyz, probeBoxMin.xyz, probeBoxMax.xyz);
            }
          #endif

          // 基础反射
          vec4 envMapColor = textureCubeUV(envMap, reflectVec, roughness);
          envMapColor.rgb *= vEnvMapIntensity;

          // 动态 LOD + 加强高清反射
          float lod = roughness * (1.7 - 0.7 * roughness);
          envMapColor.rgb += textureLod(cubeCaptureReflectMap, reflectVec, lod * 6.0).rgb * (3.0 + roughness);

          return envMapColor.rgb;
        #else
          return vec3(0.0);
        #endif
      }

      #endif
      `
    );

    // 根据 X 轴位置裁剪汽车
    n = n.replace(
      '#include <clipping_planes_fragment>',
      `
      // 边缘柔和效果
      float discardMask = (noise2d(vUv * 15.0) + 1.0) / 2.0;
      
      // 根据 X 轴坐标计算遮罩：控制汽车从左到右渐显
      float mm = 1.0 - (vPosW.x + 2.7) / 5.4;
      
      // 透明度控制
      if (mm < (1.0 - vDiscardOpacity)) discard;
      
      #include <clipping_planes_fragment>
      `
    );

    n = n.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>
      
      // 只在裁切边界发光
      float discardLightMask = (1.0 - step(mm, (1.0 - vDiscardOpacity))) * step(mm, (1.0 - vDiscardOpacity) + 0.002);
      
      gl_FragColor = vec4(
        mix(gl_FragColor.rgb, vec3(0.5, 0.9, 1.0), vec3(discardLightMask)),
        gl_FragColor.a
      );
      `
    );

    t.uniforms.cubeCaptureReflectMap = sceneConfig.ut_cubeCapture; // 高清反射贴图
    t.uniforms.blurCaptureReflectMap = sceneConfig.ut_blurCapture; // 模糊反射贴图
    t.uniforms.vEnvMapIntensity = sceneConfig.u_car_envMapIntensity; // 环境光强度
    t.uniforms.vDiscardOpacity = sceneConfig.u_car_discard; // 裁切透明度

    t.vertexShader = r;
    t.fragmentShader = n;
  }

  public updateSmCarCarBody() {
    if (!this.smcar_carbody) return;
    this.smcar_carbody.metalness = sceneConfig.u_carMetalness.value;
    this.smcar_carbody.roughness = sceneConfig.u_carRoughness.value;
    this.smcar_carbody.color.copy(sceneConfig.u_carColor.value);
  }

  // 初始化lightbar材质
  public initLightbarMaterial(meshData: ModelMeshData): void {
    // 灯条网格设置反射层级
    Object.values(meshData.meshes).forEach((item: THREE.Mesh) => {
      item.layers.enable(sceneConfig.LAYER_PLANE_REFLECT);
    });

    // 灯条配置材质
    Object.values(meshData.materials).forEach((item: THREE.MeshStandardMaterial) => {
      // 关闭色调映射
      item.toneMapped = false;

      if (item instanceof THREE.MeshStandardMaterial) {
        item.onBeforeCompile = (shader) => {
          this.changeCarMaterialShader(shader);
          item.name == 'lightbar_Baked' && this.changeLightBarShader(shader);
        };
      }
    });
  }

  // lightbar 自发光 横向流动扫描光效
  public changeLightBarShader(t: THREE.WebGLProgramParametersWithUniforms) {
    let fragmentShader = t.fragmentShader;
    let vertexShader = t.vertexShader;

    vertexShader = vertexShader.replace(
      '#include <common>',
      `
        #include <common>
        attribute vec2 uv2;
        varying vec2 vUv2;
      `
    );

    vertexShader = vertexShader.replace(
      '#include <fog_vertex>',
      `
        #include <fog_vertex>
        vUv2 = uv2;
      `
    );

    // 注入时间变量 + 接收第二套UV
    fragmentShader = fragmentShader.replace(
      '#include <common>',
      `
        #include <common>
        
        uniform float timer;
        varying vec2 vUv2;
      `
    );

    // 流动扫描光效
    fragmentShader = fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `
        #ifdef USE_EMISSIVEMAP
          // 采样自发光贴图颜色
          vec4 emissiveColor = texture(emissiveMap, vUv);

          // 计算流动扫描动画：
          // cos(uv2.x * 密度 + 时间 * 速度)   生成横向波浪
          // +1   把值域 [-1,1] 变成 [0,2]
          // step(值, 0.5)   硬切出亮线（0或1）
          float scanLine = step((cos(vUv2.x * 10.0 + timer * 20.0) + 1.0), 0.5);

          // 最终自发光 = 超强基础发光 + 扫描线遮罩发光
          // emissiveColor.rgb * 50.0   亮度放大50倍
          // scanLine   控制哪里亮、哪里不亮
          totalEmissiveRadiance =  emissiveColor.rgb*50.+totalEmissiveRadiance*emissiveColor.rgb * (step((cos(vUv2.x*10.+timer*20.)+1.),0.5)+0.);
        #endif
      `
    );
    t.uniforms.timer = this.global_time_uniforms.u_time;
    t.vertexShader = vertexShader;
    t.fragmentShader = fragmentShader;
  }

  public initStartroomMaterial(meshData: ModelMeshData): void {
    Object.values(meshData.materials).forEach((item: THREE.MeshStandardMaterial) => {
      item.aoMap = sceneConfig.ut_startroom_ao.value; // AO贴图
      item.lightMap = sceneConfig.ut_startroom_light.value;
      item.normalMap = sceneConfig.ut_floor_normal.value; // 凹凸
      item.roughnessMap = sceneConfig.ut_floor_roughness.value;
      item.envMapIntensity = 0; // 关闭环境反射
    });
  }

  public initSpeedupMaterial(meshData: ModelMeshData): void {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: this.global_time_uniforms.u_speedTime, // 时间
        vSpeed: this.u_speedUpBackgroundValue, // 光效强度
        vPoliceColorChange: sceneConfig.u_policeColorChange,
      },
      vertexShader: customVertexShader,
      fragmentShader: `
          varying vec3 vPosition;    //
          varying vec3 vNormal;      //
          varying vec2 vUv;          //
          varying vec3 vPositionW;   //
          varying vec3 vNormalW;     //

          // 外部传入的控制参数
          uniform float vPoliceColorChange;  // 警灯开关 0~1
          uniform float vSpeed;
          uniform float time;

          // 生成条纹/流动纹理
          ${noise2d}
          // 生成彩色光效
          ${randomColorShader}

          void main() {
            // UV 动画：向左流动
            // UV 随时间向左移动
            vec2 uv_0 = vUv + vec2(-time * 0.5, 0.0);

            // 生成横向噪声：X轴密集3倍、Y轴极度拉伸100倍   竖直线条
            float noiseMask = (noise2d(uv_0 * vec2(3.0, 100.0)) + 1.0) / 2.0;
            // 阈值处理：只保留亮部，压低暗部   形成清晰线条
            noiseMask = pow(clamp(noiseMask - 0.1, 0.0, 1.0), 11.0);
            // 平滑边缘 + 亮度翻倍
            noiseMask = smoothstep(0.0, 0.04, noiseMask) * 2.0;

            vec3 colorNoiseMask = colorNoise(uv_0 * vec2(10.0, 100.0)) * vec3(1.5, 1.0, 400.0);

            // 边缘遮罩
            // 左右两侧淡出
            noiseMask *= smoothstep(0.02, 0.5, vUv.x) * smoothstep(0.02, 0.5, 1.0 - vUv.x);
            // 上下两侧淡出
            noiseMask *= smoothstep(0.01, 0.1, vUv.y) * smoothstep(0.01, 0.1, 1.0 - vUv.y);

            // vSpeed >= 10 时最强，1~10 之间渐变增强
            noiseMask *= smoothstep(1.0, 10.0, vSpeed);

            // 颜色安全限制
            colorNoiseMask = clamp(colorNoiseMask, vec3(0.0), vec3(1.0));

            // 警灯模式：红蓝交替
            vec3 policeColor = mix(
              vec3(3.0, 0.3, 0.3),    // 红色
              vec3(0.3, 0.3, 3.0),    // 蓝色
              vec3(smoothstep(0.10, 0.30, colorNoiseMask.g))
            );
            // vPoliceColorChange=1 切换为警灯颜色，=0 保持原来彩色流光
            colorNoiseMask = mix(colorNoiseMask, policeColor, vec3(vPoliceColorChange));

            // rgb = 光效颜色
            // a = noiseMask 控制透明度（线条亮则不透明）
            gl_FragColor = vec4(colorNoiseMask, noiseMask);

            // 关闭色调映射与编码（保持自发光高亮）
            // #include <tonemapping_fragment>
            // #include <colorspace_fragment>
          }
        `,
      depthWrite: false, // 防止遮挡其他
      transparent: true, // 透明
    });

    meshData.meshes.forEach((item: THREE.Mesh) => {
      // 统一赋值加速特效材质
      item.material = material;
      item.layers.enable(sceneConfig.LAYER_CAPTURE);
      item.layers.enable(sceneConfig.LAYER_PLANE_REFLECT);
    });
  }

  // 曲率
  public initCurvatureMaterial(meshData: ModelMeshData) {
    const material = new THREE.ShaderMaterial({
      name: 'm_curvature',

      uniforms: {
        opacity: { value: 1 }, // 透明度
        vColor: { value: new THREE.Color('#fdffc7') }, // 发光颜色
        tSaLine: { value: this.textureCache.get('t_saLine') || null },
        time: this.global_time_uniforms.u_time,
      },

      vertexShader: customVertexShader,

      fragmentShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vPositionW;
        varying vec3 vNormalW;

        // 外部参数
        uniform sampler2D tSaLine;  // 线条遮罩贴图
        uniform vec3 vColor;
        uniform float opacity;
        uniform float time;

        void main() {
          // 让线条向左流动
          // 原始 UV 放大 50 倍
          vec2 l_uv = vUv * 50.0 + vec2(-time, 0.0);

          // 从遮罩贴图中读取红色通道 白色=1（显示发光），黑色=0（透明）
          float mask = texture(tSaLine, l_uv).r;

          // 线条在 X 方向右侧淡出
          // 1 - smoothstep 左边亮，右边渐暗
          mask *= (1.0 - smoothstep(0.2, 0.28, vUv.x));

          gl_FragColor = vec4(vColor, mask * opacity);
        }
      `,

      depthWrite: false,
      side: THREE.DoubleSide,
      transparent: true,
    });

    meshData.meshes.forEach((item: THREE.Mesh) => {
      if (item.name === '曲率') {
        item.material = material;
        item.layers.enable(sceneConfig.LAYER_CAPTURE);
      }
    });
    meshData.materials.m_curvature = material;
  }

  // 风动线
  public initWindspeedMaterial(meshData: ModelMeshData): void {
    const material = new THREE.ShaderMaterial({
      name: 'm_windLine',

      uniforms: {
        // 噪声参数（控制透明度变化）：x缩放 y缩放 强度 速度
        vNoiseParams_alpha: { value: new THREE.Vector4(6, 2, 2, 0.5) },

        // 波浪噪声参数（控制UV横向偏移扰动）：x缩放 y缩放 强度 速度
        vNoiseParams_wave: { value: new THREE.Vector4(2, 1, 1, 0.5) },

        vIntensity: { value: 3 }, // 光效亮度强度
        vColor: { value: new THREE.Color('#cdeffe') }, // 光效颜色（淡蓝色）
        tSaLine: { value: this.textureCache.get('t_saLine') || null }, // 线条遮罩贴图
        time: this.global_time_uniforms.u_time, // 时间（驱动动画）
        opacity: { value: 1 }, // 整体透明度
      },
      vertexShader: customVertexShader,

      // 片元着色器：风动线核心逻辑
      fragmentShader: `
          varying vec3 vPosition;
          varying vec3 vNormal;
          varying vec2 vUv;
          varying vec3 vPositionW;
          varying vec3 vNormalW;

          uniform vec4 vNoiseParams_alpha;
          uniform vec4 vNoiseParams_wave;
          uniform float vIntensity;
          uniform vec3 vColor;
          uniform float time;
          uniform float opacity;
          uniform sampler2D tSaLine;

          // 引入噪声函数（生成随机流动效果）
          ${noise2d}

          void main() {
              // 线条透明度忽亮忽暗
              float noiseMask_alpha = 
                  noise2d( (vUv + vec2(0., time * vNoiseParams_alpha.w )) 
                  * vNoiseParams_alpha.xy ) 
                  * vNoiseParams_alpha.z;

              // 线条左右摆动，模拟风动/波浪扭曲
              float noiseMask_wave = 
                  noise2d( (vUv + vec2(0., time * vNoiseParams_wave.w )) 
                  * vNoiseParams_wave.xy ) 
                  * vNoiseParams_wave.z;

              // UV 缩放线条更密集
              vec2 l_uv = vUv * 10.;

              // 偏移UV   线条产生摆动、风动效果
              float mask = texture(tSaLine, l_uv + vec2(noiseMask_wave, 0.)).r;

              // 中间亮   上下暗   柔和光带
              mask *= smoothstep(0.0, 0.5, vUv.y) 
                    * (1.0 - smoothstep(0.5, 1.0, vUv.y));

              float finalAlpha = clamp(
                  mask * (noiseMask_alpha + 0.5) * vIntensity * opacity,
                  0.0,
                  1.0
              );

              gl_FragColor = vec4(vColor, finalAlpha);
          }
          `,

      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    meshData.meshes.forEach((item: THREE.Mesh) => {
      item.material = material as THREE.ShaderMaterial;

      item.layers.enable(sceneConfig.LAYER_CAPTURE);
    });

    meshData.materials.m_windLine = material;
  }

  public initLinecarMaterial(meshData: ModelMeshData): void {
    const material = new THREE.ShaderMaterial({
      name: 'm_linecar',

      uniforms: {
        time: this.global_time_uniforms.u_time,
        opacity: { value: 1 },
        vNoiseParams_wave: { value: new THREE.Vector4(1, 20, 10, 1.2) },
      },
      vertexShader: customVertexShader,

      fragmentShader: `
          varying vec3 vPosition;
          varying vec3 vNormal;
          varying vec2 vUv;
          varying vec3 vPositionW;
          varying vec3 vNormalW;
          varying vec3 vColor;

          uniform float time;
          uniform float opacity;
          uniform vec4  vNoiseParams_wave;

          ${noise2d}

          void main() {
              //  产生流动效果
              vec2 uvOffset = vUv + vec2(time * vNoiseParams_wave.w, 0.0);
              
              // 2D 噪声   流动纹理
              float noise = noise2d(uvOffset * vNoiseParams_wave.xy);
              
              // 噪声强度放大
              float noiseMask_alpha = noise * vNoiseParams_wave.z;

              // X 方向：左右边缘淡出
              float maskX = smoothstep(0.05, 0.4, vUv.x) 
                          * (1.0 - smoothstep(0.6, 0.95, vUv.x));
              
              // Y 方向：上下边缘淡出
              float maskY = smoothstep(0.05, 0.4, vUv.y) 
                          * (1.0 - smoothstep(0.6, 0.95, vUv.y));
              
              float edgeMask = maskX * maskY;

              // 噪声遮罩 边缘遮罩
              float finalMask = noiseMask_alpha * edgeMask;

              // 计算最终颜色
              // 颜色变亮限制在 0~1
              vec3 finalColor = clamp(vColor * 2.0, 0.0, 1.0);
              
              // 透明度 = 遮罩整体透明度
              float finalAlpha = clamp(finalMask * opacity, 0.0, 1.0);

              gl_FragColor = vec4(finalColor, finalAlpha);
          }
          `,

      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending, // 发光混合
      side: THREE.DoubleSide,
    });
    meshData.meshes.forEach((item: THREE.Mesh) => {
      item.material = material;
    });
    meshData.materials.m_linecar = material;
  }

  // 车雷达
  public initCarradarMaterial(meshData: ModelMeshData): void {
    const material = new THREE.ShaderMaterial({
      name: 'm_carradar',

      uniforms: {
        time: this.global_time_uniforms.u_time,
        opacity: { value: 1 },
        uColor: { value: new THREE.Color('#88eeff') },
        uCenter1: sceneConfig.u_simpleCarCenter1, // 雷达中心点1（车前/车后）
        uCenter2: sceneConfig.u_simpleCarCenter2, // 雷达中心点2
      },

      vertexShader: customVertexShader,

      fragmentShader: `
          varying vec3 vPosition;
          varying vec3 vNormal;
          varying vec2 vUv; 
          varying vec3 vPositionW;
          varying vec3 vNormalW;

          uniform vec3 uColor;
          uniform float time;
          uniform float opacity;
          uniform vec3 uCenter1;     // 雷达中心点 1
          uniform vec3 uCenter2;     // 雷达中心点 2

          // X/Z 方向拉长
          const float X_By_Y = 2.3;

          // 椭圆范围
          float normalizedEllipticalDistance(vec3 position, vec3 center, float radius) {
              // XZ 平面（地面）距离
              vec2 d = center.xz - position.xz;
              // Y 轴（车身方向）乘以比例，变椭圆
              d.y *= X_By_Y;
              // 标准化距离 0~1
              return length(d) / radius;
          }

          void main() {
              // distanceP = 1   在范围内
              // distanceP = 0   在范围外
              float distanceP = clamp(1. - normalizedEllipticalDistance(vPositionW, uCenter1, 4.3), 0., 1.);
              // 叠加第二个中心点
              distanceP += clamp(1. - normalizedEllipticalDistance(vPositionW, uCenter2, 4.3), 0., 1.);

              // 方向网格向左流动
              float uv_x = vUv.x * 10. - time * 3.;
              float maskCos = cos(uv_x);

              float maskX = mod(vUv.x * 10. - time * 3., 1.);
              maskX = step(maskX, 0.2 + distanceP * 0.8); 
              maskX *= maskCos; // 叠加闪烁

              float maskY = mod(vUv.y * 100., 1.);
              maskY = step(maskY, 0.2); // 20% 显示

              float mask = maskX * maskY;

              vec3 color = mix(
                uColor,             
                vec3(0.1, 1.0, 0.2),
                smoothstep(0.0, 0.5, distanceP)
              );

              gl_FragColor = vec4(color, clamp(mask * opacity, 0.0, 1.0));
          }
        `,

      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    meshData.meshes.forEach((item: THREE.Mesh) => {
      item.material = material;
      item.layers.enable(sceneConfig.LAYER_PLANE_REFLECT);
    });

    meshData.materials.m_carradar = material;
  }

  // sm_simpleCar
  public initSimpleCarMaterial(meshData: ModelMeshData): void {
    const tempMatcapMaterial = new THREE.MeshMatcapMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    tempMatcapMaterial.onBeforeCompile = (t) => {
      let n = t.fragmentShader;
      let r = t.vertexShader;
      r = r.replace(
        '#include <common>',
        `
            #include <common>
            varying vec3 vWorldPosition;
          `
      );
      r = r.replace(
        '#include <fog_vertex>',
        `
            #include <fog_vertex>
            vWorldPosition = vec3(modelMatrix * vec4(position, 1.0));
          `
      );

      n = n.replace(
        '#include <common>',
        `
            #include <common>
            varying vec3 vWorldPosition;
          `
      );

      // 左右渐隐
      n = n.replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `
            float op = opacity * clamp(1.0 - abs(vWorldPosition.x) / 14.0, 0.0, 1.0);
            
            // 使用新的透明度 op 替换原来的 opacity
            vec4 diffuseColor = vec4(diffuse, op);
          `
      );
      t.vertexShader = r;
      t.fragmentShader = n;
    };

    meshData.meshes.forEach((item: THREE.Mesh) => {
      item.material = tempMatcapMaterial;
      item.renderOrder = 10;
    });

    meshData.materials.m_simpleCar = tempMatcapMaterial;
  }

  /**
   * sm_startroom 发光材质控制
   * @param mesh
   */
  public initStartroomLightMaterial(mesh: ModelGroup): void {
    if (!mesh.userData.meshData) return;
    this.startroomLightMaterial = mesh.userData.meshData.materials.light;
    if (!this.startroomLightMaterial) return;

    // 设置自发光颜色为 黑色
    this.startroomLightMaterial.emissive.setRGB(0, 0, 0);
    this.startroomLightMaterial.transparent = true;
    this.startroomLightMaterial.depthWrite = false;
    // 初始不透明度
    this.startroomLightMaterial.opacity = 1;
    this.startroomLightMaterial.needsUpdate = true;
  }

  // 汽车车灯材质
  public initCarLightMaterial(mesh: ModelGroup): void {
    if (!mesh.userData.meshData) return;
    this.carlight.carlightMaterial = mesh.userData.meshData.materials.Car_ight;
    this.carlight.carlightMaterial!.toneMapped = false; // 关闭色调映射
    this.carlight.carlightMaterial!.aoMapIntensity = 0; // 关闭AO强度
    this.carlight.carlightMaterial!.color = MaterialManager.LIGHT_OFF_COLOR; // 设置初始颜色
    this.carlight.carlightMaterial!.needsUpdate = true; // 强制材质更新
  }

  set carlightValue(value: number) {
    this.carlight.carlightValue = value;

    this.carlight.carlightColor = this.carlight.carlightColor
      .copy(MaterialManager.LIGHT_OFF_COLOR)
      .lerp(MaterialManager.LIGHT_ON_COLOR, value);
    this.carlight.carlightMaterial!.color.copy(this.carlight.carlightColor);
    // this.carlight.carlightMaterial!.needsUpdate = true;
  }

  get carlightValue(): number {
    return this.carlight.carlightValue;
  }

  /** 获取材质实例 */
  public get material(): THREE.MeshStandardMaterial | null {
    return this.carlight.carlightMaterial;
  }

  // 雷达点着色器材质
  public getRadarPointMaterial(): THREE.ShaderMaterial {
    const material = new THREE.ShaderMaterial({
      name: 'm_radarPoints',
      uniforms: {
        time: this.global_time_uniforms.u_time,
        opacity: { value: 0 },
        vColor: { value: new THREE.Color('#ffffff') },
      },
      vertexShader: `
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec2 vUv;
            varying vec3 vPositionW;
            varying vec3 vNormalW;
            attribute vec3 color;
            varying vec3 vColor;
            varying vec4 viewerUV;

            void main() {
                vPosition = position;
                vNormal = normalMatrix * normal;
                vPositionW = vec3( modelMatrix*vec4( position, 1.0 ));
                vNormalW = normalize( vec3( vec4( normal, 0.0 ) * modelMatrix ) );
                vUv = uv;
                vColor=color;

                #ifdef USE_INSTANCING
                  vPositionW = vec3(instanceMatrix * vec4(vPositionW,1.));
                  vPosition = vec3(instanceMatrix * vec4(vPosition,1.));
                #endif

                // 添加面向摄像机的代码
                vec3 instancePosition = vec3(modelMatrix * vec4(vec3(0.),1.));
                #ifdef USE_INSTANCING
                  instancePosition = vec3(instanceMatrix * vec4(vec3(0.),1.));
                #endif

                vec3 normalFace = vec3(0.,1.,0.);
                vec3 cameraDir = normalize(cameraPosition.xyz - instancePosition);
                vec3 vcV = normalize(cross( normalFace,cameraDir ));
                vec3 vcU = normalize(cross( cameraDir,vcV ));
                vec3 vcN = normalize(cross( vcV,vcU ));
                mat3 viewMatrix = mat3( vcV, vcU, vcN );
                
                float scale = 1.;
                #ifdef USE_DISTANCE_SCALING
                  scale = pow(length(cameraPosition - instancePosition) / 50000., 0.8);
                #endif

                vec3 mvPosition = viewMatrix * vec3( position * scale);
                #ifdef USE_INSTANCING
                  mvPosition.xyz += instancePosition;
                #endif
                gl_Position = projectionMatrix * modelViewMatrix * vec4(mvPosition, 1.0);
                viewerUV = vec4((gl_Position.xyz / gl_Position.w).xy* 0.5 + 0.5,0.,1.);
            }
          `,
      fragmentShader: `
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec2 vUv;
            varying vec3 vPositionW;
            varying vec3 vNormalW;

            uniform float time;
            uniform float opacity;
            uniform vec3 vColor;

            void main() {
                float distanceUV = length(vUv-vec2(0.5,0.5));
                distanceUV = smoothstep(distanceUV,0.2,1.);
                gl_FragColor = vec4(vec3(vColor),opacity*distanceUV);
                // gl_FragColor = vec4(vec3(distanceP),1.);
            }
          `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return material;
  }

  // 获取已存在的材质
  public get<T extends THREE.MeshStandardMaterial>(key: string): T | undefined {
    return this.materials.get(key) as T;
  }

  // 判断材质是否存在
  public has(key: string): boolean {
    return this.materials.has(key);
  }

  // 删除材质（并销毁）
  public remove(key: string): void {
    const mat = this.materials.get(key);
    if (mat) {
      mat.dispose();
      this.materials.delete(key);
    }
  }

  // 清空所有材质（页面卸载时调用）
  public disposeAll(): void {
    this.materials.forEach((mat) => mat.dispose());
    this.materials.clear();
    if (this.pmremGenerator) this.pmremGenerator.dispose();
    if (this.pmremRenderTarget) this.pmremRenderTarget.dispose();
    if (this._cubeRenderTarget) this._cubeRenderTarget.dispose();
  }

  // 更新材质颜色
  public updateColor(key: string, color: string | number): void {
    const mat = this.materials.get(key) as any;
    if (mat && mat.color) {
      mat.color.set(color);
    }
  }
  // 更新纹理
  public update(
    deltaTime: number,
    elapsedTime: number,
    u_speedUpBackgroundValue: { value: number }
  ): void {
    this.u_speedUpBackgroundValue = u_speedUpBackgroundValue;

    this.global_time_uniforms.u_time.value = elapsedTime;
    this.global_time_uniforms.u_speedTime.value +=
      deltaTime * this.u_speedUpBackgroundValue.value * 0.2;
  }
  // UV 滚动动画
  public animateUV(key: string, speedX = 0.01, speedY = 0.01): void {
    const mat = this.materials.get(key) as any;
    if (mat && mat.map) {
      mat.map.offset.x += speedX;
      mat.map.offset.y += speedY;
      mat.map.needsUpdate = true;
    }
  }
}
