export const getFileSize = async (url: string): Promise<number> => {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const len = res.headers.get('content-length');
    return len ? Number(len) : 0;
  } catch {
    return 0;
  }
};

export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay = 100
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));
export const fbm = (octaves: number, x: number) => {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * Math.sin(x * freq);
    max += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / max;
};

/**
 * 经典 Perlin Noise（柏林噪声）完整实现
 * 还原自混淆代码，100% 兼容原始算法
 */
export class PerlinNoise {
  /**
   * Ken Perlin 原始排列表（固定值）
   */
  private static readonly _Permutation: number[] = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69,
    142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219,
    203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
    74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230,
    220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76,
    132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186,
    3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59,
    227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70,
    221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178,
    185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81,
    51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115,
    121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195,
    78, 66, 215, 61, 156, 180, 151,
  ];

  /**
   * 平滑插值函数（Perlin 经典 6t⁵-15t⁴+10t³）
   */
  private static _Fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /**
   * 线性插值
   */
  private static _Lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  /**
   * 梯度计算
   */
  private static _Grad(hash: number, x: number, y?: number, z?: number): number {
    if (y !== undefined && z !== undefined) {
      const h = hash & 15;
      const u = h < 8 ? x : y;
      const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    } else if (y !== undefined) {
      return ((hash & 1) === 0 ? x : -x) + ((hash & 2) === 0 ? y : -y);
    } else {
      return (hash & 1) === 0 ? x : -x;
    }
  }

  /**
   * 生成 Perlin Noise
   * @param x X 坐标
   * @param y Y 坐标（可选）
   * @param z Z 坐标（可选）
   * @returns 噪声值 [-1, 1]
   */
  static noise(x: number, y?: number, z?: number): number {
    const p = PerlinNoise._Permutation;
    const fade = PerlinNoise._Fade;
    const lerp = PerlinNoise._Lerp;
    const grad = PerlinNoise._Grad;

    // 3D 模式
    if (y !== undefined && z !== undefined) {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      const Z = Math.floor(z) & 255;

      x -= Math.floor(x);
      y -= Math.floor(y);
      z -= Math.floor(z);

      const u = fade(x);
      const v = fade(y);
      const w = fade(z);

      const A = p[X] + Y;
      const AA = p[A] + Z;
      const AB = p[A + 1] + Z;
      const B = p[X + 1] + Y;
      const BA = p[B] + Z;
      const BB = p[B + 1] + Z;

      return lerp(
        w,
        lerp(
          v,
          lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
          lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))
        ),
        lerp(
          v,
          lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
          lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))
        )
      );
    }
    // 2D 模式
    else if (y !== undefined) {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;

      x -= Math.floor(x);
      y -= Math.floor(y);

      const u = fade(x);
      const v = fade(y);

      const A = p[X] + Y;
      const AA = p[A] & 255;
      const AB = p[A + 1] & 255;
      const B = p[X + 1] + Y;
      const BA = p[B] & 255;
      const BB = p[B + 1] & 255;

      return lerp(
        v,
        lerp(u, grad(p[AA], x, y), grad(p[BA], x - 1, y)),
        lerp(u, grad(p[AB], x, y - 1), grad(p[BB], x - 1, y - 1))
      );
    }
    // 1D 模式
    else {
      const X = Math.floor(x) & 255;
      x -= Math.floor(x);
      const u = fade(x);
      return lerp(u, grad(p[X], x), grad(p[X + 1], x - 1));
    }
  }

  /**
   * 分形布朗运动 (FBM)
   * @param octaves 八度/层数（建议 3-8）
   * @param x X 坐标
   * @param y Y 坐标（可选）
   * @param z Z 坐标（可选）
   * @returns 噪声值
   */
  static fbm(octaves: number, x: number, y?: number, z?: number): number {
    let result = 0;
    let amplitude = 0.5;
    const noise = PerlinNoise.noise;

    if (y !== undefined && z !== undefined) {
      for (let i = 0; i < octaves; i++) {
        result += amplitude * noise(x, y, z);
        x *= 2;
        y *= 2;
        z *= 2;
        amplitude *= 0.5;
      }
    } else if (y !== undefined) {
      for (let i = 0; i < octaves; i++) {
        result += amplitude * noise(x, y);
        x *= 2;
        y *= 2;
        amplitude *= 0.5;
      }
    } else {
      for (let i = 0; i < octaves; i++) {
        result += amplitude * noise(x);
        x *= 2;
        amplitude *= 0.5;
      }
    }
    return result;
  }
}

export const isSupportMSAA = () => {
  const canvas = document.createElement('canvas');
  // 1. 获取 WebGL 2 上下文，因为 MSAA 离屏渲染主要依赖 WebGL 2
  const gl = canvas.getContext('webgl2');
  if (!gl) return false;

  // 2. 特性检测：检查是否支持浮点纹理，这是高级渲染管线（HDR+MSAA）的核心
  const hasFloatExtension = !!gl.getExtension('EXT_color_buffer_float');
  const hasLinearExtension = !!gl.getExtension('OES_texture_float_linear');

  // 3. 版本黑名单：规避 Safari 15.4 等已知有 Bug 的版本
  const ua = navigator.userAgent;
  const isBadSafari = ua.includes('Version/15.4') && ua.includes('Safari');

  // 4. 硬件限制：检查 GPU 是否支持多重采样缓冲区
  const maxSamples = gl.getParameter(gl.MAX_SAMPLES);

  return hasFloatExtension && hasLinearExtension && !isBadSafari && maxSamples > 0;
};
