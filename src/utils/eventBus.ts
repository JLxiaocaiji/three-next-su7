import mitt from 'mitt';
import * as THREE from 'three';

type Module = 0 | 1 | 2 | 3 | 4 | 5;

enum ColorParamType {
  preset = 0,
  custom = 1,
}

type Events = {
  // 改变模块
  ChangeModule: { module: Module };
  // 获取当前模块
  GetCurrentModule: { module: Module };

  // 点击 / 按压屏幕
  SetClickEffect: { isClickEffect: boolean };
  // 获取当前是否处于点击状态
  GetClickEffect: { isClickEffect: boolean };

  // 请求颜色列表
  RequestColorList: void;
  // 返回颜色列表
  ReturnColorList: Map<string, ColorThemeItem | CustomColor>;

  // 颜色切换
  ChangeColor?: string;
  // 改变UI颜色参数
  ChangeUIColorParam: { paramType: ColorParamType };

  // 开场动画相关

  /**
   * 场景1相关
   */
  /**
   * 场景2相关
   */
  /**
   * 场景3相关
   */
  /**
   * 场景4相关
   */
  /**
   * 场景5相关
   */
  'ChangeColor:ChangeColorParam': CustomColor;
  'ChangeColor:SetColor': { col: THREE.Color };

  // UI 发送给 ScreenshotManager 的指令
  'ScreenshotManager:show': { duration?: number };
  'ScreenshotManager:hide': { duration?: number };
  'ScreenshotManager:screenshot': void;
  'ScreenshotManager:complete': { picUrl: string; width: number; height: number; visible: boolean };
  // ScreenshotManager 反馈给 UI 的状态
  'ScreenshotManager:status': { isSaving: boolean; picUrl?: string };
};

export const eventBus = mitt<Events>();
