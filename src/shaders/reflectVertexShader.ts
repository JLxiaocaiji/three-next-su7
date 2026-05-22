export const reflectVertexShader = /* glsl */ `
// 顶点世界坐标
varying vec4 vWorldPosition;
// 第一套UV坐标（基础纹理采样用）
varying vec2 vUv;
// 第二套UV坐标（光照贴图/AO贴图采样用）
varying vec2 vUv2;
// 顶点视图空间坐标（相机空间）
varying vec4 vViewPosition;
// 顶点法线
varying vec3 vNormal;
// 顶点切线（法线贴图用）
varying vec4 vTangent;

// ======================================
// 自定义顶点属性
// ======================================
// 第二套UV属性
attribute vec2 uv2;
// 第三套UV属性（当前未使用）
attribute vec2 uv3;

// ======================================
// Three.js 内置着色器头文件
// ======================================
// 通用数学函数、宏定义
#include <common>
// 雾效果（顶点阶段）
#include <fog_pars_vertex>
// 阴影映射（顶点阶段）
#include <shadowmap_pars_vertex>
// 对数深度缓冲（解决远处物体闪烁）
#include <logdepthbuf_pars_vertex>

// ======================================
// 顶点着色器主函数
// ======================================
void main() {
    // 传递第一套UV到片元
    vUv = uv;
    // 传递第二套UV到片元
    vUv2 = uv2;

    // 计算顶点【世界坐标】：模型矩阵 × 顶点本地坐标
    vWorldPosition = modelMatrix * vec4( position, 1.0 );
    
    // 计算顶点【视图坐标】：模型视图矩阵 × 顶点本地坐标
    vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );
    // 透视除法：将齐次坐标转为标准设备坐标
    vViewPosition = mvPosition / mvPosition.w;
    
    // 计算世界空间法线：法线矩阵 × 本地法线
    vNormal = normalMatrix * normal;

    // 如果启用切线（法线贴图需要），传递切线数据
    #ifdef USE_TANGENT
    vTangent = tangent;
    #endif

    // 最终顶点裁剪坐标：投影矩阵 × 视图坐标
    gl_Position = projectionMatrix * mvPosition;

    // ======================================
    // Three.js 内置着色器逻辑执行
    // ======================================
    // 法线初始化
    #include <beginnormal_vertex>
    // 默认法线计算
    #include <defaultnormal_vertex>
    // 对数深度缓冲计算
    #include <logdepthbuf_vertex>
    // 雾效果计算
    #include <fog_vertex>
    // 阴影映射计算
    #include <shadowmap_vertex>
}`;
