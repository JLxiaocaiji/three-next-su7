import mitt from 'mitt';

type Module = 0 | 1 | 2 | 3 | 4;

type Events = {
  'Store:returnModule': { module: Module };

  // UI 切换模块
  'UI-RightContent:changeModule': { module: Module };

  // UI 发送给 ScreenshotManager 的指令
  'ScreenshotManager:show': { duration?: number };
  'ScreenshotManager:hide': { duration?: number };
  'ScreenshotManager:screenshot': void;
  'ScreenshotManager:complete': { picUrl: string; width: number; height: number; visible: boolean };

  // ScreenshotManager 反馈给 UI 的状态
  'ScreenshotManager:status': { isSaving: boolean; picUrl?: string };

  // 点击 / 按压屏幕
  clickEffect: { isclickEffect: boolean };

  // CarMotionManager
  'CarMotionManager:getCurrentModule': void;
};

export const eventBus = mitt<Events>();
