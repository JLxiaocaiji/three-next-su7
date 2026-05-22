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
import { CarMoveManager } from './carMoveManager';
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

/**
 * 场景管理:
 * 渲染循环、相机、灯光
 */
export class SceneManager {
  private static instance: SceneManager | null = null;
  public readonly modelManager: ModelManager;
  public readonly materialManager: MaterialManager;

  public cameraManager: CameraManager | null = null;
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
  private smaaEffect: SMAAEffect | null = null;

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

    // eventBus
    this.setupBusListeners();
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

      this.createScene();
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
      'sm_simplecar' as CacheKey
    ) as ModelGroup;
    const sm_simpleCarMeshData = sm_simpleCarModelCache?.userData?.meshData as ModelMeshData;
    sm_simpleCarMeshData && this.materialManager.initSimpleCarMaterial(sm_simpleCarMeshData);
  }

  public createScene(): void {
    this.screenshotManager = new ScreenshotManager(this.renderer, this.scene, this.camera);

    this.scene.background = new THREE.Color(0, 0, 0);

    // sm_startroom -> reflectFloor 设置反射
    const sm_startroomModelCache = this.modelManager.getCache(
      'sm_startroom.raw' as CacheKey
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
    console.log('carModelCache', carModelCache);

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

    // const R = r.addNode(new $O(A,U))

    // // 添加 车轮旋转 + 速度控制 + 相机震动强度 + 背景加速效果
    // const carMoveManager = new CarMoveManager(car, this.cameraController);
    // this.scene.add(this.modelManager.getCache('sm_speedup' as CacheKey) as ModelGroup);

    // // 找到 3D 模型里名字 = "WeiYi" 的子物体
    // this.modelManager.initWeiyiModel();
    // // sm_car_lightbar 灯光控制
    // this.modelManager.initLightbarModel();
    // // sm_size
    // this.modelManager.initSizeModel();
    // // sm_curvature
    // this.modelManager.initCurvatureModel();
    // // sm_windspeed
    // this.modelManager.initWindspeedModel();
    // // sm_linecar
    // this.modelManager.initLinecarModel();
    // // sm_carradar -> m_radarPoints
    // this.modelManager.initCarRadarPointsModel();
    // // sm_carradar
    // this.modelManager.initCarradarModel();
    // // sm_simpleCar
    // this.modelManager.initSimpleCarModel();

    // const bloom = new BloomEffect({
    //   blendFunction: THREE.AdditiveBlending,
    //   luminanceThreshold: 0,
    //   luminanceSmoothing: 1.6,
    //   mipmapBlur: true,
    //   // intensity: 1.0,
    // });

    // this.initPostProcessing();

    // this._envController = h  // this.envManager
    // this._springCtr = U  // this.cameraController
    // this._carLightController = m  // this.materialManager.initCarLightMaterial(car);
    // this._topLightController = g  // this.materialManager.initStartroomLightMaterial(sm_startroomModelCache)
    // this._carSpeedUpdate = R // const carMoveManager = new CarMoveManager(car, this.cameraController);
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
      switch (module) {
        case 0:
          break;
        case 4:
          this.screenshotManager && this.screenshotManager.show(0.5);
          break;
      }
    });

    // 监听隐藏指令
    eventBus.on('ScreenshotManager:hide', (data) => {
      this.screenshotManager && this.screenshotManager.hide(data?.duration ?? 0.5);
    });

    // 监听截图指令
    eventBus.on('ScreenshotManager:screenshot', async () => {
      this.screenshotManager && this.screenshotManager.screenshot();
    });
  }

  public dispose(): void {
    this.stopRender();
    if (this.cubeRenderTarget) this.cubeRenderTarget.dispose();
    if (this.smaaEffect) this.smaaEffect.dispose();
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
