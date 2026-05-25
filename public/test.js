import { scene, camera, renderer, controls, gui, sizes, gltfLoader } from  './common.js'
import * as THREE from "three";
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

renderer.shadowMap.enabled = true; // 开启阴影映射，提升真实感
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 柔和阴影

controls.enableDamping = true;      // 惯性效果
controls.dampingFactor = 0.05;
controls.rotateSpeed = 1.0;
controls.zoomSpeed = 1.2;
controls.panSpeed = 0.8;
controls.screenSpacePanning = true; // 避免平移时倾斜
controls.target.set(0, 0.5, 0);

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
});


const timer = new THREE.Timer();

const render = () => {
  timer.update();

  // 获取累计时间，传递给着色器
  const elapsedTime = timer.getElapsed();

  controls.update(); // 更新轨道控制器
  renderer.render(scene, camera); // 渲染场景
  requestAnimationFrame(render); // 循环调用
};

const ambientLight = new THREE.AmbientLight(0x404060, 0.65);
scene.add(ambientLight);

// 主光源: 方向光 (产生明暗对比)
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(2, 5, 3);
directionalLight.castShadow = true;
directionalLight.receiveShadow = false;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 8;
directionalLight.shadow.camera.left = -5;
directionalLight.shadow.camera.right = 5;
directionalLight.shadow.camera.top = 5;
directionalLight.shadow.camera.bottom = -5;
scene.add(directionalLight);

// 辅助背光暖色填充阴影
const backLight = new THREE.PointLight(0xcc9966, 0.5);
backLight.position.set(-2, 1, -3);
scene.add(backLight);

let loadedModel = null;

const za = "glTF"
const ma = "1031088470" // 旧版 GLB 头部校验数字
const nr = "152147171185" // 加密/新版 GLB 头部校验数字
const fo = 12   // GLB 固定头部长度 = 12 字节

const Ga = { 
    JSON: 1313821514,   // "JSON" 四个字符的二进制编码值
    BIN: 5130562        // "BIN\0" 四个字符的二进制编码值
};

const extensions = {};

let jsonData = null;

