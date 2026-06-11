import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { eventBus } from '@/utils/eventBus';

interface State {
  isPlayingBgm: boolean;
  setPlayBgm: () => void;

  isPlayChooseMusic: boolean;
  setPlayChooseMusic: () => void;
}

export const useAudioStore = create<State>()(
  persist(
    immer((set) => ({
      isPlayingBgm: false,

      setPlayBgm: () =>
        set((state) => {
          state.isPlayingBgm = !state.isPlayingBgm;
          eventBus.emit('SetPlayingBgm', { isPlayingBgm: state.isPlayingBgm });
        }),

      isPlayChooseMusic: false,
      setPlayChooseMusic: () =>
        set((state) => {
          eventBus.emit('SetPlayChooseMusic');
          //   state.isPlayChooseMusic = isPlayChooseMusic;
        }),
    })),
    {
      name: 'audio-store',
    }
  )
);
