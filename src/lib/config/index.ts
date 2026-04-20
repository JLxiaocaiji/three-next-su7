import { Color, Vector2, Vector3, Texture, CubeTexture } from 'three';

export const config = {
  maxSpeed: 20,
  u_carColor: { value: new Color('#25d6e9') },
  colors: new Map(),
};

// 初始化颜色
config.colors.set('00', {
  col: new Color('#25d6e9').convertSRGBToLinear(),
  metal: 0.16,
  rough: 0.03,
});
