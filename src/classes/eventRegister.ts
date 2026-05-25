import * as THREE from 'three';
import { gsap, TimelineMax, Power3, Linear } from 'gsap';
import mitt, { Emitter } from 'mitt';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// 展示状态枚举
export enum ShowState {
  BeginAnim = 'BeginAnim',
  State1 = 'State1', // 正面视角
  State2 = 'State2', // 侧面视角
  State3 = 'State3', // 内饰视角
  State4 = 'State4', // 尾部视角
  State5 = 'State5', // 自定义颜色视角
}

// 环境状态枚举
export enum EnvState {
  night = 'night',
  light = 'light',
}

// 颜色表状态枚举
export enum ColorTableState {
  presetColorTable = 'presetColorTable',
  customColorTable = 'customColorTable',
}

// 事件类型定义
export type AppEvents = {
  UPDATESHOWINGSTATE: ShowState;
  CLICKEFFECT: boolean;
  PRESSED_STATE_CHANGED: { pressed: boolean; state: ShowState };
  UPDATECOLORTABLESTATE: ColorTableState;
  CHANGECOLOR: string;
};

// 颜色配置接口
export interface CarColorConfig {
  col: THREE.Color;
  tcar?: THREE.Texture;
  tw?: THREE.Texture;
  twr?: THREE.Texture;
  metal?: number;
  rough?: number;
  tf?: THREE.Texture;
}

// 全局Uniforms接口
export interface GlobalUniforms {
  u_floorLightMapIntensity: { value: number };
  u_car_envMapIntensity: { value: number };
  u_floorLightMapColor: { value: THREE.Color };
  u_floorReflectIntensity: { value: number };
  u_carMetalness: { value: number };
  u_carRoughness: { value: number };
  u_carColor: { value: THREE.Color };
  ut_white: { value: THREE.Texture };
  ut_dark: { value: THREE.Texture };
  ut_floorMap: { value: THREE.Texture };
  u_m_car_window_orignData: {
    color: THREE.Color;
    opacity: number;
    roughness: number;
  };
  sm_car: {
    meshData: {
      materials: {
        Car_body: THREE.MeshStandardMaterial;
        Car_window: THREE.MeshStandardMaterial;
      };
    };
    visible: boolean;
  };
  sm_car_lightbar: { visible: boolean };
  colors: Map<string, CarColorConfig>;
  getCustomParams: () => string | null;
  currentColorIndex: string;
}

// 环境控制器接口
export interface IEnvController {
  setState(state: EnvState, duration: number, easing: (t: number) => number): void;
}

// 弹簧相机控制器接口
export interface ISpringCameraController {
  enableControlCamera: boolean;
  targetFov: number;
  springlengthOffset: number;
  lerpStrength: number;
  moveSpeed: [number, number];

  gotoPOI(
    target: THREE.Vector3,
    distance: number,
    rotation: THREE.Euler,
    delay: number
  ): Promise<void>;

  setNewTarget(target: THREE.Vector3, distance: number, rotation: THREE.Euler): void;

  setNewRange(range?: [number, number]): void;
}

// 车灯控制器接口
export interface ICarLightController {
  lightValue: number;
}

// 顶灯控制器接口
export interface ITopLightController {
  opacity: number;
  lightEmissiveColor: THREE.Color;
  lightEmissiveIntensity: number;
}

// 车辆速度控制器接口
export interface ICarSpeedController {
  targetVelocity: number;
  lerpStrength: number;
  update(deltaTime: number): void;
}

// 配件管理器接口
export interface IAccessoriesManager {
  [key: string]: {
    show(duration?: number, delay?: number): void;
    hide(): void;
  };
}

// 投影探针接口
export interface IProjectionProbe {
  probeCenter: THREE.Vector3;
  probeBoxMax: THREE.Vector3;
  update(): void;
}

// 海报生成器接口
export interface IPosterGenerator {
  show(): void;
  hide(): void;
}

