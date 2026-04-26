import * as THREE from 'three';

/**
 * PlanarReflection (原名 RO)
 * 用于实现实时平面反射组件
 */
export class ReflectManager {
  private static instance: ReflectManager | null = null;

  private _clipBias;
  private readonly _renderLayer: number;

  // 反射核心对象
  private _reflectCamera: THREE.PerspectiveCamera; // 独立的反射相机
  private _reflectPlane: THREE.Plane; // 反射平面对象
  private _reflectMatrix: THREE.Matrix4; // 反射纹理矩阵
  private _renderTarget: THREE.WebGLRenderTarget; // 反射渲染纹理

  private _textureMatrix = new THREE.Matrix4(); // 反射矩阵

  // 外部依赖
  private _mainCamera: THREE.PerspectiveCamera;
  private _renderer: THREE.WebGLRenderer;
  private _scene: THREE.Scene;
  private _reflectPlaneMesh: THREE.Mesh | THREE.Object3D;
  public node!: THREE.Object3D;

  private readonly _tempVec3 = new THREE.Vector3();
  private readonly _tempQuat = new THREE.Quaternion();
  private readonly _tempVec4 = new THREE.Vector4();
  private readonly _cameraWorldPos = new THREE.Vector3();

  private readonly _up = new THREE.Vector3(0, 1, 0);
  private readonly _z = new THREE.Vector3(0, 0, 1);

  /**
   * 构造函数
   * @param mainCamera 场景主相机
   * @param renderer 渲染器
   * @param scene 主场景
   * @param reflectPlaneMesh 反射平面Mesh（原node）
   * @param resolution 反射纹理分辨率
   * @param renderLayer 反射渲染层
   * @param clipBias 剪裁偏移（防遮挡）
   */
  constructor(
    mainCamera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    reflectPlaneMesh: THREE.Mesh,
    resolution = new THREE.Vector2(1024, 1024),
    renderLayer = 29,
    clipBias = 0 // clipBias = 0.01
  ) {
    this._clipBias = clipBias; // 剪裁偏移
    this._renderLayer = renderLayer;

    // 注入外部依赖
    this._mainCamera = mainCamera;
    this._renderer = renderer;
    this._scene = scene;
    this._reflectPlaneMesh = reflectPlaneMesh;

    // 初始化独立反射相机
    this._reflectCamera = new THREE.PerspectiveCamera();
    this._reflectCamera.layers.set(this._renderLayer);

    // 初始化数学对象
    this._reflectPlane = new THREE.Plane();
    this._reflectMatrix = new THREE.Matrix4();

    // 初始化渲染目标（反射贴图）
    this._renderTarget = new THREE.WebGLRenderTarget(resolution.x, resolution.y, {
      generateMipmaps: true,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter, // THREE.LinearMipmapLinearFilter 无法
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
    });
  }

  public init(): void {
    this._reflectPlane.set(this._up, 0);
    this._reflectPlane.applyMatrix4(this._reflectPlaneMesh.matrixWorld);
    this.update();
  }

  //   get getInstance(): ReflectManager {
  //     if (!ReflectManager.instance) {
  //       ReflectManager.instance = new ReflectManager();
  //     }
  //     return ReflectManager.instance;
  //   }

  get reflectMatrix(): THREE.Matrix4 {
    return this._reflectMatrix;
  }

  get reflectTexture(): THREE.Texture {
    return this._renderTarget.texture;
  }
  public get texture(): THREE.Texture {
    return this._renderTarget.texture;
  }

  /** 获取反射矩阵（赋值给材质使用） */
  public get matrix(): THREE.Matrix4 {
    return this._reflectMatrix;
  }

  public dispose(): void {
    this._renderTarget.dispose();
    this._reflectCamera.clear();
  }

