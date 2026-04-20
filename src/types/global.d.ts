// global.d.ts
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
}

export {};
