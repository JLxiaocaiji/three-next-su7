import { Color, Vector2, Vector3, Matrix4, Texture, WebGLRenderTarget, CubeTexture } from 'three';

type DirectionKeys = 'UNIT_X' | 'UNIT_Y' | 'UNIT_Z' | 'RIGHT' | 'UP' | 'ZERO' | 'ONE' | 'NEG_ONE';

class SceneConfig {
  // 基础配置
  public maxSpeed: number;
  public speedUpDuration: number;
  public LAYER_CAPTURE: number;
  public LAYER_PLANE_REFLECT: number;
  public lightUpTime: number;

  // 模型/材质对象
  public sm_car: any;
  public sm_size: any;
  public sm_startroom: any;
  public sm_speedup: any;
  public sm_curvature: any;
  public sm_windspeed: any;
  public sm_linecar: any;
  public sm_carradar: any;
  public sm_simpleCar: any;
  public sm_car_lightbar: any;

  // 纹理 Uniform
  public ut_car_body_ao: { value: Texture | null };
  public ut_startroom_ao: { value: Texture | null };
  public ut_startroom_light: { value: Texture | null };
  public ut_floor_normal: { value: Texture | null };
  public ut_floor_roughness: { value: Texture | null };
  public ut_cubeCapture: { value: CubeTexture | null };
  public ut_blurCapture: { value: CubeTexture | null };
  public ut_saLine: { value: Texture | null };
  public ut_street: { value: Texture | null };
  public ut_scar_matcap: { value: Texture | null };
  public ut_white: { value: Texture | null };
  public ut_dark: { value: Texture | null };
  public ut_floorMap: { value: Texture | null };
  public ut_car_body_t_gm: { value: Texture | null };
  public ut_car_body_t_gm2: { value: Texture | null };
  public ut_gm02_car_window_bc: { value: Texture | null };
  public ut_gm02_car_window_roughness: { value: Texture | null };
  public ut_gm02_floor_bc: { value: Texture | null };
  public ut_police_Car_body_BC: { value: Texture | null };
  public ut_police_floor_bc: { value: Texture | null };
  public ut_env_night: { value: CubeTexture | null };
  public ut_env_light: { value: Texture | null };

  // Shader Uniforms
  public u_time: { value: number };
  public u_car_envMapIntensity: { value: number };
  public u_floor_typeSwitch: { value: number };
  public u_speedUpBackgroundValue: { value: number };
  public u_car_discard: { value: number };
  public u_speedTime: { value: number };
  public u_floorLightMapIntensity: { value: number };
  public u_floorLightMapColor: { value: Color };
  public u_floorReflectIntensity: { value: number };
  public u_floorUVOffset: { value: Vector2 };
  public u_simpleCarCenter1: { value: Vector3 };
  public u_simpleCarCenter2: { value: Vector3 };
  public u_policeColorChange: { value: number };

  // 反射配置
  public u_reflect: {
    u_reflectTexture: { value: Texture | null };
    u_reflectMatrix: { value: Matrix4 | null };
  };

  // 车窗配置
  public u_m_car_window_orignData: {
    opacity: number;
    roughness: number;
    color: Color;
  };

  // 颜色系统
  public colors: Map<string, ColorThemeItem | CustomColor>;
  public u_carColor: { value: Color };
  public u_carMetalness: { value: number };
  public u_carRoughness: { value: number };
  public positionDirction: Record<DirectionKeys, Vector3>;

  public audioList: Array<{ key: string; url: string }>;