fetch('/sm_car.bin').then(response => {
    return response.arrayBuffer();
})
.then(arrayBuffer => {
    // 显示获取到的二进制数据大小
    const fileSizeKB = (arrayBuffer.byteLength / 1024).toFixed(2);
    console.log('fileSizeKB',  fileSizeKB)
    console.log(`[二进制模型加载] 已获取 ArrayBuffer，字节长度: ${arrayBuffer.byteLength}`);


    const headerStr = new Uint8Array(arrayBuffer, 0, 4).join("");

    console.log(headerStr)


    if (headerStr === ma || headerStr === nr) {
        let content = null;   // 存放解析出来的 glTF JSON 字符串
        let body = null;      // 存放模型二进制数据（顶点、纹理等）

        // j[ti.KHR_BINARY_GLTF] = new dl(y)
        const headerView = new DataView(arrayBuffer, 0, fo);  // 读取 GLB 头部（固定 12 字节）
        const textDecoder = new TextDecoder();    // 用于把二进制转字符串
        // 判断是否是【加密 GLB】（匹配 nr 常量
        const isLegacy = new Uint8Array(arrayBuffer, 0, 4).join("") === nr;

        const header = {
            magic: textDecoder.decode(new Uint8Array(arrayBuffer, 0, 4)), // 必须是 "glTF"
            version: headerView.getUint32(4, true),  // glTF 版本号   2
            length: headerView.getUint32(8, true)    // 整个文件总长度
        };

        try {

            // 解析JSON和二进制块
            const dataLength = header.length - fo;
            const dataView = new DataView(arrayBuffer, fo);

            let offset = 0; // 读取指针

            while (offset < dataLength) {
                // 读取【块长度】：当前块有多少字节
                const chunkLength = dataView.getUint32(offset, true);
                offset += 4;

                // 如果是加密 GLB → 解密这段数据
                if (isLegacy) {
                    const decryptData = new Uint8Array(arrayBuffer, fo + offset, chunkLength + 4);
                    hl(decryptData); // 调用异或解密函数
                }

                // 读取【块类型】：JSON 还是 BIN
                const chunkType = dataView.getUint32(offset, true);
                offset += 4;

                // --------------------------
                // 4. 根据块类型解析
                // --------------------------
                if (chunkType === Ga.JSON) {
                    // JSON 块：二进制转字符串
                    const jsonBytes = new Uint8Array(arrayBuffer, fo + offset, chunkLength);
                    const textDecoder = new TextDecoder(); 
                    content = textDecoder.decode(jsonBytes);
                }
                else if (chunkType === Ga.BIN) {
                    // 二进制块：直接切片保存（模型、纹理等）
                    const binStart = fo + offset;
                    body = arrayBuffer.slice(binStart, binStart + chunkLength);
                }

                // 移动指针到下一个块
                offset += chunkLength;
            }

                // --------------------------
                // 5. 必须包含 JSON 块
                // --------------------------
            if (content === null) {
                throw new Error("THREE.GLTFLoader: JSON content not found.");
            }

            const dlResult = {
                name: "KHR_binary_glTF",    // 固定扩展名称
                content: content, // 模型描述 JSON（字符串）
                body: body,      // 二进制资源（几何、纹理）
                header: header // 文件头信息
            }

            extensions['KHR_binary_glTF'] = dlResult;
    
        } catch (Te) {
            console.log(Te)
            return
        }
        console.log('extensions:',extensions)
        console.log("extensions['KHR_binary_glTF']",extensions['KHR_binary_glTF'].content)
        jsonData = JSON.parse(extensions['KHR_binary_glTF'].content)
    } else {
        jsonData = JSON.parse(textDecoder.decode(y));
    }

    console.log('jsonData:',jsonData)

    if (!jsonData.asset || jsonData.asset.version[0] < 2) {
        console.error(new Error('THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported.'));
        return;
    }

    // 把【模型扩展信息】和【自定义额外数据】挂到 Three.js 对象上的核心逻辑。

    // const fe = new p(F,{
    //     path: b || this.resourcePath || "",     // "/su7/1.0.5/mesh/" || ''  
    //     crossOrigin: this.crossOrigin,          // crossOrigin: "anonymous"
    //     requestHeader: this.requestHeader,      // requestHeader: {}
    //     // manager: B0 addHandler: ƒ (w,P), getHandler: ƒ (w),itemEnd: ƒ (w),itemError: ƒ (w),itemStart: ƒ (w), onError: undefined,onLoad: ()=>Ie.loading=1,onProgress: (r,s,h)=>Ie.loading=Math.max(Ie.loading,s/h),onStart: undefined, removeHandler: ƒ (w), resolveURL: ƒ (w), setURLModifier: ƒ (w), [[Prototype]]: Object
    //     manager: this.manager,          
    //     ktx2Loader: this.ktx2Loader,    // ktx2Loader: null
    //     /**
    //      * meshoptDecoder: decode, GltfBuffer: ƒ (gt,xt,Xe,ut,dn,qt),decodeGltfBufferAsync: ƒ (gt,xt,Xe,ut,dn),
    //         decodeIndexBuffer: ƒ (gt,xt,Xe,ut),decodeIndexSequence: ƒ (gt,xt,Xe,ut),decodeVertexBuffer: ƒ (gt,xt,Xe,ut,dn),
    //         ready: Promise {<fulfilled>: undefined}, supported: true, useWorkers: ƒ (gt), [[Prototype]]: Object
    //      */
    //     meshoptDecoder: this.meshoptDecoder
    // });

    const glbBuffer = buildGLBFromParts(extensions['KHR_binary_glTF'].header, extensions['KHR_binary_glTF'].content, extensions['KHR_binary_glTF'].body);

    gltfLoader.setMeshoptDecoder(MeshoptDecoder);

 

    gltfLoader.parse(glbBuffer, '',  (gltf) => {
            // 解析成功，将模型添加到场景
            loadedModel = gltf.scene;
            
            // 模型可能包含多个网格，启用阴影投射与接收
            loadedModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    // 略微提升材质粗糙度表现 (可选，保留原始PBR)
                    if (child.material) {
                        // 确保材质响应光照
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                mat.roughness = mat.roughness || 0.5;
                                mat.metalness = mat.metalness || 0.8;
                            });
                        } else {
                            child.material.roughness = child.material.roughness || 0.5;
                            child.material.metalness = child.material.metalness || 0.8;
                        }
                    }
                }
            });
            
            scene.add(loadedModel);
            console.log('模型加载成功');
            console.log(loadedModel);
        },
        (error) => {
            // 解析错误处理
            console.error('[二进制模型加载] GLTF解析失败:', error);
            
        }
    );
})
.catch(fetchError => {
    // 网络错误或者 fetch 失败
    console.error('[二进制模型加载] Fetch 二进制数据失败:', fetchError);
});

