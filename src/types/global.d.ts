// global.d.ts

import 'react';
interface NodeModule {
  hot?: {
    accept(dependencies?: string | string[], callback?: () => void): void;
    decline(dependencies?: string | string[]): void;
    dispose(callback: (data: any) => void): void;
    addDisposeHandler(callback: (data: any) => void): void;
    removeDisposeHandler(callback: (data: any) => void): void;
    status(): string;
    check(autoApply?: boolean): Promise<any>;
    apply(options?: any): Promise<any>;
  };
}

declare global {
  type ProgressCallback = (p: { loadedBytes: number; currentFile: string }) => void;

  type Module = 0 | 1 | 2 | 3 | 4;
}

declare module 'react' {
  interface CSSProperties {
    '--alpha-background-color'?: string;
    '--any-var'?: string;
    '--alpha-pointer-background-color'?: string;
    '--alpha-pointer-box-shadow'?: string;
  }
}

declare module 'three' {
  interface Object3D {
    /** 引擎扩展：局部 Uniforms（同一个材质不同实例的独立参数） */
    localUniforms: Record<string, any>;
  }
}

export {};
