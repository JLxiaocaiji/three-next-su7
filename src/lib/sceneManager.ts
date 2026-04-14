'use client';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// import * as dat from 'dat.gui';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { ModelManager } from './modelManager';

import type * as DatGUIType from 'dat.gui';

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
  public readonly gltfLoader: GLTFLoader;

  private timer: THREE.Timer;
  // 动画帧 ID（用于清理）
  private _animationFrameId: number | null = null;
  // 窗口大小监听函数（用于清理）
  private _resizeHandler: (() => void) | null = null;

  private constructor(container: HTMLElement) {
    if (typeof window === 'undefined') {
      throw new Error('只能在浏览器环境中初始化，请确保在 useEffect 中调用 getInstance');
    }
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio,
    };

    // this.gui = new dat.GUI();
    this._initGUI();

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(75, this.sizes.width / this.sizes.height, 0.1, 1000);

    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(this.sizes.pixelRatio);
    this.renderer.setClearColor(new THREE.Color('#ffffff'));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    const axesHelper = new THREE.AxesHelper(5);
    this.scene.add(axesHelper);

    this.gltfLoader = ModelManager.getInstance().gltfLoader!;

    this._initResizeHandler();
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

  public static getInstance(container?: HTMLElement): SceneManager {
    if (!SceneManager.instance) {
      if (!container) {
        throw new Error('须传入 container 参数');
      }
      SceneManager.instance = new SceneManager(container);
    }
    return SceneManager.instance;
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

  static {
    if (
      process.env.NODE_ENV === 'development' &&
      typeof window !== 'undefined' &&
      typeof module !== 'undefined'
    ) {
      // 使用类型断言告诉 TypeScript 这里有 hot 属性
      const mod = module as NodeJS.Module & { hot?: any };

      mod.hot?.dispose(() => {
        if (SceneManager.instance) {
          console.log('热更新：销毁旧的 SceneManager 实例');
          SceneManager.instance.dispose();
          SceneManager.instance = null;
        }
      });
    }
  }
}
