import { Color, Vector2, Vector3, Matrix4 } from 'three';

export interface ColorThemeItem {
  col: Color;
  hsl?: { h: number; s: number; l: number };
  bgUrl: string;
  rough?: number;
  metal?: number;
  tcar?: any;
  tw?: any;
  twr?: any;
  tf?: any;
}

export interface TextureMapping {
  [key: string]: keyof typeof SCENE_CONFIG;
}

export const textureObj: TextureMapping = {
  t_saLine: 'ut_saLine',
  't_car_body_AO.raw': 'ut_car_body_ao',
  't_startroom_ao.raw': 'ut_startroom_ao',
  't_startroom_light.raw': 'ut_startroom_light',
  t_floor_normal: 'ut_floor_normal',
  t_floor_roughness: 'ut_floor_roughness',
  t_street: 'ut_street',
  t_scar_matcap: 'ut_scar_matcap',
  t_gm_car_body_bc: 'ut_car_body_t_gm',
  t_gm02_car_body_bc: 'ut_car_body_t_gm2',
  t_gm02_car_window_bc: 'ut_gm02_car_window_bc',
  t_gm02_car_window_roughness: 'ut_gm02_car_window_roughness',
  t_gm02_floor_bc: 'ut_gm02_floor_bc',
  t_police_Car_body_BC: 'ut_police_Car_body_BC',
  t_police_floor_bc: 'ut_police_floor_bc',
  t_env_night: 'ut_env_night',
  t_env_light: 'ut_env_light',
};

export interface UniformValue<T = any> {
  value: T;
}

export const SCENE_CONFIG = {
  // 基础常量
  maxSpeed: 20,
  speedUpDuration: 2,
  LAYER_CAPTURE: 31,
  LAYER_PLANE_REFLECT: 29,
  lightUpTime: 2,

  // 3D 模型引用
  sm_car: null as any,
  sm_size: null as any,
  sm_startroom: null as any,
  sm_speedup: null as any,
  sm_curvature: null as any,
  sm_windspeed: null as any,
  sm_linecar: null as any,
  sm_carradar: null as any,
  sm_simpleCar: null as any,
  sm_car_lightbar: null as any,

  // Shader Uniform 贴图
  ut_car_body_ao: { value: null } as UniformValue,
  ut_startroom_ao: { value: null } as UniformValue,
  ut_startroom_light: { value: null } as UniformValue,
  ut_floor_normal: { value: null } as UniformValue,
  ut_floor_roughness: { value: null } as UniformValue,
  ut_cubeCapture: { value: null } as UniformValue,
  ut_blurCapture: { value: null } as UniformValue,
  ut_saLine: { value: null } as UniformValue,
  ut_street: { value: null } as UniformValue,
  ut_scar_matcap: { value: null } as UniformValue,
  ut_white: { value: null } as UniformValue,
  ut_dark: { value: null } as UniformValue,
  ut_floorMap: { value: null } as UniformValue,

  // 主题专用贴图
  ut_car_body_t_gm: { value: null } as UniformValue,
  ut_car_body_t_gm2: { value: null } as UniformValue,
  ut_gm02_car_window_bc: { value: null } as UniformValue,
  ut_gm02_car_window_roughness: { value: null } as UniformValue,
  ut_gm02_floor_bc: { value: null } as UniformValue,
  ut_police_Car_body_BC: { value: null } as UniformValue,
  ut_police_floor_bc: { value: null } as UniformValue,
  ut_env_night: { value: null } as UniformValue,
  ut_env_light: { value: null } as UniformValue,

  // Shader 全局控制变量
  u_time: { value: 0 } as UniformValue<number>,
  u_car_envMapIntensity: { value: 1 } as UniformValue<number>,
  u_floor_typeSwitch: { value: 0 } as UniformValue<number>,
  u_speedUpBackgroundValue: { value: 0 } as UniformValue<number>,
  u_car_discard: { value: 1 } as UniformValue<number>,
  u_speedTime: { value: 0 } as UniformValue<number>,
  u_floorLightMapIntensity: { value: 0 } as UniformValue<number>,
  u_floorLightMapColor: { value: new Color('#000000') } as UniformValue<Color>,
  u_floorReflectIntensity: { value: 0 } as UniformValue<number>,
  u_floorUVOffset: { value: new Vector2() } as UniformValue<Vector2>,
  u_simpleCarCenter1: { value: new Vector3() } as UniformValue<Vector3>,
  u_simpleCarCenter2: { value: new Vector3() } as UniformValue<Vector3>,
  u_policeColorChange: { value: 0 } as UniformValue<number>,

  u_reflect: {
    u_reflectTexture: { value: null },
    u_reflectMatrix: { value: null },
  },

  // 车窗原始数据
  u_m_car_window_orignData: {
    opacity: 0,
    roughness: 0,
    color: new Color(),
  } as {
    opacity: number;
    roughness: number;
    color: Color;
  },

  colors: new Map<string, ColorThemeItem>([
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
        tcar: { value: null },
      },
    ],
    [
      '10',
      {
        col: new Color('#FFFFFF').convertSRGBToLinear(),
        bgUrl: 'b12.png',
        rough: 0.7,
        metal: 0,
        tcar: { value: null },
        tw: { value: null },
        twr: { value: null },
        tf: { value: null },
      },
    ],
    [
      '11',
      {
        col: new Color('#FFFFFF').convertSRGBToLinear(),
        bgUrl: 'b13.png',
        tcar: { value: null },
        tf: { value: null },
      },
    ],
  ]),

  u_carColor: { value: new Color() } as UniformValue<Color>,
  u_carMetalness: { value: 0 } as UniformValue<number>,
  u_carRoughness: { value: 0 } as UniformValue<number>,
};

