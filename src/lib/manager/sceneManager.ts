'use client';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTF } from 'three/addons/loaders/GLTFLoader.js';

import { ModelManager } from './modelManager';
import { MaterialManager } from './materialManager';
import type * as DatGUIType from 'dat.gui';

import { CacheKey } from '@/types/index';

/**
 * 场景管理:
 * 渲染循环、相机、灯光
 */
export class SceneManager {
  private static instance: SceneManager | null = null;

  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly controls: OrbitControls;

  //   public readonly gui: dat.GUI;
  public gui: DatGUIType.GUI | null = null;
  private _guiInitialized = false;

  public readonly sizes: { width: number; height: number; pixelRatio: number };
  public readonly modelManager: ModelManager;
  public readonly materialManager: MaterialManager;

  private timer: THREE.Timer;
  // 动画帧 ID（用于清理）
  private _animationFrameId: number | null = null;
  // 窗口大小监听函数（用于清理）
  private _resizeHandler: (() => void) | null = null;

  private currentModelCache: GLTF[] = [];

  private constructor(container: HTMLElement) {
    if (typeof window === 'undefined') {
      throw new Error('只能在浏览器环境中初始化，请确保在 useEffect 中调用 getInstance');
    }
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio,
    };

    this.camera = new THREE.PerspectiveCamera(75, this.sizes.width / this.sizes.height, 0.1, 1000);

    this.camera.position.set(0, 0, 5);

    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(this.sizes.pixelRatio);
    this.renderer.setClearColor(new THREE.Color('#ffffff'));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.timer = new THREE.Timer();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    const axesHelper = new THREE.AxesHelper(5);
    this.scene.add(axesHelper);

    this.modelManager = ModelManager.getInstance();
    this.materialManager = MaterialManager.getInstance();

    this._initResizeHandler();

    // this.gui = new dat.GUI();
    this._initGUI();
  }

  public static getInstance(container?: HTMLElement): SceneManager {
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
      console.log('dat.gui 初始化完成');
    } catch (error) {
      console.warn('dat.gui 加载失败，将跳过 GUI 功能:', error);
    }
  }

  async initLoad(): Promise<number> {
    // let modelLoadedBytes: number = 0;
    // let materialLoadedBytes: number = 0;

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
        console.log('progress', progress.currentFile, progress.loadedBytes);
        modelLoaded = progress.loadedBytes;
        updatePercent();
      });
      const allMaterialSuccess = await this.materialManager.loadAllMaterial((progress) => {
        console.log('progress', progress.currentFile, progress.loadedBytes);
        materialLoaded = progress.loadedBytes;
        updatePercent();
      });

      if (!allModelSuccess || !allMaterialSuccess) {
        console.error('模型加载失败');
        return 0;
      }

      console.log('加载完成', allModelSuccess && allMaterialSuccess);

      const modelCache = this.modelManager.getCahce('sm_car' as CacheKey);
      if (modelCache) this.currentModelCache.push(modelCache);

      // 加载完成后统一添加到场景
      this.currentModelCache.forEach((model) => {
        this.scene.add(model.scene);
      });

      return percent;
    } catch (err) {
      console.error('模型加载失败', err);
      return percent;
    }
  }

  public startRender(): void {
    if (this._animationFrameId) return;

    const render = () => {
      this._animationFrameId = requestAnimationFrame(render);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
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
    this.camera.aspect = this.sizes.width / this.sizes.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.sizes.width, this.sizes.height);
  }

  public dispose(): void {
    this.stopRender();
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
