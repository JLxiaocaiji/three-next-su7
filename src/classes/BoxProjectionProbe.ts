import * as THREE from 'three';

export class BoxProjectionProbe {
  private readonly boundingBox: THREE.Box3 = new THREE.Box3();
  private readonly probeBox: THREE.Box3 = new THREE.Box3();
  private readonly _probeCenter: THREE.Vector3 = new THREE.Vector3();
  private _boxProjection: boolean = true;
  private needUpdate: boolean = true;
  private _debug: boolean = false;

  // 目标模型节点
  public _node: THREE.Object3D;
  public _renderer: THREE.WebGLRenderer;

  public globalUniforms: {
    probePos: THREE.Vector4;
    probeBoxMin: THREE.Vector3;
    probeBoxMax: THREE.Vector3;
  };

  // 调试辅助对象
  private boxHelper: THREE.Box3Helper | null = null;
  private tempBox = new THREE.Box3();
  private tempVector = new THREE.Vector3();

  // 构造函数
  constructor(renderer: THREE.WebGLRenderer, node: THREE.Object3D) {
    this._renderer = renderer;
    this._node = node;

    const worldMatrix = this._node.matrixWorld.clone();
    this._node.matrixWorld.identity();
    this.boundingBox.setFromObject(this._node);
    this._node.matrixWorld.copy(worldMatrix);
    this._node.updateMatrixWorld(true);

    // 2. 如果probeBox为空，复制boundingBox
    if (this.probeBox.isEmpty()) {
      this.probeBox.copy(this.boundingBox);
    }

    this.globalUniforms = {
      probePos: new THREE.Vector4(0, 0, 0, 1),
      probeBoxMin: this.probeBox.min.clone(),
      probeBoxMax: this.probeBox.max.clone(),
    };

    // for (let material of Object.values(this._node.userData.meshData.materials)) {
    //   if (material instanceof THREE.MeshStandardMaterial) {
    //     // 启 USE_BOX_PROJECTION 宏
    //     material.defines!.USE_BOX_PROJECTION = '';
    //   }
    // }
  }

  /**
   * 每帧更新（对应原 update 方法）
   */
  public update(): void {
    if (!this.needUpdate) return;

    // 重置更新标记
    this.needUpdate = false;

    this.tempBox.copy(this.boundingBox);

    // 平移到世界坐标 + 合并探针包围盒
    this.tempBox.translate(this._node.getWorldPosition(this.tempVector));
    this.tempBox.union(this.probeBox);

    // 更新全局着色器参数
    this.globalUniforms.probePos.set(
      this._probeCenter.x,
      this._probeCenter.y,
      this._probeCenter.z,
      this._boxProjection ? 1 : 0
    );
    this.globalUniforms.probeBoxMin.copy(this.tempBox.min);
    this.globalUniforms.probeBoxMax.copy(this.tempBox.max);

    if (this.boxHelper) {
      this.boxHelper.box.copy(this.probeBox);
    }
  }

  //  Getter / Setter 完全还原原代码
  /** 调试模式开关 */
  get debug(): boolean {
    return this._debug;
  }
  set debug(value: boolean) {
    this._debug = value;

    // 原生Three.js调试：创建/显示包围盒辅助线
    if (value) {
      if (!this.boxHelper) {
        this.boxHelper = new THREE.Box3Helper(this.probeBox, 0xffff00);
        this._node.add(this.boxHelper);
      }
      this.boxHelper.visible = true;
    } else {
      this.boxHelper && (this.boxHelper.visible = false);
    }
  }

  /** 盒投影开关 */
  get boxProjection(): boolean {
    return this._boxProjection;
  }
  set boxProjection(value: boolean) {
    this._boxProjection = value;
    this.needUpdate = true;
  }

  /** 探针中心点 */
  get probeCenter(): THREE.Vector3 {
    return this._probeCenter;
  }
  set probeCenter(value: THREE.Vector3) {
    this._probeCenter.copy(value);
    this.needUpdate = true;
  }

  /** 探针包围盒最小值 */
  get probeBoxMin(): THREE.Vector3 {
    return this.probeBox.min;
  }
  set probeBoxMin(value: THREE.Vector3) {
    this.probeBox.min.copy(value);
    this.needUpdate = true;
  }

  /** 探针包围盒最大值 */
  get probeBoxMax(): THREE.Vector3 {
    return this.probeBox.max;
  }
  set probeBoxMax(value: THREE.Vector3) {
    this.probeBox.max.copy(value);
    this.needUpdate = true;
  }
}
