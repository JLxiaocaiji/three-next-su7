import * as THREE from 'three';
import { gsap } from 'gsap';
import { PerlinNoise, clamp, isTouchDevice, randFloat } from '@/utils';
import { SpringCamera } from '@/classes/SpringCamera';

import { eventBus } from '@/utils/eventBus';

const DURATION = 0.3; // 单次动画时长
const LOCK_DURATION = DURATION * 2; // 互斥锁总时长（动画+延迟）

/**
 * 外部全局状态管理器
 */
// 视图状态枚举
enum ViewState {
  State1 = 1,
  State2 = 2,
  State3 = 3,
  State4 = 4,
}
const isInClickEffect = false;
let currentShowingState: Module = ViewState.State1;

let isTransitioning = true;

const scrollForward = (isForward: boolean) => {
  // 入口条件：不在点击效果中 且 未处于状态切换中
  if (isInClickEffect && !isTransitioning) {
    // 立即上锁，防止重复触发
    isTransitioning = true;

    // 创建GSAP时间线，控制互斥锁释放时机
    gsap
      .timeline()
      .to({}, { duration: DURATION }) // 占位动画（实际UI动画应在此处）
      .delay(DURATION) // 额外延迟0.3s
      .call(() => {
        // 动画完成后解锁
        isTransitioning = false;
      })
      .play();

    // 根据当前状态和方向执行状态转移
    switch (currentShowingState) {
      case ViewState.State1:
        currentShowingState = isForward ? ViewState.State2 : ViewState.State4;
        break;
      case ViewState.State2:
        currentShowingState = isForward ? ViewState.State3 : ViewState.State1;
        break;
      case ViewState.State3:
        currentShowingState = isForward ? ViewState.State4 : ViewState.State2;
        break;
      case ViewState.State4:
        currentShowingState = isForward ? ViewState.State1 : ViewState.State3;
        break;
    }

    eventBus.emit('UI-RightContent:changeModule', { module: currentShowingState });
  }
};

const TO = (t: THREE.Euler, n: THREE.Euler, r: number): THREE.Euler => {
  return n.set(
    THREE.MathUtils.lerp(0, t.x, r),
    THREE.MathUtils.lerp(0, t.y, r),
    THREE.MathUtils.lerp(0, t.z, r)
    // t.order
  );
};

const EO = (t: THREE.Euler, n: THREE.Euler) => {
  return t.set(t.x - n.x, t.y - n.y, t.z - n.z);
};

const MO = (t: THREE.Euler, n: THREE.Euler) => {
  return t.set(t.x + n.x, t.y + n.y, t.z + n.z);
};

const _A = (t: number, n: number, r: number) => {
  return ((t = Math.max(n, t)), (t = Math.min(r, t)), t);
};

// CameraController（相机控制器）
export class CameraManager {
  private enableClamp = true;
  private targetFov = 45;
  private springlengthOffset = 0;
  private lerpStrength = 1;
  private moveSpeed = [1, 1];
  private _currentLengthOffset = 0;
  private _springRotationZClampRange: [number, number] = [0.02, 0.3];
  private _springRotationYClampRange: [number, number] = [-100, 100];
  private _deltaRotation = new THREE.Euler();
  private _targetRotation = new THREE.Euler();
  private _targetSpringLength = 0;
  private _targetLookAt = new THREE.Vector3();
  private _button: number = -1;
  private _preLoc0 = new THREE.Vector2();
  private _preLoc1 = new THREE.Vector2();
  private _touchID: number = -1;

  public _springCamera: SpringCamera;
  public dom: HTMLCanvasElement;
  public _camera: THREE.PerspectiveCamera;

  public _enableControlCamera = false;
  private _lerpQuatStrength = 5;
  private _lerpLengthStrength = 3;
  private _mouseWheelSum = 0;

  private _tempVec21 = new THREE.Vector2(); // $u
  private _tempVec22 = new THREE.Vector2(); // $u

  private _tempEuler1 = new THREE.Euler(0, 0, 0); // Ev
  private _tempEuler2 = new THREE.Euler(0, 0, 0); // CO

