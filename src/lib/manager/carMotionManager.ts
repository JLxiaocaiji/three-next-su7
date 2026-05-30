import * as THREE from 'three';
import { sceneConfig } from './constantsConfig';
import { CameraManager } from './cameraManager';

import { eventBus } from '@/utils/eventBus';

/**
 * 车轮 + 速度控制
 */
export class CarMotionManager {
  // 内部状态
  private _wheels: THREE.Object3D | null = null;
  private _targetVelocity: number = 0;
  private _currentVelocity: number = 0;
  private _lerpStrength: number = 1;
  private _cameraManager: CameraManager; // 弹簧相机控制器
  private tempVec3: THREE.Vector3 = new THREE.Vector3();

  private currentModule: Module = 0;

  public u_floorUVOffset: { value: THREE.Vector2 } | null = null;
  public u_speedUpBackgroundValue: { value: number } | null = null;

  // 传入：车轮根节点、弹簧相机实例
  constructor(carModelCache: THREE.Group, springCameraOB: CameraManager) {
    this._cameraManager = springCameraOB;

    if (!carModelCache.children.length) return;
    this._wheels =
      carModelCache.children[0].children.find((item: THREE.Object3D) => item.name === 'Wheel') ||
      null;

    this.u_floorUVOffset = { value: sceneConfig.u_floorUVOffset.value };
    this.u_speedUpBackgroundValue = { value: sceneConfig.u_speedUpBackgroundValue.value };

    this.getCurrentModule();
  }

  // 设置目标速度
  set targetVelocity(v: number) {
    this._targetVelocity = v;
  }

  // 设置插值强度
  set lerpStrength(v: number) {
    this._lerpStrength = v;
  }

  async getCurrentModule(module?: Module) {
    if (module) {
      this.currentModule = module;
      return;
    }
    // const temp = await new Promise<Module | null>((resolve) => {
    //   // 1. 监听返回事件
    //   eventBus.on('GetCurrentModule', ({ module: module }: { module: Module }) => {
    //     resolve(module);
    //   });
    // });

    // this.currentModule = temp || 0;
  }

  // 每帧更新（对应原 update）
  update(deltaTime: number) {
    // 平滑插值速度
    this._currentVelocity = THREE.MathUtils.lerp(
      this._currentVelocity,
      this._targetVelocity,
      deltaTime * this._lerpStrength
    );

    if (!this._wheels || !this.u_floorUVOffset || !this.u_speedUpBackgroundValue) return;

    // 旋转所有车轮
    for (const wheel of this._wheels.children) {
      wheel.rotateZ(((-this._currentVelocity * deltaTime) / (Math.PI * 0.737774)) * 2 * Math.PI);
    }

    // 地面 UV 滚动（模拟路面后退）
    this.u_floorUVOffset.value.x += this._currentVelocity * deltaTime;

    // 背景加速效果值
    let speedUpBackgroundValue = this.u_speedUpBackgroundValue.value;

    //
    if (this.currentModule === 0) {
      speedUpBackgroundValue = THREE.MathUtils.lerp(
        speedUpBackgroundValue,
        this._currentVelocity,
        deltaTime * 2
      );
    } else {
      speedUpBackgroundValue = THREE.MathUtils.lerp(speedUpBackgroundValue, 0, deltaTime * 5);
    }

    this.u_speedUpBackgroundValue.value = speedUpBackgroundValue;

    this.tempVec3.set(1, 1, 1).multiplyScalar(speedUpBackgroundValue / 5);
    this._cameraManager._springCamera.positionScale.copy(this.tempVec3);

    //  速度足够大时显示加速特效
    sceneConfig.sm_speedup.visible = speedUpBackgroundValue >= 0.1;
  }
}
