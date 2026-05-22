import * as THREE from 'three';
import { sceneConfig, textureObj } from '@/lib/manager/constantsConfig';
import { reflectVertexShader } from '@/shaders/reflectVertexShader';
import { reflectFragmentShader } from '@/shaders/reflectFragmentShader';

export class ReflectManager {
  private camera: THREE.PerspectiveCamera;
  private reflectPlane: THREE.Plane;
  private _reflectMatrix: THREE.Matrix4;
  private _renderTexture: THREE.WebGLRenderTarget;
  public material: THREE.ShaderMaterial;

  // 外部赋值
  public _scene: THREE.Scene;
  public _mainCamera: THREE.PerspectiveCamera;
  public _renderer: THREE.WebGLRenderer;
  public reflectMesh: THREE.Object3D;
  private _clipBias: number;

  constructor(
    mainCamera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    reflectMesh: THREE.Mesh,
    resolution: THREE.Vector2 = new THREE.Vector2(1024, 1024),
    layer: number = 29,
    clipBias: number = 0.001
  ) {
    this._scene = scene;
    this._mainCamera = mainCamera;
    this._renderer = renderer;
    this.reflectMesh = reflectMesh;
    this._clipBias = clipBias;

    this.camera = new THREE.PerspectiveCamera(
      mainCamera.fov,
      mainCamera.aspect,
      mainCamera.near,
      mainCamera.far
    );
    this.camera.layers.set(layer);

    this.reflectPlane = new THREE.Plane();
    this._reflectMatrix = new THREE.Matrix4();

    this._renderTexture = new THREE.WebGLRenderTarget(resolution.x, resolution.y, {
      type: THREE.HalfFloatType,
      // minFilter: THREE.LinearFilter,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      generateMipmaps: true,
      depthBuffer: true,
      depthTexture: new THREE.DepthTexture(resolution.x, resolution.y),
    });

    this._renderTexture.texture.colorSpace = THREE.SRGBColorSpace;
    this._renderTexture.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    this.material = this.createReflectMaterial(reflectMesh) as THREE.ShaderMaterial;

    if (this.material) {
      reflectMesh.material = this.material;
    }
  }

  get reflectMatrix(): THREE.Matrix4 {
    return this._reflectMatrix;
  }

  get reflectTexture(): THREE.Texture {
    return this._renderTexture.texture;
  }

