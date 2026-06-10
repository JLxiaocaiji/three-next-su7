'use client';

import Header from '@/components/Header';
import Bottom from '@/components/Bottom';
import LeftCustomization from '@/components/LeftCustomization';
import RightContent from '@/components/RightContent';
import RenderContext from '@/components/RenderContent';
import LoadingProgress from '@/components/LoadingProgress';
import ScreenShot from '@/components/ScreenShot';

import { useCurrentModule, useUser } from '@/store';

import { enableMapSet } from 'immer';

export default function Page() {
  enableMapSet();
  const currentModule = useCurrentModule();

  return (
    <>
      {/* 加载 */}
      <LoadingProgress />

      {/* 主体渲染 */}
      <RenderContext />

      {/* header */}
      <Header currentModule={currentModule} />
      <LeftCustomization currentModule={currentModule} />
      <RightContent currentModule={currentModule} />
      <Bottom currentModule={currentModule} />

      <ScreenShot />
    </>
  );
}
