'use client';

import { useEffect, useState, useRef } from 'react';
import { ModelLoader } from '@/lib/modelLoader';
import { ModelLoadResult } from '@/types/model';
import { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

export default function ModelPage() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('准备加载');
  const [models, setModels] = useState<Map<string, GLTF>>(new Map());

  const loaderRef = useRef(ModelLoader.getInstance());
  const sceneRef = useRef<THREE.Scene | null>(null);

  useEffect(() => {
    const loader = loaderRef.current;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    loader.loadAll(
      // 进度回调：更新 UI
      (p) => {
        setProgress(p.percent);
        setStatus(`正在加载: ${p.currentFile}`);
      },
      // 完成回调：处理结果
      (results, allSuccess) => {
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
      // 清理 Three.js 场景 (可选)
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          obj.material.dispose();
        }
      });
    };
  }, []);
}