  public createReflectMaterial(mesh: THREE.Mesh): THREE.ShaderMaterial | void {
    if (!mesh) {
      console.warn('no mesh');
      return;
    }

    const lightUniforms = THREE.UniformsUtils.clone(THREE.UniformsLib['lights']);
    const fogUniforms = THREE.UniformsUtils.clone(THREE.UniformsLib['fog']);

    const baseUniforms: THREE.ShaderMaterial['uniforms'] = {
      // 基础PBR材质属性
      color: { value: new THREE.Color() },
      map: sceneConfig.ut_floorMap,
      opacity: { value: 1 },
      // 粗糙度/金属度
      roughness: { value: 1 },
      roughnessMap: { value: null },
      metalness: { value: 1 },
      metalnessMap: { value: null },

      // 环境光遮蔽 + 光照贴图
      aoMap: { value: null },
      lightMap: { value: null },
      lightMapColor: sceneConfig.u_floorLightMapColor,
      lightMapIntensity: { value: 1 },

      // 自发光
      emissive: { value: new THREE.Color() },
      emissiveMap: { value: null },

      // 法线贴图
      normalMap: { value: null },
      distortionScale: { value: 0 },

      // 项目自定义反射/地面参数
      u_lightIntensity: sceneConfig.u_floorLightMapIntensity,
      u_reflectIntensity: sceneConfig.u_floorReflectIntensity,
      u_floor_typeSwitch: sceneConfig.u_floor_typeSwitch,
      ut_street: sceneConfig.ut_street,
      u_floorUVOffset: sceneConfig.u_floorUVOffset,

      // 继承全局雾、灯光、反射配置
      // ...ShaderUniformLib.fog, // 继承全局雾配置
      // ...ShaderUniformLib.lights, // 继承全局灯光配置

      ...lightUniforms, // 保证 lights 结构完整且未被浅拷贝破坏
      ...fogUniforms,

      u_reflectMatrix: { value: this._reflectMatrix },
      u_reflectTexture: { value: this._renderTexture.texture },
    } as unknown as THREE.ShaderMaterial['uniforms'];

    // 定义【着色器宏定义】(控制贴图开关)
    const shaderDefines: Record<string, string | boolean> = {};

    // 获取网格的原始材质
    const originalMaterial = mesh.material as THREE.MeshPhysicalMaterial;

    // 若存在原始标准材质，继承其属性到Shader材质
    if (originalMaterial) {
      // 继承基础颜色 + 透明度
      baseUniforms.color.value = originalMaterial.color;
      if (originalMaterial.map) {
        baseUniforms.map.value = originalMaterial.map;
        shaderDefines.USE_MAP = '';
      } else {
        delete shaderDefines.USE_MAP;
      }
      baseUniforms.opacity.value = originalMaterial.opacity;

      // 继承 粗糙度贴图
      if (originalMaterial.roughnessMap) {
        baseUniforms.roughnessMap.value = originalMaterial.roughnessMap;
        shaderDefines.USE_ROUGHNESS_MAP = '';
      }

      // 继承 金属度贴图
      baseUniforms.metalness.value = originalMaterial.metalness;
      if (originalMaterial.metalnessMap) {
        baseUniforms.metalnessMap.value = originalMaterial.metalnessMap;
        shaderDefines.USE_METALNESS_MAP = '';
      }

      // 继承 自发光属性
      baseUniforms.emissive.value = originalMaterial.emissive;
      if (originalMaterial.emissiveMap) {
        baseUniforms.emissiveMap.value = originalMaterial.emissiveMap;
        shaderDefines.USE_EMISSIVE_MAP = '';
      }

      // 继承 AO贴图
      if (originalMaterial.aoMap) {
        baseUniforms.aoMap.value = originalMaterial.aoMap;
        shaderDefines.USE_AO_MAP = '';
      }

      // 继承 光照贴图
      baseUniforms.lightMapIntensity = { value: originalMaterial.lightMapIntensity };
      if (originalMaterial.lightMap) {
        baseUniforms.lightMap.value = originalMaterial.lightMap;
        shaderDefines.USE_LIGHT_MAP = '';
      }

      // 继承 法线贴图 (设置各向异性=4)
      if (originalMaterial.normalMap) {
        originalMaterial.normalMap.anisotropy = 4;
        baseUniforms.normalMap.value = originalMaterial.normalMap;
        shaderDefines.USE_NORMAL_MAP = '';
      }

      // 创建自定义反射Shader材质，替换网格原有材质
      const reflectShaderMaterial = new THREE.ShaderMaterial({
        defines: shaderDefines,
        uniforms: baseUniforms,
        vertexShader: reflectVertexShader,
        fragmentShader: reflectFragmentShader,
        lights: true,
        fog: true,
      });

      // 材质命名
      reflectShaderMaterial.name = 'M_Reflect';
      // 将反射材质赋值给网格
      return reflectShaderMaterial;
    } else {
      console.log('ReflectMaterial: err');
    }
  }

