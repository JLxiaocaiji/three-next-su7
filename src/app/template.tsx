import React from 'react';

import Header from '@/components/Header';
import Bottom from '@/components/Bottom';
import LeftCustomization from '@/components/LeftCustomization';
import RightContent from '@/components/RightContent';
import RenderContext from '@/components/RenderContent';
import LoadingProgress from '@/components/LoadingProgress';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* 加载 */}
      <LoadingProgress />

      {/* header */}
      <Header />
      {/* 主体渲染 */}
      <RenderContext />
      <LeftCustomization />
      <RightContent />
      <Bottom />
    </>
  );
}