  constructor() {
    // 初始化基础参数
    this.maxSpeed = 20;
    this.speedUpDuration = 2;
    this.LAYER_CAPTURE = 31;
    this.LAYER_PLANE_REFLECT = 29;
    this.lightUpTime = 2;

    // 初始化纹理 Uniform
    this.ut_car_body_ao = { value: null };
    this.ut_startroom_ao = { value: null };
    this.ut_startroom_light = { value: null };
    this.ut_floor_normal = { value: null };
    this.ut_floor_roughness = { value: null };
    this.ut_cubeCapture = { value: null };
    this.ut_blurCapture = { value: null };
    this.ut_saLine = { value: null };
    this.ut_street = { value: null };
    this.ut_scar_matcap = { value: null };
    this.ut_white = { value: null };
    this.ut_dark = { value: null };
    this.ut_floorMap = { value: null };
    this.ut_car_body_t_gm = { value: null };
    this.ut_car_body_t_gm2 = { value: null };
    this.ut_gm02_car_window_bc = { value: null };
    this.ut_gm02_car_window_roughness = { value: null };
    this.ut_gm02_floor_bc = { value: null };
    this.ut_police_Car_body_BC = { value: null };
    this.ut_police_floor_bc = { value: null };
    this.ut_env_night = { value: null };
    this.ut_env_light = { value: null };

    // 初始化 Shader 参数
    this.u_time = { value: 0 };
    this.u_car_envMapIntensity = { value: 1 };
    this.u_floor_typeSwitch = { value: 0 };
    this.u_speedUpBackgroundValue = { value: 0 };
    this.u_car_discard = { value: 1 };
    this.u_speedTime = { value: 0 };

    // 变化值
    this.u_floorLightMapIntensity = { value: 0 };
    this.u_floorLightMapColor = { value: new Color('#000000') };
    this.u_floorReflectIntensity = { value: 0 };
    this.u_floorUVOffset = { value: new Vector2() };
    this.u_simpleCarCenter1 = { value: new Vector3() };
    this.u_simpleCarCenter2 = { value: new Vector3() };
    this.u_policeColorChange = { value: 0 };

    // 反射配置
    this.u_reflect = {
      u_reflectTexture: { value: null },
      u_reflectMatrix: { value: null },
    };

    // 车窗原始数据
    this.u_m_car_window_orignData = {
      opacity: 0,
      roughness: 0,
      color: new Color(),
    };

    // 颜色配置表
    this.colors = new Map<string, ColorThemeItem | CustomColor>([
      [
        'custom',
        {
          // col: new Color('#ffc03f').convertSRGBToLinear(),
          col: new Color('#ffc03f'),
          hsl: { h: 40.31 / 360, s: 1, l: 0.6235 },
          bgUrl: 'custom.webp',
          rough: 0.03,
          metal: 0.1,
        },
      ],
      [
        '00',
        {
          // col: new Color('#25d6e9').convertSRGBToLinear(),
          col: new Color('#25d6e9'),
          bgUrl: 'b1.webp',
          metal: 0.16,
        },
      ],
      [
        '01',
        {
          // col: new Color('#7c8670').convertSRGBToLinear(),
          col: new Color('#7c8670'),
          bgUrl: 'b2.webp',
          metal: 0.17,
        },
      ],
      [
        '02',
        {
          // col: new Color('#9C9C9C').convertSRGBToLinear(),
          col: new Color('#9C9C9C'),
          bgUrl: 'b3.webp',
          metal: 0.16,
        },
      ],
      [
        '03',
        {
          // col: new Color('#D9D9D9').convertSRGBToLinear(),
          col: new Color('#D9D9D9'),
          bgUrl: 'b4.webp',
        },
      ],
      [
        '04',
        {
          // col: new Color('#7C6D83').convertSRGBToLinear(),
          col: new Color('#7C6D83'),
          bgUrl: 'b5.webp',
          rough: 0.03,
          metal: 0.27,
        },
      ],
      [
        '05',
        {
          // col: new Color('#d15523').convertSRGBToLinear(),
          col: new Color('#d15523'),
          bgUrl: 'b6.webp',
          rough: 0.13,
        },
      ],
      [
        '06',
        {
          // col: new Color('#7495be').convertSRGBToLinear(),
          col: new Color('#7495be'),
          bgUrl: 'b7.webp',
        },
      ],
      [
        '07',
        {
          // col: new Color('#54657f').convertSRGBToLinear(),
          col: new Color('#54657f'),
          bgUrl: 'b8.webp',
          rough: 0.12,
          metal: 0.16,
        },
      ],
      [
        '08',
        {
          // col: new Color('#2a2933').convertSRGBToLinear(),
          col: new Color('#2a2933'),
          bgUrl: 'b9.webp',
          metal: 0.77,
        },
      ],
      [
        '09',
        {
          // col: new Color('#FFFFFF').convertSRGBToLinear(),
          col: new Color('#FFFFFF'),
          bgUrl: 'b10.webp',
          carCover: this.ut_car_body_t_gm,
        },
      ],
      [
        '10',
        {
          // col: new Color('#FFFFFF').convertSRGBToLinear(),
          col: new Color('#FFFFFF'),
          bgUrl: 'b12.webp',
          rough: 0.7,
          metal: 0,
          carCover: this.ut_car_body_t_gm2,
          carWindowFilm: this.ut_gm02_car_window_bc,
          carWindowRoughness: this.ut_gm02_car_window_roughness,
          floorMap: this.ut_gm02_floor_bc,
        },
      ],
      [
        '11',
        {
          // col: new Color('#FFFFFF').convertSRGBToLinear(),
          col: new Color('#FFFFFF'),
          bgUrl: 'b13.webp',
          carCover: this.ut_police_Car_body_BC,
          floorMap: this.ut_police_floor_bc,
        },
      ],
    ]);

    // 默认车辆颜色
    this.u_carColor = { value: this.colors.get('00')!.col.clone() };
    this.u_carMetalness = { value: this.colors.get('00')!.metal || 0 };
    this.u_carRoughness = { value: 0 };

    // 方位
    this.positionDirction = {
      UNIT_X: new Vector3(1, 0, 0),
      UNIT_Y: new Vector3(0, 1, 0),
      UNIT_Z: new Vector3(0, 0, 1),
      RIGHT: new Vector3(1, 0, 0),
      UP: new Vector3(0, 1, 0),
      ZERO: new Vector3(0, 0, 0),
      ONE: new Vector3(1, 1, 1),
      NEG_ONE: new Vector3(-1, -1, -1),
    };

    // 音频
    this.audioList = [
      { key: 'bgm', url: '/audio/bgm.ogg' },
      { key: 'chooseColor', url: '/audio/chooseColor.mp3' },
      { key: 'policecar-bgm', url: '/audio/policecar-bgm.mp3' },
    ];
  }

