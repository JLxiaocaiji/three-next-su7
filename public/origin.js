parse(y, b, E, T, L) {
                let F;
                const j = {}
                  , W = {}
                  , re = new TextDecoder;
                if (typeof y == "string")
                    F = JSON.parse(y);
                else if (y instanceof ArrayBuffer) {
                    const te = new Uint8Array(y,0,4).join("");
                    if (te === ma || te === nr) {
                        try {
                            j[ti.KHR_BINARY_GLTF] = new dl(y)
                        } catch (Te) {
                            T && T(Te);
                            return
                        }
                        F = JSON.parse(j[ti.KHR_BINARY_GLTF].content)
                    } else
                        F = JSON.parse(re.decode(y))
                } else
                    F = y;
                if (F.asset === void 0 || F.asset.version[0] < 2) {
                    T && T(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));
                    return
                }
                const fe = new p(F,{
                    path: b || this.resourcePath || "",
                    crossOrigin: this.crossOrigin,
                    requestHeader: this.requestHeader,
                    manager: this.manager,
                    ktx2Loader: this.ktx2Loader,
                    meshoptDecoder: this.meshoptDecoder
                });
                fe.fileLoader.setRequestHeader(this.requestHeader);
                for (let te = 0; te < this.pluginCallbacks.length; te++) {
                    const Te = this.pluginCallbacks[te](fe);
                    W[Te.name] = Te,
                    j[Te.name] = !0
                }
                if (F.extensionsUsed)
                    for (let te = 0; te < F.extensionsUsed.length; ++te) {
                        const Te = F.extensionsUsed[te]
                          , Ge = F.extensionsRequired || [];
                        switch (Te) {
                        case ti.KHR_MATERIALS_UNLIT:
                            j[Te] = new Xr;
                            break;
                        case ti.KHR_DRACO_MESH_COMPRESSION:
                            j[Te] = new fl(F,this.dracoLoader);
                            break;
                        case ti.KHR_TEXTURE_TRANSFORM:
                            j[Te] = new pl;
                            break;
                        case ti.KHR_MESH_QUANTIZATION:
                            j[Te] = new ga;
                            break;
                        default:
                            Ge.indexOf(Te) >= 0 && W[Te] === void 0 && console.warn('THREE.GLTFLoader: Unknown extension "' + Te + '".')
                        }
                    }
                F.additionalFiles = L,
                fe.setExtensions(j),
                fe.setPlugins(W),
                fe.parse(E, T)
            }

