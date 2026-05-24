import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { eventBus } from '@/utils/eventBus';
import { SceneManager } from '@/lib/manager/sceneManager';

type Module = 0 | 1 | 2 | 3 | 4;

interface State {
  user: { name: string };
  setUser: (user: string) => void;

  // 模块切换
  currentModule: Module;
  setCurrentModule: (module: Module) => void;

  // CarMotionManager

  cleanup: () => void;
}

export const useStore = create<State>()(
  immer(
    persist(
      (set, get) => {
        // 获得当前模块
        const getCurrentModule = () => {
          const currentModule = get().currentModule;
          eventBus.emit('Store:returnModule', { module: currentModule });
        };
        eventBus.off('CarMotionManager:getCurrentModule', getCurrentModule);
        eventBus.on('CarMotionManager:getCurrentModule', getCurrentModule);

        // 更改模块
        const changeModule = ({ module: module }: { module: Module }) => {
          set((state) => {
            state.currentModule = module;
            const sceneManager = SceneManager.getInstance();
            sceneManager.getCurrentModule(module);
          });
        };
        eventBus.off('UI-RightContent:changeModule', changeModule);
        eventBus.on('UI-RightContent:changeModule', changeModule);

        return {
          user: { name: '' },
          // 状态
          currentModule: 0,

          setUser: (name: string) =>
            set((state) => {
              state.user.name = name;
            }),

          // 切换模块
          setCurrentModule: (module: Module) =>
            set((state) => {
              state.currentModule = module;
            }),

          cleanup: () => {
            eventBus.off('UI-RightContent:changeModule', changeModule);
            eventBus.off('Store:returnModule', getCurrentModule);
          },
        };
      },
      // persist 配置
      {
        name: 'localstorage-user',
        // 持久化字段
        partialize: (state) => ({
          user: state.user,
          // currentModule 不持久化
        }),
      }
    )
  )
);

export const cleanupAllStores = () => {
  useStore.getState().cleanup();
  import('./useScreenshotStore').then(({ useScreenshotStore }) => {
    useScreenshotStore.getState().cleanup();
  });
};

export const useCurrentModule = () => useStore((state) => state.currentModule);
export const useUser = () => useStore((state) => state.user);
