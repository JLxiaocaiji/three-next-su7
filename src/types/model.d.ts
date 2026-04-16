// 模型文件信息类型
export interface ModelFileInfo {
  name: string; // 文件名
  path: string; // 前端可访问路径 /model/xxx
  isRawGlb: boolean; // 是否 .raw.glb
  isBin: boolean; // 是否 .bin
}

// 加载结果类型
export interface ModelLoadResult {
  fileInfo: ModelFileInfo;
  success: boolean;
  data?: GLTF;
  error?: string;
  retryCount: number;
}

// 加载完成回调
export type AllModelsLoadedCallback = (
  loadedResults: ModelLoadResult[],
  allSuccess: boolean
) => void;