  public render(): void {
    if (!this._scene || !this._mainCamera || !this._renderer || !this.reflectMesh) return;

    // 1. 更新反射平面的世界矩阵
    this.reflectMesh.updateMatrixWorld(true);

    const reflectorWorldPosition = new THREE.Vector3();
    const cameraWorldPosition = new THREE.Vector3();
    const rotationMatrix = new THREE.Matrix4();
    const normal = new THREE.Vector3();
    const view = new THREE.Vector3();
    const target = new THREE.Vector3();
    const q = new THREE.Vector4();
    const clipPlane = new THREE.Vector4();

    this.reflectMesh.getWorldPosition(reflectorWorldPosition);
    this._mainCamera.getWorldPosition(cameraWorldPosition);
    rotationMatrix.extractRotation(this.reflectMesh.matrixWorld);

    // 计算反射平面的世界空间法线（假设局部法线为 0,1,0）
    normal.set(0, 1, 0).applyMatrix4(rotationMatrix).normalize();

    // 避免当反射平面背向相机时进行不必要的渲染
    view.subVectors(reflectorWorldPosition, cameraWorldPosition);
    if (view.dot(normal) > 0) return;
    // if (view.dot(normal) > 0.2) return;

    // 2. 计算镜像相机的位置
    view.reflect(normal).negate();
    view.add(reflectorWorldPosition);

    // 3. 计算镜像相机的朝向目标
    const mainCameraRotationMatrix = new THREE.Matrix4().extractRotation(
      this._mainCamera.matrixWorld
    );
    const lookAtPosition = new THREE.Vector3(0, 0, -1)
      .applyMatrix4(mainCameraRotationMatrix)
      .add(cameraWorldPosition);

    target.subVectors(reflectorWorldPosition, lookAtPosition);
    target.reflect(normal).negate();
    target.add(reflectorWorldPosition);

    // 4. 同步基础参数并【重置投影矩阵】
    // 先调用 updateProjectionMatrix() 恢复一个干净完整的透视矩阵，否则上一帧斜裁剪污染的矩阵会无限叠加导致渲染崩溃
    this.camera.position.copy(view);
    this.camera.near = this._mainCamera.near;
    this.camera.far = this._mainCamera.far;
    this.camera.fov = this._mainCamera.fov;
    this.camera.aspect = this._mainCamera.aspect;
    this.camera.updateProjectionMatrix();

    // 正确计算镜像相机的 Up 轴
    const mainCameraUp = new THREE.Vector3(0, 1, 0).applyMatrix4(mainCameraRotationMatrix);
    this.camera.up.copy(mainCameraUp).reflect(normal);

    // 5. 使用 lookAt 让相机朝向目标，并【强制更新世界矩阵与逆矩阵】
    // Three.js 默认只在 renderer 渲染内部才计算 camera.matrixWorldInverse（视图矩阵）。
    // 我们在后面步骤 6 和 7 中必须用到最新的视图矩阵，所以这里必须手动调用并强制反转。
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld(true);
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
    this.camera.clearViewOffset();

    // 6. 计算纹理投影矩阵 (Texture Matrix)
    // 映射裁剪空间坐标 [-1, 1] 到 UV 纹理坐标空间 [0, 1]
    const textureMatrix = new THREE.Matrix4(
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
    // 矩阵链乘顺序：ScaleBias * Projection * ViewInverse
    textureMatrix.multiply(this.camera.projectionMatrix);
    textureMatrix.multiply(this.camera.matrixWorldInverse);
    this._reflectMatrix.copy(textureMatrix);

    // 7. 应用斜裁剪平面（Eric Lengyel 算法）
    // 将视锥体的近裁剪面移动并贴合到反射平面上，剔除地面下方的遮挡物，防止穿模闪烁
    this.reflectPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition);
    this.reflectPlane.applyMatrix4(this.camera.matrixWorldInverse);

    clipPlane.set(
      this.reflectPlane.normal.x,
      this.reflectPlane.normal.y,
      this.reflectPlane.normal.z,
      this.reflectPlane.constant
    );

    const projectionMatrix = this.camera.projectionMatrix;

    q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
    q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
    q.z = -1.0;
    q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

    // 计算缩放后的平面向量
    clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));

    // 修改投影矩阵的第三行以应用斜裁剪
    projectionMatrix.elements[2] = clipPlane.x;
    projectionMatrix.elements[6] = clipPlane.y;
    projectionMatrix.elements[10] = clipPlane.z + 1.0 - this._clipBias;
    projectionMatrix.elements[14] = clipPlane.w;

    // 8. 离屏渲染反射纹理到 WebGLRenderTarget
    const originalRenderTarget = this._renderer.getRenderTarget();
    const originalXrEnabled = this._renderer.xr.enabled;
    const originalShadowAutoUpdate = this._renderer.shadowMap.autoUpdate;
    const originalAutoClear = this._renderer.autoClear;

    // 关闭不必要的全局开销（XR 设备同步、反射场景内的阴影二次计算等）
    this._renderer.xr.enabled = false;
    this._renderer.shadowMap.autoUpdate = false;

    this._renderer.setRenderTarget(this._renderTexture);
    this._renderer.state.buffers.depth.setMask(true);

    // 在渲染反射贴图前，隐去地面本身，防止自己把自己渲染进倒影中
    this.reflectMesh.visible = false;

    if (originalAutoClear) this._renderer.clear();
    this._renderer.render(this._scene, this.camera);

    // 恢复地面的可见性
    this.reflectMesh.visible = true;

    // 9. 彻底恢复 Renderer 渲染器状态，不污染主画布的正常渲染流程
    this._renderer.setRenderTarget(originalRenderTarget);
    this._renderer.xr.enabled = originalXrEnabled;
    this._renderer.shadowMap.autoUpdate = originalShadowAutoUpdate;
    this._renderer.autoClear = originalAutoClear;

    // 恢复主相机的视口配置
    const viewport = this._mainCamera.viewport;
    if (viewport) {
      this._renderer.state.viewport(viewport);
    }
  }

  public dispose(): void {
    this._renderTexture.dispose();
    this._renderTexture.depthTexture?.dispose();
    this.material.dispose();
  }
}
