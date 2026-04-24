'use client';

import { useEffect, useState, useRef } from 'react';
import { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

import { SceneManager } from '@/lib/manager/sceneManager';

import { useIsSwapWidthAndHeight } from '@/hook/index';
import { debounce } from '@/utils/index';
export default function ModelPage({
  setLoadingProgress,
}: {
  setLoadingProgress: (progress: number) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('准备加载');
  const [models, setModels] = useState<Map<string, GLTF>>(new Map());

  const containerRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneManager | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { isSwap, viewWidth, viewHeight } = useIsSwapWidthAndHeight();

  const loadModel = async () => {
    let percent = await sceneRef.current!.initLoad();
    setLoadingProgress(percent);
  };

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    sceneRef.current = SceneManager.getInstance(containerRef.current as HTMLCanvasElement);

    const { scene, renderer, camera, composer } = sceneRef.current;

    loadModel();

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    // 主光源: 方向光 (产生明暗对比)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(2, 5, 3);
    directionalLight.castShadow = true;
    directionalLight.receiveShadow = false;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 8;
    directionalLight.shadow.camera.left = -5;
    directionalLight.shadow.camera.right = 5;
    directionalLight.shadow.camera.top = 5;
    directionalLight.shadow.camera.bottom = -5;
    scene.add(directionalLight);

    sceneRef.current.startRender();

    return () => {
      if (!sceneRef.current) return;
      const { scene } = sceneRef.current;
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      sceneRef.current.dispose();
    };
  }, []);

  const updateSize = debounce(() => {
    if (!sceneRef.current) return;
    const { camera, renderer, composer, sizes } = sceneRef.current;

    const w = isSwap ? viewHeight : viewWidth;
    const h = isSwap ? viewWidth : viewHeight;

    sizes.width = w;
    sizes.height = h;
    // sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer?.setSize(w, h);
  }, 100);

  useEffect(() => {
    updateSize();
  }, [isSwap, viewWidth, viewHeight]);

  return (
    <>
      <aside className="webgl-wrapper">
        <canvas
          className="webgl-canvas"
          ref={containerRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            touchAction: 'none',
          }}
        ></canvas>
        <div id="css-container"></div>
      </aside>
    </>
  );
}
