import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { eventBus } from '@/utils/eventBus';

type Module = 0 | 1 | 2 | 3 | 4 | 5;

interface State {
  user: { name: string };
  setUser: (user: string) => void;

  // 模块切换
  currentModule: Module;
  setCurrentModule: (module: Module) => void;

  // 点击效果
  isClickEffect: boolean;
  setClickEffect: (isClickEffect: boolean) => void;

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
          isClickEffect: false,

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

          setClickEffect: (isClickEffect: boolean) =>
            set((draft) => {
              draft.isClickEffect = isClickEffect;
              eventBus.emit('SetClickEffect', { isClickEffect });
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

// 获取当前模块
// const getCurrentModule = () => {
//   const currentModule = useStore.getState().currentModule;
//   eventBus.emit('GetCurrentModule', { module: currentModule });
// };
// eventBus.off('GetCurrentModule', getCurrentModule);
// eventBus.on('GetCurrentModule', getCurrentModule);

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
};

export const useCurrentModule = () => useStore((state) => state.currentModule);
export const useUser = () => useStore((state) => state.user);
