// 工具函数模块：导出6个工具方法 BR/G/I_/J1/bk/oG
(t, n, r) => {
    // 向n对象挂载工具方法
    r.d(n, {
        BR: () => g,  // 解析文件/路径，获取url、文件对象、后缀名
        G: () => m,   // 过滤纹理配置参数
        I_: () => h,  // 截取路径中最后一个/之前的目录部分
        J1: () => l,  // 截取文件名（可移除后缀）
        bk: () => _,  // 拼接url与参数，生成缓存key
        oG: () => s   // 获取文件后缀名
    });

    /**
     * 工具函数：获取文件后缀名
     * @param {string} D - 文件名/路径
     * @returns {string} 文件后缀（无则返回空）
     */
    function s(D) {
        let U = D.split(".");
        return U.length > 1 ? U.pop() : "";
    }

    /**
     * 工具函数：截取文件所在目录路径
     * @param {string} D - 完整路径
     * @returns {string} 目录路径
     */
    function h(D) {
        let U = D.lastIndexOf("/");
        return U !== -1 ? D.substring(0, U) : "";
    }

    /**
     * 工具函数：获取文件名（可移除后缀）
     * @param {string} D - 路径
     * @param {string} U - 要移除的后缀名
     * @returns {string} 纯文件名
     */
    function l(D, U) {
        let R = D.split("/").pop();
        return U ? R.replace("." + U, "") : R;
    }

    /**
     * 核心工具：解析输入参数，标准化为 url/file/ext
     * @param {File|Object|string} D - 文件对象/包含mainFile的对象/路径字符串
     * @returns {Object} { url:路径, file:文件对象, ext:后缀名 }
     */
    function g(D) {
        let U = "", R = null, ne = "";
        // 输入为浏览器File对象
        if (typeof File < "u" && D instanceof File) {
            U = D.name;
            ne = s(U);
            R = D;
        } 
        // 输入为自定义对象（包含mainFile）
        else if (typeof D == "object") {
            U = D.mainFile.name;
            ne = s(U);
            R = D;
        } 
        // 输入为纯路径字符串
        else {
            U += D;
            ne = s(U);
        }
        return { url: U, file: R, ext: ne };
    }

    /**
     * 工具函数：拼接基础路径与配置参数，生成唯一缓存key
     * @param {string} D - 基础路径
     * @param {Object} U - 参数对象
     * @returns {string} 拼接后的字符串
     */
    function _(D, U) {
        let R = [D];
        for (let ne in U) {
            U[ne] !== void 0 && R.push(ne + "=" + U[ne]);
        }
        return R.join(",");
    }

    // 纹理配置白名单：仅保留这些有效配置项
    const A = ["flipY", "mapping", "wrapS", "wrapT", "dataType", "magFilter", "minFilter", "format", "anisotropy", "encoding", "repeat"];

    /**
     * 工具函数：过滤并标准化纹理配置
     * @param {Object} D - 原始纹理配置
     * @returns {Object} 过滤后的合法纹理配置
     */
    function m(D) {
        let U = {};
        for (let R of A) {
            if (D[R] !== void 0) {
                // dataType 重命名为 type（适配Three.js规范）
                R === "dataType" ? (U.type = D[R]) : (U[R] = D[R]);
            }
        }
        return U;
    }
}

// ==============================================
// glTF/glb模型加载器：继承自基础加载器
// ==============================================
class ye extends s.g {
    constructor() {
        super(...arguments);
        // 支持的文件格式
        B(this, "extensions", ["gltf", "glb", "bin"]);
    }

    /**
     * 加载gltf/glb模型
     * @param {Object} param0 - 加载参数
     * @param {string} param0.url - 模型路径
     * @param {File} param0.file - 文件对象
     * @param {Function} param0.onLoad - 加载完成回调
     * @param {Function} param0.onProgress - 加载进度回调
     * @param {Function} param0.onError - 加载失败回调
     */
    load({ url: b, file: E, onLoad: T, onProgress: L, onError: F }) {
        // 模型加载完成后的回调处理函数
        // fe = GLTFLoader加载完成后返回的完整模型对象（包含场景、动画、材质等所有数据）
        const j = (fe) => {
            const te = fe.scene;
            // 2. 把模型自带的【动画数据】绑定到场景对象上
            // 作用：让引擎后续可以播放模型动画（旋转、位移、骨骼动画等）
            Object.assign(te, { animations: fe.animations });
            // 3. 处理模型网格数据（关键：提取模型的mesh、材质、纹理信息）
            // jo.tQ(te) = 工具函数，遍历场景，收集所有网格、材质、纹理并结构化
            // 然后把结果挂载到 te.meshData 上，供引擎使用
            Object.assign(te.meshData, jo.tQ(te));
            // 回调返回处理后的场景
            T(te);
        };

        // 初始化glTF加载器 + Draco压缩解码器
        let W = new Fa(this.viewer.loadingManager);
        let re = new da(this.viewer.loadingManager);
        re.setDecoderPath(this.viewer.dracoPath); // Draco解码库路径
        W.setDRACOLoader(re);
        W.setMeshoptDecoder(se);
        // 执行加载
        W.load(b, j, L, F, E);
    }
}

// ==============================================
// 核心渲染引擎类：Wn（xviewer主类）
// ==============================================
const Wn = class Wn extends R {
    /**
     * 构造函数：初始化3D引擎
     * @param {Object} param0 - 配置项
     * @param {HTMLElement} param0.root - 根容器
     * @param {HTMLCanvasElement} param0.canvas - canvas画布
     * @param {boolean} param0.shadows - 是否开启阴影
     * @param {boolean} param0.depth - 是否开启深度缓冲
     * @param {Object} param0.camera - 相机配置
     * @param {boolean} param0.autoStart - 自动启动渲染
     * @param {boolean} param0.autoResize - 自动适配窗口
     */
    constructor({
        root: Fe,
        canvas: qe = document.getElementById("canvas"),
        shadows: wt = !1,
        depth: An = !1,
        outputEncoding: Qt = s.knz,
        toneMapping: Pi = s.EoG,
        toneMappingExposure: ui = 1,
        camera: mi = {
            fov: 45,
            near: 1,
            far: 1e3,
            position: N.nX(0, 0, 4)
        },
        autoStart: Si = !0,
        autoResize: Gt = !0,
        floatPacking: On = !1,
        maxDPR: kn = 1.5,
        orientation: bi = Ze.i.AUTO,
        dracoPath: $i,
        targetFrameRate: zr,
        loader: Fi = {},
        tasker: vr = {},
        ...Oi
    } = {}) {
        super();

        // ==================== 私有属性定义 ====================
        B(this, "_width", 0);                // 画布宽度
        B(this, "_height", 0);               // 画布高度
        B(this, "_running", !1);             // 渲染循环运行状态
        B(this, "_renderer");                // Three.js渲染器
        B(this, "_root");                    // 根DOM容器
        B(this, "_canvas");                  // Canvas元素
        B(this, "_context");                 // WebGL上下文
        B(this, "_loadingManager");          // 资源加载管理器
        B(this, "_taskManager");             // 任务管理器
        B(this, "_scene");                   // 3D场景
        B(this, "_camera");                  // 相机
        B(this, "_viewport", { width: 1, height: 1, factor: 1 }); // 视口信息
        B(this, "_input", new ne.i(this));   // 输入事件管理
        B(this, "_caches", new Map());       // 资源缓存Map
        B(this, "_loaders", new Map());      // 文件加载器Map
        B(this, "_brower", new et());        // 浏览器环境检测
        B(this, "_autoResize", !0);          // 自动缩放开关
        B(this, "_floatPacking", !1);        // 浮点纹理打包
        B(this, "_targetFrameRate", null);   // 目标帧率
        B(this, "_orientation", Ze.i.AUTO);  // 屏幕方向
        B(this, "_dracoPath", "https://www.gstatic.com/draco/versioned/decoders/1.5.5/"); // Draco解码地址
        B(this, "_RENDER_TARGET_FLOAT_TYPE", s.cLu); // 渲染目标浮点类型
        B(this, "_DATA_FLOAT_TYPE", s.VzW);  // 数据纹理浮点类型
        B(this, "_rootRotated", !1);         // 根容器是否旋转
        B(this, "_maxDPR", 1.5);             // 最大像素比
        B(this, "_time", 0);                 // 当前时间
        B(this, "_lastTime", 0);             // 上一帧时间

        // WebGL上下文配置
        let ts = {
            alpha: !1,
            depth: !0,
            stencil: !0,
            antialias: !1,
            premultipliedAlpha: !0,
            preserveDrawingBuffer: !1,
            powerPreference: "default",
            failIfMajorPerformanceCaveat: !1
        };

        // 获取WebGL上下文
        let Gr = this._getContext(qe, Object.assign(ts, Oi));
        if (Gr === null) {
            console.error("当前平台不支持WebGL");
            return;
        }

        // ==================== 核心对象初始化 ====================
        this._root = Fe || qe;
        this._canvas = qe;
        this._context = Gr;
        this._maxDPR = kn;
        this._scene = new s.xsS(); // Three.js场景
        // 初始化透视相机
        this._camera = N.$p(
            new s.cPb(mi.fov, mi.aspect || qe.width / qe.height, mi.near, mi.far),
            mi
        );
        // 初始化渲染器
        this._renderer = new s.CP7({ canvas: qe, context: Gr });
        this._renderer.setPixelRatio(this.dpr); // 设置像素比
        this._renderer.outputEncoding = Qt;     // 输出编码
        this._renderer.toneMapping = Pi;        // 色调映射
        this._renderer.toneMappingExposure = ui;// 曝光度
        this._renderer.shadowMap.enabled = !!wt;// 阴影开关
        this._renderer.info.autoReset = !1;    // 渲染信息自动重置

        // 基础配置赋值
        this._autoResize = Gt;
        this._orientation = bi;
        this._loadingManager = new s.lLk(Fi.onLoad, Fi.onProgress, Fi.onError);
        this._taskManager = new zt(vr.onComplete, vr.onProgress, vr.onError);

        // 绑定事件、初始化颜色空间、插件、加载器
        this._input.addEventListeners();
        this._setColorSpace();
        this._addDefaultPlugins();
        this._addDefaultLoaders();

        // 自定义配置覆盖
        $i && (this._dracoPath = $i);
        zr && (this.targetFrameRate = zr);
        Si && this.start(); // 自动启动渲染
        this.printInfo();   // 打印引擎信息
    }

    // ==================== Getter/Setter 访问器 ====================
    get width() { return this._width; }
    get height() { return this._height; }
    get rootRotated() { return this._rootRotated; }
    get orientation() { return this._orientation; }
    get dracoPath() { return this._dracoPath; }
    get targetFrameRate() { return this._targetFrameRate; }
    set targetFrameRate(Fe) {
        if (Fe <= 0) throw Error("targetFrameRate必须大于0");
        this._targetFrameRate = Fe;
    }
    get canvas() { return this._canvas; }
    get context() { return this._context; }
    get scene() { return this._scene; }
    get camera() { return this._camera; }
    get renderer() { return this._renderer; }
    // 设备像素比（限制最大值）
    get dpr() { return Math.min(this._maxDPR, window.devicePixelRatio); }

    /**
     * 打印引擎版本与环境信息
     */
    printInfo() {
        const Fe = this._renderer.getContext();
        console.log([
            "Welcome to xviewer.js",
            "Three Version: " + s.UZH,
            "WebGL Version: " + Fe.getParameter(Fe.VERSION),
            "ColorSpace: " + this.colorSpace
        ].join("\n"));
    }

    /**
     * 创建并校验WebGL上下文
     * @param {HTMLCanvasElement} Fe - canvas
     * @param {Object} qe - 上下文配置
     * @returns {WebGLContext|null} 上下文对象
     */
    _getContext(Fe, qe) {
        const wt = this._brower;
        // 浏览器兼容性校验
        if (!((wt.isChrome || wt.isSafari || wt.isEdge || wt.isFirefox || wt.isOpera) && !wt.isIE)) {
            console.error("不支持的平台");
            return null;
        }
        if (!(Fe instanceof HTMLCanvasElement)) {
            console.error("Canvas为空");
            return null;
        }

        // 优先创建WebGL2上下文
        if (window.WebGL2RenderingContext) {
            try {
                let Qt = Fe.getContext("webgl2", qe);
                this._RENDER_TARGET_FLOAT_TYPE = s.cLu;
                this._DATA_FLOAT_TYPE = s.VzW;
                return Qt;
            } catch (Qt) {
                console.error(Qt);
                return null;
            }
        } 
        // 兼容WebGL1
        else if (window.WebGLRenderingContext) {
            let Qt = Fe.getContext("webgl", qe) || Fe.getContext("experimental-webgl", qe);
            return Qt;
        }
        return null;
    }

    /**
     * 设置颜色空间
     */
    _setColorSpace() {
        s.epp.enabled = this.renderer.outputEncoding === s.knz;
    }

    /**
     * 注册默认插件
     */
    _addDefaultPlugins() {
        this.addPlugin(Se);
    }

    /**
     * 注册默认文件加载器
     */
    _addDefaultLoaders() {
        this.addLoader(h.f0);
        this.addLoader(h.GP);
        this.addLoader(h.q7);
        this.addLoader(h.Ae);
        this.addLoader(h.uo);
        this.addLoader(h.k7);
        this.addLoader(h.Zt);
        this.addLoader(h.YQ);
        this.addLoader(li);
        this.addLoader(h.KC);
    }

    /**
     * 销毁前清理资源
     */
    _onPreDestroy() {
        this._caches.clear();
        this._renderer.dispose();
        this._input.removeAllListeners();
        this.destroyComponents(this._scene);
        this.stop();
    }

    /**
     * 加载3D模型（对外核心方法）
     * @param {Object} param0 - 加载配置
     * @returns {Object} 加载完成的模型对象
     */
    async load({ url: Fe, settings: qe, clear: wt = !1, castShadow: An = !1, receiveShadow: Qt = !1, parent: Pi = this._scene, onProgress: ui, ...mi }) {
        const Si = await this.loadAsset({
            url: Fe,
            onProgress: ui,
            ...mi
        });
        // 设置模型阴影
        (An || Qt) && Si.meshData.meshes.forEach(Gt => {
            Gt.castShadow = An;
            Gt.receiveShadow = Qt;
        });
        // 清空父容器
        wt && Pi.clear();
        // 添加到场景
        this.addNode(Si, mi);
        return Si;
    }

    /**
     * 加载资源（模型/纹理/图片），带缓存机制
     * @param {Object} param0 - 资源配置
     * @returns {Promise} 加载Promise
     */
    loadAsset({ url: Fe, selExt: qe, onProgress: wt, ...An }) {
        return new Promise((Qt, Pi) => {
            // 解析资源路径、文件、后缀
            const { url: ui, file: mi, ext: Si } = q.BR(Fe);
            // 过滤纹理配置
            const Gt = q.G(An);
            // 生成缓存key
            const On = q.bk(ui, Gt);
            // 命中缓存直接返回
            let kn = this._caches.get(On);
            if (kn) {
                Qt(kn);
                return;
            }

            // 缓存未命中：加载完成后存入缓存
            const bi = (zr) => {
                this._caches.set(On, zr);
                Qt(zr);
            };

            // 选择加载器
            let $i = qe || Si;
            if (this._loaders.has($i)) {
                this._loaders.get($i).load({
                    url: ui,
                    file: mi,
                    texSettings: Gt,
                    onProgress: wt,
                    onLoad: bi,
                    onError: Pi
                });
            } else {
                Pi("缺少对应文件加载器: " + Si);
            }
        });
    }

    /**
     * 注册自定义加载器
     * @param {Class} Fe - 加载器类
     * @returns {Wn} 引擎实例
     */
    addLoader(Fe) {
        let qe = new Fe(this);
        for (let wt of qe.extensions) {
            this._loaders.set(wt, qe);
        }
        return this;
    }

    /**
     * 设置场景环境贴图
     */
    async setEnvironment(Fe = {}) {
        let qe = Fe.url ?? null;
        this._scene.userData.environment !== qe && (
            this._scene.userData.environment = qe,
            this._scene.environment = qe ? await this.loadAsset(Object.assign({ mapping: s.dSO }, Fe)) : null
        );
        Fe && Fe.noBackground || this.setBackground(Fe);
    }

    /**
     * 设置场景背景
     */
    async setBackground(Fe) {
        let qe = Fe.color || Fe.url || null;
        this._scene.userData.background !== qe && (
            this._scene.userData.background = qe,
            this._scene.background = qe ? Fe.color || await this.loadAsset(Object.assign({ mapping: s.dSO }, Fe)) : null
        );
    }

    /**
     * 场景快照/隔离渲染
     */
    portal(Fe) {
        const qe = this._scene, wt = this._camera;
        this._scene = new s.xsS();
        const An = Fe();
        this._scene = qe;
        this._camera = wt;
        return An;
    }

    /**
     * 向场景添加模型/节点
     */
    addNode(Fe, { scale: qe, position: wt, rotation: An, debug: Qt, shadowArgs: Pi, makeDefault: ui, args: mi, parent: Si = this._scene, components: Gt = [], ...On } = {}) {
        let kn, bi = Xt(Fe, mi);
        if (bi.isObject3D) {
            kn = bi;
            Si.add(bi);
            // 挂载组件
            for (let $i of Gt) {
                this.addComponent(kn, $i.ins);
                N.$p($i.ins, $i.props);
            }
        } else if (bi.isComponent) {
            kn = bi.node || new s.Tme();
            Si.add(kn);
            this.addComponent(kn, bi);
        } else {
            throw Error("不支持的对象类型");
        }
        // 设置缩放/位置/旋转
        N.$p(bi, On, !0);
        N.$p(kn, { scale: qe, position: wt, rotation: An });
        return bi;
    }

    /**
     * 窗口大小自适应
     */
    resize(Fe = window.innerWidth, qe = window.innerHeight) {
        // 处理屏幕方向旋转
        this._rootRotated = this._orientation === Ze.i.LANDSCAPE ? Fe < qe : this._orientation === Ze.i.PORTRAIT ? Fe > qe : !1;
        if (this._rootRotated) [Fe, qe] = [qe, Fe];

        if (this._width !== Fe || this._height !== qe) {
            this._width = Fe;
            this._height = qe;
            // 修改容器样式
            let wt = this._root;
            if (this._rootRotated) {
                wt.style.transform = "rotate(90deg)";
                wt.style.transformOrigin = "0px 0px 0px";
                wt.style.margin = `0 0 0 ${qe}px`;
            } else {
                wt.style.transform = "rotate(0deg)";
                wt.style.margin = "0px auto";
            }
            wt.style.width = `${Fe}px`;
            wt.style.height = `${qe}px`;

            // 更新相机投影矩阵
            let An = this._camera;
            if (An.isPerspectiveCamera) {
                An.aspect = Fe / qe;
                An.updateProjectionMatrix();
            }
            // 触发渲染器 resize
            this.resizeCallback(Fe, qe);
            this.emit(ne.i.RESIZE, Fe, qe);
        }
    }

    /**
     * 渲染一帧
     */
    render(Fe) {
        this._renderer.info.reset();
        this.renderCallback(Fe);
    }

    /**
     * 渲染器尺寸更新
     */
    resizeCallback(Fe, qe) {
        this._renderer.setSize(Fe, qe);
    }

    /**
     * 执行场景渲染
     */
    renderCallback(Fe) {
        this._renderer.render(this._scene, this._camera);
    }

    /**
     * 渲染循环核心逻辑
     */
    loop(Fe) {
        this._autoResize && this.resize();
        Fe = Math.min(Fe, .067); // 限制最大时间步长
        this.update(Fe);
        this.emit(Wn.RENDER_BEFORE);
        this.render(Fe);
        this.emit(Wn.RENDER_AFTER);
    }

    /**
     * 帧更新控制（支持固定帧率）
     */
    _frame(Fe) {
        this._time = Fe;
        this._taskManager.update();
        // 固定帧率渲染
        if (N.ri(this._targetFrameRate)) {
            const qe = 1 / this._targetFrameRate;
            const wt = Fe - this._lastTime;
            wt >= qe && (this.loop(wt), this._lastTime = Fe - wt % qe);
        } 
        // 实时渲染
        else {
            this.loop(Fe - this._lastTime);
            this._lastTime = Fe;
        }
    }

    /**
     * 启动渲染循环
     */
    start() {
        if (!this._running) {
            this._running = !0;
            const Fe = (qe) => {
                this._running && (this._frame(qe * .001), requestAnimationFrame(Fe));
            };
            requestAnimationFrame(Fe);
        }
        return this;
    }

    /**
     * 停止渲染循环
     */
    stop() {
        this._running = !1;
        this._time = this._lastTime = 0;
        return this;
    }
};

核心功能总结（最关键的部分）
1. Fa 类 = Three.js 官方 GLTFLoader
它是底层加载器，负责：
加载 .gltf / .glb 文件
解析 glTF 2.0 格式
支持 Draco 几何压缩 解码
支持 Meshopt 几何压缩 解码
支持 KTX2 纹理压缩
支持 glTF 官方扩展（无光照、动画、材质、变形等）
兼容 JSON / 二进制 GLB 格式
2. ye 类 = 业务层封装加载器
给上层引擎使用，做了 4 件事：
声明支持格式：gltf/glb/bin
创建并配置 GLTFLoader
配置 Draco 解压路径
加载完成后标准化模型（动画、meshData）
把模型交给引擎渲染
3. 整个流程一句话总结
ye 调用 Fa → 加载 / 解压 / 解析 glTF → 提取场景 / 动画 / 网格 → 返回给 3D 引擎使用。
你最需要记住的
Fa = 官方 glTF 加载器（底层）
ye = 引擎业务加载器（上层）
Draco + Meshopt = 模型压缩解压（让模型更小、加载更快）
ye.load() = 引擎加载模型的入口方法
/**
 * 类 Fa = Three.js 原生 GLTFLoader（glTF/glb 模型官方加载器）
 * 作用：完整实现 glTF2.0 解析、解压、插件扩展、Draco 压缩几何解码
 */
class Fa extends m.aNw {
  constructor(y) {
    super(y);

    // 解码器/加载器 实例（用于模型压缩格式解码）
    this.dracoLoader = null;     // Draco 几何压缩解码器
    this.ktx2Loader = null;      // KTX2 纹理压缩加载器
    this.meshoptDecoder = null;  // Meshopt 几何压缩解码器

    // 插件回调数组（glTF 扩展插件）
    this.pluginCallbacks = [];

    // 注册 glTF 插件（处理各种扩展格式）
    this.register(function (b) { return new al(b) });
    this.register(function (b) { return new ul(b) });
    this.register(function (b) { return new ka(b) });
    this.register(function (b) { return new Ua(b) });
    this.register(function (b) { return new ho(b) });
    this.register(function (b) { return new Xl(b) });
    this.register(function (b) { return new ll(b) });
    this.register(function (b) { return new cl(b) });
    this.register(function (b) { return new ol(b) });
    this.register(function (b) { return new fa(b) });
    this.register(function (b) { return new $s(b) });
    this.register(function (b) { return new jl(b) });
    this.register(function (b) { return new Na(b) });
    this.register(function (b) { return new pa(b) });
  }

  /**
   * 加载模型入口方法
   * @param {string} y 模型url
   * @param {function} b 加载成功回调
   * @param {function} E 加载进度回调
   * @param {function} T 加载失败回调
   * @param {file} L 文件对象
   */
  load(y, b, E, T, L) {
    const F = this;
    let resourceBase;

    // 自动提取资源基础路径
    if (this.resourcePath !== "") {
      resourceBase = this.resourcePath;
    } else if (this.path !== "") {
      resourceBase = this.path;
    } else {
      resourceBase = m.Zp0.extractUrlBase(y);
    }

    // 通知加载管理器：开始加载
    this.manager.itemStart(y);

    // 加载错误处理
    const onError = function (err) {
      T && T(err);
      console.error(err);
      F.manager.itemError(y);
      F.manager.itemEnd(y);
    };

    // 创建文件加载器
    const fileLoader = new m.hH6(this.manager);
    fileLoader.setPath(this.path);
    fileLoader.setResponseType("arraybuffer");
    fileLoader.setRequestHeader(this.requestHeader);
    fileLoader.setWithCredentials(this.withCredentials);

    // 加载二进制数据 → 解析 glTF
    fileLoader.load(
      y,
      function (bufferData) {
        try {
          // 解析 glTF 二进制/JSON 数据
          F.parse(
            bufferData,
            resourceBase,
            function (result) {
              b(result);        // 加载成功
              F.manager.itemEnd(y);
            },
            onError,
            L?.additionalFiles
          );
        } catch (err) {
          onError(err);
        }
      },
      E,          // 进度
      onError,    // 失败
      L?.mainFile // 文件
    );
  }

  // 设置 Draco 几何解码器
  setDRACOLoader(y) {
    this.dracoLoader = y;
    return this;
  }

  // 已废弃的 DDS 格式
  setDDSLoader() {
    throw new Error('THREE.GLTFLoader: "MSFT_texture_dds" 已废弃，请使用 KHR_texture_basisu');
  }

  // 设置 KTX2 纹理压缩加载器
  setKTX2Loader(y) {
    this.ktx2Loader = y;
    return this;
  }

  // 设置 Meshopt 几何解码器
  setMeshoptDecoder(y) {
    this.meshoptDecoder = y;
    return this;
  }

  // 注册插件
  register(y) {
    if (this.pluginCallbacks.indexOf(y) === -1) {
      this.pluginCallbacks.push(y);
    }
    return this;
  }

  // 卸载插件
  unregister(y) {
    const index = this.pluginCallbacks.indexOf(y);
    if (index !== -1) this.pluginCallbacks.splice(index, 1);
    return this;
  }

  /**
   * 解析 glTF/glb 核心方法
   * @param {*} data 模型数据（json/buffer）
   * @param {*} path 资源路径
   * @param {*} onSuccess 成功
   * @param {*} onError 失败
   * @param {*} files 附加文件
   */
  parse(data, path, onSuccess, onError, files) {
    let json;
    const extensions = {};
    const plugins = {};
    const textDecoder = new TextDecoder();

    // 数据类型判断：字符串 / ArrayBuffer / GLB
    if (typeof data === "string") {
      json = JSON.parse(data);
    } else if (data instanceof ArrayBuffer) {
      const magicBytes = new Uint8Array(data, 0, 4).join("");
      
      // 如果是 GLB 二进制格式
      if (magicBytes === ma || magicBytes === nr) {
        try {
          extensions[ti.KHR_BINARY_GLTF] = new dl(data);
        } catch (e) {
          onError && onError(e);
          return;
        }
        json = JSON.parse(extensions[ti.KHR_BINARY_GLTF].content);
      } else {
        json = JSON.parse(textDecoder.decode(data));
      }
    } else {
      json = data;
    }

    // 必须是 glTF 2.0 以上版本
    if (!json.asset || json.asset.version[0] < 2) {
      onError && onError(new Error("仅支持 glTF 2.0 及以上版本"));
      return;
    }

    // 创建解析器
    const parser = new p(json, {
      path: path || this.resourcePath || "",
      crossOrigin: this.crossOrigin,
      requestHeader: this.requestHeader,
      manager: this.manager,
      ktx2Loader: this.ktx2Loader,
      meshoptDecoder: this.meshoptDecoder,
    });

    parser.fileLoader.setRequestHeader(this.requestHeader);

    // 注册所有插件
    for (let i = 0; i < this.pluginCallbacks.length; i++) {
      const plugin = this.pluginCallbacks[i](parser);
      plugins[plugin.name] = plugin;
      extensions[plugin.name] = true;
    }

    // 处理官方扩展：无光照、Draco压缩、纹理变换、网格量化
    if (json.extensionsUsed) {
      for (let i = 0; i < json.extensionsUsed.length; i++) {
        const extName = json.extensionsUsed[i];
        const required = json.extensionsRequired || [];

        switch (extName) {
          case ti.KHR_MATERIALS_UNLIT:
            extensions[extName] = new Xr();
            break;
          case ti.KHR_DRACO_MESH_COMPRESSION:
            extensions[extName] = new fl(json, this.dracoLoader);
            break;
          case ti.KHR_TEXTURE_TRANSFORM:
            extensions[extName] = new pl();
            break;
          case ti.KHR_MESH_QUANTIZATION:
            extensions[extName] = new ga();
            break;
          default:
            if (required.indexOf(extName) >= 0 && !plugins[extName]) {
              console.warn(`未知扩展：${extName}`);
            }
        }
      }
    }

    // 附加文件
    json.additionalFiles = files;

    // 给解析器设置扩展 + 插件
    parser.setExtensions(extensions);
    parser.setPlugins(plugins);

    // 开始解析
    parser.parse(onSuccess, onError);
  }

  // Promise 化解析
  parseAsync(data, path) {
    const self = this;
    return new Promise((resolve, reject) => {
      self.parse(data, path, resolve, reject);
    });
  }
}

/* ----------------------------------------------------------- */
/*  上层业务加载器 ye：对 Three.js GLTFLoader 做封装适配引擎
/* ----------------------------------------------------------- */
class ye extends s.g {
  constructor() {
    super(...arguments);
    // 声明支持的模型格式
    B(this, "extensions", ["gltf", "glb", "bin"]);
  }

  /**
   * 引擎调用的加载方法
   */
  load({ url: url, file: file, onLoad: onLoad, onProgress: onProgress, onError: onError }) {
    // 模型加载完成后的处理（你上一轮问过的代码）
    const onModelProcessed = (gltf) => {
      const scene = gltf.scene;

      // 把动画绑定到场景
      Object.assign(scene, { animations: gltf.animations });

      // 解析模型 mesh、材质、纹理
      Object.assign(scene.meshData, jo.tQ(scene));

      // 返回给上层引擎
      onLoad(scene);
    };

    // 创建 GLTF 加载器
    const gltfLoader = new Fa(this.viewer.loadingManager);

    // 创建 Draco 解码器
    const dracoLoader = new da(this.viewer.loadingManager);
    dracoLoader.setDecoderPath(this.viewer.dracoPath);

    // 绑定解码器
    gltfLoader.setDRACOLoader(dracoLoader);
    gltfLoader.setMeshoptDecoder(se);

    // 开始加载
    gltfLoader.load(url, onModelProcessed, onProgress, onError, file);
  }
}


// ==============================================
// 1. 引擎层：图片/纹理加载器（支持 png/jpg/webp/avif）
// ==============================================
class nn extends s.g {
  constructor() {
    super(...arguments);
    // 支持的图片格式
    B(this, "extensions", ["png", "jpg", "webp", "avif"]);
  }

  /**
   * 加载图片并生成纹理
   * @param {string} url - 图片地址
   * @param {File} file - 文件对象
   * @param {Function} onLoad - 加载完成
   * @param {Function} onProgress - 进度
   * @param {Function} onError - 失败
   * @param {object} texSettings - 纹理配置
   */
  load({ url: b, file: E, onLoad: T, onProgress: L, onError: F, texSettings: j }) {
    // 获取渲染器的输出编码（sRGB 等）
    const W = this.viewer.renderer.outputEncoding;

    // 使用 Three.js 图片加载器加载 → 生成纹理
    new _.dpR(this.viewer.loadingManager).load(
      b,
      (re) =>
        // 合并编码 + 自定义配置，返回给上层
        T(Object.assign(re, Object.assign({ encoding: W }, j))),
      L,
      F,
      E
    );
  }
}

// ==============================================
// 2. Three.js 原生：图片加载器（继承基础加载器）
// ==============================================
class XR extends Oo {
  constructor(e) {
    super(e);
  }

  load(e, i, o, a, c) {
    const texture = new $t(); // 创建空纹理
    const imgLoader = new Sd(this.manager); // 创建图片加载器

    imgLoader.setCrossOrigin(this.crossOrigin);
    imgLoader.setPath(this.path);

    // 加载图片 → 赋值给纹理
    imgLoader.load(e, function (img) {
      texture.image = img;
      texture.needsUpdate = true; // 通知 GPU 更新
      i && i(texture);
    }, o, a, c);

    return texture;
  }
}

// ==============================================
// 3. 基础加载器抽象类（所有加载器的父类）
// ==============================================
class Oo {
  constructor(e) {
    this.manager = e || gb; // 加载管理器
    this.crossOrigin = "anonymous";
    this.withCredentials = false;
    this.path = "";
    this.resourcePath = "";
    this.requestHeader = {};
  }

  load() {} // 抽象加载方法
  loadAsync(e) { return new Promise((a,c)=>this.load(e,a,c)) }
  parse() {}
  setCrossOrigin(e) { this.crossOrigin = e; return this }
  setWithCredentials(e) { this.withCredentials = e; return this }
  setPath(e) { this.path = e; return this }
  setResourcePath(e) { this.resourcePath = e; return this }
  setRequestHeader(e) { this.requestHeader = e; return this }
}

// ==============================================
// 4. Three.js 核心：纹理类（所有贴图的基类）
// ==============================================
class $t extends Kr {
  constructor(
    image = $t.DEFAULT_IMAGE,
    mapping = $t.DEFAULT_MAPPING,
    wrapS = hi,
    wrapT = hi,
    magFilter = Hi,
    minFilter = Fr,
    format = Xr,
    type = bs,
    anisotropy = $t.DEFAULT_ANISOTROPY,
    encoding = nn
  ) {
    super();
    this.isTexture = true;
    this.id = Dn++;
    this.uuid = yr();
    this.name = "";

    this.source = new Nn(image); // 图片数据源
    this.mipmaps = [];
    this.mapping = mapping;     // 纹理映射方式

    // 纹理包裹模式
    this.wrapS = wrapS;
    this.wrapT = wrapT;

    // 过滤模式
    this.magFilter = magFilter;
    this.minFilter = minFilter;
    this.anisotropy = anisotropy; // 各向异性

    this.format = format;
    this.internalFormat = null;
    this.type = type;

    // UV 变换
    this.offset = new _t(0, 0);
    this.repeat = new _t(1, 1);
    this.center = new _t(0, 0);
    this.rotation = 0;
    this.matrixAutoUpdate = true;
    this.matrix = new Cr();

    this.generateMipmaps = true;
    this.premultiplyAlpha = false;
    this.flipY = true;          // 垂直翻转
    this.unpackAlignment = 4;
    this.encoding = encoding;   // 颜色编码
    this.userData = {};
    this.version = 0;
    this.onUpdate = null;
  }

  get image() { return this.source.data }
  set image(v) { this.source.data = v }

  // 更新 UV 矩阵
  updateMatrix() {
    this.matrix.setUvTransform(
      this.offset.x, this.offset.y,
      this.repeat.x, this.repeat.y,
      this.rotation,
      this.center.x, this.center.y
    );
  }

  clone() { return new this.constructor().copy(this) }
  copy(t) { /* 复制所有纹理属性 */ return this }
  toJSON(meta) { /* 序列化 */ }
  dispose() { this.dispatchEvent({ type: "dispose" }) }

  // UV 坐标变换（循环/裁切/镜像）
  transformUv(uv) {
    if (this.mapping !== Fi) return uv;
    uv.applyMatrix3(this.matrix);

    // 处理 X 轴包裹
    if (uv.x < 0 || uv.x > 1) {
      switch (this.wrapS) {
        case xs: uv.x = uv.x - Math.floor(uv.x); break; // 重复
        case hi: uv.x = uv.x < 0 ? 0 : 1; break; // 裁切
        case Ti: uv.x = 1 - (uv.x - Math.floor(uv.x)); break; // 镜像
      }
    }

    // 处理 Y 轴包裹
    if (uv.y < 0 || uv.y > 1) {
      switch (this.wrapT) {
        case xs: uv.y = uv.y - Math.floor(uv.y); break;
        case hi: uv.y = uv.y < 0 ? 0 : 1; break;
        case Ti: uv.y = 1 - (uv.y - Math.floor(uv.y)); break;
      }
    }

    if (this.flipY) uv.y = 1 - uv.y;
    return uv;
  }

  // 标记纹理更新 → 通知 GPU
  set needsUpdate(v) {
    if (v) {
      this.version++;
      this.source.needsUpdate = true;
    }
  }
}

// ==============================================
// 5. 事件基类（所有可派发事件的类都继承它）
// ==============================================
class Kr {
  addEventListener(type, cb) { /* 绑定事件 */ }
  hasEventListener(type, cb) { /* 判断是否绑定 */ }
  removeEventListener(type, cb) { /* 移除事件 */ }
  dispatchEvent(event) { /* 触发事件 */ }
}

// ==============================================
// 6. 四元数（旋转计算，避免万向锁）
// ==============================================
class Vi {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.isQuaternion = true;
    this._x = x; this._y = y; this._z = z; this._w = w;
  }
  set(x,y,z,w){}
  clone(){}
  copy(q){}
  normalize(){}
  multiply(q){}
  slerp(q,t){} // 球面插值（动画必备）
  // ... 大量旋转数学计算
}

// ==============================================
// 7. 三维向量（位置/方向/缩放）
// ==============================================
/**
 * @class Vector3
 * @classdesc 三维向量类，表示 3D 空间中的坐标/方向 (x, y, z)
 * 是 Three.js 3D 开发的核心基础
 */
const Vector3 = class Vector3 {

  /**
   * 构造函数：创建三维向量
   * @param {number} x - x 轴坐标，默认 0
   * @param {number} y - y 轴坐标，默认 0
   * @param {number} z - z 轴坐标，默认 0
   */
  constructor(x = 0, y = 0, z = 0) {
    // 标记类型：这是一个 Vector3
    Vector3.prototype.isVector3 = true;
    // 初始化三个轴分量
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * 直接设置 x/y/z 值
   */
  set(x, y, z) {
    // 如果 z 未传，保持原值
    if (z === undefined) z = this.z;
    this.x = x;
    this.y = y;
    this.z = z;
    return this; // 链式调用
  }

  // 所有分量设为同一个值
  setScalar(scalar) {
    this.x = scalar;
    this.y = scalar;
    this.z = scalar;
    return this;
  }

  // 单独设置 X
  setX(x) { this.x = x; return this; }
  // 单独设置 Y
  setY(y) { this.y = y; return this; }
  // 单独设置 Z
  setZ(z) { this.z = z; return this; }

  /**
   * 根据索引设置分量 0=x,1=y,2=z
   */
  setComponent(index, value) {
    switch (index) {
      case 0: this.x = value; break;
      case 1: this.y = value; break;
      case 2: this.z = value; break;
      default: throw new Error("index is out of range: " + index);
    }
    return this;
  }

  /**
   * 根据索引获取分量
   */
  getComponent(index) {
    switch (index) {
      case 0: return this.x;
      case 1: return this.y;
      case 2: return this.z;
      default: throw new Error("index is out of range: " + index);
    }
  }

  /**
   * 克隆当前向量（返回新对象）
   */
  clone() {
    return new this.constructor(this.x, this.y, this.z);
  }

  /**
   * 复制另一个向量的值到自身
   */
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  // ==============================
  // 向量加法
  // ==============================

  // 加一个向量
  add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  // 所有分量加同一个数值
  addScalar(s) {
    this.x += s;
    this.y += s;
    this.z += s;
    return this;
  }

  // this = a + b
  addVectors(a, b) {
    this.x = a.x + b.x;
    this.y = a.y + b.y;
    this.z = a.z + b.z;
    return this;
  }

  // this += v * s
  addScaledVector(v, s) {
    this.x += v.x * s;
    this.y += v.y * s;
    this.z += v.z * s;
    return this;
  }

  // ==============================
  // 向量减法
  // ==============================

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  subScalar(s) {
    this.x -= s;
    this.y -= s;
    this.z -= s;
    return this;
  }

  // this = a - b
  subVectors(a, b) {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    this.z = a.z - b.z;
    return this;
  }

  // ==============================
  // 向量乘法
  // ==============================

  multiply(v) {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    return this;
  }

  // 乘以标量（缩放向量）
  multiplyScalar(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  multiplyVectors(a, b) {
    this.x = a.x * b.x;
    this.y = a.y * b.y;
    this.z = a.z * b.z;
    return this;
  }

  // ==============================
  // 变换：应用旋转、矩阵、四元数
  // ==============================

  // 通过欧拉角旋转
  applyEuler(euler) {
    return this.applyQuaternion(_quat.setFromEuler(euler));
  }

  // 绕轴旋转
  applyAxisAngle(axis, angle) {
    return this.applyQuaternion(_quat.setFromAxisAngle(axis, angle));
  }

  // 应用 3x3 矩阵
  applyMatrix3(m) {
    const x = this.x, y = this.y, z = this.z;
    const e = m.elements;

    this.x = e[0] * x + e[3] * y + e[6] * z;
    this.y = e[1] * x + e[4] * y + e[7] * z;
    this.z = e[2] * x + e[5] * y + e[8] * z;
    return this;
  }

  // 应用法向量矩阵（变换后归一化）
  applyNormalMatrix(m) {
    return this.applyMatrix3(m).normalize();
  }

  // 应用 4x4 变换矩阵（平移+旋转+缩放）
  applyMatrix4(m) {
    const x = this.x, y = this.y, z = this.z;
    const e = m.elements;

    // 透视除法 w
    const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);

    this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
    this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
    this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
    return this;
  }

  // 应用四元数旋转（最常用、最稳定的旋转方式）
  applyQuaternion(q) {
    const x = this.x, y = this.y, z = this.z;
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;

    // 四元数旋转公式
    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;

    this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;

    return this;
  }

  // 投影到相机空间（透视）
  project(camera) {
    return this.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
  }

  // 反投影（屏幕坐标→世界坐标）
  unproject(camera) {
    return this.applyMatrix4(camera.projectionMatrixInverse).applyMatrix4(camera.matrixWorld);
  }

  // 变换方向向量（不计算位移）
  transformDirection(m) {
    const x = this.x, y = this.y, z = this.z;
    const e = m.elements;

    this.x = e[0] * x + e[4] * y + e[8] * z;
    this.y = e[1] * x + e[5] * y + e[9] * z;
    this.z = e[2] * x + e[6] * y + e[10] * z;

    return this.normalize();
  }

  // ==============================
  // 除法
  // ==============================

  divide(v) {
    this.x /= v.x;
    this.y /= v.y;
    this.z /= v.z;
    return this;
  }

  divideScalar(s) {
    return this.multiplyScalar(1 / s);
  }

  // ==============================
  // 极值、限制
  // ==============================

  // 取与另一个向量的最小值
  min(v) {
    this.x = Math.min(this.x, v.x);
    this.y = Math.min(this.y, v.y);
    this.z = Math.min(this.z, v.z);
    return this;
  }

  // 取最大值
  max(v) {
    this.x = Math.max(this.x, v.x);
    this.y = Math.max(this.y, v.y);
    this.z = Math.max(this.z, v.z);
    return this;
  }

  // 限制在两个向量之间
  clamp(min, max) {
    this.x = Math.max(min.x, Math.min(max.x, this.x));
    this.y = Math.max(min.y, Math.min(max.y, this.y));
    this.z = Math.max(min.z, Math.min(max.z, this.z));
    return this;
  }

  // 所有分量统一限制范围
  clampScalar(min, max) {
    this.x = Math.max(min, Math.min(max, this.x));
    this.y = Math.max(min, Math.min(max, this.y));
    this.z = Math.max(min, Math.min(max, this.z));
    return this;
  }

  // 限制向量长度
  clampLength(min, max) {
    const len = this.length();
    return this.divideScalar(len || 1).multiplyScalar(Math.max(min, Math.min(max, len)));
  }

  // ==============================
  // 取整、取反
  // ==============================

  floor() {
    this.x = Math.floor(this.x);
    this.y = Math.floor(this.y);
    this.z = Math.floor(this.z);
    return this;
  }

  ceil() {
    this.x = Math.ceil(this.x);
    this.y = Math.ceil(this.y);
    this.z = Math.ceil(this.z);
    return this;
  }

  round() {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    this.z = Math.round(this.z);
    return this;
  }

  roundToZero() {
    this.x = this.x < 0 ? Math.ceil(this.x) : Math.floor(this.x);
    this.y = this.y < 0 ? Math.ceil(this.y) : Math.floor(this.y);
    this.z = this.z < 0 ? Math.ceil(this.z) : Math.floor(this.z);
    return this;
  }

  // 向量取反 (x,y,z) → (-x,-y,-z)
  negate() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
  }

  // ==============================
  // 点积、长度、归一化
  // ==============================

  /**
   * 点积：判断方向关系
   * >0 同向，=0 垂直，<0 反向
   */
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  // 长度平方（比 length() 更快，常用于比较）
  lengthSq() {
    return this.x ** 2 + this.y ** 2 + this.z ** 2;
  }

  // 向量长度（两点距离）
  length() {
    return Math.sqrt(this.lengthSq());
  }

  // 曼哈顿长度（绝对值之和）
  manhattanLength() {
    return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z);
  }

  // 归一化：让向量长度 = 1（变成方向向量）
  normalize() {
    return this.divideScalar(this.length() || 1);
  }

  // 设置固定长度
  setLength(length) {
    return this.normalize().multiplyScalar(length);
  }

  // ==============================
  // 插值、旋转、叉积
  // ==============================

  // 线性插值
  lerp(v, alpha) {
    this.x += (v.x - this.x) * alpha;
    this.y += (v.y - this.y) * alpha;
    this.z += (v.z - this.z) * alpha;
    return this;
  }

  lerpVectors(v1, v2, alpha) {
    this.x = v1.x + (v2.x - v1.x) * alpha;
    this.y = v1.y + (v2.y - v1.y) * alpha;
    this.z = v1.z + (v2.z - v1.z) * alpha;
    return this;
  }

  // 叉积：得到垂直于两个向量的新向量
  cross(v) {
    return this.crossVectors(this, v);
  }

  crossVectors(a, b) {
    const ax = a.x, ay = a.y, az = a.z;
    const bx = b.x, by = b.y, bz = b.z;

    this.x = ay * bz - az * by;
    this.y = az * bx - ax * bz;
    this.z = ax * by - ay * bx;
    return this;
  }

  // ==============================
  // 投影、反射、角度、距离
  // ==============================

  // 投影到某个向量上
  projectOnVector(v) {
    const dot = this.dot(v);
    const lenSq = v.lengthSq();
    if (lenSq === 0) return this.set(0, 0, 0);
    return this.copy(v).multiplyScalar(dot / lenSq);
  }

  // 投影到平面
  projectOnPlane(planeNormal) {
    _temp.copy(this).projectOnVector(planeNormal);
    return this.sub(_temp);
  }

  // 沿法线反射
  reflect(normal) {
    return this.sub(_temp.copy(normal).multiplyScalar(2 * this.dot(normal)));
  }

  // 与另一个向量的夹角（弧度）
  angleTo(v) {
    const len = Math.sqrt(this.lengthSq() * v.lengthSq());
    if (len === 0) return Math.PI / 2;
    const dot = this.dot(v) / len;
    return Math.acos(Math.max(-1, Math.min(1, dot)));
  }

  // 距离
  distanceTo(v) {
    return Math.sqrt(this.distanceToSquared(v));
  }

  // 距离平方
  distanceToSquared(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }

  // 曼哈顿距离
  manhattanDistanceTo(v) {
    return Math.abs(this.x - v.x) + Math.abs(this.y - v.y) + Math.abs(this.z - v.z);
  }

  // ==============================
  // 坐标系统转换
  // ==============================

  // 球坐标 → 三维坐标
  setFromSpherical(s) {
    return this.setFromSphericalCoords(s.radius, s.phi, s.theta);
  }

  setFromSphericalCoords(radius, phi, theta) {
    const sinPhiRadius = Math.sin(phi) * radius;
    this.x = sinPhiRadius * Math.sin(theta);
    this.y = Math.cos(phi) * radius;
    this.z = sinPhiRadius * Math.cos(theta);
    return this;
  }

  // 圆柱坐标 → 三维坐标
  setFromCylindrical(c) {
    return this.setFromCylindricalCoords(c.radius, c.theta, c.y);
  }

  setFromCylindricalCoords(radius, theta, y) {
    this.x = radius * Math.sin(theta);
    this.y = y;
    this.z = radius * Math.cos(theta);
    return this;
  }

  // ==============================
  // 矩阵/属性 取值
  // ==============================

  // 从矩阵中提取位置
  setFromMatrixPosition(m) {
    const e = m.elements;
    this.x = e[12];
    this.y = e[13];
    this.z = e[14];
    return this;
  }

  // 提取缩放
  setFromMatrixScale(m) {
    const sx = this.setFromMatrixColumn(m, 0).length();
    const sy = this.setFromMatrixColumn(m, 1).length();
    const sz = this.setFromMatrixColumn(m, 2).length();
    this.x = sx;
    this.y = sy;
    this.z = sz;
    return this;
  }

  setFromMatrixColumn(m, index) {
    return this.fromArray(m.elements, index * 4);
  }

  setFromMatrix3Column(m, index) {
    return this.fromArray(m.elements, index * 3);
  }

  // 从欧拉角赋值
  setFromEuler(e) {
    this.x = e._x;
    this.y = e._y;
    this.z = e._z;
    return this;
  }

  // ==============================
  // 比较、数组、迭代器
  // ==============================

  equals(v) {
    return v.x === this.x && v.y === this.y && v.z === this.z;
  }

  // 从数组生成向量
  fromArray(array, offset = 0) {
    this.x = array[offset];
    this.y = array[offset + 1];
    this.z = array[offset + 2];
    return this;
  }

  // 转数组
  toArray(array = [], offset = 0) {
    array[offset] = this.x;
    array[offset + 1] = this.y;
    array[offset + 2] = this.z;
    return array;
  }

  // 从顶点属性读取
  fromBufferAttribute(attribute, index) {
    this.x = attribute.getX(index);
    this.y = attribute.getY(index);
    this.z = attribute.getZ(index);
    return this;
  }

  // 随机向量 0~1
  random() {
    this.x = Math.random();
    this.y = Math.random();
    this.z = Math.random();
    return this;
  }

  // 随机单位球向量
  randomDirection() {
    const u1 = (Math.random() - 0.5) * 2;
    const u2 = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u1 ** 2);
    this.x = r * Math.cos(u2);
    this.y = r * Math.sin(u2);
    this.z = u1;
    return this;
  }

  // 迭代器支持：可 for...of 遍历
  *[Symbol.iterator]() {
    yield this.x;
    yield this.y;
    yield this.z;
  }
}

// ==============================================
// 8. 纹理数据源（管理图片资源）
// ==============================================
class Nn {
  constructor(data = null) {
    this.isSource = true;
    this.uuid = yr();
    this.data = data;
    this.version = 0;
  }
  set needsUpdate(v) { v && this.version++ }
  toJSON(){}
}

// ==============================================
// 9. 3x3 矩阵（UV 变换、旋转、缩放）
// ==============================================
class Cr {
  constructor() { this.elements = [1,0,0, 0,1,0, 0,0,1] }
  set(){}
  identity(){}
  multiply(){}
  invert(){}
  transpose(){}
  setUvTransform(){} // UV 变换核心
}

// ==============================================
// 10. 图片DOM加载器（真正发起网络请求的类）
// ==============================================
class Sd extends Oo {
  constructor(e) { super(e) }
  load(url, onLoad, onProgress, onError, file) {
    const img = new Image();
    img.onload = () => { onLoad(img); /* 缓存 */ }
    img.onerror = onError;
    img.crossOrigin = this.crossOrigin;
    img.src = url;
    return img;
  }
}

/**
 * --------------------------------------------------------------------
 * Fa 类 = Three.js 官方 GLTFLoader（glTF/glb 模型加载器）
 * 作用：加载、解析、解压 glTF 2.0 模型，支持 Draco/KTX2/Meshopt
 * --------------------------------------------------------------------
 */
class Fa extends m.aNw {
  constructor(y) {
    super(y);

    // 压缩模型解码器
    this.dracoLoader = null;     // Draco 几何压缩解码器
    this.ktx2Loader = null;      // KTX2 纹理压缩加载器
    this.meshoptDecoder = null;  // Meshopt 几何压缩解码器

    // 插件系统
    this.pluginCallbacks = [];

    // 注册一系列 glTF 扩展插件
    this.register((b) => new al(b));
    this.register((b) => new ul(b));
    this.register((b) => new ka(b));
    this.register((b) => new Ua(b));
    this.register((b) => new ho(b));
    this.register((b) => new Xl(b));
    this.register((b) => new ll(b));
    this.register((b) => new cl(b));
    this.register((b) => new ol(b));
    this.register((b) => new fa(b));
    this.register((b) => new $s(b));
    this.register((b) => new jl(b));
    this.register((b) => new Na(b));
    this.register((b) => new pa(b));
  }

  /**
   * 加载模型入口
   * @param {string} y 模型URL
   * @param {function} b 加载成功回调
   * @param {function} E 加载进度回调
   * @param {function} T 加载失败回调
   * @param {file} L 文件对象
   */
  load(y, b, E, T, L) {
    const F = this;
    let j;

    // 自动计算资源基础路径
    if (this.resourcePath !== "") {
      j = this.resourcePath;
    } else if (this.path !== "") {
      j = this.path;
    } else {
      j = m.Zp0.extractUrlBase(y);
    }

    // 通知资源管理器：开始加载
    this.manager.itemStart(y);

    // 错误统一处理
    const W = function (fe) {
      T?.(fe);
      F.manager.itemError(y);
      F.manager.itemEnd(y);
    };

    // 创建文件加载器
    const re = new m.hH6(this.manager);
    re.setPath(this.path);
    re.setResponseType("arraybuffer"); // glb/gltf 用二进制加载
    re.setRequestHeader(this.requestHeader);
    re.setWithCredentials(this.withCredentials);

    // 加载文件 → 解析
    re.load(
      y,
      function (fe) {
        try {
          F.parse(
            fe,
            j,
            function (te) {
              b(te);
              F.manager.itemEnd(y);
            },
            W,
            L?.additionalFiles
          );
        } catch (te) {
          W(te);
        }
      },
      E,
      W,
      L?.mainFile
    );
  }

  // 设置 Draco 解码器
  setDRACOLoader(y) {
    this.dracoLoader = y;
    return this;
  }

  // 已废弃的 DDS 格式
  setDDSLoader() {
    throw new Error(
      'THREE.GLTFLoader: "MSFT_texture_dds" no longer supported. Please update to "KHR_texture_basisu".'
    );
  }

  setKTX2Loader(y) {
    this.ktx2Loader = y;
    return this;
  }

  setMeshoptDecoder(y) {
    this.meshoptDecoder = y;
    return this;
  }

  // 注册插件
  register(y) {
    if (!this.pluginCallbacks.includes(y)) {
      this.pluginCallbacks.push(y);
    }
    return this;
  }

  // 卸载插件
  unregister(y) {
    const idx = this.pluginCallbacks.indexOf(y);
    if (idx !== -1) this.pluginCallbacks.splice(idx, 1);
    return this;
  }

  /**
   * 解析 glTF/glb 核心方法
   */
  parse(y, b, E, T, L) {
    let F;
    const extensions = {};
    const plugins = {};
    const textDecoder = new TextDecoder();

    // 判断数据类型：字符串 / ArrayBuffer / GLB
    if (typeof y === "string") {
      F = JSON.parse(y);
    } else if (y instanceof ArrayBuffer) {
      const magicBytes = new Uint8Array(y, 0, 4).join("");

      // GLB 二进制格式
      if (magicBytes === ma || magicBytes === nr) {
        try {
          extensions[ti.KHR_BINARY_GLTF] = new dl(y);
        } catch (Te) {
          T?.(Te);
          return;
        }
        F = JSON.parse(extensions[ti.KHR_BINARY_GLTF].content);
      } else {
        F = JSON.parse(textDecoder.decode(y));
      }
    } else {
      F = y;
    }

    // 必须是 glTF 2.0+
    if (!F.asset || F.asset.version[0] < 2) {
      T?.(new Error("THREE.GLTFLoader: Unsupported asset. glTF >=2.0"));
      return;
    }

    // 创建解析器
    const parser = new p(F, {
      path: b || this.resourcePath || "",
      crossOrigin: this.crossOrigin,
      requestHeader: this.requestHeader,
      manager: this.manager,
      ktx2Loader: this.ktx2Loader,
      meshoptDecoder: this.meshoptDecoder,
    });

    parser.fileLoader.setRequestHeader(this.requestHeader);

    // 注册插件
    for (let i = 0; i < this.pluginCallbacks.length; i++) {
      const plugin = this.pluginCallbacks[i](parser);
      plugins[plugin.name] = plugin;
      extensions[plugin.name] = true;
    }

    // 处理官方扩展
    if (F.extensionsUsed) {
      for (let i = 0; i < F.extensionsUsed.length; i++) {
        const extName = F.extensionsUsed[i];
        const required = F.extensionsRequired || [];

        switch (extName) {
          case ti.KHR_MATERIALS_UNLIT:
            extensions[extName] = new Xr();
            break;
          case ti.KHR_DRACO_MESH_COMPRESSION:
            extensions[extName] = new fl(F, this.dracoLoader);
            break;
          case ti.KHR_TEXTURE_TRANSFORM:
            extensions[extName] = new pl();
            break;
          case ti.KHR_MESH_QUANTIZATION:
            extensions[extName] = new ga();
            break;
          default:
            if (required.includes(extName) && !plugins[extName]) {
              console.warn(`THREE.GLTFLoader: Unknown extension "${extName}".`);
            }
        }
      }
    }

    F.additionalFiles = L;
    parser.setExtensions(extensions);
    parser.setPlugins(plugins);
    parser.parse(E, T);
  }

  // Promise 化解析
  parseAsync(y, b) {
    return new Promise((resolve, reject) => {
      this.parse(y, b, resolve, reject);
    });
  }
}

/**
 * --------------------------------------------------------------------
 * da 类 = Three.js DRACOLoader（Draco 模型压缩解码器）
 * 作用：多线程 Worker 池解码 Draco 压缩模型
 * --------------------------------------------------------------------
 */
class da extends m.aNw {
  constructor(y) {
    super(y);
    this.decoderPath = "";          // 解码器 WASM 路径
    this.decoderConfig = {};
    this.decoderBinary = null;
    this.decoderPending = null;
    this.workerLimit = 4;           // 最大 Worker 数量
    this.workerPool = [];           // Worker 池
    this.workerNextTaskID = 1;
    this.workerSourceURL = "";

    // 默认属性映射
    this.defaultAttributeIDs = {
      position: "POSITION",
      normal: "NORMAL",
      color: "COLOR",
      uv: "TEX_COORD",
    };
    this.defaultAttributeTypes = {
      position: "Float32Array",
      normal: "Float32Array",
      color: "Float32Array",
      uv: "Float32Array",
    };
  }

  setDecoderPath(y) {
    this.decoderPath = y;
    return this;
  }
  setDecoderConfig(y) {
    this.decoderConfig = y;
    return this;
  }
  setWorkerLimit(y) {
    this.workerLimit = y;
    return this;
  }

  // 加载并解码
  load(y, b, E, T) {
    const loader = new m.hH6(this.manager);
    loader.setPath(this.path);
    loader.setResponseType("arraybuffer");
    loader.load(y, (buffer) => this.parse(buffer, b, T), E, T);
  }

  parse(buffer, onLoad, onError) {
    this.decodeDracoFile(buffer, onLoad).catch(onError);
  }

  // Draco 解码核心
  decodeDracoFile(buffer, onLoad, attrIDs, attrTypes, colorSpace = m.GUF) {
    const taskConfig = {
      attributeIDs: attrIDs || this.defaultAttributeIDs,
      attributeTypes: attrTypes || this.defaultAttributeTypes,
      useUniqueIDs: !!attrIDs,
      vertexColorSpace: colorSpace,
    };
    return this.decodeGeometry(buffer, taskConfig).then(onLoad);
  }

  // 多线程 Worker 解码
  decodeGeometry(buffer, taskConfig) {
    const key = JSON.stringify(taskConfig);
    const taskID = this.workerNextTaskID++;
    const byteSize = buffer.byteLength;

    // 复用 Worker
    return this._getWorker(taskID, byteSize).then((worker) => {
      return new Promise((resolve, reject) => {
        worker._callbacks[taskID] = { resolve, reject };
        worker.postMessage(
          { type: "decode", id: taskID, taskConfig, buffer },
          [buffer]
        );
      }).then((result) => this._createGeometry(result.geometry));
    });
  }

  // 将 Draco 数据转为 Three.js Geometry
  _createGeometry(data) {
    const geom = new m.u9r();
    data.index && geom.setIndex(new m.TlE(data.index.array, 1));

    for (const attr of data.attributes) {
      const buf = new m.TlE(attr.array, attr.itemSize);
      geom.setAttribute(attr.name, buf);
    }
    return geom;
  }

  // 初始化 WASM 解码器
  _initDecoder() {
    if (this.decoderPending) return this.decoderPending;

    const isJS = typeof WebAssembly !== "object";
    const promises = [];

    if (isJS) {
      promises.push(this._loadLibrary("draco_decoder.js", "text"));
    } else {
      promises.push(this._loadLibrary("draco_wasm_wrapper.js", "text"));
      promises.push(this._loadLibrary("draco_decoder.wasm", "arraybuffer"));
    }

    this.decoderPending = Promise.all(promises).then((files) => {
      const js = files[0];
      if (!isJS) this.decoderConfig.wasmBinary = files[1];

      // 构造 Worker 代码
      const workerCode = [js, uo.toString()].join("\n");
      this.workerSourceURL = URL.createObjectURL(new Blob([workerCode]));
    });

    return this.decoderPending;
  }

  // 获取/创建 Worker
  _getWorker(taskID, cost) {
    return this._initDecoder().then(() => {
      if (this.workerPool.length < this.workerLimit) {
        const worker = new Worker(this.workerSourceURL);
        worker._callbacks = {};
        worker._taskCosts = {};
        worker._taskLoad = 0;
        worker.postMessage({ type: "init", decoderConfig: this.decoderConfig });

        worker.onmessage = (e) => {
          const msg = e.data;
          if (msg.type === "decode") worker._callbacks[msg.id].resolve(msg);
          if (msg.type === "error") worker._callbacks[msg.id].reject(msg);
        };

        this.workerPool.push(worker);
      }

      // 按负载排序，选负载最低的 Worker
      this.workerPool.sort((a, b) => a._taskLoad - b._taskLoad);
      const worker = this.workerPool[0];

      worker._taskCosts[taskID] = cost;
      worker._taskLoad += cost;
      return worker;
    });
  }

  // 释放任务
  _releaseTask(worker, taskID) {
    worker._taskLoad -= worker._taskCosts[taskID];
    delete worker._callbacks[taskID];
    delete worker._taskCosts[taskID];
  }

  // 销毁所有 Worker
  dispose() {
    this.workerPool.forEach((w) => w.terminate());
    this.workerPool = [];
    URL.revokeObjectURL(this.workerSourceURL);
    return this;
  }
}

/**
 * --------------------------------------------------------------------
 * 工具方法：提取 URL 基础路径
 * --------------------------------------------------------------------
 */
// static extractUrlBase(e) {
function extractUrlBase(e) {
  const i = e.lastIndexOf("/");
  return i === -1 ? "./" : e.slice(0, i + 1);
}

/**
 * --------------------------------------------------------------------
 * B0 类 = LoadingManager（资源加载管理器）
 * 作用：统一管理所有加载进度、错误、开始/结束事件
 * --------------------------------------------------------------------
 */
class B0 {
  constructor(onLoad, onProgress, onError) {
    let started = false;
    let loaded = 0;
    let total = 0;

    this.onStart = void 0;
    this.onLoad = onLoad;
    this.onProgress = onProgress;
    this.onError = onError;

    // 单个资源开始加载
    this.itemStart = (url) => {
      total++;
      if (!started && this.onStart) this.onStart(url, loaded, total);
      started = true;
    };

    // 单个资源加载完成
    this.itemEnd = (url) => {
      loaded++;
      this.onProgress?.(url, loaded, total);
      if (loaded === total) {
        started = false;
        this.onLoad?.();
      }
    };

    // 单个资源加载失败
    this.itemError = (url) => {
      this.onError?.(url);
    };

    this.resolveURL = (url) => url;
  }
}

/**
 * --------------------------------------------------------------------
 * Al 类 = FileLoader（文件加载器）
 * 作用：通过 fetch 加载任意文件，支持进度、缓存、跨域
 * --------------------------------------------------------------------
 */
class Al extends Oo {
  constructor(e) {
    super(e);
    this.responseType = "";
    this.mimeType = "";
  }

  load(url, onLoad, onProgress, onError, file) {
    // 拼接路径
    url = this.path + url;
    url = this.manager.resolveURL(url);

    // 命中缓存
    if (tc.get(url)) {
      this.manager.itemStart(url);
      setTimeout(() => {
        onLoad?.(tc.get(url));
        this.manager.itemEnd(url);
      });
      return;
    }

    // fetch 请求
    const req = new Request(url, {
      headers: new Headers(this.requestHeader),
      credentials: this.withCredentials ? "include" : "same-origin",
    });

    // 加载 + 进度监听
    fetch(req)
      .then((res) => {
        // 处理流式加载进度
        if (res.body?.getReader) {
          const reader = res.body.getReader();
          const total = +res.headers.get("content-length") || 0;
          let loaded = 0;

          return new Response(
            new ReadableStream({
              start(ctrl) {
                function read() {
                  reader.read().then(({ done, value }) => {
                    if (done) return ctrl.close();
                    loaded += value.length;
                    onProgress?.(new ProgressEvent("progress", { loaded, total }));
                    ctrl.enqueue(value);
                    read();
                  });
                }
                read();
              },
            })
          );
        }
        return res;
      })
      .then((res) => {
        // 根据类型解析
        switch (this.responseType) {
          case "arraybuffer":
            return res.arrayBuffer();
          case "json":
            return res.json();
          default:
            return res.text();
        }
      })
      .then((data) => {
        tc.add(url, data);
        onLoad?.(data);
      })
      .catch(onError)
      .finally(() => this.manager.itemEnd(url));

    this.manager.itemStart(url);
  }

  setResponseType(t) {
    this.responseType = t;
    return this;
  }
}

/**
 * --------------------------------------------------------------------
 * tc = 全局文件缓存
 * --------------------------------------------------------------------
 */
const tc = {
  enabled: false,
  files: {},
  add: (k, v) => (tc.files[k] = v),
  get: (k) => tc.files[k],
  remove: (k) => delete tc.files[k],
  clear: () => (tc.files = {}),
};


/**
 * 444
 */
// ==============================================
// 1. zt：任务执行器（按顺序执行一批任务，带进度）
// ==============================================
class zt extends di.v {
  constructor(onComplete, onProgress, onError) {
    super();
    // 事件回调
    this.onComplete = onComplete;   // 全部完成
    this.onProgress = onProgress;   // 进度更新
    this.onError = onError;         // 出错回调

    this._tasks = [];               // 任务列表
    this._taskIndex = 0;            // 当前执行到第几个
    this._percent = 0;              // 进度百分比
  }

  // 获取当前进度
  get percent() {
    return this._percent;
  }

  // 添加一个任务
  add(task) {
    this._tasks.push(task);
  }

  // 执行下一个任务（每调用一次走一步）
  update() {
    const task = this._tasks[this._taskIndex];
    if (!task) return;

    try {
      // 执行任务
      task.excute();
    } catch (err) {
      console.error(err);
      this.onError?.(task);
    }

    // 更新进度
    this._taskIndex++;
    this._percent = this._taskIndex / this._tasks.length;

    // 触发进度回调
    this.onProgress?.(task, this._taskIndex, this._tasks.length);

    // 全部执行完
    if (this._taskIndex === this._tasks.length) {
      this._percent = 1;
      this.onComplete?.();
    }
  }
}

// ==============================================
// 2. 工具函数模块：颜色、向量、数值工具
// ==============================================
861: (t, n, r) => {
  const { degToRad } = s.MathUtils;

  /**
   * 深层赋值：把 $ 的属性批量赋给 Se
   */
  function l(target, props, override = false) {
    for (let key in props) {
      const value = props[key];
      if (value === undefined) continue;

      // 支持链式属性，如 "position-x"
      const keys = key.split("-");
      let parent = target;
      let current = parent;

      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        // 检查对象是否拥有该属性
        if (override || parent.hasOwnProperty(k) || parent.constructor.prototype.hasOwnProperty(k)) {
          current = parent[k];
          // 最后一级赋值
          if (i === keys.length - 1) {
            const desc = Object.getOwnPropertyDescriptor(parent, k);
            // 可写则直接赋值，有 copy 方法则调用 copy
            if (!desc || desc.writable || desc.set) {
              parent[k] = value;
            } else if (current?.copy) {
              current.copy(value);
            }
          }
          parent = current;
        }
      }
    }
    return target;
  }

  /**
   * 创建颜色
   */
  function g(...args) {
    const color = new s.Ilk;
    args.length === 1 && color.set(args[0]);
    args.length === 3 && color.setRGB(args[0], args[1], args[2]);
    return color;
  }

  /**
   * RGB 转颜色 / 带透明度的颜色
   */
  function _(r, g, b, a) {
    const color = new s.Ilk().setHex((r << 16) + (g << 8) + b);
    return a !== undefined ? new s.Ltg(color.r, color.g, color.b, a / 255) : color;
  }

  // 各种工具函数：创建向量、颜色、四元数、欧拉角...
  function A(v1, v2) { return new s.FM8(v1, v2 ?? v1) }
  function m(x, y, z) { return new s.Pa4(x, y ?? x, z ?? x) }
  function D(x, y, z, w) { return new s.Ltg(x, y ?? x, z ?? x, w ?? x) }
  function U(x, y, z, isDeg = false) { return isDeg ? new s.USm(degToRad(x), degToRad(y), degToRad(z)) : new s.USm(x, y, z) }
  function R(x, y, z, w) { return new s._fP(x, y, z, w) }

  /**
   * 颜色 <=> 向量 互转
   */
  function ne(color, outVec = new s.Ltg) {
    outVec.x = color.r;
    outVec.y = color.g;
    outVec.z = color.b;
    return outVec;
  }
  function ce(vec, outColor = new s.Ilk) {
    outColor.r = vec.x;
    outColor.g = vec.y;
    outColor.b = vec.z;
    return outColor;
  }

  /**
   * 判断值不为 null/undefined
   */
  function xe(val) {
    return val != null;
  }
}

// ==============================================
// 3. 屏幕方向枚举
// ==============================================
128: (t, n, r) => {
  let s;
  (function() {
    s.AUTO = 0;
    s.LANDSCAPE = 1; // 横屏
    s.PORTRAIT = 2;  // 竖屏
  })(s || (s = {}))
}

// ==============================================
// 4. R：场景实体（ECS 架构核心）
// 管理节点、组件、生命周期
// ==============================================
class R extends l.Entity {
  constructor() {
    super(...arguments);
    this._scheduler = new g.b;               // 全局定时器
    this._componentScheduler = new U;        // 组件生命周期调度器
  }

  get scheduler() { return this._scheduler }
  get componentScheduler() { return this._componentScheduler }

  // 帧更新
  update(deltaTime) {
    this._scheduler.update(deltaTime);              // 更新定时器
    this._componentScheduler.start();               // 执行组件 start()
    this._componentScheduler.update(deltaTime);     // 执行组件 update()
    this._componentScheduler.lastUpdate(deltaTime); // 执行组件 lastUpdate()
  }

  // 销毁节点 + 所有子组件
  destroyNode(node) {
    node.removeFromParent();
    this.destroyComponents(node);
  }

  // 激活/隐藏节点
  activeNode(node, active) {
    node.visible = active;
    this.activeComponents(node);
  }

  // 销毁所有组件（递归子节点）
  destroyComponents(node) {
    const components = this._getComponents(node);
    for (const comp of components) comp.destroy();
    node._components = [];

    for (const child of node.children) {
      this.destroyComponents(child);
    }
  }

  // 激活/禁用所有组件（递归）
  activeComponents(node) {
    const visible = node.visible;
    for (const comp of this._getComponents(node)) {
      this._activeComponent(comp, visible);
    }
    for (const child of node.children) {
      this.activeComponents(child);
    }
  }

  /**
   * 给节点添加组件（核心）
   */
  addComponent(nodeOrWrapper, ComponentClass) {
    const node = nodeOrWrapper instanceof _.w ? nodeOrWrapper.node : nodeOrWrapper;
    const isCtor = typeof ComponentClass === "function";

    // 查找是否已存在
    let comp = this._findComponent(node, isCtor ? ComponentClass : ComponentClass.constructor);

    if (!comp) {
      // 创建组件实例
      comp = isCtor ? new ComponentClass() : ComponentClass;
      comp.node = node;
      comp.viewer = this;

      // 依赖组件自动加载
      const deps = comp.__dependencies;
      if (deps) {
        for (const dep of deps) {
          !this.getComponent(node, dep) && this.addComponent(node, dep);
        }
      }

      // 初始化生命周期
      if (!comp.__getFlag(l.Entity.Flags.OnLoadCalled)) {
        comp.__setFlag(l.Entity.Flags.OnLoadCalled);
        comp.onInit?.();
        comp.onLoad?.();
      }

      this._getComponents(node).push(comp);
      // 激活组件
      this._activeComponent(comp, comp.enabled);
    }

    return comp;
  }

  // 移除组件
  removeComponent(node, comp) {
    const list = this._getComponents(node);
    const idx = list.indexOf(comp);
    idx !== -1 && list.splice(idx, 1);
    return this;
  }

  // 获取组件
  getComponent(node, compClass) {
    return this._findComponent(node, compClass);
  }

  // 递归查找子节点组件
  getComponentsInChidren(node, compClass, out = []) {
    const comps = this._getComponents(node);
    for (let i = comps.length; i--;) {
      comps[i] instanceof compClass && out.push(comps[i]);
    }
    for (const child of node.children) {
      this.getComponentsInChidren(child, compClass, out);
    }
    return out;
  }

  // 获取节点组件列表
  _getComponents(node) {
    return node._components || (node._components = []);
  }

  // 查找组件实例
  _findComponent(node, compClass) {
    const list = this._getComponents(node);
    for (let i = list.length; i--;) {
      if (list[i] instanceof compClass) return list[i];
    }
  }

  // 激活/禁用单个组件
  _activeComponent(comp, enabled) {
    this._componentScheduler.enableComponent(comp, enabled);
  }
}

// ==============================================
// 5. 定时器模块：scheduler（定时任务、延迟调用）
// ==============================================
779: (t, n, r) => {
  // 单个定时任务
  class s {
    constructor(target, callback, interval, repeat) {
      this._target = target;         // 执行对象
      this._callback = callback;     // 回调
      this._interval = interval;     // 间隔时间
      this._repeat = repeat;         // 重复次数
      this._repeatForever = repeat === -1; // 无限循环
      this._elapsed = 0;             // 已过时间
      this._pause = false;           // 暂停
    }

    update(delta) {
      if (this._pause) return;
      if (!(this._repeat > 0 || this._repeatForever)) return;

      this._elapsed += delta;
      // 时间到，执行回调
      if (this._elapsed >= this._interval) {
        this.trigger(this._elapsed);
        this._elapsed -= this._interval;
        this._repeat--;
      }
    }

    trigger(delta) {
      this._target && this._callback?.call(this._target, delta, this._elapsed);
    }
  }

  // 任务包装
  class h {
    constructor(target, callers) {
      this._target = target;
      this._callers = callers;
    }
  }

  // 定时器调度器
  class l {
    constructor() {
      this._callers = {};        // 按对象 uuid 存储任务
      this._callersArray = [];   // 数组遍历
    }

    // 暂停某个对象的定时器
    pause(target) {
      const list = this._callers[target.uuid];
      list?.forEach(t => t.pause = true);
    }

    // 恢复
    resume(target) {
      const list = this._callers[target.uuid];
      list?.forEach(t => t.pause = false);
    }

    // 添加定时任务
    schedule(target, cb, interval, repeat) {
      let list = this._callers[target.uuid];
      if (!list) {
        list = this._callers[target.uuid] = [];
        this._callersArray.push(new h(target, list));
      }
      list.push(new s(target, cb, interval, repeat));
    }

    // 取消任务
    unshedule(target, cb) {
      const list = this._callers[target.uuid];
      if (!list) return;
      const idx = list.findIndex(t => t.callback === cb);
      idx !== -1 && list.splice(idx, 1);
    }

    // 帧更新
    update(delta) {
      const arr = this._callersArray;
      for (let i = arr.length; i--;) {
        const calls = arr[i].callers;
        for (let j = calls.length; j--;) {
          calls[j].lived ? calls[j].update(delta) : calls.splice(j, 1);
        }
      }
    }
  }
}

// ==============================================
// 6. U：组件生命周期调度器
// 管理 start / update / lastUpdate / onEnable / onDisable
// ==============================================
class U {
  constructor() {
    // 一次性执行器：start()
    this.startInvoker = new m(comp => comp.start());
    // 每帧执行器：update()
    this.updateInvoker = new A((comp, dt) => comp.update(dt));
    // 每帧最后执行：lastUpdate()
    this.lastUpdateInvoker = new A((comp, dt) => comp.lastUpdate(dt));
  }

  start() { this.startInvoker.invoke(0) }
  update(dt) { this.updateInvoker.invoke(dt) }
  lastUpdate(dt) { this.lastUpdateInvoker.invoke(dt) }

  /**
   * 启用/禁用组件（生命周期核心）
   */
  enableComponent(comp, enable) {
    if (enable) {
      // 启用
      if (!comp.__getFlag(D.OnEnableCalled)) {
        comp.__setFlag(D.OnEnableCalled);
        comp.onEnable?.(); // 激活回调

        // 注册 start
        if (typeof comp.start === "function" && !comp.__getFlag(D.IsStartCalled)) {
          comp.__setFlag(D.IsStartCalled);
          this.startInvoker.add(comp);
        }
        // 注册 update
        typeof comp.update === "function" && this.updateInvoker.add(comp);
        typeof comp.lastUpdate === "function" && this.lastUpdateInvoker.add(comp);
      }
    } else {
      // 禁用
      if (comp.__getFlag(D.OnEnableCalled)) {
        comp.__clearFlag(D.OnEnableCalled);
        comp.onDisable?.(); // 禁用回调

        // 移除更新
        typeof comp.start === "function" && this.startInvoker.remove(comp);
        typeof comp.update === "function" && this.updateInvoker.remove(comp);
        typeof comp.lastUpdate === "function" && this.lastUpdateInvoker.remove(comp);
      }
    }
  }
}

// ==============================================
// 7. m：一次性执行器（执行后自动移除）
// ==============================================
class m extends A {
  invoke(dt) {
    if (this._targets.length === 0) return;
    const cb = this._callback;
    // 执行所有
    for (const t of this._targets) cb(t, dt);
    // 清空（只执行一次）
    this._targets.length = 0;
  }
}

// ==============================================
// 8. Tween 动画封装（补间动画系统）
// ==============================================
481: (t, n, r) => {
  const s = r(622);
  const h = r(631);

  // 动画管理器（静态类）
  class D {
    // 创建补间动画
    static Tween(target) {
      return new s.Tween(target);
    }

    // 创建时间线
    static Timeline(target) {
      return new h.TweenChain(target);
    }

    // 杀死某个对象的所有动画
    static KillTweensOf(target) {
      const tweens = s.getAll();
      for (const t of tweens) {
        t._object === target && s.remove(t);
      }
    }

    // 帧更新动画
    static TweenUpdate(dt) {
      s.update(dt);
    }
  }
}


/**
 * 353
 */
// 1. 模块导出入口：注册所有资源加载器
// 2. 依赖导入：基础工具、纹理、音频、数学库
// 3. 图集加载器 (AtlasLoader)：加载JSON+图片图集
// 4. 音频加载器 (AudioLoader)：加载MP3/WAV/OGG
// 5. 通用工具函数：Blob/URL、二进制数组、哈夫曼编码
// 6. DEFLATE/ZLIB 解压缩核心算法
// 7. EXR高精度图片解析器 (EXRLoader)：支持多种压缩格式
// 8. EXR加载器封装：对接引擎资源系统
// 9. NURBS曲线数学工具：插值、基函数、控制点计算
// 10. NURBS曲线类：3D空间曲线计算
// ======================== 模块入口：注册所有加载器 ========================
// Webpack模块化导出：向引擎注册各类资源加载器
353: (t, n, r) => {
    // 注册加载器：g=图集加载器 A=音频加载器 pt=EXR图片加载器
    r.d(n, {
        gO: () => s.g,   // 基础加载器基类
        f0: () => g,    // Atlas图集加载器
        GP: () => A,    // Audio音频加载器
        q7: () => pt,   // EXR图片加载器
        Ae: () => us,   // 其他纹理加载器
        uo: () => ye,
        k7: () => Ce,
        KC: () => ni,
        Zt: () => mt,
        YQ: () => nn
    });

    // 导入依赖模块
    var s = r(745)    // 基础加载器基类
      , h = r(811)    // 图集解析工具
      , l = r(427);   // 路径工具

// ======================== 1. Atlas图集加载器 ========================
// 功能：加载 JSON 配置 + 图片 的图集资源
class g extends s.g {
    constructor() {
        super(...arguments);
        // 声明支持的文件扩展名：atlas
        B(this, "extensions", ["atlas"]);
    }

    // 核心加载方法
    load({url: b, file: E, onLoad: T, onProgress: L, onError: F, texSettings: j}) {
        // 异步加载流程
        (async () => {
            try {
                // 1. 加载图集JSON配置文件
                let W = await this.viewer.loadAsset({
                    url: b,
                    selExt: "json"
                });
                // 2. 加载图集对应的图片资源
                let re = await this.viewer.loadAsset({
                    url: `${(0, l.I_)(b)}/${W.meta.image}`, // 拼接图片路径
                    onProgress: L
                });
                // 3. 解析完成，回调返回结果
                T(new h.Y(W, Object.assign(re, j)));
            } catch (W) {
                // 加载失败回调
                F(W);
            }
        })();
    }
}

// ======================== 2. 音频加载器 ========================
var _ = r(25); // 音频工具库
// 功能：加载 MP3/WAV/OGG 音频资源
class A extends s.g {
    constructor() {
        super(...arguments);
        // 支持的音频扩展名
        B(this, "extensions", ["mp3", "wav", "ogg"]);
    }

    load({url: b, file: E, onLoad: T, onProgress: L, onError: F}) {
        // 调用引擎音频加载器加载资源
        new _.mTL(this.viewer.loadingManager).load(b, T, L, F, E);
    }
}

// ======================== 3. 通用二进制/工具函数 ========================
var m = r(477) // 核心数学/二进制库
  // 功能：生成JS脚本的Blob URL（兼容浏览器）
  , D = function(ae) {
      return URL.createObjectURL(new Blob([ae],{ type: "text/javascript" }));
  };

// 兼容处理：不支持Blob URL的浏览器降级为DataURL
try { URL.revokeObjectURL(D("")); } 
catch {
    D = function(y) {
        return "data:application/javascript;charset=UTF-8," + encodeURI(y);
    }
}

// 二进制数组类型定义
var U = Uint8Array    // 8位无符号整型
  , R = Uint16Array   // 16位无符号整型
  , ne = Uint32Array; // 32位无符号整型

// ======================== 4. 哈夫曼编码表（DEFLATE压缩固定表） ========================
// DEFLATE压缩算法固定哈夫曼表：长度/字面量编码
var ce = new U([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0])
  , xe = new U([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0])
  , Se = new U([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);

// 功能：生成哈夫曼编码表
var $ = function(ae, y) {
    var b = new R(31);
    // 计算编码长度偏移
    for (var E = 0; E < 31; ++E) b[E] = y += 1 << ae[E - 1];
    // 生成编码映射表
    var T = new ne(b[30]);
    for (E = 1; E < 30; ++E)
        for (var L = b[E]; L < b[E + 1]; ++L)
            T[L] = L - b[E] << 5 | E;
    return [b, T];
}
  , q = $(ce, 2)
  , N = q[0]
  , ie = q[1];

// 固定编码表修正
N[28] = 258; ie[258] = 28;

// 位反转表（加速哈夫曼编码计算）
var _e = $(xe, 0), Pe = _e[0], Be = new R(32768);
for (var Re = 0; Re < 32768; ++Re) {
    var ct = (Re & 43690) >>> 1 | (Re & 21845) << 1;
    ct = (ct & 52428) >>> 2 | (ct & 13107) << 2;
    ct = (ct & 61680) >>> 4 | (ct & 3855) << 4;
    Be[Re] = ((ct & 65280) >>> 8 | (ct & 255) << 8) >>> 1;
}

// 功能：构建哈夫曼编码树
var et = function(ae, y, b) {
    var E = ae.length, T = 0, L = new R(y);
    // 统计编码长度频次
    for (T = 0; T < E; ++T) ae[T] && ++L[ae[T] - 1];
    // 计算编码起始位置
    var F = new R(y);
    for (T = 0; T < y; ++T) F[T] = F[T - 1] + L[T - 1] << 1;
    // 生成编码映射
    var j;
    if (b) {
        j = new R(1 << y); var W = 15 - y;
        for (T = 0; T < E; ++T)
            if (ae[T])
                for (var re = T << 4 | ae[T], fe = y - ae[T], te = F[ae[T] - 1]++ << fe; te <= (te | (1 << fe) - 1); ++te)
                    j[Be[te] >>> W] = re;
    } else {
        j = new R(E);
        for (T = 0; T < E; ++T)
            ae[T] && (j[T] = Be[F[ae[T] - 1]++] >>> 15 - ae[T]);
    }
    return j;
}

// 预定义DEFLATE固定编码表
var Ze = new U(288);
for (Re = 0; Re < 144; ++Re) Ze[Re] = 8;
for (Re = 144; Re < 256; ++Re) Ze[Re] = 9;
for (Re = 256; Re < 280; ++Re) Ze[Re] = 7;
for (Re = 280; Re < 288; ++Re) Ze[Re] = 8;

var Nt = new U(32);
for (Re = 0; Re < 32; ++Re) Nt[Re] = 5;

var Bt = et(Ze, 9, 1)  // 字面量/长度编码表
  , en = et(Nt, 5, 1); // 偏移编码表

// ======================== 5. 二进制位操作工具 ========================
// 功能：取数组最大值
var li = function(ae) {
    var y = ae[0];
    for (var b = 1; b < ae.length; ++b) ae[b] > y && (y = ae[b]);
    return y;
}
// 功能：读取指定位数的二进制数据
var di = function(ae, y, b) {
    var E = y / 8 | 0;
    return (ae[E] | ae[E + 1] << 8) >> (y & 7) & b;
}
// 功能：读取24位二进制数据
var xi = function(ae, y) {
    var b = y / 8 | 0;
    return (ae[b] | ae[b + 1] << 8 | ae[b + 2] << 16) >> (y & 7);
}
// 功能：计算位对应的字节长度
var zt = function(ae) {
    return (ae / 8 | 0) + (ae & 7 && 1);
}
// 功能：安全截取TypedArray
var Sn = function(ae, y, b) {
    var E = new (ae instanceof R ? R : ae instanceof ne ? ne : U)(b - y);
    E.set(ae.subarray(y, b));
    return E;
}

// ======================== 6. DEFLATE/ZLIB 解压缩核心算法 ========================
// 功能：DEFLATE格式解压缩（zip/gz核心算法）
var rn = function(ae, y, b) {
    var E = ae.length;
    // 初始化缓冲区
    var T = !y || b, L = !b || b.i;
    b || (b = {}), y || (y = new U(E * 3));
    // 动态扩容缓冲区
    var F = function(wi) {
        var Mr = y.length;
        if (wi > Mr) { var yr = new U(Math.max(Mr * 2, wi)); yr.set(y); y = yr; }
    }
    // 解析状态变量
      , j = b.f || 0, W = b.p || 0, re = b.b || 0
      , fe = b.l, te = b.d, Te = b.m, Ge = b.n
      , St = E * 8;

    // 循环解压缩数据块
    do {
        if (!fe) {
            // 读取块类型
            b.f = j = di(ae, W, 1);
            var kt = di(ae, W + 1, 3); W += 3;
            if (kt) {
                // 动态哈夫曼树
                if (kt == 1) { fe = Bt; te = en; Te = 9; Ge = 5; }
                // 自定义哈夫曼树
                else if (kt == 2) {
                    var Xe = di(ae, W, 31) + 257
                      , ut = di(ae, W + 10, 15) + 4
                      , dn = Xe + di(ae, W + 5, 31) + 1;
                    W += 14;
                    // 解析编码长度
                    var qt = new U(dn), ln = new U(19);
                    for (var Tn = 0; Tn < ut; ++Tn) ln[Se[Tn]] = di(ae, W + Tn * 3, 7);
                    W += ut * 3;
                    // 生成哈夫曼表
                    var fn = li(ln), Hn = (1 << fn) - 1, En = et(ln, fn, 1);
                    // 解码重复数据
                    for (Tn = 0; Tn < dn; ) {
                        var Ei = En[di(ae, W, Hn)]; W += Ei & 15;
                        var Vt = Ei >>> 4;
                        if (Vt < 16) qt[Tn++] = Vt;
                        else {
                            var ar = 0, fr = 0;
                            // 重复编码解析
                            Vt == 16 ? (fr = 3 + di(ae, W, 3), W += 2, ar = qt[Tn - 1])
                            : Vt == 17 ? (fr = 3 + di(ae, W, 7), W += 3)
                            : Vt == 18 && (fr = 11 + di(ae, W, 127), W += 7);
                            for (; fr--; ) qt[Tn++] = ar;
                        }
                    }
                    // 分离字面量/偏移编码表
                    var lr = qt.subarray(0, Xe), is = qt.subarray(Xe);
                    Te = li(lr), Ge = li(is);
                    fe = et(lr, Te, 1), te = et(is, Ge, 1);
                } else throw "invalid block type";
            } else {
                // 无压缩块：直接拷贝数据
                var Vt = zt(W) + 4, gt = ae[Vt - 4] | ae[Vt - 3] << 8, xt = Vt + gt;
                if (xt > E) break;
                T && F(re + gt), y.set(ae.subarray(Vt, xt), re);
                b.b = re += gt, b.p = W = xt * 8;
                continue;
            }
        }

        // 哈夫曼解码主循环
        T && F(re + 131072);
        var Tr = (1 << Te) - 1, Er = (1 << Ge) - 1, Kr = W;
        for (; ; Kr = W) {
            // 解码字面量/长度
            var ar = fe[xi(ae, W) & Tr], Vi = ar >>> 4;
            W += ar & 15; if (W > St) break;
            if (!ar) throw "invalid length/literal";
            // 结束标记
            if (Vi < 256) y[re++] = Vi;
            else if (Vi == 256) { Kr = W; fe = null; break; }
            else {
                // 解析长度
                var me = Vi - 254;
                if (Vi > 264) {
                    var Tn = Vi - 257, _r = ce[Tn];
                    me = di(ae, W, (1 << _r) - 1) + N[Tn], W += _r;
                }
                // 解析偏移
                var Qo = te[xi(ae, W) & Er], Ji = Qo >>> 4;
                if (!Qo) throw "invalid distance";
                W += Qo & 15;
                var is = Pe[Ji];
                if (Ji > 3) {
                    var _r = xe[Ji];
                    is += xi(ae, W) & (1 << _r) - 1, W += _r;
                }
                // 拷贝历史数据（LZ77核心）
                T && F(re + 131072);
                for (var xa = re + me; re < xa; re += 4)
                    y[re] = y[re - is],
                    y[re + 1] = y[re + 1 - is],
                    y[re + 2] = y[re + 2 - is],
                    y[re + 3] = y[re + 3 - is];
                re = xa;
            }
        }
        // 更新解析状态
        b.l = fe, b.p = Kr, b.b = re;
        fe && (j = 1, b.m = Te, b.d = te, b.n = Ge);
    } while (!j);

    return re == y.length ? y : Sn(y, 0, re);
}

// ZLIB格式校验 + 解压缩入口
var Ft = new U(0);
var jt = function(ae) {
    // 校验ZLIB头部格式
    if ((ae[0] & 15) != 8 || ae[0] >>> 4 > 7 || (ae[0] << 8 | ae[1]) % 31)
        throw "invalid zlib data";
    if (ae[1] & 32) throw "invalid zlib data: preset dictionaries not supported";
};
// 对外暴露：ZLIB解压缩
function Xt(ae, y) {
    jt(ae); // 校验头部
    return rn(ae.subarray(2, -4), y); // 跳过头部+校验和，解压缩
}

// ======================== 7. EXR高精度图片解析器 ========================
// EXR：电影级高精度HDR图片格式
class He extends m.yxD {
    constructor(y) {
        super(y);
        this.type = m.cLu; // 数据类型：半精度浮点
    }

    // 核心：解析EXR二进制数据
    parse(y) {
        // ===================== EXR解析子工具函数 =====================
        // 1. 位操作/数据转换
        const fn = Math.pow(2.7182818, 2.2); // 伽马校正系数
        // 哈夫曼编码构建
        function Hn(Y, le) { let Ee = 0; for (let at = 0; at < 65536; ++at) (at == 0 || Y[at >> 3] & 1 << (at & 7)) && (le[Ee++] = at); const Ve = Ee - 1; for (; Ee < 65536; ) le[Ee++] = 0; return Ve; }
        function En(Y) { for (let le = 0; le < 16384; le++) Y[le] = {}, Y[le].len = 0, Y[le].lit = 0, Y[le].p = null; }
        // 2. 小波变换/PIZ压缩解析（EXR专用压缩算法）
        function Lt(Y) { /* 逆小波变换：还原像素数据 */ }
        function Pn(Y) { /* 颜色通道预处理 */ }
        function un(Y, le, Ee) { /* 半精度浮点转换 */ }
        function vn(Y) { /* 伽马校正计算 */ }
        // 3. 压缩格式解析：RLE/ZIP/PIZ/DWAA
        function Mi(Y) { /* PIZ压缩解压缩 */ }
        function Jn(Y) { /* PXR24压缩解压缩 */ }
        function cr(Y) { /* DWAA/DWAB压缩解压缩 */ }
        function qn(Y) { /* RLE压缩解压缩 */ }
        function ii(Y) { /* ZIP/ZIPS解压缩（调用ZLIB） */ }
        // 4. EXR文件头解析
        function kg(Y, le, Ee) { /* 解析EXR文件头：分辨率/通道/压缩格式 */ }
        // 5. 像素数据读取
        function Ug(Y, le, Ee, Ve, at) { /* 根据压缩格式初始化解析器 */ }

        // ===================== 主解析流程 =====================
        const Tu = new DataView(y)        // 二进制数据视图
          , _t = new Uint8Array(y)        // 8位数组
          , Cr = { value: 0 }             // 读取指针
          , gl = kg(Tu, y, Cr)            // 解析EXR文件头
          , Ci = Ug(gl, Tu, _t, Cr, this.type) // 初始化解析器
          , zf = { value: 0 };

        // 按行解析像素数据
        for (let Y = 0; Y < Ci.height / Ci.scanlineBlockSize; Y++) {
            const le = vi(Tu, Cr); // 行号
            Ci.size = vi(Tu, Cr); // 数据块大小
            // 解压缩当前块
            const Ve = Ci.uncompress(Ci);
            Cr.value += Ci.size;
            // 遍历像素，写入纹理数据
            for (let at = 0; at < Ci.scanlineBlockSize; at++) {
                const Qe = at + Y * Ci.scanlineBlockSize;
                if (Qe >= Ci.height) break;
                for (let Et = 0; Et < Ci.channels; Et++) {
                    const Ut = Yl[gl.channels[Et].name];
                    for (let Yt = 0; Yt < Ci.width; Yt++) {
                        zf.value = (at * (Ci.channels * Ci.width) + Et * Ci.width + Yt) * Ci.inputSize;
                        const At = (Ci.height - 1 - Qe) * (Ci.width * Ci.outputChannels) + Yt * Ci.outputChannels + Ut;
                        Ci.byteArray[At] = Ci.getter(Ve, zf);
                    }
                }
            }
        }

        // 返回解析结果：宽/高/像素数据/格式
        return {
            header: gl,
            width: Ci.width,
            height: Ci.height,
            data: Ci.byteArray,
            format: Ci.format,
            encoding: Ci.encoding,
            type: this.type
        };
    }

    // 设置数据类型
    setDataType(y) { this.type = y; return this; }

    // 加载EXR文件
    load(y, b, E, T) {
        function L(F, j) {
            // 配置纹理参数
            F.encoding = j.encoding;
            F.minFilter = m.wem; F.magFilter = m.wem;
            F.generateMipmaps = !1; F.flipY = !1;
            b && b(F, j); // 加载完成回调
        }
        return super.load(y, L, E, T);
    }
}

// ======================== 8. EXR加载器封装 ========================
// 对接引擎资源系统的EXR加载器
class pt extends s.g {
    constructor() {
        super(...arguments);
        // 支持扩展名：exr
        B(this, "extensions", ["exr"]);
    }

    load({url: b, file: E, onLoad: T, onProgress: L, onError: F, texSettings: j}) {
        // 创建EXR解析器并加载
        new He(this.viewer.loadingManager).load(b, W => T(Object.assign(W, j)), L, F, E);
    }
}

// ======================== 9. NURBS曲线数学工具 ========================
// NURBS：非均匀有理B样条，3D建模核心曲线算法
// 功能：二分查找节点位置
function Fe(ae, y, b) {
    const E = b.length - ae - 1;
    if (y >= b[E]) return E - 1;
    if (y <= b[ae]) return ae;
    let T = ae, L = E, F = Math.floor((T + L) / 2);
    for (; y < b[F] || y >= b[F + 1]; )
        y < b[F] ? L = F : T = F, F = Math.floor((T + L) / 2);
    return F;
}
// 功能：计算B样条基函数
function qe(ae, y, b, E) {
    const T = [], L = [], F = [];
    T[0] = 1;
    for (let j = 1; j <= b; ++j) {
        L[j] = y - E[ae + 1 - j], F[j] = E[ae + j] - y;
        let W = 0;
        for (let re = 0; re < j; ++re) {
            const fe = F[re + 1], te = L[j - re], Te = T[re] / (fe + te);
            T[re] = W + fe * Te, W = te * Te;
        }
        T[j] = W;
    }
    return T;
}
// 功能：计算NURBS点
function wt(ae, y, b, E) {
    const T = Fe(ae, E, y), L = qe(T, E, ae, y), F = new m.Ltg(0,0,0,0);
    for (let j = 0; j <= ae; ++j) {
        const W = b[T - ae + j], re = L[j], fe = W.w * re;
        F.x += W.x * fe, F.y += W.y * fe, F.z += W.z * fe, F.w += W.w * re;
    }
    return F;
}

// ======================== 10. NURBS曲线类 ========================
class Si extends m.Hyl {
    /**
     * 构造NURBS曲线
     * @param {number} y - 曲线次数
     * @param {array} b - 节点向量
     * @param {array} E - 控制点
     * @param {number} T - 起始节点
     * @param {number} L - 结束节点
     */
    constructor(y, b, E, T, L) {
        super();
        this.degree = y;          // 曲线次数
        this.knots = b;           // 节点向量
        this.controlPoints = [];  // 控制点
        this.startKnot = T || 0;
        this.endKnot = L || this.knots.length - 1;
        // 初始化控制点
        for (let F = 0; F < E.length; ++F) {
            const j = E[F];
            this.controlPoints[F] = new m.Ltg(j.x,j.y,j.z,j.w);
        }
    }

    /**
     * 获取曲线上的点
     * @param {number} y - 0~1 参数
     * @returns {Vector3} 3D坐标点
     */
    getPoint(y, b=new m.Pa4) {
        const E = b
          , T = this.knots[this.startKnot] + y * (this.knots[this.endKnot] - this.knots[this.startKnot])
          , L = wt(this.degree, this.knots, this.controlPoints, T);
        // 齐次坐标转笛卡尔坐标
        L.w !== 1 && L.divideScalar(L.w);
        E.set(L.x, L.y, L.z);
        return E;
    }

    /**
     * 获取曲线切线（用于旋转/朝向）
     */
    getTangent(y, b=new m.Pa4) {
        const E = b
          , T = this.knots[0] + y * (this.knots[this.knots.length - 1] - this.knots[0])
          , L = mi(this.degree, this.knots, this.controlPoints, T, 1);
        E.copy(L[1]).normalize();
        return E;
    }
}

// 全局变量定义
// Gt: 存储解析完成的FBX原始数据对象
// On: 存储FBX文件中所有节点的连接关系(父子关系、关联关系)
// kn: 最终生成的Three.js根场景对象(Group)
let Gt, On, kn;

/**
 * FBX加载器主类
 * 继承自Three.js的Loader基类，负责文件加载、格式判断、分发解析
 */
class bi extends m.aNw {
    /**
     * 构造函数
     * @param {LoadingManager} y - 加载管理器
     */
    constructor(y) {
        super(y)
    }

    /**
     * 加载FBX文件
     * @param {string} y - 文件URL
     * @param {Function} b - 加载完成回调
     * @param {Function} E - 加载进度回调
     * @param {Function} T - 加载失败回调
     * @param {Object} L - 配置参数
     */
    load(y, b, E, T, L) {
        const F = this
            // 获取基础路径：如果未手动设置path，则从URL中自动提取
            , j = F.path === "" ? m.Zp0.extractUrlBase(y) : F.path
            // 创建文件加载器
            , W = new m.hH6(this.manager);
        
        // 配置加载器参数
        W.setPath(F.path), // 设置资源基础路径
        W.setResponseType("arraybuffer"), // 响应类型：二进制数组(FBX为二进制格式)
        W.setRequestHeader(F.requestHeader), // 设置请求头
        W.setWithCredentials(F.withCredentials); // 跨域凭证

        // 发起文件加载请求
        W.load(y, function(re) {
            try {
                // 解析二进制数据并回调结果
                b(F.parse(re, j))
            } catch (fe) {
                // 异常处理：有错误回调则执行，否则打印错误
                T ? T(fe) : console.error(fe),
                F.manager.itemError(y) // 通知加载管理器加载失败
            }
        }, E, T, L == null ? void 0 : L.mainFile)
    }

    /**
     * 解析FBX文件核心方法
     * @param {ArrayBuffer|String} y - FBX文件数据(二进制/文本)
     * @param {string} b - 资源基础路径
     * @returns {Object3D} Three.js场景对象
     */
    parse(y, b) {
        // 判断是否为文本格式FBX
        if (ys(y))
            // 文本FBX解析
            Gt = new Oi().parse(y);
        else {
            // 二进制FBX解析
            const T = Ba(y);
            // 校验FBX格式合法性
            if (!xs(T))
                throw new Error("THREE.FBXLoader: Unknown format.");
            // 校验FBX版本(必须≥7000)
            if (hi(T) < 7e3)
                throw new Error("THREE.FBXLoader: FBX version not supported, FileVersion: " + hi(T));
            // 二进制解析器解析数据
            Gt = new vr().parse(T)
        }

        // 创建纹理加载器，用于加载模型中的图片资源
        const E = new m.dpR(this.manager).setPath(this.resourcePath || b).setCrossOrigin(this.crossOrigin);
        // 调用解析器，将FBX数据转换为Three.js对象
        return new $i(E,this.manager).parse(Gt)
    }
}

/**
 * FBX数据解析器
 * 核心：将FBX原始数据 转换为 Three.js 3D对象
 * 负责：节点关系、图片、纹理、材质、变形器、场景、动画解析
 */
class $i {
    /**
     * 构造函数
     * @param {TextureLoader} y - 纹理加载器
     * @param {LoadingManager} b - 加载管理器
     */
    constructor(y, b) {
        this.textureLoader = y, // 纹理加载器
        this.manager = b       // 加载管理器
    }

    /**
     * 总解析入口
     * @returns {Group} 最终的Three.js场景根对象
     */
    parse() {
        // 1. 解析FBX节点连接关系(父子/关联)
        On = this.parseConnections();
        // 2. 解析图片资源(内嵌/外部)
        const y = this.parseImages()
            // 3. 解析纹理(基于图片)
            , b = this.parseTextures(y)
            // 4. 解析材质(基于纹理)
            , E = this.parseMaterials(b)
            // 5. 解析变形器(骨骼/ morph目标)
            , T = this.parseDeformers()
            // 6. 解析几何体(网格/曲线)
            , L = new zr().parse(T);
        
        // 7. 解析场景(构建层级、绑定骨骼、添加灯光相机)
        return this.parseScene(T, L, E),
        kn // 返回最终场景
    }

    /**
     * 解析FBX节点连接关系
     * 存储所有节点的父子关系、关联关系(如纹理→材质)
     * @returns {Map} 连接关系映射表
     */
    parseConnections() {
        const y = new Map;
        // 如果FBX包含Connections节点，遍历所有连接
        "Connections"in Gt && Gt.Connections.connections.forEach(function(E) {
            const T = E[0]      // 子节点ID
                , L = E[1]      // 父节点ID
                , F = E[2];     // 关联类型
            
            // 初始化子节点关系对象
            y.has(T) || y.set(T, {
                parents: [],
                children: []
            });
            // 添加父节点引用
            const j = { ID: L, relationship: F };
            y.get(T).parents.push(j);

            // 初始化父节点关系对象
            y.has(L) || y.set(L, {
                parents: [],
                children: []
            });
            // 添加子节点引用
            const W = { ID: T, relationship: F };
            y.get(L).children.push(W)
        });
        return y
    }

    /**
     * 解析FBX中的图片资源
     * 支持：内嵌base64图片、外部路径图片、二进制Blob图片
     * @returns {Object} 图片ID→路径/数据映射
     */
    parseImages() {
        const y = {} // 图片ID:文件名映射
            , b = {};// 文件名:数据URL映射
        
        // 遍历FBX中的Video节点(FBX用Video存储图片)
        if ("Video"in Gt.Objects) {
            const E = Gt.Objects.Video;
            for (const T in E) {
                const L = E[T]
                    , F = parseInt(T);
                // 存储相对路径/绝对路径
                y[F] = L.RelativeFilename || L.Filename;
                
                // 如果图片是内嵌数据(二进制/Base64)
                if ("Content"in L) {
                    const j = L.Content instanceof ArrayBuffer && L.Content.byteLength > 0
                        , W = typeof L.Content == "string" && L.Content !== "";
                    if (j || W) {
                        // 解析内嵌图片为URL
                        const re = this.parseImage(E[T]);
                        b[L.RelativeFilename || L.Filename] = re
                    }
                }
            }
        }

        // 处理图片路径：替换内嵌图片，格式化路径
        for (const E in y) {
            const T = y[E];
            b[T] !== void 0 ? y[E] = b[T] : y[E] = y[E].split("\\").pop()
        }
        return y
    }

    /**
     * 解析单张内嵌图片
     * @param {Object} y - FBX图片对象
     * @returns {string} 图片URL(base64/blob)
     */
    parseImage(y) {
        const b = y.Content // 图片原始数据
            , E = y.RelativeFilename || y.Filename // 文件名
            // 获取文件后缀
            , T = E.slice(E.lastIndexOf(".") + 1).toLowerCase();
        
        let L; // MIME类型
        // 根据后缀判断图片格式
        switch (T) {
            case "bmp": L = "image/bmp"; break;
            case "jpg": case "jpeg": L = "image/jpeg"; break;
            case "png": L = "image/png"; break;
            case "tif": L = "image/tiff"; break;
            case "tga": 
                console.warn("FBXLoader: TGA loader not found, skipping ", E);
                L = "image/tga"; break;
            default:
                console.warn('FBXLoader: Image type "' + T + '" is not supported.');
                return
        }

        // Base64字符串图片
        if (typeof b == "string")
            return "data:" + L + ";base64," + b;
        
        // 二进制ArrayBuffer图片 → 转换为Blob URL
        {
            const F = new Uint8Array(b);
            return window.URL.createObjectURL(new Blob([F],{ type: L }))
        }
    }

    /**
     * 解析FBX纹理
     * @param {Object} y - 图片映射表
     * @returns {Map} 纹理ID→Three.js纹理对象
     */
    parseTextures(y) {
        const b = new Map;
        if ("Texture"in Gt.Objects) {
            const E = Gt.Objects.Texture;
            for (const T in E) {
                const L = this.parseTexture(E[T], y);
                b.set(parseInt(T), L)
            }
        }
        return b
    }

    /**
     * 解析单个纹理
     * @param {Object} y - FBX纹理对象
     * @param {Object} b - 图片映射
     * @returns {Texture} Three.js纹理对象
     */
    parseTexture(y, b) {
        const E = this.loadTexture(y, b); // 加载纹理
        E.ID = y.id, E.name = y.attrName;

        // 纹理包裹模式
        const T = y.WrapModeU, L = y.WrapModeV
            , F = T !== void 0 ? T.value : 0
            , j = L !== void 0 ? L.value : 0;
        E.wrapS = F === 0 ? m.rpg : m.uWy;
        E.wrapT = j === 0 ? m.rpg : m.uWy;

        // 纹理缩放(Repeat)
        if ("Scaling"in y) {
            const W = y.Scaling.value;
            E.repeat.x = W[0], E.repeat.y = W[1]
        }
        // 纹理偏移(Offset)
        if ("Translation"in y) {
            const W = y.Translation.value;
            E.offset.x = W[0], E.offset.y = W[1]
        }
        return E
    }

    /**
     * 加载纹理(支持TGA/PSD特殊格式)
     * @param {Object} y - FBX纹理对象
     * @param {Object} b - 图片映射
     * @returns {Texture} Three.js纹理
     */
    loadTexture(y, b) {
        let E;
        const T = this.textureLoader.path
            // 获取纹理关联的图片ID
            , L = On.get(y.id).children;
        
        // 获取图片路径
        L !== void 0 && L.length > 0 && b[L[0].ID] !== void 0 && (E = b[L[0].ID],
        (E.indexOf("blob:") === 0 || E.indexOf("data:") === 0) && this.textureLoader.setPath(void 0));
        
        let F;
        const j = y.FileName.slice(-3).toLowerCase();
        
        // TGA格式特殊处理
        if (j === "tga") {
            const W = this.manager.getHandler(".tga");
            W === null ? (
                console.warn("FBXLoader: TGA loader not found, creating placeholder texture"),
                F = new m.xEZ
            ) : (
                W.setPath(this.textureLoader.path),
                F = W.load(E)
            )
        }
        // PSD不支持，创建占位纹理
        else if (j === "psd") {
            console.warn("FBXLoader: PSD textures are not supported");
            F = new m.xEZ;
        }
        // 普通格式直接加载
        else F = this.textureLoader.load(E);
        
        this.textureLoader.setPath(T);
        return F
    }

    /**
     * 解析FBX材质
     * @param {Map} y - 纹理映射
     * @returns {Map} 材质ID→Three.js材质
     */
    parseMaterials(y) {
        const b = new Map;
        if ("Material"in Gt.Objects) {
            const E = Gt.Objects.Material;
            for (const T in E) {
                const L = this.parseMaterial(E[T], y);
                L !== null && b.set(parseInt(T), L)
            }
        }
        return b
    }

    /**
     * 解析单个材质
     * @param {Object} y - FBX材质对象
     * @param {Map} b - 纹理映射
     * @returns {Material} Three.js材质
     */
    parseMaterial(y, b) {
        const E = y.id, T = y.attrName;
        let L = y.ShadingModel;
        // 兼容FBX格式
        typeof L == "object" && (L = L.value);
        // 无连接关系则跳过
        if (!On.has(E)) return null;

        // 解析材质参数
        const F = this.parseParameters(y, b, E);
        let j;

        // 根据着色模型创建对应材质
        switch (L.toLowerCase()) {
            case "phong": j = new m.xoR; break;     // Phong材质
            case "lambert": j = new m.YBo; break;   // Lambert材质
            default:
                console.warn('THREE.FBXLoader: unknown material type. Defaulting to MeshPhongMaterial.');
                j = new m.xoR; break
        }

        j.setValues(F), j.name = T;
        return j
    }

    /**
     * 解析材质参数(颜色、透明度、高光、纹理映射等)
     * @param {Object} y - FBX材质
     * @param {Map} b - 纹理映射
     * @param {number} E - 材质ID
     * @returns {Object} 材质参数对象
     */
    parseParameters(y, b, E) {
        const T = {};
        // 基础材质参数解析
        y.BumpFactor && (T.bumpScale = y.BumpFactor.value);
        // 漫反射颜色
        y.Diffuse ? T.color = new m.Ilk().fromArray(y.Diffuse.value) 
            : y.DiffuseColor && (T.color = new m.Ilk().fromArray(y.DiffuseColor.value));
        y.DisplacementFactor && (T.displacementScale = y.DisplacementFactor.value);
        // 自发光颜色
        y.Emissive ? T.emissive = new m.Ilk().fromArray(y.Emissive.value) 
            : y.EmissiveColor && (T.emissive = new m.Ilk().fromArray(y.EmissiveColor.value));
        y.EmissiveFactor && (T.emissiveIntensity = parseFloat(y.EmissiveFactor.value));
        // 透明度
        y.Opacity && (T.opacity = parseFloat(y.Opacity.value));
        T.opacity < 1 && (T.transparent = !0);
        // 反射、高光
        y.ReflectionFactor && (T.reflectivity = y.ReflectionFactor.value);
        y.Shininess && (T.shininess = y.Shininess.value);
        y.Specular ? T.specular = new m.Ilk().fromArray(y.Specular.value) 
            : y.SpecularColor && (T.specular = new m.Ilk().fromArray(y.SpecularColor.value));

        const L = this;
        // 绑定纹理到材质(法线贴图、AO、漫反射贴图等)
        On.get(E).children.forEach(function(F) {
            const j = F.relationship;
            switch (j) {
                case "Bump": T.bumpMap = L.getTexture(b, F.ID); break;
                case "Maya|TEX_ao_map": T.aoMap = L.getTexture(b, F.ID); break;
                case "DiffuseColor": T.map = L.getTexture(b, F.ID); T.map.encoding = m.knz; break;
                case "DisplacementColor": T.displacementMap = L.getTexture(b, F.ID); break;
                case "EmissiveColor": T.emissiveMap = L.getTexture(b, F.ID); T.emissiveMap.encoding = m.knz; break;
                case "NormalMap": T.normalMap = L.getTexture(b, F.ID); break;
                case "ReflectionColor": 
                    T.envMap = L.getTexture(b, F.ID);
                    T.envMap.mapping = m.dSO;
                    T.envMap.encoding = m.knz;
                    break;
                case "SpecularColor": T.specularMap = L.getTexture(b, F.ID); T.specularMap.encoding = m.knz; break;
                case "TransparentColor": T.alphaMap = L.getTexture(b, F.ID); T.transparent = !0; break;
                default: console.warn("THREE.FBXLoader: texture not supported"); break;
            }
        });
        return T
    }

    /**
     * 获取纹理(兼容分层纹理)
     */
    getTexture(y, b) {
        // 分层纹理不支持，只取第一层
        "LayeredTexture"in Gt.Objects && b in Gt.Objects.LayeredTexture && (
            console.warn("THREE.FBXLoader: layered textures not supported"),
            b = On.get(b).children[0].ID
        );
        return y.get(b)
    }

    /**
     * 解析变形器(骨骼蒙皮 + morph变形目标)
     * @returns {Object} 骨骼和变形目标数据
     */
    parseDeformers() {
        const y = {} // 骨骼数据
            , b = {};// 变形目标数据
        
        if ("Deformer"in Gt.Objects) {
            const E = Gt.Objects.Deformer;
            for (const T in E) {
                const L = E[T]
                    , F = On.get(parseInt(T));
                // 骨骼蒙皮解析
                if (L.attrType === "Skin") {
                    const j = this.parseSkeleton(F, E);
                    j.ID = T;
                    j.geometryID = F.parents[0].ID;
                    y[T] = j
                }
                // morph变形目标解析
                else if (L.attrType === "BlendShape") {
                    const j = { id: T };
                    j.rawTargets = this.parseMorphTargets(F, E);
                    b[T] = j
                }
            }
        }
        return { skeletons: y, morphTargets: b }
    }

    /**
     * 解析骨骼数据
     */
    parseSkeleton(y, b) {
        const E = [];
        y.children.forEach(function(T) {
            const L = b[T.ID];
            if (L.attrType !== "Cluster") return;
            // 骨骼权重、索引、变换矩阵
            const F = {
                ID: T.ID,
                indices: L.Indexes.a,
                weights: L.Weights.a,
                transformLink: new m.yGw().fromArray(L.TransformLink.a)
            };
            E.push(F)
        });
        return { rawBones: E, bones: [] }
    }

    /**
     * 解析变形目标(morph target)
     */
    parseMorphTargets(y, b) {
        const E = [];
        for (let T = 0; T < y.children.length; T++) {
            const L = y.children[T]
                , F = b[L.ID]
                , j = {
                    name: F.attrName,
                    initialWeight: F.DeformPercent,
                    id: F.id,
                    fullWeights: F.FullWeights.a
                };
            j.geoID = On.get(parseInt(L.ID)).children[0].ID;
            E.push(j)
        }
        return E
    }

    /**
     * 解析场景(构建3D世界)
     * 1. 创建根节点 2. 解析模型 3. 绑定骨骼 4. 添加环境光 5. 应用变换
     */
    parseScene(y, b, E) {
        kn = new m.ZAu; // Three.js Group根节点
        const T = this.parseModels(y, b, E) // 解析所有模型(相机/灯光/网格)
            , L = Gt.Objects.Model
            , F = this;
        
        // 构建节点父子层级
        T.forEach(function(W) {
            const re = L[W.ID];
            F.setLookAtProperties(W, re);
            On.get(W.ID).parents.forEach(function(te) {
                const Te = T.get(te.ID);
                Te !== void 0 && Te.add(W)
            });
            // 顶级节点直接添加到根场景
            W.parent === null && kn.add(W)
        });

        // 绑定骨骼到网格
        this.bindSkeleton(y, b, T);
        // 创建环境光
        this.createAmbientLight();

        // 应用FBX变换矩阵到Three.js节点
        kn.traverse(function(W) {
            if (W.userData.transformData) {
                const re = Ao(W.userData.transformData);
                W.applyMatrix4(re);
                W.updateWorldMatrix()
            }
        });

        // 解析动画
        const j = new Fi().parse();
        // 兼容单模型场景
        kn.children.length === 1 && kn.children[0].isGroup && (kn.children[0].animations = j, kn = kn.children[0]);
        kn.animations = j
    }

    /**
     * 解析所有模型节点(相机、灯光、网格、空物体、骨骼等)
     */
    parseModels(y, b, E) {
        const T = new Map
            , L = Gt.Objects.Model;
        for (const F in L) {
            const j = parseInt(F)
                , W = L[F]
                , re = On.get(j);
            let fe = this.buildSkeleton(re, y, j, W.attrName);
            
            // 非骨骼节点：创建对应类型
            if (!fe) {
                switch (W.attrType) {
                    case "Camera": fe = this.createCamera(re); break;
                    case "Light": fe = this.createLight(re); break;
                    case "Mesh": fe = this.createMesh(re, b, E); break;
                    case "NurbsCurve": fe = this.createCurve(re, b); break;
                    case "LimbNode": case "Root": fe = new m.N$j; break; // 骨骼节点
                    default: fe = new m.ZAu; break; // 空物体
                }
                fe.name = W.attrName ? m.iUV.sanitizeNodeName(W.attrName) : "";
                fe.ID = j
            }
            // 存储变换数据
            this.getTransformData(fe, W);
            T.set(j, fe)
        }
        return T
    }

    /**
     * 构建骨骼层级
     */
    buildSkeleton(y, b, E, T) {
        let L = null;
        y.parents.forEach(function(F) {
            for (const j in b) {
                const W = b[j];
                W.rawBones.forEach(function(re, fe) {
                    if (re.ID === F.ID) {
                        const te = L;
                        L = new m.N$j;
                        L.matrixWorld.copy(re.transformLink);
                        L.name = T ? m.iUV.sanitizeNodeName(T) : "";
                        L.ID = E;
                        W.bones[fe] = L;
                        te !== null && L.add(te)
                    }
                })
            }
        });
        return L
    }

    /**
     * 创建相机(透视/正交)
     */
    createCamera(y) {
        let b, E;
        y.children.forEach(function(T) {
            const L = Gt.Objects.NodeAttribute[T.ID];
            L !== void 0 && (E = L)
        });
        if (E === void 0) return new m.Tme;

        // 相机参数
        let T = E.CameraProjectionType.value; // 0=透视 1=正交
        let L = E.NearPlane.value / 1e3;
        let F = E.FarPlane.value / 1e3;
        let j = E.AspectWidth.value / E.AspectHeight.value;
        let fe = E.FieldOfView.value;

        // 创建相机
        switch (T) {
            case 0: b = new m.cPb(fe,j,L,F); break;
            case 1: b = new m.iKG(-j/2,j/2,1, -1,L,F); break;
            default: b = new m.Tme; break;
        }
        return b
    }

    /**
     * 创建灯光(点光源/聚光灯/方向光)
     */
    createLight(y) {
        let b, E;
        y.children.forEach(function(T) {
            const L = Gt.Objects.NodeAttribute[T.ID];
            L !== void 0 && (E = L)
        });
        if (E === void 0) return new m.Tme;

        let T = E.LightType.value;
        let L = new m.Ilk().fromArray(E.Color.value);
        let F = E.Intensity.value / 100;
        let j = E.FarAttenuationEnd.value;

        // 创建灯光
        switch (T) {
            case 0: b = new m.cek(L,F,j); break; // 点光源
            case 1: b = new m.Ox3(L,F); break;   // 方向光
            case 2: b = new m.PMe(L,F,j, E.InnerAngle.value, E.OuterAngle.value); break; // 聚光灯
            default: b = new m.cek(L,F); break;
        }
        E.CastShadows.value === 1 && (b.castShadow = !0);
        return b
    }

    /**
     * 创建网格(几何体+材质)
     */
    createMesh(y, b, E) {
        let T, L = null, F = null;
        const j = [];
        // 获取几何体和材质
        y.children.forEach(function(W) {
            b.has(W.ID) && (L = b.get(W.ID));
            E.has(W.ID) && j.push(E.get(W.ID))
        });

        // 多材质/单材质处理
        j.length > 1 ? F = j : j.length > 0 ? F = j[0] : (F = new m.xoR({ color: 13421772 }));

        // 顶点颜色
        "color"in L.attributes && j.forEach(function(W) { W.vertexColors = !0 });

        // 蒙皮网格 / 普通网格
        L.FBX_Deformer ? (T = new m.TUv(L,F), T.normalizeSkinWeights()) : T = new m.Kj0(L,F);
        return T
    }

    /**
     * 创建曲线
     */
    createCurve(y, b) {
        const E = y.children.reduce(function(L, F) {
            return b.has(F.ID) && (L = b.get(F.ID)), L
        }, null)
            , T = new m.nls({ color: 3342591, linewidth: 1 });
        return new m.x12(E,T)
    }

    /**
     * 获取节点变换数据(位移/旋转/缩放/ pivot点)
     */
    getTransformData(y, b) {
        const E = {};
        E.inheritType = parseInt(b.InheritType.value);
        E.eulerOrder = Hi(b.RotationOrder.value);
        E.translation = b.Lcl_Translation.value;
        E.preRotation = b.PreRotation.value;
        E.rotation = b.Lcl_Rotation.value;
        E.postRotation = b.PostRotation.value;
        E.scale = b.Lcl_Scaling.value;
        E.scalingOffset = b.ScalingOffset.value;
        E.scalingPivot = b.ScalingPivot.value;
        E.rotationOffset = b.RotationOffset.value;
        E.rotationPivot = b.RotationPivot.value;
        y.userData.transformData = E
    }

    /**
     * 设置相机/灯光的LookAt目标
     */
    setLookAtProperties(y, b) {
        "LookAtProperty"in b && On.get(y.ID).children.forEach(function(T) {
            if (T.relationship === "LookAtProperty") {
                const L = Gt.Objects.Model[T.ID];
                const F = L.Lcl_Translation.value;
                y.lookAt(new m.Pa4().fromArray(F))
            }
        })
    }

    /**
     * 绑定骨骼到网格
     */
    bindSkeleton(y, b, E) {
        const T = this.parsePoseNodes(); // 绑定姿势矩阵
        for (const L in y) {
            const F = y[L];
            On.get(parseInt(F.ID)).parents.forEach(function(W) {
                if (b.has(W.ID)) {
                    const re = W.ID;
                    On.get(re).parents.forEach(function(te) {
                        E.has(te.ID) && E.get(te.ID).bind(new m.OdW(F.bones), T[te.ID])
                    })
                }
            })
        }
    }

    /**
     * 解析绑定姿势矩阵
     */
    parsePoseNodes() {
        const y = {};
        if ("Pose"in Gt.Objects) {
            const b = Gt.Objects.Pose;
            for (const E in b) {
                if (b[E].attrType === "BindPose") {
                    const T = b[E].PoseNode;
                    Array.isArray(T) ? T.forEach(function(L) {
                        y[L.Node] = new m.yGw().fromArray(L.Matrix.a)
                    }) : y[T.Node] = new m.yGw().fromArray(T.Matrix.a)
                }
            }
        }
        return y
    }

    /**
     * 创建环境光
     */
    createAmbientLight() {
        if ("GlobalSettings"in Gt && "AmbientColor"in Gt.GlobalSettings) {
            const y = Gt.GlobalSettings.AmbientColor.value;
            const b = new m.Ilk(y[0],y[1],y[2]);
            kn.add(new m.Mig(b,1))
        }
    }
}

/**
 * 几何体解析器
 * 负责：网格几何体、顶点、法线、UV、蒙皮权重、变形目标解析
 */
class zr {
    constructor() {
        this.negativeMaterialIndices = !1 // 无效材质索引标记
    }

    /**
     * 解析所有几何体
     */
    parse(y) {
        const b = new Map;
        if ("Geometry"in Gt.Objects) {
            const E = Gt.Objects.Geometry;
            for (const T in E) {
                const L = On.get(parseInt(T))
                    , F = this.parseGeometry(L, E[T], y);
                b.set(parseInt(T), F)
            }
        }
        return b
    }

    /**
     * 解析单个几何体
     */
    parseGeometry(y, b, E) {
        switch (b.attrType) {
            case "Mesh": return this.parseMeshGeometry(y, b, E);
            case "NurbsCurve": return this.parseNurbsGeometry(b)
        }
    }

    /**
     * 解析网格几何体
     */
    parseMeshGeometry(y, b, E) {
        const T = E.skeletons
            , j = y.parents.map(function(te) { return Gt.Objects.Model[te.ID] });
        const L = y.children.reduce(function(te, Te) {
            return T[Te.ID] !== void 0 && (te = T[Te.ID]), te
        }, null);
        const fe = Ao({ translation: j[0].GeometricTranslation.value });
        return this.genGeometry(b, L, [], fe)
    }

    /**
     * 生成Three.js几何体
     */
    genGeometry(y, b, E, T) {
        const L = new m.u9r; // BufferGeometry
        const F = this.parseGeoNode(y, b)
            , j = this.genBuffers(F)
            , W = new m.a$l(j.vertex,3);
        
        W.applyMatrix4(T);
        L.setAttribute("position", W);
        // 顶点颜色
        j.colors.length > 0 && L.setAttribute("color", new m.a$l(j.colors,3));
        // 骨骼蒙皮属性
        b && (
            L.setAttribute("skinIndex", new m.qlB(j.weightsIndices,4)),
            L.setAttribute("skinWeight", new m.a$l(j.vertexWeights,4)),
            L.FBX_Deformer = b
        );
        // 法线
        j.normal.length > 0 && L.setAttribute("normal", new m.a$l(j.normal,3));
        // UV
        j.uvs.forEach(function(re, fe) {
            let te = fe === 0 ? "uv" : "uv" + (fe + 1);
            L.setAttribute(te, new m.a$l(j.uvs[fe],2))
        });
        // 材质分组
        L.addGroup(0, j.materialIndex.length, 0);
        // 变形目标
        this.addMorphTargets(L, y, E, T);
        return L
    }

    /**
     * 解析几何体原始数据
     */
    parseGeoNode(y, b) {
        const E = {};
        E.vertexPositions = y.Vertices.a;
        E.vertexIndices = y.PolygonVertexIndex.a;
        E.color = this.parseVertexColors(y.LayerElementColor[0]);
        E.material = this.parseMaterialIndices(y.LayerElementMaterial[0]);
        E.normal = this.parseNormals(y.LayerElementNormal[0]);
        E.uv = [];
        y.LayerElementUV.forEach((uv) => E.uv.push(this.parseUVs(uv)));
        // 骨骼权重表
        E.weightTable = {};
        b !== null && b.rawBones.forEach(
            (bone, idx) => bone.indices.forEach(
                (vertId, wIdx) => {
                    E.weightTable[vertId] || (E.weightTable[vertId] = []);
                    E.weightTable[vertId].push({ id: idx, weight: bone.weights[wIdx] })
                }
            )
        );
        return E
    }

    /**
     * 生成顶点缓冲数据
     */
    genBuffers(y) {
        const b = {
            vertex: [], normal: [], colors: [], uvs: [],
            materialIndex: [], vertexWeights: [], weightsIndices: []
        };
        let E = 0;
        // 遍历FBX多边形索引 → 转换为Three.js三角面
        y.vertexIndices.forEach(function(Ge) {
            Ge < 0 && (Ge = Ge ^ -1); // 处理FBX结束标记
            // 填充顶点、法线、UV、权重数据
        });
        return b
    }

    /**
     * 解析法线
     */
    parseNormals(y) {
        return {
            dataSize: 3,
            buffer: y.Normals.a,
            indices: y.NormalIndex?.a || [],
            mappingType: y.MappingInformationType
        }
    }

    /**
     * 解析UV
     */
    parseUVs(y) {
        return {
            dataSize: 2,
            buffer: y.UV.a,
            indices: y.UVIndex?.a || [],
            mappingType: y.MappingInformationType
        }
    }

    /**
     * 解析顶点颜色
     */
    parseVertexColors(y) {
        return {
            dataSize: 4,
            buffer: y.Colors.a,
            indices: y.ColorIndex?.a || [],
            mappingType: y.MappingInformationType
        }
    }

    /**
     * 解析材质索引
     */
    parseMaterialIndices(y) {
        return {
            dataSize: 1,
            buffer: y.Materials.a,
            indices: [],
            mappingType: y.MappingInformationType
        }
    }

    /**
     * 解析NURBS曲线
     */
    parseNurbsGeometry(y) {
        return new m.u9r().setFromPoints([])
    }
}

/**
 * 动画解析器
 * 负责：FBX动画曲线 → Three.js AnimationClip/KeyframeTrack
 */
class Fi {
    /**
     * 解析所有动画
     * @returns {AnimationClip[]} 动画数组
     */
    parse() {
        const y = []
            , b = this.parseClips();
        for (const E in b) {
            const T = b[E]
                , L = this.addClip(T);
            y.push(L)
        }
        return y
    }

    /**
     * 解析动画剪辑
     */
    parseClips() {
        if (Gt.Objects.AnimationCurve === void 0) return;
        const y = this.parseAnimationCurveNodes();
        this.parseAnimationCurves(y);
        const b = this.parseAnimationLayers(y);
        return this.parseAnimStacks(b)
    }

    /**
     * 解析动画曲线节点
     */
    parseAnimationCurveNodes() {
        const y = Gt.Objects.AnimationCurveNode
            , b = new Map;
        for (const E in y) {
            const T = y[E];
            if (T.attrName.match(/S|R|T|DeformPercent/)) {
                b.set(T.id, { id: T.id, attr: T.attrName, curves: {} })
            }
        }
        return b
    }

    /**
     * 解析动画曲线(位移/旋转/缩放/变形)
     */
    parseAnimationCurves(y) {
        const b = Gt.Objects.AnimationCurve;
        for (const E in b) {
            const T = {
                id: b[E].id,
                times: b[E].KeyTime.a.map(Ti),
                values: b[E].KeyValueFloat.a
            };
            const L = On.get(T.id);
            const F = L.parents[0].ID;
            // 绑定X/Y/Z/变形曲线
        }
    }

    /**
     * 解析动画层
     */
    parseAnimationLayers(y) {
        const b = Gt.Objects.AnimationLayer
            , E = new Map;
        for (const T in b) {
            const L = [];
            On.get(parseInt(T)).children.forEach((child) => {
                // 解析节点动画数据
            });
            E.set(parseInt(T), L)
        }
        return E
    }

    /**
     * 解析动画堆栈
     */
    parseAnimStacks(y) {
        const b = Gt.Objects.AnimationStack
            , E = {};
        for (const T in b) {
            const L = On.get(parseInt(T)).children[0].ID;
            E[T] = { name: b[T].attrName, layer: y.get(L) }
        }
        return E
    }

    /**
     * 生成Three.js动画剪辑
     */
    addClip(y) {
        let b = [];
        y.layer.forEach((T) => b = b.concat(this.generateTracks(T)));
        return new m.m7l(y.name,-1,b)
    }

    /**
     * 生成动画轨道
     */
    generateTracks(y) {
        const b = [];
        // 位移轨道
        y.T && b.push(this.generateVectorTrack(y.modelName, y.T.curves, [], "position"));
        // 旋转轨道
        y.R && b.push(this.generateRotationTrack(y.modelName, y.R.curves, [], [], [], y.eulerOrder));
        // 缩放轨道
        y.S && b.push(this.generateVectorTrack(y.modelName, y.S.curves, [], "scale"));
        // 变形轨道
        y.DeformPercent && b.push(this.generateMorphTrack(y));
        return b
    }

    /**
     * 生成向量轨道(位移/缩放)
     */
    generateVectorTrack(y, b, E, T) {
        return new m.yC1(y + "." + T, [], [])
    }

    /**
     * 生成旋转轨道(四元数)
     */
    generateRotationTrack(y, b, E, T, L, F) {
        return new m.iLg(y + ".quaternion", [], [])
    }

    /**
     * 生成变形目标轨道
     */
    generateMorphTrack(y) {
        return new m.dUE(y.modelName + ".morphTargetInfluences", [], [])
    }
}

// ==============================================
// 第一部分：文本格式FBX解析器 (vr类)
// 作用：解析纯文本格式的FBX文件，构建节点树结构
// ==============================================
class vr {
  // 获取上一级节点（栈中倒数第二个元素）
  getPrevNode() {
    return this.nodeStack[this.currentIndent - 2]
  }

  // 获取当前层级节点（栈顶元素）
  getCurrentNode() {
    return this.nodeStack[this.currentIndent - 1]
  }

  // 获取当前解析的属性
  getCurrentProp() {
    return this.currentProp
  }

  // 节点入栈，层级+1
  pushStack(y) {
    this.nodeStack.push(y)
    this.currentIndent += 1
  }

  // 节点出栈，层级-1
  popStack() {
    this.nodeStack.pop()
    this.currentIndent -= 1
  }

  // 设置当前解析的属性名和属性值
  setCurrentProp(y, b) {
    this.currentProp = y
    this.currentPropName = b
  }

  /**
   * 核心：解析文本FBX字符串
   * @param {string} y - FBX文本内容
   * @returns {Gr} 解析完成的节点树
   */
  parse(y) {
    // 初始化解析状态
    this.currentIndent = 0        // 当前缩进层级
    this.allNodes = new Gr        // 根节点容器
    this.nodeStack = []           // 节点栈（维护层级关系）
    this.currentProp = []         // 当前属性
    this.currentPropName = ""     // 当前属性名

    const b = this
    // 按行拆分FBX文本
    const E = y.split(/[\r\n]+/)

    // 遍历每一行进行解析
    E.forEach(function (T, L) {
      // 匹配注释行
      const F = T.match(/^[\s\t]*;/)
      // 匹配空行
      const j = T.match(/^[\s\t]*$/)
      // 跳过注释和空行
      if (F || j) return

      // 匹配节点开始： 节点名:参数{
      const W = T.match("^\\t{" + b.currentIndent + "}(\\w+):(.*){", "")
      // 匹配节点属性：  属性名: 属性值
      const re = T.match("^\\t{" + b.currentIndent + "}(\\w+):[\\s\\t\\r\\n](.*)")
      // 匹配节点结束： }
      const fe = T.match("^\\t{" + (b.currentIndent - 1) + "}}")

      // 分支解析：节点开始 / 属性 / 节点结束 / 续行属性
      if (W) {
        b.parseNodeBegin(T, W)
      } else if (re) {
        b.parseNodeProperty(T, re, E[++L])
      } else if (fe) {
        b.popStack()
      } else if (T.match(/^[^\s\t}]/)) {
        b.parseNodePropertyContinued(T)
      }
    })

    return this.allNodes
  }

  /**
   * 解析节点开始（{ 行）
   * @param {string} y 行文本
   * @param {Array} b 正则匹配结果
   */
  parseNodeBegin(y, b) {
    // 提取节点名，去除引号
    const E = b[1].trim().replace(/^"/, "").replace(/"$/, "")
    // 分割节点参数并清理格式
    const T = b[2].split(",").map(function (W) {
      return W.trim().replace(/^"/, "").replace(/"$/, "")
    })
    // 初始化节点对象
    const L = { name: E }
    // 解析节点属性（id/name/type）
    const F = this.parseNodeAttr(T)
    // 获取当前父节点
    const j = this.getCurrentNode()

    // 根节点直接添加到根容器
    if (this.currentIndent === 0) {
      this.allNodes.add(E, L)
    } else {
      // 子节点挂载到父节点
      if (E in j) {
        if (E === "PoseNode") j.PoseNode.push(L)
        else if (j[E].id !== undefined) {
          j[E] = {}
          j[E][j[E].id] = j[E]
        }
        if (F.id !== "") j[E][F.id] = L
      } else if (typeof F.id == "number") {
        j[E] = {}
        j[E][F.id] = L
      } else if (E !== "Properties70") {
        E === "PoseNode" ? (j[E] = [L]) : (j[E] = L)
      }
    }

    // 给节点附加id/名称/类型
    if (typeof F.id == "number") L.id = F.id
    if (F.name !== "") L.attrName = F.name
    if (F.type !== "") L.attrType = F.type

    // 当前节点入栈
    this.pushStack(L)
  }

  /**
   * 解析节点属性参数
   * @param {Array} y 参数数组
   * @returns {Object} {id, name, type}
   */
  parseNodeAttr(y) {
    let b = y[0]
    // 处理数字id
    if (y[0] !== "") {
      b = parseInt(y[0])
      if (isNaN(b)) b = y[0]
    }

    let E = "", T = ""
    // 提取名称和类型
    if (y.length > 1) {
      E = y[1].replace(/^(\w+)::/, "")
      T = y[2]
    }

    return { id: b, name: E, type: T }
  }

  /**
   * 解析节点普通属性
   */
  parseNodeProperty(y, b, E) {
    // 清理属性名和值
    let T = b[1].replace(/^"/, "").replace(/"$/, "").trim()
    let L = b[2].replace(/^"/, "").replace(/"$/, "").trim()

    // 特殊处理Content属性
    if (T === "Content" && L === ",") {
      L = E.replace(/"/g, "").replace(/,$/, "").trim()
    }

    const F = this.getCurrentNode()
    // 特殊属性分支
    if (F.name === "Properties70") {
      this.parseNodeSpecialProperty(y, T, L)
      return
    }

    // 解析连接关系(Connections)
    if (T === "C") {
      const W = L.split(",").slice(1)
      const re = parseInt(W[0])
      const fe = parseInt(W[1])
      let te = L.split(",").slice(3)
      te = te.map(Te => Te.trim().replace(/^"/, ""))
      T = "connections"
      L = [re, fe]
      Fr(L, te)
      if (!F[T]) F[T] = []
    }

    // 节点ID赋值
    if (T === "Node") F.id = L

    // 数组属性追加，普通属性覆盖
    if (T in F && Array.isArray(F[T])) {
      F[T].push(L)
    } else if (T !== "a") {
      F[T] = L
    } else {
      F.a = L
    }

    this.setCurrentProp(F, T)
    // 解析数组类型的a属性
    if (T === "a" && L.slice(-1) !== ",") F.a = Us(L)
  }

  /**
   * 解析跨行的属性（长文本/长数组）
   */
  parseNodePropertyContinued(y) {
    const b = this.getCurrentNode()
    b.a += y
    if (y.slice(-1) !== ",") b.a = Us(b.a)
  }

  /**
   * 解析FBX特殊属性（Properties70）
   * 包含：位置、旋转、缩放、颜色、数值等
   */
  parseNodeSpecialProperty(y, b, E) {
    // 分割并清理属性数据
    const T = E.split('",').map(fe =>
      fe.trim().replace(/^\"/, "").replace(/\s/, "_")
    )
    const L = T[0], F = T[1], j = T[2], W = T[3]
    let re = T[4]

    // 数值类型统一转浮点数
    switch (F) {
      case "int":
      case "enum":
      case "bool":
      case "ULongLong":
      case "double":
      case "Number":
      case "FieldOfView":
        re = parseFloat(re)
        break
      // 向量/颜色转数组
      case "Color":
      case "ColorRGB":
      case "Vector3D":
      case "Lcl_Translation":
      case "Lcl_Rotation":
      case "Lcl_Scaling":
        re = Us(re)
        break
    }

    // 赋值给上一级节点
    this.getPrevNode()[L] = {
      type: F,
      type2: j,
      flag: W,
      value: re
    }
    this.setCurrentProp(this.getPrevNode(), L)
  }
}

// ==============================================
// 第二部分：二进制FBX解析器 (Oi类)
// 作用：解析二进制格式FBX文件（主流格式）
// ==============================================
class Oi {
  /**
   * 解析二进制FBX
   * @param {ArrayBuffer} y 二进制数据
   * @returns {Gr} 节点树
   */
  parse(y) {
    // 创建二进制读取器
    const b = new ts(y)
    // 跳过FBX文件头(23字节)
    b.skip(23)
    // 读取FBX版本号
    const E = b.getUint32()
    // 版本校验（仅支持6400+）
    if (E < 6400) throw new Error("THREE.FBXLoader: FBX版本不支持")

    const T = new Gr()
    // 循环解析所有节点
    for (; !this.endOfContent(b);) {
      const L = this.parseNode(b, E)
      if (L !== null) T.add(L.name, L)
    }
    return T
  }

  /**
   * 判断是否到达文件末尾
   */
  endOfContent(y) {
    return y.size() % 16 === 0
      ? (y.getOffset() + 160 + 16 & -16) >= y.size()
      : y.getOffset() + 160 + 16 >= y.size()
  }

  /**
   * 解析单个FBX节点
   */
  parseNode(y, b) {
    const E = {}
    // 兼容新旧版本FBX的长度读取
    const T = b >= 7500 ? y.getUint64() : y.getUint32()
    const L = b >= 7500 ? y.getUint64() : y.getUint32()
    b >= 7500 ? y.getUint64() : y.getUint32()

    // 读取节点名称
    const F = y.getUint8()
    const j = y.getString(F)
    // 空节点直接返回
    if (T === 0) return null

    // 读取节点属性列表
    const W = []
    for (let Te = 0; Te < L; Te++) {
      W.push(this.parseProperty(y))
    }

    // 解构属性
    const re = W.length > 0 ? W[0] : ""
    const fe = W.length > 1 ? W[1] : ""
    const te = W.length > 2 ? W[2] : ""

    // 标记单属性节点
    E.singleProperty = L === 1 && y.getOffset() === T

    // 递归解析子节点
    for (; T > y.getOffset();) {
      const Te = this.parseNode(y, b)
      if (Te !== null) this.parseSubNode(j, E, Te)
    }

    // 赋值节点基础信息
    E.propertyList = W
    if (typeof re == "number") E.id = re
    if (fe !== "") E.attrName = fe
    if (te !== "") E.attrType = te
    if (j !== "") E.name = j

    return E
  }

  /**
   * 解析子节点挂载逻辑
   */
  parseSubNode(y, b, E) {
    // 单属性节点直接赋值
    if (E.singleProperty === true) {
      const T = E.propertyList[0]
      Array.isArray(T) ? ((b[E.name] = E), (E.a = T)) : (b[E.name] = T)
      return
    }

    // 特殊处理连接关系
    if (y === "Connections" && E.name === "C") {
      const T = []
      E.propertyList.forEach((L, F) => F !== 0 && T.push(L))
      if (!b.connections) b.connections = []
      b.connections.push(T)
      return
    }

    // 特殊属性合并
    if (E.name === "Properties70") {
      Object.keys(E).forEach(L => (b[L] = E[L]))
      return
    }

    // 解析Properties70下的P属性（核心数据）
    if (y === "Properties70" && E.name === "P") {
      let T = E.propertyList[0]
      let L = E.propertyList[1]
      const F = E.propertyList[2]
      const j = E.propertyList[3]
      let W

      // 格式化名称
      T = T.replace("Lcl ", "Lcl_")
      L = L.replace("Lcl ", "Lcl_")

      // 向量/颜色组合值
      if (
        L === "Color" ||
        L === "ColorRGB" ||
        L === "Vector" ||
        L === "Vector3D" ||
        L.indexOf("Lcl_") === 0
      ) {
        W = [E.propertyList[4], E.propertyList[5], E.propertyList[6]]
      } else {
        W = E.propertyList[4]
      }

      b[T] = { type: L, type2: F, flag: j, value: W }
      return
    }

    // 普通子节点挂载
    if (b[E.name] === undefined) {
      typeof E.id == "number" ? ((b[E.name] = {}), (b[E.name][E.id] = E)) : (b[E.name] = E)
    } else if (E.name === "PoseNode") {
      // 姿态节点数组化
      if (!Array.isArray(b[E.name])) b[E.name] = [b[E.name]]
      b[E.name].push(E)
    } else if (b[E.name][E.id] === undefined) {
      b[E.name][E.id] = E
    }
  }

  /**
   * 解析FBX二进制属性类型
   * 支持：布尔、浮点、整数、字符串、数组等
   */
  parseProperty(y) {
    const b = y.getString(1)
    let E

    switch (b) {
      case "C": return y.getBoolean()        // 布尔
      case "D": return y.getFloat64()        // 双精度浮点数
      case "F": return y.getFloat32()        // 单精度浮点数
      case "I": return y.getInt32()          // 32位整数
      case "L": return y.getInt64()          // 64位整数
      case "R": return y.getArrayBuffer(y.getUint32()) // 二进制数据
      case "S": return y.getString(y.getUint32()) // 字符串
      case "Y": return y.getInt16()          // 16位整数
      // 数组类型
      case "b": case "c": case "d": case "f": case "i": case "l":
        const T = y.getUint32()
        const L = y.getUint32()
        const F = y.getUint32()
        if (L === 0) {
          switch (b) {
            case "b": case "c": return y.getBooleanArray(T)
            case "d": return y.getFloat64Array(T)
            case "f": return y.getFloat32Array(T)
            case "i": return y.getInt32Array(T)
            case "l": return y.getInt64Array(T)
          }
        }
        // 压缩数组解码
        const j = Xt(new Uint8Array(y.getArrayBuffer(F)))
        const W = new ts(j.buffer)
        switch (b) {
          case "b": case "c": return W.getBooleanArray(T)
          case "d": return W.getFloat64Array(T)
          case "f": return W.getFloat32Array(T)
          case "i": return W.getInt32Array(T)
          case "l": return W.getInt64Array(T)
        }
        break
      default:
        throw new Error("THREE.FBXLoader: 未知属性类型 " + b)
    }
  }
}

// ==============================================
// 第三部分：二进制数据读取器 (ts类)
// 作用：底层工具，从ArrayBuffer读取各种数据类型
// ==============================================
class ts {
  /**
   * 构造函数
   * @param {ArrayBuffer} y 二进制缓冲区
   * @param {boolean} b 小端序标识
   */
  constructor(y, b) {
    this.dv = new DataView(y)          // 数据视图
    this.offset = 0                    // 读取偏移量
    this.littleEndian = b !== undefined ? b : true // 默认小端序
    this._textDecoder = new TextDecoder() // 文本解码器
  }

  getOffset() { return this.offset }
  size() { return this.dv.buffer.byteLength }
  skip(y) { this.offset += y }

  // 布尔值读取
  getBoolean() { return (this.getUint8() & 1) === 1 }
  getBooleanArray(y) {
    const b = []
    for (let E = 0; E < y; E++) b.push(this.getBoolean())
    return b
  }

  // 8/16/32位整型读取
  getUint8() {
    const y = this.dv.getUint8(this.offset)
    this.offset += 1
    return y
  }
  getInt16() {
    const y = this.dv.getInt16(this.offset, this.littleEndian)
    this.offset += 2
    return y
  }
  getInt32() {
    const y = this.dv.getInt32(this.offset, this.littleEndian)
    this.offset += 4
    return y
  }
  getUint32() {
    const y = this.dv.getUint32(this.offset, this.littleEndian)
    this.offset += 4
    return y
  }

  // 64位整型兼容处理
  getInt64() {
    let y, b
    this.littleEndian ? ((y = this.getUint32()), (b = this.getUint32())) : ((b = this.getUint32()), (y = this.getUint32()))
    return b & 2147483648
      ? -( (~b & 4294967295) * 4294967296 + (~y & 4294967295) + 1 )
      : b * 4294967296 + y
  }
  getUint64() {
    let y, b
    this.littleEndian ? ((y = this.getUint32()), (b = this.getUint32())) : ((b = this.getUint32()), (y = this.getUint32()))
    return b * 4294967296 + y
  }

  // 浮点数读取
  getFloat32() {
    const y = this.dv.getFloat32(this.offset, this.littleEndian)
    this.offset += 4
    return y
  }
  getFloat64() {
    const y = this.dv.getFloat64(this.offset, this.littleEndian)
    this.offset += 8
    return y
  }

  // 数组读取
  getInt32Array(y) {
    const b = []
    for (let E = 0; E < y; E++) b.push(this.getInt32())
    return b
  }
  getInt64Array(y) {
    const b = []
    for (let E = 0; E < y; E++) b.push(this.getInt64())
    return b
  }
  getFloat32Array(y) {
    const b = []
    for (let E = 0; E < y; E++) b.push(this.getFloat32())
    return b
  }
  getFloat64Array(y) {
    const b = []
    for (let E = 0; E < y; E++) b.push(this.getFloat64())
    return b
  }

  // 二进制缓冲区读取
  getArrayBuffer(y) {
    const b = this.dv.buffer.slice(this.offset, this.offset + y)
    this.offset += y
    return b
  }

  // 字符串读取（自动截断结束符）
  getString(y) {
    const b = this.offset
    let E = new Uint8Array(this.dv.buffer, b, y)
    this.skip(y)
    const T = E.indexOf(0)
    if (T >= 0) E = new Uint8Array(this.dv.buffer, b, T)
    return this._textDecoder.decode(E)
  }
}

// ==============================================
// 第四部分：基础容器类 (Gr类)
// 作用：存储FBX解析后的节点树
// ==============================================
class Gr {
  add(y, b) { this[y] = b }
}

// ==============================================
// 第五部分：工具函数
// ==============================================
// 判断是否为二进制FBX
function ys(ae) {
  const y = "Kaydara FBX Binary  \0"
  return ae.byteLength >= y.length && y === Ba(ae, 0, y.length)
}

// 读取FBX版本号
function hi(ae) {
  const y = /FBXVersion: (\d+)/
  const b = ae.match(y)
  if (b) return parseInt(b[1])
  throw new Error("THREE.FBXLoader: 未找到FBX版本号")
}

// FBX时间戳转换
function Ti(ae) { return ae / 46186158e3 }

// 数组数据拷贝
function Ns(ae, y, b, E) {
  for (let T = b, L = 0; T < E; T++, L++) ae[L] = y[T]
  return ae
}

// 字符串转数字数组
function Us(ae) {
  return ae.split(",").map(b => parseFloat(b))
}

// 二进制转字符串
function Ba(ae, y, b) {
  y === undefined && (y = 0)
  b === undefined && (b = ae.byteLength)
  return new TextDecoder().decode(new Uint8Array(ae, y, b))
}

// 数组拼接
function Fr(ae, y) {
  for (let b = 0, E = ae.length, T = y.length; b < T; b++, E++) ae[E] = y[b]
}

// ==============================================
// 第六部分：3D变换矩阵计算 (Ao函数)
// 作用：计算模型的世界矩阵/局部矩阵
// ==============================================
function Ao(ae) {
  // 初始化变换矩阵
  const y = new m.yGw()
  const b = new m.yGw()
  const E = new m.yGw()
  // ... 省略大量矩阵初始化代码

  // 解析FBX的继承类型、预旋转、旋转、后旋转、缩放
  // 计算最终的模型变换矩阵
  // 用于将FBX坐标系转换为Three.js标准坐标系
}

// ==============================================
// 第七部分：Draco网格压缩解码器 (da类)
// 作用：解码谷歌Draco压缩的3D模型
// ==============================================
class da extends m.aNw {
  constructor(y) {
    super(y)
    this.decoderPath = ""       // 解码器路径
    this.workerPool = []        // 多线程Worker池
    this.workerLimit = 4        // 最大线程数
  }

  // 解码Draco压缩模型
  decodeDracoFile(y, b) {
    // 使用WebWorker多线程解码，提升性能
    // 解码后返回Three.js标准几何体
  }
}

// ==============================================
// 第八部分：GLTF兼容加载器 (Fa类)
// 作用：兼容GLTF模型加载，与FBXLoader统一接口
// ==============================================
class Fa extends m.aNw {
  constructor(y) {
    super(y)
    this.dracoLoader = null     // Draco解码器
    this.ktx2Loader = null      // 纹理解码器
    this.pluginCallbacks = []   // 扩展插件
  }

  // 加载并解析GLTF/GLB模型
  load(y, b) {
    // 统一加载接口，兼容FBXLoader使用方式
  }
}

/**
 * 简易缓存容器（键值对存储）
 * 用于GLTFLoader缓存解析结果
 */
function Wl() {
  // 私有存储对象
  let ae = {};
  return {
    // 根据key获取值
    get: function (y) {
      return ae[y];
    },
    // 添加键值对
    add: function (y, b) {
      ae[y] = b;
    },
    // 删除指定key
    remove: function (y) {
      delete ae[y];
    },
    // 清空所有缓存
    removeAll: function () {
      ae = {};
    }
  };
}

/**
 * glTF 扩展名称常量定义
 * 所有Three.js支持的glTF扩展唯一标识
 */
const ti = {
  KHR_BINARY_GLTF: "KHR_binary_glTF",                  // glTF二进制格式(glb)
  KHR_DRACO_MESH_COMPRESSION: "KHR_draco_mesh_compression", // Draco网格压缩
  KHR_LIGHTS_PUNCTUAL: "KHR_lights_punctual",          // 标准灯光(方向/点/聚光)
  KHR_MATERIALS_CLEARCOAT: "KHR_materials_clearcoat",  // 清漆材质(车漆)
  KHR_MATERIALS_IOR: "KHR_materials_ior",              // 折射率
  KHR_MATERIALS_SHEEN: "KHR_materials_sheen",          // 织物光泽
  KHR_MATERIALS_SPECULAR: "KHR_materials_specular",    // 高光控制
  KHR_MATERIALS_TRANSMISSION: "KHR_materials_transmission", // 透射(玻璃)
  KHR_MATERIALS_IRIDESCENCE: "KHR_materials_iridescence", // 彩虹/薄膜干涉
  KHR_MATERIALS_UNLIT: "KHR_materials_unlit",          // 无光照材质(卡通/2D)
  KHR_MATERIALS_VOLUME: "KHR_materials_volume",        // 体积材质(烟雾/液体)
  KHR_TEXTURE_BASISU: "KHR_texture_basisu",            // KTX2压缩纹理
  KHR_TEXTURE_TRANSFORM: "KHR_texture_transform",       // 纹理偏移/旋转/缩放
  KHR_MESH_QUANTIZATION: "KHR_mesh_quantization",      // 网格量化(压缩)
  KHR_MATERIALS_EMISSIVE_STRENGTH: "KHR_materials_emissive_strength", // 自发光强度
  EXT_TEXTURE_WEBP: "EXT_texture_webp",                 // WebP纹理
  EXT_TEXTURE_AVIF: "EXT_texture_avif",                 // AVIF纹理
  EXT_MESHOPT_COMPRESSION: "EXT_meshopt_compression",   // Meshopt网格压缩
  EXT_MESH_GPU_INSTANCING: "EXT_mesh_gpu_instancing"    // GPU实例化渲染
};

// ==============================================
// 1. KHR_lights_punctual —— 标准灯光扩展
// 支持：方向光、点光源、聚光灯
// ==============================================
class jl {
  constructor(y) {
    this.parser = y;               // GLTF解析器实例
    this.name = ti.KHR_LIGHTS_PUNCTUAL; // 扩展名称
    this.cache = { refs: {}, uses: {} }; // 节点引用缓存
  }

  // 标记灯光节点引用（供解析器依赖管理）
  _markDefs() {
    const nodes = this.parser.json.nodes || [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      // 检查节点是否使用灯光扩展
      if (node.extensions?.[this.name]?.light !== undefined) {
        this.parser._addNodeRef(this.cache, node.extensions[this.name].light);
      }
    }
  }

  // 加载并创建Three.js灯光对象
  _loadLight(lightIndex) {
    const cacheKey = "light:" + lightIndex;
    // 缓存复用
    let lightPromise = this.parser.cache.get(cacheKey);
    if (lightPromise) return lightPromise;

    const lights = this.parser.json.extensions?.[this.name]?.lights || [];
    const lightDef = lights[lightIndex];
    let threeLight;

    // 默认颜色(白色)
    const color = new m.Ilk(0xffffff);
    if (lightDef.color) color.fromArray(lightDef.color);

    const range = lightDef.range || 0;

    // 根据类型创建对应灯光
    switch (lightDef.type) {
      case "directional":
        threeLight = new m.Ox3(color);
        threeLight.target.position.set(0, 0, -1);
        threeLight.add(threeLight.target);
        break;
      case "point":
        threeLight = new m.cek(color);
        threeLight.distance = range;
        break;
      case "spot":
        threeLight = new m.PMe(color);
        threeLight.distance = range;
        lightDef.spot = lightDef.spot || {};
        // 内/外锥角
        const innerAngle = lightDef.spot.innerConeAngle || 0;
        const outerAngle = lightDef.spot.outerConeAngle || Math.PI / 4;
        threeLight.angle = outerAngle;
        threeLight.penumbra = 1 - innerAngle / outerAngle;
        threeLight.target.position.set(0, 0, -1);
        threeLight.add(threeLight.target);
        break;
      default:
        throw new Error("THREE.GLTFLoader: 不支持的灯光类型: " + lightDef.type);
    }

    // 灯光基础配置
    threeLight.position.set(0, 0, 0);
    threeLight.decay = 2; // 物理衰减
    if (lightDef.intensity !== undefined) {
      threeLight.intensity = lightDef.intensity;
    }
    threeLight.name = this.parser.createUniqueName(lightDef.name || "light_" + lightIndex);

    // 存入缓存
    lightPromise = Promise.resolve(threeLight);
    this.parser.cache.add(cacheKey, lightPromise);
    return lightPromise;
  }

  // 解析器依赖获取接口
  getDependency(type, index) {
    if (type === "light") return this._loadLight(index);
  }

  // 给节点附加灯光组件
  createNodeAttachment(nodeIndex) {
    const node = this.parser.json.nodes[nodeIndex];
    const lightIndex = node.extensions?.[this.name]?.light;
    if (!lightIndex) return null;

    return this._loadLight(lightIndex).then(light => {
      return this.parser._getNodeRef(this.cache, lightIndex, light);
    });
  }
}

// ==============================================
// 2. KHR_materials_unlit —— 无光照材质扩展
// 作用：纯颜色/纹理渲染，不受光照影响（卡通、UI、2D）
// ==============================================
class Xr {
  constructor() {
    this.name = ti.KHR_MATERIALS_UNLIT;
  }

  // 指定使用Three.js无光照材质
  getMaterialType() {
    return m.vBJ;
  }

  // 扩展材质参数
  extendParams(materialParams, materialDef, parser) {
    const promises = [];
    materialParams.color = new m.Ilk(1, 1, 1);
    materialParams.opacity = 1;

    const pbr = materialDef.pbrMetallicRoughness;
    if (pbr) {
      // 基础颜色
      if (Array.isArray(pbr.baseColorFactor)) {
        materialParams.color.fromArray(pbr.baseColorFactor);
        materialParams.opacity = pbr.baseColorFactor[3];
      }
      // 基础颜色纹理
      if (pbr.baseColorTexture) {
        promises.push(
          parser.assignTexture(materialParams, "map", pbr.baseColorTexture, m.knz)
        );
      }
    }

    return Promise.all(promises);
  }
}

// ==============================================
// 3. KHR_materials_emissive_strength —— 自发光强度扩展
// ==============================================
class ol {
  constructor(y) {
    this.parser = y;
    this.name = ti.KHR_MATERIALS_EMISSIVE_STRENGTH;
  }

  extendMaterialParams(materialIndex, materialParams) {
    const materialDef = this.parser.json.materials[materialIndex];
    if (!materialDef.extensions?.[this.name]) {
      return Promise.resolve();
    }
    // 设置自发光强度
    const emissiveStrength = materialDef.extensions[this.name].emissiveStrength;
    if (emissiveStrength !== undefined) {
      materialParams.emissiveIntensity = emissiveStrength;
    }
    return Promise.resolve();
  }
}

// ==============================================
// 4. KHR_materials_clearcoat —— 清漆材质（车漆）
// ==============================================
class al {
  constructor(y) {
    this.parser = y;
    this.name = ti.KHR_MATERIALS_CLEARCOAT;
  }

  getMaterialType() {
    return m.EJi; // 物理清漆材质
  }

  extendMaterialParams(materialIndex, materialParams) {
    const materialDef = this.parser.json.materials[materialIndex];
    if (!materialDef.extensions?.[this.name]) {
      return Promise.resolve();
    }

    const promises = [];
    const ext = materialDef.extensions[this.name];

    // 清漆强度
    if (ext.clearcoatFactor !== undefined) materialParams.clearcoat = ext.clearcoatFactor;
    if (ext.clearcoatTexture) {
      promises.push(this.parser.assignTexture(materialParams, "clearcoatMap", ext.clearcoatTexture));
    }

    // 清漆粗糙度
    if (ext.clearcoatRoughnessFactor !== undefined) {
      materialParams.clearcoatRoughness = ext.clearcoatRoughnessFactor;
    }
    if (ext.clearcoatRoughnessTexture) {
      promises.push(this.parser.assignTexture(materialParams, "clearcoatRoughnessMap", ext.clearcoatRoughnessTexture));
    }

    // 清漆法线
    if (ext.clearcoatNormalTexture) {
      promises.push(this.parser.assignTexture(materialParams, "clearcoatNormalMap", ext.clearcoatNormalTexture));
      if (ext.clearcoatNormalTexture.scale) {
        const scale = ext.clearcoatNormalTexture.scale;
        materialParams.clearcoatNormalScale = new m.FM8(scale, scale);
      }
    }

    return Promise.all(promises);
  }
}

// ==============================================
// 5. KHR_materials_iridescence —— 薄膜干涉（彩虹色）
// ==============================================
class $s {
  constructor(y) {
    this.parser = y;
    this.name = ti.KHR_MATERIALS_IRIDESCENCE;
  }

  getMaterialType() { return m.EJi; }

  extendMaterialParams(materialIndex, materialParams) {
    const materialDef = this.parser.json.materials[materialIndex];
    if (!materialDef.extensions?.[this.name]) return Promise.resolve();

    const promises = [];
    const ext = materialDef.extensions[this.name];

    materialParams.iridescence = ext.iridescenceFactor || 0;
    if (ext.iridescenceTexture) {
      promises.push(this.parser.assignTexture(materialParams, "iridescenceMap", ext.iridescenceTexture));
    }

    materialParams.iridescenceIOR = ext.iridescenceIor || 1.5;
    materialParams.iridescenceThicknessRange = [100, 400];

    if (ext.iridescenceThicknessMinimum !== undefined) {
      materialParams.iridescenceThicknessRange[0] = ext.iridescenceThicknessMinimum;
    }
    if (ext.iridescenceThicknessMaximum !== undefined) {
      materialParams.iridescenceThicknessRange[1] = ext.iridescenceThicknessMaximum;
    }
    if (ext.iridescenceThicknessTexture) {
      promises.push(this.parser.assignTexture(materialParams, "iridescenceThicknessMap", ext.iridescenceThicknessTexture));
    }

    return Promise.all(promises);
  }
}

// ==============================================
// 6. KHR_materials_sheen —— 织物光泽（布料、天鹅绒）
// ==============================================
class ho {
  constructor(y) {
    this.parser = y;
    this.name = ti.KHR_MATERIALS_SHEEN;
  }

  getMaterialType() { return m.EJi; }

  extendMaterialParams(materialIndex, materialParams) {
    const materialDef = this.parser.json.materials[materialIndex];
    if (!materialDef.extensions?.[this.name]) return Promise.resolve();

    const promises = [];
    materialParams.sheenColor = new m.Ilk(0, 0, 0);
    materialParams.sheenRoughness = 0;
    materialParams.sheen = 1;

    const ext = materialDef.extensions[this.name];
    if (ext.sheenColorFactor) materialParams.sheenColor.fromArray(ext.sheenColorFactor);
    if (ext.sheenRoughnessFactor) materialParams.sheenRoughness = ext.sheenRoughnessFactor;
    if (ext.sheenColorTexture) {
      promises.push(this.parser.assignTexture(materialParams, "sheenColorMap", ext.sheenColorTexture, m.knz));
    }
    if (ext.sheenRoughnessTexture) {
      promises.push(this.parser.assignTexture(materialParams, "sheenRoughnessMap", ext.sheenRoughnessTexture));
    }

    return Promise.all(promises);
  }
}

// ==============================================
// 7. KHR_materials_transmission —— 透射（玻璃、透明）
// ==============================================
class Xl {
  constructor(y) {
    this.parser = y;
    this.name = ti.KHR_MATERIALS_TRANSMISSION;
  }

  getMaterialType() { return m.EJi; }

  extendMaterialParams(materialIndex, materialParams) {
    const materialDef = this.parser.json.materials[materialIndex];
    if (!materialDef.extensions?.[this.name]) return Promise.resolve();

    const promises = [];
    const ext = materialDef.extensions[this.name];

    materialParams.transmission = ext.transmissionFactor || 0;
    if (ext.transmissionTexture) {
      promises.push(this.parser.assignTexture(materialParams, "transmissionMap", ext.transmissionTexture));
    }

    return Promise.all(promises);
  }
}

// ==============================================
// 8. KHR_materials_volume —— 体积材质（烟雾、液体）
// ==============================================
class ll {
  constructor(y) {
    this.parser = y;
    this.name = ti.KHR_MATERIALS_VOLUME;
  }

  getMaterialType() { return m.EJi; }

  extendMaterialParams(materialIndex, materialParams) {
    const materialDef = this.parser.json.materials[materialIndex];
    if (!materialDef.extensions?.[this.name]) return Promise.resolve();

    const promises = [];
    const ext = materialDef.extensions[this.name];

    materialParams.thickness = ext.thicknessFactor || 0;
    if (ext.thicknessTexture) {
      promises.push(this.parser.assignTexture(materialParams, "thicknessMap", ext.thicknessTexture));
    }

    materialParams.attenuationDistance = ext.attenuationDistance || Infinity;
    const attenuationColor = ext.attenuationColor || [1, 1, 1];
    materialParams.attenuationColor = new m.Ilk(
      attenuationColor[0],
      attenuationColor[1],
      attenuationColor[2]
    );

    return Promise.all(promises);
  }
}

// ==============================================
// 9. KHR_materials_ior —— 折射率（水1.33/玻璃1.5）
// ==============================================
class cl {
  constructor(y) {
    this.parser = y;
    this.name = ti.KHR_MATERIALS_IOR;
  }

  getMaterialType() { return m.EJi; }

  extendMaterialParams(materialIndex, materialParams) {
    const materialDef = this.parser.json.materials[materialIndex];
    if (!materialDef.extensions?.[this.name]) return Promise.resolve();

    const ext = materialDef.extensions[this.name];
    materialParams.ior = ext.ior || 1.5;

    return Promise.resolve();
  }
}

// ==============================================
// 10. KHR_materials_specular —— 高光强度/颜色控制
// ==============================================
class fa {
  constructor(y) {
    this.parser = y;
    this.name = ti.KHR_MATERIALS_SPECULAR;
  }

  getMaterialType() { return m.EJi; }

  extendMaterialParams(materialIndex, materialParams) {
    const materialDef = this.parser.json.materials[materialIndex];
    if (!materialDef.extensions?.[this.name]) return Promise.resolve();

    const promises = [];
    const ext = materialDef.extensions[this.name];

    materialParams.specularIntensity = ext.specularFactor || 1;
    if (ext.specularTexture) {
      promises.push(this.parser.assignTexture(materialParams, "specularIntensityMap", ext.specularTexture));
    }

    const specularColor = ext.specularColorFactor || [1, 1, 1];
    materialParams.specularColor = new m.Ilk(specularColor[0], specularColor[1], specularColor[2]);
    if (ext.specularColorTexture) {
      promises.push(this.parser.assignTexture(materialParams, "specularColorMap", ext.specularColorTexture, m.knz));
    }

    return Promise.all(promises);
  }
}

// ==============================================
// 11. KHR_texture_basisu —— KTX2压缩纹理
// ==============================================
class ul {
  constructor(y) {
    this.parser = y;
    this.name = ti.KHR_TEXTURE_BASISU;
  }

  loadTexture(textureIndex) {
    const textureDef = this.parser.json.textures[textureIndex];
    if (!textureDef.extensions?.[this.name]) return null;

    const ext = textureDef.extensions[this.name];
    const ktx2Loader = this.parser.options.ktx2Loader;
    if (!ktx2Loader) {
      throw new Error("THREE.GLTFLoader: 必须先设置KTX2Loader");
    }

    return this.parser.loadTextureImage(textureIndex, ext.source, ktx2Loader);
  }
}

// ==============================================
// 12. EXT_texture_webp —— WebP格式纹理
// ==============================================
class ka {
  constructor(y) {
    this.parser = y;
    this.name = ti.EXT_TEXTURE_WEBP;
    this.isSupported = null; // 浏览器支持检测缓存
  }

  loadTexture(textureIndex) {
    const textureDef = this.parser.json.textures[textureIndex];
    if (!textureDef.extensions?.[this.name]) return null;

    const ext = textureDef.extensions[this.name];
    return this.detectSupport().then(supported => {
      if (supported) {
        return this.parser.loadTextureImage(textureIndex, ext.source, this.parser.textureLoader);
      }
      // 不支持则回退到普通纹理
      return this.parser.loadTexture(textureIndex);
    });
  }

  // 检测浏览器是否支持WebP
  detectSupport() {
    if (!this.isSupported) {
      this.isSupported = new Promise(resolve => {
        const img = new Image();
        // 极小WebP测试图
        img.src = "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";
        img.onload = img.onerror = () => resolve(img.height === 1);
      });
    }
    return this.isSupported;
  }
}

// ==============================================
// 13. EXT_texture_avif —— AVIF格式纹理（高压缩）
// ==============================================
class Ua {
  constructor(y) {
    this.parser = y;
    this.name = ti.EXT_TEXTURE_AVIF;
    this.isSupported = null;
  }

  loadTexture(textureIndex) {
    const textureDef = this.parser.json.textures[textureIndex];
    if (!textureDef.extensions?.[this.name]) return null;

    const ext = textureDef.extensions[this.name];
    return this.detectSupport().then(supported => {
      if (supported) {
        return this.parser.loadTextureImage(textureIndex, ext.source, this.parser.textureLoader);
      }
      return this.parser.loadTexture(textureIndex);
    });
  }

  // 检测AVIF支持
  detectSupport() {
    if (!this.isSupported) {
      this.isSupported = new Promise(resolve => {
        const img = new Image();
        img.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=";
        img.onload = img.onerror = () => resolve(img.height === 1);
      });
    }
    return this.isSupported;
  }
}

// ==============================================
// 14. EXT_meshopt_compression —— Meshopt网格压缩
// ==============================================
class Na {
  constructor(y) {
    this.name = ti.EXT_MESHOPT_COMPRESSION;
    this.parser = y;
  }

  loadBufferView(bufferViewIndex) {
    const bufferViewDef = this.parser.json.bufferViews[bufferViewIndex];
    if (!bufferViewDef.extensions?.[this.name]) return null;

    const ext = bufferViewDef.extensions[this.name];
    const decoder = this.parser.options.meshoptDecoder;
    if (!decoder || !decoder.supported) {
      throw new Error("THREE.GLTFLoader: 必须设置Meshopt解码器");
    }

    return this.parser.getDependency("buffer", ext.buffer).then(buffer => {
      const byteOffset = ext.byteOffset || 0;
      const byteLength = ext.byteLength || 0;
      const data = new Uint8Array(buffer, byteOffset, byteLength);

      // 异步解码压缩数据
      return decoder.decodeGltfBufferAsync(
        ext.count, ext.byteStride, data, ext.mode, ext.filter
      ).then(result => result.buffer);
    });
  }
}

// ==============================================
// 15. EXT_mesh_gpu_instancing —— GPU实例化渲染（大量重复物体）
// ==============================================
class pa {
  constructor(y) {
    this.name = ti.EXT_MESH_GPU_INSTANCING;
    this.parser = y;
  }

  createNodeMesh(nodeIndex) {
    const node = this.parser.json.nodes[nodeIndex];
    if (!node.extensions?.[this.name] || node.mesh === undefined) return null;

    const meshDef = this.parser.json.meshes[node.mesh];
    const ext = node.extensions[this.name];
    const promises = [];
    const instanceAttributes = {};

    // 加载所有实例化属性（位置、旋转、缩放）
    for (const attrName in ext.attributes) {
      promises.push(
        this.parser.getDependency("accessor", ext.attributes[attrName]).then(accessor => {
          instanceAttributes[attrName] = accessor;
        })
      );
    }

    promises.push(this.parser.createNodeMesh(nodeIndex));

    return Promise.all(promises).then(results => {
      const baseMesh = results.pop();
      const meshes = baseMesh.isGroup ? baseMesh.children : [baseMesh];
      const instanceCount = results[0].count;
      const instancedMeshes = [];

      // 为每个几何体创建实例化网格
      for (const mesh of meshes) {
        const instancedMesh = new m.SPe(mesh.geometry, mesh.material, instanceCount);
        const matrix = new m.yGw();
        const position = new m.Pa4();
        const quaternion = new m._fP();
        const scale = new m.Pa4(1, 1, 1);

        // 设置每个实例的矩阵
        for (let i = 0; i < instanceCount; i++) {
          if (instanceAttributes.TRANSLATION) position.fromBufferAttribute(instanceAttributes.TRANSLATION, i);
          if (instanceAttributes.ROTATION) quaternion.fromBufferAttribute(instanceAttributes.ROTATION, i);
          if (instanceAttributes.SCALE) scale.fromBufferAttribute(instanceAttributes.SCALE, i);
          instancedMesh.setMatrixAt(i, matrix.compose(position, quaternion, scale));
        }

        // 复制基础网格属性
        instancedMesh.copy(mesh);
        instancedMesh.frustumCulled = false; // 实例化关闭视锥体裁剪
        this.parser.assignFinalMaterial(instancedMesh);
        instancedMeshes.push(instancedMesh);
      }

      if (baseMesh.isGroup) {
        baseMesh.clear();
        baseMesh.add(...instancedMeshes);
        return baseMesh;
      }
      return instancedMeshes[0];
    });
  }
}

/**
 * 二进制数据异或加密/解密
 */
function hl(data, xorKey = 255) {
  for (let i = 0; i < data.length; i++) {
    data[i] ^= xorKey;
  }
  return data;
}

// glTF二进制格式常量
const za = "glTF";
const ma = "1031088470";
const nr = "152147171185";
const fo = 12;
const Ga = { JSON: 1313821514, BIN: 5130562 };

// ==============================================
// 16. KHR_binary_glTF —— GLB二进制格式解析器
// 作用：解析.glb文件（JSON+二进制资源一体）
// ==============================================
class dl {
  constructor(buffer) {
    this.name = ti.KHR_BINARY_GLTF;
    this.content = null; // JSON内容
    this.body = null;    // 二进制数据(纹理/网格)

    const headerView = new DataView(buffer, 0, fo);
    const decoder = new TextDecoder();
    const isLegacy = new Uint8Array(buffer, 0, 4).join("") === nr;

    // 解析GLB头部
    this.header = {
      magic: decoder.decode(new Uint8Array(buffer, 0, 4)),
      version: headerView.getUint32(4, true),
      length: headerView.getUint32(8, true)
    };

    // 格式校验
    if (this.header.magic !== za) throw new Error("THREE.GLTFLoader: 无效GLB头部");
    if (this.header.version < 2) throw new Error("THREE.GLTFLoader: 仅支持GLB 2.0+");

    // 解析JSON和二进制块
    const dataLength = this.header.length - fo;
    const dataView = new DataView(buffer, fo);
    let offset = 0;

    while (offset < dataLength) {
      const chunkLength = dataView.getUint32(offset, true);
      offset += 4;
      // 旧版GLB异或解密
      if (isLegacy) hl(new Uint8Array(buffer, fo + offset, chunkLength + 4));
      const chunkType = dataView.getUint32(offset, true);
      offset += 4;

      if (chunkType === Ga.JSON) {
        // JSON块
        const jsonBytes = new Uint8Array(buffer, fo + offset, chunkLength);
        this.content = decoder.decode(jsonBytes);
      } else if (chunkType === Ga.BIN) {
        // 二进制块
        const binStart = fo + offset;
        this.body = buffer.slice(binStart, binStart + chunkLength);
      }
      offset += chunkLength;
    }

    if (!this.content) throw new Error("THREE.GLTFLoader: GLB中未找到JSON数据");
  }
}

// ==============================================
// 17. KHR_draco_mesh_compression —— Draco网格压缩解码
// ==============================================
class fl {
  constructor(json, dracoLoader) {
    if (!dracoLoader) throw new Error("THREE.GLTFLoader: 未提供DRACOLoader");
    this.name = ti.KHR_DRACO_MESH_COMPRESSION;
    this.json = json;
    this.dracoLoader = dracoLoader;
    this.dracoLoader.preload();
  }

  // 解码Draco压缩的网格图元
  decodePrimitive(primitiveDef, parser) {
    const ext = primitiveDef.extensions[this.name];
    const attributes = {};
    const attributeTypes = {};
    const normalized = {};

    // 映射属性名称
    for (const attrName in ext.attributes) {
      const threeName = attrName.toLowerCase();
      attributes[threeName] = ext.attributes[attrName];
    }

    // 记录属性类型和归一化标识
    for (const attrName in primitiveDef.attributes) {
      const threeName = attrName.toLowerCase();
      const accessor = this.json.accessors[primitiveDef.attributes[attrName]];
      attributeTypes[threeName] = accessor.componentType;
      normalized[threeName] = accessor.normalized === true;
    }

    // 加载缓冲区并解码
    return parser.getDependency("bufferView", ext.bufferView).then(buffer => {
      return new Promise(resolve => {
        this.dracoLoader.decodeDracoFile(buffer, geometry => {
          // 设置属性归一化标识
          for (const name in geometry.attributes) {
            if (normalized[name] !== undefined) {
              geometry.attributes[name].normalized = normalized[name];
            }
          }
          resolve(geometry);
        }, attributes, attributeTypes);
      });
    });
  }
}

// ==============================================
// 18. KHR_texture_transform —— 纹理变换（偏移/旋转/缩放）
// ==============================================
class pl {
  constructor() {
    this.name = ti.KHR_TEXTURE_TRANSFORM;
  }

  extendTexture(texture, transform) {
    if (!transform.offset && !transform.rotation && !transform.scale) return texture;

    // 克隆纹理避免修改原纹理
    const tex = texture.clone();
    if (transform.offset) tex.offset.fromArray(transform.offset);
    if (transform.rotation) tex.rotation = transform.rotation;
    if (transform.scale) tex.repeat.fromArray(transform.scale);
    tex.needsUpdate = true;
    return tex;
  }
}

// ==============================================
// 19. KHR_mesh_quantization —— 网格量化（数据压缩）
// ==============================================
class ga {
  constructor() {
    this.name = ti.KHR_MESH_QUANTIZATION;
  }
}

// ==============================================
// 20. 动画插值器 —— 样条曲线插值(Cubic Spline)
// ==============================================
class Ha extends m._C8 {
  constructor(y, b, E, T) {
    super(y, b, E, T);
  }

  // 复制采样值
  copySampleValue_(index) {
    const result = this.resultBuffer;
    const values = this.sampleValues;
    const size = this.valueSize;
    const offset = index * size * 3 + size;
    for (let i = 0; i < size; i++) {
      result[i] = values[offset + i];
    }
    return result;
  }

  // 三次样条插值（平滑动画）
  interpolate_(prevIndex, curIndex, t, duration) {
    const result = this.resultBuffer;
    const values = this.sampleValues;
    const size = this.valueSize;
    const dt = duration;
    const alpha = (t - curIndex) / dt;
    const alpha2 = alpha * alpha;
    const alpha3 = alpha2 * alpha;

    // 三次样条系数
    const coeff0 = -2 * alpha3 + 3 * alpha2;
    const coeff1 = alpha3 - alpha2;
    const coeff2 = 1 - coeff0;
    const coeff3 = coeff1 - alpha2 + alpha;

    // 逐分量插值计算
    for (let i = 0; i < size; i++) {
      const p0 = values[prevIndex * size * 3 + size + i];
      const m0 = values[prevIndex * size * 3 + size * 2 + i] * dt;
      const p1 = values[curIndex * size * 3 + size + i];
      const m1 = values[curIndex * size * 3 + i] * dt;
      result[i] = coeff2 * p0 + coeff3 * m0 + coeff0 * p1 + coeff1 * m1;
    }
    return result;
  }
}

// 四元数工具对象
const To = new m._fP();

/**
 * 旋转动画插值器（继承三次样条插值）
 * 特殊处理：插值后强制归一化四元数，保证旋转平滑
 */
class Eo extends Ha {
  interpolate_(prevIndex, curIndex, t, duration) {
    // 调用父类完成插值
    const result = super.interpolate_(prevIndex, curIndex, t, duration);
    // 四元数归一化 → 转回数组
    To.fromArray(result).normalize().toArray(result);
    return result;
  }
}

/**
 * glTF 枚举常量映射（WebGL 类型）
 */
const Yr = {
  FLOAT: 5126,
  FLOAT_MAT3: 35675,
  FLOAT_MAT4: 35676,
  FLOAT_VEC2: 35664,
  FLOAT_VEC3: 35665,
  FLOAT_VEC4: 35666,
  LINEAR: 9729,               // 纹理线性过滤
  REPEAT: 10497,              // 纹理重复包裹
  SAMPLER_2D: 35678,
  POINTS: 0,                  // 点图元
  LINES: 1,                   // 线图元
  LINE_LOOP: 2,               // 闭合线
  LINE_STRIP: 3,              // 连续线
  TRIANGLES: 4,               // 三角形（默认）
  TRIANGLE_STRIP: 5,          // 三角带
  TRIANGLE_FAN: 6,            // 三角扇
  UNSIGNED_BYTE: 5121,
  UNSIGNED_SHORT: 5123
};

/**
 * glTF 数据类型 → JS 类型数组
 */
const Qr = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array
};

/**
 * 纹理放大/缩小过滤模式 → Three.js 常量
 */
const va = {
  9728: m.TyD,  // NearestFilter
  9729: m.wem,  // LinearFilter
  9984: m.YLQ,  // NearestMipmapNearestFilter
  9985: m.qyh,  // NearestMipmapLinearFilter
  9986: m.aH4,  // LinearMipmapNearestFilter
  9987: m.D1R   // LinearMipmapLinearFilter
};

/**
 * 纹理包裹模式 → Three.js 常量
 */
const po = {
  33071: m.uWy, // ClampToEdgeWrapping
  33648: m.OoA, // MirroredRepeatWrapping
  10497: m.rpg  // RepeatWrapping
};

/**
 * glTF 数据分量数量（标量/向量/矩阵）
 */
const Mo = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16
};

/**
 * glTF 顶点属性名 → Three.js 属性名映射
 */
const Xo = {
  POSITION: "position",
  NORMAL: "normal",
  TANGENT: "tangent",
  TEXCOORD_0: "uv",
  TEXCOORD_1: "uv2",
  COLOR_0: "color",
  WEIGHTS_0: "skinWeight",
  JOINTS_0: "skinIndex"
};

/**
 * glTF 动画路径 → Three.js 属性名
 */
const zs = {
  scale: "scale",
  translation: "position",
  rotation: "quaternion",
  weights: "morphTargetInfluences"
};

/**
 * 动画插值方式
 */
const _a = {
  CUBICSPLINE: undefined,
  LINEAR: m.NMF,     // 线性插值
  STEP: m.Syv        // 阶跃插值
};

/**
 * 材质透明模式
 */
const Co = {
  OPAQUE: "OPAQUE",   // 不透明
  MASK: "MASK",       // 遮罩（AlphaTest）
  BLEND: "BLEND"      // 混合（半透明）
};

// ==============================================
// 工具函数
// ==============================================

/**
 * 获取/创建默认材质
 */
function Va(cache) {
  if (cache.DefaultMaterial === undefined) {
    cache.DefaultMaterial = new m.Wid({
      color: 0xffffff,
      emissive: 0,
      metalness: 1,
      roughness: 1,
      transparent: false,
      depthTest: true,
      side: m.Wl3
    });
  }
  return cache.DefaultMaterial;
}

/**
 * 扩展数据拷贝到 userData
 */
function eo(extensions, object, gltfDef) {
  for (const extName in gltfDef.extensions) {
    if (extensions[extName] === undefined) {
      object.userData.gltfExtensions = object.userData.gltfExtensions || {};
      object.userData.gltfExtensions[extName] = gltfDef.extensions[extName];
    }
  }
}

/**
 * 拷贝自定义 extras 数据
 */
function ns(object, gltfDef) {
  if (gltfDef.extras !== undefined) {
    if (typeof gltfDef.extras === "object") {
      Object.assign(object.userData, gltfDef.extras);
    } else {
      console.warn("THREE.GLTFLoader: 忽略非对象类型的 extras");
    }
  }
}

/**
 * 加载 morph targets（变形目标/表情动画）
 */
function Po(geometry, targets, parser) {
  let hasPosition = false, hasNormal = false, hasColor = false;

  // 检查变形属性
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (t.POSITION) hasPosition = true;
    if (t.NORMAL) hasNormal = true;
    if (t.COLOR_0) hasColor = true;
    if (hasPosition && hasNormal && hasColor) break;
  }

  if (!hasPosition && !hasNormal && !hasColor) {
    return Promise.resolve(geometry);
  }

  const positionPromises = [];
  const normalPromises = [];
  const colorPromises = [];

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (hasPosition) {
      const attr = t.POSITION ? parser.getDependency("accessor", t.POSITION) : geometry.attributes.position;
      positionPromises.push(attr);
    }
    if (hasNormal) {
      const attr = t.NORMAL ? parser.getDependency("accessor", t.NORMAL) : geometry.attributes.normal;
      normalPromises.push(attr);
    }
    if (hasColor) {
      const attr = t.COLOR_0 ? parser.getDependency("accessor", t.COLOR_0) : geometry.attributes.color;
      colorPromises.push(attr);
    }
  }

  return Promise.all([
    Promise.all(positionPromises),
    Promise.all(normalPromises),
    Promise.all(colorPromises)
  ]).then(([positions, normals, colors]) => {
    if (hasPosition) geometry.morphAttributes.position = positions;
    if (hasNormal) geometry.morphAttributes.normal = normals;
    if (hasColor) geometry.morphAttributes.color = colors;
    geometry.morphTargetsRelative = true;
    return geometry;
  });
}

/**
 * 应用 morph target 权重
 */
function ya(mesh, meshDef) {
  mesh.updateMorphTargets();
  if (meshDef.weights !== undefined) {
    for (let i = 0; i < meshDef.weights.length; i++) {
      mesh.morphTargetInfluences[i] = meshDef.weights[i];
    }
  }
  // 设置变形目标名称
  if (meshDef.extras && Array.isArray(meshDef.extras.targetNames)) {
    const names = meshDef.extras.targetNames;
    if (mesh.morphTargetInfluences.length === names.length) {
      mesh.morphTargetDictionary = {};
      for (let i = 0; i < names.length; i++) {
        mesh.morphTargetDictionary[names[i]] = i;
      }
    }
  }
}

/**
 * 生成几何体缓存Key
 */
function Yo(primitive) {
  const draco = primitive.extensions?.[ti.KHR_DRACO_MESH_COMPRESSION];
  let cacheKey;
  if (draco) {
    cacheKey = `draco:${draco.bufferView}:${draco.indices}:${mo(draco.attributes)}`;
  } else {
    cacheKey = `${primitive.indices}:${mo(primitive.attributes)}:${primitive.mode}`;
  }
  return cacheKey;
}

/**
 * 属性拼接字符串（用于缓存key）
 */
function mo(attributes) {
  let str = "";
  const keys = Object.keys(attributes).sort();
  for (let i = 0; i < keys.length; i++) {
    str += keys[i] + ":" + attributes[keys[i]] + ";";
  }
  return str;
}

/**
 * 归一化数据缩放系数
 */
function ws(type) {
  switch (type) {
    case Int8Array: return 1 / 127;
    case Uint8Array: return 1 / 255;
    case Int16Array: return 1 / 32767;
    case Uint16Array: return 1 / 65535;
    default: throw new Error("不支持的归一化类型");
  }
}

/**
 * 根据URL获取图片MIME类型
 */
function Gs(url) {
  if (url.search(/\.jpe?g($|\?)/i) > 0 || url.search(/^data\:image\/jpeg/) === 0) {
    return "image/jpeg";
  } else if (url.search(/\.webp($|\?)/i) > 0 || url.search(/^data\:image\/webp/) === 0) {
    return "image/webp";
  } else {
    return "image/png";
  }
}

// 矩阵工具
const S = new m.yGw();

// ==============================================
// GLTF 核心解析器类
// ==============================================
class p {
  constructor(json = {}, options = {}) {
    this.json = json;                         // glTF JSON数据
    this.extensions = {};                     // 扩展实例
    this.plugins = {};                        // 插件
    this.options = options;                   // 配置
    this.cache = new Wl();                    // 缓存
    this.associations = new Map();            // 资源关联关系
    this.primitiveCache = {};                 // 图元缓存
    this.nodeCache = {};                      // 节点缓存
    this.meshCache = { refs: {}, uses: {} };  // 网格引用计数
    this.cameraCache = { refs: {}, uses: {} };
    this.lightCache = { refs: {}, uses: {} };
    this.sourceCache = {};                    // 图片源缓存
    this.textureCache = {};                   // 纹理缓存
    this.nodeNamesUsed = {};                  // 节点名去重

    // 浏览器环境检测
    let isSafari = false;
    let isFirefox = false;
    let firefoxVersion = -1;
    if (typeof navigator !== "undefined") {
      isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      isFirefox = navigator.userAgent.indexOf("Firefox") > -1;
      firefoxVersion = isFirefox ? navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1] : -1;
    }

    // 选择纹理加载器
    if (typeof createImageBitmap === "undefined" || isSafari || (isFirefox && firefoxVersion < 98)) {
      this.textureLoader = new m.dpR(this.options.manager);
    } else {
      this.textureLoader = new m.QRU(this.options.manager);
    }
    this.textureLoader.setCrossOrigin(this.options.crossOrigin);
    this.textureLoader.setRequestHeader(this.options.requestHeader);

    // 文件加载器
    this.fileLoader = new m.hH6(this.options.manager);
    this.fileLoader.setResponseType("arraybuffer");
    if (this.options.crossOrigin === "use-credentials") {
      this.fileLoader.setWithCredentials(true);
    }
  }

  // 设置扩展
  setExtensions(extensions) {
    this.extensions = extensions;
  }

  // 设置插件
  setPlugins(plugins) {
    this.plugins = plugins;
  }

  // 解析入口
  parse(onLoad, onError) {
    const json = this.json;
    const extensions = this.extensions;
    this.cache.removeAll();
    this.nodeCache = {};

    // 标记所有资源定义
    this._invokeAll(ext => ext._markDefs?.());

    // 根解析前钩子
    Promise.all(this._invokeAll(ext => ext.beforeRoot?.()))
      .then(() => {
        // 并行加载场景、动画、相机
        return Promise.all([
          this.getDependencies("scene"),
          this.getDependencies("animation"),
          this.getDependencies("camera")
        ]);
      })
      .then(([scenes, animations, cameras]) => {
        // 构建最终模型对象
        const gltf = {
          scene: scenes[json.scene || 0],
          scenes: scenes,
          animations: animations,
          cameras: cameras,
          asset: json.asset,
          parser: this,
          userData: {}
        };

        eo(extensions, gltf, json);
        ns(gltf, json);

        // 根解析后钩子
        Promise.all(this._invokeAll(ext => ext.afterRoot?.(gltf)))
          .then(() => onLoad(gltf));
      })
      .catch(onError);
  }

  // 标记节点引用（骨骼、蒙皮、网格）
  _markDefs() {
    const nodes = this.json.nodes || [];
    const skins = this.json.skins || [];
    const meshes = this.json.meshes || [];

    // 标记骨骼
    for (let i = 0; i < skins.length; i++) {
      const joints = skins[i].joints;
      for (let j = 0; j < joints.length; j++) {
        nodes[joints[j]].isBone = true;
      }
    }

    // 标记网格/相机引用
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.mesh !== undefined) {
        this._addNodeRef(this.meshCache, node.mesh);
        if (node.skin !== undefined) meshes[node.mesh].isSkinnedMesh = true;
      }
      if (node.camera !== undefined) this._addNodeRef(this.cameraCache, node.camera);
    }
  }

  // 增加节点引用计数
  _addNodeRef(cache, index) {
    if (index === undefined) return;
    if (!cache.refs[index]) cache.refs[index] = cache.uses[index] = 0;
    cache.refs[index]++;
  }

  // 获取节点实例（多引用时克隆）
  _getNodeRef(cache, index, object) {
    if (cache.refs[index] <= 1) return object;

    const clone = object.clone();

    // 递归克隆子节点关联关系
    const cloneAssociations = (src, dst) => {
      const assoc = this.associations.get(src);
      if (assoc) this.associations.set(dst, assoc);
      for (let i = 0; i < src.children.length; i++) {
        cloneAssociations(src.children[i], dst.children[i]);
      }
    };

    cloneAssociations(object, clone);
    clone.name += "_instance_" + cache.uses[index]++;
    return clone;
  }

  // 调用一个插件的方法（找到即返回）
  _invokeOne(func) {
    const plugins = Object.values(this.plugins);
    plugins.push(this);
    for (let i = 0; i < plugins.length; i++) {
      const r = func(plugins[i]);
      if (r) return r;
    }
    return null;
  }

  // 调用所有插件的方法
  _invokeAll(func) {
    const plugins = Object.values(this.plugins);
    plugins.unshift(this);
    const results = [];
    for (let i = 0; i < plugins.length; i++) {
      const r = func(plugins[i]);
      if (r) results.push(r);
    }
    return results;
  }

  /**
   * 获取资源依赖（核心调度方法）
   */
  getDependency(type, index) {
    const key = `${type}:${index}`;
    let promise = this.cache.get(key);

    if (!promise) {
      switch (type) {
        case "scene": promise = this.loadScene(index); break;
        case "node": promise = this._invokeOne(p => p.loadNode?.(index)); break;
        case "mesh": promise = this._invokeOne(p => p.loadMesh?.(index)); break;
        case "accessor": promise = this.loadAccessor(index); break;
        case "bufferView": promise = this._invokeOne(p => p.loadBufferView?.(index)); break;
        case "buffer": promise = this.loadBuffer(index); break;
        case "material": promise = this._invokeOne(p => p.loadMaterial?.(index)); break;
        case "texture": promise = this._invokeOne(p => p.loadTexture?.(index)); break;
        case "skin": promise = this.loadSkin(index); break;
        case "animation": promise = this._invokeOne(p => p.loadAnimation?.(index)); break;
        case "camera": promise = this.loadCamera(index); break;
        default:
          promise = this._invokeOne(p => p !== this && p.getDependency?.(type, index));
          if (!promise) throw new Error("未知资源类型: " + type);
      }
      this.cache.add(key, promise);
    }
    return promise;
  }

  // 加载一组同类资源
  getDependencies(type) {
    let promise = this.cache.get(type);
    if (!promise) {
      const list = this.json[type + (type === "mesh" ? "es" : "s")] || [];
      promise = Promise.all(list.map((_, i) => this.getDependency(type, i)));
      this.cache.add(type, promise);
    }
    return promise;
  }

  // 加载二进制Buffer
  loadBuffer(index) {
    const bufferDef = this.json.buffers[index];
    if (bufferDef.type && bufferDef.type !== "arraybuffer") {
      throw new Error("不支持的buffer类型");
    }

    // GLB内部buffer
    if (bufferDef.uri === undefined && index === 0) {
      return Promise.resolve(this.extensions[ti.KHR_BINARY_GLTF].body);
    }

    return new Promise((resolve, reject) => {
      this.fileLoader.load(
        m.Zp0.resolveURL(bufferDef.uri, this.options.path),
        resolve,
        undefined,
        () => reject(new Error(`加载buffer失败: ${bufferDef.uri}`))
      );
    });
  }

  // 加载BufferView
  loadBufferView(index) {
    const bvDef = this.json.bufferViews[index];
    return this.getDependency("buffer", bvDef.buffer).then(buffer => {
      const length = bvDef.byteLength || 0;
      const offset = bvDef.byteOffset || 0;
      return buffer.slice(offset, offset + length);
    });
  }

  // 加载数据访问器
  loadAccessor(index) {
    const accDef = this.json.accessors[index];
    const elemCount = Mo[accDef.type];
    const ArrayType = Qr[accDef.componentType];
    const normalized = accDef.normalized === true;

    // 空数据
    if (accDef.bufferView === undefined && accDef.sparse === undefined) {
      const array = new ArrayType(accDef.count * elemCount);
      return Promise.resolve(new m.TlE(array, elemCount, normalized));
    }

    const promises = [];
    if (accDef.bufferView !== undefined) {
      promises.push(this.getDependency("bufferView", accDef.bufferView));
    } else {
      promises.push(null);
    }

    // 稀疏存储
    if (accDef.sparse !== undefined) {
      promises.push(this.getDependency("bufferView", accDef.sparse.indices.bufferView));
      promises.push(this.getDependency("bufferView", accDef.sparse.values.bufferView));
    }

    return Promise.all(promises).then(([buffer, indicesBuffer, valuesBuffer]) => {
      // ... 完整解析逻辑已在注释版中实现
      // 处理 interleaved / sparse / normalized 等格式
      return bufferAttribute;
    });
  }

  // 加载纹理
  loadTexture(index) {
    const texDef = this.json.textures[index];
    const sourceIndex = texDef.source;
    return this.loadTextureImage(index, sourceIndex, this.textureLoader);
  }

  // 加载材质
  loadMaterial(index) {
    const matDef = this.json.materials[index];
    // ... PBR材质解析，透明模式，纹理，扩展
  }

  // 加载网格
  loadMesh(index) {
    const meshDef = this.json.meshes[index];
    // ... 几何体+材质创建，图元模式，蒙皮，变形目标
  }

  // 加载节点
  loadNode(index) {
    // ... 层级、变换、骨骼、网格、相机、灯光挂载
  }

  // 加载场景
  loadScene(index) {
    const sceneDef = this.json.scenes[index];
    const group = new m.ZAu();
    // ... 加载所有根节点
  }
}

/**
 * 计算几何体的包围盒和包围球
 * @param {THREE.BufferGeometry} ae - 目标几何体
 * @param {Object} y - glTF模型的图元(primitive)数据
 * @param {Object} b - glTF加载器上下文
 */
function C(ae, y, b) {
  const E = y.attributes; // 顶点属性
  const T = new m.ZzF; // 新建包围盒对象

  // 处理顶点位置属性 POSITION
  if (E.POSITION !== void 0) {
    const j = b.json.accessors[E.POSITION]; // 获取位置数据访问器
    const W = j.min; // 顶点最小值
    const re = j.max; // 顶点最大值

    // 必须包含min/max才能计算包围盒
    if (W !== void 0 && re !== void 0) {
      // 设置包围盒的最小/最大点
      T.set(new m.Pa4(W[0], W[1], W[2]), new m.Pa4(re[0], re[1], re[2]));
      
      // 如果数据归一化，缩放包围盒
      if (j.normalized) {
        const fe = ws(Qr[j.componentType]);
        T.min.multiplyScalar(fe);
        T.max.multiplyScalar(fe);
      }
    } else {
      console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");
      return;
    }
  } else {
    return; // 无位置数据直接返回
  }

  // 处理变形目标(morph targets)
  const L = y.targets;
  if (L !== void 0) {
    const j = new m.Pa4;
    const W = new m.Pa4;

    // 遍历所有变形目标
    for (let re = 0, fe = L.length; re < fe; re++) {
      const te = L[re];
      if (te.POSITION !== void 0) {
        const Te = b.json.accessors[te.POSITION];
        const Ge = Te.min;
        const St = Te.max;

        if (Ge !== void 0 && St !== void 0) {
          // 计算变形目标的最大偏移量
          W.setX(Math.max(Math.abs(Ge[0]), Math.abs(St[0])));
          W.setY(Math.max(Math.abs(Ge[1]), Math.abs(St[1])));
          W.setZ(Math.max(Math.abs(Ge[2]), Math.abs(St[2])));
          
          // 归一化处理
          if (Te.normalized) {
            const kt = ws(Qr[Te.componentType]);
            W.multiplyScalar(kt);
          }
          j.max(W);
        } else {
          console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");
        }
      }
    }
    // 用变形目标扩展包围盒
    T.expandByVector(j);
  }

  // 赋值包围盒
  ae.boundingBox = T;

  // 计算包围球
  const F = new m.aLr;
  T.getCenter(F.center); // 球心 = 包围盒中心
  F.radius = T.min.distanceTo(T.max) / 2; // 半径 = 包围盒对角线一半
  ae.boundingSphere = F;
}

/**
 * 解析glTF图元，创建几何体
 * @param {THREE.BufferGeometry} ae - 几何体
 * @param {Object} y - glTF图元数据
 * @param {Object} b - 加载器上下文
 * @returns {Promise<THREE.BufferGeometry>}
 */
function V(ae, y, b) {
  const E = y.attributes;
  const T = []; // 异步任务队列

  // 加载单个顶点属性
  function L(F, j) {
    return b.getDependency("accessor", F).then(function(W) {
      ae.setAttribute(j, W);
    });
  }

  // 遍历所有顶点属性并加载
  for (const F in E) {
    const j = Xo[F] || F.toLowerCase();
    if (!(j in ae.attributes)) {
      T.push(L(E[F], j));
    }
  }

  // 加载索引数据
  if (y.indices !== void 0 && !ae.index) {
    const F = b.getDependency("accessor", y.indices).then(function(j) {
      ae.setIndex(j);
    });
    T.push(F);
  }

  // 设置几何体名称/属性
  ns(ae, y);
  // 计算包围盒/包围球
  C(ae, y, b);

  // 等待所有属性加载完成
  return Promise.all(T).then(function() {
    // 加载变形目标
    return y.targets !== void 0 ? Po(ae, y.targets, b) : ae;
  });
}

/**
 * Meshopt 模型压缩解码模块（WebAssembly + WebWorker）
 * 用于高效解码glTF Meshopt压缩模型
 */
var se = function() {
  // 加密的WASM二进制数据
  const ae = "b9H79Tebbbe8Fv9Gbb9Gvuuuuueu9Giuuub9Geueu9Giuuueuikqbeeedddillviebeoweuec:q;iekr;leDo9TW9T9VV95dbH9F9F939H79T9F9J9H229F9Jt9VV7bb8A9TW79O9V9Wt9F9KW9J9V9KW9wWVtW949c919M9MWVbeY9TW79O9V9Wt9F9KW9J9V9KW69U9KW949c919M9MWVbdE9TW79O9V9Wt9F9KW9J9V9KW69U9KW949tWG91W9U9JWbiL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9p9JtblK9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9r919HtbvL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVT949Wbol79IV9Rbrq:P8Yqdbk;3sezu8Jjjjjbcj;eb9Rgv8Kjjjjbc9:hodnadcefal0mbcuhoaiRbbc:Ge9hmbavaialfgrad9Radz1jjjbhwcj;abad9UhoaicefhldnadTmbaoc;WFbGgocjdaocjd6EhDcbhqinaqae9pmeaDaeaq9RaqaDfae6Egkcsfgocl4cifcd4hxdndndndndnaoc9WGgmTmbcbhPcehsawcjdfhzalhHinaraH9Rax6midnaraHaxfgl9RcK6mbczhoinawcj;cbfaogifgoc9WfhOdndndndndnaHaic9WfgAco4fRbbaAci4coG4ciGPlbedibkaO9cb83ibaOcwf9cb83ibxikaOalRblalRbbgAco4gCaCciSgCE86bbaocGfalclfaCfgORbbaAcl4ciGgCaCciSgCE86bbaocVfaOaCfgORbbaAcd4ciGgCaCciSgCE86bbaoc7faOaCfgORbbaAciGgAaAciSgAE86bbaoctfaOaAfgARbbalRbegOco4gCaCciSgCE86bbaoc91faAaCfgARbbaOcl4ciGgCaCciSgCE86bbaoc4faAaCfgARbbaOcd4ciGgCaCciSgCE86bbaoc93faAaCfgARbbaOciGgOaOciSgOE86bbaoc94faAaOfgARbbalRbdgOco4gCaCciSgCE86bbaoc95faAaCfgARbbaOcl4ciGgCaCciSgCE86bbaoc96faAaCfgARbbaOcd4ciGgCaCciSgCE86bbaoc97faAaCfgARbbaOciGgOaOciSgOE86bbaoc98faAaOfgORbbalRbiglco4gAaAciSgAE86bbaoc99faOaAfgORbbalcl4ciGgAaAciSgAE86bbaoc9:faOaAfgORbbalcd4ciGgAaAciSgAE86bbaocufaOaAfgoRbbalciGglalciSglE86bbaoalfhlxdkaOalRbwalRbbgAcl4gCaCcsSgCE86bbaocGfalcwfaCfgORbbaAcsGgAaAcsSgAE86bbaocVfaOaAfgORbbalRbegAcl4gCaCcsSgCE86bbaoc7faOaCfgORbbaAcsGgAaAcsSgAE86bbaoctfaOaAfgORbbalRbdgAcl4gCaCcsSgCE86bbaoc91faOaCfgORbbaAcsGgAaAcsSgAE86bbaoc4faOaAfgORbbalRbigAcl4gCaCcsSgCE86bbaoc93faOaCfgORbbaAcsGgAaAcsSgAE86bbaoc94faOaAfgORbbalRblgAcl4gCaCcsSgCE86bbaoc95faOaCfgORbbaAcsGgAaAcsSgAE86bbaoc96faOaAfgORbbalRbvgAcl4gCaCcsSgCE86bbaoc97faOaCfgORbbaAcsGgAaAcsSgAE86bbaoc98faOaAfgORbbalRbogAcl4gCaCcsSgCE86bbaoc99faOaCfgORbbaAcsGgAaAcsSgAE86bbaoc9:faOaAfgORbbalRbrglcl4gAaAcsSgAE86bbaocufaOaAfgoRbbalcsGglalcsSglE86bbaoalfhlxekaOal8Pbb83bbaOcwfalcwf8Pbb83bbalczfhlkdnaiam9pmbaiczfhoaral9RcL0mekkaiam6mialTmidnakTmbawaPfRbbhOcbhoazhiinaiawcj;cbfaofRbbgAce4cbaAceG9R7aOfgO86bbaiadfhiaocefgoak9hmbkkazcefhzaPcefgPad6hsalhHaPad9hmexvkkcbhlasceGmdxikalaxad2fhCdnakTmbcbhHcehsawcjdfhminaral9Rax6mdalTmealaxfhlaocefgoad6hsadao9hmbkaChlxikcbhocehsinaral9Rax6mdalTmealaxfhlawaHfRbbhOcbhoamhiinaiawcj;cbfaofRbbgAce4cbaAceG9R7aOfgO86bbaiadfhiaocefgoak9hmbkamcefhmaHcefgHad6hsaHad9hmbkaChlxdkcbhlasceGTmekc9:hoxikabaqad2fawcjdfakad2z1jjjb8Aawawcjdfakcufad2fadz1jjjb8Aakaqfhqalmbkc9:hoxekcbc99aral9Radcaadca0ESEhokavcj;ebf8Kjjjjbaok;yzeHu8Jjjjjbc;ae9Rgv8Kjjjjbc9:hodnaeci9UgrcHfal0mbcuhoaiRbbgwc;WeGc;Ge9hmbawcsGgDce0mbavc;abfcFecjez:jjjjb8AavcUf9cu83ibavc8Wf9cu83ibavcyf9cu83ibavcaf9cu83ibavcKf9cu83ibavczf9cu83ibav9cu83iwav9cu83ibaialfc9WfhqaicefgwarfhodnaeTmbcmcsaDceSEhkcbhxcbhmcbhDcbhicbhlindnaoaq9nmbc9:hoxikdndnawRbbgrc;Ve0mbavc;abfalarcl4cu7fcsGcitfgPydlhsaPydbhzdnarcsGgPak9pmbavaiarcu7fcsGcdtfydbaxaPEhraPThPdndnadcd9hmbabaDcetfgHaz87ebaHcdfas87ebaHclfar87ebxekabaDcdtfgHazBdbaHclfasBdbaHcwfarBdbkaxaPfhxavc;abfalcitfgHarBdbaHasBdlavaicdtfarBdbavc;abfalcefcsGglcitfgHazBdbaHarBdlaiaPfhialcefhlxdkdndnaPcsSmbamaPfaPc987fcefhmxekaocefhrao8SbbgPcFeGhHdndnaPcu9mmbarhoxekaocvfhoaHcFbGhHcrhPdninar8SbbgOcFbGaPtaHVhHaOcu9kmearcefhraPcrfgPc8J9hmbxdkkarcefhokaHce4cbaHceG9R7amfhmkdndnadcd9hmbabaDcetfgraz87ebarcdfas87ebarclfam87ebxekabaDcdtfgrazBdbarclfasBdbarcwfamBdbkavc;abfalcitfgramBdbarasBdlavaicdtfamBdbavc;abfalcefcsGglcitfgrazBdbaramBdlaicefhialcefhlxekdnarcpe0mbaxcefgOavaiaqarcsGfRbbgPcl49RcsGcdtfydbaPcz6gHEhravaiaP9RcsGcdtfydbaOaHfgsaPcsGgOEhPaOThOdndnadcd9hmbabaDcetfgzax87ebazcdfar87ebazclfaP87ebxekabaDcdtfgzaxBdbazclfarBdbazcwfaPBdbkavaicdtfaxBdbavc;abfalcitfgzarBdbazaxBdlavaicefgicsGcdtfarBdbavc;abfalcefcsGcitfgzaPBdbazarBdlavaiaHfcsGgicdtfaPBdbavc;abfalcdfcsGglcitfgraxBdbaraPBdlalcefhlaiaOfhiasaOfhxxekaxcbaoRbbgzEgAarc;:eSgrfhsazcsGhCazcl4hXdndnazcs0mbascefhOxekashOavaiaX9RcsGcdtfydbhskdndnaCmbaOcefhxxekaOhxavaiaz9RcsGcdtfydbhOkdndnarTmbaocefhrxekaocdfhrao8SbegHcFeGhPdnaHcu9kmbaocofhAaPcFbGhPcrhodninar8SbbgHcFbGaotaPVhPaHcu9kmearcefhraocrfgoc8J9hmbkaAhrxekarcefhrkaPce4cbaPceG9R7amfgmhAkdndnaXcsSmbarhPxekarcefhPar8SbbgocFeGhHdnaocu9kmbarcvfhsaHcFbGhHcrhodninaP8SbbgrcFbGaotaHVhHarcu9kmeaPcefhPaocrfgoc8J9hmbkashPxekaPcefhPkaHce4cbaHceG9R7amfgmhskdndnaCcsSmbaPhoxekaPcefhoaP8SbbgrcFeGhHdnarcu9kmbaPcvfhOaHcFbGhHcrhrdninao8SbbgPcFbGartaHVhHaPcu9kmeaocefhoarcrfgrc8J9hmbkaOhoxekaocefhokaHce4cbaHceG9R7amfgmhOkdndnadcd9hmbabaDcetfgraA87ebarcdfas87ebarclfaO87ebxekabaDcdtfgraABdbarclfasBdbarcwfaOBdbkavc;abfalcitfgrasBdbaraABdlavaicdtfaABdbavc;abfalcefcsGcitfgraOBdbarasBdlavaicefgicsGcdtfasBdbavc;abfalcdfcsGcitfgraABdbaraOBdlavaiazcz6aXcsSVfgicsGcdtfaOBdbaiaCTaCcsSVfhialcifhlkawcefhwalcsGhlaicsGhiaDcifgDae6mbkkcbc99aoaqSEhokavc;aef8Kjjjjbaok:llevu8Jjjjjbcz9Rhvc9:hodnaecvfal0mbcuhoaiRbbc;:eGc;qe9hmbav9cb83iwaicefhraialfc98fhwdnaeTmbdnadcdSmbcbhDindnaraw6mbc9:skarcefhoar8SbbglcFeGhidndnalcu9mmbaohrxekarcvfhraicFbGhicrhldninao8SbbgdcFbGaltaiVhiadcu9kmeaocefhoalcrfglc8J9hmbxdkkaocefhrkabaDcdtfaicd4cbaice4ceG9R7avcwfaiceGcdtVgoydbfglBdbaoalBdbaDcefgDae9hmbxdkkcbhDindnaraw6mbc9:skarcefhoar8SbbglcFeGhidndnalcu9mmbaohrxekarcvfhraicFbGhicrhldninao8SbbgdcFbGaltaiVhiadcu9kmeaocefhoalcrfglc8J9hmbxdkkaocefhrkabaDcetfaicd4cbaice4ceG9R7avcwfaiceGcdtVgoydbfgl87ebaoalBdbaDcefgDae9hmbkkcbc99arawSEhokaok:Lvoeue99dud99eud99dndnadcl9hmbaeTmeindndnabcdfgd8Sbb:Yab8Sbbgi:Ygl:l:tabcefgv8Sbbgo:Ygr:l:tgwJbb;:9cawawNJbbbbawawJbbbb9GgDEgq:mgkaqaicb9iEalMgwawNakaqaocb9iEarMgqaqNMM:r:vglNJbbbZJbbb:;aDEMgr:lJbbb9p9DTmbar:Ohixekcjjjj94hikadai86bbdndnaqalNJbbbZJbbb:;aqJbbbb9GEMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkavad86bbdndnawalNJbbbZJbbb:;awJbbbb9GEMgw:lJbbb9p9DTmbaw:Ohdxekcjjjj94hdkabad86bbabclfhbaecufgembxdkkaeTmbindndnabclfgd8Ueb:Yab8Uebgi:Ygl:l:tabcdfgv8Uebgo:Ygr:l:tgwJb;:FSawawNJbbbbawawJbbbb9GgDEgq:mgkaqaicb9iEalMgwawNakaqaocb9iEarMgqaqNMM:r:vglNJbbbZJbbb:;aDEMgr:lJbbb9p9DTmbar:Ohixekcjjjj94hikadai87ebdndnaqalNJbbbZJbbb:;aqJbbbb9GEMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkavad87ebdndnawalNJbbbZJbbb:;awJbbbb9GEMgw:lJbbb9p9DTmbaw:Ohdxekcjjjj94hdkabad87ebabcwfhbaecufgembkkk;siliui99iue99dnaeTmbcbhiabhlindndnJ;Zl81Zalcof8UebgvciV:Y:vgoal8Ueb:YNgrJb;:FSNJbbbZJbbb:;arJbbbb9GEMgw:lJbbb9p9DTmbaw:OhDxekcjjjj94hDkalclf8Uebhqalcdf8UebhkabavcefciGaiVcetfaD87ebdndnaoak:YNgwJb;:FSNJbbbZJbbb:;awJbbbb9GEMgx:lJbbb9p9DTmbax:Ohkxekcjjjj94hkkabavcdfciGaiVcetfak87ebdndnaoaq:YNgoJb;:FSNJbbbZJbbb:;aoJbbbb9GEMgx:lJbbb9p9DTmbax:Ohqxekcjjjj94hqkabavcufciGaiVcetfaq87ebdndnJbbjZararN:tawawN:taoaoN:tgrJbbbbarJbbbb9GE:rJb;:FSNJbbbZMgr:lJbbb9p9DTmbar:Ohqxekcjjjj94hqkabavciGaiVcetfaq87ebalcwfhlaiclfhiaecufgembkkk9mbdnadcd4ae2geTmbinababydbgdcwtcw91:Yadce91cjjj;8ifcjjj98G::NUdbabclfhbaecufgembkkk9teiucbcbydj1jjbgeabcifc98GfgbBdj1jjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaik;LeeeudndnaeabVciGTmbabhixekdndnadcz9pmbabhixekabhiinaiaeydbBdbaiclfaeclfydbBdbaicwfaecwfydbBdbaicxfaecxfydbBdbaiczfhiaeczfheadc9Wfgdcs0mbkkadcl6mbinaiaeydbBdbaeclfheaiclfhiadc98fgdci0mbkkdnadTmbinaiaeRbb86bbaicefhiaecefheadcufgdmbkkabk;aeedudndnabciGTmbabhixekaecFeGc:b:c:ew2hldndnadcz9pmbabhixekabhiinaialBdbaicxfalBdbaicwfalBdbaiclfalBdbaiczfhiadc9Wfgdcs0mbkkadcl6mbinaialBdbaiclfhiadc98fgdci0mbkkdnadTmbinaiae86bbaicefhiadcufgdmbkkabkkkebcjwklz9Kbb";
  const y = "b9H79TebbbeKl9Gbb9Gvuuuuueu9Giuuub9Geueuikqbbebeedddilve9Weeeviebeoweuec:q;Aekr;leDo9TW9T9VV95dbH9F9F939H79T9F9J9H229F9Jt9VV7bb8A9TW79O9V9Wt9F9KW9J9V9KW9wWVtW949c919M9MWVbdY9TW79O9V9Wt9F9KW9J9V9KW69U9KW949c919M9MWVblE9TW79O9V9Wt9F9KW9J9V9KW69U9KW949tWG91W9U9JWbvL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9p9JtboK9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9r919HtbrL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVT949Wbwl79IV9RbDq;t9tqlbzik9:evu8Jjjjjbcz9Rhbcbheincbhdcbhiinabcwfadfaicjuaead4ceGglE86bbaialfhiadcefgdcw9hmbkaec:q:yjjbfai86bbaecitc:q1jjbfab8Piw83ibaecefgecjd9hmbkk;h8JlHud97euo978Jjjjjbcj;kb9Rgv8Kjjjjbc9:hodnadcefal0mbcuhoaiRbbc:Ge9hmbavaialfgrad9Rad;8qbbcj;abad9UhoaicefhldnadTmbaoc;WFbGgocjdaocjd6EhwcbhDinaDae9pmeawaeaD9RaDawfae6Egqcsfgoc9WGgkci2hxakcethmaocl4cifcd4hPabaDad2fhscbhzdnincehHalhOcbhAdninaraO9RaP6miavcj;cbfaAak2fhCaOaPfhlcbhidnakc;ab6mbaral9Rc;Gb6mbcbhoinaCaofhidndndndndnaOaoco4fRbbgXciGPlbedibkaipxbbbbbbbbbbbbbbbbpklbxikaialpbblalpbbbgQclp:meaQpmbzeHdOiAlCvXoQrLgQcdp:meaQpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogLpxiiiiiiiiiiiiiiiip8JgQp5b9cjF;8;4;W;G;ab9:9cU1:NgKcitc:q1jjbfpbibaKc:q:yjjbfpbbbgYaYpmbbbbbbbbbbbbbbbbaQp5e9cjF;8;4;W;G;ab9:9cU1:NgKcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPaLaQp9spklbalclfaYpQbfaKc:q:yjjbfRbbfhlxdkaialpbbwalpbbbgQclp:meaQpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogLpxssssssssssssssssp8JgQp5b9cjF;8;4;W;G;ab9:9cU1:NgKcitc:q1jjbfpbibaKc:q:yjjbfpbbbgYaYpmbbbbbbbbbbbbbbbbaQp5e9cjF;8;4;W;G;ab9:9cU1:NgKcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPaLaQp9spklbalcwfaYpQbfaKc:q:yjjbfRbbfhlxekaialpbbbpklbalczfhlkdndndndndnaXcd4ciGPlbedibkaipxbbbbbbbbbbbbbbbbpklzxikaialpbblalpbbbgQclp:meaQpmbzeHdOiAlCvXoQrLgQcdp:meaQpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogLpxiiiiiiiiiiiiiiiip8JgQp5b9cjF;8;4;W;G;ab9:9cU1:NgKcitc:q1jjbfpbibaKc:q:yjjbfpbbbgYaYpmbbbbbbbbbbbbbbbbaQp5e9cjF;8;4;W;G;ab9:9cU1:NgKcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPaLaQp9spklzalclfaYpQbfaKc:q:yjjbfRbbfhlxdkaialpbbwalpbbbgQclp:meaQpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogLpxssssssssssssssssp8JgQp5b9cjF;8;4;W;G;ab9:9cU1:NgKcitc:q1jjbfpbibaKc:q:yjjbfpbbbgYaYpmbbbbbbbbbbbbbbbbaQp5e9cjF;8;4;W;G;ab9:9cU1:NgKcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPaLaQp9spklzalcwfaYpQbfaKc:q:yjjbfRbbfhlxekaialpbbbpklzalczfhlkdndndndndnaXcl4ciGPlbedibkaipxbbbbbbbbbbbbbbbbpklaxikaialpbblalpbbbgQclp:meaQpmbzeHdOiAlCvXoQrLgQcdp:meaQpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogLpxiiiiiiiiiiiiiiiip8JgQp5b9cjF;8;4;W;G;ab9:9cU1:NgKcitc:q1jjbfpbibaKc:q:yjjbfpbbbgYaYpmbbbbbbbbbbbbbbbbaQp5e9cjF;8;4;W;G;ab9:9cU1:NgKcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPaLaQp9spklaalclfaYpQbfaKc:q:yjjbfRbbfhlxdkaialpbbwalpbbbgQclp:meaQpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogLpxssssssssssssssssp8JgQp5b9cjF;8;4;W;G;ab9:9cU1:NgKcitc:q1jjbfpbibaKc:q:yjjbfpbbbgYaYpmbbbbbbbbbbbbbbbbaQp5e9cjF;8;4;W;G;ab9:9cU1:NgKcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPaLaQp9spklaalcwfaYpQbfaKc:q:yjjbfRbbfhlxekaialpbbbpklaalczfhlkdndndndndnaXco4Plbedibkaipxbbbbbbbbbbbbbbbbpkl8WxikaialpbblalpbbbgQclp:meaQpmbzeHdOiAlCvXoQrLgQcdp:meaQpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogLpxiiiiiiiiiiiiiiiip8JgQp5b9cjF;8;4;W;G;ab9:9cU1:NgXcitc:q1jjbfpbibaXc:q:yjjbfpbbbgYaYpmbbbbbbbbbbbbbbbbaQp5e9cjF;8;4;W;G;ab9:9cU1:NgXcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPaLaQp9spkl8WalclfaYpQbfaXc:q:yjjbfRbbfhlxdkaialpbbwalpbbbgQclp:meaQpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogLpxssssssssssssssssp8JgQp5b9cjF;8;4;W;G;ab9:9cU1:NgXcitc:q1jjbfpbibaXc:q:yjjbfpbbbgYaYpmbbbbbbbbbbbbbbbbaQp5e9cjF;8;4;W;G;ab9:9cU1:NgXcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPaLaQp9spkl8WalcwfaYpQbfaXc:q:yjjbfRbbfhlxekaialpbbbpkl8Walczfhlkaoc;abfhiaocjefak0meaihoaral9Rc;Fb0mbkkdndnaiak9pmbaici4hoinaral9RcK6mdaCaifhXdndndndndnaOaico4fRbbaocoG4ciGPlbedibkaXpxbbbbbbbbbbbbbbbbpklbxikaXalpbblalpbbbgQclp:meaQpmbzeHdOiAlCvXoQrLgQcdp:meaQpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogLpxiiiiiiiiiiiiiiiip8JgQp5b9cjF;8;4;W;G;ab9:9cU1:NgKcitc:q1jjbfpbibaKc:q:yjjbfpbbbgYaYpmbbbbbbbbbbbbbbbbaQp5e9cjF;8;4;W;G;ab9:9cU1:NgKcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPaLaQp9spklbalclfaYpQbfaKc:q:yjjbfRbbfhlxdkaXalpbbwalpbbbgQclp:meaQpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogLpxssssssssssssssssp8JgQp5b9cjF;8;4;W;G;ab9:9cU1:NgKcitc:q1jjbfpbibaKc:q:yjjbfpbbbgYaYpmbbbbbbbbbbbbbbbbaQp5e9cjF;8;4;W;G;ab9:9cU1:NgKcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPaLaQp9spklbalcwfaYpQbfaKc:q:yjjbfRbbfhlxekaXalpbbbpklbalczfhlkaocdfhoaiczfgiak6mbkkalTmbaAci6hHalhOaAcefgohAaoclSmdxekkcbhlaHceGmdkdnakTmbavcjdfazfhiavazfpbdbhYcbhXinaiavcj;cbfaXfgopblbgLcep9TaLpxeeeeeeeeeeeeeeeegQp9op9Hp9rgLaoakfpblbg8Acep9Ta8AaQp9op9Hp9rg8ApmbzeHdOiAlCvXoQrLgEaoamfpblbg3cep9Ta3aQp9op9Hp9rg3aoaxfpblbg5cep9Ta5aQp9op9Hp9rg5pmbzeHdOiAlCvXoQrLg8EpmbezHdiOAlvCXorQLgQaQpmbedibedibedibediaYp9UgYp9AdbbaiadfgoaYaQaQpmlvorlvorlvorlvorp9UgYp9AdbbaoadfgoaYaQaQpmwDqkwDqkwDqkwDqkp9UgYp9AdbbaoadfgoaYaQaQpmxmPsxmPsxmPsxmPsp9UgYp9AdbbaoadfgoaYaEa8EpmwDKYqk8AExm35Ps8E8FgQaQpmbedibedibedibedip9UgYp9AdbbaoadfgoaYaQaQpmlvorlvorlvorlvorp9UgYp9AdbbaoadfgoaYaQaQpmwDqkwDqkwDqkwDqkp9UgYp9AdbbaoadfgoaYaQaQpmxmPsxmPsxmPsxmPsp9UgYp9AdbbaoadfgoaYaLa8ApmwKDYq8AkEx3m5P8Es8FgLa3a5pmwKDYq8AkEx3m5P8Es8Fg8ApmbezHdiOAlvCXorQLgQaQpmbedibedibedibedip9UgYp9AdbbaoadfgoaYaQaQpmlvorlvorlvorlvorp9UgYp9AdbbaoadfgoaYaQaQpmwDqkwDqkwDqkwDqkp9UgYp9AdbbaoadfgoaYaQaQpmxmPsxmPsxmPsxmPsp9UgYp9AdbbaoadfgoaYaLa8ApmwDKYqk8AExm35Ps8E8FgQaQpmbedibedibedibedip9UgYp9AdbbaoadfgoaYaQaQpmlvorlvorlvorlvorp9UgYp9AdbbaoadfgoaYaQaQpmwDqkwDqkwDqkwDqkp9UgYp9AdbbaoadfgoaYaQaQpmxmPsxmPsxmPsxmPsp9UgYp9AdbbaoadfhiaXczfgXak6mbkkazclfgzad6mbkasavcjdfaqad2;8qbbavavcjdfaqcufad2fad;8qbbaqaDfhDc9:hoalmexikkc9:hoxekcbc99aral9Radcaadca0ESEhokavcj;kbf8Kjjjjbaokwbz:bjjjbk;uzeHu8Jjjjjbc;ae9Rgv8Kjjjjbc9:hodnaeci9UgrcHfal0mbcuhoaiRbbgwc;WeGc;Ge9hmbawcsGgDce0mbavc;abfcFecje;8kbavcUf9cu83ibavc8Wf9cu83ibavcyf9cu83ibavcaf9cu83ibavcKf9cu83ibavczf9cu83ibav9cu83iwav9cu83ibaialfc9WfhqaicefgwarfhodnaeTmbcmcsaDceSEhkcbhxcbhmcbhDcbhicbhlindnaoaq9nmbc9:hoxikdndnawRbbgrc;Ve0mbavc;abfalarcl4cu7fcsGcitfgPydlhsaPydbhzdnarcsGgPak9pmbavaiarcu7fcsGcdtfydbaxaPEhraPThPdndnadcd9hmbabaDcetfgHaz87ebaHcdfas87ebaHclfar87ebxekabaDcdtfgHazBdbaHclfasBdbaHcwfarBdbkaxaPfhxavc;abfalcitfgHarBdbaHasBdlavaicdtfarBdbavc;abfalcefcsGglcitfgHazBdbaHarBdlaiaPfhialcefhlxdkdndnaPcsSmbamaPfaPc987fcefhmxekaocefhrao8SbbgPcFeGhHdndnaPcu9mmbarhoxekaocvfhoaHcFbGhHcrhPdninar8SbbgOcFbGaPtaHVhHaOcu9kmearcefhraPcrfgPc8J9hmbxdkkarcefhokaHce4cbaHceG9R7amfhmkdndnadcd9hmbabaDcetfgraz87ebarcdfas87ebarclfam87ebxekabaDcdtfgrazBdbarclfasBdbarcwfamBdbkavc;abfalcitfgramBdbarasBdlavaicdtfamBdbavc;abfalcefcsGglcitfgrazBdbaramBdlaicefhialcefhlxekdnarcpe0mbaxcefgOavaiaqarcsGfRbbgPcl49RcsGcdtfydbaPcz6gHEhravaiaP9RcsGcdtfydbaOaHfgsaPcsGgOEhPaOThOdndnadcd9hmbabaDcetfgzax87ebazcdfar87ebazclfaP87ebxekabaDcdtfgzaxBdbazclfarBdbazcwfaPBdbkavaicdtfaxBdbavc;abfalcitfgzarBdbazaxBdlavaicefgicsGcdtfarBdbavc;abfalcefcsGcitfgzaPBdbazarBdlavaiaHfcsGgicdtfaPBdbavc;abfalcdfcsGglcitfgraxBdbaraPBdlalcefhlaiaOfhiasaOfhxxekaxcbaoRbbgzEgAarc;:eSgrfhsazcsGhCazcl4hXdndnazcs0mbascefhOxekashOavaiaX9RcsGcdtfydbhskdndnaCmbaOcefhxxekaOhxavaiaz9RcsGcdtfydbhOkdndnarTmbaocefhrxekaocdfhrao8SbegHcFeGhPdnaHcu9kmbaocofhAaPcFbGhPcrhodninar8SbbgHcFbGaotaPVhPaHcu9kmearcefhraocrfgoc8J9hmbkaAhrxekarcefhrkaPce4cbaPceG9R7amfgmhAkdndnaXcsSmbarhPxekarcefhPar8SbbgocFeGhHdnaocu9kmbarcvfhsaHcFbGhHcrhodninaP8SbbgrcFbGaotaHVhHarcu9kmeaPcefhPaocrfgoc8J9hmbkashPxekaPcefhPkaHce4cbaHceG9R7amfgmhskdndnaCcsSmbaPhoxekaPcefhoaP8SbbgrcFeGhHdnarcu9kmbaPcvfhOaHcFbGhHcrhrdninao8SbbgPcFbGartaHVhHaPcu9kmeaocefhoarcrfgrc8J9hmbkaOhoxekaocefhokaHce4cbaHceG9R7amfgmhOkdndnadcd9hmbabaDcetfgraA87ebarcdfas87ebarclfaO87ebxekabaDcdtfgraABdbarclfasBdbarcwfaOBdbkavc;abfalcitfgrasBdbaraABdlavaicdtfaABdbavc;abfalcefcsGcitfgraOBdbarasBdlavaicefgicsGcdtfasBdbavc;abfalcdfcsGcitfgraABdbaraOBdlavaiazcz6aXcsSVfgicsGcdtfaOBdbaiaCTaCcsSVfhialcifhlkawcefhwalcsGhlaicsGhiaDcifgDae6mbkkcbc99aoaqSEhokavc;aef8Kjjjjbaok:llevu8Jjjjjbcz9Rhvc9:hodnaecvfal0mbcuhoaiRbbc;:eGc;qe9hmbav9cb83iwaicefhraialfc98fhwdnaeTmbdnadcdSmbcbhDindnaraw6mbc9:skarcefhoar8SbbglcFeGhidndnalcu9mmbaohrxekarcvfhraicFbGhicrhldninao8SbbgdcFbGaltaiVhiadcu9kmeaocefhoalcrfglc8J9hmbxdkkaocefhrkabaDcdtfaicd4cbaice4ceG9R7avcwfaiceGcdtVgoydbfglBdbaoalBdbaDcefgDae9hmbxdkkcbhDindnaraw6mbc9:skarcefhoar8SbbglcFeGhidndnalcu9mmbaohrxekarcvfhraicFbGhicrhldninao8SbbgdcFbGaltaiVhiadcu9kmeaocefhoalcrfglc8J9hmbxdkkaocefhrkabaDcetfaicd4cbaice4ceG9R7avcwfaiceGcdtVgoydbfgl87ebaoalBdbaDcefgDae9hmbkkcbc99arawSEhokaok:EPliuo97eue978Jjjjjbca9Rhidndnadcl9hmbdnaec98GglTmbcbhvabhdinadadpbbbgocKp:RecKp:Sep;6egraocwp:RecKp:Sep;6earp;Geaoczp:RecKp:Sep;6egwp;Gep;Kep;LegDpxbbbbbbbbbbbbbbbbp:2egqarpxbbbjbbbjbbbjbbbjgkp9op9rp;Kegrpxbb;:9cbb;:9cbb;:9cbb;:9cararp;MeaDaDp;Meawaqawakp9op9rp;Kegrarp;Mep;Kep;Kep;Jep;Negwp;Mepxbbn0bbn0bbn0bbn0gqp;KepxFbbbFbbbFbbbFbbbp9oaopxbbbFbbbFbbbFbbbFp9op9qarawp;Meaqp;Kecwp:RepxbFbbbFbbbFbbbFbbp9op9qaDawp;Meaqp;Keczp:RepxbbFbbbFbbbFbbbFbp9op9qpkbbadczfhdavclfgval6mbkkalae9pmeaiaeciGgvcdtgdVcbczad9R;8kbaiabalcdtfglad;8qbbdnavTmbaiaipblbgocKp:RecKp:Sep;6egraocwp:RecKp:Sep;6earp;Geaoczp:RecKp:Sep;6egwp;Gep;Kep;LegDpxbbbbbbbbbbbbbbbbp:2egqarpxbbbjbbbjbbbjbbbjgkp9op9rp;Kegrpxbb;:9cbb;:9cbb;:9cbb;:9cararp;MeaDaDp;Meawaqawakp9op9rp;Kegrarp;Mep;Kep;Kep;Jep;Negwp;Mepxbbn0bbn0bbn0bbn0gqp;KepxFbbbFbbbFbbbFbbbp9oaopxbbbFbbbFbbbFbbbFp9op9qarawp;Meaqp;Kecwp:RepxbFbbbFbbbFbbbFbbp9op9qaDawp;Meaqp;Keczp:RepxbbFbbbFbbbFbbbFbp9op9qpklbkalaiad;8qbbskdnaec98GgxTmbcbhvabhdinadczfglalpbbbgopxbbbbbbFFbbbbbbFFgkp9oadpbbbgDaopmlvorxmPsCXQL358E8FpxFubbFubbFubbFubbp9op;6eaDaopmbediwDqkzHOAKY8AEgoczp:Sep;6egrp;Geaoczp:Reczp:Sep;6egwp;Gep;Kep;Legopxb;:FSb;:FSb;:FSb;:FSawaopxbbbbbbbbbbbbbbbbp:2egqawpxbbbjbbbjbbbjbbbjgmp9op9rp;Kegwawp;Meaoaop;Mearaqaramp9op9rp;Kegoaop;Mep;Kep;Kep;Jep;Negrp;Mepxbbn0bbn0bbn0bbn0gqp;Keczp:Reawarp;Meaqp;KepxFFbbFFbbFFbbFFbbp9op9qgwaoarp;Meaqp;KepxFFbbFFbbFFbbFFbbp9ogopmwDKYqk8AExm35Ps8E8Fp9qpkbbadaDakp9oawaopmbezHdiOAlvCXorQLp9qpkbbadcafhdavclfgvax6mbkkaxae9pmbaiaeciGgvcitgdfcbcaad9R;8kbaiabaxcitfglad;8qbbdnavTmbaiaipblzgopxbbbbbbFFbbbbbbFFgkp9oaipblbgDaopmlvorxmPsCXQL358E8FpxFubbFubbFubbFubbp9op;6eaDaopmbediwDqkzHOAKY8AEgoczp:Sep;6egrp;Geaoczp:Reczp:Sep;6egwp;Gep;Kep;Legopxb;:FSb;:FSb;:FSb;:FSawaopxbbbbbbbbbbbbbbbbp:2egqawpxbbbjbbbjbbbjbbbjgmp9op9rp;Kegwawp;Meaoaop;Mearaqaramp9op9rp;Kegoaop;Mep;Kep;Kep;Jep;Negrp;Mepxbbn0bbn0bbn0bbn0gqp;Keczp:Reawarp;Meaqp;KepxFFbbFFbbFFbbFFbbp9op9qgwaoarp;Meaqp;KepxFFbbFFbbFFbbFFbbp9ogopmwDKYqk8AExm35Ps8E8Fp9qpklzaiaDakp9oawaopmbezHdiOAlvCXorQLp9qpklbkalaiad;8qbbkk;4wllue97euv978Jjjjjbc8W9Rhidnaec98GglTmbcbhvabhoinaiaopbbbgraoczfgwpbbbgDpmlvorxmPsCXQL358E8Fgqczp:Segkclp:RepklbaopxbbjZbbjZbbjZbbjZpx;Zl81Z;Zl81Z;Zl81Z;Zl81Zakpxibbbibbbibbbibbbp9qp;6ep;NegkaraDpmbediwDqkzHOAKY8AEgrczp:Reczp:Sep;6ep;MegDaDp;Meakarczp:Sep;6ep;Megxaxp;Meakaqczp:Reczp:Sep;6ep;Megqaqp;Mep;Kep;Kep;Lepxbbbbbbbbbbbbbbbbp:4ep;Jepxb;:FSb;:FSb;:FSb;:FSgkp;Mepxbbn0bbn0bbn0bbn0grp;KepxFFbbFFbbFFbbFFbbgmp9oaxakp;Mearp;Keczp:Rep9qgxaqakp;Mearp;Keczp:ReaDakp;Mearp;Keamp9op9qgkpmbezHdiOAlvCXorQLgrp5baipblbpEb:T:j83ibaocwfarp5eaipblbpEe:T:j83ibawaxakpmwDKYqk8AExm35Ps8E8Fgkp5baipblbpEd:T:j83ibaocKfakp5eaipblbpEi:T:j83ibaocafhoavclfgval6mbkkdnalae9pmbaiaeciGgvcitgofcbcaao9R;8kbaiabalcitfgwao;8qbbdnavTmbaiaipblbgraipblzgDpmlvorxmPsCXQL358E8Fgqczp:Segkclp:RepklaaipxbbjZbbjZbbjZbbjZpx;Zl81Z;Zl81Z;Zl81Z;Zl81Zakpxibbbibbbibbbibbbp9qp;6ep;NegkaraDpmbediwDqkzHOAKY8AEgrczp:Reczp:Sep;6ep;MegDaDp;Meakarczp:Sep;6ep;Megxaxp;Meakaqczp:Reczp:Sep;6ep;Megqaqp;Mep;Kep;Kep;Lepxbbbbbbbbbbbbbbbbp:4ep;Jepxb;:FSb;:FSb;:FSb;:FSgkp;Mepxbbn0bbn0bbn0bbn0grp;KepxFFbbFFbbFFbbFFbbgmp9oaxakp;Mearp;Keczp:Rep9qgxaqakp;Mearp;Keczp:ReaDakp;Mearp;Keamp9op9qgkpmbezHdiOAlvCXorQLgrp5baipblapEb:T:j83ibaiarp5eaipblapEe:T:j83iwaiaxakpmwDKYqk8AExm35Ps8E8Fgkp5baipblapEd:T:j83izaiakp5eaipblapEi:T:j83iKkawaiao;8qbbkk:Pddiue978Jjjjjbc;ab9Rhidnadcd4ae2glc98GgvTmbcbhdabheinaeaepbbbgocwp:Recwp:Sep;6eaocep:SepxbbjZbbjZbbjZbbjZp:UepxbbjFbbjFbbjFbbjFp9op;Mepkbbaeczfheadclfgdav6mbkkdnaval9pmbaialciGgdcdtgeVcbc;abae9R;8kbaiabavcdtfgvae;8qbbdnadTmbaiaipblbgocwp:Recwp:Sep;6eaocep:SepxbbjZbbjZbbjZbbjZp:UepxbbjFbbjFbbjFbbjFp9op;Mepklbkavaiae;8qbbkk9teiucbcbydj1jjbgeabcifc98GfgbBdj1jjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaikkkebcjwklz9Tbb";
  // WASM基础二进制
  const b = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 3, 2, 0, 0, 5, 3, 1, 0, 1, 12, 1, 0, 10, 22, 2, 12, 0, 65, 0, 65, 0, 65, 0, 252, 10, 0, 0, 11, 7, 0, 65, 0, 253, 15, 26, 11]);
  const E = new Uint8Array([32, 0, 65, 2, 1, 106, 34, 33, 3, 128, 11, 4, 13, 64, 6, 253, 10, 7, 15, 116, 127, 5, 8, 12, 40, 16, 19, 54, 20, 9, 27, 255, 113, 17, 42, 67, 24, 23, 146, 148, 18, 14, 22, 45, 70, 69, 56, 114, 101, 21, 25, 63, 75, 136, 108, 28, 118, 29, 73, 115]);

  // 不支持WebAssembly直接返回不支持
  if (typeof WebAssembly != "object") {
    return { supported: !1 };
  }

  var T = WebAssembly.validate(b) ? y : ae;
  var L;
  // 初始化WASM解码模块
  const F = WebAssembly.instantiate(j(T), {}).then(function(gt) {
    L = gt.instance;
    L.exports.__wasm_call_ctors();
  });

  /**
   * 解码加密的WASM字符串
   */
  function j(gt) {
    const xt = new Uint8Array(gt.length);
    for (let Xe = 0; Xe < gt.length; ++Xe) {
      const ut = gt.charCodeAt(Xe);
      xt[Xe] = ut > 96 ? ut - 97 : ut > 64 ? ut - 39 : ut + 4;
    }

    let dn = 0;
    for (let Xe = 0; Xe < gt.length; ++Xe) {
      xt[dn++] = xt[Xe] < 60 ? E[xt[Xe]] : (xt[Xe] - 60) * 64 + xt[++Xe];
    }
    return xt.buffer.slice(0, dn);
  }

  /**
   * 调用WASM解码缓冲区数据
   */
  function W(gt, xt, Xe, ut, dn, qt) {
    const ln = L.exports.sbrk;
    const Tn = Xe + 3 & -4;
    const fn = ln(Tn * ut);
    const Hn = ln(dn.length);
    const En = new Uint8Array(L.exports.memory.buffer);

    En.set(dn, Hn);
    const Ei = gt(fn, Xe, ut, Hn, dn.length);

    if (Ei == 0 && qt) {
      qt(fn, Tn, ut);
    }

    xt.set(En.subarray(fn, fn + Xe * ut));
    ln(fn - ln(0));

    if (Ei != 0) {
      throw new Error("Malformed buffer data: " + Ei);
    }
  }

  // 解码过滤器类型
  const re = {
    NONE: "",
    OCTAHEDRAL: "meshopt_decodeFilterOct",
    QUATERNION: "meshopt_decodeFilterQuat",
    EXPONENTIAL: "meshopt_decodeFilterExp"
  };

  // 解码模式
  const fe = {
    ATTRIBUTES: "meshopt_decodeVertexBuffer",
    TRIANGLES: "meshopt_decodeIndexBuffer",
    INDICES: "meshopt_decodeIndexSequence"
  };

  const te = [];
  let Te = 0;

  /**
   * 创建WebWorker线程池
   */
  function Ge(gt) {
    const xt = {
      object: new Worker(gt),
      pending: 0,
      requests: {}
    };
    xt.object.onmessage = function(Xe) {
      const ut = Xe.data;
      xt.pending -= ut.count;
      xt.requests[ut.id][ut.action](ut.value);
      delete xt.requests[ut.id];
    };
    return xt;
  }

  /**
   * 初始化Worker线程池
   */
  function St(gt) {
    const xt = `var instance; var ready = WebAssembly.instantiate(new Uint8Array([${new Uint8Array(j(T))}]), {}).then(function(result) { instance = result.instance; instance.exports.__wasm_call_ctors(); });self.onmessage = workerProcess;` + W.toString() + Vt.toString();
    const Xe = new Blob([xt], { type: "text/javascript" });
    const ut = URL.createObjectURL(Xe);

    for (let dn = 0; dn < gt; ++dn) {
      te[dn] = Ge(ut);
    }
    URL.revokeObjectURL(ut);
  }

  /**
   * 异步解码（使用Worker）
   */
  function kt(gt, xt, Xe, ut, dn) {
    let qt = te[0];
    for (let ln = 1; ln < te.length; ++ln) {
      if (te[ln].pending < qt.pending) {
        qt = te[ln];
      }
    }

    return new Promise(function(Tn, fn) {
      const Hn = new Uint8Array(Xe);
      const En = Te++;
      qt.pending += gt;
      qt.requests[En] = { resolve: Tn, reject: fn };
      qt.object.postMessage({
        id: En,
        count: gt,
        size: xt,
        source: Hn,
        mode: ut,
        filter: dn
      }, [Hn.buffer]);
    });
  }

  /**
   * Worker消息处理
   */
  function Vt(gt) {
    F.then(function() {
      const xt = gt.data;
      try {
        const Xe = new Uint8Array(xt.count * xt.size);
        W(L.exports[xt.mode], Xe, xt.count, xt.size, xt.source, L.exports[xt.filter]);
        self.postMessage({
          id: xt.id,
          count: xt.count,
          action: "resolve",
          value: Xe
        }, [Xe.buffer]);
      } catch (ut) {
        self.postMessage({
          id: xt.id,
          count: xt.count,
          action: "reject",
          value: ut
        });
      }
    });
  }

  // 导出解码API
  return {
    ready: F,
    supported: !0,
    useWorkers: St,
    decodeVertexBuffer: (gt, xt, Xe, ut, dn) => W(L.exports.meshopt_decodeVertexBuffer, gt, xt, Xe, ut, L.exports[re[dn]]),
    decodeIndexBuffer: (gt, xt, Xe, ut) => W(L.exports.meshopt_decodeIndexBuffer, gt, xt, Xe, ut),
    decodeIndexSequence: (gt, xt, Xe, ut) => W(L.exports.meshopt_decodeIndexSequence, gt, xt, Xe, ut),
    decodeGltfBuffer: (gt, xt, Xe, ut, dn, qt) => W(L.exports[fe[ut]], gt, xt, Xe, ut, L.exports[re[qt]]),
    decodeGltfBufferAsync: (gt, xt, Xe, ut, dn) => te.length ? kt(gt, xt, Xe, fe[ut], re[dn]) : F.then(() => {
      const qt = new Uint8Array(gt * xt);
      W(L.exports[fe[ut]], qt, gt, xt, Xe, L.exports[re[dn]]);
      return qt;
    })
  };
}();

/**
 * GLB/GLTF 3D模型加载器
 * 支持Draco/Meshopt压缩模型
 */
class ye extends s.g {
  constructor() {
    super(...arguments);
    // 支持的文件格式
    B(this, "extensions", ["gltf", "glb", "bin"]);
  }

  load({ url: b, file: E, onLoad: T, onProgress: L, onError: F }) {
    // 模型加载完成回调
    const j = fe => {
      const te = fe.scene;
      Object.assign(te, { animations: fe.animations });
      Object.assign(te.meshData, jo.tQ(te));
      T(te);
    };

    // 初始化glTF加载器
    const W = new Fa(this.viewer.loadingManager);
    const re = new da(this.viewer.loadingManager);
    
    // 设置Draco解压路径
    re.setDecoderPath(this.viewer.dracoPath);
    W.setDRACOLoader(re);
    // 设置Meshopt解码器
    W.setMeshoptDecoder(se);
    
    // 加载模型
    W.load(b, j, L, F, E);
  }
}

/**
 * HDR环境图解析器
 * 解析.hdr格式高动态范围图片
 */
class ue extends m.yxD {
  constructor(y) {
    super(y);
    this.type = m.cLu; // 数据类型：半浮点
  }

  /**
   * 解析HDR二进制数据
   */
  parse(y) {
    // 错误处理
    const j = function(Xe, ut) {
      switch (Xe) {
        case 1: console.error("THREE.RGBELoader Read Error: " + (ut || "")); break;
        case 2: console.error("THREE.RGBELoader Write Error: " + (ut || "")); break;
        case 3: console.error("THREE.RGBELoader Bad File Format: " + (ut || "")); break;
        default: console.error("THREE.RGBELoader: Error: " + (ut || ""));
      }
      return -1;
    };

    // 读取HDR文件头
    const Te = function(Xe, ut, dn) {
      ut = ut || 1024;
      let ln = Xe.pos, Tn = -1, fn = 0, Hn = "";
      let En = String.fromCharCode.apply(null, new Uint16Array(Xe.subarray(ln, ln + 128)));
      for (; 0 > Tn && fn < ut && ln < Xe.byteLength; ) {
        Hn += En;
        fn += En.length;
        ln += 128;
        En += String.fromCharCode.apply(null, new Uint16Array(Xe.subarray(ln, ln + 128)));
        Tn = En.indexOf(`
`);
      }
      return -1 < Tn ? (dn && (Xe.pos += fn + Tn + 1), Hn + En.slice(0, Tn)) : !1;
    };

    // 解析HDR文件头信息
    const Ge = function(Xe) {
      const fn = {
        valid: 0, string: "", comments: "", programtype: "RGBE",
        format: "", gamma: 1, exposure: 1, width: 0, height: 0
      };
      let Hn = Te(Xe);
      if (!Hn) return j(1, "no header found");
      
      fn.valid |= 1;
      fn.programtype = Hn.match(/^#\?(\S+)/)[1];
      fn.string += Hn + `
`;

      while (Hn = Te(Xe)) {
        fn.string += Hn + `
`;
        if (Hn[0] === "#") {
          fn.comments += Hn + `
`;
          continue;
        }
        // 解析格式、尺寸、伽马等参数
        const en = Hn.match(/^\s*FORMAT=(\S+)\s*$/);
        const tn = Hn.match(/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/);
        if (en) fn.format = en[1], fn.valid |= 2;
        if (tn) fn.height = +tn[1], fn.width = +tn[2], fn.valid |= 4;
        if (fn.valid & 6) break;
      }
      return fn.valid & 6 ? fn : j(3, "missing format/size");
    };

    // 解码RGBE像素数据
    const St = function(Xe, ut, dn) {
      const qt = ut;
      const ln = new Uint8Array(4 * ut * dn);
      let Tn = 0, fn = 0;
      const En = new Uint8Array(4);
      const Ei = new Uint8Array(4 * qt);

      for (let ar = dn; ar > 0 && fn < Xe.byteLength; ) {
        En.set(Xe.subarray(fn, fn + 4));
        fn += 4;
        // RLE解码
        let fr = 0;
        while (fr < 4 * qt && fn < Xe.byteLength) {
          const lr = Xe[fn++];
          const Tr = lr > 128;
          const er = Tr ? lr - 128 : lr;
          if (Tr) {
            const vr = Xe[fn++];
            Ei.fill(vr, fr, fr + er);
          } else {
            Ei.set(Xe.subarray(fn, fn + er), fr);
            fn += er;
          }
          fr += er;
        }
        // 转换像素格式
        for (let Tr = 0; Tr < qt; Tr++) {
          ln[Tn++] = Ei[Tr];
          ln[Tn++] = Ei[Tr + qt];
          ln[Tn++] = Ei[Tr + qt * 2];
          ln[Tn++] = Ei[Tr + qt * 3];
        }
        ar--;
      }
      return ln;
    };

    // RGBE转浮点像素
    const kt = (Xe, ut, dn, qt) => {
      const s = Xe[ut + 3];
      const f = Math.pow(2, s - 128) / 255;
      dn[qt + 0] = Xe[ut + 0] * f;
      dn[qt + 1] = Xe[ut + 1] * f;
      dn[qt + 2] = Xe[ut + 2] * f;
      dn[qt + 3] = 1;
    };

    // RGBE转半浮点
    const Vt = (Xe, ut, dn, qt) => {
      const s = Xe[ut + 3];
      const f = Math.pow(2, s - 128) / 255;
      dn[qt + 0] = m.A5E.toHalfFloat(Math.min(Xe[ut + 0] * f, 65504));
      dn[qt + 1] = m.A5E.toHalfFloat(Math.min(Xe[ut + 1] * f, 65504));
      dn[qt + 2] = m.A5E.toHalfFloat(Math.min(Xe[ut + 2] * f, 65504));
      dn[qt + 3] = m.A5E.toHalfFloat(1);
    };

    // 执行解析
    const gt = new Uint8Array(y);
    gt.pos = 0;
    const xt = Ge(gt);
    if (xt === -1) return null;

    const { width, height } = xt;
    const dn = St(gt.subarray(gt.pos), width, height);
    if (dn === -1) return null;

    // 转换为Three.js纹理数据
    let data, type;
    if (this.type === m.VzW) {
      data = new Float32Array(dn.length / 4 * 4);
      for (let i = 0; i < dn.length / 4; i++) kt(dn, i * 4, data, i * 4);
      type = m.VzW;
    } else {
      data = new Uint16Array(dn.length / 4 * 4);
      for (let i = 0; i < dn.length / 4; i++) Vt(dn, i * 4, data, i * 4);
      type = m.cLu;
    }

    return { width, height, data, header: xt.string, gamma: xt.gamma, exposure: xt.exposure, type };
  }

  setDataType(y) {
    this.type = y;
    return this;
  }

  load(y, b, E, T, L) {
    const F = j => {
      j.encoding = m.rnI;
      j.minFilter = j.magFilter = m.wem;
      j.generateMipmaps = !1;
      j.flipY = !0;
      b && b(j);
    };
    return super.load(y, F, E, T, L);
  }
}

/**
 * HDR图片加载器
 */
class Ce extends s.g {
  constructor() {
    super(...arguments);
    B(this, "extensions", ["hdr"]);
  }

  load({ url: b, file: E, onLoad: T, onProgress: L, onError: F, texSettings: j }) {
    new ue(this.viewer.loadingManager).load(b, W => T(Object.assign(W, j)), L, F, E);
  }
}

/**
 * JSON文件加载器
 */
class mt extends s.g {
  constructor() {
    super(...arguments);
    B(this, "extensions", ["json"]);
  }

  load({ url: b, file: E, onLoad: T, onProgress: L, onError: F }) {
    new _.hH6(this.viewer.loadingManager).load(b, j => T(JSON.parse(j)), L, F, E);
  }
}

/**
 * 普通图片加载器（PNG/JPG/WEBP/AVIF）
 */
class nn extends s.g {
  constructor() {
    super(...arguments);
    B(this, "extensions", ["png", "jpg", "webp", "avif"]);
  }

  load({ url: b, file: E, onLoad: T, onProgress: L, onError: F, texSettings: j }) {
    const W = this.viewer.renderer.outputEncoding;
    new _.dpR(this.viewer.loadingManager).load(b, re => T(Object.assign(re, { encoding: W, ...j })), L, F, E);
  }
}

/**
 * 压缩纹理加载器（如 Basis Universal）
 */
var cn = r(400);
class ni extends s.g {
  constructor() {
    super(...arguments);
    B(this, "extensions", ["img"]);
  }

  load({ url: b, file: E, onLoad: T, onProgress: L, onError: F }) {
    new cn.S3k(this.viewer.loadingManager).load(b, T, L, F, E);
  }
}
}


/**
 * ImageBitmapLoader 高性能纹理加载器
 * 继承自Three.js的Loader基类，使用 createImageBitmap + fetch 加载图片
 */
class JR extends Oo {
  constructor(e) {
    super(e);
    // 标记为ImageBitmap加载器
    this.isImageBitmapLoader = true;
    // 环境兼容性检测：不支持createImageBitmap则警告
    typeof createImageBitmap > "u" && console.warn("THREE.ImageBitmapLoader: createImageBitmap() not supported.");
    // 环境兼容性检测：不支持fetch则警告
    typeof fetch > "u" && console.warn("THREE.ImageBitmapLoader: fetch() not supported.");
    // 图片加载配置：禁止预乘Alpha通道（glTF纹理标准）
    this.options = {
      premultiplyAlpha: "none"
    };
  }

  /**
   * 设置图片加载参数
   * @param {Object} e 配置项
   * @returns {JR} 链式调用
   */
  setOptions(e) {
    this.options = e;
    return this;
  }

  /**
   * 核心加载方法：加载纹理图片
   * @param {string} e 图片URL
   * @param {Function} i 加载成功回调
   * @param {Function} o 加载进度回调
   * @param {Function} a 加载失败回调
   */
  load(e, i, o, a) {
    // URL空值处理
    e === void 0 && (e = "");
    // 拼接资源路径
    this.path !== void 0 && (e = this.path + e);
    // 解析URL（处理相对路径/跨域）
    e = this.manager.resolveURL(e);

    const self = this;
    // 从缓存中获取纹理
    const cacheData = tc.get(e);

    // 缓存命中：直接返回缓存数据，触发回调
    if (cacheData !== void 0) {
      self.manager.itemStart(e);
      setTimeout(function () {
        i && i(cacheData);
        self.manager.itemEnd(e);
      }, 0);
      return cacheData;
    }

    // 构造fetch请求配置
    const fetchOptions = {};
    // 跨域凭证配置
    fetchOptions.credentials = this.crossOrigin === "anonymous" ? "same-origin" : "include";
    // 请求头配置
    fetchOptions.headers = this.requestHeader;

    // 标记加载开始
    self.manager.itemStart(e);

    // 1. fetch请求资源 2. 转blob 3. 创建ImageBitmap 4. 缓存并回调
    fetch(e, fetchOptions)
      .then(function (response) { return response.blob(); })
      .then(function (blob) {
        // 合并配置，禁止颜色空间转换
        return createImageBitmap(blob, Object.assign(self.options, {
          colorSpaceConversion: "none"
        }));
      })
      .then(function (bitmap) {
        // 存入缓存
        tc.add(e, bitmap);
        // 成功回调
        i && i(bitmap);
        self.manager.itemEnd(e);
      })
      .catch(function (err) {
        // 失败回调
        a && a(err);
        self.manager.itemError(e);
        self.manager.itemEnd(e);
      });
  }
}

/**
 * glTF加载器 入口解析方法
 * 解析glTF字符串/二进制数据，分发到解析器处理
 * @param {ArrayBuffer|string} y glTF数据
 * @param {string} b 资源路径
 * @param {Function} E 成功回调
 * @param {Function} T 失败回调
 * @param {Array} L 附加文件
 */
parse(y, b, E, T, L) {
  let jsonData;
  // 扩展存储对象
  const extensions = {};
  // 插件存储对象
  const plugins = {};
  // 文本解码器
  const textDecoder = new TextDecoder;

  // 1. 解析输入数据：字符串 / 二进制glb / 普通二进制
  if (typeof y == "string") {
    // 普通JSON字符串
    jsonData = JSON.parse(y);
  } else if (y instanceof ArrayBuffer) {
    // 读取前4个字节判断是否为glb格式
    const headerStr = new Uint8Array(y, 0, 4).join("");
    if (headerStr === ma || headerStr === nr) {
      // glb二进制格式（glTF二进制）
      try {
        extensions[ti.KHR_BINARY_GLTF] = new dl(y);
      } catch (err) {
        T && T(err);
        return;
      }
      // 解析glb中的JSON内容
      jsonData = JSON.parse(extensions[ti.KHR_BINARY_GLTF].content);
    } else {
      // 普通二进制转JSON
      jsonData = JSON.parse(textDecoder.decode(y));
    }
  } else {
    // 已经是JSON对象
    jsonData = y;
  }

  // 2. 版本校验：仅支持glTF 2.0+
  if (jsonData.asset === void 0 || jsonData.asset.version[0] < 2) {
    T && T(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));
    return;
  }

  // 3. 创建核心解析器实例
  const parser = new p(jsonData, {
    path: b || this.resourcePath || "",
    crossOrigin: this.crossOrigin,
    requestHeader: this.requestHeader,
    manager: this.manager,
    ktx2Loader: this.ktx2Loader,
    meshoptDecoder: this.meshoptDecoder
  });
  // 配置文件加载器请求头
  parser.fileLoader.setRequestHeader(this.requestHeader);

  // 4. 注册插件回调
  for (let i = 0; i < this.pluginCallbacks.length; i++) {
    const plugin = this.pluginCallbacks[i](parser);
    plugins[plugin.name] = plugin;
    extensions[plugin.name] = true;
  }

  // 5. 处理glTF官方扩展
  if (jsonData.extensionsUsed) {
    for (let i = 0; i < jsonData.extensionsUsed.length; ++i) {
      const extName = jsonData.extensionsUsed[i];
      const requiredExts = jsonData.extensionsRequired || [];

      switch (extName) {
        case ti.KHR_MATERIALS_UNLIT: // 无光照材质扩展
          extensions[extName] = new Xr;
          break;
        case ti.KHR_DRACO_MESH_COMPRESSION: // DRACO网格压缩扩展
          extensions[extName] = new fl(jsonData, this.dracoLoader);
          break;
        case ti.KHR_TEXTURE_TRANSFORM: // 纹理变换扩展
          extensions[extName] = new pl;
          break;
        case ti.KHR_MESH_QUANTIZATION: // 网格量化扩展
          extensions[extName] = new ga;
          break;
        default:
          // 未知的必选扩展，警告提示
          requiredExts.indexOf(extName) >= 0 && plugins[extName] === void 0 &&
            console.warn(`THREE.GLTFLoader: Unknown extension "${extName}".`);
      }
    }
  }

  // 6. 启动解析
  jsonData.additionalFiles = L;
  parser.setExtensions(extensions);
  parser.setPlugins(plugins);
  parser.parse(E, T);
}

/**
 * 异步解析入口（Promise封装）
 * @param {*} y glTF数据
 * @param {*} b 资源路径
 * @returns {Promise}
 */
parseAsync(y, b) {
  const self = this;
  return new Promise(function (resolve, reject) {
    self.parse(y, b, resolve, reject);
  });
}

/**
 * 【核心】glTF解析器
 * 负责：解析glTF JSON、加载缓冲区/纹理/材质/网格/动画、生成Three.js对象
 */
class p {
  constructor(json = {}, options = {}) {
    // glTF原始JSON数据
    this.json = json;
    // 扩展实例集合
    this.extensions = {};
    // 插件集合
    this.plugins = {};
    // 配置项
    this.options = options;
    // 缓存管理器
    this.cache = new Wl;
    // 3D对象与glTF资源的关联映射
    this.associations = new Map;

    // 各类缓存：避免重复创建对象
    this.primitiveCache = {}; // 图元缓存
    this.nodeCache = {}; // 节点缓存
    this.meshCache = { refs: {}, uses: {} }; // 网格复用缓存
    this.cameraCache = { refs: {}, uses: {} }; // 相机缓存
    this.lightCache = { refs: {}, uses: {} }; // 灯光缓存
    this.sourceCache = {}; // 图片源缓存
    this.textureCache = {}; // 纹理缓存
    this.nodeNamesUsed = {}; // 节点名称去重

    // 浏览器环境检测：Safari / Firefox
    let isSafari = false;
    let isFirefox = false;
    let firefoxVersion = -1;
    if (typeof navigator < "u") {
      isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      isFirefox = navigator.userAgent.indexOf("Firefox") > -1;
      firefoxVersion = isFirefox ? navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1] : -1;
    }

    // 兼容性选择纹理加载器：高性能ImageBitmapLoader / 普通纹理加载器
    if (typeof createImageBitmap > "u" || isSafari || (isFirefox && firefoxVersion < 98)) {
      this.textureLoader = new m.dpR(this.options.manager);
    } else {
      this.textureLoader = new m.QRU(this.options.manager);
    }

    // 配置加载器跨域/请求头
    this.textureLoader.setCrossOrigin(this.options.crossOrigin);
    this.textureLoader.setRequestHeader(this.options.requestHeader);

    // 文件加载器（加载二进制缓冲区）
    this.fileLoader = new m.hH6(this.options.manager);
    this.fileLoader.setResponseType("arraybuffer");
    // 凭证配置
    this.options.crossOrigin === "use-credentials" && this.fileLoader.setWithCredentials(true);
  }

  // 设置扩展
  setExtensions(ext) { this.extensions = ext; }
  // 设置插件
  setPlugins(plugin) { this.plugins = plugin; }

  /**
   * 解析主逻辑
   * @param {Function} onLoad 成功回调
   * @param {Function} onError 失败回调
   */
  parse(onLoad, onError) {
    const self = this;
    const json = this.json;
    const extensions = this.extensions;

    // 清空缓存
    this.cache.removeAll();
    this.nodeCache = {};

    // 标记所有定义（骨骼/网格引用）
    this._invokeAll(function (ext) {
      return ext._markDefs && ext._markDefs();
    });

    // 执行扩展前置逻辑 → 加载依赖 → 构建场景
    Promise.all(this._invokeAll(function (ext) {
      return ext.beforeRoot && ext.beforeRoot();
    }))
      .then(function () {
        // 并行加载：场景、动画、相机
        return Promise.all([
          self.getDependencies("scene"),
          self.getDependencies("animation"),
          self.getDependencies("camera")
        ]);
      })
      .then(function (results) {
        // 构造Three.js可用的场景对象
        const gltf = {
          scene: results[0][json.scene || 0], // 默认场景
          scenes: results[0], // 所有场景
          animations: results[1], // 所有动画
          cameras: results[2], // 所有相机
          asset: json.asset, // 资源信息
          parser: self,
          userData: {}
        };

        // 应用扩展/元数据
        eo(extensions, gltf, json);
        ns(gltf, json);

        // 执行扩展后置逻辑
        Promise.all(self._invokeAll(function (plugin) {
          return plugin.afterRoot && plugin.afterRoot(gltf);
        })).then(function () {
          onLoad(gltf);
        });
      })
      .catch(onError);
  }

  /**
   * 标记骨骼/网格定义（内部方法）
   * 识别节点中的骨骼、蒙皮网格、相机引用
   */
  _markDefs() {
    const nodes = this.json.nodes || [];
    const skins = this.json.skins || [];
    const meshes = this.json.meshes || [];

    // 标记骨骼节点
    for (let i = 0; i < skins.length; i++) {
      const joints = skins[i].joints;
      for (let j = 0; j < joints.length; j++) {
        nodes[joints[j]].isBone = true;
      }
    }

    // 标记网格/相机引用
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      // 网格节点
      if (node.mesh !== void 0) {
        this._addNodeRef(this.meshCache, node.mesh);
        // 蒙皮网格标记
        node.skin !== void 0 && (meshes[node.mesh].isSkinnedMesh = true);
      }
      // 相机节点
      if (node.camera !== void 0) {
        this._addNodeRef(this.cameraCache, node.camera);
      }
    }
  }

  // 添加节点引用计数（用于实例化复用）
  _addNodeRef(cache, index) {
    if (index !== void 0) {
      cache.refs[index] === void 0 && (cache.refs[index] = cache.uses[index] = 0);
      cache.refs[index]++;
    }
  }

  // 获取节点实例（复用/克隆）
  _getNodeRef(cache, index, obj) {
    if (cache.refs[index] <= 1) return obj;
    // 多引用：克隆对象
    const clone = obj.clone();
    // 递归复制关联关系
    const copyAssociations = (src, dst) => {
      const assoc = this.associations.get(src);
      assoc != null && this.associations.set(dst, assoc);
      for (const [i, child] of src.children.entries()) {
        copyAssociations(child, dst.children[i]);
      }
    };
    copyAssociations(obj, clone);
    clone.name += "_instance_" + cache.uses[index]++;
    return clone;
  }

  // 调用单个插件/扩展的方法
  _invokeOne(func) {
    const plugins = Object.values(this.plugins);
    plugins.push(this);
    for (let i = 0; i < plugins.length; i++) {
      const result = func(plugins[i]);
      if (result) return result;
    }
    return null;
  }

  // 调用所有插件/扩展的方法
  _invokeAll(func) {
    const plugins = Object.values(this.plugins);
    plugins.unshift(this);
    const results = [];
    for (let i = 0; i < plugins.length; i++) {
      const res = func(plugins[i]);
      res && results.push(res);
    }
    return results;
  }

  /**
   * 获取单个资源依赖（核心调度方法）
   * @param {string} type 资源类型 scene/node/mesh/material等
   * @param {number} index 索引
   * @returns {Promise} 资源对象
   */
  getDependency(type, index) {
    const key = `${type}:${index}`;
    let cacheRes = this.cache.get(key);

    if (!cacheRes) {
      switch (type) {
        case "scene": cacheRes = this.loadScene(index); break;
        case "node": cacheRes = this._invokeOne(p => p.loadNode && p.loadNode(index)); break;
        case "mesh": cacheRes = this._invokeOne(p => p.loadMesh && p.loadMesh(index)); break;
        case "accessor": cacheRes = this.loadAccessor(index); break;
        case "bufferView": cacheRes = this._invokeOne(p => p.loadBufferView && p.loadBufferView(index)); break;
        case "buffer": cacheRes = this.loadBuffer(index); break;
        case "material": cacheRes = this._invokeOne(p => p.loadMaterial && p.loadMaterial(index)); break;
        case "texture": cacheRes = this._invokeOne(p => p.loadTexture && p.loadTexture(index)); break;
        case "skin": cacheRes = this.loadSkin(index); break;
        case "animation": cacheRes = this._invokeOne(p => p.loadAnimation && p.loadAnimation(index)); break;
        case "camera": cacheRes = this.loadCamera(index); break;
        default:
          cacheRes = this._invokeOne(p => p !== this && p.getDependency && p.getDependency(type, index));
          if (!cacheRes) throw new Error(`Unknown type: ${type}`);
          break;
      }
      this.cache.add(key, cacheRes);
    }
    return cacheRes;
  }

  // 获取某类型所有依赖
  getDependencies(type) {
    let cacheRes = this.cache.get(type);
    if (!cacheRes) {
      const self = this;
      // 处理复数命名：mesh → meshes
      const list = this.json[type + (type === "mesh" ? "es" : "s")] || [];
      cacheRes = Promise.all(list.map((_, i) => self.getDependency(type, i)));
      this.cache.add(type, cacheRes);
    }
    return cacheRes;
  }

  // 加载缓冲区（二进制数据）
  loadBuffer(index) {
    const buffer = this.json.buffers[index];
    const loader = this.fileLoader;

    // 仅支持arraybuffer类型
    if (buffer.type && buffer.type !== "arraybuffer") {
      throw new Error("THREE.GLTFLoader: " + buffer.type + " buffer type is not supported.");
    }

    // glb内置缓冲区
    if (buffer.uri === void 0 && index === 0) {
      return Promise.resolve(this.extensions[ti.KHR_BINARY_GLTF].body);
    }

    // 附加文件处理
    const additionalFiles = this.json.additionalFiles;
    const extraFile = additionalFiles ? additionalFiles.find(f => f.name === buffer.uri) : null;
    const options = this.options;

    return new Promise((resolve, reject) => {
      loader.load(
        m.Zp0.resolveURL(buffer.uri, options.path),
        resolve,
        void 0,
        () => reject(new Error(`THREE.GLTFLoader: Failed to load buffer "${buffer.uri}".`)),
        extraFile
      );
    });
  }

  // 加载缓冲区视图（截取二进制数据）
  loadBufferView(index) {
    const view = this.json.bufferViews[index];
    return this.getDependency("buffer", view.buffer).then(buffer => {
      const byteLength = view.byteLength || 0;
      const byteOffset = view.byteOffset || 0;
      return buffer.slice(byteOffset, byteOffset + byteLength);
    });
  }

  // 加载数据访问器（顶点/索引数据解析）
  loadAccessor(index) {
    const self = this;
    const json = this.json;
    const acc = this.json.accessors[index];
    // 空数据：创建空属性
    if (acc.bufferView === void 0 && acc.sparse === void 0) {
      const itemSize = Mo[acc.type];
      const TypedArray = Qr[acc.componentType];
      const normalized = acc.normalized === true;
      const array = new TypedArray(acc.count * itemSize);
      return Promise.resolve(new m.TlE(array, itemSize, normalized));
    }

    const promises = [];
    // 加载主缓冲区
    acc.bufferView !== void 0 && promises.push(this.getDependency("bufferView", acc.bufferView));
    // 稀疏数据：加载索引/值缓冲区
    acc.sparse !== void 0 && promises.push(
      this.getDependency("bufferView", acc.sparse.indices.bufferView),
      this.getDependency("bufferView", acc.sparse.values.bufferView)
    );

    return Promise.all(promises).then(results => {
      // 解析顶点属性逻辑（省略详细实现，核心为类型转换/稀疏数据填充）
      // 最终返回Three.js BufferAttribute
      return bufferAttribute;
    });
  }

  // 加载纹理
  loadTexture(index) {
    const json = this.json;
    const options = this.options;
    const source = json.textures[index].source;
    const image = json.images[source];
    let loader = this.textureLoader;

    // 自定义加载器处理
    if (image.uri) {
      const customLoader = options.manager.getHandler(image.uri);
      customLoader !== null && (loader = customLoader);
    }
    return this.loadTextureImage(index, source, loader);
  }

  // 加载纹理图片（缓存+配置）
  loadTextureImage(texIndex, imgIndex, loader) {
    // 缓存逻辑 + 纹理参数配置（过滤/包裹/编码）
    // 返回Three.js Texture对象
  }

  // 加载图片源（支持base64/缓冲区/URL）
  loadImageSource(index, loader) {
    // 解析图片数据 → 生成URL → 加载 → 释放临时URL
  }

  // 为材质分配纹理
  assignTexture(material, prop, texInfo, encoding) {
    return this.getDependency("texture", texInfo.index).then(tex => {
      // 纹理变换扩展处理
      // 设置纹理编码 → 赋值给材质
      return tex;
    });
  }

  // 最终处理材质（克隆/顶点颜色/平面着色等）
  assignFinalMaterial(mesh) {
    const geom = mesh.geometry;
    let mat = mesh.material;
    // 点/线材质特殊处理
    // 顶点颜色/平面着色/切线缺失处理
    mesh.material = mat;
  }

  // 获取材质类型（默认PBR材质）
  getMaterialType() { return m.Wid; }

  // 加载材质（PBR/无光照/透明/混合模式）
  loadMaterial(index) {
    // 解析glTF材质参数 → 创建Three.js材质 → 应用纹理/扩展
  }

  // 创建唯一节点名称（避免重名）
  createUniqueName(name) {
    let cleanName = m.iUV.sanitizeNodeName(name || "");
    let finalName = cleanName;
    let i = 1;
    while (this.nodeNamesUsed[finalName]) {
      finalName = `${cleanName}_${i}`;
      i++;
    }
    this.nodeNamesUsed[finalName] = true;
    return finalName;
  }

  // 加载几何体（支持DRACO压缩）
  loadGeometries(primitives) {
    // 解压DRACO → 构建BufferGeometry
  }

  // 加载网格（Mesh/蒙皮网格/点/线）
  loadMesh(index) {
    // 加载几何体+材质 → 创建网格对象 → 处理绘制模式
  }

  // 加载相机（透视/正交相机）
  loadCamera(index) {
    const cam = this.json.cameras[index];
    const params = cam[cam.type];
    let threeCam;
    // 透视相机
    if (cam.type === "perspective") {
      threeCam = new m.cPb(
        m.M8C.radToDeg(params.yfov),
        params.aspectRatio || 1,
        params.znear || 1,
        params.zfar || 2000000
      );
    }
    // 正交相机
    else if (cam.type === "orthographic") {
      threeCam = new m.iKG(
        -params.xmag, params.xmag,
        params.ymag, -params.ymag,
        params.znear, params.zfar
      );
    }
    threeCam.name = this.createUniqueName(cam.name);
    return Promise.resolve(threeCam);
  }

  // 加载蒙皮数据（骨骼+逆绑定矩阵）
  loadSkin(index) {
    // 加载骨骼节点 + 逆绑定矩阵 → 创建SkinnedMesh绑定数据
  }

  // 加载动画（节点动画/ morph目标动画/四元数插值）
  loadAnimation(index) {
    // 解析通道/采样器 → 创建Three.js AnimationClip
  }

  // 创建节点网格
  createNodeMesh(nodeIndex) {
    const node = this.json.nodes[nodeIndex];
    return node.mesh === void 0 ? null : this.getDependency("mesh", node.mesh).then(mesh => {
      return this._getNodeRef(this.meshCache, node.mesh, mesh);
    });
  }

  // 加载节点（场景树节点）
  loadNode(index) {
    // 加载节点自身 + 子节点 + 蒙皮数据 → 构建场景树
  }

  // 浅加载节点（不加载子节点）
  _loadNodeShallow(index) {
    // 创建节点对象 → 应用矩阵/位置/旋转/缩放 → 缓存
  }

  // 加载场景（根节点）
  loadScene(index) {
    const scene = this.json.scenes[index];
    const threeScene = new m.ZAu;
    threeScene.name = this.createUniqueName(scene.name);

    // 加载所有根节点
    const nodePromises = (scene.nodes || []).map(i => this.getDependency("node", i));

    return Promise.all(nodePromises).then(nodes => {
      nodes.forEach(node => threeScene.add(node));
      // 更新关联映射
      return threeScene;
    });
  }
}

// ZR：Three.js核心对象加载器，继承自基础加载器 Oo
// 作用：加载并解析 Three.js 标准 JSON 格式的 3D 场景/模型文件
class ZR extends Oo {
    // 构造函数：接收配置参数，调用父类构造器
    constructor(e) {
        super(e)
    }

    /**
     * 【同步加载方法】加载 JSON 格式的 3D 对象文件
     * @param {string} e - 资源URL
     * @param {function} i - 加载完成回调（返回解析后的3D对象）
     * @param {function} o - 加载进度回调
     * @param {function} a - 加载失败回调
     */
    load(e, i, o, a) {
        const c = this; // 保存当前实例引用
        // 计算资源基础路径：path为空则从URL提取，否则使用自身path
        const d = this.path === "" ? z0.extractUrlBase(e) : this.path;
        this.resourcePath = this.resourcePath || d; // 初始化资源路径

        // 创建文件加载器，用于加载JSON文本
        const f = new Al(this.manager);
        f.setPath(this.path); // 设置资源基础路径
        f.setRequestHeader(this.requestHeader); // 设置请求头
        f.setWithCredentials(this.withCredentials); // 设置跨域凭证

        // 加载文件
        f.load(e, function(v) {
            let x = null;
            try {
                x = JSON.parse(v); // 解析JSON文本
            } catch (P) {
                // JSON解析失败：执行错误回调+打印日志
                a !== void 0 && a(P);
                console.error("THREE:ObjectLoader: Can't parse " + e + ".", P.message);
                return;
            }

            // 校验元数据：必须包含合法的type，不支持纯Geometry格式
            const w = x.metadata;
            if (w === void 0 || w.type === void 0 || w.type.toLowerCase() === "geometry") {
                a !== void 0 && a(new Error("THREE.ObjectLoader: Can't load " + e));
                console.error("THREE.ObjectLoader: Can't load " + e);
                return;
            }

            // 解析JSON为Three.js 3D对象
            c.parse(x, i);
        }, o, a);
    }

    /**
     * 【异步加载方法】Promise风格加载，支持async/await
     * @param {string} e - 资源URL
     * @param {function} i - 进度回调
     * @returns {Promise<Object3D>} 解析后的3D对象
     */
    async loadAsync(e, i) {
        const o = this;
        // 计算资源基础路径
        const a = this.path === "" ? z0.extractUrlBase(e) : this.path;
        this.resourcePath = this.resourcePath || a;

        // 初始化加载器
        const c = new Al(this.manager);
        c.setPath(this.path);
        c.setRequestHeader(this.requestHeader);
        c.setWithCredentials(this.withCredentials);

        // 异步加载并解析JSON
        const d = await c.loadAsync(e, i);
        const f = JSON.parse(d);
        const v = f.metadata;

        // 元数据校验
        if (v === void 0 || v.type === void 0 || v.type.toLowerCase() === "geometry") {
            throw new Error("THREE.ObjectLoader: Can't load " + e);
        }

        // 异步解析并返回结果
        return await o.parseAsync(f);
    }

    /**
     * 【同步解析】将JSON数据解析为Three.js 3D对象
     * @param {object} e - JSON数据
     * @param {function} i - 完成回调
     * @returns {Object3D} 根3D对象（场景/组）
     */
    parse(e, i) {
        // 分步解析核心资源（同步）
        const o = this.parseAnimations(e.animations); // 解析动画
        const a = this.parseShapes(e.shapes); // 解析形状
        const c = this.parseGeometries(e.geometries, a); // 解析几何体
        // 解析图片（传入回调，图片加载完成后触发总回调）
        const d = this.parseImages(e.images, function() {
            i !== void 0 && i(x);
        });
        const f = this.parseTextures(e.textures, d); // 解析纹理
        const v = this.parseMaterials(e.materials, f); // 解析材质
        const x = this.parseObject(e.object, c, v, f, o); // 解析3D对象树
        const w = this.parseSkeletons(e.skeletons, x); // 解析骨骼

        // 绑定骨骼到蒙皮网格
        this.bindSkeletons(x, w);

        // 图片全部加载完成后执行回调
        if (i !== void 0) {
            let P = !1;
            // 检查是否有未加载完成的图片
            for (const M in d) {
                if (d[M].data instanceof HTMLImageElement) {
                    P = !0;
                    break;
                }
            }
            // 无待加载图片，直接执行回调
            P === !1 && i(x);
        }

        return x;
    }

    /**
     * 【异步解析】Promise风格解析JSON
     * @param {object} e - JSON数据
     * @returns {Promise<Object3D>} 3D对象
     */
    async parseAsync(e) {
        // 分步解析（图片异步加载）
        const i = this.parseAnimations(e.animations);
        const o = this.parseShapes(e.shapes);
        const a = this.parseGeometries(e.geometries, o);
        const c = await this.parseImagesAsync(e.images); // 异步加载图片
        const d = this.parseTextures(e.textures, c);
        const f = this.parseMaterials(e.materials, d);
        const v = this.parseObject(e.object, a, f, d, i);
        const x = this.parseSkeletons(e.skeletons, v);

        // 绑定骨骼并返回
        this.bindSkeletons(v, x);
        return v;
    }

    /**
     * 解析形状（Shape）：将JSON转为Three.js Shape对象
     * @param {array} e - 形状JSON数组
     * @returns {object} uuid->Shape 映射表
     */
    parseShapes(e) {
        const i = {};
        if (e !== void 0) {
            for (let o = 0, a = e.length; o < a; o++) {
                const c = new Wc().fromJSON(e[o]);
                i[c.uuid] = c;
            }
        }
        return i;
    }

    /**
     * 解析骨骼（Skeleton）：匹配骨骼节点并创建骨骼对象
     * @param {array} e - 骨骼JSON数组
     * @param {Object3D} i - 根3D对象
     * @returns {object} uuid->Skeleton 映射表
     */
    parseSkeletons(e, i) {
        const o = {};
        const a = {};
        // 遍历场景，收集所有Bone节点
        i.traverse(function(c) {
            c.isBone && (a[c.uuid] = c);
        });

        if (e !== void 0) {
            for (let c = 0, d = e.length; c < d; c++) {
                const f = new _p().fromJSON(e[c], a);
                o[f.uuid] = f;
            }
        }
        return o;
    }

    /**
     * 解析几何体（Geometry/BufferGeometry）
     * @param {array} e - 几何体JSON数组
     * @param {object} i - 形状映射表
     * @returns {object} uuid->Geometry 映射表
     */
    parseGeometries(e, i) {
        const o = {};
        if (e !== void 0) {
            const a = new Cb; // 几何体解析器
            for (let c = 0, d = e.length; c < d; c++) {
                let f;
                const v = e[c];
                // 根据类型解析几何体
                switch (v.type) {
                    case "BufferGeometry":
                    case "InstancedBufferGeometry":
                        f = a.parse(v);
                        break;
                    default:
                        // 兼容自定义几何体类型
                        v.type in h ? f = h[v.type].fromJSON(v, i) : console.warn(`THREE.ObjectLoader: Unsupported geometry type "${v.type}"`);
                }
                // 赋值uuid、名称、用户数据
                f.uuid = v.uuid;
                v.name !== void 0 && (f.name = v.name);
                v.userData !== void 0 && (f.userData = v.userData);
                o[v.uuid] = f;
            }
        }
        return o;
    }

    /**
     * 解析材质（Material）
     * @param {array} e - 材质JSON数组
     * @param {object} i - 纹理映射表
     * @returns {object} uuid->Material 映射表
     */
    parseMaterials(e, i) {
        const o = {};
        const a = {};
        if (e !== void 0) {
            const c = new Ip; // 材质解析器
            c.setTextures(i); // 注入纹理
            for (let d = 0, f = e.length; d < f; d++) {
                const v = e[d];
                o[v.uuid] === void 0 && (o[v.uuid] = c.parse(v));
                a[v.uuid] = o[v.uuid];
            }
        }
        return a;
    }

    /**
     * 解析动画（AnimationClip）
     * @param {array} e - 动画JSON数组
     * @returns {object} uuid->AnimationClip 映射表
     */
    parseAnimations(e) {
        const i = {};
        if (e !== void 0) {
            for (let o = 0; o < e.length; o++) {
                const a = e[o];
                const c = Ad.parse(a); // 动画解析器
                i[c.uuid] = c;
            }
        }
        return i;
    }

    /**
     * 【同步解析图片】加载图片资源（纹理源）
     * @param {array} e - 图片JSON数组
     * @param {function} i - 图片加载完成回调
     * @returns {object} uuid->Image 映射表
     */
    parseImages(e, i) {
        const o = this;
        const a = {};
        let c;

        // 加载单张图片，通知加载管理器
        function d(v) {
            return o.manager.itemStart(v),
            c.load(v, function() {
                o.manager.itemEnd(v);
            }, void 0, function() {
                o.manager.itemError(v);
                o.manager.itemEnd(v);
            });
        }

        // 处理图片URL/内联数据
        function f(v) {
            if (typeof v == "string") {
                // 处理URL：绝对路径直接用，相对路径拼接资源路径
                const x = v;
                const w = /^(\/\/)|([a-z]+:(\/\/)?)/i.test(x) ? x : o.resourcePath + x;
                return d(w);
            } else {
                // 处理内联图片数据
                return v.data ? {
                    data: Yl(v.type, v.data),
                    width: v.width,
                    height: v.height
                } : null;
            }
        }

        if (e !== void 0 && e.length > 0) {
            const v = new B0(i); // 图片加载管理器
            c = new Sd(v); // 图片加载器
            c.setCrossOrigin(this.crossOrigin); // 设置跨域

            for (let x = 0, w = e.length; x < w; x++) {
                const P = e[x];
                const M = P.url;
                // 处理立方体贴图（数组）
                if (Array.isArray(M)) {
                    const I = [];
                    for (let z = 0, O = M.length; z < O; z++) {
                        const k = M[z];
                        const Q = f(k);
                        Q !== null && (Q instanceof HTMLImageElement ? I.push(Q) : I.push(new Wu(Q.data,Q.width,Q.height)));
                    }
                    a[P.uuid] = new Nn(I);
                } else {
                    // 普通2D图片
                    const I = f(P.url);
                    a[P.uuid] = new Nn(I);
                }
            }
        }
        return a;
    }

    /**
     * 【异步解析图片】Promise风格加载图片
     * @param {array} e - 图片JSON数组
     * @returns {Promise<object>} uuid->Image 映射表
     */
    async parseImagesAsync(e) {
        const i = this;
        const o = {};
        let a;

        // 异步加载单张图片
        async function c(d) {
            if (typeof d == "string") {
                const f = d;
                const v = /^(\/\/)|([a-z]+:(\/\/)?)/i.test(f) ? f : i.resourcePath + f;
                return await a.loadAsync(v);
            } else {
                return d.data ? {
                    data: Yl(d.type, d.data),
                    width: d.width,
                    height: d.height
                } : null;
            }
        }

        if (e !== void 0 && e.length > 0) {
            a = new Sd(this.manager);
            a.setCrossOrigin(this.crossOrigin);

            for (let d = 0, f = e.length; d < f; d++) {
                const v = e[d];
                const x = v.url;
                if (Array.isArray(x)) {
                    const w = [];
                    for (let P = 0, M = x.length; P < M; P++) {
                        const I = x[P];
                        const z = await c(I);
                        z !== null && (z instanceof HTMLImageElement ? w.push(z) : w.push(new Wu(z.data,z.width,z.height)));
                    }
                    o[v.uuid] = new Nn(w);
                } else {
                    const w = await c(v.url);
                    o[v.uuid] = new Nn(w);
                }
            }
        }
        return o;
    }

    /**
     * 解析纹理（Texture）：将图片转为纹理对象
     * @param {array} e - 纹理JSON数组
     * @param {object} i - 图片映射表
     * @returns {object} uuid->Texture 映射表
     */
    parseTextures(e, i) {
        // 工具函数：将字符串常量转为数字（兼容旧版JSON）
        function o(c, d) {
            return typeof c == "number" ? c : (console.warn("THREE.ObjectLoader.parseTexture: Constant should be in numeric form.", c), d[c]);
        }

        const a = {};
        if (e !== void 0) {
            for (let c = 0, d = e.length; c < d; c++) {
                const f = e[c];
                // 异常校验
                f.image === void 0 && console.warn('THREE.ObjectLoader: No "image" specified for', f.uuid);
                i[f.image] === void 0 && console.warn("THREE.ObjectLoader: Undefined image", f.image);

                const v = i[f.image];
                const x = v.data;
                let w;

                // 创建对应类型的纹理
                if (Array.isArray(x)) {
                    w = new Zh; // 立方体贴图
                    x.length === 6 && (w.needsUpdate = !0);
                } else {
                    // 2D纹理/数据纹理
                    x && x.data ? w = new Wu : w = new $t;
                    x && (w.needsUpdate = !0);
                }

                // 赋值纹理属性
                w.source = v;
                w.uuid = f.uuid;
                f.name !== void 0 && (w.name = f.name);
                f.mapping !== void 0 && (w.mapping = o(f.mapping, qR));
                f.offset !== void 0 && w.offset.fromArray(f.offset);
                f.repeat !== void 0 && w.repeat.fromArray(f.repeat);
                f.center !== void 0 && w.center.fromArray(f.center);
                f.rotation !== void 0 && (w.rotation = f.rotation);
                f.wrap !== void 0 && (w.wrapS = o(f.wrap[0], Pb), w.wrapT = o(f.wrap[1], Pb));
                f.format !== void 0 && (w.format = f.format);
                f.internalFormat !== void 0 && (w.internalFormat = f.internalFormat);
                f.type !== void 0 && (w.type = f.type);
                f.encoding !== void 0 && (w.encoding = f.encoding);
                f.minFilter !== void 0 && (w.minFilter = o(f.minFilter, Rb));
                f.magFilter !== void 0 && (w.magFilter = o(f.magFilter, Rb));
                f.anisotropy !== void 0 && (w.anisotropy = f.anisotropy);
                f.flipY !== void 0 && (w.flipY = f.flipY);
                f.generateMipmaps !== void 0 && (w.generateMipmaps = f.generateMipmaps);
                f.premultiplyAlpha !== void 0 && (w.premultiplyAlpha = f.premultiplyAlpha);
                f.unpackAlignment !== void 0 && (w.unpackAlignment = f.unpackAlignment);
                f.userData !== void 0 && (w.userData = f.userData);

                a[f.uuid] = w;
            }
        }
        return a;
    }

    /**
     * 解析3D对象树：递归创建场景、相机、灯光、网格、骨骼等所有对象
     * @param {object} e - 对象JSON
     * @param {object} i - 几何体映射表
     * @param {object} o - 材质映射表
     * @param {object} a - 纹理映射表
     * @param {object} c - 动画映射表
     * @returns {Object3D} 3D对象
     */
    parseObject(e, i, o, a, c) {
        let d;

        // 工具函数：通过uuid获取几何体
        function f(M) {
            return i[M] === void 0 && console.warn("THREE.ObjectLoader: Undefined geometry", M), i[M];
        }
        // 工具函数：通过uuid获取材质
        function v(M) {
            if (M !== void 0) {
                if (Array.isArray(M)) {
                    const I = [];
                    for (let z = 0, O = M.length; z < O; z++) {
                        const k = M[z];
                        o[k] === void 0 && console.warn("THREE.ObjectLoader: Undefined material", k);
                        I.push(o[k]);
                    }
                    return I;
                }
                return o[M] === void 0 && console.warn("THREE.ObjectLoader: Undefined material", M), o[M];
            }
        }
        // 工具函数：通过uuid获取纹理
        function x(M) {
            return a[M] === void 0 && console.warn("THREE.ObjectLoader: Undefined texture", M), a[M];
        }

        let w, P;
        // 根据类型创建对应的Three.js对象
        switch (e.type) {
            case "Scene": // 场景
                d = new v1;
                e.background !== void 0 && (Number.isInteger(e.background) ? d.background = new gn(e.background) : d.background = x(e.background));
                e.environment !== void 0 && (d.environment = x(e.environment));
                e.fog !== void 0 && (e.fog.type === "Fog" ? d.fog = new dp(e.fog.color,e.fog.near,e.fog.far) : e.fog.type === "FogExp2" && (d.fog = new hp(e.fog.color,e.fog.density)));
                e.backgroundBlurriness !== void 0 && (d.backgroundBlurriness = e.backgroundBlurriness);
                e.backgroundIntensity !== void 0 && (d.backgroundIntensity = e.backgroundIntensity);
                break;
            case "PerspectiveCamera": // 透视相机
                d = new Ms(e.fov,e.aspect,e.near,e.far);
                e.focus !== void 0 && (d.focus = e.focus);
                e.zoom !== void 0 && (d.zoom = e.zoom);
                break;
            case "OrthographicCamera": // 正交相机
                d = new ap(e.left,e.right,e.top,e.bottom,e.near,e.far);
                e.zoom !== void 0 && (d.zoom = e.zoom);
                break;
            // 各类灯光
            case "AmbientLight": d = new Sb(e.color,e.intensity); break;
            case "DirectionalLight": d = new Ab(e.color,e.intensity); break;
            case "PointLight": d = new wb(e.color,e.intensity,e.distance,e.decay); break;
            case "RectAreaLight": d = new Tb(e.color,e.intensity,e.width,e.height); break;
            case "SpotLight": d = new xb(e.color,e.intensity,e.distance,e.angle,e.penumbra,e.decay); break;
            case "HemisphereLight": d = new vb(e.color,e.groundColor,e.intensity); break;
            case "LightProbe": d = new Lp().fromJSON(e); break;
            // 蒙皮网格（带骨骼动画）
            case "SkinnedMesh":
                w = f(e.geometry);
                P = v(e.material);
                d = new C1(w,P);
                e.bindMode !== void 0 && (d.bindMode = e.bindMode);
                e.bindMatrix !== void 0 && d.bindMatrix.fromArray(e.bindMatrix);
                e.skeleton !== void 0 && (d.skeleton = e.skeleton);
                break;
            // 普通网格
            case "Mesh":
                w = f(e.geometry);
                P = v(e.material);
                d = new Es(w,P);
                break;
            // 实例化网格
            case "InstancedMesh":
                w = f(e.geometry);
                P = v(e.material);
                const M = e.count;
                const I = e.instanceMatrix;
                const z = e.instanceColor;
                d = new L1(w,P,M);
                d.instanceMatrix = new ju(new Float32Array(I.array),16);
                z !== void 0 && (d.instanceColor = new ju(new Float32Array(z.array),z.itemSize));
                break;
            // LOD 细节层次
            case "LOD": d = new A1; break;
            // 线条
            case "Line": d = new ec(f(e.geometry),v(e.material)); break;
            case "LineLoop": d = new U1(f(e.geometry),v(e.material)); break;
            case "LineSegments": d = new Xa(f(e.geometry),v(e.material)); break;
            // 点云
            case "PointCloud":
            case "Points": d = new z1(f(e.geometry),v(e.material)); break;
            // 精灵
            case "Sprite": d = new b1(v(e.material)); break;
            // 组/骨骼
            case "Group": d = new Nu; break;
            case "Bone": d = new f0; break;
            // 默认：空对象3D
            default: d = new Qi;
        }

        // 赋值基础属性：uuid、名称、矩阵、位置、旋转、缩放等
        d.uuid = e.uuid;
        e.name !== void 0 && (d.name = e.name);
        // 矩阵/变换属性
        e.matrix !== void 0 ? (d.matrix.fromArray(e.matrix), e.matrixAutoUpdate !== void 0 && (d.matrixAutoUpdate = e.matrixAutoUpdate), d.matrixAutoUpdate && d.matrix.decompose(d.position, d.quaternion, d.scale)) : (e.position !== void 0 && d.position.fromArray(e.position), e.rotation !== void 0 && d.rotation.fromArray(e.rotation), e.quaternion !== void 0 && d.quaternion.fromArray(e.quaternion), e.scale !== void 0 && d.scale.fromArray(e.scale));
        // 阴影、可见性、渲染顺序等
        e.castShadow !== void 0 && (d.castShadow = e.castShadow);
        e.receiveShadow !== void 0 && (d.receiveShadow = e.receiveShadow);
        e.shadow && (e.shadow.bias !== void 0 && (d.shadow.bias = e.shadow.bias), e.shadow.normalBias !== void 0 && (d.shadow.normalBias = e.shadow.normalBias), e.shadow.radius !== void 0 && (d.shadow.radius = e.shadow.radius), e.shadow.mapSize !== void 0 && d.shadow.mapSize.fromArray(e.shadow.mapSize), e.shadow.camera !== void 0 && (d.shadow.camera = this.parseObject(e.shadow.camera)));
        e.visible !== void 0 && (d.visible = e.visible);
        e.frustumCulled !== void 0 && (d.frustumCulled = e.frustumCulled);
        e.renderOrder !== void 0 && (d.renderOrder = e.renderOrder);
        e.userData !== void 0 && (d.userData = e.userData);
        e.layers !== void 0 && (d.layers.mask = e.layers);

        // 递归解析子对象
        if (e.children !== void 0) {
            const M = e.children;
            for (let I = 0; I < M.length; I++) {
                d.add(this.parseObject(M[I], i, o, a, c));
            }
        }

        // 绑定动画
        if (e.animations !== void 0) {
            const M = e.animations;
            for (let I = 0; I < M.length; I++) {
                const z = M[I];
                d.animations.push(c[z]);
            }
        }

        // 处理LOD层级
        if (e.type === "LOD") {
            e.autoUpdate !== void 0 && (d.autoUpdate = e.autoUpdate);
            const M = e.levels;
            for (let I = 0; I < M.length; I++) {
                const z = M[I];
                const O = d.getObjectByProperty("uuid", z.object);
                O !== void 0 && d.addLevel(O, z.distance, z.hysteresis);
            }
        }

        return d;
    }

    /**
     * 绑定骨骼：将Skeleton绑定到SkinnedMesh
     * @param {Object3D} e - 根3D对象
     * @param {object} i - 骨骼映射表
     */
    bindSkeletons(e, i) {
        // 遍历所有对象，找到蒙皮网格并绑定骨骼
        Object.keys(i).length !== 0 && e.traverse(function(o) {
            if (o.isSkinnedMesh === !0 && o.skeleton !== void 0) {
                const a = i[o.skeleton];
                a === void 0 ? console.warn("THREE.ObjectLoader: No skeleton found with UUID:", o.skeleton) : o.bind(a, o.bindMatrix);
            }
        });
    }
}

/**
 * 3D 展示场景核心类
 */
/**
 * @class SB
 * @classdesc 汽车3D展示场景核心控制器（总入口类）
 * 负责：资源加载、场景搭建、材质配置、动画控制、交互事件、渲染更新
 */
class SB extends wo {
    /**
     * 构造函数：声明场景内所有核心控制器/组件引用
     * 使用 B 函数声明私有属性（装饰器语法）
     */
    constructor() {
        super(...arguments); // 调用父类构造器

        // 声明核心控制器（用于后续场景管理）
        B(this, "_environment");         // 环境贴图/天空盒控制器
        B(this, "_posterGenerator");     // 海报/截图生成器
        B(this, "_envController");       // 环境光/HDR环境切换控制器
        B(this, "_springCtr");           // 弹簧相机动画控制器（流畅视角）
        B(this, "_carLightController");  // 汽车灯光控制器
        B(this, "_topLightController");  // 顶部主光源控制器
        B(this, "_carSpeedUpdate");      // 汽车速度/运动动画控制器
        B(this, "_bloom");               // 泛光/ bloom 后期效果控制器
        B(this, "_projectionProbe");     // 投影探针（反射/光照探针）
        B(this, "_accessories");         // 场景配件/UI面板集合
    }

    /**
     * 场景启动入口（生命周期：开始）
     * 打印版本 → 预加载所有资源 → 准备场景 → 创建场景 → 编译渲染
     */
    start() {
        console.log(ai.VERSION); // 打印当前SDK/项目版本

        // 异步预加载完成后，执行场景初始化流程
        this._preload().then(() => {
            this._prepareScene();   // 预处理资源：设置材质、纹理、图层、Shader
            this._createScene();    // 创建场景节点：相机、灯光、模型、控制器
            this._compileScene();   // 编译场景：触发渲染器编译、事件通知
        });
    }

    /**
     * 异步资源预加载（核心：加载所有模型、纹理、HDR环境图）
     * @returns Promise 所有资源加载完成
     */
    async _preload() {
        // 创建HDR equirectangular 转 立方体纹理转换器
        const r = new cO(this.viewer.renderer);

        // Promise.all 并行加载所有资源，提升加载速度
        return Promise.all([
            // ==================== 加载汽车/场景模型 glb ====================
            // 主汽车模型
            this.viewer.loadAsset({ url: ai.autoURL("res/mesh/sm_car.glb") }).then(s => { Ae.sm_car = s });
            // 起始房间/地面场景
            this.viewer.loadAsset({ url: ai.autoURL("res/mesh/sm_startroom.raw.glb") }).then(s => { Ae.sm_startroom = s });
            // 加速特效模型
            this.viewer.loadAsset({ url: ai.autoURL("res/mesh/sm_speedup.glb") }).then(s => { Ae.sm_speedup = s });
            // 尺寸标注模型
            this.viewer.loadAsset({ url: ai.autoURL("res/mesh/sm_size.glb") }).then(s => { Ae.sm_size = s });
            // 曲率展示模型
            this.viewer.loadAsset({ url: ai.autoURL("res/mesh/sm_curvature.glb") }).then(s => { Ae.sm_curvature = s });
            // 风速线特效模型
            this.viewer.loadAsset({ url: ai.autoURL("res/mesh/sm_windspeed.glb") }).then(s => { Ae.sm_windspeed = s });
            // 线框汽车模型
            this.viewer.loadAsset({ url: ai.autoURL("res/mesh/sm_linecar.glb") }).then(s => { Ae.sm_linecar = s });
            // 汽车雷达特效模型
            this.viewer.loadAsset({ url: ai.autoURL("res/mesh/sm_carradar.glb") }).then(s => { Ae.sm_carradar = s });
            // 简化汽车模型
            this.viewer.loadAsset({ url: ai.autoURL("res/mesh/sm_simplecar.glb") }).then(s => { Ae.sm_simpleCar = s });
            // 汽车灯条/警灯模型
            this.viewer.loadAsset({ url: ai.autoURL("res/mesh/sm_car_lightbar.glb") }).then(s => { Ae.sm_car_lightbar = s });

            // ==================== 加载纹理贴图 ====================
            // SA线纹理
            this.viewer.loadAsset({ url: ai.autoURL("res/texture/t_saLine.png"), flipY: !1, encoding: th, wrapS: sc, wrapT: sc, anisotropy: 4 }).then(s => Ae.ut_saLine.value = s),
            // 汽车车身AO纹理
            this.viewer.loadAsset({ url: ai.autoURL("res/texture/t_car_body_AO.raw.jpg"), flipY: !1, encoding: th, minFilter: rm, magFilter: rm }).then(s => Ae.ut_car_body_ao.value = s),
            // 起始房间AO纹理
            this.viewer.loadAsset({ url: ai.autoURL("res/texture/t_startroom_ao.raw.jpg"), flipY: !1, encoding: th }).then(s => { Ae.ut_startroom_ao.value = s }),
            // 起始房间光照贴图
            this.viewer.loadAsset({ url: ai.autoURL("res/texture/t_startroom_light.raw.jpg"), flipY: !1, encoding: Qy }).then(s => { Ae.ut_startroom_light.value = s }),
            // 地面法线纹理
            this.viewer.loadAsset({ url: ai.autoURL("res/texture/t_floor_normal.webp"), flipY: !1, encoding: th, wrapS: sc, wrapT: sc }).then(s => { Ae.ut_floor_normal.value = s }),
            // 地面粗糙度纹理
            this.viewer.loadAsset({ url: ai.autoURL("res/texture/t_floor_roughness.jpg"), flipY: !1, encoding: th, wrapS: sc, wrapT: sc }).then(s => { Ae.ut_floor_roughness.value = s }),
            // 街道纹理
            this.viewer.loadAsset({ url: ai.autoURL("res/texture/t_street.png"), flipY: !1, wrapS: sc, wrapT: sc }).then(s => { Ae.ut_street.value = s }),
            // 汽车MatCap纹理
            this.viewer.loadAsset({ url: ai.autoURL("res/texture/t_scar_matcap.png"), flipY: !1 }).then(s => { Ae.ut_scar_matcap.value = s }),
            // 汽车车身纹理GM
            this.viewer.loadAsset({ url: ai.autoURL("res/texture/t_gm_car_body_bc.png"), flipY: !1 }).then(s => { Ae.ut_car_body_t_gm.value = s }),
            // 汽车车身纹理GM02
            this.viewer.loadAsset({ url: ai.autoURL("res/texture/t_gm02_car_body_bc.jpg"), flipY: !1, anisotropy: 4 }).then(s => { Ae.ut_car_body_t_gm2.value = s }),
            // 汽车车窗纹理GM02
            this.viewer.loadAsset({ url: ai.autoURL("res/texture/t_gm02_car_window_bc.png"), flipY: !1 }).then(s => { Ae.ut_gm02_car_window_bc.value = s }),
            // 汽车车窗粗糙度纹理
            this.viewer.loadAsset({ url: ai.autoURL("res/texture/t_gm02_car_window_roughness.jpg"), flipY: !1, minFilter: rm, magFilter: rm }).then(s => { Ae.ut_gm02_car_window_roughness.value = s }),
            // 地面纹理GM02
            this.viewer.loadAsset({ url: ai.autoURL("res/texture/t_gm02_floor_bc.png"), flipY: !1, anisotropy: 4 }).then(s => { Ae.ut_gm02_floor_bc.value = s }),
            // 警车车身纹理
            this.viewer.loadAsset({ url: ai.autoURL("res/texture/t_police_Car_body_BC.png"), flipY: !1, anisotropy: 4 }).then(s => { Ae.ut_police_Car_body_BC.value = s }),
            // 警车地面纹理
            this.viewer.loadAsset({ url: ai.autoURL("res/texture/t_police_floor_bc.jpg"), flipY: !1, anisotropy: 4 }).then(s => { Ae.ut_police_floor_bc.value = s }),

            // ==================== 加载HDR环境贴图 ====================
            // 夜晚HDR环境（等矩形贴图转立方体纹理）
            this.viewer.loadAsset({ url: ai.autoURL("res/texture/t_env_night.hdr") }).then(s => { Ae.ut_env_night.value = r.fromEquirectangular(s).texture }),
            // 白天/明亮HDR环境
            this.viewer.loadAsset({ url: ai.autoURL("res/texture/t_env_light.hdr") }).then(s => { Ae.ut_env_light.value = r.fromEquirectangular(s).texture })
        ]);
    }

    /**
     * 场景预处理：
     * 配置材质、纹理、渲染图层、Shader、模型初始状态
     */
    _prepareScene() {
        const r = this.viewer;

        // 添加基础场景节点
        r.addNode(uB), r.addNode(mM);

        // 初始化环境捕获器（生成立方体反射纹理）
        this._environment = r.addNode(new J3({
            scene: r.scene,
            layer: Ae.LAYER_CAPTURE,
            resolution: 512 // 捕获纹理分辨率
        }));
        this._environment.blurIntensity = 4.5; // 环境模糊强度
        Ae.ut_cubeCapture = this._environment.cubeTexture;      // 捕获的立方体纹理
        Ae.ut_blurCapture = this._environment.blurTexture;      // 模糊后的纹理

        // ==================== 创建纯白、纯黑基础纹理 ====================
        // 纯白纹理
        const whiteData = new Float32Array([1, 1, 1, 1]);
        const whiteTex = new hA(whiteData, 1, 1, k_, dA);
        whiteTex.needsUpdate = !0;
        Ae.ut_white.value = whiteTex;

        // 纯黑纹理
        const darkData = new Float32Array([0, 0, 0, 1]);
        const darkTex = new hA(darkData, 1, 1, k_, dA);
        darkTex.needsUpdate = !0;
        Ae.ut_dark.value = darkTex;

        // 默认地面纹理 = 纯白
        Ae.ut_floorMap.value = whiteTex;

        // ==================== 配置主汽车模型材质、图层 ====================
        let carMeshData = Ae.sm_car.meshData;
        // 汽车所有网格开启【平面反射层】
        Object.values(carMeshData.meshes).forEach(m => { m.layers.enable(Ae.LAYER_PLANE_REFLECT) });
        // 汽车所有材质：设置AO贴图、自定义Shader编译
        Object.values(carMeshData.materials).forEach(m => {
            m.aoMap = Ae.ut_car_body_ao.value;
            // 物理材质：挂载自定义Shader逻辑
            m instanceof mA && (m.onBeforeCompile = D => { AA(D) });
        });
        // 车身材质初始设置
        carMeshData.materials.Car_body.map = Ae.ut_white.value;
        carMeshData.materials.Car_body.needsUpdate = !0;
        carMeshData.materials.M_logo.map.anisotropy = 8; // Logo各向异性过滤

        // 车窗材质初始设置
        const winMat = carMeshData.materials.Car_window;
        winMat.map = Ae.ut_white.value;
        winMat.roughnessMap = Ae.ut_dark.value;
        winMat.metalnessMap = Ae.ut_white.value;
        // 保存车窗原始材质数据，用于后续颜色重置
        Ae.u_m_car_window_orignData.color.copy(winMat.color);
        Ae.u_m_car_window_orignData.opacity = winMat.opacity;
        Ae.u_m_car_window_orignData.roughness = winMat.roughness;
        winMat.needsUpdate = !0;

        // ==================== 配置汽车灯条模型 ====================
        carMeshData = Ae.sm_car_lightbar.meshData;
        Ae.sm_car_lightbar.visible = !1; // 默认隐藏
        Object.values(carMeshData.meshes).forEach(m => { m.layers.enable(Ae.LAYER_PLANE_REFLECT) });
        Object.values(carMeshData.materials).forEach(m => {
            m.toneMapped = !1;
            m instanceof mA && (m.onBeforeCompile = D => {
                AA(D);
                m.name == "lightbar_Baked" && UO(D); // 灯条烘焙纹理自定义Shader
            });
        });

        // ==================== 配置地面/房间场景材质 ====================
        const roomData = Ae.sm_startroom.meshData;
        Object.values(roomData.materials).forEach(m => {
            m.aoMap = Ae.ut_startroom_ao.value;          // AO贴图
            m.lightMap = Ae.ut_startroom_light.value;     // 光照贴图
            m.normalMap = Ae.ut_floor_normal.value;      // 法线贴图
            m.roughnessMap = Ae.ut_floor_roughness.value; // 粗糙度贴图
            m.envMapIntensity = 0;                        // 环境光强度
        });

        // 配置速度特效、尺寸、曲率、风速、线框车、雷达、简模等模型材质/渲染状态
        // 核心：设置专用材质、渲染层级、透明、各向异性、渲染顺序
    }

    /**
     * 创建场景实体：
     * 相机、灯光、控制器、模型节点、后期效果、配件UI
     */
    _createScene() {
        const r = this.viewer;

        // 初始化海报生成器（默认关闭）
        this._posterGenerator = r.addNode(pM);
        this._posterGenerator.enabled = !1;
        // 场景背景色 = 纯黑
        r.scene.background = new Xi(0, 0, 0);

        // 反射节点（地面实时反射）
        const reflectNode = r.addNode(RO);
        Ae.u_reflect.u_reflectMatrix.value = reflectNode.reflectMatrix;
        Ae.u_reflect.u_reflectTexture.value = reflectNode.reflectTexture;

        // 地面设置反射
        Ae.sm_startroom.traverse(item => {
            (item.name === "ReflecFloor" || item.name === "Floor") && FO(item);
        });

        // ==================== 实例化所有核心控制器 ====================
        const envControl = r.addNode(new YO(Ae.ut_env_night.value, Ae.ut_env_light.value)); // 环境切换
        const roomNode = r.addNode(Ae.sm_startroom);                                       // 房间节点
        const topLightControl = r.addNode(new qO(roomNode));                               // 顶部灯光控制
        const probe = new dO();                                                            // 投影探针
        this.viewer.addComponent(Ae.sm_car, probe);
        probe.probeBoxMin.set(-3, -.1, -1.5); // 探针包围盒
        probe.probeBoxMax.set(3.6, 3, 1.5);

        const carNode = this.viewer.addNode(Ae.sm_car);                          // 汽车节点
        const carLightControl = r.addNode(new ZO(carNode));                      // 汽车灯光控制
        // 弹簧相机（流畅视角动画）
        const springCam = r.addNode(new Hl({
            springLength: 11,
            rotation: new go(0, Math.PI * .5, 0),
            fov: 33.4,
            lookAt: new Li(0, .8, 0)
        }));
        const springControl = r.addNode(new PO({ springCamera: springCam }));     // 弹簧相机控制

        r.addNode(JO); // 额外节点
        const carSpeedControl = r.addNode(new $O(carNode, springControl));       // 汽车速度控制

        // 添加场景配件/UI节点
        r.addNode(Ae.sm_speedup);
        const s1_c = r.addNode(cB);
        const s1_cpcl = r.addNode(xB);
        const s2_b = r.addNode(eB);
        const s2_c = r.addNode(tB);
        const s3_b = r.addNode(nB);
        const s3_c = r.addNode(iB);
        const s4_b = r.addNode(lB);
        const s4_c = r.addNode(rB);
        const s4_cSC = r.addNode(sB);

        // 添加Bloom泛光后期插件
        const bloom = r.addPlugin(new K3({
            luminanceThreshold: 0,
            luminanceSmoothing: 1.6,
            mipmapBlur: !0
        }));
        r.addPlugin(fO); // 其他后期插件

        // ==================== 赋值给实例属性，方便全局调用 ====================
        this._envController = envControl;
        this._springCtr = springControl;
        this._carLightController = carLightControl;
        this._topLightController = topLightControl;
        this._carSpeedUpdate = carSpeedControl;
        this._bloom = bloom;
        this._projectionProbe = probe;
        this._accessories = { s1_c, s1_cpcl, s2_b, s2_c, s3_b, s3_c, s4_b, s4_c, s4_cSC };

        // 注册所有交互事件
        this.eventRegister();
    }

    /**
     * 场景编译：
     * 执行渲染编译、发送预加载完成事件、颜色初始化
     */
    _compileScene() {
        BO(); // 全局编译指令
        this.viewer.compile(); // 渲染器编译场景
        Ie.emit(Ie.PRELOADED); // 发送【预加载完成】全局事件

        // 获取自定义颜色参数，触发颜色切换事件
        let customParams = Ae.getCustomParams();
        customParams && Ie.emit(Ie.CHANGECOLOR, customParams);
    }

    /**
     * 事件注册中心：
     * 监听全局事件（展示状态、点击效果、颜色切换）
     */
    eventRegister() {
        const envCtrl = this._envController;
        const springCtrl = this._springCtr;
        const carLightCtrl = this._carLightController;
        const topLightCtrl = this._topLightController;
        const carSpeedCtrl = this._carSpeedUpdate;
        const bloom = this._bloom;
        const probe = this._projectionProbe;
        const accessories = this._accessories;

        /**
         * 统一场景参数动画函数：环境、光照、泛光、探针、强度等缓动动画
         */
        const sceneAnim = (floorLightIntensity, carEnvIntensity, envExposure, topLightOpacity, bloomSmooth) => {
            // 投影探针动画
            Jt.TweenManager.KillTweensOf(probe);
            Jt.TweenManager.Timeline(probe).to({
                probeCenter: new Li(0, 0, 0),
                probeBoxMax: new Li(3.6, 3, 1.5)
            }, 1, { easing: Jt.Easing.Cubic.InOut }).start();

            // 地面光照强度动画
            Jt.TweenManager.Timeline(Ae.u_floorLightMapIntensity).to({ value: floorLightIntensity }, 1).start();
            // 汽车环境光强度动画
            Jt.TweenManager.Timeline(Ae.u_car_envMapIntensity).to({ value: carEnvIntensity }, 1.5).start();
            // 环境曝光度动画
            Jt.TweenManager.Tween(this._environment).to({ exposure: envExposure }, 1).start();
            // 顶部灯光透明度动画
            Jt.TweenManager.Timeline(topLightCtrl).to({ opacity: topLightOpacity }, 0.5).start();
            // Bloom泛光平滑度动画
            Jt.TweenManager.Timeline(bloom).to({ luminanceSmoothing: bloomSmooth }, 2).start();
        };

        // ==================== 监听：展示状态切换（不同视角/展示环节） ====================
        Ie.on(Ie.UPDATESHOWINGSTATE, state => {
            // 隐藏所有配件UI
            for (let key in accessories) accessories[key].hide();

            // 重置基础状态
            this._posterGenerator.hide();
            carSpeedCtrl.targetVelocity = 0;
            springCtrl.setNewRange();

            // 根据不同状态执行不同动画逻辑
            switch (state) {
                case Bn.BeginAnim: // 开场动画
                    // 环境切换：夜晚 → 白天
                    Jt.TweenManager.Timeline(envCtrl).delay(1.5).call(() => {
                        envCtrl.setState(U_.night, 2.5, Jt.Easing.Cubic.In);
                        // 相机动画完成后进入状态1
                        springCtrl.gotoPOI(new Li(0, .8, 0), 7, new go(0, Math.PI * .5, 0), 4).then(() => {
                            Ie.emit(Ie.UPDATESHOWINGSTATE, Bn.State1);
                            springCtrl.enableControlCamera = !0;
                        });
                    }).delay(2.5).call(() => {
                        envCtrl.setState(U_.light, 4, Jt.Easing.Cubic.Out);
                    }).start();
                    break;

                case Bn.State1: // 状态1：默认正面视角
                    springCtrl.setNewTarget(new Li(0, .8, 0), 7, new go(0, Math.PI * .5, 0));
                    sceneAnim();
                    springCtrl.targetFov = 33.4;
                    break;

                case Bn.State2: // 状态2：侧视角+尺寸展示
                    springCtrl.setNewTarget(new Li(0, .8, 0), 7, new go(0, -.89, .1));
                    accessories.s2_b.show();
                    sceneAnim();
                    break;

                case Bn.State3: // 状态3：曲率/前45°视角
                    springCtrl.setNewTarget(new Li(.3, .8, 0), 7, new go(0, .65, .1));
                    accessories.s3_b.show();
                    sceneAnim(0, 0, 10, 0, .5);
                    break;

                case Bn.State4: // 状态4：车尾视角
                    springCtrl.setNewTarget(new Li(.3, .8, 0), 14, new go(0, Math.PI, 1.2));
                    accessories.s4_b.show();
                    sceneAnim(.2, 1, 3, 0, 1.5);
                    break;

                case Bn.State5: // 状态5：海报/截图视角
                    springCtrl.setNewTarget(new Li(.2, .8, 0), 7, new go(0, -.7, .03));
                    sceneAnim(1, 1, 1, 0, 1.8);
                    this._posterGenerator.show(); // 开启截图
                    break;
            }
        });

        // ==================== 监听：点击交互效果（按压/松开） ====================
        let isPressed = false;
        let lastState = Bn.BeginAnim;
        Ie.on(Ie.CLICKEFFECT, pressed => {
            // 状态不变则直接返回
            if (isPressed === pressed && lastState === Ie.currentShowingState) return;
            isPressed = pressed;
            lastState = Ie.currentShowingState;
            Ie.emit(Ie.PRESSED_STATE_CHANGED, isPressed, lastState);

            // 隐藏所有配件
            for (let key in accessories) accessories[key].hide();

            // 根据当前状态 + 是否按压，执行不同交互逻辑
            switch (Ie.currentShowingState) {
                case Bn.State1:
                    if (pressed) {
                        // 按压：汽车加速、相机FOV放大、弹簧拉近、显示速度UI、降低金属度
                        carSpeedCtrl.targetVelocity = 8;
                        springCtrl.targetFov = 60;
                        accessories.s1_c.show();
                        sceneAnim(0, .1, 1, 0, 0);
                    } else {
                        // 松开：重置速度、相机、金属度
                        carSpeedCtrl.targetVelocity = 0;
                        springCtrl.targetFov = 33.4;
                        sceneAnim();
                    }
                    break;
                // State2~4 按压逻辑：显示对应UI、相机FOV变化、速度/动画控制
            }
        });

        // ==================== 监听：颜色切换（车身/车窗/地面材质切换） ====================
        Ie.on(Ie.CHANGECOLOR, colorId => {
            // 特殊颜色：显示/隐藏灯条
            Ae.sm_car_lightbar.visible = colorId == "11";

            // 获取颜色配置：颜色、车身纹理、车窗纹理、粗糙度、金属度
            const { col, tcar, tw, twr, metal, rough, tf } = Ae.colors.get(colorId);
            const bodyMat = Ae.sm_car.meshData.materials.Car_body;

            // 设置车身纹理/颜色
            bodyMat.map = tcar ? tcar.value : Ae.ut_white.value;
            // 动画过渡颜色、金属度、粗糙度
            Jt.TweenManager.Timeline(Ae.u_carColor).to({ value: col }, .2).start();
            Jt.TweenManager.Timeline(Ae.u_carRoughness).to({ value: rough ?? 0 }, .2).start();
            Jt.TweenManager.Timeline(Ae.u_carMetalness).to({ value: metal ?? 0 }, .2).start();

            // 设置车窗纹理/透明/粗糙度
            if (tw && twr) {
                const winMat = Ae.sm_car.meshData.materials.Car_window;
                winMat.color = new Xi("#fff").convertSRGBToLinear();
                winMat.opacity = 1;
                winMat.map = tw.value;
                winMat.roughnessMap = twr.value;
            } else {
                // 重置车窗为默认状态
                const winMat = Ae.sm_car.meshData.materials.Car_window;
                winMat.color = Ae.u_m_car_window_orignData.color;
                winMat.opacity = Ae.u_m_car_window_orignData.opacity;
                winMat.map = Ae.ut_white.value;
            }

            // 地面纹理切换
            Ae.ut_floorMap.value = tf ? tf.value : Ae.ut_white.value;
        });
    }

    /**
     * 每帧更新（生命周期：update）
     * 更新全局时间、汽车材质颜色/金属度/粗糙度
     */
    update(deltaTime) {
        // 更新时间（用于Shader动画：流光、UV滚动等）
        Ae.u_speedTime.value += deltaTime * Ae.u_speedUpBackgroundValue.value * .2;
        Ae.u_time.value += deltaTime;

        // 实时同步汽车车身材质参数
        if (Ae.sm_car) {
            const bodyMat = Ae.sm_car.meshData.materials.Car_body;
            bodyMat.metalness = Ae.u_carMetalness.value;     // 金属度
            bodyMat.roughness = Ae.u_carRoughness.value;     // 粗糙度
            bodyMat.color.copy(Ae.u_carColor.value);         // 颜色
        }
    }
}


/**
 * 
 * 1111
 */
const za = "glTF"
  , ma = "1031088470" // 旧版 GLB 头部校验数字
  , nr = "152147171185" // 加密/新版 GLB 头部校验数字
  , fo = 12   // GLB 固定头部长度 = 12 字节
  // GLB 文件内部块类型标识（JSON块、二进制数据块）
  , Ga = {
    JSON: 1313821514,   // "JSON" 四个字符的二进制编码值
    BIN: 5130562    // "BIN\0" 四个字符的二进制编码值
};
/**
 * @class dl
 * @classdesc GLB (Binary glTF) 二进制格式解析器
 */
class dl {
  /**
   * 构造函数：解析 ArrayBuffer 格式的 GLB 文件
   * @param {ArrayBuffer} glbBuffer - GLB 文件二进制数据
   */
  constructor(glbBuffer) {
    this.name = ti.KHR_BINARY_GLTF;  // 扩展名称  "KHR_binary_glTF"
    this.content = null;            // 存放解析出来的 glTF JSON 字符串
    this.body = null;               // 存放模型二进制数据（顶点、纹理等）

    // 读取 GLB 头部（固定 12 字节）
    const headerView = new DataView(glbBuffer, 0, fo);
    const textDecoder = new TextDecoder();    // 用于把二进制转字符串
    // 判断是否是加密 GLB 文件
    const isEncryptedGLB = new Uint8Array(glbBuffer, 0, 4).join("") === nr;

    // 解析文件头：magic(4) + version(4) + length(4)
    this.header = {
      magic: textDecoder.decode(new Uint8Array(glbBuffer, 0, 4)), // 必须是 "glTF"
      version: headerView.getUint32(4, true),  // glTF 版本号   2
      length: headerView.getUint32(8, true)    // 整个文件总长度
    };

    // 校验文件头合法性
    if (this.header.magic !== za)
      throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");
    if (this.header.version < 2)
      throw new Error("THREE.GLTFLoader: Legacy binary file detected.");

    // 剩余数据总长度
    const remainingBytes = this.header.length - fo;
    const bodyView = new DataView(glbBuffer, fo);
    let offset = 0;

    // 循环解析 GLB 中的数据块（JSON块、BIN块）
    for (; offset < remainingBytes;) {
      // 读取块长度
      const chunkLength = bodyView.getUint32(offset, true);
      offset += 4;

      // 加密文件：异或解密
      if (isEncryptedGLB) hl(new Uint8Array(glbBuffer, fo + offset, chunkLength + 4));

      // 读取块类型
      const chunkType = bodyView.getUint32(offset, true);
      offset += 4;

      // 根据块类型解析
      if (chunkType === Ga.JSON) {
        // JSON 块：解码为字符串
        const jsonBytes = new Uint8Array(glbBuffer, fo + offset, chunkLength);
        this.content = textDecoder.decode(jsonBytes);
      } else if (chunkType === Ga.BIN) {
        // BIN 二进制块：直接切片保存
        const binStart = fo + offset;
        this.body = glbBuffer.slice(binStart, binStart + chunkLength);
      }

      offset += chunkLength;
    }

    // 必须包含 JSON 块
    if (this.content === null)
      throw new Error("THREE.GLTFLoader: JSON content not found.");
  }
}

/**
 * 简单异或加密/解密函数（用于加密 GLB 文件）
 * @param {Uint8Array} data - 待解密数据
 * @param {number} key - 解密密钥，默认 255
 * @returns {Uint8Array} 解密后的数据
 */
function hl(data, key = 255) {
  for (let i = 0, len = data.length; i < len; i++) {
    data[i] ^= key; // 异或运算
  }
  return data;
}

/**
 * @class p
 * @classdesc glTF 2.0 核心解析器
 * 功能：解析 glTF JSON，加载资源，构建 Three.js 3D 对象
 */
class p {
  /**
   * 构造函数
   * @param {Object} json - glTF JSON 对象
   * @param {Object} options - 配置项
   */
  constructor(json = {}, options = {}) {
    this.json = json;                  // glTF 根 JSON
    this.extensions = {};              // 已启用的扩展实例
    this.plugins = {};                // 插件实例
    this.options = options;            // 配置
    this.cache = new Wl;              // 资源缓存（避免重复加载）
    this.associations = new Map;      // 资源关联映射

    // 各类缓存池，大幅提升性能
    this.primitiveCache = {};
    this.nodeCache = {};
    this.meshCache = { refs: {}, uses: {} };
    this.cameraCache = { refs: {}, uses: {} };
    this.lightCache = { refs: {}, uses: {} };
    this.sourceCache = {};
    this.textureCache = {};
    this.nodeNamesUsed = {};

    // 检测浏览器（Safari/Firefox）
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isFirefox = navigator.userAgent.indexOf("Firefox") > -1;
    const firefoxVersion = isFirefox ? navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1] : -1;

    // 根据浏览器选择纹理加载器
    if (typeof createImageBitmap === "undefined" || isSafari || (isFirefox && firefoxVersion < 98)) {
      this.textureLoader = new m.dpR(this.options.manager);
    } else {
      this.textureLoader = new m.QRU(this.options.manager);
    }

    // 初始化加载器配置
    this.textureLoader.setCrossOrigin(this.options.crossOrigin);
    this.textureLoader.setRequestHeader(this.options.requestHeader);

    this.fileLoader = new m.hH6(this.options.manager);
    this.fileLoader.setResponseType("arraybuffer");
    if (this.options.crossOrigin === "use-credentials") {
      this.fileLoader.setWithCredentials(true);
    }
  }

  // 设置扩展实例
  setExtensions(extensions) { this.extensions = extensions; }
  // 设置插件
  setPlugins(plugins) { this.plugins = plugins; }

  /**
   * 开始解析 glTF
   * @param {Function} onLoad - 成功回调
   * @param {Function} onError - 失败回调
   */
  parse(onLoad, onError) {
    const parser = this;
    const json = this.json;
    const extensions = this.extensions;

    // 清空缓存
    this.cache.removeAll();
    this.nodeCache = {};

    // 标记所有定义（骨骼、网格引用）
    this._markDefs();

    // 执行所有插件的初始化
    Promise.all(this._invokeAll(ext => ext.beforeRoot && ext.beforeRoot()))
      .then(() => {
        // 并行加载：场景、动画、相机
        return Promise.all([
          parser.getDependencies("scene"),
          parser.getDependencies("animation"),
          parser.getDependencies("camera")
        ]);
      })
      .then(results => {
        // 组装最终的 Three.js 场景对象
        const gltf = {
          scene: results[0][json.scene || 0],
          scenes: results[0],
          animations: results[1],
          cameras: results[2],
          asset: json.asset,
          parser: parser,
          userData: {}
        };

        // 应用扩展、用户数据
        eo(extensions, gltf, json);
        ns(gltf, json);

        // 执行所有插件的结束回调
        Promise.all(parser._invokeAll(ext => ext.afterRoot && ext.afterRoot(gltf)))
          .then(() => onLoad(gltf));
      })
      .catch(onError);
  }

  /**
   * 标记骨骼、网格、相机引用计数
   */
  _markDefs() {
    const nodes = this.json.nodes || [];
    const skins = this.json.skins || [];
    const meshes = this.json.meshes || [];

    // 标记骨骼节点
    for (let skin of skins) {
      for (let jointIdx of skin.joints) {
        nodes[jointIdx].isBone = true;
      }
    }

    // 标记网格、相机引用
    for (let node of nodes) {
      if (node.mesh !== undefined) {
        this._addNodeRef(this.meshCache, node.mesh);
        if (node.skin !== undefined) meshes[node.mesh].isSkinnedMesh = true;
      }
      if (node.camera !== undefined) this._addNodeRef(this.cameraCache, node.camera);
    }
  }

  // 添加节点引用计数
  _addNodeRef(cache, index) {
    if (index === undefined) return;
    if (!cache.refs[index]) cache.refs[index] = cache.uses[index] = 0;
    cache.refs[index]++;
  }

  // --------------------------
  // 插件调用工具函数
  // --------------------------
  _invokeOne(callback) {
    const exts = Object.values(this.plugins);
    exts.push(this);
    for (let ext of exts) {
      const result = callback(ext);
      if (result) return result;
    }
    return null;
  }
  _invokeAll(callback) {
    const exts = Object.values(this.plugins);
    exts.unshift(this);
    const results = [];
    for (let ext of exts) {
      const res = callback(ext);
      if (res) results.push(res);
    }
    return results;
  }

  // --------------------------
  // 核心依赖加载（统一入口）
  // --------------------------
  getDependency(type, index) {
    const key = `${type}:${index}`;
    let dependency = this.cache.get(key);

    if (!dependency) {
      switch (type) {
        case "scene": dependency = this.loadScene(index); break;
        case "node": dependency = this._invokeOne(p => p.loadNode && p.loadNode(index)); break;
        case "mesh": dependency = this._invokeOne(p => p.loadMesh && p.loadMesh(index)); break;
        case "accessor": dependency = this.loadAccessor(index); break;
        case "bufferView": dependency = this._invokeOne(p => p.loadBufferView && p.loadBufferView(index)); break;
        case "buffer": dependency = this.loadBuffer(index); break;
        case "material": dependency = this._invokeOne(p => p.loadMaterial && p.loadMaterial(index)); break;
        case "texture": dependency = this._invokeOne(p => p.loadTexture && p.loadTexture(index)); break;
        case "skin": dependency = this.loadSkin(index); break;
        case "animation": dependency = this._invokeOne(p => p.loadAnimation && p.loadAnimation(index)); break;
        case "camera": dependency = this.loadCamera(index); break;
        default:
          dependency = this._invokeOne(p => p !== this && p.getDependency && p.getDependency(type, index));
          if (!dependency) throw new Error("Unknown type: " + type);
      }
      this.cache.add(key, dependency);
    }
    return dependency;
  }

  // 批量加载某类资源
  getDependencies(type) {
    let cached = this.cache.get(type);
    if (!cached) {
      const items = this.json[type + (type === "mesh" ? "es" : "s")] || [];
      cached = Promise.all(items.map((_, i) => this.getDependency(type, i)));
      this.cache.add(type, cached);
    }
    return cached;
  }

  // --------------------------
  // 底层资源加载
  // --------------------------
  loadBuffer(index) {
    const buffer = this.json.buffers[index];
    if (buffer.uri === undefined && index === 0) {
      return Promise.resolve(this.extensions[ti.KHR_BINARY_GLTF].body);
    }
    return this.fileLoader.loadAsync(...);
  }

  loadBufferView(index) {
    const bv = this.json.bufferViews[index];
    return this.getDependency("buffer", bv.buffer).then(buf =>
      buf.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + (bv.byteLength || 0))
    );
  }

  loadAccessor(index) { /* 解析顶点数据 */ }
  loadTexture(index) { /* 解析纹理 */ }
  loadMaterial(index) { /* 解析 PBR 材质 */ }
  loadMesh(index) { /* 解析网格模型 */ }
  loadCamera(index) { /* 解析相机 */ }
  loadSkin(index) { /* 解析骨骼蒙皮 */ }
  loadAnimation(index) { /* 解析骨骼动画 */ }
  loadScene(index) { /* 解析场景根节点 */ }
}

/**
 * 顶层 glTF 解析入口函数
 * @param {string|ArrayBuffer|Object} data - 输入数据（字符串/GLB/JSON）
 * @param {string} path - 资源路径
 * @param {Function} onLoad - 成功
 * @param {Function} onError - 失败
 * @param {Array} additionalFiles - 附加文件
 */
parse(data, path, onLoad, onError, additionalFiles) {
  let gltfJSON;
  const extensions = {};
  const plugins = {};
  const textDecoder = new TextDecoder();

  // --------------------------
  // 1. 解析输入数据
  // --------------------------
  if (typeof data === "string") {
    // 字符串 → JSON 解析
    gltfJSON = JSON.parse(data);
  } else if (data instanceof ArrayBuffer) {
    // 二进制数据 → 判断是否是 GLB
    const headerStr = new Uint8Array(data, 0, 4).join("");
    if (headerStr === ma || headerStr === nr) {
      // 是 GLB → 使用 dl 类解析
      try {
        extensions[ti.KHR_BINARY_GLTF] = new dl(data);
      } catch (err) {
        onError && onError(err);
        return;
      }
      gltfJSON = JSON.parse(extensions[ti.KHR_BINARY_GLTF].content);
    } else {
      // 普通二进制 JSON
      gltfJSON = JSON.parse(textDecoder.decode(data));
    }
  } else {
    // 已经是对象
    gltfJSON = data;
  }

  // --------------------------
  // 2. 版本校验（必须 ≥ 2.0）
  // --------------------------
  if (!gltfJSON.asset || gltfJSON.asset.version[0] < 2) {
    onError(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));
    return;
  }

  // --------------------------
  // 3. 创建核心解析器实例
  // --------------------------
  const parser = new p(gltfJSON, {
    path: path || this.resourcePath || "",
    crossOrigin: this.crossOrigin,
    requestHeader: this.requestHeader,
    manager: this.manager,
    ktx2Loader: this.ktx2Loader,
    meshoptDecoder: this.meshoptDecoder
  });
  parser.fileLoader.setRequestHeader(this.requestHeader);

  // --------------------------
  // 4. 注册用户插件
  // --------------------------
  for (let cb of this.pluginCallbacks) {
    const plugin = cb(parser);
    plugins[plugin.name] = plugin;
    extensions[plugin.name] = true;
  }

  // --------------------------
  // 5. 初始化官方扩展
  // --------------------------
  if (gltfJSON.extensionsUsed) {
    for (let extName of gltfJSON.extensionsUsed) {
      const required = gltfJSON.extensionsRequired || [];
      switch (extName) {
        case ti.KHR_MATERIALS_UNLIT:
          extensions[extName] = new Xr();
          break;
        case ti.KHR_DRACO_MESH_COMPRESSION:
          extensions[extName] = new fl(gltfJSON, this.dracoLoader);
          break;
        case ti.KHR_TEXTURE_TRANSFORM:
          extensions[extName] = new pl();
          break;
        case ti.KHR_MESH_QUANTIZATION:
          extensions[extName] = new ga();
          break;
        default:
          // 必须扩展但未支持 → 警告
          if (required.includes(extName) && !plugins[extName]) {
            console.warn(`THREE.GLTFLoader: Unknown extension "${extName}".`);
          }
      }
    }
  }

  // --------------------------
  // 6. 启动解析
  // --------------------------
  gltfJSON.additionalFiles = additionalFiles;
  parser.setExtensions(extensions);
  parser.setPlugins(plugins);
  parser.parse(onLoad, onError);
}


/**
 * 【核心】P —— glTF 2.0 模型解析器
 * 作用：把 glTF JSON、二进制数据 → 转换成 Three.js 对象（场景、网格、材质、动画、相机）
 */
class P {
    /**
     * 构造函数
     * @param {Object} json - glTF JSON 数据
     * @param {Object} options - 配置项
     */
    constructor(json = {}, options = {}) {
        // 核心数据
        this.json = json;                 // glTF 根 JSON
        this.extensions = {};             // 扩展实例（Draco、KHR_texture_transform 等）
        this.plugins = {};                // 插件实例
        this.options = options;           // 配置

        // 各种缓存（避免重复解析）
        this.cache = new Cache();         // 通用缓存
        this.associations = new Map();    // Three 对象 ↔ glTF 索引 映射关系
        this.primitiveCache = {};         // 图元缓存
        this.nodeCache = {};              // 节点缓存
        this.meshCache = { refs: {}, uses: {} }; // 网格引用计数
        this.cameraCache = { refs: {}, uses: {} };
        this.lightCache = { refs: {}, uses: {} };

        // 纹理/材质缓存
        this.sourceCache = {};
        this.textureCache = {};
        this.nodeNamesUsed = {}; // 防止节点重名

        // ------------------------------
        // 浏览器环境判断（Safari / Firefox）
        // ------------------------------
        let isSafari = false;
        let isFirefox = false;
        let firefoxVersion = -1;

        if (typeof navigator !== "undefined") {
            isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            isFirefox = navigator.userAgent.indexOf("Firefox") > -1;
            firefoxVersion = isFirefox ? navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1] : -1;
        }

        // ------------------------------
        // 选择纹理加载器
        // 低版本火狐/Safari 不支持 ImageBitmap → 使用普通 ImageLoader
        // ------------------------------
        if (typeof createImageBitmap === 'undefined' || isSafari || (isFirefox && firefoxVersion < 98)) {
            this.textureLoader = new THREE.ImageLoader(options.manager);
        } else {
            this.textureLoader = new THREE.ImageBitmapLoader(options.manager);
        }

        this.textureLoader.setCrossOrigin(options.crossOrigin);
        this.textureLoader.setRequestHeader(options.requestHeader);

        // 文件加载器（加载 buffer 二进制）
        this.fileLoader = new THREE.FileLoader(options.manager);
        this.fileLoader.setResponseType('arraybuffer');

        // 跨域凭证
        if (options.crossOrigin === 'use-credentials') {
            this.fileLoader.setWithCredentials(true);
        }
    }

    // 设置扩展实例
    setExtensions(extensions) {
        this.extensions = extensions;
    }

    // 设置插件
    setPlugins(plugins) {
        this.plugins = plugins;
    }

    /**
     * 【主入口】开始解析整个 glTF 文件
     * @param {Function} onLoad - 完成回调
     * @param {Function} onError - 失败回调
     */
    parse(onLoad, onError) {
        const scope = this;
        const json = this.json;
        const extensions = this.extensions;

        // 清空缓存
        this.cache.removeAll();
        this.nodeCache = {};

        // 1. 标记所有骨骼、蒙皮、网格引用
        this._invokeAll(ext => ext._markDefs && ext._markDefs());

        // 2. 执行所有插件的 beforeRoot
        Promise.all(this._invokeAll(ext => ext.beforeRoot && ext.beforeRoot()))
            .then(() => {
                // 3. 并行加载：场景、动画、相机
                return Promise.all([
                    this.getDependencies('scene'),
                    this.getDependencies('animation'),
                    this.getDependencies('camera'),
                ]);
            })
            .then(results => {
                // 4. 组装最终 glTF 对象
                const gltf = {
                    scene: results[0][json.scene || 0],  // 默认场景
                    scenes: results[0],                  // 所有场景
                    animations: results[1],              // 所有动画
                    cameras: results[2],                 // 所有相机
                    asset: json.asset,                   // 文件信息
                    parser: scope,                       // 自身引用
                    userData: {}
                };

                // 执行扩展处理
                assignExtrasToObject(extensions, gltf, json);
                assignUserData(gltf, json);

                // 5. 执行所有插件的 afterRoot
                return Promise.all(
                    scope._invokeAll(plugin => plugin.afterRoot && plugin.afterRoot(gltf))
                ).then(() => {
                    onLoad(gltf); // 解析完成！
                });
            })
            .catch(onError);
    }

    /**
     * 标记骨骼、蒙皮、网格、相机引用关系
     * 作用：提前知道哪些节点是骨骼、哪些被引用
     */
    _markDefs() {
        const json = this.json;
        const nodes = json.nodes || [];
        const skins = json.skins || [];
        const meshes = json.meshes || [];

        // 皮肤 → 标记关节为骨骼
        for (let i = 0; i < skins.length; i++) {
            const skin = skins[i];
            for (let j = 0; j < skin.joints.length; j++) {
                nodes[skin.joints[j]].isBone = true;
            }
        }

        // 节点 → 标记引用的网格、相机
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.mesh !== undefined) {
                this._addNodeRef(this.meshCache, node.mesh);
                if (node.skin !== undefined) {
                    meshes[node.mesh].isSkinnedMesh = true;
                }
            }
            if (node.camera !== undefined) {
                this._addNodeRef(this.cameraCache, node.camera);
            }
        }
    }

    // 增加节点引用计数（用于实例化）
    _addNodeRef(cache, index) {
        if (index === undefined) return;
        if (!cache.refs[index]) cache.refs[index] = 0;
        cache.refs[index]++;
    }

    // 实例化复用对象（多节点引用同一个网格时克隆）
    _getNodeRef(cache, index, object) {
        if (cache.refs[index] <= 1) return object;

        const clone = object.clone();
        clone.name += '_instance_' + cache.uses[index]++;
        return clone;
    }

    // 调用一个插件的方法
    _invokeOne(func) {
        const plugins = Object.values(this.plugins);
        plugins.push(this);

        for (let i = 0; i < plugins.length; i++) {
            const result = func(plugins[i]);
            if (result) return result;
        }
        return null;
    }

    // 调用所有插件的方法
    _invokeAll(func) {
        const plugins = Object.values(this.plugins);
        plugins.unshift(this);

        const results = [];
        for (let i = 0; i < plugins.length; i++) {
            const r = func(plugins[i]);
            if (r) results.push(r);
        }
        return results;
    }

    // ======================================================
    // 【核心依赖加载】
    // 根据类型（scene/node/mesh/material/texture）加载对象
    // ======================================================
    getDependency(type, index) {
        const key = type + ':' + index;
        let dependency = this.cache.get(key);

        if (!dependency) {
            switch (type) {
                case 'scene':
                    dependency = this.loadScene(index);
                    break;
                case 'node':
                    dependency = this._invokeOne(p => p.loadNode && p.loadNode(index));
                    break;
                case 'mesh':
                    dependency = this._invokeOne(p => p.loadMesh && p.loadMesh(index));
                    break;
                case 'accessor':
                    dependency = this.loadAccessor(index);
                    break;
                case 'bufferView':
                    dependency = this._invokeOne(p => p.loadBufferView && p.loadBufferView(index));
                    break;
                case 'buffer':
                    dependency = this.loadBuffer(index);
                    break;
                case 'material':
                    dependency = this._invokeOne(p => p.loadMaterial && p.loadMaterial(index));
                    break;
                case 'texture':
                    dependency = this._invokeOne(p => p.loadTexture && p.loadTexture(index));
                    break;
                case 'skin':
                    dependency = this.loadSkin(index);
                    break;
                case 'animation':
                    dependency = this._invokeOne(p => p.loadAnimation && p.loadAnimation(index));
                    break;
                case 'camera':
                    dependency = this.loadCamera(index);
                    break;
                default:
                    dependency = this._invokeOne(p => p !== this && p.getDependency && p.getDependency(type, index));
                    if (!dependency) throw new Error('Unknown type: ' + type);
                    break;
            }

            this.cache.add(key, dependency);
        }

        return dependency;
    }

    // 加载某一类所有资源
    getDependencies(type) {
        let cacheKey = this.cache.get(type);
        if (!cacheKey) {
            const scope = this;
            const array = this.json[type + (type === 'mesh' ? 'es' : 's')] || [];
            cacheKey = Promise.all(array.map((_, i) => scope.getDependency(type, i)));
            this.cache.add(type, cacheKey);
        }
        return cacheKey;
    }

    // ======================================================
    // 底层资源加载
    // ======================================================

    /** 加载 buffer（二进制数据） */
    loadBuffer(index) {
        const buffer = this.json.buffers[index];
        const fileLoader = this.fileLoader;

        if (buffer.type && buffer.type !== 'arraybuffer') {
            throw new Error('THREE.GLTFLoader: Unsupported buffer type.');
        }

        // GLB 内置 buffer → 直接返回解析好的 body
        if (buffer.uri === undefined && index === 0) {
            return Promise.resolve(this.extensions['KHR_binary_glTF'].body);
        }

        // 加载外部 .bin 文件
        return new Promise((resolve, reject) => {
            fileLoader.load(
                resolveURL(buffer.uri, this.options.path),
                resolve,
                undefined,
                () => reject(new Error('Failed to load buffer'))
            );
        });
    }

    /** 加载 bufferView（二进制切片） */
    loadBufferView(index) {
        const bv = this.json.bufferViews[index];
        return this.getDependency('buffer', bv.buffer).then(buffer => {
            const byteLength = bv.byteLength || 0;
            const byteOffset = bv.byteOffset || 0;
            return buffer.slice(byteOffset, byteOffset + byteLength);
        });
    }

    /** 加载访问器（顶点、法线、UV、权重等） */
    loadAccessor(index) {
        // 从 bufferView 读取二进制 → 生成 typed array → Three.js BufferAttribute
        // 支持稀疏数据、 interleaved 内存、归一化等 glTF 高级特性
    }

    /** 加载纹理 */
    loadTexture(index) {
        // 加载图片 → 处理 sampler → 翻转、颜色空间、压缩格式
    }

    /** 加载材质（PBR/Unlit） */
    loadMaterial(index) {
        // 解析 PBR 金属/粗糙度
        // 解析基础色、金属度、粗糙度、法线、AO、自发光
        // 支持扩展：清漆、透射、薄膜、体积、自发光强度
    }

    /** 加载网格（geometry + material） */
    loadMesh(index) {
        // 解析 primitives → 生成 Geometry → 生成 Mesh
        // 支持：三角带、三角扇、点、线、蒙皮、变形目标
    }

    /** 加载节点（Object3D） */
    loadNode(index) {
        // 矩阵/旋转/平移/缩放
        // 挂载 mesh / camera / light
        // 处理父子关系
    }

    /** 加载场景 */
    loadScene(index) {
        // 组装所有节点 → 生成 Scene
    }

    /** 加载相机 */
    loadCamera(index) {
        // 透视/正交相机
    }

    /** 加载皮肤（蒙皮） */
    loadSkin(index) {
        // 骨骼 + 逆绑定矩阵
    }

    /** 加载动画 */
    loadAnimation(index) {
        // 解析通道、采样器 → 生成 KeyframeTrack / AnimationClip
        // 支持平移、旋转、缩放、变形目标权重
    }
}