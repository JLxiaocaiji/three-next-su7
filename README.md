![alt text](image.png)
加载器强制按 arraybuffer 读取,
解析器跳过标准 GLB 头部校验，直接解析自定义结构

A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.
  浏览器扩展程序（Plugin/Extension）在页面还没有完全加载和运行之前，强制修改了<html> 标签，给它加上了自定义属性。

内存爆炸

所有定义在 class 外的 都要放进去

而是校验自定义头部（ma /nr）
转码生成的私有格式
模型数据已经被预序列化 / 预构建
.bin 存的不是 glTF，而是：
序列化后的 BufferGeometry 数据
完全跳过了 glTF 解析流程

所有数据贴图（法线、粗糙、金属、AO）
encoding:3000 → 删除这行 或 写 LinearColorSpace
所有颜色贴图（baseColor、map、diffuse）
encoding:3001 → 必须改成 SRGBColorSpace

// 开启报错
for (let material of Object.values(this.\_node.userData.meshData.materials)) {
if (material instanceof THREE.MeshStandardMaterial) {
// 启 USE_BOX_PROJECTION 宏
material.defines!.USE_BOX_PROJECTION = '';
}
}

Zustand+Class + eventBus

Class：负责复杂业务逻辑（3D 渲染、物理计算、资源管理）
事件总线：负责Class 之间的解耦通信（避免 Class 之间直接引用）
Zustand：负责Class 与 React 组件的状态同步（统一管理 UI 需要的全局状态）

┌─────────────────────────────────────────────────────────┐
│ React UI 层 │
│ （组件只从Zustand获取状态，调用Zustand暴露的方法） │
└───────────────────────────┬─────────────────────────────┘
│
┌───────────────────────────▼─────────────────────────────┐
│ Zustand Store 层 │
│ 1. 持有所有Class单例实例 │
│ 2. 订阅事件总线，将Class状态同步到Store │
│ 3. 向UI暴露统一的状态和操作接口 │
└───────────────────────────┬─────────────────────────────┘
│
┌───────────────────────────▼─────────────────────────────┐
│ 事件总线层 │
│ 1. 所有Class之间的通信都通过事件总线进行 │
│ 2. 完全解耦Class之间的依赖关系 │
└─────────┬─────────────────────┬─────────────────────────┘
│ │
┌─────────▼───────┐ ┌─────────▼───────┐ ┌─────────────▼───────┐
│ CarManager │ │ ScreenshotManager│ │ WheelController │
└─────────────────┘ └─────────────────┘ └─────────────────────┘

1. Class 和 Class 之间通信: eventBus
2. UI 组件 和 UI 组件 通信: Zustand
3. Class 和 UI 组件 通信:
   · Class 通过 EventBus 发事件 → Zustand 监听事件并更新状态 → UI 自动渲染
   · UI 操作按钮 → 调用 Class 方法 → Class 干活 → 再发事件回 UI
