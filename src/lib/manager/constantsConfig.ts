import { Color, Vector2, Vector3, Matrix4 } from 'three';

/**
 * 3D 场景全局配置（常量 + 主题色 + 工具方法）
 * 替代原来的 _O 类
 */
export class ConstantConfig {
  // ===================== 1. 单例模式（全局唯一） =====================
  private static _instance: ConstantConfig;
  static get instance(): ConstantConfig {
    if (!ConstantConfig._instance) ConstantConfig._instance = new ConstantConfig();
    return ConstantConfig._instance;
  }

  // ===================== 2. 基础常量 =====================
  readonly maxSpeed = 20;
  readonly speedUpDuration = 2;
  readonly LAYER_CAPTURE = 31;
  readonly LAYER_PLANE_REFLECT = 29;
  readonly lightUpTime = 2;

  // ===================== 3. 3D 模型引用 =====================
  sm_car: any = null;
  sm_size: any = null;
  sm_startroom: any = null;
  sm_speedup: any = null;
  sm_curvature: any = null;
  sm_windspeed: any = null;
  sm_linecar: any = null;
  sm_carradar: any = null;
  sm_simpleCar: any = null;
  sm_car_lightbar: any = null;

  // ===================== 4. Shader Uniform 贴图 =====================
  ut_car_body_ao = { value: null };
  ut_startroom_ao = { value: null };
  ut_startroom_light = { value: null };
  ut_floor_normal = { value: null };
  ut_floor_roughness = { value: null };
  ut_cubeCapture = { value: null };
  ut_blurCapture = { value: null };
  ut_saLine = { value: null };
  ut_street = { value: null };
  ut_scar_matcap = { value: null };
  ut_white = { value: null };
  ut_dark = { value: null };
  ut_floorMap = { value: null };

  // 主题专用贴图
  ut_car_body_t_gm = { value: null };
  ut_car_body_t_gm2 = { value: null };
  ut_gm02_car_window_bc = { value: null };
  ut_gm02_car_window_roughness = { value: null };
  ut_gm02_floor_bc = { value: null };
  ut_police_Car_body_BC = { value: null };
  ut_police_floor_bc = { value: null };
  ut_env_night = { value: null };
  ut_env_light = { value: null };

  // ===================== 5. Shader 全局控制变量 =====================
  u_time = { value: 0 };
  u_car_envMapIntensity = { value: 1 };
  u_floor_typeSwitch = { value: 0 };
  u_speedUpBackgroundValue = { value: 0 };
  u_car_discard = { value: 1 };
  u_speedTime = { value: 0 };
  u_floorLightMapIntensity = { value: 0 };
  u_floorLightMapColor = { value: new Color('#000000') };
  u_floorReflectIntensity = { value: 0 };
  u_floorUVOffset = { value: new Vector2() };
  u_simpleCarCenter1 = { value: new Vector3() };
  u_simpleCarCenter2 = { value: new Vector3() };
  u_policeColorChange = { value: 0 };

  u_reflect = {
    u_reflectTexture: { value: null },
    u_reflectMatrix: { value: new Matrix4() },
  };

  // 车窗原始数据
  u_m_car_window_orignData = {
    opacity: 0,
    roughness: 0,
    color: new Color(),
  };