  private _tempQuat1 = new THREE.Quaternion(); // Bd
  private _tempQuat2 = new THREE.Quaternion(); // xA

  constructor(springCamera: SpringCamera, dom: HTMLCanvasElement, camera: THREE.PerspectiveCamera) {
    this.dom = dom;
    this._springCamera = springCamera;
    this._camera = camera;
    this.reset();
    // this.bindEvents();
  }

  get lerpLengthStrength() {
    return this._lerpLengthStrength;
  }
  set lerpLengthStrength(r: number) {
    this._lerpLengthStrength = r;
  }

  get springLength() {
    return this._targetSpringLength;
  }
  set springLength(v: number) {
    this._targetSpringLength = v;
  }
  get enableControlCamera() {
    return this._enableControlCamera;
  }

  set enableControlCamera(r: boolean) {
    if (this._enableControlCamera === r) return;

    this._enableControlCamera = r;

    if (r) {
      if (isTouchDevice()) {
        this.dom.addEventListener('touchstart', this._onTouchStart);
        this.dom.addEventListener('touchmove', this._onTouchMove);
      } else {
        this.dom.addEventListener('pointerdown', this._onMouseDown);
        this.dom.addEventListener('pointerup', this._onMouseUp);
        this.dom.addEventListener('pointermove', this._onMouseMove);
      }

      this.dom.addEventListener('wheel', this._onMouseWheel);
      this.reset();
    } else {
      if (isTouchDevice()) {
        this.dom.removeEventListener('touchstart', this._onTouchStart);
        this.dom.removeEventListener('touchmove', this._onTouchMove);
      } else {
        this.dom.removeEventListener('pointerdown', this._onMouseDown);
        this.dom.removeEventListener('pointerup', this._onMouseUp);
        this.dom.removeEventListener('pointermove', this._onMouseMove);
      }
      this.dom.removeEventListener('wheel', this._onMouseWheel);
    }
  }

  reset() {
    this._button = -1;
    this._touchID = -1;
    this.springLength = this._springCamera.springLength;
    this._targetLookAt.copy(this._springCamera.lookAt);
    this._targetRotation.copy(this._springCamera.rotation);
    this._deltaRotation.set(0, 0, 0);
    this.targetFov = this._camera.fov;
  }

  private _onMouseDown = (e: PointerEvent) => {
    this._button = e.button;
    this._preLoc0.set(e.pageX, e.pageY);
  };

  private _onMouseUp = () => {
    this._button = -1;
  };

  private _onMouseMove = (e: PointerEvent) => {
    this._tempVec21.set(e.pageX, e.pageY);
    if (this._button === 0) {
      const d = this._preLoc0
        .clone()
        .sub(this._tempVec21)
        .multiplyScalar(this._springCamera.springLength * 0.001);
      this.updateDeltaRotation();
    }
    this._preLoc0.copy(this._tempVec21);
  };

  updateDeltaRotation() {
    this._deltaRotation.y += this._preLoc0.x * this.moveSpeed[0];
    this._deltaRotation.z -= this._preLoc0.y * this.moveSpeed[1];
  }

  private _onMouseWheel = (e: WheelEvent) => {
    e.preventDefault();
    this._mouseWheelSum += e.deltaY;
    if (this._mouseWheelSum > 200) {
      this._mouseWheelSum = 0;
      // this.springLength += 1;

      scrollForward(true);
    } else if (this._mouseWheelSum < -200) {
      this._mouseWheelSum = 0;
      scrollForward(false);
    }
  };

