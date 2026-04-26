import * as THREE from 'three';

/**
 * 盒投影反射探针控制器 (对应原混淆类 Qr)
 * 功能：为模型提供局部环境反射的盒投影计算，同步参数到着色器全局uniforms
 * 适配 Three.js 0.183 官方API
 */
export class BoxProjectionReflectionManager {
  // 私有属性 完全对应原混淆代码
  private readonly _boundingBox: THREE.Box3;
  private readonly _probeBox: THREE.Box3;
  private readonly _probeCenter: THREE.Vector3;
  private _boxProjection: boolean;
  private _needUpdate: boolean;
  private _debug: boolean;

  // 目标模型节点（对应原 this.node）
  public readonly node: THREE.Object3D;
  // 全局着色器参数（对应原 viewer.renderer.globalUniforms）
  public globalUniforms: {
    probePos: THREE.Vector4;
    probeBoxMin: THREE.Vector3;
    probeBoxMax: THREE.Vector3;
  };

  // 调试辅助对象
  private boxHelper: THREE.Box3Helper | null = null;

  /**
   * 构造函数
   * @param node 绑定的3D模型对象
   */
  constructor(node: THREE.Object3D) {
    this.node = node;

    // 初始化包围盒/向量 对应原 l.ZzF / l.Pa4 / l.Ltg
    this._boundingBox = new THREE.Box3();
    this._probeBox = new THREE.Box3();
    this._probeCenter = new THREE.Vector3();

    // 初始化默认值 对应原 !0 / !1
    this._boxProjection = true;
    this._needUpdate = true;
    this._debug = false;

    // 初始化全局uniforms
    this.globalUniforms = {
      probePos: new THREE.Vector4(0, 0, 0, 1),
      probeBoxMin: new THREE.Vector3(),
      probeBoxMax: new THREE.Vector3(),
    };
  }

  /**
   * 初始化加载完成（对应原 onLoad 生命周期）
   */
  public onLoad(): void {
    // 1. 计算模型自身包围盒
    this._boundingBox.setFromObject(this.node);

    // 2. 探针包围盒为空时，使用模型包围盒
    if (this._probeBox.isEmpty()) {
      this._probeBox.copy(this._boundingBox);
    }

    // 3. 初始化全局着色器参数
    this.globalUniforms.probePos = new THREE.Vector4(0, 0, 0, 1);
    this.globalUniforms.probeBoxMin.copy(this._probeBox.min);
    this.globalUniforms.probeBoxMax.copy(this._probeBox.max);

    // 4. 遍历模型所有材质，启用盒投影着色器宏
    const materials = (this.node as any).meshData?.materials || (this.node as THREE.Mesh).material;
    const materialList = Array.isArray(materials) ? materials : [materials];

    for (const material of materialList) {
      if (material?.isMeshStandardMaterial) {
        material.defines.USE_BOX_PROJECTION = '';
        material.needsUpdate = true;
      }
    }
  }

  /**
   * 每帧更新（对应原 update 方法）
   */
  public update(): void {
    if (!this._needUpdate) return;

    // 重置更新标记
    this._needUpdate = false;

    // 临时变量：对应原 Eo(Box3) / Yr(Vector3)
    const tempBox = new THREE.Box3().copy(this._boundingBox);
    const worldPosition = new THREE.Vector3();
    this.node.getWorldPosition(worldPosition);

    // 平移到世界坐标 + 合并探针包围盒
    tempBox.translate(worldPosition);
    tempBox.union(this._probeBox);

    // 更新全局着色器参数
    this.globalUniforms.probePos.set(
      this._probeCenter.x,
      this._probeCenter.y,
      this._probeCenter.z,
      this._boxProjection ? 1 : 0
    );
    this.globalUniforms.probeBoxMin.copy(tempBox.min);
    this.globalUniforms.probeBoxMax.copy(tempBox.max);

    if (this.boxHelper) {
      this.boxHelper.box.copy(this._probeBox);
    }
  }

  //  Getter / Setter 完全还原原代码
  /** 调试模式开关 */
  get debug(): boolean {
    return this._debug;
  }
  set debug(value: boolean) {
    this._debug = value;

    // 原生Three.js调试：创建/显示包围盒辅助线（替代原viewer事件）
    if (value) {
      if (!this.boxHelper) {
        this.boxHelper = new THREE.Box3Helper(this._probeBox, 0xffff00);
        this.node.add(this.boxHelper);
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
    this._needUpdate = true;
  }

  /** 探针中心点 */
  get probeCenter(): THREE.Vector3 {
    return this._probeCenter;
  }
  set probeCenter(value: THREE.Vector3) {
    this._probeCenter.copy(value);
    this._needUpdate = true;
  }

  /** 探针包围盒最小值 */
  get probeBoxMin(): THREE.Vector3 {
    return this._probeBox.min;
  }
  set probeBoxMin(value: THREE.Vector3) {
    this._probeBox.min.copy(value);
    this._needUpdate = true;
  }

  /** 探针包围盒最大值 */
  get probeBoxMax(): THREE.Vector3 {
    return this._probeBox.max;
  }
  set probeBoxMax(value: THREE.Vector3) {
    this._probeBox.max.copy(value);
    this._needUpdate = true;
  }
}
