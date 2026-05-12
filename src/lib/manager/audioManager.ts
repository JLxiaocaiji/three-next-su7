import { Howl } from 'howler';
import gsap from 'gsap';

// 定义状态枚举
enum InteractionState {
  DYNAMICS = 'State1',
  ACTION = 'State2',
  SCAN = 'State3',
}

export class AudioManager {
  private sound: Howl;
  private beatID: number = -1;
  private bubuID: number = -1;
  private scanID: number = -1;
  private isScanning: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    // 1. 初始化音频精灵
    this.sound = new Howl({
      src: ['res/audios/bgm2.mp3'],
      sprite: {
        melody: [0, 14534, true],
        beat: [14535, 10900, true],
        click: [25500, 370],
        scan0: [26000, 734, true],
        scan1: [26867, 734],
        ka: [27700, 367],
        bubu: [28200, 1300, true],
        boom: [30000, 2000], // 假设补全
      },
    });
  }

  // 播放背景 BGM 组合
  public playBGM() {
    this.sound.play('melody');
    this.beatID = this.sound.play('beat');
    this.bubuID = this.sound.play('bubu');

    // 初始时将 bubu 层静音
    this.sound.volume(0, this.bubuID);
  }

  /**
   * 处理交互状态改变 (核心逻辑还原)
   * @param isPressed 是否按下
   * @param state 当前交互状态
   */
  public onStateChanged(isPressed: boolean, state: InteractionState) {
    // 清理当前所有音量的补间动画，防止冲突
    gsap.killTweensOf(this.sound);

    switch (state) {
      case InteractionState.DYNAMICS:
        this.handleDynamicsState(isPressed);
        break;
      case InteractionState.ACTION:
        this.handleActionState(isPressed);
        break;
      case InteractionState.SCAN:
        this.handleScanState(isPressed);
        break;
    }
  }

  private handleDynamicsState(isPressed: boolean) {
    if (isPressed) {
      // 延时 1 秒淡入 bubu 环境音
      gsap.delayedCall(1, () => {
        this.sound.fade(this.sound.volume(this.bubuID), 0.8, 1000, this.bubuID);
      });
      // 节奏层降温
      this.sound.fade(this.sound.volume(this.beatID), 0.3, 1000, this.beatID);
    } else {
      // 恢复常规 BGM 状态
      this.sound.fade(this.sound.volume(this.beatID), 1.0, 1000, this.beatID);
      this.sound.fade(this.sound.volume(this.bubuID), 0.0, 1000, this.bubuID);
    }
  }

  private handleActionState(isPressed: boolean) {
    if (isPressed) {
      // 延时 0.3 秒播放特定的冲击音
      gsap.delayedCall(0.3, () => this.sound.play('boom'));
    }
  }

  private handleScanState(isPressed: boolean) {
    if (isPressed) {
      gsap.delayedCall(0.3, () => {
        this.scanID = this.sound.play('scan0');
        this.isScanning = true;
      });
    } else if (this.isScanning) {
      this.isScanning = false;
      this.sound.stop(this.scanID);
      this.sound.play('scan1'); // 播放扫描结束音
    }
  }

  public destroy() {
    this.sound.stop();
    this.sound.unload();
  }
}
