import * as THREE from 'three';
import { gsap } from 'gsap';

type SourceData = {
  data: Uint8Array | Float32Array | null;
  width: number;
  height: number;
};

/**
 * 动态环境贴图生成器
 * 负责将混合后的环境贴图渲染到立方体贴图渲染目标
 */
class Environment {
  private _renderTarget: THREE.WebGLRenderTarget;
  private _fullscreenQuad: THREE.Mesh;
  private _scene: THREE.Scene;
  private _camera: THREE.OrthographicCamera;
  private _mixMaterial: THREE.ShaderMaterial;
  private _pmremGenerator: THREE.PMREMGenerator | null = null;
  private _needsUpdate: boolean = true;

  public pbrEnvMap: THREE.Texture | null = null;
  constructor(renderer: THREE.WebGLRenderer, envMap0: THREE.Texture, envMap1: THREE.Texture) {
    this._pmremGenerator = new THREE.PMREMGenerator(renderer);
    this._pmremGenerator.compileEquirectangularShader();

    this._mixMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tEnv0: { value: envMap0 },
        tEnv1: { value: envMap1 },
        intensity: { value: 1 },
        weight: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.);
        }
        `,
      fragmentShader: `
        uniform sampler2D tEnv0;
        uniform sampler2D tEnv1;
        uniform float     weight;
        uniform float     intensity;
        varying vec2      vUv;

        void main() {
            vec4 col0 = texture(tEnv0, vUv);
            vec4 col1 = texture(tEnv1, vUv);
            // gl_FragColor = vec4(mix(col0, col1, weight) * intensity, 1.);
            gl_FragColor = vec4(mix(col0.rgb, col1.rgb, weight) * intensity, mix(col0.a, col1.a, weight));
        }
        `,
    });

    // 创建渲染目标 (使用与输入环境贴图相同的分辨率)
    const size = envMap0.source.data as SourceData;
    this._renderTarget = new THREE.WebGLRenderTarget(size.width, size.height, {
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
      generateMipmaps: false,
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      colorSpace: THREE.SRGBColorSpace,
      depthBuffer: false,
    });
    this._renderTarget.texture.mapping = THREE.CubeUVReflectionMapping;

    /**
     * 在 GPU 里创建一个临时的离屏画布（WebGLRenderTarget），然后放一张盖满整个画布的方形纸（全屏四边形），
     * 把两张图塞给自定义 Shader，在上面用数学公式（mix）涂色，最后把这张涂好的画布当成环境贴图给主场景。
     */
    this._scene = new THREE.Scene();
    // 覆盖整个标准化设备坐标 (NDC) 空间
    this._camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    // 从 (-1,-1) 到 (1,1)，填满整个视口
    this._fullscreenQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._mixMaterial);
    this._scene.add(this._fullscreenQuad);
  }

  get intensity(): number {
    return this._mixMaterial.uniforms.intensity.value;
  }

  set intensity(value: number) {
    if (this._mixMaterial.uniforms.intensity.value !== value) {
      this._mixMaterial.uniforms.intensity.value = value;
      this._needsUpdate = true;
    }
  }

  get weight(): number {
    return this._mixMaterial.uniforms.weight.value;
  }

  set weight(value: number) {
    if (this._mixMaterial.uniforms.weight.value !== value) {
      this._mixMaterial.uniforms.weight.value = value;
      this._needsUpdate = true;
    }
  }

  get envMap(): THREE.Texture {
    return this._renderTarget.texture;
  }

  /**
   * 更新环境贴图
   * 必须在每一帧渲染主场景之前调用
   */
  update(renderer: THREE.WebGLRenderer): void {
    if (this._needsUpdate) {
      this._needsUpdate = false;

      // 保存当前渲染目标
      const currentRenderTarget = renderer.getRenderTarget();

      // 渲染混合后的环境贴图
      renderer.setRenderTarget(this._renderTarget);
      renderer.render(this._scene, this._camera);
      // 恢复原来的渲染目标
      renderer.setRenderTarget(currentRenderTarget);

      if (this.pbrEnvMap) this.pbrEnvMap.dispose(); // 释放旧的

      //   if (this._pmremGenerator) {
      const pmremRT = this._pmremGenerator!.fromEquirectangular(this._renderTarget.texture);
      this.pbrEnvMap = pmremRT.texture;

      //   this.pbrEnvMap.dispose();
      //   }
    }
  }

  /**
   * 释放所有资源
   */
  dispose(): void {
    this._renderTarget.dispose();
    this._mixMaterial.dispose();
    this._pmremGenerator?.dispose();
    this._pmremGenerator = null;

    this._fullscreenQuad.geometry.dispose();
  }
}

/**
 * 动态环境管理器
 * 提供简化的状态切换和动画控制接口
 */
class EnvironmentManager {
  private _dynamicEnv: Environment;
  private _renderer: THREE.WebGLRenderer;
  private _scene: THREE.Scene;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    envMap0: THREE.Texture,
    envMap1: THREE.Texture
  ) {
    this._renderer = renderer;
    this._scene = scene;

    // 创建动态环境
    this._dynamicEnv = new Environment(renderer, envMap0, envMap1);

    // 初始状态：强度为0，完全不显示
    this._dynamicEnv.intensity = 0;
    this._dynamicEnv.weight = 0;

    // 设置为场景的环境贴图
    this._dynamicEnv.update(this._renderer);
    // 仅影响材质反射
    this._scene.environment = this._dynamicEnv.envMap;
  }

  get dynamicEnv(): Environment {
    return this._dynamicEnv;
  }

  /**
   * 设置环境状态并带动画过渡
   * @param state 状态: 0=关闭, 1=显示环境1, 2=显示环境2
   * @param duration 动画持续时间(秒)
   * @param ease 缓动函数
   * @param intensity 目标强度
   */
  setState(
    state: 0 | 1 | 2,
    duration: number = 1,
    ease: gsap.EaseString = 'power2.inOut',
    intensity: number = 1
  ): void {
    // 停止所有正在进行的动画
    gsap.killTweensOf(this._dynamicEnv);

    let targetParams: { intensity: number; weight: number };

    switch (state) {
      // 状态0：完全关闭环境
      case 0:
        targetParams = { intensity: 0, weight: 0 };
        break;
      // 状态1：启用主环境贴图（envMap0）
      case 1:
        targetParams = { intensity: intensity, weight: 0 };
        break;
      // 状态2：启用混合环境贴图（envMap1）
      case 2:
        targetParams = { intensity: intensity, weight: 1 };
        break;
    }

    gsap.to(this._dynamicEnv, {
      duration,
      ease,
      ...targetParams,
      // 动画每一帧更新环境贴图
      //   onUpdate: () => this.update(),
    });
  }

  /**
   * 更新环境贴图
   * 必须在每一帧渲染主场景之前调用
   */
  update(): void {
    this._dynamicEnv.update(this._renderer);
    if (this._scene.environment !== this._dynamicEnv.pbrEnvMap) {
      // 仅影响材质反射
      this._scene.environment = this._dynamicEnv.pbrEnvMap;
    }

    // const currentEnvMap = this._dynamicEnv.envMap; // 拿到混合后的 WebGLRenderTarget 纹理

    // if (currentEnvMap) {
    //   // 背景纹理的映射方式必须是经纬度全景图映射
    //   if (currentEnvMap.mapping !== THREE.EquirectangularReflectionMapping) {
    //     currentEnvMap.mapping = THREE.EquirectangularReflectionMapping;
    //   }

    //   if (this._scene.background !== currentEnvMap) {
    //     this._scene.background = currentEnvMap;
    //   }
    // }
  }

  /**
   * 释放所有资源
   */
  dispose(): void {
    this._dynamicEnv.dispose();
    if (this._scene.environment === this._dynamicEnv.envMap) {
      this._scene.environment = null;
    }
  }
}

export { EnvironmentManager };
