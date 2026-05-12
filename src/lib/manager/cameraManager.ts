import * as THREE from 'three';
import { gsap } from 'gsap';
import { lerp, PerlinNoise, clamp } from '@/utils';

export class SpringCamera extends THREE.PerspectiveCamera {
  enablePositionNoise = true;
  positionFrequency = 1.5;
  positionAmplitude = 0.04;
  positionScale = new THREE.Vector3(1, 1, 1);
  positionFractalLevel = 3;

  // 内部状态
  private _time: number[] = Array(6).fill(0);
  private readonly _fbmNorm = 1 / 0.75;
  private _springLength = 2;
  private _lookAt = new THREE.Vector3(0, 0.23686, 0);
  readonly targetCameraPosition = new THREE.Vector3();

  constructor(opt: {
    near?: number;
    far?: number;
    fov?: number;
    rotation?: THREE.Euler;
    lookAt?: THREE.Vector3;
    springLength?: number;
  }) {
    const {
      near = 0.01,
      far = 100,
      fov = 45,
      rotation = new THREE.Euler(0, -Math.PI / 2, 0),
      lookAt = new THREE.Vector3(),
      springLength = 2,
    } = opt;

    // 调用父类构造
    super(fov, window.innerWidth / window.innerHeight, near, far);

    this._springLength = springLength;
    this._lookAt.copy(lookAt);
    this.rotation.copy(rotation);
    this.rehash();
    this.calculateCameraPosition();
    this.position.copy(this.targetCameraPosition);
    super.lookAt(this._lookAt);
  }

  rehash() {
    for (let i = 0; i < 6; i++) {
      this._time[i] = Math.random() * -10000;
    }
  }

  get springLength() {
    return this._springLength;
  }
  set springLength(v: number) {
    this._springLength = v;
  }

  get lookAtTarget() {
    return this._lookAt;
  }
  set lookAtTarget(v: THREE.Vector3) {
    this._lookAt.copy(v);
  }

  calculateCameraPosition() {
    const e = new THREE.Euler(0, this.rotation.y, this.rotation.z);
    const dir = new THREE.Vector3(1, 0, 0).applyEuler(e);
    dir.multiplyScalar(this._springLength).add(this._lookAt);
    this.targetCameraPosition.copy(dir);
  }

  gotoPOI(
    lookAt: THREE.Vector3,
    length: number,
    rot: THREE.Euler,
    duration = 1.5,
    ease: gsap.EaseString = 'power2.inOut',
    delay = 0
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const m = new THREE.Quaternion().setFromEuler(this.rotation);
      const targetQuat = new THREE.Quaternion().setFromEuler(rot);

      gsap.killTweensOf(this);
      gsap.to(this, {
        lookAtTarget: lookAt,
        springLength: length,
        duration,
        delay,
        ease,
        onUpdate: () => {
          const q = m.clone().slerp(targetQuat, gsap.globalTimeline.timeScale());
          this.rotation.setFromQuaternion(q, 'YZX');
        },
        onComplete: () => resolve(true),
      });
    });
  }

  // 每帧更新（requestAnimationFrame 中调用）
  update(delta: number): void {
    this.calculateCameraPosition();
    this.position.copy(this.targetCameraPosition);
    super.lookAt(this._lookAt);

    if (!this.enablePositionNoise) return;

    for (let i = 0; i < 3; i++) {
      this._time[i] += this.positionFrequency * delta;
    }

    const noise = new THREE.Vector3(
      PerlinNoise.fbm(this.positionFractalLevel, this._time[0]),
      PerlinNoise.fbm(this.positionFractalLevel, this._time[1]),
      PerlinNoise.fbm(this.positionFractalLevel, this._time[2])
    );

    noise.multiply(this.positionScale);
    noise.multiplyScalar(this.positionAmplitude * this._fbmNorm);
    this.position.add(noise);
  }
}

// CameraController（相机控制器）
export class CameraController {
  enableClamp = true;
  targetFov = 45;
  springlengthOffset = 0;
  lerpStrength = 1;
  moveSpeed = [1, 1];
  lerpLengthStrength = 3;

  private _currentLengthOffset = 0;
  private _springRotationZClampRange: [number, number] = [0.02, 0.3];
  private _springRotationYClampRange: [number, number] = [-100, 100];

  private _deltaRotation = new THREE.Euler();
  private _targetRotation = new THREE.Euler();
  private _targetSpringLength = 0;
  private _targetLookAt = new THREE.Vector3();

