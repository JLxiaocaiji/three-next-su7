// 模型文件信息类型
export interface ModelFileInfo {
  name: string; // 文件名
  path: string; // 前端可访问路径 /model/xxx
  extension: string; // 后缀
  isRawGlb: boolean; // 是否 .raw.glb
  isBin: boolean; // 是否 .bin
}

// 加载结果类型
export interface ModelLoadResult {
  fileInfo: ModelFileInfo;
  success: boolean;
  data?: any; // 你的模型数据
  error?: Error;
}

// 加载完成回调
export type AllModelsLoadedCallback = (
  loadedResults: ModelLoadResult[],
  allSuccess: boolean
) => void;
