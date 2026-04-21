'use client';

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
import type * as DatGUIType from 'dat.gui';

import { CacheKey } from '@/types/index';

export enum EnvMaps {
  t_env_night = 't_env_night',
  t_env_light = 't_env_light',
}

/**
 * 场景管理:
 * 渲染循环、相机、灯光
 */
export class SceneManager {
  private static instance: SceneManager | null = null;

  public readonly scene: THREE.Scene;
  // 相机
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly sizes: { width: number; height: number; pixelRatio: number };
  public readonly controls: OrbitControls;
  public readonly modelManager: ModelManager;
  public readonly materialManager: MaterialManager;

  // 立体相机
  public cubeCamera: THREE.CubeCamera | null = null;
  public cubeRenderTarget: THREE.WebGLCubeRenderTarget | null = null;

  // envMap
  private envMaps: Record<EnvMaps, THREE.Texture | null> = {
    t_env_night: null,
    t_env_light: null,
  };

  private layers: Record<string, number> = {
    capture_layer: 31,
  };

  // 后期处理
  public composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private smaaEffect: SMAAEffect | null = null;

  //   public readonly gui: dat.GUI;
  public gui: DatGUIType.GUI | null = null;
  private _guiInitialized = false;

  private timer: THREE.Timer;
  // 动画帧 ID（用于清理）
  private _animationFrameId: number | null = null;
  // 窗口大小监听函数（用于清理）
  private _resizeHandler: (() => void) | null = null;
  // 当前模型缓存
  private currentModelCache: GLTF[] = [];

  private constructor(canvas: HTMLCanvasElement) {
    if (typeof window === 'undefined') {
      throw new Error('只能在浏览器环境中初始化，请确保在 useEffect 中调用 getInstance');
    }
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
    };

    this.camera = new THREE.PerspectiveCamera(75, this.sizes.width / this.sizes.height, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });

    this.cubeCamera = new THREE.CubeCamera(0.1, 1000, this.cubeRenderTarget);

    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
    });
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(this.sizes.pixelRatio);
    this.renderer.setClearColor(new THREE.Color('#ffffff'));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // container.appendChild(this.renderer.domElement);

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

      /*
       初始化加载 car 和 t_env_night.hdr、t_env_light.hdr
       */
      const modelCache = this.modelManager.getCache('sm_car' as CacheKey);
      if (modelCache) this.currentModelCache.push(modelCache);
      const t_env_night = this.materialManager.getCache('t_env_night') ?? null;
      const t_env_light = this.materialManager.getCache('t_env_light') ?? null;
      this.envMaps = {
        t_env_night,
        t_env_light,
      };

      await this.materialManager.initEnvironment('t_env_night');

      // 加载完成后统一添加到场景
      this.currentModelCache.forEach((model) => {
        this.scene.add(model.scene);
      });

      return percent;
    } catch (err) {
      console.error('模型加载失败', err);
      return percent;
    } finally {
      this.materialManager.initCubeRenderTarget();
    }
  }

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
    console.log('resize', this.sizes.width, this.sizes.height);
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
