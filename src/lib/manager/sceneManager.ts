import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  SMAAEffect,
  SMAAPreset,
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
} from 'postprocessing';
import type * as DatGUIType from 'dat.gui';

import { ModelManager } from './modelManager';
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

import { useStore } from '@/store';

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
  public static instance: SceneManager | null = null;
  public readonly modelManager: ModelManager;
  public readonly materialManager: MaterialManager;

  public cameraManager: CameraManager | null = null;

  public carMotionManager: CarMotionManager | null = null;
  // 反射
  public reflectManager: ReflectManager | null = null;

  public readonly scene: THREE.Scene;
  // 相机
  public camera: THREE.PerspectiveCamera;
  public springCamera: SpringCamera | null = null;
  public readonly renderer: THREE.WebGLRenderer;
  public sizes: { width: number; height: number; pixelRatio: number; factor?: number };
  public readonly controls: OrbitControls;

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
  public globalUniforms: Record<string, THREE.IUniform> = {
    u_time: { value: 0 },
    u_speedTime: { value: 0 },
  };

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

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    const axesHelper = new THREE.AxesHelper(5);
    this.scene.add(axesHelper);

    this.initPostProcessing();
    // this._initResizeHandler();
    this._initGUI();

    this.modelManager = ModelManager.getInstance();
    this.materialManager = MaterialManager.getInstance();
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
      this.prepareScene();

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

      await this.createScene();

      this.compileScene();
    }
  }

  public prepareScene(): void {
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
    // sm_curvature -> 曲率
    const sm_curvatureMesh = sm_curvatureMeshData.meshes.find((item) => item.name === '曲率');

    // m.name == "曲率" && (m.material = NO,
    // _.materials.m_curvature = m.material,
    // m.layers.enable(Ae.LAYER_CAPTURE))
    sm_curvatureMesh &&
      ((sm_curvatureMeshData.materials as any).m_curvature =
        this.materialManager.initCurvatureMaterial(sm_curvatureMesh));
    sm_curvatureMesh!.layers.enable(sceneConfig.LAYER_CAPTURE);

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
  }

  public async createScene(): Promise<void> {
    this.screenshotManager = new ScreenshotManager(this.renderer, this.scene, this.camera);

    this.scene.background = new THREE.Color(0, 0, 0);

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

    // sceneConfig.u_reflect.u_reflectMatrix.value = this.reflectManager.reflectMatrix;
    // sceneConfig.u_reflect.u_reflectTexture.value = this.reflectManager.reflectTexture;

    // 创建环境贴图管理器
    // new YO(Ae.ut_env_night.value,Ae.ut_env_light.value)
    this.envManager = new EnvironmentManager(
      this.renderer,
      this.scene,
      sceneConfig.ut_env_night.value as THREE.Texture,
      sceneConfig.ut_env_light.value as THREE.Texture
    );
    this.envManager.setState(2);
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

    this.cameraManager = new CameraManager(
      this.springCamera,
      this.renderer.domElement,
      this.camera
    );

    this.cameraManager.enableControlCamera = true;

    /**
     * 点击绑定事件
     */
    // xxxx  JO
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);

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
    this.modelManager.initCarRadarPointsModel();
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
    // this._carSpeedUpdate = R // const carMoveManager = new CarMoveManager(car, this.cameraManager);

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

    // eventBus
    this.setupBusListeners();
    // this.eventRegister();  // eventRegister.ts
  }

  public compileScene() {
    // BO()  共享材质
    const model = this.modelManager.getCache('sm_simplecar' as CacheKey);
    if (!model) return;
    let tempMaterial = model.userData.meshData.materials.m_simpleCar as THREE.MeshMatcapMaterial;
    tempMaterial.matcap = sceneConfig.ut_scar_matcap.value;
    tempMaterial.needsUpdate = true;

    // this.viewer.compile()
    // A, m, D, U: this._renderer, this._scene, this._camera, this._scene
    this.renderer.compile(this.scene, this.camera);

    // Ie.emit(Ie.PRELOADED);  对应 eventBus; eventBus.emit('PRELOADED');
    /**
     * this.on(this.PRELOADED, () => {
            this.emit(this.UPDATESHOWINGSTATE, 1)
        }
        currentModule = 1;
     */
    /**
     * jU(): 显示一个平滑动画的加载进度条 → 加载完成后自动渐隐消失 → 消失后播放背景音乐 audioManager
     */

    // let r = Ae.getCustomParams()
    const r = this.getCustomParams();

    // r && Ie.emit(Ie.CHANGECOLOR, r)
  }

  private onPointerDown = () => {
    eventBus.emit('clickEffect', { isclickEffect: true });
  };

  private onPointerUp = () => {
    eventBus.emit('clickEffect', { isclickEffect: false });
  };

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

  async initScene(): Promise<void> {}

  // 更新实时环境贴图与模糊
  private _updateReflection(): void {
    // 确保所有部件都已初始化
    if (!this.cubeCamera || !this.cubeRenderTarget || !this.blurPass) return;
    this.cubeCamera.position.set(0, 0, 0);
    this.cubeCamera.update(this.renderer, this.scene);

    this.blurPass.update();
  }

  public startRender(): void {
    if (this._animationFrameId) return;

    const render = () => {
      this.controls.update();
      this._animationFrameId = requestAnimationFrame(render);

      // this._updateReflection();

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
      this.globalUniforms.u_speedTime.value +=
        deltaTime * sceneConfig.u_speedUpBackgroundValue.value * 0.2;
      this.globalUniforms.u_time.value = this.timer.getElapsed();
      this.materialManager.updateSmCarCarBody();

      // this.materialManager.updateEnvMap(new THREE.Vector3(0, 0, 0));

      // 反射平面反射渲染
      this.reflectManager && this.reflectManager.render();
      // 环境贴图更新
      this.envManager && this.envManager.update();

      this.composer?.render();

      // 4 -> 截图
      this.screenshotManager && this.screenshotManager.render();
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

  private setupBusListeners(): void {
    // 监听模块切换
    eventBus.on('UI-RightContent:changeModule', ({ module: module }) => {
      console.log('UI-RightContent:changeModule', module);

      if (module !== 4 && this.screenshotManager?._enabled) {
        this.screenshotManager.hide();
      }

      switch (module) {
        case 0:
          break;
        case 4:
          this.screenshotManager!.show(0.5);
          break;
      }
    });

    // 监听隐藏指令
    eventBus.on('ScreenshotManager:hide', (data) => {
      this.screenshotManager!.hide(data?.duration ?? 0.5);
    });

    // 监听截图指令
    // eventBus.on('ScreenshotManager:screenshot', async () => {
    //   this.screenshotManager!.screenshot();
    // });
  }

  public screenshot(): void {
    this.screenshotManager!.screenshot();
  }

  public getCurrentModule(module?: Module): void {
    this.carMotionManager?.getCurrentModule(module);
  }

  public showModel(duration: number = 1, delay: number = 0) {
    // 先停止旧动画
    // gsap.killTweensOf(this.windModel);
    // gsap.to(this.windModel, {
    //   duration: duration,
    //   delay: delay,
    //   visibility: 1,
    //   ease: 'power2.inOut', // 对应 Cubic.InOut
    //   onUpdate: () => {
    //     // 动画每帧更新透明度
    //     this.setWindVisibility(this.windModel.visibility);
    //   },
    // });
  }

  // 淡出（1 → 0）
  public hideModel(duration: number = 1, delay: number = 0) {
    // gsap.killTweensOf(this.windModel);
    // gsap.to(this.windModel, {
    //   duration: duration,
    //   delay: delay,
    //   visibility: 0,
    //   ease: 'power2.inOut',
    //   onUpdate: () => {
    //     this.setWindVisibility(this.windModel.visibility);
    //   },
    // });
  }

  // 解析 url, "custom"自定义颜色，字符串数字颜色索引，0默认颜色
  getCustomParams(): 'custom' | string | 0 {
    const urlParams = new URLSearchParams(window.location.search);
    const vParam = urlParams.get('v');

    // 处理10位自定义颜色格式: RRGGBB + 粗糙度(2位) + 金属度(2位)
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

      roughness && (customColor.rough = roughness);
      metalness && (customColor.metal = metalness);

      if (colorHex) {
        const baseColor = new THREE.Color(`#${colorHex}`);
        customColor.col.copy(baseColor);
        baseColor.convertLinearToSRGB();
        // 计算并存储HSL值
        baseColor.getHSL(customColor.hsl!);
      }

      return 'custom';
    }
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

  public dispose(): void {
    this.stopRender();
    if (this.cubeRenderTarget) this.cubeRenderTarget.dispose();
    if (this.effect.smaaEffect) this.effect.smaaEffect.dispose();
    if (this.blurPass) this.blurPass.dispose();

    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }

    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }

    // 截屏
    this.screenshotManager!.dispose();

    if (this.gui) {
      this.gui.destroy();
    }
    this.controls.dispose();
    this.scene.clear();
    this.camera.clear();
    SceneManager.instance = null;

    eventBus.off('ScreenshotManager:show');
    eventBus.off('ScreenshotManager:hide');
    eventBus.off('ScreenshotManager:screenshot');
  }
}