  /**
   * 从 URL 获取自定义颜色参数  "custom"自定义颜色，字符串数字颜色索引，0默认颜色
   */
  getCustomParams(): 'custom' | string | 0 {
    const urlParams = new URLSearchParams(window.location.search);
    const v = urlParams.get('v');

    if (v && v.length === 10) {
      const hexColor = v.slice(0, 6);
      const rough = parseInt(v.slice(6, 8), 16) / 255;
      const metal = parseInt(v.slice(8, 10), 16) / 255;

      // 设置粗糙度
      if (rough) this.colors.get('custom')!.rough = rough;
      // 设置金属度
      if (metal) this.colors.get('custom')!.metal = metal;
      // 设置颜色
      if (hexColor) {
        const color = new Color('#' + hexColor);
        this.colors.get('custom')!.col.copy(color);
        color.convertLinearToSRGB();
        const customColor = this.colors.get('custom')!;
        if (customColor.hsl) {
          color.getHSL(customColor.hsl);
        }
      }
      return 'custom';
    }

    if (v && v.includes('h') && v.length === 3) {
      return v.slice(1, 3);
    }

    return 0;
  }

  /**
   * 生成颜色分享链接
   */
  generateCustomParams(): string {
    const isDebug = (window as any).ai?.DEBUG || false;
    const currentColorIndex = (window as any).Ie?.currentColorIndex || '00';

    if (currentColorIndex === 'custom') {
      // 自定义颜色编码
      const customColor = this.colors.get('custom')!;
      let roughHex = customColor && Math.round((customColor.rough ?? 0) * 255).toString(16);
      roughHex = roughHex.padStart(2, '0');

      let metalHex = Math.round((customColor.metal ?? 0) * 255).toString(16);
      metalHex = metalHex.padStart(2, '0');

      const colorHex = this.colors.get('custom')!.col.getHexString();
      const baseUrl = isDebug ? 'http://192.168.23.49:5173/su7?v=' : 'https://gamemcu.com/su7?v=';

      return baseUrl + colorHex + roughHex + metalHex;
    } else {
      // 预设颜色
      const baseUrl = isDebug ? 'http://192.168.23.49:5173/su7?v=h' : 'https://gamemcu.com/su7?v=h';
      return baseUrl + currentColorIndex;
    }
  }

  // get
  public get<K extends keyof SceneConfig>(param: K): SceneConfig[K] | undefined {
    if (this[param] !== undefined) {
      return this[param];
    }
  }
}

export type TextureUniformKey =
  | 'ut_car_body_ao'
  | 'ut_startroom_ao'
  | 'ut_startroom_light'
  | 'ut_floor_normal'
  | 'ut_floor_roughness'
  | 'ut_cubeCapture'
  | 'ut_blurCapture'
  | 'ut_saLine'
  | 'ut_street'
  | 'ut_scar_matcap'
  | 'ut_white'
  | 'ut_dark'
  | 'ut_floorMap'
  | 'ut_car_body_t_gm'
  | 'ut_car_body_t_gm2'
  | 'ut_gm02_car_window_bc'
  | 'ut_gm02_car_window_roughness'
  | 'ut_gm02_floor_bc'
  | 'ut_police_Car_body_BC'
  | 'ut_police_floor_bc'
  | 'ut_env_night'
  | 'ut_env_light';

export interface TextureMapping {
  [key: string]: TextureUniformKey;
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

export const sceneConfig = new SceneConfig();
