import * as THREE from 'three';
import { gsap } from 'gsap';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

type SourceData = {
  data: Uint8Array | Float32Array | null;
  width: number;
  height: number;
};

enum EnvState {
  light = 2,
  night = 1,
  dark = 0,
}

/**
 * 动态环境贴图生成器
 * 负责将混合后的环境贴图渲染到立方体贴图渲染目标
 */
class Environment {
  private _renderer: THREE.WebGLRenderer;
  private _pmremGenerator: THREE.PMREMGenerator;

  private _renderTarget: THREE.WebGLRenderTarget;
  private _mixMaterial: THREE.ShaderMaterial;
  private _fullScreenQuad: FullScreenQuad;

  private _pmremRenderTarget: THREE.WebGLRenderTarget | null = null;
  private _needsUpdate: boolean = true;

  public pbrEnvMap: THREE.CubeTexture | null = null;

  constructor(renderer: THREE.WebGLRenderer, envMap0: THREE.Texture, envMap1: THREE.Texture) {
    this._renderer = renderer;
    this._pmremGenerator = new THREE.PMREMGenerator(renderer);
    this._pmremGenerator.compileEquirectangularShader();

    envMap0.mapping = THREE.EquirectangularReflectionMapping;
    envMap1.mapping = THREE.EquirectangularReflectionMapping;

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
            vec3 col0 = texture(tEnv0, vUv).rgb;
            vec3 col1 = texture(tEnv1, vUv).rgb;
            gl_FragColor = vec4(mix(col0, col1, weight) * intensity, 1.);
        }
      `,
    });

    this._fullScreenQuad = new FullScreenQuad(this._mixMaterial);

    // 创建渲染目标 (使用与输入环境贴图相同的分辨率)
    const size = envMap0.source.data as SourceData;
    this._renderTarget = new THREE.WebGLRenderTarget(size.width || 1024, size.height || 512, {
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
      generateMipmaps: false,
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      colorSpace: THREE.SRGBColorSpace,
      depthBuffer: false,
    });
    // this._renderTarget.texture.mapping = THREE.CubeUVReflectionMapping;
    this._renderTarget.texture.mapping = THREE.EquirectangularReflectionMapping;
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

  get envMap(): THREE.CubeTexture | null {
    return this.pbrEnvMap;
  }

  /**
   * 更新环境贴图 在每一帧渲染主场景之前调用
   */
  update(): boolean {
    if (this._needsUpdate) {
      this._needsUpdate = false;

      // 保存当前渲染目标
      const currentRenderTarget = this._renderer.getRenderTarget();
      const currentClearAlpha = this._renderer.getClearAlpha();

      // 渲染混合后的环境贴图
      this._renderer.setRenderTarget(this._renderTarget);
      this._renderer.setClearAlpha(0);
      this._fullScreenQuad.render(this._renderer);

      this._renderTarget.texture.needsUpdate = true;

      if (this._pmremRenderTarget) {
        this._pmremRenderTarget.dispose();
      }

      this._pmremRenderTarget = this._pmremGenerator.fromEquirectangular(
        this._renderTarget.texture
      );
      this.pbrEnvMap = this._pmremRenderTarget.texture as THREE.CubeTexture;

      // 恢复渲染状态
      this._renderer.setRenderTarget(currentRenderTarget);
      this._renderer.setClearAlpha(currentClearAlpha);

      return true;
    }
    return false;
  }

  forceUpdate(): void {
    this._needsUpdate = true;
    this.update();
  }

  /**
   * 释放所有资源
   */
  dispose(): void {
    this._renderTarget.dispose();
    this._mixMaterial.dispose();
    this._fullScreenQuad.dispose();

    this._pmremGenerator.dispose();

    if (this._pmremRenderTarget) {
      this._pmremRenderTarget.dispose();
    }
  }
}

/**
 * 动态环境管理器
 * 提供简化的状态切换和动画控制接口
 */
export class EnvironmentManager {
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
    this._dynamicEnv.intensity = 1;
    /** 混合权重：0=完全显示envMap0，1=完全显示envMap1 */
    this._dynamicEnv.weight = 0;

    this._dynamicEnv.forceUpdate();

    // 设置为场景的环境贴图
    this.updateEnv();
  }

  private updateEnv(): void {
    if (this._dynamicEnv.envMap) {
      this._scene.environment = this._dynamicEnv.envMap;
      // this._scene.background = this._dynamicEnv.envMap; // scene.background = new THREE.Color(0, 0, 0)
    }
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
    state: EnvState, // dark / night / light
    duration: number = 1,
    ease: gsap.EaseString = 'power2.inOut',
    intensity: number = 1
  ): void {
    console.log('setState', state);
    // 停止所有正在进行的动画
    gsap.killTweensOf(this._dynamicEnv);

    let targetParams: { intensity: number; weight: number } = { intensity: 1, weight: 0 };

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
    });
  }

  /**
   * 更新环境贴图
   * 必须在每一帧渲染主场景之前调用
   */
  update(): void {
    const isUpdated = this._dynamicEnv.update();
    if (isUpdated) {
      this.updateEnv();
    }
  }

  /**
   * 释放所有资源
   */
  dispose(): void {
    this._dynamicEnv.dispose();
    if (this._scene.environment === this._dynamicEnv.envMap) {
      this._scene.environment = null;
    }
    if (this._scene.background === this._dynamicEnv.envMap) {
      this._scene.background = null;
    }
  }
}
