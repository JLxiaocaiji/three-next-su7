import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import {
  SMAAEffect,
  SMAAPreset,
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
} from 'postprocessing';

import { ModelManager } from './modelManager';
import { MaterialManager } from './materialManager';
import { ReflectManager } from './reflectManager';
import { EnvironmentManager } from './environManager';
import { PosterGenerator } from './posterGenerator';
import { BoxProjectionReflectionManager } from './boxProjectionReflectionManager';
import { SpringCamera, CameraController } from './cameraManager';
import { CarMoveManager } from './carMoveManager';
import type * as DatGUIType from 'dat.gui';

import { CacheKey } from '@/types/index';

import { SCENE_CONFIG } from './constantsConfig';

export enum EnvMaps {
  t_env_night = 't_env_night',
  t_env_light = 't_env_light',
}

export interface ModelMeshData {
  meshes: THREE.Mesh[];
  materials: Record<string, THREE.MeshStandardMaterial | THREE.ShaderMaterial>;
  textures: Record<string, THREE.Texture>;
}

export interface ModelGroup extends THREE.Group {
  userData: {
    animations?: THREE.AnimationClip[];
    meshData?: ModelMeshData;
  };
}

/**
 * 场景管理:
 * 渲染循环、相机、灯光
 */
export class SceneManager {
  private static instance: SceneManager | null = null;
  public readonly modelManager: ModelManager;
  public readonly materialManager: MaterialManager;
  // 反射
  public reflectManager: ReflectManager | null = null;

  public readonly scene: THREE.Scene;
  // 相机
  // public camera: THREE.PerspectiveCamera;
  public camera: SpringCamera;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly sizes: { width: number; height: number; pixelRatio: number };
  public readonly controls: OrbitControls;

  // 立体相机
  public cubeCamera: THREE.CubeCamera | null = null;
  public cubeRenderTarget: THREE.WebGLCubeRenderTarget | null = null;

  public orthographicCamera!: THREE.OrthographicCamera;

  // envMap
  private envMaps: Record<EnvMaps, THREE.Texture | null> = {
    t_env_night: null,
    t_env_light: null,
  };

  // 海报generator
  public posterGenerator: PosterGenerator | null = null;
  // 环境贴图管理
  private envManager: EnvironmentManager | null = null;

  // 设置 起始房间 发光材质设置
  // public startroomLightMaterialManager: ;

  // 反射探针 提供 局部环境贴图校正
  public boxProjectionReflectionManager: BoxProjectionReflectionManager | null = null;

  // 后期处理
  public composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private smaaEffect: SMAAEffect | null = null;

  //   public readonly gui: dat.GUI;
  public gui: DatGUIType.GUI | null = null;
  private _guiInitialized = false;

  // timer
  public timer: THREE.Timer;
  public globalUniforms: Record<string, THREE.IUniform> = { u_time: { value: 0 } };

  // 动画帧 ID（用于清理）
  private _animationFrameId: number | null = null;
  // 窗口大小监听函数（用于清理）
  private _resizeHandler: (() => void) | null = null;
  // 当前模型缓存
  private currentModelCache: THREE.Group[] = [];

  private constructor(canvas: HTMLCanvasElement) {
    if (typeof window === 'undefined') {
      throw new Error('只能在浏览器环境中初始化，请确保在 useEffect 中调用 getInstance');
    }
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
    };

    // this.camera = new THREE.PerspectiveCamera(75, this.sizes.width / this.sizes.height, 0.1, 1000);
    // this.camera.position.set(0, 0, 5);