export class SceneEventManager {
  private eventBus: Emitter<AppEvents>;
  private uniforms: GlobalUniforms;

  private envController: IEnvController;
  private springCamera: ISpringCameraController;
  private carLightController: ICarLightController;
  private topLightController: ITopLightController;
  private carSpeedController: ICarSpeedController;
  private bloomPass: UnrealBloomPass;
  private projectionProbe: IProjectionProbe;
  private accessories: IAccessoriesManager;
  private environment: THREE.Texture;
  private posterGenerator: IPosterGenerator;

  private isPressed = false;
  private currentState = ShowState.BeginAnim;
  private lastColorIndex = '0';
  private hasTexture = false;

  constructor(
    eventBus: Emitter<AppEvents>,
    uniforms: GlobalUniforms,
    controllers: {
      envController: IEnvController;
      springCamera: ISpringCameraController;
      carLightController: ICarLightController;
      topLightController: ITopLightController;
      carSpeedController: ICarSpeedController;
      bloomPass: UnrealBloomPass;
      projectionProbe: IProjectionProbe;
      accessories: IAccessoriesManager;
      environment: THREE.Texture;
      posterGenerator: IPosterGenerator;
    }
  ) {
    this.eventBus = eventBus;
    this.uniforms = uniforms;

    this.envController = controllers.envController;
    this.springCamera = controllers.springCamera;
    this.carLightController = controllers.carLightController;
    this.topLightController = controllers.topLightController;
    this.carSpeedController = controllers.carSpeedController;
    this.bloomPass = controllers.bloomPass;
    this.projectionProbe = controllers.projectionProbe;
    this.accessories = controllers.accessories;
    this.environment = controllers.environment;
    this.posterGenerator = controllers.posterGenerator;
  }

  /**
   * 环境参数统一过渡函数
   * 对应原代码中的D函数
   */
  private transitionEnvironment(
    floorLightIntensity = 1,
    carEnvMapIntensity = 1,
    exposure = 1,
    topLightOpacity = 1,
    bloomSmoothing = 1.8
  ): void {
    // 停止所有相关动画
    gsap.killTweensOf(this.projectionProbe);
    gsap.killTweensOf(this.uniforms.u_floorLightMapIntensity);
    gsap.killTweensOf(this.uniforms.u_car_envMapIntensity);
    gsap.killTweensOf(this.environment);
    gsap.killTweensOf(this.topLightController);
    gsap.killTweensOf(this.bloomPass);

    // 投影探针动画
    gsap.timeline({ targets: this.projectionProbe }).to(
      {
        probeCenter: new THREE.Vector3(0, 0, 0),
        probeBoxMax: new THREE.Vector3(3.6, 3, 1.5),
      },
      1,
      {
        ease: Power3.easeInOut,
        onUpdate: () => this.projectionProbe.update(),
      }
    );

    // 地板光强
    gsap.to(this.uniforms.u_floorLightMapIntensity, {
      value: floorLightIntensity,
      duration: 1,
    });

    // 车辆环境光强
    gsap.to(this.uniforms.u_car_envMapIntensity, {
      value: carEnvMapIntensity,
      duration: 1.5,
      ease: Power3.easeInOut,
    });

    // 环境曝光
    gsap.to(this.environment, {
      exposure: exposure,
      duration: 1,
    });

    // 顶灯不透明度
    gsap.to(this.topLightController, {
      opacity: topLightOpacity,
      duration: 0.5,
    });

    // Bloom平滑度
    gsap.to(this.bloomPass, {
      luminanceSmoothing: bloomSmoothing,
      duration: 2,
    });
  }

  /**
   * 注册所有事件监听器
   */
  public registerAllEvents(): void {
    this.registerShowStateEvents();
    this.registerClickEffectEvents();
    this.registerColorChangeEvents();
  }

