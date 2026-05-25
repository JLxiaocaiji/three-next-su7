import { Howl } from 'howler';
import gsap from 'gsap';

/**
 * Vercel Blob 音乐上传

创建 Vercel Blob 存储
登录 Vercel 控制台
进入你的项目 → 点击 Storage 标签
点击 Create Database → 选择 Blob
选择离你最近的区域 → 点击 Create
Vercel 会自动为你添加 BLOB_READ_WRITE_TOKEN 环境变量

拉取环境变量到本地
bash 运行
vercel env pull .env.local

实现文件删除功能
限制单个用户的上传数量和总容量
添加文件病毒扫描（使用第三方服务）
对上传的文件进行重命名，避免路径遍历攻击

1. 永远不要在客户端暴露 BLOB_READ_WRITE_TOKEN
这个令牌拥有完全的读写权限，泄露会导致严重的安全问题
始终使用 generateClientTokenFromReadWriteToken 生成临时的、权限受限的客户端令牌
客户端令牌可以限制：文件前缀、有效期、允许的文件类型、最大文件大小
2. 生产环境中不要在客户端直接使用 list() 方法
list() 方法需要读写令牌
应该通过服务器端 API 路由来获取文件列表，这样可以：
添加用户认证
过滤用户只能看到自己上传的文件
实现分页和搜索功能
3. 添加用户认证
在生产环境中，务必添加用户认证（如 NextAuth.js）
只有登录用户才能上传和删除文件
每个用户只能管理自己上传的文件

生产环境优化:
前端和后端部署在不同的域名，需要在 Vercel Blob 控制台配置 CORS 规则
Vercel Blob 默认缓存文件 1 个月，在上传时自定义缓存时间
 */

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