render();


// y: ArrayBuffer(391432)
class dl {
    constructor(y) {
        this.name = ti.KHR_BINARY_GLTF,     // "KHR_binary_glTF"
        this.content = null,
        this.body = null;
        const b = new DataView(y,0,fo)  // new DataView(y,0, 12)
            , E = new TextDecoder
            , L = new Uint8Array(y,0,4).join("") === nr;
        if (this.header = {
            magic: za,
            version: b.getUint32(4, !0),
            length: b.getUint32(8, !0)
        },
        this.header.magic !== za)
            throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");
        if (this.header.version < 2)
            throw new Error("THREE.GLTFLoader: Legacy binary file detected.");
        const jsonData = this.header.length - fo
            , j = new DataView(y,fo);
        let W = 0;
        for (; W < jsonData; ) {
            const re = j.getUint32(W, !0);
            W += 4,
            L && hl(new Uint8Array(y,fo + W,re + 4));
            const fe = j.getUint32(W, !0);
            if (W += 4,
            fe === Ga.JSON) {
                const te = new Uint8Array(y,fo + W,re);
                this.content = E.decode(te)
            } else if (fe === Ga.BIN) {
                const te = fo + W;
                this.body = y.slice(te, te + re)
            }
            W += re
        }
        if (this.content === null)
            throw new Error("THREE.GLTFLoader: JSON content not found.")
    }
}

const hl = (data, key = 255) => {
  for (let i = 0, len = data.length; i < len; i++) {
    data[i] ^= key; // 异或运算
  }
  return data;
}

const Wl = () => {
    let ae = {};
    return {
        get: function(y) {
            return ae[y]
        },
        add: function(y, b) {
            ae[y] = b
        },
        remove: function(y) {
            delete ae[y]
        },
        removeAll: function() {
            ae = {}
        }
    }
}

/**
 * 【核心】GLTFParser —— glTF 2.0 模型解析器
 * 作用：把 glTF JSON、二进制数据 → 转换成 Three.js 对象（场景、网格、材质、动画、相机）
 */
// class P {

//     /**
//      * 构造函数
//      * @param {Object} json - glTF JSON 数据
//      * @param {Object} options - 配置项
//      */
//     constructor(json = {}, options = {}) {
//         // 核心数据
//         this.json = json;                 // glTF 根 JSON
//         this.extensions = {};             // 扩展实例（Draco、KHR_texture_transform 等）
//         this.plugins = {};                // 插件实例
//         this.options = options;           // 配置

//         // 各种缓存（避免重复解析）
//         this.cache = new Wl();         // 通用缓存
//         this.associations = new Map();    // Three 对象 ↔ glTF 索引 映射关系
//         this.primitiveCache = {};         // 图元缓存
//         this.nodeCache = {};              // 节点缓存
//         this.meshCache = { refs: {}, uses: {} }; // 网格引用计数
//         this.cameraCache = { refs: {}, uses: {} };
//         this.lightCache = { refs: {}, uses: {} };

//         // 纹理/材质缓存
//         this.sourceCache = {};
//         this.textureCache = {};
//         this.nodeNamesUsed = {}; // 防止节点重名

//         // ------------------------------
//         // 浏览器环境判断（Safari / Firefox）
//         // ------------------------------
//         let isSafari = false;
//         let isFirefox = false;
//         let firefoxVersion = -1;

//         if (typeof navigator !== "undefined") {
//             isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
//             isFirefox = navigator.userAgent.indexOf("Firefox") > -1;
//             firefoxVersion = isFirefox ? navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1] : -1;
//         }

