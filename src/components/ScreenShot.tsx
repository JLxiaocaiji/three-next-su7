'use client';

import { useEffect, useState, useRef } from 'react';
import { useScreenshotStore } from '@/store/useScreenshotStore';
import { eventBus } from '@/utils/eventBus';

export default function ScreenShot() {
  const { screenshot, setScreenshotVisible } = useScreenshotStore();

  const imageSrc = screenshot?.picUrl || '';
  const width = screenshot?.width || 0;
  const height = screenshot?.height || 0;
  const visible = screenshot?.visible || false;

  const hide = () => {
    setScreenshotVisible(false);
    eventBus.emit('ScreenshotManager:hide', { duration: 1 });
  };

  const handleLongPress = () => {
    if (!imageSrc) return;

    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `screenshot-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {visible && (
        <div
          style={{
            opacity: 1,
            transition: 'opacity 0.2s ease 0.3s',
          }}
        >
          <div
            id="screenshot"
            className="screenshot"
            style={{
              pointerEvents: 'all',
              zIndex: 2,
              opacity: visible ? 1 : 0,
              transform: 'none',
              backgroundColor: 'rgba(0, 0, 0, 0.867)',
            }}
          >
            <div style={{ display: 'block' }}>
              <img id="screenshot-img" src={imageSrc} alt="截图" width={width} height={height} />
              <p>长按图片可保存并分享</p>
            </div>

            <div
              className="camera"
              style={{ marginBottom: '4rem', marginTop: '2rem' }}
              onClick={hide}
            >
              <img
                src="/icon/close.webp"
                alt="关闭"
                style={{ width: '2.4rem', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
