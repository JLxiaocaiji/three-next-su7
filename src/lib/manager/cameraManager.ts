import * as THREE from 'three';
import { gsap } from 'gsap';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PerlinNoise, clamp, isTouchDevice, randFloat } from '@/utils';
import { SpringCamera } from '@/classes/SpringCamera';

import { eventBus } from '@/utils/eventBus';

const DURATION = 0.3; // 单次动画时长

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

const TO = (t: THREE.Euler, n: THREE.Euler, r: number): THREE.Euler => {
  // return n.set(
  //   THREE.MathUtils.lerp(0, t.x, r),
  //   THREE.MathUtils.lerp(0, t.y, r),
  //   THREE.MathUtils.lerp(0, t.z, r)
  //   // t.order
  // );

  n.x = THREE.MathUtils.lerp(n.x, t.x, r);
  n.y = THREE.MathUtils.lerp(n.y, t.y, r);
  n.z = THREE.MathUtils.lerp(n.z, t.z, r);
  return n;
};

const EO = (t: THREE.Euler, n: THREE.Euler) => {
  // return t.set(t.x - n.x, t.y - n.y, t.z - n.z);
  t.x -= n.x;
  t.y -= n.y;
  t.z -= n.z;
};

const MO = (t: THREE.Euler, n: THREE.Euler) => {
  // return t.set(t.x + n.x, t.y + n.y, t.z + n.z);
  t.x += n.x;
  t.y += n.y;
  t.z += n.z;
};

const _A = (t: number, n: number, r: number) => {
  return ((t = Math.max(n, t)), (t = Math.min(r, t)), t);
};

// CameraController（相机控制器）
export class CameraManager {
  private enableClamp = true;
  public targetFov = 45;
  private springlengthOffset = 0;
  private lerpStrength = 1;
  private moveSpeed = [1, 1];
  private _currentLengthOffset = 0;
  private _springRotationZClampRange: [number, number] = [-Infinity, Infinity]; // [0.02, 0.3]
  private _springRotationYClampRange: [number, number] = [-Infinity, Infinity]; // [-100, 100]
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
  private isAnimatingPOI = false; // 是否正在POI
  public _lerpQuatStrength = 5;
  private _lerpLengthStrength = 3;
  private _mouseWheelSum = 0;

  private isInClickEffect = false;
  private currentShowingState: Module = ViewState.State1;
  private isTransitioning = true;

  private orbitControls: OrbitControls;
  // 控制模式
  private controlMode: 'spring' | 'orbit' = 'spring';

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

    this.orbitControls = new OrbitControls(this._camera, this.dom);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.enabled = false;

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

  set _springlengthOffset(v: number) {
    this.springlengthOffset = v;
  }

  set _lerpStrength(v: number) {
    this.lerpStrength = v;
  }