  private _onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this._preLoc0.set(t.pageX, t.pageY);
      this._touchID = t.identifier;
    }

    if (e.touches.length > 1) {
      const t = e.touches[1];
      this._preLoc1.set(t.pageX, t.pageY);

      console.log('preLoc1=' + Math.round(this._preLoc1.x) + '  ' + Math.round(this._preLoc1.y));
    }
  };

  private _onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1 || e.touches[0].identifier !== this._touchID) return;
    const t = e.touches[0];
    this._tempVec22.set(t.pageX, t.pageY);
    this._preLoc0.sub(this._tempVec22).multiplyScalar(this._springCamera.springLength * 0.0016);

    this.updateDeltaRotation();
    this._preLoc0.copy(this._tempVec22);
  };

  update(delta: number) {
    if (Math.abs(this._camera.fov - this.targetFov) > 0.01) {
      this._camera.fov = THREE.MathUtils.lerp(
        this._camera.fov,
        this.targetFov,
        this.lerpStrength * delta
      );
      this._camera.updateProjectionMatrix();
    }

    this._currentLengthOffset = THREE.MathUtils.lerp(
      this._currentLengthOffset,
      this.springlengthOffset,
      this.lerpStrength * delta
    );

    const finalLen = this._targetSpringLength + this._currentLengthOffset;

    this._springCamera.lookAt.lerp(this._targetLookAt, delta);
    this._springCamera.springLength = THREE.MathUtils.lerp(
      this._springCamera.springLength,
      finalLen,
      0.016 * this._lerpLengthStrength
    );

    // TO(this._deltaRotation, Ev, r * 10),
    TO(this._deltaRotation, this._tempEuler1, delta * 10);

    // EO(this._deltaRotation, Ev),
    EO(this._deltaRotation, this._tempEuler1);

    // MO(this._targetRotation, Ev)
    MO(this._targetRotation, this._tempEuler1);

    this._tempQuat1.setFromEuler(this._targetRotation);
    this._targetRotation.setFromQuaternion(this._tempQuat1, 'YZX');

    if (this.enableClamp) {
      // _A
      this._targetRotation.z = THREE.MathUtils.clamp(
        this._targetRotation.z,
        this._springRotationZClampRange[0],
        this._springRotationZClampRange[1]
      );

      this._targetRotation.y = THREE.MathUtils.clamp(
        this._targetRotation.y,
        this._springRotationYClampRange[0],
        this._springRotationYClampRange[1]
      );
    }

    this._tempQuat1.setFromEuler(this._springCamera.rotation);
    this._tempQuat2.setFromEuler(this._targetRotation);

    this._tempQuat1.slerp(this._tempQuat2, delta * this._lerpQuatStrength);

    this._springCamera.rotation.copy(this._tempEuler2.setFromQuaternion(this._tempQuat1, 'YZX'));
  }

  gotoPOI(
    targetLookAt: THREE.Vector3,
    springLength: number,
    rotation: THREE.Euler,
    duration: number = 1.5,
    easing: string = 'power2.inOut',
    delay: number = 0
  ) {
    return new Promise((resolve, reject) => {
      gsap.killTweensOf(this);

      // 2. 原源码在持续时间（duration）结束后触发 reset
      gsap.delayedCall(duration, () => {
        this.reset();
      });

      // 3. 安全调用子相机（弹簧相机）的 gotoPOI 方法
      if (this._springCamera != null) {
        this._springCamera
          .gotoPOI(targetLookAt, springLength, rotation, duration, easing, delay)
          .then(() => {
            resolve(true);
          });
      } else {
        resolve(false);
      }
    });
  }

  public setNewTarget(
    targetLookAt: THREE.Vector3,
    springLength: number,
    targetRotation: THREE.Euler
  ): void {
    this.reset();

    // 旋转插值强度先设为 0
    this._lerpQuatStrength = 0;

    gsap.killTweensOf(this);
    gsap.to(this, {
      _lerpQuatStrength: 5,
      duration: 1,
      ease: 'none',
    });

    this.springLength = springLength;
    this._targetLookAt.copy(targetLookAt);
    this._targetRotation.copy(targetRotation);
  }

  public setNewRange(
    zRange: [number, number] = [0.02, 0.3],
    yRange: [number, number] = [-100, 100]
  ): void {
    this._springRotationZClampRange = zRange;
    this._springRotationYClampRange = yRange;
  }

  private bindEvents() {
    this.dom.addEventListener('pointerdown', this._onMouseDown);
    this.dom.addEventListener('pointerup', this._onMouseUp);
    this.dom.addEventListener('pointermove', this._onMouseMove);
    this.dom.addEventListener('wheel', this._onMouseWheel);
    this.dom.addEventListener('touchstart', this._onTouchStart);
    this.dom.addEventListener('touchmove', this._onTouchMove);
  }
}