    // 初始化立方相机和渲染目标（用于后续实时捕获清晰反射）
    this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });

    this.cubeCamera = new THREE.CubeCamera(0.1, 1000, this.cubeRenderTarget);

    this.orthographicCamera = new THREE.OrthographicCamera(
      -this.sizes.width / 2,
      this.sizes.width / 2,
      this.sizes.height / 2,
      -this.sizes.height / 2,
      0.1,
      1000
    );

    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
    });
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(this.sizes.pixelRatio);
    this.renderer.setClearColor(new THREE.Color('#ffffff'));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.timer = new THREE.Timer();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    const axesHelper = new THREE.AxesHelper(5);
    this.scene.add(axesHelper);

    this.modelManager = ModelManager.getInstance();
    this.materialManager = MaterialManager.getInstance();

    this.initPostProcessing();
    // this._initResizeHandler();
    this._initGUI();
  }

  public static getInstance(container?: HTMLCanvasElement): SceneManager {
    if (!SceneManager.instance) {
      if (!container) {
        throw new Error('须传入 container 参数');
      }
      SceneManager.instance = new SceneManager(container);
    }
    return SceneManager.instance;
  }

  private async _initGUI(): Promise<void> {
    if (this._guiInitialized || typeof window === 'undefined') return;

    try {
      // 动态导入 dat.gui（仅在客户端执行）
      const dat = await import('dat.gui');
      this.gui = new dat.GUI();
      this._guiInitialized = true;
    } catch (error) {
      console.warn('dat.gui 加载失败，将跳过 GUI 功能:', error);
    }
  }

  /**
   * 初始化加载
   * @returns
   */
  public async initLoad(): Promise<number> {
    let modelTotalBytes = await this.modelManager.computeFileSize();
    let materialTotalBytes = await this.materialManager.computeFileSize();

    const total = modelTotalBytes + materialTotalBytes;
    let modelLoaded = 0;
    let materialLoaded = 0;
    let percent = 0;
    const updatePercent = () => {
      const allLoaded = modelLoaded + materialLoaded;
      percent = Math.floor((allLoaded / total) * 100);
      return percent;
    };

    try {
      const allModelSuccess = await this.modelManager.loadAllModel((progress) => {
        modelLoaded = progress.loadedBytes;
        updatePercent();
      });
      const allMaterialSuccess = await this.materialManager.loadAllMaterial((progress) => {
        materialLoaded = progress.loadedBytes;
        updatePercent();
      });

      if (!allModelSuccess || !allMaterialSuccess) {
        console.error('模型加载失败');
        return 0;
      }

      console.log('加载完成', allModelSuccess && allMaterialSuccess);

      this.initMaterials();

      /*
       初始化加载 t_env_night.hdr、t_env_light.hdr
       */
      const t_env_night = this.materialManager.getCache('t_env_night') ?? null;
      const t_env_light = this.materialManager.getCache('t_env_light') ?? null;
      this.envMaps = {
        t_env_night,
        t_env_light,
      };

      await this.materialManager.initEnvironment('t_env_night');

      // 加载完成后统一添加到场景

      return percent;
    } catch (err) {
      console.error('模型加载失败', err);
      return percent;
    } finally {
      this.materialManager.initCubeRenderTarget();
    }
  }

  // 处理各种材质
  public initMaterials(): void {
    // sm_car
    const carModelCache = this.modelManager.getCache('sm_car' as CacheKey) as ModelGroup;
    // if (carModelCache) this.currentModelCache.push(carModelCache);
    this.scene.add(carModelCache);
    const carMeshData = carModelCache?.userData?.meshData as ModelMeshData;
    carMeshData && this.materialManager.initCarMaterial(carMeshData);

    // lightbar
    const lightbarModelCache = this.modelManager.getCache(
      'sm_car_lightbar' as CacheKey
    ) as ModelGroup;
    const lightbarMeshData = lightbarModelCache?.userData?.meshData as ModelMeshData;
    lightbarModelCache.visible = false;
    lightbarMeshData && this.materialManager.initLightbarMaterial(lightbarMeshData);

    // sm_startroom
    const sm_startroomModelCache = this.modelManager.getCache(
      'sm_startroom.raw' as CacheKey
    ) as ModelGroup;
    const startroomMeshData = sm_startroomModelCache?.userData?.meshData as ModelMeshData;
    startroomMeshData && this.materialManager.initStartroomMaterial(startroomMeshData);

    // sm_speedup
    const sm_speedupModelCache = this.modelManager.getCache('sm_speedup' as CacheKey) as ModelGroup;
    const sm_speedupMeshData = sm_speedupModelCache?.userData?.meshData as ModelMeshData;
    sm_speedupMeshData && this.materialManager.initSpeedupMaterial(sm_speedupMeshData);

    // sm_size
    const sm_sizeModelCache = this.modelManager.getCache('sm_size' as CacheKey) as ModelGroup;
    const sm_sizeMeshData = sm_sizeModelCache?.userData?.meshData as ModelMeshData;
    Object.values(sm_sizeMeshData.materials).forEach(
      (item: THREE.MeshStandardMaterial | THREE.ShaderMaterial) => {
        if (item instanceof THREE.MeshStandardMaterial) {
          item.transparent = true;
          item.needsUpdate = true;
          if (item.map) {
            // 加空判断更安全
            item.map.anisotropy = 4;
          }
        }
      }
    );

    // sm_curvature
    const sm_curvatureModelCache = this.modelManager.getCache(
      'sm_curvature' as CacheKey
    ) as ModelGroup;
    const sm_curvatureMeshData = sm_curvatureModelCache?.userData?.meshData as ModelMeshData;
    // sm_curvature -> 曲率
    const sm_curvatureMesh = sm_curvatureMeshData.meshes.find((item) => item.name === '曲率');
    // sm_curvatureMeshData.materials > m_curvature
    sm_curvatureMesh &&
      (sm_curvatureMeshData.materials.m_curvature =
        this.materialManager.initCurvatureMaterial(sm_curvatureMesh));
    sm_curvatureMesh!.layers.enable(SCENE_CONFIG.LAYER_CAPTURE);
    Object.values(sm_curvatureMeshData.materials).forEach((item) => {
      item.transparent = true;
      item.needsUpdate = true;
    });

    // sm_windspeed
    const sm_windspeedModelCache = this.modelManager.getCache(
      'sm_windspeed' as CacheKey
    ) as ModelGroup;
    const sm_windspeedMeshData = sm_windspeedModelCache?.userData?.meshData as ModelMeshData;
    sm_windspeedMeshData && this.materialManager.initWindspeedMaterial(sm_windspeedMeshData);

    // sm_linecar 汽车线框
    const sm_linecarModelCache = this.modelManager.getCache('sm_linecar' as CacheKey) as ModelGroup;
    const sm_linecarMeshData = sm_linecarModelCache?.userData?.meshData as ModelMeshData;
    sm_linecarMeshData && this.materialManager.initLinecarMaterial(sm_linecarMeshData);

    // sm_carradar
    const sm_carradarModelCache = this.modelManager.getCache(
      'sm_carradar' as CacheKey
    ) as ModelGroup;
    const sm_carradarMeshData = sm_carradarModelCache?.userData?.meshData as ModelMeshData;
    sm_carradarMeshData && this.materialManager.initCarradarMaterial(sm_carradarMeshData);

    // sm_simpleCar
    const sm_simpleCarModelCache = this.modelManager.getCache(
      'sm_simplecar' as CacheKey
    ) as ModelGroup;
    const sm_simpleCarMeshData = sm_simpleCarModelCache?.userData?.meshData as ModelMeshData;
    sm_simpleCarMeshData && this.materialManager.initSimpleCarMaterial(sm_simpleCarMeshData);
  }

  public createScene(): void {
    // this.posterGenerator = new PosterGenerator(this.renderer);
    // this.posterGenerator?.enabled = false;
    this.scene.background = new THREE.Color(0, 0, 0);

    // 反射
    const planeGeo = new THREE.PlaneGeometry(10, 10);
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      side: THREE.DoubleSide,
    });
    const reflectPlane = new THREE.Mesh(planeGeo, planeMat);
    reflectPlane.rotation.x = -Math.PI / 2; // 平放作为地面
    this.scene.add(reflectPlane);

    this.reflectManager = new ReflectManager(
      this.camera,
      this.renderer,
      this.scene,
      reflectPlane,
      new THREE.Vector2(1024, 1024),
      29,
      0
    );
    SCENE_CONFIG.u_reflect.u_reflectMatrix.value = this.reflectManager.reflectMatrix;
    SCENE_CONFIG.u_reflect.u_reflectTexture.value = this.reflectManager.reflectTexture;

    // sm_startroom 设置反射
    const sm_startroomModelCache = this.modelManager.getCache(
      'sm_startroom.raw' as CacheKey
    ) as ModelGroup;
    sm_startroomModelCache!.traverse((item) => {
      console.log(item.name);
      if (item.name === 'ReflecFloor' || item.name === 'Floor') {
        this.materialManager.createReflectMaterial(item as THREE.Mesh);
      }
    });

    // 创建环境贴图管理器
    this.envManager = new EnvironmentManager(
      this.scene,
      this.envMaps.t_env_night as THREE.Texture,
      this.envMaps.t_env_light as THREE.Texture
    );
    // 设置 起始房间 发光材质设置
    this.materialManager.initStartroomLightMaterial(sm_startroomModelCache);
    // this.startroomLightMaterialManager = this.materialManager.startroomLightMaterial

    this.boxProjectionReflectionManager = new BoxProjectionReflectionManager(SCENE_CONFIG.sm_car); // this.modelManager.getCache('sm_car' as CacheKey) 创建盒子投影反射管理器
    this.boxProjectionReflectionManager.probeBoxMin.set(-3, -0.1, -1.5);
    this.boxProjectionReflectionManager.probeBoxMax.set(3.6, 3, 1.5);

    const car = this.modelManager.getCache('sm_car' as CacheKey) as ModelGroup;
    this.materialManager.initCarLightMaterial(car);

    this.camera = new SpringCamera({
      springLength: 11,
      rotation: new THREE.Euler(0, Math.PI * 0.5, 0),
      fov: 33.4,
      lookAt: new THREE.Vector3(0, 0.8, 0),
    });

    const cameraController = new CameraController(this.camera, this.renderer.domElement);

    /**
     * 点击绑定事件
     */
    // xxxx  JO

    // 添加 车轮旋转 + 速度控制 + 相机震动强度 + 背景加速效果
    const carMoveManager = new CarMoveManager(car, cameraController);
    this.scene.add(this.modelManager.getCache('sm_speedup' as CacheKey) as ModelGroup);

    // 找到 3D 模型里名字 = "WeiYi" 的子物体
    this.modelManager.initWeiyiModel();
    // sm_car_lightbar 灯光控制
    this.modelManager.initLightbarModel();
    // sm_size
    this.modelManager.initSizeModel();
    // sm_curvature
    this.modelManager.initCurvatureModel();
    // sm_windspeed
    this.modelManager.initWindspeedModel();
    // sm_linecar
    this.modelManager.initLinecarModel();
    // sm_carradar -> m_radarPoints
    this.modelManager.initCarRadarPointsModel();
    // sm_carradar
    this.modelManager.initCarradarModel();
    // sm_simpleCar
    this.modelManager.initSimpleCarModel();
  }

  // 后期处理
  private initPostProcessing(): void {
    // 后期处理
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);

    // 抗锯齿
    this.smaaEffect = new SMAAEffect({
      preset: SMAAPreset.MEDIUM,
    });
    const effectPass = new EffectPass(this.camera, this.smaaEffect!);

    this.composer.addPass(this.renderPass);
    this.composer.addPass(effectPass);
  }

  public getEnvMap(envName: EnvMaps): THREE.Texture | null {
    return this.envMaps[envName] || null;
  }

  async initScene(): Promise<void> {}

  public startRender(): void {
    if (this._animationFrameId) return;

    const render = () => {
      this._animationFrameId = requestAnimationFrame(render);

      this.timer.update();
      this.globalUniforms.u_time.value = this.timer.getElapsed();

      this.controls.update();
      this.renderer.render(this.scene, this.camera);

      // this.materialManager.updateEnvMap(new THREE.Vector3(0, 0, 0));
      this.composer?.render();
    };

    render();
  }

  public stopRender(): void {
    if (this._animationFrameId) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }
  }

  private _initResizeHandler(): void {
    this._resizeHandler = () => this.resize();
    window.addEventListener('resize', this._resizeHandler);
  }

  public resize(): void {
    this.sizes.width = window.innerWidth;
    this.sizes.height = window.innerHeight;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer?.setSize(window.innerWidth, window.innerHeight);
  }

  public dispose(): void {
    this.stopRender();
    if (this.cubeRenderTarget) this.cubeRenderTarget.dispose();
    if (this.cubeRenderTarget) this.cubeRenderTarget.dispose();
    if (this.smaaEffect) this.smaaEffect.dispose();

    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }

    if (this.gui) {
      this.gui.destroy();
    }
    this.controls.dispose();
    this.scene.clear();
    this.camera.clear();
    SceneManager.instance = null;
  }
}