  /**
   * 注册展示状态切换事件
   */
  private registerShowStateEvents(): void {
    const black = new THREE.Color(0x000000);
    const green = new THREE.Color(0xc9d573);
    const white = new THREE.Color(0xffffff);
    const tempColor = new THREE.Color();
    const floorLightBaseColor = new THREE.Color();

    this.eventBus.on('UPDATESHOWINGSTATE', (state) => {
      // 隐藏所有配件
      Object.values(this.accessories).forEach((acc) => acc.hide());

      // 重置车辆速度
      this.carSpeedController.targetVelocity = 0;

      // 重置相机范围
      this.springCamera.setNewRange();

      // 保存当前地板光颜色
      floorLightBaseColor.copy(this.uniforms.u_floorLightMapColor.value);

      this.posterGenerator.hide();

      switch (state) {
        case ShowState.BeginAnim:
          this.handleBeginAnimation(black, green, white, tempColor, floorLightBaseColor);
          break;

        case ShowState.State1:
          this.springCamera.setNewTarget(
            new THREE.Vector3(0, 0.8, 0),
            7,
            new THREE.Euler(0, Math.PI * 0.5, 0)
          );
          this.transitionEnvironment();
          this.springCamera.targetFov = 33.4;
          break;

        case ShowState.State2:
          this.springCamera.setNewTarget(
            new THREE.Vector3(0, 0.8, 0),
            7,
            new THREE.Euler(0, -0.89, 0.1)
          );
          this.accessories.s2_b.show();
          this.springCamera.targetFov = 33.4;
          this.transitionEnvironment();
          break;

        case ShowState.State3:
          this.springCamera.setNewTarget(
            new THREE.Vector3(0.3, 0.8, 0),
            7,
            new THREE.Euler(0, 0.65, 0.1)
          );
          this.accessories.s3_b.show();
          this.springCamera.targetFov = 33.4;
          this.transitionEnvironment(0, 0, 10, 0, 0.5);

          // 调整投影探针位置
          gsap.killTweensOf(this.projectionProbe);
          gsap.timeline({ targets: this.projectionProbe }).to(
            {
              probeCenter: new THREE.Vector3(0, 0.5, 0),
              probeBoxMax: new THREE.Vector3(3.6, 1.6, 1.5),
            },
            1,
            {
              ease: Power3.easeInOut,
              onUpdate: () => this.projectionProbe.update(),
            }
          );
          break;

        case ShowState.State4:
          this.springCamera.setNewTarget(
            new THREE.Vector3(0.3, 0.8, 0),
            14,
            new THREE.Euler(0, Math.PI, 1.2)
          );
          this.springCamera.setNewRange([0.2, 1.3]);
          this.transitionEnvironment(0.2, 1, 3, 0, 1.5);
          this.springCamera.targetFov = 33.4;
          this.accessories.s4_b.show();
          break;

        case ShowState.State5:
          this.springCamera.setNewTarget(
            new THREE.Vector3(0.2, 0.8, 0),
            7,
            new THREE.Euler(0, -0.7, 0.03)
          );
          this.transitionEnvironment(1, 1, 1, 0, 1.8);
          this.springCamera.targetFov = 33.4;
          this.posterGenerator.show();
          break;
      }
    });
  }

