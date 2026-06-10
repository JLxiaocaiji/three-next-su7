import * as THREE from 'three';
import QRCode from 'qrcode';
import gsap from 'gsap';

import { eventBus } from '@/utils/eventBus';

const UI_SVGS = {
  topLeftWatermark: `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="708" height="223" viewBox="0 0 708 223" fill="none">
      <path d="M155.839 93.2234C140.396 89.3748 113.977 87.8351 92.3308 86.6804C80.7716 85.7822 70.6909 85.2051 64.4207 84.307C51.3763 82.5107 51.0537 69.6805 51.9542 63.1376C53.4395 54.4771 57.9019 46.4582 83.9974 43.4431C109.515 40.4281 164.428 50.628 179.22 53.2582C181.874 53.8355 183.36 53.2582 183.938 50.8846C185.423 41.3262 188.655 15.9867 188.655 15.9867C188.978 12.9717 187.493 10.919 184.522 10.0208C163.46 3.47748 120.113 -1.59041 84.2595 0.462399C57.25 1.93784 40.973 6.10765 27.5992 14.5113C5.95933 28.2395 -0.31087 48.2544 0.0117124 67.6275C0.334295 87.6423 8.3451 107.593 22.2363 117.794C35.2875 126.774 55.4422 128.506 80.7044 130.046C102.344 131.265 128.185 133.318 138.588 136.589C149.892 140.182 151.639 149.099 151.054 156.283C149.892 173.283 131.74 178.993 97.3712 178.993C68.621 178.993 47.2365 174.245 18.1704 170.332C14.9379 169.755 12.8075 170.332 12.5454 173.348L7.51176 210.041C7.18246 212.993 8.99698 215.43 11.0602 215.687C41.9407 221.332 73.0834 222.551 98.601 222.872C115.201 222.872 145.759 221.653 163.588 213.891C189.106 202.536 200.994 183.484 203.064 165.842C204.227 157.182 205.712 139.284 200.416 127.673C193.823 111.763 182.257 100.409 155.839 93.2234ZM457.273 3.99071L411.278 3.99071C409.208 3.99071 407.723 5.4661 407.723 7.26229L407.723 110.801C407.723 133.767 408.885 152.306 397.649 165.136C386.983 177.646 373.616 179.763 354.295 179.763C334.725 179.763 321.674 177.646 310.692 165.136C299.382 152.306 299.711 133.831 300.289 110.801L300.612 97.3938L300.612 7.26229C300.612 5.4661 299.126 3.99071 297.057 3.99071L251.384 3.99071C249.576 3.99071 248.152 5.4661 248.152 7.26229L248.152 110.801C248.152 148.136 250.222 179.121 271.284 200.034C291.761 220.306 317.541 223 354.362 223C390.861 223 415.478 221.204 436.54 200.612C457.017 180.019 460.243 148.072 460.243 110.801L460.243 7.26229C460.243 5.53026 459.02 3.99071 457.273 3.99071ZM704.384 3.99071L503.852 3.99071C501.789 3.99071 500.297 5.78688 500.297 7.58306L500.297 44.2771C500.297 46.3941 501.789 48.1261 503.852 48.1261L645.009 48.1261L639.458 58.2619C639.458 58.2619 573.886 168.664 550.432 213.441C549.524 215.559 550.432 218.83 552.824 218.83L604.182 218.83C606.252 218.83 609.8 218.253 610.708 216.457C638.873 168.408 682.482 91.4278 705.93 46.3941C706.837 44.2771 708 40.7489 708 36.2583L708 7.58306C708 5.78688 706.515 3.99071 704.384 3.99071Z" fill="#424242"/>
    </svg>
  `,
  bottomRightWatermark: `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="720.9970703125" height="115.619140625" viewBox="0 0 720.9970703125 115.619140625" fill="none">
      <path d="M718.183 4.7692L694.916 4.7692C693.911 4.7692 693.099 5.54187 693.099 6.50771L693.099 111.013C693.099 111.947 693.911 112.752 694.916 112.752L718.183 112.752C719.154 112.752 719.997 111.979 719.997 111.013L719.997 6.50771C719.997 5.54187 719.188 4.7692 718.183 4.7692ZM646.922 12.6892C637.459 4.02868 622.228 2.96628 609.914 2.96628C594.002 2.96628 583.858 6.31456 577.703 9.40532L573.425 9.40532C567.431 6.15361 556.802 2.96628 540.176 2.96628C527.861 2.96628 512.728 3.86773 503.427 11.5302C495.714 17.8726 493.934 26.3721 493.934 43.7573L493.934 110.916C493.934 111.85 494.743 112.655 495.748 112.655L519.015 112.655C520.02 112.655 520.829 111.882 520.829 110.916L520.829 110.691C520.829 110.691 520.829 68.2258 520.829 55.6375C520.829 45.6568 520.441 35.2579 522.612 31.3946C524.328 28.3682 526.988 25.0199 539.626 25.0199C554.695 25.0199 558.258 26.0502 560.625 32.6179C561.174 34.1633 561.467 36.3847 561.596 39.0892C561.596 42.341 561.596 48.007 561.596 61.4003L561.596 110.949C561.596 111.882 562.408 112.687 563.413 112.687L563.443 112.687L586.68 112.687L586.71 112.687C587.715 112.687 588.527 111.914 588.527 110.949L588.527 61.4003C588.527 48.0394 588.527 42.373 588.527 39.0892C588.655 36.3847 588.945 34.1954 589.498 32.6179C591.865 26.0502 595.428 25.0199 610.497 25.0199C623.135 25.0199 625.791 28.4004 627.511 31.3946C629.712 35.2579 629.294 45.6568 629.294 55.6375C629.294 68.2258 629.294 110.691 629.294 110.691L629.294 110.916C629.294 111.85 630.103 112.655 631.108 112.655L654.375 112.655C655.38 112.655 656.189 111.882 656.189 110.916L656.189 47.8462C656.158 29.817 655.541 20.577 646.922 12.6892ZM177.909 4.7692L154.642 4.7692C153.637 4.7692 152.827 5.54187 152.827 6.50771L152.827 111.013C152.827 111.947 153.637 112.752 154.642 112.752L177.909 112.752C178.881 112.752 179.724 111.979 179.724 111.013L179.724 6.50771C179.724 5.54187 178.914 4.7692 177.909 4.7692ZM80.0757 57.859L121.426 7.47359C122.333 6.37896 121.523 4.73697 120.097 4.73697L90.2834 4.73697C89.5704 4.73697 88.8901 5.05898 88.4687 5.63849L61.1503 41.2783L34.4806 5.67065C34.0592 5.09114 33.3786 4.7692 32.6656 4.7692L2.75503 4.7692C1.32915 4.7692 0.551443 6.37896 1.42641 7.47359L43.2949 58.7925L1.39397 110.047C0.519006 111.142 1.32915 112.752 2.75503 112.752L32.6332 112.752C33.3462 112.752 34.0592 112.398 34.4806 111.818L62.3818 76.3067L88.825 111.818C89.2464 112.398 89.927 112.719 90.64 112.719L120.162 112.719C121.587 112.719 122.365 111.11 121.49 110.015L80.0757 57.859ZM312.88 19.096C302.121 4.51163 282.678 0.100887 262.521 1.16332C242.073 2.25798 227.814 6.50771 224.185 7.85989C221.917 8.69698 222.208 10.6287 222.176 11.7555C222.078 15.619 221.787 24.6658 221.819 28.7224C221.819 30.4931 224.055 31.3302 225.935 30.6863C233.388 28.0785 247.161 23.9253 258.243 23.056C270.201 22.0902 286.858 23.3458 291.362 30.0102C293.631 33.3906 294.02 39.7008 294.344 45.0132C286.89 44.2404 275.386 42.9525 263.947 43.5641C255.392 44.0149 239.027 45.1096 229.402 50.1644C221.56 54.2853 216.958 57.9878 214.528 64.9417C212.551 70.5436 212.032 75.888 212.648 81.3612C214.074 93.853 218.481 100.067 224.444 104.413C233.842 111.27 245.702 114.877 270.234 114.329C302.866 113.621 311.454 103.254 315.796 95.8812C323.153 83.3254 321.889 63.5253 321.662 51.3555C321.5 46.3651 320.722 29.7526 312.88 19.096ZM291.978 85.6756C288.9 92.0499 277.363 92.9515 270.849 93.2734C258.827 93.821 249.526 93.0482 243.791 90.2793C239.999 88.4442 236.92 84.2909 236.693 79.4617C236.467 75.3732 237.05 72.9582 238.832 70.4472C242.883 64.6841 254.387 63.2998 265.729 62.8814C273.636 62.5914 285.918 63.493 294.603 64.5553C294.441 73.1194 293.76 81.9407 291.978 85.6756ZM405.79 2.7731C389.359 2.7731 372.864 4.8336 362.461 14.8785C352.058 24.9555 348.04 40.0872 348.04 58.6317C348.04 77.2083 351.637 92.0499 362.04 102.127C372.443 112.172 389.325 114.619 405.756 114.619C422.217 114.619 438.584 112.558 448.987 102.481C459.387 92.4043 463.503 77.1759 463.503 58.6317C463.503 40.0872 459.873 25.3097 449.439 15.2326C439.069 5.18773 422.217 2.7731 405.79 2.7731ZM431.488 86.2228C425.524 92.9194 414.7 94.1106 405.79 94.1106C396.877 94.1106 386.086 92.9194 380.122 86.2551C374.159 79.5585 373.737 70.4792 373.737 58.6637C373.737 46.8482 374.129 38.0266 380.092 31.3302C386.052 24.6336 395.646 23.4424 405.79 23.4424C415.93 23.4424 425.524 24.6014 431.488 31.3302C437.448 38.0266 437.839 46.8482 437.839 58.6637C437.839 70.4792 437.448 79.5261 431.488 86.2228Z" stroke="rgba(222, 222, 222, 1)" stroke-width="2"/>
    </svg>
  `,
};