//         // ------------------------------
//         // 选择纹理加载器
//         // 低版本火狐/Safari 不支持 ImageBitmap → 使用普通 ImageLoader
//         // ------------------------------
//         if (typeof createImageBitmap === 'undefined' || isSafari || (isFirefox && firefoxVersion < 98)) {
//             this.textureLoader = new THREE.ImageLoader(options.manager);
//         } else {
//             this.textureLoader = new THREE.ImageBitmapLoader(options.manager);
//         }

//         this.textureLoader.setCrossOrigin(options.crossOrigin);
//         this.textureLoader.setRequestHeader(options.requestHeader);

//         // 文件加载器（加载 buffer 二进制）
//         this.fileLoader = new THREE.FileLoader(options.manager);
//         this.fileLoader.setResponseType('arraybuffer');

//         // 跨域凭证
//         if (options.crossOrigin === 'use-credentials') {
//             this.fileLoader.setWithCredentials(true);
//         }
//     }

//     // 设置扩展实例
//     setExtensions(extensions) {
//         this.extensions = extensions;
//     }

//     // 设置插件
//     setPlugins(plugins) {
//         this.plugins = plugins;
//     }

//     /**
//      * 【主入口】开始解析整个 glTF 文件
//      * @param {Function} onLoad - 完成回调
//      * @param {Function} onError - 失败回调
//      */
//     parse(onLoad, onError) {
//         const scope = this;
//         const json = this.json;
//         const extensions = this.extensions;

//         // 清空缓存
//         this.cache.removeAll();
//         this.nodeCache = {};

//         // 1. 标记所有骨骼、蒙皮、网格引用
//         this._invokeAll(ext => ext._markDefs && ext._markDefs());

//         // 2. 执行所有插件的 beforeRoot
//         Promise.all(this._invokeAll(ext => ext.beforeRoot && ext.beforeRoot()))
//             .then(() => {
//                 // 3. 并行加载：场景、动画、相机
//                 return Promise.all([
//                     this.getDependencies('scene'),
//                     this.getDependencies('animation'),
//                     this.getDependencies('camera'),
//                 ]);
//             })
//             .then(results => {
//                 // 4. 组装最终 glTF 对象
//                 const gltf = {
//                     scene: results[0][json.scene || 0],  // 默认场景
//                     scenes: results[0],                  // 所有场景
//                     animations: results[1],              // 所有动画
//                     cameras: results[2],                 // 所有相机
//                     asset: json.asset,                   // 文件信息
//                     parser: scope,                       // 自身引用
//                     userData: {}
//                 };

//                 // 执行扩展处理
//                 assignExtrasToObject(extensions, gltf, json);
//                 assignUserData(gltf, json);

//                 // 5. 执行所有插件的 afterRoot
//                 return Promise.all(
//                     scope._invokeAll(plugin => plugin.afterRoot && plugin.afterRoot(gltf))
//                 ).then(() => {
//                     onLoad(gltf); // 解析完成！
//                 });
//             })
//             .catch(onError);
//     }

//     /**
//      * 标记骨骼、蒙皮、网格、相机引用关系
//      * 作用：提前知道哪些节点是骨骼、哪些被引用
//      */
//     _markDefs() {
//         const json = this.json;
//         const nodes = json.nodes || [];
//         const skins = json.skins || [];
//         const meshes = json.meshes || [];

//         // 皮肤 → 标记关节为骨骼
//         for (let i = 0; i < skins.length; i++) {
//             const skin = skins[i];
//             for (let j = 0; j < skin.joints.length; j++) {
//                 nodes[skin.joints[j]].isBone = true;
//             }
//         }

//         // 节点 → 标记引用的网格、相机
//         for (let i = 0; i < nodes.length; i++) {
//             const node = nodes[i];
//             if (node.mesh !== undefined) {
//                 this._addNodeRef(this.meshCache, node.mesh);
//                 if (node.skin !== undefined) {
//                     meshes[node.mesh].isSkinnedMesh = true;
//                 }
//             }
//             if (node.camera !== undefined) {
//                 this._addNodeRef(this.cameraCache, node.camera);
//             }
//         }
//     }

//     // 增加节点引用计数（用于实例化）
//     _addNodeRef(cache, index) {
//         if (index === undefined) return;
//         if (!cache.refs[index]) cache.refs[index] = 0;
//         cache.refs[index]++;
//     }

