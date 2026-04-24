import * as THREE from 'three';
import { gsap } from 'gsap';
import QRCode from 'qrcode';
import { SceneManager } from './sceneManager';

// ==============================
// Viewer 类型定义
// ==============================
export interface Viewer {
  renderer: THREE.WebGLRenderer;
  size: { width: number; height: number };
  render(delta: number): void;
  on(event: string, callback: (...args: any[]) => void, context?: any): void;
  off(event: string, callback: (...args: any[]) => void, context?: any): void;
  targetOff(context: any): void;
}

// ==============================
// 项目配置（你自己改路径）
// ==============================
const ASSETS = {
  POSTER_BG: '/assets/poster-bg.png',
  GAMEMCU_LOGO: '/assets/logo.png',
  POSTER_FRAME: '/assets/poster-frame.png',
  QRCODE_PLACEHOLDER: '/assets/qr-placeholder.png',
};

const AppState = {
  generateCustomParams: () => 'https://gamemcu.com/your-link',
};

const RenderEvents = {
  RESIZE: 'resize',
  RENDER_AFTER: 'renderAfter',
};

// ==============================
// UI 网格
// ==============================
class UIMesh extends THREE.Mesh {
  public localUniforms: { map?: THREE.Texture } = { map: undefined };
  constructor(width: number, height: number) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    super(geometry, material);
  }
}

// ==============================
// 工具函数
// ==============================
function createCanvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  tex.flipY = false;
  return tex;
}

function loadTexture(url: string, isTransparent = false): THREE.Texture {
  const tex = new THREE.TextureLoader().load(url);
  tex.flipY = false;
  if (isTransparent) (tex as any).transparent = true;
  return tex;
}

// ==============================
// 核心：PosterGenerator（无报错版）
// ==============================
export class PosterGenerator {
  private _qrcode: any = null;
  private _qrcodeTexture!: THREE.CanvasTexture;

  private sceneManager: SceneManager | null = null;
  private _scene: THREE.Scene | null = null;
  private _camera!: THREE.OrthographicCamera;
  private _renderer!: THREE.WebGLRenderer;
  private _material!: THREE.MeshBasicMaterial;
  private _frontScene!: THREE.Scene;
  private _frontRenderer!: THREE.WebGLRenderer;
  private _hiddenObjects: THREE.Object3D[] = [];
  private _isSaving = false;
  private _canvasTexture!: THREE.CanvasTexture;

  private _carMesh!: UIMesh;

  public enabled = false;

  constructor(viewer: Viewer) {
    if (!this.sceneManager) {
      try {
        this.sceneManager = SceneManager.getInstance();
        this._scene = this.sceneManager.scene;
        this._renderer = this.sceneManager.renderer;
        this._camera = this.sceneManager.orthographicCamera;
      } catch (e) {
        console.error(e);
      }
    }
    this.init();
  }

  private init(): void {
    this._material = new THREE.MeshBasicMaterial({
      transparent: true,
      toneMapped: false,
      depthWrite: false,
      depthTest: false,
      map: new THREE.Texture(),
    });

    this._renderer.sortObjects = false;
    this._frontScene = new THREE.Scene();

    // 层 0
    const screenQuad = (this._carMesh = new UIMesh(1, 1));
    screenQuad.material = this._material;
    screenQuad.localUniforms.map = this._canvasTexture = createCanvasTexture(
      this._renderer.domElement
    );
    this._frontScene.add(screenQuad);
    this._hiddenObjects.push(screenQuad);

    // 层 1
    const posterBg = new UIMesh(500, (500 * 228) / 718);
    posterBg.material = this._material;
    posterBg.localUniforms.map = loadTexture(ASSETS.POSTER_BG);
    this._frontScene.add(posterBg);

    // 层 2
    const logo = new UIMesh(130, (130 * 53) / 187);
    logo.material = this._material;
    logo.localUniforms.map = loadTexture(ASSETS.GAMEMCU_LOGO, true);
    this._frontScene.add(logo);
    this._hiddenObjects.push(logo);

    // 层 3
    const posterFrame = new UIMesh(550, (550 * 118) / 729);
    posterFrame.material = this._material;
    posterFrame.localUniforms.map = loadTexture(ASSETS.POSTER_FRAME);
    this._frontScene.add(posterFrame);

    // 层 4
    const qrPlaceholder = new UIMesh(160, (160 * 330) / 256);
    qrPlaceholder.material = this._material;
    qrPlaceholder.localUniforms.map = loadTexture(ASSETS.QRCODE_PLACEHOLDER, true);
    this._frontScene.add(qrPlaceholder);
    this._hiddenObjects.push(qrPlaceholder);

    // 层 5
    const qrCodeMesh = new UIMesh(150, 150);
    qrCodeMesh.material = this._material;
    qrCodeMesh.localUniforms.map = this._qrcodeTexture = this._createQRCodeTexture();
    this._frontScene.add(qrCodeMesh);
    this._hiddenObjects.push(qrCodeMesh);

    this._hiddenObjects.forEach((m) => (m.visible = false));
    this._updateLayout();

    this._viewer.on(RenderEvents.RENDER_AFTER, this._onAfterRender, this);
  }

