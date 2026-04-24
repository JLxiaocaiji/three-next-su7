export const randomColorShader = `
// 随机函数：输入一个2D坐标，输出一个0~1的随机浮点数
float random (vec2 st) {
    // 核心算法：点积 + 正弦函数 + 取小数部分，生成伪随机数
    return fract(
        sin(
            dot(st.xy, vec2(12.9898, 78.233))  // 输入坐标与固定向量点积，打散数据
        ) * 43758.5453123                      // 放大正弦值，让随机范围更大
    );
}

// 输入2D坐标，输出一个随机RGB颜色
vec3 pos2col ( vec2 ipos ) {

    ipos += vec2(9., 0.); // 偏移坐标，只是为了挑选一组好看的初始颜色
    
    // 给同一个坐标点，加不同偏移 → 生成三个不相关的随机值，作为 R、G、B
    float r = random( ipos + vec2( 12., 2. ) );
    float g = random( ipos + vec2( 7., 5. ) );
    float b = random( ipos );

    // 组合成随机颜色并返回
    vec3 col = vec3(r, g, b);
    return col;
}

// 2D 彩色平滑噪声（渐变噪声）
vec3 colorNoise ( vec2 st ) {
    // 把UV坐标分割成整数网格（格子坐标）
    vec2 ipos = floor( st );
    // 小数部分（当前点在格子内的偏移量 0~1）
    vec2 fpos = fract( st );

    // ==============================
    // 取当前格子的四个角落的随机颜色
    // ==============================
    vec3 a = pos2col(ipos);                        // 左下角
    vec3 b = pos2col(ipos + vec2(1.0, 0.0));       // 右下角
    vec3 c = pos2col(ipos + vec2(0.0, 1.0));       // 左上角
    vec3 d = pos2col(ipos + vec2(1.0, 1.0));       // 右上角

    // ==============================
    // 平滑插值曲线：让过渡更自然，不是生硬的直线
    // 等价于 smoothstep(0.0, 1.0, fpos)
    // ==============================
    vec2 u = fpos * fpos * (3.0 - 2.0 * fpos);

    // ==============================
    // 双线性插值：把四个角的颜色，平滑混合成当前像素的颜色
    // ==============================
    return mix(a, b, u.x) +                // X 方向混合 a b
           (c - a) * u.y * (1.0 - u.x) +   // Y 方向混合 a c
           (d - b) * u.x * u.y;             // 对角线混合 d b
}
`;
