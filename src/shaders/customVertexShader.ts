export const customVertexShader = `
varying vec3 vPosition;        // 顶点 局部坐标
varying vec3 vNormal;          // 顶点 法线（相机空间）
varying vec2 vUv;              // 顶点 UV 坐标
varying vec3 vPositionW;        // 顶点 世界坐标
varying vec3 vPositionObj;      // 模型原点的世界坐标
varying vec3 vNormalW;          // 顶点 世界空间法线
attribute vec3 color;           // 顶点颜色（模型自带顶点色）
varying vec3 vColor;            // 传递给片元的顶点色
varying vec3 vViewPosition;     // 相机空间顶点位置（相机到点的方向）
varying vec4 viewerUV;          // 屏幕 UV 坐标（用于后期特效）

// 实例化渲染开关（批量渲染多个相同模型，如车灯、粒子）
#ifdef USE_INSTANCING
  varying vec3 vPositionIns;        // 实例化世界偏移
  varying vec3 vPositionInsModel;   // 实例化局部坐标
  varying vec3 vInstanceColor;      // 实例化颜色
  attribute vec3 instanceColor;      // JS 传入的实例颜色
#endif

void main() {

  // 1. 传递 局部坐标
  vPosition = position;

  // 2. 传递 相机空间法线（光照计算用）
  vNormal = normalMatrix * normal;

  // 3. 计算并传递 世界坐标
  vPositionW = vec3(modelMatrix * vec4(position, 1.0));

  // 4. 模型原点的世界坐标（模型中心点位置）
  vPositionObj = vec3(modelMatrix * vec4(vec3(0.), 1.0));

  // 5. 计算并传递 世界空间法线
  vNormalW = normalize(vec3(vec4(normal, 0.0) * modelMatrix));

  // 6. 传递 UV 坐标
  vUv = uv;

  // 7. 传递 顶点颜色（模型自带顶点色）
  vColor = color;

  // 8. 相机空间坐标（光照/特效常用）
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;

  // 实例化渲染逻辑（批量绘制多个模型）
  #ifdef USE_INSTANCING
    vPositionInsModel = position;               // 局部坐标
    vPositionIns = vec3(instanceMatrix * vec4(vec3(0.), 1.)); // 实例偏移
    vPositionW = vec3(instanceMatrix * vec4(vPositionW, 1.)); // 世界坐标
    vPosition = vec3(instanceMatrix * vec4(vPosition, 1.));   // 局部坐标
    vInstanceColor = instanceColor;             // 实例颜色
  #endif

  gl_Position = projectionMatrix * mvPosition;

  // 屏幕 UV 计算：将 3D 坐标映射到屏幕UV [0~1] 区间
  // gl_Position.xyz / gl_Position.w xy范围 [-1, 1]
  viewerUV = vec4((gl_Position.xyz / gl_Position.w).xy * 0.5 + 0.5, 0., 1.);
}
`;
