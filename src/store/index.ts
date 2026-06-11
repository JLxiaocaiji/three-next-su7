import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { eventBus } from '@/utils/eventBus';

type Module = 0 | 1 | 2 | 3 | 4 | 5;

interface State {
  user: { name: string };
  setUser: (user: string) => void;

  progress: number;
  setProgress: (progress: number) => void;

  // 模块切换
  currentModule: Module;
  setCurrentModule: (module: Module) => void;

  // 点击效果
  isClickEffect: boolean;

  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;
  // 是否长宽切换
  isStoreSwap: boolean;
  setStoreSwap: (isStoreSwap: boolean) => void;

  cleanup: () => void;
}

export const useStore = create<State>()(
  immer(
    persist(
      (set, get) => {
        return {
          user: { name: '' },

          progress: 0,
          setProgress: (progress: number) =>
            set((store) => {
              store.progress = progress;
            }),

          // 状态
          currentModule: 0,
          isClickEffect: false,

          isMobile: false,
          isStoreSwap: false,
          setIsMobile: (isMobile: boolean) =>
            set((store) => {
              store.isMobile = isMobile;
            }),
          setStoreSwap: (isStoreSwap: boolean) =>
            set((store) => {
              store.isStoreSwap = isStoreSwap;
            }),

          setUser: (name: string) =>
            set((draft) => {
              draft.user.name = name;
            }),

          // 切换模块
          setCurrentModule: (module: Module) =>
            set((draft) => {
              draft.currentModule = module;
              eventBus.emit('ChangeModule', { module });
            }),
          cleanup: () => {},
        };
      },
      // persist 配置
      {
        name: 'localstorage-user',
        // 持久化字段
        partialize: (draft) => ({
          user: draft.user,
          // currentModule 不持久化
        }),
      }
    )
  )
);

const loadProgress = ({ progress }: { progress: number }) => {
  useStore.setState({ progress: progress });
};
eventBus.off('LoadingProgress', loadProgress);
eventBus.on('LoadingProgress', loadProgress);

// 更改模块
const changeModule = ({ module: module }: { module: Module }) => {
  useStore.setState({ currentModule: module });
};
eventBus.off('ChangeModule', changeModule);
eventBus.on('ChangeModule', changeModule);

// useStore.setState({
//   cleanup: () => {
//     eventBus.off('ChangeModule', changeModule);
//     // eventBus.off('GetCurrentModule', getCurrentModule);
//   },
// });

export const cleanupAllStores = () => {
  useStore.getState().cleanup();
  import('./useScreenshotStore').then(({ useScreenshotStore }) => {
    useScreenshotStore.getState().cleanup();
  });
  import('./useColorStore').then(({ useColorStore }) => {
    useColorStore.getState().cleanup();
  });
};

export const useCurrentModule = () => useStore((state) => state.currentModule);
export const useUser = () => useStore((state) => state.user);
