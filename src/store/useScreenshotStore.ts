import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { eventBus } from '@/utils/eventBus';

import { SceneManager } from '@/lib/manager/sceneManager';

interface State {
  screenshot: {
    picUrl: string;
    width: number;
    height: number;
    visible: boolean;
  };
  setScreenshotVisible: (visible: boolean) => void;
  setScreenshot: (picUrl: string, width: number, height: number, visible: boolean) => void;
  cleanup: () => void;
}

export const useScreenshotStore = create<State>()(
  immer((set, get) => {
    // 截图相关
    const completeScreenShot = (screenshot: {
      picUrl: string;
      width: number;
      height: number;
      visible: boolean;
    }) => {
      set((state) => {
        state.screenshot = screenshot;
      });
    };

    const hideScreenshot = () => {
      set((state) => {
        state.screenshot.visible = false;
      });
    };

    const showScreenshot = () => {
      set((state) => {
        const sceneManager = SceneManager.getInstance();
        sceneManager!.screenshot();
        // state.screenshot.visible = true;
      });
    };

    eventBus.off('ScreenshotManager:complete', completeScreenShot);
    eventBus.off('ScreenshotManager:hide', hideScreenshot);
    eventBus.off('ScreenshotManager:screenshot', showScreenshot);

    eventBus.on('ScreenshotManager:complete', completeScreenShot);
    eventBus.on('ScreenshotManager:hide', hideScreenshot);
    eventBus.on('ScreenshotManager:screenshot', showScreenshot);

    return {
      user: { name: '' },
      // 状态
      currentModule: 0,

      screenshot: { picUrl: '', width: 0, height: 0, visible: false },

      // 截图相关
      setScreenshot: (picUrl: string, width: number, height: number, visible: boolean) =>
        set((state) => {
          state.screenshot = {
            picUrl,
            width,
            height,
            visible,
          };
        }),
      setScreenshotVisible: (visible: boolean) =>
        set((state) => {
          state.screenshot.visible = visible;
        }),

      cleanup: () => {
        eventBus.off('ScreenshotManager:complete', completeScreenShot);
        eventBus.off('ScreenshotManager:hide', hideScreenshot);
        eventBus.off('ScreenshotManager:screenshot', showScreenshot);
      },
    };
  })
);

export const useScreenshot = () => useScreenshotStore((state) => state.screenshot);
