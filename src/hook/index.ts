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
  const [viewWidth, setViewWidth] = useState(0);
  const [viewHeight, setViewHeight] = useState(0);

  const checkIsNeedSwap = () => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPod|iPad|Android(?!.*Mobile)/i.test(ua);
    return isMobile || window.innerWidth < 645;
  };

  const update = () => {
    const swap = checkIsNeedSwap();
    setIsSwap(swap);

    let w = window.innerWidth;
    let h = window.innerHeight;

    setViewWidth(w);
    setViewHeight(h);
  };

  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return { isSwap, viewWidth, viewHeight };
};
