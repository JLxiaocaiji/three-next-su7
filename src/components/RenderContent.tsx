'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

import { SceneManager } from '@/lib/manager/sceneManager';

import { useIsSwapWidthAndHeight, checkIsNeedSwap } from '@/hook/index';
import { debounce } from '@/utils/index';

import { useStore, cleanupAllStores } from '@/store/index';
import { eventBus } from '@/utils/eventBus';

export default function ModelPage({}: {}) {
  const containerRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneManager | null>(null);

  const { isSwap, viewWidth, viewHeight, isMobile } = useIsSwapWidthAndHeight();

  const setStoreSwap = useStore((state) => state.setStoreSwap);
  const setProgress = useStore((state) => state.setProgress);
  const setIsMobile = useStore((state) => state.setIsMobile);

  // 监听窗口大小变化
  useEffect(() => {
    if (!sceneRef) return;

    const handleResize = debounce((w: number, h: number, swap: boolean) => {
      setStoreSwap(w > h);
      if (w <= 0 || h <= 0) return;
      sceneRef.current?.resize(w, h, swap);

      setIsMobile(isMobile);
    }, 100);

    const w = isSwap ? viewHeight : viewWidth;
    const h = isSwap ? viewWidth : viewHeight;
    handleResize(w, h, isSwap);
  }, [isSwap, viewWidth, viewHeight, setStoreSwap, setIsMobile]);

  // sceneManager
  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    sceneRef.current = SceneManager.getInstance(containerRef.current as HTMLCanvasElement);

    const onProgress = ({ progress }: { progress: number }) => {
      setProgress(progress);
      if (progress === 100) {
        sceneRef.current?.startRender();
      }
    };

    eventBus.on('LoadingProgress', onProgress);

    sceneRef.current.initLoad();

    return () => {
      eventBus.off('LoadingProgress', onProgress);
      if (!sceneRef.current) return;
      sceneRef.current.dispose();
      SceneManager.instance = null;

      cleanupAllStores();
    };
  }, []);

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
