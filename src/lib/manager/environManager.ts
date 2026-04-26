import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * 原生 Three.js 双环境贴图控制器
 * 移除自定义Viewer，直接操作 THREE.Scene
 * 功能：环境贴图强度/混合权重 GSAP 平滑动画
 */
export class EnvironmentManager {
  // 私有属性
  private readonly scene: THREE.Scene;
  private readonly envMap0: THREE.Texture | THREE.CubeTexture;
  private readonly envMap1: THREE.Texture | THREE.CubeTexture;

  // 动画控制参数（对应原自定义节点的 intensity/weight）
  private envParams = {
    intensity: 0,
    weight: 0,
  };

  /**
   * 构造函数（直接传入 Three.js 场景 + 两张环境贴图）
   * @param scene Three.js 场景对象
   * @param envMap0 主环境贴图
   * @param envMap1 混合环境贴图
   */
  constructor(
    scene: THREE.Scene,
    envMap0: THREE.Texture | THREE.CubeTexture,
    envMap1: THREE.Texture | THREE.CubeTexture
  ) {
    this.scene = scene;
    this.envMap0 = envMap0;
    this.envMap1 = envMap1;

    // 初始化：默认使用第一张环境贴图
    this.initEnvironment();
  }

  /**
   * 初始化场景环境
   */
  private initEnvironment(): void {
    // 初始状态：关闭强度，权重0（仅使用envMap0）
    this.envParams.intensity = 0;
    this.envParams.weight = 0;
    // 赋值给场景全局环境（PBR 材质反射核心）
    this.scene.environment = this.envMap0;
  }

  /**
   * 更新环境贴图（根据权重自动切换）
   */
  private updateEnvMap(): void {
    // weight=0 → 使用 envMap0；weight=1 → 使用 envMap1
    this.scene.environment = this.envParams.weight === 0 ? this.envMap0 : this.envMap1;
  }

  /**
   * 设置环境状态（GSAP 平滑动画）
   * @param state 0=关闭 | 1=仅主环境 | 2=混合双环境
   * @param duration 动画时长 默认1s
   * @param ease 缓动函数 默认三次方缓入缓出
   * @param intensity 环境光强度 默认1
   */
  setState(
    state: 0 | 1 | 2,
    duration: number = 1,
    ease: string = 'power3.inOut',
    intensity: number = 1
  ): void {
    // 停止旧动画，防止冲突
    gsap.killTweensOf(this.envParams);

    // 定义动画目标值
    let targetParams: { intensity: number; weight: number };

    switch (state) {
      // 状态0：完全关闭环境
      case 0:
        targetParams = { intensity: 0, weight: 0 };
        break;
      // 状态1：启用主环境贴图（envMap0）
      case 1:
        targetParams = { intensity: intensity, weight: 0 };
        break;
      // 状态2：启用混合环境贴图（envMap1）
      case 2:
        targetParams = { intensity: intensity, weight: 1 };
        break;
    }

    // GSAP 动画 + 实时更新场景环境
    gsap.to(this.envParams, {
      duration,
      ease,
      ...targetParams,
      // 动画每一帧更新环境贴图
      onUpdate: () => this.updateEnvMap(),
    });
  }

  /**
   * 获取当前环境参数
   */
  public getEnvParams(): { intensity: number; weight: number } {
    return { ...this.envParams };
  }
}