  /**
   * 处理开场动画
   */
  private handleBeginAnimation(
    black: THREE.Color,
    green: THREE.Color,
    white: THREE.Color,
    tempColor: THREE.Color,
    floorLightBaseColor: THREE.Color
  ): void {
    // 环境状态切换
    gsap.killTweensOf(this.envController);
    gsap
      .timeline()
      .delay(1.5)
      .call(() => {
        this.envController.setState(EnvState.night, 2.5, Power3.easeIn);
        this.springCamera
          .gotoPOI(new THREE.Vector3(0, 0.8, 0), 7, new THREE.Euler(0, Math.PI * 0.5, 0), 4)
          .then(() => {
            const customParams = this.uniforms.getCustomParams();

            if (customParams === 'custom') {
              this.eventBus.emit('UPDATESHOWINGSTATE', ShowState.State5);
              this.eventBus.emit('UPDATECOLORTABLESTATE', ColorTableState.customColorTable);
            } else if (customParams) {
              this.eventBus.emit('UPDATESHOWINGSTATE', ShowState.State5);
              this.eventBus.emit('UPDATECOLORTABLESTATE', ColorTableState.presetColorTable);
            } else {
              this.eventBus.emit('UPDATESHOWINGSTATE', ShowState.State1);
            }

            this.springCamera.enableControlCamera = true;
          });
      })
      .delay(2.5)
      .call(() => {
        this.envController.setState(EnvState.light, 4, Power3.easeOut);
      });

    // 顶灯颜色渐变动画
    gsap.killTweensOf(this.topLightController);
    gsap
      .timeline({ targets: this.topLightController })
      .delay(1.5)
      .to({}, 2.5, {
        onUpdate: (_, progress) => {
          tempColor.copy(black).lerp(green, progress);
          this.topLightController.lightEmissiveColor = tempColor;
          this.topLightController.lightEmissiveIntensity = progress * 0.4;
        },
      })
      .to({}, 2, {
        onUpdate: (_, progress) => {
          tempColor.copy(green).lerpHSL(white, progress);
          this.topLightController.lightEmissiveColor = tempColor;
          this.topLightController.lightEmissiveIntensity = progress * 2.3 + 0.4;
        },
      });

    // 车灯渐亮
    gsap.killTweensOf(this.carLightController);
    gsap.to(this.carLightController, {
      lightValue: 1,
      duration: 1,
      delay: 1,
      ease: Power3.easeIn,
    });

    // 地板光颜色渐变
    gsap.killTweensOf(this.uniforms.u_floorLightMapIntensity);
    gsap
      .timeline({ targets: this.uniforms.u_floorLightMapIntensity })
      .delay(1.5)
      .to({ value: 0.1 }, 2.5, {
        ease: Power3.easeIn,
        onUpdate: (_, progress) => {
          tempColor.copy(floorLightBaseColor).lerpHSL(green, progress);
          this.uniforms.u_floorLightMapColor.value.copy(tempColor);
        },
      })
      .to({ value: 1 }, 2, {
        ease: Linear.easeNone,
        onUpdate: (_, progress) => {
          tempColor.copy(green).lerpHSL(white, progress);
          this.uniforms.u_floorLightMapColor.value.copy(tempColor);
        },
      });

    // 地板反射强度
    gsap.killTweensOf(this.uniforms.u_floorReflectIntensity);
    gsap
      .timeline({ targets: this.uniforms.u_floorReflectIntensity })
      .delay(1.8)
      .to({ value: 0.1 }, 1.5, { ease: Power3.easeIn })
      .to({ value: 1 }, 1.5, { ease: Linear.easeNone });
  }