export class ScreenshotManager {
  // 核心Three.js对象
  private _frontScene: THREE.Scene;
  private _camera: THREE.OrthographicCamera;
  private _frontRenderer: THREE.WebGLRenderer | null = null;
  private _carMaterial: THREE.MeshBasicMaterial;
  private _uiMaterials: THREE.MeshBasicMaterial[] = []; // 所有淡入淡出的UI材质

  private _canvasTexture: THREE.CanvasTexture | null = null;
  private _qrcodeTexture: THREE.CanvasTexture;
  private _carMesh: THREE.Mesh | null = null;
  private _hiddenObjects: THREE.Mesh[] = []; // 截图时显示
  public enabled: boolean = false;

  // 状态
  private _isSaving: boolean = false;
  private _qrcodeCanvas: HTMLCanvasElement;

  // 外部传入
  private _mainRenderer: THREE.WebGLRenderer;
  private _mainScene: THREE.Scene;
  private _mainCamera: THREE.Camera;

  private _showTimeline: gsap.core.Timeline | null = null;
  private _hideTimeline: gsap.core.Timeline | null = null;
  private size: { width: number; height: number } = { width: 0, height: 0 };

  private _boundOnResize = this._onResize.bind(this);

  constructor(mainRenderer: THREE.WebGLRenderer, mainScene: THREE.Scene, mainCamera: THREE.Camera) {
    this._mainRenderer = mainRenderer;
    this._mainScene = mainScene;
    this._mainCamera = mainCamera;

    this._frontScene = new THREE.Scene();
    this.size = this.getRendererSize();
    this._camera = new THREE.OrthographicCamera(
      -this.size.width / 2,
      this.size.width / 2,
      this.size.height / 2,
      -this.size.height / 2,
      0,
      1
    );

    this._canvasTexture = new THREE.CanvasTexture(this._mainRenderer.domElement);
    this._canvasTexture.colorSpace = THREE.SRGBColorSpace;

    // 初始化共享材质
    this._carMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      toneMapped: false,
      depthWrite: false,
      depthTest: false,
      map: this._canvasTexture,
      opacity: 0, // 初始隐藏
      name: 'car',
    });

    // 初始化二维码画布
    this._qrcodeCanvas = document.createElement('canvas');
    this._qrcodeCanvas.width = 256;
    this._qrcodeCanvas.height = 256;
    this._qrcodeTexture = new THREE.CanvasTexture(this._qrcodeCanvas);
    this._qrcodeTexture.colorSpace = THREE.SRGBColorSpace;
    // this._qrcodeTexture.magFilter = THREE.NearestFilter;
    // this._qrcodeTexture.minFilter = THREE.NearestFilter;
    // this._qrcodeTexture.generateMipmaps = false;

    // 初始化所有UI元素
    this._initUIElements();

    // 绑定事件
    window.addEventListener('resize', this._boundOnResize);
    // this._mainRenderer.render(this._frontScene, this._camera);
  }

  private loadTexture(source: string, isDirectUrl: boolean = false): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const texture = new THREE.Texture(image);
      texture.colorSpace = THREE.SRGBColorSpace;

      image.onload = () => {
        texture.needsUpdate = true;
        resolve(texture);
      };
      image.onerror = reject;

      if (isDirectUrl) {
        image.src = source;
      } else {
        image.src = 'data:image/svg+xml,' + encodeURIComponent(source);
      }
    });
  }

  private createMaterial(texture: THREE.Texture): THREE.MeshBasicMaterial {
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      toneMapped: false,
      depthWrite: false,
      depthTest: false,
      map: texture,
      opacity: 0, // 初始隐藏
    });
    this._uiMaterials.push(mat);
    return mat;
  }

  /**
   * 生成二维码
   */
  private async _generateQRCode(
    text: string = 'https://gamemcu.com/su7?FFFFFF1010'
  ): Promise<void> {
    try {
      await QRCode.toCanvas(this._qrcodeCanvas, text, {
        width: 256,
        margin: 0,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H' as const,
      });
      this._qrcodeTexture.needsUpdate = true;
    } catch (error) {
      console.error('二维码生成失败:', error);
    }
  }

  /**
   * 初始化所有UI元素（主画布、水印、logo、二维码）
   */
  private async _initUIElements(): Promise<void> {
    // 汽车画布
    this._carMesh = this.createMesh(new THREE.PlaneGeometry(1, 1), this._carMaterial, 'car');
    this._frontScene.add(this._carMesh);
    // this._hiddenObjects.push(this._carMesh);

    const [titleTexture, logoTexture, copyrightTexture, qrBgTexture] = await Promise.all([
      this.loadTexture(UI_SVGS.topLeftWatermark),
      this.loadTexture('/icon/gamemcu.webp', true),
      this.loadTexture(UI_SVGS.bottomRightWatermark),
      this.loadTexture('/icon/qrcode.webp', true),
    ]);

    // 顶部左侧水印
    // const titleTexture = this.loadTexture(UI_SVGS.topLeftWatermark);
    const titleMesh = this.createMesh(
      new THREE.PlaneGeometry(500, (500 * 228) / 718),
      this.createMaterial(titleTexture),
      'title'
    );
    this._frontScene.add(titleMesh);

    // 底部左侧logo
    // const logoTexture = this.loadTexture('/icon/gamemcu.webp', true);
    const logoMesh = this.createMesh(
      new THREE.PlaneGeometry(130, (130 * 53) / 187),
      this.createMaterial(logoTexture),
      'logo'
    );
    this._frontScene.add(logoMesh);
    this._hiddenObjects.push(logoMesh);

    // 底部右侧水印
    // const copyrightTexture = this.loadTexture(UI_SVGS.bottomRightWatermark);
    const copyrightMesh = this.createMesh(
      new THREE.PlaneGeometry(550, (550 * 118) / 729),
      this.createMaterial(copyrightTexture),
      'copyright'
    );
    this._frontScene.add(copyrightMesh);

    // 二维码背景
    // const qrBgTexture = this.loadTexture('/icon/qrcode.webp', true);
    const qrBgMesh = this.createMesh(
      new THREE.PlaneGeometry(160, (160 * 330) / 256),
      this.createMaterial(qrBgTexture),
      'qrBg'
    );
    this._frontScene.add(qrBgMesh);
    this._hiddenObjects.push(qrBgMesh);

    // 二维码平面
    const qrMesh = this.createMesh(
      new THREE.PlaneGeometry(150, 150),
      this.createMaterial(this._qrcodeTexture),
      'qr'
    );
    await this._generateQRCode();
    this._frontScene.add(qrMesh);
    this._hiddenObjects.push(qrMesh);

    // 初始不展示
    this._hiddenObjects.forEach((obj) => (obj.visible = false));

    this._updateLayout();
  }

  /**
   * 启用截图管理器（显示UI层，带GSAP淡入动画）
   */
  show(duration: number = 1): void {
    this.enabled = true;
    this._carMaterial.opacity = 1;

    // 先停止所有正在进行的隐藏动画
    if (this._hideTimeline) {
      this._hideTimeline.kill();
      this._hideTimeline = null;
    }

    this._showTimeline = gsap.timeline();

    this._uiMaterials.forEach((mat) => {
      this._showTimeline!.to(
        mat,
        {
          opacity: 1,
          duration: duration,
          ease: 'cubic.inOut',
        },
        0
      );
    });
  }

  hide(duration: number = 0.5): void {
    if (this._showTimeline) {
      this._showTimeline.kill();
      this._showTimeline = null;
    }

    // 创建隐藏动画
    this._hideTimeline = gsap.timeline({
      onComplete: () => {
        this._hideTimeline = null;
        this.enabled = false;
      },
    });

    this._uiMaterials.forEach((mat) => {
      this._hideTimeline!.to(
        mat,
        {
          opacity: 0,
          duration: duration,
          ease: 'cubic.inOut',
        },
        0
      );
    });
  }

  /**
   * 执行截图并生成带水印和二维码的图片
   * @param url 二维码包含的自定义参数
   */
  async screenshot(url: string = 'https://gamemcu.com/su7?FFFFFF1010'): Promise<void> {
    this._isSaving = true;

    this.size = this.getRendererSize();

    // 暂停UI淡入淡出动画
    if (this._showTimeline) this._showTimeline.pause();
    if (this._hideTimeline) this._hideTimeline.pause();

    this._uiMaterials.forEach((m) => (m.opacity = 1));
    this._carMaterial.opacity = 1; // 背景车平面可见

    if (!this._frontRenderer) {
      this._frontRenderer = new THREE.WebGLRenderer({
        preserveDrawingBuffer: true, // 必须开启，否则toDataURL会得到空白
        antialias: true,
        alpha: true,
      });
      this._frontRenderer.setPixelRatio(window.devicePixelRatio);
      this._frontRenderer.outputColorSpace = this._mainRenderer.outputColorSpace;
    }

    this._frontRenderer.setSize(this.size.width, this.size.height);

    this._mainRenderer.render(this._mainScene, this._mainCamera);
    this._canvasTexture!.needsUpdate = true;

    // 生成二维码
    await this._generateQRCode(url);

    // 显示所有隐藏的UI元素
    this._hiddenObjects.forEach((obj) => (obj.visible = true));

    this._frontRenderer.render(this._frontScene, this._camera);

    // 恢复UI元素原始可见性
    this._hiddenObjects.forEach((obj) => {
      obj.visible = false;
    });

    this._carMaterial.opacity = 0;
    const picUrl = this._frontRenderer.domElement.toDataURL('image/png');
    const width = (1228.8 * this.size.width) / 1920;
    const height = (width * this.size.height) / this.size.width;

    this._isSaving = false;

    if (this._showTimeline) this._showTimeline.resume();
    if (this._hideTimeline) this._hideTimeline.resume();

    eventBus.emit('ScreenshotManager:complete', { picUrl, width, height, visible: true });
  }

  /**
   * 每帧渲染UI层（需在主渲染循环中调用）
   */
  render(): void {
    if (this.enabled && !this._isSaving && this._carMaterial.opacity > 0) {
      this._canvasTexture!.needsUpdate = true;

      // 保存主渲染器的自动清除状态
      const autoClear = this._mainRenderer.autoClear;
      this._mainRenderer.autoClear = false;
      this._canvasTexture!.needsUpdate = true;
      // 渲染UI层在主场景之上
      this._mainRenderer.render(this._frontScene, this._camera);
      // 恢复自动清除状态
      this._mainRenderer.autoClear = autoClear;
    }
  }

  private createMesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    name: string
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;

    return mesh;
  }

  /**
   * 窗口大小变化处理
   */
  private _onResize(): void {
    this.size = this.getRendererSize();
    // 更新相机
    this._camera.left = -this.size.width / 2;
    this._camera.right = this.size.width / 2;
    this._camera.top = this.size.height / 2;
    this._camera.bottom = -this.size.height / 2;
    this._camera.updateProjectionMatrix();

    // 更新主画布纹理
    if (this._canvasTexture) {
      this._canvasTexture.needsUpdate = true;
    }
    // this._carMesh!.localUniforms.map = this._canvasTexture;
    if (this._carMesh) {
      this._carMesh.scale.set(this.size.width, this.size.height, 1);
    }

    // 更新所有UI元素布局
    this._updateLayout();
  }

  /**
   * 更新UI元素布局（响应式）
   */
  private _updateLayout(): void {
    const scale = this.size.width / 1920; // 基于1920px宽度的缩放比例

    this._frontScene.children.forEach((child) => {
      child.scale.set(scale, scale, scale);

      switch (child.name) {
        case 'car': // 主画布
          child.scale.set(this.size.width, this.size.height, 1);
          break;
        case 'title': // 顶部左侧水印
          child.position.set(this.size.width * (-0.5 + 0.2), this.size.height * (0.5 - 0.2), 0);
          break;
        case 'logo': // 底部左侧logo
          child.position.set(this.size.width * (-0.5 + 0.13), this.size.height * (-0.5 + 0.15), 0);
          break;
        case 'copyright': // 底部右侧水印
          child.position.set(this.size.width * (0.5 - 0.23), this.size.height * (-0.5 + 0.15), 0);
          break;
        case 'qrBg': // 二维码背景
          child.position.set(
            this.size.width * (0.5 - 0.15),
            this.size.height * (0.5 - 0.2) - 23 * scale,
            0
          );
          break;
        case 'qr': // 二维码
          child.position.set(this.size.width * (0.5 - 0.15), this.size.height * (0.5 - 0.2), 0);
          break;
      }
    });
  }

  /**
   * 获取主渲染器尺寸
   */
  private getRendererSize(): { width: number; height: number } {
    const canvas = this._mainRenderer.domElement;
    return {
      width: canvas.clientWidth,
      height: canvas.clientHeight,
    };
  }

  get material(): THREE.MeshBasicMaterial {
    return this._carMaterial;
  }

  get _enabled(): boolean {
    return this.enabled;
  }

  /**
   * 销毁资源和所有动画
   */
  dispose(): void {
    window.removeEventListener('resize', this._boundOnResize);
    if (this._showTimeline) this._showTimeline.kill();
    if (this._hideTimeline) this._hideTimeline.kill();

    this._carMaterial.dispose();
    this._canvasTexture?.dispose();
    this._qrcodeTexture.dispose();

    this._frontRenderer?.dispose();

    this._frontScene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this._uiMaterials.forEach((tex) => tex.dispose());
    this._uiMaterials = [];
  }
}