  public update(): void {
    // 更新反射平面的世界矩阵（基于反射Mesh）
    this._reflectPlane.set(this._up, 0);
    this._reflectPlane.applyMatrix4(this._reflectPlaneMesh.matrixWorld);

    // 同步主相机参数到镜像相机
    // this._reflectCamera.copy(this._mainCamera);
    // this._reflectCamera.layers.set(this._renderLayer);

    // 2. 保存原相机图层掩码，同步主相机参数到反射相机
    const originalLayerMask = this._reflectCamera.layers.mask;
    this._reflectCamera.copy(this._mainCamera);
    this._reflectCamera.layers.mask = originalLayerMask;

    // 计算镜像位置
    const viewDir = this._z.clone().negate(); // 克隆再反转

    const cameraWorldPos = this._mainCamera.getWorldPosition(this._cameraWorldPos);
    const cameraWorldQuat = this._mainCamera.getWorldQuaternion(this._tempQuat);

    viewDir.applyQuaternion(cameraWorldQuat);

    // 角度过滤：如果相机俯视角度太大，不渲染反射（优化性能）
    if (viewDir.dot(this._reflectPlane.normal) > 0.2) {
      //   this._renderer.setRenderTarget(this._renderTarget);
      //   this._renderer.clear();
      //   this._renderer.setRenderTarget(null);
      return;
    }

    // 视线方向沿平面反射
    viewDir.reflect(this._reflectPlane.normal);

    // 计算镜像后的位置
    const projectedPoint = this._tempVec3;
    // 相机位置投影到反射平面
    this._reflectPlane.projectPoint(cameraWorldPos, projectedPoint); // 定点投影到平面上
    const mirrorPosition = projectedPoint.clone().sub(cameraWorldPos).add(projectedPoint);
    this._reflectCamera.position.copy(mirrorPosition);

    // 计算镜像后的 LookAt 目标
    const lookTarget = this._z.clone();
    lookTarget.applyQuaternion(this._mainCamera.getWorldQuaternion(this._tempQuat));
    lookTarget.add(cameraWorldPos);

    const nodeWorldPos = this._reflectPlaneMesh.getWorldPosition(this._tempVec3);
    lookTarget.sub(nodeWorldPos);

    const targetOffset = nodeWorldPos.clone().sub(lookTarget);
    targetOffset.reflect(this._reflectPlane.normal).negate();
    targetOffset.add(nodeWorldPos);

    // 更新反射相机的 Up 向量
    // this._reflectCamera.up.set(0, 1, 0);
    // this._reflectCamera.applyQuaternion(cameraWorldQuat);
    // this._reflectCamera.up.reflect(this._reflectPlane.normal);
    const up = this._up.clone().applyQuaternion(cameraWorldQuat).reflect(this._reflectPlane.normal);
    this._reflectCamera.up.copy(up);

    this._reflectCamera.lookAt(targetOffset);
    this._reflectCamera.updateMatrixWorld();

    // 计算反射矩阵 (用于变换纹理坐标)
    // 这个矩阵将世界空间坐标映射到 [0, 1] 的 UV 空间
    this._textureMatrix.set(
      0.5,
      0.0,
      0.0,
      0.5,
      0.0,
      0.5,
      0.0,
      0.5,
      0.0,
      0.0,
      0.5,
      0.5,
      0.0,
      0.0,
      0.0,
      1.0
    );
    this._textureMatrix.multiply(this._reflectCamera.projectionMatrix);
    this._textureMatrix.multiply(this._reflectCamera.matrixWorldInverse);
    this._reflectMatrix.copy(this._textureMatrix);

    // 修改投影矩阵实现斜剪裁 (Oblique Near Plane)
    // 确保只有平面以上的物体被渲染
    this._reflectPlane.applyMatrix4(this._reflectCamera.matrixWorldInverse);
    const clipPlane = new THREE.Vector4(
      this._reflectPlane.normal.x,
      this._reflectPlane.normal.y,
      this._reflectPlane.normal.z,
      this._reflectPlane.constant
    );

    const projectionMatrix = this._reflectCamera.projectionMatrix;
    const q = new THREE.Vector4();
    q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
    q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
    q.z = -1.0;
    q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

    clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));

    projectionMatrix.elements[2] = clipPlane.x;
    projectionMatrix.elements[6] = clipPlane.y;
    projectionMatrix.elements[10] = clipPlane.z + 1.0 - this._clipBias;
    projectionMatrix.elements[14] = clipPlane.w;

    // 执行渲染
    const oldRenderTarget = this._renderer.getRenderTarget();

    this._renderer.setRenderTarget(this._renderTarget);
    // 清空缓冲
    this._renderer.state.buffers.depth.setMask(true);
    if (this._renderer.autoClear === false) this._renderer.clear();

    this._renderer.render(this._scene, this._reflectCamera);

    // 还原渲染状态
    this._renderer.setRenderTarget(oldRenderTarget);
    const viewport = this._mainCamera.viewport;
    if (viewport) {
      this._renderer.state.viewport(viewport);
    }
  }
}