  /**
   * 注册点击效果事件
   */
  private registerClickEffectEvents(): void {
    this.eventBus.on('CLICKEFFECT', (isPressed) => {
      // 防抖：只有状态变化时才触发
      if (this.isPressed === isPressed && this.currentState === this.eventBus.emit.toString) {
        return;
      }

      this.isPressed = isPressed;
      this.currentState = this.eventBus.emit.toString as unknown as ShowState; // 这里需要从状态管理获取

      this.eventBus.emit('PRESSED_STATE_CHANGED', {
        pressed: isPressed,
        state: this.currentState,
      });

      // 隐藏所有配件
      Object.values(this.accessories).forEach((acc) => acc.hide());

      switch (this.currentState) {
        case ShowState.State1:
          if (isPressed) {
            this.carSpeedController.targetVelocity = 8;
            this.carSpeedController.lerpStrength = 0.5;
            this.springCamera.targetFov = 60;
            this.springCamera.springlengthOffset = -3;
            this.springCamera.lerpStrength = 0.5;
            this.accessories.s1_c.show();
            this.accessories.s1_cpcl.show(0.5, 0.2);
            this.transitionEnvironment(0, 0.1, 1, 0, 0);

            // 降低金属度
            gsap.killTweensOf(this.uniforms.u_carMetalness);
            gsap.to(this.uniforms.u_carMetalness, {
              value: Math.max(0, this.uniforms.u_carMetalness.value - 0.3),
              duration: 0.8,
              ease: Power3.easeIn,
            });
          } else {
            this.carSpeedController.targetVelocity = 0;
            this.carSpeedController.lerpStrength = 1.5;
            this.springCamera.targetFov = 33.4;
            this.springCamera.lerpStrength = 1.5;
            this.springCamera.springlengthOffset = 0;
            this.transitionEnvironment();

            // 恢复金属度
            const currentColor = this.uniforms.colors.get(this.uniforms.currentColorIndex);
            gsap.killTweensOf(this.uniforms.u_carMetalness);
            gsap.to(this.uniforms.u_carMetalness, {
              value: currentColor?.metal ?? 0,
              duration: 1,
            });
          }
          break;

        case ShowState.State2:
          if (isPressed) {
            this.accessories.s2_c.show();
            this.springCamera.targetFov = 45;
            this.springCamera.lerpStrength = 0.5;
          } else {
            this.accessories.s2_b.show();
            this.springCamera.targetFov = 33.4;
            this.springCamera.lerpStrength = 0.5;
          }
          break;

        case ShowState.State3:
          if (isPressed) {
            this.accessories.s3_c.show(1, 0.2);
            this.springCamera.targetFov = 60;
            this.springCamera.springlengthOffset = -3;
            this.springCamera.lerpStrength = 1.5;
          } else {
            this.accessories.s3_b.show();
            this.springCamera.targetFov = 33.4;
            this.springCamera.springlengthOffset = 0;
            this.springCamera.lerpStrength = 1.5;
          }
          break;

        case ShowState.State4:
          if (isPressed) {
            this.carSpeedController.targetVelocity = 16;
            this.carSpeedController.lerpStrength = 0.5;
            this.accessories.s4_c.show();
            this.accessories.s4_cSC.show();
            this.accessories.s1_c.show();
            this.accessories.s1_cpcl.show(0.5, 0.2);
            this.springCamera.targetFov = 25;
            this.springCamera.lerpStrength = 1.5;
            this.springCamera.springlengthOffset = 20;
            this.springCamera.moveSpeed = [0.1, 0.1];
            this.transitionEnvironment(0.2, 0.3, 3, 0, 1.5);
          } else {
            this.carSpeedController.targetVelocity = 0;
            this.carSpeedController.lerpStrength = 1.5;
            this.springCamera.targetFov = 33.4;
            this.springCamera.lerpStrength = 1.5;
            this.springCamera.springlengthOffset = 0;
            this.springCamera.moveSpeed = [1, 1];
            this.accessories.s4_b.show();
            this.transitionEnvironment(0.2, 1, 3, 0, 1.5);
          }
          break;
      }
    });
  }

