'use client';

import { useCallback, useState, useEffect } from 'react';

export const useTap = <T = void>(onTap: (data: T) => void) => {
  return useCallback(
    (data: T) => {
      onTap(data);
    },
    [onTap]
  );
};

export const useIsSwapWidthAndHeight = () => {
  const [isSwap, setIsSwap] = useState(false);

  const checkIsMobile = () => {
    const ua = navigator.userAgent;
    if (/iPad/.test(ua)) return false;
    if (window.innerWidth < 645) return false;
    return /Mobile|Android|iPhone|iPod|BlackBerry|Windows Phone/gi.test(ua);
  };

  useEffect(() => {
    // 初始化
    setIsSwap(checkIsMobile());

    // 监听变化
    const onUpdate = () => {
      setIsSwap(checkIsMobile());
    };

    window.addEventListener('resize', onUpdate);
    window.addEventListener('orientationchange', onUpdate);

    return () => {
      window.removeEventListener('resize', onUpdate);
      window.removeEventListener('orientationchange', onUpdate);
    };
  }, []);

  return isSwap;
};
