import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import * as THREE from 'three';

import { eventBus } from '@/utils/eventBus';

/**
 * HSL颜色空间分量
 * 分量取值范围：[0, 1]
 * h: 色相(Hue) - 0=红色, 0.33=绿色, 0.66=蓝色, 1=红色
 * s: 饱和度(Saturation) - 0=灰度, 1=最鲜艳
 * l: 明度(Lightness) - 0=纯黑, 0.5=正常, 1=纯白
 */
interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * HSVA颜色空间分量  透明度
 */
interface HSVA {
  h: number;
  s: number;
  v: number;
  a: number;
}

interface ColorEntry {
  col: THREE.Color; // col: THREE.Color
  hsl: HSL; // hsl: HSL分量对象
  metal: number;
  rough: number;
  bgUrl: string;
}

export interface ColorStoreState {
  colorList: Map<string, ColorThemeItem | CustomColor>;
  colorName: string | 'custom';

  updateHue: (hue01: number) => void;
  updateS: (s: number) => void;
  updateL: (l: number) => void;
  updateMetal: (l: number) => void;
  updateRough: (r: number) => void;
  updateColor: (hsl: Partial<HSL>) => void;
  setColor: (color: THREE.Color) => void;

  changeColor: (colorName: string | 'custom') => void;
  requestColorList: () => void;
}

export const useColorStore = create<ColorStoreState>()(
  immer((set) => {
    return {
      colorList: new Map([
        [
          'custom',
          {
            col: new THREE.Color('#ffc03f').convertSRGBToLinear(),
            hsl: { h: 40.31 / 360, s: 1, l: 0.6235 },
            metal: 0.1,
            rough: 0.03,
            bgUrl: 'custom.webp',
          },
        ],
      ]),
      colorName: 'custom',
      /**
       * 仅更新颜色的色相分量
       * @param hue01 - 色相值，[0, 1]
       */
      updateHue: (hue01) => {
        set((draft) => {
          const color = draft.colorList.get('custom');
          if (!color || !color.hsl) return;

          // 色相值在[0, 1]范围内
          color.hsl.h = Math.max(0, Math.min(1, hue01));
          // 将sRGB颜色转换为线性空间
          color.col.setHSL(color.hsl.h, color.hsl.s, color.hsl.l).convertSRGBToLinear();

          eventBus.emit('ChangeColor:ChangeHue', undefined);
        });
      },
      /**
       * 仅更新颜色的饱和度分量
       * @param s - 饱和度，[0, 1]
       */
      updateS: (s) => {
        set((draft) => {
          const color = draft.colorList.get('custom');
          if (!color || !color.hsl) return;

          // 值在[0, 1]范围内
          color.hsl.s = Math.max(0, Math.min(1, s));
          // 将sRGB颜色转换为线性空间
          color.col.setHSL(color.hsl.h, color.hsl.s, color.hsl.l).convertSRGBToLinear();

          eventBus.emit('ChangeColor:ChangeS', undefined);
        });
      },
      /**
       * 仅更新颜色的明度分量
       * @param l - 明度，[0, 1]
       */
      updateL: (l) => {
        set((draft) => {
          const color = draft.colorList.get('custom');
          if (!color || !color.hsl) return;

          // 值在[0, 1]范围内
          color.hsl.l = Math.max(0, Math.min(1, l));
          // 将sRGB颜色转换为线性空间
          color.col.setHSL(color.hsl.h, color.hsl.s, color.hsl.l).convertSRGBToLinear();

          eventBus.emit('ChangeColor:ChangeL', undefined);
        });
      },

      /**
       * 仅更新金属度
       * @param hsl - 金属度
       */
      updateMetal: (metal: number) => {
        set((draft) => {
          const color = draft.colorList.get('custom');
          if (!color || !color.metal) return;

          // 值在[0, 1]范围内
          color.metal = Math.max(0, Math.min(1, metal));

          eventBus.emit('ChangeColor:ChangeMetal', undefined);
        });
      },

      /**
       * 仅更新金属度
       * @param hsl - 金属度
       */
      updateRough: (rough: number) => {
        set((draft) => {
          const color = draft.colorList.get('custom');
          if (!color || !color.rough) return;

          // 值在[0, 1]范围内
          color.rough = Math.max(0, Math.min(1, rough));

          console.log('rough', color.rough);
          eventBus.emit('ChangeColor:ChangeRough', undefined);
        });
      },

      /**
       * 更新颜色的HSL分量
       * @param hsl - 要更新的HSL分量
       */
      updateColor: (hsl: Partial<HSL>) => {
        set((draft) => {
          const color = draft.colorList.get('custom');
          if (!color || !color.hsl) return;

          Object.assign(color.hsl, hsl);

          // 重新计算并转换到线性空间
          color.col.setHSL(color.hsl.h, color.hsl.s, color.hsl.l).convertSRGBToLinear();
        });
      },

      /**
       * 设置颜色值（从Color对象）
       * 自动同步更新对应的HSL分量
       * @param color - 源Color对象
       */
      setColor: (targetColor: THREE.Color) => {
        set((draft) => {
          let color = draft.colorList.get('custom');
          if (!color || !color.hsl) return;
          if (color) {
            // 2. 已有颜色 → 直接修改
            color.col.copy(targetColor).convertSRGBToLinear();
            targetColor.getHSL(color.hsl);
          } else {
            const newColor = {
              col: new THREE.Color('#ffc03f').convertSRGBToLinear(),
              hsl: {
                h: 40.31 / 360,
                s: 1,
                l: 0.6235,
              },
              metal: 0.1,
              rough: 0.03,
              bgUrl: 'custom.png',
            };

            newColor.col.copy(targetColor).convertSRGBToLinear();
            targetColor.getHSL(newColor.hsl);
            draft.colorList.set('custom', color);
          }
        });
      },

      changeColor: (colorName: string | 'custom') => {
        console.log('changeColor', colorName);
        useColorStore.setState((draft) => {
          draft.colorName = colorName;
        });
        eventBus.emit('ChangeColor', colorName);
      },

      requestColorList: () => {
        eventBus.emit('RequestColorList');
      },
    };
  })
);

eventBus.on('ReturnColorList', (colorList) => {
  useColorStore.setState((draft) => {
    draft.colorList = colorList;
  });
});

export const getColor = (colorName: string | 'custom') => {
  return useColorStore.getState().colorList.get(colorName);
};

export const getColorList = () => {
  const state = useColorStore.getState();
  if (state.colorList.size === 1) {
    state.requestColorList();
  }
  return state.colorList;
};
