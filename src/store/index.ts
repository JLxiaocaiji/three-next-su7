import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { eventBus } from '@/utils/eventBus';
import { SceneManager } from '@/lib/manager/sceneManager';

type Module = 0 | 1 | 2 | 3 | 4 | 5;

enum ColorParamType {
  custom = 1,
  preset = 2,
}

interface State {
  user: { name: string };
  setUser: (user: string) => void;

  // 模块切换
  currentModule: Module;
  setCurrentModule: (module: Module) => void;

  cleanup: () => void;
}

export const useStore = create<State>()(
  immer(
    persist(
      (set, get) => {
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

          cleanup: () => {},
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

const store = useStore.getState();

// 获取当前模块
const getCurrentModule = () => {
  const currentModule = store.currentModule;
  eventBus.emit('GetCurrentModule', { module: currentModule });
};
eventBus.off('GetCurrentModule', getCurrentModule);
eventBus.on('GetCurrentModule', getCurrentModule);

// 更改模块
const changeModule = ({ module: module }: { module: Module }) => {
  store.setCurrentModule(module);

  const sceneManager = SceneManager.getInstance();
  sceneManager.handleModuleChange(module);
};
eventBus.off('ChangeModule', changeModule);
eventBus.on('ChangeModule', changeModule);

useStore.setState({
  cleanup: () => {
    eventBus.off('ChangeModule', changeModule);
    eventBus.off('GetCurrentModule', getCurrentModule);
  },
});

export const cleanupAllStores = () => {
  store.cleanup();
  import('./useScreenshotStore').then(({ useScreenshotStore }) => {
    useScreenshotStore.getState().cleanup();
  });
};

export const useCurrentModule = () => useStore((state) => state.currentModule);
export const useUser = () => useStore((state) => state.user);