  set _moveSpeed(v: [number, number]) {
    this.moveSpeed = v;
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

  // 切换控制模式
  public switchToOrbitMode(): void {
    if (this.controlMode === 'orbit') return;

    this.controlMode = 'orbit';
    this.enableControlCamera = false;
    this.orbitControls.enabled = true;
    this._springCamera.enabled = false;

    // 将当前相机状态同步到OrbitControls
    this.orbitControls.target.copy(this._springCamera.lookAt);
    this._camera.position.copy(this._springCamera.targetCameraPosition);
    this.orbitControls.update();
  }

  public switchToSpringMode(): void {
    if (this.controlMode === 'spring') return;

    this.controlMode = 'spring';
    this.orbitControls.enabled = false;
    this._enableControlCamera = true;
    this._springCamera.enabled = true;

    // 将OrbitControls的状态同步回弹簧相机
    const target = this.orbitControls.target.clone();
    const distance = this._camera.position.distanceTo(target);

    this.reset();
    this._targetLookAt.copy(target);
    this._targetSpringLength = distance;

    // 从相机位置计算旋转
    const direction = this._camera.position.clone().sub(target).normalize();
    const rotation = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction),
      'YZX'
    );
    this._targetRotation.copy(rotation);
  }

  reset() {
    this._button = -1;
    this._touchID = -1;
    this._targetSpringLength = this._springCamera.springLength;
    this._targetLookAt.copy(this._springCamera.lookAt);
    this._targetRotation.copy(this._springCamera.rotation);
    this._deltaRotation.set(0, 0, 0);

    this._tempEuler1.set(0, 0, 0);
    this.targetFov = this._camera.fov;
    this.isAnimatingPOI = false;

    if (this.controlMode === 'spring') {
      this._springCamera.enabled = true;
    }
  }

  private _onMouseDown = (e: PointerEvent) => {
    console.log('mouse down');
    this._button = e.button;
    this._preLoc0.set(e.pageX, e.pageY);
  };

  private _onMouseUp = () => {
    console.log('mouse up');
    this._button = -1;
  };

  private _onMouseMove = (e: PointerEvent) => {
    console.log('mouse move');
    this._tempVec21.set(e.pageX, e.pageY);
    if (this._button === 0) {
      let delta = this._preLoc0
        .clone()
        .sub(this._tempVec21)
        .multiplyScalar(this._springCamera.springLength * 0.001);
      this.updateDeltaRotation(delta);
    }
    this._preLoc0.copy(this._tempVec21);
  };

  updateDeltaRotation(delta: THREE.Vector2) {
    this._deltaRotation.y += delta.x * this.moveSpeed[0];
    this._deltaRotation.z -= delta.y * this.moveSpeed[1];
  }

  private _onMouseWheel = (e: WheelEvent) => {
    console.log('mouse wheel');
    e.preventDefault();
    this._mouseWheelSum += e.deltaY;
    if (this._mouseWheelSum > 200) {
      this.scrollForward(true);
      this._mouseWheelSum = 0;
    } else if (this._mouseWheelSum < -200) {
      this.scrollForward(false);
      this._mouseWheelSum = 0;
    }
  };

  private _onTouchStart = (e: TouchEvent) => {
    console.log('touch start');
    if (e.touches.length === 1) {
      this._preLoc0.set(e.touches[0].pageX, e.touches[0].pageY);
      this._touchID = e.touches[0].identifier;
    }

    if (e.touches.length > 1) {
      const t = e.touches[1];
      this._preLoc1.set(e.touches[1].pageX, e.touches[1].pageY);

      console.log('preLoc1=' + Math.round(this._preLoc1.x) + '  ' + Math.round(this._preLoc1.y));
    }
  };

  private _onTouchMove = (e: TouchEvent) => {
    console.log('touch move');
    if (e.touches.length !== 1 || e.touches[0].identifier !== this._touchID) return;
    const t = e.touches[0];
    this._tempVec22.set(t.pageX, t.pageY);
    let delta = this._preLoc0
      .clone()
      .sub(this._tempVec22)
      .multiplyScalar(this._springCamera.springLength * 0.0016);

    this.updateDeltaRotation(delta);
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

    if (this.controlMode === 'orbit') {
      this.orbitControls.update();
      return;
    } else {
      this._springCamera.update(delta);
    }

    if (this.isAnimatingPOI) {
      return;
    }

    this._currentLengthOffset = THREE.MathUtils.lerp(
      this._currentLengthOffset,
      this.springlengthOffset,
      this.lerpStrength * delta
    );

    const finalLen = this._targetSpringLength + this._currentLengthOffset;

    this._springCamera.lookAt.lerp(this._targetLookAt, delta * 5);
    this._springCamera.springLength = THREE.MathUtils.lerp(
      this._springCamera.springLength,
      finalLen,
      delta * this._lerpLengthStrength
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
    switchToOrbitAfter: boolean = true, // 动画完成后是否切换到OrbitControls
    easing: string = 'power2.inOut',
    delay: number = 0
  ) {
    return new Promise((resolve, reject) => {
      gsap.killTweensOf(this);
      if (this._springCamera) {
        gsap.killTweensOf(this._springCamera);
        gsap.killTweensOf(this._springCamera.lookAt);
      }

      this.isAnimatingPOI = true;

      this.orbitControls.enabled = false;
      this.controlMode = 'spring';

      const prevEnableControl = this._enableControlCamera;
      this._enableControlCamera = false;

      if (this._springCamera != null) {
        const targetRotYZX = new THREE.Euler().copy(rotation).reorder('YZX');
        this._springCamera
          .gotoPOI(targetLookAt, springLength, targetRotYZX, duration, easing, delay)
          .then(() => {
            this.reset();
            this._enableControlCamera = prevEnableControl;
            this.isAnimatingPOI = false;

            if (switchToOrbitAfter) {
              this.switchToOrbitMode();
            }
            resolve(true);
          });
      } else {
        this.isAnimatingPOI = false;
        resolve(false);
      }
    });
  }

  public setNewTarget(
    targetLookAt: THREE.Vector3,
    springLength: number,
    targetRotation: THREE.Euler
  ): void {
    gsap.killTweensOf(this);
    if (this._springCamera) {
      gsap.killTweensOf(this._springCamera);
      gsap.killTweensOf(this._springCamera.lookAt);
    }

    this._button = -1;
    this._touchID = -1;
    this._deltaRotation.set(0, 0, 0);
    this._tempEuler1.set(0, 0, 0);

    this.isAnimatingPOI = true;
    this.switchToSpringMode();

    const startLookAt = this._springCamera.lookAt.clone();
    const startLength = this._springCamera.springLength;
    const startQuat = new THREE.Quaternion().setFromEuler(this._springCamera.rotation);

    // 统一使用 YZX 旋转顺序
    const targetRotYZX = new THREE.Euler().copy(targetRotation).reorder('YZX');
    const endQuat = new THREE.Quaternion().setFromEuler(targetRotYZX);

    const transitionObj = { progress: 0 };

    gsap.to(transitionObj, {
      progress: 1,
      duration: 1.0,
      ease: 'power2.out', // 平滑的淡出曲线
      onUpdate: () => {
        const t = transitionObj.progress;

        // 平滑插值 LookAt 目标点
        this._springCamera.lookAt.lerpVectors(startLookAt, targetLookAt, t);

        // 平滑插值弹簧长度
        this._springCamera.springLength = THREE.MathUtils.lerp(startLength, springLength, t);

        // 四元数球面插值（slerp）旋转，避免万向节死锁或多圈旋转突变
        this._tempQuat1.copy(startQuat).slerp(endQuat, t);
        this._springCamera.rotation.setFromQuaternion(this._tempQuat1, 'YZX');
      },
      onComplete: () => {
        // 动画结束
        this._springCamera.lookAt.copy(targetLookAt);
        this._springCamera.springLength = springLength;
        this._springCamera.rotation.copy(targetRotYZX);

        this.reset();

        this.isAnimatingPOI = false;
        this.switchToOrbitMode();
      },
    });
  }

  public setNewRange(
    // zRange: [number, number] = [0.02, 0.3],
    // yRange: [number, number] = [-100, 100]
    zRange: [number, number] = [-Infinity, Infinity],
    yRange: [number, number] = [-Infinity, Infinity]
  ): void {
    this._springRotationZClampRange = zRange;
    this._springRotationYClampRange = yRange;
  }

  private scrollForward(isForward: boolean) {
    // 入口条件：不在点击效果中 且 未处于状态切换中
    if (!this.isInClickEffect && !this.isTransitioning) {
      // 立即上锁，防止重复触发
      this.isTransitioning = true;

      gsap
        .timeline()
        .to({}, { duration: DURATION }) // 占位动画
        .delay(DURATION) // 额外延迟0.3s
        .call(() => {
          // 动画完成后解锁
          this.isTransitioning = false;
        })
        .play();

      // 根据当前状态和方向执行状态转移
      switch (this.currentShowingState) {
        case ViewState.State1:
          this.currentShowingState = isForward ? ViewState.State2 : ViewState.State4;
          break;
        case ViewState.State2:
          this.currentShowingState = isForward ? ViewState.State3 : ViewState.State1;
          break;
        case ViewState.State3:
          this.currentShowingState = isForward ? ViewState.State4 : ViewState.State2;
          break;
        case ViewState.State4:
          this.currentShowingState = isForward ? ViewState.State1 : ViewState.State3;
          break;
      }

      eventBus.emit('ChangeModule', { module: this.currentShowingState });
    }
  }

  dispose() {
    this.orbitControls && this.orbitControls.dispose();

    this.dom.removeEventListener('pointerdown', this._onMouseDown);
    this.dom.removeEventListener('pointerup', this._onMouseUp);
    this.dom.removeEventListener('pointermove', this._onMouseMove);
    this.dom.removeEventListener('wheel', this._onMouseWheel);
    this.dom.removeEventListener('touchstart', this._onTouchStart);
    this.dom.removeEventListener('touchmove', this._onTouchMove);
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