  show(): void {
    this.enabled = true;
    this._material.opacity = 0;
    gsap.to(this._material, {
      opacity: 1,
      duration: 1,
      ease: 'power2.inOut',
    });
  }

  hide(): void {
    this.enabled = false;
  }

  screenshot(): void {
    if (!this._frontRenderer) {
      this._frontRenderer = new THREE.WebGLRenderer({ alpha: true });
      this._frontRenderer.setPixelRatio(window.devicePixelRatio);
      // ✅ 修复 2：outputEncoding → outputColorSpace
      this._frontRenderer.outputColorSpace = this._viewer.renderer.outputColorSpace;
    }

    this._isSaving = true;
    this._viewer.render(0);
    this._canvasTexture.needsUpdate = true;
    this._isSaving = false;

    const r = this._viewer.size;
    this._hiddenObjects.forEach((h) => (h.visible = true));
    this._genQRCode(AppState.generateCustomParams());

    this._frontRenderer.setSize(r.width, r.height);
    this._frontRenderer.render(this._frontScene, this._camera);

    this._hiddenObjects.forEach((h) => (h.visible = false));

    const screenshotImg = document.getElementById('screenshot-img') as HTMLImageElement;
    if (screenshotImg) {
      const outputWidth = (1228.8 * r.width) / 1920;
      const outputHeight = (outputWidth * r.height) / r.width;
      screenshotImg.src = this._frontRenderer.domElement.toDataURL('image/png');
      screenshotImg.width = outputWidth;
      screenshotImg.height = outputHeight;
    }
  }

  private _onAfterRender = (): void => {
    if (this.enabled && !this._isSaving) {
      this._viewer.renderer.render(this._frontScene, this._camera);
    }
  };

  private _onResize = (width: number, height: number): void => {
    this._camera.left = -width / 2;
    this._camera.right = width / 2;
    this._camera.top = height / 2;
    this._camera.bottom = -height / 2;
    this._camera.updateProjectionMatrix();
    this._updateLayout();

    this._canvasTexture.dispose();
    this._canvasTexture = this._carMesh.localUniforms.map = createCanvasTexture(
      this._viewer.renderer.domElement
    );
  };

  private _updateLayout(): void {
    const r = this._viewer.size;
    const scale = r.width / 1920;
    const children = this._frontScene.children;

    children.forEach((el) => el.scale.set(scale, scale, scale));
    children[0].scale.set(r.width, r.height, 1);
    children[1].position.set(r.width * (-0.5 + 0.2), r.height * (0.5 - 0.2), 0);
    children[2].position.set(r.width * (-0.5 + 0.13), r.height * (-0.5 + 0.15), 0);
    children[3].position.set(r.width * (0.5 - 0.23), r.height * (-0.5 + 0.15), 0);
    children[4].position.set(r.width * (0.5 - 0.15), r.height * (0.5 - 0.2) - 23 * scale, 0);
    children[5].position.set(r.width * (0.5 - 0.15), r.height * (0.5 - 0.2), 0);
  }

  private _createQRCodeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    QRCode.toCanvas(canvas, 'https://gamemcu.com', { width: 256, margin: 1 });
    return createCanvasTexture(canvas);
  }

  private _genQRCode(url: string): void {
    const canvas = this._qrcodeTexture.image as HTMLCanvasElement;
    QRCode.toCanvas(canvas, url, { width: 256, margin: 1 });
    this._qrcodeTexture.needsUpdate = true;
  }

  destroy(): void {}
}
