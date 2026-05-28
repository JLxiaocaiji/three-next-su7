import * as THREE from 'three';
import { gsap } from 'gsap';
import { PerlinNoise, clamp, isTouchDevice, randFloat } from '@/utils';

interface SpringCameraOptions {
  near?: number;
  far?: number;
  fov?: number;
  rotation?: THREE.Euler;
  lookAt?: THREE.Vector3;
  springLength?: number;
  camera: THREE.PerspectiveCamera;
}

export class SpringCamera {
  public camera: THREE.PerspectiveCamera;
  public enabled = true;
  public enablePositionNoise = true;
  private positionFrequency = 1.5;
  private positionAmplitude = 0.04;
  public positionScale = new THREE.Vector3(1, 1, 1);
  private positionFractalLevel = 3;

  // 内部状态
  public _time: number[] = [];
  private readonly _fbmNorm = 1 / 0.75;
  private _springLength = 2;
  private _lookAt = new THREE.Vector3(0, 0.23686, 0);
  public _rotation = new THREE.Euler(0, -Math.PI / 2, 0);
  readonly targetCameraPosition = new THREE.Vector3();

  private _tempVec3 = new THREE.Vector3();
  private _tempEuler = new THREE.Euler();
  private _tempQuat1 = new THREE.Quaternion();
  private _tempQuat2 = new THREE.Quaternion();

  constructor({
    near = 0.01,
    far = 100,
    fov = 45,
    rotation = new THREE.Euler(0, -Math.PI / 2, 0),
    lookAt = new THREE.Vector3(),
    springLength = 2,
    camera,
  }: SpringCameraOptions) {
    this.camera = camera;
    this.camera.near = near;
    this.camera.far = far;
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();

    this._rotation.copy(rotation);
    this._lookAt.copy(lookAt);
    this._springLength = springLength;

    this.calculateCameraPosition();
    this.camera.position.copy(this.targetCameraPosition);
    this.camera.lookAt(this._lookAt);

    this.rehash();

    console.log('this.camera', this.camera);
  }

  rehash() {
    for (let i = 0; i < 6; i++) {
      this._time[i] = randFloat(-10000, 0);
    }
  }

  get springLength() {
    return this._springLength;
  }
  set springLength(v: number) {
    this._springLength = v;
  }

  get rotation() {
    return this._rotation;
  }

  set rotation(r) {
    this._rotation.copy(r);
  }

  get lookAt() {
    return this._lookAt;
  }
  set lookAt(v: THREE.Vector3) {
    this._lookAt.copy(v);
  }

  gotoPOI(
    targetLookAt: THREE.Vector3,
    springLength: number,
    targetRot: THREE.Euler,
    duration = 1.5,
    ease: gsap.EaseString = 'power2.inOut',
    delay = 0
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.enabled = true;
      const startQuat = new THREE.Quaternion().setFromEuler(this._rotation);
      const endQuat = new THREE.Quaternion().setFromEuler(targetRot);
      const currentQuat = new THREE.Quaternion();

      gsap.killTweensOf(this);
      gsap.killTweensOf(this._lookAt);

      const tweenObj = { progress: 0 };
      gsap.killTweensOf(tweenObj);
      gsap
        .timeline()
        .delay(delay)
        .to(
          this._lookAt,
          {
            x: targetLookAt.x,
            y: targetLookAt.y,
            z: targetLookAt.z,
            duration,
            ease,
          },
          0
        )
        .to(
          this,
          {
            _springLength: springLength,
            duration,
            ease,
          },
          0
        )
        .to(
          tweenObj,
          {
            progress: 1,
            duration,
            ease,
            onUpdate: () => {
              // 正确执行四元数球面插值
              currentQuat.copy(startQuat).slerp(endQuat, tweenObj.progress);
              this._rotation.setFromQuaternion(currentQuat, 'YZX');
            },
          },
          0
        )
        .call(() => resolve(true))
        .play();
    });
  }

  calculateCameraPosition() {
    // this._tempEuler.copy(this.rotation);
    this._tempEuler.set(0, this.rotation.y, this.rotation.z);
    this._tempVec3
      .set(1, 0, 0)
      .applyEuler(this._tempEuler)
      .multiplyScalar(this._springLength)
      .add(this._lookAt);
    this.targetCameraPosition.copy(this._tempVec3);
  }

  // 每帧更新
  update(delta: number): void {
    if (!this.enabled) return;
    this.calculateCameraPosition();
    this.camera.position.copy(this.targetCameraPosition);
    this.camera.lookAt(this._lookAt);

    if (!this.enablePositionNoise) return;

    for (let i = 0; i < 3; i++) {
      this._time[i] += this.positionFrequency * delta;
    }

    this._tempVec3.set(
      PerlinNoise.fbm(this.positionFractalLevel, this._time[0]),
      PerlinNoise.fbm(this.positionFractalLevel, this._time[1]),
      PerlinNoise.fbm(this.positionFractalLevel, this._time[2])
    );

    this._tempVec3.multiply(this.positionScale);
    this._tempVec3.multiplyScalar(this.positionAmplitude * this._fbmNorm);
    this.camera.position.add(this._tempVec3);
  }
}
