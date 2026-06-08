import * as THREE from 'three';
import {
  SMAAEffect,
  SMAAPreset,
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
} from 'postprocessing';
import type * as DatGUIType from 'dat.gui';
import gsap from 'gsap';

import { ModelManager } from './modelManager';
// import type { PositionRotationModel, VisibilityMaterialModel, SimpleModel } from './modelManager';
import { MaterialManager } from './materialManager';
import { ReflectManager } from '@/classes/ReflectManager';
import { EnvironmentManager } from '@/classes/Environment';
import { ScreenshotManager } from './screenshotManager';
import { BoxProjectionProbe } from '@/classes/BoxProjectionProbe';
import { SpringCamera } from '@/classes/SpringCamera';
import { CameraManager } from './cameraManager';
import { CarMotionManager } from './carMotionManager';
import { sceneConfig } from './constantsConfig';
import { isSupportMSAA } from '@/utils/index';
import { MipBlurPass } from '@/classes/MipBlurPass';

import { eventBus } from '@/utils/eventBus';
import { CacheKey } from '@/types/index';

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

enum ColorParamType {
  preset = 0,
  custom = 1,
}

interface CustomColor {
  col: THREE.Color;
  hsl: { h: number; s: number; l: number };
  bgUrl: string;
  rough: number;
  metal: number;
}

/**
 * 场景管理:
 * 渲染循环、相机、灯光
 */
export class SceneManager {
  public static instance: SceneManager | null = null;
  public readonly modelManager: ModelManager;
  public readonly materialManager: MaterialManager;

  public cameraManager: CameraManager | null = null;

  // 汽车运动
  public carMotionManager: CarMotionManager | null = null;
  // 汽车运动背景
  public u_speedUpBackgroundValue: { value: number } = { value: 0 };

  // 反射
  public reflectManager: ReflectManager | null = null;

  public readonly scene: THREE.Scene;
  // 相机
  public camera: THREE.PerspectiveCamera;
  public springCamera: SpringCamera | null = null;
  public readonly renderer: THREE.WebGLRenderer;
  public sizes: { width: number; height: number; pixelRatio: number; factor?: number };

  // 立体相机
  public cubeCamera: THREE.CubeCamera | null = null;
  public cubeRenderTarget: THREE.WebGLCubeRenderTarget | null = null;
  public cubeTexture: { value: THREE.CubeTexture | null } = { value: null };
  public orthographicCamera!: THREE.OrthographicCamera;

  public blurPass: MipBlurPass | null = null;

  // envMap
  private envMaps: Record<EnvMaps, THREE.Texture | null> = {
    t_env_night: null,
    t_env_light: null,
  };

  // 海报 + 截屏generator
  public screenshotManager: ScreenshotManager | null = null;
  // 环境贴图管理
  private envManager: EnvironmentManager | null = null;

  // 反射探针 提供 局部环境贴图校正
  public boxProjectionProbe: BoxProjectionProbe | null = null;

  // 后期处理
  public composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  public effect = {
    bloomEffect: null as BloomEffect | null,
    smaaEffect: null as SMAAEffect | null,
  };

  //   public readonly gui: dat.GUI;
  public gui: DatGUIType.GUI | null = null;
  private _guiInitialized = false;

  // timer
  public timer: THREE.Timer;

  // 动画帧 ID（用于清理）
  private _animationFrameId: number | null = null;

  // 当前模块
  currentModule: Module = 0;
  // 是否按压
  isClickEffect = false;

  // customColor params
  customColorParams: {
    col: THREE.Color;
    hsl: { h: number; s: number; l: number };
    bgUrl: string;
    rough: number;
    metal: number;
  } = {
    col: new THREE.Color(),
    hsl: { h: 0, s: 0, l: 0 },
    bgUrl: 'custom.png',
    rough: 0,
    metal: 0,
  };
  // 是否使用body贴图
  private isUsingBodyTexture = false;
  private currentColorName = 'custom';

  private constructor(canvas: HTMLCanvasElement) {
    if (typeof window === 'undefined') {
      throw new Error('只能在浏览器环境中初始化，请确保在 useEffect 中调用 getInstance');
    }
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
    };

    this.camera = new THREE.PerspectiveCamera(
      33.4,
      window.innerWidth / window.innerHeight,
      0.01,
      100
    );
    this.camera.position.set(0, 0, 4);

    // 初始化立方相机和渲染目标（用于后续实时捕获清晰反射）

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

    const axesHelper = new THREE.AxesHelper(5);
    this.scene.add(axesHelper);

    this.initPostProcessing();
    this.initGui();

    this.modelManager = ModelManager.getInstance();
    this.materialManager = MaterialManager.getInstance();

    this.customColorParams = sceneConfig.colors.get('custom') as CustomColor;
    /**
     * 点击绑定事件
     */
    // JO  eventBus
    this.bindEvents();
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

  private async initGui(): Promise<void> {
    if (this._guiInitialized || typeof window === 'undefined') return;

    try {
      // 动态导入 dat.gui
      const dat = await import('dat.gui');
      this.gui = new dat.GUI();
      this._guiInitialized = true;
    } catch (error) {
      console.warn('dat.gui 加载失败，将跳过 GUI 功能:', error);
    }
  }