  private _button = -1;
  private _preLoc0 = new THREE.Vector2();
  private _touchID = -1;
  private _mouseWheelSum = 0;
  private _lerpQuatStrength = 5;

  constructor(
    public readonly springCamera: SpringCamera,
    private dom: HTMLElement
  ) {
    this.reset();
    this.bindEvents();
  }

  get springLength() {
    return this._targetSpringLength;
  }
  set springLength(v: number) {
    this._targetSpringLength = v;
  }

  reset() {
    this._button = -1;
    this._touchID = -1;
    this.springLength = this.springCamera.springLength;
    this._targetLookAt.copy(this.springCamera.lookAtTarget);
    this._targetRotation.copy(this.springCamera.rotation);
    this._deltaRotation.set(0, 0, 0);
    this.targetFov = this.springCamera.fov;
  }

  private bindEvents() {
    this.dom.addEventListener('pointerdown', this._onMouseDown);
    this.dom.addEventListener('pointerup', this._onMouseUp);
    this.dom.addEventListener('pointermove', this._onMouseMove);
    this.dom.addEventListener('wheel', this._onMouseWheel);
    this.dom.addEventListener('touchstart', this._onTouchStart);
    this.dom.addEventListener('touchmove', this._onTouchMove);
  }

  private _onMouseDown = (e: PointerEvent) => {
    this._button = e.button;
    this._preLoc0.set(e.pageX, e.pageY);
  };

  private _onMouseUp = () => {
    this._button = -1;
  };

  private _onMouseMove = (e: PointerEvent) => {
    const p = new THREE.Vector2(e.pageX, e.pageY);
    if (this._button === 0) {
      const d = this._preLoc0
        .clone()
        .sub(p)
        .multiplyScalar(this.springCamera.springLength * 0.001);
      this._deltaRotation.y += d.x * this.moveSpeed[0];
      this._deltaRotation.z -= d.y * this.moveSpeed[1];
    }
    this._preLoc0.copy(p);
  };

  private _onMouseWheel = (e: WheelEvent) => {
    e.preventDefault();
    this._mouseWheelSum += e.deltaY;
    if (this._mouseWheelSum > 200) {
      this._mouseWheelSum = 0;
      this.springLength += 1;
    } else if (this._mouseWheelSum < -200) {
      this._mouseWheelSum = 0;
      this.springLength = Math.max(2, this.springLength - 1);
    }
  };

  private _onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this._preLoc0.set(t.pageX, t.pageY);
      this._touchID = t.identifier;
    }
  };

  private _onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1 || e.touches[0].identifier !== this._touchID) return;
    const t = e.touches[0];
    const p = new THREE.Vector2(t.pageX, t.pageY);
    const d = this._preLoc0
      .clone()
      .sub(p)
      .multiplyScalar(this.springCamera.springLength * 0.0016);
    this._deltaRotation.y += d.x * this.moveSpeed[0];
    this._deltaRotation.z -= d.y * this.moveSpeed[1];
    this._preLoc0.copy(p);
  };

  update(delta: number) {
    const cam = this.springCamera;

    if (Math.abs(cam.fov - this.targetFov) > 0.01) {
      cam.fov = lerp(cam.fov, this.targetFov, this.lerpStrength * delta);
      cam.updateProjectionMatrix();
    }

    this._currentLengthOffset = lerp(
      this._currentLengthOffset,
      this.springlengthOffset,
      this.lerpStrength * delta
    );
    const finalLen = this._targetSpringLength + this._currentLengthOffset;
    cam.springLength = lerp(cam.springLength, finalLen, 0.016 * this.lerpLengthStrength);

    this._deltaRotation.y = lerp(this._deltaRotation.y, 0, delta * 10);
    this._deltaRotation.z = lerp(this._deltaRotation.z, 0, delta * 10);
    this._targetRotation.y += this._deltaRotation.y;
    this._targetRotation.z += this._deltaRotation.z;

    if (this.enableClamp) {
      this._targetRotation.z = clamp(this._targetRotation.z, ...this._springRotationZClampRange);
      this._targetRotation.y = clamp(this._targetRotation.y, ...this._springRotationYClampRange);
    }

    const curQ = new THREE.Quaternion().setFromEuler(cam.rotation);
    const tarQ = new THREE.Quaternion().setFromEuler(this._targetRotation);
    curQ.slerp(tarQ, delta * this._lerpQuatStrength);
    cam.rotation.setFromQuaternion(curQ, 'YZX');

    cam.lookAtTarget.lerp(this._targetLookAt, delta);
  }
}