  // ===================== 6. 颜色主题库（12 套） =====================
  colors = new Map<string, any>([
    [
      'custom',
      {
        col: new Color('#ffc03f').convertSRGBToLinear(),
        hsl: { h: 40.31 / 360, s: 1, l: 0.6235 },
        bgUrl: 'custom.png',
        rough: 0.03,
        metal: 0.1,
      },
    ],
    [
      '00',
      {
        col: new Color('#25d6e9').convertSRGBToLinear(),
        bgUrl: 'b1.png',
        metal: 0.16,
      },
    ],
    [
      '01',
      {
        col: new Color('#7c8670').convertSRGBToLinear(),
        bgUrl: 'b2.png',
        metal: 0.17,
      },
    ],
    [
      '02',
      {
        col: new Color('#9C9C9C').convertSRGBToLinear(),
        bgUrl: 'b3.png',
        metal: 0.16,
      },
    ],
    [
      '03',
      {
        col: new Color('#D9D9D9').convertSRGBToLinear(),
        bgUrl: 'b4.png',
      },
    ],
    [
      '04',
      {
        col: new Color('#7C6D83').convertSRGBToLinear(),
        bgUrl: 'b5.png',
        rough: 0.03,
        metal: 0.27,
      },
    ],
    [
      '05',
      {
        col: new Color('#d15523').convertSRGBToLinear(),
        bgUrl: 'b6.png',
        rough: 0.13,
      },
    ],
    [
      '06',
      {
        col: new Color('#7495be').convertSRGBToLinear(),
        bgUrl: 'b7.png',
      },
    ],
    [
      '07',
      {
        col: new Color('#54657f').convertSRGBToLinear(),
        bgUrl: 'b8.png',
        rough: 0.12,
        metal: 0.16,
      },
    ],
    [
      '08',
      {
        col: new Color('#2a2933').convertSRGBToLinear(),
        bgUrl: 'b9.png',
        metal: 0.77,
      },
    ],
    [
      '09',
      {
        col: new Color('#FFFFFF').convertSRGBToLinear(),
        bgUrl: 'b10.png',
        tcar: this.ut_car_body_t_gm,
      },
    ],
    [
      '10',
      {
        col: new Color('#FFFFFF').convertSRGBToLinear(),
        bgUrl: 'b12.png',
        rough: 0.7,
        metal: 0,
        tcar: this.ut_car_body_t_gm2,
        tw: this.ut_gm02_car_window_bc,
        twr: this.ut_gm02_car_window_roughness,
        tf: this.ut_gm02_floor_bc,
      },
    ],
    [
      '11',
      {
        col: new Color('#FFFFFF').convertSRGBToLinear(),
        bgUrl: 'b13.png',
        tcar: this.ut_police_Car_body_BC,
        tf: this.ut_police_floor_bc,
      },
    ],
  ]);

  // ===================== 7. 当前材质默认值 =====================
  u_carColor = { value: this.colors.get('00')!.col.clone() };
  u_carMetalness = { value: this.colors.get('00')!.metal };
  u_carRoughness = { value: 0 };

  // ===================== 工具方法 =====================

  /**
   * 从 URL 解析自定义颜色
   * 返回：custom / 00 / 01 ...
   */
  getCustomParams(): string {
    if (typeof window === 'undefined') return '00';

    const r = new URLSearchParams(window.location.search).get('v');
    if (r && r.length === 10) {
      const rough = parseInt(r.slice(6, 8), 16) / 255;
      const metal = parseInt(r.slice(8, 10), 16) / 255;
      const hex = r.slice(0, 6);

      const custom = this.colors.get('custom')!;
      if (rough) custom.rough = rough;
      if (metal) custom.metal = metal;
      if (hex) {
        const color = new Color(`#${hex}`);
        custom.col.copy(color);
        color.convertLinearToSRGB();
        color.getHSL(custom.hsl);
      }
      return 'custom';
    }

    if (r && r.includes('h') && r.length === 3) {
      return r.slice(1, 3);
    }

    return '00';
  }

  /**
   * 从 URL 解析自定义颜色
   * 返回：custom / 00 / 01 ...
   */

  generateCustomParams(currentColorIndex: string): string {
    const DEBUG = process.env.NODE_ENV === 'development';
    const base = DEBUG ? 'http://192.168.23.49:5173/su7?v=' : 'https://gamemcu.com/su7?v=';

    if (currentColorIndex === 'custom') {
      const custom = this.colors.get('custom')!;
      const rough = Math.round(custom.rough * 255)
        .toString(16)
        .padStart(2, '0');
      const metal = Math.round(custom.metal * 255)
        .toString(16)
        .padStart(2, '0');
      const hex = custom.col.getHexString();
      return base + hex + rough + metal;
    } else {
      return base + 'h' + currentColorIndex;
    }
  }
}

// 全局单例导出
export const SCENE_CONFIG = ConstantConfig.instance;