  public createCubeRenderTarget(
    size: number,
    useNearestFilter: boolean = false,
    textureType: THREE.TextureDataType | boolean = false,
    msaaSamples: number = 0,
    generateMipmaps: boolean = false
  ): THREE.WebGLCubeRenderTarget {
    return new THREE.WebGLCubeRenderTarget(size, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      magFilter: useNearestFilter ? THREE.NearestFilter : THREE.LinearFilter,
      minFilter: useNearestFilter
        ? THREE.NearestFilter
        : generateMipmaps
          ? THREE.NearestMipmapLinearFilter
          : THREE.LinearFilter,
      type:
        typeof textureType === 'boolean'
          ? textureType
            ? THREE.FloatType
            : THREE.UnsignedByteType
          : textureType,
      anisotropy: 0,
      colorSpace: THREE.SRGBColorSpace,
      depthBuffer: false,
      stencilBuffer: false,
      samples: isSupportMSAA() ? msaaSamples : 0,
      generateMipmaps: generateMipmaps,
    });
  }

  /**
   * 初始化加载
   * @returns
   */
  public async initLoad(): Promise<number> {
    this.materialManager.ensureSceneManager();

    const modelTotalBytes = await this.modelManager.computeFileSize();
    const materialTotalBytes = await this.materialManager.computeFileSize();

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
      return percent;
    } catch (err) {
      console.error('模型加载失败', err);
      return percent;
    } finally {
      /*
       初始化加载 t_env_night.hdr、t_env_light.hdr
       */
      // const t_env_night = this.materialManager.getCache('t_env_night') ?? null;
      // const t_env_light = this.materialManager.getCache('t_env_light') ?? null;
      // this.envMaps = {
      //   t_env_night,
      //   t_env_light,
      // };
      // await this.materialManager.initEnvironment('t_env_light');

      await this.prepareScene();
      await this.createScene();
      this.compileScene();
    }
  }

  public async prepareScene(): Promise<void> {
    // r.addNode(uB)  // 挂载音频
    // r.addNode(mM)  // 显示UI状态， 状态 1

    // 实时环境贴图生成器
    // this._environment = r.addNode(new J3({
    //     scene: r.scene,
    //     layer: Ae.LAYER_CAPTURE,
    //     resolution: 512
    // })),

    this.cubeRenderTarget = this.createCubeRenderTarget(512, false, false, 0, true);
    this.cubeTexture.value = this.cubeRenderTarget.texture;
    this.cubeCamera = new THREE.CubeCamera(1, 100, this.cubeRenderTarget);
    this.cubeCamera.layers.set(sceneConfig.LAYER_CAPTURE); // 设置立方相机只渲染特定层 31
    this.blurPass = new MipBlurPass(this.renderer, this.cubeRenderTarget);
    this.blurPass.blurIntensity = 4.5;

    // Ae.ut_cubeCapture = this._environment.cubeTexture,
    // Ae.ut_blurCapture = this._environment.blurTexture;
    sceneConfig.ut_cubeCapture.value = this.cubeRenderTarget.texture;
    sceneConfig.ut_blurCapture.value = this.blurPass.blurTexture;

    // this.materialManager.ut_white
    // this.materialManager.ut_dark
    // this.materialManager.ut_floorMap

    /**
     * 处理各种材质
     */
    // sm_car
    const carModelCache = this.modelManager.getCache('sm_car' as CacheKey) as ModelGroup;
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
      'sm_startroom' as CacheKey
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

    // m.name == "曲率" && (m.material = NO,
    // _.materials.m_curvature = m.material,
    // m.layers.enable(Ae.LAYER_CAPTURE))
    this.materialManager.initCurvatureMaterial(sm_curvatureMeshData);

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
      'sm_simpleCar' as CacheKey
    ) as ModelGroup;
    const sm_simpleCarMeshData = sm_simpleCarModelCache?.userData?.meshData as ModelMeshData;
    sm_simpleCarMeshData && this.materialManager.initSimpleCarMaterial(sm_simpleCarMeshData);

    this.handleRequestColorList();
  }

  public async createScene(): Promise<void> {
    this.screenshotManager = new ScreenshotManager(this.renderer, this.scene, this.camera);
    this.scene.background = new THREE.Color(0, 0, 0); // 与 initEnvironment 搭配

    // sm_startroom -> reflectFloor 设置反射
    const sm_startroomModelCache = this.modelManager.getCache(
      'sm_startroom' as CacheKey
    ) as ModelGroup;

    const reflectFloor = sm_startroomModelCache!.getObjectByName('ReflecFloor') as THREE.Mesh;

    if (reflectFloor) {
      this.reflectManager = new ReflectManager(
        this.camera,
        this.renderer,
        this.scene,
        reflectFloor,
        new THREE.Vector2(1024, 1024),
        29,
        0.001
      );
    }

    // sceneConfig.u_reflect.u_reflectMatrix.value = this.reflectManager!.reflectMatrix;
    // sceneConfig.u_reflect.u_reflectTexture.value = this.reflectManager!.reflectTexture;

    // 创建环境贴图管理器
    // new YO(Ae.ut_env_night.value, Ae.ut_env_light.value);
    this.envManager = new EnvironmentManager(
      this.renderer,
      this.scene,
      sceneConfig.ut_env_night.value as THREE.Texture,
      sceneConfig.ut_env_light.value as THREE.Texture
    );

    // 设置 起始房间 发光材质设置
    // l = r.addNode(Ae.sm_startroom)
    this.scene.add(sm_startroomModelCache);
    // g = r.addNode(new qO(l))
    this.materialManager.initStartroomLightMaterial(sm_startroomModelCache);

    const carModelCache = this.modelManager.getCache('sm_car' as CacheKey) as ModelGroup;

    // _ = new dO
    this.boxProjectionProbe = new BoxProjectionProbe(this.renderer, carModelCache);
    // this.boxProjectionProbe.boxProjection = true;
    // this.boxProjectionProbe.debug = true;
    this.scene.add(carModelCache);

    // this.viewer.addComponent(Ae.sm_car, _);

    // _.probeBoxMin.set(-3, -.1, -1.5),
    this.boxProjectionProbe.probeBoxMin.set(-3, -0.1, -1.5);
    this.boxProjectionProbe.probeBoxMax.set(3.6, 3, 1.5);

    // m = r.addNode(new ZO(A))
    this.materialManager.initCarLightMaterial(carModelCache);

    // D = r.addNode(new Hl({ springLength: 11, rotation: new go(0,Math.PI * .5,0), fov: 33.4, lookAt: new Li(0,.8,0) }))
    this.springCamera = new SpringCamera({
      springLength: 11,
      rotation: new THREE.Euler(0, Math.PI * 0.5, 0),
      fov: 33.4,
      lookAt: new THREE.Vector3(0, 0.8, 0),
      camera: this.camera,
    });

    // 抖动
    this.springCamera.enablePositionNoise = false;

    // D = r.addNode(new Hl({
    this.cameraManager = new CameraManager(
      this.springCamera,
      this.renderer.domElement,
      this.camera
    );

    // 添加 车轮旋转 + 速度控制 + 相机震动强度 + 背景加速效果
    // const R = r.addNode(new $O(A, U));
    this.carMotionManager = new CarMotionManager(carModelCache, this.cameraManager);
    this.scene.add(this.modelManager.getCache('sm_speedup' as CacheKey) as ModelGroup);

    // ne = r.addNode(cB)
    this.modelManager.initWeiyiModel();

    // r.addNode(xB) sm_car_lightbar 灯光控制
    this.modelManager.initLightbarModel();
    //  r.addNode(eB) sm_size
    this.modelManager.initSizeModel();
    // r.addNode(tB) sm_curvature
    this.modelManager.initCurvatureModel();
    // r.addNode(nB) sm_windspeed
    this.modelManager.initWindspeedModel();
    // r.addNode(iB) sm_linecar
    this.modelManager.initLinecarModel();
    // r.addNode(lB) sm_carradar -> m_radarPoints
    const pointMaterial = this.materialManager.getRadarPointMaterial();
    this.modelManager.initCarRadarPointsModel(pointMaterial);
    // r.addNode(rB) sm_carradar
    this.modelManager.initCarradarModel();
    // r.addNode(sB) sm_simpleCar
    this.modelManager.initSimpleCarModel();

    // r.addPlugin(new K3({}))
    this.effect.bloomEffect = new BloomEffect({
      blendFunction: THREE.AdditiveBlending, // mo -> blendFunction: Ze.ADD,
      luminanceThreshold: 0, // 亮度阈值
      luminanceSmoothing: 1.6, // 亮度平滑度
      mipmapBlur: true, // 高性能多级纹理模糊
    });

    this.composer!.addPass(new EffectPass(this.camera, this.effect.bloomEffect));

    // fO 抗锯齿
    this.effect.smaaEffect = new SMAAEffect({
      preset: SMAAPreset.MEDIUM,
    });
    const effectPass = new EffectPass(this.camera, this.effect.smaaEffect!);
    this.composer!.addPass(effectPass);

    // this._envController = h  // this.envManager
    // this._springCtr = U  // this.cameraManager
    // this._carLightController = m  // this.materialManager.initCarLightMaterial(car);
    // this._topLightController = g  // this.materialManager.initStartroomLightMaterial(sm_startroomModelCache)
    // this._carSpeedUpdate = R // this.carMotionManager = new CarMotionManager(carModelCache, this.cameraManager);

    // this._bloom = Pe   // new K3  // this.effect.bloomEffect
    // this._projectionProbe = _  // _ = new dO()    // this.boxProjectionProbe

    // this._accessories = {
    //   s1_c: ne,      // ne = r.addNode(cB) // this.modelManager.initWeiyiModel();
    //   s1_cpcl: ce,   // ce = r.addNode(xB) // this.modelManager.initLightbarModel();
    //   s2_b: xe,      // xe = r.addNode(eB) // this.modelManager.initSizeModel();
    //   s2_c: Se,      // Se = r.addNode(tB) // this.modelManager.initCurvatureModel()
    //   s3_b: $,       // $ = r.addNode(nB)  // this.modelManager.initWindspeedModel();
    //   s3_c: q,       // q = r.addNode(iB)  // this.modelManager.initLinecarModel();
    //   s4_b: N,       // N = r.addNode(lB)  // this.modelManager.initCarRadarPointsModel()
    //   s4_c: ie,      // ie = r.addNode(rB) // this.modelManager.initCarradarModel();
    //   s4_cSC: _e,    // _e = r.addNode(sB) // this.modelManager.initSimpleCarModel();
    // };
  }

  public compileScene() {
    // BO()  共享材质
    const model = this.modelManager.getCache('sm_simpleCar' as CacheKey);

    if (!model) return;
    let tempMaterial = model.userData.meshData.materials.m_simpleCar as THREE.MeshMatcapMaterial;
    tempMaterial.matcap = sceneConfig.ut_scar_matcap.value;
    tempMaterial.needsUpdate = true;

    // this.viewer.compile()
    // A, m, D, U: this._renderer, this._scene, this._camera, this._scene
    // this.renderer.compile(this.scene, this.camera);

    eventBus.emit('ChangeModule', { module: 0 });

    /**
     * jU(): 显示一个平滑动画的加载进度条 → 加载完成后自动渐隐消失 → 消失后播放背景音乐 audioManager
     */

    // let r = Ae.getCustomParams()
    const r = this.getCustomParams();
    if (r) eventBus.emit('ChangeColor', r);
  }

  // 模块切换处理 eventBus.on('UPDATESHOWINGSTATE')
  handleModuleChange = ({ module }: { module: Module }): void => {
    console.log('handleModuleChange', module);
    this.currentModule = module || 0;

    // 车移动模块获取 moduel 用于 update
    this.carMotionManager?.getCurrentModule(module);

    // 隐藏所有配件
    this.hideAllAccessories();

    this.screenshotManager?.hide();
    // g.targetVelocity = 0
    this.carMotionManager!.targetVelocity = 0;
    this.cameraManager!.setNewRange();
    // xe.copy(Ae.u_floorLightMapColor.value)

    // const r = this._envController,   // this.envManager
    //   s = this._springCtr,           // this.cameraManager
    //   h = this._carLightController,  // this.materialManager.initCarLightMaterial
    //   l = this._topLightController,  // this.materialManager.initStartroomLightMaterial
    //   g = this._carSpeedUpdate,      // this.carMotionManager
    //   _ = this._bloom,               // this.effect.bloomEffect
    //   A = this._projectionProbe,     // this.boxProjectionProbe
    //   m = this._accessories;
    //   D                              // transitionModuel

    switch (module) {
      case 0:
        this.handleBeginAnimation();
        this.cameraManager!.enableControlCamera = false;
        break;

      case 1:
        this.cameraManager?.setNewTarget(
          new THREE.Vector3(0, 0.8, 0),
          7,
          new THREE.Euler(0, Math.PI * 0.5, 0)
        );
        this.transitionModuel();
        this.cameraManager!.targetFov = 33.4;
        break;

      case 2:
        this.cameraManager?.setNewTarget(
          new THREE.Vector3(0, 0.8, 0),
          7,
          new THREE.Euler(0, -0.89, 0.1)
        );
        // s2_b = xe = eB
        this.modelManager.showModel(this.modelManager.sizeModel, (val: number) =>
          this.modelManager.setSizeVisibility(val)
        );
        this.transitionModuel();
        this.cameraManager!.targetFov = 33.4;
        break;

      case 3:
        this.cameraManager!.setNewTarget(
          new THREE.Vector3(0.3, 0.8, 0),
          7,
          new THREE.Euler(0, 0.65, 0.1)
        );
        // s3_b = $ = nB
        this.modelManager.showModel(this.modelManager.windSpeedModel, (val: number) =>
          this.modelManager.setWindSpeedVisibility(val)
        );
        this.transitionModuel(0, 0, 10, 0, 0.5);
        this.cameraManager!.targetFov = 33.4;

        gsap.killTweensOf(this.boxProjectionProbe);
        gsap
          .timeline()
          .to(this.boxProjectionProbe!, {
            probeCenter: new THREE.Vector3(0, 0.5, 0),
            probeBoxMax: new THREE.Vector3(3.6, 1.6, 1.5),
            duration: 1,
            ease: 'power3.inOut',
            onUpdate: () => {
              this.boxProjectionProbe!.needUpdate = true;
            },
          })
          .play();
        break;
      case 4:
        this.cameraManager!.setNewTarget(
          new THREE.Vector3(0.3, 0.8, 0),
          14,
          new THREE.Euler(0, Math.PI, 1.2)
        );
        this.cameraManager!.setNewRange([0.2, 1.3]);
        this.transitionModuel(0.2, 1, 3, 0, 1.5);
        this.cameraManager!.targetFov = 33.4;
        // s4_b = N = lB
        this.modelManager.showModel(this.modelManager.carRadarPointModel, (val: number) =>
          this.modelManager.setRadarPointsVisibility(val)
        );
        break;

      case 5:
        this.cameraManager!.setNewTarget(
          new THREE.Vector3(0.2, 0.8, 0),
          7,
          new THREE.Euler(0, -0.7, 0.03)
        );
        this.transitionModuel(1, 1, 1, 0, 1.8);
        this.cameraManager!.targetFov = 33.4;
        this.screenshotManager!.show();
        break;
    }
  };

  // 场景过渡
  public transitionModuel(
    floorLightIntensity: number = 1,
    carEnvIntensity: number = 1,
    sceneExposure: number = 1,
    topLightOpacity: number = 1,
    luminanceSmooth: number = 1.8
  ): void {
    gsap.killTweensOf([
      this.boxProjectionProbe,
      sceneConfig.u_floorLightMapIntensity,
      sceneConfig.u_car_envMapIntensity,
      this.envManager,
      this.materialManager,
      this.effect.bloomEffect,
    ]);

    if (!this.boxProjectionProbe) {
      console.error('boxProjectionProbe is null');
      return;
    }
    const boxProjectionProbe = this.boxProjectionProbe;
    gsap.to(this.boxProjectionProbe, {
      duration: 1,
      ease: 'power3.inOut',
      probeCenter: new THREE.Vector3(0, 0, 0),
      probeBoxMax: new THREE.Vector3(3.6, 3, 1.5),
      onUpdate: () => {
        boxProjectionProbe.probeCenter = boxProjectionProbe.probeCenter;
      },
    });

    gsap.to(sceneConfig.u_floorLightMapIntensity, {
      duration: 1,
      value: floorLightIntensity,
    });

    gsap.to(sceneConfig.u_car_envMapIntensity, {
      duration: 1.5,
      ease: 'power3.inOut',
      value: carEnvIntensity,
    });

    gsap.to(this.blurPass, {
      duration: 1,
      exposure: sceneExposure,
    });

    gsap.to(this.materialManager.startroomLightMaterial, {
      duration: 0.5,
      opacity: topLightOpacity,
    });

    // .to({ luminanceSmoothing: ct }, 2, {})
    gsap.to(this.effect.bloomEffect!.luminanceMaterial, {
      duration: 2,
      smoothing: luminanceSmooth,
    });
  }

  // 隐藏所有配件
  public hideAllAccessories(): void {
    // this.accessories = {
    //   s1_c: ne,      // ne = r.addNode(cB) // this.modelManager.initWeiyiModel();
    //   s1_cpcl: ce,   // ce = r.addNode(xB) // this.modelManager.initLightbarModel();
    //   s2_b: xe,      // xe = r.addNode(eB) // this.modelManager.initSizeModel();
    //   s2_c: Se,      // Se = r.addNode(tB) // this.modelManager.initCurvatureModel()
    //   s3_b: $,       // $ = r.addNode(nB)  // this.modelManager.initWindspeedModel();
    //   s3_c: q,       // q = r.addNode(iB)  // this.modelManager.initLinecarModel();
    //   s4_b: N,       // N = r.addNode(lB)  // this.modelManager.initCarRadarPointsModel()
    //   s4_c: ie,      // ie = r.addNode(rB) // this.modelManager.initCarradarModel();
    //   s4_cSC: _e,    // _e = r.addNode(sB) // this.modelManager.initSimpleCarModel();
    // };

    const arr = [
      {
        model: this.modelManager.weiyiModel,
        func: (val: number) => this.modelManager.setWeiYiPosition(val),
        duration: undefined,
        delay: undefined,
      },
      {
        model: this.modelManager.lightbarModel,
        func: (val: number) => this.modelManager.setLightbarVisibility(val),
        duration: undefined,
        delay: undefined,
      },
      {
        model: this.modelManager.sizeModel,
        func: (val: number) => this.modelManager.setSizeVisibility(val),
        duration: undefined,
        delay: undefined,
      },
      {
        model: this.modelManager.curvatureModel,
        func: (val: number) => this.modelManager.setCurvatureVisibility(val),
        duration: undefined,
        delay: undefined,
      },
      {
        model: this.modelManager.windSpeedModel,
        func: (val: number) => this.modelManager.setWindSpeedVisibility(val),
        duration: undefined,
        delay: undefined,
      },
      {
        model: this.modelManager.linecarModel,
        func: (val: number) => this.modelManager.setLineCarVisibility(val),
        duration: undefined,
        delay: undefined,
      },
      {
        model: this.modelManager.carRadarPointModel,
        func: (val: number) => this.modelManager.setRadarPointsVisibility(val),
        duration: undefined,
        delay: undefined,
      },
      {
        model: this.modelManager.carRadarModel,
        func: (val: number) => this.modelManager.setCarRadarVisibility(val),
        duration: undefined,
        delay: undefined,
      },
      {
        model: this.modelManager.simpleCarData,
        func: (val: number) => this.modelManager.setSimpleCarVisibility(val),
        duration: undefined,
        delay: undefined,
      },
    ];
    arr.forEach((item) => {
      this.modelManager.hideModel(item.model, item.func, item.duration, item.delay);
    });
  }

  // 开场动画
  public handleBeginAnimation() {
    const black = new THREE.Color(0x000000);
    const green = new THREE.Color('#C9D573');
    const white = new THREE.Color(0xffffff);
    const tempColor1 = new THREE.Color();
    const tempColor2 = new THREE.Color();
    // 当前地板光颜色
    tempColor2.copy(sceneConfig.u_floorLightMapColor.value);

    if (!this.envManager) {
      console.error('envManager is null');
      return;
    }

    // 环境状态切换
    gsap.killTweensOf(this.envManager);
    gsap
      .timeline()
      .delay(1.5)
      .call(() => {
        this.envManager!.setState(1, 2.5, 'power3.easeIn');
        this.cameraManager!.gotoPOI(
          new THREE.Vector3(0, 0.8, 0),
          7,
          new THREE.Euler(0, Math.PI * 0.5, 0),
          4,
          true
        ).then(() => {
          const r = this.getCustomParams();
          console.log('r', r);

          if (r === 'custom') {
            eventBus.emit('ChangeModule', { module: 5 });
            eventBus.emit('ChangeUIColorParam', { paramType: ColorParamType.custom });
          } else if (r) {
            eventBus.emit('ChangeModule', { module: 5 });
            eventBus.emit('ChangeUIColorParam', { paramType: ColorParamType.preset });
          } else {
            eventBus.emit('ChangeModule', { module: 1 });
          }

          // this.cameraManager!.enableControlCamera = true;
        });
      })
      .delay(2.5)
      .call(() => {
        this.envManager!.setState(2, 4, 'power3.easeOut');
      });

    // 顶灯颜色渐变
    const startroomLightMaterial = this.materialManager.startroomLightMaterial;
    if (!startroomLightMaterial) {
      console.error('this.materialManager.startroomLightMaterial is null');
      return;
    }
    const topLightAnim = { progress: 0 };
    gsap.killTweensOf(startroomLightMaterial);
    gsap
      .timeline({ delay: 1.5 })
      .to(topLightAnim, {
        progress: 1,
        duration: 2.5,
        onUpdate: () => {
          tempColor1.copy(black).lerp(green, topLightAnim.progress);
          startroomLightMaterial.emissive.copy(tempColor1);
          startroomLightMaterial.emissiveIntensity = topLightAnim.progress * 0.4;
        },
        ease: 'power3.easeIn',
      })
      .set(topLightAnim, { progress: 0 })
      .to(topLightAnim, {
        progress: 1,
        duration: 2,
        ease: 'none',
        onUpdate: () => {
          tempColor1.copy(green).lerpHSL(white, topLightAnim.progress);
          startroomLightMaterial!.emissive.copy(tempColor1);
          startroomLightMaterial!.emissiveIntensity = topLightAnim.progress * 2.3 + 0.4;
        },
      });

    // 车灯渐亮
    const carlight = this.materialManager.carlight;
    if (!carlight) return;
    gsap.killTweensOf(carlight);
    gsap.to(carlight, {
      carlightValue: 1,
      duration: 1,
      delay: 1,
      ease: 'power3.easeIn',
    });

    // 地板光颜色渐变
    const floorLightAnim = { progress: 0 };
    gsap.killTweensOf(sceneConfig.u_floorLightMapIntensity);
    gsap
      .timeline({ delay: 1.5 })
      .to(sceneConfig.u_floorLightMapIntensity, {
        value: 0.1,
        duration: 2.5,
        ease: 'power3.easeIn',
      })
      .to(
        floorLightAnim,
        {
          progress: 1,
          duration: 2.5,
          ease: 'power3.in',
          onUpdate: () => {
            tempColor1.copy(tempColor2).lerpHSL(green, floorLightAnim.progress);
            sceneConfig.u_floorLightMapColor.value.copy(tempColor1);
          },
        },
        '<'
      )
      .to(sceneConfig.u_floorLightMapIntensity, {
        value: 1,
        duration: 2,
        ease: 'none',
      })
      .set(floorLightAnim, { progress: 0 })
      .to(
        floorLightAnim,
        {
          progress: 1,
          duration: 2,
          ease: 'none',
          onUpdate: () => {
            tempColor1.copy(green).lerpHSL(white, floorLightAnim.progress);
            sceneConfig.u_floorLightMapColor.value.copy(tempColor1);
          },
        },
        '<'
      );

    // // 地板反射强度
    gsap.killTweensOf(sceneConfig.u_floorReflectIntensity);
    gsap
      .timeline({ delay: 1.8 })
      .to(sceneConfig.u_floorReflectIntensity, { value: 0.1, duration: 1.5, ease: 'power3.easeIn' })
      .to(sceneConfig.u_floorReflectIntensity, { value: 1, duration: 1.5, ease: 'power1.inOut' });
  }

  // 解析 url, "custom"自定义颜色，字符串数字颜色索引，0默认颜色
  getCustomParams(): 'custom' | string | 0 {
    const urlParams = new URLSearchParams(window.location.search);
    const vParam = urlParams.get('v');

    // 格式 1：RRGGBB + 粗糙度(2位) + 金属度(2位)
    if (vParam && vParam.length === 10) {
      const colorHex = vParam.slice(0, 6);
      const roughHex = vParam.slice(6, 8);
      const metalHex = vParam.slice(8, 10);

      // 解析为0-1范围的浮点数
      const roughness = parseInt(roughHex, 16) / 255;
      const metalness = parseInt(metalHex, 16) / 255;

      const customColor = sceneConfig.colors.get('custom');
      if (!customColor) {
        return 0;
      }

      if (roughness >= 0) customColor.rough = roughness;
      if (metalness >= 0) customColor.metal = metalness;

      if (colorHex && /^[0-9A-Fa-f]{6}$/.test(colorHex)) {
        const baseColor = new THREE.Color(`#${colorHex}`);
        customColor.col.copy(baseColor);
        baseColor.convertLinearToSRGB();
        // 计算并存储HSL值
        baseColor.getHSL(customColor.hsl!);
      }

      return 'custom';
    }

    // 格式 2：?v=hXX
    if (vParam && vParam.startsWith('h') && vParam.length === 3) {
      return vParam.slice(1, 3);
    }

    // 不符合任何格式，返回默认值
    return 0;
  }

  // url + 材质参数
  generateCustomParams(): string {
    // 从 Map 中安全获取 custom（解决 undefined 类型报错）
    const custom = sceneConfig.colors.get('custom');
    if (!custom) return '';

    if (Ie.currentColorIndex === 'custom') {
      // 粗糙度 → 2位十六进制
      let n = Math.round(custom.rough * 255).toString(16);
      if (n.length < 2) n = '0' + n;

      // 金属度 → 2位十六进制
      let r = Math.round(custom.metal * 255).toString(16);
      if (r.length < 2) r = '0' + r;

      // 颜色十六进制
      const s = custom.col.getHexString();

      // 拼接完整 URL
      const base = 'https://gamemcu.com/su7?v=';
      return base + s + n + r;
    } else {
      // 预设颜色
      const base = 'https://gamemcu.com/su7?v=h';
      return base + Ie.currentColorIndex;
    }
  }

  // 处理切换颜色
  // handleChangeColor(index: 'custom' | string | 0): void {
  //   this.currentColorIndex = index;

  //   // 警车
  //   if (index === '11') {
  //     sceneConfig.u_policeColorChange.value = 1;
  //     sceneConfig.sm_car_lightbar.visible = true;
  //   } else {
  //     sceneConfig.u_policeColorChange.value = 0;
  //     sceneConfig.sm_car_lightbar.visible = false;
  //   }
  // }

  // 后期处理
  private initPostProcessing(): void {
    // 后期处理
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);

    this.composer.addPass(this.renderPass);
  }

  public getEnvMap(envName: EnvMaps): THREE.Texture | null {
    return this.envMaps[envName] || null;
  }

  public startRender(): void {
    if (this._animationFrameId) return;

    const render = () => {
      this._animationFrameId = requestAnimationFrame(render);

      //   update(r) {
      //     if (Ae.u_speedTime.value += r * Ae.u_speedUpBackgroundValue.value * .2,
      //     Ae.u_time.value += r,
      //     Ae.sm_car) {
      //         const s = Ae.sm_car.meshData.materials.Car_body;
      //         s.metalness = Ae.u_carMetalness.value,
      //         s.roughness = Ae.u_carRoughness.value,
      //         s.color.copy(Ae.u_carColor.value)
      //     }
      // }
      this.timer.update();
      const deltaTime = this.timer.getDelta();
      const elapsedTime = this.timer.getElapsed();

      if (sceneConfig.sm_car) {
        this.materialManager.updateSmCarCarBody();
      }

      // 模块1, 汽车移动
      (this.currentModule == 1 || this.currentModule == 4) &&
        // this.isClickEffect &&
        this.carMotionManager &&
        this.carMotionManager.update(deltaTime, this.u_speedUpBackgroundValue);

      // 模块1， sm_car_lightbar
      this.currentModule == 1 &&
        // this.isClickEffect &&
        this.carMotionManager &&
        this.modelManager.updateLightbarIntensity();

      // 模块4
      this.currentModule == 4 && this.modelManager.updateSimpleCar(deltaTime);

      // 相机
      this.cameraManager && this.cameraManager.update(deltaTime);

      // 更新材质
      this.materialManager &&
        this.materialManager.update(deltaTime, elapsedTime, this.u_speedUpBackgroundValue);

      // this.materialManager.updateEnvMap(new THREE.Vector3(0, 0, 0));

      // 反射平面反射渲染
      this.reflectManager && this.reflectManager.render();
      // 环境贴图更新
      this.envManager && this.envManager.update();

      // 5 -> 截图
      this.currentModule == 4 && this.screenshotManager && this.screenshotManager.render();

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

  public resize(width = window.innerWidth, height = window.innerHeight, isSwap = false): void {
    this.sizes.width = width;
    this.sizes.height = height;

    // 正交相机
    // if (camera.isOrthographicCamera) {
    //   this._viewport = {
    //     width: effectiveW / camera.zoom,
    //     height: effectiveH / camera.zoom,
    //     factor: 1,
    //   };
    // }

    // 透视相机
    if (this.camera.isPerspectiveCamera) {
      if (!(this.camera as any).manual) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
      }

      const cameraDist = this.camera.position.distanceTo(new THREE.Vector3());
      const vHeight = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * cameraDist;
      const vWidth = vHeight * this.camera.aspect;
      this.sizes.width = vWidth;
      this.sizes.height = vHeight;
      this.sizes.factor = width / vWidth;
    }

    this.renderer.setSize(width, height);
    this.composer?.setSize(width, height);
  }

  public screenshot(): void {
    this.screenshotManager!.screenshot();
  }

  private onPointerDown = () => {
    console.log('onPointerDown');

    this.isClickEffect = true;
    this.handleClickEffect(true);
  };

  private onPointerUp = () => {
    console.log('onPointerUp');
    this.isClickEffect = false;
    this.handleClickEffect(false);
  };

  // 点击效果
  public handleClickEffect(isClickEffect: boolean): void {
    console.log('handleClickEffect', isClickEffect, this.currentModule);

    // 隐藏所有配件
    this.hideAllAccessories();

    switch (this.currentModule) {
      case 1:
        if (isClickEffect) {
          this.carMotionManager!.targetVelocity = 8;
          this.carMotionManager!.lerpStrength = 0.5;
          this.cameraManager!.targetFov = 60;
          this.cameraManager!._springlengthOffset = -3;
          this.cameraManager!._lerpStrength = 0.5;

          // m.s1_c.show()
          this.modelManager.showModel(this.modelManager.weiyiModel, (val: number) =>
            this.modelManager.setWeiYiPosition(val)
          );
          // m.s1_cpcl.show(.5, .2),
          this.modelManager.showModel(
            this.modelManager.lightbarModel,
            (val: number) => this.modelManager.setLightbarVisibility(val),
            0.5,
            0.2
          );
          this.transitionModuel(0, 0.1, 1, 0, 0);

          gsap.killTweensOf(sceneConfig.u_carMetalness);
          gsap.to(sceneConfig.u_carMetalness, {
            value: Math.max(0, sceneConfig.u_carMetalness.value - 0.3),
            duration: 0.8,
            ease: 'cubic.in',
          });
        } else {
          this.carMotionManager!.targetVelocity = 0;
          this.carMotionManager!.lerpStrength = 1.5;
          this.cameraManager!.targetFov = 33.4;
          this.cameraManager!._springlengthOffset = 0;
          this.cameraManager!._lerpStrength = 1.5;

          this.transitionModuel();

          gsap.killTweensOf(sceneConfig.u_carMetalness);
          gsap.to(sceneConfig.u_carMetalness, {
            value: sceneConfig.colors.get(this.currentColorName)?.metal ?? 0,
            duration: 1,
            ease: 'cubic.in',
          });
        }
        break;
      case 2:
        if (isClickEffect) {
          // m.s2_c.show(1, 0.2)
          this.modelManager.showModel(
            this.modelManager.curvatureModel,
            (val: number) => this.modelManager.setCurvatureVisibility(val),
            1,
            0.2
          );
          this.cameraManager!.targetFov = 45;
          this.cameraManager!._lerpStrength = 0.5;
        } else {
          this.modelManager.showModel(
            this.modelManager.sizeModel,
            (val: number) => this.modelManager.setSizeVisibility(val),
            1,
            0.2
          );
          this.cameraManager!.targetFov = 33.4;
          this.cameraManager!._lerpStrength = 0.5;
        }
        break;
      case 3:
        if (isClickEffect) {
          // m.s3_c.show(1, 0.2)
          this.modelManager.showModel(
            this.modelManager.linecarModel,
            (val: number) => this.modelManager.setLineCarVisibility(val),
            1,
            0.2
          );
          this.cameraManager!.targetFov = 60;
          this.cameraManager!._springlengthOffset = -3;
          this.cameraManager!._lerpStrength = 1.5;
        } else {
          this.modelManager.showModel(
            this.modelManager.windSpeedModel,
            (val: number) => this.modelManager.setWindSpeedVisibility(val),
            1,
            0.2
          );
          this.cameraManager!.targetFov = 33.4;
          this.cameraManager!._springlengthOffset = 0;
          this.cameraManager!._lerpStrength = 1.5;
        }
        break;
      case 4:
        if (isClickEffect) {
          this.carMotionManager!.targetVelocity = 16;
          this.carMotionManager!.lerpStrength = 0.5;

          // m.s4_c.show()
          this.modelManager.showModel(this.modelManager.carRadarModel, (val: number) =>
            this.modelManager.setCarRadarVisibility(val)
          );
          // m.s4_cSC.show()
          this.modelManager.showModel(this.modelManager.simpleCarData, (val: number) =>
            this.modelManager.setSimpleCarVisibility(val)
          );
          // m.s1_c.show()
          this.modelManager.showModel(this.modelManager.weiyiModel, (val: number) =>
            this.modelManager.setWeiYiPosition(val)
          );
          // m.s1_cpcl.show(0.5, 0.2)
          this.modelManager.showModel(
            this.modelManager.lightbarModel,
            (val: number) => this.modelManager.setLightbarVisibility(val),
            0.5,
            0.2
          );

          this.cameraManager!.targetFov = 45; // orbit return
          this.cameraManager!._springlengthOffset = 20;
          this.cameraManager!._lerpStrength = 1.5;
          this.cameraManager!._moveSpeed = [0.1, 0.1];

          this.transitionModuel(0.2, 0.3, 3, 0, 1.5);
        } else {
          this.carMotionManager!.targetVelocity = 0;
          this.carMotionManager!.lerpStrength = 1.5;

          this.cameraManager!.targetFov = 33.4;
          this.cameraManager!._springlengthOffset = 0;
          this.cameraManager!._lerpStrength = 1.5;
          this.cameraManager!._moveSpeed = [1, 1];
          this.modelManager.showModel(this.modelManager.carRadarPointModel, (val: number) =>
            this.modelManager.setRadarPointsVisibility(val)
          );

          this.transitionModuel(0.2, 0.3, 3, 0, 1.5);
        }

        break;
      default:
        break;
    }
  }

  setColor = ({ col }: { col: THREE.Color }) => {
    console.log('col', col);

    col.getHSL(this.customColorParams.hsl);
    this.customColorParams.col.copy(col).convertSRGBToLinear();
  };

  handleChangeColor = (colorName?: string) => {
    // 警灯
    if (colorName && colorName == '11') {
      this.modelManager.lightbarModel.model!.visible = true;
    } else {
      this.modelManager.lightbarModel.model!.visible = false;
    }

    const { col, hsl, bgUrl, rough, metal, carCover, carWindowFilm, carWindowRoughness, floorMap } =
      sceneConfig.colors.get(colorName || 'custom');

    console.log('col', new THREE.Color('#ffc03f').convertSRGBToLinear());
    console.log('col', col);
    console.log('rough', rough);

    const carModelCache = this.modelManager.getCache('sm_car' as CacheKey) as ModelGroup;
    const carMeshData = carModelCache?.userData?.meshData as ModelMeshData;
    const carBody = carMeshData.materials.Car_body as THREE.MeshStandardMaterial;

    if (carCover) {
      carBody.map = carCover.value;
    } else {
      carBody.map = sceneConfig.ut_white.value;
    }

    if (carCover || this.isUsingBodyTexture) {
      sceneConfig.u_carColor.value.copy(new THREE.Color(0, 0, 0));
    }

    this.isUsingBodyTexture = !!carCover;

    if (this.currentColorName !== 'custom' || colorName !== 'custom') {
      gsap.killTweensOf([
        sceneConfig.u_carColor,
        sceneConfig.u_carRoughness,
        ,
        sceneConfig.u_carMetalness,
      ]);

      gsap
        .timeline()
        .to(sceneConfig.u_carColor.value, { r: col.r, g: col.g, b: col.b, duration: 0.2 })
        .to(sceneConfig.u_carRoughness, { value: rough || 0, duration: 0.2 }, 0)
        .to(sceneConfig.u_carMetalness, { value: metal || 0, duration: 0.2 }, 0);
    } else {
      sceneConfig.u_carColor.value.copy(col);
      sceneConfig.u_carRoughness.value = rough ?? 0;
      sceneConfig.u_carMetalness.value = metal ?? 0;
    }

    colorName && (this.currentColorName = colorName);

    const carWindowMaterial = carMeshData.materials.Car_window as THREE.MeshStandardMaterial;

    if (carWindowFilm && carWindowRoughness) {
      carWindowMaterial.color = new THREE.Color(0xffffff).convertSRGBToLinear();
      carWindowMaterial.opacity = 1;
      carWindowMaterial.roughness = 1;
      console.log('carWindowFilm', carWindowFilm);
      carWindowMaterial.map = carWindowFilm.value;
      carWindowMaterial.roughnessMap = carWindowRoughness.value;
      carWindowMaterial.metalnessMap = carWindowRoughness.value;
    } else {
      carWindowMaterial.color = sceneConfig.u_m_car_window_orignData.color;
      carWindowMaterial.opacity = sceneConfig.u_m_car_window_orignData.opacity;
      carWindowMaterial.roughness = sceneConfig.u_m_car_window_orignData.roughness;
      carWindowMaterial.map = sceneConfig.ut_white.value;
      carWindowMaterial.roughnessMap = sceneConfig.ut_dark.value;
      carWindowMaterial.metalnessMap = sceneConfig.ut_white.value;
    }

    sceneConfig.ut_floorMap.value = floorMap ? floorMap.value : sceneConfig.ut_white.value;
  };

  handleRequestColorList(): void {
    const colorList = sceneConfig.colors as Map<string, ColorThemeItem | CustomColor>;

    eventBus.emit('ReturnColorList', colorList);
  }

  changeColorParam = (col: CustomColor) => {
    sceneConfig.colors.set('custom', col);
    this.handleChangeColor();
  };

  // 点击绑定
  bindEvents(): void {
    eventBus.on('ChangeModule', this.handleModuleChange.bind(this));
    eventBus.on('ChangeColor', this.handleChangeColor.bind(this));

    eventBus.on('RequestColorList', this.handleRequestColorList.bind(this));
    eventBus.on('ChangeColor:ChangeColorParam', this.changeColorParam.bind(this));

    if (!this.renderer?.domElement) return;

    this.unbindEvents();
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
  }

  // 点击解绑
  unbindEvents(): void {
    eventBus.off('ChangeModule', this.handleModuleChange);
    eventBus.off('ChangeColor', this.handleChangeColor);

    eventBus.off('RequestColorList', this.handleRequestColorList);
    eventBus.off('ChangeColor:ChangeColorParam', this.changeColorParam);
    eventBus.off('ChangeColor:SetColor', this.setColor);

    if (!this.renderer?.domElement) return;

    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
  }

  public dispose(): void {
    this.stopRender();
    if (this.cubeRenderTarget) this.cubeRenderTarget.dispose();
    if (this.effect.smaaEffect) this.effect.smaaEffect.dispose();
    if (this.blurPass) this.blurPass.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }

    // 截屏
    this.screenshotManager!.dispose();

    this.unbindEvents();

    if (this.gui) {
      this.gui.destroy();
    }
    this.cameraManager && this.cameraManager.dispose();
    this.scene.clear();
    this.camera.clear();
    SceneManager.instance = null;

    eventBus.off('ScreenshotManager:show');
    eventBus.off('ScreenshotManager:hide');
    eventBus.off('ScreenshotManager:screenshot');
  }
}