//     // 实例化复用对象（多节点引用同一个网格时克隆）
//     _getNodeRef(cache, index, object) {
//         if (cache.refs[index] <= 1) return object;

//         const clone = object.clone();
//         clone.name += '_instance_' + cache.uses[index]++;
//         return clone;
//     }

//     // 调用一个插件的方法
//     _invokeOne(func) {
//         const plugins = Object.values(this.plugins);
//         plugins.push(this);

//         for (let i = 0; i < plugins.length; i++) {
//             const result = func(plugins[i]);
//             if (result) return result;
//         }
//         return null;
//     }

//     // 调用所有插件的方法
//     _invokeAll(func) {
//         const plugins = Object.values(this.plugins);
//         plugins.unshift(this);

//         const results = [];
//         for (let i = 0; i < plugins.length; i++) {
//             const r = func(plugins[i]);
//             if (r) results.push(r);
//         }
//         return results;
//     }

//     // ======================================================
//     // 【核心依赖加载】
//     // 根据类型（scene/node/mesh/material/texture）加载对象
//     // ======================================================
//     getDependency(type, index) {
//         const key = type + ':' + index;
//         let dependency = this.cache.get(key);

//         if (!dependency) {
//             switch (type) {
//                 case 'scene':
//                     dependency = this.loadScene(index);
//                     break;
//                 case 'node':
//                     dependency = this._invokeOne(p => p.loadNode && p.loadNode(index));
//                     break;
//                 case 'mesh':
//                     dependency = this._invokeOne(p => p.loadMesh && p.loadMesh(index));
//                     break;
//                 case 'accessor':
//                     dependency = this.loadAccessor(index);
//                     break;
//                 case 'bufferView':
//                     dependency = this._invokeOne(p => p.loadBufferView && p.loadBufferView(index));
//                     break;
//                 case 'buffer':
//                     dependency = this.loadBuffer(index);
//                     break;
//                 case 'material':
//                     dependency = this._invokeOne(p => p.loadMaterial && p.loadMaterial(index));
//                     break;
//                 case 'texture':
//                     dependency = this._invokeOne(p => p.loadTexture && p.loadTexture(index));
//                     break;
//                 case 'skin':
//                     dependency = this.loadSkin(index);
//                     break;
//                 case 'animation':
//                     dependency = this._invokeOne(p => p.loadAnimation && p.loadAnimation(index));
//                     break;
//                 case 'camera':
//                     dependency = this.loadCamera(index);
//                     break;
//                 default:
//                     dependency = this._invokeOne(p => p !== this && p.getDependency && p.getDependency(type, index));
//                     if (!dependency) throw new Error('Unknown type: ' + type);
//                     break;
//             }

//             this.cache.add(key, dependency);
//         }

//         return dependency;
//     }

//     // 加载某一类所有资源
//     getDependencies(type) {
//         let cacheKey = this.cache.get(type);
//         if (!cacheKey) {
//             const scope = this;
//             const array = this.json[type + (type === 'mesh' ? 'es' : 's')] || [];
//             cacheKey = Promise.all(array.map((_, i) => scope.getDependency(type, i)));
//             this.cache.add(type, cacheKey);
//         }
//         return cacheKey;
//     }

//     // ======================================================
//     // 底层资源加载
//     // ======================================================

//     /** 加载 buffer（二进制数据） */
//     loadBuffer(index) {
//         const buffer = this.json.buffers[index];
//         const fileLoader = this.fileLoader;

//         if (buffer.type && buffer.type !== 'arraybuffer') {
//             throw new Error('THREE.GLTFLoader: Unsupported buffer type.');
//         }

//         // GLB 内置 buffer → 直接返回解析好的 body
//         if (buffer.uri === undefined && index === 0) {
//             return Promise.resolve(this.extensions['KHR_binary_glTF'].body);
//         }

//         // 加载外部 .bin 文件
//         return new Promise((resolve, reject) => {
//             fileLoader.load(
//                 resolveURL(buffer.uri, this.options.path),
//                 resolve,
//                 undefined,
//                 () => reject(new Error('Failed to load buffer'))
//             );
//         });
//     }