class p {
    constructor(y={}, b={}) {
        this.json = y,
        this.extensions = {},
        this.plugins = {},
        this.options = b,
        this.cache = new Wl,
        this.associations = new Map,
        this.primitiveCache = {},
        this.nodeCache = {},
        this.meshCache = {
            refs: {},
            uses: {}
        },
        this.cameraCache = {
            refs: {},
            uses: {}
        },
        this.lightCache = {
            refs: {},
            uses: {}
        },
        this.sourceCache = {},
        this.textureCache = {},
        this.nodeNamesUsed = {};
        let E = !1
            , T = !1
            , L = -1;
        typeof navigator < "u" && (E = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) === !0,
        T = navigator.userAgent.indexOf("Firefox") > -1,
        L = T ? navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1] : -1),
        typeof createImageBitmap > "u" || E || T && L < 98 ? this.textureLoader = new m.dpR(this.options.manager) : this.textureLoader = new m.QRU(this.options.manager),
        this.textureLoader.setCrossOrigin(this.options.crossOrigin),
        this.textureLoader.setRequestHeader(this.options.requestHeader),
        this.fileLoader = new m.hH6(this.options.manager),
        this.fileLoader.setResponseType("arraybuffer"),
        this.options.crossOrigin === "use-credentials" && this.fileLoader.setWithCredentials(!0)
    }
    setExtensions(y) {
        this.extensions = y
    }
    setPlugins(y) {
        this.plugins = y
    }
    parse(y, b) {
        const E = this
            , T = this.json
            , L = this.extensions;
        this.cache.removeAll(),
        this.nodeCache = {},
        this._invokeAll(function(F) {
            return F._markDefs && F._markDefs()
        }),
        Promise.all(this._invokeAll(function(F) {
            return F.beforeRoot && F.beforeRoot()
        })).then(function() {
            return Promise.all([E.getDependencies("scene"), E.getDependencies("animation"), E.getDependencies("camera")])
        }).then(function(F) {
            const j = {
                scene: F[0][T.scene || 0],
                scenes: F[0],
                animations: F[1],
                cameras: F[2],
                asset: T.asset,
                parser: E,
                userData: {}
            };
            eo(L, j, T),
            ns(j, T),
            Promise.all(E._invokeAll(function(W) {
                return W.afterRoot && W.afterRoot(j)
            })).then(function() {
                y(j)
            })
        }).catch(b)
    }
    _markDefs() {
        const y = this.json.nodes || []
            , b = this.json.skins || []
            , E = this.json.meshes || [];
        for (let T = 0, L = b.length; T < L; T++) {
            const F = b[T].joints;
            for (let j = 0, W = F.length; j < W; j++)
                y[F[j]].isBone = !0
        }
        for (let T = 0, L = y.length; T < L; T++) {
            const F = y[T];
            F.mesh !== void 0 && (this._addNodeRef(this.meshCache, F.mesh),
            F.skin !== void 0 && (E[F.mesh].isSkinnedMesh = !0)),
            F.camera !== void 0 && this._addNodeRef(this.cameraCache, F.camera)
        }
    }
    _addNodeRef(y, b) {
        b !== void 0 && (y.refs[b] === void 0 && (y.refs[b] = y.uses[b] = 0),
        y.refs[b]++)
    }
    _getNodeRef(y, b, E) {
        if (y.refs[b] <= 1)
            return E;
        const T = E.clone()
            , L = (F, j) => {
            const W = this.associations.get(F);
            W != null && this.associations.set(j, W);
            for (const [re,fe] of F.children.entries())
                L(fe, j.children[re])
        }
        ;
        return L(E, T),
        T.name += "_instance_" + y.uses[b]++,
        T
    }
    _invokeOne(y) {
        const b = Object.values(this.plugins);
        b.push(this);
        for (let E = 0; E < b.length; E++) {
            const T = y(b[E]);
            if (T)
                return T
        }
        return null
    }
    _invokeAll(y) {
        const b = Object.values(this.plugins);
        b.unshift(this);
        const E = [];
        for (let T = 0; T < b.length; T++) {
            const L = y(b[T]);
            L && E.push(L)
        }
        return E
    }
    getDependency(y, b) {
        const E = y + ":" + b;
        let T = this.cache.get(E);
        if (!T) {
            switch (y) {
            case "scene":
                T = this.loadScene(b);
                break;
            case "node":
                T = this._invokeOne(function(L) {
                    return L.loadNode && L.loadNode(b)
                });
                break;
            case "mesh":
                T = this._invokeOne(function(L) {
                    return L.loadMesh && L.loadMesh(b)
                });
                break;
            case "accessor":
                T = this.loadAccessor(b);
                break;
            case "bufferView":
                T = this._invokeOne(function(L) {
                    return L.loadBufferView && L.loadBufferView(b)
                });
                break;
            case "buffer":
                T = this.loadBuffer(b);
                break;
            case "material":
                T = this._invokeOne(function(L) {
                    return L.loadMaterial && L.loadMaterial(b)
                });
                break;
            case "texture":
                T = this._invokeOne(function(L) {
                    return L.loadTexture && L.loadTexture(b)
                });
                break;
            case "skin":
                T = this.loadSkin(b);
                break;
            case "animation":
                T = this._invokeOne(function(L) {
                    return L.loadAnimation && L.loadAnimation(b)
                });
                break;
            case "camera":
                T = this.loadCamera(b);
                break;
            default:
                if (T = this._invokeOne(function(L) {
                    return L != this && L.getDependency && L.getDependency(y, b)
                }),
                !T)
                    throw new Error("Unknown type: " + y);
                break
            }
            this.cache.add(E, T)
        }
        return T
    }
    getDependencies(y) {
        let b = this.cache.get(y);
        if (!b) {
            const E = this
                , T = this.json[y + (y === "mesh" ? "es" : "s")] || [];
            b = Promise.all(T.map(function(L, F) {
                return E.getDependency(y, F)
            })),
            this.cache.add(y, b)
        }
        return b
    }
    loadBuffer(y) {
        const b = this.json.buffers[y]
            , E = this.fileLoader;
        if (b.type && b.type !== "arraybuffer")
            throw new Error("THREE.GLTFLoader: " + b.type + " buffer type is not supported.");
        if (b.uri === void 0 && y === 0)
            return Promise.resolve(this.extensions[ti.KHR_BINARY_GLTF].body);
        let T = this.json.additionalFiles
            , L = T ? T.find(j => j.name === b.uri) : null;
        const F = this.options;
        return new Promise(function(j, W) {
            E.load(m.Zp0.resolveURL(b.uri, F.path), j, void 0, function() {
                W(new Error('THREE.GLTFLoader: Failed to load buffer "' + b.uri + '".'))
            }, L)
        }
        )
    }
    loadBufferView(y) {
        const b = this.json.bufferViews[y];
        return this.getDependency("buffer", b.buffer).then(function(E) {
            const T = b.byteLength || 0
                , L = b.byteOffset || 0;
            return E.slice(L, L + T)
        })
    }
    loadAccessor(y) {
        const b = this
            , E = this.json
            , T = this.json.accessors[y];
        if (T.bufferView === void 0 && T.sparse === void 0) {
            const F = Mo[T.type]
                , j = Qr[T.componentType]
                , W = T.normalized === !0
                , re = new j(T.count * F);
            return Promise.resolve(new m.TlE(re,F,W))
        }
        const L = [];
        return T.bufferView !== void 0 ? L.push(this.getDependency("bufferView", T.bufferView)) : L.push(null),
        T.sparse !== void 0 && (L.push(this.getDependency("bufferView", T.sparse.indices.bufferView)),
        L.push(this.getDependency("bufferView", T.sparse.values.bufferView))),
        Promise.all(L).then(function(F) {
            const j = F[0]
                , W = Mo[T.type]
                , re = Qr[T.componentType]
                , fe = re.BYTES_PER_ELEMENT
                , te = fe * W
                , Te = T.byteOffset || 0
                , Ge = T.bufferView !== void 0 ? E.bufferViews[T.bufferView].byteStride : void 0
                , St = T.normalized === !0;
            let kt, Vt;
            if (Ge && Ge !== te) {
                const gt = Math.floor(Te / Ge)
                    , xt = "InterleavedBuffer:" + T.bufferView + ":" + T.componentType + ":" + gt + ":" + T.count;
                let Xe = b.cache.get(xt);
                Xe || (kt = new re(j,gt * Ge,T.count * Ge / fe),
                Xe = new m.vpT(kt,Ge / fe),
                b.cache.add(xt, Xe)),
                Vt = new m.kB5(Xe,W,Te % Ge / fe,St)
            } else
                j === null ? kt = new re(T.count * W) : kt = new re(j,Te,T.count * W),
                Vt = new m.TlE(kt,W,St);
            if (T.sparse !== void 0) {
                const gt = Mo.SCALAR
                    , xt = Qr[T.sparse.indices.componentType]
                    , Xe = T.sparse.indices.byteOffset || 0
                    , ut = T.sparse.values.byteOffset || 0
                    , dn = new xt(F[1],Xe,T.sparse.count * gt)
                    , qt = new re(F[2],ut,T.sparse.count * W);
                j !== null && (Vt = new m.TlE(Vt.array.slice(),Vt.itemSize,Vt.normalized));
                for (let ln = 0, Tn = dn.length; ln < Tn; ln++) {
                    const fn = dn[ln];
                    if (Vt.setX(fn, qt[ln * W]),
                    W >= 2 && Vt.setY(fn, qt[ln * W + 1]),
                    W >= 3 && Vt.setZ(fn, qt[ln * W + 2]),
                    W >= 4 && Vt.setW(fn, qt[ln * W + 3]),
                    W >= 5)
                        throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")
                }
            }
            return Vt
        })
    }
    loadTexture(y) {
        const b = this.json
            , E = this.options
            , L = b.textures[y].source
            , F = b.images[L];
        let j = this.textureLoader;
        if (F.uri) {
            const W = E.manager.getHandler(F.uri);
            W !== null && (j = W)
        }
        return this.loadTextureImage(y, L, j)
    }
    loadTextureImage(y, b, E) {
        const T = this
            , L = this.json
            , F = L.textures[y]
            , j = L.images[b]
            , W = (j.uri || j.bufferView) + ":" + F.sampler;
        if (this.textureCache[W])
            return this.textureCache[W];
        const re = this.loadImageSource(b, E).then(function(fe) {
            fe.flipY = !1,
            fe.name = F.name || j.name || "";
            const Te = (L.samplers || {})[F.sampler] || {};
            return fe.magFilter = va[Te.magFilter] || m.wem,
            fe.minFilter = va[Te.minFilter] || m.D1R,
            fe.wrapS = po[Te.wrapS] || m.rpg,
            fe.wrapT = po[Te.wrapT] || m.rpg,
            T.associations.set(fe, {
                textures: y
            }),
            fe
        }).catch(function() {
            return null
        });
        return this.textureCache[W] = re,
        re
    }
    loadImageSource(y, b) {
        const E = this
            , T = this.json
            , L = this.options;
        if (this.sourceCache[y] !== void 0)
            return this.sourceCache[y].then(te => te.clone());
        const F = T.images[y]
            , j = self.URL || self.webkitURL;
        let W = F.uri || ""
            , re = !1;
        if (F.bufferView !== void 0)
            W = E.getDependency("bufferView", F.bufferView).then(function(te) {
                re = !0;
                const Te = new Blob([te],{
                    type: F.mimeType
                });
                return W = j.createObjectURL(Te),
                W
            });
        else {
            if (F.uri === void 0)
                throw new Error("THREE.GLTFLoader: Image " + y + " is missing URI and bufferView");
            if (T.additionalFiles) {
                let te = W.split("\\").pop().split("/").pop()
                    , Te = T.additionalFiles.find(Ge => te === Ge.name);
                Te && (W = (0,
                Js.hR)(Te))
            }
        }
        const fe = Promise.resolve(W).then(function(te) {
            return new Promise(function(Te, Ge) {
                let St = Te;
                b.isImageBitmapLoader === !0 && (St = function(kt) {
                    const Vt = new m.xEZ(kt);
                    Vt.needsUpdate = !0,
                    Te(Vt)
                }
                ),
                b.load(m.Zp0.resolveURL(te, L.path), St, void 0, Ge)
            }
            )
        }).then(function(te) {
            return re === !0 && j.revokeObjectURL(W),
            te.userData.mimeType = F.mimeType || Gs(F.uri),
            te
        }).catch(function(te) {
            throw console.error("THREE.GLTFLoader: Couldn't load texture", W),
            te
        });
        return this.sourceCache[y] = fe,
        fe
    }
    assignTexture(y, b, E, T) {
        const L = this;
        return this.getDependency("texture", E.index).then(function(F) {
            if (!F)
                return null;
            if (E.texCoord !== void 0 && E.texCoord != 0 && !(b === "aoMap" && E.texCoord == 1) && console.warn("THREE.GLTFLoader: Custom UV set " + E.texCoord + " for texture " + b + " not yet supported."),
            L.extensions[ti.KHR_TEXTURE_TRANSFORM]) {
                const j = E.extensions !== void 0 ? E.extensions[ti.KHR_TEXTURE_TRANSFORM] : void 0;
                if (j) {
                    const W = L.associations.get(F);
                    F = L.extensions[ti.KHR_TEXTURE_TRANSFORM].extendTexture(F, j),
                    L.associations.set(F, W)
                }
            }
            return T !== void 0 && (F.encoding = T),
            y[b] = F,
            F
        })
    }
    assignFinalMaterial(y) {
        const b = y.geometry;
        let E = y.material;
        const T = b.attributes.tangent === void 0
            , L = b.attributes.color !== void 0
            , F = b.attributes.normal === void 0;
        if (y.isPoints) {
            const j = "PointsMaterial:" + E.uuid;
            let W = this.cache.get(j);
            W || (W = new m.UY4,
            m.F5T.prototype.copy.call(W, E),
            W.color.copy(E.color),
            W.map = E.map,
            W.sizeAttenuation = !1,
            this.cache.add(j, W)),
            E = W
        } else if (y.isLine) {
            const j = "LineBasicMaterial:" + E.uuid;
            let W = this.cache.get(j);
            W || (W = new m.nls,
            m.F5T.prototype.copy.call(W, E),
            W.color.copy(E.color),
            this.cache.add(j, W)),
            E = W
        }
        if (T || L || F) {
            let j = "ClonedMaterial:" + E.uuid + ":";
            T && (j += "derivative-tangents:"),
            L && (j += "vertex-colors:"),
            F && (j += "flat-shading:");
            let W = this.cache.get(j);
            W || (W = E.clone(),
            L && (W.vertexColors = !0),
            F && (W.flatShading = !0),
            T && (W.normalScale && (W.normalScale.y *= -1),
            W.clearcoatNormalScale && (W.clearcoatNormalScale.y *= -1)),
            this.cache.add(j, W),
            this.associations.set(W, this.associations.get(E))),
            E = W
        }
        E.aoMap && b.attributes.uv2 === void 0 && b.attributes.uv !== void 0 && b.setAttribute("uv2", b.attributes.uv),
        y.material = E
    }
    getMaterialType() {
        return m.Wid
    }
    loadMaterial(y) {
        const b = this
            , E = this.json
            , T = this.extensions
            , L = E.materials[y];
        let F;
        const j = {}
            , W = L.extensions || {}
            , re = [];
        if (W[ti.KHR_MATERIALS_UNLIT]) {
            const te = T[ti.KHR_MATERIALS_UNLIT];
            F = te.getMaterialType(),
            re.push(te.extendParams(j, L, b))
        } else {
            const te = L.pbrMetallicRoughness || {};
            if (j.color = new m.Ilk(1,1,1),
            j.opacity = 1,
            Array.isArray(te.baseColorFactor)) {
                const Te = te.baseColorFactor;
                j.color.fromArray(Te),
                j.opacity = Te[3]
            }
            te.baseColorTexture !== void 0 && re.push(b.assignTexture(j, "map", te.baseColorTexture, m.knz)),
            j.metalness = te.metallicFactor !== void 0 ? te.metallicFactor : 1,
            j.roughness = te.roughnessFactor !== void 0 ? te.roughnessFactor : 1,
            te.metallicRoughnessTexture !== void 0 && (re.push(b.assignTexture(j, "metalnessMap", te.metallicRoughnessTexture)),
            re.push(b.assignTexture(j, "roughnessMap", te.metallicRoughnessTexture))),
            F = this._invokeOne(function(Te) {
                return Te.getMaterialType && Te.getMaterialType(y)
            }),
            re.push(Promise.all(this._invokeAll(function(Te) {
                return Te.extendMaterialParams && Te.extendMaterialParams(y, j)
            })))
        }
        L.doubleSided === !0 && (j.side = m.ehD);
        const fe = L.alphaMode || Co.OPAQUE;
        if (fe === Co.BLEND ? (j.transparent = !0,
        j.depthWrite = !1) : (j.transparent = !1,
        fe === Co.MASK && (j.alphaTest = L.alphaCutoff !== void 0 ? L.alphaCutoff : .5)),
        L.normalTexture !== void 0 && F !== m.vBJ && (re.push(b.assignTexture(j, "normalMap", L.normalTexture)),
        j.normalScale = new m.FM8(1,1),
        L.normalTexture.scale !== void 0)) {
            const te = L.normalTexture.scale;
            j.normalScale.set(te, te)
        }
        return L.occlusionTexture !== void 0 && F !== m.vBJ && (re.push(b.assignTexture(j, "aoMap", L.occlusionTexture)),
        L.occlusionTexture.strength !== void 0 && (j.aoMapIntensity = L.occlusionTexture.strength)),
        L.emissiveFactor !== void 0 && F !== m.vBJ && (j.emissive = new m.Ilk().fromArray(L.emissiveFactor)),
        L.emissiveTexture !== void 0 && F !== m.vBJ && re.push(b.assignTexture(j, "emissiveMap", L.emissiveTexture, m.knz)),
        Promise.all(re).then(function() {
            const te = new F(j);
            return L.name && (te.name = L.name),
            ns(te, L),
            b.associations.set(te, {
                materials: y
            }),
            L.extensions && eo(T, te, L),
            te
        })
    }
    createUniqueName(y) {
        const b = m.iUV.sanitizeNodeName(y || "");
        let E = b;
        for (let T = 1; this.nodeNamesUsed[E]; ++T)
            E = b + "_" + T;
        return this.nodeNamesUsed[E] = !0,
        E
    }
    loadGeometries(y) {
        const b = this
            , E = this.extensions
            , T = this.primitiveCache;
        function L(j) {
            return E[ti.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(j, b).then(function(W) {
                return V(W, j, b)
            })
        }
        const F = [];
        for (let j = 0, W = y.length; j < W; j++) {
            const re = y[j]
                , fe = Yo(re)
                , te = T[fe];
            if (te)
                F.push(te.promise);
            else {
                let Te;
                re.extensions && re.extensions[ti.KHR_DRACO_MESH_COMPRESSION] ? Te = L(re) : Te = V(new m.u9r, re, b),
                T[fe] = {
                    primitive: re,
                    promise: Te
                },
                F.push(Te)
            }
        }
        return Promise.all(F)
    }
    loadMesh(y) {
        const b = this
            , E = this.json
            , T = this.extensions
            , L = E.meshes[y]
            , F = L.primitives
            , j = [];
        for (let W = 0, re = F.length; W < re; W++) {
            const fe = F[W].material === void 0 ? Va(this.cache) : this.getDependency("material", F[W].material);
            j.push(fe)
        }
        return j.push(b.loadGeometries(F)),
        Promise.all(j).then(function(W) {
            const re = W.slice(0, W.length - 1)
                , fe = W[W.length - 1]
                , te = [];
            for (let Ge = 0, St = fe.length; Ge < St; Ge++) {
                const kt = fe[Ge]
                    , Vt = F[Ge];
                let gt;
                const xt = re[Ge];
                if (Vt.mode === Yr.TRIANGLES || Vt.mode === Yr.TRIANGLE_STRIP || Vt.mode === Yr.TRIANGLE_FAN || Vt.mode === void 0)
                    gt = L.isSkinnedMesh === !0 ? new m.TUv(kt,xt) : new m.Kj0(kt,xt),
                    gt.isSkinnedMesh === !0 && gt.normalizeSkinWeights(),
                    Vt.mode === Yr.TRIANGLE_STRIP ? gt.geometry = So(gt.geometry, m.UlW) : Vt.mode === Yr.TRIANGLE_FAN && (gt.geometry = So(gt.geometry, m.z$h));
                else if (Vt.mode === Yr.LINES)
                    gt = new m.ejS(kt,xt);
                else if (Vt.mode === Yr.LINE_STRIP)
                    gt = new m.x12(kt,xt);
                else if (Vt.mode === Yr.LINE_LOOP)
                    gt = new m.blk(kt,xt);
                else if (Vt.mode === Yr.POINTS)
                    gt = new m.woe(kt,xt);
                else
                    throw new Error("THREE.GLTFLoader: Primitive mode unsupported: " + Vt.mode);
                Object.keys(gt.geometry.morphAttributes).length > 0 && ya(gt, L),
                gt.name = b.createUniqueName(L.name || "mesh_" + y),
                ns(gt, L),
                Vt.extensions && eo(T, gt, Vt),
                b.assignFinalMaterial(gt),
                te.push(gt)
            }
            for (let Ge = 0, St = te.length; Ge < St; Ge++)
                b.associations.set(te[Ge], {
                    meshes: y,
                    primitives: Ge
                });
            if (te.length === 1)
                return te[0];
            const Te = new m.ZAu;
            b.associations.set(Te, {
                meshes: y
            });
            for (let Ge = 0, St = te.length; Ge < St; Ge++)
                Te.add(te[Ge]);
            return Te
        })
    }
    loadCamera(y) {
        let b;
        const E = this.json.cameras[y]
            , T = E[E.type];
        if (!T) {
            console.warn("THREE.GLTFLoader: Missing camera parameters.");
            return
        }
        return E.type === "perspective" ? b = new m.cPb(m.M8C.radToDeg(T.yfov),T.aspectRatio || 1,T.znear || 1,T.zfar || 2e6) : E.type === "orthographic" && (b = new m.iKG(-T.xmag,T.xmag,T.ymag,-T.ymag,T.znear,T.zfar)),
        E.name && (b.name = this.createUniqueName(E.name)),
        ns(b, E),
        Promise.resolve(b)
    }
    loadSkin(y) {
        const b = this.json.skins[y]
            , E = [];
        for (let T = 0, L = b.joints.length; T < L; T++)
            E.push(this._loadNodeShallow(b.joints[T]));
        return b.inverseBindMatrices !== void 0 ? E.push(this.getDependency("accessor", b.inverseBindMatrices)) : E.push(null),
        Promise.all(E).then(function(T) {
            const L = T.pop()
                , F = T
                , j = []
                , W = [];
            for (let re = 0, fe = F.length; re < fe; re++) {
                const te = F[re];
                if (te) {
                    j.push(te);
                    const Te = new m.yGw;
                    L !== null && Te.fromArray(L.array, re * 16),
                    W.push(Te)
                } else
                    console.warn('THREE.GLTFLoader: Joint "%s" could not be found.', b.joints[re])
            }
            return new m.OdW(j,W)
        })
    }
    loadAnimation(y) {
        const E = this.json.animations[y]
            , T = []
            , L = []
            , F = []
            , j = []
            , W = [];
        for (let re = 0, fe = E.channels.length; re < fe; re++) {
            const te = E.channels[re]
                , Te = E.samplers[te.sampler]
                , Ge = te.target
                , St = Ge.node
                , kt = E.parameters !== void 0 ? E.parameters[Te.input] : Te.input
                , Vt = E.parameters !== void 0 ? E.parameters[Te.output] : Te.output;
            T.push(this.getDependency("node", St)),
            L.push(this.getDependency("accessor", kt)),
            F.push(this.getDependency("accessor", Vt)),
            j.push(Te),
            W.push(Ge)
        }
        return Promise.all([Promise.all(T), Promise.all(L), Promise.all(F), Promise.all(j), Promise.all(W)]).then(function(re) {
            const fe = re[0]
                , te = re[1]
                , Te = re[2]
                , Ge = re[3]
                , St = re[4]
                , kt = [];
            for (let gt = 0, xt = fe.length; gt < xt; gt++) {
                const Xe = fe[gt]
                    , ut = te[gt]
                    , dn = Te[gt]
                    , qt = Ge[gt]
                    , ln = St[gt];
                if (Xe === void 0)
                    continue;
                Xe.updateMatrix();
                let Tn;
                switch (zs[ln.path]) {
                case zs.weights:
                    Tn = m.dUE;
                    break;
                case zs.rotation:
                    Tn = m.iLg;
                    break;
                case zs.position:
                case zs.scale:
                default:
                    Tn = m.yC1;
                    break
                }
                const fn = Xe.name ? Xe.name : Xe.uuid
                    , Hn = qt.interpolation !== void 0 ? _a[qt.interpolation] : m.NMF
                    , En = [];
                zs[ln.path] === zs.weights ? Xe.traverse(function(ar) {
                    ar.morphTargetInfluences && En.push(ar.name ? ar.name : ar.uuid)
                }) : En.push(fn);
                let Ei = dn.array;
                if (dn.normalized) {
                    const ar = ws(Ei.constructor)
                        , fr = new Float32Array(Ei.length);
                    for (let lr = 0, is = Ei.length; lr < is; lr++)
                        fr[lr] = Ei[lr] * ar;
                    Ei = fr
                }
                for (let ar = 0, fr = En.length; ar < fr; ar++) {
                    const lr = new Tn(En[ar] + "." + zs[ln.path],ut.array,Ei,Hn);
                    qt.interpolation === "CUBICSPLINE" && (lr.createInterpolant = function(Tr) {
                        const Er = this instanceof m.iLg ? Eo : Ha;
                        return new Er(this.times,this.values,this.getValueSize() / 3,Tr)
                    }
                    ,
                    lr.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline = !0),
                    kt.push(lr)
                }
            }
            const Vt = E.name ? E.name : "animation_" + y;
            return new m.m7l(Vt,void 0,kt)
        })
    }
    createNodeMesh(y) {
        const b = this.json
            , E = this
            , T = b.nodes[y];
        return T.mesh === void 0 ? null : E.getDependency("mesh", T.mesh).then(function(L) {
            const F = E._getNodeRef(E.meshCache, T.mesh, L);
            return T.weights !== void 0 && F.traverse(function(j) {
                if (j.isMesh)
                    for (let W = 0, re = T.weights.length; W < re; W++)
                        j.morphTargetInfluences[W] = T.weights[W]
            }),
            F
        })
    }
    loadNode(y) {
        const b = this.json
            , E = this
            , T = b.nodes[y]
            , L = E._loadNodeShallow(y)
            , F = []
            , j = T.children || [];
        for (let re = 0, fe = j.length; re < fe; re++)
            F.push(E.getDependency("node", j[re]));
        const W = T.skin === void 0 ? Promise.resolve(null) : E.getDependency("skin", T.skin);
        return Promise.all([L, Promise.all(F), W]).then(function(re) {
            const fe = re[0]
                , te = re[1]
                , Te = re[2];
            Te !== null && fe.traverse(function(Ge) {
                Ge.isSkinnedMesh && Ge.bind(Te, S)
            });
            for (let Ge = 0, St = te.length; Ge < St; Ge++)
                fe.add(te[Ge]);
            return fe
        })
    }
    _loadNodeShallow(y) {
        const b = this.json
            , E = this.extensions
            , T = this;
        if (this.nodeCache[y] !== void 0)
            return this.nodeCache[y];
        const L = b.nodes[y]
            , F = L.name ? T.createUniqueName(L.name) : ""
            , j = []
            , W = T._invokeOne(function(re) {
            return re.createNodeMesh && re.createNodeMesh(y)
        });
        return W && j.push(W),
        L.camera !== void 0 && j.push(T.getDependency("camera", L.camera).then(function(re) {
            return T._getNodeRef(T.cameraCache, L.camera, re)
        })),
        T._invokeAll(function(re) {
            return re.createNodeAttachment && re.createNodeAttachment(y)
        }).forEach(function(re) {
            j.push(re)
        }),
        this.nodeCache[y] = Promise.all(j).then(function(re) {
            let fe;
            if (L.isBone === !0 ? fe = new m.N$j : re.length > 1 ? fe = new m.ZAu : re.length === 1 ? fe = re[0] : fe = new m.Tme,
            fe !== re[0])
                for (let te = 0, Te = re.length; te < Te; te++)
                    fe.add(re[te]);
            if (L.name && (fe.userData.name = L.name,
            fe.name = F),
            ns(fe, L),
            L.extensions && eo(E, fe, L),
            L.matrix !== void 0) {
                const te = new m.yGw;
                te.fromArray(L.matrix),
                fe.applyMatrix4(te)
            } else
                L.translation !== void 0 && fe.position.fromArray(L.translation),
                L.rotation !== void 0 && fe.quaternion.fromArray(L.rotation),
                L.scale !== void 0 && fe.scale.fromArray(L.scale);
            return T.associations.has(fe) || T.associations.set(fe, {}),
            T.associations.get(fe).nodes = y,
            fe
        }),
        this.nodeCache[y]
    }
    loadScene(y) {
        const b = this.extensions
            , E = this.json.scenes[y]
            , T = this
            , L = new m.ZAu;
        E.name && (L.name = T.createUniqueName(E.name)),
        ns(L, E),
        E.extensions && eo(b, L, E);
        const F = E.nodes || []
            , j = [];
        for (let W = 0, re = F.length; W < re; W++)
            j.push(T.getDependency("node", F[W]));
        return Promise.all(j).then(function(W) {
            for (let fe = 0, te = W.length; fe < te; fe++)
                L.add(W[fe]);
            const re = fe => {
                const te = new Map;
                for (const [Te,Ge] of T.associations)
                    (Te instanceof m.F5T || Te instanceof m.xEZ) && te.set(Te, Ge);
                return fe.traverse(Te => {
                    const Ge = T.associations.get(Te);
                    Ge != null && te.set(Te, Ge)
                }
                ),
                te
            }
            ;
            return T.associations = re(L),
            L
        })
    }
}