  /**
   * 注册颜色切换事件
   */
  private registerColorChangeEvents(): void {
    const black = new THREE.Color(0, 0, 0);

    this.eventBus.on('CHANGECOLOR', (colorIndex) => {
      // 控制警灯显示
      this.uniforms.sm_car_lightbar.visible = colorIndex === '11';

      const colorConfig = this.uniforms.colors.get(colorIndex);
      if (!colorConfig) return;

      const { col, tcar, tw, twr, metal, rough, tf } = colorConfig;
      const carBodyMaterial = this.uniforms.sm_car.meshData.materials.Car_body;
      const carWindowMaterial = this.uniforms.sm_car.meshData.materials.Car_window;

      // 设置车身纹理
      carBodyMaterial.map = tcar ? tcar : this.uniforms.ut_white.value;

      // 如果有纹理，车身颜色设为黑色
      if (tcar || this.hasTexture) {
        this.uniforms.u_carColor.value.copy(black);
      }
      this.hasTexture = !!tcar;

      // 颜色过渡动画（自定义颜色直接赋值不做动画）
      if (!(this.lastColorIndex === 'custom' && colorIndex === 'custom')) {
        gsap.killTweensOf(this.uniforms.u_carColor);
        gsap.to(this.uniforms.u_carColor, {
          value: col,
          duration: 0.2,
        });

        gsap.killTweensOf(this.uniforms.u_carRoughness);
        gsap.to(this.uniforms.u_carRoughness, {
          value: rough ?? 0,
          duration: 0.2,
        });

        gsap.killTweensOf(this.uniforms.u_carMetalness);
        gsap.to(this.uniforms.u_carMetalness, {
          value: metal ?? 0,
          duration: 0.2,
        });
      } else {
        this.uniforms.u_carColor.value.copy(col);
        this.uniforms.u_carRoughness.value = rough ?? 0;
        this.uniforms.u_carMetalness.value = metal ?? 0;
      }

      this.lastColorIndex = colorIndex;

      // 设置车窗纹理
      if (tw && twr) {
        carWindowMaterial.color = new THREE.Color(0xffffff).convertSRGBToLinear();
        carWindowMaterial.opacity = 1;
        carWindowMaterial.roughness = 1;
        carWindowMaterial.map = tw;
        carWindowMaterial.roughnessMap = twr;
        carWindowMaterial.metalnessMap = twr;
      } else {
        // 恢复默认车窗材质
        carWindowMaterial.color = this.uniforms.u_m_car_window_orignData.color;
        carWindowMaterial.opacity = this.uniforms.u_m_car_window_orignData.opacity;
        carWindowMaterial.roughness = this.uniforms.u_m_car_window_orignData.roughness;
        carWindowMaterial.map = this.uniforms.ut_white.value;
        carWindowMaterial.roughnessMap = this.uniforms.ut_dark.value;
        carWindowMaterial.metalnessMap = this.uniforms.ut_white.value;
      }

      // 设置地板反射纹理
      this.uniforms.ut_floorMap.value = tf ? tf : this.uniforms.ut_white.value;

      // 标记材质需要更新
      carBodyMaterial.needsUpdate = true;
      carWindowMaterial.needsUpdate = true;
    });
  }

  /**
   * 销毁所有事件监听器
   */
  public dispose(): void {
    this.eventBus.off('*');
    gsap.killTweensOf('*');
  }
}

import * as THREE from 'three';
import { gsap } from 'gsap';
import mitt from 'mitt';
import { SceneEventManager, AppEvents } from './SceneEventManager';

// 初始化事件总线
const eventBus = mitt<AppEvents>();

// 初始化全局Uniforms
const uniforms: GlobalUniforms = {
  // 填充你的Uniforms对象
};

// 初始化所有控制器
const controllers = {
  envController: new EnvController(),
  springCamera: new SpringCameraController(camera),
  carLightController: new CarLightController(carModel),
  topLightController: new TopLightController(scene),
  carSpeedController: new CarSpeedController(wheels),
  bloomPass: new UnrealBloomPass(),
  projectionProbe: new ProjectionProbe(renderer),
  accessories: new AccessoriesManager(scene),
  environment: environmentMap,
  posterGenerator: new PosterGenerator(renderer, camera),
};

// 创建事件管理器
const eventManager = new SceneEventManager(eventBus, uniforms, controllers);

// 注册所有事件
eventManager.registerAllEvents();

// 触发开场动画
eventBus.emit('UPDATESHOWINGSTATE', ShowState.BeginAnim);
