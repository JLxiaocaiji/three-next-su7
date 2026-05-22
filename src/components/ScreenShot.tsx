'use client';

import { useEffect, useState } from 'react';
import { eventBus } from '@/utils/eventBus'; // 你的 mitt 事件总线

export default function ScreenShot() {
  // 控制显示/隐藏
  const [visible, setVisible] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const [width, setWidth] = useState(0);
  const [height, setheight] = useState(0);

  const hide = () => {
    setVisible(false);
    eventBus.emit('ScreenshotManager:hide', { duration: 1 });
  };

  useEffect(() => {
    const handleComplete = ({
      picUrl,
      width,
      height,
    }: {
      picUrl: string;
      width: number;
      height: number;
    }) => {
      console.log(3333);
      setImageSrc(picUrl);
      setWidth(width);
      setheight(height);
      setVisible(true);
    };
    eventBus.on('ScreenshotManager:complete', handleComplete);

    // 清理
    return () => {
      eventBus.off('ScreenshotManager:complete', handleComplete);
    };
  }, []);

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
