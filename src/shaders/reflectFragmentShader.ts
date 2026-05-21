export const reflectFragmentShader = /* glsl */ `
varying vec4 vWorldPosition;   // 世界坐标
varying vec2 vUv;              // 第一套UV
varying vec2 vUv2;             // 第二套UV
varying vec4 vViewPosition;    // 视图坐标
varying vec3 vNormal;          // 法线
varying vec4 vTangent;         // 切线

// ======================================
// 全局 Uniform 变量（JS传递给GPU的参数）
// ======================================
// PBR 基础颜色
uniform vec3 color;
// 基础纹理
uniform sampler2D map;
// 透明度
uniform float opacity;
// 粗糙度
uniform float roughness;
// 粗糙度贴图
uniform sampler2D roughnessMap;
// 金属度
uniform float metalness;
// 金属度贴图
uniform sampler2D metalnessMap;
// 环境光遮蔽贴图
uniform sampler2D aoMap;
// 光照贴图
uniform sampler2D lightMap;
// 光照贴图颜色
uniform vec3 lightMapColor;
// 光照贴图强度
uniform float lightMapIntensity;
// 自发光颜色
uniform vec3 emissive;
// 自发光贴图
uniform sampler2D emissiveMap;
// 法线贴图
uniform sampler2D normalMap;
// 反射畸变强度
uniform float distortionScale;
// 地面/街道类型切换开关（0=地面，1=街道）
uniform float u_floor_typeSwitch;
// 街道纹理
uniform sampler2D ut_street;

// 自定义光照强度
uniform float u_lightIntensity;
// 自定义反射强度
uniform float u_reflectIntensity;
// 地面UV偏移（滚动/动画用）
uniform vec2 u_floorUVOffset;

// 反射矩阵（计算反射纹理采样坐标）
uniform mat4 u_reflectMatrix;
// 反射纹理（相机渲染的地面反射纹理）
uniform sampler2D u_reflectTexture;

// ======================================
// Three.js 内置着色器头文件
// ======================================
#include <common>
#include <packing>
// PBR 光照模型函数
#include <bsdfs>
// 雾效果（片元阶段）
#include <fog_pars_fragment>
// 对数深度缓冲（片元阶段）
#include <logdepthbuf_pars_fragment>
// 光照系统初始化
#include <lights_pars_begin>
// 阴影映射（片元阶段）
#include <shadowmap_pars_fragment>
// 阴影遮罩
#include <shadowmask_pars_fragment>

// ======================================
// 自定义噪声函数（当前代码未调用）
// 作用：多层法线贴图采样，生成随机扰动噪声
// ======================================
vec4 getNoise( vec2 uv ) {
    // 4组不同缩放的UV坐标
    vec2 uv0 = ( uv / 103.0 );
    vec2 uv1 = uv / 107.0;
    vec2 uv2 = uv / vec2( 8907.0, 9803.0 );
    vec2 uv3 = uv / vec2( 1091.0, 1027.0 );
    
    // 叠加4层法线纹理采样
    vec4 noise = texture( normalMap, uv0 ) +
        texture( normalMap, uv1 ) +
        texture( normalMap, uv2 ) +
        texture( normalMap, uv3 );

    // 归一化噪声值（范围：-1 ~ 1）
    return noise * 0.5 - 1.0;
}

// ======================================
// 片元着色器主函数（核心渲染逻辑）
// ======================================
void main(){
    // 对数深度缓冲计算（解决远处Z-fighting闪烁）
    #include <logdepthbuf_fragment>

    // ====================== 1. 表面法线计算 ======================
    // 默认法线：垂直向上 (地面平面法线)
    vec3 surfaceNormal = vec3(0.,1.,0.);
    // 如果启用法线贴图，采样法线并转换为世界空间法线
    #ifdef USE_NORMAL_MAP
        // 法线贴图采样：世界坐标xz+UV偏移 → 转法线向量（-1~1）
        vec3 normalSample = texture( normalMap, vWorldPosition.xz+u_floorUVOffset).rgb*2.-vec3(1.);
        // 归一化法线，修正坐标轴
        surfaceNormal = normalize( normalSample.xzy );
    #endif

    // ====================== 2. 视线方向计算 ======================
    vec3 diffuseLight = vec3(0.0);
    // 视线方向：相机位置 → 顶点位置
    vec3 eyeDirection = -vViewPosition.xyz;
    // 相机到顶点的距离
    float d = length(eyeDirection);
    // 归一化视线方向
    eyeDirection = normalize(eyeDirection);

    // ====================== 3. 反射畸变偏移 ======================
    // 法线扰动 → 反射纹理偏移，模拟地面凹凸不平的反射效果
    vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / d ) * distortionScale;

    // ====================== 4. 金属度采样 ======================
    float metallic = metalness;
    // 启用金属度贴图 → 采样绿色通道修正金属度
    #ifdef USE_METALNESS_MAP
        metallic = texture(metalnessMap, vUv).b * metallic;
    #endif

    // ====================== 5. 菲涅尔反射（核心） ======================
    // 计算视线与法线的夹角
    float theta = max( dot( eyeDirection, vNormal ), 0.0 );
    // 基础反射率（非金属默认0.02）
    float rf0 = 0.02;
    // 菲涅尔公式：视角越倾斜，反射越强
    float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 2.0 );

    // ====================== 6. 粗糙度计算 ======================
    float roughness_factory = roughness;
    // 启用粗糙度贴图 → 采样绿色通道修正粗糙度
    #ifdef USE_ROUGHNESS_MAP
        roughness_factory *= texture(roughnessMap, (vWorldPosition.xz+u_floorUVOffset)*0.2).g;
    #endif
    // 粗糙度曲线优化：让过渡更自然
    roughness_factory = roughness_factory*(1.7 - 0.7*roughness_factory);

    // ====================== 7. 反射纹理采样（核心） ======================
    // 用反射矩阵计算反射纹理的采样坐标
    vec4 samplePoint = u_reflectMatrix * vWorldPosition;
    samplePoint = samplePoint / samplePoint.w;
    // 采样反射纹理 + 法线畸变 + 粗糙度模糊 → 乘以反射强度
    vec3 reflectionSample = texture(u_reflectTexture, samplePoint.xy + distortion, roughness_factory*6.).xyz * u_reflectIntensity;

    // ====================== 8. 基础光照计算 ======================
    // 基础光照：光照强度 × 光照颜色
    vec3 lightSample = vec3(lightMapIntensity * u_lightIntensity)*lightMapColor;

    // 启用光照贴图 → 叠加光照贴图颜色
	#ifdef USE_LIGHT_MAP
		lightSample *= texture(lightMap,vUv2).rgb;
	#endif

    // 启用AO贴图 → 叠加环境光遮蔽（暗部增强）
    #ifdef USE_AO_MAP
		float aoSample = texture(aoMap,vUv2).r;
		lightSample*=aoSample;
	#endif

    // ====================== 9. 街道/地面纹理混合 ======================
    // 采样街道纹理（自定义UV坐标适配街道拉伸）
    vec3 streetCol = texture(ut_street,vec2((vWorldPosition.z+15.)/30.,(vWorldPosition.x+u_floorUVOffset.x)/60.)).rgb;
    // 根据类型开关，混合地面光照和街道纹理
    lightSample = mix(lightSample,streetCol,vec3(u_floor_typeSwitch));

    // ====================== 10. 基础颜色采样 ======================
    vec3 colorFactory = color;
    // 启用基础纹理 → 叠加纹理颜色，街道模式下强制为白色
    #ifdef USE_MAP
        vec3 mapColor =  texture(map, vUv).rgb;
        mapColor = mix(mapColor,vec3(1.),vec3(u_floor_typeSwitch));
        colorFactory *= mapColor.rgb;
    #endif

    // ====================== 11. 最终颜色混合 ======================
    // 漫反射光 = 光照 × 基础颜色
    diffuseLight = lightSample * colorFactory;
    // 最终颜色：根据菲涅尔系数，混合漫反射 + 反射
    vec3 outColor = mix(diffuseLight, reflectionSample, reflectance);

    // 输出最终颜色（带透明度）
    gl_FragColor = vec4(outColor, opacity);

    // ====================== 12. Three.js 后期处理 ======================
    // 色调映射
    #include <tonemapping_fragment>
    // 颜色编码
    #include <colorspace_fragment>
    // 雾效果
    #include <fog_fragment>
}
`;
