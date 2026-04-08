"use client";

import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import * as dat from 'dat.gui';


interface Sizes {
    width: number;
    height: number;
    pixelRatio: number;
}

export const useThree = () => {
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const guiRef = useRef<dat.GUI | null>(null);
    const gltfLoaderRef = useRef<GLTFLoader | null>(null);

    const init = () => {
        if (sceneRef.current) return

        const gui = new dat.GUI();
        guiRef.current = gui;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const sizes: Sizes = {
            width: window.innerWidth,
            height: window.innerHeight,
            pixelRatio: Math.min(window.devicePixelRatio, 2)
        };

        const camera = new THREE.PerspectiveCamera(
            75,
            sizes.width / sizes.height,
            0.1,
            1000
        )

        camera.position.set(0, 0, 5);
        cameraRef.current = camera;

        // 渲染器
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(sizes.width, sizes.height);
        renderer.setPixelRatio(sizes.pixelRatio);
        renderer.setClearColor(new THREE.Color('#000011'));
        rendererRef.current = renderer;

        // 控制器
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controlsRef.current = controls;

        // 辅助轴
        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);

        // Draco + GLTF 加载器
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/draco/');
        const gltfLoader = new GLTFLoader();
        gltfLoader.setDRACOLoader(dracoLoader);
        gltfLoaderRef.current = gltfLoader

        return {
            scene: sceneRef.current!,
            camera: cameraRef.current!,
            renderer: rendererRef.current!,
            controls: controlsRef.current!,
            gui: guiRef.current!,
            gltfLoader: gltfLoaderRef.current!,
        }
    }

    useEffect(() => {
        init()
    }, [])
}





// 定义进度回调类型
type ProgressCallback = (percent: number) => void;

/**
 * 模型加载钩子（带定制化进度动画）
 * @returns loadModel 加载函数 + progress 进度值 + isLoading 加载状态
 */
export function useModelLoader() {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // 平滑动画工具函数（0 → 20% 缓慢动画）
  const animateSlowProgress = (callback: ProgressCallback) => {
    let current = 0;
    const speed = 0.3; // 控制缓慢速度，越小越慢
    const timer = setInterval(() => {
      current += speed;
      if (current >= 20) {
        current = 20;
        clearInterval(timer);
      }
      callback(current);
    }, 16); // 60fps 平滑动画
  };

  // 快速完成动画（加载完成后 20% → 100%）
  const animateFastComplete = (callback: ProgressCallback) => {
    let current = progress;
    const speed = 5; // 快速完成速度
    const timer = setInterval(() => {
      current += speed;
      if (current >= 100) {
        current = 100;
        clearInterval(timer);
        setIsLoading(false);
      }
      callback(current);
    }, 16);
  };

  /**
   * 核心模型加载函数
   * @param url 模型地址
   * @returns 加载完成的模型对象
   */
  const loadModel = async (url: string): Promise<THREE.Object3D> => {
    return new Promise((resolve, reject) => {
      setIsLoading(true);
      setProgress(0);

      // 第一步：0 → 20% 缓慢动画
      animateSlowProgress((p) => {
        setProgress(p);
      });

      // 初始化加载器
      const loader = new GLTFLoader();
      loader.load(
        url,
        // 加载完成
        (gltf) => {
          // 第三步：快速动画到 100%
          animateFastComplete((p) => {
            setProgress(p);
          });
          resolve(gltf.scene);
        },
        // 加载进度
        (xhr) => {
          if (xhr.lengthComputable) {
            // 第二步：真实进度映射到 20% ~ 100%
            const realPercent = (xhr.loaded / xhr.total) * 80;
            const currentPercent = 20 + realPercent;
            setProgress(currentPercent);
          }
        },
        // 加载失败
        (error) => {
          console.error('模型加载失败：', error);
          setIsLoading(false);
          reject(error);
        }
      );
    });
  };

  return { loadModel, progress, isLoading };
}