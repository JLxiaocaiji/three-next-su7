'use client';

import { useEffect, useState, useRef } from 'react';
import { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

import { ModelLoadResult } from '@/types/model';

import { SceneManager } from '@/lib/sceneManager';
import { ModelManager } from '@/lib/modelManager';

export default function ModelPage() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('准备加载');
  const [models, setModels] = useState<Map<string, GLTF>>(new Map());

  const containerRef = useRef<HTMLDivElement>(null);
  //   const loaderRef = useRef(ModelManager.getInstance());
  const loaderRef = useRef<ModelManager | null>(null);
  const sceneRef = useRef<SceneManager | null>(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    loaderRef.current = ModelManager.getInstance();
    const loader = loaderRef.current;

    sceneRef.current = SceneManager.getInstance(containerRef.current as HTMLDivElement);

    const { scene } = sceneRef.current;

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

    // 辅助背光暖色填充阴影
    // const backLight = new THREE.PointLight(0xcc9966, 0.5);
    // backLight.position.set(-2, 1, -3);
    // scene.add(backLight);

    sceneRef.current.startRender();

    loader.loadAll(
      // 进度回调：更新 UI
      (p) => {
        setProgress(p.percent);
        setStatus(`正在加载: ${p.currentFile}`);
      },
      // 完成回调：处理结果
      (results: ModelLoadResult[], allSuccess: boolean) => {
        if (allSuccess) {
          setStatus('加载完成');

          // 保存模型到状态，并添加到场景
          const newModels = new Map<string, GLTF>();

          results.forEach((res) => {
            if (res.success && res.data) {
              newModels.set(res.fileInfo.name, res.data);
              // 将模型添加到 Three.js 场景
              scene.add(res.data.scene);
            }
          });
          setModels(newModels);
        } else {
          setStatus('加载失败');
          console.error(
            '失败详情:',
            results.filter((r) => !r.success)
          );
        }
      }
    );

    return () => {
      loader.cancel();
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

  return (
    <>
      <aside className="webgl-wrapper">
        <canvas className="webgl-canvas"></canvas>
        <div id="css-container" ref={containerRef}></div>
      </aside>
    </>
  );
}
