import mitt from 'mitt';

type Events = {
  // UI 切换模块
  'UI-RightContent:changeModule': { module: number };

  // UI 发送给 ScreenshotManager 的指令
  'ScreenshotManager:show': { duration?: number };
  'ScreenshotManager:hide': { duration?: number };
  'ScreenshotManager:screenshot': undefined;
  'ScreenshotManager:complete': { picUrl: string; width: number; height: number };

  // ScreenshotManager 反馈给 UI 的状态
  'ScreenshotManager:status': { isSaving: boolean; picUrl?: string };

  // 点击 / 按压屏幕
  clickEffect: { isclickEffect: boolean };
};

export const eventBus = mitt<Events>();
