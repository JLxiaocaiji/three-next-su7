import * as THREE from 'three';
import { SceneManager } from '@/lib/manager/sceneManager';

const MAX_MIP = 7;

const BlurCubeShader = {
  fragmentShader: `
    uniform samplerCube tLast;
    uniform samplerCube tBlur;
    uniform float uLod;
    uniform float uWeight;
    uniform float uExposure;
    uniform int uFace;
    varying vec2 vUv;

    vec3 uvToXYZ(int face, vec2 uv) {
      if(face == 0) return vec3(1.0, uv.y, -uv.x);
      else if(face == 1) return vec3(-1.0, uv.y, uv.x);
      else if(face == 2) return vec3(uv.x, -1.0, uv.y);
      else if(face == 3) return vec3(uv.x, 1.0, -uv.y);
      else if(face == 4) return vec3(uv.x, uv.y, 1.0);
      else return vec3(-uv.x, uv.y, -1.0);
    }

    vec3 uvToDir(vec2 uv) {
      vec3 dir = normalize(uvToXYZ(uFace, uv * 2.0 - 1.0));
      dir.y = -dir.y;
      return dir;
    }

    void main() {
      vec3 dir = uvToDir(vUv);
      vec3 col0 = textureLod(tLast, dir, 0.0).rgb;
      vec3 col1 = textureLod(tBlur, dir, uLod).rgb * uExposure;
      gl_FragColor = vec4(mix(col0, col1, uWeight), 1.0);
    }
  `,
  vertexShader: `
    varying vec2 vUv;
    void main() {
        vUv = position.xy * 0.5 + 0.5;
        gl_Position = vec4(position.xy, 1.0, 1.0);
    }
  `,
};

export class MipBlurPass {
  private _renderer: THREE.WebGLRenderer;
  private _cubeRT: THREE.WebGLCubeRenderTarget;
  private _mipmapRenderTargets: THREE.WebGLCubeRenderTarget[] = [];
  private _blurMaterial: THREE.ShaderMaterial;
  private sceneManager: SceneManager | null = null;

  private _fullscreenMesh: THREE.Mesh;
  private _fullscreenCamera: THREE.Camera;
  private _fullscreenScene: THREE.Scene;

  public blurTexture: THREE.CubeTexture | null = null;
  public blurIntensity = 2;
  public exposure = 1;

  private _blurIntensityCache = -1;
  private _sigma = 2;
  private _minLod = 0;
  private _maxLod = 7;

  constructor(renderer: THREE.WebGLRenderer, cubeRT: THREE.WebGLCubeRenderTarget) {
    this._renderer = renderer;
    this._cubeRT = cubeRT;
    this._fullscreenScene = new THREE.Scene();

    const fullscreenGeometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]);
    const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]);
    fullscreenGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    fullscreenGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this._fullscreenMesh = new THREE.Mesh(fullscreenGeometry);
    this._fullscreenScene.add(this._fullscreenMesh);

    this._fullscreenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const size = Math.min(256, cubeRT.width);

    this.sceneManager = SceneManager.getInstance();

    // 创建各级 mipmap RT
    for (let i = 0; i <= MAX_MIP; i++) {
      const rtSize = size >> i;
      this._mipmapRenderTargets.push(
        this.sceneManager.createCubeRenderTarget(rtSize, false, THREE.HalfFloatType, 0, false)
      );
    }

    // 模糊材质
    this._blurMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tLast: { value: null },
        tBlur: { value: null },
        uWeight: { value: 0 },
        uLod: { value: 0 },
        uFace: { value: 0 },
        uExposure: { value: 1 },
      },
      vertexShader: BlurCubeShader.vertexShader,
      fragmentShader: BlurCubeShader.fragmentShader,
      blending: THREE.NoBlending,
      toneMapped: false,
      depthWrite: false,
      depthTest: false,
    });

    // 初始化一个占位纹理，方便外部直接使用
    // this.blurTexture = this._mipmapRenderTargets[0].texture;
  }

  update(): void {
    this._updateLod();

    let currentLod = this._maxLod;

    // 第一层模糊
    for (let face = 0; face < 6; face++) {
      this._renderBlur(
        this._mipmapRenderTargets[currentLod],
        null,
        this._cubeRT.texture,
        1,
        currentLod,
        face
      );
    }

    // 向下迭代模糊 mip 链
    // maxLod = this._maxLod - 1; maxLod >= this._minLod; maxLod--
    while (currentLod-- > this._minLod) {
      const weight = this._gaussianWeight(this._sigma, currentLod);
      for (let face = 0; face < 6; face++) {
        this._renderBlur(
          this._mipmapRenderTargets[currentLod],
          this._mipmapRenderTargets[currentLod + 1].texture,
          this._cubeRT.texture,
          weight,
          currentLod,
          face
        );
      }
    }

    // 更新最终输出的纹理引用
    this.blurTexture = this._mipmapRenderTargets[currentLod + 1].texture;
  }

  dispose(): void {
    this._mipmapRenderTargets.forEach((rt) => rt.dispose());
    this._blurMaterial.dispose();
  }

  // 更新模糊参数
  private _updateLod(): void {
    if (this._blurIntensityCache === this.blurIntensity) return;

    this._blurIntensityCache = this.blurIntensity;
    this._sigma = THREE.MathUtils.lerp(1, 40, this.blurIntensity / 10);
    // this._minLod = 0;
    // this._maxLod = MAX_MIP;

    for (let lod = 0; lod <= MAX_MIP; lod++) {
      const w = this._gaussianWeight(this._sigma, lod);
      if (w < 0.002) this._minLod = lod;
      if (w >= 1) {
        this._maxLod = lod;
        break;
      }
    }
  }

  // 高斯权重
  private _gaussianWeight(sigma: number, lod: number): number {
    const sigmaSq = sigma * sigma;
    const twoPiSigmaSq = 2 * Math.PI * sigmaSq; // 2162.0597721637637
    const pow16Lod = Math.pow(16, lod) * 1.386294361; // ln(4) ≈ 1.386294  Math.log(4)
    const denominator = twoPiSigmaSq * (Math.pow(4, lod) + twoPiSigmaSq);
    return THREE.MathUtils.clamp(pow16Lod / denominator, 0, 1);
  }

  // 渲染单个面模糊
  private _renderBlur(
    target: THREE.WebGLCubeRenderTarget,
    lastTex: THREE.Texture | null,
    blurTex: THREE.Texture,
    weight: number,
    lod: number,
    face: number
  ): void {
    // this._blurMaterial.uniforms.tLast.value = lastTex;
    this._blurMaterial.uniforms.tLast.value = lastTex !== null ? lastTex : blurTex;

    this._blurMaterial.uniforms.tBlur.value = blurTex;
    this._blurMaterial.uniforms.uWeight.value = weight;
    this._blurMaterial.uniforms.uLod.value = lod;
    this._blurMaterial.uniforms.uFace.value = face;
    this._blurMaterial.uniforms.uExposure.value = this.exposure;

    this._renderToCubeFace(target, this._blurMaterial, face);
  }

  // 渲染到立方体贴图的一个面
  private _renderToCubeFace(
    target: THREE.WebGLCubeRenderTarget,
    material: THREE.Material,
    face: number
  ): void {
    this._fullscreenMesh.material = material;
    this._renderer.setRenderTarget(target, face);
    this._renderer.render(this._fullscreenScene, this._fullscreenCamera);
    this._renderer.setRenderTarget(null);
  }
}
