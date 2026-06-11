'use client';

import { useColorStore, getColorList } from '@/store/useColorStore';
import { useAudioStore } from '@/store/useAudioStore';
export default function Bottom({ currentModule }: { currentModule: Module }) {
  const customColor = useColorStore((state) => state.colorList.get('custom'));
  const colorName = useColorStore((state) => state.colorName);
  const changeColor = useColorStore((state) => state.changeColor);
  const toggleColorChooseVisible = useColorStore((state) => state.toggleColorChooseVisible);

  const setPlayChooseMusic = useAudioStore((state) => state.setPlayChooseMusic);

  const colorList: Map<string, ColorThemeItem | CustomColor> = getColorList();

  return (
    <>
      {/* bottom */}
      <div style={{ opacity: 1, transition: '0.2s 0.3s' }}>
        <div className="ColorBar-container" style={{ opacity: 1, transform: 'none' }}>
          <div className="ColorBar-content">
            <div style={{ display: 'flex', opacity: 1, transform: 'none' }}>
              {Array.from(colorList.keys()).map((item, index) => (
                <div
                  key={item}
                  className="Bar"
                  style={{
                    ...(item === 'custom'
                      ? {
                          backgroundColor: `hsl(${customColor!.hsl!.h * 360}, ${customColor!.hsl!.s * 100}%, ${customColor!.hsl!.l * 100}%)`,
                        }
                      : {}),
                    backgroundImage: `url(/icon/${colorList.get(item)!.bgUrl})`,
                  }}
                  onClick={() => {
                    setPlayChooseMusic();
                    toggleColorChooseVisible(item === 'custom');
                    colorName !== item && changeColor(item);
                  }}
                >
                  {colorName == item && <div className="Bar-Line" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