//     /** 加载 bufferView（二进制切片） */
//     loadBufferView(index) {
//         const bv = this.json.bufferViews[index];
//         return this.getDependency('buffer', bv.buffer).then(buffer => {
//             const byteLength = bv.byteLength || 0;
//             const byteOffset = bv.byteOffset || 0;
//             return buffer.slice(byteOffset, byteOffset + byteLength);
//         });
//     }

//     /** 加载访问器（顶点、法线、UV、权重等） */
//     loadAccessor(index) {
//         // 从 bufferView 读取二进制 → 生成 typed array → Three.js BufferAttribute
//         // 支持稀疏数据、 interleaved 内存、归一化等 glTF 高级特性
//     }

//     /** 加载纹理 */
//     loadTexture(index) {
//         // 加载图片 → 处理 sampler → 翻转、颜色空间、压缩格式
//     }

//     /** 加载材质（PBR/Unlit） */
//     loadMaterial(index) {
//         // 解析 PBR 金属/粗糙度
//         // 解析基础色、金属度、粗糙度、法线、AO、自发光
//         // 支持扩展：清漆、透射、薄膜、体积、自发光强度
//     }

//     /** 加载网格（geometry + material） */
//     loadMesh(index) {
//         // 解析 primitives → 生成 Geometry → 生成 Mesh
//         // 支持：三角带、三角扇、点、线、蒙皮、变形目标
//     }

//     /** 加载节点（Object3D） */
//     loadNode(index) {
//         // 矩阵/旋转/平移/缩放
//         // 挂载 mesh / camera / light
//         // 处理父子关系
//     }

//     /** 加载场景 */
//     loadScene(index) {
//         // 组装所有节点 → 生成 Scene
//     }

//     /** 加载相机 */
//     loadCamera(index) {
//         // 透视/正交相机
//     }

//     /** 加载皮肤（蒙皮） */
//     loadSkin(index) {
//         // 骨骼 + 逆绑定矩阵
//     }

//     /** 加载动画 */
//     loadAnimation(index) {
//         // 解析通道、采样器 → 生成 KeyframeTrack / AnimationClip
//         // 支持平移、旋转、缩放、变形目标权重
//     }
// }


function buildGLBFromParts(header, contentStr, bodyBuffer) {
  // 1. JSON 字符串转 UTF-8 字节数组
  const encoder = new TextEncoder();
  const jsonData = encoder.encode(contentStr);
  // GLB 要求 JSON chunk 数据长度必须是 4 字节对齐
  const jsonChunkLength = (jsonData.length + 3) & ~3; // 向上取整到 4 的倍数
  const jsonPadding = jsonChunkLength - jsonData.length;

  // 2. BIN chunk 长度（body 已经是 ArrayBuffer）
  const binChunkLength = bodyBuffer.byteLength;
  // BIN chunk 数据也需要 4 字节对齐（通常已经是，但保险处理）
  const binPaddedLength = (binChunkLength + 3) & ~3;
  const binPadding = binPaddedLength - binChunkLength;

  // 3. 总文件长度 = 12 + (8 + jsonChunkLength) + (8 + binPaddedLength)
  const totalLength = 12 + 8 + jsonChunkLength + 8 + binPaddedLength;

  // 4. 构建 ArrayBuffer
  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);

  // 写入 GLB 头
  const magic = 0x46546C67; // "glTF" 的小端字节序
  view.setUint32(0, magic, true);
  view.setUint32(4, header.version, true);   // 通常是 2
  view.setUint32(8, totalLength, true);

  let offset = 12;

  // 写入 JSON chunk
  view.setUint32(offset, jsonChunkLength, true); offset += 4;
  view.setUint32(offset, 0x4E4F534A, true); offset += 4; // "JSON" 类型
  // 复制 JSON 数据
  new Uint8Array(buffer, offset, jsonData.length).set(jsonData);
  offset += jsonChunkLength; // 已对齐

  // 写入 BIN chunk
  view.setUint32(offset, binPaddedLength, true); offset += 4;
  view.setUint32(offset, 0x004E4942, true); offset += 4; // "BIN\0" 类型
  // 复制 body 数据
  new Uint8Array(buffer, offset, binChunkLength).set(new Uint8Array(bodyBuffer));
  // 剩余 padding 自动为 0（无需显式填充）

  return buffer;
}