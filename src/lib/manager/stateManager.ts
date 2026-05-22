import gsap from 'gsap';
import { EventEmitter } from 'events';

/**
 * 色彩编辑器完整视图生命周期状态
 * 数值严格匹配原混淆代码编译结果
 */
export enum SceneState {
  /** 页面初始化/资源加载中 */
  Loading = 0,
  /** 初始入场动画执行中 */
  BeginAnim = 1,
  /** 核心状态1 */
  State1 = 2,
  /** 核心状态2 */
  State2 = 3,
  /** 核心状态3 */
  State3 = 4,
  /** 核心状态4 */
  State4 = 5,
  /** 扩展状态 */
  State5 = 6,
}

/**
 * 颜色表类型枚举
 */
export enum ColorTableType {
  /** 系统预设颜色表 */
  Preset = 0,
  /** 用户自定义颜色表 */
  Custom = 1,
}

/** 全局事件常量 */
export const EVENTS = {
  UPDATE_SHOWING_STATE: 'UPDATESHOWINGSTATE' as const,
  STATE_CHANGED: 'stateChanged' as const,
  INIT_COMPLETE: 'initComplete' as const,
} as const;

/** 动画配置常量 */
export const ANIMATION_CONFIG = {
  /** 单次状态切换动画时长 */
  TRANSITION_DURATION: 0.3,
  /** 互斥锁额外延迟 */
  LOCK_RELEASE_DELAY: 0.3,
  /** 初始入场动画时长 */
  ENTRY_ANIMATION_DURATION: 0.5,
} as const;

/**
 * 全局状态管理器
 */
export class StateManager {
  // 加载相关
  public readonly LOADING = 'loading';
  public readonly PRELOADED = 'preloaded';

  // 状态相关
  public readonly UPDATE_SHOWING_STATE = 'updateShowingState';
  public readonly CLICK_EFFECT = 'clickEffect';

  // 颜色相关
  public readonly CHANGE_COLOR = 'changeColor';

  // 音频相关
  public readonly PLAY_SFX = 'playSFX';
  public readonly PLAY_BGM = 'playBGM';
  public readonly FADE_BGM = 'fadeBGM';
  public readonly MUTE = 'mute';

  // 屏幕截图相关
  public readonly SCREENSHOT = 'screenshot';

  // 核心状态本地副本
  private _isInClickEffect = false;
  private _currentShowingState = 0;
  private _currentColorIndex = '00';
  private _currentColorTableState = 0;

  // Getter（只读访问）
  get currentShowingState() {
    return this._currentShowingState;
  }
  get isInClickEffect() {
    return this._isInClickEffect;
  }
  get currentColorIndex() {
    return this._currentColorIndex;
  }
  get currentColorTableState() {
    return this._currentColorTableState;
  }

  /**
   * 重置事件中心并绑定状态同步监听器
   * 注意：原代码存在问题！每次调用reset都会重复添加监听器，导致内存泄漏
   */
  reset() {
    // 监听视图状态更新事件，同步本地状态
    this.on(this.UPDATE_SHOWING_STATE, (state: number) => {
      this._currentShowingState = state;
    });

    // 监听点击效果状态事件，同步本地状态
    this.on(this.CLICK_EFFECT, (isActive: boolean) => {
      this._isInClickEffect = isActive;
    });

    // 监听颜色变更事件，同步本地状态并更新全局警察颜色标志
    this.on(this.CHANGE_COLOR, (colorIndex: string) => {
      this._currentColorIndex = colorIndex;
      // 特殊逻辑：索引"11"对应警察配色模式
      GlobalState.u_policeColorChange.value = colorIndex === '11' ? 1 : 0;
    });

    // 监听颜色表状态更新事件，同步本地状态
    this.on(this.UPDATE_COLOR_TABLE_STATE, (state: number) => {
      this._currentColorTableState = state;
    });

    // 监听预加载完成事件，自动进入BeginAnim状态
    this.on(this.PRELOADED, () => {
      this.emit(this.UPDATE_SHOWING_STATE, 1); // 1 = EditorViewState.BeginAnim
    });
  }
}
