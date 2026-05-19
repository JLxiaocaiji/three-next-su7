'use client';

import { useEffect, useState } from 'react';

import Header from '@/components/Header';
import Bottom from '@/components/Bottom';
import LeftCustomization from '@/components/LeftCustomization';
import RightContent from '@/components/RightContent';
import RenderContext from '@/components/RenderContent';
import LoadingProgress from '@/components/LoadingProgress';
import ScreenShot from '@/components/ScreenShot';

import { eventBus } from '@/utils/eventBus';
export default function Page() {
  const [loadingProgress, setLoadingProgress] = useState(0);

  const [part, setPart] = useState(4);

  useEffect(() => {
    // const manager = ModelManager.getInstance();
    // manager.loadAll(
    //   (progress) => {
    //     console.log('progress', progress.currentFile, progress.percent);
    //     setLoadingProgress(progress.percent);
    //   },
    //   (results, allSuccess) => {
    //     console.log('加载完成', allSuccess);
    //   }
    // );
    // return () => manager.cancel();
  }, []);

  return (
    <>
      {/* 加载 */}
      <LoadingProgress loadingProgress={loadingProgress} />

      {/* 主体渲染 */}
      <RenderContext setLoadingProgress={setLoadingProgress} />

      {/* header */}
      <Header />
      <LeftCustomization part={part} />
      <RightContent part={part} setPart={setPart} />
      <Bottom part={part} />

      <ScreenShot />
    </>
  );
}