const defaultTheme = SCENE_CONFIG.colors.get('00')!;
SCENE_CONFIG.u_carColor.value.copy(defaultTheme.col);
SCENE_CONFIG.u_carMetalness.value = defaultTheme.metal ?? 0;
SCENE_CONFIG.u_carRoughness.value = defaultTheme.rough ?? 0;

const color10 = SCENE_CONFIG.colors.get('10')!;
color10.tcar = SCENE_CONFIG.ut_car_body_t_gm2;
color10.tw = SCENE_CONFIG.ut_gm02_car_window_bc;
color10.twr = SCENE_CONFIG.ut_gm02_car_window_roughness;
color10.tf = SCENE_CONFIG.ut_gm02_floor_bc;

const color09 = SCENE_CONFIG.colors.get('09')!;
color09.tcar = SCENE_CONFIG.ut_car_body_t_gm;

const color11 = SCENE_CONFIG.colors.get('11')!;
color11.tcar = SCENE_CONFIG.ut_police_Car_body_BC;
color11.tf = SCENE_CONFIG.ut_police_floor_bc;

export function getCustomParams(): string {
  if (typeof window === 'undefined') return '00';

  const r = new URLSearchParams(window.location.search).get('v');
  if (r && r.length === 10) {
    const rough = parseInt(r.slice(6, 8), 16) / 255;
    const metal = parseInt(r.slice(8, 10), 16) / 255;
    const hex = r.slice(0, 6);

    const custom = SCENE_CONFIG.colors.get('custom')!;
    if (rough) custom.rough = rough;
    if (metal) custom.metal = metal;
    if (hex) {
      const color = new Color(`#${hex}`);
      custom.col.copy(color);
      color.convertLinearToSRGB();
      color.getHSL(custom.hsl!);
    }
    return 'custom';
  }

  if (r && r.includes('h') && r.length === 3) {
    return r.slice(1, 3);
  }

  return '00';
}

export function generateCustomParams(currentColorIndex: string): string {
  const DEBUG = process.env.NODE_ENV === 'development';
  const base = DEBUG ? 'http://192.168.23.49:5173/su7?v=' : 'https://gamemcu.com/su7?v=';

  if (currentColorIndex === 'custom') {
    const custom = SCENE_CONFIG.colors.get('custom')!;
    const rough = Math.round((custom.rough || 0) * 255)
      .toString(16)
      .padStart(2, '0');
    const metal = Math.round((custom.metal || 0) * 255)
      .toString(16)
      .padStart(2, '0');
    const hex = custom.col.getHexString();
    return base + hex + rough + metal;
  } else {
    return base + 'h' + currentColorIndex;
  }
}

export const ConstantConfig = {
  instance: SCENE_CONFIG,
};
