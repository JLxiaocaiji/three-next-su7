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

    const w = isSwap ? viewHeight : viewWidth;
    const h = isSwap ? viewWidth : viewHeight;

    if (w <= 0 || h <= 0) return;

    sceneRef.current.resize(w, h, isSwap);
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
