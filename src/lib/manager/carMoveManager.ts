import * as THREE from 'three';

// 工具函数：线性插值（对应原 rl）
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// 你的全局着色器变量/材质（对应原 Ae）
// 请根据你项目实际对象替换
const GlobalMaterial = {
  u_floorUVOffset: { value: new THREE.Vector2(0, 0) },
  u_speedUpBackgroundValue: { value: 0 },
  sm_speedup: { visible: false }, // 加速特效模型
};

// 事件/状态枚举（对应原 Ie、Bn）
const GameState = {
  State1: 'State1',
};
const CurrentState = {
  currentShowingState: '',
};

/**
 * 车轮 + 速度控制器（对应原 $O 类）
 */
export class CarMoveManager {
  // 内部状态
  private _wheels: THREE.Object3D | null = null;
  private _targetVelocity = 0;
  private _currentVelocity = 0;
  private _lerpStrength = 1;
  private _springCameraOB: any; // 你的弹簧相机控制器

  // 传入：车轮根节点、弹簧相机实例
  constructor(modelRoot: THREE.Object3D, springCameraOB: any) {
    this._springCameraOB = springCameraOB;
    this.findWheels(modelRoot);
  }

  // 找到名为 "Wheel" 的车轮模型
  private findWheels(modelRoot: THREE.Object3D) {
    if (!modelRoot.children.length) return;
    const child = modelRoot.children[0];
    this._wheels = child.children.find((item: any) => item.name === 'Wheel') || null;
  }

  // 设置目标速度
  set targetVelocity(v: number) {
    this._targetVelocity = v;
  }

  // 设置插值强度
  set lerpStrength(v: number) {
    this._lerpStrength = v;
  }

  // 每帧更新（对应原 update）
  update(deltaTime: number) {
    // 1. 平滑插值速度
    this._currentVelocity = lerp(
      this._currentVelocity,
      this._targetVelocity,
      deltaTime * this._lerpStrength
    );

    // 2. 旋转所有车轮
    if (this._wheels) {
      for (const wheel of this._wheels.children) {
        wheel.rotateZ(((-this._currentVelocity * deltaTime) / (Math.PI * 0.737774)) * 2 * Math.PI);
      }
    }

    // 3. 地面 UV 滚动（模拟路面后退）
    GlobalMaterial.u_floorUVOffset.value.x += this._currentVelocity * deltaTime;

    // 4. 背景加速效果值
    let speed = GlobalMaterial.u_speedUpBackgroundValue.value;

    // 根据状态决定加速值
    if (CurrentState.currentShowingState === GameState.State1) {
      speed = lerp(speed, this._currentVelocity, deltaTime * 2);
    } else {
      speed = lerp(speed, 0, deltaTime * 5);
    }

    GlobalMaterial.u_speedUpBackgroundValue.value = speed;

    // 5. 控制相机震动强度（速度越快，震动越大）
    const shakeScale = new THREE.Vector3(1, 1, 1).multiplyScalar(speed / 5);
    if (this._springCameraOB?._springCamera) {
      this._springCameraOB._springCamera.positionScale.copy(shakeScale);
    }

    // 6. 速度足够大时显示加速特效
    GlobalMaterial.sm_speedup.visible = speed >= 0.1;
  }
}
